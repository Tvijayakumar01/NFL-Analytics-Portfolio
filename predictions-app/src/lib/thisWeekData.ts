import { useJson } from "./fetchJson";

export type Player = {
  player_id: string;
  player_name: string;
  team: string;
  role: string;
  headshot_url: string | null;
  plays: number;
  total_epa: number;
  epa_per_play: number;
  success_rate: number;
  yards: number;
  touchdowns: number;
  turnovers: number;
  completions: number;
};

export type WeekPayload = {
  week: number;
  top_performer: Player & { opponent?: string; team_score?: number; opp_score?: number };
  team_of_week: Player[];
  full_week: Player[];
  form_leader: { player_name: string; team: string; position: string; form_z_score: number } | null;
  debutant: (Player & { team: string }) | null;
  debutant_count: number;
  held_count: number;
  total_slots: number;
};

export type ThisWeekData = {
  season: number;
  latest_week: number;
  weeks: Record<string, WeekPayload>;
};

export function useThisWeek() {
  return useJson<ThisWeekData>("this_week.json");
}
