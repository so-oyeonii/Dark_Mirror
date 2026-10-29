# Phase 1 구현·검증 기록

작성일: 2026-10-29 (Asia/Seoul)

## 완료한 범위

Next.js App Router, TypeScript strict, Tailwind 기반 한국어 모바일 앱을 현재 프로젝트 루트에 추가했다. 기존 PRD·기능명세·아키텍처·스키마·문항·시나리오·프롬프트·초기 SQL은 유지했다.

- 랜딩, 공통 디자인 토큰·컴포넌트, 5개 하단 탭, 본문 건너뛰기 링크.
- 온보딩 선택 입력과 전체 건너뛰기, 닉네임/MBTI/달력별 날짜/시간/시간대 Zod 검증.
- 게스트 프로필의 탭 내 저장·새로고침 복구·수정·초기화·24시간 만료. 편집 화면에서도 만료 시 입력칸 정리.
- 브라우저 저장소 차단/쓰기/삭제 실패를 처리하고 메모리 모드 및 기존 정보 잔존 가능성을 안내.
- 인증 미연결 안내 화면, 마이의 임시 프로필·빈 기록 화면. 테스트·AI·궁합은 준비 중 화면.
- 로딩, 일반 오류, 404 화면과 환경변수 예시.
- Supabase 브라우저/서버 팩토리. 실제로 호출하는 화면/API는 없으며 키만으로 인증/DB 접근을 활성화하지 않음.
- 프로젝트 전용 planner·reviewer·ux_frontend 역할 설정과 팀/기획 결정/디자인 문서.

## 변경 파일

### 기존 파일 보완

- `README.md`: 현재 범위, 설치·실행·검증 명령, 환경변수 및 다음 단계 안내 추가. 기존 스타터 설명 유지.
- `.env.example`: 실제 연동 미활성화 및 공개/서버 전용 변수 구분 설명.
- `.gitignore`: TypeScript 증분 빌드 산출물 제외 추가.
- `AGENTS.md`: Next.js 개발 서버가 자동 추가한 블록을 제거하여 원본으로 복원. `agentRules: false`로 재추가 방지.

### 신규 기반 파일

`package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`.

### 신규 앱 파일

- `src/app/`: `layout.tsx`, `globals.css`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` 및 `onboarding`, `auth`, `me`, `test`, `simulation`, `match`의 `page.tsx`.
- `src/components/`: `ui.tsx`, `app-shell.tsx`, `coming-soon.tsx`, `guest-provider.tsx`, `onboarding-form.tsx`, `my-profile.tsx`.
- `src/lib/`: `profile.ts`, `guest.ts`, `env.ts`, `supabase/client.ts`, `supabase/server.ts`.

### 신규 테스트·팀 문서

- `tests/unit/profile.test.ts`, `tests/unit/guest.test.ts`, `tests/unit/env.test.ts`.
- `tests/e2e/foundation.spec.ts`.
- `.codex/agents/{planner,reviewer,ux_frontend}.toml` 및 원본 템플릿 `codex/agent-profiles/`.
- `codex/TEAM.md`, `codex/PHASE1_DECISIONS.md`, `codex/DESIGN.md`, 이 보고서.

## 실행 결과

검증 환경: Windows, Node 24.14.0, npm 11.9.0. Next.js 16.4.3, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.3. 직접 의존성은 정확한 버전으로 저장하고 lockfile을 생성했다.

| 명령/검증 | 결과 |
|---|---|
| npm install | 완료. 마지막 설치 감사 결과 알려진 취약점 0건 |
| npm run lint | 통과, 오류·경고 없음 |
| npm run typecheck | 통과 |
| npm test | 3개 파일, 단위 테스트 28개 통과 |
| npm run build | Webpack 프로덕션 빌드 통과, 7개 앱 경로 및 404 생성 |
| npm run test:e2e | Chromium 모바일 360×800 / 데스크톱 1280×900, 총 18개 통과 |
| 자동 접근성 | 7개 화면, 두 viewport에서 axe WCAG 2 A/AA·2.1 AA 규칙 위반 0건 |
| 실제 화면 | 홈/온보딩 모바일 및 홈 데스크톱 캡처를 시각 검토 |
| npm run dev | 정상 기동, HTTP 200 응답 확인 |

E2E는 랜딩에서 온보딩 진입, 익명 건너뛰기, 잘못된 닉네임·양력 날짜, 음력 검증 대기, 저장·복구·수정·초기화, 저장소 차단, 편집 중 만료, 탭 이동, 키보드 본문 건너뛰기를 확인한다. 자동 접근성 검사는 전체 WCAG 준수 판정이나 수동 스크린리더 검사를 대신하지 않는다. Safari/Firefox 및 실제 모바일 기기는 검증하지 않았다.

검수자가 정적 검토에서 발견한 만료 후 편집 폼 잔존, 저장·삭제 동시 실패 고지 부족, 저장소 복구 후 표시 오류를 수정하고 회귀 테스트를 추가했다. 수정 후 독립 정적 재검토에서 잔여 구체적 결함은 보고되지 않았다.

### 해결한 도구 호환 문제

- TypeScript 7.0.2는 설치된 typescript-eslint에서 지원하지 않아 TypeScript 6.0.3으로 조정했다. ESLint는 10.13.0을 사용한다.
- Turbopack의 CSS/PostCSS 처리 하위 프로세스가 이 환경에서 종료되었다. 일반 권한에서도 재현되어 `dev`와 `build`를 [Next.js가 지원하는 Webpack 옵션](https://nextjs.org/docs/app/api-reference/turbopack)으로 전환했다.
- npm 레지스트리·브라우저 다운로드 및 일부 빌드/로컬 소켓 작업은 샌드박스 밖의 허용된 실행 권한으로 완료했다.

## 실행 방법

```powershell
npm ci
npm run dev
```

브라우저에서 `http://127.0.0.1:3000`을 연다. 키나 `.env.local` 없이 동작한다. PowerShell 실행 정책 문제가 있으면 `npm.cmd`와 `npx.cmd`를 사용한다.

E2E 재실행은 `npm run build`, `npx playwright install chromium`, `npm run test:e2e` 순서다. 테스트는 3100번 포트를 사용하며 해당 서버는 자동 종료한다. 검증 산출물은 git 제외 경로 `playwright-report/`, `test-results/`에 있다.

## 미구현·다음 단계

1. Phase 2: 원본 `product/QUESTIONS.json`을 사용한 15문항·역문항 채점·5차원 결과·응답 복구·비검증/비진단 표시.
2. 실제 계정/DB 연동 전: Supabase 프로젝트 설정, 매직 링크 콜백, 세션 갱신, 서버 소유권·RLS 격리 테스트, 요청 제한, 명시적 게스트 이전. 현재 SQL에는 접근 정책이 없으므로 기능을 열지 않는다.
3. 음력 원본 연·월·일과 변환 날짜를 분리하는 DB 보완. 검증 엔진 없이 사주 계산/음력 변환을 하지 않는다.
4. Phase 3 이후: 실제 LLM·턴 멱등성·안전 종료, 궁합의 상호 동의·철회와 카드 원본 연결, 공유·이력·삭제 기능.

이번 작업은 배포하지 않았고 실제 이메일·DB·LLM 호출을 하지 않았다. Git 저장소가 없는 기획 패키지에서 시작했으며 초기화·커밋은 수행하지 않았다.
