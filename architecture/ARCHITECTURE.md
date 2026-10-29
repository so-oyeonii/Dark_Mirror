# 기술 아키텍처 / API 설계

## 스택
Next.js App Router + TypeScript strict, Tailwind + accessible components, Supabase Auth/PostgreSQL/Storage, Zod, server-side LLM adapter, Vitest, Playwright, Vercel. 앱 코드 생성 시 최신 호환 버전 확인 및 lockfile 저장.

## 도메인 분리
- `profile`: MBTI/출생 입력 + 사주 명식 (절기·음력·윤달·시간대 검증 가능한 별도 엔진)
- `test`: 문항 버전, 응답 저장, 결정적 순수 함수 채점
- `simulation`: 상태 머신(active/completed/stopped), 턴별 멱등 처리, AI 출력 스키마 검증
- `match`: 초대·동의·취소·버전 기록, 화이트리스트 기반 공유 데이터만 집계
- `share`: 공개용 안전 데이터로만 카드 렌더링; private 원본을 공개 토큰으로 조회하지 않음
- `account`: 소유권, 결과 이전, 삭제

## API (제안)
GET/PATCH `/api/profile` ; POST `/api/saju/calculate` ; POST `/api/tests` ; PATCH `/api/tests/:id/answers` ; POST `/api/tests/:id/complete` ; POST `/api/simulations` ; POST `/api/simulations/:id/turns` ; POST `/api/simulations/:id/finish` ; POST `/api/matches/invitations` ; POST `/api/matches/:id/consent` ; POST `/api/matches/:id/revoke` ; GET `/api/matches/:id/report` ; POST `/api/cards` ; DELETE `/api/account`.

Every write: auth or guest session, Zod parse, ownership check, rate-limit, explicit allowed status transition. Never trust userId from payload. Cross-user reads must use participant authorization and double consent.

## AI flow
`client → authenticated server route → state/length/safety validation → prompt + bounded context → model → JSON schema validation → policy review → DB → client`. No raw private history embedded in share card. Store model/prompt version. Implement local simulated fixture with visible '데모' tag when API credentials absent.

## Session turn guarantees
Use unique `(session_id, role, turn_index)`; additionally maintain `idempotency_key` at request layer. Lock/transaction on session row or equivalent serializable process to prevent concurrent duplicate turns. Client retries must return same server result.

## Initial UX
5 tabs 홈·테스트·AI·궁합·마이. URLs defined in product PRD. Test accessible as guest; match requires authentication; private account records require authentication. Provide skeleton/loading/error/empty states.

## Deployment
Secrets only in server env. `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only if needed), `OPENAI_API_KEY` (server only), `NEXT_PUBLIC_APP_URL`. Never expose private key through NEXT_PUBLIC variables. Configure Supabase Auth redirect URLs.
