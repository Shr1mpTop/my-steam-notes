import type { GameUpdateItem } from "../types";
import { useLocale } from "../useLocale";

interface Props {
  updates: GameUpdateItem[];
}

function formatUpdateDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function cleanUpdateText(text: string) {
  return text
    .replace(/\[\/?[^\]]+\]/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\{STEAM_CLAN_IMAGE\}\/\S+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;[^&]*&gt;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function previewText(text: string) {
  const clean = cleanUpdateText(text);
  return clean.length > 140 ? `${clean.slice(0, 140).trim()}...` : clean;
}

export function GameUpdates({ updates = [] }: Props) {
  const { t } = useLocale();
  const recent = updates.slice(0, 6);

  return (
    <div className="viz-card game-updates-card">
      <h3>{t("updateBriefing")}</h3>
      <p className="viz-subtitle">
        {recent.length ? `${recent.length} ${t("updatePosts")}` : t("noUpdates")}
      </p>

      {recent.length > 0 ? (
        <div className="game-updates-list">
          {recent.map((item) => (
            <a key={`${item.appid}-${item.date}-${item.title}`} className="game-update-item" href={item.url} target="_blank" rel="noreferrer">
              <div className="game-update-meta">
                <span>{formatUpdateDate(item.date)}</span>
                <span>{item.update_type}</span>
              </div>
              <strong>{item.game_name}</strong>
              <span className="game-update-title">{item.title}</span>
              {item.contents && <p>{previewText(item.contents)}</p>}
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          {t("runSync")}
        </div>
      )}
    </div>
  );
}
