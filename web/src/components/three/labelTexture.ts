import * as THREE from "three";

export interface LabelTexture {
  texture: THREE.CanvasTexture;
  aspect: number;
}

const PAD_X = 30;
const HEIGHT = 74;
const NAME_FONT = "600 34px 'Inter Variable', Inter, system-ui, sans-serif";
const HOURS_FONT = "500 24px ui-monospace, 'JetBrains Mono', Consolas, monospace";
const SCALE = 2;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Render a game's name + hours onto a glassy pill texture (fully offline —
 * no SDF font fetch, uses whatever the document has already loaded).
 */
export function makeLabelTexture(
  name: string,
  hours: string,
  accent: string,
  emphasized: boolean,
): LabelTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    return { texture: fallback, aspect: 4 };
  }

  ctx.font = NAME_FONT;
  const nameWidth = ctx.measureText(name).width;
  ctx.font = HOURS_FONT;
  const hoursWidth = ctx.measureText(hours).width;

  const dotSpace = 12 + 16; // dot + gap
  const gap = 18;
  const width = Math.ceil(PAD_X * 2 + dotSpace + nameWidth + gap + hoursWidth);

  canvas.width = width * SCALE;
  canvas.height = HEIGHT * SCALE;
  ctx.scale(SCALE, SCALE);

  // Glass pill
  ctx.fillStyle = emphasized ? "rgba(24, 24, 30, 0.92)" : "rgba(16, 16, 20, 0.78)";
  roundedRect(ctx, 0.5, 0.5, width - 1, HEIGHT - 1, 18);
  ctx.fill();
  ctx.strokeStyle = emphasized ? accent : hexWithAlpha(accent, 0.55);
  ctx.lineWidth = emphasized ? 2 : 1.25;
  ctx.stroke();

  // Genre dot
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(PAD_X + 5, HEIGHT / 2, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Name
  ctx.fillStyle = "rgba(247, 248, 248, 0.96)";
  ctx.font = NAME_FONT;
  ctx.textBaseline = "middle";
  ctx.fillText(name, PAD_X + dotSpace, HEIGHT / 2 + 1);

  // Hours
  ctx.fillStyle = emphasized ? "#c3c9ff" : "rgba(179, 182, 189, 0.9)";
  ctx.font = HOURS_FONT;
  ctx.fillText(hours, PAD_X + dotSpace + nameWidth + gap, HEIGHT / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / HEIGHT };
}

/** #rrggbb → rgba() with the given alpha (tolerates hsl input by passing through). */
function hexWithAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
