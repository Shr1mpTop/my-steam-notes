import type { GameWeatherData, WeeklyDigestItem } from "../types";

interface WeatherProps { weather: GameWeatherData; }
interface DigestProps { digest: WeeklyDigestItem[]; }

const WEATHER_ICONS: Record<string, string> = {
  storm: "⛈️", rain: "🌧️", cloudy: "⛅", sunny: "☀️",
};

const WEATHER_COLORS: Record<string, string> = {
  storm: "#6366f1", rain: "#3b82f6", cloudy: "#8b949e", sunny: "#f59e0b",
};

export function GameWeather({ weather }: WeatherProps) {
  return (
    <div className="viz-card weather-card" style={{ borderColor: WEATHER_COLORS[weather.forecast] }}>
      <div className="weather-header">
        <span className="weather-icon">{WEATHER_ICONS[weather.forecast] || "🌤️"}</span>
        <div>
          <h3>Gaming Weather</h3>
          <p className="viz-subtitle">Current forecast: <strong>{weather.forecast}</strong> — dominated by {weather.top_game}</p>
        </div>
      </div>
      <div className="weather-games">
        {weather.games.map((g) => (
          <div key={g.name} className="weather-game">
            <span>{g.name}</span>
            <span className="weather-hours">{g.hours}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyDigest({ digest }: DigestProps) {
  if (!digest.length) return null;
  const week = digest[0];
  return (
    <div className="viz-card">
      <h3>Weekly Digest</h3>
      <p className="viz-subtitle">Latest week summary</p>
      <div className="digest-content">
        <div className="digest-stat">
          <span className="digest-value">{week.total_hours}h</span>
          <span className="digest-label">Total Hours</span>
        </div>
        <div className="digest-stat">
          <span className="digest-value">{week.games_count}</span>
          <span className="digest-label">Games Played</span>
        </div>
        <div className="digest-games">
          {week.top_games.map((g) => (
            <span key={g} className="digest-game-tag">{g}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
