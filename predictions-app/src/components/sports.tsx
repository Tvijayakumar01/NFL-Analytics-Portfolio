import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { pct, team, nickname, formatGameDay } from "../lib/format";
import { inkColor } from "../lib/color";
import type { UpcomingGame } from "../lib/upcomingData";

export function TeamLogo({ code, className = "h-8 w-8" }: { code: string; className?: string }) {
  const logo = team(code).logo;
  return logo ? <img src={logo} alt="" className={`shrink-0 object-contain ${className}`} /> : <span className={`shrink-0 ${className}`} />;
}

const CONF_TONE: Record<string, string> = {
  High: "bg-pos/10 text-pos",
  Medium: "bg-gold/10 text-gold",
  Low: "bg-neg/10 text-neg",
};

export function ConfidenceChip({ level }: { level: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 font-display text-[12px] font-bold uppercase tracking-wider ${CONF_TONE[level] ?? ""}`}>
      {level}
    </span>
  );
}

/** Split bar in both teams' colors; the favored side is full strength. */
export function ProbBar({ home, away, homeProb, favorHome, className = "h-2" }: {
  home: string; away: string; homeProb: number; favorHome: boolean; className?: string;
}) {
  return (
    <div className={`flex w-full gap-0.5 overflow-hidden rounded-full ${className}`}>
      <motion.div
        className="h-full"
        style={{ backgroundColor: inkColor(team(away).color), opacity: favorHome ? 0.35 : 1 }}
        initial={{ width: "50%" }}
        animate={{ width: pct(1 - homeProb) }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="h-full flex-1" style={{ backgroundColor: inkColor(team(home).color), opacity: favorHome ? 1 : 0.35 }} />
    </div>
  );
}

/** Compact matchup card for a pick: away on top, home below, like a scoreboard. */
export function PickCard({ g }: { g: UpcomingGame }) {
  const favorHome = g.pick === g.home;
  const row = (code: string, prob: number, picked: boolean) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo code={code} className="h-8 w-8" />
        <div className="min-w-0">
          <div className={`truncate font-display text-lg font-bold uppercase leading-tight ${picked ? "text-ink" : "text-sub"}`}>{nickname(code)}</div>
        </div>
        {picked && <Check size={15} className="shrink-0 text-pos" strokeWidth={3} />}
      </div>
      <span className={`stat text-2xl ${picked ? "text-ink" : "text-sub/70"}`}>{pct(prob)}</span>
    </div>
  );
  return (
    <Link
      to={`/predictions?game=${g.home}`}
      className="card card-hover flex w-[272px] shrink-0 snap-start flex-col gap-3 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow text-[12px]">{formatGameDay(g.gameday, g.gametime)}</span>
        <ConfidenceChip level={g.confidence} />
      </div>
      {row(g.away, g.prob.away, !favorHome)}
      {row(g.home, g.prob.home, favorHome)}
      <ProbBar home={g.home} away={g.away} homeProb={g.prob.home} favorHome={favorHome} />
    </Link>
  );
}

export function CountdownBlocks({ r, dark = false }: { r: { d: number; h: number; m: number; s: number }; dark?: boolean }) {
  const units: [number, string][] = [[r.d, "Days"], [r.h, "Hrs"], [r.m, "Min"], [r.s, "Sec"]];
  // Kickoff has passed but the data refresh hasn't posted a final yet.
  if (r.d + r.h + r.m + r.s === 0) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-bold uppercase tracking-wider ${dark ? "bg-white/10 text-white" : "bg-page text-ink"}`}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> Kicked off · awaiting final
      </span>
    );
  }
  return (
    <div className="flex gap-2">
      {units.map(([v, l]) => (
        <div key={l} className={`flex w-16 flex-col items-center rounded-lg py-2 ${dark ? "bg-white/10" : "bg-page"}`}>
          <span className={`stat text-3xl ${dark ? "text-white" : "text-ink"}`}>{String(v).padStart(2, "0")}</span>
          <span className={`font-display text-[11px] font-bold uppercase tracking-wider ${dark ? "text-white/50" : "text-sub"}`}>{l}</span>
        </div>
      ))}
    </div>
  );
}
