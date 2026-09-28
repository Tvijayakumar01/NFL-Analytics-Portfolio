import { TEAM_INFO } from "./teams";

export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const signed = (n: number, d = 3) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

export function team(code: string) {
  return TEAM_INFO[code] ?? { name: code, color: "#5a6577", logo: "", conference: "AFC" as const, division: "" };
}

/** "Buffalo Bills" -> "Bills". */
export function nickname(code: string) {
  const parts = team(code).name.split(" ");
  return parts[parts.length - 1];
}

export function formatGameDay(gameday: string | null | undefined, gametime?: string | null, long = false) {
  if (!gameday) return "TBD";
  const d = new Date(gameday + "T00:00:00").toLocaleDateString(
    "en-US",
    long ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" }
  );
  return gametime ? `${d} · ${gametime}` : d;
}
