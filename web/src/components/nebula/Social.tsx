import type { DashboardData } from "../../types";
import { useLocale } from "../../useLocale";
import { GlowCard } from "./GlowCard";

export function Social({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  const hub = data.friends_hub;
  const friends = hub?.friends ?? [];
  const top = [...friends].sort((a, b) => b.two_week_hours - a.two_week_hours).slice(0, 12);
  const board = (hub?.leaderboard_total ?? []).slice(0, 8);
  const shared = (hub?.shared_games ?? []).slice(0, 6);
  const mv = hub?.me_vs_them;
  const nowPlaying = hub?.friends_playing_now ?? [];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {nowPlaying.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="chip live">
            <span className="dot" />
            {t("playingNow")}
          </span>
          {nowPlaying.map((p, i) => (
            <span className="chip" key={i}>
              {p.name} ▸ <b style={{ color: "var(--text)", fontWeight: 600 }}>{p.game}</b>
            </span>
          ))}
        </div>
      )}

      {mv && (
        <div className="mvs">
          <span className="big">
            {mv.ranked_total > 1 && mv.my_total_rank ? `TOP ${Math.max(1, Math.round((mv.my_total_rank / mv.ranked_total) * 100))}%` : "#1"}
          </span>
          <span className="lbl">
            {t("meVsSubtitle")} · {mv.my_total_hours.toLocaleString()}h vs {t("friendAvg")} {Math.round(mv.avg_friend_total_hours)}h ·{" "}
            {mv.my_total_hours >= mv.avg_friend_total_hours ? t("aboveAvg") : t("belowAvg")}
          </span>
        </div>
      )}

      <GlowCard>
        <div className="card-head">
          <span className="t">{t("friendsWall")}</span>
          <span className="s">{t("friendsHubSubtitle")}</span>
        </div>
        <div className="friends-grid">
          {top.map((f) => (
            <div className="friend-card" key={f.steamid} title={f.playing ? `${f.name} ▸ ${f.playing}` : f.name}>
              <img src={f.avatarfull} alt={f.name} loading="lazy" />
              <div className="who">
                <div className="nm">
                  <span className={`st${f.online || f.playing ? " on" : ""}`} />
                  {f.name}
                </div>
                <div className="gm">
                  {f.playing ? `▸ ${f.playing}` : f.level ? `LV ${f.level} · ${f.library_size} games` : "—"}
                </div>
              </div>
              <div className="hrs">
                <div className="b">{Math.round(f.two_week_hours)}h</div>
                <div className="k">2w</div>
              </div>
            </div>
          ))}
          {top.length === 0 && <span className="faint" style={{ color: "var(--text-dim)" }}>{t("friendsScanWaiting")}</span>}
        </div>
      </GlowCard>

      <div className="grid-2">
        <GlowCard delay={0.05}>
          <div className="card-head">
            <span className="t">{t("lbTitle")}</span>
            <span className="s">{t("lbSubtitle")}</span>
          </div>
          <div className="podium">
            {board.map((r, i) => (
              <div key={r.name} className={`podium-row${r.is_self ? " me" : ""}${i < 3 ? ` r${i + 1}` : ""}`}>
                <span className="rk">#{i + 1}</span>
                <span className="nm">{r.is_self ? "★ ME" : r.name}</span>
                <span className="hrs">{Math.round(r.hours).toLocaleString()}h</span>
              </div>
            ))}
            {board.length === 0 && <span style={{ color: "var(--text-dim)" }}>{t("friendsScanWaiting")}</span>}
          </div>
        </GlowCard>

        <GlowCard delay={0.1}>
          <div className="card-head">
            <span className="t">{t("sharedTitle")}</span>
            <span className="s">{t("sharedSubtitle")}</span>
          </div>
          <div className="shared-rows">
            {shared.map((g) => {
              const max = Math.max(g.my_hours, g.friend_hours_total, 1);
              return (
                <div className="shared-row" key={g.appid}>
                  <div className="top">
                    <b>{g.name}</b>
                    <span className="dim" style={{ color: "var(--text-dim)" }}>
                      {g.friend_count} {t("friendsShort")}
                    </span>
                  </div>
                  <div className="track">
                    <div className="me" style={{ width: `${(g.my_hours / max) * 100}%` }} />
                    <div className="fr" style={{ left: `${Math.min(98, (g.my_hours / max) * 100 + 2)}%`, width: `${Math.max(2, (g.friend_hours_total / max) * 100 - 2)}%` }} />
                  </div>
                  <div className="top" style={{ marginTop: 4, fontSize: 11, color: "var(--text-dim)" }}>
                    <span>{t("sharedMyHours")} {Math.round(g.my_hours)}h</span>
                    <span>{t("sharedFriendHours")} {Math.round(g.friend_hours_total)}h</span>
                  </div>
                </div>
              );
            })}
            {shared.length === 0 && <span style={{ color: "var(--text-dim)" }}>{t("sharedEmpty")}</span>}
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
