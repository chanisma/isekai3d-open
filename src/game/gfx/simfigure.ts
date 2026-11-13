import { hair2d } from '../looks';
import type { HairStyle, Outfit } from '../types';
import { ellipse, fillRound, shade, withAlpha } from './draw';

export type Facing = 'down' | 'up' | 'left' | 'right';
export type Expression = 'smile' | 'neutral' | 'frown';

export interface Look {
  shirt: string;
  skin: string;
  hair: string;
  /** Any of the game's hair styles; the newer ones are drawn as the nearest of the first five (looks.ts). */
  hairStyle?: HairStyle;
  /** Any top; all but a dress are drawn as a tee. */
  outfit?: Outfit;
  /** Trousers' colour (navy if left out). */
  pants?: string;
  /**
   * What the dweller has changed into for the moment (참고 게임 outfit categories: Sleep, Athletic,
   * Bathing, Formal), over their everyday outfit.
   */
  changed?: 'sleep' | 'athletic' | 'bathing' | 'formal';
}

const PANTS = '#3e4a61';
const PAJAMAS = '#9fc5e8';
const ATHLETIC = '#ef5350';
const FORMAL = '#263238';
const TOWEL = '#fafafa';

/** The colours an outfit category paints the torso and legs with. */
export function dressed(look: Look): { shirt: string; pants: string; armSkin: boolean; legSkin: boolean; dress: boolean } {
  switch (look.changed) {
    case 'sleep':
      return { shirt: PAJAMAS, pants: PAJAMAS, armSkin: false, legSkin: false, dress: false };
    case 'athletic':
      return { shirt: ATHLETIC, pants: '#37474f', armSkin: true, legSkin: true, dress: false };
    case 'bathing':
      return { shirt: look.skin, pants: TOWEL, armSkin: true, legSkin: true, dress: false };
    case 'formal':
      return { shirt: FORMAL, pants: '#1c2329', armSkin: false, legSkin: false, dress: look.outfit === 'dress' };
    default:
      return { shirt: look.shirt, pants: look.pants ?? PANTS, armSkin: false, legSkin: false, dress: look.outfit === 'dress' };
  }
}

function face(g: CanvasRenderingContext2D, hx: number, hy: number, facing: Facing, expr: Expression, eyesClosed: boolean) {
  const ink = '#2b2118';
  const eye = (x: number, y: number) => {
    if (eyesClosed) {
      g.strokeStyle = ink;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x - 1.4, y);
      g.lineTo(x + 1.4, y);
      g.stroke();
    } else ellipse(g, x, y, 1.1, 1.4, ink);
  };
  const mouth = (x: number, y: number, wdt: number) => {
    g.strokeStyle = '#8a3b2a';
    g.lineWidth = 1.1;
    g.beginPath();
    if (expr === 'smile') g.arc(x, y - 1.2, wdt, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (expr === 'frown') g.arc(x, y + 2, wdt, 1.2 * Math.PI, 1.8 * Math.PI);
    else {
      g.moveTo(x - wdt * 0.7, y);
      g.lineTo(x + wdt * 0.7, y);
    }
    g.stroke();
  };
  if (facing === 'down') {
    eye(hx - 2.7, hy + 0.6);
    eye(hx + 2.7, hy + 0.6);
    ellipse(g, hx - 4.2, hy + 2.6, 1.6, 1, 'rgba(240,120,110,0.35)');
    ellipse(g, hx + 4.2, hy + 2.6, 1.6, 1, 'rgba(240,120,110,0.35)');
    mouth(hx, hy + 3.6, 2.2);
  } else if (facing === 'left' || facing === 'right') {
    const s = facing === 'left' ? -1 : 1;
    eye(hx + s * 3.6, hy + 0.4);
    mouth(hx + s * 4.6, hy + 3.4, 1.4);
  }
}

function hair(g: CanvasRenderingContext2D, look: Look, hx: number, hy: number, r: number, facing: Facing) {
  const style = hair2d(look.hairStyle);
  if (style === 'buzz') {
    // A close crop: just a cap over the crown.
    g.fillStyle = look.hair;
    g.beginPath();
    if (facing === 'up') g.arc(hx, hy, r + 0.3, 0, Math.PI * 2);
    else g.arc(hx, hy - 1, r + 0.3, Math.PI * 1.05, Math.PI * 1.95);
    g.closePath();
    g.fill();
    return;
  }
  g.fillStyle = look.hair;
  g.beginPath();
  if (facing === 'up') {
    g.arc(hx, hy, r + 0.6, 0, Math.PI * 2);
  } else if (facing === 'down') {
    g.arc(hx, hy - 0.5, r + 0.6, Math.PI * 0.95, Math.PI * 2.05);
    g.quadraticCurveTo(hx + r * 0.3, hy - r * 0.15, hx - r * 0.2, hy - r * 0.35);
    g.quadraticCurveTo(hx - r * 0.6, hy - r * 0.2, hx - r - 0.6, hy - 0.3);
  } else {
    const s = facing === 'left' ? 1 : -1;
    g.arc(hx, hy - 0.5, r + 0.6, Math.PI, Math.PI * 2);
    g.lineTo(hx + s * (r + 0.6), hy + r * 0.6);
    g.quadraticCurveTo(hx + s * r * 0.2, hy + r * 0.1, hx - s * r * 0.4, hy - r * 0.45);
  }
  g.closePath();
  g.fill();
  if (style === 'bun') ellipse(g, hx, hy - r - 1.5, 3.4, 3, look.hair);
  if (style === 'curly') for (let i = 0; i < 6; i++) {
    const a = Math.PI * (1.05 + (i / 5) * 0.9);
    ellipse(g, hx + Math.cos(a) * (r + 0.4), hy - 0.5 + Math.sin(a) * (r + 0.4), 2.4, 2.4, look.hair);
  }
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.beginPath();
  g.ellipse(hx - r * 0.3, hy - r * 0.65, r * 0.35, r * 0.18, -0.4, 0, Math.PI * 2);
  g.fill();
}

/** Long hair falls behind the head and over the shoulders. */
function hairBehind(g: CanvasRenderingContext2D, look: Look, hx: number, hy: number, r: number, facing: Facing) {
  if (hair2d(look.hairStyle) !== 'long') return;
  if (facing === 'up') fillRound(g, hx - r - 1, hy - 2, r * 2 + 2, r + 9, 4, look.hair);
  else fillRound(g, hx - r - 1.2, hy - 1, r * 2 + 2.4, r + 7, 4, look.hair);
}

function head(g: CanvasRenderingContext2D, look: Look, hx: number, hy: number, facing: Facing, expr: Expression, eyesClosed = false) {
  const r = 7.5;
  hairBehind(g, look, hx, hy, r, facing);
  ellipse(g, hx, hy, r, r, look.skin);
  g.strokeStyle = shade(look.skin, -55);
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(hx, hy, r, 0, Math.PI * 2);
  g.stroke();
  if (facing !== 'up') face(g, hx, hy, facing, expr, eyesClosed);
  hair(g, look, hx, hy, r, facing);
}

/** A standing, walking or sitting dweller with feet (or seat) at (x, y). */
export function drawUpright(
  g: CanvasRenderingContext2D,
  look: Look,
  x: number,
  y: number,
  facing: Facing,
  opts: { walking: boolean; sitting: boolean; phase: number; expr: Expression },
) {
  const swing = opts.walking ? Math.sin(opts.phase) * 3 : 0;
  const bob = opts.walking ? Math.abs(Math.sin(opts.phase)) * 1.4 : Math.sin(opts.phase * 0.25) * 0.4;
  const side = facing === 'left' || facing === 'right';
  ellipse(g, x, y, side ? 7 : 9, 3.2, 'rgba(0,0,0,0.25)');
  const torsoTop = (opts.sitting ? y - 17 : y - 21) - bob;
  const wear = dressed(look);
  const dress = wear.dress;
  const pants = wear.pants;
  const PANTS_ = pants;
  // legs (bare under a dress or below shorts)
  const legColor = dress ? look.skin : pants;
  if (wear.legSkin && !opts.sitting) {
    for (const [lx, sw] of [[x - 5, swing > 0 ? -swing * 0.4 : 0], [x + 0.5, swing < 0 ? swing * 0.4 : 0]] as const) {
      fillRound(g, lx, y - 9 - bob + sw, 4.5, 9, 2, look.skin);
      fillRound(g, lx, y - 9 - bob + sw, 4.5, 4, 2, pants);
    }
  } else if (dress && !opts.sitting) {
    fillRound(g, x - 4.5, y - 9 - bob + (swing > 0 ? -swing * 0.4 : 0), 3.5, 9, 1.6, legColor);
    fillRound(g, x + 1, y - 9 - bob + (swing < 0 ? swing * 0.4 : 0), 3.5, 9, 1.6, legColor);
  } else if (!opts.sitting) {
    if (side) {
      fillRound(g, x - 2.5 + swing, y - 9 - bob, 5, 9, 2, shade(PANTS_, -10));
      fillRound(g, x - 2.5 - swing, y - 9 - bob, 5, 9, 2, PANTS_);
    } else {
      fillRound(g, x - 5, y - 9 - bob + (swing > 0 ? -swing * 0.4 : 0), 4.5, 9, 2, PANTS_);
      fillRound(g, x + 0.5, y - 9 - bob + (swing < 0 ? swing * 0.4 : 0), 4.5, 9, 2, PANTS_);
    }
  } else {
    fillRound(g, x - 6, torsoTop + 10, 12, 6, 3, dress ? wear.shirt : PANTS_);
  }
  // arms behind the torso when facing away
  const armColor = wear.armSkin ? look.skin : shade(wear.shirt, -25);
  const arm = (ax: number, dy: number) => fillRound(g, ax, torsoTop + 2 + dy, 3.6, 10, 1.8, armColor);
  if (!side) {
    arm(x - 9.4, opts.walking ? -swing * 0.5 : 0);
    arm(x + 5.8, opts.walking ? swing * 0.5 : 0);
  }
  fillRound(g, x - 7, torsoTop, 14, 13, 5, wear.shirt, shade(wear.shirt, -50));
  if (look.changed === 'bathing') {
    // A towel wrapped round from the chest down.
    fillRound(g, x - 7.5, torsoTop + 4, 15, opts.sitting ? 12 : 16, 3, TOWEL, '#cfd8dc');
  } else if (look.changed === 'athletic') {
    // A tank top: shoulders bare.
    fillRound(g, x - 7, torsoTop, 3, 4, 1.5, look.skin);
    fillRound(g, x + 4, torsoTop, 3, 4, 1.5, look.skin);
  } else if (look.changed === 'formal' && !dress) {
    // White collar and a tie.
    g.fillStyle = '#fafafa';
    g.fillRect(x - 2.5, torsoTop + 0.5, 5, 3);
    g.fillStyle = '#c62828';
    g.fillRect(x - 0.8, torsoTop + 2.5, 1.6, 7);
  } else if (look.changed === 'sleep') {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 3; i++) g.fillRect(x - 6 + i * 5, torsoTop + 2, 1.5, 10);
  }
  if (dress && !opts.sitting) {
    // A flared skirt from the waist.
    g.fillStyle = shade(wear.shirt, -8);
    g.beginPath();
    g.moveTo(x - 6.5, torsoTop + 10);
    g.lineTo(x + 6.5, torsoTop + 10);
    g.lineTo(x + 9 + swing * 0.3, y - 7 - bob);
    g.lineTo(x - 9 + swing * 0.3, y - 7 - bob);
    g.closePath();
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(x - 5, torsoTop + 2, 10, 2);
  if (side) fillRound(g, x - 1.8 + swing * 0.6, torsoTop + 2, 3.6, 10, 1.8, armColor);
  head(g, look, x, torsoTop - 6.5, facing, opts.expr);
}

/** A dweller lying on its back, head at (x, y), body pointing along `angle` (0 = toward +y). */
export function drawLying(g: CanvasRenderingContext2D, look: Look, x: number, y: number, angle: number, expr: Expression, coveredFrom?: number) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  const wear = dressed(look);
  if (coveredFrom === undefined) {
    fillRound(g, -5, 17, 4.5, 11, 2, wear.pants);
    fillRound(g, 0.5, 17, 4.5, 11, 2, wear.pants);
  }
  fillRound(g, -9.4, 6, 3.6, 11, 1.8, wear.armSkin ? look.skin : shade(wear.shirt, -25));
  fillRound(g, 5.8, 6, 3.6, 11, 1.8, wear.armSkin ? look.skin : shade(wear.shirt, -25));
  fillRound(g, -7, 5, 14, 14, 5, wear.shirt, shade(wear.shirt, -50));
  head(g, look, 0, 0, 'down', expr, true);
  g.restore();
}

/** The Dwellers' diamond, slowly spinning, with a soft glow. */
export function drawPlumbob(g: CanvasRenderingContext2D, x: number, y: number, color: string, now: number) {
  const spin = Math.cos(now / 650);
  const sx = 0.35 + 0.65 * Math.abs(spin);
  const glow = g.createRadialGradient(x, y, 1, x, y, 14);
  glow.addColorStop(0, withAlpha(color, 0.5));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.fillRect(x - 14, y - 14, 28, 28);
  const top = { x, y: y - 11 };
  const bottom = { x, y: y + 11 };
  const left = { x: x - 6.5 * sx, y };
  const right = { x: x + 6.5 * sx, y };
  const mid = { x: x + spin * 2.2, y };
  const facet = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, fill: string) => {
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(c.x, c.y);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  facet(top, left, mid, shade(color, 45));
  facet(top, mid, right, shade(color, 5));
  facet(bottom, left, mid, shade(color, -15));
  facet(bottom, mid, right, shade(color, -50));
  g.strokeStyle = shade(color, -80);
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(top.x, top.y);
  g.lineTo(right.x, right.y);
  g.lineTo(bottom.x, bottom.y);
  g.lineTo(left.x, left.y);
  g.closePath();
  g.stroke();
}
