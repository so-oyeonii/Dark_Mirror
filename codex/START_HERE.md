# Codex에서 첫 실행

압축을 푼 프로젝트 폴더를 Codex에서 연 다음, 아래 프롬프트를 그대로 복사해 첫 메시지로 보내세요. 실행할 때 Codex가 작업 디렉터리를 **이 폴더**로 사용하도록 설정하세요.

## 첫 프롬프트

```text
이 폴더는 DARK MIRROR라는 신규 웹앱 프로젝트의 사양/프롬프트/DB 설계 패키지야. 먼저 AGENTS.md와 product/PRD.md, product/FEATURE_SPEC.md, architecture/ARCHITECTURE.md, architecture/SCHEMA.md, tests/ACCEPTANCE.md, codex/tasks/01-foundation.md를 순서대로 읽어줘.

이후 Phase 1(기반 구축)을 실제로 구현해줘. 기존 문서/초안 파일은 유지하고, Next.js App Router + TypeScript + Tailwind 프로젝트를 현재 루트에 안전하게 생성해. 한국어 모바일 우선 UI, 공통 레이아웃/5개 탭, 랜딩, 온보딩, 로그인 및 마이페이지의 뼈대, 환경변수 예시, 타입/입력 검증, 기본 테스트를 만들어줘. 인증 연동은 Supabase 설정이 없을 경우 실제 구현과 데모를 명확히 분리하고 키를 꾸미지 마. 가능하면 의존성 설치와 lint/typecheck/test/build까지 직접 실행해 오류를 수정해줘.

완료 후 변경 파일 목록, 로컬 실행 방법, 테스트 결과, 실제 작동 범위, 남은 설정값/미구현 사항을 요약해줘. Phase 2 이후 기능을 완료한 것으로 표시하지 마.
```

## 이어지는 작업
1. Phase 1 결과를 직접 실행/확인.
2. `codex/tasks/02-test.md` 내용을 읽고 구현하도록 지시.
3. 이후 `03-ai-simulation.md`, `04-compatibility.md`, `05-share-launch.md` 순서.
4. 매 단계 구현 후 브라우저에서 기능 확인, 오류 수정, 다음 단계 진행.
