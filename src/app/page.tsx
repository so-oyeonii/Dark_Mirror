import Link from "next/link";
import { ArrowUpRight, Fingerprint, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";
import { ButtonLink, Notice } from "@/components/ui";

const experiences = [
  { href: "/test", icon: Fingerprint, title: "나의 반응 돌아보기", description: "15개의 질문으로 관계 속 나의 선택을 살펴봐요.", label: "관계 성향 테스트", available: true },
  { href: "/simulation", icon: MessageCircle, title: "내 마음을 말하는 연습", description: "가상의 대화에서 감정과 경계를 표현해 봐요. 고정 응답으로 진행하는 연습이에요.", label: "대화 연습 데모", available: true },
  { href: "/match", icon: UsersRound, title: "서로의 차이 이해하기", description: "가상의 A와 B로 서로 동의한 정보만 나누는 과정을 살펴봐요.", label: "둘의 관계 예시", available: true },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="hero-kicker">관계 속의 나를 비추는 작은 거울</p>
          <h1 id="hero-title">내가 몰랐던 나를,<br />조금 더 가까이.</h1>
          <p className="hero-description">어떤 말에 마음이 움직이고,<br className="mobile-break" /> 어떤 순간에 나를 지키고 싶었나요?<br />정답 대신, 나를 알아가는 질문에서 시작해요.</p>
          <div className="actions hero-actions">
            <ButtonLink href="/onboarding">프로필 시작하기</ButtonLink>
            <ButtonLink href="/test" variant="ghost">검사 바로 시작하기</ButtonLink>
          </div>
          <p className="hero-note">로그인 없이 시작 · MBTI와 출생정보는 선택</p>
          <Link href="/profile" className="text-link">사주·MBTI 프로필 보기</Link>
        </div>
        <div className="mirror-scene" aria-hidden="true">
          <div className="mirror-frame"><div className="mirror-surface"><span className="mirror-line mirror-line--one" /><span className="mirror-line mirror-line--two" /><span className="mirror-orbit" /></div></div>
          <span className="mirror-caption">지금의 나를, 있는 그대로</span>
        </div>
      </section>

      <Notice title="로그인 없이, 이 브라우저에서 먼저 시작해요" className="home-notice">
        15문항 검사, 고정 응답 대화 연습, 가상 두 사람의 궁합 예시와 PNG 저장을 이용할 수 있어요. 답변과 대화는 서버로 전송되지 않아요. 실제 AI·상대방 초대·계정 저장은 아직 연결되지 않았어요.
      </Notice>

      <section id="experiences" className="experience-section" aria-labelledby="experience-title">
        <div className="section-heading">
          <h2 id="experience-title">나를 이해하는 세 가지 경험</h2>
          <p>관계 성향 테스트와 두 가지 로컬 예시를 만나보세요.</p>
        </div>
        <div className="experience-grid">
          {experiences.map(({ href, icon: Icon, title, description, label, available }) => (
            <Link href={href} className="experience-link" key={href}>
              <div className="experience-top"><Icon size={27} strokeWidth={1.4} aria-hidden="true" /><span className="badge">{available ? "로컬 체험 가능" : "준비 중"}</span></div>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="experience-bottom">{label}<ArrowUpRight size={18} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="privacy-section" aria-labelledby="privacy-title">
        <ShieldCheck size={27} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h2 id="privacy-title">내 이야기를 어디까지 나눌지는, 내가 정해요.</h2>
          <p>출생정보는 입력하지 않아도 괜찮아요. 임시 프로필은 이 브라우저에 보관되며, 마이 화면에서 지울 수 있어요. 계정으로 옮길 때는 먼저 확인을 받아요.</p>
          <Link className="text-link" href="/me">내 임시 정보 확인하기</Link>
        </div>
      </section>
    </div>
  );
}
