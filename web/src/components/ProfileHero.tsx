import type { PlayerInfo, MilestoneData } from "../types";

interface Props {
  player: PlayerInfo;
  milestone: MilestoneData;
}

export function ProfileHero({ player, milestone }: Props) {
  // XP: map total hours to a fun level system (every 100h = 1 level)
  const xpLevel = Math.floor(milestone.total_hours / 100) + 1;
  const xpProgress = (milestone.total_hours % 100);
  const xpPercent = Math.round(xpProgress);

  return (
    <div className="profile-hero">
      <div className="profile-card">
        <div className="profile-avatar">
          <span className={`status-indicator ${player.online ? "online" : "offline"}`} />
          {player.avatarfull ? (
            <img className="avatar-img" src={player.avatarfull} alt={player.personaname} />
          ) : (
            <div className="avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{player.personaname}</h1>
          <div className="profile-badges">
            <span className="badge level">Lv.{player.level}</span>
            {player.currently_playing && (
              <span className="badge playing">
                <span className="pulse" /> Playing {player.currently_playing}
              </span>
            )}
            {!player.currently_playing && player.online && (
              <span className="badge online-badge">Online</span>
            )}
            {!player.online && <span className="badge offline-badge">Offline</span>}
          </div>
        </div>
      </div>

      <div className="milestone-grid">
        <div className="milestone-card">
          <span className="milestone-value">{milestone.total_hours.toLocaleString()}</span>
          <span className="milestone-label">Hours Played</span>
        </div>
        <div className="milestone-card">
          <span className="milestone-value">{milestone.movies.toLocaleString()}</span>
          <span className="milestone-label">Movies Equivalent</span>
        </div>
        <div className="milestone-card">
          <span className="milestone-value">{milestone.walking_km.toLocaleString()} km</span>
          <span className="milestone-label">Walking Distance</span>
        </div>
        <div className="milestone-card">
          <span className="milestone-value">{milestone.books.toLocaleString()}</span>
          <span className="milestone-label">Books Read</span>
        </div>
      </div>

      <div className="xp-bar-container">
        <div className="xp-bar-header">
          <span>XP Level {xpLevel}</span>
          <span>{xpProgress.toFixed(0)} / 100h to next</span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>
    </div>
  );
}
