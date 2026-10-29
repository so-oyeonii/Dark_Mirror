import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";
const TA = "10000000-0000-0000-0000-00000000000a";
const TB = "10000000-0000-0000-0000-00000000000b";
const TC = "10000000-0000-0000-0000-00000000000c";
const SA = "20000000-0000-0000-0000-00000000000a";
const SB = "20000000-0000-0000-0000-00000000000b";
const PAIR = "30000000-0000-0000-0000-00000000000a";

const ownerTables = [
  {
    table: "profiles",
    ownerColumn: "user_id",
    ownerA: A,
    ownerB: B,
    spoofInsert: `insert into public.profiles (user_id, nickname) values ('${C}', '위장사용자')`,
    spoofUpdate: `update public.profiles set user_id = '${C}' where user_id = '${A}'`,
  },
  {
    table: "birth_profiles",
    ownerColumn: "user_id",
    ownerA: A,
    ownerB: B,
    spoofInsert: `insert into public.birth_profiles (user_id) values ('${C}')`,
    spoofUpdate: `update public.birth_profiles set user_id = '${B}' where user_id = '${A}'`,
  },
  {
    table: "test_attempts",
    ownerColumn: "user_id",
    ownerA: A,
    ownerB: B,
    spoofInsert: `insert into public.test_attempts (user_id, test_version) values ('${B}', 'draft-1.0')`,
    spoofUpdate: `update public.test_attempts set user_id = '${B}' where id = '${TA}'`,
  },
  {
    table: "test_answers",
    ownerColumn: "attempt_id",
    ownerA: TA,
    ownerB: TB,
    spoofInsert: `insert into public.test_answers values ('${TB}', 'Q02', 3)`,
    spoofUpdate: `update public.test_answers set attempt_id = '${TB}' where attempt_id = '${TA}'`,
  },
  {
    table: "test_scores",
    ownerColumn: "attempt_id",
    ownerA: TA,
    ownerB: TB,
    spoofInsert: `insert into public.test_scores values ('${TB}', 'approval', 50, '1.0')`,
    spoofUpdate: `update public.test_scores set attempt_id = '${TB}' where attempt_id = '${TA}'`,
  },
  {
    table: "simulation_sessions",
    ownerColumn: "user_id",
    ownerA: A,
    ownerB: B,
    spoofInsert: `insert into public.simulation_sessions (user_id, scenario_id) values ('${B}', 'LOVE')`,
    spoofUpdate: `update public.simulation_sessions set user_id = '${B}' where id = '${SA}'`,
  },
  {
    table: "simulation_messages",
    ownerColumn: "session_id",
    ownerA: SA,
    ownerB: SB,
    spoofInsert: `insert into public.simulation_messages (session_id, role, content, turn_index) values ('${SB}', 'user', '다른 사용자 세션', 2)`,
    spoofUpdate: `update public.simulation_messages set session_id = '${SB}' where session_id = '${SA}'`,
  },
] as const;

const serverTables = [
  "compatibility_pairs",
  "compatibility_consents",
  "compatibility_reports",
  "share_cards",
] as const;

let db: PGlite;

// This is a local policy fixture, not a Supabase Auth/JWT implementation.
async function asRole<T>(role: "anon" | "authenticated", userId: string | null, run: () => Promise<T>) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  try {
    return await run();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    -- Simulate permissive platform defaults: 0002 must remove non-CRUD privileges too.
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  const initial = await readFile(new URL("../../supabase/migrations/0001_initial.sql", import.meta.url), "utf8");
  const ownership = await readFile(new URL("../../supabase/migrations/0002_ownership_and_lifecycle.sql", import.meta.url), "utf8");
  // PGlite ships core gen_random_uuid(), but not the optional pgcrypto extension.
  // All table definitions, constraints and RLS statements run unchanged.
  await db.exec(initial.replace(/^create extension if not exists pgcrypto;\r?$/m, ""));
  await db.exec(ownership);
}, 30_000);

beforeEach(async () => {
  await db.exec(`
    reset role;
    truncate auth.users cascade;
    insert into auth.users values ('${A}'), ('${B}'), ('${C}');
    insert into public.profiles (user_id, nickname) values ('${A}', '사용자에이'), ('${B}', '사용자비');
    insert into public.birth_profiles (user_id, calendar_type, birth_date)
      values ('${A}', 'solar', '2000-01-01'), ('${B}', 'solar', '2001-02-03');
    insert into public.test_attempts (id, user_id, test_version)
      values ('${TA}', '${A}', 'draft-1.0'), ('${TB}', '${B}', 'draft-1.0');
    insert into public.test_answers values ('${TA}', 'Q01', 3), ('${TB}', 'Q01', 4);
    insert into public.test_scores values ('${TA}', 'boundary', 50, '1.0'), ('${TB}', 'boundary', 75, '1.0');
    insert into public.simulation_sessions (id, user_id, scenario_id)
      values ('${SA}', '${A}', 'LOVE'), ('${SB}', '${B}', 'WORK');
    insert into public.simulation_messages (session_id, role, content, turn_index)
      values ('${SA}', 'user', 'A의 비공개 응답', 1), ('${SB}', 'user', 'B의 비공개 응답', 1);
    insert into public.compatibility_pairs (id, inviter_id, invitee_id, invite_token_hash, expires_at)
      values ('${PAIR}', '${A}', '${B}', 'fixture-invite-hash', now() + interval '72 hours');
    insert into public.compatibility_consents (pair_id, user_id, consent_version)
      values ('${PAIR}', '${A}', '1'), ('${PAIR}', '${B}', '1');
    insert into public.compatibility_reports (pair_id, report_json, model_version)
      values ('${PAIR}', '{}', 'fixture');
    insert into public.share_cards (owner_id, card_type, pair_id, public_token_hash)
      values ('${B}', 'compatibility', '${PAIR}', 'fixture-public-hash'), ('${B}', 'profile', null, null);
  `);
});

afterAll(async () => {
  await db?.close();
});

describe("local PostgreSQL ownership policies (not live Supabase verification)", () => {
  it("removes platform-default TRUNCATE privileges that would bypass row policies", async () => {
    for (const { table } of ownerTables) {
      const privilege = await db.query<{ allowed: boolean }>(
        "select has_table_privilege('authenticated', $1, 'TRUNCATE') as allowed", [`public.${table}`],
      );
      expect(privilege.rows).toEqual([{ allowed: false }]);
    }
    await asRole("authenticated", A, async () => {
      await expect(db.query("truncate public.test_answers")).rejects.toMatchObject({ code: "42501" });
    });
  });

  it.each(ownerTables)("$table isolates A and B, blocks anonymous access and unclaimed sessions", async ({ table, ownerColumn, ownerA, ownerB }) => {
    for (const [userId, expected] of [[A, ownerA], [B, ownerB]]) {
      const rows = await asRole("authenticated", userId!, async () => {
        const identity = await db.query<{ current_user: string }>("select current_user");
        expect(identity.rows[0]?.current_user).toBe("authenticated");
        return (await db.query<Record<string, string>>(`select * from public.${table}`)).rows;
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.[ownerColumn]).toBe(expected);
    }
    await asRole("anon", null, async () => {
      await expect(db.query(`select * from public.${table}`)).rejects.toMatchObject({ code: "42501" });
    });
    await asRole("authenticated", null, async () => {
      expect((await db.query(`select * from public.${table}`)).rows).toEqual([]);
    });
  });

  it.each(ownerTables)("$table blocks forged inserts, owner reassignment and cross-user changes", async ({ table, ownerColumn, ownerA, ownerB, spoofInsert, spoofUpdate }) => {
    await asRole("authenticated", A, async () => {
      await expect(db.query(spoofInsert)).rejects.toMatchObject({ code: "42501" });
      await expect(db.query(spoofUpdate)).rejects.toMatchObject({ code: "42501" });
      const update = db.query(`update public.${table} set ${ownerColumn} = $1 where ${ownerColumn} = $2 returning *`, [ownerA, ownerB]);
      if (["profiles", "birth_profiles", "test_answers"].includes(table)) {
        expect((await update).rows).toHaveLength(0);
      } else {
        await expect(update).rejects.toMatchObject({ code: "42501" });
      }
      const deleted = await db.query(`delete from public.${table} where ${ownerColumn} = $1 returning *`, [ownerB]);
      expect(deleted.rows).toHaveLength(0);
    });
    expect((await db.query(`select * from public.${table} where ${ownerColumn} = $1`, [ownerB])).rows).toHaveLength(1);
  });

  it("allows an authenticated owner to manage their profile and draft answers but not mark completion", async () => {
    await asRole("authenticated", C, async () => {
      await db.exec(`
        insert into public.profiles (user_id, nickname) values ('${C}', '새사용자');
        insert into public.birth_profiles (user_id, calendar_type, birth_year, birth_month, birth_day, is_leap_month)
          values ('${C}', 'lunar', 2000, 4, 15, false);
        insert into public.test_attempts (id, user_id, test_version) values ('${TC}', '${C}', 'draft-1.0');
        insert into public.test_answers values ('${TC}', 'Q01', 3);
      `);
      const updates = [
        "update public.profiles set nickname = '변경한이름' returning *",
        "update public.birth_profiles set birth_day = 16 returning *",
        "update public.test_answers set answer_value = 4 returning *",
      ];
      for (const statement of updates) expect((await db.query(statement)).rows).toHaveLength(1);
      await expect(db.query("update public.test_attempts set status = 'completed', completed_at = now() where id = $1", [TC])).rejects.toMatchObject({ code: "42501" });
      await expect(db.query("insert into public.test_attempts (user_id, test_version, status) values ($1, 'draft-1.0', 'completed')", [C])).rejects.toMatchObject({ code: "42501" });
      await expect(db.query("insert into public.test_attempts (user_id, test_version, completed_at) values ($1, 'draft-1.0', now())", [C])).rejects.toMatchObject({ code: "42501" });
      for (const table of ["test_answers", "test_attempts", "birth_profiles", "profiles"]) {
        expect((await db.query(`delete from public.${table} returning *`)).rows).toHaveLength(1);
      }
    });
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(2);
  });

  it.each([
    { table: "test_scores", insert: `insert into public.test_scores values ('${TA}', 'approval', 100, 'fake')`, update: "update public.test_scores set score = 100" },
    { table: "simulation_sessions", insert: `insert into public.simulation_sessions (user_id, scenario_id) values ('${A}', 'LOVE')`, update: "update public.simulation_sessions set turn_count = 5, status = 'completed'" },
    { table: "simulation_messages", insert: `insert into public.simulation_messages (session_id, role, content, turn_index) values ('${SA}', 'assistant', '위조 응답', 2)`, update: "update public.simulation_messages set content = '위조 응답'" },
  ])("$table permits owner read/delete but blocks owner-generated inserts and updates", async ({ table, insert, update }) => {
    await asRole("authenticated", A, async () => {
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(1);
      await expect(db.query(insert)).rejects.toMatchObject({ code: "42501" });
      await expect(db.query(update)).rejects.toMatchObject({ code: "42501" });
      expect((await db.query(`delete from public.${table} returning *`)).rows).toHaveLength(1);
    });
    expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(1);
  });

  it("freezes answers after server completion while allowing owner read and whole-attempt deletion", async () => {
    await db.query("update public.test_attempts set status = 'completed', completed_at = now() where id = $1", [TA]);
    await asRole("authenticated", A, async () => {
      expect((await db.query("select * from public.test_answers")).rows).toHaveLength(1);
      await expect(db.query("insert into public.test_answers values ($1, 'Q02', 5)", [TA])).rejects.toMatchObject({ code: "23514" });
      expect((await db.query("update public.test_answers set answer_value = 5 where attempt_id = $1 returning *", [TA])).rows).toEqual([]);
      expect((await db.query("delete from public.test_answers where attempt_id = $1 returning *", [TA])).rows).toEqual([]);
      await expect(db.query("update public.test_attempts set status = 'in_progress', completed_at = null where id = $1", [TA])).rejects.toMatchObject({ code: "42501" });
      expect((await db.query("delete from public.test_attempts where id = $1 returning *", [TA])).rows).toHaveLength(1);
    });
    expect((await db.query("select * from public.test_answers where attempt_id = $1", [TA])).rows).toEqual([]);
    expect((await db.query("select * from public.test_scores where attempt_id = $1", [TA])).rows).toEqual([]);
  });

  it("guards completed answer rows even for privileged writes and does not expose the guard as an RPC", async () => {
    await db.query("update public.test_attempts set status = 'completed', completed_at = now() where id = $1", [TA]);
    await expect(db.query("update public.test_answers set answer_value = 5 where attempt_id = $1", [TA])).rejects.toMatchObject({ code: "23514" });
    await expect(db.query("delete from public.test_answers where attempt_id = $1", [TA])).rejects.toMatchObject({ code: "23514" });
    const privilege = await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated', 'public.guard_test_answer_draft()', 'EXECUTE') as allowed");
    expect(privilege.rows).toEqual([{ allowed: false }]);
  });

  it.each(serverTables)("keeps $table unreadable and unwritable even for participants", async (table) => {
    for (const [role, userId] of [["authenticated", A], ["authenticated", B], ["anon", null]] as const) {
      await asRole(role, userId, async () => {
        await expect(db.query(`select * from public.${table}`)).rejects.toMatchObject({ code: "42501" });
        await expect(db.query(`delete from public.${table}`)).rejects.toMatchObject({ code: "42501" });
      });
    }
  });

  it("does not expose invitation or public-token hashes to authenticated clients", async () => {
    await asRole("authenticated", A, async () => {
      await expect(db.query("select invite_token_hash from public.compatibility_pairs")).rejects.toMatchObject({ code: "42501" });
      await expect(db.query("select public_token_hash from public.share_cards")).rejects.toMatchObject({ code: "42501" });
    });
  });

  it("keeps restrictive server-only RLS closed after an accidental permissive grant", async () => {
    await db.exec("grant select, insert on public.compatibility_pairs to authenticated; create policy accidental_allow on public.compatibility_pairs for all to authenticated using (true) with check (true)");
    try {
      await asRole("authenticated", A, async () => {
        expect((await db.query("select * from public.compatibility_pairs")).rows).toEqual([]);
        await expect(db.query("insert into public.compatibility_pairs (inviter_id, invite_token_hash, expires_at) values ($1, 'new-hash', now())", [A])).rejects.toMatchObject({ code: "42501" });
      });
    } finally {
      await db.exec("drop policy accidental_allow on public.compatibility_pairs; revoke select, insert on public.compatibility_pairs from authenticated");
    }
  });

  it("separates lunar originals from solar dates and rejects incomplete or contradictory calendar fields", async () => {
    await asRole("authenticated", A, async () => {
      const invalid = [
        "calendar_type = 'lunar'",
        "calendar_type = null",
        "is_leap_month = true",
        "birth_year = 2000",
        "calendar_type = 'lunar', birth_date = null, birth_year = 2000, birth_month = 4, birth_day = 31",
        "calendar_type = 'lunar', birth_date = null, birth_year = 2000, birth_month = null, birth_day = 15",
      ];
      for (const values of invalid) {
        await expect(db.query(`update public.birth_profiles set ${values} where user_id = $1`, [A])).rejects.toMatchObject({ code: "23514" });
      }
      const result = await db.query<{ birth_date: null; birth_year: number; converted_solar_date: null }>(`
        update public.birth_profiles set calendar_type = 'lunar', birth_date = null,
        birth_year = 2000, birth_month = 4, birth_day = 15, is_leap_month = true
        where user_id = $1 returning birth_date, birth_year, converted_solar_date
      `, [A]);
      expect(result.rows).toEqual([{ birth_date: null, birth_year: 2000, converted_solar_date: null }]);
    });
  });

  it.each([
    { column: "saju_json", value: "'{}'::jsonb" },
    { column: "engine_version", value: "'forged-engine'" },
    { column: "converted_solar_date", value: "'2000-05-01'::date" },
  ])("blocks authenticated INSERT/UPDATE of server-generated birth field $column", async ({ column, value }) => {
    await asRole("authenticated", A, async () => {
      await expect(db.query(`update public.birth_profiles set ${column} = ${value} where user_id = $1`, [A])).rejects.toMatchObject({ code: "42501" });
      await db.query("delete from public.birth_profiles where user_id = $1", [A]);
      await expect(db.query(`insert into public.birth_profiles (user_id, ${column}) values ($1, ${value})`, [A])).rejects.toMatchObject({ code: "42501" });
      await db.query("insert into public.birth_profiles (user_id, calendar_type, birth_date) values ($1, 'solar', '2000-01-01')", [A]);
      expect((await db.query("select * from public.birth_profiles")).rows).toHaveLength(1);
    });
  });

  it.each([
    "birth_year = 2001",
    "birth_month = 5",
    "birth_day = 16",
    "birth_time = '13:00'",
    "is_leap_month = true",
    "timezone = 'Asia/Tokyo'",
    "calendar_type = 'solar', birth_date = '2000-05-18', birth_year = null, birth_month = null, birth_day = null",
  ])("clears all derived birth fields when source inputs change: %s", async (mutation) => {
    await db.query(`update public.birth_profiles set calendar_type = 'lunar', birth_date = null,
      birth_year = 2000, birth_month = 4, birth_day = 15, birth_time = '12:00', is_leap_month = false
      where user_id = $1`, [A]);
    // Only the privileged fixture writes computed data, after originals are saved.
    await db.query(`update public.birth_profiles set converted_solar_date = '2000-05-18',
      saju_json = '{"fixture": true}', engine_version = 'fixture-engine' where user_id = $1`, [A]);
    await asRole("authenticated", A, async () => {
      const generated = await db.query<{ engine_version: string }>("select engine_version from public.birth_profiles where user_id = $1", [A]);
      expect(generated.rows[0]?.engine_version).toBe("fixture-engine");
      const updated = await db.query(`update public.birth_profiles set ${mutation} where user_id = $1
        returning converted_solar_date, saju_json, engine_version`, [A]);
      expect(updated.rows).toEqual([{ converted_solar_date: null, saju_json: null, engine_version: null }]);
    });
  });

  it("invalidates generated fields when the original solar birth_date changes", async () => {
    await db.query("update public.birth_profiles set saju_json = '{}', engine_version = 'fixture-engine' where user_id = $1", [A]);
    await asRole("authenticated", A, async () => {
      const updated = await db.query(`update public.birth_profiles set birth_date = '2000-01-02' where user_id = $1
        returning converted_solar_date, saju_json, engine_version`, [A]);
      expect(updated.rows).toEqual([{ converted_solar_date: null, saju_json: null, engine_version: null }]);
    });
  });

  it("cascades pair deletion to both-party report, consents and linked cards but preserves unrelated cards", async () => {
    await db.query("delete from public.compatibility_pairs where id = $1", [PAIR]);
    for (const table of ["compatibility_consents", "compatibility_reports"]) {
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    }
    const cards = await db.query<{ card_type: string }>("select card_type from public.share_cards");
    expect(cards.rows).toEqual([{ card_type: "profile" }]);
  });

  it("cascades auth user deletion through owned children and the pair while preserving the other user's private records", async () => {
    await db.query("delete from auth.users where id = $1", [A]);
    for (const { table, ownerColumn, ownerB } of ownerTables) {
      const result = await db.query<Record<string, string>>(`select * from public.${table}`);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.[ownerColumn]).toBe(ownerB);
    }
    for (const table of ["compatibility_pairs", "compatibility_consents", "compatibility_reports"]) {
      expect((await db.query(`select * from public.${table}`)).rows).toEqual([]);
    }
    expect((await db.query<{ card_type: string }>("select card_type from public.share_cards")).rows).toEqual([{ card_type: "profile" }]);
  });
});
