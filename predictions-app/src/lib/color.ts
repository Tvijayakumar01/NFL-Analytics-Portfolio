export const BRAND = "#e3122f";
export const NAVY = "#0a1931";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Mixes a hex color toward white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  if (!hex.startsWith("#")) return hex;
  const [r, g, b] = hexToRgb(hex);
  const target = amt > 0 ? 255 : 0;
  const t = Math.abs(amt);
  const mix = (c: number) => Math.round(c + (target - c) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Lightens very dark team colors so they read on navy backgrounds. */
export function visibleColor(hex: string): string {
  if (!hex.startsWith("#")) return hex;
  const lum = luminance(hex);
  if (lum >= 0.22) return hex;
  return shade(hex, lum < 0.1 ? 0.5 : 0.3);
}

/** Darkens very light team colors (Steelers gold, Saints tan) so they read on white. */
export function inkColor(hex: string): string {
  if (!hex.startsWith("#")) return hex;
  return luminance(hex) > 0.6 ? shade(hex, -0.3) : hex;
}

/** A team-color panel background that always keeps white text legible. */
export function teamGradient(hex: string, angle = 125): string {
  const light = hex.startsWith("#") && luminance(hex) > 0.45;
  const start = light ? shade(hex, -0.35) : hex;
  return `linear-gradient(${angle}deg, ${start} 0%, ${shade(hex, light ? -0.7 : -0.55)} 100%)`;
}
