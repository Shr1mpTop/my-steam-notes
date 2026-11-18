import type { GameUpdateItem } from "../../types";
import { useLocale } from "../../useLocale";
import { GlowCard } from "./GlowCard";

const CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

export function Updates({ updates }: { updates: GameUpdateItem[] }) {
  const { t } = useLocale();
  const list = updates.slice(0, 12);

  return (
    <GlowCard>
      <div className="card-head" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div>
          <span className="t">{t("updateFeed")}</span>
          <div className="s">{t("updateFeedSubtitle")}</div>
        </div>
        <span className="s" style={{ color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: 10 }}>
          {list.length} · ← scroll →
        </span>
      </div>
      <div className="updates-row">
        {list.map((u) => (
          <a
            key={`${u.appid}-${u.date}-${u.title}`}
            className="update-card"
            href={u.url || undefined}
            target="_blank"
            rel="noreferrer"
          >
            <div className="cover">
              <img
                src={`${CDN}/${u.appid}/header.jpg`}
                alt={u.game_name}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.opacity = "0"; }}
              />
            </div>
            <div className="body">
              <div className="meta">
                <span className="type">{u.update_type}</span>
                <span>·</span>
                <span>{u.game_name}</span>
                <span>·</span>
                <span>{new Date(u.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
              <div className="ttl">{u.title}</div>
              <div className="go">{t("readMore")} →</div>
            </div>
          </a>
        ))}
        {list.length === 0 && <span style={{ color: "var(--text-dim)" }}>{t("noUpdates")}</span>}
      </div>
    </GlowCard>
  );
}
