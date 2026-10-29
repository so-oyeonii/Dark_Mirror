# DARK MIRROR — Codex 프로젝트 스타터

사주 × MBTI × 관계 성향 테스트 × AI 관계 시뮬레이션 × 2인 궁합 × 결과 카드.

> **현재 상태:** Phase 1·2 기반 위에 Phase 3~5의 로컬 실행 범위와 게스트 사주·MBTI 프로필을 구현했습니다. 검사·결과·로컬 사주 계산·고정 응답 대화·가상 A/B 동의 예시·PNG 저장·전체 로컬 삭제를 사용할 수 있습니다. 실제 로그인, LLM, 상대방 초대, 공개 공유 링크, 서버 저장·탈퇴는 연결되지 않았습니다. 실서비스 단계가 모두 완료된 것은 아닙니다. 아래 스타터 안내와 원본 기획은 유지합니다.

## 로컬 실행

Node.js 22.13+ 또는 24 LTS 권장(검증 환경: Node 24.14.0, npm 11.9.0).

GitHub에서 처음 가져오는 경우:

```powershell
git clone https://github.com/so-oyeonii/Dark_Mirror.git
cd Dark_Mirror
```

```powershell
npm ci
npm run dev
```

[로컬 앱 열기](http://127.0.0.1:3000). API 키 없이 실행됩니다. PowerShell 실행 정책으로 npm.ps1이 차단된다면 `npm.cmd`를 사용하세요.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E는 빌드 후 3100번 포트에 프로덕션 서버를 자동으로 시작·종료합니다. Chromium에서 360px 모바일 및 1280px 데스크톱을 검사합니다. `npm run start`로 빌드 결과를 직접 실행할 수도 있습니다.

Windows 검증 환경에서 Turbopack의 PostCSS 하위 프로세스 종료가 재현되어 `dev`와 `build`는 Next.js에서 지원하는 `--webpack`을 사용합니다. TypeScript 7은 현재 설치된 typescript-eslint와 호환되지 않아 TypeScript 6.0.3으로 고정했습니다. 버전은 `package.json`과 `package-lock.json`에 기록되어 있습니다.

### 실제 동작 범위

- `/`: 데모 랜딩. `/onboarding`: 선택적 닉네임·MBTI·출생 입력, 익명 건너뛰기, Zod 검증. 저장/건너뛰기 후 검사로 이동합니다.
- `/test`: 원본 JSON의 15문항을 한 문항씩 표시. 5점 척도, 이전/다음, 응답 및 현재 위치 복구, 재시작 확인.
- `/result/[id]`: 역문항을 반영한 5차원 점수와 그래프·설명·성찰 질문. 15문항 완료 시에만 제공하며 총점이나 임상적 진단은 만들지 않습니다.
- `/me`: 임시 프로필, 검사·대화 이력의 개별/전체 삭제. 별도의 **모든 로컬 기록 삭제**는 프로필·검사·대화·궁합 예시를 함께 정리합니다. 삭제 실패는 숨기지 않고 안내합니다. 다른 탭과 다운로드한 파일은 별도로 삭제해야 합니다.
- `/auth`: 인증 미연결 안내. 이메일 수집·메일 발송 없음.
- `/simulation`, `/simulation/[id]`, `/simulation/[id]/result`: 동의 후 3개 가상 시나리오, 최대 5턴, 3가지 선택지 또는 500자 입력, 즉시 중단·안전 지원, 고정 피드백. 실제 AI로 입력의 의미를 분석하지 않습니다. 위험 표현 감지는 제한적인 규칙이며 수동 안전 지원 버튼도 제공합니다.
- `/match`, `/match/[id]`: 가상의 A/B 초대·동의 흐름. 256bit 난수의 SHA-256 해시, 72시간 만료, 일회 수락, 참여자·허용 필드·양측 교집합·철회를 검증합니다. 내 실제 프로필을 쓰지 않으며, 한 사람이 둘의 화면을 조작하는 **예시**입니다. 실제 상대방 동의를 대행하지 않습니다. 메모리에만 있어 새로고침하면 초기화됩니다.
- 검사 결과에서 동의 후 PNG **1080×1080 / 1080×1920** 저장. 5개 성향 수치와 안내만 담고 닉네임·생년월일·답안·대화·사용자 ID를 제외합니다. 원본 삭제·만료·페이지 이동 중 늦게 완료된 생성 작업은 다운로드하지 않습니다. 공개 링크를 만들지 않으며 이미 내려받은 파일은 회수할 수 없습니다.
- 게스트 프로필은 마지막 저장부터 24시간, 각 검사는 **시작부터 고정 24시간** 후 만료됩니다. `sessionStorage` 새로고침 복구와 직접 삭제를 지원합니다. 검사 수정·완료·새로고침은 만료를 연장하지 않습니다. 완료 기록은 최근 20회까지 유지하며 초과 시 가장 오래된 기록을 지웁니다.
- 대화도 시작부터 고정 24시간 만료이며, 진행 중 1개와 종료 기록 최근 20개까지 보관합니다. 자유 입력 원문은 이 탭에만 임시 저장하며 카드·궁합으로 보내지 않습니다.
- 브라우저의 탭 복원·복제 기능으로 정보가 남거나 복사될 수 있으므로 공용 기기에서는 직접 초기화하세요. 저장소 사용이 차단되면 메모리로 전환하고 한계를 표시합니다. 결과 URL은 공개 공유 링크가 아니며 임시 기록이 없는 탭이나 기기에서는 결과를 조회할 수 없습니다.
- `/profile`: 홈·마이의 **사주·MBTI 프로필 보기**에서 게스트 출생정보로 명식·오행 개수와 MBTI 고정 성찰 문구를 확인합니다. 서버나 AI로 출생정보를 전송하지 않습니다. 사주 카드 두 크기도 다운로드하며 기본적으로 MBTI는 제외하고 별도 선택·저장 동의를 받습니다. 생년월일·시간·이름·명식 원문은 카드에 넣지 않습니다.
- 사주 계산은 `manseryeok@2.0.0`으로 **1989~2026년 / Asia/Seoul** 범위만 지원합니다. 입력 화면의 음력 검사는 숫자 범위뿐이며 `/profile`에서 실제 음력·윤달 확인과 양력 변환을 수행합니다. 지원하지 않는 입력은 안내하고 계산값을 꾸미지 않습니다. 원본 달력의 연·월·일을 보존합니다.
- 연주는 입춘, 월주는 12절, 일주는 자정 기준이며 경도·진태양시 보정은 하지 않습니다. 출생시간 미상은 시주를 제외합니다. 절입 전후 2분 및 시간 미상인 절입 경계일은 결과를 확정하지 않습니다. 오행은 표시한 천간·지지의 대표 오행 개수로 강약·길흉·관계 점수가 아닙니다. 풀이 문구는 제한된 고정 안내이며 개인 운세를 AI가 분석한 결과가 아닙니다.
- 엔진 지원 범위·독립 검증 자료·한계는 [사주 엔진 기록](codex/SAJU_ENGINE.md), 라이선스는 `src/lib/saju-engine/THIRD_PARTY_NOTICES.md`와 배포 시 `/THIRD_PARTY_NOTICES.txt`에서 확인합니다.

### 환경변수 및 실제 연동 전 조건

필요할 때 `.env.example`을 `.env.local`로 복사합니다. 지금은 모든 키를 비워도 됩니다. `.env.local`은 git에서 제외됩니다.

공개 설정의 이름은 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(anon 또는 publishable key), `NEXT_PUBLIC_APP_URL`입니다. `SUPABASE_SERVICE_ROLE_KEY`와 `OPENAI_API_KEY`는 후속 단계를 위한 서버 전용 자리이며 현재 앱은 사용하지 않습니다.

키를 넣는 것만으로 인증/DB 접근을 켜지 않습니다. Supabase 팩토리는 준비했지만 호출하는 UI/API가 없으며, 서버 팩토리는 쿠키 쓰기가 가능한 Route Handler/Server Action용입니다. 실제 연결 전 매직 링크 콜백·세션 갱신·서버 소유권·요청 제한·명시적 게스트 이전을 구현하고 검증해야 합니다. 원본 초기 SQL은 보존하고, `0002_ownership_and_lifecycle.sql`에 소유권 RLS·최소권한·완료 답안 보호·음력 원본/생성값 분리·삭제 FK를 추가했습니다. PGlite의 실제 PostgreSQL 엔진에서 검증했지만 실제 Supabase 연결 검증을 대신하지 않습니다.

### 개발 전용 서버 API

`POST /api/demo/simulation`은 `npm run dev`의 localhost/127.0.0.1과 동일 Origin에서만 허용합니다. 브라우저 데모 UI는 이 API를 사용하지 않습니다. 프로덕션 빌드에서는 항상 503을 반환하며 키 설정으로 활성화되지 않습니다.

- JSON 8KiB 제한, Zod 입력/출력 검증, 시작 동의 필수.
- `action: start` + `scenarioId: LOVE|FRIEND|WORK` + `consent: true` → session, capability, capabilityExpiresAt 반환.
- `turn`: sessionId와 request(requestId UUID, expectedTurn 1~5, text 1~500, 선택적 choiceId a/b/c). 이후 요청의 `Authorization: Bearer <capability>` 필수. `stop`은 safety boolean, `delete`는 sessionId를 받습니다.
- 서버 메모리의 capability는 **1시간** 또는 프로세스 재시작 시 소멸합니다. session.expiresAt의 24시간은 브라우저 도메인의 수명이며 개발 서버 보관 수명과 다릅니다.
- 최대 100개 세션, 전체 시작 분당 10회, 세션별 제출 분당 12회. 중단·삭제는 제출 제한 이후에도 가능. 동일 requestId/내용은 원래 output을 재사용하고 내용 충돌은 거부합니다.
- 개발용 단일 프로세스 메모리 제한입니다. 운영 인증·분산 제한·DB 트랜잭션·LLM 비용 상한을 대체하지 않습니다. 로그에 원문/토큰을 출력하지 않습니다.

### 팀 및 작업 기록

프로젝트 전용 `.codex/agents/`에 `planner`, `reviewer`, `ux_frontend`가 있습니다. 전역 사용자 역할은 변경하지 않았습니다. 역할별 모델은 현재 세션 설정을 상속합니다. 원본 템플릿은 `codex/agent-profiles/`에 함께 보관합니다.

- [팀 역할과 소유권](codex/TEAM.md)
- [Phase 1 결정 사항](codex/PHASE1_DECISIONS.md)
- [디자인 시스템](codex/DESIGN.md)
- [Phase 1 검증 기록](codex/PHASE1_REPORT.md)
- [Phase 2 결정 사항](codex/PHASE2_DECISIONS.md)
- [Phase 2 검증 기록](codex/PHASE2_REPORT.md)
- [Phase 3~5 로컬 구현·검증 기록](codex/PHASE3_5_REPORT.md)
- [다음 개발 순서와 완료 기준](codex/ROADMAP.md)
- [실제 연동 체크리스트](codex/INTEGRATION_CHECKLIST.md)
- [사주·MBTI 통합 검증 기록](codex/PREAUTH_REPORT.md)
- [저장소에 포함한 자료와 제외 항목](codex/REPOSITORY_CONTENTS.md)

### 사용자가 직접 준비할 일

현재 로컬 개발·검증에는 계정이나 키가 필요하지 않습니다. 완성된 화면과 문구를 직접 확인해 의견을 주는 것은 선택 사항입니다.

실제 연동 단계에서 서비스 계정 로그인, Supabase 프로젝트와 인증 이메일 설정, AI 서비스 키·사용 예산을 함께 확인합니다. 공개 출시 전에는 도메인, 대상 이용 연령, 개인정보 보존·삭제 정책, 배포 여부를 결정해야 합니다. 비밀키는 채팅에 붙여 넣지 않고 `.env.local` 또는 배포 서비스의 비밀 환경변수에 설정합니다. 스토어 앱을 출시하기로 확정할 경우 개발자 계정과 심사 준비는 별도 단계입니다.

현재는 데스크톱·모바일 브라우저에서 사용하는 반응형 웹앱입니다. PWA 설치·오프라인 캐시·앱스토어 패키지는 아직 포함하지 않았습니다. Vercel 배포를 선택한다면 현재 미설치인 CLI를 `npm i -g vercel`로 설치하는 것을 권장합니다. 이후 `vercel env pull`, `vercel deploy`, `vercel logs`로 환경설정·배포·로그 확인을 연결할 수 있습니다. 이번 작업에서는 공개 배포나 전역 설치를 하지 않았습니다.

## 빠른 시작
1. 이 ZIP을 압축 해제하고 폴더를 VS Code 또는 Codex에서 엽니다.
2. 프로젝트 루트의 `AGENTS.md`를 먼저 읽게 합니다(Codex는 이 파일을 지침으로 사용할 수 있습니다).
3. `codex/START_HERE.md`의 첫 프롬프트를 Codex에 붙여 넣습니다.
4. Phase 1이 완성되고 로컬에서 실행 확인한 뒤 `codex/tasks/02-test.md`부터 순서대로 진행합니다.
5. Supabase 프로젝트 및 AI API 키는 해당 기능을 실제 연동할 때 구성합니다. 비밀키는 `.env.local`에만 두고 커밋하지 않습니다.

## 파일 안내
- `AGENTS.md`: Codex의 지속 지침
- `product/PRD.md`: 제품 목표 및 사용 흐름
- `product/FEATURE_SPEC.md`: 6개 기능의 상세 요구사항
- `product/QUESTIONS.json`: 자체 작성 15문항 및 채점키
- `product/SCENARIOS.json`: 3개 시뮬레이션 시드
- `architecture/ARCHITECTURE.md`: 기술·API·권한·AI 아키텍처
- `architecture/SCHEMA.md`: 테이블 및 개인정보·보존 정책
- `supabase/migrations/0001_initial.sql`: 초기 SQL 구조 및 안전한 기본 RLS
- `ai/prompts/`: AI 캐릭터, 피드백, 궁합, 프로필용 프롬프트
- `codex/tasks/`: 5단계 개발 지시서
- `tests/ACCEPTANCE.md`: 기능별 수용 기준 및 QA 시나리오

## 주의
사주·MBTI는 자기탐색/엔터테인먼트이며 관계 행동 점수와 결합해 진단하거나 가스라이팅 취약성을 예측하지 않습니다. 15문항은 **검증된 심리척도가 아닌 초안**입니다. 실서비스 출시 전 법률·개인정보·심리측정 검토가 필요합니다.
