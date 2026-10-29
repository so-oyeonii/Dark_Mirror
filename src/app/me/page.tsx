import type { Metadata } from "next";
import { MyProfile } from "@/components/my-profile";
import { PageIntro } from "@/components/ui";

export const metadata: Metadata = { title: "마이" };
export default function MePage() {
  return <section className="page-stack narrow-page"><PageIntro title="천천히 알아가는 나" description="내가 남긴 정보와 앞으로의 기록을 살펴보는 공간이에요." /><MyProfile /></section>;
}
