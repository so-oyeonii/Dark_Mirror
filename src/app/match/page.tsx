import type { Metadata } from "next";
import { MatchExperience } from "@/components/match-experience";

export const metadata: Metadata = { title: "둘의 관계 이야기" };

export default function MatchPage() {
  return <MatchExperience />;
}
