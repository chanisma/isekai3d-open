import * as THREE from 'three';
import { boardGrip, poseTool, type HeldTool } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, text } from './doctor';
import { BRUSH_DIR, BRUSH_UP, CAULK_DIR, CAULK_UP, CC, CUT_DIR, CUT_UP, FB, FR, KNIFE_TABLE, KNIFE_UP, KNIFE_WALL, MALLET_DIR, MALLET_UP, MB, MT, MW, PEN_DIR, PEN_UP, PEN_WALL, PLAN_ROOMS, POLE, PW, SMOOTH_DIR, SMOOTH_UP, SP, TS, WT, colX, pole, wlNow, wlPhase, wrap } from './wallpapererMotion';
import type { WlMotion, WlNow, WlTool } from './wallpapererMotion';
import type { V } from './busDriverMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * 인테리어 시공 현장 drawn as itself (2026-11-01): a Korean apartment being refitted by the invented firm 두레벽 인테리어. A pasting table on
 * trestles with the roll, the tub and the wide brush; a wet tile saw that really runs a tile through; a practice wall on a plinth where
 * wallpaper goes up strip by strip off a bench scaffold and tile goes on beside it; a wall changing colour under a roller on a pole;
 * a floor bay raised to arm's reach of a rolling stool; a stepladder at a ceiling corner; a line laser on a tripod; a plan pinned up;
 * rolls and buckets; the finished room the owner is walked round. Everything that moves follows wallpapererMotion.ts.
 */

const FIRM = '두레벽 인테리어';
const PLY = '#d9bd8e';
const PINE = '#c9a56f';
const WALNUT = '#7a5a3c';
const PLASTER = '#d9d4c8';
const PRIMER = '#efece3';
const STEEL = '#aeb6bc';
const IRON = '#454c52';
const GRAPHITE = '#2f363c';
const ORANGE = '#ef7d2c';
const YELLOW = '#f2c531';
const BLUE = '#2e6da4';
const RED = '#d13a2c';
const PAPER = '#f6efdc';
const INK = '#27272d';
const TAPE = '#f2d24b';
const SKIN = '#f1c9a5';
const PAPERS: readonly (readonly [string, string])[] = [['#c7d3bd', '#a9b99d'], ['#e6d4b8', '#cdb48e'], ['#bfd0dc', '#9db4c5'], ['#e3c9c6', '#c9a5a0']];
const PAINTS: readonly string[] = ['#9dbfae', '#e5c07b', '#8fb0cf', '#d99a8b'];
const TILES: readonly string[] = ['#e8e4da', '#dfe7ea', '#d6d0c3'];
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
const NO = { outline: false } as const;
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};
function tinted(m: THREE.Mesh): THREE.Mesh {
  m.material = (m.material as THREE.Material).clone();
  m.userData.ownMaterial = true;
  return m;
}
const tint = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshToonMaterial).color.set(c);

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
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
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
function standAt(g: THREE.Object3D, motion: WlMotion, x = 0, z = 0.6): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<WlTool, HeldTool>>, show: (now: string | null, N: WlNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? wlNow(sp.motion as WlMotion, t, wlPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
  };
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, NO);
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
function bucket(g: THREE.Object3D, x: number, y: number, z: number, color: string, tag?: string, h = 0.24) {
  part(g, cyl(0.125, 0.105, h, 16), color, x, y + h / 2, z);
  part(g, cyl(0.128, 0.128, 0.012, 16), '#f7f7f2', x, y + h, z, NO);
  if (tag) label(g, tag, 0.13, 0.07, x, y + h * 0.5, z + 0.122, '#ffffff', INK);
}
function stoolPlain(g: THREE.Object3D, x: number, y: number, z: number, color = PINE) {
  part(g, box(0.36, 0.03, 0.3), color, x, y - 0.015, z);
  for (const sx of [-1, 1]) part(g, box(0.03, y - 0.03, 0.26), color, x + sx * 0.15, (y - 0.03) / 2, z);
}
/** Dust sheet, offcuts and masking tape on the floor: a site, not a showroom. */
function siteFloor(g: THREE.Object3D, w: number, z0: number, z1: number, seed = 1) {
  part(g, box(w, 0.006, z1 - z0), '#cfc8b6', 0, 0.003, (z0 + z1) / 2, NO);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.007, z1 - z0), TAPE, sx * (w / 2 - 0.03), 0.004, (z0 + z1) / 2, NO);
  for (let i = 0; i < 3; i++) {
    const x = ((i * 0.37 + seed * 0.21) % 1) * w * 0.8 - w * 0.4;
    part(g, box(0.09, 0.008, 0.05), PAPERS[wrap(i + seed, PAPERS.length)][0], x, 0.008, z0 + ((i * 0.53 + seed * 0.13) % 1) * (z1 - z0), { ry: i * 0.7, outline: false });
  }
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand: origin at the grip, named for the probe, no ink line.

/** A root at the grip and an inner frame whose -y runs along `dir`, towards the working end. */
function handled(g: THREE.Object3D, name: string, dir: V) {
  const root = group(g);
  root.name = name;
  const inner = group(root);
  const d = v3(dir[0], dir[1], dir[2]).normalize();
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), d);
  return { root, inner, d };
}
function brushTool(g: THREE.Object3D) {
  const { root, inner, d } = handled(g, 'wlBrush', BRUSH_DIR);
  part(inner, cyl(0.014, 0.014, 0.17, 10), PINE, 0, 0, 0, NO);
  part(inner, box(0.17, 0.035, 0.03), CHROME, 0, -BRUSH_UP + 0.08, 0, NO);
  part(inner, box(0.17, 0.07, 0.03), '#e9dfc4', 0, -BRUSH_UP + 0.035, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'power' } } };
  return { root, held };
}
function knifeTool(g: THREE.Object3D, dir: V) {
  const { root, inner, d } = handled(g, 'wlKnife', dir);
  part(inner, rbox(0.022, 0.11, 0.012, 0.004), YELLOW, 0, 0.015, 0, NO);
  part(inner, box(0.024, 0.02, 0.014), BLACK, 0, -0.03, 0, NO);
  part(inner, box(0.009, 0.05, 0.0012), CHROME, 0, -KNIFE_UP + 0.025, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'pen', radius: 0.011 } } };
  return { root, held };
}
function smootherTool(g: THREE.Object3D) {
  const { root, inner, d } = handled(g, 'wlSmoother', SMOOTH_DIR);
  part(inner, cyl(0.014, 0.014, 0.1, 10), BLUE, 0, 0, 0, NO);
  part(inner, box(0.26, 0.012, 0.07), '#f4f5f2', 0, -SMOOTH_UP + 0.006, 0, NO);
  part(inner, box(0.1, 0.03, 0.03), BLUE, 0, -SMOOTH_UP + 0.025, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'power' } } };
  return { root, held };
}
function pencilTool(g: THREE.Object3D, dir: V) {
  const { root, inner, d } = handled(g, 'wlPencil', dir);
  part(inner, cyl(0.005, 0.005, PEN_UP * 0.78 + 0.07, 10), '#f0b429', 0, (0.07 - PEN_UP * 0.78) / 2, 0, NO);
  part(inner, cyl(0.005, 0.0015, PEN_UP * 0.22, 8), '#d9c3a0', 0, -PEN_UP * 0.89, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'pen', radius: 0.011 } } };
  return { root, held };
}
/** A tape drawn out between two hands, along x, its case in the right. */
function tapeTool(g: THREE.Object3D, half: number) {
  const root = group(g);
  root.name = 'wlTape';
  part(root, box(half * 2 + 0.04, 0.02, 0.002), TAPE, 0, 0, 0, NO);
  for (let i = 0; i <= 12; i++) part(root, box(0.003, 0.02, 0.0026), INK, -half + (i * 2 * half) / 12, 0, 0, NO);
  part(root, rbox(0.03, 0.075, 0.075, 0.012), ORANGE, half + 0.02, 0, 0, NO);
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: { left: { at: v3(-half, 0, 0.004), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 }, right: { at: v3(half + 0.02, 0, 0), axis: v3(0, 1, 0), shape: 'cradle', radius: 0.03 } },
  };
  return { root, held };
}
function trowelTool(g: THREE.Object3D, flat: boolean) {
  const root = group(g);
  root.name = 'wlTrowel';
  part(root, cyl(0.014, 0.014, 0.12, 10), WALNUT, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  rod(root, v3(0, 0, 0), v3(0, 0, -0.04), 0.006, STEEL);
  part(root, box(0.24, 0.1, 0.004), STEEL, 0, 0, -0.045, NO);
  for (let i = 0; i < 12; i++) part(root, box(0.009, 0.012, 0.004), STEEL, -0.11 + i * 0.02, -0.055, -0.045, NO);
  if (flat) root.rotation.x = -Math.PI / 2;
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(-1, 0, 0), palm: v3(0, 0, -1), shape: 'power' } } };
  return { root, held };
}
/** A tile against the open palm; laid flat with `flat`. */
function tileTool(g: THREE.Object3D, size: number, color: string, flat: boolean) {
  const root = group(g);
  root.name = 'wlTile';
  part(root, box(size, size, 0.008), color, 0, 0, -0.02, NO);
  if (flat) root.rotation.x = -Math.PI / 2;
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(-1, 0, 0), palm: v3(0, 0, -1), shape: 'flat', radius: 0.01 } } };
  return { root, held };
}
function rollerTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'wlRoller';
  part(root, cyl(0.013, 0.013, POLE + 0.06, 10), '#d8dcde', 0, (POLE - 0.06) / 2, 0, NO);
  rod(root, v3(0, POLE - 0.1, 0), v3(0.15, POLE - 0.05, 0), 0.005, STEEL);
  rod(root, v3(0.15, POLE - 0.05, 0), v3(0.15, POLE, 0), 0.005, STEEL);
  rod(root, v3(0.15, POLE, 0), v3(0.13, POLE, 0), 0.005, STEEL);
  const sleeve = tinted(part(root, cyl(0.036, 0.036, 0.26, 14), PAINTS[0], 0, POLE, 0, { rz: Math.PI / 2, outline: false }));
  const grips: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.013 }, left: { at: v3(0, 0.3, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.013, slide: true } };
  // Loading it in the tray and bringing it over it's in the one hand: the tray's out to the side, past where the other arm gets to.
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: grips.right } };
  const onWall: HeldTool = { tool: root, lead: 'right', grips, anchor: v3(0, POLE, 0) };
  return { root, held, onWall, sleeve };
}
function cutBrushTool(g: THREE.Object3D) {
  const { root, inner, d } = handled(g, 'wlCutBrush', CUT_DIR);
  part(inner, cyl(0.009, 0.009, 0.14, 10), '#a56a3a', 0, 0.03, 0, NO);
  part(inner, box(0.04, 0.03, 0.012), CHROME, 0, -CUT_UP + 0.06, 0, NO);
  const tip = tinted(part(inner, box(0.038, 0.05, 0.01), PAINTS[0], 0, -CUT_UP + 0.024, 0, NO));
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'pen', radius: 0.01 } } };
  return { root, held, tip };
}
function malletTool(g: THREE.Object3D) {
  const { root, inner, d } = handled(g, 'wlMallet', MALLET_DIR);
  part(inner, cyl(0.014, 0.014, MALLET_UP + 0.1, 10), PINE, 0, (0.1 - MALLET_UP) / 2, 0, NO);
  part(inner, cyl(0.042, 0.042, 0.11, 14), '#1f2124', 0, -MALLET_UP, 0, { rx: Math.PI / 2, outline: false });
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'power' } } };
  return { root, held };
}
function caulkTool(g: THREE.Object3D) {
  const { root, inner, d } = handled(g, 'wlCaulk', CAULK_DIR);
  const perp = v3(0, -d.z, d.y).normalize();
  if (perp.y < 0) perp.negate();
  const loc = perp.clone().applyQuaternion(inner.quaternion.clone().invert());
  const off = loc.clone().multiplyScalar(0.07);
  part(inner, cyl(0.026, 0.026, 0.22, 12), '#f6f6f0', off.x, -0.1 + off.y, off.z, NO);
  part(inner, cyl(0.002, 0.008, 0.1, 8), '#f6f6f0', off.x * 0.1, -CAULK_UP + 0.05, off.z * 0.1, NO);
  part(inner, box(0.06, 0.02, 0.06), RED, off.x, 0.025 + off.y, off.z, NO);
  rod(inner, loc.clone().multiplyScalar(-0.045), off, 0.013, RED);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: perp.clone(), shape: 'trigger', radius: 0.016 } } };
  return { root, held };
}
function paintClip(c: Ctx2, title: string, lines: readonly string[], ticks: number) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 160, 210);
  text(c, title, 80, 18, 14, INK, 'center');
  lines.forEach((s, i) => {
    const y = 46 + i * 30;
    text(c, s, 12, y, 13, INK, 'left', false);
    c.strokeStyle = '#7a7a7a';
    c.strokeRect(128, y - 8, 15, 15);
    if (ticks > i + 0.5) {
      c.strokeStyle = '#c62828';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(130, y);
      c.lineTo(135, y + 6);
      c.lineTo(144, y - 8);
      c.stroke();
      c.lineWidth = 1;
    }
  });
}
function clipTool(g: THREE.Object3D, title: string, lines: readonly string[]) {
  const root = group(g);
  root.name = 'wlClip';
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, rbox(0.23, 0.31, 0.01, 0.006), '#8d6e4f', 0, 0, 0, NO);
  part(tilt, box(0.09, 0.02, 0.012), CHROME, 0, 0.145, 0.008, NO);
  const page = liveScreen(tilt, 0.205, 0.27, 160, 210, 0, -0.008, 0.008);
  // The pencil in the other hand comes with it, its point moving on the page about the grip.
  const penAt = v3(0.085, 0.09, 0.075);
  const pen = group(root, penAt.x, penAt.y, penAt.z);
  const penDir = v3(-0.32, -0.75, -0.5).normalize();
  const inner = group(pen);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), penDir);
  part(inner, cyl(0.005, 0.0016, 0.12, 8), '#f0b429', 0, -0.03, 0, NO);
  const held: HeldTool = {
    tool: root,
    lead: 'left',
    grips: { left: boardGrip(0.75, { x: -0.06 }), right: { at: penAt.clone(), axis: penDir.clone(), shape: 'pen', radius: 0.01 } },
  };
  const show = (ticks: number, t: number) => {
    pen.rotation.set(0.08 * Math.sin(t * 7), 0.1 * Math.sin(t * 2.3), 0);
    page.draw(`${title}|${Math.floor(ticks)}`, (c) => paintClip(c, title, lines, ticks));
  };
  return { root, held, show };
}
/** A pasted strip booked into a bundle, carried on the flat of both hands. */
function bundleTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'wlBundle';
  const b = tinted(part(root, box(0.44, 0.05, 0.2), PAPERS[0][0], 0, 0, 0, NO));
  part(root, box(0.445, 0.006, 0.205), '#fbf7ea', 0, 0.006, 0, NO);
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: { left: { at: v3(-0.16, -0.03, 0.02), axis: v3(-1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.008 }, right: { at: v3(0.16, -0.03, 0.02), axis: v3(1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.008 } },
  };
  return { root, held, b };
}
function plankTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'wlPlank';
  part(root, box(FB.boardL, 0.014, 0.19), '#b98b58', 0, -0.012, 0, NO);
  for (const dz of [-0.05, 0.03]) part(root, box(FB.boardL - 0.02, 0.0012, 0.003), '#8f6a42', 0, -0.0042, dz, NO);
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: { left: { at: v3(-0.13, 0, 0.02), axis: v3(1, 0, 0), palm: v3(0, -1, 0), shape: 'flat', radius: 0.008 }, right: { at: v3(0.13, 0, 0.02), axis: v3(-1, 0, 0), palm: v3(0, -1, 0), shape: 'flat', radius: 0.008 } },
  };
  return { root, held };
}
function rollTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'wlRoll';
  part(root, cyl(0.05, 0.05, 0.72, 14), PAPERS[1][0], 0, 0, 0, { rz: Math.PI / 2 });
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: { left: { at: v3(-0.2, -0.05, 0), axis: v3(-1, 0, 0), palm: v3(0, 1, 0), shape: 'cradle', radius: 0.045 }, right: { at: v3(0.2, -0.05, 0), axis: v3(1, 0, 0), palm: v3(0, 1, 0), shape: 'cradle', radius: 0.045 } },
  };
  return { root, held };
}
function paintPattern(c: Ctx2, x: number, y: number, w: number, h: number, pal: readonly [string, string], k: number) {
  c.fillStyle = pal[0];
  c.fillRect(x, y, Math.max(0, w), Math.max(0, h));
  c.save();
  c.beginPath();
  c.rect(x, y, Math.max(0, w), Math.max(0, h));
  c.clip();
  c.fillStyle = pal[1];
  c.strokeStyle = pal[1];
  const s = 22;
  const style = wrap(k, 3);
  for (let i = -1; i * s < w + s; i++) {
    for (let j = -1; j * s < h + s; j++) {
      const px = x + i * s + (wrap(j, 2) ? s / 2 : 0);
      const py = y + j * s;
      if (style === 0) {
        c.beginPath();
        c.arc(px, py, 3, 0, Math.PI * 2);
        c.fill();
      } else if (style === 1) {
        c.fillRect(px - 1, py - 6, 2, 12);
      } else {
        c.beginPath();
        c.moveTo(px, py - 5);
        c.lineTo(px + 5, py);
        c.lineTo(px, py + 5);
        c.lineTo(px - 5, py);
        c.closePath();
        c.stroke();
      }
    }
  }
  c.restore();
}
/** A sample book held open, its page live. */
function bookTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'wlBook';
  const tilt = group(root);
  tilt.rotation.x = -0.6;
  part(tilt, box(0.46, 0.28, 0.02), '#39424a', 0, 0, -0.012, NO);
  const page = liveScreen(tilt, 0.44, 0.26, 256, 150, 0, 0, 0.001);
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: { left: { at: v3(-0.17, -0.06, 0.02), axis: v3(-1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 }, right: { at: v3(0.17, -0.06, 0.02), axis: v3(1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 } },
  };
  const show = (pg: number) => {
    const i = wrap(pg, PAPERS.length);
    page.draw(`${i}`, (c) => {
      c.fillStyle = '#fafafa';
      c.fillRect(0, 0, 256, 150);
      paintPattern(c, 8, 8, 112, 134, PAPERS[i], i);
      paintPattern(c, 136, 8, 112, 134, PAPERS[wrap(i + 1, PAPERS.length)], i + 1);
    });
  };
  return { root, held, show };
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come. All grown-ups.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seed?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, 1.37, 0, NO);
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, NO);
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, top);
    const lower = limb(root, 0.035, SKIN);
    const hand = part(root, ball(0.036), SKIN, 0, 0, 0, NO);
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
  const opts: FigureOptions = { gender, seed };
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

// =============================================================================================
// 도배 풀칠대 (wallpaperTable, 2 × 1).

function paintBack(c: Ctx2, paste: number) {
  c.fillStyle = '#f7f3e6';
  c.fillRect(0, 0, 384, 114);
  const w = 384 * clamp01(paste);
  if (w > 0) {
    c.fillStyle = '#dcd9c4';
    c.fillRect(0, 0, w, 114);
    c.strokeStyle = 'rgba(255,255,255,0.65)';
    c.lineWidth = 2;
    for (let i = 0; i * 14 < w; i++) {
      c.beginPath();
      c.moveTo(i * 14, 0);
      c.quadraticCurveTo(i * 14 + 10, 57, i * 14 - 2, 114);
      c.stroke();
    }
    c.lineWidth = 1;
  }
}
function paintPlanSheet(c: Ctx2, marks: number) {
  c.fillStyle = '#f2f0e4';
  c.fillRect(0, 0, 300, 150);
  c.strokeStyle = '#3f5f8a';
  c.lineWidth = 3;
  c.strokeRect(20, 18, 260, 112);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(140, 18);
  c.lineTo(140, 130);
  c.moveTo(20, 76);
  c.lineTo(140, 76);
  c.stroke();
  c.lineWidth = 1;
  text(c, '안방 벽', 80, 44, 14, '#3f5f8a', 'center', false);
  text(c, '거실 벽', 210, 72, 14, '#3f5f8a', 'center', false);
  if (marks > 0.5) text(c, '3,420', 80, 110, 15, RED, 'center');
  if (marks > 1.5) text(c, '4,860', 210, 110, 15, RED, 'center');
}
function wallpaperTable(g: THREE.Group, out: Built) {
  const T = WT.top;
  siteFloor(g, 2, -0.46, 0.46, seedOf(g) + 1);
  part(g, box(1.92, 0.03, 0.64), PLY, 0, T - 0.015, WT.tz);
  part(g, box(1.92, 0.004, 0.64), '#e6dcc4', 0, T + 0.001, WT.tz, NO);
  // Trestles, sawn and scuffed.
  for (const sx of [-1, 1]) {
    part(g, box(0.06, 0.05, 0.6), PINE, sx * 0.72, T - 0.055, WT.tz);
    for (const sz of [-1, 1]) for (const lean of [-1, 1]) rod(g, v3(sx * 0.72, T - 0.06, WT.tz + sz * 0.26), v3(sx * 0.72 + lean * 0.12, 0.02, WT.tz + sz * 0.3), 0.016, PINE);
  }
  // The roll on its spindle at the left end, the tub at the right, a steel rule along the far side.
  for (const sz of [-1, 1]) part(g, box(0.02, 0.18, 0.02), IRON, WT.x0 - 0.07, T + 0.09, WT.stripZ + sz * 0.26, NO);
  const roll = part(g, cyl(0.065, 0.065, 0.42, 16), '#f7f3e6', WT.x0 - 0.07, T + 0.14, WT.stripZ, { rx: Math.PI / 2 });
  rod(g, v3(WT.x0 - 0.07, T + 0.14, WT.stripZ - 0.27), v3(WT.x0 - 0.07, T + 0.14, WT.stripZ + 0.27), 0.008, IRON);
  part(g, cyl(0.1, 0.085, 0.14, 16), '#e9ebee', WT.tub[0], T + 0.07, WT.tub[2]);
  part(g, cyl(0.09, 0.09, 0.006, 16), '#f3f0da', WT.tub[0], T + 0.12, WT.tub[2], NO);
  label(g, '도배풀', 0.11, 0.05, WT.tub[0], T + 0.07, WT.tub[2] + 0.1, '#ffffff', BLUE);
  part(g, box(1.5, 0.008, 0.04), STEEL, -0.2, T + 0.008, WT.tz - 0.26, NO);
  for (let i = 0; i < 12; i++) part(g, box(0.003, 0.009, 0.02), BLACK, -0.9 + i * 0.13, T + 0.009, WT.tz - 0.26, NO);
  // The strip being worked.
  const LEN = WT.x1 - WT.x0;
  const strip = liveScreen(g, LEN, WT.stripW, 384, 114, 0, T + 0.004, WT.stripZ, 0, -Math.PI / 2);
  strip.mesh.visible = false;
  const stacked: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) stacked.push(part(g, box(0.26, 0.022, 0.18), '#efe9d6', WT.stack[0], T + 0.012 + i * 0.024, WT.stack[2], NO));
  const sheet = liveScreen(g, 0.74, 0.37, 300, 150, WT.sheet[0], WT.sheet[1], WT.sheet[2], 0, -Math.PI / 2);
  sheet.mesh.visible = false;
  const sample = tinted(part(g, box(0.46, 0.004, 0.34), PAPERS[0][0], WT.sheet[0], T + 0.004, WT.sheet[2], NO));
  sample.visible = false;
  const brush = brushTool(g);
  const knife = knifeTool(g, KNIFE_TABLE);
  const bundle = bundleTool(g);
  tint(bundle.b, '#efe9d6');
  const tape = tapeTool(g, 0.26);
  const clip = clipTool(g, '실측 메모', ['안방 높이', '안방 폭', '거실 높이', '거실 폭', '걸레받이']);
  const book = bookTool(g);
  const mate = lazy(() => person(g, '#ffab91', '#4a5259', '#3a2a1c', WT.mate[0], WT.mate[2], 0, 'male', seedOf(g) + 11));
  const owner = lazy(() => person(g, '#8a9fb5', '#3f4a54', '#1f1a16', WT.owner[0], WT.owner[2], 0, 'female', seedOf(g) + 23));
  const spots: Record<string, Spot> = {
    pasteWallpaper: standAt(g, 'wlPaste', 0, WT.stand),
    wallpaperer_measureRoom: standAt(g, 'wlMeasureRoom', 0, WT.stand),
    wallpaperer_pickPattern: standAt(g, 'wlPickPaper', 0, WT.stand),
  };
  let done = 0;
  const a = v3(0, 0, 0);
  drive(g, out, spots, { brush: brush.held, knife: knife.held, bundle: bundle.held, tape: tape.held, clip: clip.held, book: book.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const pasting = now === 'pasteWallpaper';
    strip.mesh.visible = pasting && (n.gone ?? 0) < 0.5 && (n.len ?? 0) > 0.001;
    if (pasting) {
      const k = Math.max(0.02, clamp01(n.len) * (1 - 0.72 * clamp01(n.fold)));
      strip.mesh.scale.x = k;
      strip.mesh.position.x = WT.x0 + (LEN * k) / 2;
      strip.draw(`${q(n.paste, 40)}`, (c) => paintBack(c, n.paste ?? 0));
      done = wrap(N?.b.n ?? 0, 4);
    }
    roll.scale.x = roll.scale.z = 1 - 0.04 * clamp01(n.len);
    const cnt = done + (pasting && (n.stacked ?? 0) > 0.5 ? 1 : 0);
    stacked.forEach((m, i) => (m.visible = i < cnt));
    sheet.mesh.visible = (n.sheet ?? 0) > 0.5;
    if (sheet.mesh.visible) sheet.draw(`${q(n.marks, 1)}`, (c) => paintPlanSheet(c, n.marks ?? 0));
    sample.visible = (n.sample ?? 0) > 0.5;
    if (sample.visible) tint(sample, PAPERS[wrap(n.page ?? 0, PAPERS.length)][0]);
    at(brush.root, N?.props.brush ?? null, WT.brushHome);
    at(knife.root, N?.props.knife ?? null, WT.knifeHome);
    at(bundle.root, N?.props.bundle ?? null, null);
    at(tape.root, N?.props.tape ?? null, null);
    at(clip.root, N?.props.clip ?? null, null);
    at(book.root, N?.props.book ?? null, null);
    if (clip.root.visible) clip.show(n.ticks ?? 0, t);
    if (book.root.visible) book.show(n.page ?? 0);
    if ((n.mate ?? 0) > 0.5) {
      const F = mate.get();
      F.root.visible = true;
      nodHead(F, (n.mateNod ?? 0) > 0.5 ? 0.2 + 0.12 * Math.sin(t * 4) : 0.34);
      a.set(WT.sheet[0] + 0.2, T + 0.05, -0.32);
      F.armR(a);
    } else mate.hide();
    if ((n.owner ?? 0) > 0.5) {
      const F = owner.get();
      F.root.visible = true;
      nodHead(F, (n.ownerNod ?? 0) > 0.5 ? 0.14 + 0.14 * Math.sin(t * 4) : 0.26);
    } else owner.hide();
  });
  out.work = marker(g, 0, T + 0.05, WT.stripZ);
}

// =============================================================================================
// 타일 절단기 (tileSaw, 1 × 1).

function tileSaw(g: THREE.Group, out: Built) {
  const T = TS.top;
  const bx = TS.blade[0];
  part(g, box(0.96, 0.006, 0.96), '#c5c0b0', 0, 0.003, 0, NO);
  // The stand and shelf.
  for (const [x, z] of [[-0.44, -0.3], [0.38, -0.3], [-0.44, 0.34], [0.38, 0.34]]) part(g, box(0.035, T - 0.09, 0.035), BLUE, x, (T - 0.09) / 2, z, NO);
  part(g, box(0.86, 0.03, 0.68), BLUE, -0.03, T - 0.1, 0.02);
  part(g, box(0.82, 0.02, 0.6), BLUE, -0.03, 0.28, 0.02, NO);
  bucket(g, 0.2, 0.29, 0.1, '#e9ebee', '물');
  // The water tray with its dark water, the slide rails.
  part(g, box(0.46, 0.09, 0.62), STEEL, bx, T - 0.045, 0.02);
  part(g, box(0.42, 0.004, 0.58), '#5a7686', bx, T - 0.002, 0.02, NO);
  for (const sx of [-1, 1]) part(g, cyl(0.009, 0.009, 0.6, 8), CHROME, bx + sx * 0.2, T + 0.012, 0.02, { rx: Math.PI / 2, outline: false });
  // Pillar and arm, the red guard, and the diamond blade turning under it.
  part(g, box(0.05, 0.3, 0.05), RED, bx + 0.21, T + 0.14, -0.26);
  part(g, rbox(0.12, 0.1, 0.32, 0.03), RED, bx + 0.12, T + 0.3, -0.13);
  part(g, cyl(0.04, 0.04, 0.17, 12), GRAPHITE, bx + 0.09, T + 0.25, -0.02, { rz: Math.PI / 2 });
  part(g, rbox(0.03, 0.08, 0.27, 0.02), RED, bx, T + 0.17, -0.02);
  const blade = group(g, bx, T + 0.1, -0.02);
  part(blade, cyl(0.1, 0.1, 0.004, 24), '#c7ccd0', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(blade, box(0.006, 0.05, 0.05), '#6f7a80', 0, 0, 0, NO);
  label(g, '젖은 날 주의', 0.14, 0.04, bx + 0.12, T + 0.28, 0.03, YELLOW, INK);
  const lamp = ownLit(g, ball(0.012), '#3f2a2a', bx + 0.18, T + 0.3, 0.03);
  // The sliding table with the tile on it.
  const table = group(g, bx, T + 0.03, TS.slideFrom);
  part(table, box(0.34, 0.016, 0.34), GRAPHITE, 0, 0, 0, NO);
  const tileA = part(table, box(0.15, 0.008, 0.3), TILES[0], -0.075, 0.013, 0, NO);
  const tileB = part(table, box(0.15, 0.008, 0.3), TILES[0], 0.075, 0.013, 0, NO);
  const pencilLine = part(table, box(0.002, 0.009, 0.3), INK, 0, 0.0135, 0, NO);
  const spray = haze(g, new THREE.PlaneGeometry(0.2, 0.16), '#cfe7f5', 0.45, bx, T + 0.1, 0.1);
  // The stack at the left, the cut pieces behind it.
  part(g, box(0.34, 0.02, 0.54), PLY, TS.pile[0], T - 0.01, 0.02);
  for (let i = 0; i < 4; i++) part(g, box(0.28, 0.008, 0.28), TILES[wrap(i, 3)], TS.pile[0], T + 0.006 + i * 0.009, TS.pile[2], NO);
  const cuts: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) cuts.push(part(g, box(0.22, 0.008, 0.14), TILES[wrap(i, 3)], TS.done[0], T + 0.006 + i * 0.009, TS.done[2], NO));
  const tile = tileTool(g, 0.3, TILES[0], true);
  const pencil = pencilTool(g, PEN_DIR);
  const clip = clipTool(g, '타일 배치도', ['기준선', '가로 줄눈', '세로 줄눈', '잘림 타일', '수량']);
  const spots: Record<string, Spot> = { cutTiles: standAt(g, 'wlCutTile', 0, TS.stand), wallpaperer_planLayout: standAt(g, 'wlTilePlan', 0, TS.stand) };
  drive(g, out, spots, { tile: tile.held, pencil: pencil.held, clip: clip.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const cutting = now === 'cutTiles';
    const run = (n.run ?? 0) > 0.5;
    if (run) blade.rotation.x = -t * 40;
    setLit(lamp, run ? '#ff5a3c' : '#3f2a2a');
    spray.visible = run;
    if (run) spray.scale.set(0.9 + 0.2 * Math.sin(t * 31), 0.9 + 0.2 * Math.cos(t * 23), 1);
    table.position.z = THREE.MathUtils.lerp(TS.slideFrom, TS.slideTo, clamp01(n.slide));
    const on = cutting && (n.onTable ?? 0) > 0.5;
    const split = clamp01(n.split);
    tileA.visible = tileB.visible = on;
    pencilLine.visible = on && clamp01(n.cut) < 0.98;
    tileA.position.x = -0.075 - 0.02 * split;
    tileB.position.x = 0.075 + 0.02 * split;
    cuts.forEach((m, i) => (m.visible = i < wrap(N?.b.n ?? 2, 3) + (cutting && (n.stacked ?? 0) > 0.5 ? 1 : 0)));
    at(tile.root, N?.props.tile ?? null, null);
    at(pencil.root, N?.props.pencil ?? null, TS.pencil);
    at(clip.root, N?.props.clip ?? null, null);
    if (clip.root.visible) clip.show((n.ticks ?? 0) / 3.2, t);
  });
  out.work = marker(g, bx, T + 0.05, 0.1);
}

// =============================================================================================
// 시공 연습 벽 (mockWall, 2 × 1).

const WF_W = 2;
const WF_Y0 = 0.42;
const WF_H = 1.68;
const WF_PX = 200;
const wx = (x: number) => (x + WF_W / 2) * WF_PX;
const wy = (y: number) => (WF_Y0 + WF_H - y) * WF_PX;
function paintFace(c: Ctx2, hung: number, idx: number, open: number, smooth: number, trim: number, palette: number, row: number, set: number, comb: number) {
  const W = WF_W * WF_PX;
  const H = WF_H * WF_PX;
  c.fillStyle = PLASTER;
  c.fillRect(0, 0, W, H);
  // Filler patches and pencil lines on a bare wall.
  c.fillStyle = '#c9c4b5';
  for (const [x, y, w, h] of [[30, 90, 50, 26], [190, 220, 70, 20], [120, 40, 30, 40]]) c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(70,70,80,0.5)';
  for (const x of MW.strips) {
    c.beginPath();
    c.moveTo(wx(x - MW.stripW / 2), 0);
    c.lineTo(wx(x - MW.stripW / 2), H);
    c.stroke();
  }
  const pal = PAPERS[wrap(palette, PAPERS.length)];
  const pw = MW.stripW * WF_PX;
  const y0 = wy(MW.top);
  const yB = wy(MW.bottom);
  for (let i = 0; i < hung && i < MW.strips.length; i++) paintPattern(c, wx(MW.strips[i] - MW.stripW / 2), y0, pw, yB - y0, pal, palette);
  // The strip going up: opened down to here, smooth down to there; below it, the air still under it.
  const o = clamp01(open);
  if (o > 0.001 && idx >= 0 && idx < MW.strips.length) {
    const sx = wx(MW.strips[idx] - MW.stripW / 2);
    const over = (1 - clamp01(trim)) * 10;
    const h = (yB - y0 + over * 2) * o;
    paintPattern(c, sx, y0 - over, pw, h, pal, palette);
    const done = clamp01(smooth) * h;
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const y = y0 - over + done + ((h - done) * (i + 0.5)) / 7;
      if (h - done < 2) break;
      c.beginPath();
      c.moveTo(sx + 4, y);
      c.quadraticCurveTo(sx + pw / 2, y + (i % 2 ? 7 : -7), sx + pw - 4, y + 2);
      c.stroke();
    }
    c.lineWidth = 1;
  }
  // The tile board at the right.
  const tx0 = wx(MW.tileCols[0] - 0.08);
  const tW = (MW.tileCols[2] - MW.tileCols[0] + 0.16) * WF_PX;
  const boardTop = wy(MW.tileY + (MW.tileRows - 0.5) * MW.tileH);
  c.fillStyle = '#b9b6a9';
  c.fillRect(tx0, boardTop, tW, wy(MW.tileY - 0.08) - boardTop);
  const ts = (MW.tileH - 0.008) * WF_PX;
  for (let r = 0; r <= row && r < MW.tileRows; r++) {
    const y = MW.tileY + r * MW.tileH;
    if (r === row && comb > 0) {
      const top = wy(y + MW.tileH / 2);
      c.fillStyle = '#9b9a90';
      c.fillRect(tx0, top, tW * clamp01(comb), MW.tileH * WF_PX);
      c.strokeStyle = '#7d7c72';
      for (let i = 0; i < 10; i++) {
        c.beginPath();
        c.moveTo(tx0, top + i * 3.2);
        c.lineTo(tx0 + tW * clamp01(comb), top + i * 3.2);
        c.stroke();
      }
    }
    for (let k = 0; k < 3; k++) {
      if (r === row && k >= set - 0.01) continue;
      c.fillStyle = TILES[wrap(r + k, 3)];
      c.fillRect(wx(MW.tileCols[k]) - ts / 2, wy(y) - ts / 2, ts, ts);
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.strokeRect(wx(MW.tileCols[k]) - ts / 2 + 2, wy(y) - ts / 2 + 2, ts - 4, ts - 4);
    }
  }
}
function mockWall(g: THREE.Group, out: Built) {
  const F = MW.face;
  siteFloor(g, 2, -0.46, 0.5, seedOf(g) + 2);
  // The wall: a plinth under it, studs behind, plywood with the live canvas on its face.
  part(g, box(WF_W + 0.04, WF_Y0, 0.26), '#b7a78a', 0, WF_Y0 / 2, F - 0.13);
  part(g, box(WF_W + 0.04, WF_H + 0.12, 0.08), PLY, 0, WF_Y0 + WF_H / 2 + 0.06, F - 0.042);
  for (const x of [-1, -0.33, 0.33, 1]) part(g, box(0.05, WF_H + 0.12, 0.1), PINE, x * 0.99, WF_Y0 + WF_H / 2 + 0.06, F - 0.13);
  const face = liveScreen(g, WF_W, WF_H, WF_W * WF_PX, Math.round(WF_H * WF_PX), 0, WF_Y0 + WF_H / 2, F + 0.002);
  face.draw('first', (c) => paintFace(c, 0, -1, 0, 0, 0, 0, -1, 0, 0));
  label(g, FIRM, 0.46, 0.06, -0.4, WF_Y0 + WF_H + 0.07, F + 0.003, '#2e3b4a', '#f7f3e6');
  const rush = label(g, '내일 입주! 오늘 마감', 0.46, 0.1, 0.68, 1.84, F + 0.008, RED, '#ffffff');
  rush.visible = false;
  // The bench scaffold (우마): a plank on folding legs, shoved along by foot.
  const bench = group(g, MW.strips[0], 0, MW.benchZ);
  part(bench, box(0.66, 0.035, 0.3), PINE, 0, MW.bench - 0.018, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) rod(bench, v3(sx * 0.26, MW.bench - 0.03, sz * 0.08), v3(sx * 0.3, 0.01, sz * 0.14), 0.014, STEEL);
    part(bench, box(0.03, 0.02, 0.28), STEEL, sx * 0.28, 0.14, 0, NO);
  }
  // The trolley of booked strips, the adhesive bucket, the tile pile.
  part(g, box(0.4, 0.03, 0.3), BLUE, MW.trolley[0], MW.trolley[1] - 0.02, MW.trolley[2]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.02, MW.trolley[1] - 0.04, 0.02), BLUE, MW.trolley[0] + sx * 0.17, (MW.trolley[1] - 0.04) / 2, MW.trolley[2] + sz * 0.12, NO);
  part(g, box(0.34, 0.03, 0.2), '#efe9d6', MW.trolley[0], MW.trolley[1] + 0.012, MW.trolley[2], NO);
  stoolPlain(g, MW.bucket[0], MW.bucket[1] - 0.2, MW.bucket[2]);
  bucket(g, MW.bucket[0], MW.bucket[1] - 0.2, MW.bucket[2], '#e9ebee', '접착제', 0.2);
  stoolPlain(g, MW.tilePile[0], MW.tilePile[1] - 0.04, MW.tilePile[2]);
  for (let i = 0; i < 3; i++) part(g, box(0.15, 0.008, 0.15), TILES[wrap(i, 3)], MW.tilePile[0], MW.tilePile[1] - 0.03 + i * 0.009, MW.tilePile[2], NO);
  const smoother = smootherTool(g);
  const knife = knifeTool(g, KNIFE_WALL);
  const bundle = bundleTool(g);
  const trowel = trowelTool(g, false);
  const tile = tileTool(g, 0.15, TILES[0], false);
  const clip = clipTool(g, '시공 견적', ['벽 면적', '벽지 롤', '풀·부자재', '타일', '인건비', '일정']);
  const spots: Record<string, Spot> = {
    hangWallpaper: standAt(g, 'wlHang', 0, 0.42),
    layTiles: standAt(g, 'wlWallTile', 0.7, 0.42),
    moveInDeadline: standAt(g, 'wlDeadline', 0, 0.42),
    wallpaperer_quoteProject: standAt(g, 'wlQuote', 0, 0.42),
  };
  // What's up stays up after the shift has gone home.
  let hung = 0;
  let row = -1;
  let set = 0;
  let palette = wrap(seedOf(g), PAPERS.length);
  let lastIdx = -1;
  drive(g, out, spots, { smoother: smoother.held, knife: knife.held, bundle: bundle.held, trowel: trowel.held, tile: tile.held, clip: clip.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const hanging = now === 'hangWallpaper' || now === 'moveInDeadline';
    let idx = -1;
    if (hanging) {
      idx = wrap(n.idx ?? 0, 3);
      // A bare wall and a new paper each time the three strips come round.
      if (idx === 0 && lastIdx !== 0) palette = wrap(palette + 1, PAPERS.length);
      lastIdx = idx;
      hung = idx;
      // Shoved along by foot: it slides to where it's next wanted, never jumps.
      bench.position.x += (MW.strips[idx] + clamp01(n.bench) * (idx < 2 ? 0.56 : -0.56) - bench.position.x) * 0.15;
    }
    if (now === 'layTiles') {
      row = wrap(n.row ?? 0, MW.tileRows);
      set = n.set ?? 0;
    }
    rush.visible = (n.rush ?? 0) > 0.5;
    if (now) {
      face.draw(`${hung}|${idx}|${q(n.open, 40)}|${q(n.smooth, 40)}|${q(n.trim, 20)}|${palette}|${row}|${q(set, 4)}|${q(n.comb, 20)}`, (c) => paintFace(c, hung, idx, n.open ?? 0, n.smooth ?? 0, n.trim ?? 0, palette, row, set, n.comb ?? 0));
    }
    tint(bundle.b, PAPERS[palette][0]);
    at(smoother.root, N?.props.smoother ?? null, MW.smootherHome);
    at(knife.root, N?.props.knife ?? null, MW.knifeHome);
    at(bundle.root, N?.props.bundle ?? null, null);
    at(trowel.root, N?.props.trowel ?? null, MW.trowelHome);
    at(tile.root, N?.props.tile ?? null, null);
    at(clip.root, N?.props.clip ?? null, null);
    if (clip.root.visible) clip.show(n.ticks ?? 0, t);
  });
  out.work = marker(g, 0, 1.2, F + 0.05);
}

// =============================================================================================
// 페인트 벽 (wlPaintWall, 2 × 1).

const PX_M = 190;
function paintColours(c: Ctx2, col: number, cov: number, coat: number, edge: number) {
  const W = PW.w * PX_M;
  const H = (PW.top - PW.bottom) * PX_M;
  const now = PAINTS[wrap(coat, PAINTS.length)];
  c.fillStyle = coat > 0 ? PAINTS[wrap(coat - 1, PAINTS.length)] : PRIMER;
  c.fillRect(0, 0, W, H);
  const span = W / PW.cols;
  c.fillStyle = now;
  c.fillRect(0, 0, span * col, H);
  if (cov > 0) {
    // Four passes up and down the column, each laying its own band.
    const bands = Math.min(4, cov * 4);
    for (let i = 0; i < 4; i++) {
      const e = clamp01(bands - i);
      if (e <= 0) break;
      const x = span * col + (i * span) / 4;
      const h = H * e;
      c.fillRect(x, i % 2 === 0 ? H - h : 0, span / 4 + 1, h);
    }
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(span * col, 0, span * clamp01(cov), H);
  }
  if (edge > 0) {
    c.fillStyle = now;
    const yt = (PW.top - 1.72) * PX_M;
    const yb = (PW.top - 0.72) * PX_M;
    c.fillRect((0.85 - PW.left) * PX_M, yt, 0.1 * PX_M, (yb - yt) * clamp01(edge));
  }
  c.strokeStyle = 'rgba(0,0,0,0.12)';
  c.strokeRect(1, 1, W - 2, H - 2);
}
function paintWall(g: THREE.Group, out: Built) {
  const F = PW.face;
  siteFloor(g, 2, -0.46, 0.5, seedOf(g) + 3);
  part(g, box(PW.w + 0.1, PW.top - PW.bottom + 0.12, 0.08), PLY, 0, (PW.top + PW.bottom) / 2, F - 0.042);
  for (const sx of [-1, 1]) {
    part(g, box(0.06, PW.top, 0.1), PINE, sx * 0.99, PW.top / 2, F - 0.11);
    part(g, box(0.06, 0.05, 0.46), PINE, sx * 0.99, 0.03, F);
  }
  const face = liveScreen(g, PW.w, PW.top - PW.bottom, Math.round(PW.w * PX_M), Math.round((PW.top - PW.bottom) * PX_M), 0, (PW.top + PW.bottom) / 2, F + 0.002);
  face.draw('first', (c) => paintColours(c, 0, 0, 0, 0));
  // Masking tape round the edges, a socket with its plate off.
  for (const y of [PW.top - 0.015, PW.bottom + 0.015]) part(g, box(PW.w, 0.03, 0.003), TAPE, 0, y, F + 0.004, NO);
  part(g, box(0.08, 0.1, 0.004), BLACK, -0.3, 0.36, F + 0.004, NO);
  // The stool with the tray and its well of paint; the can; the small brush's pot on the stool's corner.
  stoolPlain(g, PW.tray[0], PW.tray[1] - 0.04, PW.tray[2]);
  part(g, box(0.34, 0.04, 0.3), '#40474d', PW.tray[0], PW.tray[1] - 0.02, PW.tray[2]);
  const well = tinted(part(g, box(0.3, 0.006, 0.26), PAINTS[0], PW.tray[0], PW.tray[1] + 0.002, PW.tray[2], NO));
  const can = tinted(part(g, cyl(0.1, 0.1, 0.2, 16), PAINTS[0], 0.46, 0.1, 0.38));
  part(g, cyl(0.104, 0.104, 0.01, 16), CHROME, 0.46, 0.2, 0.38, NO);
  label(g, '수성 페인트', 0.14, 0.05, 0.46, 0.1, 0.482, '#ffffff', INK);
  const pot = tinted(part(g, cyl(0.05, 0.045, 0.09, 12), PAINTS[0], PW.pot[0], PW.pot[1] + 0.045, PW.pot[2]));
  const roller = rollerTool(g);
  const brush = cutBrushTool(g);
  const spots: Record<string, Spot> = { wlRoll: standAt(g, 'wlRoll', 0, PW.stand), wlCutIn: standAt(g, 'wlCutIn', 0.55, 0.42) };
  let col = 0;
  let cov = 0;
  let coat = 0;
  let edge = 0;
  const rest = pole([0.82, 1.55, F + 0.05], [0.8, 0.9, 0.34]);
  const ORIGIN = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const pp = new THREE.Vector3();
  drive(g, out, spots, { roller: roller.held, rollerWall: roller.onWall, cutBrush: brush.held }, (now, N) => {
    const n = N?.n ?? {};
    if (now === 'wlRoll') {
      col = wrap(n.col ?? 0, PW.cols);
      cov = n.cov ?? 0;
      coat = Math.max(0, n.coat ?? 0);
    } else if (now === 'wlCutIn') {
      edge = n.edge ?? 0;
      coat = Math.max(0, n.coat ?? 0);
    }
    if (now) face.draw(`${col}|${q(cov, 40)}|${coat}|${q(edge, 30)}`, (c) => paintColours(c, col, cov, coat, edge));
    const paint = PAINTS[wrap(coat, PAINTS.length)];
    for (const m of [well, can, pot, roller.sleeve, brush.tip]) tint(m, paint);
    const p = N?.props.roller ?? rest.grip;
    const d = N?.props.rollerDir ?? rest.dir;
    pp.set(p[0], p[1], p[2]);
    dir.set(d[0], d[1], d[2]);
    poseTool(roller.root, ORIGIN, pp, dir);
    at(brush.root, N?.props.cutBrush ?? null, [PW.pot[0], PW.pot[1] + 0.16, PW.pot[2]]);
    brush.root.rotation.x = !N?.props.cutBrush || N.b.from.startsWith('dip') ? -1.2 : 0;
  });
  out.work = marker(g, colX(1), 1.2, F + 0.05);
}

// =============================================================================================
// 바닥 시공 구역 (wlFloorBay, 3 × 2).

const DK_W = 2.9;
const DK_D = FB.front - FB.back;
const DK_PX = 200;
const dx = (x: number) => (x + DK_W / 2) * DK_PX;
const dz = (z: number) => (z - FB.back) * DK_PX;
function paintDeck(c: Ctx2, laid: number, set: number, comb: number) {
  const W = DK_W * DK_PX;
  const H = DK_D * DK_PX;
  c.fillStyle = '#8a8478';
  c.fillRect(0, 0, W, H);
  // Underlay on the board side.
  c.fillStyle = '#6a8a96';
  c.fillRect(0, 0, dx(-0.04), H);
  const rowD = 0.2;
  const boardC = ['#c49a68', '#b98b58', '#cda674', '#b58553'];
  const rows = Math.floor((FB.boardRow - rowD / 2 - FB.back) / rowD);
  c.save();
  c.beginPath();
  c.rect(0, 0, dx(-0.04), H);
  c.clip();
  for (let r = 0; r < rows; r++) {
    const y = r * rowD * DK_PX;
    const off = r % 2 ? 0.22 : 0;
    for (let k = -1; k < 7; k++) {
      const x = (k * 0.46 + off) * DK_PX;
      c.fillStyle = boardC[wrap(k + r, 4)];
      c.fillRect(x, y + 1, 0.455 * DK_PX, rowD * DK_PX - 2);
      c.fillStyle = 'rgba(0,0,0,0.08)';
      c.fillRect(x + 8, y + rowD * DK_PX * 0.4, 0.4 * DK_PX, 2);
    }
  }
  c.restore();
  // The boards of this row.
  for (let i = 0; i < 3 && i < laid - 0.01; i++) {
    c.fillStyle = boardC[wrap(i + 1, 4)];
    c.fillRect(dx(FB.boards[i] - FB.boardL / 2), dz(FB.boardRow - 0.095), FB.boardL * DK_PX, 0.19 * DK_PX);
  }
  // The tile side: done rows, adhesive, this row.
  const ts = FB.tileS;
  const rowsT = Math.floor((FB.tileRow - ts / 2 - FB.back) / ts);
  for (let r = 0; r < rowsT; r++) {
    for (let k = 0; k < FB.tiles.length; k++) {
      c.fillStyle = TILES[wrap(r + k, 3)];
      c.fillRect(dx(FB.tiles[k] - ts / 2) + 1, r * ts * DK_PX + 1, ts * DK_PX - 2, ts * DK_PX - 2);
    }
  }
  if (comb > 0) {
    const x0 = dx(FB.tiles[1] - ts / 2);
    const w = (FB.tiles[3] - FB.tiles[1] + ts) * DK_PX * clamp01(comb);
    c.fillStyle = '#a7a498';
    c.fillRect(x0, dz(FB.tileRow - ts / 2), w, ts * DK_PX);
    c.strokeStyle = '#85827a';
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.moveTo(x0, dz(FB.tileRow - ts / 2) + i * 5);
      c.lineTo(x0 + w, dz(FB.tileRow - ts / 2) + i * 5);
      c.stroke();
    }
  }
  for (let k = 0; k < 3 && k < set - 0.01; k++) {
    c.fillStyle = TILES[wrap(k, 3)];
    c.fillRect(dx(FB.tiles[k + 1] - ts / 2) + 1, dz(FB.tileRow - ts / 2) + 1, ts * DK_PX - 2, ts * DK_PX - 2);
  }
}
function floorBay(g: THREE.Group, out: Built) {
  const T = FB.top;
  // The raised deck, its joists showing, overhanging at the front so feet go under.
  part(g, box(DK_W + 0.04, 0.04, DK_D), PLY, 0, T - 0.022, (FB.front + FB.back) / 2);
  part(g, box(DK_W, T - 0.04, DK_D - 0.3), '#8d7a5e', 0, (T - 0.04) / 2, (FB.front - 0.3 + FB.back) / 2);
  for (let i = 0; i < 7; i++) part(g, box(0.05, T - 0.04, 0.03), PINE, -1.38 + i * 0.46, (T - 0.04) / 2, FB.front - 0.31);
  const deck = liveScreen(g, DK_W, DK_D, DK_W * DK_PX, Math.round(DK_D * DK_PX), 0, T + 0.002, (FB.front + FB.back) / 2, 0, -Math.PI / 2);
  deck.draw('first', (c) => paintDeck(c, 0, 0, 0));
  label(g, '강마루', 0.22, 0.03, -0.75, T - 0.022, FB.front + 0.002, '#2e3b4a', '#f7f3e6');
  label(g, '바닥 타일', 0.3, 0.03, 0.75, T - 0.022, FB.front + 0.002, '#2e3b4a', '#f7f3e6');
  // The rolling stool and the little cart that follows it.
  const stool = group(g, FB.boards[1], 0, FB.seatZ);
  part(stool, cyl(0.17, 0.17, 0.05, 16), '#2f3a42', 0, FB.seatY - 0.025, 0);
  part(stool, cyl(0.025, 0.03, FB.seatY - 0.1, 10), STEEL, 0, (FB.seatY - 0.05) / 2 + 0.02, 0, NO);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(stool, v3(0, 0.08, 0), v3(Math.cos(a) * 0.17, 0.035, Math.sin(a) * 0.17), 0.012, IRON);
    part(stool, ball(0.025), BLACK, Math.cos(a) * 0.17, 0.025, Math.sin(a) * 0.17, NO);
  }
  const cart = group(g, FB.boards[1] + FB.cartX, 0, FB.cartZ);
  part(cart, box(0.46, 0.03, 0.3), BLUE, 0, FB.cartY - 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(cart, box(0.02, FB.cartY - 0.05, 0.02), BLUE, sx * 0.2, (FB.cartY - 0.05) / 2 + 0.03, sz * 0.12, NO);
    part(cart, ball(0.022), BLACK, sx * 0.2, 0.022, sz * 0.12, NO);
  }
  const cartBoards = group(cart);
  for (let i = 0; i < 3; i++) part(cartBoards, box(FB.boardL, 0.014, 0.19), '#b98b58', 0, FB.cartY + 0.008 + i * 0.016, 0, NO);
  const cartTiles = group(cart);
  for (let i = 0; i < 4; i++) part(cartTiles, box(0.2, 0.008, 0.2), TILES[wrap(i, 3)], 0, FB.cartY + 0.006 + i * 0.009, 0, NO);
  cartTiles.visible = false;
  bucket(g, 1.3, 0, 1.2, '#e9ebee', '접착제');
  const plank = plankTool(g);
  const mallet = malletTool(g);
  const trowel = trowelTool(g, true);
  const tile = tileTool(g, FB.tileS - 0.004, TILES[0], true);
  const seatOf = (motion: WlMotion, x: number): Spot => {
    const s = spot(g, 'sit', x, FB.seatY, FB.seatZ, Math.PI, 0);
    s.motion = motion;
    return s;
  };
  const spots: Record<string, Spot> = { wlPlank: seatOf('wlPlank', FB.boards[1]), wlFloorTile: seatOf('wlFloorTile', FB.tiles[2]) };
  let laid = 0;
  let set = 0;
  let comb = 0;
  drive(g, out, spots, { plank: plank.held, mallet: mallet.held, trowel: trowel.held, tile: tile.held }, (now, N) => {
    const n = N?.n ?? {};
    if (now === 'wlPlank') laid = n.laid ?? 0;
    if (now === 'wlFloorTile') {
      set = n.set ?? 0;
      comb = n.comb ?? 0;
    }
    if (now) deck.draw(`${q(laid, 4)}|${q(set, 4)}|${q(comb, 20)}`, (c) => paintDeck(c, laid, set, comb));
    if (N) {
      stool.position.x = N.st.x;
      cart.position.x = N.st.x + FB.cartX;
      cartBoards.visible = now === 'wlPlank';
      cartTiles.visible = now === 'wlFloorTile';
    }
    at(plank.root, N?.props.plank ?? null, null);
    at(mallet.root, N?.props.mallet ?? null, [-1.36, T + 0.08, 0.8]);
    mallet.root.rotation.x = clamp01(n.swing) * 0.45;
    at(trowel.root, N?.props.trowel ?? null, [1.34, T + 0.06, 0.82]);
    at(tile.root, N?.props.tile ?? null, null);
  });
  out.work = marker(g, 0, T + 0.05, FB.boardRow);
}

// =============================================================================================
// 천장 모서리 (wlCeilingCorner, 2 × 1).

function ceilingCorner(g: THREE.Group, out: Built) {
  const F = CC.face;
  const H = CC.ceil;
  siteFloor(g, 2, -0.46, 0.5, seedOf(g) + 4);
  // The back wall, its return at the left, the piece of ceiling over the corner.
  part(g, box(2, H, 0.08), '#e4dfd1', 0, H / 2, F - 0.04);
  part(g, box(0.08, H, 0.5), '#d6d1c2', -0.96, H / 2, F + 0.25);
  part(g, box(2.04, 0.05, 0.42), '#f2efe7', 0, H + 0.025, F);
  for (const sx of [-1, 1]) part(g, box(0.05, H, 0.06), PINE, sx * 0.97, H / 2, F - 0.11);
  // The moulding along the seam; a bare socket.
  part(g, box(1.92, 0.07, 0.04), '#fbf8f0', 0.02, CC.seam + 0.06, F + 0.02);
  part(g, box(0.05, 0.05, 0.01), BLACK, 0.68, 2.0, F + 0.003, NO);
  // The bead going along it, wet, then smoothed.
  const LEN = CC.x1 - CC.x0;
  const bead = part(g, cyl(0.009, 0.009, 1, 8), '#ffffff', CC.x0, CC.seam - 0.015, F + 0.022, { rz: Math.PI / 2, outline: false });
  const flat = part(g, box(1, 0.018, 0.004), '#f0ece0', CC.x1, CC.seam - 0.015, F + 0.022, NO);
  bead.visible = flat.visible = false;
  // The stepladder.
  const zs = [0.58, 0.44, 0.3];
  const lad = group(g, CC.ladderX, 0, 0);
  for (const sx of [-1, 1]) {
    rod(lad, v3(sx * 0.24, 0.02, 0.76), v3(sx * 0.18, 1.0, 0.2), 0.016, '#c2c8cc');
    rod(lad, v3(sx * 0.22, 0.02, -0.05), v3(sx * 0.18, 0.92, 0.2), 0.013, '#9aa2a8');
    part(lad, box(0.05, 0.03, 0.09), BLACK, sx * 0.24, 0.015, 0.77, NO);
    part(lad, box(0.05, 0.03, 0.08), BLACK, sx * 0.22, 0.015, -0.05, NO);
    rod(lad, v3(sx * 0.2, 0.42, 0.5), v3(sx * 0.2, 0.42, 0.08), 0.005, '#6d757b');
  }
  CC.steps.forEach((y, i) => part(lad, box(0.42, 0.025, 0.11), '#c8ced2', 0, y - 0.012, zs[i]));
  part(lad, box(0.42, 0.035, 0.2), ORANGE, 0, 1.02, 0.18);
  // A little stand for what's not in the hand.
  const sx0 = CC.caulkHome[0] + 0.14;
  part(g, box(0.34, 0.02, 0.22), PINE, sx0, CC.caulkHome[1] - 0.05, 0.2);
  for (const sx of [-1, 1]) part(g, box(0.02, CC.caulkHome[1] - 0.05, 0.02), PINE, sx0 + sx * 0.15, (CC.caulkHome[1] - 0.05) / 2, 0.2, NO);
  const caulk = caulkTool(g);
  const smoother = smootherTool(g);
  const spots: Record<string, Spot> = { wlCeiling: standAt(g, 'wlCeiling', CC.ladderX, 0.72) };
  let bLen = 0;
  let sLen = 0;
  drive(g, out, spots, { caulk: caulk.held, smoother: smoother.held }, (now, N) => {
    const n = N?.n ?? {};
    if (now) {
      bLen = clamp01(n.bead);
      sLen = clamp01(n.smooth);
    }
    bead.visible = bLen > 0.005 && sLen < 0.995;
    bead.scale.y = Math.max(0.01, LEN * bLen);
    bead.position.x = CC.x0 + (LEN * bLen) / 2;
    flat.visible = sLen > 0.005;
    flat.scale.x = Math.max(0.01, LEN * sLen);
    flat.position.x = CC.x1 - (LEN * sLen) / 2;
    at(caulk.root, N?.props.caulk ?? null, CC.caulkHome);
    at(smoother.root, N?.props.smoother ?? null, [sx0, CC.caulkHome[1] + 0.06, 0.26]);
  });
  out.work = marker(g, CC.ladderX, CC.seam - 0.2, F + 0.1);
}

// =============================================================================================
// 실측 벽 (wlMeasureBay, 2 × 1).

function measureBay(g: THREE.Group, out: Built) {
  const F = MB.face;
  const H = 2.2;
  const wx0 = -MB.windowX;
  const wx1 = MB.windowX;
  siteFloor(g, 2, -0.46, 0.5, seedOf(g) + 5);
  // A bare wall round a window hole.
  part(g, box(wx0 + 1, H, 0.1), PLASTER, (wx0 - 1) / 2, H / 2, F - 0.05);
  part(g, box(1 - wx1, H, 0.1), PLASTER, (wx1 + 1) / 2, H / 2, F - 0.05);
  part(g, box(wx1 - wx0, MB.winY0, 0.1), PLASTER, 0, MB.winY0 / 2, F - 0.05);
  part(g, box(wx1 - wx0, H - MB.winY1, 0.1), PLASTER, 0, (H + MB.winY1) / 2, F - 0.05);
  // The window with a far block of invented flats painted behind it.
  const tex = painted('wl|view', 256, 192, (c) => {
    const grad = c.createLinearGradient(0, 0, 0, 192);
    grad.addColorStop(0, '#bfe0f2');
    grad.addColorStop(1, '#f2f6f3');
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 192);
    for (const [x, h] of [[10, 110], [84, 138], [170, 96]]) {
      c.fillStyle = '#cfcabd';
      c.fillRect(x, 192 - h, 66, h);
      c.fillStyle = '#7e93a6';
      for (let i = 0; i < 3; i++) for (let j = 0; j * 18 < h - 10; j++) c.fillRect(x + 6 + i * 20, 192 - h + 6 + j * 18, 12, 10);
    }
  });
  picture(g, tex, wx1 - wx0, MB.winY1 - MB.winY0, 0, (MB.winY0 + MB.winY1) / 2, F - 0.09);
  for (const sx of [-1, 0, 1]) part(g, box(0.03, MB.winY1 - MB.winY0, 0.04), '#fafafa', sx * MB.windowX, (MB.winY0 + MB.winY1) / 2, F - 0.08, NO);
  for (const y of [MB.winY0, MB.winY1]) part(g, box(wx1 - wx0, 0.03, 0.04), '#fafafa', 0, y, F - 0.08, NO);
  // Pencilled notes on the plaster.
  const notes = painted('wl|notes', 200, 90, (c) => {
    c.fillStyle = PLASTER;
    c.fillRect(0, 0, 200, 90);
    text(c, '창 폭 ?', 8, 22, 18, '#4b4b50', 'left', false);
    text(c, '벽 높이 2,300', 8, 58, 18, '#4b4b50', 'left', false);
  });
  picture(g, notes, 0.32, 0.14, -0.68, 1.5, F + 0.002);
  // The tripod and its laser, the red line on the wall, the pencil ticks on it.
  const [tx, ty, tz] = MB.tripod;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, v3(tx, ty - 0.1, tz), v3(tx + Math.cos(a) * 0.26, 0.01, tz + Math.sin(a) * 0.26), 0.012, GRAPHITE);
  }
  part(g, cyl(0.014, 0.014, 0.1, 8), GRAPHITE, tx, ty - 0.08, tz, NO);
  part(g, rbox(0.1, 0.08, 0.1, 0.018), YELLOW, tx, ty, tz);
  part(g, cyl(0.016, 0.016, 0.03, 10), BLACK, tx + 0.05, ty + 0.015, tz + 0.05, NO);
  part(g, box(0.04, 0.012, 0.02), '#9fe2a0', tx, ty + 0.045, tz, NO);
  const eye = ownLit(g, ball(0.012), '#5c2a2a', tx + 0.025, ty, tz - 0.05);
  const line = ownLit(g, new THREE.BoxGeometry(1.92, 0.005, 0.001), '#ff2a24', 0, MB.lineY, F + 0.004);
  line.userData.ownGeometry = true;
  line.visible = false;
  const marks = MB.marks.map((x) => part(g, box(0.003, 0.05, 0.002), INK, x, MB.lineY, F + 0.005, NO));
  for (const m of marks) m.visible = false;
  const pencil = pencilTool(g, PEN_WALL);
  const tape = tapeTool(g, 0.36);
  const clip = clipTool(g, '창 실측', ['창 폭', '창 높이', '벽 폭', '벽 높이']);
  const spots: Record<string, Spot> = { wlLaser: standAt(g, 'wlLaser', 0, 0.62), wlTape: standAt(g, 'wlTape', 0, 0.62) };
  drive(g, out, spots, { pencil: pencil.held, tape: tape.held, clip: clip.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const on = now === 'wlLaser' && (n.on ?? 0) > 0.5;
    line.visible = on;
    setLit(eye, on ? '#ff2a24' : '#5c2a2a');
    if (on) line.position.y = MB.lineY + (1 - clamp01(n.level)) * 0.1 * Math.sin((n.knob ?? 0) * 2 + 1);
    marks.forEach((m, i) => (m.visible = now === 'wlLaser' && (n.marks ?? 0) > i + 0.4));
    at(pencil.root, N?.props.pencil ?? null, [tx + 0.1, ty - 0.2, tz + 0.05]);
    at(tape.root, N?.props.tape ?? null, null);
    at(clip.root, N?.props.clip ?? null, null);
    if (clip.root.visible) clip.show(n.ticks ?? 0, t);
  });
  out.work = marker(g, 0, MB.winY0, F + 0.05);
}

// =============================================================================================
// 현장 도면판 (wlSitePlan, 2 × 1).

const SP_W = 1.9;
const SP_H = 0.95;
const SP_PX = 336;
const SCHED = ['철거', '미장', '도배', '바닥', '입주 청소'];
function paintPlan(c: Ctx2, room: number, ink: number, line: number, day: number) {
  const W = SP_W * SP_PX;
  const H = SP_H * SP_PX;
  c.fillStyle = '#e9e2cd';
  c.fillRect(0, 0, W, H);
  const pw = 0.9 * SP_PX;
  const ph = 0.8 * SP_PX;
  const ox = (-0.75 + 0.95) * SP_PX;
  const oy = (1.8 - 1.72) * SP_PX;
  c.fillStyle = '#f7f4ea';
  c.fillRect(ox, oy, pw, ph);
  text(c, `${FIRM} · 하늘뜰 1203호`, ox, oy - 12, 13, INK, 'left');
  const r = wrap(room, PLAN_ROOMS.length);
  PLAN_ROOMS.forEach(([name, x, y, w, h], i) => {
    c.fillStyle = i < r ? '#b9d9b4' : '#ffffff';
    c.fillRect(ox + x * pw, oy + y * ph, w * pw, h * ph);
    if (i === r && ink > 0) {
      c.fillStyle = '#b9d9b4';
      c.fillRect(ox + x * pw, oy + y * ph, w * pw * clamp01(ink), h * ph);
    }
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.strokeRect(ox + x * pw, oy + y * ph, w * pw, h * ph);
    c.lineWidth = 1;
    text(c, name, ox + (x + w / 2) * pw, oy + (y + h / 2) * ph, 15, INK, 'center');
  });
  // The schedule.
  const sx = (0.25 + 0.95) * SP_PX;
  c.fillStyle = '#fbf8ed';
  c.fillRect(sx, oy, 0.62 * SP_PX, ph);
  text(c, '공정표', sx + 8, oy + 14, 15, INK, 'left');
  const bar = 0.42 * SP_PX - 40;
  SCHED.forEach((s, i) => {
    const y = (1.8 - (1.62 - i * 0.15)) * SP_PX;
    text(c, s, sx + 6, y, 12, INK, 'left', false);
    const e = i < day ? 1 : i === day ? clamp01(line) : 0;
    if (e > 0) {
      c.fillStyle = ORANGE;
      c.fillRect(sx + 0.06 * SP_PX + 40, y - 4, bar * e, 8);
    }
  });
}
function sitePlan(g: THREE.Group, out: Built) {
  const F = SP.face;
  part(g, box(SP_W + 0.06, SP_H + 0.06, 0.03), PINE, 0, SP.cy, F - 0.018);
  for (const sx of [-1, 1]) {
    part(g, box(0.05, SP.cy + SP_H / 2, 0.05), PINE, sx * 0.92, (SP.cy + SP_H / 2) / 2, F - 0.04);
    part(g, box(0.05, 0.03, 0.34), PINE, sx * 0.92, 0.015, F + 0.06);
  }
  const board = liveScreen(g, SP_W, SP_H, Math.round(SP_W * SP_PX), Math.round(SP_H * SP_PX), 0, SP.cy, F + 0.002);
  board.draw('first', (c) => paintPlan(c, 0, 0, 0, 0));
  for (const [x, y] of [[-0.9, 1.75], [0.9, 1.75], [-0.9, 0.9], [0.9, 0.9]]) part(g, ball(0.012), RED, x, y, F + 0.006, NO);
  // A rail under it with pens and tape.
  part(g, box(1.2, 0.02, 0.08), PINE, 0.3, 0.8, F + 0.04);
  part(g, cyl(0.025, 0.025, 0.04, 12), ORANGE, 0.6, 0.83, F + 0.04, NO);
  part(g, cyl(0.03, 0.03, 0.03, 12), TAPE, 0.45, 0.825, F + 0.04, NO);
  const pencil = pencilTool(g, PEN_WALL);
  const spots: Record<string, Spot> = { wlPlan: standAt(g, 'wlPlan', 0, 0.42) };
  drive(g, out, spots, { pencil: pencil.held }, (now, N) => {
    const n = N?.n ?? {};
    if (now) {
      const room = n.room ?? 0;
      const day = wrap(N?.b.n ?? 0, 4);
      board.draw(`${q(room, 1)}|${q(n.ink, 30)}|${q(n.line, 20)}|${day}`, (c) => paintPlan(c, room, n.ink ?? 0, n.line ?? 0, day));
    }
    at(pencil.root, N?.props.pencil ?? null, SP.penHome);
  });
  out.work = marker(g, 0, SP.cy, F + 0.05);
}

// =============================================================================================
// 자재 더미 (wlMaterials, 2 × 1).

function materials(g: THREE.Group, out: Built) {
  // A low rack of rolls at the left, a landing at the right, buckets and sacks.
  part(g, box(1.2, 0.03, 0.56), PINE, -0.38, 0.5, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, 0.5, 0.05), PINE, -0.38 + sx * 0.55, 0.25, sz * 0.24);
  const rollAt = (x: number, y: number, z: number, i: number) => {
    const m = part(g, cyl(0.05, 0.05, 0.72, 14), PAPERS[wrap(i, PAPERS.length)][0], x, y, z, { rz: Math.PI / 2 });
    part(g, cyl(0.018, 0.018, 0.73, 8), '#b9986d', x, y, z, { rz: Math.PI / 2, outline: false });
    return m;
  };
  for (let i = 0; i < 5; i++) rollAt(-0.42, 0.57, -0.21 + i * 0.105, i);
  for (let i = 0; i < 4; i++) rollAt(-0.42, 0.66, -0.16 + i * 0.105, i + 1);
  for (let i = 0; i < 3; i++) rollAt(-0.42, 0.75, -0.105 + i * 0.105, i + 2);
  const lifted = rollAt(MT.rollFrom[0], MT.rollFrom[1] - 0.09, MT.rollFrom[2], 1);
  part(g, box(1.14, 0.12, 0.02), PINE, -0.38, 0.42, 0.27);
  label(g, '벽지 — 소폭', 0.28, 0.07, -0.42, 0.42, 0.283, '#ffffff', INK);
  part(g, box(0.72, 0.8, 0.5), PLY, MT.rollTo[0], 0.4, 0);
  label(g, '실크 벽지', 0.3, 0.07, MT.rollTo[0], 0.4, 0.253, '#ffffff', INK);
  const landed: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) landed.push(rollAt(MT.rollTo[0], 0.85 + (i === 2 ? 0.09 : 0), MT.rollTo[2] - 0.11 + (i === 2 ? 0.055 : i * 0.11), i + 2));
  for (let i = 0; i < 2; i++) bucket(g, 0.92 - i * 0.26, 0, 0.36, ['#e9ebee', '#d7dde2'][i], i === 0 ? '풀' : undefined, 0.26);
  part(g, rbox(0.34, 0.1, 0.46, 0.04), '#c4b08c', -0.8, 0.05, -0.1);
  label(g, '타일 접착제', 0.2, 0.05, -0.8, 0.07, 0.135, '#fff7e2', INK);
  part(g, box(0.34, 0.18, 0.2), '#8b6a4d', -0.82, 0.09, 0.3);
  const clip = clipTool(g, '자재 수량', ['벽지 롤', '풀', '접착제', '타일', '롤러']);
  const roll = rollTool(g);
  const spots: Record<string, Spot> = { wlStock: standAt(g, 'wlStock', 0, MT.stand) };
  drive(g, out, spots, { clip: clip.held, roll: roll.held }, (now, N, t) => {
    const n = N?.n ?? {};
    lifted.visible = !(now && (n.moved ?? 0) > 0.5);
    const c = wrap(N?.b.n ?? 2, 3);
    landed.forEach((m, i) => (m.visible = i < c + 1));
    at(clip.root, N?.props.clip ?? null, null);
    at(roll.root, N?.props.roll ?? null, null);
    if (clip.root.visible) clip.show(n.ticks ?? 0, t);
  });
  out.work = marker(g, 0, 0.8, 0.2);
}

// =============================================================================================
// 완성 방 (wlFinishRoom, 3 × 1).

function finishRoom(g: THREE.Group, out: Built) {
  const F = FR.face;
  const W = 3;
  const H = 2.3;
  // Oak floor and new paper.
  const floorTex = painted('wl|oak', 256, 128, (c) => {
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i % 2 ? '#bb8e5c' : '#caa374';
      c.fillRect(0, i * 22, 256, 22);
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(((i * 73) % 200) + 10, i * 22, 2, 22);
    }
  });
  picture(g, floorTex, W, 1.55, 0, 0.006, F + 0.775, '#ffffff', 0, -Math.PI / 2);
  const paperTex = painted('wl|finish', 512, 392, (c) => paintPattern(c, 0, 0, 512, 392, PAPERS[0], 0));
  part(g, box(W, H, 0.08), '#e9e4d6', 0, H / 2, F - 0.041);
  picture(g, paperTex, W, H, 0, H / 2, F + 0.002);
  part(g, box(W, 0.09, 0.016), '#fbf8f0', 0, 0.045, F + 0.01, NO);
  part(g, box(W, 0.05, 0.03), '#fbf8f0', 0, H - 0.02, F + 0.015);
  // The window with its curtains, the sill the owner's shown.
  const view = painted('wl|finishview', 256, 192, (c) => {
    const grad = c.createLinearGradient(0, 0, 0, 192);
    grad.addColorStop(0, '#a9d8f0');
    grad.addColorStop(1, '#fbf0d9');
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 192);
    c.fillStyle = '#90b48d';
    c.fillRect(0, 150, 256, 42);
  });
  picture(g, view, 0.92, 0.8, FR.sill[0], 1.38, F + 0.004);
  for (const sx of [-1, 1]) part(g, box(0.03, 0.84, 0.03), '#fafafa', FR.sill[0] + sx * 0.47, 1.38, F + 0.018, NO);
  part(g, box(0.97, 0.03, 0.03), '#fafafa', FR.sill[0], 1.8, F + 0.018, NO);
  part(g, box(1.05, 0.03, 0.09), '#fafafa', FR.sill[0], FR.sill[1], F + 0.04);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) part(g, box(0.05, 1.2, 0.035), i % 2 ? '#d3bfa2' : '#dccbb0', FR.sill[0] + sx * (0.48 + i * 0.05), 1.3, F + 0.045, NO);
  rod(g, v3(FR.sill[0] - 0.68, 1.92, F + 0.05), v3(FR.sill[0] + 0.68, 1.92, F + 0.05), 0.011, WALNUT);
  // A sideboard and a vase, a picture; the switch; a standing lamp to come on.
  part(g, rbox(0.72, 0.56, 0.3, 0.02), WALNUT, 0.96, 0.3, F + 0.16);
  part(g, cyl(0.04, 0.06, 0.18, 12), '#3d6b78', 0.84, 0.67, F + 0.15);
  part(g, ball(0.07), '#6a9c64', 0.84, 0.82, F + 0.15);
  const art = painted('wl|art', 128, 128, (c) => {
    c.fillStyle = '#f4efe2';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#c2704f';
    c.beginPath();
    c.arc(50, 56, 30, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#34606e';
    c.fillRect(0, 82, 128, 46);
  });
  part(g, box(0.44, 0.44, 0.02), WALNUT, 0.98, 1.42, F + 0.012);
  picture(g, art, 0.38, 0.38, 0.98, 1.42, F + 0.024);
  part(g, box(0.09, 0.12, 0.012), '#fafafa', FR.switchAt[0], FR.switchAt[1], F + 0.008);
  part(g, box(0.035, 0.05, 0.012), '#e6e6e0', FR.switchAt[0], FR.switchAt[1], F + 0.016, NO);
  const lx = -0.94;
  part(g, cyl(0.12, 0.13, 0.025, 16), GRAPHITE, lx, 0.013, F + 0.2);
  part(g, cyl(0.012, 0.012, 1.45, 8), GRAPHITE, lx, 0.73, F + 0.2, NO);
  part(g, cyl(0.1, 0.17, 0.2, 16), '#f3e7c8', lx, 1.48, F + 0.2);
  const bulb = ownLit(g, ball(0.05), '#8e8872', lx, 1.42, F + 0.2);
  const pool = haze(g, new THREE.CircleGeometry(0.7, 22), '#ffe9a8', 0.28, lx, 0.012, F + 0.45);
  pool.rotation.x = -Math.PI / 2;
  const glow = haze(g, new THREE.CircleGeometry(0.42, 22), '#ffe9a8', 0.24, lx, 1.42, F + 0.006);
  const clip = clipTool(g, '시공 완료 확인', ['벽지 이음새', '바닥 들뜸', '타일 줄눈', '콘센트', '청소']);
  const owner = lazy(() => person(g, '#7f9b82', '#4b5158', '#2e2118', FR.owner[0], FR.owner[2], Math.PI, 'male', seedOf(g) + 41));
  const spots: Record<string, Spot> = { wlWalk: standAt(g, 'wlWalk', 0, 0.86) };
  drive(g, out, spots, { clip: clip.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const lit = !now || (n.lit ?? 0) > 0.5;
    setLit(bulb, lit ? '#fff3c4' : '#8e8872');
    pool.visible = glow.visible = lit;
    at(clip.root, N?.props.clip ?? null, null);
    if (clip.root.visible) clip.show(n.ticks ?? 0, t);
    if (now) {
      const F2 = owner.get();
      F2.root.visible = true;
      // Looking at the wall by default (π), turned towards the dweller on what's said to them (a quarter round to the room).
      F2.root.rotation.y = Math.PI + THREE.MathUtils.lerp(0.5, Math.PI / 2, clamp01(n.ownerLook));
      nodHead(F2, (n.nod ?? 0) > 0.5 ? 0.1 + 0.14 * Math.abs(Math.sin(t * 3.4)) : -0.02);
    } else owner.hide();
  });
  out.work = marker(g, 0, 1.2, F + 0.05);
}

// 안내판 (wlSign, 1 × 1) and a site lamp (wlWorkLight, 1 × 1): nobody's business but the eye's.
function firmSign(g: THREE.Group) {
  part(g, box(0.5, 0.03, 0.34), IRON, 0, 0.015, 0);
  part(g, box(0.05, 1.12, 0.05), IRON, 0, 0.56, -0.04, NO);
  part(g, rbox(0.82, 0.56, 0.05, 0.015), '#2e3b4a', 0, 1.08, -0.02);
  const tex = painted('wl|sign', 400, 272, (c) => {
    c.fillStyle = '#2e3b4a';
    c.fillRect(0, 0, 400, 272);
    text(c, '두레벽', 200, 70, 58, '#f7f3e6', 'center');
    text(c, '인테리어', 200, 132, 34, YELLOW, 'center');
    c.fillStyle = '#f7f3e6';
    c.fillRect(30, 166, 340, 2);
    text(c, '도배 · 타일 · 마루 · 페인트', 200, 196, 22, '#f7f3e6', 'center', false);
    text(c, '시공 중 — 안전모 필수', 200, 236, 21, ORANGE, 'center');
  });
  picture(g, tex, 0.78, 0.52, 0, 1.08, 0.009);
}
function workLight(g: THREE.Group) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    rod(g, v3(0, 0.7, 0), v3(Math.cos(a) * 0.3, 0.01, Math.sin(a) * 0.3), 0.012, YELLOW);
  }
  part(g, cyl(0.016, 0.016, 0.75, 8), YELLOW, 0, 1.03, 0, NO);
  part(g, box(0.5, 0.02, 0.03), GRAPHITE, 0, 1.4, 0, NO);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.2, 0.16, 0.08, 0.02), GRAPHITE, sx * 0.17, 1.44, 0.03, { rx: 0.25 });
    const lit = ownLit(g, new THREE.BoxGeometry(0.17, 0.13, 0.008), '#fff6cf', sx * 0.17, 1.44, 0.078);
    lit.userData.ownGeometry = true;
    lit.rotation.x = 0.25;
  }
  rod(g, v3(0, 1.0, 0), v3(0.28, 0.01, -0.3), 0.006, BLACK);
  const pool = haze(g, new THREE.CircleGeometry(0.85, 22), '#fff0c0', 0.2, 0, 0.012, 0.65);
  pool.rotation.x = -Math.PI / 2;
}

const piece = (f: (g: THREE.Group, out: Built) => void): Builder => (g, _W, _D, _c, _def, _ctx, out) => f(g, out);
export const BUILDERS: Record<string, Builder> = {
  wallpaperTable: piece(wallpaperTable),
  tileSaw: piece(tileSaw),
  mockWall: piece(mockWall),
  wlPaintWall: piece(paintWall),
  wlFloorBay: piece(floorBay),
  wlCeilingCorner: piece(ceilingCorner),
  wlMeasureBay: piece(measureBay),
  wlSitePlan: piece(sitePlan),
  wlMaterials: piece(materials),
  wlFinishRoom: piece(finishRoom),
  wlSign: piece(firmSign),
  wlWorkLight: piece(workLight),
};
