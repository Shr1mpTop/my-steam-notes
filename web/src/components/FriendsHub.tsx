import { useMemo, useState } from "react";
import type { FriendsHubData, FriendsHubFriend } from "../types";
import { useLocale } from "../useLocale";
import { daysSince, fmtDuration } from "../lib/format";
import { Panel } from "./ui";

interface Props {
  hub?: FriendsHubData;
}

type SortKey = "two_weeks" | "total" | "friendship";

const SORTERS: Record<SortKey, (a: FriendsHubFriend, b: FriendsHubFriend) => number> = {
  two_weeks: (a, b) => b.two_week_hours - a.two_week_hours || b.total_hours - a.total_hours,
  total: (a, b) => b.total_hours - a.total_hours,
  friendship: (a, b) => (b.friendship_days ?? -1) - (a.friendship_days ?? -1),
};

function Avatar({ src, name, size = 34 }: { src: string; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (!src) {
    return (
      <span className="fh-avatar fh-avatar-fallback" style={{ width: size, height: size }} aria-hidden="true">
        {initial}
      </span>
    );
  }
  return (
    <img
      className="fh-avatar"
      src={src}
      alt=""
      loading="lazy"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  );
}

function visibilityBadge(visibility: FriendsHubFriend["visibility"], t: (key: string) => string) {
  if (visibility === "ok") return <span className="fh-badge is-public">{t("visibilityPublic")}</span>;
  if (visibility === "private") return <span className="fh-badge is-private">{t("visibilityPrivate")}</span>;
  return <span className="fh-badge is-unknown">{t("visibilityUnknown")}</span>;
}

/** Flagship friends overview: live playing-now strip + sortable expandable table. */
export function FriendsHubPanel({ hub }: Props) {
  const { t } = useLocale();
  const [sortKey, setSortKey] = useState<SortKey>("two_weeks");
  const [expanded, setExpanded] = useState<string | null>(null);

  const friends = useMemo(() => hub?.friends ?? [], [hub]);
  const sorted = useMemo(() => [...friends].sort(SORTERS[sortKey]), [friends, sortKey]);

  const publicCount = useMemo(() => friends.filter((f) => f.visibility === "ok").length, [friends]);
  const privateCount = useMemo(
    () => friends.filter((f) => f.visibility === "private").length,
    [friends],
  );

  const [now] = useState(() => Date.now() / 1000);
  const scanPending = !hub || friends.length === 0;

  const toggle = (steamid: string) => setExpanded((cur) => (cur === steamid ? null : steamid));

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "two_weeks", label: t("sort2weeks") },
    { key: "total", label: t("sortTotal") },
    { key: "friendship", label: t("sortFriendship") },
  ];

  return (
    <Panel
      kicker={t("kickFriends")}
      title={t("friendsHubTitle")}
      sub={t("friendsHubSubtitle")}
      delay={0.02}
      actions={
        !scanPending && (
          <div className="fh-toolbar">
            <div className="fh-seg" role="tablist" aria-label={t("sort2weeks")}>
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  role="tab"
                  aria-selected={sortKey === opt.key}
                  className={`fh-seg-btn${sortKey === opt.key ? " is-active" : ""}`}
                  onClick={() => setSortKey(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="fh-vis-stat">
              <span className="fh-vis-count">{friends.length}</span>
              <span className="fh-vis-label">{t("friendUnit")}</span>
              <span className="fh-vis-split">/</span>
              <span className="fh-vis-pub">{publicCount} {t("visibilityPublic")}</span>
              <span className="fh-vis-split">·</span>
              <span className="fh-vis-priv">{privateCount} {t("visibilityPrivate")}</span>
            </span>
          </div>
        )
      }
    >
      {scanPending ? (
        <div className="empty-panel fh-empty">
          <span className="fh-empty-dot" aria-hidden="true" />
          {t("friendsScanWaiting")}
        </div>
      ) : (
        <>
          <PlayingNowStrip hub={hub!} />
          <div className="fh-table" role="table" aria-label={t("friendsHubTitle")}>
            <div className="fh-head-row" role="row">
              <span role="columnheader">{t("colFriend")}</span>
              <span role="columnheader" className="fh-num">{t("sortFriendship")}</span>
              <span role="columnheader" className="fh-num">{t("sortTotal")}</span>
              <span role="columnheader" className="fh-num">{t("sort2weeks")}</span>
              <span role="columnheader">{t("colTopGames")}</span>
              <span role="columnheader" className="fh-num">{t("colLibrary")}</span>
              <span role="columnheader">{t("colStatus")}</span>
              <span className="fh-head-caret" aria-hidden="true" />
            </div>
            {sorted.map((friend, index) => {
              const isOpen = expanded === friend.steamid;
              const maxTopHours = Math.max(...friend.top_games.map((g) => g.hours), 0.01);
              return (
                <div key={friend.steamid} className={`fh-item${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="fh-row"
                    aria-expanded={isOpen}
                    onClick={() => toggle(friend.steamid)}
                  >
                    <span className="fh-id" role="cell">
                      <span className={`fh-status-dot${friend.playing ? " is-playing" : friend.online ? " is-online" : " is-offline"}`} aria-hidden="true" />
                      <Avatar src={friend.avatarfull} name={friend.name} />
                      <span className="fh-id-text">
                        <strong title={friend.name}>
                          {friend.name}
                          {typeof friend.level === "number" && friend.level > 0 && (
                            <span className="fh-mini fh-mini-level" title="Steam level">{friend.level}</span>
                          )}
                          {friend.country && (
                            <span className="fh-mini fh-mini-cc" title="Country">{friend.country}</span>
                          )}
                          {(friend.vac_banned || friend.game_banned) && (
                            <span className="fh-mini fh-mini-banned" title={t("bannedBadge")}>{t("bannedBadge")}</span>
                          )}
                        </strong>
                        <FriendStatus friend={friend} t={t} now={now} />
                      </span>
                    </span>
                    <span className="fh-num fh-days" role="cell">
                      {friend.friendship_days === null ? "—" : <>{friend.friendship_days}<em>{t("daysUnit")}</em></>}
                    </span>
                    <span className="fh-num fh-hours" role="cell">{fmtDuration(friend.total_hours)}</span>
                    <span className="fh-num fh-hours is-2wk" role="cell">
                      {friend.two_week_hours > 0 ? fmtDuration(friend.two_week_hours) : <span className="fh-zero">—</span>}
                    </span>
                    <span className="fh-topgames" role="cell">
                      {friend.top_games.map((g) => (
                        <span key={g.appid} className="fh-tg-row" title={`${g.name} — ${fmtDuration(g.hours)}`}>
                          <span className="fh-tg-name">{g.name}</span>
                          <span className="fh-tg-bar"><span style={{ width: `${Math.max(6, (g.hours / maxTopHours) * 100)}%` }} /></span>
                          <span className="fh-tg-hours">{fmtDuration(g.hours)}</span>
                        </span>
                      ))}
                    </span>
                    <span className="fh-num fh-library" role="cell">
                      {friend.library_size.toLocaleString()}<em>{t("games")}</em>
                    </span>
                    <span role="cell">{visibilityBadge(friend.visibility, t)}</span>
                    <span className={`fh-caret${isOpen ? " is-open" : ""}`} aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="fh-detail">
                      <span className="fh-detail-label">{t("colTopGames")} · {friend.name}</span>
                      <div className="fh-detail-bars">
                        {friend.top_games.map((g) => (
                          <div key={g.appid} className="fh-detail-row">
                            <span className="fh-detail-name" title={g.name}>{g.name}</span>
                            <span className="fh-detail-track">
                              <span style={{ width: `${Math.max(4, (g.hours / maxTopHours) * 100)}%` }} />
                            </span>
                            <span className="fh-detail-hours">{fmtDuration(g.hours)}</span>
                          </div>
                        ))}
                      </div>
                      <span className="fh-detail-meta">
                        {t("lastOnlineLabel")} {friend.last_online > 0 ? `${daysSince(friend.last_online, now)} ${t("daysAgo")}` : "—"}
                      </span>
                    </div>
                  )}
                  {index < sorted.length - 1 && !isOpen && <div className="fh-row-sep" aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

function FriendStatus({
  friend,
  t,
  now,
}: {
  friend: FriendsHubFriend;
  t: (key: string) => string;
  now: number;
}) {
  if (friend.playing) {
    return (
      <span className="fh-status is-playing">
        {t("playing")} <em>{friend.playing}</em>
      </span>
    );
  }
  if (friend.online) {
    return <span className="fh-status is-online">{t("statusOnline")}</span>;
  }
  const days = friend.last_online > 0 ? daysSince(friend.last_online, now) : null;
  return (
    <span className="fh-status is-offline">
      {t("lastOnlineLabel")} {days === null ? "—" : `${days} ${t("daysAgo")}`}
    </span>
  );
}

/** Horizontal rail of friends in-game right now. */
function PlayingNowStrip({ hub }: { hub: FriendsHubData }) {
  const { t } = useLocale();
  const players = hub.friends_playing_now;
  return (
    <div className="fh-now" aria-label={t("playingNow")}>
      <span className="fh-now-label">
        <span className="fh-now-dot" aria-hidden="true" />
        {t("playingNow")}
        <span className="fh-now-count">{players.length}</span>
      </span>
      {players.length === 0 ? (
        <span className="fh-now-empty">{t("nobodyPlaying")}</span>
      ) : (
        <div className="fh-now-rail">
          {players.map((p) => (
            <span key={`${p.name}:${p.game}`} className="fh-now-chip" title={`${p.name} — ${t("playing")} ${p.game}`}>
              <Avatar src={p.avatarfull} name={p.name} size={26} />
              <span className="fh-now-text">
                <strong>{p.name}</strong>
                <em>{p.game}</em>
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
