import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Flame, Crown, Target, Scale, Star, Trophy, Sparkles, Send } from "lucide-react";
import { useThisWeek, type WeekPayload } from "../lib/thisWeekData";
import { useTeamsData, type LeagueTeam } from "../lib/teamsData";
import { useUpcomingPredictions, type UpcomingData } from "../lib/upcomingData";
import { usePredictions, type TrackRecord } from "../lib/data";
import { useSchedule, type ScheduleGame } from "../lib/scheduleData";
import { useCountdown } from "../lib/useCountdown";
import { teamGradient, inkColor } from "../lib/color";
import { fmtEpa, plainSummary } from "../lib/recap";
import { Container, SectionHeader, SlashMark } from "../components/Page";
import { Skeleton } from "../components/PageState";
import Reveal from "../components/Reveal";
import { PickCard, TeamLogo, CountdownBlocks } from "../components/sports";
import { team, nickname, pct, signed, formatGameDay } from "../lib/format";

/* ---------------- Lead story ---------------- */

function LeadStory({ week, season }: { week: WeekPayload; season: number }) {
  const top = week.top_performer;
  const t = team(top.team);
  return (
    <article className="relative overflow-hidden rounded-2xl text-white shadow-[0_24px_48px_-24px_rgb(10_25_49/0.6)]" style={{ background: teamGradient(t.color) }}>
      <div className="stripes absolute inset-0" />
      {t.logo && <img src={t.logo} alt="" className="pointer-events-none absolute -right-16 -top-10 h-80 w-80 object-contain opacity-[0.12]" />}
      <div className="relative grid items-center gap-6 p-6 sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-10">
        <div className="mx-auto h-44 w-44 overflow-hidden rounded-full bg-white/15 ring-4 ring-white/90 sm:h-56 sm:w-56">
          {top.headshot_url && <img src={top.headshot_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-brand px-2 py-1 font-display text-[13px] font-bold uppercase tracking-[0.12em]">
            <Trophy size={13} /> Player of the Week · Week {week.week}
          </div>
          <h1 className="headline mt-4 text-[2.6rem] sm:text-6xl">
            {top.player_name} powers the {nickname(top.team)}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">{plainSummary(top)}</p>
          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <div className="stat text-4xl">{fmtEpa(top.total_epa)}</div>
              <div className="font-display text-xs font-bold uppercase tracking-wider text-white/60">Total EPA</div>
            </div>
            <div>
              <div className="stat text-4xl">{top.yards}</div>
              <div className="font-display text-xs font-bold uppercase tracking-wider text-white/60">Yards</div>
            </div>
            {top.opponent && (
              <div>
                <div className="stat text-4xl">{top.team_score}–{top.opp_score}</div>
                <div className="font-display text-xs font-bold uppercase tracking-wider text-white/60">vs {top.opponent}</div>
              </div>
            )}
            <Link to="/week" className="btn ml-auto bg-white text-ink hover:bg-white/90">
              Read The Snap <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/15 bg-black/15 px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-white/60 sm:px-10">
        {season} season · {t.name}
      </div>
    </article>
  );
}

/* ---------------- Headlines rail ---------------- */

type Headline = { icon: ReactNode; title: string; sub: string; to: string; logo?: string };

function buildHeadlines(week?: WeekPayload, league?: LeagueTeam[], upcoming?: UpcomingData, record?: TrackRecord): Headline[] {
  const out: Headline[] = [];
  if (week?.form_leader) {
    const f = week.form_leader;
    out.push({ icon: <Flame size={16} />, logo: f.team, title: `${f.player_name} is the hottest player in football`, sub: `Best 4-week form in the league · ${team(f.team).name}`, to: "/week" });
  }
  if (league?.length) {
    const best = [...league].sort((a, b) => b.net_epa_per_play - a.net_epa_per_play)[0];
    out.push({ icon: <Crown size={16} />, logo: best.team, title: `The ${nickname(best.team)} sit atop the power rankings`, sub: `${signed(best.net_epa_per_play)} net EPA per play`, to: "/teams" });
  }
  if (upcoming?.games.length) {
    const fav = [...upcoming.games].sort((a, b) => Math.max(b.prob.home, b.prob.away) - Math.max(a.prob.home, a.prob.away))[0];
    const favHome = fav.pick === fav.home;
    out.push({
      icon: <Target size={16} />, logo: fav.pick,
      title: `Model loves the ${nickname(fav.pick)} in Week ${upcoming.week}`,
      sub: `${pct(favHome ? fav.prob.home : fav.prob.away)} to beat the ${nickname(favHome ? fav.away : fav.home)}`,
      to: `/predictions?game=${fav.home}`,
    });
    const close = [...upcoming.games].sort((a, b) => Math.abs(a.prob.home - 0.5) - Math.abs(b.prob.home - 0.5))[0];
    out.push({
      icon: <Scale size={16} />, logo: close.home,
      title: `Coin flip: ${nickname(close.away)} at ${nickname(close.home)}`,
      sub: `${pct(close.prob.away)} – ${pct(close.prob.home)}, the tightest call of the week`,
      to: `/predictions?game=${close.home}`,
    });
  }
  if (week?.debutant) {
    out.push({ icon: <Star size={16} />, logo: week.debutant.team, title: `${week.debutant.player_name} earns a first Team of the Week nod`, sub: team(week.debutant.team).name, to: "/week" });
  }
  if (record) {
    out.push({ icon: <Trophy size={16} />, title: `Model is ${record.correct}-${record.total_games - record.correct} on the season`, sub: `${pct(record.accuracy)} of games called correctly`, to: "/predictions?view=record" });
  }
  return out;
}

function HeadlinesRail({ items }: { items: Headline[] }) {
  return (
    <div className="card h-full overflow-hidden">
      <div className="stripes flex items-center gap-2.5 bg-navy px-5 py-3 text-white">
        <SlashMark className="h-4 w-1.5" />
        <h2 className="headline text-2xl">Top Headlines</h2>
      </div>
      <ul className="divide-y divide-line">
        {items.length === 0
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex gap-3 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-11/12" /><Skeleton className="h-3 w-2/3" /></div>
              </li>
            ))
          : items.map((h) => (
              <li key={h.title}>
                <Link to={h.to} className="group flex items-start gap-3 px-5 py-3.5 transition hover:bg-page">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-page">
                    {h.logo ? <TeamLogo code={h.logo} className="h-7 w-7" /> : <span className="text-brand">{h.icon}</span>}
                    {h.logo && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white ring-2 ring-white [&_svg]:size-3">{h.icon}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold leading-snug text-ink group-hover:text-brand">{h.title}</div>
                    <div className="mt-0.5 text-xs text-sub">{h.sub}</div>
                  </div>
                </Link>
              </li>
            ))}
      </ul>
    </div>
  );
}

/* ---------------- Power rankings ---------------- */

function PowerRankings({ league }: { league: LeagueTeam[] }) {
  const sorted = [...league].sort((a, b) => b.net_epa_per_play - a.net_epa_per_play).slice(0, 10);
  const max = Math.max(...sorted.map((r) => Math.abs(r.net_epa_per_play)), 0.001);
  return (
    <ol className="card divide-y divide-line overflow-hidden">
      {sorted.map((r, i) => {
        const t = team(r.team);
        return (
          <li key={r.team} className="flex items-center gap-4 px-4 py-3 transition hover:bg-page sm:px-5">
            <span className={`stat w-8 text-center text-3xl ${i === 0 ? "text-brand" : "text-sub/60"}`}>{i + 1}</span>
            <TeamLogo code={r.team} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink">{t.name}</div>
              <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-page">
                <div className="h-full rounded-full" style={{ width: `${(Math.abs(r.net_epa_per_play) / max) * 100}%`, backgroundColor: inkColor(t.color) }} />
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="stat text-lg text-ink">{signed(r.off_epa_per_play, 2)}</div>
              <div className="eyebrow text-[11px]">Off</div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="stat text-lg text-ink">{signed(r.def_epa_per_play_allowed, 2)}</div>
              <div className="eyebrow text-[11px]">Def</div>
            </div>
            <div className="w-16 text-right">
              <div className={`stat text-xl ${r.net_epa_per_play >= 0 ? "text-pos" : "text-neg"}`}>{signed(r.net_epa_per_play, 2)}</div>
              <div className="eyebrow text-[11px]">Net</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Side widgets ---------------- */

function NextKickoff({ game }: { game: ScheduleGame }) {
  const r = useCountdown(game.gameday, game.gametime);
  return (
    <Link to="/schedule" className="stripes group block overflow-hidden rounded-xl bg-navy p-5 text-white">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        <span className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white/70">Next Kickoff · Week {game.week}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        {[game.away, game.home].map((c, i) => (
          <div key={c} className={`flex items-center gap-2.5 ${i === 1 ? "flex-row-reverse text-right" : ""}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white"><TeamLogo code={c} className="h-9 w-9" /></div>
            <div className="headline text-2xl">{nickname(c)}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-xs text-white/55">{formatGameDay(game.gameday, game.gametime, true)}</div>
      {r && <div className="mt-4 flex justify-center"><CountdownBlocks r={r} dark /></div>}
    </Link>
  );
}

function ModelRecord({ record }: { record: TrackRecord }) {
  const deg = record.accuracy * 360;
  return (
    <Link to="/predictions?view=record" className="card card-hover flex items-center gap-5 p-5">
      <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(var(--color-brand) ${deg}deg, var(--color-page) 0)` }}>
        <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
          <span className="stat text-2xl text-ink">{pct(record.accuracy)}</span>
        </div>
      </div>
      <div>
        <div className="eyebrow">Model Track Record</div>
        <div className="headline mt-1 text-3xl text-ink">{record.correct}–{record.total_games - record.correct}</div>
        <div className="mt-1 text-xs text-sub">{record.season} season · vs 53% home-team baseline</div>
      </div>
    </Link>
  );
}

function TeamOfWeekMini({ week }: { week: WeekPayload }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="headline text-xl text-ink">Team of the Week</span>
        <Link to="/week" className="font-display text-xs font-bold uppercase tracking-wider text-brand">Week {week.week}</Link>
      </div>
      <ul className="divide-y divide-line">
        {week.team_of_week.map((p) => (
          <li key={p.player_id} className="flex items-center gap-3 px-5 py-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-page ring-2" style={{ ["--tw-ring-color" as string]: inkColor(team(p.team).color) }}>
              {p.headshot_url && <img src={p.headshot_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-ink">{p.player_name}</div>
              <div className="text-xs capitalize text-sub">{p.role} · {p.team}</div>
            </div>
            <span className="stat text-xl text-pos">{fmtEpa(p.total_epa)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Ask promo ---------------- */

const PROMPTS = ["Who has the best defense?", "Which QB is most efficient?", "Who's favored this week?"];

function HuddlePromo() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const go = (text: string) => text.trim() && navigate(`/ask?q=${encodeURIComponent(text.trim())}`);
  return (
    <section className="stripes relative mt-14 overflow-hidden rounded-2xl bg-navy px-6 py-10 text-white sm:px-10">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand/30 blur-[90px]" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-white/10 px-2 py-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-white/80">
            <Sparkles size={13} /> The Huddle · AI
          </div>
          <h2 className="headline mt-3 text-4xl sm:text-5xl">Got a football question?</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">Ask in plain English — answers come straight from the data behind this site.</p>
        </div>
        <div>
          <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask about teams, players, or picks…"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-sub focus:outline-none"
              aria-label="Ask The Huddle"
            />
            <button type="submit" className="btn btn-primary px-4!" aria-label="Ask"><Send size={15} /> <span className="hidden sm:inline">Ask</span></button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button key={p} onClick={() => go(p)} className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/60 hover:text-white">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */

export default function Home() {
  const thisWeek = useThisWeek();
  const teams = useTeamsData();
  const upcoming = useUpcomingPredictions();
  const record = usePredictions();
  const schedule = useSchedule();

  const week = thisWeek.data ? thisWeek.data.weeks[String(thisWeek.data.latest_week)] : undefined;
  const headlines = thisWeek.loading || teams.loading || upcoming.loading || record.loading
    ? []
    : buildHeadlines(week, teams.data?.league, upcoming.data ?? undefined, record.data ?? undefined);
  const nextGame = schedule.data?.games.find((g) => !g.played);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <Container className="pt-6 sm:pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 font-display text-sm font-bold uppercase tracking-[0.14em] text-sub">
        <span>{today}</span>
        {thisWeek.data && <span className="text-ink">{thisWeek.data.season} Season · Week {thisWeek.data.latest_week} in review</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {week && thisWeek.data ? <LeadStory week={week} season={thisWeek.data.season} /> : <Skeleton className="h-[420px]" />}
        </div>
        <aside className="lg:col-span-4">
          <HeadlinesRail items={headlines} />
        </aside>
      </div>

      <Reveal className="mt-14">
        <SectionHeader
          title={upcoming.data ? `Week ${upcoming.data.week} Picks` : "This Week's Picks"}
          sub="Win probabilities from our XGBoost model, built on each team's trailing efficiency."
          link={{ to: "/predictions", label: "All picks" }}
        />
        <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
          {upcoming.data
            ? upcoming.data.games.map((g) => <PickCard key={`${g.away}-${g.home}`} g={g} />)
            : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[170px] w-[272px] shrink-0" />)}
          {upcoming.data && upcoming.data.games.length === 0 && (
            <div className="card w-full p-6 text-center text-sm text-sub">No upcoming picks yet — check back once the next week's schedule is set.</div>
          )}
        </div>
      </Reveal>

      <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-7">
          <SectionHeader title="Power Rankings" sub="Top 10 by net EPA per play — offense minus defense allowed." link={{ to: "/teams", label: "Full rankings" }} />
          {teams.data ? <PowerRankings league={teams.data.league} /> : <Skeleton className="h-[640px]" />}
        </Reveal>
        <Reveal delay={0.05} className="space-y-5 lg:col-span-5">
          <SectionHeader title="Around the League" />
          {nextGame ? <NextKickoff game={nextGame} /> : schedule.loading && <Skeleton className="h-60" />}
          {record.data ? <ModelRecord record={record.data} /> : <Skeleton className="h-32" />}
          {week ? <TeamOfWeekMini week={week} /> : <Skeleton className="h-64" />}
        </Reveal>
      </div>

      <HuddlePromo />
    </Container>
  );
}
