import type { GameWeatherData, WeeklyDigestItem } from "../types";
import { useLocale } from "../useLocale";
import { Panel } from "./ui";

interface WeatherProps { weather: GameWeatherData; }
interface DigestProps { digest: WeeklyDigestItem[]; }

const WEATHER_ICONS: Record<string, string> = {
  storm: "⛈️", rain: "🌧️", cloudy: "⛅", sunny: "☀️",
};

const WEATHER_ACCENTS: Record<string, string> = {
  storm: "#8f86e8", rain: "#56b8c9", cloudy: "#9a9fab", sunny: "#e0a35c",
};

export function GameWeather({ weather }: WeatherProps) {
  const { t } = useLocale();
  const accent = WEATHER_ACCENTS[weather.forecast] ?? "#9a9fab";

  return (
    <Panel kicker={t("kickWeather")} title={t("gamingWeather")} delay={0}>
      <div className="weather-header">
        <span className="weather-icon" style={{ borderColor: `${accent}55`, background: `${accent}14` }}>
          {WEATHER_ICONS[weather.forecast] || "🌤️"}
        </span>
        <p className="viz-subtitle">
          {t("currentForecast")}: <strong style={{ color: accent }}>{weather.forecast}</strong>
          {" — "}
          {t("dominatedBy")} {weather.top_game}
        </p>
      </div>
      <div className="weather-games">
        {weather.games.map((g) => (
          <div key={g.name} className="weather-game">
            <span>{g.name}</span>
            <span className="weather-hours">{g.hours}h</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function WeeklyDigest({ digest }: DigestProps) {
  const { t } = useLocale();
  if (!digest.length) return null;
  const week = digest[0];

  return (
    <Panel kicker={t("kickDigest")} title={t("weeklyDigest")} sub={t("latestWeekSummary")} delay={0.04}>
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
    </Panel>
  );
}
