"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { acceptInvitation, consentToFields, createInvitation, revokePair, SAMPLE_A, SAMPLE_B, type Pair, type SharedField } from "@/lib/match";

function useMatchStore() {
  const [pair, setPair] = useState<Pair | null>(null);
  const token = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const generation = useRef(0);
  const [notice, setNotice] = useState("");
  const [expired, setExpired] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  useEffect(() => {
    if (!pair) return;
    const expire = () => { const time = Date.now(); setCheckedAt(time); if (time >= pair.expiresAt) { setExpired(true); token.current = null; } };
    const timer = window.setTimeout(expire, Math.max(0, pair.expiresAt - Date.now()));
    window.addEventListener("focus", expire);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", expire); };
  }, [pair]);
  async function start() {
    if (locked.current) return;
    locked.current = true; setBusy(true); const current = ++generation.current;
    try {
      const next = await createInvitation(SAMPLE_A, Date.now());
      if (current !== generation.current) return;
      token.current = next.token; setPair(next.pair); setCheckedAt(Date.now()); setExpired(false); setNotice("가상 A의 초대가 준비됐어요. 실제 초대 링크는 생성하지 않아요.");
    } catch { setNotice("이 브라우저에서 안전한 초대값을 만들 수 없어요. localhost 또는 HTTPS에서 다시 시도해 주세요."); }
    finally { locked.current = false; setBusy(false); }
  }
  async function accept() {
    if (locked.current || !pair || !token.current) return;
    locked.current = true; setBusy(true); const current = generation.current;
    try {
      const next = await acceptInvitation(pair, token.current, SAMPLE_B, Date.now());
      if (current !== generation.current) return;
      if (next && next.expiresAt > Date.now()) { setPair(next); setCheckedAt(Date.now()); token.current = null; setNotice("가상 B가 참여했어요. 이제 각자의 공유 항목을 확인하세요."); }
      else setNotice("초대가 만료되었거나 이미 사용됐어요.");
    } catch { setNotice("초대를 확인하지 못했어요. 다시 시작해 주세요."); }
    finally { locked.current = false; setBusy(false); }
  }
  function consent(userId: string, fields: SharedField[]) {
    if (!pair || busy) return;
    const next = consentToFields(pair, userId, fields, Date.now());
    if (next) { setPair(next); setCheckedAt(Date.now()); setNotice("선택한 가상 인물의 동의 항목을 반영했어요."); }
    else setNotice("항목을 하나 이상 선택하고, 초대가 만료되지 않았는지 확인해 주세요.");
  }
  function revoke(userId: string) { if (pair) { const next = revokePair(pair, userId); if (next) { generation.current++; token.current = null; setPair(next); setNotice("동의를 철회해 예시 결과를 닫았어요. 다시 보려면 새 체험을 시작하세요."); } } }
  function clear() { generation.current++; token.current = null; setPair(null); setExpired(false); setNotice("궁합 예시 기록을 지웠어요."); }
  return { pair, busy, notice, expired, checkedAt, start, accept, consent, revoke, clear };
}
const MatchContext = createContext<ReturnType<typeof useMatchStore> | null>(null);
export function MatchProvider({ children }: { children: React.ReactNode }) { const value = useMatchStore(); return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>; }
export function useMatch() { const value = useContext(MatchContext); if (!value) throw new Error("MatchProvider required"); return value; }
