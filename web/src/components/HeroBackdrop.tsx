import { lazy, Suspense, useState } from "react";
import type { ComponentType } from "react";
import { useMotionPref } from "../hooks/motionPrefContext";
import { hasWebGL } from "../lib/cloudLayout";

const HeroField = lazy(() => import("./three/HeroField")) as ComponentType<{
  density?: "low" | "full";
}>;

/**
 * Fixed particle-field backdrop. Lazy-loads the three.js bundle so the
 * first paint is never blocked; skipped entirely for reduced motion
 * or when WebGL is unavailable (CSS glows in index.css carry the mood).
 */
export function HeroBackdrop() {
  const { scene } = useMotionPref();
  const [webgl] = useState(hasWebGL);

  if (scene === "off" || !webgl) return null;

  return (
    <div className="hero-canvas" aria-hidden="true">
      <Suspense fallback={null}>
        <HeroField density={scene === "low" ? "low" : "full"} />
      </Suspense>
    </div>
  );
}
