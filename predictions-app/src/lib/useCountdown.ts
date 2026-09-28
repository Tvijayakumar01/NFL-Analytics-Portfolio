import { useEffect, useMemo, useState } from "react";

export type Remaining = { d: number; h: number; m: number; s: number };

/** Live countdown to a game's kickoff. Recomputes only when the date/time strings change. */
export function useCountdown(gameday: string | null | undefined, gametime: string | null | undefined) {
  const target = useMemo(
    () => (gameday ? new Date(`${gameday}T${gametime ?? "13:00"}:00`) : null),
    [gameday, gametime]
  );
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) return setRemaining({ d: 0, h: 0, m: 0, s: 0 });
      setRemaining({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}
