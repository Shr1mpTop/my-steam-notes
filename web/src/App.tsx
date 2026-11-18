import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { useDashboard } from "./hooks/useDashboard";
import { MotionPrefProvider } from "./hooks/motionPref";
import { useMotionPref } from "./hooks/motionPrefContext";
import { useLocale } from "./useLocale";
import { HeroBackdrop } from "./components/HeroBackdrop";
import { GameCloud } from "./components/GameCloud";
import { Nav } from "./components/nebula/Nav";
import { Hero } from "./components/nebula/Hero";
import { Section } from "./components/nebula/Section";
import { PlaytimeFlow } from "./components/nebula/PlaytimeFlow";
import { Rhythm } from "./components/nebula/Rhythm";
import { GenreRings, PlatformBars, ParetoCurve } from "./components/nebula/Library";
import { Achievements } from "./components/nebula/Achievements";
import { Social } from "./components/nebula/Social";
import { Updates } from "./components/nebula/Updates";

function Boot({ label }: { label: string }) {
  return (
    <div className="boot">
      <div className="boot-ring" />
      <span>{label}</span>
    </div>
  );
}

function Dashboard() {
  const { data, loading, error, source } = useDashboard();
  const { t } = useLocale();
  const { motion } = useMotionPref();

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }, []);

  if (loading) return <Boot label={t("loading")} />;
  if (error || !data) {
    return (
      <div className="error-card">
        {t("error")}: {error}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion={motion === "reduced" ? "always" : "never"}>
      <div className="neb" id="top">
        <div className="aurora" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="starfield" aria-hidden="true" />
        <div className="noise" aria-hidden="true" />
        <HeroBackdrop />

        <Nav live={source === "live"} />

        <main className="wrap">
          <Hero data={data} />

          <Section id="timeline" kicker={t("kickTime")} title={t("flowTitle")} sub={t("flowSub")}>
            <PlaytimeFlow data={data} />
            <Rhythm data={data} />
          </Section>

          <Section id="library" kicker={t("kickLibrary")} title={t("gamesPlayed")} sub={t("genreSubtitle")}>
            <div className="grid-3">
              <GenreRings data={data} />
              <PlatformBars data={data} />
              <Achievements achievements={data.achievements} />
            </div>
            <div style={{ marginTop: 14 }}>
              <GameCloud games={data.game_cloud} />
            </div>
            <div style={{ marginTop: 14 }}>
              <ParetoCurve data={data} />
            </div>
          </Section>

          <Section id="social" kicker={t("kickFriends")} title={t("meVsTitle")} sub={t("friendsHubSubtitle")}>
            <Social data={data} />
          </Section>

          <Section id="updates" kicker="STEAM" title={t("updateFeed")} sub={t("updateFeedSubtitle")}>
            <Updates updates={data.game_updates ?? []} />
          </Section>

          <footer className="footer">
            <span>
              STEAM NEBULA — {t("updated")}{" "}
              {new Date(data.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <a href="https://steam.zhili-he.top/" target="_blank" rel="noreferrer">
              ▶ {t("paletteTerminal")}
            </a>
            <a href="https://shr1mptop.github.io/my-steam-notes/" target="_blank" rel="noreferrer">
              GitHub Pages
            </a>
          </footer>
        </main>
      </div>
    </MotionConfig>
  );
}

function App() {
  return (
    <MotionPrefProvider>
      <Dashboard />
    </MotionPrefProvider>
  );
}

export default App;
