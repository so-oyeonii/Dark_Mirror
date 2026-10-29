# 데이터 모델 및 보안

## 엔터티
- `profiles` (auth.users 1:1): nickname, mbti
- `birth_profiles` (profiles 1:1): birth_date, birth_time, calendar_type, is_leap_month, timezone, saju_json, engine_version
- `test_attempts` (profiles 1:N): test_version, status, dates
- `test_answers` (attempts 1:N): question_id, answer_value
- `test_scores` (attempts 1:N): dimension, score, scoring_version
- `simulation_sessions` (profiles 1:N): scenario, status, turns
- `simulation_messages` (sessions 1:N): role, content, turn_index
- `compatibility_pairs`: inviter, invitee, hashed invite token, status, expires_at
- `compatibility_consents`: pair, participant, consent_version, shared_fields
- `compatibility_reports`: pair, safe report JSON, model_version
- `share_cards`: owner, card_type, storage_path, hashed public token, expires_at

## RLS and service requirements
Enable RLS all tables. Owner can read own profile/tests/sessions/messages. Match reports require BOTH participants consent (enforced server-side; no direct public table SELECT). Never permit client access to invite token hashes. Private birth and message tables have owner-only access. Share public access should be through server-validated token and sanitized payload only, not direct unscoped DB query. Storage private by default; short-lived signed URLs if appropriate.

## Data life cycle
User can delete individual records/account. On match consent revoke, revoke existing report/card exposure and re-evaluate cached artifacts. Use DB FK cascades for user-owned children, plus explicit Storage object cleanup and token revocation. Establish a retention policy and legally reviewed privacy disclosures before real launch. Guest browser-local data should be expirable/resettable.

## Saju accuracy
Time zone, lunar leap month, solar term boundaries, historical conversion and unclear birth time must be handled by a qualified library. Never fabricate pillar data from raw birthday.
