import type { Metadata } from "next";
import { ButtonLink, Card, Notice, PageIntro } from "@/components/ui";
import { getSupabasePublicConfig } from "@/lib/env";

export const metadata: Metadata = { title: "계정 연결 안내" };
export default function AuthPage() {
  const configured = !!getSupabasePublicConfig();
  return <section className="page-stack narrow-page">
    <PageIntro title="계정 연결은 준비 중이에요" description="지금은 로그인 없이 프로필을 만들고 관계 성향 테스트를 해볼 수 있어요." />
    <Notice title="로컬 데모 · 인증 미연결" tone="warning">이메일을 수집하거나 인증 메일을 보내지 않아요. 로그인·계정 저장·기기 간 동기화는 아직 사용할 수 없어요.</Notice>
    <Card className="section-stack"><h2>이메일로 간편하게 시작할 예정이에요</h2><p className="muted">인증 연결이 준비되면 이메일의 로그인 링크를 통해 계정을 만들 수 있어요. 게스트 정보를 옮길 때는 별도로 동의를 받을 거예요.</p><div className="actions"><ButtonLink href="/onboarding">게스트로 계속하기</ButtonLink><ButtonLink href="/me" variant="secondary">마이로 돌아가기</ButtonLink></div></Card>
    <details><summary>개발 연동 상태</summary><p className="field-hint">{configured ? "Supabase 공개 설정값이 감지됐지만 실제 연결은 검증되지 않았어요. 인증 및 DB 접근은 아직 활성화되지 않았어요." : "사용 가능한 Supabase 공개 설정이 없어 로컬 데모로 실행 중이에요."} 실제 연동 전에 인증 콜백·세션 갱신·소유권 및 RLS 검증을 완료해야 해요.</p></details>
  </section>;
}
