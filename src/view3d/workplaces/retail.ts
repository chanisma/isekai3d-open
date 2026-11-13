import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, toon } from '../toon';
import { BLACK, CHROME, STEEL, caster, label, painted, picture, seeded, text } from './doctor';
import { AC, BX, CK, CS, FR, FT, RL, ST, WD, railX, rtNow, rtPhase } from './retailMotion';
import type { RtMotion, RtNow } from './retailMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { neighbourShop, shopFront } from './shopFront';
import { BUILDERS as SI } from './styleInfluencer';

/**
 * The 옷가게 drawn as itself (2026-11-01 workplace pipeline, at the user's request): a branch of the made-up label
 * 살랑옷장. Cubes of folded knitwear with a folding ledge; a till with its scanner, detacher, price gun, tissue and
 * bags; fitting rooms with a curtain, a stool and a mirror of their own; rails kept in size order; low tables of
 * stacks; three full-figure mannequins before a seasonal backdrop, facing whoever comes in from the street; a tower
 * of accessories; a sale board; and in the stock room, cartons, a tag gun and a garment steamer.
 *
 * The dress form (mannequin) and the rolling rack (wardrobeRack) are shared with other workplaces and stay as they
 * are. Everything that moves follows the scripts in retailMotion.ts. The label and its goods are made up.
 */

const BRAND = '살랑옷장';
const CORAL = '#d9705f';
const CORAL_D = '#a94e40';
const CREAM = '#f7f1e6';
const INK = '#2f2a30';
const OAK = '#c9a579';
const OAK_D = '#8e6a45';
const PAPER = '#fbfaf6';
const TISSUE = '#fdeee6';
const KRAFT = '#c79a6b';
const SALE = '#d32f2f';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

/** Knitwear, shirts and denim in the season's colours. */
const COLS = ['#e8d5b7', '#7f9c8b', '#c96f5a', '#2f4858', '#efe6da', '#a9b8cf', '#d9a441', '#6b5b73', '#b5647b', '#39506b'];

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
const place = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  m.visible = !!(p ?? home);
  if (p) place(m, p);
  else if (home) place(m, home);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture | null) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function standAt(g: THREE.Object3D, motion: RtMotion, z = 0.6): Spot {
  const s = spot(g, 'stand', 0, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: RtNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? rtNow(sp.motion as RtMotion, t, rtPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  return (paint: (c: CanvasRenderingContext2D) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (ctx) paint(ctx);
    tex.needsUpdate = true;
    return tex;
  };
}
function puffs(g: THREE.Object3D, n: number, color = '#ffffff', size = 0.05) {
  const list = Array.from({ length: n }, () => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(ball(size), mat);
    m.userData.ownMaterial = true;
    m.visible = false;
    g.add(m);
    return { m, mat };
  });
  return (strength: number, x: number, y: number, z: number, spread: number, t: number, rise = 0.5) => {
    list.forEach(({ m, mat }, i) => {
      const u = (t * 0.7 + i / n) % 1;
      m.visible = strength > 0.03;
      if (!m.visible) return;
      const s = Math.sin(i * 12.9) * 0.5;
      m.position.set(x + spread * s * 2 + 0.03 * Math.sin(t * 2 + i), y + u * rise, z + spread * Math.cos(i * 7.7) * 0.6);
      m.scale.setScalar(0.6 + u * 1.6);
      mat.opacity = Math.min(1, strength) * 0.5 * (1 - u) * Math.min(1, u * 6);
    });
  };
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
const logoTex = () =>
  painted('rtLogo', 320, 80, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 320, 80);
    c.fillStyle = CORAL;
    c.fillRect(0, 70, 320, 10);
    text(c, BRAND, 160, 36, 40, CORAL_D, 'center');
  });

// The goods.

/** A folded jumper or a stack's layer, seen from the front: a soft slab with a darker fold line. */
function foldedStack(g: THREE.Object3D, color: string, x: number, y: number, z: number, n: number, w = 0.3, d = 0.24): THREE.Group {
  const s = group(g, x, y, z);
  for (let i = 0; i < n; i++) {
    const k = i % 2 ? shade(color, 0.93) : color;
    part(s, rbox(w, 0.042, d, 0.016), k, 0.003 * ((i * 7) % 3), 0.021 + i * 0.044, 0.003 * ((i * 5) % 3), { outline: i === n - 1 });
    part(s, box(w - 0.04, 0.004, 0.002), shade(color, 0.72), 0, 0.021 + i * 0.044, d / 2 + 0.001, { outline: false });
  }
  return s;
}
/** A jumper spread out and folded as the scripts say: scale it by how wide and deep it still is. */
interface Flat {
  root: THREE.Group;
  body: THREE.Group;
  set(wide: number, deep: number, up: number, skew: number): void;
}
function flatGarment(g: THREE.Object3D, color: string): Flat {
  const root = group(g);
  const body = group(root);
  part(body, rbox(0.42, 0.018, 0.5, 0.012), color, 0, 0.012, 0);
  for (const sx of [-1, 1]) part(body, rbox(0.2, 0.016, 0.13, 0.01), shade(color, 0.92), sx * 0.29, 0.016, -0.16, { outline: false });
  part(body, rbox(0.15, 0.012, 0.05, 0.008), shade(color, 0.8), 0, 0.024, -0.23, { outline: false });
  part(body, box(0.4, 0.004, 0.03), shade(color, 0.82), 0, 0.022, 0.235, { outline: false });
  return {
    root,
    body,
    set(wide, deep, up, skew) {
      body.scale.set(Math.max(0.2, wide), 1 + 2.4 * (1 - deep), Math.max(0.2, deep));
      body.rotation.y = skew;
      root.rotation.x = up * (Math.PI / 2);
    },
  };
}
/** A garment on its hanger, its origin at the hook: flat to the rail (`along`) or facing you. */
function hung(g: THREE.Object3D, color: string, kind: 'top' | 'shirt' | 'dress' | 'coat', along = true): THREE.Group {
  const h = group(g);
  const inner = group(h, 0, 0, 0, along ? Math.PI / 2 : 0);
  part(inner, cyl(0.004, 0.004, 0.07, 6), CHROME, 0, -0.035, 0, { outline: false });
  part(inner, box(0.38, 0.012, 0.018), OAK_D, 0, -0.08, 0, { outline: false });
  const len = kind === 'dress' ? 0.92 : kind === 'coat' ? 0.86 : kind === 'shirt' ? 0.62 : 0.54;
  part(inner, rbox(0.38, len, 0.05, 0.03), color, 0, -0.085 - len / 2, 0);
  if (kind === 'dress') part(inner, rbox(0.46, len * 0.45, 0.05, 0.03), shade(color, 0.92), 0, -0.085 - len * 0.74, 0, { outline: false });
  if (kind === 'shirt') part(inner, box(0.02, len - 0.04, 0.054), shade(color, 0.85), 0, -0.085 - len / 2, 0, { outline: false });
  if (kind === 'coat') for (const sx of [-1, 1]) part(inner, box(0.07, 0.3, 0.056), shade(color, 0.86), sx * 0.08, -0.22, 0, { outline: false });
  // A swing tag on a thread.
  part(inner, box(0.035, 0.06, 0.003), PAPER, 0.14, -0.2, 0.032, { outline: false });
  return h;
}
function carton(g: THREE.Object3D, x: number, y: number, z: number, w = 0.56, h = 0.34, d = 0.42, ry = 0): THREE.Group {
  const b = group(g, x, y, z, ry);
  part(b, box(w, h, d), KRAFT, 0, h / 2, 0);
  part(b, box(w + 0.002, 0.012, 0.06), '#e7cfa8', 0, h, 0, { outline: false });
  part(b, box(0.18, 0.09, 0.002), PAPER, -w * 0.2, h * 0.55, d / 2 + 0.001, { outline: false });
  return b;
}
function shopBag(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, rbox(0.3, 0.3, 0.12, 0.012), CREAM, 0, 0.15, 0);
  part(b, box(0.2, 0.06, 0.002), CORAL, 0, 0.17, 0.061, { outline: false });
  for (const sx of [-1, 1]) rod(b, v3(sx * 0.07, 0.3, 0), v3(sx * 0.03, 0.38, 0), 0.005, CORAL_D);
  rod(b, v3(-0.03, 0.38, 0), v3(0.03, 0.38, 0), 0.005, CORAL_D);
  return b;
}
function priceGun(g: THREE.Object3D, color = '#f9a825'): THREE.Group {
  const b = group(g);
  part(b, rbox(0.05, 0.05, 0.13, 0.012), color, 0, 0.04, 0);
  part(b, rbox(0.035, 0.09, 0.04, 0.01), BLACK, 0, -0.02, 0.04, { rx: -0.3 });
  part(b, cyl(0.004, 0.002, 0.06, 6), CHROME, 0, 0.04, -0.09, { rx: Math.PI / 2, outline: false });
  return b;
}
function basket(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, cyl(0.2, 0.16, 0.36, 12), '#d7c4a3', 0, 0.18, 0);
  part(b, cyl(0.205, 0.205, 0.03, 12), OAK_D, 0, 0.36, 0, { outline: false });
  return b;
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  a: { top: '#5c6bc0', bottom: '#37474f', hair: '#2b1b10' },
  b: { top: '#f48fb1', bottom: '#455a64', hair: '#1a1a1a', skin: '#f8d9c0' },
  c: { top: '#8d6e63', bottom: '#3e2723', hair: '#b0b0b0', skin: '#eac09a' },
  d: { top: '#26a69a', bottom: '#263238', hair: '#5b3a1e' },
  boss: { top: '#6a1b9a', bottom: '#2b2b30', hair: '#2b1b10', skin: '#f8d9c0' },
  jr: { top: '#26a69a', bottom: '#37474f', hair: '#5b3a1e', skin: '#eac09a' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender?: 'female' | 'male'): Fig {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, skin);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(rest);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  const opts: FigureOptions = { gender };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}
function comes(f: Fig, there: number, x: number, z: number, dx: number, t: number) {
  f.root.visible = there > 0.02;
  if (!f.root.visible) return;
  const off = 1 - there;
  f.root.position.set(x + dx * off, off > 0.01 ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z);
}

// =============================================================================================
// 의류 진열대 (clothesShelf, 1 × 1): oak cubes against the wall, with a folding ledge at the waist.

function clothesShelf(g: THREE.Group, out: Built, W: number) {
  const w = W - 0.04;
  const z0 = -0.3;
  // The carcass: two columns of cubes.
  part(g, box(w, 1.82, 0.03), shade(CREAM, 0.95), 0, 0.91, -0.46);
  for (const x of [-w / 2 + 0.015, 0, w / 2 - 0.015]) part(g, box(0.03, 1.82, 0.34), OAK, x, 0.91, z0);
  const ys = [0.06, 0.48, 0.98, 1.36, 1.8];
  ys.forEach((y) => part(g, box(w, 0.03, 0.34), OAK, 0, y, z0));
  // The stock in the cubes that stay full.
  foldedStack(g, COLS[3], -0.24, 0.075, CS.face - 0.02, 7);
  foldedStack(g, COLS[0], 0.24, 0.075, CS.face - 0.02, 6);
  foldedStack(g, COLS[1], -0.24, 0.495, CS.face - 0.02, 6);
  foldedStack(g, COLS[8], 0.24, 0.495, CS.face - 0.02, 5);
  foldedStack(g, COLS[5], -0.24, 1.375, CS.face - 0.02, 6);
  // The size cards along the shelf edges, and a crown of folded blankets.
  [[-0.24, 0.48, 'S'], [0.24, 0.48, 'M'], [-0.24, 0.98, 'M'], [0.24, 1.36, 'L']].forEach(([x, y, s]) => label(g, s as string, 0.1, 0.05, x as number, (y as number) - 0.002, z0 + 0.178, PAPER, INK));
  foldedStack(g, COLS[4], -0.2, 1.815, z0, 3, 0.34, 0.26);
  // The stacks a carton fills.
  const stacks = CS.gaps.map(([x, y], i) => foldedStack(g, [COLS[2], COLS[7], COLS[6]][i], x, y, CS.face, 5));
  const extra = group(stacks[0]);
  part(extra, rbox(0.3, 0.042, 0.24, 0.016), COLS[2], 0, 0.246, 0);
  // The ledge, with a folding board worn at the edges and the pile of what's been tried on.
  part(g, rbox(w, 0.03, 0.32, 0.01), OAK, 0, CS.ledge - 0.015, 0.05);
  for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) part(g, box(0.03, CS.ledge - 0.04, 0.03), OAK_D, x, (CS.ledge - 0.04) / 2, 0.16);
  part(g, box(0.5, 0.006, 0.34), '#e4e0d6', CS.board[0], CS.ledge + 0.003, CS.board[2], { outline: false });
  const r = seeded(11);
  const pile = group(g, CS.pile[0], CS.ledge, CS.pile[2]);
  for (let i = 0; i < 3; i++) part(pile, rbox(0.26 - i * 0.03, 0.05, 0.22 - i * 0.02, 0.022), COLS[(i * 3 + 2) % 10], (r() - 0.5) * 0.03, 0.03 + i * 0.045, (r() - 0.5) * 0.03, { ry: (r() - 0.5) * 0.9 });
  // What's carried.
  const gar = flatGarment(g, COLS[2]);
  const carried = foldedStack(g, COLS[2], 0, 0, 0, 5);
  const box0 = carton(g, 0, 0, 0, 0.52, 0.34, 0.4);
  const flaps = [-1, 1].map((sx) => part(box0, box(0.26, 0.008, 0.4), KRAFT, sx * 0.13, 0.342, 0, { outline: false }));
  const card = label(g, 'FREE', 0.1, 0.05, CS.gaps[1][0], CS.gaps[1][1] - 0.002, z0 + 0.178, CORAL, '#ffffff');
  const boss = person(g, LOOKS.boss, CS.boss[0], CS.boss[1], Math.PI / 2 + 0.25, 'female');
  const spots: Record<string, Spot> = { foldClothes: standAt(g, 'rtFold'), restockShelves: standAt(g, 'rtRestock'), retail_learnFolding: standAt(g, 'rtLearn') };
  spots['*'] = spots.foldClothes;
  const show = (now: string | null, N: RtNow | null, t: number) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const restock = now === 'restockShelves';
    stacks.forEach((s, i) => (s.visible = !restock || (n.filled ?? 0) > i + 0.5));
    carried.visible = false;
    at(carried, P.stack);
    at(box0, P.box);
    flaps.forEach((f, i) => {
      const o = n.flaps ?? 0;
      f.rotation.z = (i ? -1 : 1) * o * 2.2;
      f.position.x = (i ? 1 : -1) * (0.13 + 0.01 * o);
    });
    extra.visible = (n.added ?? 0) > 0.5;
    card.visible = !restock || (n.card ?? 0) > 0.5;
    pile.visible = true;
    at(gar.root, P.gar);
    if (P.gar) gar.set(n.wide ?? 0.5, n.deep ?? 0.5, n.up ?? 0, n.skew ?? 0);
    const lesson = now === 'retail_learnFolding';
    boss.root.visible = lesson;
    if (lesson) {
      boss.armR((n.mArm ?? 0) > 0.5 ? v3(CS.board[0] - 0.1 + 0.06 * Math.sin(t * 3), CS.board[1] + 0.06, CS.board[2] + 0.08) : null);
      boss.armL(null);
      boss.opts.nod = (n.mNod ?? 0) > 0.5 ? 0.14 + 0.12 * Math.abs(Math.sin(t * 3)) : 0.16;
      boss.opts.lean = (n.mArm ?? 0) > 0.5 ? 0.12 : 0.03;
    }
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, CS.board[0], CS.board[1], CS.board[2]);
}

// =============================================================================================
// 계산대 (checkoutCounter, 2 × 1): front to the staff side.

function checkoutCounter(g: THREE.Group, out: Built, W: number) {
  // The customers' face in slatted oak under the name, a cream top; the staff's side with its shelves.
  part(g, rbox(W - 0.04, CK.top - 0.05, 0.8, 0.02), OAK, 0, (CK.top - 0.05) / 2, -0.05);
  for (let i = 0; i < 13; i++) part(g, box(0.04, CK.top - 0.16, 0.012), shade(OAK, 0.84), -0.84 + i * 0.14, (CK.top - 0.05) / 2, -0.456, { outline: false });
  part(g, rbox(W, 0.05, 0.9, 0.015), CREAM, 0, CK.top - 0.025, -0.05);
  part(g, box(W - 0.04, 0.06, 0.8), INK, 0, 0.03, -0.05, { outline: false });
  picture(g, logoTex(), 0.96, 0.24, 0.32, 0.55, -0.466, '#ffffff', Math.PI);
  part(g, box(W - 0.06, 0.78, 0.02), shade(CREAM, 0.92), 0, 0.43, 0.355, { outline: false });
  part(g, box(W - 0.1, 0.018, 0.3), STEEL, 0, 0.32, 0.2);
  // Tissue, flat bags, hangers under the counter.
  for (let i = 0; i < 3; i++) part(g, box(0.32, 0.05 + i * 0.03, 0.2), [TISSUE, CREAM, KRAFT][i], 0.28 + i * 0.26, 0.36 + i * 0.015, 0.22, { outline: false });
  // The till: its screen to the staff, a small one to the customers.
  part(g, cyl(0.012, 0.018, 0.2, 8), BLACK, CK.pos[0], CK.top + 0.1, CK.pos[2] - 0.03, { outline: false });
  const pos = group(g, CK.pos[0], CK.pos[1], CK.pos[2]);
  pos.rotation.x = -0.22;
  part(pos, rbox(0.34, 0.24, 0.03, 0.012), BLACK, 0, 0, 0);
  const screen = swapPic(pos, 0.31, 0.21, 0, 0, 0.017);
  const idle = painted('rtPosIdle', 192, 128, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = CORAL;
    c.fillRect(0, 0, 192, 22);
    text(c, `${BRAND} POS`, 96, 12, 13, '#ffffff', 'center');
    text(c, '상품 택을 스캔하세요', 96, 66, 14, INK, 'center');
  });
  screen.set(idle);
  const posLive = live(192, 128);
  // The cash drawer under the till, sliding out at closing, its notes and coins.
  const drawer = group(g, CK.drawer[0], CK.drawer[1], 0.24);
  part(drawer, rbox(0.46, 0.09, 0.26, 0.008), '#37474f', 0, 0, 0);
  for (let i = 0; i < 4; i++) part(drawer, box(0.09, 0.006, 0.16), ['#a5d6a7', '#ffe082', '#90caf9', '#cfd8dc'][i], -0.16 + i * 0.105, 0.048, 0.02, { outline: false });
  const wad = group(g);
  part(wad, box(0.11, 0.015, 0.06), '#a5d6a7', 0, 0, 0, { outline: false });
  const notes = group(g, CK.drawer[0] + 0.16, CK.top, CK.drawer[2] - 0.14);
  const counted = Array.from({ length: 5 }, (_, i) => part(notes, box(0.11, 0.004, 0.06), '#a5d6a7', 0, 0.003 + i * 0.005, 0, { outline: false }));
  // The scanner in its cradle; the magnetic detacher let into the top with its tray of hard tags; the card reader; the printer.
  const cradle = group(g, CK.scanner[0], CK.top, CK.scanner[2]);
  part(cradle, cyl(0.04, 0.05, 0.04, 10), BLACK, 0, 0.02, 0);
  const scanner = group(g);
  part(scanner, rbox(0.05, 0.05, 0.13, 0.015), BLACK, 0, 0, 0);
  part(scanner, rbox(0.035, 0.1, 0.04, 0.012), BLACK, 0, -0.06, 0.045, { rx: -0.25 });
  const beam = ownLit(scanner, box(0.03, 0.005, 0.01), '#6d1a1a', 0, 0, -0.068);
  part(g, cyl(0.055, 0.06, 0.018, 16), '#546e7a', 0.08, CK.top + 0.009, 0.28, { outline: false });
  part(g, box(0.14, 0.02, 0.09), BLACK, 0.3, CK.top + 0.01, 0.3, { outline: false });
  for (let i = 0; i < 3; i++) part(g, cyl(0.016, 0.016, 0.012, 8), STEEL, 0.25 + i * 0.05, CK.top + 0.028, 0.3, { outline: false });
  const term = group(g, CK.term[0], CK.term[1], CK.term[2]);
  part(term, rbox(0.1, 0.05, 0.16, 0.012), BLACK, 0, 0, 0, { rx: -0.5 });
  const termLed = ownLit(term, box(0.07, 0.003, 0.06), '#332225', 0, 0.03, -0.012);
  termLed.rotation.x = -0.5;
  part(g, rbox(0.16, 0.11, 0.2, 0.02), '#455a64', CK.printer[0], CK.top + 0.055, CK.printer[2]);
  const slip = part(g, box(0.07, 0.002, 0.18), PAPER, CK.printer[0] + 0.02, 1.012, CK.printer[2] + 0.12, { outline: false });
  // The tag gun's price cousin on its rest, a small jar of pins and a stand of member cards; the time-sale sign that lights.
  const gunHome = priceGun(g);
  place(gunHome, CK.gun);
  part(g, cyl(0.03, 0.03, 0.07, 10), '#90caf9', 0.54, CK.top + 0.035, 0.3);
  const saleSign = ownLit(g, box(0.5, 0.14, 0.012), '#5a3030', 0.3, CK.top + 0.25, -0.42);
  picture(g, painted('rtTime', 256, 72, (c) => {
    c.fillStyle = 'rgba(0,0,0,0)';
    c.clearRect(0, 0, 256, 72);
    text(c, '타임 세일', 128, 38, 40, '#ffffff', 'center');
  }), 0.46, 0.12, 0.3, CK.top + 0.25, -0.428, '#ffffff', Math.PI);
  for (const x of [0.1, 0.5]) part(g, cyl(0.006, 0.006, 0.18, 6), STEEL, x, CK.top + 0.09, -0.42, { outline: false });
  // What's coming through.
  const gar = flatGarment(g, COLS[5]);
  const tag = part(gar.root, rbox(0.05, 0.02, 0.05, 0.008), '#90a4ae', 0.08, 0.04, 0.1);
  const sticker = part(gar.root, box(0.05, 0.002, 0.03), SALE, -0.1, 0.03, 0.1, { outline: false });
  const tissue = part(g, box(0.5, 0.003, 0.4), TISSUE, CK.wrap[0], CK.top + 0.003, CK.wrap[2], { outline: false });
  const bag = shopBag(g);
  const shot = priceGun(g);
  const pen = part(g, cyl(0.004, 0.004, 0.11, 6), '#1565c0', 0, 0, 0, { rz: 1.2, outline: false });
  // Who's come in, those behind them in a sale, and the junior at closing.
  const cust = person(g, LOOKS.a, CK.cust[0], CK.cust[1], 0);
  const cardM = part(g, box(0.085, 0.003, 0.055), '#1e88e5', 0, 0, 0, { outline: false });
  let queue: Fig[] | null = null;
  const queueFigs = () => (queue ??= [person(g, LOOKS.b, CK.cust[0] - 0.55, CK.cust[1] - 0.62, 0.25, 'female'), person(g, LOOKS.d, CK.cust[0] - 1.05, CK.cust[1] - 0.44, 0.5), person(g, LOOKS.c, CK.cust[0] - 1.65, CK.cust[1] - 0.32, 0.6)]);
  let junior: Fig | null = null;
  const juniorFig = () => (junior ??= person(g, LOOKS.jr, CK.junior[0], CK.junior[1], -Math.PI / 2 - 0.3));
  const spots: Record<string, Spot> = { ringUp: standAt(g, 'rtTill'), flashSale: standAt(g, 'rtRush'), retail_closeTill: standAt(g, 'rtClose') };
  spots['*'] = spots.ringUp;
  const show = (now: string | null, N: RtNow | null, t: number) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const closing = now === 'retail_closeTill';
    at(gar.root, P.gar);
    if (P.gar) gar.set(n.wide ?? 1, n.deep ?? 1, 0, 0);
    tag.visible = (n.tagOff ?? 0) < 0.5;
    sticker.visible = (n.sale ?? 0) > 0.5;
    tissue.visible = (n.tissue ?? 0) > 0.2;
    at(bag, P.bag);
    at(shot, P.gun);
    gunHome.visible = !P.gun;
    at(scanner, P.scan, [CK.scanner[0], CK.top + 0.1, CK.scanner[2]]);
    setLit(beam, (n.beep ?? 0) > 0.5 ? '#ff5252' : now ? '#b71c1c' : '#6d1a1a');
    setLit(termLed, (n.paid ?? 0) > 0.5 ? '#66ff99' : (n.cTap ?? 0) > 0.2 ? '#ffe082' : '#332225');
    setLit(saleSign, (n.rush ?? 0) > 0.5 ? (Math.sin(t * 6) > -0.3 ? SALE : '#8f2020') : '#5a3030');
    drawer.position.z = 0.24 + 0.18 * (n.drawer ?? 0);
    at(wad, P.wad);
    counted.forEach((m, i) => (m.visible = closing && (n.counted ?? 0) > i / 5));
    slip.visible = closing && (n.slip ?? 0) > 0.05;
    slip.scale.z = Math.max(0.05, n.slip ?? 0);
    at(pen, P.pen);
    if (now) {
      const paid = (n.paid ?? 0) > 0.5;
      const has = (n.scanned ?? 0) > 0.5;
      screen.set(posLive((c) => {
        c.fillStyle = CREAM;
        c.fillRect(0, 0, 192, 128);
        c.fillStyle = closing ? INK : (n.rush ?? 0) ? SALE : CORAL;
        c.fillRect(0, 0, 192, 22);
        text(c, closing ? '마감 정산' : (n.rush ?? 0) ? '타임 세일 30%' : `${BRAND} POS`, 96, 12, 13, '#ffffff', 'center');
        if (closing) {
          text(c, '현금 412,000', 8, 44, 14, INK);
          text(c, '카드 1,286,500', 8, 66, 14, INK);
          text(c, (n.counted ?? 0) >= 1 ? '시재 일치' : '시재 확인 중', 184, 106, 14, (n.counted ?? 0) >= 1 ? '#2e7d32' : SALE, 'right');
        } else if (has) {
          text(c, (n.rush ?? 0) ? '니트 M     27,300' : '니트 M     39,000', 8, 50, 14, INK);
          text(c, paid ? '결제 완료' : (n.rush ?? 0) ? '합계 27,300' : '합계 39,000', 184, 106, 15, paid ? '#2e7d32' : SALE, 'right');
        } else text(c, '상품 택을 스캔하세요', 96, 66, 14, INK, 'center');
      }));
    } else screen.set(idle);
    const there = now && !closing ? n.cust ?? 0 : 0;
    comes(cust, there, CK.cust[0], CK.cust[1], -1.8, t);
    cardM.visible = false;
    if (cust.root.visible) {
      cust.opts.lean = 0.14 * (n.cBow ?? 0) + 0.05;
      cust.opts.nod = 0.2 * (n.cBow ?? 0) + 0.12;
      const tp = n.cTap ?? 0;
      const lay = n.cLay ?? 0;
      cust.armR(tp > 0.05 ? v3(CK.term[0], CK.term[1] + 0.05 + 0.03 * (1 - tp), CK.term[2] - 0.03 * (1 - tp)) : lay > 0.1 ? v3(CK.drop[0] + 0.08, CK.drop[1] + 0.1, CK.drop[2] - 0.2) : null);
      cust.armL((n.took ?? 0) > 0.5 ? v3(CK.cust[0] + 0.22, 1.0, CK.cust[1] + 0.14) : lay > 0.1 ? v3(CK.drop[0] - 0.08, CK.drop[1] + 0.1, CK.drop[2] - 0.2) : null);
      cardM.visible = tp > 0.05;
      if (cardM.visible) cardM.position.set(CK.term[0], CK.term[1] + 0.06 + 0.03 * (1 - tp), CK.term[2] - 0.03 * (1 - tp));
    }
    if ((n.rush ?? 0) > 0.5) {
      const left = n.queue ?? 3;
      queueFigs().forEach((f, i) => {
        f.root.visible = true;
        f.opts.nod = 0.1 + 0.05 * Math.sin(t * 2 + i);
        f.root.position.x = CK.cust[0] - 0.55 - i * 0.55 + (3 - left) * 0.3;
      });
    } else queue?.forEach((f) => (f.root.visible = false));
    if (closing) {
      const f = juniorFig();
      f.root.visible = true;
      f.armR((n.jTap ?? 0) > 0.5 ? v3(CK.pos[0] + 0.3, CK.pos[1] - 0.06, CK.pos[2] + 0.1) : null);
      f.armL(null);
      f.opts.nod = (n.jNod ?? 0) > 0.5 ? 0.14 + 0.12 * Math.abs(Math.sin(t * 3)) : 0.16;
    } else if (junior) junior.root.visible = false;
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, CK.drop[0], CK.top + 0.1, CK.drop[2]);
}

// =============================================================================================
// 포장 선반 (rtBagShelf, 2 × 1, decor): behind the till, the bags and tissue in their cubbies.

function bagShelf(g: THREE.Group, W: number) {
  const w = W - 0.06;
  part(g, box(w, 1.84, 0.03), shade(CREAM, 0.94), 0, 0.92, -0.42);
  for (let i = 0; i < 4; i++) part(g, box(0.03, 1.84, 0.34), OAK, -w / 2 + 0.015 + (i * (w - 0.03)) / 3, 0.92, -0.26);
  [0.05, 0.62, 1.2, 1.82].forEach((y) => part(g, box(w, 0.03, 0.34), OAK, 0, y, -0.26));
  picture(g, logoTex(), 1.0, 0.25, 0, 2.02, -0.4);
  part(g, box(1.06, 0.3, 0.02), OAK_D, 0, 2.02, -0.42);
  const col = (w - 0.03) / 3;
  const x = (i: number) => -w / 2 + 0.015 + col * (i + 0.5);
  // Flat bags in three sizes.
  for (let i = 0; i < 3; i++) {
    const b = group(g, x(i), 0.075, -0.27);
    for (let k = 0; k < 7; k++) part(b, box(0.42 - i * 0.08, 0.012, 0.26), k % 2 ? CREAM : shade(CREAM, 0.95), 0, 0.008 + k * 0.016, 0, { outline: false });
    label(g, ['대', '중', '소'][i], 0.1, 0.05, x(i), 0.047, -0.086, PAPER, INK);
  }
  // Standing bags with their handles, a tissue roll, boxes of hangers.
  for (let i = 0; i < 4; i++) place(shopBag(g), [x(0) - 0.16 + i * 0.1, 0.635, -0.3 + i * 0.012]);
  part(g, cyl(0.07, 0.07, 0.4, 14), TISSUE, x(1), 0.72, -0.26, { rz: Math.PI / 2 });
  carton(g, x(2), 0.635, -0.26, 0.4, 0.26, 0.26);
  label(g, '옷걸이', 0.22, 0.06, x(2) + 0.05, 0.76, -0.126, PAPER, INK);
  // Gift boxes with ribbon, spare hard tags, a row of folded carriers.
  for (let i = 0; i < 3; i++) {
    part(g, box(0.28 - i * 0.05, 0.1, 0.22 - i * 0.03), i % 2 ? CREAM : CORAL, x(0), 1.27 + i * 0.1, -0.26);
    part(g, box(0.03, 0.102, 0.23 - i * 0.03), i % 2 ? CORAL : CREAM, x(0), 1.27 + i * 0.1, -0.26, { outline: false });
  }
  part(g, rbox(0.3, 0.14, 0.22, 0.02), '#90a4ae', x(1), 1.29, -0.26);
  label(g, '택 회수', 0.2, 0.06, x(1), 1.29, -0.146, PAPER, INK);
  foldedStack(g, KRAFT, x(2), 1.215, -0.26, 4, 0.34, 0.24);
}

// =============================================================================================
// 피팅룸 (fittingRoom, 1 × 1): a cubicle with its own mirror, stool, hooks and a curtain on a rail.

function fittingRoom(g: THREE.Group, out: Built) {
  const H = 2.08;
  const x0 = 0.47;
  part(g, box(0.96, H, 0.03), CREAM, 0, H / 2, -0.47);
  for (const sx of [-1, 1]) part(g, box(0.03, H, 0.94), shade(CREAM, 0.97), sx * x0, H / 2, -0.01);
  part(g, box(0.97, 0.012, 0.95), '#e8dfd0', 0, 0.008, -0.01, { outline: false });
  // A mat to stand on, moved a little by the last customer.
  const mat = part(g, rbox(0.56, 0.018, 0.44, 0.012), '#b7a68d', FR.mat[0], FR.mat[1] - 0.012, FR.mat[2], { outline: false });
  // The mirror, floor-length, in a wooden frame, with a smear till it's wiped.
  part(g, rbox(0.56, 1.62, 0.025, 0.006), OAK_D, 0, 0.98, -0.45);
  picture(g, painted('rtMirror', 128, 360, (c) => {
    const grad = c.createLinearGradient(0, 0, 128, 360);
    grad.addColorStop(0, '#edf4f7');
    grad.addColorStop(0.55, '#c6d6de');
    grad.addColorStop(1, '#e3ecf0');
    c.fillStyle = grad;
    c.fillRect(0, 0, 128, 360);
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(20, 150);
    c.lineTo(90, 40);
    c.moveTo(40, 200);
    c.lineTo(112, 90);
    c.stroke();
  }), 0.5, 1.56, 0, 0.98, -0.434);
  const smear = group(g);
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14 + i * 0.02, 0.05), new THREE.MeshBasicMaterial({ color: '#9aa6ab', transparent: true, opacity: 0.32, depthWrite: false }));
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.position.set(-0.1 + i * 0.07, 0.96 + ((i * 3) % 4) * 0.13, -0.43);
    m.rotation.z = 0.4;
    smear.add(m);
  }
  // A stool, with what the last customer left on it; a row of hooks and a hanger left on one; a sign on the header.
  part(g, cyl(0.15, 0.15, 0.03, 16), '#b5647b', FR.stool[0], 0.42, FR.stool[2]);
  for (const a of [0.8, 2.9, 5.0]) rod(g, v3(FR.stool[0] + Math.sin(a) * 0.07, 0.41, FR.stool[2] + Math.cos(a) * 0.07), v3(FR.stool[0] + Math.sin(a) * 0.13, 0.01, FR.stool[2] + Math.cos(a) * 0.13), 0.012, OAK_D);
  const left = group(g, FR.stool[0], 0.435, FR.stool[2]);
  part(left, rbox(0.25, 0.05, 0.2, 0.022), COLS[1], 0, 0.026, 0, { ry: 0.5 });
  part(left, rbox(0.22, 0.05, 0.2, 0.022), COLS[2], 0.02, 0.07, -0.01, { ry: -0.3 });
  for (let i = 0; i < 3; i++) part(g, cyl(0.007, 0.007, 0.05, 6), CHROME, FR.hook[0] + 0.0, FR.hook[1], FR.hook[2] + i * 0.14 - 0.1, { rz: Math.PI / 2, outline: false });
  const onHook = group(g, FR.hook[0] + 0.02, FR.hook[1] + 0.02, FR.hook[2]);
  const h = hung(onHook, COLS[8], 'shirt');
  h.rotation.y = 0;
  // The curtain and its rail: pleats that gather to the left.
  part(g, cyl(0.012, 0.012, 0.96, 8), CHROME, 0, H - 0.08, 0.44, { rz: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) part(g, box(0.05, H, 0.05), OAK, sx * (x0 + 0.005), H / 2, 0.45);
  part(g, box(0.99, 0.14, 0.05), OAK, 0, H + 0.03, 0.45);
  label(g, '피팅룸', 0.36, 0.09, 0, H + 0.03, 0.477, OAK_D, CREAM);
  const curtain = group(g, -0.45, 0, 0.44);
  for (let i = 0; i < 10; i++) part(curtain, box(0.094, H - 0.32, i % 2 ? 0.05 : 0.026), i % 2 ? CORAL : shade(CORAL, 0.86), 0.046 + i * 0.09, 0.26 + (H - 0.32) / 2, 0, { outline: false });
  // Whoever's in there: their feet under the curtain, an arm out through its edge, a hanger held.
  const feet = group(g, 0.02, 0, 0.2);
  for (const sx of [-1, 1]) {
    part(feet, rbox(0.09, 0.07, 0.21, 0.03), '#eceff1', sx * 0.08, 0.035, 0.03);
    part(feet, cyl(0.045, 0.05, 0.3, 8), SKIN, sx * 0.08, 0.2, 0, { outline: false });
  }
  const arm = group(g, FR.slit[0], FR.slit[1], FR.slit[2]);
  part(arm, cyl(0.035, 0.032, 0.3, 8), SKIN, 0, 0, 0.15, { rx: Math.PI / 2, outline: false });
  part(arm, ball(0.038), SKIN, 0, 0, 0.3, { outline: false });
  const thumb = part(arm, cyl(0.012, 0.012, 0.05, 6), SKIN, 0, 0.04, 0.31, { outline: false });
  const hanger = group(g);
  const small = hung(hanger, COLS[3], 'shirt', false);
  const bigger = hung(hanger, COLS[3], 'shirt', false);
  label(small, 'S', 0.05, 0.05, -0.12, -0.2, 0.04, PAPER, INK);
  label(bigger, 'L', 0.05, 0.05, -0.12, -0.2, 0.04, CORAL, '#ffffff');
  // What's carried out.
  const pile = group(g);
  part(pile, rbox(0.3, 0.1, 0.22, 0.04), COLS[1], 0, 0, 0, { ry: 0.2 });
  part(pile, rbox(0.26, 0.08, 0.2, 0.03), COLS[8], 0, 0.08, 0, { ry: -0.3 });
  const cloth = part(g, rbox(0.1, 0.13, 0.015, 0.006), '#90caf9', 0, 0, 0, { outline: false });
  const bin = basket(g);
  const inBin = part(bin, rbox(0.3, 0.12, 0.26, 0.05), COLS[1], 0, 0.36, 0, { outline: false });
  const spots: Record<string, Spot> = { tidyFittingRoom: standAt(g, 'rtTidyFit', 0.68), rtPassSize: standAt(g, 'rtPass', 0.68) };
  spots['*'] = spots.tidyFittingRoom;
  const show = (now: string | null, N: RtNow | null) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const cur = now ? n.cur ?? 0 : 0.78;
    curtain.scale.x = 1 - 0.8 * cur;
    const tidy = now === 'tidyFittingRoom';
    left.visible = tidy ? (n.left ?? 0) > 0.5 : !now;
    onHook.visible = tidy ? (n.hung ?? 0) > 0.5 : !now;
    smear.visible = tidy ? (n.clean ?? 0) < 0.65 : !now;
    mat.rotation.y = tidy ? 0.32 * (1 - (n.mat ?? 0)) : now ? 0 : 0.32;
    at(pile, P.pile);
    at(cloth, P.cloth);
    at(bin, tidy ? FR.basket : null);
    inBin.visible = (n.inBasket ?? 0) > 0.5;
    feet.visible = now === 'rtPassSize' && (n.feet ?? 0) > 0.5;
    const a = n.arm ?? 0;
    arm.visible = feet.visible && a > 0.03;
    arm.position.z = FR.slit[2] - 0.3 * (1 - a);
    thumb.visible = (n.thumb ?? 0) > 0.5;
    at(hanger, P.hanger);
    small.visible = (n.size ?? 0) < 0.5;
    bigger.visible = !small.visible;
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, 0, 1.0, FR.mirror[2] + 0.1);
}

// =============================================================================================
// 쇼윈도 진열대 (rtWindowDisplay, 3 × 1): three full mannequins on a plinth before a seasonal backdrop.

interface Outfit {
  top: string;
  skirt: string;
  coat: string | null;
  scarf: string | null;
}
const SEASONS: Array<{ name: string; sky: string; ground: string; dot: string; looks: Outfit[] }> = [
  { name: '봄 신상', sky: '#fbe3e4', ground: '#f6c6cc', dot: '#ffffff', looks: [{ top: '#fff8e7', skirt: '#f2a7a0', coat: null, scarf: null }, { top: '#c8e0d4', skirt: '#fdf3e0', coat: '#efe0c8', scarf: '#d9705f' }, { top: '#f6d58a', skirt: '#7f9c8b', coat: null, scarf: '#ffffff' }] },
  { name: '여름 린넨', sky: '#d6edf5', ground: '#a9d7e7', dot: '#ffffff', looks: [{ top: '#ffffff', skirt: '#4e8ba8', coat: null, scarf: null }, { top: '#f7d354', skirt: '#ffffff', coat: null, scarf: null }, { top: '#8fcfc0', skirt: '#efe6da', coat: null, scarf: '#4e8ba8' }] },
  { name: '가을 니트', sky: '#f4e0c4', ground: '#d9a56a', dot: '#b5532d', looks: [{ top: '#b5532d', skirt: '#3c3a36', coat: null, scarf: '#e8d5b7' }, { top: '#e8d5b7', skirt: '#6b4a2e', coat: '#8c6239', scarf: '#c96f5a' }, { top: '#54623c', skirt: '#d9a441', coat: null, scarf: null }] },
  { name: '겨울 코트', sky: '#dfe6ee', ground: '#b4c3d3', dot: '#ffffff', looks: [{ top: '#efe6da', skirt: '#2f4858', coat: '#39506b', scarf: '#d32f2f' }, { top: '#6b5b73', skirt: '#2b2b30', coat: '#d7ccc8', scarf: '#6b5b73' }, { top: '#2f4858', skirt: '#a9b8cf', coat: '#2b2b30', scarf: '#efe6da' }] },
];
function seasonTex(i: number) {
  const s = SEASONS[i];
  return painted(`rtSeason${i}`, 512, 256, (c) => {
    c.fillStyle = s.sky;
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = s.ground;
    c.beginPath();
    c.moveTo(0, 220);
    c.bezierCurveTo(140, 150, 320, 240, 512, 170);
    c.lineTo(512, 256);
    c.lineTo(0, 256);
    c.fill();
    const r = seeded(31 + i);
    c.fillStyle = s.dot;
    for (let k = 0; k < 34; k++) {
      c.globalAlpha = 0.45 + r() * 0.45;
      c.beginPath();
      c.arc(r() * 512, r() * 170, 3 + r() * 7, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    text(c, s.name, 256, 42, 34, INK, 'center');
  });
}
interface Mann {
  set(o: Outfit, coat: boolean, scarf: boolean): void;
}
/** A full-figure display mannequin, faceless and matt, feet on a thin steel rod. Its clothes are layers over it. */
function shopMannequin(g: THREE.Object3D, x: number, y: number, z: number, ry: number, armOut: number): Mann {
  const m = group(g, x, y, z, ry);
  const WHITE = '#efeae2';
  part(m, cyl(0.15, 0.15, 0.014, 18), STEEL, 0, 0.007, 0, { outline: false });
  part(m, cyl(0.01, 0.01, 0.82, 6), STEEL, 0, 0.42, -0.06, { outline: false });
  for (const sx of [-1, 1]) {
    rod(m, v3(sx * 0.07, 0.86, 0), v3(sx * 0.075, 0.1, 0.01), 0.042, WHITE);
    part(m, rbox(0.075, 0.05, 0.18, 0.024), WHITE, sx * 0.075, 0.03, 0.03);
  }
  part(m, cyl(0.16, 0.14, 0.2, 14), WHITE, 0, 0.9, 0).scale.z = 0.72;
  part(m, cyl(0.15, 0.12, 0.36, 14), WHITE, 0, 1.17, 0).scale.z = 0.72;
  part(m, cyl(0.04, 0.05, 0.1, 10), WHITE, 0, 1.4, 0, { outline: false });
  const head = part(m, ball(0.098), WHITE, 0, 1.53, 0.005);
  head.scale.set(0.9, 1.2, 0.98);
  for (const sx of [-1, 1]) {
    rod(m, v3(sx * 0.17, 1.33, 0), v3(sx * (0.2 + armOut * 0.08), 1.02, 0.03), 0.03, WHITE);
    rod(m, v3(sx * (0.2 + armOut * 0.08), 1.02, 0.03), v3(sx * (0.2 + armOut * 0.12), 0.78, 0.07), 0.025, WHITE);
    part(m, ball(0.032), WHITE, sx * (0.2 + armOut * 0.12), 0.75, 0.07, { outline: false });
  }
  // The clothes.
  const top = part(m, cyl(0.17, 0.145, 0.44, 14), '#fff', 0, 1.14, 0);
  top.scale.z = 0.78;
  const sleeves = [-1, 1].map((sx) => {
    const s = part(m, cyl(0.04, 0.037, 0.33, 8), '#fff', sx * (0.185 + armOut * 0.04), 1.18, 0.015, { rz: sx * (0.1 + armOut * 0.25), outline: false });
    return s;
  });
  const skirt = part(m, cyl(0.15, 0.26, 0.56, 16), '#fff', 0, 0.68, 0);
  skirt.scale.z = 0.78;
  const coat = group(m);
  const body = part(coat, cyl(0.195, 0.27, 0.98, 16), '#fff', 0, 0.87, -0.01);
  body.scale.z = 0.8;
  const coatMats: THREE.Mesh[] = [body];
  for (const sx of [-1, 1]) {
    coatMats.push(part(coat, cyl(0.048, 0.046, 0.56, 8), '#fff', sx * (0.2 + armOut * 0.06), 1.09, 0.02, { rz: sx * (0.1 + armOut * 0.25), outline: false }));
    coatMats.push(part(coat, box(0.05, 0.3, 0.012), '#fff', sx * 0.07, 1.22, 0.165, { rz: sx * -0.22, outline: false }));
  }
  const open = part(coat, box(0.065, 0.92, 0.01), '#fff', 0, 0.9, 0.169, { outline: false });
  const scarf = group(m);
  const wrap = part(scarf, cyl(0.078, 0.09, 0.09, 12), '#fff', 0, 1.385, 0);
  const tail = part(scarf, rbox(0.075, 0.3, 0.02, 0.008), '#fff', 0.03, 1.2, 0.135, { rz: -0.08 });
  let last = '';
  return {
    set(o, wearCoat, wearScarf) {
      const key = `${o.top}${o.skirt}${o.coat}${o.scarf}${wearCoat}${wearScarf}`;
      if (key === last) return;
      last = key;
      top.material = toon(o.top);
      sleeves.forEach((s) => (s.material = toon(o.top)));
      skirt.material = toon(o.skirt);
      coat.visible = wearCoat && !!o.coat;
      if (o.coat) {
        coatMats.forEach((s) => (s.material = toon(o.coat!)));
        open.material = toon(o.top);
      }
      scarf.visible = wearScarf && !!o.scarf;
      if (o.scarf) {
        wrap.material = toon(o.scarf);
        tail.material = toon(o.scarf);
      }
    },
  };
}
function windowDisplay(g: THREE.Group, out: Built, W: number) {
  const w = W - 0.04;
  // Open-backed to the shop, the mannequins facing the street through the glass (2026-11-06, the layout audit: they faced into the
  // shop, their backs and a backdrop's to the pavement). Lit from a track on two posts; the season's banner hung from a bar over
  // their heads, facing the street.
  part(g, box(w, 0.04, 0.04), INK, 0, 2.46, -0.4);
  for (const sx of [-1, 1]) part(g, box(0.03, 0.46, 0.03), INK, sx * (w / 2 - 0.03), 2.25, -0.4, { outline: false });
  part(g, box(1.6, 0.42, 0.02), OAK_D, 0, 2.18, -0.4);
  const back = swapPic(g, 1.52, 0.36, 0, 2.18, -0.412, Math.PI);
  back.set(seasonTex(0));
  for (const sx of [-1, 1]) part(g, box(0.05, 2.5, 0.05), INK, sx * (w / 2 - 0.03), 1.25, 0.16);
  part(g, box(w, 0.05, 0.05), INK, 0, 2.48, 0.16);
  for (const x of WD.xs) {
    part(g, cyl(0.05, 0.035, 0.11, 10), INK, x, 2.4, 0.16);
    ownLit(g, cyl(0.03, 0.03, 0.006, 10), '#fff4cc', x, 2.343, 0.16);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.42, 1.9, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4cc', transparent: true, opacity: 0.085, depthWrite: false, side: THREE.DoubleSide }));
    cone.userData.ownGeometry = cone.userData.ownMaterial = true;
    cone.position.set(x, 1.38, 0.02);
    cone.rotation.x = 0.14;
    g.add(cone);
  }
  // The plinth, its name painted along its front.
  part(g, rbox(w, WD.plinth, 0.72, 0.012), CREAM, 0, WD.plinth / 2, -0.09);
  part(g, box(w + 0.01, 0.03, 0.73), OAK, 0, 0.02, -0.09, { outline: false });
  // The name along the plinth's street side.
  picture(g, logoTex(), 0.5, 0.125, 1.0, 0.09, -0.452, '#ffffff', Math.PI);
  label(g, '새로운 계절, 새로운 옷', 0.9, 0.1, -0.5, 0.09, -0.452, CREAM, CORAL_D, Math.PI);
  // Props at their feet: a hatbox, a stacked pair of suitcases, a bag on a little stool.
  part(g, cyl(0.13, 0.13, 0.14, 16), CORAL, -0.5, WD.plinth + 0.07, -0.26);
  part(g, cyl(0.135, 0.135, 0.03, 16), shade(CORAL, 0.82), -0.5, WD.plinth + 0.15, -0.26);
  part(g, rbox(0.42, 0.13, 0.22, 0.02), '#8e6a45', 0.5, WD.plinth + 0.065, -0.26);
  part(g, rbox(0.34, 0.11, 0.2, 0.02), '#d9a441', 0.5, WD.plinth + 0.18, -0.26);
  // The season card on its stand, at the dweller's end.
  part(g, cyl(0.1, 0.1, 0.012, 14), STEEL, WD.card[0], 0.008, WD.card[2], { outline: false });
  part(g, cyl(0.01, 0.01, WD.card[1], 6), STEEL, WD.card[0], WD.card[1] / 2, WD.card[2], { outline: false });
  const cardG = group(g, WD.card[0], WD.card[1], WD.card[2]);
  part(cardG, box(0.34, 0.26, 0.012), INK, 0, 0.13, 0);
  const cardPic = swapPic(cardG, 0.31, 0.23, 0, 0.13, 0.008);
  const cardTex = (i: number) =>
    painted(`rtCard${i}`, 186, 138, (c) => {
      c.fillStyle = SEASONS[i].sky;
      c.fillRect(0, 0, 186, 138);
      text(c, SEASONS[i].name, 93, 70, 26, INK, 'center');
    });
  cardPic.set(cardTex(0));
  const men = WD.xs.map((x, i) => shopMannequin(g, x, WD.plinth, WD.z, Math.PI + [0.22, 0, -0.22][i], [1, 0.2, 0.6][i]));
  const spare = hung(g, '#8c6239', 'coat', false);
  place(spare, [0.52, 1.55, 0.3]);
  const flying = hung(g, '#8c6239', 'coat', false);
  men.forEach((m, i) => m.set(SEASONS[0].looks[i], true, true));
  const spots: Record<string, Spot> = { rtDressWindow: standAt(g, 'rtWindow', WD.stand), retail_styleAdvice: standAt(g, 'rtVmd', WD.stand) };
  spots['*'] = spots.rtDressWindow;
  let season = -1;
  const setSeason = (i: number) => {
    if (i === season) return;
    season = i;
    back.set(seasonTex(i));
    cardPic.set(cardTex(i));
  };
  setSeason(0);
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    spare.visible = false;
    at(flying, P.coat);
    if (now === 'rtDressWindow') {
      setSeason(0);
      const look = (((round % 4) + 4) % 4 + ((n.next ?? 0) > 0.5 ? 1 : 0)) % 4;
      men[0].set(SEASONS[0].looks[0], true, true);
      men[2].set(SEASONS[0].looks[2], true, true);
      men[1].set({ ...SEASONS[look].looks[1], coat: '#8c6239', scarf: SEASONS[look].looks[1].scarf ?? '#d9705f' }, (n.coat ?? 0) > 0.5, (n.scarf ?? 0) > 0.5);
      spare.visible = (n.coat ?? 1) < 0.5 && (n.spare ?? 0) > 0.5 && !P.coat;
    } else if (now === 'retail_styleAdvice') {
      const s = ((round % 4) + 4) % 4;
      const was = (n.season ?? 0) > 0.5;
      setSeason((s + (was ? 1 : 0)) % 4);
      cardG.rotation.x = Math.sin((n.flip ?? 0) * Math.PI) * 0.8;
      men.forEach((m, i) => m.set(SEASONS[(s + ((n[`m${i}`] ?? 0) > 0.5 ? 1 : 0)) % 4].looks[i], true, true));
    } else {
      setSeason(0);
      cardG.rotation.x = 0;
      men.forEach((m, i) => m.set(SEASONS[0].looks[i], true, true));
    }
  });
  out.work = marker(g, 0, WD.plinth + 1.1, WD.z);
}

// =============================================================================================
// 매장 행거 (rtGarmentRail, 2 × 1): a floor rail in oak and steel, kept in size order.

function garmentRail(g: THREE.Group, out: Built, W: number) {
  const w = W - 0.08;
  for (const sx of [-1, 1]) {
    part(g, box(0.07, 0.03, 0.52), OAK_D, sx * (w / 2 - 0.02), 0.015, 0);
    rod(g, v3(sx * (w / 2 - 0.02), 0.03, 0), v3(sx * (w / 2 - 0.02), RL.y + 0.1, 0), 0.016, INK);
  }
  rod(g, v3(-w / 2, RL.y, 0), v3(w / 2, RL.y, 0), 0.013, INK);
  rod(g, v3(-w / 2, 0.22, 0), v3(w / 2, 0.22, 0), 0.008, INK);
  // The label's name on a card at the top; a little shoe tray underneath.
  picture(g, logoTex(), 0.36, 0.09, 0, RL.y + 0.09, 0.003);
  part(g, box(0.38, 0.1, 0.012), OAK_D, 0, RL.y + 0.09, -0.006, { outline: false });
  // Hangers.
  const r = seeded(37);
  const messy: number[] = [];
  const kinds: Array<'top' | 'shirt' | 'dress' | 'coat'> = ['shirt', 'top', 'shirt', 'top', 'coat', 'coat', 'shirt', 'dress', 'dress', 'top', 'shirt', 'top'];
  const hangers = kinds.map((k, i) => {
    messy[i] = railX(i) + (r() - 0.5) * 0.16;
    const h = hung(g, COLS[(i * 3 + 1) % 10], k);
    h.position.set(railX(i), RL.y + 0.04, 0);
    return h;
  });
  // The size rings on the rail, between the runs.
  const rings = ['S', 'M', 'L'].map((s, i) => {
    const m = group(g, -0.42 + i * 0.5, RL.y, 0);
    part(m, cyl(0.055, 0.055, 0.008, 14), PAPER, 0, 0, 0, { rx: Math.PI / 2 });
    label(m, s, 0.06, 0.05, 0, 0, 0.006, PAPER, INK);
    return m;
  });
  const flying = hung(g, COLS[(RL.out * 3 + 1) % 10], kinds[RL.out], false);
  const spots: Record<string, Spot> = { rtTidyRail: standAt(g, 'rtRail', RL.stand) };
  spots['*'] = spots.rtTidyRail;
  const show = (now: string | null, N: RtNow | null) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const neat = now ? n.neat ?? 0 : 0.7;
    hangers.forEach((h, i) => {
      h.position.x = messy[i] + (railX(i) - messy[i]) * neat;
      h.rotation.y = (1 - neat) * ((i % 3) - 1) * 0.3;
      h.visible = i === RL.out ? !now || (n.gone ?? 0) < 0.5 : i === RL.into ? !now || (n.inNew ?? 0) > 0.5 : true;
    });
    at(flying, P.gar);
    rings[2].position.x = now ? 0.58 - 0.08 * (1 - (n.ring ?? 0)) : 0.58;
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, 0, RL.y - 0.2, 0.06);
}

// =============================================================================================
// 접이 매대 (rtFoldTable, 3 × 1): a low oak table of stacked knitwear with little acrylic signs.

function foldTable(g: THREE.Group, out: Built, W: number) {
  const w = W - 0.06;
  part(g, rbox(w, 0.04, 0.84, 0.012), OAK, 0, FT.top - 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, FT.top - 0.04, 0.05), OAK_D, sx * (w / 2 - 0.06), (FT.top - 0.04) / 2, sz * 0.36);
  part(g, box(w - 0.2, 0.02, 0.66), shade(OAK, 0.82), 0, 0.2, 0);
  // Under the table: folded back-stock in baskets.
  for (const x of [-0.92, 0, 0.92]) {
    const b = group(g, x, 0.21, 0);
    part(b, rbox(0.56, 0.2, 0.44, 0.02), '#d7c4a3', 0, 0.1, 0);
    foldedStack(b, COLS[((x + 1) * 3) % 10 | 0], 0, 0.2, 0, 2, 0.46, 0.34);
  }
  const mess: THREE.Group[] = [];
  const neatTops: THREE.Group[] = [];
  FT.xs.forEach((x, i) => {
    const back = COLS[(i * 2 + 5) % 10];
    foldedStack(g, back, x, FT.top, FT.z[1], 5, 0.36, 0.28);
    const col = COLS[(i * 4 + 1) % 10];
    foldedStack(g, col, x, FT.top, FT.z[0], 4, 0.36, 0.28);
    neatTops[i] = foldedStack(g, col, x, FT.top + 4 * 0.044, FT.z[0], 1, 0.36, 0.28);
    const m = group(g, x, FT.top + 4 * 0.044, FT.z[0]);
    part(m, rbox(0.4, 0.05, 0.3, 0.022), col, 0.02, 0.03, 0.02, { ry: 0.5 });
    part(m, rbox(0.16, 0.024, 0.08, 0.012), shade(col, 0.88), -0.16, 0.05, 0.1, { ry: -0.7, outline: false });
    mess[i] = m;
  });
  // The small signs on the table.
  const sign = (s: string, x: number, price: string) => {
    part(g, box(0.16, 0.012, 0.06), '#d7e6ea', x, FT.top + 0.006, 0.34, { outline: false });
    part(g, box(0.14, 0.11, 0.004), PAPER, x, FT.top + 0.065, 0.34);
    label(g, s, 0.12, 0.04, x, FT.top + 0.085, 0.343, PAPER, INK);
    label(g, price, 0.12, 0.035, x, FT.top + 0.045, 0.343, PAPER, SALE);
  };
  sign('울 니트', -0.45, '39,000');
  sign('린넨 셔츠', 0.46, '29,000');
  const gar = flatGarment(g, COLS[1]);
  const spots: Record<string, Spot> = { rtSquareStacks: standAt(g, 'rtTable', FT.stand) };
  spots['*'] = spots.rtSquareStacks;
  const show = (now: string | null, N: RtNow | null) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const done = (i: number) => (now ? (n[`d${i}`] ?? 0) > 0.5 : i !== 1);
    const lift = Math.round(n.lift ?? 0) - 1;
    FT.xs.forEach((_, i) => {
      mess[i].visible = !done(i) && lift !== i;
      neatTops[i].visible = done(i) && lift !== i;
    });
    at(gar.root, P.gar);
    if (P.gar) {
      const f = n.fold ?? 0;
      gar.set(0.95 - 0.4 * f, 0.95 - 0.45 * f, 0, 0);
      gar.body.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && lift >= 0) (o as THREE.Mesh).material = toon(COLS[(lift * 4 + 1) % 10]);
      });
    }
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, 0, FT.top + 0.2, 0.14);
}

// =============================================================================================
// 스팀 다리미 (rtSteamer, 1 × 1): a tank on castors, a pole with a hook, a rumpled shirt and a head on a hose.

function steamer(g: THREE.Group, out: Built) {
  const t0 = ST.tank;
  part(g, cyl(0.2, 0.22, 0.04, 16), '#37474f', t0[0], 0.09, t0[2]);
  for (let i = 0; i < 4; i++) caster(g, t0[0] + Math.sin(i * 1.57 + 0.8) * 0.18, t0[2] + Math.cos(i * 1.57 + 0.8) * 0.18, 0.03);
  part(g, rbox(0.3, 0.46, 0.3, 0.05), PAPER, t0[0], 0.34, t0[2]);
  part(g, box(0.04, 0.28, 0.006), '#90caf9', t0[0] - 0.09, 0.34, t0[2] + 0.151, { outline: false });
  part(g, cyl(0.05, 0.05, 0.03, 12), CORAL, t0[0], 0.585, t0[2]);
  label(g, '스팀', 0.12, 0.05, t0[0] + 0.05, 0.42, t0[2] + 0.152, PAPER, INK);
  const led = ownLit(g, ball(0.012), '#442', t0[0] + 0.05, 0.34, t0[2] + 0.153);
  // The pole, the hook bar and the holster.
  rod(g, v3(t0[0] - 0.12, 0.1, t0[2]), v3(-0.06, 1.72, ST.shoulder[2] - 0.08), 0.012, CHROME);
  part(g, cyl(0.009, 0.009, 0.14, 6), CHROME, -0.06, 1.68, ST.shoulder[2] - 0.02, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.03, 0.022, 0.09, 10), BLACK, ST.rest[0], ST.rest[1] - 0.05, ST.rest[2]);
  rod(g, v3(t0[0] - 0.05, 0.6, t0[2]), v3(ST.rest[0], ST.rest[1] - 0.09, ST.rest[2]), 0.008, CHROME);
  // The shirt, its wrinkles going as the head comes down it; a rail of three done behind.
  const shirt = group(g, ST.shoulder[0], ST.shoulder[1] + 0.12, ST.shoulder[2]);
  const inner = hung(shirt, COLS[5], 'shirt', false);
  const r = seeded(77);
  const wrinkles = Array.from({ length: 9 }, (_, i) =>
    part(inner, box(0.2 + r() * 0.12, 0.007, 0.002), shade(COLS[5], 0.72), (r() - 0.5) * 0.08, -0.2 - i * 0.06, 0.028, { rz: (r() - 0.5) * 0.7, outline: false }),
  );
  const head = group(g);
  part(head, rbox(0.1, 0.17, 0.06, 0.02), '#eceff1', 0, 0, 0);
  part(head, box(0.075, 0.13, 0.006), STEEL, 0, 0, -0.032, { outline: false });
  part(head, rbox(0.03, 0.12, 0.03, 0.012), CORAL, 0, -0.13, 0.015, { rx: -0.2 });
  const hose = limb(g, 0.012, '#607d8b');
  const hoseMid = limb(g, 0.012, '#607d8b');
  const steam = puffs(g, 7, '#ffffff', 0.05);
  const mid = new THREE.Vector3();
  const from = v3(t0[0], 0.6, t0[2]);
  const hd = new THREE.Vector3();
  const spots: Record<string, Spot> = { rtSteam: standAt(g, 'rtSteam', ST.stand) };
  spots['*'] = spots.rtSteam;
  const show = (now: string | null, N: RtNow | null, t: number) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(head, P.head, ST.rest);
    if (!P.head) head.position.y += 0.03;
    hd.copy(head.position);
    mid.copy(from).lerp(hd, 0.5);
    mid.y = Math.min(from.y, hd.y) - 0.1;
    mid.z += 0.1;
    hose(from, mid);
    hoseMid(mid, hd);
    const smooth = now ? n.smooth ?? 0 : 0;
    wrinkles.forEach((m, i) => (m.visible = i / wrinkles.length >= smooth));
    shirt.rotation.y = (n.turn ?? 0) * Math.PI;
    setLit(led, (n.power ?? 0) > 0.2 ? '#ff5252' : '#553b3b');
    steam((n.steam ?? 0) * (now ? 1 : 0), hd.x, hd.y, hd.z - 0.05, 0.05, t, 0.4);
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, ST.shoulder[0], 1.1, ST.shoulder[2]);
}

// =============================================================================================
// 입고 상자 (rtStockBoxes, 2 × 1): cartons to the wall, one open on a trolley, a rolling rail of what's been tagged.

function stockBoxes(g: THREE.Group, out: Built) {
  // Cartons up the back.
  carton(g, -0.66, 0, -0.26, 0.56, 0.4, 0.42);
  carton(g, -0.66, 0.4, -0.26, 0.5, 0.36, 0.4, 0.05);
  carton(g, -0.1, 0, -0.26, 0.5, 0.42, 0.42, -0.04);
  carton(g, -0.14, 0.42, -0.25, 0.42, 0.3, 0.36, 0.1);
  label(g, '입고 11/01', 0.3, 0.07, -0.66, 0.66, -0.055, PAPER, INK);
  // A trolley, its open carton.
  part(g, box(0.66, 0.03, 0.46), '#546e7a', BX.open[0], 0.2, BX.open[2]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, BX.open[0] + sx * 0.28, BX.open[2] + sz * 0.18, 0.03);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.012, 0.012, 0.2, 6), CHROME, BX.open[0] + sx * 0.28, 0.12, BX.open[2] + sz * 0.18, { outline: false });
  const crt = group(g, BX.open[0], 0.215, BX.open[2]);
  part(crt, box(0.56, 0.3, 0.42), KRAFT, 0, 0.15, 0);
  part(crt, box(0.52, 0.002, 0.38), '#8d6e4d', 0, 0.301, 0, { outline: false });
  foldedStack(crt, COLS[1], -0.12, 0.25, 0, 1, 0.24, 0.28);
  foldedStack(crt, COLS[6], 0.13, 0.25, 0, 1, 0.24, 0.28);
  const tape = part(crt, box(0.58, 0.004, 0.06), '#e7cfa8', 0, 0.306, 0, { outline: false });
  const flaps = [-1, 1].map((sz) => part(crt, box(0.56, 0.006, 0.21), KRAFT, 0, 0.304, sz * 0.105, { outline: false }));
  // A small table for the slips and the gun.
  part(g, rbox(0.34, 0.02, 0.26, 0.008), OAK, -0.08, 0.72, BX.gun[2]);
  rod(g, v3(-0.08, 0.02, BX.gun[2]), v3(-0.08, 0.71, BX.gun[2]), 0.012, INK);
  part(g, cyl(0.12, 0.12, 0.014, 12), INK, -0.08, 0.01, BX.gun[2], { outline: false });
  const gunHome = priceGun(g, '#f4511e');
  place(gunHome, [BX.gun[0] + 0.02, 0.76, BX.gun[2]]);
  // A roll of tags on it.
  part(g, cyl(0.03, 0.03, 0.03, 10), PAPER, -0.18, 0.745, BX.gun[2] - 0.05);
  // The rolling rail.
  const railL = BX.railX;
  const railR = 0.94;
  for (const x of [railL, railR]) {
    part(g, box(0.05, 0.025, 0.46), INK, x, 0.05, 0);
    for (const sz of [-1, 1]) caster(g, x, sz * 0.2, 0.025);
    rod(g, v3(x, 0.05, 0), v3(x, BX.railY + 0.03, 0), 0.012, CHROME);
  }
  rod(g, v3(railL, BX.railY, 0), v3(railR, BX.railY, 0), 0.011, CHROME);
  [COLS[3], COLS[7]].forEach((k, i) => hung(g, k, 'shirt').position.set(railR - 0.08 - i * 0.12, BX.railY + 0.04, 0));
  const hungNew = [0, 1].map((i) => {
    const h = hung(g, [COLS[1], COLS[6]][i], 'top');
    h.position.set(railL + 0.16 + i * 0.24, BX.railY + 0.04, 0);
    return h;
  });
  // Props.
  const gar = hung(g, COLS[1], 'top', false);
  const tagged = part(gar, box(0.03, 0.05, 0.003), CORAL, 0.02, -0.28, 0.036, { outline: false });
  const gun = priceGun(g, '#f4511e');
  const cutter = group(g);
  part(cutter, rbox(0.03, 0.02, 0.12, 0.006), '#f9a825', 0, 0, 0);
  part(cutter, box(0.003, 0.012, 0.04), CHROME, 0, -0.01, -0.07, { outline: false });
  const slip = group(g);
  part(slip, rbox(0.2, 0.012, 0.25, 0.003), '#8d6e63', 0, 0, 0);
  part(slip, box(0.18, 0.003, 0.22), PAPER, 0, 0.008, 0.005, { outline: false });
  const ticks = [0, 1, 2].map((i) => part(slip, box(0.05, 0.002, 0.008), '#c62828', -0.04, 0.0105, -0.06 + i * 0.05, { outline: false }));
  const spots: Record<string, Spot> = { rtTagStock: standAt(g, 'rtStock', BX.stand) };
  spots['*'] = spots.rtTagStock;
  const show = (now: string | null, N: RtNow | null) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const open = now ? n.flaps ?? 0 : 0.9;
    flaps.forEach((f, i) => {
      f.rotation.x = (i ? 1 : -1) * open * 1.9;
      f.position.z = (i ? 1 : -1) * (0.105 + open * 0.1);
      f.position.y = 0.304 - open * 0.04;
    });
    tape.visible = open < 0.5;
    at(gar, P.gar);
    tagged.visible = (n.tagged ?? 0) > 0.5;
    at(gun, P.gun);
    gunHome.visible = !P.gun;
    at(cutter, P.cutter);
    at(slip, P.slip);
    hungNew[0].visible = now ? (n.h0 ?? 0) > 0.5 : true;
    hungNew[1].visible = now ? (n.h1 ?? 0) > 0.5 : true;
    ticks.forEach((m, i) => (m.visible = (n.h0 ?? 0) > 0.5 && i === 0 || (n.h1 ?? 0) > 0.5 && i === 1 || (n.ticked ?? 0) > 0.5));
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, BX.open[0], 0.6, BX.open[2]);
}

// =============================================================================================
// 액세서리 스탠드 (rtAccessoryStand, 1 × 1): a turning tower of earring cards, scarves and hats.

function accessoryStand(g: THREE.Group, out: Built) {
  part(g, cyl(0.28, 0.3, 0.05, 20), OAK_D, 0, 0.025, 0);
  const tower = group(g);
  rod(tower, v3(0, 0.05, 0), v3(0, 1.68, 0), 0.016, CHROME);
  // Tiers of pegs: earring cards on the upper, sunglasses on the lower.
  const CARD = ['#f8bbd0', '#fff59d', '#b2dfdb', '#d1c4e9', '#ffccbc', '#c5e1a5'];
  for (const [y, n, off] of [[1.3, 8, 0], [1.1, 8, 0.4]] as const) {
    part(tower, cyl(AC.r - 0.02, AC.r - 0.02, 0.014, 18), CHROME, 0, y + 0.08, 0, { outline: false });
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      const c = group(tower, Math.sin(a) * AC.r, y, Math.cos(a) * AC.r, a);
      part(c, box(0.07, 0.1, 0.004), CARD[(i + n) % 6], 0, 0, 0, { outline: false });
      for (const sx of [-1, 1]) part(c, ball(0.009), i % 2 ? '#e3b23c' : CHROME, sx * 0.016, 0.01, 0.006, { outline: false });
    }
  }
  // Glasses on a tier of hooks.
  part(tower, cyl(AC.r, AC.r, 0.012, 18), CHROME, 0, 1.0, 0, { outline: false });
  // Scarves over a ring, hanging down.
  part(tower, cyl(AC.r - 0.01, AC.r - 0.01, 0.014, 18), OAK, 0, 0.9, 0);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = group(tower, Math.sin(a) * AC.r, 0.54, Math.cos(a) * AC.r, a);
    part(s, rbox(0.09, 0.72, 0.015, 0.006), COLS[(i * 3) % 10], 0, 0, 0);
  }
  // Hats at the top, one a little crooked, belts coiled on a tier lower down.
  const hat = group(tower, 0, AC.hat[1] - 0.02, 0);
  part(hat, cyl(0.21, 0.23, 0.014, 20), '#e8d5b7', 0, 0, 0);
  part(hat, cyl(0.1, 0.12, 0.12, 16), '#e8d5b7', 0, 0.066, 0);
  part(hat, cyl(0.122, 0.122, 0.022, 16), CORAL, 0, 0.022, 0, { outline: false });
  part(tower, cyl(0.2, 0.2, 0.012, 16), OAK, 0, 0.2, 0, { outline: false });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    part(tower, cyl(0.055, 0.055, 0.04, 14), ['#6d4c41', '#2b2b30', '#a1887f', '#7b1fa2'][i], Math.sin(a) * 0.13, 0.226, Math.cos(a) * 0.13);
  }
  // The tray and the card carried.
  const tray = group(g);
  part(tray, rbox(0.22, 0.012, 0.15, 0.006), OAK_D, 0, 0, 0);
  for (let i = 0; i < 3; i++) part(tray, box(0.05, 0.075, 0.003), CARD[i], -0.06 + i * 0.06, 0.018, 0, { rx: -1.1, outline: false });
  const card = part(g, box(0.07, 0.1, 0.004), CARD[4], 0, 0, 0, { outline: false });
  const pegged = part(g, box(0.07, 0.1, 0.004), CARD[4], AC.peg[0], AC.peg[1], AC.peg[2], { outline: false });
  const spots: Record<string, Spot> = { rtArrangeAcc: standAt(g, 'rtAcc', AC.stand) };
  spots['*'] = spots.rtArrangeAcc;
  const show = (now: string | null, N: RtNow | null) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    tower.rotation.y = now ? (n.spin ?? 0) * 1.05 + (N!.b.n % 8) : 0.2;
    at(tray, P.tray);
    at(card, P.card);
    pegged.visible = now ? (n.cardOn ?? 0) > 0.5 && (n.spin ?? 0) < 1.6 : false;
    hat.rotation.z = now ? 0.14 * (1 - (n.hatFix ?? 0)) : 0.14;
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, 0, 1.1, 0.3);
}

// =============================================================================================
// 세일 입간판 (rtSaleSign, 1 × 1, decor): a chalk-framed A-board with a bin of bargains.

function saleSign(g: THREE.Group) {
  const tex = painted('rtSale', 240, 360, (c) => {
    c.fillStyle = SALE;
    c.fillRect(0, 0, 240, 360);
    c.strokeStyle = '#fff';
    c.lineWidth = 6;
    c.strokeRect(12, 12, 216, 336);
    text(c, 'SALE', 120, 92, 66, '#ffffff', 'center');
    text(c, '최대', 120, 170, 34, '#ffe082', 'center');
    text(c, '50%', 120, 228, 72, '#ffffff', 'center');
    text(c, `${BRAND} 시즌오프`, 120, 310, 22, '#ffffff', 'center');
  });
  const lean = 0.17;
  for (const sz of [-1, 1]) {
    const b = group(g, 0, 0.56, sz * 0.13);
    b.rotation.x = sz * lean;
    part(b, box(0.56, 1.1, 0.025), OAK_D, 0, 0, 0);
    picture(b, tex, 0.5, 1.03, 0, 0, sz * 0.014, '#ffffff', sz > 0 ? 0 : Math.PI);
  }
  // Pennants on the crossbar.
  part(g, cyl(0.006, 0.006, 0.6, 6), CHROME, 0, 1.13, 0, { rz: Math.PI / 2, outline: false });
}

export const BUILDERS: Record<string, Builder> = {
  // The street front and the next unit (2026-11-05, the layout audit; shopFront.ts).
  rtShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 19, door: 12, name: BRAND, sub: 'WOMEN · MEN', bg: '#311b92', fg: '#ffffff', frame: '#212121', posters: [['SEASON OFF', '#d32f2f', '#ffffff', 14.5], ['NEW ARRIVAL', '#ffffff', '#311b92', 17.5]] });
  },
  rtNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '발걸음 슈즈', color: '#00695c', wall: '#d7dde2' });
  },
  clothesShelf(g, W, _D, _c, _def, _ctx, out) {
    clothesShelf(g, out, W);
  },
  checkoutCounter(g, W, _D, _c, _def, _ctx, out) {
    checkoutCounter(g, out, W);
  },
  fittingRoom(g, _W, _D, _c, _def, _ctx, out) {
    fittingRoom(g, out);
  },
  rtBagShelf(g, W) {
    bagShelf(g, W);
  },
  rtWindowDisplay(g, W, _D, _c, _def, _ctx, out) {
    windowDisplay(g, out, W);
  },
  rtGarmentRail(g, W, _D, _c, _def, _ctx, out) {
    garmentRail(g, out, W);
  },
  rtFoldTable(g, W, _D, _c, _def, _ctx, out) {
    foldTable(g, out, W);
  },
  rtSteamer(g, _W, _D, _c, _def, _ctx, out) {
    steamer(g, out);
  },
  rtStockBoxes(g, _W, _D, _c, _def, _ctx, out) {
    stockBoxes(g, out);
  },
  rtAccessoryStand(g, _W, _D, _c, _def, _ctx, out) {
    accessoryStand(g, out);
  },
  rtSaleSign(g) {
    saleSign(g);
  },
  // The dress form in the shop window, facing the street (2026-11-06; drawn by styleInfluencer.ts's mannequin, turned).
  windowMannequin(...a) {
    SI.mannequin(...a);
  },
};
