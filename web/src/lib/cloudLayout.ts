import type { GameCloudItem } from "../types";
import { genreColor, hashString } from "./palette";

export interface CloudEntry {
  appid: number;
  name: string;
  hours: number;
  /** Primary genre (grouping + label accent). */
  genre: string;
  color: string;
  /** World-space label height (width follows text aspect). */
  height: number;
  radius: number;
  angle0: number;
  speed: number;
  yAmp: number;
  phase: number;
}

const GOLDEN_ANGLE = 2.399963229728653;

/** Sort by playtime, assign slow orbital lanes + hash-derived accents. */
export function buildCloudEntries(games: GameCloudItem[], limit: number): CloudEntry[] {
  const sorted = [...games].sort((a, b) => b.playtime_hours - a.playtime_hours).slice(0, limit);
  const maxHours = Math.max(sorted[0]?.playtime_hours ?? 1, 1);

  return sorted.map((game, i) => {
    const genre = game.genres?.length ? game.genres[0] : "Other";
    const h = hashString(`${game.appid}:${game.name}`);
    const ratio = Math.sqrt(game.playtime_hours / maxHours);
    return {
      appid: game.appid,
      name: game.name,
      hours: game.playtime_hours,
      genre,
      color: genreColor(genre),
      height: 1.65 + ratio * 1.15,
      radius: 6.2 + i * 0.63,
      angle0: i * GOLDEN_ANGLE,
      speed: (0.05 + ((h % 90) / 90) * 0.04) * (i % 3 === 2 ? -1 : 1),
      yAmp: 1.4 + ((h >> 3) % 100) / 100 * 1.4,
      phase: ((h >> 6) % 628) / 100,
    };
  });
}

export function primaryGenresOf(entries: CloudEntry[]): { genre: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.genre, (counts.get(e.genre) ?? 0) + 1);
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

/** Conservative WebGL availability probe (decides 3D vs 2D cloud). */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}
