-- Schema scaffold ONLY. RLS policies must be added and tested before production.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null check (char_length(nickname) between 2 and 20),
 mbti_type text check (mbti_type is null or mbti_type in ('ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP','ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ')),
 created_at timestamptz not null default now()
);
create table if not exists public.birth_profiles (
 user_id uuid primary key references public.profiles(user_id) on delete cascade,
 birth_date date, birth_time time,
 calendar_type text check (calendar_type in ('solar','lunar')),
 is_leap_month boolean, timezone text not null default 'Asia/Seoul',
 saju_json jsonb, engine_version text
);
create table if not exists public.test_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 test_version text not null,
 status text not null default 'in_progress' check (status in ('in_progress','completed')),
 started_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.test_answers (
 attempt_id uuid not null references public.test_attempts(id) on delete cascade,
 question_id text not null, answer_value integer not null check (answer_value between 1 and 5),
 primary key (attempt_id, question_id)
);
create table if not exists public.test_scores (
 attempt_id uuid not null references public.test_attempts(id) on delete cascade,
 dimension text not null, score numeric(5,2) not null check (score between 0 and 100),
 scoring_version text not null, primary key (attempt_id, dimension)
);
create table if not exists public.simulation_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 scenario_id text not null check (scenario_id in ('LOVE','FRIEND','WORK')),
 status text not null default 'active' check (status in ('active','completed','stopped')),
 turn_count integer not null default 0 check (turn_count between 0 and 5),
 created_at timestamptz not null default now()
);
create table if not exists public.simulation_messages (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.simulation_sessions(id) on delete cascade,
 role text not null check (role in ('assistant','user')),
 content text not null, turn_index integer not null,
 created_at timestamptz not null default now(),
 unique (session_id, role, turn_index)
);
create table if not exists public.compatibility_pairs (
 id uuid primary key default gen_random_uuid(),
 inviter_id uuid not null references public.profiles(user_id) on delete cascade,
 invitee_id uuid references public.profiles(user_id) on delete cascade,
 invite_token_hash text unique not null,
 status text not null default 'pending' check (status in ('pending','consented','completed','expired','revoked')),
 expires_at timestamptz not null, created_at timestamptz not null default now(),
 check (inviter_id is distinct from invitee_id)
);
create table if not exists public.compatibility_consents (
 pair_id uuid not null references public.compatibility_pairs(id) on delete cascade,
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 consent_version text not null, shared_fields jsonb not null default '[]',
 consented_at timestamptz not null default now(),
 primary key (pair_id, user_id)
);
create table if not exists public.compatibility_reports (
 pair_id uuid primary key references public.compatibility_pairs(id) on delete cascade,
 report_json jsonb not null, model_version text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.share_cards (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(user_id) on delete cascade,
 card_type text not null, public_token_hash text unique,
 storage_path text, expires_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.birth_profiles enable row level security;
alter table public.test_attempts enable row level security;
alter table public.test_answers enable row level security;
alter table public.test_scores enable row level security;
alter table public.simulation_sessions enable row level security;
alter table public.simulation_messages enable row level security;
alter table public.compatibility_pairs enable row level security;
alter table public.compatibility_consents enable row level security;
alter table public.compatibility_reports enable row level security;
alter table public.share_cards enable row level security;
-- Without explicit policies, client queries remain denied. Implement tested policies in Phase 1/4.
