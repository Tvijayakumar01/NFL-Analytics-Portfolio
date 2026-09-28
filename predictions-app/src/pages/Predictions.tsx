import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, X, CalendarClock } from "lucide-react";
import { usePredictions, type Probs } from "../lib/data";
import { useUpcomingPredictions } from "../lib/upcomingData";
import { teamGradient, visibleColor } from "../lib/color";
import { Container, PageHero } from "../components/Page";
import { InfoModal, InfoButton } from "../components/InfoModal";
import { LoadingState, ErrorState } from "../components/PageState";
import { TeamLogo, ProbBar, ConfidenceChip } from "../components/sports";
import { team, nickname, pct, formatGameDay } from "../lib/format";

const EASE = [0.16, 1, 0.3, 1] as const;

const INFO_ITEMS = [
  { title: "Win Probability", desc: "The model's estimated chance each team wins, based on how they've been playing recently." },
  { title: "Confidence", desc: "High confidence means the model saw a clear gap between the two teams. Low confidence means it was close to a coin flip." },
  { title: "Trailing EPA (Off/Def)", desc: "How efficient each team's offense and defense have been over their last several games." },
  { title: "Model Ensemble", desc: "Two models — Logistic Regression and XGBoost — score every game. XGBoost's call is the official pick." },
  { title: "Upcoming vs. Track Record", desc: "\"Upcoming\" shows real predictions for unplayed games. \"Track Record\" shows how the model did this season." },
];

type AnyGame = {
  home: string; away: string; week: number; season: number;
  pick: string; confidence: "High" | "Medium" | "Low"; prob: Probs;
  verdict: { text: string; margin: number };
  features: { home_trailing_off_epa: number; home_trailing_def_epa: number; away_trailing_off_epa: number; away_trailing_def_epa: number };
  components: { logistic: Probs; xgboost: Probs };
  home_score?: number; away_score?: number; correct?: boolean; actual_winner?: string;
  gameday?: string | null; gametime?: string | null;
};

function whyExplanation(g: AnyGame): string {
  const homeName = team(g.home).name;
  const awayName = team(g.away).name;
  const offEdge = g.features.home_trailing_off_epa >= g.features.away_trailing_off_epa ? homeName : awayName;
  const defEdge = g.features.home_trailing_def_epa <= g.features.away_trailing_def_epa ? homeName : awayName;
  return `Heading into this game, ${offEdge} had been moving the ball more efficiently on offense, while ${defEdge} had been the tougher defense to score against over their last few weeks. Putting those trends together, the model leaned toward ${team(g.pick).name}.`;
}

/* ---------------- Game strip ---------------- */

function GameChip({ g, active, onClick, isUpcoming }: { g: AnyGame; active: boolean; onClick: () => void; isUpcoming: boolean }) {
  const favorHome = g.pick === g.home;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`relative w-[150px] shrink-0 overflow-hidden rounded-lg border bg-white px-3 py-2.5 text-left transition ${
        active ? "border-navy shadow-[0_8px_20px_-10px_rgb(10_25_49/0.5)]" : "border-line hover:border-[#c5ccd6]"
      }`}
    >
      {active && <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />}
      {[g.away, g.home].map((c, i) => {
        const picked = (i === 1) === favorHome;
        const score = i === 0 ? g.away_score : g.home_score;
        return (
          <div key={c} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <TeamLogo code={c} className="h-5 w-5" />
              <span className={`font-display text-[15px] font-bold ${picked ? "text-ink" : "text-sub"}`}>{c}</span>
            </span>
            <span className={`stat text-[15px] ${picked ? "text-ink" : "text-sub/70"}`}>
              {isUpcoming ? pct(i === 0 ? g.prob.away : g.prob.home) : score}
            </span>
          </div>
        );
      })}
      {!isUpcoming && (
        <span className={`mt-1 flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wider ${g.correct ? "text-pos" : "text-neg"}`}>
          {g.correct ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />} {g.correct ? "Hit" : "Miss"}
        </span>
      )}
    </button>
  );
}

function GameStrip({ games, index, onSelect, isUpcoming }: { games: AnyGame[]; index: number; onSelect: (i: number) => void; isUpcoming: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onSelect(index - 1)} disabled={index <= 0} aria-label="Previous game" className="btn btn-outline h-10 w-10 shrink-0 p-0!">
        <ChevronLeft size={18} />
      </button>
      <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        {games.map((g, i) => (
          <GameChip key={`${g.week}-${g.away}-${g.home}`} g={g} active={i === index} onClick={() => onSelect(i)} isUpcoming={isUpcoming} />
        ))}
      </div>
      <button onClick={() => onSelect(index + 1)} disabled={index >= games.length - 1} aria-label="Next game" className="btn btn-outline h-10 w-10 shrink-0 p-0!">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ---------------- Game center ---------------- */

function TeamHalf({ code, prob, favored, side, score }: { code: string; prob: number; favored: boolean; side: "Away" | "Home"; score?: number }) {
  const t = team(code);
  const right = side === "Home";
  return (
    <div className="relative overflow-hidden" style={{ background: teamGradient(t.color, right ? 235 : 125) }}>
      <div className="stripes absolute inset-0" />
      {t.logo && <img src={t.logo} alt="" className={`absolute top-1/2 h-64 w-64 -translate-y-1/2 object-contain opacity-15 ${right ? "-right-16" : "-left-16"}`} />}
      <div className={`relative flex flex-col items-center gap-3 px-4 py-7 text-white sm:flex-row sm:gap-5 sm:py-9 ${right ? "sm:flex-row-reverse sm:pl-12 sm:pr-8 sm:text-right" : "sm:pl-8 sm:pr-12"}`}>
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-lg sm:h-24 sm:w-24">
          <TeamLogo code={code} className="h-14 w-14 sm:h-16 sm:w-16" />
        </div>
        <div className={`text-center ${right ? "sm:text-right" : "sm:text-left"}`}>
          <div className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/60">{side}</div>
          <div className="headline text-3xl sm:text-4xl">{nickname(code)}</div>
          <div className="text-xs text-white/60">{t.name.replace(` ${nickname(code)}`, "")}</div>
        </div>
        <div className={right ? "sm:mr-auto" : "sm:ml-auto"}>
          {score != null ? (
            <div className={`stat text-6xl ${favored ? "" : "text-white/80"}`}>{score}</div>
          ) : (
            <div className={`stat text-5xl sm:text-6xl ${favored ? "" : "text-white/55"}`}>{pct(prob)}</div>
          )}
        </div>
      </div>
      {favored && (
        <div className={`absolute top-3 rounded bg-white px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-ink ${right ? "right-3" : "left-3"}`}>
          Our pick
        </div>
      )}
    </div>
  );
}

function TapeRow({ label, away, home, lowerIsBetter = false }: { label: string; away: number; home: number; lowerIsBetter?: boolean }) {
  const scale = (v: number) => Math.min(Math.max(((lowerIsBetter ? -v : v) + 0.3) / 0.6, 0.04), 1);
  const awayBetter = lowerIsBetter ? away < home : away > home;
  return (
    <div className="py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        <span className={`stat text-2xl ${awayBetter ? "text-ink" : "text-sub/70"}`}>{away.toFixed(3)}</span>
        <span className="eyebrow text-center text-[12px]">{label}</span>
        <span className={`stat text-right text-2xl ${!awayBetter ? "text-ink" : "text-sub/70"}`}>{home.toFixed(3)}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <div className="flex justify-end overflow-hidden rounded-l-full bg-page">
          <motion.div className={`h-2 rounded-l-full ${awayBetter ? "bg-navy" : "bg-[#b8c0cc]"}`} initial={{ width: 0 }} animate={{ width: `${scale(away) * 100}%` }} transition={{ duration: 0.7, ease: EASE }} />
        </div>
        <div className="overflow-hidden rounded-r-full bg-page">
          <motion.div className={`h-2 rounded-r-full ${!awayBetter ? "bg-navy" : "bg-[#b8c0cc]"}`} initial={{ width: 0 }} animate={{ width: `${scale(home) * 100}%` }} transition={{ duration: 0.7, ease: EASE }} />
        </div>
      </div>
    </div>
  );
}

function ModelBar({ label, probs, g }: { label: string; probs: Probs; g: AnyGame }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="stat text-lg text-ink">{pct(probs.away)}</span>
        <span className="eyebrow text-[12px]">{label}</span>
        <span className="stat text-lg text-ink">{pct(probs.home)}</span>
      </div>
      <ProbBar home={g.home} away={g.away} homeProb={probs.home} favorHome={probs.home >= probs.away} className="h-1.5" />
    </div>
  );
}

function GameCenter({ g, isUpcoming }: { g: AnyGame; isUpcoming: boolean }) {
  const favorHome = g.pick === g.home;
  return (
    <div className="space-y-5">
      <article className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <span className="eyebrow">Week {g.week} · {g.season}</span>
          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceChip level={g.confidence} />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-sub">confidence</span>
            {isUpcoming ? (
              <span className="flex items-center gap-1.5 rounded bg-page px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-ink">
                <CalendarClock size={13} /> {formatGameDay(g.gameday, g.gametime)}
              </span>
            ) : (
              <span className={`flex items-center gap-1 rounded px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider ${g.correct ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"}`}>
                {g.correct ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />} {g.correct ? "Called it" : "Missed"}
              </span>
            )}
          </div>
        </div>
        <div className="relative grid sm:grid-cols-2">
          <TeamHalf code={g.away} prob={g.prob.away} favored={!favorHome} side="Away" score={isUpcoming ? undefined : g.away_score} />
          <TeamHalf code={g.home} prob={g.prob.home} favored={favorHome} side="Home" score={isUpcoming ? undefined : g.home_score} />
          <div className="absolute left-1/2 top-1/2 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-navy font-display text-lg font-extrabold italic text-white ring-4 ring-white sm:flex">
            {isUpcoming ? "VS" : "FIN"}
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="mb-1.5 flex justify-between font-display text-sm font-bold uppercase tracking-wider text-sub">
            <span>{nickname(g.away)} {pct(g.prob.away)}</span>
            <span>Win probability</span>
            <span>{pct(g.prob.home)} {nickname(g.home)}</span>
          </div>
          <ProbBar home={g.home} away={g.away} homeProb={g.prob.home} favorHome={favorHome} className="h-3" />
        </div>
      </article>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <article className="card p-6">
          <div className="eyebrow">The Pick</div>
          <div className="mt-2 flex items-center gap-4">
            <TeamLogo code={g.pick} className="h-14 w-14" />
            <div>
              <div className="headline text-4xl text-ink">{team(g.pick).name}</div>
              <div className="mt-1 text-sm text-sub">
                <span className="stat text-lg text-pos">+{g.verdict.margin}</span> · {g.verdict.text}
              </div>
            </div>
          </div>
          {!isUpcoming && g.actual_winner && (
            <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${g.correct ? "bg-pos/10 text-ink" : "bg-neg/10 text-ink"}`}>
              Final: <span className="font-semibold">{team(g.actual_winner).name}</span> won {Math.max(g.home_score ?? 0, g.away_score ?? 0)}–{Math.min(g.home_score ?? 0, g.away_score ?? 0)}.
            </div>
          )}
          <p className="mt-5 border-t border-line pt-5 text-[15px] leading-relaxed text-ink/80">{whyExplanation(g)}</p>
        </article>

        <article className="card p-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2"><TeamLogo code={g.away} className="h-7 w-7" /><span className="font-display text-lg font-bold">{g.away}</span></span>
            <span className="headline text-2xl text-ink">Tale of the Tape</span>
            <span className="flex items-center gap-2"><span className="font-display text-lg font-bold">{g.home}</span><TeamLogo code={g.home} className="h-7 w-7" /></span>
          </div>
          <div className="mt-2 divide-y divide-line">
            <TapeRow label="Off EPA / play" away={g.features.away_trailing_off_epa} home={g.features.home_trailing_off_epa} />
            <TapeRow label="Def EPA allowed" away={g.features.away_trailing_def_epa} home={g.features.home_trailing_def_epa} lowerIsBetter />
          </div>
          <div className="mt-3 space-y-3 border-t border-line pt-4">
            <div className="eyebrow">Model ensemble</div>
            <ModelBar label="Logistic Reg." probs={g.components.logistic} g={g} />
            <ModelBar label="XGBoost" probs={g.components.xgboost} g={g} />
          </div>
        </article>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function Predictions() {
  const backtest = usePredictions();
  const upcoming = useUpcomingPredictions();
  const [params, setParams] = useSearchParams();
  const [infoOpen, setInfoOpen] = useState(false);

  const view: "upcoming" | "backtest" = params.get("view") === "record" ? "backtest" : "upcoming";
  const hasUpcoming = !!upcoming.data && upcoming.data.games.length > 0;

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)));
    setParams(p, { replace: true });
  };
  const setView = (v: "upcoming" | "backtest") => update({ view: v === "backtest" ? "record" : null, game: null, week: null });

  const loading = view === "upcoming" ? upcoming.loading : backtest.loading;
  if (loading) return <LoadingState label="Loading picks…" />;

  let games: AnyGame[] = [];
  let weeks: number[] = [];
  let week = 0;
  if (view === "backtest") {
    if (backtest.error || !backtest.data) return <ErrorState message="Couldn't load predictions.json." />;
    weeks = [...new Set(backtest.data.games.map((g) => g.week))].sort((a, b) => b - a);
    week = Number(params.get("week")) || weeks[0];
    games = backtest.data.games.filter((g) => g.week === week);
  } else if (hasUpcoming) {
    games = upcoming.data!.games;
  }

  const gameParam = params.get("game");
  const found = gameParam ? games.findIndex((g) => g.home === gameParam || g.away === gameParam) : 0;
  const index = Math.max(found, 0);
  const game = games[index];
  const selectIndex = (i: number) => {
    const g = games[Math.min(Math.max(i, 0), games.length - 1)];
    if (g) update({ game: g.home });
  };

  const season = view === "backtest" ? backtest.data!.season : upcoming.data?.season ?? new Date().getFullYear();
  const heroColor = game ? visibleColor(team(game.pick).color) : undefined;

  return (
    <>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title="How to read The Line" items={INFO_ITEMS} />
      <PageHero
        eyebrow={view === "upcoming" ? `${season} · Week ${upcoming.data?.week ?? "—"} Picks` : `${season} Season · Backtest`}
        title="The Line"
        lede={view === "upcoming"
          ? "Real predictions for games that haven't been played yet, based on each team's recent trailing performance."
          : "Every game already played this season, and how the model's calls stacked up against reality."}
        color={heroColor}
        action={<InfoButton onClick={() => setInfoOpen(true)} label="How to read this page" />}
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex gap-2">
            <button onClick={() => setView("upcoming")} disabled={!hasUpcoming} aria-pressed={view === "upcoming"} className="tab-dark">Upcoming</button>
            <button onClick={() => setView("backtest")} aria-pressed={view === "backtest"} className="tab-dark">Track Record</button>
          </div>
          {view === "backtest" && backtest.data && (
            <div className="flex gap-8">
              {[
                ["Record", `${backtest.data.correct}–${backtest.data.total_games - backtest.data.correct}`],
                ["Accuracy", pct(backtest.data.accuracy)],
                ["Baseline", "53.3%"],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="stat text-4xl">{v}</div>
                  <div className="font-display text-xs font-bold uppercase tracking-wider text-white/55">{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageHero>

      <Container className="pt-8">
        {view === "upcoming" && !hasUpcoming ? (
          <div className="card p-10 text-center">
            <div className="headline text-3xl text-ink">No upcoming picks yet</div>
            <p className="mx-auto mt-2 max-w-md text-sm text-sub">
              Run <code className="rounded bg-page px-1.5 py-0.5 text-ink">python scripts/export_upcoming_predictions.py</code> once the next week's schedule is available.
            </p>
            <button onClick={() => setView("backtest")} className="btn btn-primary mt-5">See the track record</button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {view === "backtest" && (
                <select value={week} onChange={(e) => update({ week: e.target.value, game: null })} className="select-field" aria-label="Choose week">
                  {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
                </select>
              )}
              <span className="eyebrow">Game {index + 1} of {games.length}</span>
            </div>
            <GameStrip games={games} index={index} onSelect={selectIndex} isUpcoming={view === "upcoming"} />
            <AnimatePresence mode="wait">
              {game && (
                <motion.div
                  key={`${view}-${game.week}-${game.home}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="mt-6"
                >
                  <GameCenter g={game} isUpcoming={view === "upcoming"} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </Container>
    </>
  );
}
