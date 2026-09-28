import { useJson } from "./fetchJson";

export type LeagueTeam = {
  rank: number;
  team: string;
  off_plays: number;
  off_epa_per_play: number;
  def_plays: number;
  def_epa_per_play_allowed: number;
  net_epa_per_play: number;
};

export type RosterPlayer = {
  player_id: string;
  player_name: string;
  role: string;
  position: string | null;
  headshot_url: string | null;
  season_plays: number;
  season_total_epa: number;
  season_epa_per_play: number;
  season_yards: number;
  season_touchdowns: number;
  season_turnovers: number;
  season_completions: number;
  form_z_score: number | null;
  weekly: { week: number; total_epa: number }[];
};

export type TeamsData = {
  season: number;
  league: LeagueTeam[];
  rosters: Record<string, RosterPlayer[]>;
  league_avg_by_role: Record<string, { week: number; league_avg_epa: number }[]>;
};

export function useTeamsData() {
  return useJson<TeamsData>("teams.json");
}
