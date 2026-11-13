import * as THREE from 'three';
import { marker, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import type { Grip, Side } from '../handTool';
import { BLACK, CHROME, STEEL, label, painted, picture, ring, seeded, text } from './doctor';
import { BR, CE, CS, DS, EC, LB, LR, PB, PT, SB, SC, lrHead, pbCell, sbCell, vfNow, vfPhase, type VfMotion, type VfNow } from './smartFarmerMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * 층층잎팜, an indoor vertical farm (2026-11-01, a new career at the user's request; the company is made up). No soil
 * and no sky: white racks to the ceiling under pink-white LED bars, lettuce at every stage of its four weeks and
 * strawberries hanging over their gutters, low trial beds with a dimmable light, the control desk whose graphs bend
 * when a set point is moved, the dosing unit with its stock tanks and live EC/pH, the seedling chamber, the sowing
 * bench, the steel packing table and the cold store, and in the lobby the clean entry.
 *
 * Everything that moves follows the scripts in smartFarmerMotion.ts. Tools in the hand go through handTool.ts.
 */

const FARM = '층층잎팜';
const WHITE = '#f4f6f5';
const FRAME = '#dfe5e4';
const FRAME_D = '#b6c1bf';
const GREEN = '#2e7d32';
const LEAF = '#7cc34f';
const LEAF_D = '#4f9d3a';
const LEAF_L = '#a8dc6c';
const REDLEAF = '#8d4358';
const BERRY = '#d81b3c';
const PINK_LED = '#ff8fd0';
const WHITE_LED = '#fff1f8';
const PIPE = '#2f89c9';
const INK = '#20302c';
const PAPER = '#fbfaf4';
const SCREEN = '#0d1f1c';
const OK = '#69f0ae';
const BAD = '#ff5252';
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;

const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const AIR = new THREE.MeshToonMaterial({ color: '#dff4f6', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
const WATER = new THREE.MeshToonMaterial({ color: '#6fc4e8', transparent: true, opacity: 0.8 });
const BAG = new THREE.MeshToonMaterial({ color: '#eef8fb', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });

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
function own(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opts: { rx?: number } = {}): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function glassBox(g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = AIR): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.userData.ownGeometry = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A round tube along a list of points. */
function tube(g: THREE.Object3D, pts: V[], color: string, r = 0.012): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = v3(pts[i][0], pts[i][1], pts[i][2]);
    const b = v3(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);
    const d = b.clone().sub(a);
    const m = part(g, cyl(r, r, Math.max(0.001, d.length()), 8), color, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, { outline: false });
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  }
}
/** A canvas repainted when its key changes (a live readout); nothing outside a browser. */
function live(g: THREE.Object3D, px: number, py: number, w: number, h: number, x: number, y: number, z: number, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  g.add(mesh);
  let tex: THREE.CanvasTexture | null = null;
  let ctx: Ctx2 | null = null;
  let last = '';
  return {
    mesh,
    draw(key: string, paint: (c: Ctx2) => void) {
      if (typeof document === 'undefined') return;
      if (!tex) {
        const can = document.createElement('canvas');
        can.width = px;
        can.height = py;
        ctx = can.getContext('2d');
        tex = new THREE.CanvasTexture(can);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.needsUpdate = true;
      }
      if (key !== last && ctx) {
        last = key;
        paint(ctx);
        tex.needsUpdate = true;
      }
    },
  };
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
function standAt(g: THREE.Object3D, motion: VfMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}

// ---------------------------------------------------------------------------------------------
// Tools in the hand: grip at the origin, the head along +y.

interface Tool {
  g: THREE.Group;
  side: Side;
  grip: Grip;
  /** Where it lies when it isn't in use (hidden if null). */
  rest: V | null;
  restRot?: V;
}
const roundGrip = (shape: Grip['shape'], radius?: number): Grip => ({ at: v3(0, 0, 0), axis: v3(0, 1, 0), shape, ...(radius ? { radius } : {}) });
function toolOf(g: THREE.Object3D, name: string, side: Side, grip: Grip, rest: V | null, restRot: V | undefined, draw: (t: THREE.Group) => void): Tool {
  const t = group(g);
  t.name = name;
  draw(t);
  t.visible = !!rest;
  return { g: t, side, grip, rest, restRot };
}
const knife = (g: THREE.Object3D, rest: V | null) =>
  toolOf(g, 'vfKnife', 'right', roundGrip('power'), rest, [Math.PI / 2, 0, 0.4], (t) => {
    part(t, cyl(0.014, 0.014, 0.11, 8), '#2e7d32', 0, 0, 0, { outline: false });
    part(t, box(0.006, 0.09, 0.024), CHROME, 0, 0.1, 0.004, { outline: false });
  });
const snips = (g: THREE.Object3D, rest: V | null) =>
  toolOf(g, 'vfSnips', 'right', roundGrip('power', 0.018), rest, [Math.PI / 2, 0, 0.5], (t) => {
    for (const s of [-1, 1]) {
      part(t, rbox(0.014, 0.09, 0.012, 0.004), '#ef6c00', s * 0.009, -0.005, 0, { rz: s * 0.1 });
      part(t, box(0.005, 0.05, 0.008), CHROME, s * 0.003, 0.065, 0, { rz: s * -0.1, outline: false });
    }
  });
const brush = (g: THREE.Object3D, rest: V | null) =>
  toolOf(g, 'vfBrush', 'right', roundGrip('pen', 0.006), rest, undefined, (t) => {
    part(t, cyl(0.006, 0.007, 0.11, 6), '#f9a825', 0, 0.04, 0, { outline: false });
    part(t, cyl(0.007, 0.007, 0.012, 6), CHROME, 0, 0.098, 0, { outline: false });
    part(t, cyl(0.002, 0.008, 0.022, 6), '#efe6cf', 0, 0.114, 0, { outline: false });
  });
const pen = (g: THREE.Object3D, name: string, color: string, rest: V | null, restRot?: V) =>
  toolOf(g, name, 'right', roundGrip('pen', 0.008), rest, restRot, (t) => {
    part(t, cyl(0.008, 0.008, 0.12, 6), color, 0, 0.02, 0, { outline: false });
    part(t, cyl(0.003, 0.008, 0.016, 6), INK, 0, 0.088, 0, { outline: false });
  });
const tweezers = (g: THREE.Object3D, rest: V | null) =>
  toolOf(g, 'vfTweezers', 'right', roundGrip('pen', 0.006), rest, [Math.PI / 2, 0, 0.7], (t) => {
    for (const s of [-1, 1]) part(t, box(0.004, 0.13, 0.006), STEEL, s * 0.004, 0.05, 0, { rz: s * 0.03, outline: false });
  });
const tablet = (g: THREE.Object3D) => {
  const T = toolOf(g, 'vfTablet', 'left', { at: v3(0, -0.012, 0.05), axis: v3(-1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.03 }, null, undefined, (t) => {
    part(t, rbox(0.25, 0.012, 0.17, 0.006), BLACK, 0, 0, 0);
  });
  return T;
};
/** A hand-held EC/pH meter: its handle with the readout, the probe going on down (head +y). */
const meter = (g: THREE.Object3D, rest: V) =>
  toolOf(g, 'vfMeter', 'right', roundGrip('power', 0.02), rest, [Math.PI, 0, 0], (t) => {
    part(t, rbox(0.04, 0.13, 0.03, 0.008), '#1565c0', 0, -0.01, 0);
    part(t, cyl(0.007, 0.007, 0.13, 8), '#cfd8dc', 0, 0.12, 0, { outline: false });
    part(t, box(0.028, 0.03, 0.004), OK, 0, -0.03, 0.016, { outline: false });
  });
const jug = (g: THREE.Object3D, rest: V) =>
  toolOf(g, 'vfJug', 'right', roundGrip('power', 0.018), rest, [0, 0, 0], (t) => {
    part(t, cyl(0.014, 0.014, 0.12, 8), '#eceff1', 0, 0, 0, { outline: false });
    part(t, rbox(0.15, 0.22, 0.13, 0.03), '#eceff1', -0.1, -0.02, 0);
    part(t, box(0.13, 0.08, 0.12), '#90caf9', -0.1, -0.05, 0, { outline: false });
    part(t, cyl(0.02, 0.026, 0.04, 8), '#1976d2', -0.16, 0.1, 0, { outline: false, rz: 0.5 });
  });
const gutterBrush = (g: THREE.Object3D, rest: V) =>
  toolOf(g, 'vfGutterBrush', 'right', roundGrip('power'), rest, [0, 0, Math.PI / 2], (t) => {
    part(t, cyl(0.014, 0.014, 0.22, 8), '#00897b', 0, 0, 0, { outline: false });
    part(t, cyl(0.006, 0.006, 0.2, 6), STEEL, 0, 0.2, 0, { outline: false });
    part(t, cyl(0.032, 0.032, 0.11, 10), '#ffe082', 0, 0.3, 0, { outline: false });
  });
const ruler = (g: THREE.Object3D, rest: V) =>
  toolOf(g, 'vfRuler', 'right', roundGrip('pinch', 0.006), rest, [Math.PI / 2, 0, 0], (t) => {
    part(t, box(0.03, 0.26, 0.002), '#fff59d', 0, 0.02, 0, { outline: false });
    for (let i = 0; i < 9; i++) part(t, box(i % 2 ? 0.012 : 0.02, 0.002, 0.003), INK, -0.006, -0.09 + i * 0.028, 0, { outline: false });
  });
const refract = (g: THREE.Object3D, rest: V) =>
  toolOf(g, 'vfRefract', 'right', roundGrip('power', 0.017), rest, [Math.PI / 2, 0, 0.6], (t) => {
    part(t, cyl(0.016, 0.017, 0.13, 10), '#37474f', 0, 0, 0, { outline: false });
    part(t, cyl(0.024, 0.017, 0.03, 10), BLACK, 0, -0.08, 0, { outline: false });
    part(t, rbox(0.045, 0.04, 0.03, 0.006), '#607d8b', 0, 0.09, 0);
  });
const sprayer = (g: THREE.Object3D, rest: V) =>
  toolOf(g, 'vfSprayer', 'right', { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'trigger', radius: 0.02 }, rest, [0, 0, 0], (t) => {
    part(t, cyl(0.018, 0.018, 0.05, 8), '#fff', 0, 0, 0, { outline: false });
    part(t, cyl(0.04, 0.042, 0.14, 12), '#b2ebf2', 0, -0.1, 0.0);
    part(t, rbox(0.03, 0.03, 0.06, 0.006), '#00897b', 0, 0.04, 0.02);
  });

/** Sets what the hands hold and where each tool is. */
function runTools(tools: Record<string, Tool>, spots: Record<string, Spot>, now: string | null, N: VfNow | null) {
  for (const s of Object.values(spots)) s.held = null;
  for (const [name, T] of Object.entries(tools)) {
    const p = N?.props[name];
    if (p) {
      place(T.g, p);
      T.g.rotation.set(N!.n.rx ?? 0, N!.n.ry ?? 0, N!.n.rz ?? 0);
      T.g.visible = true;
    } else if (T.rest) {
      place(T.g, T.rest);
      T.g.rotation.set(T.restRot?.[0] ?? 0, T.restRot?.[1] ?? 0, T.restRot?.[2] ?? 0);
      T.g.visible = true;
    } else {
      T.g.visible = false;
    }
  }
  const name = N?.key.hold;
  if (now && name && tools[name]) {
    const T = tools[name];
    spots[now].held = { tool: T.g, lead: T.side, grips: { [T.side]: T.grip } };
  }
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Record<string, Tool>, show: (now: string | null, N: VfNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? vfNow(sp.motion as VfMotion, t, vfPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    runTools(tools, spots, now, N);
    show(now, N, t);
  };
}

// ---------------------------------------------------------------------------------------------
// Leaves: many spheres, one draw.

type Blob = [x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string];
function blobs(g: THREE.Object3D, list: Blob[]): THREE.InstancedMesh {
  const mat = new THREE.MeshToonMaterial({ color: '#ffffff' });
  const geom = new THREE.SphereGeometry(1, 8, 6);
  const m = new THREE.InstancedMesh(geom, mat, Math.max(1, list.length));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  const M = new THREE.Matrix4();
  const C = new THREE.Color();
  list.forEach((b, i) => {
    M.makeScale(b[3], b[4], b[5]).setPosition(b[0], b[1], b[2]);
    m.setMatrixAt(i, M);
    m.setColorAt(i, C.set(b[6]));
  });
  m.count = list.length;
  m.castShadow = true;
  g.add(m);
  return m;
}
/** A head of lettuce as blobs: `k` 1 is ready to cut, smaller is younger. */
function headBlobs(list: Blob[], x: number, y: number, z: number, k: number, s: () => number, red = false) {
  const light = red ? '#b5647c' : LEAF_L;
  const mid = red ? REDLEAF : LEAF;
  const dark = red ? '#6e2f42' : LEAF_D;
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + s() * 0.5;
    const r = 0.055 * k;
    list.push([x + Math.cos(a) * r, y + 0.03 * k + s() * 0.012 * k, z + Math.sin(a) * r, 0.05 * k, 0.03 * k, 0.05 * k, i % 3 === 0 ? dark : mid]);
  }
  list.push([x, y + 0.06 * k, z, 0.042 * k, 0.04 * k, 0.042 * k, light]);
}
/** One head as its own group (one that comes out of its tray). */
function head(g: THREE.Object3D, k = 1): THREE.Group {
  const h = group(g);
  const list: Blob[] = [];
  headBlobs(list, 0, 0, 0, k, seeded(101));
  blobs(h, list);
  return h;
}
function ledBar(g: THREE.Object3D, w: number, y: number, z: number, x = 0, color = PINK_LED): THREE.Mesh {
  part(g, box(w, 0.02, 0.05), FRAME_D, x, y + 0.012, z, { outline: false });
  return own(g, new THREE.BoxGeometry(w - 0.02, 0.006, 0.036), color, x, y - 0.002, z);
}
const crateMat = '#2e9e6f';
function crate(g: THREE.Object3D, w = 0.36, d = 0.26, h = 0.1, color = crateMat) {
  part(g, box(w, 0.012, d), color, 0, 0.006, 0);
  for (const s of [-1, 1]) {
    part(g, box(w, h, 0.012), color, 0, h / 2, (s * d) / 2);
    part(g, box(0.012, h, d), color, (s * w) / 2, h / 2, 0);
  }
}

// =============================================================================================
// 상추 수직 재배 선반 (vfLettuceRack).

const lettuceRack: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // The frame to near the ceiling, white back panel for the light to bounce off.
  for (const x of [-1.44, -0.48, 0.48, 1.44]) for (const z of [-0.44, 0.16]) part(g, box(0.04, 2.34, 0.04), FRAME, x, 1.17, z);
  part(g, box(2.92, 2.34, 0.012), WHITE, 0, 1.17, -0.455, { outline: false });
  part(g, box(2.96, 0.05, 0.66), FRAME, 0, 2.35, -0.14);
  const tierLabel = ['다 자람 4주', '곧 수확', '정식 2주', '모종 1주'];
  const stage = [0.85, 1.0, 0.62, 0.3];
  const s = seeded(47);
  const list: Blob[] = [];
  LR.tiers.forEach((y, ti) => {
    // The rail under each tier, three trays side by side, the bar overhead.
    part(g, box(2.92, 0.02, 0.62), FRAME_D, 0, y - 0.03, -0.14);
    part(g, box(2.9, 0.012, 0.02), PIPE, 0, y - 0.05, -0.38, { outline: false });
    for (const bx of [-0.96, 0, 0.96]) {
      if (bx === 0 && ti === 1) continue;
      part(g, rbox(0.9, 0.05, 0.5, 0.012), WHITE, bx, y + 0.012, LR.trayZ);
      for (let i = 0; i < 6; i++) headBlobs(list, bx - 0.27 + 0.27 * (i % 3), y + 0.04, LR.trayZ + (i > 2 ? 0.13 : -0.05), stage[ti], s, bx === 0.96 && ti !== 3);
    }
    if (y + 0.42 < 2.3) for (const z of [-0.26, -0.02]) ledBar(g, 2.84, y + 0.42, z);
    label(g, tierLabel[ti], 0.22, 0.05, -1.3, y - 0.03, 0.17, PAPER, GREEN);
  });
  blobs(g, list);
  // Riser and return, a fan at each end, the row's sign.
  tube(g, [[1.47, 0.04, -0.4], [1.47, 2.2, -0.4]], PIPE, 0.016);
  tube(g, [[1.47, 2.2, -0.4], [-1.4, 2.2, -0.4]], PIPE, 0.01);
  tube(g, [[-1.47, 0.08, -0.34], [-1.47, 2.0, -0.34]], '#90a4ae', 0.014);
  const fans: THREE.Mesh[] = [];
  for (const x of [-0.96, 0.96]) {
    part(g, cyl(0.1, 0.1, 0.03, 16), FRAME_D, x, 2.1, -0.4, { rx: Math.PI / 2 });
    fans.push(part(g, box(0.17, 0.018, 0.006), INK, x, 2.1, -0.38, { outline: false }));
  }
  label(g, `${FARM} · 잎채소 A열`, 1.1, 0.13, 0, 2.28, 0.19, GREEN, '#ffffff');

  // The tray in the middle bay of the second tier draws out; six heads on it.
  const tray = group(g);
  part(tray, rbox(0.9, 0.05, 0.5, 0.012), WHITE, 0, LR.tiers[1] + 0.012, LR.trayZ);
  part(tray, box(0.5, 0.03, 0.012), FRAME_D, 0, LR.tiers[1] + 0.02, LR.trayZ + 0.255);
  const heads: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const h = head(tray);
    const p = lrHead(i, 0);
    h.position.set(p[0], p[1] - 0.08, p[2]);
    heads.push(h);
  }
  // Harvest: a cart at the left and a tool tray at the right, there only then.
  const cart = group(g);
  part(cart, box(0.56, 0.02, 0.4), STEEL, LR.crate[0], 0.5, LR.crate[2]);
  for (const a of [-1, 1]) for (const b of [-1, 1]) part(cart, cyl(0.012, 0.012, 0.48, 6), STEEL, LR.crate[0] + a * 0.25, 0.25, LR.crate[2] + b * 0.17, { outline: false });
  const crateG = group(cart, LR.crate[0], 0.52, LR.crate[2]);
  crate(crateG, 0.42, 0.3, 0.1);
  const cratedHeads: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const h = head(crateG, 0.8);
    h.position.set(-0.11 + (i % 3) * 0.11, 0.03, i > 2 ? 0.07 : -0.07);
    cratedHeads.push(h);
  }
  label(cart, '수확 1판', 0.14, 0.04, LR.crate[0], 0.47, LR.crate[2] + 0.205, PAPER, GREEN);
  part(cart, box(0.3, 0.02, 0.24), STEEL, LR.knife[0], LR.knife[1] - 0.04, LR.knife[2]);
  part(cart, cyl(0.012, 0.012, 0.56, 6), STEEL, LR.knife[0], 0.29, LR.knife[2], { outline: false });
  const carried = head(g);
  const pot = group(g);
  part(pot, cyl(0.04, 0.03, 0.05, 10), '#37474f', 0, 0, 0);
  for (let i = 0; i < 5; i++) part(pot, cyl(0.002, 0.004, 0.14, 4), '#fafaf0', -0.02 + i * 0.01, -0.09, (i % 2) * 0.01, { outline: false, rz: (i - 2) * 0.1 });
  const potHead = head(pot, 0.8);
  potHead.position.y = 0.03;
  const tab = tablet(g);
  const scr = live(tab.g, 256, 170, 0.23, 0.155, 0, 0.007, 0, -Math.PI / 2);
  const tools = { tablet: tab, knife: knife(g, LR.knife) };
  out.work = marker(g, 0, 0.9, 0.16);
  const spots: Record<string, Spot> = { vfInspectLeaves: standAt(g, 'vfInspect'), vfHarvestLettuce: standAt(g, 'vfHarvest') };
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    fans.forEach((f, i) => (f.rotation.z = t * (7 + i)));
    const harvesting = now === 'vfHarvestLettuce';
    cart.visible = harvesting;
    tools.knife.g.visible = harvesting;
    tray.position.z = harvesting ? LR.pull * (n.pull ?? 0) : 0;
    heads.forEach((h, i) => (h.visible = !harvesting || i >= (n.cut ?? 0)));
    cratedHeads.forEach((h, i) => (h.visible = harvesting && i < (n.crate ?? 0)));
    const hp = N?.props.head;
    carried.visible = !!hp;
    if (hp) place(carried, hp);
    const pp = N?.props.pot;
    pot.visible = !!pp;
    if (pp) place(pot, pp);
    if (tools.tablet.g.visible) {
      const page = Math.max(0, Math.min(3, Math.floor(n.screen ?? 0)));
      scr.draw(`i${page}`, (c) => {
        c.fillStyle = '#f5faf6';
        c.fillRect(0, 0, 256, 170);
        c.fillStyle = GREEN;
        c.fillRect(0, 0, 256, 30);
        text(c, '생육 기록 · A열', 8, 16, 15, '#fff');
        ['1단 잎 뒷면', '3단 잎끝 마름', '2단 뿌리 색'].forEach((row, i) => {
          text(c, row, 12, 52 + i * 34, 16, INK);
          text(c, i < page ? '양호' : '—', 244, 52 + i * 34, 16, i < page ? GREEN : '#999', 'right');
          c.fillStyle = '#d7e2dc';
          c.fillRect(10, 68 + i * 34, 236, 1);
        });
      });
    }
  });
};

// =============================================================================================
// 딸기 수직 재배 선반 (vfBerryRack).

const berryRack: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-1.44, 0, 1.44]) for (const z of [-0.36, 0.2]) part(g, box(0.04, 2.3, 0.04), FRAME, x, 1.15, z);
  part(g, box(2.92, 0.05, 0.62), FRAME, 0, 2.3, -0.08);
  part(g, box(2.92, 2.3, 0.012), WHITE, 0, 1.15, -0.39, { outline: false });
  const s = seeded(83);
  const leaves: Blob[] = [];
  const green: Blob[] = [];
  BR.tiers.forEach((y, ti) => {
    // A gutter on hanging rods, plants along it, some unripe fruit trailing over the edge.
    part(g, rbox(2.84, 0.1, 0.16, 0.03), WHITE, 0, y, BR.z);
    part(g, box(2.84, 0.012, 0.13), '#6d4c41', 0, y + 0.05, BR.z, { outline: false });
    for (const x of [-1.2, 0, 1.2]) part(g, cyl(0.005, 0.005, 2.3 - y, 4), STEEL, x, (2.3 + y) / 2, BR.z, { outline: false });
    for (let i = 0; i < 15; i++) {
      const x = -1.33 + i * 0.19;
      const k = 0.85 + s() * 0.3;
      for (let j = 0; j < 5; j++) {
        const a = j * 1.26 + s();
        leaves.push([x + Math.cos(a) * 0.05 * k, y + 0.1 + s() * 0.05, BR.z + Math.sin(a) * 0.055 * k, 0.05 * k, 0.018 * k, 0.05 * k, j % 2 ? LEAF_D : '#3f8e3a']);
      }
      if (s() > 0.45) green.push([x + 0.02, y - 0.1 - s() * 0.05, BR.z + 0.13, 0.016, 0.02, 0.016, s() > 0.5 ? '#cfe39b' : '#f4f0d2']);
    }
    if (ti < 2 || y + 0.42 < 2.25) for (const z of [-0.22, 0.12]) ledBar(g, 2.82, y + 0.4, z, 0, ti === 1 ? WHITE_LED : PINK_LED);
  });
  blobs(g, leaves);
  blobs(g, green);
  tube(g, [[-1.47, 0.08, BR.z], [-1.47, 1.66, BR.z]], PIPE, 0.014);
  for (const y of BR.tiers) tube(g, [[-1.47, y, BR.z], [-1.42, y, BR.z]], PIPE, 0.01);
  label(g, `${FARM} · 딸기 B열`, 1.0, 0.12, 0, 2.23, 0.24, BERRY, '#ffffff');
  const fruits: THREE.Group[] = BR.fruit.map(([x, y]) => {
    const f = group(g, x, y, BR.z + 0.14);
    part(f, ball(0.028), BERRY, 0, 0, 0).scale.set(1, 1.2, 1);
    part(f, cyl(0.02, 0.006, 0.01, 6), GREEN, 0, 0.033, 0, { outline: false });
    tube(f, [[0, 0.03, 0], [0.0, 0.1, -0.08]], LEAF_D, 0.003);
    return f;
  });
  const flowers = BR.flower.map(([x, y]) => {
    const f = group(g, x, y, BR.z + 0.13);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(f, ball(0.012), '#ffffff', Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0, { outline: false }).scale.set(1, 1, 0.3);
    }
    return { g: f, eye: own(f, new THREE.SphereGeometry(0.009, 8, 6), '#d7dd5a', 0, 0, 0.004) };
  });
  const punnet = group(g);
  crate(punnet, 0.2, 0.13, 0.05, '#fff');
  const inPunnet: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) inPunnet.push(part(punnet, ball(0.022), BERRY, -0.07 + (i % 4) * 0.046, 0.04, i > 3 ? 0.03 : -0.03));
  const berry = part(g, ball(0.028), BERRY, 0, 0, 0);
  const tools = { brush: brush(g, null), snips: snips(g, null) };
  const spots: Record<string, Spot> = { vfPollinate: standAt(g, 'vfPollinate'), vfPickBerry: standAt(g, 'vfPick') };
  out.work = marker(g, 0, 1.1, 0.2);
  drive(g, out, spots, tools, (now, N) => {
    const n = N?.n ?? {};
    const picking = now === 'vfPickBerry';
    fruits.forEach((f, i) => (f.visible = !picking || i >= (n.picked ?? 0)));
    const done = now === 'vfPollinate' ? (n.done ?? 0) : 5;
    flowers.forEach((f, i) => setLit(f.eye, i < done ? '#fbc02d' : '#d7dd5a'));
    const pp = N?.props.punnet;
    punnet.visible = !!pp;
    if (pp) place(punnet, pp);
    inPunnet.forEach((b, i) => (b.visible = i < (n.inPunnet ?? 0)));
    const bp = N?.props.berry;
    berry.visible = !!bp;
    if (bp) place(berry, bp);
  });
};

// =============================================================================================
// 시험 재배 베드 (vfLowBed).

const lowBed: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-1.38, 0, 1.38]) for (const z of [-0.34, 0.3]) part(g, box(0.05, 0.66, 0.05), FRAME_D, x, 0.33, z);
  part(g, box(2.84, 0.05, 0.74), FRAME, 0, 0.66, -0.02);
  // The channel, open where the middle lid comes off.
  part(g, box(2.76, 0.03, 0.56), '#90a4ae', 0, 0.69, 0.0);
  const water = glassBox(g, 0.8, 0.012, 0.5, 0, 0.71, 0.0, WATER);
  const grime = part(g, box(0.78, 0.004, 0.48), '#7a6a44', 0, 0.718, 0.0, { outline: false });
  for (const x of [-0.92, 0.92]) part(g, rbox(0.94, 0.03, 0.56, 0.008), WHITE, x, LB.lid.y, 0.0);
  const lid = group(g, LB.lid.x, LB.lid.y, LB.lid.z);
  part(lid, rbox(0.86, 0.03, 0.56, 0.008), WHITE, 0, 0, -0.02);
  const s = seeded(211);
  const side: Blob[] = [];
  for (const x of [-1.22, -0.92, -0.62, 0.62, 0.92, 1.22]) for (const z of [-0.12, 0.13]) headBlobs(side, x, LB.plantY - 0.02, z, 0.9, s, x > 0);
  blobs(g, side);
  const mid: Blob[] = [];
  for (const x of [-0.28, 0, 0.28]) for (const z of [-0.14, 0.11]) headBlobs(mid, x, 0.02, z, 0.95, s);
  blobs(lid, mid);
  // Light at chest height: the bar and its two posts, nothing tall.
  for (const x of [-1.3, 1.3]) part(g, box(0.03, 0.72, 0.03), FRAME_D, x, 1.04, -0.32);
  part(g, box(2.64, 0.03, 0.05), FRAME_D, 0, 1.4, -0.32);
  part(g, box(2.64, 0.03, 0.5), FRAME_D, 0, 1.38, -0.08);
  const lights = [-0.18, 0.04].map((z) => own(g, new THREE.BoxGeometry(2.56, 0.006, 0.05), WHITE_LED, 0, 1.362, z));
  label(g, '시험 A · 적색 강화', 0.42, 0.06, -0.92, 0.72, 0.335, PAPER, GREEN);
  label(g, '시험 B · 기준', 0.42, 0.06, 0.92, 0.72, 0.335, PAPER, INK);
  // The front ledge: clipboard, tools; at the end the dimmer and the valve.
  part(g, box(2.76, 0.02, 0.1), FRAME, 0, 0.75, 0.33);
  part(g, rbox(0.2, 0.012, 0.26, 0.006), '#8d6e63', LB.clip[0], LB.clip[1], LB.clip[2] - 0.05);
  const sheet = live(g, 180, 220, 0.18, 0.22, LB.clip[0], LB.clip[1] + 0.008, LB.clip[2] - 0.05, -Math.PI / 2);
  part(g, rbox(0.08, 0.1, 0.05, 0.008), '#37474f', LB.dial[0], LB.dial[1], LB.dial[2]);
  part(g, cyl(0.03, 0.03, 0.02, 10), '#1976d2', LB.valve[0], LB.valve[1], LB.valve[2], { rx: Math.PI / 2 });
  tube(g, [[LB.valve[0], LB.valve[1], LB.valve[2] - 0.02], [LB.valve[0], LB.valve[1], 0.24]], PIPE, 0.012);
  const knob = part(g, cyl(0.022, 0.022, 0.02, 10), '#ef6c00', LB.dial[0], LB.dial[1], LB.dial[2] + 0.03, { rx: Math.PI / 2 });
  const tools = { gutterBrush: gutterBrush(g, LB.brush), ruler: ruler(g, LB.ruler), pen: pen(g, 'vfPen', '#1565c0', LB.pen, [Math.PI / 2, 0, 0.3]) };
  const spots: Record<string, Spot> = { vfCleanGutter: standAt(g, 'vfClean'), smartFarmer_cropTrial: standAt(g, 'vfTrial') };
  out.work = marker(g, 0, 0.85, 0.2);
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    const off = n.lid ?? 0;
    lid.position.set(LB.lid.x, LB.lid.y + 0.22 * off, LB.lid.z + 0.3 * off);
    lid.rotation.x = 0.12 * off;
    water.visible = off > 0.05;
    grime.visible = off > 0.05 && (n.dirt ?? 0) > 0.05;
    grime.scale.x = Math.max(0.05, n.dirt ?? 0);
    water.position.y = 0.71 + 0.006 * (n.water ?? 0) * Math.sin(t * 9);
    const red = now === 'smartFarmer_cropTrial' ? (n.light ?? 0) : 0;
    const col = red > 0.02 ? new THREE.Color(WHITE_LED).lerp(new THREE.Color('#ff5a8a'), red) : null;
    for (const l of lights) (l.material as THREE.MeshBasicMaterial).color.set(col ?? WHITE_LED);
    knob.rotation.z = red * 2.4;
    const rows = Math.max(0, Math.min(4, Math.floor(n.rows ?? 0)));
    sheet.draw(`r${rows}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 180, 220);
      text(c, '재배 조건 시험지', 10, 18, 14, GREEN);
      c.strokeStyle = '#bbb';
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(8, 42 + i * 34);
        c.lineTo(172, 42 + i * 34);
        c.stroke();
      }
      ['A 적색 강화 12cm', 'B 기준 10cm', '잎 수 +2', '다음: 3일 뒤'].forEach((row, i) => {
        if (i < rows) text(c, row, 12, 60 + i * 34, 15, '#1a4f8a', 'left', false);
      });
    });
  });
};

// =============================================================================================
// 환경 제어 콘솔 (vfEnvConsole).

const SERIES = [
  { name: '온도', unit: '℃', low: 18, high: 26, base: 21.5, to: 23.5, color: '#ffb74d' },
  { name: '습도', unit: '%', low: 40, high: 90, base: 68, to: 62, color: '#4fc3f7' },
  { name: 'CO₂', unit: 'ppm', low: 400, high: 1400, base: 800, to: 1100, color: '#81c784' },
];
const envConsole: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(1.84, 0.05, 0.62, 0.012), '#e8eeec', 0, EC.desk, -0.12);
  for (const x of [-0.84, 0.84]) part(g, box(0.05, EC.desk, 0.56), FRAME_D, x, EC.desk / 2, -0.12);
  part(g, box(1.62, 0.5, 0.02), FRAME, 0, 0.45, -0.38, { outline: false });
  // The wide screen, tilted back; its top stays under 1.4 m so the grow room is seen over it.
  part(g, rbox(EC.screen.w + 0.05, EC.screen.h + 0.05, 0.03, 0.01), BLACK, 0, EC.screen.y, EC.screen.z, { rx: -0.08 });
  part(g, cyl(0.03, 0.04, 0.16, 8), BLACK, 0, 0.82, -0.26, { outline: false });
  part(g, rbox(0.34, 0.02, 0.18, 0.008), BLACK, 0, 0.76, -0.26);
  const scr = live(g, 800, 300, EC.screen.w, EC.screen.h, 0, EC.screen.y, EC.screen.z + 0.018, -0.08);
  part(g, rbox(0.44, 0.015, 0.14, 0.006), '#3d4850', EC.keys[0], EC.keys[1], EC.keys[2]);
  part(g, rbox(0.06, 0.018, 0.1, 0.012), '#3d4850', EC.mouse[0], EC.mouse[1], EC.mouse[2]);
  label(g, `${FARM} 환경 제어`, 0.5, 0.06, -0.58, 0.97, -0.34, GREEN, '#fff');
  // A little map of the racks, each lit as it's running, and a mug.
  for (let i = 0; i < 6; i++) own(g, new THREE.BoxGeometry(0.05, 0.01, 0.03), i % 3 === 2 ? PINK_LED : OK, 0.6 + (i % 3) * 0.07, 0.77, -0.24 + Math.floor(i / 3) * 0.05);
  part(g, cyl(0.03, 0.028, 0.08, 10), '#a5d6a7', -0.72, 0.8, 0.05);
  // The chair.
  const c = group(g, EC.seat.x, 0, EC.seat.z);
  part(c, cyl(0.025, 0.035, 0.38, 8), BLACK, 0, 0.22, 0);
  part(c, cyl(0.2, 0.22, 0.03, 12), BLACK, 0, 0.025, 0);
  part(c, rbox(0.44, 0.06, 0.42, 0.03), '#00695c', 0, 0.44, 0);
  part(c, rbox(0.42, 0.42, 0.05, 0.03), '#00695c', 0, 0.74, 0.2, { rx: 0.08 });
  const spots: Record<string, Spot> = { vfSetClimate: standAt(g, 'vfClimate'), smartFarmer_tuneLogic: standAt(g, 'vfLogic') };
  out.work = marker(g, 0, 0.8, 0.14);
  drive(g, out, spots, {}, (now, N, t) => {
    const n = N?.n ?? {};
    const tick = Math.floor(t * 4);
    const coding = now === 'smartFarmer_tuneLogic';
    const key = coding ? `c${n.lines | 0}|${Math.round((n.dweller ?? 0) * 40)}|${n.ok ?? 0}` : `g${Math.round((n.set ?? 0) * 30)}|${Math.round((n.took ?? 0) * 40)}|${n.layer | 0}|${n.flash ?? 0}|${tick}`;
    scr.draw(key, (x) => (coding ? paintLogic(x, n) : paintClimate(x, n, tick)));
  });
};
function paintClimate(c: Ctx2, n: Record<string, number>, tick: number) {
  c.fillStyle = SCREEN;
  c.fillRect(0, 0, 800, 300);
  text(c, `${FARM} 재배실 1 · 실시간`, 14, 18, 18, '#d6efe4');
  const layer = Math.max(0, Math.min(2, Math.floor(n.layer ?? 0)));
  ['1~2단', '3~4단', '딸기열'].forEach((s, i) => {
    c.fillStyle = i === layer ? '#00897b' : '#23403a';
    c.fillRect(560 + i * 78, 6, 72, 24);
    text(c, s, 596 + i * 78, 18, 15, '#fff', 'center');
  });
  const set = Math.max(0, Math.min(1, n.set ?? 0));
  const took = Math.max(0, Math.min(1, n.took ?? 0));
  SERIES.forEach((S, i) => {
    const y0 = 40 + i * 86;
    const h = 76;
    c.fillStyle = '#132c28';
    c.fillRect(120, y0, 660, h);
    const target = S.base + (S.to - S.base) * set;
    const toY = (v: number) => y0 + h - ((v - S.low) / (S.high - S.low)) * h;
    text(c, S.name, 14, y0 + 20, 20, S.color);
    const value = S.base + (S.to - S.base) * set * took + Math.sin(tick * 0.31 + i) * (S.high - S.low) * 0.006;
    text(c, `${value.toFixed(i === 2 ? 0 : 1)}${S.unit}`, 14, y0 + 52, 21, '#ffffff');
    // The set point (dashed) moves first; the line comes up to it at the end of the plot as it takes.
    c.setLineDash([6, 6]);
    c.strokeStyle = '#ffffff88';
    c.beginPath();
    c.moveTo(120, toY(target));
    c.lineTo(780, toY(target));
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = S.color;
    c.lineWidth = 2.5;
    c.beginPath();
    for (let x = 0; x <= 660; x += 6) {
      const u = x / 660;
      const rise = Math.max(0, Math.min(1, (u - (1 - 0.35 * took)) / Math.max(0.01, 0.35 * took)));
      const v = S.base + (S.to - S.base) * set * took * rise + Math.sin((x + tick * 6) * 0.05 + i * 2) * (S.high - S.low) * 0.012;
      if (x === 0) c.moveTo(120 + x, toY(v));
      else c.lineTo(120 + x, toY(v));
    }
    c.stroke();
    c.lineWidth = 1;
  });
  if ((n.flash ?? 0) > 0.5) {
    c.fillStyle = '#00897b';
    c.fillRect(290, 120, 220, 54);
    text(c, '설정값 적용', 400, 147, 26, '#fff', 'center');
  }
}
const RULES = ['규칙 조명·냉방 연동', '조명 켜짐 → 냉방 +1단', '온도 > 설정 + 1.0 →', '  환기 +10% (최대 40%)', '습도 > 75% → 제습 켬', 'CO₂ < 700 → 공급 5분', '양액 온도 > 22 → 냉각', '  한낮 피크 때 조명 80%', '  (재시작 뒤 2분 유지)'];
function paintLogic(c: Ctx2, n: Record<string, number>) {
  c.fillStyle = '#10211e';
  c.fillRect(0, 0, 800, 300);
  c.fillStyle = '#1c3a33';
  c.fillRect(0, 0, 410, 300);
  const lines = Math.max(0, Math.min(RULES.length, Math.floor(n.lines ?? 0)));
  for (let i = 0; i < lines; i++) text(c, RULES[i], 14, 22 + i * 30, 19, i === 0 ? '#ffe082' : '#d6efe4', 'left', false);
  text(c, '시험 실행: 재배실 온도', 430, 22, 18, '#d6efe4');
  c.fillStyle = '#132c28';
  c.fillRect(430, 44, 350, 210);
  const dweller = Math.max(0, Math.min(1, n.dweller ?? 0));
  const fixed = (n.bad ?? 0) < 0.5;
  c.strokeStyle = fixed ? OK : '#ffb74d';
  c.lineWidth = 3;
  c.beginPath();
  const steps = Math.floor(70 * (fixed ? 1 : dweller));
  for (let i = 0; i <= steps; i++) {
    const u = i / 70;
    const over = fixed ? 0.25 * Math.exp(-u * 5) : 0.8 * Math.exp(-u * 1.5) * Math.cos(u * 14);
    const y = 150 - 70 * sm01(u * 4) - 70 * over;
    if (i === 0) c.moveTo(430 + u * 350, y);
    else c.lineTo(430 + u * 350, y);
  }
  c.stroke();
  c.lineWidth = 1;
  c.strokeStyle = '#ffffff66';
  c.beginPath();
  c.moveTo(430, 80);
  c.lineTo(780, 80);
  c.stroke();
  text(c, (n.ok ?? 0) > 0.5 ? '배포 완료' : fixed ? '안정' : '출렁임', 770, 276, 18, (n.ok ?? 0) > 0.5 || fixed ? OK : '#ffb74d', 'right');
}
const sm01 = (x: number) => THREE.MathUtils.smoothstep(x, 0, 1);

// =============================================================================================
// 양액기 (vfDoser).

const doser: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, box(2.9, 0.08, 0.86), '#90a4ae', 0, 0.04, -0.04);
  part(g, box(2.9, 1.9, 0.02), FRAME, 0, 0.95, -0.46, { outline: false });
  const level = (x: number, color: string, nameS: string) => {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.08, 20), AIR);
    shell.userData.ownGeometry = true;
    shell.position.set(x, 0.62, DS.tankA.z);
    g.add(shell);
    part(g, cyl(0.21, 0.21, 0.03, 20), '#eceff1', x, DS.tankA.top - 0.03, DS.tankA.z);
    part(g, cyl(0.21, 0.21, 0.08, 20), '#546e7a', x, 0.12, DS.tankA.z);
    part(g, cyl(0.07, 0.07, 0.03, 14), '#1976d2', x, DS.tankA.top, DS.tankA.z + 0.04);
    const liquid = part(g, cyl(0.19, 0.19, 1, 18), color, x, 0.6, DS.tankA.z, { outline: false });
    label(g, nameS, 0.2, 0.09, x, 0.86, DS.tankA.z + 0.205, '#fff', INK);
    return liquid;
  };
  const a = level(DS.tankA.x, '#7dcbe8', 'A액');
  const b = level(DS.tankB.x, '#ecc36d', 'B액');
  part(g, cyl(0.075, 0.075, 0.42, 14), '#ef9a9a', -0.14, 0.3, 0.14);
  part(g, cyl(0.03, 0.03, 0.04, 8), '#c62828', -0.14, 0.53, 0.14);
  label(g, '산', 0.08, 0.06, -0.14, 0.32, 0.216, '#fff', '#c62828');
  // The mixing column with bubbles rising, three dosing pumps, pipes to the racks.
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, DS.column.y1 - DS.column.y0, 14), AIR);
  col.userData.ownGeometry = true;
  col.position.set(DS.column.x, (DS.column.y0 + DS.column.y1) / 2, DS.column.z);
  g.add(col);
  part(g, cyl(0.09, 0.09, DS.column.y1 - DS.column.y0 - 0.04, 12), '#a8d8c0', DS.column.x, (DS.column.y0 + DS.column.y1) / 2, DS.column.z, { outline: false });
  const bubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) bubbles.push(part(g, ball(0.012), '#eafaff', DS.column.x, 0.2, DS.column.z, { outline: false }));
  for (let i = 0; i < 3; i++) {
    part(g, rbox(0.12, 0.16, 0.1, 0.012), '#37474f', 0.42 + i * 0.16, 0.92, -0.32);
    part(g, cyl(0.04, 0.04, 0.03, 12), i === 2 ? '#ef5350' : '#4db6ac', 0.42 + i * 0.16, 0.92, -0.26, { rx: Math.PI / 2 });
  }
  const pumpLeds = [0, 1, 2].map((i) => own(g, new THREE.SphereGeometry(0.01, 6, 4), OK, 0.42 + i * 0.16, 1.03, -0.27));
  tube(g, [[DS.tankA.x, 0.16, DS.tankA.z - 0.1], [DS.tankA.x, 0.1, -0.34], [DS.column.x - 0.1, 0.1, -0.34], [DS.column.x - 0.1, 0.3, DS.column.z]], '#2f89c9', 0.012);
  tube(g, [[DS.tankB.x, 0.16, DS.tankB.z - 0.1], [DS.tankB.x, 0.14, -0.36], [DS.column.x - 0.1, 0.14, -0.36]], '#d8a13a', 0.012);
  tube(g, [[DS.column.x, DS.column.y1, DS.column.z], [DS.column.x, 1.74, DS.column.z], [1.42, 1.74, DS.column.z]], PIPE, 0.018);
  tube(g, [[DS.column.x + 0.08, 0.7, DS.column.z], [DS.valve[0], DS.valve[1], DS.valve[2] - 0.08]], PIPE, 0.018);
  label(g, '→ 재배실 1 공급', 0.5, 0.07, 0.8, 1.8, DS.column.z + 0.03, PAPER, PIPE);
  // The valve wheel with the bypass; the kinked line beside it.
  const wheel = group(g, DS.valve[0], DS.valve[1], DS.valve[2]);
  part(wheel, ring(0.1, 0.012), '#c62828', 0, 0, 0);
  part(wheel, box(0.2, 0.012, 0.012), '#c62828', 0, 0, 0, { outline: false });
  part(wheel, box(0.012, 0.2, 0.012), '#c62828', 0, 0, 0, { outline: false });
  const kink = group(g, 0.56, 0.84, 0.1);
  tube(kink, [[-0.08, 0, 0], [0, 0.05, 0.02], [0.08, 0, 0]], '#ef6c00', 0.008);
  const straight = group(g, 0.56, 0.84, 0.1);
  tube(straight, [[-0.08, 0, 0], [0.08, 0, 0]], '#ef6c00', 0.008);
  // The control box with the live reading, its buttons and the beacon on top.
  part(g, rbox(DS.box.w + 0.04, DS.box.h + 0.3, 0.14, 0.012), '#eceff1', DS.box.x, DS.box.y - 0.1, DS.box.z - 0.08);
  const scr = live(g, 360, 270, DS.box.w, DS.box.h, DS.box.x, DS.box.y, DS.box.z);
  const go = part(g, cyl(0.03, 0.03, 0.03, 12), '#2e7d32', DS.btn[0], DS.btn[1], DS.btn[2] - 0.05, { rx: Math.PI / 2 });
  part(g, cyl(0.022, 0.022, 0.03, 12), '#c62828', DS.btn[0] + 0.1, DS.btn[1], DS.btn[2] - 0.05, { rx: Math.PI / 2 });
  part(g, cyl(0.03, 0.04, 0.03, 10), BLACK, DS.box.x, 1.56, DS.box.z - 0.08);
  const beacon = own(g, new THREE.SphereGeometry(0.04, 10, 8), '#5a2222', DS.box.x, 1.61, DS.box.z - 0.08);
  // Calibration: a ledge with two buffer cups and a stand for the meter.
  part(g, box(0.42, 0.02, 0.26), STEEL, 0.71, 0.82, 0.2);
  part(g, box(0.02, 0.8, 0.02), STEEL, 0.52, 0.42, 0.2);
  part(g, box(0.02, 0.8, 0.02), STEEL, 0.9, 0.42, 0.2);
  DS.cups.forEach((p, i) => {
    glassBox(g, 0.05, 0.06, 0.05, p[0], p[1] + 0.03, p[2]);
    part(g, cyl(0.022, 0.022, 0.04, 10), i ? '#ff8a65' : '#fff176', p[0], p[1] + 0.02, p[2], { outline: false });
    label(g, i ? 'pH 4' : 'pH 7', 0.05, 0.022, p[0], p[1] - 0.002, p[2] + 0.04, '#fff', INK);
  });
  part(g, cyl(0.016, 0.02, 0.02, 8), '#90a4ae', DS.meter[0], 0.84, DS.meter[2], { outline: false });
  part(g, rbox(0.3, 0.1, 0.24, 0.012), '#78909c', DS.jug[0] - 0.08, 0.05, DS.jug[2]);
  const stream = part(g, cyl(0.012, 0.012, 0.3, 6), '#6fc4e8', DS.tankA.x, DS.tankA.top + 0.14, DS.tankA.z + 0.02, { outline: false });
  label(g, FARM, 0.34, 0.08, -0.82, 1.56, -0.44, GREEN, '#fff');
  const tools = { jug: jug(g, DS.jug), meter: meter(g, DS.meter) };
  const spots: Record<string, Spot> = { vfMixNutrient: standAt(g, 'vfMix'), vfCalibrate: standAt(g, 'vfCal'), vfFixNutrient: standAt(g, 'vfFix') };
  out.work = marker(g, 0.6, 1.0, 0.1);
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    const mixing = now === 'vfMixNutrient';
    const fix = now === 'vfFixNutrient';
    const setLevel = (m: THREE.Mesh, k: number) => {
      const h = Math.max(0.02, 0.7 + 0.28 * k);
      m.scale.y = h;
      m.position.y = 0.16 + h / 2;
    };
    setLevel(a, mixing ? (n.a ?? 0) : 0.5);
    setLevel(b, mixing ? (n.b ?? 0) : 0.5);
    const showStream = mixing && (n.stream ?? 0) > 0.5;
    stream.visible = showStream;
    if (showStream) stream.position.x = n.streamX ?? DS.tankA.x;
    const pumping = fix ? (n.pumping ?? 0) : mixing ? (n.pumping ?? 0) : 0.5;
    bubbles.forEach((m, i) => {
      const u = ((t * (0.2 + 0.4 * pumping) + i / bubbles.length) % 1 + 1) % 1;
      m.position.y = DS.column.y0 + 0.05 + u * (DS.column.y1 - DS.column.y0 - 0.1);
      m.position.x = DS.column.x + 0.05 * Math.sin(i * 2.4 + u * 6);
    });
    const alarm = fix ? (n.alarm ?? 0) : 0;
    setLit(beacon, alarm > 0.1 && Math.sin(t * 9) > 0 ? '#ff1744' : '#5a2222');
    pumpLeds[2].visible = !fix || (n.bad ?? 0) < 0.5 || Math.sin(t * 9) > 0;
    setLit(pumpLeds[2], fix && (n.bad ?? 0) > 0.5 ? BAD : OK);
    wheel.rotation.z = fix ? (n.valve ?? 0) * Math.PI * 3 : 0;
    kink.visible = fix && (n.tube ?? 0) < 0.5;
    straight.visible = !kink.visible;
    (go as THREE.Mesh).scale.z = mixing && (n.pumping ?? 0) > 0.5 ? 0.6 : 1;
    let ec = 1.8 + 0.01 * Math.sin(t * 0.8);
    let ph = 5.9 + 0.01 * Math.sin(t * 0.6);
    let title = '양액 공급 정상';
    let bad = false;
    if (mixing) {
      ec = 0.6 + 1.2 * (n.ec ?? 0);
      ph = 6.8 - 0.9 * (n.ec ?? 0);
      title = (n.pumping ?? 0) > 0.5 ? '배합 중' : '양액 배합 대기';
    } else if (fix) {
      const k = n.bad ?? 1;
      ec = 1.8 + 1.6 * k;
      ph = 5.9 + 1.3 * k;
      bad = k > 0.2;
      title = bad ? '양액·온도 장애' : '복구 완료';
    } else if (now === 'vfCalibrate') {
      ec = 1.8;
      ph = n.read ?? 5.9;
      title = `pH 센서 교정 ${Math.max(0, Math.min(2, Math.floor(n.cal ?? 0)))}/2`;
    }
    scr.draw(`${title}|${ec.toFixed(2)}|${ph.toFixed(2)}|${bad}`, (c) => {
      c.fillStyle = SCREEN;
      c.fillRect(0, 0, 360, 270);
      c.fillStyle = bad ? '#b71c1c' : '#00695c';
      c.fillRect(0, 0, 360, 44);
      text(c, title, 180, 23, 26, '#fff', 'center');
      text(c, 'EC', 18, 86, 28, '#a5d6a7');
      text(c, `${ec.toFixed(2)}`, 340, 94, 58, bad ? BAD : OK, 'right');
      text(c, 'mS/cm', 340, 132, 16, '#90a4ae', 'right');
      text(c, 'pH', 18, 176, 28, '#90caf9');
      text(c, `${ph.toFixed(2)}`, 340, 184, 58, bad ? BAD : '#90caf9', 'right');
      text(c, `목표 EC 1.80 · pH 5.90`, 180, 250, 18, '#d6efe4', 'center');
    });
  });
};
const add3 = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];

// =============================================================================================
// 육묘 챔버 (vfSeedChamber).

const seedTray = (g: THREE.Object3D, k: number, seed: number) => {
  part(g, rbox(0.52, 0.04, 0.36, 0.008), '#37474f', 0, 0, 0);
  const s = seeded(seed);
  const list: Blob[] = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const x = -0.2 + i * 0.08;
    const z = -0.12 + j * 0.08;
    const size = k * (0.75 + s() * 0.4);
    list.push([x - 0.012 * k, 0.04 + 0.02 * k, z, 0.018 * size, 0.008 * size, 0.012 * size, LEAF_L], [x + 0.012 * k, 0.04 + 0.02 * k, z, 0.018 * size, 0.008 * size, 0.012 * size, LEAF]);
  }
  blobs(g, list);
};
const seedChamber: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, box(1.9, SC.doorH + 0.12, 0.08), WHITE, 0, (SC.doorH + 0.12) / 2, -0.42);
  for (const x of [-0.96, 0.96]) part(g, box(0.06, SC.doorH + 0.12, 0.56), WHITE, x, (SC.doorH + 0.12) / 2, -0.16);
  part(g, box(1.98, 0.12, 0.6), WHITE, 0, SC.doorH + 0.14, -0.16);
  part(g, box(1.98, 0.12, 0.6), '#cfd8dc', 0, 0.06, -0.16);
  part(g, box(0.05, SC.doorH, 0.05), WHITE, 0, SC.doorH / 2 + 0.06, SC.front);
  SC.shelves.forEach((y, si) => {
    part(g, box(1.86, 0.015, 0.5), STEEL, 0, y, -0.15);
    for (const x of [-0.48, 0.5]) {
      if (x === 0.5 && si === 1) continue;
      const tg = group(g, x, y + 0.03, SC.z);
      seedTray(tg, [0.35, 1, 0.65][si], 11 + si * 3 + (x > 0 ? 7 : 0));
    }
    own(g, new THREE.BoxGeometry(1.8, 0.006, 0.06), si === 1 ? WHITE_LED : PINK_LED, 0, y + 0.38, -0.16);
    part(g, box(1.84, 0.012, 0.08), FRAME_D, 0, y + 0.395, -0.16, { outline: false });
    label(g, ['파종 3일', '옮겨 심을 때', '파종 7일'][si], 0.2, 0.05, -0.82, y - 0.02, 0.095, PAPER, GREEN);
  });
  // The tray that's taken, on its own; and the glass doors, hung from the sides.
  const tray = group(g);
  seedTray(tray, 1, 19);
  const trolley = group(g, SC.trolley[0], 0, SC.trolley[2]);
  part(trolley, box(0.6, 0.02, 0.42), STEEL, 0, 0.52, 0);
  part(trolley, box(0.6, 0.02, 0.42), STEEL, 0, 0.18, 0);
  for (const a of [-1, 1]) for (const b of [-1, 1]) part(trolley, cyl(0.012, 0.012, 0.52, 6), STEEL, a * 0.28, 0.27, b * 0.19, { outline: false });
  for (const a of [-1, 1]) for (const b of [-1, 1]) part(trolley, ball(0.022), BLACK, a * 0.28, 0.022, b * 0.19, { outline: false });
  const doorR = group(g, SC.hinge, 0.06, SC.front);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(SC.r, SC.doorH, 0.012), AIR);
  glass.userData.ownGeometry = true;
  glass.position.set(-SC.r / 2, SC.doorH / 2, 0);
  doorR.add(glass);
  part(doorR, box(SC.r, 0.03, 0.03), WHITE, -SC.r / 2, 0.015, 0);
  part(doorR, box(SC.r, 0.03, 0.03), WHITE, -SC.r / 2, SC.doorH - 0.015, 0);
  part(doorR, box(0.03, SC.doorH, 0.03), WHITE, -SC.r, SC.doorH / 2, 0);
  part(doorR, box(0.03, SC.doorH, 0.03), WHITE, 0, SC.doorH / 2, 0);
  part(doorR, cyl(0.012, 0.012, 0.3, 8), CHROME, -SC.r + 0.03, 0.96, 0.04, { outline: false });
  const doorL = group(g, -0.95, 0.06, SC.front);
  const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, SC.doorH, 0.012), AIR);
  g2.userData.ownGeometry = true;
  g2.position.set(0.45, SC.doorH / 2, 0);
  doorL.add(g2);
  part(doorL, box(0.9, 0.03, 0.03), WHITE, 0.45, 0.015, 0);
  part(doorL, box(0.9, 0.03, 0.03), WHITE, 0.45, SC.doorH - 0.015, 0);
  part(doorL, box(0.03, SC.doorH, 0.03), WHITE, 0.9, SC.doorH / 2, 0);
  part(doorL, cyl(0.012, 0.012, 0.3, 8), CHROME, 0.87, 0.96, 0.04, { outline: false });
  // The panel: temperature and humidity. Mist drifts through while it's closed.
  part(g, rbox(0.34, 0.14, 0.02, 0.006), BLACK, -0.5, 1.52, SC.front + 0.03);
  const read = live(g, 200, 80, 0.32, 0.12, -0.5, 1.52, SC.front + 0.042);
  const spots: Record<string, Spot> = { vfMoveSeedlings: standAt(g, 'vfSeedMove') };
  out.work = marker(g, 0.5, 1.0, 0.2);
  drive(g, out, spots, {}, (now, N, t) => {
    const n = N?.n ?? {};
    doorR.rotation.y = (n.door ?? 0) * SC.swing;
    const tp = N?.props.tray;
    const using = now === 'vfMoveSeedlings';
    trolley.visible = using;
    if (tp) {
      tray.visible = true;
      place(tray, tp);
    } else if (using && (n.out ?? 0) > 0.5) {
      tray.visible = true;
      place(tray, add3(SC.trolley, 0, 0, 0));
    } else if (using && (n.gone ?? 0) > 0.5) {
      tray.visible = false;
    } else {
      tray.visible = true;
      place(tray, SC.tray);
    }
    const open = (n.door ?? 0) > 0.05;
    const hum = open ? 62 - 6 * (n.door ?? 0) : 72 + Math.round(Math.sin(t * 0.3));
    read.draw(`${hum | 0}|${open}`, (c) => {
      c.fillStyle = SCREEN;
      c.fillRect(0, 0, 200, 80);
      text(c, `22.0℃`, 12, 28, 26, OK);
      text(c, `${hum | 0}%`, 188, 28, 26, open ? '#ffb74d' : '#90caf9', 'right');
      text(c, open ? '문 열림' : '육묘 12/12시간', 100, 62, 18, '#d6efe4', 'center');
    });
  });
};

// =============================================================================================
// 파종대 (vfSowBench).

function drawnPerson(parent: THREE.Object3D, top: string, bottom: string, hair: string, gender: 'female' | 'male' = 'female') {
  const root = group(parent, 0, 0, 0);
  const skin = '#f1c9a5';
  for (const sx of [-1, 1]) {
    part(root, cyl(0.056, 0.05, 0.76, 8), bottom, sx * 0.09, 0.46, 0);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#eceff1', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37, 0, { outline: false });
  const hd = group(root, 0, 1.51, 0);
  part(hd, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(hd, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(hd, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const up = part(root, cyl(0.04, 0.036, 1, 8), top, 0, 0, 0, { outline: false });
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const d = new THREE.Vector3();
    const loc = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.set(sx * 0.23, 0.82, 0.05);
      d.subVectors(loc, shoulder);
      const L = Math.max(0.05, Math.min(0.5, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      up.position.copy(shoulder).addScaledVector(d, L / 2);
      up.scale.set(1, L, 1);
      up.quaternion.setFromUnitVectors(UP, d);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  const opts: FigureOptions = { gender };
  const f = vroidFigure({ root, head: hd, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}

const sowBench: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-0.86, 0.86]) for (const z of [-0.36, 0.3]) part(g, box(0.05, SB.top, 0.05), STEEL, x, SB.top / 2, z);
  part(g, rbox(1.84, 0.04, 0.78, 0.01), '#e8eeec', 0, SB.top, -0.03);
  part(g, box(1.72, 0.02, 0.66), STEEL, 0, 0.3, -0.03);
  for (let i = 0; i < 4; i++) part(g, rbox(0.36, 0.12, 0.26, 0.01), i % 2 ? '#c5e1a5' : '#cfd8dc', -0.56 + i * 0.38, 0.38, -0.03);
  // The sponge sheet, its cells; seed dish, packets, a little spray bottle, net pots and a sprouted tray.
  part(g, rbox(SB.sheet.nx * SB.sheet.dx + 0.03, 0.04, SB.sheet.nz * SB.sheet.dz + 0.03, 0.006), '#eef3e1', SB.sheet.x, SB.top + 0.02, SB.sheet.z);
  const wetSheet = part(g, box(SB.sheet.nx * SB.sheet.dx, 0.002, SB.sheet.nz * SB.sheet.dz), '#c7d7a8', SB.sheet.x, SB.top + 0.042, SB.sheet.z, { outline: false });
  const seeds: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const p = sbCell(i * 2);
    part(g, box(0.05, 0.001, 0.001), '#b6c49a', p[0], p[1] + 0.003, p[2], { outline: false });
    seeds.push(part(g, ball(0.006), '#3e2723', p[0], p[1] + 0.004, p[2], { outline: false }));
  }
  part(g, cyl(0.05, 0.04, 0.015, 14), '#fff', SB.dish[0], SB.dish[1] - 0.01, SB.dish[2]);
  const seedS = seeded(5);
  for (let i = 0; i < 16; i++) part(g, ball(0.005), '#3e2723', SB.dish[0] + (seedS() - 0.5) * 0.06, SB.dish[1], SB.dish[2] + (seedS() - 0.5) * 0.06, { outline: false });
  part(g, rbox(0.14, 0.2, 0.012, 0.006), '#7cb342', 0.76, SB.top + 0.11, -0.26, { rx: -0.2 });
  label(g, '적상추', 0.11, 0.05, 0.76, SB.top + 0.12, -0.25, '#fff', GREEN);
  part(g, rbox(0.14, 0.2, 0.012, 0.006), '#d81b3c', 0.56, SB.top + 0.11, -0.28, { rx: -0.2 });
  label(g, FARM, 0.3, 0.06, -0.62, SB.top + 0.08, -0.36, GREEN, '#fff');
  // Transplant: only when learning. Six pots and six sprouts.
  const learn = group(g);
  const pots: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const pg = group(learn, SB.pots.x + (i % 3) * 0.13, SB.top + 0.01, SB.pots.z - (i > 2 ? 0.14 : 0));
    part(pg, cyl(0.035, 0.028, 0.04, 10), '#37474f', 0, 0.02, 0);
    const sp = group(pg);
    const l: Blob[] = [[-0.018, 0.08, 0, 0.022, 0.01, 0.014, LEAF_L], [0.018, 0.08, 0, 0.022, 0.01, 0.014, LEAF]];
    blobs(sp, l);
    part(sp, cyl(0.002, 0.002, 0.07, 4), '#d9f0b3', 0, 0.045, 0, { outline: false });
    pots.push(sp);
  }
  const sproutSheet = group(learn);
  const sprouts: THREE.Group[] = [];
  part(sproutSheet, rbox(0.34, 0.03, 0.26, 0.006), '#eef3e1', SB.sprout.x - 0.09, SB.top + 0.018, SB.sprout.z + 0.05);
  for (let j = 0; j < 6; j++) {
    const sp = group(sproutSheet, SB.sprout.x - (j % 3) * 0.09, SB.top + 0.03, SB.sprout.z + (j > 2 ? 0.1 : 0));
    const l: Blob[] = [[-0.018, 0.05, 0, 0.022, 0.01, 0.014, LEAF_L], [0.018, 0.05, 0, 0.022, 0.01, 0.014, LEAF]];
    blobs(sp, l);
    part(sp, cyl(0.002, 0.002, 0.05, 4), '#d9f0b3', 0, 0.025, 0, { outline: false });
    sprouts.push(sp);
  }
  const flying = group(g);
  blobs(flying, [[-0.018, 0.02, 0, 0.022, 0.01, 0.014, LEAF_L], [0.018, 0.02, 0, 0.022, 0.01, 0.014, LEAF]]);
  part(flying, cyl(0.002, 0.002, 0.05, 4), '#d9f0b3', 0, -0.005, 0, { outline: false });
  const seed = part(g, ball(0.006), '#3e2723', 0, 0, 0, { outline: false });
  const mist = group(g);
  for (let i = 0; i < 8; i++) part(mist, ball(0.008 + (i % 3) * 0.003), '#e3f6fb', 0.02 * Math.cos(i * 2), -0.05 - i * 0.03, 0.01 * Math.sin(i * 2), { outline: false });
  const cover = part(g, rbox(SB.sheet.nx * SB.sheet.dx + 0.05, 0.03, SB.sheet.nz * SB.sheet.dz + 0.05, 0.006), '#263238', SB.sheet.x, SB.top + 0.06, SB.sheet.z);
  const mentor = drawnPerson(g, '#66bb6a', '#37474f', '#2b1b10');
  mentor.root.position.set(0.66, 0, 0.72);
  mentor.root.rotation.y = Math.PI - 0.8;
  const tools = { tweezers: tweezers(g, SB.tweezers), sprayer: sprayer(g, SB.sprayer) };
  const spots: Record<string, Spot> = { vfSow: standAt(g, 'vfSow'), smartFarmer_learnTransplant: standAt(g, 'vfLearn') };
  out.work = marker(g, SB.sheet.x, SB.top + 0.05, SB.sheet.z);
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    const sowing = now === 'vfSow';
    const learning = now === 'smartFarmer_learnTransplant';
    const sown = sowing ? (n.sown ?? 0) : 0;
    seeds.forEach((m, i) => (m.visible = i < Math.floor(sown)));
    wetSheet.visible = !sowing || (n.wet ?? 0) > 0.3;
    const sp = N?.props.seed;
    seed.visible = !!sp;
    if (sp) place(seed, sp);
    const showMist = sowing && (n.mist ?? 0) > 0.5 && !!N?.props.sprayer;
    mist.visible = showMist;
    if (showMist) place(mist, N!.props.sprayer!);
    cover.visible = sowing && (n.cover ?? 0) > 0.05;
    if (cover.visible) cover.position.y = SB.top + 0.06 + 0.25 * (1 - (n.cover ?? 0));
    learn.visible = learning;
    pots.forEach((s, i) => (s.visible = i < (n.moved ?? 0)));
    sprouts.forEach((s, i) => (s.visible = i >= (n.gone ?? 0)));
    const fp = N?.props.sprout;
    flying.visible = !!fp;
    if (fp) place(flying, fp);
    mentor.root.visible = learning;
    if (learning) {
      const m = n.mentor ?? 0;
      const here = new THREE.Vector3(SB.sprout.x - 0.05, SB.top + 0.14, SB.sprout.z + 0.14);
      mentor.armR(m > 0.5 && m < 1.5 ? here : null);
      mentor.armL(null);
      mentor.head.rotation.x = m > 1.5 ? 0.14 * Math.sin(t * 6) : 0.22;
      mentor.opts.nod = m > 1.5 ? 0.14 * Math.sin(t * 6) : 0.2;
    }
  });
};

// =============================================================================================
// 수확·포장대 (vfPackTable).

const packTable: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-1.36, 0, 1.36]) for (const z of [-0.36, 0.32]) part(g, box(0.05, PT.top, 0.05), STEEL, x, PT.top / 2, z);
  part(g, rbox(2.86, 0.04, 0.84, 0.006), CHROME, 0, PT.top, -0.02);
  part(g, box(2.76, 0.02, 0.72), STEEL, 0, 0.26, -0.02);
  for (let i = 0; i < 4; i++) {
    const cg = group(g, -0.96 + i * 0.64, 0.27, -0.02);
    crate(cg, 0.5, 0.36, 0.15, i % 2 ? '#c8cdd0' : crateMat);
  }
  // The bin of cut leaves, a bowl of berries, and the scale with its readout.
  const bin = group(g, PT.bin[0], PT.top + 0.02, PT.bin[2]);
  crate(bin, 0.5, 0.42, 0.14);
  const s = seeded(9);
  const leaves: Blob[] = [];
  for (let i = 0; i < 45; i++) leaves.push([-0.2 + s() * 0.4, 0.09 + s() * 0.06, -0.16 + s() * 0.32, 0.04, 0.012, 0.03, s() > 0.65 ? '#b5647c' : s() > 0.3 ? LEAF : LEAF_L]);
  blobs(bin, leaves);
  part(g, cyl(0.09, 0.06, 0.05, 14), '#fff', PT.bowl[0], PT.top + 0.045, PT.bowl[2]);
  for (let i = 0; i < 6; i++) part(g, ball(0.022), BERRY, PT.bowl[0] + 0.05 * Math.cos(i), PT.top + 0.08, PT.bowl[2] + 0.05 * Math.sin(i), { outline: false });
  part(g, rbox(0.26, 0.04, 0.26, 0.012), '#eceff1', PT.scale[0], PT.top + 0.04, PT.scale[2]);
  const plate = part(g, box(0.22, 0.008, 0.2), CHROME, PT.scale[0], PT.top + 0.068, PT.scale[2], { outline: false });
  const read = live(g, 160, 60, 0.16, 0.05, PT.scale[0], PT.top + 0.035, PT.scale[2] + 0.132);
  // A stack of bags, the bar sealer, the label printer, the shipping box and stacked lids.
  for (let i = 0; i < 6; i++) glassBox(g, 0.2, 0.003, 0.26, PT.bags[0], PT.top + 0.03 + i * 0.006, PT.bags[2], BAG);
  part(g, box(0.5, 0.04, 0.12), '#546e7a', PT.sealer[0], PT.top + 0.04, PT.sealer[2]);
  const bar = group(g, PT.sealer[0], PT.top + 0.08, PT.sealer[2] - 0.05);
  part(bar, box(0.5, 0.02, 0.04), '#37474f', 0, 0, 0.05);
  part(bar, box(0.12, 0.02, 0.04), '#ef6c00', 0.05, 0.02, 0.05);
  const hot = own(g, new THREE.BoxGeometry(0.46, 0.004, 0.012), '#5a2222', PT.sealer[0], PT.top + 0.062, PT.sealer[2]);
  part(g, rbox(0.22, 0.18, 0.22, 0.012), '#eceff1', PT.printer[0], PT.top + 0.11, PT.printer[2]);
  part(g, box(0.1, 0.002, 0.08), PAPER, PT.printer[0], PT.top + 0.05, PT.printer[2] + 0.14, { outline: false });
  const box1 = group(g, PT.box[0], PT.top + 0.02, PT.box[2]);
  part(box1, box(0.42, 0.012, 0.32), '#c9a26b', 0, 0.006, 0);
  for (const z of [-1, 1]) part(box1, box(0.42, 0.18, 0.012), '#c9a26b', 0, 0.09, z * 0.16);
  for (const x of [-1, 1]) part(box1, box(0.012, 0.18, 0.32), '#c9a26b', x * 0.21, 0.09, 0);
  label(box1, FARM, 0.26, 0.08, 0, 0.1, 0.168, '#c9a26b', '#2e4a26');
  const boxed = group(box1, 0, 0.06, 0);
  glassBox(boxed, 0.2, 0.08, 0.22, 0, 0, 0, BAG);
  // The bag in the hands, with what's gone into it, its seal and its sticker.
  const bag = group(g);
  glassBox(bag, 0.2, 0.2, 0.09, 0, 0.0, 0, BAG);
  const fill = group(bag);
  const bl: Blob[] = [];
  const s2 = seeded(13);
  for (let i = 0; i < 12; i++) bl.push([-0.07 + s2() * 0.14, -0.08 + s2() * 0.1, -0.03 + s2() * 0.06, 0.035, 0.012, 0.024, s2() > 0.7 ? '#b5647c' : LEAF]);
  blobs(fill, bl);
  const sealLine = part(bag, box(0.2, 0.01, 0.095), '#9ec3cc', 0, 0.1, 0, { outline: false });
  const tag = part(bag, box(0.07, 0.05, 0.002), PAPER, 0, 0.02, 0.05, { outline: false });
  const handful = group(g);
  blobs(handful, [[-0.03, 0, 0, 0.035, 0.012, 0.026, LEAF], [0.03, 0.01, 0.01, 0.035, 0.012, 0.026, LEAF_L], [0, -0.01, -0.02, 0.03, 0.012, 0.024, '#b5647c']]);
  const sticker = part(g, box(0.07, 0.002, 0.05), PAPER, 0, 0, 0, { outline: false });
  // Brix: the berry and the record sheet.
  const berryUp = part(g, ball(0.028), BERRY, 0, 0, 0);
  const droplet = part(g, ball(0.005), '#ffb3c1', 0, 0, 0, { outline: false });
  part(g, rbox(0.22, 0.008, 0.3, 0.004), PAPER, PT.board[0], PT.top + 0.026, PT.board[2]);
  const brixSheet = live(g, 180, 240, 0.2, 0.27, PT.board[0], PT.top + 0.032, PT.board[2], -Math.PI / 2);
  label(g, '위생 장갑 · 칼 소독', 0.5, 0.06, 0.2, PT.top + 0.12, -0.42, '#fff', GREEN);
  const tools = { refract: refract(g, PT.refract) };
  const spots: Record<string, Spot> = { vfPackBox: standAt(g, 'vfPack'), vfBrix: standAt(g, 'vfBrix') };
  out.work = marker(g, PT.scale[0], PT.top + 0.1, PT.scale[2]);
  drive(g, out, spots, tools, (now, N) => {
    const n = N?.n ?? {};
    const packing = now === 'vfPackBox';
    const bp = N?.props.bag;
    bag.visible = !!bp;
    if (bp) place(bag, bp);
    const grams = packing ? (n.g ?? 0) : 0;
    fill.scale.setScalar(Math.max(0.05, grams / 100));
    fill.position.y = -0.09 * (1 - grams / 100);
    sealLine.visible = (n.sealed ?? 0) > 0.5;
    tag.visible = (n.label ?? 0) > 0.5;
    boxed.visible = packing && (n.boxed ?? 0) > 0.5;
    plate.position.y = PT.top + 0.068 - 0.004 * ((n.onScale ?? 0) * (grams / 100));
    const hp = N?.props.handful;
    handful.visible = !!hp;
    if (hp) place(handful, hp);
    const sp = N?.props.sticker;
    sticker.visible = !!sp;
    if (sp) place(sticker, sp);
    bar.rotation.x = 0.5 * (1 - (n.press ?? 0));
    setLit(hot, (n.seal ?? 0) > 0.5 ? '#ff7043' : '#5a2222');
    const g10 = Math.round(grams);
    read.draw(`${g10}|${(n.onScale ?? 0) > 0.5}`, (c) => {
      c.fillStyle = SCREEN;
      c.fillRect(0, 0, 160, 60);
      text(c, `${g10} g`, 150, 32, 36, g10 >= 99 ? OK : '#ffe082', 'right');
    });
    const berry = N?.props.berryUp;
    berryUp.visible = !!berry;
    if (berry) place(berryUp, berry);
    const dp = N?.props.drop;
    droplet.visible = !!dp;
    if (dp) place(droplet, dp);
    const rows = Math.max(0, Math.min(3, Math.floor(n.rows ?? 0)));
    brixSheet.draw(`b${rows}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 180, 240);
      text(c, '당도 기록', 12, 20, 18, GREEN);
      ['B열 2단', 'B열 3단', 'B열 1단'].forEach((s0, i) => {
        text(c, s0, 12, 58 + i * 40, 16, INK, 'left', false);
        if (i < rows) text(c, `${(11.6 + i * 0.3).toFixed(1)}°`, 168, 58 + i * 40, 18, BERRY, 'right');
      });
    });
  });
};

// =============================================================================================
// 저온 저장고 (vfColdStore).

const coldStore: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, box(1.96, 2.12, 0.62), '#e4e9eb', 0, 1.06, -0.18);
  for (let i = 0; i < 4; i++) part(g, box(1.98, 0.012, 0.64), FRAME_D, 0, 0.2 + i * 0.6, -0.18, { outline: false });
  // The opening, with shelves of boxes behind the door.
  part(g, box(CS.door.w, CS.door.h, 0.5), '#b6d3de', CS.door.x, CS.door.h / 2 + 0.04, -0.14);
  const shelfY = [0.42, 1.0, 1.52];
  for (const y of shelfY) part(g, box(CS.door.w - 0.04, 0.02, 0.4), STEEL, CS.door.x, y - 0.02, -0.14);
  shelfY.forEach((y, si) => {
    for (let i = 0; i < 2; i++) {
      if (si === 1 && i === 1) continue;
      const b = group(g, CS.door.x - 0.22 + i * 0.44, y, -0.16);
      part(b, box(0.38, 0.16, 0.26), '#c9a26b', 0, 0.08, 0);
      label(b, FARM, 0.2, 0.05, 0, 0.09, 0.132, '#c9a26b', '#2e4a26');
    }
  });
  const door = group(g, CS.door.hinge, 0, CS.door.z);
  part(door, rbox(CS.door.r + 0.04, CS.door.h, 0.08, 0.012), '#f4f6f5', -CS.door.r / 2, CS.door.h / 2 + 0.04, 0);
  part(door, box(0.04, 0.22, 0.06), CHROME, -CS.door.r + 0.02, CS.leverY - 0.02, 0.06);
  for (const y of [0.3, 1.7]) part(door, box(0.1, 0.05, 0.1), CHROME, 0.01, y, 0);
  label(door, '문 닫기 확인', 0.34, 0.07, -CS.door.r / 2, 1.5, 0.042, '#fff', '#1976d2');
  // The readout and the temperature log on the left panel.
  part(g, rbox(0.42, 0.2, 0.02, 0.006), BLACK, CS.temp[0], CS.temp[1], CS.temp[2]);
  const read = live(g, 220, 100, 0.38, 0.17, CS.temp[0], CS.temp[1], CS.temp[2] + 0.012);
  part(g, rbox(0.34, 0.32, 0.012, 0.006), '#8d6e63', CS.log[0], CS.log[1] - 0.08, CS.log[2]);
  const log = live(g, 160, 150, 0.3, 0.28, CS.log[0], CS.log[1] - 0.08, CS.log[2] + 0.008);
  const cart = group(g, CS.cart[0], 0, CS.cart[2]);
  part(cart, box(0.56, 0.02, 0.42), '#90a4ae', 0, 0.16, 0);
  for (const a of [-1, 1]) for (const b of [-1, 1]) part(cart, ball(0.03), BLACK, a * 0.24, 0.03, b * 0.16, { outline: false });
  part(cart, cyl(0.01, 0.01, 0.56, 6), STEEL, 0, 0.44, -0.2, { outline: false });
  part(cart, box(0.4, 0.3, 0.26), '#c9a26b', 0, 0.32, 0);
  const carried = group(g);
  part(carried, box(0.38, 0.16, 0.26), '#c9a26b', 0, 0, 0);
  label(carried, FARM, 0.2, 0.05, 0, 0, 0.132, '#c9a26b', '#2e4a26');
  const shelved = group(g, CS.shelf[0] + 0.02, CS.shelf[1] + 0.0, CS.shelf[2]);
  part(shelved, box(0.38, 0.16, 0.26), '#c9a26b', 0, 0.08, 0);
  const coldAir: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) coldAir.push(part(g, ball(0.05), '#eaf6fb', CS.door.x - 0.3 + i * 0.12, 0.12, CS.door.z + 0.1, { outline: false }));
  const spots: Record<string, Spot> = { vfStockCold: standAt(g, 'vfStock') };
  out.work = marker(g, CS.door.x, 1.0, 0.3);
  drive(g, out, spots, {}, (now, N, t) => {
    const n = N?.n ?? {};
    const using = now === 'vfStockCold';
    cart.visible = using;
    door.rotation.y = (n.door ?? 0) * CS.door.swing;
    const bp = N?.props.box;
    carried.visible = !!bp;
    if (bp) place(carried, bp);
    shelved.visible = using && (n.stacked ?? 0) > 0.5;
    const open = (n.door ?? 0) > 0.05;
    coldAir.forEach((m, i) => {
      m.visible = open;
      const u = ((t * 0.5 + i / 6) % 1 + 1) % 1;
      m.position.set(CS.door.x - 0.3 + i * 0.12, 0.1 + u * 0.1, CS.door.z + 0.1 + u * 0.3);
      m.scale.setScalar(0.5 + u * 0.9);
    });
    const temp = open ? 5.6 : 4.0;
    read.draw(`${temp}`, (c) => {
      c.fillStyle = SCREEN;
      c.fillRect(0, 0, 220, 100);
      text(c, `${temp.toFixed(1)}℃`, 205, 48, 52, open ? '#ffb74d' : '#90caf9', 'right');
      text(c, '저온', 14, 80, 20, '#d6efe4');
    });
    const rows = Math.max(0, Math.min(3, Math.floor(n.rows ?? 0)));
    log.draw(`l${rows}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 160, 150);
      text(c, '입고 기록', 8, 16, 16, GREEN);
      ['상추 12판', '딸기 8팩', '샐러드 20'].forEach((s0, i) => {
        c.fillStyle = '#ccc';
        c.fillRect(6, 56 + i * 36, 148, 1);
        if (i < rows) text(c, s0, 10, 42 + i * 36, 16, '#1a4f8a', 'left', false);
      });
    });
  });
};

// =============================================================================================
// 생산 계획판 (vfPlanBoard).

const planBoard: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(1.86, 1.2, 0.05, 0.012), '#eceff1', 0, 1.4, PB.z - 0.03);
  for (const x of [-0.84, 0.84]) part(g, box(0.05, 1.98, 0.05), FRAME_D, x, 0.99, PB.z - 0.06);
  part(g, box(1.8, 0.02, 0.12), STEEL, 0, PB.ledge, PB.z + 0.03);
  const week = ['1주', '2주', '3주', '4주', '5주', '6주'];
  const rowS = ['상추A', '상추B', '딸기', '시험'];
  const tex = painted('vfPlan', 720, 400, (c) => {
    c.fillStyle = '#fbfdfb';
    c.fillRect(0, 0, 720, 400);
    text(c, `${FARM} 생산 계획`, 16, 22, 24, GREEN);
    c.strokeStyle = '#90a4ae';
    for (let i = 0; i <= 6; i++) {
      c.beginPath();
      c.moveTo(140 + i * 96, 46);
      c.lineTo(140 + i * 96, 390);
      c.stroke();
      if (i < 6) text(c, week[i], 188 + i * 96, 62, 16, INK, 'center');
    }
    for (let j = 0; j <= 4; j++) {
      c.beginPath();
      c.moveTo(14, 80 + j * 76);
      c.lineTo(716, 80 + j * 76);
      c.stroke();
      if (j < 4) text(c, rowS[j], 20, 118 + j * 76, 18, INK);
    }
  });
  picture(g, tex, 1.74, 1.06, 0, 1.42, PB.z);
  const seedDots = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [4, 1], [0, 2], [1, 2], [3, 2], [0, 3], [1, 3]];
  const colors = ['#66bb6a', '#66bb6a', '#d81b3c', '#ef6c00'];
  for (const [c, r] of seedDots) part(g, cyl(0.03, 0.03, 0.012, 12), colors[r], pbCell(c, r)[0], pbCell(c, r)[1], PB.z + 0.015, { rx: Math.PI / 2 });
  const magnets = [
    part(g, cyl(0.03, 0.03, 0.014, 12), '#fbc02d', 0, 0, PB.z + 0.016, { rx: Math.PI / 2 }),
    part(g, cyl(0.03, 0.03, 0.014, 12), '#fbc02d', 0, 0, PB.z + 0.016, { rx: Math.PI / 2 }),
  ];
  const place0 = (m: THREE.Mesh, p: V) => m.position.set(p[0], p[1], PB.z + 0.016);
  const writes: Array<(k: number) => void> = [0, 1].map((i) => {
    const row = i === 0 ? 0 : 2;
    const line = part(g, box(1, 0.012, 0.002), '#1565c0', 0, 0, PB.z + 0.012, { outline: false });
    const a = pbCell(4.2, row);
    return (k: number) => {
      line.visible = k > 0.03;
      const w = Math.max(0.001, 0.36 * k);
      line.scale.x = w;
      line.position.set(a[0] + w / 2, a[1], PB.z + 0.012);
    };
  });
  // The team at the plan, called in when it's led.
  const staff = [drawnPerson(g, '#66bb6a', '#37474f', '#1a1a1a', 'male'), drawnPerson(g, '#00897b', '#263238', '#5b3a1e')];
  // To either side of the board, so neither stands between the camera and whoever leads.
  staff[0].root.position.set(1.02, 0, 0.72);
  staff[0].root.rotation.y = -2.36;
  staff[1].root.position.set(-0.98, 0, 0.84);
  staff[1].root.rotation.y = 2.5;
  const tools = { marker: pen(g, 'vfMarker', '#1565c0', PB.marker, [Math.PI / 2, 0, Math.PI / 2]) };
  const spots: Record<string, Spot> = { vfPlanHarvest: standAt(g, 'vfPlan'), smartFarmer_leadPlan: standAt(g, 'vfLead') };
  out.work = marker(g, 0, 1.4, PB.z);
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    const moved = n.moved ?? 0;
    const mp = N?.props.magnet;
    const which = n.which ?? 0;
    const at = (first: boolean) => {
      const m = moved - (first ? 0 : 1);
      if (mp && which === (first ? 1 : 2)) return mp;
      const k = Math.max(0, Math.min(1, m));
      const a = first ? pbCell(1, 1) : pbCell(2, 3);
      const b = first ? pbCell(3, 1) : pbCell(4, 3);
      return k > 0.5 ? b : a;
    };
    place0(magnets[0], at(true));
    place0(magnets[1], at(false));
    const w = n.written ?? 0;
    writes[0](Math.max(0, Math.min(1, w)));
    writes[1](Math.max(0, Math.min(1, w - 1)));
    const lead = now === 'smartFarmer_leadPlan';
    for (const f of staff) f.root.visible = lead;
    if (lead) {
      const team = n.team ?? 0;
      staff[0].armR(team > 0.5 && team < 1.5 ? new THREE.Vector3(0.82, 1.3, 0.52) : null);
      staff[0].opts.nod = 0.04 * Math.sin(t * 2);
      staff[0].head.rotation.y = 0.2 * Math.sin(t * 0.4);
      staff[1].armL(team > 1.5 ? new THREE.Vector3(-0.78, 1.1, 0.68) : null);
      staff[1].opts.nod = 0.1 + 0.06 * Math.sin(t * (team > 1.5 ? 5 : 1.2));
    }
  });
};

// =============================================================================================
// 위생 전실 (vfCleanEntry).

const cleanEntry: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, box(2.9, 1.42, 0.04), '#e0f2f1', 0, 0.71, -0.44);
  // Lockers: one of them opens; a peg with white gowns; a dispenser of hairnets.
  part(g, box(CE.locker.w, CE.locker.h, 0.4), '#cfd8dc', CE.locker.x, CE.locker.h / 2, -0.22);
  const lk = group(g, CE.locker.pivot, 0, CE.locker.door);
  part(lk, rbox(CE.locker.w - 0.04, CE.locker.h - 0.06, 0.02, 0.006), '#eceff1', -CE.locker.w / 2 + 0.02, CE.locker.h / 2, 0);
  part(lk, cyl(0.008, 0.008, 0.1, 6), CHROME, -CE.locker.w + 0.08, 1.0, 0.02, { outline: false });
  for (const s of [-1, 1]) part(g, box(0.02, CE.locker.h, 0.1), '#cfd8dc', CE.locker.x + (s * CE.locker.w) / 2, CE.locker.h / 2, 0.03);
  const gownPeg = group(g, CE.gown[0], CE.gown[1], CE.gown[2]);
  part(gownPeg, rbox(0.46, 0.9, 0.08, 0.04), '#fafafa', 0, -0.36, 0);
  // Hairnets in their box, the glove box under it, the sign.
  part(g, rbox(0.28, 0.2, 0.14, 0.01), '#fff', CE.hairnet[0], CE.hairnet[1], -0.3);
  label(g, '위생모', 0.2, 0.06, CE.hairnet[0], CE.hairnet[1] + 0.02, -0.228, '#fff', GREEN);
  part(g, rbox(0.28, 0.14, 0.14, 0.01), '#bbdefb', CE.hairnet[0], CE.hairnet[1] - 0.22, -0.3);
  label(g, '장갑', 0.14, 0.05, CE.hairnet[0], CE.hairnet[1] - 0.22, -0.228, '#bbdefb', '#1976d2');
  // A wide shallow boot wash in front, in the walkway; brushes each side.
  part(g, box(0.62, 0.05, 0.44), '#90a4ae', CE.tray.x, 0.025, CE.tray.z - 0.28);
  part(g, box(0.56, 0.01, 0.38), '#6fc4e8', CE.tray.x, 0.05, CE.tray.z - 0.28, { outline: false });
  const foam: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) foam.push(part(g, ball(0.03), '#fbffff', CE.tray.x - 0.18 + (i % 4) * 0.12, 0.07, CE.tray.z - 0.4 + (i > 3 ? 0.2 : 0), { outline: false }));
  for (const s of [-1, 1]) part(g, rbox(0.04, 0.12, 0.3, 0.01), '#ffca28', CE.tray.x + s * 0.3, 0.1, CE.tray.z - 0.28);
  label(g, '장화 소독', 0.34, 0.08, CE.tray.x, 1.25, -0.415, '#fff', '#1976d2');
  // The sanitiser pump and the checklist.
  part(g, rbox(0.12, 0.26, 0.1, 0.01), '#fff', CE.pump[0], CE.pump[1], -0.37);
  part(g, cyl(0.012, 0.012, 0.04, 8), '#1976d2', CE.pump[0], CE.pump[1] + 0.14, -0.33, { outline: false });
  label(g, '손 소독', 0.14, 0.05, CE.pump[0], CE.pump[1] + 0.03, -0.318, '#fff', '#1976d2');
  part(g, rbox(0.24, 0.3, 0.012, 0.006), '#8d6e63', CE.list[0], CE.list[1], CE.list[2] - 0.13);
  const list = live(g, 160, 200, 0.22, 0.27, CE.list[0], CE.list[1], CE.list[2] - 0.122);
  label(g, `${FARM} 위생 전실`, 0.66, 0.1, 0.48, 1.37, -0.415, GREEN, '#fff');
  const gown = group(g);
  part(gown, rbox(0.46, 0.8, 0.06, 0.04), '#fafafa', 0, -0.3, 0);
  const net = group(g);
  part(net, ball(0.11), '#eceff1', 0, 0, 0).scale.set(1, 0.5, 1);
  const spots: Record<string, Spot> = { vfGownUp: standAt(g, 'vfGown') };
  out.work = marker(g, 0, 1.0, 0);
  drive(g, out, spots, {}, (now, N, t) => {
    const n = N?.n ?? {};
    const using = now === 'vfGownUp';
    lk.rotation.y = (n.door ?? 0) * 1.3;
    gownPeg.visible = !N?.props.gown;
    const gp = N?.props.gown;
    gown.visible = !!gp;
    if (gp) place(gown, gp);
    const np = N?.props.net;
    net.visible = !!np;
    if (np) place(net, np);
    foam.forEach((m, i) => {
      m.visible = using && (n.foam ?? 0) > 0.5;
      m.scale.setScalar(0.7 + 0.3 * Math.sin(t * 7 + i));
    });
    const ticks = Math.max(0, Math.min(3, Math.floor(n.ticks ?? 0)));
    list.draw(`t${ticks}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 160, 200);
      text(c, '입실 점검', 10, 18, 16, GREEN);
      ['위생복', '위생모', '장화', '손 소독'].forEach((s0, i) => {
        c.strokeStyle = INK;
        c.strokeRect(10, 42 + i * 38, 18, 18);
        text(c, s0, 36, 51 + i * 38, 16, INK, 'left', false);
        if (i < ticks + 1 && (ticks > 0 || !using)) text(c, '✓', 12, 51 + i * 38, 18, GREEN, 'left');
      });
    });
  });
};

// =============================================================================================
// 견학 안내판 (vfFarmSign): what the farm is, at a glance from the visitors' chairs.

const farmSign: Builder = (g) => {
  part(g, box(1.74, 0.72, 0.42), '#e8f5e9', 0, 0.36, -0.14);
  const tex = painted('vfFarmSign', 512, 280, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 512, 280);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 512, 56);
    text(c, `${FARM} 수직농장`, 256, 30, 30, '#fff', 'center');
    ['흙 없이 물과 빛으로 키워요', '4층 재배 · 연중 수확', '농약 없이 깨끗하게', '씨앗부터 포장까지 28일'].forEach((s0, i) => text(c, `· ${s0}`, 24, 90 + i * 46, 24, INK));
  });
  part(g, box(1.3, 0.72, 0.03), FRAME, 0, 1.08, -0.3);
  picture(g, tex, 1.24, 0.66, 0, 1.08, -0.283);
  // Jars of what grows in the racks, a stage in each.
  const s = seeded(31);
  [0.3, 0.55, 0.8, 1].forEach((k, i) => {
    const x = -0.6 + i * 0.4;
    glassBox(g, 0.2, 0.26, 0.2, x, 0.85, -0.06);
    const list: Blob[] = [];
    headBlobs(list, x, 0.76, -0.06, k, s, i === 3);
    blobs(g, list);
    label(g, `${(i + 1) * 7}일`, 0.14, 0.05, x, 0.64, 0.09, '#fff', GREEN);
  });
};

export const BUILDERS: Record<string, Builder> = {
  vfLettuceRack: lettuceRack,
  vfBerryRack: berryRack,
  vfLowBed: lowBed,
  vfEnvConsole: envConsole,
  vfDoser: doser,
  vfSeedChamber: seedChamber,
  vfSowBench: sowBench,
  vfPackTable: packTable,
  vfColdStore: coldStore,
  vfPlanBoard: planBoard,
  vfCleanEntry: cleanEntry,
  vfFarmSign: farmSign,
};
