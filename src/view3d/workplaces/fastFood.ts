import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, text } from './doctor';
import { BC, DT, DV, FR, GR, KS, MB, PK, RS, TS, TT, ffNow, ffPhase } from './fastFoodMotion';
import type { FfMotion, FfNow } from './fastFoodMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 패스트푸드점 drawn as itself (2026-11-01 workplace pipeline, at the user's request): a branch of the
 * made-up 통통버거. The kitchen line along the back, fryers with their baskets and timers and a flat-top with
 * a ticket rail and a warm rack; a till with its menu boards up on posts for the people in front of it; and
 * what the branch was missing: order kiosks by the door with someone who can't get on with them, a pickup
 * counter whose number board changes as the order is bumped, a drinks tower, a drive-through window with
 * a car drawing up outside, a shelf and tablets for delivery riders, dining tables left with their trays, a
 * mop bucket with its yellow sign, and the low wall that closes off the kitchen, sauces and napkins on its
 * dining room side.
 *
 * Everything that moves follows the scripts in fastFoodMotion.ts; other people are played by VRoid bodies
 * where there are any (vroidFigure.ts). The brand, its menu and its delivery apps are all made up.
 */

const BRAND = '통통버거';
const RED = '#d6322b';
const RED_D = '#a8211c';
const MUSTARD = '#ffc233';
const CREAM = '#f7efe0';
const BROWN = '#3a2418';
const BUN = '#d99a4e';
const PATTY = '#5b3320';
const RAW = '#b56a5e';
const CHEESE = '#ffb300';
const LETTUCE = '#7cb342';
const PAPER = '#fbfaf6';
const KRAFT = '#c79a6b';
const OIL = '#d9a22e';
const SS = '#b9c2c8';
const SS_D = '#8f9aa1';
const TILE = '#f1ece2';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
const vv = (p: V) => v3(p[0], p[1], p[2]);

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
/** At the script's place while it says so, hidden or at home otherwise. */
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
function standAt(g: THREE.Object3D, motion: FfMotion): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: FfNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? ffNow(sp.motion as FfMotion, t, ffPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
/** A picture drawn afresh each frame while something's going on: one small canvas, made when first needed. */
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
/** Steam, smoke: soft balls rising from a place, each on its own loop. */
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

// The food, the wrappers and what's carried. Each has its origin about where it's held.

function burgerMesh(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, cyl(0.052, 0.05, 0.022, 14), BUN, 0, 0.012, 0);
  part(b, cyl(0.054, 0.054, 0.016, 14), PATTY, 0, 0.032, 0, { outline: false });
  part(b, box(0.078, 0.005, 0.078), CHEESE, 0, 0.043, 0, { ry: 0.5, outline: false });
  part(b, cyl(0.058, 0.056, 0.007, 12), LETTUCE, 0, 0.05, 0, { outline: false });
  const top = part(b, ball(0.054), BUN, 0, 0.056, 0);
  top.scale.set(1, 0.6, 1);
  return b;
}
function wrappedMesh(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, rbox(0.11, 0.065, 0.11, 0.025), CREAM, 0, 0.033, 0);
  part(b, box(0.112, 0.016, 0.112), RED, 0, 0.033, 0, { outline: false });
  return b;
}
function friesMesh(g: THREE.Object3D, color = '#f4c54d'): { root: THREE.Group; fries: THREE.Group } {
  const root = group(g);
  part(root, cyl(0.05, 0.036, 0.1, 4), RED, 0, 0.05, 0, { ry: Math.PI / 4 });
  const fries = group(root);
  for (let i = 0; i < 9; i++) part(fries, box(0.009, 0.08, 0.009), color, -0.028 + (i % 3) * 0.028, 0.115 + ((i * 7) % 4) * 0.005, -0.015 + Math.floor(i / 3) * 0.015, { rz: (i - 4) * 0.035, outline: false });
  return { root, fries };
}
function cupMesh(g: THREE.Object3D, color = RED): { root: THREE.Group; lid: THREE.Group } {
  const root = group(g);
  part(root, cyl(0.041, 0.031, 0.15, 12), PAPER, 0, 0.02, 0);
  part(root, cyl(0.0415, 0.036, 0.05, 12), color, 0, 0.03, 0, { outline: false });
  const lid = group(root);
  part(lid, cyl(0.043, 0.043, 0.012, 12), '#fafafa', 0, 0.1, 0, { outline: false });
  part(lid, cyl(0.004, 0.004, 0.09, 6), RED, 0.012, 0.15, 0, { rz: -0.15, outline: false });
  return { root, lid };
}
function bagMesh(g: THREE.Object3D): { root: THREE.Group; top: THREE.Mesh } {
  const root = group(g);
  part(root, rbox(0.2, 0.2, 0.12, 0.012), KRAFT, 0, 0.1, 0);
  part(root, box(0.1, 0.05, 0.002), RED, 0, 0.1, 0.061, { outline: false });
  const top = part(root, box(0.2, 0.05, 0.1), shade(KRAFT, 0.92), 0, 0.225, 0, { outline: false });
  return { root, top };
}
function trayMesh(g: THREE.Object3D, color = RED): THREE.Group {
  const t = group(g);
  part(t, rbox(0.42, 0.016, 0.3, 0.008), color, 0, 0.008, 0);
  part(t, box(0.36, 0.002, 0.25), CREAM, 0, 0.017, 0, { outline: false });
  return t;
}
function clothMesh(g: THREE.Object3D, color = '#4fc3f7'): THREE.Group {
  const c = group(g);
  part(c, rbox(0.12, 0.018, 0.09, 0.008), color, 0, 0, 0, { outline: false });
  return c;
}
function slipMesh(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, box(0.055, 0.1, 0.002), '#ffffff', 0, 0, 0, { outline: false });
  return s;
}
function spatulaMesh(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, box(0.1, 0.004, 0.1), CHROME, 0, 0, 0);
  rod(s, v3(0, 0, 0.05), v3(0.01, 0.04, 0.17), 0.006, SS_D);
  part(s, cyl(0.012, 0.012, 0.09, 8), BLACK, 0.012, 0.055, 0.2, { rx: 1.2, outline: false });
  return s;
}
function bottleMesh(g: THREE.Object3D, color: string): THREE.Group {
  const b = group(g);
  part(b, cyl(0.026, 0.028, 0.11, 10), color, 0, 0.055, 0);
  part(b, cyl(0.004, 0.018, 0.04, 8), color, 0, 0.13, 0, { outline: false });
  return b;
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
// Other people: drawn, played by VRoid bodies when they've come. What's worn on the head goes on after, so it stays.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  a: { top: '#5c6bc0', bottom: '#37474f', hair: '#2b1b10' },
  b: { top: '#f8bbd0', bottom: '#455a64', hair: '#1a1a1a', skin: '#f8d9c0' },
  c: { top: '#8d6e63', bottom: '#3e2723', hair: '#9e9e9e', skin: '#eac09a' },
  d: { top: '#26a69a', bottom: '#263238', hair: '#5b3a1e' },
  crew: { top: RED, bottom: '#363a40', hair: '#2b1b10', skin: '#f8d9c0' },
  rider: { top: '#37474f', bottom: '#212121', hair: '#1a1a1a', skin: '#c99a6e' },
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
  // `lean` and `nod` are read off these options every frame.
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}
/** A customer's way in and out of a scene: along `dx`, gone at `there` 0. */
function comes(f: Fig, there: number, x: number, z: number, dx: number, t: number) {
  f.root.visible = there > 0.02;
  if (!f.root.visible) return;
  const off = 1 - there;
  f.root.position.set(x + dx * off, off > 0.01 ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z);
}
/** The crew's cap, or a rider's helmet: on the head group, which goes where a body's head is. */
function capOn(f: Fig, color: string) {
  part(f.head, cyl(0.118, 0.122, 0.055, 14), color, 0, 0.1, -0.01);
  part(f.head, box(0.15, 0.012, 0.09), color, 0, 0.078, 0.12, { outline: false });
}
function helmetOn(f: Fig) {
  const h = part(f.head, ball(0.135), '#fafafa', 0, 0.05, -0.015);
  h.scale.set(1, 0.95, 1.08);
  // Its visor across the eyes and one stripe from front to back.
  part(f.head, box(0.19, 0.075, 0.03), '#263238', 0, 0.01, 0.115, { outline: false });
  part(f.head, box(0.035, 0.012, 0.25), RED, 0, 0.178, -0.015, { outline: false });
}

// ---------------------------------------------------------------------------------------------
// What's painted.

function burgerPic(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const pill = (dy: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y + dy * s, w * s, h * s, 0, 0, Math.PI * 2);
    c.fill();
  };
  pill(14, 30, 7, '#c98a3f');
  pill(7, 32, 6, PATTY);
  pill(2, 33, 3, CHEESE);
  pill(-2, 33, 4, LETTUCE);
  c.fillStyle = BUN;
  c.beginPath();
  c.ellipse(x, y - 4 * s, 30 * s, 20 * s, 0, Math.PI, 0);
  c.fill();
}
const logoTex = () =>
  painted('ffLogo', 256, 96, (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 256, 96);
    burgerPic(c, 46, 50, 0.95);
    text(c, BRAND, 92, 44, 36, '#ffffff');
    text(c, '한 입 가득, 통통하게', 94, 76, 14, MUSTARD);
  });
/** The three boards over the till. */
const MENU: Array<[string, Array<[string, string]>]> = [
  ['버거', [['통통 불고기', '5,400'], ['더블 치즈', '6,900'], ['매콤 치킨', '5,900'], ['새우 통통', '6,200']]],
  ['세트', [['불고기 세트', '7,600'], ['더블 세트', '9,100'], ['치킨 세트', '8,100'], ['둘이서 세트', '15,900']]],
  ['사이드', [['감자튀김', '2,200'], ['치즈스틱', '2,500'], ['콜라', '1,800'], ['아이스크림', '1,200']]],
];
const menuTex = (i: number) =>
  painted(`ffMenu${i}`, 256, 192, (c) => {
    c.fillStyle = '#1d1a18';
    c.fillRect(0, 0, 256, 192);
    c.fillStyle = RED;
    c.fillRect(0, 0, 256, 38);
    text(c, MENU[i][0], 128, 20, 24, '#ffffff', 'center');
    MENU[i][1].forEach(([n, p], k) => {
      text(c, n, 12, 62 + k * 32, 18, CREAM);
      text(c, p, 244, 62 + k * 32, 16, MUSTARD, 'right');
    });
  });

// =============================================================================================
// 튀김기 (fryer).

function fryer(g: THREE.Group, out: Built) {
  // The cabinet, the deck of wells, the tiled splash and a stainless hood overhead.
  part(g, rbox(0.96, 0.82, 0.82, 0.015), SS, 0, 0.41, -0.05);
  part(g, box(0.96, 0.04, 0.84), SS_D, 0, 0.84, -0.05);
  for (const x of [-0.24, 0.24]) {
    part(g, rbox(0.44, 0.5, 0.012, 0.005), shade(SS, 1.08), x, 0.3, 0.37);
    part(g, cyl(0.012, 0.012, 0.3, 8), SS_D, x + (x < 0 ? 0.16 : -0.16), 0.36, 0.385, { outline: false });
  }
  part(g, box(0.96, 0.05, 0.03), BLACK, 0, 0.025, 0.34, { outline: false });
  // The freezer drawer.
  const drawer = group(g);
  part(drawer, rbox(0.34, 0.2, 0.3, 0.01), '#dfe6ea', FR.drawer[0], 0.42, 0.22);
  part(drawer, box(0.28, 0.02, 0.02), SS_D, FR.drawer[0], FR.drawer[1], 0.385, { outline: false });
  label(drawer, '냉동 감자', 0.18, 0.05, FR.drawer[0], 0.36, 0.373, '#37474f', '#ffffff');
  // The wells: oil to the brim.
  const oil: THREE.Mesh[] = [];
  for (const x of FR.wells) {
    part(g, box(0.27, 0.03, 0.42), BLACK, x, 0.85, FR.z);
    oil.push(ownLit(g, box(0.235, 0.012, 0.38), OIL, x, FR.oil, FR.z));
  }
  // The salting pan, under its lamp, with a shaker and a stack of cartons.
  part(g, box(0.28, 0.05, 0.3), SS, FR.pan[0], 0.885, FR.pan[2]);
  const pile = group(g);
  for (let i = 0; i < 26; i++) part(pile, box(0.012, 0.012, 0.075), '#f4c54d', FR.pan[0] - 0.1 + ((i * 37) % 21) * 0.01, 0.92 + (i % 3) * 0.008, FR.pan[2] - 0.1 + ((i * 53) % 19) * 0.011, { ry: i * 0.9, outline: false });
  const lampOn = ownLit(g, cyl(0.06, 0.06, 0.012, 14), '#6b4f33', FR.pan[0], 1.38, FR.pan[2] - 0.04);
  part(g, cyl(0.03, 0.08, 0.1, 14), RED, FR.pan[0], 1.43, FR.pan[2] - 0.04);
  rod(g, v3(FR.pan[0], 1.48, FR.pan[2] - 0.04), v3(FR.pan[0], 1.62, -0.42), 0.008, SS_D);
  part(g, box(0.3, 0.015, 0.2), SS, FR.shelf[0], 1.22, FR.shelf[2] - 0.05);
  rod(g, v3(FR.shelf[0] + 0.14, 1.22, -0.2), v3(FR.shelf[0] + 0.14, 1.22, -0.44), 0.008, SS_D);
  rod(g, v3(FR.shelf[0] - 0.14, 1.22, -0.2), v3(FR.shelf[0] - 0.14, 1.22, -0.44), 0.008, SS_D);
  const racked = [friesMesh(g), friesMesh(g), friesMesh(g)];
  racked.forEach((m, i) => place(m.root, [FR.shelf[0] - 0.09 + i * 0.09, 1.23, FR.shelf[2] - 0.06]));
  const shaker = group(g);
  part(shaker, cyl(0.026, 0.03, 0.09, 10), '#fafafa', 0, 0.045, 0);
  part(shaker, cyl(0.03, 0.026, 0.016, 10), CHROME, 0, 0.098, 0, { outline: false });
  // Splash, hanger bar, hood.
  part(g, box(0.98, 1.5, 0.03), TILE, 0, 1.6, -0.46, { outline: false });
  part(g, box(0.9, 0.02, 0.02), SS_D, -0.1, FR.hook[1] + 0.09, FR.hook[2] - 0.2, { outline: false });
  part(g, rbox(1.0, 0.28, 0.72, 0.02), SS, 0, 2.2, -0.14);
  part(g, box(0.92, 0.02, 0.62), SS_D, 0, 2.05, -0.14, { outline: false });
  label(g, '뜨거운 기름 주의', 0.34, 0.07, -0.26, 1.34, -0.44, MUSTARD, BLACK);
  // Timer panel: two little clocks on a slope.
  const panel = group(g, FR.panel[0] + 0.15, 0.78, 0.395);
  part(panel, box(0.62, 0.1, 0.02), BLACK, 0, 0, 0);
  const screen = swapPic(panel, 0.24, 0.07, -0.15, 0, 0.012);
  picture(panel, painted('ffTimerIdle', 96, 32, (c) => {
    c.fillStyle = '#1b0d07';
    c.fillRect(0, 0, 96, 32);
    text(c, '준비', 48, 17, 20, '#ff8a65', 'center');
  }), 0.24, 0.07, 0.15, 0, 0.012);
  const beeper = ownLit(panel, ball(0.012), '#3d0a14', 0, 0.03, 0.012);
  const clockLive = live(96, 32);
  const clock = (u: number, alarm: boolean, t: number) =>
    clockLive((c) => {
      c.fillStyle = '#1b0d07';
      c.fillRect(0, 0, 96, 32);
      const left = Math.max(0, Math.round((1 - u) * 150));
      const s = alarm ? (Math.floor(t * 6) % 2 ? '끝!' : '') : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      text(c, s, 48, 17, 24, alarm ? '#ff5252' : '#ffd54f', 'center');
    });
  // The baskets: one for use, one hanging. The fries in it go gold as they cook.
  const basket = (color: string) => {
    const b = group(g);
    for (const y of [0, 0.09]) {
      part(b, box(0.21, 0.008, 0.008), STEEL, 0, y, 0.09, { outline: false });
      part(b, box(0.21, 0.008, 0.008), STEEL, 0, y, -0.09, { outline: false });
      part(b, box(0.008, 0.008, 0.18), STEEL, 0.105, y, 0, { outline: false });
      part(b, box(0.008, 0.008, 0.18), STEEL, -0.105, y, 0, { outline: false });
    }
    for (const x of [-0.1, -0.05, 0, 0.05, 0.1]) part(b, box(0.005, 0.09, 0.005), STEEL, x, 0.045, 0.09, { outline: false });
    for (const x of [-0.1, -0.05, 0, 0.05, 0.1]) part(b, box(0.005, 0.09, 0.005), STEEL, x, 0.045, -0.09, { outline: false });
    part(b, box(0.21, 0.004, 0.18), STEEL, 0, 0, 0, { outline: false });
    rod(b, v3(0, 0.09, 0.09), v3(0, 0.07, 0.17), 0.006, STEEL);
    part(b, cyl(0.014, 0.014, 0.1, 8), color, 0, 0.065, 0.2, { rx: Math.PI / 2, outline: false });
    return b;
  };
  const b1 = basket(RED);
  const b2 = basket(BLACK);
  place(b2, [FR.wells[1], FR.hook[1], FR.hook[2]]);
  const friesIn = group(b1);
  const mats: THREE.MeshToonMaterial[] = [];
  for (let i = 0; i < 24; i++) {
    const m = part(friesIn, box(0.012, 0.012, 0.09), '#f3e2a5', -0.09 + ((i * 41) % 19) * 0.01, 0.015 + (i % 4) * 0.012, -0.07 + ((i * 29) % 15) * 0.01, { ry: i * 1.1, outline: false });
    if (i === 0) {
      const mat = (m.material as THREE.MeshToonMaterial).clone();
      mats.push(mat);
    }
    m.material = mats[0];
  }
  friesIn.children.forEach((c) => (c.userData.ownMaterial = c === friesIn.children[0]));
  // What's in hand.
  const bag = group(g);
  part(bag, rbox(0.18, 0.26, 0.09, 0.03), '#cfe5f2', 0, 0, 0);
  part(bag, box(0.15, 0.1, 0.002), '#1565c0', 0, 0, 0.046, { outline: false });
  const carton = friesMesh(g);
  const scoop = group(g);
  part(scoop, box(0.12, 0.05, 0.1), CHROME, 0, 0, 0);
  part(scoop, cyl(0.009, 0.009, 0.1, 6), BLACK, 0.1, 0.02, 0, { rz: Math.PI / 2, outline: false });
  const steam = puffs(g, 6, '#ffffff', 0.045);
  const drips = puffs(g, 3, OIL, 0.01);
  const salt = puffs(g, 4, '#ffffff', 0.008);
  const spots: Record<string, Spot> = { fryFries: standAt(g, 'ffFry') };
  spots['*'] = spots.fryFries;
  const cookCol = new THREE.Color();
  const pale = new THREE.Color('#f3e2a5');
  const gold = new THREE.Color('#dfa22c');
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(b1, P.basket, FR.hook);
    b1.rotation.z = (n.tipB ?? 0) * -1.9;
    b1.rotation.x = 0;
    friesIn.visible = (n.fill ?? 0) > 0.05;
    friesIn.scale.y = Math.max(0.2, n.fill ?? 0);
    cookCol.copy(pale).lerp(gold, n.cook ?? 0);
    mats[0]?.color.copy(cookCol);
    drawer.position.z = 0.14 * (n.drawer ?? 0);
    at(bag, P.bag);
    bag.rotation.z = (n.tipBag ?? 0) * 2.2;
    at(shaker, P.shaker, FR.salt);
    at(carton.root, P.carton);
    carton.fries.visible = (n.cartonFull ?? 0) > 0.2;
    carton.fries.scale.y = Math.max(0.3, n.cartonFull ?? 0);
    at(scoop, P.scoop);
    pile.visible = (n.pan ?? 0.3) > 0.05;
    pile.scale.setScalar(1);
    pile.position.y = -0.05 * (1 - Math.min(1, n.pan ?? 0.3));
    racked.forEach((m, i) => (m.root.visible = i < (n.cartons ?? 2)));
    const cooking = n.oil ?? 0;
    steam(cooking, FR.wells[0], FR.oil + 0.04, FR.z, 0.07, t, 0.8);
    drips(n.drip ?? 0, FR.wells[0], FR.oil + 0.1, FR.z, 0.08, t, -0.1);
    salt(n.salting ?? 0, FR.pan[0], FR.pan[1] + 0.2, FR.pan[2], 0.06, t * 2, -0.2);
    setLit(oil[0], cooking > 0.3 ? (Math.sin(t * 19) > 0 ? '#e7b23d' : '#d39a28') : OIL);
    setLit(lampOn, now ? '#ffb74d' : '#6b4f33');
    const beep = (n.beep ?? 0) > 0.5;
    setLit(beeper, beep && Math.floor(t * 6) % 2 === 0 ? '#ff1744' : '#3d0a14');
    if (now) screen.set(clock(n.timer ?? 0, beep, t));
    else screen.set(painted('ffTimerIdle', 96, 32, () => undefined));
  });
  out.work = marker(g, FR.wells[0], 0.92, FR.z);
}

// =============================================================================================
// 그릴 (grillTop).

function grill(g: THREE.Group, out: Built) {
  part(g, rbox(0.96, 0.82, 0.82, 0.015), SS, 0, 0.41, -0.05);
  part(g, box(0.96, 0.05, 0.84), SS_D, 0, 0.84, -0.05);
  part(g, box(0.96, 0.05, 0.03), BLACK, 0, 0.025, 0.34, { outline: false });
  const drawer = group(g);
  part(drawer, rbox(0.72, 0.28, 0.3, 0.01), '#dfe6ea', 0, 0.42, 0.22);
  part(drawer, box(0.6, 0.02, 0.02), SS_D, 0, GR.drawer[1], 0.385, { outline: false });
  label(drawer, '패티 냉장', 0.2, 0.05, 0, 0.42, 0.373, '#0277bd', '#ffffff');
  for (const x of [-0.3, 0, 0.3]) part(g, cyl(0.022, 0.022, 0.03, 12), RED, x, 0.8, 0.385, { rx: Math.PI / 2, outline: false });
  // The plate, the trough along its front, a backsplash, the warm rack and the ticket rail.
  part(g, box(0.92, 0.04, 0.66), '#2d2f33', 0, GR.plate - 0.02, 0.03);
  part(g, box(0.9, 0.008, 0.04), SS_D, 0, GR.plate, 0.36, { outline: false });
  const heat = ownLit(g, box(0.86, 0.002, 0.6), '#34363a', 0, GR.plate + 0.001, 0.03);
  part(g, box(0.98, 1.5, 0.03), TILE, 0, 1.6, -0.46, { outline: false });
  part(g, box(0.96, 0.4, 0.04), SS, 0, 1.08, -0.3);
  part(g, box(0.9, 0.02, 0.22), SS, 0, GR.rack, -0.17);
  for (const x of [-0.46, 0.46]) rod(g, v3(x, GR.rack, -0.08), v3(x, GR.rack + 0.22, -0.42), 0.008, SS_D);
  const warmLamp = ownLit(g, box(0.82, 0.015, 0.05), '#6b4f33', 0, GR.rack + 0.24, -0.17);
  part(g, box(0.86, 0.04, 0.09), RED, 0, GR.rack + 0.26, -0.17);
  // The rail with its tickets.
  part(g, box(0.92, 0.024, 0.02), CHROME, 0, GR.rail, -0.05);
  for (const x of [-0.42, 0.42]) rod(g, v3(x, GR.rail, -0.05), v3(x, GR.rail + 0.06, -0.44), 0.007, SS_D);
  const ticketTex = (i: number) =>
    painted(`ffTicket${i}`, 64, 96, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 64, 96);
      text(c, `#${214 + i}`, 32, 14, 16, BLACK, 'center');
      ['불고기', '더블', '치킨'].forEach((s, k) => text(c, `${1 + (i + k) % 2} ${s}`, 6, 36 + k * 16, 12, BLACK));
    });
  const tickets = Array.from({ length: 7 }, (_, i) => picture(g, ticketTex(i), 0.085, 0.125, -0.38 + i * 0.125, GR.rail - 0.075, -0.035));
  const printer = group(g, -0.42, GR.rail - 0.24, -0.1);
  part(printer, rbox(0.14, 0.13, 0.14, 0.02), BLACK, 0, 0, 0);
  const strip = part(printer, box(0.06, 0.2, 0.002), '#ffffff', 0, 0.16, 0.05, { outline: false });
  strip.visible = false;
  const rushLamp = ownLit(g, ball(0.035), '#3d0a14', 0.42, GR.rail + 0.1, -0.08);
  part(g, cyl(0.03, 0.03, 0.03, 10), BLACK, 0.42, GR.rail + 0.05, -0.08, { outline: false });
  // A bell for the counter, bottles, a spatula on a hook, buns in a tray at the back.
  const bell = group(g, GR.bell[0], GR.plate + 0.01, GR.bell[2]);
  part(bell, cyl(0.04, 0.05, 0.015, 12), BLACK, 0, 0, 0, { outline: false });
  part(bell, ball(0.033), MUSTARD, 0, 0.03, 0);
  const sauce = bottleMesh(g, MUSTARD);
  const sauce2 = bottleMesh(g, RED);
  place(sauce2, [GR.bottle[0] + 0.07, GR.bottle[1] - 0.06, GR.bottle[2] - 0.07]);
  const spat = spatulaMesh(g);
  const scraper = group(g);
  part(scraper, box(0.12, 0.05, 0.015), CHROME, 0, 0, 0);
  part(scraper, cyl(0.016, 0.016, 0.1, 8), BLACK, 0, 0.055, 0, { outline: false });
  // On the plate.
  const patties = GR.slots.map(([x, z]) => {
    const p = group(g, x, GR.plate + 0.012, z);
    const faceTop = part(p, cyl(0.075, 0.075, 0.012, 16), RAW, 0, 0.012, 0, { outline: false });
    part(p, cyl(0.075, 0.075, 0.012, 16), PATTY, 0, 0, 0, { outline: false });
    const slice = part(p, box(0.1, 0.005, 0.1), CHEESE, 0, 0.022, 0, { ry: 0.6, outline: false });
    p.visible = false;
    return { p, faceTop, slice };
  });
  const buns = GR.buns.map(([x, z]) => {
    const r = group(g, x, GR.plate + 0.005, z);
    part(r, cyl(0.06, 0.056, 0.02, 12), BUN, 0, 0.01, 0, { outline: false });
    r.visible = false;
    return r;
  });
  const built = GR.buns.map(([x, z]) => {
    const b = burgerMesh(g);
    place(b, [x, GR.plate + 0.005, z]);
    b.visible = false;
    return b;
  });
  const wrapped = GR.buns.map(([x, z]) => {
    const b = wrappedMesh(g);
    place(b, [x, GR.plate + 0.005, z]);
    b.visible = false;
    return b;
  });
  const rack = Array.from({ length: 5 }, (_, i) => {
    const b = wrappedMesh(g);
    place(b, [-0.34 + i * 0.17, GR.rack + 0.012, -0.14]);
    return b;
  });
  const rackMoving = wrappedMesh(g);
  const carried = group(g);
  part(carried, cyl(0.07, 0.07, 0.02, 14), PATTY, 0, 0.01, 0, { outline: false });
  const sheet = group(g);
  part(sheet, box(0.26, 0.01, 0.16), '#e8dfd2', 0, 0, 0);
  for (const [dx, dz] of [[-0.07, -0.04], [0, 0.03], [0.07, -0.03]]) part(sheet, cyl(0.04, 0.04, 0.012, 12), RAW, dx, 0.01, dz, { outline: false });
  const slip = slipMesh(g);
  const sqz = puffs(g, 2, MUSTARD, 0.008);
  const smoke = puffs(g, 7, '#d9d4cc', 0.055);
  const spots: Record<string, Spot> = { grillBurgers: standAt(g, 'ffGrill'), rushHour: standAt(g, 'ffRush') };
  spots['*'] = spots.grillBurgers;
  const raw = new THREE.Color(RAW);
  const done = new THREE.Color(PATTY);
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    drawer.position.z = 0.14 * (n.drawer ?? 0);
    at(spat, P.spat, GR.hook);
    at(scraper, P.scraper);
    at(sauce, P.bottle, GR.bottle);
    at(carried, P.carried);
    at(rackMoving, P.carriedW);
    at(slip, P.slip);
    at(sheet, P.patties);
    const tn = n.tickets ?? 1;
    tickets.forEach((m, i) => (m.visible = i < tn));
    strip.visible = (n.rush ?? 0) > 0.5;
    setLit(rushLamp, (n.rush ?? 0) > 0.5 && Math.floor(t * 5) % 2 === 0 ? '#ff1744' : '#3d0a14');
    setLit(heat, N ? '#3d3331' : '#34363a');
    setLit(warmLamp, N ? '#ffb74d' : '#6b4f33');
    bell.position.y = GR.plate + 0.01 - 0.008 * (n.ding ?? 0) * Math.abs(Math.sin(t * 12));
    const pc = n.p ?? 0;
    const fl = n.flip ?? 0;
    patties.forEach(({ p, faceTop, slice }, i) => {
      p.visible = !!N && i < Math.round(pc) && !(P.carried && (n.carrying ?? -1) === i);
      const f = THREE.MathUtils.clamp(fl - i, 0, 1);
      p.rotation.x = f * Math.PI;
      p.position.y = GR.plate + 0.012 + Math.sin(f * Math.PI) * 0.08 + (f > 0.5 ? 0.012 : 0);
      (faceTop.material as THREE.MeshToonMaterial).color?.copy(raw).lerp(done, THREE.MathUtils.clamp(n.cook ?? 0, 0, 1));
      slice.visible = i < Math.round(n.cheese ?? 0);
      slice.position.y = f > 0.5 ? -0.016 : 0.022;
    });
    buns.forEach((b, i) => (b.visible = i < Math.round(n.buns ?? 0) && !(i < Math.round(n.built ?? 0))));
    built.forEach((b, i) => (b.visible = i < Math.round(n.built ?? 0)));
    wrapped.forEach((b, i) => (b.visible = i < Math.round(n.wrapped ?? 0)));
    const rn = N ? (n.rack ?? 1) : 1;
    rack.forEach((b, i) => (b.visible = i < rn));
    const sm = n.smoke ?? 0;
    smoke(sm, 0, GR.plate + 0.06, 0.14, 0.16, t, 0.9);
    sqz(n.squeeze ?? 0, P.bottle?.[0] ?? 0, (P.bottle?.[1] ?? 1) - 0.02, P.bottle?.[2] ?? 0, 0, t * 2, -0.1);
  });
  // Faces are separate colours: each patty's top has its own material.
  patties.forEach(({ faceTop }) => {
    faceTop.material = (faceTop.material as THREE.MeshToonMaterial).clone();
    faceTop.userData.ownMaterial = true;
  });
  out.work = marker(g, 0, 0.95, 0.14);
}

// =============================================================================================
// 주문 카운터 (burgerCounter, 2 × 1): placed with its front to the kitchen, so its back faces the customers.

function counterBody(g: THREE.Group, W: number, top: number) {
  // The customers' side: the brand's red. The crew's: steel shelves.
  part(g, rbox(W - 0.04, top - 0.06, 0.8, 0.02), RED, 0, (top - 0.06) / 2, -0.05);
  part(g, rbox(W, 0.05, 0.9, 0.015), CREAM, 0, top - 0.025, -0.05);
  part(g, box(W - 0.06, top - 0.16, 0.02), SS, 0, (top - 0.14) / 2, 0.355, { outline: false });
  part(g, box(W - 0.1, 0.018, 0.34), SS_D, 0, 0.45, 0.19);
  part(g, box(W - 0.04, 0.06, 0.8), BLACK, 0, 0.03, -0.05, { outline: false });
  part(g, box(W - 0.04, 0.08, 0.012), MUSTARD, 0, top - 0.22, -0.456, { outline: false });
}

function burgerCounter(g: THREE.Group, out: Built, W: number) {
  counterBody(g, W, BC.top);
  picture(g, logoTex(), 0.9, 0.34, 0.1, 0.44, -0.457, '#ffffff', Math.PI);
  // The boards on two posts, facing those who've come to order, a rail of little spots above.
  for (const x of [-0.95, 0.95]) part(g, cyl(0.025, 0.025, 1.5, 10), BLACK, x, BC.top + 0.75, 0.3);
  part(g, box(2.02, 0.05, 0.05), BLACK, 0, BC.top + 1.48, 0.3);
  part(g, rbox(2.02, 0.6, 0.04, 0.01), BLACK, 0, BC.top + 1.2, 0.3);
  [-0.65, 0, 0.65].forEach((x, i) => picture(g, menuTex(2 - i), 0.62, 0.48, x, BC.top + 1.2, 0.277, '#ffffff', Math.PI));
  picture(g, painted('ffBoardBack', 64, 32, (c) => {
    c.fillStyle = '#26282c';
    c.fillRect(0, 0, 64, 32);
    text(c, BRAND, 32, 16, 11, '#90a4ae', 'center');
  }), 1.2, 0.3, 0, BC.top + 1.2, 0.323);
  // The till, facing the crew, its screen a live order.
  part(g, cyl(0.012, 0.018, 0.2, 8), BLACK, BC.pos[0], BC.top + 0.1, BC.pos[2] - 0.03, { outline: false });
  part(g, rbox(0.15, 0.015, 0.14, 0.006), BLACK, BC.pos[0], BC.top + 0.008, BC.pos[2] - 0.03, { outline: false });
  const pos = group(g, BC.pos[0], BC.pos[1], BC.pos[2]);
  pos.rotation.x = -0.25;
  part(pos, rbox(0.32, 0.22, 0.03, 0.012), BLACK, 0, 0, 0);
  const posScreen = swapPic(pos, 0.3, 0.2, 0, 0, 0.017);
  const posLive = live(192, 128);
  const posIdle = painted('ffPosIdle', 192, 128, (c) => {
    c.fillStyle = '#fff4e0';
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = RED;
    c.fillRect(0, 0, 192, 22);
    text(c, `${BRAND} POS`, 96, 12, 13, '#ffffff', 'center');
    for (let i = 0; i < 9; i++) {
      c.fillStyle = ['#ef9a9a', '#ffe082', '#a5d6a7'][i % 3];
      c.fillRect(8 + (i % 3) * 60, 28 + Math.floor(i / 3) * 32, 54, 28);
      text(c, ['버거', '세트', '사이드'][i % 3], 35 + (i % 3) * 60, 43 + Math.floor(i / 3) * 32, 11, BROWN, 'center');
    }
  });
  posScreen.set(posIdle);
  // The card terminal faces the customer; the printer the crew.
  const term = group(g, BC.terminal[0], BC.terminal[1], BC.terminal[2]);
  part(term, rbox(0.1, 0.05, 0.16, 0.012), BLACK, 0, 0, 0, { rx: 0.5 });
  const termLed = ownLit(term, box(0.07, 0.003, 0.06), '#1a2f22', 0, 0.03, 0.012);
  termLed.rotation.x = 0.5;
  part(g, rbox(0.16, 0.11, 0.2, 0.02), '#37474f', BC.printer[0], BC.top + 0.055, BC.printer[2]);
  const slip = slipMesh(g);
  // Tray stack, the warm shelf with what's ready, napkins and a little bell.
  for (let i = 0; i < 4; i++) trayMesh(g).position.set(BC.stack[0], BC.top + i * 0.018, BC.stack[2]);
  part(g, box(0.5, 0.012, 0.3), SS, BC.warm[0], BC.warm[1] - 0.02, BC.warm[2] - 0.04);
  for (const x of [-0.24, 0.24]) part(g, cyl(0.01, 0.01, 0.11, 8), SS_D, BC.warm[0] + x, BC.warm[1] - 0.07, BC.warm[2] - 0.04, { outline: false });
  part(g, box(0.5, 0.04, 0.09), RED, BC.warm[0], BC.warm[1] + 0.28, BC.warm[2] - 0.06);
  for (const x of [-0.24, 0.24]) rod(g, v3(BC.warm[0] + x, BC.warm[1] + 0.27, BC.warm[2] - 0.06), v3(BC.warm[0] + x, BC.top, BC.warm[2] - 0.16), 0.007, SS_D);
  const heatLamp = ownLit(g, box(0.44, 0.012, 0.05), '#6b4f33', BC.warm[0], BC.warm[1] + 0.255, BC.warm[2] - 0.06);
  const wB = burgerMesh(g);
  place(wB, [BC.warm[0] - 0.14, BC.warm[1] - 0.01, BC.warm[2]]);
  const wF = friesMesh(g);
  place(wF.root, [BC.warm[0] + 0.0, BC.warm[1] - 0.01, BC.warm[2] + 0.02]);
  const wD = cupMesh(g);
  place(wD.root, [BC.warm[0] + 0.14, BC.warm[1] + 0.05, BC.warm[2]]);
  // The tray going across, and what goes on it.
  const tray = trayMesh(g);
  const oB = burgerMesh(tray);
  place(oB, [-0.09, 0.02, 0.02]);
  const oF = friesMesh(tray);
  place(oF.root, [0.05, 0.02, 0.05]);
  const oD = cupMesh(tray);
  place(oD.root, [0.13, 0.08, -0.05]);
  const hB = burgerMesh(g);
  const hF = friesMesh(g);
  const hD = cupMesh(g);
  // The clipboard for training, and whoever's come to order.
  const board = group(g);
  part(board, box(0.2, 0.012, 0.27), '#8d6e63', 0, 0, 0);
  const sheetTex = (n: number) => painted(`ffChecklist${n}`, 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    text(c, '신입 체크', 48, 12, 12, RED, 'center');
    ['인사', '주문 입력', '결제', '쟁반 담기'].forEach((s, i) => {
      text(c, (i < n ? '✔ ' : '· ') + s, 6, 34 + i * 22, 11, BROWN);
    });
  });
  const sheet = swapPic(board, 0.18, 0.25, 0, 0.0075, 0, 0, -Math.PI / 2);
  const pen = part(g, cyl(0.006, 0.006, 0.13, 6), '#1565c0', 0, 0, 0, { rz: 1.2, ry: 0.5, outline: false });
  const cust = person(g, LOOKS.a, BC.cust[0], BC.cust[1], 0);
  const custTray = trayMesh(g);
  const card = part(g, box(0.085, 0.003, 0.055), '#1e88e5', 0, 0, 0, { outline: false });
  let trainee: Fig | null = null;
  const crewFig = () => {
    if (!trainee) {
      trainee = person(g, LOOKS.crew, BC.trainee[0], BC.trainee[1], Math.PI / 2 + 0.35, 'female');
      capOn(trainee, RED);
    }
    return trainee;
  };
  const spots: Record<string, Spot> = { serveTray: standAt(g, 'ffTill'), fastFood_trainCrew: standAt(g, 'ffTrain') };
  spots['*'] = spots.serveTray;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const training = now === 'fastFood_trainCrew';
    setLit(heatLamp, now ? '#ffb74d' : '#6b4f33');
    at(tray, now === 'serveTray' ? P.tray : null);
    oB.visible = (n.burger ?? 0) > 0.8;
    oF.root.visible = (n.fries ?? 0) > 0.8;
    oD.root.visible = (n.drink ?? 0) > 0.8;
    at(hB, P.burgerH);
    at(hF.root, P.friesH);
    at(hD.root, P.drinkH);
    wB.visible = !P.burgerH && !((n.burger ?? 0) > 0.8);
    wF.root.visible = !P.friesH && !((n.fries ?? 0) > 0.8);
    wD.root.visible = !P.drinkH && !((n.drink ?? 0) > 0.8);
    at(slip, now === 'serveTray' ? P.slip : null);
    at(board, training ? P.board : null);
    if (training) {
      sheet.set(sheetTex(Math.round(n.tick ?? 0)));
      board.rotation.x = 0.5;
    }
    at(pen, training ? P.pen : null);
    // The screen: what's been keyed in.
    if (now) {
      const pg = n.page ?? 0;
      const wrong = (n.wrong ?? 0) > 0.5;
      posScreen.set(posLive((c) => {
        c.fillStyle = '#fff4e0';
        c.fillRect(0, 0, 192, 128);
        c.fillStyle = RED;
        c.fillRect(0, 0, 192, 22);
        text(c, wrong ? '잘못 눌렀어요' : training ? '연습 모드' : `주문 #${214 + (N?.b.n ?? 0) % 60}`, 96, 12, 13, '#ffffff', 'center');
        const lines = ['더블 세트  9,100', '콜라 변경      0', '치즈스틱  2,500'];
        lines.slice(0, Math.floor(pg + 0.3)).forEach((s, i) => text(c, s, 8, 40 + i * 20, 13, BROWN));
        text(c, (n.paid ?? 0) > 0.5 ? '결제 완료' : `합계 ${pg >= 3 ? '11,600' : '—'}`, 184, 112, 15, (n.paid ?? 0) > 0.5 ? '#2e7d32' : RED, 'right');
      }));
    } else posScreen.set(posIdle);
    setLit(termLed, (n.paid ?? 0) > 0.5 ? '#66ff99' : (n.cTap ?? 0) > 0.2 ? '#ffe082' : '#1a2f22');
    // The customer.
    const there = now === 'serveTray' ? n.cust ?? 0 : 0;
    comes(cust, there, BC.cust[0], BC.cust[1], -1.6, t);
    if (cust.root.visible) {
      const took = n.took ?? 0;
      cust.opts.lean = 0.15 * (n.cBow ?? 0) + 0.06;
      cust.opts.nod = 0.2 * (n.cBow ?? 0) + 0.12;
      const cx = cust.root.position.x;
      const cz = BC.cust[1];
      const tp = n.cTap ?? 0;
      cust.armR(tp > 0.05 ? vv([BC.terminal[0] + 0.0, BC.terminal[1] + 0.04 + 0.02 * (1 - tp), BC.terminal[2] - 0.04 * (1 - tp)]) : took > 0.05 || (P.tray && (P.tray[2] ?? 0) < -0.12) ? v3(BC.far[0] - 0.14, BC.far[1] + 0.05, Math.min(BC.far[2] - 0.05, cz + 0.42)) : null);
      cust.armL(took > 0.05 || (P.tray && (P.tray[2] ?? 0) < -0.12) ? v3(BC.far[0] + 0.14, BC.far[1] + 0.05, Math.min(BC.far[2] - 0.05, cz + 0.42)) : null);
      card.visible = tp > 0.05;
      if (card.visible) card.position.set(BC.terminal[0], BC.terminal[1] + 0.06 + 0.02 * (1 - tp), BC.terminal[2] - 0.04 * (1 - tp));
      custTray.visible = took > 0.7 && there > 0.02;
      if (custTray.visible) custTray.position.set(cx + (BC.far[0] - BC.cust[0]) * 0.4, 1.0, cz + 0.36);
    } else {
      custTray.visible = false;
      card.visible = false;
    }
    // The new crew member.
    if (training) {
      const f = crewFig();
      f.root.visible = true;
      const tap = (n.tTap ?? 0) > 0.5;
      f.armR(tap ? v3(BC.pos[0] - 0.06 + 0.05 * Math.sin(t * 5), BC.pos[1] + 0.01 * Math.sin(t * 9), BC.pos[2] + 0.04) : (n.wrong ?? 0) > 0.5 ? v3(BC.trainee[0] + 0.1, 1.42, BC.trainee[1] + 0.06) : null);
      f.armL(null);
      f.opts.nod = (n.tNod ?? 0) > 0.5 ? 0.15 + 0.12 * Math.abs(Math.sin(t * 3)) : tap ? 0.25 : 0.1;
      f.opts.lean = tap ? 0.14 : 0.03;
    } else if (trainee) trainee.root.visible = false;
  });
  out.work = marker(g, BC.pos[0], BC.top, 0.1);
}

// =============================================================================================
// 분리수거대 (trashStation).

function trashStation(g: THREE.Group, out: Built) {
  part(g, rbox(0.96, TS.top - 0.03, 0.82, 0.02), '#5d6d75', 0, (TS.top - 0.03) / 2, -0.05);
  part(g, rbox(0.98, 0.04, 0.86, 0.012), '#37474f', 0, TS.top - 0.015, -0.05);
  // Three flaps, each its own colour and sign, a funnel on top for what's left in cups.
  const LABELS: Array<[string, string]> = [['종이', '#1e88e5'], ['플라스틱', '#43a047'], ['일반', '#616161']];
  const flaps = TS.flaps.map(([x, y], i) => {
    part(g, box(0.25, 0.36, 0.015), BLACK, x, y, 0.365, { outline: false });
    const hinge = group(g, x, y + 0.17, 0.38);
    part(hinge, box(0.23, 0.34, 0.012), LABELS[i][1], 0, -0.17, 0);
    label(g, LABELS[i][0], 0.21, 0.07, x, y + 0.22, 0.375, LABELS[i][1], '#ffffff');
    return hinge;
  });
  part(g, cyl(0.1, 0.05, 0.08, 16), SS, TS.funnel[0], TS.top + 0.04, TS.funnel[2]);
  part(g, cyl(0.085, 0.085, 0.004, 16), '#263238', TS.funnel[0], TS.top + 0.082, TS.funnel[2], { outline: false });
  label(g, '남은 음료·얼음', 0.26, 0.05, TS.funnel[0] + 0.06, TS.top - 0.08, 0.375, '#263238', '#ffffff');
  // The sign up the back, trays stacked to the right.
  part(g, cyl(0.016, 0.016, 0.72, 8), BLACK, -0.42, TS.top + 0.36, -0.4);
  part(g, cyl(0.016, 0.016, 0.72, 8), BLACK, 0.42, TS.top + 0.36, -0.4);
  picture(g, painted('ffSortSign', 256, 128, (c) => {
    c.fillStyle = '#fff8e1';
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = RED;
    c.fillRect(0, 0, 256, 28);
    text(c, '다 드신 쟁반은 여기로!', 128, 15, 17, '#ffffff', 'center');
    text(c, '① 음료·얼음 비우기', 14, 48, 15, BROWN);
    text(c, '② 컵은 플라스틱으로', 14, 72, 15, BROWN);
    text(c, '③ 종이는 종이로', 14, 96, 15, BROWN);
    burgerPic(c, 214, 86, 0.65);
  }), 0.86, 0.42, 0, TS.top + 0.45, -0.385);
  const stack = Array.from({ length: 5 }, (_, i) => {
    const m = trayMesh(g, '#b0bec5');
    m.position.set(TS.stack[0], TS.top + 0.01 + i * 0.018, TS.stack[2]);
    return m;
  });
  // The tray in use, with a meal's leavings; what's taken off it.
  const tray = trayMesh(g, '#b0bec5');
  const cupOn = cupMesh(tray);
  place(cupOn.root, [0.08, 0.08, 0.04]);
  const wrapOn = group(tray);
  part(wrapOn, ball(0.05), CREAM, -0.08, 0.05, 0.03);
  part(wrapOn, cyl(0.05, 0.036, 0.08, 4), RED, -0.14, 0.06, -0.06, { rz: 1.3, outline: false });
  const wasteOn = group(tray);
  part(wasteOn, ball(0.028), '#90a4ae', 0.1, 0.035, -0.08);
  const cupH = cupMesh(g);
  const wrapH = group(g);
  part(wrapH, ball(0.05), CREAM, 0, 0, 0);
  const wasteH = group(g);
  part(wasteH, ball(0.028), '#90a4ae', 0, 0, 0);
  const cloth = clothMesh(g);
  const ice = puffs(g, 5, '#e1f5fe', 0.012);
  const spots: Record<string, Spot> = { clearTrays: standAt(g, 'ffSort') };
  spots['*'] = spots.clearTrays;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(tray, P.tray);
    cupOn.root.visible = (n.cupOn ?? 1) > 0.5;
    wrapOn.visible = (n.wrapOn ?? 1) > 0.5;
    wasteOn.visible = (n.wasteOn ?? 1) > 0.5;
    at(cupH.root, P.cupH);
    cupH.lid.visible = false;
    cupH.root.rotation.z = (n.tipCup ?? 0) * 2.2;
    at(wrapH, P.wrapH);
    at(wasteH, P.wasteH);
    at(cloth, P.cloth);
    flaps[0].rotation.x = -0.9 * (n.flap0 ?? 0);
    flaps[1].rotation.x = -0.9 * (n.flap1 ?? 0);
    flaps[2].rotation.x = -0.9 * (n.flap2 ?? 0);
    const on = Math.round(n.stacked ?? 3);
    stack.forEach((m, i) => (m.visible = i < on));
    ice(n.pour ?? 0, TS.funnel[0], TS.top + 0.2, TS.funnel[2], 0.02, t * 3, -0.13);
  });
  out.work = marker(g, -0.02, TS.top, 0.12);
}

// =============================================================================================
// 주문 키오스크 (ffKiosk).

const KIOSK_PAGES: Array<(c: CanvasRenderingContext2D) => void> = [
  // 0: touch to start.
  (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 128, 228);
    burgerPic(c, 64, 90, 1.2);
    text(c, BRAND, 64, 144, 20, '#ffffff', 'center');
    text(c, '화면을 눌러 주문', 64, 184, 12, MUSTARD, 'center');
  },
  // 1: here or to go.
  (c) => {
    c.fillStyle = '#fff4e0';
    c.fillRect(0, 0, 128, 228);
    text(c, '어디서 드세요?', 64, 28, 14, BROWN, 'center');
    c.fillStyle = RED;
    c.fillRect(14, 54, 100, 60);
    text(c, '매장', 64, 86, 20, '#ffffff', 'center');
    c.fillStyle = MUSTARD;
    c.fillRect(14, 126, 100, 60);
    text(c, '포장', 64, 158, 20, BROWN, 'center');
  },
];
function menuPage(c: CanvasRenderingContext2D, picked: number) {
  c.fillStyle = '#fff4e0';
  c.fillRect(0, 0, 128, 228);
  c.fillStyle = RED;
  c.fillRect(0, 0, 128, 22);
  text(c, '버거 · 세트 · 사이드', 64, 12, 10, '#ffffff', 'center');
  for (let i = 0; i < 6; i++) {
    const x = 6 + (i % 2) * 60;
    const y = 28 + Math.floor(i / 2) * 58;
    c.fillStyle = i === picked ? '#ffe082' : '#ffffff';
    c.fillRect(x, y, 56, 52);
    burgerPic(c, x + 28, y + 26, 0.5);
    text(c, MENU[0][1][i % 4][0].slice(0, 5), x + 28, y + 45, 8, BROWN, 'center');
  }
  c.fillStyle = picked >= 0 ? RED : '#bdbdbd';
  c.fillRect(0, 206, 128, 22);
  text(c, picked >= 0 ? '담기' : '메뉴를 고르세요', 64, 217, 11, '#ffffff', 'center');
}
function setPage(c: CanvasRenderingContext2D) {
  c.fillStyle = '#fff4e0';
  c.fillRect(0, 0, 128, 228);
  text(c, '세트로 할까요?', 64, 22, 13, BROWN, 'center');
  for (const [i, s] of ['단품', '세트 +2,200', '라지 세트 +2,900'].entries()) {
    c.fillStyle = i === 1 ? '#ffe082' : '#ffffff';
    c.fillRect(8, 46 + i * 54, 112, 46);
    text(c, s, 64, 70 + i * 54, 11, BROWN, 'center');
  }
}
function cartPage(c: CanvasRenderingContext2D) {
  c.fillStyle = '#fff4e0';
  c.fillRect(0, 0, 128, 228);
  text(c, '주문 내역', 64, 18, 13, BROWN, 'center');
  text(c, '불고기 세트', 8, 54, 11, BROWN);
  text(c, '7,600', 120, 54, 11, RED, 'right');
  c.fillStyle = RED;
  c.fillRect(8, 180, 112, 34);
  text(c, '결제하기', 64, 198, 14, '#ffffff', 'center');
}
function cardPage(c: CanvasRenderingContext2D, done: boolean) {
  c.fillStyle = done ? '#e8f5e9' : '#e3f2fd';
  c.fillRect(0, 0, 128, 228);
  text(c, done ? '결제 완료' : '카드를 넣어 주세요', 64, 60, 12, done ? '#2e7d32' : '#1565c0', 'center');
  text(c, done ? '주문번호' : '↓', 64, 98, 14, BROWN, 'center');
  if (done) text(c, '237', 64, 140, 40, RED, 'center');
}

function kiosk(g: THREE.Group, out: Built) {
  // A slim totem on a heavy foot, the screen tall, the slot, scanner and receipt below; a board on the wall behind.
  part(g, box(0.86, 2.0, 0.03), RED, 0, 1.0, -0.46, { outline: false });
  picture(g, painted('ffKioskBack', 128, 64, (c) => {
    c.fillStyle = RED;
    c.fillRect(0, 0, 128, 64);
    text(c, '여기서 주문', 64, 32, 20, '#ffffff', 'center');
  }), 0.78, 0.38, 0, 1.76, -0.443);
  part(g, rbox(0.58, 0.04, 0.42, 0.02), BLACK, 0, 0.02, KS.screen[2] - 0.1);
  part(g, rbox(0.46, 1.86, 0.1, 0.02), '#fafafa', 0, 0.96, KS.screen[2] - 0.08);
  part(g, box(0.46, 0.2, 0.102), RED, 0, 1.78, KS.screen[2] - 0.08, { outline: false });
  label(g, BRAND, 0.36, 0.1, 0, 1.78, KS.screen[2] - 0.028, RED, '#ffffff');
  part(g, rbox(0.4, 0.68, 0.015, 0.008), BLACK, 0, KS.screen[1], KS.screen[2] - 0.022);
  const screen = swapPic(g, 0.37, 0.64, 0, KS.screen[1], KS.screen[2] - 0.013);
  const idle = painted('ffKioskIdle', 128, 228, (c) => KIOSK_PAGES[0](c));
  screen.set(idle);
  const screenLive = live(128, 228);
  // The payment shelf.
  part(g, box(0.42, 0.13, 0.08), '#37474f', 0, 0.87, KS.screen[2] + 0.0);
  part(g, box(0.1, 0.012, 0.004), BLACK, KS.slot[0] - 0.02, 0.905, KS.screen[2] + 0.041, { outline: false });
  const led = ownLit(g, ball(0.008), '#1a2f22', KS.slot[0] + 0.05, 0.905, KS.screen[2] + 0.042);
  part(g, box(0.08, 0.008, 0.004), BLACK, KS.print[0], 0.84, KS.screen[2] + 0.041, { outline: false });
  part(g, cyl(0.03, 0.03, 0.01, 14), '#90a4ae', -0.02, 0.905, KS.screen[2] + 0.041, { rx: Math.PI / 2, outline: false });
  label(g, 'QR', 0.04, 0.02, -0.02, 0.866, KS.screen[2] + 0.041, '#37474f', '#ffffff');
  const cust = person(g, LOOKS.c, KS.cust[0], KS.cust[1], Math.PI);
  const slip = slipMesh(g);
  const custSlip = slipMesh(g);
  const card = part(g, box(0.085, 0.003, 0.055), '#7e57c2', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { ffHelpKiosk: standAt(g, 'ffKiosk') };
  spots['*'] = spots.ffHelpKiosk;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(slip, P.slip);
    const there = now ? n.cust ?? 0 : 0;
    comes(cust, there, KS.cust[0], KS.cust[1], -0.9, t);
    if (cust.root.visible) {
      const tap = (n.cTap ?? 0) > 0.5;
      const ca = n.cCard ?? 0;
      cust.opts.nod = 0.15 + (n.cBow ?? 0) * 0.3 + (tap ? 0.12 : 0);
      cust.opts.lean = 0.05 + (n.cBow ?? 0) * 0.16 + (tap ? 0.08 : 0);
      cust.head.rotation.y = (n.cLook ?? 1) < 0 ? 0.7 : 0;
      cust.armL(tap ? v3(-0.08 + 0.07 * Math.sin(t * 1.6), KS.screen[1] + 0.1 * Math.sin(t * 0.9), KS.screen[2] + 0.05) : ca > 0.05 ? v3(KS.slot[0] - 0.02, 0.92, KS.screen[2] + 0.06 + 0.1 * (1 - ca)) : null);
      card.visible = ca > 0.05;
      if (card.visible) card.position.set(KS.slot[0] - 0.02, 0.91, KS.screen[2] + 0.06 + 0.1 * (1 - ca));
      const took = (n.took ?? 0) > 0.5;
      cust.armR(took ? v3(KS.cust[0] - 0.1, 1.02, KS.cust[1] - 0.25) : null);
      custSlip.visible = took;
      if (took) custSlip.position.set(KS.cust[0] - 0.1, 1.03, KS.cust[1] - 0.25);
    } else {
      card.visible = false;
      custSlip.visible = false;
    }
    setLit(led, (n.cCard ?? 0) > 0.2 ? '#66ff99' : '#1a2f22');
    if (now) {
      const pg = Math.floor((n.page ?? 0) + 0.2);
      screen.set(screenLive((c) => {
        if (pg <= 1) KIOSK_PAGES[pg](c);
        else if (pg === 2) menuPage(c, -1);
        else if (pg === 3) menuPage(c, 2);
        else if (pg === 4) setPage(c);
        else if (pg === 5) cartPage(c);
        else cardPage(c, pg >= 7 || (n.slip ?? 0) > 0.05);
      }));
    } else screen.set(idle);
  });
  out.work = marker(g, 0, KS.screen[1], KS.screen[2]);
}

// =============================================================================================
// 픽업 카운터 (ffPickupCounter, 2 × 1): front to the kitchen; the number board faces out.

function pickupCounter(g: THREE.Group, out: Built, W: number) {
  counterBody(g, W, PK.top);
  picture(g, painted('ffPickupFace', 256, 64, (c) => {
    c.fillStyle = MUSTARD;
    c.fillRect(0, 0, 256, 64);
    text(c, '주문하신 메뉴 나오는 곳', 128, 33, 22, BROWN, 'center');
  }), 1.5, 0.32, 0, 0.44, -0.457, '#ffffff', Math.PI);
  // The board on a post, showing the numbers; a smaller one for the crew beside the bump pad.
  part(g, cyl(0.03, 0.03, 0.85, 10), BLACK, 0.2, PK.top + 0.42, 0.26);
  const board = group(g, 0.2, PK.top + 1.08, 0.26);
  part(board, rbox(1.44, 0.52, 0.06, 0.012), BLACK, 0, 0, 0);
  const faceOut = swapPic(board, 1.38, 0.46, 0, 0, -0.032, Math.PI);
  const faceIn = swapPic(board, 0.5, 0.17, 0, 0, 0.032);
  const paint = (c: CanvasRenderingContext2D, ready: number[], cooking: number[], flash: boolean) => {
    c.fillStyle = '#101214';
    c.fillRect(0, 0, 384, 128);
    c.fillStyle = '#33373b';
    c.fillRect(190, 0, 3, 128);
    text(c, '준비 중', 96, 15, 14, '#ffb74d', 'center');
    text(c, '완료', 288, 15, 14, '#66ff99', 'center');
    cooking.forEach((v, i) => text(c, String(v), 24 + (i % 3) * 58, 54 + Math.floor(i / 3) * 40, 26, '#eceff1'));
    ready.forEach((v, i) => text(c, String(v), 212 + (i % 2) * 86, 54 + Math.floor(i / 2) * 40, 32, i === ready.length - 1 && flash ? '#ffee58' : '#66ff99'));
  };
  const idleTex = painted('ffNumbersIdle', 384, 128, (c) => paint(c, [231, 234], [235, 236, 237, 238], false));
  faceOut.set(idleTex);
  faceIn.set(idleTex);
  const liveTex = live(384, 128);
  // The bump pad, the warm row, stapler, stack of flat bags.
  const pad = group(g, PK.bump[0], PK.bump[1], PK.bump[2]);
  pad.rotation.x = -0.35;
  part(pad, rbox(0.24, 0.17, 0.025, 0.01), BLACK, 0, 0, 0);
  const padScreen = swapPic(pad, 0.22, 0.15, 0, 0, 0.014);
  part(g, cyl(0.012, 0.018, 0.15, 8), BLACK, PK.bump[0], PK.top + 0.075, PK.bump[2] - 0.04, { outline: false });
  const padIdle = painted('ffBumpIdle', 128, 88, (c) => {
    c.fillStyle = '#1b2733';
    c.fillRect(0, 0, 128, 88);
    text(c, '주문 완료 처리', 64, 14, 12, '#90caf9', 'center');
    c.fillStyle = '#2e7d32';
    c.fillRect(12, 30, 104, 44);
    text(c, '#235 완료', 64, 52, 16, '#ffffff', 'center');
  });
  const padDone = painted('ffBumpDone', 128, 88, (c) => {
    c.fillStyle = '#1b2733';
    c.fillRect(0, 0, 128, 88);
    text(c, '다음 주문', 64, 14, 12, '#90caf9', 'center');
    c.fillStyle = '#546e7a';
    c.fillRect(12, 30, 104, 44);
    text(c, '#236 조리 중', 64, 52, 14, '#ffffff', 'center');
  });
  padScreen.set(padIdle);
  PK.bags.forEach(([x, z], i) => {
    if (i === 0) place(wrappedMesh(g), [x, PK.top, z]);
    else if (i === 1) {
      const f = friesMesh(g);
      place(f.root, [x, PK.top, z]);
    } else place(cupMesh(g).root, [x, PK.top + 0.06, z]);
  });
  part(g, box(0.28, 0.02, 0.2), KRAFT, 0.1, PK.top + 0.012, -0.24);
  part(g, box(0.28, 0.02, 0.2), shade(KRAFT, 0.95), 0.1, PK.top + 0.032, -0.24);
  const bag = bagMesh(g);
  const stapler = group(g);
  part(stapler, rbox(0.05, 0.03, 0.12, 0.01), BLACK, 0, 0, 0);
  const staplerHome: V = [-0.32, PK.top + 0.02, 0.26];
  const cust = person(g, LOOKS.b, PK.cust[0], PK.cust[1], 0);
  const custSlip = slipMesh(g);
  const custBag = bagMesh(g);
  const spots: Record<string, Spot> = { ffCallOrder: standAt(g, 'ffCall') };
  spots['*'] = spots.ffCallOrder;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(bag.root, P.bagH);
    bag.root.scale.y = Math.max(0.35, 0.35 + 0.65 * Math.min(1, (n.fold ?? 1) + (n.filled ?? 1)));
    bag.top.visible = (n.shut ?? 1) > 0.5;
    at(stapler, P.stapler, staplerHome);
    const there = now ? n.cust ?? 0 : 0;
    comes(cust, there, PK.cust[0], PK.cust[1], -1.5, t);
    if (cust.root.visible) {
      cust.opts.lean = 0.06 + 0.16 * (n.cBow ?? 0) + (n.cReach ?? 0) * 0.12;
      cust.opts.nod = 0.1 + 0.25 * (n.cBow ?? 0);
      const r = n.cReceipt ?? 0;
      const reach = n.cReach ?? 0;
      const took = (n.took ?? 0) > 0.5;
      cust.armR(r > 0.05 ? v3(PK.cust[0] - 0.05, 1.05 + 0.25 * r, PK.cust[1] + 0.32) : reach > 0.05 ? vv([PK.out[0], PK.out[1] + 0.26, PK.out[2] - 0.1]) : took ? v3(cust.root.position.x - 0.1, 0.98, PK.cust[1] + 0.22) : null);
      cust.armL(null);
      custSlip.visible = r > 0.05;
      if (custSlip.visible) custSlip.position.set(PK.cust[0] - 0.05, 1.08 + 0.25 * r, PK.cust[1] + 0.34);
      custBag.root.visible = took;
      if (took) custBag.root.position.set(cust.root.position.x - 0.1, 0.72, PK.cust[1] + 0.24);
    } else {
      custSlip.visible = false;
      custBag.root.visible = false;
    }
    if (now) {
      const bumped = (n.bumped ?? 0) > 0.5;
      const flash = (n.called ?? 0) > 0.5 && Math.floor(t * 4) % 2 === 0;
      const tex = liveTex((c) => paint(c, bumped ? [231, 234, 235] : [231, 234], bumped ? [236, 237, 238] : [235, 236, 237, 238], flash || (bumped && (n.cust ?? 0) < 0.1)));
      faceOut.set(tex);
      faceIn.set(tex);
      padScreen.set(bumped ? padDone : padIdle);
    } else {
      faceOut.set(idleTex);
      faceIn.set(idleTex);
      padScreen.set(padIdle);
    }
  });
  out.work = marker(g, PK.bag[0], PK.top, 0.14);
}

// =============================================================================================
// 음료 디스펜서 (ffDrinkTower, 2 × 1).

function drinkTower(g: THREE.Group, out: Built) {
  part(g, rbox(1.96, DT.deck - 0.03, 0.82, 0.015), SS, 0, (DT.deck - 0.03) / 2, -0.05);
  part(g, box(1.98, 0.03, 0.86), SS_D, 0, DT.deck - 0.015, -0.05);
  for (const x of [-0.5, 0, 0.5]) part(g, rbox(0.46, 0.68, 0.012, 0.005), shade(SS, 1.08), x, 0.42, 0.37);
  part(g, box(1.96, 0.06, 0.03), BLACK, 0, 0.03, 0.34, { outline: false });
  // The soda head: a tower over the right, its levers and nozzles along a drip tray.
  const x0 = 0.36;
  part(g, rbox(1.08, 0.72, 0.4, 0.03), '#eceff1', x0, DT.deck + 0.46, -0.16);
  picture(g, painted('ffSodaFace', 256, 96, (c) => {
    const grad = c.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, RED);
    grad.addColorStop(1, RED_D);
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 96);
    text(c, '시원하게 한 잔', 128, 48, 30, '#ffffff', 'center');
  }), 1.02, 0.28, x0, DT.deck + 0.68, 0.046);
  const FLAVOURS: Array<[string, string]> = [['콜라', '#4e2a1e'], ['제로', '#212121'], ['사이다', '#a5d6a7'], ['오렌지', '#fb8c00'], ['아이스티', '#a1662f']];
  DT.nozzles.forEach((x, i) => {
    part(g, rbox(0.13, 0.06, 0.1, 0.01), '#fafafa', x, DT.fillY + 0.34, DT.z - 0.1);
    label(g, FLAVOURS[i][0], 0.13, 0.05, x, DT.fillY + 0.34, DT.z - 0.049, FLAVOURS[i][1], '#ffffff');
    part(g, cyl(0.016, 0.022, 0.05, 10), '#cfd8dc', x, DT.fillY + 0.27, DT.z - 0.06, { outline: false });
    part(g, box(0.02, 0.11, 0.015), BLACK, x, DT.fillY + 0.21, DT.z - 0.03, { rx: 0.2 });
  });
  part(g, box(0.92, 0.03, 0.26), '#37474f', x0 - 0.0, DT.deck + 0.015, DT.z - 0.02);
  for (let i = 0; i < 12; i++) part(g, box(0.056, 0.004, 0.22), SS, x0 - 0.42 + i * 0.076, DT.deck + 0.032, DT.z - 0.02, { outline: false });
  const dripClean = part(g, box(0.9, 0.002, 0.24), '#6d4c41', x0, DT.deck + 0.036, DT.z - 0.02, { outline: false });
  // The ice bin, its chute lever; the cup sleeves and lids at the left.
  part(g, rbox(0.42, 0.56, 0.4, 0.02), '#cfd8dc', -0.28, DT.deck + 0.3, -0.18);
  label(g, '얼음', 0.2, 0.08, -0.28, DT.deck + 0.48, 0.022, '#1565c0', '#ffffff');
  part(g, box(0.1, 0.05, 0.12), SS_D, DT.ice[0], DT.ice[1], DT.ice[2] - 0.05);
  const iceLever = group(g, DT.ice[0], DT.ice[1] - 0.02, DT.ice[2] + 0.02);
  part(iceLever, box(0.02, 0.12, 0.012), BLACK, 0, -0.04, 0);
  for (const [i, s] of [0, 1, 2].entries()) {
    const x = DT.cups[0] - 0.14 + i * 0.14;
    const r = 0.038 + s * 0.006;
    part(g, cyl(r + 0.002, r + 0.002, 0.56, 12), '#eceff1', x, DT.cups[1] + 0.02, DT.cups[2] - 0.1);
    part(g, cyl(r, r - 0.01, 0.12, 12), PAPER, x, DT.cups[1] - 0.3, DT.cups[2] - 0.1, { outline: false });
    label(g, ['S', 'M', 'L'][i], 0.05, 0.05, x, DT.cups[1] + 0.15, DT.cups[2] - 0.1 + r + 0.003, RED, '#ffffff');
  }
  for (let i = 0; i < 4; i++) part(g, cyl(0.044, 0.044, 0.01, 12), '#fafafa', DT.lids[0] - 0.12, DT.deck + 0.006 + i * 0.011, DT.lids[2]);
  for (let i = 0; i < 7; i++) part(g, cyl(0.004, 0.004, 0.2, 6), RED, DT.lids[0] - 0.26 + i * 0.005, DT.deck + 0.11, DT.lids[2] + 0.02 - (i % 2) * 0.012, { rz: (i - 3) * 0.05, outline: false });
  // The carrier, its two done cups; the cup in hand with what's in it.
  part(g, box(0.28, 0.05, 0.16), KRAFT, DT.carrier[0], DT.deck + 0.025, DT.carrier[2]);
  const done1 = cupMesh(g);
  const done2 = cupMesh(g);
  place(done1.root, add3(DT.carrier, -0.05, 0.02, 0));
  place(done2.root, add3(DT.carrier, 0.06, 0.02, 0));
  const cup = group(g);
  part(cup, cyl(0.041, 0.031, 0.15, 12), '#ffffff', 0, 0.02, 0);
  const fill = part(cup, cyl(0.036, 0.03, 1, 12), '#4e2a1e', 0, 0, 0, { outline: false });
  const foam = part(cup, cyl(0.036, 0.036, 0.018, 12), '#f7efe0', 0, 0, 0, { outline: false });
  const iceBits = group(cup);
  for (let i = 0; i < 5; i++) part(iceBits, box(0.018, 0.018, 0.018), '#e1f5fe', Math.sin(i * 2) * 0.016, -0.015 + (i % 3) * 0.018, Math.cos(i * 2) * 0.016, { outline: false });
  const lid = group(cup);
  part(lid, cyl(0.043, 0.043, 0.012, 12), '#fafafa', 0, 0.1, 0, { outline: false });
  const straw = part(cup, cyl(0.004, 0.004, 0.11, 6), RED, 0.012, 0.16, 0, { outline: false });
  const iceFall = puffs(g, 5, '#e1f5fe', 0.012);
  const stream = ownLit(g, cyl(0.009, 0.009, 1, 8), '#4e2a1e', 0, 0, 0);
  const cloth = clothMesh(g);
  const spots: Record<string, Spot> = { ffPourDrinks: standAt(g, 'ffPour') };
  spots['*'] = spots.ffPourDrinks;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(cup, P.cup);
    if (P.cup) {
      const lv = n.level ?? 0;
      fill.visible = lv > 0.02;
      fill.scale.y = Math.max(0.001, lv * 0.14);
      fill.position.y = -0.05 + (lv * 0.14) / 2;
      foam.visible = (n.foam ?? 0) > 0.1 && lv > 0.1;
      foam.position.y = -0.05 + lv * 0.14 + 0.005;
      foam.scale.y = 0.5 + (n.foam ?? 0) * 1.5;
      iceBits.visible = (n.ice ?? 0) > 0.2;
      lid.visible = (n.lidded ?? 0) > 0.5;
      straw.visible = (n.lidded ?? 0) > 0.8 && !!n.straw;
    }
    done1.root.visible = (n.done ?? 0) >= 0.9;
    done2.root.visible = (n.done ?? 0) >= 1.9;
    iceLever.rotation.x = -0.6 * (n.iceOn ?? 0);
    iceFall(n.iceOn ?? 0, DT.ice[0], DT.ice[1] - 0.04, DT.ice[2] + 0.04, 0.02, t * 3, -0.16);
    const st = n.stream ?? 0;
    stream.visible = st > 0.1;
    if (stream.visible) {
      const y0 = DT.fillY + 0.24;
      const y1 = DT.fillY + (n.level ?? 0) * 0.14 - 0.03;
      stream.position.set(DT.nozzles[1], (y0 + y1) / 2, DT.z - 0.02);
      stream.scale.set(0.8 + 0.2 * Math.sin(t * 40), y0 - y1, 0.8 + 0.2 * Math.sin(t * 40));
    }
    dripClean.visible = (n.drip ?? 0) < 0.5;
    at(cloth, P.cloth);
  });
  out.work = marker(g, DT.nozzles[1], DT.deck + 0.05, DT.z);
}
function add3(a: V, x: number, y: number, z: number): V {
  return [a[0] + x, a[1] + y, a[2] + z];
}

// =============================================================================================
// 드라이브스루 창 (ffDriveWindow, 2 × 1): its back against the outside wall. No hole in the wall: the window
// has a picture of the lane behind it, a car drawn along it, and the driver's arm comes in through the opening.

function driveWindow(g: THREE.Group, out: Built) {
  const wx = DV.winX;
  const SILL = DV.sill;
  const wW = 1.12;
  const wH = 0.9;
  // Below and round the opening: a counter with shelves, wall panels above and to the side.
  part(g, rbox(1.96, SILL - 0.04, 0.5, 0.015), SS, 0, (SILL - 0.04) / 2, -0.2);
  part(g, rbox(1.98, 0.04, 0.76, 0.012), CREAM, 0, SILL - 0.02, -0.08);
  part(g, box(1.96, 0.05, 0.03), BLACK, 0, 0.025, 0.06, { outline: false });
  const backZ = -0.34;
  part(g, box(1.98, 2.4, 0.08), '#efe6d6', 0, 1.2, -0.44, { outline: false });
  const frameZ = -0.14;
  const ROOF = SILL + wH;
  part(g, box(wx + 1.0 - wW / 2, 2.4 - SILL, 0.08), '#efe6d6', (wx + wW / 2 + 1.0) / 2, (2.4 + SILL) / 2, frameZ - 0.02, { outline: false });
  part(g, box(1.0 + wx - wW / 2, 2.4 - SILL, 0.08), '#efe6d6', (wx - wW / 2 - 1.0) / 2, (2.4 + SILL) / 2, frameZ - 0.02, { outline: false });
  part(g, box(wW, 2.4 - ROOF, 0.08), RED, wx, (2.4 + ROOF) / 2, frameZ - 0.02, { outline: false });
  label(g, '드라이브스루', 0.8, 0.16, wx, ROOF + 0.2, frameZ + 0.022, RED, '#ffffff');
  // The frame, the sliding pane, the lane behind.
  for (const y of [SILL + 0.01, ROOF]) part(g, box(wW + 0.06, 0.04, 0.1), BLACK, wx, y, frameZ);
  for (const x of [-1, 1]) part(g, box(0.04, wH, 0.1), BLACK, wx + (x * wW) / 2, SILL + wH / 2, frameZ);
  const lane = swapPic(g, wW, wH, wx, SILL + wH / 2, backZ);
  const laneIdle = painted('ffLane', 256, 200, (c) => paintLane(c, 0, 0, false));
  lane.set(laneIdle);
  const laneLive = live(256, 200);
  const paneMat = new THREE.MeshBasicMaterial({ color: '#bfe3ee', transparent: true, opacity: 0.28, depthWrite: false });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(wW / 2, wH), paneMat);
  pane.userData.ownGeometry = pane.userData.ownMaterial = true;
  pane.position.set(wx - wW / 4, SILL + wH / 2, frameZ - 0.015);
  g.add(pane);
  const handle = part(g, box(0.02, 0.14, 0.03), BLACK, 0, SILL + 0.4, frameZ, { outline: false });
  // The till and its stand, a bag waiting, a drink, the headset on its hook and a bell.
  part(g, cyl(0.012, 0.018, 0.2, 8), BLACK, DV.pos[0], SILL + 0.1, DV.pos[2] - 0.03, { outline: false });
  const pos = group(g, DV.pos[0], DV.pos[1], DV.pos[2]);
  pos.rotation.x = -0.25;
  part(pos, rbox(0.32, 0.22, 0.03, 0.012), BLACK, 0, 0, 0);
  const posScreen = swapPic(pos, 0.3, 0.2, 0, 0, 0.017);
  const posIdle = painted('ffDtIdle', 192, 128, (c) => {
    c.fillStyle = '#fff4e0';
    c.fillRect(0, 0, 192, 128);
    text(c, '드라이브스루 대기 중', 96, 64, 13, BROWN, 'center');
  });
  posScreen.set(posIdle);
  const posLive = live(192, 128);
  part(g, rbox(0.1, 0.05, 0.16, 0.012), BLACK, DV.term[0], DV.term[1], DV.term[2], { rx: 0.4 });
  const termLed = ownLit(g, ball(0.008), '#1a2f22', DV.term[0], DV.term[1] + 0.03, DV.term[2] - 0.02);
  const bag = bagMesh(g);
  const shelfCup = cupMesh(g);
  place(shelfCup.root, [DV.bag[0] - 0.2, SILL + 0.06, DV.bag[2]]);
  part(g, box(0.04, 0.04, 0.02), BLACK, DV.hanger[0], DV.hanger[1] + 0.02, DV.hanger[2] - 0.04, { outline: false });
  const hs = group(g);
  part(hs, box(0.02, 0.02, 0.16), BLACK, 0, 0.07, 0, { outline: false });
  part(hs, cyl(0.03, 0.03, 0.02, 10), BLACK, 0.08, 0, 0, { rz: Math.PI / 2, outline: false });
  // The driver's arm and hand through the opening.
  const armG = group(g);
  const armLimb = limb(armG, 0.036, '#546e7a');
  const hand = part(armG, ball(0.038), SKIN, 0, 0, 0, { outline: false });
  const armCard = part(armG, box(0.085, 0.003, 0.055), '#1e88e5', 0, 0, 0, { outline: false });
  const armBag = bagMesh(armG);
  armG.visible = false;
  const cardH = part(g, box(0.085, 0.003, 0.055), '#1e88e5', 0, 0, 0, { outline: false });
  const cupH = cupMesh(g);
  const speak = ownLit(g, ball(0.01), '#1a2f22', DV.pos[0] + 0.14, DV.pos[1] + 0.12, DV.pos[2] + 0.02);
  const from = v3(wx - 0.05, SILL + 0.14, backZ + 0.02);
  const to = new THREE.Vector3();
  const spots: Record<string, Spot> = { ffDriveOrder: standAt(g, 'ffDrive') };
  spots['*'] = spots.ffDriveOrder;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    pane.position.x = wx - wW / 4 + (n.open ?? 0) * (wW / 2 - 0.02);
    handle.position.x = wx - wW / 2 + 0.06 + (n.open ?? 0) * (wW / 2 - 0.02);
    at(bag.root, P.bagH, DV.bag);
    bag.root.visible = !!P.bagH || !((n.hasBag ?? 0) > 0.5);
    at(hs, P.hs, (n.headset ?? 0) > 0.5 ? undefined : DV.hanger);
    at(cardH, P.cardH);
    at(cupH.root, P.cupH);
    shelfCup.root.visible = !P.cupH && !((n.arm ?? 0) < 0.6 && (n.hasBag ?? 0) > 0.5);
    setLit(speak, (n.speak ?? 0) > 0.5 ? '#66ff99' : '#1a2f22');
    setLit(termLed, (n.page ?? 0) >= 2.5 ? '#66ff99' : '#1a2f22');
    const carIn = n.car ?? 0;
    if (now) {
      lane.set(laneLive((c) => paintLane(c, carIn, t, true)));
      const pg = Math.floor((n.page ?? 0) + 0.2);
      posScreen.set(posLive((c) => {
        c.fillStyle = '#fff4e0';
        c.fillRect(0, 0, 192, 128);
        c.fillStyle = RED;
        c.fillRect(0, 0, 192, 22);
        text(c, '드라이브스루 #58', 96, 12, 12, '#ffffff', 'center');
        ['치킨 세트 8,100', '콜라 라지 +700'].slice(0, Math.min(2, pg + 1)).forEach((s, i) => text(c, s, 8, 42 + i * 20, 12, BROWN));
        text(c, pg >= 3 ? '결제 완료' : pg >= 2 ? '카드 대기' : '주문 받는 중', 184, 112, 13, pg >= 3 ? '#2e7d32' : RED, 'right');
      }));
    } else {
      lane.set(laneIdle);
      posScreen.set(posIdle);
    }
    const a = n.arm ?? 0;
    armG.visible = a > 0.02;
    if (armG.visible) {
      to.set(DV.out[0], DV.out[1] + 0.02, DV.out[2]).lerp(from, 1 - a);
      armLimb(from, to);
      hand.position.copy(to);
      armCard.visible = (n.armCard ?? 0) > 0.5;
      armCard.position.copy(to).add(tmp.set(0.01, -0.03, 0.04));
      armBag.root.visible = (n.armBag ?? 0) > 0.5;
      armBag.root.position.copy(to).add(tmp.set(0, -0.26, 0));
    }
  });
  out.work = marker(g, wx, SILL + 0.1, -0.1);
}
/** Through the window: the lane, a car drawing up, its driver. */
function paintLane(c: CanvasRenderingContext2D, car: number, t: number, moving: boolean) {
  const sky = c.createLinearGradient(0, 0, 0, 120);
  sky.addColorStop(0, '#b6dcf3');
  sky.addColorStop(1, '#eaf5fb');
  c.fillStyle = sky;
  c.fillRect(0, 0, 256, 200);
  c.fillStyle = '#a5d6a7';
  c.fillRect(0, 96, 256, 22);
  c.fillStyle = '#6d7378';
  c.fillRect(0, 118, 256, 82);
  c.fillStyle = '#f5f5f5';
  for (let i = 0; i < 6; i++) c.fillRect(i * 52 + 6, 186, 28, 5);
  if (car <= 0.01) return;
  const x = -220 + 240 * Math.min(1, car);
  const bob = moving ? Math.sin(t * 12) * (car < 0.98 ? 1 : 0) : 0;
  c.fillStyle = '#2f5d8a';
  c.beginPath();
  c.roundRect(x, 88 + bob, 300, 90, 18);
  c.fill();
  c.fillStyle = '#254b70';
  c.beginPath();
  c.roundRect(x + 56, 28 + bob, 190, 74, 22);
  c.fill();
  c.fillStyle = '#d7eaf4';
  c.beginPath();
  c.roundRect(x + 72, 40 + bob, 160, 56, 10);
  c.fill();
  // The driver in the open window, turned this way.
  c.fillStyle = '#f1c9a5';
  c.beginPath();
  c.arc(x + 152, 64 + bob, 18, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2b1b10';
  c.beginPath();
  c.arc(x + 152, 57 + bob, 18, Math.PI, 0);
  c.fill();
  c.fillStyle = '#546e7a';
  c.fillRect(x + 128, 82 + bob, 48, 16);
  c.fillStyle = '#11161b';
  c.beginPath();
  c.arc(x + 54, 178, 26, 0, Math.PI * 2);
  c.arc(x + 246, 178, 26, 0, Math.PI * 2);
  c.fill();
}

// =============================================================================================
// 라이더 선반 (ffRiderShelf, 2 × 1).

function riderShelf(g: THREE.Group, out: Built) {
  // Three tiers of numbered cubbies, a bench at the front, tablets on top; a sign for those who come.
  part(g, box(1.96, 0.9, 0.5), '#eceff1', 0, 0.45, -0.2);
  part(g, rbox(1.98, 0.04, 0.74, 0.012), MUSTARD, 0, 0.9, -0.1);
  part(g, box(1.96, 0.06, 0.03), BLACK, 0, 0.03, 0.05, { outline: false });
  const shelfX = 0.3;
  part(g, box(1.26, 0.8, 0.02), '#cfd8dc', shelfX, 1.3, -0.3);
  for (const y of [1.14, 1.5]) part(g, box(1.28, 0.02, 0.4), SS, shelfX, y - 0.015, -0.12);
  for (const dx of [-0.63, -0.21, 0.21, 0.63]) part(g, box(0.02, 0.76, 0.4), SS, shelfX + dx, 1.3, -0.12);
  [[-0.42, 1], [0, 2], [0.42, 3]].forEach(([dx, no]) => label(g, `${no}`, 0.1, 0.07, shelfX + dx, 1.17 - 0.09, 0.075, '#263238', '#ffffff'));
  [[-0.42, 4], [0, 5], [0.42, 6]].forEach(([dx, no]) => label(g, `${no}`, 0.1, 0.07, shelfX + dx, 1.45, 0.075, '#263238', '#ffffff'));
  part(g, box(1.28, 0.16, 0.42), RED, shelfX, 1.78, -0.12);
  label(g, '라이더 픽업', 0.8, 0.13, shelfX, 1.78, 0.095, RED, '#ffffff');
  const parked = [bagMesh(g), bagMesh(g)];
  place(parked[0].root, [shelfX - 0.42, 1.14, -0.1]);
  place(parked[1].root, [shelfX, 1.5, -0.1]);
  // The tablets: each a different made-up app, one lit and ringing.
  const tabletTex = (name: string, col: string, ringing: boolean) =>
    painted(`ffTablet${name}${ringing}`, 128, 88, (c) => {
      c.fillStyle = ringing ? col : '#eceff1';
      c.fillRect(0, 0, 128, 88);
      text(c, name, 64, 18, 14, ringing ? '#ffffff' : BROWN, 'center');
      text(c, ringing ? '새 주문!' : '대기', 64, 54, ringing ? 20 : 14, ringing ? '#ffffff' : '#78909c', 'center');
    });
  const APPS: Array<[string, string]> = [['배달콕', '#00acc1'], ['쏙배달', '#f4511e']];
  const tabs = APPS.map(([name, col], i) => {
    const tab = group(g, RS.tablet[0] + (i - 0.5) * 0.3, RS.tablet[1], RS.tablet[2] - 0.05);
    tab.rotation.x = -0.25;
    part(tab, rbox(0.26, 0.18, 0.018, 0.01), BLACK, 0, 0, 0);
    const pic = swapPic(tab, 0.24, 0.16, 0, 0, 0.01);
    pic.set(tabletTex(name, col, false));
    part(g, cyl(0.012, 0.016, 0.3, 8), BLACK, RS.tablet[0] + (i - 0.5) * 0.3, 1.12, RS.tablet[2] - 0.08, { outline: false });
    return { pic, name, col };
  });
  // The sealing tape, sticker roll; the bag in hand; and the rider.
  part(g, cyl(0.05, 0.05, 0.04, 12), '#fafafa', RS.stickers[0], 0.94, RS.stickers[2]);
  part(g, cyl(0.022, 0.022, 0.045, 8), BLACK, RS.stickers[0], 0.94, RS.stickers[2], { outline: false });
  part(g, box(0.22, 0.05, 0.2), KRAFT, -0.72, 0.945, 0.08);
  const bag = bagMesh(g);
  const seal = part(bag.root, box(0.06, 0.05, 0.003), RED, 0, 0.225, 0.052, { outline: false });
  const sticker = part(bag.root, box(0.08, 0.05, 0.002), '#ffffff', 0, 0.14, 0.062, { outline: false });
  const shelved = bagMesh(g);
  place(shelved.root, RS.cubby);
  const rider = person(g, LOOKS.rider, RS.rider[0], RS.rider[1], -Math.PI / 2, 'male');
  helmetOn(rider);
  // The delivery box on their back, the phone in their hand, the bag they take.
  part(rider.root, rbox(0.42, 0.42, 0.28, 0.03), RED, 0, 1.1, -0.26);
  label(rider.root, '딜리버리', 0.3, 0.09, 0, 1.12, -0.402, RED, '#ffffff', Math.PI);
  const phone = group(g);
  part(phone, rbox(0.07, 0.13, 0.01, 0.005), BLACK, 0, 0, 0);
  picture(phone, painted('ffRiderPhone', 64, 112, (c) => {
    c.fillStyle = '#e0f7fa';
    c.fillRect(0, 0, 64, 112);
    text(c, '픽업', 32, 22, 12, '#00838f', 'center');
    text(c, '237', 32, 62, 22, RED, 'center');
  }), 0.06, 0.12, 0, 0, 0.0065);
  const riderBag = bagMesh(g);
  const spots: Record<string, Spot> = { ffRiderHandoff: standAt(g, 'ffRider') };
  spots['*'] = spots.ffRiderHandoff;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const ring = (n.ring ?? 0) > 0.5 && Math.floor(t * 5) % 2 === 0;
    const accepted = (n.tablet ?? 0) > 0.5;
    tabs[0].pic.set(tabletTex(tabs[0].name, tabs[0].col, ring || (!!now && !accepted && (n.ring ?? 0) > 0.5)));
    tabs[1].pic.set(tabletTex(tabs[1].name, tabs[1].col, false));
    at(bag.root, P.bagH);
    seal.visible = (n.sealed ?? 0) > 0.5;
    sticker.visible = (n.sticker ?? 0) > 0.5;
    shelved.root.visible = (n.shelved ?? 0) > 0.5;
    const there = now ? n.rider ?? 0 : 0;
    comes(rider, there, RS.rider[0], RS.rider[1], 1.0, t);
    if (rider.root.visible) {
      const pho = n.rPhone ?? 0;
      const took = (n.took ?? 0) > 0.5;
      const rx = rider.root.position.x;
      const hold = v3(rx - 0.36, 1.1 + 0.1 * pho, RS.rider[1] + 0.06);
      rider.armR(pho > 0.05 ? hold : took ? v3(rx - 0.3, 0.98, RS.rider[1] - 0.14) : (P.bagH && P.bagH[0] > 0.6) ? v3(P.bagH[0] + 0.04, P.bagH[1] + 0.27, P.bagH[2]) : null);
      rider.armL((n.rWave ?? 0) > 0.1 ? v3(rx - 0.1, 1.72, RS.rider[1] + 0.16) : null);
      rider.opts.nod = 0.1 + 0.16 * (n.rWave ?? 0);
      phone.visible = pho > 0.05;
      if (phone.visible) {
        phone.position.copy(hold).add(tmp.set(-0.02, 0.04, 0));
        phone.rotation.y = -Math.PI / 2;
      }
      riderBag.root.visible = took;
      if (took) riderBag.root.position.set(rx - 0.3, 0.7, RS.rider[1] - 0.14);
    } else {
      phone.visible = false;
      riderBag.root.visible = false;
    }
  });
  out.work = marker(g, RS.bench[0], 0.95, RS.bench[2]);
}

// =============================================================================================
// 매장 테이블 (ffTrayTable, 2 × 1): placed with its front to the aisle, the chairs on its far side.

function trayTable(g: THREE.Group, out: Built) {
  part(g, rbox(1.76, 0.04, 0.82, 0.02), CREAM, 0, TT.top - 0.02, 0);
  part(g, box(1.72, 0.012, 0.03), RED, 0, TT.top - 0.044, 0.41, { outline: false });
  part(g, box(1.72, 0.012, 0.03), RED, 0, TT.top - 0.044, -0.41, { outline: false });
  for (const x of [-0.55, 0.55]) {
    part(g, cyl(0.04, 0.04, TT.top - 0.08, 10), BLACK, x, (TT.top - 0.08) / 2 + 0.03, 0);
    part(g, cyl(0.2, 0.22, 0.03, 16), BLACK, x, 0.015, 0);
  }
  // The caddy, a menu tent and a table number.
  part(g, rbox(0.18, 0.09, 0.09, 0.01), BLACK, 0.6, TT.top + 0.045, -0.26);
  for (let i = 0; i < 3; i++) part(g, box(0.05, 0.08, 0.04), ['#fafafa', '#fafafa', RED][i], 0.54 + i * 0.06, TT.top + 0.13, -0.26, { outline: false });
  picture(g, painted('ffTent', 64, 96, (c) => {
    c.fillStyle = MUSTARD;
    c.fillRect(0, 0, 64, 96);
    burgerPic(c, 32, 40, 0.7);
    text(c, '이달의 버거', 32, 76, 9, BROWN, 'center');
  }), 0.1, 0.15, 0.24, TT.top + 0.08, -0.24);
  // What someone's left.
  const tray = trayMesh(g, '#b0bec5');
  const wrapper = part(tray, ball(0.05), CREAM, -0.09, 0.05, 0.02);
  const cartonM = part(tray, cyl(0.05, 0.036, 0.08, 4), RED, 0.08, 0.05, -0.06, { rz: 1.2 });
  const cupT = cupMesh(tray);
  place(cupT.root, [0.13, 0.08, 0.06]);
  const crumbs = group(g);
  for (let i = 0; i < 12; i++) part(crumbs, ball(0.009), i % 3 ? '#e0b070' : '#f4c54d', -0.66 + ((i * 37) % 13) * 0.11, TT.top + 0.003, -0.02 + ((i * 53) % 11) * 0.04, { outline: false }).scale.y = 0.4;
  const stray = part(g, box(0.14, 0.004, 0.11), '#fafafa', -0.54, TT.top + 0.003, 0.2, { outline: false });
  const wetMat = new THREE.MeshBasicMaterial({ color: '#d5ecf5', transparent: true, opacity: 0, depthWrite: false });
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.74), wetMat);
  wet.userData.ownGeometry = wet.userData.ownMaterial = true;
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, TT.top + 0.002, 0);
  g.add(wet);
  const bottle = group(g);
  part(bottle, cyl(0.03, 0.034, 0.13, 10), '#90caf9', 0, 0.065, 0);
  part(bottle, box(0.03, 0.04, 0.08), '#1565c0', 0, 0.15, 0.015, { outline: false });
  const cloth = clothMesh(g);
  const mist = puffs(g, 5, '#e3f2fd', 0.02);
  const spots: Record<string, Spot> = { ffWipeTable: standAt(g, 'ffWipe') };
  spots['*'] = spots.ffWipeTable;
  // Whichever table it is, some are left in a state and some clean.
  let messy: boolean | null = null;
  drive(g, out, spots, (now, N, t) => {
    if (messy === null) {
      const p = g.getWorldPosition(tmp);
      messy = (Math.abs(Math.round(p.x)) + Math.abs(Math.round(p.z))) % 2 === 0;
    }
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const inUse = !!now;
    const gathered = n.gathered ?? 0;
    at(tray, inUse ? P.tray : messy ? TT.tray : null);
    wrapper.scale.setScalar(0.8 + gathered * 0.4);
    stray.visible = inUse ? gathered < 0.5 : messy;
    cartonM.visible = true;
    crumbs.visible = inUse ? (n.wiped ?? 0) < 0.9 : messy;
    if (crumbs.visible) crumbs.scale.x = 1 - 0.4 * (n.wiped ?? 0);
    wetMat.opacity = 0.55 * (n.wet ?? 0);
    wet.visible = wetMat.opacity > 0.02;
    at(bottle, P.bottle, TT.spray);
    bottle.visible = inUse;
    at(cloth, P.cloth);
    mist(n.puff ?? 0, 0.2, TT.top + 0.14, 0.05, 0.14, t * 2.4, -0.08);
  });
  out.work = marker(g, 0, TT.top, 0.12);
}

// =============================================================================================
// 청소 도구함 (ffMopBucket, 1 × 1): the bucket on casters, the mop stood in its wringer, the yellow sign.

function mopBucket(g: THREE.Group, out: Built) {
  const YEL = MUSTARD;
  for (const [x, z] of [[-0.26, -0.14], [0.14, -0.14], [-0.26, 0.28], [0.14, 0.28]]) part(g, cyl(0.03, 0.03, 0.025, 10), BLACK, x, 0.03, z, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.54, 0.34, 0.54, 0.05), YEL, MB.bucket[0], 0.23, MB.bucket[2]);
  part(g, box(0.47, 0.01, 0.47), '#7fa8b3', MB.bucket[0], 0.4, MB.bucket[2], { outline: false });
  // The wringer and its lever.
  part(g, box(0.34, 0.12, 0.3), '#616161', MB.bucket[0], 0.5, MB.bucket[2]);
  const lever = group(g, MB.lever[0], 0.5, MB.lever[2]);
  rod(lever, v3(0, 0, 0), v3(0, 0.3, 0), 0.012, BLACK);
  part(lever, cyl(0.022, 0.022, 0.12, 8), RED, 0, 0.32, 0, { rz: Math.PI / 2, outline: false });
  // The mop: a wood pole, a grey head; it goes with the hands.
  const mopHead = group(g);
  part(mopHead, cyl(0.1, 0.13, 0.08, 10), '#b0bec5', 0, 0.04, 0);
  for (let i = 0; i < 10; i++) part(mopHead, box(0.03, 0.025, 0.16), '#cfd8dc', Math.cos(i * 0.63) * 0.09, 0.012, Math.sin(i * 0.63) * 0.09, { ry: -i * 0.63, outline: false });
  const mopPole = group(g);
  const poleRod = part(mopPole, cyl(0.011, 0.011, 1, 8), '#a1887f', 0, 0, 0, { outline: false });
  const up = new THREE.Vector3();
  const setPole = (a: V, b: V) => {
    up.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    poleRod.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    poleRod.scale.y = up.length();
    poleRod.quaternion.setFromUnitVectors(UP, up.normalize());
  };
  const home: V = [MB.bucket[0], 0.48, MB.bucket[2]];
  const homeTop: V = [MB.bucket[0] + 0.03, 1.34, MB.bucket[2] - 0.02];
  // Spare things: gloves on the side, a dustpan and a bottle.
  part(g, box(0.05, 0.14, 0.14), '#42a5f5', 0.25, 0.42, -0.2);
  part(g, box(0.3, 0.25, 0.02), '#546e7a', -0.38, 0.13, -0.4, { rx: -0.2 });
  part(g, cyl(0.012, 0.012, 0.72, 8), '#607d8b', -0.38, 0.6, -0.42);
  // The sign.
  const sign = () => {
    const s = group(g);
    const H = 0.62;
    for (const sz of [-1, 1]) {
      part(s, box(0.34, H, 0.012), YEL, 0, H / 2, sz * 0.06, { rx: sz * 0.2 });
    }
    picture(s, painted('ffWet', 96, 128, (c) => {
      c.fillStyle = YEL;
      c.fillRect(0, 0, 96, 128);
      c.fillStyle = BLACK;
      c.beginPath();
      c.moveTo(48, 10);
      c.lineTo(88, 74);
      c.lineTo(8, 74);
      c.closePath();
      c.fill();
      text(c, '!', 48, 50, 34, YEL, 'center');
      text(c, '주의', 48, 92, 18, BLACK, 'center');
      text(c, '미끄러워요', 48, 114, 14, BLACK, 'center');
    }), 0.3, 0.42, 0, H * 0.52, 0.09, '#ffffff', 0, -0.2);
    return s;
  };
  const signOnHook = sign();
  place(signOnHook, MB.sign);
  const signHand = sign();
  const signOut = sign();
  place(signOut, MB.signOut);
  // The wet floor it leaves.
  const wetMat = new THREE.MeshBasicMaterial({ color: '#c6e0ea', transparent: true, opacity: 0, depthWrite: false });
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), wetMat);
  wet.userData.ownGeometry = wet.userData.ownMaterial = true;
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(-0.32, 0.012, 1.24);
  wet.renderOrder = 1;
  g.add(wet);
  const spots: Record<string, Spot> = { ffMopFloor: standAt(g, 'ffMop') };
  spots['*'] = spots.ffMopFloor;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const hd = P.mop;
    if (hd && P.mopTop) {
      mopHead.position.set(hd[0], hd[1], hd[2]);
      setPole([hd[0], hd[1] + 0.06, hd[2]], P.mopTop);
    } else {
      mopHead.position.set(home[0], home[1] + (n.moved ?? 0), home[2]);
      setPole([home[0], home[1] + 0.06 + (n.moved ?? 0), home[2]], homeTop);
    }
    lever.rotation.z = -0.9 * (n.wring ?? 0);
    signOnHook.visible = !P.signH && (n.signOut ?? 0) < 0.5;
    at(signHand, P.signH);
    signOut.visible = (n.signOut ?? 0) > 0.5;
    wetMat.opacity = 0.5 * (n.wet ?? 0);
    wet.visible = wetMat.opacity > 0.02;
  });
  out.work = marker(g, MB.bucket[0], 0.8, MB.bucket[2]);
}

// =============================================================================================
// 소스·냅킨 바 (ffCondimentBar, 5 × 1): the low wall closing off the kitchen, set dressing.

function condimentBar(g: THREE.Group, W: number) {
  // The customers' side (the front): panels in the brand's red and a counter of what you help yourself to.
  part(g, rbox(W - 0.04, 1.0, 0.68, 0.02), CREAM, 0, 0.5, -0.1);
  part(g, box(W - 0.04, 0.72, 0.012), RED, 0, 0.42, 0.247, { outline: false });
  part(g, box(W - 0.04, 0.08, 0.7), BLACK, 0, 0.04, -0.1, { outline: false });
  part(g, rbox(W, 0.05, 0.78, 0.012), BROWN, 0, 1.0, -0.1);
  // A glass screen above, and the kitchen's steel side to the back.
  part(g, box(W - 0.04, 0.8, 0.012), SS, 0, 0.5, -0.446, { outline: false });
  for (const x of [-2.1, -0.7, 0.7, 2.1]) {
    part(g, cyl(0.016, 0.016, 0.62, 8), BLACK, x, 1.33, -0.34, { outline: false });
    part(g, cyl(0.04, 0.05, 0.015, 10), BLACK, x, 1.03, -0.34, { outline: false });
  }
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.56, 0.012), new THREE.MeshBasicMaterial({ color: '#d7edf3', transparent: true, opacity: 0.28, depthWrite: false }));
  glass.userData.ownGeometry = glass.userData.ownMaterial = true;
  glass.position.set(0, 1.34, -0.34);
  g.add(glass);
  part(g, box(W - 0.2, 0.03, 0.03), BLACK, 0, 1.64, -0.34, { outline: false });
  // A row of posters along the front.
  const posters: Array<[string, string, string]> = [['이달의 버거', '더블 치즈 통통', MUSTARD], ['둘이 오면', '둘이서 세트 15,900', '#ffffff'], ['키오스크로', '주문 번호를 확인!', '#ffcc80'], ['다 드신 쟁반은', '반납대로 부탁드려요', '#ffffff']];
  posters.forEach(([a, b, col], i) => {
    picture(g, painted(`ffPoster${i}`, 192, 128, (c) => {
      c.fillStyle = col;
      c.fillRect(0, 0, 192, 128);
      burgerPic(c, 42, 74, 0.8);
      text(c, a, 78, 44, 16, RED);
      text(c, b, 186, 96, 12, BROWN, 'right');
    }), 1.0, 0.56, -1.8 + i * 1.2, 0.42, 0.255);
  });
  // On top: pumps, napkins, straws, cups of lids, a tray of sauce sachets.
  const y = 1.027;
  const pump = (x: number, color: string, name: string) => {
    part(g, cyl(0.06, 0.065, 0.18, 12), color, x, y + 0.09, 0.1);
    part(g, cyl(0.008, 0.008, 0.08, 8), CHROME, x, y + 0.22, 0.1, { outline: false });
    part(g, box(0.09, 0.015, 0.03), BLACK, x + 0.02, y + 0.26, 0.1, { outline: false });
    label(g, name, 0.1, 0.04, x, y + 0.08, 0.16, color, '#ffffff');
  };
  pump(-1.95, RED, '케첩');
  pump(-1.72, MUSTARD, '머스터드');
  for (let i = 0; i < 2; i++) {
    const x = -1.2 + i * 0.3;
    part(g, rbox(0.2, 0.12, 0.2, 0.01), SS, x, y + 0.06, 0.04);
    part(g, box(0.16, 0.02, 0.14), '#fafafa', x, y + 0.11, 0.04, { outline: false });
  }
  part(g, cyl(0.07, 0.07, 0.2, 12), '#eceff1', -0.5, y + 0.1, 0.06);
  for (let i = 0; i < 9; i++) part(g, cyl(0.004, 0.004, 0.2, 6), RED, -0.54 + (i % 3) * 0.04, y + 0.28, 0.02 + Math.floor(i / 3) * 0.04, { rz: (i - 4) * 0.03, outline: false });
  part(g, box(0.62, 0.04, 0.34), BROWN, 0.5, y + 0.02, 0);
  for (let i = 0; i < 12; i++) part(g, box(0.09, 0.01, 0.06), i % 2 ? RED : MUSTARD, 0.28 + (i % 4) * 0.14, y + 0.05, -0.1 + Math.floor(i / 4) * 0.1, { outline: false });
  part(g, rbox(0.34, 0.2, 0.22, 0.01), SS, 1.5, y + 0.1, 0.02);
  for (let i = 0; i < 5; i++) part(g, cyl(0.044, 0.044, 0.008, 12), '#fafafa', 1.5, y + 0.205 + i * 0.008, 0.02, { outline: false });
  // The kitchen side: a pass shelf.
  part(g, box(W - 0.4, 0.02, 0.22), SS, 0, 0.84, -0.54, { outline: false });
}

export const BUILDERS: Record<string, Builder> = {
  fryer(g, _W, _D, _c, _def, _ctx, out) {
    fryer(g, out);
  },
  grillTop(g, _W, _D, _c, _def, _ctx, out) {
    grill(g, out);
  },
  burgerCounter(g, W, _D, _c, _def, _ctx, out) {
    burgerCounter(g, out, W);
  },
  trashStation(g, _W, _D, _c, _def, _ctx, out) {
    trashStation(g, out);
  },
  ffKiosk(g, _W, _D, _c, _def, _ctx, out) {
    kiosk(g, out);
  },
  ffPickupCounter(g, W, _D, _c, _def, _ctx, out) {
    pickupCounter(g, out, W);
  },
  ffDrinkTower(g, _W, _D, _c, _def, _ctx, out) {
    drinkTower(g, out);
  },
  ffDriveWindow(g, _W, _D, _c, _def, _ctx, out) {
    driveWindow(g, out);
  },
  ffRiderShelf(g, _W, _D, _c, _def, _ctx, out) {
    riderShelf(g, out);
  },
  ffTrayTable(g, _W, _D, _c, _def, _ctx, out) {
    trayTable(g, out);
  },
  ffMopBucket(g, _W, _D, _c, _def, _ctx, out) {
    mopBucket(g, out);
  },
  ffCondimentBar(g, W) {
    condimentBar(g, W);
  },
};
