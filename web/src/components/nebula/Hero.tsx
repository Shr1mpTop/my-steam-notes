import type { DashboardData } from "../../types";
import { useLocale } from "../../useLocale";
import { AnimatedNumber } from "../ui";
import { GlowCard } from "./GlowCard";
import { motion } from "framer-motion";
import { EASE_OUT } from "../../lib/ui-constants";

export function Hero({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  const p = data.player;
  const st = data.stats;
  const ms = data.milestone;
  const twoWeek = (data.recent_activity || []).reduce((a, g) => a + (g.playtime_2weeks_hours || 0), 0);
  const achUnlocked = (data.achievements || []).reduce((a, g) => a + g.unlocked, 0);
  const playing = p.currently_playing && p.currently_playing.length > 0;

  const stats: { k: string; v: React.ReactNode; s: React.ReactNode }[] = [
    { k: t("totalHours"), v: <AnimatedNumber value={ms.total_hours} />, s: <><b>{data.game_cloud?.length ?? 0}</b> {t("gamesPlayed")}</> },
    { k: t("gamesPlayed"), v: <AnimatedNumber value={st.played_games} />, s: <>{st.total_games - st.played_games} {t("neverOpened")}</> },
    { k: t("statTwoWeek"), v: <AnimatedNumber value={Math.round(twoWeek)} />, s: t("recentActivity") },
    { k: t("statAch"), v: <AnimatedNumber value={achUnlocked} />, s: <><b>{(data.achievements || []).filter((g) => g.pct === 100).length}</b> {t("completed")}</> },
    { k: t("dustRate"), v: <AnimatedNumber value={st.dust_rate} suffix="%" />, s: <>{st.never_played} {t("never")}</> },
    { k: t("statStreak"), v: <AnimatedNumber value={st.longest_streak.days} suffix="d" />, s: <b>{t("bestDay")}</b> },
  ];

  return (
    <div className="hero" id="top">
      <div className="hero-grid">
        <div>
          <motion.span
            className="hero-kicker"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            {t("dashboardKicker")}
          </motion.span>
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: 0.06, ease: EASE_OUT }}
          >
            {t("dashboardTitle").split(" ").map((w, i) =>
              i === 1 ? <em key={i}> {w}</em> : <span key={i}> {w}</span>,
            )}
          </motion.h1>
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: EASE_OUT }}
          >
            {t("dashboardSubtitle")}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.66, delay: 0.1, ease: EASE_OUT }}
        >
          <GlowCard className="id-card">
            <div className="id-inner">
              <div className="avatar-wrap">
                <img src={p.avatarfull} alt={p.personaname} />
              </div>
              <div>
                <div className="id-name">{p.personaname}</div>
                <div className="id-meta">
                  <span className="chip lvl">
                    LV {p.level}
                  </span>
                  {p.online ? (
                    <span className="chip live">
                      <span className="dot" />
                      {t("statusOnline")}
                    </span>
                  ) : (
                    <span className="chip">{t("statusOffline")}</span>
                  )}
                  <span className="chip">{Math.round(ms.total_hours / 60)} {t("moviesEquivalent").slice(0, 2)}≈ {ms.movies}</span>
                </div>
                <div className="id-playing">
                  {playing ? (
                    <>{t("playing")} · <b>{p.currently_playing}</b></>
                  ) : (
                    <span className="faint" style={{ color: "var(--text-dim)" }}>{t("onlineNotPlaying")}</span>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>
        </motion.div>
      </div>

      <div className="stat-strip">
        {stats.map((s, i) => (
          <motion.div
            key={s.k}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 + i * 0.05, ease: EASE_OUT }}
          >
            <GlowCard className="stat-tile">
              <div className="k">{s.k}</div>
              <div className="v">{s.v}</div>
              <div className="s">{s.s}</div>
            </GlowCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
