import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, seeded, text } from './doctor';
import { BB, CD, DIP_TUBE, DOOR_SWING, GE_LIVE, IB, MA, NM, PP, SB, SR, TB, WRENCH, boltAt, cellAt, geNow, gePhase, outputAt, srAt, stormy, sunAt, windAt, windMs } from './greenEnergyMotion';
import type { GeMotion, GeNow, GeTool } from './greenEnergyMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 태양광·풍력 발전 단지 drawn as itself (2026-11-01, a new career at the user's request), a site of a made-up company, 바람해에너지.
 * Everything answers to the weather: the sun and the wind are functions of the clock (greenEnergyMotion.ts), the blades turn with the
 * wind, the panels catch the sun, and the wall in the control room, the inverters and the battery all read the same numbers.
 *
 * Low pieces in the front rows: the panels top out under a metre and a half. The turbine, the mock-up and the container are along the
 * back, the substation behind its fence south of the office with nothing behind it. All names are made up.
 */

const FIRM = '바람해에너지';
const WHITE = '#eef1f3';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const NAVY = '#17406d';
const GREEN = '#2e8b57';
const GREEN_L = '#7fd8a4';
const YELLOW = '#f5c518';
const AMBER = '#ffb300';
const RED = '#e53935';
const LED = '#76ff8a';
const BLUE = '#2f6fd0';
const CELL = '#16345c';
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
/** A radius a canvas will take, whatever went into it. */
const pos = (r: number) => Math.max(0.5, Number.isFinite(r) ? r : 0.5);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);

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
function standAt(g: THREE.Object3D, motion: GeMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<GeTool, HeldTool>>, show: (now: string | null, N: GeNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? geNow(sp.motion as GeMotion, t, gePhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t);
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
function fenceRun(g: THREE.Object3D, x0: number, z0: number, x1: number, z1: number, H: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(z0 - z1, x1 - x0);
  const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i <= n; i++) {
    const e = i / n;
    part(g, cyl(0.025, 0.025, H, 8), GREY, x0 + (x1 - x0) * e, H / 2, z0 + (z1 - z0) * e, { outline: false });
  }
  for (const y of [0.1, H - 0.03]) part(g, box(len, 0.025, 0.025), GREY, (x0 + x1) / 2, y, (z0 + z1) / 2, { ry, outline: false });
  const mesh = painted('geFenceMesh', 128, 128, (c) => {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2.2;
    for (let i = -128; i <= 256; i += 18) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 128, 128);
      c.moveTo(i, 128);
      c.lineTo(i + 128, 0);
      c.stroke();
    }
  });
  const pane = haze(g, new THREE.PlaneGeometry(len, H - 0.12), '#59646c', 0.7, (x0 + x1) / 2, H / 2 + 0.03, (z0 + z1) / 2);
  pane.rotation.y = ry;
  (pane.material as THREE.MeshBasicMaterial).alphaMap = mesh;
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

function tabletTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geTablet';
  const tilt = group(root);
  tilt.rotation.x = -0.55;
  part(tilt, rbox(0.24, 0.17, 0.012, 0.006), GRAPHITE, 0, 0, 0, { outline: false });
  picture(tilt, painted('geTabletFace', 192, 136, (c) => {
    c.fillStyle = '#10202c';
    c.fillRect(0, 0, 192, 136);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 192, 26);
    text(c, '설비 점검표', 8, 13, 15, '#ffffff');
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
/** A telescopic pole with a soft brush: +y from the rear hand, as long as it needs to be; the head stays square across. */
function poleTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'gePole';
  part(root, cyl(0.014, 0.014, 0.9, 10), '#2a6fb0', 0, 0.35, 0, { outline: false });
  const inner = part(root, cyl(0.009, 0.009, 1, 8), CHROME, 0, 0.8, 0, { outline: false });
  const head = group(root, 0, 1.2, 0);
  part(head, rbox(0.56, 0.05, 0.07, 0.015), '#f0f3f4', 0, 0, 0, { outline: false });
  part(head, box(0.54, 0.05, 0.05), '#2f7fc0', 0, 0.04, 0, { outline: false });
  const spray = haze(head, new THREE.PlaneGeometry(0.62, 0.16), '#bfeaff', 0.5, 0, 0.12, 0);
  return { root, inner, head, spray };
}
const POLE_GRIPS: HeldTool['grips'] = {
  right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power' },
  left: { at: v3(0, 0.34, 0), axis: v3(0, 1, 0), shape: 'power', slide: true },
};
/** A pistol-grip thermal camera: the grip at the origin, the lens ahead (-z), its screen looking back at whoever holds it. */
function thermalTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geThermal';
  part(root, rbox(0.04, 0.12, 0.05, 0.012), GRAPHITE, 0, -0.01, 0.0, { outline: false, rx: 0.2 });
  part(root, rbox(0.09, 0.09, 0.2, 0.018), '#e8a11b', 0, 0.09, -0.05, { outline: false });
  part(root, cyl(0.032, 0.036, 0.05, 16), BLACK, 0, 0.09, -0.17, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.022, 0.022, 0.004, 16), '#5a3f9b', 0, 0.09, -0.197, { rx: Math.PI / 2, outline: false });
  part(root, box(0.012, 0.03, 0.01), BLACK, 0, 0.018, -0.042, { outline: false });
  const screen = liveScreen(root, 0.075, 0.062, 96, 80, 0, 0.09, 0.0515);
  return { root, screen };
}
function driverTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geDriver';
  part(root, cyl(0.016, 0.014, 0.1, 10), '#ef7d22', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.004, 0.004, 0.11, 8), CHROME, 0, 0, -0.1, { rx: Math.PI / 2, outline: false });
  return root;
}
function radioTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geRadio';
  part(root, rbox(0.058, 0.13, 0.034, 0.008), BLACK, 0, 0.01, 0, { outline: false });
  part(root, box(0.04, 0.03, 0.002), '#7fdbff', 0, 0.05, 0.018, { outline: false });
  part(root, cyl(0.004, 0.006, 0.12, 6), GRAPHITE, 0.018, 0.13, 0, { outline: false });
  return root;
}
/** A long torque wrench: the grip at the origin, the head WRENCH ahead (-z) with its socket going down. */
function wrenchTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geWrench';
  part(root, cyl(0.016, 0.016, 0.1, 10), BLACK, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.009, 0.009, WRENCH, 8), CHROME, 0, 0, -WRENCH / 2, { rx: Math.PI / 2, outline: false });
  part(root, box(0.03, 0.022, 0.05), GREY_D, 0, 0, -WRENCH, { outline: false });
  part(root, cyl(0.016, 0.016, 0.05, 10), GRAPHITE, 0, -0.036, -WRENCH, { outline: false });
  part(root, box(0.012, 0.03, 0.06), YELLOW, 0, 0.012, -0.12, { outline: false });
  return root;
}
const WRENCH_GRIPS: HeldTool['grips'] = {
  right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.016 },
  left: { at: v3(0, 0, -0.12), axis: v3(0, 0, -1), shape: 'power', radius: 0.01, slide: true },
};
/** A dipstick: a loop at the origin, the stick below it, oil on its lower end. */
function dipTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geDip';
  part(root, cyl(0.012, 0.012, 0.03, 8), '#f5c518', 0, 0, 0, { outline: false });
  part(root, cyl(0.0035, 0.0035, 0.3, 6), CHROME, 0, -0.16, 0, { outline: false });
  const oil = part(root, cyl(0.005, 0.005, 0.1, 6), '#6b4a15', 0, -0.26, 0, { outline: false });
  for (const y of [-0.22, -0.28]) part(root, box(0.012, 0.002, 0.012), BLACK, 0, y, 0, { outline: false });
  return { root, oil };
}
/** A grease gun, the trigger under the barrel at the origin, the nozzle ahead. */
function greaseTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geGrease';
  part(root, rbox(0.03, 0.11, 0.045, 0.01), BLACK, 0, -0.02, 0, { outline: false, rx: 0.2 });
  part(root, cyl(0.03, 0.03, 0.24, 14), RED, 0, 0.06, 0.1, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.008, 0.008, 0.16, 8), GREY_D, 0, 0.06, -0.1, { rx: Math.PI / 2, outline: false });
  const lever = part(root, box(0.012, 0.012, 0.09), CHROME, 0, 0.1, -0.02, { outline: false });
  return { root, lever };
}
function probeTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geProbe';
  part(root, cyl(0.012, 0.012, 0.1, 10), RED, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.002, 0.002, 0.09, 6), CHROME, 0, 0, -0.095, { rx: Math.PI / 2, outline: false });
  return root;
}
/** A clamp meter: the handle at the origin, its jaws ahead round the cable, the reading looking back. */
function clampTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geClamp';
  part(root, rbox(0.06, 0.16, 0.036, 0.012), '#f2c230', 0, 0, 0, { outline: false });
  part(root, new THREE.TorusGeometry(0.05, 0.012, 8, 16), BLACK, 0, 0.11, -0.04, { rx: Math.PI / 2, outline: false });
  const screen = liveScreen(root, 0.05, 0.036, 64, 46, 0, 0.02, 0.019);
  return { root, screen };
}
/** A fan's filter panel, a hand at each side. */
function filterTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geFilter';
  part(root, box(0.42, 0.22, 0.03), GREY_D, 0, 0, 0, { outline: false });
  const dirty = part(root, box(0.38, 0.18, 0.032), '#6e6250', 0, 0, 0, { outline: false });
  const clean = part(root, box(0.38, 0.18, 0.032), '#eef4f2', 0, 0, 0, { outline: false });
  return { root, dirty, clean };
}
const FILTER_GRIPS: HeldTool['grips'] = {
  right: { at: v3(0.2, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.018 },
  left: { at: v3(-0.2, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.018 },
};
/** A safety harness held up by its back ring, its webbing hanging. */
function harnessTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geHarness';
  part(root, new THREE.TorusGeometry(0.022, 0.005, 6, 14), CHROME, 0, 0, 0, { outline: false });
  for (const sx of [-1, 1]) {
    rod(root, v3(0, -0.02, 0), v3(sx * 0.1, -0.2, 0.01), 0.009, '#f27a1a');
    rod(root, v3(sx * 0.1, -0.2, 0.01), v3(sx * 0.12, -0.46, 0), 0.009, '#f27a1a');
    part(root, new THREE.TorusGeometry(0.04, 0.008, 6, 12), '#f27a1a', sx * 0.1, -0.5, 0.0, { outline: false });
  }
  part(root, box(0.26, 0.018, 0.01), '#1c4f9c', 0, -0.26, 0.01, { outline: false });
  const gate = part(root, box(0.012, 0.05, 0.012), CHROME, 0.14, -0.3, 0.02, { outline: false });
  return { root, gate };
}
function clothTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'geCloth';
  part(root, rbox(0.11, 0.09, 0.016, 0.008), '#7fb6e6', 0, 0, 0, { outline: false });
  return root;
}
const PISTOL = (r = 0.018): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'trigger', radius: r } });
const DRIVER_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.015 } };
const UPRIGHT = (r: number, shape: 'power' | 'pinch' = 'power'): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape, radius: r } });
const PEN = (r = 0.012): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pen', radius: r } });

/** Puts each tool of a piece in the hand or away; returns nothing to do when nobody's on it. */
function placeTools(N: GeNow | null, list: Array<[GeTool, THREE.Object3D]>) {
  for (const [name, root] of list) at(root, N?.tool === name ? N.props[name] : null);
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
// 태양광 패널 열 (geSolarRow, 6 × 2): six modules across and two up on a tilted rack; dust, a shine, a hot cell only the camera sees.

const DECK_L = Math.hypot(SR.highY - SR.lowY, SR.highZ - SR.lowZ);
const MOD_W = SR.W / 6;
const MOD_H = DECK_L / 2;
function moduleFace(c: Ctx2, w: number, h: number) {
  c.fillStyle = CELL;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#2f5688';
  c.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    c.beginPath();
    c.moveTo((i / 6) * w, 0);
    c.lineTo((i / 6) * w, h);
    c.stroke();
  }
  for (let j = 0; j <= 10; j++) {
    c.beginPath();
    c.moveTo(0, (j / 10) * h);
    c.lineTo(w, (j / 10) * h);
    c.stroke();
  }
  c.strokeStyle = '#d7dfe5';
  c.lineWidth = 5;
  c.strokeRect(0, 0, w, h);
}
/** What the thermal camera sees: cool purples, warm junction boxes, and the one hot cell if it's in the picture. */
function paintThermal(c: Ctx2, w: number, h: number, span: number, aim: number) {
  c.fillStyle = '#23104f';
  c.fillRect(0, 0, w, h);
  const toX = (x: number) => w / 2 + ((x - aim) / span) * w;
  for (let i = -3; i <= 3; i++) {
    const X = toX(i * MOD_W);
    c.fillStyle = '#4a1f85';
    c.fillRect(X - 1, 0, 2, h);
  }
  c.fillStyle = '#7f2d90';
  c.fillRect(0, h * 0.12, w, h * 0.06);
  c.fillStyle = '#6a2690';
  c.fillRect(0, h * 0.62, w, h * 0.06);
  const hx = toX(SR.hotX);
  const hy = h * (1 - SR.hotV);
  if (hx > -w * 0.2 && hx < w * 1.2) {
    const R = pos(w * 0.14);
    const grad = c.createRadialGradient(hx, hy, 0.5, hx, hy, R);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#ffd54f');
    grad.addColorStop(0.6, '#f4511e');
    grad.addColorStop(1, 'rgba(120,20,120,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(hx, hy, R, 0, Math.PI * 2);
    c.fill();
  }
}
function solarRow(g: THREE.Group, out: Built) {
  // The rack: posts, rails, footings, a cable tray under it.
  const postXs = [-2.4, -0.8, 0.8, 2.4];
  for (const x of postXs) {
    part(g, cyl(0.1, 0.13, 0.12, 12), '#b5b8b6', x, 0.06, 0.32);
    part(g, cyl(0.1, 0.13, 0.12, 12), '#b5b8b6', x, 0.06, -0.52);
    part(g, box(0.05, 0.6, 0.05), CHROME, x, 0.3, 0.32);
    part(g, box(0.05, 1.08, 0.05), CHROME, x, 0.54, -0.52);
    rod(g, v3(x, 0.6, 0.32), v3(x, 1.05, -0.5), 0.022, GREY);
    rod(g, v3(x, 0.14, 0.32), v3(x, 0.98, -0.52), 0.014, GREY);
  }
  part(g, box(SR.W, 0.03, 0.05), GREY_D, 0, 0.72, 0.36, { outline: false });
  part(g, box(SR.W, 0.03, 0.05), GREY_D, 0, 1.1, -0.42, { outline: false });
  part(g, box(SR.W - 0.1, 0.04, 0.12), GREY_D, 0, 0.3, -0.2, { outline: false });
  for (let i = 0; i < 5; i++) rod(g, v3(-2.3 + i * 0.96, 0.32, -0.2), v3(-2.3 + i * 0.96, 0.66, 0.1), 0.006, BLACK);
  // The face of the panels.
  const deck = group(g, 0, (SR.lowY + SR.highY) / 2, (SR.lowZ + SR.highZ) / 2);
  deck.rotation.x = -SR.tilt;
  part(deck, box(SR.W + 0.04, DECK_L + 0.04, 0.03), '#c7ced3', 0, 0, -0.018, { outline: true });
  const face = painted('geSolarFace', 192, 160, (c) => moduleFace(c, 192, 160));
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) picture(deck, face, MOD_W - 0.012, MOD_H - 0.012, -SR.W / 2 + MOD_W * (i + 0.5), -DECK_L / 2 + MOD_H * (j + 0.5), 0.002);
  // Dust, a column at a time; the sun's shine sliding as the clouds pass; a wet sheen behind the brush.
  const dust = [0, 1, 2, 3, 4, 5].map((i) => haze(deck, new THREE.PlaneGeometry(MOD_W - 0.01, DECK_L - 0.01), '#c8ad7e', 0.4, -SR.W / 2 + MOD_W * (i + 0.5), 0, 0.004));
  const shine = haze(deck, new THREE.PlaneGeometry(1.2, DECK_L - 0.02), '#fff6d9', 0.2, 0, 0, 0.006);
  const wet = haze(deck, new THREE.PlaneGeometry(SR.W - 0.02, DECK_L - 0.02), '#bfeaff', 0.22, 0, 0, 0.007);
  wet.visible = false;
  // The module that's changed: a gap, a crack over it till the new one's in.
  const swapLocal = (SR.swapX + SR.W / 2) / MOD_W;
  const swapCol = Math.floor(swapLocal);
  const gapX = -SR.W / 2 + MOD_W * (swapCol + 0.5);
  const gapY = -DECK_L / 2 + MOD_H * 0.5;
  const gap = part(deck, box(MOD_W - 0.01, MOD_H - 0.01, 0.006), '#3a4248', gapX, gapY, 0.004, { outline: false });
  const crackTex = painted('geCrack', 128, 100, (c) => {
    c.clearRect(0, 0, 128, 100);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    for (const [dx, dy] of [[60, -40], [-50, -30], [40, 42], [-30, 44], [-62, 10]]) {
      c.beginPath();
      c.moveTo(64, 50);
      c.lineTo(64 + dx * 0.5, 50 + dy * 0.6);
      c.lineTo(64 + dx, 50 + dy);
      c.stroke();
    }
  });
  const crack = haze(deck, new THREE.PlaneGeometry(MOD_W - 0.02, MOD_H - 0.02), '#ffffff', 0.9, gapX, gapY, 0.009);
  (crack.material as THREE.MeshBasicMaterial).map = crackTex;
  crack.visible = false;
  // The thermal overlay: what the camera's looking at, laid on the panels so it reads from here too.
  const SPAN = 1.7;
  const overlay = liveScreen(deck, SPAN, DECK_L - 0.02, 192, 96, 0, 0, 0.012);
  (overlay.mesh.material as THREE.MeshBasicMaterial).transparent = true;
  (overlay.mesh.material as THREE.MeshBasicMaterial).opacity = 0.86;
  overlay.mesh.visible = false;
  // The red tag stuck beside the hot cell.
  const hot = srAt(SR.hotX, SR.hotV);
  const tag = group(g, hot[0], hot[1] + 0.01, hot[2]);
  tag.rotation.x = -SR.tilt;
  part(tag, box(0.09, 0.06, 0.004), RED, 0, 0, 0.004, { outline: false });
  tag.visible = false;
  // The combiner box and its breaker, at the row's left end.
  const B = SR.breaker;
  part(g, box(0.05, B[1] + 0.2, 0.05), GREY_D, B[0], (B[1] + 0.2) / 2, B[2] - 0.08, { outline: false });
  part(g, rbox(0.3, 0.36, 0.13, 0.015), '#dfe3e6', B[0], B[1], B[2] - 0.08);
  const lamp = ownLit(g, cyl(0.016, 0.016, 0.008, 10), LED, B[0] - 0.08, B[1] + 0.1, B[2] - 0.012);
  lamp.rotation.x = Math.PI / 2;
  part(g, box(0.05, 0.08, 0.02), RED, B[0], B[1], B[2] - 0.006, { outline: false });
  label(g, '접속반', 0.22, 0.05, B[0], B[1] - 0.12, B[2] - 0.013, '#dfe3e6', BLACK);
  // The loose module and the new one waiting beside the row.
  const Mw = MOD_W - 0.04;
  const Mh = MOD_H - 0.04;
  const loose = group(g);
  part(loose, box(Mw, Mh, 0.03), '#c7ced3', 0, 0, -0.012, { outline: false });
  picture(loose, face, Mw - 0.02, Mh - 0.02, 0, 0, 0.005);
  const looseCrack = haze(loose, new THREE.PlaneGeometry(Mw - 0.02, Mh - 0.02), '#ffffff', 0.9, 0, 0, 0.008);
  (looseCrack.material as THREE.MeshBasicMaterial).map = crackTex;
  loose.visible = false;
  const standby = group(g, SR.stack[0], SR.stack[1], SR.stack[2]);
  standby.rotation.x = -1.2;
  part(standby, box(Mw, Mh, 0.03), '#c7ced3', 0, 0, -0.012, { outline: false });
  picture(standby, face, Mw - 0.02, Mh - 0.02, 0, 0, 0.005);
  part(g, box(0.12, 0.16, 0.42), '#b5966b', SR.stack[0], 0.08, SR.stack[2] - 0.22);
  // Hands' tools.
  const pole = poleTool(g);
  const cam = thermalTool(g);
  const drv = driverTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<GeTool, HeldTool>> = {
    pole: { tool: pole.root, lead: 'right', grips: POLE_GRIPS },
    thermal: { tool: cam.root, lead: 'right', grips: PISTOL() },
    driver: { tool: drv, lead: 'right', grips: DRIVER_GRIP },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = {
    geWash: standAt(g, 'geWash', -2.3, SR.stand),
    geScan: standAt(g, 'geScan', -1.5, SR.stand),
    greenEnergy_swapPanel: standAt(g, 'geSwap', SR.breaker[0] + 0.08, SR.stand),
  };
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const sun = sunAt(t);
    shine.position.x = 2.4 * Math.sin(t / 19);
    fade(shine, 0.05 + 0.3 * sun);
    const washing = (n.wet ?? 0) > 0.5;
    dust.forEach((m, i) => fade(m, washing ? 0.42 * clamp01(1 - ((n.clean ?? 0) * 6 - i)) : 0.2));
    fade(wet, washing ? 0.22 * clamp01(n.sheen) : 0);
    // The pole, from the hand to the head.
    const hasPole = N?.tool === 'pole';
    placeTools(N, [['pole', pole.root], ['thermal', cam.root], ['driver', drv], ['tablet', tab.root]]);
    if (hasPole && P.pole && P.head) {
      tA.set(P.head[0], P.head[1], P.head[2]);
      tB.set(P.pole[0], P.pole[1], P.pole[2]);
      const L = Math.max(0.6, tA.distanceTo(tB));
      tA.sub(tB).normalize();
      pole.root.quaternion.setFromUnitVectors(UP_V, tA);
      pole.head.position.y = L;
      pole.inner.position.y = 0.8 + (L - 0.8) / 2;
      pole.inner.scale.y = Math.max(0.05, L - 0.8);
      fade(pole.spray, (n.washing ?? 0) + (n.rinse ?? 0) > 0.5 ? 0.45 + 0.15 * Math.sin(t * 19) : 0);
    }
    drv.rotation.z = n.spin ?? 0;
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
    // The camera's picture, on it and on the panels.
    const scanning = (n.scan ?? 0) > 0.5;
    overlay.mesh.visible = scanning;
    tag.visible = (n.tagged ?? 0) > 0.5;
    if (scanning) {
      const aim = n.aim ?? 0;
      overlay.mesh.position.x = THREE.MathUtils.clamp(aim, -SR.W / 2 + SPAN / 2, SR.W / 2 - SPAN / 2);
      const cx = overlay.mesh.position.x;
      overlay.draw(`${q(cx, 30)}`, (c) => paintThermal(c, 192, 96, SPAN, cx));
      cam.screen.draw(`${q(aim, 20)}|${q(n.temp, 1)}`, (c) => {
        paintThermal(c, 96, 80, SPAN * 0.8, aim);
        text(c, `${Math.round(n.temp ?? 0)}°C`, 4, 10, 13, (n.found ?? 0) > 0.5 ? '#ffd54f' : '#ffffff');
      });
    }
    // The swap.
    const swapping = (n.swap ?? 0) > 0.5;
    gap.visible = swapping && (n.out ?? 0) > 0.5;
    crack.visible = swapping && (n.newIn ?? 0) < 0.5 && (n.out ?? 0) < 0.5 && (n.fresh ?? 0) < 0.5;
    setLit(lamp, swapping && (n.live ?? 0) < 0.5 ? '#5a1414' : LED);
    const loosely = !!P.mod;
    loose.visible = loosely;
    if (P.mod) {
      loose.position.set(P.mod[0], P.mod[1], P.mod[2]);
      loose.rotation.x = -SR.tilt * clamp01(n.lay);
    }
    looseCrack.visible = (n.fresh ?? 0) < 0.5;
    standby.visible = !swapping || (n.tookNew ?? 0) < 0.5;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 0.9, 0.6);
}

// =============================================================================================
// 풍력 터빈 (geTurbine, 3 × 2): a full tower at the back of the lot, its blades in the wind, its base door opening on the panel.

function bladeSet(parent: THREE.Object3D, L: number, root: number, color = WHITE, outline = true) {
  const rotor = group(parent);
  const pitched: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const arm = group(rotor);
    arm.rotation.z = (i / 3) * Math.PI * 2;
    const p = group(arm, 0, root * 0.5, 0);
    const m = part(p, cyl(root * 0.15, root, L, 10), color, 0, L / 2, 0, { outline });
    m.scale.z = 0.38;
    const tip = part(p, box(root * 0.25, L * 0.05, root * 0.1), RED, 0, L * 0.95, 0, { outline: false });
    void tip;
    pitched.push(p);
  }
  return { rotor, pitched };
}
function turbine(g: THREE.Group, out: Built) {
  // The pad, the vestibule at the tower's foot, and the tower.
  part(g, box(2.9, 0.08, 1.92), '#b5b8b6', 0, 0.04, 0);
  part(g, cyl(0.28, 0.62, 13.4, 24), WHITE, 0, 13.4 / 2, TB.towerZ);
  for (const y of [3.2, 6.6, 10]) part(g, cyl(0.62 - (y / 13.4) * 0.34 + 0.012, 0.62 - (y / 13.4) * 0.34 + 0.012, 0.03, 24), GREY, 0, y, TB.towerZ, { outline: false });
  part(g, cyl(0.615, 0.625, 0.8, 24), GREEN, 0, 2.6, TB.towerZ, { outline: false });
  label(g, FIRM, 0.84, 0.16, 0, 2.6, TB.towerZ + 0.6, GREEN, '#ffffff');
  const V0 = TB.doorZ - 0.3;
  part(g, box(0.92, 2.14, 0.04), GREY_D, 0, 1.07, V0 - 0.02);
  for (const sx of [-1, 1]) part(g, box(0.05, 2.14, 0.34), GREY_D, sx * 0.44, 1.07, TB.doorZ - 0.14);
  part(g, box(0.92, 0.06, 0.34), GREY_D, 0, 2.14, TB.doorZ - 0.14);
  // Inside: the ladder going up behind the panel, the panel.
  for (let y = 0.3; y < 2.1; y += 0.27) part(g, box(0.3, 0.018, 0.018), GREY, -0.2, y, V0 + 0.04, { outline: false });
  for (const sx of [-0.35, -0.05]) part(g, box(0.018, 2.1, 0.018), GREY, sx, 1.05, V0 + 0.04, { outline: false });
  part(g, box(0.5, 0.74, 0.1), '#e6e9eb', 0.07, 1.22, TB.screen[2] - 0.07);
  const panel = liveScreen(g, 0.34, 0.2, 170, 100, TB.screen[0], TB.screen[1], TB.screen[2]);
  const btn = (p: V, c: string, name: string) => {
    part(g, cyl(0.025, 0.025, 0.02, 12), c, p[0], p[1], p[2] - 0.012, { rx: Math.PI / 2, outline: false });
    label(g, name, 0.1, 0.028, p[0], p[1] - 0.05, p[2] - 0.018, '#e6e9eb', BLACK);
  };
  btn(TB.brake, RED, '제동');
  btn(TB.feather, BLUE, '운전');
  // The rotor lock lever, down when it's pinned.
  const lever = group(g, TB.brake[0] + 0.28, 1.14, TB.screen[2] + 0.02);
  part(lever, box(0.022, 0.2, 0.022), YELLOW, 0, 0, 0.02, { outline: false });
  // The door on its hinge.
  const door = group(g, TB.hinge, 0, TB.doorZ);
  part(door, rbox(0.74, 1.98, 0.05, 0.015), WHITE, 0.36, 1.06, 0);
  part(door, box(0.04, 0.12, 0.04), GRAPHITE, 0.66, 1.04, 0.04, { outline: false });
  label(door, '출입 통제', 0.42, 0.09, 0.36, 1.6, 0.028, YELLOW, BLACK);
  label(door, '위험', 0.2, 0.08, 0.36, 1.46, 0.028, RED, '#ffffff');
  const padlock = part(door, rbox(0.05, 0.06, 0.03, 0.008), '#d9a521', 0.66, 0.94, 0.05, { outline: false });
  padlock.visible = false;
  // The junction box by the pad, and a low step.
  part(g, rbox(0.42, 0.56, 0.3, 0.02), '#c7ced3', TB.box[0], 0.34, TB.box[2] - 0.08);
  const lidBox = group(g, TB.box[0], 0.64, TB.box[2] - 0.22);
  part(lidBox, box(0.42, 0.03, 0.32), GREY_D, 0, 0, 0.14, { outline: false });
  const boxBolt = part(g, cyl(0.016, 0.016, 0.03, 8), YELLOW, TB.box[0], 0.67, TB.box[2] - 0.06, { outline: false });
  // The top: a nacelle, the hub, the blades; the red lamp on it.
  const top = group(g, 0, 13.4, TB.towerZ);
  part(top, rbox(0.9, 0.84, 2.3, 0.2), WHITE, 0, 0.42, -0.2);
  part(top, box(0.92, 0.1, 2.2), GREEN, 0, 0.28, -0.2, { outline: false });
  const hub = group(top, 0, 0.42, 1.05);
  part(hub, cyl(0.26, 0.4, 0.5, 18), WHITE, 0, 0, 0.14, { rx: Math.PI / 2 });
  const B = bladeSet(hub, 6, 0.42);
  B.rotor.position.z = 0.28;
  part(B.rotor, ball(0.28), WHITE, 0, 0, 0);
  const beacon = ownLit(top, cyl(0.06, 0.06, 0.08, 10), '#a33', 0, 0.9, -0.9);
  // A tablet and a radio; wind streaks when a typhoon's coming.
  const tab = tabletTool(g);
  const radio = radioTool(g);
  const streaks = [0, 1, 2, 3, 4, 5, 6, 7].map(() => haze(g, new THREE.PlaneGeometry(0.7, 0.012), '#ffffff', 0, 0, 0, 0));
  const tools: Partial<Record<GeTool, HeldTool>> = {
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
    radio: { tool: radio, lead: 'right', grips: UPRIGHT(0.024) },
  };
  const spots: Record<string, Spot> = {
    geDoor: standAt(g, 'geDoor', 0.12, 1.42),
    geTyphoon: standAt(g, 'geTyphoon', 0.5, TB.stand),
  };
  let spin = wrap(g.id, 7);
  let last = 0;
  let brakeNow = 0;
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    const dt = THREE.MathUtils.clamp(t - last, 0, 0.1);
    last = t;
    const want = clamp01(n.brake);
    brakeNow += (want - brakeNow) * Math.min(1, dt * (want > brakeNow ? 0.9 : 1.6));
    GE_LIVE.brake = brakeNow;
    if (N) GE_LIVE.brakeAt = t;
    if ((n.storm ?? 0) > 0.5) GE_LIVE.stormAt = t;
    const feather = clamp01(n.feather);
    const rate = (0.5 + 1.8 * windAt(t)) * (1 - brakeNow) * (1 - feather * 0.92);
    spin += rate * dt;
    B.rotor.rotation.z = -spin;
    B.pitched.forEach((p) => (p.rotation.y = feather * 1.45));
    setLit(beacon, Math.floor(t * 0.8) % 2 ? '#ff5252' : '#7a1c1c');
    door.rotation.y = -clamp01(n.door) * DOOR_SWING;
    lever.rotation.x = clamp01(n.pinned) * 1.4;
    padlock.visible = (n.locked ?? 0) > 0.5;
    lidBox.rotation.x = -(1 - clamp01(n.boxed)) * ((n.storm ?? 0) > 0.5 ? 0.9 : 0);
    boxBolt.visible = (n.storm ?? 0) < 0.5 || (n.boxed ?? 0) > 0.5;
    const key = `${q(n.panel)}|${q(windMs(t), 2)}|${q(brakeNow, 10)}|${q(feather, 6)}|${q(n.pinned)}`;
    panel.draw(key, (c) => {
      const storm = (n.storm ?? 0) > 0.5;
      c.fillStyle = storm ? '#2b1414' : '#0c1820';
      c.fillRect(0, 0, 170, 100);
      c.fillStyle = storm ? RED : brakeNow > 0.5 ? AMBER : GREEN;
      c.fillRect(0, 0, 170, 22);
      text(c, storm ? '태풍 대비' : brakeNow > 0.5 ? '정지 · 제동' : '운전 중', 6, 11, 14, '#ffffff');
      text(c, `풍속 ${windMs(t).toFixed(1)} m/s`, 6, 38, 14, '#d7eaf6');
      text(c, `회전 ${(rate * 8).toFixed(1)} rpm`, 6, 58, 14, '#d7eaf6');
      text(c, feather > 0.5 ? '날개 깃 눕힘' : `발전 ${(outputAt(t).wind).toFixed(2)} MW`, 6, 78, 14, feather > 0.5 ? '#ffd54f' : '#7ee89e');
      if ((n.pinned ?? 0) > 0.5) text(c, '잠금', 164, 78, 14, '#ff8a80', 'right');
    });
    placeTools(N, [['tablet', tab.root], ['radio', radio]]);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
    const storm = (n.storm ?? 0) > 0.5;
    streaks.forEach((m, i) => {
      if (!storm) {
        m.visible = false;
        return;
      }
      const f = ((t * 1.6 + i * 0.137) % 1 + 1) % 1;
      m.position.set(-3 + f * 6, 0.5 + (i * 0.27) % 2, 1.2 - (i % 3) * 0.4);
      fade(m, 0.6 * Math.sin(f * Math.PI));
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, TB.screen[0], TB.screen[1], TB.screen[2]);
}

// =============================================================================================
// 나셀 훈련 모형 (geNacelleMock, 5 × 3): the works of a nacelle at ladder height: a deck on a stand, the hood at the back.

function nacelleMock(g: THREE.Group, out: Built) {
  const D = NM.deck;
  part(g, box(4.9, 0.02, 2.9), '#a9afae', 0, 0.012, 0, { outline: false, shadow: false });
  const X0 = -2.3;
  const X1 = 1.7;
  const Z0 = -1.32;
  const Z1 = 0.76;
  const Mx = (X0 + X1) / 2;
  const Mz = (Z0 + Z1) / 2;
  part(g, box(X1 - X0, 0.06, Z1 - Z0), '#7d8a93', Mx, D - 0.03, Mz);
  for (const x of [X0 + 0.1, Mx, X1 - 0.1]) for (const z of [Z0 + 0.1, Z1 - 0.1]) part(g, box(0.09, D - 0.06, 0.09), YELLOW, x, (D - 0.06) / 2, z);
  rod(g, v3(X0 + 0.1, 0.1, Z1 - 0.1), v3(Mx, D - 0.1, Z1 - 0.1), 0.02, GREY_D);
  rod(g, v3(X1 - 0.1, 0.1, Z1 - 0.1), v3(Mx, D - 0.1, Z1 - 0.1), 0.02, GREY_D);
  label(g, '나셀 훈련 모형 · 안전대 없이 오르지 마세요', 2.1, 0.12, Mx, 0.7, Z1 - 0.05, YELLOW, BLACK);
  // The rail round the deck, open at the ladder.
  const gapA = NM.ladderX - 0.3;
  for (const y of [D + 0.5, D + 1.0]) {
    part(g, box(gapA - X0, 0.03, 0.03), YELLOW, (X0 + gapA) / 2, y, Z1 - 0.02, { outline: false });
    part(g, box(0.03, 0.03, Z1 - Z0), YELLOW, X1 - 0.02, y, Mz, { outline: false });
  }
  for (const x of [X0 + 0.02, -1.2, 0, gapA]) part(g, box(0.04, 1.0, 0.04), YELLOW, x, D + 0.5, Z1 - 0.02, { outline: false });
  // The ladder and its fall-arrest line.
  for (const sx of [-1, 1]) part(g, box(0.035, D + 1.1, 0.035), GREY, NM.ladderX + sx * 0.2, (D + 1.1) / 2, NM.ladderZ);
  for (let y = 0.28; y < D + 0.05; y += 0.28) part(g, cyl(0.013, 0.013, 0.4, 8), CHROME, NM.ladderX, y, NM.ladderZ, { rz: Math.PI / 2, outline: false });
  part(g, cyl(0.004, 0.004, D + 1.1, 6), '#f27a1a', NM.ladderX + 0.02, (D + 1.1) / 2, NM.ladderZ + 0.05, { outline: false });
  const runner = part(g, rbox(0.04, 0.08, 0.04, 0.01), '#2f6fd0', NM.ladderX + 0.02, 1.32, NM.ladderZ + 0.05, { outline: false });
  const lanyard = limb(g, 0.007, '#f27a1a');
  const anchorPt = part(g, new THREE.TorusGeometry(0.04, 0.008, 6, 12), CHROME, NM.ladderX - 0.1, D + 1.0, 0.72, { outline: false });
  void anchorPt;
  const lanyardEnd = new THREE.Vector3();
  const lanyardStart = new THREE.Vector3();
  // The hood at the back, cut away: back panel, roof, its edge painted.
  part(g, box(X1 - X0, 1.7, 0.05), '#dfe6ea', Mx, D + 0.85, Z0 + 0.02);
  const roof = part(g, box(X1 - X0, 0.05, 1.05), WHITE, Mx, D + 1.86, Z0 + 0.5, { rx: -0.12 });
  void roof;
  part(g, box(X1 - X0, 0.06, 0.05), '#ef7d22', Mx, D + 1.8, Z0 + 1.02, { outline: false });
  label(g, FIRM, 1.2, 0.2, Mx, D + 1.4, Z0 + 0.05, '#dfe6ea', GREEN);
  // Gearbox, coupling, generator; the main shaft and the hub with stubs of blade at the left.
  const G = NM.gearbox;
  part(g, rbox(0.9, 0.8, 0.7, 0.05), '#5f7c8a', G[0], G[1], G[2]);
  for (let i = 0; i < 4; i++) part(g, box(0.92, 0.015, 0.72), '#4e6874', G[0], G[1] - 0.3 + i * 0.2, G[2], { outline: false });
  part(g, cyl(0.075, 0.075, 0.6, 14), CHROME, G[0] - 0.7, G[1], G[2], { rz: Math.PI / 2 });
  const hub = group(g, X0 + 0.02, G[1], G[2]);
  hub.rotation.y = Math.PI / 2;
  part(hub, ball(0.32), WHITE, 0, 0, 0);
  const stubs = bladeSet(hub, 0.8, 0.2, WHITE);
  stubs.rotor.rotation.z = 0.3;
  part(g, cyl(0.05, 0.05, 0.58, 12), RED, G[0] + 0.72, G[1], G[2], { rz: Math.PI / 2, outline: false });
  part(g, rbox(0.82, 0.62, 0.66, 0.08), '#2f6fa8', G[0] + 1.42, G[1] - 0.03, G[2]);
  for (let i = 0; i < 7; i++) part(g, box(0.02, 0.64, 0.68), '#23547f', G[0] + 1.08 + i * 0.11, G[1] - 0.03, G[2], { outline: false });
  label(g, '증속기', 0.4, 0.1, G[0], G[1] + 0.1, G[2] + 0.355, '#5f7c8a', '#ffffff');
  label(g, '발전기', 0.4, 0.1, G[0] + 1.42, G[1] + 0.05, G[2] + 0.335, '#2f6fa8', '#ffffff');
  // The dipstick's port, the sight glass.
  part(g, cyl(0.014, 0.018, DIP_TUBE, 10), GRAPHITE, NM.dipPort[0], NM.dipPort[1] + DIP_TUBE / 2, NM.dipPort[2], { outline: false });
  const dipHome: V = [NM.dipPort[0], NM.dipPort[1] + DIP_TUBE, NM.dipPort[2]];
  // The yaw ring on the deck, its bolts, its pinion and drive.
  const R = NM.ring;
  // The pedestal that holds it at bench height.
  part(g, cyl(0.2, 0.3, R[1] - D, 18), '#5f7c8a', R[0], (R[1] + D) / 2, R[2]);
  part(g, cyl(NM.ringR + 0.09, NM.ringR + 0.09, 0.05, 28), '#8b949b', R[0], R[1] + 0.025, R[2]);
  part(g, cyl(NM.ringR - 0.09, NM.ringR - 0.09, 0.054, 24), '#3f4950', R[0], R[1] + 0.027, R[2], { outline: false });
  const bolts = Array.from({ length: 12 }, (_, i) => {
    const p = boltAt(i);
    part(g, cyl(0.022, 0.022, 0.03, 6), CHROME, p[0], p[1] + 0.025, p[2], { outline: false });
    const m = part(g, box(0.05, 0.004, 0.012), YELLOW, p[0], p[1] + 0.043, p[2], { ry: (i / 12) * Math.PI * 2, outline: false });
    m.visible = false;
    return m;
  });
  const P = NM.pinion;
  part(g, cyl(0.1, 0.1, 0.5, 12), '#2f6fa8', P[0], P[1] + 0.36, P[2]);
  const gear = group(g, P[0], P[1] - 0.12, P[2]);
  part(gear, cyl(0.1, 0.1, 0.1, 14), GREY, 0, 0, 0, { outline: false });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    part(gear, box(0.03, 0.1, 0.025), GREY_D, Math.cos(a) * 0.105, 0, Math.sin(a) * 0.105, { ry: -a, outline: false });
  }
  const greaseLump = haze(g, new THREE.SphereGeometry(0.11, 10, 8), '#c7a24a', 0, P[0], P[1] - 0.12, P[2]);
  part(g, cyl(0.008, 0.008, 0.03, 8), '#f5c518', P[0] - 0.08, P[1] - 0.09, P[2] + 0.19, { rx: Math.PI / 2, outline: false });
  // Oil jar and sample rack on the deck.
  const J = NM.jar;
  part(g, box(0.05, J[1] - D - 0.02, 0.05), GREY_D, J[0], (J[1] + D) / 2 - 0.01, J[2], { outline: false });
  part(g, box(0.3, 0.025, 0.24), GREY_D, J[0], J[1] - 0.012, J[2], { outline: false });
  part(g, cyl(0.05, 0.05, 0.14, 12), '#e8c04a', J[0], J[1] + 0.07, J[2]);
  part(g, cyl(0.02, 0.02, 0.03, 8), RED, J[0], J[1] + 0.15, J[2], { outline: false });
  // Hands' tools.
  const wr = wrenchTool(g);
  const dip = dipTool(g);
  const grs = greaseTool(g);
  const tab = tabletTool(g);
  at(dip.root, dipHome);
  const tools: Partial<Record<GeTool, HeldTool>> = {
    wrench: { tool: wr, lead: 'right', grips: WRENCH_GRIPS },
    dip: { tool: dip.root, lead: 'right', grips: UPRIGHT(0.012, 'pinch') },
    grease: { tool: grs.root, lead: 'right', grips: PISTOL(0.016) },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const senior = person(g, '#2e8b57', '#37474f', '#2b1b10', 0.5, 1.28, 0.8, 'male');
  const spots: Record<string, Spot> = {
    geClimb: standAt(g, 'geClimb', NM.ladderX, NM.stand),
    geTorque: standAt(g, 'geTorque', NM.ladderX, NM.stand),
    geOil: standAt(g, 'geOil', NM.ladderX, NM.stand),
    greenEnergy_learnClimb: standAt(g, 'geLearn', NM.ladderX, NM.stand),
    greenEnergy_yawGear: standAt(g, 'geYaw', NM.ladderX, NM.stand),
  };
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    const Pr = N?.props ?? {};
    runner.position.y = n.runner ?? 1.32;
    if ((n.lanyard ?? 0) > 0.5) {
      lanyardEnd.set(n.sx ?? 0, (n.sy ?? 0) + 0.98, (n.sz ?? 0) - 0.08);
      if ((n.deckClip ?? 0) > 0.5) lanyardStart.set(NM.ladderX - 0.1, D + 1.0, 0.72);
      else lanyardStart.set(NM.ladderX + 0.02, n.runner ?? 1.32, NM.ladderZ + 0.05);
      lanyard(lanyardStart, lanyardEnd);
    } else {
      lanyardStart.set(NM.ladderX + 0.02, 1.3, NM.ladderZ + 0.05);
      lanyardEnd.set(NM.ladderX + 0.02, 1.16, NM.ladderZ + 0.05);
      lanyard(lanyardStart, lanyardEnd);
    }
    const marks = Math.floor(n.marks ?? 0);
    const order = [0, 1, 11, 10];
    bolts.forEach((m) => (m.visible = false));
    for (let i = 0; i < Math.min(marks, 4); i++) bolts[order[i]].visible = true;
    gear.rotation.y = (n.yaw ?? 0) * 6;
    fade(greaseLump, 0.55 * clamp01(n.grease));
    grs.lever.rotation.x = -(n.pumpAt ?? 0) * 0.5;
    // In the hand, or home.
    placeTools(N, [['wrench', wr], ['grease', grs.root], ['tablet', tab.root]]);
    wr.rotation.y = n.pull ?? 0;
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
    at(dip.root, Pr.dip ?? dipHome);
    dip.oil.visible = (n.clean ?? 0) < 0.5;
    const teach = n.teach ?? 0;
    const learning = (n.senior ?? 0) > 0.5;
    senior.root.visible = learning;
    if (learning) {
      senior.opts.nod = teach === 3 ? 0.12 + 0.1 * Math.sin(t * 6) : -0.1;
      if (teach === 1) senior.armR(tA.set(NM.ladderX - 0.05, 1.32, NM.ladderZ + 0.08));
      else if (teach === 2) senior.armR(tA.set(NM.ladderX, 1.5, NM.ladderZ));
      else senior.armR(null);
      senior.armL(null);
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, R[0], R[1] + 0.1, R[2]);
}

// =============================================================================================
// 인버터실 (geInverterBank, 4 × 1): four cabinets, a reading on each that's the plant's own.

function inverterBank(g: THREE.Group, out: Built) {
  const doors: THREE.Group[] = [];
  const screens = IB.xs.map((x, i) => {
    part(g, box(0.84, 1.9, 0.56), '#d7dde0', x, 0.95, -0.28);
    part(g, box(0.76, 1.7, 0.02), '#1f262b', x, 1.0, 0.0, { outline: false });
    // Inside: busbars and cables behind the door.
    for (const [c, dx] of [[RED, -0.18], ['#37474f', 0], [BLUE, 0.18]] as Array<[string, number]>) part(g, box(0.05, 1.3, 0.02), c, x + dx, 1.05, 0.018, { outline: false });
    // The door on the right-hand hinge.
    for (const sx of [-1, 1]) part(g, box(0.02, 1.9, 0.2), '#d7dde0', x + sx * 0.41, 0.95, 0.09, { outline: false });
    const hinge = group(g, x - 0.41, 0, IB.front - 0.02);
    doors.push(hinge);
    part(hinge, box(0.8, 1.42, 0.03), '#e6ebed', 0.41, 1.2, 0);
    part(hinge, box(0.03, 0.2, 0.05), GRAPHITE, 0.75, 1.02, 0.03, { outline: false });
    const s = liveScreen(hinge, 0.5, 0.3, 200, 120, 0.41, IB.screenY, 0.022);
    label(hinge, `인버터 ${i + 1}`, 0.34, 0.07, 0.41, 1.72, 0.018, '#e6ebed', NAVY);
    part(hinge, box(0.58, 0.36, 0.006), GRAPHITE, 0.41, IB.screenY, 0.018, { outline: false });
    // The fan's grille at the top, the filter slot at the foot.
    const fan = group(g, x, 1.82, IB.front - 0.0);
    part(fan, cyl(0.1, 0.1, 0.005, 16), GRAPHITE, 0, 0, 0.004, { rx: Math.PI / 2, outline: false });
    part(g, box(0.5, 0.3, 0.018), GREY_D, x, IB.filterY, IB.front - 0.022, { outline: false });
    return { s, fan };
  });
  const fanBlades = screens.map(({ fan }) => {
    const r = group(fan, 0, 0, 0.012);
    for (let i = 0; i < 4; i++) part(r, box(0.17, 0.03, 0.002), '#7d8a93', 0, 0, 0, { rz: (i / 4) * Math.PI, outline: false });
    return r;
  });
  // The warm cabinet's filter, a flap over it.
  const flap = group(g, IB.xs[IB.warm], IB.filterY + 0.16, IB.front + 0.0);
  part(flap, box(0.5, 0.05, 0.018), GREY, 0, 0, 0.01, { outline: false });
  const warmLamp = ownLit(g, cyl(0.02, 0.02, 0.01, 10), AMBER, IB.xs[IB.warm] + 0.3, 1.88, IB.front + 0.01);
  warmLamp.rotation.x = Math.PI / 2;
  // Conduit from the cabinets up and away.
  part(g, box(3.7, 0.08, 0.2), GREY, 0, 2.06, -0.3);
  const filter = filterTool(g);
  const clamp = clampTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<GeTool, HeldTool>> = {
    filter: { tool: filter.root, lead: 'right', grips: FILTER_GRIPS },
    clamp: { tool: clamp.root, lead: 'right', grips: UPRIGHT(0.024) },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = { geRead: standAt(g, 'geRead', IB.xs[0], IB.stand), geFilter: standAt(g, 'geFilter', IB.xs[IB.warm], IB.stand) };
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    const O = outputAt(t);
    const shareKw = (O.solar * 1000) / IB.xs.length;
    const warmT = n.temp ?? 68;
    screens.forEach(({ s }, i) => {
      const warm = i === IB.warm;
      const kw = shareKw * (1 + wrap(i * 7, 5) * 0.012) * (warm && warmT > 60 ? 0.86 : 1);
      s.draw(`${q(kw, 0.5)}|${warm ? q(warmT, 1) : 0}|${(n.focus ?? -1) === i && N ? 1 : 0}`, (c) => {
        c.fillStyle = '#0a1a14';
        c.fillRect(0, 0, 200, 120);
        c.fillStyle = warm && warmT > 60 ? AMBER : GREEN;
        c.fillRect(0, 0, 200, 22);
        text(c, warm && warmT > 60 ? '온도 경고' : '정상 운전', 8, 11, 14, warm && warmT > 60 ? BLACK : '#ffffff');
        text(c, `${Math.round(kw)} kW`, 8, 48, 30, '#7ee89e');
        text(c, `AC 380 V · 60.0 Hz`, 8, 80, 14, '#d7eaf6');
        text(c, `온도 ${warm ? Math.round(warmT) : 44 + wrap(i * 3, 4)} °C`, 8, 102, 14, warm && warmT > 60 ? '#ffd54f' : '#d7eaf6');
        if ((n.focus ?? -1) === i && N) {
          c.strokeStyle = '#ffffff';
          c.lineWidth = 3;
          c.strokeRect(1.5, 1.5, 197, 117);
        }
      });
    });
    fanBlades.forEach((f, i) => (f.rotation.z = t * (6 + i)));
    doors[IB.warm].rotation.y = -clamp01(n.door) * 1.2;
    setLit(warmLamp, warmT > 60 ? (Math.floor(t * 2) % 2 ? AMBER : '#6a4c0c') : LED);
    flap.rotation.x = -clamp01(n.flap) * 1.2;
    // Filter in its slot unless it's in the hand.
    const P = N?.props ?? {};
    at(filter.root, N?.tool === 'filter' ? P.filter : [IB.xs[IB.warm], IB.filterY, IB.front + 0.0]);
    filter.dirty.visible = (n.fresh ?? 0) < 0.5;
    filter.clean.visible = (n.fresh ?? 0) >= 0.5;
    placeTools(N, [['clamp', clamp.root], ['tablet', tab.root]]);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
    if (N?.tool === 'clamp') clamp.screen.draw(`${q(n.clamped, 1)}|${q(shareKw, 0.2)}`, (c) => {
      c.fillStyle = '#c9d7b8';
      c.fillRect(0, 0, 64, 46);
      text(c, (n.clamped ?? 0) > 0.5 ? `${Math.round((shareKw * 1000) / (380 * 1.73))} A` : '0 A', 4, 24, 18, BLACK);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, IB.xs[IB.warm], IB.screenY, IB.front + 0.05);
}

// =============================================================================================
// 배터리 컨테이너 (geBatteryBox, 4 × 2): a white box with a roller front, four racks of modules, an air unit on top.

function batteryBox(g: THREE.Group, out: Built) {
  const Zb = -0.9;
  const Zf = 0.72;
  const Z = (Zb + Zf) / 2;
  const HH = 2.46;
  part(g, box(3.96, 0.1, 1.9), '#b5b8b6', 0, 0.05, -0.04);
  part(g, box(3.86, HH, 0.06), WHITE, 0, 0.1 + HH / 2, Zb);
  for (const sx of [-1, 1]) part(g, box(0.06, HH, Zf - Zb), WHITE, sx * 1.93, 0.1 + HH / 2, Z);
  part(g, box(3.92, 0.08, Zf - Zb + 0.04), WHITE, 0, 0.1 + HH + 0.02, Z);
  part(g, box(3.84, 0.02, Zf - Zb), '#7d8a93', 0, 0.12, Z, { outline: false });
  part(g, box(3.92, 0.12, 0.012), GREEN, 0, 2.2, Zf + 0.01, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.012, 0.3, 1.6), GREEN, sx * 1.965, 1.8, Z, { outline: false });
  part(g, rbox(1.1, 0.34, 0.8, 0.03), '#c7ced3', -0.8, 2.78, Z);
  const hvac = group(g, -0.8, 2.96, Z);
  part(hvac, cyl(0.3, 0.3, 0.02, 18), GRAPHITE, 0, 0, 0, { outline: false });
  const hvacBlades = group(hvac, 0, 0.02, 0);
  for (let i = 0; i < 3; i++) part(hvacBlades, box(0.52, 0.006, 0.06), GREY, 0, 0, 0, { ry: (i / 3) * Math.PI, outline: false });
  part(g, box(0.5, 0.2, 0.34), RED, 1.2, 2.68, Z - 0.3);
  label(g, '소화 설비', 0.4, 0.08, 1.2, 2.68, Z - 0.128, RED, '#ffffff');
  // The racks.
  const ledsAll: THREE.Mesh[][] = [];
  BB.xs.forEach((x, r) => {
    part(g, box(0.74, 2.1, 0.84), GRAPHITE, x, 1.17, BB.rackZ - 0.44);
    label(g, `랙 ${r + 1}`, 0.3, 0.07, x, 2.13, BB.rackZ - 0.012, GRAPHITE, '#ffffff');
    const leds: THREE.Mesh[] = [];
    for (let t = 0; t < 8; t++) {
      const c = cellAt(r, t);
      part(g, rbox(0.66, 0.18, 0.04, 0.008), '#c8cdd0', x, c[1], BB.rackZ - 0.002, { outline: false });
      part(g, box(0.24, 0.01, 0.002), '#3f4950', x - 0.16, c[1] - 0.04, BB.rackZ + 0.02, { outline: false });
      for (const dx of [-0.1, 0.1]) part(g, cyl(0.012, 0.012, 0.01, 8), dx < 0 ? BLACK : RED, x + dx, c[1], BB.rackZ + 0.02, { rx: Math.PI / 2, outline: false });
      leds.push(ownLit(g, box(0.05, 0.016, 0.002), LED, x + 0.24, c[1] + 0.05, BB.rackZ + 0.021));
    }
    ledsAll.push(leds);
  });
  // The roller front: comes down when nobody's in there.
  const shutterTex = painted('geBatteryFront', 512, 320, (c) => {
    c.fillStyle = '#eef1f3';
    c.fillRect(0, 0, 512, 320);
    c.strokeStyle = '#c8cdd0';
    c.lineWidth = 2;
    for (let i = 0; i < 320; i += 14) {
      c.beginPath();
      c.moveTo(0, i);
      c.lineTo(512, i);
      c.stroke();
    }
    text(c, '에너지 저장 장치', 256, 130, 40, NAVY, 'center');
    c.fillStyle = YELLOW;
    c.fillRect(150, 170, 212, 44);
    text(c, '감전 주의 · 화기 금지', 256, 192, 22, BLACK, 'center');
  });
  const shutter = picture(g, shutterTex, 3.82, 2.36, 0, 1.3, Zf + 0.002);
  // Reads and buttons on a post by the front.
  const H = BB.hmi;
  part(g, box(0.05, H[1] - 0.14, 0.05), GREY_D, H[0], (H[1] - 0.14) / 2, H[2] - 0.05, { outline: false });
  part(g, rbox(0.36, 0.28, 0.08, 0.012), '#37424a', H[0], H[1], H[2] - 0.05);
  const hmi = liveScreen(g, 0.32, 0.22, 192, 132, H[0], H[1], H[2] - 0.006);
  const strobe = ownLit(g, cyl(0.03, 0.03, 0.04, 10), '#7a1c1c', H[0], H[1] + 0.2, H[2] - 0.05);
  // Hands' tools.
  const pr = probeTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<GeTool, HeldTool>> = {
    probe: { tool: pr, lead: 'right', grips: PEN() },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = { geVolts: standAt(g, 'geVolts', 0, BB.stand), geBms: standAt(g, 'geBms', BB.hmi[0], BB.stand) };
  let openS = 0;
  let lastT = 0;
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    const dt = THREE.MathUtils.clamp(t - lastT, 0, 0.1);
    lastT = t;
    openS += ((N ? 1 : 0.12) - openS) * Math.min(1, dt * 1.6);
    // Rolled up from the bottom.
    const open = THREE.MathUtils.clamp(openS, 0.02, 1);
    shutter.scale.y = 1 - open;
    shutter.position.y = 2.48 - (2.36 * (1 - open)) / 2;
    hvacBlades.rotation.y = t * 6;
    const O = outputAt(t);
    // The state of charge: the sun fills it, evening drains; a slow pure function of the clock.
    const soc = 0.5 + 0.28 * Math.sin(t / 53) + 0.08 * Math.sin(t / 17);
    const charging = O.total > 3.2;
    ledsAll.forEach((leds, r) => {
      leds.forEach((m, tier) => {
        const lit = tier / 8 < soc + 0.02 * r;
        const low = (n.low ?? 0) > 0.5 && r === BB.lowRack && tier === BB.lowTier;
        const being = N && (n.rack ?? -1) === r && Math.round(n.tier ?? -1) === tier;
        setLit(m, low ? (Math.floor(t * 4) % 2 ? AMBER : '#6a4c0c') : being ? '#ffffff' : lit ? (charging && tier / 8 >= soc - 0.13 && Math.floor(t * 1.5) % 2 ? '#c8ffd4' : LED) : '#284033');
      });
    });
    setLit(strobe, Math.floor(t) % 3 === 0 ? '#ff5252' : '#7a1c1c');
    const spread = n.spread ?? 0.04;
    const key = `${q(soc, 50)}|${charging}|${q(spread, 200)}|${q(n.reading, 100)}|${q(n.on)}|${q(n.sel)}|${q(n.rack)}|${Math.round(n.tier ?? 0)}`;
    hmi.draw(key, (c) => {
      c.fillStyle = '#0c1820';
      c.fillRect(0, 0, 192, 132);
      c.fillStyle = charging ? GREEN : NAVY;
      c.fillRect(0, 0, 192, 22);
      text(c, charging ? '충전 중' : '방전 대기', 8, 11, 14, '#ffffff');
      text(c, `SOC ${Math.round(soc * 100)}%`, 8, 42, 22, '#7ee89e');
      c.fillStyle = '#31475a';
      c.fillRect(8, 60, 176, 8);
      c.fillStyle = '#7ee89e';
      c.fillRect(8, 60, 176 * clamp01(soc), 8);
      if ((n.reading ?? 0) > 0) {
        text(c, `랙${(n.rack ?? 0) + 1}-${Math.round(n.tier ?? 0) + 1} ${(n.reading ?? 0).toFixed(2)} V`, 8, 88, 17, (n.low ?? 0) > 0.5 ? '#ffd54f' : '#d7eaf6');
      } else {
        text(c, `셀 편차 ${(spread * 1000).toFixed(0)} mV`, 8, 88, 16, spread > 0.06 ? '#ffd54f' : '#7ee89e');
      }
      text(c, (n.on ?? 0) > 0.5 ? '셀 균등 충전 중…' : (n.sel ?? 0) > 0.5 ? '랙 3 선택' : '온도 27 °C', 8, 112, 14, '#9fb7c7');
    });
    placeTools(N, [['probe', pr], ['tablet', tab.root]]);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, BB.hmi[0], BB.hmi[1], BB.hmi[2]);
}

// =============================================================================================
// 관제실 (geControlDesk, 5 × 2): a wall of the plant's day, a desk with an output limit under a guard.

function paintWall(c: Ctx2, W: number, H: number, t: number, n: Record<string, number>) {
  const O = outputAt(t);
  const storm = stormy(t);
  c.fillStyle = '#0a1520';
  c.fillRect(0, 0, W, H);
  c.fillStyle = storm ? RED : GREEN;
  c.fillRect(0, 0, W, 34);
  text(c, storm ? '태풍 대비 · 터빈 정지 · 설비 점검 중' : `${FIRM} 발전 단지 관제`, 14, 17, 22, '#ffffff');
  // The site in plan, on the left: the rows lit by the sun, the turbine by the wind.
  c.fillStyle = '#16323d';
  c.fillRect(10, 44, 220, H - 54);
  const sun = sunAt(t);
  for (let i = 0; i < 2; i++) {
    c.fillStyle = `rgb(${Math.round(30 + 200 * sun)},${Math.round(70 + 150 * sun)},${Math.round(150 - 80 * sun)})`;
    c.fillRect(22 + i * 102, 150, 94, 34);
  }
  text(c, '태양광', 26, 200, 14, '#d7eaf6');
  c.strokeStyle = '#d7eaf6';
  c.lineWidth = 2;
  const cx = 56;
  const cy = 94;
  const a = t * (0.5 + windAt(t) * 1.8) * (storm ? 0 : 1);
  for (let i = 0; i < 3; i++) {
    const A = a + (i / 3) * Math.PI * 2;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(A) * 28, cy + Math.sin(A) * 28);
    c.stroke();
  }
  c.fillStyle = '#d7eaf6';
  c.beginPath();
  c.arc(cx, cy, pos(3.2), 0, Math.PI * 2);
  c.fill();
  text(c, '풍력', 106, 94, 14, '#d7eaf6');
  // The big number.
  text(c, '현재 출력', 250, 62, 18, '#9fb7c7');
  text(c, `${O.total.toFixed(2)} MW`, 250, 104, 48, storm ? '#ffd54f' : '#7ee89e');
  text(c, `태양광 ${O.solar.toFixed(2)}`, 250, 146, 20, '#ffd54f');
  text(c, `풍력 ${O.wind.toFixed(2)}`, 250, 174, 20, '#7fdbff');
  const limit = n.limit ?? 1;
  if ((n.holding ?? 0) > 0.5) {
    c.fillStyle = AMBER;
    c.fillRect(250, 192, 190, 24);
    text(c, `출력 제한 ${Math.round(limit * 100)}%`, 258, 204, 16, BLACK);
  }
  // The trend: an hour back, one sample a step, the clock's own weather.
  const gx = 460;
  const gw = W - gx - 14;
  const gy = 50;
  const gh = H - 66;
  c.fillStyle = '#10222c';
  c.fillRect(gx, gy, gw, gh);
  c.strokeStyle = '#26404f';
  c.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(gx, gy + (i / 4) * gh);
    c.lineTo(gx + gw, gy + (i / 4) * gh);
    c.stroke();
  }
  const N = 48;
  const line = (f: (u: number) => number, color: string, width: number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const u = t - (N - i) * 2.5;
      const X = gx + (i / N) * gw;
      const Y = gy + gh - THREE.MathUtils.clamp(f(u) / 7.4, 0, 1) * gh;
      if (i === 0) c.moveTo(X, Y);
      else c.lineTo(X, Y);
    }
    c.stroke();
  };
  line((u) => 3.2 * sunAt(u), '#ffd54f', 2);
  line((u) => 4.2 * Math.pow(windAt(u), 3), '#7fdbff', 2);
  line((u) => 3.2 * sunAt(u) + 4.2 * Math.pow(windAt(u), 3), '#7ee89e', 3);
  text(c, '최근 2시간', gx + 8, gy + 14, 13, '#9fb7c7');
  text(c, `풍속 ${windMs(t).toFixed(1)} m/s · 일사 ${Math.round(sun * 980)} W/㎡`, gx + gw - 8, gy + 14, 13, '#d7eaf6', 'right');
  if ((n.planned ?? 0) > 0.5) {
    c.fillStyle = '#1b3440';
    c.fillRect(gx + 10, gy + gh - 74, 320, 64);
    text(c, '오늘 정비: 3열 패널 교체', gx + 20, gy + gh - 56, 16, '#ffffff');
    text(c, '내일 정비: 터빈 요 구동부 윤활', gx + 20, gy + gh - 28, 16, '#ffffff');
  }
}
function controlDesk(g: THREE.Group, out: Built) {
  part(g, box(4.9, 2.4, 0.1), '#37424a', 0, 1.2, CD.wallZ - 0.09);
  part(g, box(CD.wallW + 0.08, CD.wallH + 0.08, 0.04), BLACK, 0, CD.wallY, CD.wallZ - 0.03);
  const wall = liveScreen(g, CD.wallW, CD.wallH, 1024, 334, 0, CD.wallY, CD.wallZ);
  for (const x of [-CD.wallW / 6, CD.wallW / 6]) part(g, box(0.012, CD.wallH, 0.004), BLACK, x, CD.wallY, CD.wallZ + 0.003, { outline: false });
  // The desk.
  part(g, rbox(3.3, 0.06, 0.74, 0.02), '#c9a77a', 0.5, 0.76, CD.keys[2] - 0.06);
  for (const [x, z] of [[-1.05, 0.2], [2.05, 0.2], [-1.05, 0.8], [2.05, 0.8]]) part(g, box(0.05, 0.74, 0.05), GREY_D, x, 0.37, z, { outline: false });
  part(g, box(0.42, 0.02, 0.14), '#3a4248', CD.keys[0], CD.keys[1], CD.keys[2], { outline: false });
  part(g, rbox(0.06, 0.02, 0.1, 0.008), '#3a4248', CD.mouse[0], CD.mouse[1], CD.mouse[2], { outline: false });
  // The limit button, under a clear guard, and its name.
  part(g, cyl(0.045, 0.05, 0.02, 14), AMBER, CD.stop[0], CD.stop[1], CD.stop[2] - 0.03, { outline: false });
  label(g, '출력 제한', 0.22, 0.05, CD.stop[0], 0.795, CD.stop[2] + 0.05, '#c9a77a', BLACK).rotation.x = -Math.PI / 2;
  const mon = liveScreen(g, 0.62, 0.38, 256, 156, CD.keys[0], 1.06, CD.keys[2] - 0.32, 0, -0.08);
  part(g, box(0.66, 0.42, 0.03), BLACK, CD.keys[0], 1.06, CD.keys[2] - 0.34, { rx: -0.08, outline: false });
  part(g, box(0.05, 0.2, 0.05), BLACK, CD.keys[0], 0.87, CD.keys[2] - 0.36, { outline: false });
  part(g, rbox(0.22, 0.16, 0.05, 0.01), BLACK, -0.6, 0.82, 0.42);
  part(g, cyl(0.04, 0.045, 0.1, 12), '#e6e0d4', 1.4, 0.84, 0.32);
  const seat = chair;
  seat(g, CD.seat);
  const tab = tabletTool(g);
  const tools: Partial<Record<GeTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS } };
  const crew = [person(g, '#2e8b57', '#37474f', '#2b1b10', -1.1, 1.0, -2.4, 'male'), person(g, '#ef7d22', '#37474f', '#5b3a1e', -2.26, 1.02, 2.8, 'female')];
  const sit = spot(g, 'sit', CD.seat[0], CD.seat[1], CD.seat[2], Math.PI, 0);
  sit.motion = 'geDispatch';
  const spots: Record<string, Spot> = { geDispatch: sit, greenEnergy_leadPlan: standAt(g, 'geLead', CD.lead[0], CD.lead[2]) };
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    if ((n.holding ?? 0) > 0.5) {
      GE_LIVE.limit = THREE.MathUtils.clamp(n.limit ?? 1, 0, 1);
      GE_LIVE.limitAt = t;
    }
    wall.draw(`${q(t, 1)}|${q(n.limit)}|${q(n.planned)}`, (c) => paintWall(c, 1024, 334, t, n));
    mon.draw(`${q(n.typed)}|${q(n.ok)}|${N ? 1 : 0}`, (c) => {
      c.fillStyle = '#10202c';
      c.fillRect(0, 0, 256, 156);
      c.fillStyle = GREEN;
      c.fillRect(0, 0, 256, 26);
      text(c, '내일 발전 예측 입력', 8, 13, 15, '#ffffff');
      for (let i = 0; i < 6; i++) {
        c.fillStyle = '#31475a';
        c.fillRect(14, 40 + i * 18, 228, 12);
        c.fillStyle = '#7ee89e';
        c.fillRect(14, 40 + i * 18, 228 * clamp01((n.typed ?? 0) * 6 - i) * (0.4 + wrap(i * 3, 5) * 0.12), 12);
      }
      if ((n.ok ?? 0) > 0.5) text(c, '제출 완료', 128, 88, 28, '#ffd54f', 'center');
    });
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
    placeTools(N, [['tablet', tab.root]]);
    const on = (n.crew ?? 0) > 0.5;
    crew.forEach((F, i) => {
      F.root.visible = on;
      if (!on) return;
      const talk = n.talk ?? 0;
      F.opts.nod = (n.nods ?? 0) > 0.5 ? 0.1 + 0.12 * Math.sin(t * 7 + i) : -0.04;
      F.armR(talk === 1 && i === 0 ? tB.set(F.root.position.x + 0.1, 1.5, F.root.position.z - 0.3) : null);
      F.armL(null);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.seat = marker(g, CD.seat[0], CD.seat[1], CD.seat[2]);
  out.work = marker(g, CD.keys[0], CD.keys[1], CD.keys[2]);
}

// =============================================================================================
// 기상 마스트 (geMast, 1 × 1): a slim lattice with cups, a vane, a windsock; the logger at hand height.

function weatherMast(g: THREE.Group, out: Built) {
  const H = 9;
  const legs = [0, 1, 2].map((i) => [Math.cos((i / 3) * Math.PI * 2 + 0.5) * 0.11, Math.sin((i / 3) * Math.PI * 2 + 0.5) * 0.11]);
  part(g, cyl(0.3, 0.34, 0.1, 14), '#b5b8b6', 0, 0.05, 0);
  legs.forEach(([x, z]) => part(g, cyl(0.012, 0.012, H, 6), '#c5c9cc', x, H / 2, z, { outline: false }));
  for (let i = 0; i < 18; i++) {
    const a = legs[i % 3];
    const b = legs[(i + 1) % 3];
    rod(g, v3(a[0], i * 0.5 + 0.2, a[1]), v3(b[0], i * 0.5 + 0.7, b[1]), 0.005, '#c5c9cc');
  }
  // Guy wires, out and down to anchors just past the piece.
  for (const [x, z] of [[1.9, -1.0], [-1.9, -1.0], [0, 0.46]] as Array<[number, number]>) {
    rod(g, v3(0, H * 0.72, 0), v3(x, 0.04, z), 0.0035, '#7d8a93');
    part(g, box(0.1, 0.06, 0.1), '#b5b8b6', x, 0.03, z, { outline: false });
  }
  // Top: cups going round, a vane swinging.
  const cups = group(g, 0.12, H + 0.32, 0);
  part(g, cyl(0.008, 0.008, 0.32, 6), GREY, 0.12, H + 0.16, 0, { outline: false });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    rod(cups, v3(0, 0, 0), v3(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14), 0.005, GREY);
    part(cups, ball(0.04), BLACK, Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16, { outline: false });
  }
  part(g, cyl(0.008, 0.008, 0.2, 6), GREY, -0.12, H + 0.1, 0, { outline: false });
  const vane = group(g, -0.12, H + 0.2, 0);
  part(vane, box(0.34, 0.01, 0.012), GREY, 0, 0, 0, { outline: false });
  part(vane, box(0.1, 0.1, 0.006), '#ef7d22', -0.17, 0, 0, { outline: false });
  // A windsock on an arm, sagging or stiff.
  rod(g, v3(0, 5.8, 0), v3(0.36, 5.8, 0), 0.01, GREY);
  const sock = group(g, 0.36, 5.8, 0);
  const sockCone = part(sock, cyl(0.1, 0.05, 0.62, 12), '#ef7d22', 0, -0.31, 0, { outline: false });
  void sockCone;
  for (const y of [-0.12, -0.36]) part(sock, cyl(0.086, 0.078, 0.1, 12), WHITE, 0, y, 0, { outline: false });
  // Dome on its arm, and the logger's box with its hinged lid.
  const Dm = MA.dome;
  rod(g, v3(0, Dm[1] - 0.04, 0), v3(Dm[0], Dm[1] - 0.04, Dm[2]), 0.012, GREY);
  part(g, cyl(0.05, 0.05, 0.02, 12), BLACK, Dm[0], Dm[1] - 0.02, Dm[2], { outline: false });
  part(g, new THREE.SphereGeometry(0.036, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#cfe8f5', Dm[0], Dm[1] - 0.012, Dm[2], { outline: false });
  const domeDust = haze(g, new THREE.SphereGeometry(0.038, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#b9a27a', 0.7, Dm[0], Dm[1] - 0.012, Dm[2]);
  const L = MA.logger;
  part(g, rbox(0.26, 0.32, 0.12, 0.012), '#dfe3e6', L[0], L[1], L[2] - 0.08);
  const lid = group(g, L[0], L[1] + 0.16, L[2] - 0.02);
  part(lid, box(0.26, 0.32, 0.012), '#c7ced3', 0, -0.16, 0, { outline: false });
  label(lid, '기상 기록계', 0.2, 0.05, 0, -0.1, 0.007, '#c7ced3', BLACK);
  const scr = liveScreen(g, 0.2, 0.15, 120, 90, L[0], L[1], L[2] - 0.016);
  const cloth = clothTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<GeTool, HeldTool>> = {
    cloth: { tool: cloth, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), palm: v3(0, -0.6, -0.8), shape: 'flat', radius: 0.01 } } },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = { geMast: standAt(g, 'geMast', 0, MA.stand) };
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    const w = windAt(t);
    cups.rotation.y = t * (1 + 12 * w);
    vane.rotation.y = 0.25 * Math.sin(t / 5) + 0.1 * Math.sin(t * 1.3);
    sock.rotation.z = (0.28 + 1.27 * w) + 0.05 * Math.sin(t * 3.4);
    lid.rotation.x = -clamp01(n.lid) * 1.8;
    fade(domeDust, N ? 0.7 * (1 - clamp01(n.wiped)) : 0.25);
    if (clamp01(n.lid) > 0.2) scr.draw(`${q(windMs(t), 2)}|${q(sunAt(t), 40)}`, (c) => {
      c.fillStyle = '#c9d7b8';
      c.fillRect(0, 0, 120, 90);
      text(c, `풍속 ${windMs(t).toFixed(1)}`, 6, 22, 16, BLACK);
      text(c, `일사 ${Math.round(sunAt(t) * 980)}`, 6, 46, 16, BLACK);
      text(c, `기록 정상`, 6, 70, 14, '#1b5e20');
    });
    placeTools(N, [['cloth', cloth], ['tablet', tab.root]]);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, L[0], L[1], L[2]);
}

// =============================================================================================
// 변전 설비 (geSubstation, 5 × 2): a transformer and a gantry behind a locked fence. Looked at from outside it, and no closer.

function substation(g: THREE.Group, out: Built) {
  part(g, box(4.9, 0.02, 1.9), '#a9a498', 0, 0.012, 0, { outline: false, shadow: false });
  const rnd = seeded(39);
  for (let i = 0; i < 40; i++) part(g, ball(0.03), ['#8f8a7e', '#c0bbae'][i % 2], -2.3 + rnd() * 4.6, 0.025, -0.85 + rnd() * 1.5, { outline: false, shadow: false });
  const Z = SB.fenceZ;
  fenceRun(g, -2.4, Z, -0.62, Z, 2.3);
  fenceRun(g, 0.62, Z, 2.4, Z, 2.3);
  fenceRun(g, -2.4, Z, -2.4, -0.92, 2.3);
  fenceRun(g, 2.4, Z, 2.4, -0.92, 2.3);
  fenceRun(g, -2.4, -0.92, 2.4, -0.92, 2.3);
  // The gate, shut and locked.
  fenceRun(g, -0.6, Z, 0.6, Z, 2.3);
  part(g, cyl(0.012, 0.012, 0.3, 8), CHROME, 0, 1.0, Z + 0.02, { rz: Math.PI / 2, outline: false });
  part(g, rbox(0.07, 0.08, 0.04, 0.008), '#d9a521', 0, 0.96, Z + 0.03, { outline: false });
  label(g, '고압 위험 · 접근 금지', 1.06, 0.2, -1.4, 1.46, Z + 0.02, YELLOW, RED);
  label(g, '관계자 외 출입 금지', 1.06, 0.2, 1.4, 1.46, Z + 0.02, YELLOW, RED);
  label(g, '22.9 kV', 0.5, 0.14, 0, 1.46, Z + 0.02, RED, '#ffffff');
  // The transformer: a tank, radiators, three bushings with their rings.
  part(g, box(1.5, 1.2, 0.84), '#7c8a78', -0.3, 0.74, -0.18);
  for (let i = 0; i < 9; i++) part(g, box(0.03, 0.96, 0.2), '#6b786a', -1.02 + i * 0.18, 0.7, 0.34, { outline: false });
  for (let i = 0; i < 5; i++) part(g, box(0.2, 0.96, 0.03), '#6b786a', 0.56, 0.7, -0.5 + i * 0.16, { outline: false });
  for (const x of [-0.7, -0.3, 0.1]) {
    part(g, cyl(0.03, 0.06, 0.08, 10), GREY, x, 1.38, -0.18, { outline: false });
    for (let i = 0; i < 5; i++) part(g, cyl(0.05 - i * 0.004, 0.06 - i * 0.004, 0.055, 12), '#8a4b2c', x, 1.44 + i * 0.07, -0.18, { outline: false });
    part(g, ball(0.03), CHROME, x, 1.8, -0.18, { outline: false });
  }
  part(g, cyl(0.16, 0.16, 0.5, 14), '#7c8a78', -0.3, 1.5, -0.56, { rz: Math.PI / 2 });
  // Its oil gauge, big enough to read from the fence.
  const dial = painted('geGauge', 96, 96, (c) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(48, 48, pos(46), 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = BLACK;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#7ee89e';
    c.beginPath();
    c.moveTo(48, 48);
    c.arc(48, 48, pos(40), -2.4, -0.8);
    c.fill();
    c.strokeStyle = RED;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(48, 48);
    c.lineTo(62, 18);
    c.stroke();
  });
  picture(g, dial, 0.28, 0.28, 0.1, 1.0, 0.245);
  // The gantry: two posts, a beam, insulators, lines going off to the grid. 2026-11-05, the layout audit: the substation stands by
  // the road now, so its lines go out to the 전신주 on the pavement in front and away along the road, not back over the 관리동.
  part(g, cyl(0.1, 0.13, 7.4, 10), '#9e9e96', 3.0, 3.7, 2.6);
  part(g, box(1.8, 0.1, 0.1), '#7d8a93', 3.0, 7.0, 2.6);
  for (const x of [-0.8, 0, 0.8]) {
    part(g, cyl(0.04, 0.04, 0.12, 8), '#8a4b2c', 3.0 + x, 7.11, 2.6, { outline: false });
    rod(g, v3(3.0 + x, 7.17, 2.6), v3(14 + x, 7.0, 2.6 + x * 0.3), 0.006, BLACK);
  }
  for (const x of [-1.5, 1.5]) {
    part(g, box(0.1, 3.8, 0.1), '#7d8a93', x, 1.9, -0.56);
    for (let y = 0.3; y < 3.5; y += 0.5) rod(g, v3(x - 0.05, y, -0.5), v3(x + 0.05, y + 0.36, -0.5), 0.006, '#7d8a93');
  }
  part(g, box(3.2, 0.1, 0.1), '#7d8a93', 0, 3.76, -0.56);
  for (const x of [-0.8, 0, 0.8]) {
    for (let i = 0; i < 4; i++) part(g, cyl(0.05, 0.05, 0.03, 10), '#8a4b2c', x, 3.62 - i * 0.07, -0.56, { outline: false });
    rod(g, v3(x, 3.38, -0.56), v3(3.0 + x, 7.17, 2.6), 0.006, BLACK);
    rod(g, v3(x, 3.38, -0.56), v3(-0.3 + (x * 0.5), 1.82, -0.2), 0.006, '#4a5158');
  }
  // A status lamp, kept steady; a tablet for what they note.
  const lamp = ownLit(g, ball(0.05), LED, 2.0, 2.0, -0.56);
  const tab = tabletTool(g);
  const tools: Partial<Record<GeTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS } };
  const spots: Record<string, Spot> = { geFence: standAt(g, 'geFence', -1.8, SB.stand) };
  const show = (_now: string | null, N: GeNow | null, t: number) => {
    const n = N?.n ?? {};
    placeTools(N, [['tablet', tab.root]]);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
    setLit(lamp, stormy(t) ? (Math.floor(t * 3) % 2 ? AMBER : '#6a4c0c') : LED);
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.2, Z);
}

// =============================================================================================
// 안전 장구함 (gePpeRack, 2 × 1): helmets, harnesses on hooks, under a metre and a half.

function ppeRack(g: THREE.Group, out: Built) {
  for (const x of [-0.92, 0.92]) part(g, box(0.05, 1.42, 0.05), GREY_D, x, 0.71, -0.2);
  part(g, box(1.9, 0.05, 0.05), GREY_D, 0, 1.4, -0.2);
  part(g, box(1.86, 0.04, 0.42), '#c5c9cc', 0, 0.42, 0);
  part(g, box(1.86, 0.04, 0.42), '#c5c9cc', 0, 0.06, 0, { outline: false });
  for (const x of [-0.92, 0.92]) part(g, box(0.05, 0.42, 0.42), GREY_D, x, 0.23, 0, { outline: false });
  label(g, '안전 장구 · 매일 점검', 1.0, 0.1, 0.34, 1.32, -0.17, YELLOW, BLACK);
  // Helmets on the shelf, gloves below.
  ['#f5c518', '#ffffff', '#f5c518', '#ef7d22'].forEach((c, i) => {
    part(g, new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, -0.62 + i * 0.42, 0.44, 0.02);
    part(g, cyl(0.14, 0.14, 0.012, 14), c, -0.62 + i * 0.42, 0.446, 0.02, { outline: false });
  });
  for (let i = 0; i < 3; i++) part(g, rbox(0.2, 0.08, 0.14, 0.02), '#4a5158', -0.5 + i * 0.5, 0.12, 0.02, { outline: false });
  // Harnesses: the one that's checked is a tool; the others stay.
  const hookZ = PP.hook[2];
  for (const x of [PP.hook[0], 0.26, 0.66]) part(g, box(0.02, 0.2, 0.02), GREY, x, 1.26, -0.15 + (x === PP.hook[0] ? hookZ + 0.15 : 0), { outline: false, rx: 0 });
  rod(g, v3(PP.hook[0], 1.32, -0.18), v3(PP.hook[0], 1.2, hookZ), 0.014, GREY);
  for (const x of [0.26, 0.66]) {
    const h = harnessTool(g);
    h.root.name = 'geHarnessSpare';
    at(h.root, [x, 1.14, -0.12]);
  }
  const H = harnessTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<GeTool, HeldTool>> = {
    harness: { tool: H.root, lead: 'right', grips: { right: { at: v3(0, -0.01, 0), axis: v3(1, 0, 0), shape: 'power', radius: 0.012 } } },
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
  };
  const spots: Record<string, Spot> = { geHarness: standAt(g, 'geHarness', 0, PP.stand) };
  const show = (_now: string | null, N: GeNow | null) => {
    const n = N?.n ?? {};
    at(H.root, N?.tool === 'harness' ? N.props.harness : PP.hook);
    H.gate.rotation.x = (n.gate ?? 0) * 0.8;
    placeTools(N, [['tablet', tab.root]]);
    tab.tick.visible = (n.ticked ?? 0) > 0.5;
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, PP.hook[0], PP.hook[1], PP.hook[2]);
}

// =============================================================================================
// Set dressing: the ridge and its far turbines, the ground, a wash cart, a pallet of modules, a cable drum, the site's sign.

/**
 * 2026-11-05, the layout audit: placed at the lot's tile (3, 0) (its middle at (3.5, 0.5)), between the turbine and the mock-up. The
 * ridge beyond with the wind farm along it, far off; and the site's mesh fence round the lot, the gate open at the track in
 * (x 10.6..14.6) with its rolling leaf pushed back, 관계자 외 출입 금지 on it.
 */
function ridge(root: THREE.Group, out: Built) {
  const L = (x: number, z: number) => [x - 3.5, z - 0.5] as const;
  const fence: Array<[number, number, number, number]> = [[0.1, 0.1, 25.9, 0.1], [0.1, 0.1, 0.1, 14.9], [25.9, 0.1, 25.9, 14.9], [0.1, 14.9, 10.6, 14.9], [14.6, 14.9, 25.9, 14.9]];
  for (const [x0, z0, x1, z1] of fence) {
    const [a, b] = L(x0, z0);
    const [c, d] = L(x1, z1);
    fenceRun(root, a, b, c, d, 1.9);
  }
  for (const x of [10.6, 14.6]) part(root, box(0.16, 2.1, 0.16), GREY_D, L(x, 0)[0], 1.05, L(0, 14.9)[1]);
  // The leaf rolled back behind the west part of the fence, on its wheels.
  const leaf = group(root, L(8.6, 0)[0], 0, L(0, 14.75)[1]);
  part(leaf, box(3.8, 0.06, 0.06), GREY_D, 0, 1.9, 0, { outline: false });
  part(leaf, box(3.8, 0.06, 0.06), GREY_D, 0, 0.2, 0, { outline: false });
  for (let i = 0; i <= 12; i++) part(leaf, box(0.03, 1.7, 0.03), GREY, -1.9 + i * (3.8 / 12), 1.05, 0, { outline: false });
  for (const x of [-1.6, 1.6]) part(leaf, cyl(0.07, 0.07, 0.05, 12), BLACK, x, 0.08, 0, { rx: Math.PI / 2, outline: false });
  label(leaf, '관계자 외 출입 금지', 1.3, 0.22, 0, 1.3, 0.04, YELLOW, BLACK);
  label(root, `${FIRM} 발전 단지`, 1.6, 0.3, L(14.6, 0)[0], 2.35, L(0, 14.9)[1] + 0.1, GREEN, '#ffffff');
  // The ridge, its middle at x 8 on the lot.
  const g = group(root, L(8, 0)[0], 0, 0.5);
  // The sea beyond, ridges going back, a line of far turbines.
  part(g, box(44, 0.02, 10), '#6fa4c4', 0, 0.02, -12, { outline: false, shadow: false });
  ([[-5, -6, 8, 2.6, '#6e9465'], [5, -6.5, 9, 3.2, '#7b9f73'], [-1, -8.4, 12, 3.6, '#92af8a'], [10, -9, 7, 3.0, '#a0ba98'], [-11, -8, 7, 3.2, '#8caa84']] as const).forEach(([x, z, r, h, c]) => {
    const m = part(g, ball(1), c, x, 0, z, { outline: false, shadow: false });
    m.scale.set(r, h, r * 0.5);
  });
  const rotors: THREE.Group[] = [];
  for (const [x, z, y, s] of [[-7, -6.2, 2.2, 0.8], [-2.4, -8.2, 2.7, 0.62], [3.2, -6.4, 2.6, 0.82], [8, -8.6, 2.2, 0.6]] as const) {
    const T = group(g, x, y, z);
    T.scale.setScalar(s);
    part(T, cyl(0.04, 0.09, 3.8, 10), WHITE, 0, 1.9, 0, { outline: false, shadow: false });
    part(T, rbox(0.14, 0.14, 0.32, 0.04), WHITE, 0, 3.86, 0, { outline: false, shadow: false });
    const b = bladeSet(T, 1.5, 0.1, WHITE, false);
    b.rotor.position.set(0, 3.86, 0.2);
    rotors.push(b.rotor);
  }
  out.away = (_o, t) => {
    const rate = stormy(t) ? 0 : 0.7 + windAt(t) * 1.6;
    rotors.forEach((r, i) => (r.rotation.z = -(t * rate + i * 1.7)));
  };
}
function ground(g: THREE.Group, W: number, D: number) {
  part(g, box(W, 0.008, D), '#869866', 0, 0.004, 0, { outline: false, shadow: false });
  const rnd = seeded(83);
  for (let i = 0; i < 46; i++) {
    const m = part(g, cyl(0.5, 0.5, 0.002, 12), ['#7c8f5f', '#92a06c', '#9a9b6e'][i % 3], -W / 2 + 0.5 + rnd() * (W - 1), 0.0095, -D / 2 + 0.5 + rnd() * (D - 1), { outline: false, shadow: false });
    m.scale.set(0.8 + rnd() * 1.8, 1, 0.5 + rnd() * 1);
  }
  const ROAD = '#b5ad98';
  // 2026-11-05, the layout audit (the piece is the lot's west 16 m from its back fence to the street): the gravel track across
  // between the wind corner and the panel field, and the track in from the gate along the field's east side.
  part(g, box(W - 0.4, 0.002, 1.6), ROAD, 0, 0.0105, -D / 2 + 4.9, { outline: false, shadow: false });
  part(g, box(3.2, 0.002, 10.6), ROAD, 14 - W / 2, 0.0105, -D / 2 + 9.7, { outline: false, shadow: false });
  // A cable trench's covers from the rows to the inverter room.
  for (let i = 0; i < 12; i++) part(g, box(0.6, 0.012, 0.28), '#9ea3a0', -W / 2 + 0.8 + i * 1.2, 0.012, -D / 2 + 5.95, { outline: false, shadow: false });
  for (let i = 0; i < 90; i++) part(g, cyl(0.002, 0.03, 0.06 + rnd() * 0.06, 5), '#6e8050', -W / 2 + 0.3 + rnd() * (W - 0.6), 0.04, -D / 2 + 0.3 + rnd() * (D - 0.6), { outline: false, shadow: false });
}
function washCart(g: THREE.Group, out: Built) {
  part(g, box(1.74, 0.1, 0.74), GREY_D, 0, 0.26, 0);
  for (const [x, z] of [[-0.7, 0.34], [0.7, 0.34], [-0.7, -0.34], [0.7, -0.34]]) part(g, cyl(0.13, 0.13, 0.06, 14), BLACK, x, 0.13, z, { rx: Math.PI / 2, outline: false });
  // The clear tank in its cage, the pure-water filter and the hose reel.
  part(g, rbox(0.84, 0.72, 0.68, 0.06), '#d6ecf4', -0.34, 0.68, 0);
  for (const x of [-0.72, -0.34, 0.04]) part(g, box(0.02, 0.76, 0.7), GREY, x, 0.68, 0, { outline: false });
  const water = haze(g, new THREE.BoxGeometry(0.82, 0.5, 0.66), '#68b5e8', 0.45, -0.34, 0.6, 0);
  void water;
  for (let i = 0; i < 2; i++) part(g, cyl(0.06, 0.06, 0.46, 12), '#3f7eb0', 0.28 + i * 0.16, 0.54, -0.18);
  const reel = group(g, 0.54, 0.64, 0.14);
  part(reel, cyl(0.2, 0.2, 0.12, 18), '#e0e4e6', 0, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) part(reel, cyl(0.15 + i * 0.012, 0.15 + i * 0.012, 0.024, 14), '#2a6fb0', 0, 0, -0.04 + i * 0.024, { rx: Math.PI / 2, outline: false });
  label(g, '순수 세척수', 0.5, 0.09, -0.34, 0.7, 0.355, '#d6ecf4', NAVY);
  out.animate = (t) => {
    reel.rotation.z = 0.02 * Math.sin(t);
  };
}
function modulePallet(g: THREE.Group) {
  part(g, box(1.7, 0.12, 0.82), '#b5966b', 0, 0.06, 0);
  const face = painted('geSolarFace', 192, 160, (c) => moduleFace(c, 192, 160));
  for (let i = 0; i < 5; i++) {
    part(g, box(1.6, 0.04, 0.76), '#c7ced3', 0, 0.14 + i * 0.05, 0, { outline: false });
  }
  const top = picture(g, face, 1.56, 0.72, 0, 0.385, 0, '#ffffff', 0, -Math.PI / 2);
  void top;
  for (const x of [-0.6, 0.6]) part(g, box(0.03, 0.3, 0.84), '#1f6fa8', x, 0.26, 0, { outline: false });
  label(g, '예비 모듈 · 파손 주의', 0.86, 0.08, 0, 0.26, 0.42, '#b5966b', BLACK);
}
function cableDrum(g: THREE.Group) {
  const drum = group(g, 0, 0.55, 0);
  drum.rotation.x = Math.PI / 2;
  part(drum, cyl(0.54, 0.54, 0.04, 22), '#c5a26f', 0, 0.34, 0);
  part(drum, cyl(0.54, 0.54, 0.04, 22), '#c5a26f', 0, -0.34, 0);
  part(drum, cyl(0.4, 0.4, 0.64, 20), '#1f2428', 0, 0, 0);
  for (let i = 0; i < 12; i++) part(drum, cyl(0.42, 0.42, 0.012, 20), '#343b40', 0, -0.3 + i * 0.054, 0, { outline: false });
  rod(g, v3(0.34, 0.2, 0.2), v3(0.7, 0.03, 0.34), 0.016, '#1f2428');
  part(g, box(0.12, 0.08, 0.96), GREY_D, 0, 0.04, 0, { rx: 0 });
}
function siteSign(g: THREE.Group) {
  part(g, box(0.82, 1.82, 0.05), GREEN, 0, 0.98, -0.38);
  picture(g, painted('geSign', 340, 720, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 340, 720);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 340, 96);
    text(c, FIRM, 170, 50, 36, '#ffffff', 'center');
    text(c, '발전 단지 안내', 170, 132, 28, NAVY, 'center');
    ['① 안전모·안전화 착용', '② 터빈 근처 낙하물 주의', '③ 변전 설비 접근 금지', '④ 패널 위에 올라가지 않기', '⑤ 강풍 시 타워 작업 중지'].forEach((s, i) => text(c, s, 14, 200 + i * 66, 21, BLACK));
    c.fillStyle = GREEN_L;
    c.fillRect(0, 590, 340, 130);
    text(c, '햇빛과 바람으로', 170, 630, 30, NAVY, 'center');
    text(c, '마을에 전기를', 170, 676, 30, NAVY, 'center');
  }), 0.78, 1.72, 0, 0.98, -0.35);
  part(g, cyl(0.26, 0.28, 0.03, 18), GREY_D, 0, 0.015, -0.36);
}

export const BUILDERS: Record<string, Builder> = {
  geSolarRow(g, _W, _D, _c, _def, _ctx, out) {
    solarRow(g, out);
  },
  geTurbine(g, _W, _D, _c, _def, _ctx, out) {
    turbine(g, out);
  },
  geNacelleMock(g, _W, _D, _c, _def, _ctx, out) {
    nacelleMock(g, out);
  },
  geInverterBank(g, _W, _D, _c, _def, _ctx, out) {
    inverterBank(g, out);
  },
  geBatteryBox(g, _W, _D, _c, _def, _ctx, out) {
    batteryBox(g, out);
  },
  geControlDesk(g, _W, _D, _c, _def, _ctx, out) {
    controlDesk(g, out);
  },
  geMast(g, _W, _D, _c, _def, _ctx, out) {
    weatherMast(g, out);
  },
  geSubstation(g, _W, _D, _c, _def, _ctx, out) {
    substation(g, out);
  },
  gePpeRack(g, _W, _D, _c, _def, _ctx, out) {
    ppeRack(g, out);
  },
  geRidge(g, _W, _D, _c, _def, _ctx, out) {
    ridge(g, out);
  },
  geGround(g, W, D) {
    ground(g, W, D);
  },
  geWashCart(g, _W, _D, _c, _def, _ctx, out) {
    washCart(g, out);
  },
  geModulePallet(g) {
    modulePallet(g);
  },
  geCableDrum(g) {
    cableDrum(g);
  },
  geSiteSign(g) {
    siteSign(g);
  },
};
