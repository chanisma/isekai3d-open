import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { BOXES, CAR, CB, GA, LD, LOOP, LS, S0, SB, SD_LIVE, TR, carPose, onBoard, onPad, sdNow, sdPhase, type SdMotion, type SdNow, type SdTool } from './selfDrivingMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 자율주행차 개발 센터 drawn as itself (2026-11-01, a new career at the user's request), of a made-up company, 누리길모빌리티.
 * An indoor test track with a painted loop, a zebra crossing and a dummy that walks it on a rail; a white test car with a spinning
 * roof lidar and sensors that drives the loop with the dweller in its safety operator's seat, a red button on a post that really halts
 * it; a checker board on wheels and a rig of sensors; a desk whose point cloud follows the run; a pen display for labelling road
 * scenes; a second car on a four-post lift with its hood up. Everything that moves follows selfDrivingMotion.ts. All names are made up.
 */

const FIRM = '누리길모빌리티';
const WHITE = '#f1f4f6';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const TEAL = '#00a0a8';
const NAVY = '#123a5a';
const ORANGE = '#f57c00';
const AMBER = '#ffb300';
const RED = '#e53935';
const LED = '#76ff8a';
const ICE = '#d9f2ff';
const PAPER = '#fbfaf6';
const SKIN = '#f1c9a5';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP_V = v3(0, 1, 0);
const tmp = new THREE.Vector3();
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
function standAt(g: THREE.Object3D, motion: SdMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: SdMotion, seat: V): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<SdTool, HeldTool>>, show: (now: string | null, N: SdNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? sdNow(sp.motion as SdMotion, t, sdPhase(g.getWorldPosition(tmp)), H) : null;
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
function stripLamp(g: THREE.Object3D, w: number, x: number, y: number, z: number) {
  part(g, box(w + 0.04, 0.03, 0.09), GREY_D, x, y + 0.018, z, { outline: false });
  ownLit(g, box(w, 0.012, 0.07), ICE, x, y, z);
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

function tabletTool(g: THREE.Object3D, paintFace: (c: Ctx2) => void) {
  const root = group(g);
  root.name = 'sdTablet';
  const tilt = group(root);
  tilt.rotation.x = -0.55;
  part(tilt, rbox(0.24, 0.17, 0.012, 0.006), GRAPHITE, 0, 0, 0, { outline: false });
  const face = liveScreen(tilt, 0.22, 0.15, 192, 132, 0, 0, 0.0075);
  return { root, draw: (key: string) => face.draw(key, paintFace) };
}
const TABLET_GRIPS: HeldTool['grips'] = { left: boardGrip(0.55) };
function driverTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'sdDriver';
  part(root, cyl(0.016, 0.014, 0.1, 10), '#1565c0', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.004, 0.004, 0.06, 8), CHROME, 0, 0, -0.08, { rx: Math.PI / 2, outline: false });
  return root;
}
const DRIVER_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.015 } };
/** The dummy's remote: a grey handset with an aerial, its buttons under the thumb. */
function remoteTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'sdRemote';
  part(root, rbox(0.05, 0.13, 0.026, 0.008), GRAPHITE, 0, 0, 0, { outline: false });
  part(root, cyl(0.004, 0.003, 0.09, 6), GREY, 0.014, 0.11, 0, { outline: false });
  ownLit(root, box(0.014, 0.014, 0.002), RED, 0, 0.03, 0.014);
  ownLit(root, box(0.03, 0.012, 0.002), LED, 0, 0.05, 0.014);
  return root;
}
const REMOTE_GRIP: HeldTool['grips'] = { left: { at: v3(0, -0.02, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.02 } };
/** A folded cleaning cloth, held flat. */
function clothTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'sdCloth';
  part(root, rbox(0.1, 0.022, 0.12, 0.008), '#7fc8e8', 0, 0, 0, { outline: false });
  return root;
}
const CLOTH_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'flat', radius: 0.012 } };
/** A stylus: its grip at the origin, the tip 64 mm along -z, tipped so the tip is down and away. */
function stylusTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'sdStylus';
  root.rotation.x = -0.95;
  part(root, cyl(0.006, 0.005, 0.13, 8), GRAPHITE, 0, 0, 0.0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.002, 0.005, 0.012, 8), GREY, 0, 0, -0.058, { rx: Math.PI / 2, outline: false });
  return root;
}
const STYLUS_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pen', radius: 0.007 } };
/** A torch pointed up at the underside. */
function torchTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'sdTorch';
  root.rotation.x = 1.25;
  part(root, cyl(0.015, 0.015, 0.14, 10), GRAPHITE, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.024, 0.016, 0.03, 12), GREY_D, 0, 0, -0.085, { rx: Math.PI / 2, outline: false });
  ownLit(root, cyl(0.02, 0.02, 0.004, 12), '#ffe08a', 0, 0, -0.102).rotation.x = Math.PI / 2;
  const beam = haze(root, new THREE.ConeGeometry(0.1, 0.34, 14, 1, true), '#fff2b0', 0, 0, 0, -0.27);
  beam.rotation.x = -Math.PI / 2;
  return { root, beam };
}
const TORCH_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.015 } };

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
// The test car: nose +x, its left -z (the driver's side). A clear roof so whoever's in the seat is seen.

interface TestCar {
  root: THREE.Group;
  door: THREE.Group;
  hood: THREE.Group;
  wheelsF: THREE.Group[];
  wheels: THREE.Group[];
  steering: THREE.Group;
  head: THREE.Group;
  brake: THREE.Group;
  hazard: THREE.Group;
  beacon: THREE.Mesh;
  computer: THREE.Mesh;
  bay: THREE.Group;
}
function testCar(parent: THREE.Object3D, no: string): TestCar {
  const root = group(parent);
  const { L, Wd } = CAR;
  const fx = L / 2;
  const bx = -L / 2;
  // The body in three: tail and cabin floor, the bonnet's sides, the sills; the bonnet itself is a group that lifts.
  part(root, rbox(L - 1.0, 0.48, Wd, 0.14), WHITE, -0.5, 0.57, 0);
  part(root, rbox(0.88, 0.32, Wd, 0.1), WHITE, 1.16, 0.49, 0);
  part(root, box(0.88, 0.1, 0.14), WHITE, 1.16, 0.75, Wd / 2 - 0.07, { outline: false });
  part(root, box(0.88, 0.1, 0.14), WHITE, 1.16, 0.75, -Wd / 2 + 0.07, { outline: false });
  part(root, box(0.1, 0.1, Wd - 0.28), WHITE, fx - 0.05, 0.75, 0, { outline: false });
  part(root, rbox(L * 0.97, 0.08, Wd - 0.02, 0.04), '#3a3d42', 0, 0.32, 0);
  // Under the bonnet: a dark well, the battery cover and the driving computer in its bracket.
  const bay = group(root);
  part(bay, box(0.72, 0.03, Wd - 0.32), '#1c2125', 1.14, 0.66, 0, { outline: false });
  part(bay, rbox(0.34, 0.12, 0.42, 0.02), GRAPHITE, GA.boxAt[0], 0.72, 0);
  for (let i = 0; i < 5; i++) part(bay, box(0.3, 0.012, 0.012), GREY_D, GA.boxAt[0], 0.785, -0.16 + i * 0.08, { outline: false });
  const computer = ownLit(bay, box(0.03, 0.012, 0.03), AMBER, GA.boxAt[0] - 0.13, 0.79, 0.17);
  part(bay, cyl(0.012, 0.012, 0.3, 6), ORANGE, 0.92, 0.72, 0.1, { rz: Math.PI / 2, outline: false });
  part(bay, cyl(0.012, 0.012, 0.3, 6), '#1e88e5', 0.92, 0.72, -0.12, { rz: Math.PI / 2, outline: false });
  // The bonnet, hinged at the scuttle.
  const hood = group(root, GA.hoodX, 0.84, 0);
  part(hood, rbox(GA.hoodL, 0.04, Wd - 0.04, 0.02), WHITE, GA.hoodL / 2, 0, 0);
  part(hood, box(GA.hoodL - 0.04, 0.002, 0.14), TEAL, GA.hoodL / 2, 0.022, 0, { outline: false });
  // A stripe, the lettering on both sides, and the number.
  for (const s of [-1, 1]) {
    part(root, box(L - 1.1, 0.05, 0.004), TEAL, -0.5, 0.48, s * (Wd / 2 + 0.002), { outline: false });
    label(root, '자율주행 시험차', 0.72, 0.1, -0.95, 0.66, s * (Wd / 2 + 0.006), TEAL, '#ffffff', s > 0 ? 0 : Math.PI);
    part(root, rbox(0.1, 0.07, 0.07, 0.02), WHITE, 0.5, 0.92, s * (Wd / 2 + 0.05));
  }
  label(root, no, 0.34, 0.1, bx - 0.006, 0.6, 0, '#ffffff', BLACK, -Math.PI / 2);
  // Cabin: pillars, a clear roof in a white frame, glass all round.
  const wsFoot = 0.64;
  const wsTop = 0.14;
  const tailTop = -1.22;
  const tailFoot = -1.5;
  const roofY = 1.33;
  for (const s of [-1, 1]) {
    const z = s * (Wd / 2 - 0.08);
    rod(root, v3(wsFoot, 0.81, z), v3(wsTop, roofY, z), 0.028, WHITE);
    rod(root, v3(tailFoot, 0.81, z), v3(tailTop, roofY, z), 0.04, WHITE);
    rod(root, v3(-0.56, 0.81, z), v3(-0.56, roofY, z), 0.03, WHITE);
    part(root, box(wsTop - tailTop, 0.05, 0.08), WHITE, (wsTop + tailTop) / 2, roofY, z);
  }
  for (const x of [wsTop, tailTop]) part(root, box(0.06, 0.05, Wd - 0.16), WHITE, x, roofY, 0);
  const shade = '#bfe3f2';
  const roofGlass = haze(root, new THREE.PlaneGeometry(wsTop - tailTop, Wd - 0.2), shade, 0.14, (wsTop + tailTop) / 2, roofY, 0);
  roofGlass.rotation.x = -Math.PI / 2;
  const front = haze(root, new THREE.PlaneGeometry(Wd - 0.14, Math.hypot(wsFoot - wsTop, roofY - 0.81)), shade, 0.16, (wsFoot + wsTop) / 2, (roofY + 0.81) / 2, 0);
  front.rotation.set(-Math.atan2(wsFoot - wsTop, roofY - 0.81), Math.PI / 2, 0, 'YXZ');
  haze(root, new THREE.PlaneGeometry(Wd - 0.14, roofY - 0.81), shade, 0.18, (tailFoot + tailTop) / 2, (roofY + 0.81) / 2, 0).rotation.y = Math.PI / 2;
  // The right side's glass (the left's goes on the door).
  haze(root, new THREE.PlaneGeometry(wsFoot - tailFoot - 0.3, roofY - 0.84), shade, 0.14, -0.38, (roofY + 0.84) / 2, Wd / 2 - 0.05);
  haze(root, new THREE.PlaneGeometry(0.72, roofY - 0.84), shade, 0.14, -0.98, (roofY + 0.84) / 2, -Wd / 2 + 0.05);
  // The left front door: its panel and glass, hinged ahead of the seat. Behind it, dark when it's opened.
  const hx = 0.24;
  part(root, box(0.84, 0.44, 0.004), '#20262b', hx - 0.44, 0.58, -Wd / 2 - 0.001, { outline: false });
  const door = group(root, hx, 0, -Wd / 2);
  part(door, rbox(0.8, 0.46, 0.05, 0.02), WHITE, -0.42, 0.58, -0.022);
  part(door, box(0.8, 0.05, 0.004), TEAL, -0.42, 0.48, -0.05, { outline: false });
  part(door, rbox(0.13, 0.025, 0.022, 0.008), CHROME, -0.72, 0.74, -0.056, { outline: false });
  haze(door, new THREE.PlaneGeometry(0.76, roofY - 0.84), shade, 0.14, -0.42, (roofY + 0.84) / 2, 0);
  // Seats, the dash with its screen, a red stop on the console.
  const seat = '#37474f';
  for (const z of [CAR.dz, -CAR.dz]) {
    part(root, rbox(0.46, 0.1, 0.46, 0.05), seat, CAR.sx, CAR.seatY - 0.06, z);
    part(root, rbox(0.12, 0.62, 0.46, 0.05), seat, CAR.sx - 0.28, CAR.seatY + 0.28, z, { rz: 0.14 });
    part(root, rbox(0.1, 0.14, 0.26, 0.04), GRAPHITE, CAR.sx - 0.35, CAR.seatY + 0.66, z);
  }
  part(root, rbox(0.34, 0.16, Wd - 0.2, 0.05), '#2a2f34', 0.46, 0.88, 0);
  ownLit(root, box(0.004, 0.11, 0.3), '#7fdbff', 0.285, 0.95, 0.16);
  part(root, cyl(0.03, 0.03, 0.02, 12), RED, 0.28, 0.91, 0.42, { rz: Math.PI / 2, outline: false });
  // The wheel.
  const hub = group(root, CAR.hubX, CAR.hubY, CAR.dz);
  hub.rotation.z = 0.4;
  const steering = group(hub);
  part(steering, new THREE.TorusGeometry(0.17, 0.016, 8, 24), '#1a1a1a', 0, 0, 0, { ry: Math.PI / 2, outline: false });
  part(steering, cyl(0.045, 0.045, 0.04, 12), '#2b2b2b', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  for (const [y, z] of [[-0.16, 0], [0.05, 0.16], [0.05, -0.16]] as const) rod(steering, v3(0, 0, 0), v3(0, y, z), 0.012, '#1a1a1a');
  rod(root, v3(CAR.hubX + 0.02, CAR.hubY, CAR.dz), v3(CAR.hubX + 0.24, 0.8, CAR.dz), 0.025, '#1a1a1a');
  // Wheels, the front two steering.
  const wheels: THREE.Group[] = [];
  const wheelsF: THREE.Group[] = [];
  for (const x of [-0.98, 0.98])
    for (const s of [-1, 1]) {
      const carrier = group(root, x, 0.3, s * (Wd / 2 - 0.09));
      const w = group(carrier);
      part(w, cyl(0.3, 0.3, 0.2, 22), '#141414', 0, 0, 0, { rx: Math.PI / 2 });
      part(w, cyl(0.18, 0.18, 0.205, 16), STEEL, 0, 0, 0, { rx: Math.PI / 2, outline: false });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        part(w, box(0.04, 0.14, 0.01), GREY, Math.cos(a) * 0.08, Math.sin(a) * 0.08, s * 0.105, { rz: a + Math.PI / 2, outline: false });
      }
      wheels.push(w);
      if (x > 0) wheelsF.push(carrier);
    }
  // Lamps.
  const brake = group(root);
  const hazard = group(root);
  for (const s of [-1, 1]) {
    part(root, rbox(0.05, 0.1, 0.32, 0.03), '#eceff1', fx - 0.01, 0.69, s * (Wd / 2 - 0.24));
    ownLit(root, box(0.012, 0.07, 0.26), '#fffde7', fx + 0.018, 0.69, s * (Wd / 2 - 0.24));
    part(root, rbox(0.05, 0.12, 0.3, 0.03), '#8e1b1b', bx + 0.01, 0.7, s * (Wd / 2 - 0.22));
    ownLit(brake, box(0.012, 0.1, 0.26), '#ff3d3d', bx - 0.018, 0.7, s * (Wd / 2 - 0.22));
    for (const x of [fx + 0.02, bx - 0.02]) ownLit(hazard, box(0.012, 0.05, 0.08), '#ffa726', x, 0.8, s * (Wd / 2 - 0.1));
  }
  brake.visible = hazard.visible = false;
  // Sensors: a rack across the roof's front, the lidar spinning on its tower, cameras, corner radars, a front bar.
  part(root, box(0.1, 0.05, Wd - 0.1), GRAPHITE, -0.08, roofY + 0.05, 0);
  for (const s of [-1, 1]) part(root, box(0.08, 0.05, 0.06), GRAPHITE, -0.08, roofY + 0.02, s * (Wd / 2 - 0.1), { outline: false });
  part(root, cyl(0.06, 0.08, 0.1, 14), GRAPHITE, -0.08, roofY + 0.13, 0, { outline: false });
  const head = group(root, -0.08, roofY + 0.25, 0);
  part(head, cyl(0.1, 0.1, 0.14, 18), '#20262b', 0, 0, 0);
  part(head, cyl(0.104, 0.104, 0.03, 18), TEAL, 0, 0.055, 0, { outline: false });
  ownLit(head, box(0.05, 0.05, 0.012), '#ff5a5a', 0, -0.01, 0.1);
  ownLit(head, box(0.05, 0.05, 0.012), '#5ad0ff', 0, -0.01, -0.1);
  for (const z of [-0.42, -0.14, 0.14, 0.42]) {
    part(root, rbox(0.08, 0.06, 0.08, 0.015), BLACK, -0.02, roofY + 0.05, z, { outline: false });
    ownLit(root, cyl(0.022, 0.022, 0.004, 10), '#3f8fd0', 0.022, roofY + 0.05, z).rotation.z = Math.PI / 2;
  }
  for (const [x, z] of [[1.45, -0.62], [1.45, 0.62], [-1.45, -0.62], [-1.45, 0.62]] as const) {
    part(root, rbox(0.14, 0.08, 0.12, 0.02), GRAPHITE, x, 0.7, z, { outline: false });
    ownLit(root, box(0.1, 0.03, 0.004), '#65707a', x, 0.7, z + Math.sign(z) * 0.062);
  }
  part(root, rbox(0.05, 0.08, Wd - 0.4, 0.02), GRAPHITE, fx + 0.012, 0.56, 0, { outline: false });
  // An amber beacon on the rack's end.
  const beacon = ownLit(root, cyl(0.04, 0.05, 0.08, 12), '#6b4c00', -0.32, roofY + 0.09, 0);
  return { root, door, hood, wheelsF, wheels, steering, head, brake, hazard, beacon, computer, bay };
}

// =============================================================================================
// 실외 시험 코스 (sdTrack, 12 × 6; outdoors since 2026-11-05, the layout audit): the course painted, the dummy, the post, the car driving.

function trackFloor(c: Ctx2) {
  const P = 100;
  const px = (x: number) => (x + 6) * P;
  const pz = (z: number) => (z + 3) * P;
  c.fillStyle = '#a9b1b6';
  c.fillRect(0, 0, 1200, 600);
  // Concrete slabs.
  c.strokeStyle = '#98a1a6';
  c.lineWidth = 2;
  for (let x = 0; x <= 1200; x += 200) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 600);
    c.stroke();
  }
  for (let y = 0; y <= 600; y += 200) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(1200, y);
    c.stroke();
  }
  const loop = () => {
    const x0 = px(-TR.a);
    const x1 = px(TR.a);
    const y0 = pz(TR.zF);
    const y1 = pz(TR.zN);
    const r = TR.r * P;
    c.beginPath();
    c.moveTo(x0 + r, y0);
    c.lineTo(x1 - r, y0);
    c.arcTo(x1, y0, x1, y0 + r, r);
    c.lineTo(x1, y1 - r);
    c.arcTo(x1, y1, x1 - r, y1, r);
    c.lineTo(x0 + r, y1);
    c.arcTo(x0, y1, x0, y1 - r, r);
    c.lineTo(x0, y0 + r);
    c.arcTo(x0, y0, x0 + r, y0, r);
    c.closePath();
  };
  c.lineJoin = 'round';
  // The inner yard first, then edge lines, tarmac and the dashed centre.
  c.fillStyle = '#7f9a84';
  loop();
  c.fill();
  c.strokeStyle = '#f2f4f5';
  c.lineWidth = TR.hw * 2 * P + 14;
  loop();
  c.stroke();
  c.strokeStyle = '#3c4247';
  c.lineWidth = TR.hw * 2 * P;
  loop();
  c.stroke();
  c.strokeStyle = '#f4c542';
  c.lineWidth = 6;
  c.setLineDash([34, 28]);
  loop();
  c.stroke();
  c.setLineDash([]);
  // The zebra over the near lane, and the stop line ahead of it.
  c.fillStyle = '#f2f4f5';
  const y0 = pz(TR.zN - TR.hw);
  for (let i = 0; i < 8; i++) c.fillRect(px(TR.crossX - TR.crossW / 2), y0 + 6 + i * 25, TR.crossW * P, 13);
  c.fillRect(px(TR.crossX + TR.crossW / 2 + 0.12), y0, 12, TR.hw * 2 * P);
  // A start box.
  c.strokeStyle = '#f2f4f5';
  c.lineWidth = 5;
  c.strokeRect(px(1.25), pz(TR.zN - 0.85), 345, 170);
  text(c, '출발', px(3.4), pz(TR.zN), 30, '#f2f4f5', 'center');
  // Arrows round the loop.
  c.fillStyle = '#e8ecee';
  const arrow = (x: number, z: number, a: number) => {
    c.save();
    c.translate(px(x), pz(z));
    c.rotate(a);
    c.fillRect(-26, -5, 34, 10);
    c.beginPath();
    c.moveTo(24, 0);
    c.lineTo(4, -15);
    c.lineTo(4, 15);
    c.closePath();
    c.fill();
    c.restore();
  };
  arrow(-3, TR.zF + 0.5, 0);
  arrow(3, TR.zF + 0.5, 0);
  arrow(-0.1, TR.zN + 0.5, Math.PI);
  // Words in the yard.
  text(c, '실외 시험장 · 가상 도시', 600, 268, 46, '#f7faf7', 'center');
  text(c, '시속 20km 이하 · 사람 우선', 600, 322, 25, '#eaf3ea', 'center');
}
function coneProp(g: THREE.Object3D, x: number, z: number) {
  part(g, box(0.22, 0.02, 0.22), BLACK, x, 0.01, z, { outline: false });
  part(g, cyl(0.02, 0.1, 0.36, 12), ORANGE, x, 0.2, z, { outline: false });
  part(g, cyl(0.055, 0.073, 0.07, 12), WHITE, x, 0.22, z, { outline: false });
}
function tyres(g: THREE.Object3D, x: number, z: number) {
  for (let i = 0; i < 3; i++) {
    part(g, new THREE.TorusGeometry(0.2, 0.08, 8, 18), i === 1 ? '#c9d0d5' : '#1d1f22', x, 0.08 + i * 0.15, z, { rx: Math.PI / 2, outline: false });
  }
}
function statusFace(c: Ctx2, mode: number, btn: boolean) {
  c.fillStyle = btn ? '#6e1414' : mode ? '#0c3b2e' : '#10202c';
  c.fillRect(0, 0, 160, 100);
  text(c, '시험차 1호', 80, 18, 16, '#d7eaf6', 'center');
  text(c, btn ? '긴급 정지' : mode ? '주행 중' : '대기', 80, 58, 30, btn ? '#ffcdd2' : mode ? LED : '#9fd6ff', 'center');
}
function track(g: THREE.Group, out: Built) {
  picture(g, painted('sdTrackFloor', 1200, 600, trackFloor), 12, 6, 0, 0.012, 0, '#ffffff', 0, -Math.PI / 2).renderOrder = 1;
  // Low barriers along the back and the ends, tyre stacks at the corners, a banner on the back.
  for (const x of [-4.2, -2.1, 0, 2.1, 4.2]) {
    part(g, rbox(2.0, 0.42, 0.22, 0.04), x % 4.2 === 0 ? WHITE : '#d24b3a', x, 0.21, -2.86);
  }
  tyres(g, -5.65, -2.5);
  tyres(g, 5.65, -2.5);
  tyres(g, -5.65, 2.5);
  tyres(g, 5.65, 2.5);
  for (const x of [-5, 5]) {
    part(g, box(0.1, 2.5, 0.1), GREY_D, x, 1.25, -2.92);
  }
  part(g, box(10.1, 0.86, 0.04), NAVY, 0, 2.08, -2.92);
  picture(g, painted('sdBanner', 1000, 86, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 1000, 86);
    text(c, `${FIRM} 자율주행 개발 센터 · 실외 시험장`, 500, 43, 42, '#ffffff', 'center');
  }), 10, 0.86, 0, 2.08, -2.895);
  // Street lights behind the barrier, the course being out of doors.
  for (const x of [-3.2, 3.2]) {
    part(g, cyl(0.05, 0.07, 4.2, 10), GREY_D, x, 2.1, -2.98);
    part(g, box(0.08, 0.06, 0.9), GREY_D, x, 4.18, -2.6);
    part(g, rbox(0.42, 0.08, 0.2, 0.02), GRAPHITE, x, 4.12, -2.2);
    ownLit(g, box(0.36, 0.01, 0.14), '#fffbe6', x, 4.075, -2.2);
  }
  // The cones along the yard, for a slalom.
  for (const x of [-2, -1, 0, 1, 2]) coneProp(g, x, -0.1 + (x % 2 === 0 ? -0.14 : 0.14));
  // The crossing's signal, in the yard beside it, low enough to see past.
  const sx = TR.crossX - 0.9;
  const sz = 0.22;
  part(g, cyl(0.03, 0.04, 1.5, 10), GREY_D, sx, 0.75, sz);
  part(g, rbox(0.16, 0.42, 0.1, 0.02), BLACK, sx, 1.62, sz);
  const lampR = ownLit(g, cyl(0.05, 0.05, 0.01, 12), '#5a1b1b', sx, 1.74, sz + 0.055);
  lampR.rotation.x = Math.PI / 2;
  const lampY = ownLit(g, cyl(0.05, 0.05, 0.01, 12), '#5b4510', sx, 1.62, sz + 0.055);
  lampY.rotation.x = Math.PI / 2;
  const lampG = ownLit(g, cyl(0.05, 0.05, 0.01, 12), '#1a4a26', sx, 1.5, sz + 0.055);
  lampG.rotation.x = Math.PI / 2;
  // The dummy's rail over the lane, and the dummy on its sled.
  const railY = 0.02;
  part(g, box(0.1, 0.024, TR.kerbN - TR.kerbF), GRAPHITE, TR.crossX, railY, (TR.kerbN + TR.kerbF) / 2, { outline: false });
  part(g, box(0.3, 0.18, 0.3), GREY_D, TR.crossX, 0.09, TR.kerbN + 0.22);
  label(g, '보행자 모형', 0.26, 0.08, TR.crossX, 0.12, TR.kerbN + 0.376, '#ffffff', BLACK);
  const dummy = group(g, TR.crossX, 0, TR.kerbN);
  part(dummy, box(0.26, 0.05, 0.3), GRAPHITE, 0, 0.05, 0);
  const legL = group(dummy, 0.075, 0.86, 0);
  const legR = group(dummy, -0.075, 0.86, 0);
  for (const leg of [legL, legR]) {
    part(leg, cyl(0.05, 0.04, 0.76, 10), '#37474f', 0, -0.38, 0);
    part(leg, rbox(0.09, 0.06, 0.2, 0.02), BLACK, 0, -0.76, 0.03, { outline: false });
  }
  part(dummy, rbox(0.3, 0.46, 0.18, 0.06), ORANGE, 0, 1.12, 0);
  for (const s of [-1, 1]) {
    part(dummy, box(0.3, 0.035, 0.186), '#eaf2c2', 0, 1.02 + s * 0.08, 0, { outline: false });
    rod(dummy, v3(s * 0.19, 1.3, 0), v3(s * 0.22, 0.86, 0.02), 0.035, '#37474f');
  }
  part(dummy, cyl(0.04, 0.045, 0.08, 10), '#cfd6da', 0, 1.39, 0, { outline: false });
  part(dummy, ball(0.11), '#cfd6da', 0, 1.53, 0);
  // Two rings on a blank face so it reads as a mannequin.
  part(dummy, new THREE.TorusGeometry(0.03, 0.006, 6, 14), BLACK, 0, 1.53, 0.108, { outline: false });
  // The soft target (a foam car on a low sled), only for the scenario.
  const target = group(g, TR.target[0], 0, TR.target[1]);
  part(target, rbox(1.0, 0.36, 0.5, 0.06), '#e4e7ea', 0, 0.3, 0);
  part(target, rbox(0.56, 0.26, 0.46, 0.06), '#6f8aa0', -0.04, 0.6, 0);
  for (const x of [-0.3, 0.3]) for (const s of [-1, 1]) part(target, cyl(0.09, 0.09, 0.04, 12), BLACK, x, 0.1, s * 0.25, { rx: Math.PI / 2, outline: false });
  label(target, '풍선 표적', 0.56, 0.12, 0, 0.3, 0.256, ORANGE, '#ffffff');
  // The post: the red mushroom under a yellow hood, a small screen.
  const P = TR.post;
  part(g, rbox(0.5, 0.04, 0.34, 0.015), GREY_D, P[0], 0.02, P[2] - 0.06);
  part(g, box(0.1, 1.0, 0.1), '#f5c518', P[0], 0.54, P[2] - 0.06);
  part(g, rbox(0.3, 0.26, 0.14, 0.02), '#f5c518', P[0], P[1], P[2] - 0.06);
  label(g, '비상 정지', 0.2, 0.05, P[0], P[1] - 0.09, P[2] + 0.012, '#ffffff', RED);
  const mush = group(g, P[0], P[1] + 0.02, P[2] + 0.015);
  part(mush, cyl(0.055, 0.05, 0.04, 16), RED, 0, 0, 0.02, { rx: Math.PI / 2, outline: false });
  part(mush, cyl(0.022, 0.022, 0.04, 10), '#7a0f0f', 0, 0, -0.01, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.32, 0.22, 0.05, 0.012), GRAPHITE, P[0], P[1] + 0.27, P[2] - 0.06);
  const stat = liveScreen(g, 0.28, 0.18, 160, 100, P[0], P[1] + 0.27, P[2] - 0.03);
  const strobe = ownLit(g, cyl(0.045, 0.05, 0.09, 12), '#5a1b1b', P[0], P[1] + 0.43, P[2] - 0.06);
  // The car, parked in its box when nobody's using it; its lidar's sweep on the floor when it's on.
  const car = testCar(g, '시험 1호');
  const sweep = haze(g, new THREE.CircleGeometry(2.6, 22, -0.32, 0.64), '#39d0e0', 0, 0, 0.02, 0);
  sweep.rotation.x = -Math.PI / 2;
  const rings = haze(g, new THREE.RingGeometry(2.56, 2.62, 48), '#39d0e0', 0, 0, 0.018, 0);
  rings.rotation.x = -Math.PI / 2;
  let noted = false;
  const tab = tabletTool(g, (ctx) => {
    ctx.fillStyle = '#10202c';
    ctx.fillRect(0, 0, 192, 132);
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, 0, 192, 26);
    text(ctx, '시험 기록', 8, 13, 15, '#ffffff');
    ['주행 완료', '건널목 정지', '개입 없음'].forEach((s, i) => {
      text(ctx, s, 12, 46 + i * 28, 14, '#d7eaf6', 'left', false);
      ctx.strokeStyle = '#9fd6ff';
      ctx.strokeRect(158, 37 + i * 28, 16, 16);
      if (noted) {
        ctx.fillStyle = LED;
        ctx.fillRect(161, 40 + i * 28, 10, 10);
      }
    });
  });
  const rem = remoteTool(g);
  const clo = clothTool(g);
  const tools: Partial<Record<SdTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS }, remote: { tool: rem, lead: 'left', grips: REMOTE_GRIP }, cloth: { tool: clo, lead: 'right', grips: CLOTH_GRIP } };
  const spots: Record<string, Spot> = { sdRide: standAt(g, 'sdRide', 2.6, 3.1), selfDriving_driveScenario: standAt(g, 'sdScenario', 2.6, 3.1), sdEStop: standAt(g, 'sdEStop', P[0], TR.postStand), sdDummy: standAt(g, 'sdDummy', TR.crossX + 1, 3.3) };
  const show = (now: string | null, N: SdNow | null, t: number) => {
    const n = N?.n ?? {};
    const Pp = N?.props ?? {};
    const s = N ? (n.carS ?? S0) : S0;
    const dodge = (n.dodge ?? 0) > 0.5;
    const c = carPose(s, dodge);
    car.root.position.set(c.x, 0, c.z);
    car.root.rotation.y = c.th;
    for (const w of car.wheels) w.rotation.z = -s / 0.3;
    for (const f of car.wheelsF) f.rotation.y = -0.22 * c.steer;
    car.steering.rotation.x = c.steer * 0.9;
    car.door.rotation.y = -0.6 * clamp01(n.door);
    const on = (n.on ?? 0) > 0.5;
    car.head.rotation.y = on ? t * 9 : t * 0.6;
    car.brake.visible = (n.brake ?? 0) > 0.5;
    car.hazard.visible = (n.hazard ?? 0) > 0.5 && Math.sin(t * 7) > 0;
    const beam = on && now !== 'sdDummy';
    setLit(car.beacon, (n.strobe ?? 0) > 0.5 ? (Math.sin(t * 12) > 0 ? '#ff5252' : '#6b1414') : on ? (Math.sin(t * 4) > 0 ? AMBER : '#6b4c00') : '#3c3a2c');
    sweep.position.set(c.x, 0.02, c.z);
    sweep.rotation.z = t * 9;
    rings.position.set(c.x, 0.018, c.z);
    fade(sweep, beam ? 0.2 : 0);
    fade(rings, beam ? 0.28 : 0);
    // The dummy on its rail, its legs swinging as it goes.
    const d = clamp01(n.dummy);
    dummy.position.z = THREE.MathUtils.lerp(TR.kerbN, TR.kerbF, d);
    dummy.rotation.y = Math.PI;
    const walking = d > 0.01 && d < 0.99;
    const swing = walking ? 0.42 * Math.sin(d * 34) : 0;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    target.visible = (n.target ?? 0) > 0.5;
    // The signal stops the car while the dummy's on the crossing.
    const stop = d > 0.02 && d < 0.98;
    setLit(lampR, stop ? '#ff4d4d' : '#5a1b1b');
    setLit(lampG, !stop ? '#4dff88' : '#1a4a26');
    setLit(lampY, '#5b4510');
    const pressed = clamp01(n.btn);
    mush.position.z = P[2] + 0.015 - 0.02 * pressed;
    const pressedNow = pressed > 0.5;
    setLit(strobe, (n.strobe ?? 0) > 0.5 && Math.sin(t * 12) > 0 ? '#ff4d4d' : '#5a1b1b');
    stat.draw(`${n.mode ?? 0}|${pressedNow ? 1 : 0}`, (ctx) => statusFace(ctx, n.mode ?? 0, pressedNow));
    noted = (n.note ?? 0) > 0.5;
    tab.draw(`${noted ? 1 : 0}`);
    at(tab.root, N?.tool === 'tablet' ? Pp.tablet : null);
    at(rem, N?.tool === 'remote' ? Pp.remote : null);
    at(clo, N?.tool === 'cloth' ? Pp.cloth : null);
    if (N && now !== 'sdDummy') {
      SD_LIVE.s = s;
      SD_LIVE.dodge = dodge ? 1 : 0;
      SD_LIVE.dummy = d;
      SD_LIVE.mode = n.mode ?? 0;
      SD_LIVE.at = t;
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, P[0], P[1], P[2]);
}

// =============================================================================================
// 센서 보정판 (sdCalibBoard, 3 × 2): a checker board on wheels, a rig of sensors looking at it, a screen with the corners found.

function checker(c: Ctx2, w: number, h: number) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#16181a';
  const n = 8;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if ((i + j) % 2 === 0) c.fillRect((i * w) / n, (j * h) / n, w / n, h / n);
}
function calibBoard(g: THREE.Group, out: Built) {
  // The rail on the floor it rolls along, marked with three stops.
  part(g, box(2.7, 0.012, 0.5), '#c6cdd2', 0, 0.007, CB.z, { outline: false });
  CB.xs.forEach((x, i) => label(g, `${i + 1}`, 0.12, 0.12, x, 0.014, CB.z + 0.2, '#ffffff', NAVY).rotation.set(-Math.PI / 2, 0, 0));
  const stand = group(g, CB.xs[0], 0, CB.z);
  part(stand, box(0.86, 0.04, 0.36), GREY_D, 0, 0.1, 0);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) part(stand, ball(0.04), BLACK, sx * 0.38, 0.04, sz * 0.15, { outline: false });
  for (const sx of [-0.2, 0.2]) part(stand, cyl(0.018, 0.018, 0.9, 8), GREY, sx, 0.55, 0, { outline: false });
  // The push bar.
  part(stand, cyl(0.014, 0.014, 0.5, 8), '#1e88e5', 0, CB.handleY, 0.05, { rz: Math.PI / 2, outline: false });
  const pan = group(stand, 0, 1.42, 0);
  part(pan, rbox(0.98, 0.98, 0.04, 0.01), GRAPHITE, 0, 0, -0.02);
  picture(pan, painted('sdChecker', 256, 256, (c) => checker(c, 256, 256)), 0.92, 0.92, 0, 0, 0.003);
  // The rig: a roof bar's worth of sensors on a tripod, its monitor on the side the dweller stands.
  const R = CB.rig;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, v3(R[0], R[1] - 0.2, R[2]), v3(R[0] + 0.28 * Math.cos(a), 0.01, R[2] + 0.22 * Math.sin(a)), 0.014, GREY_D);
  }
  part(g, box(0.82, 0.05, 0.1), GRAPHITE, R[0], R[1], R[2]);
  for (const x of [-0.26, 0, 0.26]) {
    part(g, rbox(0.09, 0.07, 0.09, 0.015), BLACK, R[0] + x, R[1] + 0.05, R[2] - 0.04, { outline: false });
    ownLit(g, cyl(0.024, 0.024, 0.004, 10), '#3f8fd0', R[0] + x, R[1] + 0.05, R[2] - 0.087).rotation.x = Math.PI / 2;
  }
  part(g, cyl(0.075, 0.075, 0.1, 16), '#20262b', R[0], R[1] + 0.16, R[2]);
  part(g, box(0.3, 0.02, 0.2), GREY, CB.shelf[0], CB.shelf[1] - 0.15, CB.shelf[2]);
  rod(g, v3(CB.shelf[0], 0.01, CB.shelf[2]), v3(CB.shelf[0], CB.shelf[1] - 0.15, CB.shelf[2]), 0.012, GREY_D);
  part(g, rbox(0.56, 0.36, 0.03, 0.01), BLACK, 0.92, 1.02, 0.5, { ry: -0.5 });
  rod(g, v3(0.92, 0.01, 0.48), v3(0.92, 0.86, 0.48), 0.018, GREY_D);
  const scr = liveScreen(g, 0.52, 0.32, 260, 160, 0.9104, 1.02, 0.5176, -0.5);
  let errNow = 4.2;
  let seenNow = false;
  const tab = tabletTool(g, (c) => {
    c.fillStyle = '#10202c';
    c.fillRect(0, 0, 192, 132);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 192, 26);
    text(c, '센서 보정', 8, 13, 15, '#ffffff');
    text(c, '재투영 오차', 96, 48, 16, '#b7d3e6', 'center');
    text(c, `${errNow.toFixed(1)} px`, 96, 84, 30, errNow < 1 ? LED : AMBER, 'center');
  });
  const tools: Partial<Record<SdTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS } };
  const spots: Record<string, Spot> = { sdCalib: standAt(g, 'sdCalib', 0, CB.z + 0.56) };
  const show = (_now: string | null, N: SdNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const bx = N ? (n.bx ?? CB.xs[0]) : CB.xs[0];
    stand.position.x = bx;
    pan.rotation.y = n.tilt ?? 0;
    errNow = N ? (n.err ?? 4.2) : 4.2;
    seenNow = (n.seen ?? 0) > 0.5;
    const done = (n.done ?? 0) > 0.5;
    at(tab.root, N?.tool === 'tablet' ? P.tablet : null, CB.shelf);
    tab.root.visible = true;
    tab.draw(`${q(errNow, 10)}`);
    scr.draw(`${q(bx, 10)}|${q(errNow, 10)}|${seenNow ? 1 : 0}|${done ? 1 : 0}`, (c) => {
      c.fillStyle = '#1a2a34';
      c.fillRect(0, 0, 260, 160);
      c.fillStyle = '#c4ccd1';
      c.fillRect(0, 118, 260, 42);
      const cx = 130 + bx * 62;
      const side = 76;
      for (let j = 0; j < 6; j++)
        for (let i = 0; i < 6; i++) {
          c.fillStyle = (i + j) % 2 ? '#f5f7f8' : '#15171a';
          c.fillRect(cx - side / 2 + (i * side) / 6, 34 + (j * side) / 6, side / 6, side / 6);
        }
      // Corners found, off by the error at first and landing on as it falls.
      if (seenNow) {
        c.fillStyle = errNow < 1 ? '#57f28b' : AMBER;
        for (let j = 1; j < 6; j++)
          for (let i = 1; i < 6; i++) {
            c.beginPath();
            c.arc(cx - side / 2 + (i * side) / 6 + errNow * 1.1 * Math.sin(i * 2.1 + j), 34 + (j * side) / 6 + errNow * 1.1 * Math.cos(j * 1.3 + i), pos(2), 0, Math.PI * 2);
            c.fill();
          }
      }
      text(c, done ? '보정 완료' : `오차 ${errNow.toFixed(1)} px`, 8, 148, 16, done ? '#14663a' : BLACK);
    });
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, CB.handleY, CB.z);
}

// =============================================================================================
// 주행 기록 분석 책상 (sdLogDesk, 3 × 1): the point cloud on the big screen.

interface Pt {
  x: number;
  z: number;
  h: number;
}
let cloudPts: Pt[] | null = null;
function cloudWorld(): Pt[] {
  if (cloudPts) return cloudPts;
  const r = seeded(77);
  const pts: Pt[] = [];
  // The hall's walls and the barriers.
  for (let i = 0; i < 150; i++) {
    const a = r();
    const h = r() * 2.2;
    if (a < 0.35) pts.push({ x: r() * 12 - 6, z: -3, h });
    else if (a < 0.6) pts.push({ x: r() * 12 - 6, z: 3.2, h: h * 0.6 });
    else if (a < 0.8) pts.push({ x: -6, z: r() * 6 - 3, h });
    else pts.push({ x: 6, z: r() * 6 - 3, h });
  }
  // The cones in the yard.
  for (const x of [-2, -1, 0, 1, 2]) for (let i = 0; i < 6; i++) pts.push({ x: x + (r() - 0.5) * 0.14, z: -0.1 + (x % 2 === 0 ? -0.14 : 0.14) + (r() - 0.5) * 0.14, h: r() * 0.4 });
  return (cloudPts = pts);
}
/** The car's lidar from behind and above: the hall's points, the ground rings, boxes round what it's found. */
function pointCloud(c: Ctx2, x0: number, y0: number, w: number, h: number, s: number, dodge: boolean, dummy: number, picked: number, tick: number) {
  const P = carPose(s, dodge);
  const co = Math.cos(P.th);
  const si = Math.sin(P.th);
  c.fillStyle = '#04090f';
  c.fillRect(x0, y0, w, h);
  c.save();
  c.beginPath();
  c.rect(x0, y0, w, h);
  c.clip();
  const f = h * 0.95;
  const cx = x0 + w / 2;
  const hor = y0 + h * 0.3;
  const project = (x: number, z: number, up: number) => {
    const dx = x - P.x;
    const dz = z - P.z;
    const fw = dx * co - dz * si;
    const side = dx * si + dz * co;
    const d = fw + 4.2;
    if (d < 0.7) return null;
    return { x: cx + (side * f) / d, y: hor + ((2.8 - up) * f) / d, d };
  };
  const colour = (d: number) => (d < 4 ? '#ff6b6b' : d < 6 ? '#ffc04d' : d < 9 ? '#6ff0a0' : '#58b8ff');
  // Ground rings about the car.
  for (let k = 1; k <= 5; k++) {
    const R = k * 0.95;
    c.fillStyle = 'rgba(120,210,255,0.55)';
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const p = project(P.x + R * Math.cos(a), P.z + R * Math.sin(a), 0);
      if (p) c.fillRect(p.x, p.y, pos(1.6), pos(1.6));
    }
  }
  // The hall.
  const pts = cloudWorld();
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[wrap(i, pts.length)];
    const p = project(pt.x, pt.z, pt.h);
    if (!p) continue;
    if ((i + tick) % 11 === 0) continue;
    c.fillStyle = colour(p.d);
    const sz = pos(Math.min(3, 12 / p.d));
    c.fillRect(p.x, p.y, sz, sz);
  }
  // A box in the world, its corners joined.
  const wire = (x: number, z: number, hw: number, hd: number, up: number, color: string, name?: string) => {
    const a = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [project(x + sx * hw, z + sz * hd, 0), project(x + sx * hw, z + sz * hd, up)] as const);
    c.strokeStyle = color;
    c.lineWidth = 2;
    let top: { x: number; y: number } | null = null;
    for (let i = 0; i < 4; i++) {
      const [lo, hi] = a[i];
      const [lo2, hi2] = a[(i + 1) % 4];
      if (lo && hi && lo2 && hi2) {
        c.beginPath();
        c.moveTo(lo.x, lo.y);
        c.lineTo(lo2.x, lo2.y);
        c.lineTo(hi2.x, hi2.y);
        c.lineTo(hi.x, hi.y);
        c.closePath();
        c.stroke();
        top = hi;
      }
    }
    if (name && top) text(c, name, top.x, top.y - 9, 13, color);
  };
  const dz = THREE.MathUtils.lerp(TR.kerbN, TR.kerbF, clamp01(dummy));
  wire(TR.crossX, dz, 0.22, 0.22, 1.65, picked > 0.5 ? '#ffee58' : '#66e0ff', '보행자');
  // The ego car.
  const ego = project(P.x, P.z, 0);
  if (ego) {
    c.fillStyle = '#d7eaf6';
    const ww = pos(Math.max(14, (1.5 * f) / Math.max(1, ego.d)));
    c.fillRect(ego.x - ww / 2, ego.y - ww * 0.62, ww, ww * 0.62);
    c.fillStyle = TEAL;
    c.fillRect(ego.x - ww * 0.32, ego.y - ww * 0.92, ww * 0.64, ww * 0.32);
  }
  c.restore();
}
function miniMap(c: Ctx2, x: number, y: number, w: number, h: number, s: number, trail: boolean) {
  c.fillStyle = '#0d1a24';
  c.fillRect(x, y, w, h);
  c.strokeStyle = '#3c5568';
  c.lineWidth = 4;
  c.beginPath();
  for (let i = 0; i <= 44; i++) {
    const p = carPose((i / 44) * LOOP);
    const px = x + w / 2 + (p.x / 6) * (w / 2 - 4);
    const py = y + h / 2 + (p.z / 3.2) * (h / 2 - 4);
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();
  const p = carPose(s);
  c.fillStyle = trail ? LED : '#9fd6ff';
  c.beginPath();
  c.arc(x + w / 2 + (p.x / 6) * (w / 2 - 4), y + h / 2 + (p.z / 3.2) * (h / 2 - 4), pos(4), 0, Math.PI * 2);
  c.fill();
}
const CODE = ['def track(obj):', '  if obj.kind == "보행자":', '    keep = 2.0  # 안전 거리', '  speed = plan(keep)', '  if obj.lost > 3:', '    brake(0.4)', '  return speed'];
function logDesk(g: THREE.Group, out: Built) {
  const T = LD.top;
  part(g, rbox(2.9, 0.05, 0.86, 0.02), '#46525a', 0, T - 0.025, 0.03);
  for (const x of [-1.34, 1.34]) part(g, box(0.06, T - 0.05, 0.76), '#2c363d', x, (T - 0.05) / 2, 0.03);
  part(g, box(2.72, 0.42, 0.03), '#2c363d', 0, 0.42, -0.34);
  // A wide screen for the cloud, a smaller one for code; not above the eye of someone sat.
  part(g, cyl(0.02, 0.03, 0.13, 8), GREY_D, -0.35, T + 0.065, -0.14, { outline: false });
  part(g, box(0.14, 0.012, 0.1), GREY_D, -0.35, T + 0.006, -0.14, { outline: false });
  part(g, rbox(1.02, 0.46, 0.03, 0.01), BLACK, -0.35, T + 0.36, -0.13);
  const big = liveScreen(g, 0.98, 0.42, 490, 210, -0.35, T + 0.36, -0.111);
  part(g, cyl(0.02, 0.03, 0.13, 8), GREY_D, 0.72, T + 0.065, -0.14, { outline: false });
  part(g, box(0.14, 0.012, 0.1), GREY_D, 0.72, T + 0.006, -0.14, { outline: false });
  part(g, rbox(0.58, 0.36, 0.03, 0.01), BLACK, 0.72, T + 0.31, -0.11, { ry: -0.2 });
  const small = liveScreen(g, 0.54, 0.32, 270, 160, 0.724, T + 0.31, -0.09, -0.2);
  chair(g, LD.seat, TEAL);
  part(g, box(0.42, 0.016, 0.14), GRAPHITE, LD.keys[0], T + 0.008, LD.keys[2], { outline: false });
  part(g, rbox(0.06, 0.03, 0.09, 0.012), GRAPHITE, LD.mouse[0], T + 0.015, LD.mouse[2], { outline: false });
  part(g, cyl(0.04, 0.036, 0.09, 12), '#ffffff', -1.08, T + 0.046, 0.14);
  part(g, box(0.24, 0.016, 0.3), PAPER, 1.0, T + 0.008, 0.2);
  // A storage box of drive logs under the screen's side.
  part(g, rbox(0.26, 0.14, 0.2, 0.012), GREY_D, -1.1, T + 0.07, -0.16);
  label(g, '주행 기록 2TB', 0.2, 0.05, -1.1, T + 0.08, -0.058, '#ffffff', BLACK);
  label(g, FIRM, 0.5, 0.06, 0, 0.5, -0.32, GRAPHITE, '#ffffff');
  const senior = person(g, '#00838f', '#263238', '#1a1a1a', 0.68, 0.86, Math.PI - 0.5, 'female');
  const pointAt = new THREE.Vector3(-0.3, T + 0.36, -0.06);
  const spots: Record<string, Spot> = { sdLog: seatAt(g, 'sdLog', LD.seat), sdFix: seatAt(g, 'sdFix', LD.seat), selfDriving_learnLog: seatAt(g, 'sdLearn', LD.seat), selfDriving_tuneModel: seatAt(g, 'sdTune', LD.seat) };
  const show = (now: string | null, N: SdNow | null, t: number) => {
    const n = N?.n ?? {};
    senior.root.visible = now === 'selfDriving_learnLog';
    if (senior.root.visible) {
      senior.armR((n.point ?? 0) > 0.5 ? pointAt : null);
      senior.armL(null);
      senior.opts.nod = (n.nods ?? 0) > 0.5 ? 0.25 * Math.sin(t * 6) : 0.14;
      senior.head.rotation.x = senior.opts.nod;
    }
    // The cloud: the live run if the car's out on the track, else this log played back (or scrubbed through).
    const live = recent(SD_LIVE.at, t);
    const scrub = n.scrub ?? -1;
    const s = live ? SD_LIVE.s : scrub >= 0 ? S0 + clamp01(scrub) * LOOP * 0.5 : wrap(t * 1.3 * 100, Math.round(LOOP * 100)) / 100;
    const dodge = live && SD_LIVE.dodge > 0.5;
    const dummy = live ? SD_LIVE.dummy : 0.5 + 0.5 * Math.sin(s * 0.6);
    const tick = Math.floor(t * 8);
    const picked = n.boxed ?? 0;
    big.draw(`${tick}|${q(s, 40)}|${live ? 1 : 0}|${q(picked, 2)}|${q(scrub, 12)}`, (c) => {
      pointCloud(c, 0, 0, 490, 210, s, dodge, dummy, picked, tick);
      text(c, live ? `실시간 · 시험차 1호${SD_LIVE.mode === 2 ? ' · 긴급 정지' : ''}` : '주행 기록 재생', 8, 13, 13, live ? (SD_LIVE.mode === 2 ? '#ff8a80' : LED) : '#9fd6ff');
      miniMap(c, 388, 6, 96, 50, s, live);
      // The timeline at the bottom, the playhead where it's been scrubbed to.
      c.fillStyle = 'rgba(16,32,44,0.85)';
      c.fillRect(0, 194, 490, 16);
      c.fillStyle = '#ffb300';
      c.fillRect(138, 198, 6, 8);
      c.fillStyle = '#9fd6ff';
      c.fillRect(6 + ((((s / LOOP) % 1) + 1) % 1) * 474, 196, 4, 12);
    });
    const typed = clamp01(n.typed);
    const fall = clamp01(n.fall);
    const test = clamp01(n.test);
    const ok = (n.ok ?? 0) > 0.5;
    const tuning = now === 'selfDriving_tuneModel';
    small.draw(`${tuning ? 1 : 0}|${q(typed, 18)}|${q(fall, 18)}|${q(test, 12)}|${ok ? 1 : 0}`, (c) => {
      c.fillStyle = '#0f1a22';
      c.fillRect(0, 0, 270, 160);
      if (tuning) {
        // How many false alarms a run, falling as the model trains.
        text(c, '오탐 건수 (주행 1회당)', 8, 14, 13, '#d7eaf6');
        c.strokeStyle = '#3c5568';
        c.strokeRect(10, 28, 250, 102);
        c.strokeStyle = '#ffb300';
        c.lineWidth = 2;
        c.beginPath();
        const steps = Math.max(2, Math.floor(fall * 40) + 2);
        for (let i = 0; i < steps; i++) {
          const u = i / 41;
          const v = 0.1 + 0.8 * Math.exp(-3 * u) + 0.03 * Math.sin(i * 1.7);
          const x = 12 + u * 246;
          const y = 128 - v * 96;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
        text(c, ok ? '오탐 2건 · 통과' : `학습 ${Math.round(fall * 100)}%`, 8, 148, 14, ok ? LED : '#9fd6ff');
        return;
      }
      text(c, 'tracker.py', 8, 13, 13, '#9fd6ff');
      const shown = Math.max(3, Math.ceil(typed * CODE.length));
      for (let i = 0; i < Math.min(shown, CODE.length); i++) text(c, CODE[wrap(i, CODE.length)], 10, 34 + i * 15, 12, i === 2 && typed > 0.2 ? '#ffe08a' : '#b7d3e6', 'left', false);
      if (test > 0) {
        c.fillStyle = '#1c3647';
        c.fillRect(8, 144, 254, 11);
        c.fillStyle = ok ? LED : '#4fc3f7';
        c.fillRect(8, 144, 254 * test, 11);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, {}, show);
  out.work = marker(g, LD.keys[0], LD.keys[1], LD.keys[2]);
}

// =============================================================================================
// 라벨링 작업대 (sdLabelStation, 2 × 1): a pen display laid back, a road scene and its boxes.

function roadScene(c: Ctx2, w: number, h: number) {
  c.fillStyle = '#9ed2ec';
  c.fillRect(0, 0, w, h * 0.46);
  c.fillStyle = '#54626b';
  c.fillRect(0, h * 0.46, w, h * 0.54);
  // Buildings.
  c.fillStyle = '#7f8c96';
  for (let i = 0; i < 8; i++) c.fillRect((i * w) / 8, h * 0.18 + ((i * 37) % 30), w / 8 - 4, h * 0.3);
  // The lanes.
  c.strokeStyle = '#f2f4f5';
  c.lineWidth = 3;
  for (const f of [0.1, 0.5, 0.9]) {
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.46);
    c.lineTo(w * f, h);
    c.stroke();
  }
  // The things to box: a car, a person, a far car, a bus.
  const rect = (b: readonly [number, number, number, number], color: string) => {
    c.fillStyle = color;
    c.fillRect(b[0] * w, h * (1 - b[3]), (b[2] - b[0]) * w, (b[3] - b[1]) * h);
  };
  rect(BOXES[0], '#c9414a');
  c.fillStyle = '#25313a';
  c.fillRect((BOXES[0][0] + 0.03) * w, h * (1 - BOXES[0][3] + 0.03), (BOXES[0][2] - BOXES[0][0] - 0.06) * w, 0.1 * h);
  const pb = BOXES[1];
  c.fillStyle = '#f7c9a0';
  c.beginPath();
  c.arc(((pb[0] + pb[2]) / 2) * w, h * (1 - pb[3] + 0.04), pos(0.035 * h), 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#3a5a9c';
  c.fillRect((pb[0] + 0.02) * w, h * (1 - pb[3] + 0.08), (pb[2] - pb[0] - 0.04) * w, 0.13 * h);
  c.fillStyle = '#2a2d31';
  c.fillRect((pb[0] + 0.025) * w, h * (1 - pb[3] + 0.2), (pb[2] - pb[0] - 0.05) * w, 0.07 * h);
  rect(BOXES[2], '#dfe5ea');
  rect(BOXES[3], '#3f9d6b');
  c.fillStyle = '#c7ecff';
  c.fillRect((BOXES[3][0] + 0.01) * w, h * (1 - BOXES[3][3] + 0.04), (BOXES[3][2] - BOXES[3][0] - 0.02) * w, 0.08 * h);
}
const CLASSES = ['승용차', '보행자', '승용차', '버스'];
const CLASS_COLOURS = ['#ffee58', '#ff5a5a', '#ffee58', '#66e0ff'];
function labelStation(g: THREE.Group, out: Built) {
  const T = LS.top;
  part(g, rbox(1.92, 0.05, 0.82, 0.02), '#d9c6a6', 0, T - 0.025, 0.03);
  for (const x of [-0.9, 0.9]) part(g, box(0.05, T - 0.05, 0.72), '#6a757d', x, (T - 0.05) / 2, 0.03);
  part(g, box(1.8, 0.34, 0.02), '#6a757d', 0, 0.42, -0.32);
  // The pen display: on a stand, laid back.
  const pad = LS.pad;
  const padRx = -(Math.PI / 2 - LS.tilt);
  part(g, rbox(LS.w + 0.06, LS.h + 0.06, 0.024, 0.012), BLACK, pad[0], pad[1] - 0.012 * Math.cos(LS.tilt), pad[2] - 0.012 * Math.sin(LS.tilt), { rx: padRx });
  const scr = liveScreen(g, LS.w, LS.h, 448, 272, pad[0], pad[1] + 0.002, pad[2] + 0.001, 0, padRx);
  part(g, box(0.34, 0.09, 0.1), GREY_D, pad[0], T + 0.04, pad[2] - 0.09, { outline: false });
  part(g, box(0.26, 0.014, 0.14), GRAPHITE, LS.keys[0], T + 0.008, LS.keys[2], { outline: false });
  // A stand for the stylus; a reference monitor behind with the class list; the chair.
  part(g, cyl(0.02, 0.026, 0.05, 10), GREY_D, 0.44, T + 0.025, 0.2, { outline: false });
  part(g, rbox(0.5, 0.32, 0.03, 0.01), BLACK, 0.58, T + 0.3, -0.2, { ry: -0.15 });
  picture(g, painted('sdClasses', 200, 128, (c) => {
    c.fillStyle = '#10202c';
    c.fillRect(0, 0, 200, 128);
    text(c, '라벨 기준', 8, 14, 15, '#ffffff');
    CLASSES.forEach((s, i) => {
      c.fillStyle = CLASS_COLOURS[i];
      c.fillRect(10, 34 + i * 22, 14, 14);
      text(c, s, 32, 41 + i * 22, 14, '#d7eaf6', 'left', false);
    });
  }), 0.46, 0.28, 0.582, T + 0.3, -0.183, '#ffffff', -0.15);
  part(g, cyl(0.02, 0.03, 0.14, 8), GREY_D, 0.58, T + 0.07, -0.21, { outline: false });
  chair(g, LS.seat, '#5c6bc0');
  const sty = stylusTool(g);
  const home: V = [0.44, T + 0.1, 0.2];
  const tools: Partial<Record<SdTool, HeldTool>> = { stylus: { tool: sty, lead: 'right', grips: STYLUS_GRIP } };
  const spots: Record<string, Spot> = { sdLabel: seatAt(g, 'sdLabel', LS.seat), sdAudit: seatAt(g, 'sdAudit', LS.seat) };
  const show = (_now: string | null, N: SdNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(sty, P.stylus, home);
    const boxes = Math.round(n.boxes ?? 0);
    const cur = clamp01(n.cur);
    const auditing = (n.audit ?? 0) > 0.5;
    const fix = clamp01(n.fix);
    const stamp = (n.stamp ?? 0) > 0.5;
    const scene = n.scene ?? 0;
    scr.draw(`${boxes}|${q(cur, 16)}|${auditing ? 1 : 0}|${q(fix, 12)}|${stamp ? 1 : 0}|${q(scene, 4)}`, (c) => {
      const w = 448;
      const h = 272;
      roadScene(c, w, h);
      c.lineWidth = 3;
      const strokeBox = (b: readonly [number, number, number, number], i: number, x1 = b[2]) => {
        c.strokeStyle = CLASS_COLOURS[wrap(i, CLASS_COLOURS.length)];
        c.strokeRect(b[0] * w, h * (1 - b[3]), (x1 - b[0]) * w, (b[3] - b[1]) * h);
        text(c, CLASSES[wrap(i, CLASSES.length)], b[0] * w + 3, h * (1 - b[3]) - 9, 14, CLASS_COLOURS[wrap(i, CLASS_COLOURS.length)]);
      };
      const whole = Math.min(boxes, BOXES.length);
      for (let i = 0; i < whole; i++) {
        const b = BOXES[wrap(i, BOXES.length)];
        // The box being audited: drawn too wide till its corner's pulled in.
        strokeBox(b, i, auditing && i === 1 ? b[2] + 0.08 * (1 - fix) : b[2]);
      }
      // The one being drawn, its side growing with the pen.
      if (boxes < BOXES.length && N) {
        const b = BOXES[wrap(boxes, BOXES.length)];
        c.strokeStyle = CLASS_COLOURS[wrap(boxes, CLASS_COLOURS.length)];
        c.beginPath();
        const X = (u: number) => u * w;
        const Y = (v: number) => h * (1 - v);
        const e = cur * 4;
        c.moveTo(X(b[0]), Y(b[3]));
        c.lineTo(X(b[0] + (b[2] - b[0]) * Math.min(1, e)), Y(b[3]));
        if (e > 1) c.lineTo(X(b[2]), Y(b[3] + (b[1] - b[3]) * Math.min(1, e - 1)));
        if (e > 2) c.lineTo(X(b[2] + (b[0] - b[2]) * Math.min(1, e - 2)), Y(b[1]));
        if (e > 3) c.lineTo(X(b[0]), Y(b[1] + (b[3] - b[1]) * Math.min(1, e - 3)));
        c.stroke();
      }
      c.fillStyle = 'rgba(12,24,34,0.82)';
      c.fillRect(0, 0, w, 24);
      text(c, auditing ? '라벨 검수' : `장면 01283 · 물체 ${whole}개`, 8, 12, 15, '#ffffff');
      if (stamp) text(c, '통과', w - 10, 12, 16, LED, 'right');
    });
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, ...onPad(0.5, 0.5));
}

// =============================================================================================
// 정비 베이 (sdGarage, 5 × 3): a car on a four-post lift with its hood and sensors serviced.

function garage(g: THREE.Group, out: Built) {
  // The bay's floor, its yellow box, a back panel of tools and the firm's name.
  picture(g, painted('sdBayFloor', 500, 300, (c) => {
    c.fillStyle = '#b4bcc1';
    c.fillRect(0, 0, 500, 300);
    c.strokeStyle = '#f5c518';
    c.lineWidth = 8;
    c.setLineDash([26, 14]);
    c.strokeRect(36, 18, 390, 190);
    c.setLineDash([]);
  }), 5, 3, 0, 0.012, 0, '#ffffff', 0, -Math.PI / 2).renderOrder = 1;
  part(g, box(4.9, 2.2, 0.06), '#dfe5e8', 0, 1.14, -1.44);
  part(g, box(4.9, 0.3, 0.07), NAVY, 0, 2.1, -1.42);
  label(g, `${FIRM} 시험차 정비 베이`, 2.2, 0.16, 0, 2.1, -1.382, NAVY, '#ffffff');
  stripLamp(g, 3.6, 0, 2.3, -1.2);
  // Lifted posts at the car's corners, and the two runways the wheels stand on.
  const cz = GA.z;
  for (const x of [GA.x - 1.95, GA.x + 1.95]) for (const s of [-1, 1]) part(g, box(0.12, 2.32, 0.12), '#2e6da4', x, 1.16, cz + s * 1.0);
  const lift = group(g, 0, 0, 0);
  for (const s of [-1, 1]) {
    part(lift, box(3.72, 0.08, 0.36), '#3a7fb8', GA.x, -0.05, cz + s * (CAR.Wd / 2 - 0.09));
    for (const x of [GA.x - 1.95, GA.x + 1.95]) part(lift, box(0.2, 0.1, 0.24), '#2e6da4', x, -0.05, cz + s * 1.0);
    part(lift, box(0.1, 0.08, 2.0), '#2e6da4', GA.x + s * 1.95, -0.05, cz);
  }
  const car = testCar(lift, '시험 2호');
  car.root.position.set(GA.x, 0, cz);
  // The side lidar on the roof's near corner, on its own: this is what's taken off.
  const unit = group(g);
  part(unit, rbox(0.2, 0.05, 0.2, 0.012), GRAPHITE, 0, -0.1, 0);
  part(unit, cyl(0.075, 0.08, 0.13, 16), '#20262b', 0, -0.015, 0);
  const lens = part(unit, cyl(0.078, 0.078, 0.05, 16), '#8a7a58', 0, 0.015, 0, { outline: false });
  const lensClean = part(unit, cyl(0.079, 0.079, 0.052, 16), '#3f8fd0', 0, 0.015, 0, { outline: false });
  // The stool, the bench with its cloth, the lift's control box on a post, shelves of spare sensors at the back.
  part(g, rbox(0.46, 0.05, 0.34, 0.012), GREY_D, GA.stool[0], 0.28, GA.stool[1]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, v3(GA.stool[0] + sx * 0.2, 0.01, GA.stool[1] + sz * 0.14), v3(GA.stool[0] + sx * 0.18, 0.27, GA.stool[1] + sz * 0.12), 0.012, GREY_D);
  const b = GA.bench;
  part(g, rbox(0.96, 0.05, 0.54, 0.012), '#a97c50', b[0], b[1] - 0.03, b[2]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, b[1] - 0.05, 0.04), GREY_D, b[0] + sx * 0.44, (b[1] - 0.05) / 2, b[2] + sz * 0.23, { outline: false });
  part(g, rbox(0.2, 0.08, 0.14, 0.012), '#c62828', b[0] + 0.28, b[1] + 0.04, b[2] - 0.14);
  const C = GA.ctrl;
  part(g, box(0.08, C[1] + 0.1, 0.08), GREY_D, C[0], (C[1] + 0.1) / 2, C[2] - 0.06);
  part(g, rbox(0.24, 0.3, 0.1, 0.012), '#f5c518', C[0], C[1], C[2] - 0.02);
  const up = ownLit(g, cyl(0.03, 0.03, 0.012, 12), '#2d6b3a', C[0], C[1] + 0.05, C[2] + 0.036);
  up.rotation.x = Math.PI / 2;
  const down = ownLit(g, cyl(0.03, 0.03, 0.012, 12), '#6b1414', C[0], C[1] - 0.05, C[2] + 0.036);
  down.rotation.x = Math.PI / 2;
  label(g, '리프트', 0.14, 0.04, C[0], C[1] + 0.115, C[2] + 0.034, BLACK, '#ffffff');
  for (const x of [1.15, 2.05]) {
    part(g, box(0.82, 0.03, 0.3), GREY, x, 1.26, -1.24);
    part(g, rbox(0.2, 0.15, 0.16, 0.012), '#37474f', x - 0.2, 1.35, -1.24);
    part(g, cyl(0.07, 0.07, 0.1, 14), '#20262b', x + 0.18, 1.33, -1.24);
  }
  // A small tag that shows a wire's been looked at.
  const tag = part(lift, box(0.1, 0.04, 0.004), AMBER, GA.x + 0.3, 0.27, cz + 0.1, { outline: false });
  const cable = part(car.bay, cyl(0.012, 0.012, 0.17, 6), LED, GA.boxAt[0] + 0.05, 0.86, 0.14, { outline: false });
  const drv = driverTool(g);
  const clo = clothTool(g);
  const tor = torchTool(g);
  const tools: Partial<Record<SdTool, HeldTool>> = { driver: { tool: drv, lead: 'right', grips: DRIVER_GRIP }, cloth: { tool: clo, lead: 'right', grips: CLOTH_GRIP }, torch: { tool: tor.root, lead: 'right', grips: TORCH_GRIP } };
  const spots: Record<string, Spot> = { sdHood: standAt(g, 'sdHood', 1.9, 1.15), sdUnder: standAt(g, 'sdUnder', GA.ctrl[0], GA.ctrl[2] + 0.42), sdLidar: standAt(g, 'sdLidar', GA.stool[0], GA.stool[1]) };
  const homeUnit: V = [GA.x + GA.lidar[0], GA.lidar[1], GA.z + GA.lidar[2]];
  const show = (now: string | null, N: SdNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const h = clamp01(n.lift);
    lift.position.y = GA.lift * h;
    const loft = GA.lift * h;
    at(unit, P.lidar ? P.lidar : [homeUnit[0], homeUnit[1] + loft, homeUnit[2]]);
    const clean = now === 'sdLidar' && clamp01(n.clean) > 0.5;
    lens.visible = !clean && now === 'sdLidar';
    lensClean.visible = !lens.visible;
    car.hood.rotation.z = GA.hoodA * clamp01(n.hood);
    setLit(car.computer, (n.ok ?? 0) > 0.5 ? LED : (n.bolt ?? 0) > 0 ? '#ffb300' : '#8a6200');
    cable.visible = now === 'sdHood' && (n.plug ?? 0) > 0.5;
    car.head.rotation.y = now === 'sdHood' && (n.ok ?? 0) > 0.5 ? t * 9 : 0;
    tag.visible = now === 'sdUnder' && (n.tagged ?? 0) > 0.5;
    setLit(up, now === 'sdUnder' && N?.b.from === 'up' ? '#57f28b' : '#2d6b3a');
    setLit(down, now === 'sdUnder' && N?.b.from === 'down' ? '#ff5252' : '#6b1414');
    at(tor.root, N?.tool === 'torch' ? P.torch : null);
    fade(tor.beam, (n.torch ?? 0) > 0.5 ? 0.22 : 0);
    at(drv, N?.tool === 'driver' ? P.driver : null);
    // Down into a bolt on the hood; into the side unit's bolts on the roof.
    drv.rotation.set(now === 'sdHood' ? -Math.PI / 2 : 0, 0, n.spin ?? 0);
    at(clo, N?.tool === 'cloth' ? P.cloth : null, [b[0] - 0.24, b[1] + 0.012, b[2] + 0.14]);
    clo.visible = true;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, GA.x + GA.hoodX, 0.9, GA.z);
}

// =============================================================================================
// 안전 게시판 (sdSafetyBoard, 3 × 1): the loop's map, this week's stops; where the runs are decided.

function safetyBoard(g: THREE.Group, out: Built) {
  const W = SB.x1 - SB.x0;
  const H = SB.y1 - SB.y0;
  const mid = onBoard(0.5, 0.5, SB.z);
  part(g, box(W + 0.1, H + 0.1, 0.06), GREY_D, mid[0], mid[1], SB.z - 0.04);
  for (const x of [-1.3, 1.3]) part(g, box(0.08, SB.y0, 0.1), GREY_D, x, SB.y0 / 2, SB.z - 0.04);
  part(g, box(1.56, 0.14, 0.05), TEAL, 0, SB.y1 + 0.11, SB.z - 0.04);
  label(g, '오늘의 시험 주행 · 안전 먼저', 1.5, 0.1, 0, SB.y1 + 0.11, SB.z - 0.012, TEAL, '#ffffff');
  const scr = liveScreen(g, W, H, 720, 324, mid[0], mid[1], SB.z + 0.002);
  const mate1 = person(g, '#00838f', '#263238', '#2b1b10', -1.5, 0.76, Math.PI / 2 - 0.1, 'male');
  const mate2 = person(g, '#455a64', '#1b2a30', '#5b3a1e', 1.5, 0.78, -Math.PI / 2 + 0.1, 'female');
  let signed = false;
  const tab = tabletTool(g, (c) => {
    c.fillStyle = '#10202c';
    c.fillRect(0, 0, 192, 132);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 192, 26);
    text(c, '주행 전 점검표', 8, 13, 15, '#ffffff');
    ['차량', '센서', '구역', '안전요원'].forEach((s, i) => {
      text(c, s, 12, 42 + i * 20, 13, '#d7eaf6', 'left', false);
      c.strokeStyle = '#9fd6ff';
      c.strokeRect(160, 34 + i * 20, 14, 14);
      if (signed) {
        c.fillStyle = LED;
        c.fillRect(163, 37 + i * 20, 8, 8);
      }
    });
  });
  const tools: Partial<Record<SdTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS } };
  const spots: Record<string, Spot> = { sdBrief: standAt(g, 'sdBrief', 0.15, SB.stand), selfDriving_leadSafety: standAt(g, 'sdLead', 0, SB.stand + 0.08) };
  const talk = new THREE.Vector3();
  const show = (_now: string | null, N: SdNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    signed = (n.signed ?? 0) > 0.5;
    at(tab.root, N?.tool === 'tablet' ? P.tablet : null);
    tab.draw(`${signed ? 1 : 0}`);
    const ptr = n.ptr ?? -1;
    const stamp = (n.stamp ?? 0) > 0.5;
    const bars = (n.bars ?? 0) > 0.5;
    scr.draw(`${q(ptr, 24)}|${stamp ? 1 : 0}|${bars ? 1 : 0}`, (c) => {
      c.fillStyle = '#f7f8f4';
      c.fillRect(0, 0, 720, 324);
      // The loop, on the left.
      text(c, '시험 구간', 20, 22, 22, NAVY);
      c.strokeStyle = '#3c4247';
      c.lineWidth = 16;
      c.lineJoin = 'round';
      c.beginPath();
      for (let i = 0; i <= 44; i++) {
        const p = carPose((i / 44) * LOOP);
        const x = 124 + p.x * 18;
        const y = 162 + p.z * 18 * 1.6;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.stroke();
      if (ptr >= 0) {
        const p = carPose(clamp01(ptr) * LOOP);
        c.fillStyle = RED;
        c.beginPath();
        c.arc(124 + p.x * 18, 162 + p.z * 18 * 1.6, pos(9), 0, Math.PI * 2);
        c.fill();
      }
      text(c, '건널목 · 일시 정지', 30, 262, 16, BLACK);
      text(c, '시속 20km 이하', 30, 286, 16, BLACK);
      // The day's runs, in the middle.
      text(c, '오늘의 시나리오', 262, 22, 22, NAVY);
      ['1. 건널목 보행자 정지', '2. 차로 장애물 회피', '3. 끼어들기 대응', '4. 야간 조명 인식', '5. 긴급 정지 시험'].forEach((s, i) => {
        c.fillStyle = i < 2 ? '#c9efd4' : '#e5e9ec';
        c.fillRect(258, 46 + i * 44, 200, 36);
        text(c, s, 266, 64 + i * 44, 15, BLACK, 'left', false);
      });
      // This week's stops, on the right.
      text(c, '안전요원 개입 (이번 주)', 482, 22, 20, NAVY);
      const vals = [7, 5, 6, 3, 2];
      vals.forEach((v, i) => {
        const hh = v * 26;
        c.fillStyle = bars && i === vals.length - 1 ? RED : TEAL;
        c.fillRect(490 + i * 44, 256 - hh, 32, hh);
        text(c, `${v}`, 506 + i * 44, 244 - hh, 16, BLACK, 'center');
        text(c, ['월', '화', '수', '목', '금'][wrap(i, 5)], 506 + i * 44, 276, 16, BLACK, 'center');
      });
      if (stamp) {
        c.strokeStyle = RED;
        c.lineWidth = 5;
        c.strokeRect(556, 286, 150, 32);
        text(c, '시험 승인', 631, 302, 20, RED, 'center');
      }
    });
    const mates = N ? (n.mate ?? 0) : 0;
    mate1.root.visible = mates >= 1;
    mate2.root.visible = mates >= 2;
    const says = (n.says ?? 0) > 0.5;
    const nods = (n.nods ?? 0) > 0.5;
    for (const [i, F] of [mate1, mate2].entries()) {
      F.opts.nod = nods ? 0.14 + 0.16 * Math.sin(t * 6 + i) : 0.05;
      F.head.rotation.x = F.opts.nod;
      talk.set(i === 0 ? -1.2 : 1.2, 1.34 + 0.05 * Math.sin(t * 4), 0.86);
      F.armR(i === 0 && says ? talk : null);
      F.armL(i === 1 && says ? talk : null);
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, mid[0], mid[1], mid[2] + 0.1);
}

// =============================================================================================
// Set dressing.

/** Open shelves of the sensors a test car wears: boxes labelled, lidars and cameras out on the top. */
function sensorShelf(g: THREE.Group) {
  const T = 1.86;
  for (const x of [-1.42, 0, 1.42]) part(g, box(0.05, T, 0.5), GREY, x, T / 2, 0);
  const rows = [0.32, 0.8, 1.28, 1.8];
  for (const y of rows) part(g, box(2.88, 0.03, 0.5), GREY, 0, y, 0);
  const NAMES = ['라이다', '레이더', '카메라', '보정 도구', '배선', '안테나'];
  const r = seeded(41);
  rows.slice(0, 3).forEach((y, j) => {
    for (let i = 0; i < 6; i++) {
      if (r() < 0.2) continue;
      const x = -1.14 + i * 0.46;
      part(g, rbox(0.38, 0.28, 0.36, 0.01), ['#90a4ae', '#d7ccc8', '#bcaaa4'][wrap(r() * 3, 3)], x, y + 0.155, 0.02);
      label(g, NAMES[wrap(i + j * 2, NAMES.length)], 0.3, 0.07, x, y + 0.16, 0.204, '#ffffff', BLACK);
    }
  });
  for (const x of [-1.0, -0.2, 0.6]) {
    part(g, cyl(0.09, 0.1, 0.13, 16), '#20262b', x, 1.88, 0);
    part(g, cyl(0.092, 0.092, 0.03, 16), TEAL, x, 1.92, 0, { outline: false });
  }
}
/**
 * The monitoring wall in the engineers' office (sdMonitorWall, 3 × 1; 2026-11-05, the layout audit): three screens on the wall,
 * the course map with the test car on it, its lidar's view, and the fleet's status, live while the car is out on the course.
 */
function monitorWall(g: THREE.Group, out: Built) {
  const z = -0.42;
  part(g, box(2.94, 0.06, 0.1), GRAPHITE, 0, 0.9, z);
  part(g, rbox(2.7, 0.46, 0.4, 0.03), '#46525a', 0, 0.38, z + 0.14);
  part(g, box(2.7, 0.14, 0.06), NAVY, 0, 2.38, z);
  label(g, '시험 차량 관제', 1.2, 0.1, 0, 2.38, z + 0.035, NAVY, '#ffffff');
  const scr: ReturnType<typeof liveScreen>[] = [];
  for (const [i, x] of [-0.95, 0, 0.95].entries()) {
    part(g, rbox(0.92, 0.56, 0.04, 0.01), BLACK, x, 1.6, z);
    scr.push(liveScreen(g, 0.88, 0.52, 352, 208, x, 1.6, z + 0.022 + i * 0.0005));
  }
  out.away = (_o, t) => {
    const live = recent(SD_LIVE.at, t);
    const s = live ? SD_LIVE.s : S0;
    const tick = Math.floor(t * 4);
    scr[0].draw(`${q(s, 20)}|${live ? 1 : 0}`, (c) => {
      miniMap(c, 0, 0, 352, 208, s, live);
      text(c, '실외 시험장', 10, 16, 16, '#d7eaf6');
    });
    scr[1].draw(`${tick}|${q(s, 20)}|${live ? 1 : 0}`, (c) => {
      pointCloud(c, 0, 0, 352, 208, s, live && SD_LIVE.dodge > 0.5, live ? SD_LIVE.dummy : 0, 0, tick);
      text(c, live ? '시험차 1호 · 라이다' : '대기 중', 10, 16, 15, live ? LED : '#9fd6ff');
    });
    scr[2].draw(`${live ? SD_LIVE.mode : -1}`, (c) => {
      c.fillStyle = '#10202c';
      c.fillRect(0, 0, 352, 208);
      text(c, '차량 상태', 12, 20, 18, '#ffffff');
      [['시험 1호', live ? (SD_LIVE.mode === 2 ? '긴급 정지' : '주행 중') : '대기'], ['시험 2호', '정비 중'], ['통신', '정상'], ['안전요원', '탑승']].forEach(([k, v], i) => {
        text(c, k, 16, 60 + i * 38, 17, '#9fd6ff', 'left', false);
        text(c, v, 336, 60 + i * 38, 17, v === '긴급 정지' ? '#ff8a80' : LED, 'right', false);
      });
    });
  };
}
/**
 * The garage's shell (sdGarageShell, anchored on the tile at lot (6, 6); 2026-11-05, the layout audit): the garage is open to the
 * course on its east side, so its walls to the lot are pieces. The back and west walls, the stub of the east wall below the opening,
 * and the header over the opening with the shutter rolled up under it, the yellow-and-black guides down its sides, the name over it.
 */
function garageShell(g: THREE.Group) {
  const L = (X: number) => X - 6.5;
  const H = 3.0;
  const wall = (x0: number, z0: number, x1: number, z1: number) => {
    const w = Math.max(0.24, Math.abs(x1 - x0));
    const d = Math.max(0.24, Math.abs(z1 - z0));
    part(g, box(w, H, d), '#e8e2d4', L((x0 + x1) / 2), H / 2, L((z0 + z1) / 2));
    part(g, box(w + 0.02, 0.08, d + 0.04), '#9aa3a8', L((x0 + x1) / 2), H - 0.04, L((z0 + z1) / 2));
    part(g, box(w + 0.01, 0.16, d + 0.02), '#6d6f73', L((x0 + x1) / 2), 0.08, L((z0 + z1) / 2));
  };
  wall(1.76, 1.88, 11.24, 1.88);
  wall(1.88, 1.76, 1.88, 8.0);
  wall(11.12, 4.95, 11.12, 8.0);
  // The header over the opening (lot y 2 to 5), the shutter rolled up beneath it inside, its guides.
  const top = 2.72;
  part(g, box(0.3, H - top, 3.3), '#e8e2d4', L(11.12), (H + top) / 2, L(3.4));
  part(g, cyl(0.2, 0.2, 2.9, 16), '#5b6068', L(10.85), top - 0.2, L(3.48), { rx: Math.PI / 2 });
  part(g, box(0.04, 0.12, 2.86), TEAL, L(10.98), top - 0.44, L(3.48));
  for (const y of [2.06, 4.9]) {
    part(g, box(0.08, top - 0.05, 0.09), '#5b6068', L(11.0), (top - 0.05) / 2, L(y));
    for (let i = 0; i < 5; i++) part(g, box(0.085, 0.2, 0.095), i % 2 ? BLACK : '#f5c518', L(11.0), 0.15 + i * 0.4, L(y), { outline: false });
  }
  label(g, '시험차 정비동 · 시험장 출입', 2.4, 0.2, L(11.29), 2.86, L(3.48), NAVY, '#ffffff', Math.PI / 2);
  // The threshold line on the floor.
  part(g, box(0.1, 0.004, 2.9), '#f5c518', L(11.2), 0.012, L(3.48), { outline: false });
}
/** A charging post with its cable. */
function charger(g: THREE.Group) {
  part(g, rbox(0.42, 1.42, 0.22, 0.04), WHITE, 0, 0.71, -0.14);
  part(g, box(0.42, 0.14, 0.224), TEAL, 0, 1.28, -0.14, { outline: false });
  ownLit(g, box(0.24, 0.18, 0.004), '#7fdbff', 0, 1.0, -0.027);
  ownLit(g, box(0.06, 0.02, 0.004), LED, 0, 0.84, -0.027);
  label(g, '충전기 1', 0.24, 0.06, 0, 1.28, -0.026, TEAL, '#ffffff');
  const a = v3(0.16, 0.74, -0.02);
  const m = v3(0.34, 0.22, 0.12);
  const e = v3(0.18, 0.5, 0.0);
  rod(g, a, m, 0.012, BLACK);
  rod(g, m, e, 0.012, BLACK);
  part(g, rbox(0.06, 0.14, 0.05, 0.015), GRAPHITE, 0.18, 0.56, 0.0, { outline: false });
}
function siteSign(g: THREE.Group) {
  part(g, box(0.82, 1.82, 0.05), NAVY, 0, 0.98, -0.38);
  picture(g, painted('sdSign', 340, 720, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 340, 720);
    c.fillStyle = TEAL;
    c.fillRect(0, 0, 340, 96);
    text(c, FIRM, 170, 50, 32, '#ffffff', 'center');
    text(c, '자율주행 개발 센터', 170, 132, 26, NAVY, 'center');
    ['① 시험장은 사람 우선', '② 시험차엔 안전요원', '③ 손은 핸들 가까이', '④ 위험하면 비상 정지', '⑤ 기록은 끝까지 남겨요'].forEach((s, i) => text(c, s, 16, 200 + i * 66, 22, BLACK));
    c.fillStyle = '#7fdbff';
    c.fillRect(0, 590, 340, 130);
    text(c, '사고 없이', 170, 630, 30, BLACK, 'center');
    text(c, '오늘도 한 바퀴', 170, 676, 30, BLACK, 'center');
  }), 0.78, 1.72, 0, 0.98, -0.35);
  part(g, cyl(0.26, 0.28, 0.03, 18), GREY_D, 0, 0.015, -0.36);
}

export const BUILDERS: Record<string, Builder> = {
  sdTrack(g, _W, _D, _c, _def, _ctx, out) {
    track(g, out);
  },
  sdCalibBoard(g, _W, _D, _c, _def, _ctx, out) {
    calibBoard(g, out);
  },
  sdLogDesk(g, _W, _D, _c, _def, _ctx, out) {
    logDesk(g, out);
  },
  sdLabelStation(g, _W, _D, _c, _def, _ctx, out) {
    labelStation(g, out);
  },
  sdGarage(g, _W, _D, _c, _def, _ctx, out) {
    garage(g, out);
  },
  sdSafetyBoard(g, _W, _D, _c, _def, _ctx, out) {
    safetyBoard(g, out);
  },
  sdSensorShelf(g) {
    sensorShelf(g);
  },
  sdCharger(g) {
    charger(g);
  },
  sdSign(g) {
    siteSign(g);
  },
  sdMonitorWall(g, _W, _D, _c, _def, _ctx, out) {
    monitorWall(g, out);
  },
  sdGarageShell(g) {
    garageShell(g);
  },
};
