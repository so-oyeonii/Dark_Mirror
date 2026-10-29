"use client";

import { Button, ButtonLink, PageIntro } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="page-stack"><PageIntro title="화면을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요. 입력 내용은 외부로 전송되지 않습니다." /><div className="actions"><Button onClick={reset}>다시 시도</Button><ButtonLink href="/" variant="secondary">홈으로</ButtonLink></div></section>;
}
