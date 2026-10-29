"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, House, ListChecks, MessagesSquare, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "홈", icon: House },
  { href: "/test", label: "테스트", icon: ListChecks },
  { href: "/simulation", label: "AI 체험", icon: MessagesSquare },
  { href: "/match", label: "궁합", icon: UsersRound },
  { href: "/me", label: "마이", icon: CircleUserRound },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="DARK MIRROR 홈">
          <span className="brand-symbol" aria-hidden="true" />
          <span>DARK MIRROR</span>
        </Link>
        <span className="preview-label">개발 미리보기</span>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <p>나를 단정 짓지 않고, 천천히 알아가는 시간.</p>
        <p>의학적 진단이나 심리검사를 대신하지 않습니다.</p>
      </footer>
      <nav className="bottom-nav" aria-label="주 메뉴">
        <div className="bottom-nav-inner">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/test" && pathname.startsWith("/result/"));
            return (
              <Link key={href} href={href} className="nav-item" aria-current={active ? "page" : undefined}>
                <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
