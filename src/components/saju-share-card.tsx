"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/profile";
import type { FiveElement } from "@/lib/saju-contract";
import { buildSajuCardPayload, renderSajuCardBlob } from "@/lib/saju-card";
import { ELEMENTS, MBTI_REFLECTIONS } from "@/lib/saju-interpretation";
import { CARD_SIZES, cardSizeSchema, type CardSize } from "@/lib/share-card";
import { Button, Card, Notice } from "./ui";

export function SajuShareCard({ elements, timeKnown, mbti, expiresAt }: {
  elements: Record<FiveElement, number>; timeKnown: boolean; mbti: Profile["mbti"]; expiresAt: number;
}) {
  const [size, setSize] = useState<CardSize>("square");
  const [consent, setConsent] = useState(false);
  const [includeMbti, setIncludeMbti] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lifecycle = useRef({ mounted: false, generation: 0, busy: false });

  useLayoutEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    const invalidate = () => { state.generation += 1; };
    window.addEventListener("pagehide", invalidate);
    return () => {
      state.mounted = false; invalidate();
      window.removeEventListener("pagehide", invalidate);
    };
  }, [elements, timeKnown, mbti, expiresAt]);

  async function download() {
    const state = lifecycle.current;
    if (!consent || state.busy || !state.mounted || Date.now() >= expiresAt) return;
    const generation = state.generation;
    const isCurrent = () => state.mounted && state.generation === generation && Date.now() < expiresAt;
    state.busy = true; setBusy(true); setError(null); setMessage(null);
    let url: string | null = null;
    let link: HTMLAnchorElement | null = null;
    try {
      const payload = buildSajuCardPayload({ elements, basis: timeKnown ? "four-pillars" : "three-pillars", ...(includeMbti && mbti ? { mbti } : {}) });
      const blob = await renderSajuCardBlob(payload, size);
      if (!isCurrent()) return;
      url = URL.createObjectURL(blob);
      link = document.createElement("a");
      link.href = url;
      link.download = `dark-mirror-saju-${CARD_SIZES[size].width}x${CARD_SIZES[size].height}.png`;
      document.body.appendChild(link); link.click();
      setMessage("PNG 파일을 만들고 다운로드를 요청했어요. 브라우저의 다운로드 목록에서 확인해 주세요.");
    } catch {
      if (isCurrent()) setError("이미지를 만들지 못했어요. 브라우저의 다운로드 설정을 확인하고 다시 시도해 주세요.");
    } finally {
      link?.remove(); if (url) URL.revokeObjectURL(url);
      state.busy = false;
      if (state.mounted) setBusy(false);
    }
  }

  return <Card className="section-stack saju-share-card">
    <h2>오행 이야기를 이미지로 담기</h2>
    <p className="muted">오행 개수와 안내 문구만 담아요. MBTI 질문은 아래에서 따로 선택할 수 있어요. 닉네임·생일·출생시간·명식·원본 답변·대화는 넣지 않아요.</p>
    <section className="share-card-preview saju-card-preview" aria-label="사주 카드 내용 미리보기">
      <p className="share-card-brand">DARK MIRROR</p>
      <h3>나를 읽는 또 하나의 이야기</h3>
      <p className="field-hint">{timeKnown ? "년·월·일·시주 · 8글자 기준" : "출생시간 미상 · 시주 제외 · 6글자 기준"}</p>
      <dl className="saju-element-counts">{ELEMENTS.map(({ id, label, color }) => <div key={id}><dt style={{ color }}>{label}</dt><dd>{elements[id]}<small>개</small></dd></div>)}</dl>
      <p className="share-card-disclaimer">천간과 지지의 대표 오행만 집계해요. 강약이나 길흉, 운세 확률이 아닙니다.</p>
      {includeMbti && mbti ? <div className="section-stack"><h3>{mbti} · 나에게 건네는 질문</h3><p>{MBTI_REFLECTIONS[mbti]}</p></div> : <p>오늘의 나를 한 가지 유형으로 정하지 않아요.</p>}
      <p className="share-card-disclaimer">사주·MBTI는 재미와 성찰을 위한 이야기입니다. 제한된 고정 문구 · AI 생성 아님 · 진단·미래 예측 아님</p>
      <p className="field-hint">DARK MIRROR · 로컬 프로필 · 관계 테스트 점수와 별개</p>
    </section>
    <p className="field-hint">미리보기와 PNG의 배치는 달라요. 내용은 선택한 항목만 담아요.</p>
    {mbti && <label className="checkbox-row"><input type="checkbox" checked={includeMbti} disabled={busy} onChange={event => { setIncludeMbti(event.target.checked); setConsent(false); setMessage(null); }} />선택한 MBTI({mbti})와 성찰 질문도 담을게요.</label>}
    <div className="field"><label htmlFor="saju-card-size">사주 카드 이미지 크기</label><select id="saju-card-size" value={size} disabled={busy} onChange={event => { setSize(cardSizeSchema.parse(event.target.value)); setMessage(null); }}>{Object.entries(CARD_SIZES).map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</select></div>
    <label className="checkbox-row share-card-consent"><input type="checkbox" checked={consent} onChange={event => {
      setConsent(event.target.checked); setMessage(null);
      if (!event.target.checked) lifecycle.current.generation += 1;
    }} />미리본 오행 요약과 선택한 항목을 이미지로 저장할게요.</label>
    <Notice>공개 링크는 만들지 않아요. 저장하거나 전달한 파일은 프로필을 지워도 회수할 수 없어요. 공용 기기에서는 다운로드한 파일도 직접 지워 주세요.</Notice>
    {error && <p role="alert" className="field-error">{error}</p>}
    {message && <p role="status" className="field-hint">{message}</p>}
    <div><Button disabled={!consent || busy} onClick={download}>{busy ? "이미지 만드는 중…" : "사주 PNG 이미지 저장"}</Button></div>
  </Card>;
}
