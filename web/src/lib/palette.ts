/* Linear-2026 data palette — signature violet + hash-derived, curated hues.
   No rainbow ramps: every color lands in one restrained spectrum. */

/** Curated hue wheel (violet-forward, even perceptual spacing). */
const HUES = [232, 258, 284, 318, 348, 22, 42, 152, 178, 202] as const;

export function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Deterministic hue for any key (game name, appid…). */
export function hueFor(key: string): number {
  return HUES[hashString(key) % HUES.length];
}

/** HSL color derived from a stable hash of the key. */
export function dataColor(key: string, lightness = 64, saturation = 60, alpha = 1): string {
  const h = hueFor(key);
  return alpha >= 1
    ? `hsl(${h} ${saturation}% ${lightness}%)`
    : `hsl(${h} ${saturation}% ${lightness}% / ${alpha})`;
}

/** Curated genre colors — stable across sessions so legends stay legible. */
const GENRE_COLORS: Record<string, string> = {
  Action: "#e0657a",
  "Free To Play": "#e0a35c",
  Adventure: "#4cb782",
  RPG: "#8f7ef0",
  Indie: "#56b8c9",
  Strategy: "#6a8ef0",
  Simulation: "#d9894a",
  "Early Access": "#9a9fab",
  "Animation & Modeling": "#d97ba6",
  "Design & Illustration": "#8f86e8",
  Utilities: "#787d88",
  Casual: "#57b894",
  "Video Production": "#c77bd9",
  "Photo Editing": "#c98fe0",
  "Massively Multiplayer": "#7a6ae0",
};

export function genreColor(genre: string): string {
  return GENRE_COLORS[genre] ?? dataColor(genre, 62, 48);
}

export function isCuratedGenre(genre: string): boolean {
  return genre in GENRE_COLORS;
}

/** Recharts cell palette (index-based, used where per-key hue is overkill). */
export const CHART_COLORS: string[] = [
  "#7a85f0",
  "#5e6ad2",
  "#56b8c9",
  "#4cb782",
  "#e0a35c",
  "#e0657a",
  "#8f7ef0",
  "#d9894a",
  "#9a9fab",
  "#c77bd9",
];

/** Purple monotone ramp for heat grids (minutes / 0..1 ratio). */
export function heatColor(minutes: number): string {
  if (minutes <= 0) return "var(--heat-empty)";
  if (minutes <= 60) return "rgba(94, 106, 210, 0.26)";
  if (minutes <= 180) return "rgba(104, 116, 224, 0.46)";
  if (minutes <= 480) return "rgba(122, 133, 240, 0.7)";
  return "#98a0ff";
}

export function heatColorRatio(ratio: number): string {
  if (ratio <= 0) return "var(--heat-empty)";
  if (ratio <= 0.33) return "rgba(94, 106, 210, 0.28)";
  if (ratio <= 0.62) return "rgba(108, 120, 230, 0.5)";
  if (ratio <= 0.86) return "rgba(128, 139, 246, 0.74)";
  return "#98a0ff";
}

export const HEAT_LEGEND = [
  "rgba(94, 106, 210, 0.26)",
  "rgba(104, 116, 224, 0.46)",
  "rgba(122, 133, 240, 0.7)",
  "#98a0ff",
];
