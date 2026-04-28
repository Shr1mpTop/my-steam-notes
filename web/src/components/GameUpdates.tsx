import type { GameUpdateItem } from "../types";

interface Props {
  updates: GameUpdateItem[];
}

function formatUpdateDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function stripBbcode(text: string) {
  return text
    .replace(/\[\/?[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function GameUpdates({ updates = [] }: Props) {
  const recent = updates.slice(0, 6);

  return (
    <div className="viz-card game-updates-card">
      <h3>Update Briefing</h3>
      <p className="viz-subtitle">
        {recent.length ? `${recent.length} update posts from your library` : "No game update posts captured yet"}
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
              {item.contents && <p>{stripBbcode(item.contents).slice(0, 150)}</p>}
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          Run the update sync to collect Steam update posts.
        </div>
      )}
    </div>
  );
}
