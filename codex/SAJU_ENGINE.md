# 사주 엔진 조사·구현 기록

2026-10-29. 담당 구현 완료. 전체 통합 검증은 총괄 담당.

## 채택과 범위

- `manseryeok@2.0.0`, MIT © 2025 Yoohyojun, 런타임 의존성 없음. 정확 버전을 package.json/package-lock.json에 설치했다.
- [원저자 README](https://github.com/yhj1024/manseryeok), [MIT LICENSE](https://github.com/yhj1024/manseryeok/blob/main/LICENSE), 설치본 `dist` 소스를 확인했다.
- 한국 음력 자료는 KASI 기반 테이블, 절입 보정표는 6tail에서 추출한 값이다. 따라서 6tail과의 대조만으로 독립 검증 완료라 할 수 없다.
- 대안 `lunar-typescript`는 중국 음력 기준이므로 한국 윤달 변환에 직접 사용하지 않는다. `korean-lunar-calendar`는 한국 음력 변환에는 적합하지만 별도 절입 계산이 필요하다.
- `calculateSaju: CalculateSaju`를 `src/lib/saju.ts`에 export했다. 브라우저 동적 import, 순수 로컬 계산이며 원본 날짜의 fetch/저장/로그 없음. 라이브러리 소스에서도 네트워크·서버 모듈 사용을 찾지 못했다.
- 지원: 입력 연도와 변환 후 양력 연도 모두 1989~2026, Asia/Seoul만. 미래 날짜/시간 거절. 원저자가 광고하는 1800~2300 전체를 지원한다고 주장하지 않는다.
- 1989 이전은 한국 과거 표준시와 서머타임 미검증으로 거절. [IANA Asia/Seoul 및 ROK 규칙](https://data.iana.org/time-zones/tzdb/asia)에서 1987~1988 DST와 UTC+9를 확인했다.
- 연주=입춘, 월주=12절, 일주=00:00 전환, 시주=당일 일간(23시에도 midnight 관법). 경도/균시차 보정 없음. 시각 미상은 hour=null, 오행 합계 6. 시각 있음은 합계 8.
- 절입 전후 2분(양 끝 포함)은 확정을 거절한다. 시각 미상이면 그 날짜 전체와 이 불확실 구간이 겹치는 경우 거절한다. 자정 관법을 명시해 시간 미상의 일주를 23시 전환 관법과 혼동하지 않도록 경고한다.

## 독립 검증 자료

- [KASI 2024 달력자료](https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024): 음력 초하루·일진과 24절기. 페이지는 공식 발표 이전 달력자료라는 주의사항이 있어 공식 월력요항 인증으로 표현하지 않는다.
- [KASI 2023 달력자료](https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2023), [2025 달력자료](https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2025): 윤2월/윤6월과 달 길이.
- [NAOJ 독립 24절기 계산표](https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/cande/phenomena_sy_en.cgi?year=1989): UT+9, 서머타임 없음. (c) NAOJ. [재사용 조건](https://eco.mtk.nao.ac.jp/koyomi/site/index.html.en)은 출처 표기와 재사용을 허용한다.
- [KASI 월별음양력 표본](https://astro.kasi.re.kr/kor/life/pageView/5?search_year=1989&search_month=01&search_check=G&search_dp=1): 1989~2026년 매년 1월, 추가 13개월(1997-02, 2012-04/05, 2017-06/07, 2020-05/06, 2023-03/04, 2024-02, 2025-07/08, 2026-10). 실제 표에서 총 1,572행의 양력·음력·윤달·일진을 추출했다. 양방향 변환과 일진이 모두 일치했다. 음력 월건을 사주 월주로 혼용하지 않는다.
- `naoj-fixtures.json`은 38년 × 24절기 = 912개를 NAOJ 공개 표에서 수집했다. 엔진과 차이의 최댓값은 1분이다. 모든 시각이 일치한다고 주장하지 않으며 ±2분 확정 거절을 적용했다.
- `collect-*-fixtures.mjs`는 엔진을 import하지 않고 공개 HTML의 수치만 추출하는 개발용 재현 도구이다. fixture에는 출처 URL과 수집일을 보존한다. 앱에서는 collector/fixture를 import하지 않는다. 테스트 실행 중 네트워크를 사용하지 않는다.
- 독립 명식 근거: [한국가톨릭대사전 ‘사주’](https://encyclopedia.catholic.or.kr/entry/2945)의 음력 1993-01-10 임신 연주, 갑·기년 인월=병인 및 갑·기일 자시=갑자 규칙. 이 자료의 일주 23시 전환 관법은 우리 midnight 관법과 다르므로 23시 fixture의 정답으로 사용하지 않는다. 2024-02-10 00:30의 갑진·병인·갑진·갑자는 KASI 일진/달력과 이 규칙을 결합해 도출했다.
- 추가 명식 사례: [신녀사주 원작성 예제](https://sinnyeosaju.kr/guide/saju-order)의 2026-07-29 10:00 병오·을미·갑진·기사. 동일 엔진 사용 여부는 확인되지 않아 이 사례만을 독립성의 근거로 삼지 않는다. 독립 천문/달력 자료 대조가 주 검증이다.

## 실제 변경 파일

- `src/lib/saju.ts`: 계약 어댑터, Zod 출생입력 검증, 범위/미래/윤달/절입 모호성 거절, 시간 미상 처리, 오행 집계, 한국어 계산 관례·한계.
- `src/lib/saju-engine/collect-naoj-fixtures.mjs`, `collect-kasi-fixtures.mjs`, `naoj-fixtures.json`, `kasi-fixtures.json`: 독립 수치 fixture와 재수집 도구.
- `src/lib/saju-engine/THIRD_PARTY_NOTICES.md`: MIT 고지 및 자료 출처.
- `tests/unit/saju-engine.test.ts`, `tests/unit/saju-engine-failure.test.ts`: 독립 자료, 전체 명식 사례, 12절 전후, 입춘 연주, 23시/00시, 시간 미상, 음력 작은달·없는 윤달, 지원범위, 미래 입력, 오류/비전송 검증.
- `package.json`, `package-lock.json`: `manseryeok: 2.0.0`만 추가. 설치시 기존 ESLint 10과 Next 관련 플러그인의 peer 경고가 있었으며 다른 의존성 업그레이드는 하지 않았다.
- 이 문서. 공통 계약/화면/기획 원본은 수정하지 않았다.

## 검증 및 남은 한계

- 최종 실행: `npx vitest run tests/unit/saju-engine.test.ts tests/unit/saju-engine-failure.test.ts` **2개 파일, 133개 테스트 통과**(740ms). 첫 실행 131개에 경계 양끝과 chunk 로드 오류 2개를 추가했다.
- 최종 담당 파일 lint: `npx eslint src/lib/saju.ts src/lib/saju-engine/collect-naoj-fixtures.mjs src/lib/saju-engine/collect-kasi-fixtures.mjs tests/unit/saju-engine.test.ts tests/unit/saju-engine-failure.test.ts` **통과**.
- 라이브러리의 공식 인증이나 모든 날짜 전수 검증을 주장하지 않는다. 음력/일진은 51개월의 표본 검증이며, 절기는 지원 범위의 24절기 전수 대조이다. 전체 사주 관법·진태양시·해석의 정확성은 별개이다.
- 1989 이전/2026 이후/타 시간대/경도 보정 미지원. 연도 범위는 현재 연도에 따라 자동 확장되지 않는다. 새로운 연도는 독립 fixture를 추가한 후 명시적으로 버전을 올려야 한다.
- 공유용으로 명식/원본 생일을 내보내지 않는다. 실제 화면 연결·번들 동작·전체 typecheck/build/E2E는 총괄에게 남긴다. 이 세션은 전체 실행·서버 기동을 하지 않았다.
- 총괄 참고: 1990 등 지원범위 안의 일반 날짜는 실제 ready가 가능하다. 없는 윤달은 error, 1988 출생·다른 시간대·절입 모호성은 unsupported, 날짜 없음은 missing이다. UI에서 메시지를 그대로 안내하면 된다.
