import { Clock3 } from "lucide-react";
import { ButtonLink, Card, Notice, PageIntro } from "@/components/ui";

export function ComingSoon({
  title,
  description,
  details,
}: {
  title: string;
  description: string;
  details: string[];
}) {
  return (
    <div className="page-stack narrow-page">
      <PageIntro eyebrow="준비 중" title={title} description={description} />
      <Card className="coming-soon-card">
        <Clock3 size={30} strokeWidth={1.4} aria-hidden="true" />
        <h2>아직 시작할 수 없어요</h2>
        <p className="muted">현재는 프로필 입력과 15문항 관계 성향 테스트를 이용할 수 있어요. 이 기능은 다음 단계에서 제공됩니다.</p>
        <ul className="feature-list">
          {details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
        <div className="actions">
          <ButtonLink href="/test">관계 성향 테스트 하기</ButtonLink>
          <ButtonLink href="/" variant="secondary">홈으로</ButtonLink>
        </div>
      </Card>
      <Notice>사주·MBTI는 재미로 보는 이야기이며, 관계 성향 콘텐츠는 임상적으로 검증된 심리검사나 진단 도구가 아닙니다.</Notice>
    </div>
  );
}
