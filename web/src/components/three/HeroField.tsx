import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type HeroDensity = "low" | "full";

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aHue;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec3 p = position;
    float wave = sin(p.x * 0.26 + uTime * 0.55) * cos(p.z * 0.21 + uTime * 0.4);
    p.y += wave * 1.7;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = uSize * aScale * uPixelRatio * (130.0 / -mvPosition.z);

    vColor = mix(vec3(0.34, 0.37, 0.72), vec3(0.51, 0.56, 0.95), aHue);
    float depthFade = clamp((72.0 + mvPosition.z) / 42.0, 0.0, 1.0);
    vAlpha = (0.16 + aHue * 0.3) * depthFade;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.06, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

interface FieldGeometry {
  positions: Float32Array;
  scales: Float32Array;
  hues: Float32Array;
  count: number;
}

function buildField(density: HeroDensity): FieldGeometry {
  const cols = density === "full" ? 55 : 45;
  const rows = density === "full" ? 40 : 20; // 2200 / 900 particles — cap is 3000
  const width = 64;
  const depth = 42;

  const count = cols * rows;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const hues = new Float32Array(count);

  let i = 0;
  for (let ix = 0; ix < cols; ix++) {
    for (let iz = 0; iz < rows; iz++) {
      positions[i * 3] = (ix / (cols - 1) - 0.5) * width;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (iz / (rows - 1) - 0.5) * depth;
      scales[i] = 0.55 + Math.random() * 0.85;
      hues[i] = Math.random();
      i++;
    }
  }
  return { positions, scales, hues, count };
}

function WaveField({ density }: { density: HeroDensity }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const field = useMemo(() => buildField(density), [density]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(field.positions, 3));
    geo.setAttribute("aScale", new THREE.BufferAttribute(field.scales, 1));
    geo.setAttribute("aHue", new THREE.BufferAttribute(field.hues, 1));
    return geo;
  }, [field]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: density === "full" ? 2.1 : 2.5 },
      uPixelRatio: {
        value: typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 2),
      },
    }),
    [density],
  );

  // Parallax input comes from a window listener so the canvas can stay
  // pointer-events: none and never intercept UI interactions.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const material = materialRef.current;
    if (material) {
      material.uniforms.uTime.value = clock.elapsedTime * (density === "full" ? 1 : 0.6);
    }
    const points = pointsRef.current;
    if (!points) return;
    const lerp = Math.min(1, delta * 2.2);
    points.rotation.y += (pointer.current.x * 0.07 - points.rotation.y) * lerp;
    points.rotation.x += (pointer.current.y * 0.045 - points.rotation.x) * lerp;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Hero particle/wave field. Fixed backdrop, pointer-events transparent,
 * dpr capped at [1, 2], particle count ≤ 2200 (≤ 3000 red line).
 */
export default function HeroField({ density = "full" }: { density?: HeroDensity }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 8.5, 23], fov: 54, near: 0.1, far: 120 }}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      frameloop="always"
      style={{ pointerEvents: "none" }}
    >
      <WaveField density={density} />
    </Canvas>
  );
}
