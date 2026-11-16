import { useMemo, useState } from "react";
import type {
  FriendsHubData,
  LeaderboardRow,
  MeVsThemData,
  SharedGameEntry,
} from "../types";
import { useLocale } from "../useLocale";
import { clamp, fmtDuration } from "../lib/format";
import { AnimatedNumber, Panel } from "./ui";

/* ── shared bits ── */

function FallbackAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="fh-avatar fh-avatar-fallback" aria-hidden="true">
      {initial}
    </span>
  );
}

/* ── Leaderboards: total + 2-week hours, medals for top 3, self highlighted ── */

interface BoardProps {
  rows: LeaderboardRow[];
  title: string;
  rank: number | null;
  rankedTotal: number;
}

function LeaderboardBoard({ rows, title, rank, rankedTotal }: BoardProps) {
  const { t, locale } = useLocale();
  const maxHours = Math.max(...rows.map((r) => r.hours), 0.01);
  const medalClass = ["is-gold", "is-silver", "is-bronze"];

  return (
    <div className="lb-board">
      <div className="lb-board-head">
        <h4>{title}</h4>
        {rank !== null && rankedTotal > 0 && (
          <span className="lb-board-rank">
            {locale === "zh" ? `第 ${rank} / 共 ${rankedTotal} 人` : `#${rank} of ${rankedTotal}`}
          </span>
        )}
      </div>
      <div className="lb-rows">
        {rows.map((row, index) => (
          <div key={`${row.name}:${index}`} className={`lb-row${row.is_self ? " is-self" : ""}`}>
            <span className={`lb-medal${index < 3 ? ` ${medalClass[index]}` : ""}`}>
              {index < 3 ? <span className="lb-medal-disc" aria-hidden="true" /> : null}
              <span className="lb-rank-num">#{index + 1}</span>
            </span>
            {row.avatarfull ? (
              <img className="lb-avatar" src={row.avatarfull} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <FallbackAvatar name={row.name} />
            )}
            <span className="lb-name" title={row.name}>{row.name}</span>
            <span className="lb-bar" aria-hidden="true">
              <span style={{ width: `${clamp((row.hours / maxHours) * 100, 3, 100)}%` }} />
            </span>
            <span className="lb-hours">{fmtDuration(row.hours)}</span>
            {row.is_self && <span className="lb-self-tag">{t("me")}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Leaderboards({ hub }: { hub?: FriendsHubData }) {
  const { t } = useLocale();
  const ready = !!hub && (hub.leaderboard_total.length > 0 || hub.leaderboard_2weeks.length > 0);
  if (!ready) {
    return (
      <Panel kicker={t("kickFriends")} title={t("lbTitle")} sub={t("friendsScanWaiting")} delay={0.06}>
        <div className="empty-panel">{t("friendsScanWaiting")}</div>
      </Panel>
    );
  }
  return (
    <Panel kicker={t("kickFriends")} title={t("lbTitle")} sub={t("lbSubtitle")} delay={0.06}>
      <div className="lb-grid">
        <LeaderboardBoard
          rows={hub!.leaderboard_total}
          title={t("lbTotalCol")}
          rank={hub!.me_vs_them.my_total_rank}
          rankedTotal={hub!.me_vs_them.ranked_total}
        />
        <LeaderboardBoard
          rows={hub!.leaderboard_2weeks}
          title={t("lb2wkCol")}
          rank={hub!.me_vs_them.my_two_week_rank}
          rankedTotal={hub!.me_vs_them.ranked_total}
        />
      </div>
    </Panel>
  );
}

/* ── Me vs Them: my rank, percentile, vs-average, visibility split ── */

export function MeVsThem({ hub }: { hub?: FriendsHubData }) {
  const { t } = useLocale();
  const stats: MeVsThemData | undefined = hub?.me_vs_them;
  const noFriends = !stats || (stats.public_friends + stats.private_friends === 0);

  if (noFriends) {
    return (
      <Panel kicker={t("kickFriends")} title={t("meVsTitle")} sub={t("friendsScanWaiting")} delay={0.04}>
        <div className="empty-panel">{t("friendsScanWaiting")}</div>
      </Panel>
    );
  }

  const { my_total_hours, my_total_rank, my_two_week_rank, avg_friend_total_hours, ranked_total } = stats!;
  const percentile =
    my_total_rank !== null && ranked_total > 0
      ? clamp(((ranked_total - my_total_rank + 1) / ranked_total) * 100, 0, 100)
      : null;
  const avgDelta =
    avg_friend_total_hours > 0 ? ((my_total_hours - avg_friend_total_hours) / avg_friend_total_hours) * 100 : null;
  const above = (avgDelta ?? 0) >= 0;

  return (
    <Panel kicker={t("kickFriends")} title={t("meVsTitle")} sub={t("meVsSubtitle")} delay={0.04}>
      <div className="mv-body">
        <div className="mv-rank-block">
          <span className="mv-rank-big">
            {my_two_week_rank !== null ? <>#{<AnimatedNumber value={my_two_week_rank} duration={0.7} />}</> : "—"}
          </span>
          <span className="mv-rank-label">{t("mv2wkRank")}</span>
        </div>

        <div className="mv-row">
          <span className="mv-row-label">{t("mvPercentile")}</span>
          <span className="mv-bar-track">
            {percentile !== null && <span className="mv-bar-fill" style={{ width: `${percentile}%` }} />}
            <span className="mv-bar-self" style={{ left: `${percentile ?? 0}%` }} aria-hidden="true" />
          </span>
          <span className="mv-row-value">
            {my_total_rank !== null ? `#${my_total_rank} / ${ranked_total}` : "—"}
            {percentile !== null && (
              <em className="mv-pct">{t("topPct")} {Math.round(percentile)}%</em>
            )}
          </span>
        </div>

        <div className="mv-row">
          <span className="mv-row-label">{t("mvVsAvg")}</span>
          <div className="mv-avg-bars">
            <div className="mv-avg-row">
              <span className="mv-avg-name">{t("me")}</span>
              <span className="mv-avg-track"><span className="mv-avg-mine" style={{ width: `${avgWidth(my_total_hours, my_total_hours, avg_friend_total_hours)}%` }} /></span>
              <span className="mv-avg-hours">{fmtDuration(my_total_hours)}</span>
            </div>
            <div className="mv-avg-row">
              <span className="mv-avg-name">{t("friendAvg")}</span>
              <span className="mv-avg-track"><span className="mv-avg-theirs" style={{ width: `${avgWidth(avg_friend_total_hours, my_total_hours, avg_friend_total_hours)}%` }} /></span>
              <span className="mv-avg-hours">{fmtDuration(avg_friend_total_hours)}</span>
            </div>
          </div>
          <span className={`mv-delta ${above ? "is-above" : "is-below"}`}>
            {avgDelta === null ? "—" : `${above ? "+" : ""}${Math.round(avgDelta)}% ${above ? t("aboveAvg") : t("belowAvg")}`}
          </span>
        </div>

        <div className="mv-foot">
          <span className="mv-chip is-public">
            {stats!.public_friends} {t("visibilityPublic")}
          </span>
          <span className="mv-chip is-private">
            {stats!.private_friends} {t("visibilityPrivate")}
          </span>
          <span className="mv-chip is-total">
            {fmtDuration(my_total_hours)} · {t("totalHours")}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function avgWidth(value: number, mine: number, avg: number): number {
  const max = Math.max(mine, avg, 0.01);
  return clamp((value / max) * 100, 2, 100);
}

/* ── Shared games: my hours vs friends' combined, expandable per-friend detail ── */

export function SharedGamesPanel({ hub }: { hub?: FriendsHubData }) {
  const { t } = useLocale();
  const [openId, setOpenId] = useState<number | null>(null);
  // Server sorts by friend_count → total hours; keep that order defensively.
  const games = useMemo(
    () =>
      [...(hub?.shared_games ?? [])].sort(
        (a, b) => b.friend_count - a.friend_count || b.friend_hours_total - a.friend_hours_total,
      ),
    [hub],
  );

  if (games.length === 0) {
    return (
      <Panel kicker={t("kickFriends")} title={t("sharedTitle")} sub={t("sharedSubtitle")} delay={0.08}>
        <div className="empty-panel">{t("sharedEmpty")}</div>
      </Panel>
    );
  }

  return (
    <Panel
      kicker={t("kickFriends")}
      title={t("sharedTitle")}
      sub={t("sharedSubtitle")}
      delay={0.08}
      actions={
        <span className="sg-count">
          {games.length} {t("games")}
        </span>
      }
    >
      <div className="sg-table" role="table" aria-label={t("sharedTitle")}>
        <div className="sg-head-row" role="row">
          <span role="columnheader">{t("sharedColGame")}</span>
          <span role="columnheader">{t("sharedHoursCompare")}</span>
          <span role="columnheader" className="sg-num">{t("mutualFriends")}</span>
          <span role="columnheader">{t("topFriendLabel")}</span>
          <span className="sg-head-caret" aria-hidden="true" />
        </div>
        {games.map((game) => (
          <SharedGameRow
            key={game.appid}
            game={game}
            open={openId === game.appid}
            onToggle={() => setOpenId((cur) => (cur === game.appid ? null : game.appid))}
            t={t}
          />
        ))}
      </div>
    </Panel>
  );
}

function SharedGameRow({
  game,
  open,
  onToggle,
  t,
}: {
  game: SharedGameEntry;
  open: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  const maxHours = Math.max(game.my_hours, game.friend_hours_total, 0.01);
  const friends = [...game.friends].sort((a, b) => b.hours - a.hours);
  const friendMax = Math.max(...friends.map((f) => f.hours), 0.01);

  return (
    <div className={`sg-item${open ? " is-open" : ""}`}>
      <button type="button" className="sg-row" aria-expanded={open} onClick={onToggle}>
        <span className="sg-name" role="cell">
          <strong title={game.name}>{game.name}</strong>
          {game.my_two_week_hours > 0 && (
            <span className="sg-recent" title={t("twoWeekPlaytime")}>
              {t("twoWeeksShort")} {fmtDuration(game.my_two_week_hours)}
            </span>
          )}
        </span>
        <span className="sg-bars" role="cell">
          <span className="sg-bar-row" title={`${t("sharedMyHours")}: ${fmtDuration(game.my_hours)}`}>
            <span className="sg-bar-label">{t("me")}</span>
            <span className="sg-bar-track"><span className="sg-bar-mine" style={{ width: `${clamp((game.my_hours / maxHours) * 100, 2, 100)}%` }} /></span>
            <span className="sg-bar-hours">{fmtDuration(game.my_hours)}</span>
          </span>
          <span className="sg-bar-row" title={`${t("sharedFriendHours")}: ${fmtDuration(game.friend_hours_total)}`}>
            <span className="sg-bar-label">{t("friendsShort")}</span>
            <span className="sg-bar-track"><span className="sg-bar-theirs" style={{ width: `${clamp((game.friend_hours_total / maxHours) * 100, 2, 100)}%` }} /></span>
            <span className="sg-bar-hours">{fmtDuration(game.friend_hours_total)}</span>
          </span>
        </span>
        <span className="sg-num sg-count-cell" role="cell">{game.friend_count}</span>
        <span className="sg-top" role="cell">
          {game.top_friend ? (
            <>
              <span className="sg-top-name" title={game.top_friend.name}>{game.top_friend.name}</span>
              <span className="sg-top-hours">{fmtDuration(game.top_friend.hours)}</span>
            </>
          ) : (
            <span className="sg-top-none">—</span>
          )}
        </span>
        <span className={`sg-caret${open ? " is-open" : ""}`} aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="sg-detail">
          {friends.map((f) => (
            <div key={f.name} className="sg-detail-row">
              <span className="sg-detail-name" title={f.name}>{f.name}</span>
              <span className="sg-detail-track">
                <span style={{ width: `${clamp((f.hours / friendMax) * 100, 3, 100)}%` }} />
              </span>
              <span className="sg-detail-hours">{fmtDuration(f.hours)}</span>
              <span className="sg-detail-2wk">
                {f.two_week_hours > 0 ? `${t("twoWeeksShort")} ${fmtDuration(f.two_week_hours)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
