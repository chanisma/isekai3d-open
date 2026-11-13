import type { Dir, ObjectDef } from '../types';
import { dims } from '../world';
import { EMOJI_FONT, TILE, ellipse, fillRound, hash, shade } from './draw';

export interface FurnitureState {
  /** A planter's crop: growth 0..1 and whether it's gone dry. */
  plant?: { growth: number; dry: boolean };
  /** Someone is performing an interaction on it. */
  inUse: boolean;
  /** Wall-clock ms, for flicker and steam. */
  now: number;
  /** 0 (day) .. 1 (night), for lamps. */
  night: number;
  /** Only draw the parts that cover a dweller using the object (e.g. the bed blanket). */
  overlay?: boolean;
  /** How far something is built, 0..1 (a rocket ship). */
  built?: number;
  /** Seed for per-object variety (books, …). */
  seed: number;
}

type Sprite = (g: CanvasRenderingContext2D, w: number, h: number, s: FurnitureState, def: ObjectDef) => void;

const ROT: Record<Dir, number> = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 };

/** Top face plus a darker front face along the bottom edge, like a box seen from above and in front. */
function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, frontH: number, r = 3) {
  fillRound(g, x, y, w, h, r, shade(top, -45));
  fillRound(g, x, y, w, h - frontH, r, top);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(x + r, y + 1, w - r * 2, 1.5);
}

const bed: Sprite = (g, w, h, s, def) => {
  // A good bed (참고 게임's pricier tiers) gets a padded headboard, a quilted cover and a throw.
  const lux = !!def.restfulness;
  const [quilt, quiltEdge, fold] = lux ? ['#7e57c2', '#5e35b1', '#b39ddb'] : ['#5b8fd6', '#3f6fb2', '#8db5ea'];
  const blanket = () => {
    fillRound(g, 4, h * 0.36, w - 8, h * 0.6, 5, quilt, quiltEdge);
    fillRound(g, 4, h * 0.36, w - 8, 7, 3, fold);
    g.strokeStyle = lux ? 'rgba(255,255,255,0.18)' : 'rgba(30,60,120,0.35)';
    g.lineWidth = 1;
    if (lux) {
      // Quilting: a diamond grid over the cover, and a throw across the foot.
      g.beginPath();
      for (let x = 4 - h; x < w; x += 10) {
        g.moveTo(x, h * 0.36 + 8);
        g.lineTo(x + h * 0.55, h * 0.95);
        g.moveTo(x + h * 0.55, h * 0.36 + 8);
        g.lineTo(x, h * 0.95);
      }
      g.save();
      g.beginPath();
      g.rect(4, h * 0.36 + 7, w - 8, h * 0.6 - 7);
      g.clip();
      g.stroke();
      g.restore();
      fillRound(g, 3, h * 0.8, w - 6, h * 0.1, 3, '#ffd54f', '#c8a415');
      return;
    }
    g.beginPath();
    g.moveTo(8, h * 0.62);
    g.quadraticCurveTo(w / 2, h * 0.66, w - 8, h * 0.6);
    g.stroke();
  };
  if (s.overlay) return blanket();
  const [frame, frameEdge, head] = lux ? ['#4e342e', '#2e1d18', '#9575cd'] : ['#8d6e4f', '#5d4430', '#6d4c33'];
  fillRound(g, 1, 1, w - 2, h - 2, 4, frame, frameEdge);
  fillRound(g, 1, 1, w - 2, 12, 4, head);
  if (lux) {
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = 8; x < w - 4; x += 8) g.fillRect(x, 5, 1.5, 1.5);
  }
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.fillRect(4, 3, w - 8, 2);
  fillRound(g, 4, 10, w - 8, h - 14, 4, '#f5f1ea');
  // One pillow for a single bed, two side by side in a double.
  const pillows = w > 60 ? 2 : 1;
  const pw = (w - 14) / pillows;
  for (let i = 0; i < pillows; i++) fillRound(g, 7 + i * pw, 13, pw - (pillows > 1 ? 3 : 0), 12, 6, '#ffffff', '#d6d0c4');
  if (!s.inUse) blanket();
};

const couch = (seats: number): Sprite => (g, w, h, _s, def) => {
  const base = def.color;
  const dark = shade(base, -40);
  fillRound(g, 1, 1, w - 2, h - 2, 7, dark);
  fillRound(g, 3, 2, w - 6, 13, 6, shade(base, -20));
  fillRound(g, 1, 6, 9, h - 8, 5, dark);
  fillRound(g, w - 10, 6, 9, h - 8, 5, dark);
  const seatW = (w - 22) / seats;
  for (let i = 0; i < seats; i++) {
    fillRound(g, 11 + i * seatW, 13, seatW - 1, h - 18, 5, base, shade(base, -30));
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(14 + i * seatW, 15, seatW - 7, 2);
  }
};

const fridge: Sprite = (g, w, h, _s, def) => {
  if ((def.cookingQuality ?? 0) > 6) {
    // A stainless two-door model with a water dispenser on the left door.
    box(g, 3, 1, w - 6, h - 2, '#b8c2c9', 9);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    for (let x = 6; x < w - 6; x += 4) g.fillRect(x, 3, 1, h - 14);
    g.fillStyle = '#7b878e';
    g.fillRect(w / 2 - 0.5, 2, 1, h - 11);
    fillRound(g, w / 2 - 5, h - 9, 3, 5, 1, '#546e7a');
    fillRound(g, w / 2 + 2, h - 9, 3, 5, 1, '#546e7a');
    fillRound(g, 8, 6, 10, 9, 2, '#37474f');
    ellipse(g, 13, 11, 2, 2, '#4fc3f7');
    return;
  }
  box(g, 3, 1, w - 6, h - 2, '#eef2f4', 9);
  g.fillStyle = '#c7d0d6';
  g.fillRect(5, h * 0.42, w - 10, 1);
  fillRound(g, w / 2 - 8, h - 7, 16, 3, 1.5, '#8a959c');
};

const stove: Sprite = (g, w, h, s, def) => {
  const lux = (def.cookingQuality ?? 0) > 6;
  box(g, 2, 1, w - 4, h - 2, lux ? '#b0bec5' : '#eceff1', 9);
  fillRound(g, 5, 4, w - 10, h - 17, 3, lux ? '#1c2226' : '#2f3a40');
  const burners: Array<[number, number]> = [
    [w * 0.32, h * 0.27],
    [w * 0.68, h * 0.27],
    [w * 0.32, h * 0.55],
    [w * 0.68, h * 0.55],
  ];
  burners.forEach(([bx, by], i) => {
    const hot = s.inUse && i % 3 === 0;
    const glow = hot ? 0.6 + 0.4 * Math.sin(s.now / 120 + i) : 0;
    ellipse(g, bx, by, 6, 6, hot ? `rgba(255,${80 + glow * 60},40,${0.7 + glow * 0.3})` : '#55636b');
    ellipse(g, bx, by, 3.5, 3.5, hot ? '#ffcc80' : '#3c474d');
  });
  if (s.inUse) {
    ellipse(g, w * 0.32, h * 0.27, 8, 7, '#b0bec5');
    ellipse(g, w * 0.32, h * 0.27, 6, 5, '#8d6e63');
    for (let i = 0; i < 3; i++) {
      const t = (s.now / 900 + i / 3) % 1;
      ellipse(g, w * 0.32 + Math.sin(t * 6 + i) * 3, h * 0.27 - 4 - t * 14, 3 + t * 3, 3 + t * 3, `rgba(255,255,255,${0.45 * (1 - t)})`);
    }
  }
  for (let i = 0; i < 3; i++) ellipse(g, w * 0.3 + i * w * 0.2, h - 5, 2, 2, lux ? '#ffca28' : '#90a4ae');
};

const toilet: Sprite = (g, w) => {
  fillRound(g, 9, 2, w - 18, 10, 3, '#fafafa', '#bdbdbd');
  ellipse(g, w / 2, 25, 11, 12.5, '#bdbdbd');
  ellipse(g, w / 2, 25, 10, 11.5, '#fafafa');
  ellipse(g, w / 2, 26, 6, 7, '#cfe6ee');
  ellipse(g, w / 2 - 2, 23, 2, 2.5, 'rgba(255,255,255,0.6)');
};

const shower: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 4, 3, '#dfeeee', '#9fbcbc');
  const grad = g.createLinearGradient(0, 4, 0, h - 4);
  grad.addColorStop(0, '#c6e3e3');
  grad.addColorStop(1, '#a8d1d1');
  g.fillStyle = grad;
  g.fillRect(5, 5, w - 10, h - 10);
  ellipse(g, w / 2, h / 2 + 4, 2.5, 2.5, '#7c9a9a');
  fillRound(g, w / 2 - 5, 3, 10, 5, 2, '#b0bec5', '#78909c');
  g.strokeStyle = 'rgba(200,235,255,0.9)';
  g.lineWidth = 2;
  g.strokeRect(3, 3, w - 6, h - 6);
  if (s.inUse) {
    g.strokeStyle = 'rgba(160,210,255,0.8)';
    g.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const t = (s.now / 300 + i / 9) % 1;
      const x = w / 2 - 8 + hash(i, 1) * 16;
      g.beginPath();
      g.moveTo(x, 8 + t * (h - 16));
      g.lineTo(x, 12 + t * (h - 16));
      g.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const t = (s.now / 1400 + i / 4) % 1;
      ellipse(g, 8 + hash(i, 2) * (w - 16), h - 8 - t * (h - 10), 5 + t * 4, 5 + t * 4, `rgba(255,255,255,${0.3 * (1 - t)})`);
    }
  }
};

const sink: Sprite = (g, w, h) => {
  box(g, 2, 4, w - 4, h - 7, '#ece4d8', 8);
  ellipse(g, w / 2, h * 0.45, 11, 8, '#ffffff');
  ellipse(g, w / 2, h * 0.47, 8, 5.5, '#cfe6ee');
  fillRound(g, w / 2 - 2, 5, 4, 7, 1.5, '#90a4ae');
};

const tv: Sprite = (g, w, h, s) => {
  box(g, 4, 11, w - 8, h - 13, '#7a5236', 9);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.moveTo(w / 2, h - 10);
  g.lineTo(w / 2, h - 3);
  g.stroke();
  fillRound(g, 9, 2, w - 18, 13, 2, '#1d2326');
  if (s.inUse) {
    const flick = 0.75 + 0.25 * Math.sin(s.now / 90) * Math.sin(s.now / 37);
    const grad = g.createLinearGradient(11, 4, w - 11, 13);
    grad.addColorStop(0, `rgba(90,170,255,${flick})`);
    grad.addColorStop(0.5, `rgba(160,230,255,${flick})`);
    grad.addColorStop(1, `rgba(120,140,255,${flick})`);
    g.fillStyle = grad;
  } else g.fillStyle = '#2e3b41';
  g.fillRect(11, 4, w - 22, 9);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(13, 5, (w - 26) * 0.4, 1.5);
};

/** A wide, slim panel on a low black console (참고 게임's high-end TVs). */
const bigTv: Sprite = (g, w, h, s) => {
  box(g, 2, 12, w - 4, h - 14, '#263238', 8);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(6, h - 7, w - 12, 1);
  fillRound(g, 3, 1, w - 6, 14, 1.5, '#0d0f10');
  if (s.inUse) {
    const flick = 0.8 + 0.2 * Math.sin(s.now / 90) * Math.sin(s.now / 37);
    const grad = g.createLinearGradient(5, 3, w - 5, 13);
    grad.addColorStop(0, `rgba(255,120,180,${flick})`);
    grad.addColorStop(0.5, `rgba(130,220,255,${flick})`);
    grad.addColorStop(1, `rgba(140,255,170,${flick})`);
    g.fillStyle = grad;
  } else g.fillStyle = '#1b2428';
  g.fillRect(4.5, 2.5, w - 9, 11);
  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.fillRect(6, 3.5, (w - 12) * 0.35, 1.5);
};

const stereo: Sprite = (g, w, h, s) => {
  box(g, 4, 3, w - 8, h - 6, '#37474f', 8);
  const pulse = s.inUse ? 1 + 0.12 * Math.sin(s.now / 110) : 1;
  for (const cx of [w * 0.32, w * 0.68]) {
    ellipse(g, cx, h * 0.38, 7 * pulse, 7 * pulse, '#90a4ae');
    ellipse(g, cx, h * 0.38, 4 * pulse, 4 * pulse, '#263238');
  }
  ellipse(g, w / 2, h - 7, 1.5, 1.5, s.inUse ? '#76ff03' : '#546e7a');
};

const computer: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#a1795a', 8);
  fillRound(g, 8, 3, w - 16, 7, 1.5, '#263238');
  g.fillStyle = s.inUse ? `rgba(120,200,255,${0.8 + 0.2 * Math.sin(s.now / 200)})` : '#37474f';
  g.fillRect(10, 4.5, w - 20, 4);
  fillRound(g, 10, h * 0.5, w - 22, 6, 1.5, '#cfd8dc', '#90a4ae');
  ellipse(g, w - 9, h * 0.53, 2.5, 3.2, '#cfd8dc');
};

/** Two monitors and a tower with RGB lights (참고 게임 object_Computer_High). */
const gamingComputer: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#2b2b2b', 8);
  const glow = s.inUse ? 0.8 + 0.2 * Math.sin(s.now / 200) : 0;
  for (const x of [3, w / 2 + 0.5]) {
    fillRound(g, x, 2, w / 2 - 3.5, 7, 1, '#111');
    g.fillStyle = s.inUse ? `rgba(160,120,255,${glow})` : '#37474f';
    g.fillRect(x + 1, 3, w / 2 - 5.5, 4.5);
  }
  fillRound(g, 6, h * 0.5, w - 18, 6, 1.5, '#424242', '#212121');
  const hue = s.inUse ? (s.now / 20) % 360 : 270;
  g.fillStyle = `hsl(${hue},80%,60%)`;
  g.fillRect(7, h * 0.5 + 5.5, w - 20, 1);
  ellipse(g, w - 7, h * 0.53, 2.5, 3.2, '#616161');
};

/** A small table with a checkerboard top; pieces thin out as a game goes on. */
const chessTable: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h / 2 + 2, w / 2 - 3, h / 2 - 4, '#5d4037');
  fillRound(g, 5, 4, w - 10, h - 10, 3, '#8d6e63', '#5d4037');
  const n = 6;
  const cell = (w - 16) / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? '#3e2723' : '#efebe9';
      g.fillRect(8 + i * cell, 7 + j * cell, cell, cell);
    }
  const pieces = s.inUse ? 4 : 6;
  for (let i = 0; i < pieces; i++) {
    ellipse(g, 8 + (i + 0.5) * cell, 7 + cell * 0.5, cell * 0.32, cell * 0.32, '#212121');
    ellipse(g, 8 + (n - i - 0.5) * cell, 7 + (n - 0.5) * cell, cell * 0.38, cell * 0.38, '#9e9e9e');
    ellipse(g, 8 + (n - i - 0.5) * cell, 7 + (n - 0.5) * cell, cell * 0.3, cell * 0.3, '#fafafa');
  }
};

const bookshelf: Sprite = (g, w, h, s) => {
  box(g, 2, 2, w - 4, h - 4, '#6d4c33', 16);
  const colors = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f', '#d84315'];
  let x = 5;
  let i = 0;
  while (x < w - 7) {
    const bw = 2.5 + hash(s.seed, i) * 2.5;
    const bh = 9 + hash(s.seed, i, 3) * 4;
    g.fillStyle = colors[Math.floor(hash(s.seed, i, 7) * colors.length)];
    g.fillRect(x, h - 4 - bh, bw, bh);
    x += bw + 0.6;
    i++;
  }
};

/** A wardrobe: two doors, their knobs, a drawer below. */
const clothesCabinet: Sprite = (g, w, h) => {
  box(g, 2, 2, w - 4, h - 4, '#8d6e63', 4);
  box(g, 4, 4, w / 2 - 5, h - 14, '#a1887f', 2);
  box(g, w / 2 + 1, 4, w / 2 - 5, h - 14, '#a1887f', 2);
  box(g, 4, h - 9, w - 8, 5, '#795548', 2);
  ellipse(g, w / 2 - 3, h / 2 - 3, 1.2, 1.2, '#ffe082');
  ellipse(g, w / 2 + 3, h / 2 - 3, 1.2, 1.2, '#ffe082');
};

const mirror: Sprite = (g, w, h) => {
  ellipse(g, w / 2, h - 6, 9, 3, '#8d6e4f');
  ellipse(g, w / 2, h * 0.42, 11, 15, '#c9a96e');
  const grad = g.createLinearGradient(w / 2 - 9, 6, w / 2 + 9, h * 0.75);
  grad.addColorStop(0, '#eef8fc');
  grad.addColorStop(1, '#a7c6d6');
  ellipse(g, w / 2, h * 0.42, 8.5, 12.5, '#cfe2ea');
  g.save();
  g.beginPath();
  g.ellipse(w / 2, h * 0.42, 8.5, 12.5, 0, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(w / 2 - 6, 4, 3, h);
  g.restore();
};

/** A flight of stairs climbing away from its front (the foot at the bottom of the sprite). */
const stairs: Sprite = (g, w, h) => {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const y = h - ((i + 1) * h) / n;
    const shade = 0.55 + (i / n) * 0.35;
    g.fillStyle = `rgb(${Math.round(196 * shade)},${Math.round(150 * shade)},${Math.round(110 * shade)})`;
    g.fillRect(5, y, w - 10, h / n + 0.5);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(5, y + h / n - 2, w - 10, 2);
  }
  // Rails.
  g.fillStyle = '#6d4c33';
  g.fillRect(2, 2, 4, h - 4);
  g.fillRect(w - 6, 2, 4, h - 4);
};

/** A garden tree: its crown spreads well past its tile, as the lawn's trees always did. */
const tree: Sprite = (g, w, h, s) => {
  const r = 15;
  const cx = w / 2;
  const cy = h / 2 + 4;
  ellipse(g, cx + r * 0.25, cy + r * 0.55, r * 1.05, r * 0.55, 'rgba(0,0,0,0.22)');
  g.fillStyle = '#6d4c33';
  g.fillRect(cx - 2.5, cy, 5, r * 0.7);
  const greens = ['#3f8f3a', '#4ca345', '#5cb853'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + s.seed;
    ellipse(g, cx + Math.cos(a) * r * 0.45, cy - r * 0.35 + Math.sin(a) * r * 0.35, r * 0.6, r * 0.55, greens[i % 3]);
  }
  ellipse(g, cx - r * 0.2, cy - r * 0.55, r * 0.45, r * 0.38, '#77cc6b');
};

const bush: Sprite = (g, w, h) => {
  const r = 10;
  const cx = w / 2;
  const cy = h / 2 + 2;
  ellipse(g, cx + 2, cy + r * 0.5, r * 1.1, r * 0.45, 'rgba(0,0,0,0.2)');
  ellipse(g, cx - r * 0.45, cy, r * 0.6, r * 0.55, '#3f8f3a');
  ellipse(g, cx + r * 0.45, cy, r * 0.6, r * 0.55, '#3f8f3a');
  ellipse(g, cx, cy - r * 0.25, r * 0.65, r * 0.6, '#4ca345');
  ellipse(g, cx - r * 0.15, cy - r * 0.4, r * 0.3, r * 0.25, '#6cc061');
};

const plant: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h / 2 + 4, 10, 9, '#a3542a');
  ellipse(g, w / 2, h / 2 + 3, 8.5, 7.5, '#5d3a1e');
  const greens = ['#2e7d32', '#43a047', '#66bb6a'];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + s.seed;
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(a);
    ellipse(g, 0, -9, 4, 9, greens[i % 3]);
    g.restore();
  }
  ellipse(g, w / 2, h / 2, 3, 3, '#81c784');
};

const lamp: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h / 2, 6, 6, '#5d4037');
  const lit = s.night > 0.05;
  ellipse(g, w / 2, h / 2 - 2, 11, 11, lit ? '#fff6cf' : '#f3e5c0');
  g.strokeStyle = '#b8a272';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(w / 2, h / 2 - 2, 11, 0, Math.PI * 2);
  g.stroke();
  ellipse(g, w / 2, h / 2 - 2, 3, 3, lit ? '#fffde7' : '#d7c49c');
};

const kitchenSink: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 5, '#e7dccb', 9);
  fillRound(g, 6, 7, w - 12, h - 21, 4, '#b0bec5');
  fillRound(g, 8, 9, w - 16, h - 25, 3, '#cfe6ee');
  fillRound(g, w / 2 - 2, 3, 4, 7, 1.5, '#90a4ae');
};

/** A telescope on a tripod, its tube angled up; a faint glint when someone is looking. */
const telescope: Sprite = (g, w, h, s) => {
  g.strokeStyle = '#424242';
  g.lineWidth = 2;
  g.beginPath();
  for (const [x, y] of [[w * 0.25, h - 4], [w * 0.75, h - 4], [w * 0.5, h * 0.35 + 8]]) {
    g.moveTo(w / 2, h * 0.55);
    g.lineTo(x, y);
  }
  g.stroke();
  g.save();
  g.translate(w / 2, h * 0.5);
  g.rotate(-0.6);
  fillRound(g, -4, -h * 0.42, 8, h * 0.6, 3, '#3949ab', '#1a237e');
  fillRound(g, -5, -h * 0.44, 10, 4, 2, '#c5cae9');
  g.restore();
  if (s.inUse) ellipse(g, w * 0.78, h * 0.14, 2, 2, `rgba(255,255,200,${0.5 + 0.5 * Math.sin(s.now / 250)})`);
};

/** A violin on its stand. */
const violin: Sprite = (g, w, h) => {
  g.fillStyle = '#5d4037';
  g.fillRect(w / 2 - 1, h - 8, 2, 6);
  ellipse(g, w / 2, h * 0.62, 7, 8, '#a0522d');
  ellipse(g, w / 2, h * 0.38, 5.5, 6, '#a0522d');
  g.fillStyle = '#3e2723';
  g.fillRect(w / 2 - 1, 4, 2, h * 0.55);
  g.fillRect(w / 2 - 3, h * 0.55, 6, 2);
  ellipse(g, w / 2, 5, 2, 2.5, '#3e2723');
};

/** A camera on a tripod. */
const camera: Sprite = (g, w, h, s) => {
  g.strokeStyle = '#616161';
  g.lineWidth = 1.5;
  g.beginPath();
  for (const x of [w * 0.25, w * 0.5, w * 0.75]) {
    g.moveTo(w / 2, h * 0.45);
    g.lineTo(x, h - 4);
  }
  g.stroke();
  fillRound(g, w / 2 - 8, h * 0.2, 16, 11, 2, '#424242', '#212121');
  ellipse(g, w / 2, h * 0.2 + 5.5, 3.5, 3.5, '#90caf9');
  if (s.inUse && Math.sin(s.now / 200) > 0.95) ellipse(g, w / 2 + 6, h * 0.2 + 1, 3, 3, 'rgba(255,255,255,0.9)');
};

/** A rocket on its launch pad; scaffolding hides the unbuilt part until it's finished. */
const rocketShip: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h / 2 + 4, w / 2 - 3, h / 2 - 6, '#9e9e9e');
  ellipse(g, w / 2, h / 2 + 4, w / 2 - 8, h / 2 - 11, '#bdbdbd');
  const built = (s.built ?? 1);
  const top = 6 + (h - 20) * (1 - built);
  // Body from the bottom up, as far as it's built.
  g.save();
  g.beginPath();
  g.rect(0, top, w, h);
  g.clip();
  fillRound(g, w / 2 - 9, 6, 18, h - 16, 9, '#fafafa', '#b0bec5');
  ellipse(g, w / 2, 20, 4, 4, '#4fc3f7');
  g.fillStyle = '#e53935';
  g.beginPath();
  g.moveTo(w / 2 - 9, h - 18);
  g.lineTo(w / 2 - 16, h - 8);
  g.lineTo(w / 2 - 9, h - 10);
  g.moveTo(w / 2 + 9, h - 18);
  g.lineTo(w / 2 + 16, h - 8);
  g.lineTo(w / 2 + 9, h - 10);
  g.fill();
  g.restore();
  if (built < 1) {
    g.strokeStyle = '#8d6e63';
    g.lineWidth = 1.5;
    for (const x of [w / 2 - 13, w / 2 + 13]) {
      g.beginPath();
      g.moveTo(x, 4);
      g.lineTo(x, h - 6);
      g.stroke();
    }
    for (let y = 8; y < h - 6; y += 8) {
      g.beginPath();
      g.moveTo(w / 2 - 13, y);
      g.lineTo(w / 2 + 13, y);
      g.stroke();
    }
  }
};

/** A small pond: water with ripples, lily pads and reeds; a bobber while someone fishes. */
const pond: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h / 2, w / 2 - 1, h / 2 - 2, '#8d6e63');
  ellipse(g, w / 2, h / 2, w / 2 - 4, h / 2 - 5, '#29b6f6');
  ellipse(g, w / 2 - 4, h / 2 - 3, w / 2 - 12, h / 2 - 12, '#4fc3f7');
  const t = s.now / 1200;
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const r = ((t + i / 2) % 1) * 10 + 3;
    g.beginPath();
    g.ellipse(w * 0.6, h * 0.55, r, r * 0.6, 0, 0, Math.PI * 2);
    g.stroke();
  }
  for (const [x, y] of [[0.28, 0.35], [0.7, 0.3], [0.35, 0.7]]) {
    ellipse(g, w * x, h * y, 5, 4, '#66bb6a');
    ellipse(g, w * x + 2, h * y - 1, 1.5, 1.5, '#f8bbd0');
  }
  g.fillStyle = '#558b2f';
  for (let i = 0; i < 4; i++) g.fillRect(w - 8 + (i % 2) * 3, h - 14 - i * 3, 1.5, 10);
  if (s.inUse) {
    const bob = Math.sin(s.now / 300) * 1.5;
    ellipse(g, w * 0.6, h * 0.55 + bob, 2.5, 2.5, '#f44336');
    ellipse(g, w * 0.6, h * 0.55 + bob - 1.5, 1.5, 1.2, '#fafafa');
  }
};

/** Monkey bars from above: two red ladders joined by yellow rungs, on a patch of wood chips. */
const monkeyBars: Sprite = (g, w, h, s) => {
  fillRound(g, 1, 1, w - 2, h - 2, 6, 'rgba(161,136,127,0.35)');
  g.fillStyle = '#c62828';
  g.fillRect(4, 3, 3, h - 6);
  g.fillRect(w - 7, 3, 3, h - 6);
  g.fillStyle = '#1565c0';
  g.fillRect(4, 4, w - 8, 2.5);
  g.fillRect(4, h - 7, w - 8, 2.5);
  g.fillStyle = '#fbc02d';
  const n = 7;
  for (let i = 1; i < n; i++) {
    const x = 4 + (i * (w - 8)) / n;
    g.fillRect(x - 1, 5, 2, h - 11);
  }
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(4 + ((Math.floor(s.now / 400) % n) * (w - 8)) / n, 4, (w - 8) / n, h - 9);
  }
};

/** A home bar: a wooden counter with bottles along the back and a shaker on top. */
const bar: Sprite = (g, w, h, s) => {
  box(g, 1, 2, w - 2, h - 4, '#6d4c41', 10);
  fillRound(g, 3, 3, w - 6, 6, 2, '#4e342e');
  const colors = ['#c62828', '#f9a825', '#2e7d32', '#6a1b9a', '#00838f', '#ef6c00'];
  for (let i = 0; i < 8; i++) {
    const x = 6 + i * ((w - 14) / 7);
    fillRound(g, x - 2, 3.5, 4, 5, 1.5, colors[i % colors.length]);
  }
  ellipse(g, w * 0.7, h * 0.55, 3.5, 3.5, s.inUse ? '#eceff1' : '#b0bec5');
  if (s.inUse) {
    const t = (s.now / 300) % 1;
    ellipse(g, w * 0.4 + Math.sin(t * Math.PI * 2) * 2, h * 0.55, 3, 3, 'rgba(255,183,77,0.9)');
  } else {
    ellipse(g, w * 0.4, h * 0.55, 3, 3, 'rgba(129,212,250,0.8)');
  }
};

/** An upright piano seen from above: the case, a strip of keys and a bench in front. */
const piano: Sprite = (g, w, h, s) => {
  box(g, 2, 1, w - 4, h * 0.55, '#3e2723', 8);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(5, 3, w - 10, 1.5);
  const ky = h * 0.55 - 6;
  g.fillStyle = '#fafafa';
  g.fillRect(5, ky, w - 10, 7);
  g.fillStyle = '#212121';
  const n = 14;
  const kw = (w - 10) / n;
  for (let i = 0; i < n; i++) if (i % 7 !== 2 && i % 7 !== 6) g.fillRect(5 + (i + 0.65) * kw, ky, kw * 0.6, 4);
  if (s.inUse) {
    const k = Math.floor(s.now / 160) % n;
    g.fillStyle = 'rgba(255,213,79,0.7)';
    g.fillRect(5 + k * kw, ky + 4, kw, 3);
  }
  fillRound(g, w / 2 - 12, h * 0.72, 24, 8, 2, '#5d4037', '#3e2723');
};

/** A counter with a drip coffee maker and its glass pot. */
const coffeeMaker: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 5, '#e7dccb', 9);
  fillRound(g, w / 2 - 9, 4, 18, 15, 3, '#3e2723', '#1b0f0b');
  fillRound(g, w / 2 - 6, 11, 12, 8, 3, 'rgba(200,230,240,0.85)');
  fillRound(g, w / 2 - 5, 14, 10, 5, 2, '#5d4037');
  ellipse(g, w / 2 + 5, 7, 1.5, 1.5, s.inUse ? '#ff5252' : '#795548');
  if (s.inUse) {
    for (let i = 0; i < 2; i++) {
      const t = (s.now / 1100 + i / 2) % 1;
      ellipse(g, w / 2 + Math.sin(t * 5 + i) * 2, 3 - t * 8, 2 + t * 2, 2 + t * 2, `rgba(255,255,255,${0.4 * (1 - t)})`);
    }
  }
};

/** A framed picture on a little easel stand; the canvas colour hints at its mood. */
const picture = (canvas: string, frame: string): Sprite => (g, w, h, s) => {
  g.fillStyle = '#6d4c33';
  g.fillRect(w / 2 - 1.5, h * 0.55, 3, h * 0.38);
  g.fillRect(w / 2 - 9, h - 7, 18, 2.5);
  fillRound(g, 5, 4, w - 10, h * 0.6, 2, frame, shade(frame, -50));
  g.fillStyle = canvas;
  g.fillRect(8, 7, w - 16, h * 0.6 - 6);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = `rgba(255,255,255,${0.12 + hash(s.seed, i) * 0.25})`;
    g.fillRect(9 + hash(s.seed, i, 1) * (w - 22), 8 + hash(s.seed, i, 2) * (h * 0.6 - 12), 4 + hash(s.seed, i, 3) * 6, 3);
  }
};

const aquarium: Sprite = (g, w, h, s) => {
  box(g, 3, 4, w - 6, h - 6, '#455a64', 8);
  const water = g.createLinearGradient(0, 6, 0, h - 10);
  water.addColorStop(0, '#81d4fa');
  water.addColorStop(1, '#0288d1');
  g.fillStyle = water;
  g.fillRect(6, 7, w - 12, h - 19);
  for (let i = 0; i < 3; i++) {
    const t = (s.now / 2600 + i / 3) % 1;
    const fx = 9 + ((i % 2 ? 1 - t : t) * (w - 22));
    ellipse(g, fx, 11 + i * 4, 3, 1.6, ['#ff7043', '#ffd54f', '#f06292'][i]);
  }
  ellipse(g, w - 12, h - 14, 2, 4, '#2e7d32');
};

const diningTable: Sprite = (g, w, h) => {
  box(g, 2, 3, w - 4, h - 6, '#a1795a', 7, 5);
  g.strokeStyle = 'rgba(80,50,30,0.25)';
  g.lineWidth = 1;
  for (let x = 10; x < w - 6; x += 12) {
    g.beginPath();
    g.moveTo(x, 5);
    g.lineTo(x, h - 11);
    g.stroke();
  }
};

/** Seat at the bottom (towards the table when facing it), backrest along the top. */
const diningChair: Sprite = (g, w, h) => {
  fillRound(g, 8, 4, w - 16, 7, 3, '#6d4c33', '#4e342e');
  fillRound(g, 9, 10, w - 18, h - 18, 4, '#8d6e63', '#5d4037');
  g.fillStyle = 'rgba(255,255,255,0.15)';
  g.fillRect(12, 12, w - 24, 2);
};

const smokeAlarm: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h / 2, 9, 9, '#cfd8dc');
  ellipse(g, w / 2, h / 2 - 1, 8, 8, '#fafafa');
  ellipse(g, w / 2, h / 2 - 1, 2.2, 2.2, Math.floor(s.now / 700) % 2 ? '#e53935' : '#7f1d1d');
};

const treadmill: Sprite = (g, w, h, s) => {
  box(g, 4, 2, w - 8, h - 4, '#455a64', 6, 4);
  fillRound(g, 8, 12, w - 16, h - 22, 3, '#263238');
  g.strokeStyle = 'rgba(255,255,255,0.12)';
  g.lineWidth = 1;
  const off = s.inUse ? (s.now / 40) % 6 : 0;
  for (let y = 14 + off; y < h - 10; y += 6) {
    g.beginPath();
    g.moveTo(10, y);
    g.lineTo(w - 10, y);
    g.stroke();
  }
  fillRound(g, 6, 3, w - 12, 8, 2, '#78909c');
  fillRound(g, w / 2 - 6, 4, 12, 4, 1.5, s.inUse ? '#80deea' : '#37474f');
};

const easel: Sprite = (g, w, h) => {
  g.strokeStyle = '#8d6e63';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(w / 2, 4);
  g.lineTo(8, h - 4);
  g.moveTo(w / 2, 4);
  g.lineTo(w - 8, h - 4);
  g.moveTo(w / 2, 6);
  g.lineTo(w / 2, h - 2);
  g.stroke();
  fillRound(g, 7, 6, w - 14, h * 0.55, 1.5, '#fffdf6', '#cfc6b5');
  ellipse(g, w / 2 - 3, h * 0.28, 4, 3, '#81c784');
  ellipse(g, w / 2 + 4, h * 0.36, 3, 2.5, '#64b5f6');
};

const guitar: Sprite = (g, w, h) => {
  ellipse(g, w / 2, h * 0.68, 9, 10, '#c48a4a');
  ellipse(g, w / 2, h * 0.45, 7, 7.5, '#d7a86e');
  ellipse(g, w / 2, h * 0.6, 3, 3, '#4e342e');
  fillRound(g, w / 2 - 2, 3, 4, h * 0.42, 1.5, '#5d4037');
  fillRound(g, w / 2 - 3.5, 2, 7, 5, 1.5, '#3e2723');
};

const bassinet: Sprite = (g, w, h) => {
  ellipse(g, w / 2, h / 2 + 2, w / 2 - 5, h / 2 - 6, '#c9a46a');
  ellipse(g, w / 2, h / 2 + 1, w / 2 - 8, h / 2 - 9, '#fff8e1');
  g.strokeStyle = 'rgba(120,85,40,0.45)';
  g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(w / 2 + i * 6, 6);
    g.lineTo(w / 2 + i * 6, h - 6);
    g.stroke();
  }
  fillRound(g, 7, 4, w - 14, 8, 4, '#f8bbd0');
};

const mailbox: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2 + 2, h / 2 + 11, 7, 3, 'rgba(0,0,0,0.25)');
  g.fillStyle = '#6d4c33';
  g.fillRect(w / 2 - 1.5, h / 2, 3, 11);
  fillRound(g, w / 2 - 7, h / 2 - 7, 14, 9, 4, '#3d6fb6', '#24497d');
  g.fillStyle = '#e53935';
  g.fillRect(w / 2 + 5, h / 2 - (s.inUse ? 14 : 10), 2, 7);
};

const planter: Sprite = (g, w, h, s) => {
  box(g, 4, 6, w - 8, h - 9, '#8d6e63', 7, 3);
  fillRound(g, 7, 8, w - 14, h - 19, 2, '#5d4037');
  const p = s.plant;
  if (!p) return;
  const leaf = p.dry ? '#a1887f' : '#43a047';
  const n = 1 + Math.floor(p.growth * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.save();
    g.translate(w / 2, h / 2 - 2);
    g.rotate(a);
    ellipse(g, 0, -3 - p.growth * 6, 2 + p.growth * 2.5, 3 + p.growth * 5, leaf);
    g.restore();
  }
  if (p.growth >= 1) for (let i = 0; i < 3; i++) ellipse(g, w / 2 - 6 + i * 6, h / 2 - 4 + (i % 2) * 4, 3, 3, '#e53935');
};

const bathtub: Sprite = (g, w, h, s) => {
  box(g, 2, 2, w - 4, h - 4, '#f5f7fa', 8, 10);
  fillRound(g, 7, 9, w - 14, h - 24, 9, s.inUse ? '#9ad3f0' : '#dbeef7');
  if (s.inUse) for (let i = 0; i < 5; i++) ellipse(g, 10 + ((i * 7) % (w - 20)), 16 + i * 9, 4, 3.5, 'rgba(255,255,255,0.85)');
  fillRound(g, w / 2 - 3, 4, 6, 5, 2, '#b0bec5');
};

const burglarAlarm: Sprite = (g, w, h, s) => {
  fillRound(g, w / 2 - 9, h / 2 - 7, 18, 14, 3, '#eceff1', '#90a4ae');
  ellipse(g, w / 2, h / 2, 3.5, 3.5, Math.floor(s.now / 900) % 2 ? '#43a047' : '#1b5e20');
};

const toyBox: Sprite = (g, w, h) => {
  box(g, 5, 7, w - 10, h - 12, '#ef9a9a', 8, 4);
  fillRound(g, 5, 5, w - 10, 6, 3, '#e57373');
  ellipse(g, w / 2 - 6, 6, 4, 4, '#ffd54f');
  ellipse(g, w / 2 + 5, 5, 3.5, 3.5, '#64b5f6');
  fillRound(g, w / 2 - 2, 2, 5, 6, 1.5, '#81c784');
};

const urn: Sprite = (g, w, h) => {
  ellipse(g, w / 2, h - 9, 8, 3, 'rgba(0,0,0,0.2)');
  ellipse(g, w / 2, h / 2 + 3, 8, 10, '#b0a089');
  ellipse(g, w / 2 - 2, h / 2, 2.5, 5, 'rgba(255,255,255,0.25)');
  fillRound(g, w / 2 - 5, h / 2 - 10, 10, 4, 2, '#8d7b62');
  ellipse(g, w / 2, h / 2 - 11, 3, 2, '#8d7b62');
};

const birthdayCake: Sprite = (g, w, h) => {
  ellipse(g, w / 2, h / 2 + 6, 12, 5, '#eceff1');
  fillRound(g, w / 2 - 9, h / 2 - 4, 18, 10, 3, '#f8bbd0');
  fillRound(g, w / 2 - 6, h / 2 - 10, 12, 7, 3, '#fce4ec');
  for (const dx of [-4, 0, 4]) {
    fillRound(g, w / 2 + dx - 0.75, h / 2 - 15, 1.5, 5, 0.5, '#90caf9');
    ellipse(g, w / 2 + dx, h / 2 - 16, 1.2, 1.8, '#ffb300');
  }
};

const pool: Sprite = (g, w, h) => {
  fillRound(g, 1, 1, w - 2, h - 2, 6, '#cfd8dc');
  fillRound(g, 4, 4, w - 8, h - 8, 4, '#29b6f6');
  for (let i = 0; i < 4; i++) {
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    const y = 10 + i * ((h - 16) / 4);
    g.moveTo(8, y);
    g.quadraticCurveTo(w / 4, y - 3, w / 2, y);
    g.quadraticCurveTo((3 * w) / 4, y + 3, w - 8, y);
    g.stroke();
  }
  fillRound(g, w - 10, 2, 3, 10, 1, '#b0bec5');
};

const woodworkingTable: Sprite = (g, w, h) => {
  fillRound(g, 2, 4, w - 4, h - 8, 3, '#a1887f');
  fillRound(g, 4, 6, w - 8, 4, 2, '#8d6e63');
  ellipse(g, w * 0.3, h / 2 + 2, 4, 3, '#d7ccc8');
  fillRound(g, w * 0.55, h / 2 - 2, 10, 4, 1, '#5d4037');
  fillRound(g, w * 0.75, h / 2, 6, 2, 1, '#9e9e9e');
};

const microscope: Sprite = (g, w, h) => {
  fillRound(g, w / 2 - 8, h - 12, 16, 6, 2, '#455a64');
  fillRound(g, w / 2 - 2, h / 2 - 8, 5, 16, 2, '#78909c');
  fillRound(g, w / 2 - 6, h / 2 - 2, 12, 3, 1, '#b0bec5');
  ellipse(g, w / 2, h / 2 - 9, 3, 3, '#263238');
};

const grill: Sprite = (g, w, h) => {
  ellipse(g, w / 2, h / 2, w / 2 - 4, h / 2 - 4, '#37474f');
  ellipse(g, w / 2, h / 2, w / 2 - 7, h / 2 - 7, '#263238');
  g.strokeStyle = '#90a4ae';
  g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(w / 2 - 9, h / 2 + i * 3);
    g.lineTo(w / 2 + 9, h / 2 + i * 3);
    g.stroke();
  }
};

const fireplace: Sprite = (g, w, h, s) => {
  fillRound(g, 1, 2, w - 2, h - 6, 3, '#8d6e63');
  fillRound(g, 1, 2, w - 2, 5, 2, '#6d4c41');
  fillRound(g, w / 2 - 12, 8, 24, h - 14, 4, '#3e2723');
  if (s.inUse) {
    ellipse(g, w / 2, h - 10, 8, 5, '#ff7043');
    ellipse(g, w / 2 - 3, h - 13, 3, 5, '#ffb300');
    ellipse(g, w / 2 + 4, h - 12, 3, 4, '#ffca28');
  } else {
    fillRound(g, w / 2 - 8, h - 11, 16, 3, 1, '#5d4037');
  }
};

/** An office desk with a monitor (workplace.ts). */
const workstation: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#b0bec5', 8);
  fillRound(g, 7, 2, w - 14, 8, 1.5, '#263238');
  g.fillStyle = s.inUse ? `rgba(140,220,170,${0.8 + 0.2 * Math.sin(s.now / 200)})` : '#37474f';
  g.fillRect(9, 3.5, w - 18, 5);
  fillRound(g, 9, h * 0.52, w - 18, 5, 1.5, '#eceff1', '#90a4ae');
  ellipse(g, w - 7, h * 0.56, 2, 2.6, '#eceff1');
};

const whiteboard: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 10, 2, '#fafafa', '#90a4ae');
  g.strokeStyle = '#42a5f5';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(8, 10);
  g.lineTo(w * 0.35, 7);
  g.lineTo(w * 0.5, 13);
  g.stroke();
  g.strokeStyle = '#ef5350';
  g.strokeRect(w * 0.6, 7, 10, 7);
  fillRound(g, 4, h - 8, w - 8, 2, 1, '#78909c');
};

const lineStove: Sprite = (g, w, h, s) => {
  box(g, 1, 2, w - 2, h - 4, '#90a4ae', 6);
  for (const [x, y] of [[w * 0.3, h * 0.35], [w * 0.7, h * 0.35], [w * 0.3, h * 0.68], [w * 0.7, h * 0.68]]) {
    ellipse(g, x, y, 4.5, 4.5, '#263238');
    if (s.inUse) ellipse(g, x, y, 3, 3, `rgba(255,120,40,${0.6 + 0.3 * Math.sin(s.now / 120 + x)})`);
  }
};

const prepCounter: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#cfd8dc', 6);
  fillRound(g, 6, h * 0.35, 16, 10, 2, '#8d6e63');
  ellipse(g, w * 0.65, h * 0.5, 5, 4, '#81c784');
  ellipse(g, w * 0.8, h * 0.45, 3.5, 3, '#e57373');
  fillRound(g, w * 0.4, h * 0.55, 10, 2, 1, '#b0bec5');
};

const servingPass: Sprite = (g, w, h) => {
  box(g, 1, 1, w - 2, h - 2, '#b0bec5', 5);
  ellipse(g, w / 2, h * 0.3, 6, 4, '#fafafa');
  ellipse(g, w / 2, h * 0.68, 6, 4, '#fafafa');
  ellipse(g, w / 2, h * 0.12, 2.5, 2, '#ffca28');
};

const studioEasel: Sprite = (g, w, h, s) => {
  g.strokeStyle = '#6d4c41';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(w / 2, 3);
  g.lineTo(6, h - 3);
  g.moveTo(w / 2, 3);
  g.lineTo(w - 6, h - 3);
  g.stroke();
  fillRound(g, 6, 4, w - 12, h * 0.55, 1, '#fffde7', '#a1887f');
  if (s.inUse) {
    ellipse(g, w * 0.4, h * 0.3, 4, 3, '#4fc3f7');
    ellipse(g, w * 0.6, h * 0.42, 3, 3, '#ff8a65');
  }
};

const sketchTable: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#d7ccc8', 6);
  fillRound(g, 6, h * 0.3, 14, 10, 1, '#fafafa', '#bdbdbd');
  g.strokeStyle = '#616161';
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(13, h * 0.3 + 5, 3, 0, Math.PI * 2);
  g.stroke();
  for (const [x, c] of [[w * 0.6, '#e53935'], [w * 0.68, '#1e88e5'], [w * 0.76, '#43a047']] as Array<[number, string]>) fillRound(g, x, h * 0.35, 2, 9, 1, c);
};


/** A hospital desk computer with a chart beside it (workplace.ts). */
const medStation: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#cfd8dc', 8);
  fillRound(g, 6, 2, w - 16, 8, 1.5, '#37474f');
  g.fillStyle = s.inUse ? `rgba(120,200,255,${0.8 + 0.2 * Math.sin(s.now / 220)})` : '#455a64';
  g.fillRect(8, 3.5, w - 20, 5);
  fillRound(g, w - 11, h * 0.42, 8, 11, 1, '#fafafa', '#90a4ae');
  g.fillStyle = '#e53935';
  g.fillRect(w - 8.5, h * 0.42 + 3, 3, 1);
  g.fillRect(w - 7.5, h * 0.42 + 2, 1, 3);
};

const xrayViewer: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 3, w - 6, h - 12, 2, '#263238', '#90a4ae');
  for (const x of [w * 0.27, w * 0.62]) {
    fillRound(g, x - 9, 6, 18, h - 18, 1, s.inUse ? '#b3e5fc' : '#78909c');
    g.strokeStyle = '#eceff1';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, 8);
    g.lineTo(x, h - 15);
    for (let i = 0; i < 4; i++) {
      g.moveTo(x - 6, 11 + i * 4);
      g.quadraticCurveTo(x, 9 + i * 4, x + 6, 11 + i * 4);
    }
    g.stroke();
  }
  fillRound(g, 6, h - 8, w - 12, 3, 1, '#607d8b');
};

const hospitalBed: Sprite = (g, w, h) => {
  fillRound(g, 3, 2, w - 6, h - 4, 4, '#b0bec5');
  fillRound(g, 5, 4, w - 10, h - 8, 3, '#fafafa');
  fillRound(g, 8, 6, w - 16, 10, 3, '#e3f2fd');
  fillRound(g, 5, h * 0.42, w - 10, h * 0.5, 3, '#80cbc4', '#4db6ac');
  g.strokeStyle = '#90a4ae';
  g.lineWidth = 1.5;
  g.strokeRect(2.5, 2.5, w - 5, h - 5);
};

const surgeryTable: Sprite = (g, w, h, s) => {
  fillRound(g, 6, 8, w - 12, h - 16, 4, '#80cbc4', '#26a69a');
  fillRound(g, 10, 11, w - 20, h - 22, 3, '#b2dfdb');
  ellipse(g, w / 2, 5, 9, 4, s.inUse ? '#fff9c4' : '#cfd8dc');
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,220,0.25)';
    g.beginPath();
    g.ellipse(w / 2, h / 2, w * 0.4, h * 0.38, 0, 0, Math.PI * 2);
    g.fill();
  }
  fillRound(g, w - 12, h - 9, 9, 6, 1, '#b0bec5');
};

const medCabinet: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#eceff1', 7);
  g.fillStyle = '#90a4ae';
  g.fillRect(w / 2 - 0.5, 4, 1, h - 14);
  g.fillStyle = '#e53935';
  g.fillRect(w / 2 - 5, h * 0.3 - 1.5, 10, 3);
  g.fillRect(w / 2 - 1.5, h * 0.3 - 5, 3, 10);
  for (const [x, c] of [[9, '#ffb74d'], [15, '#4fc3f7'], [w - 15, '#81c784'], [w - 9, '#f06292']] as Array<[number, string]>) fillRound(g, x - 2, h * 0.55, 4, 6, 1, c);
};

const policeDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 6, 2, w - 18, 8, 1.5, '#263238');
  g.fillStyle = s.inUse ? `rgba(255,213,79,${0.75 + 0.25 * Math.sin(s.now / 250)})` : '#37474f';
  g.fillRect(8, 3.5, w - 22, 5);
  fillRound(g, w - 13, h * 0.38, 10, 8, 1, '#ffe082', '#f9a825');
  fillRound(g, 7, h * 0.55, 12, 4, 1, '#eceff1');
  ellipse(g, w - 8, h * 0.68, 3, 3, '#5d4037');
};

const evidenceTable: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#b0bec5', 7);
  // A microscope, labelled bags and a magnifier.
  fillRound(g, 8, 6, 8, 12, 2, '#455a64');
  ellipse(g, 12, 7, 3, 3, s.inUse ? '#80deea' : '#263238');
  for (let i = 0; i < 3; i++) fillRound(g, 24 + i * 11, 8 + (i % 2) * 4, 9, 11, 1, 'rgba(255,255,255,0.7)', '#78909c');
  g.fillStyle = '#e53935';
  for (let i = 0; i < 3; i++) g.fillRect(25 + i * 11, 9 + (i % 2) * 4, 7, 2);
  g.strokeStyle = '#5d4037';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(w - 13, h * 0.5, 5, 0, Math.PI * 2);
  g.moveTo(w - 9, h * 0.5 + 4);
  g.lineTo(w - 5, h * 0.5 + 8);
  g.stroke();
};

const trainingDummy: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h - 7, 10, 4, '#5d4037');
  const sway = s.inUse ? Math.sin(s.now / 90) * 2 : 0;
  fillRound(g, w / 2 - 6 + sway, 11, 12, h - 18, 5, '#bcaaa4', '#8d6e63');
  ellipse(g, w / 2 + sway, 8, 6, 6, '#d7ccc8');
  g.fillStyle = '#e53935';
  g.fillRect(w / 2 - 6 + sway, h * 0.45, 12, 3);
};

const patrolCar: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 5, w - 6, h - 9, 7, '#fafafa', '#37474f');
  fillRound(g, 3, h * 0.45, w - 6, h * 0.22, 2, '#1a237e');
  fillRound(g, w * 0.3, 8, w * 0.4, h * 0.3, 4, '#90caf9', '#455a64');
  const on = s.inUse || Math.floor(s.now / 400) % 2 === 0;
  fillRound(g, w / 2 - 8, 4, 7, 4, 1, on ? '#ef5350' : '#b71c1c');
  fillRound(g, w / 2 + 1, 4, 7, 4, 1, on ? '#1565c0' : '#42a5f5');
  for (const x of [w * 0.2, w * 0.8]) ellipse(g, x, h - 4, 5, 2.5, '#212121');
};

const fireTruck: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 3, w - 6, h - 6, 6, '#e53935', '#8e0000');
  fillRound(g, 6, 6, w - 12, h * 0.2, 3, '#90caf9', '#455a64');
  // Ladder along the top.
  g.strokeStyle = '#cfd8dc';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(w * 0.35, h * 0.32);
  g.lineTo(w * 0.35, h - 10);
  g.moveTo(w * 0.65, h * 0.32);
  g.lineTo(w * 0.65, h - 10);
  for (let y = h * 0.36; y < h - 10; y += 8) {
    g.moveTo(w * 0.35, y);
    g.lineTo(w * 0.65, y);
  }
  g.stroke();
  const on = s.inUse && Math.floor(s.now / 300) % 2 === 0;
  fillRound(g, w / 2 - 10, 2, 8, 4, 1, on ? '#ffeb3b' : '#ff8f00');
  fillRound(g, w / 2 + 2, 2, 8, 4, 1, on ? '#ff8f00' : '#ffeb3b');
  for (const y of [h * 0.3, h * 0.78]) {
    fillRound(g, 0, y, 4, 9, 1, '#212121');
    fillRound(g, w - 4, y, 4, 9, 1, '#212121');
  }
};

const hoseRack: Sprite = (g, w, h) => {
  fillRound(g, 4, 3, w - 8, h - 10, 2, '#b71c1c');
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = '#fbc02d';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(w / 2, h * 0.38 + i * 2, 9 - i * 2.5, 0, Math.PI * 2);
    g.stroke();
  }
  fillRound(g, w / 2 - 3, h - 9, 6, 4, 1, '#9e9e9e');
};

const gearLocker: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#ffb300', 7);
  fillRound(g, 7, 5, w - 14, h * 0.45, 2, '#3e2723');
  fillRound(g, 9, 7, w - 18, h * 0.38, 3, '#f9a825');
  g.fillStyle = '#e0e0e0';
  g.fillRect(9, 7 + h * 0.2, w - 18, 2);
  ellipse(g, w / 2, 5, 6, 3, '#d32f2f');
};

const fireDrill: Sprite = (g, w, h, s) => {
  box(g, 2, 2, w - 4, h - 4, '#a1887f', 8);
  g.strokeStyle = '#eceff1';
  g.lineWidth = 2;
  g.beginPath();
  for (const x of [w * 0.15, w * 0.35]) {
    g.moveTo(x, 4);
    g.lineTo(x, h - 10);
  }
  for (let y = 7; y < h - 10; y += 5) {
    g.moveTo(w * 0.15, y);
    g.lineTo(w * 0.35, y);
  }
  g.stroke();
  fillRound(g, w * 0.5, 6, w * 0.4, h - 18, 2, '#6d4c41');
  ellipse(g, w * 0.7, h * 0.4, 5, 5, s.inUse ? '#ff7043' : '#8d6e63');
};

const chalkboard: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 3, w - 4, h - 11, 2, '#2e7d32', '#6d4c41');
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(8, 9);
  g.lineTo(w * 0.35, 9);
  g.moveTo(8, 14);
  g.lineTo(w * 0.28, 14);
  g.moveTo(w * 0.55, 8);
  g.lineTo(w * 0.62, 16);
  g.lineTo(w * 0.7, 8);
  g.stroke();
  if (s.inUse) ellipse(g, w * 0.8, 12, 2, 2, '#fff59d');
  fillRound(g, 4, h - 9, w - 8, 3, 1, '#8d6e63');
  fillRound(g, w * 0.3, h - 10, 6, 2, 1, '#fafafa');
};

const teacherDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#a1887f', 8);
  for (let i = 0; i < 3; i++) fillRound(g, 6 + i, 7 - i, 13, 10, 1, '#fafafa', '#bdbdbd');
  ellipse(g, w - 9, 11, 4.5, 4.5, '#e53935');
  fillRound(g, w - 10, 5, 2, 3, 1, '#6d4c41');
};

const studentDesk: Sprite = (g, w, h) => {
  box(g, 5, 6, w - 10, h - 14, '#d7ccc8', 6);
  fillRound(g, 10, 9, 10, 7, 1, '#fff9c4', '#bdbdbd');
  fillRound(g, w - 15, 10, 2, 7, 1, '#fbc02d');
  fillRound(g, 9, h - 8, w - 18, 5, 2, '#8d6e63');
};

const lawDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#5d4037', 8);
  fillRound(g, 5, 7, 14, 11, 1, '#fffde7', '#bcaaa4');
  g.fillStyle = '#9e9e9e';
  for (let i = 0; i < 3; i++) g.fillRect(7, 10 + i * 2.5, 9, 1);
  fillRound(g, w - 14, 6, 10, 8, 1, '#263238');
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(w - 13, 7, 8, 5);
  }
  ellipse(g, w - 9, h * 0.65, 3.5, 2, '#ffd54f');
};

const lawLibrary: Sprite = (g, w, h, s) => {
  box(g, 3, 2, w - 6, h - 4, '#4e342e', 6);
  const cols = ['#7b1fa2', '#1565c0', '#2e7d32', '#c62828', '#ef6c00', '#4e342e'];
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 6; i++) fillRound(g, 6 + i * 5, 5 + r * 13, 4, 11, 0.5, cols[(i + r * 2 + s.seed) % cols.length]);
};

const courtPodium: Sprite = (g, w, h) => {
  box(g, 6, 5, w - 12, h - 10, '#6d4c41', 9);
  fillRound(g, 10, 7, w - 20, 7, 1, '#fffde7');
  g.strokeStyle = '#424242';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(w / 2, 6);
  g.lineTo(w / 2 + 4, 1);
  g.stroke();
  ellipse(g, w / 2 + 4, 1.5, 2, 2, '#424242');
};

const judgeBench: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 5, '#3e2723', 11);
  fillRound(g, w / 2 - 12, 6, 24, 6, 1, '#5d4037');
  // The gavel.
  fillRound(g, w * 0.72, 6, 10, 4, 1, '#8d6e63');
  fillRound(g, w * 0.72 + 4, 9, 2, 7, 1, '#6d4c41');
  ellipse(g, w * 0.28, 9, 5, 3, '#ffd54f');
};

const draftingTable: Sprite = (g, w, h, s) => {
  g.strokeStyle = '#78909c';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(8, h - 3);
  g.lineTo(10, h * 0.5);
  g.moveTo(w - 8, h - 3);
  g.lineTo(w - 10, h * 0.5);
  g.stroke();
  fillRound(g, 3, 3, w - 6, h * 0.62, 1.5, '#e3f2fd', '#90a4ae');
  g.strokeStyle = '#1e88e5';
  g.lineWidth = 0.8;
  g.strokeRect(8, 7, w - 16, h * 0.4);
  g.beginPath();
  g.moveTo(8, 7 + h * 0.2);
  g.lineTo(w - 8, 7 + h * 0.2);
  g.moveTo(w / 2, 7);
  g.lineTo(w / 2, 7 + h * 0.4);
  g.stroke();
  if (s.inUse) fillRound(g, w * 0.62, h * 0.32, 10, 2, 1, '#455a64');
};

const cadStation: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#eceff1', 8);
  fillRound(g, 4, 1, w - 8, 10, 1.5, '#212121');
  g.fillStyle = s.inUse ? '#1e3a5f' : '#37474f';
  g.fillRect(6, 2.5, w - 12, 7);
  if (s.inUse) {
    g.strokeStyle = '#4fc3f7';
    g.lineWidth = 0.8;
    g.strokeRect(w / 2 - 5, 4, 8, 4);
    g.beginPath();
    g.moveTo(w / 2 - 5, 4);
    g.lineTo(w / 2 - 2, 3);
    g.lineTo(w / 2 + 6, 3);
    g.lineTo(w / 2 + 3, 4);
    g.stroke();
  }
  fillRound(g, 9, h * 0.55, w - 18, 4, 1, '#cfd8dc');
};

const modelTable: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#bcaaa4', 7);
  fillRound(g, 10, 8, 14, 12, 1, '#fafafa', '#9e9e9e');
  fillRound(g, 26, 5, 10, 15, 1, '#eceff1', '#9e9e9e');
  fillRound(g, 38, 11, 12, 9, 1, '#fafafa', '#9e9e9e');
  ellipse(g, 56, 16, 4, 4, '#81c784');
  if (s.inUse) fillRound(g, w - 18, 7, 8, 2, 1, '#ff7043');
};

const siteVan: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 5, w - 6, h - 9, 6, '#fbc02d', '#5d4037');
  fillRound(g, w - 22, 8, 16, h * 0.32, 3, '#90caf9', '#455a64');
  g.fillStyle = '#212121';
  for (let x = 8; x < w - 26; x += 8) g.fillRect(x, h * 0.55, 4, 3);
  fillRound(g, w / 2 - 5, 3, 10, 3, 1, s.inUse ? '#ff9800' : '#e65100');
  for (const x of [w * 0.2, w * 0.8]) ellipse(g, x, h - 4, 5, 2.5, '#212121');
};

const vetTable: Sprite = (g, w, h, s) => {
  box(g, 2, 4, w - 4, h - 7, '#b0bec5', 8);
  fillRound(g, 8, 7, w - 16, h - 18, 3, '#e0f2f1', '#80cbc4');
  ellipse(g, w - 10, 9, 4, 3, '#fafafa');
  if (s.inUse) {
    ellipse(g, w / 2, h * 0.42, 6, 4, '#d7a86e');
    ellipse(g, w / 2 + 6, h * 0.36, 3, 3, '#d7a86e');
  }
};

const kennel: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 3, w - 6, h - 6, 3, '#cfd8dc', '#78909c');
  ellipse(g, w / 2, h * 0.58, 9, 6, '#ffe0b2');
  // A sleepy pup, or a cat, behind the bars.
  const cat = s.seed % 2 === 0;
  ellipse(g, w / 2, h * 0.55, 7, 5, cat ? '#9e9e9e' : '#c58b4d');
  ellipse(g, w / 2 + 6, h * 0.45, 4, 4, cat ? '#9e9e9e' : '#c58b4d');
  g.strokeStyle = '#607d8b';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let x = 7; x < w - 5; x += 5) {
    g.moveTo(x, 4);
    g.lineTo(x, h - 4);
  }
  g.stroke();
};

const sewingMachine: Sprite = (g, w, h, s) => {
  box(g, 2, 8, w - 4, h - 11, '#d7ccc8', 7);
  fillRound(g, 7, 4, w - 14, 7, 3, '#eceff1', '#90a4ae');
  fillRound(g, w - 12, 4, 5, 14, 2, '#eceff1', '#90a4ae');
  ellipse(g, 11, 7, 2.5, 2.5, '#e53935');
  g.strokeStyle = s.inUse ? '#ec407a' : '#ad1457';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(w - 10, 17);
  g.lineTo(w - 10, s.inUse ? 20 + Math.sin(s.now / 40) * 2 : 21);
  g.stroke();
  fillRound(g, 6, h * 0.62, 14, 6, 1, '#f48fb1');
};

const fabricTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#d7ccc8', 7);
  fillRound(g, 6, 6, 26, 14, 1, '#ce93d8');
  fillRound(g, 20, 8, 20, 12, 1, '#80cbc4');
  g.strokeStyle = '#757575';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(w - 22, 9);
  g.lineTo(w - 12, 17);
  g.moveTo(w - 22, 17);
  g.lineTo(w - 12, 9);
  g.stroke();
  fillRound(g, w - 30, h * 0.66, 22, 2, 1, '#ffd54f');
};

const mannequin: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h - 6, 7, 3, '#795548');
  g.fillStyle = '#795548';
  g.fillRect(w / 2 - 1, h * 0.55, 2, h * 0.4);
  const dress = ['#e91e63', '#3f51b5', '#009688', '#ff9800'][s.seed % 4];
  g.fillStyle = dress;
  g.beginPath();
  g.moveTo(w / 2 - 6, 8);
  g.lineTo(w / 2 + 6, 8);
  g.lineTo(w / 2 + 10, h * 0.62);
  g.lineTo(w / 2 - 10, h * 0.62);
  g.closePath();
  g.fill();
  ellipse(g, w / 2, 6, 5, 3.5, '#efebe9');
};

const runway: Sprite = (g, w, h, s) => {
  fillRound(g, 4, 2, w - 8, h - 4, 3, '#fafafa', '#f8bbd0');
  g.fillStyle = 'rgba(236,64,122,0.25)';
  for (let y = 10; y < h - 6; y += 14) g.fillRect(w / 2 - 1, y, 2, 7);
  for (const y of [6, h - 8]) ellipse(g, w / 2, y, 5, 2.5, s.inUse ? '#fff176' : '#f48fb1');
};

const photoBackdrop: Sprite = (g, w, h) => {
  g.fillStyle = '#9e9e9e';
  g.fillRect(3, 2, w - 6, 3);
  const grd = g.createLinearGradient(0, 4, 0, h - 4);
  grd.addColorStop(0, '#eceff1');
  grd.addColorStop(1, '#b0bec5');
  g.fillStyle = grd;
  g.fillRect(6, 4, w - 12, h - 8);
  g.strokeStyle = '#757575';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(4, 2);
  g.lineTo(4, h - 3);
  g.moveTo(w - 4, 2);
  g.lineTo(w - 4, h - 3);
  g.stroke();
};

const studioLight: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h - 6, 8, 3, '#424242');
  g.fillStyle = '#616161';
  g.fillRect(w / 2 - 1, 10, 2, h - 16);
  fillRound(g, w / 2 - 9, 3, 18, 10, 3, '#fafafa', '#616161');
  if (s.inUse || s.night > 0.3) {
    g.fillStyle = 'rgba(255,255,230,0.35)';
    g.beginPath();
    g.ellipse(w / 2, 14, 12, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
};

const studioCamera: Sprite = (g, w, h, s) => {
  g.strokeStyle = '#424242';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(w / 2, h * 0.45);
  g.lineTo(8, h - 3);
  g.moveTo(w / 2, h * 0.45);
  g.lineTo(w - 8, h - 3);
  g.moveTo(w / 2, h * 0.45);
  g.lineTo(w / 2, h - 3);
  g.stroke();
  fillRound(g, w / 2 - 9, 6, 18, 12, 2, '#212121');
  ellipse(g, w / 2, 12, 4.5, 4.5, '#455a64');
  ellipse(g, w / 2, 12, 2.5, 2.5, s.inUse && Math.floor(s.now / 300) % 3 === 0 ? '#fff' : '#90caf9');
  fillRound(g, w / 2 + 3, 4, 4, 3, 1, '#616161');
};

const photoEditStation: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#cfd8dc', 8);
  fillRound(g, 4, 1, w - 8, 10, 1.5, '#212121');
  if (s.inUse) {
    const grd = g.createLinearGradient(6, 2, w - 6, 9);
    grd.addColorStop(0, '#ffb74d');
    grd.addColorStop(1, '#4fc3f7');
    g.fillStyle = grd;
  } else g.fillStyle = '#37474f';
  g.fillRect(6, 2.5, w - 12, 7);
  fillRound(g, 8, h * 0.55, 14, 7, 2, '#424242');
  ellipse(g, w - 9, h * 0.6, 3, 3.5, '#eceff1');
};

const darkroomSink: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#4e342e', 7);
  for (let i = 0; i < 3; i++) fillRound(g, 6 + i * 22, 7, 18, 12, 2, ['#795548', '#5d4037', '#6d4c41'][i], '#3e2723');
  if (s.inUse) fillRound(g, 30, 9, 12, 8, 1, '#f5f5f5');
  ellipse(g, w - 6, 5, 3, 3, s.inUse ? '#ff1744' : '#b71c1c');
};

const pressScooter: Sprite = (g, w, h) => {
  ellipse(g, w / 2, 7, 5, 4, '#212121');
  ellipse(g, w / 2, h - 7, 5, 4, '#212121');
  fillRound(g, w / 2 - 7, 9, 14, h - 18, 5, '#1e88e5', '#0d47a1');
  fillRound(g, w / 2 - 5, h * 0.5, 10, 8, 3, '#424242');
  fillRound(g, w / 2 - 10, 9, 20, 3, 1, '#9e9e9e');
};

const salonStation: Sprite = (g, w, h, s) => {
  fillRound(g, 5, 1, w - 10, 9, 2, '#e1f5fe', '#ab47bc');
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(9, 2.5, 5, 6);
  fillRound(g, 7, 13, w - 14, h - 17, 6, '#7b1fa2');
  fillRound(g, 10, 15, w - 20, h - 23, 4, s.inUse ? '#ba68c8' : '#9c27b0');
  fillRound(g, w - 9, 11, 5, 3, 1, '#bdbdbd');
};

const shampooSink: Sprite = (g, w, h) => {
  fillRound(g, 5, 3, w - 10, 13, 6, '#fafafa', '#9575cd');
  ellipse(g, w / 2, 9, 7, 4, '#d1c4e9');
  fillRound(g, 8, 18, w - 16, h - 21, 5, '#5e35b1');
};

const salonCounter: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#8e24aa', 9);
  fillRound(g, 6, 7, 12, 9, 1, '#fafafa', '#bdbdbd');
  g.fillStyle = '#9e9e9e';
  for (let i = 0; i < 3; i++) g.fillRect(8, 9 + i * 2.5, 8, 1);
  ellipse(g, w - 10, 11, 4, 4, '#f8bbd0');
};

const productShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#f3e5f5', 6);
  const cols = ['#ec407a', '#ab47bc', '#26a69a', '#ffa726', '#42a5f5'];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) fillRound(g, 6 + i * 6, 5 + r * 13, 4, 9, 1.5, cols[(i + r) % cols.length]);
};

const flightSimulator: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 3, w - 6, h - 6, 14, '#37474f', '#263238');
  fillRound(g, 10, 7, w - 20, h * 0.35, 6, s.inUse ? '#4fc3f7' : '#455a64');
  if (s.inUse) {
    g.strokeStyle = '#e1f5fe';
    g.lineWidth = 1;
    g.beginPath();
    const tilt = Math.sin(s.now / 600) * 4;
    g.moveTo(14, 7 + h * 0.18 + tilt);
    g.lineTo(w - 14, 7 + h * 0.18 - tilt);
    g.stroke();
  }
  fillRound(g, w / 2 - 10, h * 0.55, 20, 14, 4, '#546e7a');
  ellipse(g, w / 2, h * 0.62, 5, 3, '#212121');
  for (const x of [16, w - 16]) ellipse(g, x, h * 0.75, 3, 3, ['#ef5350', '#66bb6a'][x < w / 2 ? 0 : 1]);
};

const briefingTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#5d4037', 7);
  fillRound(g, 8, 6, w - 16, h - 16, 1, '#e3f2fd', '#90caf9');
  g.strokeStyle = '#1e88e5';
  g.lineWidth = 1;
  g.setLineDash([3, 2]);
  g.beginPath();
  g.moveTo(14, h - 13);
  g.quadraticCurveTo(w / 2, 4, w - 14, h - 12);
  g.stroke();
  g.setLineDash([]);
};

const weatherStation: Sprite = (g, w, h, s) => {
  box(g, 3, 3, w - 6, h - 6, '#0277bd', 7);
  ellipse(g, w / 2, h * 0.4, 10, 10, '#01579b');
  g.strokeStyle = '#4fc3f7';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(w / 2, h * 0.4, 7, 0, Math.PI * 2);
  const a = s.now / 500;
  g.moveTo(w / 2, h * 0.4);
  g.lineTo(w / 2 + Math.cos(a) * 9, h * 0.4 + Math.sin(a) * 9);
  g.stroke();
  ellipse(g, w / 2 + 4, h * 0.36, 2, 1.5, '#66bb6a');
};

const opsDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#78909c', 8);
  for (const x of [5, w / 2 + 1]) {
    fillRound(g, x, 1, w / 2 - 6, 8, 1, '#212121');
    g.fillStyle = s.inUse ? '#69f0ae' : '#37474f';
    g.fillRect(x + 1.5, 2.5, w / 2 - 9, 5);
  }
  fillRound(g, 8, h * 0.55, w - 16, 4, 1, '#cfd8dc');
};

const boardingGate: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 4, w - 4, h - 8, 4, '#b0bec5', '#546e7a');
  fillRound(g, 6, 7, w * 0.35, h - 14, 2, '#eceff1');
  g.fillStyle = '#263238';
  g.fillRect(w * 0.5, 7, w * 0.42, 6);
  g.fillStyle = s.inUse ? '#ffeb3b' : '#ff9800';
  g.font = '6px sans-serif';
  g.fillText('GATE', w * 0.52, 12);
  ellipse(g, w - 8, h - 9, 3, 3, s.inUse ? '#66bb6a' : '#ef5350');
};

const chemistryBench: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#eceff1', 7);
  const fizz = s.inUse ? Math.sin(s.now / 150) * 1.5 : 0;
  for (const [x, c] of [[10, '#66bb6a'], [22, '#42a5f5'], [34, '#ef5350']] as Array<[number, string]>) {
    fillRound(g, x - 3, 6, 6, 12, 2, 'rgba(255,255,255,0.8)', '#90a4ae');
    fillRound(g, x - 3, 11 - fizz, 6, 7 + fizz, 2, c);
  }
  ellipse(g, w - 18, 13, 6, 5, 'rgba(255,255,255,0.8)');
  ellipse(g, w - 18, 15, 5, 3, s.inUse ? '#ab47bc' : '#ce93d8');
  if (s.inUse) ellipse(g, w - 18, 7 - fizz, 2, 2, 'rgba(200,200,255,0.7)');
};

const formulaBoard: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 11, 2, '#fafafa', '#78909c');
  g.fillStyle = '#1565c0';
  g.font = '7px serif';
  g.fillText('E=mc² ∫dx', 8, 12);
  g.fillStyle = '#c62828';
  g.fillText('Σ λ→∞', w * 0.55, 18);
  fillRound(g, 4, h - 8, w - 8, 2, 1, '#78909c');
};

const specimenFreezer: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#e1f5fe', 7);
  fillRound(g, 7, 5, w - 14, h * 0.4, 2, '#b3e5fc', '#81d4fa');
  for (let i = 0; i < 4; i++) fillRound(g, 9 + i * 6, 8, 3, 7, 1, ['#ef5350', '#66bb6a', '#ffca28', '#7e57c2'][i]);
  ellipse(g, w - 9, h - 10, 2, 2, '#29b6f6');
};

const inventionBench: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#8d6e63', 7);
  fillRound(g, 8, 6, 18, 12, 2, '#b0bec5', '#607d8b');
  ellipse(g, 17, 12, 4, 4, s.inUse ? '#ffeb3b' : '#78909c');
  g.strokeStyle = '#ef6c00';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(26, 12);
  g.quadraticCurveTo(34, 4, 42, 12);
  g.stroke();
  fillRound(g, w - 26, 7, 6, 10, 1, '#455a64');
  fillRound(g, w - 16, 9, 10, 3, 1, '#9e9e9e');
  if (s.inUse && Math.floor(s.now / 200) % 2 === 0) ellipse(g, 26, 12, 2, 2, '#fff59d');
};

const labControl: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#37474f', 8);
  for (let i = 0; i < 3; i++) {
    fillRound(g, 6 + i * 22, 6, 18, 9, 1, '#212121');
    g.fillStyle = s.inUse ? ['#69f0ae', '#ffd740', '#ff5252'][i] : '#455a64';
    g.fillRect(8 + i * 22, 8, 14, 5);
  }
  for (let i = 0; i < 8; i++) ellipse(g, 8 + i * 8, h - 9, 1.6, 1.6, i % 3 === 0 ? '#ff5252' : '#b0bec5');
};

const researchDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#90a4ae', 8);
  for (let i = 0; i < 4; i++) fillRound(g, 5 + i * 1.5, 7 - i, 12, 9, 1, '#fafafa', '#bdbdbd');
  fillRound(g, w - 14, 7, 10, 8, 1, '#455a64');
  ellipse(g, w - 9, h * 0.68, 3, 2, '#fff59d');
};

const filmSet: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 14, 2, '#d7ccc8', '#8d6e63');
  // A painted backdrop: a window, a door, a sofa.
  fillRound(g, 10, 8, 22, 18, 1, '#90caf9', '#6d4c41');
  fillRound(g, w - 30, 8, 16, 34, 1, '#8d6e63', '#5d4037');
  fillRound(g, w / 2 - 18, h - 34, 36, 14, 4, '#c62828');
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,220,0.25)';
    g.fillRect(4, 4, w - 8, h - 18);
  }
  fillRound(g, 6, h - 10, w - 12, 3, 1, '#5d4037');
};

const movieCamera: Sprite = (g, w, h, s) => {
  g.strokeStyle = '#424242';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(w / 2, h * 0.5);
  g.lineTo(9, h - 3);
  g.moveTo(w / 2, h * 0.5);
  g.lineTo(w - 9, h - 3);
  g.stroke();
  fillRound(g, w / 2 - 10, 8, 20, 13, 2, '#212121');
  ellipse(g, w / 2 - 5, 6, 5, 5, '#37474f');
  ellipse(g, w / 2 + 5, 6, 5, 5, '#37474f');
  fillRound(g, w / 2 - 3, 20, 6, 5, 1, '#455a64');
  if (s.inUse) ellipse(g, w / 2 + 8, 11, 1.8, 1.8, '#ff1744');
};

const stuntMat: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 6, 4, '#1e88e5', '#0d47a1');
  g.strokeStyle = 'rgba(255,255,255,0.4)';
  g.lineWidth = 1;
  for (let x = w / 3; x < w - 4; x += w / 3) {
    g.beginPath();
    g.moveTo(x, 4);
    g.lineTo(x, h - 4);
    g.stroke();
  }
};

const makeupMirror: Sprite = (g, w, h) => {
  box(g, 2, 10, w - 4, h - 13, '#fce4ec', 6);
  fillRound(g, 6, 1, w - 12, 12, 2, '#e1f5fe', '#f8bbd0');
  for (let i = 0; i < 5; i++) ellipse(g, 7 + i * ((w - 14) / 4), 1.5, 1.6, 1.6, '#fff59d');
  ellipse(g, 11, h * 0.65, 2.5, 2.5, '#e91e63');
  fillRound(g, w - 15, h * 0.6, 8, 3, 1, '#ffb74d');
};

const scriptTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#6d4c41', 7);
  for (const x of [10, 30, 50]) {
    fillRound(g, x - 5, 6, 12, 14, 1, '#fffde7', '#bdbdbd');
    g.fillStyle = '#9e9e9e';
    for (let i = 0; i < 3; i++) g.fillRect(x - 3, 9 + i * 3, 8, 1);
  }
};

const campaignDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#5d4037', 8);
  fillRound(g, 5, 7, 12, 9, 1, '#fafafa', '#bdbdbd');
  fillRound(g, w - 14, 6, 9, 6, 2, '#212121');
  if (s.inUse) fillRound(g, w - 13, 7, 7, 4, 1, '#66bb6a');
  g.fillStyle = '#c62828';
  g.fillRect(w - 6, 2, 1, 9);
  fillRound(g, w - 5, 2, 6, 4, 0.5, '#1565c0');
};

const speechPodium: Sprite = (g, w, h) => {
  box(g, 6, 6, w - 12, h - 10, '#3e2723', 10);
  ellipse(g, w / 2, 13, 6, 3, '#ffd54f');
  g.strokeStyle = '#212121';
  g.lineWidth = 1.5;
  for (const dx of [-5, 0, 5]) {
    g.beginPath();
    g.moveTo(w / 2 + dx / 2, 8);
    g.lineTo(w / 2 + dx, 2);
    g.stroke();
    ellipse(g, w / 2 + dx, 2, 1.8, 1.8, '#424242');
  }
};

const debateTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#795548', 7);
  for (const x of [w * 0.25, w * 0.75]) {
    fillRound(g, x - 6, 6, 12, 7, 1, '#fafafa', '#bdbdbd');
    ellipse(g, x, 16, 2, 2, '#424242');
  }
  fillRound(g, w / 2 - 1, 5, 2, 14, 1, '#bcaaa4');
};

const editorDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 4, 1, w - 16, 9, 1, '#212121');
  g.fillStyle = s.inUse ? '#fafafa' : '#37474f';
  g.fillRect(6, 2.5, w - 20, 6);
  if (s.inUse) {
    g.fillStyle = '#90a4ae';
    for (let i = 0; i < 3; i++) g.fillRect(7, 3.5 + i * 1.6, w - 24, 0.8);
  }
  fillRound(g, w - 11, 6, 8, 11, 1, '#ffe0b2', '#bcaaa4');
  ellipse(g, 9, h * 0.68, 3, 2.5, '#6d4c41');
};

const tastingTable: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 6, 4, '#fafafa', '#bdbdbd');
  for (const x of [w * 0.28, w * 0.72]) {
    ellipse(g, x, h / 2, 8, 6, '#eceff1');
    ellipse(g, x, h / 2, 4, 3, ['#ff8a65', '#81c784'][x < w / 2 ? 0 : 1]);
  }
  ellipse(g, w / 2, h / 2 - 3, 2, 3, 'rgba(183,28,28,0.7)');
};

const wineRack: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#4e342e', 6);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) ellipse(g, 9 + i * 7, 7 + r * 8, 2.8, 2.8, (i + r) % 3 === 0 ? '#827717' : '#4a148c');
};

const artPedestal: Sprite = (g, w, h, s) => {
  box(g, 8, 10, w - 16, h - 13, '#eceff1', 7);
  const k = s.seed % 2;
  if (k) {
    ellipse(g, w / 2, 9, 6, 7, '#bcaaa4');
    ellipse(g, w / 2, 3, 3.5, 3.5, '#bcaaa4');
  } else {
    g.fillStyle = '#ffb300';
    g.beginPath();
    g.moveTo(w / 2, 1);
    g.lineTo(w / 2 + 8, 13);
    g.lineTo(w / 2 - 8, 13);
    g.closePath();
    g.fill();
  }
};

const archiveShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#6d4c41', 6);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) fillRound(g, 6 + i * 7.5, 5 + r * 13, 6, 10, 1, ['#fff9c4', '#ffe0b2', '#f5f5f5', '#dcedc8'][(i + r) % 4], '#a1887f');
};

const contentDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#f8bbd0', 8);
  fillRound(g, 5, 1, w - 16, 9, 1.5, '#212121');
  g.fillStyle = s.inUse ? '#f48fb1' : '#37474f';
  g.fillRect(7, 2.5, w - 20, 6);
  for (const [x, c] of [[w - 9, '#fff59d'], [w - 6, '#b2ff59']] as Array<[number, string]>) fillRound(g, x - 3, 4, 5, 5, 0.5, c);
  ellipse(g, 9, h * 0.68, 2.5, 3, '#fafafa');
};

const videoEditStation: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#311b92', 8);
  fillRound(g, 3, 1, w - 6, 10, 1.5, '#000');
  if (s.inUse) {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = ['#ff5252', '#40c4ff', '#69f0ae', '#ffd740'][i];
      g.fillRect(5 + ((s.now / 40 + i * 9) % (w - 14)), 3 + i * 1.8, 5, 1.2);
    }
  } else {
    g.fillStyle = '#263238';
    g.fillRect(5, 2.5, w - 10, 7);
  }
  fillRound(g, 8, h * 0.56, w - 16, 4, 1, '#9575cd');
};

const streamingSetup: Sprite = (g, w, h, s) => {
  box(g, 2, 7, w - 4, h - 10, '#212121', 7);
  fillRound(g, 5, 1, w - 10, 9, 1.5, '#000');
  g.fillStyle = s.inUse ? '#7c4dff' : '#263238';
  g.fillRect(7, 2.5, w - 14, 6);
  ellipse(g, w - 7, 14, 3, 4, '#616161');
  g.strokeStyle = '#ff4081';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(9, 15, 5, 0, Math.PI * 2);
  g.stroke();
  if (s.inUse) ellipse(g, w - 6, 3, 2, 2, Math.floor(s.now / 500) % 2 ? '#ff1744' : '#b71c1c');
};

const selfieWall: Sprite = (g, w, h) => {
  fillRound(g, 3, 2, w - 6, h - 8, 2, '#fce4ec', '#ff80ab');
  for (let i = 0; i < 8; i++) {
    const x = 8 + (i % 4) * ((w - 16) / 3);
    const y = 6 + Math.floor(i / 4) * 10;
    ellipse(g, x, y, 3, 3, ['#ff4081', '#ffd740', '#40c4ff', '#b388ff'][i % 4]);
  }
  fillRound(g, w / 2 - 8, h - 9, 16, 4, 2, '#f8bbd0');
};

const trendBoard: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 11, 2, '#fafafa', '#78909c');
  g.strokeStyle = '#43a047';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(8, h - 15);
  g.lineTo(w * 0.35, h - 20);
  g.lineTo(w * 0.55, h - 17);
  g.lineTo(w - 10, 7);
  g.stroke();
  for (let i = 0; i < 4; i++) fillRound(g, w * 0.62 + i * 5, h - 14 - i * 2, 3, 3 + i * 2, 0.5, '#42a5f5');
  fillRound(g, 4, h - 8, w - 8, 2, 1, '#78909c');
};

const obstacleCourse: Sprite = (g, w, h, s) => {
  fillRound(g, 1, 2, w - 2, h - 4, 2, '#a1887f', '#6d4c41');
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * ((w - 16) / 3);
    fillRound(g, x - 3, 5, 6, h - 10, 1, i % 2 ? '#5d4037' : '#8d6e63');
  }
  g.strokeStyle = '#efebe9';
  g.lineWidth = 1;
  g.setLineDash([3, 2]);
  g.beginPath();
  g.moveTo(4, h / 2);
  g.lineTo(w - 4, h / 2);
  g.stroke();
  g.setLineDash([]);
  if (s.inUse) ellipse(g, 6 + ((s.now / 30) % (w - 12)), h / 2, 2, 2, '#ffeb3b');
};

const pullUpBar: Sprite = (g, w, h) => {
  g.strokeStyle = '#757575';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(6, h - 3);
  g.lineTo(6, 4);
  g.lineTo(w - 6, 4);
  g.lineTo(w - 6, h - 3);
  g.stroke();
  ellipse(g, 6, h - 3, 3, 1.5, '#424242');
  ellipse(g, w - 6, h - 3, 3, 1.5, '#424242');
};

/** Taegukgi, the Korean flag, at sprite size: the red-and-blue taeguk and the four trigrams in black. */
function taegukgi(g: CanvasRenderingContext2D, x: number, y: number, fw: number, fh: number) {
  g.fillStyle = '#fafafa';
  g.fillRect(x, y, fw, fh);
  const cx = x + fw / 2;
  const cy = y + fh / 2;
  const r = Math.min(fw, fh) * 0.27;
  g.fillStyle = '#cd2e3a';
  g.beginPath();
  g.arc(cx, cy, r, Math.PI, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0047a0';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI);
  g.fill();
  ellipse(g, cx + r / 2, cy, r / 2, r / 2, '#cd2e3a');
  ellipse(g, cx - r / 2, cy, r / 2, r / 2, '#0047a0');
  // Geon, gon, gam and ri, one in each corner.
  g.fillStyle = '#111';
  const bar = Math.max(0.5, fh * 0.07);
  for (const [tx, ty] of [[x + fw * 0.08, y + fh * 0.12], [x + fw * 0.76, y + fh * 0.12], [x + fw * 0.08, y + fh * 0.66], [x + fw * 0.76, y + fh * 0.66]]) {
    for (let i = 0; i < 3; i++) g.fillRect(tx, ty + i * bar * 1.8, fw * 0.16, bar);
  }
}

/** The UN flag, plainly: light blue with a white emblem. */
function unFlag(g: CanvasRenderingContext2D, x: number, y: number, fw: number, fh: number) {
  g.fillStyle = '#5b92e5';
  g.fillRect(x, y, fw, fh);
  g.strokeStyle = '#fafafa';
  g.lineWidth = 0.7;
  g.beginPath();
  g.arc(x + fw / 2, y + fh / 2, Math.min(fw, fh) * 0.28, 0, Math.PI * 2);
  g.stroke();
}

const flagPole: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h - 5, 7, 3, '#9e9e9e');
  g.fillStyle = '#bdbdbd';
  g.fillRect(w / 2 - 1, 2, 2, h - 7);
  const wave = Math.sin(s.now / 300) * 1.2;
  taegukgi(g, w / 2 + 1, 3 + wave, 15, 10);
};

const gearRack: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#556b2f', 6);
  for (let i = 0; i < 3; i++) fillRound(g, 6 + i * 10, 5, 8, 14, 2, ['#6b8e23', '#4b5320', '#8f9779'][i]);
  fillRound(g, 6, 22, w - 12, 4, 1, '#3e2723');
};

const mapTable: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#6d4c41', 7);
  fillRound(g, 6, 5, w - 12, h - 14, 1, '#c5e1a5', '#8d6e63');
  g.strokeStyle = '#33691e';
  g.lineWidth = 0.8;
  g.beginPath();
  g.ellipse(w * 0.35, h * 0.38, 8, 5, 0.3, 0, Math.PI * 2);
  g.ellipse(w * 0.65, h * 0.42, 6, 4, -0.2, 0, Math.PI * 2);
  g.stroke();
  ellipse(g, w * 0.7, h * 0.35, 2, 2, s.inUse ? '#f44336' : '#b71c1c');
  ellipse(g, w * 0.3, h * 0.45, 2, 2, '#1565c0');
};

const radioStation: Sprite = (g, w, h, s) => {
  box(g, 3, 4, w - 6, h - 7, '#33691e', 8);
  fillRound(g, 7, 7, w - 14, 9, 1, '#1b5e20');
  g.fillStyle = s.inUse ? '#b2ff59' : '#558b2f';
  g.fillRect(9, 9, w - 18, 5);
  for (let i = 0; i < 3; i++) ellipse(g, 10 + i * 8, h - 9, 2, 2, '#c5e1a5');
  g.strokeStyle = '#9e9e9e';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(w - 8, 5);
  g.lineTo(w - 4, -2);
  g.stroke();
};

const armyTruck: Sprite = (g, w, h) => {
  fillRound(g, 2, 4, w - 4, h - 8, 4, '#556b2f', '#33401a');
  fillRound(g, w - 22, 7, 16, h - 14, 3, '#6b8e23');
  fillRound(g, w - 18, 9, 10, h * 0.3, 2, '#90caf9');
  g.strokeStyle = '#33401a';
  g.lineWidth = 1;
  for (let x = 8; x < w - 26; x += 6) {
    g.beginPath();
    g.moveTo(x, 6);
    g.lineTo(x, h - 6);
    g.stroke();
  }
  for (const x of [w * 0.18, w * 0.5, w * 0.82]) ellipse(g, x, h - 4, 5, 2.5, '#212121');
};

const gardenBed: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 3, w - 4, h - 6, 3, '#6d4c41', '#4e342e');
  fillRound(g, 4, 5, w - 8, h - 10, 2, '#5d4037');
  const cols = ['#e91e63', '#ffeb3b', '#ab47bc', '#ff7043', '#f06292'];
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * ((w - 16) / 6);
    ellipse(g, x, h / 2 + 3, 3, 4, '#66bb6a');
    ellipse(g, x, h / 2 - 2, 2.5, 2.5, cols[(i + s.seed) % cols.length]);
  }
};

const rarePlantCase: Sprite = (g, w, h) => {
  fillRound(g, 4, 3, w - 8, h - 6, 4, 'rgba(225,245,254,0.7)', '#81d4fa');
  ellipse(g, w / 2, h - 10, 8, 4, '#6d4c41');
  ellipse(g, w / 2 - 4, h / 2, 4, 7, '#2e7d32');
  ellipse(g, w / 2 + 4, h / 2 - 2, 4, 6, '#43a047');
  ellipse(g, w / 2, h / 2 - 7, 3, 3, '#e040fb');
};

const greenhouseControl: Sprite = (g, w, h, s) => {
  box(g, 5, 3, w - 10, h - 6, '#546e7a', 7);
  fillRound(g, 9, 6, w - 18, 8, 1, '#263238');
  g.fillStyle = s.inUse ? '#4fc3f7' : '#80cbc4';
  g.font = '6px sans-serif';
  g.fillText('24°', 11, 12);
  ellipse(g, w / 2, h - 11, 3, 3, '#ffca28');
};

const flowerTable: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#f8bbd0', 7);
  fillRound(g, 8, 6, 12, 12, 3, '#e1f5fe', '#81d4fa');
  for (let i = 0; i < 5; i++) ellipse(g, 11 + (i % 3) * 3, 6 + Math.floor(i / 3) * 3, 2.5, 2.5, ['#e91e63', '#ffeb3b', '#ff7043', '#ab47bc', '#fafafa'][i]);
  for (let i = 0; i < 6; i++) fillRound(g, 26 + i * 6, 8, 2, 10, 1, '#66bb6a');
  if (s.inUse) fillRound(g, w - 16, 9, 10, 8, 2, '#ffe0b2');
};

const pottingBench: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#8d6e63', 7);
  for (const x of [10, 22, 34]) {
    fillRound(g, x - 4, 9, 9, 8, 2, '#d84315');
    ellipse(g, x, 7, 4, 4, '#66bb6a');
  }
  fillRound(g, w - 22, 6, 16, 12, 2, '#5d4037');
  fillRound(g, w - 10, 13, 6, 2, 1, '#9e9e9e');
};

const robotBench: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#90a4ae', 7);
  const bob = s.inUse ? Math.sin(s.now / 200) : 0;
  fillRound(g, 14, 6 + bob, 14, 11, 3, '#eceff1', '#546e7a');
  ellipse(g, 18, 10 + bob, 2, 2, s.inUse ? '#00e5ff' : '#455a64');
  ellipse(g, 24, 10 + bob, 2, 2, s.inUse ? '#00e5ff' : '#455a64');
  fillRound(g, 19, 2 + bob, 4, 4, 1, '#ff7043');
  for (const x of [w - 26, w - 18]) fillRound(g, x, 8, 5, 9, 1, '#607d8b');
  fillRound(g, w - 10, 10, 6, 3, 1, '#ffca28');
};

const circuitStation: Sprite = (g, w, h, s) => {
  box(g, 2, 4, w - 4, h - 7, '#26a69a', 7);
  fillRound(g, 6, 6, w - 12, 12, 1, '#1b5e20');
  g.strokeStyle = '#ffd54f';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(8, 9);
  g.lineTo(w / 2, 9);
  g.lineTo(w / 2, 15);
  g.lineTo(w - 8, 15);
  g.stroke();
  for (const [x, y] of [[10, 13], [w / 2 + 4, 10], [w - 10, 11]]) fillRound(g, x - 2, y - 1.5, 4, 3, 0.5, '#212121');
  if (s.inUse && Math.floor(s.now / 150) % 2 === 0) ellipse(g, w / 2, 12, 1.8, 1.8, '#fff59d');
};

const testRig: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#78909c', 7);
  fillRound(g, 8, 5, 22, 13, 2, '#455a64');
  const press = s.inUse ? 2 + Math.sin(s.now / 120) * 2 : 0;
  fillRound(g, 15, 3 + press, 8, 4, 1, '#b0bec5');
  fillRound(g, 15, 13, 8, 4, 1, '#ffb300');
  fillRound(g, w - 26, 6, 18, 10, 1, '#263238');
  g.strokeStyle = '#69f0ae';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x < 16; x += 2) g.lineTo(w - 25 + x, 11 + Math.sin(x + s.now / 200) * 3);
  g.stroke();
};

const serverRack: Sprite = (g, w, h, s) => {
  box(g, 4, 1, w - 8, h - 3, '#263238', 6);
  for (let r = 0; r < 5; r++) {
    fillRound(g, 7, 4 + r * 5, w - 14, 3.5, 0.5, '#37474f');
    const on = s.inUse ? Math.floor(s.now / 120 + r * 3) % 3 !== 0 : r % 2 === 0;
    ellipse(g, w - 10, 5.7 + r * 5, 1.2, 1.2, on ? '#69f0ae' : '#1b5e20');
  }
};

const productionPanel: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#37474f', 8);
  fillRound(g, 5, 6, w * 0.45, 10, 1, '#212121');
  g.strokeStyle = '#ffab40';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 4; i++) g.rect(8 + i * 8, 9, 5, 4);
  g.stroke();
  for (let i = 0; i < 6; i++) ellipse(g, w * 0.6 + i * 4, 10, 1.5, 1.5, s.inUse && i === 2 ? '#ff1744' : '#b0bec5');
  fillRound(g, w * 0.6, 14, 18, 3, 1, '#ffab40');
};

const waterTestBench: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#e1f5fe', 7);
  for (let i = 0; i < 5; i++) {
    fillRound(g, 7 + i * 6, 5, 4, 13, 2, 'rgba(255,255,255,0.8)', '#90a4ae');
    fillRound(g, 7 + i * 6, 10, 4, 8, 2, ['#4fc3f7', '#81c784', '#a1887f', '#4dd0e1', '#aed581'][i]);
  }
  fillRound(g, w - 22, 6, 16, 10, 1, '#455a64');
  g.fillStyle = s.inUse ? '#69f0ae' : '#607d8b';
  g.fillRect(w - 20, 8, 12, 4);
};

const seedlingNursery: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 6, 2, '#6d4c41', '#4e342e');
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 8; i++) {
      const x = 7 + i * ((w - 14) / 7);
      const y = 9 + r * 9;
      fillRound(g, x - 2.5, y, 5, 5, 1, '#3e2723');
      ellipse(g, x - 1.5, y - 1, 2, 1.3, '#7cb342');
      ellipse(g, x + 1.5, y - 1.5, 2, 1.3, '#9ccc65');
    }
};

const specimenTank: Sprite = (g, w, h, s) => {
  box(g, 3, 3, w - 6, h - 6, '#0277bd', 6);
  fillRound(g, 6, 5, w - 12, h - 14, 2, '#4fc3f7');
  const t = s.now / 900;
  ellipse(g, w / 2 + Math.sin(t) * 6, h * 0.35, 3, 2, '#ff7043');
  ellipse(g, w / 2 + Math.cos(t * 1.3) * 5, h * 0.5, 2.5, 1.6, '#ffee58');
  fillRound(g, 8, h - 13, 4, 6, 1, '#66bb6a');
};

const recycleStation: Sprite = (g, w, h) => {
  for (const [i, c] of [[0, '#1e88e5'], [1, '#43a047'], [2, '#fdd835']] as Array<[number, string]>) {
    const x = 3 + i * ((w - 6) / 3);
    box(g, x, 4, (w - 6) / 3 - 2, h - 7, c, 7, 2);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.font = '8px sans-serif';
    g.fillText('♻', x + 6, 14);
  }
};

const ecoJeep: Sprite = (g, w, h) => {
  fillRound(g, 3, 4, w - 6, h - 8, 5, '#689f38', '#33691e');
  fillRound(g, w * 0.55, 7, w * 0.3, h * 0.38, 3, '#b3e5fc', '#455a64');
  g.strokeStyle = '#33691e';
  g.lineWidth = 1.5;
  g.strokeRect(8, 8, w * 0.35, h * 0.35);
  ellipse(g, w * 0.3, h * 0.45, 3, 3, '#fff');
  ellipse(g, w * 0.3, h * 0.45, 1.8, 1.8, '#43a047');
  for (const x of [w * 0.2, w * 0.8]) ellipse(g, x, h - 4, 5, 2.5, '#212121');
};

const materialLibrary: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#d7ccc8', 6);
  const sw = ['#a1887f', '#90a4ae', '#ffcc80', '#c5e1a5', '#ef9a9a', '#b39ddb', '#80cbc4', '#fff59d'];
  for (let i = 0; i < 8; i++) fillRound(g, 6 + (i % 4) * 7, 5 + Math.floor(i / 4) * 11, 6, 9, 1, sw[i], 'rgba(0,0,0,0.15)');
};

const moodBoard: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 10, 2, '#efebe9', '#a1887f');
  const cols = ['#ffab91', '#80cbc4', '#fff59d', '#ce93d8', '#a5d6a7', '#90caf9'];
  for (let i = 0; i < 6; i++) fillRound(g, 6 + (i % 3) * ((w - 12) / 3), 5 + Math.floor(i / 3) * 9, (w - 12) / 3 - 3, 7, 1, cols[i]);
  fillRound(g, 4, h - 7, w - 8, 2, 1, '#8d6e63');
};

const sampleTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#bcaaa4', 7);
  for (let i = 0; i < 6; i++) fillRound(g, 6 + i * 11, 7 + (i % 2) * 3, 9, 8, 1, ['#e57373', '#ffd54f', '#81c784', '#64b5f6', '#ba68c8', '#a1887f'][i]);
};

const showroomSet: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 4, 3, '#efebe9', '#bcaaa4');
  fillRound(g, 10, 8, 40, 16, 5, '#80cbc4', '#4db6ac');
  fillRound(g, 12, 6, 36, 6, 3, '#4db6ac');
  ellipse(g, w - 34, h / 2, 12, 9, '#d7ccc8');
  ellipse(g, w - 34, h / 2, 6, 4, '#a1887f');
  fillRound(g, w - 18, 10, 10, 30, 2, '#8d6e63');
  ellipse(g, w - 13, 8, 5, 5, s.night > 0.3 || s.inUse ? '#fff59d' : '#ffe082');
  fillRound(g, 14, h - 30, 50, 22, 4, 'rgba(255,171,145,0.5)');
};

const decorVan: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 5, w - 6, h - 9, 6, '#ffab91', '#bf360c');
  fillRound(g, w - 22, 8, 16, h * 0.32, 3, '#90caf9', '#455a64');
  ellipse(g, w * 0.32, h * 0.5, 6, 4, '#fafafa');
  ellipse(g, w * 0.32, h * 0.5, 3, 2, '#bf360c');
  fillRound(g, w / 2 - 5, 3, 10, 3, 1, s.inUse ? '#ffeb3b' : '#ff7043');
  for (const x of [w * 0.2, w * 0.8]) ellipse(g, x, h - 4, 5, 2.5, '#212121');
};

const officeDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#b0bec5', 8);
  fillRound(g, 6, 1, w - 14, 9, 1.5, '#263238');
  g.fillStyle = s.inUse ? '#e3f2fd' : '#37474f';
  g.fillRect(8, 2.5, w - 18, 6);
  if (s.inUse) {
    g.fillStyle = '#43a047';
    for (let i = 0; i < 3; i++) g.fillRect(9 + i * 5, 3.5, 4, 4);
  }
  fillRound(g, w - 9, 4, 6, 8, 1, '#fafafa', '#bdbdbd');
  ellipse(g, 9, h * 0.68, 3, 2.5, '#6d4c41');
};

const copier: Sprite = (g, w, h, s) => {
  box(g, 3, 3, w - 6, h - 6, '#cfd8dc', 9);
  fillRound(g, 7, 5, w - 14, 7, 1, '#455a64');
  fillRound(g, 8, h - 15, w - 16, 3, 1, '#fafafa');
  if (s.inUse) {
    g.fillStyle = `rgba(178,255,89,${0.5 + 0.5 * Math.sin(s.now / 80)})`;
    g.fillRect(8, 7, w - 16, 2);
  }
  ellipse(g, w - 9, h - 10, 1.8, 1.8, '#66bb6a');
};

const projector: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 2, w - 6, 8, 1, '#fafafa', '#9e9e9e');
  fillRound(g, w / 2 - 7, h - 16, 14, 9, 2, '#37474f');
  ellipse(g, w / 2, h - 12, 3, 3, s.inUse ? '#fff59d' : '#607d8b');
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,200,0.25)';
    g.beginPath();
    g.moveTo(w / 2 - 2, h - 14);
    g.lineTo(5, 9);
    g.lineTo(w - 5, 9);
    g.closePath();
    g.fill();
  }
};

const memorialAltar: Sprite = (g, w, h, s) => {
  box(g, 2, 4, w - 4, h - 7, '#fafafa', 9);
  fillRound(g, w / 2 - 9, 3, 18, 13, 1, '#212121', '#bdbdbd');
  fillRound(g, w / 2 - 6, 5, 12, 9, 1, '#9e9e9e');
  for (const x of [w * 0.15, w * 0.25, w * 0.75, w * 0.85]) {
    ellipse(g, x, 12, 4, 4, '#fafafa');
    ellipse(g, x, 11, 2.5, 2.5, '#fff59d');
  }
  for (const x of [w * 0.38, w * 0.62]) {
    fillRound(g, x - 1, 8, 2, 7, 0.5, '#fffde7');
    ellipse(g, x, 7 + (s.inUse ? Math.sin(s.now / 160 + x) * 0.5 : 0), 1.3, 2, '#ffb300');
  }
};

const wreathStand: Sprite = (g, w, h) => {
  g.strokeStyle = '#757575';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(w / 2, h * 0.55);
  g.lineTo(w / 2 - 7, h - 3);
  g.moveTo(w / 2, h * 0.55);
  g.lineTo(w / 2 + 7, h - 3);
  g.stroke();
  g.strokeStyle = '#eceff1';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(w / 2, h * 0.35, 9, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ellipse(g, w / 2 + Math.cos(a) * 9, h * 0.35 + Math.sin(a) * 9, 1.6, 1.6, i % 2 ? '#fff9c4' : '#fafafa');
  }
};

const prepTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#b0bec5', 7);
  fillRound(g, 8, 6, w - 16, h - 16, 4, '#8d6e63', '#5d4037');
  fillRound(g, 11, 8, w - 22, h - 20, 3, '#a1887f');
  ellipse(g, w / 2, h / 2 - 1, 4, 2, '#ffd54f');
};

const funeralDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#4e342e', 8);
  fillRound(g, 5, 7, 12, 9, 1, '#fafafa', '#bdbdbd');
  fillRound(g, w - 12, 6, 2, 9, 1, '#fffde7');
  ellipse(g, w - 11, 5.5, 1.3, 2, '#ffb300');
  ellipse(g, w - 7, 13, 3, 3, '#eceff1');
};

const karaoke: Sprite = (g, w, h, s) => {
  box(g, 4, 6, w - 8, h - 9, '#7e57c2', 8);
  fillRound(g, 7, 2, w - 14, 9, 1.5, '#212121');
  g.fillStyle = s.inUse ? `hsl(${(s.now / 10) % 360},80%,60%)` : '#4527a0';
  g.fillRect(9, 3.5, w - 18, 6);
  ellipse(g, 11, h * 0.62, 3, 3, '#212121');
  ellipse(g, w - 11, h * 0.62, 3, 3, '#212121');
  fillRound(g, w / 2 - 2, h * 0.55, 4, 9, 2, '#bdbdbd');
};

const djBooth: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#212121', 9);
  for (const x of [w * 0.25, w * 0.75]) {
    ellipse(g, x, h * 0.42, 8, 8, '#424242');
    ellipse(g, x, h * 0.42, 6, 6, '#111');
    const a = s.inUse ? s.now / 150 : 0;
    g.strokeStyle = '#bdbdbd';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, h * 0.42);
    g.lineTo(x + Math.cos(a) * 6, h * 0.42 + Math.sin(a) * 6);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) fillRound(g, w / 2 - 6 + i * 3, 9, 2, 8, 1, s.inUse && Math.floor(s.now / 120 + i) % 2 ? '#00e5ff' : '#616161');
};

const clubSpeaker: Sprite = (g, w, h, s) => {
  box(g, 5, 2, w - 10, h - 4, '#212121', 6);
  const pulse = s.now ? 1 + Math.max(0, Math.sin(s.now / 90)) * 0.4 : 1;
  ellipse(g, w / 2, h * 0.32, 6, 6, '#424242');
  ellipse(g, w / 2, h * 0.32, 3 * pulse, 3 * pulse, '#757575');
  ellipse(g, w / 2, h * 0.65, 4, 4, '#424242');
};

const recordCrate: Sprite = (g, w, h) => {
  box(g, 5, 6, w - 10, h - 9, '#8d6e63', 6);
  for (let i = 0; i < 6; i++) fillRound(g, 8 + i * 4, 3, 3, 14, 0.5, ['#e91e63', '#212121', '#ffeb3b', '#212121', '#00bcd4', '#212121'][i]);
};

const danceMirror: Sprite = (g, w, h) => {
  fillRound(g, 2, 2, w - 4, h - 10, 2, '#e1f5fe', '#90a4ae');
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.moveTo(10, 4);
  g.lineTo(18, 4);
  g.lineTo(8, h - 12);
  g.lineTo(4, h - 12);
  g.closePath();
  g.fill();
  fillRound(g, 4, h - 8, w - 8, 3, 1, '#b0bec5');
};

const balletBarre: Sprite = (g, w, h) => {
  g.strokeStyle = '#8d6e63';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(4, h / 2);
  g.lineTo(w - 4, h / 2);
  g.stroke();
  for (const x of [8, w / 2, w - 8]) {
    g.fillStyle = '#9e9e9e';
    g.fillRect(x - 1, h / 2, 2, h / 2 - 3);
  }
};

const performStage: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 6, 4, '#4a148c', '#311b92');
  fillRound(g, 6, 6, w - 12, h - 16, 3, '#6a1b9a');
  fillRound(g, 2, 2, w - 4, 6, 2, '#b71c1c');
  for (const x of [10, w / 2, w - 10]) {
    g.fillStyle = s.inUse ? 'rgba(255,255,200,0.35)' : 'rgba(255,255,200,0.12)';
    g.beginPath();
    g.ellipse(x, h * 0.55, 10, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  fillRound(g, 4, h - 6, w - 8, 3, 1, '#ffd54f');
};

const concertStage: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 6, 4, '#212121', '#424242');
  fillRound(g, 6, 6, w - 12, h - 16, 3, '#311b92');
  g.fillStyle = '#bdbdbd';
  g.fillRect(w / 2 - 1, h * 0.35, 2, h * 0.3);
  ellipse(g, w / 2, h * 0.33, 3, 3, '#757575');
  for (let i = 0; i < 6; i++) ellipse(g, 8 + i * ((w - 16) / 5), 5, 2.2, 2.2, s.inUse ? ['#ff1744', '#ffea00', '#00e5ff'][i % 3] : '#616161');
  fillRound(g, 4, h - 6, w - 8, 3, 1, '#7c4dff');
};

const vocalPiano: Sprite = (g, w, h) => {
  box(g, 2, 3, w - 4, h - 6, '#212121', 8);
  fillRound(g, 4, h * 0.55, w - 8, 7, 1, '#fafafa');
  g.fillStyle = '#212121';
  for (let x = 7; x < w - 6; x += 4) g.fillRect(x, h * 0.55, 2, 4);
  fillRound(g, w / 2 - 6, 6, 12, 7, 1, '#fffde7');
};

const recordingMic: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h - 5, 7, 3, '#424242');
  g.fillStyle = '#757575';
  g.fillRect(w / 2 - 1, 12, 2, h - 17);
  fillRound(g, w / 2 - 5, 3, 10, 12, 5, '#9e9e9e', '#616161');
  ellipse(g, w / 2, 9, 9, 9, 'rgba(33,33,33,0.15)');
  if (s.inUse) ellipse(g, w / 2 + 7, 4, 2, 2, '#ff1744');
};

const mixingConsole: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#263238', 8);
  for (let i = 0; i < 12; i++) {
    const x = 6 + i * ((w - 12) / 11);
    g.fillStyle = '#455a64';
    g.fillRect(x - 0.5, 7, 1, 10);
    const y = 8 + ((i * 7 + (s.inUse ? Math.floor(s.now / 200) : 0)) % 8);
    fillRound(g, x - 2, y, 4, 2, 0.5, '#eceff1');
  }
};

const lyricDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 6, 7, 13, 10, 1, '#fffde7', '#bcaaa4');
  g.strokeStyle = '#7e57c2';
  g.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(8, 10 + i * 2.5);
    g.quadraticCurveTo(12, 8 + i * 2.5, 17, 10 + i * 2.5);
    g.stroke();
  }
  fillRound(g, w - 11, 8, 2, 9, 1, '#212121');
};

const diplomatDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#5d4037', 8);
  fillRound(g, 5, 7, 13, 10, 1, '#fffde7', '#bcaaa4');
  g.fillStyle = '#c62828';
  g.fillRect(6, 8, 4, 2.5);
  g.fillStyle = '#1565c0';
  g.fillRect(6, 10.5, 4, 2.5);
  fillRound(g, w - 12, 6, 2, 10, 1, '#9e9e9e');
  fillRound(g, w - 10, 6, 7, 5, 0.5, '#43a047');
};

const negotiationTable: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 3, w - 4, h - 6, 8, '#4e342e', '#3e2723');
  for (let i = 0; i < 3; i++) {
    const x = w * (0.2 + i * 0.3);
    fillRound(g, x - 6, 7, 12, 8, 1, '#fafafa', '#bdbdbd');
    ellipse(g, x, 19, 2, 2, s.inUse ? '#ffd54f' : '#9e9e9e');
  }
  for (const [x, c] of [[w / 2 - 4, '#c62828'], [w / 2 + 4, '#1565c0']] as Array<[number, string]>) {
    g.fillStyle = '#bdbdbd';
    g.fillRect(x - 0.5, 2, 1, 6);
    fillRound(g, x, 2, 5, 3, 0.5, c);
  }
};

const flagStand: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h - 5, 6, 3, '#9e9e9e');
  g.fillStyle = '#bdbdbd';
  g.fillRect(w / 2 - 1, 3, 2, h - 8);
  const wave = Math.sin(s.now / 350 + s.seed) * 1.2;
  // Only flags that stand for no other country: Korea's, and the UN's at a meeting table.
  (s.seed % 2 ? unFlag : taegukgi)(g, w / 2 + 1, 4 + wave, 14, 9);
};

const receptionBuffet: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 6, 3, '#fafafa', '#bdbdbd');
  for (let i = 0; i < 5; i++) ellipse(g, 9 + i * ((w - 18) / 4), h / 2, 4.5, 3.5, ['#ffcc80', '#a5d6a7', '#ef9a9a', '#fff59d', '#ce93d8'][i]);
  for (let i = 0; i < 3; i++) fillRound(g, 10 + i * 22, 4, 2, 5, 1, 'rgba(255,224,130,0.8)');
};

const gamingRig: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#212121', 8);
  fillRound(g, 3, 1, w - 6, 10, 1.5, '#000');
  if (s.inUse) {
    g.fillStyle = `hsl(${(s.now / 8) % 360},90%,55%)`;
    g.fillRect(5, 2.5, w - 10, 7);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(w - 13, 3, 6, 5);
  } else {
    g.fillStyle = '#263238';
    g.fillRect(5, 2.5, w - 10, 7);
  }
  fillRound(g, 6, h * 0.56, w - 18, 4, 1, '#ff1744');
  ellipse(g, w - 8, h * 0.6, 2.5, 3, '#00e5ff');
};

const mukbangTable: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#ffcc80', 7);
  ellipse(g, w * 0.3, h / 2, 8, 6, '#fafafa');
  ellipse(g, w * 0.3, h / 2, 6, 4, '#ff7043');
  ellipse(g, w * 0.6, h / 2, 6, 5, '#fafafa');
  ellipse(g, w * 0.6, h / 2, 4, 3, '#ffd54f');
  fillRound(g, w - 14, 4, 8, 10, 2, '#212121');
  ellipse(g, w - 10, 8, 2.5, 2.5, s.inUse ? '#ff1744' : '#455a64');
};

const greenScreen: Sprite = (g, w, h) => {
  fillRound(g, 3, 2, w - 6, h - 6, 1, '#00c853', '#1b5e20');
  g.strokeStyle = '#9e9e9e';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(3, 2);
  g.lineTo(w - 3, 2);
  g.stroke();
};

const climbingWall: Sprite = (g, w, h) => {
  fillRound(g, 1, 1, w - 2, h - 4, 2, '#8d6e63', '#5d4037');
  const cols = ['#ff1744', '#ffea00', '#00e676', '#2979ff', '#d500f9'];
  for (let i = 0; i < 14; i++) ellipse(g, 5 + ((i * 37) % (w - 10)), 5 + ((i * 13) % (h - 12)), 2.2, 1.8, cols[i % cols.length]);
};

const skateRamp: Sprite = (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#78909c');
  grd.addColorStop(0.5, '#cfd8dc');
  grd.addColorStop(1, '#78909c');
  g.fillStyle = grd;
  g.fillRect(3, 3, w - 6, h - 6);
  g.strokeStyle = '#455a64';
  g.lineWidth = 2;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = '#ff5722';
  g.fillRect(3, h / 2 - 1, w - 6, 2);
};

const windTunnel: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 3, w - 6, h - 6, 10, 'rgba(129,212,250,0.5)', '#0277bd');
  const t = s.inUse ? s.now / 80 : 0;
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = ((i * 12 + t) % (h - 12)) + 6;
    g.beginPath();
    g.moveTo(12, y);
    g.quadraticCurveTo(w / 2, y - 4, w - 12, y);
    g.stroke();
  }
};

const gearBench: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#6d4c41', 7);
  fillRound(g, 6, 6, 22, 12, 3, '#ff7043', '#bf360c');
  g.strokeStyle = '#fafafa';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(17, 6);
  g.lineTo(17, 18);
  g.stroke();
  g.strokeStyle = '#ffd54f';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(w - 18, 12, 6, 0, Math.PI * 2);
  g.stroke();
};

const jumpPlane: Sprite = (g, w, h) => {
  fillRound(g, 6, h / 2 - 5, w - 12, 10, 5, '#eceff1', '#78909c');
  fillRound(g, w / 2 - 4, 1, 10, h - 2, 2, '#cfd8dc', '#78909c');
  fillRound(g, w - 8, h / 2 - 3, 5, 6, 2, '#90caf9');
  fillRound(g, 4, h / 2 - 6, 6, 12, 1, '#e53935');
  ellipse(g, w - 3, h / 2, 1.5, 6, '#424242');
};

const meditationMat: Sprite = (g, w, h) => {
  fillRound(g, 3, 4, w - 6, h - 8, 4, '#a5d6a7', '#66bb6a');
  ellipse(g, w / 2, h / 2, 6, 4, '#c8e6c9');
  for (const x of [8, w - 8]) {
    fillRound(g, x - 1, 6, 2, 6, 0.5, '#fffde7');
    ellipse(g, x, 5, 1.2, 1.8, '#ffb300');
  }
};

const sandTray: Sprite = (g, w, h) => {
  box(g, 4, 4, w - 8, h - 8, '#8d6e63', 5);
  fillRound(g, 7, 6, w - 14, h - 15, 2, '#ffe0b2');
  ellipse(g, w / 2 - 4, h / 2 - 2, 2.5, 2.5, '#66bb6a');
  fillRound(g, w / 2 + 2, h / 2 - 4, 4, 4, 0.5, '#ef5350');
  ellipse(g, w / 2, h / 2 + 2, 2, 1.5, '#42a5f5');
};

const notesDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 5, 7, 12, 9, 1, '#fffde7', '#bcaaa4');
  g.fillStyle = '#9e9e9e';
  for (let i = 0; i < 3; i++) g.fillRect(7, 9 + i * 2.2, 8, 0.8);
  ellipse(g, w - 9, 10, 4, 4, '#a5d6a7');
  ellipse(g, w - 9, 9, 2.5, 3, '#66bb6a');
};

const crisisPhone: Sprite = (g, w, h, s) => {
  box(g, 5, 6, w - 10, h - 9, '#ef9a9a', 7);
  fillRound(g, 8, 8, w - 16, 6, 3, '#c62828');
  const ring = s.inUse ? 0 : Math.sin(s.now / 60) * 1.5;
  fillRound(g, 9 + ring, 4, w - 18, 5, 2.5, '#b71c1c');
  ellipse(g, w / 2, h - 10, 2, 2, '#fafafa');
};

const screenplayDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#6d4c41', 8);
  fillRound(g, 4, 6, 14, 11, 1, '#fffde7', '#bcaaa4');
  g.fillStyle = '#424242';
  for (let i = 0; i < 4; i++) g.fillRect(6, 8 + i * 2.2, i % 2 ? 6 : 10, 0.8);
  fillRound(g, w - 13, 7, 9, 6, 1, '#37474f');
  ellipse(g, w - 8, h * 0.68, 3, 2.5, '#5d4037');
};

const storyboardWall: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 10, 2, '#fafafa', '#8d6e63');
  for (let i = 0; i < 6; i++) {
    const x = 6 + (i % 3) * ((w - 12) / 3);
    const y = 5 + Math.floor(i / 3) * 9;
    fillRound(g, x, y, (w - 12) / 3 - 3, 7, 0.5, '#eceff1', '#9e9e9e');
    ellipse(g, x + 5, y + 3.5, 1.5, 1.5, '#616161');
  }
};

const editingSuite: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#263238', 8);
  for (const x of [4, w / 2 + 1]) {
    fillRound(g, x, 1, w / 2 - 5, 9, 1, '#000');
    g.fillStyle = s.inUse ? '#ffb74d' : '#37474f';
    g.fillRect(x + 1.5, 2.5, w / 2 - 8, 6);
  }
  if (s.inUse) {
    g.fillStyle = '#4fc3f7';
    g.fillRect(w / 2 + 3, 4, ((s.now / 30) % (w / 2 - 12)) + 1, 1.5);
  }
  fillRound(g, 8, h * 0.58, w - 16, 4, 1, '#546e7a');
};

const screeningScreen: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 8, 1, s.inUse ? '#fff8e1' : '#eceff1', '#424242');
  if (s.inUse) {
    ellipse(g, w * 0.35, h * 0.4, 6, 4, '#90caf9');
    ellipse(g, w * 0.65, h * 0.35, 4, 3, '#ffcc80');
  }
  fillRound(g, 4, h - 6, w - 8, 3, 1, '#b71c1c');
};

const catwalk: Sprite = (g, w, h, s) => {
  fillRound(g, 1, 3, w - 2, h - 6, 2, '#fafafa', '#bdbdbd');
  for (let x = 8; x < w - 6; x += 12) ellipse(g, x, h / 2, 2, 2, s.inUse ? '#fff176' : '#e0e0e0');
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.fillRect(2, h / 2 - 0.5, w - 4, 1);
};

const posingSpot: Sprite = (g, w, h) => {
  fillRound(g, 3, 2, w - 6, h - 6, 2, '#e0e0e0', '#9e9e9e');
  const grd = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(3, 2, w - 6, h - 6);
  ellipse(g, w / 2, h - 7, 6, 2, '#ff80ab');
};

const wardrobeRack: Sprite = (g, w, h) => {
  g.strokeStyle = '#9e9e9e';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(4, 5);
  g.lineTo(w - 4, 5);
  g.stroke();
  const cols = ['#e91e63', '#3f51b5', '#212121', '#fafafa', '#ff9800', '#009688', '#9c27b0'];
  for (let i = 0; i < 7; i++) fillRound(g, 6 + i * ((w - 14) / 6) - 3, 6, 6, h - 12, 2, cols[i], 'rgba(0,0,0,0.2)');
};

const toyWorkbench: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#a1887f', 7);
  fillRound(g, 8, 7, 12, 8, 2, '#d7ccc8');
  ellipse(g, 10, 15, 2, 2, '#5d4037');
  ellipse(g, 18, 15, 2, 2, '#5d4037');
  fillRound(g, 26, 6, 8, 10, 1, '#ef5350');
  ellipse(g, 30, 5, 3, 3, '#ffd54f');
  for (const [x, c] of [[w - 20, '#e53935'], [w - 15, '#1e88e5'], [w - 10, '#fdd835']] as Array<[number, string]>) ellipse(g, x, 12, 2, 2, c);
  if (s.inUse) fillRound(g, w - 26, 16, 10, 2, 1, '#bcaaa4');
};

const plushTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#f8bbd0', 7);
  ellipse(g, 16, 13, 6, 5, '#a1887f');
  ellipse(g, 16, 7, 4, 4, '#a1887f');
  ellipse(g, 13, 4, 1.8, 1.8, '#a1887f');
  ellipse(g, 19, 4, 1.8, 1.8, '#a1887f');
  ellipse(g, 36, 12, 5, 4, '#fafafa');
  ellipse(g, 36, 7, 3.5, 3.5, '#fafafa');
  fillRound(g, w - 18, 7, 12, 8, 2, '#ce93d8');
};

const playtestMat: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 6, 4, '#81d4fa', '#29b6f6');
  for (let i = 0; i < 4; i++) fillRound(g, 6 + i * 13, 6 + (i % 2) * 6, 8, 8, 1, ['#ef5350', '#ffeb3b', '#66bb6a', '#ab47bc'][i]);
  ellipse(g, w - 10, h / 2, 4, 4, '#ff7043');
};

const wrapStation: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#ef9a9a', 7);
  for (let i = 0; i < 3; i++) {
    const x = 7 + i * 13;
    fillRound(g, x, 6, 10, 10, 1, ['#e53935', '#43a047', '#1e88e5'][i]);
    g.fillStyle = '#ffd54f';
    g.fillRect(x + 4, 6, 2, 10);
    g.fillRect(x, 10, 10, 2);
  }
  fillRound(g, w - 18, 7, 12, 8, 4, '#fafafa');
  if (s.inUse) ellipse(g, w - 12, 11, 2, 2, '#ffd54f');
};

const toyShelf: Sprite = (g, w, h, s) => {
  box(g, 3, 2, w - 6, h - 4, '#ffcc80', 6);
  const cols = ['#ef5350', '#42a5f5', '#66bb6a', '#ffee58', '#ab47bc', '#ff7043'];
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) ellipse(g, 10 + i * 10, 8 + r * 12, 3.5, 3.5, cols[(i + r * 3 + s.seed) % cols.length]);
};

const bakeryOven: Sprite = (g, w, h, s) => {
  box(g, 2, 2, w - 4, h - 4, '#8d6e63', 8);
  fillRound(g, 7, 6, w - 14, 12, 4, '#3e2723');
  fillRound(g, 9, 8, w - 18, 8, 3, s.inUse ? `rgba(255,152,0,${0.6 + 0.3 * Math.sin(s.now / 200)})` : '#4e342e');
  ellipse(g, w / 2, 12, 5, 2.5, '#d7a86e');
};

const doughTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#d7ccc8', 7);
  ellipse(g, 16, 12, 9, 6, '#fff3e0');
  fillRound(g, 30, 9, 18, 4, 2, '#a1887f');
  ellipse(g, w - 12, 12, 5, 4, '#ffe0b2');
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.fillRect(6, 6, 10, 1);
};

const decorTable: Sprite = (g, w, h, s) => {
  box(g, 1, 3, w - 2, h - 6, '#fce4ec', 7);
  ellipse(g, 18, 13, 9, 6, '#fafafa');
  ellipse(g, 18, 10, 9, 6, '#f8bbd0');
  for (let i = 0; i < 5; i++) ellipse(g, 12 + i * 3, 8, 1.3, 1.3, ['#e53935', '#fafafa', '#fdd835', '#43a047', '#fafafa'][i]);
  fillRound(g, w - 22, 7, 5, 11, 2, '#ffffff', '#bdbdbd');
  if (s.inUse) fillRound(g, w - 15, 9, 10, 3, 1, '#ff80ab');
};

const displayCase: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#fff8e1', 8);
  fillRound(g, 4, 5, w - 8, 12, 2, 'rgba(225,245,254,0.6)', '#90a4ae');
  for (let i = 0; i < 7; i++) ellipse(g, 9 + i * ((w - 18) / 6), 11, 3.5, 2.5, ['#d7a86e', '#c58b4d', '#f8bbd0', '#ffe082', '#d7a86e', '#a1887f', '#ffcc80'][i]);
};

const dentalChair: Sprite = (g, w, h, s) => {
  fillRound(g, 6, 4, w - 12, h - 10, 8, '#4dd0e1', '#00838f');
  fillRound(g, 9, 6, w - 18, 14, 6, '#80deea');
  ellipse(g, w - 7, 10, 5, 5, s.inUse ? '#fff59d' : '#eceff1');
  fillRound(g, 3, h * 0.55, 6, 14, 2, '#b0bec5');
};

const sterilizer: Sprite = (g, w, h, s) => {
  box(g, 4, 5, w - 8, h - 9, '#cfd8dc', 8);
  fillRound(g, 8, 8, w - 16, 9, 2, '#455a64');
  ellipse(g, w - 10, h - 10, 2, 2, s.inUse ? '#ff7043' : '#66bb6a');
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(w / 2 - 4, 2, 2, 5);
    g.fillRect(w / 2 + 2, 1, 2, 5);
  }
};

const dentalLabBench: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#e0e0e0', 7);
  for (const x of [12, 26]) {
    ellipse(g, x, 12, 6, 4, '#f8bbd0');
    for (let i = -2; i <= 2; i++) fillRound(g, x + i * 2 - 1, 9, 2, 3, 0.5, '#fafafa');
  }
  fillRound(g, w - 22, 7, 16, 10, 2, '#90a4ae');
};

const dispensingTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#eceff1', 7);
  for (let i = 0; i < 6; i++) fillRound(g, 6 + i * 6, 6, 4, 9, 1.5, ['#ef9a9a', '#90caf9', '#fff59d', '#a5d6a7', '#ce93d8', '#ffcc80'][i]);
  fillRound(g, w - 22, 7, 16, 9, 1, '#fafafa', '#bdbdbd');
  ellipse(g, w - 14, 11, 3, 2, '#e53935');
};

const pharmacyShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#e8f5e9', 6);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) fillRound(g, 6 + i * 7, 4 + r * 8, 5, 6, 1, ['#ef9a9a', '#80deea', '#fff176', '#ffffff'][(i + r) % 4], 'rgba(0,0,0,0.15)');
};

const pharmacyCounter: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#a5d6a7', 9);
  fillRound(g, 6, 7, 12, 8, 1, '#263238');
  g.fillStyle = '#66bb6a';
  g.fillRect(w - 18, 7, 3, 9);
  g.fillRect(w - 21, 10, 9, 3);
};

const tellerWindow: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#90a4ae', 9);
  fillRound(g, 4, 2, w - 8, 8, 1, 'rgba(225,245,254,0.7)', '#78909c');
  fillRound(g, 8, h * 0.55, 12, 4, 1, s.inUse ? '#a5d6a7' : '#cfd8dc');
  ellipse(g, w - 9, h * 0.62, 3, 2, '#ffd54f');
};

const loanDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#6d4c41', 8);
  fillRound(g, 5, 6, 12, 10, 1, '#fafafa', '#bdbdbd');
  g.fillStyle = '#1565c0';
  g.fillRect(7, 8, 8, 1.5);
  fillRound(g, w - 13, 6, 9, 7, 1, '#37474f');
  ellipse(g, w - 8, h * 0.7, 2, 2, '#ffd54f');
};

const tradingTerminal: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#263238', 8);
  fillRound(g, 3, 1, w - 6, 10, 1, '#000');
  g.strokeStyle = s.inUse ? '#69f0ae' : '#2e7d32';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x < w - 10; x += 3) g.lineTo(5 + x, 7 - Math.sin(x / 3 + (s.inUse ? s.now / 300 : 0)) * 2 - x * 0.08);
  g.stroke();
};

const vaultDoor: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 6, 3, '#9e9e9e', '#616161');
  ellipse(g, w / 2, h / 2 - 2, 10, 10, '#bdbdbd');
  ellipse(g, w / 2, h / 2 - 2, 6, 6, '#757575');
  g.strokeStyle = '#eceff1';
  g.lineWidth = 2;
  g.beginPath();
  const a = s.inUse ? s.now / 400 : 0;
  for (let i = 0; i < 3; i++) {
    g.moveTo(w / 2, h / 2 - 2);
    g.lineTo(w / 2 + Math.cos(a + (i * Math.PI * 2) / 3) * 8, h / 2 - 2 + Math.sin(a + (i * Math.PI * 2) / 3) * 8);
  }
  g.stroke();
};

const vipDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#4e342e', 8);
  fillRound(g, 5, 7, 11, 8, 1, '#ffe082', '#c8a24a');
  ellipse(g, w - 9, 10, 3.5, 3.5, '#a5d6a7');
  fillRound(g, w - 10, 13, 3, 3, 0.5, '#6d4c41');
};

const accountingDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 4, 1, w - 16, 9, 1, '#212121');
  g.fillStyle = s.inUse ? '#e8f5e9' : '#37474f';
  g.fillRect(6, 2.5, w - 20, 6);
  if (s.inUse) {
    g.fillStyle = '#66bb6a';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.fillRect(7 + c * 4, 3 + r * 2, 3, 1);
  }
  fillRound(g, w - 11, 6, 8, 11, 1, '#455a64');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) ellipse(g, w - 8.5 + c * 3, 10 + r * 2.4, 0.9, 0.9, '#eceff1');
};

const shredder: Sprite = (g, w, h, s) => {
  box(g, 6, 6, w - 12, h - 10, '#616161', 10);
  fillRound(g, 9, 6, w - 18, 3, 1, '#212121');
  if (s.inUse) for (let i = 0; i < 4; i++) fillRound(g, 10 + i * 4, 10 + ((s.now / 60 + i * 3) % 8), 1.5, 4, 0.5, '#fafafa');
};

const realtorDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 5, 6, 12, 10, 1, '#fafafa', '#bdbdbd');
  g.fillStyle = '#e53935';
  g.beginPath();
  g.moveTo(w - 11, 10);
  g.lineTo(w - 6, 5);
  g.lineTo(w - 1, 10);
  g.closePath();
  g.fill();
  fillRound(g, w - 10, 10, 8, 6, 0.5, '#ffe082');
};

const listingBoard: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 10, 2, '#d7ccc8', '#8d6e63');
  for (let i = 0; i < 6; i++) {
    const x = 6 + (i % 3) * ((w - 12) / 3);
    const y = 5 + Math.floor(i / 3) * 9;
    fillRound(g, x, y, (w - 12) / 3 - 3, 7, 0.5, '#fafafa');
    ellipse(g, x + 3, y + 3, 1.5, 1.5, ['#e53935', '#43a047', '#1e88e5'][i % 3]);
  }
};

const realtorCar: Sprite = (g, w, h) => {
  fillRound(g, 3, 5, w - 6, h - 9, 7, '#90a4ae', '#455a64');
  fillRound(g, w * 0.3, 8, w * 0.4, h * 0.3, 4, '#b3e5fc', '#455a64');
  for (const x of [w * 0.2, w * 0.8]) ellipse(g, x, h - 4, 5, 2.5, '#212121');
};

const carLift: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 4, 3, '#78909c', '#455a64');
  const lift = s.inUse ? 2 : 0;
  fillRound(g, 7, 8 - lift, w - 14, h - 18, 8, '#e53935', '#8e0000');
  fillRound(g, 10, 14 - lift, w - 20, 16, 3, '#90caf9');
  for (const y of [14, h - 18]) {
    fillRound(g, 4, y, 4, 8, 1, '#212121');
    fillRound(g, w - 8, y, 4, 8, 1, '#212121');
  }
  fillRound(g, 3, h / 2 - 2, w - 6, 3, 1, '#ffd54f');
};

const diagnosticComputer: Sprite = (g, w, h, s) => {
  box(g, 4, 6, w - 8, h - 9, '#263238', 8);
  fillRound(g, 6, 1, w - 12, 10, 1, '#000');
  g.fillStyle = s.inUse ? '#69f0ae' : '#1b5e20';
  for (let i = 0; i < 3; i++) g.fillRect(8, 3 + i * 2.5, (w - 16) * (0.4 + 0.2 * ((i + (s.inUse ? Math.floor(s.now / 300) : 0)) % 3)), 1.2);
  fillRound(g, w / 2 - 2, h - 9, 4, 6, 1, '#ffd54f');
};

const toolWall: Sprite = (g, w, h) => {
  fillRound(g, 2, 2, w - 4, h - 8, 1, '#b71c1c', '#7f0000');
  for (let i = 0; i < 6; i++) fillRound(g, 6 + i * ((w - 12) / 5), 5, 2, 10 + (i % 3) * 2, 1, '#cfd8dc');
  ellipse(g, w - 10, h - 12, 4, 3, '#9e9e9e');
};

const partsShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#607d8b', 6);
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 3; i++) {
      ellipse(g, 9 + i * 10, 8 + r * 12, 4, 4, '#212121');
      ellipse(g, 9 + i * 10, 8 + r * 12, 1.8, 1.8, '#9e9e9e');
    }
};

const cropField: Sprite = (g, w, h, s) => {
  fillRound(g, 1, 3, w - 2, h - 6, 2, '#6d4c41', '#4e342e');
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * ((w - 12) / 8);
    ellipse(g, x, h / 2, 4, 5, ['#66bb6a', '#43a047', '#7cb342'][(i + s.seed) % 3]);
    if ((i + s.seed) % 4 === 0) ellipse(g, x + 1, h / 2 - 2, 1.6, 1.6, '#ff7043');
  }
};

const tractor: Sprite = (g, w, h) => {
  fillRound(g, 10, 10, w - 20, h - 24, 5, '#c62828', '#7f0000');
  fillRound(g, w / 2 - 8, 6, 16, 14, 2, '#b3e5fc', '#455a64');
  ellipse(g, 12, h - 12, 9, 9, '#212121');
  ellipse(g, 12, h - 12, 4, 4, '#ffd54f');
  ellipse(g, w - 13, h - 9, 6, 6, '#212121');
  ellipse(g, w - 13, h - 9, 2.5, 2.5, '#ffd54f');
  fillRound(g, w - 18, 4, 3, 10, 1, '#424242');
};

const packingTable: Sprite = (g, w, h) => {
  box(g, 1, 3, w - 2, h - 6, '#a1887f', 7);
  for (const x of [8, 28]) {
    fillRound(g, x, 5, 16, 12, 1, '#d7ccc8', '#8d6e63');
    for (let i = 0; i < 3; i++) ellipse(g, x + 4 + i * 4, 10, 2, 2, ['#e53935', '#ff9800', '#66bb6a'][i]);
  }
};

const seedShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#8d6e63', 6);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) fillRound(g, 6 + i * 7, 5 + r * 12, 5, 9, 1, ['#fff59d', '#a5d6a7', '#ffcc80', '#bcaaa4'][(i + r) % 4], '#8d6e63');
};

const farmStand: Sprite = (g, w, h) => {
  box(g, 1, 6, w - 2, h - 9, '#a1887f', 7);
  fillRound(g, 2, 1, w - 4, 6, 2, '#ff8a65');
  for (let i = 0; i < 6; i++) ellipse(g, 8 + i * ((w - 16) / 5), 12, 3.5, 3, ['#e53935', '#ff9800', '#66bb6a', '#fdd835', '#8e24aa', '#ff7043'][i]);
};

const designDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 6, w - 2, h - 9, '#eceff1', 8);
  fillRound(g, 3, 1, w - 6, 11, 1.5, '#cfd8dc');
  if (s.inUse) {
    const grd = g.createLinearGradient(5, 2, w - 5, 10);
    grd.addColorStop(0, '#f48fb1');
    grd.addColorStop(1, '#81d4fa');
    g.fillStyle = grd;
  } else g.fillStyle = '#90a4ae';
  g.fillRect(5, 2.5, w - 10, 8);
  fillRound(g, 7, h * 0.58, 14, 6, 1, '#424242');
  ellipse(g, w - 8, h * 0.62, 2.5, 3, '#fafafa');
};

const largePrinter: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#455a64', 9);
  fillRound(g, 6, 2, w - 12, 4, 1, '#212121');
  if (s.inUse) fillRound(g, 10, 7, w - 20, 8 + ((s.now / 100) % 4), 0.5, '#fafafa');
  ellipse(g, w - 7, h - 10, 1.8, 1.8, '#66bb6a');
};

const drawingTabletDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#eceff1', 8);
  fillRound(g, 4, 1, w - 8, 10, 1, '#212121');
  g.fillStyle = s.inUse ? '#fff8e1' : '#455a64';
  g.fillRect(6, 2.5, w - 12, 7);
  if (s.inUse) {
    g.strokeStyle = '#212121';
    g.lineWidth = 0.6;
    g.strokeRect(7, 3.5, (w - 14) / 2, 5);
    g.strokeRect(8 + (w - 14) / 2, 3.5, (w - 16) / 2, 5);
  }
  fillRound(g, 7, h * 0.55, w - 14, 7, 1.5, '#424242');
  fillRound(g, w - 10, h * 0.5, 2, 9, 1, '#9e9e9e');
};

const plotDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 5, 6, 14, 10, 1, '#fffde7', '#bcaaa4');
  g.fillStyle = '#5c6bc0';
  for (let i = 0; i < 3; i++) g.fillRect(7, 8 + i * 2.5, 9, 1);
  fillRound(g, w - 10, 7, 3, 9, 1, '#e53935');
};

const frontDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#5d4037', 10);
  fillRound(g, 6, 7, 14, 7, 1, '#263238');
  ellipse(g, w - 14, 10, 4, 3, '#ffd54f');
  ellipse(g, w - 14, 9, 1.5, 1.5, s.inUse ? '#fff59d' : '#ffb300');
  fillRound(g, w - 26, 8, 6, 5, 0.5, '#fafafa');
};

const conciergeDesk: Sprite = (g, w, h) => {
  box(g, 3, 5, w - 6, h - 8, '#6d4c41', 9);
  fillRound(g, 7, 7, 12, 8, 1, '#e3f2fd', '#90caf9');
  ellipse(g, w - 9, 10, 2.5, 2.5, '#e53935');
};

const luggageCart: Sprite = (g, w, h) => {
  g.strokeStyle = '#ffd54f';
  g.lineWidth = 2;
  g.strokeRect(6, 4, w - 12, h - 10);
  fillRound(g, 8, 10, 10, 12, 2, '#5d4037');
  fillRound(g, 19, 13, 9, 9, 2, '#1565c0');
  for (const x of [8, w - 8]) ellipse(g, x, h - 4, 2.5, 2.5, '#212121');
};

const hotelBed: Sprite = (g, w, h) => {
  fillRound(g, 3, 2, w - 6, h - 4, 4, '#8d6e63');
  fillRound(g, 5, 4, w - 10, h - 8, 3, '#fafafa');
  fillRound(g, 8, 6, w / 2 - 10, 12, 4, '#eceff1', '#bdbdbd');
  fillRound(g, w / 2 + 2, 6, w / 2 - 10, 12, 4, '#eceff1', '#bdbdbd');
  fillRound(g, 5, h * 0.55, w - 10, 6, 2, '#c8a24a');
};

const minibar: Sprite = (g, w, h) => {
  box(g, 5, 4, w - 10, h - 7, '#4e342e', 9);
  fillRound(g, 8, 7, w - 16, 9, 1, '#212121');
  for (let i = 0; i < 4; i++) fillRound(g, 10 + i * 5, 9, 3, 6, 1, ['#e53935', '#43a047', '#ffd54f', '#1e88e5'][i]);
};

const linenShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#bcaaa4', 6);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) fillRound(g, 7 + i * 14, 4 + r * 8, 12, 6, 2, r % 2 ? '#e3f2fd' : '#fafafa', '#bdbdbd');
};

const tattooChair: Sprite = (g, w, h, s) => {
  fillRound(g, 6, 4, w - 12, h - 10, 8, '#212121', '#000');
  fillRound(g, 9, 6, w - 18, 14, 6, '#424242');
  ellipse(g, w - 6, h * 0.45, 4, 4, s.inUse ? '#fff59d' : '#9e9e9e');
  fillRound(g, 2, h * 0.6, 6, 10, 2, '#b0bec5');
};

const flashWall: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 10, 2, '#fafafa', '#424242');
  for (let i = 0; i < 6; i++) {
    const x = 6 + (i % 3) * ((w - 12) / 3) + 6;
    const y = 7 + Math.floor(i / 3) * 9;
    g.strokeStyle = ['#212121', '#c62828', '#1565c0'][i % 3];
    g.lineWidth = 1;
    g.beginPath();
    if (i % 2) {
      g.arc(x, y, 3, 0, Math.PI * 2);
    } else {
      g.moveTo(x - 3, y + 3);
      g.lineTo(x, y - 3);
      g.lineTo(x + 3, y + 3);
    }
    g.stroke();
  }
};

const talkShowSet: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 8, 3, '#4a148c', '#311b92');
  fillRound(g, 6, 4, w - 12, 10, 2, '#7c4dff');
  fillRound(g, 10, h * 0.5, 20, 10, 3, '#8d6e63');
  fillRound(g, w - 38, h * 0.48, 26, 12, 5, '#d32f2f');
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,220,0.2)';
    g.fillRect(4, 3, w - 8, h - 10);
  }
  ellipse(g, w - 8, 7, 3, 3, s.inUse ? '#ff1744' : '#9e9e9e');
};

const newsDesk: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#1a237e', 9);
  fillRound(g, 4, 6, w - 8, 3, 1, '#90caf9');
  fillRound(g, 8, 10, 12, 6, 1, '#fafafa');
  fillRound(g, w - 20, 10, 12, 6, 1, '#fafafa');
};

const cueCardTable: Sprite = (g, w, h) => {
  box(g, 3, 5, w - 6, h - 8, '#8d6e63', 8);
  for (let i = 0; i < 3; i++) fillRound(g, 7 + i * 2, 7 - i, 12, 8, 1, '#fffde7', '#bdbdbd');
};

const radioBooth: Sprite = (g, w, h, s) => {
  box(g, 1, 4, w - 2, h - 7, '#37474f', 8);
  for (const x of [w * 0.3, w * 0.7]) {
    g.fillStyle = '#9e9e9e';
    g.fillRect(x - 0.5, 4, 1, 8);
    ellipse(g, x, 4, 3, 3, '#616161');
  }
  fillRound(g, w / 2 - 8, 9, 16, 6, 1, '#212121');
  if (s.inUse) fillRound(g, w / 2 - 6, 2, 12, 3, 1, '#ff1744');
};

const missionConsole: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#37474f', 8);
  for (const x of [5, w / 2 + 2]) {
    fillRound(g, x, 1, w / 2 - 7, 9, 1, '#212121');
    g.fillStyle = s.inUse ? '#69f0ae' : '#1b5e20';
    g.fillRect(x + 1.5, 2.5, w / 2 - 10, 6);
  }
  if (s.inUse) {
    g.strokeStyle = '#b9f6ca';
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(7, 7);
    g.lineTo(10, 4);
    g.lineTo(13, 6);
    g.lineTo(16, 3);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) ellipse(g, 7 + i * 6, h * 0.62, 1.2, 1.2, ['#e53935', '#ffd54f', '#43a047', '#1e88e5'][i]);
};

const spacecraftMockup: Sprite = (g, w, h, s) => {
  fillRound(g, 4, 6, w - 16, h - 14, 10, '#eceff1', '#90a4ae');
  g.fillStyle = '#eceff1';
  g.beginPath();
  g.moveTo(w - 12, 6);
  g.lineTo(w - 3, h / 2 - 1);
  g.lineTo(w - 12, h - 8);
  g.closePath();
  g.fill();
  for (let i = 0; i < 3; i++) ellipse(g, 16 + i * 14, h / 2 - 1, 3.5, 3.5, s.inUse ? '#81d4fa' : '#455a64');
  fillRound(g, 6, 2, 12, 4, 1, '#ef6c00');
  fillRound(g, 6, h - 8, 12, 4, 1, '#ef6c00');
};

const centrifuge: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h / 2, w / 2 - 2, h / 2 - 2, '#cfd8dc');
  ellipse(g, w / 2, h / 2, w / 2 - 6, h / 2 - 6, '#eceff1');
  const a = s.inUse ? (s.now / 150) % (Math.PI * 2) : 0.6;
  g.strokeStyle = '#455a64';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(w / 2 - Math.cos(a) * (w / 2 - 7), h / 2 - Math.sin(a) * (h / 2 - 7));
  g.lineTo(w / 2 + Math.cos(a) * (w / 2 - 7), h / 2 + Math.sin(a) * (h / 2 - 7));
  g.stroke();
  ellipse(g, w / 2 + Math.cos(a) * (w / 2 - 7), h / 2 + Math.sin(a) * (h / 2 - 7), 4, 4, '#1565c0');
  ellipse(g, w / 2, h / 2, 2.5, 2.5, '#263238');
};

const spacesuitDisplay: Sprite = (g, w, h) => {
  fillRound(g, w / 2 - 7, h - 6, 14, 4, 1, '#616161');
  fillRound(g, w / 2 - 6, 9, 12, 14, 4, '#fafafa', '#bdbdbd');
  ellipse(g, w / 2, 7, 5.5, 5, '#fafafa');
  ellipse(g, w / 2, 7.5, 3.5, 3, '#ffb300');
  fillRound(g, w / 2 - 3, 13, 6, 3, 0.5, '#1565c0');
};

const sprintTrack: Sprite = (g, w, h) => {
  fillRound(g, 1, 3, w - 2, h - 6, 2, '#e57373');
  g.fillStyle = '#fafafa';
  g.fillRect(2, h / 2 - 0.5, w - 4, 1);
  for (let x = 6; x < w - 4; x += 10) g.fillRect(x, 5, 1, h - 10);
  g.fillRect(w - 6, 3, 2, h - 6);
};

const weightRack: Sprite = (g, w, h) => {
  fillRound(g, 3, 4, w - 6, h - 8, 2, '#37474f');
  g.fillStyle = '#9e9e9e';
  g.fillRect(4, h / 2 - 1, w - 8, 2);
  for (const x of [7, w - 11]) fillRound(g, x, h / 2 - 7, 4, 14, 1, '#212121');
  for (let i = 0; i < 3; i++) ellipse(g, w / 2 - 6 + i * 6, h - 6, 2, 2, '#616161');
};

const tacticsBoard: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 9, 2, '#2e7d32', '#1b5e20');
  g.strokeStyle = '#fafafa';
  g.lineWidth = 0.7;
  g.strokeRect(5, 6, w - 10, h - 15);
  g.beginPath();
  g.moveTo(w / 2, 6);
  g.lineTo(w / 2, h - 9);
  g.stroke();
  for (const [x, y, c] of [[10, 9, '#e53935'], [16, 13, '#e53935'], [w - 12, 10, '#1e88e5'], [w - 18, 14, '#1e88e5']] as Array<[number, number, string]>) ellipse(g, x, y, 1.5, 1.5, c);
};

const physioTable: Sprite = (g, w, h) => {
  fillRound(g, 5, 3, w - 10, h - 6, 3, '#80cbc4', '#4db6ac');
  fillRound(g, 7, 5, w - 14, 7, 3, '#e0f2f1');
  fillRound(g, 7, h * 0.6, w - 14, 3, 1, '#fafafa');
};

const teamBus: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 8, 4, '#1b5e20', '#0d3b12');
  g.fillStyle = '#b3e5fc';
  for (let x = 6; x < w - 10; x += 8) g.fillRect(x, 6, 6, 5);
  fillRound(g, w - 9, 6, 5, 9, 1, '#b3e5fc');
  g.fillStyle = '#ffd54f';
  g.fillRect(4, h - 11, w - 14, 2);
  for (const x of [9, w - 12]) ellipse(g, x, h - 4, 3, 3, '#212121');
};

const salesPhoneDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#90a4ae', 8);
  fillRound(g, 5, 2, 13, 8, 1, '#263238');
  g.fillStyle = s.inUse ? '#e3f2fd' : '#455a64';
  g.fillRect(6.5, 3.5, 10, 5);
  fillRound(g, w - 11, 6, 7, 5, 1.5, '#212121');
  fillRound(g, w - 12, 4.5, 9, 2, 1, '#424242');
};

const contractTable: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#5d4037', 10);
  fillRound(g, 8, 7, 10, 8, 0.5, '#fafafa', '#bdbdbd');
  fillRound(g, w - 20, 7, 10, 8, 0.5, '#fafafa', '#bdbdbd');
  g.fillStyle = '#1a237e';
  g.fillRect(w / 2 - 1, 6, 1.5, 9);
};

const sampleShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#a1887f', 6);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) fillRound(g, 7 + i * 12, 4 + r * 8, 9, 6, 1, ['#ffcc80', '#80deea', '#ce93d8'][r]);
};

const standupMic: Sprite = (g, w, h, s) => {
  ellipse(g, w / 2, h - 5, 7, 2.5, '#424242');
  g.fillStyle = '#616161';
  g.fillRect(w / 2 - 0.75, 8, 1.5, h - 13);
  ellipse(g, w / 2, 7, 3, 3.5, '#212121');
  if (s.inUse) ellipse(g, w / 2, 7, 1.5, 1.5, '#fff59d');
};

const clubStage: Sprite = (g, w, h, s) => {
  fillRound(g, 1, 3, w - 2, h - 6, 3, '#5d4037', '#3e2723');
  fillRound(g, 1, 1, w - 2, 5, 1, '#b71c1c');
  g.fillStyle = '#7f0000';
  for (let x = 4; x < w - 2; x += 6) g.fillRect(x, 1, 1, 5);
  ellipse(g, w / 2, h / 2 + 2, 10, 6, s.inUse ? 'rgba(255,245,157,0.6)' : 'rgba(255,255,255,0.12)');
  g.fillStyle = '#212121';
  g.fillRect(w / 2 - 0.75, h / 2 - 3, 1.5, 8);
  ellipse(g, w / 2, h / 2 - 3, 2, 2.5, '#212121');
};

const jokeDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#8d6e63', 8);
  fillRound(g, 5, 6, 14, 10, 1, '#fffde7', '#bcaaa4');
  g.fillStyle = '#e53935';
  for (let i = 0; i < 3; i++) g.fillRect(7, 8 + i * 2.5, 9 - i * 2, 1);
  ellipse(g, w - 8, 10, 3, 3, '#ffd54f');
};

const intelDesk: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#455a64', 8);
  fillRound(g, 4, 1, 16, 9, 1, '#212121');
  g.fillStyle = s.inUse ? '#80cbc4' : '#263238';
  g.fillRect(5.5, 2.5, 13, 6);
  if (s.inUse) {
    g.fillStyle = '#004d40';
    for (let i = 0; i < 3; i++) g.fillRect(7, 3.5 + i * 1.6, 6 + (i % 2) * 3, 0.8);
  }
  fillRound(g, w - 9, 6, 6, 8, 0.5, '#f5f5f5', '#bdbdbd');
  g.fillStyle = '#c62828';
  g.fillRect(w - 8, 7, 4, 1.2);
};

const situationWall: Sprite = (g, w, h, s) => {
  fillRound(g, 1, 1, w - 2, h - 8, 2, '#212121');
  g.fillStyle = s.inUse ? '#0d47a1' : '#1a237e';
  g.fillRect(3, 3, w - 6, h - 12);
  g.strokeStyle = '#64b5f6';
  g.lineWidth = 0.6;
  g.beginPath();
  g.ellipse(w / 2, (h - 8) / 2 + 1, w / 4, (h - 12) / 3, 0, 0, Math.PI * 2);
  g.stroke();
  ellipse(g, w / 2 + 6, (h - 8) / 2, 1.5, 1.5, s.inUse && Math.floor(s.now / 400) % 2 ? '#ff1744' : '#ef9a9a');
  ellipse(g, w / 2 - 8, (h - 8) / 2 + 3, 1.2, 1.2, '#69f0ae');
};

const cyberTerminal: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#263238', 8);
  fillRound(g, 4, 1, w - 8, 10, 1, '#000');
  g.fillStyle = s.inUse ? '#00e676' : '#1b5e20';
  for (let i = 0; i < 4; i++) g.fillRect(6, 3 + i * 2, 4 + ((i * 5) % 9), 0.8);
  fillRound(g, 6, h * 0.6, w - 12, 5, 1, '#37474f');
};

const writingDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#6d4c41', 8);
  fillRound(g, 4, 3, 13, 8, 1, '#37474f');
  g.fillStyle = '#eceff1';
  g.fillRect(5.5, 4.5, 10, 5);
  fillRound(g, w - 10, 7, 7, 9, 0.5, '#fffde7', '#bcaaa4');
  ellipse(g, 6, h * 0.62, 2.5, 2.5, '#efebe9');
};

const proofTable: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#a1887f', 9);
  for (let i = 0; i < 3; i++) {
    fillRound(g, 6 + i * 14, 6, 11, 9, 0.5, '#fafafa', '#bdbdbd');
    g.fillStyle = '#e53935';
    g.fillRect(8 + i * 14, 9, 6, 0.8);
  }
};

const lookbookSet: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 6, 2, '#fce4ec', '#f8bbd0');
  g.fillStyle = '#f48fb1';
  g.fillRect(4, 4, w - 8, 2);
  ellipse(g, w / 2, h / 2 + 2, 6, 3, s.inUse ? '#fff59d' : '#f8bbd0');
  fillRound(g, w - 14, 7, 8, 12, 2, '#f06292');
};

const styleDesk: Sprite = (g, w, h) => {
  box(g, 1, 5, w - 2, h - 8, '#f8bbd0', 8);
  fillRound(g, 4, 3, 12, 8, 1, '#fafafa', '#e0e0e0');
  g.fillStyle = '#ad1457';
  g.fillRect(6, 5, 8, 1);
  g.fillRect(6, 7.5, 6, 1);
  ellipse(g, w - 8, 9, 3, 3.5, '#ec407a');
};

const espressoMachine: Sprite = (g, w, h, s) => {
  fillRound(g, 3, 3, w - 6, h - 7, 3, '#9e9e9e', '#616161');
  fillRound(g, 5, 5, w - 10, 6, 1, '#424242');
  ellipse(g, w / 2 - 4, 8, 1.2, 1.2, '#ffd54f');
  ellipse(g, w / 2 + 4, 8, 1.2, 1.2, '#ef5350');
  fillRound(g, w / 2 - 3, h - 11, 6, 6, 1, '#fafafa');
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,255,0.6)';
    const t = (s.now / 300) % 4;
    g.beginPath();
    g.arc(w / 2, h - 13 - t, 1.5, 0, Math.PI * 2);
    g.fill();
  }
};

const cafeCounter: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#6d4c41', 10);
  fillRound(g, 6, 6, 10, 7, 1, '#263238');
  g.fillStyle = '#80deea';
  g.fillRect(7, 7, 8, 4);
  for (let i = 0; i < 3; i++) ellipse(g, w - 22 + i * 6, 10, 2.2, 2.2, '#fafafa');
};

const beanRoaster: Sprite = (g, w, h) => {
  fillRound(g, 6, h - 12, w - 12, 9, 2, '#4e342e');
  g.fillStyle = '#e0e0e0';
  g.beginPath();
  g.moveTo(8, 4);
  g.lineTo(w - 8, 4);
  g.lineTo(w / 2 + 3, h - 12);
  g.lineTo(w / 2 - 3, h - 12);
  g.closePath();
  g.fill();
  for (let i = 0; i < 4; i++) ellipse(g, 11 + i * 3, 7, 1.2, 0.9, '#5d4037');
};

const fryer: Sprite = (g, w, h, s) => {
  box(g, 2, 3, w - 4, h - 6, '#b0bec5', 6);
  fillRound(g, 5, 5, w - 10, 10, 1, '#ffb300');
  g.fillStyle = '#424242';
  g.fillRect(w / 2 - 0.5, 4, 1, 12);
  if (s.inUse) {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath();
    g.arc(w / 2 - 5, 3 - ((s.now / 250) % 3), 1.5, 0, Math.PI * 2);
    g.fill();
  }
};

const grillTop: Sprite = (g, w, h, s) => {
  box(g, 2, 3, w - 4, h - 6, '#757575', 6);
  fillRound(g, 4, 5, w - 8, 12, 1, '#212121');
  for (let i = 0; i < 2; i++) ellipse(g, 9 + i * 8, 11, 3, 2.5, s.inUse ? '#8d6e63' : '#6d4c41');
  g.fillStyle = '#ff7043';
  g.fillRect(5, 16, w - 10, 1);
};

const burgerCounter: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#c62828', 10);
  fillRound(g, 4, 6, 9, 7, 1, '#263238');
  g.fillStyle = '#ffeb3b';
  g.fillRect(5, 7, 7, 4);
  fillRound(g, w - 22, 7, 14, 6, 1, '#ffca28');
};

const trashStation: Sprite = (g, w, h) => {
  for (let i = 0; i < 3; i++) fillRound(g, 4 + i * ((w - 8) / 3), 5, (w - 8) / 3 - 1, h - 9, 1.5, ['#1e88e5', '#43a047', '#fdd835'][i], '#455a64');
};

const clothesShelf: Sprite = (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, '#a1887f', 6);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) fillRound(g, 6 + i * 11, 4 + r * 8, 9, 5, 1.5, ['#ef9a9a', '#90caf9', '#fff59d', '#a5d6a7', '#ce93d8', '#ffcc80'][r * 2 + i]);
};

const checkoutCounter: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#5d4037', 10);
  fillRound(g, 6, 6, 10, 7, 1, '#263238');
  g.fillStyle = '#a5d6a7';
  g.fillRect(7, 7, 8, 4);
  fillRound(g, w - 20, 8, 12, 5, 1, '#f8bbd0');
};

const fittingRoom: Sprite = (g, w, h) => {
  fillRound(g, 3, 2, w - 6, h - 4, 1, '#ede7f6', '#9575cd');
  g.fillStyle = '#9575cd';
  for (let x = 6; x < w - 4; x += 4) g.fillRect(x, 3, 1.5, h - 7);
  g.fillStyle = '#5e35b1';
  g.fillRect(3, 2, w - 6, 2);
};

const storyCorner: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 6, 4, '#fff176', '#fbc02d');
  for (let i = 0; i < 4; i++) fillRound(g, 6 + i * 9, 6, 7, 9, 1, ['#ef5350', '#42a5f5', '#66bb6a', '#ab47bc'][i]);
};

const craftTable: Sprite = (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, '#ffcc80', 8);
  fillRound(g, 5, 6, 9, 7, 0.5, '#fafafa');
  ellipse(g, 20, 9, 3, 3, '#ef5350');
  ellipse(g, 27, 10, 2.5, 2.5, '#42a5f5');
  fillRound(g, w - 12, 6, 3, 8, 1, '#7e57c2');
};

const napMats: Sprite = (g, w, h) => {
  for (let i = 0; i < 2; i++) {
    fillRound(g, 3 + i * (w / 2 - 1), 3, w / 2 - 5, h - 6, 3, ['#90caf9', '#f8bbd0'][i], '#78909c');
    fillRound(g, 5 + i * (w / 2 - 1), 5, w / 2 - 9, 5, 2, '#fafafa');
  }
};

const snackCounter: Sprite = (g, w, h) => {
  box(g, 2, 4, w - 4, h - 7, '#a5d6a7', 8);
  ellipse(g, 9, 9, 3, 3, '#e53935');
  ellipse(g, 16, 9, 3, 3, '#fdd835');
  fillRound(g, w - 9, 5, 4, 8, 1, '#ff9800');
};

const lawnMower: Sprite = (g, w, h, s) => {
  fillRound(g, 6, 9, w - 12, h - 14, 3, '#43a047', '#1b5e20');
  for (const [x, y] of [[7, 10], [w - 7, 10], [7, h - 6], [w - 7, h - 6]]) ellipse(g, x, y, 2.5, 2.5, '#212121');
  g.strokeStyle = '#424242';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(w / 2 - 5, 9);
  g.lineTo(w / 2 - 5, 2);
  g.lineTo(w / 2 + 5, 2);
  g.lineTo(w / 2 + 5, 9);
  g.stroke();
  if (s.inUse) ellipse(g, w / 2, h / 2 + 2, 2, 2, '#ffeb3b');
};

const wheelbarrow: Sprite = (g, w, h) => {
  fillRound(g, 6, 6, w - 12, h - 14, 4, '#8d6e63', '#4e342e');
  ellipse(g, w / 2, 9, 5, 2.5, '#6d4c41');
  ellipse(g, w / 2, h - 5, 3, 3, '#212121');
  g.strokeStyle = '#5d4037';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(8, 6);
  g.lineTo(5, 2);
  g.moveTo(w - 8, 6);
  g.lineTo(w - 5, 2);
  g.stroke();
};

const materialPile: Sprite = (g, w, h) => {
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) fillRound(g, 6 + r * 4 + i * 8, h - 9 - r * 5, 7, 4, 0.5, '#bf360c', '#8d2a0a');
  fillRound(g, w - 15, 6, 11, 12, 1, '#bdbdbd', '#757575');
};

const scrimStation: Sprite = (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, '#212121', 8);
  fillRound(g, 4, 1, w - 8, 9, 1, '#000');
  g.fillStyle = s.inUse ? `hsl(${(s.now / 20) % 360}, 70%, 55%)` : '#1a237e';
  g.fillRect(5.5, 2.5, w - 11, 6);
  fillRound(g, 5, h * 0.58, w - 16, 4, 1, '#424242');
  ellipse(g, w - 8, h * 0.62, 2.5, 3, '#424242');
  g.fillStyle = '#d50000';
  g.fillRect(5, h * 0.58 + 3.5, w - 16, 0.8);
};

const replayScreen: Sprite = (g, w, h, s) => {
  fillRound(g, 2, 2, w - 4, h - 9, 1.5, '#111');
  g.fillStyle = s.inUse ? '#2e7d32' : '#1b5e20';
  g.fillRect(4, 4, w - 8, h - 13);
  g.strokeStyle = '#c8e6c9';
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(8, h - 11);
  g.lineTo(w - 8, 6);
  g.stroke();
  ellipse(g, 12, h - 13, 1.4, 1.4, '#e53935');
  ellipse(g, w - 12, 8, 1.4, 1.4, '#42a5f5');
};

const teamVan: Sprite = (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 8, 5, '#311b92', '#1a0f5c');
  g.fillStyle = '#b3e5fc';
  g.fillRect(w - 14, 6, 9, 6);
  g.fillRect(8, 6, 14, 5);
  g.fillStyle = '#d50000';
  g.fillRect(4, h - 11, w - 10, 2);
  for (const x of [10, w - 12]) ellipse(g, x, h - 4, 3, 3, '#212121');
};

// ---- Shapes for the everyday Korean jobs' furniture: each object picks one and its colours. ----

/** A desk with a screen (lit while in use) and papers. */
const deskWith = (top: string, screen: string): Sprite => (g, w, h, s) => {
  box(g, 1, 5, w - 2, h - 8, top, 8);
  const sw = Math.min(16, w - 10);
  fillRound(g, 4, 1, sw, 9, 1, '#212121');
  g.fillStyle = s.inUse ? screen : '#37474f';
  g.fillRect(5.5, 2.5, sw - 3, 6);
  if (w > TILE) {
    fillRound(g, w / 2 + 2, 1, sw, 9, 1, '#212121');
    g.fillStyle = s.inUse ? screen : '#37474f';
    g.fillRect(w / 2 + 3.5, 2.5, sw - 3, 6);
  }
  fillRound(g, w - 10, h * 0.55, 7, 6, 0.5, '#fafafa', '#bdbdbd');
};
/** A counter with a till and goods on it. */
const counterWith = (top: string, accent: string): Sprite => (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, top, 10);
  fillRound(g, 5, 6, 9, 7, 1, '#263238');
  g.fillStyle = accent;
  g.fillRect(6, 7, 7, 4);
  for (let x = 18; x < w - 6; x += 7) fillRound(g, x, 7, 5, 6, 1, accent, '#00000033');
};
/** Shelves stacked with things in the given colours. */
const shelfOf = (frame: string, colors: string[]): Sprite => (g, w, h) => {
  box(g, 3, 2, w - 6, h - 4, frame, 6);
  const cols = Math.max(2, Math.floor((w - 8) / 10));
  for (let r = 0; r < 3; r++) for (let i = 0; i < cols; i++) fillRound(g, 6 + i * ((w - 10) / cols), 4 + r * 8, (w - 10) / cols - 2, 5, 1, colors[(r * cols + i) % colors.length]);
};
/** A table with a few things laid out. */
const tableWith = (top: string, items: string[]): Sprite => (g, w, h) => {
  box(g, 1, 4, w - 2, h - 7, top, 9);
  items.forEach((c, i) => fillRound(g, 5 + i * ((w - 10) / items.length), 7, (w - 10) / items.length - 3, 7, 1, c, '#00000033'));
};
/** A machine: a body, a panel and a light that blinks while in use. */
const machineOf = (body: string, panel: string): Sprite => (g, w, h, s) => {
  fillRound(g, 3, 3, w - 6, h - 7, 3, body, '#00000044');
  fillRound(g, 6, 6, w - 12, Math.min(9, h - 14), 1, panel);
  ellipse(g, w - 9, h - 9, 2, 2, s.inUse && Math.floor(s.now / 400) % 2 ? '#76ff03' : '#9e9e9e');
};
/** A vehicle seen from above. */
const vehicleOf = (body: string, stripe: string): Sprite => (g, w, h) => {
  fillRound(g, 2, 3, w - 4, h - 8, 5, body, '#00000055');
  g.fillStyle = '#b3e5fc';
  g.fillRect(w - 14, 6, 9, 6);
  g.fillStyle = stripe;
  g.fillRect(4, h - 11, w - 10, 2);
  for (const x of [10, w - 12]) ellipse(g, x, h - 4, 3, 3, '#212121');
};
/** A long low thing to lie or stand on (a bed, a mat, a tank). */
const padOf = (frame: string, inner: string): Sprite => (g, w, h) => {
  fillRound(g, 3, 3, w - 6, h - 6, 4, frame, '#00000044');
  fillRound(g, 6, 6, w - 12, h - 12, 3, inner);
};

const KOREA_SPRITES: Record<string, Sprite> = {
  civilCounter: counterWith('#90a4ae', '#1e88e5'),
  mailSorter: shelfOf('#c62828', ['#fafafa', '#fff59d', '#ffccbc']),
  parcelScale: machineOf('#b0bec5', '#ffcc80'),
  postCounter: counterWith('#e53935', '#ffcdd2'),
  mailScooter: vehicleOf('#d32f2f', '#fafafa'),
  cctvConsole: deskWith('#263238', '#80cbc4'),
  visitBooth: tableWith('#78909c', ['#b3e5fc', '#b3e5fc']),
  counselTable: tableWith('#8d6e63', ['#fafafa', '#ffe082']),
  radarConsole: deskWith('#1b5e20', '#69f0ae'),
  rescueGear: shelfOf('#e65100', ['#ff9800', '#fafafa', '#ffeb3b']),
  divingTank: padOf('#0277bd', '#4fc3f7'),
  patrolBoat: vehicleOf('#fafafa', '#0d47a1'),
  baggageXray: machineOf('#546e7a', '#263238'),
  inspectionTable: tableWith('#b0bec5', ['#5d4037', '#1565c0']),
  customsDesk: deskWith('#607d8b', '#bbdefb'),
  garbageTruck: vehicleOf('#2e7d32', '#ffeb3b'),
  recycleSorter: tableWith('#43a047', ['#1e88e5', '#fdd835', '#e53935']),
  washBay: padOf('#90a4ae', '#4dd0e1'),
  caseDesk: deskWith('#8d6e63', '#c5e1a5'),
  donationShelf: shelfOf('#a1887f', ['#ffb74d', '#fff176', '#81d4fa']),
  mealServiceCounter: counterWith('#a1887f', '#fff8e1'),
  welfareVan: vehicleOf('#43a047', '#fafafa'),
  careBed: padOf('#80cbc4', '#e0f2f1'),
  mealCart: tableWith('#ffcc80', ['#fff8e1', '#ffe0b2']),
  walkingRail: tableWith('#bcaaa4', ['#8d6e63']),
  blockMat: tableWith('#ffe082', ['#ef5350', '#42a5f5', '#66bb6a']),
  sensoryMat: padOf('#ba68c8', '#e1bee7'),
  workshopBench: tableWith('#a1887f', ['#ffcc80', '#90a4ae', '#ffe082']),
  parallelBars: tableWith('#b0bec5', ['#eceff1']),
  adaptiveKitchen: counterWith('#80cbc4', '#fafafa'),
  supportVan: vehicleOf('#1e88e5', '#ffeb3b'),
  activityMat: padOf('#0288d1', '#81d4fa'),
  pingpongTable: tableWith('#2e7d32', ['#43a047', '#43a047']),
  programDesk: deskWith('#90a4ae', '#fff59d'),
  youthCounselDesk: deskWith('#9575cd', '#d1c4e9'),
  youthBus: vehicleOf('#fb8c00', '#fafafa'),
  therapyTable: padOf('#00897b', '#b2dfdb'),
  exerciseBall: machineOf('#ff8a65', '#ffccbc'),
  fineMotorTable: tableWith('#ffcc80', ['#ef5350', '#42a5f5', '#fdd835', '#66bb6a']),
  analyzerMachine: machineOf('#eceff1', '#90caf9'),
  microscopeBench: deskWith('#90a4ae', '#e1f5fe'),
  centrifugeUnit: machineOf('#b0bec5', '#cfd8dc'),
  sampleFridge: machineOf('#e3f2fd', '#bbdefb'),
  xrayMachine: machineOf('#cfd8dc', '#263238'),
  ctScanner: padOf('#eceff1', '#b0bec5'),
  mriScanner: padOf('#e0e0e0', '#9e9e9e'),
  linacMachine: padOf('#e1f5fe', '#81d4fa'),
  cprManikin: padOf('#ffcdd2', '#ef9a9a'),
  medKitShelf: shelfOf('#c62828', ['#fafafa', '#ef5350', '#ffeb3b']),
  dispatchDesk: deskWith('#455a64', '#ffab91'),
  ambulance: vehicleOf('#fafafa', '#e53935'),
  acupunctureBed: padOf('#8d6e63', '#efebe9'),
  herbCabinet: shelfOf('#5d4037', ['#a1887f', '#8d6e63', '#bcaaa4']),
  herbDecoctor: machineOf('#bcaaa4', '#6d4c41'),
  pulseDesk: tableWith('#8d6e63', ['#efebe9']),
  menuDesk: deskWith('#aed581', '#f1f8e9'),
  bulkCooker: machineOf('#90a4ae', '#cfd8dc'),
  servingLine: counterWith('#b0bec5', '#ffe0b2'),
  hygieneStation: machineOf('#4dd0e1', '#e0f7fa'),
  foodStorage: shelfOf('#8bc34a', ['#c5e1a5', '#ffcc80', '#ef9a9a']),
  eyeTestChart: tableWith('#90caf9', ['#212121', '#fafafa']),
  lensEdger: machineOf('#78909c', '#b3e5fc'),
  frameDisplay: shelfOf('#d7ccc8', ['#212121', '#8d6e63', '#c62828']),
  fittingTable: tableWith('#a1887f', ['#fafafa', '#212121']),
  lecturePodium: tableWith('#5d4037', ['#fafafa']),
  tutorDesk: deskWith('#8d6e63', '#fff9c4'),
  lectureCamera: machineOf('#263238', '#90caf9'),
  recitalStage: padOf('#ad1457', '#f48fb1'),
  sandTable: tableWith('#ffe0b2', ['#ffcc80', '#ffb74d']),
  lessonPiano: counterWith('#212121', '#fafafa'),
  theoryDesk: deskWith('#8d6e63', '#e1bee7'),
  drivingCar: vehicleOf('#fdd835', '#212121'),
  trafficCone: machineOf('#ff7043', '#fafafa'),
  roadTestCar: vehicleOf('#1565c0', '#fdd835'),
  examBooth: deskWith('#90a4ae', '#c8e6c9'),
  yogaMat: padOf('#7e57c2', '#d1c4e9'),
  reformer: tableWith('#bcaaa4', ['#fafafa', '#212121']),
  conveyorBelt: tableWith('#78909c', ['#bcaaa4', '#d7ccc8', '#bcaaa4']),
  parcelCage: shelfOf('#90a4ae', ['#d7ccc8', '#bcaaa4', '#a1887f']),
  scannerDesk: deskWith('#455a64', '#ef9a9a'),
  deliveryTruck: vehicleOf('#fafafa', '#1565c0'),
  cityBus: vehicleOf('#43a047', '#fafafa'),
  farebox: machineOf('#546e7a', '#b2dfdb'),
  routeBoard: machineOf('#1565c0', '#e3f2fd'),
  taxiCab: vehicleOf('#fdd835', '#212121'),
  navTerminal: machineOf('#263238', '#80cbc4'),
  trainSimulator: deskWith('#37474f', '#b2ebf2'),
  controlPanel: deskWith('#1a237e', '#69f0ae'),
  crewDesk: deskWith('#607d8b', '#fff9c4'),
  subwayTrain: vehicleOf('#90a4ae', '#1e88e5'),
  shipBridge: deskWith('#0d47a1', '#81d4fa'),
  chartTable: tableWith('#a1887f', ['#e3f2fd', '#fff9c4']),
  cargoPlanner: deskWith('#455a64', '#ffcc80'),
  cargoTender: vehicleOf('#0277bd', '#fafafa'),
  wiringBoard: tableWith('#90a4ae', ['#e53935', '#1e88e5', '#fdd835']),
  switchboard: machineOf('#78909c', '#eceff1'),
  cableReel: machineOf('#ff7043', '#ffccbc'),
  circuitDesk: deskWith('#607d8b', '#b2ebf2'),
  serviceVan: vehicleOf('#ffb300', '#212121'),
  pipeBench: tableWith('#8d6e63', ['#b0bec5', '#90a4ae']),
  leakDetector: machineOf('#4fc3f7', '#e1f5fe'),
  boilerUnit: machineOf('#bdbdbd', '#ff7043'),
  plumbingVan: vehicleOf('#1e88e5', '#fafafa'),
  carpentryBench: tableWith('#a1887f', ['#d7ccc8', '#bcaaa4']),
  tableSaw: machineOf('#78909c', '#cfd8dc'),
  lumberRack: shelfOf('#6d4c41', ['#d7ccc8', '#bcaaa4', '#a1887f']),
  finishingTable: tableWith('#d7ccc8', ['#8d6e63', '#ffe0b2']),
  weldingBooth: machineOf('#455a64', '#ff6f00'),
  steelPlates: tableWith('#90a4ae', ['#b0bec5', '#cfd8dc', '#b0bec5']),
  grinderStation: machineOf('#616161', '#ffcc80'),
  inspectionRig: machineOf('#26a69a', '#b2dfdb'),
  wallpaperTable: tableWith('#f5f5f5', ['#f8bbd0', '#c5e1a5']),
  tileSaw: machineOf('#78909c', '#e0e0e0'),
  mockWall: shelfOf('#ffe0b2', ['#f8bbd0', '#b3e5fc', '#fff9c4']),
  elevatorMockup: padOf('#b0bec5', '#eceff1'),
  motorBench: tableWith('#607d8b', ['#90a4ae', '#455a64']),
  partsCabinet: shelfOf('#90a4ae', ['#cfd8dc', '#ffcc80']),
  monitorDesk: deskWith('#263238', '#a5d6a7'),
  elevatorVan: vehicleOf('#43a047', '#fafafa'),
  fishingBoat: vehicleOf('#1565c0', '#fafafa'),
  netRack: shelfOf('#8d6e63', ['#a5d6a7', '#80cbc4']),
  fishCrates: shelfOf('#4fc3f7', ['#b3e5fc', '#e1f5fe']),
  fishAuction: tableWith('#90a4ae', ['#4fc3f7', '#81d4fa', '#b3e5fc']),
  fishTank: padOf('#0277bd', '#4fc3f7'),
  shellLine: padOf('#00838f', '#80deea'),
  waterSensor: machineOf('#263238', '#80cbc4'),
  harvestNet: tableWith('#b0bec5', ['#4fc3f7', '#81d4fa']),
  diveSpot: padOf('#0277bd', '#29b6f6'),
  bulteok: padOf('#5d4037', '#ff7043'),
  catchTable: tableWith('#b0bec5', ['#ffab91', '#a1887f']),
  tewakRack: machineOf('#ff7043', '#ffccbc'),
  saplingBed: tableWith('#7cb342', ['#aed581', '#c5e1a5', '#aed581']),
  thinningSite: padOf('#2e7d32', '#81c784'),
  fireWatchTower: machineOf('#8d6e63', '#d7ccc8'),
  trailSign: machineOf('#a1887f', '#efebe9'),
  forestTruck: vehicleOf('#e53935', '#fafafa'),
  storeCounter: counterWith('#43a047', '#fff59d'),
  snackShelf: shelfOf('#bcaaa4', ['#ef5350', '#ffca28', '#42a5f5', '#66bb6a']),
  drinkCooler: machineOf('#4fc3f7', '#e1f5fe'),
  deliveryPOS: machineOf('#78909c', '#ffe0b2'),
  orderTablet: deskWith('#263238', '#b3e5fc'),
  agentDesk: deskWith('#90a4ae', '#c5cae9'),
  consultBooth: tableWith('#5d4037', ['#fafafa', '#fff9c4']),
  callBooth: deskWith('#b0bec5', '#e1bee7'),
  qaDesk: deskWith('#607d8b', '#fff59d'),
  callBoard: machineOf('#1a237e', '#69f0ae'),
  nailTable: tableWith('#f8bbd0', ['#ec407a', '#ce93d8', '#fafafa']),
  polishShelf: shelfOf('#f48fb1', ['#e91e63', '#9c27b0', '#ff5722', '#fafafa']),
  pedicureChair: padOf('#ce93d8', '#f3e5f5'),
  facialBed: padOf('#f8bbd0', '#fafafa'),
  skinAnalyzer: machineOf('#b2ebf2', '#263238'),
  serumShelf: shelfOf('#f8bbd0', ['#fff9c4', '#e1bee7', '#b2ebf2']),
  makeupStation: deskWith('#f8bbd0', '#fff8e1'),
  cosmeticCart: shelfOf('#e1bee7', ['#ec407a', '#212121', '#ffcc80']),
  specialFxTable: tableWith('#8d6e63', ['#ffccbc', '#bcaaa4']),
  sparringMat: padOf('#37474f', '#90a4ae'),
  routeMapTable: tableWith('#455a64', ['#e3f2fd', '#fff9c4']),
  radioRack: shelfOf('#212121', ['#43a047', '#ffeb3b']),
  escortCar: vehicleOf('#212121', '#90a4ae'),
  securityMonitor: deskWith('#263238', '#80cbc4'),
  keyCabinet: shelfOf('#8d6e63', ['#ffd54f', '#bdbdbd']),
  patrolLog: deskWith('#607d8b', '#fff9c4'),
  alarmPanel: machineOf('#c62828', '#ffcdd2'),
};

/** The home objects that train the new competencies (ours). */
const COMPETENCY_SPRITES: Record<string, Sprite> = {
  studyDesk: deskWith('#8d6e63', '#fff9c4'),
  anatomyModel: machineOf('#ffccbc', '#ef9a9a'),
  chemistrySet: tableWith('#90a4ae', ['#80deea', '#ce93d8', '#a5d6a7']),
  drivingSim: deskWith('#212121', '#4fc3f7'),
  planningBoard: machineOf('#eceff1', '#fafafa'),
  businessBoardGame: tableWith('#2e7d32', ['#ffeb3b', '#e53935', '#1e88e5']),
  homeToolBench: tableWith('#8a6a48', ['#546e7a', '#90a4ae', '#ffb300']),
  cabinMockup: tableWith('#90a4ae', ['#1565c0', '#1565c0', '#1565c0']),
  evacSlide: padOf('#ffb300', '#fff8e1'),
  safetyDemoKit: shelfOf('#ff7043', ['#ffeb3b', '#fafafa']),
  crewGate: machineOf('#1565c0', '#bbdefb'),
  dubbingBooth: machineOf('#37474f', '#ef5350'),
  scriptStand: deskWith('#8d6e63', '#fff9c4'),
  voiceMirror: machineOf('#b0bec5', '#e3f2fd'),
  narrationDesk: deskWith('#455a64', '#b39ddb'),
  anchorDesk: counterWith('#0d47a1', '#fafafa'),
  prompterDesk: deskWith('#607d8b', '#fff9c4'),
  pronunciationShelf: shelfOf('#795548', ['#1976d2', '#fafafa', '#ffca28']),
  onAirBooth: machineOf('#c62828', '#ffcdd2'),
  forecastWall: machineOf('#0277bd', '#b3e5fc'),
  modelTerminal: deskWith('#263238', '#4fc3f7'),
  balloonLauncher: machineOf('#eceff1', '#ff7043'),
  weatherSet: padOf('#4fc3f7', '#fff59d'),
  devStation: deskWith('#263238', '#7c4dff'),
  playtestBooth: deskWith('#7e57c2', '#69f0ae'),
  levelBoard: machineOf('#5c6bc0', '#e8eaf6'),
  bugBoard: machineOf('#e53935', '#fff9c4'),
  interpretBooth: machineOf('#455a64', '#b2dfdb'),
  translationDesk: deskWith('#8d6e63', '#fafafa'),
  glossaryShelf: shelfOf('#6d4c41', ['#26a69a', '#ffca28', '#ef5350']),
  circulationDesk: counterWith('#a1887f', '#fff3e0'),
  catalogStation: deskWith('#546e7a', '#c8e6c9'),
  libraryStacks: shelfOf('#6d4c41', ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28']),
  storyRug: padOf('#ffcc80', '#fff3e0'),
  scanStation: machineOf('#78909c', '#e0e0e0'),
  itineraryDesk: deskWith('#00897b', '#fff9c4'),
  travelMap: tableWith('#4db6ac', ['#e0f2f1', '#ffcc80']),
  tourBus: vehicleOf('#26a69a', '#ffffff'),
  weddingConsult: tableWith('#f8bbd0', ['#fafafa', '#ffd54f']),
  budgetDesk: deskWith('#90a4ae', '#fff9c4'),
  decorSample: tableWith('#f48fb1', ['#fafafa', '#a5d6a7', '#ffcdd2']),
  ceremonyArch: padOf('#fafafa', '#f8bbd0'),
};

const SPRITES: Record<string, Sprite> = {
  stairs,
  tree,
  bush,
  ...KOREA_SPRITES,
  ...COMPETENCY_SPRITES,
  toyBox,
  scrimStation,
  replayScreen,
  teamVan,
  fryer,
  grillTop,
  burgerCounter,
  trashStation,
  clothesShelf,
  checkoutCounter,
  fittingRoom,
  storyCorner,
  craftTable,
  napMats,
  snackCounter,
  lawnMower,
  wheelbarrow,
  materialPile,
  intelDesk,
  situationWall,
  cyberTerminal,
  writingDesk,
  proofTable,
  lookbookSet,
  styleDesk,
  espressoMachine,
  cafeCounter,
  beanRoaster,
  missionConsole,
  spacecraftMockup,
  centrifuge,
  spacesuitDisplay,
  sprintTrack,
  weightRack,
  tacticsBoard,
  physioTable,
  teamBus,
  salesPhoneDesk,
  contractTable,
  sampleShelf,
  standupMic,
  clubStage,
  jokeDesk,
  drawingTabletDesk,
  plotDesk,
  frontDesk,
  conciergeDesk,
  luggageCart,
  hotelBed,
  minibar,
  linenShelf,
  tattooChair,
  flashWall,
  talkShowSet,
  newsDesk,
  cueCardTable,
  radioBooth,
  realtorDesk,
  listingBoard,
  realtorCar,
  carLift,
  diagnosticComputer,
  toolWall,
  partsShelf,
  cropField,
  tractor,
  packingTable,
  seedShelf,
  farmStand,
  designDesk,
  largePrinter,
  dentalChair,
  sterilizer,
  dentalLabBench,
  dispensingTable,
  pharmacyShelf,
  pharmacyCounter,
  tellerWindow,
  loanDesk,
  tradingTerminal,
  vaultDoor,
  vipDesk,
  accountingDesk,
  shredder,
  screenplayDesk,
  storyboardWall,
  editingSuite,
  screeningScreen,
  catwalk,
  posingSpot,
  wardrobeRack,
  toyWorkbench,
  plushTable,
  playtestMat,
  wrapStation,
  toyShelf,
  bakeryOven,
  doughTable,
  decorTable,
  displayCase,
  diplomatDesk,
  negotiationTable,
  flagStand,
  receptionBuffet,
  gamingRig,
  mukbangTable,
  greenScreen,
  climbingWall,
  skateRamp,
  windTunnel,
  gearBench,
  jumpPlane,
  meditationMat,
  sandTray,
  notesDesk,
  crisisPhone,
  karaoke,
  djBooth,
  clubSpeaker,
  recordCrate,
  danceMirror,
  balletBarre,
  performStage,
  concertStage,
  vocalPiano,
  recordingMic,
  mixingConsole,
  lyricDesk,
  waterTestBench,
  seedlingNursery,
  specimenTank,
  recycleStation,
  ecoJeep,
  materialLibrary,
  moodBoard,
  sampleTable,
  showroomSet,
  decorVan,
  officeDesk,
  copier,
  projector,
  memorialAltar,
  wreathStand,
  prepTable,
  funeralDesk,
  contentDesk,
  videoEditStation,
  streamingSetup,
  selfieWall,
  trendBoard,
  obstacleCourse,
  pullUpBar,
  flagPole,
  gearRack,
  mapTable,
  radioStation,
  armyTruck,
  gardenBed,
  rarePlantCase,
  greenhouseControl,
  flowerTable,
  pottingBench,
  robotBench,
  circuitStation,
  testRig,
  serverRack,
  productionPanel,
  chemistryBench,
  formulaBoard,
  specimenFreezer,
  inventionBench,
  labControl,
  researchDesk,
  filmSet,
  movieCamera,
  stuntMat,
  makeupMirror,
  scriptTable,
  campaignDesk,
  speechPodium,
  debateTable,
  editorDesk,
  tastingTable,
  wineRack,
  artPedestal,
  archiveShelf,
  sewingMachine,
  fabricTable,
  mannequin,
  runway,
  photoBackdrop,
  studioLight,
  studioCamera,
  photoEditStation,
  darkroomSink,
  pressScooter,
  salonStation,
  shampooSink,
  salonCounter,
  productShelf,
  flightSimulator,
  briefingTable,
  weatherStation,
  opsDesk,
  boardingGate,
  chalkboard,
  teacherDesk,
  studentDesk,
  lawDesk,
  lawLibrary,
  courtPodium,
  judgeBench,
  draftingTable,
  cadStation,
  modelTable,
  siteVan,
  vetTable,
  kennel,
  medStation,
  xrayViewer,
  hospitalBed,
  surgeryTable,
  medCabinet,
  policeDesk,
  evidenceTable,
  trainingDummy,
  patrolCar,
  fireTruck,
  hoseRack,
  gearLocker,
  fireDrill,
  workstation,
  whiteboard,
  lineStove,
  prepCounter,
  servingPass,
  studioEasel,
  sketchTable,
  pool,
  woodworkingTable,
  microscope,
  grill,
  fireplace,
  birthdayCake,
  urn,
  burglarAlarm,
  bathtub,
  doubleBed: bed,
  deluxeBed: bed,
  deluxeDoubleBed: bed,
  planter,
  mailbox,
  bassinet,
  toddlerBed: bed,
  treadmill,
  easel,
  guitar,
  smokeAlarm,
  diningTable,
  diningChair,
  kitchenSink,
  paintingLandscape: picture('#7cb342', '#d7b46a'),
  paintingAbstract: picture('#5c6bc0', '#eceff1'),
  posterPop: picture('#f06292', '#212121'),
  paintingMaster: picture('#8d6e63', '#c9a54a'),
  aquarium,
  bed,
  sofa: couch(2),
  armchair: couch(1),
  fridge,
  stove,
  bigTv,
  gamingComputer,
  chessTable,
  coffeeMaker,
  piano,
  bar,
  monkeyBars,
  pond,
  rocketShip,
  violin,
  camera,
  telescope,
  deluxeFridge: fridge,
  deluxeStove: stove,
  toilet,
  shower,
  sink,
  tv,
  stereo,
  computer,
  bookshelf,
  mirror,
  clothesCabinet,
  plant,
  lamp,
};

function fallback(g: CanvasRenderingContext2D, w: number, h: number, _s: FurnitureState, def: ObjectDef) {
  box(g, 3, 3, w - 6, h - 6, def.color, 8, 5);
  g.font = `${TILE * 0.5}px ${EMOJI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(def.icon, w / 2, h / 2 - 2);
}

/** Draws one object (rotated to `dir`) with a soft drop shadow. */
export function drawFurniture(g: CanvasRenderingContext2D, def: ObjectDef, x: number, y: number, dir: Dir, alpha: number, s: FurnitureState) {
  const { w: fw, h: fh } = dims(def, dir);
  const w = def.w * TILE;
  const h = def.h * TILE;
  const cx = (x + fw / 2) * TILE;
  const cy = (y + fh / 2) * TILE;
  g.save();
  g.globalAlpha = alpha;
  if (!s.overlay) {
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.beginPath();
    g.ellipse(cx + 3, cy + 4, (fw * TILE) / 2 - 2, (fh * TILE) / 2 - 3, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.translate(cx, cy);
  g.rotate(ROT[dir]);
  g.translate(-w / 2, -h / 2);
  (SPRITES[def.id] ?? fallback)(g, w, h, s, def);
  g.restore();
}

/** Light sources an object adds at night: [tile x, tile y, radius in tiles, colour]. */
export function objectLight(def: ObjectDef, x: number, y: number, dir: Dir, inUse: boolean): [number, number, number, string] | null {
  const { w, h } = dims(def, dir);
  if (def.id === 'lamp') return [x + w / 2, y + h / 2, 3.2, '#ffd27a'];
  if (def.id === 'fireplace' && inUse) return [x + w / 2, y + h / 2 + 1, 3.5, '#ff9a4a'];
  if (def.id === 'tv' && inUse) return [x + w / 2, y + h / 2 + 1, 2.6, '#8fc8ff'];
  if (def.id === 'computer' && inUse) return [x + w / 2, y + h / 2 + 0.5, 1.6, '#9fd6ff'];
  return null;
}

