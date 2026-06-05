import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { MouseEvent, WheelEvent } from "react";
import type { PresenceSegment, SocialPresenceData, SocialPresenceMember } from "../types";
import { useLocale } from "../useLocale";

interface Props {
  presence?: SocialPresenceData;
}

const SG_TIME_ZONE = "Asia/Singapore";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_VIEW_MS = DAY_MS;
const MIN_VIEW_MS = HOUR_MS;
const TRACK_OFFSET_PX = 174;
const TRACKED_FRIEND_NAMES = [
  "X1ao",
  "大王",
  "野生成年雌性东北虎",
  "chunshuey",
  "Key",
];

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function gameKey(segment: PresenceSegment) {
  return segment.gameid || segment.game.trim().toLowerCase() || "playing";
}

function colorForSegment(segment: PresenceSegment) {
  const hue = hashString(gameKey(segment)) % 360;
  return `hsl(${hue} 78% 58%)`;
}

function statusText(member: SocialPresenceMember, t: (key: string) => string) {
  if (member.current.playing) return `${t("playing")} ${member.current.game || `App ${member.current.gameid}`}`;
  if (member.current.online) return t("onlineNotPlaying");
  return t("statusOffline");
}

function formatTime(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SG_TIME_ZONE,
  });
}

function formatRangeTime(value: number) {
  return new Date(value).toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SG_TIME_ZONE,
  });
}

function durationText(startValue: string, endValue: string) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  const minutes = Math.max(1, Math.round((end - start) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function segmentLabel(segment: PresenceSegment, t: (key: string) => string) {
  return segment.game || (segment.gameid ? `App ${segment.gameid}` : t("playing"));
}

function percentForTimestamp(value: number, start: number, end: number) {
  if (!Number.isFinite(value) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((value - start) / (end - start)) * 100));
}

export function SocialPresence({ presence }: Props) {
  const { t } = useLocale();
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number } | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const trackedNameOrder = useMemo(() => {
    return new Map(TRACKED_FRIEND_NAMES.map((name, index) => [normalizeName(name), index]));
  }, []);
  const members = useMemo(() => {
    return (presence?.members ?? [])
      .filter((member) => member.is_self || trackedNameOrder.has(normalizeName(member.name)))
      .sort((a, b) => {
        if (a.is_self) return -1;
        if (b.is_self) return 1;
        const aIndex = trackedNameOrder.get(normalizeName(a.name)) ?? TRACKED_FRIEND_NAMES.length;
        const bIndex = trackedNameOrder.get(normalizeName(b.name)) ?? TRACKED_FRIEND_NAMES.length;
        return aIndex - bIndex;
      });
  }, [presence?.members, trackedNameOrder]);

  if (!presence || !members.length) {
    return null;
  }

  const start = new Date(presence.window_start).getTime();
  const end = Math.max(new Date(presence.window_end).getTime(), Date.now());
  const fullStart = Number.isFinite(start) ? start : end - 7 * DAY_MS;
  const fullEnd = Number.isFinite(end) ? end : Date.now();
  const defaultStart = Math.max(fullStart, fullEnd - DEFAULT_VIEW_MS);
  const rawViewStart = visibleRange?.start ?? defaultStart;
  const rawViewEnd = visibleRange?.end ?? fullEnd;
  const viewDuration = Math.min(fullEnd - fullStart, Math.max(MIN_VIEW_MS, rawViewEnd - rawViewStart));
  const viewStart = Math.max(fullStart, Math.min(rawViewStart, fullEnd - viewDuration));
  const viewEnd = viewStart + viewDuration;
  const now = Date.now();
  const cursorPct = percentForTimestamp(now, viewStart, viewEnd);
  const cursorLeft = `calc(${cursorPct}% + ${TRACK_OFFSET_PX - cursorPct * (TRACK_OFFSET_PX / 100)}px)`;
  const showNowLine = now >= viewStart && now <= viewEnd;
  const hoverPct = hoverTime === null ? 0 : percentForTimestamp(hoverTime, viewStart, viewEnd);
  const hoverLeft = `calc(${hoverPct}% + ${TRACK_OFFSET_PX - hoverPct * (TRACK_OFFSET_PX / 100)}px)`;
  const hoverClassName = `presence-hover-line${hoverPct < 12 ? " presence-hover-line-start" : ""}${hoverPct > 88 ? " presence-hover-line-end" : ""}`;

  const timelinePointerPct = useCallback((event: MouseEvent<HTMLDivElement> | WheelEvent<HTMLDivElement>) => {
    const track = event.currentTarget.querySelector(".presence-track");
    const rect = track?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    return rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 1;
  }, []);

  const handleTimelinePointerMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const pointerPct = timelinePointerPct(event);
    setHoverTime(viewStart + (viewEnd - viewStart) * pointerPct);
  }, [timelinePointerPct, viewEnd, viewStart]);

  const handleTimelineWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pointerPct = timelinePointerPct(event);
    const currentStart = viewStart;
    const currentEnd = viewEnd;
    const currentDuration = currentEnd - currentStart;
    const zoomFactor = event.deltaY > 0 ? 1.18 : 0.84;
    const nextDuration = Math.min(fullEnd - fullStart, Math.max(MIN_VIEW_MS, currentDuration * zoomFactor));
    const anchor = currentStart + currentDuration * pointerPct;
    let nextStart = anchor - nextDuration * pointerPct;
    let nextEnd = nextStart + nextDuration;

    if (nextStart < fullStart) {
      nextStart = fullStart;
      nextEnd = nextStart + nextDuration;
    }
    if (nextEnd > fullEnd) {
      nextEnd = fullEnd;
      nextStart = nextEnd - nextDuration;
    }

    setVisibleRange({ start: nextStart, end: nextEnd });
    setHoverTime(anchor);
  }, [fullEnd, fullStart, timelinePointerPct, viewEnd, viewStart]);

  return (
    <section className="social-presence-card" aria-label={t("socialPresence")}>
      <div className="social-presence-header">
        <div>
          <h3>{t("socialPresence")}</h3>
          <p className="viz-subtitle">{t("socialPresenceSubtitle")}</p>
        </div>
        <div className="presence-window">
          <span>{formatRangeTime(viewStart)}</span>
          <span>{formatRangeTime(viewEnd)}</span>
        </div>
      </div>

      <div
        className="presence-timeline"
        onMouseLeave={() => setHoverTime(null)}
        onMouseMove={handleTimelinePointerMove}
        onWheel={handleTimelineWheel}
        style={{
          "--cursor-left": cursorLeft,
          "--hover-left": hoverLeft,
        } as CSSProperties}
      >
        {showNowLine && <div className="presence-now-line" />}
        {hoverTime !== null && (
          <div className={hoverClassName}>
            <span>{formatRangeTime(hoverTime)}</span>
          </div>
        )}
        {members.map((member) => (
          <div key={member.id} className="presence-row">
            <div className="presence-person">
              {member.avatarfull && <img src={member.avatarfull} alt="" />}
              <div>
                <strong>{member.is_self ? t("me") : member.name}</strong>
                <span>{statusText(member, t)}</span>
              </div>
            </div>
            <div className="presence-track" aria-label={statusText(member, t)}>
              {member.segments.map((segment, index) => {
                const segmentStart = new Date(segment.start).getTime();
                const segmentEnd = new Date(segment.end).getTime();
                if (!Number.isFinite(segmentStart) || !Number.isFinite(segmentEnd)) return null;
                if (segmentEnd <= viewStart || segmentStart >= viewEnd) return null;
                const left = percentForTimestamp(Math.max(segmentStart, viewStart), viewStart, viewEnd);
                const right = percentForTimestamp(Math.min(segmentEnd, viewEnd), viewStart, viewEnd);
                const width = Math.max(0.7, right - left);
                return (
                  <span
                    key={`${member.id}-${segment.start}-${index}`}
                    className={`presence-segment presence-segment-${segment.status}`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: colorForSegment(segment),
                    }}
                  >
                    <span className="presence-segment-tooltip">
                      <strong>{segmentLabel(segment, t)}</strong>
                      <span>{formatTime(segment.start)}-{formatTime(segment.end)} UTC+8</span>
                      <span>{durationText(segment.start, segment.end)}</span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
