import type { Metadata } from "next";
import { SimulationExperience } from "@/components/simulation-experience";

export const metadata: Metadata = { title: "AI 대화 체험" };

export default function SimulationPage() {
  return <SimulationExperience />;
}
