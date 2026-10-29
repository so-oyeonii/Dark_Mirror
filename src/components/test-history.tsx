"use client";

import Link from "next/link";
import { useState } from "react";
import { useAssessment } from "@/components/assessment-provider";
import { Button, ButtonLink, Card, Notice } from "@/components/ui";

export function TestHistory() {
  const assessment = useAssessment();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!assessment.ready) return <p role="status">임시 검사 기록을 확인하고 있어요.</p>;
  const dateFormatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

  return (
    <Card className="section-stack">
      <h2>내 검사 기록</h2>
      <p className="field-hint">최근 완료한 검사 최대 20개를 이 탭에서 확인할 수 있어요. 각 기록은 검사를 시작한 때부터 24시간 뒤 만료돼요. 프로필을 지워도 검사 기록은 따로 유지됩니다. 탭 복원·복제 시 기록이 남을 수 있어 공용 기기에서는 검사 기록을 삭제해 주세요.</p>
      {assessment.mode === "memory" && <Notice tone="warning">브라우저에 저장할 수 없어 현재 화면에서만 기록을 유지하고 있어요. 새로고침하면 사라질 수 있어요.</Notice>}
      {assessment.notice && <Notice role="status">{assessment.notice}</Notice>}
      {assessment.active && <Notice title="이어서 답할 질문이 있어요"><p>진행 중인 답변을 불러와 계속할 수 있어요.</p><ButtonLink href="/test" variant="ghost">검사 이어서 하기</ButtonLink></Notice>}
      {assessment.history.length === 0 ? (
        <div className="section-stack"><p className="muted">아직 완료한 검사 기록이 없어요. 지금의 나를 돌아보는 질문부터 시작해 보세요.</p><div><ButtonLink href="/test">관계 성향 테스트 하기</ButtonLink></div></div>
      ) : (
        <ul className="history-list">
          {assessment.history.slice(0, 20).map((attempt) => (
            <li key={attempt.id}>
              <div className="history-row">
                <Link className="history-link" href={`/result/${encodeURIComponent(attempt.id)}`}><strong>{dateFormatter.format(attempt.completedAt ?? attempt.updatedAt)}</strong><span>15문항 완료 · {attempt.questionVersion} · 결과 보기</span></Link>
                <Button variant="ghost" aria-label={`${dateFormatter.format(attempt.completedAt ?? attempt.updatedAt)} 검사 기록 삭제`} onClick={() => { setDeleteId(attempt.id); setConfirmClear(false); }}>삭제</Button>
              </div>
              {deleteId === attempt.id && <div className="inline-confirmation" role="group" aria-label="검사 기록 삭제 확인"><h3>이 검사 기록을 지울까요?</h3><p>답변과 결과가 함께 삭제되며 되돌릴 수 없어요.</p><div className="actions"><Button variant="secondary" onClick={() => setDeleteId(null)}>취소</Button><Button variant="danger" onClick={() => { assessment.remove(attempt.id); setDeleteId(null); }}>이 기록 삭제</Button></div></div>}
            </li>
          ))}
        </ul>
      )}
      {assessment.attempts.length > 0 && (confirmClear ? (
        <div className="inline-confirmation" role="group" aria-labelledby="clear-assessments-title"><h3 id="clear-assessments-title">모든 검사 기록을 지울까요?</h3><p>진행 중인 답변과 완료한 검사 결과가 모두 삭제됩니다. 임시 프로필은 유지돼요.</p><div className="actions"><Button variant="secondary" onClick={() => setConfirmClear(false)}>취소</Button><Button variant="danger" onClick={() => { assessment.clear(); setConfirmClear(false); }}>모든 검사 기록 삭제</Button></div></div>
      ) : <div><Button variant="danger" onClick={() => { setConfirmClear(true); setDeleteId(null); }}>검사 기록 전체 삭제</Button></div>)}
    </Card>
  );
}
