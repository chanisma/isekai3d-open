import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { BD, BT, CC, CH, CR, DC_LIVE, DK, FT, ND, PF, RK, UP, WL, dcNow, dcPhase, onWall } from './dataCenterMotion';
import type { DcMotion, DcNow, DcTool } from './dataCenterMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { frontDesk } from './frontDesk';

/**
 * The 데이터센터 drawn as itself (2026-11-01, a new career at the user's request), the hall of a made-up company, 구름다리데이터.
 * Long rows of server racks whose lamps never stop, one amber lamp among the disks, a hot aisle with a patch frame and a labeller,
 * a raised floor whose tile comes up on a suction lifter; cooling cabinets breathing cold air; a control room whose wall of graphs
 * follows what's being done out in the hall (DC_LIVE); a chiller, a UPS and its batteries; a badge door.
 *
 * It's worked at night, so the aisles have lit strips along the rack tops and everything on a screen lights itself. Racks are
 * turned so that the aisles run towards the camera: whoever's in one is seen down its length. Everything that moves follows
 * dataCenterMotion.ts. All names are made up.
 */

const FIRM = '구름다리데이터';
const RACK = '#20262c';
const RACK_L = '#2f3841';
const WHITE = '#eef1f3';
const PANEL = '#d5dbdf';
const PANEL_D = '#aab4bb';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const NAVY = '#0d3b66';
const AMBER = '#ffb300';
const AMBER_L = '#ffe08a';
const RED = '#e53935';
const GREEN = '#43a047';
const LED = '#76ff8a';
const ICE = '#d9f2ff';
const BLUE = '#2f6fd0';
const PAPER = '#fbfaf6';
const SKIN = '#f1c9a5';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP_V = v3(0, 1, 0);
const tmp = new THREE.Vector3();
const tA = new THREE.Vector3();
const tB = new THREE.Vector3();
const tC = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const hash = (a: number, b: number, c: number) => (((Math.floor(a) * 73856093) ^ (Math.floor(b) * 19349663) ^ (Math.floor(c) * 83492791)) >>> 0) % 100;
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
function glass(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, opacity = 0.18): THREE.Mesh {
  const m = haze(g, new THREE.PlaneGeometry(w, h), '#cfe8f5', opacity, x, y, z);
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
function standAt(g: THREE.Object3D, motion: DcMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: DcMotion, seat: V): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<DcTool, HeldTool>>, show: (now: string | null, N: DcNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? dcNow(sp.motion as DcMotion, t, dcPhase(g.getWorldPosition(tmp)), H) : null;
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
function dial(g: THREE.Object3D, x: number, y: number, z: number, r = 0.06) {
  part(g, cyl(r, r, 0.02, 20), BLACK, x, y, z, { rx: Math.PI / 2, outline: false });
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 20), new THREE.MeshBasicMaterial({
    map: painted('dcDial', 64, 64, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 64, 64);
      c.strokeStyle = GRAPHITE;
      c.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (1.25 - 0.1875 * i);
        c.beginPath();
        c.moveTo(32 + 26 * Math.cos(a), 32 - 26 * Math.sin(a));
        c.lineTo(32 + 30 * Math.cos(a), 32 - 30 * Math.sin(a));
        c.stroke();
      }
      c.strokeStyle = GREEN;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(32, 32, 22, -0.5, 0.5);
      c.stroke();
    }),
  }));
  face.userData.ownGeometry = face.userData.ownMaterial = true;
  face.position.set(x, y, z + 0.012);
  g.add(face);
  const needle = group(g, x, y, z + 0.015);
  part(needle, box(0.005, r * 0.75, 0.002), RED, 0, r * 0.32, 0, { outline: false });
  return needle;
}
/** A lit strip over the aisle, for the night shift. */
function stripLamp(g: THREE.Object3D, w: number, x: number, y: number, z: number) {
  part(g, box(w + 0.04, 0.03, 0.09), GREY_D, x, y + 0.018, z, { outline: false });
  ownLit(g, box(w, 0.012, 0.07), ICE, x, y, z);
}
/** A status tower: red, amber, green on a pole. */
function tower(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.012, 0.012, 0.08, 6), GREY_D, x, y + 0.04, z, { outline: false });
  const lamps = [RED, AMBER, GREEN].map((c, i) => ownLit(g, cyl(0.03, 0.03, 0.045, 12), shade(c, 0.5), x, y + 0.1 + i * 0.05, z));
  return (which: number) => lamps.forEach((m, i) => setLit(m, i === which ? [RED, AMBER, LED][i] : shade([RED, AMBER, GREEN][i], 0.45)));
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

function tabletTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcTablet';
  const tilt = group(root);
  tilt.rotation.x = -0.55;
  part(tilt, rbox(0.24, 0.17, 0.012, 0.006), GRAPHITE, 0, 0, 0, { outline: false });
  const face = picture(tilt, painted('dcTabletFace', 192, 136, (c) => {
    c.fillStyle = '#10202c';
    c.fillRect(0, 0, 192, 136);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 192, 26);
    text(c, '점검표', 8, 13, 15, '#ffffff');
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#31475a';
      c.fillRect(10, 36 + i * 24, 140, 16);
      c.strokeStyle = '#9fd6ff';
      c.strokeRect(160, 36 + i * 24, 16, 16);
    }
  }), 0.22, 0.15, 0, 0, 0.007);
  void face;
  const ticks = [0, 1].map((i) => ownLit(tilt, box(0.016, 0.016, 0.002), LED, 0.075, 0.028 - i * 0.031, 0.009));
  return { root, ticks };
}
const TABLET_GRIPS: HeldTool['grips'] = { left: boardGrip(0.55) };
function driverTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcDriver';
  part(root, cyl(0.016, 0.014, 0.1, 10), '#1565c0', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.004, 0.004, 0.11, 8), CHROME, 0, 0, -0.1, { rx: Math.PI / 2, outline: false });
  return root;
}
/** A disk in its caddy: the handle at the origin across x, the disk behind it (-z). */
function caddyTool(g: THREE.Object3D, name: string, c = '#3a4650') {
  const root = group(g);
  root.name = name;
  part(root, box(0.13, 0.04, 0.2), c, 0, 0, -0.13, { outline: false });
  part(root, box(0.13, 0.044, 0.012), '#596673', 0, 0, -0.026, { outline: false });
  const lever = group(root, 0, -0.012, -0.022);
  part(lever, cyl(0.009, 0.009, 0.11, 10), '#aab4bb', 0, 0.012, 0.022, { rz: Math.PI / 2, outline: false });
  const lamp = ownLit(root, box(0.018, 0.012, 0.004), AMBER, 0.05, 0.013, -0.018);
  return { root, lever, lamp };
}
const CADDY_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(-1, 0, 0), shape: 'power', radius: 0.012 } };
/** A network plug: the grip at the origin, the nose to -z, its boot and cable behind. */
function plugTool(g: THREE.Object3D, name: string, c: string) {
  const root = group(g);
  root.name = name;
  part(root, box(0.018, 0.016, 0.03), '#e0e8ec', 0, 0, -0.03, { outline: false });
  part(root, box(0.02, 0.018, 0.034), c, 0, 0, 0, { outline: false });
  part(root, cyl(0.005, 0.005, 0.04, 6), c, 0, 0, 0.034, { rx: Math.PI / 2, outline: false });
  return root;
}
const PLUG_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pinch', radius: 0.009 } };
/** The labeller: a pistol grip at the origin, its printer on top, the tape coming out at the front. */
function labellerTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcLabeller';
  part(root, cyl(0.016, 0.018, 0.1, 10), '#f9a825', 0, -0.01, 0, { outline: false });
  part(root, rbox(0.07, 0.07, 0.17, 0.016), '#fbc02d', 0, 0.07, -0.03, { outline: false });
  part(root, box(0.05, 0.002, 0.05), GRAPHITE, 0, 0.106, -0.03, { outline: false });
  label(root, '라벨', 0.05, 0.02, 0, 0.078, 0.057, '#ffffff', BLACK);
  part(root, box(0.012, 0.024, 0.016), RED, 0, 0.03, -0.018, { outline: false });
  const tape = part(root, box(0.024, 0.002, 1), PAPER, 0, 0.06, -0.12, { outline: false });
  return { root, tape };
}
/** The suction lifter: a bar for both hands, a cup at each end. */
function lifterTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcLifter';
  part(root, cyl(0.014, 0.014, 0.34, 10), '#37474f', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const cups = [-1, 1].map((sx) => {
    rod(root, v3(sx * 0.14, 0, 0), v3(sx * 0.14, -0.12, 0), 0.008, CHROME);
    return part(root, cyl(0.055, 0.065, 0.03, 14), sx < 0 ? '#c62828' : '#1565c0', sx * 0.14, -0.135, 0, { outline: false });
  });
  return { root, cups };
}
const LIFTER_GRIPS: HeldTool['grips'] = {
  right: { at: v3(0.07, 0, 0), axis: v3(-1, 0, 0), shape: 'power', radius: 0.014 },
  left: { at: v3(-0.07, 0, 0), axis: v3(1, 0, 0), shape: 'power', radius: 0.014 },
};
/** A torch pointed down and forward. */
function torchTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcTorch';
  root.rotation.x = -0.75;
  part(root, cyl(0.015, 0.015, 0.14, 10), GRAPHITE, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.024, 0.016, 0.03, 12), GREY_D, 0, 0, -0.085, { rx: Math.PI / 2, outline: false });
  ownLit(root, cyl(0.02, 0.02, 0.004, 12), AMBER_L, 0, 0, -0.1).rotation.x = Math.PI / 2;
  const beam = haze(root, new THREE.ConeGeometry(0.12, 0.42, 14, 1, true), '#fff2b0', 0, 0, 0, -0.31);
  beam.rotation.x = -Math.PI / 2;
  return { root, beam };
}
function probeTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcProbe';
  part(root, cyl(0.012, 0.012, 0.1, 10), '#c62828', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.002, 0.002, 0.09, 6), CHROME, 0, 0, -0.095, { rx: Math.PI / 2, outline: false });
  return root;
}
const PEN = (r = 0.012): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pen', radius: r } });
function handsetTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcHandset';
  part(root, cyl(0.016, 0.016, 0.14, 10), GRAPHITE, 0, 0, 0, { outline: false });
  part(root, rbox(0.04, 0.03, 0.05, 0.01), GRAPHITE, 0, 0.08, 0.01, { outline: false });
  part(root, rbox(0.04, 0.03, 0.05, 0.01), GRAPHITE, 0, -0.08, 0.01, { outline: false });
  return root;
}
function laserTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcLaser';
  part(root, cyl(0.01, 0.01, 0.13, 10), CHROME, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  ownLit(root, cyl(0.005, 0.005, 0.004, 8), '#ff5252', 0, 0, -0.066).rotation.x = Math.PI / 2;
  return root;
}
function badgeTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'dcBadgeCard';
  part(root, box(0.055, 0.085, 0.004), WHITE, 0, -0.045, -0.008, { outline: false });
  part(root, box(0.03, 0.03, 0.001), '#90a4ae', 0, -0.03, -0.0105, { outline: false });
  part(root, box(0.055, 0.016, 0.001), NAVY, 0, -0.078, -0.0105, { outline: false });
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
// The cabinets all the rows are made of.

/** The steel of a row: three cabinets, plinth, a tray of cables overhead, the strip that lights the aisle. */
function cabinets(g: THREE.Group) {
  for (const x of RK.cabs) {
    part(g, rbox(0.94, 2.06, 0.88, 0.015), RACK, x, 1.03, -0.02);
    part(g, box(0.94, 0.08, 0.92), BLACK, x, 0.04, -0.02, { outline: false });
    part(g, box(0.9, 0.04, 0.04), RACK_L, x, 2.04, RK.face + 0.002, { outline: false });
    // The door's handle and a number plate.
    part(g, box(0.018, 0.2, 0.03), CHROME, x + 0.42, 1.12, RK.face + 0.015, { outline: false });
  }
  // The tray over the row, its cables showing.
  part(g, box(2.9, 0.02, 0.3), GREY, 0, 2.2, -0.05, { outline: false });
  for (const sz of [-1, 1]) part(g, box(2.9, 0.06, 0.012), GREY, 0, 2.23, -0.05 + sz * 0.15, { outline: false });
  const r = seeded(29);
  ['#ffb300', '#1e88e5', '#43a047', '#ffee58', '#eceff1'].forEach((c, i) => {
    part(g, cyl(0.012 + r() * 0.008, 0.012, 2.82, 6), c, 0, 2.225, -0.15 + i * 0.05, { rz: Math.PI / 2, outline: false });
  });
  for (const x of [-1.32, 0, 1.32]) rod(g, v3(x, 2.06, -0.05), v3(x, 2.2, -0.05), 0.012, GREY_D);
  stripLamp(g, 2.7, 0, 2.17, RK.face + 0.16);
}
/** The backs of the racks: fans, power strips, the warm glow of a hot aisle. */
function rackBack(g: THREE.Object3D) {
  const tex = painted('dcRackBack', 440, 300, (c) => {
    c.fillStyle = '#14181c';
    c.fillRect(0, 0, 440, 300);
    for (let cab = 0; cab < 3; cab++) {
      const x0 = 6 + cab * 146;
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 4; i++) {
          c.strokeStyle = '#3c454d';
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(x0 + 20 + i * 30, 22 + j * 34, 11, 0, Math.PI * 2);
          c.moveTo(x0 + 9 + i * 30, 22 + j * 34);
          c.lineTo(x0 + 31 + i * 30, 22 + j * 34);
          c.stroke();
        }
      c.fillStyle = '#c62828';
      c.fillRect(x0 + 128, 6, 8, 288);
      for (let k = 0; k < 8; k++) {
        c.fillStyle = ['#ffb300', '#1e88e5', '#43a047'][k % 3];
        c.fillRect(x0 + 2, 18 + k * 34, 126, 3);
      }
    }
  });
  picture(g, tex, 2.86, 1.92, 0, 1.08, -0.475, '#ffffff', Math.PI);
  ownLit(g, box(2.7, 0.012, 0.04), '#ff8a50', 0, 2.1, -0.49);
}
/** Perforated tiles in the aisle in front. */
function coldFloor(g: THREE.Object3D) {
  const tex = painted('dcPerf', 128, 128, (c) => {
    c.fillStyle = '#c9d6dd';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#6f8591';
    for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) c.fillRect(6 + i * 10, 6 + j * 10, 4, 4);
    c.strokeStyle = '#8fa1ab';
    c.lineWidth = 3;
    c.strokeRect(1, 1, 126, 126);
  });
  for (let i = -1; i <= 1; i++) {
    const m = picture(g, tex, 0.96, 0.96, i * 1.0, 0.012, 1.0, '#cfe8f7', 0, -Math.PI / 2);
    m.renderOrder = 1;
  }
  haze(g, new THREE.PlaneGeometry(2.9, 0.9), '#a6dcff', 0.1, 0, 0.03, 1).rotation.x = -Math.PI / 2;
  // Cold air coming up to the fronts: faint sheets that rise and fade.
  return [0, 1, 2].map((i) => haze(g, new THREE.PlaneGeometry(0.8, 0.5), '#cdefff', 0, RK.cabs[i], 0.4, RK.face + 0.1));
}
function coldBreath(sheets: THREE.Mesh[], t: number) {
  sheets.forEach((m, i) => {
    const u = ((t * 0.22 + i * 0.37) % 1 + 1) % 1;
    m.position.y = 0.3 + 1.1 * u;
    fade(m, 0.13 * Math.sin(u * Math.PI));
  });
}
/** One tick of a rack's lamps: 18 servers to a cabinet, each with its row of lamps; `hole` leaves a slot dark. */
function rackFace(c: Ctx2, w: number, h: number, seed: number, tick: number, hole?: { cab: number; row: number }) {
  c.fillStyle = '#0e1216';
  c.fillRect(0, 0, w, h);
  const cw = w / 3;
  const rows = 18;
  const rh = h / rows;
  for (let cab = 0; cab < 3; cab++) {
    const x0 = cab * cw + 4;
    const ww = cw - 8;
    for (let j = 0; j < rows; j++) {
      const y = j * rh;
      if (hole && hole.cab === cab && (j === hole.row || j === hole.row + 1)) {
        c.fillStyle = '#040506';
        c.fillRect(x0, y + 1, ww, rh - 2);
        continue;
      }
      const kind = hash(seed, cab * 17, j);
      c.fillStyle = kind < 34 ? '#2c343c' : kind < 67 ? '#222a31' : '#343d46';
      c.fillRect(x0, y + 1, ww, rh - 2);
      c.fillStyle = '#12171c';
      for (let v = 0; v < 12; v++) c.fillRect(x0 + ww * 0.46 + v * 4.6, y + 3, 2.2, rh - 6);
      // The lamps: mostly green, some flickering with the traffic, a blue here and there.
      for (let i = 0; i < 6; i++) {
        const b = hash(seed + i, cab + j * 31, tick + i * 3 + j);
        const busy = hash(seed, i * 7 + j, cab) < 60;
        c.fillStyle = !busy ? '#2f6e40' : b < 62 ? '#7dffa0' : b < 72 ? '#9fd6ff' : '#1d3a26';
        c.fillRect(x0 + 6 + i * 7.5, y + rh * 0.5 - 2, 5, 4);
      }
    }
  }
}

// =============================================================================================
// 서버 랙 줄 (dcServerRack, 3 × 1): three lit cabinets, a slot for a new server, its trolley while it's used.

function serverRack(g: THREE.Group, out: Built) {
  cabinets(g);
  rackBack(g);
  const sheets = coldFloor(g);
  const seed = Math.floor(seeded(Math.round(Math.abs(g.position.x * 13 + g.position.z * 7)) + 41)() * 90);
  const face = liveScreen(g, 2.86, 1.92, 440, 296, 0, 1.08, RK.face + 0.004);
  // A number on each cabinet.
  RK.cabs.forEach((x, i) => label(g, `A-${i + 1}`, 0.2, 0.07, x, 1.97, RK.face + 0.007, '#ffffff', BLACK));
  const srv = group(g);
  part(srv, box(0.5, 0.17, 0.56), RACK_L, 0, 0, 0);
  part(srv, box(0.52, 0.18, 0.006), '#404b56', 0, 0, 0.283, { outline: false });
  for (let i = 0; i < 8; i++) part(srv, box(0.025, 0.14, 0.002), GRAPHITE, 0.02 + i * 0.026, 0, 0.287, { outline: false });
  const srvLamp = ownLit(srv, box(0.024, 0.012, 0.004), '#3a4a3e', -0.2, 0.03, 0.288);
  const srvLamp2 = ownLit(srv, box(0.024, 0.012, 0.004), '#3a4a3e', -0.16, 0.03, 0.288);
  for (const sx of [-1, 1]) part(srv, box(0.04, 0.17, 0.006), STEEL, sx * 0.27, 0, 0.283, { outline: false });
  // The trolley, out only while it's used.
  const trolley = group(g, RK.trolley[0], 0, RK.trolley[2]);
  part(trolley, box(0.56, 0.03, 0.62), GREY, 0, RK.trolley[1] - 0.1, 0);
  part(trolley, box(0.5, 0.02, 0.56), GREY_D, 0, 0.14, 0, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(trolley, cyl(0.012, 0.012, RK.trolley[1] - 0.14, 6), CHROME, sx * 0.25, (RK.trolley[1] - 0.14) / 2 + 0.07, sz * 0.28, { outline: false });
    part(trolley, ball(0.03), BLACK, sx * 0.25, 0.03, sz * 0.28, { outline: false });
  }
  const drv = driverTool(g);
  const tab = tabletTool(g);
  const tools: Partial<Record<DcTool, HeldTool>> = {
    tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS },
    driver: { tool: drv, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.015 } } },
  };
  const spots: Record<string, Spot> = { dcPatrol: standAt(g, 'dcPatrol', -1.0, RK.stand), dataCenter_rackServer: standAt(g, 'dcRackServer', -0.12, 0.98) };
  const show = (now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const racking = now === 'dataCenter_rackServer';
    face.draw(`${Math.floor(t * 3)}`, (c) => rackFace(c, 440, 296, seed, Math.floor(t * 3), { cab: 2, row: 6 }));
    coldBreath(sheets, t);
    at(srv, racking ? P.srv : RK.slot);
    const on = !racking || (n.on ?? 0) > 0.5;
    setLit(srvLamp, on ? (Math.sin(t * 7) > -0.3 ? '#7dffa0' : '#2f6e40') : '#2b3530');
    setLit(srvLamp2, on ? '#9fd6ff' : '#2b3530');
    trolley.visible = racking;
    at(drv, racking ? P.driver : null);
    drv.rotation.z = n.spin ?? 0;
    at(tab.root, now === 'dcPatrol' ? P.tablet : null);
    tab.ticks[0].visible = clamp01(n.checked) > 0.5;
    tab.ticks[1].visible = clamp01(n.note) > 0.5;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.2, RK.face);
}

// =============================================================================================
// 디스크 랙 (dcDiskRack, 3 × 1): servers on the left, two cabinets of disk bays, one lamp amber.

function diskFace(c: Ctx2, w: number, h: number, tick: number) {
  c.fillStyle = '#0e1216';
  c.fillRect(0, 0, w, h);
  const cw = w / 3;
  // The first cabinet: ordinary servers.
  c.save();
  c.beginPath();
  c.rect(0, 0, cw, h);
  c.clip();
  rackFace(c, w, h, 53, tick);
  c.restore();
  // The other two: shelves of disks, one caddy's front in each cell.
  for (let cab = 1; cab < 3; cab++) {
    const x0 = cab * cw + 4;
    const ww = cw - 8;
    for (let s = 0; s < 6; s++) {
      const y0 = 6 + s * ((h - 12) / 6);
      const sh = (h - 12) / 6 - 4;
      c.fillStyle = '#39434c';
      c.fillRect(x0, y0, ww, sh);
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 7; i++) {
          const dx = x0 + 3 + i * ((ww - 6) / 7);
          const dy = y0 + 2 + row * ((sh - 4) / 3);
          c.fillStyle = '#596673';
          c.fillRect(dx, dy, (ww - 6) / 7 - 2, (sh - 4) / 3 - 2);
          const b = hash(cab * 3 + i, s * 5 + row, tick + i + row);
          c.fillStyle = b < 74 ? '#7dffa0' : b < 86 ? '#2f6e40' : '#9fd6ff';
          c.fillRect(dx + 2, dy + 2, 4, 3);
        }
    }
  }
}
function diskRack(g: THREE.Group, out: Built) {
  cabinets(g);
  rackBack(g);
  const sheets = coldFloor(g);
  const face = liveScreen(g, 2.86, 1.92, 440, 296, 0, 1.08, RK.face + 0.004);
  RK.cabs.forEach((x, i) => label(g, ['B-1', '디스크 B-2', '디스크 B-3'][i], i === 0 ? 0.2 : 0.42, 0.07, x, 1.97, RK.face + 0.007, '#ffffff', BLACK));
  // The empty place the failed disk sits in.
  part(g, box(0.15, 0.06, 0.004), '#050607', DK.bay[0], DK.bay[1], RK.face + 0.0055, { outline: false });
  // The basket of spares, hung on the left door.
  const bs = group(g, -0.8, 0.96, 0.58);
  for (const sz of [-1, 1]) part(bs, box(0.46, 0.14, 0.006), STEEL, 0, 0, sz * 0.14, { outline: false });
  for (const sx of [-1, 1]) part(bs, box(0.006, 0.14, 0.28), STEEL, sx * 0.23, 0, 0, { outline: false });
  part(bs, box(0.46, 0.006, 0.28), STEEL, 0, -0.07, 0, { outline: false });
  for (const sx of [-0.14, 0.14]) rod(bs, v3(sx, 0.07, -0.14), v3(sx, 0.2, -0.155), 0.006, STEEL);
  label(bs, '예비 디스크', 0.3, 0.05, 0, 0.0, 0.146, AMBER, BLACK);
  // A small panel on the top of the array, its rebuild bar.
  part(g, box(0.44, 0.15, 0.02), BLACK, 0.97, 1.92, RK.face + 0.01, { outline: false });
  const lcd = liveScreen(g, 0.4, 0.12, 200, 60, 0.97, 1.92, RK.face + 0.022);
  const old = caddyTool(g, 'dcOldDisk', '#3a4650');
  const neu = caddyTool(g, 'dcNewDisk', '#50606e');
  setLit(neu.lamp, '#2b3530');
  const tools: Partial<Record<DcTool, HeldTool>> = { oldDisk: { tool: old.root, lead: 'right', grips: CADDY_GRIP }, newDisk: { tool: neu.root, lead: 'right', grips: CADDY_GRIP } };
  const spots: Record<string, Spot> = { dcSwapDisk: standAt(g, 'dcSwapDisk', -1.05, DK.stand) };
  const show = (_now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    face.draw(`${Math.floor(t * 3)}`, (c) => diskFace(c, 440, 296, Math.floor(t * 3)));
    coldBreath(sheets, t);
    const amber = N ? (n.amber ?? 0) > 0.5 : true;
    at(old.root, P.oldDisk ?? DK.bay);
    at(neu.root, P.newDisk ?? DK.spare);
    setLit(old.lamp, amber ? (Math.sin(t * 6) > 0 ? '#ffb300' : '#6b4c00') : '#2b3530');
    old.lever.rotation.x = -0.7 * clamp01(n.latch);
    const rb = n.rebuild ?? -1;
    setLit(neu.lamp, (n.green ?? 0) > 0.5 ? LED : rb >= 0 ? (Math.sin(t * 9) > 0 ? LED : '#2f6e40') : '#2b3530');
    if (N && rb >= 0) {
      DC_LIVE.rebuild = rb;
      DC_LIVE.rebuildAt = t;
    }
    lcd.draw(`${N ? q(rb, 40) : 'i'}|${amber ? 1 : 0}`, (c) => {
      c.fillStyle = '#0a1a22';
      c.fillRect(0, 0, 200, 60);
      if (rb >= 0) {
        text(c, rb >= 1 ? '복구 완료' : `재구성 ${Math.round(rb * 100)}%`, 8, 18, 20, rb >= 1 ? '#7ee89e' : AMBER_L);
        c.fillStyle = '#233640';
        c.fillRect(8, 36, 184, 14);
        c.fillStyle = rb >= 1 ? LED : AMBER;
        c.fillRect(8, 36, 184 * clamp01(rb), 14);
      } else {
        text(c, amber ? '디스크 1개 고장' : '정상', 8, 18, 20, amber ? AMBER_L : '#7ee89e');
        text(c, amber ? '슬롯 B-2 · 14' : '12TB × 84', 8, 44, 16, '#9fd6ff');
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, DK.bay[0], DK.bay[1], DK.bay[2]);
}

// =============================================================================================
// 패치 프레임 (dcPatchFrame, 3 × 1): open frame in the hot aisle: patch panels, a cable manager, cables on hooks.

function patchFrame(g: THREE.Group, out: Built) {
  const T = 2.04;
  for (const x of [-1.36, -0.02, 0.56, 1.36]) part(g, box(0.06, T, 0.08), RACK_L, x, T / 2, 0.16);
  part(g, box(2.82, 0.06, 0.4), RACK, 0, 0.03, 0.04);
  part(g, box(2.82, 0.04, 0.14), RACK_L, 0, T, 0.16);
  // A closed back so the racks beyond don't show through.
  part(g, box(2.82, T - 0.06, 0.03), '#1a1f24', 0, T / 2, -0.04, { outline: false });
  // The panels, row on row, their ports.
  const panels = painted('dcPatchPanel', 320, 40, (c) => {
    c.fillStyle = '#1b2127';
    c.fillRect(0, 0, 320, 40);
    c.fillStyle = '#050607';
    for (let i = 0; i < 24; i++) c.fillRect(8 + i * 13, 10 + (i % 2) * 2, 9, 12);
    c.fillStyle = '#e8edf0';
    c.fillRect(4, 28, 312, 8);
  });
  const rows: number[] = [];
  for (let i = 0; i < 11; i++) rows.push(0.62 + i * 0.1);
  rows.forEach((y) => picture(g, panels, 1.26, 0.09, -0.69, y, 0.255));
  label(g, '패치 구역 C · 라벨 없는 선 금지', 1.26, 0.09, -0.69, 1.86, 0.26, AMBER, BLACK);
  // Short colour-coded cables already in place, each dropping off to the manager.
  const r = seeded(13);
  const COL = ['#ffb300', '#1e88e5', '#43a047', '#eceff1', '#ffee58'];
  for (let i = 0; i < 28; i++) {
    const y = rows[Math.floor(r() * rows.length)];
    const x = -1.28 + r() * 1.18;
    const col = COL[Math.floor(r() * COL.length)];
    rod(g, v3(x, y, 0.28), v3(x + 0.02, y - 0.05, 0.31), 0.005, col);
    rod(g, v3(x + 0.02, y - 0.05, 0.31), v3(0.0, y - 0.1, 0.3), 0.005, col);
    ownLit(g, box(0.008, 0.006, 0.002), r() < 0.8 ? LED : AMBER_L, x + 0.012, y + 0.028, 0.258);
  }
  // The manager: the bundle running down it. Loose until it's been dressed.
  part(g, box(0.34, 1.52, 0.04), '#14181c', PF.bundleX, 1.14, 0.22, { outline: false });
  const loose = [0, 1, 2, 3, 4].map((i) => ({
    color: COL[i],
    a: limb(g, 0.008, COL[i]),
    b: limb(g, 0.008, COL[i]),
    off: -0.06 + i * 0.03,
    sway: 0.08 + r() * 0.1,
    dir: i % 2 ? 1 : -1,
  }));
  const straps = PF.ys.map((y) => part(g, box(0.16, 0.024, 0.06), '#212121', PF.bundleX, y, PF.face + 0.025, { outline: false }));
  // Hooks with coils of cable, the labeller's holster on the post; a work order taped up.
  for (const [i, c] of ['#1e88e5', '#ffb300', '#43a047'].entries()) {
    const hx = 0.82 + i * 0.2;
    part(g, cyl(0.006, 0.006, 0.06, 6), STEEL, hx, 1.2, 0.3, { rx: Math.PI / 2, outline: false });
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 20), new THREE.MeshToonMaterial({ color: c }));
    coil.userData.ownGeometry = coil.userData.ownMaterial = true;
    coil.position.set(hx, 1.12, 0.32);
    g.add(coil);
  }
  picture(g, painted('dcOrder', 200, 256, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 200, 256);
    text(c, '작업 지시서', 100, 26, 22, NAVY, 'center');
    ['A-07 → 코어 스위치', 'B-12 → 고객 랙 C3', '케이블: 파랑 3m', '라벨: 양쪽 끝'].forEach((s, i) => text(c, s, 10, 66 + i * 40, 17, BLACK));
    c.strokeStyle = GREY;
    c.strokeRect(6, 216, 18, 18);
    text(c, '완료 확인', 32, 226, 16, BLACK);
  }), 0.3, 0.38, 0.72, 1.56, 0.262);
  // The tray and the lit strip.
  part(g, box(2.84, 0.02, 0.34), GREY, 0, 2.14, 0.16, { outline: false });
  for (const sz of [-1, 1]) part(g, box(2.84, 0.06, 0.012), GREY, 0, 2.17, 0.16 + sz * 0.17, { outline: false });
  COL.forEach((c, i) => part(g, cyl(0.014, 0.014, 2.76, 6), c, 0, 2.165, 0.06 + i * 0.05, { rz: Math.PI / 2, outline: false }));
  for (const x of [-0.82, -0.3, 0.42]) rod(g, v3(x, 2.14, 0.14), v3(x, 1.78, 0.2), 0.016, COL[Math.floor((x + 1) * 3) % COL.length]);
  stripLamp(g, 2.6, 0, 2.11, 0.46);
  // The hot aisle's floor and glow: along the whole aisle, back to the wall.
  const hotFloor = haze(g, new THREE.PlaneGeometry(6, 1.9), '#ff7043', 0.1, 1.5, 0.014, 1.45);
  hotFloor.rotation.x = -Math.PI / 2;
  // The new cable: a plug at each end, a sag between; the two lamps it lights.
  const plA = plugTool(g, 'dcPlugA', '#1e88e5');
  const plB = plugTool(g, 'dcPlugB', '#1e88e5');
  const c1 = limb(g, 0.006, '#1e88e5');
  const c2 = limb(g, 0.006, '#1e88e5');
  const lampA = ownLit(g, box(0.016, 0.01, 0.002), '#233328', PF.a[0], PF.a[1] + 0.026, 0.258);
  const lampB = ownLit(g, box(0.016, 0.01, 0.002), '#233328', PF.b[0], PF.b[1] + 0.026, 0.258);
  const tag = part(g, box(0.06, 0.016, 0.018), PAPER, PF.b[0], PF.b[1] - 0.05, PF.b[2] + 0.02, { outline: false });
  const lab = labellerTool(g);
  const tools: Partial<Record<DcTool, HeldTool>> = {
    plugA: { tool: plA, lead: 'right', grips: PLUG_GRIP },
    plugB: { tool: plB, lead: 'right', grips: PLUG_GRIP },
    labeller: { tool: lab.root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'trigger', radius: 0.017 } } },
  };
  const spots: Record<string, Spot> = { dcPatch: standAt(g, 'dcPatch', 0.56, PF.stand), dcTidy: standAt(g, 'dcTidy', PF.bundleX, PF.stand) };
  const done: V = [PF.a[0], PF.a[1], PF.a[2]];
  const doneB: V = [PF.b[0], PF.b[1], PF.b[2]];
  const show =(now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const patching = now === 'dcPatch';
    at(plA, patching ? P.plugA : done);
    at(plB, patching ? P.plugB : doneB);
    const on = patching ? (n.cable ?? 0) > 0.5 : true;
    if (on) {
      tA.copy(plA.position);
      tA.z += 0.05;
      tB.copy(plB.position);
      tB.z += 0.05;
      tC.copy(tA).lerp(tB, 0.5);
      tC.y = Math.min(tA.y, tB.y) - 0.16;
      tC.z += 0.05;
      c1(tA, tC);
      c2(tC, tB);
    } else {
      c1(tA.set(0, -1, 0), tB.set(0, -1, 0.001));
      c2(tA, tB);
    }
    const linked = patching ? (n.linked ?? 0) > 0.5 : true;
    setLit(lampA, linked ? (Math.sin(t * 13) > -0.5 ? LED : '#2f6e40') : '#233328');
    setLit(lampB, linked ? (Math.sin(t * 11) > -0.5 ? LED : '#2f6e40') : '#233328');
    tag.visible = patching ? (n.tag ?? 0) > 0.5 : true;
    if (N && patching) {
      DC_LIVE.link = linked ? 1 : 0;
      DC_LIVE.linkAt = t;
    }
    at(lab.root, patching ? P.labeller : PF.holster);
    const tape = clamp01(n.tape);
    lab.tape.visible = tape > 0.03;
    lab.tape.scale.z = Math.max(0.001, 0.08 * tape);
    lab.tape.position.z = -0.115 - 0.04 * tape;
    // The bundle: bows and sags when loose, straight when it's been dressed.
    const tidy = now === 'dcTidy' ? clamp01(n.tidy) : 1;
    for (const L of loose) {
      const bow = (1 - tidy) * L.sway * L.dir;
      const x = PF.bundleX + L.off * (0.4 + 0.6 * tidy);
      tA.set(x, 1.86, PF.face + 0.012);
      tB.set(x + bow, 1.36, PF.face + 0.012 + (1 - tidy) * 0.06);
      tC.set(x, 0.56, PF.face + 0.012);
      L.a(tA, tB);
      L.b(tB, tC);
    }
    straps.forEach((m, i) => (m.visible = now === 'dcTidy' ? (n.straps ?? 0) > i + 0.5 : true));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, -0.6, 1.3, 0.3);
}

// =============================================================================================
// 이중 바닥 (dcFloorTile, 2 × 2): a raised floor with its hatch tile; what runs under it painted in the opening.

function floorTile(g: THREE.Group, out: Built) {
  const y = 0.06;
  const [hx, , hz] = FT.tile;
  const half = 0.3;
  // The plate in four strips round the opening.
  const plate = (x0: number, x1: number, z0: number, z1: number) => part(g, box(x1 - x0, y, z1 - z0), '#bcc7cd', (x0 + x1) / 2, y / 2, (z0 + z1) / 2);
  plate(-0.98, 0.98, -0.98, hz - half);
  plate(-0.98, 0.98, hz + half, 0.98);
  plate(-0.98, hx - half, hz - half, hz + half);
  plate(hx + half, 0.98, hz - half, hz + half);
  const grid = painted('dcFloorGrid', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = '#7f8e96';
    c.lineWidth = 3;
    c.strokeRect(2, 2, 124, 124);
    c.fillStyle = '#6f7e86';
    for (const [x, y2] of [[10, 10], [118, 10], [10, 118], [118, 118]]) c.fillRect(x - 2, y2 - 2, 4, 4);
  });
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) {
      const x = -0.62 + i * 0.62;
      const z = -0.62 + j * 0.62;
      if (Math.abs(x - hx) < 0.31 && Math.abs(z - hz) < 0.31) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: grid, transparent: true, depthWrite: false }));
      m.userData.ownGeometry = m.userData.ownMaterial = true;
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y + 0.002, z);
      g.add(m);
    }
  // The void: dark, pipes and bundles painted on, real ones on top, and a pedestal in each corner.
  picture(g, painted('dcVoid', 128, 128, (c) => {
    c.fillStyle = '#0e1216';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#233039';
    c.fillRect(0, 86, 128, 34);
    c.fillStyle = '#10181e';
    for (let i = 0; i < 12; i++) c.fillRect(i * 11, 86, 3, 34);
  }), 0.58, 0.58, hx, 0.008, hz, '#ffffff', 0, -Math.PI / 2);
  part(g, cyl(0.03, 0.03, 0.56, 12), '#1565c0', hx, 0.028, hz - 0.14, { rz: Math.PI / 2, outline: false });
  part(g, cyl(0.022, 0.022, 0.56, 12), '#90caf9', hx, 0.024, hz - 0.03, { rz: Math.PI / 2, outline: false });
  for (const c of ['#ffb300', '#43a047', '#eceff1']) part(g, cyl(0.007, 0.007, 0.56, 6), c, hx, 0.016, hz + 0.1 + (c === '#ffb300' ? 0 : c === '#43a047' ? 0.018 : 0.036), { rz: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.02, 0.05, 8), STEEL, hx + sx * 0.26, 0.026, hz + sz * 0.26, { outline: false });
  // The leak sensor on its rope; a lamp that shows it's been pressed.
  part(g, rbox(0.08, 0.03, 0.05, 0.01), '#fbc02d', FT.sensor[0], FT.sensor[1], FT.sensor[2], { outline: false });
  const sense = ownLit(g, ball(0.009), '#2b3530', FT.sensor[0] - 0.02, FT.sensor[1] + 0.018, FT.sensor[2] + 0.01);
  // The tile that comes up.
  const tile = group(g);
  part(tile, box(0.58, 0.05, 0.58), '#c9d4da', 0, -0.0, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(tile, ball(0.008), '#6f7e86', sx * 0.25, 0.026, sz * 0.25, { outline: false });
  // A floor marker by it, and the tool case.
  label(g, '이중 바닥 점검구 · 들어낸 뒤 안전봉', 0.76, 0.06, 0.18, y + 0.003, 0.84, AMBER, BLACK).rotation.x = -Math.PI / 2;
  const cone = group(g, -0.74, y, 0.72);
  part(cone, cyl(0.02, 0.1, 0.34, 12), '#ff7043', 0, 0.17, 0);
  part(cone, box(0.2, 0.012, 0.2), GRAPHITE, 0, 0.006, 0, { outline: false });
  part(cone, cyl(0.046, 0.058, 0.06, 12), WHITE, 0, 0.2, 0, { outline: false });
  const lift = lifterTool(g);
  const tor = torchTool(g);
  const tools: Partial<Record<DcTool, HeldTool>> = {
    lifter: { tool: lift.root, lead: 'right', grips: LIFTER_GRIPS },
    torch: { tool: tor.root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.015 } } },
  };
  const spots: Record<string, Spot> = { dcLift: standAt(g, 'dcLift', 0, FT.stand) };
  const show = (_now: string | null, N: DcNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(tile, P.tile ?? FT.tile);
    at(lift.root, P.lifter ?? FT.holster);
    lift.cups.forEach((m) => (m.scale.y = 1 - 0.3 * clamp01(n.cup)));
    at(tor.root, P.torch ?? FT.torchHome);
    fade(tor.beam, (n.beam ?? 0) > 0.5 ? 0.3 : 0);
    setLit(sense, (n.sensor ?? 0) > 0.5 ? LED : '#2b3530');
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, hx, 0.2, hz);
}

// =============================================================================================
// 크래시 카트 (dcCrashCart, 1 × 1): a screen and keyboard on wheels.

function crashCart(g: THREE.Group, out: Built) {
  const T = 0.88;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(g, cyl(0.016, 0.016, T - 0.08, 8), GREY_D, sx * 0.34, (T - 0.08) / 2 + 0.07, sz * 0.26, { outline: false });
    part(g, ball(0.038), BLACK, sx * 0.34, 0.04, sz * 0.26, { outline: false });
  }
  part(g, box(0.76, 0.03, 0.6), GREY, 0, 0.2, 0);
  part(g, box(0.76, 0.03, 0.6), GREY, 0, 0.56, 0);
  part(g, rbox(0.78, 0.04, 0.62, 0.01), RACK_L, 0, T, 0);
  // On its lower shelves: a small server, a coil of leads and a box of adapters.
  part(g, rbox(0.46, 0.18, 0.34, 0.015), GRAPHITE, -0.08, 0.3, 0.02);
  ownLit(g, box(0.02, 0.012, 0.002), LED, -0.26, 0.34, 0.192);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 18), new THREE.MeshToonMaterial({ color: '#546e7a' }));
  coil.userData.ownGeometry = coil.userData.ownMaterial = true;
  coil.rotation.x = Math.PI / 2;
  coil.position.set(0.2, 0.6, 0.06);
  g.add(coil);
  part(g, rbox(0.22, 0.1, 0.16, 0.01), '#f9a825', -0.18, 0.63, 0.04);
  label(g, '어댑터', 0.14, 0.04, -0.18, 0.64, 0.122, '#ffffff', BLACK);
  label(g, '크래시 카트 2', 0.32, 0.07, 0, 0.78, 0.31, NAVY, '#ffffff');
  part(g, box(0.76, 0.14, 0.01), GRAPHITE, 0, 0.78, 0.305, { outline: false });
  // Keyboard, touchpad, the lid with its screen.
  part(g, box(0.4, 0.014, 0.17), GRAPHITE, CC.keys[0], T + 0.03, CC.keys[2], { outline: false });
  part(g, box(0.08, 0.004, 0.06), GREY, CC.keys[0] + 0.28, T + 0.024, CC.keys[2], { outline: false });
  const lid = group(g, 0, CC.lidY, -0.16);
  part(lid, box(0.5, 0.018, 0.36), GRAPHITE, 0, 0, 0.18);
  const scr = liveScreen(lid, 0.44, 0.3, 256, 176, 0, -0.011, 0.18, 0, Math.PI / 2);
  // A lead from the side of it to the rack.
  const leadA = limb(g, 0.006, '#ffee58');
  const leadB = limb(g, 0.006, '#ffee58');
  const spots: Record<string, Spot> = { dcCart: standAt(g, 'dcCart', 0, CC.stand) };
  const show = (_now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const open = N ? clamp01(n.lid) : 0;
    lid.rotation.x = -1.35 * open;
    const plug = N ? clamp01(n.plug) : 0;
    const on = plug > 0.5;
    tA.set(CC.port[0], CC.port[1], CC.port[2]);
    tB.set(CC.port[0] + (on ? 0.1 : 0), on ? 0.3 : CC.port[1] - 0.002, on ? -0.2 : CC.port[2]);
    leadA(tA, tB);
    tC.set(tB.x + (on ? 0.02 : 0), on ? 1.02 : tB.y - 0.002, on ? -0.5 : tB.z);
    leadB(tB, tC);
    const log = clamp01(n.log);
    const boot = clamp01(n.boot);
    scr.draw(`${q(n.on, 4)}|${q(log, 12)}|${q(boot, 20)}|${n.fine ?? 0}|${Math.floor(t * 2) % 2}`, (c) => {
      c.fillStyle = (n.on ?? 0) > 0.3 ? '#061018' : '#111518';
      c.fillRect(0, 0, 256, 176);
      if ((n.on ?? 0) <= 0.3) return;
      const lines = ['> 서버 A-07 콘솔 연결', '> 메모리 검사 … 정상', '> 디스크 점검 … 정상', '> 네트워크 재시작', '> 서비스 다시 시작'];
      const shown = Math.floor(log * lines.length + 0.001);
      for (let i = 0; i < Math.min(shown, lines.length); i++) text(c, lines[wrap(i, lines.length)], 10, 20 + i * 24, 15, '#9fe8b6', 'left', false);
      if (boot > 0) {
        c.fillStyle = '#16303c';
        c.fillRect(10, 136, 236, 16);
        c.fillStyle = (n.fine ?? 0) > 0.5 ? LED : AMBER;
        c.fillRect(10, 136, 236 * boot, 16);
        text(c, (n.fine ?? 0) > 0.5 ? '서버가 돌아왔어요' : `재부팅 ${Math.round(boot * 100)}%`, 10, 162, 15, (n.fine ?? 0) > 0.5 ? '#7ee89e' : AMBER_L, 'left', false);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, {}, show);
  out.work = marker(g, CC.keys[0], CC.keys[1], CC.keys[2]);
}

// =============================================================================================
// 항온항습기 (dcCrac, 2 × 1): a cooling cabinet: fans behind a grille, a door over the filters, a panel.

function crac(g: THREE.Group, out: Built) {
  const T = 2.24;
  const F = CR.face;
  part(g, rbox(1.96, T, 0.46, 0.02), PANEL, 0, T / 2, -0.24);
  // The right of the front, solid; the left, an opening the door shuts over.
  part(g, box(0.86, T, 0.48), PANEL, 0.54, T / 2, 0.18);
  part(g, box(1.1, 0.42, 0.48), PANEL, -0.44, 0.21, 0.18);
  part(g, box(1.1, 0.44, 0.48), PANEL, -0.44, T - 0.22, 0.18);
  part(g, box(1.0, T - 0.86, 0.02), '#2b3238', -0.44, T / 2, 0.0, { outline: false });
  label(g, `${FIRM} 항온항습기 C-2`, 0.8, 0.08, 0.3, T - 0.12, F + 0.003, NAVY, '#ffffff');
  // The fans behind their grille, on the solid part; they spin harder when told to.
  const fan = group(g, 0.54, 0.6, F + 0.008);
  part(fan, cyl(0.26, 0.26, 0.01, 24), '#1e2529', 0, 0, -0.006, { rx: Math.PI / 2, outline: false });
  const blades = group(fan, 0, 0, 0.002);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(blades, box(0.08, 0.22, 0.004), '#78909c', Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0, { rz: -a, outline: false });
  }
  for (let i = 0; i < 7; i++) part(g, box(0.56, 0.008, 0.012), GREY_D, 0.54, 0.36 + i * 0.08, F + 0.02, { outline: false });
  // The filters, and the door over them.
  const filterMesh = (color: string, name: string) => {
    const m = group(g);
    m.name = name;
    part(m, box(0.66, 0.5, 0.05), PANEL_D, 0, 0, 0);
    part(m, box(0.6, 0.44, 0.052), color, 0, 0, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(m, box(0.6, 0.006, 0.054), shade(color, 0.86), 0, -0.2 + i * 0.08, 0, { outline: false });
    return m;
  };
  const oldF = filterMesh('#8d8a7c', 'dcOldFilter');
  const newF = filterMesh('#f5f7f8', 'dcNewFilter');
  const door = group(g, CR.doorHinge, 0, F + 0.01);
  part(door, box(1.0, T - 0.86, 0.03), PANEL_D, 0.5, T / 2, 0);
  for (let i = 0; i < 9; i++) part(door, box(0.84, 0.012, 0.012), GREY_D, 0.5, 0.56 + i * 0.13, 0.018, { outline: false });
  part(door, box(0.03, 0.22, 0.05), GRAPHITE, 0.93, 1.08, 0.02);
  label(door, '필터 교체 시 차단', 0.5, 0.06, 0.5, 1.72, 0.018, AMBER, BLACK);
  // The panel.
  part(g, box(0.42, 0.34, 0.02), BLACK, CR.panel[0], CR.panel[1], F + 0.008, { outline: false });
  const lcd = liveScreen(g, 0.38, 0.28, 192, 142, CR.panel[0], CR.panel[1], F + 0.02);
  for (const dx of [-0.06, 0.1]) part(g, cyl(0.022, 0.022, 0.012, 12), dx < 0 ? BLUE : RED, CR.upBtn[0] + dx - 0.06, CR.upBtn[1], F + 0.012, { rx: Math.PI / 2, outline: false });
  // Cold air running along the floor out of its foot.
  const breath = haze(g, new THREE.PlaneGeometry(1.7, 1.1), '#cdefff', 0.08, 0, 0.03, 0.96);
  breath.rotation.x = -Math.PI / 2;
  const spots: Record<string, Spot> = { dcFilter: standAt(g, 'dcFilter', CR.filter[0], CR.stand), dcCracSet: standAt(g, 'dcCracSet', CR.panel[0], CR.stand - 0.1) };
  const show = (now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const filtering = now === 'dcFilter';
    at(oldF, filtering ? P.oldF : null);
    at(newF, filtering ? P.newF : CR.filter);
    door.rotation.y = -1.5 * clamp01(n.door);
    const flow = N ? clamp01(n.flow) : 0.5;
    blades.rotation.z = -t * (3 + 16 * flow);
    fade(breath, 0.05 + 0.13 * flow + 0.02 * Math.sin(t * 1.2));
    const set = now === 'dcCracSet' ? n.set ?? 24 : 22;
    const air = now === 'dcCracSet' ? n.air ?? 22 : 22 + 0.3 * Math.sin(t * 0.3);
    if (now === 'dcCracSet') {
      DC_LIVE.temp = air;
      DC_LIVE.tempAt = t;
    }
    lcd.draw(`${Math.round(set)}|${q(air, 5)}|${n.ok ?? 0}|${filtering ? 1 : 0}`, (c) => {
      c.fillStyle = '#0a1a22';
      c.fillRect(0, 0, 192, 142);
      text(c, '설정', 12, 22, 18, '#9fd6ff');
      text(c, `${Math.round(set)}°C`, 180, 22, 26, AMBER_L, 'right');
      text(c, '바람', 12, 62, 18, '#9fd6ff');
      text(c, `${air.toFixed(1)}°C`, 180, 62, 26, '#7ee89e', 'right');
      c.fillStyle = '#233640';
      c.fillRect(12, 94, 168, 12);
      c.fillStyle = '#4fc3f7';
      c.fillRect(12, 94, 168 * flow, 12);
      text(c, filtering ? '필터 점검 중' : (n.ok ?? 0) > 0.5 ? '설정 완료' : '운전 중', 12, 124, 18, '#7ee89e');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, {}, show);
  out.work = marker(g, CR.panel[0], CR.panel[1], F);
}

// =============================================================================================
// 냉각기 (dcChiller, 3 × 1): low enough not to hide anyone: a tank, two pumps, pipes, a wheel, a beacon.

function chiller(g: THREE.Group, out: Built) {
  const T = 1.34;
  part(g, box(2.9, 0.1, 0.84), GREY_D, 0, 0.05, -0.04);
  part(g, cyl(0.3, 0.3, 1.5, 22), '#90a4ae', -0.2, 0.62, -0.18, { rz: Math.PI / 2 });
  for (const x of [-0.84, -0.2, 0.44]) part(g, cyl(0.31, 0.31, 0.03, 22), GREY_D, x, 0.62, -0.18, { rz: Math.PI / 2, outline: false });
  label(g, '냉수 탱크 CH-2', 0.56, 0.08, -0.2, 0.86, 0.13, NAVY, '#ffffff');
  // The supply and return pipes along the front, frost on the cold one.
  part(g, cyl(0.05, 0.05, 2.7, 14), '#1e88e5', 0, 0.42, CH.face - 0.02, { rz: Math.PI / 2 });
  part(g, cyl(0.05, 0.05, 2.7, 14), '#ef5350', 0, 0.2, CH.face - 0.02, { rz: Math.PI / 2 });
  for (let i = 0; i < 16; i++) part(g, box(0.05, 0.018, 0.02), '#e3f4fb', -1.28 + i * 0.17, 0.47, CH.face + 0.012, { outline: false });
  label(g, '공급 7℃', 0.22, 0.06, 0.3, 0.42, CH.face + 0.035, '#ffffff', '#1565c0');
  label(g, '환수 13℃', 0.24, 0.06, 0.3, 0.2, CH.face + 0.035, '#ffffff', '#c62828');
  // The bypass, standing up from the pipe, with its wheel.
  const W = CH.wheel;
  part(g, cyl(0.04, 0.05, W[1] - 0.42, 12), '#1e88e5', W[0], (W[1] + 0.42) / 2, CH.face - 0.02, { outline: false });
  part(g, box(0.12, 0.12, 0.12), GRAPHITE, W[0], W[1], CH.face - 0.02);
  part(g, cyl(0.012, 0.012, 0.1, 8), CHROME, W[0], W[1], W[2] - 0.04, { rx: Math.PI / 2, outline: false });
  const wheel = group(g, W[0], W[1], W[2]);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CH.wheelR, 0.012, 8, 24), new THREE.MeshToonMaterial({ color: RED }));
  rim.userData.ownGeometry = rim.userData.ownMaterial = true;
  wheel.add(rim);
  for (let i = 0; i < 3; i++) part(wheel, box(CH.wheelR * 2, 0.012, 0.012), RED, 0, 0, 0, { rz: (i / 3) * Math.PI, outline: false });
  label(g, '우회 밸브', 0.26, 0.06, W[0], W[1] - 0.22, CH.face + 0.012, '#ffffff', RED);
  // Two pumps; the second starts only when it's told to.
  const pump = (x: number) => {
    part(g, cyl(0.12, 0.12, 0.22, 16), '#37474f', x, 0.74, 0.12, { rz: Math.PI / 2 });
    part(g, box(0.28, 0.24, 0.28), '#455a64', x, 0.86, -0.16);
    const fan = group(g, x + 0.12, 0.74, 0.12);
    for (let i = 0; i < 3; i++) part(fan, box(0.012, 0.18, 0.03), GREY, 0, 0, 0, { rx: (i / 3) * Math.PI, outline: false });
    return fan;
  };
  const pumpA = pump(0.5);
  const pumpB = pump(0.94);
  const lampA = ownLit(g, ball(0.016), LED, 0.5, 0.92, 0.26);
  const lampB = ownLit(g, ball(0.016), '#3a4a3e', 0.94, 0.92, 0.26);
  // Gauges and the panel.
  const Gz = CH.gauges;
  part(g, box(0.5, 0.26, 0.03), PANEL, Gz[0], Gz[1], CH.face - 0.04);
  const needles = [-0.14, 0, 0.14].map((dx) => dial(g, Gz[0] + dx, Gz[1], CH.face - 0.02, 0.06));
  part(g, rbox(0.56, 0.62, 0.3, 0.02), PANEL, CH.panel[0] - 0.02, 0.96, 0.14);
  const lcd = liveScreen(g, 0.34, 0.2, 192, 112, CH.panel[0], CH.panel[1], 0.3 + 0.005);
  part(g, cyl(0.03, 0.034, 0.018, 14), GREEN, CH.start[0], CH.start[1], 0.3 + 0.01, { rx: Math.PI / 2, outline: false });
  label(g, '예비 펌프', 0.2, 0.05, CH.start[0], CH.start[1] - 0.06, 0.3 + 0.004, '#ffffff', GREEN);
  const ack = ownLit(g, cyl(0.022, 0.024, 0.016, 12), '#7a2020', CH.panel[0] - 0.16, CH.panel[1] - 0.16, 0.3 + 0.01);
  ack.rotation.x = Math.PI / 2;
  // The beacon on its thin pole.
  part(g, cyl(0.012, 0.012, T + 0.1, 6), GREY_D, 1.38, (T + 0.1) / 2, -0.34, { outline: false });
  const beacon = ownLit(g, cyl(0.04, 0.046, 0.08, 14), '#5a1a1a', 1.38, T + 0.14, -0.34);
  const glow = haze(g, new THREE.SphereGeometry(0.22, 12, 10), '#ff3b30', 0, 1.38, T + 0.14, -0.34);
  const tab = tabletTool(g);
  const tools: Partial<Record<DcTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS } };
  const spots: Record<string, Spot> = { dcChillerCheck: standAt(g, 'dcChillerCheck', CH.gauges[0], CH.stand), dcCoolAlarm: standAt(g, 'dcCoolAlarm', 0, CH.stand) };
  const show = (now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const alarm = now === 'dcCoolAlarm';
    at(tab.root, now === 'dcChillerCheck' ? P.tablet : null);
    tab.ticks[0].visible = (n.ticks ?? 0) > 0.5;
    tab.ticks[1].visible = (n.ticks ?? 0) > 1.5;
    wheel.rotation.z = n.turn ?? 0;
    pumpA.rotation.x = t * 14;
    const standby = alarm && (n.standby ?? 0) > 0.5;
    pumpB.rotation.x = standby ? t * 14 : 0;
    setLit(lampA, alarm && !standby ? '#e53935' : LED);
    setLit(lampB, standby ? LED : '#3a4a3e');
    const blinking = alarm && (n.alarm ?? 0) > 0.5 && Math.sin(t * 9) > 0;
    setLit(beacon, blinking ? '#ff3b30' : '#5a1a1a');
    fade(glow, blinking ? 0.32 : 0);
    setLit(ack, alarm && (n.silent ?? 0) < 0.5 ? (Math.sin(t * 9) > 0 ? '#ff5252' : '#7a2020') : '#7a2020');
    const temp = alarm ? n.temp ?? 31 : 7.0 + 0.2 * Math.sin(t * 0.4);
    needles.forEach((m, i) => (m.rotation.z = alarm ? 1.2 - 0.04 * temp - i * 0.15 : 0.5 - 0.3 * i + 0.02 * Math.sin(t * 2 + i)));
    if (alarm) {
      DC_LIVE.temp = temp;
      DC_LIVE.tempAt = t;
      if ((n.alarm ?? 0) > 0.5) DC_LIVE.alarmAt = t;
    }
    lcd.draw(`${alarm ? 1 : 0}|${q(temp, 5)}|${standby ? 1 : 0}|${n.ok ?? 0}|${blinking ? 1 : 0}`, (c) => {
      c.fillStyle = alarm && (n.alarm ?? 0) > 0.5 ? (blinking ? '#5a1414' : '#2a0c0c') : '#0a1a22';
      c.fillRect(0, 0, 192, 112);
      if (alarm) {
        text(c, (n.ok ?? 0) > 0.5 ? '복구됨' : '냉각 장애', 96, 22, 22, (n.ok ?? 0) > 0.5 ? '#7ee89e' : '#ffb4a8', 'center');
        text(c, `통로 ${temp.toFixed(1)}°C`, 96, 60, 24, temp > 26 ? '#ff8a80' : '#7ee89e', 'center');
        text(c, standby ? '예비 펌프 운전' : '1번 펌프 정지', 96, 92, 17, standby ? '#7ee89e' : AMBER_L, 'center');
      } else {
        text(c, `냉수 ${temp.toFixed(1)}°C`, 96, 34, 24, '#7ee89e', 'center');
        text(c, '1번 펌프 운전', 96, 76, 18, '#9fd6ff', 'center');
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, CH.gauges[0], CH.gauges[1], CH.gauges[2]);
}

// =============================================================================================
// 무정전 전원 (dcUps, 3 × 1): three cabinets, a screen with its load and charge, a test button and a key.

function ups(g: THREE.Group, out: Built) {
  const T = 1.96;
  const F = UP.face;
  for (const x of [-0.97, 0, 0.97]) {
    part(g, rbox(0.94, T, 0.8, 0.015), '#37474f', x, T / 2, F - 0.4);
    part(g, box(0.78, 0.5, 0.004), '#2c3940', x, 0.4, F + 0.002, { outline: false });
    for (let i = 0; i < 8; i++) part(g, box(0.72, 0.012, 0.002), '#1c2529', x, 0.2 + i * 0.058, F + 0.005, { outline: false });
    part(g, box(0.018, 0.2, 0.03), CHROME, x + 0.42, 1.0, F + 0.015, { outline: false });
  }
  label(g, `${FIRM} · 무정전 전원 U-1`, 1.2, 0.09, 0, T - 0.1, F + 0.003, '#ffffff', NAVY);
  part(g, box(0.72, 0.42, 0.02), BLACK, UP.screen[0], UP.screen[1], F + 0.006, { outline: false });
  const lcd = liveScreen(g, 0.68, 0.38, 288, 160, UP.screen[0], UP.screen[1], F + 0.018);
  // The buttons: the test, the key.
  part(g, box(0.92, 0.24, 0.02), '#263238', 0, UP.btn[1], F + 0.006, { outline: false });
  const btn = ownLit(g, cyl(0.04, 0.044, 0.02, 14), '#ffa000', UP.btn[0], UP.btn[1], F + 0.02);
  btn.rotation.x = Math.PI / 2;
  label(g, '시험', 0.1, 0.04, UP.btn[0], UP.btn[1] - 0.08, F + 0.018, '#ffffff', BLACK);
  part(g, cyl(0.04, 0.04, 0.016, 16), CHROME, UP.key[0], UP.key[1], F + 0.016, { rx: Math.PI / 2, outline: false });
  const keyG = group(g, UP.key[0], UP.key[1], F + 0.028);
  part(keyG, box(0.016, 0.06, 0.014), AMBER, 0, 0, 0, { outline: false });
  label(g, '발전기 절체', 0.22, 0.04, UP.key[0], UP.key[1] - 0.08, F + 0.018, '#ffffff', BLACK);
  // Thick cables going up to the tray.
  part(g, box(2.82, 0.02, 0.3), GREY, 0, 2.14, F - 0.3, { outline: false });
  for (const [i, c] of ['#c62828', '#212121', '#1565c0'].entries()) {
    part(g, cyl(0.02, 0.02, 0.18, 8), c, -1.1 + i * 0.1, T + 0.09, F - 0.3, { outline: false });
    part(g, cyl(0.02, 0.02, 2.7, 8), c, 0, 2.17, F - 0.4 + i * 0.1, { rz: Math.PI / 2, outline: false });
  }
  const set = tower(g, 1.4, T, F - 0.2);
  // A stripe of hazard paint in front, a lit strip.
  stripLamp(g, 2.6, 0, 2.12, F + 0.16);
  picture(g, painted('dcStripe', 256, 32, (c) => {
    c.fillStyle = AMBER;
    c.fillRect(0, 0, 256, 32);
    c.fillStyle = BLACK;
    for (let i = -2; i < 16; i++) {
      c.beginPath();
      c.moveTo(i * 22, 32);
      c.lineTo(i * 22 + 10, 32);
      c.lineTo(i * 22 + 26, 0);
      c.lineTo(i * 22 + 16, 0);
      c.fill();
    }
  }), 2.8, 0.08, 0, 0.012, F + 0.1, '#ffffff', 0, -Math.PI / 2);
  const tab = tabletTool(g);
  const tools: Partial<Record<DcTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS } };
  const spots: Record<string, Spot> = { dcUpsTest: standAt(g, 'dcUpsTest', 0.1, UP.stand), dataCenter_powerDrill: standAt(g, 'dcDrill', -0.06, UP.stand) };
  const show = (now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(tab.root, now === 'dcUpsTest' ? P.tablet : null);
    tab.ticks[0].visible = (n.ticks ?? 0) > 0.5;
    tab.ticks[1].visible = false;
    keyG.rotation.z = -1.2 * clamp01(n.keyTurn);
    const mode = N ? Math.round(n.mode ?? 0) : 0;
    const load = N ? n.load ?? 0.62 : 0.62 + 0.03 * Math.sin(t * 0.35);
    const charge = N ? clamp01(n.charge ?? 1) : 1;
    const gen = clamp01(n.gen);
    set(mode === 1 ? 1 : 2);
    setLit(btn, now === 'dcUpsTest' && mode === 1 ? '#ffd54f' : '#ffa000');
    if (N) {
      DC_LIVE.load = load;
      DC_LIVE.loadAt = t;
      DC_LIVE.mode = mode;
      DC_LIVE.modeAt = t;
    }
    lcd.draw(`${mode}|${q(load, 40)}|${q(charge, 50)}|${q(gen, 10)}|${n.ok ?? 0}`, (c) => {
      c.fillStyle = '#0a1a22';
      c.fillRect(0, 0, 288, 160);
      const source = mode === 1 ? '축전지로 공급 중' : mode === 2 ? '발전기로 공급 중' : '상용 전원 공급';
      c.fillStyle = mode === 1 ? '#6b4c00' : mode === 2 ? '#0d4a2a' : NAVY;
      c.fillRect(0, 0, 288, 34);
      text(c, source, 144, 17, 20, '#ffffff', 'center');
      text(c, '부하', 14, 62, 18, '#9fd6ff');
      c.fillStyle = '#233640';
      c.fillRect(66, 52, 206, 20);
      c.fillStyle = '#4fc3f7';
      c.fillRect(66, 52, 206 * clamp01(load), 20);
      text(c, '충전', 14, 100, 18, '#9fd6ff');
      c.fillStyle = '#233640';
      c.fillRect(66, 90, 206, 20);
      c.fillStyle = charge > 0.97 ? LED : AMBER;
      c.fillRect(66, 90, 206 * charge, 20);
      text(c, `${Math.round(charge * 100)}%`, 268, 100, 16, '#10202c', 'right');
      if (gen > 0.02) {
        text(c, '발전기', 14, 136, 18, '#9fd6ff');
        c.fillStyle = '#233640';
        c.fillRect(66, 126, 206, 20);
        c.fillStyle = LED;
        c.fillRect(66, 126, 206 * gen, 20);
      } else text(c, (n.ok ?? 0) > 0.5 ? '훈련 완료 · 복귀' : '정상 운전', 144, 136, 18, '#7ee89e', 'center');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, UP.screen[0], UP.screen[1], F);
}

// =============================================================================================
// 축전지 선반 (dcBatteryRack, 3 × 1): rows of black jars on steel, a meter whose lead follows the probe.

function batteryRack(g: THREE.Group, out: Built) {
  const T = 1.74;
  for (const x of [-1.42, -0.48, 0.48, 1.42]) part(g, box(0.05, T, 0.46), GREY, x, T / 2, 0.02);
  const rows = [0.3, 0.72, BT.y];
  for (const y of [...rows, 1.56]) part(g, box(2.86, 0.03, 0.46), GREY, 0, y - 0.15, 0.02);
  const jar = (x: number, y: number, low = false) => {
    part(g, rbox(0.4, 0.2, 0.34, 0.012), low ? '#3a3020' : '#212428', x, y - 0.03, 0.03);
    part(g, box(0.38, 0.012, 0.32), '#3a4047', x, y + 0.075, 0.03, { outline: false });
    part(g, cyl(0.015, 0.015, 0.03, 10), RED, x + 0.05, y, BT.z - 0.09, { outline: false });
    part(g, cyl(0.015, 0.015, 0.03, 10), BLACK, x - 0.05, y, BT.z - 0.09, { outline: false });
    for (const sx of [-1, 1]) rod(g, v3(x + sx * 0.05, y + 0.02, BT.z - 0.09), v3(x + sx * 0.16, y + 0.02, BT.z - 0.09), 0.006, CHROME);
    ownLit(g, box(0.02, 0.012, 0.002), LED, x + 0.14, y - 0.03, BT.z - 0.09 + 0.2);
  };
  for (const y of rows) BT.jars.forEach((x, i) => jar(x, y, y === BT.y && i === 3));
  label(g, '축전지 뱅크 B · 금속 공구 주의', 1.2, 0.08, 0.2, 1.68, 0.255, AMBER, BLACK);
  stripLamp(g, 2.6, 0, 2.1, 0.46);
  for (const x of [-1.2, 1.2]) rod(g, v3(x, T, 0), v3(x, 2.1, 0.44), 0.012, GREY_D);
  // The meter on the top shelf.
  part(g, rbox(0.2, 0.14, 0.1, 0.012), '#fbc02d', BT.meter[0], BT.meter[1], BT.meter[2] - 0.06);
  const lcd = liveScreen(g, 0.14, 0.07, 128, 64, BT.meter[0], BT.meter[1] + 0.02, BT.meter[2] - 0.006);
  part(g, cyl(0.016, 0.016, 0.01, 10), BLACK, BT.meter[0], BT.meter[1] - 0.04, BT.meter[2] - 0.006, { rx: Math.PI / 2, outline: false });
  const lead1 = limb(g, 0.005, RED);
  const lead2 = limb(g, 0.005, RED);
  const pr = probeTool(g);
  const tag = part(g, box(0.1, 0.05, 0.004), AMBER, BT.jars[3] - 0.08, BT.y - 0.03, 0.208, { outline: false });
  const tools: Partial<Record<DcTool, HeldTool>> = { probe: { tool: pr, lead: 'right', grips: PEN() } };
  const spots: Record<string, Spot> = { dcBatt: standAt(g, 'dcBatt', -0.98, BT.stand) };
  const show = (_now: string | null, N: DcNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pr, P.probe ?? BT.home);
    tag.visible = !!N && (n.tag ?? 0) > 0.5;
    const jarI = Math.round(n.jar ?? -1);
    const read = (n.read ?? 0) > 0.5 && jarI >= 0;
    const v = read ? BT.volts[wrap(jarI, BT.volts.length)] : 0;
    const warn = (n.warn ?? 0) > 0.5;
    tA.set(BT.meter[0], BT.meter[1] - 0.04, BT.meter[2]);
    tB.copy(pr.position);
    tB.z += 0.05;
    tC.copy(tA).lerp(tB, 0.5);
    tC.y = Math.min(tA.y, tB.y) - 0.18;
    tC.z = Math.max(tA.z, tB.z) + 0.04;
    lead1(tA, tC);
    lead2(tC, tB);
    lcd.draw(`${read ? v : 'x'}|${warn ? 1 : 0}`, (c) => {
      c.fillStyle = warn ? '#ffcc80' : '#c8e6c9';
      c.fillRect(0, 0, 128, 64);
      text(c, read ? `${v.toFixed(2)} V` : '- - -', 122, 34, 26, BLACK, 'right');
    });
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, BT.y, BT.z);
}

// =============================================================================================
// 관제 데스크 (dcNocDesk, 3 × 1): low, three screens, keyboard and phone; a chair; a second one for whoever's teaching.

function nocDesk(g: THREE.Group, out: Built) {
  const T = ND.top;
  part(g, rbox(2.9, 0.05, 0.86, 0.02), '#37474f', 0, T - 0.025, 0.03);
  for (const x of [-1.34, 1.34]) part(g, box(0.06, T - 0.05, 0.76), '#263238', x, (T - 0.05) / 2, 0.03);
  part(g, box(2.72, 0.42, 0.03), '#263238', 0, 0.42, -0.34);
  // Three screens, not above the eye of someone sat; the chairs.
  const scr = [-0.62, 0, 0.62].map((x) => {
    part(g, cyl(0.02, 0.03, 0.13, 8), GREY_D, x, T + 0.065, -0.14, { outline: false });
    part(g, box(0.14, 0.012, 0.1), GREY_D, x, T + 0.006, -0.14, { outline: false });
    part(g, rbox(0.58, 0.35, 0.03, 0.01), BLACK, x, T + 0.3, -0.13, { ry: -x * 0.18 });
    return liveScreen(g, 0.54, 0.31, 240, 138, x, T + 0.3, -0.11, -x * 0.18, 0);
  });
  chair(g, ND.seat, NAVY);
  chair(g, ND.seat2, '#37474f');
  part(g, box(0.42, 0.016, 0.14), GRAPHITE, ND.keys[0], T + 0.008, ND.keys[2], { outline: false });
  part(g, rbox(0.06, 0.03, 0.09, 0.012), GRAPHITE, ND.mouse[0], T + 0.015, ND.mouse[2], { outline: false });
  // The phone's base, a mug, a shift log.
  part(g, rbox(0.2, 0.05, 0.16, 0.012), GRAPHITE, ND.phone[0], T + 0.026, ND.phone[2] - 0.02);
  part(g, cyl(0.04, 0.036, 0.09, 12), '#ffffff', -0.98, T + 0.046, 0.14);
  part(g, box(0.24, 0.016, 0.3), PAPER, 0.86, T + 0.008, 0.16);
  picture(g, painted('dcShiftLog', 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    text(c, '야간 근무', 48, 14, 14, NAVY, 'center');
    for (let i = 0; i < 6; i++) {
      c.fillStyle = '#cfd8dc';
      c.fillRect(8, 30 + i * 16, 80, 2);
    }
  }), 0.22, 0.28, 0.86, T + 0.018, 0.16, '#ffffff', 0, -Math.PI / 2);
  // A desk lamp: lit, low, for the small hours.
  rod(g, v3(-1.16, T, -0.14), v3(-1.1, T + 0.26, 0.0), 0.009, GREY_D);
  part(g, cyl(0.04, 0.07, 0.07, 12), GREY_D, -1.08, T + 0.26, 0.04);
  ownLit(g, cyl(0.06, 0.06, 0.006, 12), '#fff0c4', -1.08, T + 0.224, 0.04);
  haze(g, new THREE.CircleGeometry(0.28, 18), '#fff0c4', 0.14, -1.08, T + 0.008, 0.04).rotation.x = -Math.PI / 2;
  const hand = handsetTool(g);
  const cord = limb(g, 0.004, GRAPHITE);
  const senior = person(g, '#37474f', '#263238', '#1a1a1a', 0.62, 0.86, Math.PI - 0.5, 'female');
  const tools: Partial<Record<DcTool, HeldTool>> = { phone: { tool: hand, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.017 } } } };
  const spots: Record<string, Spot> = { dcWatch: seatAt(g, 'dcWatch', ND.seat), dcTicket: seatAt(g, 'dcTicket', ND.seat), dataCenter_learnNoc: seatAt(g, 'dcLearn', ND.seat) };
  const point = new THREE.Vector3(-0.08, T + 0.3, -0.06);
  const show = (now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(hand, P.phone ?? ND.phone);
    hand.rotation.set(0, 0, P.phone && N?.tool === 'phone' ? 0 : Math.PI / 2);
    tA.copy(hand.position);
    tB.set(ND.phone[0] - 0.08, T + 0.05, ND.phone[2]);
    cord(tA, tB);
    senior.root.visible = now === 'dataCenter_learnNoc';
    if (senior.root.visible) {
      senior.armR((n.point ?? 0) > 0.5 ? point : null);
      senior.armL(null);
      senior.opts.nod = (n.nods ?? 0) > 0.5 ? 0.25 * Math.sin(t * 6) : 0.14;
      senior.head.rotation.x = senior.opts.nod;
    }
    // Left: live graph that rolls; middle: tickets; right: the hall's floor plan with its amber lamp.
    const tick = Math.floor(t * 2);
    scr[0]?.draw(`${tick}|${n.focus ?? 0}`, (c) => {
      c.fillStyle = '#0a1620';
      c.fillRect(0, 0, 240, 138);
      text(c, (n.focus ?? 0) > 0.5 ? '트래픽 · A줄 확대' : '트래픽', 8, 12, 14, '#9fd6ff');
      c.strokeStyle = '#4fc3f7';
      c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < 40; i++) {
        const v = 0.5 + 0.28 * Math.sin((tick + i) * 0.4) + 0.12 * Math.sin((tick + i) * 1.3);
        const y = 130 - v * 100;
        if (i === 0) c.moveTo(4, y);
        else c.lineTo(4 + i * 6, y);
      }
      c.stroke();
    });
    const typed = clamp01(n.typed);
    const sent = (n.sent ?? 0) > 0.5;
    scr[1]?.draw(`${q(typed, 12)}|${sent ? 1 : 0}|${q(n.note, 8)}|${n.talk ?? 0}`, (c) => {
      c.fillStyle = '#10202c';
      c.fillRect(0, 0, 240, 138);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, 240, 22);
      text(c, (n.talk ?? 0) > 0.5 ? '통화: 현장 담당' : '장애 티켓', 8, 11, 14, '#ffffff');
      ['#2051 디스크 경고', '#2052 포트 불안정', '#2053 온도 경고'].forEach((s, i) => {
        c.fillStyle = i === 0 ? '#1d3a4e' : '#14293a';
        c.fillRect(6, 28 + i * 24, 228, 20);
        text(c, s, 12, 38 + i * 24, 13, '#d7eaf6', 'left', false);
        if (i === 0 && sent) text(c, '완료', 228, 38, 13, '#7ee89e', 'right');
      });
      c.fillStyle = '#d7eaf6';
      c.fillRect(8, 108, 224 * Math.max(typed, clamp01(n.note)), 3);
      c.fillRect(8, 118, 150 * Math.max(0, Math.max(typed, clamp01(n.note)) - 0.4), 3);
    });
    const amberOn = !recent(DC_LIVE.rebuildAt, t) && Math.sin(t * 4) > 0;
    scr[2]?.draw(`${amberOn ? 1 : 0}|${recent(DC_LIVE.alarmAt, t) ? 1 : 0}`, (c) => {
      c.fillStyle = '#0a1620';
      c.fillRect(0, 0, 240, 138);
      text(c, '데이터 홀 평면', 8, 12, 14, '#9fd6ff');
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 6; j++) {
          c.fillStyle = recent(DC_LIVE.alarmAt, t) ? '#7a2020' : '#1f5f3b';
          c.fillRect(20 + i * 52, 28 + j * 17, 36, 13);
        }
      c.fillStyle = amberOn ? AMBER : '#1f5f3b';
      c.fillRect(20, 28 + 3 * 17, 36, 13);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, ND.keys[0], ND.keys[1], ND.keys[2]);
}

// =============================================================================================
// 관제 화면 벽 (dcNocWall, 5 × 1): graphs from the hall; it follows the work.

const RING = 72;
const tempRing = new Float32Array(RING).fill(21.5);
const loadRing = new Float32Array(RING).fill(0.62);
const linkRing = new Float32Array(RING).fill(0.5);
let ringAt = -1;
function nocPaint(c: Ctx2, w: number, h: number, t: number, dotU: number, dotV: number) {
  // One sample a second, whichever way the clock is running.
  const now = Math.floor(t);
  if (now !== ringAt) {
    ringAt = now;
    const i = wrap(now, RING);
    tempRing[i] = recent(DC_LIVE.tempAt, t) ? DC_LIVE.temp : 21.5 + 0.4 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.9);
    loadRing[i] = recent(DC_LIVE.loadAt, t) ? DC_LIVE.load : 0.62 + 0.05 * Math.sin(t * 0.17);
    const base = 0.42 + 0.18 * Math.sin(t * 0.31) + 0.08 * Math.sin(t * 1.1);
    linkRing[i] = recent(DC_LIVE.linkAt, t) ? (DC_LIVE.link ? base + 0.2 : base * 0.7) : base;
  }
  const alarm = recent(DC_LIVE.alarmAt, t);
  c.fillStyle = '#071019';
  c.fillRect(0, 0, w, h);
  const pw = w / 3;
  const ph = h / 2;
  const panel = (i: number, j: number, title: string, tint = '#10202e') => {
    const x = i * pw + 4;
    const y = j * ph + 4;
    c.fillStyle = tint;
    c.fillRect(x, y, pw - 8, ph - 8);
    text(c, title, x + 10, y + 18, 20, '#d7eaf6');
    return { x: x + 10, y: y + 36, w: pw - 28, h: ph - 52 };
  };
  const line = (b: { x: number; y: number; w: number; h: number }, ring: Float32Array, lo: number, hi: number, color: string) => {
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i < RING; i++) {
      const v = ring[wrap(now - RING + 1 + i, RING)];
      const y = b.y + b.h - ((v - lo) / (hi - lo)) * b.h;
      const x = b.x + (i / (RING - 1)) * b.w;
      if (i === 0) c.moveTo(x, THREE.MathUtils.clamp(y, b.y, b.y + b.h));
      else c.lineTo(x, THREE.MathUtils.clamp(y, b.y, b.y + b.h));
    }
    c.stroke();
  };
  // Traffic.
  const a = panel(0, 0, '트래픽');
  line(a, linkRing, 0, 1, '#4fc3f7');
  // The cold aisle's temperature.
  const temp = recent(DC_LIVE.tempAt, t) ? DC_LIVE.temp : tempRing[wrap(now, RING)];
  const b = panel(1, 0, `찬 통로 ${temp.toFixed(1)}°C`, alarm ? '#3a1212' : '#10202e');
  c.strokeStyle = '#ff8a80';
  c.lineWidth = 1;
  c.setLineDash([6, 6]);
  const y27 = b.y + b.h - ((27 - 18) / (34 - 18)) * b.h;
  c.beginPath();
  c.moveTo(b.x, y27);
  c.lineTo(b.x + b.w, y27);
  c.stroke();
  c.setLineDash([]);
  line(b, tempRing, 18, 34, temp > 27 ? '#ff5252' : '#7ee89e');
  // Power.
  const mode = recent(DC_LIVE.modeAt, t) ? DC_LIVE.mode : 0;
  const d = panel(2, 0, `전력 · ${mode === 1 ? '축전지' : mode === 2 ? '발전기' : '상용'}`, mode ? '#33290c' : '#10202e');
  line(d, loadRing, 0, 1, mode ? AMBER : '#ce93d8');
  // The disks.
  const e = panel(0, 1, '디스크 배열');
  const reb = recent(DC_LIVE.rebuildAt, t) ? DC_LIVE.rebuild : -1;
  for (let j = 0; j < 6; j++)
    for (let i = 0; i < 14; i++) {
      const hit = i === 4 && j === 2;
      c.fillStyle = hit ? (reb >= 1 ? LED : reb >= 0 ? (Math.floor(t * 4) % 2 ? '#7dffa0' : '#2f6e40') : Math.floor(t * 2) % 2 ? AMBER : '#6b4c00') : '#2f6e40';
      c.fillRect(e.x + i * ((e.w - 4) / 14), e.y + j * ((e.h - 28) / 6), (e.w - 4) / 14 - 3, (e.h - 28) / 6 - 3);
    }
  text(c, reb >= 1 ? '복구 완료' : reb >= 0 ? `재구성 ${Math.round(clamp01(reb) * 100)}%` : '1개 고장 · 교체 대기', e.x, e.y + e.h - 10, 18, reb >= 1 ? '#7ee89e' : AMBER_L);
  // The alerts.
  const f = panel(1, 1, alarm ? '경보 · 냉각 장애!' : '경보', alarm ? '#5a1414' : '#10202e');
  const lines = alarm ? ['냉수 펌프 1 정지', '찬 통로 온도 상승', '우회 밸브 열기', '예비 펌프 시작'] : ['슬롯 B-2 디스크 경고', '포트 C-14 불안정', '필터 교체 D-3 일'];
  lines.forEach((s, i) => text(c, s, f.x, f.y + 14 + i * 28, 18, alarm ? '#ffcdd2' : '#b7d3e6', 'left', false));
  // The clock and the company's name; nights are long.
  const g = panel(2, 1, FIRM);
  const mins = wrap(t / 3, 480);
  const hh = (22 + Math.floor(mins / 60)) % 24;
  const mm = Math.floor(mins % 60);
  text(c, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, g.x + g.w / 2, g.y + 34, 52, '#7fdbff', 'center');
  text(c, `가동률 99.9${wrap(now / 30, 10)}%`, g.x + g.w / 2, g.y + 88, 22, '#7ee89e', 'center');
  text(c, '야간 근무조', g.x + g.w / 2, g.y + 118, 18, '#9fd6ff', 'center');
  // A laser dot on it.
  if (dotU >= 0) {
    c.fillStyle = '#ff3b30';
    c.beginPath();
    c.arc(w * clamp01(dotU), h * (1 - clamp01(dotV)), pos(7), 0, Math.PI * 2);
    c.fill();
  }
}
function nocWall(g: THREE.Group, out: Built) {
  const W = WL.x1 - WL.x0;
  const H = WL.y1 - WL.y0;
  const mid = onWall(0.5, 0.5);
  part(g, box(W + 0.12, H + 0.12, 0.08), BLACK, mid[0], mid[1], WL.z - 0.05);
  for (const x of [-2.2, 0, 2.2]) part(g, box(0.12, WL.y0, 0.14), GRAPHITE, x, WL.y0 / 2, WL.z - 0.05);
  part(g, box(W + 0.04, 0.05, 0.3), RACK, 0, WL.y0 - 0.04, WL.z + 0.07);
  label(g, `${FIRM} 통합 관제실`, 1.6, 0.11, 0, WL.y1 + 0.13, WL.z - 0.008, NAVY, '#ffffff');
  const screen = liveScreen(g, W, H, 960, 320, mid[0], mid[1], mid[2]);
  stripLamp(g, 4.4, 0, 2.42, WL.z + 0.4);
  // A soft pool of light on the floor below, for the small hours.
  haze(g, new THREE.PlaneGeometry(4.6, 0.9), '#7fdbff', 0.05, 0, 0.012, 0.3).rotation.x = -Math.PI / 2;
  const mate1 = person(g, '#455a64', '#263238', '#2b1b10', -1.72, 0.76, Math.PI / 2 - 0.1, 'male');
  const mate2 = person(g, '#37474f', '#1b2a30', '#5b3a1e', 1.72, 0.78, -Math.PI / 2 + 0.1, 'female');
  const tab = tabletTool(g);
  const las = laserTool(g);
  const beam = limb(g, 0.003, '#ff5252');
  const tools: Partial<Record<DcTool, HeldTool>> = { tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS }, laser: { tool: las, lead: 'right', grips: PEN(0.01) } };
  const spots: Record<string, Spot> = { dcHandover: standAt(g, 'dcHandover', 0.1, WL.stand), dataCenter_leadReview: standAt(g, 'dcLeadReview', 0, WL.stand) };
  const talk = new THREE.Vector3();
  const show = (now: string | null, N: DcNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const dotU = (n.dot ?? -1) >= 0 ? n.dot : (n.ptr ?? 0) > 0 ? n.ptr : -1;
    const dotV = n.dotV ?? 0.56;
    screen.draw(`${Math.floor(t * 2)}|${q(dotU, 30)}|${q(dotV, 30)}`, (c) => nocPaint(c, 960, 320, t, dotU, dotV));
    at(tab.root, now === 'dcHandover' ? P.tablet : null);
    tab.ticks[0].visible = (n.signed ?? 0) > 0.5;
    tab.ticks[1].visible = false;
    at(las, now === 'dataCenter_leadReview' && N?.tool === 'laser' ? P.laser : null);
    const aiming = now === 'dataCenter_leadReview' && (n.dot ?? -1) >= 0;
    if (aiming) {
      const p = onWall(clamp01(dotU), clamp01(dotV));
      tA.copy(las.position);
      tA.z -= 0.066;
      tB.set(p[0], p[1], p[2]);
      beam(tA, tB);
    } else beam(tA.set(0, -1, 0), tB.set(0, -1, 0.001));
    const mates = N ? (n.mate ?? 0) : 0;
    mate1.root.visible = mates >= 1;
    mate2.root.visible = mates >= 2;
    const says = (n.says ?? 0) > 0.5;
    const nods = (n.nods ?? 0) > 0.5;
    for (const [i, F] of [mate1, mate2].entries()) {
      F.opts.nod = nods ? 0.14 + 0.16 * Math.sin(t * 6 + i) : 0.05;
      F.head.rotation.x = F.opts.nod;
      talk.set(i === 0 ? -1.4 : 1.4, 1.34 + 0.05 * Math.sin(t * 4), 0.86);
      F.armR(i === 0 && says ? talk : null);
      F.armL(i === 1 && says ? talk : null);
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, mid[0], mid[1], mid[2] + 0.1);
}

// =============================================================================================
// 출입 통제문 (dcBadgeDoor, 2 × 1): a glass door in a steel screen, a card reader beside it.

function badgeDoor(g: THREE.Group, out: Built) {
  const T = 2.18;
  const dz = 0.02;
  part(g, box(1.98, 0.14, 0.14), RACK_L, 0, T - 0.07, dz);
  for (const x of [-0.92, -0.62, 0.1, 0.94]) part(g, box(0.06, T, 0.12), RACK_L, x, T / 2, dz);
  part(g, box(0.76, 0.86, 0.04), PANEL, 0.52, 0.43, dz);
  glass(g, 0.76, T - 1.0, 0.52, 0.86 + (T - 1.0) / 2, dz, 0, 0.2);
  glass(g, 0.26, T - 0.14, -0.77, (T - 0.14) / 2, dz, 0, 0.2);
  label(g, '보안 구역 · 출입증 없이 들어올 수 없어요', 0.9, 0.08, -0.1, T - 0.07, dz + 0.074, '#ffffff', NAVY);
  // The leaf, hinged on the right of the opening; it swings out.
  const hinge = group(g, 0.06, 0, dz);
  part(hinge, box(0.62, 0.05, 0.03), STEEL, -0.32, 0.05, 0, { outline: false });
  part(hinge, box(0.62, 0.05, 0.03), STEEL, -0.32, T - 0.18, 0, { outline: false });
  part(hinge, box(0.03, T - 0.2, 0.03), STEEL, -0.62, (T - 0.14) / 2, 0, { outline: false });
  glass(hinge, 0.58, T - 0.26, -0.32, (T - 0.14) / 2, 0, 0, 0.16);
  part(hinge, box(0.02, 0.3, 0.05), GRAPHITE, -0.56, 1.04, 0.03);
  // The reader.
  const Rd = BD.reader;
  part(g, rbox(0.12, 0.18, 0.03, 0.01), BLACK, Rd[0], Rd[1], Rd[2] - 0.08);
  const lamp = ownLit(g, box(0.07, 0.012, 0.003), '#a12d2d', Rd[0], Rd[1] + 0.07, Rd[2] - 0.063);
  label(g, '출입증', 0.08, 0.03, Rd[0], Rd[1] - 0.02, Rd[2] - 0.063, '#ffffff', GRAPHITE);
  ownLit(g, box(0.12, 0.012, 0.05), ICE, -0.3, T - 0.02, dz + 0.1);
  const card = badgeTool(g);
  const tools: Partial<Record<DcTool, HeldTool>> = { badge: { tool: card, lead: 'right', grips: { right: { at: v3(0, -0.02, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } } } };
  const spots: Record<string, Spot> = { dcBadge: standAt(g, 'dcBadge', Rd[0] - 0.22, BD.stand) };
  const show = (_now: string | null, N: DcNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(card, P.badge ?? null);
    hinge.rotation.y = 1.4 * clamp01(n.door);
    setLit(lamp, (n.ok ?? 0) > 0.5 ? LED : '#a12d2d');
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, Rd[0], Rd[1], Rd[2]);
}

// =============================================================================================
// Set dressing.

/** Spare parts on open shelves: boxes of disks, coils, labelled bins; with a lamp over it. */
function spareShelf(g: THREE.Group) {
  const T = 1.86;
  for (const x of [-1.42, 0, 1.42]) part(g, box(0.05, T, 0.5), GREY, x, T / 2, 0);
  const rows = [0.32, 0.8, 1.28, 1.8];
  for (const y of rows) part(g, box(2.88, 0.03, 0.5), GREY, 0, y, 0);
  const r = seeded(37);
  const NAMES = ['디스크 12TB', '메모리', '전원 모듈', '팬', '케이블 3m', '광 모듈'];
  rows.slice(0, 3).forEach((y, j) => {
    for (let i = 0; i < 6; i++) {
      const x = -1.14 + i * 0.46;
      const c = ['#90a4ae', '#d7ccc8', '#bcaaa4'][Math.floor(r() * 3)];
      if (r() < 0.2) continue;
      part(g, rbox(0.38, 0.28, 0.36, 0.01), c, x, y + 0.155, 0.02);
      label(g, NAMES[wrap(i + j * 2, NAMES.length)], 0.3, 0.07, x, y + 0.16, 0.204, '#ffffff', BLACK);
    }
  });
  label(g, '예비 부품 · 쓴 만큼 적어 주세요', 1.4, 0.09, 0, T + 0.06, 0.2, NAVY, '#ffffff');
  stripLamp(g, 2.6, 0, 2.1, 0.34);
  for (const x of [-1.2, 1.2]) rod(g, v3(x, T, 0), v3(x, 2.1, 0.32), 0.012, GREY_D);
}
/** The room's extinguishing gas: a bank of red cylinders chained to the wall. */
function gasBank(g: THREE.Group) {
  for (const [i, x] of [-0.24, 0.24].entries()) {
    part(g, cyl(0.17, 0.17, 1.24, 18), '#c62828', x, 0.68, -0.08);
    part(g, ball(0.17), '#c62828', x, 1.3, -0.08);
    part(g, cyl(0.035, 0.035, 0.1, 10), CHROME, x, 1.48, -0.08, { outline: false });
    label(g, `소화 가스 ${i + 1}`, 0.22, 0.07, x, 0.7, 0.092, '#ffffff', RED);
  }
  part(g, box(0.86, 0.02, 0.02), GREY_D, 0, 1.06, 0.1, { outline: false });
  rod(g, v3(-0.24, 1.53, -0.08), v3(0.24, 1.53, -0.08), 0.012, CHROME);
}
function siteSign(g: THREE.Group) {
  part(g, box(0.82, 1.82, 0.05), NAVY, 0, 0.98, -0.38);
  picture(g, painted('dcSign', 340, 720, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 340, 720);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 340, 96);
    text(c, FIRM, 170, 50, 36, '#ffffff', 'center');
    text(c, '데이터센터 안내', 170, 132, 28, NAVY, 'center');
    ['① 출입증을 꼭 차요', '② 찬 통로·뜨거운 통로', '③ 음식물은 밖에', '④ 바닥 타일 들 땐 표시', '⑤ 경보가 울리면 관제실'].forEach((s, i) => text(c, s, 18, 200 + i * 66, 24, BLACK));
    c.fillStyle = '#4fc3f7';
    c.fillRect(0, 590, 340, 130);
    text(c, '24시간 365일', 170, 630, 30, BLACK, 'center');
    text(c, '꺼지지 않아요', 170, 676, 30, BLACK, 'center');
  }), 0.78, 1.72, 0, 0.98, -0.35);
  part(g, cyl(0.26, 0.28, 0.03, 18), GREY_D, 0, 0.015, -0.36);
}

export const BUILDERS: Record<string, Builder> = {
  dcServerRack(g, _W, _D, _c, _def, _ctx, out) {
    serverRack(g, out);
  },
  dcDiskRack(g, _W, _D, _c, _def, _ctx, out) {
    diskRack(g, out);
  },
  dcPatchFrame(g, _W, _D, _c, _def, _ctx, out) {
    patchFrame(g, out);
  },
  dcFloorTile(g, _W, _D, _c, _def, _ctx, out) {
    floorTile(g, out);
  },
  dcCrashCart(g, _W, _D, _c, _def, _ctx, out) {
    crashCart(g, out);
  },
  dcCrac(g, _W, _D, _c, _def, _ctx, out) {
    crac(g, out);
  },
  dcChiller(g, _W, _D, _c, _def, _ctx, out) {
    chiller(g, out);
  },
  dcUps(g, _W, _D, _c, _def, _ctx, out) {
    ups(g, out);
  },
  dcBatteryRack(g, _W, _D, _c, _def, _ctx, out) {
    batteryRack(g, out);
  },
  dcNocDesk(g, _W, _D, _c, _def, _ctx, out) {
    nocDesk(g, out);
  },
  dcNocWall(g, _W, _D, _c, _def, _ctx, out) {
    nocWall(g, out);
  },
  dcBadgeDoor(g, _W, _D, _c, _def, _ctx, out) {
    badgeDoor(g, out);
  },
  dcSpareShelf(g) {
    spareShelf(g);
  },
  dcGasBank(g) {
    gasBank(g);
  },
  dcSiteSign(g) {
    siteSign(g);
  },
  /** The security desk by the man-trap, where a visitor signs in and leaves a pass (2026-11-05, the layout audit; frontDesk.ts). */
  dcSecurityDesk(g, W, D) {
    frontDesk(g, W, D, { name: '보안 데스크', body: NAVY, top: PANEL, fg: '#ffffff', bg: NAVY });
  },
  /** The hall's number on its back wall: one hall of many (2026-11-05, the layout audit). */
  dcHallSign(g, _W, D) {
    const zb = -D / 2 + 0.03;
    part(g, box(0.86, 0.5, 0.03), NAVY, 0, 2.05, zb);
    label(g, 'DATA HALL 3', 0.76, 0.16, 0, 2.17, zb + 0.017, NAVY, '#ffffff');
    label(g, '데이터 홀 3 · A~D열', 0.76, 0.1, 0, 1.97, zb + 0.017, NAVY, ICE);
    label(g, '전산실 · 가스 소화 구역', 0.6, 0.06, 0, 1.86, zb + 0.017, RED, '#ffffff');
  },
  /**
   * The emergency generator in the yard (2026-11-05, the layout audit): a diesel set in its weatherproof container on the fuel tank
   * it stands on, louvres down its sides, its doors, the exhaust stack and silencer on its roof, its name plate and warning sign.
   */
  dcGenerator(g, W, D) {
    const OLIVE = '#4e5d52';
    part(g, box(W - 0.1, 0.3, D - 0.1), GREY_D, 0, 0.15, 0);
    label(g, '연료 탱크 · 경유 20,000L', 0.9, 0.08, 0, 0.17, D / 2 - 0.045, GREY_D, AMBER_L);
    part(g, rbox(W - 0.2, 2.2, D - 0.2, 0.03), OLIVE, 0, 1.4, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) part(g, box(0.02, 0.9, 0.5), shade(OLIVE, 0.8), s * (W / 2 - 0.095), 1.5, -D / 2 + 0.55 + i * 0.66, { outline: false });
    part(g, box(0.9, 1.9, 0.02), shade(OLIVE, 0.9), 0, 1.3, D / 2 - 0.095);
    part(g, box(0.02, 1.8, 0.03), GREY_D, 0, 1.3, D / 2 - 0.08, { outline: false });
    label(g, '비상 발전기 2,000kW', 0.8, 0.12, 0, 2.2, D / 2 - 0.08, OLIVE, '#ffffff');
    label(g, '고압 · 관계자 외 접근 금지', 0.7, 0.08, 0, 2.05, D / 2 - 0.08, AMBER, '#212121');
    // The exhaust silencer lying on the roof and its stack.
    part(g, cyl(0.22, 0.22, 1.0, 16), GREY, 0.3, 2.72, -D / 2 + 0.8, { rz: Math.PI / 2 });
    part(g, cyl(0.1, 0.1, 0.9, 12), GREY, 0.75, 2.95, -D / 2 + 0.8);
    part(g, box(1.2, 0.16, 1.2), shade(OLIVE, 0.85), -0.1, 2.58, D / 2 - 1.0);
  },
  /**
   * The cooling tower beside it (2026-11-05, the layout audit): a square tower of grey panels, louvres round its foot where the air
   * comes in, the fan's stack on top with its blades turning, the pipe down to the chiller.
   */
  dcCoolingTower(g, W, D, _c, _def, _ctx, out) {
    const h = 2.2;
    part(g, box(W - 0.15, 0.25, D - 0.15), GREY_D, 0, 0.125, 0);
    part(g, rbox(W - 0.2, h, D - 0.2, 0.03), PANEL, 0, 0.25 + h / 2, 0);
    for (let i = 0; i < 4; i++) {
      const y = 0.45 + i * 0.16;
      for (const sz of [-1, 1]) part(g, box(W - 0.3, 0.05, 0.02), PANEL_D, 0, y, sz * (D / 2 - 0.095), { outline: false });
      for (const sx of [-1, 1]) part(g, box(0.02, 0.05, D - 0.3), PANEL_D, sx * (W / 2 - 0.095), y, 0, { outline: false });
    }
    part(g, cyl(0.7, 0.75, 0.5, 24), PANEL_D, 0, 0.25 + h + 0.25, 0);
    const fan = new THREE.Group();
    fan.position.set(0, 0.25 + h + 0.46, 0);
    g.add(fan);
    for (let i = 0; i < 4; i++) part(fan, box(1.2, 0.02, 0.18), GRAPHITE, 0, 0, 0, { ry: (i * Math.PI) / 4, outline: false });
    label(g, '냉각탑 CT-2', 0.5, 0.1, 0, 1.8, D / 2 - 0.09, PANEL, NAVY);
    part(g, cyl(0.08, 0.08, 1.2, 12), BLUE, -W / 2 + 0.25, 0.6, D / 2 - 0.02);
    out.animate = (t: number) => {
      fan.rotation.y = t * 3;
    };
  },
  /**
   * The fence round the plant yard (2026-11-05, the layout audit), drawn from its corner tile by the street (20, 14): steel mesh
   * panels between posts along the front, the far side and the back, the gate run back open by the building, its sign.
   */
  dcYardFence(g) {
    const H = 2.0;
    const run = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len));
      const ry = -Math.atan2(z1 - z0, x1 - x0);
      for (let i = 0; i <= n; i++) part(g, box(0.06, H, 0.06), GREY_D, x0 + ((x1 - x0) * i) / n, H / 2, z0 + ((z1 - z0) * i) / n);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      part(g, box(len, 0.04, 0.04), GREY_D, cx, H - 0.05, cz, { ry, outline: false });
      part(g, box(len, 0.04, 0.04), GREY_D, cx, 0.1, cz, { ry, outline: false });
      glass(g, len, H - 0.2, cx, H / 2, cz, ry, 0.35);
    };
    // The front, from past the gate to the corner; the far side; the back.
    run(1.55, 0.45, 4.45, 0.45);
    run(4.45, 0.45, 4.45, -13.45);
    run(4.45, -13.45, -0.45, -13.45);
    // The gate's posts, its leaf slid back along the front.
    for (const x of [-0.45, 1.55]) part(g, box(0.08, H + 0.1, 0.08), GREY_D, x, (H + 0.1) / 2, 0.45);
    part(g, box(1.9, 0.05, 0.05), AMBER, 2.55, H - 0.1, 0.55, { outline: false });
    part(g, box(1.9, 0.05, 0.05), AMBER, 2.55, 0.15, 0.55, { outline: false });
    label(g, '보안 구역 · 관계자 외 출입 금지', 0.9, 0.12, 2.9, 1.3, 0.6, RED, '#ffffff');
  },
};
