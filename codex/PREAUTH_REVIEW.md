# 로그인 전 사주·MBTI — 독립 사전 검토

2026-10-29 (Asia/Seoul). 최신 상태: **최종 독립 읽기 검토 완료 · 총괄 통합 실행 확인 대기**. 아래 사전/1차/2차 기록은 당시 상태를 보존한 이력이며, 마지막 「최종 독립 읽기 검토」가 현재 판정이다.

이 문서는 독립 reviewer가 작성한다. 쓰기 범위는 이 파일 하나이며 구현 코드, 원문 기획, 테스트 파일은 수정하지 않았다. 추가 에이전트/채팅을 생성하거나 다른 채팅에 메시지를 보내지 않았다. 전체 lint/typecheck/build/E2E 및 서버 실행은 총괄 담당이다.

## 확인 범위와 증거 수준

읽은 기준: `AGENTS.md`, `codex/START_HERE.md`, `product/PRD.md`, `product/FEATURE_SPEC.md`, `architecture/ARCHITECTURE.md`, `architecture/SCHEMA.md`, `tests/ACCEPTANCE.md`, `codex/PREAUTH_SESSIONS.md`, `codex/tasks/01-foundation.md`, `codex/tasks/05-share-launch.md`.

저장소는 Git 저장소가 아니다(`git status --short`: not a git repository). 최초 검사 시 사주 관련 구현은 `src/lib/saju-contract.ts`만 존재했다. `src/lib/saju.ts`, `src/lib/saju-engine/**`, `src/app/profile/**`, `src/components/saju-*.tsx`, 사주 전용 unit/E2E, `codex/SAJU_ENGINE.md`는 아직 제공되지 않았다. **이 사실은 진행 중 작업의 실패 판정이 아니다.** 구현의 정확성·개인정보 보호·완료 여부를 미리 승인하지 않는다.

기존 프로필/guest store/provider, 온보딩, 마이, 전체 삭제, 기존 공유 payload/renderer/component와 관련 unit/E2E 소스를 읽었다. `codex/PHASE3_5_REPORT.md`에 기존 lint/typecheck/build, 127 unit/50 E2E 통과 기록이 있다. `test-results/.last-run.json`은 `passed`, `failedTests: []`이며 360px/desktop 결과 이미지와 PNG 산출물 디렉터리가 존재한다. last-run만으로 테스트 수·대상 코드 버전을 증명할 수는 없다. **이번 reviewer가 테스트를 실행한 것은 아니며 새 사주 기능의 통과 증거도 아니다.**

## 기존 경계 확인

| 영역 | 읽기 확인 | 새 구현에서 유지할 조건 |
| --- | --- | --- |
| 프로필 입력 | `src/lib/profile.ts:6` Zod 입력 검증. 양력 유효일, 시간 형식, IANA 시간대 형식 검사. 음력은 숫자 범위만 검사 | 입력 검증 통과를 음력·윤달·명식 검증 완료로 간주하지 않는다. 엔진이 지원 날짜/시간대/달력의 의미를 다시 검사한다 |
| 저장 | `src/lib/guest.ts:58` Zod 저장, 24h TTL. sessionStorage 접근 실패 시 메모리 모드 | 계산 결과를 localStorage/서버/분석 로그에 새로 저장하지 않는다. 새 상태가 생기면 동일 삭제·만료 경계에 포함한다 |
| 만료·삭제 | `src/components/guest-provider.tsx:14` 만료 타이머/focus 재검사. `src/lib/guest.ts` clear/expire는 record를 null로 변경. 전체 삭제는 각 store를 지움 | 계산 중 삭제/만료/프로필 교체 시 이전 Promise 결과를 화면·공유 데이터로 복구하지 않는다 |
| 기존 동선 | `src/components/onboarding-form.tsx:35` 저장·건너뛰기 모두 `/test` 이동 | `/profile` 추가로 기존 검사 시작 경로와 익명 이용을 바꾸지 않는다 |
| 공유 | `src/lib/share-card.ts:5` 엄격한 허용 목록. `src/components/share-card.tsx:15` mount/generation 검사 및 object URL 해제 | 사주 카드도 별도 안전 payload만 렌더링한다. 출생 원문/명식/식별자/자유문구를 전달하지 않는다 |
| 다운로드 경합 | `tests/e2e/share-card.spec.ts` 늦은 canvas callback 후 이동·전체 삭제 시 다운로드 0건 검사 존재 | 사주 카드도 계산 지연, PNG 지연, 만료, 프로필 교체 각각을 검증한다 |
| 삭제 실패 고지 | `src/components/clear-local-data.tsx` 저장소 삭제 확인 실패를 성공으로 표시하지 않음 | 새 저장소가 추가되면 삭제 및 확인 목록도 갱신한다. 이미 다운로드한 파일 회수 불가 안내를 유지한다 |

현재 검사 점수/사주 결합이나 신규 출생정보 외부 전송은 제공된 범위에서 발견하지 않았다. 이 진술은 아직 없는 구현이나 라이브러리의 네트워크 동작에 대한 보증이 아니다.

## 구현 후 수용 기준과 검토 순서

### 1. 엔진 출처·라이선스·독립 검증

- 실제 설치 패키지명/고정 버전/lockfile과 LICENSE/저작권 고지, 재배포 조건을 대조한다. 문서의 라이선스 이름만으로 승인하지 않는다.
- 계산 코드와 전이 의존성을 읽고 fetch, XHR, beacon, 원격 SDK, 동적 원격 자원, 로그/오류 보고에 출생 원문이 들어가는지 검사한다. 브라우저 네트워크 검증은 총괄의 새 기능 E2E 증거로 확인한다.
- fixture마다 입력의 달력·윤달·시간대·시간, 기대 출력, 독립 출처/확인 날짜, 해당 출처의 관례를 기록해야 한다. 동일 엔진으로 만든 golden snapshot 또는 동일 라이브러리를 한 번 더 호출하는 테스트는 독립 정확성 검증으로 세지 않는다.
- 출처가 실제로 입증하는 범위를 구분한다. 음양력 날짜 변환 표만으로 절기 전환 시각·시주까지 검증했다고 결론내리지 않는다. 라이브러리 간 일치도 최종 정확성 보증으로 과장하지 않는다.
- 표본 검증 범위와 지원 전체 범위를 구분한다. 근거가 부족한 날짜/경계/시간대는 unsupported 또는 불확실성으로 남겨야 한다.

### 2. 달력·절기·시간대 행렬

| 축 | 필수 사례 | 기대 판정 |
| --- | --- | --- |
| 입력 없음/오류 | 완전 익명, MBTI만, 부분 날짜, 잘못된 시간, 유효하지 않은 시간대, 지원 범위 밖 연도 | missing/unsupported/error가 구분되고 가짜 명식이 없음 |
| 양력 | 윤년 2/29, 비윤년 2/29, 월말, 연말 | 유효일 계산, 불가능일 거절 |
| 음력 | 알려진 정상 날짜, 실제 윤달, 존재하지 않는 윤달, 29일인 달의 30일, 양력 환산 후 범위/미래 경계 | 변환 근거 일치 또는 명시적 미지원. 숫자만 맞는 입력을 확정하지 않음 |
| 절기 | 입춘 전/후, 월 경계 절기 전/후, 정확 경계와 불확실 구간 | 실제 적용 관례와 시간대가 표시되고 독립 근거와 일치. 단순 양력 1월/매월 1일로 대체하지 않음 |
| 날짜·시각 경계 | 22:59, 23:00, 23:59, 00:00, 00:01 및 전후 날짜 | 자시/일주 날짜 전환 관례 명시, 일관성 검사와 독립 기대값 대조 |
| 한국 시간대 | Asia/Seoul 지원 범위, 해당 범위에 역사적 표준시/서머타임이 포함되는지 | 모든 연도를 고정 UTC+9로 가정하지 않음. 미검증 역사 구간은 거절하거나 명확한 지원 제한 |
| 다른 시간대 | 유효한 다른 IANA zone과 alias | 입력 스키마가 허용해도 엔진이 지원하지 않으면 거절. Seoul로 조용히 치환하지 않음 |
| 출생시간 미상 | 보통 날짜와 절기/일주 경계 날짜 | hour=null. 임의 정오를 사실처럼 사용하지 않음. 연/월/일도 확정 불가능한 경우 불확실성을 처리 |
| 오행 | 3주/4주 각각 표시한 천간·지지 대표 오행 합계 | 각각 6/8개 집계. 지장간·강약·부족/우열·길흉·관계 점수로 오인시키지 않음 |

시간 입력 정밀도가 분 단위일 때 초 단위 절기 경계를 정확히 알 수 있는지 별도로 확인한다. 브라우저/서버 시스템 시간대가 달라도 같은 출생 입력의 결과가 달라지지 않는지 검토한다.

### 3. 해석·공유·비동기 생명주기

- 해석은 별도 재미/성찰 섹션이며 임상 진단, 학대 성향 탐지, 피해 취약도 수치, 성격/미래 단정이 없어야 한다. 안내문만 추가하고 본문은 단정하는 형태도 지적한다. 검사 5차원 채점·질문 원본은 그대로여야 한다.
- 공유 payload는 동의한 오행 요약과 선택적 MBTI 이야기만 포함한다. 생일/시간/닉네임/이름/원본 답안/대화/명식/연주·월주·일주·시주/원본 ID/출생 시각 역추론용 메타데이터를 금지한다. PNG 파일명, 렌더러 인수, canvas 텍스트, PNG 메타데이터와 다운로드 링크도 검사한다.
- 동의 기본값 false, 미동의 저장 불가, 선택적 MBTI 제외 시 payload/PNG에서 제거. 허용 목록 밖 필드를 넣으면 거절하는 단위 테스트를 요구한다.
- 계산 A를 지연 → 프로필 B 저장 또는 초기화 → A resolve 순서에서 A가 표시되지 않아야 한다. 삭제·만료·이동 후 늦은 오류도 이전 사용자 정보와 함께 표시하지 않는다.
- canvas.toBlob을 지연 → 삭제/만료/이동/프로필 교체 → callback 순서에서 anchor.click/download가 0건이어야 한다. stale 값 차단이 단순 unmount에만 의존하는지, 같은 mount에서 prop 교체에도 무효화되는지 확인한다.
- 실제 PNG signature/IHDR 1080×1080/1080×1920, 공개 URL 미생성, object URL 해제, 다운로드 실패/재시도 표시를 확인한다. 오행 요약도 개인정보 위험이 완전히 없는 것으로 표현하지 않는다.

### 4. 기존 흐름·접근성·실행 증거

- 홈/마이 → `/profile`, 프로필 없음/MBTI만/사주만/함께/미지원/실패/로딩, 수정·저장 후 `/test`, 건너뛰기, 새로고침, reset, 24h 만료, storage 차단을 확인한다.
- 기존 127 unit/50 E2E를 총괄이 회귀 실행하고 변경된 문구 assertion은 의미를 유지해서 갱신한다. 새 기능을 구형 테스트 결과에 포함했다고 주장하지 않는다.
- 360px 넘침, 키보드 포커스, 레이블, 오류 알림, 로딩 상태, 명식 표·오행 차트의 텍스트 대안과 대비, 두 PNG의 한글 잘림을 검사한다. 자동 axe 통과를 수동 스크린리더 검수와 동일시하지 않는다.
- 완료 증거에는 실행 명령·날짜·대상 파일/테스트 수·결과·실패 후 수정 여부를 기록한다. 총괄 실행 결과가 없으면 정적 검토만 완료로 보고한다.

## 통합 시 확인할 구체적 사항 — 결함 판정 전

| ID | 위치·재현 조건 | 영향 | 수정/확인 방향 |
| --- | --- | --- | --- |
| PRE-01 | `src/components/onboarding-form.tsx:65,85`는 현재 “명식이나 해석은 만들지 않아요”, “양력으로 변환하지 않아요” 고정 안내. 엔진 연결 후 같은 입력 화면 방문 | 실제 지원 기능과 설명이 어긋날 수 있음. 현재 미연결 상태에서는 올바른 설명 | 총괄 소유 공통 변경으로 지원 범위를 반영한 문구 검토. 저장 후 `/test` 유지. 지금 파일을 임의 수정하지 않음 |
| PRE-02 | `tests/e2e/foundation.spec.ts:12,45,50`은 “계산 준비 중”/음력 검증 대기 문구를 전제 | 신규 마이 문구 변경 시 구형 assertion 실패 가능 | 단순 테스트 삭제 대신 입력 없음/미지원/미검증 의미에 맞춰 총괄이 갱신. 기능 회귀와 문구 변경을 구분 |
| PRE-03 | `src/lib/profile.ts:27–38`는 음력 유효성·윤달 존재·음력의 미래 날짜를 확정하지 않음. 예: 음력 2000-02-30 + 윤달이 저장 스키마를 통과 | 엔진이 입력 스키마만 믿으면 존재하지 않는 음력 날짜로 명식 계산 가능 | 계산 엔진에서 달력 검증·변환 후 지원 범위 검사. 기존 “입력 원본 보존” 계약은 유지 |
| PRE-04 | `src/lib/saju-contract.ts`는 TS 타입 계약이며 런타임 result validator/원본 revision은 없음 | 잘못된 라이브러리 결과 또는 늦게 완료된 이전 계산을 UI가 무조건 신뢰할 수 있음 | 엔진 반환 경계 검증과 UI 세대/현재 record 검사 위치 확인. 타입 존재만으로 충족 판정하지 않음 |

위 항목은 구현 전 통합 주의사항이다. 제공되지 않은 신규 코드의 P1/P2 결함으로 집계하지 않는다. 실제 발견은 파일·줄, 재현, 영향, 수정 방향과 재검증 여부를 추가 기록한다.

## 원본 보존 기준선

아래 SHA-256은 이번 사전 검토 시작 시 읽은 파일의 기준선이다. Git/배포 전 스냅샷이 없으므로 그 이전부터 원본과 동일했다는 독립 증명은 아니다. 최종 검수 시 동일 해시를 확인한다.

| 파일 | SHA-256 |
| --- | --- |
| AGENTS.md | D523D48143F44584C2FDA2ADDFED128C4BAE9CFD0554E46C51915C3EF4C04365 |
| product/PRD.md | 98C34C01ECCAFCC5F751FBF303C62D4DDC5592D740CD0584E4465B070EAFBF1F |
| product/FEATURE_SPEC.md | 1C9DF6D374B0D65F0A8C64749703073309CE4AA93A98702D690DBD19FC7C76BE |
| architecture/ARCHITECTURE.md | 661AB056D11644A5DCF4F845976743CCEB6CA97505D79FCDE2606037B9D7644D |
| architecture/SCHEMA.md | 5D6FDBDF7A4C464067C7B394F8D0F658A3B348B1A4C8F25372C2E89EEFB1883E |
| tests/ACCEPTANCE.md | C44B7F3F06D2085E8793C25AAC9A7FCC7245C8D722D1A85304018AD197AAA743 |
| product/QUESTIONS.json | 7B29069BDBFC003884E38DBAC2A52D25B769A60305AF8B637F6ECB72EE0460F3 |
| product/SCENARIOS.json | 8F12E0493FFC8232D0DE0F1EFC5AA2DE9A7DF8C0CABDC3A9655B6D4285255F6D |

## 현재 판정

사전 수용 기준과 기존 경계 점검을 완료했다. 새 엔진·UI·카드의 정확성/개인정보/회귀 판정은 **구현 검수 대기**다. 라이선스·독립 fixture·실행 증거를 읽기 전 출시 승인이나 완료 판정을 하지 않는다. 로그인·실제 LLM·서버 저장·실제 두 계정 궁합·공개 배포는 이번 검수 완료로 해석할 수 없다.

## 1차 추가 읽기 검토 — 작성 중 등장한 파일

보고서 작성 후 `src/lib/saju-card.ts`와 `src/lib/saju-interpretation.ts`가 생성되어 해당 파일 전체를 추가로 읽었다. 이 시점에도 엔진/페이지/다운로드 컴포넌트/사주 테스트/엔진 문서는 제공되지 않았다. 아래는 진행 중 파일에 대한 정적 검토이며 기능 실행 승인이 아니다.

- `src/lib/saju-card.ts:6–21`: payload는 version/type/elements/basis/선택적 mbti의 엄격한 Zod 스키마이며 음수·소수·8 초과와 3주 합계 6/4주 합계 8 불일치를 거절한다. Profile이나 전체 명식을 받을 필드가 없다.
- `src/lib/saju-card.ts:24–77`: 로컬 canvas로 고정 크기 PNG를 만들며 원격 요청·출생 날짜/시간·명식 글자·사용자 ID 렌더링은 보이지 않는다. `basis`는 3주/4주 집계 및 시간 미상 안내에만 사용한다. 실제 명식의 연주/월주/일주/시주 값은 이미지에 넣지 않는다. PNG 실제 크기/레이아웃/메타데이터 검증은 실행 대기다.
- `src/lib/saju-card.ts:28,74`: font readiness와 toBlob에 비동기 경계가 있다. 호출 컴포넌트가 두 경계 이후에도 삭제/만료/프로필 교체/이동을 검사하는지 후속 검토가 필요하다. 순수 renderer에 lifecycle 로직이 없다는 사실만으로 결함으로 판정하지 않는다.
- `src/lib/saju-interpretation.ts:13–29`: 16종 MBTI 문구는 질문 형태의 고정 성찰 문구이며 진단·미래 확정·가해/피해 성향 수치가 보이지 않는다.
- `src/lib/saju-interpretation.ts:32–38`: 오행의 한계와 AI 생성 아님을 명시한다. 최다 오행 개수 설명과 함께 성격/관계 판단 불가 문구가 있다. 계산 엔진과 연결된 실제 표시·검사 점수 분리는 후속 확인 대상이다.

위 두 파일에서 현재 확정할 차단 결함은 발견하지 않았다. 동의 기본값, 선택적 MBTI 전달, late download 취소는 호출 UI가 아직 없으므로 미검증이다. 기존 8개 원본 파일 SHA-256은 보고서 작성 후 재검사에서도 위 기준선과 모두 일치했다.

## 2차 추가 읽기 검토 — 엔진·화면 도착 후

추가 제공된 `src/lib/saju.ts`, `src/components/saju-profile.tsx`, `src/components/saju-share-card.tsx`, `src/app/profile/page.tsx`, `src/components/my-profile.tsx`, 홈 프로필 링크, `codex/SAJU_ENGINE.md`, package/lockfile의 manseryeok 항목을 읽었다. 설치본 `manseryeok`의 package.json/LICENSE와 index/pillars/calendar conversion/solar terms/time resolution 구현 및 생성 데이터의 출처 주석도 읽었다. 이 기록은 후속 구현 도착 전 1차 기록을 대체하는 최신 검토 범위다.

### 정적으로 확인한 사항

- `src/lib/saju.ts:35–60`: Asia/Seoul 외 시간대, 1989~2026 밖 입력/변환 연도, 양력 윤달 플래그, 미래 출생 날짜/시간을 거절한다. 음력 변환은 설치본 `dist/calendar/convert.js:29`에서 해당 연도의 윤달 위치와 월별 유효 일수를 검사한다. PRE-03의 엔진 검증 위치는 존재한다. 실제 입력별 결과는 시험 대기다.
- `src/lib/saju.ts:62–85`: 연/월 경계 12절의 ±2분을 거절하며 시간 미상은 경계와 날짜 범위가 겹치면 거절한다. 내부 12시 계산값의 시주를 노출하지 않고 hour=null로 투영한다. 일주 자정 전환은 코드와 관례 안내에 명시되어 있다. 설치본 time resolver 기본값도 UTC+9 벽시계이며 진태양시 옵션을 주지 않았으므로 별도 경도/균시차 보정이 적용되지 않는다.
- `src/lib/saju.ts:93–104`: 엔진명/버전, 범위, 절기, 자정/23시 관례, 시간 미상 한계, 비진단 고지가 있다. **“검증 범위”라는 사용자 문구의 최종 승인에는 아직 작성 중인 독립 fixture와 실행 결과가 필요하다.** 코드가 먼저 생성됐다는 이유만으로 실패로 판정하지 않는다.
- `src/components/saju-profile.tsx:24–36,78`: effect cleanup 플래그와 expiresAt 검사, 전체 record 기반 key로 늦은 계산 적용을 막고 프로필 교체 시 계산/동의를 재설정한다. raw record key는 DOM 속성으로 출력되지 않는다. 계산 지연 후 실제 초기화/교체/만료의 브라우저 검증은 대기다.
- `src/components/saju-share-card.tsx:15–16,22–44,74–79`: 저장 동의와 MBTI 포함이 기본 false다. MBTI 선택 변경은 동의를 해제하고 저장 동의 철회는 진행 중 generation을 무효화한다. layout cleanup/prop 변경/pagehide와 expiresAt을 다운로드 직전 재검사한다. 완료 후 object URL을 해제한다. 실제 late canvas/font completion 테스트는 대기다.
- `src/lib/saju.ts`와 읽은 패키지 구현에서 원격 출생정보 전송/로그는 찾지 못했다. 패키지 dist의 fetch/XHR/beacon/HTTP 문자열 검색도 요청 코드를 찾지 못했다. 실제 브라우저 request 관찰은 아직 없으므로 네트워크 검증 완료로 표시하지 않는다.
- `manseryeok@2.0.0` 설치본은 MIT LICENSE에 2025 Yoohyojun 저작권 및 고지 포함 조건이 있다. runtime dependencies 항목은 없고 버전은 package/lockfile에 고정됐다. 배포 산출물의 고지 유지 여부는 아직 보지 않았다. 생성 절기표가 6tail 계산값에서 추출됐다는 주석을 확인했으므로 같은 6tail을 독립 기준으로 세지 않아야 한다.
- 홈과 마이에 `/profile` 링크가 추가됐다. 마이의 기존 “계산 준비 중”/음력 검증 대기 assertion 대상 문구는 익명/미계산 입력에 유지된다. PRE-02의 즉시 문구 충돌은 현재 읽은 코드에서 확인되지 않는다.

### 출처 확인의 실제 범위

2026-10-29 [KASI 2024 달력자료](https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024)에서 입춘 2월 4일 17:27과 “공식 발표 자료가 아님” 안내를 직접 읽었다. 따라서 이 페이지를 공식 월력요항 인증으로 표기하지 않는 엔진 문서의 제한은 적절하다. [IANA Asia 데이터](https://data.iana.org/time-zones/tzdb/asia)에서 Seoul zone/ROK 규칙 자료를 열람했다. [NAOJ 1989 표](https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_sy_en.cgi?year=1989)는 이번 웹 도구에서 열리지 않아 독립 재확인을 완료하지 못했다. 원문 표/fixture 수집 증거와 실제 대조값을 후속 검수에서 확인한다. 출처 링크가 있다는 사실만으로 1989~2026 전체 정확성이나 ±2분 오차 상한을 검증했다고 보지 않는다.

### 발견 및 통합 수정 요청

**REV-01 · P2 · 온보딩 안내와 새 로컬 계산 기능의 설명 불일치 — 최종 재검토에서 해결 확인(아래 참조)**

- 위치: `src/components/onboarding-form.tsx:65,85` ↔ `src/components/saju-profile.tsx:29,47` / `src/lib/saju.ts:48,74`.
- 재현 경로: `/onboarding`에서 “명식이나 해석은 만들지 않아요”, “양력으로 변환하지 않아요” 안내를 읽고 프로필 저장 → 마이 → 사주·MBTI 프로필 보기. 새 엔진이 지원 입력을 ready로 반환하면 명식과 음력 변환 기반 결과가 표시되는 코드 경로다. 현재 발견은 **소스 기준 재현 경로**이며 브라우저 실행 재현은 총괄 검증 대기다.
- 영향: 사용자가 기능과 출생정보 처리 범위를 잘못 이해할 수 있다. 개인정보 외부 전송을 발견했다는 뜻은 아니다.
- 수정 방향: 기존 폼에서 실제 달력 검증을 하지 않는다는 설명과, 프로필 보기에서 지원 범위 내 브라우저 로컬 계산을 한다는 설명을 구분한다. 서버 전송 없음/선택 입력/저장 후 `/test` 동선은 유지한다. 이 파일은 reviewer 소유가 아니므로 수정하지 않았다.

### 최신 판정과 남은 증거

**사전 검토와 제공된 구현의 1차 정적 검토 완료 · 독립 계산 검증 및 통합 실행 검수 대기.** 마지막 목록 확인 시 사주 전용 unit/E2E 파일은 아직 없고 `SAJU_ENGINE.md`에도 독립 fixture·테스트·lint가 작성 중으로 표시돼 있었다. 따라서 엔진 정확성·모바일 접근성·PNG 실물·전체 회귀의 완료/실패를 미리 판정하지 않는다. 새 구현이 준비되면 위 행렬과 실제 테스트 결과를 대조하고 REV-01 수정 여부를 재확인한다. 이번 reviewer가 실제 변경한 파일은 이 보고서 하나이며 테스트/서버는 실행하지 않았다.

## 최종 독립 읽기 검토

2026-10-29. 총괄의 구현 완료 후 재검토 요청에 따라 실제 현재 파일을 다시 읽었다. 수정 범위는 계속 이 보고서 하나다. 전체 build/typecheck/E2E/서버 및 unit tests를 reviewer가 실행하지 않았다.

### 판정

**읽은 구현에서 새 P0/P1/P2 기능·개인정보 결함을 확인하지 못했다. REV-01은 해결됐다. P3 고지 원문 정정 1건과 실행 검증 공백을 아래에 남긴다.** 이는 로컬 기능의 정적 검토 결과이며 통합 실행 완료나 공개 출시 승인이 아니다. 총괄의 새 빌드/E2E 결과가 최종 실행 판정의 근거다.

### 독립 fixture와 지원 범위

- 두 collector는 엔진을 import하지 않고 공개 HTML에서 숫자/달력 표기를 추출한다. NAOJ는 응답의 `LST:UT+9`, 연도, 연간 24개 행을 확인하고 KASI는 월별 예상 일수와 행 파싱을 확인한다. 앱 소스의 import 검색에서 collector/fixture 참조는 없으며 앱의 출생 입력을 collector로 전달하는 경로도 없다. collector의 fetch는 개발용 수집 코드이며 사용자 출생정보 전송과 구분된다.
- JSON을 실제 파싱해 NAOJ **38년·912개 절기**, KASI **51개월·1,572개 행**, 수집일 2026-10-29를 확인했다. fixture에 source URL이 남아 있다. KASI 범위는 지원 연도마다 1월 및 추가 13개월 표본이며 전체 날짜 전수 검증이 아니다. 원본 HTML 파일/해시를 별도 보존한 구조는 아니므로 미래 재수집 시 원천 사이트 변경 여부까지 추적하는 자료는 아니다.
- `tests/unit/saju-engine.test.ts`는 NAOJ의 저장 시각과 엔진 절기를 ≤1분으로 비교한다. KASI 저장값과 양방향 음양력 변환/윤달/일진을 비교한다. 일부 어댑터 테스트가 음력 입력과 양력 입력의 같은 엔진 결과를 비교하지만, 이것만을 독립 검증으로 삼지 않고 앞선 독립 표 대조가 따로 존재한다.
- [KASI 2024 달력자료](https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024)의 2월 10일=음력 1월 1일·갑진 일진을 직접 읽어 해당 fixture와 대조했다. [한국가톨릭대사전](https://encyclopedia.catholic.or.kr/entry/2945)의 입춘 기준, 갑·기년 병인월, 갑·기일 갑자시 규칙도 직접 읽었다. 원문은 일주 23시 전환 관법이므로 midnight 전체 명식의 단일 정답 출처로 사용하지 않는 문서 설명을 확인했다. 출처의 운명·성격 단정 설명은 앱 고정 문구로 가져오지 않았다.
- NAOJ 수치표와 KASI 월별 상세 표의 웹 도구 재열람은 실패했고 읽기 전용 HTTP 시도도 로컬 DNS 실패였다. collector 재실행은 다른 담당 fixture를 덮어쓰므로 하지 않았다. 따라서 reviewer가 NAOJ 912개 원문을 모두 다시 수집·대조한 것으로 표현하지 않는다. 테스트 코드/fixture·담당 실행 기록을 확인한 수준이다.
- 1989~2026, Asia/Seoul 제한, 미래 입력 거절, 유효하지 않은 음력 윤달/작은달 거절, 절입 ±2분 모호성, 시간 미상 hour=null, 자정/23시 관례는 코드·테스트·문서가 일치한다. 시간대 범위를 자동 확장하지 않는다. 23:59/00:01의 개별 사례나 모든 관법을 시험했다고 확대하지 않는다.

### 개인정보·공유·생명주기 재검토

- 계산은 브라우저 동적 import로 로컬 수행한다. 어댑터/설치 패키지 읽기 범위에서 출생정보 원격 전송·저장·로그 경로가 없고, test의 fetch spy도 이 의도를 검사한다. browser request 검사 테스트가 있으나 실행 결과는 총괄 확인 대상이다.
- 출력은 명식/오행/관례/한계를 가지며 원본 생년월일/닉네임/출생시간 필드를 복사하지 않는다. 명식 자체는 역추론 가능 정보이므로 개인 화면에만 두고, 공유용 renderer에는 엄격한 별도 스키마로 오행 합계·3/4주 집계 기준·선택적 MBTI만 전달한다. 파일명도 원본 출생정보를 포함하지 않는다. 이를 완전 익명화라고 주장하지 않는다.
- 저장 동의 및 MBTI 포함 기본 false, MBTI 선택 변경 시 재동의, 생성 중 동의 철회 시 generation 무효화, 프로필 교체 시 record key remount, 삭제/만료/이동에 대한 cleanup와 expiresAt 재검사를 재확인했다. 객체 URL은 생성 후 finally에서 해제한다.
- E2E 소스는 실제 PNG 두 규격, 동의 기본값/재설정, 삭제를 수반한 이동 후 late PNG, 열린 페이지의 만료 후 late PNG, 생성 중 동의 철회 후 late PNG를 검사한다. renderer unit tests는 금지 필드, 잘못된 합계, 잘못된 MIME, 16종 질문의 배치 계산을 검사한다. unit의 가짜 canvas 측정은 실물 PNG의 한글 레이아웃 검증을 대체하지 않는다.
- `SajuProfile`은 계산 Promise 해결 후 현재 effect와 만료시각을 검사한다. 다만 현재 E2E는 PNG의 toBlob만 지연한다. 계산용 dynamic import/Promise를 지연한 뒤 삭제·프로필 교체·만료하는 테스트, font readiness 지연 중 취소, 생성 중 프로필 교체는 별도 실행 증거가 없다. **코드상 차단 장치는 확인했으나 해당 경합을 검증 완료로 쓰지 말 것.** 총괄이 보강할 경우 지연 A → 원본 초기화/교체 → A 완료 후 명식/카드/다운로드 0건을 확인하면 된다.
- 홈/마이 링크와 저장/건너뛰기 후 `/test` 동선 유지, 표 caption/행·열 header, 텍스트 오행 수치, 상태/오류 안내, 360px용 CSS를 재확인했다. 실제 대비/키보드/axe/넘침은 총괄 E2E 및 화면 확인 전까지 정적 검토 범위다.

### REV-01 재검증 — 해결

`src/components/onboarding-form.tsx:65,85,89`의 현재 문구는 브라우저 로컬 계산, 1989~2026·Asia/Seoul 지원, 입력 화면에서는 숫자 범위만 검사하고 프로필 보기에서 음력 유효성/변환을 확인한다고 설명한다. 과거 “명식이나 해석은 만들지 않음”, “양력으로 변환하지 않음” 단정은 제거됐다. 같은 지적을 미해결로 중복 집계하지 않는다.

### REV-02 · P3 · 6tail 저작권 고지 연도 불일치 — 후속 재검토에서 해결 확인

- 위치: `src/lib/saju-engine/THIRD_PARTY_NOTICES.md:8`.
- 재현: 파일의 `Copyright (c) 2020 6tail`과 그 파일이 연결하는 [6tail 원저장소 LICENSE](https://raw.githubusercontent.com/6tail/lunar-javascript/master/LICENSE)를 대조하면 원문은 `Copyright (c) 2018 6tail`이다(2026-10-29 열람).
- 영향: 제3자 원문 고지가 정확하게 옮겨지지 않았다. 런타임 계산 오류나 출생정보 누출을 뜻하지 않는다.
- 수정 방향: 실제 파생 데이터의 upstream 버전/커밋 LICENSE를 확인하여 저작권 줄을 그대로 보존한다. 현재 연결된 원저장소를 기준으로 하면 2018로 정정한다. reviewer는 해당 파일을 수정할 권한이 없어 보고서로 요청한다.
- `manseryeok`의 2025 Yoohyojun MIT 고지는 설치본과 일치한다. [NAOJ 이용 조건](https://eco.mtk.nao.ac.jp/koyomi/site/index.html.en)의 재사용/출처 표시 안내와 fixture의 `(c) NAOJ`도 확인했다. 실제 배포 번들에 notices가 동봉/노출되는지는 이번 로컬 검토와 별개로 남아 있다.

### 실행 증거와 원본 보존

| 증거 | 확인한 내용 | 한계 |
| --- | --- | --- |
| `codex/SAJU_ENGINE.md` | 엔진 unit 2파일 133개, 담당 eslint 통과 명령/결과 기록 | reviewer 직접 실행은 아님 |
| 총괄 재검토 요청 | UI unit 24개 통과 보고 | 보고 받은 결과로 표시 |
| `node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json` | 기존 12개 및 새 사주 3개를 포함한 15파일이 failed=false, 동일 lastRun=1793274126878 | 캐시는 개별 테스트 수/원본 코드 해시/전체 콘솔 로그를 제공하지 않음 |
| `tests/e2e/saju-profile.spec.ts` | 새 E2E 8개 정의, 2개 프로젝트에서 실행 예정 | 검토 시 새 실행 결과/PNG/스크린샷 없음 |
| `test-results/.last-run.json` | 마지막 확인 시 17:30:46의 기존 passed 상태 | 새 사주 E2E 통과 증거로 사용하지 않음 |
| 원본 SHA-256 재검사 | 위 기준선 8개 파일 모두 일치 | 최초 검토 이전 원본 동일성까지 증명하는 것은 아님 |

최종 권고: REV-02의 고지를 정정하고, 총괄의 전체 lint/typecheck/unit/build/E2E 및 실제 PNG 결과를 기록한 뒤 실행 완료 범위를 결정한다. 현재 지원 범위/표본 한계를 유지하는 한 정적 읽기 검토에서 기능 출시를 막을 구체적 P0/P1/P2 결함은 추가 확인하지 못했다. 계산 지연 경합 미시험과 외부 원문 일부 재열람 실패는 위에 공개한 검증 한계다.

## 통합 수정 후 재검토

2026-10-29. 총괄의 추가 검증 보고를 받고 실제 수정 파일과 생성된 테스트 산출물을 읽었다.

- **REV-02 해결:** `src/lib/saju-engine/THIRD_PARTY_NOTICES.md:8`이 2018 6tail로 정정됐으며 `public/THIRD_PARTY_NOTICES.txt`에 동일한 전체 고지가 있다. 두 파일을 문자열로 비교해 내용 일치도 확인했다. 공개 디렉터리의 정적 파일 준비는 확인했으며 배포 URL의 HTTP 응답은 직접 요청하지 않았다. REV-01/02 모두 현재 해결 상태다.
- **통합 실행 보고:** 총괄이 unit 284개, lint/typecheck/build 성공, audit 0건을 보고했다. reviewer가 재실행한 결과가 아니라 총괄 실행 보고로 기록한다. 앞서 확인한 Vitest 캐시의 15파일 failed=false와도 모순되지 않는다.
- **초기 E2E 실패 원인 확인:** 20:45:48의 last-run은 failed 2건이었다. mobile/desktop `invalid lunar leap month`의 실제 `error-context.md`를 읽었으며 `getByRole('alert')`가 앱 오류 안내와 `__next-route-announcer__` 두 개를 잡은 strict mode 위반이었다. 페이지 snapshot에는 올바른 음력 오류 안내가 존재한다. 현재 테스트 두 assertion이 `.saju-result` 안으로 한정됐음을 확인했다. 실패를 제품의 음력 계산 결함으로 분류하지 않으며, 수정 후 실행 성공은 별도로 확인해야 한다.
- **실물 이미지 확인:** mobile Chromium 산출물의 `saju-square.png`와 `saju-portrait.png`, 360px `saju-profile.png`를 직접 열어 보았다. 두 PNG는 생년월일/시간/닉네임/명식 없이 오행 5개 수치·선택한 INFP 질문·비진단 안내가 보이고 한글이 누락되거나 footer와 겹치지 않는다. 단어 중간 줄바꿈은 있으나 문장 내용은 보존된다. 모바일 화면에서는 시간 미상 시주, 6글자 오행, 계산 한계, 별도 MBTI 질문 및 미동의 저장 비활성이 보인다. 전체 접근성/모든 브라우저 검증을 이미지 확인만으로 승인하지 않는다.
- **계산 지연 테스트:** 총괄이 dynamic import 자체 지연 후 삭제/만료 사례를 추가 중이라고 보고했다. 이 절 작성 시점의 파일은 아직 기존 8개 E2E 정의였으므로 추가 완료·통과를 선반영하지 않는다. 해당 코드/결과가 도착하면 다음 기록에 반영한다.

현재 미해결 코드 지적은 없다. 남은 것은 총괄의 E2E 재실행 및 추가 경합 테스트 실행 증거이며, 미완료인 실행을 완료로 표시하지 않는다.

### 추가 계산 지연 테스트 도착 확인

20:46:34 갱신된 `tests/e2e/saju-profile.spec.ts` 마지막의 `late engine loading cannot restore a profile after delete/expire` 두 사례를 읽었다. Next 정적 청크 응답에서 엔진 고유 문자열을 찾아 실제 lazy engine 전송을 gate로 지연하고, 로딩 안내를 확인한 뒤 프로필 삭제 또는 24h 만료를 수행한다. gate 해제 후 해당 응답 수신, 명식/카드 0개, guest sessionStorage=null을 확인하며 finally에서도 gate를 해제한다. 계산 지연 테스트 **정의 부재는 해소**됐다. 현재 사주 E2E는 10개 사례이며 두 프로젝트 기준 20건, 기존 50건과 합치면 예상 총 70건이다. 이 숫자는 소스에서 센 실행 예정 수이며 통과 수가 아니다.

마지막 읽은 last-run은 20:45:48의 이전 locator 실패 기록으로 새 두 사례가 포함된 재실행 결과가 아니었다. 따라서 최신 결론은 **REV-01/02 해결, 정적 검토와 PNG 실물 확인 완료, 추가 지연 테스트 포함 최종 E2E 결과 대기**다. 이번 후속 검토에서도 변경 파일은 `codex/PREAUTH_REVIEW.md` 하나이며 테스트나 서버를 별도로 실행하지 않았다.
