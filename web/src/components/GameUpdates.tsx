import { useEffect, useRef, useState } from "react";
import type { GameUpdateItem } from "../types";
import { useLocale } from "../useLocale";
import { GameCover } from "./GameImages";
import { Reveal } from "./ui";

interface Props {
  updates: GameUpdateItem[];
}

/** Posts revealed per infinite-scroll page. */
const PAGE_SIZE = 8;

function formatUpdateDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function cleanUpdateText(text: string) {
  return text
    .replace(/\[\/?[^\]]+\]/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\{STEAM_CLAN_IMAGE\}\/\S+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;[^&]*&gt;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function previewText(text: string) {
  const clean = cleanUpdateText(text);
  return clean.length > 320 ? `${clean.slice(0, 320).trim()}…` : clean;
}

/** Twitter/IG-style single post: author row, big cover image, title, preview. */
function PostCard({ item }: { item: GameUpdateItem }) {
  const { t } = useLocale();
  return (
    <a className="post-card" href={item.url || undefined} target="_blank" rel="noreferrer">
      <header className="post-head">
        <img
          className="post-avatar"
          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/capsule_sm_120.jpg`}
          alt=""
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div className="post-id">
          <strong>{item.game_name}</strong>
          <span>{item.feedlabel || item.feedname} · {formatUpdateDate(item.date)}</span>
        </div>
        <span className="post-type">{item.update_type}</span>
      </header>
      <div className="post-img">
        <GameCover appid={item.appid} name={item.game_name} variant="landscape" />
      </div>
      <h3 className="post-title">{item.title}</h3>
      {item.contents && <p>{previewText(item.contents)}</p>}
      <footer className="post-foot">{t("readMore")} →</footer>
    </a>
  );
}

/**
 * Infinite update feed: reveals PAGE_SIZE posts at a time as a sentinel
 * approaches the viewport, then shows a "all caught up" marker.
 */
export function UpdateFeed({ updates = [] }: Props) {
  const { t } = useLocale();
  const [count, setCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCount((c) => Math.min(c + PAGE_SIZE, updates.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [updates.length]);

  if (!updates.length) {
    return <div className="empty-panel">{t("runSync")}</div>;
  }

  const visible = updates.slice(0, count);

  return (
    <>
      <div className="feed">
        {visible.map((item) => (
          <Reveal key={`${item.appid}-${item.date}-${item.title}`}>
            <PostCard item={item} />
          </Reveal>
        ))}
      </div>
      <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
      {count < updates.length ? (
        <div className="feed-loading">
          <div className="boot-ring" />
          <span>{t("feedLoading")}</span>
        </div>
      ) : (
        <div className="feed-end">{t("feedCaughtUp")}</div>
      )}
    </>
  );
}
