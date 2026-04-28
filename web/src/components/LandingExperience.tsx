import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DashboardData } from "../types";

interface Props {
  data: DashboardData;
}

interface Chapter {
  eyebrow: string;
  title: string;
  body: string;
  stat: string;
  label: string;
}

const palette = [0x67e8f9, 0x34d399, 0xf59e0b, 0xfb7185, 0xa78bfa];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatHours(value: number) {
  return `${Math.round(value).toLocaleString()}h`;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function LandingExperience({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef(0);
  const [activeChapter, setActiveChapter] = useState(0);

  const topGame = data.pareto[0];
  const recentGame = data.recent_activity[0];
  const strongestGenre = data.genres[0];
  const genreBars = useMemo(() => data.genres.slice(0, 7).map((genre) => genre.hours), [data.genres]);

  const chapters = useMemo<Chapter[]>(() => [
    {
      eyebrow: "Steam Notebook",
      title: "把游玩记录变成一条可穿行的时间线",
      body: `${data.player.personaname} 的库里有 ${data.stats.total_games.toLocaleString()} 款游戏，所有轨迹汇成一个可滚动探索的数据宇宙。`,
      stat: data.stats.total_games.toLocaleString(),
      label: "Games tracked",
    },
    {
      eyebrow: "Playtime Orbit",
      title: "每一小时都在改变星图的重心",
      body: `累计 ${formatHours(data.milestone.total_hours)} 的游玩时间，让偏爱的类型、周期和沉迷峰值变得一眼可见。`,
      stat: formatHours(data.milestone.total_hours),
      label: "Total playtime",
    },
    {
      eyebrow: "Gravity Well",
      title: topGame ? `${topGame.name} 是当前最强引力源` : "最长投入的游戏会自然浮出水面",
      body: topGame
        ? `它贡献了 ${formatHours(topGame.hours)}，占前列累计曲线的 ${topGame.cumulative_pct.toFixed(1)}%。`
        : "当数据同步后，投入最深的游戏会成为这个宇宙里的主星。",
      stat: topGame ? formatHours(topGame.hours) : "Ready",
      label: "Top game pull",
    },
    {
      eyebrow: "Live Console",
      title: "落回控制台，继续看真实数据",
      body: recentGame
        ? `最近两周最活跃的是 ${recentGame.name}，同时还有更新、成就、热力图和类型网络等待继续分析。`
        : "下方保留完整控制台：更新、成就、热力图、类型网络和最近活动都还在原位。",
      stat: strongestGenre ? strongestGenre.genre : "Dashboard",
      label: strongestGenre ? `${formatCompact(strongestGenre.hours)} genre hours` : "Open console",
    },
  ], [data, recentGame, strongestGenre, topGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.035);

    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.2, 8.8);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x05070b, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const root = new THREE.Group();
    scene.add(root);

    const ambient = new THREE.AmbientLight(0x91a7ff, 1.5);
    const keyLight = new THREE.PointLight(0x67e8f9, 18, 28);
    keyLight.position.set(-4, 3.5, 5);
    const warmLight = new THREE.PointLight(0xf59e0b, 10, 26);
    warmLight.position.set(4, -2, 3);
    scene.add(ambient, keyLight, warmLight);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x123b4f,
      metalness: 0.45,
      roughness: 0.28,
      transparent: true,
      opacity: 0.76,
      wireframe: true,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 2), coreMaterial);
    root.add(core);

    const ringMaterials = palette.slice(0, 4).map((color, index) => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18 - index * 0.02,
      wireframe: true,
    }));
    ringMaterials.forEach((material, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9 + index * 0.48, 0.008, 8, 128), material);
      ring.rotation.set(index * 0.7, index * 0.35, index * 0.45);
      root.add(ring);
    });

    const particleCount = 1500;
    const basePositions = new Float32Array(particleCount * 3);
    const streamPositions = new Float32Array(particleCount * 3);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < particleCount; i += 1) {
      const i3 = i * 3;
      const angle = i * 0.091;
      const lane = (i % 13) / 13;
      const radius = 1.35 + (i % 89) / 18;
      const depth = ((i % 97) / 97 - 0.5) * 7.8;
      const spiral = angle + radius * 0.22;

      basePositions[i3] = Math.cos(spiral) * radius;
      basePositions[i3 + 1] = Math.sin(spiral * 1.3) * (0.92 + lane * 1.6);
      basePositions[i3 + 2] = depth;

      streamPositions[i3] = (lane - 0.5) * 8.5 + Math.sin(angle) * 0.52;
      streamPositions[i3 + 1] = Math.sin(i * 0.027) * 1.15 + Math.cos(angle * 0.32) * 0.28;
      streamPositions[i3 + 2] = 5.2 - (i / particleCount) * 11.8;

      positions[i3] = basePositions[i3];
      positions[i3 + 1] = basePositions[i3 + 1];
      positions[i3 + 2] = basePositions[i3 + 2];

      color.setHex(palette[i % palette.length]);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.032,
      transparent: true,
      opacity: 0.78,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    root.add(particles);

    const lineMaterials: THREE.LineBasicMaterial[] = [];
    for (let lane = 0; lane < 7; lane += 1) {
      const points: THREE.Vector3[] = [];
      for (let step = 0; step < 120; step += 1) {
        const t = step / 119;
        const angle = t * Math.PI * 5.8 + lane * 0.7;
        const radius = 2.1 + lane * 0.22 + Math.sin(t * Math.PI) * 0.55;
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle * 0.68) * (1.1 + lane * 0.12),
          (t - 0.5) * 9.5,
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: palette[lane % palette.length],
        transparent: true,
        opacity: 0.2,
      });
      lineMaterials.push(material);
      root.add(new THREE.Line(geometry, material));
    }

    const panelGroup = new THREE.Group();
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x8bd8ff,
      transparent: true,
      opacity: 0.1,
      wireframe: true,
    });
    for (let i = 0; i < 9; i += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.95 + (i % 3) * 0.28, 0.42, 0.02), panelMaterial);
      panel.position.set((i % 3 - 1) * 1.36, 1.55 - Math.floor(i / 3) * 0.58, -1.2 - i * 0.08);
      panel.rotation.y = -0.24;
      panelGroup.add(panel);
    }
    panelGroup.position.set(2.7, -0.45, -1.2);
    root.add(panelGroup);

    const bars = new THREE.Group();
    const maxHours = Math.max(...genreBars, 1);
    genreBars.forEach((hours, index) => {
      const height = 0.32 + (hours / maxHours) * 1.65;
      const material = new THREE.MeshStandardMaterial({
        color: palette[index % palette.length],
        emissive: palette[index % palette.length],
        emissiveIntensity: 0.12,
        metalness: 0.2,
        roughness: 0.35,
        transparent: true,
        opacity: 0.78,
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, height, 0.26), material);
      bar.position.set((index - (genreBars.length - 1) / 2) * 0.42, -1.72 + height / 2, -0.55);
      bars.add(bar);
    });
    bars.position.set(-2.65, 0.08, -0.9);
    bars.rotation.y = 0.28;
    root.add(bars);

    let targetProgress = 0;
    let smoothProgress = 0;
    let animationFrame = 0;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const positionAttribute = particleGeometry.getAttribute("position") as THREE.BufferAttribute;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateProgress = () => {
      const bounds = section.getBoundingClientRect();
      const scrollable = Math.max(bounds.height - window.innerHeight, 1);
      targetProgress = clamp(-bounds.top / scrollable, 0, 1);
      const nextChapter = Math.min(chapters.length - 1, Math.floor(targetProgress * chapters.length));
      if (nextChapter !== activeRef.current) {
        activeRef.current = nextChapter;
        setActiveChapter(nextChapter);
      }
    };

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      updateProgress();
    };

    const updateMotionPreference = () => {
      reducedMotion = motionQuery.matches;
    };

    const animate = () => {
      smoothProgress = reducedMotion
        ? targetProgress
        : THREE.MathUtils.lerp(smoothProgress, targetProgress, 0.075);

      const streamBlend = Math.sin(smoothProgress * Math.PI);
      const time = performance.now() * 0.001;

      for (let i = 0; i < particleCount; i += 1) {
        const i3 = i * 3;
        const wave = Math.sin(time * 0.8 + i * 0.019) * 0.08;
        const blend = clamp(streamBlend + wave, 0, 1);
        positions[i3] = THREE.MathUtils.lerp(basePositions[i3], streamPositions[i3], blend);
        positions[i3 + 1] = THREE.MathUtils.lerp(basePositions[i3 + 1], streamPositions[i3 + 1], blend);
        positions[i3 + 2] = THREE.MathUtils.lerp(basePositions[i3 + 2], streamPositions[i3 + 2], blend);
      }
      positionAttribute.needsUpdate = true;

      root.rotation.y = smoothProgress * Math.PI * 1.35 + time * 0.035;
      root.rotation.x = Math.sin(smoothProgress * Math.PI) * 0.18;
      core.rotation.x = time * 0.24 + smoothProgress * 1.6;
      core.rotation.y = time * 0.32 + smoothProgress * 2.2;
      particles.rotation.z = -smoothProgress * 0.46;
      panelGroup.position.x = 2.9 - smoothProgress * 1.3;
      panelGroup.rotation.y = -0.25 + smoothProgress * 0.72;
      bars.position.x = -2.8 + Math.sin(smoothProgress * Math.PI) * 0.9;
      bars.rotation.y = 0.3 - smoothProgress * 0.58;

      camera.position.x = THREE.MathUtils.lerp(-0.55, 0.7, smoothProgress);
      camera.position.y = THREE.MathUtils.lerp(0.22, -0.18, Math.sin(smoothProgress * Math.PI));
      camera.position.z = THREE.MathUtils.lerp(8.8, 6.35, smoothProgress);
      camera.lookAt(0, 0, 0);

      lineMaterials.forEach((material, index) => {
        material.opacity = 0.12 + Math.sin(smoothProgress * Math.PI + index * 0.4) * 0.12;
      });

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    updateProgress();
    resize();
    animate();

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", resize);
    motionQuery.addEventListener("change", updateMotionPreference);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener("change", updateMotionPreference);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
        }
      });
      coreMaterial.dispose();
      ringMaterials.forEach((material) => material.dispose());
      particleMaterial.dispose();
      lineMaterials.forEach((material) => material.dispose());
      panelMaterial.dispose();
      bars.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [chapters.length, genreBars]);

  return (
    <section className="landing-experience" ref={sectionRef} aria-label="Steam Notebook overview">
      <div className="landing-stage">
        <canvas className="landing-canvas" ref={canvasRef} />

        <nav className="landing-nav" aria-label="Primary">
          <a className="landing-wordmark" href="#top" aria-label="Steam Notebook home">
            <span className="wordmark-mark" />
            <span>Steam Notebook</span>
          </a>
          <a className="landing-console-link" href="#dashboard">进入控制台</a>
        </nav>

        <div className="landing-copy">
          <div className="landing-chapters" aria-live="polite">
            {chapters.map((chapter, index) => (
              <article
                className={`landing-chapter ${index === activeChapter ? "is-active" : ""}`}
                key={chapter.eyebrow}
                aria-hidden={index !== activeChapter}
              >
                <p className="landing-eyebrow">{chapter.eyebrow}</p>
                <h1 className="landing-title">{chapter.title}</h1>
                <p className="landing-body">{chapter.body}</p>
                <div className="landing-actions">
                  <a className="landing-primary-action" href="#dashboard" tabIndex={index === activeChapter ? undefined : -1}>
                    进入现有控制台
                  </a>
                  <span className="landing-live-pill">{data.player.online ? "Online" : "Offline"}</span>
                </div>
              </article>
            ))}
          </div>

          <aside className="landing-metric-panel" aria-label="Active metric">
            <span className="landing-metric-value">{chapters[activeChapter].stat}</span>
            <span className="landing-metric-label">{chapters[activeChapter].label}</span>
          </aside>
        </div>

        <div className="landing-progress" aria-hidden="true">
          {chapters.map((chapter, index) => (
            <span className={index === activeChapter ? "is-active" : ""} key={chapter.eyebrow} />
          ))}
        </div>
      </div>
    </section>
  );
}
