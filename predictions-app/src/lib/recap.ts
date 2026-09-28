import type { Player } from "./thisWeekData";

export const fmtEpa = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

export function plainSummary(p: Player): string {
  if (p.role === "passer") {
    return `${p.player_name} had a big game, completing ${p.completions} of ${p.plays} passes for ${p.yards} yards and ${p.touchdowns} touchdown${p.touchdowns === 1 ? "" : "s"}${p.turnovers > 0 ? `, though he did throw ${p.turnovers} interception${p.turnovers === 1 ? "" : "s"}` : ""}. It was the best performance by any quarterback this week.`;
  }
  if (p.role === "rusher") {
    return `${p.player_name} ran the ball ${p.plays} times for ${p.yards} yards and ${p.touchdowns} touchdown${p.touchdowns === 1 ? "" : "s"}. No other running back had a bigger impact on the ground this week.`;
  }
  return `${p.player_name} caught ${p.completions} of ${p.plays} targets for ${p.yards} yards and ${p.touchdowns} touchdown${p.touchdowns === 1 ? "" : "s"}. It was the standout receiving performance of the week.`;
}
