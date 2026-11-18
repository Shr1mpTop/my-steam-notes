import { useState } from "react";

const CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);
  const text = parts.map((w) => w[0]!.toUpperCase()).join("");
  return text || "GAME";
}

interface GameCoverProps {
  appid: number;
  name: string;
  /** portrait = library_600x900 (photo wall), landscape = header.jpg (post image) */
  variant?: "portrait" | "landscape";
  className?: string;
}

/**
 * Steam CDN cover with a graceful fallback chain
 * (library_600x900 -> header for portraits, header -> capsule for landscapes)
 * and a fade-in once decoded; renders a monogram tile if everything 404s.
 */
export function GameCover({ appid, name, variant = "landscape", className }: GameCoverProps) {
  const candidates =
    variant === "portrait"
      ? [`${CDN}/${appid}/library_600x900.jpg`, `${CDN}/${appid}/header.jpg`]
      : [`${CDN}/${appid}/header.jpg`, `${CDN}/${appid}/capsule_184x90.jpg`];
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);

  if (step >= candidates.length) {
    return (
      <div className={`cover-fallback${className ? ` ${className}` : ""}`} role="img" aria-label={name}>
        <span>{initials(name)}</span>
      </div>
    );
  }

  return (
    <img
      className={`cover-img${className ? ` ${className}` : ""}${loaded ? " is-loaded" : ""}`}
      src={candidates[step]}
      alt={name}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setStep((s) => s + 1)}
    />
  );
}
