import { useEffect, useState } from "react";

export type Probs = { home: number; away: number };

export type Game = {
  home: string;
  away: string;
  week: number;
  season: number;
  home_score: number;
  away_score: number;
  actual_winner: string;
  pick: string;
  correct: boolean;
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

export type TrackRecord = {
  season: number;
  total_games: number;
  correct: number;
  accuracy: number;
  games: Game[];
};

export function usePredictions() {
  const [data, setData] = useState<TrackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/predictions.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load predictions (${res.status})`);
        return res.json();
      })
      .then((json: TrackRecord) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}