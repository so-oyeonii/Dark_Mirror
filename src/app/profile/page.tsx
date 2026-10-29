import type { Metadata } from "next";
import { SajuProfile } from "@/components/saju-profile";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = { title: "사주·MBTI 프로필", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return <div className="page-stack narrow-page"><PageIntro title="나를 읽는 또 하나의 이야기" description="입력한 출생정보와 선택한 MBTI를 가볍게 살펴봐요. 관계 성향 테스트와는 별개의, 재미와 성찰을 위한 이야기예요." /><SajuProfile /></div>;
}
