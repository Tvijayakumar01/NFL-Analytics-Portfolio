import { motion } from "framer-motion";
import { Database, Cloud, GitBranch, Cpu, FileJson, MonitorSmartphone, AlertTriangle } from "lucide-react";
import { Container, PageHero, SectionHeader } from "../components/Page";
import Reveal from "../components/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

const pipelineSteps = [
  { icon: Database, title: "Ingest", desc: "nfl_data_py pulls play-by-play from nflverse. A one-time backfill covers 1999-2020 — the earliest year this kind of play-level data exists — and daily runs refresh 2021-present." },
  { icon: Cloud, title: "Warehouse", desc: "Raw data lands in BigQuery — over 1.2 million plays spanning 1999-2026, refreshed daily for recent seasons." },
  { icon: GitBranch, title: "Transform", desc: "dbt models and Python scripts clean and aggregate the raw data into team-week EPA, rolling 4-week form, and success rate." },
  { icon: Cpu, title: "Model", desc: "An XGBoost classifier and a Logistic Regression baseline both train on the full historical range, using trailing team EPA and success rate to predict game outcomes." },
  { icon: FileJson, title: "Export", desc: "Python scripts query the finished data and trained models, writing static JSON files consumed directly by the frontend — no live backend required." },
  { icon: MonitorSmartphone, title: "Frontend", desc: "A React + Tailwind + Framer Motion app renders everything, hosted free on GitHub Pages." },
];

const accuracyRows = [
  { label: "Naive baseline (always pick home)", value: 53.7, best: false },
  { label: "Logistic Regression", value: 63.6, best: false },
  { label: "XGBoost — recent seasons only (2021-2024)", value: 62.5, best: false },
  { label: "XGBoost — full history (1999-2024)", value: 66.2, best: true },
];

const limitations = [
  "No strength-of-schedule adjustment — a great week against a weak defense looks the same as one against an elite defense.",
  "No injury, weather, or personnel data — the model only sees trailing EPA and success rate, nothing about who's actually on the field.",
  "Early-season weeks lean on the tail end of the prior season's form, since there isn't enough current-season data yet to build a reliable 4-week trailing window.",
  "Pre-2001 seasons reflect a genuinely different NFL — different rules, far less passing volume. The model doesn't distinguish eras when computing trailing form, though a controlled test confirmed including this older data still improves accuracy overall rather than hurting it.",
  "EPA rewards efficiency, not just outcomes — a team can \"lose\" on the scoreboard while still posting strong EPA numbers, and vice versa.",
];

const techStack = [
  "nfl_data_py", "BigQuery", "dbt Core", "Python", "pandas", "scikit-learn",
  "XGBoost", "React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion",
  "Recharts", "GitHub Pages", "GitHub Actions", "Cloudflare Workers", "Claude (Anthropic)",
];

function PipelineStep({ step, index }: { step: typeof pipelineSteps[number]; index: number }) {
  const Icon = step.icon;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
      className="card card-hover relative overflow-hidden p-6"
    >
      <span className="headline pointer-events-none absolute -right-1 -top-3 text-8xl text-page">{String(index + 1).padStart(2, "0")}</span>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-navy text-white">
        <Icon size={20} />
      </div>
      <div className="relative mt-4 font-display text-sm font-bold uppercase tracking-[0.14em] text-brand">Step {index + 1}</div>
      <h3 className="headline relative mt-1 text-3xl text-ink">{step.title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-sub">{step.desc}</p>
    </motion.article>
  );
}

export default function Method() {
  return (
    <>
      <PageHero
        eyebrow="Behind the Scenes"
        title="The Playbook"
        lede="A full analytics pipeline, from raw play-by-play data back to 1999 to a trained prediction model to the site you're looking at right now. Here's exactly how it fits together."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["1.2M+", "Plays analyzed"],
            ["27", "Seasons of data"],
            ["66.2%", "Model accuracy"],
            ["Daily", "Data refresh"],
          ].map(([v, l]) => (
            <div key={l} className="border-l-2 border-brand pl-4">
              <div className="stat text-4xl sm:text-5xl">{v}</div>
              <div className="font-display text-xs font-bold uppercase tracking-wider text-white/55">{l}</div>
            </div>
          ))}
        </div>
      </PageHero>

      <Container className="pt-10">
        <Reveal>
          <SectionHeader title="The Pipeline" sub="Six stages, from raw plays to the page you're reading." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pipelineSteps.map((step, i) => (
              <PipelineStep key={step.title} step={step} index={i} />
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-14 grid gap-5 md:grid-cols-2">
          <article className="card border-t-4 border-t-navy p-6">
            <h3 className="headline text-3xl text-ink">What is EPA?</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-sub">
              Expected Points Added measures how much a single play helped or hurt a team's chance of
              scoring, based on down, distance, and field position — not just raw yards. A 3-yard gain
              on 3rd-and-2 is a much bigger deal than the same 3 yards on 3rd-and-15, and EPA captures that.
            </p>
          </article>
          <article className="card border-t-4 border-t-brand p-6">
            <h3 className="headline text-3xl text-ink">Recent Form</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-sub">
              Every player and team's "form" is a 4-week trailing average, shrunk toward the league mean
              to avoid overreacting to small samples — one huge game doesn't instantly make someone "elite."
              The window doesn't reset at season boundaries, so early-season form carries over from the
              prior year until enough current-season data accumulates.
            </p>
          </article>
        </Reveal>

        <Reveal className="mt-14">
          <SectionHeader title="The Prediction Model" />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4 text-[15px] leading-relaxed text-sub">
              <p>
                Two models score every game independently — a Logistic Regression baseline and an XGBoost
                classifier — both trained on six features: each team's trailing offensive EPA/play, trailing
                defensive EPA/play allowed, and trailing offensive success rate. XGBoost's prediction is the
                one used as the official pick.
              </p>
              <p>
                The model was originally trained on 2021-2024 only. We ran a controlled comparison — training
                an identical model on the full available history back to 1999 instead, and testing both
                versions on the exact same 2025 holdout games — to check whether more historical data actually
                helps or just adds noise from a different era of football. It helped: accuracy rose from 62.5%
                to 66.2%.
              </p>
            </div>
            <div className="card overflow-hidden">
              <div className="stripes flex items-center justify-between bg-navy px-5 py-3 text-white">
                <span className="headline text-2xl">2025 Holdout Accuracy</span>
              </div>
              <ul className="divide-y divide-line">
                {accuracyRows.map((row, i) => (
                  <li key={row.label} className={`px-5 py-4 ${row.best ? "bg-brand/[0.04]" : ""}`}>
                    <div className="mb-2 flex items-baseline justify-between gap-4">
                      <span className={`text-sm ${row.best ? "font-semibold text-ink" : "text-sub"}`}>{row.label}</span>
                      <span className={`stat text-2xl ${row.best ? "text-brand" : "text-ink"}`}>{row.value}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-page">
                      <motion.div
                        className={`h-full rounded-full ${row.best ? "bg-brand" : "bg-navy/40"}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${row.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: EASE }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <SectionHeader title="Limitations" sub="What the model can't see — worth knowing before you trust a pick." />
          <ol className="card divide-y divide-line">
            {limitations.map((text, i) => (
              <li key={text} className="flex items-start gap-4 px-5 py-4">
                <span className="stat w-8 shrink-0 text-3xl text-gold">{i + 1}</span>
                <p className="text-[15px] leading-relaxed text-ink/80">{text}</p>
                <AlertTriangle size={16} className="ml-auto mt-1 hidden shrink-0 text-gold sm:block" />
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="mt-14">
          <SectionHeader title="Tech Stack" />
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <span key={tech} className="tab cursor-default text-ink! hover:border-navy!">{tech}</span>
            ))}
          </div>
        </Reveal>
      </Container>
    </>
  );
}
