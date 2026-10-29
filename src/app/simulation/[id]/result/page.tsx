import type { Metadata } from "next";
import { SimulationResult } from "@/components/simulation-result";
export const metadata: Metadata = { title: "가상 대화 돌아보기" };
export default async function SimulationResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SimulationResult id={id} />;
}
