import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { PresenceSegment, SocialPresenceData, SocialPresenceMember } from "../types";
import { useLocale } from "../useLocale";

interface Props {
  presence?: SocialPresenceData;
}

const STORAGE_KEY = "steam-notebook-social-presence-members-v1";
const ONLINE_COLOR = "#facc15";
const SG_TIME_ZONE = "Asia/Singapore";

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
  if (segment.status === "online") return ONLINE_COLOR;
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
  return segment.game || (segment.gameid ? `App ${segment.gameid}` : t("onlineNotPlaying"));
}

function percentBetween(value: string, start: number, end: number) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((ts - start) / (end - start)) * 100));
}

export function SocialPresence({ presence }: Props) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  });
  const [hasCustomSelection, setHasCustomSelection] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  });

  const members = presence?.members ?? [];
  const defaultIds = useMemo(() => {
    return members
      .filter((member) => member.is_self || member.current.online || member.segments.length > 0)
      .slice(0, 8)
      .map((member) => member.id);
  }, [members]);

  const effectiveIds = hasCustomSelection ? selectedIds : defaultIds;
  const selectedMembers = useMemo(() => {
    const selected = new Set(effectiveIds);
    return members.filter((member) => selected.has(member.id));
  }, [effectiveIds, members]);

  const searchResults = useMemo(() => {
    const selected = new Set(effectiveIds);
    const normalized = query.trim().toLowerCase();
    return members
      .filter((member) => !selected.has(member.id))
      .filter((member) => !normalized || member.name.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [effectiveIds, members, query]);

  useEffect(() => {
    if (!hasCustomSelection) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
  }, [hasCustomSelection, selectedIds]);

  if (!presence || !members.length) {
    return null;
  }

  const start = new Date(presence.window_start).getTime();
  const end = Math.max(new Date(presence.window_end).getTime(), Date.now());
  const cursorPct = Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
  const cursorLeft = `calc(${cursorPct}% + ${178 - cursorPct * 2.2}px)`;

  function addMember(id: string) {
    setHasCustomSelection(true);
    setSelectedIds((current) => current.includes(id) ? current : [...current, id]);
  }

  function removeMember(id: string) {
    setHasCustomSelection(true);
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

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

      <div className="presence-controls">
        <input
          type="search"
          value={query}
          placeholder={t("searchFriends")}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {query.trim() && (
        <div className="presence-search-results">
          {searchResults.length ? searchResults.map((member) => (
            <button key={member.id} type="button" onClick={() => addMember(member.id)}>
              {member.avatarfull && <img src={member.avatarfull} alt="" />}
              <span>{member.name}</span>
              <strong>{t("add")}</strong>
            </button>
          )) : (
            <span>{t("noFriendMatch")}</span>
          )}
        </div>
      )}

      <div className="presence-timeline" style={{ "--cursor-left": cursorLeft } as CSSProperties}>
        <div className="presence-now-line" />
        {selectedMembers.map((member) => (
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
            <button className="presence-remove" type="button" onClick={() => removeMember(member.id)}>
              {t("remove")}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
