import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale } from "../../useLocale";
import { EASE_OUT } from "../../lib/ui-constants";

interface Item {
  glyph: string;
  label: string;
  run: () => void;
}

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, toggleLocale } = useLocale();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const items: Item[] = [
    { glyph: "◎", label: t("navOverview"), run: () => jump("#top") },
    { glyph: "≋", label: t("navTimeline"), run: () => jump("#timeline") },
    { glyph: "▦", label: t("navLibrary"), run: () => jump("#library") },
    { glyph: "★", label: t("navUpdates"), run: () => jump("#updates") },
    { glyph: "◍", label: t("navSocial"), run: () => jump("#social") },
    { glyph: "文", label: t("paletteLang"), run: () => toggleLocale() },
    { glyph: "⌗", label: t("paletteTerminal"), run: () => window.open("https://steam.zhili-he.top/", "_blank") },
  ];

  const jump = (sel: string) => {
    document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filtered = items.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const runItem = useCallback(
    (i: number) => {
      filtered[i]?.run();
      onClose();
    },
    [filtered, onClose],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); runItem(active); }
    else if (e.key === "Escape") onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          onKeyDown={onKey}
          tabIndex={-1}
        >
          <motion.div
            className="palette"
            role="dialog"
            aria-label={t("paletteTitle")}
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder={t("palettePlaceholder")}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            />
            <div className="palette-list">
              {filtered.length === 0 && <div className="palette-empty">{t("paletteEmpty")}</div>}
              {filtered.map((it, i) => (
                <button
                  key={it.label}
                  className={`palette-item${i === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => runItem(i)}
                >
                  <span className="glyph">{it.glyph}</span>
                  {it.label}
                </button>
              ))}
            </div>
            <div className="palette-foot">
              <span>↑↓ navigate</span>
              <span>⏎ run</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
