-- Preparatory migration. Applying this file is not authorization to enable live DB access.
-- 0001 is preserved; these constraints assume its scaffold has not been deployed with data.
-- auth.uid() and the anon/authenticated roles are supplied by Supabase in production.

alter table public.birth_profiles
 add column birth_year integer,
 add column birth_month integer,
 add column birth_day integer,
 add column converted_solar_date date,
 add constraint birth_date_solar_only check (
   birth_date is null or (calendar_type is not null and calendar_type = 'solar')
 ),
 add constraint lunar_original_components check (
   (birth_year is null and birth_month is null and birth_day is null)
   or (
     calendar_type is not null and calendar_type = 'lunar'
     and birth_year is not null and birth_year between 1 and 9999
     and birth_month is not null and birth_month between 1 and 12
     and birth_day is not null and birth_day between 1 and 30
   )
 ),
 add constraint leap_month_lunar_only check (
   is_leap_month is not true or (calendar_type is not null and calendar_type = 'lunar')
 ),
 add constraint converted_date_requires_lunar_original check (
   converted_solar_date is null or (
     calendar_type is not null and calendar_type = 'lunar'
     and birth_year is not null and birth_month is not null and birth_day is not null
   )
 );

comment on column public.birth_profiles.birth_date is
 'Original solar-calendar date only. Never store an unconverted lunar date here.';
comment on column public.birth_profiles.birth_year is
 'Original lunar year; month/day are stored separately. Range checks do not validate a lunar calendar date.';
comment on column public.birth_profiles.converted_solar_date is
 'Separate conversion output. The application must keep NULL until a validated calendar engine is integrated.';

alter table public.compatibility_pairs add column revoked_at timestamptz;
alter table public.compatibility_consents add column revoked_at timestamptz;
alter table public.compatibility_reports add column revoked_at timestamptz;
alter table public.share_cards
 add column pair_id uuid references public.compatibility_pairs(id) on delete cascade,
 add column revoked_at timestamptz;
create index share_cards_pair_id_idx on public.share_cards(pair_id);
create index test_attempts_user_id_idx on public.test_attempts(user_id);
create index simulation_sessions_user_id_idx on public.simulation_sessions(user_id);
create index share_cards_owner_id_idx on public.share_cards(owner_id);

comment on column public.share_cards.pair_id is
 'Required by the future server for any two-party card. Pair deletion cascades the DB row; Storage cleanup is separate.';
comment on column public.share_cards.revoked_at is
 'Future server token resolvers must deny revoked or expired cards. This column alone does not revoke a signed Storage URL.';

-- Table privileges and RLS are both required. Public/anonymous personal reads remain closed.
grant usage on schema public to authenticated;
revoke all on table public.profiles, public.birth_profiles, public.test_attempts,
 public.test_answers, public.test_scores, public.simulation_sessions,
 public.simulation_messages from public, anon, authenticated;
grant select, insert, update, delete on table public.profiles, public.test_answers to authenticated;
grant select, delete on table public.birth_profiles to authenticated;
grant insert (user_id, birth_date, birth_time, calendar_type, is_leap_month, timezone,
 birth_year, birth_month, birth_day),
 update (user_id, birth_date, birth_time, calendar_type, is_leap_month, timezone,
 birth_year, birth_month, birth_day) on public.birth_profiles to authenticated;
grant select, insert, delete on table public.test_attempts to authenticated;
grant select, delete on table public.test_scores, public.simulation_sessions,
 public.simulation_messages to authenticated;

create policy profiles_owner on public.profiles for all to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));

create policy birth_profiles_owner on public.birth_profiles for all to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));

-- Clients can edit original inputs, but never write trusted engine output columns.
-- Recompute in a separate server statement after saving the original inputs.
create function public.invalidate_birth_computation() returns trigger
 language plpgsql set search_path = '' as $$
begin
 if row(new.birth_date, new.birth_time, new.calendar_type, new.is_leap_month,
        new.timezone, new.birth_year, new.birth_month, new.birth_day)
    is distinct from
    row(old.birth_date, old.birth_time, old.calendar_type, old.is_leap_month,
        old.timezone, old.birth_year, old.birth_month, old.birth_day) then
   new.converted_solar_date := null;
   new.saju_json := null;
   new.engine_version := null;
 end if;
 return new;
end;
$$;
revoke all on function public.invalidate_birth_computation() from public, anon, authenticated;
create trigger birth_profiles_invalidate_computation before update
 on public.birth_profiles for each row execute function public.invalidate_birth_computation();

create policy test_attempts_owner_read on public.test_attempts for select to authenticated
 using (user_id = (select auth.uid()));
create policy test_attempts_owner_delete on public.test_attempts for delete to authenticated
 using (user_id = (select auth.uid()));
create policy test_attempts_owner_draft_insert on public.test_attempts for insert to authenticated
 with check (user_id = (select auth.uid()) and status = 'in_progress' and completed_at is null);

create policy test_answers_owner_read on public.test_answers for select to authenticated
 using (exists (
   select 1 from public.test_attempts a
   where a.id = test_answers.attempt_id and a.user_id = (select auth.uid())
 ));
create policy test_answers_owner_draft_insert on public.test_answers for insert to authenticated
 with check (exists (
   select 1 from public.test_attempts a
   where a.id = test_answers.attempt_id and a.user_id = (select auth.uid())
     and a.status = 'in_progress'
 ));
create policy test_answers_owner_draft_update on public.test_answers for update to authenticated
 using (exists (
   select 1 from public.test_attempts a
   where a.id = test_answers.attempt_id and a.user_id = (select auth.uid())
     and a.status = 'in_progress'
 ))
 with check (exists (
   select 1 from public.test_attempts a
   where a.id = test_answers.attempt_id and a.user_id = (select auth.uid())
     and a.status = 'in_progress'
 ));
create policy test_answers_owner_draft_delete on public.test_answers for delete to authenticated
 using (exists (
   select 1 from public.test_attempts a
   where a.id = test_answers.attempt_id and a.user_id = (select auth.uid())
     and a.status = 'in_progress'
 ));

-- Serialize draft mutations with the server's completion UPDATE on the parent row.
-- RLS alone can observe an older status during a concurrent completion transaction.
-- SECURITY DEFINER is limited to locking parent rows; it exposes no callable data API.
create function public.guard_test_answer_draft() returns trigger
 language plpgsql security definer set search_path = '' as $$
declare
 parent_ids uuid[];
 parent_status text;
begin
 if tg_op = 'INSERT' then parent_ids := array[new.attempt_id];
 elsif tg_op = 'DELETE' then parent_ids := array[old.attempt_id];
 else parent_ids := array[old.attempt_id, new.attempt_id];
 end if;
 for parent_status in
   select a.status from public.test_attempts a
   where a.id = any(parent_ids)
     and (auth.uid() is null or a.user_id = auth.uid())
   order by a.id for update
 loop
   if parent_status <> 'in_progress' then
     raise exception 'Completed assessment answers cannot be changed' using errcode = '23514';
   end if;
 end loop;
 -- During parent/account FK cascades the parent is already gone; child deletion is allowed.
 if tg_op = 'DELETE' then return old; end if;
 return new;
end;
$$;
revoke all on function public.guard_test_answer_draft() from public, anon, authenticated;
create trigger test_answers_draft_guard before insert or update or delete
 on public.test_answers for each row execute function public.guard_test_answer_draft();

-- Generated scores and state-machine records are created/updated by validated server code only.
create policy test_scores_owner_read on public.test_scores for select to authenticated
 using (exists (
   select 1 from public.test_attempts a
   where a.id = test_scores.attempt_id and a.user_id = (select auth.uid())
 ));
create policy test_scores_owner_delete on public.test_scores for delete to authenticated
 using (exists (
   select 1 from public.test_attempts a
   where a.id = test_scores.attempt_id and a.user_id = (select auth.uid())
 ));

create policy simulation_sessions_owner_read on public.simulation_sessions for select to authenticated
 using (user_id = (select auth.uid()));
create policy simulation_sessions_owner_delete on public.simulation_sessions for delete to authenticated
 using (user_id = (select auth.uid()));

create policy simulation_messages_owner_read on public.simulation_messages for select to authenticated
 using (exists (
   select 1 from public.simulation_sessions s
   where s.id = simulation_messages.session_id and s.user_id = (select auth.uid())
 ));
create policy simulation_messages_owner_delete on public.simulation_messages for delete to authenticated
 using (exists (
   select 1 from public.simulation_sessions s
   where s.id = simulation_messages.session_id and s.user_id = (select auth.uid())
 ));

-- No browser access to invitation/public-token hashes, consent rows or reports.
-- The server membership/dual-consent/token-lifecycle implementation is still a release gate.
revoke all on table public.compatibility_pairs, public.compatibility_consents,
 public.compatibility_reports, public.share_cards from public, anon, authenticated;

-- Restrictive policies retain deny even if a later table grant/permissive policy is added.
create policy compatibility_pairs_server_only on public.compatibility_pairs
 as restrictive for all to anon, authenticated using (false) with check (false);
create policy compatibility_consents_server_only on public.compatibility_consents
 as restrictive for all to anon, authenticated using (false) with check (false);
create policy compatibility_reports_server_only on public.compatibility_reports
 as restrictive for all to anon, authenticated using (false) with check (false);
create policy share_cards_server_only on public.share_cards
 as restrictive for all to anon, authenticated using (false) with check (false);

-- Existing FK cascades remove user-owned DB children when auth.users is deleted.
-- A server deletion job must separately revoke public exposure and clean Storage objects.
-- Privileged service roles can bypass RLS: server ownership/consent checks remain mandatory.
