import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { CloudEntry } from "../../lib/cloudLayout";
import { fmtHours } from "../../lib/format";
import { makeLabelTexture } from "./labelTexture";

interface SceneProps {
  entries: CloudEntry[];
  hoveredAppId: number | null;
  dimmedAppIds: Set<number> | null;
  onHover: (appid: number | null) => void;
}

interface OrbiterProps {
  entry: CloudEntry;
  hovered: boolean;
  dimmed: boolean;
  fontEpoch: number;
  onHover: (appid: number | null) => void;
}

function Orbiter({ entry, hovered, dimmed, fontEpoch, onHover }: OrbiterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const scaleRef = useRef(1);
  const opacityRef = useRef(0.9);

  const label = useMemo(
    () => makeLabelTexture(entry.name, fmtHours(entry.hours), entry.color, hovered),
    // fontEpoch is deliberately included: bumping it forces texture regeneration
    // once webfonts finish loading (it is not used inside the factory itself).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry.name, entry.hours, entry.color, hovered, fontEpoch],
  );

  const planeHeight = entry.height;
  const planeWidth = entry.height * label.aspect;

  useEffect(
    () => () => {
      label.texture.dispose();
    },
    [label],
  );

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.elapsedTime;

    const theta = entry.angle0 + t * entry.speed;
    group.position.set(
      Math.cos(theta) * entry.radius,
      Math.sin(t * 0.45 + entry.phase) * entry.yAmp * 0.55 +
        Math.sin(theta * 1.7 + entry.phase) * entry.yAmp * 0.45,
      Math.sin(theta) * entry.radius * 0.55,
    );

    const targetScale = hovered ? 1.24 : 1;
    scaleRef.current += (targetScale - scaleRef.current) * Math.min(1, delta * 9);
    group.scale.setScalar(scaleRef.current);

    const targetOpacity = dimmed ? 0.12 : hovered ? 1 : 0.88;
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 9);
    if (materialRef.current) materialRef.current.opacity = opacityRef.current;
  });

  return (
    <group ref={groupRef}>
      <Billboard>
        <mesh
          onPointerOver={(event) => {
            event.stopPropagation();
            onHover(entry.appid);
          }}
          onPointerOut={() => onHover(null)}
        >
          <planeGeometry args={[planeWidth, planeHeight]} />
          <meshBasicMaterial
            ref={materialRef}
            map={label.texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

function CloudContents({ entries, hoveredAppId, dimmedAppIds, fontEpoch, onHover }: SceneProps & { fontEpoch: number }) {
  return (
    <group>
      {entries.map((entry) => (
        <Orbiter
          key={entry.appid}
          entry={entry}
          hovered={hoveredAppId === entry.appid}
          dimmed={dimmedAppIds?.has(entry.appid) ?? false}
          fontEpoch={fontEpoch}
          onHover={onHover}
        />
      ))}
    </group>
  );
}

/**
 * 3D game cloud — top games as floating billboards on slow inclined orbits.
 * Hover a label to highlight it; genre filters dim non-matching entries.
 * dpr capped at [1, 2]; mesh count = entries (≤ 24), no particles here.
 */
export default function GameCloudScene({ entries, hoveredAppId, dimmedAppIds, onHover }: SceneProps) {
  // Regenerate label textures once webfonts finish loading so labels render in Inter.
  const [fontEpoch, setFontEpoch] = useState(0);
  useEffect(() => {
    let alive = true;
    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(() => {
        if (alive) setFontEpoch((epoch) => epoch + 1);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 2.4, 34], fov: 45, near: 0.1, far: 120 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      frameloop="always"
      onPointerMissed={() => onHover(null)}
    >
      <CloudContents
        entries={entries}
        hoveredAppId={hoveredAppId}
        dimmedAppIds={dimmedAppIds}
        fontEpoch={fontEpoch}
        onHover={onHover}
      />
    </Canvas>
  );
}
