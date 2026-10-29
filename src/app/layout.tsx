import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { GuestProvider } from "@/components/guest-provider";
import { AssessmentProvider } from "@/components/assessment-provider";
import { SimulationProvider } from "@/components/simulation-provider";
import { MatchProvider } from "@/components/match-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DARK MIRROR | 관계 속 나를 돌아보는 시간", template: "%s | DARK MIRROR" },
  description: "15개 질문으로 관계 속 나의 반응을 돌아보는 자기성찰 공간. 로그인 없이 검사와 결과를 확인하는 로컬 데모입니다.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#182d43" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><GuestProvider><AssessmentProvider><SimulationProvider><MatchProvider><AppShell>{children}</AppShell></MatchProvider></SimulationProvider></AssessmentProvider></GuestProvider></body></html>;
}
