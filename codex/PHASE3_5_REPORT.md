# Phase 3~5 로컬 구현 및 검증 기록

2026-10-29 (Asia/Seoul). 총괄·기획/DB·UX/프론트엔드·보안 리뷰의 4인 구성으로 작업했다. 사용자가 승인한 '키 없이 지금 가능한 계획'을 구현했으며 실서비스 단계 전체를 완료했다고 표시하지 않는다.

## 구현 결과

- Phase 3: 원본 시나리오 3개, 시작 전 안내/동의, 선택지 3개·자유 입력 500자, 최대 5턴, 중단·수동 안전 지원·제한적인 위험 표현 규칙, 비진단 고정 피드백, 24h 만료·복구·삭제. 자유 입력의 뜻을 AI로 분석하지 않는다.
- 개발 서버 API: development+loopback+동일 Origin만 허용, 8KiB 요청 제한, capability 해시 소유권, 입력/출력 스키마, 요청 제한, 동기 상태 전이, 요청 ID 멱등성. 프로덕션 503. UI는 이 API를 호출하지 않으며 서버 기능 시험용이다. capability 보관은 1시간/프로세스 수명이고 브라우저 도메인의 24h와 구분한다.
- Phase 4: 실제 개인정보를 쓰지 않는 가상 A/B 예시. 256bit 난수 초대·SHA-256 해시·72h 만료, 일회 수락, 참여자 검사, 허용 필드와 동의 교집합, 철회·삭제. 결과는 개별 차원 비교와 대화 질문이며 종합 궁합 %가 없다. 원본 답안·생년월일·대화는 포함하지 않는다.
- Phase 5: 검사 결과에서 동의 후 실제 PNG 1080×1080 / 1080×1920 다운로드. 엄격한 payload 허용 목록(version/type/5차원 scores), 닉네임도 제외. 삭제·만료·화면 이동 중 늦은 이미지 생성은 취소한다. 공개 URL은 생성하지 않고 이미 내려받은 파일을 회수할 수 없음을 안내한다.
- 마이 화면: 프로필·검사·대화·궁합 예시 전체 삭제와 확인/취소. 다른 앱의 저장소 키를 건드리지 않는다. 실제 저장소 삭제 여부를 확인하지 못하면 성공으로 단정하지 않는다. 다른 탭과 다운로드 파일은 별도 삭제 대상이다.
- DB 준비: 원본 0001을 보존하고 0002에 개인 데이터 RLS·최소권한, 서버 생성 점수·대화·사주 필드 직접 쓰기 차단, 완료 답안 보호·부모 행 잠금, 음력 원본/변환 결과 분리, 원본 수정 시 계산 무효화, 궁합 카드 FK/철회 필드를 추가했다. 궁합/동의/보고서/공유 테이블은 클라이언트에 닫혀 있다.

## 실제 변경 파일

신규 대화:

- `src/lib/simulation.ts`, `simulation-store.ts`
- `src/components/simulation-provider.tsx`, `simulation-experience.tsx`, `simulation-result.tsx`, `simulation-history.tsx`
- `src/app/simulation/[id]/page.tsx`, `src/app/simulation/[id]/result/page.tsx`
- `src/server/demo-simulation.ts`, `src/app/api/demo/simulation/route.ts`

신규 궁합/공유/삭제:

- `src/lib/match.ts`, `share-card.ts`
- `src/components/match-provider.tsx`, `match-experience.tsx`, `share-card.tsx`, `clear-local-data.tsx`
- `src/app/match/[id]/page.tsx`

신규 검증/DB/문서:

- `supabase/migrations/0002_ownership_and_lifecycle.sql`
- `tests/unit/simulation.test.ts`, `simulation-store.test.ts`, `demo-simulation.test.ts`, `demo-route.test.ts`, `match.test.ts`, `share-card.test.ts`, `database-policies.test.ts`
- `tests/e2e/simulation.spec.ts`, `match.spec.ts`, `share-card.spec.ts`, `privacy.spec.ts`
- `codex/INTEGRATION_CHECKLIST.md`, `ROADMAP.md`, 이 보고서

수정:

- `src/app/layout.tsx`, `page.tsx`, `globals.css`, `simulation/page.tsx`, `match/page.tsx`
- `src/components/my-profile.tsx`, `test-result.tsx`
- `package.json`, `package-lock.json`: 테스트 전용 `@electric-sql/pglite` 0.5.13 고정 추가
- `README.md`, `.env.example`(현재 범위 안내 주석)

원본 기획·문항·시나리오·AI 프롬프트·0001 SQL은 수정하지 않았다. AGENTS.md는 2459 bytes를 유지한다. 현재 폴더는 Git 저장소가 아니므로 커밋/PR은 생성하지 않았다.

## 실행한 최종 검증

| 명령 | 결과 |
| --- | --- |
| `npm.cmd run lint` | 통과 |
| `npm.cmd run typecheck` | 통과 |
| `npm.cmd test` | 12개 파일, 127개 통과 |
| `npm.cmd run build` | Next.js 16.4.3 Webpack 프로덕션 빌드 통과 |
| `npm.cmd run test:e2e` | Chromium 360×800/1280×900, 총 50개 통과 |
| `npm.cmd audit --json` | 알려진 취약점 0건 |

단위 테스트 127개에는 기존 55개, 대화 16개, 개발 API 서비스 4개·HTTP 경계 2개, 궁합 5개, 공유 payload 4개, DB 41개가 포함된다. PGlite에서 실제 PostgreSQL SQL/RLS를 실행했으며 auth 사용자/요청 ID는 테스트 fixture다. 실제 Supabase JWT·PostgREST·Storage나 다중 연결 동시성까지 검증한 것은 아니다. 테스트에서는 pgcrypto 확장 선언 1줄만 생략했다.

브라우저 50개에는 기존 흐름, 대화 동의/5턴/안전/중단/만료/삭제, 양측 동의·철회·72h 만료, 실제 PNG signature/IHDR 크기, 늦은 다운로드 취소, 전체 삭제/실패/다른 저장소 키 보존, 준비되지 않은 서버 API의 production 거부가 포함된다. 검사·대화·궁합 흐름에서 불필요한 원격 쓰기 요청이 발생하지 않는 것도 확인했다.

자동 접근성 검사(axe WCAG 2A/2AA/2.1AA)와 360px 넘침 검사를 실행했다. 생성한 두 PNG와 대화/궁합 화면을 이미지로 확인했다. 실제 휴대폰 Safari, 스크린리더 수동 QA는 후속 출시 단계에 남아 있다.

## 발견 후 수정한 사항

1. 서버 생성 점수·대화 상태·사주 생성값의 client 쓰기 권한 제거. 완료 답안 수정과 서버 완료 경쟁에 대비해 부모 행 잠금 추가.
2. PNG 생성 중 원본 삭제/만료/화면 이동 후 늦은 다운로드를 mount/generation 검증으로 취소하고 회귀 테스트 추가.
3. JSX 렌더의 현재 시각 참조를 상태/타이머 기반으로 변경하고, 동의 화면 재진입 시 저장한 가상 선택을 표시.
4. 타입 좁히기와 테스트 lint 오류 수정. 최초 브라우저 런의 모바일 1개 실패는 결과 URL 이동을 기다리지 않고 경로를 읽던 테스트 경쟁 조건으로 확인해 수정했다. 최종 50개 전부 통과.

독립 보안 리뷰는 수정한 범위에서 남은 차단 결함을 발견하지 못했다. 이것은 운영 보안 인증이나 모든 취약점의 부재를 보장하지 않는다.

## 실행/직접 확인

```powershell
npm ci
npm run dev
```

`http://127.0.0.1:3000`에서 검사→결과→PNG 저장, AI 체험 탭→동의→대화→중단/5턴, 궁합→가상 A/B 동의→철회, 마이→모든 로컬 기록 삭제를 확인할 수 있다. API 키는 필요하지 않다. 검증 서버는 테스트가 종료하며, 개발 서버는 사용자가 위 명령으로 시작한다.

## 남은 실서비스 작업

로그인/세션/게스트 계정 이전, 계정별 DB 저장, 실제 LLM 호출과 비용/분산 제한, 실제 두 계정의 원자적 초대와 동의, 검증된 사주 엔진, 공개 카드 링크/Storage, 원격 계정 탈퇴·파일 정리, 운영 정책·도메인·배포가 남았다. 키만 입력한다고 활성화되지 않으며 추가 구현과 실제 환경 검증이 필요하다.

현재는 PC·모바일 브라우저 웹앱이다. PWA 설치·오프라인·스토어 앱 패키지는 포함하지 않았다. 다음 순서는 `ROADMAP.md`, 세부 완료 게이트는 `INTEGRATION_CHECKLIST.md`에 기록했다. 현 단계에는 사용자의 키 제공·유료 가입·배포 승인이 필요하지 않았다.
