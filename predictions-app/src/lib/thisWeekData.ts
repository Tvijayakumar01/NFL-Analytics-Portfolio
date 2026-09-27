import { useEffect, useState } from "react";

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

export type ThisWeekData = {
  season: number;
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

export function useThisWeek() {
  const [data, setData] = useState<ThisWeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/this_week.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load this_week.json (${res.status})`);
        return res.json();
      })
      .then((json: ThisWeekData) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}