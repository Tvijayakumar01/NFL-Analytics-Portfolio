import { motion } from "framer-motion";
import { Database, Cloud, GitBranch, Cpu, FileJson, MonitorSmartphone, AlertTriangle } from "lucide-react";
import Reveal, { SectionLabel, SectionTitle } from "../components/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <motion.div
        className="absolute -left-32 -top-32 h-[560px] w-[560px] rounded-full bg-pos blur-[130px]"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 20, 0] }}
        transition={{ x: { duration: 24, repeat: Infinity, ease: "easeInOut" }, y: { duration: 28, repeat: Infinity, ease: "easeInOut" } }}
        style={{ opacity: 0.2 }}
      />
      <motion.div
        className="absolute -right-32 bottom-[-100px] h-[500px] w-[500px] rounded-full bg-away blur-[130px]"
        animate={{ x: [0, -25, 20, 0], y: [0, 20, -15, 0] }}
        transition={{ x: { duration: 22, repeat: Infinity, ease: "easeInOut" }, y: { duration: 26, repeat: Infinity, ease: "easeInOut" } }}
        style={{ opacity: 0.15 }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 60%, #0a0a0d 100%)" }} />
    </div>
  );
}

const pipelineSteps = [
  { icon: Database, title: "Ingest", desc: "nfl_data_py pulls play-by-play, schedules, and weekly rosters directly from nflverse — 2021 through the current season." },
  { icon: Cloud, title: "Warehouse", desc: "Raw data lands in BigQuery (nfl_raw dataset) — 250,000+ plays, every schedule, every roster entry, refreshed weekly." },
  { icon: GitBranch, title: "Transform", desc: "dbt models clean and aggregate the raw data into staging tables and marts: player-week EPA, team-week splits, rolling 4-week form." },
  { icon: Cpu, title: "Model", desc: "An XGBoost classifier and a Logistic Regression baseline both train on trailing team EPA to predict game outcomes." },
  { icon: FileJson, title: "Export", desc: "Python scripts query the finished marts and models, writing static JSON files consumed directly by the frontend — no live backend required." },
  { icon: MonitorSmartphone, title: "Frontend", desc: "A React + Tailwind + Framer Motion app renders everything, hosted free on GitHub Pages." },
];

function PipelineStep({ step, index }: { step: typeof pipelineSteps[number]; index: number }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
      className="group relative overflow-hidden rounded-2xl border border-line bg-panel p-6 transition-shadow hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)]"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-pos" />
      <div className="pointer-events-none absolute -right-2 -top-2 text-6xl font-black text-white/[0.03] transition-colors group-hover:text-pos/[0.06]">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-pos/30 bg-pos/10 text-pos">
        <Icon size={18} />
      </div>
      <div className="relative mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Step {index + 1}</div>
      <div className="relative mb-2 text-lg font-bold text-white">{step.title}</div>
      <p className="relative text-sm leading-relaxed text-muted">{step.desc}</p>
    </motion.div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-2xl border border-line bg-panel p-6 transition-shadow hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)]"
    >
      <div className="mb-2 text-lg font-bold text-white">{title}</div>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </motion.div>
  );
}

const accuracyRows = [
  { label: "Naive baseline (always pick home)", value: 53.3, best: false },
  { label: "Logistic Regression", value: 63.9, best: false },
  { label: "XGBoost", value: 64.9, best: true },
];

function AccuracyRow({ row, index }: { row: typeof accuracyRows[number]; index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: EASE }}
      className={index < accuracyRows.length - 1 ? "border-b border-line/50" : ""}
    >
      <td className="p-4 text-white">{row.label}</td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-white/8 sm:w-48">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: row.best ? "#2ecc71" : "#6b7280" }}
              initial={{ width: 0 }}
              whileInView={{ width: `${row.value}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.08, ease: EASE }}
            />
          </div>
          <span className={`w-14 text-right font-bold ${row.best ? "text-pos" : "text-muted"}`}>{row.value}%</span>
        </div>
      </td>
    </motion.tr>
  );
}

const limitations = [
  "No strength-of-schedule adjustment — a great week against a weak defense looks the same as one against an elite defense.",
  "No injury, weather, or personnel data — the model only sees trailing EPA, nothing about who's actually on the field.",
  "Early-season weeks lean on the tail end of the prior season's form, since there isn't enough current-season data yet to build a reliable 4-week trailing window.",
  "EPA rewards efficiency, not just outcomes — a team can \"lose\" on the scoreboard while still posting strong EPA numbers, and vice versa.",
];

function LimitationRow({ text, index }: { text: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE }}
      className="flex items-start gap-3 rounded-xl border-l-2 border-gold bg-white/[0.03] p-4 text-sm leading-relaxed text-muted"
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold" />
      <span>{text}</span>
    </motion.div>
  );
}

const techStack = [
  "nfl_data_py", "BigQuery", "dbt Core", "Python", "pandas", "scikit-learn",
  "XGBoost", "React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion",
  "Recharts", "GitHub Pages",
];

export default function Method() {
  return (
    <div className="min-h-screen">
      <AmbientBackground />
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
        <Reveal>
          <SectionLabel>Behind the Scenes</SectionLabel>
          <SectionTitle>How this works</SectionTitle>
          <p className="mt-4 max-w-2xl text-muted">
            NFL EPA Lab is a full analytics pipeline, from raw play-by-play data to a trained
            prediction model to the site you're looking at right now. Here's exactly how it fits together.
          </p>
        </Reveal>

        <div className="mt-12">
          <h3 className="mb-6 text-xl font-bold text-white">The Pipeline</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pipelineSteps.map((step, i) => (
              <PipelineStep key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          <InfoCard title="What is EPA?">
            Expected Points Added measures how much a single play helped or hurt a team's chance of
            scoring, based on down, distance, and field position — not just raw yards. A 3-yard gain
            on 3rd-and-2 is a much bigger deal than the same 3 yards on 3rd-and-15, and EPA captures that.
          </InfoCard>
          <InfoCard title="Recent Form">
            Every player and team's "form" is a 4-week trailing average, shrunk toward the league mean
            to avoid overreacting to small samples — one huge game doesn't instantly make someone "elite."
            The window doesn't reset at season boundaries, so early-season form carries over from the
            prior year until enough current-season data accumulates.
          </InfoCard>
        </div>

        <div className="mt-14">
          <h3 className="mb-1 text-xl font-bold text-white">The Prediction Model</h3>
          <p className="mb-6 text-sm text-muted">
            Two models score every game independently — a Logistic Regression baseline and an XGBoost
            classifier — both trained on six features: each team's trailing offensive EPA/play, trailing
            defensive EPA/play allowed, and trailing offensive success rate. XGBoost's prediction is the
            one used as the official pick, benchmarked against the simpler baseline.
          </p>
          <div className="overflow-hidden rounded-2xl border border-line bg-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="p-4">Model</th>
                  <th className="p-4 text-right">2025 Season Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {accuracyRows.map((row, i) => (
                  <AccuracyRow key={row.label} row={row} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-14">
          <h3 className="mb-4 text-xl font-bold text-white">Limitations</h3>
          <div className="space-y-3">
            {limitations.map((text, i) => (
              <LimitationRow key={text} text={text} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="mb-4 text-xl font-bold text-white">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech, i) => (
              <motion.span
                key={tech}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ y: -2, borderColor: "#2ecc71" }}
                transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }}
                className="cursor-default rounded-full border border-line bg-panel px-4 py-2 text-sm text-white/85"
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </div>

        <Reveal delay={0.05} className="mt-14 rounded-2xl border border-line bg-panel p-6 text-center text-sm text-muted">
          Data refreshes weekly. Built as an end-to-end portfolio project — from data engineering to
          machine learning to frontend design.
        </Reveal>
      </section>
    </div>
  );
}