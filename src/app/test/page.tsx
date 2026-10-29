import type { Metadata } from "next";
import { TestExperience } from "@/components/test-experience";

export const metadata: Metadata = { title: "관계 성향 테스트" };

export default function TestPage() {
  return <TestExperience />;
}
