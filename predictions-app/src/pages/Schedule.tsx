import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSchedule, type ScheduleGame } from "../lib/scheduleData";
import { TEAM_INFO } from "../lib/teams";
import Reveal, { SectionLabel, SectionTitle } from "../components/Reveal";

function AmbientBackground({ color }: { color: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <motion.div
        className="absolute -left-32 -top-32 h-[560px] w-[560px] rounded-full blur-[110px]"
        animate={{ backgroundColor: color, x: [0, 30, -20, 0], y: [0, -20, 20, 0] }}
        transition={{ backgroundColor: { duration: 0.8 }, x: { duration: 24, repeat: Infinity, ease: "easeInOut" }, y: { duration: 28, repeat: Infinity, ease: "easeInOut" } }}
        style={{ opacity: 0.35 }}
      />
      <motion.div
        className="absolute -right-32 bottom-[-100px] h-[500px] w-[500px] rounded-full bg-pos blur-[110px]"
        animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }}
        transition={{ x: { duration: 22, repeat: Infinity, ease: "easeInOut" }, y: { duration: 26, repeat: Infinity, ease: "easeInOut" } }}
        style={{ opacity: 0.25 }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 60%, #0a0a0d 100%)" }} />
    </div>
  );
}

function useCountdown(target: Date | null) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) return setRemaining({ d: 0, h: 0, m: 0, s: 0 });
      setRemaining({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 overflow-hidden rounded-xl border border-line bg-white/[0.03] py-3 text-center sm:w-20">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-3xl font-extrabold text-white sm:text-4xl"
          >
            {String(value).padStart(2, "0")}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted">{label}</div>
    </div>
  );
}

function TeamBadge({ team, name }: { team: { logo: string; color: string }; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 sm:h-20 sm:w-20"
        style={{ borderColor: team.color, boxShadow: `0 0 22px -4px ${team.color}` }}
      >
        <img src={team.logo} alt="" className="h-10 w-10 object-contain sm:h-12 sm:w-12" />
      </div>
      <span className="max-w-[110px] text-center text-sm font-bold text-white sm:max-w-none sm:text-base">{name}</span>
    </div>
  );
}

function NextGameCard({ game }: { game: ScheduleGame }) {
  const target = game.gameday ? new Date(`${game.gameday}T${game.gametime ?? "13:00"}:00`) : null;
  const remaining = useCountdown(target);
  const home = TEAM_INFO[game.home] ?? { name: game.home, logo: "", color: "#2ecc71" };
  const away = TEAM_INFO[game.away] ?? { name: game.away, logo: "", color: "#3b82f6" };
  const dateLabel = game.gameday
    ? new Date(game.gameday + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "TBD";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-panel p-8 sm:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{ background: `linear-gradient(90deg, ${away.color}22 0%, transparent 40%, transparent 60%, ${home.color}22 100%)` }}
      />
      <div className="relative">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pos" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-pos">Next Game · Week {game.week}</span>
        </div>
        <div className="flex items-center justify-center gap-6 sm:gap-14">
          <TeamBadge team={away} name={away.name} />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">vs</span>
          <TeamBadge team={home} name={home.name} />
        </div>
        <div className="mt-6 text-center text-xs text-muted">
          {dateLabel}{game.gametime ? ` · ${game.gametime}` : ""}
        </div>
        {remaining && (
          <div className="mt-8 flex justify-center gap-3 sm:gap-5">
            <CountdownUnit value={remaining.d} label="Days" />
            <CountdownUnit value={remaining.h} label="Hrs" />
            <CountdownUnit value={remaining.m} label="Min" />
            <CountdownUnit value={remaining.s} label="Sec" />
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleHeader({ season, currentWeek, totalWeeks, played, remaining }: {
  season: number; currentWeek: number; totalWeeks: number; played: number; remaining: number;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <SectionLabel>{season} Season</SectionLabel>
        <SectionTitle>Schedule</SectionTitle>
      </div>
      <div className="flex gap-6">
        <div>
          <div className="text-2xl font-bold text-white">{currentWeek} <span className="text-base font-normal text-muted">/ {totalWeeks}</span></div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted">Current Week</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-pos">{played}</div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted">Played</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{remaining}</div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted">Remaining</div>
        </div>
      </div>
    </div>
  );
}

function WeekJumpStrip({ weeks, currentWeek }: { weeks: number[]; currentWeek: number | null }) {
  const scrollTo = (w: number) => {
    document.getElementById(`week-${w}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => scrollTo(w)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              w === currentWeek ? "bg-pos text-ink" : "border border-line text-muted hover:border-pos/50 hover:text-white"
            }`}
          >
            Week {w}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}

function TimelineGameRow({ g }: { g: ScheduleGame }) {
  const home = TEAM_INFO[g.home] ?? { name: g.home, logo: "", color: "#2ecc71" };
  const away = TEAM_INFO[g.away] ?? { name: g.away, logo: "", color: "#3b82f6" };
  const dateLabel = g.gameday
    ? new Date(g.gameday + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "TBD";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="text-[10px] uppercase tracking-[0.1em] text-muted sm:w-32 sm:shrink-0">
        {dateLabel}{g.gametime ? ` · ${g.gametime}` : ""}
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 sm:justify-start">
        <div className="flex items-center gap-2">
          <img src={away.logo} alt="" className="h-6 w-6 object-contain" />
          <span className="text-sm font-semibold text-white">{away.name}</span>
        </div>
        <span className="text-sm font-bold text-white">{g.played ? g.away_score : ""}</span>
      </div>
      <span className="hidden text-[10px] text-muted sm:inline">@</span>
      <div className="flex flex-1 items-center justify-between gap-3 sm:justify-start">
        <div className="flex items-center gap-2">
          <img src={home.logo} alt="" className="h-6 w-6 object-contain" />
          <span className="text-sm font-semibold text-white">{home.name}</span>
        </div>
        <span className="text-sm font-bold text-white">{g.played ? g.home_score : ""}</span>
      </div>
      <span className={`text-[10px] font-bold uppercase sm:ml-auto ${g.played ? "text-pos" : "text-white/40"}`}>
        {g.played ? "Final" : "Upcoming"}
      </span>
    </div>
  );
}

function WeekSection({ week, games, isCurrent, isLast }: {
  week: number; games: ScheduleGame[]; isCurrent: boolean; isLast: boolean;
}) {
  const allPlayed = games.every((g) => g.played);

  return (
    <motion.div
      id={`week-${week}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="relative flex scroll-mt-24 gap-5 sm:gap-8"
    >
      <div className="relative flex w-10 flex-col items-center sm:w-14">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold sm:h-12 sm:w-12 ${
            isCurrent
              ? "border-pos bg-pos/10 text-pos"
              : allPlayed
              ? "border-line bg-panel text-muted"
              : "border-line bg-panel text-white"
          }`}
        >
          {week}
        </div>
        {!isLast && <div className={`mt-2 w-px flex-1 ${allPlayed ? "bg-pos/40" : "bg-line"}`} />}
      </div>

      <div className="flex-1 pb-10">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">Week {week}</h3>
          {isCurrent && (
            <span className="rounded-full bg-pos/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pos">
              Next Up
            </span>
          )}
        </div>
        <div className="space-y-2">
          {games.map((g) => (
            <TimelineGameRow key={`${g.home}-${g.away}`} g={g} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Schedule() {
  const { data, loading, error } = useSchedule();

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted">Loading schedule…</div>;
  if (error || !data) return <div className="flex min-h-screen items-center justify-center text-danger">Couldn't load schedule.json.</div>;

  const nextGame = data.games.find((g) => !g.played);
  const weeks = [...new Set(data.games.map((g) => g.week))].sort((a, b) => a - b);
  const bgColor = nextGame ? TEAM_INFO[nextGame.home]?.color ?? "#2ecc71" : "#2ecc71";
  const playedCount = data.games.filter((g) => g.played).length;
  const remainingCount = data.games.length - playedCount;
  const currentWeek = nextGame?.week ?? weeks[weeks.length - 1];

  const gamesByWeek = weeks.map((w) => ({
    week: w,
    games: data.games.filter((g) => g.week === w),
  }));

  return (
    <div className="min-h-screen">
      <AmbientBackground color={bgColor} />
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
        <Reveal>
          <ScheduleHeader
            season={data.season}
            currentWeek={currentWeek}
            totalWeeks={weeks.length}
            played={playedCount}
            remaining={remainingCount}
          />
        </Reveal>

        {nextGame && (
          <Reveal delay={0.05} className="mt-8">
            <NextGameCard game={nextGame} />
          </Reveal>
        )}

        <Reveal delay={0.1} className="mt-10 mb-10">
          <WeekJumpStrip weeks={weeks} currentWeek={nextGame?.week ?? null} />
        </Reveal>

        <div>
          {gamesByWeek.map(({ week, games }, i) => (
            <WeekSection
              key={week}
              week={week}
              games={games}
              isCurrent={week === nextGame?.week}
              isLast={i === gamesByWeek.length - 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}