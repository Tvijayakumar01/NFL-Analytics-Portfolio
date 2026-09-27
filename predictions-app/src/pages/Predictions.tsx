import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, X, Info, Trophy } from "lucide-react";
import { usePredictions, type Probs } from "../lib/data";
import { useUpcomingPredictions, type UpcomingGame } from "../lib/upcomingData";
import { TEAM_INFO } from "../lib/teams";
import Reveal, { SectionLabel, SectionTitle } from "../components/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const BTN = "flex min-w-[130px] items-center justify-center gap-1 rounded-full border border-line px-4 py-2 text-sm text-white transition hover:border-pos/50 hover:bg-pos/5 disabled:opacity-30";

const confTone: Record<string, string> = {
  High: "text-pos border-pos/40 bg-pos/10",
  Medium: "text-gold border-gold/40 bg-gold/10",
  Low: "text-danger border-danger/40 bg-danger/10",
};

type AnyGame = {
  home: string; away: string; week: number; season: number;
  pick: string; confidence: "High" | "Medium" | "Low"; prob: Probs;
  verdict: { text: string; margin: number };
  features: { home_trailing_off_epa: number; home_trailing_def_epa: number; away_trailing_off_epa: number; away_trailing_def_epa: number };
  components: { logistic: Probs; xgboost: Probs };
  home_score?: number; away_score?: number; correct?: boolean; actual_winner?: string;
  gameday?: string | null; gametime?: string | null;
};

function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cards = [
    { title: "Win Probability", desc: "The model's estimated chance each team wins, based on how they've been playing recently." },
    { title: "Confidence", desc: "High confidence means the model saw a clear gap between the two teams. Low confidence means it was close to a coin flip." },
    { title: "Trailing EPA (Off/Def)", desc: "How efficient each team's offense and defense have been over their last several games." },
    { title: "Model Ensemble", desc: "Two models — Logistic Regression and XGBoost — score every game. XGBoost's call is the official pick." },
    { title: "Upcoming vs. Track Record", desc: "\"Upcoming\" shows real predictions for unplayed games. \"Track Record\" shows how the model did this season." },
  ];
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-panel p-6 shadow-2xl" initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.25, ease: EASE }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">How to read this page</h3>
              <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-white/5 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {cards.map((c) => (
                <div key={c.title} className="rounded-lg border-l-2 border-pos bg-white/[0.03] p-4">
                  <div className="mb-1 text-sm font-bold text-white">{c.title}</div>
                  <div className="text-xs leading-relaxed text-muted">{c.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AmbientBackground({ homeColor, awayColor }: { homeColor: string; awayColor: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <motion.div className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full blur-[130px]" animate={{ backgroundColor: homeColor }} transition={{ duration: 0.8 }} style={{ opacity: 0.2 }} />
      <motion.div className="absolute -right-32 bottom-[-100px] h-[560px] w-[560px] rounded-full blur-[130px]" animate={{ backgroundColor: awayColor }} transition={{ duration: 0.8 }} style={{ opacity: 0.18 }} />
    </div>
  );
}

function whyExplanation(g: AnyGame): string {
  const homeName = TEAM_INFO[g.home]?.name ?? g.home;
  const awayName = TEAM_INFO[g.away]?.name ?? g.away;
  const offEdge = g.features.home_trailing_off_epa >= g.features.away_trailing_off_epa ? homeName : awayName;
  const defEdge = g.features.home_trailing_def_epa <= g.features.away_trailing_def_epa ? homeName : awayName;
  const pickName = TEAM_INFO[g.pick]?.name ?? g.pick;
  return `Heading into this game, ${offEdge} had been moving the ball more efficiently on offense, while ${defEdge} had been the tougher defense to score against over their last few weeks. Putting those trends together, the model leaned toward ${pickName}.`;
}

function ScoreboardHero({ g, isUpcoming }: { g: AnyGame; isUpcoming: boolean }) {
  const home = TEAM_INFO[g.home] ?? { name: g.home, color: "#2ecc71", logo: "" };
  const away = TEAM_INFO[g.away] ?? { name: g.away, color: "#3b82f6", logo: "" };
  const homeWin = g.pick === g.home;
  const winner = homeWin ? home : away;
  const winnerProb = homeWin ? g.prob.home : g.prob.away;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line p-8 sm:p-12" style={{ background: `linear-gradient(120deg, ${home.color}33 0%, #0a0a0d 45%, #0a0a0d 55%, ${away.color}33 100%)` }}>
      <div className="mb-6 flex items-center justify-between">
        <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">Week {g.week} · {g.season}</span>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${confTone[g.confidence]}`}>{g.confidence} confidence</span>
          {isUpcoming ? (
            <span className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
              {g.gameday ?? "TBD"}{g.gametime ? ` · ${g.gametime}` : ""}
            </span>
          ) : (
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${g.correct ? "bg-pos/15 text-pos" : "bg-danger/15 text-danger"}`}>
              {g.correct ? <Check size={12} /> : <X size={12} />}
              {g.correct ? "Correct" : "Missed"}
            </span>
          )}
        </div>
      </div>

      <div className="mb-8 flex items-center justify-center gap-3 rounded-2xl border border-pos/30 bg-pos/10 py-4 text-center">
        <Trophy size={20} className="shrink-0 text-pos" />
        <span className="text-base font-bold text-white sm:text-xl">
          <span className="text-pos">{winner.name}</span> favored to win — {pct(winnerProb)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
        <div className="text-center">
          {homeWin && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-pos/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pos">
              <Trophy size={10} /> Predicted Winner
            </div>
          )}
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32" style={homeWin ? { boxShadow: `0 0 40px -6px ${home.color}`, border: `2px solid ${home.color}` } : {}}>
            <img src={home.logo} alt="" className={`h-20 w-20 object-contain sm:h-24 sm:w-24 ${homeWin ? "" : "opacity-40 grayscale"}`} />
          </div>
          <div className={`mt-3 text-lg font-bold sm:text-xl ${homeWin ? "text-white" : "text-white/50"}`}>{home.name}</div>
          <div className={`mt-1 text-3xl font-extrabold sm:text-4xl ${homeWin ? "text-pos" : "text-white/40"}`}>{pct(g.prob.home)}</div>
        </div>

        <div className="flex flex-col items-center gap-1 text-muted">
          <span className="text-xs uppercase tracking-[0.2em]">{isUpcoming ? "vs" : "Final"}</span>
          {isUpcoming ? (
            <span className="text-2xl font-light">—</span>
          ) : (
            <span className="text-xl font-bold text-white">{g.home_score} – {g.away_score}</span>
          )}
        </div>

        <div className="text-center">
          {!homeWin && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-pos/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pos">
              <Trophy size={10} /> Predicted Winner
            </div>
          )}
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32" style={!homeWin ? { boxShadow: `0 0 40px -6px ${away.color}`, border: `2px solid ${away.color}` } : {}}>
            <img src={away.logo} alt="" className={`h-20 w-20 object-contain sm:h-24 sm:w-24 ${!homeWin ? "" : "opacity-40 grayscale"}`} />
          </div>
          <div className={`mt-3 text-lg font-bold sm:text-xl ${!homeWin ? "text-white" : "text-white/50"}`}>{away.name}</div>
          <div className={`mt-1 text-3xl font-extrabold sm:text-4xl ${!homeWin ? "text-pos" : "text-white/40"}`}>{pct(g.prob.away)}</div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full"
            style={{ backgroundColor: homeWin ? "#2ecc71" : "#4b5563" }}
            initial={{ width: 0 }}
            animate={{ width: pct(g.prob.home) }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          />
          <motion.div
            className="h-full"
            style={{ backgroundColor: !homeWin ? "#2ecc71" : "#4b5563" }}
            initial={{ width: 0 }}
            animate={{ width: pct(g.prob.away) }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ g, isUpcoming }: { g: AnyGame; isUpcoming: boolean }) {
  const pickName = TEAM_INFO[g.pick]?.name ?? g.pick;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-pos/25 bg-pos/[0.06] p-6 sm:col-span-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Our Pick</div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-5xl leading-none text-pos">+{g.verdict.margin}</span>
          <span className="text-lg font-semibold leading-tight text-white">{g.verdict.text}</span>
        </div>
        {!isUpcoming && g.actual_winner && (
          <div className="mt-3 text-sm text-white/75">
            XGBoost model favored <span className="font-semibold text-pos">{pickName}</span> —
            actual winner: <span className="font-semibold text-white">{TEAM_INFO[g.actual_winner]?.name ?? g.actual_winner}</span>
          </div>
        )}
        <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-white/75">{whyExplanation(g)}</p>
      </div>

      <div className="rounded-xl bg-white/[0.03] p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{g.home} Off EPA/play</div>
        <div className="mt-1 text-lg font-semibold text-white">{g.features.home_trailing_off_epa.toFixed(3)}</div>
      </div>
      <div className="rounded-xl bg-white/[0.03] p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{g.away} Off EPA/play</div>
        <div className="mt-1 text-lg font-semibold text-white">{g.features.away_trailing_off_epa.toFixed(3)}</div>
      </div>
      <div className="rounded-xl bg-white/[0.03] p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{g.home} Def EPA/play</div>
        <div className="mt-1 text-lg font-semibold text-white">{g.features.home_trailing_def_epa.toFixed(3)}</div>
      </div>
      <div className="rounded-xl bg-white/[0.03] p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{g.away} Def EPA/play</div>
        <div className="mt-1 text-lg font-semibold text-white">{g.features.away_trailing_def_epa.toFixed(3)}</div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5 sm:col-span-2">
        <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">Model ensemble · home / away</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-muted">Logistic Regression</span>
            <span className="text-pos">{pct(g.components.logistic.home)}</span>
            <span className="text-white/40">/</span>
            <span className="text-away">{pct(g.components.logistic.away)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-muted">XGBoost</span>
            <span className="text-pos">{pct(g.components.xgboost.home)}</span>
            <span className="text-white/40">/</span>
            <span className="text-away">{pct(g.components.xgboost.away)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackRecordBar({ total, correct, accuracy }: { total: number; correct: number; accuracy: number }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-panel p-6">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Season Record</div>
        <div className="mt-1 text-2xl font-semibold text-white">{correct} <span className="text-muted">/</span> {total}</div>
      </div>
      <div className="h-10 w-px bg-line" />
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Accuracy</div>
        <div className="mt-1 text-2xl font-semibold text-pos">{pct(accuracy)}</div>
      </div>
      <div className="h-10 w-px bg-line" />
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted">vs. Naive Baseline</div>
        <div className="mt-1 text-2xl font-semibold text-white">53.3%</div>
      </div>
    </div>
  );
}

function UpcomingList({ games, index, direction, onGo }: {
  games: UpcomingGame[]; index: number; direction: number; onGo: (delta: number) => void;
}) {
  const game = games[index];

  return (
    <>
      <div className="mt-10 mb-8 grid grid-cols-3 items-center">
        <button onClick={() => onGo(-1)} disabled={index <= 0} className={`${BTN} justify-self-start`}>
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="justify-self-center text-sm text-muted">Game {index + 1} of {games.length}</span>
        <button onClick={() => onGo(1)} disabled={index >= games.length - 1} className={`${BTN} justify-self-end`}>
          Next <ChevronRight size={16} />
        </button>
      </div>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div key={index} custom={direction} initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }} transition={{ duration: 0.35, ease: EASE }}>
          <ScoreboardHero g={game} isUpcoming />
          <div className="mt-6"><DetailPanel g={game} isUpcoming /></div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function PageHeader({ setInfoOpen, view, setView, hasUpcoming, season, week }: {
  setInfoOpen: (v: boolean) => void;
  view: "upcoming" | "backtest"; setView: (v: "upcoming" | "backtest") => void;
  hasUpcoming: boolean; season: number; week?: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Reveal><SectionLabel>{view === "upcoming" ? `${season} · Week ${week ?? "—"}` : `${season} Season · Backtest`}</SectionLabel></Reveal>
        <Reveal>
          <button onClick={() => setInfoOpen(true)} aria-label="How to read this page" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-muted transition hover:border-pos/50 hover:text-pos">
            <Info size={18} />
          </button>
        </Reveal>
      </div>
      <Reveal>
        <SectionTitle>{view === "upcoming" ? "This Week's Picks" : "Season Track Record"}</SectionTitle>
        <p className="mt-4 max-w-xl text-muted">
          {view === "upcoming"
            ? "Real predictions for games that haven't been played yet, based on each team's recent trailing performance."
            : "Every game already played this season, and how the model's calls stacked up against reality."}
        </p>
      </Reveal>
      <Reveal delay={0.03} className="mt-6 flex gap-2">
        <button onClick={() => setView("upcoming")} disabled={!hasUpcoming} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${view === "upcoming" ? "bg-pos text-ink" : "border border-line text-muted hover:text-white"} disabled:opacity-30`}>
          Upcoming
        </button>
        <button onClick={() => setView("backtest")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${view === "backtest" ? "bg-pos text-ink" : "border border-line text-muted hover:text-white"}`}>
          Track Record
        </button>
      </Reveal>
    </>
  );
}

export default function Predictions() {
  const { data: backtestData, loading: backtestLoading, error: backtestError } = usePredictions();
  const { data: upcomingData, loading: upcomingLoading, error: upcomingError } = useUpcomingPredictions();
  const [view, setViewRaw] = useState<"upcoming" | "backtest">("upcoming");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  const setView = (v: "upcoming" | "backtest") => {
    setViewRaw(v);
    setIndex(0);
    setDirection(0);
  };

  const loading = view === "upcoming" ? upcomingLoading : backtestLoading;
  const hasUpcoming = !upcomingLoading && !upcomingError && !!upcomingData && upcomingData.games.length > 0;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>;
  }

  if (view === "backtest") {
    if (backtestError || !backtestData) {
      return <div className="flex min-h-screen items-center justify-center text-danger">Couldn't load predictions.json.</div>;
    }
    const safeIndex = Math.min(index, backtestData.games.length - 1);
    const game = backtestData.games[safeIndex];
    const progress = ((safeIndex + 1) / backtestData.games.length) * 100;
    const homeColor = TEAM_INFO[game.home]?.color ?? "#2ecc71";
    const awayColor = TEAM_INFO[game.away]?.color ?? "#3b82f6";
    const go = (delta: number) => {
      setDirection(delta);
      setIndex((i) => Math.min(Math.max(i + delta, 0), backtestData.games.length - 1));
    };

    return (
      <div className="min-h-screen">
        <AmbientBackground homeColor={homeColor} awayColor={awayColor} />
        <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        <section className="relative mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-10">
          <PageHeader setInfoOpen={setInfoOpen} view={view} setView={setView} hasUpcoming={hasUpcoming} season={backtestData.season} />
          <Reveal delay={0.05}>
            <TrackRecordBar total={backtestData.total_games} correct={backtestData.correct} accuracy={backtestData.accuracy} />
          </Reveal>
          <div className="mt-10 mb-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div className="h-full rounded-full bg-pos" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: EASE }} />
          </div>
          <div className="mt-10 mb-8 grid grid-cols-3 items-center">
            <button onClick={() => go(1)} disabled={safeIndex >= backtestData.games.length - 1} className={`${BTN} justify-self-start`}>
              <ChevronLeft size={16} /> Earlier
            </button>
            <span className="justify-self-center text-sm text-muted">Game {safeIndex + 1} of {backtestData.games.length}</span>
            <button onClick={() => go(-1)} disabled={safeIndex <= 0} className={`${BTN} justify-self-end`}>
              Later <ChevronRight size={16} />
            </button>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-5 sm:px-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={safeIndex} custom={direction} initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }} transition={{ duration: 0.35, ease: EASE }}>
              <ScoreboardHero g={game} isUpcoming={false} />
              <div className="mt-6">
                <DetailPanel g={game} isUpcoming={false} />
              </div>
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    );
  }

  if (!hasUpcoming) {
    return (
      <div className="min-h-screen">
        <AmbientBackground homeColor="#2ecc71" awayColor="#3b82f6" />
        <section className="mx-auto max-w-5xl px-5 py-20 sm:px-10">
          <PageHeader setInfoOpen={setInfoOpen} view={view} setView={setView} hasUpcoming={hasUpcoming} season={new Date().getFullYear()} />
          <Reveal delay={0.1} className="mt-10 rounded-2xl border border-line bg-panel p-8 text-center text-muted">
            No upcoming games found yet — run <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">python scripts/export_upcoming_predictions.py</code> once the next week's schedule is available.
          </Reveal>
        </section>
      </div>
    );
  }

  const safeIndex = Math.min(index, upcomingData!.games.length - 1);
  const currentUpcoming = upcomingData!.games[safeIndex];
  const homeColor = TEAM_INFO[currentUpcoming.home]?.color ?? "#2ecc71";
  const awayColor = TEAM_INFO[currentUpcoming.away]?.color ?? "#3b82f6";

  const goUpcoming = (delta: number) => {
    setDirection(delta);
    setIndex((i) => Math.min(Math.max(i + delta, 0), upcomingData!.games.length - 1));
  };

  return (
    <div className="min-h-screen">
      <AmbientBackground homeColor={homeColor} awayColor={awayColor} />
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <section className="relative mx-auto max-w-5xl scroll-mt-24 px-5 py-20 sm:px-10">
        <PageHeader setInfoOpen={setInfoOpen} view={view} setView={setView} hasUpcoming={hasUpcoming} season={upcomingData!.season} week={upcomingData!.week} />
      </section>
      <section className="mx-auto max-w-5xl px-5 sm:px-10">
        <UpcomingList games={upcomingData!.games} index={safeIndex} direction={direction} onGo={goUpcoming} />
      </section>
    </div>
  );
}