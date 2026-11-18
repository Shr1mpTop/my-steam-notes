import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useLocale } from "../../useLocale";
import { Palette } from "./Palette";

export function Nav({ live }: { live: boolean }) {
  const { t, toggleLocale, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links: [string, string][] = [
    ["#top", t("navOverview")],
    ["#timeline", t("navTimeline")],
    ["#library", t("navLibrary")],
    ["#social", t("navSocial")],
    ["#updates", t("navUpdates")],
  ];

  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href="#top">
            <span className="brand-orb" aria-hidden="true" />
            <b>
              STEAM <i>NEBULA</i>
            </b>
            <span className="sub">{t("dashboardKicker")}</span>
          </a>
          <nav className="nav-links">
            {links.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-spacer" />
          <span className={`live-badge${live ? "" : " is-snapshot"}`}>
            <span className="live-dot" aria-hidden="true" />
            {live ? t("sourceLive") : t("sourceSnapshot")}
          </span>
          <button className="nav-btn" onClick={() => setOpen(true)} aria-label={t("paletteTitle")}>
            {t("paletteTitle")} <kbd>⌘K</kbd>
          </button>
          <button className="nav-btn" onClick={toggleLocale} aria-label={t("paletteLang")}>
            {locale === "zh" ? "EN" : "中"}
          </button>
        </div>
        <motion.div className="nav-progress" style={{ scaleX: progress }} />
      </header>
      <Palette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
