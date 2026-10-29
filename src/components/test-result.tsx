"use client";

import { useAssessment } from "@/components/assessment-provider";
import { ButtonLink, Card, Notice, PageIntro } from "@/components/ui";
import { DIMENSIONS, scoreAnswers } from "@/lib/assessment";
import { ShareCard } from "./share-card";

export function TestResult({ id }: { id: string }) {
  const assessment = useAssessment();
  if (!assessment.ready) return <p role="status">이 탭의 검사 결과를 확인하고 있어요.</p>;
  const attempt = assessment.history.find((item) => item.id === id);

  if (!attempt) return (
    <div className="page-stack narrow-page">
      <PageIntro title="이 결과를 찾을 수 없어요" description="기록이 만료되었거나 삭제됐을 수 있어요. 임시 기록이 없는 탭이나 기기에서는 이 결과를 열 수 없어요." />
      <Notice>개인 결과는 공개 링크가 아니에요. 이 주소를 공유해도 다른 사람은 내 답변이나 결과를 볼 수 없어요.</Notice>
      <div className="actions"><ButtonLink href="/test">관계 성향 테스트 하기</ButtonLink><ButtonLink href="/me" variant="secondary">내 검사 기록</ButtonLink></div>
    </div>
  );

  const scores = scoreAnswers(attempt.answers);
  const completedLabel = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(attempt.completedAt ?? attempt.updatedAt);

  return (
    <div className="page-stack narrow-page">
      <PageIntro eyebrow="나의 관계 성향" title="지금의 답변에 비친 나" description="한 번의 답이 나를 단정하지 않아요. 관계와 상황에 따라 달라지는 반응을 천천히 살펴보세요." />
      <div className="result-metadata"><span>{completedLabel} 완료 · 한국 시간</span><span>15문항 응답</span><span>로컬 임시 결과</span></div>
      <Notice title="검증된 심리검사나 진단 결과가 아니에요">
        수치는 이번 답변에서 각 성향이 나타난 정도를 0~100으로 표현한 참고값이에요. 확률이나 백분위가 아니며, 총점이나 우열을 매기지 않아요.
      </Notice>
      {assessment.notice && <Notice role="status">{assessment.notice}</Notice>}
      <Card className="section-stack">
        <h2>다섯 가지 성향을 따로 살펴봐요</h2>
        <ul className="dimension-list" aria-label="5가지 관계 성향 결과">
          {DIMENSIONS.map((dimension) => (
            <li className="dimension-item" key={dimension.id}>
              <div className="dimension-heading"><h3>{dimension.label}</h3><span className="dimension-value">{scores[dimension.id].toFixed(1)}<small>/ 100</small></span></div>
              <div className="dimension-track" aria-hidden="true"><span className="dimension-fill" style={{ width: `${scores[dimension.id]}%` }} /></div>
              <div className="dimension-scale" aria-hidden="true"><span>0 · 이 경향이 덜 나타남</span><span>100 · 이 경향이 더 나타남</span></div>
              <p className="dimension-description">{dimension.meaning}</p>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="section-stack">
        <h2>나에게 건네는 질문</h2>
        <p className="muted">마음에 남는 질문 하나만 골라도 좋아요. 여기에는 답을 입력하거나 저장하지 않아요.</p>
        <ul className="reflection-list">{DIMENSIONS.map((dimension) => <li key={dimension.id}>{dimension.reflection}</li>)}</ul>
      </Card>
      <Notice title="사주·MBTI와는 별개인 결과예요">사주와 MBTI는 재미로 살펴보는 이야기이며, 이 점수 계산에 사용되지 않았어요. 홈의 사주·MBTI 프로필 보기에서 별도로 살펴볼 수 있어요. 실제 AI·계정 연결은 준비 중이에요.</Notice>
      <ShareCard key={attempt.id} scores={scores} />
      <p className="test-local-note">{assessment.mode === "memory" ? "브라우저 저장이 제한되어 현재 화면에서만 유지돼요. 새로고침하면 결과를 잃을 수 있어요." : "이 탭에 보관된 임시 기록이에요. 검사 시작 후 24시간이 지나면 만료되며, 마이 화면에서 언제든 지울 수 있어요."} 계정에 저장되지는 않아요. 탭 복원·복제 시 기록이 남을 수 있어 공용 기기에서는 검사 기록을 삭제해 주세요.</p>
      <div className="actions"><ButtonLink href="/test">{assessment.active ? "진행 중인 검사 이어서 하기" : "다시 검사하기"}</ButtonLink><ButtonLink href="/me" variant="secondary">내 검사 기록</ButtonLink></div>
      <p className="field-hint">문항 버전 {attempt.questionVersion} · 채점 버전 {attempt.scoringVersion}</p>
    </div>
  );
}
