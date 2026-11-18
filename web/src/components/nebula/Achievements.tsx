import { useMemo } from "react";
import type { AchievementGame } from "../../types";
import { useLocale } from "../../useLocale";
import { GlowCard } from "./GlowCard";

export function Achievements({ achievements }: { achievements: AchievementGame[] }) {
  const { t } = useLocale();

  const { unlocked, total, completed, buckets, medals } = useMemo(() => {
    const unlocked = achievements.reduce((a, g) => a + g.unlocked, 0);
    const total = achievements.reduce((a, g) => a + g.total, 0);
    const completed = achievements.filter((g) => g.pct === 100).length;
    const b = [0, 0, 0, 0];
    for (const g of achievements) {
      if (g.pct >= 100) b[3] += 1;
      else if (g.pct >= 50) b[2] += 1;
      else if (g.pct >= 25) b[1] += 1;
      else b[0] += 1;
    }
    const medals = achievements
      .flatMap((g) => g.rare.map((r) => ({ ...r, game: g.name })))
      .sort((a, b2) => a.global_pct - b2.global_pct)
      .slice(0, 6);
    return { unlocked, total, completed, buckets: b, medals };
  }, [achievements]);

  const labels = ["0-25%", "25-50%", "50-99%", "100%"];

  return (
    <GlowCard>
      <div className="card-head">
        <span className="t">{t("achievementBoard")}</span>
        <span className="s">
          {unlocked.toLocaleString()} / {total.toLocaleString()} {t("unlocked")} · {achievements.length} {t("games")}
        </span>
      </div>

      <div className="ach-stats">
        <div className="item">
          <div className="b">{unlocked.toLocaleString()}</div>
          <div className="k">{t("unlocked")}</div>
        </div>
        <div className="item">
          <div className="b">{completed}</div>
          <div className="k">{t("completed")}</div>
        </div>
        <div className="item">
          <div className="b">{total ? Math.round((unlocked / total) * 100) : 0}%</div>
          <div className="k">{t("achDist")}</div>
        </div>
      </div>

      <div className="ach-hist">
        {buckets.map((n, i) => (
          <div className="cell" key={i}>
            <div className="b">{n}</div>
            <div className="k">{labels[i]}</div>
          </div>
        ))}
      </div>

      {medals.length > 0 && (
        <>
          <div className="card-head" style={{ marginTop: 16, marginBottom: 8 }}>
            <span className="t" style={{ fontSize: 13 }}>{t("rareTop")}</span>
          </div>
          <div className="medal-row">
            {medals.map((m, i) => (
              <div className="medal" key={`${m.name}-${i}`} title={`${m.game} — ${m.global_pct}%`}>
                <span className="pct">{m.global_pct.toFixed(1)}%</span>
                <div className="name">{m.name.replace(/_/g, " ")}</div>
                <div className="game">{m.game}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </GlowCard>
  );
}
