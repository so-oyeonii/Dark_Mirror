import type { Metadata } from "next";
import { OnboardingForm } from "@/components/onboarding-form";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = { title: "내 프로필" };
export default function OnboardingPage() {
  return <section className="page-stack narrow-page"><PageIntro title="나를 소개하는 작은 시작" description="알려주고 싶은 만큼만 적어 주세요. 아무것도 입력하지 않고 둘러봐도 괜찮아요." /><OnboardingForm /></section>;
}
