import { MatchExperience } from "@/components/match-experience";
export default async function MatchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MatchExperience id={id} />;
}
