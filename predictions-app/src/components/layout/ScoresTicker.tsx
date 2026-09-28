import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSchedule, type ScheduleGame } from "../../lib/scheduleData";
import { TEAM_INFO } from "../../lib/teams";

function statusLabel(g: ScheduleGame) {
  if (g.played) return "Final";
  if (!g.gameday) return "TBD";
  const d = new Date(g.gameday + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
  return g.gametime ? `${d} · ${g.gametime}` : d;
}

function TickerGame({ g }: { g: ScheduleGame }) {
  const awayWon = g.played && (g.away_score ?? 0) > (g.home_score ?? 0);
  const homeWon = g.played && (g.home_score ?? 0) > (g.away_score ?? 0);
  const row = (code: string, score: number | null, won: boolean) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <img src={TEAM_INFO[code]?.logo} alt="" className="h-4 w-4 object-contain" />
        <span className={`font-display text-[15px] font-bold tracking-wide ${g.played && !won ? "text-white/45" : "text-white"}`}>{code}</span>
      </div>
      {g.played && (
        <span className={`stat text-[15px] ${won ? "text-white" : "text-white/45"}`}>{score}</span>
      )}
    </div>
  );
  return (
    <Link
      to="/schedule"
      className="block w-[132px] shrink-0 border-r border-white/10 px-3 py-1.5 transition hover:bg-white/5"
    >
      <div className={`mb-0.5 font-display text-[11px] font-bold uppercase tracking-wider ${g.played ? "text-white/50" : "text-brand"}`}>
        {statusLabel(g)}
      </div>
      {row(g.away, g.away_score, awayWon)}
      {row(g.home, g.home_score, homeWon)}
    </Link>
  );
}

/** Scoreboard strip above the header: last week's finals plus this week's slate. */
export default function ScoresTicker() {
  const { data } = useSchedule();
  const scroller = useRef<HTMLDivElement>(null);

  let games: ScheduleGame[] = [];
  let label = "Scores";
  if (data) {
    const next = data.games.find((g) => !g.played);
    const week = next?.week ?? Math.max(...data.games.map((g) => g.week));
    const thisWeek = data.games.filter((g) => g.week === week);
    const lastWeek = thisWeek.some((g) => g.played) ? [] : data.games.filter((g) => g.week === week - 1);
    games = [...lastWeek, ...thisWeek];
    label = `Week ${week}`;
  }

  const nudge = (dir: number) => scroller.current?.scrollBy({ left: dir * 400, behavior: "smooth" });

  return (
    <div className="border-b border-white/10 bg-[#061124] text-white">
      <div className="mx-auto flex max-w-7xl items-stretch">
        <div className="hidden shrink-0 flex-col justify-center border-r border-white/10 px-4 sm:flex">
          <div className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Scores</div>
          <div className="headline text-lg">{label}</div>
        </div>
        <button onClick={() => nudge(-1)} aria-label="Scroll scores left" className="hidden shrink-0 px-1.5 text-white/50 hover:text-white md:block">
          <ChevronLeft size={18} />
        </button>
        <div ref={scroller} className="no-scrollbar flex min-w-0 flex-1 overflow-x-auto">
          {data
            ? games.map((g) => <TickerGame key={`${g.week}-${g.away}-${g.home}`} g={g} />)
            : Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-[62px] w-[132px] shrink-0 border-r border-white/10 px-3 py-2">
                  <div className="h-2.5 w-14 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded bg-white/10" />
                  <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-white/10" />
                </div>
              ))}
        </div>
        <button onClick={() => nudge(1)} aria-label="Scroll scores right" className="hidden shrink-0 px-1.5 text-white/50 hover:text-white md:block">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
