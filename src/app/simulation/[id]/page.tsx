import type { Metadata } from "next";
import { SimulationExperience } from "@/components/simulation-experience";
export const metadata: Metadata = { title: "가상 대화 연습" };
export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SimulationExperience id={id} />;
}
