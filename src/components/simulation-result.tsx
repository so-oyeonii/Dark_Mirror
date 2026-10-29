"use client";

import { useSimulation } from "./simulation-provider";
import { ButtonLink, Card, Notice, PageIntro } from "./ui";
import { SCENARIOS, simulationFeedback } from "@/lib/simulation";

export function SafetySupport({ compact = false }: { compact?: boolean }) {
  return <Notice title={compact ? "실제 상황에서 도움이 필요하다면" : "역할극을 끝냈어요. 지금의 안전을 먼저 살펴주세요."} tone={compact ? "info" : "warning"}>
    <p>지금 답을 이어가거나 상황을 설명할 필요는 없어요. 위험하다고 느낀다면 가능할 때 안전한 장소로 이동하고, 믿을 수 있는 사람이나 가까운 응급 지원에 도움을 요청해 주세요. 혼자 감당하지 않아도 괜찮아요.</p>
    {!compact && <p className="simulation-support-note">이 화면은 입력을 진단하거나 위험을 정확히 판별한 결과가 아니에요. 자동 감지는 놓치거나 잘못 반응할 수 있어요.</p>}
  </Notice>;
}

export function SimulationResult({ id }: { id: string }) {
  const store = useSimulation();
  if (!store.ready) return <p role="status">로컬 체험 기록을 확인하고 있어요.</p>;
  const session = store.sessions.find(item => item.id === id);
  if (!session) return <div className="page-stack narrow-page"><PageIntro title="이 대화 기록을 찾을 수 없어요" description="기록이 만료되거나 삭제됐을 수 있어요. 임시 기록이 없는 탭이나 기기에서는 열 수 없어요." /><ButtonLink href="/simulation">체험 목록으로</ButtonLink></div>;
  if (session.status === "active") return <div className="page-stack narrow-page"><PageIntro title="아직 진행 중인 체험이에요" description="대화를 이어가거나 중단한 뒤 돌아볼 수 있어요." /><ButtonLink href={`/simulation/${id}`}>체험 이어서 하기</ButtonLink></div>;
  const feedback = simulationFeedback(session);
  const scenario = SCENARIOS.find(item => item.id === session.scenarioId)!;
  return <div className="page-stack narrow-page">
    <PageIntro eyebrow={`${scenario.title} · 로컬 고정응답 데모`} title={session.status === "completed" ? "짧은 연습을 마쳤어요" : "체험을 여기서 멈췄어요"} description="멈추는 것도 내가 선택할 수 있는 방법이에요. 한 번의 대화가 나나 실제 상대를 설명하지 않아요." />
    {session.status === "safety" && <SafetySupport />}
    {store.notice && <Notice role="status">{store.notice}</Notice>}
    <Card className="section-stack"><h2>이번 체험에서 확인한 것</h2><p>{feedback.observedPattern}</p><p className="muted">{feedback.responseReflection}</p><span className="badge">{session.status === "completed" ? "5턴 완료" : session.status === "safety" ? "안전 지원으로 전환" : "중단"}</span></Card>
    {session.status !== "safety" && <><Card className="section-stack"><h2>다음에 시도할 수 있는 표현</h2><blockquote className="simulation-alternative">{feedback.alternativeResponse}</blockquote><p className="field-hint">답변 내용과 무관하게 보여주는 일반적인 예시예요.</p></Card><Card className="section-stack"><h2>천천히 돌아볼 질문</h2><ul className="reflection-list">{feedback.reflectionQuestions.map(question => <li key={question}>{question}</li>)}</ul></Card></>}
    <Notice>{feedback.disclaimer} 실제 AI 분석, 성격 판단, 위험 점수는 제공하지 않아요.</Notice>
    <p className="test-local-note">{store.mode === "memory" ? "현재 화면에서만 기록을 유지하며 새로고침하면 사라질 수 있어요." : "체험 시작부터 24시간 뒤 만료되는 로컬 임시 기록이에요."} 탭 복원·복제 시 기록이 남을 수 있어 공용 기기에서는 대화 기록을 삭제해 주세요. 원문 대화는 공유하지 않아요.</p>
    <div className="actions"><ButtonLink href="/simulation">체험과 기록 보기</ButtonLink><ButtonLink href="/" variant="secondary">홈으로</ButtonLink></div>
    <p className="field-hint">시나리오 {session.scenarioVersion} · 고정응답 {session.promptVersion}</p>
  </div>;
}
