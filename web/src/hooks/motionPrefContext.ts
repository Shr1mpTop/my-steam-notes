import { createContext, useContext } from "react";

export type MotionLevel = "full" | "reduced";

export interface MotionPrefValue {
  /** User/OS motion preference: reduced disables 3D scenes + entrance transforms. */
  motion: MotionLevel;
  setMotion: (level: MotionLevel) => void;
  /** Scene budget: "off" → no WebGL scenes, "low" → fewer particles, "full" → everything. */
  scene: "off" | "low" | "full";
}

export const MotionPrefContext = createContext<MotionPrefValue>({
  motion: "full",
  setMotion: () => undefined,
  scene: "full",
});

export function useMotionPref(): MotionPrefValue {
  return useContext(MotionPrefContext);
}
