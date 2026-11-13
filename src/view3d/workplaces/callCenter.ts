import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, seeded, text } from './doctor';
import { BT, CALLS, CB, DOOR_SWING, FQ, PEN_UP, QA, QB, RC, RP, SV, TE, TM, csNow, csPhase, wrap } from './callCenterMotion';
import type { CsMotion, CsNow, CsTool } from './callCenterMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 고객센터 drawn as itself (2026-11-01), the support centre of a made-up company, 보듬온. Rows of partitioned desks with
 * headsets and teammates on calls, a wall board whose queue goes down as calls are really answered at the desks, binders of
 * scripts and answers, a supervisor's listening station, a training set where a call is played out, a quiet booth for a hard
 * call, and a tea corner and massage chair for afterwards. The strain is real and treated with care: the rule that a call
 * may be ended is on screen, there's a note from the team after a hard one, and kind customers' thanks come up on the desk
 * and go up on the wall. Everything that moves follows callCenterMotion.ts. All names are invented.
 */

const CO = '보듬온';
const WHITE = '#f6f6f8';
const PANEL = '#c9c4d6';
const PANEL_D = '#8f88a3';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const PLUM = '#5e3a8c';
const VIOLET = '#8e5bc4';
const LILAC = '#e4d8f4';
const AMBER = '#ffb300';
const AMBER_L = '#ffe08a';
const RED = '#e53935';
const GREEN = '#43a047';
const MINT = '#7ee89e';
const PINK = '#f48fb1';
const PAPER = '#fbfaf6';
const WOOD = '#c4a27c';
const SKIN = '#f1c9a5';
const INK = '#14131c';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const typed = (s: string, e: number | undefined) => s.slice(0, Math.floor(s.length * clamp01(e) + 0.001));
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};

// ---------------------------------------------------------------------------------------------
// How the floor is doing: every call finished at a desk takes one off the queue on the board, for a while.

const FLOOR = { lastAt: -1e9, recent: 0 };
function callAnswered(t: number) {
  FLOOR.recent = Math.min(4, reliefAt(t) + 1);
  FLOOR.lastAt = t;
}
/** It wears off as new calls come in. The clock can run backwards in a script, hence the abs. */
function reliefAt(t: number) {
  return Math.max(0, FLOOR.recent - Math.abs(t - FLOOR.lastAt) / 14);
}
function floorNow(t: number) {
  const r = reliefAt(t);
  const waiting = Math.max(0, Math.round(5 + 3 * Math.sin(t / 19) + 2 * Math.sin(t / 7.3) - r));
  const rate = THREE.MathUtils.clamp(90 + 2.5 * Math.sin(t / 23) + r * 1.4 - waiting * 0.3, 0, 100);
  return { waiting, rate, wait: Math.max(4, Math.round(12 + waiting * 6)), online: 18 + Math.round(1.5 + 1.5 * Math.sin(t / 31)) };
}

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function at(m: THREE.Object3D, p: V | null | undefined, home?: V | null) {
  const w = p ?? home;
  m.visible = !!w;
  if (w) m.position.set(w[0], w[1], w[2]);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function haze(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, opacity: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A plane whose canvas is repainted only when its key changes. */
function liveScreen(g: THREE.Object3D, w: number, h: number, px: number, py: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
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
function standAt(g: THREE.Object3D, motion: CsMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: CsMotion, seat: V, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], yaw, 0);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to; what the script says is in the hand goes in the hand. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<CsTool, HeldTool>>, show: (now: string | null, N: CsNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? csNow(sp.motion as CsMotion, t, csPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t, H);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
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
function chair(g: THREE.Object3D, seat: V, color = PLUM) {
  const c = group(g, seat[0], 0, seat[2]);
  const T = seat[1];
  part(c, rbox(0.44, 0.07, 0.42, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.23, 0.05, Math.sin(a) * 0.23), 0.014, BLACK);
    part(c, ball(0.024), BLACK, Math.cos(a) * 0.23, 0.026, Math.sin(a) * 0.23, { outline: false });
  }
  part(c, rbox(0.4, 0.42, 0.06, 0.04), color, 0, T + 0.3, 0.23, { rx: 0.1 });
}
/** A monitor on a stem; the screen's plane stands in front of its case. */
function monitor(g: THREE.Object3D, p: V, w: number, h: number, T: number, px: number, py: number, ry = 0) {
  const m = group(g, p[0], 0, p[2], ry);
  part(m, box(w + 0.03, h + 0.03, 0.025), BLACK, 0, p[1], -0.016, { outline: false });
  const stem = Math.max(0.02, p[1] - T - h / 2 + 0.06);
  part(m, cyl(0.02, 0.026, stem, 10), GREY_D, 0, T + stem / 2, -0.05, { outline: false });
  part(m, rbox(0.22, 0.016, 0.15, 0.006), GREY_D, 0, T + 0.008, -0.05, { outline: false });
  return liveScreen(m, w, h, px, py, 0, p[1], 0);
}
function keyboard(g: THREE.Object3D, p: V, w = 0.34, d = 0.12) {
  part(g, rbox(w, 0.018, d, 0.006), GRAPHITE, p[0], p[1] - 0.022, p[2], { outline: false });
  for (let j = 0; j < 4; j++) part(g, box(w - 0.03, 0.002, 0.012), GREY, p[0], p[1] - 0.012, p[2] - d / 2 + 0.02 + j * 0.026, { outline: false });
}
function mouse(g: THREE.Object3D, p: V, T: number) {
  part(g, rbox(0.06, 0.03, 0.1, 0.012), GRAPHITE, p[0], T + 0.015, p[2], { outline: false });
}
/** The partition: a back and two sides, cloth with a metal cap, seen over from the room. */
function partition(g: THREE.Object3D, w: number, H = 1.22, front = 0.3) {
  part(g, box(w, H, 0.04), PANEL, 0, H / 2, -0.47);
  part(g, box(w + 0.02, 0.025, 0.05), GREY, 0, H + 0.012, -0.47, { outline: false });
  for (const sx of [-1, 1]) {
    const len = front + 0.47;
    part(g, box(0.035, H, len), PANEL, sx * (w / 2 - 0.018), H / 2, (front - 0.47) / 2);
    part(g, box(0.045, 0.025, len), GREY, sx * (w / 2 - 0.018), H + 0.012, (front - 0.47) / 2, { outline: false });
  }
}
function deskTop(g: THREE.Object3D, w: number, T: number, front = 0.3) {
  part(g, rbox(w, 0.04, front + 0.45, 0.01), '#e9e3d8', 0, T - 0.02, (front - 0.45) / 2);
  part(g, box(0.34, 0.3, 0.42), GREY, (w / 2) * 0.62, T - 0.19, -0.2, { outline: false });
}
/** A call headset, one ear and a boom, round the group's origin at the head's centre. */
function headset(g: THREE.Object3D, color = '#26262e'): THREE.Group {
  const h = group(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.008, 8, 22, Math.PI), new THREE.MeshToonMaterial({ color }));
  band.userData.ownGeometry = band.userData.ownMaterial = true;
  h.add(band);
  part(h, cyl(0.042, 0.042, 0.024, 14), color, 0.122, 0, 0, { rz: Math.PI / 2 });
  part(h, cyl(0.016, 0.016, 0.02, 10), color, -0.122, 0, 0, { rz: Math.PI / 2 });
  rod(h, v3(0.128, -0.02, 0.01), v3(0.06, -0.1, 0.112), 0.004, color);
  part(h, ball(0.012), '#111114', 0.056, -0.104, 0.116, { outline: false });
  return h;
}
function wearing(worn: THREE.Object3D, parked: THREE.Object3D, on: boolean, seat: V, N: CsNow | null, H: number) {
  worn.visible = on;
  parked.visible = !on;
  if (on && N) {
    const lean = N.key.lean ?? 0.05;
    worn.position.set(seat[0], seat[1] + 0.44 * H * Math.cos(lean), seat[2] - 0.44 * H * Math.sin(lean));
    worn.scale.setScalar(H / 1.6);
  }
}
function parkedHeadset(g: THREE.Object3D, x: number, T: number, z: number): THREE.Group {
  const stand = group(g, x, T, z);
  part(stand, cyl(0.04, 0.045, 0.01, 12), BLACK, 0, 0.005, 0, { outline: false });
  rod(stand, v3(0, 0, 0), v3(0, 0.2, 0), 0.006, BLACK);
  const p = headset(stand);
  p.position.set(0, 0.13, 0);
  p.scale.setScalar(0.66);
  p.rotation.y = 0.8;
  return p;
}
const mug = (g: THREE.Object3D, x: number, T: number, z: number, c = '#d1c4e9') => part(g, cyl(0.038, 0.034, 0.085, 14), c, x, T + 0.043, z);

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

const DOWN = v3(-0.12, -1, -0.28).normalize();
function penTool(g: THREE.Object3D, color = '#2f6fd0'): THREE.Group {
  const root = group(g);
  root.name = 'csPen';
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), DOWN);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 10), color, 0, (0.05 - PEN_UP * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(0.006, 0.002, PEN_UP * 0.22, 10), BLACK, 0, -PEN_UP * 0.89, 0, { outline: false });
  return root;
}
const penHeld = (tool: THREE.Object3D): HeldTool => ({ tool, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: DOWN.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } });
/** What's carried flat on the left forearm: a tablet, an open binder. */
const FLAT_LEFT: HeldTool['grips'] = { left: boardGrip(0.6) };
function tabletTool(g: THREE.Object3D, name: string, px = 256, py = 180) {
  const root = group(g);
  root.name = name;
  const tilt = group(root);
  tilt.rotation.x = -0.6;
  part(tilt, rbox(0.25, 0.18, 0.012, 0.008), GRAPHITE, 0, 0, 0, { outline: false });
  const screen = liveScreen(tilt, 0.23, 0.16, px, py, 0, 0, 0.0075);
  return { root, screen };
}
function magnetTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'csMagnet';
  part(root, rbox(0.075, 0.05, 0.012, 0.005), AMBER, 0, 0, -0.024, { outline: false });
  part(root, cyl(0.009, 0.011, 0.024, 10), GRAPHITE, 0, 0, -0.008, { rx: Math.PI / 2, outline: false });
  return root;
}
function handsetTool(g: THREE.Object3D, color = '#eceff1') {
  const root = group(g);
  root.name = 'csHandset';
  part(root, cyl(0.015, 0.015, 0.14, 10), color, 0, 0, 0, { outline: false });
  part(root, rbox(0.05, 0.05, 0.035, 0.012), color, 0, 0.085, 0.01, { outline: false });
  part(root, rbox(0.05, 0.05, 0.035, 0.012), color, 0, -0.085, 0.01, { outline: false });
  return root;
}
function cupTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'csCup';
  part(root, cyl(0.036, 0.028, 0.09, 14), WHITE, 0, 0, 0, { outline: false });
  part(root, cyl(0.0375, 0.0375, 0.012, 14), VIOLET, 0, 0.012, 0, { outline: false });
  const water = part(root, cyl(0.033, 0.033, 0.002, 14), '#a8763e', 0, 0.036, 0, { outline: false });
  const tag = part(root, box(0.018, 0.022, 0.002), AMBER_L, 0.036, 0.012, 0.012, { outline: false });
  return { root, water, tag };
}
function remoteTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'csRemote';
  part(root, rbox(0.04, 0.14, 0.022, 0.009), GRAPHITE, 0, 0, 0, { outline: false });
  ownLit(root, ball(0.006), MINT, 0, 0.05, 0.012);
  return root;
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const sitting = seat !== undefined;
  const base = sitting ? seat + 0.07 - 0.88 : 0;
  if (sitting) {
    for (const sx of [-1, 1]) {
      const ankle = v3(sx * 0.09, 0.08, 0.42);
      const knee = v3(sx * 0.09, seat + 0.03, 0.3);
      rod(root, v3(sx * 0.09, seat + 0.08, -0.08), knee, 0.056, bottom);
      rod(root, knee, ankle, 0.045, bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', ankle.x, ankle.y - 0.045, ankle.z + 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, seat + 0.08, -0.08);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  }
  const dz = sitting ? -0.08 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, base + 1.11, dz);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, base + 1.37, dz, { outline: false });
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const rest = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, top);
    const lower = limb(root, 0.035, SKIN);
    const hand = part(root, ball(0.036), SKIN, 0, 0, 0, { outline: false });
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
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(Math.max(0, 1 - cosA * cosA)));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  const opts: FigureOptions = { gender, seat, seed };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => void (f && (f.root.visible = false)) };
}
const nodHead = (F: Fig, v: number) => {
  F.opts.nod = v;
  F.head.rotation.x = v;
};

// ---------------------------------------------------------------------------------------------
// What a desk's screen shows.

/** A voice's level across the bar, for a call or a recording. */
function waveform(c: Ctx2, x: number, y: number, w: number, h: number, seed: number, loud: number, played: number, color: string, dim = 'rgba(160,160,190,0.35)') {
  const bars = Math.max(8, Math.floor(w / 5));
  for (let i = 0; i < bars; i++) {
    const u = i / bars;
    const a = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.7 + seed) * Math.cos(i * 0.23 + seed * 2));
    const b = Math.max(1, (h / 2) * a * (0.35 + 0.65 * clamp01(loud)));
    c.fillStyle = u <= played ? color : dim;
    c.fillRect(x + (i * w) / bars, y + h / 2 - b, 3, b * 2);
  }
}
interface CallView {
  i: number;
  ringing: boolean;
  live: number;
  cust: number;
  form: number;
  found: number;
  thanks: number;
  t: number;
  memo?: number;
  saved?: number;
  note?: boolean;
  shadow?: boolean;
}
function paintCall(c: Ctx2, w: number, h: number, v: CallView) {
  const call = CALLS[wrap(v.i, CALLS.length)];
  c.fillStyle = '#f4f1f9';
  c.fillRect(0, 0, w, h);
  c.fillStyle = PLUM;
  c.fillRect(0, 0, w, 26);
  text(c, `${CO} 상담 ${v.shadow ? '· 선배 통화 청취' : v.note ? '· 상담 이력' : ''}`, 8, 13, 14, '#ffffff');
  const live = v.live > 0.5;
  c.fillStyle = v.ringing ? (Math.sin(v.t * 12) > 0 ? AMBER : '#ff7043') : live ? '#2e7d32' : '#78909c';
  c.fillRect(w - 86, 4, 78, 18);
  text(c, v.ringing ? '전화 옴' : live ? '통화 중' : '대기', w - 47, 13, 13, '#ffffff', 'center');
  text(c, call.who, 10, 42, 16, INK);
  text(c, `문의: ${call.issue}`, 10, 62, 13, GREY_D, 'left', false);
  // Their voice, as it goes.
  c.fillStyle = '#e4dcf0';
  c.fillRect(8, 74, w - 16, 28);
  if (live) waveform(c, 12, 76, w - 24, 24, v.i + Math.floor(v.t * 5) * 0.37, v.cust, 1, call.tough && v.cust > 0.5 ? RED : VIOLET);
  // The record, typed.
  const line = (y: number, head: string, s: string, e: number) => {
    text(c, head, 10, y, 12, PLUM);
    text(c, typed(s, e), 62, y, 12, INK, 'left', false);
  };
  line(118, '유형', call.tough ? '장애 불만' : '일반 문의', v.form * 3);
  line(136, '내용', call.issue, v.form * 2 - 0.5);
  line(154, '처리', v.found > 0.5 || v.note ? call.answer : '', v.note ? v.form : 1);
  if (v.saved && v.saved > 0.5) {
    c.fillStyle = '#2e7d32';
    c.fillRect(w - 86, 112, 78, 22);
    text(c, '저장 완료', w - 47, 123, 13, '#ffffff', 'center');
  }
  // The closing word: a customer's thanks, or the team's care after a hard one.
  if (v.thanks > 0.05) {
    c.globalAlpha = clamp01(v.thanks);
    c.fillStyle = call.tough ? '#e8f1e4' : '#fff3c9';
    c.fillRect(8, h - 48, w - 16, 42);
    c.strokeStyle = call.tough ? GREEN : AMBER;
    c.lineWidth = 2;
    c.strokeRect(8, h - 48, w - 16, 42);
    text(c, call.tough ? '잠깐 숨 고르세요. 수고 많았어요.' : '고객님의 한마디', 16, h - 37, 12, call.tough ? '#2e7d32' : '#a0641e');
    text(c, call.thanks, 16, h - 18, 13, INK, 'left', false);
    c.globalAlpha = 1;
  }
}
function paintIdleDesk(c: Ctx2, w: number, h: number) {
  c.fillStyle = PLUM;
  c.fillRect(0, 0, w, h);
  text(c, CO, w / 2, h / 2 - 16, 30, '#ffffff', 'center');
  text(c, '오늘도 고맙습니다', w / 2, h / 2 + 20, 16, LILAC, 'center', false);
}
/** A call going on at a colleague's desk by the clock. */
function teammateView(t: number, seed: number): CallView {
  const len = 18;
  const u = ((t / len + seed * 0.31) % 1 + 1) % 1;
  const i = Math.floor(t / len + seed * 0.31) + seed;
  return { i, ringing: false, live: u < 0.9 ? 1 : 0, cust: u < 0.3 ? 1 : 0, form: clamp01((u - 0.2) * 2.5), found: u > 0.6 ? 1 : 0, thanks: u > 0.75 ? 1 : 0, t };
}
const viewKey = (v: CallView) => `${wrap(v.i, CALLS.length)}|${v.ringing ? Math.floor(v.t * 4) : 0}|${q(v.live, 2)}|${v.live > 0.5 && v.cust > 0.1 ? Math.floor(v.t * 5) : 0}|${q(v.cust, 2)}|${q(v.form, 30)}|${q(v.found, 2)}|${q(v.thanks, 8)}|${q(v.saved, 2)}|${v.note ? 1 : 0}|${v.shadow ? 1 : 0}`;

function deskBits(g: THREE.Object3D, seed: number, T: number) {
  // Some of someone's own: a stuck-up thanks, a photo, a small plant, a mug.
  label(g, '고마워요!', 0.16, 0.05, -0.3, T + 0.42, -0.448, AMBER_L, '#6b4a10');
  if (seed % 2) label(g, '천천히 또박또박', 0.26, 0.05, 0.1, 1.17, -0.448, '#fce4ec', '#7a2e4d');
  if (seed % 3 === 0) {
    part(g, cyl(0.03, 0.026, 0.05, 10), '#a1887f', -0.34, T + 0.025, -0.28);
    part(g, ball(0.045), '#66bb6a', -0.34, T + 0.09, -0.28);
  } else mug(g, -0.36, T, -0.02, seed % 3 === 1 ? '#c5cae9' : '#ffe0b2');
}

// =============================================================================================
// 상담석 (callBooth, 1 × 1).

function callBooth(g: THREE.Group, out: Built) {
  const T = BT.top;
  deskTop(g, 0.98, T);
  partition(g, 0.98);
  chair(g, BT.seat);
  const scr = monitor(g, BT.screen, 0.5, 0.31, T, 340, 210);
  keyboard(g, BT.keys, 0.3);
  mouse(g, BT.mouse, T);
  // The memo pad, and the phone box with its lamp.
  part(g, box(0.13, 0.012, 0.18), PAPER, BT.memo[0], T + 0.006, BT.memo[2], { outline: false });
  const lines = [0, 1, 2].map((i) => part(g, box(0.08, 0.001, 0.003), GREY_D, BT.memo[0], T + 0.013, BT.memo[2] - 0.03 + i * 0.03, { outline: false }));
  part(g, rbox(0.11, 0.03, 0.09, 0.008), GRAPHITE, 0.33, T + 0.015, -0.14, { outline: false });
  const lamp = ownLit(g, ball(0.009), '#3a4048', 0.3, T + 0.034, -0.12);
  const parked = parkedHeadset(g, 0.33, T + 0.03, -0.22);
  const worn = headset(g);
  worn.visible = false;
  const pen = penTool(g);
  const tools: Partial<Record<CsTool, HeldTool>> = { pen: penHeld(pen) };
  const senior = lazy(() => {
    const f = person(g, '#7e57c2', '#37474f', '#2b1b10', 0.42, 1.02, Math.PI + 0.3, 'female');
    headset(f.head).position.set(0, 0.015, 0);
    return f;
  });
  const spots: Record<string, Spot> = {
    answerCalls: seatAt(g, 'csAnswer', BT.seat),
    writeCallNote: seatAt(g, 'csNote', BT.seat),
    callCenter_listenSenior: seatAt(g, 'csShadow', BT.seat),
  };
  let seed = -1;
  let doneRound = NaN;
  const tgt = new THREE.Vector3();
  const show = (now: string | null, N: CsNow | null, t: number, H: number) => {
    if (seed < 0) {
      seed = seedOf(g);
      deskBits(g, seed, T);
    }
    const n = N?.n ?? {};
    wearing(worn, parked, (n.hs ?? 0) > 0.5, BT.seat, N, H);
    at(pen, N?.props.pen ?? null, [BT.memo[0] + 0.03, T + 0.02, BT.memo[2] - 0.11]);
    const memo = clamp01(n.memo);
    lines.forEach((m, i) => (m.visible = !N || memo > (i + 0.3) / 3));
    setLit(lamp, (n.ringing ?? 0) > 0.5 ? (Math.sin(t * 12) > 0 ? '#ff5252' : '#ffc107') : (n.live ?? 0) > 0.5 ? '#66bb6a' : '#3a4048');
    // A call finished here takes one off the wall board's queue.
    if (now === 'answerCalls' && N && (n.answered ?? 0) > 0.5 && doneRound !== N.b.n) {
      doneRound = N.b.n;
      callAnswered(t);
    }
    if (now === 'callCenter_listenSenior') {
      const f = senior.get();
      f.root.visible = true;
      tgt.set(0.52, 1.28, 0.68);
      f.armR((n.srPoints ?? 0) > 0.5 ? tgt : null);
      f.armL(null);
      nodHead(f, (n.says ?? 0) > 0.5 ? 0.14 + 0.05 * Math.sin(t * 3) : 0.28);
    } else senior.hide();
    if (!N) return scr.draw('idle', (c) => paintIdleDesk(c, 340, 210));
    const v: CallView = { i: N.b.n, ringing: (n.ringing ?? 0) > 0.5, live: n.live ?? 0, cust: n.cust ?? 0, form: clamp01(n.form), found: n.found ?? 0, thanks: n.thanks ?? 0, t, saved: n.saved, note: (n.note ?? 0) > 0.5, shadow: (n.shadow ?? 0) > 0.5 };
    scr.draw(viewKey(v), (c) => paintCall(c, 340, 210, v));
  };
  show(null, null, 0, 1.6);
  drive(g, out, spots, tools, show);
  out.work = marker(g, BT.keys[0], BT.keys[1], BT.keys[2]);
}

// =============================================================================================
// 동료 상담석 (csTeamDesk, 1 × 1): the same desk, a colleague on a call at it.

function teamDesk(g: THREE.Group, out: Built) {
  const T = BT.top;
  deskTop(g, 0.98, T);
  partition(g, 0.98);
  chair(g, TM.seat, VIOLET);
  const scr = monitor(g, BT.screen, 0.5, 0.31, T, 340, 210);
  keyboard(g, BT.keys, 0.3);
  mouse(g, BT.mouse, T);
  part(g, rbox(0.11, 0.03, 0.09, 0.008), GRAPHITE, 0.33, T + 0.015, -0.14, { outline: false });
  ownLit(g, ball(0.009), '#66bb6a', 0.3, T + 0.034, -0.12);
  const coachPad = tabletTool(g, 'csCoachTablet');
  const tools: Partial<Record<CsTool, HeldTool>> = { clip: { tool: coachPad.root, lead: 'left', grips: FLAT_LEFT } };
  let mate: Fig | null = null;
  let seed = -1;
  const spots: Record<string, Spot> = { csCoach: standAt(g, 'csCoach', TM.stand[0], TM.stand[1]) };
  const keys = new THREE.Vector3();
  const mic = new THREE.Vector3();
  const show = (_now: string | null, N: CsNow | null, t: number) => {
    if (seed < 0) {
      seed = seedOf(g);
      deskBits(g, seed, T);
      const looks: Array<[string, string, string, 'female' | 'male']> = [['#b39ddb', '#37474f', '#1a1a1a', 'female'], ['#90caf9', '#455a64', '#3e2723', 'male'], ['#f8bbd0', '#5d4037', '#2b1b10', 'female'], ['#c5e1a5', '#37474f', '#4e342e', 'male']];
      const L = looks[wrap(seed, looks.length)];
      mate = person(g, L[0], L[1], L[2], TM.seat[0], TM.seat[2], Math.PI, L[3], TM.seat[1], seed);
      headset(mate.head).position.set(0, 0.015, 0);
      mate.root.visible = true;
    }
    const n = N?.n ?? {};
    at(coachPad.root, N?.props.clip ?? null);
    if (N) coachPad.screen.draw(`${q(n.ticks, 1)}`, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 256, 180);
      text(c, '코칭 메모', 128, 18, 20, PLUM, 'center');
      ['공감 먼저 말하기', '복창으로 확인', '끝인사 또박또박'].forEach((s, i) => {
        c.fillStyle = (n.ticks ?? 0) > i + 0.5 ? GREEN : '#cfd8dc';
        c.fillRect(14, 48 + i * 42, 24, 24);
        text(c, s, 50, 60 + i * 42, 18, INK, 'left', false);
      });
    });
    const v = teammateView(t, seed);
    if (mate) {
      const talkingNow = v.cust < 0.5;
      keys.set(BT.keys[0] - 0.09, BT.keys[1] + 0.03 + 0.006 * Math.sin(t * 9), BT.keys[2]);
      mic.set(BT.mouse[0] + 0.01 * Math.sin(t * 1.3), BT.mouse[1] + 0.03, BT.mouse[2]);
      mate.armL(keys);
      mate.armR(mic);
      const looks = (n.mateLooks ?? 0) > 0.5;
      mate.head.rotation.y = looks ? -0.5 : 0.04 * Math.sin(t * 0.7);
      nodHead(mate, (n.mateNods ?? 0) > 0.5 ? 0.12 + 0.12 * Math.sin(t * 6) : talkingNow ? 0.08 + 0.04 * Math.sin(t * 3) : 0.12);
    }
    scr.draw(viewKey(v), (c) => paintCall(c, 340, 210, v));
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.0, 0.3);
}

// =============================================================================================
// 상담 품질 모니터링석 (qaDesk, 1 × 1).

function qaDesk(g: THREE.Group, out: Built) {
  const T = QA.top;
  deskTop(g, 0.98, T);
  part(g, box(0.98, 0.62, 0.03), PANEL_D, 0, T + 0.31, -0.46);
  chair(g, QA.seat, '#455a64');
  const scr = monitor(g, [0, 1.07, -0.2], 0.56, 0.32, T, 360, 206);
  keyboard(g, QA.keys, 0.26);
  mouse(g, QA.mouse, T);
  const parked = parkedHeadset(g, -0.38, T, -0.2);
  const worn = headset(g);
  worn.visible = false;
  // The score sheet: a tick goes down it for each row; a stamp at the bottom.
  part(g, box(0.17, 0.004, 0.24), PAPER, QA.sheet[0], T + 0.003, QA.sheet[2], { outline: false });
  const ticks = [0, 1, 2, 3, 4].map((i) => {
    part(g, box(0.09, 0.001, 0.004), GREY, QA.sheet[0] - 0.03, T + 0.0055, QA.sheet[2] - 0.08 + i * 0.035, { outline: false });
    return part(g, box(0.012, 0.001, 0.012), GREEN, QA.sheet[0] + 0.055, T + 0.006, QA.sheet[2] - 0.08 + i * 0.035, { outline: false });
  });
  const stamp = part(g, cyl(0.022, 0.022, 0.001, 14), RED, QA.sheet[0] + 0.03, T + 0.0062, QA.sheet[2] + 0.095, { outline: false });
  // The stool a colleague is asked to sit on.
  part(g, cyl(0.15, 0.15, 0.05, 14), LILAC, QA.stool[0], QA.stool[1] - 0.025, QA.stool[2]);
  part(g, cyl(0.022, 0.03, QA.stool[1] - 0.05, 8), CHROME, QA.stool[0], (QA.stool[1] - 0.05) / 2, QA.stool[2], { outline: false });
  part(g, cyl(0.17, 0.18, 0.02, 14), GREY_D, QA.stool[0], 0.01, QA.stool[2], { outline: false });
  const pen = penTool(g, RED);
  const tools: Partial<Record<CsTool, HeldTool>> = { pen: penHeld(pen) };
  const colleague = lazy(() => person(g, '#b39ddb', '#37474f', '#2b1b10', QA.stool[0], QA.stool[2], Math.PI * 0.72, 'female', QA.stool[1]));
  const spots: Record<string, Spot> = { reviewCalls: seatAt(g, 'csReview', QA.seat), callCenter_coachAgent: seatAt(g, 'csFeedback', QA.seat) };
  const hand = new THREE.Vector3();
  const show = (_now: string | null, N: CsNow | null, t: number, H: number) => {
    const n = N?.n ?? {};
    wearing(worn, parked, (n.hs ?? 0) > 0.5, QA.seat, N, H);
    at(pen, N?.props.pen ?? null, [QA.sheet[0] + 0.1, T + 0.02, QA.sheet[2] - 0.09]);
    const marks = n.marks ?? 0;
    ticks.forEach((m, i) => (m.visible = !!N && marks > i + 0.5));
    stamp.visible = (n.stamped ?? 0) > 0.5;
    if ((n.mate ?? 0) > 0.5) {
      const f = colleague.get();
      f.root.visible = true;
      f.armL(null);
      if ((n.mateTalks ?? 0) > 0.5) {
        hand.set(QA.stool[0] + 0.22, QA.stool[1] + 0.38 + 0.03 * Math.sin(t * 4), QA.stool[2] - 0.05);
        f.armR(hand);
      } else f.armR(null);
      nodHead(f, (n.mateNods ?? 0) > 0.5 ? 0.14 + 0.1 * Math.sin(t * 5) : 0.05);
    } else colleague.hide();
    const p = clamp01(n.pos);
    const playing = (n.playing ?? 0) > 0.5;
    const round = N ? wrap(N.b.n, CALLS.length) : 0;
    scr.draw(`${q(p, 50)}|${playing ? 1 : 0}|${q(n.flag, 2)}|${round}|${q(marks, 1)}|${q(n.stamped, 2)}|${N ? 1 : 0}`, (c) => {
      const w = 360;
      const h = 206;
      c.fillStyle = INK;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#37474f';
      c.fillRect(0, 0, w, 26);
      text(c, `녹취 검토 · ${CALLS[round].who}`, 8, 13, 14, '#ffffff');
      text(c, playing ? '재생 중' : N ? '일시정지' : '대기', w - 8, 13, 13, playing ? MINT : AMBER_L, 'right');
      waveform(c, 10, 40, w - 20, 62, round + 1, 1, p, MINT);
      c.fillStyle = '#ffffff';
      c.fillRect(10 + (w - 20) * p, 36, 2, 70);
      if ((n.flag ?? 0) > 0.5) {
        const fx = 10 + (w - 20) * 0.58;
        c.fillStyle = AMBER;
        c.fillRect(fx, 34, 3, 72);
        text(c, '여기 좋았어요', Math.min(w - 90, fx + 6), 40, 12, AMBER_L);
      }
      ['첫인사', '경청·공감', '정확한 안내', '복창 확인', '끝인사'].forEach((s, i) => {
        const on = marks > i + 0.5;
        text(c, s, 14 + (i % 3) * 112, 126 + Math.floor(i / 3) * 26, 14, on ? MINT : '#9aa3ad', 'left', false);
      });
      text(c, (n.stamped ?? 0) > 0.5 ? '우수 상담으로 추천' : `${Math.round(p * 6)}:${String(Math.round(p * 300) % 60).padStart(2, '0')} / 6:00`, 14, h - 18, 15, (n.stamped ?? 0) > 0.5 ? AMBER_L : '#c9d6e3');
    });
  };
  show(null, null, 0, 1.6);
  drive(g, out, spots, tools, show);
  out.work = marker(g, QA.keys[0], QA.keys[1], QA.keys[2]);
}

// =============================================================================================
// 콜 현황판 (callBoard, 2 × 1): the numbers follow the floor (FLOOR) and the work at the board.

const BARS = [['요금·결제', 0.8], ['앱 오류', 0.62], ['배송', 0.44], ['해지 문의', 0.28], ['칭찬', 0.36]] as const;
function paintLive(c: Ctx2, w: number, h: number, v: { waiting: number; rate: number; wait: number; online: number; surge: boolean; cleared: boolean; hi: boolean; voc: boolean; bars: number; marked: boolean; t: number }) {
  c.fillStyle = v.surge ? '#2a0d12' : '#14122a';
  c.fillRect(0, 0, w, h);
  c.fillStyle = v.surge ? RED : PLUM;
  c.fillRect(0, 0, w, 44);
  text(c, v.voc ? '고객의 소리 이번 주' : v.surge ? '서비스 장애 · 콜 폭주' : `${CO} 고객센터 실시간 현황`, 14, 22, 24, '#ffffff');
  if (v.voc) {
    BARS.forEach(([s, e], i) => {
      const y = 62 + i * 52;
      text(c, s, 14, y + 16, 20, i === 4 ? AMBER_L : '#d6d0e6');
      c.fillStyle = '#2b2748';
      c.fillRect(130, y, w - 150, 32);
      c.fillStyle = i === 4 ? AMBER : VIOLET;
      c.fillRect(130, y, (w - 150) * e * clamp01(v.bars), 32);
    });
    if (v.marked) {
      c.strokeStyle = AMBER_L;
      c.lineWidth = 4;
      c.strokeRect(6, 56, w - 12, 46);
      text(c, '요금 안내 문구부터 고치기', w - 16, h - 16, 18, AMBER_L, 'right');
    }
    return;
  }
  // The number that matters, big.
  c.fillStyle = v.hi && !v.surge ? '#2b2748' : 'rgba(0,0,0,0)';
  c.fillRect(0, 44, w, 150);
  text(c, '대기 콜', 24, 66, 22, '#d6d0e6');
  const hot = v.waiting >= 12;
  text(c, `${v.waiting}`, 24, 130, 88, hot ? (Math.sin(v.t * 8) > 0 ? '#ff5252' : '#ff8a80') : v.waiting >= 6 ? AMBER : MINT);
  text(c, '응대율', w * 0.5, 66, 22, '#d6d0e6');
  text(c, `${v.rate.toFixed(1)}%`, w * 0.5, 130, 64, v.rate < 70 ? '#ff8a80' : v.rate < 85 ? AMBER : MINT);
  // The rate as a bar.
  c.fillStyle = '#2b2748';
  c.fillRect(24, 200, w - 48, 22);
  c.fillStyle = v.rate < 70 ? RED : VIOLET;
  c.fillRect(24, 200, (w - 48) * clamp01(v.rate / 100), 22);
  text(c, `평균 대기 ${v.wait}초`, 24, 250, 22, '#d6d0e6', 'left', false);
  text(c, `상담 중 ${v.online}명`, w * 0.5, 250, 22, '#d6d0e6', 'left', false);
  c.fillStyle = v.cleared ? '#1f5e2a' : '#1f1b3a';
  c.fillRect(14, 280, w - 28, 54);
  text(c, v.cleared ? '모두 고맙습니다. 대기 콜을 다 받았어요!' : v.surge ? '휴식 중인 분은 자리로 와 주세요' : '오늘의 칭찬: "끝까지 들어 주셔서 고마워요"', w / 2, 307, 20, v.cleared ? '#ffffff' : AMBER_L, 'center', false);
}
const STAFF_NAMES = ['윤', '서', '한', '민', '도', '하', '강', '류'];
function paintRoster(c: Ctx2, w: number, h: number, places: ReadonlyArray<readonly [number, number] | null>, hi: boolean, ticked: boolean) {
  c.fillStyle = '#f5f5f7';
  c.fillRect(0, 0, w, h);
  c.fillStyle = PLUM;
  c.fillRect(0, 0, w, 40);
  text(c, '오늘 배치', w / 2, 20, 22, '#ffffff', 'center');
  const cx = (col: number) => w / 2 + (col - 1) * (0.17 / CB.rosterW) * w;
  const cy = (row: number) => h / 2 - ((0.2 - row * 0.13) / CB.rosterH) * h;
  ['전화', '채팅', '휴식'].forEach((s, i) => {
    text(c, s, cx(i), 54, 16, i === 2 ? '#2e7d32' : PLUM, 'center');
    c.strokeStyle = hi ? VIOLET : '#c9c4d6';
    c.lineWidth = hi ? 2 : 1;
    c.strokeRect(cx(i) - 30, 66, 60, h - 110);
  });
  places.forEach((p, i) => {
    if (!p) return;
    const x = cx(p[0]);
    const y = cy(p[1]);
    c.fillStyle = p[0] === 2 ? '#a5d6a7' : AMBER;
    c.fillRect(x - 24, y - 15, 48, 30);
    text(c, STAFF_NAMES[wrap(i, STAFF_NAMES.length)], x, y, 18, INK, 'center');
  });
  if (ticked) text(c, '확정', w / 2, h - 22, 22, '#2e7d32', 'center');
  else text(c, '점심 교대 12:30', w / 2, h - 22, 15, GREY_D, 'center', false);
}
function callBoard(g: THREE.Group, out: Built) {
  // The low cabinet with its ledge, and the board on the wall above.
  part(g, box(1.94, 0.88, 0.2), PANEL_D, 0, 0.44, -0.38);
  part(g, box(1.98, 0.03, 0.3), GREY, 0, 0.925, -0.32, { outline: false });
  part(g, box(1.96, 1.0, 0.05), BLACK, 0, 1.42, -0.375, { outline: false });
  const live = liveScreen(g, CB.liveW, CB.liveH, 504, 352, CB.live[0], CB.live[1], CB.face);
  const roster = liveScreen(g, CB.rosterW, CB.rosterH, 224, 352, CB.roster[0], CB.roster[1], CB.face);
  label(g, `${CO} 고객센터`, 0.46, 0.07, -0.72, 1.96, -0.35, PLUM, '#ffffff');
  const beacon = ownLit(g, cyl(0.04, 0.05, 0.08, 12), '#5a2a2a', 0.86, 1.97, -0.37);
  // On the ledge: markers, a printed plan.
  part(g, box(0.22, 0.006, 0.16), PAPER, 0.34, 0.943, -0.28, { outline: false });
  part(g, cyl(0.03, 0.026, 0.09, 10), '#90a4ae', 0.1, 0.985, -0.3);
  const pad = tabletTool(g, 'csVocTablet');
  const mag = magnetTool(g);
  const tools: Partial<Record<CsTool, HeldTool>> = {
    tablet: { tool: pad.root, lead: 'left', grips: FLAT_LEFT },
    magnet: { tool: mag, lead: 'right', grips: { right: { at: v3(0, 0, -0.008), axis: v3(0, 1, 0), palm: v3(0, 0, -1), shape: 'pinch', radius: 0.012 } } },
  };
  const spots: Record<string, Spot> = {
    checkQueue: standAt(g, 'csQueue', -0.3, CB.stand),
    callSurge: standAt(g, 'csSurge', -0.3, CB.stand),
    callCenter_analyzeVoc: standAt(g, 'csVoc', -0.3, 0.3),
    callCenter_planStaffing: standAt(g, 'csStaff', CB.roster[0] - 0.05, CB.touch),
  };
  const show = (_now: string | null, N: CsNow | null, t: number) => {
    const n = N?.n ?? {};
    at(pad.root, N?.props.tablet ?? null, CB.tabletHome);
    at(mag, N?.tool === 'magnet' ? (N.props.magnet ?? null) : null);
    const surge = n.surge ?? 0;
    const inSurge = surge > 0.02;
    const F = floorNow(t);
    const fall = clamp01(n.fall);
    const waiting = inSurge ? Math.max(0, Math.round((46 - F.waiting) * (1 - fall) * surge + F.waiting)) : F.waiting;
    const rate = inSurge ? THREE.MathUtils.clamp(58 + 34 * fall + Math.sin(t) * 0.4, 0, 100) : F.rate;
    const wait = inSurge ? Math.round(230 * (1 - fall) + 14) : F.wait;
    const v = { waiting, rate, wait, online: inSurge ? F.online + Math.round(4 * clamp01((n.m1 ?? 0) + (n.m2 ?? 0))) : F.online, surge: inSurge, cleared: (n.cleared ?? 0) > 0.5, hi: (n.hi ?? 0) > 0.5, voc: (n.voc ?? 0) > 0.5, bars: clamp01(n.bars), marked: (n.marked ?? 0) > 0.5, t };
    const blink = v.waiting >= 12 ? Math.floor(t * 4) : 0;
    live.draw(`${v.waiting}|${q(v.rate, 5)}|${v.wait}|${v.online}|${v.surge ? 1 : 0}|${v.cleared ? 1 : 0}|${v.hi ? 1 : 0}|${v.voc ? 1 : 0}|${q(v.bars, 24)}|${v.marked ? 1 : 0}|${blink}`, (c) => paintLive(c, 504, 352, v));
    setLit(beacon, inSurge ? (Math.sin(t * 9) > 0 ? '#ff3b30' : '#6a1a1a') : '#5a2a2a');
    pad.screen.draw(`${q(n.bars, 8)}|${q(n.marked, 2)}`, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 256, 180);
      text(c, '고객 의견 묶음', 128, 18, 20, PLUM, 'center');
      ['요금 안내가 어려워요', '어르신도 쓰기 쉽게', '상담원이 친절했어요'].forEach((s, i) => {
        if (clamp01(n.bars) * 3 > i || !N) text(c, s, 12, 58 + i * 40, 17, i === 2 ? '#a0641e' : INK, 'left', false);
      });
    });
    // Who's where on the roster.
    const moved = (e: number | undefined, a: readonly [number, number], b: readonly [number, number]): readonly [number, number] | null => {
      const x = clamp01(e);
      return x > 0.04 && x < 0.96 ? null : x >= 0.96 ? b : a;
    };
    const places: Array<readonly [number, number] | null> = [
      [0, 0],
      moved(n.s3, [0, 1], [1, 1]),
      [0, 2],
      [1, 0],
      moved(n.s2, [1, 1], [0, 4]),
      moved(n.s1, [2, 0], [0, 3]),
      moved(n.m1, [2, 1], [0, 3]),
      moved(n.m2, [2, 2], [0, 4]),
    ];
    const rKey = places.map((p) => (p ? p.join('') : 'x')).join(',');
    roster.draw(`${rKey}|${q(n.hiRoster, 2)}|${q(n.ticked, 2)}`, (c) => paintRoster(c, 224, 352, places, (n.hiRoster ?? 0) > 0.5, (n.ticked ?? 0) > 0.5));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, CB.live[0], 1.3, CB.face);
}

// =============================================================================================
// 스크립트·FAQ 바인더 선반 (csFaqShelf, 2 × 1).

const BINDERS = ['요금', '결제', '해지', '배송', '앱 오류', '어르신 안내', '장애 공지', '응대 문구'];
const BINDER_COLORS = ['#7e57c2', '#26a69a', '#ef5350', '#ffa726', '#42a5f5', '#ec407a', '#78909c', '#9ccc65'];
function faqShelf(g: THREE.Group, out: Built) {
  const W = 1.9;
  part(g, box(W, 1.16, 0.02), WOOD, 0, 0.58, -0.46);
  for (const x of [-W / 2, 0, W / 2]) part(g, box(0.03, 1.16, 0.42), WOOD, x, 0.58, -0.26);
  for (const y of [0.04, 0.46, 0.84, 1.17]) part(g, box(W, 0.03, 0.42), WOOD, 0, y, -0.26);
  // The binders, labels on their spines. The one taken is the gap's owner.
  const taken: THREE.Object3D[] = [];
  for (const [ry, y] of [[0, 1.0], [1, 0.62], [2, 0.21]] as const) {
    for (let i = 0; i < 8; i++) {
      const x = -0.84 + i * 0.1 + (i >= 4 ? 0.12 : 0);
      if (ry === 2 && i > 5) continue;
      const k = (i + ry * 3) % BINDERS.length;
      const b = part(g, box(0.085, 0.3, 0.3), BINDER_COLORS[k], x + (ry === 0 ? 0.4 : 0), y, -0.2);
      const lb = label(g, BINDERS[k].slice(0, 3), 0.075, 0.06, x + (ry === 0 ? 0.4 : 0), y + 0.06, -0.049, '#ffffff', INK);
      if (ry === 0 && i === 3) taken.push(b, lb);
    }
  }
  for (let i = 0; i < 2; i++) part(g, box(0.34, 0.24, 0.3), '#ffffff', 0.44 + i * 0.03, 0.2 + i * 0.008, -0.22, { outline: false });
  label(g, '자주 묻는 질문 · 응대 스크립트', 0.9, 0.08, 0, 1.28, -0.44, PLUM, '#ffffff');
  part(g, box(0.92, 0.1, 0.02), PLUM, 0, 1.28, -0.456, { outline: false });
  part(g, cyl(0.05, 0.04, 0.08, 12), '#a1887f', 0.76, 1.225, -0.3);
  part(g, ball(0.08), '#66bb6a', 0.76, 1.33, -0.3);
  // The binder in the hand, open on two pages.
  const binder = group(g);
  binder.name = 'csBinder';
  const tilt = group(binder);
  tilt.rotation.x = -0.6;
  part(tilt, box(0.42, 0.29, 0.012), BINDER_COLORS[(3 + 0) % 8], 0, 0, 0, { outline: false });
  const pages = liveScreen(tilt, 0.4, 0.27, 340, 230, 0, 0, 0.008);
  const tools: Partial<Record<CsTool, HeldTool>> = { binder: { tool: binder, lead: 'left', grips: FLAT_LEFT } };
  const spots: Record<string, Spot> = { csLookup: standAt(g, 'csLookup', -0.08, FQ.stand) };
  const show = (_now: string | null, N: CsNow | null) => {
    const n = N?.n ?? {};
    at(binder, N?.tool === 'binder' ? (N.props.binder ?? null) : null);
    for (const m of taken) m.visible = N?.tool !== 'binder';
    if (N?.tool !== 'binder') return;
    const page = clamp01(n.page);
    const round = wrap(N.b.n, 3);
    pages.draw(`${q(page, 2)}|${q(n.hi, 2)}|${round}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 340, 230);
      c.fillStyle = '#c9c4d6';
      c.fillRect(168, 0, 4, 230);
      const heads = [['1. 첫인사', '2. 공감 먼저'], ['3. 복창 확인', '4. 끝인사'], ['화난 고객 응대', '통화 종료 기준']][page > 0.5 ? wrap(round + 1, 3) : round];
      heads.forEach((s, i) => {
        const x = 12 + i * 172;
        text(c, s, x, 20, 17, PLUM);
        ['"먼저 불편을 드려 죄송합니다"', '"제가 끝까지 도와드릴게요"', '"말씀하신 내용 확인할게요"', '"더 궁금하신 점 있으세요?"'].forEach((l, j) => text(c, l.slice(0, 14), x, 54 + j * 42, 12, GREY_D, 'left', false));
      });
      if ((n.hi ?? 0) > 0.5) {
        c.fillStyle = 'rgba(255,224,90,0.6)';
        c.fillRect(182, 84, 150, 22);
      }
    });
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, FQ.slot[0], FQ.slot[1], FQ.slot[2]);
}

// =============================================================================================
// 슈퍼바이저 청취석 (csSupervisorDesk, 2 × 1).

const AGENTS = ['윤*미', '서*현', '한*솔', '민*지', '도*영', '하*린', '강*우', '류*아', '최*나', '이*준', '박*별', '정*온'];
function supervisorDesk(g: THREE.Group, out: Built) {
  const T = SV.top;
  deskTop(g, 1.94, T);
  part(g, box(1.94, 0.5, 0.03), PANEL_D, 0, T + 0.25, -0.46);
  chair(g, SV.seat, '#37474f');
  const wall = monitor(g, [-0.42, 1.09, -0.2], 0.72, 0.36, T, 432, 216);
  const calls = monitor(g, [0.42, 1.09, -0.2], 0.72, 0.36, T, 432, 216);
  keyboard(g, SV.keys, 0.3);
  mouse(g, SV.mouse, T);
  // The whisper key with its own lamp.
  part(g, rbox(0.1, 0.03, 0.1, 0.008), GRAPHITE, SV.whisper[0], T + 0.015, SV.whisper[2], { outline: false });
  const key = ownLit(g, rbox(0.06, 0.012, 0.06, 0.004), '#7a2e2e', SV.whisper[0], T + 0.034, SV.whisper[2]);
  label(g, '귓속말', 0.09, 0.024, SV.whisper[0], T + 0.05, SV.whisper[2] - 0.065, PLUM, '#ffffff');
  part(g, box(0.16, 0.006, 0.22), PAPER, SV.note[0], T + 0.003, SV.note[2], { outline: false });
  const noted = [0, 1, 2].map((i) => part(g, box(0.1, 0.001, 0.003), GREY_D, SV.note[0], T + 0.0065, SV.note[2] - 0.05 + i * 0.04, { outline: false }));
  mug(g, -0.76, T, 0.08);
  const parked = parkedHeadset(g, 0.78, T, -0.06);
  const worn = headset(g, '#37474f');
  worn.visible = false;
  const pen = penTool(g);
  const tools: Partial<Record<CsTool, HeldTool>> = { pen: penHeld(pen) };
  const spots: Record<string, Spot> = { csListenIn: seatAt(g, 'csListenIn', SV.seat) };
  const show = (_now: string | null, N: CsNow | null, t: number, H: number) => {
    const n = N?.n ?? {};
    wearing(worn, parked, (n.hs ?? 0) > 0.5, SV.seat, N, H);
    at(pen, N?.props.pen ?? null, [SV.note[0] + 0.1, T + 0.02, SV.note[2] - 0.09]);
    const note = clamp01(n.noted);
    noted.forEach((m, i) => (m.visible = !!N && note > (i + 0.3) / 3));
    const whisper = (n.whisper ?? 0) > 0.5;
    setLit(key, whisper ? '#ff5252' : '#7a2e2e');
    const agent = wrap(n.agent ?? 3, AGENTS.length);
    const picked = (n.picked ?? 0) > 0.5;
    const tick = Math.floor(t * 0.7);
    wall.draw(`${tick}|${agent}|${picked ? 1 : 0}`, (c) => {
      const w = 432;
      const h = 216;
      c.fillStyle = INK;
      c.fillRect(0, 0, w, h);
      text(c, '상담원 현황', 8, 14, 15, '#ffffff');
      const rnd = seeded(1 + wrap(tick, 97) * 13);
      AGENTS.forEach((s, i) => {
        const x = 8 + (i % 4) * 106;
        const y = 32 + Math.floor(i / 4) * 60;
        const r = rnd();
        const on = picked && i === agent;
        const color = r < 0.62 ? '#2e7d32' : r < 0.85 ? '#f9a825' : '#546e7a';
        c.fillStyle = on ? PLUM : '#23233a';
        c.fillRect(x, y, 100, 52);
        c.fillStyle = on ? MINT : color;
        c.beginPath();
        c.arc(x + 12, y + 14, pos(5), 0, Math.PI * 2);
        c.fill();
        text(c, s, x + 24, y + 14, 14, '#ffffff', 'left', false);
        text(c, on ? '청취 중' : r < 0.62 ? '통화' : r < 0.85 ? '후처리' : '휴식', x + 12, y + 37, 12, '#c9d6e3', 'left', false);
      });
    });
    const liveOn = (n.live ?? 0) > 0.5;
    const calm = clamp01(n.calm);
    calls.draw(`${liveOn ? Math.floor(t * 5) : 0}|${agent}|${whisper ? 1 : 0}|${q(calm, 4)}`, (c) => {
      const w = 432;
      const h = 216;
      c.fillStyle = '#f4f1f9';
      c.fillRect(0, 0, w, h);
      c.fillStyle = PLUM;
      c.fillRect(0, 0, w, 28);
      text(c, liveOn ? `${AGENTS[agent]} 상담원 청취` : '청취 대기', 8, 14, 15, '#ffffff');
      if (liveOn) {
        text(c, '고객', 10, 56, 13, GREY_D);
        waveform(c, 50, 38, w - 60, 38, agent + Math.floor(t * 5) * 0.3, 0.8 - 0.4 * calm, 1, calm > 0.5 ? VIOLET : RED);
        text(c, '상담원', 6, 104, 13, GREY_D);
        waveform(c, 50, 86, w - 60, 38, agent + 5 + Math.floor(t * 5) * 0.4, 0.5, 1, GREEN);
      }
      if (whisper) {
        c.fillStyle = '#fff3c9';
        c.fillRect(10, 136, w - 20, 66);
        text(c, '귓속말 (상담원만 들어요)', 20, 152, 14, '#a0641e');
        text(c, '"잘하고 있어요. 복구 일정부터 알려 드려요."', 20, 180, 14, INK, 'left', false);
      } else if (calm > 0.5) text(c, '고객 목소리가 가라앉았어요', 14, 170, 16, '#2e7d32');
    });
  };
  show(null, null, 0, 1.6);
  drive(g, out, spots, tools, show);
  out.work = marker(g, SV.keys[0], SV.keys[1], SV.keys[2]);
}

// =============================================================================================
// 상담 교육실 세트 (csRolePlaySet, 3 × 1): a low phrase board, two small phone tables.

const PHRASES = ['고객: "대체 몇 번을 전화해야 해요!"', '상담원: "많이 답답하셨겠어요."', '고객: "...언제 되는데요?"', '좋았어요! 공감 다음에 일정'];
function rolePlaySet(g: THREE.Group, out: Built) {
  // The board, kept below the eye so it hides nobody behind.
  part(g, box(2.7, 1.04, 0.04), WHITE, 0, 0.92, -0.42);
  part(g, box(2.76, 0.04, 0.08), GREY, 0, 0.4, -0.4, { outline: false });
  for (const x of [-1.34, 1.34]) part(g, box(0.05, 1.42, 0.05), GREY_D, x, 0.71, -0.42, { outline: false });
  const board = liveScreen(g, 2.6, 0.96, 720, 266, 0, 0.92, -0.397);
  // The caller's small table.
  const table = (x: number, z: number) => {
    part(g, rbox(0.46, 0.03, 0.34, 0.01), WOOD, x, 0.785, z);
    part(g, cyl(0.022, 0.03, 0.76, 8), CHROME, x, 0.385, z, { outline: false });
    part(g, cyl(0.17, 0.19, 0.02, 12), GREY_D, x, 0.01, z, { outline: false });
    part(g, rbox(0.17, 0.05, 0.14, 0.015), '#eceff1', x, 0.825, z);
  };
  table(RP.cradle[0], RP.cradle[2]);
  table(0.36, 0.28);
  // A trainee's stool and a headset; the card rack for the scenes.
  part(g, cyl(0.17, 0.17, 0.05, 14), LILAC, RP.traineeSeat[0], RP.traineeSeat[1] - 0.025, RP.traineeSeat[2]);
  part(g, cyl(0.024, 0.03, RP.traineeSeat[1] - 0.05, 8), CHROME, RP.traineeSeat[0], (RP.traineeSeat[1] - 0.05) / 2, RP.traineeSeat[2], { outline: false });
  part(g, cyl(0.18, 0.19, 0.02, 14), GREY_D, RP.traineeSeat[0], 0.01, RP.traineeSeat[2], { outline: false });
  part(g, box(0.24, 0.006, 0.17), AMBER_L, RP.cradle[0] + 0.1, 0.805, RP.cradle[2] + 0.06, { rx: 0.05, outline: false });
  const down = part(g, cyl(0.015, 0.015, 0.2, 10), '#eceff1', RP.cradle[0], RP.cradle[1] - 0.005, RP.cradle[2], { rz: Math.PI / 2, outline: false });
  const hand = handsetTool(g);
  const tools: Partial<Record<CsTool, HeldTool>> = { handset: { tool: hand, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.016 } } } };
  // The trainee, on the far end of the pretend line.
  const trainee = person(g, '#b39ddb', '#37474f', '#3e2723', RP.traineeSeat[0], RP.traineeSeat[2], -Math.PI / 2 - 0.12, 'female', RP.traineeSeat[1]);
  trainee.root.visible = true;
  const theirPhone = handsetTool(g, '#cfd8dc');
  theirPhone.name = 'csTraineeHandset';
  const ear = new THREE.Vector3();
  const lap = new THREE.Vector3();
  const spots: Record<string, Spot> = { csRolePlay: standAt(g, 'csRolePlay', RP.stand[0], RP.stand[1]) };
  const show = (_now: string | null, N: CsNow | null, t: number) => {
    const n = N?.n ?? {};
    const inHand = N?.tool === 'handset';
    at(hand, inHand ? (N?.props.handset ?? null) : null);
    down.visible = !inHand;
    const line = N ? Math.round(n.line ?? -1) : -1;
    const score = clamp01(n.score);
    board.draw(`${line}|${q(score, 2)}`, (c) => {
      const w = 720;
      const h = 266;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      text(c, `${CO} 상담 교육 · 역할극`, 16, 24, 26, PLUM);
      text(c, '쿠션 언어: "많이 불편하셨겠어요" "확인해 드릴게요"', w - 16, 24, 16, GREY_D, 'right', false);
      PHRASES.forEach((s, i) => {
        const on = i === line;
        c.fillStyle = on ? '#fff3c9' : '#f4f1f9';
        c.fillRect(16, 52 + i * 50, w - 32, 42);
        text(c, s, 28, 73 + i * 50, 22, on ? INK : GREY_D, 'left', on);
      });
      if (score > 0.5) text(c, '★ 참 잘했어요', w - 28, 223, 26, RED, 'right');
    });
    const onPhone = (n.trainPhone ?? 0) > 0.5;
    ear.set(RP.traineeSeat[0] - 0.08, 1.08, RP.traineeSeat[2] - 0.12);
    trainee.armR(onPhone ? ear : null);
    theirPhone.visible = onPhone;
    if (onPhone) theirPhone.position.copy(ear);
    if ((n.trainTalks ?? 0) > 0.5) {
      lap.set(RP.traineeSeat[0] - 0.3, 0.86 + 0.03 * Math.sin(t * 3), RP.traineeSeat[2] + 0.1);
      trainee.armL(lap);
    } else trainee.armL(null);
    nodHead(trainee, (n.trainLaugh ?? 0) > 0.5 ? 0.14 * Math.sin(t * 10) : (n.trainNods ?? 0) > 0.5 ? 0.14 + 0.1 * Math.sin(t * 5) : 0.06);
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, RP.cradle[0], RP.cradle[1], RP.cradle[2]);
}

// =============================================================================================
// 조용한 상담 부스 (csQuietBooth, 2 × 2): foam walls, a glass door, a soft lamp, tissues and a small plant.

function foam(c: Ctx2) {
  c.fillStyle = '#6f6a86';
  c.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      c.fillStyle = (x + y) % 2 ? '#7d7893' : '#625d78';
      c.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
    }
}
function quietBooth(g: THREE.Group, out: Built) {
  const Hb = 2.12;
  const T = QB.top;
  part(g, box(1.96, 0.06, 1.92), '#4a4660', 0, 0.03, -0.02);
  const foamTex = painted('csFoam', 128, 128, foam);
  // The back wall, and the sides up to the shoulder so the dweller shows from the room.
  part(g, box(1.96, Hb, 0.06), '#4a4660', 0, Hb / 2, -0.97);
  picture(g, foamTex, 1.86, 1.9, 0, 1.05, -0.935);
  for (const sx of [-1, 1]) {
    part(g, box(0.06, 1.2, 1.9), '#4a4660', sx * 0.95, 0.6, -0.02);
    picture(g, foamTex, 1.8, 1.1, sx * 0.915, 0.62, -0.02, '#ffffff', -sx * Math.PI / 2);
    haze(g, new THREE.PlaneGeometry(1.9, Hb - 1.2), '#cfe3f0', 0.16, sx * 0.95, (Hb + 1.2) / 2, -0.02).rotation.y = Math.PI / 2;
  }
  // The frame.
  for (const [x, z] of [[-0.95, 0.92], [0.95, 0.92], [-0.95, -0.95], [0.95, -0.95], [-0.42, 0.92], [0.36, 0.92]] as const) part(g, box(0.05, Hb, 0.05), GRAPHITE, x, Hb / 2, z, { outline: false });
  part(g, box(1.96, 0.05, 0.05), GRAPHITE, 0, Hb, 0.92, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.05, 0.05, 1.9), GRAPHITE, sx * 0.95, Hb, -0.02, { outline: false });
  part(g, box(1.9, 0.05, 0.05), GRAPHITE, 0, Hb, -0.95, { outline: false });
  // Glass either side of the door, and the door on its hinge.
  haze(g, new THREE.PlaneGeometry(0.5, Hb), '#cfe3f0', 0.15, -0.68, Hb / 2, 0.92);
  haze(g, new THREE.PlaneGeometry(0.56, Hb), '#cfe3f0', 0.15, 0.65, Hb / 2, 0.92);
  label(g, '조용한 상담실', 0.46, 0.08, 0.65, 1.9, 0.935, PLUM, '#ffffff');
  const door = group(g, -0.42, 0, QB.doorZ);
  haze(door, new THREE.PlaneGeometry(0.76, Hb - 0.06), '#d8ecf7', 0.2, 0.39, Hb / 2, 0);
  for (const y of [0.03, Hb - 0.06]) part(door, box(0.78, 0.03, 0.02), GRAPHITE, 0.39, y, 0, { outline: false });
  part(door, box(0.02, Hb - 0.06, 0.02), GRAPHITE, 0.77, Hb / 2, 0, { outline: false });
  part(door, cyl(0.012, 0.012, 0.2, 8), CHROME, 0.72, 1.02, 0.04, { outline: false });
  // The desk, a monitor, keys, tissues, a small plant, and a note left there by someone.
  part(g, rbox(1.84, 0.04, 0.54, 0.01), '#e9e3d8', 0, T - 0.02, -0.67);
  part(g, box(0.05, T - 0.04, 0.48), GREY_D, -0.84, (T - 0.04) / 2, -0.67, { outline: false });
  part(g, box(0.05, T - 0.04, 0.48), GREY_D, 0.84, (T - 0.04) / 2, -0.67, { outline: false });
  const scr = monitor(g, [0, 1.09, -0.76], 0.56, 0.32, T, 360, 206);
  keyboard(g, QB.keys, 0.3);
  mouse(g, [0.2, T, QB.keys[2]], T);
  part(g, rbox(0.2, 0.07, 0.11, 0.015), '#f8bbd0', QB.tissue[0], T + 0.035, QB.tissue[2]);
  part(g, box(0.06, 0.03, 0.03), WHITE, QB.tissue[0], T + 0.08, QB.tissue[2], { outline: false });
  part(g, cyl(0.04, 0.034, 0.07, 10), '#a1887f', 0.56, T + 0.035, -0.74);
  part(g, ball(0.07), '#81c784', 0.56, T + 0.13, -0.74);
  label(g, '혼자가 아니에요. 팀장님 내선 200', 0.5, 0.06, -0.48, T + 0.5, -0.925, '#fff9c4', '#5d4a10');
  chair(g, QB.seat, '#6d5a8e');
  // The soft lamp in the frame: warm while there's a call.
  const lampBar = ownLit(g, box(0.5, 0.025, 0.1), '#8a8070', 0, Hb - 0.05, -0.55);
  const parked = parkedHeadset(g, 0.32, T, -0.76);
  const worn = headset(g);
  worn.visible = false;
  const spots: Record<string, Spot> = { csHardCall: seatAt(g, 'csHardCall', QB.seat) };
  const show = (_now: string | null, N: CsNow | null, t: number, H: number) => {
    const n = N?.n ?? {};
    door.rotation.y = clamp01(n.door) * DOOR_SWING;
    wearing(worn, parked, (n.hs ?? 0) > 0.5, QB.seat, N, H);
    setLit(lampBar, N ? '#ffe2a8' : '#8a8070');
    const live = (n.live ?? 0) > 0.5;
    const loud = clamp01(n.loud);
    const rule = (n.rule ?? 0) > 0.5;
    const after = clamp01(n.after);
    const form = clamp01(n.form);
    scr.draw(`${live ? Math.floor(t * 5) : 0}|${q(loud, 4)}|${rule ? 1 : 0}|${q(after, 8)}|${q(form, 20)}|${N ? 1 : 0}`, (c) => {
      const w = 360;
      const h = 206;
      c.fillStyle = '#f2eff7';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#4a4660';
      c.fillRect(0, 0, w, 26);
      text(c, '조용한 상담실', 8, 13, 14, '#ffffff');
      if (!N) return text(c, '비어 있음', w / 2, h / 2, 22, GREY_D, 'center');
      if (after > 0.05) {
        c.globalAlpha = after;
        c.fillStyle = '#fff3c9';
        c.fillRect(14, 40, w - 28, 148);
        text(c, '윤친절 팀장의 쪽지', 28, 62, 15, '#a0641e');
        text(c, '힘든 통화 받아 줘서 고마워요.', 28, 96, 17, INK, 'left', false);
        text(c, '차 한잔 하고 천천히 와요.', 28, 124, 17, INK, 'left', false);
        text(c, '오늘 이 콜은 평가에서 뺐어요.', 28, 152, 14, GREY_D, 'left', false);
        c.globalAlpha = 1;
        return;
      }
      text(c, live ? '통화 중 · 이*호 고객님' : '심호흡 한 번, 준비되면 받아요', 10, 42, 15, INK);
      c.fillStyle = '#e4dcf0';
      c.fillRect(8, 56, w - 16, 44);
      if (live) waveform(c, 12, 58, w - 24, 40, Math.floor(t * 5) * 0.33, loud, 1, loud > 0.6 ? RED : VIOLET);
      text(c, typed('장애 복구 일정 안내, 불편 사항 기록', form), 10, 116, 13, INK, 'left', false);
      if (rule) {
        c.fillStyle = '#e8f1e4';
        c.fillRect(8, 134, w - 16, 62);
        c.strokeStyle = GREEN;
        c.strokeRect(8, 134, w - 16, 62);
        text(c, '상담원 보호 안내', 16, 150, 13, '#2e7d32');
        text(c, '욕설이 계속되면 안내 후 통화를 끝낼 수 있어요.', 16, 176, 13, INK, 'left', false);
      }
    });
  };
  show(null, null, 0, 1.6);
  drive(g, out, spots, {}, show);
  out.work = marker(g, QB.keys[0], QB.keys[1], QB.keys[2]);
}

// =============================================================================================
// 차 코너 (csTeaCorner, 2 × 1).

function teaCorner(g: THREE.Group, out: Built) {
  const C = TE.counter;
  part(g, box(1.92, C - 0.04, 0.58), '#ece4d6', 0, (C - 0.04) / 2, -0.17);
  for (const x of [-0.48, 0.48]) part(g, box(0.9, C - 0.16, 0.012), '#ddd2c0', x, (C - 0.04) / 2, 0.126, { outline: false });
  part(g, rbox(1.96, 0.04, 0.66, 0.01), WOOD, 0, C - 0.02, -0.14);
  // The hot water dispenser; the spout comes forward over the cup; the button by the left hand.
  const dx = TE.under[0] - 0.06;
  part(g, rbox(0.34, 0.5, 0.3, 0.03), WHITE, dx, C + 0.25, -0.26);
  part(g, box(0.2, 0.08, 0.02), '#37474f', dx, C + 0.4, -0.105, { outline: false });
  label(g, '뜨거운 물 95도', 0.18, 0.05, dx, C + 0.4, -0.094, '#37474f', '#ffcc80');
  part(g, box(0.05, 0.03, 0.14), GREY_D, TE.under[0], C + 0.2, -0.05, { outline: false });
  part(g, cyl(0.012, 0.012, 0.03, 8), CHROME, TE.under[0], C + 0.175, TE.under[2] - 0.01, { outline: false });
  const btn = ownLit(g, cyl(0.022, 0.022, 0.01, 12), '#b71c1c', TE.button[0], TE.button[1], TE.button[2]);
  btn.rotation.x = Math.PI / 2;
  part(g, box(0.1, 0.06, 0.03), '#ece4d6', TE.button[0], TE.button[1], TE.button[2] - 0.02, { outline: false });
  part(g, box(0.28, 0.012, 0.16), GREY, TE.under[0], C + 0.006, TE.under[2], { outline: false });
  const stream = ownLit(g, cyl(0.004, 0.004, 0.1, 6), '#cfeaf7', TE.under[0], C + 0.11, TE.under[2] - 0.01);
  // Tea tins, a stack of cups, mugs on a tray, biscuits, a note.
  [['둥굴레', '#a1887f'], ['보리차', '#ffb74d'], ['캐모마일', '#fff176']].forEach(([s, col], i) => {
    part(g, cyl(0.05, 0.05, 0.13, 12), col, TE.tea[0] - 0.02 + i * 0.13 - 0.07, C + 0.065, -0.22);
    label(g, s, 0.09, 0.036, TE.tea[0] - 0.02 + i * 0.13 - 0.07, C + 0.07, -0.168, '#ffffff', INK);
  });
  part(g, box(0.15, 0.04, 0.1), AMBER_L, TE.tea[0], C + 0.02, TE.tea[2]);
  for (let i = 0; i < 7; i++) part(g, cyl(0.036, 0.028, 0.03, 12), i === 6 ? WHITE : '#f1eef8', TE.cupStack[0], C + 0.018 + i * 0.016, TE.cupStack[2], { outline: false });
  mug(g, 0.66, C, -0.26, '#c5cae9');
  mug(g, 0.78, C, -0.26, '#f8bbd0');
  mug(g, 0.72, C, -0.14, '#c8e6c9');
  part(g, cyl(0.1, 0.09, 0.03, 16), '#d7ccc8', 0.78, C + 0.015, 0.02);
  for (let i = 0; i < 4; i++) part(g, cyl(0.022, 0.022, 0.01, 10), '#d4a373', 0.78 + Math.cos(i * 1.6) * 0.04, C + 0.036, 0.02 + Math.sin(i * 1.6) * 0.04, { outline: false });
  // The wall behind: a shelf of cups, and the note.
  part(g, box(1.92, 0.02, 0.2), WOOD, 0.2, 1.62, -0.38);
  for (let i = 0; i < 5; i++) part(g, cyl(0.04, 0.036, 0.09, 12), ['#c5cae9', '#ffe0b2', '#c8e6c9', '#f8bbd0', '#d1c4e9'][i], -0.4 + i * 0.26, 1.675, -0.38);
  label(g, '오늘도 고생 많았어요. 쉬었다 가요', 0.84, 0.09, 0.3, 1.32, -0.44, '#fff9c4', '#6b4a10');
  part(g, box(0.88, 0.1, 0.01), '#e6dcc0', 0.3, 1.32, -0.448, { outline: false });
  const cup = cupTool(g);
  const bag = group(g);
  bag.name = 'csTeaBag';
  part(bag, box(0.035, 0.045, 0.01), '#d7ba8e', 0, 0, 0, { outline: false });
  const steam = haze(g, new THREE.PlaneGeometry(0.06, 0.14), '#ffffff', 0.32, 0, 0, 0);
  const tools: Partial<Record<CsTool, HeldTool>> = { cup: { tool: cup.root, lead: 'right', grips: { right: { at: v3(0, -0.005, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.034 } } } };
  const spots: Record<string, Spot> = { csTea: standAt(g, 'csTea', 0.16, TE.stand) };
  const show = (_now: string | null, N: CsNow | null, t: number) => {
    const n = N?.n ?? {};
    const inHand = N?.tool === 'cup';
    at(cup.root, inHand ? (N?.props.cup ?? null) : null);
    at(bag, N?.props.teaBag ?? null);
    const w = clamp01(n.water);
    cup.water.visible = w > 0.3;
    cup.water.position.y = -0.03 + 0.066 * w;
    cup.tag.visible = (n.bag ?? 0) > 0.5;
    stream.visible = (n.pouring ?? 0) > 0.5;
    setLit(btn, (n.pouring ?? 0) > 0.5 ? '#ff5252' : '#b71c1c');
    const showSteam = inHand && (n.steam ?? 0) > 0.5;
    steam.visible = showSteam;
    if (showSteam && N?.props.cup) {
      const p = N.props.cup;
      steam.position.set(p[0], p[1] + 0.12 + 0.012 * Math.sin(t * 2), p[2]);
      (steam.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.1 * Math.sin(t * 1.7) ** 2;
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, TE.under[0], TE.under[1], TE.under[2]);
}

// =============================================================================================
// 안마 의자 (csRestChair, 1 × 1): the back reclines and the foot rest comes up as the dweller lies back.

function restChair(g: THREE.Group, out: Built) {
  const SEAT = RC.seat[1];
  const C1 = '#5d4f7a';
  const C2 = '#7a6a9c';
  // A warm low mat, so the place reads as a place apart.
  part(g, rbox(0.88, 0.016, 1.3, 0.02), LILAC, 0, 0.01, 0.34, { outline: false });
  part(g, rbox(0.66, SEAT - 0.08, 0.72, 0.06), C1, 0, (SEAT - 0.08) / 2 + 0.02, RC.seat[2] - 0.08);
  part(g, rbox(0.52, 0.09, 0.54, 0.04), C2, 0, SEAT - 0.045, RC.seat[2]);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.14, 0.32, 0.66, 0.05), C1, sx * 0.34, SEAT + 0.08, RC.seat[2] - 0.02);
    part(g, rbox(0.11, 0.05, 0.46, 0.02), C2, sx * 0.34, SEAT + 0.26, RC.seat[2] + 0.03);
  }
  const back = group(g, 0, SEAT, -0.02);
  part(back, rbox(0.56, 0.86, 0.2, 0.08), C1, 0, 0.42, -0.08);
  part(back, rbox(0.42, 0.72, 0.05, 0.03), C2, 0, 0.42, 0.03);
  part(back, rbox(0.3, 0.18, 0.1, 0.05), C2, 0, 0.84, 0.0);
  const nodes = [0, 1, 2, 3].map((i) => part(back, ball(0.03), '#a99ccb', i % 2 ? 0.07 : -0.07, 0.2, 0.06, { outline: false }));
  const rest = group(g, 0, SEAT - 0.08, RC.seat[2] + 0.26);
  part(rest, rbox(0.44, 0.46, 0.14, 0.05), C1, 0, -0.23, 0);
  part(rest, rbox(0.34, 0.38, 0.04, 0.02), C2, 0, -0.23, 0.07);
  const timer = liveScreen(g, 0.16, 0.08, 96, 48, 0.34, SEAT + 0.2, RC.seat[2] + 0.31);
  part(g, box(0.17, 0.09, 0.01), BLACK, 0.34, SEAT + 0.2, RC.seat[2] + 0.304, { outline: false });
  // A small table by it with a cup of water, and a low warm lamp.
  part(g, cyl(0.14, 0.14, 0.02, 14), WOOD, 0.49, 0.56, -0.28);
  part(g, cyl(0.016, 0.02, 0.56, 8), GREY, 0.49, 0.28, -0.28, { outline: false });
  part(g, cyl(0.03, 0.026, 0.08, 10), WHITE, 0.46, 0.61, -0.26);
  const lampGlow = ownLit(g, ball(0.06), '#c4b08a', 0.5, 0.66, -0.34);
  const remote = remoteTool(g);
  const tools: Partial<Record<CsTool, HeldTool>> = { remote: { tool: remote, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.02 } } } };
  const spots: Record<string, Spot> = { csRest: seatAt(g, 'csRest', RC.seat, 0) };
  const show = (_now: string | null, N: CsNow | null, t: number) => {
    const n = N?.n ?? {};
    at(remote, N?.props.remote ?? null, RC.remoteHome);
    const rc = clamp01(n.recline);
    back.rotation.x = -0.14 - 0.42 * rc;
    rest.rotation.x = -(0.55 + 0.75 * (N ? 0.35 + 0.65 * rc : 0));
    const on = (n.running ?? 0) > 0.5;
    nodes.forEach((m, i) => (m.position.y = 0.2 + (on ? 0.14 * (1 + Math.sin(t * 1.6 + i * 1.57)) : i * 0.14)));
    setLit(lampGlow, N ? '#ffd9a0' : '#c4b08a');
    const left = Math.max(0, Math.ceil(5 * (1 - clamp01(n.timer))));
    timer.draw(`${on ? 1 : 0}|${left}`, (c) => {
      c.fillStyle = '#10141a';
      c.fillRect(0, 0, 96, 48);
      text(c, on ? `쉼 ${left}분` : '쉼터', 48, 24, 22, on ? MINT : '#9aa3ad', 'center');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, RC.remoteHome[0], RC.remoteHome[1], RC.remoteHome[2]);
}

// =============================================================================================
// Set dressing.

const THANKS = ['덕분에 해결했어요!', '목소리가 참 따뜻하셨어요', '우리 엄마 도와주셔서 감사', '끝까지 들어 줘서 고마워요', '친절 상담 최고예요', '기다린 보람이 있었어요', '어려운 걸 쉽게 알려 주셨어요', '다음에도 이분이면 좋겠어요'];
function thanksWall(g: THREE.Group) {
  part(g, box(1.9, 1.2, 0.04), WOOD, 0, 1.42, -0.42);
  picture(g, painted('csThanksWall', 512, 324, (c) => {
    c.fillStyle = '#d9bd94';
    c.fillRect(0, 0, 512, 324);
    const rnd = seeded(77);
    c.fillStyle = PLUM;
    c.fillRect(0, 0, 512, 42);
    text(c, '고객님이 남긴 고마운 말', 256, 22, 24, '#ffffff', 'center');
    THANKS.forEach((s, i) => {
      const x = 14 + (i % 4) * 124;
      const y = 54 + Math.floor(i / 2 / 2) * 132 + (i % 2) * 8;
      c.save();
      c.translate(x + 56, y + 56);
      c.rotate((rnd() - 0.5) * 0.12);
      c.fillStyle = ['#fff59d', '#f8bbd0', '#c8e6c9', '#bbdefb'][i % 4];
      c.fillRect(-56, -54, 112, 108);
      c.fillStyle = RED;
      c.beginPath();
      c.arc(0, -46, pos(5), 0, Math.PI * 2);
      c.fill();
      const half = Math.ceil(s.length / 2);
      text(c, s.slice(0, half), 0, -8, 14, INK, 'center', false);
      text(c, s.slice(half), 0, 14, 14, INK, 'center', false);
      c.restore();
    });
  }), 1.82, 1.14, 0, 1.42, -0.397);
  // A little bench under it with a stack of blank cards.
  part(g, box(1.4, 0.05, 0.28), WOOD, 0, 0.72, -0.32);
  for (const sx of [-0.6, 0.6]) part(g, box(0.05, 0.72, 0.24), GREY_D, sx, 0.36, -0.32, { outline: false });
  part(g, box(0.16, 0.03, 0.12), '#fff59d', -0.2, 0.76, -0.3, { outline: false });
  part(g, cyl(0.04, 0.04, 0.1, 10), GREY, 0.2, 0.795, -0.3);
  part(g, ball(0.06), PINK, 0.54, 0.82, -0.32);
}
function centerSign(g: THREE.Group) {
  part(g, cyl(0.2, 0.22, 0.03, 18), GREY_D, 0, 0.015, 0, { outline: false });
  part(g, cyl(0.022, 0.022, 1.0, 10), GREY, 0, 0.52, 0, { outline: false });
  part(g, box(0.62, 0.72, 0.03), PLUM, 0, 1.36, 0);
  picture(g, painted('csSign', 192, 224, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 192, 224);
    c.fillStyle = PLUM;
    c.fillRect(0, 0, 192, 60);
    text(c, CO, 96, 22, 26, '#ffffff', 'center');
    text(c, '고객센터', 96, 46, 15, AMBER_L, 'center');
    ['상담실 ↑ 왼쪽 문', '품질·교육실 ↑ 오른쪽 문', '쉼터 ← 이쪽', '상담원도 누군가의', '소중한 가족입니다'].forEach((s, i) => text(c, s, 12, 84 + i * 28, i > 2 ? 14 : 13, i > 2 ? PLUM : BLACK, 'left', i > 2));
  }), 0.56, 0.66, 0, 1.36, 0.018);
}

export const BUILDERS: Record<string, Builder> = {
  callBooth(g, _W, _D, _c, _def, _ctx, out) {
    callBooth(g, out);
  },
  qaDesk(g, _W, _D, _c, _def, _ctx, out) {
    qaDesk(g, out);
  },
  callBoard(g, _W, _D, _c, _def, _ctx, out) {
    callBoard(g, out);
  },
  csTeamDesk(g, _W, _D, _c, _def, _ctx, out) {
    teamDesk(g, out);
  },
  csFaqShelf(g, _W, _D, _c, _def, _ctx, out) {
    faqShelf(g, out);
  },
  csSupervisorDesk(g, _W, _D, _c, _def, _ctx, out) {
    supervisorDesk(g, out);
  },
  csRolePlaySet(g, _W, _D, _c, _def, _ctx, out) {
    rolePlaySet(g, out);
  },
  csQuietBooth(g, _W, _D, _c, _def, _ctx, out) {
    quietBooth(g, out);
  },
  csTeaCorner(g, _W, _D, _c, _def, _ctx, out) {
    teaCorner(g, out);
  },
  csRestChair(g, _W, _D, _c, _def, _ctx, out) {
    restChair(g, out);
  },
  csThanksWall(g) {
    thanksWall(g);
  },
  csCenterSign(g) {
    centerSign(g);
  },
};
