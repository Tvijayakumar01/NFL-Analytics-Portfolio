import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, ChevronLeft, ChevronRight, Trophy, Flame, Star, X } from "lucide-react";
import { useThisWeek, type Player, type ThisWeekData } from "../lib/thisWeekData";
import { TEAM_INFO } from "../lib/teams";
import Reveal, { SectionLabel, SectionTitle } from "../components/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;
const fmtEpa = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
const PAGE_SIZE = 20;

function AmbientBackground({ color }: { color: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <AnimatePresence mode="sync">
        <motion.div
          key={color}
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${color} 0%, transparent 45%, transparent 55%, #2ecc71 100%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.28 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        />
      </AnimatePresence>
      <motion.div
        className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full blur-[110px]"
        animate={{ backgroundColor: color, x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{
          backgroundColor: { duration: 0.8 },
          x: { duration: 22, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 26, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ opacity: 0.45 }}
      />
      <motion.div
        className="absolute -right-32 bottom-[-100px] h-[560px] w-[560px] rounded-full bg-pos blur-[110px]"
        animate={{ x: [0, -30, 25, 0], y: [0, 25, -15, 0] }}
        transition={{
          x: { duration: 24, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 20, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ opacity: 0.35 }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 60%, #0a0a0d 100%)" }} />
    </div>
  );
}

function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cards = [
    { title: "Expected Points Added (EPA)", desc: "How much did a single play help or hurt a team's chance of scoring, based on down, distance, and field position — not just raw yards?" },
    { title: "EPA per Play", desc: "A player's average impact per snap — a measure of efficiency, regardless of how many plays they were on the field for." },
    { title: "Success Rate", desc: "The percentage of plays that gained enough yardage to keep the offense \"on schedule\" for that down and distance." },
    { title: "Recent Form", desc: "Compares a player's last 4 weeks to others at their position, shrunk toward the average to avoid small-sample noise." },
  ];
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-panel p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">What do these stats mean?</h3>
              <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-white/5 hover:text-white">
                <X size={18} />
              </button>
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

function plainSummary(p: Player | ThisWeekData["top_performer"]): string {
  if (p.role === "passer") {
    return `${p.player_name} had a big game, completing ${p.completions} of ${p.plays} passes for ${p.yards} yards and ${p.touchdowns} touchdown${p.touchdowns === 1 ? "" : "s"}${p.turnovers > 0 ? `, though he did throw ${p.turnovers} interception${p.turnovers === 1 ? "" : "s"}` : ""}. It was the best performance by any quarterback this week.`;
  }
  if (p.role === "rusher") {
    return `${p.player_name} ran the ball ${p.plays} times for ${p.yards} yards and ${p.touchdowns} touchdown${p.touchdowns === 1 ? "" : "s"}. No other running back had a bigger impact on the ground this week.`;
  }
  return `${p.player_name} caught ${p.completions} of ${p.plays} targets for ${p.yards} yards and ${p.touchdowns} touchdown${p.touchdowns === 1 ? "" : "s"}. It was the standout receiving performance of the week.`;
}

function NarrativeLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pos/10 text-pos">
        {icon}
      </div>
      <p className="text-base leading-relaxed text-white/85 sm:text-lg">{children}</p>
    </div>
  );
}

function PlayerCard({ p, index }: { p: Player; index: number }) {
  const [open, setOpen] = useState(false);
  const team = TEAM_INFO[p.team] ?? { name: p.team, color: "#2ecc71", logo: "" };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
      onClick={() => setOpen(!open)}
      className="relative cursor-pointer overflow-hidden rounded-2xl border border-line bg-panel p-6 text-center transition hover:border-white/20"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: team.color }} />
      <div className="mx-auto mb-3 w-fit rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-muted">
        {p.role}
      </div>
      <div
        className="mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full border-2"
        style={{ borderColor: team.color, boxShadow: `0 0 20px -4px ${team.color}` }}
      >
        {p.headshot_url && <img src={p.headshot_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="text-2xl font-extrabold text-pos">{fmtEpa(p.total_epa)}</div>
      <div className="mt-1 text-sm font-bold text-white">{p.player_name}</div>
      <div className="text-xs text-muted">{team.name}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.1em] text-muted/60">
        {open ? "Tap to close" : "Tap for summary"}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden text-left"
          >
            <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              {plainSummary(p)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ThisWeek() {
  const { data, loading, error } = useThisWeek();
  const [teamFilter, setTeamFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted">Loading this week's data…</div>;
  if (error || !data) return <div className="flex min-h-screen items-center justify-center text-danger">Couldn't load this_week.json.</div>;

  const top = data.top_performer;
  const topTeam = TEAM_INFO[top.team] ?? { name: top.team, color: "#2ecc71", logo: "" };

  const teams = [...new Set(data.full_week.map((p) => p.team))].sort((a, b) =>
    (TEAM_INFO[a]?.name ?? a).localeCompare(TEAM_INFO[b]?.name ?? b)
  );
  const filtered = data.full_week.filter(
    (p) => (!teamFilter || p.team === teamFilter) && (!roleFilter || p.role === roleFilter)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(pageSafe * PAGE_SIZE, (pageSafe + 1) * PAGE_SIZE);

  const changeFilter = (setter: (v: string) => void, val: string) => {
    setter(val);
    setPage(0);
  };

  return (
    <div className="min-h-screen">
      <AmbientBackground color={topTeam.color} />
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
        <div className="flex items-center justify-between">
          <Reveal><SectionLabel>{data.season} · Week {data.week}</SectionLabel></Reveal>
          <Reveal>
            <button
              onClick={() => setInfoOpen(true)}
              aria-label="What do these stats mean?"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-muted transition hover:border-pos/50 hover:text-pos"
            >
              <Info size={18} />
            </button>
          </Reveal>
        </div>

        <Reveal><SectionTitle>Every player, ranked by value added</SectionTitle></Reveal>

        <Reveal delay={0.05} className="mt-8 space-y-4 rounded-2xl border border-line bg-panel/60 p-6">
          <NarrativeLine icon={<Trophy size={16} />}>
            <span className="font-bold text-white">{top.player_name}</span> was the standout of the week
            {top.opponent
              ? ` — ${fmtEpa(top.total_epa)} EPA for ${top.team} vs ${top.opponent} (${top.team_score}-${top.opp_score}).`
              : ` — ${fmtEpa(top.total_epa)} EPA across ${top.plays} plays.`}
          </NarrativeLine>
          {data.form_leader && (
            <NarrativeLine icon={<Flame size={16} />}>
              <span className="font-bold text-white">{data.form_leader.player_name}</span> leads the league
              over the last 4 weeks at {TEAM_INFO[data.form_leader.team]?.name ?? data.form_leader.team}.
            </NarrativeLine>
          )}
          {data.debutant && (
            <NarrativeLine icon={<Star size={16} />}>
              <span className="font-bold text-white">{data.debutant.player_name}</span> for{" "}
              {TEAM_INFO[data.debutant.team]?.name ?? data.debutant.team} makes their first Team of the Week
              of the season{data.debutant_count > 1 ? `, one of ${data.debutant_count} debutants this round.` : "."}
            </NarrativeLine>
          )}
          <div className="rounded-xl border-l-2 border-pos bg-pos/5 p-4 text-sm text-muted">
            Since last week: {data.held_count} of {data.total_slots} slots held their place
            ({data.total_slots - data.held_count} changed hands), and {data.debutant_count} player
            {data.debutant_count === 1 ? "" : "s"} made their first Team of the Week of the season.
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex flex-col items-center gap-6 p-7 sm:flex-row sm:items-start">
            <div
              className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2"
              style={{ borderColor: topTeam.color, boxShadow: `0 0 24px -4px ${topTeam.color}` }}
            >
              {top.headshot_url && <img src={top.headshot_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-pos">Player of the Week</div>
              <div className="mb-2 text-xl font-bold text-white">{top.player_name} · {topTeam.name}</div>
              <p className="text-sm leading-relaxed text-muted">{plainSummary(top)}</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <SectionTitle>Team of the Week</SectionTitle>
          <p className="mt-2 text-sm text-muted">Best raw EPA performance per role · minimum 10 plays · click a card for a plain-English recap</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {data.team_of_week.map((p, i) => (
              <PlayerCard key={p.player_id} p={p} index={i} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.2} className="mt-14">
          <SectionTitle>Full Week Stats</SectionTitle>
          <div className="mt-5 mb-4 flex flex-wrap items-center gap-3">
            <select
              value={teamFilter}
              onChange={(e) => changeFilter(setTeamFilter, e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white"
            >
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t} value={t}>{TEAM_INFO[t]?.name ?? t}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => changeFilter(setRoleFilter, e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white"
            >
              <option value="">All Roles</option>
              <option value="passer">Passer</option>
              <option value="rusher">Rusher</option>
              <option value="receiver">Receiver</option>
            </select>
            <span className="ml-auto text-xs text-muted">
              Showing {pageSafe * PAGE_SIZE + 1}–{Math.min((pageSafe + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} players
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel text-left text-xs uppercase text-muted">
                  <th className="p-3"></th>
                  <th className="p-3">Player</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Plays</th>
                  <th className="p-3">Total EPA</th>
                  <th className="p-3">EPA/Play</th>
                  <th className="p-3">Success</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const t = TEAM_INFO[p.team] ?? { name: p.team, logo: "" };
                  const cls = p.total_epa >= 0 ? "text-pos" : "text-danger";
                  return (
                    <tr key={`${p.player_id}-${p.role}`} className="border-b border-line/50 hover:bg-white/[0.02]">
                      <td className="p-3">
                        {p.headshot_url && <img src={p.headshot_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
                      </td>
                      <td className="p-3 text-white">{p.player_name}</td>
                      <td className="p-3 text-muted">{t.name}</td>
                      <td className="p-3 text-muted">{p.role}</td>
                      <td className="p-3 text-muted">{p.plays}</td>
                      <td className={`p-3 font-semibold ${cls}`}>{fmtEpa(p.total_epa)}</td>
                      <td className={`p-3 font-semibold ${cls}`}>{fmtEpa(p.epa_per_play)}</td>
                      <td className="p-3 text-muted">{Math.round(p.success_rate * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={pageSafe === 0}
              className="flex items-center gap-1 rounded-full border border-line px-4 py-2 text-sm text-white transition hover:border-pos/50 hover:bg-pos/5 disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm text-muted">Page {pageSafe + 1} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={pageSafe >= totalPages - 1}
              className="flex items-center gap-1 rounded-full border border-line px-4 py-2 text-sm text-white transition hover:border-pos/50 hover:bg-pos/5 disabled:opacity-30"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}