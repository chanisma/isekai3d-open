import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { AN, BB, CF, IC, LT_LIVE, MB, PB, RC, RS, SF, VD, ltNow, ltPhase, runAt } from './labTechnicianMotion';
import type { LtMotion, LtNow, LtTool } from './labTechnicianMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 진단검사센터 drawn as itself (2026-11-01, workplace pipeline), a clinical lab of a made-up name, 맑은샘 검사의학.
 * Tubes in racks with their caps in the colours of what they're for, an analyser whose belt, probe and wheel of cuvettes really run
 * and whose screen fills in as they do, a centrifuge whose lid and rotor turn, a microscope with its field on a small screen, a
 * bench of pipettes and a plate of wells, a blood-culture cabinet with a map of its bottles, cold stores, a hatch a courier comes to,
 * a desk that flags a critical value and phones it through, a waste bin with a pedal. No gore: tubes and colours only.
 * Everything that moves follows labTechnicianMotion.ts.
 */

const FIRM = '맑은샘 검사의학';
const WHITE = '#f1f4f5';
const PANEL = '#dfe5e8';
const PANEL_D = '#b4bfc5';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const TEAL = '#00838f';
const TEAL_D = '#005662';
const AMBER = '#ffb300';
const RED = '#e53935';
const GREEN = '#43a047';
const LED = '#76ff8a';
const ICE = '#d9f2ff';
const SKIN = '#f1c9a5';
const GLASSY = '#f3f0e6';
/** Tube caps: lavender for counts, gold for chemistry, green, light blue, and red for what's urgent. */
const CAPS = ['#7e57c2', '#fbc02d', '#43a047', '#4fc3f7', '#e53935'];
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP_V = v3(0, 1, 0);
const tmp = new THREE.Vector3();
const tA = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
/** A radius that can't throw on a canvas. */
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const PI = Math.PI;

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
function glass(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, opacity = 0.18): THREE.Mesh {
  return haze(g, new THREE.PlaneGeometry(w, h), '#cfe8f5', opacity, x, y, z);
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
function standAt(g: THREE.Object3D, motion: LtMotion, x = 0, z = 0.72): Spot {
  const s = spot(g, 'stand', x, 0, z, PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: LtMotion, seat: V): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], PI, 0);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<LtTool, HeldTool>>, show: (now: string | null, N: LtNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? ltNow(sp.motion as LtMotion, t, ltPhase(g.getWorldPosition(tmp)), H) : null;
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
function chair(g: THREE.Object3D, seat: V, color = TEAL_D, back = true) {
  const c = group(g, seat[0], 0, seat[2]);
  const T = seat[1];
  part(c, rbox(0.42, 0.07, 0.42, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.24, 0.05, Math.sin(a) * 0.24), 0.014, BLACK);
    part(c, ball(0.026), BLACK, Math.cos(a) * 0.24, 0.028, Math.sin(a) * 0.24, { outline: false });
  }
  if (back) part(c, rbox(0.4, 0.4, 0.06, 0.04), color, 0, T + 0.3, 0.24, { rx: 0.1 });
}
/** A status tower: red, amber, green on a pole. */
function tower(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.012, 0.012, 0.08, 6), GREY_D, x, y + 0.04, z, { outline: false });
  const lamps = [RED, AMBER, GREEN].map((c, i) => ownLit(g, cyl(0.03, 0.03, 0.045, 12), shade(c, 0.5), x, y + 0.1 + i * 0.05, z));
  return (which: number) => lamps.forEach((m, i) => setLit(m, i === which ? [RED, AMBER, LED][i] : shade([RED, AMBER, GREEN][i], 0.45)));
}
function stripLamp(g: THREE.Object3D, w: number, x: number, y: number, z: number) {
  part(g, box(w + 0.04, 0.03, 0.09), GREY, x, y + 0.018, z, { outline: false });
  ownLit(g, box(w, 0.012, 0.07), ICE, x, y, z);
}
/** A tube standing somewhere and going nowhere. */
function fixedTube(g: THREE.Object3D, x: number, y: number, z: number, cap: string, r = 0.009) {
  part(g, cyl(r, r, 0.08, 8), GLASSY, x, y, z, { outline: false });
  part(g, cyl(r + 0.002, r + 0.002, 0.024, 8), cap, x, y + 0.05, z, { outline: false });
}
/** A rack of five tubes on a shelf; `y` is its base. */
function fixedRack(g: THREE.Object3D, x: number, y: number, z: number, seed: number) {
  part(g, box(0.24, 0.05, 0.06), '#eceff1', x, y + 0.025, z);
  for (let i = 0; i < 5; i++) fixedTube(g, x - 0.09 + i * 0.045, y + 0.06, z, CAPS[wrap(seed + i * (seed % 2 ? 1 : 2), 4)]);
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

/** A tube, its middle at the origin. Its cap is one of `caps`; `parted` is what it looks like after the centrifuge. */
function tubeTool(g: THREE.Object3D, name: string, caps: readonly string[], fill = '#c9a25e') {
  const root = group(g);
  root.name = name;
  part(root, cyl(0.012, 0.011, 0.1, 10), GLASSY, 0, -0.008, 0, { outline: false });
  const whole = part(root, cyl(0.0125, 0.0115, 0.056, 10), fill, 0, -0.026, 0, { outline: false });
  const low = part(root, cyl(0.0125, 0.0115, 0.034, 10), '#9c4a4e', 0, -0.037, 0, { outline: false });
  const high = part(root, cyl(0.0125, 0.0125, 0.024, 10), '#f4d98a', 0, -0.008, 0, { outline: false });
  low.visible = high.visible = false;
  part(root, box(0.018, 0.04, 0.002), '#ffffff', 0, -0.006, 0.0125, { outline: false });
  part(root, box(0.014, 0.024, 0.0015), BLACK, 0, -0.006, 0.0136, { outline: false });
  const capMeshes = caps.map((c) => part(root, cyl(0.0145, 0.0145, 0.028, 10), c, 0, 0.056, 0, { outline: false }));
  const showCap = (i: number) => capMeshes.forEach((m, j) => (m.visible = j === wrap(i, capMeshes.length)));
  showCap(0);
  const setParted = (on: boolean) => {
    whole.visible = !on;
    low.visible = high.visible = on;
  };
  return { root, showCap, setParted };
}
const TUBE_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0.01, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.013 } };
/** A rack of five tubes with a hoop over it, the origin on the hoop's bar. */
function rackTool(g: THREE.Object3D, name: string, seed = 0) {
  const root = group(g);
  root.name = name;
  part(root, cyl(0.011, 0.011, 0.13, 10), TEAL, 0, 0, 0, { rz: PI / 2, outline: false });
  for (const sx of [-1, 1]) rod(root, v3(sx * 0.065, 0, 0), v3(sx * 0.115, -0.12, 0), 0.006, TEAL_D);
  part(root, box(0.25, 0.022, 0.05), '#eceff1', 0, -0.129, 0, { outline: false });
  part(root, box(0.25, 0.014, 0.05), TEAL, 0, -0.095, 0, { outline: false });
  const tubes = [0, 1, 2, 3, 4].map((i) => {
    const x = -0.09 + i * 0.045;
    part(root, cyl(0.0095, 0.0095, 0.08, 8), GLASSY, x, -0.09, 0, { outline: false });
    part(root, cyl(0.0098, 0.009, 0.046, 8), '#c9a25e', x, -0.106, 0, { outline: false });
    return part(root, cyl(0.0115, 0.0115, 0.022, 8), CAPS[wrap(seed + i, CAPS.length - 1)], x, -0.04, 0, { outline: false });
  });
  return { root, tubes };
}
const RACK_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(-1, 0, 0), shape: 'power', radius: 0.012 } };
/** A test cartridge held by its end. */
function cartridgeTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ltCartridge';
  part(root, box(0.09, 0.014, 0.13), '#eef1f3', 0, 0, 0, { outline: false });
  part(root, box(0.05, 0.002, 0.02), '#7e57c2', 0, 0.008, -0.03, { outline: false });
  for (let i = 0; i < 4; i++) part(root, box(0.008, 0.002, 0.05), '#90a4ae', -0.03 + i * 0.02, 0.008, 0.015, { outline: false });
  return root;
}
const CART_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0.05), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.008 } };
function slideTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ltSlide';
  part(root, box(0.076, 0.003, 0.026), '#dff1f7', 0, 0, 0, { outline: false });
  part(root, box(0.02, 0.0035, 0.024), '#f8bbd0', -0.024, 0, 0, { outline: false });
  part(root, box(0.03, 0.0035, 0.018), '#d1a4d6', 0.012, 0, 0, { outline: false });
  return root;
}
const SLIDE_GRIP: HeldTool['grips'] = { right: { at: v3(0.03, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.005 } };
/** The pipette: the grip at the origin, its tip 0.17 below, the plunger under the thumb. */
function pipetteTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ltPipette';
  part(root, cyl(0.016, 0.015, 0.12, 12), '#eceff1', 0, 0, 0, { outline: false });
  part(root, cyl(0.016, 0.009, 0.05, 12), '#b0bec5', 0, -0.085, 0, { outline: false });
  part(root, box(0.03, 0.012, 0.02), TEAL, 0, 0.03, 0.012, { outline: false });
  const plunger = group(root);
  part(plunger, cyl(0.004, 0.004, 0.04, 8), STEEL, 0, 0.075, 0, { outline: false });
  part(plunger, cyl(0.012, 0.012, 0.012, 12), TEAL, 0, 0.098, 0, { outline: false });
  const tip = group(root);
  part(tip, cyl(0.005, 0.0015, 0.06, 10), '#f4fbff', 0, -0.14, 0, { outline: false });
  const liquid = part(tip, cyl(0.003, 0.0015, 0.03, 8), '#f0c24a', 0, -0.155, 0, { outline: false });
  return { root, plunger, tip, liquid };
}
const PIPETTE_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.016 } };
/** A culture bottle, its middle at the origin; a dot of sensor in its foot. */
function bottleTool(g: THREE.Object3D, name: string, sensor: string) {
  const root = group(g);
  root.name = name;
  part(root, cyl(0.03, 0.032, 0.09, 14), '#e8f0ec', 0, -0.012, 0, { outline: false });
  part(root, cyl(0.031, 0.033, 0.046, 14), '#e6b872', 0, -0.03, 0, { outline: false });
  part(root, cyl(0.013, 0.028, 0.024, 12), '#e8f0ec', 0, 0.044, 0, { outline: false });
  part(root, cyl(0.016, 0.016, 0.018, 12), '#6a7fce', 0, 0.062, 0, { outline: false });
  part(root, cyl(0.034, 0.034, 0.008, 14), sensor, 0, -0.054, 0, { outline: false });
  part(root, box(0.03, 0.04, 0.002), '#ffffff', 0, -0.006, 0.0325, { outline: false });
  return root;
}
const BOTTLE_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.03 } };
/** A reagent pack hanging from its strap handle. */
function packTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ltPack';
  part(root, cyl(0.011, 0.011, 0.08, 10), GRAPHITE, 0, 0, 0, { rz: PI / 2, outline: false });
  for (const sx of [-1, 1]) part(root, box(0.012, 0.03, 0.012), GRAPHITE, sx * 0.038, -0.02, 0, { outline: false });
  part(root, rbox(0.12, 0.15, 0.14, 0.012), '#e3f2fd', 0, -0.11, 0, { outline: false });
  part(root, box(0.122, 0.04, 0.142), '#1e88e5', 0, -0.06, 0, { outline: false });
  label(root, '시약 B', 0.09, 0.04, 0, -0.12, 0.072, '#ffffff', BLACK);
  return root;
}
const PACK_GRIP: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(-1, 0, 0), shape: 'power', radius: 0.012 } };
function tabletTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ltTablet';
  const tilt = group(root);
  tilt.rotation.x = -0.55;
  part(tilt, rbox(0.24, 0.17, 0.012, 0.006), GRAPHITE, 0, 0, 0, { outline: false });
  picture(tilt, painted('ltTabletFace', 192, 136, (c) => {
    c.fillStyle = '#f3f8f9';
    c.fillRect(0, 0, 192, 136);
    c.fillStyle = TEAL_D;
    c.fillRect(0, 0, 192, 26);
    text(c, '오늘 업무 배분', 8, 13, 15, '#ffffff');
    ['혈액·화학', '미생물', '접수'].forEach((s, i) => {
      text(c, s, 10, 46 + i * 30, 14, BLACK);
      c.strokeStyle = TEAL;
      c.strokeRect(160, 38 + i * 30, 16, 16);
    });
  }), 0.22, 0.15, 0, 0, 0.007);
  const ticks = [0, 1].map((i) => ownLit(tilt, box(0.016, 0.016, 0.002), GREEN, 0.075, 0.03 - i * 0.038, 0.009));
  return { root, ticks };
}
const TABLET_GRIPS: HeldTool['grips'] = { left: boardGrip(0.55) };
function handsetTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ltHandset';
  part(root, cyl(0.016, 0.016, 0.14, 10), GRAPHITE, 0, 0, 0, { outline: false });
  part(root, rbox(0.04, 0.03, 0.05, 0.01), GRAPHITE, 0, 0.08, 0.01, { outline: false });
  part(root, rbox(0.04, 0.03, 0.05, 0.01), GRAPHITE, 0, -0.08, 0.01, { outline: false });
  return root;
}
function penTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ltPen';
  root.rotation.x = -1;
  part(root, cyl(0.006, 0.006, 0.12, 8), '#1e4f9e', 0, 0, -0.02, { rx: PI / 2, outline: false });
  part(root, cyl(0.006, 0.001, 0.02, 8), CHROME, 0, 0, -0.09, { rx: -PI / 2, outline: false });
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
// 자동 분석기 (analyzerMachine, 2 × 1): cabinet, deck, canopy; belt, probe, wheel; the screen on the right of the deck.

const RESULTS: ReadonlyArray<readonly [string, string, string]> = [['WBC', '6.8', '×10³/㎕'], ['RBC', '4.52', '×10⁶/㎕'], ['Hb', '13.9', 'g/dL'], ['PLT', '245', '×10³/㎕'], ['Glu', '102', 'mg/dL']];
function screenHead(c: Ctx2, w: number, s: string, bg: string, right = '') {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, 40);
  text(c, s, 10, 21, 20, '#ffffff');
  if (right) text(c, right, w - 10, 21, 18, '#ffffff', 'right');
}
function bar(c: Ctx2, x: number, y: number, w: number, h: number, u: number, col: string) {
  c.fillStyle = '#233640';
  c.fillRect(x, y, w, h);
  c.fillStyle = col;
  c.fillRect(x, y, w * clamp01(u), h);
}
function analyzerPaint(c: Ctx2, now: string | null, N: LtNow | null, t: number) {
  const W = 400;
  const H = 290;
  const n = N?.n ?? {};
  c.fillStyle = '#0d1e27';
  c.fillRect(0, 0, W, H);
  if (now === 'runBloodTest') {
    const res = n.res ?? 0;
    screenHead(c, W, '혈액 검사', TEAL_D, `검체 ${Math.min(5, Math.floor(res))}/5`);
    RESULTS.forEach(([k, v, u], i) => {
      const y = 62 + i * 38;
      const has = res > i + 0.75;
      c.fillStyle = i % 2 ? '#14303d' : '#102632';
      c.fillRect(6, y - 18, W - 12, 36);
      text(c, k, 16, y, 20, '#cfe8f5');
      text(c, has ? v : '···', 210, y, 22, has ? '#7ee89e' : '#5d7886', 'right');
      text(c, u, 224, y, 15, '#8fb0bf');
      if (has) text(c, '정상', W - 16, y, 16, '#7ee89e', 'right');
    });
    bar(c, 10, H - 28, W - 20, 14, res / 5, LED);
  } else if (now === 'statSample') {
    const prog = clamp01(n.prog);
    const read = (n.read ?? 0) > 0.5;
    const left = Math.max(0, Math.ceil((1 - prog) * 600));
    screenHead(c, W, '응급 검체', RED, `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`);
    text(c, '응급실 · 검체 3-0917', 14, 62, 18, '#ffd5d2');
    (['K', 'Na', 'Hb'] as const).forEach((k, i) => {
      const y = 104 + i * 42;
      const has = prog > 0.3 + i * 0.25;
      const bad = k === 'K';
      c.fillStyle = bad && has ? '#5c1a1a' : '#14303d';
      c.fillRect(6, y - 18, W - 12, 36);
      text(c, k, 18, y, 22, '#ffffff');
      text(c, has ? ['6.9', '138', '12.8'][i] : '···', 230, y, 24, bad && has ? '#ff8a80' : '#7ee89e', 'right');
      if (bad && has) text(c, '이상 높음', W - 14, y, 18, '#ff8a80', 'right');
    });
    bar(c, 10, H - 40, W - 20, 14, prog, read ? LED : '#ff8a80');
    if (read) text(c, '결과 전송 완료', W / 2, H - 14, 18, '#7ee89e', 'center');
  } else if (now === 'labTechnician_qualityControl') {
    const prog = clamp01(n.prog);
    screenHead(c, W, '정도관리 차트', '#37474f', (n.read ?? 0) > 0.5 ? '합격' : '측정 중');
    const y0 = 165;
    const sd = 42;
    c.strokeStyle = '#7ee89e';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(20, y0);
    c.lineTo(W - 14, y0);
    c.stroke();
    c.lineWidth = 1;
    for (const k of [-2, -1, 1, 2]) {
      c.strokeStyle = Math.abs(k) === 2 ? '#ff8a80' : '#4d6b79';
      c.beginPath();
      c.moveTo(20, y0 + k * sd);
      c.lineTo(W - 14, y0 + k * sd);
      c.stroke();
    }
    const r = seeded(83);
    const shown = 9 + Math.floor(prog * 11);
    c.strokeStyle = '#cfe8f5';
    c.beginPath();
    for (let i = 0; i < shown; i++) {
      const y = y0 + (r() - 0.5) * 2.4 * sd;
      const x = 24 + i * 18;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
    const r2 = seeded(83);
    for (let i = 0; i < shown; i++) {
      const y = y0 + (r2() - 0.5) * 2.4 * sd;
      c.fillStyle = i === shown - 1 ? AMBER : '#cfe8f5';
      c.beginPath();
      c.arc(24 + i * 18, y, pos(4), 0, PI * 2);
      c.fill();
    }
  } else if (now === 'labTechnician_specialTests') {
    const prog = clamp01(n.prog);
    screenHead(c, W, '특수 검사', '#5e35b1', (n.read ?? 0) > 0.5 ? '분석 완료' : `${Math.round(prog * 100)}%`);
    c.strokeStyle = '#d1c4e9';
    c.lineWidth = 3;
    c.beginPath();
    const peak = (x: number, m: number, s: number, a: number) => a * Math.exp(-((x - m) ** 2) / pos(s * s * 2));
    const N2 = Math.floor(prog * 360);
    for (let i = 0; i <= N2; i++) {
      const y = 250 - peak(i, 70, 16, 150) - peak(i, 170, 24, 70) - peak(i, 280, 18, 110);
      if (i) c.lineTo(20 + i, y);
      else c.moveTo(20, y);
    }
    c.stroke();
    c.strokeStyle = '#4d6b79';
    c.lineWidth = 1;
    c.strokeRect(20, 60, 360, 192);
    bar(c, 20, H - 26, 360, 12, prog, '#b39ddb');
  } else {
    screenHead(c, W, `${FIRM} AX-700`, TEAL_D, '대기');
    text(c, `오늘 ${LT_LIVE.runs}건`, 16, 70, 24, '#cfe8f5');
    text(c, '시약 · 세척액 정상', 16, 104, 18, '#7ee89e');
    c.strokeStyle = '#4fc3f7';
    c.lineWidth = 2;
    const r = seeded(29);
    const vals = Array.from({ length: 24 }, () => r());
    const tick = Math.floor(t);
    c.beginPath();
    for (let i = 0; i < 24; i++) {
      const y = 240 - 80 * vals[wrap(i + tick, 24)];
      if (i) c.lineTo(16 + i * 16, y);
      else c.moveTo(16, y);
    }
    c.stroke();
  }
}
function analyzer(g: THREE.Group, out: Built) {
  // The cabinet, with what a machine like this drinks and leaves behind behind its doors.
  part(g, rbox(1.92, 0.88, 0.66, 0.02), WHITE, 0, 0.44, -0.13);
  part(g, box(1.94, 0.06, 0.68), GREY_D, 0, 0.03, -0.13, { outline: false });
  [['시약', -0.66], ['세척액', 0], ['폐액', 0.66]].forEach(([s, x]) => {
    part(g, box(0.6, 0.66, 0.012), PANEL, x as number, 0.44, 0.205, { outline: false });
    part(g, box(0.1, 0.018, 0.02), STEEL, x as number, 0.68, 0.215, { outline: false });
    label(g, s as string, 0.22, 0.07, x as number, 0.56, 0.2125, TEAL, '#ffffff');
  });
  // The deck, its front a shelf you can put a rack on.
  part(g, box(1.94, 0.04, 0.94), PANEL_D, 0, AN.deck - 0.01, 0.01);
  for (const x of [-0.8, 0, 0.8]) part(g, box(0.05, 0.07, 0.26), GREY, x, 0.85, 0.34, { outline: false });
  // The back of the bay, lit; reagents in a row.
  part(g, box(1.92, 0.5, 0.26), PANEL, 0, 1.14, -0.33);
  ownLit(g, box(1.8, 0.012, 0.03), ICE, 0, 1.37, -0.18);
  const r = seeded(19);
  for (let i = 0; i < 12; i++) {
    const x = -0.88 + i * 0.1;
    part(g, rbox(0.08, 0.16, 0.08, 0.01), ['#e3f2fd', '#fff3e0', '#f3e5f5'][wrap(i, 3)], x, AN.deck + 0.09, -0.14);
    part(g, cyl(0.016, 0.016, 0.03, 8), [TEAL, AMBER, '#7e57c2'][wrap(Math.floor(r() * 3), 3)], x, AN.deck + 0.18, -0.14, { outline: false });
  }
  // The canopy over it all, with the rail under it.
  part(g, rbox(1.94, 0.15, 0.96, 0.02), WHITE, 0, 1.46, 0.01);
  for (const x of [-0.95, 0.95]) part(g, box(0.04, 0.5, 0.94), PANEL, x, 1.14, 0.01);
  label(g, `${FIRM} AX-700`, 0.8, 0.09, -0.46, 1.46, 0.495, TEAL_D, '#ffffff');
  stripLamp(g, 1.6, 0, 1.37, 0.28);
  const setTower = tower(g, 0.84, 1.535, -0.1);
  part(g, box(0.05, 0.02, 0.5), GRAPHITE, AN.probeX, 1.375, 0.2, { outline: false });
  const carriage = group(g, AN.probeX, 0, AN.beltZ);
  part(carriage, box(0.07, 0.07, 0.07), TEAL_D, 0, 1.34, 0, { outline: false });
  const needle = group(carriage);
  part(needle, cyl(0.004, 0.004, 0.26, 6), CHROME, 0, 1.2, 0, { outline: false });
  part(needle, cyl(0.012, 0.012, 0.03, 8), GRAPHITE, 0, 1.3, 0, { outline: false });
  // The belt along the front, its cleats running.
  part(g, box(0.9, 0.016, 0.1), GRAPHITE, -0.17, AN.deck + 0.018, AN.beltZ, { outline: false });
  for (const sz of [-1, 1]) part(g, box(0.9, 0.03, 0.008), STEEL, -0.17, AN.deck + 0.02, AN.beltZ + sz * 0.056, { outline: false });
  const cleats = [0, 1, 2, 3, 4, 5, 6, 7].map(() => part(g, box(0.012, 0.004, 0.09), GREY, 0, AN.deck + 0.028, AN.beltZ, { outline: false }));
  // The tray a rack waits on, at the left end.
  part(g, box(0.3, 0.018, 0.12), TEAL, AN.tray[0], AN.deck + 0.015, AN.tray[2], { outline: false });
  // The wheel of cuvettes.
  const wheel = group(g, AN.wheel[0], AN.deck + 0.04, AN.wheel[2]);
  part(wheel, cyl(0.135, 0.14, 0.036, 26), GREY_D, 0, 0, 0);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * PI * 2;
    ownLit(wheel, box(0.012, 0.022, 0.012), ['#fff59d', '#c8e6c9', '#b3e5fc', '#f8bbd0', '#d1c4e9'][wrap(i, 5)], Math.cos(a) * 0.115, 0.022, Math.sin(a) * 0.115);
  }
  part(g, cyl(0.02, 0.02, 0.06, 10), CHROME, AN.wheel[0], AN.deck + 0.05, AN.wheel[2], { outline: false });
  // The drawer for a cartridge.
  part(g, box(0.28, 0.17, 0.3), WHITE, AN.drawer[0], AN.deck + 0.075, 0.04);
  const drawer = group(g);
  part(drawer, box(0.14, 0.012, 0.2), GREY_D, AN.drawer[0], AN.drawer[1] - 0.012, AN.drawer[2], { outline: false });
  part(drawer, box(0.15, 0.04, 0.012), WHITE, AN.drawer[0], AN.drawer[1], AN.drawer[2] + 0.11, { outline: false });
  const drawerLamp = ownLit(g, box(0.05, 0.012, 0.002), '#3a4a3e', AN.drawer[0], AN.deck + 0.14, 0.192);
  // The urgent port, its button and the pouch.
  part(g, cyl(0.035, 0.04, 0.06, 14), PANEL, AN.port[0], AN.deck + 0.03, AN.port[2]);
  const portRing = ownLit(g, cyl(0.03, 0.03, 0.004, 14), '#6b2020', AN.port[0], AN.deck + 0.062, AN.port[2]);
  part(g, cyl(0.03, 0.034, 0.03, 14), GRAPHITE, AN.button[0], AN.deck + 0.015, AN.button[2], { outline: false });
  const redKey = ownLit(g, cyl(0.022, 0.022, 0.012, 14), '#b71c1c', AN.button[0], AN.deck + 0.036, AN.button[2]);
  label(g, '응급', 0.09, 0.03, AN.button[0], AN.deck + 0.012, AN.button[2] + 0.04, '#ffffff', RED);
  haze(g, new THREE.PlaneGeometry(0.11, 0.17), '#ffe0b2', 0.55, AN.pouch[0], AN.pouch[1] - 0.01, AN.pouch[2] - 0.02);
  part(g, box(0.13, 0.05, 0.05), '#ff7043', AN.pouch[0], AN.deck + 0.025, AN.pouch[2] - 0.02, { outline: false });
  // The screen on its panel.
  part(g, box(0.6, 0.44, 0.06), GRAPHITE, AN.screen[0], AN.screen[1], 0.19);
  const screen = liveScreen(g, 0.56, 0.4, 400, 290, AN.screen[0], AN.screen[1], AN.screen[2]);

  const rack = rackTool(g, 'ltRack');
  const tube = tubeTool(g, 'ltTube', [CAPS[4], '#eceff1']);
  const cart = cartridgeTool(g);
  const tools: Partial<Record<LtTool, HeldTool>> = {
    rack: { tool: rack.root, lead: 'right', grips: RACK_GRIP },
    tube: { tool: tube.root, lead: 'right', grips: TUBE_GRIP },
    cart: { tool: cart, lead: 'right', grips: CART_GRIP },
  };
  const spots: Record<string, Spot> = {
    runBloodTest: standAt(g, 'ltRun', -0.62, AN.stand),
    statSample: standAt(g, 'ltStat', 0.54, 0.7),
    labTechnician_qualityControl: standAt(g, 'ltQc', 0.54, 0.7),
    labTechnician_specialTests: standAt(g, 'ltSpecial', 0.56, 0.7),
  };
  let spun = 0;
  let lastT = 0;
  const show = (now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const running = (n.run ?? 0) > 0.5;
    const dt = THREE.MathUtils.clamp(t - lastT, -0.2, 0.2);
    lastT = t;
    spun += dt * (running ? 2.4 : 0.25);
    wheel.rotation.y = spun;
    // Belt: the cleats run while a rack's going by.
    const bu = (n.belt ?? 0) > 0.5 ? t * 0.12 : 0;
    cleats.forEach((m, i) => {
      m.position.x = -0.62 + 0.9 * (((i / 8 + bu) % 1 + 1) % 1);
    });
    at(rack.root, now === 'runBloodTest' ? P.rack : AN.tray);
    const R = runAt(n.f ?? 5);
    const inRun = now === 'runBloodTest' && running;
    carriage.position.z = THREE.MathUtils.lerp(AN.beltZ, AN.wheel[2], inRun ? R.over : running ? 0.5 + 0.5 * Math.sin(t * 2.2) : 0.5);
    needle.position.y = inRun ? -0.09 * R.dip : running ? -0.07 * Math.max(0, Math.sin(t * 4.4)) : 0;
    const isStat = now === 'statSample';
    const usesPort = isStat || now === 'labTechnician_qualityControl';
    at(tube.root, usesPort ? P.tube : null);
    tube.showCap(isStat ? 0 : 1);
    setLit(portRing, usesPort && running ? '#ff8a80' : usesPort ? '#a33' : '#3a2626');
    setLit(redKey, isStat && Math.sin(t * 6) > 0 ? '#ff5252' : '#b71c1c');
    if (isStat && running) LT_LIVE.statAt = t;
    drawer.position.z = AN.drawerOut * clamp01(n.drawer);
    setLit(drawerLamp, now === 'labTechnician_specialTests' && running ? LED : '#3a4a3e');
    at(cart, now === 'labTechnician_specialTests' && (N?.tool === 'cart' || (n.drawer ?? 0) > 0.03) ? P.cart : null);
    setTower(isStat ? (Math.sin(t * 7) > 0 ? 0 : -1) : running ? 1 : 2);
    const key = `${now}|${N ? q(n.res ?? n.prog ?? 0, 40) : Math.floor(t)}|${q(n.read, 1)}`;
    screen.draw(key, (c) => analyzerPaint(c, now, N, t));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.05, AN.beltZ);
}

// =============================================================================================
// 원심분리기 (centrifugeUnit, 1 × 1): a steel bench, the machine well forward; a hinged lid with a window; a rotor that turns.

function centrifuge(g: THREE.Group, out: Built) {
  part(g, box(0.94, 0.04, 0.92), STEEL, 0, 0.72, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, 0.7, 0.04), GREY, sx * 0.42, 0.35, sz * 0.4, { outline: false });
  part(g, box(0.86, 0.02, 0.84), PANEL_D, 0, 0.18, 0, { outline: false });
  // Spare boxes of tubes on the shelf below.
  part(g, rbox(0.34, 0.16, 0.26, 0.01), '#d7ccc8', -0.2, 0.27, 0);
  label(g, '채혈관', 0.2, 0.06, -0.2, 0.27, 0.132, '#ffffff', BLACK);
  // The machine.
  part(g, rbox(CF.size, 0.3, CF.size, 0.04), WHITE, 0, 0.89, CF.cz);
  part(g, cyl(0.235, 0.235, 0.012, 32), '#20262b', 0, CF.top + 0.002, CF.cz, { outline: false });
  label(g, '마주 보게 넣기', 0.3, 0.05, 0, 0.8, CF.cz + CF.size / 2 + 0.003, TEAL, '#ffffff');
  const rotor = group(g, 0, CF.top + 0.012, CF.cz);
  part(rotor, cyl(0.05, 0.06, 0.03, 14), CHROME, 0, 0.012, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    rod(rotor, v3(0, 0.008, 0), v3(Math.cos(a) * 0.14, 0.008, Math.sin(a) * 0.14), 0.01, STEEL);
    part(rotor, cyl(0.022, 0.018, 0.022, 10), STEEL, Math.cos(a) * 0.14, 0.012, Math.sin(a) * 0.14, { outline: false });
  }
  const blur = haze(g, new THREE.CircleGeometry(0.2, 28), '#b8c3ca', 0, 0, CF.top + 0.052, CF.cz);
  blur.rotation.x = -PI / 2;
  // The lid: a frame, a window in it, a handle at the front.
  const lid = group(g, 0, CF.hy, CF.hz);
  const LD = CF.size - 0.02;
  part(lid, box(CF.size, 0.05, 0.07), PANEL, 0, 0.09, 0.035);
  part(lid, box(CF.size, 0.05, 0.08), PANEL, 0, 0.09, LD - 0.04);
  for (const sx of [-1, 1]) part(lid, box(0.06, 0.05, LD), PANEL, sx * (CF.size / 2 - 0.03), 0.09, LD / 2);
  const pane = haze(lid, new THREE.PlaneGeometry(CF.size - 0.1, LD - 0.14), '#bfe3ef', 0.22, 0, 0.11, LD / 2);
  pane.rotation.x = -PI / 2;
  part(lid, box(0.2, 0.024, 0.03), GRAPHITE, 0, 0.09, LD + 0.012, { outline: false });
  // Tubes resting beside it, a block under each.
  for (const R of [CF.restA, CF.restB]) part(g, rbox(0.1, 0.1, 0.1, 0.01), TEAL, R[0], 0.79, R[2]);
  fixedRack(g, -0.28, 0.74, -0.32, 2);
  // The panel: time and speed, start.
  const lcd = liveScreen(g, 0.24, 0.1, 192, 80, -0.08, 0.93, CF.cz + CF.size / 2 + 0.004);
  part(g, cyl(0.026, 0.03, 0.012, 14), GRAPHITE, CF.button[0], CF.button[1], CF.button[2] - 0.005, { rx: PI / 2, outline: false });
  const startKey = ownLit(g, cyl(0.018, 0.018, 0.012, 14), '#2e7d32', CF.button[0], CF.button[1], CF.button[2]);
  startKey.rotation.x = PI / 2;
  const tubeA = tubeTool(g, 'ltTubeA', [CAPS[1]]);
  const tubeB = tubeTool(g, 'ltTubeB', [CAPS[1]]);
  const tools: Partial<Record<LtTool, HeldTool>> = { tube: { tool: tubeA.root, lead: 'right', grips: TUBE_GRIP }, tube2: { tool: tubeB.root, lead: 'right', grips: TUBE_GRIP } };
  const spots: Record<string, Spot> = { spinSamples: standAt(g, 'ltSpin', 0, CF.stand) };
  const show = (_now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const ang = n.ang ?? 0;
    const speed = clamp01(n.speed);
    rotor.rotation.y = ang;
    fade(blur, 0.62 * speed * speed);
    lid.rotation.x = -CF.lidOpen * clamp01(n.lid);
    lid.position.y = CF.hy + 0.0025 * speed * Math.sin(t * 60);
    at(tubeA.root, P.tubeA ?? null, CF.restA);
    at(tubeB.root, P.tubeB ?? null, CF.restB);
    const running = (n.running ?? 0) > 0.5;
    if (running) {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      tubeA.root.position.set(-0.14 * c, CF.slotA[1], CF.cz + 0.14 * s);
      tubeB.root.position.set(0.14 * c, CF.slotA[1], CF.cz - 0.14 * s);
    }
    const parted = (n.parted ?? 0) > 0.5;
    tubeA.setParted(parted);
    tubeB.setParted(parted);
    setLit(startKey, running ? LED : '#2e7d32');
    const rpm = Math.round(3000 * speed);
    lcd.draw(`${q(speed, 30)}|${q(n.prog, 30)}`, (c) => {
      c.fillStyle = '#0a1a22';
      c.fillRect(0, 0, 192, 80);
      text(c, `${rpm} rpm`, 10, 24, 26, running ? '#7ee89e' : '#9fd6ff');
      const left = Math.max(0, Math.ceil(300 * (1 - clamp01(n.prog))));
      text(c, N ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '5:00', 10, 58, 22, AMBER);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.08, CF.cz);
}

// =============================================================================================
// 현미경 검사대 (microscopeBench, 1 × 1): a desk, a microscope leaning out to the eyes, its field on a small screen, a counter.

function fieldPaint(c: Ctx2, focus: number, drift: number, on: boolean) {
  const W = 256;
  const H = 188;
  c.fillStyle = '#10141a';
  c.fillRect(0, 0, W, H);
  if (!on) {
    text(c, '슬라이드 없음', W / 2, H / 2, 18, '#7a8a94', 'center');
    return;
  }
  c.save();
  c.beginPath();
  c.arc(W / 2, H / 2, pos(88), 0, PI * 2);
  c.clip();
  c.fillStyle = '#f7f0e4';
  c.fillRect(0, 0, W, H);
  const r = seeded(47);
  const sharp = clamp01(focus);
  const smear = 1 + (1 - sharp) * 7;
  for (let i = 0; i < 46; i++) {
    const x = ((r() * W + drift * 70) % W + W) % W;
    const y = r() * H;
    const rad = pos(6 + r() * 2);
    const big = r() < 0.09;
    c.globalAlpha = 0.25 + 0.65 * sharp;
    c.fillStyle = big ? '#b39ddb' : '#f0a8a4';
    c.beginPath();
    c.arc(x, y, big ? rad * 1.5 + smear : rad + smear, 0, PI * 2);
    c.fill();
    c.fillStyle = big ? '#5e35b1' : '#f8d5cd';
    c.beginPath();
    c.arc(x, y, pos(big ? rad * 0.9 : rad * 0.45), 0, PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.restore();
}
function microscope(g: THREE.Group, out: Built) {
  const T = MB.top;
  part(g, box(0.94, 0.04, 0.9), '#e8ecee', 0, T - 0.02, 0);
  for (const sx of [-1, 1]) part(g, box(0.05, T - 0.04, 0.82), PANEL_D, sx * 0.42, (T - 0.04) / 2, 0);
  part(g, box(0.86, 0.5, 0.03), PANEL, 0, T - 0.32, -0.38, { outline: false });
  // Drawers on the left for boxes of slides.
  const Z = 0.08;
  part(g, rbox(0.2, 0.04, 0.26, 0.01), GRAPHITE, 0, T + 0.02, Z - 0.02);
  part(g, rbox(0.06, 0.28, 0.08, 0.02), GRAPHITE, 0, T + 0.17, Z - 0.1);
  rod(g, v3(0, T + 0.3, Z - 0.1), v3(0, T + 0.32, Z + 0.04), 0.03, GRAPHITE);
  part(g, box(0.16, 0.016, 0.14), BLACK, 0, MB.stage[1] - 0.01, MB.stage[2]);
  part(g, box(0.05, 0.08, 0.05), GRAPHITE, 0, MB.stage[1] - 0.06, MB.stage[2]);
  const lamp = ownLit(g, cyl(0.016, 0.016, 0.006, 12), '#3e4750', 0, MB.stage[1] - 0.004, MB.stage[2]);
  // Nosepiece and its objectives.
  part(g, cyl(0.045, 0.05, 0.03, 14), STEEL, 0, T + 0.3, Z + 0.05, { outline: false });
  [[-0.03, '#e53935'], [0.03, '#fbc02d'], [0, '#1e88e5']].forEach(([x, c], i) => part(g, cyl(0.012, 0.009, 0.06, 10), c as string, x as number, T + 0.26, Z + 0.05 + (i === 2 ? 0.03 : 0), { outline: false }));
  // The binocular head, reaching out towards the seat.
  part(g, rbox(0.1, 0.07, 0.12, 0.02), GRAPHITE, 0, T + 0.36, Z + 0.06);
  for (const sx of [-1, 1]) {
    rod(g, v3(sx * 0.024, T + 0.37, Z + 0.1), v3(sx * 0.032, T + 0.43, Z + 0.33), 0.018, GRAPHITE);
    part(g, ball(0.02), BLACK, sx * 0.032, T + 0.43, Z + 0.34, { outline: false });
  }
  // The focus, a big knob either side.
  for (const K of [MB.focus, MB.knob]) {
    part(g, cyl(0.028, 0.028, 0.02, 14), CHROME, K[0], K[1], K[2] - 0.02, { rz: PI / 2, outline: false });
    part(g, box(Math.abs(K[0]) * 2, 0.02, 0.02), GRAPHITE, 0, K[1], K[2] - 0.02, { outline: false });
  }
  // The tray of slides, the counter, a small screen with the camera's picture.
  part(g, box(0.2, 0.02, 0.22), '#d7ccc8', MB.tray[0], T + 0.01, MB.tray[2]);
  for (let i = 0; i < 4; i++) part(g, box(0.076, 0.004, 0.024), i === 0 ? '#f8bbd0' : '#d1a4d6', MB.tray[0], T + 0.023, MB.tray[2] - 0.07 + i * 0.05, { outline: false });
  part(g, rbox(0.14, 0.04, 0.12, 0.01), '#37474f', MB.counter[0], T + 0.02, MB.counter[2]);
  for (let i = 0; i < 3; i++) part(g, box(0.03, 0.008, 0.03), ['#f48fb1', '#b39ddb', '#90caf9'][i], MB.counter[0] - 0.04 + i * 0.04, T + 0.044, MB.counter[2] + 0.02, { outline: false });
  const counter = liveScreen(g, 0.1, 0.035, 96, 32, MB.counter[0], T + 0.045, MB.counter[2] - 0.03, 0, -PI / 2);
  part(g, box(0.32, 0.24, 0.03), BLACK, MB.screen[0], MB.screen[1], MB.screen[2]);
  rod(g, v3(MB.screen[0], T, MB.screen[2]), v3(MB.screen[0], MB.screen[1], MB.screen[2]), 0.012, GREY_D);
  const field = liveScreen(g, 0.3, 0.22, 256, 188, MB.screen[0], MB.screen[1], MB.screen[2] + 0.017);
  chair(g, MB.seat, TEAL_D, false);
  const senior = person(g, '#f7f8f8', '#37474f', '#2b1b10', 0.72, 0.66, -PI / 2 + 0.2, 'female');
  const slide = slideTool(g);
  const tools: Partial<Record<LtTool, HeldTool>> = { slide: { tool: slide, lead: 'right', grips: SLIDE_GRIP } };
  const spots: Record<string, Spot> = { examineSlides: seatAt(g, 'ltSlides', MB.seat), labTechnician_practiceSlides: seatAt(g, 'ltPractice', MB.seat) };
  const show = (_now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(slide, P.slide ?? null, MB.stage);
    const on = N ? (n.on ?? 0) > 0.5 : true;
    setLit(lamp, on ? '#fff7d1' : '#3e4750');
    const focus = N ? clamp01(n.focus) : 1;
    field.draw(`${q(focus, 12)}|${q(n.drift, 30)}|${on ? 1 : 0}`, (c) => fieldPaint(c, focus, n.drift ?? 0, on));
    const count = Math.floor(clamp01(n.count) * 100);
    counter.draw(`${count}`, (c) => {
      c.fillStyle = '#0a1a22';
      c.fillRect(0, 0, 96, 32);
      text(c, String(count).padStart(3, '0'), 48, 17, 24, '#ffd54f', 'center');
    });
    const has = N ? (n.senior ?? 0) > 0.5 : false;
    senior.root.visible = has;
    if (has) {
      const nods = (n.nods ?? 0) > 0.5;
      senior.opts.nod = nods ? 0.14 + 0.16 * Math.sin(t * 6) : 0.12;
      senior.head.rotation.x = senior.opts.nod;
      senior.armR((n.point ?? 0) > 0.5 ? tA.set(MB.screen[0] + 0.1, MB.screen[1], MB.screen[2] + 0.08) : null);
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, MB.stage[1], MB.stage[2]);
}

// =============================================================================================
// 검체 냉장고 (sampleFridge, 1 × 1): glass door on a hinge, shelves of racks, a little logged thermometer.

function coldShell(g: THREE.Object3D, W: number, H: number) {
  part(g, box(W, H - 0.2, 0.06), PANEL, 0, (H - 0.2) / 2 + 0.1, -0.42);
  for (const sx of [-1, 1]) part(g, box(0.05, H, 0.88), WHITE, sx * (W / 2 - 0.025), H / 2, -0.01);
  part(g, box(W, 0.1, 0.88), GREY_D, 0, 0.05, -0.01);
  part(g, box(W, 0.22, 0.88), WHITE, 0, H - 0.11, -0.01);
  ownLit(g, box(W - 0.14, 0.012, 0.04), ICE, 0, H - 0.23, 0.2);
  ownLit(g, box(W - 0.14, 0.5, 0.01), '#e9f6fd', 0, H / 2, -0.385);
}
function sampleFridge(g: THREE.Group, out: Built) {
  const H = 1.96;
  coldShell(g, 0.94, H);
  const shelves = [0.34, SF.low[1] - 0.14, SF.top[1] - 0.14, 1.56];
  const r = seeded(Math.round(Math.abs(g.position.x * 7 + g.position.z * 3)) + 11);
  shelves.forEach((y, j) => {
    part(g, box(0.84, 0.018, 0.68), '#cfd8dc', 0, y - 0.01, -0.02, { outline: false });
    fixedRack(g, 0.24, y, -0.14, j + 1);
    fixedRack(g, -0.22, y, -0.14, j + 3);
    if (j === 0 || j === 3) part(g, rbox(0.3, 0.14, 0.2, 0.01), ['#ffe0b2', '#b3e5fc', '#c8e6c9'][wrap(Math.floor(r() * 3), 3)], 0.14, y + 0.07, 0.18);
    if (j === 0) label(g, '보관 7일', 0.2, 0.05, 0.14, y + 0.07, 0.283, '#ffffff', BLACK);
  });
  label(g, '검체 보관 2~8℃', 0.5, 0.075, -0.16, H - 0.09, 0.435, TEAL_D, '#ffffff');
  const lcd = liveScreen(g, 0.2, 0.09, 160, 72, 0.3, H - 0.09, 0.436);
  // The door.
  const door = group(g, SF.hx, 0, SF.hz);
  const dw = 0.9;
  for (const y of [0.13, H - 0.25]) part(door, box(dw, 0.05, 0.03), PANEL_D, dw / 2, y, 0, { outline: false });
  for (const x of [0.025, dw - 0.025]) part(door, box(0.05, H - 0.38, 0.03), PANEL_D, x, (H - 0.12) / 2, 0, { outline: false });
  glass(door, dw - 0.1, H - 0.43, dw / 2, (H - 0.12) / 2, 0, 0.16);
  part(door, box(0.024, 0.34, 0.03), CHROME, SF.L, SF.hy, 0.03, { outline: false });
  const rack = rackTool(g, 'ltFridgeRack', 1);
  const tab = tabletTool(g);
  const mate1 = person(g, '#f7f8f8', '#455a64', '#2b1b10', -0.74, 1.1, 0.8, 'male');
  const mate2 = person(g, '#f7f8f8', '#37474f', '#5b3a1e', 0.84, 1.15, -0.8, 'female');
  const tools: Partial<Record<LtTool, HeldTool>> = { rack: { tool: rack.root, lead: 'right', grips: RACK_GRIP }, tablet: { tool: tab.root, lead: 'left', grips: TABLET_GRIPS } };
  const spots: Record<string, Spot> = { organizeSamples: standAt(g, 'ltFridge', 0.46, SF.back), labTechnician_labWorkflow: standAt(g, 'ltAssign', 0.05, 0.82) };
  const talk = new THREE.Vector3();
  const show = (now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    door.rotation.y = -(n.door ?? 0);
    const orderly = now === 'organizeSamples';
    at(rack.root, orderly ? P.rack : null);
    at(tab.root, now === 'labTechnician_labWorkflow' ? P.tablet : null);
    tab.ticks[0].visible = (n.checked ?? 0) > 0.5;
    tab.ticks[1].visible = (n.signed ?? 0) > 0.5;
    const temp = 4.0 + 0.1 * Math.sin(t * 0.3) + 1.8 * clamp01(n.cold);
    lcd.draw(`${q(temp, 10)}`, (c) => {
      c.fillStyle = '#071a14';
      c.fillRect(0, 0, 160, 72);
      text(c, `${temp.toFixed(1)}℃`, 80, 38, 38, temp > 5.5 ? '#ffd54f' : '#7ee89e', 'center');
    });
    const mates = N ? (n.mate ?? 0) > 0.5 : false;
    mate1.root.visible = mate2.root.visible = mates;
    if (mates) {
      const nods = (n.nods ?? 0) > 0.5;
      const says = (n.says ?? 0) > 0.5;
      for (const [i, F] of [mate1, mate2].entries()) {
        F.opts.nod = nods ? 0.12 + 0.14 * Math.sin(t * 6 + i) : 0.05;
        F.head.rotation.x = F.opts.nod;
      }
      mate1.armR(says ? talk.set(-0.5, 1.34 + 0.05 * Math.sin(t * 4), 1.2) : null);
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.0, 0.3);
}

// =============================================================================================
// 검체 접수창 (ltReception, 2 × 1): a partition with a hatch, a courier beyond, a cool box that comes through on rollers.

function reception(g: THREE.Group, out: Built) {
  const C = RC.counter;
  // The partition.
  part(g, box(1.96, C, 0.06), WHITE, 0, C / 2, 0);
  for (const sx of [-1, 1]) part(g, box(0.46, 1.5, 0.06), WHITE, sx * 0.75, C + 0.75, 0);
  part(g, box(1.96, 0.74, 0.06), WHITE, 0, 2.05 + 0.02, 0);
  part(g, box(1.96, 0.1, 0.08), TEAL, 0, 2.37, 0, { outline: false });
  label(g, '검체 접수', 0.72, 0.14, 0, 2.02, 0.034, TEAL_D, '#ffffff');
  label(g, FIRM, 0.72, 0.075, 0, 1.87, 0.034, '#ffffff', TEAL_D);
  // The corridor beyond: a wall, a strip of light.
  part(g, box(1.96, 2.3, 0.04), '#c9d6dc', 0, 1.15, -0.47);
  ownLit(g, box(1.1, 0.012, 0.06), ICE, 0, 2.1, -0.28);
  // The counter, right through the hatch; a cabinet under the near half.
  part(g, box(1.96, 0.03, 0.74), '#cfd8dc', 0, C - 0.015, 0.09);
  part(g, box(1.9, C - 0.06, 0.4), PANEL, 0, (C - 0.03) / 2, 0.24);
  label(g, '바코드를 먼저 확인해요', 0.8, 0.09, 0, 0.66, 0.442, '#ffffff', TEAL_D);
  // Rollers for the box.
  for (let i = 0; i < 6; i++) part(g, cyl(0.012, 0.012, 0.36, 8), CHROME, RC.boxX, C + 0.008, -0.2 + i * 0.09, { rz: PI / 2, outline: false });
  // The sash, which the courier lifts.
  const sash = group(g, 0, 0, -0.045);
  for (const sx of [-1, 1]) part(sash, box(0.03, 0.8, 0.02), PANEL_D, sx * 0.52, C + 0.4, 0, { outline: false });
  part(sash, box(1.06, 0.03, 0.02), PANEL_D, 0, C + 0.015, 0, { outline: false });
  part(sash, box(1.06, 0.03, 0.02), PANEL_D, 0, C + 0.785, 0, { outline: false });
  glass(sash, 1.02, 0.74, 0, C + 0.4, 0, 0.18);
  part(sash, box(0.2, 0.02, 0.03), CHROME, 0, C + 0.04, -0.02, { outline: false });
  // The cool box.
  const coolBox = group(g, RC.boxX, 0, RC.boxOut);
  part(coolBox, rbox(0.3, 0.14, 0.24, 0.02), '#1e88e5', 0, C + 0.09, 0);
  part(coolBox, box(0.25, 0.005, 0.19), '#e3f2fd', 0, C + 0.162, 0, { outline: false });
  for (let i = 0; i < 6; i++) part(coolBox, cyl(0.012, 0.012, 0.02, 8), CAPS[wrap(i, 4)], -0.08 + (i % 3) * 0.08, C + 0.13, -0.04 + Math.floor(i / 3) * 0.08, { outline: false });
  label(coolBox, '검체 이송', 0.2, 0.05, 0, C + 0.08, 0.122, '#ffffff', '#0d47a1');
  const boxLid = group(coolBox, 0, C + 0.16, -0.12);
  part(boxLid, rbox(0.3, 0.03, 0.24, 0.012), '#1565c0', 0, 0.012, 0.12);
  // The scanner on its stem, its red line.
  rod(g, v3(RC.scan[0], C, 0.2), v3(RC.scan[0], RC.scan[1] + 0.02, 0.2), 0.014, GRAPHITE);
  part(g, rbox(0.1, 0.07, 0.08, 0.015), GRAPHITE, RC.scan[0], RC.scan[1] + 0.03, 0.22);
  part(g, cyl(0.06, 0.07, 0.02, 14), GRAPHITE, RC.scan[0], C + 0.01, 0.2, { outline: false });
  const scanLine = ownLit(g, box(0.07, 0.006, 0.004), '#ff5252', RC.scan[0], RC.scan[1] + 0.02, 0.263);
  // The rack it all goes into, the tray for what's held back.
  part(g, box(0.24, 0.05, 0.08), '#eceff1', RC.slot(1)[0], C + 0.03, RC.slot(0)[2]);
  label(g, '접수 완료', 0.2, 0.04, RC.slot(1)[0], C + 0.02, RC.slot(0)[2] + 0.042, TEAL, '#ffffff');
  const done = [0, 1, 2].map((i) => {
    const P = RC.slot(i);
    const k = group(g);
    fixedTube(k, P[0], P[1] - 0.008, P[2], CAPS[i]);
    return k;
  });
  part(g, box(0.2, 0.05, 0.12), '#ffcdd2', RC.hold[0], C + 0.03, RC.hold[2]);
  label(g, '보류', 0.1, 0.04, RC.hold[0], C + 0.03, RC.hold[2] + 0.062, '#ffffff', RED);
  const heldBack = group(g);
  fixedTube(heldBack, RC.hold[0], RC.hold[1] - 0.008, RC.hold[2], CAPS[2]);
  // A screen on the partition.
  part(g, box(0.4, 0.3, 0.03), BLACK, RC.screen[0], RC.screen[1], 0.03);
  const screen = liveScreen(g, 0.37, 0.27, 296, 216, RC.screen[0], RC.screen[1], RC.screen[2]);
  label(g, '① 이름 ② 번호 ③ 시각', 0.42, 0.07, 0.75, 1.36, 0.034, '#fff8e1', BLACK);
  label(g, '맞지 않으면 보류', 0.42, 0.07, 0.75, 1.27, 0.034, '#ffebee', RED);
  const courier = person(g, '#1565c0', '#263238', '#2b1b10', RC.boxX, -0.3, 0, 'male');
  const tube = tubeTool(g, 'ltRcTube', CAPS.slice(0, 3));
  const tools: Partial<Record<LtTool, HeldTool>> = { tube: { tool: tube.root, lead: 'right', grips: TUBE_GRIP } };
  const spots: Record<string, Spot> = { ltReceive: standAt(g, 'ltReceive', RC.dweller, RC.stand), ltLabelCheck: standAt(g, 'ltLabelCheck', RC.dweller, RC.stand) };
  const push = new THREE.Vector3();
  const show = (now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const s = clamp01(n.sash);
    sash.position.y = 0.62 * s;
    const bx = clamp01(n.box);
    coolBox.position.z = THREE.MathUtils.lerp(RC.boxOut, RC.boxIn, bx);
    boxLid.rotation.x = -1.5 * clamp01(n.lid);
    const fill = n.filled ?? 0;
    done.forEach((k, i) => (k.visible = fill > i + 0.5));
    heldBack.visible = (n.hold ?? 0) > 0.5;
    at(tube.root, P.tube ?? null);
    tube.showCap(n.cap ?? 0);
    setLit(scanLine, (n.beep ?? 0) > 0.5 ? LED : Math.sin(t * 9) > -0.4 ? '#ff5252' : '#7a2020');
    const has = N ? (n.courier ?? 0) > 0.5 : false;
    courier.root.visible = has;
    if (has) {
      courier.armR(s < 0.98 ? push.set(0.1, RC.counter + 0.05 + 0.62 * s, -0.09) : bx > 0.01 && bx < 0.99 ? push.set(0.08, RC.counter + 0.1, coolBox.position.z - 0.1) : null);
      courier.armL((n.says ?? 0) > 0.5 ? push.clone().set(-0.1, 1.2 + 0.03 * Math.sin(t * 4), -0.12) : null);
      courier.opts.nod = (n.nods ?? 0) > 0.5 ? 0.12 + 0.14 * Math.sin(t * 6) : 0.1;
      courier.head.rotation.x = courier.opts.nod;
    }
    const wrong = (n.wrong ?? 0) > 0.5;
    screen.draw(`${now}|${q(fill, 2)}|${wrong ? 1 : 0}`, (c) => {
      c.fillStyle = '#10222c';
      c.fillRect(0, 0, 296, 216);
      screenHead(c, 296, '접수 현황', wrong ? RED : TEAL_D, `${412 + Math.floor(fill)}건`);
      if (wrong) {
        text(c, '이름 불일치', 148, 88, 32, '#ff8a80', 'center');
        text(c, '김○○ / 강○○', 148, 130, 22, '#ffffff', 'center');
        text(c, '보류 후 재확인', 148, 170, 20, AMBER, 'center');
      } else {
        for (let i = 0; i < 4; i++) {
          const ok = i < fill;
          c.fillStyle = i % 2 ? '#183543' : '#14303d';
          c.fillRect(6, 50 + i * 40, 284, 36);
          text(c, `3-09${String(18 + i)}`, 14, 68 + i * 40, 18, '#cfe8f5');
          text(c, ok ? '접수' : '대기', 282, 68 + i * 40, 18, ok ? '#7ee89e' : '#7a8a94', 'right');
        }
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.1, 0.25);
}

// =============================================================================================
// 분주대 (ltPipetteBench, 2 × 1): a white bench, tips, samples, a plate, a waste tub, a shelf of bottles.

function platePaint(c: Ctx2, wells: number, mix: number) {
  const W = 240;
  const H = 160;
  c.fillStyle = '#f7fbfc';
  c.fillRect(0, 0, W, H);
  const dx = 240 / 13;
  const dy = 160 / 9;
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < 12; i++) {
      const filled = i < 4 || (i === 4 && j < 3) || (j === 3 && i >= 5 && i - 5 < wells);
      const k = (i * 3 + j * 7) % 11;
      const mixed = ['#f5d76e', '#c9d66b', '#7fc6a4', '#5ba4cf', '#3f79c2'][wrap(Math.floor(k / 2.5), 5)];
      c.fillStyle = !filled ? '#e3ecef' : mix > 0.5 ? mixed : j === 3 && i >= 5 ? '#f0c24a' : '#f5e29a';
      c.beginPath();
      c.arc(dx * (i + 1), dy * (j + 1), pos(6.5), 0, PI * 2);
      c.fill();
      c.strokeStyle = '#9fb3bc';
      c.lineWidth = 1;
      c.stroke();
    }
}
function pipetteBench(g: THREE.Group, out: Built) {
  const T = PB.top;
  part(g, box(1.94, 0.04, 0.94), '#f4f6f7', 0, T - 0.02, 0);
  part(g, box(1.9, T - 0.1, 0.7), PANEL, 0, (T - 0.04) / 2 + 0.03, -0.1);
  part(g, box(1.94, 0.06, 0.74), GREY_D, 0, 0.03, -0.1, { outline: false });
  for (const x of [-0.65, 0, 0.65]) part(g, box(0.6, T - 0.2, 0.01), WHITE, x, T / 2 - 0.01, 0.255, { outline: false });
  // The back splash, a low shelf of bottles (the whole thing kept low: people work behind it).
  part(g, box(1.92, 0.5, 0.02), WHITE, 0, T + 0.25, -0.44);
  part(g, box(1.92, 0.025, 0.24), PANEL_D, 0, T + 0.34, -0.31);
  const r = seeded(23);
  for (let i = 0; i < 10; i++) {
    const x = -0.82 + i * 0.18;
    const h = 0.11 + r() * 0.05;
    part(g, cyl(0.035, 0.038, h, 12), ['#e3f2fd', '#fff8e1', '#f3e5f5', '#e8f5e9'][wrap(i, 4)], x, T + 0.355 + h / 2, -0.31);
    part(g, cyl(0.02, 0.02, 0.018, 10), [TEAL, '#7e57c2', AMBER][wrap(i, 3)], x, T + 0.365 + h, -0.31, { outline: false });
  }
  label(g, '분주대 · 팁은 한 번만', 0.9, 0.07, 0.3, T + 0.2, -0.428, TEAL_D, '#ffffff');
  // Tip box.
  part(g, box(0.13, 0.05, 0.09), '#4fc3f7', PB.tipBox[0], T + 0.025, PB.tipBox[2]);
  picture(g, painted('ltTips', 96, 64, (c) => {
    c.fillStyle = '#b3e5fc';
    c.fillRect(0, 0, 96, 64);
    c.fillStyle = '#ffffff';
    for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) c.fillRect(6 + i * 11, 6 + j * 11, 6, 6);
  }), 0.125, 0.085, PB.tipBox[0], T + 0.052, PB.tipBox[2], '#ffffff', 0, -PI / 2);
  // Sample tubes.
  part(g, box(0.09, 0.05, 0.06), '#eceff1', PB.tube[0], T + 0.025, PB.tube[2]);
  for (const dx of [-0.03, 0, 0.03]) fixedTube(g, PB.tube[0] + dx, T + 0.08, PB.tube[2], CAPS[1], 0.008);
  // The plate.
  part(g, box(0.17, 0.018, 0.115), '#cfd8dc', PB.plate[0], T + 0.009, PB.plate[2]);
  const plate = liveScreen(g, 0.155, 0.105, 240, 160, PB.plate[0], T + 0.0195, PB.plate[2], 0, -PI / 2);
  // The waste tub, tips in it.
  part(g, cyl(0.07, 0.06, 0.1, 16), '#ffe082', PB.waste[0], T + 0.05, PB.waste[2]);
  label(g, '팁', 0.05, 0.03, PB.waste[0], T + 0.05, PB.waste[2] + 0.07, '#ffffff', RED);
  // The pipette's stand, others on it.
  part(g, box(0.1, 0.012, 0.1), GREY_D, PB.home[0], T + 0.006, PB.home[2], { outline: false });
  part(g, box(0.014, 0.25, 0.014), GREY_D, PB.home[0], T + 0.13, PB.home[2] - 0.05, { outline: false });
  part(g, box(0.04, 0.012, 0.06), GREY, PB.home[0], T + 0.22, PB.home[2] - 0.022, { outline: false });
  // A vortex mixer, a box of gloves, to the sides.
  part(g, rbox(0.16, 0.08, 0.16, 0.02), '#90a4ae', 0.72, T + 0.04, 0.2);
  part(g, cyl(0.04, 0.04, 0.03, 12), BLACK, 0.72, T + 0.095, 0.2, { outline: false });
  part(g, rbox(0.22, 0.09, 0.12, 0.01), '#e1bee7', -0.72, T + 0.045, 0.22);
  label(g, '니트릴 장갑', 0.18, 0.04, -0.72, T + 0.05, 0.283, '#ffffff', '#6a1b9a');
  const pip = pipetteTool(g);
  const tools: Partial<Record<LtTool, HeldTool>> = { pipette: { tool: pip.root, lead: 'right', grips: PIPETTE_GRIP } };
  const spots: Record<string, Spot> = { ltPipette: standAt(g, 'ltPipette', -0.12, PB.stand) };
  const show = (_now: string | null, N: LtNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pip.root, P.pipette ?? null, PB.home);
    pip.tip.visible = (n.tip ?? 0) > 0.5;
    pip.liquid.visible = (n.liq ?? 0) > 0.5;
    pip.plunger.position.y = -0.014 * clamp01(n.plunger);
    const wells = n.wells ?? 3;
    const mix = n.mix ?? 0;
    plate.draw(`${q(wells, 1)}|${q(mix, 1)}`, (c) => platePaint(c, wells, mix));
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, PB.plate[0], T + 0.1, PB.plate[2]);
}

// =============================================================================================
// 혈액 배양기 (ltIncubator, 2 × 1): racks of bottles rocking behind a shutter, a map of them on a screen, a shelf.

function cultureMap(c: Ctx2, t: number, flag: boolean, cleared: boolean) {
  const W = 360;
  const H = 250;
  c.fillStyle = '#0d1e27';
  c.fillRect(0, 0, W, H);
  screenHead(c, W, '혈액 배양 지도', flag ? RED : TEAL_D, '35.0℃');
  const r = seeded(61);
  for (let j = 0; j < 5; j++)
    for (let i = 0; i < 10; i++) {
      const used = r() < 0.72;
      const here = i === 3 && j === 2;
      c.fillStyle = here ? (flag ? (Math.floor(t * 3) % 2 === 0 ? '#ff5252' : '#7a2020') : cleared ? '#4fc3f7' : '#7ee89e') : used ? '#2e7d52' : '#22323b';
      c.fillRect(16 + i * 33, 52 + j * 33, 28, 28);
    }
  text(c, flag ? '양성 신호: 3열 4번' : '이상 없음', 16, H - 16, 20, flag ? '#ff8a80' : '#7ee89e');
}
function incubator(g: THREE.Group, out: Built) {
  const H = 2.0;
  // Body: a cabinet below, a housing above that the shutter goes up into; the bay between.
  part(g, rbox(1.94, 0.92, 0.9, 0.02), WHITE, 0, 0.46, -0.01);
  part(g, box(1.94, 0.06, 0.92), GREY_D, 0, 0.03, -0.01, { outline: false });
  part(g, box(1.94, H - 1.5, 0.92), WHITE, 0, (H + 1.5) / 2, -0.01);
  part(g, box(0.05, 0.6, 0.9), WHITE, -0.945, 1.2, -0.01);
  part(g, box(0.06, 0.6, 0.9), WHITE, 0.0, 1.2, -0.01);
  part(g, box(0.92, 0.6, 0.04), '#223138', -0.47, 1.2, -0.42);
  ownLit(g, box(0.8, 0.01, 0.03), '#ffe9b0', -0.47, 1.49, 0.2);
  label(g, '혈액 배양기 · 35℃', 0.84, 0.08, -0.47, 1.68, 0.452, TEAL_D, '#ffffff');
  label(g, '양성 신호는 바로 보고', 0.84, 0.07, -0.47, 1.58, 0.452, '#ffffff', RED);
  // The racks, rocking.
  const rocker = group(g, 0, 0, 0);
  const Ys = [0.98, IC.bottle[1], 1.3];
  const Xs = [-0.78, -0.62, -0.46, -0.3, -0.14];
  part(rocker, box(0.82, 0.5, 0.02), '#55616b', -0.46, 1.14, 0.2, { outline: false });
  Ys.forEach((y) => {
    part(rocker, box(0.86, 0.012, 0.22), STEEL, -0.46, y - 0.06, 0.3, { outline: false });
    Xs.forEach((x) => {
      if (x === IC.bottle[0] && y === IC.bottle[1]) return;
      part(rocker, cyl(0.028, 0.03, 0.09, 12), '#e8f0ec', x, y - 0.012, 0.3, { outline: false });
      part(rocker, cyl(0.03, 0.031, 0.04, 12), '#e6b872', x, y - 0.03, 0.3, { outline: false });
      part(rocker, cyl(0.015, 0.015, 0.016, 10), '#6a7fce', x, y + 0.04, 0.3, { outline: false });
    });
  });
  // The shutter: goes up into the housing.
  const shutter = group(g);
  part(shutter, box(0.92, 0.1, 0.02), PANEL, -0.47, 0.97, 0.45);
  part(shutter, box(0.06, 0.58, 0.02), PANEL, -0.9, 1.21, 0.45);
  part(shutter, box(0.06, 0.58, 0.02), PANEL, -0.04, 1.21, 0.45);
  glass(shutter, 0.82, 0.48, -0.47, 1.26, 0.45, 0.2);
  part(shutter, box(0.3, 0.02, 0.03), CHROME, IC.shutter[0], IC.shutter[1], IC.shutter[2], { outline: false });
  // The screen's housing and the recess under it with its shelf.
  part(g, box(0.92, 0.42, 0.5), WHITE, 0.5, 1.29, 0.19);
  part(g, box(0.92, 0.015, 0.92), PANEL_D, 0.5, 0.93, 0.0);
  part(g, box(0.92, 0.2, 0.3), PANEL, 0.5, 1.0, -0.28);
  part(g, box(0.6, 0.41, 0.012), BLACK, IC.screen[0], IC.screen[1], IC.screen[2] - 0.012);
  const screen = liveScreen(g, 0.56, 0.38, 360, 250, IC.screen[0], IC.screen[1], IC.screen[2]);
  // The bench shelf: a tray for what's taken out, a spare bottle's place.
  part(g, box(0.2, 0.012, 0.16), '#ffcdd2', IC.tray[0], 0.942, IC.tray[2], { outline: false });
  part(g, box(0.16, 0.012, 0.16), '#c8e6c9', IC.spare[0], 0.942, IC.spare[2], { outline: false });
  label(g, '보고 대기', 0.16, 0.035, IC.tray[0], 0.895, 0.445, '#ffffff', RED);
  label(g, '새 병', 0.1, 0.035, IC.spare[0], 0.895, 0.445, '#ffffff', GREEN);
  const old = bottleTool(g, 'ltBottleOld', '#ffd54f');
  const fresh = bottleTool(g, 'ltBottleNew', '#5c6bc0');
  const tools: Partial<Record<LtTool, HeldTool>> = { bottle: { tool: old, lead: 'right', grips: BOTTLE_GRIP }, bottle2: { tool: fresh, lead: 'right', grips: BOTTLE_GRIP } };
  const spots: Record<string, Spot> = { ltCulture: standAt(g, 'ltCulture', 0.56, IC.stand) };
  const show = (_now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    shutter.position.y = IC.shutterUp * clamp01(n.shutter);
    const rock = N ? (n.rock ?? 0) : 1;
    rocker.position.z = 0.012 * rock * Math.sin(t * 3);
    at(old, N ? P.old : IC.bottle);
    if (!N) old.position.z = IC.bottle[2] + rocker.position.z;
    at(fresh, N ? P.fresh : IC.spare);
    const flag = N ? (n.flag ?? 0) > 0.5 : false;
    const cleared = N ? (n.cleared ?? 0) > 0.5 : false;
    screen.draw(`${flag ? Math.floor(t * 3) : 'c'}|${cleared ? 1 : 0}`, (c) => cultureMap(c, t, flag, cleared));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, IC.bottle[0], IC.bottle[1], 0.45);
}

// =============================================================================================
// 시약 보관고 (ltReagentStore, 2 × 1): a tall cold store of packs in colours, a sliding door, a reader on the post.

function reagentStore(g: THREE.Group, out: Built) {
  const H = 2.02;
  coldShell(g, 1.94, H);
  part(g, box(0.05, H - 0.32, 0.86), WHITE, -0.0, (H - 0.12) / 2, -0.01);
  const shelves = [0.4, RS.front[1] - 0.2, RS.pack[1] - 0.2];
  const COLS = ['#e53935', '#1e88e5', '#43a047', '#fbc02d', '#7e57c2'];
  shelves.forEach((y, j) => {
    part(g, box(1.84, 0.02, 0.68), '#cfd8dc', 0, y - 0.01, -0.02, { outline: false });
    for (let i = 0; i < 7; i++) {
      const x = -0.78 + i * 0.26;
      if (j === 1 && i >= 3) continue;
      if (j === 2 && i === 5) continue;
      const col = COLS[wrap(i + j * 2, COLS.length)];
      part(g, rbox(0.12, 0.15, 0.14, 0.012), '#e3f2fd', x, y + 0.075, -0.12);
      part(g, box(0.122, 0.04, 0.142), col, x, y + 0.12, -0.12, { outline: false });
    }
  });
  part(g, box(0.5, 0.012, 0.2), '#ffe082', RS.front[0] + 0.1, RS.front[1] - 0.186, RS.front[2], { outline: false });
  label(g, '먼저 쓸 것', 0.28, 0.05, RS.front[0] + 0.1, RS.front[1] - 0.21, RS.front[2] + 0.105, AMBER, BLACK);
  label(g, `시약 보관 2~8℃ · ${FIRM}`, 1.1, 0.09, -0.34, H - 0.1, 0.435, TEAL_D, '#ffffff');
  const lcd = liveScreen(g, 0.24, 0.1, 192, 80, 0.64, H - 0.1, 0.436);
  // The doors: the left stays; the right slides across it.
  for (const y of [0.13, H - 0.25]) part(g, box(0.94, 0.04, 0.02), PANEL_D, -0.47, y, 0.42, { outline: false });
  glass(g, 0.9, H - 0.42, -0.47, (H - 0.12) / 2, 0.42, 0.14);
  const door = group(g);
  for (const y of [0.13, H - 0.25]) part(door, box(0.84, 0.05, 0.02), PANEL_D, 0.45, y, 0.455, { outline: false });
  for (const x of [0.03, 0.87]) part(door, box(0.04, H - 0.42, 0.02), PANEL_D, x, (H - 0.12) / 2, 0.455, { outline: false });
  glass(door, 0.8, H - 0.42, 0.45, (H - 0.12) / 2, 0.455, 0.14);
  part(door, box(0.024, 0.34, 0.03), CHROME, RS.handle[0], RS.handle[1], RS.handle[2] - 0.01, { outline: false });
  // The reader on the post.
  part(g, box(0.1, H - 0.1, 0.9), WHITE, 0.92, (H - 0.1) / 2, 0);
  part(g, rbox(0.09, 0.16, 0.03, 0.01), BLACK, 0.92, RS.reader[1], 0.46);
  const lamp = ownLit(g, box(0.06, 0.01, 0.003), '#a12d2d', 0.92, RS.reader[1] + 0.06, 0.477);
  const expiry = liveScreen(g, 0.07, 0.07, 64, 64, 0.92, RS.reader[1] - 0.015, 0.477);
  const pack = packTool(g);
  const tools: Partial<Record<LtTool, HeldTool>> = { pack: { tool: pack, lead: 'right', grips: PACK_GRIP } };
  const spots: Record<string, Spot> = { ltReagent: standAt(g, 'ltReagent', -0.14, RS.stand) };
  const show = (_now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    door.position.x = -RS.travel * clamp01(n.door);
    at(pack, N ? P.pack : RS.pack);
    const beep = (n.beep ?? 0) > 0.5;
    setLit(lamp, beep ? LED : '#a12d2d');
    expiry.draw(beep ? '1' : '0', (c) => {
      c.fillStyle = '#0a1a22';
      c.fillRect(0, 0, 64, 64);
      text(c, beep ? 'D-12' : '···', 32, 34, 20, beep ? AMBER : '#7a8a94', 'center');
    });
    const temp = 4.2 + 0.1 * Math.sin(t * 0.27) + 1.4 * clamp01(n.door);
    lcd.draw(`${q(temp, 10)}|${q(n.checked, 1)}`, (c) => {
      c.fillStyle = '#071a14';
      c.fillRect(0, 0, 192, 80);
      text(c, `${temp.toFixed(1)}℃`, 96, 40, 42, temp > 5.2 ? '#ffd54f' : '#7ee89e', 'center');
      if ((n.checked ?? 0) > 0.5) text(c, '기록', 176, 16, 16, '#ffffff', 'right');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0.4, 1.2, 0.4);
}

// =============================================================================================
// 결과 확인 책상 (ltVerifyDesk, 3 × 1): two screens, a phone, a logbook, a lamp that goes red.

const ROWS: ReadonlyArray<readonly [string, string, string, string]> = [['3-0911', 'Hb', '13.2', '정상'], ['3-0912', 'Glu', '98', '정상'], ['3-0913', 'AST', '24', '정상'], ['3-0914', 'K', '4.1', '정상'], ['3-0915', 'WBC', '7.5', '정상'], ['3-0916', 'PLT', '262', '정상']];
function verifyPaint(c: Ctx2, now: string | null, n: Record<string, number>, t: number) {
  const W = 480;
  const H = 300;
  const critical = now === 'ltCritical';
  const flag = (n.flag ?? 0) > 0.5;
  const urgent = LT_LIVE.statAt > t - 40 && LT_LIVE.statAt <= t;
  c.fillStyle = '#f3f8f9';
  c.fillRect(0, 0, W, H);
  screenHead(c, W, '결과 확인', critical && flag ? RED : TEAL_D, urgent ? '응급 1건 도착' : '오늘 412건');
  const rows = n.rows ?? 0;
  ROWS.forEach((row, i) => {
    const y = 66 + i * 38;
    const hot = critical && i === 2;
    c.fillStyle = hot ? (flag && Math.floor(t * 3) % 2 === 0 ? '#ffcdd2' : '#ffebee') : i % 2 ? '#e7f0f3' : '#ffffff';
    c.fillRect(6, y - 18, W - 12, 36);
    const r2: readonly string[] = hot ? ['3-0917', 'K', '6.9', '위험'] : row;
    text(c, r2[0], 16, y, 20, BLACK);
    text(c, r2[1], 120, y, 20, BLACK);
    text(c, r2[2], 240, y, 22, hot ? RED : BLACK, 'right');
    text(c, r2[3], 268, y, 18, hot ? RED : '#00695c');
    const done = !critical && i < rows;
    const told = hot && (n.called ?? 0) > 0.5;
    c.fillStyle = done || told ? '#2e7d32' : '#b0bec5';
    c.fillRect(W - 92, y - 13, 80, 26);
    text(c, told ? '통보함' : done ? '승인' : '대기', W - 52, y, 15, '#ffffff', 'center');
  });
}
function reportPaint(c: Ctx2, now: string | null, n: Record<string, number>) {
  const W = 340;
  const H = 240;
  c.fillStyle = '#10222c';
  c.fillRect(0, 0, W, H);
  if (now === 'ltCritical' && (n.zoom ?? 0) > 0.5) {
    screenHead(c, W, '위험 수치 보고', RED);
    text(c, '칼륨 6.9', 18, 70, 34, '#ff8a80');
    text(c, '보고: 응급실 담당의', 18, 116, 20, '#ffffff');
    text(c, '받은 사람 이름 복창', 18, 148, 18, '#cfe8f5');
    bar(c, 18, 180, W - 36, 16, n.log ?? 0, LED);
    text(c, (n.called ?? 0) > 0.5 ? '통화 완료 · 기록 중' : '전화 연결', 18, 214, 18, AMBER);
  } else {
    screenHead(c, W, '이전 결과와 비교', '#37474f');
    c.strokeStyle = '#4fc3f7';
    c.lineWidth = 3;
    c.beginPath();
    [150, 136, 142, 128, 134, 120].forEach((y, i) => {
      if (i) c.lineTo(30 + i * 56, y);
      else c.moveTo(30, y);
    });
    c.stroke();
    text(c, '변화 허용 범위 안', 18, 200, 18, '#7ee89e');
  }
}
function verifyDesk(g: THREE.Group, out: Built) {
  const T = VD.top;
  part(g, rbox(2.92, 0.04, 0.84, 0.01), '#e8ecee', 0, T - 0.02, 0);
  for (const x of [-1.38, 1.38]) part(g, box(0.05, T - 0.04, 0.76), PANEL_D, x, (T - 0.04) / 2, 0);
  part(g, box(2.76, 0.5, 0.02), PANEL, 0, 0.42, -0.36, { outline: false });
  part(g, rbox(0.44, 0.56, 0.6, 0.01), PANEL, -1.08, 0.3, -0.04);
  // The screens.
  part(g, box(0.72, 0.46, 0.03), BLACK, -0.16, 1.13, -0.16);
  rod(g, v3(-0.16, T, -0.17), v3(-0.16, 0.92, -0.17), 0.018, GREY_D);
  part(g, box(0.24, 0.012, 0.16), GREY_D, -0.16, T + 0.006, -0.17, { outline: false });
  const main = liveScreen(g, 0.69, 0.43, 480, 300, -0.16, 1.13, -0.143);
  part(g, box(0.5, 0.36, 0.03), BLACK, 0.52, 1.08, -0.13);
  rod(g, v3(0.52, T, -0.14), v3(0.52, 0.92, -0.14), 0.018, GREY_D);
  part(g, box(0.2, 0.012, 0.14), GREY_D, 0.52, T + 0.006, -0.14, { outline: false });
  const side = liveScreen(g, 0.47, 0.33, 340, 240, 0.52, 1.08, -0.113);
  // The red lamp for a critical value.
  part(g, cyl(0.04, 0.05, 0.03, 14), GREY_D, 0.98, T + 0.015, -0.2, { outline: false });
  const lamp = ownLit(g, ball(0.035), '#5a2020', 0.98, T + 0.055, -0.2);
  label(g, '위험 수치 바로 보고', 0.34, 0.05, 0.98, T + 0.14, -0.26, '#ffffff', RED);
  rod(g, v3(0.98, T, -0.28), v3(0.98, T + 0.11, -0.28), 0.006, GREY_D);
  // Keyboard, mouse.
  part(g, rbox(0.42, 0.018, 0.14, 0.006), GRAPHITE, VD.keys[0], T + 0.012, VD.keys[2]);
  part(g, rbox(0.06, 0.024, 0.1, 0.012), GRAPHITE, VD.mouse[0], T + 0.014, VD.mouse[2]);
  // The phone's base, the handset on it.
  part(g, rbox(0.22, 0.05, 0.18, 0.02), GRAPHITE, VD.phone[0], T + 0.025, VD.phone[2] - 0.02);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) part(g, box(0.02, 0.004, 0.014), '#90a4ae', VD.phone[0] + 0.04 + i * 0.025, T + 0.052, VD.phone[2] - 0.08 + j * 0.022, { outline: false });
  // The logbook, open, the page filling in.
  part(g, box(0.34, 0.012, 0.22), '#7b5e3b', VD.log[0], T + 0.006, VD.log[2]);
  const page = liveScreen(g, 0.32, 0.2, 256, 160, VD.log[0], T + 0.0135, VD.log[2], 0, -PI / 2);
  part(g, cyl(0.03, 0.028, 0.07, 12), GRAPHITE, VD.penRest[0], T + 0.035, VD.penRest[2]);
  // Papers, a tube rack waiting for rechecks.
  part(g, box(0.26, 0.04, 0.34), '#fbfaf6', -0.88, T + 0.02, 0.1);
  label(g, '재검 목록', 0.2, 0.04, -0.88, T + 0.045, 0.28, '#ffffff', TEAL_D);
  fixedRack(g, 1.06, T, 0.14, 3);
  chair(g, VD.seat, TEAL_D);
  const hand = handsetTool(g);
  const pen = penTool(g);
  const tools: Partial<Record<LtTool, HeldTool>> = {
    phone: { tool: hand, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.017 } } },
    pen: { tool: pen, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pen', radius: 0.007 } } },
  };
  const spots: Record<string, Spot> = { ltVerify: seatAt(g, 'ltVerify', VD.seat), ltCritical: seatAt(g, 'ltCritical', VD.seat) };
  const show = (now: string | null, N: LtNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(hand, N && now === 'ltCritical' ? P.phone : VD.phone);
    if (!(N?.tool === 'phone')) hand.rotation.set(0, 0, PI / 2);
    else hand.rotation.set(0, 0, 0);
    at(pen, N && now === 'ltCritical' ? P.pen : VD.penRest);
    const on = now === 'ltCritical' && (n.lamp ?? 0) > 0.5;
    setLit(lamp, on ? (Math.sin(t * 7) > 0 ? '#ff5252' : '#a12d2d') : '#5a2020');
    const flash = on ? Math.floor(t * 3) : 0;
    main.draw(`${now}|${q(n.rows, 1)}|${flash}|${q(n.called, 1)}|${LT_LIVE.statAt > t - 40 && LT_LIVE.statAt <= t ? 1 : 0}`, (c) => verifyPaint(c, now, n, t));
    side.draw(`${now}|${q(n.zoom, 1)}|${q(n.called, 1)}|${q(n.log, 20)}`, (c) => reportPaint(c, now, n));
    const log = clamp01(n.log);
    page.draw(`${q(log, 20)}`, (c) => {
      c.fillStyle = '#fbfaf6';
      c.fillRect(0, 0, 256, 160);
      c.strokeStyle = '#90a4ae';
      c.beginPath();
      c.moveTo(128, 0);
      c.lineTo(128, 160);
      c.stroke();
      text(c, '위험 수치 기록', 8, 16, 14, TEAL_D);
      for (let i = 0; i < 6; i++) {
        c.strokeStyle = '#cfd8dc';
        c.beginPath();
        c.moveTo(136, 22 + i * 22);
        c.lineTo(250, 22 + i * 22);
        c.stroke();
        c.fillStyle = '#546e7a';
        c.fillRect(10, 36 + i * 20, 90 - (i * 13) % 37, 3);
      }
      c.fillStyle = '#1e4f9e';
      for (let i = 0; i < 4; i++) {
        const w = clamp01(log * 4 - i) * 104;
        if (w > 0) c.fillRect(138, 16 + i * 22, w, 4);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, -0.16, 1.1, -0.1);
}

// =============================================================================================
// 감염성 폐기물함 (ltBioBin, 1 × 1): a pedal bin with the sign, a small table of used tubes.

function bioSign(c: Ctx2, s: number) {
  const m = s / 2;
  c.fillStyle = '#fff8e1';
  c.fillRect(0, 0, s, s);
  c.strokeStyle = '#d32f2f';
  c.lineWidth = s * 0.06;
  for (let i = 0; i < 3; i++) {
    const a = -PI / 2 + (i * PI * 2) / 3;
    c.beginPath();
    c.arc(m + Math.cos(a) * s * 0.17, m + Math.sin(a) * s * 0.17, pos(s * 0.17), 0, PI * 2);
    c.stroke();
  }
  c.beginPath();
  c.arc(m, m, pos(s * 0.1), 0, PI * 2);
  c.stroke();
}
function bioBin(g: THREE.Group, out: Built) {
  const X = BB.binX;
  const T = BB.top;
  part(g, rbox(0.56, T - 0.03, 0.54, 0.03), '#f9a825', X, (T - 0.03) / 2 + 0.02, 0.02);
  part(g, box(0.58, 0.05, 0.56), '#37474f', X, 0.025, 0.02, { outline: false });
  picture(g, painted('ltBioSign', 128, 128, (c) => bioSign(c, 128)), 0.26, 0.26, X, 0.46, 0.293);
  label(g, '감염성 폐기물', 0.4, 0.07, X, 0.24, 0.294, '#ffffff', '#c62828');
  const lid = group(g, X, T - 0.01, -0.25);
  part(lid, rbox(0.58, 0.05, 0.56, 0.02), '#ef6c00', 0, 0.025, 0.27);
  part(lid, box(0.14, 0.018, 0.03), GRAPHITE, 0, 0.012, 0.55, { outline: false });
  const pedal = group(g, X, 0.06, 0.3);
  part(pedal, box(0.2, 0.018, 0.14), GRAPHITE, 0, 0, 0.06, { outline: false });
  // The little table.
  const TX = BB.tray[0];
  part(g, box(0.28, 0.025, 0.42), STEEL, TX, 0.85, 0.08);
  part(g, box(0.03, 0.84, 0.03), GREY, TX, 0.42, 0.08, { outline: false });
  part(g, box(0.22, 0.015, 0.34), GREY_D, TX, 0.02, 0.08, { outline: false });
  part(g, box(0.22, 0.05, 0.1), '#eceff1', TX, 0.885, BB.tray[2]);
  for (let i = 0; i < 2; i++) fixedTube(g, TX - 0.05 + i * 0.1, BB.tray[1], BB.tray[2], CAPS[wrap(i, 3)]);
  // The sharps box on the table's back.
  part(g, box(0.2, 0.22, 0.16), '#c62828', TX, 0.975, -0.06);
  part(g, box(0.1, 0.012, 0.05), GRAPHITE, TX, 1.09, -0.06, { outline: false });
  label(g, '손상성', 0.14, 0.05, TX, 0.97, 0.022, '#ffffff', '#c62828');
  const tube = tubeTool(g, 'ltBinTube', CAPS.slice(0, 3));
  const tools: Partial<Record<LtTool, HeldTool>> = { tube: { tool: tube.root, lead: 'right', grips: TUBE_GRIP } };
  const spots: Record<string, Spot> = { ltDispose: standAt(g, 'ltDispose', -0.1, BB.stand) };
  const show = (_now: string | null, N: LtNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    lid.rotation.x = -1.15 * clamp01(n.lid);
    pedal.position.y = 0.06 - 0.03 * clamp01(n.pedal);
    at(tube.root, P.tube ?? null);
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, X, T + 0.1, 0.1);
}

// =============================================================================================
// Set dressing.

function labSign(g: THREE.Group) {
  part(g, box(0.82, 1.78, 0.05), TEAL_D, 0, 0.96, -0.38);
  picture(g, painted('ltSign', 340, 720, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 340, 720);
    c.fillStyle = TEAL_D;
    c.fillRect(0, 0, 340, 96);
    text(c, FIRM, 170, 50, 34, '#ffffff', 'center');
    text(c, '검사실 수칙', 170, 132, 28, TEAL_D, 'center');
    ['① 장갑·가운 먼저', '② 라벨 두 번 확인', '③ 팁은 한 번만', '④ 시약은 먼저 온 것부터', '⑤ 위험 수치는 바로 전화'].forEach((s, i) => text(c, s, 18, 200 + i * 66, 23, BLACK));
    c.fillStyle = '#b2ebf2';
    c.fillRect(0, 590, 340, 130);
    text(c, '정확하게,', 170, 630, 30, BLACK, 'center');
    text(c, '늦지 않게', 170, 676, 30, BLACK, 'center');
  }), 0.78, 1.7, 0, 0.96, -0.352);
  part(g, cyl(0.26, 0.28, 0.03, 18), GREY_D, 0, 0.015, -0.36);
}

// ---------------------------------------------------------------------------------------------
// The 공항검역소's pieces (2026-11-04, the branch lots: workFurniture/labTechnician.ts; the drug company's cell lab has the cabinet too).

const BSC_GLASS = new THREE.MeshToonMaterial({ color: '#cfeefb', transparent: true, opacity: 0.28, depthWrite: false });
/**
 * 생물안전작업대 (bioSafetyCabinet, 2 × 1): a class II cabinet on its stand, the white steel box with the filter housing on top and
 * its fan grille, the sloped glass sash pulled half down, the lit steel work surface inside with a rack of tubes, a pipette and a
 * waste pot; the airflow alarm's little panel. Worked at stood before the sash, the hands in under it.
 */
function bioSafetyCabinet(g: THREE.Group, W: number, out: Built) {
  const w = W - 0.12;
  // The stand.
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-0.3, 0.2]) part(g, box(0.04, 0.72, 0.04), GREY, x, 0.36, z, { outline: false });
  part(g, box(w - 0.06, 0.03, 0.5), GREY, 0, 0.12, -0.05, { outline: false });
  // The body: the back and sides, the work surface, the top with the filter housing.
  part(g, box(w, 0.9, 0.06), WHITE, 0, 1.2, -0.38);
  for (const s of [-1, 1]) part(g, box(0.06, 0.9, 0.7), WHITE, s * (w / 2 - 0.03), 1.2, -0.06);
  part(g, box(w, 0.08, 0.7), PANEL, 0, 0.78, -0.06);
  part(g, box(w - 0.12, 0.012, 0.56), STEEL, 0, 0.826, -0.1, { outline: false });
  part(g, rbox(w, 0.34, 0.72, 0.03), WHITE, 0, 1.82, -0.06);
  for (let i = 0; i < 8; i++) part(g, box(w - 0.4, 0.008, 0.01), GREY_D, 0, 1.72 + i * 0.025, 0.302, { outline: false });
  label(g, 'BSC CLASS II', 0.36, 0.06, -w / 2 + 0.35, 1.95, 0.31, WHITE, TEAL_D);
  // The lamp inside, lit.
  part(g, box(w - 0.2, 0.02, 0.06), '#fffde7', 0, 1.62, -0.25, { outline: false });
  // The sash, half down; its handle.
  const sash = new THREE.Mesh(box(w - 0.14, 0.42, 0.012), BSC_GLASS);
  sash.position.set(0, 1.38, 0.25);
  sash.rotation.x = -0.12;
  sash.renderOrder = 2;
  g.add(sash);
  part(g, box(w - 0.14, 0.03, 0.03), GREY_D, 0, 1.16, 0.28);
  // What's on the work surface.
  part(g, rbox(0.22, 0.05, 0.1, 0.01), '#1e88e5', -0.25, 0.86, -0.1);
  for (let i = 0; i < 5; i++) part(g, cyl(0.012, 0.012, 0.09, 8), i % 2 ? '#ef5350' : '#ffca28', -0.33 + i * 0.04, 0.92, -0.1, { outline: false });
  part(g, cyl(0.05, 0.045, 0.08, 14), '#fbc02d', 0.3, 0.87, -0.15);
  part(g, cyl(0.012, 0.006, 0.18, 8), '#eceff1', 0.1, 0.92, -0.05, { rz: 0.5 });
  // The airflow panel.
  part(g, rbox(0.16, 0.08, 0.02, 0.01), GRAPHITE, w / 2 - 0.2, 1.06, 0.3);
  part(g, box(0.03, 0.03, 0.006), '#69f0ae', w / 2 - 0.24, 1.06, 0.312, { outline: false });
  const s = spot(g, 'stand', 0, 0, 0.62, Math.PI);
  s.work = marker(g, 0, 0.95, -0.05);
  out.work = s.work;
  out.spots = { '*': s };
}

/**
 * 열화상 검역대 (qrThermalGate, 2 × 1): the arrivals' lane past a thermal camera on its tripod, the quarantine officer's desk with the
 * screen of faces in false colour (one red), the 발열 감시 sign on its post and the bell that stops a traveller. Watched stood at the desk.
 */
function thermalGate(g: THREE.Group, W: number, out: Built) {
  // The desk.
  part(g, rbox(1.1, 0.74, 0.5, 0.03), PANEL, -0.35, 0.37, -0.1);
  part(g, rbox(1.16, 0.04, 0.56, 0.02), WHITE, -0.35, 0.76, -0.1);
  // The screen of faces.
  part(g, rbox(0.62, 0.4, 0.04, 0.02), GRAPHITE, -0.35, 1.1, -0.22);
  part(g, box(0.04, 0.16, 0.04), GRAPHITE, -0.35, 0.86, -0.22, { outline: false });
  picture(g, painted('qrThermal', 200, 128, (c) => {
    const grd = c.createLinearGradient(0, 0, 200, 128);
    grd.addColorStop(0, '#1a237e');
    grd.addColorStop(1, '#311b92');
    c.fillStyle = grd;
    c.fillRect(0, 0, 200, 128);
    [[40, 70, '#ffb300', '36.5'], [100, 66, '#ff3d00', '38.4'], [160, 72, '#ffca28', '36.7']].forEach(([x, y, col, t]) => {
      c.fillStyle = col as string;
      c.beginPath();
      c.ellipse(x as number, y as number, 18, 24, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect((x as number) - 26, (y as number) + 22, 52, 34);
      text(c, `${t}℃`, x as number, 18, 15, t === '38.4' ? '#ff5252' : '#ffffff', 'center');
    });
    c.strokeStyle = '#ff5252';
    c.lineWidth = 3;
    c.strokeRect(74, 34, 52, 64);
  }), 0.56, 0.35, -0.35, 1.1, -0.197);
  part(g, rbox(0.3, 0.03, 0.12, 0.01), GRAPHITE, -0.35, 0.79, 0.02);
  // The camera on its tripod, looking out down the lane.
  const tx = W / 2 - 0.3;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    rod(g, new THREE.Vector3(tx + Math.cos(a) * 0.22, 0, -0.05 + Math.sin(a) * 0.22), new THREE.Vector3(tx, 1.3, -0.05), 0.012, GRAPHITE);
  }
  part(g, rbox(0.16, 0.12, 0.22, 0.02), '#eceff1', tx, 1.38, -0.05);
  part(g, cyl(0.045, 0.05, 0.06, 14), BLACK, tx, 1.38, 0.08, { rx: Math.PI / 2 });
  // The sign on its post.
  part(g, cyl(0.02, 0.02, 1.5, 8), GREY, tx + 0.15, 0.75, -0.35, { outline: false });
  label(g, '발열 감시 중', 0.4, 0.12, tx + 0.15, 1.58, -0.33, '#c62828', '#ffffff');
  label(g, '검역', 0.24, 0.07, -0.35, 0.6, 0.155, TEAL_D, '#ffffff');
  const s = spot(g, 'stand', -0.35, 0, 0.62, Math.PI);
  s.work = marker(g, -0.35, 0.82, 0.0);
  out.work = s.work;
  out.spots = { '*': s };
}

export const BUILDERS: Record<string, Builder> = {
  bioSafetyCabinet(g, W, _D, _c, _def, _ctx, out) {
    bioSafetyCabinet(g, W, out);
  },
  qrThermalGate(g, W, _D, _c, _def, _ctx, out) {
    thermalGate(g, W, out);
  },
  analyzerMachine(g, _W, _D, _c, _def, _ctx, out) {
    analyzer(g, out);
  },
  centrifugeUnit(g, _W, _D, _c, _def, _ctx, out) {
    centrifuge(g, out);
  },
  microscopeBench(g, _W, _D, _c, _def, _ctx, out) {
    microscope(g, out);
  },
  sampleFridge(g, _W, _D, _c, _def, _ctx, out) {
    sampleFridge(g, out);
  },
  ltReception(g, _W, _D, _c, _def, _ctx, out) {
    reception(g, out);
  },
  ltPipetteBench(g, _W, _D, _c, _def, _ctx, out) {
    pipetteBench(g, out);
  },
  ltIncubator(g, _W, _D, _c, _def, _ctx, out) {
    incubator(g, out);
  },
  ltReagentStore(g, _W, _D, _c, _def, _ctx, out) {
    reagentStore(g, out);
  },
  ltVerifyDesk(g, _W, _D, _c, _def, _ctx, out) {
    verifyDesk(g, out);
  },
  ltBioBin(g, _W, _D, _c, _def, _ctx, out) {
    bioBin(g, out);
  },
  ltLabSign(g) {
    labSign(g);
  },
  /**
   * 채혈대 (2026-11-04, the layout audit): a narrow desk between the phlebotomist (at its back) and the patient (at its front, on
   * a waiting seat): the arm cushion across the patient's side, on the phlebotomist's the tray of tubes in their colours, the
   * tourniquet, the swabs, a sharps box and the label printer, the booth's number on a panel behind.
   */
  ltDrawDesk(g, W, D, c) {
    const top = 0.74;
    part(g, rbox(W - 0.12, 0.04, D - 0.3, 0.012), '#f4f6f6', 0, top, -0.05);
    part(g, rbox(W - 0.16, top - 0.04, 0.04, 0.01), c, 0, (top - 0.04) / 2, 0.16);
    for (const sx of [-1, 1]) part(g, rbox(0.04, top - 0.04, D - 0.36, 0.01), c, sx * (W / 2 - 0.1), (top - 0.04) / 2, -0.05);
    // The arm cushion on the patient's side, its paper sheet.
    part(g, rbox(0.16, 0.07, 0.34, 0.03), '#4f8fc0', 0.05, top + 0.055, 0.08);
    part(g, box(0.15, 0.004, 0.2), '#ffffff', 0.05, top + 0.092, 0.1, { outline: false });
    // The tube tray: a rack of tubes by cap colour.
    part(g, rbox(0.22, 0.03, 0.1, 0.008), '#eceff1', -0.24, top + 0.035, -0.2);
    ['#e53935', '#7e57c2', '#43a047', '#fdd835', '#1e88e5', '#9e9e9e'].forEach((k, i) => {
      part(g, cyl(0.009, 0.009, 0.08, 8), '#e3f2fd', -0.33 + i * 0.036, top + 0.07, -0.2, { outline: false });
      part(g, cyl(0.011, 0.011, 0.015, 8), k, -0.33 + i * 0.036, top + 0.115, -0.2, { outline: false });
    });
    // The tourniquet, the swabs, the sharps box, the label printer.
    part(g, box(0.3, 0.004, 0.025), '#26a69a', 0.15, top + 0.024, -0.2, { ry: 0.3, outline: false });
    part(g, rbox(0.08, 0.04, 0.06, 0.01), '#ffffff', 0.32, top + 0.04, -0.12);
    part(g, rbox(0.12, 0.16, 0.12, 0.02), '#fbc02d', 0.33, top + 0.1, -0.24);
    part(g, box(0.08, 0.01, 0.04), '#d84315', 0.33, top + 0.185, -0.24, { outline: false });
    part(g, rbox(0.14, 0.08, 0.12, 0.02), '#455a64', -0.3, top + 0.06, -0.06);
    part(g, box(0.06, 0.03, 0.002), '#ffffff', -0.3, top + 0.06, 0.001, { outline: false });
    // The booth panel behind, the number lit over it.
    part(g, rbox(W - 0.16, 0.5, 0.03, 0.01), '#e0f2f1', 0, top + 0.5, -D / 2 + 0.06);
    label(g, '채혈', 0.34, 0.12, 0, top + 0.62, -D / 2 + 0.078, '#00838f', '#ffffff');
  },
};
