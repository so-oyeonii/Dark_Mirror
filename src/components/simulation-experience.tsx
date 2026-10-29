"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSimulation } from "./simulation-provider";
import { Button, ButtonLink, Card, Notice, PageIntro } from "./ui";
import { getSuggestedReplies, MAX_SIMULATION_TURNS, SCENARIOS, type ScenarioId, type SimulationTurnRequest } from "@/lib/simulation";
import { SimulationHistory } from "./simulation-history";
import { SimulationResult, SafetySupport } from "./simulation-result";

export function SimulationExperience({ id }: { id?: string }) {
  const store = useSimulation();
  const router = useRouter();
  const [scenarioId, setScenarioId] = useState<ScenarioId>("LOVE");
  const [consent, setConsent] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pendingRequest = useRef<SimulationTurnRequest | null>(null);
  if (!store.ready) return <p role="status">로컬 대화 기록을 확인하고 있어요.</p>;
  const session = id ? store.sessions.find(item => item.id === id) : undefined;
  const scenario = SCENARIOS.find(item => item.id === (session?.scenarioId ?? scenarioId))!;

  function send(reply: string, choiceId?: "a" | "b" | "c") {
    if (!session) return;
    const previous = pendingRequest.current;
    const request = previous && previous.text === reply.trim() && previous.choiceId === choiceId && previous.expectedTurn === session.turns.length + 1
      ? previous : { requestId: crypto.randomUUID(), expectedTurn: session.turns.length + 1, text: reply.trim(), ...(choiceId ? { choiceId } : {}) };
    pendingRequest.current = request;
    const result = store.submit(session.id, request);
    if (!result.ok) { setError(result.message); return; }
    pendingRequest.current = null;
    setText(""); setError(null);
    if (result.session.status !== "active") router.push(`/simulation/${session.id}/result`);
  }

  function stop(safety: boolean) {
    if (session && store.stop(session.id, safety)) router.push(`/simulation/${session.id}/result`);
  }

  if (id && !session) return <div className="page-stack narrow-page"><PageIntro title="이 대화 기록을 찾을 수 없어요" description="기록이 만료되었거나 삭제됐을 수 있어요. 임시 기록이 없는 탭이나 기기에서는 열 수 없어요." /><ButtonLink href="/simulation">새 체험 살펴보기</ButtonLink></div>;
  if (session && session.status !== "active") return <SimulationResult id={session.id} />;

  return <div className="page-stack narrow-page">
    {session ? <header className="test-compact-intro"><h1>{scenario.title}</h1><p>로컬 고정응답 데모 · 실제 AI와 연결되지 않아요.</p></header> : <PageIntro eyebrow="AI 체험 · 로컬 데모" title="마음을 말하는 짧은 연습" description="연애, 우정, 직장 속 가상의 대화를 최대 5번 연습해 보세요. 답변을 외부로 보내지 않는 고정응답 데모예요." />}
    {store.notice && <Notice role="status">{store.notice}</Notice>}
    {!session ? <>
      <Notice title="시작하기 전에 알아두세요">상대가 내 기억을 부정하거나 부탁을 압박하는 가상의 갈등 대사가 포함돼요. 불편하다면 시작하지 않아도 괜찮고, 언제든 중단할 수 있어요. 위협이나 모욕의 강도를 높이지 않아요.</Notice>
      {store.active ? <Card className="section-stack"><h2>진행 중인 체험이 있어요</h2><p className="muted">기존 체험을 이어가거나 중단한 뒤 다른 상황을 시작할 수 있어요.</p><div><ButtonLink href={`/simulation/${store.active.id}`}>체험 이어서 하기</ButtonLink></div></Card> : <Card className="section-stack">
        <fieldset><legend>연습할 상황</legend><div className="answer-options">{SCENARIOS.map(item => <label className="answer-option" key={item.id}><input type="radio" name="scenario" value={item.id} checked={scenarioId === item.id} onChange={() => { setScenarioId(item.id); setConsent(false); }} /><span>{item.title}</span></label>)}</div></fieldset>
        <p className="field-hint">{scenario.learningObjective}</p>
        <label className="checkbox-row"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />가상의 갈등 대사와 중단 방법을 확인했어요.</label>
        <div><Button disabled={!consent} onClick={() => { const nextId = store.start(scenarioId, consent); if (nextId) router.push(`/simulation/${nextId}`); else setError("진행 중인 체험이나 선택한 상황을 확인해 주세요."); }}>동의하고 데모 시작</Button></div>
        {error && <p role="alert" className="field-error">{error}</p>}
      </Card>}
      <SafetySupport compact />
      <SimulationHistory />
    </> : <>
      <div className="simulation-safety-controls" aria-label="체험 중단 방법"><Button variant="secondary" onClick={() => stop(false)}>체험 중단</Button><Button variant="secondary" onClick={() => stop(true)}>안전 지원으로 전환</Button></div>
      <p className="field-hint">위험·중단 표현 자동 감지는 놓칠 수 있어요. 불편하거나 도움이 필요하면 위 버튼으로 바로 역할극을 끝내세요.</p>
      <div className="test-progress-caption"><span>내 답변 {session.turns.length} / {MAX_SIMULATION_TURNS}</span><span className="badge">고정 대사</span></div>
      <ol className="simulation-conversation" aria-label="가상의 대화 기록">
        <li className="simulation-bubble"><span className="simulation-speaker">가상 상대 · 시작 대사</span><p>{scenario.opening}</p></li>
        {session.turns.map(turn => <li key={turn.requestId} className="simulation-turn"><div className="simulation-bubble simulation-bubble--user"><span className="simulation-speaker">내 답변 {turn.expectedTurn}</span><p>{turn.text}</p></div><div className="simulation-bubble"><span className="simulation-speaker">가상 상대 · 고정 대사</span><p>{turn.output.characterMessage}</p></div></li>)}
      </ol>
      <Card className="section-stack simulation-composer">
        <h2>어떻게 말해볼까요?</h2>
        <div className="simulation-choices">{getSuggestedReplies().map(reply => <Button key={reply.id} variant="secondary" onClick={() => send(reply.label, reply.id)}>{reply.label}</Button>)}</div>
        <form className="section-stack" onSubmit={event => { event.preventDefault(); send(text); }}>
          <div className="field"><label htmlFor="simulation-reply">직접 답하기 (선택)</label><textarea id="simulation-reply" value={text} maxLength={500} rows={3} onChange={event => { setText(event.target.value); pendingRequest.current = null; }} aria-describedby="simulation-input-hint" placeholder="실명이나 연락처 등 개인정보는 적지 마세요." /><p id="simulation-input-hint" className="field-hint">{text.length} / 500자 · 자유 입력의 뜻을 AI로 분석하지 않아요.</p></div>
          {error && <p role="alert" className="field-error">{error}</p>}
          <div><Button type="submit" disabled={text.trim().length === 0}>답변 보내기</Button></div>
        </form>
      </Card>
    </>}
    <p className="test-local-note">대화는 시작 후 24시간 동안 이 탭에 임시 보관돼요. 탭 복원·복제 시 남을 수 있으니 공용 기기에서는 기록을 삭제해 주세요. 원문 대화는 공유 기능에 포함되지 않아요.</p>
  </div>;
}
