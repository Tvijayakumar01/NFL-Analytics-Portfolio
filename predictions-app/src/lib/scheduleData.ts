import { useEffect, useState } from "react";

export type ScheduleGame = {
  week: number;
  home: string;
  away: string;
  home_score: number | null;
  away_score: number | null;
  gameday: string | null;
  gametime: string | null;
  played: boolean;
};

export type ScheduleData = {
  season: number;
  games: ScheduleGame[];
};

export function useSchedule() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/schedule.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load schedule.json (${res.status})`);
        return res.json();
      })
      .then((json: ScheduleData) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}