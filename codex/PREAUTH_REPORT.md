# 로그인 전 사주·MBTI 기능 — 통합 결과

2026-10-29. 별도 엔진·UX·검수 세션의 산출물을 총괄이 통합하고 검증했다. 이번 완료 범위는 게스트 사주 계산/결과/카드다. 서비스 전체, 모든 출생연도/시간대, 실제 AI 풀이 완료를 뜻하지 않는다.

## 현재 동작

- 홈/마이의 사주·MBTI 프로필 보기 → `/profile`. 기존 프로필 저장/건너뛰기 후 `/test` 동선은 유지한다.
- `manseryeok@2.0.0`을 브라우저에서 로컬 호출. 출생정보를 외부에 보내지 않는다. 1989~2026년 Asia/Seoul 지원, 음력/윤달 확인 및 양력 변환, 명식과 대표 오행 개수 표시.
- 시간 미상은 시주를 제외하고 6글자로 집계한다. 시간 있음은 8글자다. 절입 전후 2분 및 시간 미상인 절입 경계일은 확정을 거절한다. 일주 자정 전환, 진태양시/경도 보정 없음, 지원하지 않는 과거 표준시/DST/다른 시간대 제한을 표시한다.
- MBTI 16종의 고정 성찰 질문. 오행과 MBTI는 관계 성향 점수와 분리한다. 개인 운세/성격/미래에 대한 AI 분석이나 진단이라고 표현하지 않는다.
- PNG 1080×1080 / 1080×1920. 오행 요약·안내만 기본 포함, MBTI는 별도 선택. 저장 동의 기본 false이며 포함 항목 변경 시 재동의를 받는다. 생일/시간/이름/명식 원문/원본 답안/대화는 이미지에서 제외한다.
- 프로필 삭제·24h 만료·화면 이동 시 결과와 동의가 사라진다. 늦게 로딩된 계산 엔진, 늦은 PNG 생성 결과는 삭제된 정보를 복구하거나 다운로드하지 않는다.

## 변경 파일

엔진 담당: `src/lib/saju.ts`, `src/lib/saju-engine/**`, `tests/unit/saju-engine*.test.ts`, `package.json`, `package-lock.json`, `codex/SAJU_ENGINE.md`.

UX 담당: `src/app/profile/page.tsx`, `src/components/saju-profile.tsx`, `saju-share-card.tsx`, `src/lib/saju-card.ts`, `saju-interpretation.ts`, `src/app/globals.css`, 홈과 `my-profile.tsx`, 사주 카드 unit 및 `tests/e2e/saju-profile.spec.ts`.

총괄: 공통 `saju-contract.ts`, 온보딩/검사 결과/궁합의 옛 안내 정정, 프로필 페이지 제목 중복 제거, 공개 라이선스 파일 `public/THIRD_PARTY_NOTICES.txt`, 오류 안내 테스트 범위 수정, 계산 로딩 지연 후 삭제/만료 E2E 추가, README/ROADMAP/세션 계약/AI 준비 문서와 이 보고서.

검수 담당: `codex/PREAUTH_REVIEW.md`만 작성. 구현과 검수 역할을 분리했다. 원본 기획·문항·시나리오·프롬프트는 보존했다.

## 최종 실행 결과

| 검사 | 결과 |
| --- | --- |
| `npm.cmd test` | 15개 파일, 284개 통과 (기존 127 + 엔진 133 + 카드/문구 24) |
| `npm.cmd run lint` | 통과 |
| `npm.cmd run typecheck` | 통과 |
| `npm.cmd run build` | Next.js 16.4.3 Webpack 통과, /profile 생성 확인 |
| `npm.cmd run test:e2e` | 360px 모바일·1280px 데스크톱 Chromium 총 70개 통과 |
| `npm.cmd audit --json` | 알려진 취약점 0건 |
| 로컬 HTTP | 기존 3000번 미리보기의 /profile 200·새 페이지 내용 확인, /THIRD_PARTY_NOTICES.txt 200 |

첫 E2E의 2개 실패는 앱 오류 영역과 Next route announcer가 모두 role=alert라 테스트 선택자가 중복되는 문제였다. 실제 오류 안내 영역으로 범위를 좁혔다. 계산 엔진 lazy chunk를 지연해 삭제/만료 후 결과가 복구되지 않는 4개 실행을 추가했고 최종 전체 70개가 통과했다.

실제 생성된 두 크기 PNG의 헤더/크기/다운로드 성공과 한글 배치를 확인했다. 모바일 명식 표/오행/공유 화면의 자동 접근성·가로 넘침 검사를 통과했다. 원본 데이터 외부 요청이 없는지 브라우저 테스트로 확인했다. 실제 휴대폰 Safari/스크린리더 수동 QA는 수행하지 않았다.

## 독립 검수 반영

- REV-01: 온보딩의 '계산하지 않음' 설명을 실제 지원 범위와 로컬 계산 흐름에 맞게 수정.
- REV-02: [6tail 원저장소 LICENSE](https://raw.githubusercontent.com/6tail/lunar-javascript/master/LICENSE)에 맞춰 저작권 연도를 2018로 정정하고 공개 고지 파일에도 동일 적용.
- 검수자는 엔진 코드·독립 fixture 수집 방식·라이선스·공유 필드·비동기 취소를 읽고 PNG와 모바일 화면을 확인했다. 통합 테스트는 총괄 실행이다. reviewer 보고서의 '최종 E2E 대기' 시점 이후 이 보고서에서 70개 통과를 확정했다.
- KASI 음력/일진 1,572개 표본과 NAOJ 절기 912개 대조 근거·범위는 SAJU_ENGINE.md 참조. 모든 날짜/관법 검증이나 기관 인증·운세 정확성을 뜻하지 않는다.

## 남은 계획

실제 AI 연결은 준비 문서만 있으며 아직 구현/호출하지 않았다. 키·제공자·예산과 요청/비용 보호를 갖춘 후 별도 검증한다. 로그인·서버 기록 저장·실제 두 계정 궁합·공개 링크·원격 탈퇴/Storage 정리·공개 배포는 미완료다. 개인별 장문 사주 풀이·지원 연도/시간대 확장·추가 캐릭터/궁합 카드·PWA/스토어 앱도 현재 완료 범위가 아니다.

지금 확인: `http://127.0.0.1:3000/profile`. 프로필이 없다면 출생정보를 입력·저장한 뒤 홈 또는 마이에서 사주·MBTI 프로필 보기를 연다. 실행 중인 미리보기를 보존했으며 테스트용 3100번 서버는 Playwright가 종료했다.
