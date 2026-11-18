import type { GameUpdateItem } from "../types";
import { useLocale } from "../useLocale";
import { Reveal } from "./ui";

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
  return clean.length > 320 ? `${clean.slice(0, 320).trim()}…` : clean;
}

export function GameUpdates({ updates = [] }: Props) {
  const { t } = useLocale();
  const recent = updates.slice(0, 20);

  if (!recent.length) {
    return <div className="empty-panel">{t("runSync")}</div>;
  }

  return (
    <div className="game-updates-list">
      {recent.map((item, i) => (
        <Reveal key={`${item.appid}-${item.date}-${item.title}`} delay={Math.min(i * 0.05, 0.3)}>
          <a
            className="game-update-item"
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            <div className="game-update-meta">
              <span>{formatUpdateDate(item.date)}</span>
              <span>{item.update_type}</span>
            </div>
            <strong>{item.game_name}</strong>
            <span className="game-update-title">{item.title}</span>
            {item.contents && <p>{previewText(item.contents)}</p>}
          </a>
        </Reveal>
      ))}
    </div>
  );
}
