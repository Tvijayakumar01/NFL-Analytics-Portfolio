import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useSchedule, type ScheduleGame } from "../lib/scheduleData";
import { useUpcomingPredictions, type UpcomingGame } from "../lib/upcomingData";
import { useCountdown } from "../lib/useCountdown";
import { teamGradient, visibleColor } from "../lib/color";
import { Container, PageHero, SlashMark } from "../components/Page";
import Reveal from "../components/Reveal";
import { LoadingState, ErrorState } from "../components/PageState";
import { TeamLogo, CountdownBlocks } from "../components/sports";
import { team, nickname, pct, formatGameDay } from "../lib/format";

const gameKey = (g: { home: string; away: string }) => `${g.away}@${g.home}`;

/* ---------------- Featured next game ---------------- */

function NextGameFeature({ game }: { game: ScheduleGame }) {
  const r = useCountdown(game.gameday, game.gametime);
  const side = (code: string, right: boolean) => (
    <div className="relative overflow-hidden px-5 py-8 text-white sm:px-10" style={{ background: teamGradient(team(code).color, right ? 235 : 125) }}>
      <div className="stripes absolute inset-0" />
      <div className={`relative flex flex-col items-center gap-3 sm:flex-row sm:gap-5 ${right ? "sm:flex-row-reverse sm:text-right" : ""}`}>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg sm:h-28 sm:w-28">
          <TeamLogo code={code} className="h-16 w-16 sm:h-20 sm:w-20" />
        </div>
        <div className={`text-center ${right ? "sm:text-right" : "sm:text-left"}`}>
          <div className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/60">{right ? "Home" : "Away"}</div>
          <div className="headline text-4xl sm:text-5xl">{nickname(code)}</div>
          <div className="text-sm text-white/65">{team(code).name.replace(` ${nickname(code)}`, "")}</div>
        </div>
      </div>
    </div>
  );
  return (
    <article className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">Next Kickoff · Week {game.week}</span>
        </span>
        <span className="eyebrow">{formatGameDay(game.gameday, game.gametime, true)}</span>
      </div>
      <div className="relative grid sm:grid-cols-2">
        {side(game.away, false)}
        {side(game.home, true)}
        <div className="absolute left-1/2 top-1/2 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-navy font-display text-xl font-extrabold italic text-white ring-4 ring-white sm:flex">@</div>
      </div>
      {r && (
        <div className="flex flex-col items-center justify-center gap-3 bg-[#f8fafc] px-5 py-5 sm:flex-row sm:gap-6">
          <span className="eyebrow">Kickoff in</span>
          <CountdownBlocks r={r} />
        </div>
      )}
    </article>
  );
}

/* ---------------- Score cards ---------------- */

function ScoreCard({ g, pick }: { g: ScheduleGame; pick?: UpcomingGame }) {
  const awayWon = g.played && (g.away_score ?? 0) > (g.home_score ?? 0);
  const homeWon = g.played && (g.home_score ?? 0) > (g.away_score ?? 0);
  const row = (code: string, score: number | null, won: boolean, side: string) => {
    const dim = g.played && !won;
    return (
      <div className="flex items-center gap-3">
        <TeamLogo code={code} className={`h-9 w-9 ${dim ? "opacity-50" : ""}`} />
        <div className="min-w-0 flex-1">
          <div className={`truncate font-display text-xl font-bold uppercase leading-tight ${dim ? "text-sub" : "text-ink"}`}>{nickname(code)}</div>
          <div className="text-[11px] text-sub">{side}</div>
        </div>
        {g.played && (
          <span className={`stat flex items-center gap-1 text-3xl ${won ? "text-ink" : "text-sub/60"}`}>
            {score}
            <span className={`text-sm text-brand ${won ? "" : "invisible"}`}>◀</span>
          </span>
        )}
      </div>
    );
  };
  return (
    <div className="card card-hover overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-2 font-display text-[13px] font-bold uppercase tracking-wider ${g.played ? "bg-navy text-white" : "border-b border-line bg-[#f8fafc] text-ink"}`}>
        <span>{g.played ? "Final" : formatGameDay(g.gameday, g.gametime)}</span>
        {!g.played && <span className="text-sub">Upcoming</span>}
      </div>
      <div className="space-y-2.5 p-4">
        {row(g.away, g.away_score, awayWon, "Away")}
        {row(g.home, g.home_score, homeWon, "Home")}
      </div>
      {pick && (
        <Link
          to={`/predictions?game=${pick.home}`}
          className="flex items-center justify-between border-t border-line px-4 py-2 text-xs transition hover:bg-page"
        >
          <span className="flex items-center gap-1.5 text-sub">
            Model pick: <TeamLogo code={pick.pick} className="h-4 w-4" />
            <span className="font-semibold text-ink">{pick.pick}</span>
            <span className="text-sub">{pct(pick.pick === pick.home ? pick.prob.home : pick.prob.away)}</span>
          </span>
          <ChevronRight size={14} className="text-brand" />
        </Link>
      )}
    </div>
  );
}

function WeekBlock({ week, games, isCurrent, picks }: { week: number; games: ScheduleGame[]; isCurrent: boolean; picks: Map<string, UpcomingGame> }) {
  const finals = games.filter((g) => g.played).length;
  return (
    <motion.section
      id={`week-${week}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4 }}
      className="scroll-mt-40"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
        <h2 className="headline flex items-center gap-2.5 text-4xl">
          <SlashMark className="h-6 w-2" /> Week {week}
          {isCurrent && <span className="rounded bg-brand px-2 py-0.5 font-display text-sm not-italic tracking-wider text-white">Next up</span>}
        </h2>
        <span className="eyebrow">{games.length} games · {finals === games.length ? "All final" : `${finals} final`}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <ScoreCard key={gameKey(g)} g={g} pick={!g.played ? picks.get(gameKey(g)) : undefined} />
        ))}
      </div>
    </motion.section>
  );
}

/* ---------------- Page ---------------- */

export default function Schedule() {
  const { data, loading, error } = useSchedule();
  const upcoming = useUpcomingPredictions();

  if (loading) return <LoadingState label="Loading schedule…" />;
  if (error || !data) return <ErrorState message="Couldn't load schedule.json." />;

  const nextGame = data.games.find((g) => !g.played);
  const weeks = [...new Set(data.games.map((g) => g.week))].sort((a, b) => a - b);
  const playedCount = data.games.filter((g) => g.played).length;
  const currentWeek = nextGame?.week ?? weeks[weeks.length - 1];
  const picks = new Map((upcoming.data?.games ?? []).map((g) => [gameKey(g), g]));

  const jump = (w: number) => document.getElementById(`week-${w}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <PageHero
        eyebrow={`${data.season} Season Schedule`}
        title="The Slate"
        lede="Every game on the calendar, week by week — finals, upcoming kickoffs, and the model's picks."
        color={nextGame ? visibleColor(team(nextGame.home).color) : undefined}
      >
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          {[
            ["Current week", `${currentWeek}`, `/ ${weeks.length}`],
            ["Games played", `${playedCount}`, ""],
            ["Remaining", `${data.games.length - playedCount}`, ""],
          ].map(([l, v, s]) => (
            <div key={l}>
              <div className="stat text-5xl">{v}<span className="text-2xl text-white/45"> {s}</span></div>
              <div className="font-display text-xs font-bold uppercase tracking-wider text-white/55">{l}</div>
            </div>
          ))}
          <div className="min-w-[200px] flex-1">
            <div className="mb-1.5 font-display text-xs font-bold uppercase tracking-wider text-white/55">Season progress</div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${(playedCount / data.games.length) * 100}%` }} transition={{ duration: 1 }} />
            </div>
          </div>
        </div>
      </PageHero>

      <div className="sticky top-16 z-30 border-b border-line bg-white/95 backdrop-blur">
        <Container>
          <div className="no-scrollbar flex gap-2 overflow-x-auto py-2.5">
            {weeks.map((w) => (
              <button key={w} onClick={() => jump(w)} aria-pressed={w === currentWeek} className="tab py-1.5!">
                Wk {w}
              </button>
            ))}
          </div>
        </Container>
      </div>

      <Container className="pt-8">
        {nextGame && (
          <Reveal className="mb-14">
            <NextGameFeature game={nextGame} />
          </Reveal>
        )}
        {/* The current week leads; the rest of the season follows in order. */}
        <div className="space-y-14">
          {[currentWeek, ...weeks.filter((w) => w !== currentWeek)].map((w, i) => (
            <div key={w}>
              {i === 1 && (
                <div className="mb-10 flex items-center gap-4">
                  <span className="h-px flex-1 bg-line" />
                  <span className="eyebrow">Full season</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <WeekBlock week={w} games={data.games.filter((g) => g.week === w)} isCurrent={w === nextGame?.week} picks={picks} />
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
