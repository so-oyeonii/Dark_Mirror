# Codex Agent Instructions — DARK MIRROR

You are the lead full-stack implementation agent for DARK MIRROR. Build a working, tested mobile-first Korean web app progressively. Follow the attached files as source of truth.

## Read before coding
1. `product/PRD.md`
2. `product/FEATURE_SPEC.md`
3. `architecture/ARCHITECTURE.md`
4. `architecture/SCHEMA.md`
5. `tests/ACCEPTANCE.md`
6. The applicable `codex/tasks/*.md` for the current phase.

## Stack
Next.js App Router, TypeScript strict mode, Tailwind CSS, accessible shadcn/ui-style components, Supabase Auth/PostgreSQL/Storage, Zod, Vitest, Playwright. Server-side LLM integration using schema-validated JSON. Use package versions available at implementation time and lock dependencies. No fake production integrations.

## Execution rules
- First inspect repository state. Existing user files and work have priority; never destructively overwrite them.
- Work in small, verifiable phases. After each phase: run lint/typecheck/tests/build (when available), fix issues, summarize actual files changed and blockers.
- Do not claim that a feature is implemented until it runs; provide an explicit mock/demo label when credentials are missing.
- Never hardcode secrets or use service-role keys in the browser. `.env.local` must be ignored by git, `.env.example` may have empty placeholders.
- Enforce ownership checks server-side and RLS in database before enabling client reads. Cross-user matching needs both parties' explicit consent and limited shared fields.
- Avoid claims of clinical diagnosis, abusive-person detection, or numerical abuse susceptibility. Saju and MBTI are narrative-only and separate from test scores.
- Don't run live LLM prompts that intentionally maximize coercion/insults. Keep scenarios bounded, optional, and skippable. Respond supportively to real danger; do not diagnose users or real third parties.
- Validate user inputs with Zod; validate LLM JSON response; use idempotency for turn submissions and rate limits.
- Allow guest onboarding/test with browser-local ephemeral state, then explicit account linking if desired.
- Design for Korean language, responsive 360px+ mobile, keyboard navigation, readable contrast, accessible labels.
- Keep reusable question items in `product/QUESTIONS.json` and scenarios in `product/SCENARIOS.json`; version changes.
- Ask for secrets/project IDs only at the integration step; otherwise continue using clearly labeled local demo mode.
