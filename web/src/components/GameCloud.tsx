import type { GameCloudItem } from "../types";

interface Props {
  games: GameCloudItem[];
}

function steamImgUrl(appid: number, iconHash: string) {
  if (!iconHash) return "";
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
}

export function GameCloud({ games }: Props) {
  if (!games.length) return <p>No games data yet.</p>;

  const maxHours = Math.max(...games.map((g) => g.playtime_hours));
  const top = games.slice(0, 20);

  return (
    <div className="game-cloud">
      <h2>Game Cloud</h2>
      <p className="subtitle">{games.length} games played — bigger = more hours</p>

      {/* Featured row: top 3 games, large */}
      <div className="cloud-hero">
        {games.slice(0, 3).map((game, i) => {
          const size = i === 0 ? 140 : 100;
          return (
            <CloudItem key={game.appid} game={game} size={size} maxHours={maxHours} rank={i + 1} />
          );
        })}
      </div>

      {/* Main cloud: organic scattered layout */}
      <div className="cloud-scatter">
        {top.slice(3).map((game) => {
          // Logarithmic scale for stronger contrast
          const logRatio = Math.log(game.playtime_hours + 1) / Math.log(maxHours + 1);
          const size = Math.max(36, Math.round(logRatio * 88));
          return (
            <CloudItem key={game.appid} game={game} size={size} maxHours={maxHours} />
          );
        })}
      </div>

      {/* Remaining: small icons strip */}
      {games.length > 20 && (
        <>
          <p className="cloud-more">+ {games.length - 20} more games</p>
          <div className="cloud-strip">
            {games.slice(20, 60).map((game) => (
              <div
                key={game.appid}
                className="cloud-item tiny"
                title={`${game.name}: ${game.playtime_hours}h`}
              >
                {game.img_icon_url ? (
                  <img
                    src={steamImgUrl(game.appid, game.img_icon_url)}
                    alt={game.name}
                  />
                ) : (
                  <span>{game.name[0]}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CloudItem({
  game,
  size,
  maxHours,
  rank,
}: {
  game: GameCloudItem;
  size: number;
  maxHours: number;
  rank?: number;
}) {
  const imgUrl = steamImgUrl(game.appid, game.img_icon_url);
  const opacity = 0.4 + 0.6 * (game.playtime_hours / maxHours);

  return (
    <div
      className="cloud-item"
      style={{
        width: size,
        height: size,
        opacity,
      }}
      title={`${game.name}: ${game.playtime_hours}h`}
    >
      {rank && <span className="cloud-rank">#{rank}</span>}
      {imgUrl ? (
        <img src={imgUrl} alt={game.name} width={size} height={size} />
      ) : (
        <span className="cloud-letter" style={{ fontSize: size * 0.4 }}>
          {game.name[0]}
        </span>
      )}
      {size >= 80 && (
        <span className="cloud-label">
          {game.name.length > 12 ? game.name.slice(0, 11) + "…" : game.name}
          <br />
          {game.playtime_hours}h
        </span>
      )}
    </div>
  );
}
