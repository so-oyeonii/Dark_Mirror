import Link from "next/link";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

function buttonClass(variant: ButtonVariant, className?: string) {
  return ["button", `button--${variant}`, className].filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={["card", className].filter(Boolean).join(" ")} {...props} />;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="page-description">{description}</p>}
      {children}
    </header>
  );
}

export function Notice({
  title,
  children,
  tone = "info",
  className,
  role,
}: {
  title?: string;
  children: ReactNode;
  tone?: "info" | "warning" | "success";
  className?: string;
  role?: HTMLAttributes<HTMLDivElement>["role"];
}) {
  return (
    <div className={["notice", `notice--${tone}`, className].filter(Boolean).join(" ")} role={role}>
      {title && <p className="notice-title">{title}</p>}
      <div className="notice-content">{children}</div>
    </div>
  );
}
