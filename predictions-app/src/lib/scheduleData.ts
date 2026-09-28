import { useJson } from "./fetchJson";

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
  return useJson<ScheduleData>("schedule.json");
}
