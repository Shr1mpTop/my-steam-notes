import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MotionPrefContext } from "./motionPrefContext";
import type { MotionLevel, MotionPrefValue } from "./motionPrefContext";

const STORAGE_KEY = "steam-notebook-motion-v1";

function initialMotion(): MotionLevel {
  if (typeof window === "undefined") return "full";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "reduced" || saved === "full") return saved;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}

export function MotionPrefProvider({ children }: { children: ReactNode }) {
  const [motion, setMotion] = useState<MotionLevel>(initialMotion);
  const [smallViewport, setSmallViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 820,
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, motion);
  }, [motion]);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSmallViewport(window.innerWidth < 820));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const value = useMemo<MotionPrefValue>(
    () => ({
      motion,
      setMotion,
      scene: motion === "reduced" ? "off" : smallViewport ? "low" : "full",
    }),
    [motion, smallViewport],
  );

  return <MotionPrefContext.Provider value={value}>{children}</MotionPrefContext.Provider>;
}
