import { useMemo, useState, useCallback, useRef } from "react";
import type { GameCloudItem } from "../types";
import { useLocale } from "../useLocale";

interface Props {
  games: GameCloudItem[];
}

const GENRE_COLORS: Record<string, string> = {
  Action: "#fb7185",
  "Free To Play": "#f59e0b",
  Adventure: "#34d399",
  RPG: "#a78bfa",
  Indie: "#67e8f9",
  Strategy: "#60a5fa",
  Simulation: "#f97316",
  "Early Access": "#94a3b8",
  "Animation & Modeling": "#f472b6",
  "Design & Illustration": "#818cf8",
  Utilities: "#64748b",
  Casual: "#22c55e",
  "Video Production": "#e879f9",
  "Photo Editing": "#f0abfc",
  "Massively Multiplayer": "#8b5cf6",
};
const DEFAULT_COLOR = "#64748b";
const W = 800, H = 500, HEADER = 18;

function genreColor(genre: string): string {
  return GENRE_COLORS[genre] || DEFAULT_COLOR;
}

// --- Binary Tree Treemap: guaranteed to fill 100% of the space ---
interface Rect { x: number; y: number; w: number; h: number }

interface LayoutItem {
  x: number; y: number; w: number; h: number;
  name: string; value: number; color: string;
}

function treemapLayout(
  items: { name: string; value: number; color: string }[],
  rect: Rect,
): LayoutItem[] {
  if (!items.length) return [];

  // Sort descending by value
  const sorted = items
    .map((it, i) => ({ ...it, idx: i }))
    .sort((a, b) => b.value - a.value);

  const results: LayoutItem[] = new Array(items.length);
  split(sorted, rect, results, /* horizontal first */ rect.w >= rect.h);
  return results;
}

function split(
  items: { name: string; value: number; color: string; idx: number }[],
  rect: Rect,
  results: LayoutItem[],
  horizontal: boolean,
) {
  if (items.length === 0) return;
  if (items.length === 1) {
    results[items[0].idx] = { ...rect, name: items[0].name, value: items[0].value, color: items[0].color };
    return;
  }

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    for (const it of items) {
      results[it.idx] = { ...rect, name: it.name, value: 0, color: it.color };
    }
    return;
  }

  // Find split point: accumulate until closest to half the total value
  let cum = 0, splitIdx = 0, bestDiff = total;
  for (let i = 0; i < items.length - 1; i++) {
    cum += items[i].value;
    const diff = Math.abs(2 * cum - total);
    if (diff <= bestDiff) { bestDiff = diff; splitIdx = i; }
    else break; // since items are sorted descending, diff will only get worse
  }

  const left = items.slice(0, splitIdx + 1);
  const right = items.slice(splitIdx + 1);
  const leftVal = left.reduce((s, i) => s + i.value, 0);
  const frac = leftVal / total;

  const { x, y, w, h } = rect;
  let leftRect: Rect, rightRect: Rect;

  if (horizontal) {
    const splitW = w * frac;
    leftRect = { x, y, w: splitW, h };
    rightRect = { x: x + splitW, y, w: w - splitW, h };
  } else {
    const splitH = h * frac;
    leftRect = { x, y, w, h: splitH };
    rightRect = { x, y: y + splitH, w, h: h - splitH };
  }

  split(left, leftRect, results, !horizontal);
  split(right, rightRect, results, !horizontal);
}

// --- Data ---
interface GenreGroup {
  name: string; color: string; totalHours: number; games: GameCloudItem[];
}

function groupByGenre(games: GameCloudItem[]): GenreGroup[] {
  const m = new Map<string, GameCloudItem[]>();
  for (const g of games) {
    for (const genre of (g.genres?.length ? g.genres : ["Other"])) {
      if (!m.has(genre)) m.set(genre, []);
      m.get(genre)!.push(g);
    }
  }
  return [...m.entries()]
    .map(([name, games]) => ({
      name, color: genreColor(name),
      totalHours: games.reduce((s, g) => s + g.playtime_hours, 0),
      games: [...games].sort((a, b) => b.playtime_hours - a.playtime_hours),
    }))
    .sort((a, b) => b.totalHours - a.totalHours);
}

const pct = (v: number, base: number) => `${(v / base * 100).toFixed(3)}%`;

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// --- Components ---

export function GameCloud({ games }: Props) {
  const { t } = useLocale();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; hours: number } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => groupByGenre(games), [games]);

  // Overview: genre-level layout
  const genreLayouts = useMemo(() =>
    treemapLayout(
      genres.map(g => ({ name: g.name, value: g.totalHours, color: g.color })),
      { x: 0, y: 0, w: W, h: H },
    ),
    [genres]);

  // Per-genre: game layout (relative to genre block, offset by header)
  const gameLayoutsMap = useMemo(() => {
    const map = new Map<string, LayoutItem[]>();
    for (let i = 0; i < genres.length; i++) {
      const g = genres[i];
      const gl = genreLayouts[i];
      if (!gl) continue;
      const headerH = gl.h > 30 ? HEADER : 0;
      map.set(g.name, treemapLayout(
        g.games.map(ga => ({ name: ga.name, value: ga.playtime_hours, color: g.color })),
        { x: 0, y: 0, w: gl.w, h: gl.h - headerH },
      ));
    }
    return map;
  }, [genres, genreLayouts]);

  // Drill-down: full-area layout
  const drillLayout = useMemo(() => {
    if (!selectedGenre) return [];
    const g = genres.find(g => g.name === selectedGenre);
    if (!g) return [];
    return treemapLayout(
      g.games.map(ga => ({ name: ga.name, value: ga.playtime_hours, color: g.color })),
      { x: 0, y: 0, w: W, h: H },
    );
  }, [selectedGenre, genres]);

  const handleGenreClick = useCallback((genre: string) => {
    setSelectedGenre(genre);
    setTooltip(null);
  }, []);

  const handleHover = useCallback((e: React.MouseEvent, name: string, hours: number) => {
    if (!fieldRef.current) return;
    const cr = fieldRef.current.getBoundingClientRect();
    const er = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      x: er.left - cr.left + er.width / 2,
      y: er.top - cr.top - 4,
      name, hours,
    });
  }, []);

  if (!games.length) return <p style={{ color: "#96a1b5", fontFamily: "var(--mono)" }}>{t("noActivity")}</p>;

  const selGenre = selectedGenre ? genres.find(g => g.name === selectedGenre) : null;

  return (
    <div className="game-cloud">
      <h2>{t("gameCloud")}</h2>
      <p className="subtitle">
        {selGenre ? (
          <>
            <button className="treemap-back" onClick={() => setSelectedGenre(null)}>← {t("back")}</button>
            {" "}{selGenre.name} - {selGenre.totalHours.toFixed(0)}h · {selGenre.games.length} {t("games")}
          </>
        ) : (
          `${games.length} ${t("games")} - ${t("gameCloudSubtitle")}`
        )}
      </p>

      <div className="treemap-container">
        <div ref={fieldRef} className="treemap-field">
          {selectedGenre ? (
            drillLayout.map((gl, i) => {
              const showName = gl.w > 45 && gl.h > 20;
              const showHours = gl.w > 45 && gl.h > 34;
              return (
                <div key={i}
                  className="treemap-game"
                  style={{
                    left: pct(gl.x, W), top: pct(gl.y, H),
                    width: pct(gl.w, W), height: pct(gl.h, H),
                    backgroundColor: gl.color,
                  }}
                  onMouseEnter={e => handleHover(e, gl.name, gl.value)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {showName && <span className="treemap-game-name">{truncate(gl.name, gl.w > 120 ? 24 : 10)}</span>}
                  {showHours && <span className="treemap-game-hours">{gl.value.toFixed(0)}h</span>}
                </div>
              );
            })
          ) : (
            genreLayouts.map((gl, i) => {
              const genre = genres[i];
              const gLayouts = gameLayoutsMap.get(genre.name) || [];
              const hasHeader = gl.h > 30;
              const gameAreaH = gl.h - (hasHeader ? HEADER : 0);
              return (
                <div key={genre.name}
                  className="treemap-genre"
                  style={{
                    left: pct(gl.x, W), top: pct(gl.y, H),
                    width: pct(gl.w, W), height: pct(gl.h, H),
                    backgroundColor: genre.color + "12",
                    borderColor: genre.color,
                  }}
                  onClick={() => handleGenreClick(genre.name)}
                >
                  {hasHeader && gl.w > 40 && (
                    <div className="treemap-genre-header" style={{ color: genre.color, height: HEADER, minHeight: HEADER }}>
                      <span className="treemap-genre-name">{truncate(genre.name, gl.w > 140 ? 20 : 8)}</span>
                      <span className="treemap-genre-hours">{genre.totalHours.toFixed(0)}h</span>
                    </div>
                  )}
                  <div className="treemap-genre-games" style={hasHeader ? { height: `calc(100% - ${HEADER}px)` } : { height: "100%" }}>
                    {gLayouts.map((g, gi) => (
                      <div key={gi}
                        className="treemap-game treemap-game-mini"
                        style={{
                          left: pct(g.x, gl.w),
                          top: pct(g.y, gameAreaH),
                          width: pct(g.w, gl.w),
                          height: pct(g.h, gameAreaH),
                          backgroundColor: genre.color,
                        }}
                        onMouseEnter={e => { e.stopPropagation(); handleHover(e, g.name, g.value); }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {g.w > 30 && g.h > 12 && (
                          <span className="treemap-game-name">{truncate(g.name, g.w > 100 ? 16 : 6)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {tooltip && (
          <div className="treemap-tooltip" style={{ left: Math.min(tooltip.x, W - 80), top: Math.max(tooltip.y, 5) }}>
            <span className="treemap-tooltip-name">{tooltip.name}</span>
            <span className="treemap-tooltip-hours">{tooltip.hours.toFixed(1)}h</span>
          </div>
        )}
      </div>

      {!selectedGenre && (
        <div className="treemap-legend">
          {genres.slice(0, 12).map(g => (
            <span key={g.name} className="treemap-legend-item" onClick={() => handleGenreClick(g.name)}>
              <span className="treemap-legend-dot" style={{ background: g.color }} />
              {g.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
