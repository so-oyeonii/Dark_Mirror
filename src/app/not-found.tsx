import { ButtonLink, PageIntro } from "@/components/ui";

export default function NotFound() {
  return <section className="page-stack"><PageIntro title="이 페이지는 찾을 수 없어요" description="주소를 확인하거나 홈에서 다시 시작해 주세요." /><ButtonLink href="/">홈으로</ButtonLink></section>;
}
