"use client";

import { useEffect, useRef, useState } from "react";
import { DIMENSIONS, type Dimension } from "@/lib/assessment";
import { buildShareCardPayload, CARD_SIZES, cardSizeSchema, renderShareCardBlob, type CardSize } from "@/lib/share-card";
import { Button, Card, Notice } from "./ui";

export function ShareCard({ scores }: { scores: Record<Dimension, number> }) {
  const [size, setSize] = useState<CardSize>("square");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const lifecycle = useRef({ mounted: false, generation: 0 });

  useEffect(() => {
    const current = lifecycle.current;
    current.mounted = true;
    return () => { current.mounted = false; current.generation += 1; };
  }, []);

  async function download() {
    if (!consent || busyRef.current || !lifecycle.current.mounted) return;
    const generation = lifecycle.current.generation;
    const isCurrent = () => lifecycle.current.mounted && lifecycle.current.generation === generation;
    busyRef.current = true;
    setBusy(true); setError(null); setMessage(null);
    let objectUrl: string | null = null;
    let link: HTMLAnchorElement | null = null;
    try {
      const payload = buildShareCardPayload(scores);
      const blob = await renderShareCardBlob(payload, size);
      // A deleted/expired record or navigation unmounts this keyed component.
      // A late canvas callback must not export the former record after that.
      if (!isCurrent()) return;
      objectUrl = URL.createObjectURL(blob);
      link = document.createElement("a");
      link.href = objectUrl;
      link.download = `dark-mirror-profile-${CARD_SIZES[size].width}x${CARD_SIZES[size].height}.png`;
      document.body.appendChild(link);
      link.click();
      setMessage("PNG 파일을 만들고 다운로드를 요청했어요. 브라우저의 다운로드 목록에서 확인해 주세요.");
    } catch {
      if (isCurrent()) setError("이미지를 저장하지 못했어요. 브라우저의 다운로드 설정을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      link?.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      busyRef.current = false;
      if (isCurrent()) setBusy(false);
    }
  }

  return <Card className="section-stack share-card-section">
    <h2>내 성향을 이미지로 담기</h2>
    <p className="muted">다섯 가지 수치와 비진단 안내만 담아요. 닉네임, 생일, 원본 답변, 대화 내용은 들어가지 않아요.</p>
    <section className={`share-card-preview share-card-preview--${size}`} aria-label="저장할 이미지의 내용 미리보기">
      <p className="share-card-brand">DARK MIRROR</p>
      <h3>관계 속 나를 돌아보기</h3>
      <dl className="share-card-scores">{DIMENSIONS.map(dimension => <div key={dimension.id}><dt>{dimension.label}</dt><dd>{scores[dimension.id].toFixed(1)} / 100</dd></div>)}</dl>
      <p className="share-card-disclaimer">검증된 심리검사나 진단 결과가 아닙니다. 수치는 확률·백분위가 아니며, 높고 낮음에 우열이 없습니다.</p>
      <p className="field-hint">출처: DARK MIRROR 15문항 · 로컬 데모</p>
    </section>
    <p className="field-hint">위 내용으로 PNG를 만들어요. 미리보기와 저장 이미지의 배치는 화면 크기에 따라 달라요.</p>
    <div className="field"><label htmlFor="share-card-size">이미지 크기</label><select id="share-card-size" value={size} disabled={busy} onChange={event => { setSize(cardSizeSchema.parse(event.target.value)); setMessage(null); }}>{Object.entries(CARD_SIZES).map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}</select></div>
    <label className="checkbox-row share-card-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => { setConsent(event.target.checked); setMessage(null); }} />내 성향 수치를 이미지 파일로 저장할게요.</label>
    <Notice>다운로드는 공개 URL을 만들지 않아요. 이미 내려받거나 다른 사람에게 전달한 이미지 파일은 기록을 삭제해도 회수할 수 없어요. 공용 기기에서는 다운로드한 파일도 직접 지워 주세요.</Notice>
    {error && <p role="alert" className="field-error">{error}</p>}
    {message && <p role="status" className="field-hint">{message}</p>}
    <div><Button disabled={!consent || busy} onClick={download}>{busy ? "이미지 만드는 중…" : "PNG 이미지 저장"}</Button></div>
  </Card>;
}
