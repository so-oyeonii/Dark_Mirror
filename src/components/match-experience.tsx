"use client";
import { useState } from "react";
import { useMatch } from "./match-provider";
import { Button, ButtonLink, Card, Notice, PageIntro } from "./ui";
import { buildMatchReport, SAMPLE_A, SAMPLE_B, SAMPLE_PROFILES, type SharedField } from "@/lib/match";

function ConsentForm({ userId, name }: { userId: string; name: string }) {
  const match = useMatch();
  const saved = match.pair?.consents.find(item => item.userId === userId);
  const [fields, setFields] = useState<SharedField[]>(() => saved?.fields ?? []);
  return <Card className="section-stack"><h2>{name}의 공유 선택</h2><p className="muted">가상 인물의 동의 화면을 연습해요. 실제 상대의 동의를 대신 받는 기능이 아니에요.</p>
    <fieldset className="section-stack"><legend className="field-label">{name}가 나눌 예시 정보</legend>{([["behavior", "5개 성향 수치"], ["mbti", "MBTI 유형"]] as const).map(([field, label]) => <label className="checkbox-row" key={field}><input type="checkbox" checked={fields.includes(field)} onChange={e => setFields(e.target.checked ? [...fields, field] : fields.filter(item => item !== field))} />{label}</label>)}</fieldset>
    <p className="field-hint">원본 답변·출생일·대화 내용은 공유할 수 없어요.</p>
    <Button disabled={!fields.length || match.busy} onClick={() => match.consent(userId, fields)}>{name} 동의 반영</Button>
    {saved && <p role="status">반영된 항목: {saved.fields.map(item => item === "behavior" ? "성향 수치" : "MBTI").join(", ")}</p>}
  </Card>;
}

export function MatchExperience({ id }: { id?: string }) {
  const match = useMatch();
  const pair = match.pair;
  if (id && (!pair || pair.id !== id)) return <div className="page-stack narrow-page"><PageIntro title="이 궁합 예시를 찾을 수 없어요" description="예시는 현재 화면의 메모리에만 있어요. 새로고침하거나 기록을 지우면 사라져요. 이 주소는 공유 링크가 아니에요." /><ButtonLink href="/match">새 예시 체험</ButtonLink></div>;
  const available = pair && !match.expired && pair.status !== "revoked";
  const report = available ? buildMatchReport(pair, SAMPLE_A, SAMPLE_PROFILES, match.checkedAt) : null;
  return <div className="page-stack narrow-page">
    <PageIntro eyebrow="둘의 관계 이야기" title="나눌 정보부터 함께 고르기" description="두 사람의 동의가 어떻게 결과로 이어지는지, 가상의 A와 B로 먼저 살펴보세요." />
    <Notice title="가상 두 사람의 로컬 데모">내 프로필이나 실제 상대방 정보를 사용하지 않아요. 한 사람이 A와 B 화면을 모두 체험하는 예시입니다. 실제 초대·로그인·상대 동의 확인은 아직 연결되지 않았어요.</Notice>
    {match.notice && <Notice role="status">{match.notice}</Notice>}
    {!pair && <Card className="section-stack"><h2>동의부터, 차근차근</h2><ol className="reflection-list"><li>가상 A가 초대를 만들어요.</li><li>가상 B가 참여하고 각자 공유 항목을 골라요.</li><li>둘 다 동의한 항목만 비교해요.</li></ol><Button onClick={match.start} disabled={match.busy}>가상 A의 초대 만들기</Button></Card>}
    {pair && <>
      <p className="field-hint">초대 유효기간 72시간 · 사용 후 재참여 불가 · 이 예시는 새로고침 시 초기화돼요.</p>
      {!available ? <Card className="section-stack"><h2>{match.expired ? "초대가 만료됐어요" : "동의를 철회했어요"}</h2><p>결과와 공유 항목을 더 이상 표시하지 않아요.</p><Button onClick={match.start} disabled={match.busy}>새 가상 초대 만들기</Button></Card> : <>
        {pair.status === "pending" && <Card className="section-stack"><h2>가상 B의 참여 화면</h2><p>72시간 안에 한 번만 쓸 수 있는 초대를 확인해요. 실제 전달용 링크는 없어요.</p><Button onClick={match.accept} disabled={match.busy}>가상 B로 초대 수락</Button></Card>}
        <ConsentForm key={`${pair.id}-a`} userId={SAMPLE_A} name="가상 A" />
        {pair.inviteeId && <ConsentForm key={`${pair.id}-b`} userId={SAMPLE_B} name="가상 B" />}
        {report ? <Card className="section-stack" aria-label="가상 관계 결과"><h2>서로 다른 반응, 대화의 출발점</h2><p>{report.disclaimer}</p>
          {!!report.behavior.length && <div className="section-stack"><h3>성향을 나란히 살펴보기</h3><p className="field-hint">0~100의 개별 참고값이며 확률·백분위·종합 궁합 점수가 아니에요.</p>{report.behavior.map(item => <div key={item.dimension} className="match-comparison"><h4>{item.label}</h4><p>가상 A <strong>{item.a}</strong> · 가상 B <strong>{item.b}</strong></p><p className="field-hint">{item.reflection}</p></div>)}</div>}
          {report.mbti && <div><h3>MBTI로 여는 가벼운 이야기</h3><p>{report.mbti.a} · {report.mbti.b}</p><p className="field-hint">{report.mbti.note}</p></div>}
          <h3>함께 해볼 대화</h3><ul className="reflection-list">{report.suggestions.map(text => <li key={text}>{text}</li>)}</ul><p className="field-hint">이 궁합 예시에는 사주를 사용하지 않아요. 내 사주는 홈의 프로필 보기에서 별도로 살펴볼 수 있어요. 성향 수치에는 사주·MBTI를 반영하지 않았어요.</p><ButtonLink variant="secondary" href={`/match/${pair.id}`}>이 탭에서 예시 결과 열기</ButtonLink>
        </Card> : <Notice>두 가상 인물이 같은 항목에 동의하면 예시 결과가 표시돼요.</Notice>}
        <div className="actions"><Button variant="danger" onClick={() => match.revoke(SAMPLE_A)}>가상 A 동의 철회</Button>{pair.inviteeId && <Button variant="danger" onClick={() => match.revoke(SAMPLE_B)}>가상 B 동의 철회</Button>}</div>
      </>}
      <Button variant="secondary" onClick={match.clear}>궁합 예시 기록 삭제</Button>
    </>}
  </div>;
}
