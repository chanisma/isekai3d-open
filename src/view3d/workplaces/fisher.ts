import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, text } from './doctor';
import { AU, BB, BT, FC, IC, LT, NR, OD, PT, SQ, TB, fhNow, fhPhase, sqPeg } from './fisherMotion';
import type { FhMotion, FhNow } from './fisherMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 어항 drawn as itself (2026-11-01 workplace pipeline, at the user's request), at the made-up 은빛항. Along the
 * top of the lot the harbour's water, its concrete quay and a breakwater of tetrapods with a red light at the
 * end; two small coastal boats moored behind their gangways, with open-sided wheelhouses that can be stood in.
 * On the quay net racks with a tear to mend, crab pots and floats, crates of the catch, an ice plant, a frame of
 * drying squid; the auction floor with its bell and buyers, its price board; the tide board with its wind cups
 * and warning flag; a live-fish tank; and in the hut the harbour office's desk with its radio.
 *
 * Everything that moves follows the scripts in fisherMotion.ts; other people are played by VRoid bodies where
 * there are any (vroidFigure.ts). The harbour, the boats and everything written on their signs are made up.
 */

const PORT = '은빛항';
const SEA = '#2f7f9e';
const SEA_D = '#256a86';
const GLINT = '#8fd0df';
const CONCRETE = '#bdb9ae';
const CONCRETE_D = '#a5a196';
const YELLOW = '#fdd835';
const HULL = '#f5f7f6';
const NAVY = '#17406d';
const BLUE = '#1976d2';
const RED = '#c62828';
const ORANGE = '#ef6c00';
const CRATE_BLUE = '#2f80c9';
const WOOD = '#9c7a52';
const WOOD_D = '#6d4c41';
const NET = '#3f8f6e';
const NEW_NET = '#ffb74d';
const ROPE = '#d6c49a';
const SKIN = '#f1c9a5';
const PAPER = '#fbfaf6';
const INK = '#263238';
const SQUID = '#f0dcb8';
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
/** See-through picture, both sides: a net. */
function meshPic(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function standAt(g: THREE.Object3D, motion: FhMotion, z = 0.6): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: FhNow | null, t: number, gone: boolean) => void) {
  out.spots = spots;
  out.away = (gone, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? fhNow(sp.motion as FhMotion, t, fhPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t, gone);
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
/** Exhaust, ice, spray: soft balls from a place, each on its own loop. */
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
  const m = part(g, new THREE.TorusGeometry(r, t, 8, 20), color, x, y, z, { ...o, outline: false });
  m.userData.ownGeometry = true;
  return m;
}
/** A plastic fish crate, its origin at the bottom: `fishes` of the given colour lying in it. */
function crateMesh(g: THREE.Object3D, w = 0.46, d = 0.32, h = 0.14, color = CRATE_BLUE): THREE.Group {
  const c = group(g);
  part(c, box(w, 0.02, d), shade(color, 0.8), 0, 0.01, 0, { outline: false });
  for (const s of [-1, 1]) {
    part(c, box(w, h, 0.015), color, 0, h / 2, (s * d) / 2);
    part(c, box(0.015, h, d), color, (s * w) / 2, h / 2, 0);
  }
  return c;
}
/** A fish lying along x, head to −x, its origin in the middle. */
function fishMesh(g: THREE.Object3D, color = '#6f8fa6', L = 0.24, belly = '#e9eef0'): THREE.Group {
  const f = group(g);
  const b = part(f, ball(0.5), color, 0, 0, 0, { outline: false });
  b.scale.set(L, L * 0.3, L * 0.2);
  const u = part(f, ball(0.5), belly, 0, -L * 0.05, 0, { outline: false });
  u.scale.set(L * 0.8, L * 0.2, L * 0.17);
  part(f, box(L * 0.2, L * 0.28, 0.005), shade(color, 0.8), L * 0.56, 0, 0, { outline: false });
  part(f, ball(0.008), BLACK, -L * 0.36, L * 0.03, L * 0.08, { outline: false });
  return f;
}
const CATCH = ['#4f7fa3', '#b9c6cc', '#c9a6a0'];
/** A crate with its catch lying across it. */
function fullCrate(g: THREE.Object3D, kind = 0, n = 5): THREE.Group {
  const c = crateMesh(g);
  part(c, box(0.42, 0.05, 0.28), '#d9e6ea', 0, 0.05, 0, { outline: false });
  for (let i = 0; i < n; i++) {
    const f = fishMesh(c, CATCH[kind]);
    f.position.set(-0.1 + ((i * 3) % 3) * 0.1, 0.1 + (i % 2) * 0.012, -0.11 + i * 0.055);
    f.rotation.y = 0.08 * (i % 3) - 0.08;
  }
  return c;
}
/** A squid hanging from its origin. */
function squidMesh(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, box(0.012, 0.03, 0.012), '#8d6e63', 0, -0.012, 0, { outline: false });
  const m = part(s, cyl(0.075, 0.03, 0.2, 10), SQUID, 0, -0.13, 0, { outline: false });
  m.scale.z = 0.22;
  part(s, box(0.2, 0.05, 0.006), shade(SQUID, 0.94), 0, -0.05, 0, { outline: false });
  for (const x of [-0.035, -0.012, 0.012, 0.035]) part(s, box(0.012, 0.13, 0.006), shade(SQUID, 0.86), x, -0.29, 0, { outline: false });
  return s;
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
const netTex = () =>
  painted('fhNetWhole', 256, 256, (c) => {
    c.clearRect(0, 0, 256, 256);
    c.strokeStyle = NET;
    c.lineWidth = 2;
    for (let i = -256; i < 512; i += 18) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 256, 256);
      c.moveTo(i, 256);
      c.lineTo(i + 256, 0);
      c.stroke();
    }
  });
/** A crab pot: its origin in the middle, lying along x, a net round two hoops, a door on the front. */
function potMesh(g: THREE.Object3D, net: THREE.Material): { root: THREE.Group; door: THREE.Group; old: THREE.Mesh; fresh: THREE.Mesh } {
  const root = group(g);
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.52, 14, 1, true), net);
  skin.userData.ownGeometry = true;
  skin.rotation.z = Math.PI / 2;
  root.add(skin);
  for (const x of [-0.26, 0, 0.26]) torus(root, 0.2, 0.009, ORANGE, x, 0, 0, { ry: Math.PI / 2 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    part(root, cyl(0.005, 0.005, 0.52, 5), '#546e7a', 0, 0.2 * Math.sin(a), 0.2 * Math.cos(a), { rz: Math.PI / 2, outline: false });
  }
  const fun = part(root, cyl(0.2, 0.05, 0.14, 10), '#4f8fbf', -0.2, 0, 0, { rz: -Math.PI / 2, outline: false });
  fun.scale.set(0.9, 1, 0.9);
  const door = group(root, 0.12, -0.02, 0.2);
  part(door, box(0.2, 0.2, 0.006), '#8fb7cf', 0, 0.1, 0, { outline: false });
  part(door, box(0.21, 0.012, 0.012), ORANGE, 0, 0.2, 0, { outline: false });
  const bag = (c: string) => {
    const b = part(root, ball(0.05), c, 0.02, 0, 0, { outline: false });
    b.scale.set(1.1, 0.9, 0.9);
    return b;
  };
  const old = bag('#5d5146');
  const fresh = bag('#d8c7ad');
  return { root, door, old, fresh };
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
  bosun: { top: ORANGE, bottom: '#37474f', hair: '#444444', skin: '#d9a97f' },
  deck: { top: '#ffb300', bottom: '#263238', hair: '#2b1b10', skin: '#e0b48d' },
  deck2: { top: '#1976d2', bottom: '#37474f', hair: '#1a1a1a', skin: '#d9a97f' },
  buyerA: { top: '#546e7a', bottom: '#263238', hair: '#2b1b10' },
  buyerB: { top: '#8d6e63', bottom: '#37474f', hair: '#9e9e9e', skin: '#eac09a' },
  buyerC: { top: '#26a69a', bottom: '#263238', hair: '#1a1a1a' },
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
// 항구 (fhHarbour, 16 × 2): the water, its coping and a breakwater; 부두 (fhQuay, 16 × 13): the concrete.

function harbour(g: THREE.Group, out: Built) {
  const X0 = -14;
  const X1 = 8;
  const Z0 = -5;
  const Z1 = 1;
  part(g, box(X1 - X0, 0.02, Z1 - Z0), SEA, (X0 + X1) / 2, 0.01, (Z0 + Z1) / 2, { outline: false, shadow: false });
  // A darker channel and the glints that drift on it.
  part(g, box(X1 - X0, 0.002, 1.8), SEA_D, (X0 + X1) / 2, 0.022, -3.4, { outline: false, shadow: false });
  const glints = group(g);
  let s = 77;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) part(glints, box(0.14 + rnd() * 0.2, 0.003, 0.012), GLINT, X0 + 0.5 + rnd() * (X1 - X0 - 3), 0.026, Z0 + 0.2 + rnd() * (Z1 - Z0 - 0.5), { outline: false, shadow: false });
  // The quay's coping along the lot's side of the water, its old tyres and the yellow line.
  part(g, box(X1 - X0, 0.14, 0.2), CONCRETE, (X0 + X1) / 2, 0.07, Z1 + 0.02);
  part(g, box(X1 - X0, 0.004, 0.05), YELLOW, (X0 + X1) / 2, 0.142, Z1 + 0.05, { outline: false });
  for (let x = -7.6; x < 6; x += 1.5) torus(g, 0.13, 0.05, '#23272b', x, 0.09, Z1 - 0.12);
  // A ladder down, between the boats.
  for (const dx of [-0.16, 0.16]) {
    rod(g, v3(-1 + dx, 0.32, Z1 + 0.02), v3(-1 + dx, 0.32, Z1 - 0.1), 0.014, CHROME);
    rod(g, v3(-1 + dx, 0.32, Z1 - 0.1), v3(-1 + dx, 0.0, Z1 - 0.1), 0.014, CHROME);
  }
  // The breakwater closing the right: a road of concrete, tetrapods heaped on the harbour side.
  part(g, box(1.4, 0.4, Z1 - Z0 + 0.3), CONCRETE_D, 7.3, 0.2, (Z0 + Z1) / 2 - 0.15);
  part(g, box(1.4, 0.03, Z1 - Z0 + 0.3), CONCRETE, 7.3, 0.415, (Z0 + Z1) / 2 - 0.15, { outline: false });
  const pod = (x: number, y: number, z: number, ry: number) => {
    const p = group(g, x, y, z, ry);
    part(p, ball(0.12), CONCRETE, 0, 0, 0, { outline: false });
    for (const [rx, rz] of [[0, 0], [1.91, 0], [1.91, 2.09], [1.91, -2.09]]) {
      const a = group(p);
      a.rotation.set(rx, 0, rz);
      part(a, cyl(0.05, 0.1, 0.22, 8), CONCRETE_D, 0, 0.17, 0, { outline: false });
    }
  };
  for (let i = 0; i < 16; i++) pod(6.42 + (i % 2) * 0.18, 0.14 + (i % 3) * 0.08, -4.8 + i * 0.36, i * 1.3);
  // The red light at its seaward end.
  const lx = 7.3;
  const lz = -4.5;
  part(g, cyl(0.26, 0.34, 1.5, 16), RED, lx, 1.17, lz);
  for (const y of [0.9, 1.42]) part(g, cyl(0.31, 0.31, 0.1, 16), '#fafafa', lx, y, lz, { outline: false });
  part(g, cyl(0.34, 0.34, 0.05, 16), BLACK, lx, 1.95, lz, { outline: false });
  const beacon = ownLit(g, cyl(0.15, 0.15, 0.24, 12), '#7a1616', lx, 2.09, lz);
  part(g, cyl(0.02, 0.2, 0.14, 12), BLACK, lx, 2.28, lz, { outline: false });
  label(g, `${PORT} 방파제`, 0.86, 0.17, 7.3, 0.25, Z1 + 0.14, CONCRETE_D, INK);
  // Marker buoys on their chains in the channel, and two gulls going round.
  const floats = [[-3.4, -3.1, RED], [3.4, -3.4, '#2e7d32'], [-7.6, -2.6, ORANGE]].map(([x, z, c]) => {
    const b = group(g, x as number, 0, z as number);
    part(b, cyl(0.17, 0.2, 0.3, 12), c as string, 0, 0.14, 0);
    part(b, cyl(0.05, 0.11, 0.42, 8), c as string, 0, 0.49, 0, { outline: false });
    part(b, ball(0.05), '#fff59d', 0, 0.73, 0, { outline: false });
    return b;
  });
  const gulls = [0, 1].map(() => {
    const b = group(g);
    const body = part(b, ball(0.05), '#fafafa', 0, 0, 0, { outline: false });
    body.scale.set(1, 0.7, 2);
    part(b, cyl(0.008, 0.016, 0.03, 6), '#fbc02d', 0, 0, 0.12, { rx: Math.PI / 2, outline: false });
    const wings = [-1, 1].map((sx) => {
      const w = group(b);
      part(w, box(0.26, 0.008, 0.09), '#eceff1', sx * 0.13, 0, 0, { outline: false });
      return w;
    });
    return { b, wings };
  });
  out.away = (_gone, t) => {
    glints.position.x = 0.1 * Math.sin(t * 0.4);
    glints.position.z = 0.04 * Math.cos(t * 0.31);
    floats.forEach((b, i) => {
      b.rotation.z = 0.06 * Math.sin(t * 0.9 + i);
      b.position.y = 0.012 * Math.sin(t * 1.2 + i * 2);
    });
    setLit(beacon, Math.sin(t * 1.8) > 0.55 ? '#ff3b30' : '#7a1616');
    gulls.forEach(({ b, wings }, i) => {
      const a = t * (0.32 + i * 0.05) + i * 2.4;
      const R = 3.2 + i;
      b.position.set(-1.5 + R * Math.cos(a), 3.0 + i * 0.5 + 0.2 * Math.sin(a * 2), -2.4 + 1.4 * Math.sin(a));
      b.rotation.y = -a;
      const f = 0.35 * Math.sin(t * (6 + i));
      wings[0].rotation.z = -f;
      wings[1].rotation.z = f;
    });
  };
}

function quay(g: THREE.Group, W: number, D: number) {
  // Worn concrete laid in bays, a yellow lane for the barrows, wet patches and a drain.
  part(g, box(W, 0.008, D), CONCRETE, 0, 0.004, 0, { outline: false, shadow: false });
  for (let x = -W / 2 + 4; x < W / 2; x += 4) part(g, box(0.03, 0.002, D), CONCRETE_D, x, 0.009, 0, { outline: false, shadow: false });
  for (let z = -D / 2 + 4; z < D / 2; z += 4) part(g, box(W, 0.002, 0.03), CONCRETE_D, 0, 0.009, z, { outline: false, shadow: false });
  for (const z of [-D / 2 + 1.05, -D / 2 + 1.95]) part(g, box(W, 0.002, 0.06), YELLOW, 0, 0.01, z, { outline: false, shadow: false });
  for (const [x, z, r] of [[-1.5, -2.8, 0.7], [1.2, -3.1, 0.5], [3.6, 0.2, 0.9], [-5.4, 1.7, 0.6], [-1, 3.6, 0.7]] as const) {
    const m = part(g, cyl(r, r, 0.002, 18), '#9f9b90', x, 0.011, z, { outline: false, shadow: false });
    m.scale.z = 0.6;
  }
  part(g, box(0.5, 0.003, 7), '#8a877c', 7.2, 0.01, 0, { outline: false, shadow: false });
  for (let i = 0; i < 16; i++) part(g, box(0.34, 0.003, 0.02), '#55534d', 7.2, 0.013, -3.2 + i * 0.42, { outline: false, shadow: false });
  label(g, '천천히 · 지게차 주의', 1.5, 0.22, -3, 0.012, -D / 2 + 1.5, CONCRETE, '#8d6e0a').rotation.set(-Math.PI / 2, 0, 0);
}

// =============================================================================================
// 어선 (fishingBoat, 2 × 1): its tile is the quay's edge; the boat lies in the water behind, and can sail.

function hullLayer(g: THREE.Object3D, y0: number, h: number, color: string, k = 1): THREE.Mesh {
  // Bow to −x: the sides run straight from the stern, then come in to the stem.
  const hb = BT.B * k;
  const s = new THREE.Shape();
  s.moveTo(BT.L * 0.98, -hb * 0.94);
  s.lineTo(-0.9, -hb);
  s.quadraticCurveTo(-1.5, -hb * 0.82, -BT.L * k, 0);
  s.quadraticCurveTo(-1.5, hb * 0.82, -0.9, hb);
  s.lineTo(BT.L * 0.98, hb * 0.94);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = part(g, geo, color, 0, y0, BT.z);
  m.userData.ownGeometry = true;
  return m;
}
function fishingBoat(g: THREE.Group, out: Built) {
  const D = BT.deck;
  // On the quay: the bollards and lines, the fuel can's place, a stack of boxes, the gangway.
  for (const x of [BT.bollard[0], 1.55]) {
    part(g, cyl(0.07, 0.085, 0.2, 14), '#2b2d30', x, 0.1, BT.bollard[2]);
    part(g, cyl(0.1, 0.1, 0.04, 14), '#2b2d30', x, 0.22, BT.bollard[2]);
    torus(g, 0.09, 0.016, ROPE, x, 0.16, BT.bollard[2], { rx: Math.PI / 2 });
  }
  for (let i = 0; i < 3; i++) {
    const c = crateMesh(g, 0.46, 0.32, 0.14, i === 1 ? '#e6a820' : CRATE_BLUE);
    c.position.set(1.14, i * 0.145, 0.18);
    c.rotation.y = 0.08 * (i - 1);
  }
  const boat = group(g);
  const rock = group(boat);
  // The hull: red below the water, a navy stripe, white above; the deck let into it.
  hullLayer(rock, 0.0, 0.1, '#9b2f2a', 0.97);
  hullLayer(rock, 0.1, 0.09, NAVY);
  hullLayer(rock, 0.19, D - 0.19 - 0.012, HULL);
  hullLayer(rock, D - 0.012, 0.012, '#c7d6d9', 0.97);
  // Near and far sides, cut for the gangway on the near one; a rail round the bow.
  const zN = BT.z + BT.B;
  const zF = BT.z - BT.B;
  const wall = (x0: number, x1: number, z: number) => {
    part(rock, box(x1 - x0, 0.24, 0.05), HULL, (x0 + x1) / 2, D + 0.12, z);
    part(rock, box(x1 - x0 + 0.01, 0.02, 0.07), NAVY, (x0 + x1) / 2, D + 0.25, z, { outline: false });
  };
  wall(-0.32, BT.L * 0.98, zN);
  wall(-0.9, BT.L * 0.98, zF);
  part(rock, box(0.05, 0.24, BT.B * 1.9), HULL, BT.L * 0.98, D + 0.12, BT.z);
  for (const sz of [-1, 1]) {
    const edge = BT.z + sz * BT.B;
    const pts: Array<[number, number]> = [[-0.9, edge], [-1.5, BT.z + sz * BT.B * 0.68], [-BT.L, BT.z]];
    for (let i = 0; i < 2; i++) rod(rock, v3(pts[i][0], D + 0.42, pts[i][1]), v3(pts[i + 1][0], D + 0.42, pts[i + 1][1]), 0.014, CHROME);
    for (const [x, z] of pts) rod(rock, v3(x, D, z), v3(x, D + 0.42, z), 0.012, CHROME);
  }
  // Old tyres on its near side; its name, painted, one for each of the harbour's boats.
  for (const x of [-0.1, 0.8, 1.6]) torus(rock, 0.11, 0.04, '#23272b', x, 0.3, zN + 0.03);
  const name1 = label(rock, `제3 ${PORT}호`, 0.8, 0.14, 0.36, 0.3, zN + 0.008, HULL, NAVY);
  const name2 = label(rock, '제7 물결호', 0.8, 0.14, 0.36, 0.3, zN + 0.008, HULL, RED);
  name2.visible = false;
  // The net drum at the bow, wound with green.
  const drum = group(rock, BT.drum[0], BT.drum[1], BT.drum[2]);
  const drumIn = group(drum);
  part(drumIn, cyl(0.13, 0.13, 0.44, 14), NET, 0, 0, 0, { rx: Math.PI / 2 });
  for (const s of [-1, 1]) part(drumIn, cyl(0.22, 0.22, 0.025, 16), '#90a4ae', 0, 0, s * 0.23, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    part(drumIn, box(0.015, 0.015, 0.45), shade(NET, 0.72), 0.135 * Math.cos(a), 0.135 * Math.sin(a), 0, { outline: false });
  }
  for (const s of [-1, 1]) part(rock, box(0.05, 0.42, 0.05), '#546e7a', BT.drum[0], D + 0.21, BT.drum[2] + s * 0.26);
  // The hold's hatch, the fuel filler on the far side and its little gauge, floats along the far rail.
  part(rock, rbox(0.62, 0.05, 0.56, 0.015), '#b7c4c7', -0.28, D + 0.026, BT.z - 0.02);
  part(rock, box(0.1, 0.02, 0.03), BLACK, -0.28, D + 0.06, BT.z - 0.02, { outline: false });
  part(rock, cyl(0.03, 0.03, BT.filler[1] - D, 10), '#37474f', BT.filler[0], (BT.filler[1] + D) / 2, BT.filler[2]);
  part(rock, cyl(0.045, 0.045, 0.02, 10), RED, BT.filler[0], BT.filler[1] + 0.01, BT.filler[2], { outline: false });
  label(rock, '경유', 0.12, 0.05, BT.filler[0] + 0.14, D + 0.2, zF + 0.03, HULL, RED);
  const fuelBar = part(rock, box(0.03, 0.14, 0.005), '#66bb6a', BT.filler[0] - 0.14, D + 0.08, zF + 0.03, { outline: false });
  fuelBar.position.y = D + 0.2;
  [-0.5, -0.3, 0.3, 0.5].forEach((x, i) => part(rock, ball(0.075), i % 2 ? '#fafafa' : ORANGE, x, D + 0.32, zF - 0.04));
  // The wheelhouse: open to the near side so whoever's at the wheel can be seen.
  const cx0 = 0.3;
  const cx1 = 1.3;
  const cz0 = -2.05;
  const cz1 = -0.88;
  const top = D + 1.92;
  for (const [x, z] of [[cx0, cz0], [cx1, cz0], [cx0, cz1], [cx1, cz1]] as const) part(rock, box(0.06, top - D, 0.06), HULL, x, (top + D) / 2, z);
  // Below the windows at the front the console, leaving the doorway at the near end.
  part(rock, box(0.14, 0.86, cz1 - cz0 - 0.28), HULL, cx0, D + 0.43, (cz0 + cz1 - 0.28) / 2);
  part(rock, box(1.0, 0.86, 0.05), HULL, (cx0 + cx1) / 2, D + 0.43, cz0);
  part(rock, box(0.05, top - D, 1.17), HULL, cx1, (top + D) / 2, (cz0 + cz1) / 2);
  const glass = new THREE.MeshBasicMaterial({ color: '#b6dbe6', transparent: true, opacity: 0.32, depthWrite: false });
  for (const [w, d, x, z] of [[0.03, cz1 - cz0, cx0, (cz0 + cz1) / 2], [1.0, 0.03, (cx0 + cx1) / 2, cz0]] as const) {
    const m = new THREE.Mesh(box(w, top - D - 0.86, d), glass);
    m.position.set(x, D + 0.86 + (top - D - 0.86) / 2, z);
    m.userData.ownMaterial = true;
    rock.add(m);
  }
  part(rock, rbox(1.26, 0.06, 1.38, 0.02), HULL, (cx0 + cx1) / 2, top + 0.03, (cz0 + cz1) / 2);
  part(rock, box(1.27, 0.02, 1.39), NAVY, (cx0 + cx1) / 2, top, (cz0 + cz1) / 2, { outline: false });
  // The wheel and its column, the throttle, the key, the fish finder, radio and tide paper's clip.
  const wheelG = group(rock, BT.wheel[0], BT.wheel[1], BT.wheel[2]);
  wheelG.rotation.y = Math.PI / 2;
  part(rock, cyl(0.02, 0.02, 0.2, 8), '#37474f', (BT.wheel[0] + cx0) / 2, BT.wheel[1], BT.wheel[2], { rz: Math.PI / 2, outline: false });
  torus(wheelG, 0.15, 0.014, BLACK, 0, 0, 0);
  for (const a of [0, 2.09, -2.09]) part(wheelG, box(0.14, 0.012, 0.012), BLACK, 0.07 * Math.cos(a), 0.07 * Math.sin(a), 0, { rz: a, outline: false });
  part(rock, box(0.02, 0.05, 0.04), RED, BT.key[0], BT.key[1], BT.key[2], { outline: false });
  const consoleLed = ownLit(rock, ball(0.012), '#3b2a18', BT.key[0] + 0.02, BT.key[1] + 0.08, BT.key[2]);
  part(rock, rbox(0.06, 0.3, 0.36, 0.01), BLACK, BT.finder[0] - 0.02, BT.finder[1], BT.finder[2]);
  const finder = swapPic(rock, 0.3, 0.24, BT.finder[0] + 0.012, BT.finder[1], BT.finder[2], Math.PI / 2);
  const finderOff = painted('fhFinderOff', 96, 80, (c) => {
    c.fillStyle = '#0f1518';
    c.fillRect(0, 0, 96, 80);
  });
  finder.set(finderOff);
  const sonar = live(160, 128);
  part(rock, rbox(0.06, 0.12, 0.22, 0.01), '#37474f', BT.radio[0] - 0.02, BT.radio[1] + 0.06, BT.radio[2]);
  const radioLed = ownLit(rock, ball(0.009), '#3b2a18', BT.radio[0] + 0.012, BT.radio[1] + 0.09, BT.radio[2] + 0.06);
  const mic = group(rock);
  part(mic, rbox(0.05, 0.09, 0.03, 0.01), BLACK, 0, 0, 0);
  const micCord = limb(rock, 0.004, BLACK);
  // The chart table on the far wall, the chart pinned on it and its dividers.
  part(rock, box(0.66, 0.03, 0.3), WOOD, 0.74, BT.chart[1] - 0.04, cz0 + 0.17);
  picture(rock, painted('fhChart', 192, 96, (c) => {
    c.fillStyle = '#e9f0dc';
    c.fillRect(0, 0, 192, 96);
    c.fillStyle = '#c3b58c';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(66, 0);
    c.quadraticCurveTo(40, 30, 58, 60);
    c.lineTo(0, 96);
    c.fill();
    c.strokeStyle = '#7fa8c4';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(40, 40, 40 + i * 24, -0.8, 1.1);
      c.stroke();
    }
    c.strokeStyle = RED;
    c.beginPath();
    c.moveTo(60, 46);
    c.lineTo(150, 30);
    c.stroke();
    text(c, '어장도', 140, 80, 13, INK, 'center');
  }), 0.56, 0.26, 0.74, BT.chart[1] - 0.022, cz0 + 0.17, '#ffffff', 0, -Math.PI / 2);
  const dividers = group(rock);
  for (const s of [-1, 1]) rod(dividers, v3(0, 0.1, 0), v3(s * 0.04, 0, 0), 0.004, STEEL);
  const tidePaper = clipMesh(rock, painted('fhTidePaper', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '오늘 물때', 64, 16, 15, INK, 'center');
    c.strokeStyle = BLUE;
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x < 128; x += 4) c.lineTo(x, 64 + 26 * Math.sin((x / 128) * Math.PI * 4));
    c.stroke();
    [['만조', '05:42'], ['간조', '11:58'], ['만조', '18:06']].forEach(([a, b], i) => {
      text(c, a, 10, 112 + i * 20, 13, INK);
      text(c, b, 118, 112 + i * 20, 13, BLUE, 'right');
    });
  }), 0.14, 0.19);
  // Aft: boxes stacked and tied; the exhaust up the cabin's back; the mast with its bar, lights and flags.
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) crateMesh(rock).position.set(1.64, D + j * 0.145, BT.z - 0.28 + i * 0.5);
  part(rock, cyl(0.04, 0.05, 1.5, 10), BLACK, cx1 + 0.08, D + 1.2, BT.z - 0.45);
  const smoke = puffs(rock, 5, '#6b6f72', 0.06);
  const stackP: V = [cx1 + 0.08, D + 1.98, BT.z - 0.45];
  part(rock, cyl(0.022, 0.03, 1.15, 8), '#eceff1', 0.75, top + 0.6, BT.z);
  const bar = group(rock, 0.75, top + 0.92, BT.z);
  part(bar, rbox(0.5, 0.05, 0.08, 0.02), '#fafafa', 0, 0, 0);
  part(rock, cyl(0.06, 0.06, 0.06, 10), '#37474f', 0.75, top + 0.86, BT.z, { outline: false });
  part(rock, ball(0.03), '#c6ff00', 0.75, top + 1.2, BT.z, { outline: false });
  const flag = (c: string, y: number, w: number) => part(rock, box(w, 0.13, 0.006), c, 0.75 + 0.03 + w / 2, y, BT.z);
  flag(RED, top + 1.02, 0.26);
  flag('#ffb300', top + 0.84, 0.2);
  // The gangway.
  const gz0 = -0.34;
  const gz1 = zN - 0.08;
  const gang = group(g, BT.gangX, (0.14 + D + 0.02) / 2, (gz0 + gz1) / 2);
  gang.rotation.x = Math.atan2(D - 0.12, gz0 - gz1);
  part(gang, box(0.42, 0.03, Math.hypot(gz0 - gz1, D - 0.12)), WOOD, 0, 0, 0);
  for (let i = 0; i < 4; i++) part(gang, box(0.42, 0.012, 0.024), WOOD_D, 0, 0.018, -0.3 + i * 0.2, { outline: false });
  // Lines from each bollard to the boat.
  const lineTo = (x: number, x2: number) => rod(g, v3(x, 0.17, BT.bollard[2]), v3(x2, D + 0.28, zN), 0.009, ROPE);
  lineTo(BT.bollard[0], -0.92);
  lineTo(1.55, 1.92);
  // What's carried.
  const can = group(g);
  part(can, rbox(0.2, 0.3, 0.12, 0.02), RED, 0, 0.15, 0);
  part(can, box(0.1, 0.02, 0.02), BLACK, 0, 0.31, 0, { outline: false });
  part(can, cyl(0.016, 0.02, 0.06, 8), '#37474f', 0.08, 0.31, 0, { rz: -0.7, outline: false });
  const chart = group(g);
  picture(chart, painted('fhChartBig', 192, 128, (c) => {
    c.fillStyle = '#e9f0dc';
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = '#c3b58c';
    c.fillRect(0, 0, 44, 128);
    c.strokeStyle = '#7fa8c4';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(30, 60, 40 + i * 24, -1, 1);
      c.stroke();
    }
    c.fillStyle = RED;
    c.beginPath();
    c.arc(130, 70, 8, 0, Math.PI * 2);
    c.fill();
    text(c, '오늘 어장', 134, 18, 15, INK, 'center');
  }), 0.5, 0.33, 0, 0, 0, '#ffffff', 0);
  const crew = [person(g, LOOKS.deck, BT.crew[0][0], BT.crew[0][1], Math.PI, 'male'), person(g, LOOKS.deck2, BT.crew[1][0], BT.crew[1][1], Math.PI, 'female')];
  const spots: Record<string, Spot> = {
    fhReadyBoat: standAt(g, 'fhReady'),
    goFishingTrip: standAt(g, 'fhReady'),
    fishRun: standAt(g, 'fhReady'),
    fisher_readSea: standAt(g, 'fhReadSea'),
    fisher_briefCrew: standAt(g, 'fhBrief'),
  };
  spots['*'] = spots.fhReadyBoat;
  const wake = puffs(g, 6, '#ffffff', 0.09);
  let state: 'moored' | 'ready' | 'leaving' | 'gone' | 'back' = 'moored';
  let since = 0;
  let travel = 0;
  let returnFrom = 1;
  let sailX = 8;
  let named = false;
  drive(g, out, spots, (now, N, t, gone) => {
    if (!named) {
      named = true;
      g.getWorldPosition(tmp);
      const second = tmp.x > 7;
      name1.visible = !second;
      name2.visible = second;
      sailX = Math.max(5, tmp.x + 3);
    }
    // Rocking at its lines; out to the fishing ground: a moment with the engine on, out astern and away.
    rock.position.y = 0.01 * Math.sin(t * 1.1);
    rock.rotation.z = 0.008 * Math.sin(t * 0.8);
    if (gone && (state === 'moored' || state === 'back')) {
      state = 'ready';
      since = t;
    } else if (!gone && (state === 'ready' || state === 'leaving' || state === 'gone')) {
      returnFrom = travel;
      state = 'back';
      since = t;
    }
    if (state === 'ready' && t - since > 1.2) {
      state = 'leaving';
      since = t;
    }
    if (state === 'leaving') {
      travel = Math.min(1, (t - since) / 9);
      if (travel === 1) state = 'gone';
    } else if (state === 'back') {
      travel = returnFrom * (1 - Math.min(1, (t - since) / 8));
      if (travel === 0) state = 'moored';
    } else if (state === 'moored' || state === 'ready') travel = 0;
    const off = THREE.MathUtils.smoothstep(travel, 0, 0.3);
    const run = THREE.MathUtils.smoothstep(travel, 0.2, 1);
    boat.position.set(-run * sailX, 0, -off * 2.4);
    boat.scale.setScalar(1 - 0.45 * THREE.MathUtils.smoothstep(travel, 0.8, 1));
    boat.visible = state !== 'gone';
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const scripted = state === 'moored';
    const running = !scripted || (n.engine ?? 0) > 0.5;
    drumIn.rotation.z = scripted ? (n.drumA ?? 0) : 0;
    wheelG.rotation.z = n.wheel ?? 0;
    bar.rotation.y = running ? t * 3 : 0.5;
    smoke(running ? 1 : 0, stackP[0], stackP[1], stackP[2], 0.03, t * 1.6, 0.8);
    wake(state === 'leaving' || state === 'back' ? 1 : 0, boat.position.x + 2.1, 0.06, BT.z + boat.position.z, 0.2, t * 1.4, 0.16);
    const lit = !scripted || (n.lit ?? 0) > 0.5;
    setLit(consoleLed, lit ? '#66ff99' : '#3b2a18');
    setLit(radioLed, (n.radio ?? 0) > 0.5 ? '#ff5252' : lit ? '#ffd54f' : '#3b2a18');
    fuelBar.scale.y = Math.max(0.05, 0.35 + 0.65 * (n.fuel ?? 1));
    if (lit && now) {
      const school = n.school ?? 0;
      finder.set(sonar((c) => {
        c.fillStyle = '#071826';
        c.fillRect(0, 0, 160, 128);
        c.fillStyle = '#c9662b';
        c.beginPath();
        c.moveTo(0, 128);
        for (let x = 0; x <= 160; x += 8) c.lineTo(x, 100 + 8 * Math.sin((x + t * 18) * 0.05));
        c.lineTo(160, 128);
        c.fill();
        c.fillStyle = school > 0.5 ? '#ffee58' : '#3fa7d6';
        for (let i = 0; i < 26 * (0.2 + school); i++) {
          const x = ((i * 37 + t * 18) % 160) | 0;
          c.fillRect(x, 40 + ((i * 17) % 34), 7, 3);
        }
        text(c, '18.4m', 154, 12, 13, '#d5f5ff', 'right');
      }));
    } else finder.set(finderOff);
    // Props in hand.
    at(can, scripted && now && P.can ? P.can : null, scripted ? BT.can : undefined);
    can.rotation.z = -0.9 * (n.tilt ?? 0);
    at(tidePaper, P.tide);
    at(mic, P.mic, add(BT.radio, 0.015, -0.02, 0.0));
    const micP = P.mic ?? add(BT.radio, 0.015, -0.02, 0);
    micCord(tmp.set(BT.radio[0], BT.radio[1] - 0.02, BT.radio[2] + 0.05).clone(), tmp.set(micP[0], micP[1] - 0.05, micP[2]).clone());
    at(dividers, P.dividers, [0.56, BT.chart[1] - 0.02, cz0 + 0.3]);
    at(chart, P.chart);
    crew.forEach((f, i) => {
      f.root.visible = now === 'fisher_briefCrew';
      if (!f.root.visible) return;
      f.opts.nod = 0.1 + 0.28 * (n[`nod${i}`] ?? 0);
      f.armL(null);
      f.armR((n.fist ?? 0) > 0.05 ? tmp.set(BT.crew[i][0] + (i ? 0.2 : -0.2), 1.4 + 0.5 * (n.fist ?? 0), BT.crew[i][1]).clone() : null);
    });
  });
  // Where they're looking while it's still moored.
  out.work = marker(g, 0, D + 0.8, BT.z);
}

// =============================================================================================
// 그물 손질대 (netRack, 2 × 1).

function netRack(g: THREE.Group, out: Built) {
  for (const x of [-0.94, 0.94]) {
    part(g, box(0.08, 1.92, 0.08), WOOD, x, 0.96, NR.z);
    part(g, box(0.08, 0.05, 0.56), WOOD_D, x, 0.03, NR.z);
  }
  part(g, box(1.96, 0.07, 0.08), WOOD, 0, 1.9, NR.z);
  // The net, hung from its cork line, the tear low in it, and its lead line heaped along the ground.
  const net = group(g, 0, 1.0, NR.z);
  const h = 1.72;
  const w = 1.8;
  const cx = ((NR.tear[0] + w / 2) / w) * 512;
  const cy = ((1.0 + h / 2 - NR.tear[1]) / h) * 512;
  meshPic(net, painted('fhNetTorn', 512, 512, (c) => {
    c.clearRect(0, 0, 512, 512);
    c.strokeStyle = NET;
    c.lineWidth = 2.5;
    for (let i = -512; i < 1024; i += 22) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 512, 512);
      c.moveTo(i, 512);
      c.lineTo(i + 512, 0);
      c.stroke();
    }
    // The tear itself: a hole with loose ends.
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.ellipse(cx, cy, 52, 44, 0.3, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = shade(NET, 0.75);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * 54, cy + Math.sin(a) * 46);
      c.lineTo(cx + Math.cos(a + 0.2) * 38, cy + Math.sin(a + 0.2) * 32);
      c.stroke();
    }
  }), w, h, 0, 0, 0);
  const patch = meshPic(net, painted('fhNetPatch', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = NEW_NET;
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(64, 64, 62, 52, 0.3, 0, Math.PI * 2);
    c.clip();
    for (let i = -128; i < 256; i += 22) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 128, 128);
      c.moveTo(i, 128);
      c.lineTo(i + 128, 0);
      c.stroke();
    }
  }), 0.42, 0.42, NR.tear[0], NR.tear[1] - 1.0, 0.004);
  for (let i = 0; i < 12; i++) part(g, ball(0.035), i % 2 ? ORANGE : '#d7b98a', -0.84 + i * 0.153, 1.84, NR.z + 0.02, { outline: false });
  for (let i = 0; i < 12; i++) part(g, ball(0.018), '#4a4f54', -0.84 + i * 0.153, 0.16, NR.z + 0.01, { outline: false });
  for (const [x, w2, d] of [[-0.56, 0.7, 0.42], [0.22, 0.86, 0.36], [0.78, 0.36, 0.3]] as const) {
    const m = part(g, rbox(w2, 0.11, d, 0.05), shade(NET, 0.88), x, 0.06, NR.z + 0.1, { outline: false });
    m.rotation.y = x * 0.5;
  }
  // The crate to sit on, the spool on its own, the tools waiting on it.
  part(g, rbox(0.42, 0.32, 0.32, 0.015), CRATE_BLUE, NR.seat[0], 0.16, NR.seat[2]);
  part(g, cyl(0.1, 0.1, 0.34, 12), WOOD_D, NR.spool[0], 0.17, NR.spool[2]);
  part(g, cyl(0.065, 0.065, 0.14, 12), NEW_NET, NR.spool[0], NR.spool[1], NR.spool[2]);
  const needle = group(g);
  part(needle, box(0.024, 0.15, 0.006), '#2e7d32', 0, 0, 0, { outline: false });
  part(needle, box(0.012, 0.09, 0.008), NEW_NET, 0, 0, 0, { outline: false });
  const knife = group(g);
  part(knife, box(0.02, 0.08, 0.012), BLACK, 0, -0.03, 0, { outline: false });
  part(knife, box(0.018, 0.08, 0.002), CHROME, 0, 0.05, 0, { outline: false });
  // The knot board on the right post.
  const names = ['바른매듭', '고리매듭', '두겹매듭'];
  part(g, box(0.46, 0.66, 0.02), WOOD_D, NR.board[0], 1.32, NR.board[2] - 0.012);
  label(g, '매듭 연습', 0.4, 0.07, NR.board[0], 1.62, NR.board[2] + 0.002, WOOD_D, '#fffde7');
  const lamps: THREE.Mesh[] = [];
  NR.boardRows.forEach((y, i) => {
    const yy = y - 0.03;
    label(g, names[i], 0.24, 0.06, NR.board[0] + 0.06, yy, NR.board[2] + 0.002, '#fffde7', INK);
    torus(g, 0.032, 0.008, ROPE, NR.board[0] - 0.14, yy, NR.board[2] + 0.006);
    lamps.push(ownLit(g, ball(0.012), '#3b2a18', NR.board[0] + 0.21, yy, NR.board[2] + 0.004));
  });
  // A short cord to practise on.
  const cord = group(g);
  part(cord, cyl(0.006, 0.006, 0.3, 6), ROPE, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const tied = part(cord, ball(0.024), shade(ROPE, 0.85), 0, 0, 0, { outline: false });
  const bosun = person(g, LOOKS.bosun, NR.boss[0], NR.boss[1], -Math.PI * 0.72, 'male');
  const spots: Record<string, Spot> = { mendNets: standAt(g, 'fhMend'), fisher_learnKnots: standAt(g, 'fhKnots') };
  spots['*'] = spots.mendNets;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const k = n.patch ?? 0;
    // Mended up until someone is at it again; it fills from the middle out.
    patch.visible = !N || now !== 'mendNets' ? now !== 'fisher_learnKnots' : k > 0.01;
    patch.scale.setScalar(N && now === 'mendNets' ? Math.max(0.05, k) : 1);
    net.rotation.x = 0.012 * Math.sin(t * 0.8) + 0.01 * (n.sway ?? 0) * Math.sin(t * 7);
    at(needle, P.needle);
    at(knife, P.knife);
    at(cord, P.cord);
    tied.scale.setScalar(Math.max(0.05, n.knot ?? 0));
    lamps.forEach((m, i) => setLit(m, Math.round(n.lit ?? 0) === i + 1 ? '#ffd54f' : '#3b2a18'));
    bosun.root.visible = now === 'fisher_learnKnots';
    if (bosun.root.visible) {
      const i = Math.round(n.lit ?? 1) - 1;
      bosun.armR((n.point ?? 0) > 0.4 && i >= 0 ? v3(NR.board[0] - 0.14, NR.boardRows[i] - 0.03, NR.board[2] + 0.06) : null);
      bosun.armL(null);
      bosun.opts.nod = 0.1 + 0.25 * (n.bNod ?? 0) * Math.abs(Math.sin(t * 2.4));
    }
  });
  out.work = marker(g, NR.tear[0], NR.tear[1], NR.tear[2]);
}

// =============================================================================================
// 어상자 (fishCrates, 1 × 1).

function fishCrates(g: THREE.Group, out: Built) {
  // The tub of the morning's catch at the back.
  part(g, cyl(0.38, 0.32, 0.72, 20), '#1f6fb0', FC.heap[0], 0.36, FC.heap[2]);
  torus(g, 0.38, 0.018, '#17598f', FC.heap[0], 0.72, FC.heap[2], { rx: Math.PI / 2 });
  part(g, cyl(0.36, 0.36, 0.015, 20), '#cfe1e6', FC.heap[0], 0.7, FC.heap[2], { outline: false });
  const heap: THREE.Group[] = [];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const r = 0.06 + (i % 4) * 0.07;
    const f = fishMesh(g, CATCH[i % 3], 0.26);
    f.position.set(FC.heap[0] + r * Math.cos(a), 0.74 + (i % 3) * 0.035, FC.heap[2] + r * Math.sin(a));
    f.rotation.y = a;
    heap.push(f);
  }
  // Three crates on their low stand, each with its name.
  part(g, box(0.96, 0.03, 0.38), '#607d8b', 0, FC.crates[0][1] - 0.15, FC.crates[0][2]);
  for (const x of [-0.42, 0.42]) for (const z of [0.05, 0.36]) part(g, box(0.03, 0.5, 0.03), '#455a64', x, 0.25, z);
  const NAMES = ['고등어', '삼치', '갈치'];
  const held: THREE.Group[][] = FC.crates.map((p, i) => {
    const c = crateMesh(g, 0.28, 0.32, 0.13);
    c.position.set(p[0], p[1] - 0.135, p[2]);
    part(c, box(0.25, 0.02, 0.29), '#e6f0f3', 0, 0.03, 0, { outline: false });
    label(c, NAMES[i], 0.2, 0.05, 0, 0.07, 0.164, CRATE_BLUE, '#ffffff');
    return [0, 1, 2].map((j) => {
      const f = fishMesh(c, CATCH[i], 0.22);
      f.position.set(0, 0.055 + j * 0.012, -0.08 + j * 0.08);
      return f;
    });
  });
  // The hose on its post.
  part(g, box(0.04, 1.2, 0.04), '#546e7a', FC.hose[0] + 0.04, 0.6, FC.hose[2]);
  torus(g, 0.11, 0.022, '#ffb300', FC.hose[0] + 0.04, FC.hose[1], FC.hose[2] + 0.03);
  const hose = group(g);
  part(hose, cyl(0.016, 0.012, 0.12, 8), '#ffb300', 0, 0, 0, { rx: 0.5, outline: false });
  const spray = puffs(g, 6, '#d4f1fa', 0.018);
  const fishProps = [0, 1, 2].map((i) => fishMesh(g, CATCH[i], 0.26));
  const spots: Record<string, Spot> = { sortCatch: standAt(g, 'fhSort', 0.74) };
  spots['*'] = spots.sortCatch;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const left = N ? 1 - (n.heap ?? 0) : 1;
    heap.forEach((f, i) => (f.visible = i < 3 || i / 9 < left));
    held.forEach((list, i) => {
      const got = N ? (n[`c${i}`] ?? 0) : 2;
      list.forEach((f, j) => (f.visible = j < got + 0.5));
    });
    const kind = Math.round(n.kind ?? 0);
    fishProps.forEach((f, i) => at(f, i === kind ? P.fish : null));
    at(hose, P.hose);
    const w = n.water ?? 0;
    if (P.hose) spray(w, P.hose[0], P.hose[1] - 0.42, P.hose[2] - 0.08, 0.05, t * 2.2, 0.42);
    else spray(0, 0, 0, 0, 0, t);
  });
  out.work = marker(g, FC.heap[0], FC.heap[1], FC.heap[2]);
}

// =============================================================================================
// 위판대 (fishAuction, 2 × 1).

function fishAuction(g: THREE.Group, out: Built) {
  // A long low skid, double-stacked crates on it, the sold tag each will get.
  part(g, box(1.96, 0.05, 0.74), WOOD, 0, 0.09, 0);
  for (const x of [-0.8, 0, 0.8]) part(g, box(0.1, 0.07, 0.72), WOOD_D, x, 0.035, 0);
  const tags: THREE.Mesh[] = [];
  AU.crates.forEach((x, i) => {
    const low = fullCrate(g, i);
    low.position.set(x, 0.115, 0);
    if (i !== 2) {
      const up = fullCrate(g, i);
      up.position.set(x, 0.24, 0);
    }
    tags.push(part(g, box(0.13, 0.09, 0.006), '#fff59d', x, AU.crateY + 0.02, 0.17, { outline: false }));
    label(g, ['고등어', '삼치', '갈치'][i], 0.24, 0.06, x, 0.17, 0.168, CRATE_BLUE, '#ffffff');
  });
  const top = fullCrate(g, 2);
  // The bell on its post, its rope; the slate on the other post.
  part(g, box(0.06, 1.6, 0.06), '#546e7a', AU.bell[0] + 0.0, 0.8, AU.bell[2] - 0.04);
  rod(g, v3(AU.bell[0], 1.48, AU.bell[2] - 0.04), v3(AU.bell[0], 1.48, AU.bell[2] + 0.14), 0.012, '#546e7a');
  const bell = group(g, AU.bell[0], 1.45, AU.bell[2] + 0.14);
  part(bell, cyl(0.04, 0.09, 0.12, 14), '#c9a13b', 0, -0.06, 0);
  part(bell, ball(0.02), '#7a6125', 0, -0.13, 0, { outline: false });
  const pull = group(bell);
  part(pull, cyl(0.006, 0.006, 0.28, 6), ROPE, 0, -0.26, 0, { outline: false });
  part(g, box(0.05, 1.46, 0.05), '#546e7a', AU.slate[0], 0.73, AU.slate[2] - 0.05);
  part(g, box(0.44, 0.34, 0.025), WOOD_D, AU.slate[0] - 0.14, AU.slate[1] + 0.14, AU.slate[2] - 0.03);
  const slate = swapPic(g, 0.4, 0.3, AU.slate[0] - 0.14, AU.slate[1] + 0.14, AU.slate[2] - 0.015);
  const slateIdle = painted('fhSlateIdle', 192, 144, (c) => {
    c.fillStyle = '#23403a';
    c.fillRect(0, 0, 192, 144);
    text(c, '오늘의 위판', 96, 26, 22, '#f5f3e6', 'center');
    text(c, `${PORT} 위판장`, 96, 62, 17, '#cfe9d7', 'center');
    text(c, '06:00 시작', 96, 100, 19, '#ffd54f', 'center');
  });
  slate.set(slateIdle);
  const slateLive = live(192, 144);
  // The hanging scale on its own stand.
  part(g, box(0.3, 0.02, 0.24), STEEL, AU.scale[0], AU.scale[1] - 0.03, AU.scale[2]);
  for (const x of [-0.12, 0.12]) part(g, box(0.03, AU.scale[1] - 0.04, 0.03), '#546e7a', AU.scale[0] + x, (AU.scale[1] - 0.04) / 2, AU.scale[2]);
  part(g, rbox(0.1, 0.09, 0.06, 0.01), BLACK, AU.scale[0], AU.scale[1] + 0.34 - 0.04, AU.scale[2] - 0.13);
  const kiloRead = swapPic(g, 0.08, 0.05, AU.scale[0], AU.scale[1] + 0.3, AU.scale[2] - 0.098);
  rod(g, v3(AU.scale[0], AU.scale[1], AU.scale[2] - 0.13), v3(AU.scale[0], AU.scale[1] + 0.26, AU.scale[2] - 0.13), 0.012, '#546e7a');
  const kiloZero = painted('fhKiloZero', 64, 40, (c) => {
    c.fillStyle = '#0d1a14';
    c.fillRect(0, 0, 64, 40);
    text(c, '0.0', 60, 20, 18, '#66ff99', 'right');
  });
  const kiloFull = painted('fhKiloFull', 64, 40, (c) => {
    c.fillStyle = '#0d1a14';
    c.fillRect(0, 0, 64, 40);
    text(c, '18.6', 60, 20, 18, '#66ff99', 'right');
  });
  kiloRead.set(kiloZero);
  const clip = clipMesh(g, painted('fhMarketSheet', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '어제 시세', 64, 16, 15, INK, 'center');
    [['고등어', '41,000'], ['삼치', '62,000'], ['갈치', '88,000'], ['오징어', '53,000']].forEach(([a, b], i) => {
      text(c, a, 8, 50 + i * 26, 13, INK);
      text(c, b, 122, 50 + i * 26, 13, BLUE, 'right');
    });
  }));
  const pen = penMesh(g);
  // Buyers across the skid, in the caps with their numbers.
  const CAPS = ['#fdd835', '#ef5350', '#4fc3f7'];
  const buyers = AU.buyers.map(([x, z], i) => person(g, [LOOKS.buyerA, LOOKS.buyerB, LOOKS.buyerC][i], x, z, 0, i === 1 ? 'female' : 'male', CAPS[i]));
  const spots: Record<string, Spot> = { sellAtAuction: standAt(g, 'fhSell', AU.stand), fisher_setPrice: standAt(g, 'fhPrice', AU.stand) };
  spots['*'] = spots.sellAtAuction;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    bell.rotation.z = 0.35 * (n.bell ?? 0);
    tags.forEach((m, i) => (m.visible = now === 'sellAtAuction' ? (n[`s${i}`] ?? 0) > 0.5 : (now === 'fisher_setPrice' && i === 1 && (n.tag ?? 0) > 0.5)));
    at(top, P.crate, [AU.crates[2], 0.24, 0]);
    at(clip, P.clip);
    at(pen, P.pen);
    kiloRead.set((n.kilos ?? 0) > 0.5 ? kiloFull : kiloZero);
    const selling = now === 'sellAtAuction';
    const lot = Math.round(n.lot ?? 0);
    if (selling && lot > 0) {
      const price = 38000 + 2000 * Math.floor((n.price ?? 0) * 8);
      slate.set(slateLive((c) => {
        c.fillStyle = '#23403a';
        c.fillRect(0, 0, 192, 144);
        text(c, ['고등어', '삼치', '갈치'][Math.min(2, lot - 1)], 96, 26, 22, '#f5f3e6', 'center');
        text(c, `${price.toLocaleString('ko-KR')}원`, 96, 80, 28, '#ffd54f', 'center');
      }));
    } else slate.set(slateIdle);
    // Who's there: three buyers answering the calls, or one trader at the pricing.
    buyers.forEach((f, i) => {
      f.root.visible = selling || (now === 'fisher_setPrice' && i === 1);
      if (!f.root.visible) return;
      const up = selling && (n[`b${i}`] ?? 0) > 0.5;
      f.armR(up ? v3(AU.buyers[i][0] - 0.22, 1.72 + 0.04 * Math.sin(t * 12 + i), AU.buyers[i][1] + 0.16) : null);
      f.armL(null);
      f.opts.nod = 0.1 + 0.2 * (n.mNod ?? 0);
    });
  });
  out.work = marker(g, 0, AU.crateY + 0.1, 0);
}

// =============================================================================================
// 통발 더미 (fhPots, 2 × 1) and the floats and flags (fhFloats, 1 × 1).

function pots(g: THREE.Group, out: Built) {
  const netMat = new THREE.MeshBasicMaterial({ map: netTex(), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: false, color: '#7fc4e8' });
  // The stack: two rows and a top, tied down.
  const stackAt: Array<[number, number, number]> = [[-0.72, 0.22, -0.1], [-0.28, 0.22, -0.1], [-0.72, 0.22, 0.3], [-0.5, 0.58, -0.1]];
  stackAt.forEach((p) => {
    const m = potMesh(g, netMat);
    m.root.position.set(p[0], p[1], p[2]);
    m.fresh.visible = false;
    m.door.visible = true;
  });
  // The rope coil and a float at the end of it.
  torus(g, 0.14, 0.022, ROPE, -0.82, 0.03, 0.42 - 0.12, { rx: Math.PI / 2 });
  // The upturned crate the work's done on, the bait bucket on its stool, the bin.
  part(g, rbox(0.56, 0.4, 0.36, 0.015), CRATE_BLUE, PT.bench[0], 0.2, PT.bench[2]);
  part(g, cyl(0.17, 0.17, 0.03, 14), WOOD, PT.bucket[0], 0.21, PT.bucket[2]);
  for (const a of [0, 2.09, 4.18]) part(g, cyl(0.016, 0.016, 0.2, 6), WOOD_D, PT.bucket[0] + 0.12 * Math.cos(a), 0.1, PT.bucket[2] + 0.12 * Math.sin(a), { outline: false });
  part(g, cyl(0.14, 0.11, 0.2, 14), '#eceff1', PT.bucket[0], 0.32, PT.bucket[2]);
  part(g, cyl(0.125, 0.125, 0.01, 14), '#7a5a3a', PT.bucket[0], 0.415, PT.bucket[2], { outline: false });
  label(g, '미끼', 0.14, 0.05, PT.bucket[0], 0.33, PT.bucket[2] + 0.13, '#eceff1', RED);
  part(g, cyl(0.15, 0.13, 0.26, 14), '#546e7a', PT.bin[0], 0.13, PT.bin[2]);
  part(g, cyl(0.135, 0.135, 0.01, 14), '#2a2f33', PT.bin[0], 0.262, PT.bin[2], { outline: false });
  label(g, `${PORT} 통발`, 0.34, 0.07, -0.5, 0.05, 0.47, WOOD, '#ffffff');
  const pot = potMesh(g, netMat);
  const oldBag = part(g, ball(0.05), '#5d5146', 0, 0, 0, { outline: false });
  const newBag = part(g, ball(0.05), '#d8c7ad', 0, 0, 0, { outline: false });
  const bits = puffs(g, 4, '#8d6e50', 0.012);
  const spots: Record<string, Spot> = { fhBaitPots: standAt(g, 'fhPots', PT.stand) };
  spots['*'] = spots.fhBaitPots;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(pot.root, P.pot, N ? undefined : PT.stack);
    pot.door.rotation.x = -1.4 * (n.door ?? 0);
    pot.old.visible = (n.oldIn ?? 1) > 0.5;
    pot.fresh.visible = (n.newIn ?? 0) > 0.5;
    at(oldBag, P.oldBag);
    at(newBag, P.newBag);
    newBag.scale.setScalar(0.5 + 0.5 * (n.bait ?? 1));
    bits((n.bait ?? 0) > 0 && (n.bait ?? 0) < 1 ? 1 : 0, PT.bucket[0], PT.bucket[1] + 0.06, PT.bucket[2], 0.04, t * 1.6, 0.22);
  });
  out.work = marker(g, PT.bench[0], PT.bench[1], PT.bench[2]);
}
function floats(g: THREE.Group) {
  // Strings of floats and the tall flagged poles that mark a set of pots, leaning in a frame.
  part(g, box(0.86, 0.05, 0.66), WOOD_D, 0, 0.05, 0);
  for (let i = 0; i < 7; i++) {
    const col = i % 3 === 0 ? '#fafafa' : ORANGE;
    part(g, ball(0.13), col, -0.26 + (i % 3) * 0.26, 0.2, -0.16 + Math.floor(i / 3) * 0.26);
  }
  for (let i = 0; i < 3; i++) part(g, ball(0.12), i === 1 ? ORANGE : '#fafafa', -0.13 + i * 0.13, 0.42, 0.0);
  ([[-0.32, RED], [0.02, '#ffb300'], [0.34, '#2e7d32']] as const).forEach(([x, c]) => {
    rod(g, v3(x, 0.05, -0.28), v3(x + 0.04, 2.2, -0.34), 0.012, '#c8a76a');
    part(g, box(0.26, 0.17, 0.006), c, x + 0.17, 2.08, -0.34);
  });
  torus(g, 0.13, 0.02, ROPE, 0.28, 0.1, 0.22, { rx: Math.PI / 2 });
}

// =============================================================================================
// 제빙기 (fhIce, 2 × 1).

function icePlant(g: THREE.Group, out: Built) {
  // The plant: a steel cabinet, louvres, a pressure dial and the temperature, its hopper reaching out to the right.
  part(g, rbox(1.2, 1.9, 0.66, 0.02), '#b7c1c6', -0.34, 0.95, -0.12);
  part(g, box(1.22, 0.06, 0.68), '#546e7a', -0.34, 0.03, -0.12);
  for (let i = 0; i < 6; i++) part(g, box(0.5, 0.012, 0.004), '#7f8c92', -0.56, 0.4 + i * 0.06, 0.216, { outline: false });
  label(g, '제빙기', 0.5, 0.14, -0.34, 1.68, 0.214, NAVY, '#ffffff');
  label(g, `${PORT} 얼음`, 0.36, 0.07, -0.34, 1.52, 0.214, '#b7c1c6', INK);
  const temp = swapPic(g, 0.26, 0.11, -0.62, 1.34, 0.216);
  temp.set(painted('fhIceTemp', 128, 56, (c) => {
    c.fillStyle = '#071826';
    c.fillRect(0, 0, 128, 56);
    text(c, '-12℃', 122, 28, 30, '#66e0ff', 'right');
  }));
  // The lever on its plate, and its run lamp.
  part(g, box(0.16, 0.3, 0.012), '#37474f', IC.lever[0], IC.lever[1], 0.216);
  const lever = group(g, IC.lever[0], IC.lever[1] + 0.02, 0.23);
  part(lever, cyl(0.012, 0.012, 0.12, 8), CHROME, 0, 0, 0.06, { rx: Math.PI / 2, outline: false });
  part(lever, ball(0.03), RED, 0, 0, 0.13, { outline: false });
  const lamp = ownLit(g, ball(0.02), '#2a3b1a', IC.lever[0] + 0.14, IC.lever[1] + 0.14, 0.22);
  // Hopper and chute.
  part(g, box(0.6, 0.34, 0.5), '#9aa8ae', 0.4, 1.62, -0.06);
  part(g, cyl(0.2, 0.14, 0.32, 12), '#9aa8ae', IC.chute[0], 1.3, IC.chute[2] - 0.08);
  part(g, cyl(0.14, 0.11, 0.14, 12), '#7f8c92', IC.chute[0], 1.1, IC.chute[2] - 0.02);
  // The roller stand.
  for (const x of [-0.26, 0.26]) for (const z of [-0.14, 0.2]) part(g, box(0.03, IC.crate[1], 0.03), '#546e7a', IC.chute[0] + x, IC.crate[1] / 2, IC.crate[2] + z - 0.02);
  for (let i = 0; i < 5; i++) part(g, cyl(0.016, 0.016, 0.56, 8), STEEL, IC.chute[0] + 0, IC.crate[1] - 0.01, IC.crate[2] - 0.14 + i * 0.085, { rz: Math.PI / 2, outline: false });
  // The empties waiting on a pallet, the shovel leaning, a dolly.
  part(g, box(0.52, IC.empties[1] - 0.14, 0.36), WOOD_D, IC.empties[0], (IC.empties[1] - 0.14) / 2, IC.empties[2]);
  crateMesh(g).position.set(IC.empties[0], IC.empties[1] - 0.14, IC.empties[2]);
  const shovelHome = group(g, IC.shovel[0], 0, IC.shovel[2]);
  rod(shovelHome, v3(0, 1.1, 0), v3(0.02, 0.2, -0.02), 0.014, WOOD);
  part(shovelHome, box(0.2, 0.26, 0.012), '#b0bec5', 0.02, 0.13, -0.02);
  part(g, box(0.5, 0.03, 0.34), '#ef6c00', IC.dolly[0], IC.dolly[1] - 0.015, IC.dolly[2]);
  for (const x of [-0.2, 0.2]) for (const z of [-0.13, 0.13]) part(g, cyl(0.045, 0.045, 0.04, 10), BLACK, IC.dolly[0] + x, 0.09, IC.dolly[2] + z, { rz: Math.PI / 2 });
  // The crate at work: the ice level rising; its lid.
  const crate = crateMesh(g);
  const fill = part(crate, box(0.42, 0.13, 0.28), '#f2fbff', 0, 0.075, 0, { outline: false });
  const lid = group(g);
  part(lid, rbox(0.5, 0.02, 0.36, 0.008), CRATE_BLUE, 0, 0, 0);
  const shovel = group(g);
  rod(shovel, v3(0, 0, 0), v3(0.1, 0.24, 0.16), 0.012, WOOD);
  part(shovel, box(0.16, 0.012, 0.18), '#b0bec5', 0, 0, 0);
  const pour = puffs(g, 10, '#f2fbff', 0.016);
  const spots: Record<string, Spot> = { fhIceCrates: standAt(g, 'fhIce', IC.stand) };
  spots['*'] = spots.fhIceCrates;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    lever.rotation.x = 0.9 * (n.lever ?? 0);
    setLit(lamp, (n.run ?? 0) > 0.5 ? '#c6ff00' : '#2a3b1a');
    at(crate, P.crate, IC.crate);
    const k = N ? (n.fill ?? 0) : 1;
    fill.visible = k > 0.02;
    fill.scale.y = Math.max(0.05, k);
    fill.position.y = 0.01 + 0.065 * Math.max(0.05, k);
    at(lid, P.lid ?? (N && (n.lid ?? 0) > 0.5 && P.crate ? add(P.crate, 0, 0.15, 0) : null));
    at(shovel, P.shovel);
    shovelHome.visible = !P.shovel;
    if ((n.flow ?? 0) > 0.5) pour(1, IC.crate[0], IC.chute[1] - 0.46, IC.crate[2] - 0.02, 0.05, t * 2.4, 0.5);
    else pour(0, 0, 0, 0, 0, t);
  });
  out.work = marker(g, IC.crate[0], IC.crate[1] + 0.14, IC.crate[2]);
}

// =============================================================================================
// 오징어 건조대 (fhSquid, 3 × 1).

function squidRack(g: THREE.Group, out: Built) {
  for (const x of [-1.42, 0, 1.42]) {
    part(g, box(0.07, 2.0, 0.07), WOOD, x, 1.0, -0.04);
    part(g, box(0.07, 0.05, 0.6), WOOD_D, x, 0.03, -0.04);
  }
  part(g, box(2.92, 0.06, 0.07), WOOD, 0, 2.0, -0.04);
  // Three lines, the near one the one being filled; the two behind full.
  const lines = [{ y: SQ.lineY, z: SQ.lineZ }, { y: SQ.lineY, z: -0.2 }, { y: 1.0, z: -0.04 }];
  for (const l of lines) rod(g, v3(-1.42, l.y, l.z), v3(1.42, l.y, l.z), 0.005, ROPE);
  for (const x of [-1.42, 1.42]) for (const z of [SQ.lineZ, -0.2]) rod(g, v3(x, SQ.lineY, -0.04), v3(x, SQ.lineY, z), 0.012, WOOD_D);
  const swing = group(g);
  for (let i = 0; i < 11; i++) {
    const x = -1.25 + i * 0.25;
    squidMesh(swing).position.set(x, lines[1].y, lines[1].z);
    squidMesh(swing).position.set(x, lines[2].y, lines[2].z);
  }
  const front = Array.from({ length: SQ.count }, (_, i) => {
    const s = squidMesh(g);
    s.position.set(sqPeg(i), SQ.lineY, SQ.lineZ);
    part(s, box(0.02, 0.04, 0.012), '#fafafa', 0, 0.012, 0, { outline: false });
    return s;
  });
  label(g, '말리는 중 · 손대지 마세요', 0.9, 0.11, -0.72, 2.0, -0.002, WOOD, '#fffde7');
  // The basket on its stool, the loose one in hand.
  const stool = group(g, SQ.basket[0], 0, SQ.basket[2]);
  part(stool, box(0.34, 0.03, 0.3), WOOD, 0, 0.32, 0);
  for (const x of [-0.13, 0.13]) for (const z of [-0.12, 0.12]) part(stool, box(0.03, 0.31, 0.03), WOOD_D, x, 0.155, z);
  const basket = group(g);
  part(basket, cyl(0.2, 0.15, 0.18, 14), '#c9a56a', 0, 0.09, 0);
  part(basket, cyl(0.18, 0.18, 0.01, 14), SQUID, 0, 0.17, 0, { outline: false });
  const loose = squidMesh(g);
  const spots: Record<string, Spot> = { fhHangSquid: standAt(g, 'fhSquid', SQ.stand) };
  spots['*'] = spots.fhHangSquid;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    swing.rotation.x = 0.004 * Math.sin(t * 0.9);
    const hung = N ? (n.hung ?? 0) : SQ.count;
    front.forEach((s, i) => {
      s.visible = i >= 6 || i < hung - 0.5;
      s.rotation.z = 0.05 * Math.sin(t * 1.3 + i);
    });
    at(loose, P.squid);
    at(basket, P.basket, SQ.basket);
  });
  out.work = marker(g, 0, SQ.lineY - 0.2, SQ.lineZ);
}

// =============================================================================================
// 물때 게시판 (fhTideBoard, 2 × 1).

function tideBoard(g: THREE.Group, out: Built) {
  for (const x of [-0.86, 0.72]) part(g, box(0.07, 2.2, 0.07), '#546e7a', x, 1.1, -0.02);
  part(g, box(1.72, 1.58, 0.03), '#37596e', -0.06, 1.36, 0);
  picture(g, painted('fhTideTable', 512, 468, (c) => {
    c.fillStyle = '#f1f5ef';
    c.fillRect(0, 0, 512, 468);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 512, 64);
    text(c, `${PORT} 물때표`, 256, 32, 34, '#ffffff', 'center');
    c.strokeStyle = BLUE;
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 16; x < 496; x += 4) c.lineTo(x, 118 + 30 * Math.sin((x / 496) * Math.PI * 6));
    c.stroke();
    ['날짜', '물때', '만조', '간조', '파고'].forEach((h, i) => text(c, h, 22 + i * 62, 172, 18, NAVY));
    c.strokeStyle = '#b0bec5';
    c.lineWidth = 1.5;
    const rows = [['28', '6물', '05:42', '11:58', '0.8'], ['29', '7물', '06:21', '12:37', '1.1'], ['30', '8물', '07:03', '13:15', '1.0'], ['31', '9물', '', '', '']];
    rows.forEach((r, i) => {
      const y = 208 + i * 44;
      c.beginPath();
      c.moveTo(14, y - 22);
      c.lineTo(310, y - 22);
      c.stroke();
      r.forEach((s, j) => text(c, s, 22 + j * 62, y, 16, INK));
    });
  }), 1.1, 1.0, -0.36, 1.45, 0.017);
  // The day's row, written out when it's done.
  const today = picture(g, painted('fhTideRow', 256, 40, (c) => {
    c.fillStyle = '#f1f5ef';
    c.fillRect(0, 0, 256, 40);
    text(c, '07:44', 10, 20, 19, RED);
    text(c, '13:54', 92, 20, 19, RED);
    text(c, '0.9', 176, 20, 19, RED);
  }), 0.36, 0.055, 0, 0, 0.02);
  today.position.set(TB.tideRow[0] + 0.08, TB.tideRow[1] - 0.028 + 0.0, 0.02);
  // Weather: the barometer, today's forecast underneath.
  part(g, cyl(0.15, 0.15, 0.03, 20), '#8d6e63', TB.baro[0], TB.baro[1], 0.02, { rx: Math.PI / 2 });
  picture(g, painted('fhBaro', 128, 128, (c) => {
    c.fillStyle = PAPER;
    c.beginPath();
    c.arc(64, 64, 64, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      c.beginPath();
      c.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46);
      c.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58);
      c.stroke();
    }
    text(c, 'hPa', 64, 92, 18, INK, 'center');
  }), 0.26, 0.26, TB.baro[0], TB.baro[1], 0.038);
  const needle = group(g, TB.baro[0], TB.baro[1], 0.042);
  part(needle, box(0.006, 0.1, 0.003), RED, 0, 0.05, 0, { outline: false });
  label(g, '오늘: 북동풍 6m/s', 0.46, 0.08, TB.baro[0], 1.22, 0.018, '#37596e', '#ffffff');
  label(g, '구름 조금 · 파고 1m', 0.46, 0.08, TB.baro[0], 1.12, 0.018, '#37596e', '#ffffff');
  // The marker's ledge.
  part(g, box(0.36, 0.02, 0.1), '#37474f', TB.marker[0], TB.marker[1] - 0.04, 0.06);
  const pen = group(g);
  part(pen, cyl(0.012, 0.012, 0.12, 8), RED, 0, 0, 0, { rz: 1.2, outline: false });
  // Wind cups and a vane on a pole above the left post.
  const cupX = -0.86;
  part(g, cyl(0.012, 0.012, 0.56, 8), '#37474f', cupX, 2.46, -0.02);
  const cups = group(g, cupX, 2.74, -0.02);
  for (let i = 0; i < 3; i++) {
    const a = group(cups);
    a.rotation.y = (i * Math.PI * 2) / 3;
    part(a, box(0.16, 0.008, 0.008), '#37474f', 0.08, 0, 0, { outline: false });
    part(a, ball(0.03), '#eceff1', 0.17, 0, 0.012);
  }
  // The flag pole and halyard: a warning flag that climbs when it's called for.
  part(g, cyl(0.016, 0.022, 2.7, 8), '#eceff1', TB.halyard[0] + 0.12, 1.35, TB.halyard[2] - 0.08);
  const flag = group(g, TB.halyard[0] + 0.12, 1.2, TB.halyard[2] - 0.08);
  const flagM = part(flag, box(0.34, 0.2, 0.006), '#e53935', 0.18, 0, 0, { outline: false });
  label(flag, '주의', 0.2, 0.09, 0.18, 0, 0.005, '#e53935', '#ffffff');
  rod(g, v3(TB.halyard[0] + 0.1, 0.92, TB.halyard[2] - 0.05), v3(TB.halyard[0] + 0.1, 2.68, TB.halyard[2] - 0.05), 0.004, ROPE);
  part(g, box(0.09, 0.03, 0.03), '#546e7a', TB.halyard[0] + 0.1, 0.92, TB.halyard[2] - 0.05, { outline: false });
  const spots: Record<string, Spot> = { fhReadTide: standAt(g, 'fhTide', TB.stand) };
  spots['*'] = spots.fhReadTide;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    cups.rotation.y = t * 3.6;
    needle.rotation.z = -0.35 + 0.05 * Math.sin(t * 0.4) + ((n.tap ?? 0) > 0.5 ? 0.03 * Math.sin(t * 15) : 0);
    const w = N ? (n.written ?? 0) : 1;
    today.visible = w > 0.02;
    today.scale.x = Math.max(0.02, w);
    today.position.x = TB.tideRow[0] + 0.08 - 0.18 * (1 - w);
    flag.position.y = 1.2 + (N ? (n.flag ?? 0) : 1) * 1.28;
    flagM.rotation.y = 0.14 * Math.sin(t * 3.2);
    at(pen, P.marker, TB.marker);
  });
  out.work = marker(g, TB.tideRow[0], TB.tideRow[1], TB.tideRow[2]);
}

// =============================================================================================
// 낙찰 칠판 (fhBidBoard, 2 × 1).

function bidBoard(g: THREE.Group, out: Built) {
  const BOARD = '#264a3f';
  for (const x of [-0.94, 0.94]) {
    part(g, box(0.07, 1.86, 0.07), WOOD_D, x, 0.93, BB.z - 0.04);
    part(g, box(0.07, 0.05, 0.5), WOOD_D, x, 0.03, BB.z - 0.04);
  }
  part(g, box(1.84, 1.02, 0.03), WOOD_D, 0, 1.3, BB.z - 0.02);
  part(g, box(1.76, 0.94, 0.012), BOARD, 0, 1.3, BB.z);
  label(g, '낙찰 현황', 0.6, 0.11, 0, 1.72, BB.z + 0.008, WOOD_D, '#fffde7');
  // The written rows (a picture), and strips of board that cover them till they're chalked.
  picture(g, painted('fhBidRows', 512, 256, (c) => {
    c.fillStyle = BOARD;
    c.fillRect(0, 0, 512, 256);
    const rows = [['1 고등어', '34상자', '46,000', '7번'], ['2 삼치', '12상자', '64,000', '3번'], ['3 갈치', '8상자', '91,000', '7번'], ['4 오징어', '20상자', '55,000', '12번']];
    rows.forEach((r, i) => {
      const y = 34 + i * 62;
      text(c, r[0], 14, y, 28, '#f5f3e6');
      text(c, r[1], 200, y, 26, '#cfe9d7');
      text(c, r[2], 310, y, 28, '#ffd54f');
      text(c, r[3], 470, y, 26, '#f5f3e6');
    });
  }), 1.6, 0.8, 0, 1.29, BB.z + 0.009);
  const covers = BB.rows.map((y) => part(g, box(1.62, 0.19, 0.002), BOARD, 0, y, BB.z + 0.012, { outline: false, shadow: false }));
  // The ledge, the eraser and chalk; the sheet on its little lectern.
  part(g, box(1.84, 0.03, 0.08), WOOD_D, 0, 0.8, BB.z + 0.04);
  const eraser = group(g);
  part(eraser, rbox(0.11, 0.05, 0.05, 0.01), '#8d6e63', 0, 0, 0);
  part(eraser, box(0.1, 0.012, 0.05), '#eceff1', 0, -0.025, 0, { outline: false });
  const chalk = group(g);
  part(chalk, cyl(0.007, 0.007, 0.06, 6), '#fafafa', 0, 0, 0, { rz: 1.1, outline: false });
  part(g, box(0.05, BB.sheet[1] - 0.02, 0.05), WOOD_D, BB.sheet[0], (BB.sheet[1] - 0.02) / 2, BB.sheet[2]);
  const sheetTex = painted('fhBidSheet', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '낙찰 기록지', 64, 16, 14, INK, 'center');
    for (let i = 0; i < 6; i++) {
      c.strokeStyle = '#b0bec5';
      c.beginPath();
      c.moveTo(8, 40 + i * 22);
      c.lineTo(120, 40 + i * 22);
      c.stroke();
      text(c, `${i + 1}`, 12, 32 + i * 22, 12, BLUE);
    }
  });
  const fixed = clipMesh(g, sheetTex, 0.18, 0.24);
  place(fixed, BB.sheet);
  const inHand = clipMesh(g, sheetTex, 0.16, 0.21);
  const dust = puffs(g, 6, '#f5f3e6', 0.015);
  const spots: Record<string, Spot> = { fhPostBid: standAt(g, 'fhBid', BB.stand) };
  spots['*'] = spots.fhPostBid;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const wiped = (n.wiped ?? 0) > 0.95;
    covers.forEach((m, i) => {
      const r = n[`r${i}`] ?? 0;
      const k = N && wiped ? 1 - r : 0;
      m.visible = k > 0.01;
      m.scale.x = Math.max(0.01, k);
      m.position.x = 0.81 * (1 - k);
    });
    at(eraser, P.eraser, [-0.5, 0.84, BB.z + 0.04]);
    at(chalk, P.chalk, [-0.28, 0.83, BB.z + 0.05]);
    at(inHand, P.sheet);
    fixed.visible = !P.sheet;
    if (P.eraser) dust(1, P.eraser[0], P.eraser[1] - 0.04, P.eraser[2] + 0.02, 0.03, t * 1.6, -0.3);
    else dust(0, 0, 0, 0, 0, t);
  });
  out.work = marker(g, BB.x + 0.6, BB.rows[1], BB.z + 0.02);
}

// =============================================================================================
// 어항 사무실 책상 (fhOfficeDesk, 2 × 1).

function officeDesk(g: THREE.Group, out: Built) {
  for (const x of [-0.88, 0.88]) for (const z of [-0.36, 0.2]) part(g, box(0.05, 0.75, 0.05), '#546e7a', x, 0.375, z);
  part(g, rbox(1.92, 0.04, 0.72, 0.012), WOOD, 0, 0.76, -0.08);
  // The pinboard on the wall: the harbour and who's out.
  part(g, box(1.84, 0.74, 0.02), '#8d7355', 0, 1.42, -0.46);
  picture(g, painted('fhPortBoard', 512, 200, (c) => {
    c.fillStyle = '#f7f2e6';
    c.fillRect(0, 0, 512, 200);
    text(c, '출입항 현황', 110, 20, 22, NAVY, 'center');
    [['제3 은빛호', '입항'], ['제7 물결호', '입항'], ['제2 갈매기호', '출항 05:10'], ['제5 동틀호', '출항 04:40']].forEach(([a, b], i) => {
      text(c, a, 14, 58 + i * 36, 18, INK);
      text(c, b, 214, 58 + i * 36, 18, i < 2 ? '#2e7d32' : RED, 'right');
    });
    c.fillStyle = '#bfe0ee';
    c.fillRect(240, 8, 264, 184);
    c.fillStyle = '#c3b58c';
    c.beginPath();
    c.moveTo(240, 8);
    c.lineTo(400, 8);
    c.quadraticCurveTo(340, 80, 382, 192);
    c.lineTo(240, 192);
    c.fill();
    text(c, PORT, 310, 100, 22, INK, 'center');
  }), 1.72, 0.66, 0, 1.42, -0.446);
  // The radio with its handset and speaker, a clock.
  part(g, rbox(0.3, 0.13, 0.22, 0.015), '#37474f', OD.mic[0], 0.85, -0.3);
  const radioLed = ownLit(g, ball(0.012), '#3b2a18', OD.mic[0] + 0.1, 0.89, -0.185);
  label(g, 'VHF 16', 0.14, 0.04, OD.mic[0] - 0.05, 0.86, -0.187, '#37474f', '#ffd54f');
  const mic = group(g);
  part(mic, rbox(0.05, 0.1, 0.035, 0.012), BLACK, 0, 0, 0);
  const cord = limb(g, 0.004, BLACK);
  part(g, cyl(0.1, 0.1, 0.02, 20), '#fafafa', 0.74, 1.62, -0.44, { rx: Math.PI / 2 });
  // The screen with the boats going about the harbour, the keyboard.
  part(g, box(0.05, 0.14, 0.05), '#37474f', OD.screen[0], 0.85, OD.screen[2] - 0.04);
  part(g, rbox(0.62, 0.38, 0.03, 0.012), BLACK, OD.screen[0], OD.screen[1], OD.screen[2]);
  const pic = swapPic(g, 0.56, 0.32, OD.screen[0], OD.screen[1], OD.screen[2] + 0.018);
  const idle = painted('fhPortScreen', 192, 112, (c) => {
    c.fillStyle = '#0d2535';
    c.fillRect(0, 0, 192, 112);
    text(c, `${PORT} 선박 위치`, 96, 56, 16, '#7fd4e8', 'center');
  });
  pic.set(idle);
  const map = live(192, 112);
  part(g, rbox(0.34, 0.015, 0.12, 0.005), BLACK, OD.keys[0], 0.79, OD.keys[2]);
  // The log, a stamp pad, the stamp and the mug.
  part(g, box(0.34, 0.012, 0.26), PAPER, OD.log[0], 0.786, OD.log[2]);
  part(g, box(0.006, 0.014, 0.26), '#90a4ae', OD.log[0], 0.787, OD.log[2], { outline: false });
  const lines = Array.from({ length: 5 }, (_, i) => part(g, box(0.13, 0.001, 0.005), INK, OD.log[0] + 0.09, 0.793, OD.log[2] - 0.08 + i * 0.04, { outline: false, shadow: false }));
  const seal = part(g, cyl(0.022, 0.022, 0.001, 12), RED, OD.log[0] - 0.09, 0.793, OD.log[2] + 0.08, { outline: false, shadow: false });
  part(g, rbox(0.1, 0.02, 0.07, 0.005), '#37474f', OD.stamp[0] + 0.06, 0.79, OD.stamp[2]);
  const stamp = group(g);
  part(stamp, cyl(0.022, 0.022, 0.03, 10), RED, 0, 0, 0, { outline: false });
  part(stamp, cyl(0.012, 0.012, 0.05, 8), '#6d4c41', 0, 0.04, 0, { outline: false });
  const mug = group(g);
  part(mug, cyl(0.035, 0.03, 0.08, 12), '#eceff1', 0, 0, 0);
  const pen = penMesh(g);
  // The chair.
  const chair = group(g, OD.seat[0], 0, OD.seat[2]);
  part(chair, rbox(0.44, 0.05, 0.42, 0.03), '#37474f', 0, 0.445, 0);
  part(chair, rbox(0.42, 0.44, 0.05, 0.03), '#37474f', 0, 0.74, 0.21);
  part(chair, cyl(0.03, 0.03, 0.4, 8), '#90a4ae', 0, 0.22, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(chair, v3(0, 0.05, 0), v3(0.22 * Math.cos(a), 0.03, 0.22 * Math.sin(a)), 0.014, '#607d8b');
  }
  const spots: Record<string, Spot> = { fhLogPort: standAt(g, 'fhLog', OD.seat[2]) };
  spots['*'] = spots.fhLogPort;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const w = N ? (n.written ?? 0) : 1;
    lines.forEach((m, i) => (m.visible = (i + 1) / 5 <= w + 0.02));
    seal.visible = N ? (n.stamped ?? 0) > 0.5 : true;
    at(mic, P.mic, OD.mic);
    const h = P.mic ?? OD.mic;
    cord(tmp.set(OD.mic[0], 0.82, -0.2).clone(), tmp.set(h[0], h[1] - 0.05, h[2]).clone());
    setLit(radioLed, (n.radio ?? 0) > 0.5 ? '#ff5252' : '#66ff99');
    at(stamp, P.stamp, OD.stamp);
    at(mug, P.mug, [-0.54, 0.84, 0.16]);
    at(pen, P.pen);
    if (now) {
      pic.set(map((c) => {
        c.fillStyle = '#0d2535';
        c.fillRect(0, 0, 192, 112);
        c.fillStyle = '#4d5f44';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(70, 0);
        c.quadraticCurveTo(40, 56, 60, 112);
        c.lineTo(0, 112);
        c.fill();
        ['#ffd54f', '#66ff99', '#ff8a65'].forEach((col, i) => {
          const a = t * (0.14 + i * 0.05) + i * 2;
          c.fillStyle = col;
          c.fillRect(120 + 46 * Math.cos(a), 56 + 34 * Math.sin(a * 1.3), 7, 4);
        });
        text(c, '은빛항 관제', 186, 12, 12, '#7fd4e8', 'right');
      }));
    } else pic.set(idle);
  });
  out.work = marker(g, OD.log[0], OD.log[1], OD.log[2]);
}

// =============================================================================================
// 활어 수조 (fhLiveTank, 2 × 1).

function liveTank(g: THREE.Group, out: Built) {
  part(g, box(1.9, 0.5, 0.66), '#546e7a', 0, 0.25, -0.02);
  for (const x of [-0.6, 0, 0.6]) part(g, box(0.06, 0.32, 0.01), '#37474f', x, 0.24, 0.312, { outline: false });
  label(g, `${PORT} 활어`, 0.6, 0.13, 0, 0.3, 0.315, '#546e7a', '#ffffff');
  // The water and the glass: four panes and a steel rim.
  const water = new THREE.MeshBasicMaterial({ color: '#4fb6d6', transparent: true, opacity: 0.42, depthWrite: false });
  const wet = new THREE.Mesh(box(1.82, LT.water[1] - 0.52, 0.56), water);
  wet.userData.ownMaterial = true;
  wet.position.set(0, (LT.water[1] + 0.52) / 2, -0.02);
  g.add(wet);
  const glassM = new THREE.MeshBasicMaterial({ color: '#d3eef5', transparent: true, opacity: 0.18, depthWrite: false });
  for (const [w, d, x, z] of [[1.86, 0.012, 0, 0.29], [1.86, 0.012, 0, -0.33], [0.012, 0.62, -0.93, -0.02], [0.012, 0.62, 0.93, -0.02]] as const) {
    const m = new THREE.Mesh(box(w, LT.rim - 0.5, d), glassM);
    m.userData.ownMaterial = true;
    m.position.set(x, (LT.rim + 0.5) / 2, z);
    g.add(m);
  }
  for (const [w, d, x, z] of [[1.92, 0.04, 0, 0.29], [1.92, 0.04, 0, -0.33], [0.04, 0.66, -0.94, -0.02], [0.04, 0.66, 0.94, -0.02]] as const) part(g, box(w, 0.035, d), '#90a4ae', x, LT.rim, z);
  part(g, box(1.82, 0.012, 0.56), '#d9c9a6', 0, 0.515, -0.02, { outline: false });
  for (const [x, z] of [[-0.6, 0.1], [0.3, -0.2], [0.68, 0.14]] as const) part(g, ball(0.05), '#90806a', x, 0.53, z, { outline: false });
  // Fish going round, and one caught.
  const fish = Array.from({ length: 8 }, (_, i) => fishMesh(g, CATCH[i % 3], 0.22 + (i % 3) * 0.03));
  // The air stone and its bubbles, the pipe running in.
  part(g, box(0.1, 0.03, 0.05), '#546e7a', -0.46, 0.54, -0.12, { outline: false });
  rod(g, v3(-0.46, 0.55, -0.12), v3(-0.46, 1.2, -0.32), 0.008, '#eceff1');
  const bubbles = puffs(g, 7, '#eafcff', 0.014);
  part(g, cyl(0.02, 0.02, 0.5, 8), '#2e7d32', 0.6, 1.22, -0.34);
  rod(g, v3(0.6, 1.44, -0.34), v3(0.6, 1.3, -0.14), 0.014, '#2e7d32');
  const spout = puffs(g, 4, '#d4f1fa', 0.016);
  // The oxygen meter, the scoop on its hook, the bucket.
  part(g, box(0.05, 0.68, 0.05), '#546e7a', LT.meter[0], 0.84, LT.meter[2] + 0.04);
  part(g, rbox(0.24, 0.17, 0.06, 0.01), '#263238', LT.meter[0], LT.meter[1], LT.meter[2]);
  const read = swapPic(g, 0.2, 0.11, LT.meter[0], LT.meter[1] + 0.012, LT.meter[2] + 0.032);
  read.set(painted('fhO2', 96, 56, (c) => {
    c.fillStyle = '#0d1a14';
    c.fillRect(0, 0, 96, 56);
    text(c, 'DO 7.4', 90, 20, 18, '#66ff99', 'right');
    text(c, '14.2℃', 90, 42, 15, '#ffd54f', 'right');
  }));
  part(g, box(0.04, 0.85, 0.04), '#546e7a', LT.scoop[0] + 0.04, 0.92, LT.scoop[2] + 0.02);
  const scoop = group(g);
  torus(scoop, 0.12, 0.008, '#37474f', 0, 0, 0, { rx: Math.PI / 2 });
  const bag = part(scoop, ball(0.12), '#7fb7a0', 0, -0.06, 0, { outline: false });
  bag.scale.y = 0.65;
  rod(scoop, v3(0.1, 0.02, 0.06), v3(0.16, 0.42, 0.34), 0.008, '#37474f');
  const inNet = fishMesh(scoop, CATCH[0], 0.2);
  inNet.position.set(0, 0.0, 0);
  part(g, cyl(0.17, 0.13, 0.26, 14), '#eceff1', LT.bucket[0], 0.13, LT.bucket[2]);
  part(g, cyl(0.155, 0.155, 0.01, 14), '#7ac0d6', LT.bucket[0], 0.262, LT.bucket[2], { outline: false });
  const inBucket = fishMesh(g, CATCH[0], 0.18);
  inBucket.position.set(LT.bucket[0], 0.28, LT.bucket[2]);
  const spots: Record<string, Spot> = { fhTankCheck: standAt(g, 'fhTank', LT.stand) };
  spots['*'] = spots.fhTankCheck;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    fish.forEach((f, i) => {
      const a = t * (0.3 + i * 0.03) * (i % 2 ? 1 : -1) + i * 1.1;
      f.position.set(0.68 * Math.cos(a), 0.66 + (i % 4) * 0.07 + 0.012 * Math.sin(t * 2 + i), -0.02 + 0.18 * Math.sin(a));
      f.rotation.y = (i % 2 ? -a : a + Math.PI) + Math.PI / 2;
    });
    bubbles(1, -0.46, 0.56, -0.12, 0.03, t * 0.9, LT.water[1] - 0.56);
    spout(1, 0.6, 1.0, -0.14, 0.02, t * 2, 0.2);
    at(scoop, P.scoop, add(LT.scoop, -0.16, -0.42, -0.34));
    inNet.visible = (n.caught ?? 0) > 0.5;
    inBucket.visible = (n.bucket ?? 0) > 0.5;
  });
  out.work = marker(g, LT.water[0], LT.water[1], LT.water[2]);
}

// =============================================================================================
// The harbour as it is (2026-11-04, the layout audit): the boat alongside, the market's roof, its bell, the buyer's truck.

const NOL = { outline: false };

/**
 * 연안어선 (16 × 4): a coastal fishing boat alongside the quay, its bow west (-x): the white hull with the blue sheer line and the
 * port number, the wheelhouse aft with the radar and the mast of flags, the working deck forward with the net hauler at the near
 * (quay-side, +z) rail, the hold's hatch, the fish boxes and floats on deck, the mooring lines to the quay. Readied from the quay;
 * out fishing it puts out west and is gone, and comes back to its berth.
 */
function coastalBoat(g: THREE.Group, W: number, D: number, out: Built) {
  const boat = new THREE.Group();
  g.add(boat);
  const L = W - 0.6;
  const B = 3.8;
  const deck = 0.5;
  const zc = -0.05;
  part(boat, rbox(L - 3, 1.3, B, 0.3), '#f4f6f8', 1.2, deck - 0.55, zc);
  const bow = part(boat, cyl(B / 2, 0.12, 3.2, 4), '#f4f6f8', -L / 2 + 1.4, deck - 0.4, zc, { rz: Math.PI / 2 });
  bow.scale.set(1, 1, 0.62);
  for (const sz of [-1, 1]) {
    part(boat, box(L - 3.2, 0.14, 0.02), '#1565c0', 1.2, deck + 0.0, zc + sz * (B / 2 + 0.01), NOL);
    label(boat, '한빛 3호', 1.6, 0.3, -3.5, deck - 0.45, zc + sz * (B / 2 + 0.02), '#f4f6f8', '#0d47a1', sz > 0 ? 0 : Math.PI);
  }
  part(boat, box(L - 2.4, 0.05, B - 0.3), '#8d6e63', 0.6, deck + 0.12, zc, NOL);
  for (const sz of [-1, 1]) part(boat, box(L - 3, 0.35, 0.08), '#eceff1', 1.2, deck + 0.3, zc + sz * (B / 2 - 0.05), NOL);
  // The wheelhouse aft, its windows, the radar and the flags on the mast.
  const wx = L / 2 - 2.6;
  part(boat, rbox(3.0, 2.0, B - 0.8, 0.12), '#eceff1', wx, deck + 1.15, zc);
  part(boat, box(3.02, 0.55, B - 0.78), '#1f2f40', wx, deck + 1.6, zc, NOL);
  part(boat, rbox(3.3, 0.1, B - 0.5, 0.05), '#1565c0', wx, deck + 2.2, zc);
  part(boat, cyl(0.05, 0.05, 2.6, 8), '#eceff1', wx - 0.6, deck + 3.4, zc);
  part(boat, rbox(1.2, 0.1, 0.3, 0.04), '#37474f', wx + 0.4, deck + 2.5, zc);
  ['#e53935', '#fdd835', '#43a047', '#1e88e5'].forEach((c, i) => part(boat, box(0.5, 0.3, 0.01), c, wx - 0.35, deck + 4.4 - i * 0.35, zc, NOL));
  // The working deck: the net hauler at the near rail, the hold's hatch, boxes and floats.
  part(boat, cyl(0.32, 0.32, 0.5, 14), '#455a64', -1.5, deck + 0.9, zc + B / 2 - 0.4, { rx: Math.PI / 2 });
  part(boat, box(0.3, 0.6, 0.3), '#37474f', -1.5, deck + 0.45, zc + B / 2 - 0.4);
  part(boat, rbox(1.6, 0.15, 1.4, 0.05), '#5d4037', 0.5, deck + 0.22, zc);
  for (let i = 0; i < 4; i++) part(boat, rbox(0.6, 0.15, 0.4, 0.03), '#4fc3f7', -3.5 + i * 0.65, deck + 0.24, zc - 1.0);
  for (let i = 0; i < 5; i++) part(boat, ball(0.18), '#ef6c00', -5.0 + i * 0.4, deck + 0.3, zc + 0.9);
  for (const x of [-L / 2 + 1.5, L / 2 - 1.0]) rod(boat, new THREE.Vector3(x, deck + 0.35, zc + B / 2), new THREE.Vector3(x + (x < 0 ? -0.5 : 0.5), 0.5, D / 2 + 0.35), 0.03, '#e8d9b0');
  boat.position.y = 0.1;
  const ready = spot(g, 'stand', -1.5, 0, D / 2 + 0.5, Math.PI);
  ready.work = marker(g, -1.5, 1.0, D / 2 - 0.4);
  ready.motion = 'tinker';
  out.work = ready.work;
  out.spots = { '*': ready };
  let x = 0;
  let last = 0;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    x = THREE.MathUtils.clamp(x + (isOut ? 1 : -1) * dt * 0.25, 0, 1);
    boat.position.x = -x * x * 30;
    boat.visible = x < 0.98;
  };
}

/** 위판장 지붕 (14 × 6): steel columns along both long sides, trusses across, the purlins, the market's name on its quay-side fascia. */
function marketRoof(g: THREE.Group, W: number, D: number) {
  const h = 5.0;
  for (let x = -W / 2 + 0.4; x <= W / 2 - 0.3; x += (W - 0.7) / 4)
    for (const sz of [-1, 1]) {
      part(g, box(0.22, h, 0.22), '#90a4ae', x, h / 2, sz * (D / 2 - 0.3));
      rod(g, new THREE.Vector3(x, h, -D / 2 + 0.3), new THREE.Vector3(x, h + 0.9, 0), 0.06, '#78909c');
      rod(g, new THREE.Vector3(x, h + 0.9, 0), new THREE.Vector3(x, h, D / 2 - 0.3), 0.06, '#78909c');
    }
  for (const z of [-D / 2 + 0.3, -D / 4, 0, D / 4, D / 2 - 0.3]) part(g, box(W - 0.4, 0.08, 0.08), '#90a4ae', 0, h + 0.9 * (1 - Math.abs(z) / (D / 2 - 0.3)), z, NOL);
  part(g, box(W - 0.2, 0.5, 0.06), '#1f6fd0', 0, h - 0.1, -D / 2 + 0.2, NOL);
  label(g, '한빛수협 위판장', 3.0, 0.36, 0, h - 0.1, -D / 2 + 0.16, '#1f6fd0', '#ffffff', Math.PI);
  // The drains along the floor.
  for (const z of [-D / 6, D / 6]) part(g, box(W - 1, 0.004, 0.12), '#5d6b73', 0, 0.012, z, NOL);
}

/** 위판 종: the big brass bell on its post at the market's entrance, its rope. */
function auctionBell(g: THREE.Group) {
  part(g, cyl(0.06, 0.06, 2.2, 10), '#5d4037', 0, 1.1, 0);
  part(g, box(0.6, 0.06, 0.06), '#5d4037', 0.27, 2.2, 0);
  part(g, cyl(0.12, 0.24, 0.32, 16), '#c9a227', 0.5, 1.98, 0);
  rod(g, new THREE.Vector3(0.5, 1.8, 0), new THREE.Vector3(0.5, 1.1, 0.05), 0.012, '#e8d9b0');
}

/** 냉동 탑차: a small refrigerated box truck, its cab at +z (towards the road), the box with its fridge unit, the doors at the back. */
function reeferTruck(g: THREE.Group, W: number, D: number) {
  const half = D / 2;
  for (const z of [half - 1.0, -half + 1.2]) for (const sx of [-1, 1]) part(g, cyl(0.38, 0.38, 0.28, 16), '#212121', sx * 0.85, 0.38, z, { rz: Math.PI / 2 });
  part(g, rbox(1.9, 0.3, D - 0.3, 0.05), '#37474f', 0, 0.55, 0);
  part(g, rbox(1.9, 1.5, 1.6, 0.15), '#fafafa', 0, 1.35, half - 0.95);
  part(g, box(1.7, 0.6, 0.02), '#1f2f40', 0, 1.7, half - 0.14, NOL);
  part(g, rbox(2.0, 2.1, D - 2.0, 0.06), '#eef3f6', 0, 1.75, -0.85);
  part(g, rbox(1.2, 0.5, 0.3, 0.05), '#90a4ae', 0, 2.6, half - 2.0);
  label(g, '냉동·냉장', 1.2, 0.3, W / 2 - 0.0, 1.8, -0.8, '#eef3f6', '#1565c0', Math.PI / 2);
  for (const sx of [-1, 1]) part(g, box(0.02, 1.9, 0.02), '#9e9e9e', sx * 0.45, 1.75, -half + 0.05, NOL);
}

export const BUILDERS: Record<string, Builder> = {
  fhBoat(g, W, D, _c, _def, _ctx, out) {
    coastalBoat(g, W, D, out);
  },
  fhMarketRoof(g, W, D) {
    marketRoof(g, W, D);
  },
  fhAuctionBell(g) {
    auctionBell(g);
  },
  fhReeferTruck(g, W, D) {
    reeferTruck(g, W, D);
  },
  fishingBoat(g, _W, _D, _c, _def, _ctx, out) {
    fishingBoat(g, out);
  },
  netRack(g, _W, _D, _c, _def, _ctx, out) {
    netRack(g, out);
  },
  fishCrates(g, _W, _D, _c, _def, _ctx, out) {
    fishCrates(g, out);
  },
  fishAuction(g, _W, _D, _c, _def, _ctx, out) {
    fishAuction(g, out);
  },
  fhHarbour(g, _W, _D, _c, _def, _ctx, out) {
    harbour(g, out);
  },
  fhQuay(g, W, D) {
    quay(g, W, D);
  },
  fhPots(g, _W, _D, _c, _def, _ctx, out) {
    pots(g, out);
  },
  fhFloats(g) {
    floats(g);
  },
  fhIce(g, _W, _D, _c, _def, _ctx, out) {
    icePlant(g, out);
  },
  fhSquid(g, _W, _D, _c, _def, _ctx, out) {
    squidRack(g, out);
  },
  fhTideBoard(g, _W, _D, _c, _def, _ctx, out) {
    tideBoard(g, out);
  },
  fhBidBoard(g, _W, _D, _c, _def, _ctx, out) {
    bidBoard(g, out);
  },
  fhOfficeDesk(g, _W, _D, _c, _def, _ctx, out) {
    officeDesk(g, out);
  },
  fhLiveTank(g, _W, _D, _c, _def, _ctx, out) {
    liveTank(g, out);
  },
};
