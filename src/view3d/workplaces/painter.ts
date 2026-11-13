import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { PALETTE, brushwork, toolPhase, type Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';

/**
 * The painters' studio (화실) drawn as itself (2026-10-27 workplace pipeline, at the user's request).
 * The H-frame studio easels stand in an arc round the still life, each with a canvas on its ledge
 * that is painted while it's used: the painter holds the palette out in the left hand by its thumb
 * hole, loads the brush from a blob of colour, lays three strokes on the canvas where the picture
 * needs them next (the paint goes down under the brush), and stands back to look — and the picture
 * comes on from the charcoal drawing to the finished, signed painting, then a fresh canvas. The
 * drawing table has the plaster head on its turntable for 석고 소묘, the brush jar, a portfolio; and
 * what the studio was missing: the still life on its draped stand under a clamp lamp, the taboret
 * with the glass palette and the tubes, the brush sink with brushes drying over it, the bench where
 * canvas is stretched and work is framed, the rack of canvases with its drying rack, and the crit
 * wall the work is pinned up on to talk over, with the exhibition laid out on paper.
 */

const BLACK = '#26282d';
const STEEL = '#aeb6bd';
const CHROME = '#dfe4e8';
const BEECH = '#c9a27a';
const LINEN = '#e9e1cf';
const GESSO = '#f4f1ea';
const PAPER = '#fbf8f1';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const SERIF = '"Batang","AppleMyungjo","Noto Serif KR",serif';

/** Lit parts (lamps): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** A lamp's pool of light; water; glass. */
const BEAM = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
const WATER = new THREE.MeshToonMaterial({ color: '#b3d9f2', transparent: true, opacity: 0.55, depthWrite: false });
const GLASS = new THREE.MeshToonMaterial({ color: '#dceef5', transparent: true, opacity: 0.35, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const cone = (r: number, h: number) => shape(`cone${r},${h}`, () => new THREE.ConeGeometry(r, h, 20, 1, true));
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
/** A turned shape (a jug, a bottle, a jar): its radius at each height. */
const lathe = (key: string, pts: Array<[number, number]>) => shape(`lathe${key}`, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20));

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
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0, font = FONT): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}|${font}`, cw, ch, (x2) => {
    if (bg !== 'none') {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
    }
    x2.fillStyle = fg;
    x2.font = `bold ${Math.round(ch * 0.62)}px ${font}`;
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}

/** A spot stood at (x, z) facing `yaw` (π: at the object, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (x, z) facing -z, on a seat `seat` up, and what's done there. */
function satAt(g: THREE.Object3D, x: number, z: number, seat: number, motion: Motion, work: THREE.Object3D): Spot {
  const s = spot(g, 'sit', x, seat, z, Math.PI, seat);
  s.work = work;
  s.motion = motion;
  return s;
}

/** Drips and spatters of paint on a face (facing +z at `z`, or lying on a top at `y` when `up`). */
function spatter(g: THREE.Object3D, x0: number, x1: number, y0: number, y1: number, z: number, n: number, seed: number, up = false) {
  const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#ffffff', '#212121'];
  for (let i = 0; i < n; i++) {
    const k = (i * 7919 + seed * 104729) % 9973;
    const x = x0 + ((k % 97) / 97) * (x1 - x0);
    const y = y0 + (((k / 97) % 89) / 89) * (y1 - y0);
    const r = 0.006 + ((k % 13) / 13) * 0.012;
    if (up) part(g, cyl(r, r, 0.002, 8), cols[(k + i) % cols.length], x, z, y, { outline: false });
    else part(g, cyl(r, r, 0.002, 8), cols[(k + i) % cols.length], x, y, z, { rx: Math.PI / 2, outline: false });
  }
}

/** A brush (round or flat), its tip at the origin and its handle up along +y. */
function brush(g: THREE.Object3D, handle: string, bristle: string | THREE.Material, len = 0.24, flatTip = false): THREE.Mesh {
  const color = typeof bristle === 'string' ? bristle : '#ffffff';
  const material = typeof bristle === 'string' ? undefined : bristle;
  const b = part(g, flatTip ? box(0.014, 0.03, 0.005) : cyl(0.007, 0.002, 0.03, 8), color, 0, 0.015, 0, { outline: false, material });
  part(g, cyl(0.0075, 0.007, 0.03, 8), CHROME, 0, 0.044, 0, { outline: false });
  part(g, cyl(0.0045, 0.007, len - 0.06, 8), handle, 0, 0.059 + (len - 0.06) / 2, 0, { outline: false });
  return b;
}
/** A jar of brushes, bristles up, at (x, y, z). */
function brushJar(g: THREE.Object3D, x: number, y: number, z: number, seed = 0, murky = false) {
  part(g, lathe('jar', [[0, 0], [0.04, 0], [0.042, 0.01], [0.042, 0.11], [0.038, 0.12]]), '#dceef5', x, y, z, { material: GLASS, outline: false });
  if (murky) part(g, cyl(0.039, 0.039, 0.07, 14), '#8d8f7a', x, y + 0.036, z, { outline: false });
  const handles = ['#c62828', '#212121', '#f9a825', '#6d4c41', '#1565c0', '#2e7d32'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + seed;
    const b = new THREE.Group();
    b.position.set(x + Math.cos(a) * 0.015, y + 0.33, z + Math.sin(a) * 0.015);
    b.rotation.set(Math.PI + Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18);
    g.add(b);
    // Bristles up: the brush turned over, its tip at the top.
    brush(b, handles[(i + seed) % handles.length], ['#3e2723', '#e0c9a6', '#5d4037'][i % 3], 0.24 + (i % 3) * 0.03, i % 2 === 1);
  }
}
/** A tube of oil paint lying on a top at `y`, its colour band and cap. */
function tube(g: THREE.Object3D, x: number, y: number, z: number, ry: number, color: string) {
  const t = new THREE.Group();
  t.position.set(x, y + 0.012, z);
  t.rotation.y = ry;
  g.add(t);
  part(t, cyl(0.012, 0.012, 0.08, 10), '#eceff1', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(t, cyl(0.0122, 0.0122, 0.03, 10), color, 0.005, 0, 0, { rz: Math.PI / 2, outline: false });
  part(t, box(0.012, 0.004, 0.026), '#cfd8dc', -0.046, -0.004, 0, { outline: false });
  part(t, cyl(0.007, 0.007, 0.016, 8), BLACK, 0.048, 0, 0, { rz: Math.PI / 2, outline: false });
}
/** A blob of paint on a palette (squeezed out, a little peak). */
function blob(g: THREE.Object3D, x: number, y: number, z: number, color: string, r = 0.016) {
  part(g, ball(r), color, x, y, z, { outline: false }).scale.set(1, 0.45, 1);
}
/** An arm lamp head clamped at `at`, aimed down at `to`; its bulb glows, its light falls (`use` for in-use only). */
function clampLamp(g: THREE.Object3D, at: THREE.Vector3, to: THREE.Vector3, color = BLACK, beam?: THREE.Object3D) {
  const dir = to.clone().sub(at).normalize();
  const head = new THREE.Group();
  head.position.copy(at);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  g.add(head);
  part(head, cyl(0.035, 0.09, 0.13, 18), color, 0, -0.04, 0);
  part(head, ball(0.035), '#fff8e1', 0, -0.09, 0, { outline: false, material: glow('#fff6d5') });
  if (beam) {
    const len = at.distanceTo(to);
    const pool = new THREE.Mesh(cone(0.28, len), BEAM);
    pool.position.copy(at.clone().lerp(to, 0.5));
    pool.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    beam.add(pool);
  }
}

/* --------------------------------------------------------------- the palette */

/** The wooden palette: a kidney of plywood with its thumb hole at the origin, lying flat (+y up), the body out to the left (-x) and forward (-z). */
const PAL = { cx: -0.09, cy: 0.06, rx: 0.17, ry: 0.12, t: 0.006 };
const paletteGeom = () =>
  shape('pntPalette', () => {
    const s = new THREE.Shape();
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      // The notch in the near edge beside the thumb hole, for the fingers.
      const dent = 1 - 0.28 * Math.max(0, Math.cos(a + 1.25)) ** 10;
      const x = PAL.cx + Math.cos(a) * PAL.rx * dent;
      const y = PAL.cy + Math.sin(a) * PAL.ry * dent;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.02, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: PAL.t, bevelEnabled: false, curveSegments: 12 });
    geo.rotateX(-Math.PI / 2);
    return geo;
  });
/** The colours squeezed out round the palette's rim, white to black, and where each is (palette frame). */
const PAL_COLORS = ['#fafafa', '#fdd835', '#fb8c00', '#d32f2f', '#8d3b2a', '#2e7d32', '#1e88e5', '#283593', '#212121'];
const palBlobs = () =>
  PAL_COLORS.map((c, i) => {
    const a = 1.25 + (i / (PAL_COLORS.length - 1)) * 2.9;
    return { c, color: new THREE.Color(c), p: new THREE.Vector3(PAL.cx + Math.cos(a) * PAL.rx * 0.78, PAL.t + 0.006, -(PAL.cy + Math.sin(a) * PAL.ry * 0.74)) };
  });
/** A palette with its paint on it, in `g` (thumb hole at the origin); its blobs (palette frame). */
function palette(g: THREE.Object3D) {
  part(g, paletteGeom(), '#c49a6c', 0, 0, 0);
  const blobs = palBlobs();
  for (const b of blobs) blob(g, b.p.x, b.p.y - 0.004, b.p.z, b.c);
  // Mixes smeared in the middle.
  for (const [x, z, c] of [[-0.08, -0.05, '#c9805a'], [-0.12, -0.08, '#7aa36c'], [-0.05, -0.1, '#9fb4d8'], [-0.15, -0.04, '#e8c27a']] as Array<[number, number, string]>) {
    part(g, cyl(0.024, 0.024, 0.002, 12), c, x, PAL.t + 0.001, z, { outline: false }).scale.set(1, 1, 0.6);
  }
  return blobs;
}

/* ------------------------------------------------------- the painting itself */

/** A painted canvas: its pixels. */
const CW = 160;
const CH = 128;
/** One stroke of paint: its middle, its angle, how long and broad, its colour (pixels). */
interface Mark {
  x: number;
  y: number;
  a: number;
  len: number;
  w: number;
  c: string;
}
interface Subject {
  marks: Mark[];
  sketch: (x: CanvasRenderingContext2D) => void;
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
const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(THREE.MathUtils.clamp(l, 2, 98))}%)`;
/** Strokes laid over an area, row by row (a little out of order), each its colour and angle there. */
function fill(out: Mark[], r: () => number, o: { box: [number, number, number, number]; step: number; inside: (x: number, y: number) => boolean; color: (x: number, y: number) => string; ang: (x: number, y: number) => number; len: number; w: number }) {
  const [x0, y0, x1, y1] = o.box;
  const got: Array<Mark & { k: number }> = [];
  for (let y = y0; y <= y1; y += o.step * 0.8)
    for (let x = x0; x <= x1; x += o.step) {
      const px = x + (r() - 0.5) * o.step;
      const py = y + (r() - 0.5) * o.step * 0.8;
      if (!o.inside(px, py)) continue;
      got.push({ x: px, y: py, a: o.ang(px, py), len: o.len * (0.75 + r() * 0.5), w: o.w * (0.8 + r() * 0.4), c: o.color(px, py), k: py + r() * o.step * 2.5 });
    }
  got.sort((a, b) => a.k - b.k);
  out.push(...got);
}
const inEllipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
const around = (cx: number, cy: number) => (x: number, y: number) => Math.atan2(y - cy, x - cx) + Math.PI / 2;
function charcoal(x: CanvasRenderingContext2D) {
  x.strokeStyle = 'rgba(55,55,60,0.55)';
  x.lineWidth = 0.9;
}
const ellipseLine = (x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) => {
  x.beginPath();
  x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  x.stroke();
};
const polyline = (x: CanvasRenderingContext2D, f: (t: number) => [number, number], n = 24) => {
  x.beginPath();
  for (let i = 0; i <= n; i++) {
    const [px, py] = f(i / n);
    if (i) x.lineTo(px, py);
    else x.moveTo(px, py);
  }
  x.stroke();
};

/** The still life on the stand: a cream jug, a green bottle, an apple, an orange and a lemon on a blue drape. */
function stillLifeSubject(seed: number): Subject {
  const r = rng(seed);
  const m: Mark[] = [];
  const all: [number, number, number, number] = [0, 0, CW, CH];
  fill(m, r, { box: all, step: 8, inside: (_x, y) => y < 84, color: (x, y) => hsl(35, 18, 47 - x * 0.07 - y * 0.03 + r() * 5), ang: () => -0.6 + r() * 0.5, len: 15, w: 10 });
  fill(m, r, { box: all, step: 7, inside: (_x, y) => y >= 79, color: (x, y) => hsl(214, 42, 27 + 8 * Math.sin(x * 0.09 + y * 0.04) + r() * 3), ang: (x) => 1.1 + 0.3 * Math.sin(x * 0.05), len: 12, w: 8 });
  fill(m, r, { box: [10, 84, 100, CH], step: 5, inside: (x, y) => y >= 86 && x > 18 + (y - 86) * 0.6 && x < 82 + (y - 86) * 0.3, color: (x, y) => hsl(40, 25, 88 - (y - 86) * 0.15 - Math.max(0, x - 60) * 0.25 + r() * 3), ang: () => 0.15 + r() * 0.2, len: 9, w: 6 });
  const jug = inEllipse(56, 66, 17, 20);
  const neck = (x: number, y: number) => (x > 49 && x < 63 && y > 40 && y < 52) || (x > 46 && x < 66 && y > 37 && y < 42);
  fill(m, r, { box: [36, 34, 76, 88], step: 4.5, inside: (x, y) => jug(x, y) || neck(x, y), color: (x) => hsl(42, 30, 86 - Math.max(0, x - 50) * 0.9 + r() * 3), ang: around(56, 66), len: 8, w: 6 });
  for (let k = 0; k <= 8; k++) {
    const t = -1.25 + k * 0.31;
    m.push({ x: 41 - 8 * Math.cos(t), y: 62 + 11 * Math.sin(t), a: t + Math.PI / 2, len: 5, w: 3.5, c: hsl(42, 28, 74) });
  }
  const bottleHw = (y: number) => (y < 40 ? 3.5 : y < 52 ? 3.5 + (y - 40) * 0.5 : 9.5);
  fill(m, r, { box: [80, 26, 106, 86], step: 4, inside: (x, y) => y > 28 && y < 86 && Math.abs(x - 93) < bottleHw(y), color: (x) => hsl(140, 45, 15 + Math.max(0, 96 - x) * 0.35 + r() * 3), ang: () => Math.PI / 2 + (r() - 0.5) * 0.2, len: 9, w: 5 });
  fill(m, r, { box: [84, 62, 102, 74], step: 3, inside: (x, y) => y > 62 && y < 74 && Math.abs(x - 93) < 8.5, color: (x) => hsl(45, 40, 82 - Math.max(0, x - 90) * 1.2), ang: () => 0, len: 6, w: 4 });
  const fruit = (cx: number, cy: number, rx: number, ry: number, h: number, s: number, l: number) =>
    fill(m, r, { box: [cx - rx - 2, cy - ry - 2, cx + rx + 2, cy + ry + 2], step: 3.2, inside: inEllipse(cx, cy, rx, ry), color: (x, y) => hsl(h, s, l - (x - cx) * 0.7 - (y - cy) * 0.5 + r() * 4), ang: around(cx, cy), len: 6, w: 4.5 });
  fruit(80, 94, 9, 6, 50, 85, 60);
  fruit(112, 90, 9, 9, 4, 70, 44);
  fruit(128, 95, 7, 7, 28, 85, 52);
  for (const [cx, cy, rx, ry] of [[72, 87, 16, 2.5], [104, 87, 8, 2.2], [122, 99.5, 9, 2.2], [136, 101.5, 7, 2], [90, 100.5, 8, 2]] as Array<[number, number, number, number]>)
    fill(m, r, { box: [cx - rx, cy - ry, cx + rx, cy + ry], step: 3, inside: inEllipse(cx, cy, rx, ry), color: () => hsl(222, 40, 13 + r() * 4), ang: () => 0, len: 6, w: 3 });
  const hi = (x: number, y: number, a: number, len: number, w: number, c: string) => m.push({ x, y, a, len, w, c });
  hi(49, 58, 1.3, 6, 3, hsl(50, 60, 97));
  hi(50, 66, 1.5, 7, 2.5, hsl(50, 60, 95));
  for (let y = 54; y < 84; y += 6) hi(89, y, Math.PI / 2, 6, 1.5, hsl(140, 35, 55));
  hi(108, 86, 0.6, 3, 2, '#ffffff');
  hi(125, 92, 0.6, 3, 1.6, '#fff3e0');
  hi(77, 92, 0.2, 4, 1.6, '#fffde7');
  hi(112, 81, 1.2, 4, 1.4, '#4e342e');
  return {
    marks: m,
    sketch: (x) => {
      charcoal(x);
      ellipseLine(x, 56, 66, 17, 20);
      x.strokeRect(49, 40, 14, 12);
      ellipseLine(x, 56, 39, 10, 2.5);
      polyline(x, (t) => [41 - 8 * Math.cos(-1.25 + t * 2.5), 62 + 11 * Math.sin(-1.25 + t * 2.5)], 10);
      polyline(x, (t) => [93 - bottleHw(28 + t * 58), 28 + t * 58], 12);
      polyline(x, (t) => [93 + bottleHw(28 + t * 58), 28 + t * 58], 12);
      ellipseLine(x, 80, 94, 9, 6);
      ellipseLine(x, 112, 90, 9, 9);
      ellipseLine(x, 128, 95, 7, 7);
      x.beginPath();
      x.moveTo(0, 82);
      x.lineTo(CW, 80);
      x.stroke();
    },
  };
}

/** A landscape: mountains, green hills, a river winding down through the fields, trees, the sun. */
function landscapeSubject(seed: number): Subject {
  const r = rng(seed);
  const m: Mark[] = [];
  const ridge = (x: number) => 50 - 14 * Math.exp(-(((x - 110) / 24) ** 2)) - 8 * Math.exp(-(((x - 45) / 20) ** 2)) + 2 * Math.sin(x * 0.2);
  const hill = (x: number) => 60 + 5 * Math.sin(x * 0.06 + 1);
  const riverX = (y: number) => 84 + 22 * Math.sin((y - 64) * 0.06) * ((y - 62) / 66);
  const riverW = (y: number) => 1.5 + (y - 62) * 0.14;
  fill(m, r, { box: [0, 0, CW, 54], step: 7, inside: (x, y) => y < ridge(x) + 2, color: (_x, y) => hsl(205, 60, 60 + y * 0.45 + r() * 3), ang: () => (r() - 0.5) * 0.2, len: 16, w: 9 });
  fill(m, r, { box: [118, 8, 138, 28], step: 3, inside: inEllipse(128, 18, 7, 7), color: () => hsl(48, 95, 82 + r() * 6), ang: around(128, 18), len: 5, w: 4 });
  for (const [cx, cy, rr] of [[40, 18, 8], [52, 14, 9], [64, 19, 7], [96, 30, 6], [106, 27, 7]])
    fill(m, r, { box: [cx - rr, cy - rr, cx + rr, cy + rr], step: 4, inside: inEllipse(cx, cy, rr, rr * 0.7), color: (_x, y) => hsl(210, 30, 96 - (y - cy + rr) * 0.8), ang: () => (r() - 0.5) * 0.3, len: 7, w: 5 });
  fill(m, r, { box: [0, 26, CW, 64], step: 5, inside: (x, y) => y > ridge(x) && y < hill(x) + 2, color: (x, y) => (y < ridge(x) + 4 && ridge(x) < 40 ? hsl(220, 20, 92) : hsl(232, 22, 56 + (y - 40) * 0.35 + r() * 3)), ang: () => -0.3 + r() * 0.6, len: 8, w: 6 });
  fill(m, r, { box: [0, 52, CW, 86], step: 5.5, inside: (x, y) => y > hill(x) && y < 84, color: (_x, y) => hsl(105, 38, 34 + (y - 60) * 0.5 + r() * 4), ang: () => 0.2 + (r() - 0.5) * 0.3, len: 10, w: 7 });
  fill(m, r, { box: [0, 80, CW, CH], step: 7, inside: (_x, y) => y >= 80, color: (_x, y) => hsl(70, 48, 54 + r() * 5 - (y - 80) * 0.25), ang: () => 0.05 + (r() - 0.5) * 0.2, len: 14, w: 8 });
  fill(m, r, { box: [50, 63, 130, CH], step: 2.6, inside: (x, y) => y > 63 && Math.abs(x - riverX(y)) < riverW(y), color: () => hsl(198, 55, 62 + r() * 8), ang: () => (r() - 0.5) * 0.2, len: 5, w: 3 });
  for (const [cx, cy, rr] of [[22, 72, 8], [34, 77, 7], [140, 68, 9], [151, 75, 6]]) {
    m.push({ x: cx, y: cy + rr + 3, a: Math.PI / 2, len: 7, w: 2.5, c: hsl(25, 40, 25) });
    fill(m, r, { box: [cx - rr, cy - rr, cx + rr, cy + rr], step: 3, inside: inEllipse(cx, cy, rr * 0.85, rr), color: (x, y) => hsl(128, 40, 18 + (cy + rr - y) * 0.6 - (x - cx) * 0.4 + r() * 4), ang: around(cx, cy), len: 5, w: 4.5 });
  }
  for (let i = 0; i < 10; i++) m.push({ x: 10 + r() * 140, y: 92 + r() * 30, a: (r() - 0.5) * 0.3, len: 6, w: 2, c: hsl(55, 70, 72) });
  return {
    marks: m,
    sketch: (x) => {
      charcoal(x);
      polyline(x, (t) => [t * CW, ridge(t * CW)], 32);
      polyline(x, (t) => [t * CW, hill(t * CW)], 24);
      polyline(x, (t) => [riverX(63 + t * 65) - riverW(63 + t * 65), 63 + t * 65], 20);
      polyline(x, (t) => [riverX(63 + t * 65) + riverW(63 + t * 65), 63 + t * 65], 20);
      ellipseLine(x, 128, 18, 7, 7);
      for (const [cx, cy, rr] of [[22, 72, 8], [34, 77, 7], [140, 68, 9], [151, 75, 6]]) ellipseLine(x, cx, cy, rr * 0.85, rr);
    },
  };
}

/** A sunset over the sea: the sky going from violet to orange, the sun on the horizon and its path on the water, a cliff, a sailboat. */
function sunsetSubject(seed: number): Subject {
  const r = rng(seed);
  const m: Mark[] = [];
  const cliffTop = (x: number) => 40 + Math.max(0, 140 - x) * 1.6;
  const cliff = (x: number, y: number) => x > 118 && y > cliffTop(x);
  fill(m, r, { box: [0, 0, CW, 66], step: 6, inside: (x, y) => y < 64 && !cliff(x, y), color: (_x, y) => { const t = y / 64; return hsl(260 - 230 * t, 55 + 30 * t, 36 + 26 * t + r() * 3); }, ang: () => (r() - 0.5) * 0.16, len: 16, w: 8 });
  fill(m, r, { box: [54, 46, 78, 64], step: 3, inside: (x, y) => y < 64 && inEllipse(66, 58, 10, 10)(x, y), color: () => hsl(45, 100, 72 + r() * 8), ang: around(66, 58), len: 5, w: 4 });
  fill(m, r, { box: [0, 64, CW, CH], step: 5, inside: (x, y) => y >= 64 && !cliff(x, y), color: (_x, y) => hsl(222, 45, 22 + (y - 64) * 0.12 + r() * 4), ang: () => (r() - 0.5) * 0.1, len: 16, w: 6 });
  fill(m, r, { box: [110, 36, CW, CH], step: 5, inside: cliff, color: (x) => hsl(18, 22, 15 + r() * 6 + (x - 118) * 0.06), ang: () => Math.PI / 2 + (r() - 0.5) * 0.8, len: 9, w: 6 });
  fill(m, r, { box: [110, 36, CW, 80], step: 2.5, inside: (x, y) => x > 118 && y > cliffTop(x) && y < cliffTop(x) + 3, color: () => hsl(95, 30, 26 + r() * 6), ang: () => -0.6, len: 4, w: 2.5 });
  for (let y = 66; y < 124; y += 2.6) for (let k = 0; k < 2; k++) m.push({ x: 66 + (r() - 0.5) * (8 + (y - 64) * 0.4), y, a: 0, len: 5 + r() * 6, w: 2.2, c: hsl(36, 95, 60 + r() * 14) });
  m.push({ x: 41, y: 73, a: 0, len: 12, w: 2.5, c: '#1b1b28' });
  fill(m, r, { box: [38, 56, 50, 72], step: 1.8, inside: (x, y) => x > 40 && x < 48 && y > 57 && y < 71 && (x - 40) / 8 < (y - 57) / 14, color: () => hsl(30, 40, 90), ang: () => Math.PI / 2, len: 3, w: 2 });
  m.push({ x: 39.5, y: 64, a: Math.PI / 2, len: 16, w: 1, c: '#1b1b28' });
  for (let i = 0; i < 18; i++) m.push({ x: r() * 112, y: 68 + r() * 56, a: 0, len: 6, w: 1.4, c: hsl(28, 60, 62) });
  return {
    marks: m,
    sketch: (x) => {
      charcoal(x);
      x.beginPath();
      x.moveTo(0, 64);
      x.lineTo(CW, 64);
      x.stroke();
      ellipseLine(x, 66, 58, 10, 10);
      polyline(x, (t) => [118 + t * 42, cliffTop(118 + t * 42)], 16);
      x.beginPath();
      x.moveTo(40, 57);
      x.lineTo(48, 71);
      x.lineTo(36, 73);
      x.lineTo(46, 73);
      x.stroke();
    },
  };
}
const SUBJECTS = [stillLifeSubject, landscapeSubject, sunsetSubject];

/** A mark's start and end, in pixels. */
const ends = (k: Mark) => {
  const dx = (Math.cos(k.a) * k.len) / 2;
  const dy = (Math.sin(k.a) * k.len) / 2;
  return { sx: k.x - dx, sy: k.y - dy, ex: k.x + dx, ey: k.y + dy };
};
/** Lays a stroke (or the part of it from `f0` to `f1`) on the canvas. */
function lay(x: CanvasRenderingContext2D, k: Mark, f0 = 0, f1 = 1) {
  const e = ends(k);
  const ax = e.sx + (e.ex - e.sx) * f0;
  const ay = e.sy + (e.ey - e.sy) * f0;
  const bx = e.sx + (e.ex - e.sx) * f1;
  const by = e.sy + (e.ey - e.sy) * f1;
  x.lineCap = 'round';
  x.globalAlpha = 0.92;
  x.strokeStyle = k.c;
  x.lineWidth = k.w;
  x.beginPath();
  x.moveTo(ax, ay);
  x.lineTo(bx, by);
  x.stroke();
  // The bristles' streak along it.
  const nx = -Math.sin(k.a) * k.w * 0.22;
  const ny = Math.cos(k.a) * k.w * 0.22;
  x.globalAlpha = 0.16;
  x.strokeStyle = '#ffffff';
  x.lineWidth = Math.max(0.6, k.w * 0.2);
  x.beginPath();
  x.moveTo(ax + nx, ay + ny);
  x.lineTo(bx + nx, by + ny);
  x.stroke();
  x.globalAlpha = 1;
}

let easels = 0;

/* ----------------------------------------------------------------- pictures */

/** A charcoal study of the plaster head on the drawing board: the head, its shadows hatched, the ground. */
const bustDrawingTex = () =>
  painted('pntBustDrawing', 128, 160, (x) => {
    x.fillStyle = '#f3efe4';
    x.fillRect(0, 0, 128, 160);
    x.strokeStyle = 'rgba(40,40,45,0.25)';
    x.lineWidth = 0.6;
    // The guide lines, then the head and its neck and shoulders.
    x.beginPath();
    x.moveTo(64, 10);
    x.lineTo(64, 150);
    x.moveTo(20, 62);
    x.lineTo(108, 62);
    x.stroke();
    x.strokeStyle = 'rgba(30,30,35,0.8)';
    x.lineWidth = 1.2;
    x.beginPath();
    x.ellipse(62, 58, 26, 34, -0.12, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.moveTo(48, 88);
    x.quadraticCurveTo(46, 110, 30, 124);
    x.lineTo(14, 150);
    x.moveTo(78, 86);
    x.quadraticCurveTo(80, 108, 98, 120);
    x.lineTo(118, 150);
    x.stroke();
    // Hair curls, the brow, the nose's shadow, the lips.
    for (let i = 0; i < 9; i++) {
      x.beginPath();
      x.arc(40 + i * 5.5, 30 + Math.abs(i - 4) * 2.4, 4, Math.PI, Math.PI * 2);
      x.stroke();
    }
    x.beginPath();
    x.moveTo(46, 50);
    x.quadraticCurveTo(54, 46, 60, 50);
    x.moveTo(66, 50);
    x.quadraticCurveTo(74, 46, 80, 50);
    x.moveTo(63, 52);
    x.lineTo(60, 70);
    x.lineTo(66, 72);
    x.moveTo(56, 80);
    x.quadraticCurveTo(62, 78, 70, 80);
    x.stroke();
    // The shadow side hatched in, the cast shadow under the jaw.
    x.strokeStyle = 'rgba(30,30,35,0.45)';
    x.lineWidth = 0.7;
    for (let i = 0; i < 22; i++) {
      x.beginPath();
      x.moveTo(68 + (i % 11) * 2, 30 + i * 2.6);
      x.lineTo(86 + (i % 11) * 1.4, 22 + i * 2.6);
      x.stroke();
    }
    for (let i = 0; i < 12; i++) {
      x.beginPath();
      x.moveTo(50 + i * 2.5, 92);
      x.lineTo(56 + i * 2.5, 100);
      x.stroke();
    }
    x.fillStyle = 'rgba(30,30,35,0.75)';
    x.font = `7px ${FONT}`;
    x.fillText('줄리앙 · 4시간', 70, 154);
  });

/** A study pinned or racked: an abstract or a small landscape, `i` choosing. */
const thumbTex = (i: number) =>
  painted(`pntThumb${i}`, 64, 80, (x) => {
    const r = rng(i * 31 + 7);
    const bgs = ['#e9dfc8', '#2b3a55', '#f2e6d9', '#3d5a40', '#d8c3a5', '#1d1d24', '#efe9dd', '#7a4b3a'];
    x.fillStyle = bgs[i % bgs.length];
    x.fillRect(0, 0, 64, 80);
    const k = i % 4;
    if (k === 0) {
      // Colour fields.
      for (let j = 0; j < 3; j++) {
        x.fillStyle = hsl(r() * 360, 50, 45 + r() * 25);
        x.fillRect(6, 6 + j * 24, 52, 20);
      }
    } else if (k === 1) {
      // A little landscape.
      x.fillStyle = hsl(200, 50, 70);
      x.fillRect(0, 0, 64, 40);
      x.fillStyle = hsl(100, 35, 40);
      x.beginPath();
      x.moveTo(0, 46);
      x.quadraticCurveTo(30, 28, 64, 44);
      x.lineTo(64, 80);
      x.lineTo(0, 80);
      x.fill();
      x.fillStyle = hsl(45, 90, 70);
      x.beginPath();
      x.arc(46, 16, 6, 0, Math.PI * 2);
      x.fill();
    } else if (k === 2) {
      // Gestural marks.
      for (let j = 0; j < 14; j++) {
        x.strokeStyle = hsl(r() * 360, 60, 50);
        x.lineWidth = 2 + r() * 5;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(r() * 64, r() * 80);
        x.quadraticCurveTo(r() * 64, r() * 80, r() * 64, r() * 80);
        x.stroke();
      }
    } else {
      // A figure drawing in charcoal.
      x.fillStyle = '#f3efe4';
      x.fillRect(0, 0, 64, 80);
      x.strokeStyle = '#333';
      x.lineWidth = 1.2;
      x.beginPath();
      x.arc(32, 16, 6, 0, Math.PI * 2);
      x.moveTo(32, 22);
      x.quadraticCurveTo(28, 40, 32, 52);
      x.moveTo(32, 30);
      x.lineTo(20, 44);
      x.moveTo(32, 30);
      x.lineTo(44, 38);
      x.moveTo(32, 52);
      x.lineTo(24, 74);
      x.moveTo(32, 52);
      x.lineTo(40, 74);
      x.stroke();
    }
  });

/** The exhibition laid out on paper: the gallery's plan with the works placed round its walls. */
const planTex = () =>
  painted('pntPlan', 256, 176, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 256, 176);
    x.fillStyle = '#263238';
    x.font = `bold 13px ${FONT}`;
    x.fillText('전시 배치안 · 1전시실', 10, 18);
    x.font = `8px ${FONT}`;
    x.fillStyle = '#78909c';
    x.fillText('11.20 ~ 12.15  ·  축척 1:50', 150, 18);
    x.strokeStyle = '#37474f';
    x.lineWidth = 3;
    x.strokeRect(16, 30, 224, 134);
    x.clearRect(110, 160, 36, 8);
    x.lineWidth = 1;
    const cols = ['#e57373', '#64b5f6', '#ffd54f', '#81c784', '#ba68c8', '#ff8a65', '#4db6ac', '#a1887f'];
    // Works along the walls, numbered.
    const at: Array<[number, number, number, number]> = [[30, 33, 28, 6], [70, 33, 40, 6], [128, 33, 22, 6], [170, 33, 50, 6], [233, 50, 6, 30], [233, 100, 6, 40], [20, 60, 6, 34], [20, 110, 6, 28]];
    at.forEach(([px, py, w, h], i) => {
      x.fillStyle = cols[i];
      x.fillRect(px, py, w, h);
      x.fillStyle = '#263238';
      x.font = `bold 8px ${FONT}`;
      x.fillText(String(i + 1), px + (w > h ? w / 2 - 3 : 9), py + (w > h ? 15 : h / 2 + 3));
    });
    // A plinth in the middle and the way round, in red.
    x.fillStyle = '#cfd8dc';
    x.fillRect(118, 90, 20, 20);
    x.strokeStyle = '#d32f2f';
    x.setLineDash([4, 3]);
    x.beginPath();
    x.moveTo(128, 158);
    x.bezierCurveTo(60, 150, 50, 60, 128, 62);
    x.bezierCurveTo(206, 60, 200, 150, 140, 150);
    x.stroke();
    x.setLineDash([]);
    x.fillStyle = '#d32f2f';
    x.font = `8px ${FONT}`;
    x.fillText('관람 동선', 60, 128);
  });

/** The cutting mat's grid. */
const matTex = () =>
  painted('pntMat', 192, 128, (x) => {
    x.fillStyle = '#2f6f5a';
    x.fillRect(0, 0, 192, 128);
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    x.lineWidth = 0.6;
    for (let i = 0; i <= 192; i += 8) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 128);
      x.stroke();
    }
    for (let j = 0; j <= 128; j += 8) {
      x.beginPath();
      x.moveTo(0, j);
      x.lineTo(192, j);
      x.stroke();
    }
    x.strokeStyle = 'rgba(255,255,255,0.7)';
    x.lineWidth = 1;
    x.strokeRect(8, 8, 176, 112);
    x.fillStyle = 'rgba(255,255,255,0.8)';
    x.font = `6px ${FONT}`;
    for (let i = 1; i < 22; i++) x.fillText(String(i), 8 + i * 8 - 2, 6);
  });

/** Paper towels; a paint can's label. */
const canTex = (name: string, color: string) =>
  painted(`pntCan${name}`, 96, 64, (x) => {
    x.fillStyle = color;
    x.fillRect(0, 0, 96, 64);
    x.fillStyle = '#ffffff';
    x.fillRect(0, 18, 96, 28);
    x.fillStyle = '#212121';
    x.font = `bold 15px ${FONT}`;
    x.textAlign = 'center';
    x.fillText(name, 48, 38);
  });

/* ----------------------------------------------------------------- builders */

/** Uses at the drawing table that are written (the artist's note), or done stood at its side. */
const NOTE = /artistNote|note/i;
const SORT = /portfolio/i;
const CLEAN = /clean|brush/i;
/** At the crit wall: leading the planning meeting (beside it, turned out to the room) or a critique (at it). */
const LEADS = /planExhibition|plan|present|brief/i;

export const BUILDERS: Record<string, Builder> = {
  /**
   * A studio easel (작업용 이젤): an H-frame of beech on a base with casters, tipped back a little, a
   * crank on the mast to raise the ledge; the canvas stood on the ledge and held by the top clamp,
   * a jar of brushes and tubes on the ledge, the palette hung on a peg at the side; paint spattered
   * over the base. The painter stands at it with the palette held out in the left hand, loads the
   * brush, lays three strokes where the picture needs them (each going down under the brush), and
   * stands back to look; the canvas comes on from the charcoal drawing to the finished painting —
   * the still life on the stand, a landscape, a sunset at sea — signed, then a fresh canvas. Each
   * easel's picture is somewhere along when the studio opens.
   */
  studioEasel(g, _W, _D, c, _def, _ctx, out) {
    const wood = c === '#a1887f' ? BEECH : c;
    const dark = shade(wood, 0.78);
    const TILT = 0.1;
    // The base: two runners on casters, a beam across, a strut up the back.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, 0.05, 0.6, 0.012), dark, sx * 0.3, 0.06, -0.16);
      for (const z of [-0.42, 0.1]) {
        part(g, cyl(0.022, 0.022, 0.02, 10), BLACK, sx * 0.3, 0.022, z, { rz: Math.PI / 2, outline: false });
        part(g, box(0.03, 0.02, 0.03), STEEL, sx * 0.3, 0.04, z, { outline: false });
      }
    }
    part(g, rbox(0.66, 0.05, 0.07, 0.012), dark, 0, 0.1, -0.18);
    spatter(g, -0.33, 0.33, -0.44, 0.12, 0.086, 18, 1, true);
    // The frame, tipped back.
    const F = new THREE.Group();
    F.position.set(0, 0.08, -0.18);
    F.rotation.x = -TILT;
    g.add(F);
    part(F, rbox(0.065, 1.92, 0.05, 0.012), wood, 0, 0.96, -0.03);
    for (const sx of [-1, 1]) part(F, rbox(0.045, 1.5, 0.045, 0.01), wood, sx * 0.29, 0.75, -0.03);
    for (const y of [0.2, 1.48]) part(F, rbox(0.64, 0.045, 0.04, 0.01), wood, 0, y, -0.03);
    rod(g, new THREE.Vector3(0, 1.05, -0.3), new THREE.Vector3(0, 0.1, -0.44), 0.016, dark);
    // The crank on the mast.
    part(F, cyl(0.03, 0.03, 0.03, 12), BLACK, 0.045, 0.62, -0.03, { rz: Math.PI / 2 });
    rod(F, new THREE.Vector3(0.06, 0.62, -0.03), new THREE.Vector3(0.1, 0.56, -0.03), 0.006, CHROME);
    part(F, cyl(0.01, 0.01, 0.04, 8), BLACK, 0.12, 0.56, -0.03, { rz: Math.PI / 2, outline: false });
    // The ledge: a tray with a lip, the brush jar and a couple of tubes on it.
    const ly = 0.86;
    part(F, rbox(0.8, 0.03, 0.13, 0.008), wood, 0, ly, 0.04);
    part(F, rbox(0.8, 0.045, 0.012, 0.004), dark, 0, ly + 0.025, 0.105);
    spatter(F, -0.38, 0.38, -0.02, 0.1, ly + 0.016, 10, 2, true);
    brushJar(F, 0.31, ly + 0.015, 0.04, 2, true);
    tube(F, -0.28, ly + 0.015, 0.06, 0.3, '#1e88e5');
    tube(F, -0.18, ly + 0.015, 0.03, -0.2, '#fdd835');
    part(F, box(0.08, 0.004, 0.06), '#f5f5f5', 0.2, ly + 0.018, 0.04, { ry: 0.3, outline: false });
    // The canvas on the ledge, the clamp down on its top.
    const CWm = 0.65;
    const CHm = 0.52;
    const cv = new THREE.Group();
    cv.position.set(0, ly + 0.015 + CHm / 2, 0.06);
    F.add(cv);
    part(cv, box(CWm, CHm, 0.035), LINEN, 0, 0, 0);
    const FACE = 0.0185;
    const cnv = typeof document === 'undefined' ? null : document.createElement('canvas');
    let ctx: CanvasRenderingContext2D | null = null;
    let tex: THREE.Texture = new THREE.Texture();
    if (cnv) {
      cnv.width = CW;
      cnv.height = CH;
      ctx = cnv.getContext('2d');
      const ct = new THREE.CanvasTexture(cnv);
      ct.colorSpace = THREE.SRGBColorSpace;
      ct.anisotropy = 4;
      tex = ct;
    }
    const face = sheet(cv, tex, CWm - 0.004, CHm - 0.004, 0, 0, FACE);
    (face.material as THREE.Material).addEventListener('dispose', () => tex.dispose());
    part(F, rbox(0.1, 0.06, 0.09, 0.01), dark, 0, ly + 0.015 + CHm + 0.03, 0.03);
    part(F, rbox(0.07, 0.04, 0.02, 0.006), dark, 0, ly + 0.015 + CHm + 0.005, 0.085);
    // The palette on its peg at the side (taken down to paint).
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const hung = new THREE.Group();
    hung.position.set(0.36, 1.12, -0.22);
    hung.rotation.set(Math.PI / 2 - TILT, 0, -0.3);
    idle.add(hung);
    palette(hung);
    part(F, cyl(0.008, 0.008, 0.06, 8), dark, 0.33, 1.06, 0.0, { rx: Math.PI / 2, outline: false });
    const restBrush = new THREE.Group();
    restBrush.position.set(-0.05, ly + 0.048, 0.05);
    restBrush.rotation.set(0, 0, Math.PI / 2);
    F.add(restBrush);
    brush(restBrush, '#c62828', '#5d4037');

    // The picture: which subject, how far along (each easel somewhere different when the studio opens).
    const nth = easels++;
    let subject = nth % SUBJECTS.length;
    let pic = SUBJECTS[subject](nth * 97 + 13);
    let done = Math.floor(pic.marks.length * [0.45, 0.75, 0.2, 0.92][nth % 4]);
    let finishedAt = -1;
    const fresh = () => {
      if (!ctx) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = GESSO;
      ctx.fillRect(0, 0, CW, CH);
      pic.sketch(ctx);
    };
    const sign = () => {
      if (!ctx) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#7f1d1d';
      ctx.font = `italic bold 8px ${SERIF}`;
      ctx.fillText('S.Y. 2026', CW - 42, CH - 5);
    };
    fresh();
    if (ctx) for (let i = 0; i < done; i++) lay(ctx, pic.marks[i]);
    tex.needsUpdate = true;

    // The painter, the palette in their hand and the brush (moved along its strokes by `animate`).
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const SX = 0.04;
    const SZ = 0.28;
    const painter = spot(g, 'stand', SX, 0, SZ, Math.PI);
    const pal = new THREE.Group();
    pal.position.set(SX - PALETTE.side, PALETTE.up + 0.012, SZ - PALETTE.ahead);
    pal.rotation.set(0.2, 0.6, -0.12);
    use.add(pal);
    const blobs = palette(pal);
    pal.updateMatrix();
    const blobAt = blobs.map((b) => ({ color: b.color, p: b.p.clone().setY(b.p.y + 0.004).applyMatrix4(pal.matrix) }));
    const rig = new THREE.Group();
    use.add(rig);
    const paint = new THREE.MeshToonMaterial({ color: '#d32f2f' });
    brush(rig, '#8d1c1c', paint, 0.26).userData.ownMaterial = true;
    painter.work = marker(rig, 0, 0, 0);
    painter.motion = 'brushwork';
    out.spots = { '*': painter };
    out.work = painter.work;

    // Where things are on the canvas, in the easel's frame.
    g.updateMatrixWorld(true);
    const toCanvas = new THREE.Matrix4().copy(g.matrixWorld).invert().multiply(cv.matrixWorld);
    const onCanvas = (px: number, py: number, off: number) => new THREE.Vector3((px / CW - 0.5) * CWm, (0.5 - py / CH) * CHm, FACE + off).applyMatrix4(toCanvas);
    const lookAt = onCanvas(CW * 0.62, CH * 1.05, 0.17);
    const tmp = new THREE.Vector3();
    const sm = THREE.MathUtils.smoothstep;
    const tipAt = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const handDir = new THREE.Vector3();
    let laid = -1;
    let partial = 0;
    let lastEnd = lookAt.clone();
    /** The next stroke to lay: the picture's next mark, or, once it's done, a touch here and there. */
    const next = (n: number, si: number): Mark => {
      if (done < pic.marks.length) return pic.marks[done];
      const r = rng(n * 7 + si);
      const k = pic.marks[Math.floor(r() * pic.marks.length)];
      return { ...k, len: k.len * 0.5 };
    };
    const blobFor = (c: string) => {
      const col = new THREE.Color(c);
      let best = blobAt[0];
      let d = Infinity;
      for (const b of blobAt) {
        const e = (b.color.r - col.r) ** 2 + (b.color.g - col.g) ** 2 + (b.color.b - col.b) ** 2;
        if (e < d) [d, best] = [e, b];
      }
      return best.p;
    };
    out.animate = (t) => {
      const k = brushwork(t, toolPhase(painter.at.getWorldPosition(tmp)));
      const u = k.u;
      const target = next(k.n, Math.min(2, Math.max(0, Math.floor((u - 0.2) / (0.5 / 3)))));
      const pp = blobFor(target.c).clone();
      // Working the brush round in the blob.
      pp.x += 0.012 * Math.cos(t * 9);
      pp.z += 0.012 * Math.sin(t * 9);
      let changed = false;
      if (u < 0.1) tipAt.copy(pp);
      else if (u < 0.2) {
        const e = ends(target);
        tipAt.copy(pp).lerp(onCanvas(e.sx, e.sy, 0.04), sm(u, 0.1, 0.2));
      } else if (u < 0.7) {
        const si = Math.min(2, Math.floor((u - 0.2) / (0.5 / 3)));
        const v = (u - 0.2 - si * (0.5 / 3)) / (0.5 / 3);
        const key = k.n * 3 + si;
        const e = ends(target);
        const S = onCanvas(e.sx, e.sy, 0.004);
        const E = onCanvas(e.ex, e.ey, 0.004);
        if (v < 0.15) {
          tipAt.copy(onCanvas(e.sx, e.sy, 0.04)).lerp(S, sm(v, 0, 0.15));
          if (laid !== key) partial = 0;
        }
        else if (v < 0.8 && laid !== key) {
          const f = sm(v, 0.15, 0.8);
          tipAt.copy(S).lerp(E, f);
          // The paint goes down under the brush.
          if (ctx && done < pic.marks.length && f > partial) {
            lay(ctx, target, partial, f);
            partial = f;
            changed = true;
          }
        } else {
          if (laid !== key) {
            // The stroke done: it and the two beside it in the picture are on the canvas.
            laid = key;
            partial = 0;
            lastEnd = E.clone();
            if (done < pic.marks.length) {
              if (ctx) lay(ctx, target, 0, 1);
              done++;
              for (let j = 0; j < 2 && done < pic.marks.length; j++, done++) if (ctx) lay(ctx, pic.marks[done]);
              changed = true;
              if (done >= pic.marks.length && finishedAt < 0) {
                finishedAt = t;
                sign();
              }
            }
          }
          const after = si < 2 ? (() => { const e2 = ends(next(k.n, si + 1)); return onCanvas(e2.sx, e2.sy, 0.04); })() : lookAt;
          tipAt.copy(lastEnd).lerp(after, sm(v, 0.8, 1));
        }
      } else if (u < 0.86) tipAt.copy(lookAt);
      else tipAt.copy(lookAt).lerp(pp, sm(u, 0.86, 0.98));
      // Finished and looked at a while: a fresh canvas and the next picture.
      if (finishedAt >= 0 && t - finishedAt > 30 && u > 0.7 && u < 0.86) {
        subject = (subject + 1) % SUBJECTS.length;
        pic = SUBJECTS[subject](Math.floor(t * 13) + nth);
        done = 0;
        finishedAt = -1;
        fresh();
        changed = true;
      }
      if (finishedAt >= 0 && t < finishedAt) finishedAt = t;
      if (changed) tex.needsUpdate = true;
      paint.color.set(target.c);
      rig.position.copy(tipAt);
      // Held pointing in at the canvas, or dipped down onto the palette (the hand's side of it: see brushwork).
      handDir.set(-k.dir.side, k.dir.up, -k.dir.ahead).normalize();
      rig.quaternion.setFromUnitVectors(UP, handDir);
    };
  },

  /**
   * A drawing table (스케치 테이블): a beech trestle, the board tipped up on its left half with a
   * sheet of paper taped on — a charcoal study of the plaster head, hatched — charcoal and a kneaded
   * eraser on its ledge, a high stool pulled up; on the flat right half the plaster head (줄리앙) on
   * its turntable, a jar of brushes in murky water with a rag, an open portfolio of drawings and a
   * sketchbook. Sat at the board drawing; the artist's note written in the sketchbook on it; stood at
   * the side sorting the portfolio, or rinsing the brushes round in the jar.
   */
  sketchTable(g, W, _D, c, def, _ctx, out) {
    const wood = c === '#d7ccc8' ? BEECH : c;
    const dark = shade(wood, 0.75);
    const top = 0.76;
    const w = W - 0.08;
    const d = 0.72;
    const z = -0.08;
    // The trestles and the top.
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.1);
      for (const dz of [-1, 1]) rod(g, new THREE.Vector3(x, top - 0.03, z), new THREE.Vector3(x + sx * 0.04, 0, z + dz * 0.28), 0.022, dark);
      part(g, rbox(0.06, 0.04, d - 0.08, 0.01), dark, x, top - 0.04, z);
      rod(g, new THREE.Vector3(x, 0.25, z - 0.2), new THREE.Vector3(x, 0.25, z + 0.2), 0.012, dark);
    }
    rod(g, new THREE.Vector3(-w / 2 + 0.1, 0.25, z), new THREE.Vector3(w / 2 - 0.1, 0.25, z), 0.014, dark);
    part(g, rbox(w, 0.035, d, 0.01), wood, 0, top, z);
    spatter(g, -w / 2 + 0.05, w / 2 - 0.05, z - d / 2 + 0.05, z + d / 2 - 0.05, top + 0.019, 16, 3, true);
    const ty = top + 0.0175;
    // The drawing board on the left half, tipped up on its prop.
    const bx = -w / 4;
    const B = new THREE.Group();
    B.position.set(bx, ty + 0.05, z + d / 2 - 0.04);
    B.rotation.x = -0.85;
    g.add(B);
    part(B, rbox(0.82, 0.62, 0.025, 0.01), '#e7d8bf', 0, 0.3, 0);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(bx + sx * 0.36, ty, z - 0.2), new THREE.Vector3(bx + sx * 0.36, ty + 0.34, z + d / 2 - 0.355), 0.01, STEEL);
    part(B, box(0.5, 0.58, 0.002), '#f3efe4', -0.04, 0.31, 0.014, { outline: false });
    sheet(B, bustDrawingTex(), 0.4, 0.5, -0.04, 0.31, 0.016);
    for (const [px, py] of [[-0.27, 0.6], [0.19, 0.6], [-0.27, 0.07], [0.19, 0.07]]) part(B, box(0.05, 0.022, 0.002), '#f3e5ab', px, py, 0.017, { rz: 0.5, outline: false });
    // The ledge: charcoal, a pencil, the eraser.
    part(B, rbox(0.82, 0.03, 0.04, 0.006), dark, 0, 0.0, 0.03);
    for (const [x2, col] of [[-0.2, '#1b1b1b'], [-0.16, '#2b2b2b'], [0.1, '#fbc02d']] as Array<[number, string]>) part(B, cyl(0.005, 0.005, 0.1, 6), col, x2, 0.022, 0.035, { rz: Math.PI / 2, outline: false });
    part(B, ball(0.016), '#90a4ae', 0.25, 0.024, 0.035, { outline: false }).scale.set(1.3, 0.7, 1);
    const draw = marker(B, -0.04, 0.22, 0.04);
    // The sketchbook open on the lower left of the board.
    const sb = new THREE.Group();
    sb.position.set(0.28, 0.16, 0.02);
    B.add(sb);
    part(sb, rbox(0.2, 0.14, 0.008, 0.003), '#37474f', 0, 0, 0);
    part(sb, box(0.19, 0.13, 0.002), PAPER, 0, 0, 0.005, { outline: false });
    for (let r2 = 0; r2 < 6; r2++) part(sb, box(0.07, 0.003, 0.001), '#607d8b', -0.05 + (r2 % 2) * 0.1, 0.04 - Math.floor(r2 / 2) * 0.03, 0.007, { outline: false });
    const note = marker(sb, 0, 0, 0.03);
    // The plaster head on its turntable at the back of the right half.
    const hx = w / 4 + 0.12;
    const hz = z - 0.2;
    part(g, cyl(0.12, 0.13, 0.03, 20), '#5d4037', hx, ty + 0.015, hz);
    part(g, cyl(0.07, 0.09, 0.08, 16), '#eeeae2', hx, ty + 0.07, hz);
    part(g, rbox(0.15, 0.09, 0.1, 0.03), '#eeeae2', hx, ty + 0.15, hz);
    part(g, cyl(0.035, 0.045, 0.08, 12), '#eeeae2', hx, ty + 0.22, hz);
    const head = part(g, ball(0.075), '#f2eee6', hx, ty + 0.31, hz);
    head.scale.set(0.85, 1.1, 0.95);
    part(g, ball(0.06), '#e6e0d4', hx, ty + 0.36, hz - 0.02).scale.set(1.2, 0.7, 1.1);
    part(g, box(0.014, 0.04, 0.03), '#eeeae2', hx, ty + 0.305, hz + 0.075, { rx: 0.2 });
    // The brush jar, its rag; the open portfolio, a couple of drawings in it.
    const jx = w / 2 - 0.12;
    const jz = z + 0.1;
    brushJar(g, jx, ty, jz, 4, true);
    part(g, rbox(0.14, 0.02, 0.1, 0.01), '#bcaaa4', jx - 0.02, ty + 0.01, jz - 0.15, { ry: 0.4 });
    const px = w / 4 - 0.06;
    const pz = z + 0.14;
    part(g, rbox(0.5, 0.012, 0.36, 0.004), '#212121', px, ty + 0.006, pz);
    flat(g, thumbTex(3), 0.22, 0.28, px - 0.11, ty + 0.014, pz, 0.05);
    flat(g, thumbTex(1), 0.22, 0.28, px + 0.12, ty + 0.014, pz, -0.04);
    const sort = marker(g, px, ty + 0.03, pz);
    const rinse = marker(g, jx, ty + 0.12, jz);
    // The high stool, pulled up to the board.
    const sx2 = bx;
    const sz = z + d / 2 + 0.2;
    const seat = 0.64;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      rod(g, new THREE.Vector3(sx2 + Math.cos(a) * 0.1, seat - 0.04, sz + Math.sin(a) * 0.1), new THREE.Vector3(sx2 + Math.cos(a) * 0.17, 0, sz + Math.sin(a) * 0.17), 0.014, dark);
    }
    part(g, ring(0.14, 0.008), dark, sx2, 0.26, sz, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.17, 0.16, 0.04, 20), wood, sx2, seat - 0.02, sz);
    out.seat = marker(g, sx2, seat, sz);
    out.work = draw;
    const spots: Record<string, Spot> = { '*': satAt(g, sx2, sz, seat, 'write', draw) };
    for (const i of def.interactions) {
      if (NOTE.test(i.id)) spots[i.id] = satAt(g, sx2, sz, seat, 'write', note);
      else if (SORT.test(i.id)) spots[i.id] = stoodAt(g, px, z + d / 2 + 0.2, 'tinker', sort);
      else if (CLEAN.test(i.id)) spots[i.id] = stoodAt(g, jx - 0.05, z + d / 2 + 0.2, 'stir', rinse);
    }
    out.spots = spots;
  },

  /**
   * The still life (정물대): a stand of painted boards with a backdrop, an ochre cloth hung down the
   * back and a blue drape thrown over the top and falling in folds down the front, a white cloth on
   * it; on it a cream jug, a green bottle with its label, an apple, an orange and a lemon in a
   * bowl — the one the easels paint — under a clamp lamp on its tall stand. Set out stood at its
   * front, the hands among the fruit.
   */
  pntStillLife(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.74;
    const w = 0.7;
    const d = 0.58;
    const z = -0.1;
    part(g, rbox(w, top, d, 0.02), '#e8e4dc', 0, top / 2, z);
    // The backdrop board and its ochre cloth.
    part(g, rbox(w, 0.7, 0.03, 0.01), '#d7d1c5', 0, top + 0.35, z - d / 2 + 0.02);
    for (let i = 0; i < 6; i++) part(g, rbox(w / 6 + 0.01, 0.72, 0.02, 0.008), shade('#c8963e', 0.85 + (i % 2) * 0.15), -w / 2 + w / 12 + (i * w) / 6, top + 0.33, z - d / 2 + 0.045 + (i % 2) * 0.012);
    // The blue drape over the top and down the front in folds.
    part(g, rbox(w + 0.02, 0.02, d + 0.02, 0.008), '#2c4a7a', 0, top + 0.005, z);
    for (let i = 0; i < 7; i++) {
      const x = -w / 2 + 0.05 + (i * (w - 0.1)) / 6;
      const len = 0.42 + ((i * 37) % 5) * 0.06;
      part(g, rbox(0.11, len, 0.025, 0.012), shade('#2c4a7a', 0.8 + (i % 2) * 0.25), x, top - len / 2, z + d / 2 + 0.012 + (i % 2) * 0.012, { rz: (i - 3) * 0.04 });
    }
    // The white cloth, half over the front.
    part(g, rbox(0.34, 0.01, 0.3, 0.004), '#f5f1e6', -0.12, top + 0.02, z + 0.08, { ry: 0.3 });
    part(g, rbox(0.2, 0.14, 0.012, 0.005), '#efe9db', -0.16, top - 0.05, z + d / 2 + 0.04, { rz: 0.15 });
    const ty = top + 0.025;
    // The jug, the bottle, the fruit.
    part(g, lathe('jug', [[0, 0], [0.06, 0], [0.085, 0.06], [0.08, 0.13], [0.045, 0.19], [0.04, 0.22], [0.05, 0.24]]), '#efe3c4', -0.12, ty, z - 0.05);
    part(g, ring(0.04, 0.009, Math.PI * 1.2), '#efe3c4', -0.21, ty + 0.13, z - 0.05, { rz: Math.PI / 2 + 0.6, outline: false });
    part(g, lathe('bottle', [[0, 0], [0.04, 0], [0.042, 0.2], [0.03, 0.25], [0.014, 0.28], [0.014, 0.36], [0.017, 0.37]]), '#1e5631', 0.06, ty, z - 0.1);
    part(g, cyl(0.0425, 0.0425, 0.07, 18), '#efe0b8', 0.06, ty + 0.11, z - 0.1, { outline: false });
    part(g, cyl(0.0155, 0.0155, 0.03, 10), '#7b1f1f', 0.06, ty + 0.36, z - 0.1, { outline: false });
    part(g, ball(0.045), '#c62828', 0.15, ty + 0.043, z + 0.05);
    part(g, cyl(0.004, 0.004, 0.025, 6), '#4e342e', 0.15, ty + 0.095, z + 0.05, { rz: 0.3, outline: false });
    part(g, ball(0.04), '#f57c00', 0.24, ty + 0.038, z + 0.1);
    part(g, ball(0.035), '#fbc02d', -0.02, ty + 0.03, z + 0.12).scale.set(1.35, 0.85, 0.9);
    part(g, lathe('bowl', [[0, 0], [0.04, 0], [0.09, 0.04], [0.1, 0.05]]), '#5d7f8f', 0.22, ty, z - 0.12);
    part(g, ball(0.03), '#7cb342', 0.2, ty + 0.05, z - 0.12);
    part(g, ball(0.028), '#6a1b9a', 0.245, ty + 0.05, z - 0.1);
    // The lamp on its stand at the side, aimed down at the jug.
    const lx = 0.42;
    const lz = z - 0.2;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, new THREE.Vector3(lx, 0.4, lz), new THREE.Vector3(lx + Math.cos(a) * 0.16, 0, lz + Math.sin(a) * 0.16), 0.008, BLACK);
    }
    part(g, cyl(0.012, 0.012, 1.45, 8), BLACK, lx, 0.4 + 0.725, lz, { outline: false });
    rod(g, new THREE.Vector3(lx, 1.8, lz), new THREE.Vector3(0.2, 1.62, z), 0.009, BLACK);
    const beam = new THREE.Group();
    g.add(beam);
    clampLamp(g, new THREE.Vector3(0.2, 1.58, z), new THREE.Vector3(-0.05, ty, z), BLACK, beam);
    const at = marker(g, 0.08, ty + 0.05, z + 0.05);
    out.work = at;
    out.spots = { '*': stoodAt(g, 0, 0.45, 'tinker', at) };
  },

  /**
   * The taboret (물감 카트): a three-tier steel trolley on casters. On top a sheet of glass over grey
   * with the day's mixes knifed out on it and the palette knife, tubes lying about, two jars of
   * brushes in the corners, a roll of paper towel on the side bar; tubes standing in a box on the
   * middle tier; cans of turps (테레빈) and linseed oil (린시드), rags, on the bottom. Mixed at stood
   * at its front, the knife going round on the glass.
   */
  pntPaintCart(g, _W, _D, c, _def, _ctx, out) {
    const w = 0.52;
    const d = 0.4;
    const z = -0.05;
    const col = c;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, cyl(0.012, 0.012, 0.8, 8), col, sx * (w / 2 - 0.02), 0.45, z + sz * (d / 2 - 0.02), { outline: false });
        part(g, cyl(0.025, 0.025, 0.02, 10), BLACK, sx * (w / 2 - 0.02), 0.025, z + sz * (d / 2 - 0.02), { rz: Math.PI / 2, outline: false });
      }
    for (const [y, lip] of [[0.12, 0.06], [0.46, 0.06], [0.82, 0.03]] as Array<[number, number]>) {
      part(g, rbox(w, 0.012, d, 0.004), col, 0, y, z);
      for (const sz of [-1, 1]) part(g, box(w, lip, 0.008), shade(col, 0.85), 0, y + lip / 2, z + sz * (d / 2 - 0.004), { outline: false });
      for (const sx of [-1, 1]) part(g, box(0.008, lip, d), shade(col, 0.85), sx * (w / 2 - 0.004), y + lip / 2, z, { outline: false });
    }
    // The glass palette on top, its mixes, the knife.
    const ty = 0.826;
    part(g, box(0.36, 0.006, 0.28), '#9e9e9e', -0.04, ty + 0.003, z + 0.02, { outline: false });
    part(g, box(0.36, 0.004, 0.28), '#e3f2fd', -0.04, ty + 0.008, z + 0.02, { material: GLASS, outline: false });
    const mixes: Array<[number, number, string]> = [[-0.17, -0.08, '#fafafa'], [-0.11, -0.09, '#fdd835'], [-0.05, -0.09, '#d32f2f'], [0.01, -0.09, '#1e88e5'], [0.07, -0.08, '#212121'], [-0.12, 0.03, '#c9805a'], [-0.02, 0.06, '#7aa36c'], [0.06, 0.03, '#9fb4d8']];
    mixes.forEach(([x, dz, cc], i) => (i < 5 ? blob(g, x, ty + 0.012, z + 0.02 + dz, cc, 0.018) : part(g, cyl(0.04, 0.04, 0.003, 14), cc, x, ty + 0.011, z + 0.02 + dz, { outline: false }).scale.set(1, 1, 0.6)));
    const knife = new THREE.Group();
    knife.position.set(-0.04, ty + 0.016, z + 0.06);
    knife.rotation.y = 0.5;
    g.add(knife);
    part(knife, box(0.05, 0.002, 0.022), CHROME, 0, 0, 0, { outline: false });
    rod(knife, new THREE.Vector3(0.025, 0, 0), new THREE.Vector3(0.07, 0.02, 0), 0.003, CHROME);
    part(knife, cyl(0.007, 0.007, 0.08, 8), '#6d4c41', 0.11, 0.02, 0, { rz: Math.PI / 2, outline: false });
    tube(g, 0.18, ty + 0.006, z + 0.1, 0.4, '#8e24aa');
    tube(g, 0.2, ty + 0.006, z + 0.03, -0.3, '#43a047');
    brushJar(g, 0.19, ty, z - 0.12, 1);
    // The towel roll on the side bar.
    rod(g, new THREE.Vector3(w / 2 + 0.03, 0.74, z - 0.12), new THREE.Vector3(w / 2 + 0.03, 0.74, z + 0.12), 0.006, CHROME);
    part(g, cyl(0.05, 0.05, 0.22, 16), '#fafafa', w / 2 + 0.03, 0.74, z, { rx: Math.PI / 2 });
    part(g, box(0.004, 0.14, 0.2), '#fafafa', w / 2 + 0.08, 0.66, z, { outline: false });
    // Tubes standing in their box on the middle tier.
    part(g, rbox(0.32, 0.08, 0.2, 0.006), '#8d6e63', -0.06, 0.51, z);
    const tc = ['#d32f2f', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#283593', '#8e24aa', '#6d4c41', '#fafafa', '#212121'];
    tc.forEach((cc, i) => {
      const x = -0.19 + (i % 5) * 0.065;
      const zz = z - 0.05 + Math.floor(i / 5) * 0.09;
      part(g, cyl(0.013, 0.013, 0.08, 8), '#eceff1', x, 0.6, zz, { outline: false });
      part(g, cyl(0.0135, 0.0135, 0.03, 8), cc, x, 0.6, zz, { outline: false });
      part(g, cyl(0.008, 0.008, 0.015, 8), BLACK, x, 0.647, zz, { outline: false });
    });
    // The cans and the rags underneath.
    for (const [x, name, cc] of [[-0.14, '테레빈', '#c62828'], [0.02, '린시드', '#f9a825']] as Array<[number, string, string]>) {
      part(g, cyl(0.055, 0.055, 0.16, 16), cc, x, 0.21, z);
      const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0556, 0.0556, 0.08, 16, 1, true, -Math.PI / 2.4, Math.PI / 1.2), new THREE.MeshBasicMaterial({ map: canTex(name, cc) }));
      lab.userData.ownGeometry = lab.userData.ownMaterial = true;
      lab.position.set(x, 0.21, z);
      g.add(lab);
      part(g, cyl(0.014, 0.014, 0.02, 8), '#9e9e9e', x + 0.025, 0.3, z, { outline: false });
    }
    part(g, rbox(0.14, 0.05, 0.12, 0.02), '#bcaaa4', 0.17, 0.15, z, { ry: 0.3 });
    part(g, rbox(0.1, 0.04, 0.1, 0.02), '#90a4ae', 0.18, 0.19, z - 0.03, { ry: -0.2 });
    spatter(g, -w / 2, w / 2, 0.13, 0.8, z + d / 2 + 0.006, 14, 5);
    const at = marker(g, -0.06, ty + 0.02, z + 0.04);
    out.work = at;
    out.spots = { '*': stoodAt(g, 0, 0.44, 'stir', at) };
  },

  /**
   * The brush sink (붓 세척 싱크): a deep enamel basin on steel legs, stained every colour, a tiled
   * splashback with a gooseneck tap and a bar of brush soap; brushes hung bristles-down to dry from
   * clips on a rail over it, a jar of brushes soaking in the basin, a rag over the edge, a card on
   * the tiles (붓 세척 전용 · 기름은 따로!). Washed at stood at its front, the hands working the
   * brushes in the basin under the running tap.
   */
  pntBrushSink(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.66;
    const d = 0.5;
    const z = -0.2;
    const top = 0.88;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.018, 0.018, top - 0.25, 8), STEEL, sx * (w / 2 - 0.05), (top - 0.25) / 2, z + sz * (d / 2 - 0.06), { outline: false });
    part(g, rbox(w - 0.1, 0.02, d - 0.12, 0.006), STEEL, 0, 0.18, z);
    // The basin: walls round a well, stained.
    const bw = w;
    const bd = d;
    const bh = 0.28;
    part(g, rbox(bw, 0.03, bd, 0.01), '#f1efe9', 0, top - bh, z);
    for (const sx of [-1, 1]) part(g, rbox(0.04, bh, bd, 0.012), '#f1efe9', sx * (bw / 2 - 0.02), top - bh / 2, z);
    for (const sz of [-1, 1]) part(g, rbox(bw, bh, 0.04, 0.012), '#f1efe9', 0, top - bh / 2, z + sz * (bd / 2 - 0.02));
    part(g, cyl(0.025, 0.025, 0.004, 12), '#757575', 0.05, top - bh + 0.017, z, { outline: false });
    spatter(g, -bw / 2 + 0.06, bw / 2 - 0.06, z - bd / 2 + 0.06, z + bd / 2 - 0.06, top - bh + 0.017, 22, 6, true);
    spatter(g, -bw / 2 + 0.02, bw / 2 - 0.02, top - bh + 0.02, top - 0.02, z + bd / 2 + 0.001, 16, 7);
    // The splashback, its tiles; the tap.
    const sbz = z - bd / 2 - 0.015;
    part(g, rbox(bw, 0.62, 0.03, 0.006), '#ffffff', 0, top + 0.31, sbz);
    for (let i = 1; i < 6; i++) part(g, box(0.004, 0.62, 0.002), '#cfd8dc', -bw / 2 + (i * bw) / 6, top + 0.31, sbz + 0.016, { outline: false });
    for (let j = 1; j < 6; j++) part(g, box(bw, 0.004, 0.002), '#cfd8dc', 0, top + j * 0.1, sbz + 0.016, { outline: false });
    part(g, cyl(0.025, 0.03, 0.05, 12), CHROME, -0.1, top + 0.025, sbz + 0.05);
    rod(g, new THREE.Vector3(-0.1, top + 0.05, sbz + 0.05), new THREE.Vector3(-0.1, top + 0.3, sbz + 0.05), 0.012, CHROME);
    part(g, ring(0.07, 0.012, Math.PI), CHROME, -0.1, top + 0.3, sbz + 0.12, { ry: Math.PI / 2, outline: false });
    part(g, cyl(0.014, 0.012, 0.04, 10), CHROME, -0.1, top + 0.28, sbz + 0.19, { outline: false });
    part(g, rbox(0.06, 0.03, 0.02, 0.006), CHROME, 0.02, top + 0.06, sbz + 0.04, { rz: -0.4 });
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.42, 8), WATER);
    stream.userData.ownGeometry = true;
    stream.position.set(-0.1, top + 0.05, sbz + 0.19);
    const use = new THREE.Group();
    use.add(stream);
    part(use, cyl(0.06, 0.07, 0.01, 14), '#b3d9f2', -0.1, top - bh + 0.03, sbz + 0.19, { material: WATER, outline: false });
    g.add(use);
    out.inUse = use;
    // Brush soap in its tin, the card.
    part(g, cyl(0.04, 0.04, 0.025, 14), '#90a4ae', 0.2, top + 0.0125, sbz + 0.06);
    part(g, cyl(0.035, 0.035, 0.01, 14), '#efe6c8', 0.2, top + 0.028, sbz + 0.06, { outline: false });
    label(g, '붓 세척 전용 · 기름은 따로!', 0.3, 0.06, 0.12, top + 0.48, sbz + 0.018, '#fff8e1', '#c62828');
    // The rail of brushes hung to dry, bristles down.
    rod(g, new THREE.Vector3(-bw / 2 + 0.04, top + 0.56, sbz + 0.05), new THREE.Vector3(bw / 2 - 0.04, top + 0.56, sbz + 0.05), 0.007, CHROME);
    const hc = ['#c62828', '#212121', '#f9a825', '#6d4c41', '#1565c0', '#2e7d32', '#212121'];
    hc.forEach((h, i) => {
      const x = -0.26 + i * 0.085;
      part(g, box(0.02, 0.025, 0.012), BLACK, x, top + 0.55, sbz + 0.06, { outline: false });
      const b = new THREE.Group();
      b.position.set(x, top + 0.29 - (i % 3) * 0.02, sbz + 0.07);
      g.add(b);
      brush(b, h, ['#3e2723', '#e0c9a6', '#5d4037'][i % 3], 0.25 + (i % 3) * 0.02, i % 2 === 0);
    });
    // The jar soaking in the basin, a rag over the front edge.
    brushJar(g, 0.18, top - bh + 0.015, z + 0.02, 3, true);
    part(g, rbox(0.12, 0.16, 0.012, 0.005), '#d7ccc8', -0.2, top - 0.06, z + bd / 2 + 0.012, { rz: 0.1 });
    part(g, rbox(0.12, 0.012, 0.06, 0.005), '#d7ccc8', -0.2, top + 0.006, z + bd / 2 - 0.02, { rz: 0.1 });
    const at = marker(g, -0.06, top - 0.14, z + 0.06);
    out.work = at;
    out.spots = { '*': stoodAt(g, 0, 0.32, 'scrub', at) };
  },

  /**
   * The canvas and framing bench (캔버스·액자 작업대): a heavy beech workbench with a shelf of
   * stretcher bars and frames under it; on the green cutting mat a stretcher with the canvas being
   * stretched over it (the flaps not yet stapled down), the canvas pliers and the staple gun; a roll
   * of canvas at the back; on the right a finished painting lying in its gold frame with corner
   * clamps, a mat cutter on its rail, a tape measure; mouldings leaning on the wall behind. Stood at
   * the left stapling the canvas down; stood at the right fitting the work in its frame.
   */
  pntFramingTable(g, W, _D, c, def, _ctx, out) {
    const wood = c === '#a1887f' ? '#b98a5e' : c;
    const dark = shade(wood, 0.7);
    const top = 0.88;
    const w = W - 0.12;
    const d = 0.76;
    const z = -0.08;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, rbox(0.08, top - 0.03, 0.08, 0.012), dark, sx * (w / 2 - 0.08), (top - 0.03) / 2, z + sz * (d / 2 - 0.08));
    part(g, rbox(w - 0.1, 0.03, d - 0.1, 0.01), dark, 0, 0.18, z);
    part(g, rbox(w, 0.06, d, 0.012), wood, 0, top, z);
    const ty = top + 0.03;
    // Under it: stretcher bars and frame mouldings.
    for (let i = 0; i < 6; i++) part(g, box(0.9 - (i % 3) * 0.15, 0.025, 0.04), i % 2 ? '#e0c48f' : '#c9a227', -0.3 + (i % 2) * 0.1, 0.21 + Math.floor(i / 2) * 0.026, z - 0.2 + (i % 3) * 0.12, { outline: false });
    // The cutting mat.
    flat(g, matTex(), w - 0.2, d - 0.16, 0, ty + 0.002, z + 0.02);
    // Left: the stretcher, the canvas over it with its flaps out, pliers, staple gun.
    const sx0 = -w / 4 - 0.04;
    const sz0 = z + 0.04;
    part(g, box(0.62, 0.006, 0.5), '#efe7d6', sx0, ty + 0.006, sz0, { outline: false });
    for (const s of [-1, 1]) {
      part(g, rbox(0.5, 0.03, 0.035, 0.006), '#e0c48f', sx0, ty + 0.025, sz0 + s * 0.17);
      part(g, rbox(0.035, 0.03, 0.37, 0.006), '#e0c48f', sx0 + s * 0.23, ty + 0.025, sz0);
    }
    part(g, box(0.47, 0.004, 0.33), LINEN, sx0, ty + 0.042, sz0, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.006, 0.006, 0.012), '#9e9e9e', sx0 - 0.2 + i * 0.08, ty + 0.045, sz0 - 0.17, { outline: false });
    const stg = new THREE.Group();
    stg.position.set(sx0 + 0.05, ty + 0.06, sz0 + 0.22);
    stg.rotation.y = -0.4;
    g.add(stg);
    part(stg, rbox(0.16, 0.06, 0.04, 0.01), '#d32f2f', 0, 0, 0);
    part(stg, rbox(0.04, 0.1, 0.035, 0.01), '#d32f2f', 0.05, -0.05, 0, { rz: 0.3 });
    part(stg, rbox(0.12, 0.012, 0.03, 0.004), BLACK, -0.01, -0.035, 0, { outline: false });
    const pl = new THREE.Group();
    pl.position.set(sx0 - 0.36, ty + 0.012, sz0 + 0.15);
    pl.rotation.y = 0.8;
    g.add(pl);
    part(pl, rbox(0.08, 0.02, 0.06, 0.006), '#455a64', 0, 0, 0);
    for (const s of [-1, 1]) rod(pl, new THREE.Vector3(0.03, 0, s * 0.012), new THREE.Vector3(0.17, 0, s * 0.025), 0.007, '#c62828');
    // The roll of canvas at the back.
    part(g, cyl(0.06, 0.06, 0.9, 18), LINEN, -w / 4, ty + 0.06, z - d / 2 + 0.08, { rz: Math.PI / 2 });
    part(g, cyl(0.02, 0.02, 0.94, 10), '#8d6e63', -w / 4, ty + 0.06, z - d / 2 + 0.08, { rz: Math.PI / 2, outline: false });
    // Right: the painting in its gold frame, corner clamps, the mat cutter, a tape measure.
    const fx = w / 4 + 0.06;
    const fz = z + 0.04;
    part(g, box(0.4, 0.008, 0.3), '#f4f1ea', fx, ty + 0.008, fz, { outline: false });
    flat(g, thumbTex(1), 0.38, 0.28, fx, ty + 0.014, fz);
    for (const s of [-1, 1]) {
      part(g, rbox(0.5, 0.04, 0.05, 0.01), '#c9a227', fx, ty + 0.02, fz + s * 0.175);
      part(g, rbox(0.05, 0.04, 0.4, 0.01), '#c9a227', fx + s * 0.225, ty + 0.02, fz);
    }
    for (const [s1, s2] of [[-1, -1], [1, 1]]) part(g, rbox(0.07, 0.03, 0.07, 0.01), '#1565c0', fx + s1 * 0.23, ty + 0.05, fz + s2 * 0.18);
    part(g, box(0.05, 0.02, 0.6), STEEL, w / 2 - 0.12, ty + 0.012, z, { outline: false });
    part(g, rbox(0.08, 0.05, 0.1, 0.01), '#37474f', w / 2 - 0.12, ty + 0.04, z + 0.12);
    part(g, cyl(0.035, 0.035, 0.03, 16), '#fdd835', fx - 0.3, ty + 0.015, fz + 0.24);
    // Mouldings leaning on the wall behind.
    for (let i = 0; i < 4; i++) part(g, rbox(0.05, 0.9, 0.03, 0.008), ['#c9a227', '#212121', '#8d6e63', '#f5f5f5'][i], w / 2 - 0.25 - i * 0.07, ty + 0.4, z - d / 2 + 0.02 + (i % 2) * 0.01, { rx: -0.15 });
    const staple = marker(g, sx0, ty + 0.06, sz0 + 0.17);
    const frame = marker(g, fx, ty + 0.05, fz + 0.1);
    out.work = staple;
    const spots: Record<string, Spot> = { '*': stoodAt(g, sx0, 0.55, 'chop', staple) };
    for (const i of def.interactions) if (/frame/i.test(i.id)) spots[i.id] = stoodAt(g, fx, 0.55, 'tinker', frame);
    out.spots = spots;
  },

  /**
   * The canvas rack (캔버스 랙): on the left a slotted rack of plywood with canvases of every size
   * stood in it on end, their sizes chalked on the slots (10호, 20호, 30호…), one pulled half out
   * showing its picture; on the right a wire drying rack, its shelves each with a sheet of the day's
   * studies drying on it. Set dressing.
   */
  pntCanvasRack(g, W, _D, c) {
    const wood = c === '#8d6e63' ? '#d4b48c' : c;
    const z = -0.15;
    const d = 0.6;
    // The slotted rack on the left.
    const rw = W * 0.55;
    const rx = -W / 2 + rw / 2 + 0.04;
    part(g, rbox(rw, 0.08, d, 0.01), shade(wood, 0.8), rx, 0.04, z);
    part(g, rbox(rw, 1.3, 0.03, 0.008), wood, rx, 0.69, z - d / 2 + 0.015);
    const slots = 6;
    for (let i = 0; i <= slots; i++) {
      const x = rx - rw / 2 + (i * rw) / slots;
      part(g, rbox(0.018, 1.25, d - 0.04, 0.006), wood, x, 0.67, z);
      if (i < slots) label(g, `${[10, 20, 30, 12, 15, 50][i]}호`, 0.08, 0.035, x + rw / slots / 2, 0.06, z + d / 2 + 0.002, 'none', '#ffffff');
    }
    for (let i = 0; i < slots; i++) {
      const x = rx - rw / 2 + ((i + 0.5) * rw) / slots;
      const n = 2 + (i % 3);
      for (let j = 0; j < n; j++) {
        const h = 0.45 + ((i * 3 + j * 5) % 7) * 0.11;
        const dd = 0.3 + ((i + j) % 3) * 0.08;
        const cz = z + d / 2 - dd / 2 - 0.02 - j * 0.02;
        const pulled = i === 2 && j === 0;
        const cx = x - 0.04 + j * 0.03;
        part(g, box(0.025, h, dd), j % 2 ? LINEN : '#f2ede2', cx, 0.08 + h / 2 + (pulled ? 0 : 0), pulled ? cz + 0.28 : cz);
        if (pulled) sheet(g, thumbTex(i + 2), dd - 0.02, h - 0.02, cx + 0.0135, 0.08 + h / 2, cz + 0.28, Math.PI / 2);
        else part(g, box(0.027, h - 0.03, 0.02), '#c9a87a', cx, 0.08 + h / 2, cz + dd / 2 - 0.02, { outline: false });
      }
    }
    // The drying rack on the right: a frame, its wire shelves, sheets on them.
    const dw = W * 0.38;
    const dx = W / 2 - dw / 2 - 0.04;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.012, 0.012, 1.4, 8), BLACK, dx + sx * (dw / 2), 0.7, z + sz * (d / 2 - 0.04), { outline: false });
    for (let k = 0; k < 12; k++) {
      const y = 0.18 + k * 0.1;
      const tip = k % 4 === 1 ? 0.25 : 0;
      for (const sx of [-1, 1]) rod(g, new THREE.Vector3(dx + sx * (dw / 2), y, z - d / 2 + 0.04), new THREE.Vector3(dx + sx * (dw / 2), y + tip * 0.6, z + d / 2 - 0.04), 0.004, '#616161');
      for (let i = 1; i < 5; i++) rod(g, new THREE.Vector3(dx - dw / 2, y + (tip * 0.6 * i) / 5, z - d / 2 + 0.04 + (i * (d - 0.08)) / 5), new THREE.Vector3(dx + dw / 2, y + (tip * 0.6 * i) / 5, z - d / 2 + 0.04 + (i * (d - 0.08)) / 5), 0.003, '#757575');
      if (k % 4 !== 1 && k < 11) flat(g, thumbTex(k + 10), dw - 0.06, d - 0.16, dx, y + 0.008, z + 0.02);
    }
  },

  /**
   * The crit wall (크리틱 벽): a white board wall on its feet, works pinned up across it with tape and
   * pins for the critique — studies, a figure drawing, colour fields, a small landscape — sticky
   * notes beside them, the invited show's title card (2026 초대전 · 출품 후보) and the exhibition
   * laid out on the gallery's plan. A critique is given stood at it pointing the works out, notebook
   * in hand; the planning meeting is led from beside it, turned out to the room.
   */
  pntCritWall(g, W, _D, _c, def, _ctx, out) {
    const w = W - 0.1;
    const h = 1.6;
    const y0 = 0.3;
    const z = -0.32;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, y0 + h, 0.06, 0.01), '#9e9e9e', sx * (w / 2 - 0.03), (y0 + h) / 2, z);
      part(g, rbox(0.08, 0.04, 0.5, 0.01), '#757575', sx * (w / 2 - 0.03), 0.02, z);
    }
    part(g, rbox(w, h, 0.04, 0.01), '#f7f7f5', 0, y0 + h / 2, z);
    const fz = z + 0.021;
    label(g, '2026 초대전 · 출품 후보', 0.6, 0.07, -0.35, y0 + h - 0.08, fz, '#263238', '#ffffff');
    // The works pinned up.
    const works: Array<[number, number, number, number, number]> = [
      [-0.7, 1.45, 0.3, 0.38, 0], [-0.33, 1.5, 0.28, 0.34, 2], [0.0, 1.47, 0.24, 0.3, 3], [-0.62, 0.95, 0.34, 0.42, 1], [-0.22, 0.98, 0.3, 0.38, 6], [0.06, 1.05, 0.2, 0.26, 4],
    ];
    const tape = (x: number, y: number, rz: number) => part(g, box(0.05, 0.018, 0.002), '#f3e5ab', x, y, fz + 0.004, { rz, outline: false });
    for (const [x, y, ww, hh, k] of works) {
      sheet(g, thumbTex(k), ww, hh, x, y, fz + 0.002);
      tape(x - ww / 2 + 0.02, y + hh / 2 - 0.01, 0.6);
      tape(x + ww / 2 - 0.02, y + hh / 2 - 0.01, -0.6);
    }
    // Sticky notes by them.
    for (const [x, y, col] of [[-0.48, 1.22, '#fff176'], [-0.06, 1.25, '#f8bbd0'], [-0.38, 0.74, '#b3e5fc'], [0.2, 0.86, '#fff176']] as Array<[number, number, string]>) part(g, box(0.07, 0.07, 0.003), col, x, y, fz + 0.003, { rz: (x * 7) % 0.2, outline: false });
    // The plan of the show, on the right.
    const px = 0.55;
    const py = 1.2;
    sheet(g, planTex(), 0.6, 0.41, px, py, fz + 0.002);
    for (const [dx, dy] of [[-0.29, 0.19], [0.29, 0.19], [-0.29, -0.19], [0.29, -0.19]]) part(g, ball(0.01), '#d32f2f', px + dx, py + dy, fz + 0.008, { outline: false });
    // A ledge of markers and a box of pins along the bottom.
    part(g, rbox(w - 0.2, 0.025, 0.08, 0.006), '#bdbdbd', 0, y0 + 0.3, z + 0.06);
    for (const [x, col] of [[0.3, '#d32f2f'], [0.36, '#1565c0'], [0.42, BLACK]] as Array<[number, string]>) part(g, cyl(0.009, 0.009, 0.12, 8), col, x, y0 + 0.325, z + 0.06, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.08, 0.025, 0.05, 0.006), '#ffca28', -0.3, y0 + 0.325, z + 0.06);
    const crit = marker(g, -0.3, 1.2, fz + 0.02);
    const plan = marker(g, px, py, fz + 0.02);
    out.work = crit;
    const spots: Record<string, Spot> = { '*': stoodAt(g, -0.32, z + 0.78, 'meeting', crit) };
    for (const i of def.interactions) if (LEADS.test(i.id)) spots[i.id] = stoodAt(g, w / 2 - 0.02, z + 0.6, 'present', plan, -0.5);
    out.spots = spots;
  },

  // -------------------------------------------------------------------------------------------
  // The store and the gallery (2026-11-05, the layout audit).

  /** The supply shelves (물감·재료 선반): a steel shelf unit of paint tins, tubes in trays, rolls of canvas, gesso and solvent cans. */
  pntSupplyShelf(g, W) {
    const w = W - 0.12;
    const z = -0.22;
    const d = 0.42;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.035, 1.9, 0.035), '#78909c', sx * (w / 2 - 0.02), 0.95, z + sz * (d / 2 - 0.02), { outline: false });
    const levels = [0.08, 0.55, 1.0, 1.45, 1.88];
    for (const y of levels) part(g, box(w, 0.025, d), '#b0bec5', 0, y, z);
    // Bottom: rolls of raw canvas lying along it.
    for (let i = 0; i < 3; i++) part(g, cyl(0.07, 0.07, w - 0.2, 14), LINEN, 0, 0.17 + (i === 2 ? 0.12 : 0), z - 0.1 + (i % 2) * 0.16 + (i === 2 ? 0.08 : 0), { rz: Math.PI / 2 });
    // Gesso and solvent cans.
    const tins = ['#fafafa', '#fafafa', '#c62828', '#1565c0', '#9e9e9e', '#fdd835'];
    tins.forEach((col, i) => {
      const x = -w / 2 + 0.15 + i * ((w - 0.3) / (tins.length - 1));
      part(g, cyl(0.075, 0.075, 0.2, 14), col, x, 0.67, z);
      part(g, cyl(0.077, 0.077, 0.02, 14), '#9e9e9e', x, 0.78, z, { outline: false });
    });
    // Trays of tubes.
    for (let t = 0; t < 3; t++) {
      const x = -w / 2 + 0.25 + t * ((w - 0.5) / 2);
      part(g, box(0.4, 0.06, 0.3), '#5d4037', x, 1.05, z);
      for (let k = 0; k < 6; k++) part(g, cyl(0.014, 0.014, 0.14, 8), PAL_COLORS[(t * 3 + k) % PAL_COLORS.length], x - 0.15 + k * 0.06, 1.1, z, { rx: Math.PI / 2, outline: false });
    }
    // Jars of brushes and a stack of sketchbooks.
    brushJar(g, -w / 2 + 0.2, 1.47, z, 2);
    brushJar(g, -w / 2 + 0.42, 1.47, z, 5);
    for (let k = 0; k < 5; k++) part(g, box(0.32, 0.03, 0.24), ['#263238', '#8d6e63', '#37474f', '#a1887f', '#212121'][k], w / 2 - 0.3, 1.48 + k * 0.032, z);
    label(g, '물감·재료', 0.36, 0.08, 0, 1.94, z + d / 2 + 0.005, '#37474f', '#ffffff');
  },

  /**
   * The drying rack (유화 건조대): an oil painting takes days to dry, so it stands in slots, face out, not touching its neighbours;
   * the slots of a wooden rack, canvases of different sizes in them, the wet ones taped "건조 중".
   */
  pntDryingRack(g, W) {
    const w = W - 0.12;
    const z = -0.1;
    const d = 0.7;
    part(g, rbox(w, 0.08, d, 0.01), '#6d4c41', 0, 0.04, z);
    part(g, rbox(w, 1.5, 0.04, 0.01), '#8d6e63', 0, 0.75, z - d / 2 + 0.02);
    const n = 7;
    for (let i = 0; i <= n; i++) part(g, rbox(0.03, 1.4, d - 0.04, 0.006), '#a1887f', -w / 2 + (i * w) / n, 0.72, z);
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / n;
      const h = 0.5 + ((i * 5) % 4) * 0.2;
      const dd = 0.35 + (i % 3) * 0.1;
      part(g, box(0.025, h, dd), LINEN, x, 0.08 + h / 2, z + d / 2 - dd / 2 - 0.02);
      sheet(g, thumbTex(i + 3), dd - 0.03, h - 0.03, x + 0.014, 0.08 + h / 2, z + d / 2 - dd / 2 - 0.02, Math.PI / 2);
    }
    label(g, '건조 중 · 만지지 마세요', 0.5, 0.07, 0, 1.56, z - d / 2 + 0.045, '#ffecb3', '#5d4037');
  },

  /** A gallery wall (소품 전시 벽): small framed works hung in a line on the white wall, each with its caption card, the show's title above. */
  pntGalleryWall(g, W) {
    const w = W - 0.08;
    const z = -0.44;
    part(g, box(w, 2.1, 0.06), '#fafafa', 0, 1.05, z);
    const fz = z + 0.031;
    label(g, '한지윤 개인전 「빛이 머무는 자리」', 0.9, 0.08, 0, 1.92, fz + 0.002, '#fafafa', '#37474f');
    const works: Array<[number, number, number, number]> = [[-0.62, 0.36, 0.44, 1], [-0.05, 0.5, 0.6, 2], [0.6, 0.4, 0.4, 6]];
    works.forEach(([x, ww, hh, k], i) => {
      part(g, box(ww + 0.06, hh + 0.06, 0.03), i === 1 ? '#3e2723' : '#212121', x, 1.25, fz + 0.015);
      sheet(g, thumbTex(k), ww, hh, x, 1.25, fz + 0.032);
      label(g, ['「아침」 캔버스에 유채', '「물가」 캔버스에 유채', '「밤의 창」 종이에 과슈'][i], 0.24, 0.05, x + ww / 2 - 0.1, 0.92 - hh * 0.05, fz + 0.004, '#ffffff', '#424242');
    });
    // The picture light along the top.
    part(g, box(w - 0.3, 0.04, 0.08), BLACK, 0, 1.75, fz + 0.06);
  },

  /** A sculpture on its plinth (조각 좌대): a white box plinth, a small bronze on it, the caption on its face. */
  pntPlinth(g) {
    part(g, box(0.45, 0.95, 0.45), '#f5f5f5', 0, 0.475, 0);
    part(g, cyl(0.1, 0.12, 0.05, 16), '#4e342e', 0, 0.975, 0);
    part(g, ball(0.09), '#8d6e63', 0, 1.1, 0);
    part(g, cyl(0.05, 0.08, 0.22, 12), '#795548', 0.03, 1.27, 0, { rz: 0.25 });
    part(g, ball(0.06), '#8d6e63', 0.06, 1.42, 0);
    label(g, '「서 있는 사람」 청동', 0.3, 0.05, 0, 0.75, 0.227, '#f5f5f5', '#424242');
  },

  /** The gallery bench (전시실 벤치): a low upholstered bench to sit and look from. */
  pntGalleryBench(g, W) {
    const w = W - 0.3;
    part(g, rbox(w, 0.1, 0.42, 0.03), '#5d4037', 0, 0.42, 0);
    for (const sx of [-1, 1]) part(g, box(0.05, 0.38, 0.38), BLACK, sx * (w / 2 - 0.1), 0.19, 0);
  },

  /** The studio's A-board on the pavement (화실 입간판): the name, the gallery's open hours, an arrow to its door. */
  pntSign(g) {
    for (const s of [-1, 1]) part(g, box(0.5, 0.9, 0.03), '#37474f', 0, 0.48, s * 0.12, { rx: -s * 0.13 });
    label(g, '지윤 화실', 0.42, 0.11, 0, 0.75, 0.11, '#37474f', '#ffffff', 0, -0.13);
    label(g, '갤러리 관람 11–18시 →', 0.42, 0.06, 0, 0.55, 0.137, '#37474f', '#ffecb3', 0, -0.13);
    label(g, '취미 유화반 모집', 0.42, 0.06, 0, 0.42, 0.153, '#37474f', '#ffffff', 0, -0.13);
  },
};
