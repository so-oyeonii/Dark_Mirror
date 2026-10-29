import type { Metadata } from "next";
import { TestResult } from "@/components/test-result";

export const metadata: Metadata = { title: "나의 관계 성향 결과" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TestResult id={id} />;
}
