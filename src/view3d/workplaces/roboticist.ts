import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, seeded, text } from './doctor';
import { AB, AC, BR, CD, PR, QC, RL_LIVE, ROUTE, SS, armPose, frac, jointAt, onBoard, placeAt, quadGround, quadPose, rlNow, rlPhase, servePose } from './roboticistMotion';
import type { RlMotion, RlNow, RlTool } from './roboticistMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 로봇 연구소 drawn as itself (2026-11-01, a new career at the user's request), the lab of a made-up company, 한걸음로보틱스.
 * The robots are the stars and they never quite stop: a six-jointed arm in its cage picks parts off a conveyor and stacks a pallet,
 * a four-legged robot walks a course of ramp and steps with each foot finding the ground under it, a small serving robot goes
 * round its taped route and back to its dock. The wall in the simulation room draws them as they really are (RL_LIVE).
 *
 * Everything low goes in the front rows so nobody's hidden: the cage is see-through and only tall at its back and sides.
 * Everything that moves follows roboticistMotion.ts. All names are made up.
 */

const FIRM = '한걸음로보틱스';
const WHITE = '#eef1f3';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const NAVY = '#17406d';
const ORANGE = '#ef7d22';
const ORANGE_D = '#b95d14';
const YELLOW = '#f5c518';
const AMBER = '#ffb300';
const RED = '#e53935';
const GREEN = '#43a047';
const LED = '#76ff8a';
const ICE = '#d9f2ff';
const BLUE = '#2f6fd0';
const WOOD = '#c9a77a';
const PAPER = '#fbfaf6';
const SKIN = '#f1c9a5';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP_V = v3(0, 1, 0);
const tmp = new THREE.Vector3();
const tA = new THREE.Vector3();
const tB = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const recent = (at: number, t: number) => Math.abs(t - at) < 2;

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
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
const fade = (m: THREE.Mesh, o: number) => {
  m.visible = o > 0.01;
  (m.material as THREE.MeshBasicMaterial).opacity = o;
};
function glass(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, opacity = 0.16, color = '#cfe8f5'): THREE.Mesh {
  const m = haze(g, new THREE.PlaneGeometry(w, h), color, opacity, x, y, z);
  m.rotation.y = ry;
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
function standAt(g: THREE.Object3D, motion: RlMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: RlMotion, seat: V): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], Math.PI, 0);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<RlTool, HeldTool>>, show: (now: string | null, N: RlNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? rlNow(sp.motion as RlMotion, t, rlPhase(g.getWorldPosition(tmp)), H) : null;
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
    if (d.lengthSq() > 1e-8) m.quaternion.setFromUnitVectors(UP_V, d.normalize());
  };
}
function chair(g: THREE.Object3D, seat: V, color = NAVY) {
  const c = group(g, seat[0], 0, seat[2]);
  const T = seat[1];
  part(c, rbox(0.46, 0.07, 0.44, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.25, 0.05, Math.sin(a) * 0.25), 0.014, BLACK);
    part(c, ball(0.026), BLACK, Math.cos(a) * 0.25, 0.028, Math.sin(a) * 0.25, { outline: false });
  }
  part(c, rbox(0.42, 0.42, 0.06, 0.04), color, 0, T + 0.3, 0.24, { rx: 0.1 });
}
/** A status tower: red, amber, green on a pole. */
function tower(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.012, 0.012, 0.08, 6), GREY_D, x, y + 0.04, z, { outline: false });
  const lamps = [RED, AMBER, GREEN].map((c, i) => ownLit(g, cyl(0.03, 0.03, 0.045, 12), shade(c, 0.5), x, y + 0.1 + i * 0.05, z));
  return (which: number) => lamps.forEach((m, i) => setLit(m, i === which ? [RED, AMBER, LED][i] : shade([RED, AMBER, GREEN][i], 0.45)));
}
/** Black and yellow tape on the floor, from one point to another. */
function tape(g: THREE.Object3D, x0: number, z0: number, x1: number, z1: number, color = YELLOW) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  part(g, box(0.05, 0.004, len), color, (x0 + x1) / 2, 0.006, (z0 + z1) / 2, { ry: Math.atan2(x1 - x0, z1 - z0), outline: false, shadow: false });
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

function tabletTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlTablet';
  const tilt = group(root);
  tilt.rotation.x = -0.55;
  part(tilt, rbox(0.24, 0.17, 0.012, 0.006), GRAPHITE, 0, 0, 0, { outline: false });
  picture(tilt, painted('rlTabletFace', 192, 136, (c) => {
    c.fillStyle = '#10202c';
    c.fillRect(0, 0, 192, 136);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 192, 26);
    text(c, '시험 기록', 8, 13, 15, '#ffffff');
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#31475a';
      c.fillRect(10, 36 + i * 24, 140, 16);
      c.strokeStyle = '#9fd6ff';
      c.strokeRect(160, 36 + i * 24, 16, 16);
    }
  }), 0.22, 0.15, 0, 0, 0.007);
  const tick = ownLit(tilt, box(0.016, 0.016, 0.002), LED, 0.075, 0.028, 0.009);
  return { root, tick };
}
const TABLET_GRIPS: HeldTool['grips'] = { left: boardGrip(0.55) };
function driverTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlDriver';
  part(root, cyl(0.016, 0.014, 0.1, 10), ORANGE, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.004, 0.004, 0.11, 8), CHROME, 0, 0, -0.1, { rx: Math.PI / 2, outline: false });
  return root;
}
const DRIVER_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.015 } };
/** A controller for both hands: a handle at each end, tipped back so its face looks up at whoever holds it. */
const TILT = -0.72;
const BOTH_ENDS = (dx: number, r = 0.017): HeldTool['grips'] => ({
  right: { at: v3(dx, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: r },
  left: { at: v3(-dx, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: r },
});
function pendantTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlPendant';
  root.rotation.x = TILT;
  part(root, rbox(0.2, 0.24, 0.04, 0.016), WHITE, 0, 0, 0, { outline: false });
  for (const sx of [-1, 1]) part(root, cyl(0.017, 0.017, 0.15, 10), GRAPHITE, sx * 0.118, 0, 0, { outline: false });
  part(root, cyl(0.016, 0.016, 0.014, 12), RED, 0.07, 0.095, 0.024, { rx: Math.PI / 2, outline: false });
  const stickG = group(root, -0.06, -0.08, 0.022);
  part(stickG, cyl(0.005, 0.005, 0.03, 8), BLACK, 0, 0, 0.012, { rx: Math.PI / 2, outline: false });
  part(stickG, ball(0.01), BLACK, 0, 0, 0.03, { outline: false });
  for (let i = 0; i < 4; i++) part(root, box(0.024, 0.014, 0.004), '#90a4ae', 0.01 + i * 0.03, -0.085, 0.021, { outline: false });
  const screen = liveScreen(root, 0.16, 0.11, 128, 88, 0, 0.03, 0.0215);
  return { root, screen, stickG };
}
function remoteTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlRemote';
  root.rotation.x = TILT;
  part(root, rbox(0.16, 0.1, 0.03, 0.012), GRAPHITE, 0, 0, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(root, cyl(0.017, 0.017, 0.11, 10), BLACK, sx * 0.098, -0.01, 0, { outline: false });
    part(root, ball(0.012), '#607d8b', sx * 0.05, -0.02, 0.022, { outline: false });
  }
  part(root, box(0.1, 0.05, 0.002), '#7fdbff', 0, 0.018, 0.016, { outline: false });
  part(root, cyl(0.012, 0.012, 0.01, 10), RED, 0, -0.03, 0.018, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.004, 0.004, 0.1, 6), GREY_D, 0.06, 0.09, -0.006, { outline: false });
  return root;
}
/** The soldering iron, tipped down: the tip is 0.16 along it from the grip. */
function ironTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlIron';
  root.rotation.x = -0.8;
  part(root, cyl(0.014, 0.012, 0.09, 10), '#1e6fd0', 0, 0, 0.012, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.007, 0.006, 0.07, 8), CHROME, 0, 0, -0.07, { rx: Math.PI / 2, outline: false });
  const tip = part(root, cyl(0.0025, 0.005, 0.05, 8), GREY, 0, 0, -0.135, { rx: -Math.PI / 2, outline: false });
  const cord = part(root, cyl(0.003, 0.003, 0.12, 6), BLACK, 0, 0, 0.11, { rx: Math.PI / 2, outline: false });
  void cord;
  return { root, tip };
}
const PEN = (r = 0.012): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pen', radius: r } });
function gearMesh(g: THREE.Object3D, name: string, r = 0.026) {
  const root = group(g);
  root.name = name;
  part(root, cyl(r, r, 0.012, 16), '#f3f3ee', 0, 0, 0, { outline: false });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    part(root, box(0.007, 0.012, 0.007), '#f3f3ee', Math.cos(a) * (r + 0.003), 0, Math.sin(a) * (r + 0.003), { ry: -a, outline: false });
  }
  part(root, cyl(0.006, 0.006, 0.016, 8), GREY, 0, 0, 0, { outline: false });
  return root;
}
const PINCH = (r = 0.01): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: r } });
function probeTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlProbe';
  part(root, cyl(0.012, 0.012, 0.1, 10), RED, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.002, 0.002, 0.09, 6), CHROME, 0, 0, -0.095, { rx: Math.PI / 2, outline: false });
  return root;
}
/** A traffic cone carried by its top: the grip at the origin, the rest hanging below it. */
function coneTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlCone';
  part(root, cyl(0.016, 0.075, 0.28, 16), ORANGE, 0, -0.15, 0, { outline: false });
  part(root, cyl(0.04, 0.05, 0.05, 14), WHITE, 0, -0.14, 0, { outline: false });
  part(root, box(0.2, 0.018, 0.2), GRAPHITE, 0, -0.3, 0, { outline: false });
  part(root, cyl(0.016, 0.016, 0.04, 10), ORANGE, 0, 0, 0, { outline: false });
  return root;
}
function markerTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlMarker';
  part(root, cyl(0.011, 0.011, 0.11, 10), BLUE, 0, 0, 0.0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.002, 0.008, 0.024, 8), BLACK, 0, 0, -0.067, { rx: -Math.PI / 2, outline: false });
  return root;
}
/** A printed bracket: a small L of white plastic, held by its upright. */
function bracketTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'rlBracket';
  part(root, box(0.016, 0.06, 0.05), '#fff4e3', 0, 0.02, 0, { outline: false });
  part(root, box(0.07, 0.016, 0.05), '#fff4e3', 0.034, -0.002, 0, { outline: false });
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
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender?: 'female' | 'male'): Fig {
  const root = group(parent, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, top);
    const lower = limb(root, 0.035, SKIN);
    const hand = part(root, ball(0.036), SKIN, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP_V, -root.rotation.y);
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
  const opts: FigureOptions = { gender };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}

// =============================================================================================
// 로봇 팔 안전 구역 (rlArmCell, 5 × 3): six joints on a pedestal in a mesh cage, a conveyor, a pallet, a light curtain, a console.

function partBlock(g: THREE.Object3D) {
  const m = group(g);
  part(m, rbox(0.11, 0.05, 0.11, 0.008), '#5d6f7c', 0, 0.025, 0, { outline: false });
  part(m, cyl(0.03, 0.03, 0.03, 12), '#c9d3d9', 0, 0.06, 0, { outline: false });
  return m;
}
function fenceRun(g: THREE.Object3D, x0: number, z0: number, x1: number, z1: number, H: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(z0 - z1, x1 - x0);
  const n = Math.max(1, Math.round(len / 1.2));
  for (let i = 0; i <= n; i++) {
    const e = i / n;
    part(g, box(0.05, H, 0.05), YELLOW, x0 + (x1 - x0) * e, H / 2, z0 + (z1 - z0) * e);
  }
  for (const y of [0.14, H - 0.02]) part(g, box(len, 0.03, 0.03), YELLOW, (x0 + x1) / 2, y, (z0 + z1) / 2, { ry, outline: false });
  const mesh = painted('rlFenceMesh', 128, 128, (c) => {
    c.fillStyle = '#d4d9dc';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#3a4248';
    c.lineWidth = 1.6;
    for (let i = 0; i <= 128; i += 16) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 128);
      c.moveTo(0, i);
      c.lineTo(128, i);
      c.stroke();
    }
  });
  const pane = glass(g, len, H - 0.16, (x0 + x1) / 2, (H + 0.12) / 2, (z0 + z1) / 2, ry, 0.2, '#58626a');
  (pane.material as THREE.MeshBasicMaterial).alphaMap = mesh;
}
function armCell(g: THREE.Group, out: Built) {
  // The floor of the cage: grey paint with a hatched edge.
  part(g, box(4.8, 0.01, 2.68), '#b6bec3', 0, 0.005, 0, { outline: false, shadow: false });
  const Tall = 1.8;
  fenceRun(g, -2.38, -1.36, 2.38, -1.36, Tall);
  fenceRun(g, -2.38, -1.36, -2.38, 1.3, Tall);
  fenceRun(g, 2.38, -1.36, 2.38, 1.3, Tall);
  // Low in front, so whoever's working out here and what's inside are both seen.
  fenceRun(g, -2.38, AC.curtainZ, -AC.curtainX, AC.curtainZ, 1.1);
  fenceRun(g, AC.curtainX, AC.curtainZ, 2.38, AC.curtainZ, 1.1);
  label(g, '위험 · 로봇 작동 구역', 1.0, 0.12, -1.66, 0.9, AC.curtainZ + 0.03, YELLOW, BLACK);
  // The light curtain: two posts, beams between them.
  for (const sx of [-1, 1]) {
    part(g, box(0.06, 1.46, 0.06), GRAPHITE, sx * AC.curtainX, 0.73, AC.curtainZ);
    part(g, box(0.02, 1.3, 0.02), '#ff5252', sx * (AC.curtainX - 0.035), 0.75, AC.curtainZ, { outline: false });
  }
  const beams = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ownLit(g, box(AC.curtainX * 2 - 0.07, 0.0035, 0.0035), '#a33', 0, 0.25 + i * 0.15, AC.curtainZ));
  // The conveyor, bringing parts from the left.
  const belt = group(g, -1.46, 0, AC.pick[2]);
  part(belt, box(1.42, 0.08, 0.3), GREY_D, 0, AC.pick[1] - 0.05, 0);
  part(belt, box(1.38, 0.012, 0.25), BLACK, 0, AC.pick[1] - 0.005, 0, { outline: false });
  for (const sx of [-0.62, 0.62]) for (const sz of [-0.1, 0.1]) part(belt, box(0.04, AC.pick[1] - 0.08, 0.04), GREY, sx, (AC.pick[1] - 0.08) / 2, sz, { outline: false });
  for (const sx of [-0.7, 0.7]) part(belt, cyl(0.05, 0.05, 0.28, 12), GREY, sx, AC.pick[1] - 0.05, 0, { rx: Math.PI / 2, outline: false });
  const stripes = [0, 1, 2, 3, 4, 5, 6].map(() => part(belt, box(0.02, 0.002, 0.24), '#3b4148', 0, AC.pick[1] + 0.002, 0, { outline: false }));
  const onBelt = [0, 1, 2].map(() => partBlock(g));
  // The stop at the end of the belt.
  part(g, box(0.03, 0.08, 0.28), RED, AC.pick[0] - 0.09 + 0.17, AC.pick[1] + 0.03, AC.pick[2], { outline: false });
  // The pallet on its table, on the right.
  part(g, box(0.82, 0.05, 0.58), WOOD, 0.68, 0.7, 0.07);
  for (const sx of [-0.36, 0.36]) for (const sz of [-0.24, 0.24]) part(g, box(0.05, 0.68, 0.05), GREY, 0.68 + sx, 0.34, 0.07 + sz, { outline: false });
  for (let i = 0; i < 6; i++) {
    const p = placeAt(i);
    part(g, box(0.14, 0.002, 0.14), '#8d6e4f', p[0], 0.727, p[2], { outline: false });
  }
  const pallet = [0, 1, 2, 3, 4, 5].map((i) => {
    const m = partBlock(g);
    const p = placeAt(i);
    m.position.set(p[0], p[1] - 0.012, p[2]);
    return m;
  });
  // The arm.
  const B = AC.base;
  part(g, cyl(0.2, 0.26, B[1], 20), GRAPHITE, B[0], B[1] / 2, B[2]);
  part(g, box(0.7, 0.02, 0.7), GREY_D, B[0], 0.02, B[2]);
  for (const sx of [-0.3, 0.3]) for (const sz of [-0.3, 0.3]) part(g, cyl(0.016, 0.016, 0.02, 6), CHROME, B[0] + sx, 0.04, B[2] + sz, { outline: false });
  const turret = group(g, B[0], B[1], B[2]);
  part(turret, cyl(0.17, 0.2, 0.12, 20), ORANGE, 0, 0.06, 0);
  part(turret, rbox(0.3, 0.2, 0.26, 0.05), ORANGE, 0, 0.17, 0);
  const shoulder = group(turret, 0, AC.shoulder, 0);
  part(shoulder, cyl(0.12, 0.12, 0.3, 18), ORANGE_D, 0, 0, 0, { rz: Math.PI / 2 });
  part(shoulder, cyl(0.06, 0.06, 0.34, 12), GRAPHITE, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(shoulder, rbox(0.14, AC.l1 + 0.04, 0.16, 0.05), ORANGE, 0, AC.l1 / 2, 0);
  label(shoulder, '한걸음', 0.13, 0.07, 0, AC.l1 * 0.55, 0.082, ORANGE, '#ffffff');
  const elbow = group(shoulder, 0, AC.l1, 0);
  part(elbow, cyl(0.1, 0.1, 0.24, 16), ORANGE_D, 0, 0, 0, { rz: Math.PI / 2 });
  part(elbow, rbox(0.11, AC.l2 * 0.55, 0.12, 0.04), ORANGE, 0, AC.l2 * 0.25, 0);
  part(elbow, cyl(0.045, 0.058, AC.l2 * 0.5, 14), ORANGE, 0, AC.l2 * 0.72, 0);
  const wrist = group(elbow, 0, AC.l2, 0);
  part(wrist, cyl(0.055, 0.055, 0.12, 14), GRAPHITE, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(wrist, cyl(0.045, 0.045, 0.08, 14), GREY, 0, 0.05, 0, { outline: false });
  const flange = group(wrist, 0, 0.09, 0);
  part(flange, box(0.13, 0.03, 0.05), '#90a4ae', 0, 0.01, 0, { outline: false });
  const fingers = [-1, 1].map((sx) => {
    const f = group(flange, sx * 0.05, 0.02, 0);
    part(f, box(0.014, 0.12, 0.04), GRAPHITE, 0, 0.065, 0, { outline: false });
    return f;
  });
  const inHand = partBlock(flange);
  inHand.position.set(0, AC.wrist - 0.09, 0);
  inHand.rotation.x = Math.PI;
  // A dress pack of cable along the arm.
  rod(shoulder, v3(0.09, 0.05, -0.03), v3(0.09, AC.l1, -0.03), 0.012, BLACK);
  rod(elbow, v3(0.08, 0, -0.03), v3(0.06, AC.l2 * 0.5, 0), 0.01, BLACK);
  // The console outside the curtain.
  const Cx = AC.hmi[0];
  part(g, box(0.14, 0.98, 0.1), GRAPHITE, Cx, 0.49, 1.36);
  part(g, box(0.54, 0.16, 0.12), '#38424a', Cx, 1.03, 1.39);
  part(g, box(0.5, 0.3, 0.05), '#232a30', Cx, AC.hmi[1], 1.405);
  const hmi = liveScreen(g, 0.44, 0.26, 256, 150, Cx, AC.hmi[1], 1.435);
  for (const [b, c] of [[AC.start, GREEN], [AC.reset, BLUE]] as Array<[V, string]>) part(g, cyl(0.03, 0.03, 0.024, 14), c, b[0], b[1], b[2] - 0.012, { rx: Math.PI / 2, outline: false });
  label(g, '시작', 0.07, 0.024, AC.start[0], AC.start[1] - 0.05, 1.452, '#38424a', '#ffffff');
  label(g, '복귀', 0.07, 0.024, AC.reset[0], AC.reset[1] - 0.05, 1.452, '#38424a', '#ffffff');
  part(g, cyl(0.036, 0.04, 0.02, 14), RED, Cx, 1.03, 1.455, { rx: Math.PI / 2, outline: false });
  const setTower = tower(g, -2.2, 1.8, -1.2);
  // The hook the pendant hangs on, on the low fence.
  part(g, box(0.28, 0.03, 0.05), GREY_D, AC.hook[0], AC.hook[1] - 0.1, AC.hook[2] - 0.08, { outline: false });
  const pd = pendantTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<RlTool, HeldTool>> = {
    pendant: { tool: pd.root, lead: 'right', grips: BOTH_ENDS(0.118) },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = {
    rlArmRun: standAt(g, 'rlArmRun', AC.hmi[0], AC.stand),
    rlTeach: standAt(g, 'rlTeach', 1.2, AC.stand),
    rlCurtain: standAt(g, 'rlCurtain', 0.1, 1.78),
    roboticist_cycleTime: standAt(g, 'rlCycle', AC.hmi[0], AC.stand),
  };
  const ik = (tip: V) => {
    const dx = tip[0] - B[0];
    const dz = tip[2] - B[2];
    const r = Math.hypot(dx, dz);
    const h = tip[1] + AC.wrist - B[1] - AC.shoulder;
    const D = THREE.MathUtils.clamp(Math.hypot(r, h), Math.abs(AC.l1 - AC.l2) + 0.05, AC.l1 + AC.l2 - 0.005);
    const phi = Math.atan2(r, h);
    const al = Math.acos(THREE.MathUtils.clamp((AC.l1 * AC.l1 + D * D - AC.l2 * AC.l2) / (2 * AC.l1 * D), -1, 1));
    const be = Math.acos(THREE.MathUtils.clamp((AC.l2 * AC.l2 + D * D - AC.l1 * AC.l1) / (2 * AC.l2 * D), -1, 1));
    const a1 = phi - al;
    const a2 = phi + be;
    const j1 = Math.atan2(dx, dz);
    turret.rotation.y = j1;
    shoulder.rotation.x = a1;
    elbow.rotation.x = a2 - a1;
    wrist.rotation.x = Math.PI - a2;
    RL_LIVE.arm[0] = j1;
    RL_LIVE.arm[1] = a1;
    RL_LIVE.arm[2] = a2 - a1;
  };
  const show = (now: string | null, N: RlNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const c = N ? (n.arm ?? 0) : t / 8.5;
    const A = armPose(c);
    const taught = !!P.tip;
    ik(P.tip ?? A.tip);
    const grip = taught ? clamp01(n.tg) : A.grip;
    const carry = taught ? (n.tg ?? 0) > 0.5 : A.carry;
    RL_LIVE.grip = grip;
    RL_LIVE.armAt = t;
    fingers.forEach((f, i) => (f.position.x = (i === 0 ? -1 : 1) * (0.065 - 0.012 * grip)));
    inHand.visible = carry;
    // The belt: it only moves between parts, while the next one comes up to the stop.
    const shift = THREE.MathUtils.smoothstep(A.u, 0.3, 0.9);
    const beltRun = Math.floor(c) + shift;
    stripes.forEach((s, i) => (s.position.x = -0.66 + wrap(i * 0.2 * 100 + beltRun * 45, 133) / 100));
    onBelt.forEach((m, i) => {
      const gap = 0.42;
      const away = (A.u > 0.26 ? i + 1 - shift : i) * gap;
      m.position.set(AC.pick[0] - away, AC.pick[1], AC.pick[2]);
      m.visible = !(taught && carry && i === 0);
    });
    pallet.forEach((m, i) => (m.visible = i < A.count));
    setTower(N ? (n.tower ?? 2) : 2);
    const tripped = (n.tripped ?? 0) > 0.5;
    const flash = tripped && Math.floor(t * 4) % 2 === 0;
    beams.forEach((m, i) => setLit(m, tripped ? (flash ? '#ff8a80' : '#b71c1c') : i % 2 ? '#a33' : '#c44'));
    // The HMI.
    const running = N ? (n.tower ?? 2) === 2 : true;
    const secs = n.sec ?? (A.u * 7.4);
    hmi.draw(`${now}|${q(secs, 10)}|${n.tower ?? 2}|${tripped}|${A.count}|${q(n.was)}|${q(n.now)}|${q(n.edit)}`, (x) => {
      x.fillStyle = tripped ? '#3a0f0f' : '#0c1820';
      x.fillRect(0, 0, 256, 150);
      x.fillStyle = tripped ? RED : running ? GREEN : AMBER;
      x.fillRect(0, 0, 256, 26);
      text(x, tripped ? '라이트 커튼 차단 · 정지' : running ? '자동 운전' : '대기', 8, 13, 16, '#ffffff');
      text(x, `사이클 ${secs.toFixed(1)}초`, 8, 48, 22, '#d7eaf6');
      if ((n.was ?? 0) > 0.5) text(x, '이전 7.4초', 8, 76, 16, '#9fb7c7');
      if ((n.now ?? 0) > 0.5) text(x, '지금 6.1초', 130, 76, 18, '#7ee89e');
      if ((n.edit ?? 0) > 0) {
        x.fillStyle = '#31475a';
        x.fillRect(8, 90, 240, 10);
        x.fillStyle = '#7fdbff';
        x.fillRect(8, 90, 240 * clamp01(n.edit), 10);
        text(x, '경로 수정', 8, 114, 14, '#7fdbff');
      }
      text(x, `팔레트 ${A.count} / 6`, 8, 134, 16, '#ffd54f');
    });
    // What's in the hands.
    const hasPendant = N?.tool === 'pendant';
    at(pd.root, hasPendant ? P.pendant : AC.hook);
    if (hasPendant) {
      pd.stickG.rotation.y = (n.stick ?? 0) * 0.4 * ((n.jog ?? 0) > 0.5 ? 1 : 0);
      const saved = Math.round(n.saved ?? 0);
      pd.screen.draw(`${saved}|${q(n.jog)}|${q(n.play)}`, (x) => {
        x.fillStyle = '#0c1820';
        x.fillRect(0, 0, 128, 88);
        text(x, (n.play ?? 0) > 0.5 ? '재생' : '조그', 6, 12, 13, '#ffffff');
        text(x, `저장 ${saved}`, 122, 12, 13, '#7ee89e', 'right');
        for (let i = 0; i < 2; i++) {
          x.fillStyle = i < saved ? '#7ee89e' : '#31475a';
          x.fillRect(8, 30 + i * 22, 112, 16);
          text(x, `P${i + 1}`, 12, 38 + i * 22, 12, i < saved ? BLACK : '#9fb7c7');
        }
      });
    }
    at(tab.root, N?.tool === 'tablet' ? P.tablet : null);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, AC.hmi[0], AC.hmi[1], AC.hmi[2]);
}

// =============================================================================================
// 사족 보행 시험장 (rlQuadCourse, 6 × 3): the course and a robot on four jointed legs.

function quadBot(g: THREE.Object3D) {
  const root = group(g);
  root.rotation.order = 'YXZ';
  part(root, rbox(0.5, 0.11, 0.2, 0.04), WHITE, 0, 0, 0);
  part(root, rbox(0.36, 0.03, 0.17, 0.012), GRAPHITE, -0.02, 0.066, 0, { outline: false });
  // Its head: a sensor block, two lenses, a lidar on top.
  part(root, rbox(0.1, 0.075, 0.14, 0.02), GRAPHITE, 0.28, 0.018, 0);
  for (const sz of [-0.035, 0.035]) ownLit(root, cyl(0.015, 0.015, 0.008, 10), '#7fdbff', 0.333, 0.022, sz).rotation.z = Math.PI / 2;
  part(root, cyl(0.04, 0.04, 0.04, 14), BLACK, 0.12, 0.1, 0, { outline: false });
  const lidar = group(root, 0.12, 0.125, 0);
  part(lidar, cyl(0.03, 0.03, 0.012, 12), GREY, 0, 0, 0, { outline: false });
  part(lidar, box(0.03, 0.01, 0.006), '#7fdbff', 0.018, 0, 0, { outline: false });
  label(root, '네발이', 0.13, 0.05, -0.05, 0.002, 0.102, WHITE, NAVY);
  label(root, '네발이', 0.13, 0.05, -0.05, 0.002, -0.102, WHITE, NAVY, Math.PI);
  const lamp = ownLit(root, box(0.04, 0.012, 0.15), LED, -0.26, 0.03, 0);
  const hips: THREE.Group[] = [];
  const knees: THREE.Group[] = [];
  const covers: THREE.Mesh[] = [];
  for (const [fb, sz] of [[1, -1], [1, 1], [-1, -1], [-1, 1]]) {
    const H = group(root, fb * QC.hipF, -0.01, sz * QC.hipS);
    covers.push(part(H, cyl(0.05, 0.05, 0.05, 14), ORANGE, 0, 0, 0, { rx: Math.PI / 2 }));
    part(H, rbox(0.05, QC.l1 + 0.03, 0.04, 0.016), GRAPHITE, 0, -QC.l1 / 2, sz * 0.01);
    const K = group(H, 0, -QC.l1, sz * 0.01);
    part(K, cyl(0.026, 0.026, 0.05, 10), GREY, 0, 0, 0, { rx: Math.PI / 2, outline: false });
    part(K, cyl(0.013, 0.018, QC.l2, 10), WHITE, 0, -QC.l2 / 2, 0);
    part(K, ball(0.024), BLACK, 0, -QC.l2, 0, { outline: false });
    hips.push(H);
    knees.push(K);
  }
  return { root, hips, knees, lidar, lamp, covers };
}
function quadCourse(g: THREE.Group, out: Built) {
  const Z = QC.z;
  const zB = Z - 0.55;
  const zF = Z + 0.5;
  const D = zF - zB;
  const Mz = (zB + zF) / 2;
  part(g, box(5.8, 0.012, D + 0.2), '#42685a', 0, 0.006, Mz, { outline: false, shadow: false });
  for (let i = 0; i <= 11; i++) part(g, box(0.02, 0.002, D + 0.2), '#d8e4dd', -2.75 + i * 0.5, 0.0135, Mz, { outline: false, shadow: false });
  label(g, '출발', 0.28, 0.08, QC.x0, 0.015, zF + 0.08, '#42685a', '#ffffff').rotation.x = -Math.PI / 2;
  // The ramp: a wedge from x -1.3 up to -0.3.
  const wedge = new THREE.Shape();
  wedge.moveTo(0, 0);
  wedge.lineTo(1.0, 0);
  wedge.lineTo(1.0, 0.24);
  wedge.closePath();
  part(g, new THREE.ExtrudeGeometry(wedge, { depth: D, bevelEnabled: false }), '#c5c9cc', -1.3, 0.012, zB);
  part(g, box(0.7, 0.24, D), '#c5c9cc', 0.05, 0.12, Mz);
  // Three steps down.
  part(g, box(0.3, 0.16, D), '#b6babd', 0.55, 0.08, Mz);
  part(g, box(0.3, 0.08, D), '#a9adb0', 0.85, 0.04, Mz);
  part(g, box(0.72, 0.003, D - 0.1), YELLOW, 0.05, 0.242, Mz, { outline: false });
  for (const x of [0.4, 0.7, 1.0]) part(g, box(0.02, 0.003, D), YELLOW, x - 0.012, quadGround(x - 0.03) + 0.002, Mz, { outline: false });
  // Low rails along the front, a gap to step through at the plateau; a board with a pattern for the cameras at the back.
  const Rz = 1.3;
  for (const [x0, x1] of [[-2.9, -0.46], [0.66, 2.9]]) {
    part(g, box(x1 - x0, 0.03, 0.03), YELLOW, (x0 + x1) / 2, 0.46, Rz, { outline: false });
    for (const x of [x0, (x0 + x1) / 2, x1]) part(g, box(0.04, 0.46, 0.04), GREY_D, x, 0.23, Rz, { outline: false });
  }
  const backBoard = painted('rlQuadBoard', 760, 180, (c) => {
    c.fillStyle = '#f0f3f5';
    c.fillRect(0, 0, 760, 180);
    for (let j = 0; j < 7; j++)
      for (let i = 0; i < 31; i++) {
        c.fillStyle = (i + j) % 2 ? '#d7dde1' : '#f0f3f5';
        c.fillRect(i * 25, j * 26, 25, 26);
      }
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 760, 36);
    text(c, `${FIRM} · 사족 보행 시험장`, 14, 18, 22, '#ffffff');
  });
  part(g, box(5.86, 1.42, 0.06), GREY_D, 0, 0.74, -1.3);
  picture(g, backBoard, 5.76, 1.36, 0, 0.74, -1.265);
  // Motion-capture cameras on two posts.
  for (const sx of [-1, 1]) {
    part(g, box(0.06, 1.62, 0.06), GRAPHITE, sx * 2.84, 0.81, -1.2);
    const cam = group(g, sx * 2.8, 1.56, -1.14, sx * -0.5);
    part(cam, rbox(0.12, 0.09, 0.14, 0.02), BLACK, 0, 0, 0);
    ownLit(cam, cyl(0.03, 0.03, 0.01, 12), '#ff8a80', 0, 0, 0.074).rotation.x = Math.PI / 2;
  }
  const setTower = tower(g, 2.72, 1.44, -1.22);
  // The stand for the remote, on the left; the laptop on its pedestal.
  part(g, box(0.05, 0.74, 0.05), GREY_D, -2.46, 0.37, 1.36, { outline: false });
  part(g, box(0.26, 0.03, 0.18), GRAPHITE, -2.46, 0.76, 1.38);
  part(g, box(0.06, 0.82, 0.06), GREY_D, 0.9, 0.41, 1.42, { outline: false });
  part(g, box(0.4, 0.03, 0.26), GRAPHITE, 0.9, 0.83, 1.46);
  const logScreen = liveScreen(g, 0.34, 0.2, 192, 112, 0.9, 0.97, 1.31, 0, -0.18);
  part(g, box(0.36, 0.22, 0.012), BLACK, 0.9, 0.97, 1.3, { rx: -0.18, outline: false });
  const Q = quadBot(g);
  const rem = remoteTool(g);
  const drv = driverTool(g);
  const tab = tabletTool(g);
  const guests = [person(g, '#6d8299', '#37474f', '#2b1b10', -2.7, 0.92, Math.PI * 0.55, 'male'), person(g, '#b0705c', '#37474f', '#5b3a1e', 2.7, 0.92, -Math.PI * 0.55, 'female')];
  const tools: Partial<Record<RlTool, HeldTool>> = {
    remote: { tool: rem, lead: 'right', grips: BOTH_ENDS(0.098) },
    driver: { tool: drv, lead: 'right', grips: DRIVER_GRIP },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = {
    rlWalk: standAt(g, 'rlWalk', -2.3, QC.stand),
    rlLegCheck: standAt(g, 'rlLegCheck', -1.74, 0.3),
    rlDemoAlarm: standAt(g, 'rlDemoAlarm', 0.1, QC.stand),
  };
  const hand = new THREE.Vector3();
  const show = (now: string | null, N: RlNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const parked = (n.parked ?? 0) > 0.5;
    const c = N ? (parked ? 0 : (n.q ?? 0)) : t / 36;
    const m = N ? (n.qm ?? 0) : 1;
    const sit = N ? clamp01(n.qsit) : 0;
    const pose = quadPose(c, m, sit);
    const fall = clamp01(n.fall);
    const flail = clamp01(n.flail);
    const lowered = 0.06 * fall;
    Q.root.position.set(parked ? -1.84 : pose.x, pose.y - lowered, Z);
    Q.root.rotation.set(fall * 1.4, pose.yaw, pose.pitch);
    for (let i = 0; i < 4; i++) {
      const wig = i === 1 ? (n.wiggle ?? 0) : 0;
      const test = (n.test ?? 0) * (i % 2 ? 1 : -1);
      const thrash = flail * Math.sin(t * 15 + i * 2.1) * 0.75;
      Q.hips[i].rotation.z = pose.hip[i] + wig + test + thrash + fall * 0.5;
      Q.knees[i].rotation.z = pose.knee[i] - thrash * 0.8 + fall * -0.3;
    }
    Q.lidar.rotation.y = t * 6;
    setLit(Q.lamp, (n.alarm ?? 0) > 0.5 ? (Math.floor(t * 5) % 2 ? RED : '#5a1414') : LED);
    Q.covers[1].visible = 1 - clamp01(n.cover) > 0.5;
    setTower((n.alarm ?? 0) > 0.5 ? 0 : N ? 2 : 1);
    RL_LIVE.quadX = Q.root.position.x;
    RL_LIVE.quadYaw = pose.yaw;
    RL_LIVE.quadPitch = pose.pitch;
    RL_LIVE.quadLegs[0] = pose.hip[0];
    RL_LIVE.quadLegs[1] = pose.knee[0];
    RL_LIVE.quadLegs[2] = pose.hip[2];
    RL_LIVE.quadLegs[3] = pose.knee[2];
    RL_LIVE.quadAt = t;
    if ((n.alarm ?? 0) > 0.5) RL_LIVE.faultAt = t;
    // In the hands, or on their stands.
    const held = N?.tool ?? null;
    at(rem, held === 'remote' ? P.remote : [-2.46, 0.8, 1.38]);
    at(drv, held === 'driver' ? P.driver : now === 'rlLegCheck' ? P.driver : null);
    drv.rotation.z = n.spin ?? 0;
    at(tab.root, held === 'tablet' ? P.tablet : null);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
    // The log, on the laptop.
    logScreen.draw(`${now}|${q(n.log, 8)}|${(n.alarm ?? 0) > 0.5}|${q(n.ok)}|${q(Q.root.position.x, 4)}`, (x) => {
      x.fillStyle = '#0c1820';
      x.fillRect(0, 0, 192, 112);
      text(x, (n.alarm ?? 0) > 0.5 ? '오작동!' : (n.ok ?? 0) > 0.5 ? '시연 정상' : '보행 기록', 6, 12, 14, (n.alarm ?? 0) > 0.5 ? '#ff8a80' : '#7fdbff');
      text(x, `위치 ${Q.root.position.x.toFixed(2)} m`, 6, 34, 13, '#d7eaf6');
      if (clamp01(n.log) > 0) {
        text(x, '왼쪽 앞 관절 값 튐', 6, 56, 13, '#ffd54f');
        if (clamp01(n.log) > 0.5) text(x, '센서 초기화', 6, 76, 13, '#7ee89e');
      }
    });
    // People who came to watch; they gasp and clap.
    const g1 = (n.guests ?? 0) > 0.5;
    guests.forEach((F, i) => {
      F.root.visible = g1;
      if (!g1) return;
      const gasp = (n.gasp ?? 0) > 0.5;
      const clap = (n.clap ?? 0) > 0.5;
      F.opts.nod = gasp ? -0.08 : clap ? 0.1 + 0.1 * Math.sin(t * 7 + i) : 0.08;
      F.head.rotation.x = F.opts.nod;
      if (clap || gasp) {
        const sx = i === 0 ? 1 : -1;
        hand.set(F.root.position.x + sx * 0.3, gasp ? 1.34 : 1.14, F.root.position.z - 0.03);
        const w = clap ? 0.04 * (1 + Math.sin(t * 16)) : 0.05;
        hand.z += w;
        F.armR(hand);
        hand.z -= 2 * w + 0.04;
        F.armL(hand);
      } else {
        F.armR(null);
        F.armL(null);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 0.5, Z);
}

// =============================================================================================
// 조립대 (rlAssemblyBench, 3 × 1): a board in its clamp, an iron, a spool of solder, a servo in a vice, a scope; low, it hides nobody.

function assemblyBench(g: THREE.Group, out: Built) {
  const T = AB.top;
  part(g, box(2.9, 0.05, 0.92), '#b9c2a4', 0, T - 0.025, 0.02);
  part(g, box(2.86, 0.004, 0.88), '#3f6b4f', 0, T + 0.002, 0.02, { outline: false });
  for (const sx of [-1.36, 1.36]) part(g, box(0.06, T - 0.05, 0.8), GREY_D, sx, (T - 0.05) / 2, 0.02);
  part(g, box(2.7, 0.03, 0.03), GREY_D, 0, 0.2, -0.32, { outline: false });
  // A low pegboard: pliers, cutters, coils.
  part(g, box(2.9, 0.62, 0.03), '#d9dde0', 0, T + 0.34, -0.42);
  const peg = painted('rlPeg', 256, 56, (c) => {
    c.fillStyle = '#d9dde0';
    c.fillRect(0, 0, 256, 56);
    c.fillStyle = '#a5adb3';
    for (let j = 0; j < 6; j++) for (let i = 0; i < 28; i++) c.fillRect(4 + i * 9, 4 + j * 9, 2, 2);
  });
  picture(g, peg, 2.86, 0.58, 0, T + 0.34, -0.402);
  const r = seeded(61);
  for (let i = 0; i < 9; i++) {
    const x = -1.28 + i * 0.32;
    const c = [ORANGE, BLUE, RED, GREEN, GRAPHITE][Math.floor(r() * 5)];
    part(g, box(0.02, 0.2, 0.01), c, x, T + 0.32 + r() * 0.1, -0.392, { outline: false });
    part(g, box(0.05, 0.02, 0.012), CHROME, x, T + 0.44, -0.392, { outline: false });
  }
  // The clamp and the board.
  const Bd = AB.board;
  part(g, box(0.3, 0.04, 0.14), GREY_D, Bd[0], T + 0.02, Bd[2]);
  for (const sx of [-0.14, 0.14]) part(g, box(0.025, 0.06, 0.025), CHROME, Bd[0] + sx, T + 0.06, Bd[2], { outline: false });
  part(g, box(0.26, 0.008, 0.14), '#1a6a3d', Bd[0], Bd[1], Bd[2], { outline: false });
  const trace = painted('rlBoardFace', 128, 72, (c) => {
    c.fillStyle = '#1a6a3d';
    c.fillRect(0, 0, 128, 72);
    c.strokeStyle = '#7fc79a';
    c.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.moveTo(6 + i * 12, 4);
      c.lineTo(6 + i * 12, 38);
      c.lineTo(12 + i * 11, 68);
      c.stroke();
    }
  });
  picture(g, trace, 0.25, 0.135, Bd[0], Bd[1] + 0.0048, Bd[2], '#ffffff', 0, -Math.PI / 2);
  part(g, box(0.06, 0.012, 0.05), BLACK, Bd[0] + 0.02, Bd[1] + 0.01, Bd[2] - 0.02, { outline: false });
  const jointBalls = AB.joints.map((_, i) => {
    const p = jointAt(i);
    return part(g, ball(0.007), '#dfe4e8', p[0], p[1], p[2], { outline: false });
  });
  const boardLed = ownLit(g, box(0.012, 0.006, 0.012), '#2a3a2c', Bd[0] - 0.1, Bd[1] + 0.008, Bd[2] - 0.05);
  // A magnifier lamp on an arm over the board.
  rod(g, v3(Bd[0] - 0.4, T, Bd[2] - 0.3), v3(Bd[0] - 0.3, T + 0.42, Bd[2] - 0.2), 0.01, GREY);
  rod(g, v3(Bd[0] - 0.3, T + 0.42, Bd[2] - 0.2), v3(Bd[0] - 0.06, T + 0.36, Bd[2] - 0.03), 0.009, GREY);
  part(g, cyl(0.09, 0.09, 0.03, 20), WHITE, Bd[0] - 0.04, T + 0.34, Bd[2] - 0.02);
  ownLit(g, cyl(0.08, 0.08, 0.004, 20), ICE, Bd[0] - 0.04, T + 0.324, Bd[2] - 0.02);
  // Iron stand, sponge, spool.
  const Ih = AB.ironHome;
  part(g, rbox(0.14, 0.03, 0.1, 0.01), GRAPHITE, Ih[0], T + 0.015, Ih[2]);
  part(g, cyl(0.02, 0.02, 0.1, 10), CHROME, Ih[0], T + 0.08, Ih[2] - 0.03, { outline: false });
  part(g, box(0.08, 0.012, 0.06), '#e8c75a', Ih[0] + 0.1, T + 0.01, Ih[2], { outline: false });
  const Sp = AB.spool;
  part(g, cyl(0.04, 0.04, 0.05, 16), '#b7bec3', Sp[0], T + 0.025, Sp[2]);
  part(g, cyl(0.05, 0.05, 0.008, 16), BLUE, Sp[0], T + 0.05, Sp[2], { outline: false });
  const wire = limb(g, 0.0025, '#dde2e6');
  // The servo in its vice.
  const Vc = AB.vice;
  part(g, box(0.26, 0.05, 0.14), GREY_D, Vc[0], T + 0.025, Vc[2]);
  for (const sx of [-0.1, 0.1]) part(g, box(0.03, 0.05, 0.12), GRAPHITE, Vc[0] + sx, T + 0.06, Vc[2], { outline: false });
  part(g, rbox(0.14, 0.06, 0.08, 0.008), '#253240', Vc[0], Vc[1] - 0.004, Vc[2]);
  label(g, '서보', 0.08, 0.03, Vc[0], Vc[1] - 0.004, Vc[2] + 0.042, '#253240', '#ffffff');
  const placedA = gearMesh(g, 'rlGearA');
  const placedB = gearMesh(g, 'rlGearB', 0.018);
  placedA.position.set(Vc[0], Vc[1] + 0.03, Vc[2]);
  placedB.position.set(Vc[0] + 0.03, Vc[1] + 0.03, Vc[2]);
  const lid = group(g, Vc[0], Vc[1] + 0.05, Vc[2]);
  part(lid, rbox(0.14, 0.024, 0.08, 0.006), '#253240', 0, 0, 0, { outline: false });
  const horn = group(lid, 0.03, 0.02, 0);
  part(horn, cyl(0.012, 0.012, 0.014, 10), WHITE, 0, 0, 0, { outline: false });
  part(horn, box(0.1, 0.006, 0.016), WHITE, 0, 0.008, 0, { outline: false });
  // A tray of gears, a box with a switch, the scope.
  part(g, box(0.2, 0.02, 0.14), '#90a4ae', AB.gears[0], T + 0.01, AB.gears[2]);
  for (let i = 0; i < 5; i++) {
    const m = gearMesh(g, 'rlGearT', 0.018 + (i % 2) * 0.008);
    m.position.set(AB.gears[0] - 0.07 + i * 0.035, T + 0.026, AB.gears[2] - 0.03 + (i % 2) * 0.06);
  }
  part(g, rbox(0.14, 0.06, 0.1, 0.01), GRAPHITE, AB.sw[0], T + 0.03, AB.sw[2] - 0.05);
  part(g, cyl(0.016, 0.016, 0.012, 12), GREEN, AB.sw[0], AB.sw[1], AB.sw[2] - 0.016, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.36, 0.26, 0.2, 0.02), '#d7dde1', 1.08, T + 0.13, -0.14);
  const scope = liveScreen(g, 0.24, 0.18, 192, 144, 1.02, T + 0.14, -0.038);
  for (let i = 0; i < 3; i++) part(g, cyl(0.012, 0.012, 0.01, 8), GRAPHITE, 1.19, T + 0.08 + i * 0.05, -0.036, { rx: Math.PI / 2, outline: false });
  chair(g, AB.seat);
  const smoke = [0, 1].map(() => haze(g, new THREE.PlaneGeometry(0.06, 0.1), '#eef2f4', 0, 0, 0, 0));
  const senior = person(g, '#37587a', '#2a3a48', '#2b1b10', -0.7, 0.92, Math.PI * 0.8, 'female');
  const ir = ironTool(g);
  const drv = driverTool(g);
  const gear = gearMesh(g, 'rlGear');
  const tools: Partial<Record<RlTool, HeldTool>> = {
    iron: { tool: ir.root, lead: 'right', grips: PEN(0.013) },
    driver: { tool: drv, lead: 'right', grips: DRIVER_GRIP },
    gear: { tool: gear, lead: 'right', grips: PINCH(0.012) },
  };
  const spots: Record<string, Spot> = { rlSolder: seatAt(g, 'rlSolder', AB.seat), rlServo: seatAt(g, 'rlServo', AB.seat), roboticist_learnSolder: seatAt(g, 'rlLearn', AB.seat) };
  const pointing = new THREE.Vector3();
  const show = (now: string | null, N: RlNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const soldering = now === 'rlSolder' || now === 'roboticist_learnSolder';
    const done = soldering ? (n.done ?? 0) : 6;
    jointBalls.forEach((m, i) => (m.visible = i < Math.round(done)));
    const heat = clamp01(n.heat);
    at(ir.root, soldering && P.iron ? P.iron : AB.ironHome);
    (ir.tip.material as THREE.MeshToonMaterial | undefined)?.color?.set?.(heat > 0.5 ? '#ffb46b' : GREY);
    // Smoke off the joint.
    const J = (n.at ?? -1) >= 0 ? jointAt(n.at) : null;
    smoke.forEach((m, i) => {
      if (!J || heat < 0.1) return void (m.visible = false);
      const u = frac(t * 0.8 + i * 0.5);
      m.position.set(J[0] + 0.01 * Math.sin(t * 3 + i), J[1] + 0.03 + 0.14 * u, J[2]);
      fade(m, 0.3 * heat * Math.sin(u * Math.PI));
    });
    if (P.wire) wire(tA.set(AB.spool[0], AB.spool[1] + 0.05, AB.spool[2]), tB.set(P.wire[0], P.wire[1] - 0.01, P.wire[2]));
    else wire(tA.set(AB.spool[0], AB.spool[1] + 0.05, AB.spool[2]), tB.set(AB.spool[0] + 0.05, AB.spool[1] + 0.06, AB.spool[2] + 0.08));
    const power = clamp01(n.power) > 0.5;
    setLit(boardLed, power ? (now === 'rlServo' ? '#2a3a2c' : LED) : '#2a3a2c');
    // The servo.
    const servoing = now === 'rlServo';
    const gears = servoing ? (n.gears ?? 0) : 2;
    placedA.visible = gears > 0.5;
    placedB.visible = gears > 1.5;
    lid.visible = !servoing || clamp01(n.lid) > 0.1;
    lid.position.y = Vc[1] + 0.05 + 0.04 * (1 - clamp01(n.lid === undefined ? 1 : n.lid));
    horn.rotation.y = servoing ? (n.horn ?? 0) : 0.4 * Math.sin(t * 0.8);
    at(gear, N?.tool === 'gear' ? P.gear : null);
    at(drv, N?.tool === 'driver' ? P.driver : AB.driverHome);
    drv.rotation.z = N?.tool === 'driver' ? (n.spin ?? 0) : 0;
    scope.draw(`${Math.floor(t * 8)}|${power}|${q(n.horn)}`, (x) => {
      x.fillStyle = '#071410';
      x.fillRect(0, 0, 192, 144);
      x.strokeStyle = '#1f4034';
      x.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        x.beginPath();
        x.moveTo(i * 32, 0);
        x.lineTo(i * 32, 144);
        x.moveTo(0, i * 24);
        x.lineTo(192, i * 24);
        x.stroke();
      }
      x.strokeStyle = power ? '#7dffa0' : '#3b7a5c';
      x.lineWidth = 2;
      x.beginPath();
      for (let i = 0; i <= 192; i += 3) {
        const pwm = Math.sin((i + t * 90) * 0.13) > (n.horn ?? 0) * 0.3 ? 1 : -1;
        const y = 72 - (power ? pwm * 34 : Math.sin(i * 0.2 + t * 2) * 4);
        if (i === 0) x.moveTo(i, y);
        else x.lineTo(i, y);
      }
      x.stroke();
    });
    // The senior who shows how.
    const teaching = now === 'roboticist_learnSolder';
    senior.root.visible = teaching;
    if (teaching) {
      const tc = n.teach ?? 0;
      senior.opts.nod = (n.nods ?? 0) > 0.5 ? 0.16 + 0.16 * Math.sin(t * 6) : 0.3;
      senior.head.rotation.x = senior.opts.nod;
      if (tc > 0.5) {
        const a = jointAt(Math.floor(t * 0.8));
        pointing.set(a[0] + 0.03, a[1] + (tc > 1.5 ? 0.06 : 0.14), a[2] + 0.1);
        senior.armR(pointing);
      } else senior.armR(null);
      senior.armL(null);
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, Bd[0], Bd[1], Bd[2]);
}

// =============================================================================================
// 충전 도크 (rlChargeDock, 4 × 3): the dock, a taped loop round a mock table, and a little serving robot that goes round it.

function serveBot(g: THREE.Object3D) {
  const root = group(g);
  part(root, cyl(0.2, 0.24, 0.14, 24), WHITE, 0, 0.1, 0);
  part(root, cyl(0.24, 0.24, 0.03, 24), GRAPHITE, 0, 0.04, 0, { outline: false });
  const ring = ownLit(root, cyl(0.205, 0.205, 0.014, 24), '#7fdbff', 0, 0.175, 0);
  const wheels = [-1, 1].map((sx) => {
    const w = group(root, sx * 0.2, 0.05, 0);
    part(w, cyl(0.05, 0.05, 0.03, 14), BLACK, 0, 0, 0, { rz: Math.PI / 2, outline: false });
    part(w, box(0.034, 0.012, 0.09), GREY, 0, 0, 0, { outline: false });
    return w;
  });
  part(root, cyl(0.05, 0.07, 0.86, 14), '#dfe4e8', 0, 0.6, -0.1);
  const trays = [0.42, 0.64, 0.86].map((y) => {
    const t = group(root, 0, y, 0);
    part(t, cyl(0.2, 0.2, 0.02, 24), WHITE, 0, 0, 0.02);
    part(t, cyl(0.17, 0.17, 0.004, 24), '#b0bec5', 0, 0.012, 0.02, { outline: false });
    return t;
  });
  // Cups on the middle tray.
  const cups = [-0.07, 0.07].map((sx) => {
    const c = group(trays[1], sx, 0.015, 0.05);
    part(c, cyl(0.03, 0.025, 0.08, 12), PAPER, 0, 0.04, 0, { outline: false });
    return c;
  });
  void cups;
  // Its head: a face on a screen.
  part(root, rbox(0.3, 0.22, 0.1, 0.05), WHITE, 0, 1.08, -0.06);
  const face = liveScreen(root, 0.24, 0.16, 120, 80, 0, 1.08, -0.008);
  return { root, ring, wheels, trays, face };
}
const FACE_TEXT = ['', '잠시만요', '주문하신 음료예요'];
function faceDraw(c: Ctx2, which: number, t: number, charging: number) {
  c.fillStyle = '#0d2233';
  c.fillRect(0, 0, 120, 80);
  c.fillStyle = which === 1 ? '#ffd54f' : '#7fdbff';
  const blink = Math.sin(t * 1.4) > 0.96;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.ellipse(60 + sx * 24, 32, pos(8), pos(blink ? 1 : 9), 0, 0, Math.PI * 2);
    c.fill();
  }
  const s = FACE_TEXT[wrap(which, FACE_TEXT.length)];
  if (s) text(c, s, 60, 66, 12, '#ffffff', 'center');
  else if (charging > 0.5) text(c, '충전 중', 60, 66, 13, '#7ee89e', 'center');
  else {
    c.strokeStyle = '#7fdbff';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(60, 48, pos(14), 0.3, Math.PI - 0.3);
    c.stroke();
  }
}
function chargeDock(g: THREE.Group, out: Built) {
  // The floor: a light mat, the taped route, a mock café table.
  part(g, box(3.84, 0.01, 2.84), '#d8dcd9', 0, 0.005, 0, { outline: false, shadow: false });
  const N0 = 72;
  for (let i = 0; i < N0; i++) {
    if (i % 3 === 2) continue;
    const a = ROUTE.getPointAt(i / N0);
    const b = ROUTE.getPointAt((i + 1) / N0);
    tape(g, a.x, a.z, b.x, b.z, '#2f6fd0');
  }
  const Tb = CD.table;
  part(g, cyl(0.04, 0.05, 0.66, 12), GREY_D, Tb[0], 0.33, Tb[2], { outline: false });
  part(g, cyl(0.2, 0.22, 0.02, 18), GREY_D, Tb[0], 0.02, Tb[2], { outline: false });
  part(g, cyl(0.36, 0.36, 0.03, 24), WOOD, Tb[0], 0.68, Tb[2]);
  label(g, '모의 테이블 3번', 0.3, 0.05, Tb[0], 0.74, Tb[2] + 0.02, PAPER, BLACK);
  part(g, cyl(0.022, 0.022, 0.05, 10), PAPER, Tb[0] - 0.12, 0.72, Tb[2] + 0.1, { outline: false });
  // A potted plant that crowds the corner, the way a real shop's does.
  const Pl: V = [1.06, 0, 1.22];
  part(g, cyl(0.13, 0.1, 0.22, 14), '#a97e5b', Pl[0], 0.11, Pl[2]);
  part(g, ball(0.17), '#4f8a54', Pl[0], 0.36, Pl[2]);
  part(g, ball(0.12), '#5b9b60', Pl[0] + 0.06, 0.48, Pl[2] - 0.03);
  // The dock at the back, against the wall.
  const Dk = CD.dock;
  part(g, rbox(0.72, 0.9, 0.34, 0.04), '#eef1f3', Dk[0], 0.45, Dk[2] - 0.13);
  part(g, box(0.56, 0.05, 0.14), GRAPHITE, Dk[0], 0.26, Dk[2] + 0.02);
  for (const sx of [-1, 1]) part(g, box(0.1, 0.03, 0.018), '#d4af37', sx * CD.contact[0], CD.contact[1], CD.contact[2] - 0.012, { outline: false });
  label(g, `${FIRM} 충전 도크`, 0.56, 0.08, Dk[0], 0.78, Dk[2] + 0.042, NAVY, '#ffffff');
  const dockLamp = ownLit(g, box(0.3, 0.02, 0.01), '#2b3530', Dk[0], 0.66, Dk[2] + 0.044);
  part(g, cyl(0.03, 0.03, 0.08, 10), BLACK, 0.5, 0.05, Dk[2] - 0.2, { rz: Math.PI / 2, outline: false });
  // Control post at the front, a button and a screen: low.
  const Go = CD.go;
  part(g, box(0.07, Go[1] - 0.04, 0.07), GREY_D, Go[0], (Go[1] - 0.04) / 2, Go[2] - 0.05);
  part(g, rbox(0.24, 0.3, 0.06, 0.02), GRAPHITE, Go[0], Go[1] + 0.06, Go[2] - 0.04);
  part(g, cyl(0.026, 0.026, 0.024, 12), GREEN, Go[0], Go[1], Go[2] - 0.012, { rx: Math.PI / 2, outline: false });
  const post = liveScreen(g, 0.2, 0.13, 128, 84, Go[0], Go[1] + 0.12, Go[2] - 0.007);
  // A second cone waits by the wall; the one used starts here.
  const R = serveBot(g);
  const cn = coneTool(g);
  const parked = coneTool(g);
  parked.name = 'rlConeSpare';
  parked.position.set(CD.coneHome[0], 0.31, CD.coneHome[2] - 0.1);
  const pb = probeTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<RlTool, HeldTool>> = {
    cone: { tool: cn, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.016 } } },
    probe: { tool: pb, lead: 'right', grips: PEN(0.012) },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = {
    rlServe: standAt(g, 'rlServe', CD.go[0], CD.stand - 0.1),
    rlDock: standAt(g, 'rlDock', CD.contact[0] + 0.12, -0.34),
    roboticist_fixRoute: standAt(g, 'rlRoute', -0.3, CD.stand),
  };
  let lastRun = 0;
  const show = (_now: string | null, N: RlNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    // On its own: round the loop, a stop at the table, back to its dock to charge.
    const L = frac(t / 34);
    const u0 = L < 0.26 ? (L / 0.26) * 0.5 : L < 0.34 ? 0.5 : L < 0.62 ? 0.5 + ((L - 0.34) / 0.28) * 0.5 : 0;
    const home0 = L < 0.03 ? 1 - L / 0.03 : L < 0.62 ? (L > 0.58 ? (L - 0.58) / 0.04 : 0) : 1;
    const serve = N ? (n.serve ?? 0) : u0;
    const home = N ? clamp01(n.home) : home0;
    const S = servePose(serve, home);
    const wob = (n.wobble ?? 0) > 0.5 ? 0.03 * Math.sin(t * 16) : 0;
    R.root.position.set(S.x + wob, 0, S.z);
    R.root.rotation.y = S.yaw + wob * 2;
    // Wheels turn by how far it's gone round, the route being about 7 m long.
    const roll = (serve * 7) / 0.05;
    R.wheels[0].rotation.x = roll;
    R.wheels[1].rotation.x = roll;
    const tray = clamp01(N ? n.tray : L > 0.26 && L < 0.34 ? 1 : 0);
    R.trays[1].position.z = 0.1 * tray;
    const charging = N ? (home > 0.95 && (n.charging ?? 1) > 0.5 ? 1 : 0) : home0 >= 1 ? 1 : 0;
    const faceN = N ? (n.face ?? 0) : tray > 0.5 ? 2 : 0;
    setLit(R.ring, faceN === 1 ? AMBER : charging ? LED : '#7fdbff');
    R.face.draw(`${faceN}|${charging}|${Math.floor(t * 4)}`, (c) => faceDraw(c, faceN, t, charging));
    setLit(dockLamp, charging ? (Math.sin(t * 2.5) > 0 ? LED : '#2f6e40') : '#2b3530');
    lastRun = serve;
    post.draw(`${q(lastRun, 40)}|${faceN}|${q(n.edit)}|${q(n.volts, 2)}`, (c) => {
      c.fillStyle = '#0c1820';
      c.fillRect(0, 0, 128, 84);
      if ((n.volts ?? 0) > 0) text(c, `접점 ${(n.volts ?? 0).toFixed(1)} V`, 64, 40, 16, '#7ee89e', 'center');
      else {
        text(c, faceN === 1 ? '장애물 감지' : '경로 주행', 6, 12, 13, faceN === 1 ? '#ffd54f' : '#7fdbff');
        c.strokeStyle = '#4a6a80';
        c.lineWidth = 2;
        c.strokeRect(20, 26, 88, 46);
        c.fillStyle = '#ffd54f';
        const p = ROUTE.getPointAt(frac(serve));
        c.beginPath();
        c.arc(64 + (p.x / 1.5) * 44, 49 + ((p.z - 0.25) / 0.8) * 23, pos(4), 0, Math.PI * 2);
        c.fill();
        if ((n.edit ?? 0) > 0) text(c, `수정 ${Math.round(clamp01(n.edit) * 100)}%`, 122, 12, 11, '#7ee89e', 'right');
      }
    });
    // The cone: in the hand, or stood on the route.
    const held = N?.tool ?? null;
    at(cn, held === 'cone' ? P.cone : (n.coneOn ?? 0) > 0.5 ? [CD.cone[0], 0.31, CD.cone[2]] : null);
    parked.visible = held !== 'cone' && !((n.coneOn ?? 0) > 0.5);
    at(pb, held === 'probe' ? P.probe : null);
    at(tab.root, held === 'tablet' ? P.tablet : null);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, CD.go[0], CD.go[1], CD.go[2]);
}

// =============================================================================================
// 시뮬레이션실 (rlSimulatorStation, 4 × 2): a wall that draws the real robots as they are; a desk, a code screen.

const CODE_LINES = ['def 다음_자세(관절, 목표):', '    오차 = 목표 - 관절', '    힘 = 비례 * 오차 + 미분 * 속도', '    if 힘 > 최대힘:', '        힘 = 최대힘', '    return 힘', '# 왼쪽 앞다리 보정값', '보정 = 0.012'];
function simPaint(c: Ctx2, w: number, h: number, t: number, off: number, ok: number, focus: number) {
  const fault = recent(RL_LIVE.faultAt, t);
  c.fillStyle = '#071019';
  c.fillRect(0, 0, w, h);
  c.fillStyle = fault ? '#5a1414' : '#10283a';
  c.fillRect(0, 0, w, 40);
  text(c, fault ? '시뮬레이션 · 실제 로봇 이상!' : `${FIRM} 시뮬레이션 · 실제 로봇과 연결됨`, 16, 20, 22, fault ? '#ffcdd2' : '#d7eaf6');
  text(c, ok > 0.5 ? '오차 0.1 mm' : `오차 ${(off * 8.4 + 0.1).toFixed(1)} mm`, w - 16, 20, 22, ok > 0.5 ? '#7ee89e' : off > 0.3 ? '#ffd54f' : '#7ee89e', 'right');
  const grid = (x0: number, y0: number, x1: number, y1: number) => {
    c.strokeStyle = '#183347';
    c.lineWidth = 1;
    for (let x = x0; x <= x1; x += 32) {
      c.beginPath();
      c.moveTo(x, y0);
      c.lineTo(x, y1);
      c.stroke();
    }
    for (let y = y0; y <= y1; y += 32) {
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x1, y);
      c.stroke();
    }
  };
  grid(20, 56, w / 2 - 16, h - 30);
  grid(w / 2 + 16, 56, w - 20, h - 30);
  // The arm, side on: real in orange, the model in pale blue, apart by as much as the model's wrong.
  const drawArm = (color: string, a: number, b: number, width: number) => {
    const sx = w * 0.24;
    const sy = h - 44;
    const S = 150;
    const e = [sx + Math.sin(a) * S * 0.62, sy - 30 - Math.cos(a) * S * 0.62];
    const a2 = a + b;
    const wr = [e[0] + Math.sin(a2) * S * 0.6, e[1] - Math.cos(a2) * S * 0.6];
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx, sy - 30);
    c.lineTo(e[0], e[1]);
    c.lineTo(wr[0], wr[1]);
    c.lineTo(wr[0], wr[1] + 30);
    c.stroke();
    c.fillStyle = color;
    for (const p of [[sx, sy - 30], e, wr]) {
      c.beginPath();
      c.arc(p[0], p[1], pos(width), 0, Math.PI * 2);
      c.fill();
    }
  };
  const [, A1, A2] = RL_LIVE.arm;
  drawArm('#9fd6ff', A1 + off * 0.16, A2 - off * 0.1, 5);
  drawArm(ORANGE, A1, A2, 9);
  text(c, '산업용 로봇 팔', 28, h - 12, 17, '#b7d3e6');
  // The four-legged one on its course.
  const ox = w * 0.75;
  const gy = h - 56;
  const sc = 64;
  const X = (x: number) => ox + x * sc;
  const Y = (y: number) => gy - y * sc * 1.3;
  c.strokeStyle = '#6fa78c';
  c.lineWidth = 4;
  c.beginPath();
  for (let i = 0; i <= 56; i++) {
    const x = -2.8 + i * 0.1;
    const y = Y(quadGround(x));
    if (i === 0) c.moveTo(X(x), y);
    else c.lineTo(X(x), y);
  }
  c.stroke();
  const hx = RL_LIVE.quadX;
  const by = quadGround(hx) + QC.ride;
  const dir = Math.cos(RL_LIVE.quadYaw) >= 0 ? 1 : -1;
  const drawQuad = (color: string, dx: number, width: number) => {
    const bx = hx + dx;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    const fx = dir * QC.hipF;
    const dp = Math.sin(RL_LIVE.quadPitch) * QC.hipF;
    c.moveTo(X(bx - fx), Y(by - dp));
    c.lineTo(X(bx + fx), Y(by + dp));
    c.stroke();
    for (const [sgn, hi] of [[1, 0], [-1, 2]] as Array<[number, number]>) {
      const hipX = bx + sgn * fx;
      const hipY = by + sgn * dp;
      const th = RL_LIVE.quadLegs[hi];
      const kn = th + RL_LIVE.quadLegs[hi + 1];
      const kx = hipX + dir * Math.sin(th) * QC.l1;
      const ky = hipY - Math.cos(th) * QC.l1;
      c.beginPath();
      c.moveTo(X(hipX), Y(hipY));
      c.lineTo(X(kx), Y(ky));
      c.lineTo(X(kx + dir * Math.sin(kn) * QC.l2), Y(ky - Math.cos(kn) * QC.l2));
      c.stroke();
    }
  };
  drawQuad('#9fd6ff', off * 0.14, 3);
  drawQuad(fault ? '#ff5252' : '#ffffff', 0, 5);
  text(c, '사족 보행 로봇', w / 2 + 24, h - 12, 17, '#b7d3e6');
  if (focus > 0.5) {
    c.strokeStyle = '#ffd54f';
    c.lineWidth = 3;
    c.strokeRect(w * 0.24 - 80, 70, 280, 180);
  }
}
function simulatorStation(g: THREE.Group, out: Built) {
  const W = SS.wallW;
  const H = SS.wallY1 - SS.wallY0;
  const midY = (SS.wallY0 + SS.wallY1) / 2;
  part(g, box(W + 0.14, H + 0.14, 0.08), BLACK, 0, midY, SS.wallZ - 0.05);
  for (const x of [-1.4, 1.4]) part(g, box(0.1, SS.wallY0, 0.12), GRAPHITE, x, SS.wallY0 / 2, SS.wallZ - 0.05);
  const wall = liveScreen(g, W, H, 800, 300, 0, midY, SS.wallZ + 0.002);
  label(g, '시뮬레이션실', 0.8, 0.1, 0, SS.wallY1 + 0.14, SS.wallZ - 0.008, NAVY, '#ffffff');
  // The desk: two legs, a keyboard, a mouse, a monitor of code low enough to see the wall over.
  const T = SS.top;
  part(g, rbox(2.6, 0.05, 0.66, 0.02), '#e4e0d8', 0, T - 0.025, 0.28);
  for (const sx of [-1.2, 1.2]) part(g, box(0.06, T - 0.05, 0.56), GREY_D, sx, (T - 0.05) / 2, 0.28);
  part(g, box(0.44, 0.015, 0.14), GRAPHITE, SS.keys[0], T + 0.01, SS.keys[2]);
  part(g, rbox(0.06, 0.03, 0.1, 0.012), GRAPHITE, SS.mouse[0], T + 0.015, SS.mouse[2]);
  part(g, box(0.1, 0.13, 0.04), BLACK, -0.04, T + 0.065, 0.04);
  part(g, box(0.72, 0.36, 0.03), BLACK, -0.04, T + 0.3, 0.03);
  const code = liveScreen(g, 0.68, 0.32, 320, 150, -0.04, T + 0.3, 0.048);
  // A joystick and a small robot model on the desk.
  part(g, box(0.14, 0.03, 0.14), GRAPHITE, 0.92, T + 0.015, 0.34);
  rod(g, v3(0.92, T + 0.03, 0.34), v3(0.92, T + 0.15, 0.34), 0.01, BLACK);
  part(g, ball(0.025), RED, 0.92, T + 0.16, 0.34, { outline: false });
  part(g, box(0.16, 0.04, 0.12), WHITE, -0.92, T + 0.1, 0.32);
  for (const sx of [-0.06, 0.06]) for (const sz of [-0.04, 0.04]) part(g, cyl(0.006, 0.006, 0.08, 6), GRAPHITE, -0.92 + sx, T + 0.04, 0.32 + sz, { outline: false });
  chair(g, SS.seat);
  const spots: Record<string, Spot> = { rlSim: seatAt(g, 'rlSim', SS.seat), rlCode: seatAt(g, 'rlCode', SS.seat) };
  const show = (_now: string | null, N: RlNow | null, t: number) => {
    const n = N?.n ?? {};
    const off = N ? clamp01(n.off) : 0.12 + 0.05 * Math.sin(t * 0.3);
    const ok = n.ok ?? 0;
    wall.draw(`${Math.floor(t * 10)}|${q(off, 40)}|${q(ok)}`, (c) => simPaint(c, 800, 300, t, off, ok, n.focus ?? 0));
    const typed = N ? clamp01(n.typed) : 0;
    const build = n.build ?? 0;
    code.draw(`${q(typed, 40)}|${q(build, 10)}|${Math.floor(t * 2)}`, (c) => {
      c.fillStyle = '#0f1a24';
      c.fillRect(0, 0, 320, 150);
      const shown = Math.floor(typed * CODE_LINES.length) + (N ? 2 : CODE_LINES.length);
      for (let i = 0; i < Math.min(shown, CODE_LINES.length); i++) text(c, CODE_LINES[i], 8, 12 + i * 15, 12, i === 6 ? '#7ee89e' : i % 2 ? '#9fd6ff' : '#d7eaf6', 'left', false);
      if (build > 0) {
        c.fillStyle = '#31475a';
        c.fillRect(8, 134, 304, 10);
        c.fillStyle = '#7ee89e';
        c.fillRect(8, 134, 304 * clamp01(build), 10);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, {}, show);
  out.work = marker(g, SS.keys[0], SS.keys[1], SS.keys[2]);
}

// =============================================================================================
// 시험 보드 (rlReviewBoard, 3 × 1): the week's tests, marked up by hand; a meeting's held in front of it.

function reviewBoard(g: THREE.Group, out: Built) {
  const W = BR.x1 - BR.x0;
  const H = BR.y1 - BR.y0;
  const mid = onBoard(0.5, 0.5);
  part(g, box(W + 0.1, H + 0.1, 0.05), GREY, mid[0], mid[1], BR.z - 0.03);
  for (const x of [-1.2, 1.2]) part(g, box(0.05, BR.y0, 0.05), GREY_D, x, BR.y0 / 2, BR.z - 0.04);
  part(g, box(W, 0.03, 0.08), GREY, 0, BR.y0 - 0.03, BR.z + 0.03);
  const face = liveScreen(g, W, H, 640, 300, mid[0], mid[1], mid[2]);
  const pen = markerTool(g);
  const mates = [person(g, '#546e7a', '#263238', '#2b1b10', -1.0, 1.16, Math.PI * 0.84, 'male'), person(g, '#8d6e63', '#37474f', '#5b3a1e', 1.04, 1.16, -Math.PI * 0.84, 'female')];
  const tools: Partial<Record<RlTool, HeldTool>> = { marker: { tool: pen, lead: 'right', grips: PEN(0.011) } };
  const spots: Record<string, Spot> = { rlLog: standAt(g, 'rlLog', -0.5, BR.stand), roboticist_leadDemo: standAt(g, 'rlLead', 0.05, BR.stand) };
  const talk = new THREE.Vector3();
  const show = (now: string | null, N: RlNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const inUse = !!now;
    const w0 = inUse ? clamp01(n.w0) : 1;
    const w1 = inUse ? clamp01(n.w1) : 1;
    const w2 = inUse ? clamp01(n.w2) : 1;
    const tick = inUse ? clamp01(n.tick) : 1;
    face.draw(`${q(w0)}|${q(w1)}|${q(w2)}|${q(tick)}`, (c) => {
      c.fillStyle = '#fbfcfa';
      c.fillRect(0, 0, 640, 300);
      text(c, '이번 주 시험', 18, 26, 30, NAVY);
      c.strokeStyle = '#cdd5da';
      c.lineWidth = 2;
      c.strokeRect(18, 52, 170, 220);
      const rows: Array<[string, string, number]> = [['팔 사이클', '6.1초', w0], ['네발 계단', '3/3 통과', w1], ['서빙 코너', '수정 완료', w2]];
      rows.forEach(([a, b, e], i) => {
        const y = 120 + i * 51;
        text(c, a, 200, y, 24, BLACK);
        const len = 180 * e;
        c.save();
        c.beginPath();
        c.rect(362, y - 18, len, 36);
        c.clip();
        text(c, b, 362, y, 24, BLUE);
        c.restore();
      });
      for (let i = 0; i < 3; i++) {
        c.fillStyle = ['#ffe082', '#a5d6a7', '#90caf9'][i];
        c.fillRect(30 + i * 8, 66 + i * 52, 140, 42);
        text(c, ['오작동 원인', '다음 시연', '안전 점검'][i], 40 + i * 8, 88 + i * 52, 18, BLACK);
      }
      if (tick > 0.3) {
        c.strokeStyle = RED;
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(556, 216);
        c.lineTo(572 , 234);
        c.lineTo(604, 198);
        c.stroke();
      }
    });
    at(pen, N?.tool === 'marker' ? P.marker : BR.home);
    const count = n.mates ?? 0;
    mates.forEach((F, i) => {
      F.root.visible = count > i;
      if (count <= i) return;
      const says = (n.says ?? 0) > 0.5;
      F.opts.nod = (n.nods ?? 0) > 0.5 ? 0.14 + 0.16 * Math.sin(t * 6 + i) : 0.04;
      F.head.rotation.x = F.opts.nod;
      talk.set(i === 0 ? -0.72 : 0.76, 1.3 + 0.05 * Math.sin(t * 4), 1.1);
      F.armR(i === 0 && says ? talk : null);
      F.armL(i === 1 && says ? talk : null);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, mid[0], mid[1], mid[2] + 0.1);
}

// =============================================================================================
// 3D 프린터 (rlPrinter, 1 × 1): a stand and a cube printer, its head running over a bracket that grows.

function printer(g: THREE.Group, out: Built) {
  const Y = 0.72;
  part(g, box(0.84, Y, 0.72), GREY, 0, Y / 2, -0.04);
  part(g, box(0.86, 0.03, 0.74), '#dfe3e6', 0, Y + 0.015, -0.04);
  // The cube: posts, a roof, a clear door.
  const S = 0.62;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, S, 0.03), GRAPHITE, sx * 0.3, Y + 0.05 + S / 2, sz * 0.25 + PR.bed[2] - 0.05);
  part(g, box(0.64, 0.04, 0.54), GRAPHITE, 0, Y + 0.05 + S, PR.bed[2] - 0.05);
  part(g, box(0.64, 0.05, 0.54), '#37424a', 0, Y + 0.05, PR.bed[2] - 0.05);
  glass(g, 0.6, S - 0.04, 0, Y + 0.05 + S / 2, PR.bed[2] - 0.3, 0, 0.14);
  for (const sx of [-1, 1]) glass(g, 0.5, S - 0.04, sx * 0.31, Y + 0.05 + S / 2, PR.bed[2] - 0.05, Math.PI / 2, 0.14);
  const door = group(g, 0.3, 0, PR.bed[2] + 0.22);
  glass(door, 0.6, S - 0.04, -0.3, Y + 0.05 + S / 2, 0, 0, 0.18);
  part(door, box(0.02, 0.1, 0.02), CHROME, -0.54, Y + 0.3, 0.012, { outline: false });
  // The bed and what's being made on it.
  const bed = group(g, PR.bed[0], PR.bed[1], PR.bed[2]);
  part(bed, box(0.34, 0.012, 0.3), '#1f2a30', 0, -0.012, 0, { outline: false });
  for (const sx of [-0.14, 0.14]) part(bed, cyl(0.009, 0.009, 0.24, 8), CHROME, sx, -0.13, -0.1, { outline: false });
  const made = group(bed);
  part(made, box(0.05, 0.1, 0.06), '#fff4e3', 0, 0.05, 0, { outline: false });
  part(made, box(0.16, 0.03, 0.06), '#fff4e3', 0.05, 0.015, 0, { outline: false });
  // The head on its rails, its filament from a spool on top.
  const rail = group(g, 0, Y + 0.56, PR.bed[2]);
  part(rail, box(0.56, 0.018, 0.018), CHROME, 0, 0, 0, { outline: false });
  const head = group(rail, 0, 0, 0);
  part(head, rbox(0.07, 0.07, 0.06, 0.01), ORANGE, 0, 0, 0);
  part(head, cyl(0.004, 0.012, 0.04, 8), '#d4af37', 0, -0.05, 0, { outline: false });
  part(g, cyl(0.08, 0.08, 0.05, 16), BLUE, 0.1, Y + 0.05 + S + 0.06, PR.bed[2] - 0.1, { rx: Math.PI / 2 });
  // The panel, a tray for what's done.
  const Pn = PR.panel;
  part(g, rbox(0.2, 0.12, 0.03, 0.01), GRAPHITE, Pn[0], Pn[1], Pn[2] - 0.03);
  part(g, box(0.05, 0.05, 0.1), GREY_D, Pn[0], Pn[1] - 0.04, Pn[2] - 0.09, { outline: false });
  const screen = liveScreen(g, 0.16, 0.08, 96, 48, Pn[0], Pn[1], Pn[2] - 0.012);
  const Ty = PR.tray;
  part(g, box(0.2, 0.012, 0.16), GREY_D, Ty[0], Ty[1] - 0.03, Ty[2], { outline: false });
  part(g, box(0.03, 0.09, 0.12), GREY, Ty[0], Ty[1] - 0.08, Ty[2] - 0.06, { outline: false });
  const inTray = bracketTool(g);
  inTray.name = 'rlBracketDone';
  inTray.position.set(Ty[0], Ty[1], Ty[2]);
  const br = bracketTool(g);
  const tools: Partial<Record<RlTool, HeldTool>> = { bracket: { tool: br, lead: 'right', grips: { right: { at: v3(0, 0.02, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.012 } } } };
  const spots: Record<string, Spot> = { rlPrint: standAt(g, 'rlPrint', 0.02, PR.stand) };
  const show = (_now: string | null, N: RlNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const L = frac(t / 22);
    const h = N ? clamp01(n.h) : L < 0.85 ? L / 0.85 : 1;
    const running = N ? (n.heads ?? 0) > 0.5 : L < 0.85;
    const carried = (n.carried ?? 0) > 0.5;
    made.visible = !carried && h > 0.01;
    made.scale.y = Math.max(0.01, h);
    bed.position.y = PR.bed[1] + 0.02 * (1 - h);
    rail.position.y = PR.bed[1] + 0.06 + 0.1 * h;
    head.position.x = running ? 0.14 * Math.sin(t * 7) : 0.24;
    head.position.z = running ? 0.04 * Math.sin(t * 4.3) : 0;
    door.rotation.y = 1.5 * clamp01(n.door);
    inTray.visible = (n.inTray ?? 0) > 0.5;
    at(br, N?.tool === 'bracket' ? P.bracket : null);
    const pct = Math.round(h * 100);
    screen.draw(`${pct}|${n.lit ?? 0}`, (c) => {
      c.fillStyle = '#0c1820';
      c.fillRect(0, 0, 96, 48);
      text(c, `출력 ${pct}%`, 6, 14, 14, running ? '#7ee89e' : '#d7eaf6');
      c.fillStyle = '#31475a';
      c.fillRect(6, 30, 84, 10);
      c.fillStyle = '#7ee89e';
      c.fillRect(6, 30, 84 * h, 10);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, Pn[0], Pn[1], Pn[2]);
}

// =============================================================================================
// Set dressing.

/** Open shelves of bins: servos, bearings, boards, sensors, each labelled. */
function partsShelf(g: THREE.Group) {
  const T = 1.86;
  for (const x of [-1.42, 0, 1.42]) part(g, box(0.05, T, 0.5), GREY, x, T / 2, 0);
  const rows = [0.32, 0.8, 1.28, 1.8];
  for (const y of rows) part(g, box(2.88, 0.03, 0.5), GREY, 0, y, 0);
  const NAMES = ['서보 모터', '베어링', '제어 보드', '거리 센서', '배터리 팩', '케이블'];
  const r = seeded(83);
  rows.slice(0, 3).forEach((y, j) => {
    for (let i = 0; i < 6; i++) {
      const x = -1.14 + i * 0.46;
      if (r() < 0.12) continue;
      part(g, rbox(0.38, 0.26, 0.36, 0.01), ['#2f6fd0', '#ef7d22', '#546e7a'][Math.floor(r() * 3)], x, y + 0.145, 0.02);
      label(g, NAMES[wrap(i + j * 2, NAMES.length)], 0.3, 0.07, x, y + 0.15, 0.204, '#ffffff', BLACK);
    }
  });
  label(g, '부품 선반 · 쓴 만큼 적어 주세요', 1.4, 0.09, 0, T + 0.06, 0.2, NAVY, '#ffffff');
}
/** Spares for the robots: legs hung on a rail by their hips, an arm's link, a gripper, batteries on the bench below. */
function legRack(g: THREE.Group) {
  part(g, box(2.9, 0.05, 0.05), GREY_D, 0, 1.56, -0.3);
  for (const x of [-1.4, 1.4]) part(g, box(0.05, 1.58, 0.05), GREY_D, x, 0.79, -0.3);
  part(g, box(2.9, 0.04, 0.46), WOOD, 0, 0.62, -0.08);
  for (const x of [-1.3, 1.3]) part(g, box(0.05, 0.62, 0.4), GREY, x, 0.31, -0.08, { outline: false });
  for (let i = 0; i < 4; i++) {
    const x = -1.02 + i * 0.3;
    const H = group(g, x, 1.5, -0.26);
    part(H, cyl(0.04, 0.04, 0.05, 12), ORANGE, 0, 0, 0, { rx: Math.PI / 2 });
    part(H, rbox(0.05, QC.l1 + 0.03, 0.04, 0.016), GRAPHITE, 0, -QC.l1 / 2, 0);
    part(H, cyl(0.013, 0.018, QC.l2, 10), WHITE, 0, -QC.l1 - QC.l2 / 2, 0);
    part(H, ball(0.024), BLACK, 0, -QC.l1 - QC.l2, 0, { outline: false });
  }
  // An arm's spare link, hung; a gripper and batteries on the bench.
  part(g, rbox(0.14, 0.58, 0.16, 0.05), ORANGE, 0.48, 1.2, -0.24);
  part(g, cyl(0.1, 0.1, 0.22, 16), ORANGE_D, 0.48, 1.46, -0.24, { rz: Math.PI / 2 });
  part(g, box(0.13, 0.03, 0.05), '#90a4ae', 1.02, 0.66, -0.06, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.014, 0.12, 0.04), GRAPHITE, 1.02 + sx * 0.05, 0.73, -0.06, { outline: false });
  for (let i = 0; i < 4; i++) {
    part(g, rbox(0.2, 0.09, 0.13, 0.01), '#37474f', -1.0 + i * 0.24, 0.685, 0.02);
    ownLit(g, box(0.05, 0.012, 0.003), i === 2 ? AMBER : LED, -1.0 + i * 0.24, 0.7, 0.087);
  }
  label(g, '예비 다리 · 예비 부품', 0.9, 0.09, 0, 1.46, -0.27, NAVY, '#ffffff');
}
/** The company's first gripper in a case, opening and closing for whoever's waiting in the lobby. */
function showcase(g: THREE.Group, out: Built) {
  part(g, box(2.4, 0.74, 0.7), '#37424a', 0, 0.37, 0);
  part(g, box(2.44, 0.03, 0.74), '#dfe3e6', 0, 0.755, 0);
  label(g, `${FIRM} 첫 번째 그리퍼 · 2009`, 1.2, 0.09, 0, 0.56, 0.354, '#37424a', '#ffffff');
  const bs = group(g, -0.3, 0.77, 0);
  part(bs, cyl(0.1, 0.12, 0.12, 16), GRAPHITE, 0, 0.06, 0);
  const a1 = group(bs, 0, 0.12, 0);
  part(a1, rbox(0.06, 0.34, 0.07, 0.02), ORANGE, 0, 0.17, 0);
  const a2 = group(a1, 0, 0.34, 0);
  part(a2, cyl(0.035, 0.035, 0.09, 12), GRAPHITE, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(a2, rbox(0.05, 0.22, 0.05, 0.016), ORANGE, 0, 0.11, 0);
  const h = group(a2, 0, 0.22, 0);
  part(h, box(0.12, 0.022, 0.04), '#90a4ae', 0, 0.01, 0, { outline: false });
  const fs = [-1, 1].map((sx) => {
    const f = group(h, sx * 0.05, 0.02, 0);
    part(f, box(0.012, 0.09, 0.03), GRAPHITE, 0, 0.045, 0, { outline: false });
    return f;
  });
  // A model of the walker beside it, on a plinth.
  const Q = quadBot(g);
  Q.root.scale.setScalar(0.72);
  const qp = quadPose(0, 0, 0);
  Q.root.position.set(0.68, 0.77 + qp.y * 0.72, 0);
  Q.root.rotation.y = -0.5;
  Q.hips.forEach((m, i) => (m.rotation.z = qp.hip[i]));
  Q.knees.forEach((m, i) => (m.rotation.z = qp.knee[i]));
  glass(g, 2.4, 0.86, 0, 1.2, 0.34, 0, 0.1);
  glass(g, 2.4, 0.86, 0, 1.2, -0.34, 0, 0.1);
  for (const sx of [-1, 1]) glass(g, 0.68, 0.86, sx * 1.2, 1.2, 0, Math.PI / 2, 0.1);
  part(g, box(2.44, 0.02, 0.72), GREY_D, 0, 1.64, 0, { outline: false });
  ownLit(g, box(2.2, 0.01, 0.05), ICE, 0, 1.625, 0);
  out.away = (_o, t) => {
    a1.rotation.x = 0.26 * Math.sin(t * 0.8);
    a2.rotation.x = 0.5 * Math.sin(t * 0.8 + 1);
    const o = 0.5 + 0.5 * Math.sin(t * 2.2);
    fs.forEach((f, i) => (f.position.x = (i === 0 ? -1 : 1) * (0.022 + 0.04 * o)));
    bs.rotation.y = 0.5 * Math.sin(t * 0.4);
    Q.lidar.rotation.y = t * 3;
  };
}
function labSign(g: THREE.Group) {
  part(g, box(0.82, 1.82, 0.05), NAVY, 0, 0.98, -0.38);
  picture(g, painted('rlSign', 340, 720, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 340, 720);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 340, 96);
    text(c, FIRM, 170, 50, 34, '#ffffff', 'center');
    text(c, '로봇 연구소 안내', 170, 132, 28, NAVY, 'center');
    ['① 노란 선 안은 위험해요', '② 팔이 움직일 땐 멀찍이', '③ 비상 정지는 빨간 버튼', '④ 사족 로봇 앞을 막지 마세요', '⑤ 시연은 안내에 따라요'].forEach((s, i) => text(c, s, 14, 200 + i * 66, 21, BLACK));
    c.fillStyle = ORANGE;
    c.fillRect(0, 590, 340, 130);
    text(c, '한 걸음씩', 170, 630, 30, '#ffffff', 'center');
    text(c, '똑바로 걸어요', 170, 676, 30, '#ffffff', 'center');
  }), 0.78, 1.72, 0, 0.98, -0.35);
  part(g, cyl(0.26, 0.28, 0.03, 18), GREY_D, 0, 0.015, -0.36);
}

export const BUILDERS: Record<string, Builder> = {
  rlArmCell(g, _W, _D, _c, _def, _ctx, out) {
    armCell(g, out);
  },
  rlQuadCourse(g, _W, _D, _c, _def, _ctx, out) {
    quadCourse(g, out);
  },
  rlAssemblyBench(g, _W, _D, _c, _def, _ctx, out) {
    assemblyBench(g, out);
  },
  rlChargeDock(g, _W, _D, _c, _def, _ctx, out) {
    chargeDock(g, out);
  },
  rlSimulatorStation(g, _W, _D, _c, _def, _ctx, out) {
    simulatorStation(g, out);
  },
  rlReviewBoard(g, _W, _D, _c, _def, _ctx, out) {
    reviewBoard(g, out);
  },
  rlPrinter(g, _W, _D, _c, _def, _ctx, out) {
    printer(g, out);
  },
  rlPartsShelf(g) {
    partsShelf(g);
  },
  rlLegRack(g) {
    legRack(g);
  },
  rlShowcase(g, _W, _D, _c, _def, _ctx, out) {
    showcase(g, out);
  },
  rlLabSign(g) {
    labSign(g);
  },
};
