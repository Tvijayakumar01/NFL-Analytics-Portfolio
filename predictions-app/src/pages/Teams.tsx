import { useState } from "react";
import { motion } from "framer-motion";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LineChart, Line, Legend } from "recharts";
import { Swords } from "lucide-react";
import { useTeamsData, type LeagueTeam, type RosterPlayer } from "../lib/teamsData";
import { TEAM_INFO } from "../lib/teams";
import Reveal, { SectionLabel, SectionTitle } from "../components/Reveal";

const fmt = (n: number, d = 3) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

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

function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cards = [
    { title: "Off EPA/Play", desc: "Average points added per offensive play, season-to-date. Higher is better." },
    { title: "Def EPA/Play Allowed", desc: "Average points the defense allows opponents to add per play. Lower (more negative) is better." },
    { title: "Net EPA/Play", desc: "Offense minus defense allowed — the single best summary of overall team strength." },
    { title: "Recent Form", desc: "A shrunk, position-adjusted rolling average over the last 4 weeks — who's hot or cold right now." },
    { title: "Limitation", desc: "These numbers don't adjust for strength of schedule — a great week against a weak defense looks the same as one against an elite defense." },
  ];
  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-panel p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">How to read this page</h3>
              <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-white/5 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              {cards.map((c) => (
                <div key={c.title} className="rounded-lg border-l-2 border-pos bg-white/[0.03] p-4">
                  <div className="mb-1 text-sm font-bold text-white">{c.title}</div>
                  <div className="text-xs leading-relaxed text-muted">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ConferenceTable({ label, teams }: { label: string; teams: LeagueTeam[] }) {
  const sorted = [...teams].sort((a, b) => b.net_epa_per_play - a.net_epa_per_play);
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="border-b border-line bg-panel px-4 py-3 text-sm font-bold text-white">{label}</div>
      <table className="w-full text-sm">
        <tbody>
          {sorted.map((row, i) => {
            const t = TEAM_INFO[row.team] ?? { name: row.team, logo: "" };
            const cls = row.net_epa_per_play >= 0 ? "text-pos" : "text-danger";
            return (
              <tr key={row.team} className="border-b border-line/50 hover:bg-white/[0.02]">
                <td className="p-3 text-muted">{i + 1}</td>
                <td className="p-3"><img src={t.logo} alt="" className="h-6 w-6 object-contain" /></td>
                <td className="p-3 text-white">{t.name}</td>
                <td className={`p-3 text-right font-semibold ${cls}`}>{fmt(row.net_epa_per_play)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const t = TEAM_INFO[d.team];
  return (
    <div className="rounded-lg border border-line bg-panel p-3 text-xs shadow-xl">
      <div className="mb-1 font-bold text-white">{t?.name ?? d.team}</div>
      <div className="text-muted">Off EPA/Play: <span className="font-semibold text-white">{d.x.toFixed(3)}</span></div>
      <div className="text-muted">Defensive Strength: <span className="font-semibold text-white">{d.y.toFixed(3)}</span></div>
    </div>
  );
}

function OffDefScatter({ league }: { league: LeagueTeam[] }) {
  const points = league.map((r) => ({ team: r.team, x: r.off_epa_per_play, y: -r.def_epa_per_play_allowed }));
  const avgX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const avgY = points.reduce((s, p) => s + p.y, 0) / points.length;
  const best = [...points].sort((a, b) => (b.x + b.y) - (a.x + a.y))[0];
  const worst = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y))[0];

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Each dot is a team, plotted by offensive efficiency (left-to-right) against defensive efficiency (bottom-to-top).
        The dashed lines mark the league average on each axis — teams in the <span className="text-pos">top-right</span> quadrant
        are strong on both sides of the ball; teams in the <span className="text-danger">bottom-left</span> are struggling on both.
      </p>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
          <CartesianGrid stroke="#23232b" />
          <XAxis type="number" dataKey="x" name="Off EPA/Play" stroke="#9a9aa5" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Defensive Strength" stroke="#9a9aa5" tick={{ fontSize: 11 }} />
          <ReferenceLine x={avgX} stroke="#555" strokeDasharray="4 4" />
          <ReferenceLine y={avgY} stroke="#555" strokeDasharray="4 4" />
          <Tooltip content={<ScatterTooltip />} />
          <Scatter data={points}>
            {points.map((p) => (
              <Cell key={p.team} fill={TEAM_INFO[p.team]?.color ?? "#2ecc71"} stroke="#fff" strokeWidth={1} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <p className="mt-4 text-sm text-muted">
        <span className="font-bold text-pos">{TEAM_INFO[best.team]?.name ?? best.team}</span> rates as the most well-rounded
        team this season, ranking strong on both offense and defense. On the other end,{" "}
        <span className="font-bold text-danger">{TEAM_INFO[worst.team]?.name ?? worst.team}</span> has the furthest to go on
        both sides of the ball.
      </p>
    </div>
  );
}

function h2hStory(rowA: LeagueTeam, rowB: LeagueTeam): string {
  const nameA = TEAM_INFO[rowA.team]?.name ?? rowA.team;
  const nameB = TEAM_INFO[rowB.team]?.name ?? rowB.team;
  const better = rowA.net_epa_per_play >= rowB.net_epa_per_play ? rowA : rowB;
  const worse = better === rowA ? rowB : rowA;
  const betterName = TEAM_INFO[better.team]?.name ?? better.team;
  const worseName = TEAM_INFO[worse.team]?.name ?? worse.team;
  const offEdgeTeam = rowA.off_epa_per_play >= rowB.off_epa_per_play ? nameA : nameB;
  const defEdgeTeam = rowA.def_epa_per_play_allowed <= rowB.def_epa_per_play_allowed ? nameA : nameB;
  const gap = Math.abs(rowA.net_epa_per_play - rowB.net_epa_per_play).toFixed(3);

  return `Based on this season's numbers, ${betterName} rates as the stronger team overall — a net EPA edge of ${gap} points per play over ${worseName}. ${offEdgeTeam} has been the more productive offense, while ${defEdgeTeam} has been the tougher defense to move the ball against. If these two met today, ${betterName}'s all-around balance would likely give them the edge, though a big day from ${worseName === offEdgeTeam ? worseName + "'s offense" : worseName + "'s defense"} could keep it competitive.`;
}

function HeadToHead({ league }: { league: LeagueTeam[] }) {
  const codes = [...league].sort((a, b) => (TEAM_INFO[a.team]?.name ?? "").localeCompare(TEAM_INFO[b.team]?.name ?? ""));
  const [a, setA] = useState(codes[0]?.team ?? "");
  const [b, setB] = useState(codes[1]?.team ?? "");

  const rowA = league.find((r) => r.team === a);
  const rowB = league.find((r) => r.team === b);

  const Panel = ({ row, other }: { row?: LeagueTeam; other?: LeagueTeam }) => {
    if (!row || !other) return null;
    const t = TEAM_INFO[row.team] ?? { name: row.team, color: "#2ecc71", logo: "" };
    return (
      <div className="overflow-hidden rounded-2xl border border-line" style={{ borderLeftColor: t.color, borderLeftWidth: 4 }}>
        <div className="bg-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <img src={t.logo} alt="" className="h-9 w-9 object-contain" />
            <h3 className="text-lg font-bold text-white">{t.name}</h3>
          </div>
          {[
            { label: "Off EPA/Play", val: row.off_epa_per_play, delta: row.off_epa_per_play - other.off_epa_per_play },
            { label: "Def EPA/Play Allowed", val: row.def_epa_per_play_allowed, delta: other.def_epa_per_play_allowed - row.def_epa_per_play_allowed },
            { label: "Net EPA/Play", val: row.net_epa_per_play, delta: row.net_epa_per_play - other.net_epa_per_play },
          ].map((s) => (
            <div key={s.label} className="mb-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted">{s.label}</div>
              <div className="text-2xl font-bold text-white">{fmt(s.val)}</div>
              <div className="text-xs text-muted">{fmt(s.delta)} vs opponent</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-5 flex gap-3">
        <select value={a} onChange={(e) => setA(e.target.value)} className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white">
          {codes.map((r) => <option key={r.team} value={r.team}>{TEAM_INFO[r.team]?.name ?? r.team}</option>)}
        </select>
        <select value={b} onChange={(e) => setB(e.target.value)} className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white">
          {codes.map((r) => <option key={r.team} value={r.team}>{TEAM_INFO[r.team]?.name ?? r.team}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel row={rowA} other={rowB} />
        <Panel row={rowB} other={rowA} />
      </div>
      {rowA && rowB && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-panel/60 p-5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pos/10 text-pos">
            <Swords size={16} />
          </div>
          <p className="text-sm leading-relaxed text-white/85">{h2hStory(rowA, rowB)}</p>
        </div>
      )}
    </div>
  );
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-line bg-panel p-3 text-xs shadow-xl">
      <div className="mb-1 font-bold text-white">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="text-muted">
          {p.name}: <span className="font-semibold" style={{ color: p.color }}>{p.value != null ? p.value.toFixed(3) : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function formTier(z: number | null) {
  if (z === null) return { label: "No recent data", cls: "text-muted", dot: "bg-line" };
  if (z >= 1.0) return { label: "Elite", cls: "text-pos", dot: "bg-pos" };
  if (z >= 0.5) return { label: "Great", cls: "text-pos", dot: "bg-pos" };
  if (z >= -0.5) return { label: "Good", cls: "text-white", dot: "bg-white/40" };
  if (z >= -1.0) return { label: "Below Average", cls: "text-gold", dot: "bg-gold" };
  return { label: "Struggled", cls: "text-danger", dot: "bg-danger" };
}

function PlayerRow({ p, index, teamColor, leagueAvgByRole }: {
  p: RosterPlayer; index: number; teamColor: string;
  leagueAvgByRole: Record<string, { week: number; league_avg_epa: number }[]>;
}) {
  const [open, setOpen] = useState(false);
  const tier = formTier(p.form_z_score);
  const tdLabel = p.role === "passer" ? "Passing TDs" : p.role === "rusher" ? "Rushing TDs" : "Receiving TDs";
  const toLabel = p.role === "passer" ? "Interceptions" : "Fumbles Lost";

  const chartData = p.weekly.map((w) => {
    const avgRow = (leagueAvgByRole[p.role] ?? []).find((a) => a.week === w.week);
    return { week: `Wk ${w.week}`, player: w.total_epa, league: avgRow?.league_avg_epa ?? null };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
      className="overflow-hidden rounded-xl border border-line bg-panel transition-shadow hover:shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)]"
      style={{ borderLeftColor: teamColor, borderLeftWidth: 4 }}
    >
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left text-sm transition hover:bg-white/[0.02]">
        <span className="w-5 shrink-0 text-muted">{index + 1}.</span>
        <span className="font-bold text-white">{p.player_name}</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">{p.role}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className={`hidden items-center gap-1.5 text-[11px] font-semibold sm:flex ${tier.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
            {tier.label}
          </span>
          <span className="font-bold text-pos">{fmt(p.season_total_epa, 2)}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-line p-5">
          <div className="mb-4 flex items-center gap-4">
            {p.headshot_url && <img src={p.headshot_url} alt="" className="h-16 w-16 rounded-full object-cover" />}
            <div className="text-sm text-muted">
              <div>Position: {p.position ?? "—"}</div>
              <div className="flex items-center gap-1.5">
                Recent form: <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} /> <span className={tier.cls}>{tier.label}</span>
              </div>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {[
              ["Total EPA", fmt(p.season_total_epa, 2)],
              ["EPA/Play", fmt(p.season_epa_per_play, 3)],
              ["Plays", String(p.season_plays)],
              ["Yards", String(p.season_yards)],
              [tdLabel, String(p.season_touchdowns)],
              [toLabel, String(p.season_turnovers)],
              ...(p.role !== "rusher" ? [[p.role === "passer" ? "Completions" : "Receptions", String(p.season_completions)]] : []),
            ].map(([label, val]) => (
              <div key={label} className="rounded-lg bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-bold text-white">{val}</div>
                <div className="text-[10px] text-muted">{label}</div>
              </div>
            ))}
          </div>
          {chartData.length > 1 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#23232b" />
                <XAxis dataKey="week" stroke="#9a9aa5" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9a9aa5" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip content={<TrendTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="player" name={p.player_name} stroke={teamColor} strokeWidth={2} dot />
                <Line type="monotone" dataKey="league" name={`League avg (${p.role})`} stroke="#666" strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ClubProfile({ league, rosters, leagueAvgByRole, selected, setSelected }: {
  league: LeagueTeam[]; rosters: Record<string, RosterPlayer[]>;
  leagueAvgByRole: Record<string, { week: number; league_avg_epa: number }[]>;
  selected: string; setSelected: (v: string) => void;
}) {
  const codes = [...league].sort((a, b) => (TEAM_INFO[a.team]?.name ?? "").localeCompare(TEAM_INFO[b.team]?.name ?? ""));
  const [roleFilter, setRoleFilter] = useState<string[]>(["passer", "rusher", "receiver"]);

  const t = TEAM_INFO[selected] ?? { name: selected, color: "#2ecc71", logo: "" };
  const roster = (rosters[selected] ?? []).filter((p) => roleFilter.includes(p.role));
  const epaVals = roster.map((r) => r.season_total_epa);
  const median = epaVals.length ? [...epaVals].sort((x, y) => x - y)[Math.floor(epaVals.length / 2)] : 0;
  const mean = epaVals.length ? epaVals.reduce((a, b) => a + b, 0) / epaVals.length : 0;

  const toggleRole = (role: string) => {
    setRoleFilter((cur) => (cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role]));
  };

  return (
    <div>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="mb-6 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-white">
        {codes.map((r) => <option key={r.team} value={r.team}>{TEAM_INFO[r.team]?.name ?? r.team}</option>)}
      </select>

      <div className="mb-6 flex items-center gap-4">
        <div className="h-10 w-1 rounded" style={{ backgroundColor: t.color }} />
        <img src={t.logo} alt="" className="h-12 w-12 object-contain" />
        <h2 className="text-2xl font-bold text-white">{t.name}</h2>
      </div>

      <div className="mb-6 flex flex-wrap gap-8">
        <div><div className="text-2xl font-bold text-white">{roster.length}</div><div className="text-xs text-muted">Qualifying Players</div></div>
        <div><div className="text-2xl font-bold text-white">{fmt(median, 2)}</div><div className="text-xs text-muted">Median Value</div></div>
        <div><div className="text-2xl font-bold text-white">{fmt(mean, 2)}</div><div className="text-xs text-muted">Mean Value</div></div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {["passer", "rusher", "receiver"].map((role) => {
          const active = roleFilter.includes(role);
          return (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-pos text-ink" : "border border-line text-muted hover:text-white"
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}s
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {roster.map((p, i) => (
          <PlayerRow key={`${p.player_id}-${p.role}`} p={p} index={i} teamColor={t.color} leagueAvgByRole={leagueAvgByRole} />
        ))}
      </div>
    </div>
  );
}

export default function Teams() {
  const { data, loading, error } = useTeamsData();
  const [infoOpen, setInfoOpen] = useState(false);
  const [clubSelected, setClubSelected] = useState<string>("");

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted">Loading team data…</div>;
  if (error || !data) return <div className="flex min-h-screen items-center justify-center text-danger">Couldn't load teams.json.</div>;

  const selected = clubSelected || [...data.league].sort((a, b) => (TEAM_INFO[a.team]?.name ?? "").localeCompare(TEAM_INFO[b.team]?.name ?? ""))[0]?.team;
  const bgColor = TEAM_INFO[selected]?.color ?? "#2ecc71";

  const afcTeams = data.league.filter((r) => TEAM_INFO[r.team]?.conference === "AFC");
  const nfcTeams = data.league.filter((r) => TEAM_INFO[r.team]?.conference === "NFC");

  return (
    <div className="min-h-screen">
      <AmbientBackground color={bgColor} />
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-10">
        <div className="flex items-center justify-between">
          <Reveal><SectionLabel>{data.season} Season</SectionLabel></Reveal>
          <Reveal>
            <button
              onClick={() => setInfoOpen(true)}
              aria-label="How to read this page"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-muted transition hover:border-pos/50 hover:text-pos"
            >
              ⓘ
            </button>
          </Reveal>
        </div>
        <Reveal>
          <SectionTitle>Teams</SectionTitle>
          <p className="mt-3 text-muted">Season-to-date offensive and defensive efficiency, by team.</p>
        </Reveal>

        <Reveal delay={0.05} className="mt-10">
          <h3 className="mb-4 text-xl font-bold text-white">Season Rankings</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <ConferenceTable label="AFC" teams={afcTeams} />
            <ConferenceTable label="NFC" teams={nfcTeams} />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <h3 className="mb-1 text-xl font-bold text-white">Offense vs. Defense</h3>
          <OffDefScatter league={data.league} />
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <h3 className="mb-4 text-xl font-bold text-white">Head-to-Head Comparison</h3>
          <HeadToHead league={data.league} />
        </Reveal>

        <Reveal delay={0.2} className="mt-14">
          <h3 className="mb-4 text-xl font-bold text-white">Club Profile</h3>
          <ClubProfile
            league={data.league}
            rosters={data.rosters}
            leagueAvgByRole={data.league_avg_by_role}
            selected={selected}
            setSelected={setClubSelected}
          />
        </Reveal>
      </section>
    </div>
  );
}