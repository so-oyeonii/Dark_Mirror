# GitHub 저장소 자료 안내

2026-10-29. 사용자 요청으로 로컬 DARK MIRROR 프로젝트를 `https://github.com/so-oyeonii/Dark_Mirror`의 main 브랜치에 게시한다. 원격에 먼저 있던 LICENSE와 최초 커밋 이력은 보존한다. 공개 저장소에 코드를 올리는 작업이며 웹 서비스 공개 배포는 아니다.

## 포함 자료

- `src/`: 구현한 웹앱 전체 코드, 로컬 상태 관리, 사주 계산·카드, 개발용 API, Supabase 연결 팩토리.
- `product/`: 원본 PRD·기능 명세·문항·시나리오.
- `architecture/`: 원본 아키텍처 및 DB 설계.
- `ai/prompts/`: 원본 AI 프롬프트 전체.
- `supabase/migrations/`: 초기 SQL과 소유권·생명주기 보완 SQL.
- `tests/`: 원본 수용 기준 및 단위·DB·브라우저 테스트 소스.
- `src/lib/saju-engine/`: 출처가 기록된 독립 달력·절기 fixture와 수집 도구, 제3자 고지.
- `codex/`: 원본 단계별 작업 지시, 팀 역할, 결정 사항, 디자인, 현재 로드맵, 연동 준비 계획, 별도 세션 작업 계약, 검수·검증 기록.
- `.codex/agents/` 및 `codex/agent-profiles/`: 이 프로젝트 전용 팀 역할 설정과 템플릿. 전역 개인 Codex 설정이나 인증 파일은 포함하지 않는다.
- `public/`: 배포 시 제공하는 제3자 라이선스 고지.
- `AGENTS.md`, `README.md`, `.env.example`, package/lockfile 및 Next.js·TypeScript·Tailwind·ESLint·Vitest·Playwright 설정.
- `LICENSE`: GitHub 저장소에 기존부터 있던 라이선스. 외부 라이브러리·검증 자료는 해당 제3자 고지를 별도로 따른다.

## 제외 자료

- 비밀키와 실제 `.env*` 값. `.env.example`의 빈 자리와 공개 로컬 URL 예시만 포함한다.
- `node_modules`, `.next`, TypeScript 캐시, 로그: 설치/실행/빌드로 재생성한다.
- `test-results`, `playwright-report`, `coverage`: 실행 중 생성되는 원시 산출물이다. 테스트 소스와 확인된 실행 결과 문서는 포함하며 필요하면 README의 명령으로 다시 생성한다.
- 브라우저 sessionStorage의 사용자 프로필·생일·답안·대화는 프로젝트 소스 파일이 아니며 업로드하지 않는다.
- 채팅 플랫폼의 대화 전문은 저장소에 자동 수출하지 않는다. 해당 대화에서 확정한 계획·역할·구현·검증 결과를 프로젝트 문서로 보존한다.

## 상태 읽는 방법

과거 Phase 보고서는 당시의 스냅샷이며 원문을 보존한다. 최신 구현 상태는 README, `ROADMAP.md`, `PREAUTH_REPORT.md`를 우선한다. 예를 들어 과거 보고서의 'Git 저장소가 아님', '사주 계산 준비 중'은 이후 작업 전의 기록이다.

현재 실제 로그인·LLM·원격 계정 저장·실제 상대방 초대·공개 공유 링크·계정 탈퇴/Storage 정리·웹 공개 배포는 미완료다. GitHub 업로드로 해당 기능이 자동 활성화되지 않는다. 로컬 실행과 검증 명령은 README를 따른다.
