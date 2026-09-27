import { useEffect, useState } from "react";
import type { Probs } from "./data";

export type UpcomingGame = {
  home: string;
  away: string;
  week: number;
  season: number;
  gameday: string | null;
  gametime: string | null;
  pick: string;
  confidence: "High" | "Medium" | "Low";
  prob: Probs;
  verdict: { text: string; margin: number };
  features: {
    home_trailing_off_epa: number;
    home_trailing_def_epa: number;
    away_trailing_off_epa: number;
    away_trailing_def_epa: number;
  };
  components: {
    logistic: Probs;
    xgboost: Probs;
  };
};

export type UpcomingData = {
  season: number;
  week: number;
  games: UpcomingGame[];
};

export function useUpcomingPredictions() {
  const [data, setData] = useState<UpcomingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/upcoming_predictions.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load upcoming_predictions.json (${res.status})`);
        return res.json();
      })
      .then((json: UpcomingData) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}