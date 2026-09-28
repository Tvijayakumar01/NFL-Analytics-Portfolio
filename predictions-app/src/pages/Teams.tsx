import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line, Legend } from "recharts";
import { Swords, ChevronDown } from "lucide-react";
import { useTeamsData, type LeagueTeam, type RosterPlayer } from "../lib/teamsData";
import { teamGradient, visibleColor, inkColor } from "../lib/color";
import { Container, PageHero, SectionHeader } from "../components/Page";
import Reveal from "../components/Reveal";
import { InfoModal, InfoButton } from "../components/InfoModal";
import { LoadingState, ErrorState } from "../components/PageState";
import { TeamLogo } from "../components/sports";
import { team, nickname, signed } from "../lib/format";

const EASE = [0.16, 1, 0.3, 1] as const;
const GRID = "#e6eaf0";
const AXIS_TICK = { fontSize: 12, fill: "#5a6577" };

const INFO_ITEMS = [
  { title: "Off EPA/Play", desc: "Average points added per offensive play, season-to-date. Higher is better." },
  { title: "Def EPA/Play Allowed", desc: "Average points the defense allows opponents to add per play. Lower (more negative) is better." },
  { title: "Net EPA/Play", desc: "Offense minus defense allowed — the single best summary of overall team strength." },
  { title: "Recent Form", desc: "A shrunk, position-adjusted rolling average over the last 4 weeks — who's hot or cold right now." },
  { title: "Limitation", desc: "These numbers don't adjust for strength of schedule — a great week against a weak defense looks the same as one against an elite defense." },
];

const byName = (a: LeagueTeam, b: LeagueTeam) => team(a.team).name.localeCompare(team(b.team).name);

/* ---------------- Standings ---------------- */

function ConferenceTable({ label, teams, onPick }: { label: string; teams: LeagueTeam[]; onPick: (code: string) => void }) {
  const sorted = [...teams].sort((a, b) => b.net_epa_per_play - a.net_epa_per_play);
  return (
    <div className="card overflow-hidden">
      <div className="stripes flex items-center justify-between bg-navy px-5 py-3 text-white">
        <span className="headline text-2xl">{label}</span>
        <span className="font-display text-xs font-bold uppercase tracking-wider text-white/55">Sorted by net EPA</span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">Rk</th>
              <th>Team</th>
              <th className="text-right!">Off</th>
              <th className="text-right!">Def</th>
              <th className="text-right!">Net</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={row.team} onClick={() => onPick(row.team)} className="cursor-pointer">
                <td className="stat text-lg text-sub">{i + 1}</td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <TeamLogo code={row.team} className="h-7 w-7" />
                    <span className="font-semibold text-ink">{team(row.team).name}</span>
                  </div>
                </td>
                <td className="stat text-right text-base text-ink">{signed(row.off_epa_per_play, 2)}</td>
                <td className="stat text-right text-base text-ink">{signed(row.def_epa_per_play_allowed, 2)}</td>
                <td className={`stat text-right text-lg ${row.net_epa_per_play >= 0 ? "text-pos" : "text-neg"}`}>{signed(row.net_epa_per_play)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Scatter ---------------- */

function TooltipShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-white p-3 text-xs shadow-xl">{children}</div>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TooltipShell>
      <div className="mb-1.5 flex items-center gap-2 font-semibold text-ink">
        <TeamLogo code={d.team} className="h-5 w-5" /> {team(d.team).name}
      </div>
      <div className="text-sub">Off EPA/Play: <span className="font-semibold text-ink tabular-nums">{d.x.toFixed(3)}</span></div>
      <div className="text-sub">Defensive Strength: <span className="font-semibold text-ink tabular-nums">{d.y.toFixed(3)}</span></div>
    </TooltipShell>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LogoDot({ cx, cy, payload }: any) {
  if (cx == null || cy == null) return null;
  const logo = team(payload?.team).logo;
  const s = 30;
  return (
    <g>
      <circle cx={cx} cy={cy} r={s / 2} fill="#fff" stroke="#d5dbe3" />
      {logo && <image href={logo} x={cx - s / 2 + 4} y={cy - s / 2 + 4} width={s - 8} height={s - 8} />}
    </g>
  );
}

function OffDefScatter({ league }: { league: LeagueTeam[] }) {
  const points = league.map((r) => ({ team: r.team, x: r.off_epa_per_play, y: -r.def_epa_per_play_allowed }));
  const avgX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
  const best = [...points].sort((a, b) => (b.x + b.y) - (a.x + a.y))[0];
  const worst = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y))[0];

  return (
    <div className="card p-4 sm:p-6">
      <div className="relative">
        <span className="pointer-events-none absolute right-6 top-3 z-10 rounded bg-pos/10 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-pos">Elite both ways</span>
        <span className="pointer-events-none absolute bottom-14 left-16 z-10 rounded bg-neg/10 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-neg">Struggling</span>
        <ResponsiveContainer width="100%" height={460}>
          <ScatterChart margin={{ top: 20, right: 24, bottom: 28, left: 4 }}>
            <CartesianGrid stroke={GRID} />
            <XAxis type="number" dataKey="x" name="Off EPA/Play" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)}
              label={{ value: "BETTER OFFENSE →", position: "insideBottom", offset: -16, fill: "#5a6577", fontSize: 12, fontWeight: 700 }} />
            <YAxis type="number" dataKey="y" name="Defensive Strength" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)}
              label={{ value: "BETTER DEFENSE →", angle: -90, position: "insideLeft", offset: 14, fill: "#5a6577", fontSize: 12, fontWeight: 700 }} />
            <ReferenceLine x={avgX} stroke="#0a1931" strokeOpacity={0.35} strokeDasharray="5 5" />
            <ReferenceLine y={avgY} stroke="#0a1931" strokeOpacity={0.35} strokeDasharray="5 5" />
            <Tooltip content={<ScatterTooltip />} cursor={{ stroke: "#c5ccd6" }} />
            <Scatter data={points} shape={<LogoDot />} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 border-t border-line px-1 pt-4 text-sm leading-relaxed text-sub">
        <span className="font-semibold text-ink">{team(best.team).name}</span> rate as the most well-rounded team this season.
        On the other end, <span className="font-semibold text-ink">{team(worst.team).name}</span> have the furthest to go on both sides of the ball.
      </p>
    </div>
  );
}

/* ---------------- Head to head ---------------- */

function h2hStory(rowA: LeagueTeam, rowB: LeagueTeam): string {
  const nameA = team(rowA.team).name;
  const nameB = team(rowB.team).name;
  const better = rowA.net_epa_per_play >= rowB.net_epa_per_play ? rowA : rowB;
  const worse = better === rowA ? rowB : rowA;
  const betterName = team(better.team).name;
  const worseName = team(worse.team).name;
  const offEdgeTeam = rowA.off_epa_per_play >= rowB.off_epa_per_play ? nameA : nameB;
  const defEdgeTeam = rowA.def_epa_per_play_allowed <= rowB.def_epa_per_play_allowed ? nameA : nameB;
  const gap = Math.abs(rowA.net_epa_per_play - rowB.net_epa_per_play).toFixed(3);

  return `Based on this season's numbers, ${betterName} rates as the stronger team overall — a net EPA edge of ${gap} points per play over ${worseName}. ${offEdgeTeam} has been the more productive offense, while ${defEdgeTeam} has been the tougher defense to move the ball against. If these two met today, ${betterName}'s all-around balance would likely give them the edge, though a big day from ${worseName === offEdgeTeam ? worseName + "'s offense" : worseName + "'s defense"} could keep it competitive.`;
}

function CompareRow({ label, a, b, colorA, colorB, lowerIsBetter = false }: {
  label: string; a: number; b: number; colorA: string; colorB: string; lowerIsBetter?: boolean;
}) {
  const scale = (v: number) => Math.min(Math.max(((lowerIsBetter ? -v : v) + 0.3) / 0.6, 0.04), 1);
  const aBetter = lowerIsBetter ? a < b : a > b;
  return (
    <div className="py-3.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        <span className={`stat text-3xl ${aBetter ? "text-ink" : "text-sub/60"}`}>{signed(a)}</span>
        <span className="eyebrow text-center text-[12px]">{label}</span>
        <span className={`stat text-right text-3xl ${!aBetter ? "text-ink" : "text-sub/60"}`}>{signed(b)}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <div className="flex justify-end overflow-hidden rounded-l-full bg-page">
          <motion.div className="h-2.5 rounded-l-full" style={{ backgroundColor: colorA, opacity: aBetter ? 1 : 0.35 }} animate={{ width: `${scale(a) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
        </div>
        <div className="overflow-hidden rounded-r-full bg-page">
          <motion.div className="h-2.5 rounded-r-full" style={{ backgroundColor: colorB, opacity: !aBetter ? 1 : 0.35 }} animate={{ width: `${scale(b) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
        </div>
      </div>
    </div>
  );
}

function TeamPickerHead({ value, onChange, codes, align }: { value: string; onChange: (v: string) => void; codes: LeagueTeam[]; align: "left" | "right" }) {
  const t = team(value);
  return (
    <div className={`relative flex flex-col gap-3 overflow-hidden p-5 text-white ${align === "right" ? "items-end text-right" : ""}`} style={{ background: teamGradient(t.color, align === "right" ? 235 : 125) }}>
      <div className="stripes absolute inset-0" />
      <div className={`relative flex items-center gap-3 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white"><TeamLogo code={value} className="h-10 w-10" /></div>
        <div className="headline text-3xl">{nickname(value)}</div>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="select-field relative w-full max-w-[220px] py-1.5! text-xs!" aria-label={`Choose ${align === "left" ? "first" : "second"} team`}>
        {codes.map((r) => <option key={r.team} value={r.team}>{team(r.team).name}</option>)}
      </select>
    </div>
  );
}

function HeadToHead({ league }: { league: LeagueTeam[] }) {
  const codes = [...league].sort(byName);
  const [a, setA] = useState(codes[0]?.team ?? "");
  const [b, setB] = useState(codes[1]?.team ?? "");
  const rowA = league.find((r) => r.team === a);
  const rowB = league.find((r) => r.team === b);
  const colorA = inkColor(team(a).color);
  const colorB = inkColor(team(b).color);

  return (
    <div className="card overflow-hidden">
      <div className="relative grid grid-cols-2">
        <TeamPickerHead value={a} onChange={setA} codes={codes} align="left" />
        <TeamPickerHead value={b} onChange={setB} codes={codes} align="right" />
        <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-navy text-white ring-4 ring-white">
          <Swords size={18} />
        </div>
      </div>
      {rowA && rowB && (
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="divide-y divide-line">
            <CompareRow label="Off EPA / play" a={rowA.off_epa_per_play} b={rowB.off_epa_per_play} colorA={colorA} colorB={colorB} />
            <CompareRow label="Def EPA allowed" a={rowA.def_epa_per_play_allowed} b={rowB.def_epa_per_play_allowed} colorA={colorA} colorB={colorB} lowerIsBetter />
            <CompareRow label="Net EPA / play" a={rowA.net_epa_per_play} b={rowB.net_epa_per_play} colorA={colorA} colorB={colorB} />
          </div>
          <div className="rounded-xl bg-page p-5">
            <div className="eyebrow mb-2">The verdict</div>
            <p className="text-[15px] leading-relaxed text-ink/80">{h2hStory(rowA, rowB)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Club profile ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipShell>
      <div className="mb-1 font-semibold text-ink">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.name} className="text-sub">
          {p.name}: <span className="font-semibold tabular-nums" style={{ color: p.color }}>{p.value != null ? p.value.toFixed(3) : "—"}</span>
        </div>
      ))}
    </TooltipShell>
  );
}

function formTier(z: number | null) {
  if (z === null) return { label: "No recent data", cls: "bg-page text-sub" };
  if (z >= 1.0) return { label: "Elite", cls: "bg-pos/10 text-pos" };
  if (z >= 0.5) return { label: "Great", cls: "bg-pos/10 text-pos" };
  if (z >= -0.5) return { label: "Good", cls: "bg-page text-ink" };
  if (z >= -1.0) return { label: "Below Avg", cls: "bg-gold/10 text-gold" };
  return { label: "Struggling", cls: "bg-neg/10 text-neg" };
}

function PlayerRow({ p, index, teamColor, leagueAvgByRole }: {
  p: RosterPlayer; index: number; teamColor: string;
  leagueAvgByRole: Record<string, { week: number; league_avg_epa: number }[]>;
}) {
  const [open, setOpen] = useState(false);
  const tier = formTier(p.form_z_score);
  const tdLabel = p.role === "passer" ? "Pass TD" : p.role === "rusher" ? "Rush TD" : "Rec TD";
  const toLabel = p.role === "passer" ? "INT" : "Fumbles";

  const chartData = p.weekly.map((w) => {
    const avgRow = (leagueAvgByRole[p.role] ?? []).find((a) => a.week === w.week);
    return { week: `Wk ${w.week}`, player: w.total_epa, league: avgRow?.league_avg_epa ?? null };
  });

  return (
    <div className={`border-b border-line last:border-b-0 ${open ? "bg-[#fafbfc]" : ""}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-page sm:px-5">
        <span className="stat w-6 text-center text-lg text-sub">{index + 1}</span>
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-page ring-2" style={{ ["--tw-ring-color" as string]: teamColor }}>
          {p.headshot_url && <img src={p.headshot_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{p.player_name}</div>
          <div className="text-xs capitalize text-sub">{p.position ?? p.role} · {p.season_plays} plays</div>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-4">
          <span className={`hidden rounded px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider sm:inline ${tier.cls}`}>{tier.label}</span>
          <span className={`stat text-xl ${p.season_total_epa >= 0 ? "text-pos" : "text-neg"}`}>{signed(p.season_total_epa, 1)}</span>
          <ChevronDown size={16} className={`text-sub transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
            <div className="px-4 pb-5 sm:px-5">
              <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-7">
                {[
                  ["Total EPA", signed(p.season_total_epa, 2)],
                  ["EPA/Play", signed(p.season_epa_per_play, 3)],
                  ["Plays", String(p.season_plays)],
                  ["Yards", String(p.season_yards)],
                  [tdLabel, String(p.season_touchdowns)],
                  [toLabel, String(p.season_turnovers)],
                  ...(p.role !== "rusher" ? [[p.role === "passer" ? "Comp" : "Rec", String(p.season_completions)]] : []),
                ].map(([label, val]) => (
                  <div key={label} className="rounded-lg border border-line bg-white p-2.5 text-center">
                    <div className="stat text-xl text-ink">{val}</div>
                    <div className="eyebrow text-[10.5px]">{label}</div>
                  </div>
                ))}
              </div>
              {chartData.length > 1 && (
                <div className="rounded-lg border border-line bg-white p-3">
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(1)} />
                      <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#c5ccd6" }} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                      <ReferenceLine y={0} stroke="#0a1931" strokeOpacity={0.2} />
                      <Line type="monotone" dataKey="player" name={p.player_name} stroke={teamColor} strokeWidth={3}
                        dot={{ r: 3.5, fill: teamColor, strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="league" name={`League avg (${p.role})`} stroke="#9aa3b2" strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClubProfile({ league, rosters, leagueAvgByRole, selected, setSelected }: {
  league: LeagueTeam[]; rosters: Record<string, RosterPlayer[]>;
  leagueAvgByRole: Record<string, { week: number; league_avg_epa: number }[]>;
  selected: string; setSelected: (v: string) => void;
}) {
  const codes = [...league].sort(byName);
  const [roleFilter, setRoleFilter] = useState<string[]>(["passer", "rusher", "receiver"]);

  const t = team(selected);
  const color = inkColor(t.color);
  const row = league.find((r) => r.team === selected);
  const rank = [...league].sort((x, y) => y.net_epa_per_play - x.net_epa_per_play).findIndex((r) => r.team === selected) + 1;
  const roster = (rosters[selected] ?? []).filter((p) => roleFilter.includes(p.role));

  const toggleRole = (role: string) => {
    setRoleFilter((cur) => (cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role]));
  };

  return (
    <div className="card overflow-hidden">
      <div className="relative overflow-hidden p-6 text-white sm:p-8" style={{ background: teamGradient(t.color) }}>
        <div className="stripes absolute inset-0" />
        {t.logo && <img src={t.logo} alt="" className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 object-contain opacity-15" />}
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white shadow-lg">
              <TeamLogo code={selected} className="h-16 w-16" />
            </div>
            <div>
              <div className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white/65">{t.conference} {t.division}</div>
              <h3 className="headline text-4xl sm:text-5xl">{t.name}</h3>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="select-field mt-3 py-1.5! text-xs!" aria-label="Choose a team">
                {codes.map((r) => <option key={r.team} value={r.team}>{team(r.team).name}</option>)}
              </select>
            </div>
          </div>
          {row && (
            <div className="grid grid-cols-4 gap-2 rounded-xl bg-black/20 p-3 backdrop-blur-sm">
              {[
                ["Rank", `#${rank}`],
                ["Off", signed(row.off_epa_per_play, 2)],
                ["Def", signed(row.def_epa_per_play_allowed, 2)],
                ["Net", signed(row.net_epa_per_play, 2)],
              ].map(([l, v]) => (
                <div key={l} className="px-2 text-center">
                  <div className="stat text-3xl">{v}</div>
                  <div className="font-display text-xs font-bold uppercase tracking-wider text-white/60">{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="eyebrow mr-2">Roster</span>
        {["passer", "rusher", "receiver"].map((role) => (
          <button key={role} onClick={() => toggleRole(role)} aria-pressed={roleFilter.includes(role)} className="tab py-1!">
            {role}s
          </button>
        ))}
        <span className="ml-auto text-xs text-sub">{roster.length} qualifying players · tap to expand</span>
      </div>

      <div>
        {roster.map((p, i) => (
          <PlayerRow key={`${p.player_id}-${p.role}`} p={p} index={i} teamColor={color} leagueAvgByRole={leagueAvgByRole} />
        ))}
        {roster.length === 0 && <div className="p-8 text-center text-sm text-sub">Select at least one role to see players.</div>}
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function Teams() {
  const { data, loading, error } = useTeamsData();
  const [infoOpen, setInfoOpen] = useState(false);
  const [clubSelected, setClubSelected] = useState<string>("");

  if (loading) return <LoadingState label="Loading team data…" />;
  if (error || !data) return <ErrorState message="Couldn't load teams.json." />;

  const selected = clubSelected || [...data.league].sort(byName)[0]?.team;
  const afcTeams = data.league.filter((r) => team(r.team).conference === "AFC");
  const nfcTeams = data.league.filter((r) => team(r.team).conference === "NFC");

  const pickClub = (code: string) => {
    setClubSelected(code);
    document.getElementById("club")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title="Stat Glossary" items={INFO_ITEMS} />
      <PageHero
        eyebrow={`${data.season} Season · All 32 Teams`}
        title="Locker Room"
        lede="Season-to-date offensive and defensive efficiency for every club — rankings, matchups, and full rosters."
        color={visibleColor(team(selected).color)}
        action={<InfoButton onClick={() => setInfoOpen(true)} label="How to read this page" />}
      />

      <Container className="pt-10">
        <Reveal>
          <SectionHeader title="Standings by Efficiency" sub="Tap any team to open its club profile." />
          <div className="grid gap-5 lg:grid-cols-2">
            <ConferenceTable label="AFC" teams={afcTeams} onPick={pickClub} />
            <ConferenceTable label="NFC" teams={nfcTeams} onPick={pickClub} />
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <SectionHeader
            title="Offense vs. Defense"
            sub="Each logo is a team. Dashed lines mark the league average — top-right is strong on both sides of the ball."
          />
          <OffDefScatter league={data.league} />
        </Reveal>

        <Reveal className="mt-14">
          <SectionHeader title="Tale of the Tape" sub="Pick any two teams and compare them side by side." />
          <HeadToHead league={data.league} />
        </Reveal>

        <div id="club" className="mt-14 scroll-mt-24">
          <SectionHeader title={`Club Profile · ${nickname(selected)}`} />
          <ClubProfile
            league={data.league}
            rosters={data.rosters}
            leagueAvgByRole={data.league_avg_by_role}
            selected={selected}
            setSelected={setClubSelected}
          />
        </div>
      </Container>
    </>
  );
}
