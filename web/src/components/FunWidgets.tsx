import type { GameWeatherData, WeeklyDigestItem } from "../types";
import { useLocale } from "../i18n";

interface WeatherProps { weather: GameWeatherData; }
interface DigestProps { digest: WeeklyDigestItem[]; }

const WEATHER_ICONS: Record<string, string> = {
  storm: "⛈️", rain: "🌧️", cloudy: "⛅", sunny: "☀️",
};

const WEATHER_COLORS: Record<string, string> = {
  storm: "#a78bfa", rain: "#67e8f9", cloudy: "#94a3b8", sunny: "#f59e0b",
};

export function GameWeather({ weather }: WeatherProps) {
  const { t } = useLocale();
  return (
    <div className="viz-card weather-card" style={{ borderColor: WEATHER_COLORS[weather.forecast] }}>
      <div className="weather-header">
        <span className="weather-icon">{WEATHER_ICONS[weather.forecast] || "🌤️"}</span>
        <div>
          <h3>{t("gamingWeather")}</h3>
          <p className="viz-subtitle">{t("currentForecast")}: <strong>{weather.forecast}</strong> - {t("dominatedBy")} {weather.top_game}</p>
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
  const { t } = useLocale();
  if (!digest.length) return null;
  const week = digest[0];
  return (
    <div className="viz-card">
      <h3>{t("weeklyDigest")}</h3>
      <p className="viz-subtitle">{t("latestWeekSummary")}</p>
      <div className="digest-content">
        <div className="digest-stat">
          <span className="digest-value">{week.total_hours}h</span>
          <span className="digest-label">{t("totalHours")}</span>
        </div>
        <div className="digest-stat">
          <span className="digest-value">{week.games_count}</span>
          <span className="digest-label">{t("gamesPlayed")}</span>
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
