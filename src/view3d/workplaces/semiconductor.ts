import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { CH, CT, ET, FR, GN, LT, MS, RB, WB, YB, fbNow, fbPhase, onChart } from './semiconductorMotion';
import type { FbMotion, FbNow, FbTool } from './semiconductorMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 반도체 팹 drawn as itself (2026-11-01, a new career at the user's request), the line of a made-up company, 별빛반도체.
 * A gowning room with a rail of bunny suits and a long mirror, and an air shower that is the only way in; through it a white cleanroom where an overhead rail
 * carries wafer boxes along, a robot passes wafers between cassette and aligner in its clear case, plasma glows pink and blue
 * in a row of chambers, and a seated engineer goes over a wafer map at a microscope; a yellow-lit photo bay with a scanner whose
 * shots step across the very wafer you loaded; a chemical and gas room; and a board where the week's yield is argued over.
 *
 * Whoever is in the clean zone is in the suit, whatever their body (cleanSuit.ts, game/cleanroom.ts); the suits on the rail are
 * what they're taken from, and the one drawn person in there wears it too. Everything that moves follows semiconductorMotion.ts.
 * All names are made up.
 */

const FAB = '별빛반도체';
const WHITE = '#f4f6f7';
const PANEL = '#e4e8ea';
const PANEL_D = '#c6ced3';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const NAVY = '#1f2d5c';
const AMBER = '#ffb300';
const AMBER_L = '#ffe08a';
const RED = '#e53935';
const GREEN = '#43a047';
const TEAL = '#00897b';
const BLUE = '#2f6fd0';
const PAPER = '#fbfaf6';
const SKIN = '#f1c9a5';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
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
function standAt(g: THREE.Object3D, motion: FbMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: FbMotion, seat: V): Spot {
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
/**
 * Every frame: which use is going on and where its script has got to. What the script says is in the hand goes in the hand
 * (handTool.ts); `tools` are the ways each is held.
 */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<FbTool, HeldTool>>, show: (now: string | null, N: FbNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? fbNow(sp.motion as FbMotion, t, fbPhase(g.getWorldPosition(tmp)), H) : null;
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
  return (which: number) => lamps.forEach((m, i) => setLit(m, i === which ? [RED, AMBER, '#76ff8a'][i] : shade([RED, AMBER, GREEN][i], 0.45)));
}

// The wafer: a disc whose patterned top catches the light, its dies in rows and its flat cut.
const waferPaint = () =>
  painted('fbWafer', 128, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(0, '#7f8fb8');
    g.addColorStop(0.35, '#c6a5d6');
    g.addColorStop(0.6, '#8fd0d6');
    g.addColorStop(1, '#a9b6e0');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(30,30,70,0.45)';
    c.lineWidth = 1;
    for (let i = 0; i <= 128; i += 12) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 128);
      c.moveTo(0, i);
      c.lineTo(128, i);
      c.stroke();
    }
  });
function waferMesh(g: THREE.Object3D, r = 0.12): THREE.Group {
  const w = group(g);
  part(w, cyl(r, r, 0.006, 32), '#9aa5b5', 0, 0.003, 0, { outline: false });
  const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.985, 32), new THREE.MeshBasicMaterial({ map: waferPaint() }));
  top.userData.ownGeometry = top.userData.ownMaterial = true;
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.0065;
  w.add(top);
  return w;
}
function filmDisc(g: THREE.Object3D, r: number, y: number): THREE.Mesh {
  const m = haze(g, new THREE.CircleGeometry(r, 32), '#c0392b', 0, 0, y, 0);
  m.rotation.x = -Math.PI / 2;
  return m;
}
/** The wafer box: a clear-fronted carrier with its handle on top. Origin at the middle of its foot. */
function foupMesh(g: THREE.Object3D, color = '#546e7a'): { root: THREE.Group; door: THREE.Mesh } {
  const root = group(g);
  part(root, rbox(0.34, 0.3, 0.34, 0.04), color, 0, 0.17, 0);
  part(root, box(0.28, 0.02, 0.28), GRAPHITE, 0, 0.01, 0, { outline: false });
  part(root, rbox(0.16, 0.03, 0.12, 0.012), GRAPHITE, 0, 0.335, 0);
  const door = part(root, box(0.3, 0.26, 0.018), '#b0bec5', 0, 0.17, 0.176);
  for (let i = 0; i < 3; i++) part(root, box(0.22, 0.004, 0.002), GREY_D, 0, 0.11 + i * 0.06, 0.186, { outline: false });
  label(root, '로트 7A', 0.13, 0.05, 0.08, 0.26, 0.187, '#ffffff', BLACK);
  return { root, door };
}
/** A bunny suit on its hanger, the hook at the origin. */
function suitMesh(g: THREE.Object3D, color = WHITE): THREE.Group {
  const s = group(g);
  rod(s, v3(0, 0, 0), v3(0, -0.05, 0), 0.004, GREY_D);
  rod(s, v3(-0.17, -0.09, 0), v3(0.17, -0.09, 0), 0.008, GREY_D);
  part(s, rbox(0.36, 0.56, 0.08, 0.04), color, 0, -0.38, 0);
  part(s, rbox(0.34, 0.44, 0.07, 0.03), color, 0, -0.84, 0);
  part(s, box(0.012, 0.86, 0.002), TEAL, 0, -0.53, 0.042, { outline: false });
  part(s, box(0.002, 0.3, 0.002), GREY, 0, -0.96, 0.04, { outline: false });
  part(s, rbox(0.17, 0.15, 0.05, 0.04), shade(color, 0.96), 0, -0.14, -0.05);
  for (const sx of [-1, 1]) {
    rod(s, v3(sx * 0.18, -0.15, 0), v3(sx * 0.24, -0.66, 0.01), 0.04, color);
    rod(s, v3(sx * 0.09, -1.04, 0), v3(sx * 0.1, -1.2, 0), 0.05, shade(color, 0.96));
  }
  label(s, FAB, 0.13, 0.03, 0.085, -0.2, 0.042, NAVY, '#ffffff');
  return s;
}
/** A hood and mask: a white shell open at the eyes, its origin in the middle of the head. */
function hoodMesh(g: THREE.Object3D, r = 0.135): { root: THREE.Group; mask: THREE.Mesh } {
  const root = group(g);
  const mat = () => new THREE.MeshToonMaterial({ color: WHITE, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16, Math.PI / 2 + 0.72, Math.PI * 2 - 1.44), mat());
  shell.userData.ownGeometry = shell.userData.ownMaterial = true;
  root.add(shell);
  const brow = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 6, Math.PI / 2 - 0.74, 1.48, 0, 1.15), mat());
  brow.userData.ownGeometry = brow.userData.ownMaterial = true;
  root.add(brow);
  part(root, cyl(r * 0.78, r * 1.06, 0.13, 16), WHITE, 0, -r - 0.03, -0.012, { outline: false });
  const mask = new THREE.Mesh(new THREE.SphereGeometry(r * 0.99, 18, 8, Math.PI / 2 - 0.8, 1.6, 1.62, 0.92), new THREE.MeshToonMaterial({ color: '#cfe3ee', side: THREE.DoubleSide }));
  mask.userData.ownGeometry = mask.userData.ownMaterial = true;
  root.add(mask);
  return { root, mask };
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

function wandTool(g: THREE.Object3D): { root: THREE.Group; wafer: THREE.Group; film: THREE.Mesh } {
  const root = group(g);
  root.name = 'fbWand';
  part(root, cyl(0.012, 0.014, 0.14, 10), GRAPHITE, 0, 0, 0.04, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.007, 0.007, 0.13, 8), CHROME, 0, -0.002, -0.09, { rx: Math.PI / 2, outline: false });
  part(root, rbox(0.05, 0.006, 0.06, 0.002), '#ece6d8', 0, -0.006, -0.17, { outline: false });
  rod(root, v3(0, 0, 0.11), v3(0.02, -0.04, 0.2), 0.004, '#90a4ae');
  ownLit(root, box(0.008, 0.006, 0.012), '#7ee89e', 0, 0.015, 0.03);
  const wafer = waferMesh(root, 0.1);
  wafer.position.set(0, -0.012, -CT.reach);
  const film = filmDisc(wafer, 0.097, 0.0072);
  return { root, wafer, film };
}
function scannerTool(g: THREE.Object3D): { root: THREE.Group; beam: THREE.Mesh } {
  const root = group(g);
  root.name = 'fbScanner';
  part(root, cyl(0.016, 0.018, 0.1, 10), GRAPHITE, 0, 0, 0, { rx: 0.25, outline: false });
  part(root, rbox(0.05, 0.05, 0.15, 0.012), '#37474f', 0, 0.065, -0.035, { outline: false });
  part(root, box(0.012, 0.02, 0.014), AMBER, 0, 0.03, -0.018, { outline: false });
  ownLit(root, box(0.03, 0.022, 0.002), '#ff8a80', 0, 0.065, -0.111);
  const beam = haze(root, new THREE.PlaneGeometry(0.008, 0.26), '#ff3b30', 0.75, 0, 0.055, -0.24);
  beam.rotation.x = -Math.PI / 2 + 0.1;
  return { root, beam };
}
function pendantTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fbPendant';
  const tilt = group(root);
  tilt.rotation.x = -0.72;
  part(tilt, rbox(0.21, 0.16, 0.03, 0.012), '#37474f', 0, 0, 0, { outline: false });
  for (const sx of [-1, 1]) part(tilt, cyl(0.017, 0.017, 0.12, 10), GRAPHITE, sx * 0.118, 0, 0, { outline: false });
  const screen = liveScreen(tilt, 0.14, 0.09, 128, 82, 0, 0.02, 0.017);
  ownLit(tilt, cyl(0.012, 0.012, 0.01, 12), RED, 0.085, 0.058, 0.018).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) part(tilt, box(0.02, 0.012, 0.004), GREY, -0.05 + i * 0.033, -0.055, 0.016, { outline: false });
  return { root, screen };
}
function driverTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fbDriver';
  part(root, cyl(0.016, 0.014, 0.1, 10), '#c62828', 0, 0.01, 0, { outline: false });
  part(root, cyl(0.004, 0.004, 0.1, 8), CHROME, 0, -0.09, 0, { outline: false });
  return root;
}
function swabTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fbSwab';
  part(root, cyl(0.014, 0.014, 0.12, 10), '#e0e0e0', 0, 0, 0.0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.007, 0.007, 0.2, 8), '#eeeeee', 0, 0, -0.16, { rx: Math.PI / 2, outline: false });
  part(root, rbox(0.06, 0.05, 0.05, 0.015), '#f8f8f8', 0, 0, -0.28, { outline: false });
  return root;
}
function tongsTool(g: THREE.Object3D, wafers: number): THREE.Group {
  const root = group(g);
  root.name = 'fbTongs';
  part(root, cyl(0.014, 0.014, 0.12, 10), '#37474f', 0, 0, 0, { outline: false });
  part(root, cyl(0.007, 0.007, 0.12, 8), CHROME, 0, -0.1, 0, { outline: false });
  const cas = group(root, 0, -0.24, 0);
  part(cas, box(0.3, 0.015, 0.2), '#d8dee2', 0, 0.075, 0, { outline: false });
  part(cas, box(0.3, 0.015, 0.2), '#d8dee2', 0, -0.075, 0, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(cas, box(0.012, 0.15, 0.012), '#d8dee2', sx * 0.14, 0, sz * 0.09, { outline: false });
  for (let i = 0; i < wafers; i++) {
    const w = waferMesh(cas, 0.075);
    w.rotation.x = Math.PI / 2;
    w.position.set(-0.11 + (i * 0.22) / Math.max(1, wafers - 1), 0, 0);
    w.rotation.z = Math.PI / 2;
  }
  return root;
}
function markerTool(g: THREE.Object3D, color: string) {
  const root = group(g);
  root.name = 'fbMarker';
  part(root, cyl(0.011, 0.011, 0.13, 10), color, 0, 0, 0.0, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.011, 0.005, 0.02, 10), color, 0, 0, -0.075, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.004, 0.002, 0.024, 6), BLACK, 0, 0, -0.098, { rx: Math.PI / 2, outline: false });
  return root;
}
function clipTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fbClip';
  const tilt = group(root);
  tilt.rotation.x = -0.55;
  part(tilt, box(0.2, 0.28, 0.008), '#8a6242', 0, 0, 0, { outline: false });
  part(tilt, box(0.17, 0.23, 0.002), PAPER, 0, -0.015, 0.006, { outline: false });
  part(tilt, box(0.07, 0.02, 0.012), CHROME, 0, 0.125, 0.008, { outline: false });
  for (let i = 0; i < 4; i++) part(tilt, box(0.11, 0.004, 0.001), GREY_D, -0.02, 0.06 - i * 0.05, 0.0075, { outline: false });
  const ticks = [0, 1].map((i) => part(tilt, box(0.02, 0.016, 0.002), GREEN, 0.06, 0.06 - i * 0.05, 0.008, { outline: false }));
  return { root, ticks };
}
const penGrip = (axis: THREE.Vector3): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis, shape: 'pen', radius: 0.012 } });

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come. The hood and mask go on after, so they stay on the head.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender?: 'female' | 'male', hooded = false): Fig {
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
  // In the zone: a VRoid body takes the suit itself; the drawn figure the hood on its head, which goes with the rest when the body comes.
  const hood = hooded ? hoodMesh(head, 0.128).root : null;
  const opts: FigureOptions = { gender, ...(hood ? { suit: true, hide: [hood] } : {}) };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}

// =============================================================================================
// 방진복 갱의대 (fbGownBench, 2 × 1): a rail of bunny suits, a shelf of hoods and a long mirror.

function gownBench(g: THREE.Group, out: Built) {
  for (const x of [-0.92, 0.46]) {
    part(g, box(0.04, 1.86, 0.04), PANEL_D, x, 0.93, -0.3);
    part(g, box(0.04, 1.86, 0.04), PANEL_D, x, 0.93, 0.02);
    part(g, box(0.05, 0.03, 0.4), PANEL_D, x, 1.84, -0.14);
  }
  part(g, box(1.46, 0.04, 0.04), STEEL, -0.23, GN.rail, GN.suitZ, { outline: false });
  part(g, box(1.46, 0.02, 0.36), PANEL, -0.23, 1.88, -0.14);
  label(g, '방진복 · 사이즈 순으로 거세요', 0.78, 0.09, -0.23, 1.8, 0.04, NAVY, '#ffffff');
  // Hung suits; the one in the middle is the one taken down.
  [-0.74, -0.5, 0.0, 0.22].forEach((x) => suitMesh(g).position.set(x, GN.rail, GN.suitZ));
  const taken = suitMesh(g);
  // Boots under the rail.
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) part(g, rbox(0.1, 0.1, 0.22, 0.04), '#eceff1', -0.7 + i * 0.32 + s * 0.06, 0.06, -0.14);
  // The hood shelf, at the right, a clean hood and mask out on it.
  part(g, box(0.52, 1.0, 0.44), PANEL, 0.72, 0.5, -0.12);
  part(g, box(0.5, 0.03, 0.42), WHITE, 0.72, 1.02, -0.12);
  label(g, '후드 · 마스크', 0.34, 0.08, 0.72, 0.84, 0.105, TEAL, '#ffffff');
  for (let i = 0; i < 3; i++) part(g, box(0.46, 0.008, 0.002), PANEL_D, 0.72, 0.2 + i * 0.2, 0.102, { outline: false });
  part(g, rbox(0.14, 0.08, 0.14, 0.02), '#cfe3ee', 0.86, 1.08, -0.2);
  part(g, rbox(0.18, 0.05, 0.12, 0.012), '#f8f8f8', 0.58, 1.06, -0.26);
  part(g, cyl(0.03, 0.03, 0.15, 10), '#bbdefb', 0.9, 1.11, 0.02);
  hoodMesh(g).root.position.set(GN.hood[0], GN.hood[1] + 0.1, GN.hood[2]);
  // A long mirror at the far left, turned to whoever's dressing.
  const mirrorG = group(g, GN.mirror, 0, 0.0, 0.65);
  part(mirrorG, box(0.5, 1.72, 0.03), GREY_D, 0, 1.02, -0.02);
  picture(mirrorG, painted('fbMirror', 64, 128, (c) => {
    const lg = c.createLinearGradient(0, 0, 64, 128);
    lg.addColorStop(0, '#e6f2f6');
    lg.addColorStop(0.5, '#bcd4dd');
    lg.addColorStop(1, '#eef6f8');
    c.fillStyle = lg;
    c.fillRect(0, 0, 64, 128);
  }), 0.44, 1.64, 0, 1.02, 0);
  part(mirrorG, box(0.5, 0.05, 0.22), GREY_D, 0, 0.025, 0);
  const spots: Record<string, Spot> = { fbGown: standAt(g, 'fbGown', -0.28, 0.46) };
  const show = (_now: string | null, N: FbNow | null) => {
    if (!N) at(taken, GN.suit);
    else at(taken, N.props.suit ?? null);
  };
  show(null, null);
  drive(g, out, spots, {}, show);
  out.work = marker(g, GN.suit[0], 1.3, 0);
}

// =============================================================================================
// 점착 매트 (fbStickyMat): the blue tacky mat stepped over before the shower. Standing on the tile behind the one it lies on, reaching
// forward: a piece on the tile right at the door would have the wall conversion (walls.ts) give that tile to the booth.

function stickyMat(g: THREE.Group) {
  const Z = -1;
  part(g, box(0.94, 0.006, 1.9), '#5c9bd6', 0, 0.004, Z + 0.5, { outline: false });
  for (const z of [-0.6, -0.2, 0.2, 0.6]) part(g, box(0.9, 0.002, 0.012), '#3f7fbc', 0, 0.008, Z + 0.5 + z, { outline: false });
}

// =============================================================================================
// 에어샤워 (fbAirShower): a booth a tile wide and two long, walled and doored by the lot itself (a door at each end, nothing else).
// The piece is its inner tile (the one everyone crosses); from here z runs out to the outer door, at z = 1.5, and the inner door's at z = -0.5.

function airShower(g: THREE.Group, out: Built) {
  const HW = 0.44;
  const Z0 = -0.46;
  const Z1 = 1.46;
  const ZC = (Z0 + Z1) / 2;
  const L = Z1 - Z0;
  const T = 2.3;
  part(g, box(HW * 2, 0.03, L), GREY, 0, 0.015, ZC, { outline: false });
  for (let i = 0; i < 18; i++) part(g, box(HW * 1.9, 0.004, 0.012), GREY_D, 0, 0.033, Z0 + 0.05 + i * 0.107, { outline: false });
  // A lintel over each door with its lamp, and the countdown over the way in.
  const lintel = (z: number, face: number) => {
    part(g, box(HW * 2 + 0.04, 0.22, 0.05), PANEL, 0, T - 0.11, z);
    return ownLit(g, ball(0.03), '#e53935', 0.3, T - 0.11, z + face * 0.03);
  };
  const lamps = [lintel(Z0, 1), lintel(Z1, 1)];
  label(g, '에어샤워', 0.34, 0.1, -0.16, T - 0.11, Z1 + 0.028, TEAL, '#ffffff');
  const lcd = liveScreen(g, 0.22, 0.1, 110, 50, 0.1, T - 0.11, Z1 + 0.028);
  // The sides: panels low, glass above so whoever's inside is seen, and a column of nozzles either side down a steel duct.
  const nozzles: Array<[number, number, number]> = [];
  for (const sx of [-1, 1]) {
    part(g, box(0.03, 0.9, L), PANEL, sx * HW, 0.45, ZC);
    glass(g, L, T - 1.12, sx * HW, 0.9 + (T - 1.12) / 2, ZC, Math.PI / 2, 0.12);
    for (const z of [0.1, 0.9]) {
      part(g, box(0.05, T - 0.34, 0.1), STEEL, sx * (HW - 0.02), (T - 0.3) / 2 + 0.02, z);
      for (let j = 0; j < 5; j++) {
        const y = 0.5 + j * 0.3;
        part(g, cyl(0.018, 0.026, 0.04, 10), GREY_D, sx * (HW - 0.06), y, z, { rz: Math.PI / 2, outline: false });
        nozzles.push([sx, y, z]);
      }
    }
  }
  // The jets: faint cones, and specks blown off.
  const jets = nozzles.map(([sx, y, z]) => {
    const m = haze(g, new THREE.ConeGeometry(0.08, 0.34, 10, 1, true), '#d9f3ff', 0, sx * (HW - 0.24), y, z);
    m.rotation.z = sx * -Math.PI / 2;
    return m;
  });
  const specks: THREE.Mesh[] = [];
  const r = seeded(11);
  const seeds: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 16; i++) {
    specks.push(part(g, ball(0.007), '#ffffff', 0, 0, 0, { outline: false }));
    seeds.push([r(), r(), r(), r() < 0.5 ? -1 : 1]);
  }
  // The hand button by the way in.
  part(g, box(0.02, 0.2, 0.1), GREY_D, HW - 0.03, 1.12, 1.3);
  ownLit(g, cyl(0.02, 0.02, 0.012, 12), '#7ee89e', HW - 0.045, 1.14, 1.3).rotation.z = Math.PI / 2;
  const spots: Record<string, Spot> = { fbShower: standAt(g, 'fbShower', 0, 1.2) };
  // Whoever walks through (the lot says who's in here): the air runs, the lamps go red, for as long as they're in it.
  let walked = 0;
  let inside = false;
  out.passing = (near, t) => {
    const was = inside;
    inside = near.some((p) => Math.abs(p.dx) < 0.5 && p.dy > -0.5 && p.dy < 1.5);
    if (inside && !was) walked = t;
  };
  const show = (_now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    const on = N ? (n.jet ?? 0) > 0.5 : inside && t - walked < 4;
    jets.forEach((m, i) => fade(m, on ? 0.2 + 0.1 * Math.sin(t * 18 + i * 1.7) : 0));
    specks.forEach((m, i) => {
      m.visible = on;
      if (!on) return;
      const [a, b, c, sx] = seeds[i];
      const u = ((t * (1.4 + a) + b) % 1 + 1) % 1;
      m.position.set(sx * (HW - 0.1 - (HW - 0.1) * u), 0.3 + 1.5 * c + 0.2 * u, Z0 + 0.15 + (L - 0.3) * a);
    });
    const go = N ? (n.green ?? 0) > 0.5 : !on;
    for (const lamp of lamps) setLit(lamp, go ? '#76ff8a' : '#e53935');
    const left = N ? Math.max(0, Math.ceil(n.left ?? 0)) : on ? Math.max(1, Math.ceil(4 - (t - walked))) : 0;
    lcd.draw(`${left}|${on ? 1 : 0}`, (c) => {
      c.fillStyle = '#0b1f33';
      c.fillRect(0, 0, 110, 50);
      text(c, left > 0 ? `${left}초` : '대기', 55, 25, 26, left > 0 ? AMBER_L : '#7ee89e', 'center');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, {}, show);
  out.work = marker(g, 0, 1.2, 0.5);
}

// =============================================================================================
// 노광 장비 (fbLitho, 3 × 2): a great white machine with a window on its stage, a load port, a console and a hatch for reticles.

function shotMap(c: Ctx2, s: number, w: number, h: number, flash: number) {
  c.fillStyle = '#10151c';
  c.fillRect(0, 0, w, h);
  const R = Math.min(w, h) * 0.46;
  c.fillStyle = '#39414f';
  c.beginPath();
  c.arc(w / 2, h / 2, pos(R), 0, Math.PI * 2);
  c.fill();
  const N = 9;
  const cell = (R * 2) / N;
  let idx = 0;
  const total = 61;
  const done = Math.floor(clamp01(s) * total);
  for (let j = 0; j < N; j++)
    for (let ii = 0; ii < N; ii++) {
      const x = w / 2 - R + (j % 2 ? N - 1 - ii : ii) * cell;
      const y = h / 2 - R + j * cell;
      if (Math.hypot(x + cell / 2 - w / 2, y + cell / 2 - h / 2) > R - cell * 0.35) continue;
      const lit = idx < done;
      const current = idx === done;
      c.fillStyle = current && flash > 0.5 ? '#ffffff' : lit ? '#7fc4ff' : current ? '#ffd54f' : '#596375';
      c.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      idx++;
    }
}
function litho(g: THREE.Group, out: Built, W: number) {
  const zF = 0.42;
  const zB = -0.98;
  const zC = (zF + zB) / 2;
  const D = zF - zB;
  const x0 = -0.56;
  const x1 = 0.46;
  const yL = 0.84;
  const yH = 1.34;
  const TOP = 1.98;
  const HW = Math.min(W, 3) / 2 - 0.03;
  // Round the stage's opening.
  part(g, rbox(HW * 2, yL, D, 0.03), WHITE, 0, yL / 2, zC);
  part(g, rbox(HW * 2, TOP - yH, D, 0.03), WHITE, 0, (TOP + yH) / 2, zC);
  part(g, box(x0 + HW, yH - yL, D), WHITE, (x0 - HW) / 2, (yL + yH) / 2, zC);
  part(g, box(HW - x1, yH - yL, D), WHITE, (x1 + HW) / 2, (yL + yH) / 2, zC);
  part(g, box(x1 - x0, yH - yL, 0.02), GRAPHITE, (x0 + x1) / 2, (yL + yH) / 2, zB + 0.02, { outline: false });
  part(g, box(x1 - x0, 0.02, D), '#39424a', (x0 + x1) / 2, yL + 0.01, zC, { outline: false });
  // The panels and vents down its front, its brand plate and the amber strip of the bay.
  for (const sx of [-1.22, -0.7, 0.62, 1.16]) part(g, box(0.008, 0.82, 0.002), PANEL_D, sx, 0.41, zF + 0.002, { outline: false });
  part(g, box(HW * 2, 0.012, 0.002), AMBER, 0, yH + 0.05, zF + 0.002, { outline: false });
  label(g, `${FAB} · 노광기 L-3`, 0.86, 0.13, -0.8, 1.72, zF + 0.004, NAVY, '#ffffff');
  label(g, '자외선 주의', 0.36, 0.1, 0.92, 1.76, zF + 0.004, AMBER, BLACK);
  const set = tower(g, 1.34, TOP, 0.2);
  ownLit(g, box(HW * 1.9, 0.04, 0.12), AMBER_L, 0, TOP + 0.26, 0.05);
  for (const x of [-1.2, 1.2]) part(g, box(0.02, 0.26, 0.02), GREY, x, TOP + 0.13, 0.05, { outline: false });
  // Inside: granite, the lens coming down, the stage; a flash when the shutter goes.
  part(g, box(0.92, 0.08, 0.9), '#5b6168', (x0 + x1) / 2, yL + 0.06, -0.26);
  part(g, cyl(0.1, 0.16, 0.22, 18), GREY, LT.stage[0], yH - 0.11, LT.stage[2] - 0.0);
  part(g, cyl(0.06, 0.07, 0.04, 16), BLACK, LT.stage[0], yH - 0.24, LT.stage[2], { outline: false });
  const stage = part(g, rbox(0.34, 0.05, 0.34, 0.012), '#8d99a3', LT.stage[0], LT.stage[1] - 0.05, LT.stage[2]);
  const beam = haze(g, new THREE.ConeGeometry(0.06, 0.1, 12, 1, true), '#a6c8ff', 0, LT.stage[0], LT.stage[1] + 0.06, LT.stage[2]);
  beam.rotation.x = Math.PI;
  glass(g, x1 - x0, yH - yL, (x0 + x1) / 2, (yL + yH) / 2, zF + 0.005, 0, 0.1);
  // The wafer, whose dies light as they're shot.
  const waferG = group(g);
  part(waferG, cyl(0.125, 0.125, 0.006, 32), '#9aa5b5', 0, 0.003, 0, { outline: false });
  const dies = liveScreen(waferG, 0.25, 0.25, 128, 128, 0, 0.008, 0, 0, -Math.PI / 2);
  // The load port with its wafer box.
  const portP = LT.port;
  part(g, box(0.5, 0.08, 0.42), PANEL_D, portP[0], portP[1] - 0.04, portP[2] - 0.06);
  part(g, box(0.5, 0.86, 0.1), PANEL, portP[0], portP[1] / 2 - 0.04, zF + 0.04);
  const f = foupMesh(g);
  f.root.position.set(portP[0], portP[1], portP[2] - 0.1);
  label(g, '적재 포트', 0.28, 0.07, portP[0], 0.72, zF + 0.092, GREY_D, '#ffffff');
  // The reticle hatch, a flap that drops open.
  part(g, box(0.34, 0.2, 0.02), PANEL_D, LT.hatch[0], LT.hatch[1], zF + 0.008, { outline: false });
  const hatch = group(g, LT.hatch[0], LT.hatch[1] - 0.09, zF + 0.016);
  part(hatch, box(0.32, 0.18, 0.012), WHITE, 0, 0.09, 0);
  part(hatch, box(0.1, 0.012, 0.012), GREY_D, 0, 0.15, 0.008, { outline: false });
  label(g, '레티클', 0.2, 0.05, LT.hatch[0], LT.hatch[1] + 0.135, zF + 0.012, '#ffffff', BLACK);
  // A pod: a square case; and the shelf they wait on at the machine's right.
  const podOf = (p: THREE.Object3D) => {
    const m = group(p);
    part(m, rbox(0.24, 0.05, 0.24, 0.012), '#cfd8dc', 0, 0, 0);
    part(m, box(0.18, 0.002, 0.18), '#6a7c8f', 0, 0.026, 0, { outline: false });
    part(m, box(0.16, 0.002, 0.16), AMBER_L, 0, 0.0275, 0, { outline: false });
    return m;
  };
  const pod = podOf(g);
  part(g, box(0.34, 0.97, 0.34), PANEL_D, LT.podShelf[0], 0.48, LT.podShelf[2]);
  // The console: a pedestal, keys and a big screen.
  const K = LT.keys;
  part(g, box(0.6, 0.96, 0.22), PANEL, K[0], 0.48, zF + 0.1);
  part(g, rbox(0.64, 0.05, 0.34, 0.012), PANEL_D, K[0] + 0.02, K[1] - 0.04, K[2] - 0.04);
  part(g, box(0.34, 0.016, 0.12), GRAPHITE, K[0], K[1], K[2], { outline: false });
  part(g, ball(0.03), '#90a4ae', LT.ball[0], LT.ball[1], LT.ball[2], { outline: false });
  part(g, box(0.56, 0.38, 0.03), BLACK, LT.screen[0], LT.screen[1], LT.screen[2] - 0.02);
  const screen = liveScreen(g, 0.52, 0.34, 288, 188, LT.screen[0], LT.screen[1], LT.screen[2]);
  const spots: Record<string, Spot> = {
    fbExpose: standAt(g, 'fbExpose', K[0], LT.stand),
    fbReticle: standAt(g, 'fbReticle', 1.05, LT.stand),
    semiconductor_tuneOverlay: standAt(g, 'fbOverlay', K[0], LT.stand),
  };
  const show = (now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const expose = now === 'fbExpose';
    const overlay = now === 'semiconductor_tuneOverlay';
    const idleShots = ((t / 16) % 1 + 1) % 1;
    const sh = expose ? (n.shots ?? 0) : overlay ? (n.shots ?? 0) : idleShots;
    const flashing = expose || overlay ? (n.flash ?? 0) > 0.5 : Math.sin(t * 11) > 0.6;
    at(waferG, expose ? (P.wafer ?? null) : LT.stage, LT.stage);
    stage.position.x = LT.stage[0] + (expose || overlay ? 0 : 0.04 * Math.sin(t * 3));
    if (!expose) waferG.position.x = stage.position.x;
    dies.draw(`${Math.floor(clamp01(sh) * 61)}`, (c) => shotMap(c, sh, 128, 128, 0));
    fade(beam, flashing && (expose ? (n.onStage ?? 0) > 0.9 : true) ? 0.6 : 0);
    f.door.position.z = 0.176 + 0.14 * clamp01(n.box);
    f.door.position.y = 0.17 - 0.2 * clamp01(n.box);
    f.door.visible = clamp01(n.box) < 0.95;
    const hatchOpen = clamp01(n.hatch);
    hatch.rotation.x = 1.55 * hatchOpen;
    at(pod, now === 'fbReticle' ? P.pod : null, LT.podShelf);
    set(expose || overlay ? (flashing ? 1 : 2) : 2);
    const key = overlay ? `o${q(n.off, 30)}|${n.ok ?? 0}` : expose ? `e${Math.floor(clamp01(sh) * 61)}|${q(n.flash, 1)}|${n.done ?? 0}` : now === 'fbReticle' ? `r${q(n.done, 1)}` : `i${Math.floor(idleShots * 61)}`;
    screen.draw(key, (c) => {
      const w = 288;
      const h = 188;
      c.fillStyle = '#0f1720';
      c.fillRect(0, 0, w, h);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, w, 24);
      if (overlay) {
        text(c, '정렬 오차', 8, 12, 15, '#ffffff');
        const off = Math.max(0, n.off ?? 0);
        const nm = (off * 18).toFixed(1);
        text(c, `${nm} nm`, w - 8, 12, 15, off < 0.1 ? '#7ee89e' : AMBER_L, 'right');
        const cx = w / 2;
        const cy = 106;
        c.strokeStyle = '#7fc4ff';
        c.lineWidth = 2;
        c.strokeRect(cx - 32, cy - 32, 64, 64);
        c.strokeStyle = off < 0.1 ? '#7ee89e' : '#ffd54f';
        const dx = off * 34;
        const dy = -off * 21;
        c.strokeRect(cx - 18 + dx, cy - 18 + dy, 36, 36);
        return;
      }
      if (now === 'fbReticle') {
        text(c, '레티클 교체', 8, 12, 15, '#ffffff');
        text(c, (n.done ?? 0) > 0.5 ? '레티클 M2-07 확인' : '패턴 마스크 넣어 주세요', w / 2, 100, 18, (n.done ?? 0) > 0.5 ? '#7ee89e' : AMBER_L, 'center');
        return;
      }
      text(c, '샷 맵', 8, 12, 15, '#ffffff');
      text(c, `${Math.floor(clamp01(sh) * 61)} / 61`, w - 8, 12, 15, AMBER_L, 'right');
      c.save();
      c.translate(60, 24);
      shotMap(c, sh, 164, 164, flashing ? 1 : 0);
      c.restore();
    });
  };
  show(null, null, 0);
  drive(g, out, spots, {}, show);
  out.work = marker(g, K[0], K[1], K[2]);
}

// =============================================================================================
// 감광액 코터 (fbCoater, 2 × 1): a bench with a spinning chuck under a clear lid, a dispense arm and a cassette.

function coater(g: THREE.Group, out: Built) {
  const T = CT.top;
  part(g, rbox(1.94, T, 0.8, 0.02), PANEL, 0, T / 2, -0.06);
  part(g, box(1.94, 0.02, 0.8), WHITE, 0, T + 0.01, -0.06, { outline: false });
  for (const x of [-0.6, 0, 0.6]) part(g, box(0.54, 0.62, 0.006), WHITE, x, 0.42, 0.343, { outline: false });
  label(g, '감광액 코터 C-2', 0.56, 0.1, -0.44, 0.78, 0.348, NAVY, '#ffffff');
  // Bowl, chuck, lid and the arm over it.
  const B = CT.bowl;
  part(g, cyl(0.2, 0.17, 0.06, 28), GRAPHITE, B[0], T + 0.03, B[2], { outline: false });
  const chuck = group(g, B[0], 0, B[2]);
  part(chuck, cyl(0.05, 0.05, 0.06, 14), STEEL, 0, T + 0.05, 0, { outline: false });
  const wafer = waferMesh(chuck, 0.1);
  wafer.position.y = B[1] - 0.01;
  const film = filmDisc(wafer, 0.097, 0.0072);
  const lidG = group(g, B[0], T + 0.06, B[2] - 0.2);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.21, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  lid.userData.ownGeometry = lid.userData.ownMaterial = true;
  lid.position.z = 0.2;
  lidG.add(lid);
  const arm = group(g, B[0] - 0.3, T + 0.2, B[2]);
  part(arm, cyl(0.02, 0.02, 0.2, 10), GREY, 0, -0.1, 0, { outline: false });
  part(arm, box(0.3, 0.018, 0.02), STEEL, 0.15, 0, 0, { outline: false });
  part(arm, cyl(0.009, 0.004, 0.05, 8), GREY_D, 0.3, -0.03, 0, { outline: false });
  const drop = part(arm, ball(0.012), '#c0392b', 0.3, -0.08, 0, { outline: false });
  part(g, cyl(0.05, 0.05, 0.16, 14), '#6d4c41', B[0] - 0.42, T + 0.08, B[2] - 0.14);
  label(g, '감광액', 0.1, 0.05, B[0] - 0.42, T + 0.1, B[2] - 0.087, '#ffffff', BLACK);
  // The cassette: a rack with wafers on edge; the one at the front is lifted.
  const C = CT.cassette;
  part(g, box(0.28, 0.02, 0.28), GREY_D, C[0], T + 0.02, C[2]);
  for (const sx of [-1, 1]) part(g, box(0.02, 0.2, 0.26), GREY, C[0] + sx * 0.13, T + 0.12, C[2], { outline: false });
  for (let i = 0; i < 5; i++) {
    const w = waferMesh(g, 0.1);
    w.position.set(C[0], T + 0.04 + i * 0.03, C[2]);
  }
  // The panel, and the wand's holder.
  part(g, box(0.24, 0.14, 0.02), GRAPHITE, B[0] + 0.42, T + 0.1, B[2] + 0.34, { rx: -0.3 });
  const screen = liveScreen(g, 0.2, 0.1, 128, 64, B[0] + 0.42, T + 0.1, B[2] + 0.352, 0, -0.3);
  part(g, cyl(0.03, 0.04, 0.12, 10), GREY, CT.home[0], T + 0.05, CT.home[2] + 0.07);
  const wand = wandTool(g);
  const grip = { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pen' as const, radius: 0.013 };
  const tools: Partial<Record<FbTool, HeldTool>> = { wand: { tool: wand.root, lead: 'right', grips: { right: grip } } };
  const spots: Record<string, Spot> = { fbCoat: standAt(g, 'fbCoat', 0.5, CT.stand) };
  const show = (_now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    at(wand.root, N?.props.wand ?? null, CT.home);
    wand.wafer.visible = (n.onWand ?? 0) > 0.5;
    wafer.visible = (n.onChuck ?? 0) > 0.5 || !N;
    const fim = clamp01(n.film);
    fade(film, 0.75 * fim);
    fade(wand.film, 0.75 * fim);
    chuck.rotation.y = (n.run ?? 0) * t * 24;
    lidG.rotation.x = -1.3 * (1 - clamp01(n.lid));
    arm.rotation.y = (n.drop ?? 0) > 0.5 ? 0 : -0.9;
    drop.visible = (n.drop ?? 0) > 0.5 && Math.sin(t * 16) > 0;
    drop.position.y = -0.08 - 0.05 * (((t * 2.5) % 1 + 1) % 1);
    screen.draw(`${q(n.spin, 20)}|${n.onWand ?? 0}`, (c) => {
      c.fillStyle = '#10222c';
      c.fillRect(0, 0, 128, 64);
      const rpm = Math.round(clamp01(n.spin) * 3000);
      text(c, `${rpm}`, 118, 22, 22, '#9fe7ff', 'right');
      text(c, 'rpm', 10, 22, 12, '#9fb5c0');
      c.fillStyle = '#2d4654';
      c.fillRect(8, 44, 112, 10);
      c.fillStyle = AMBER;
      c.fillRect(8, 44, 112 * clamp01(n.spin), 10);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, B[0], T, B[2]);
}

// =============================================================================================
// 웨이퍼 운반 레일 (fbFoupRail, 5 × 1): a rail overhead; a carrier that runs along it and lowers its box to a load port.

function foupRail(g: THREE.Group, out: Built) {
  const R = FR.rail;
  // The rail on brackets from the wall.
  part(g, box(4.9, 0.05, 0.1), PANEL_D, 0, R + 0.06, 0);
  part(g, box(4.9, 0.02, 0.04), GREY, 0, R + 0.02, 0, { outline: false });
  for (const x of [-2.2, -0.75, 0.75, 2.2]) {
    part(g, box(0.05, 0.3, 0.05), GREY, x, R + 0.22, -0.02, { outline: false });
    part(g, box(0.05, 0.05, 0.5), GREY, x, R + 0.36, -0.24, { outline: false });
  }
  // Two tools beneath the rail: their fronts and load ports.
  const toolBody = (x: number, name: string) => {
    part(g, rbox(1.3, 1.56, 0.46, 0.03), WHITE, x, 0.78, -0.25);
    part(g, box(0.3, 0.3, 0.004), GRAPHITE, x + 0.42, 1.18, -0.018, { outline: false });
    label(g, name, 0.5, 0.1, x - 0.28, 1.36, -0.016, NAVY, '#ffffff');
    part(g, box(0.44, 0.04, 0.46), PANEL_D, x, FR.port[1] - 0.02, FR.port[2] + 0.02);
    part(g, box(0.4, FR.port[1] - 0.06, 0.38), PANEL, x, (FR.port[1] - 0.06) / 2, FR.port[2] + 0.02);
  };
  toolBody(FR.port[0], '측정 장비 M-4');
  toolBody(1.08, '이온 주입 I-2');
  const parked = foupMesh(g, '#607d8b');
  parked.root.position.set(1.08, FR.port[1], FR.port[2]);
  // The scanner's holster on a post.
  part(g, cyl(0.03, 0.03, FR.holster[1] - 0.06, 10), GREY, FR.holster[0], (FR.holster[1] - 0.06) / 2, FR.holster[2], { outline: false });
  part(g, box(0.09, 0.05, 0.09), GREY_D, FR.holster[0], FR.holster[1] - 0.07, FR.holster[2]);
  const P = FR.port;
  const screen = liveScreen(g, 0.26, 0.26, 128, 128, P[0] + 0.42, 1.18, -0.014);
  // The carrier: a little trolley on the rail, its hoist and belts, its box.
  const carrier = () => {
    const root = group(g);
    part(root, rbox(0.5, 0.2, 0.42, 0.04), WHITE, 0, R - 0.12, 0);
    part(root, box(0.5, 0.012, 0.002), TEAL, 0, R - 0.12, 0.212, { outline: false });
    const lamp = ownLit(root, ball(0.018), '#7ee89e', 0.2, R - 0.2, 0.2);
    const belts = [-1, 1].map((sx) => part(root, box(0.03, 1, 0.003), BLACK, sx * 0.13, 0, 0, { outline: false }));
    const box_ = foupMesh(root);
    const set = (x: number, low: number) => {
      root.position.x = x;
      root.visible = Math.abs(x) < 2.72;
      const yTop = R - 0.22;
      const yUp = yTop - 0.36;
      const y = yUp + (P[1] - yUp) * clamp01(low);
      box_.root.position.set(0, y, 0);
      for (const b of belts) {
        const len = Math.max(0.01, yTop - (y + 0.34));
        b.scale.y = len;
        b.position.y = yTop - len / 2;
      }
      setLit(lamp, low > 0.02 ? AMBER : '#7ee89e');
    };
    return { root, set, box_ };
  };
  const main = carrier();
  const other = carrier();
  const sc = scannerTool(g);
  const tools: Partial<Record<FbTool, HeldTool>> = { scanner: { tool: sc.root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0).applyAxisAngle(v3(1, 0, 0), 0.25), shape: 'trigger', radius: 0.018 } } } };
  const spots: Record<string, Spot> = { fbFoup: standAt(g, 'fbFoup', -0.62, FR.stand) };
  const show = (_now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    const cycle = (off: number) => -FR.off + 2 * FR.off * (((t / 11 + off) % 1 + 1) % 1);
    main.set(N ? (n.vx ?? -FR.off) : cycle(0), N ? clamp01(n.low) : 0);
    other.set(cycle(0.5), 0);
    at(sc.root, N?.props.scanner ?? null, FR.holster);
    sc.root.rotation.x = 0;
    fade(sc.beam, (n.beam ?? 0) > 0.5 ? 0.75 : 0);
    const read = clamp01(n.read);
    screen.draw(`${read > 0.5 ? 1 : 0}|${q(n.low, 8)}`, (c) => {
      c.fillStyle = '#0d1b24';
      c.fillRect(0, 0, 128, 128);
      text(c, '입고', 64, 20, 18, '#ffffff', 'center');
      text(c, read > 0.5 ? '로트 7A' : '대기', 64, 58, 26, read > 0.5 ? '#7ee89e' : AMBER_L, 'center');
      text(c, read > 0.5 ? '25장 확인' : '', 64, 96, 18, '#9fe7ff', 'center');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, P[0], P[1] + 0.2, P[2] + 0.2);
}

// =============================================================================================
// 웨이퍼 운반 로봇 (fbWaferRobot, 2 × 2): a two-link arm in a clear case, between a cassette and an aligner.

function waferRobot(g: THREE.Group, out: Built) {
  const T = 0.82;
  const zF = 0.56;
  const zB = -0.82;
  const zC = (zF + zB) / 2;
  part(g, rbox(1.9, T, zF - zB, 0.03), PANEL, 0, T / 2, zC);
  part(g, box(1.84, 0.02, zF - zB - 0.06), '#d8dee2', 0, T + 0.01, zC, { outline: false });
  label(g, '웨이퍼 운반 로봇 R-5', 0.74, 0.11, -0.44, 0.6, zF + 0.003, NAVY, '#ffffff');
  for (let i = 0; i < 5; i++) part(g, box(0.5, 0.012, 0.002), PANEL_D, 0.54, 0.26 + i * 0.1, zF + 0.002, { outline: false });
  // The case: posts, a roof of filter fan units, clear sides, a door that lifts.
  const Tp = 1.72;
  for (const sx of [-0.93, 0.93]) for (const z of [zF - 0.03, zB + 0.03]) part(g, box(0.04, Tp - T, 0.04), STEEL, sx, (T + Tp) / 2, z, { outline: false });
  part(g, box(1.9, 0.09, zF - zB), WHITE, 0, Tp, zC);
  for (const x of [-0.46, 0.46]) part(g, box(0.76, 0.012, 1.0), GREY, x, Tp - 0.05, zC, { outline: false });
  for (const sx of [-1, 1]) glass(g, zF - zB, Tp - T, sx * 0.94, (T + Tp) / 2, zC, Math.PI / 2, 0.12);
  glass(g, 1.86, Tp - T, 0, (T + Tp) / 2, zB, 0, 0.12);
  const door = group(g, 0, 0, zF);
  glass(door, 1.82, Tp - T - 0.02, 0, (T + Tp) / 2, 0, 0, 0.14);
  part(door, box(1.82, 0.03, 0.02), STEEL, 0, T + 0.03, 0, { outline: false });
  part(door, box(0.3, 0.025, 0.04), GREY_D, 0, RB.door[1] - 0.05, 0.02, { outline: false });
  // The arm.
  const B = RB.base;
  part(g, cyl(0.12, 0.14, B[1] - T, 18), GRAPHITE, B[0], (B[1] + T) / 2, B[2]);
  const col = group(g, B[0], B[1], B[2]);
  part(col, cyl(0.075, 0.075, 0.08, 16), '#90a4ae', 0, 0.02, 0, { outline: false });
  const l1 = group(col, 0, 0.06, 0);
  part(l1, rbox(0.12, 0.045, RB.l1 + 0.1, 0.02), WHITE, 0, 0, RB.l1 / 2);
  const l2 = group(l1, 0, 0.04, RB.l1);
  part(l2, cyl(0.05, 0.05, 0.04, 14), '#90a4ae', 0, -0.005, 0, { outline: false });
  part(l2, rbox(0.09, 0.035, RB.l2 + 0.08, 0.015), WHITE, 0, 0.018, RB.l2 / 2);
  const bladeG = group(l2, 0, 0.04, RB.l2);
  const plate = group(bladeG);
  part(plate, cyl(0.03, 0.03, 0.02, 12), GREY_D, 0, 0, 0, { outline: false });
  part(plate, box(0.05, 0.01, RB.blade + 0.04), '#d7ccc8', 0, 0.01, RB.blade / 2);
  part(plate, box(0.14, 0.01, 0.03), '#d7ccc8', 0, 0.01, RB.blade + 0.02);
  for (const sx of [-1, 1]) part(plate, ball(0.009), GRAPHITE, sx * 0.03, 0.02, 0.05, { outline: false });
  const onBlade = waferMesh(bladeG, 0.1);
  onBlade.position.set(0, 0.018, RB.blade);
  // The cassette and the aligner.
  const C = RB.cassette;
  const A = RB.aligner;
  part(g, box(0.28, 0.14, 0.28), GREY_D, C[0], T + 0.07, C[2]);
  for (const sx of [-1, 1]) part(g, box(0.02, 0.24, 0.26), GREY, C[0] + sx * 0.13, C[1] + 0.05, C[2], { outline: false });
  for (let i = 0; i < 5; i++) {
    const w = waferMesh(g, 0.1);
    w.position.set(C[0], C[1] + i * 0.035, C[2]);
  }
  part(g, cyl(0.1, 0.12, 0.1, 18), GRAPHITE, A[0], T + 0.05, A[2]);
  const chuck = group(g, A[0], A[1] - 0.04, A[2]);
  part(chuck, cyl(0.05, 0.05, 0.05, 14), STEEL, 0, 0, 0, { outline: false });
  const onChuck = waferMesh(chuck, 0.1);
  onChuck.position.y = 0.035;
  part(chuck, box(0.018, 0.001, 0.05), BLACK, 0.06, 0.05, 0, { outline: false });
  const eye = group(g, A[0] + 0.14, T, A[2]);
  part(eye, box(0.03, 0.24, 0.05), GREY_D, 0, 0.12, 0);
  part(eye, box(0.12, 0.03, 0.05), GREY_D, -0.05, 0.24, 0);
  ownLit(eye, ball(0.01), '#ff5252', -0.1, 0.225, 0);
  const set = tower(g, 0.86, Tp + 0.05, zB + 0.1);
  // The spare blade on the bench, the driver on its tray.
  part(g, box(0.34, 0.02, 0.24), GRAPHITE, 0.52, T + 0.02, 0.3);
  const blade = (p: THREE.Object3D) => {
    const m = group(p);
    part(m, box(0.05, 0.01, 0.2), '#efe8df', 0, 0.01, 0);
    part(m, box(0.14, 0.01, 0.03), '#efe8df', 0, 0.01, -0.09);
    return m;
  };
  const oldB = blade(g);
  const newB = blade(g);
  const drv = driverTool(g);
  const pd = pendantTool(g);
  const tools: Partial<Record<FbTool, HeldTool>> = {
    pendant: {
      tool: pd.root,
      lead: 'right',
      grips: {
        right: { at: v3(0.118, 0, 0).applyAxisAngle(v3(1, 0, 0), -0.72), axis: v3(0, 1, 0).applyAxisAngle(v3(1, 0, 0), -0.72), shape: 'power', radius: 0.017 },
        left: { at: v3(-0.118, 0, 0).applyAxisAngle(v3(1, 0, 0), -0.72), axis: v3(0, 1, 0).applyAxisAngle(v3(1, 0, 0), -0.72), shape: 'power', radius: 0.017 },
      },
    },
    driver: { tool: drv, lead: 'right', grips: { right: { at: v3(0, 0.01, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.015 } } },
  };
  const spots: Record<string, Spot> = { fbTeach: standAt(g, 'fbTeach', 0, RB.stand), semiconductor_fixRobot: standAt(g, 'fbFix', 0.04, RB.stand - 0.1) };
  const place = (tx: number, tz: number) => {
    // Two links to the wrist, the blade on to the tip; nothing may go past straight.
    const dx0 = tx - B[0];
    const dz0 = tz - B[2];
    const d0 = Math.max(0.02, Math.hypot(dx0, dz0));
    const ux = dx0 / d0;
    const uz = dz0 / d0;
    const wx = dx0 - ux * RB.blade;
    const wz = dz0 - uz * RB.blade;
    const reach = RB.l1 + RB.l2 - 0.01;
    const d = THREE.MathUtils.clamp(Math.hypot(wx, wz), Math.abs(RB.l1 - RB.l2) + 0.03, reach);
    const th = Math.atan2(wx, wz);
    const cosA = THREE.MathUtils.clamp((RB.l1 * RB.l1 + d * d - RB.l2 * RB.l2) / (2 * RB.l1 * d), -1, 1);
    const a1 = th + Math.acos(cosA);
    const ex = Math.sin(a1) * RB.l1;
    const ez = Math.cos(a1) * RB.l1;
    const a2 = Math.atan2(wx - ex, wz - ez);
    const a3 = Math.atan2(ux, uz);
    l1.rotation.y = a1;
    l2.rotation.y = a2 - a1;
    bladeG.rotation.y = a3 - a2;
  };
  const show = (now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const tip = P.tip;
    if (tip) place(tip[0], tip[2]);
    else {
      // On its own it passes wafers back and forth.
      const u = (t / 7) % 1;
      const k = 0.5 + 0.5 * Math.sin(u * Math.PI * 2);
      place(C[0] + (A[0] - C[0]) * k, C[2] + 0.28 * Math.sin(k * Math.PI));
    }
    const hasWafer = now ? (n.onBlade ?? 0) > 0.5 : true;
    onBlade.visible = hasWafer;
    onChuck.visible = now ? (n.atAligner ?? 0) > 0.5 : false;
    chuck.rotation.y = n.chuckSpin ?? 0;
    door.position.y = 0.72 * clamp01(n.door);
    set(now ? ((n.ok ?? 0) > 0.5 ? 2 : (n.run ?? 0) > 0.5 ? 2 : 1) : 2);
    const fixing = now === 'semiconductor_fixRobot';
    plate.visible = !fixing || (n.oldOn ?? 0) > 0.5 || (n.newOn ?? 0) > 0.5;
    at(oldB, fixing ? (P.oldBlade ?? null) : null);
    at(newB, fixing ? (P.newBlade ?? null) : [0.52, T + 0.03, 0.3]);
    const driving = N?.tool === 'driver';
    at(drv, driving ? (P.driver ?? null) : [0.42, T + 0.05, 0.3]);
    drv.rotation.set(0, driving ? (n.spin ?? 0) : 0, driving ? 0 : Math.PI / 2);
    // On its hook at the bench's corner until it's taken up.
    at(pd.root, N?.tool === 'pendant' ? (P.pendant ?? null) : [-0.62, T + 0.1, 0.36]);
    if (now === 'fbTeach') {
      const off = Math.max(0, n.off ?? 0);
      pd.screen.draw(`${q(off, 30)}|${n.run ?? 0}`, (c) => {
        c.fillStyle = '#0c1820';
        c.fillRect(0, 0, 128, 82);
        text(c, (n.run ?? 0) > 0.5 ? '자동 실행' : '조그', 6, 12, 12, '#ffffff');
        text(c, `${(off * 2.4).toFixed(2)}mm`, 122, 12, 12, off < 0.05 ? '#7ee89e' : AMBER_L, 'right');
        c.strokeStyle = '#7fc4ff';
        c.beginPath();
        c.arc(64, 50, 22, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = off < 0.05 ? '#7ee89e' : '#ffd54f';
        c.beginPath();
        c.arc(64 + off * 16, 50 - off * 10, pos(4), 0, Math.PI * 2);
        c.fill();
      });
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, RB.service[0], RB.service[1], RB.service[2]);
}

// =============================================================================================
// 식각·증착 장비 (fbEtchRow, 3 × 1): three chambers with plasma in their viewports, gas lines over them, one console.

function etchRow(g: THREE.Group, out: Built) {
  const T = 1.82;
  const zF = 0.34;
  const xs = ET.chamberX;
  part(g, rbox(2.94, T, 0.8, 0.03), WHITE, 0, T / 2, zF - 0.4);
  for (const x of [-0.49, 0.49]) part(g, box(0.008, T - 0.1, 0.002), PANEL_D, x, T / 2, zF + 0.002, { outline: false });
  // Gas lines and valves along the top; a pump below each chamber.
  for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 2.8, 8), i === 2 ? AMBER : CHROME, 0, T + 0.04 + (i % 2) * 0.05, -0.2 + i * 0.1, { rz: Math.PI / 2, outline: false });
  for (const x of [-1.2, -0.3, 0.3, 1.2]) part(g, rbox(0.1, 0.1, 0.08, 0.012), GREY_D, x, T + 0.1, 0.02);
  const glowing: Array<{ disc: THREE.Mesh; halo: THREE.Mesh; lamp: THREE.Mesh; x: number }> = [];
  const names = ['식각 E-1', '증착 D-2', '식각 E-3'];
  xs.forEach((x, i) => {
    part(g, box(0.78, 0.6, 0.012), PANEL, x, 0.42, zF + 0.002, { outline: false });
    for (let k = 0; k < 6; k++) part(g, box(0.62, 0.012, 0.002), PANEL_D, x, 0.2 + k * 0.08, zF + 0.01, { outline: false });
    label(g, names[i], 0.34, 0.08, x, 1.68, zF + 0.004, NAVY, '#ffffff');
    if (i !== 0) {
      part(g, cyl(0.18, 0.18, 0.05, 24), STEEL, x, 1.2, zF, { rx: Math.PI / 2 });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        part(g, ball(0.01), BLACK, x + 0.16 * Math.cos(a), 1.2 + 0.16 * Math.sin(a), zF + 0.028, { outline: false });
      }
    }
    const disc = ownLit(g, new THREE.CircleGeometry(0.13, 24), '#2a1838', x, 1.2, zF + (i === 0 ? -0.26 : 0.03));
    disc.userData.ownGeometry = true;
    const halo = haze(g, new THREE.CircleGeometry(0.1, 20), '#ffffff', 0, x, 1.2, zF + (i === 0 ? -0.255 : 0.034));
    const lamp = ownLit(g, ball(0.018), '#7ee89e', x + 0.32, 1.68, zF + 0.01);
    glowing.push({ disc, halo, lamp, x });
  });
  // The left chamber's door swings out at its right edge; inside, a ring of residue that comes away.
  const Dr = ET.door;
  part(g, cyl(0.2, 0.2, 0.3, 24), GREY_D, Dr[0], Dr[1], zF - 0.16, { rx: Math.PI / 2, outline: false });
  const residue = haze(g, new THREE.RingGeometry(0.05, 0.16, 28), '#b7a58e', 0.8, Dr[0], Dr[1], zF - 0.25);
  const hinge = group(g, Dr[0] + 0.21, Dr[1], zF + 0.02);
  part(hinge, cyl(0.2, 0.2, 0.03, 24), STEEL, -0.21, 0, 0, { rx: Math.PI / 2 });
  part(hinge, box(0.03, 0.14, 0.04), GRAPHITE, -0.39, 0, 0.03);
  glass(hinge, 0.22, 0.22, -0.21, 0, 0.018, 0, 0.25);
  part(hinge, cyl(0.016, 0.016, 0.3, 10), GREY_D, 0, 0, 0, { outline: false });
  // The console on the middle one.
  const K = ET.keys;
  part(g, box(0.56, 0.03, 0.22), PANEL_D, K[0], K[1] - 0.03, K[2] - 0.05);
  part(g, box(0.36, 0.015, 0.12), GRAPHITE, K[0], K[1], K[2] - 0.02, { outline: false });
  part(g, box(0.5, 0.34, 0.02), BLACK, ET.screen[0], ET.screen[1], ET.screen[2] - 0.01);
  const screen = liveScreen(g, 0.47, 0.31, 288, 190, ET.screen[0], ET.screen[1], ET.screen[2] + 0.002);
  const set = tower(g, 1.34, T, -0.1);
  const swab = swabTool(g);
  const tools: Partial<Record<FbTool, HeldTool>> = { swab: { tool: swab, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'power', radius: 0.014 } } } };
  const spots: Record<string, Spot> = { fbRecipe: standAt(g, 'fbRecipe', 0, ET.stand), fbChamber: standAt(g, 'fbChamber', 0, ET.stand) };
  const COLORS: Array<[string, string]> = [['#ff5ccf', '#ffc5ec'], ['#6fb3ff', '#cfe6ff']];
  const show = (now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const open = now === 'fbChamber' ? clamp01(n.door) : 0;
    hinge.rotation.y = -1.35 * open;
    fade(residue, now === 'fbChamber' ? 0.8 * (1 - clamp01(n.clean)) : 0.8);
    swab.visible = N?.tool === 'swab';
    if (swab.visible) at(swab, P.swab ?? null);
    const sent = clamp01(n.sent);
    glowing.forEach((G, i) => {
      const down = i === 0 && now === 'fbChamber' ? (n.plasma ?? 0) < 0.5 : false;
      const col = down ? null : i === 1 ? COLORS[1] : now === 'fbRecipe' && i === 0 ? (sent > 0.5 ? COLORS[1] : COLORS[0]) : COLORS[0];
      setLit(G.disc, col ? col[0] : '#2a1838');
      fade(G.halo, col ? 0.45 + 0.18 * Math.sin(t * (9 + i)) : 0);
      if (col) (G.halo.material as THREE.MeshBasicMaterial).color.set(col[1]);
      setLit(G.lamp, down ? AMBER : '#7ee89e');
    });
    set(now === 'fbChamber' ? 1 : 2);
    const gas = clamp01(n.gas);
    const curve = clamp01(n.curve);
    const pumping = clamp01(n.pump);
    const vent = (n.vent ?? 0) > 0.5;
    const key = now === 'fbChamber' ? `c${vent ? 1 : 0}|${q(pumping, 12)}` : `r${q(gas, 16)}|${q(sent, 1)}|${q(curve, 24)}|${now ? 1 : 0}`;
    screen.draw(key, (c) => {
      const w = 288;
      const h = 190;
      c.fillStyle = '#0f1720';
      c.fillRect(0, 0, w, h);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, w, 26);
      if (now === 'fbChamber') {
        text(c, '챔버 E-1 정비', 8, 13, 15, '#ffffff');
        text(c, vent ? '대기압으로 빼는 중' : pumping > 0 ? '진공 뽑는 중' : '문 열림 · 세정', w / 2, 80, 19, AMBER_L, 'center');
        c.fillStyle = '#2d4654';
        c.fillRect(30, 118, w - 60, 16);
        c.fillStyle = '#7ee89e';
        c.fillRect(30, 118, (w - 60) * pumping, 16);
        return;
      }
      text(c, '레시피 ETCH-41', 8, 13, 15, '#ffffff');
      const rows: Array<[string, string]> = [['가스 A', `${Math.round(40 + 12 * gas)} sccm`], ['압력', `${(12 - 3 * gas).toFixed(1)} mT`], ['전력', `${Math.round(600 + 80 * gas)} W`]];
      rows.forEach(([a, b], i) => {
        text(c, a, 12, 44 + i * 19, 13, '#9fb5c0');
        text(c, b, 132, 44 + i * 19, 13, now && gas > 0 && gas < 1 && i === 0 ? AMBER_L : '#e8f3f7', 'right');
      });
      text(c, sent > 0.5 ? '적용됨' : '수정 중', w - 10, 44, 14, sent > 0.5 ? '#7ee89e' : AMBER_L, 'right');
      // The endpoint curve, level till the layer's through, then falling off.
      c.strokeStyle = '#3a5563';
      c.strokeRect(12, 106, w - 24, 72);
      c.strokeStyle = '#7fc4ff';
      c.lineWidth = 2;
      c.beginPath();
      const steps = Math.max(1, Math.floor(curve * 40));
      for (let i = 0; i <= steps; i++) {
        const u = i / 40;
        const y = 122 + 40 * THREE.MathUtils.smoothstep(u, 0.62, 0.82) + 2 * Math.sin(i * 1.7);
        const x = 14 + (w - 28) * u;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
      if (curve > 0.82) text(c, '끝점 찾음', w - 20, 118, 13, '#7ee89e', 'right');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, K[0], K[1], K[2]);
}

// =============================================================================================
// 웨트 세정대 (fbWetBench, 2 × 1): three baths and a drying pad; the cassette on its handle goes through them.

function wetBench(g: THREE.Group, out: Built) {
  const T = 0.9;
  part(g, rbox(1.94, T - 0.02, 0.8, 0.02), '#e0ecec', 0, (T - 0.02) / 2, -0.06);
  part(g, box(1.94, 0.03, 0.8), WHITE, 0, T - 0.01, -0.06, { outline: false });
  part(g, box(1.94, 0.9, 0.05), PANEL, 0, T + 0.45, -0.44);
  label(g, '웨트 세정대 · 고글·장갑 필수', 0.92, 0.1, 0, 1.68, -0.412, AMBER, BLACK);
  const COLS = ['#a7e8ee', '#b9d4ff', '#d8f5e3'];
  const NAMES = ['1 약액', '2 약액', '3 헹굼'];
  const pool = WB.xs.map((x, i) => {
    part(g, box(0.44, 0.03, 0.36), GREY_D, x, T + 0.012, WB.z);
    const m = ownLit(g, box(0.38, 0.004, 0.3), COLS[i], x, T + 0.03, WB.z);
    label(g, NAMES[i], 0.26, 0.07, x, T + 0.2, -0.414, COLS[i], BLACK);
    part(g, cyl(0.01, 0.01, 0.34, 8), CHROME, x + 0.2, T + 0.16, -0.25, { outline: false });
    part(g, cyl(0.01, 0.01, 0.16, 8), CHROME, x + 0.12, T + 0.32, -0.25, { rz: Math.PI / 2, outline: false });
    return m;
  });
  // Bubbles in whichever's working.
  const r = seeded(29);
  const bubbles = Array.from({ length: 10 }, () => {
    const b = part(g, ball(0.012), '#ffffff', 0, 0, 0, { outline: false });
    return { b, a: r(), z: r() };
  });
  // The drying pad and a panel.
  part(g, box(0.34, 0.02, 0.28), GRAPHITE, WB.pad, T + 0.012, WB.z);
  part(g, box(0.28, 0.22, 0.03), GRAPHITE, WB.panel[0], WB.panel[1] + 0.05, WB.panel[2] - 0.12, { rx: -0.2 });
  const lcd = liveScreen(g, 0.25, 0.19, 128, 96, WB.panel[0], WB.panel[1] + 0.05, WB.panel[2] - 0.102, 0, -0.2);
  const tongs = tongsTool(g, 5);
  const drips = [0, 1, 2].map(() => part(g, ball(0.008), '#a7e8ee', 0, 0, 0, { outline: false }));
  const tools: Partial<Record<FbTool, HeldTool>> = { tongs: { tool: tongs, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.015 } } } };
  const spots: Record<string, Spot> = { fbWet: standAt(g, 'fbWet', 0.6, WB.stand) };
  const show = (_now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    at(tongs, N?.props.tongs ?? null, [WB.pad, WB.rest, WB.z]);
    const bath = Math.round(n.bath ?? -1);
    const on = (n.bubbling ?? 0) > 0.5 && bath >= 0;
    bubbles.forEach((B) => {
      B.b.visible = on;
      if (!on) return;
      const u = ((t * 0.9 + B.a) % 1 + 1) % 1;
      B.b.position.set(WB.xs[wrap(bath, 3)] - 0.16 + 0.32 * B.a, T + 0.03 + 0.03 * u, WB.z - 0.12 + 0.24 * B.z);
    });
    pool.forEach((m, i) => setLit(m, i === bath ? '#d8ffff' : COLS[i]));
    const tp = N?.props.tongs;
    drips.forEach((d, i) => {
      d.visible = !!tp && (n.drip ?? 0) > 0.5;
      if (d.visible && tp) d.position.set(tp[0] - 0.08 + i * 0.08, tp[1] - 0.34 - 0.1 * (((t * 2 + i * 0.3) % 1 + 1) % 1), tp[2]);
    });
    const left = Math.max(0, Math.ceil(n.left ?? 0));
    const step = Math.round(n.step ?? 0);
    lcd.draw(`${left}|${step}`, (c) => {
      c.fillStyle = '#10222c';
      c.fillRect(0, 0, 128, 96);
      text(c, `단계 ${step}/4`, 64, 20, 18, '#ffffff', 'center');
      text(c, left > 0 ? `${left}초` : step >= 4 ? '건조 완료' : '대기', 64, 62, left > 0 ? 28 : 20, left > 0 ? AMBER_L : '#7ee89e', 'center');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, T + 0.1, WB.z);
}

// =============================================================================================
// 불량 검사 현미경 (fbMicroscope, 2 × 1): seated at a steel bench; eyepieces and stage at the left, the wafer map at the right.

function microscope(g: THREE.Group, out: Built) {
  const T = MS.top;
  const zC = -0.04;
  part(g, rbox(1.92, 0.05, 0.86, 0.015), '#dfe5e8', 0, T - 0.025, zC);
  for (const sx of [-0.88, 0.88]) for (const z of [zC - 0.36, zC + 0.36]) part(g, box(0.05, T - 0.05, 0.05), STEEL, sx, (T - 0.05) / 2, z, { outline: false });
  part(g, box(1.7, 0.03, 0.74), PANEL_D, 0, 0.26, zC, { outline: false });
  chair(g, MS.seat);
  // The microscope: a heavy base, an arm, a head with its two eyepieces toward the seat, objectives over the stage.
  const S = MS.stage;
  part(g, rbox(0.42, 0.06, 0.42, 0.02), GRAPHITE, S[0], T + 0.03, S[2] - 0.04);
  part(g, rbox(0.1, 0.46, 0.12, 0.03), '#eceff1', S[0], T + 0.28, S[2] - 0.2);
  part(g, rbox(0.26, 0.14, 0.26, 0.04), '#eceff1', S[0], T + 0.5, S[2] - 0.1);
  for (const sx of [-1, 1]) rod(g, v3(S[0] + sx * 0.03, T + 0.5, S[2] + 0.02), v3(S[0] + sx * 0.035, MS.eye[1], MS.eye[2]), 0.018, GRAPHITE);
  part(g, cyl(0.05, 0.06, 0.05, 14), GREY_D, S[0], T + 0.41, S[2] - 0.0);
  for (let i = 0; i < 3; i++) {
    const a = 1 + i * 0.9;
    part(g, cyl(0.014, 0.012, 0.07, 10), i === 0 ? '#c62828' : GREY, S[0] + 0.03 * Math.cos(a), T + 0.35, S[2] + 0.03 * Math.sin(a), { outline: false });
  }
  part(g, cyl(0.15, 0.15, 0.03, 26), GREY, S[0], S[1] - 0.04, S[2], { outline: false });
  part(g, cyl(0.1, 0.1, 0.05, 22), GREY_D, S[0], T + 0.065, S[2], { outline: false });
  const wafer = waferMesh(g, 0.13);
  wafer.position.set(S[0], S[1] - 0.025, S[2]);
  const light = ownLit(g, ball(0.012), '#ffffff', S[0], S[1] + 0.01, S[2]);
  // The focus knob on the side.
  const Kn = MS.knob;
  part(g, box(0.1, 0.1, 0.1), '#cfd8dc', Kn[0] + 0.1, Kn[1] - 0.04, Kn[2] - 0.15, { outline: false });
  const knob = part(g, cyl(0.04, 0.04, 0.04, 16), GRAPHITE, Kn[0], Kn[1], Kn[2], { rz: Math.PI / 2 });
  // Wafer boxes, a mouse, the big screen, the log.
  part(g, cyl(0.12, 0.12, 0.08, 20), '#90caf9', MS.box[0], T + 0.04, MS.box[2]);
  label(g, '검사 대기', 0.18, 0.04, MS.box[0], T + 0.03, MS.box[2] + 0.122, '#ffffff', BLACK);
  part(g, rbox(0.06, 0.03, 0.1, 0.012), GRAPHITE, MS.mouse[0], T + 0.015, MS.mouse[2]);
  part(g, box(0.76, 0.5, 0.03), BLACK, MS.screen[0], MS.screen[1], MS.screen[2] - 0.02);
  part(g, cyl(0.03, 0.04, 0.12, 10), GREY_D, MS.screen[0], T + 0.08, MS.screen[2] - 0.05, { outline: false });
  const screen = liveScreen(g, 0.72, 0.46, 320, 204, MS.screen[0], MS.screen[1], MS.screen[2]);
  part(g, box(0.2, 0.01, 0.27), PAPER, 0.74, T + 0.005, 0.26, { outline: false });
  // A senior who comes over, in hood and mask.
  const senior = person(g, '#eceff1', '#cfd8dc', '#2b1b10', 0.3, 0.88, Math.PI - 0.45, 'female', true);
  const wand = wandTool(g);
  const rest = v3(MS.mouse[0] + 0.12, T + 0.05, MS.mouse[2] - 0.02);
  const tools: Partial<Record<FbTool, HeldTool>> = { wand: { tool: wand.root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pen', radius: 0.013 } } } };
  const spots: Record<string, Spot> = { fbDefect: seatAt(g, 'fbDefect', MS.seat), semiconductor_learnDefect: seatAt(g, 'fbLearn', MS.seat) };
  const tgt = new THREE.Vector3();
  const show = (now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(wand.root, P.wand ?? null, [rest.x, rest.y, rest.z]);
    wand.wafer.visible = (n.onWand ?? 0) > 0.5;
    fade(wand.film, 0);
    wafer.visible = (n.onStage ?? 0) > 0.5 || !N;
    (light.material as THREE.MeshBasicMaterial).color.set((n.scan ?? 0) > 0.5 ? '#fff8c4' : '#9aa5b5');
    knob.rotation.x = (now === 'fbDefect' ? (n.focus ?? 0) : 0) * 5;
    wafer.rotation.y = 0.12 * Math.sin(t * 0.8) * ((n.scan ?? 0) > 0.5 ? 1 : 0);
    // The senior.
    senior.root.visible = now === 'semiconductor_learnDefect';
    if (senior.root.visible) {
      const pt = (n.point ?? 0) > 0.5;
      tgt.set(MS.screen[0] - 0.1, MS.screen[1], MS.screen[2] + 0.06);
      senior.armR(pt ? tgt : null);
      senior.armL(null);
      senior.opts.nod = (n.nodSr ?? 0) > 0.5 ? 0.25 * Math.sin(t * 6) : 0.14;
      senior.head.rotation.x = senior.opts.nod;
    }
    const map = clamp01(n.map);
    const zoom = clamp01(n.zoom);
    const marked = clamp01(n.marked);
    const f = N ? clamp01(n.focus) : 1;
    screen.draw(`${q(map, 8)}|${q(zoom, 16)}|${q(marked, 4)}|${q(f, 10)}|${N ? 1 : 0}`, (c) => {
      const w = 320;
      const h = 204;
      c.fillStyle = '#0f1720';
      c.fillRect(0, 0, w, h);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, w, 24);
      text(c, '불량 검사 · 로트 7A', 8, 12, 14, '#ffffff');
      text(c, `${q(marked, 1) + 7}건`, w - 8, 12, 14, marked > 0.5 ? '#ff8a80' : AMBER_L, 'right');
      // The wafer map at the left.
      const cx = 76;
      const cy = 118;
      c.fillStyle = '#39414f';
      c.beginPath();
      c.arc(cx, cy, 62, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(160,200,240,0.3)';
      for (let i = -6; i <= 6; i++) {
        c.beginPath();
        c.moveTo(cx + i * 10, cy - 58);
        c.lineTo(cx + i * 10, cy + 58);
        c.moveTo(cx - 58, cy + i * 10);
        c.lineTo(cx + 58, cy + i * 10);
        c.stroke();
      }
      c.fillStyle = '#ff8a80';
      const R = seeded(5);
      for (let i = 0; i < 7; i++) {
        const a = R() * Math.PI * 2;
        const rr = R() * 54;
        c.fillRect(cx + Math.cos(a) * rr - 2, cy + Math.sin(a) * rr - 2, 4, 4);
      }
      c.strokeStyle = AMBER;
      c.lineWidth = 2;
      c.strokeRect(cx + 16, cy - 28, 18, 18);
      // The field of view at the right: a die's lines, a dark speck across two of them.
      const x0 = 150;
      const y0 = 34;
      const fw = 160;
      const fh = 160;
      c.save();
      c.beginPath();
      c.rect(x0, y0, fw, fh);
      c.clip();
      c.fillStyle = '#7f8ca8';
      c.fillRect(x0, y0, fw, fh);
      const scale = 1 + 2.4 * zoom;
      c.strokeStyle = '#d7deeb';
      c.lineWidth = 4 * scale;
      for (let i = -3; i < 4; i++) {
        c.beginPath();
        const x = x0 + fw / 2 + i * 22 * scale;
        c.moveTo(x, y0);
        c.lineTo(x, y0 + fh);
        c.stroke();
      }
      c.fillStyle = '#1a1420';
      c.beginPath();
      c.arc(x0 + fw / 2 + 6 * scale, y0 + fh / 2 - 4 * scale, pos(7 * scale), 0, Math.PI * 2);
      c.fill();
      // Out of focus, a wash over it all.
      c.fillStyle = `rgba(127,140,168,${(0.75 * (1 - f)).toFixed(2)})`;
      c.fillRect(x0, y0, fw, fh);
      if (marked > 0.5) {
        c.strokeStyle = '#ff5252';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x0 + fw / 2 + 6 * scale, y0 + fh / 2 - 4 * scale, pos(13 * scale), 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
      if (map < 0.5 && N) {
        c.fillStyle = 'rgba(15,23,32,0.55)';
        c.fillRect(10, 30, 130, 170);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, MS.mouse[0], MS.mouse[1], MS.mouse[2]);
}

// =============================================================================================
// 수율 회의 보드 (fbYieldBoard, 3 × 1): a wide board with the week's yield; a list of lots, a red hold button, two colleagues.

/** The week's yield: invented, and fine until something goes wrong. */
const DAYS = [0.68, 0.7, 0.67, 0.72, 0.7, 0.71, 0.72, 0.72];
const chartY = (v: number, h: number) => h - v * h;
function yieldBoard(g: THREE.Group, out: Built) {
  const zB = YB.board;
  part(g, box(2.9, 1.34, 0.05), '#eef1f2', 0, 1.44, zB - 0.03);
  part(g, box(2.94, 0.04, 0.09), GREY, 0, 0.76, zB - 0.01, { outline: false });
  for (const sx of [-1.36, 1.36]) part(g, box(0.05, 2.06, 0.05), GREY_D, sx, 1.03, zB - 0.05, { outline: false });
  // The tray and pens; what the marker's picked from.
  part(g, box(1.2, 0.03, 0.14), GREY, 0.52, YB.tray[1] - 0.03, zB + 0.08, { outline: false });
  for (const x of [0.32, 0.5, 1.1]) part(g, cyl(0.01, 0.01, 0.12, 8), x < 0.4 ? BLUE : x < 0.6 ? RED : GREEN, x, YB.tray[1] - 0.003, zB + 0.1, { rz: Math.PI / 2, outline: false });
  // The chart.
  const Cw = YB.x1 - YB.x0;
  const Ch = YB.y1 - YB.y0;
  const mid = onChart(0.5, 0.5);
  const chart = liveScreen(g, Cw, Ch, 480, 256, mid[0], mid[1], zB + 0.002);
  // The title, the lot list, the button.
  label(g, `${FAB} · 주간 수율 회의`, 1.2, 0.1, -0.4, 1.95, zB + 0.001, NAVY, '#ffffff');
  picture(g, painted('fbLots', 200, 320, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 200, 320);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 200, 42);
    text(c, '이번 주 로트', 100, 22, 22, '#ffffff', 'center');
    ['로트 7A', '로트 7B', '로트 8C', '로트 8D', '로트 9A', '로트 9B'].forEach((s, i) => {
      text(c, s, 14, 70 + i * 40, 20, BLACK);
      c.fillStyle = i === 3 ? '#ffcdd2' : '#c8e6c9';
      c.fillRect(120, 54 + i * 40, 64, 30);
    });
  }), 0.46, 0.64, 1.0, 1.6, zB + 0.003);
  part(g, box(0.24, 0.16, 0.05), GRAPHITE, YB.hold[0], YB.hold[1], zB + 0.01);
  const btn = ownLit(g, cyl(0.04, 0.045, 0.03, 16), '#a12d2d', YB.hold[0], YB.hold[1], YB.hold[2]);
  btn.rotation.x = Math.PI / 2;
  label(g, '로트 정지', 0.22, 0.05, YB.hold[0], YB.hold[1] - 0.11, zB + 0.03, '#ffffff', RED);
  const beacon = ownLit(g, cyl(0.04, 0.045, 0.08, 14), '#5a1a1a', 1.22, 2.12, zB - 0.02);
  // The two by the board: they turn to whoever's speaking.
  const A = person(g, '#eceff1', '#37474f', '#1a1a1a', -1.22, 0.42, Math.PI - 0.6, 'male');
  const B = person(g, '#cfd8dc', '#455a64', '#5b3a1e', 1.22, 0.42, Math.PI + 0.55, 'female');
  A.root.visible = B.root.visible = true;
  const mk = markerTool(g, RED);
  const tools: Partial<Record<FbTool, HeldTool>> = { marker: { tool: mk, lead: 'right', grips: penGrip(v3(0, 0, -1)) } };
  const spots: Record<string, Spot> = {
    fbYield: standAt(g, 'fbYield', -0.05, YB.stand),
    fbYieldAlarm: standAt(g, 'fbYieldCrash', 0.12, YB.stand),
    semiconductor_leadYield: standAt(g, 'fbYieldLead', 0, YB.stand + 0.22),
  };
  const home: V = [YB.tray[0], YB.tray[1] + 0.02, YB.tray[2] + 0.09];
  const nodV = new THREE.Vector3();
  const show = (_now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(mk, P.marker ?? null, home);
    mk.rotation.set(0, 0, 0);
    const crash = (n.crash ?? 0) > 0.5;
    const flash = crash && (n.beacon ?? 0) > 0.5 && Math.sin(t * 9) > 0;
    setLit(beacon, flash ? '#ff3b30' : '#5a1a1a');
    const held = clamp01(n.held);
    setLit(btn, held > 0.5 ? '#ff5252' : '#a12d2d');
    btn.position.z = YB.hold[2] - 0.012 * held;
    const says = (n.says ?? 0) > 0.5;
    const nods = (n.nods ?? 0) > 0.5;
    for (const [i, F] of [A, B].entries()) {
      F.opts.nod = nods ? 0.14 + 0.16 * Math.sin(t * 6 + i) : 0.05;
      F.head.rotation.x = F.opts.nod;
      nodV.set(i === 0 ? -1.0 : 1.0, 1.5 + 0.05 * Math.sin(t * 4), 0.1);
      F.armR(i === 0 && says ? nodV : null);
      F.armL(i === 1 && says ? nodV : null);
    }
    const rec = clamp01(n.recover);
    const ring = clamp01(n.ring);
    const plan = clamp01(n.plan);
    const goal = clamp01(n.goal);
    chart.draw(`${crash ? 1 : 0}|${q(ring, 10)}|${q(rec, 16)}|${q(plan, 16)}|${q(goal, 16)}|${q(held, 1)}`, (c) => {
      const w = 480;
      const h = 256;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d8dee2';
      c.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(0, (i * h) / 5);
        c.lineTo(w, (i * h) / 5);
        c.stroke();
      }
      text(c, '수율 %', 8, 14, 15, GREY_D);
      ['월', '화', '수', '목', '금', '토', '일', '오늘'].forEach((s, i) => text(c, s, 16 + (i * (w - 56)) / 7, h - 12, 14, GREY_D, 'left', false));
      const X = (i: number) => 20 + (i * (w - 60)) / 7;
      // The goal line, written by the one chairing it.
      if (goal > 0.02) {
        c.strokeStyle = GREEN;
        c.setLineDash([9, 6]);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0.42 * w, chartY(0.2, h));
        c.lineTo((0.42 + 0.5 * goal) * w, chartY(0.2, h));
        c.stroke();
        c.setLineDash([]);
        text(c, '목표', 0.42 * w + 2, chartY(0.2, h) - 14, 16, GREEN);
      }
      c.strokeStyle = BLUE;
      c.lineWidth = 4;
      c.beginPath();
      DAYS.forEach((v, i) => {
        const y = chartY(i === 7 && crash ? 0.3 + (v - 0.3) * rec : v, h);
        if (i === 0) c.moveTo(X(i), y);
        else c.lineTo(X(i), y);
      });
      c.stroke();
      c.fillStyle = BLUE;
      DAYS.forEach((v, i) => {
        c.beginPath();
        c.arc(X(i), chartY(i === 7 && crash ? 0.3 + (v - 0.3) * rec : v, h), 5, 0, Math.PI * 2);
        c.fill();
      });
      if (crash && ring > 0.02) {
        c.strokeStyle = RED;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(X(7), chartY(0.3, h), pos(32 * ring), 0, Math.PI * 2 * ring);
        c.stroke();
      }
      if (crash) text(c, rec > 0.8 ? '회복!' : held > 0.5 ? '로트 8D 정지' : '수율 급락!', w * 0.5, 34, 26, rec > 0.8 ? GREEN : RED, 'center');
      // The next week's plan, drawn on.
      if (plan > 0.02) {
        c.strokeStyle = RED;
        c.lineWidth = 4;
        c.beginPath();
        const a0 = 0.72;
        c.moveTo(a0 * w, chartY(0.62, h));
        c.lineTo((a0 + 0.2 * plan) * w, chartY(0.62 + 0.08 * plan, h));
        c.stroke();
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, mid[0], mid[1], zB + 0.08);
}

// =============================================================================================
// 가스·약액 캐비닛 (fbChemCabinet, 3 × 1): a gas cabinet with cylinders behind wired glass, acids in a vented cupboard, a board of gauges.

function dial(g: THREE.Object3D, x: number, y: number, z: number, r = 0.06) {
  part(g, cyl(r, r, 0.02, 20), BLACK, x, y, z, { rx: Math.PI / 2, outline: false });
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 20), new THREE.MeshBasicMaterial({
    map: painted('fbDial', 64, 64, (c) => {
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
function chemCabinet(g: THREE.Group, out: Built) {
  const T = 1.92;
  // Gas: the cabinet with its door and two cylinders.
  const gx = CH.gauge[0];
  part(g, rbox(0.92, T, 0.7, 0.02), '#fbc02d', gx, T / 2, -0.11);
  part(g, box(0.84, T - 0.1, 0.01), '#3d3320', gx, T / 2, 0.245, { outline: false });
  const cyls = [-0.18, 0.18].map((dx, i) => {
    const m = group(g, gx + dx, 0, 0.02);
    part(m, cyl(0.1, 0.1, 1.24, 18), i === 0 ? '#4e7da6' : '#6d8e60', 0, 0.68, 0);
    part(m, ball(0.1), i === 0 ? '#4e7da6' : '#6d8e60', 0, 1.3, 0);
    part(m, cyl(0.03, 0.03, 0.1, 10), CHROME, 0, 1.42, 0, { outline: false });
    part(m, box(0.2, 0.012, 0.012), GREY_D, 0, 0.92, 0.1, { outline: false });
    label(m, i === 0 ? 'N₂' : 'Ar', 0.08, 0.05, 0, 0.72, 0.102, '#ffffff', BLACK);
    return m;
  });
  void cyls;
  const valve = group(g, CH.valve[0], CH.valve[1], CH.valve[2]);
  part(valve, cyl(0.05, 0.05, 0.014, 18), RED, 0, 0, 0, { rx: Math.PI / 2 });
  part(valve, box(0.11, 0.014, 0.014), RED, 0, 0, 0.008, { outline: false });
  part(g, cyl(0.012, 0.012, 0.32, 8), CHROME, gx, 1.28, 0.2, { outline: false });
  const needleGas = dial(g, CH.gauge[0], CH.gauge[1], 0.25);
  // The cabinet door, hinged at its left, with wired glass.
  const door = group(g, CH.doorHinge, 0, 0.255);
  part(door, box(0.04, T - 0.1, 0.03), '#f9a825', 0.02, T / 2, 0);
  part(door, box(0.04, T - 0.1, 0.03), '#f9a825', 0.82, T / 2, 0);
  part(door, box(0.84, 0.05, 0.03), '#f9a825', 0.42, T - 0.08, 0);
  part(door, box(0.84, 0.5, 0.03), '#f9a825', 0.42, 0.3, 0);
  glass(door, 0.78, 1.26, 0.42, 1.18, 0.002, 0, 0.16);
  label(door, '고압 가스', 0.5, 0.11, 0.42, 0.42, 0.018, RED, '#ffffff');
  label(door, '허가자 외 조작 금지', 0.56, 0.06, 0.42, 0.28, 0.018, '#ffffff', RED);
  part(door, box(0.03, 0.2, 0.05), GRAPHITE, 0.78, 1.0, 0.03);
  // Acids: a blue vented cabinet, shelves of bottles behind glass, a tray.
  const ax = 0;
  part(g, rbox(0.92, T, 0.7, 0.02), '#1565c0', ax, T / 2, -0.11);
  part(g, box(0.84, 1.04, 0.01), '#dfe9f3', ax, 1.36, 0.245, { outline: false });
  const r = seeded(17);
  for (let j = 0; j < 3; j++) {
    part(g, box(0.8, 0.012, 0.03), GREY, ax, 0.9 + j * 0.34, 0.24, { outline: false });
    for (let i = 0; i < 4; i++) {
      const c = ['#90caf9', '#fff59d', '#c8e6c9', '#f8bbd0'][Math.floor(r() * 4)];
      part(g, cyl(0.045, 0.05, 0.18, 12), c, ax - 0.27 + i * 0.18, 1.0 + j * 0.34, 0.25);
      part(g, cyl(0.02, 0.02, 0.03, 8), '#eceff1', ax - 0.27 + i * 0.18, 1.11 + j * 0.34, 0.25, { outline: false });
    }
  }
  glass(g, 0.84, 1.04, ax, 1.36, 0.262, 0, 0.2);
  label(g, '산성 약액', 0.5, 0.11, ax, 0.56, 0.245, '#ffffff', '#1565c0');
  picture(g, painted('fbHazard', 96, 96, (c) => {
    c.fillStyle = AMBER;
    c.beginPath();
    c.moveTo(48, 8);
    c.lineTo(92, 86);
    c.lineTo(4, 86);
    c.closePath();
    c.fill();
    text(c, '!', 48, 60, 56, BLACK, 'center');
  }), 0.18, 0.18, ax, 0.32, 0.25);
  // The board of gauges.
  const bx = CH.board[0];
  part(g, rbox(0.92, T, 0.5, 0.02), '#eceff1', bx, T / 2, -0.17);
  label(g, '배관 압력판', 0.6, 0.09, bx, T - 0.12, 0.085, NAVY, '#ffffff');
  const needles = [[-0.26, 0.2], [0, 0.2], [0.26, 0.2], [-0.26, -0.08], [0, -0.08], [0.26, -0.08]].map(([dx, dy]) => dial(g, bx + dx, CH.board[1] + dy, 0.09, 0.075));
  for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 0.8, 8), [AMBER, CHROME, '#90caf9', CHROME][i], bx - 0.3 + i * 0.2, 0.5, 0.1, { outline: false });
  const clip = clipTool(g);
  const tools: Partial<Record<FbTool, HeldTool>> = { clip: { tool: clip.root, lead: 'left', grips: { left: { at: v3(0, -0.02, 0.06), axis: v3(1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 } } } };
  const spots: Record<string, Spot> = { fbGas: standAt(g, 'fbGas', CH.gauge[0] + 0.04, CH.stand) };
  const show = (now: string | null, N: FbNow | null, t: number) => {
    const n = N?.n ?? {};
    at(clip.root, now ? (N?.props.clip ?? null) : null);
    door.rotation.y = -1.25 * clamp01(n.door);
    valve.rotation.z = (n.turn ?? 0) * 1.2;
    const gauge = n.gauge ?? 0.72;
    needleGas.rotation.z = 0.7 - 1.4 * gauge + 0.01 * Math.sin(t * 3);
    needles.forEach((m, i) => (m.rotation.z = 0.5 - 0.9 * (0.6 + 0.04 * i) + 0.02 * Math.sin(t * 2 + i)));
    const ticks = n.ticks ?? 0;
    clip.ticks[0].visible = ticks > 0.5;
    clip.ticks[1].visible = ticks > 1.5;
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, CH.gauge[0], CH.gauge[1], 0.3);
}

// =============================================================================================
// Set dressing.

/** A wall of wafer boxes on shelves, tall, its lamps showing which are in. */
function stocker(g: THREE.Group) {
  part(g, rbox(1.94, 2.1, 0.74, 0.03), PANEL, 0, 1.05, -0.1);
  part(g, box(1.8, 1.9, 0.01), GRAPHITE, 0, 1.08, 0.276, { outline: false });
  const r = seeded(3);
  for (let j = 0; j < 4; j++) {
    part(g, box(1.8, 0.02, 0.04), GREY, 0, 0.26 + j * 0.46, 0.28, { outline: false });
    for (let i = 0; i < 4; i++) {
      if (r() < 0.18) continue;
      const m = foupMesh(g, r() < 0.5 ? '#546e7a' : '#607d8b').root;
      m.position.set(-0.66 + i * 0.44, 0.27 + j * 0.46, 0.1);
      m.scale.setScalar(0.92);
      ownLit(g, ball(0.012), r() < 0.8 ? '#76ff8a' : AMBER, -0.5 + i * 0.44, 0.33 + j * 0.46, 0.28);
    }
  }
  glass(g, 1.8, 1.9, 0, 1.08, 0.285, 0, 0.1);
  label(g, '보관 선반 S-1', 0.56, 0.09, 0, 2.03, 0.27, NAVY, '#ffffff');
}
function reticleRack(g: THREE.Group) {
  part(g, rbox(0.92, 1.9, 0.6, 0.02), PANEL, 0, 0.95, -0.14);
  part(g, box(0.82, 1.66, 0.01), '#1f2730', 0, 1.0, 0.168, { outline: false });
  for (let j = 0; j < 6; j++) for (let i = 0; i < 3; i++) {
    part(g, box(0.22, 0.04, 0.02), j === 2 && i === 1 ? '#4a5a6c' : '#cfd8dc', -0.26 + i * 0.26, 0.28 + j * 0.27, 0.178, { outline: false });
    ownLit(g, box(0.02, 0.012, 0.002), j === 2 && i === 1 ? AMBER : '#76ff8a', -0.34 + i * 0.26, 0.28 + j * 0.27, 0.19);
  }
  glass(g, 0.82, 1.66, 0, 1.0, 0.19, 0, 0.12);
  label(g, '레티클 보관', 0.5, 0.08, 0, 1.84, 0.165, NAVY, '#ffffff');
}
/** The bay's yellow light: lamps at the wall, the room washed amber (no blue light gets to the resist). */
function amberBank(g: THREE.Group) {
  part(g, box(0.26, 2.26, 0.12), GREY_D, 0, 1.13, -0.42);
  for (let i = 0; i < 4; i++) {
    part(g, box(0.2, 0.42, 0.04), '#f1d27c', 0, 0.38 + i * 0.52, -0.35);
    ownLit(g, box(0.15, 0.38, 0.012), AMBER_L, 0, 0.38 + i * 0.52, -0.324);
  }
  label(g, '노란 조명 구역', 0.4, 0.1, 0.2, 1.06, -0.322, AMBER, BLACK);
  // The room's own colour: the floor, the wall behind, strips overhead; the bay is 7 × 6 from here.
  const ox = 3;
  const floor = haze(g, new THREE.PlaneGeometry(7, 6), '#ffc23e', 0.26, ox, 0.02, 2);
  floor.rotation.x = -Math.PI / 2;
  haze(g, new THREE.PlaneGeometry(7, 2.5), '#ffc23e', 0.3, ox, 1.25, -0.47);
  for (let i = 0; i < 3; i++) {
    ownLit(g, box(2.2, 0.03, 0.09), AMBER_L, 0.6 + i * 2.4, 2.44, -0.2);
  }
}
function spillStation(g: THREE.Group) {
  part(g, cyl(0.03, 0.03, 2.1, 10), GREEN, 0, 1.05, -0.3, { outline: false });
  part(g, cyl(0.16, 0.05, 0.08, 16), GREEN, 0, 2.1, -0.12);
  rod(g, v3(0, 2.1, -0.3), v3(0, 2.14, -0.12), 0.02, GREEN);
  part(g, cyl(0.12, 0.09, 0.05, 16), '#c8e6c9', 0, 1.02, -0.12);
  part(g, cyl(0.02, 0.02, 0.2, 8), GREEN, 0, 0.9, -0.12, { outline: false });
  part(g, box(0.22, 0.02, 0.02), RED, 0, 1.3, -0.08, { outline: false });
  picture(g, painted('fbEye', 128, 180, (c) => {
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 128, 180);
    text(c, '비상', 64, 44, 34, '#ffffff', 'center');
    text(c, '세안·샤워', 64, 92, 22, '#ffffff', 'center');
    text(c, '15분 이상', 64, 136, 22, '#ffffff', 'center');
  }), 0.26, 0.36, 0, 1.56, -0.28);
  part(g, rbox(0.34, 0.42, 0.26, 0.03), '#ffb300', 0.28, 0.21, 0.14);
  label(g, '흡착포', 0.24, 0.07, 0.28, 0.3, 0.273, '#ffffff', BLACK);
}
function fabSign(g: THREE.Group) {
  part(g, box(0.86, 1.84, 0.05), NAVY, 0, 0.98, -0.38);
  picture(g, painted('fbSign', 340, 720, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 340, 720);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 340, 96);
    text(c, FAB, 170, 50, 42, '#ffffff', 'center');
    text(c, '제3 팹 출입 안내', 170, 132, 26, NAVY, 'center');
    ['① 소지품은 사물함에', '② 방진복·후드·마스크', '③ 장갑은 마지막에', '④ 에어샤워 20초', '⑤ 뛰지 않기'].forEach((s, i) => text(c, s, 28, 208 + i * 72, 26, BLACK));
    c.fillStyle = AMBER;
    c.fillRect(0, 590, 340, 130);
    text(c, '먼지 하나가', 170, 630, 30, BLACK, 'center');
    text(c, '수율을 깎아요', 170, 676, 30, BLACK, 'center');
  }), 0.82, 1.74, 0, 0.98, -0.35);
  part(g, cyl(0.26, 0.28, 0.03, 18), GREY_D, 0, 0.015, -0.36);
}

// =============================================================================================
// Outside (2026-11-05, the layout audit). 보안 게이트·경비실 (fbSiteGate, 2 × 1): the guard booth with its window and the badge
// reader, the barrier arm out along the pavement. 가스 탱크·배기 스크러버 (fbGasYard, 2 × 2): a tall bulk gas tank on its legs
// in a fenced pen, the scrubber's box beside it with the duct up the wall. 가스실 경고 표지 (fbGasWarning, 1 × 1): the plate on
// the gas room's door.

function siteGate(g: THREE.Group) {
  // The booth on the right tile.
  part(g, rbox(0.86, 2.3, 0.86, 0.03), WHITE, 0.5, 1.15, -0.02);
  part(g, rbox(0.96, 0.08, 0.96, 0.02), NAVY, 0.5, 2.34, -0.02);
  part(g, box(0.62, 0.62, 0.012), '#a8d0e8', 0.5, 1.45, 0.415, { outline: false });
  part(g, box(0.012, 0.62, 0.5), '#a8d0e8', 0.065, 1.45, -0.02, { outline: false });
  label(g, '경비실 · 출입 보안', 0.7, 0.12, 0.5, 2.1, 0.43, NAVY, '#ffffff');
  label(g, `${FAB} · 사원증 태그`, 0.8, 0.09, 0.5, 0.95, 0.425, '#ffffff', NAVY);
  // The badge reader post and the barrier's housing on the left tile, the arm raised for the walkway.
  part(g, rbox(0.22, 1.0, 0.22, 0.02), GRAPHITE, -0.2, 0.5, 0.15);
  part(g, box(0.14, 0.18, 0.02), BLACK, -0.2, 1.1, 0.265);
  part(g, box(0.1, 0.04, 0.005), GREEN, -0.2, 1.15, 0.276, { outline: false });
  part(g, rbox(0.3, 0.9, 0.3, 0.03), '#f5f5f5', -0.7, 0.45, -0.25);
  for (let i = 0; i < 6; i++) {
    const a = v3(-0.7 - i * 0.04, 0.9 + i * 0.26, -0.25);
    rod(g, a, v3(-0.7 - (i + 1) * 0.04, 0.9 + (i + 1) * 0.26, -0.25), 0.035, i % 2 ? RED : WHITE);
  }
}

function gasYard(g: THREE.Group) {
  // The pen: a low kerb and a chain-link fence along the street side and the ends.
  part(g, box(1.94, 0.1, 1.94), '#b0b7bd', 0, 0.05, 0);
  for (const [x, z, w, d] of [[0, 0.95, 1.94, 0.03], [-0.95, 0, 0.03, 1.94], [0.95, 0, 0.03, 1.94]] as const) {
    const fence = part(g, box(w, 1.3, d), '#9aa4ab', x, 0.75, z, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#9aa4ab', transparent: true, opacity: 0.45, depthWrite: false }) });
    fence.userData.ownMaterial = true;
    part(g, box(w === 0.03 ? 0.04 : w, 0.04, d === 0.03 ? 0.04 : d), GREY_D, x, 1.4, z, { outline: false });
  }
  // The tank: a tall white cylinder on four legs, a gauge and a valve.
  for (const [lx, lz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) part(g, box(0.06, 0.5, 0.06), GREY_D, -0.45 + lx, 0.35, -0.35 + lz);
  part(g, cyl(0.42, 0.42, 2.2, 20), WHITE, -0.45, 1.7, -0.35);
  part(g, ball(0.42), WHITE, -0.45, 2.8, -0.35);
  part(g, cyl(0.08, 0.08, 0.02, 14), PAPER, -0.45, 1.2, 0.08, { rx: Math.PI / 2 });
  rod(g, v3(-0.45, 0.6, -0.35), v3(-0.45, 0.4, 0.2), 0.03, STEEL);
  label(g, 'N₂ 질소 · 고압가스', 0.6, 0.1, -0.45, 1.75, 0.075, '#ffffff', NAVY);
  // The scrubber: a grey box with its fan, the duct running up the wall.
  part(g, rbox(0.7, 1.3, 0.7, 0.03), PANEL_D, 0.5, 0.75, -0.45);
  part(g, cyl(0.2, 0.2, 0.04, 16), GRAPHITE, 0.5, 1.42, -0.45);
  part(g, cyl(0.13, 0.13, 2.0, 12), STEEL, 0.5, 2.4, -0.85);
  rod(g, v3(0.5, 1.2, -0.75), v3(0.5, 1.4, -0.85), 0.13, STEEL);
  label(g, '배기 스크러버', 0.5, 0.09, 0.5, 1.05, -0.095, AMBER, BLACK);
}

function gasWarning(g: THREE.Group) {
  picture(g, painted('fbGasWarn', 200, 260, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 200, 260);
    c.fillStyle = AMBER;
    c.beginPath();
    c.moveTo(100, 14);
    c.lineTo(180, 140);
    c.lineTo(20, 140);
    c.closePath();
    c.fill();
    text(c, '!', 100, 120, 80, BLACK, 'center');
    text(c, '가스·약액실', 100, 180, 26, RED, 'center');
    text(c, '관계자 외 출입 금지', 100, 214, 18, BLACK, 'center');
    text(c, '가스 감지기 작동 중', 100, 242, 16, NAVY, 'center', false);
  }), 0.4, 0.52, 0, 1.55, -0.47);
  part(g, box(0.44, 0.56, 0.02), RED, 0, 1.55, -0.485, { outline: false });
}

export const BUILDERS: Record<string, Builder> = {
  fbGownBench(g, _W, _D, _c, _def, _ctx, out) {
    gownBench(g, out);
  },
  fbAirShower(g, _W, _D, _c, _def, _ctx, out) {
    airShower(g, out);
  },
  fbLitho(g, W, _D, _c, _def, _ctx, out) {
    litho(g, out, W);
  },
  fbCoater(g, _W, _D, _c, _def, _ctx, out) {
    coater(g, out);
  },
  fbFoupRail(g, _W, _D, _c, _def, _ctx, out) {
    foupRail(g, out);
  },
  fbWaferRobot(g, _W, _D, _c, _def, _ctx, out) {
    waferRobot(g, out);
  },
  fbEtchRow(g, _W, _D, _c, _def, _ctx, out) {
    etchRow(g, out);
  },
  fbWetBench(g, _W, _D, _c, _def, _ctx, out) {
    wetBench(g, out);
  },
  fbMicroscope(g, _W, _D, _c, _def, _ctx, out) {
    microscope(g, out);
  },
  fbYieldBoard(g, _W, _D, _c, _def, _ctx, out) {
    yieldBoard(g, out);
  },
  fbChemCabinet(g, _W, _D, _c, _def, _ctx, out) {
    chemCabinet(g, out);
  },
  fbStocker(g) {
    stocker(g);
  },
  fbReticleRack(g) {
    reticleRack(g);
  },
  fbAmberBank(g) {
    amberBank(g);
  },
  fbSpillStation(g) {
    spillStation(g);
  },
  fbFabSign(g) {
    fabSign(g);
  },
  fbSiteGate(g) {
    siteGate(g);
  },
  fbGasYard(g) {
    gasYard(g);
  },
  fbGasWarning(g) {
    gasWarning(g);
  },
  fbStickyMat(g) {
    stickyMat(g);
  },
};
