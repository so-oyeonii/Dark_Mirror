"use client";

import Link from "next/link";
import { useState } from "react";
import { useSimulation } from "./simulation-provider";
import { Button, Card } from "./ui";
import { SCENARIOS } from "@/lib/simulation";

export function SimulationHistory() {
  const store = useSimulation();
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!store.ready) return <p role="status">체험 기록을 확인하고 있어요.</p>;
  const formatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });
  return <Card className="section-stack"><h2>내 로컬 체험 기록</h2><p className="field-hint">진행 중인 체험과 최근 종료한 20개를 보관해요. 시작 후 24시간이면 만료되고 계정에 저장되지 않아요.</p>
    {!store.sessions.length ? <p className="muted">아직 체험 기록이 없어요.</p> : <ul className="history-list">{store.sessions.map(session => <li key={session.id}><div className="history-row"><Link className="history-link" href={`/simulation/${session.id}${session.status === "active" ? "" : "/result"}`}><strong>{SCENARIOS.find(item => item.id === session.scenarioId)?.title}</strong><span>{formatter.format(session.createdAt)} · {session.status === "active" ? "진행 중" : session.status === "completed" ? "완료" : session.status === "safety" ? "안전 지원" : "중단"}</span></Link><Button variant="ghost" onClick={() => setConfirm(session.id)} aria-label={`${SCENARIOS.find(item => item.id === session.scenarioId)?.title} 대화 기록 삭제`}>삭제</Button></div>{confirm === session.id && <div className="inline-confirmation" role="group" aria-label="대화 삭제 확인"><p>원문 대화와 체험 기록을 함께 지울까요? 되돌릴 수 없어요.</p><div className="actions"><Button variant="secondary" onClick={() => setConfirm(null)}>취소</Button><Button variant="danger" onClick={() => { store.remove(session.id); setConfirm(null); }}>이 대화 삭제</Button></div></div>}</li>)}</ul>}
    {!!store.sessions.length && (confirm === "all" ? <div className="inline-confirmation" role="group" aria-label="전체 대화 삭제 확인"><p>진행 중인 체험을 포함해 모든 원문 대화와 체험 기록을 삭제할까요?</p><div className="actions"><Button variant="secondary" onClick={() => setConfirm(null)}>취소</Button><Button variant="danger" onClick={() => { store.clear(); setConfirm(null); }}>모든 대화 삭제</Button></div></div> : <div><Button variant="danger" onClick={() => setConfirm("all")}>대화 기록 전체 삭제</Button></div>)}
  </Card>;
}
