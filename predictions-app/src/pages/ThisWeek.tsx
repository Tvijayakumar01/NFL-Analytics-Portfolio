import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Trophy, Flame, Star, ChevronDown, RefreshCw } from "lucide-react";
import { useThisWeek, type Player } from "../lib/thisWeekData";
import { teamGradient, visibleColor } from "../lib/color";
import { fmtEpa, plainSummary } from "../lib/recap";
import { Container, PageHero, SectionHeader } from "../components/Page";
import Reveal from "../components/Reveal";
import { InfoModal, InfoButton } from "../components/InfoModal";
import { LoadingState, ErrorState } from "../components/PageState";
import { TeamLogo } from "../components/sports";
import { team } from "../lib/format";

const EASE = [0.16, 1, 0.3, 1] as const;
const PAGE_SIZE = 20;

const INFO_ITEMS = [
  { title: "Expected Points Added (EPA)", desc: "How much did a single play help or hurt a team's chance of scoring, based on down, distance, and field position — not just raw yards?" },
  { title: "EPA per Play", desc: "A player's average impact per snap — a measure of efficiency, regardless of how many plays they were on the field for." },
  { title: "Success Rate", desc: "The percentage of plays that gained enough yardage to keep the offense \"on schedule\" for that down and distance." },
  { title: "Recent Form", desc: "Compares a player's last 4 weeks to others at their position, shrunk toward the average to avoid small-sample noise." },
];

function Storyline({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</div>
      <p className="text-[15px] leading-relaxed text-ink/80">{children}</p>
    </div>
  );
}

function TradingCard({ p, index }: { p: Player; index: number }) {
  const [open, setOpen] = useState(false);
  const t = team(p.team);
  const stats: [string, string | number][] = [["Yards", p.yards], ["TD", p.touchdowns], ["Plays", p.plays]];
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: EASE }}
      className="card card-hover overflow-hidden"
    >
      <div className="relative h-44 overflow-hidden text-white" style={{ background: teamGradient(t.color) }}>
        <div className="stripes absolute inset-0" />
        {t.logo && <img src={t.logo} alt="" className="absolute -right-6 -top-6 h-36 w-36 object-contain opacity-20" />}
        <span className="absolute left-4 top-4 rounded bg-black/25 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-[0.14em]">{p.role}</span>
        <div className="absolute bottom-0 left-1/2 h-32 w-32 -translate-x-1/2 translate-y-6 overflow-hidden rounded-full bg-white/20 ring-4 ring-white">
          {p.headshot_url && <img src={p.headshot_url} alt="" className="h-full w-full object-cover" />}
        </div>
      </div>
      <div className="px-5 pb-5 pt-9 text-center">
        <div className="headline text-[1.75rem] text-ink">{p.player_name}</div>
        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-sub">
          <TeamLogo code={p.team} className="h-4 w-4" /> {t.name}
        </div>
        <div className="mt-4 rounded-lg bg-page py-3">
          <div className="stat text-4xl text-pos">{fmtEpa(p.total_epa)}</div>
          <div className="eyebrow mt-1 text-[11px]">Total EPA</div>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-line">
          {stats.map(([l, v]) => (
            <div key={l}>
              <div className="stat text-xl text-ink">{v}</div>
              <div className="eyebrow text-[11px]">{l}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="mt-4 inline-flex items-center gap-1 font-display text-sm font-bold uppercase tracking-wider text-brand"
        >
          {open ? "Hide recap" : "Read recap"}
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden text-left text-sm leading-relaxed text-sub"
            >
              <span className="mt-3 block border-t border-line pt-3">{plainSummary(p)}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export default function ThisWeek() {
  const { data, loading, error } = useThisWeek();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  if (loading) return <LoadingState label="Loading the week…" />;
  if (error || !data) return <ErrorState message="Couldn't load this_week.json." />;

  const weekKeys = Object.keys(data.weeks).map(Number).sort((a, b) => a - b);
  const currentWeek = selectedWeek ?? data.latest_week;
  const weekData = data.weeks[String(currentWeek)];

  if (!weekData) {
    return <ErrorState message={`No data found for Week ${currentWeek}.`} />;
  }

  const top = weekData.top_performer;
  const topTeam = team(top.team);

  const teams = [...new Set(weekData.full_week.map((p) => p.team))].sort((a, b) => team(a).name.localeCompare(team(b).name));
  const filtered = weekData.full_week.filter(
    (p) => (!teamFilter || p.team === teamFilter) && (!roleFilter || p.role === roleFilter)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(pageSafe * PAGE_SIZE, (pageSafe + 1) * PAGE_SIZE);

  const changeFilter = (setter: (v: string) => void, val: string) => {
    setter(val);
    setPage(0);
  };

  const changeWeek = (w: number) => {
    setSelectedWeek(w);
    setTeamFilter("");
    setRoleFilter("");
    setPage(0);
  };

  return (
    <>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title="Stat Glossary" items={INFO_ITEMS} />
      <PageHero
        eyebrow={`${data.season} · Week ${currentWeek} Recap`}
        title="The Snap"
        lede="Every player, ranked by the value they added — the week's standouts, storylines, and full stat sheet."
        color={visibleColor(topTeam.color)}
        action={<InfoButton onClick={() => setInfoOpen(true)} label="What do these stats mean?" />}
      >
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {weekKeys.map((w) => (
            <button key={w} onClick={() => changeWeek(w)} aria-pressed={w === currentWeek} className="tab-dark">
              Week {w}
            </button>
          ))}
        </div>
      </PageHero>

      <AnimatePresence mode="wait">
        <motion.div key={currentWeek} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Container className="pt-10">
            <div className="grid gap-5 lg:grid-cols-12">
              <Reveal className="lg:col-span-7">
                <article className="card grid h-full overflow-hidden sm:grid-cols-[220px_1fr]">
                  <div className="relative flex flex-col items-center justify-center gap-3 p-6 text-white" style={{ background: teamGradient(topTeam.color, 160) }}>
                    <div className="stripes absolute inset-0" />
                    <div className="relative h-32 w-32 overflow-hidden rounded-full bg-white/20 ring-4 ring-white">
                      {top.headshot_url && <img src={top.headshot_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="relative flex items-center gap-1.5 text-xs text-white/80">
                      <TeamLogo code={top.team} className="h-5 w-5" /> {topTeam.name}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="inline-flex items-center gap-1.5 rounded bg-brand px-2 py-1 font-display text-xs font-bold uppercase tracking-[0.12em] text-white">
                      <Trophy size={12} /> Player of the Week
                    </div>
                    <h2 className="headline mt-3 text-4xl text-ink">{top.player_name}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-sub">{plainSummary(top)}</p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-page p-3 text-center">
                        <div className="stat text-3xl text-pos">{fmtEpa(top.total_epa)}</div>
                        <div className="eyebrow text-[11px]">EPA</div>
                      </div>
                      <div className="rounded-lg bg-page p-3 text-center">
                        <div className="stat text-3xl text-ink">{top.yards}</div>
                        <div className="eyebrow text-[11px]">Yards</div>
                      </div>
                      <div className="rounded-lg bg-page p-3 text-center">
                        <div className="stat text-3xl text-ink">{top.opponent ? `${top.team_score}–${top.opp_score}` : top.plays}</div>
                        <div className="eyebrow text-[11px]">{top.opponent ? `vs ${top.opponent}` : "Plays"}</div>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>

              <Reveal delay={0.05} className="lg:col-span-5">
                <div className="card h-full px-5 py-2">
                  <div className="eyebrow border-b border-line py-3">Storylines</div>
                  <div className="divide-y divide-line">
                    <Storyline icon={<Trophy size={16} />}>
                      <span className="font-semibold text-ink">{top.player_name}</span> was the standout of the week
                      {top.opponent
                        ? ` — ${fmtEpa(top.total_epa)} EPA for ${top.team} vs ${top.opponent} (${top.team_score}-${top.opp_score}).`
                        : ` — ${fmtEpa(top.total_epa)} EPA across ${top.plays} plays.`}
                    </Storyline>
                    {weekData.form_leader && (
                      <Storyline icon={<Flame size={16} />}>
                        <span className="font-semibold text-ink">{weekData.form_leader.player_name}</span> leads the league
                        over the last 4 weeks at {team(weekData.form_leader.team).name}.
                      </Storyline>
                    )}
                    {weekData.debutant && (
                      <Storyline icon={<Star size={16} />}>
                        <span className="font-semibold text-ink">{weekData.debutant.player_name}</span> for{" "}
                        {team(weekData.debutant.team).name} makes their first Team of the Week of the season
                        {weekData.debutant_count > 1 ? `, one of ${weekData.debutant_count} debutants this round.` : "."}
                      </Storyline>
                    )}
                    <Storyline icon={<RefreshCw size={16} />}>
                      {currentWeek > 1 ? (
                        <>
                          Since last week: {weekData.held_count} of {weekData.total_slots} slots held their place
                          ({weekData.total_slots - weekData.held_count} changed hands), and {weekData.debutant_count} player
                          {weekData.debutant_count === 1 ? "" : "s"} made their first Team of the Week.
                        </>
                      ) : (
                        <>Week 1 of the season — {weekData.total_slots} Team of the Week slots filled for the first time.</>
                      )}
                    </Storyline>
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal className="mt-14">
              <SectionHeader title="Team of the Week" sub="Best raw EPA performance per role · minimum 10 plays." />
              <div className="grid items-start gap-5 sm:grid-cols-3">
                {weekData.team_of_week.map((p, i) => (
                  <TradingCard key={p.player_id} p={p} index={i} />
                ))}
              </div>
            </Reveal>

            <Reveal className="mt-14">
              <SectionHeader title="Full Week Stats" />
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <select value={teamFilter} onChange={(e) => changeFilter(setTeamFilter, e.target.value)} className="select-field" aria-label="Filter by team">
                  <option value="">All Teams</option>
                  {teams.map((t) => <option key={t} value={t}>{team(t).name}</option>)}
                </select>
                <select value={roleFilter} onChange={(e) => changeFilter(setRoleFilter, e.target.value)} className="select-field" aria-label="Filter by role">
                  <option value="">All Roles</option>
                  <option value="passer">Passer</option>
                  <option value="rusher">Rusher</option>
                  <option value="receiver">Receiver</option>
                </select>
                <span className="ml-auto text-xs text-sub tabular-nums">
                  {filtered.length === 0
                    ? "No players match"
                    : `Showing ${pageSafe * PAGE_SIZE + 1}–${Math.min((pageSafe + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                </span>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Role</th>
                        <th className="text-right!">Plays</th>
                        <th className="text-right!">Total EPA</th>
                        <th className="text-right!">EPA/Play</th>
                        <th className="text-right!">Success</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((p, i) => {
                        const cls = p.total_epa >= 0 ? "text-pos" : "text-neg";
                        return (
                          <tr key={`${p.player_id}-${p.role}`}>
                            <td className="stat text-base text-sub">{pageSafe * PAGE_SIZE + i + 1}</td>
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-page">
                                  {p.headshot_url && <img src={p.headshot_url} alt="" className="h-full w-full object-cover" />}
                                </div>
                                <span className="font-semibold text-ink">{p.player_name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-2 text-sub">
                                <TeamLogo code={p.team} className="h-5 w-5" /> {p.team}
                              </div>
                            </td>
                            <td><span className="rounded bg-page px-2 py-0.5 text-xs capitalize text-sub">{p.role}</span></td>
                            <td className="text-right text-sub tabular-nums">{p.plays}</td>
                            <td className={`stat text-right text-lg ${cls}`}>{fmtEpa(p.total_epa)}</td>
                            <td className={`stat text-right text-lg ${cls}`}>{fmtEpa(p.epa_per_play)}</td>
                            <td className="text-right text-sub tabular-nums">{Math.round(p.success_rate * 100)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={pageSafe === 0} className="btn btn-outline">
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="eyebrow">Page {pageSafe + 1} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} disabled={pageSafe >= totalPages - 1} className="btn btn-outline">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </Reveal>
          </Container>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
