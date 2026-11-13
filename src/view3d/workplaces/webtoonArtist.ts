import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { MARKER_GRIP, PEN_GRIP, PEN_KEYS, type Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';

/**
 * The webtoon studio (웹툰 스튜디오) drawn as itself (2026-10-27 workplace pipeline, at the user's
 * request: drawing on the pen display should look like drawing). The studio puts out a weekly serial,
 * 「달빛 편의점」 — 한달빛, a convenience store's night-shift girl, and 월야, the guest who came down
 * from the moon. At the pen-display desks the episode is drawn as it really is: the pen hand moves
 * the nib along each line of the panel on the tilted screen (lifted between lines, the other hand on
 * the shortcut remote), and the panel comes on under it in the drawing program — 콘티 in blue, then
 * 선화, then the flats and the shading under the colour, the balloons lettered in at the deadline
 * while the upload creeps up the title bar in red — and when it's done the long vertical page scrolls
 * on to the next panel; the assistant draws a street background to the vanishing point, the brush is
 * set up with test strokes. The episode scrolls down a portrait monitor behind. At the boards a
 * marker draws the 콘티's cuts and the heroine's expressions on a sheet pinned up; the readers'
 * ranking, likes and comments come in live on the monitor in the story room; the 원고 comes out of
 * the printer to be proofed in red; and in the lobby, the 단행본 is signed with a little drawing.
 */

const BLACK = '#24262b';
const CHROME = '#dfe4e8';
const ALU = '#c3c9ce';
const DESK = '#f2efe9';
const MAPLE = '#d8b98f';
const NAVY = '#283593';
const CORK = '#c9a27a';
const INK = '#1d1d24';
const SKETCH = '#5aa9e6';
const SKIN = '#fde3cf';
const GIRL_HAIR = '#4b5096';
const UNIFORM = '#7fc8a9';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const TITLE = '달빛 편의점';

/** Lit parts (LEDs, screens' glow): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const cone = (r: number, h: number, seg = 12) => shape(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const ring = (r: number, t: number) => shape(`ring${r},${t}`, () => new THREE.TorusGeometry(r, t, 8, 24));

/** Pictures painted once a key. */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A flat picture facing +z (turned by `ry`, tipped by `rx`), always seen in its own colours. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}
/** A picture lying face up on a top at `y` (its top edge to -z), turned `ry` about the vertical. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, d: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  g.add(m);
  return m;
}
/** Words on a plate, `bg` behind them (or nothing for 'none'). */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}`, cw, ch, (x2) => {
    if (bg !== 'none') {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
    }
    x2.fillStyle = fg;
    x2.font = `bold ${Math.round(ch * 0.62)}px ${FONT}`;
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A group placed and turned in `g` (a tilted screen, a book lying open). */
function frame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Group {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.set(rx, ry, 0, 'YXZ');
  g.add(f);
  return f;
}

/** A spot sat in a chair at (x, z) facing -z (at its desk), and what's done there. */
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48): Spot {
  const s = spot(g, 'sit', x, seat, z, Math.PI, seat);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot stood at (x, z) facing `yaw` (π: at the object, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot, t: number) => {
  const p = s.at.userData.posedAt as number | undefined;
  return p !== undefined && Math.abs(t - p) < 0.6 ? p : null;
};

/** A canvas of its own a piece paints as it's used (the pen display, a sheet being drawn on). */
interface Live {
  ctx: CanvasRenderingContext2D | null;
  tex: THREE.Texture;
  mesh: THREE.Mesh;
}
function live(g: THREE.Object3D, cw: number, ch: number, w: number, h: number, x: number, y: number, z: number, lying = false): Live {
  let ctx: CanvasRenderingContext2D | null = null;
  let tex: THREE.Texture = new THREE.Texture();
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    ctx = c.getContext('2d');
    const ct = new THREE.CanvasTexture(c);
    ct.colorSpace = THREE.SRGBColorSpace;
    ct.anisotropy = 4;
    tex = ct;
  }
  const mesh = lying ? flat(g, tex, w, h, x, y, z) : sheet(g, tex, w, h, x, y, z);
  (mesh.material as THREE.Material).addEventListener('dispose', () => tex.dispose());
  return { ctx, tex, mesh };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (k: number) => THREE.MathUtils.smoothstep(k, 0, 1);
const clamp = THREE.MathUtils.clamp;
/** A rounded rectangle's path. */
function rr(x: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, r: number) {
  x.beginPath();
  x.moveTo(x0 + r, y0);
  x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  x.arcTo(x0, y0 + h, x0, y0, r);
  x.arcTo(x0, y0, x0 + w, y0, r);
  x.closePath();
}

/* ------------------------------------------------------- drawing, line by line */

type Pt = [number, number];
/**
 * One thing put down on a picture: a line drawn along its points, an area filled (the flats, the
 * shading — multiplied over the lines, as a colour layer under 선화 would be), or words lettered into
 * a box. `pace`: how fast the nib goes along a line (units a second), or how long a fill or the words
 * take (seconds). `layer` names it in the drawing program's layer list.
 */
interface Step {
  kind: 'line' | 'fill' | 'text';
  pts: Pt[];
  color: string;
  width?: number;
  alpha?: number;
  op?: GlobalCompositeOperation;
  text?: string;
  size?: number;
  pace?: number;
  layer?: number;
}
/** What's already on the page (`base`) and what's drawn now, in order. */
interface Plan {
  base: Step[];
  steps: Step[];
  /** The brush's size (the brush set-up's test strokes). */
  size?: number;
}
/** A panel's parts by stage. */
interface Subject {
  sketch: Step[];
  ink: Step[];
  flats: Step[];
  shade: Step[];
  words: Step[];
}

const line = (pts: Pt[], width = 1.5, color = INK, pace = 55): Step => ({ kind: 'line', pts, color, width, pace });
const fillOf = (pts: Pt[], color: string, op: GlobalCompositeOperation = 'multiply', alpha = 1, pace = 1.1): Step => ({ kind: 'fill', pts, color, op, alpha, pace });
const words = (x0: number, y0: number, x1: number, y1: number, text: string, size = 9, pace = 1.2, color = INK): Step => ({ kind: 'text', pts: [[x0, y0], [x1, y1]], color, text, size, pace });
const arc = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = Math.PI * 2, n = 24): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return o;
};
const bend = (p0: Pt, c: Pt, p1: Pt, n = 10): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = (1 - k) * (1 - k);
    const b = 2 * k * (1 - k);
    const d = k * k;
    o.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]);
  }
  return o;
};
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
/** A speech balloon: filled white, outlined, its tail, the words. */
const balloon = (cx: number, cy: number, rx: number, ry: number, tail: Pt[], text: string, size: number): Step[] => [
  fillOf(arc(cx, cy, rx, ry), '#ffffff', 'source-over', 1, 0.5),
  line(arc(cx, cy, rx, ry, 0, Math.PI * 2, 28), 1.3, INK, 140),
  line(tail, 1.3, INK, 80),
  fillOf(tail, '#ffffff', 'source-over', 1, 0.2),
  words(cx - rx * 0.86, cy - ry * 0.6, cx + rx * 0.86, cy + ry * 0.6, text, size),
];
const lenOf = (pts: Pt[]) => {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
};
const bounds = (pts: Pt[]) => {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  return [x0, y0, x1, y1];
};
function along(pts: Pt[], d: number): Pt {
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (left <= l) {
      const k = l ? left / l : 0;
      return [ax + (bx - ax) * k, ay + (by - ay) * k];
    }
    left -= l;
  }
  return pts[pts.length - 1];
}
/** Where the nib is `f` of the way through a step: along a line, scribbling across a fill, along the words. */
function nibOn(s: Step, f: number): Pt {
  if (s.kind === 'line') return along(s.pts, lenOf(s.pts) * f);
  const [x0, y0, x1, y1] = bounds(s.pts);
  if (s.kind === 'text') return [x0 + (x1 - x0) * f, (y0 + y1) / 2 + 1.5 * Math.sin(f * 40)];
  const n = Math.max(2, Math.round((x1 - x0) / 9));
  return [x0 + (x1 - x0) * f, (y0 + y1) / 2 + (y1 - y0) * 0.38 * Math.sin(f * Math.PI * 2 * n)];
}
const stepTime = (s: Step) => (s.kind === 'line' ? Math.max(0.14, lenOf(s.pts) / (s.pace ?? 55)) : (s.pace ?? 1.1));
/** Puts a step down on a picture, or the first `f` of it (a line drawn so far; a fill or words swept in from the left). */
function paintStep(x: CanvasRenderingContext2D, s: Step, f = 1) {
  if (f <= 0 || !s.pts.length) return;
  x.save();
  x.globalAlpha = s.alpha ?? 1;
  x.globalCompositeOperation = s.op ?? 'source-over';
  if (s.kind === 'line') {
    x.strokeStyle = s.color;
    x.lineWidth = s.width ?? 1.4;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    const want = lenOf(s.pts) * f;
    x.beginPath();
    x.moveTo(s.pts[0][0], s.pts[0][1]);
    let d = 0;
    for (let i = 1; i < s.pts.length; i++) {
      const [ax, ay] = s.pts[i - 1];
      const [bx, by] = s.pts[i];
      const l = Math.hypot(bx - ax, by - ay);
      if (d + l >= want) {
        const k = l ? (want - d) / l : 0;
        x.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k);
        break;
      }
      x.lineTo(bx, by);
      d += l;
    }
    x.stroke();
  } else {
    const [x0, y0, x1, y1] = bounds(s.pts);
    if (f < 1) {
      x.beginPath();
      x.rect(x0 - 2, y0 - 2, (x1 - x0 + 4) * f, y1 - y0 + 4);
      x.clip();
    }
    x.fillStyle = s.color;
    if (s.kind === 'fill') {
      x.beginPath();
      s.pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
      x.closePath();
      x.fill();
    } else {
      x.font = `bold ${s.size ?? 9}px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(s.text ?? '', (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0);
    }
  }
  x.restore();
}
const paintAll = (x: CanvasRenderingContext2D, steps: Step[]) => steps.forEach((s) => paintStep(x, s));

/**
 * A plan drawn out over time, one step after another: the nib goes through the air to where the next
 * line starts (lifted), goes down and draws it; when the plan's done it's looked over a moment, then
 * the next plan comes on (the page scrolled on to the next panel, or a fresh sheet).
 */
class Drawer {
  plan: Plan;
  prev: Plan | null = null;
  i = 0;
  f = 0;
  state: 'move' | 'draw' | 'rest' | 'turn' = 'move';
  k = 0;
  from: Pt = [0, 0];
  nib: Pt = [0, 0];
  lift = 1;
  constructor(readonly make: (n: number) => Plan, public n: number, part0: number, readonly time = { rest: 1.8, turn: 1, hop: 0.28 }) {
    this.plan = make(n);
    this.i = Math.floor(this.plan.steps.length * part0);
    const s = this.plan.steps[Math.max(0, this.i - 1)];
    if (s) this.from = this.nib = nibOn(s, this.i > 0 ? 1 : 0);
  }
  get step(): Step | undefined {
    return this.plan.steps[this.i];
  }
  /** How far through the plan, 0–1. */
  get progress() {
    return clamp((this.i + (this.state === 'draw' ? this.f : 0)) / Math.max(1, this.plan.steps.length), 0, 1);
  }
  /** Moves on `dt` seconds; whether the picture changed. */
  update(dt: number, speed = 1): boolean {
    let left = dt * speed;
    let changed = false;
    for (let guard = 0; left > 1e-6 && guard < 16; guard++) {
      const s = this.plan.steps[this.i];
      if (this.state === 'move') {
        if (!s) {
          this.state = 'rest';
          this.k = 0;
          continue;
        }
        const need = (1 - this.k) * this.time.hop;
        if (left < need) {
          this.k += left / this.time.hop;
          left = 0;
        } else {
          left -= need;
          this.state = 'draw';
          this.f = 0;
        }
      } else if (this.state === 'draw') {
        if (!s) {
          this.state = 'rest';
          this.k = 0;
          continue;
        }
        const T = stepTime(s);
        const need = (1 - this.f) * T;
        changed = true;
        if (left < need) {
          this.f += left / T;
          left = 0;
        } else {
          left -= need;
          this.from = nibOn(s, 1);
          this.i++;
          this.f = 0;
          this.k = 0;
          this.state = 'move';
        }
      } else if (this.state === 'rest') {
        const need = (1 - this.k) * this.time.rest;
        if (left < need) {
          this.k += left / this.time.rest;
          left = 0;
        } else {
          left -= need;
          this.prev = this.plan;
          this.n++;
          this.plan = this.make(this.n);
          this.i = 0;
          this.k = 0;
          this.state = 'turn';
          changed = true;
        }
      } else {
        const need = (1 - this.k) * this.time.turn;
        changed = true;
        if (left < need) {
          this.k += left / this.time.turn;
          left = 0;
        } else {
          left -= need;
          this.k = 0;
          this.state = 'move';
        }
      }
    }
    const s = this.plan.steps[this.i];
    if (this.state === 'draw' && s) {
      this.nib = nibOn(s, this.f);
      this.lift = 0;
    } else if (this.state === 'move' && s) {
      const to = nibOn(s, 0);
      const e = smooth(this.k);
      this.nib = [this.from[0] + (to[0] - this.from[0]) * e, this.from[1] + (to[1] - this.from[1]) * e];
      this.lift = Math.sin(Math.PI * this.k);
    } else {
      this.nib = this.from;
      this.lift = this.state === 'rest' ? Math.min(1, this.k * 3) : 1;
    }
    return changed;
  }
  /** Paints a plan: what's down so far (all of it for one that's done). */
  paint(x: CanvasRenderingContext2D, plan = this.plan) {
    paintAll(x, plan.base);
    const now = plan === this.plan;
    const upto = now ? this.i : plan.steps.length;
    for (let j = 0; j < upto && j < plan.steps.length; j++) paintStep(x, plan.steps[j]);
    if (now && this.state === 'draw' && plan.steps[this.i]) paintStep(x, plan.steps[this.i], this.f);
  }
}

/* -------------------------------------------------- the episode's panels (200 × 140) */

/** Stages a subject's steps into the drawing program's layers (말풍선, 명암, 채색, 선화, 배경, 콘티). */
const onLayer = (steps: Step[], layer: number) => steps.map((s) => ({ ...s, layer }));
/** The 콘티 under the 선화: the same lines, quick and loose, in blue. */
function sketchOf(ink: Step[], seed: number): Step[] {
  const r = rng(seed);
  return ink.map((s) => ({ kind: 'line' as const, pts: s.pts.map(([x, y]) => [x + (r() - 0.5) * 2.6, y + (r() - 0.5) * 2.6] as Pt), color: SKETCH, width: 1, alpha: 0.65, pace: 170, layer: 5 }));
}
function subject(ink: Step[], flats: Step[], shadeSteps: Step[], wordSteps: Step[], seed: number): Subject {
  return { sketch: sketchOf(ink, seed), ink: onLayer(ink, 3), flats: onLayer(flats, 2), shade: onLayer(shadeSteps, 1), words: onLayer(wordSteps, 0) };
}

/** 한달빛 at the till, close up: "어서 오세요~!" */
function heroine(): Subject {
  const face = [...bend([74, 60], [76, 100], [100, 112]), ...bend([100, 112], [124, 100], [126, 60]).slice(1)];
  const hair = arc(100, 66, 35, 38, Math.PI * 1.02, Math.PI * 1.98, 20);
  const bangs: Pt[] = [[132, 66], [124, 52], [118, 70], [110, 50], [102, 70], [94, 50], [86, 70], [78, 52], [68, 66]];
  const pony = [...bend([131, 42], [172, 44], [160, 96]), ...bend([160, 96], [150, 62], [134, 54]).slice(1)];
  const shirt: Pt[] = [[40, 140], [62, 124], [93, 124], [100, 136], [107, 124], [138, 124], [160, 140]];
  const eye = (cx: number) => [line(arc(cx, 80, 7.5, 6, Math.PI * 1.05, Math.PI * 1.95, 10), 2.4), line(arc(cx, 82, 6, 7.5, 0, Math.PI * 2, 16), 1.2)];
  const ink = [
    line(rect(1, 1, 199, 139), 2.2, INK, 110),
    line(face, 1.7),
    line(hair, 1.7),
    line(bangs, 1.5),
    line(pony, 1.5),
    line(arc(133, 46, 5, 5, 0, Math.PI * 2, 12), 1.3),
    ...eye(88),
    ...eye(112),
    line([[79, 68], [95, 66]], 1.6),
    line([[105, 66], [121, 68]], 1.6),
    line([[100, 88], [98, 94], [102, 95]], 1.1),
    line(arc(100, 99, 6, 3.5, Math.PI * 0.15, Math.PI * 0.85, 10), 1.4),
    line([[93, 108], [93, 124]], 1.4),
    line([[107, 108], [107, 124]], 1.4),
    line(bend([40, 140], [62, 122], [93, 124]), 1.6),
    line(bend([107, 124], [138, 122], [160, 140]), 1.6),
    line([[93, 124], [100, 136], [107, 124]], 1.4),
    line([[76, 128], [82, 140]], 1.3),
    line([[124, 128], [118, 140]], 1.3),
    line(rect(122, 128, 138, 137), 1.1),
  ];
  const flats = [
    fillOf(face, SKIN),
    fillOf([[93, 106], [107, 106], [107, 125], [93, 125]], SKIN),
    fillOf([...hair, ...bangs], GIRL_HAIR),
    fillOf(pony, GIRL_HAIR),
    fillOf(arc(88, 83, 4.6, 6, 0, Math.PI * 2, 14), '#7a5cc4', 'multiply', 1, 0.5),
    fillOf(arc(112, 83, 4.6, 6, 0, Math.PI * 2, 14), '#7a5cc4', 'multiply', 1, 0.5),
    fillOf(shirt, UNIFORM),
    fillOf([[76, 128], [82, 140], [118, 140], [124, 128]], NAVY, 'multiply', 0.85),
  ];
  const shadeSteps = [
    fillOf([[74, 60], [126, 60], [124, 72], [112, 66], [100, 72], [88, 66], [76, 72]], '#eab3a0', 'multiply', 0.8, 0.8),
    fillOf([[93, 108], [107, 108], [107, 117], [93, 113]], '#e2a493', 'multiply', 0.8, 0.6),
    fillOf(arc(84, 93, 5, 2.5), '#f59aa5', 'multiply', 0.6, 0.5),
    fillOf(arc(116, 93, 5, 2.5), '#f59aa5', 'multiply', 0.6, 0.5),
    { ...line(arc(100, 62, 25, 23, Math.PI * 1.2, Math.PI * 1.45, 8), 3, '#ffffff', 80), alpha: 0.8 },
    fillOf(arc(86, 80, 1.7, 1.7, 0, Math.PI * 2, 8), '#ffffff', 'source-over', 1, 0.25),
    fillOf(arc(110, 80, 1.7, 1.7, 0, Math.PI * 2, 8), '#ffffff', 'source-over', 1, 0.25),
  ];
  return subject(ink, flats, shadeSteps, balloon(40, 24, 32, 15, [[54, 36], [70, 50], [62, 37]], '어서 오세요~!', 9.5), 11);
}

/** The store at night, the moon over it, someone coming: "그날 밤, 손님이 왔다." */
function store(): Subject {
  const stars: Pt[] = [[20, 16], [62, 10], [118, 20], [142, 34], [92, 30]];
  const ink = [
    line(rect(1, 1, 199, 139), 2.2, INK, 110),
    line([[0, 116], [200, 116]], 1.4, INK, 120),
    line(rect(30, 46, 170, 52), 1.4),
    line(rect(36, 52, 164, 116), 1.6),
    line(rect(40, 56, 160, 70), 1.3),
    line(rect(42, 76, 92, 112), 1.3),
    line(rect(96, 76, 124, 116), 1.3),
    line(rect(128, 76, 158, 112), 1.3),
    line([[44, 88], [90, 88]], 1),
    line([[44, 100], [90, 100]], 1),
    line([[130, 88], [156, 88]], 1),
    line([[130, 100], [156, 100]], 1),
    line(arc(172, 22, 12, 12, 0, Math.PI * 2, 20), 1.4),
    ...stars.flatMap(([x, y]) => [line([[x - 3, y], [x + 3, y]], 1, INK, 60), line([[x, y - 3], [x, y + 3]], 1, INK, 60)]),
    line(arc(18, 92, 4, 4, 0, Math.PI * 2, 12), 1.3),
    line([[18, 96], [18, 108]], 1.4),
    line([[18, 108], [14, 116]], 1.3),
    line([[18, 108], [22, 116]], 1.3),
    line([[18, 99], [13, 106]], 1.2),
    line([[188, 36], [188, 116]], 2),
    line([[182, 42], [194, 42]], 1.6),
    line(bend([188, 44], [120, 62], [0, 46]), 1),
  ];
  const flats = [
    fillOf([[0, 0], [200, 0], [200, 116], [164, 116], [164, 52], [170, 52], [170, 46], [30, 46], [30, 52], [36, 52], [36, 116], [0, 116]], '#39407a'),
    fillOf(arc(172, 22, 11, 11), '#fff1a8', 'source-over', 1, 0.6),
    fillOf(rect(30, 46, 170, 52), '#5c6bc0'),
    fillOf(rect(36, 52, 164, 116), '#ebe5d8'),
    fillOf(rect(40, 56, 160, 70), '#ffd54f'),
    fillOf(rect(42, 76, 92, 112), '#fff0b0'),
    fillOf(rect(96, 76, 124, 116), '#cfe8f5'),
    fillOf(rect(128, 76, 158, 112), '#fff0b0'),
    fillOf([[0, 116], [200, 116], [200, 140], [0, 140]], '#575c70'),
  ];
  const shadeSteps = [
    fillOf([[42, 116], [124, 116], [136, 136], [30, 136]], '#ffe9a0', 'screen', 0.7, 0.8),
    fillOf(rect(150, 52, 164, 116), '#bdb6cf', 'multiply', 0.7, 0.6),
    fillOf(arc(172, 22, 17, 17), '#fff6c8', 'screen', 0.35, 0.6),
  ];
  const wordSteps = [
    words(40, 56, 160, 70, '달빛 편의점 24', 9, 1),
    fillOf(rect(6, 6, 100, 24), '#ffffff', 'source-over', 1, 0.4),
    line(rect(6, 6, 100, 24), 1.1, INK, 140),
    words(8, 7, 98, 23, '그날 밤, 손님이 왔다.', 8),
  ];
  return subject(ink, flats, shadeSteps, wordSteps, 23);
}

/** The last 삼각김밥 held up, shining: "…이게 마지막 하나예요." */
function onigiri(): Subject {
  const tri: Pt[] = [[96, 40], [104, 40], [142, 104], [136, 112], [64, 112], [58, 104], [96, 40]];
  const hand: Pt[] = [...bend([118, 140], [126, 124], [140, 116]), ...bend([140, 116], [152, 108], [146, 100]).slice(1), ...bend([146, 100], [160, 104], [162, 140]).slice(1)];
  const rays: Step[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    rays.push(line([[100 + Math.cos(a) * 52, 80 + Math.sin(a) * 44], [100 + Math.cos(a) * 62, 80 + Math.sin(a) * 52]], 1.2, INK, 110));
  }
  const focus: Step[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const [ex, ey] = [100 + Math.cos(a) * 140, 76 + Math.sin(a) * 110];
    const [bx, by] = [clamp(ex, 2, 198), clamp(ey, 2, 138)];
    focus.push(line([[bx, by], [bx + (100 - bx) * 0.16, by + (76 - by) * 0.16]], 0.8, INK, 140));
  }
  const ink = [line(rect(1, 1, 199, 139), 2.2, INK, 110), line(tri, 1.8), line(rect(86, 86, 114, 112), 1.4), line(rect(90, 94, 110, 100), 1), line(hand, 1.6), ...rays, ...focus];
  const flats = [fillOf(rect(0, 0, 200, 140), '#fff3d0'), fillOf(rect(86, 86, 114, 112), '#2f3d36'), fillOf(rect(90, 94, 110, 100), '#e53935', 'source-over', 1, 0.4), fillOf(hand, SKIN)];
  const shadeSteps = [
    fillOf([[104, 40], [142, 104], [136, 112], [118, 112]], '#e6e0d4', 'multiply', 1, 0.7),
    fillOf([[140, 116], [152, 108], [150, 122], [142, 126]], '#eab3a0', 'multiply', 0.8, 0.5),
    fillOf(arc(100, 78, 44, 42), '#fff59d', 'screen', 0.35, 0.8),
  ];
  return subject(ink, flats, shadeSteps, balloon(50, 22, 40, 14, [[68, 34], [84, 48], [76, 35]], '…이게 마지막 하나예요.', 8), 37);
}

/** The assistant's background: the street outside the store, drawn to its vanishing point, a 전봇대 and its wires. */
function street(): Subject {
  const VP: Pt = [100, 62];
  const toVP = (x0: number, y0: number, x: number): Pt => [x, y0 + ((VP[1] - y0) * (x - x0)) / (VP[0] - x0)];
  const guides: Step[] = [[0, 0], [0, 50], [0, 140], [60, 140], [140, 140], [200, 140], [200, 50], [200, 0]].map(([x, y]) => ({ ...line([VP, [x, y]], 0.8, SKETCH, 260), alpha: 0.6, layer: 5 }));
  const leftTop = (x: number) => toVP(0, 10, x)[1];
  const leftBot = (x: number) => toVP(0, 122, x)[1];
  const rightTop = (x: number) => toVP(200, 24, x)[1];
  const rightBot = (x: number) => toVP(200, 122, x)[1];
  const ruler = (pts: Pt[], w = 1.1) => line(pts, w, INK, 95);
  const ink: Step[] = [
    line(rect(1, 1, 199, 139), 2.2, INK, 110),
    ruler([[0, 10], [86, leftTop(86)]]),
    ruler([[0, 122], [86, leftBot(86)]]),
    ...[22, 48, 68, 86].map((x) => ruler([[x, leftTop(x)], [x, leftBot(x)]])),
    ...[40, 66, 92].map((y0) => ruler([[0, y0], toVP(0, y0, 86)], 0.8)),
    ruler([[200, 24], [116, rightTop(116)]]),
    ruler([[200, 122], [116, rightBot(116)]]),
    ...[178, 150, 128, 116].map((x) => ruler([[x, rightTop(x)], [x, rightBot(x)]])),
    ruler([[200, 56], toVP(200, 56, 128)], 1),
    ruler([[200, 70], toVP(200, 70, 128)], 1),
    ruler([[90, 68], [24, 140]]),
    ruler([[110, 68], [176, 140]]),
    ...[[0.18, 0.28], [0.38, 0.5], [0.62, 0.78], [0.88, 1]].map(([a, b]) => ruler([[100, 62 + 78 * a], [100, 62 + 78 * b]], 1.6)),
    ruler(rect(90, 48, 98, 68), 0.9),
    ruler(rect(102, 52, 112, 68), 0.9),
    line([[176, 4], [176, 130]], 2.2, INK, 90),
    line([[166, 14], [186, 14]], 1.5, INK, 90),
    line(bend([176, 16], [140, 40], [104, 56]), 0.8, INK, 90),
    line(bend([176, 22], [138, 46], [104, 58]), 0.8, INK, 90),
    line(bend([176, 16], [110, 32], [0, 8]), 0.8, INK, 90),
  ];
  const flats = [
    fillOf([[0, 0], [200, 0], [200, 24], [116, rightTop(116)], [86, leftTop(86)], [0, 10]], '#cfe6f7'),
    fillOf([[0, 10], [86, leftTop(86)], [86, leftBot(86)], [0, 122]], '#efe6d6'),
    fillOf([[200, 24], [116, rightTop(116)], [116, rightBot(116)], [200, 122]], '#e2dcef'),
    fillOf([[90, 68], [110, 68], [176, 140], [24, 140]], '#b8bac4'),
    fillOf([[0, 122], [86, leftBot(86)], [90, 68], [24, 140], [0, 140]], '#d7d2c8'),
    fillOf([[110, 68], [116, rightBot(116)], [200, 122], [200, 140], [176, 140]], '#d7d2c8'),
    fillOf([[200, 56], toVP(200, 56, 128), toVP(200, 70, 128), [200, 70]], '#ff8a65'),
    fillOf([[90, 48], [98, 48], [98, 68], [90, 68]], '#b0bec5'),
  ];
  const shadeSteps = [fillOf([[0, 10], [86, leftTop(86)], [86, leftBot(86)], [0, 122]], '#c9c3d9', 'multiply', 0.45, 0.9), fillOf([[176, 130], [150, 140], [158, 140]], '#6d6f7a', 'multiply', 0.6, 0.3)];
  const s = subject(ink, flats, shadeSteps, [], 41);
  return { ...s, sketch: guides, ink: onLayer(ink, 4), flats: onLayer(flats, 4), shade: onLayer(shadeSteps, 4) };
}

let panelsMade: Subject[] | null = null;
const PANELS = () => (panelsMade ??= [store(), heroine(), onigiri()]);
let streetMade: Subject | null = null;
const STREET = () => (streetMade ??= street());
const finalOf = (s: Subject) => [...s.ink, ...s.flats, ...s.shade, ...s.words];

/** What's drawn at the pen display, by which use it is. */
type Mode = 'episode' | 'color' | 'upload' | 'background' | 'brush';
const BRUSH_SIZES = [1.2, 2.2, 3.4, 5, 7];
const PLANS: Record<Mode, (n: number) => Plan> = {
  // 원고: the 콘티 sketched in blue, then the 선화 over it.
  episode: (n) => {
    const s = PANELS()[n % 3];
    return { base: [], steps: [...s.sketch, ...s.ink] };
  },
  // 채색: the flats under the lines, then the shading.
  color: (n) => {
    const s = PANELS()[n % 3];
    return { base: s.ink, steps: [...s.flats, ...s.shade] };
  },
  // 마감: the last shading and the lettering, then up it goes.
  upload: (n) => {
    const s = PANELS()[n % 3];
    return { base: [...s.ink, ...s.flats], steps: [...s.shade, ...s.words] };
  },
  // 배경 보조: the street to its vanishing point, ruled and coloured.
  background: () => {
    const s = STREET();
    return { base: [], steps: [...s.sketch, ...s.ink, ...s.flats, ...s.shade] };
  },
  // 브러시 세팅: test strokes, each pad at the next size.
  brush: (n) => {
    const size = BRUSH_SIZES[n % BRUSH_SIZES.length];
    const steps: Step[] = [];
    for (let k = 0; k < 5; k++) {
      const pts: Pt[] = [];
      for (let i = 0; i <= 30; i++) pts.push([20 + (i * 160) / 30, 24 + k * 23 + 7 * Math.sin((i / 30) * Math.PI * 2 + k)]);
      steps.push({ ...line(pts, size, k % 2 ? INK : '#3949ab', 85), layer: 3 });
    }
    return { base: [], steps, size };
  },
};

/* ------------------------------------------------------------ the pen display's screen */

/** The screen's picture (pixels) and where the page's current panel sits on it. */
const SC = { w: 512, h: 320, top: 20, left: 30, right: 404, px: 117, py: 100, gap: 160 };
const LAYERS = ['말풍선', '명암', '채색', '선화', '배경', '콘티'];

/** A little white glyph for each tool in the toolbar. */
function toolGlyph(x: CanvasRenderingContext2D, i: number, cx: number, cy: number) {
  x.strokeStyle = '#eceff1';
  x.fillStyle = '#eceff1';
  x.lineWidth = 1.4;
  x.beginPath();
  switch (i) {
    case 0:
      x.moveTo(cx - 5, cy + 5);
      x.lineTo(cx + 5, cy - 5);
      x.stroke();
      break;
    case 1:
      x.strokeRect(cx - 5, cy - 3, 10, 6);
      break;
    case 2:
      x.moveTo(cx - 5, cy + 4);
      x.lineTo(cx, cy - 5);
      x.lineTo(cx + 5, cy + 4);
      x.closePath();
      x.stroke();
      break;
    case 3:
      x.font = `bold 11px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('T', cx, cy + 1);
      break;
    case 4:
      x.ellipse(cx, cy, 6, 4, 0, 0, Math.PI * 2);
      x.stroke();
      break;
    case 5:
      x.arc(cx, cy, 4, 0, Math.PI * 2);
      x.stroke();
      x.beginPath();
      x.moveTo(cx + 3, cy + 3);
      x.lineTo(cx + 6, cy + 6);
      x.stroke();
      break;
    case 6:
      x.strokeRect(cx - 7, cy - 2, 14, 4);
      break;
    default:
      x.moveTo(cx - 4, cy + 5);
      x.lineTo(cx + 3, cy - 2);
      x.stroke();
      x.fillRect(cx + 2, cy - 5, 3, 3);
  }
}

/** The drawing program on the pen display: the page, its panels, the toolbar, the colour wheel and layers. */
function paintDesk(x: CanvasRenderingContext2D, mode: Mode, d: Drawer, t: number) {
  const { w, h, top, left, right } = SC;
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#5d616b';
  x.fillRect(0, 0, w, h);
  // The page: a long white strip, the panels down it.
  x.fillStyle = '#ffffff';
  x.fillRect(SC.px - 6, top, 212, h - top);
  const e = d.state === 'turn' && mode !== 'brush' ? smooth(d.k) : 1;
  const cur = SC.py + SC.gap * (1 - e);
  const panel = (plan: Plan, y: number) => {
    x.save();
    x.translate(SC.px, y);
    x.beginPath();
    x.rect(0, 0, 200, 140);
    x.clip();
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 200, 140);
    d.paint(x, plan);
    x.restore();
  };
  x.save();
  x.beginPath();
  x.rect(left, top, right - left, h - top);
  x.clip();
  if (mode !== 'brush') {
    if (d.prev) panel(d.prev, cur - SC.gap);
    x.strokeStyle = '#cfd3da';
    x.lineWidth = 1;
    x.setLineDash([4, 3]);
    x.strokeRect(SC.px, cur + SC.gap, 200, 140);
    x.setLineDash([]);
  }
  panel(d.plan, cur);
  x.restore();
  const s = d.step;
  const layer = s?.layer ?? 3;
  // The title bar (at the deadline: red, the clock and the upload).
  const rush = mode === 'upload';
  x.fillStyle = rush ? '#b71c1c' : '#202227';
  x.fillRect(0, 0, w, top);
  for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) {
    x.fillStyle = c;
    x.beginPath();
    x.arc(9 + i * 9, top / 2, 3, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = '#eceff1';
  x.font = `bold 10px ${FONT}`;
  x.textAlign = 'left';
  x.textBaseline = 'middle';
  const done = d.state === 'rest' || d.state === 'turn';
  const mm = String(12 + (Math.floor(t / 5) % 40)).padStart(2, '0');
  const title = rush
    ? `마감 D-0  23:${mm}  ·  47화 ${done ? '업로드 완료!' : `업로드 준비 ${Math.round(d.progress * 100)}%`}`
    : mode === 'background'
      ? `${TITLE}_47화_배경.clip — 배경`
      : mode === 'brush'
        ? '브러시 설정 · G펜'
        : `${TITLE}_47화_원고.clip — ${LAYERS[layer]}`;
  x.fillText(title, 40, top / 2 + 1, 300);
  if (rush) {
    x.fillStyle = '#ffcdd2';
    x.fillRect(352, 6, 150, 8);
    x.fillStyle = done ? '#69f0ae' : '#ffffff';
    x.fillRect(352, 6, 150 * (done ? 1 : d.progress), 8);
  }
  // The toolbar, the tool in hand lit.
  x.fillStyle = '#2b2d33';
  x.fillRect(0, top, left, h - top);
  const tool = s?.kind === 'fill' ? 2 : s?.kind === 'text' ? 3 : mode === 'background' ? 6 : 0;
  for (let i = 0; i < 9; i++) {
    const y = top + 6 + i * 24;
    x.fillStyle = i === tool ? '#4f6bd8' : '#3a3d45';
    x.fillRect(5, y, 20, 20);
    toolGlyph(x, i, 15, y + 10);
  }
  // The colour wheel, the colour in use; the layers, the one drawn on lit.
  x.fillStyle = '#2b2d33';
  x.fillRect(right, top, w - right, h - top);
  for (let k = 0; k < 24; k++) {
    x.strokeStyle = `hsl(${k * 15},80%,55%)`;
    x.lineWidth = 9;
    x.beginPath();
    x.arc(458, 64, 30, (k / 24) * Math.PI * 2, ((k + 1) / 24) * Math.PI * 2 + 0.03);
    x.stroke();
  }
  x.fillStyle = s?.color === SKETCH ? SKETCH : (s?.color ?? INK);
  x.fillRect(446, 52, 24, 24);
  x.strokeStyle = '#ffffff';
  x.lineWidth = 1;
  x.strokeRect(446, 52, 24, 24);
  x.font = `9px ${FONT}`;
  x.textAlign = 'left';
  x.textBaseline = 'middle';
  for (let i = 0; i < LAYERS.length; i++) {
    const y = 108 + i * 18;
    x.fillStyle = i === layer ? '#4f6bd8' : '#363940';
    x.fillRect(408, y, 100, 16);
    x.fillStyle = '#90a4ae';
    x.beginPath();
    x.arc(416, y + 8, 3, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#eceff1';
    x.fillText(LAYERS[i], 424, y + 8.5);
  }
  // The navigator: the whole episode, small.
  x.fillStyle = '#1f2125';
  x.fillRect(408, 228, 100, 86);
  x.fillStyle = '#ffffff';
  x.fillRect(446, 232, 24, 78);
  for (let i = 0; i < 5; i++) {
    x.fillStyle = ['#39407a', SKIN, '#fff3d0', '#cfe6f7', '#7fc8a9'][i];
    x.fillRect(448, 235 + i * 15, 20, 11);
  }
  x.strokeStyle = '#ff5252';
  x.strokeRect(445, 250, 26, 18);
  // Setting the brush: its dialog beside the page.
  if (mode === 'brush') {
    const size = d.plan.size ?? 2;
    x.fillStyle = '#eceff1';
    x.fillRect(330, 34, 70, 132);
    x.fillStyle = '#263238';
    x.font = `bold 10px ${FONT}`;
    x.fillText('G펜', 336, 46);
    x.font = `9px ${FONT}`;
    x.fillText('브러시 크기', 336, 64);
    x.fillStyle = '#90a4ae';
    x.fillRect(336, 76, 58, 3);
    x.fillStyle = '#3949ab';
    x.beginPath();
    x.arc(336 + 58 * ((size - 1) / 6), 77.5, 5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#263238';
    x.fillText(`${size.toFixed(1)} px`, 336, 94);
    x.fillText('손떨림 보정 8', 336, 112);
    x.fillText('필압 ✓', 336, 128);
    x.beginPath();
    x.arc(365, 150, size + 1, 0, Math.PI * 2);
    x.fill();
  }
}

/** The episode as readers scroll it on a phone: the app's header, the panels in colour, the end. */
let stripCanvas: THREE.Texture | null = null;
function stripTex(): THREE.Texture {
  return (stripCanvas ??= canvasTexture(128, 512, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 128, 512);
    x.fillStyle = '#202227';
    x.fillRect(0, 0, 128, 34);
    x.fillStyle = '#ffffff';
    x.font = `bold 10px ${FONT}`;
    x.textBaseline = 'middle';
    x.fillText(`${TITLE} 47화`, 8, 12);
    x.font = `8px ${FONT}`;
    x.fillStyle = '#b0bec5';
    x.fillText('마지막 삼각김밥 · ★9.97', 8, 25);
    const subs = [...PANELS(), STREET()];
    subs.forEach((s, i) => {
      x.save();
      x.translate(8, 40 + i * 98);
      x.scale(0.56, 0.56);
      x.beginPath();
      x.rect(0, 0, 200, 140);
      x.clip();
      paintAll(x, finalOf(s));
      x.restore();
    });
    x.fillStyle = '#263238';
    x.font = `bold 10px ${FONT}`;
    x.textAlign = 'center';
    x.fillText('다음 화에 계속…', 64, 446);
    x.fillStyle = '#e91e63';
    x.font = `9px ${FONT}`;
    x.fillText('좋아요 48,211 · 💬 1,284', 64, 466);
    x.fillStyle = '#eceff1';
    x.fillRect(16, 480, 96, 22);
    x.fillStyle = '#607d8b';
    x.fillText('다음 화 보기 ›', 64, 491);
  }));
}

/* ---------------------------------------------------- the boards' sheets (256 × 192) */

const MARKER = '#263238';
/** A 콘티 sheet: four cuts, each a quick drawing in its frame, the shot written under it. */
function contiPlan(n: number): Plan {
  const m = (pts: Pt[], w = 1.6, c = MARKER, pace = 70) => line(pts, w, c, pace);
  const cuts: Array<(ox: number, oy: number) => Step[]> = [
    // A close-up: a face to the frame.
    (ox, oy) => [m(arc(ox + 55, oy + 34, 16, 19)), m([[ox + 39, oy + 30], [ox + 46, oy + 18], [ox + 55, oy + 26], [ox + 64, oy + 16], [ox + 71, oy + 30]]), m([[ox + 49, oy + 36], [ox + 51, oy + 36]], 2), m([[ox + 59, oy + 36], [ox + 61, oy + 36]], 2), m(arc(ox + 55, oy + 44, 4, 2, 0, Math.PI, 8)), m(bend([ox + 30, oy + 62], [ox + 42, oy + 50], [ox + 55, oy + 54])), m(bend([ox + 55, oy + 54], [ox + 68, oy + 50], [ox + 80, oy + 62]))],
    // A full shot: someone at the store's door.
    (ox, oy) => [m([[ox + 4, oy + 52], [ox + 106, oy + 52]], 1.2), m(rect(ox + 50, oy + 16, ox + 98, oy + 52), 1.3), m(rect(ox + 66, oy + 28, ox + 80, oy + 52), 1.1), m(arc(ox + 30, oy + 26, 5, 5)), m([[ox + 30, oy + 31], [ox + 30, oy + 43], [ox + 26, oy + 52]]), m([[ox + 30, oy + 43], [ox + 34, oy + 52]]), line([[ox + 10, oy + 8], [ox + 40, oy + 8], [ox + 35, oy + 4]], 1.4, '#e53935', 90)],
    // Over the shoulder: a big shoulder close, the other across the counter.
    (ox, oy) => [m(bend([ox + 2, oy + 62], [ox + 10, oy + 20], [ox + 40, oy + 22]), 2.2), m(bend([ox + 40, oy + 22], [ox + 46, oy + 40], [ox + 44, oy + 62]), 2.2), m(arc(ox + 76, oy + 26, 9, 10)), m(bend([ox + 62, oy + 50], [ox + 76, oy + 34], [ox + 90, oy + 50])), m([[ox + 50, oy + 50], [ox + 108, oy + 50]], 1.2)],
    // An insert: the 삼각김밥, shining.
    (ox, oy) => [m([[ox + 55, oy + 12], [ox + 76, oy + 50], [ox + 34, oy + 50], [ox + 55, oy + 12]], 1.8), m(rect(ox + 49, oy + 36, ox + 61, oy + 50), 1.2), ...[0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return m([[ox + 55 + Math.cos(a) * 28, oy + 34 + Math.sin(a) * 22], [ox + 55 + Math.cos(a) * 36, oy + 34 + Math.sin(a) * 27]], 1.1); })],
  ];
  const shots = ['클로즈업', '풀샷', '오버숄더', '인서트'];
  const at: Pt[] = [[12, 26], [134, 26], [12, 108], [134, 108]];
  const steps: Step[] = [];
  at.forEach(([ox, oy], i) => {
    const k = (i + n) % 4;
    steps.push(line(rect(ox, oy, ox + 110, oy + 64), 2, MARKER, 120), ...cuts[k](ox, oy), words(ox, oy + 66, ox + 110, oy + 78, `컷${i + 1} · ${shots[k]}`, 9, 0.9, MARKER));
  });
  return { base: [words(8, 4, 248, 20, `콘티 · 씬 ${12 + (n % 9)}`, 12, 0.1, '#37474f')], steps };
}
/** A sheet of expressions: four heads, each feeling something, the feeling written under it. */
function facesPlan(n: number): Plan {
  const m = (pts: Pt[], w = 1.6, c = MARKER, pace = 60) => line(pts, w, c, pace);
  const girl = n % 2 === 0;
  const feel = ['기쁨', '분노', '슬픔', '놀람'];
  const steps: Step[] = [];
  const at: Pt[] = [[70, 66], [186, 66], [70, 142], [186, 142]];
  at.forEach(([cx, cy], i) => {
    steps.push(m(arc(cx, cy, 22, 24, 0, Math.PI * 2, 26), 1.8));
    if (girl) steps.push(m([[cx - 23, cy - 2], [cx - 16, cy - 16], [cx - 8, cy - 6], [cx, cy - 18], [cx + 8, cy - 6], [cx + 16, cy - 16], [cx + 23, cy - 2]]), m(bend([cx + 18, cy - 18], [cx + 40, cy - 16], [cx + 34, cy + 16])));
    else steps.push(m([[cx - 24, cy - 6], [cx - 20, cy - 30], [cx - 10, cy - 18], [cx - 2, cy - 34], [cx + 6, cy - 18], [cx + 16, cy - 32], [cx + 18, cy - 14], [cx + 26, cy - 22], [cx + 23, cy - 4]]));
    switch (i) {
      case 0:
        steps.push(m(arc(cx - 8, cy + 3, 4, 3, Math.PI, Math.PI * 2, 8)), m(arc(cx + 8, cy + 3, 4, 3, Math.PI, Math.PI * 2, 8)), m(arc(cx, cy + 11, 7, 6, 0, Math.PI, 10)));
        break;
      case 1:
        steps.push(m([[cx - 13, cy - 4], [cx - 4, cy + 1]], 2), m([[cx + 13, cy - 4], [cx + 4, cy + 1]], 2), m([[cx - 7, cy + 5], [cx - 5, cy + 5]], 2.4), m([[cx + 5, cy + 5], [cx + 7, cy + 5]], 2.4), m([[cx - 6, cy + 14], [cx - 2, cy + 12], [cx + 2, cy + 14], [cx + 6, cy + 12]]), line([[cx + 14, cy - 22], [cx + 22, cy - 14]], 1.6, '#e53935', 70), line([[cx + 22, cy - 22], [cx + 14, cy - 14]], 1.6, '#e53935', 70));
        break;
      case 2:
        steps.push(m([[cx - 12, cy - 2], [cx - 4, cy - 5]]), m([[cx + 12, cy - 2], [cx + 4, cy - 5]]), m(arc(cx - 8, cy + 4, 4, 2.5, 0, Math.PI, 8)), m(arc(cx + 8, cy + 4, 4, 2.5, 0, Math.PI, 8)), line([[cx - 9, cy + 7], [cx - 10, cy + 16]], 1.4, '#1e88e5', 50), m(arc(cx, cy + 15, 5, 3, Math.PI, Math.PI * 2, 8)));
        break;
      default:
        steps.push(m(arc(cx - 8, cy + 2, 3.5, 4.5, 0, Math.PI * 2, 10)), m(arc(cx + 8, cy + 2, 3.5, 4.5, 0, Math.PI * 2, 10)), m(arc(cx, cy + 13, 3.5, 4.5, 0, Math.PI * 2, 10)), line([[cx - 24, cy - 12], [cx - 27, cy - 5]], 1.4, '#1e88e5', 50));
    }
    steps.push(words(cx - 30, cy + 27, cx + 30, cy + 37, feel[i], 9, 0.7, MARKER));
  });
  return { base: [words(8, 4, 248, 20, girl ? '표정 시트 · 한달빛' : '표정 시트 · 월야', 12, 0.1, '#37474f')], steps };
}
/** A signed copy: a little 한달빛 drawn on the title page, the signature, to the reader, a heart. */
function signPlan(n: number): Plan {
  const m = (pts: Pt[], w = 1.5, c = NAVY, pace = 55) => line(pts, w, c, pace);
  const cx = 86;
  const cy = 34;
  const to = ['To. 별빛님', 'To. 야간조님', 'To. 정주행러님', 'To. 달빛수호대님'][n % 4];
  return {
    base: [],
    steps: [
      m(arc(cx, cy, 13, 14, 0, Math.PI * 2, 22)),
      m([[cx - 14, cy - 1], [cx - 9, cy - 10], [cx - 4, cy - 3], [cx + 1, cy - 12], [cx + 6, cy - 3], [cx + 10, cy - 10], [cx + 14, cy - 1]]),
      m(bend([cx + 10, cy - 11], [cx + 26, cy - 10], [cx + 22, cy + 10])),
      m(arc(cx - 5, cy + 2, 2.5, 2, Math.PI, Math.PI * 2, 6)),
      m(arc(cx + 5, cy + 2, 2.5, 2, Math.PI, Math.PI * 2, 6)),
      m(arc(cx, cy + 7, 4, 3, 0, Math.PI, 8)),
      m([[68, 66], [74, 58], [78, 70], [84, 58], [88, 68], [94, 60], [100, 66], [110, 62]], 1.8, NAVY, 70),
      m(bend([66, 72], [90, 78], [114, 70]), 1.2, NAVY, 90),
      words(66, 78, 120, 90, to, 8, 0.8, NAVY),
      line([[112, 22], [109, 18], [112, 15], [115, 18], [112, 22]], 1.4, '#e91e63', 40),
    ],
  };
}

/** Paper with a faint ruled edge (a sheet pinned up, a book's page). */
function paper(x: CanvasRenderingContext2D, w: number, h: number, color = '#fdfdf8') {
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = color;
  x.fillRect(0, 0, w, h);
}

/** A marker pen, its tip at the origin and its body up along +y. */
function markerPen(g: THREE.Object3D, color = '#263238') {
  part(g, cone(0.006, 0.016, 10), '#37474f', 0, 0.008, 0, { rx: Math.PI, outline: false });
  part(g, cyl(0.0095, 0.0095, 0.11, 12), '#fafafa', 0, 0.071, 0, { outline: false });
  part(g, cyl(0.0097, 0.0097, 0.02, 12), color, 0, 0.12, 0, { outline: false });
}
/** A pen display's stylus, its nib at the origin and its body up along +y. */
function stylus(g: THREE.Object3D) {
  part(g, cone(0.0045, 0.016, 10), '#9e9e9e', 0, 0.008, 0, { rx: Math.PI, outline: false });
  part(g, cyl(0.0062, 0.006, 0.04, 10), '#3a3c42', 0, 0.036, 0, { outline: false });
  part(g, cyl(0.0055, 0.005, 0.1, 10), BLACK, 0, 0.106, 0, { outline: false });
  part(g, box(0.003, 0.014, 0.004), '#5c5f66', 0, 0.05, 0.006, { outline: false });
}
const Y = new THREE.Vector3(0, 1, 0);
/** Which way the pen goes back from the nib to the hand (activity.ts PEN_GRIP / MARKER_GRIP), for someone facing -z, in a frame turned by `q`. */
function penWay(g: { back: number; up: number; out: number }, q?: THREE.Quaternion) {
  const v = new THREE.Vector3(g.out, g.up, g.back).normalize();
  if (q) v.applyQuaternion(q.clone().invert());
  return new THREE.Quaternion().setFromUnitVectors(Y, v);
}

/**
 * A sheet pinned up on a board, drawn on with a marker while it's used: its picture, the marker (in
 * `use`) on its nib, moved along each line; a fresh sheet when one's done.
 */
function boardSheet(g: THREE.Object3D, use: THREE.Object3D, cx: number, cy: number, fz: number, make: (n: number) => Plan, n: number, part0: number) {
  const SW = 0.5;
  const SH = 0.375;
  part(g, box(SW + 0.012, SH + 0.012, 0.004), '#e0e0e0', cx, cy, fz + 0.002, { outline: false });
  const sh = live(g, 256, 192, SW, SH, cx, cy, fz + 0.0045);
  for (const sx of [-1, 1]) part(g, ball(0.011), '#e53935', cx + sx * (SW / 2 - 0.03), cy + SH / 2 - 0.025, fz + 0.012, { outline: false });
  const dr = new Drawer(make, n, part0, { rest: 2.5, turn: 0.8, hop: 0.35 });
  const paint = () => {
    if (!sh.ctx) return;
    paper(sh.ctx, 256, 192);
    dr.paint(sh.ctx);
    sh.tex.needsUpdate = true;
  };
  paint();
  const nib = marker(g, cx, cy, fz + 0.01);
  const rig = new THREE.Group();
  rig.quaternion.copy(penWay(MARKER_GRIP));
  use.add(rig);
  markerPen(rig);
  let last = -1;
  let shown = -1;
  const update = (t: number) => {
    const dt = last < 0 || t < last ? 0 : Math.min(0.25, t - last);
    last = t;
    if (dr.update(dt) && Math.abs(t - shown) > 1 / 15) {
      paint();
      shown = t;
    }
    nib.position.set(cx + (clamp(dr.nib[0], 0, 256) / 256 - 0.5) * SW, cy + (0.5 - clamp(dr.nib[1], 0, 192) / 192) * SH, fz + 0.007 + dr.lift * 0.04);
    rig.position.copy(nib.position);
  };
  return { nib, rig, update };
}

/** A board's frame and face, on the wall behind it or on a stand of its own; where its face is. */
function boardFrame(g: THREE.Object3D, W: number, D: number, wall: boolean, by: number, bh: number, face: string) {
  const bw = Math.min(W - 0.12, 1.86);
  const bz = wall ? -D / 2 + 0.03 : -0.06;
  if (!wall) {
    for (const sx of [-1, 1]) {
      const x = sx * (bw / 2 + 0.04);
      part(g, rbox(0.04, by + bh / 2 - 0.02, 0.04, 0.01), ALU, x, (by + bh / 2 + 0.02) / 2 + 0.03, bz);
      part(g, rbox(0.06, 0.04, 0.62, 0.012), ALU, x, 0.07, bz);
      for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, x, 0.03, bz + sz * 0.28, { outline: false });
    }
    part(g, rbox(bw + 0.04, 0.035, 0.03, 0.01), ALU, 0, 0.35, bz);
  }
  part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.012), ALU, 0, by, bz);
  part(g, box(bw, bh, 0.006), face, 0, by, bz + 0.016, { outline: false });
  return { bw, bz, fz: bz + 0.02 };
}
/** A tray along a board's foot with markers and the eraser on it. */
function markerTray(g: THREE.Object3D, w: number, y: number, z: number) {
  part(g, rbox(w, 0.02, 0.07, 0.006), ALU, 0, y, z + 0.035);
  part(g, box(w, 0.025, 0.006), ALU, 0, y + 0.012, z + 0.068, { outline: false });
  for (const [i, c] of ['#e53935', '#1e88e5', '#263238'].entries()) part(g, cyl(0.009, 0.009, 0.12, 10), c, -w / 2 + 0.1 + i * 0.05, y + 0.02, z + 0.04, { rz: Math.PI / 2, outline: false });
  part(g, rbox(0.12, 0.03, 0.045, 0.008), '#5d4037', w / 2 - 0.12, y + 0.025, z + 0.035);
  part(g, box(0.12, 0.01, 0.045), '#eceff1', w / 2 - 0.12, y + 0.005, z + 0.035, { outline: false });
}

/* --------------------------------------------------------------------- figures */

/** 한달빛 (the girl: her uniform, apron and ponytail) or 월야 (the boy: white hair, a long navy coat), from the front, the side or the back. */
function figure(x: CanvasRenderingContext2D, who: 'girl' | 'boy', view: 'front' | 'side' | 'back', cx: number, top: number, H: number, wave = false) {
  const u = H / 100;
  const girl = who === 'girl';
  const hair = girl ? GIRL_HAIR : '#eef2f7';
  const hy = top + 10 * u;
  const hr = 8.5 * u;
  x.save();
  x.lineWidth = Math.max(1, u * 0.7);
  x.strokeStyle = '#2b2b33';
  x.lineJoin = 'round';
  const fill = (color: string, path: () => void) => {
    x.fillStyle = color;
    x.beginPath();
    path();
    x.fill();
    x.stroke();
  };
  const side = view === 'side';
  const bw = side ? 14 * u : 20 * u;
  // The ponytail behind.
  if (girl && view !== 'back') fill(hair, () => x.ellipse(cx + (side ? -10 : 10) * u, hy + 5 * u, 4 * u, 11 * u, side ? -0.4 : 0.35, 0, Math.PI * 2));
  // Legs and shoes.
  fill(girl ? '#263238' : '#1c1c28', () => {
    x.rect(cx - (side ? 3 : 6.5) * u, top + 58 * u, 5 * u, 35 * u);
    if (!side) x.rect(cx + 1.5 * u, top + 58 * u, 5 * u, 35 * u);
  });
  fill('#5d4037', () => {
    x.ellipse(cx + (side ? 1.5 : -4) * u, top + 94 * u, 4.5 * u, 2.2 * u, 0, 0, Math.PI * 2);
    if (!side) x.ellipse(cx + 4 * u, top + 94 * u, 4.5 * u, 2.2 * u, 0, 0, Math.PI * 2);
  });
  // The body: her shirt, or his coat to the knee.
  if (girl) fill(UNIFORM, () => rr(x, cx - bw / 2, top + 19 * u, bw, 40 * u, 4 * u));
  else
    fill('#1a237e', () => {
      x.moveTo(cx - bw / 2, top + 20 * u);
      x.lineTo(cx + bw / 2, top + 20 * u);
      x.lineTo(cx + bw / 2 + 4 * u, top + 76 * u);
      x.lineTo(cx - bw / 2 - 4 * u, top + 76 * u);
      x.closePath();
    });
  // Arms: one raised waving.
  const arm = (sx: number, up: boolean) => {
    x.strokeStyle = girl ? UNIFORM : '#1a237e';
    x.lineWidth = 5 * u;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx + sx * (bw / 2), top + 22 * u);
    if (up) x.lineTo(cx + sx * (bw / 2 + 7 * u), top + 4 * u);
    else x.lineTo(cx + sx * (bw / 2 + 2 * u), top + 46 * u);
    x.stroke();
    x.lineWidth = Math.max(1, u * 0.7);
    x.strokeStyle = '#2b2b33';
    fill(SKIN, () => x.arc(cx + sx * (bw / 2 + (up ? 8 : 2.5) * u), top + (up ? 1 : 49) * u, 2.8 * u, 0, Math.PI * 2));
  };
  if (side) arm(1, false);
  else {
    arm(-1, false);
    arm(1, wave);
  }
  // Her apron, the store's name on it; his white shirt and the moon on its chain.
  if (girl && view !== 'back') {
    fill(NAVY, () => {
      x.moveTo(cx - (side ? 4 : 8) * u, top + 31 * u);
      x.lineTo(cx + (side ? 7 : 8) * u, top + 31 * u);
      x.lineTo(cx + (side ? 8 : 9) * u, top + 63 * u);
      x.lineTo(cx - (side ? 4 : 9) * u, top + 63 * u);
      x.closePath();
    });
    if (!side) {
      x.fillStyle = '#ffd54f';
      x.font = `bold ${Math.round(4 * u)}px ${FONT}`;
      x.textAlign = 'center';
      x.fillText('달빛', cx, top + 40 * u);
    }
  } else if (girl) {
    fill(NAVY, () => {
      x.ellipse(cx - 4 * u, top + 40 * u, 4 * u, 2.5 * u, 0.5, 0, Math.PI * 2);
      x.ellipse(cx + 4 * u, top + 40 * u, 4 * u, 2.5 * u, -0.5, 0, Math.PI * 2);
    });
  } else if (view !== 'back') {
    fill('#ffffff', () => {
      x.moveTo(cx - 4 * u, top + 20 * u);
      x.lineTo(cx + 4 * u, top + 20 * u);
      x.lineTo(cx, top + 34 * u);
      x.closePath();
    });
    fill('#ffd54f', () => x.arc(cx + (side ? 4 : 0) * u, top + 36 * u, 2.2 * u, 0, Math.PI * 2));
  }
  // Neck and head; hair over it.
  fill(SKIN, () => x.rect(cx - 2.5 * u + (side ? 1.5 * u : 0), top + 16 * u, 5 * u, 5 * u));
  fill(view === 'back' ? hair : SKIN, () => x.arc(cx + (side ? 1.5 * u : 0), hy, hr, 0, Math.PI * 2));
  if (view === 'back') {
    if (girl) fill(hair, () => x.ellipse(cx, hy + 8 * u, 3.5 * u, 10 * u, 0, 0, Math.PI * 2));
  } else {
    const hx = cx + (side ? 1.5 * u : 0);
    if (girl)
      fill(hair, () => {
        x.arc(hx, hy - 0.5 * u, hr + 1 * u, Math.PI * 1.02, Math.PI * 1.98);
        for (let i = 6; i >= 0; i--) x.lineTo(hx - hr + (i * 2 * hr) / 6, hy - (i % 2 ? 1 : 4) * u);
        x.closePath();
      });
    else
      fill(hair, () => {
        x.moveTo(hx - hr - 1 * u, hy);
        for (let i = 0; i <= 8; i++) x.lineTo(hx - hr + (i * 2 * hr) / 8, hy - hr - (i % 2 ? 5 : 0) * u - (i % 2 ? 0 : 1) * u);
        x.lineTo(hx + hr + 1 * u, hy);
        for (let i = 6; i >= 0; i--) x.lineTo(hx - hr + (i * 2 * hr) / 6, hy - (i % 2 ? 2 : 5) * u);
        x.closePath();
      });
    // The face: eyes (one from the side), a smile.
    x.fillStyle = girl ? '#5a3f9e' : '#ffb300';
    for (const ex of side ? [5] : [-3.4, 3.4]) {
      x.beginPath();
      x.ellipse(hx + ex * u, hy + 1.5 * u, 1.3 * u, 1.9 * u, 0, 0, Math.PI * 2);
      x.fill();
    }
    x.beginPath();
    x.arc(hx + (side ? 4 : 0) * u, hy + 4.5 * u, 2 * u, 0.2 * Math.PI, 0.8 * Math.PI);
    x.stroke();
    x.fillStyle = 'rgba(245,154,165,0.55)';
    for (const ex of side ? [3] : [-5, 5]) {
      x.beginPath();
      x.ellipse(hx + ex * u, hy + 4 * u, 1.8 * u, 1 * u, 0, 0, Math.PI * 2);
      x.fill();
    }
  }
  x.restore();
}

/* --------------------------------------------------------------------- pictures */

/** A turnaround: the character from the front, the side and the back against a height chart, notes in red. */
const turnTex = (who: 'girl' | 'boy') =>
  painted(`wtnTurn${who}`, 384, 192, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 384, 192);
    x.strokeStyle = '#cfd8dc';
    x.lineWidth = 1;
    for (let y = 30; y <= 180; y += 15) {
      x.beginPath();
      x.moveTo(30, y);
      x.lineTo(380, y);
      x.stroke();
    }
    x.fillStyle = '#90a4ae';
    x.font = `8px ${FONT}`;
    for (let k = 0; k <= 10; k++) x.fillText(`${(10 - k) * 20}`, 6, 33 + k * 15);
    const H = who === 'girl' ? 140 : 156;
    (['front', 'side', 'back'] as const).forEach((v, i) => figure(x, who, v, 90 + i * 100, 178 - H, H, false));
    x.fillStyle = '#263238';
    x.font = `bold 13px ${FONT}`;
    x.fillText(who === 'girl' ? '한달빛 · 턴어라운드' : '월야 · 턴어라운드', 36, 18);
    x.fillStyle = '#e53935';
    x.font = `9px ${FONT}`;
    x.fillText(who === 'girl' ? '앞치마 끈 리본 ← 꼭!' : '머리끝 은빛 하이라이트', 250, 18);
    x.fillText('前', 86, 188);
    x.fillText('側', 186, 188);
    x.fillText('後', 286, 188);
  });
/** The leads' profiles and colours, chips with their codes. */
const profileTex = () =>
  painted('wtnProfile', 256, 192, (x) => {
    x.fillStyle = '#fffdf5';
    x.fillRect(0, 0, 256, 192);
    x.fillStyle = '#263238';
    x.font = `bold 13px ${FONT}`;
    x.fillText('캐릭터 설정', 10, 20);
    x.font = `9px ${FONT}`;
    const lines = ['한달빛 (22) · 편의점 야간 알바', '키 162 · 좋아하는 것: 삼각김밥', '월야 (???) · 달에서 온 손님', '키 181 · 컵라면에 처음 눈뜸'];
    lines.forEach((l, i) => x.fillText(l, 10, 40 + i * 15 + (i > 1 ? 6 : 0)));
    const chips: Array<[string, string]> = [[GIRL_HAIR, '머리'], [SKIN, '피부'], [UNIFORM, '유니폼'], [NAVY, '앞치마'], ['#eef2f7', '월야 머리'], ['#ffb300', '월야 눈']];
    chips.forEach(([c, n], i) => {
      const cx = 10 + (i % 3) * 82;
      const cy = 112 + Math.floor(i / 3) * 40;
      x.fillStyle = c;
      x.fillRect(cx, cy, 24, 24);
      x.strokeStyle = '#90a4ae';
      x.strokeRect(cx, cy, 24, 24);
      x.fillStyle = '#263238';
      x.fillText(n, cx + 28, cy + 10);
      x.fillStyle = '#78909c';
      x.font = `8px ${FONT}`;
      x.fillText(c.toUpperCase(), cx + 28, cy + 21);
      x.font = `9px ${FONT}`;
    });
  });
/** A 콘티 sheet already drawn, pinned up. */
const contiTex = (k: number) =>
  painted(`wtnConti${k}`, 256, 192, (x) => {
    paper(x, 256, 192);
    const p = contiPlan(k);
    paintAll(x, [...p.base, ...p.steps]);
  });

/** The serial's schedule: each episode through 콘티 · 선화 · 채색 · 후보정 · 업로드, the deadline in red. */
const SCHED = { cw: 736, ch: 400, col0: 100, colW: 100, row0: 112, rowH: 44 };
const STAGES = ['콘티', '선화', '채색', '후보정', '업로드'];
/** Each episode: how many stages are done, and a note. */
const EPISODES: Array<[string, number, string]> = [
  ['45화', 5, '조회 112만'],
  ['46화', 5, '★ 9.98'],
  ['47화', 2, '마감 D-1'],
  ['48화', 1, '선화 진행'],
  ['49화', 0, '콘티 회의'],
  ['50화', 0, '시즌1 완결 ★'],
];
const scheduleTex = () =>
  painted('wtnSchedule', SCHED.cw, SCHED.ch, (x) => {
    const { cw, ch, col0, colW, row0, rowH } = SCHED;
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, cw, ch);
    x.fillStyle = '#5e35b1';
    x.fillRect(0, 0, cw, 56);
    x.fillStyle = '#ffffff';
    x.font = `bold 26px ${FONT}`;
    x.textBaseline = 'middle';
    x.fillText(`「${TITLE}」 연재 일정`, 18, 29);
    x.font = `14px ${FONT}`;
    x.fillText('매주 목요일 23:00 업로드', 340, 30);
    // The deadline, counted down.
    x.fillStyle = '#d32f2f';
    x.fillRect(cw - 150, 6, 140, 44);
    x.fillStyle = '#ffffff';
    x.font = `bold 26px ${FONT}`;
    x.textAlign = 'center';
    x.fillText('마감 D-1', cw - 80, 29);
    // The table.
    x.fillStyle = '#ede7f6';
    x.fillRect(10, 70, cw - 20, 36);
    x.fillStyle = '#4527a0';
    x.font = `bold 16px ${FONT}`;
    x.fillText('회차', 55, 88);
    STAGES.forEach((s, i) => x.fillText(s, col0 + colW * i + colW / 2, 88));
    x.fillText('비고', 660, 88);
    x.strokeStyle = '#b39ddb';
    x.lineWidth = 1.5;
    EPISODES.forEach(([ep, done, note], r) => {
      const y = row0 + r * rowH;
      x.beginPath();
      x.moveTo(10, y + rowH);
      x.lineTo(cw - 10, y + rowH);
      x.stroke();
      x.fillStyle = r === 2 ? '#d32f2f' : '#263238';
      x.font = `bold 17px ${FONT}`;
      x.fillText(ep, 55, y + rowH / 2);
      for (let c = 0; c < STAGES.length; c++) {
        if (c < done) {
          x.fillStyle = '#43a047';
          x.font = `bold 20px ${FONT}`;
          x.fillText('✓', col0 + colW * c + colW / 2, y + rowH / 2);
        }
      }
      x.fillStyle = r === 2 ? '#d32f2f' : '#546e7a';
      x.font = `14px ${FONT}`;
      x.fillText(note, 660, y + rowH / 2);
    });
    for (let c = 0; c <= STAGES.length; c++) {
      x.beginPath();
      x.moveTo(col0 + colW * c, 70);
      x.lineTo(col0 + colW * c, row0 + rowH * EPISODES.length);
      x.stroke();
    }
    // Who's on what; what not to forget.
    x.textAlign = 'left';
    x.fillStyle = '#37474f';
    x.font = `13px ${FONT}`;
    x.fillText('어시스턴트 배분 ─ 도현지: 배경 · 마윤서: 채색·플랫 · 썸네일: 작가', 14, ch - 20);
  });

/** A page of the 원고 run off, with the editor's red on it. */
const proofTex = (red: boolean) =>
  painted(`wtnProof${red}`, 192, 272, (x) => {
    paper(x, 192, 272, '#ffffff');
    const [a, b] = [PANELS()[1], PANELS()[2]];
    for (const [s, y] of [[a, 14], [b, 140]] as Array<[Subject, number]>) {
      x.save();
      x.translate(16, y);
      x.scale(0.8, 0.8);
      x.beginPath();
      x.rect(0, 0, 200, 140);
      x.clip();
      paintAll(x, finalOf(s));
      x.restore();
    }
    x.fillStyle = '#90a4ae';
    x.font = `7px ${FONT}`;
    x.fillText(`${TITLE} 47화 · p.12`, 60, 266);
    if (!red) return;
    x.strokeStyle = '#e53935';
    x.fillStyle = '#e53935';
    x.lineWidth = 1.6;
    x.beginPath();
    x.ellipse(52, 34, 30, 15, 0, 0, Math.PI * 2);
    x.stroke();
    x.font = `bold 9px ${FONT}`;
    x.fillText('대사 ↑', 86, 30);
    x.beginPath();
    x.moveTo(130, 200);
    x.lineTo(176, 180);
    x.stroke();
    x.fillText('톤 진하게', 130, 176);
    x.fillText('✓ OK', 150, 120);
  });

/** The 단행본's cover: 한달빛 under the moon, the title in yellow, volume 1. */
const coverTex = () =>
  painted('wtnCover', 128, 180, (x) => {
    const gr = x.createLinearGradient(0, 0, 0, 180);
    gr.addColorStop(0, '#1a1f4e');
    gr.addColorStop(1, '#4a3f7a');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 180);
    x.fillStyle = '#fff3b0';
    x.beginPath();
    x.arc(96, 30, 16, 0, Math.PI * 2);
    x.fill();
    figure(x, 'girl', 'front', 60, 62, 150, true);
    x.fillStyle = '#ffd54f';
    x.font = `bold 20px ${FONT}`;
    x.textAlign = 'center';
    x.fillText('달빛', 40, 30);
    x.fillText('편의점', 46, 52);
    x.fillStyle = '#ffffff';
    x.font = `bold 14px ${FONT}`;
    x.fillText('1', 116, 168);
  });
/** The banner on the signing table's cloth. */
const bannerTex = () =>
  painted('wtnBanner', 768, 224, (x) => {
    x.fillStyle = '#1a237e';
    x.fillRect(0, 0, 768, 224);
    x.fillStyle = '#fff3b0';
    x.beginPath();
    x.arc(78, 112, 52, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#1a237e';
    x.beginPath();
    x.arc(100, 96, 46, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ffd54f';
    x.font = `bold 44px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(`「${TITLE}」 단행본 1권`, 430, 76);
    x.fillStyle = '#ffffff';
    x.font = `bold 38px ${FONT}`;
    x.fillText('발매 기념 작가 사인회', 430, 140);
    x.font = `22px ${FONT}`;
    x.fillStyle = '#c5cae9';
    x.fillText('1인 1권 · 사진 촬영 OK', 430, 192);
  });
/** The standee: 한달빛 waving, a balloon over her. */
const standeeTex = () =>
  painted('wtnStandee', 256, 704, (x) => {
    x.clearRect(0, 0, 256, 704);
    figure(x, 'girl', 'front', 128, 104, 590, true);
    x.fillStyle = '#ffffff';
    x.strokeStyle = INK;
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(110, 52, 96, 44, 0, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    x.beginPath();
    x.moveTo(140, 92);
    x.lineTo(162, 122);
    x.lineTo(160, 90);
    x.fill();
    x.stroke();
    x.fillStyle = INK;
    x.font = `bold 30px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('어서 오세요~!', 110, 54);
  });

/** The readers' comments as they come in on the monitor. */
const COMMENTS: Array<[string, string, number]> = [
  ['편의점알바3년차', '삼각김밥에서 울 줄은 몰랐다ㅠㅠ', 2841],
  ['달빛수호대', '이번 화 배경 디테일 미쳤어요', 1922],
  ['야간조', '알바 해본 사람 공감 100%', 1530],
  ['새벽세시', '월야 정체 뭐임?? 다음 화 언제', 1407],
  ['김밥천국', '달빛이 웃는 컷 배경화면 합니다', 988],
  ['정주행러', '1화부터 다시 정주행하고 옴', 760],
  ['별빛', 'BGM 깔고 싶은 엔딩이었다…', 655],
  ['ㅇㅇ', '그림체 지난 화랑 좀 다른데?', 112],
];
const RANKS = ['달빛 편의점', '마왕님의 퇴근길', '검은 고양이 탐정', '오늘도 출근', '회귀한 셰프', '이세계 사회인'];
/** The ranking, the episode's numbers and the comments, at time `t`. */
function paintComments(x: CanvasRenderingContext2D, t: number) {
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = '#f5f6f8';
  x.fillRect(0, 0, 512, 288);
  x.fillStyle = '#1e1f24';
  x.fillRect(0, 0, 512, 30);
  x.fillStyle = '#ffffff';
  x.font = `bold 14px ${FONT}`;
  x.textAlign = 'left';
  x.textBaseline = 'middle';
  x.fillText('독자 반응 · 실시간', 10, 15);
  x.fillStyle = '#ff5252';
  x.beginPath();
  x.arc(160, 15, 4 + Math.sin(t * 4), 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#b0bec5';
  x.font = `11px ${FONT}`;
  x.fillText('LIVE', 168, 15);
  // The Thursday ranking: ours up to first now and then.
  const first = t % 40 >= 20;
  const order = first ? RANKS : [RANKS[1], RANKS[0], ...RANKS.slice(2)];
  x.fillStyle = '#263238';
  x.font = `bold 12px ${FONT}`;
  x.fillText('목요웹툰 실시간 순위', 10, 46);
  order.forEach((r, i) => {
    const y = 62 + i * 26;
    const ours = r === TITLE;
    x.fillStyle = ours ? '#fff59d' : '#ffffff';
    x.fillRect(8, y, 150, 22);
    x.fillStyle = i < 3 ? '#e53935' : '#607d8b';
    x.font = `bold 13px ${FONT}`;
    x.fillText(String(i + 1), 14, y + 11);
    x.fillStyle = '#263238';
    x.font = `${ours ? 'bold ' : ''}11px ${FONT}`;
    x.fillText(r, 32, y + 11);
    if (ours) {
      x.fillStyle = '#e53935';
      x.fillText('▲1', 132, y + 11);
    }
  });
  // This week's episode: its numbers ticking up.
  x.fillStyle = '#ffffff';
  x.fillRect(168, 38, 160, 242);
  x.fillStyle = '#39407a';
  x.fillRect(176, 46, 144, 100);
  x.fillStyle = '#fff1a8';
  x.beginPath();
  x.arc(296, 70, 12, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#ebe5d8';
  x.fillRect(200, 92, 96, 54);
  x.fillStyle = '#ffd54f';
  x.fillRect(204, 96, 88, 12);
  x.fillStyle = '#fff0b0';
  x.fillRect(208, 114, 34, 28);
  x.fillRect(254, 114, 34, 28);
  x.fillStyle = '#263238';
  x.font = `bold 13px ${FONT}`;
  x.fillText('47화 · 마지막 삼각김밥', 176, 162);
  x.font = `12px ${FONT}`;
  x.fillStyle = '#f9a825';
  x.fillText('★ 9.97', 176, 184);
  const fmt = (n: number) => Math.floor(n).toLocaleString('ko-KR');
  x.fillStyle = '#455a64';
  x.fillText(`조회 ${fmt(1284000 + t * 37)}`, 176, 206);
  x.fillStyle = '#e91e63';
  x.fillText(`좋아요 ${fmt(48211 + t * 3)}`, 176, 228);
  x.fillStyle = '#455a64';
  x.fillText(`댓글 ${fmt(1284 + t / 2)}`, 176, 250);
  x.fillStyle = '#43a047';
  x.fillText('완독률 94%', 176, 272);
  // The comments, scrolling.
  x.save();
  x.beginPath();
  x.rect(336, 38, 170, 242);
  x.clip();
  x.fillStyle = '#ffffff';
  x.fillRect(336, 38, 170, 242);
  const rowH = 44;
  const off = (t * 9) % (rowH * COMMENTS.length);
  for (let pass = 0; pass < 2; pass++)
    COMMENTS.forEach(([who, what, likes], i) => {
      const y = 40 + i * rowH + pass * rowH * COMMENTS.length - off;
      if (y < 0 || y > 288) return;
      if (i < 3) {
        x.fillStyle = '#e53935';
        x.fillRect(340, y + 4, 26, 12);
        x.fillStyle = '#ffffff';
        x.font = `bold 8px ${FONT}`;
        x.fillText('BEST', 343, y + 10.5);
      }
      x.fillStyle = '#37474f';
      x.font = `bold 10px ${FONT}`;
      x.fillText(who, i < 3 ? 370 : 340, y + 10);
      x.fillStyle = '#263238';
      x.font = `10px ${FONT}`;
      x.fillText(what, 340, y + 25, 162);
      x.fillStyle = '#90a4ae';
      x.font = `9px ${FONT}`;
      x.fillText(`공감 ${likes}`, 340, y + 37);
      x.fillStyle = '#eceff1';
      x.fillRect(338, y + rowH - 2, 166, 1);
    });
  x.restore();
}

/* --------------------------------------------------------------------- chairs, props */

/** A mesh-backed office chair facing +z in its own group, its seat `h` up. */
function meshChair(c: THREE.Object3D, h: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.024, 0.024, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h + 0.02, 0);
  part(c, rbox(0.44, 0.56, 0.035, 0.03), BLACK, 0, h + 0.38, -0.22, { rx: -0.1 });
  part(c, box(0.38, 0.5, 0.01), shade(color, 1.15), 0, h + 0.38, -0.2, { rx: -0.1, outline: false });
  part(c, rbox(0.26, 0.1, 0.06, 0.03), color, 0, h + 0.2, -0.18);
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.03, 0.22, 0.012), BLACK, sx * 0.25, h + 0.2, -0.01);
}
/** A wooden drawing mannequin on its stand at (x, y, z), posed mid-stride with an arm up. */
function mannequin(g: THREE.Object3D, x: number, y: number, z: number, ry: number) {
  const m = frame(g, x, y, z, ry);
  const W2 = '#d7b48a';
  part(m, rbox(0.08, 0.012, 0.05, 0.006), W2, 0, 0.006, 0);
  part(m, cyl(0.004, 0.004, 0.07, 6), W2, 0, 0.045, 0, { outline: false });
  part(m, ball(0.016), W2, 0, 0.09, 0).scale.set(1, 0.8, 0.8);
  part(m, rbox(0.03, 0.05, 0.02, 0.008), W2, 0, 0.125, 0);
  part(m, ball(0.013), W2, 0, 0.168, 0).scale.set(0.9, 1.15, 1);
  rod(m, new THREE.Vector3(-0.007, 0.088, 0), new THREE.Vector3(-0.016, 0.045, 0.012), 0.005, W2);
  rod(m, new THREE.Vector3(-0.016, 0.045, 0.012), new THREE.Vector3(-0.012, 0.012, 0.004), 0.004, W2);
  rod(m, new THREE.Vector3(0.007, 0.088, 0), new THREE.Vector3(0.014, 0.05, -0.014), 0.005, W2);
  rod(m, new THREE.Vector3(0.014, 0.05, -0.014), new THREE.Vector3(0.016, 0.014, -0.004), 0.004, W2);
  rod(m, new THREE.Vector3(-0.018, 0.145, 0), new THREE.Vector3(-0.03, 0.18, 0.006), 0.004, W2);
  rod(m, new THREE.Vector3(-0.03, 0.18, 0.006), new THREE.Vector3(-0.034, 0.215, 0.004), 0.0035, W2);
  rod(m, new THREE.Vector3(0.018, 0.145, 0), new THREE.Vector3(0.028, 0.115, 0.01), 0.004, W2);
  rod(m, new THREE.Vector3(0.028, 0.115, 0.01), new THREE.Vector3(0.026, 0.088, 0.02), 0.0035, W2);
}
/** An energy drink can on a top at `y`. */
function can(g: THREE.Object3D, x: number, y: number, z: number, color: string) {
  part(g, cyl(0.022, 0.022, 0.11, 14), color, x, y + 0.055, z);
  part(g, cyl(0.0225, 0.0225, 0.03, 14), '#212121', x, y + 0.06, z, { outline: false });
  part(g, cyl(0.018, 0.022, 0.006, 14), CHROME, x, y + 0.113, z, { outline: false });
}
/** A mug on a top at `y`. */
function mug(g: THREE.Object3D, x: number, y: number, z: number, color: string) {
  part(g, cyl(0.035, 0.032, 0.09, 14), color, x, y + 0.045, z);
  part(g, cyl(0.03, 0.03, 0.004, 14), '#4e342e', x, y + 0.085, z, { outline: false });
  part(g, ring(0.022, 0.006), color, x + 0.04, y + 0.048, z, { ry: Math.PI / 2 });
}
/** An acrylic stand of one of the leads on a top at `y`, facing +z. */
function acrylic(g: THREE.Object3D, x: number, y: number, z: number, who: 'girl' | 'boy', ry = 0) {
  const tex = painted(`wtnAcrylic${who}`, 64, 128, (c) => {
    c.clearRect(0, 0, 64, 128);
    figure(c, who, 'front', 32, 8, 116, who === 'girl');
  });
  part(g, rbox(0.06, 0.006, 0.035, 0.003), '#e3f2fd', x, y + 0.003, z, { ry, outline: false });
  const m = sheet(g, tex, 0.05, 0.1, x, y + 0.056, z, ry);
  (m.material as THREE.MeshBasicMaterial).alphaTest = 0.4;
}
/** A stack of the 단행본 lying on a top at `y`, the cover up. */
function books(g: THREE.Object3D, x: number, y: number, z: number, n: number, ry = 0) {
  for (let i = 0; i < n; i++) part(g, rbox(0.13, 0.018, 0.19, 0.004), i % 2 ? '#e8eaf6' : '#ffffff', x, y + 0.009 + i * 0.019, z, { ry: ry + (i % 3) * 0.02 });
  flat(g, coverTex(), 0.125, 0.182, x, y + n * 0.019 + 0.001, z, ry);
}

let desks = 0;
let boards = 0;

/** Uses at a pen-display desk, by what's drawn there. */
const DESK_MODE: Array<[RegExp, Mode]> = [
  [/color|paint|flat/i, 'color'],
  [/upload|deadline/i, 'upload'],
  [/background|assist/i, 'background'],
  [/brush|setup/i, 'brush'],
];
/** At a 콘티 board: running a meeting from beside it, turned to the room. */
const LEADS = /meeting|schedule|brief|plan/i;

export const BUILDERS: Record<string, Builder> = {
  /**
   * A pen-display desk (작화용 태블릿 책상): a white top edged in maple on a white steel frame, a 24"
   * pen display tilted up on its stand, its stylus in a holder, the shortcut remote on the left, a
   * portrait monitor behind with the episode scrolling down it as readers will see it (sticky notes
   * on its bezel), a wooden mannequin, an energy drink, a mug, an acrylic stand of one of the leads,
   * the headphones on a hook; a mesh chair. Sat at it the drawing program's open: the pen hand draws
   * the line the panel needs next on the glass — the 콘티 in blue then the 선화 (원고 그리기), the
   * flats and shading (채색하기), the shading and the lettering with the upload creeping up the red
   * title bar (마감 원고 업로드), a street to its vanishing point (배경 보조), test strokes at each
   * brush size (브러시 세팅) — the nib lifted between lines, the other hand on the remote's keys; a
   * panel done, the long page scrolls on to the next.
   */
  drawingTabletDesk(g, W, D, _c, def, _ctx, out) {
    const nth = desks++;
    const w = Math.min(W - 0.04, 0.96);
    const h = 0.72;
    const d = Math.min(D - 0.36, 0.62);
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    const ty = h + 0.015;
    const FRAME = '#e9e9ec';
    part(g, rbox(w, 0.03, d, 0.01), DESK, 0, h, z);
    part(g, box(w - 0.02, 0.012, 0.006), MAPLE, 0, h, front + 0.001, { outline: false });
    for (const sx of [-1, 1]) {
      for (const lz of [z - d / 2 + 0.07, front - 0.07]) part(g, rbox(0.05, h - 0.03, 0.05, 0.01), FRAME, sx * (w / 2 - 0.06), (h - 0.03) / 2, lz);
      part(g, rbox(0.05, 0.03, d - 0.1, 0.01), FRAME, sx * (w / 2 - 0.06), 0.06, z);
    }
    part(g, rbox(w - 0.16, 0.05, 0.03, 0.01), FRAME, 0, h - 0.06, z - d / 2 + 0.07);
    // The cable tray under the back, a power strip in it.
    part(g, box(w - 0.3, 0.05, 0.1), '#cfd2d6', 0, h - 0.12, z - d / 2 + 0.13);
    part(g, rbox(0.3, 0.03, 0.05, 0.008), '#fafafa', 0.05, h - 0.08, z - d / 2 + 0.13);

    // The pen display on its stand, tilted up to the hand.
    const SW = 0.5;
    const SH = 0.3125;
    const SCY = 0.18;
    const FACE = 0.0115;
    const pd = frame(g, 0, ty + 0.045, front - 0.07, 0, -1.12);
    part(pd, rbox(0.56, 0.36, 0.022, 0.012), BLACK, 0, SCY, 0);
    part(pd, box(0.008, 0.004, 0.002), '#69f0ae', 0.25, 0.012, FACE, { outline: false, material: glow('#69f0ae') });
    label(pd, 'Pen Display 24', 0.09, 0.012, -0.2, 0.01, FACE, 'none', '#9e9e9e');
    const scr = live(pd, SC.w, SC.h, SW, SH, 0, SCY, FACE);
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.12, 0.2, 0.008), '#33353b', sx * 0.2, ty + 0.06, front - 0.21, { rx: 0.55 });
    part(g, rbox(0.52, 0.02, 0.03, 0.006), '#33353b', 0, ty + 0.01, front - 0.06);
    // Off when it isn't used: dark glass over it.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const offGlass = frame(idle, 0, ty + 0.045, front - 0.07, 0, -1.12);
    part(offGlass, box(SW, SH, 0.001), '#15171c', 0, SCY, FACE + 0.0012, { outline: false, material: glow('#15171c') });

    // The shortcut remote, where the other hand rests (activity.ts PEN_KEYS, from the seat).
    const cz = front + 0.22;
    const kx = -PEN_KEYS.side;
    const kz = cz - PEN_KEYS.ahead;
    part(g, rbox(0.075, 0.016, 0.125, 0.008), BLACK, kx, ty + 0.008, kz, { ry: 0.12 });
    for (let i = 0; i < 8; i++) part(g, box(0.016, 0.005, 0.016), '#4a4c55', kx - 0.017 + (i % 2) * 0.034, ty + 0.018, kz - 0.04 + Math.floor(i / 2) * 0.022, { outline: false });
    part(g, ring(0.012, 0.003), '#6b6e78', kx, ty + 0.018, kz + 0.045, { rx: Math.PI / 2 });

    // The portrait monitor behind: the episode as readers scroll it.
    const mx = 0.25;
    const mz = z - d / 2 + 0.09;
    const my = ty + 0.5;
    part(g, rbox(0.14, 0.012, 0.1, 0.004), BLACK, mx, ty + 0.006, mz);
    part(g, rbox(0.03, 0.34, 0.025, 0.008), BLACK, mx, ty + 0.17, mz - 0.01);
    part(g, rbox(0.23, 0.38, 0.025, 0.01), BLACK, mx, my, mz + 0.01);
    const strip = stripTex().clone();
    strip.needsUpdate = true;
    strip.repeat.set(1, 0.426);
    strip.offset.y = 0.574 - (nth % 4) * 0.12;
    const stripSheet = sheet(g, strip, 0.2, 0.344, mx, my, mz + 0.0235);
    (stripSheet.material as THREE.Material).addEventListener('dispose', () => strip.dispose());
    for (const [k, col] of ['#fff59d', '#f8bbd0', '#b3e5fc'].entries()) part(g, box(0.05, 0.05, 0.002), col, mx - 0.09 + k * 0.05, my + 0.2 + (k % 2) * 0.01, mz + 0.024, { rz: (k - 1) * 0.15, outline: false });

    // On the desk: the mannequin, a drink, a mug, an acrylic stand; the headphones on their hook.
    mannequin(g, -0.37, ty, z - 0.18, 0.5 + nth);
    can(g, -0.4, ty, z + 0.02, ['#1e88e5', '#43a047', '#e53935', '#8e24aa'][nth % 4]);
    mug(g, 0.41, ty, front - 0.24, ['#fff8e1', '#e1f5fe', '#fce4ec', '#f1f8e9'][nth % 4]);
    acrylic(g, 0.42, ty, z - 0.17, nth % 2 ? 'boy' : 'girl', -0.3);
    part(g, rbox(0.03, 0.04, 0.03, 0.006), BLACK, -w / 2 - 0.005, h - 0.08, front - 0.12);
    const hp = frame(g, -w / 2 - 0.03, h - 0.2, front - 0.12, Math.PI / 2);
    part(hp, ring(0.075, 0.009), '#37474f', 0, 0.06, 0, { rz: 0 });
    for (const sx of [-1, 1]) part(hp, cyl(0.035, 0.035, 0.025, 14), '#37474f', sx * 0.075, 0.03, 0, { rz: Math.PI / 2 });

    // The stylus in its holder (taken up to draw).
    part(g, cyl(0.022, 0.025, 0.03, 12), '#3a3c42', 0.36, ty + 0.015, front - 0.07);
    const rest = frame(idle, 0.36, ty + 0.02, front - 0.07, 0, 0.25);
    stylus(rest);

    // The chair.
    const ch = frame(g, 0, 0, cz, Math.PI);
    meshChair(ch, 0.44, ['#4b5560', '#5c6bc0', '#8d6e63', '#26a69a'][nth % 4]);
    out.seat = marker(g, 0, 0.48, cz);

    // In use: the stylus in the hand, its nib on the glass.
    const use = new THREE.Group();
    pd.add(use);
    out.inUse = use;
    const penRig = new THREE.Group();
    penRig.quaternion.copy(penWay(PEN_GRIP, pd.quaternion));
    use.add(penRig);
    stylus(penRig);
    const nib = marker(pd, 0, SCY, FACE + 0.01);
    out.work = nib;
    const modes = (['episode', 'color', 'upload', 'background', 'brush'] as Mode[]).map((m) => [m, satAt(g, 0, cz, 'penDraw', nib)] as const);
    const spotOf = (m: Mode) => modes.find(([k]) => k === m)![1];
    const spots: Record<string, Spot> = {
      '*': spotOf('episode'),
      drawEpisode: spotOf('episode'),
      colorPanels: spotOf('color'),
      deadlineUpload: spotOf('upload'),
      webtoonArtist_backgroundAssist: spotOf('background'),
      webtoonArtist_brushSetup: spotOf('brush'),
    };
    for (const i of def.interactions) {
      if (spots[i.id]) continue;
      const hit = DESK_MODE.find(([re]) => re.test(i.id));
      if (hit) spots[i.id] = spotOf(hit[1]);
    }
    out.spots = spots;

    // What's on the screen: a drawer for each use, each desk somewhere along when the studio opens.
    const drawers = new Map<Mode, Drawer>();
    const drawerFor = (m: Mode) => {
      let dr = drawers.get(m);
      if (!dr) drawers.set(m, (dr = new Drawer(PLANS[m], nth + (m === 'episode' ? 0 : 1), m === 'episode' ? [0.35, 0.62, 0.15, 0.8][nth % 4] : 0.05)));
      return dr;
    };
    let mode: Mode = 'episode';
    let last = -1;
    let shown = -1;
    const repaint = (t: number) => {
      if (!scr.ctx) return;
      paintDesk(scr.ctx, mode, drawerFor(mode), t);
      scr.tex.needsUpdate = true;
    };
    repaint(0);
    const at = new THREE.Vector3();
    out.animate = (t) => {
      let now = mode;
      let when = -Infinity;
      for (const [m, s] of modes) {
        const p = posedAt(s, t);
        if (p !== null && p > when) [now, when] = [m, p];
      }
      const dt = last < 0 || t < last ? 0 : Math.min(0.25, t - last);
      last = t;
      if (now !== mode) {
        mode = now;
        shown = -1;
      }
      const dr = drawerFor(mode);
      const changed = dr.update(dt, mode === 'upload' ? 1.5 : 1);
      if ((changed || shown < 0 || mode === 'upload') && Math.abs(t - shown) > 1 / 15) {
        repaint(t);
        shown = t;
      }
      // The nib on the glass where the drawing's going down, lifted off it between lines.
      const e = dr.state === 'turn' && mode !== 'brush' ? smooth(dr.k) : 1;
      const sx = clamp(SC.px + dr.nib[0], 34, SC.right - 4);
      const sy = clamp(SC.py + SC.gap * (1 - e) + dr.nib[1], SC.top + 4, SC.h - 4);
      at.set((sx / SC.w - 0.5) * SW, SCY + (0.5 - sy / SC.h) * SH, FACE + 0.002 + dr.lift * 0.022);
      nib.position.copy(at);
      penRig.position.copy(at);
      // The episode going by on the portrait monitor.
      strip.offset.y = (((0.574 - t * 0.01 - (nth % 4) * 0.12) % 1) + 1) % 1;
    };
  },

  /**
   * A 콘티 board (콘티 보드), any storyteller's (the webtoon studio's, the film company's): a cork board
   * in an aluminium frame — on the wall where there's one, else on a stand — with 콘티 sheets pinned
   * up, four cuts to a sheet (a close-up, a full shot, over the shoulder, an insert) with the shot
   * written under each, a red arrow for a camera move; markers and an eraser on the tray. Drawn at
   * stood with a marker: the frames ruled and the cuts drawn into a fresh sheet line by line, the
   * shots written in. A meeting (the production meeting, the assistants' work handed out) is led from
   * beside it, turned out to the room, pointing back at the sheets.
   */
  storyboardWall(g, W, D, _c, def, ctx, out) {
    const nth = boards++;
    const by = 1.4;
    const bh = 1.02;
    const { bw, fz } = boardFrame(g, W, D, ctx.againstWall, by, bh, CORK);
    label(g, '콘티 · 씬 리스트', 0.42, 0.055, -bw / 2 + 0.26, by + bh / 2 - 0.045, fz + 0.002, '#263238', '#ffffff');
    const cols = [-0.6, 0, 0.6].map((x) => x * Math.min(1, bw / 1.86));
    const rows = [by + 0.22, by - 0.25];
    let k = 0;
    for (const r of rows)
      for (const cx of cols) {
        if (r === rows[1] && cx === cols[1]) continue;
        const tilt = ((k * 37) % 7) * 0.006 - 0.018;
        part(g, box(0.512, 0.387, 0.003), '#e0e0e0', cx, r, fz + 0.002, { rz: tilt, outline: false });
        sheet(g, contiTex(k + nth * 5), 0.5, 0.375, cx, r, fz + 0.004, 0, 0, tilt);
        part(g, ball(0.011), ['#e53935', '#1e88e5', '#fdd835'][k % 3], cx, r + 0.16, fz + 0.012, { outline: false });
        k++;
      }
    // Sticky notes on the frame.
    for (const [i, col] of ['#fff59d', '#f8bbd0'].entries()) part(g, box(0.07, 0.07, 0.002), col, bw / 2 - 0.08 - i * 0.09, by + bh / 2 - 0.06, fz + 0.006, { rz: (i - 0.5) * 0.2, outline: false });
    markerTray(g, bw * 0.6, by - bh / 2 - 0.02, fz - 0.02);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const lying = frame(idle, cols[1] + 0.1, by - bh / 2 + 0.005, fz + 0.03, 0, 0);
    lying.rotation.z = Math.PI / 2;
    markerPen(lying);
    const live0 = boardSheet(g, use, cols[1], rows[1], fz, contiPlan, nth * 3 + 1, 0.45);
    const draw = stoodAt(g, cols[1], fz + 0.43, 'penDraw', live0.nib);
    const lead = stoodAt(g, bw / 2 - 0.22, fz + 0.62, 'present', marker(g, cols[2] - 0.15, rows[0], fz + 0.01), 0.35);
    const spots: Record<string, Spot> = { '*': draw, filmmaker_productionMeeting: lead, webtoonArtist_assistantSchedule: lead };
    for (const i of def.interactions) if (LEADS.test(i.id)) spots[i.id] = lead;
    out.spots = spots;
    out.work = live0.nib;
    out.animate = (t) => {
      const drawing = posedAt(lead, t) === null;
      live0.rig.visible = drawing;
      if (drawing) live0.update(t);
    };
  },

  /**
   * The serial's schedule board (연재 일정 보드): a magnetic whiteboard — on the wall, else on a stand —
   * headed 「달빛 편의점」 연재 일정 in purple with 매주 목요일 23:00 업로드 and 마감 D-1 in a red box; a
   * row for each episode across 콘티 · 선화 · 채색 · 후보정 · 업로드, the stages done ticked and a
   * magnet on where each has got to (47화's red, slid on to 후보정 and back as it's talked over), the
   * notes (조회 112만, 시즌1 완결 ★), who of the assistants is on what; markers and the eraser on the
   * tray. Checked stood a step back with a notebook, jotting down and pointing out where each is.
   */
  wtnDeadlineBoard(g, W, D, _c, _def, ctx, out) {
    const by = 1.42;
    const bh = 1.0;
    const { bw, fz } = boardFrame(g, W, D, ctx.againstWall, by, bh, '#ffffff');
    const fh = (bw * SCHED.ch) / SCHED.cw;
    sheet(g, scheduleTex(), bw - 0.02, Math.min(bh - 0.02, fh), 0, by, fz + 0.001);
    const sh = Math.min(bh - 0.02, fh);
    const px = (u: number) => (u / SCHED.cw - 0.5) * (bw - 0.02);
    const py = (v: number) => by + (0.5 - v / SCHED.ch) * sh;
    const colX = (c: number) => px(SCHED.col0 + SCHED.colW * c + SCHED.colW / 2);
    const rowY = (r: number) => py(SCHED.row0 + SCHED.rowH * r + SCHED.rowH / 2);
    const MAG = ['#43a047', '#43a047', '#e53935', '#fb8c00', '#1e88e5', '#8e24aa'];
    let moving: THREE.Mesh | null = null;
    EPISODES.forEach(([, done], r) => {
      const c = Math.min(done, STAGES.length - 1);
      const m = part(g, cyl(0.022, 0.022, 0.012, 16), MAG[r], colX(c) + (done >= STAGES.length ? 0.03 : 0), rowY(r), fz + 0.008, { rx: Math.PI / 2 });
      if (r === 2) moving = m;
    });
    markerTray(g, bw * 0.5, by - bh / 2 - 0.02, fz - 0.02);
    const point = marker(g, colX(2), rowY(2), fz + 0.01);
    out.work = point;
    out.spots = { '*': stoodAt(g, -0.25, fz + 0.62, 'meeting', point) };
    out.animate = (t) => {
      // 47화's magnet slid on to 후보정 and back, as where it's at is talked over.
      const k = smooth(clamp(Math.sin((t / 9) * Math.PI * 2) * 1.5 + 0.5, 0, 1));
      const x = colX(2) + (colX(3) - colX(2)) * k;
      if (moving) (moving as THREE.Mesh).position.x = x;
      point.position.x = x;
    };
  },

  /**
   * The 캐릭터 설정화 board: a cork board — on the wall, else on a stand — headed with the plate; the
   * turnarounds of the leads pinned up (한달빛 front, side and back on a height chart, the apron's bow
   * in red; 월야 the same), the profile card with the colours chipped out and their codes, and the
   * expression sheet. Drawn at stood with a marker: a fresh sheet of four heads, each feeling
   * something (기쁨, 분노, 슬픔, 놀람), drawn line by line and labelled, one lead's then the other's.
   */
  wtnCharacterBoard(g, W, D, _c, _def, ctx, out) {
    const nth = boards++;
    const by = 1.4;
    const bh = 1.02;
    const { bw, fz } = boardFrame(g, W, D, ctx.againstWall, by, bh, CORK);
    const s = Math.min(1, bw / 1.86);
    label(g, '캐릭터 설정화', 0.36, 0.055, -bw / 2 + 0.22, by + bh / 2 - 0.045, fz + 0.002, '#5e35b1', '#ffffff');
    const pin = (x: number, y: number, col: string) => part(g, ball(0.011), col, x, y, fz + 0.012, { outline: false });
    sheet(g, turnTex('girl'), 0.96 * s, 0.48 * s, -0.42 * s, by + 0.2, fz + 0.004);
    pin(-0.42 * s, by + 0.2 + 0.22 * s, '#e53935');
    sheet(g, turnTex('boy'), 0.84 * s, 0.42 * s, -0.42 * s, by - 0.27, fz + 0.004, 0, 0, 0.01);
    pin(-0.42 * s, by - 0.27 + 0.19 * s, '#1e88e5');
    sheet(g, profileTex(), 0.5 * s, 0.375 * s, 0.6 * s, by + 0.22, fz + 0.004, 0, 0, -0.012);
    pin(0.6 * s, by + 0.22 + 0.16 * s, '#fdd835');
    markerTray(g, bw * 0.5, by - bh / 2 - 0.02, fz - 0.02);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const lying = frame(idle, 0.1, by - bh / 2 + 0.005, fz + 0.03);
    lying.rotation.z = Math.PI / 2;
    markerPen(lying, '#5e35b1');
    const live0 = boardSheet(g, use, 0.6 * s, by - 0.25, fz, facesPlan, nth, 0.3);
    out.work = live0.nib;
    out.spots = { '*': stoodAt(g, 0.6 * s, fz + 0.43, 'penDraw', live0.nib) };
    out.animate = (t) => live0.update(t);
  },

  /**
   * The readers' monitor (독자 반응 모니터): a big screen on a wall bracket (on a stand away from a
   * wall) over a low cabinet with the router blinking, a basket of snacks and the remote. On it, live:
   * the Thursday ranking (달빛 편의점 at 2 ▲1, now and then up to 1), this week's episode with its stars
   * and its views, hearts and comments ticking up, and the comments scrolling by, the BEST ones at the
   * top — and the one saying the drawing's changed. Checked stood back from it with a notebook,
   * pointing out what the readers are saying.
   */
  wtnCommentMonitor(g, W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const sw = Math.min(W - 0.06, 0.94);
    const shh = sw * (288 / 512);
    const my = 1.45;
    const mz = -D / 2 + 0.07;
    if (wall) part(g, rbox(0.3, 0.2, 0.03, 0.008), BLACK, 0, my, -D / 2 + 0.02);
    else {
      part(g, rbox(0.5, 0.04, 0.35, 0.01), BLACK, 0, 0.02, mz + 0.05);
      part(g, rbox(0.06, my, 0.05, 0.01), BLACK, 0, my / 2, mz - 0.04);
    }
    part(g, rbox(sw + 0.04, shh + 0.04, 0.04, 0.012), BLACK, 0, my, mz);
    const scr = live(g, 512, 288, sw, shh, 0, my, mz + 0.021);
    if (scr.ctx) {
      paintComments(scr.ctx, 0);
      scr.tex.needsUpdate = true;
    }
    // The cabinet under it.
    const cz = -D / 2 + 0.22;
    part(g, rbox(0.86, 0.42, 0.36, 0.012), '#eceff1', 0, 0.23, cz);
    for (const sx of [-1, 1]) part(g, box(0.4, 0.36, 0.004), '#cfd8dc', sx * 0.21, 0.23, cz + 0.181, { outline: false });
    for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 0.02, 8), BLACK, sx * 0.38, 0.01, cz, { outline: false });
    part(g, rbox(0.18, 0.03, 0.12, 0.008), '#fafafa', -0.26, 0.455, cz - 0.04);
    const leds: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) leds.push(part(g, box(0.008, 0.004, 0.003), '#69f0ae', -0.32 + i * 0.03, 0.457, cz + 0.021, { outline: false, material: glow('#69f0ae') }));
    part(g, rbox(0.24, 0.07, 0.16, 0.02), '#a1887f', 0.2, 0.475, cz);
    for (const [i, c] of ['#e53935', '#fdd835', '#43a047', '#1e88e5'].entries()) part(g, rbox(0.05, 0.03, 0.08, 0.006), c, 0.12 + i * 0.055, 0.515, cz + (i % 2) * 0.03, { ry: i * 0.3 });
    part(g, rbox(0.04, 0.012, 0.15, 0.008), BLACK, -0.05, 0.45, cz + 0.05, { ry: 0.3 });
    const point = marker(g, -sw * 0.18, my, mz + 0.03);
    out.work = point;
    out.spots = { '*': stoodAt(g, 0.05, 0.42, 'meeting', point) };
    let shown = -1;
    out.animate = (t) => {
      leds.forEach((l, i) => (l.visible = Math.sin(t * 9 + i * 2.1) > -0.3));
      if (scr.ctx && Math.abs(t - shown) > 0.12) {
        paintComments(scr.ctx, t);
        scr.tex.needsUpdate = true;
        shown = t;
      }
    };
  },

  /**
   * The 원고 printer (원고 출력 프린터): an A3 laser multifunction on a cabinet with reams of paper and
   * a toner box in its open shelf; the scanner lid with its feeder, the touch panel lit, the pages
   * out in the bay under it — a page of 47화. In use a page slides out after another, the light
   * blinking, and a proof on the lid has the editor's red on it, a red pen beside: stood at it
   * going over the page and marking it up.
   */
  wtnProofPrinter(g, W, D, _c, _def, _ctx, out) {
    const cw = Math.min(W - 0.2, 0.74);
    const cd = 0.55;
    const cz = -D / 2 + cd / 2 + 0.04;
    const ch = 0.6;
    // The cabinet: its open shelf with reams and the toner.
    part(g, rbox(cw, 0.03, cd, 0.008), '#cfd8dc', 0, ch - 0.015, cz);
    part(g, rbox(cw, 0.03, cd, 0.008), '#cfd8dc', 0, 0.06, cz);
    for (const sx of [-1, 1]) part(g, rbox(0.03, ch - 0.03, cd, 0.008), '#cfd8dc', sx * (cw / 2 - 0.015), ch / 2, cz);
    part(g, box(cw - 0.06, ch - 0.06, 0.01), '#b0bec5', 0, ch / 2, cz - cd / 2 + 0.01, { outline: false });
    for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 0.03, 8), BLACK, sx * (cw / 2 - 0.06), 0.015, cz + sx * 0.18, { outline: false });
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.23, 0.06, 0.32, 0.006), '#ffffff', -0.15, 0.105 + i * 0.062, cz + 0.05);
      part(g, box(0.231, 0.03, 0.12), i === 1 ? '#1e88e5' : '#43a047', -0.15, 0.105 + i * 0.062, cz + 0.12, { outline: false });
    }
    part(g, rbox(0.2, 0.14, 0.3, 0.01), '#263238', 0.17, 0.145, cz + 0.05);
    label(g, '토너', 0.1, 0.035, 0.17, 0.16, cz + 0.202, '#263238', '#ffffff');
    label(g, 'B4 원고지 · A4', 0.2, 0.03, -0.15, 0.36, cz + 0.212, 'none', '#37474f');
    // The printer: body, paper drawers, the bay the pages come out into, the scanner and feeder, the panel.
    const pw = 0.6;
    const pdp = 0.5;
    const pz = cz - 0.01;
    const by0 = ch;
    part(g, rbox(pw, 0.24, pdp, 0.02), '#eceff1', 0, by0 + 0.12, pz);
    for (let i = 0; i < 2; i++) {
      part(g, box(pw - 0.04, 0.004, 0.004), '#b0bec5', 0, by0 + 0.06 + i * 0.08, pz + pdp / 2 + 0.001, { outline: false });
      part(g, rbox(0.12, 0.016, 0.01, 0.004), '#90a4ae', 0, by0 + 0.035 + i * 0.08, pz + pdp / 2 + 0.004);
    }
    // The column at the back holding the scanner over the open bay.
    part(g, rbox(pw - 0.04, 0.07, 0.14, 0.01), '#cfd8dc', 0, by0 + 0.275, pz - pdp / 2 + 0.08);
    part(g, rbox(pw, 0.06, pdp, 0.015), '#eceff1', 0, by0 + 0.33, pz);
    part(g, rbox(0.42, 0.05, 0.16, 0.012), '#e0e0e0', -0.04, by0 + 0.385, pz - 0.15);
    const panel = frame(g, 0.2, by0 + 0.33, pz + pdp / 2 - 0.02, 0, -0.9);
    part(panel, rbox(0.16, 0.1, 0.02, 0.008), '#37474f', 0, 0.05, 0);
    part(panel, box(0.13, 0.07, 0.002), '#4fc3f7', 0, 0.05, 0.011, { outline: false, material: glow('#81d4fa') });
    const lamp = part(g, ball(0.006), '#69f0ae', -0.25, by0 + 0.33, pz + pdp / 2 + 0.002, { outline: false, material: glow('#69f0ae') });
    // The printed pages in the bay, a page of 47화 on top.
    const bay = by0 + 0.24;
    part(g, box(0.29, 0.012, 0.34), '#ffffff', -0.05, bay + 0.006, pz + 0.05, { outline: false });
    flat(g, proofTex(false), 0.27, 0.34, -0.05, bay + 0.0125, pz + 0.05);
    // The proof on the lid, the red pen.
    const lidTop = by0 + 0.36 + 0.001;
    flat(g, proofTex(true), 0.2, 0.28, 0.06, lidTop + 0.001, pz + 0.1, -0.1);
    part(g, cyl(0.005, 0.005, 0.14, 8), '#e53935', 0.21, lidTop + 0.006, pz + 0.16, { rz: Math.PI / 2, ry: 0.4, outline: false });
    // In use: a page sliding out after another.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const sliding = new THREE.Group();
    use.add(sliding);
    flat(sliding, proofTex(false), 0.27, 0.34, 0, 0, 0);
    const work = marker(g, 0.06, lidTop + 0.01, pz + 0.1);
    out.work = work;
    out.spots = { '*': stoodAt(g, 0.04, 0.32, 'write', work) };
    out.animate = (t) => {
      const k = (t / 3.5) % 1;
      const e = smooth(clamp(k / 0.6, 0, 1));
      sliding.position.set(-0.05, bay + 0.016, pz - 0.16 + 0.22 * e);
      sliding.visible = k < 0.92;
      lamp.visible = Math.sin(t * 8) > 0;
    };
  },

  /**
   * The signing table (사인회 테이블): a long table under a navy cloth hung to the floor on the
   * readers' side with the banner — 「달빛 편의점」 단행본 1권 발매 기념 작가 사인회, 1인 1권 · 사진 촬영
   * OK — stacks of the 단행본 with their covers up, one stood up on a plate stand for the readers, the
   * name card to them, a cup of sign pens, water, a little acrylic 한달빛; the author's chair behind.
   * Sat signing a copy: a little 한달빛 drawn on the title page, the signature, to the reader by name
   * and a heart, the other hand keeping the page down; then the next copy.
   */
  wtnSigningTable(g, W, D, _c, _def, _ctx, out) {
    const nth = boards++;
    const w = Math.min(W - 0.16, 1.76);
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.05;
    const front = z + d / 2;
    const h = 0.72;
    const ty = h + 0.027;
    legsUnder(g, w, d, h, z);
    part(g, rbox(w, 0.03, d, 0.008), '#fafafa', 0, h, z);
    // The cloth over it, hung to the floor on the readers' side (-z) and the ends, the banner on it.
    part(g, box(w + 0.04, 0.012, d + 0.04), NAVY, 0, h + 0.021, z, { outline: false });
    part(g, box(w + 0.04, h + 0.02, 0.012), NAVY, 0, (h + 0.02) / 2, z - d / 2 - 0.02);
    for (const sx of [-1, 1]) part(g, box(0.012, h + 0.02, d + 0.04), NAVY, sx * (w / 2 + 0.02), (h + 0.02) / 2, z);
    sheet(g, bannerTex(), w - 0.1, (w - 0.1) * (224 / 768), 0, h * 0.6, z - d / 2 - 0.0275, Math.PI);
    // The books: stacks, one stood up to the readers on a plate stand.
    books(g, -w / 2 + 0.16, ty, z - 0.05, 6, 0.1);
    books(g, -w / 2 + 0.33, ty, z - 0.08, 4, -0.15);
    books(g, w / 2 - 0.18, ty, z - 0.06, 5, -0.08);
    const stand = frame(g, w / 2 - 0.42, ty, z - 0.17, Math.PI);
    part(stand, box(0.1, 0.005, 0.06), '#eceff1', 0, 0.003, 0.02, { outline: false });
    part(stand, rbox(0.13, 0.19, 0.018, 0.004), '#ffffff', 0, 0.1, 0, { rx: -0.2 });
    sheet(stand, coverTex(), 0.125, 0.182, 0, 0.1, 0.01, 0, -0.2);
    // The name card to the readers, the pens, water, a little 한달빛.
    const tent = frame(g, 0, ty, z - d / 2 + 0.08, Math.PI);
    part(tent, box(0.24, 0.07, 0.004), '#ffffff', 0, 0.03, 0.012, { rx: -0.35 });
    label(tent, '달빛 편의점 작가', 0.22, 0.045, 0, 0.033, 0.016, 'none', NAVY, 0, -0.35);
    part(g, cyl(0.03, 0.028, 0.09, 12), '#5e35b1', 0.3, ty + 0.045, front - 0.12);
    for (const [k, col] of ['#212121', '#283593', '#e91e63', '#ffd54f'].entries()) part(g, cyl(0.005, 0.005, 0.14, 6), col, 0.3 + Math.cos(k * 1.6) * 0.012, ty + 0.11, front - 0.12 + Math.sin(k * 1.6) * 0.012, { rz: Math.cos(k * 1.6) * 0.12, outline: false });
    part(g, cyl(0.03, 0.03, 0.2, 12), '#b3e5fc', -0.48, ty + 0.1, front - 0.14, { material: new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.6 }) }).userData.ownMaterial = true;
    part(g, cyl(0.012, 0.012, 0.03, 10), '#1e88e5', -0.48, ty + 0.215, front - 0.14, { outline: false });
    acrylic(g, 0.5, ty, z - 0.2, 'girl', Math.PI);
    // The copy being signed, open at its title page.
    const bz = front - 0.2;
    part(g, rbox(0.36, 0.014, 0.25, 0.004), '#3949ab', 0, ty + 0.007, bz);
    part(g, box(0.34, 0.01, 0.23), '#ffffff', 0, ty + 0.017, bz, { outline: false });
    const page = live(g, 128, 96, 0.34, 0.23, 0, ty + 0.0225, bz, true);
    const PW = 0.34;
    const PH = 0.23;
    const dr = new Drawer(signPlan, nth, 0.5, { rest: 1.5, turn: 0.9, hop: 0.3 });
    const paint = () => {
      if (!page.ctx) return;
      const x = page.ctx;
      paper(x, 128, 96, '#ffffff');
      x.fillStyle = '#eceff1';
      x.fillRect(63, 0, 2, 96);
      x.fillStyle = '#9fa8da';
      x.font = `bold 7px ${FONT}`;
      x.textAlign = 'center';
      x.fillText(TITLE, 30, 40);
      x.fillText('1', 30, 52);
      if (dr.state !== 'turn' || dr.k > 0.5) dr.paint(x);
      page.tex.needsUpdate = true;
    };
    paint();
    // The chair, the author's.
    const cz = front + 0.22;
    const ch = frame(g, 0, 0, cz, Math.PI);
    meshChair(ch, 0.44, '#5e35b1');
    out.seat = marker(g, 0, 0.48, cz);
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const restPen = frame(idle, 0.12, ty + 0.03, bz + 0.05, 0, 0);
    restPen.rotation.z = Math.PI / 2;
    markerPen(restPen, NAVY);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const rig = new THREE.Group();
    rig.quaternion.copy(penWay(PEN_GRIP));
    use.add(rig);
    markerPen(rig, NAVY);
    const nib = marker(g, 0, ty + 0.03, bz);
    out.work = nib;
    out.spots = { '*': satAt(g, 0, cz, 'penDraw', nib) };
    let last = -1;
    let shown = -1;
    out.animate = (t) => {
      const dt = last < 0 || t < last ? 0 : Math.min(0.25, t - last);
      last = t;
      if ((dr.update(dt) || dr.state === 'turn') && Math.abs(t - shown) > 1 / 15) {
        paint();
        shown = t;
      }
      nib.position.set((clamp(dr.nib[0], 0, 128) / 128 - 0.5) * PW, ty + 0.024 + dr.lift * 0.025, bz + (clamp(dr.nib[1], 0, 96) / 96 - 0.5) * PH);
      rig.position.copy(nib.position);
    };
  },

  /**
   * A life-size standee (캐릭터 등신대) of 한달빛 in her uniform and apron, waving, the balloon over
   * her head — 어서 오세요~! — cut out of board on a black base with its strut behind, a 포토존 card
   * at its foot.
   */
  wtnStandee(g) {
    part(g, rbox(0.5, 0.04, 0.3, 0.01), BLACK, 0, 0.02, 0);
    const tex = standeeTex();
    const H = 1.7;
    const Wd = H * (256 / 704);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(Wd, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35 }));
    front.userData.ownGeometry = front.userData.ownMaterial = true;
    front.position.set(0, 0.04 + H / 2, 0.01);
    g.add(front);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(Wd, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, color: '#9e9e9e' }));
    back.userData.ownGeometry = back.userData.ownMaterial = true;
    back.position.set(0, 0.04 + H / 2, 0.006);
    back.rotation.y = Math.PI;
    g.add(back);
    rod(g, new THREE.Vector3(0, 0.9, 0.0), new THREE.Vector3(0, 0.04, -0.13), 0.012, '#8d6e63');
    label(g, '포토존 · 촬영 OK', 0.3, 0.05, 0, 0.065, 0.152, '#e91e63', '#ffffff', 0, -0.3);
  },

  /**
   * The studio's own posters, framed on the wall (작품 포스터 액자, 2026-11-05, the layout audit): the series' key art with its
   * heroine, and the 단행본 cover, in black frames, the series title and the run under them.
   */
  wtnPosterFrames(g, W) {
    const z = -0.46;
    const tex = standeeTex();
    [-W / 4, W / 4].forEach((x, i) => {
      part(g, box(0.62, 0.86, 0.03), BLACK, x, 1.45, z);
      part(g, box(0.56, 0.8, 0.005), i ? '#fff8e1' : '#e3f2fd', x, 1.45, z + 0.018, { outline: false });
      const h = 0.62;
      sheet(g, tex, h * (256 / 704), h, x, 1.5, z + 0.022);
      label(g, i ? '단행본 1권 발매' : '「달빛 편의점」 연재 중', 0.46, 0.06, x, 1.13, z + 0.022, i ? '#fff8e1' : '#e3f2fd', '#283593');
    });
  },

  /** The cot (간이침대) for a nap on a deadline night: a folding camp bed, a pillow and a blanket half off it. */
  wtnCot(g, W) {
    const w = W - 0.15;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, new THREE.Vector3(sx * (w / 2 - 0.1), 0, sz * 0.28), new THREE.Vector3(sx * (w / 2 - 0.25), 0.38, -sz * 0.28), 0.012, '#616161');
    part(g, box(w, 0.04, 0.6), '#455a64', 0, 0.4, 0);
    part(g, rbox(0.4, 0.1, 0.42, 0.04), '#eceff1', -w / 2 + 0.28, 0.47, 0);
    part(g, box(w * 0.55, 0.05, 0.62), '#7986cb', w * 0.15, 0.445, 0.02, { rz: 0.03 });
  },
};

/** A table's frame under its top (hidden by a cloth): four legs. */
function legsUnder(g: THREE.Object3D, w: number, d: number, h: number, z: number) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.02, h - 0.02, 8), '#9e9e9e', sx * (w / 2 - 0.06), (h - 0.02) / 2, z + sz * (d / 2 - 0.06), { outline: false });
}
