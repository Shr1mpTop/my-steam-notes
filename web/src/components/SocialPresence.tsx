import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { PresenceSegment, SocialPresenceData, SocialPresenceMember } from "../types";
import { useLocale } from "../useLocale";

interface Props {
  presence?: SocialPresenceData;
}

const SG_TIME_ZONE = "Asia/Singapore";
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

function percentBetween(value: string, start: number, end: number) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((ts - start) / (end - start)) * 100));
}

export function SocialPresence({ presence }: Props) {
  const { t } = useLocale();
  const trackedNameOrder = useMemo(() => {
    return new Map(TRACKED_FRIEND_NAMES.map((name, index) => [normalizeName(name), index]));
  }, []);
  const members = useMemo(() => {
    return (presence?.members ?? [])
      .filter((member) => !member.is_self && trackedNameOrder.has(normalizeName(member.name)))
      .sort((a, b) => {
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
  const cursorPct = Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
  const cursorLeft = `calc(${cursorPct}% + ${178 - cursorPct * 2.2}px)`;

  return (
    <section className="social-presence-card" aria-label={t("socialPresence")}>
      <div className="social-presence-header">
        <div>
          <h3>{t("socialPresence")}</h3>
          <p className="viz-subtitle">{t("socialPresenceSubtitle")}</p>
        </div>
        <div className="presence-window">
          <span>{formatTime(presence.window_start)}</span>
          <span>{t("now")}</span>
        </div>
      </div>

      <div className="presence-timeline" style={{ "--cursor-left": cursorLeft } as CSSProperties}>
        <div className="presence-now-line" />
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
                const left = percentBetween(segment.start, start, end);
                const right = percentBetween(segment.end, start, end);
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
