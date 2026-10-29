"use client";
import { useState } from "react";
import { useGuest } from "./guest-provider";
import { useAssessment } from "./assessment-provider";
import { useSimulation } from "./simulation-provider";
import { useMatch } from "./match-provider";
import { GUEST_KEY } from "@/lib/guest";
import { ASSESSMENT_KEY } from "@/lib/assessment-store";
import { SIMULATION_KEY } from "@/lib/simulation-store";
import { Button, Card, Notice } from "./ui";

export function ClearLocalData() {
  const guest = useGuest(); const assessment = useAssessment(); const simulation = useSimulation(); const match = useMatch();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  function clear() {
    guest.clear(); assessment.clear(); simulation.clear(); match.clear(); setConfirm(false);
    let verified = false;
    try { verified = [GUEST_KEY, ASSESSMENT_KEY, SIMULATION_KEY].every(key => window.sessionStorage.getItem(key) === null); } catch { /* Cannot confirm inaccessible storage. */ }
    setMessage(verified ? "이 탭의 프로필·검사·대화와 궁합 예시 기록을 모두 지웠어요." : "현재 화면의 기록은 지웠지만 브라우저 저장소의 삭제 여부를 확인하지 못했어요. 이 탭을 닫고 브라우저 설정에서 이 사이트 데이터를 삭제해 주세요.");
  }
  return <Card className="section-stack"><h2>이 탭의 기록 모두 지우기</h2><p className="muted">임시 프로필, 원본 검사 답변과 결과, 대화 내용, 궁합 예시를 함께 지워요. 서버 계정은 아직 연결되지 않아 계정 탈퇴 기능은 제공하지 않아요.</p><p className="field-hint">다른 탭의 기록과 이미 내려받은 PNG 파일은 지워지지 않아요. 공용 기기에서는 각각 삭제해 주세요.</p>
    {message && <Notice role="status">{message}</Notice>}
    {confirm ? <div className="section-stack" role="group" aria-label="모든 로컬 기록 삭제 확인"><p>진행 중인 검사와 대화도 삭제되며 되돌릴 수 없어요.</p><div className="actions"><Button variant="secondary" onClick={() => setConfirm(false)}>삭제 취소</Button><Button variant="danger" onClick={clear}>확인하고 모든 로컬 기록 삭제</Button></div></div> : <div><Button variant="danger" onClick={() => setConfirm(true)}>모든 로컬 기록 삭제</Button></div>}
  </Card>;
}
