import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { DashboardData, GameCloudItem } from "../types";

interface Props {
  data: DashboardData;
}

const COLORS = [0x67e8f9, 0x34d399, 0xf59e0b, 0xfb7185, 0xa78bfa, 0x60a5fa];

function formatHours(value: number, digits = 0) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}h`;
}

function steamIconUrl(game: GameCloudItem) {
  return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function LandingExperience({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  const topGames = useMemo(() => data.game_cloud.slice(0, 6), [data.game_cloud]);
  const recentGames = data.game_weather.games.slice(0, 5);
  const topGame = data.pareto[0];
  const totalHours = formatHours(data.milestone.total_hours, 1);
  const xpLevel = Math.floor(data.milestone.total_hours / 100) + 1;
  const xpProgress = Math.round(data.milestone.total_hours % 100);
  const playedPct = Math.round((data.stats.played_games / Math.max(data.stats.total_games, 1)) * 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.045);

    const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 90);
    camera.position.set(0, 0.2, 11.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x05070b, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const root = new THREE.Group();
    const libraryGroup = new THREE.Group();
    const railGroup = new THREE.Group();
    scene.add(root);
    root.add(libraryGroup, railGroup);

    scene.add(new THREE.AmbientLight(0xb9d6ff, 1.2));
    const cyan = new THREE.PointLight(0x67e8f9, 18, 28);
    cyan.position.set(-4, 4, 6);
    const amber = new THREE.PointLight(0xf59e0b, 10, 24);
    amber.position.set(4, -3, 5);
    scene.add(cyan, amber);

    const gameCount = Math.min(Math.max(data.game_cloud.length * 8, 900), window.innerWidth < 760 ? 1000 : 1800);
    const positions = new Float32Array(gameCount * 3);
    const colors = new Float32Array(gameCount * 3);
    const color = new THREE.Color();
    const maxHours = Math.max(...data.game_cloud.map((game) => game.playtime_hours), 1);

    for (let i = 0; i < gameCount; i += 1) {
      const game = data.game_cloud[i % data.game_cloud.length];
      const rank = i / gameCount;
      const lane = (i % 17) / 17;
      const angle = rank * Math.PI * 18 + lane * Math.PI * 2;
      const weight = Math.sqrt((game?.playtime_hours ?? 0) / maxHours);
      const radius = 1.2 + lane * 4.8 + weight * 1.2;
      const i3 = i * 3;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle * 0.72) * (0.9 + weight * 1.9);
      positions[i3 + 2] = Math.sin(angle) * radius * 0.42 + (rank - 0.5) * 5.8;

      color.setHex(COLORS[(game?.appid ?? i) % COLORS.length]);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pointMaterial = new THREE.PointsMaterial({
      size: window.innerWidth < 760 ? 0.035 : 0.028,
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pointGeometry, pointMaterial);
    libraryGroup.add(points);

    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.055,
      wireframe: true,
    });
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 3), shellMaterial);
    libraryGroup.add(shell);

    const ringMaterials: THREE.LineBasicMaterial[] = [];
    for (let ringIndex = 0; ringIndex < 7; ringIndex += 1) {
      const ringPoints: THREE.Vector3[] = [];
      for (let step = 0; step <= 220; step += 1) {
        const t = step / 220;
        const angle = t * Math.PI * 2;
        const radius = 2.1 + ringIndex * 0.56;
        ringPoints.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * (0.34 + ringIndex * 0.035),
          Math.sin(angle + ringIndex) * 0.42,
        ));
      }
      const material = new THREE.LineBasicMaterial({
        color: COLORS[ringIndex % COLORS.length],
        transparent: true,
        opacity: 0.13,
      });
      const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPoints), material);
      ring.rotation.set(ringIndex * 0.46, ringIndex * 0.22, ringIndex * 0.18);
      ringMaterials.push(material);
      railGroup.add(ring);
    }

    const reticleMaterial = new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.28 });
    const reticle = new THREE.Group();
    const reticleCircle: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i += 1) {
      const angle = (i / 80) * Math.PI * 2;
      reticleCircle.push(new THREE.Vector3(Math.cos(angle) * 1.4, Math.sin(angle) * 1.4, 0));
    }
    reticle.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(reticleCircle), reticleMaterial));
    [
      [new THREE.Vector3(-1.9, 0, 0), new THREE.Vector3(-0.92, 0, 0)],
      [new THREE.Vector3(0.92, 0, 0), new THREE.Vector3(1.9, 0, 0)],
      [new THREE.Vector3(0, -1.9, 0), new THREE.Vector3(0, -0.92, 0)],
      [new THREE.Vector3(0, 0.92, 0), new THREE.Vector3(0, 1.9, 0)],
    ].forEach((pair) => reticle.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pair), reticleMaterial)));
    reticle.position.set(-1.9, -0.35, 0.45);
    railGroup.add(reticle);

    const shardMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const shards = new THREE.Group();
    for (let i = 0; i < 6; i += 1) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.22 + i * 0.018, 1.2 + i * 0.1, 3), shardMaterial);
      shard.position.set(2 + (i - 2.5) * 0.42, -0.2 + Math.sin(i) * 0.2, 0.24 - i * 0.03);
      shard.rotation.set(Math.PI / 2, 0.2, i * 0.46);
      shards.add(shard);
    }
    railGroup.add(shards);

    let animationFrame = 0;
    let targetScroll = 0;
    let scroll = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateScroll = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      targetScroll = clamp(window.scrollY / maxScroll, 0, 1);
    };

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight);
      updateScroll();
    };

    const animate = () => {
      scroll = reducedMotion ? targetScroll : THREE.MathUtils.lerp(scroll, targetScroll, 0.055);
      const time = performance.now() * 0.001;

      libraryGroup.rotation.y = time * 0.025 + scroll * 1.65;
      libraryGroup.rotation.x = Math.sin(scroll * Math.PI) * 0.16;
      railGroup.rotation.z = -scroll * 0.42;
      shell.rotation.x = time * 0.08;
      shell.rotation.y = time * 0.11;
      reticle.rotation.z = time * 0.22;
      shards.rotation.y = Math.sin(time * 0.6) * 0.2 + scroll * 0.7;
      pointMaterial.opacity = 0.52 + Math.sin(scroll * Math.PI) * 0.22;

      camera.position.x = Math.sin(scroll * Math.PI * 2) * 0.9;
      camera.position.y = 0.2 + scroll * 1.4;
      camera.position.z = 11.5 - scroll * 2.3;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    updateScroll();
    resize();
    animate();

    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", resize);
      pointGeometry.dispose();
      pointMaterial.dispose();
      shell.geometry.dispose();
      shellMaterial.dispose();
      ringMaterials.forEach((material) => material.dispose());
      reticleMaterial.dispose();
      shardMaterial.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Line) object.geometry.dispose();
        if (object instanceof THREE.Mesh && object !== shell) object.geometry.dispose();
      });
      renderer.dispose();
    };
  }, [data.game_cloud]);

  return (
    <>
      <div className="atlas-backdrop" aria-hidden="true">
        <canvas className="atlas-canvas" ref={canvasRef} />
      </div>

      <section className="atlas-hero" ref={heroRef} aria-label="Steam data atlas">
        <nav className="atlas-nav" aria-label="Primary">
          <a className="atlas-wordmark" href="#top" aria-label="Steam Notebook home">
            <span className="atlas-mark" />
            <span>Steam Notebook</span>
          </a>
          <div className="atlas-nav-actions">
            <a href="#dashboard">数据舱</a>
            <a href="#updates">更新动态</a>
          </div>
        </nav>

        <div className="atlas-hero-inner">
          <div className="atlas-copy">
            <p className="atlas-eyebrow">Private Steam Atlas</p>
            <h1>{data.player.personaname} 的游玩宇宙</h1>
            <p>
              不是报告，不是流水账。这里是一座个人 Steam 观测台：游戏库、热力、成就、类型、更新和近期气候都被压进同一个空间。
            </p>
            <div className="atlas-actions">
              <a href="#dashboard">进入数据舱</a>
              <span>{data.player.online ? "Online" : "Offline"} · Lv.{data.player.level}</span>
            </div>
          </div>

          <aside className="atlas-command-panel" aria-label="Steam summary">
            <div className="atlas-player">
              {data.player.avatarfull && <img src={data.player.avatarfull} alt={data.player.personaname} />}
              <div>
                <strong>{totalHours}</strong>
                <span>Total playtime · XP Level {xpLevel}</span>
              </div>
            </div>
            <div className="atlas-kpi-grid">
              <div><strong>{data.stats.total_games}</strong><span>Games</span></div>
              <div><strong>{playedPct}%</strong><span>Activated</span></div>
              <div><strong>{data.milestone.walking_km.toLocaleString()} km</strong><span>Walking eq.</span></div>
              <div><strong>{xpProgress}/100</strong><span>Next level</span></div>
            </div>
            <div className="atlas-weather">
              <span>Gaming Weather</span>
              <strong>{data.game_weather.forecast} · {data.game_weather.top_game}</strong>
              {recentGames.map((game) => (
                <div key={game.name}>
                  <span>{game.name}</span>
                  <b>{formatHours(game.hours, 1)}</b>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="atlas-orbit-strip" aria-label="Top games">
          {topGames.map((game) => (
            <div className="atlas-game-sigil" key={game.appid}>
              {game.img_icon_url && <img src={steamIconUrl(game)} alt="" />}
              <span>{game.name}</span>
              <strong>{formatHours(game.playtime_hours, 1)}</strong>
            </div>
          ))}
        </div>

        {topGame && (
          <div className="atlas-marquee" aria-hidden="true">
            <span>Top Gravity: {topGame.name} · {formatHours(topGame.hours, 1)}</span>
            <span>Heatmap · Network · Achievements · Updates</span>
          </div>
        )}
      </section>
    </>
  );
}
