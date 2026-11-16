import { motion } from "framer-motion";
import type { PlayerInfo, MilestoneData } from "../types";
import { useLocale } from "../useLocale";
import { AnimatedNumber } from "./ui";
import { EASE_OUT } from "../lib/ui-constants";

interface Props {
  player: PlayerInfo;
  milestone: MilestoneData;
}

export function ProfileHero({ player, milestone }: Props) {
  const { t } = useLocale();
  // XP: every 100h = 1 level
  const xpLevel = Math.floor(milestone.total_hours / 100) + 1;
  const xpProgress = milestone.total_hours % 100;
  const xpPercent = Math.round(xpProgress);

  return (
    <motion.div
      className="profile-hero"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <div className="profile-card">
        <div className="profile-avatar">
          <span className={`status-indicator ${player.online ? "online" : "offline"}`} />
          {player.avatarfull ? (
            <img className="avatar-img" src={player.avatarfull} alt={player.personaname} />
          ) : (
            <div className="avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{player.personaname}</h1>
          <div className="profile-badges">
            <span className="badge level">LV {player.level}</span>
            {player.currently_playing && (
              <span className="badge playing">
                <span className="pulse" /> {t("playing")} {player.currently_playing}
              </span>
            )}
            {!player.currently_playing && player.online && (
              <span className="badge online-badge">{t("statusOnline")}</span>
            )}
            {!player.online && <span className="badge offline-badge">{t("statusOffline")}</span>}
          </div>
        </div>
      </div>

      <div className="milestone-grid">
        <div className="milestone-card">
          <span className="milestone-value">
            <AnimatedNumber value={milestone.total_hours} decimals={0} suffix="h" />
          </span>
          <span className="milestone-label">{t("hoursPlayed")}</span>
        </div>
        <div className="milestone-card">
          <span className="milestone-value">
            <AnimatedNumber value={milestone.movies} />
          </span>
          <span className="milestone-label">{t("moviesEquivalent")}</span>
        </div>
        <div className="milestone-card">
          <span className="milestone-value">
            <AnimatedNumber value={milestone.walking_km} suffix=" km" />
          </span>
          <span className="milestone-label">{t("walkingDistance")}</span>
        </div>
        <div className="milestone-card">
          <span className="milestone-value">
            <AnimatedNumber value={milestone.books} />
          </span>
          <span className="milestone-label">{t("booksRead")}</span>
        </div>
      </div>

      <div className="xp-bar-container">
        <div className="xp-bar-header">
          <span>
            <strong>{t("xpLevel")} {xpLevel}</strong>
          </span>
          <span>{xpProgress.toFixed(0)} / 100h {t("toNext")}</span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>
    </motion.div>
  );
}
