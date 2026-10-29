"use client";

import { useEffect, useState } from "react";
import { calculateSaju } from "@/lib/saju";
import type { GuestRecord } from "@/lib/guest";
import type { Profile } from "@/lib/profile";
import type { SajuResult } from "@/lib/saju-contract";
import { ELEMENTS, ELEMENT_NOTE, MBTI_REFLECTIONS, NARRATIVE_NOTE, elementSummary } from "@/lib/saju-interpretation";
import { useGuest } from "./guest-provider";
import { SajuShareCard } from "./saju-share-card";
import { Button, ButtonLink, Card, Notice } from "./ui";

function MbtiReflection({ mbti }: { mbti: Profile["mbti"] }) {
  return <Card className="section-stack">
    <h2>{mbti ? `${mbti} · 나에게 건네는 질문` : "MBTI는 선택해도, 비워 두어도 괜찮아요"}</h2>
    {mbti ? <p className="saju-reflection">{MBTI_REFLECTIONS[mbti]}</p> : <p className="muted">선택한 MBTI가 없어요. 프로필에서 유형을 선택하면 그 유형에 맞춰 준비한 질문 한 가지를 볼 수 있어요.</p>}
    <p className="field-hint">스스로 선택한 유형에 따른 고정 성찰 문구예요. 실제 성격을 판정하지 않으며 모든 사람에게 들어맞지는 않아요. 관계 성향 테스트 점수와는 별개예요.</p>
  </Card>;
}

function CalculatedProfile({ record }: { record: GuestRecord }) {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    const isCurrent = () => current && Date.now() < record.expiresAt;
    void (async () => {
      try {
        const next = await calculateSaju(record.profile);
        if (isCurrent()) setResult(next);
      } catch {
        if (isCurrent()) setResult({ status: "error", message: "계산을 마치지 못했어요. 잠시 뒤 다시 시도하거나 입력한 정보를 확인해 주세요." });
      }
    })();
    return () => { current = false; };
  }, [record, attempt]);

  const ready = result?.status === "ready" ? result : null;
  return <>
    <Card className="section-stack saju-result">
      <div className="section-stack"><span className="badge">이 탭에서 계산 · 서버 저장 없음</span><h2>나의 명식과 오행</h2></div>
      {!result && <p role="status">출생정보의 지원 범위와 계산 결과를 확인하고 있어요.</p>}
      {result && result.status !== "ready" && <>
        <Notice title={result.status === "missing" ? "출생정보를 입력하면 살펴볼 수 있어요" : result.status === "unsupported" ? "이 입력은 아직 계산할 수 없어요" : "계산을 마치지 못했어요"} role={result.status === "error" ? "alert" : "status"}>{result.message}</Notice>
        <div className="actions"><ButtonLink href="/onboarding" variant="secondary">프로필 입력·수정</ButtonLink>{result.status === "error" && <Button variant="secondary" onClick={() => { setResult(null); setAttempt(value => value + 1); }}>계산 다시 시도</Button>}</div>
      </>}
      {ready && <>
        <div className="saju-pillars-wrap"><table className="saju-pillars">
          <caption>입력한 출생정보의 명식</caption>
          <thead><tr><th scope="col">구분</th><th scope="col">년주</th><th scope="col">월주</th><th scope="col">일주</th><th scope="col">시주</th></tr></thead>
          <tbody>{([['stem', '천간'], ['branch', '지지']] as const).map(([part, label]) => <tr key={part}><th scope="row">{label}</th>{(["year", "month", "day", "hour"] as const).map(key => <td key={key}>{ready.pillars[key]?.[part] ?? "미상"}</td>)}</tr>)}</tbody>
        </table></div>
        {!ready.pillars.hour && <Notice title="출생시간 미상 · 시주 제외">출생시간이 없어 년·월·일주만 표시해요. 시주 두 글자가 빠진 6글자 집계이므로 전체 명식의 오행 개수와 다를 수 있어요.</Notice>}
        <section className="section-stack" aria-labelledby="saju-elements-title"><h3 id="saju-elements-title">오행 글자 개수</h3>
          <dl className="saju-element-counts">{ELEMENTS.map(({ id, label, color }) => <div key={id}><dt style={{ color }}>{label}</dt><dd>{ready.elements[id]}<small>개</small></dd></div>)}</dl>
          <p className="field-hint">{ELEMENT_NOTE}</p>
          <p>{elementSummary(ready.elements)}</p>
        </section>
        {ready.warnings.length > 0 && <Notice title="계산의 한계"><ul className="feature-list">{ready.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></Notice>}
        <details><summary>계산 기준과 엔진 확인하기</summary><div className="section-stack"><p className="field-hint">{ready.engine.name} · {ready.engine.version}</p><ul className="feature-list">{ready.conventions.map((item, index) => <li key={index}>{item}</li>)}</ul></div></details>
      </>}
    </Card>
    <MbtiReflection mbti={record.profile.mbti} />
    <Notice title="이야기와 점수는 따로 읽어요">{NARRATIVE_NOTE} 사주·MBTI는 관계 성향 테스트의 점수에 반영하지 않아요.</Notice>
    {ready && <SajuShareCard elements={ready.elements} timeKnown={ready.pillars.hour !== null} mbti={record.profile.mbti} expiresAt={record.expiresAt} />}
  </>;
}

export function SajuProfile() {
  const guest = useGuest();
  if (!guest.ready) return <p role="status">이 탭의 임시 프로필을 확인하고 있어요.</p>;
  return <div className="section-stack">
    {guest.notice && <Notice role="status">{guest.notice}</Notice>}
    {guest.record ? <>
      <div className="actions"><ButtonLink href="/onboarding" variant="secondary">프로필 수정</ButtonLink><ButtonLink href="/me" variant="ghost">임시 정보 관리</ButtonLink></div>
      <p className="field-hint">게스트 프로필 · {guest.mode === "memory" ? "현재 화면에서만 유지" : "이 탭에 임시 저장"} · 저장 후 24시간이 지나거나 초기화하면 이 결과도 사라져요.</p>
      {/* Remount calculation and consent even when a replacement produces identical safe data. This key is never rendered into the DOM. */}
      <CalculatedProfile key={JSON.stringify(guest.record)} record={guest.record} />
    </> : <Card className="section-stack"><h2>살펴볼 임시 프로필이 없어요</h2><p className="muted">아직 입력하지 않았거나, 프로필이 만료·초기화되었어요. MBTI와 출생정보는 원하는 항목만 입력해도 괜찮아요.</p><div className="actions"><ButtonLink href="/onboarding">프로필 입력하기</ButtonLink><ButtonLink href="/test" variant="secondary">검사 바로 시작하기</ButtonLink></div></Card>}
  </div>;
}
