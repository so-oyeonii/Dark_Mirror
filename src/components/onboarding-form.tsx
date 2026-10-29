"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useGuest } from "./guest-provider";
import { Button, Card, Notice } from "./ui";
import { EMPTY_PROFILE, MBTI_TYPES, profileIssues, profileSchema, type Profile } from "@/lib/profile";

export function OnboardingForm() {
  const guest = useGuest();
  if (!guest.ready) return <p role="status">임시 프로필을 확인하고 있어요.</p>;
  return <ProfileForm key={guest.record?.createdAt ?? "empty"} initial={guest.record?.profile ?? EMPTY_PROFILE} />;
}

function ProfileForm({ initial }: { initial: Profile }) {
  const [profile, setProfile] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const guest = useGuest();
  const router = useRouter();
  function update<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile(current => ({ ...current, [field]: value, ...(field === "calendar" && value === "solar" ? { isLeapMonth: false } : {}) }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = profileSchema.safeParse(profile);
    if (!result.success) {
      const nextErrors = profileIssues(result.error);
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    guest.save(result.data);
    router.push("/test");
  }
  function skip() { guest.save({ ...EMPTY_PROFILE }); router.push("/test"); }
  const error = (key: keyof Profile) => errors[key] && <p id={`${key}-error`} className="field-error">{errors[key]}</p>;
  const invalid = (key: keyof Profile) => ({ "aria-invalid": !!errors[key], "aria-describedby": errors[key] ? `${key}-error` : undefined });

  return <form ref={formRef} onSubmit={submit} noValidate className="form-stack">
    <Notice title="모든 정보는 선택 사항이에요">
      <p>입력 내용은 서버로 보내지 않고 이 탭에 임시로 저장해요. 저장 후 24시간이 지나면 만료되며, 마이에서 바로 지울 수 있어요. 브라우저의 탭 복원 기능으로 남을 수 있으니 공용 기기에서는 초기화해 주세요.</p>
    </Notice>
    {guest.notice && <Notice role="status" tone="warning">{guest.notice}</Notice>}
    {Object.keys(errors).length > 0 && <p role="alert" className="field-error">입력 내용을 확인해 주세요. 오류가 있는 첫 항목으로 이동했어요.</p>}
    <Card className="form-stack">
      <h2>어떻게 불러드릴까요?</h2>
      <div className="field">
        <label htmlFor="nickname">닉네임 (선택)</label>
        <input id="nickname" name="nickname" autoComplete="off" maxLength={20} value={profile.nickname} onChange={e => update("nickname", e.target.value)} placeholder="2~20자, 비워도 괜찮아요" {...invalid("nickname")} />
        {error("nickname")}
      </div>
      <div className="field">
        <label htmlFor="mbti">MBTI (선택)</label>
        <select id="mbti" name="mbti" value={profile.mbti} onChange={e => update("mbti", e.target.value as Profile["mbti"])} {...invalid("mbti")}>
          <option value="">모르겠어요 / 입력하지 않기</option>
          {MBTI_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <p className="field-hint">MBTI는 재미로 살펴보는 이야기이며 관계 성향 점수에 반영되지 않아요.</p>
        {error("mbti")}
      </div>
    </Card>
    <Card className="form-stack">
      <div className="section-stack"><h2>출생정보는 나중에 알려줘도 돼요</h2><p className="field-hint">저장 후 홈이나 마이의 사주·MBTI 프로필 보기에서 명식과 오행을 살펴볼 수 있어요. 현재 계산 범위는 1989~2026년, 한국 시간대예요. 계산은 이 브라우저에서만 하며 출생정보를 서버로 보내지 않아요.</p></div>
      <div className="field">
        <label htmlFor="calendar">달력 종류</label>
        <select id="calendar" name="calendar" value={profile.calendar} onChange={e => update("calendar", e.target.value as Profile["calendar"])}>
          <option value="solar">양력</option><option value="lunar">음력</option>
        </select>
      </div>
      <fieldset aria-describedby={errors.birthYear ? "birthYear-error" : "birth-hint"}>
        <legend>생년월일 (선택)</legend>
        <div className="grid grid-cols-3 gap-3">
          {([{ key: "birthYear", label: "태어난 연도", hint: "예: 1995", length: 4 }, { key: "birthMonth", label: "태어난 월", hint: "월", length: 2 }, { key: "birthDay", label: "태어난 일", hint: "일", length: 2 }] as const).map(({ key, label, hint, length }) => <div key={key} className="field">
            <label htmlFor={key}>{label}</label><input id={key} name={key} type="text" inputMode="numeric" maxLength={length} autoComplete="off" value={profile[key]} onChange={e => update(key, e.target.value)} placeholder={hint} {...invalid("birthYear")} />
          </div>)}
        </div>
        <p id="birth-hint" className="field-hint">입력한다면 연·월·일을 모두 적어 주세요.</p>
        {error("birthYear")}
      </fieldset>
      {profile.calendar === "lunar" && <>
        <label className="checkbox-row"><input name="isLeapMonth" type="checkbox" checked={profile.isLeapMonth} onChange={e => update("isLeapMonth", e.target.checked)} {...invalid("isLeapMonth")} />음력 윤달에 태어났어요</label>
        {error("isLeapMonth")}
        <Notice title="음력 날짜 검증 대기" tone="warning">이 입력 화면에서는 숫자 범위만 확인해요. 사주·MBTI 프로필 보기에서 지원 범위에 한해 실제 음력 날짜·윤달을 확인하고 양력으로 변환해 계산해요. 존재하지 않거나 지원하지 않는 날짜는 결과 대신 안내를 보여줘요.</Notice>
      </>}
      <div className="form-grid">
        <div className="field"><label htmlFor="birthTime">출생시간 (선택)</label><input id="birthTime" name="birthTime" type="time" value={profile.birthTime} onChange={e => update("birthTime", e.target.value)} {...invalid("birthTime")} /><p className="field-hint">모르면 비워 두세요. 시간 미상으로 처리해요.</p>{error("birthTime")}</div>
        <div className="field"><label htmlFor="timezone">출생 시간대</label><input id="timezone" name="timezone" value={profile.timezone} onChange={e => update("timezone", e.target.value)} placeholder="Asia/Seoul" {...invalid("timezone")} /><p className="field-hint">현재 사주 계산은 한국(Asia/Seoul)만 지원해요. 다른 시간대도 입력할 수 있지만 계산 결과는 제공하지 않아요.</p>{error("timezone")}</div>
      </div>
    </Card>
    <div className="actions"><Button type="submit">임시 프로필 저장</Button><Button variant="ghost" onClick={skip}>입력 없이 건너뛰기</Button></div>
    <p className="field-hint">건너뛰면 기존 임시 프로필도 익명으로 바뀌어요. 로그인이나 계정 저장은 진행되지 않아요.</p>
  </form>;
}
