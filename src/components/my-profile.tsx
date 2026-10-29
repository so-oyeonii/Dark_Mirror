"use client";

import { useGuest } from "./guest-provider";
import { Button, ButtonLink, Card, Notice } from "./ui";
import { TestHistory } from "./test-history";
import { SimulationHistory } from "./simulation-history";
import { ClearLocalData } from "./clear-local-data";

export function MyProfile() {
  const guest = useGuest();
  if (!guest.ready) return <p role="status">임시 프로필을 확인하고 있어요.</p>;
  const profile = guest.record?.profile;
  return <div className="section-stack">
    {guest.notice && <Notice role="status">{guest.notice}</Notice>}
    <Card className="section-stack">
      <span className="badge">게스트 · {guest.mode === "memory" ? "현재 화면에서만 유지" : "이 탭에 임시 저장"}</span>
      <h2>{profile?.nickname ? `${profile.nickname}님의 공간` : "익명 게스트님의 공간"}</h2>
      <p className="muted">{profile ? "나를 소개한 정보가 준비됐어요. 아직 계정에 저장된 정보는 아니에요." : "저장된 임시 프로필이 없어요. 원할 때 가볍게 시작해 보세요."}</p>
      {profile && <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="field-hint">MBTI</dt><dd className="m-0">{profile.mbti || "입력하지 않음"}</dd></div>
        <div><dt className="field-hint">출생정보</dt><dd className="m-0">{profile.birthYear ? `${profile.calendar === "solar" ? "양력" : "음력"} 정보 입력됨${profile.isLeapMonth ? " · 윤달 선택" : ""}` : "입력하지 않음"}</dd></div>
        <div><dt className="field-hint">출생시간</dt><dd className="m-0">{profile.birthTime ? "입력됨" : "시간 미상 · 시주 계산 제외"}</dd></div>
        <div><dt className="field-hint">사주</dt><dd className="m-0">{profile.birthYear ? "프로필 보기에서 계산 확인" : "계산 준비 중"}</dd></div>
      </dl>}
      {profile?.calendar === "lunar" && profile.birthYear && <p className="field-hint">음력 날짜 검증 대기: 사주·MBTI 프로필 보기에서 날짜와 윤달의 지원 여부를 확인해 주세요.</p>}
      <div><ButtonLink href="/profile" variant="secondary">사주·MBTI 프로필 보기</ButtonLink></div>
      <div className="actions"><ButtonLink href="/onboarding" variant="secondary">{profile ? "프로필 수정" : "프로필 만들기"}</ButtonLink>{profile && <Button variant="danger" onClick={guest.clear}>임시 프로필 초기화</Button>}</div>
      <p className="field-hint">임시 프로필은 저장 후 24시간 동안 유지돼요. 탭을 닫으면 일반적으로 정리되지만 브라우저 복원 기능으로 남을 수 있어요. 공용 기기에서는 초기화해 주세요.</p>
    </Card>
    <TestHistory />
    <SimulationHistory />
    <ClearLocalData />
    <Card className="section-stack"><h2>계정에 이어서 담기</h2><p className="muted">로그인과 서버 저장은 준비 중이에요. 앞으로 계정에 옮길 때도 먼저 확인을 받을 거예요.</p><div><ButtonLink href="/auth" variant="secondary">계정 연결 안내</ButtonLink></div></Card>
  </div>;
}
