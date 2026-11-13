import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, text } from './doctor';
import { FS, FY, GR, HV, PM, PN, SH, SP, TK, VT, WS, yaNow, yaPhase, netGrip } from './fishFarmerMotion';
import type { YaMotion, YaNow } from './fishFarmerMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 양식장 drawn as itself (2026-11-01 workplace pipeline, at the user's request), at the made-up 물빛양식장. Behind
 * the yard the inshore water with its rows of floats and two round net pens on a floating walkway; along the back
 * the feed silo and its hopper, the pump room and the fry rack under its lamps; in the middle the round concrete
 * tanks, flounder turning in them and rising to feed, paddle aerators and an oxygen cylinder, beside them the
 * abalone troughs; in front the sensor terminal, the grading bars, the harvest table and the packing bench; near the
 * street a low tub for visitors' hands.
 *
 * Everything that moves follows the scripts in fishFarmerMotion.ts; other people are played by VRoid bodies where
 * there are any (vroidFigure.ts). The farm and everything written on its signs are made up.
 */

const FARM = '물빛양식장';
const SEA = '#2f7f9e';
const SEA_D = '#256a86';
const GLINT = '#8fd0df';
const CONCRETE = '#b7b4aa';
const CONCRETE_D = '#9d9a90';
const CONCRETE_L = '#cfccc2';
const YELLOW = '#fdd835';
const BLUE = '#1976d2';
const NAVY = '#17406d';
const RED = '#c62828';
const ORANGE = '#ef6c00';
const WOOD = '#9c7a52';
const WOOD_D = '#6d4c41';
const PIPE = '#2e7bb8';
const PVC = '#e8ecee';
const WATER = '#3f9bb5';
const TANKW = '#4aa3b0';
const FISH = '#6b5a44';
const NET = '#3f8f6e';
const ROPE = '#d6c49a';
const SKIN = '#f1c9a5';
const PAPER = '#fbfaf6';
const INK = '#263238';
const STYRO = '#f4f6f6';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];

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
function standAt(g: THREE.Object3D, motion: YaMotion, z = 0.6): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: YaNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_gone, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? yaNow(sp.motion as YaMotion, t, yaPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
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
/** Bubbles, spray, drips: soft balls from a place, each on its own loop. */
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
      mat.opacity = Math.min(1, strength) * 0.6 * (1 - u) * Math.min(1, u * 6);
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
function torus(g: THREE.Object3D, r: number, t: number, color: string, x: number, y: number, z: number, o: { rx?: number; ry?: number; rz?: number } = {}): THREE.Mesh {
  const m = part(g, new THREE.TorusGeometry(r, t, 8, 28), color, x, y, z, { ...o, outline: false });
  m.userData.ownGeometry = true;
  return m;
}
/** See-through water lying flat. */
function waterDisc(g: THREE.Object3D, r: number, y: number, color: string, opacity = 0.52, x = 0, z = 0): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 36), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function waterSheet(g: THREE.Object3D, w: number, d: number, x: number, y: number, z: number, color = WATER, opacity = 0.55): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A flounder, flat, head to −x, its origin in the middle: two eyes on its upper side, a frill of fin. */
function flounder(g: THREE.Object3D, L = 0.3, color = FISH): THREE.Group {
  const f = group(g);
  const skirt = part(f, ball(0.5), shade(color, 1.18), 0, -0.002, 0, { outline: false });
  skirt.scale.set(L * 1.02, L * 0.05, L * 0.58);
  const b = part(f, ball(0.5), color, 0, 0, 0, { outline: false });
  b.scale.set(L * 0.9, L * 0.14, L * 0.46);
  part(f, box(L * 0.2, L * 0.03, L * 0.24), shade(color, 0.86), L * 0.54, 0, 0, { outline: false });
  for (const s of [-1, 1]) part(f, ball(L * 0.035), BLACK, -L * 0.3, L * 0.07, s * L * 0.05, { outline: false });
  return f;
}
/** A white polystyrene box, origin at its bottom. */
function styroBox(g: THREE.Object3D, w = 0.56, d = 0.36, h = 0.2): THREE.Group {
  const c = group(g);
  part(c, box(w, 0.02, d), STYRO, 0, 0.01, 0, { outline: false });
  for (const s of [-1, 1]) {
    part(c, box(w, h, 0.03), STYRO, 0, h / 2, (s * (d - 0.03)) / 2);
    part(c, box(0.03, h, d), STYRO, (s * (w - 0.03)) / 2, h / 2, 0);
  }
  return c;
}
function styroLid(g: THREE.Object3D, w = 0.56, d = 0.36): THREE.Group {
  const c = group(g);
  part(c, rbox(w + 0.02, 0.03, d + 0.02, 0.008), STYRO, 0, 0, 0);
  return c;
}
function clipMesh(g: THREE.Object3D, tex: THREE.Texture, w = 0.2, h = 0.27): THREE.Group {
  const root = group(g);
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, box(w + 0.02, h + 0.02, 0.008), WOOD_D, 0, 0, 0, { outline: false });
  picture(tilt, tex, w, h, 0, -0.005, 0.006);
  part(tilt, box(0.07, 0.022, 0.012), CHROME, 0, h / 2 - 0.005, 0.01, { outline: false });
  return root;
}
const penMesh = (g: THREE.Object3D): THREE.Mesh => part(g, cyl(0.005, 0.005, 0.13, 6), BLUE, 0, 0, 0, { rx: 0.7, rz: 0.3, outline: false });
const logTex = (key: string, title: string) =>
  painted(key, 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, title, 64, 16, 15, INK, 'center');
    c.strokeStyle = '#90a4ae';
    for (let y = 34; y < 170; y += 16) {
      c.beginPath();
      c.moveTo(6, y);
      c.lineTo(122, y);
      c.stroke();
    }
  });
/** A hand net, its origin at the head's middle: the handle runs up to where it's held. */
function handNet(g: THREE.Object3D, color = NET): { root: THREE.Group; fish: THREE.Group } {
  const root = group(g);
  torus(root, 0.13, 0.008, '#37474f', 0, 0, 0, { rx: Math.PI / 2 });
  const bag = part(root, ball(0.13), color, 0, -0.06, 0, { outline: false });
  bag.scale.y = 0.6;
  const end = netGrip([0, 0, 0]);
  rod(root, v3(0.1, 0.03, 0.06), v3(end[0], end[1], end[2]), 0.008, '#37474f');
  const fish = flounder(root, 0.22);
  fish.position.y = 0.01;
  return { root, fish };
}
/** Words and a small post stuck by a piece. */
function signPost(g: THREE.Object3D, s: string, x: number, z: number, w = 0.56, y = 0.95, bg = NAVY, fg = '#ffffff') {
  part(g, box(0.03, y, 0.03), '#546e7a', x, y / 2, z);
  label(g, s, w, 0.15, x, y, z + 0.018, bg, fg);
}
/** Feed thrown from a hand: a little cloud of pellets going over to where it lands. */
function pellets(g: THREE.Object3D, n = 12) {
  const list = Array.from({ length: n }, () => part(g, ball(0.009), '#8a6a3f', 0, 0, 0, { outline: false, shadow: false }));
  list.forEach((m) => (m.visible = false));
  return (u: number, from: V | null | undefined, x: number, y: number, z: number) => {
    list.forEach((m, i) => {
      m.visible = !!from && u > 0.02 && u < 0.98;
      if (!m.visible || !from) return;
      const s = Math.min(1, u * (1 + 0.25 * ((i * 7) % 4)));
      const dx = 0.14 * Math.sin(i * 12.3);
      const dz = 0.14 * Math.cos(i * 4.7);
      m.position.set(from[0] + (x + dx - from[0]) * s, from[1] + (y - from[1]) * s + 0.32 * Math.sin(s * Math.PI), from[2] + (z + dz - from[2]) * s);
    });
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
const LOOKS: Record<string, Look> = {
  tech: { top: '#26c6da', bottom: '#37474f', hair: '#2b1b10' },
  hand: { top: '#80deea', bottom: '#263238', hair: '#1a1a1a', skin: '#d9a97f' },
  buyer: { top: '#546e7a', bottom: '#263238', hair: '#9e9e9e', skin: '#eac09a' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender?: 'female' | 'male', cap?: string): Fig {
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
  // `nod` is read off these options every frame.
  const f = vroidFigure({ root, head, armL, armR }, opts);
  // A plain peaked cap, the size of the head; nothing on it that could read as a face.
  if (cap) {
    part(f.head, cyl(0.122, 0.13, 0.07, 16), cap, 0, 0.11, -0.005, { outline: false });
    part(f.head, box(0.18, 0.012, 0.09), shade(cap, 0.85), 0, 0.08, 0.13, { outline: false });
  }
  root.visible = false;
  return { ...f, opts };
}

// =============================================================================================
// 양식장 마당 (yaYard, 16 × 13) and 앞바다 (yaSea, 11 × 2), with the lamps (yaLamp, 1 × 1).

function yard(g: THREE.Group, W: number, D: number) {
  // Wet concrete laid in bays, a covered pipe trench along the tanks' front, drains, a yellow lane to the gate.
  part(g, box(W, 0.008, D), CONCRETE, 0, 0.004, 0, { outline: false, shadow: false });
  for (let x = -W / 2 + 4; x < W / 2; x += 4) part(g, box(0.03, 0.002, D), CONCRETE_D, x, 0.009, 0, { outline: false, shadow: false });
  for (let z = -D / 2 + 4; z < D / 2; z += 4) part(g, box(W, 0.002, 0.03), CONCRETE_D, 0, 0.009, z, { outline: false, shadow: false });
  part(g, box(W - 2, 0.003, 0.34), '#8d8a80', -0.6, 0.01, -1.0, { outline: false, shadow: false });
  for (let x = -W / 2 + 1.4; x < W / 2 - 1.5; x += 0.5) part(g, box(0.02, 0.003, 0.34), '#6f6c64', x, 0.012, -1.0, { outline: false, shadow: false });
  for (const [x, z, r] of [[-5.2, -2.2, 0.7], [-1.6, -3.3, 0.9], [1.8, -0.2, 0.6], [4.9, -2.6, 0.8], [-5.4, 1.2, 0.5], [0.6, 1.9, 0.8], [5.2, 3.1, 0.6]] as const) {
    const m = part(g, cyl(r, r, 0.002, 18), '#a29f95', x, 0.011, z, { outline: false, shadow: false });
    m.scale.z = 0.6;
  }
  for (const x of [4.15, 4.85]) part(g, box(0.06, 0.002, 3.5), YELLOW, x, 0.012, D / 2 - 1.75, { outline: false, shadow: false });
  label(g, '천천히 · 바닥 미끄럼 주의', 1.7, 0.22, -2.5, 0.013, 4.8, CONCRETE, '#8d6e0a').rotation.set(-Math.PI / 2, 0, 0);
}
function seaFront(g: THREE.Group, out: Built) {
  const X0 = -14;
  const X1 = 10.5;
  const Z0 = -5;
  const Z1 = 1;
  part(g, box(X1 - X0, 0.02, Z1 - Z0), SEA, (X0 + X1) / 2, 0.01, (Z0 + Z1) / 2, { outline: false, shadow: false });
  part(g, box(X1 - X0, 0.002, 1.8), SEA_D, (X0 + X1) / 2, 0.022, -3.6, { outline: false, shadow: false });
  const glints = group(g);
  let s = 53;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 80; i++) part(glints, box(0.14 + rnd() * 0.2, 0.003, 0.012), GLINT, X0 + 0.5 + rnd() * (X1 - X0 - 1), 0.026, Z0 + 0.2 + rnd() * (Z1 - Z0 - 0.5), { outline: false, shadow: false });
  // The seawall along the yard, and a ladder down.
  part(g, box(X1 - X0, 0.14, 0.2), CONCRETE_L, (X0 + X1) / 2, 0.07, Z1 + 0.02);
  for (const dx of [-0.16, 0.16]) rod(g, v3(-3 + dx, 0.32, Z1 - 0.04), v3(-3 + dx, 0.0, Z1 - 0.14), 0.014, CHROME);
  // The long-lines for the shellfish: rows of white floats with a rope between them.
  const rows: THREE.Group[] = [];
  for (let r = 0; r < 3; r++) {
    const line = group(g, -3.2, 0.03, -1.0 - r * 1.1);
    rod(line, v3(-3.6, 0.03, 0), v3(3.6, 0.03, 0), 0.008, ROPE);
    for (let i = 0; i < 9; i++) {
      const f = part(line, ball(0.1), r === 1 && i % 3 === 0 ? ORANGE : '#f5f6f6', -3.4 + i * 0.85, 0.05, 0, { outline: false });
      f.scale.y = 0.75;
    }
    rows.push(line);
  }
  // A small flat work boat tied to the wall.
  const skiff = group(g, -1.4, 0.04, 0.2);
  part(skiff, rbox(1.3, 0.14, 0.52, 0.05), '#dfe6e6', 0, 0.07, 0);
  part(skiff, box(1.14, 0.01, 0.4), '#7f8c92', 0, 0.145, 0, { outline: false });
  part(skiff, box(0.14, 0.2, 0.14), BLACK, 0.68, 0.2, 0);
  label(skiff, '물빛 1', 0.3, 0.07, 0, 0.08, 0.262, '#dfe6e6', NAVY);
  rod(g, v3(-0.8, 0.2, 0.2), v3(-0.6, 0.15, 0.96), 0.007, ROPE);
  out.away = (_gone, t) => {
    glints.position.x = 0.1 * Math.sin(t * 0.4);
    glints.position.z = 0.04 * Math.cos(t * 0.31);
    rows.forEach((l, i) => {
      l.position.y = 0.03 + 0.012 * Math.sin(t * 1.1 + i * 1.7);
    });
    skiff.position.y = 0.04 + 0.012 * Math.sin(t * 1.3);
    skiff.rotation.z = 0.012 * Math.sin(t * 0.9);
  };
}
function lampPost(g: THREE.Group) {
  // On its own footing, the arm out to the yard; a pool of light on the ground beneath.
  part(g, cyl(0.12, 0.14, 0.12, 12), CONCRETE_D, 0, 0.06, 0);
  part(g, cyl(0.035, 0.05, 3.0, 10), '#607d8b', 0, 1.6, 0);
  part(g, box(0.46, 0.035, 0.035), '#607d8b', 0, 3.08, 0.2, { ry: Math.PI / 2 });
  part(g, rbox(0.2, 0.05, 0.3, 0.02), '#37474f', 0, 3.08, 0.44);
  ownLit(g, box(0.15, 0.015, 0.24), '#fff2c4', 0, 3.05, 0.44);
  const mat = new THREE.MeshBasicMaterial({ color: '#fff2c4', transparent: true, opacity: 0.09, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), mat);
  pool.userData.ownGeometry = pool.userData.ownMaterial = true;
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.016, 0.44);
  g.add(pool);
}

// =============================================================================================
// 양식 수조 (fishTank, 2 × 2).

function tankShell(g: THREE.Object3D) {
  // Outside up, across the rim, down the inside and over the floor: one turned piece of concrete.
  const pts: Array<[number, number]> = [[TK.R + 0.03, 0], [TK.R, TK.rim - 0.02], [TK.R - 0.01, TK.rim], [TK.r + 0.01, TK.rim], [TK.r, TK.rim - 0.02], [TK.r - 0.02, TK.floor], [0, TK.floor]];
  const shell = part(g, new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 40), '#c7c4ba', 0, 0, 0, { outline: false });
  shell.userData.ownGeometry = true;
  for (const y of [0.3, 0.6]) torus(g, TK.R + 0.022, 0.004, CONCRETE_D, 0, y, 0, { rx: Math.PI / 2 });
  // A paler painted inside, so the fish show against it.
  part(g, cyl(TK.r - 0.03, TK.r - 0.03, 0.004, 36), '#a9c3c6', 0, TK.floor + 0.006, 0, { outline: false, shadow: false });
}
function fishTank(g: THREE.Group, out: Built) {
  tankShell(g);
  const water = waterDisc(g, TK.r - 0.015, TK.water, TANKW, 0.5);
  // The standpipe in the middle, the inlet from the back, its stream.
  part(g, cyl(0.04, 0.04, TK.water - TK.floor + 0.05, 12), PVC, 0, (TK.water + TK.floor + 0.05) / 2, 0, { outline: false });
  rod(g, v3(0, TK.rim + 0.14, -TK.R - 0.02), v3(0, TK.rim + 0.14, -TK.r + 0.12), 0.024, PIPE);
  rod(g, v3(0, 0, -TK.R - 0.04), v3(0, TK.rim + 0.14, -TK.R - 0.04), 0.024, PIPE);
  const stream = puffs(g, 5, '#d4f1fa', 0.02);
  // The feeder on a bridge from the rim: a blue hopper and its spinner.
  part(g, box(0.1, 0.05, 0.6), '#607d8b', -0.3, TK.rim + 0.04, -0.62, { outline: false });
  part(g, cyl(0.17, 0.09, 0.26, 12), BLUE, -0.3, TK.rim + 0.28, -0.42);
  part(g, cyl(0.175, 0.175, 0.03, 12), '#0d47a1', -0.3, TK.rim + 0.42, -0.42, { outline: false });
  const spinner = group(g, -0.3, TK.rim + 0.1, -0.42);
  part(spinner, box(0.18, 0.012, 0.03), '#eceff1', 0, 0, 0, { outline: false });
  // The paddle aerator on floats, its motor out on an arm from the rim.
  const aer = group(g, 0.4, TK.water, -0.34, -0.5);
  for (const s of [-1, 1]) {
    const fl = part(aer, ball(0.08), '#eceff1', 0, 0.02, s * 0.18, { outline: false });
    fl.scale.x = 2;
  }
  part(aer, cyl(0.06, 0.06, 0.12, 10), '#37474f', 0, 0.2, 0);
  part(aer, box(0.03, 0.14, 0.03), '#546e7a', 0, 0.1, 0, { outline: false });
  const wheel = group(aer, 0.12, 0.05, 0);
  part(wheel, cyl(0.014, 0.014, 0.28, 8), STEEL, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 6; i++) {
    const b = group(wheel);
    b.rotation.z = (i / 6) * Math.PI * 2;
    part(b, box(0.03, 0.12, 0.2), '#fdd835', 0, 0.07, 0, { outline: false });
  }
  rod(g, v3(0.4, TK.water + 0.2, -0.34), v3(0.72, TK.rim + 0.06, -0.48), 0.012, '#607d8b');
  const spray = puffs(g, 7, '#e6fbff', 0.022);
  // The oxygen cylinder and its valve; the coil of air hose and the air stone on its hook.
  const cylX = TK.cyl[0];
  const cylZ = TK.cyl[2];
  part(g, cyl(0.09, 0.09, 0.86, 14), '#2e7d32', cylX, 0.45, cylZ);
  part(g, ball(0.09), '#2e7d32', cylX, 0.88, cylZ, { outline: false });
  part(g, box(0.05, 0.1, 0.05), CHROME, cylX, 0.98, cylZ, { outline: false });
  const valve = group(g, TK.valve[0], TK.valve[1], TK.valve[2]);
  torus(valve, 0.04, 0.008, RED, 0, 0, 0, { rx: Math.PI / 2 });
  part(valve, box(0.07, 0.006, 0.006), RED, 0, 0, 0, { outline: false });
  label(g, 'O₂', 0.1, 0.07, cylX, 0.55, cylZ + 0.093, '#2e7d32', '#ffffff');
  torus(g, 0.09, 0.012, '#37474f', TK.stoneHome[0] + 0.0, TK.stoneHome[1] - 0.1, TK.stoneHome[2], { ry: 0.6 });
  const stone = part(g, rbox(0.14, 0.03, 0.06, 0.01), '#546e7a', 0, 0, 0);
  const hose = limb(g, 0.006, '#37474f');
  const boil = puffs(g, 12, '#effdff', 0.03);
  // A big reading over the back, its lamp, on a post.
  part(g, box(0.05, 1.55, 0.05), '#546e7a', 0.34, 0.78, -TK.R - 0.03);
  part(g, rbox(0.5, 0.3, 0.05, 0.015), '#263238', 0.34, 1.42, -TK.R - 0.01);
  const reading = swapPic(g, 0.44, 0.24, 0.34, 1.42, -TK.R + 0.018);
  const readingLive = live(160, 88);
  const beacon = ownLit(g, cyl(0.05, 0.05, 0.07, 12), '#5a1414', 0.34, 1.62, -TK.R - 0.01);
  // The bucket of feed on its stool, the scoop; the log on its hook on the rim, the meter's case; the hand net.
  const bk = TK.bucket;
  part(g, cyl(0.15, 0.15, 0.03, 14), WOOD, bk[0], 0.42, bk[2]);
  for (const a of [0, 2.09, 4.18]) part(g, cyl(0.014, 0.014, 0.42, 6), WOOD_D, bk[0] + 0.11 * Math.cos(a), 0.21, bk[2] + 0.11 * Math.sin(a), { outline: false });
  part(g, cyl(0.13, 0.1, 0.2, 14), '#eceff1', bk[0], 0.54, bk[2]);
  part(g, cyl(0.118, 0.118, 0.01, 14), '#8a6a3f', bk[0], 0.635, bk[2], { outline: false });
  const scoop = group(g);
  part(scoop, cyl(0.05, 0.04, 0.05, 10), '#90a4ae', 0, 0, 0);
  part(scoop, cyl(0.008, 0.008, 0.09, 6), '#607d8b', 0.06, 0.01, 0, { rz: Math.PI / 2, outline: false });
  const sheetTilt = group(g, TK.sheet[0], TK.sheet[1], TK.sheet[2]);
  sheetTilt.rotation.x = -0.25;
  part(sheetTilt, box(0.2, 0.26, 0.008), WOOD_D, 0, 0, 0, { outline: false });
  picture(sheetTilt, logTex('yaFeedLog', '급이 일지'), 0.18, 0.24, 0, 0, 0.006);
  const ticks = Array.from({ length: 4 }, (_, i) => part(sheetTilt, box(0.09, 0.004, 0.002), INK, 0.01, 0.06 - i * 0.03, 0.009, { outline: false, shadow: false }));
  const pen = penMesh(g);
  const kit = group(g);
  part(kit, rbox(0.1, 0.17, 0.05, 0.012), '#ffb300', 0, 0, 0);
  const kitLed = swapPic(kit, 0.075, 0.06, 0, 0.04, 0.027);
  const kitLive = live(96, 72);
  const probeCord = limb(g, 0.004, BLACK);
  const probe = part(g, cyl(0.012, 0.012, 0.12, 8), BLACK, 0, 0, 0, { outline: false });
  const tube = group(g);
  const glassTube = new THREE.MeshBasicMaterial({ color: '#d6f1f7', transparent: true, opacity: 0.5, depthWrite: false });
  const tubeM = new THREE.Mesh(cyl(0.014, 0.014, 0.12, 8), glassTube);
  tubeM.userData.ownMaterial = true;
  tube.add(tubeM);
  const liquid = ownLit(tube, cyl(0.012, 0.012, 0.07, 8), '#e8f7f5', 0, -0.02, 0);
  const dropper = part(g, cyl(0.006, 0.003, 0.08, 6), PVC, 0, 0, 0, { outline: false });
  const card = group(g);
  part(card, box(0.14, 0.09, 0.004), PAPER, 0, 0, 0, { outline: false });
  ['#e8f7f5', '#b8ecc9', '#ffe08a', '#f7a26b'].forEach((col, i) => part(card, box(0.028, 0.05, 0.002), col, -0.05 + i * 0.034, 0, 0.003, { outline: false }));
  const { root: net, fish: netFish } = handNet(g);
  // The tank's name and number on the side, by which of the farm's it is.
  const one = label(g, `${FARM} 1호 수조`, 0.74, 0.14, 0, 0.42, TK.R + 0.034, '#c7c4ba', NAVY);
  const two = label(g, `${FARM} 2호 수조`, 0.74, 0.14, 0, 0.42, TK.R + 0.034, '#c7c4ba', NAVY);
  two.visible = false;
  // A dozen flounder, going round low until there's feed.
  const FN = 14;
  const fishes = Array.from({ length: FN }, (_, i) => flounder(g, 0.24 + ((i * 5) % 4) * 0.035, i % 5 === 0 ? '#7c6a50' : FISH));
  const scatter = pellets(g, 14);
  const splash = puffs(g, 8, '#f0fcff', 0.024);
  const rings = [0, 1, 2].map(() => {
    const m = torus(g, 0.1, 0.004, '#dff7fb', 0, TK.water + 0.004, 0, { rx: Math.PI / 2 });
    m.visible = false;
    return m;
  });
  const tech = person(g, LOOKS.tech, TK.tech[0], TK.tech[1], Math.PI / 2 - 0.1, 'female', '#00838f');
  const spots: Record<string, Spot> = {
    feedFish: standAt(g, 'yaFeed', TK.Z),
    checkWater: standAt(g, 'yaWater', TK.Z),
    oxygenAlarm: standAt(g, 'yaOxygen', TK.Z),
    fishFarmer_watchFish: standAt(g, 'yaWatch', TK.Z),
  };
  spots['*'] = spots.feedFish;
  let landX = 0.1;
  let landZ = 0.2;
  let named = false;
  drive(g, out, spots, (now, N, t) => {
    if (!named) {
      named = true;
      const second = g.getWorldPosition(tmp).x > 4;
      one.visible = !second;
      two.visible = second;
    }
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const rise = n.rise ?? 0;
    const low = n.low ?? 0;
    const boilOn = n.boil ?? 0;
    if ((n.toss ?? 0) > 0.02) {
      landX = n.tx ?? landX;
      landZ = n.tz ?? landZ;
    }
    // Each fish keeps its round; rising it comes to the feed, gasping it hangs at the surface, nosing the air.
    fishes.forEach((f, i) => {
      const dir = i % 2 ? 1 : -1;
      const a = t * (0.16 + 0.015 * (i % 5)) * dir + i * 0.92;
      const rad = 0.26 + 0.11 * (i % 5);
      const homeY = TK.floor + 0.05 + (i % 3) * 0.06;
      let x = rad * Math.cos(a);
      let z = rad * Math.sin(a);
      let y = homeY + 0.01 * Math.sin(t * 1.3 + i);
      const r = Math.min(1, rise * (0.7 + 0.4 * ((i * 3) % 4) * 0.25));
      if (r > 0) {
        const jx = landX + 0.22 * Math.sin(i * 3.1 + t * 0.9);
        const jz = landZ + 0.2 * Math.cos(i * 1.7 + t * 1.1);
        x += (jx - x) * r;
        z += (jz - z) * r;
        y += (TK.water - 0.05 + 0.02 * Math.sin(t * 6 + i) - y) * r;
      }
      if (low > 0) y += (TK.water - 0.035 - y) * low;
      f.position.set(x, y, z);
      f.rotation.y = dir > 0 ? -a - Math.PI / 2 : -a + Math.PI / 2;
      f.rotation.z = (r > 0.3 || low > 0.3 ? 0.22 : 0.03) * Math.sin(t * (r > 0.3 ? 9 : 2.6) + i);
    });
    // Feed in the air and rings where the fish break the surface.
    scatter(n.toss ?? 0, P.scoop, landX, TK.water, landZ);
    splash(rise, landX, TK.water, landZ, 0.14, t * 1.6, 0.14);
    rings.forEach((m, i) => {
      const u = (t * 0.7 + i / 3) % 1;
      m.visible = rise > 0.1 || low > 0.1;
      if (!m.visible) return;
      const ax = low > 0.1 ? 0.4 * Math.cos(i * 2.1) : landX + 0.14 * Math.cos(i * 2.1);
      const az = low > 0.1 ? 0.4 * Math.sin(i * 2.1) : landZ + 0.14 * Math.sin(i * 2.1);
      m.position.set(ax, TK.water + 0.004, az);
      m.scale.setScalar(0.3 + 1.4 * u);
    });
    // The aerator: stopped dead on the alarm's reading, otherwise working away.
    wheel.rotation.z = -t * (low > 0.6 ? 1.2 : 9);
    spray(low > 0.6 ? 0.2 : 1, 0.58, TK.water + 0.02, -0.4, 0.09, t * 1.4, 0.13);
    stream(1, 0, TK.water + 0.02, -TK.r + 0.12, 0.012, t * 1.8, 0.1);
    spinner.rotation.y = t * ((n.rise ?? 0) > 0.3 ? 2 : 0.5);
    (water.material as THREE.MeshBasicMaterial).opacity = 0.5 - 0.14 * boilOn;
    valve.rotation.y = (n.gas ?? 0) * 3;
    // The stone at the end of its hose, and the water boiling over it.
    at(stone, P.stone, TK.stoneHome);
    const sp = P.stone ?? TK.stoneHome;
    hose(tmp.set(TK.valve[0], TK.valve[1] - 0.05, TK.valve[2]).clone(), tmp.set(sp[0], sp[1], sp[2]).clone());
    boil(boilOn, TK.stone[0], TK.water - 0.02, TK.stone[2], 0.16, t * 2, 0.1);
    // The numbers.
    const alarmed = (n.alarm ?? 0) > 0.5;
    const doNow = n.do ?? 7.6;
    setLit(beacon, alarmed ? (Math.sin(t * 9) > 0 ? '#ff3b30' : '#5a1414') : '#2e7d32');
    if (typeof document !== 'undefined') {
      reading.set(readingLive((c) => {
        c.fillStyle = '#0d1a14';
        c.fillRect(0, 0, 160, 88);
        text(c, '용존산소', 8, 16, 14, '#9fd8c6');
        text(c, `${doNow.toFixed(1)}`, 112, 52, 40, doNow < 4 ? '#ff5252' : '#66ff99', 'right');
        text(c, 'mg/L', 154, 58, 13, '#9fd8c6', 'right');
        text(c, '16.4℃', 154, 16, 14, '#ffd54f', 'right');
      }));
    }
    // What's in hand.
    at(scoop, P.scoop, add(TK.bucket, 0, 0.02, 0));
    at(pen, P.pen);
    ticks.forEach((m, i) => (m.visible = N ? (i + 1) / 4 <= (n.ticks ?? 0) + 0.02 : true));
    at(kit, P.meter, TK.kit);
    if (P.meter && typeof document !== 'undefined') {
      kitLed.set(kitLive((c) => {
        c.fillStyle = '#0d1a14';
        c.fillRect(0, 0, 96, 72);
        const v = 7.1 + 0.5 * (n.read ?? 0) + 0.04 * Math.sin(t * 3);
        text(c, v.toFixed(1), 48, 36, 34, '#66ff99', 'center');
      }));
    }
    probe.visible = !!P.probe;
    if (P.probe) place(probe, P.probe);
    if (P.probe) probeCord(tmp.set(P.meter?.[0] ?? TK.kit[0], (P.meter?.[1] ?? TK.kit[1]) - 0.06, P.meter?.[2] ?? TK.kit[2]).clone(), tmp.set(P.probe[0], P.probe[1] + 0.06, P.probe[2]).clone());
    else probeCord(tmp.set(TK.kit[0], TK.kit[1], TK.kit[2]).clone(), tmp.set(TK.kit[0], TK.kit[1] - 0.05, TK.kit[2]).clone());
    at(tube, P.tube);
    setLit(liquid, (n.tint ?? 0) > 0.5 ? '#b8ecc9' : '#e8f7f5');
    at(dropper, P.dropper);
    at(card, P.card);
    at(net, P.net, TK.netHome);
    netFish.visible = (n.caught ?? 0) > 0.5;
    tech.root.visible = now === 'fishFarmer_watchFish';
    if (tech.root.visible) {
      tech.opts.nod = 0.14 + 0.24 * (n.tNod ?? 0);
      tech.armL(null);
      tech.armR((n.tPoint ?? 0) > 0.1 ? tmp.set(TK.tech[0] + 0.5, 1.0 + 0.1 * (n.tPoint ?? 0), TK.tech[1] - 0.18).clone() : null);
    }
  });
  out.work = marker(g, 0, TK.water, 0.5);
}

// =============================================================================================
// 전복 가두리 (shellLine, 2 × 1).

const abalone = (g: THREE.Object3D, x: number, y: number, z: number, color = '#7b6a55'): THREE.Mesh => {
  const m = part(g, ball(0.034), color, x, y, z, { outline: false });
  m.scale.set(1.25, 0.9, 0.42);
  return m;
};
/** A black shelter plate, origin at its middle, shells on its front. */
function boardMesh(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, box(0.36, 0.42, 0.02), '#2a2e31', 0, 0, 0);
  part(b, box(0.38, 0.03, 0.03), '#546e7a', 0, 0.22, 0, { outline: false });
  let s = 13;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) abalone(b, -0.14 + rnd() * 0.28, -0.17 + rnd() * 0.34, 0.016, i % 3 ? '#7b6a55' : '#8c7a60');
  return b;
}
function shellLine(g: THREE.Group, out: Built) {
  const W = 1.94;
  const D = 0.82;
  const z0 = -0.06;
  // The trough: raised on block legs, its concrete walls and a dark floor.
  for (const x of [-0.72, 0, 0.72]) part(g, box(0.26, 0.3, D - 0.06), CONCRETE_D, x, 0.15, z0);
  part(g, box(W, 0.06, D), '#8f8c82', 0, 0.33, z0);
  for (const s of [-1, 1]) {
    part(g, box(W, SH.rim - 0.36, 0.06), CONCRETE_L, 0, (SH.rim + 0.36) / 2, z0 + (s * (D - 0.06)) / 2);
    part(g, box(0.06, SH.rim - 0.36, D), CONCRETE_L, (s * (W - 0.06)) / 2, (SH.rim + 0.36) / 2, z0);
  }
  waterSheet(g, W - 0.12, D - 0.12, 0, SH.water, z0, '#3a8fa8', 0.5);
  // The plates standing in the water, all but the one out.
  const boards = SH.boards.map((x, i) => {
    const b = boardMesh(g);
    b.position.set(x, SH.boardY, SH.boardZ);
    b.rotation.y = i % 2 ? 0.04 : -0.04;
    return b;
  });
  // One gone over: pale, upside down, stuck to the board in hand.
  const dead = abalone(boards[2], 0.08, 0.1, 0.02, '#c9c1ae');
  const dead2 = abalone(g, 0, 0, 0, '#c9c1ae');
  dead2.visible = false;
  // Water in by a pipe along the back, out over a spout at the end.
  rod(g, v3(-W / 2 + 0.05, SH.rim + 0.12, z0 - D / 2 + 0.03), v3(W / 2 - 0.05, SH.rim + 0.12, z0 - D / 2 + 0.03), 0.02, PIPE);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) part(g, cyl(0.009, 0.009, 0.1, 6), PIPE, x, SH.rim + 0.07, z0 - D / 2 + 0.03, { outline: false });
  const drips = [-0.6, -0.2, 0.2, 0.6].map(() => puffs(g, 2, '#d4f1fa', 0.012));
  // The kelp in its crate at one end, strips on the water.
  part(g, box(0.34, 0.14, 0.26), '#2f80c9', SH.kelp[0], 0.87, SH.kelp[2] - 0.06, { outline: false });
  for (let i = 0; i < 5; i++) part(g, box(0.3, 0.02, 0.05), '#4a6b3a', SH.kelp[0], 0.95 + (i % 2) * 0.012, SH.kelp[2] - 0.15 + i * 0.05, { outline: false });
  const strips = [-0.56, -0.16, 0.24, 0.62].map((x) => part(g, box(0.28, 0.006, 0.06), '#4a6b3a', x, SH.water + 0.008, 0.2 - 0.06, { outline: false, shadow: false }));
  const strip = part(g, box(0.05, 0.14, 0.008), '#4a6b3a', 0, 0, 0, { outline: false });
  // The brush on the rim, the dead-shell pail on the floor; the sign.
  const brush = group(g);
  part(brush, box(0.12, 0.024, 0.05), '#f4b400', 0, 0, 0);
  part(brush, box(0.11, 0.02, 0.045), '#5d4037', 0, -0.018, 0, { outline: false });
  part(g, cyl(0.12, 0.09, 0.3, 12), '#546e7a', SH.bin[0], 0.15, SH.bin[2]);
  part(g, cyl(0.105, 0.105, 0.01, 12), '#2a2f33', SH.bin[0], 0.302, SH.bin[2], { outline: false });
  label(g, '전복 수조', 0.5, 0.11, -0.48, 0.56, z0 + D / 2 + 0.003, CONCRETE_L, NAVY);
  const heldBoard = boardMesh(g);
  heldBoard.visible = false;
  const spots: Record<string, Spot> = { tendShellfish: standAt(g, 'yaShell', SH.stand) };
  spots['*'] = spots.tendShellfish;
  const dripFall = puffs(heldBoard, 3, '#d4f1fa', 0.012);
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    // Board 2 in the water while the held copy isn't out.
    const out3 = !!P.board;
    boards[2].visible = !out3;
    heldBoard.visible = out3;
    if (P.board) {
      place(heldBoard, P.board);
      heldBoard.rotation.y = 0.5 * (n.turn ?? 0);
    }
    dead.visible = N ? (n.dead ?? 1) > 0.5 : true;
    at(dead2, P.dead2);
    dripFall((n.drip ?? 0) > 0.05 ? 1 : 0, 0, -0.26, 0, 0.14, t * 2, -0.28);
    SH.boards.forEach((x, i) => drips[i](1, x, SH.rim + 0.02, z0 - D / 2 + 0.03, 0.002, t * 1.5 + i, -0.1));
    const k = n.kelp ?? 1;
    strips.forEach((m, i) => (m.visible = (i + 1) / strips.length <= k + 0.02));
    at(strip, P.strip);
    at(brush, P.brush, SH.brush);
  });
  out.work = marker(g, 0, SH.water, z0);
}

// =============================================================================================
// 수질 센서 단말 (waterSensor, 1 × 1).

function waterSensor(g: THREE.Group, out: Built) {
  // A post on a plate, the terminal under its little roof, a flow cell of clear water with the probes in it.
  part(g, box(0.76, 0.03, 0.56), CONCRETE_D, 0, 0.015, -0.04);
  part(g, box(0.08, 0.96, 0.08), '#546e7a', 0, 0.5, -0.1);
  part(g, rbox(0.46, 0.34, 0.1, 0.02), '#263238', WS.screen[0], WS.screen[1], WS.screen[2] - 0.06);
  part(g, box(0.56, 0.02, 0.26), '#90a4ae', 0, WS.screen[1] + 0.22, WS.screen[2] - 0.02, { rx: 0.18 });
  const pic = swapPic(g, 0.4, 0.28, WS.screen[0], WS.screen[1], WS.screen[2] - 0.006);
  const off = painted('yaSensorIdle', 200, 140, (c) => {
    c.fillStyle = '#0c2026';
    c.fillRect(0, 0, 200, 140);
    text(c, FARM, 100, 26, 18, '#7fd4e8', 'center');
    text(c, 'DO 7.6', 12, 62, 19, '#66ff99');
    text(c, '16.4℃', 12, 88, 19, '#ffd54f');
    text(c, '염분 31.8', 12, 114, 19, '#7fd4e8');
  });
  pic.set(off);
  const screen = live(200, 140);
  const lamp = ownLit(g, ball(0.016), '#66ff99', 0.2, WS.screen[1] + 0.13, WS.screen[2] - 0.005);
  // The flow cell, the rag on the hook.
  const cell = WS.cell;
  part(g, box(0.04, cell[1] - 0.13, 0.04), '#546e7a', cell[0], (cell[1] - 0.13) / 2, cell[2] - 0.02);
  part(g, rbox(0.18, 0.04, 0.16, 0.01), '#607d8b', cell[0], cell[1] - 0.14, cell[2]);
  const clear = new THREE.MeshBasicMaterial({ color: '#cfeef6', transparent: true, opacity: 0.45, depthWrite: false });
  const cup = new THREE.Mesh(cyl(0.06, 0.06, 0.16, 12), clear);
  cup.userData.ownMaterial = true;
  cup.position.set(cell[0], cell[1] - 0.04, cell[2]);
  g.add(cup);
  rod(g, v3(cell[0], cell[1] - 0.16, cell[2] - 0.04), v3(0, 0.08, -0.2), 0.012, PIPE);
  const probeG = group(g);
  part(probeG, cyl(0.012, 0.012, 0.16, 8), BLACK, 0, 0, 0, { outline: false });
  part(probeG, cyl(0.016, 0.016, 0.03, 8), RED, 0, 0.09, 0, { outline: false });
  const cord = limb(g, 0.004, BLACK);
  const rag = group(g);
  part(rag, box(0.1, 0.03, 0.08), '#e0e6e8', 0, 0, 0, { outline: false });
  const ragHome = add(WS.rag, 0, 0, 0);
  part(g, box(0.035, WS.rag[1], 0.035), '#607d8b', WS.rag[0] - 0.02, WS.rag[1] / 2, WS.rag[2] - 0.05, { outline: false });
  const spots: Record<string, Spot> = {
    monitorSensors: standAt(g, 'yaSensors', WS.stand),
    fishFarmer_tuneFeeder: standAt(g, 'yaTune', WS.stand),
  };
  spots['*'] = spots.monitorSensors;
  const PAGES: Array<[string, string, string, number]> = [['용존산소', 'mg/L', '#66ff99', 7.6], ['수온', '℃', '#ffd54f', 16.4], ['염분', 'psu', '#7fd4e8', 31.8], ['상태', '정상', '#a5d6a7', 0]];
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(probeG, P.probe, cell);
    const pp = P.probe ?? cell;
    cord(tmp.set(0, 1.05, WS.screen[2] - 0.11).clone(), tmp.set(pp[0], pp[1] + 0.09, pp[2]).clone());
    at(rag, P.rag, ragHome);
    setLit(lamp, Math.sin(t * 2) > 0 ? '#66ff99' : '#2e7d32');
    if (!N) {
      pic.set(off);
      return;
    }
    if ((n.mode ?? 0) > 0.5) {
      pic.set(screen((c) => {
        c.fillStyle = '#0c2026';
        c.fillRect(0, 0, 200, 140);
        text(c, '자동 급이기', 100, 16, 15, '#7fd4e8', 'center');
        const active = Math.round(n.active ?? -1);
        (['06시', '11시', '15시'] as const).forEach((lab, i) => {
          const y = 42 + i * 26;
          const v = [n.va ?? 0, n.vb ?? 0, n.vc ?? 0][i];
          text(c, lab, 8, y, 13, active === i ? '#ffd54f' : '#b0c8cc');
          c.fillStyle = '#23414a';
          c.fillRect(46, y - 6, 124, 12);
          c.fillStyle = active === i ? '#ffd54f' : '#4fc3f7';
          c.fillRect(46, y - 6, 124 * v, 12);
        });
        if ((n.run ?? 0) > 0.5) text(c, '시험 가동 중', 100, 122, 15, '#ffab40', 'center');
        else if ((n.saved ?? 0) > 0.5) text(c, '저장됨', 100, 122, 15, '#66ff99', 'center');
        else text(c, '저장', 100, 122, 15, '#b0c8cc', 'center');
      }));
      return;
    }
    const p = Math.min(3, Math.round(n.page ?? 0));
    const [name, unit, col, base] = PAGES[p];
    pic.set(screen((c) => {
      c.fillStyle = '#0c2026';
      c.fillRect(0, 0, 200, 140);
      PAGES.slice(0, 3).forEach(([nm], i) => {
        c.fillStyle = i === p ? '#2b6a75' : '#183138';
        c.fillRect(4 + i * 64, 112, 62, 24);
        text(c, nm === '용존산소' ? 'DO' : nm, 35 + i * 64, 124, 12, '#e0f4f7', 'center');
      });
      text(c, name, 10, 14, 14, col);
      if (p < 3) {
        const v = (base + 0.15 * Math.sin(t * 0.8)).toFixed(1);
        text(c, `${v} ${unit}`, 192, 14, 16, col, 'right');
        c.strokeStyle = col;
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= 188; x += 6) c.lineTo(6 + x, 66 + 22 * Math.sin((x + t * 16 + p * 30) * 0.04) * Math.cos(x * 0.013));
        c.stroke();
      } else text(c, '전 수조 정상', 100, 62, 20, col, 'center');
    }));
  });
  out.work = marker(g, WS.screen[0], WS.screen[1], WS.screen[2]);
}

// =============================================================================================
// 출하 작업대 (harvestNet, 2 × 1).

function harvestNet(g: THREE.Group, out: Built) {
  // The steel table with a lip, a drain, a rinsing hose over it.
  part(g, box(1.9, 0.04, 0.82), STEEL, 0, HV.top - 0.02, -0.02);
  for (const s of [-1, 1]) part(g, box(1.9, 0.05, 0.02), CHROME, 0, HV.top + 0.01, -0.02 + s * 0.41, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, HV.top - 0.04, 0.05), '#90a4ae', sx * 0.88, (HV.top - 0.04) / 2, -0.02 + sz * 0.36);
  part(g, box(1.8, 0.03, 0.7), '#90a4ae', 0, 0.26, -0.02);
  // Nets rolled on the shelf below, a stack of empties.
  for (const x of [-0.4, -0.14]) part(g, cyl(0.1, 0.1, 0.5, 10), NET, x, 0.38, -0.08, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 3; i++) styroBox(g, 0.5, 0.34, 0.14).position.set(0.5, 0.28 + i * 0.145, -0.04);
  // The scale under the box and its reading.
  const bx = HV.box;
  part(g, rbox(0.62, 0.05, 0.42, 0.012), '#546e7a', bx[0], HV.top + 0.03, bx[2]);
  part(g, rbox(0.2, 0.16, 0.05, 0.01), '#263238', bx[0] + 0.42, HV.top + 0.1, bx[2] + 0.14, { rx: -0.25 });
  const read = swapPic(g, 0.16, 0.1, bx[0] + 0.42, HV.top + 0.11, bx[2] + 0.17, 0, -0.25);
  const zero = painted('yaHvZero', 96, 56, (c) => {
    c.fillStyle = '#0d1a14';
    c.fillRect(0, 0, 96, 56);
    text(c, '0.00kg', 90, 28, 18, '#66ff99', 'right');
  });
  const full = painted('yaHvFull', 96, 56, (c) => {
    c.fillStyle = '#0d1a14';
    c.fillRect(0, 0, 96, 56);
    text(c, '4.82kg', 90, 28, 18, '#ffd54f', 'right');
  });
  read.set(zero);
  // The box and what's laid in it.
  const boxG = styroBox(g);
  boxG.position.set(bx[0], bx[1] - 0.04, bx[2]);
  part(boxG, box(0.5, 0.05, 0.3), '#e4f3f7', 0, 0.04, 0, { outline: false });
  const inBox = [0, 1, 2, 3].map((i) => {
    const f = flounder(boxG, 0.34);
    f.position.set(-0.08 + i * 0.05, 0.08 + i * 0.02, -0.06 + (i % 2) * 0.1);
    f.rotation.y = i % 2 ? 0.18 : -0.12;
    return f;
  });
  const lid = styroLid(g);
  const seal = part(g, box(0.58, 0.003, 0.05), '#f2c94c', bx[0], bx[1] + 0.214, bx[2] + 0.04, { outline: false, shadow: false });
  // The fish carrier: a blue basket with its fish, on the floor until it's hauled up.
  const carrier = group(g);
  part(carrier, rbox(0.56, 0.24, 0.4, 0.03), '#2f80c9', 0, 0.12, 0);
  part(carrier, box(0.5, 0.01, 0.34), TANKW, 0, 0.245, 0, { outline: false });
  for (const s of [-1, 1]) part(carrier, box(0.06, 0.06, 0.14), '#1b5e94', s * 0.3, 0.2, 0, { outline: false });
  const inCarrier = [0, 1, 2, 3].map((i) => {
    const f = flounder(carrier, 0.3);
    f.position.set(-0.12 + (i % 2) * 0.2, 0.25, -0.08 + (i > 1 ? 0.16 : 0));
    f.rotation.y = i * 1.1;
    return f;
  });
  const fish = flounder(g, 0.34);
  const tape = group(g);
  torus(tape, 0.05, 0.016, '#f2c94c', 0, 0, 0);
  part(tape, box(0.03, 0.05, 0.02), RED, 0.05, 0.03, 0, { outline: false });
  const tablet = group(g);
  part(tablet, rbox(0.22, 0.015, 0.16, 0.006), BLACK, 0, 0, 0);
  const tabPic = swapPic(tablet, 0.19, 0.13, 0, 0.01, 0, 0, -Math.PI / 2);
  const tabLive = live(160, 110);
  const helper = person(g, LOOKS.hand, HV.helper[0], HV.helper[1], 0, 'male', '#00838f');
  const buyer = person(g, LOOKS.buyer, HV.buyer[0], HV.buyer[1], -Math.PI / 2 - 0.1, 'male');
  const spots: Record<string, Spot> = {
    harvestFish: standAt(g, 'yaHarvest', HV.stand),
    fishFarmer_findBuyer: standAt(g, 'yaBuyer', HV.stand),
  };
  spots['*'] = spots.harvestFish;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const inBoxN = now === 'fishFarmer_findBuyer' ? 4 : Math.round(n.boxN ?? 0);
    inBox.forEach((f, i) => (f.visible = i < inBoxN));
    at(carrier, P.carrier, now === 'harvestFish' ? HV.carrier : HV.floor);
    const left = now === 'harvestFish' ? Math.round(n.left ?? 4) : 4;
    inCarrier.forEach((f, i) => (f.visible = i < left));
    at(fish, P.fish);
    read.set(now === 'fishFarmer_findBuyer' || (n.kilos ?? 0) > 0.5 ? full : zero);
    at(lid, P.lid, now === 'harvestFish' && (n.lid ?? 0) > 0.5 ? add(bx, 0, 0.2, 0) : add(bx, 0.28, 0.1, 0.2));
    seal.visible = (now === 'harvestFish' && (n.taped ?? 0) > 0.5);
    at(tape, P.tape, HV.tape);
    at(tablet, P.tablet);
    if (P.tablet) {
      tablet.rotation.x = -0.5;
      tabPic.set(tabLive((c) => {
        c.fillStyle = '#f5f7f7';
        c.fillRect(0, 0, 160, 110);
        text(c, '전복·광어 납품', 80, 18, 15, INK, 'center');
        const s = n.sum ?? 0;
        text(c, `월 ${Math.round(40 * s)}상자`, 80, 52, 18, NAVY, 'center');
        text(c, (n.deal ?? 0) > 0.5 ? '계약 확정' : '견적 중', 80, 86, 16, (n.deal ?? 0) > 0.5 ? '#2e7d32' : ORANGE, 'center');
      }));
    }
    helper.root.visible = now === 'harvestFish';
    if (helper.root.visible) {
      helper.opts.nod = 0.3 + 0.1 * Math.sin(t) + 0.2 * (n.hNod ?? 0);
      const p = P.carrier ?? HV.carrier;
      helper.armL(tmp.set(p[0] - 0.22, p[1] + 0.2, p[2] - 0.2).clone());
      helper.armR(tmp.set(p[0] + 0.22, p[1] + 0.2, p[2] - 0.2).clone());
    }
    buyer.root.visible = now === 'fishFarmer_findBuyer';
    if (buyer.root.visible) {
      buyer.opts.nod = 0.08 + 0.28 * (n.bNod ?? 0);
      buyer.armL(null);
      buyer.armR((n.bHand ?? 0) > 0.05 ? tmp.set(HV.shake[0], HV.shake[1], HV.shake[2]).clone() : null);
    }
  });
  out.work = marker(g, 0, HV.top + 0.05, 0);
}

// =============================================================================================
// 가두리 해상 통로 (yaPens, 5 × 2).

function penNet(g: THREE.Object3D, r: number, y: number, x: number, z: number) {
  const tex = painted('yaNetWhole', 256, 128, (c) => {
    c.clearRect(0, 0, 256, 128);
    c.strokeStyle = '#7fb8a0';
    c.lineWidth = 2;
    for (let i = -128; i < 384; i += 14) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 128, 128);
      c.moveTo(i, 128);
      c.lineTo(i + 128, 0);
      c.stroke();
    }
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.5, 28, 1, true), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function pensPiece(g: THREE.Group, out: Built) {
  const D = PN.deck;
  // The sea under this piece, carrying on from the front water beside it.
  const Z0 = -5;
  const Z1 = 1;
  part(g, box(5, 0.02, Z1 - Z0), SEA, 0, 0.01, (Z0 + Z1) / 2, { outline: false, shadow: false });
  part(g, box(5, 0.002, 1.8), SEA_D, 0, 0.022, -3.6, { outline: false, shadow: false });
  part(g, box(5, 0.14, 0.2), CONCRETE_L, 0, 0.07, Z1 + 0.02);
  // The gangway, cut across the wall, down to the walkway.
  const gz0 = PN.walkZ - 0.2;
  const gz1 = 1.1;
  const gang = group(g, PN.gangX, (0.14 + D) / 2, (gz0 + gz1) / 2);
  gang.rotation.x = Math.atan2(D - 0.14, gz0 - gz1);
  part(gang, box(0.6, 0.03, Math.hypot(gz0 - gz1, D - 0.14)), WOOD, 0, 0, 0);
  for (const s of [-1, 1]) {
    rod(g, v3(PN.gangX + s * 0.32, 0.72, 1.05), v3(PN.gangX + s * 0.32, D + 0.62, gz0 + 0.1), 0.012, CHROME);
    rod(g, v3(PN.gangX + s * 0.32, 0.12, 1.05), v3(PN.gangX + s * 0.32, 0.72, 1.05), 0.012, CHROME);
    rod(g, v3(PN.gangX + s * 0.32, D, gz0 + 0.1), v3(PN.gangX + s * 0.32, D + 0.62, gz0 + 0.1), 0.012, CHROME);
  }
  // The floating walkway: planks on drums, along the front of both pens.
  const x0 = -4.3;
  const x1 = 1.9;
  const wx = (x0 + x1) / 2;
  const deck = group(g);
  part(deck, box(x1 - x0, 0.03, 0.84), WOOD, wx, D - 0.015, PN.walkZ);
  for (let x = x0 + 0.2; x < x1; x += 0.28) part(deck, box(0.012, 0.004, 0.84), WOOD_D, x, D + 0.001, PN.walkZ, { outline: false, shadow: false });
  for (let x = x0 + 0.5; x < x1; x += 1.2) for (const s of [-1, 1]) part(deck, cyl(0.1, 0.1, 0.5, 10), '#1f6fb0', x, 0.07, PN.walkZ + s * 0.28, { rz: Math.PI / 2, outline: false });
  label(deck, `${FARM} 해상 가두리`, 1.1, 0.13, PN.gangX - 0.7, D + 0.012, PN.walkZ + 0.28, WOOD, '#ffffff').rotation.set(-Math.PI / 2, 0, 0);
  // Two round pens: a float ring, a handrail on stanchions, a net hanging in.
  const netsUp: THREE.Mesh[] = [];
  PN.pens.forEach(([px, pz], i) => {
    const pen = group(g);
    torus(pen, PN.penR, 0.055, '#1b1f22', px, D - 0.02, pz, { rx: Math.PI / 2 });
    torus(pen, PN.penR + 0.1, 0.055, '#1b1f22', px, D - 0.02, pz, { rx: Math.PI / 2 });
    torus(pen, PN.penR + 0.05, 0.022, '#37474f', px, PN.rim, pz, { rx: Math.PI / 2 });
    for (let a = 0; a < 12; a++) {
      const k = (a / 12) * Math.PI * 2;
      part(pen, cyl(0.012, 0.012, PN.rim - D + 0.05, 6), '#37474f', px + (PN.penR + 0.05) * Math.cos(k), (PN.rim + D) / 2, pz + (PN.penR + 0.05) * Math.sin(k), { outline: false });
    }
    penNet(pen, PN.penR, 0.28, px, pz);
    const w = waterDisc(pen, PN.penR - 0.03, PN.sea + 0.002, '#357a8f', 0.42, px, pz);
    w.renderOrder = 1;
    // The part of the net hauled up towards the walkway.
    const up = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), new THREE.MeshBasicMaterial({ map: painted('yaNetFlat', 128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      c.strokeStyle = '#7fb8a0';
      c.lineWidth = 2;
      for (let j = -128; j < 256; j += 14) {
        c.beginPath();
        c.moveTo(j, 0);
        c.lineTo(j + 128, 128);
        c.moveTo(j, 128);
        c.lineTo(j + 128, 0);
        c.stroke();
      }
    }), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    up.userData.ownGeometry = up.userData.ownMaterial = true;
    up.position.set(px, 0.2, pz + PN.penR + 0.02);
    if (i === 0) {
      up.visible = false;
      g.add(up);
      netsUp.push(up);
    }
  });
  // Fish going round in each pen, feed on the water, one floating belly up.
  const fishes = PN.pens.flatMap(([px, pz], i) =>
    Array.from({ length: 8 }, (_, k) => {
      const f = flounder(g, 0.3);
      return { f, px, pz, a: k * 0.8 + i, r: 0.3 + (k % 4) * 0.18, pen: i };
    }),
  );
  const mort = flounder(g, 0.3, '#c9bda6');
  mort.rotation.x = Math.PI;
  mort.position.set(PN.pens[0][0] - 0.34, PN.sea + 0.03, -1.5);
  const scatter = pellets(g, 16);
  const splash = puffs(g, 8, '#f0fcff', 0.026);
  // The dip net, the scoop in the feed bucket, the pail for what's dipped out.
  const { root: dip, fish: dipFish } = handNet(g, '#7fb8a0');
  const dipHandle = limb(g, 0.008, '#607d8b');
  const scoop = group(g);
  part(scoop, cyl(0.05, 0.04, 0.05, 10), '#90a4ae', 0, 0, 0);
  const bk = PN.bucket;
  part(g, cyl(0.15, 0.12, 0.26, 12), '#eceff1', bk[0], bk[1] + 0.13, bk[2]);
  part(g, cyl(0.135, 0.135, 0.01, 12), '#8a6a3f', bk[0], bk[1] + 0.262, bk[2], { outline: false });
  const inPail = flounder(g, 0.2, '#c9bda6');
  inPail.position.set(bk[0] - 0.36, bk[1] + 0.25, bk[2]);
  part(g, cyl(0.12, 0.1, 0.22, 12), '#546e7a', bk[0] - 0.36, bk[1] + 0.11, bk[2]);
  // The cleat and the far pen's mooring line, going off to its buoy.
  const mo = PN.moor;
  part(g, box(0.16, 0.05, 0.05), BLACK, mo[0], D + 0.03, mo[2]);
  const line = limb(g, 0.009, ROPE);
  const buoy = group(g, mo[0] - 1.6, 0.03, -1.0);
  part(buoy, ball(0.16), ORANGE, 0, 0.09, 0);
  // A little box on the rail, numbers no one's going to read from here but the pen's name.
  for (const [i, [px]] of PN.pens.entries()) label(g, `${i + 1}번 가두리`, 0.5, 0.11, px, PN.rim - 0.14, PN.walkZ - 0.44, '#37474f', '#ffffff');
  const spots: Record<string, Spot> = { yaWalkPens: standAt(g, 'yaPens', 1.3) };
  spots['*'] = spots.yaWalkPens;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const bob = 0.012 * Math.sin(t * 1.1);
    deck.position.y = bob;
    const rise = n.rise ?? 0;
    fishes.forEach((o, k) => {
      const a = t * 0.2 * (k % 2 ? 1 : -1) + o.a;
      let x = o.px + o.r * Math.cos(a);
      let z = o.pz + o.r * Math.sin(a);
      let y = PN.sea - 0.02 + 0.01 * Math.sin(t + k);
      if (o.pen === 0 && rise > 0) {
        const tx = (n.tx ?? o.px) + 0.2 * Math.sin(k * 3.1 + t);
        const tz = (n.tz ?? o.pz) + 0.2 * Math.cos(k * 1.9 + t);
        x += (tx - x) * rise;
        z += (tz - z) * rise;
        y += 0.05 * rise * Math.abs(Math.sin(t * 8 + k));
      }
      o.f.position.set(x, y, z);
      o.f.rotation.y = -a + (k % 2 ? -Math.PI / 2 : Math.PI / 2);
      o.f.rotation.z = 0.1 * Math.sin(t * 3 + k);
    });
    scatter(n.toss ?? 0, P.scoop, n.tx ?? 0, PN.sea, n.tz ?? 0);
    splash(rise, n.tx ?? PN.pens[0][0], PN.sea, n.tz ?? PN.pens[0][1], 0.2, t * 1.6, 0.18);
    netsUp[0].visible = (n.netUp ?? 0) > 0.03;
    netsUp[0].position.y = 0.06 + 0.42 * (n.netUp ?? 0);
    mort.visible = N ? (n.mort ?? 1) > 0.5 : true;
    mort.position.y = PN.sea + 0.03 + bob;
    at(dip, P.dip);
    if (P.dip) {
      const hold = P.grip ?? add(P.dip, 0.3, 1.1, 0.8);
      dipHandle(tmp.set(P.dip[0] + 0.1, P.dip[1] + 0.03, P.dip[2] + 0.06).clone(), tmp.set(hold[0], hold[1], hold[2]).clone());
      dipFish.visible = (n.caught ?? 0) > 0.5;
    } else dipHandle(tmp.set(bk[0], bk[1] + 0.04, bk[2] - 0.3).clone(), tmp.set(bk[0] + 0.3, bk[1] + 0.06, bk[2] - 0.3).clone());
    inPail.visible = N ? (n.inBucket ?? 0) > 0.5 : false;
    at(scoop, P.scoop, add(bk, 0, 0.27, 0));
    line(tmp.set(mo[0], D + 0.05, mo[2]).clone(), tmp.set(mo[0] - 1.6, 0.14 + 0.12 * (n.slack ?? 0), -1.0).clone());
    buoy.position.y = 0.03 + 0.012 * Math.sin(t * 1.2);
  });
  out.work = marker(g, PN.gangX, 0.8, 0.9);
}

// =============================================================================================
// 사료 창고 (yaFeedStore, 2 × 2).

function feedStore(g: THREE.Group, out: Built) {
  // The silo on legs at the back, its cone and its ladder, an auger running down to the low hopper.
  const sx = -0.3;
  const sz = -0.5;
  for (const a of [0.8, 2.35, 3.9, 5.5]) rod(g, v3(sx + 0.42 * Math.cos(a), 0, sz + 0.42 * Math.sin(a)), v3(sx + 0.44 * Math.cos(a), 1.0, sz + 0.44 * Math.sin(a)), 0.03, '#78909c');
  part(g, cyl(0.46, 0.16, 0.5, 18), '#cfd8dc', sx, 0.78, sz);
  part(g, cyl(0.46, 0.46, 1.5, 18), '#d7dee1', sx, 1.77, sz);
  part(g, cyl(0.0, 0.48, 0.28, 18), '#b0bec5', sx, 2.66, sz);
  for (let y = 1.1; y < 2.5; y += 0.5) torus(g, 0.46, 0.008, '#90a4ae', sx, y, sz, { rx: Math.PI / 2 });
  label(g, '사료 사일로', 0.6, 0.12, sx, 2.0, sz + 0.462, '#d7dee1', NAVY);
  for (let y = 0.5; y < 2.5; y += 0.25) part(g, box(0.2, 0.012, 0.012), '#607d8b', sx + 0.44, y, sz + 0.14, { outline: false });
  // The low hopper, its window showing the level.
  const hp = FS.hopper;
  part(g, cyl(0.28, 0.2, 0.42, 14), '#90a4ae', hp[0], hp[1] - 0.22, hp[2]);
  for (const a of [0.8, 2.35, 3.9, 5.5]) part(g, box(0.035, hp[1] - 0.42, 0.035), '#607d8b', hp[0] + 0.2 * Math.cos(a), (hp[1] - 0.42) / 2, hp[2] + 0.2 * Math.sin(a));
  const fill = part(g, cyl(0.255, 0.255, 0.01, 14), '#8a6a3f', hp[0], hp[1] - 0.2, hp[2], { outline: false });
  torus(g, 0.285, 0.012, '#607d8b', hp[0], hp[1], hp[2], { rx: Math.PI / 2 });
  // The auger up to the silo's cone, with a screw that shows while it turns.
  rod(g, v3(hp[0], hp[1] - 0.4, hp[2] - 0.04), v3(sx, 1.6, sz + 0.46), 0.05, '#78909c');
  const screw = group(g, sx + (hp[0] - sx) / 2, 1.14, sz + 0.47);
  for (let i = 0; i < 4; i++) part(screw, box(0.16, 0.02, 0.02), YELLOW, 0, 0, 0, { rz: (i * Math.PI) / 4, outline: false });
  // The panel on its post, its lamp.
  const pa = FS.panel;
  part(g, box(0.05, pa[1], 0.05), '#607d8b', pa[0] + 0.1, pa[1] / 2, pa[2]);
  part(g, rbox(0.24, 0.28, 0.06, 0.012), '#37474f', pa[0], pa[1], pa[2]);
  const lamp = ownLit(g, ball(0.018), '#2a3b1a', pa[0] - 0.05, pa[1] + 0.08, pa[2] + 0.034);
  part(g, cyl(0.02, 0.02, 0.012, 10), '#2e7d32', pa[0] + 0.05, pa[1] - 0.04, pa[2] + 0.034, { rx: Math.PI / 2, outline: false });
  // The pallet of sacks, the top layer short; the slit one in hand; the knife.
  const sk = FS.sacks;
  part(g, box(0.76, 0.1, 0.76), WOOD, sk[0], 0.05, sk[2]);
  for (let i = 0; i < 3; i++) part(g, box(0.76, 0.012, 0.05), WOOD_D, sk[0], 0.105, sk[2] - 0.3 + i * 0.3, { outline: false });
  const sack = (p: THREE.Object3D, x: number, y: number, z: number, ry = 0) => {
    const m = group(p, x, y, z, ry);
    part(m, rbox(0.52, 0.12, 0.34, 0.04), '#e7dcc0', 0, 0, 0);
    part(m, box(0.36, 0.002, 0.2), '#2f80c9', 0, 0.062, 0, { outline: false });
    return m;
  };
  for (let row = 0; row < 3; row++) for (let i = 0; i < 2; i++) sack(g, sk[0], 0.17 + row * 0.13, sk[2] - 0.17 + i * 0.34, row % 2 ? 0.05 : -0.04);
  const top = sack(g, sk[0], 0.56, sk[2], 0);
  label(g, '광어 사료 3호', 0.5, 0.1, sk[0], 0.32, sk[2] + 0.382, '#e7dcc0', NAVY);
  const carried = sack(g, 0, 0, 0);
  const knife = group(g);
  part(knife, box(0.1, 0.012, 0.024), '#f4b400', 0, 0, 0, { outline: false });
  part(knife, box(0.05, 0.004, 0.012), STEEL, 0.07, 0, 0, { outline: false });
  const spill = puffs(g, 8, '#8a6a3f', 0.012);
  const hum = puffs(g, 3, '#c9c1ae', 0.02);
  const spots: Record<string, Spot> = { yaFillFeeder: standAt(g, 'yaFill', FS.stand) };
  spots['*'] = spots.yaFillFeeder;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const lv = N ? (n.level ?? 0.25) : 0.25;
    fill.position.y = hp[1] - 0.4 + 0.36 * lv;
    fill.scale.setScalar(0.7 + 0.3 * lv);
    top.visible = !N || (n.taken ?? 0) < 0.5;
    at(carried, P.sack);
    if (P.sack) {
      carried.rotation.x = (n.tilt ?? 0) * 1.3;
      carried.scale.y = 1 - 0.55 * (n.empty ?? 0);
    }
    at(knife, P.knife);
    spill((n.flow ?? 0) > 0.5 ? 1 : 0, hp[0], hp[1] + 0.02, hp[2], 0.1, t * 2, -0.06);
    const running = (n.auger ?? 0) > 0.5;
    screw.rotation.x = running ? t * 8 : 0;
    hum(running ? 1 : 0, sx, 2.72, sz, 0.05, t, 0.2);
    setLit(lamp, (n.lit ?? 0) > 0.5 ? '#66ff99' : '#2a3b1a');
  });
  out.work = marker(g, hp[0], hp[1], hp[2]);
}

// =============================================================================================
// 펌프실 (yaPump, 3 × 2).

function pumpUnit(g: THREE.Object3D, x: number, z: number): THREE.Group {
  part(g, box(0.76, 0.1, 0.42), CONCRETE_D, x, 0.05, z);
  part(g, cyl(0.15, 0.15, 0.42, 16), BLUE, x + 0.14, 0.32, z, { rz: Math.PI / 2 });
  for (let i = 0; i < 3; i++) torus(g, 0.15, 0.006, '#0d47a1', x - 0.0 + i * 0.13, 0.32, z, { ry: Math.PI / 2 });
  part(g, cyl(0.17, 0.17, 0.2, 16), '#90a4ae', x - 0.2, 0.32, z, { rz: Math.PI / 2 });
  // The fan at its end, turning behind its guard.
  const fan = group(g, x + 0.38, 0.32, z);
  part(fan, box(0.012, 0.22, 0.04), '#eceff1', 0, 0, 0, { outline: false });
  part(fan, box(0.012, 0.04, 0.22), '#eceff1', 0, 0, 0, { outline: false });
  torus(g, 0.13, 0.01, '#607d8b', x + 0.38, 0.32, z, { ry: Math.PI / 2 });
  return fan;
}
function pumpRoom(g: THREE.Group, out: Built) {
  // A slab, a block back wall and two side stubs, a corrugated roof that stops short of the front.
  part(g, box(2.94, 0.06, 1.94), CONCRETE_L, 0, 0.03, 0);
  part(g, box(2.94, 1.9, 0.12), '#bfc6c4', 0, 0.98, -0.9);
  for (let y = 0.28; y < 1.9; y += 0.28) part(g, box(2.94, 0.006, 0.004), '#a4aaa8', 0, y, -0.838, { outline: false });
  for (const s of [-1, 1]) part(g, box(0.12, 1.6, 0.8), '#bfc6c4', s * 1.41, 0.83, -0.5);
  part(g, box(3.04, 0.05, 1.0), '#5f7d8a', 0, 1.96, -0.48, { rx: 0.1 });
  label(g, '펌프실', 0.68, 0.17, 0, 1.62, -0.836, '#bfc6c4', NAVY);
  label(g, '해수 취수 · 관계자 외 금지', 1.0, 0.1, -0.95, 1.66, -0.836, RED, '#ffffff');
  // The two pumps, their discharge pipes rising and running along the wall, the big valve.
  const fans = [pumpUnit(g, -0.56, -0.18), pumpUnit(g, 0.3, -0.42)];
  rod(g, v3(-0.56, 0.45, -0.18), v3(-0.56, 1.42, -0.6), 0.04, PIPE);
  rod(g, v3(0.3, 0.45, -0.42), v3(0.3, 1.42, -0.7), 0.04, PIPE);
  rod(g, v3(-1.4, 1.42, -0.72), v3(1.4, 1.42, -0.72), 0.05, PIPE);
  for (const [a, b] of [[-0.56, -0.6], [0.3, -0.7]] as const) rod(g, v3(a, 1.42, b), v3(a, 1.42, -0.72), 0.04, PIPE);
  rod(g, v3(PM.wheel[0], 1.0, -0.1), v3(PM.wheel[0], 1.42, -0.72), 0.04, PIPE);
  rod(g, v3(PM.wheel[0], 1.0, -0.1), v3(PM.wheel[0], 0.2, 0.0), 0.04, PIPE);
  const wh = group(g, PM.wheel[0], PM.wheel[1], PM.wheel[2]);
  torus(wh, 0.13, 0.016, RED, 0, 0, 0);
  for (const a of [0, 2.09, -2.09]) part(wh, box(0.13, 0.012, 0.012), RED, 0.065 * Math.cos(a), 0.065 * Math.sin(a), 0, { rz: a, outline: false });
  // The gauges on the first pump's riser.
  const gp = PM.gauge;
  part(g, box(0.34, 0.2, 0.03), '#37474f', gp[0], gp[1], gp[2] - 0.03);
  const dials = [0, 1].map((i) => {
    const x = gp[0] - 0.08 + i * 0.16;
    part(g, cyl(0.065, 0.065, 0.015, 16), '#fafafa', x, gp[1], gp[2], { rx: Math.PI / 2, outline: false });
    const needle = group(g, x, gp[1], gp[2] + 0.012);
    part(needle, box(0.008, 0.05, 0.002), RED, 0, 0.022, 0, { outline: false });
    return needle;
  });
  // The strainer pot and its basket; the rinse tap over a drain.
  const st = PM.strainer;
  part(g, cyl(0.12, 0.12, st[1] - 0.06, 14), '#90a4ae', st[0], (st[1] + 0.06) / 2, st[2]);
  torus(g, 0.12, 0.012, '#607d8b', st[0], st[1], st[2], { rx: Math.PI / 2 });
  const lidS = part(g, cyl(0.125, 0.125, 0.02, 14), '#546e7a', st[0], st[1] + 0.01, st[2], { outline: false });
  const basket = group(g);
  part(basket, cyl(0.09, 0.07, 0.16, 12), '#b0bec5', 0, 0.06, 0);
  part(basket, box(0.14, 0.012, 0.012), '#37474f', 0, 0.16, 0, { outline: false });
  const crud = part(basket, cyl(0.082, 0.082, 0.01, 12), '#4f5d3f', 0, 0.12, 0, { outline: false });
  rod(g, v3(0.8, 0.86, -0.04), v3(0.8, 1.16, -0.74), 0.016, '#2e7d32');
  const tap = puffs(g, 6, '#d4f1fa', 0.016);
  part(g, box(0.5, 0.012, 0.3), '#8f8c82', 0.8, 0.066, 0.6, { outline: false });
  // The oil can on the floor; the panel.
  const can = group(g);
  part(can, cyl(0.05, 0.06, 0.1, 10), '#c49a22', 0, 0, 0);
  part(can, cyl(0.006, 0.014, 0.1, 6), '#c49a22', 0.04, 0.09, 0, { rz: -0.8, outline: false });
  const pa = PM.panel;
  part(g, rbox(0.36, 0.5, 0.1, 0.012), '#eceff1', pa[0] + 0.02, pa[1], pa[2] - 0.05);
  const lampA = ownLit(g, ball(0.018), '#2a3b1a', pa[0] - 0.05, pa[1] + 0.14, pa[2]);
  const lampB = ownLit(g, ball(0.018), '#66ff99', pa[0] + 0.05, pa[1] + 0.14, pa[2]);
  part(g, cyl(0.03, 0.03, 0.015, 10), RED, pa[0], pa[1] - 0.12, pa[2], { rx: Math.PI / 2, outline: false });
  const spots: Record<string, Spot> = { yaCheckPump: standAt(g, 'yaPump', PM.stand) };
  spots['*'] = spots.yaCheckPump;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    fans.forEach((f, i) => (f.rotation.x = t * (18 + i * 3)));
    const fl = N ? (n.flow ?? 0.5) : 0.8;
    dials.forEach((d, i) => (d.rotation.z = -1.1 * fl + 0.5 + 0.03 * Math.sin(t * 7 + i)));
    wh.rotation.z = N ? (n.wheelA ?? 0) : 0;
    at(basket, P.basket);
    const outNow = (n.out ?? 0) > 0.5;
    lidS.visible = !outNow;
    crud.visible = N ? (n.clean ?? 0) < 0.6 : false;
    tap((n.water ?? 0) > 0.5 ? 1 : 0, 0.8, 0.86, 0.0, 0.015, t * 2.4, -0.2);
    at(can, P.can, PM.can);
    setLit(lampA, (n.lit ?? 0) > 0.5 ? '#ffd54f' : '#2a3b1a');
    setLit(lampB, Math.sin(t * 2.6) > -0.6 ? '#66ff99' : '#2e7d32');
  });
  out.work = marker(g, PM.wheel[0], PM.wheel[1], PM.wheel[2]);
}

// =============================================================================================
// 치어 부화 선반 (yaHatchery, 3 × 1).

function hatchery(g: THREE.Group, out: Built) {
  // The rack: steel uprights, three tiers of shallow trays, a lamp strip and a drip line over each.
  for (const x of [-1.4, 0, 1.4]) for (const z of [-0.3, 0.26]) part(g, box(0.05, 1.76, 0.05), '#90a4ae', x, 0.88, z);
  part(g, box(2.94, 0.04, 0.72), '#a9b5ba', 0, 1.78, -0.02);
  label(g, '치어 부화실', 0.84, 0.13, 0, 1.68, 0.305, '#37474f', '#ffffff');
  const trays: Array<{ root: THREE.Group; y: number; x: number }> = [];
  const dots: THREE.Mesh[] = [];
  let s = 41;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const makeTray = (x: number, y: number, withDots: boolean) => {
    const root = group(g, x, y, 0);
    part(root, box(1.32, 0.012, FY.tray), '#d4dadc', 0, 0, -0.02, { outline: false });
    for (const k of [-1, 1]) {
      part(root, box(1.32, 0.08, 0.014), '#d4dadc', 0, 0.04, -0.02 + (k * FY.tray) / 2);
      part(root, box(0.014, 0.08, FY.tray), '#d4dadc', k * 0.66, 0.04, -0.02);
    }
    waterSheet(root, 1.28, FY.tray - 0.03, 0, 0.066, -0.02, '#7fc6d6', 0.55);
    if (withDots) for (let i = 0; i < 30; i++) dots.push(part(root, ball(0.006), '#39352e', -0.56 + rnd() * 1.12, 0.07, -0.22 + rnd() * 0.42, { outline: false, shadow: false }));
    trays.push({ root, y, x });
    return root;
  };
  for (const y of FY.tiers) for (const x of [-0.7, 0.7]) makeTray(x, y, x === 0.7 && y === FY.tiers[1]);
  const pulled = trays[trays.length - 3].root;
  FY.tiers.forEach((y) => {
    ownLit(g, box(2.7, 0.014, 0.05), '#d9f4ff', 0, y + 0.36, 0.02);
    rod(g, v3(-1.34, y + 0.31, -0.2), v3(1.34, y + 0.31, -0.2), 0.01, PVC);
  });
  // The supply pipe up the end, its valve at hand height, its drips; a jar of eggs; the cup.
  rod(g, v3(FY.drip[0], 0.05, -0.2), v3(FY.drip[0], FY.drip[1], -0.2), 0.016, PVC);
  rod(g, v3(FY.drip[0], FY.drip[1], -0.2), v3(FY.drip[0], FY.drip[1], FY.drip[2] - 0.02), 0.012, PVC);
  const valve = group(g, FY.drip[0], FY.drip[1], FY.drip[2]);
  torus(valve, 0.028, 0.006, BLUE, 0, 0, 0);
  const drips = FY.tiers.map(() => puffs(g, 3, '#d4f1fa', 0.009));
  const jarM = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.55, depthWrite: false });
  const jar = new THREE.Mesh(cyl(0.07, 0.07, 0.22, 12), jarM);
  jar.userData.ownMaterial = true;
  jar.position.set(-1.1, FY.tiers[0] + 0.15, 0.14);
  g.add(jar);
  label(g, '수정란', 0.16, 0.05, -1.1, FY.tiers[0] + 0.03, 0.222, PAPER, INK);
  const cup = group(g);
  const cupM = new THREE.MeshBasicMaterial({ color: '#d6f1f7', transparent: true, opacity: 0.55, depthWrite: false });
  const cupG = new THREE.Mesh(cyl(0.04, 0.035, 0.09, 10), cupM);
  cupG.userData.ownMaterial = true;
  cup.add(cupG);
  for (let i = 0; i < 6; i++) part(cup, ball(0.004), '#39352e', 0.02 * Math.sin(i * 3), -0.02 + i * 0.006, 0.02 * Math.cos(i * 3), { outline: false, shadow: false });
  const pipette = part(g, cyl(0.004, 0.009, 0.16, 6), PVC, 0, 0, 0, { outline: false });
  const clip = clipMesh(g, logTex('yaFryLog', '치어 수'), 0.18, 0.24);
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { yaTendFry: standAt(g, 'yaFry', FY.stand) };
  spots['*'] = spots.yaTendFry;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    pulled.position.z = FY.drawZ * (n.draw ?? 0);
    dots.forEach((d, i) => {
      d.position.x += 0.0008 * Math.sin(t * 1.3 + i * 2);
      d.position.z += 0.0006 * Math.cos(t * 1.1 + i);
      d.visible = !N || i / dots.length < 1 - 0.14 * (n.thin ?? 0);
    });
    at(cup, P.cup, FY.cup);
    at(pipette, P.pipette);
    at(clip, P.clip);
    at(pen, P.pen);
    valve.rotation.z = (n.drip ?? 0) * 3;
    const rate = N ? (n.drip ?? 0.6) : 0.6;
    FY.tiers.forEach((y, i) => drips[i](rate, 0.3, y + 0.28, -0.2, 0.3, t * (0.8 + rate) + i, -0.17));
  });
  out.work = marker(g, 0.1, FY.tiers[1] + 0.05, FY.drawZ);
}

// =============================================================================================
// 선별대 (yaGrade, 3 × 1).

function gradeTable(g: THREE.Group, out: Built) {
  // Two long rails sloping down towards +x, spreading apart as they go, on a frame; the fish falls where it fits.
  for (const x of [-1.2, -0.3, 0.6]) for (const z of [-0.26, 0.26]) part(g, box(0.04, GR.rail - 0.08, 0.04), '#90a4ae', x, (GR.rail - 0.08) / 2, z);
  part(g, box(1.9, 0.03, 0.6), '#a9b5ba', -0.3, 0.22, 0, { outline: false });
  for (let i = -3; i <= 3; i++) {
    const zA = i * 0.03;
    const zB = i * 0.07;
    rod(g, v3(-1.0, GR.rail + 0.06, zA), v3(0.98, GR.rail - 0.1, zB), 0.008, CHROME);
  }
  rod(g, v3(-1.04, GR.rail + 0.02, -0.26), v3(1.0, GR.rail - 0.14, -0.26), 0.012, STEEL);
  rod(g, v3(-1.04, GR.rail + 0.02, 0.26), v3(1.0, GR.rail - 0.14, 0.26), 0.012, STEEL);
  // A hopper of fish at the top end on a stand; three tubs below labelled.
  const bk = GR.bucket;
  part(g, cyl(0.2, 0.17, 0.26, 14), '#2f80c9', bk[0], bk[1] - 0.04, bk[2]);
  part(g, cyl(0.185, 0.185, 0.008, 14), TANKW, bk[0], bk[1] + 0.09, bk[2], { outline: false });
  part(g, box(0.34, bk[1] - 0.17, 0.3), '#78909c', bk[0], (bk[1] - 0.17) / 2, bk[2]);
  const inBucket = Array.from({ length: 5 }, (_, i) => {
    const f = flounder(g, 0.16);
    f.position.set(bk[0] - 0.08 + (i % 3) * 0.08, bk[1] + 0.1, bk[2] - 0.06 + (i % 2) * 0.12);
    f.rotation.y = i * 1.3;
    return f;
  });
  const tubFish = GR.tubs.map((x, i) => {
    part(g, cyl(0.26, 0.2, GR.tubY, 14), ['#26a69a', '#ffb300', '#ef6c00'][i], x, GR.tubY / 2 + 0.24, 0);
    part(g, cyl(0.24, 0.24, 0.008, 14), TANKW, x, GR.tubY + 0.24, 0, { outline: false });
    label(g, ['소', '중', '대'][i], 0.14, 0.08, x, GR.tubY + 0.08, 0.215, PAPER, INK);
    return Array.from({ length: 3 }, (_, k) => {
      const f = flounder(g, 0.14 + i * 0.04);
      f.position.set(x - 0.08 + k * 0.08, GR.tubY + 0.25, -0.06 + (k % 2) * 0.12);
      f.rotation.y = k * 1.7;
      return f;
    });
  });
  // The ruler board, the tally on its stand with a pen, a sign.
  const ru = GR.ruler;
  part(g, box(0.5, 0.012, 0.12), '#f6efd8', ru[0], ru[1], ru[2]);
  for (let i = 0; i < 10; i++) part(g, box(0.003, 0.002, 0.04), INK, ru[0] - 0.22 + i * 0.05, ru[1] + 0.007, ru[2] - 0.03, { outline: false, shadow: false });
  part(g, box(0.02, 0.02, 0.12), '#546e7a', ru[0] - 0.26, ru[1] + 0.012, ru[2], { outline: false });
  // The ruler rests on brackets out from the rails.
  rod(g, v3(ru[0], ru[1] - 0.02, ru[2] - 0.08), v3(ru[0], GR.rail - 0.04, 0.26), 0.008, '#607d8b');
  const ta = GR.tally;
  part(g, box(0.04, ta[1], 0.04), '#78909c', ta[0], ta[1] / 2, ta[2] - 0.05);
  const tally = group(g, ta[0], ta[1], ta[2]);
  tally.rotation.x = -0.4;
  part(tally, box(0.22, 0.28, 0.008), WOOD_D, 0, 0, 0, { outline: false });
  picture(tally, logTex('yaGradeLog', '선별 기록'), 0.2, 0.26, 0, 0, 0.006);
  const ticks = Array.from({ length: 5 }, (_, i) => part(tally, box(0.11, 0.004, 0.002), INK, 0.01, 0.06 - i * 0.03, 0.009, { outline: false, shadow: false }));
  const pen = penMesh(g);
  signPost(g, '크기 선별', -1.34, -0.32, 0.46, 1.25, '#00838f');
  const fish = flounder(g, 0.2);
  const spots: Record<string, Spot> = { yaGradeFish: standAt(g, 'yaGrade', GR.stand) };
  spots['*'] = spots.yaGradeFish;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(fish, P.fish);
    fish.scale.setScalar(0.8 + 0.3 * (n.kind ?? 0));
    tubFish.forEach((list, i) => {
      const c = N ? (n[`t${i}`] ?? 0) + 1 : 2;
      list.forEach((f, k) => (f.visible = k < c));
    });
    const moved = N ? Math.round((n.t0 ?? 0) + (n.t1 ?? 0) + (n.t2 ?? 0)) : 0;
    inBucket.forEach((f, i) => (f.visible = i >= moved));
    at(pen, P.pen);
    ticks.forEach((m, i) => (m.visible = N ? (i + 1) / 5 <= (n.ticks ?? 0) + 0.02 : true));
  });
  out.work = marker(g, -0.2, GR.rail, 0.1);
}

// =============================================================================================
// 포장·얼음 작업대 (yaShip, 3 × 1).

function shipBench(g: THREE.Group, out: Built) {
  // The bench in the middle, the chest of flake ice on the left of it, empties beyond; the pallet on the right.
  part(g, box(1.7, 0.04, 0.66), STEEL, -0.2, SP.box[1] - 0.02, 0.02);
  for (const x of [-0.98, 0.58]) for (const z of [-0.26, 0.3]) part(g, box(0.05, SP.box[1] - 0.04, 0.05), '#90a4ae', x, (SP.box[1] - 0.04) / 2, z);
  part(g, box(1.6, 0.03, 0.56), '#90a4ae', -0.2, 0.22, 0.02, { outline: false });
  const ic = SP.ice;
  part(g, rbox(0.52, 0.22, 0.44, 0.02), '#2f80c9', ic[0], SP.box[1] + 0.1, ic[2] - 0.02);
  part(g, box(0.46, 0.015, 0.38), '#f2fbff', ic[0], SP.box[1] + 0.21, ic[2] - 0.02, { outline: false });
  label(g, '얼음', 0.22, 0.08, ic[0], SP.box[1] + 0.08, ic[2] + 0.204, '#2f80c9', '#ffffff');
  for (let i = 0; i < 3; i++) styroBox(g).position.set(SP.empties[0], 0.03 + i * 0.205, SP.empties[2]);
  // Bagged fish, oxygen-filled, waiting.
  const bag = (p: THREE.Object3D): THREE.Group => {
    const b = group(p);
    const clear = new THREE.MeshBasicMaterial({ color: '#d4f1fa', transparent: true, opacity: 0.55, depthWrite: false });
    const m = new THREE.Mesh(ball(0.1), clear);
    m.userData.ownMaterial = true;
    m.scale.set(1.5, 0.75, 1);
    b.add(m);
    const f = flounder(b, 0.2);
    f.position.y = -0.03;
    return b;
  };
  bag(g).position.set(SP.bags[0], SP.bags[1], SP.bags[2]);
  bag(g).position.set(SP.bags[0] - 0.02, SP.bags[1] + 0.11, SP.bags[2] + 0.02);
  // The pallet, boxes on it, and a list stuck to the post.
  const pa = SP.pallet;
  part(g, box(0.76, 0.1, 0.7), WOOD, pa[0], 0.05, pa[2]);
  const onPallet = [0, 1, 2].map((i) => {
    const b = styroBox(g);
    b.position.set(pa[0], 0.1 + i * SP.layer, pa[2]);
    styroLid(b).position.y = 0.205;
    part(b, box(0.58, 0.003, 0.05), '#f2c94c', 0, 0.222, 0.04, { outline: false, shadow: false });
    return b;
  });
  part(g, box(0.03, 1.28, 0.03), '#607d8b', pa[0] - 0.38, 0.64, -0.3);
  label(g, '출하', 0.42, 0.13, pa[0] - 0.18, 1.2, -0.3, NAVY, '#ffffff');
  // The working box, and everything for it.
  const boxG = styroBox(g);
  const ice1 = part(boxG, box(0.5, 0.05, 0.3), '#f2fbff', 0, 0.04, 0, { outline: false });
  const inside = bag(boxG);
  inside.position.y = 0.1;
  const ice2 = part(boxG, box(0.5, 0.05, 0.3), '#f2fbff', 0, 0.15, 0, { outline: false });
  const lid = styroLid(g);
  const seal = part(g, box(0.58, 0.003, 0.05), '#f2c94c', 0, 0, 0, { outline: false, shadow: false });
  const tag = part(g, box(0.16, 0.1, 0.003), PAPER, 0, 0, 0, { outline: false, shadow: false });
  const scoop = group(g);
  part(scoop, cyl(0.07, 0.05, 0.1, 10), '#90a4ae', 0, 0, 0);
  part(scoop, cyl(0.012, 0.012, 0.1, 6), '#546e7a', 0.1, 0.02, 0, { rz: Math.PI / 2, outline: false });
  const tape = group(g);
  torus(tape, 0.05, 0.016, '#f2c94c', 0, 0, 0);
  const shower = puffs(g, 8, '#f2fbff', 0.02);
  const inHand = bag(g);
  const spots: Record<string, Spot> = { yaPackIce: standAt(g, 'yaPack', SP.stand) };
  spots['*'] = spots.yaPackIce;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(boxG, P.box);
    const f = n.fill ?? 0;
    ice1.scale.y = Math.max(0.02, Math.min(1, f * 2));
    ice1.position.y = 0.025 + 0.025 * Math.min(1, f * 2);
    ice1.visible = f > 0.01;
    ice2.visible = f > 0.55;
    inside.visible = (n.bagged ?? 0) > 0.5;
    at(lid, P.lid);
    const hasTop = !!P.box;
    seal.visible = hasTop && (n.taped ?? 0) > 0.4;
    if (P.box) {
      seal.position.set(P.box[0], P.box[1] + 0.224, P.box[2] + 0.04);
      tag.position.set(P.box[0] + 0.08, P.box[1] + 0.13, P.box[2] + 0.186);
    }
    tag.visible = hasTop && (n.label ?? 0) > 0.5;
    at(scoop, P.scoop, add(ic, 0.12, 0.27, 0));
    shower((n.pour ?? 0) > 0.5 ? 1 : 0, SP.box[0], SP.box[1] + 0.28, SP.box[2], 0.1, t * 2, -0.14);
    at(tape, P.tape, add(SP.box, 0.42, 0.04, 0.2));
    at(inHand, P.bag);
    onPallet[2].visible = !N || (n.stacked ?? 0) > 0.5;
  });
  out.work = marker(g, SP.box[0], SP.box[1], SP.box[2]);
}

// =============================================================================================
// 체험 수조 (yaVisit, 3 × 1).

function visitTub(g: THREE.Group, out: Built) {
  // A long low wooden tub on a rubber mat, shells and starfish in it for small hands; a board; a net bucket.
  part(g, box(2.9, 0.012, 0.9), '#39424a', 0, 0.006, 0.04, { outline: false });
  const W = 2.3;
  const D = 0.62;
  const z0 = -0.04;
  part(g, box(W, 0.06, D), WOOD_D, -0.14, 0.05, z0);
  for (const s of [-1, 1]) {
    part(g, box(W, VT.rim - 0.08, 0.05), WOOD, -0.14, (VT.rim + 0.08) / 2, z0 + (s * (D - 0.05)) / 2);
    part(g, box(0.05, VT.rim - 0.08, D), WOOD, -0.14 + (s * (W - 0.05)) / 2, (VT.rim + 0.08) / 2, z0);
  }
  for (const y of [0.18, 0.34]) part(g, box(W + 0.01, 0.008, D + 0.01), WOOD_D, -0.14, y, z0, { outline: false, shadow: false });
  part(g, box(W - 0.1, 0.01, D - 0.1), '#d9c9a6', -0.14, 0.09, z0, { outline: false });
  const water = waterSheet(g, W - 0.1, D - 0.1, -0.14, VT.water, z0, '#6ab7c7', 0.5);
  // Starfish, shells and a sea cucumber on the sand.
  let s = 29;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 5 }, (_, i) => {
    const m = group(g, -1.0 + i * 0.44, 0.11, z0 - 0.12 + rnd() * 0.24, rnd() * 3);
    for (let k = 0; k < 5; k++) {
      const a = group(m);
      a.rotation.y = (k / 5) * Math.PI * 2;
      part(a, box(0.07, 0.012, 0.022), '#e86f3c', 0.035, 0, 0, { outline: false });
    }
    return m;
  });
  for (let i = 0; i < 7; i++) abalone(g, -1.1 + rnd() * 1.9, 0.115, z0 - 0.18 + rnd() * 0.36);
  const cuc = part(g, ball(0.03), '#3d3a34', 0.3, 0.12, z0 + 0.08, { outline: false });
  cuc.scale.set(2.4, 0.8, 1);
  // Drift on the water, the skimmer on the rim.
  const leaves = Array.from({ length: 5 }, (_, i) => part(g, box(0.04, 0.003, 0.025), '#7c8f4f', -0.8 + i * 0.36, VT.water + 0.004, z0 - 0.1 + (i % 2) * 0.2, { ry: i * 1.1, outline: false, shadow: false }));
  const skim = group(g);
  torus(skim, 0.09, 0.006, '#37474f', 0, 0, 0, { rx: Math.PI / 2 });
  rod(skim, v3(0.06, 0.02, 0.04), v3(0.06, 0.42, 0.24), 0.006, '#37474f');
  // The hose on its reel; the board about what's in the tub.
  part(g, cyl(0.14, 0.14, 0.05, 16), BLUE, VT.hose[0], 0.16, VT.hose[2], { rx: Math.PI / 2 });
  torus(g, 0.13, 0.016, '#2e7d32', VT.hose[0], 0.16, VT.hose[2] + 0.03);
  const nozzle = part(g, cyl(0.012, 0.018, 0.1, 8), '#2e7d32', 0, 0, 0, { outline: false });
  const pipe = limb(g, 0.008, '#2e7d32');
  const stream = puffs(g, 6, '#d4f1fa', 0.016);
  const sn = VT.sign;
  part(g, box(0.05, sn[1] + 0.2, 0.05), WOOD_D, sn[0] - 0.22, (sn[1] + 0.2) / 2, sn[2] - 0.02);
  part(g, box(0.05, sn[1] + 0.2, 0.05), WOOD_D, sn[0] + 0.22, (sn[1] + 0.2) / 2, sn[2] - 0.02);
  picture(g, painted('yaVisitSign', 256, 150, (c) => {
    c.fillStyle = '#fbf3df';
    c.fillRect(0, 0, 256, 150);
    text(c, '만져 보아요', 128, 26, 24, NAVY, 'center');
    text(c, '불가사리 · 전복 · 해삼', 128, 62, 17, INK, 'center');
    text(c, '살살, 한 손으로 만져요', 128, 92, 15, '#6d4c41', 'center');
    text(c, '물빛양식장 체험 학습', 128, 126, 14, '#00838f', 'center');
  }), 0.5, 0.3, sn[0], sn[1], sn[2]);
  const rag = group(g);
  part(rag, box(0.1, 0.03, 0.08), '#e0e6e8', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { yaTidyVisit: standAt(g, 'yaVisit', VT.stand) };
  spots['*'] = spots.yaTidyVisit;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const left = N ? (n.leaves ?? 1) : 0.6;
    leaves.forEach((m, i) => (m.visible = (i + 1) / leaves.length <= left + 0.02));
    at(skim, P.skim, add(VT.skim, -0.04, 0, 0));
    water.position.y = VT.water - 0.02 + 0.02 * (N ? (n.fill ?? 1) : 1);
    stars.forEach((m, i) => (m.rotation.y = i * 0.9 + (n.righted ?? 0) * 0.3 * Math.sin(i)));
    at(nozzle, P.hose, add(VT.hose, 0.02, 0.1, 0.02));
    const h = P.hose ?? add(VT.hose, 0.02, 0.1, 0.02);
    pipe(tmp.set(VT.hose[0], 0.2, VT.hose[2] + 0.03).clone(), tmp.set(h[0], h[1], h[2]).clone());
    stream((n.water ?? 0) > 0.5 ? 1 : 0, h[0], h[1] - 0.04, h[2], 0.012, t * 2.2, -0.18);
    at(rag, P.rag);
  });
  out.work = marker(g, 0, VT.rim, z0);
}

// =============================================================================================
// The 양식동 at its real size (2026-11-05, the layout audit).

/**
 * 넙치 육성 수조 (yaGrowTank, 4 × 4): an 8 m round concrete tank sunk to waist height, the water spinning slowly round
 * the centre drain, a hundred flounder lying flat on the floor and a few lifting off; the auto-feeder on its bridge from
 * the rim spinning out pellets on the hour, the inlet pipe from the seawater main pouring in at the side, two paddle
 * aerators and the air line, the tank's number on its side and the day's board on the rail.
 */
function growTank(g: THREE.Group, out: Built) {
  const R = 1.92;
  const r = 1.8;
  const rim = 0.8;
  const water = 0.66;
  const floor = 0.08;
  const pts: Array<[number, number]> = [[R + 0.03, 0], [R, rim - 0.02], [R - 0.01, rim], [r + 0.01, rim], [r, rim - 0.02], [r - 0.04, floor], [0, floor]];
  const shell = part(g, new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 56), '#c7c4ba', 0, 0, 0, { outline: false });
  shell.userData.ownGeometry = true;
  for (const y of [0.28, 0.56]) torus(g, R + 0.022, 0.005, CONCRETE_D, 0, y, 0, { rx: Math.PI / 2 });
  part(g, cyl(r - 0.05, r - 0.05, 0.004, 48), '#a9c3c6', 0, floor + 0.006, 0, { outline: false, shadow: false });
  const surface = waterDisc(g, r - 0.02, water, TANKW, 0.48);
  // The centre drain and its screen; ripples turning round it.
  part(g, cyl(0.14, 0.14, 0.04, 16), '#90a4ae', 0, floor + 0.03, 0, { outline: false });
  const swirl = group(g, 0, water + 0.004, 0);
  for (let i = 0; i < 5; i++) {
    const m = torus(swirl, 0.4 + i * 0.28, 0.004, '#dff7fb', 0, 0, 0, { rx: Math.PI / 2 });
    m.scale.set(1, 1, 0.92);
  }
  // The feeder bridge from the back rim to the middle, the hopper on it.
  part(g, box(0.16, 0.06, R + 0.1), '#607d8b', 0.0, rim + 0.05, -R / 2, { outline: false });
  part(g, cyl(0.26, 0.12, 0.42, 14), BLUE, 0, rim + 0.38, -0.5);
  part(g, cyl(0.27, 0.27, 0.04, 14), '#0d47a1', 0, rim + 0.6, -0.5, { outline: false });
  const spinner = group(g, 0, rim + 0.12, -0.5);
  part(spinner, box(0.26, 0.012, 0.04), '#eceff1', 0, 0, 0, { outline: false });
  const scatter = puffs(g, 10, '#8a6a3f', 0.02);
  // The inlet from the main, pouring in at the side so the water turns.
  rod(g, v3(-R - 0.05, 0, -0.9), v3(-R - 0.05, rim + 0.2, -0.9), 0.05, PIPE);
  rod(g, v3(-R - 0.05, rim + 0.2, -0.9), v3(-r + 0.25, rim + 0.2, -0.75), 0.05, PIPE);
  const pour = puffs(g, 8, '#d4f1fa', 0.03);
  // Two paddle aerators on floats.
  const wheels: THREE.Group[] = [];
  for (const [x, z, ry] of [[0.95, 0.6, 0.6], [-0.9, 0.85, -0.7]] as const) {
    const aer = group(g, x, water, z, ry);
    for (const s of [-1, 1]) part(aer, ball(0.1), '#eceff1', 0, 0.02, s * 0.22, { outline: false }).scale.x = 2;
    part(aer, cyl(0.07, 0.07, 0.14, 10), '#37474f', 0, 0.22, 0);
    const wheel = group(aer, 0.15, 0.06, 0);
    for (let i = 0; i < 6; i++) {
      const b = group(wheel);
      b.rotation.z = (i / 6) * Math.PI * 2;
      part(b, box(0.035, 0.14, 0.24), YELLOW, 0, 0.08, 0, { outline: false });
    }
    wheels.push(wheel);
  }
  const foam = puffs(g, 10, '#f0fcff', 0.03);
  // The air line round the rim.
  torus(g, R + 0.06, 0.012, '#37474f', 0, rim - 0.06, 0, { rx: Math.PI / 2 });
  // The number on the side, the board on its post.
  label(g, `${FARM} 육성동`, 1.2, 0.18, 0, 0.42, R + 0.035, '#c7c4ba', NAVY);
  part(g, box(0.05, 1.3, 0.05), '#546e7a', R * 0.72, 0.65, R * 0.72);
  const board = group(g, R * 0.72, 1.25, R * 0.72, Math.PI / 4);
  part(board, box(0.44, 0.32, 0.03), '#eceff1', 0, 0, 0);
  picture(board, logTex('yaGrowBoard', '급이·폐사 기록'), 0.38, 0.27, 0, 0, 0.02);
  // The flounder: most flat on the floor, some lifting and settling.
  const fishes = Array.from({ length: 34 }, (_, i) => {
    const f = flounder(g, 0.26 + ((i * 5) % 4) * 0.04, i % 6 === 0 ? '#7c6a50' : FISH);
    const a = i * 2.4;
    const d = 0.35 + ((i * 37) % 100) / 100 * (r - 0.6);
    f.position.set(d * Math.cos(a), floor + 0.03, d * Math.sin(a));
    f.rotation.y = -a;
    return { f, a, d, k: i };
  });
  let last = -1;
  out.away = (_gone, t) => {
    if (Math.abs(t - last) < 1 / 40) return;
    last = t;
    swirl.rotation.y = -t * 0.12;
    (surface.material as THREE.MeshBasicMaterial).opacity = 0.46 + 0.03 * Math.sin(t * 0.7);
    const feeding = (t % 40) < 8;
    spinner.rotation.y = t * (feeding ? 9 : 0.3);
    scatter(feeding ? 1 : 0, 0, water, -0.2, 0.6, t * 1.4, 0.2);
    pour(1, -r + 0.3, water + 0.03, -0.72, 0.03, t * 1.8, 0.12);
    wheels.forEach((w) => (w.rotation.z = -t * 8));
    foam(1, 0.95, water + 0.02, 0.6, 0.12, t * 1.3, 0.14);
    fishes.forEach(({ f, a, d, k }) => {
      const lift = Math.max(0, Math.sin(t * 0.35 + k * 1.7)) ** 6;
      const up = feeding && k % 3 === 0 ? 1 : lift;
      const aa = a - t * 0.04 * (1 + (k % 3)) * (up > 0.2 ? 3 : 0.3);
      f.position.set(d * Math.cos(aa), floor + 0.03 + up * (water - floor - 0.1), d * Math.sin(aa));
      f.rotation.y = -aa - Math.PI / 2;
      f.rotation.z = 0.15 * up * Math.sin(t * 6 + k);
    });
  };
}

/** 해수 취수관: the intake main over the quay edge, down into the sea, its strainer cage and a buoy on its line. */
function intake(g: THREE.Group) {
  rod(g, v3(0, 0.25, 0.5), v3(0, 0.25, -0.35), 0.11, PIPE);
  rod(g, v3(0, 0.25, -0.35), v3(0, -0.3, -1.4), 0.11, PIPE);
  rod(g, v3(0, -0.3, -1.4), v3(0, -0.4, -2.4), 0.11, PIPE);
  part(g, cyl(0.2, 0.2, 0.5, 12), '#37474f', 0, -0.35, -2.6, { rx: Math.PI / 2 });
  part(g, ball(0.12), ORANGE, 0.3, 0.06, -2.4);
  part(g, box(0.3, 0.3, 0.3), CONCRETE_D, 0, 0.15, 0.3);
  label(g, '해수 취수', 0.3, 0.08, 0, 0.36, 0.46, '#eceff1', NAVY);
}

/** 선별·출하장 지붕: a steel canopy on four posts over the grading benches, gutters and a strip light, the farm's board. */
function canopy(g: THREE.Group, W: number, D: number) {
  const h = 3.0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.14, h, 0.14), '#90a4ae', sx * (W / 2 - 0.15), h / 2, sz * (D / 2 - 0.15));
  for (const sz of [-1, 1]) part(g, box(W - 0.1, 0.12, 0.1), '#78909c', 0, h, sz * (D / 2 - 0.15));
  for (let x = -W / 2 + 0.6; x < W / 2; x += 1.2) part(g, box(0.06, 0.08, D - 0.2), '#78909c', x, h + 0.1, 0, { outline: false });
  const roof = part(g, box(W + 0.2, 0.03, D + 0.3), '#cfd8dc', 0, h + 0.2, 0, { rx: 0.06, material: CANOPY, outline: false, shadow: false });
  void roof;
  part(g, box(W - 0.4, 0.04, 0.12), '#fff8e1', 0, h - 0.05, 0, { outline: false });
  part(g, box(W * 0.5, 0.42, 0.05), NAVY, 0, h - 0.25, D / 2 - 0.1);
  label(g, `${FARM} 선별·출하장`, W * 0.48, 0.34, 0, h - 0.25, D / 2 - 0.07, NAVY, '#ffffff');
}
const CANOPY = new THREE.MeshBasicMaterial({ color: '#cfd8dc', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });

/** 활어 운반차: a 2.5 t truck with the live-fish tanks on its bed, the oxygen cylinders, the hose to the tank, its cab to the road. */
function liveTruck(g: THREE.Group, W: number, D: number) {
  const half = D / 2;
  for (const z of [half - 0.9, -half + 1.0]) for (const sx of [-1, 1]) part(g, cyl(0.36, 0.36, 0.26, 16), '#212121', sx * 0.8, 0.36, z, { rz: Math.PI / 2 });
  part(g, rbox(1.8, 0.28, D - 0.3, 0.05), '#37474f', 0, 0.55, 0);
  part(g, rbox(1.85, 1.45, 1.5, 0.15), '#eceff1', 0, 1.3, half - 0.85);
  part(g, box(1.65, 0.55, 0.02), '#1f2f40', 0, 1.65, half - 0.09, { outline: false });
  part(g, box(1.9, 0.1, D - 1.8), '#90a4ae', 0, 0.74, -0.75);
  // Two blue FRP tanks with hatches, the cylinders between them, the bubbling inside.
  for (const z of [-0.2, -1.35]) {
    part(g, rbox(1.7, 0.95, 1.0, 0.12), '#1e88e5', 0, 1.27, z);
    part(g, cyl(0.2, 0.2, 0.06, 14), '#1565c0', 0.3, 1.77, z, { outline: false });
  }
  for (const x of [-0.75, 0.75]) part(g, cyl(0.1, 0.1, 0.9, 10), '#2e7d32', x, 1.25, -0.78);
  label(g, '활어 운반', 1.0, 0.3, W / 2 + 0.06, 1.3, -0.75, '#1e88e5', '#ffffff', Math.PI / 2);
  label(g, '활어 운반', 1.0, 0.3, -W / 2 - 0.06, 1.3, -0.75, '#1e88e5', '#ffffff', -Math.PI / 2);
  rod(g, v3(0.85, 1.6, -1.9), v3(0.95, 0.2, -2.3), 0.04, '#263238');
}

export const BUILDERS: Record<string, Builder> = {
  yaGrowTank(g, _W, _D, _c, _def, _ctx, out) {
    growTank(g, out);
  },
  yaIntake(g) {
    intake(g);
  },
  yaCanopy(g, W, D) {
    canopy(g, W, D);
  },
  yaLiveTruck(g, W, D) {
    liveTruck(g, W, D);
  },
  fishTank(g, _W, _D, _c, _def, _ctx, out) {
    fishTank(g, out);
  },
  shellLine(g, _W, _D, _c, _def, _ctx, out) {
    shellLine(g, out);
  },
  waterSensor(g, _W, _D, _c, _def, _ctx, out) {
    waterSensor(g, out);
  },
  harvestNet(g, _W, _D, _c, _def, _ctx, out) {
    harvestNet(g, out);
  },
  yaYard(g, W, D) {
    yard(g, W, D);
  },
  yaSea(g, _W, _D, _c, _def, _ctx, out) {
    seaFront(g, out);
  },
  yaLamp(g) {
    lampPost(g);
  },
  yaPens(g, _W, _D, _c, _def, _ctx, out) {
    pensPiece(g, out);
  },
  yaFeedStore(g, _W, _D, _c, _def, _ctx, out) {
    feedStore(g, out);
  },
  yaPump(g, _W, _D, _c, _def, _ctx, out) {
    pumpRoom(g, out);
  },
  yaHatchery(g, _W, _D, _c, _def, _ctx, out) {
    hatchery(g, out);
  },
  yaGrade(g, _W, _D, _c, _def, _ctx, out) {
    gradeTable(g, out);
  },
  yaShip(g, _W, _D, _c, _def, _ctx, out) {
    shipBench(g, out);
  },
  yaVisit(g, _W, _D, _c, _def, _ctx, out) {
    visitTub(g, out);
  },
};
