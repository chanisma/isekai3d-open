import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { AT, CR, CT, DC, HC, HW, LC, LC_BAD, MB, OT, PC, PT, RM, SH, WB, cvNow, cvPhase } from './convenienceManagerMotion';
import type { CvMotion, CvNow } from './convenienceManagerMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { neighbourShop, shopFront } from './shopFront';

/**
 * The 편의점 drawn as itself (2026-11-01 workplace pipeline, at the user's request): a branch of the made-up
 * 늘봄마트24. The till with a hot case beside it and the tobacco shelf behind; gondolas with their 1+1 tags;
 * a wall of glass-door coolers; cup ramen with a hot water and microwave corner; a lunch-box chiller whose
 * labels go red as the scanner finds what's out of date; a window bar; a bill-and-cash kiosk and the parcel
 * corner in the entrance; delivery crates and an order terminal in the stock room; a mop and bins; and
 * tables under parasols outside, as there always are.
 *
 * Everything that moves follows the scripts in convenienceManagerMotion.ts. The brand, its goods and its
 * tobacco are all made up.
 */

const BRAND = '늘봄마트24';
const GREEN = '#17935f';
const GREEN_D = '#0e6c45';
const ORANGE = '#ff8a1f';
const CREAM = '#f8f5ec';
const INK = '#26332d';
const PAPER = '#fbfaf6';
const WHITE = '#f4f6f6';
const CRATE = '#2f7fc1';
const GLASS_C = '#bfe6f2';
const GONDOLA = '#e9ecec';
const WOOD = '#c89b6c';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

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
function pane(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, opacity = 0.28, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: GLASS_C, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  g.add(m);
  return m;
}
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
function standAt(g: THREE.Object3D, motion: CvMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: CvNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? cvNow(sp.motion as CvMotion, t, cvPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
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
      const u = (t * 0.55 + i / n) % 1;
      m.visible = strength > 0.03;
      if (!m.visible) return;
      const s = Math.sin(i * 12.9) * 0.5;
      m.position.set(x + spread * s * 2 + 0.03 * Math.sin(t * 2 + i), y + u * rise, z + spread * Math.cos(i * 7.7) * 0.6);
      m.scale.setScalar(0.6 + u * 1.6);
      mat.opacity = Math.min(1, strength) * 0.42 * (1 - u) * Math.min(1, u * 6);
    });
  };
}
const logoTex = () =>
  painted('cvLogo', 320, 80, (c) => {
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 320, 80);
    c.fillStyle = ORANGE;
    c.fillRect(0, 62, 320, 18);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(38, 32, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = GREEN;
    c.beginPath();
    c.ellipse(38, 32, 7, 15, 0.6, 0, Math.PI * 2);
    c.fill();
    text(c, BRAND, 68, 33, 36, '#ffffff');
  });

// The goods. Each has its origin at its bottom.

const PACKS = ['#ef5350', '#ffb300', '#42a5f5', '#66bb6a', '#ab47bc', '#ff7043', '#26c6da', '#8d6e63'];
function kimbap(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  const m = part(b, cyl(0.075, 0.075, 0.04, 3), '#fafafa', 0, 0.045, 0, { rx: Math.PI / 2 });
  m.scale.set(1, 1, 1);
  part(b, box(0.045, 0.1, 0.044), '#1f2a24', 0, 0.035, 0, { outline: false });
  return b;
}
function canMesh(g: THREE.Object3D, color = ORANGE): THREE.Group {
  const b = group(g);
  part(b, cyl(0.03, 0.03, 0.12, 10), color, 0, 0.06, 0);
  part(b, cyl(0.026, 0.03, 0.008, 10), STEEL, 0, 0.124, 0, { outline: false });
  return b;
}
function bottleMesh(g: THREE.Object3D, color: string, cap = '#fafafa'): THREE.Group {
  const b = group(g);
  part(b, cyl(0.033, 0.035, 0.15, 10), color, 0, 0.075, 0);
  part(b, cyl(0.016, 0.033, 0.05, 10), color, 0, 0.175, 0, { outline: false });
  part(b, cyl(0.017, 0.017, 0.02, 8), cap, 0, 0.21, 0, { outline: false });
  part(b, cyl(0.0345, 0.0355, 0.06, 10), PAPER, 0, 0.08, 0, { outline: false });
  return b;
}
function snackMesh(g: THREE.Object3D, color: string): THREE.Group {
  const b = group(g);
  part(b, rbox(0.15, 0.2, 0.05, 0.02), color, 0, 0.1, 0);
  part(b, box(0.09, 0.07, 0.002), PAPER, 0, 0.11, 0.026, { outline: false });
  return b;
}
function cupRamen(g: THREE.Object3D, color: string): THREE.Group {
  const b = group(g);
  part(b, cyl(0.062, 0.045, 0.1, 12), color, 0, 0.05, 0);
  part(b, cyl(0.064, 0.064, 0.006, 12), '#f5f5f5', 0, 0.103, 0, { outline: false });
  part(b, cyl(0.0625, 0.056, 0.03, 12), PAPER, 0, 0.07, 0, { outline: false });
  return b;
}
function lunchBox(g: THREE.Object3D, tone = 0): { root: THREE.Group; tag: THREE.Mesh } {
  const b = group(g);
  part(b, rbox(0.24, 0.05, 0.17, 0.01), BLACK, 0, 0.025, 0);
  for (let i = 0; i < 3; i++) part(b, box(0.065, 0.012, 0.13), ['#f7f4e8', '#d9713b', '#79a94c'][(i + tone) % 3], -0.075 + i * 0.075, 0.054, 0, { outline: false });
  part(b, rbox(0.24, 0.022, 0.17, 0.01), '#e3f2f5', 0, 0.068, 0, { outline: false });
  const tag = ownLit(b, box(0.09, 0.05, 0.002), '#ffffff', 0, 0.044, 0.087);
  return { root: b, tag };
}
function crateMesh(g: THREE.Object3D, color = CRATE, full = true): THREE.Group {
  const b = group(g);
  part(b, box(0.5, 0.025, 0.36), shade(color, 0.85), 0, 0.012, 0);
  for (const sx of [-1, 1]) {
    part(b, box(0.02, 0.26, 0.36), color, sx * 0.25, 0.13, 0);
    for (let i = 0; i < 3; i++) part(b, box(0.005, 0.03, 0.24), shade(color, 0.7), sx * 0.261, 0.06 + i * 0.07, 0, { outline: false });
  }
  for (const sz of [-1, 1]) part(b, box(0.5, 0.26, 0.02), color, 0, 0.13, sz * 0.18);
  part(b, box(0.12, 0.03, 0.005), shade(color, 0.6), 0, 0.22, 0.191, { outline: false });
  if (full) {
    part(b, box(0.46, 0.14, 0.32), '#c79a6b', 0, 0.1, 0, { outline: false });
    for (let i = 0; i < 4; i++) part(b, box(0.1, 0.05, 0.14), PACKS[i], -0.16 + i * 0.105, 0.19, 0, { outline: false });
  }
  return b;
}
function pdaMesh(g: THREE.Object3D): { root: THREE.Group; led: THREE.Mesh } {
  const root = group(g);
  part(root, rbox(0.065, 0.14, 0.024, 0.008), '#37474f', 0, 0, 0);
  part(root, box(0.052, 0.07, 0.002), '#a7e0c5', 0, 0.02, 0.013, { outline: false });
  part(root, rbox(0.03, 0.08, 0.03, 0.008), BLACK, 0, -0.08, -0.016, { rx: 0.5 });
  const led = ownLit(root, ball(0.007), '#32423a', 0, 0.06, 0.014);
  return { root, led };
}
function clothMesh(g: THREE.Object3D, color = '#4fc3f7'): THREE.Group {
  const c = group(g);
  part(c, rbox(0.12, 0.018, 0.09, 0.008), color, 0, 0, 0, { outline: false });
  return c;
}
function sprayMesh(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, cyl(0.03, 0.034, 0.13, 10), '#90caf9', 0, -0.06, 0);
  part(b, box(0.03, 0.04, 0.08), GREEN_D, 0, 0.03, 0.015, { outline: false });
  return b;
}
function slipMesh(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, box(0.055, 0.1, 0.002), '#ffffff', 0, 0, 0, { outline: false });
  return s;
}
function clipboard(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, box(0.2, 0.27, 0.012), '#8d6e63', 0, 0, 0);
  part(b, box(0.18, 0.24, 0.002), PAPER, 0, -0.01, 0.008, { outline: false });
  part(b, box(0.08, 0.02, 0.012), STEEL, 0, 0.125, 0.008, { outline: false });
  for (let i = 0; i < 4; i++) part(b, box(0.14, 0.008, 0.001), '#90a4ae', 0, 0.06 - i * 0.04, 0.0095, { outline: false });
  return b;
}
function penMesh(g: THREE.Object3D): THREE.Mesh {
  return part(g, cyl(0.006, 0.006, 0.13, 6), '#1565c0', 0, 0, 0, { rz: 1.2, ry: 0.5, outline: false });
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
  crew: { top: GREEN, bottom: '#363a40', hair: '#2b1b10', skin: '#f8d9c0' },
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
function capOn(f: Fig, color: string) {
  part(f.head, cyl(0.118, 0.122, 0.055, 14), color, 0, 0.1, -0.01);
  part(f.head, box(0.15, 0.012, 0.09), color, 0, 0.078, 0.12, { outline: false });
}

// =============================================================================================
// 계산대 (storeCounter, 2 × 1): front to the staff side.

function storeCounter(g: THREE.Group, out: Built, W: number) {
  // The customers' face in the brand's green, a wood top; the staff's side with its shelves and bags.
  part(g, rbox(W - 0.04, CT.top - 0.05, 0.8, 0.02), GREEN, 0, (CT.top - 0.05) / 2, -0.05);
  part(g, rbox(W, 0.05, 0.9, 0.015), WOOD, 0, CT.top - 0.025, -0.05);
  part(g, box(W - 0.04, 0.06, 0.8), INK, 0, 0.03, -0.05, { outline: false });
  picture(g, logoTex(), 1.1, 0.28, 0.2, 0.55, -0.457, '#ffffff', Math.PI);
  part(g, box(W - 0.06, 0.8, 0.02), GONDOLA, 0, 0.44, 0.355, { outline: false });
  part(g, box(W - 0.1, 0.018, 0.3), STEEL, 0, 0.42, 0.2);
  for (let i = 0; i < 4; i++) part(g, box(0.26, 0.06, 0.18), i % 2 ? '#e8f5ee' : '#fafafa', -0.68 + i * 0.3, 0.46, 0.22, { outline: false });
  // The till, its screen to the staff, a small one to the customers.
  part(g, cyl(0.012, 0.018, 0.2, 8), BLACK, CT.pos[0], CT.top + 0.1, CT.pos[2] - 0.03, { outline: false });
  const pos = group(g, CT.pos[0], CT.pos[1], CT.pos[2]);
  pos.rotation.x = -0.22;
  part(pos, rbox(0.34, 0.24, 0.03, 0.012), BLACK, 0, 0, 0);
  const screen = swapPic(pos, 0.31, 0.21, 0, 0, 0.017);
  const idle = painted('cvPosIdle', 192, 128, (c) => {
    c.fillStyle = '#eefaf3';
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 192, 22);
    text(c, `${BRAND} POS`, 96, 12, 13, '#ffffff', 'center');
    text(c, '상품을 스캔하세요', 96, 66, 15, INK, 'center');
  });
  screen.set(idle);
  const posLive = live(192, 128);
  part(pos, rbox(0.17, 0.11, 0.015, 0.006), BLACK, 0, 0.05, -0.022);
  picture(pos, painted('cvPosBack', 96, 64, (c) => {
    c.fillStyle = '#0e6c45';
    c.fillRect(0, 0, 96, 64);
    text(c, '어서 오세요', 48, 32, 14, '#ffffff', 'center');
  }), 0.15, 0.09, 0, 0.05, -0.031, '#ffffff', Math.PI);
  // The scanner in its cradle, its red window lit; the card terminal to the customer; the receipts.
  const scanner = group(g, CT.scan[0], CT.top, CT.scan[2]);
  part(scanner, rbox(0.14, 0.09, 0.12, 0.02), BLACK, 0, 0.045, 0);
  const beam = ownLit(scanner, box(0.1, 0.004, 0.07), '#6d1a1a', 0, 0.092, 0);
  const term = group(g, CT.term[0], CT.term[1], CT.term[2]);
  part(term, rbox(0.1, 0.05, 0.16, 0.012), BLACK, 0, 0, 0, { rx: -0.5 });
  const termLed = ownLit(term, box(0.07, 0.003, 0.06), '#1a2f22', 0, 0.03, -0.012);
  termLed.rotation.x = -0.5;
  part(g, rbox(0.16, 0.11, 0.2, 0.02), '#37474f', CT.printer[0], CT.top + 0.055, CT.printer[2]);
  const slip = slipMesh(g);
  // A rack of gum at the customer's hand, a charity box, the bags on their hook, a little age sign.
  part(g, box(0.34, 0.2, 0.1), GONDOLA, 0.72, CT.top + 0.1, -0.42);
  const r = seeded(19);
  for (let i = 0; i < 10; i++) part(g, box(0.05, 0.075, 0.024), PACKS[i % 8], 0.59 + (i % 5) * 0.066, CT.top + 0.06 + Math.floor(i / 5) * 0.09, -0.48 + r() * 0.002, { outline: false });
  label(g, '민증 확인 · 미성년자 판매 금지', 0.6, 0.07, -0.15, CT.top + 0.26, -0.44, '#fff3e0', '#c62828', Math.PI);
  part(g, cyl(0.008, 0.008, 0.3, 6), STEEL, 0.28, CT.top + 0.15, -0.44, { outline: false });
  // Goods coming through.
  const goods: THREE.Group[] = [kimbap(g), canMesh(g), snackMesh(g, '#ef5350')];
  goods.forEach((m) => (m.visible = false));
  const bag = group(g);
  const bagBody = part(bag, rbox(0.28, 0.24, 0.16, 0.05), '#f1faf5', 0, 0.12, 0);
  part(bag, box(0.14, 0.05, 0.002), GREEN, 0, 0.13, 0.081, { outline: false });
  for (const sx of [-1, 1]) part(bag, box(0.04, 0.09, 0.05), '#f1faf5', sx * 0.09, 0.29, 0, { outline: false });
  void bagBody;
  // Who's come in, and those behind them when it's lunchtime.
  const cust = person(g, LOOKS.a, CT.cust[0], CT.cust[1], 0);
  const card = part(g, box(0.085, 0.003, 0.055), '#1e88e5', 0, 0, 0, { outline: false });
  let queue: Fig[] | null = null;
  const queueFigs = () => (queue ??= [person(g, LOOKS.b, CT.cust[0] - 0.55, CT.cust[1] - 0.62, 0.25, 'female'), person(g, LOOKS.d, CT.cust[0] - 1.05, CT.cust[1] - 0.44, 0.5), person(g, LOOKS.c, CT.cust[0] - 1.65, CT.cust[1] - 0.32, 0.6)]);
  let senior: Fig | null = null;
  const seniorFig = () => {
    if (!senior) {
      senior = person(g, LOOKS.crew, CT.senior[0], CT.senior[1], Math.PI / 2 + 0.4, 'female');
      capOn(senior, GREEN);
    }
    return senior;
  };
  const spots: Record<string, Spot> = { ringUpStore: standAt(g, 'cvTill'), lunchRush: standAt(g, 'cvRush'), convenienceManager_learnPos: standAt(g, 'cvLearn') };
  spots['*'] = spots.ringUpStore;
  const totals = [0, 1200, 3000, 4800];
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const lesson = now === 'convenienceManager_learnPos';
    goods.forEach((m, i) => at(m, P[`i${i}`]));
    at(bag, P.bag);
    at(slip, P.slip);
    const beep = (n.beep ?? 0) > 0.5;
    setLit(beam, beep ? '#ff5252' : now ? '#b71c1c' : '#6d1a1a');
    setLit(termLed, (n.paid ?? 0) > 0.5 ? '#66ff99' : (n.cTap ?? 0) > 0.2 ? '#ffe082' : '#1a2f22');
    if (now) {
      const count = Math.round(n.scanned ?? 0);
      screen.set(posLive((c) => {
        c.fillStyle = '#eefaf3';
        c.fillRect(0, 0, 192, 128);
        c.fillStyle = (n.wrong ?? 0) > 0.5 ? '#c62828' : GREEN;
        c.fillRect(0, 0, 192, 22);
        text(c, (n.wrong ?? 0) > 0.5 ? '다시 스캔하세요' : lesson ? '연습 모드' : (n.rush ?? 0) ? '점심 피크' : `${BRAND} POS`, 96, 12, 13, '#ffffff', 'center');
        if (lesson) text(c, (n.good ?? 0) > 0.5 ? '삼각김밥 1,200' : '바코드를 위로', 96, 66, 15, INK, 'center');
        else {
          ['삼각김밥  1,200', '캔 음료    1,800', '과자       1,800'].slice(0, count).forEach((s, i) => text(c, s, 8, 40 + i * 20, 13, INK));
          text(c, (n.paid ?? 0) > 0.5 ? '결제 완료' : `합계 ${totals[count].toLocaleString()}`, 184, 112, 15, (n.paid ?? 0) > 0.5 ? GREEN_D : '#c62828', 'right');
        }
      }));
    } else screen.set(idle);
    const there = now && !lesson ? n.cust ?? 0 : 0;
    comes(cust, there, CT.cust[0], CT.cust[1], -1.8, t);
    if (cust.root.visible) {
      cust.opts.lean = 0.14 * (n.cBow ?? 0) + 0.05;
      cust.opts.nod = 0.2 * (n.cBow ?? 0) + 0.12;
      const tp = n.cTap ?? 0;
      cust.armR(tp > 0.05 ? v3(CT.term[0], CT.term[1] + 0.05 + 0.03 * (1 - tp), CT.term[2] - 0.03 * (1 - tp)) : null);
      const hasBag = (n.took ?? 0) > 0.5;
      cust.armL(hasBag ? v3(CT.bag[0], CT.bag[1] + 0.3, CT.cust[1] + 0.3) : null);
      card.visible = tp > 0.05;
      if (card.visible) card.position.set(CT.term[0], CT.term[1] + 0.06 + 0.03 * (1 - tp), CT.term[2] - 0.03 * (1 - tp));
    } else card.visible = false;
    if ((n.rush ?? 0) > 0.5) {
      const fs = queueFigs();
      const left = n.queue ?? 3;
      fs.forEach((f, i) => {
        f.root.visible = true;
        f.opts.nod = 0.1 + 0.05 * Math.sin(t * 2 + i);
        f.root.position.x = CT.cust[0] - 0.55 - i * 0.55 + (3 - left) * 0.3;
      });
    } else queue?.forEach((f) => (f.root.visible = false));
    if (lesson) {
      const f = seniorFig();
      f.root.visible = true;
      f.armR((n.sTap ?? 0) > 0.5 ? v3(CT.scan[0] - 0.04, CT.scan[1] + 0.08, CT.scan[2] + 0.1) : (n.sPoint ?? 0) > 0.5 ? v3(CT.pos[0] + 0.02, CT.pos[1] + 0.02, CT.pos[2] + 0.1) : null);
      f.armL(null);
      f.opts.nod = (n.sNod ?? 0) > 0.5 ? 0.14 + 0.12 * Math.abs(Math.sin(t * 3)) : 0.12;
      f.opts.lean = (n.sTap ?? 0) > 0.5 ? 0.12 : 0.03;
    } else if (senior) senior.root.visible = false;
  });
  out.work = marker(g, CT.scan[0], CT.top + 0.1, 0.12);
}

// =============================================================================================
// 담배 진열장 (cvCigShelf, 2 × 1): against the wall behind the till, made-up packs on lit shelves.

function cigShelf(g: THREE.Group, W: number) {
  const H = 1.98;
  part(g, rbox(W - 0.04, H, 0.34, 0.015), INK, 0, H / 2, -0.28);
  part(g, box(W - 0.14, H - 0.48, 0.02), '#fafafa', 0, 0.42 + (H - 0.48) / 2, -0.11);
  const r = seeded(83);
  for (let row = 0; row < 7; row++) {
    const y = 0.5 + row * 0.205;
    part(g, box(W - 0.12, 0.012, 0.18), CHROME, 0, y - 0.006, -0.06, { outline: false });
    ownLit(g, box(W - 0.16, 0.006, 0.01), '#fff8e1', 0, y + 0.17, -0.09);
    picture(g, painted(`cvPacks${row}`, 512, 36, (c) => {
      for (let i = 0; i < 18; i++) {
        const x = (i * 512) / 18;
        c.fillStyle = i % 5 === 0 ? '#f5f5f5' : PACKS[Math.floor(r() * 8)];
        c.fillRect(x + 1, 0, 26, 36);
        c.fillStyle = PAPER;
        c.fillRect(x + 4, 18, 20, 10);
      }
    }), W - 0.16, 0.13, 0, y + 0.067, -0.03);
    label(g, row % 2 ? '4,500' : '4,800', 0.24, 0.022, -0.3 + (row % 3) * 0.4, y - 0.012, 0.031, '#fff8e1', INK);
  }
  // Below, drawers and the rule on a sign.
  part(g, rbox(W - 0.04, 0.42, 0.44, 0.012), GONDOLA, 0, 0.21, -0.23);
  for (const x of [-0.48, 0.48]) {
    part(g, box(0.86, 0.34, 0.01), WHITE, x, 0.21, -0.005, { outline: false });
    part(g, box(0.2, 0.018, 0.02), STEEL, x, 0.3, 0.01, { outline: false });
  }
  label(g, '청소년 판매 금지 · 신분증 확인', 1.1, 0.1, 0, 2.08, -0.1, '#c62828', '#ffffff');
  part(g, box(W - 0.04, 0.2, 0.34), GREEN, 0, 2.09, -0.28);
}

// =============================================================================================
// 온장 쇼케이스 (cvHotCase, 1 × 1): round the staff side (+z); its face to the customers (-z).

function hotCase(g: THREE.Group, out: Built) {
  part(g, rbox(0.92, 0.9, 0.78, 0.02), GREEN, 0, 0.45, -0.02);
  part(g, rbox(0.96, 0.05, 0.84, 0.015), WOOD, 0, 0.92, -0.02);
  label(g, '따끈따끈 호빵·핫바', 0.7, 0.14, 0, 0.62, -0.416, ORANGE, '#ffffff', Math.PI);
  // The case: a frame, two glass decks, a warm bulb.
  for (const [x, z] of [[-0.42, -0.34], [0.42, -0.34], [-0.42, 0.33], [0.42, 0.33]] as const) part(g, box(0.03, 0.62, 0.03), BLACK, x, 1.25, z, { outline: false });
  part(g, box(0.88, 0.03, 0.72), BLACK, 0, 1.56, 0);
  part(g, box(0.82, 0.012, 0.66), CHROME, 0, HC.deck - 0.04, 0);
  part(g, box(0.82, 0.01, 0.66), STEEL, 0, HC.deck2 + 0.03, 0, { outline: false });
  const bulb = ownLit(g, box(0.76, 0.012, 0.05), '#a8662f', 0, 1.54, 0);
  pane(g, 0.84, 0.6, 0, 1.25, -0.345, 0.25, Math.PI);
  pane(g, 0.68, 0.6, -0.425, 1.25, 0, 0.2, Math.PI / 2);
  pane(g, 0.68, 0.6, 0.425, 1.25, 0, 0.2, Math.PI / 2);
  // The sliding door at the back.
  const door = group(g);
  pane(door, 0.42, 0.56, 0.2, 1.25, 0.34, 0.3);
  part(door, box(0.02, 0.56, 0.02), BLACK, 0.41, 1.25, 0.345, { outline: false });
  pane(g, 0.42, 0.56, -0.2, 1.25, 0.335, 0.3);
  // On the top deck, hot bars on sticks; below, steamed buns going in.
  for (let i = 0; i < 5; i++) {
    part(g, cyl(0.022, 0.022, 0.12, 8), '#b8743d', -0.28 + i * 0.14, HC.deck2 + 0.11, -0.06, { rz: Math.PI / 2 - 0.25 });
    part(g, cyl(0.004, 0.004, 0.08, 5), '#efdcb7', -0.24 + i * 0.14, HC.deck2 + 0.08, -0.06, { outline: false, rz: -1.2 });
  }
  const bun = (y: number, x: number, z: number, c = '#fdf6e8') => {
    const m = part(g, ball(0.058), c, x, y + 0.04, z);
    m.scale.y = 0.72;
    return m;
  };
  bun(HC.deck, -0.3, -0.18);
  bun(HC.deck, -0.12, -0.2, '#f6d7b0');
  bun(HC.deck, 0.26, -0.2);
  const placed = HC.places.map(([x, y, z], i) => bun(y, x, z, i % 2 ? '#f6d7b0' : '#fdf6e8'));
  const tray = group(g);
  part(tray, rbox(0.34, 0.03, 0.24, 0.01), STEEL, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const b = part(tray, ball(0.05), i % 2 ? '#f6d7b0' : '#fdf6e8', -0.1 + (i % 2) * 0.2, 0.04, -0.06 + Math.floor(i / 2) * 0.12);
    b.scale.y = 0.72;
  }
  const carried = group(g);
  const cb = part(carried, ball(0.058), '#fdf6e8', 0, 0, 0);
  cb.scale.y = 0.72;
  const tongs = group(g);
  rod(tongs, v3(-0.02, 0, 0), v3(-0.012, 0.03, 0.18), 0.006, CHROME);
  rod(tongs, v3(0.02, 0, 0), v3(0.012, 0.03, 0.18), 0.006, CHROME);
  const cloth = clothMesh(g);
  const steam = puffs(g, 6, '#ffffff', 0.045);
  const spots: Record<string, Spot> = { cvFillHotCase: standAt(g, 'cvHot') };
  spots['*'] = spots.cvFillHotCase;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    door.position.x = -0.38 * (n.door ?? 0);
    const count = now ? n.filled ?? 0 : 3;
    placed.forEach((m, i) => (m.visible = i < count));
    at(tray, P.tray);
    at(carried, P.bun);
    at(tongs, P.tongs);
    at(cloth, P.cloth);
    setLit(bulb, '#ffb74d');
    steam(n.steam ?? 0, 0, HC.deck + 0.1, 0.3, 0.2, t, 0.65);
  });
  out.work = marker(g, 0, HC.deck, 0.2);
}

// =============================================================================================
// 상품 진열대 (snackShelf, 2 × 1): a gondola you can see over, the same goods on both faces.

const SNACK_COLS = 9;
function gondola(g: THREE.Group, W: number, mk: (row: number, i: number) => THREE.Object3D | void) {
  part(g, box(W - 0.08, 0.1, 0.8), GONDOLA, 0, 0.05, 0);
  part(g, box(W - 0.08, 1.34, 0.05), '#c7ccca', 0, 0.72, 0);
  for (const x of [-(W / 2) + 0.05, W / 2 - 0.05]) part(g, box(0.05, 1.42, 0.8), GONDOLA, x, 0.71, 0);
  SH.decks.forEach((y, row) => {
    for (const sz of [-1, 1]) {
      part(g, box(W - 0.14, 0.018, 0.33), WHITE, 0, y - 0.009, sz * 0.2);
      // The price rail.
      part(g, box(W - 0.14, 0.03, 0.006), ['#fff3e0', '#e8f5ee'][row % 2], 0, y - 0.022, sz * 0.368, { outline: false });
    }
    for (let i = 0; i < SNACK_COLS; i++) mk(row, i);
  });
}
function snackShelf(g: THREE.Group, out: Built, W: number) {
  const front: THREE.Group[] = [];
  gondola(g, W, (row, i) => {
    const x = -0.76 + i * 0.19;
    const y = SH.decks[row];
    const c = PACKS[(row * 3 + i) % 8];
    const gap = SH.gaps.findIndex(([gx, gy]) => Math.abs(gx - x) < 0.1 && gy === y);
    const m = snackMesh(g, c);
    m.position.set(x, y, SH.face);
    if (gap >= 0) front[gap] = m;
    if (i === 0) {
      picture(g, painted(`cvGondolaBack${row}`, 512, 56, (c) => {
        for (let k = 0; k < 9; k++) {
          c.fillStyle = PACKS[(row * 5 + k + 3) % 8];
          c.fillRect((k * 512) / 9 + 3, 0, 50, 56);
          c.fillStyle = PAPER;
          c.fillRect((k * 512) / 9 + 14, 16, 28, 22);
        }
      }), W - 0.16, 0.2, 0, y + 0.1, -SH.face - 0.05, '#ffffff', Math.PI);
    }
  });
  // A 1+1 tag on two shelf edges and one hanging over the shelf.
  for (const [x, y] of [[-0.45, SH.decks[2]], [0.5, SH.decks[1]]] as const) label(g, '1+1', 0.14, 0.055, x, y - 0.03, SH.face + 0.076, '#d32f2f', '#ffffff');
  const tag = label(g, '2+1 행사', 0.22, 0.075, 0.16, SH.decks[3] - 0.03, SH.face + 0.076, ORANGE, '#ffffff');
  const crate = crateMesh(g, CRATE);
  const box1 = snackMesh(g, '#ff7043');
  const basket = group(g, SH.basket[0], 0, SH.basket[2]);
  part(basket, rbox(0.34, 0.26, 0.26, 0.02), '#d32f2f', 0, 0.13, 0);
  label(basket, '폐기', 0.2, 0.08, 0, 0.14, 0.132, '#ffffff', '#c62828');
  const item = snackMesh(g, '#ef5350');
  const pda = pdaMesh(g);
  const dateTex = (bad: boolean) => painted(`cvDate${bad ? 1 : 0}`, 64, 32, (c) => {
    c.fillStyle = bad ? '#c62828' : '#ffffff';
    c.fillRect(0, 0, 64, 32);
    text(c, bad ? '기한 경과' : '11.28까지', 32, 16, 12, bad ? '#ffffff' : INK, 'center');
  });
  const stamp = swapPic(item, 0.11, 0.055, 0, 0.11, -0.026, Math.PI);
  const board = clipboard(g);
  const pen = penMesh(g);
  let trainee: Fig | null = null;
  const traineeFig = () => {
    if (!trainee) {
      trainee = person(g, LOOKS.crew, SH.trainee[0], SH.trainee[1], Math.PI + 0.25);
      capOn(trainee, GREEN);
    }
    return trainee;
  };
  const spots: Record<string, Spot> = { restockStore: standAt(g, 'cvRestock'), checkSellBy: standAt(g, 'cvCheck'), convenienceManager_trainStaff: standAt(g, 'cvTrain') };
  spots['*'] = spots.restockStore;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const filling = now === 'restockStore';
    front.forEach((m, i) => (m.visible = !filling || i < (n.filled ?? 0)));
    tag.scale.y = filling ? Math.max(0.2, n.tag ?? 0) : 1;
    at(crate, filling ? P.crate : null);
    crate.scale.y = 1 - 0.8 * (n.fold ?? 0);
    at(box1, P.box);
    basket.visible = now === 'checkSellBy';
    at(item, P.item);
    if (P.item) {
      item.rotation.y = (n.turned ?? 0) * Math.PI;
      stamp.set(dateTex((n.bad ?? 0) > 0.5));
    }
    at(pda.root, P.pda);
    setLit(pda.led, (n.beep ?? 0) > 0.5 ? ((n.bad ?? 0) > 0.5 ? '#ff5252' : '#69f0ae') : '#32423a');
    at(board, P.board);
    if (P.board) {
      board.rotation.x = 0.4;
      board.rotation.y = Math.PI;
    }
    at(pen, P.pen);
    if (now === 'convenienceManager_trainStaff') {
      const f = traineeFig();
      f.root.visible = true;
      const trying = (n.tTry ?? 0) > 0.5;
      const reach = trying ? v3(SH.trainee[0] - 0.42 + 0.1 * Math.sin(t * 3), 1.0, SH.face + 0.06) : null;
      f.armR(reach);
      f.armL(trying ? v3(SH.trainee[0] - 0.22 + 0.1 * Math.sin(t * 3), 1.0, SH.face + 0.08) : null);
      f.opts.nod = (n.tNod ?? 0) > 0.5 ? 0.14 + 0.1 * Math.abs(Math.sin(t * 3)) : 0.2;
      f.opts.lean = trying ? 0.12 : 0.03;
    } else if (trainee) trainee.root.visible = false;
  });
  out.work = marker(g, 0, SH.decks[2] + 0.06, SH.face + 0.05);
}

// =============================================================================================
// 음료 냉장고 (drinkCooler, 1 × 1): one bay of a wall of glass doors; set side by side they meet.

const DRINK_COLS = ['#ef5350', '#ffb300', '#42a5f5', '#66bb6a', '#ff7043', '#90caf9', '#ab47bc', '#26c6da'];
function drinkCooler(g: THREE.Group, out: Built) {
  part(g, box(0.98, 2.1, 0.84), '#dfe5e6', 0, 1.05, -0.06);
  part(g, box(0.98, 0.2, 0.86), GREEN, 0, 2.08, -0.05);
  picture(g, painted('cvCold', 192, 40, (c) => {
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 192, 40);
    text(c, '시원한 음료', 96, 21, 22, '#ffffff', 'center');
  }), 0.86, 0.17, 0, 2.08, 0.382);
  part(g, box(0.86, 1.76, 0.02), '#f7fbfc', 0, 1.06, -0.3, { outline: false });
  ownLit(g, box(0.82, 0.015, 0.03), '#f0fbff', 0, 1.9, 0.18);
  part(g, box(0.94, 0.14, 0.04), BLACK, 0, 0.09, 0.355, { outline: false });
  const bottles: THREE.Group[][] = DC.shelves.map((y, row) => {
    part(g, box(0.84, 0.014, 0.58), CHROME, 0, y - 0.007, 0.03, { outline: false });
    return Array.from({ length: 6 }, (_, i) => {
      const x = -0.34 + i * 0.136;
      const m = row === 1 && i % 2 ? canMesh(g, DRINK_COLS[(i + row * 3) % 8]) : bottleMesh(g, DRINK_COLS[(i + row * 3) % 8]);
      m.position.set(x, y, DC.face);
      return m;
    });
  });
  // The door.
  const door = group(g, DC.hinge[0], 0, DC.hinge[1]);
  pane(door, 0.86, 1.8, 0.43, 1.06, 0, 0.2);
  for (const y of [0.15, 1.97]) part(door, box(0.9, 0.05, 0.03), BLACK, 0.43, y, 0, { outline: false });
  for (const x of [0, 0.87]) part(door, box(0.04, 1.86, 0.03), BLACK, x, 1.06, 0, { outline: false });
  part(door, box(0.025, 0.42, 0.04), CHROME, 0.78, 1.05, 0.03);
  picture(door, painted('cvColdTemp', 48, 24, (c) => {
    c.fillStyle = '#03121a';
    c.fillRect(0, 0, 48, 24);
    text(c, '3°C', 24, 13, 16, '#6ee7ff', 'center');
  }), 0.1, 0.05, 0.75, 1.82, 0.018);
  const carton = crateMesh(g, GREEN_D);
  const held = bottleMesh(g, '#42a5f5');
  const cold = puffs(g, 4, '#e9f8ff', 0.05);
  const spots: Record<string, Spot> = { stockDrinks: standAt(g, 'cvDrinks') };
  spots['*'] = spots.stockDrinks;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    door.rotation.y = -(n.door ?? 0) * 1.2;
    at(carton, now ? P.crate : null);
    at(held, P.bottle);
    bottles.forEach((row, r) => row.forEach((m, i) => (m.visible = !now || i !== 2 || r < (n.filled ?? 0))));
    cold(n.door ?? 0, 0, 0.8, 0.4, 0.25, t, -0.4);
  });
  out.work = marker(g, 0, DC.shelves[1], DC.face);
}

// =============================================================================================
// 택배 접수기 (deliveryPOS, 1 × 1).

function parcelBox(g: THREE.Object3D): { root: THREE.Group; tag: THREE.Mesh } {
  const root = group(g);
  part(root, rbox(0.3, 0.26, 0.26, 0.01), '#c79a6b', 0, 0.13, 0);
  part(root, box(0.31, 0.03, 0.08), '#e6c79a', 0, 0.255, 0, { outline: false });
  const tag = part(root, box(0.14, 0.002, 0.1), '#ffffff', 0.04, 0.268, 0.05, { outline: false });
  return { root, tag };
}
function deliveryPOS(g: THREE.Group, out: Built) {
  part(g, rbox(0.92, 0.66, 0.74, 0.02), '#eceff1', 0, 0.33, -0.08);
  part(g, box(0.92, 0.1, 0.02), ORANGE, 0, 0.56, 0.296, { outline: false });
  label(g, '셀프 택배 접수', 0.72, 0.1, 0, 0.36, 0.297, '#ffffff', GREEN_D);
  // The platform scale, its readout on a post.
  part(g, rbox(0.42, 0.05, 0.42, 0.01), STEEL, PC.scale[0], 0.69, PC.scale[2]);
  part(g, box(0.4, 0.008, 0.4), '#37474f', PC.scale[0], PC.scale[1] - 0.01, PC.scale[2], { outline: false });
  const readout = swapPic(g, 0.15, 0.06, PC.scale[0] - 0.05, 1.2, -0.2);
  part(g, cyl(0.012, 0.012, 0.5, 8), BLACK, PC.scale[0] - 0.05, 0.94, -0.21, { outline: false });
  const weigh = live(96, 40);
  const idleW = painted('cvKgIdle', 96, 40, (c) => {
    c.fillStyle = '#071b12';
    c.fillRect(0, 0, 96, 40);
    text(c, '0.00kg', 48, 21, 22, '#3ddc84', 'center');
  });
  readout.set(idleW);
  // The terminal on a stand and the label printer.
  part(g, cyl(0.03, 0.06, 0.52, 10), BLACK, PC.screen[0], 0.92, PC.screen[2] - 0.06);
  const head = group(g, PC.screen[0], PC.screen[1], PC.screen[2]);
  head.rotation.x = -0.12;
  part(head, rbox(0.36, 0.3, 0.05, 0.015), BLACK, 0, 0, 0);
  const screen = swapPic(head, 0.32, 0.26, 0, 0, 0.027);
  const screenLive = live(160, 128);
  part(g, box(0.22, 0.12, 0.26), '#b0bec5', PC.printer[0], 0.76, PC.printer[2] - 0.02);
  part(g, rbox(0.2, 0.14, 0.24, 0.02), WHITE, PC.printer[0], 0.88, PC.printer[2] - 0.02);
  part(g, box(0.1, 0.006, 0.01), BLACK, PC.printer[0], 0.91, PC.printer[2] + 0.1, { outline: false });
  const slip = slipMesh(g);
  // Rates on the post.
  part(g, box(0.92, 0.06, 0.74), WHITE, 0, 0.67, -0.08);
  const parcel = parcelBox(g);
  const cust = person(g, LOOKS.b, PC.cust[0], PC.cust[1], Math.PI / 2, 'female');
  const spots: Record<string, Spot> = { acceptStoreParcel: standAt(g, 'cvParcel') };
  spots['*'] = spots.acceptStoreParcel;
  const page = (c: CanvasRenderingContext2D, keyed: number, kg: number, labelled: boolean) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 160, 128);
    c.fillStyle = ORANGE;
    c.fillRect(0, 0, 160, 22);
    text(c, '택배 접수', 80, 12, 13, '#ffffff', 'center');
    text(c, `무게 ${kg ? kg.toFixed(2) : '-'} kg`, 8, 38, 13, INK);
    if (keyed >= 1) text(c, '받는 곳 해오름시', 8, 58, 13, INK);
    if (keyed >= 2) text(c, '받는 분 ○○○', 8, 76, 13, INK);
    if (keyed >= 3) text(c, '요금 3,500원', 8, 96, 14, '#c62828');
    if (labelled) text(c, '라벨 출력 완료', 80, 116, 12, GREEN_D, 'center');
  };
  screen.set(painted('cvParcelIdle', 160, 128, (c) => page(c, 0, 0, false)));
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(parcel.root, P.box);
    parcel.tag.visible = (n.label ?? 0) > 0.5;
    at(slip, P.slip);
    if (now) {
      const kg = (n.weight ?? 0) > 0.3 ? 2.14 : 0;
      screen.set(screenLive((c) => page(c, Math.floor(n.keyed ?? 0), kg, (n.label ?? 0) > 0.5)));
      readout.set(weigh((c) => {
        c.fillStyle = '#071b12';
        c.fillRect(0, 0, 96, 40);
        text(c, `${(kg * (n.weight ?? 0)).toFixed(2)}kg`, 48, 21, 22, '#3ddc84', 'center');
      }));
    } else readout.set(idleW);
    comes(cust, now ? n.cust ?? 0 : 0, PC.cust[0], PC.cust[1], -1.2, t);
    if (cust.root.visible) {
      const holds = (n.holds ?? 0) > 0.05 && P.box;
      cust.armR(holds ? v3(P.box![0] - 0.02, P.box![1] + 0.1, P.box![2] + 0.16) : null);
      cust.armL(holds ? v3(P.box![0] - 0.02, P.box![1] + 0.1, P.box![2] - 0.16) : null);
      cust.opts.nod = 0.15 * (n.cBow ?? 0) + 0.12;
      cust.opts.lean = 0.12 * (n.cBow ?? 0);
    }
  });
  out.work = marker(g, PC.screen[0], PC.screen[1], PC.screen[2] + 0.1);
}

// =============================================================================================
// 택배 보관 선반 (cvParcelRack, 2 × 1): metal shelves of parcels, each with its number.

function parcelRack(g: THREE.Group, W: number) {
  const r = seeded(37);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, 1.42, 0.04), '#78909c', sx * (W / 2 - 0.06), 0.71, -0.1 + sz * 0.3);
  for (const [row, y] of [0.14, 0.62, 1.1].entries()) {
    part(g, box(W - 0.1, 0.03, 0.68), '#90a4ae', 0, y, -0.1);
    let x = -W / 2 + 0.2;
    while (x < W / 2 - 0.3) {
      const w = 0.22 + r() * 0.2;
      const h = 0.14 + r() * 0.2;
      part(g, rbox(w, h, 0.36, 0.008), r() > 0.6 ? '#ddb88e' : '#c79a6b', x + w / 2, y + 0.015 + h / 2, -0.04);
      part(g, box(w + 0.002, 0.02, 0.37), '#e6c79a', x + w / 2, y + 0.015 + h * 0.7, -0.04, { outline: false });
      part(g, box(0.1, 0.06, 0.002), '#ffffff', x + w / 2, y + 0.08, 0.142, { outline: false });
      x += w + 0.05;
    }
    label(g, `${['A', 'B', 'C'][row]}칸`, 0.14, 0.05, -W / 2 + 0.14, y + 0.015, 0.24, ORANGE, '#ffffff');
  }
  label(g, '택배 보관 · 찾아가는 곳', 1.2, 0.13, 0, 1.56, -0.1, GREEN, '#ffffff');
}

// =============================================================================================
// 발주 단말 (orderTablet, 1 × 1): a standing desk in the stock room.

function orderTablet(g: THREE.Group, out: Built) {
  part(g, rbox(0.8, 0.05, 0.62, 0.012), WOOD, 0, OT.top - 0.025, 0);
  for (const sx of [-1, 1]) part(g, box(0.05, OT.top - 0.05, 0.56), '#78909c', sx * 0.36, (OT.top - 0.05) / 2, 0);
  part(g, box(0.68, 0.34, 0.02), '#90a4ae', 0, 0.5, -0.27, { outline: false });
  part(g, box(0.68, 0.02, 0.46), '#b0bec5', 0, 0.34, 0, { outline: false });
  for (let i = 0; i < 3; i++) part(g, rbox(0.2, 0.08 + i * 0.03, 0.26, 0.01), i % 2 ? '#ffcc80' : '#a5d6a7', -0.22 + i * 0.22, 0.4 + i * 0.015, 0.02, { outline: false });
  // The terminal, on an arm.
  rod(g, v3(0, OT.top, -0.22), v3(0, OT.screen[1] - 0.05, OT.screen[2] - 0.03), 0.018, BLACK);
  const head = group(g, OT.screen[0], OT.screen[1], OT.screen[2]);
  head.rotation.x = -0.18;
  part(head, rbox(0.46, 0.32, 0.03, 0.015), BLACK, 0, 0, 0);
  const screen = swapPic(head, 0.42, 0.28, 0, 0, 0.017);
  const paint = live(224, 150);
  const idle = painted('cvOrderIdle', 224, 150, (c) => {
    c.fillStyle = '#f2f7f4';
    c.fillRect(0, 0, 224, 150);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 224, 24);
    text(c, `${BRAND} 점포 시스템`, 112, 13, 14, '#ffffff', 'center');
    ['발주', '근무표', '매출'].forEach((s, i) => {
      c.fillStyle = ['#ffe0b2', '#c8e6c9', '#bbdefb'][i];
      c.fillRect(14 + i * 68, 54, 60, 54);
      text(c, s, 44 + i * 68, 81, 15, INK, 'center');
    });
  });
  screen.set(idle);
  // The stock sheet on a clip, a printer, and on the wall beside, the rota.
  const pad = group(g, OT.pad[0], OT.pad[1], OT.pad[2]);
  part(pad, box(0.22, 0.012, 0.3), '#8d6e63', 0, 0, 0);
  part(pad, box(0.2, 0.002, 0.27), PAPER, 0, 0.008, -0.005, { outline: false });
  for (let i = 0; i < 7; i++) part(pad, box(0.16, 0.002, 0.006), '#90a4ae', 0, 0.01, -0.1 + i * 0.03, { outline: false });
  part(g, rbox(0.2, 0.12, 0.22, 0.02), WHITE, 0.26, OT.top + 0.06, -0.04);
  const board = group(g, OT.board[0], OT.board[1], OT.board[2]);
  part(board, box(0.5, 0.42, 0.02), '#a1887f', 0, 0, -0.02);
  const pinned = swapPic(board, 0.3, 0.22, -0.02, -0.01, -0.005);
  pinned.set(painted('cvRota', 192, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 192, 128);
    text(c, '이번 주 근무표', 96, 12, 13, GREEN_D, 'center');
    for (let r = 0; r < 4; r++) for (let d = 0; d < 7; d++) {
      c.fillStyle = (r * 3 + d * 5) % 4 === 0 ? '#ffe082' : (r + d) % 3 === 0 ? '#c8e6c9' : '#eceff1';
      c.fillRect(38 + d * 21, 28 + r * 23, 19, 20);
    }
    ['점장', '이알바', '박야간', '김주말'].forEach((s, r) => text(c, s, 3, 38 + r * 23, 9, INK));
  }));
  const paper = group(g);
  part(paper, box(0.2, 0.28, 0.002), '#ffffff', 0, 0, 0, { outline: false });
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { placeOrder: standAt(g, 'cvOrder'), convenienceManager_makeShifts: standAt(g, 'cvShifts'), convenienceManager_analyzeSales: standAt(g, 'cvSales') };
  spots['*'] = spots.placeOrder;
  const ITEMS: Array<[string, number]> = [['삼각김밥', 40], ['도시락', 18], ['생수', 48], ['컵라면', 24]];
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(paper, P.paper);
    at(pen, P.pen);
    pinned.mesh.visible = now !== 'convenienceManager_makeShifts' || (n.pinned ?? 0) > 0.5;
    if (!now) return screen.set(idle);
    screen.set(paint((c) => {
      c.fillStyle = '#f2f7f4';
      c.fillRect(0, 0, 224, 150);
      c.fillStyle = GREEN;
      c.fillRect(0, 0, 224, 24);
      if (now === 'placeOrder') {
        text(c, (n.sent ?? 0) > 0.5 ? '발주 완료' : '내일 발주', 112, 13, 14, '#ffffff', 'center');
        ITEMS.forEach(([s, q], i) => {
          text(c, s, 10, 44 + i * 24, 14, INK);
          text(c, i < (n.lines ?? 0) ? `${q}개` : '-', 214, 44 + i * 24, 14, i < (n.lines ?? 0) ? '#c62828' : '#90a4ae', 'right');
        });
      } else if (now === 'convenienceManager_makeShifts') {
        text(c, '이번 주 근무표', 112, 13, 14, '#ffffff', 'center');
        let k = 0;
        for (let r = 0; r < 4; r++) for (let d = 0; d < 7; d++) {
          c.fillStyle = k++ < (n.filled ?? 0) ? ['#ffe082', '#c8e6c9', '#bbdefb'][(r + d) % 3] : '#eceff1';
          c.fillRect(46 + d * 25, 34 + r * 28, 23, 25);
        }
        ['점장', '이알바', '박야간', '김주말'].forEach((s, r) => text(c, s, 4, 47 + r * 28, 10, INK));
      } else {
        text(c, (n.page ?? 0) > 0.5 ? '많이 팔린 상품' : '이번 달 매출', 112, 13, 14, '#ffffff', 'center');
        const bars = (n.page ?? 0) > 0.5 ? [90, 72, 66, 40, 22, 14] : [40, 52, 46, 68, 74, 96];
        bars.forEach((h, i) => {
          c.fillStyle = i === ((n.page ?? 0) > 0.5 ? 0 : 5) ? ORANGE : GREEN;
          const H = h * (n.chart ?? 0);
          c.fillRect(20 + i * 32, 140 - H, 24, H);
        });
      }
    }));
  });
  out.work = marker(g, 0, OT.screen[1] - 0.1, OT.screen[2] + 0.1);
}

// =============================================================================================
// 도시락 냉장 쇼케이스 (cvLunchChiller, 2 × 1): lit open decks, the top deck for sandwiches and kimbap.

function lunchChiller(g: THREE.Group, out: Built, W: number) {
  part(g, box(W - 0.02, 1.84, 0.34), '#dfe5e6', 0, 0.92, -0.28);
  part(g, box(W - 0.02, 0.5, 0.8), GONDOLA, 0, 0.25, -0.03);
  part(g, box(W - 0.02, 0.2, 0.6), GREEN, 0, 1.82, -0.15);
  picture(g, painted('cvLunchSign', 320, 40, (c) => {
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 320, 40);
    text(c, '오늘의 도시락 · 김밥 · 샌드위치', 160, 21, 20, '#ffffff', 'center');
  }), W - 0.2, 0.15, 0, 1.82, 0.152);
  for (const x of [-(W / 2) + 0.02, W / 2 - 0.02]) part(g, box(0.04, 1.3, 0.62), '#cfd8dc', x, 1.15, -0.06, { outline: false });
  part(g, box(W - 0.1, 0.05, 0.1), '#90a4ae', 0, 1.68, 0.1, { outline: false });
  ownLit(g, box(W - 0.2, 0.012, 0.03), '#effbff', 0, 1.65, 0.1);
  const boxes: Array<{ root: THREE.Group; tag: THREE.Mesh }> = [];
  LC.decks.forEach((y, row) => {
    part(g, box(W - 0.08, 0.02, 0.56), CHROME, 0, y - 0.01, -0.03);
    part(g, box(W - 0.08, 0.036, 0.008), '#fff3e0', 0, y - 0.02, 0.255, { outline: false });
    LC.row.forEach((x, i) => {
      if (row === 1) {
        const b = lunchBox(g, i);
        b.root.position.set(x, y + 0.04 - 0.04, LC.face - 0.03);
        boxes.push(b);
      } else if (row === 2) {
        const s = lunchBox(g, i + 1);
        s.root.position.set(x, y, LC.face - 0.03);
        setLit(s.tag, '#e8f5e9');
      } else {
        for (let k = 0; k < 2; k++) kimbap(g).position.set(x - 0.05 + k * 0.1, y, LC.face - 0.03);
      }
    });
  });
  // A red disposal basket and a fresh tray, out only while it's being done; a clipboard hung at the side.
  const basket = group(g, LC.basket[0], 0, LC.basket[2]);
  part(basket, rbox(0.42, 0.26, 0.3, 0.02), '#d32f2f', 0, 0.13, 0);
  label(basket, '폐기', 0.22, 0.09, 0, 0.14, 0.152, '#ffffff', '#c62828');
  const inBasket = [lunchBox(basket, 0), lunchBox(basket, 2)];
  inBasket.forEach((b, i) => {
    b.root.position.set(-0.05 + i * 0.1, 0.26, 0);
    setLit(b.tag, '#ff5252');
  });
  const tray = crateMesh(g, CRATE, false);
  const fresh = [lunchBox(tray, 1), lunchBox(tray, 2)];
  fresh.forEach((b, i) => b.root.position.set(0, 0.04 + i * 0.07, 0));
  const carried = lunchBox(g, 0);
  const pda = pdaMesh(g);
  const beam = ownLit(g, box(0.1, 0.004, 0.2), '#ff3b30', 0, 0, 0);
  const sheet = clipboard(g);
  sheet.position.set(-0.96, 1.2, 0.14);
  sheet.rotation.y = 0.2;
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { cvCheckLunch: standAt(g, 'cvLunch') };
  spots['*'] = spots.cvCheckLunch;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    basket.visible = !!now;
    at(tray, P.tray);
    fresh.forEach((b, i) => (b.root.visible = (i === 0 ? n.gone2 ?? 0 : n.gone4 ?? 0) >= 0.5 || (n.tossed ?? 0) < 2));
    at(carried.root, P.box);
    at(pda.root, P.pda);
    at(pen, P.pen);
    inBasket.forEach((b, i) => (b.root.visible = i < (n.tossed ?? 0)));
    const lit = (n.beep ?? 0) > 0.5;
    beam.visible = lit;
    if (lit && P.pda) beam.position.set(P.pda[0], P.pda[1] - 0.08, P.pda[2] - 0.13);
    setLit(pda.led, lit ? '#69f0ae' : '#32423a');
    boxes.forEach((b, i) => {
      const bad = LC_BAD.indexOf(i);
      const red = bad === 0 ? n.red2 ?? 0 : bad === 1 ? n.red4 ?? 0 : 0;
      const gone = bad === 0 ? n.gone2 ?? 0 : bad === 1 ? n.gone4 ?? 0 : 0;
      b.root.visible = gone < 0.5;
      setLit(b.tag, red > 0.5 ? '#ff5252' : (n.seen ?? 0) > i ? '#a5f0c5' : '#ffffff');
    });
  });
  out.work = marker(g, 0, LC.decks[1] + 0.04, LC.face);
}

// =============================================================================================
// 컵라면 진열대 (cvRamenShelf, 2 × 1).

const RAMEN_COLS = ['#d32f2f', '#f57c00', '#c2185b', '#388e3c', '#fbc02d', '#5d4037', '#1976d2'];
function ramenShelf(g: THREE.Group, out: Built, W: number) {
  part(g, box(W - 0.04, 1.72, 0.05), '#fff3e0', 0, 0.86, -0.42);
  for (const x of [-(W / 2) + 0.04, W / 2 - 0.04]) part(g, box(0.05, 1.72, 0.7), '#d84315', x, 0.86, -0.1);
  part(g, box(W - 0.04, 0.26, 0.5), '#d84315', 0, 1.82, -0.2);
  picture(g, painted('cvRamenSign', 256, 48, (c) => {
    c.fillStyle = '#d84315';
    c.fillRect(0, 0, 256, 48);
    text(c, '컵라면 · 봉지면', 128, 25, 26, '#fff8e1', 'center');
  }), W - 0.4, 0.22, 0, 1.82, 0.056);
  const gaps: THREE.Group[] = [];
  RM.decks.forEach((y, row) => {
    part(g, box(W - 0.1, 0.02, 0.62), '#ffe0b2', 0, y - 0.01, -0.1);
    part(g, box(W - 0.1, 0.034, 0.008), '#fff8e1', 0, y - 0.018, 0.216, { outline: false });
    for (let i = 0; i < 8; i++) {
      const x = -0.74 + i * 0.21;
      const c = RAMEN_COLS[(i + row * 2) % 7];
      const m = row === 3 ? snackMesh(g, c) : cupRamen(g, c);
      m.position.set(x, y, 0.1);
      if (row < 3 && i % 2 === 0) cupRamen(g, c).position.set(x, y + 0.11, 0.1);
      RM.gaps.forEach(([gx, gy], gi) => {
        if (gy === y && Math.abs(gx - x) <= 0.105 && !gaps[gi]) gaps[gi] = m;
      });
    }
    label(g, row % 2 ? '1,500' : '1,300', 0.16, 0.026, -0.6 + row * 0.35, y - 0.018, 0.222, '#fff8e1', '#c62828');
  });
  const crate = crateMesh(g, GREEN_D);
  const cup = cupRamen(g, '#d32f2f');
  const tag = label(g, '신상품', 0.16, 0.05, 0.2, RM.decks[2] - 0.022, 0.222, ORANGE, '#ffffff');
  const spots: Record<string, Spot> = { cvFaceRamen: standAt(g, 'cvRamen') };
  spots['*'] = spots.cvFaceRamen;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(crate, P.crate);
    at(cup, P.cup);
    gaps.forEach((m, i) => (m.visible = !now || i < (n.filled ?? 0)));
    tag.visible = !now || (n.tag ?? 0) > 0.5;
  });
  out.work = marker(g, 0, RM.decks[1], 0.3);
}

// =============================================================================================
// 온수기 코너 (cvHotWater, 1 × 1): a boiler, a microwave, chopsticks, a soup bucket.

function hotWater(g: THREE.Group, out: Built) {
  part(g, rbox(0.94, HW.top - 0.04, 0.72, 0.015), '#eceff1', 0, (HW.top - 0.04) / 2, -0.1);
  part(g, rbox(0.98, 0.05, 0.78, 0.012), '#b0bec5', 0, HW.top - 0.015, -0.1);
  // The soup bucket under its grate.
  part(g, box(0.34, 0.5, 0.02), '#cfd8dc', 0.26, 0.42, 0.262, { outline: false });
  label(g, '국물 버리는 곳', 0.3, 0.07, 0.26, 0.6, 0.274, '#37474f', '#ffffff');
  part(g, box(0.28, 0.012, 0.2), STEEL, 0.26, HW.top + 0.015, 0.16);
  for (let i = 0; i < 5; i++) part(g, box(0.26, 0.014, 0.012), BLACK, 0.26, HW.top + 0.025, 0.08 + i * 0.04, { outline: false });
  // The boiler: stainless, a sight gauge, a lever tap, a drip tray.
  const bx = -0.16;
  part(g, rbox(0.42, 0.62, 0.44, 0.03), STEEL, bx, HW.top + 0.31, -0.14);
  const lid = group(g, bx, HW.top + 0.62, -0.32);
  part(lid, cyl(0.17, 0.17, 0.02, 16), CHROME, 0, 0.01, 0.18);
  part(lid, ball(0.02), BLACK, 0, 0.03, 0.18, { outline: false });
  part(g, box(0.04, 0.34, 0.006), '#263238', bx + 0.12, HW.top + 0.28, 0.083, { outline: false });
  const gauge = ownLit(g, box(0.03, 1, 0.004), '#4fc3f7', bx + 0.12, HW.top + 0.12, 0.088);
  part(g, cyl(0.022, 0.022, 0.08, 8), CHROME, bx - 0.05, HW.top + 0.12, 0.11, { rx: Math.PI / 2, outline: false });
  part(g, box(0.05, 0.03, 0.05), '#d32f2f', bx - 0.05, HW.top + 0.17, 0.12, { outline: false });
  part(g, box(0.22, 0.02, 0.14), BLACK, bx - 0.04, HW.top + 0.015, 0.18, { outline: false });
  label(g, '뜨거운 물 주의', 0.26, 0.06, bx - 0.04, HW.top + 0.48, 0.083, '#d32f2f', '#ffffff');
  const light = ownLit(g, ball(0.012), '#ff7043', bx + 0.06, HW.top + 0.54, 0.084);
  // A microwave, shelf over it, chopsticks and napkins.
  part(g, rbox(0.42, 0.26, 0.34, 0.015), WHITE, 0.26, HW.top + 0.42, -0.14);
  part(g, box(0.3, 0.2, 0.005), '#37474f', 0.2, HW.top + 0.42, 0.031, { outline: false });
  part(g, box(0.06, 0.2, 0.005), '#90a4ae', 0.41, HW.top + 0.42, 0.031, { outline: false });
  part(g, box(0.46, 0.02, 0.38), '#b0bec5', 0.26, HW.top + 0.29, -0.14);
  for (const x of [0.06, 0.46]) part(g, box(0.02, 0.28, 0.02), '#90a4ae', x, HW.top + 0.15, 0.02, { outline: false });
  part(g, cyl(0.03, 0.03, 0.12, 10), '#8d6e63', 0.14, HW.top + 0.06, 0.04);
  for (let i = 0; i < 6; i++) part(g, cyl(0.003, 0.003, 0.17, 5), '#e8c98f', 0.13 + (i % 3) * 0.01, HW.top + 0.15, 0.03 + i * 0.006, { outline: false, rz: (i - 3) * 0.03 });
  const jug = group(g);
  part(jug, rbox(0.2, 0.34, 0.16, 0.03), '#b3e5fc', 0, 0.17, 0);
  part(jug, cyl(0.03, 0.03, 0.04, 10), '#0288d1', 0.08, 0.36, 0, { outline: false });
  const stream = ownLit(g, cyl(0.012, 0.012, 1, 6), '#81d4fa', 0, 0, 0);
  const cloth = clothMesh(g);
  const steam = puffs(g, 5, '#ffffff', 0.04);
  const spots: Record<string, Spot> = { cvRefillWater: standAt(g, 'cvWater') };
  spots['*'] = spots.cvRefillWater;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const level = now ? n.level ?? 0.8 : 0.8;
    gauge.scale.y = 0.3 * level;
    gauge.position.y = HW.top + 0.12 + 0.15 * level;
    lid.rotation.x = -(n.lid ?? 0) * 1.3;
    at(jug, P.jug);
    jug.rotation.z = (n.tip ?? 0) * 1.55;
    at(cloth, P.cloth);
    setLit(light, Math.floor(t * 2) % 2 && now ? '#ff5722' : '#ff7043');
    const pour = (n.pouring ?? 0) > 0.5;
    stream.visible = pour;
    if (pour) {
      stream.position.set(HW.lid[0], HW.lid[1] + 0.1, HW.lid[2] + 0.02);
      stream.scale.y = 0.2;
    }
    steam((n.lid ?? 0) * 0.7, HW.lid[0], HW.lid[1] + 0.03, HW.lid[2], 0.05, t, 0.6);
  });
  out.work = marker(g, bx, HW.top + 0.1, 0.25);
}

// =============================================================================================
// 창가 자리 (cvWindowBar, 4 × 1): front to the room; the shop window low along its back.

function windowBar(g: THREE.Group, out: Built, W: number) {
  part(g, rbox(W - 0.04, 0.05, 0.56, 0.015), WOOD, 0, WB.top - 0.025, 0.1);
  for (const x of [-(W / 2) + 0.12, 0, W / 2 - 0.12]) part(g, box(0.05, WB.top - 0.05, 0.42), '#90a4ae', x, (WB.top - 0.05) / 2, 0.06);
  part(g, box(W - 0.04, 0.5, 0.1), '#eceff1', 0, 0.25, -0.42);
  // A low window: frame and glass with the shop's name read backwards from in here; kept low for the room behind.
  part(g, box(W - 0.04, 0.03, 0.14), BLACK, 0, 0.51, -0.42);
  part(g, box(W - 0.04, 0.03, 0.08), BLACK, 0, 1.32, -0.42);
  for (let i = -2; i <= 2; i++) part(g, box(0.03, 0.8, 0.05), BLACK, i * (W - 0.1) / 4, 0.92, -0.42, { outline: false });
  pane(g, W - 0.1, 0.8, 0, 0.92, -0.42, 0.22);
  // Tent card, a napkin holder, what's been left at the end of lunch.
  const tent = painted('cvTent', 96, 64, (c) => {
    c.fillStyle = '#fff3e0';
    c.fillRect(0, 0, 96, 64);
    text(c, '다 드신 자리는', 48, 22, 11, INK, 'center');
    text(c, '치워 주세요', 48, 42, 11, INK, 'center');
  });
  for (const x of [-1.15, 1.2]) picture(g, tent, 0.15, 0.1, x, WB.top + 0.06, -0.09);
  part(g, rbox(0.12, 0.1, 0.08, 0.01), BLACK, 0.92, WB.top + 0.05, 0.0);
  const cups = WB.cups.map(([x, y, z], i) => {
    const m = cupRamen(g, i ? '#d32f2f' : '#f57c00');
    m.position.set(x, y, z);
    part(m, cyl(0.003, 0.003, 0.2, 5), '#e8c98f', 0.02, 0.15, 0, { rz: 1.1, outline: false });
    return m;
  });
  const can = canMesh(g, '#42a5f5');
  can.position.set(-0.6, WB.top, -0.02);
  const tray = group(g);
  part(tray, rbox(0.42, 0.016, 0.3, 0.008), GREEN, 0, 0.008, 0);
  const wetMat = new THREE.MeshBasicMaterial({ color: '#d5ecf5', transparent: true, opacity: 0, depthWrite: false });
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 0.46), wetMat);
  wet.userData.ownGeometry = wet.userData.ownMaterial = true;
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, WB.top + 0.002, 0.1);
  g.add(wet);
  const spray = sprayMesh(g);
  const cloth = clothMesh(g);
  const mist = puffs(g, 5, '#e3f2fd', 0.02);
  const spots: Record<string, Spot> = { cvWipeBar: standAt(g, 'cvBar') };
  spots['*'] = spots.cvWipeBar;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(tray, P.tray);
    cups.forEach((m, i) => {
      const took = (i ? n.took1 : n.took0) ?? 0;
      m.visible = !now || took < 1;
      const pos = P[`cup${i}`];
      place(m, pos ?? (took >= 1 && P.tray ? [(P.tray as V)[0] - 0.08 + i * 0.16, (P.tray as V)[1] + 0.02, (P.tray as V)[2]] : WB.cups[i]));
      m.visible = !now || took < 1 || !!P.tray;
    });
    can.visible = !now || (n.wiped ?? 0) < 0.1;
    wetMat.opacity = 0.5 * (n.wet ?? 0);
    wet.visible = wetMat.opacity > 0.02;
    at(spray, P.spray);
    at(cloth, P.cloth);
    mist(n.puff ?? 0, 0.1, WB.top + 0.15, 0.1, 0.2, t * 2.4, -0.08);
  });
  out.work = marker(g, 0, WB.top, 0.15);
}

// =============================================================================================
// 무인 단말기 (cvAtm, 1 × 1): cash, bills and tickets, a made-up all-in-one.

function atmKiosk(g: THREE.Group, out: Built) {
  part(g, rbox(0.76, 1.76, 0.56, 0.03), '#37474f', 0, 0.88, -0.04);
  part(g, box(0.68, 0.18, 0.56), GREEN, 0, 1.7, -0.04);
  label(g, '무인 금융·공과금', 0.6, 0.11, 0, 1.7, 0.242, GREEN, '#ffffff');
  // The screen, sloped.
  const head = group(g, 0, 1.28, 0.26);
  head.rotation.x = -0.2;
  part(head, rbox(0.54, 0.4, 0.03, 0.012), BLACK, 0, 0, 0);
  const screen = swapPic(head, 0.48, 0.34, 0, 0, 0.017);
  const paint = live(192, 136);
  const pages = ['메뉴를 고르세요', '카드를 넣어 주세요', '비밀번호', '금액을 고르세요', '현금을 받으세요'];
  const show = (c: CanvasRenderingContext2D, p: number) => {
    c.fillStyle = '#eaf6f0';
    c.fillRect(0, 0, 192, 136);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 192, 24);
    text(c, pages[p], 96, 13, 13, '#ffffff', 'center');
    if (p === 2) text(c, '● ● ● ●', 96, 78, 18, INK, 'center');
    else if (p !== 4 && p !== 1) (p === 0 ? ['출금', '입금', '공과금', '티켓'] : ['1만원', '3만원', '5만원', '10만원']).forEach((s, i) => {
      c.fillStyle = '#ffffff';
      c.fillRect(8 + (i % 2) * 92, 36 + Math.floor(i / 2) * 48, 84, 40);
      text(c, s, 50 + (i % 2) * 92, 56 + Math.floor(i / 2) * 48, 14, INK, 'center');
    });
    else text(c, p === 1 ? '▼ 카드' : '▼ 아래를 보세요', 96, 80, 16, INK, 'center');
  };
  screen.set(painted('cvAtmIdle', 192, 136, (c) => show(c, 0)));
  // Card slot, keypad, cash slot.
  part(g, box(0.5, 0.2, 0.08), '#455a64', 0, 0.98, 0.24, { rx: 0.2 });
  part(g, box(0.1, 0.012, 0.02), BLACK, 0.17, 1.05, 0.29, { outline: false });
  for (let i = 0; i < 9; i++) part(g, box(0.03, 0.022, 0.006), '#cfd8dc', -0.18 + (i % 3) * 0.045, 0.95 + Math.floor(i / 3) * 0.035, 0.29, { outline: false });
  const slot = part(g, box(0.24, 0.05, 0.1), BLACK, AT.slot[0] - 0.1, 0.8, 0.26);
  void slot;
  const cash = group(g);
  part(cash, box(0.16, 0.02, 0.08), '#a5d6a7', 0, 0, 0, { outline: false });
  cash.position.set(AT.slot[0] - 0.1, 0.83, 0.28);
  label(g, '현금', 0.14, 0.05, AT.slot[0] - 0.1, 0.72, 0.26, '#37474f', '#ffffff');
  const cust = person(g, LOOKS.c, AT.cust[0], AT.cust[1], Math.PI + 0.02);
  const spots: Record<string, Spot> = { cvHelpAtm: standAt(g, 'cvAtm') };
  spots['*'] = spots.cvHelpAtm;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    cust.root.visible = !!now;
    cash.visible = (n.cash ?? 0) > 0.5 && (n.cTake ?? 0) < 0.9;
    if (now) {
      screen.set(paint((c) => show(c, Math.min(4, Math.round(n.page ?? 0)))));
      cust.opts.nod = (n.cNod ?? 0) > 0.5 ? 0.12 + 0.12 * Math.abs(Math.sin(t * 2.6)) : 0.2 + 0.2 * (n.cBow ?? 0);
      cust.opts.lean = 0.1 + 0.14 * (n.cBow ?? 0);
      const press = (n.cPress ?? 0) > 0.5;
      cust.armR(press ? v3(0.03 + 0.05 * Math.sin(t * 7), 1.12 + 0.03 * Math.sin(t * 11), 0.38) : (n.cTake ?? 0) > 0.05 ? v3(AT.slot[0] - 0.1, 0.84, 0.36) : null);
      cust.armL(null);
    }
  });
  out.work = marker(g, 0, 1.28, 0.3);
}

// =============================================================================================
// 납품 상자 (cvCrateStack, 3 × 1): the morning's delivery on its dolly, the bench, what's been counted.

function crateStack(g: THREE.Group, out: Built) {
  const dolly = group(g, CR.top[0], 0, CR.top[2]);
  part(dolly, box(0.6, 0.05, 0.44), '#546e7a', 0, 0.08, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) part(dolly, cyl(0.035, 0.035, 0.03, 10), BLACK, sx * 0.24, 0.035, sz * 0.16, { rz: Math.PI / 2, outline: false });
  const stack = [0, 1, 2, 3].map((i) => {
    const c = crateMesh(dolly, i % 2 ? GREEN_D : CRATE);
    c.position.y = 0.1 + i * 0.27;
    return c;
  });
  label(dolly, '오전 배송', 0.3, 0.07, 0, 0.82, 0.225, '#ffffff', INK);
  // The bench and the slip on its clip.
  part(g, rbox(0.84, 0.04, 0.62, 0.012), WOOD, CR.bench[0], CR.bench[1] - 0.02, CR.bench[2]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, CR.bench[1] - 0.04, 0.04), '#78909c', CR.bench[0] + sx * 0.38, (CR.bench[1] - 0.04) / 2, CR.bench[2] + sz * 0.26);
  const slipBoard = group(g, CR.slip[0], CR.slip[1] - 0.2, CR.slip[2]);
  part(slipBoard, box(0.22, 0.012, 0.28), '#8d6e63', 0, 0, 0);
  const slipFace = swapPic(slipBoard, 0.2, 0.25, 0, 0.008, 0, 0, -Math.PI / 2);
  const face = live(96, 128);
  const slipIdle = painted('cvSlip', 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    text(c, '납품서', 48, 12, 13, GREEN_D, 'center');
    ['삼각김밥', '도시락', '우유', '생수'].forEach((s, i) => text(c, `· ${s}`, 6, 34 + i * 20, 11, INK));
  });
  slipFace.set(slipIdle);
  // The stack aside, counted, on a pallet.
  part(g, box(0.72, 0.1, 0.6), '#a1887f', CR.aside[0], 0.05, CR.aside[2]);
  const counted = group(g, CR.aside[0], 0.1, CR.aside[2]);
  crateMesh(counted, CRATE).position.y = 0;
  const moved = crateMesh(g, GREEN_D);
  moved.position.set(CR.aside[0], 0.37, CR.aside[2]);
  const carried = crateMesh(g, GREEN_D);
  const board = clipboard(g);
  const pda = pdaMesh(g);
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { cvCheckDelivery: standAt(g, 'cvCrate') };
  spots['*'] = spots.cvCheckDelivery;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const inStack = now ? n.stack ?? 4 : 3;
    stack.forEach((c, i) => (c.visible = i < inStack));
    at(carried, P.crate);
    moved.visible = !now || (n.moved ?? 0) > 0.5;
    at(board, P.board);
    if (P.board) board.rotation.set(0.5, Math.PI, 0);
    at(pda.root, P.pda);
    setLit(pda.led, (n.beep ?? 0) > 0.5 ? '#69f0ae' : '#32423a');
    at(pen, P.pen);
    if (now) {
      slipFace.set(face((c) => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, 96, 128);
        text(c, '납품서', 48, 12, 13, GREEN_D, 'center');
        ['삼각김밥', '도시락', '우유', '생수'].forEach((s, i) => text(c, `${i < (n.ticks ?? 0) ? '✓' : '·'} ${s}`, 6, 34 + i * 20, 11, INK));
        if ((n.signed ?? 0) > 0.5) text(c, '확인', 76, 116, 12, '#c62828', 'center');
      }));
    } else slipFace.set(slipIdle);
  });
  out.work = marker(g, CR.bench[0], CR.bench[1], CR.bench[2]);
}

// =============================================================================================
// 청소 코너 (cvMopBin, 1 × 1).

function mopBin(g: THREE.Group, out: Built) {
  // Two bins, one with its bag; the mop stood in a wringer bucket.
  const bin = (x: number, c: string, sign: string) => {
    part(g, rbox(0.3, 0.68, 0.34, 0.02), c, x, 0.34, -0.02);
    label(g, sign, 0.24, 0.07, x, 0.5, 0.152, '#ffffff', INK);
  };
  bin(MB.binL[0], '#546e7a', '일반');
  const lid = group(g, MB.binL[0], 0.68, -0.19);
  part(lid, rbox(0.32, 0.03, 0.36, 0.01), '#37474f', 0, 0.015, 0.17);
  part(g, rbox(0.2, 0.42, 0.26, 0.02), '#43a047', -0.42 + 0.02, 0.21, -0.25);
  label(g, '재활용', 0.16, 0.05, -0.4, 0.3, -0.118, '#ffffff', GREEN_D);
  // The bucket.
  part(g, cyl(0.17, 0.13, 0.28, 14), '#ffc107', MB.mop[0], 0.16, MB.mop[2]);
  part(g, box(0.32, 0.03, 0.04), '#37474f', MB.mop[0], 0.3, MB.mop[2], { outline: false });
  for (const [x, z] of [[0.13, 0.1], [-0.13, 0.1], [0.13, -0.1], [-0.13, -0.1]] as const) part(g, ball(0.022), BLACK, MB.mop[0] + x, 0.022, MB.mop[2] + z, { outline: false });
  const mop = group(g);
  part(mop, cyl(0.012, 0.012, 1.3, 8), '#b0bec5', 0, 0.8, 0);
  for (let i = 0; i < 9; i++) part(mop, cyl(0.012, 0.009, 0.16, 5), '#eceff1', -0.07 + (i % 3) * 0.07, 0.09, -0.03 + Math.floor(i / 3) * 0.03, { outline: false });
  mop.position.set(MB.mop[0], 0.15, MB.mop[2]);
  // Its yellow sign.
  const sign = group(g, 0.4, 0, 0.2, -0.2);
  part(sign, box(0.26, 0.54, 0.012), '#ffc107', 0, 0.28, 0, { rx: 0.15 });
  label(sign, '미끄럼 주의', 0.22, 0.07, 0, 0.32, 0.05, '#ffc107', BLACK);
  // The bag, out on the floor; the spare roll on the wall.
  const bag = group(g);
  const body = part(bag, ball(0.2), '#37474f', 0, 0.2, 0);
  body.scale.set(1, 1.1, 1);
  const knot = part(bag, cyl(0.03, 0.06, 0.08, 8), '#37474f', 0, 0.44, 0, { outline: false });
  const stick = group(g);
  part(stick, cyl(0.012, 0.012, 1.3, 8), '#b0bec5', 0, 0.65, 0);
  for (let i = 0; i < 9; i++) part(stick, cyl(0.012, 0.009, 0.14, 5), '#eceff1', -0.07 + (i % 3) * 0.07, 0.03, -0.03 + Math.floor(i / 3) * 0.03, { outline: false });
  const wetMat = new THREE.MeshBasicMaterial({ color: '#cfe8f3', transparent: true, opacity: 0, depthWrite: false });
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), wetMat);
  wet.userData.ownGeometry = wet.userData.ownMaterial = true;
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, 0.012, 1.8);
  g.add(wet);
  const quat = new THREE.Quaternion();
  const spots: Record<string, Spot> = { cvEmptyBins: standAt(g, 'cvBin') };
  spots['*'] = spots.cvEmptyBins;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    lid.rotation.x = -(n.lid ?? 0) * 1.3;
    at(bag, P.bag);
    knot.visible = (n.tied ?? 0) > 0.5;
    const m = n.mopping ?? 0;
    mop.visible = m < 0.5;
    const head = P.mopHead;
    stick.visible = !!head;
    if (head) {
      stick.position.set(head[0], head[1], head[2]);
      const top = v3(N!.st.x, 1.3, N!.st.z - 0.1).sub(stick.position).normalize();
      quat.setFromUnitVectors(UP, top);
      stick.quaternion.copy(quat);
    }
    wetMat.opacity = 0.42 * (n.wet ?? 0);
    wet.visible = wetMat.opacity > 0.02;
    sign.visible = m > 0.1 || !N;
  });
  out.work = marker(g, MB.binL[0], 0.72, 0.1);
}

// =============================================================================================
// 파라솔 테이블 (cvParasolTable, 2 × 1): the plastic table outside every 편의점.

function parasolTable(g: THREE.Group, out: Built, W: number) {
  part(g, rbox(1.3, 0.04, 0.82, 0.02), '#2e7d5b', 0, PT.top - 0.02, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) part(g, cyl(0.02, 0.018, PT.top - 0.04, 8), '#1f5a42', sx * 0.56, (PT.top - 0.04) / 2, sz * 0.32, { outline: false });
  // The parasol, in the brand's stripes, with its base; a string of small lamps for the end of the day.
  part(g, cyl(0.022, 0.022, 2.3, 8), '#eceff1', 0, 1.15, 0);
  part(g, cyl(0.26, 0.28, 0.08, 16), '#607d8b', 0, 0.04, 0);
  const canopy = group(g, 0, 2.24, 0);
  for (let i = 0; i < 8; i++) {
    const m = part(canopy, new THREE.ConeGeometry(1.2, 0.42, 4, 1, true, (i * Math.PI) / 4, Math.PI / 4), i % 2 ? GREEN : CREAM, 0, 0, 0, { outline: false });
    m.userData.ownGeometry = true;
  }
  part(canopy, ball(0.035), '#fafafa', 0, 0.22, 0, { outline: false });
  // Bulbs along the rim stay lit: they're the one thing a passing eye is caught by at dusk.
  for (let i = 0; i < 8; i++) ownLit(canopy, ball(0.024), '#fff3c4', Math.cos((i * Math.PI) / 4) * 1.05, -0.2, Math.sin((i * Math.PI) / 4) * 1.05);
  // Chairs: moulded plastic, one pushed out askew until someone sets it straight.
  const chair = (x: number, ry: number, c: string) => {
    const r = group(g, x, 0, 0, ry);
    part(r, rbox(0.34, 0.03, 0.34, 0.01), c, 0, 0.44, 0);
    part(r, rbox(0.34, 0.34, 0.03, 0.01), c, 0, 0.68, -0.16);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) part(r, cyl(0.014, 0.012, 0.44, 6), c, sx * 0.14, 0.22, sz * 0.14, { outline: false });
    return r;
  };
  chair(-(W / 2) + 0.14, Math.PI / 2, '#e53935');
  const loose = chair(PT.chair[0], -Math.PI / 2, '#e53935');
  // What's been left: cups, a can, a triangle's wrapper.
  const cups = PT.cups.map(([x, y, z], i) => {
    const m = i === 1 ? canMesh(g, '#42a5f5') : cupRamen(g, i ? '#d32f2f' : '#f57c00');
    m.position.set(x, y, z);
    return m;
  });
  const wrapper = part(g, box(0.1, 0.004, 0.08), '#fafafa', -0.1, PT.top + 0.003, 0.26, { outline: false });
  const bag = group(g);
  part(bag, rbox(0.26, 0.3, 0.2, 0.05), '#f1faf5', 0, -0.1, 0);
  for (const sx of [-1, 1]) part(bag, box(0.04, 0.1, 0.05), '#f1faf5', sx * 0.09, 0.09, 0, { outline: false });
  const cloth = clothMesh(g);
  const spots: Record<string, Spot> = { cvTidyTerrace: standAt(g, 'cvTerrace') };
  spots['*'] = spots.cvTidyTerrace;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(bag, P.bag);
    at(cloth, P.cloth);
    const took = [n.took0 ?? 0, n.took1 ?? 0, n.took2 ?? 0];
    cups.forEach((m, i) => {
      const pos = P[`cup${i}`];
      m.visible = !now || took[i] < 1;
      place(m, pos ?? PT.cups[i]);
    });
    wrapper.visible = !now || took[0] < 1;
    const straight = now ? n.straight ?? 0 : 0;
    loose.position.z = 0.17 * (1 - straight);
    loose.rotation.y = -Math.PI / 2 + 0.5 * (1 - straight);
  });
  out.work = marker(g, 0, PT.top, 0.14);
}

// =============================================================================================
// 행사 매대 (cvPromoStand, 1 × 1) and 입간판 (cvABoard, 1 × 1): set dressing.

function promoStand(g: THREE.Group) {
  part(g, rbox(0.76, 0.1, 0.76, 0.02), GONDOLA, 0, 0.05, 0);
  for (let i = 0; i < 3; i++) {
    const y = 0.14 + i * 0.27;
    const s = 0.76 - i * 0.16;
    part(g, box(s, 0.02, s), CREAM, 0, y, 0);
    const n = 4 - i;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) canMesh(g, ['#ff7043', '#ffb300', '#42a5f5'][i]).position.set(-(s - 0.14) / 2 + a * (s - 0.14) / Math.max(1, n - 1), y + 0.01, -(s - 0.14) / 2 + b * (s - 0.14) / Math.max(1, n - 1));
  }
  part(g, cyl(0.01, 0.01, 0.46, 6), STEEL, 0, 1.05, 0, { outline: false });
  picture(g, painted('cvPromo', 128, 96, (c) => {
    c.fillStyle = '#d32f2f';
    c.fillRect(0, 0, 128, 96);
    text(c, '1+1', 64, 38, 44, '#ffffff', 'center');
    text(c, '이번 주 행사', 64, 78, 14, '#ffeb3b', 'center');
  }), 0.46, 0.34, 0, 1.28, 0.012);
}
function aBoard(g: THREE.Group) {
  const face = (ry: number, z: number) => {
    const b = group(g, 0, 0, z, ry);
    part(b, box(0.56, 0.96, 0.02), GREEN_D, 0, 0.5, 0, { rx: -0.14 });
    picture(b, painted('cvBoard', 128, 216, (c) => {
      c.fillStyle = GREEN;
      c.fillRect(0, 0, 128, 216);
      c.fillStyle = '#fff';
      c.fillRect(8, 56, 112, 150);
      text(c, BRAND, 64, 28, 18, '#ffffff', 'center');
      text(c, '오늘의 행사', 64, 76, 14, GREEN_D, 'center');
      text(c, '도시락 1+1', 64, 112, 15, '#c62828', 'center');
      text(c, '라면 2+1', 64, 142, 15, '#c62828', 'center');
      text(c, '택배 접수', 64, 172, 14, INK, 'center');
    }), 0.5, 0.86, 0, 0.5, 0.013, '#ffffff', 0, -0.14);
  };
  face(0, 0.1);
  face(Math.PI, -0.1);
}

export const BUILDERS: Record<string, Builder> = {
  // The street front and the next unit (2026-11-05, the layout audit; shopFront.ts).
  cvShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 18, door: 12, name: BRAND, sub: '24시간 영업', bg: '#17935f', fg: '#ffffff', frame: '#cfd8dc', posters: [['1+1 행사', '#ffeb3b', '#d32f2f', 9.5], ['택배 접수', '#e3f2fd', '#1565c0', 16.5]] });
  },
  cvNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '맛나분식', color: '#e65100', wall: '#f3e0c8' });
  },
  storeCounter(g, W, _D, _c, _def, _ctx, out) {
    storeCounter(g, out, W);
  },
  snackShelf(g, W, _D, _c, _def, _ctx, out) {
    snackShelf(g, out, W);
  },
  drinkCooler(g, _W, _D, _c, _def, _ctx, out) {
    drinkCooler(g, out);
  },
  deliveryPOS(g, _W, _D, _c, _def, _ctx, out) {
    deliveryPOS(g, out);
  },
  orderTablet(g, _W, _D, _c, _def, _ctx, out) {
    orderTablet(g, out);
  },
  cvCigShelf(g, W) {
    cigShelf(g, W);
  },
  cvHotCase(g, _W, _D, _c, _def, _ctx, out) {
    hotCase(g, out);
  },
  cvRamenShelf(g, W, _D, _c, _def, _ctx, out) {
    ramenShelf(g, out, W);
  },
  cvHotWater(g, _W, _D, _c, _def, _ctx, out) {
    hotWater(g, out);
  },
  cvLunchChiller(g, W, _D, _c, _def, _ctx, out) {
    lunchChiller(g, out, W);
  },
  cvWindowBar(g, W, _D, _c, _def, _ctx, out) {
    windowBar(g, out, W);
  },
  cvAtm(g, _W, _D, _c, _def, _ctx, out) {
    atmKiosk(g, out);
  },
  cvParcelRack(g, W) {
    parcelRack(g, W);
  },
  cvCrateStack(g, _W, _D, _c, _def, _ctx, out) {
    crateStack(g, out);
  },
  cvMopBin(g, _W, _D, _c, _def, _ctx, out) {
    mopBin(g, out);
  },
  cvParasolTable(g, W, _D, _c, _def, _ctx, out) {
    parasolTable(g, out, W);
  },
  cvPromoStand(g) {
    promoStand(g);
  },
  cvABoard(g) {
    aBoard(g);
  },
};
