import { useJson } from "./fetchJson";
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
  return useJson<UpcomingData>("upcoming_predictions.json");
}
