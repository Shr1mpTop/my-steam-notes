import { lazy, Suspense, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { GameCloudItem } from "../types";
import { useLocale } from "../useLocale";
import { useMotionPref } from "../hooks/motionPrefContext";
import { buildCloudEntries, hasWebGL, primaryGenresOf } from "../lib/cloudLayout";
import { daysSince, fmtHours, truncate } from "../lib/format";
import { Panel } from "./ui";

const GameCloudScene = lazy(() => import("./three/GameCloudScene"));

interface Props {
  games: GameCloudItem[];
}

interface HoverState {
  appid: number;
  x: number;
  y: number;
}

export function GameCloud({ games }: Props) {
  const { t } = useLocale();
  const { scene } = useMotionPref();
  const [webgl] = useState(hasWebGL);
  const threeD = scene !== "off" && webgl;
  const limit = threeD ? 24 : 40;

  const entries = useMemo(() => buildCloudEntries(games, limit), [games, limit]);
  const byId = useMemo(() => new Map(games.map((g) => [g.appid, g])), [games]);
  const genres = useMemo(() => primaryGenresOf(entries), [entries]);

  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastPoint = useRef({ x: 0, y: 0 });
  const [now] = useState(() => Date.now() / 1000);

  const hoveredEntry = hovered ? entries.find((e) => e.appid === hovered.appid) : undefined;
  const hoveredGame = hoveredEntry ? byId.get(hoveredEntry.appid) : undefined;

  const dimmed = useMemo(() => {
    if (!activeGenre) return null;
    return new Set(entries.filter((e) => e.genre !== activeGenre).map((e) => e.appid));
  }, [activeGenre, entries]);

  const hiddenCount = Math.max(0, games.length - limit);

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    lastPoint.current = { x, y };
    setHovered((prev) => (prev ? { ...prev, x, y } : prev));
  };

  const handleSceneHover = (appid: number | null) => {
    setHovered(appid ? { appid, ...lastPoint.current } : null);
  };

  const lastPlayedLabel = (game: GameCloudItem | undefined): string | null => {
    if (!game || game.rtime_last_played <= 0) return null;
    const days = daysSince(game.rtime_last_played, now);
    return days === 0 ? t("today") : `${days} ${t("daysAgo")}`;
  };

  const sub = activeGenre ? (
    <>
      <button type="button" className="cloud-back" onClick={() => setActiveGenre(null)}>
        ← {t("back")}
      </button>
      {"  "}
      {activeGenre} · {entries.filter((e) => e.genre === activeGenre).length} {t("games")}
    </>
  ) : (
    `${games.length} ${t("games")} · ${t("gameCloudSubtitle")}`
  );

  return (
    <Panel
      kicker={t("kickCloud")}
      title={t("gameCloud")}
      sub={sub}
      delay={0.1}
      className="cloud-panel"
    >
      <div
        ref={stageRef}
        className="cloud-stage"
        onPointerMove={handleMove}
        onPointerLeave={() => setHovered(null)}
      >
        {threeD ? (
          <div className="cloud-canvas-wrap">
            <Suspense
              fallback={<div className="cloud-loading">{t("cloudLoading")}</div>}
            >
              <GameCloudScene
                entries={entries}
                hoveredAppId={hovered?.appid ?? null}
                dimmedAppIds={dimmed}
                onHover={handleSceneHover}
              />
            </Suspense>
          </div>
        ) : (
          <div className="cloud-2d">
            {entries.map((entry) => (
              <div
                key={entry.appid}
                className={`cloud-chip${dimmed?.has(entry.appid) ? " is-dim" : ""}`}
                title={`${entry.name} — ${fmtHours(entry.hours)}`}
              >
                <span className="cloud-chip-dot" style={{ background: entry.color }} />
                <span className="cloud-chip-name">{truncate(entry.name, 28)}</span>
                <span className="cloud-chip-hours">{fmtHours(entry.hours)}</span>
              </div>
            ))}
          </div>
        )}

        {hoveredEntry && (
          <div
            className="cloud-tooltip"
            style={{
              left: hovered!.x,
              top: hovered!.y,
              transform: hovered!.y < 110
                ? "translate(-50%, 18px)"
                : "translate(-50%, calc(-100% - 14px))",
            }}
          >
            <span className="cloud-tooltip-name">{hoveredEntry.name}</span>
            <div className="cloud-tooltip-meta">
              <span>{hoveredEntry.genre}</span>
              <strong>{fmtHours(hoveredEntry.hours)}</strong>
            </div>
            {(() => {
              const lastPlayed = lastPlayedLabel(hoveredGame);
              return lastPlayed ? (
                <div className="cloud-tooltip-meta">
                  <span>{t("lastPlayed")}</span>
                  <span>{lastPlayed}</span>
                </div>
              ) : null;
            })()}
          </div>
        )}

        <span className="cloud-hint">
          {threeD ? t("cloudHint") : t("cloudFallbackHint")}
        </span>
      </div>

      <div className="cloud-legend">
        {genres.slice(0, 8).map((g) => (
          <button
            key={g.genre}
            type="button"
            className={`treemap-legend-item${activeGenre === g.genre ? " is-active" : ""}`}
            onClick={() => setActiveGenre((prev) => (prev === g.genre ? null : g.genre))}
            aria-pressed={activeGenre === g.genre}
          >
            <span
              className="treemap-legend-dot"
              style={{ background: entries.find((e) => e.genre === g.genre)?.color }}
            />
            {g.genre} · {g.count}
          </button>
        ))}
        {hiddenCount > 0 && (
          <span className="treemap-legend-item is-static">
            +{hiddenCount} {t("moreGames")}
          </span>
        )}
      </div>
    </Panel>
  );
}
