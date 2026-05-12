import type { CSSProperties, ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function SectionCard({
  title,
  description,
  children,
  className = "",
  style,
}: SectionCardProps) {
  return (
    <section
      style={style}
      className={`rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)] backdrop-blur ${className}`}
    >
      <header className="relative z-10 mb-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--accent-strong)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
