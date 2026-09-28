import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function SlashMark({ className = "" }: { className?: string }) {
  return <span className={`inline-block -skew-x-12 bg-brand ${className}`} aria-hidden="true" />;
}

/** Navy page-top band with a big condensed headline. `color` tints it with a team color. */
export function PageHero({ eyebrow, title, lede, action, color, children }: {
  eyebrow: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      {color && (
        <div
          className="absolute inset-0 transition-[background] duration-700"
          style={{ background: `linear-gradient(100deg, transparent 30%, ${color} 140%)`, opacity: 0.7 }}
        />
      )}
      <div className="stripes absolute inset-0" />
      <Container className="relative pb-8 pt-10 sm:pb-10 sm:pt-14">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SlashMark className="h-4 w-1.5" />
            <span className="font-display text-sm font-bold uppercase tracking-[0.18em] text-white/70">{eyebrow}</span>
          </div>
          {action}
        </div>
        <h1 className="headline mt-3 text-[3.25rem] sm:text-7xl">{title}</h1>
        {lede && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70 sm:text-base">{lede}</p>}
        {children && <div className="mt-7">{children}</div>}
      </Container>
    </section>
  );
}

/** Section title with a heavy rule underneath and an optional "see all" link. */
export function SectionHeader({ title, sub, link }: {
  title: ReactNode;
  sub?: ReactNode;
  link?: { to: string; label: string };
}) {
  return (
    <div className="mb-5">
      <div className="flex items-end justify-between gap-4 border-b-2 border-ink pb-2">
        <h2 className="headline flex items-center gap-2.5 text-[2rem] sm:text-4xl">
          <SlashMark className="h-6 w-2" />
          {title}
        </h2>
        {link && (
          <Link
            to={link.to}
            className="flex shrink-0 items-center font-display text-sm font-bold uppercase tracking-wider text-brand hover:text-brand-dark"
          >
            {link.label} <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {sub && <p className="mt-2 text-sm leading-relaxed text-sub">{sub}</p>}
    </div>
  );
}
