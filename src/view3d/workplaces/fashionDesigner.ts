import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, text } from './doctor';
import { DF, DT, FC, FR, FT, IRON_UP, PEN_DIR, PEN_DIR_TILT, PEN_UP, RW, SHEAR_UP, SM, SP, SR, boardAt, fdNow, fdPhase, pressHandle, wrap } from './fashionDesignerMotion';
import type { FdMotion, FdNow, FdTool } from './fashionDesignerMotion';
import type { V } from './busDriverMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { shopFront } from './shopFront';

/**
 * The 패션 아틀리에 drawn as itself (2026-11-01), under the invented label 결. An industrial sewing machine whose needle goes up and
 * down while the cloth really feeds through it and the seam grows; a cutting table with paper patterns on a rail, where the chalk
 * goes round the pattern and the shears follow the chalk; a drawing table where a design develops from first lines to colour; a
 * dress form draped and pinned; a steam press with a hinged head and a hand iron on a sleeve board; bolts on a rack; a fitting
 * corner with its own mirror, where a grown-up client's shoulders and sleeves are measured and pinned; a rail of finished looks;
 * a runway. Everything that moves follows fashionDesignerMotion.ts. `mannequin` belongs to other workplaces too and stays as it is.
 */

const LABEL = '결';
const WALNUT = '#6f4e37';
const OAK = '#c9a87e';
const IVORY = '#f3ecdf';
const MUSLIN = '#e7dcc4';
const SILK = '#a33b5f';
const ROSE = '#b76e79';
const INK = '#26262c';
const IRON = '#3b4046';
const GRAPHITE = '#2f363c';
const STEEL = '#aeb6bc';
const BRASS = '#c5a253';
const PAPER = '#f5edd5';
const CHALK = '#f4f4f0';
const TAPE = '#f2d24b';
const SKIN = '#f1c9a5';
const FABRICS: readonly string[] = ['#27496d', '#8e3b46', '#3f6b4f', '#c9a13b', '#5b4b8a', '#2f4858', '#b5651d'];
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const pos = (r: number) => Math.max(0.5, r);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};
const NO = { outline: false } as const;
/** Its own colour to change: `part`'s material is shared with everything else of that colour. */
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
/** Lathes are kept and shared; each is only ever built once. */
const LATHES = new Map<string, THREE.BufferGeometry>();
function lathe(key: string, pts: ReadonlyArray<readonly [number, number]>): THREE.BufferGeometry {
  let geo = LATHES.get(key);
  if (!geo) {
    geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 22);
    LATHES.set(key, geo);
  }
  return geo;
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
function standAt(g: THREE.Object3D, motion: FdMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: FdMotion, seat: V, yaw = Math.PI): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<FdTool, HeldTool>>, show: (now: string | null, N: FdNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? fdNow(sp.motion as FdMotion, t, fdPhase(g.getWorldPosition(tmp)), H) : null;
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
/** A plain work stool; the sitter's on top of it. */
function stool(g: THREE.Object3D, seat: V, color = WALNUT) {
  const T = seat[1];
  part(g, cyl(0.17, 0.16, 0.05, 16), color, seat[0], T - 0.025, seat[2]);
  part(g, cyl(0.02, 0.025, T - 0.1, 10), STEEL, seat[0], (T - 0.05) / 2 + 0.02, seat[2], NO);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    rod(g, v3(seat[0], 0.12, seat[2]), v3(seat[0] + Math.cos(a) * 0.2, 0.02, seat[2] + Math.sin(a) * 0.2), 0.012, STEEL);
  }
  const ringY = Math.min(0.32, T * 0.5);
  part(g, cyl(0.13, 0.13, 0.012, 16), STEEL, seat[0], ringY, seat[2], NO);
}
const spoolOf = (g: THREE.Object3D, x: number, y: number, z: number, c: string) => {
  part(g, cyl(0.016, 0.016, 0.05, 10), c, x, y + 0.025, z, NO);
  part(g, cyl(0.02, 0.02, 0.005, 10), OAK, x, y + 0.002, z, NO);
  part(g, cyl(0.02, 0.02, 0.005, 10), OAK, x, y + 0.05, z, NO);
};
/** A hanging lit lamp over work. */
function workLamp(g: THREE.Object3D, x: number, T: number, z: number, h = 0.42) {
  part(g, cyl(0.05, 0.055, 0.016, 12), GRAPHITE, x, T + 0.008, z, NO);
  rod(g, v3(x, T, z), v3(x, T + h, z), 0.007, GRAPHITE);
  part(g, cyl(0.03, 0.07, 0.07, 12), ROSE, x, T + h, z + 0.05, { rx: 0.5 });
  ownLit(g, ball(0.026), '#fff3c4', x, T + h - 0.03, z + 0.07);
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand: origin at the grip, named for the probe, no ink line.

/** A pencil or seam ripper: its point goes `dir` from the hand. */
function penTool(g: THREE.Object3D, name: string, dir: V, body: string, tip: string, writes = true): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = name;
  const inner = group(root);
  const d = v3(dir[0], dir[1], dir[2]).normalize();
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), d);
  part(inner, cyl(0.005, 0.005, PEN_UP * 0.78 + 0.07, 10), body, 0, (0.07 - PEN_UP * 0.78) / 2, 0, NO);
  part(inner, cyl(0.005, 0.0015, PEN_UP * 0.22, 8), tip, 0, -PEN_UP * 0.89, 0, NO);
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'pen', radius: 0.011, writes: writes ? PEN_UP : undefined } } } };
}
/** The big cutting shears: bows at the origin, blades on -z; `upper` opens round the pivot. */
function shearsTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdShears';
  const y0 = -SHEAR_UP;
  const blade = (par: THREE.Object3D, off: number) => {
    part(par, box(0.016, 0.004, 0.14), CHROME, off, 0, -0.07, NO);
    part(par, box(0.01, 0.004, 0.05), CHROME, off * 0.6, 0, -0.16, NO);
  };
  // The handle, black enamelled, closed in the hand.
  part(root, rbox(0.024, 0.024, 0.1, 0.01), BLACK, 0, 0, 0, NO);
  rod(root, v3(0, 0, -0.05), v3(0, y0, -0.1), 0.006, IRON);
  const lower = group(root, 0, y0, -0.1);
  blade(lower, 0.003);
  const upper = group(root, 0, y0 + 0.004, -0.1);
  blade(upper, -0.003);
  part(root, cyl(0.007, 0.007, 0.008, 8), BRASS, 0, y0 + 0.003, -0.1, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), palm: v3(-1, 0, 0), shape: 'power', radius: 0.016 } } };
  return { root, upper, held };
}
/** Tailor's chalk, a flat wedge held between thumb and finger; its edge is down. */
function chalkTool(g: THREE.Object3D, leadLeft = false) {
  const root = group(g);
  root.name = 'fdChalk';
  part(root, box(0.044, 0.024, 0.006), CHALK, 0, -0.008, 0, NO);
  part(root, box(0.03, 0.006, 0.006), '#dcdce0', 0, -0.021, 0, NO);
  const held: HeldTool = { tool: root, lead: leadLeft ? 'left' : 'right', grips: { [leadLeft ? 'left' : 'right']: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.008 } } };
  return { root, held };
}
/** A dressmaking pin with a coloured head. */
function pinTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdPin';
  const inner = group(root);
  inner.rotation.x = -1.15;
  part(inner, cyl(0.0014, 0.0014, 0.05, 6), CHROME, 0, 0.025, 0, NO);
  part(inner, ball(0.005), '#d9445c', 0, -0.002, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pinch', radius: 0.005 } } };
  return { root, held };
}
/** A length of tape held between two hands, `along` the way from the left hand to the right. */
function tapeTool(g: THREE.Object3D, name: string, a: V, b: V) {
  const root = group(g);
  root.name = name;
  const A = v3(a[0], a[1], a[2]);
  const B = v3(b[0], b[1], b[2]);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const d = B.clone().sub(A);
  const L = d.length();
  const inner = group(root);
  inner.position.copy(mid);
  inner.quaternion.setFromUnitVectors(UP, d.clone().normalize());
  part(inner, box(0.018, L + 0.14, 0.002), TAPE, 0, 0, 0, NO);
  for (let i = 0; i < 10; i++) part(inner, box(0.019, 0.003, 0.0026), INK, 0, -L / 2 + (i * L) / 9, 0, NO);
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: { left: { at: A, axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 }, right: { at: B, axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } },
  };
  return { root, held };
}
/** Thread snips, a little sprung pair. */
function snipsTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdSnips';
  part(root, rbox(0.024, 0.016, 0.05, 0.007), '#d9445c', 0, 0, 0.01, NO);
  const a = part(root, box(0.006, 0.003, 0.05), CHROME, -0.004, 0, -0.035, NO);
  const b = part(root, box(0.006, 0.003, 0.05), CHROME, 0.004, 0, -0.035, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0.005), axis: v3(0, 0, -1), shape: 'pinch', radius: 0.012 } } };
  return { root, a, b, held };
}
/** A hand iron: the handle along z through the origin, the sole below. */
function ironTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdIron';
  part(root, cyl(0.013, 0.013, 0.13, 10), '#40362e', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  for (const z of [-0.055, 0.055]) part(root, box(0.018, 0.04, 0.014), STEEL, 0, -0.026, z, NO);
  part(root, rbox(0.095, 0.032, 0.2, 0.012), '#e7e9ec', 0, -IRON_UP + 0.024, 0, NO);
  part(root, box(0.1, 0.008, 0.205), STEEL, 0, -IRON_UP + 0.004, 0, NO);
  part(root, box(0.014, 0.002, 0.014), '#ff7043', 0, -IRON_UP + 0.042, -0.04, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'power' } } };
  return { root, held };
}
/** A bolt of cloth across both forearms, its length on x. */
function boltTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdBolt';
  const roll = tinted(part(root, cyl(0.055, 0.055, 1.2, 14), FABRICS[0], 0, 0, 0, { rz: Math.PI / 2 }));
  part(root, cyl(0.018, 0.018, 1.26, 8), '#caa56d', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: {
      left: { at: v3(-0.24, -0.05, 0), axis: v3(-1, 0, 0), palm: v3(0, 1, 0), shape: 'cradle', radius: 0.05 },
      right: { at: v3(0.24, -0.05, 0), axis: v3(1, 0, 0), palm: v3(0, 1, 0), shape: 'cradle', radius: 0.05 },
    },
  };
  return { root, roll, held };
}
/** A cut swatch pinched at the corner. */
function swatchTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdSwatch';
  const piece = tinted(part(root, box(0.07, 0.07, 0.002), FABRICS[0], 0.03, -0.03, 0, NO));
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.004 } } };
  return { root, piece, held };
}
/** A lint roller, the handle down from the head. */
function rollerTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdRoller';
  part(root, cyl(0.014, 0.014, 0.1, 10), '#3f51b5', 0, 0, 0, NO);
  rod(root, v3(0, 0.05, 0), v3(0, 0.07, -0.03), 0.005, STEEL);
  part(root, cyl(0.03, 0.03, 0.11, 14), '#f7f7ee', 0, 0.078, -0.04, { rz: Math.PI / 2, outline: false });
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power' } } };
  return { root, held };
}
/** A clipboard carried on the left forearm, its page live. */
function clipTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'fdClip';
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, rbox(0.23, 0.31, 0.01, 0.006), '#8d6e4f', 0, 0, 0, NO);
  part(tilt, box(0.09, 0.02, 0.012), CHROME, 0, 0.145, 0.008, NO);
  const page = liveScreen(tilt, 0.205, 0.27, 160, 210, 0, -0.008, 0.008);
  const held: HeldTool = { tool: root, lead: 'left', grips: { left: boardGrip(0.75) } };
  return { root, page, held };
}
function paintClip(c: Ctx2, title: string, ticks: number) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 160, 210);
  text(c, title, 80, 18, 14, INK, 'center');
  ['어깨선', '소매 길이', '밑단', '단추', '안감'].forEach((s, i) => {
    const y = 48 + i * 32;
    text(c, s, 14, y, 13, INK, 'left', false);
    c.strokeStyle = '#7a7a7a';
    c.strokeRect(126, y - 8, 15, 15);
    if (ticks > i + 0.5) {
      c.strokeStyle = '#c62828';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(128, y);
      c.lineTo(133, y + 6);
      c.lineTo(142, y - 8);
      c.stroke();
      c.lineWidth = 1;
    }
  });
}
function snipShears(sh: { upper: THREE.Group }, open: number) {
  sh.upper.rotation.x = -clamp01(open) * 0.3;
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
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number, extra: Partial<FigureOptions> = {}): Fig {
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
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, base + 1.37, dz, NO);
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, NO);
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const rest = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
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
  const opts: FigureOptions = { gender, seat, seed, ...extra };
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
// 재봉틀 (sewingMachine, 1 × 1): an industrial head on a table, a thread stand, a knee lift and a treadle; the needle really runs.

const CLOTH = 0.46;
function paintCloth(c: Ctx2, color: string, leg1: number, leg2: number, alter: number, ripped: number) {
  const px = (u: number) => (u / CLOTH + 0.5) * 230;
  const py = (v: number) => (v / CLOTH + 0.5) * 230;
  c.fillStyle = color;
  c.fillRect(0, 0, 230, 230);
  c.globalAlpha = 0.14;
  c.strokeStyle = '#ffffff';
  for (let i = 0; i < 24; i++) {
    c.beginPath();
    c.moveTo(0, i * 10);
    c.lineTo(230, i * 10 + 4);
    c.stroke();
  }
  c.globalAlpha = 1;
  // The chalk guide where the seam will go.
  c.setLineDash([3, 5]);
  c.lineWidth = 1.2;
  c.strokeStyle = 'rgba(255,255,255,0.65)';
  c.beginPath();
  c.moveTo(px(SM.u0), py(SM.v0));
  c.lineTo(px(SM.u0), py(SM.v0 + SM.leg1));
  c.lineTo(px(SM.u0 + SM.leg2), py(SM.v0 + SM.leg1));
  c.stroke();
  c.setLineDash([]);
  const seam = (x0: number, y0: number, x1: number, y1: number, col: string) => {
    c.setLineDash([6, 3]);
    c.lineWidth = 2.4;
    c.strokeStyle = col;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
    c.setLineDash([]);
  };
  if (alter > 0.5) {
    // The old seam, the part still in; the picked ends left on the cloth.
    const end = SM.v0 + SM.leg1 * (1 - clamp01(ripped));
    if (end > SM.v0 + 0.002) seam(px(SM.u0), py(SM.v0), px(SM.u0), py(end), '#e7b34d');
  }
  const a = clamp01(leg1);
  if (a > 0) seam(px(SM.u0 - (alter > 0.5 ? 0.012 : 0)), py(SM.v0), px(SM.u0 - (alter > 0.5 ? 0.012 : 0)), py(SM.v0 + SM.leg1 * a), '#ffffff');
  const b = clamp01(leg2);
  if (b > 0) seam(px(SM.u0), py(SM.v0 + SM.leg1), px(SM.u0 + SM.leg2 * b), py(SM.v0 + SM.leg1), '#ffffff');
}
interface Machine {
  bar: THREE.Group;
  foot: THREE.Group;
  wheel: THREE.Group;
  pedal: THREE.Mesh;
  lamp: THREE.Mesh;
  cloth: THREE.Group;
  inner: THREE.Group;
  sheet: ReturnType<typeof liveScreen>;
}
function machineBody(g: THREE.Object3D): Machine {
  const T = SM.top;
  const nx = SM.needle[0];
  const nz = SM.needle[2];
  part(g, rbox(0.96, 0.04, 0.78, 0.008), OAK, 0, T - 0.02, -0.03);
  // The steel frame, the drawer, the treadle.
  for (const sx of [-1, 1]) {
    part(g, box(0.04, T - 0.06, 0.05), IRON, sx * 0.42, (T - 0.06) / 2, -0.03, NO);
    part(g, box(0.05, 0.03, 0.6), IRON, sx * 0.42, 0.015, -0.03, NO);
  }
  part(g, box(0.84, 0.03, 0.03), IRON, 0, 0.2, -0.3, NO);
  part(g, box(0.26, 0.09, 0.42), WALNUT, -0.28, T - 0.085, -0.12);
  const pedal = part(g, box(0.26, 0.016, 0.18), IRON, 0, 0.08, 0.16, NO);
  rod(g, v3(0.1, 0.08, 0.1), v3(0.24, T - 0.1, -0.05), 0.005, IRON);
  part(g, box(0.16, 0.14, 0.2), GRAPHITE, 0.16, T - 0.11, -0.1, NO);
  // The machine: bed, pillar at the right, the long arm back over to the needle.
  part(g, rbox(0.56, 0.034, 0.2, 0.01), IVORY, 0.05, T + 0.012, nz);
  part(g, box(0.1, 0.004, 0.1), STEEL, nx, T + 0.03, nz, NO);
  part(g, rbox(0.1, 0.27, 0.16, 0.02), IVORY, 0.32, T + 0.14, nz - 0.02);
  part(g, rbox(0.52, 0.09, 0.14, 0.03), IVORY, 0.08, T + 0.27, nz - 0.02);
  part(g, rbox(0.1, 0.13, 0.12, 0.02), IVORY, nx, T + 0.25, nz - 0.01);
  part(g, box(0.15, 0.022, 0.003), ROSE, 0.1, T + 0.285, nz + 0.052, NO);
  label(g, LABEL, 0.05, 0.05, 0.28, T + 0.14, nz + 0.063, IVORY, '#7a3a4c');
  // The handwheel at the right, turning.
  const wheel = group(g, 0.385, T + 0.25, nz - 0.02);
  part(wheel, cyl(0.055, 0.055, 0.024, 18), GRAPHITE, 0, 0, 0, { rz: Math.PI / 2 });
  part(wheel, box(0.03, 0.09, 0.012), STEEL, 0.015, 0, 0, NO);
  // The presser foot, on its own bar so it lifts; the needle bar, which goes up and down.
  const foot = group(g, nx - 0.012, T, nz);
  part(foot, box(0.004, 0.17, 0.004), CHROME, 0, 0.13, 0, NO);
  part(foot, box(0.028, 0.004, 0.04), CHROME, 0.004, 0.044, 0.002, NO);
  const bar = group(g, nx, T, nz);
  part(bar, cyl(0.005, 0.005, 0.14, 8), CHROME, 0, 0.17, 0, NO);
  part(bar, cyl(0.0017, 0.0012, 0.05, 6), '#6f7a80', 0, 0.085, 0, NO);
  // The thread: a tall stand behind, cones on it, down to the head.
  rod(g, v3(0.36, T, -0.3), v3(0.36, T + 0.56, -0.3), 0.006, STEEL);
  part(g, box(0.22, 0.008, 0.08), STEEL, 0.36, T + 0.56, -0.3, NO);
  part(g, cyl(0.03, 0.05, 0.14, 12), '#c2385b', 0.28, T + 0.07, -0.3);
  part(g, cyl(0.03, 0.05, 0.14, 12), '#2f4858', 0.44, T + 0.07, -0.3);
  rod(g, v3(0.28, T + 0.14, -0.3), v3(0.28, T + 0.56, -0.3), 0.0012, '#c2385b');
  rod(g, v3(0.28, T + 0.56, -0.3), v3(nx, T + 0.32, nz - 0.02), 0.0012, '#c2385b');
  // A work light on the arm, lit while it runs.
  rod(g, v3(-0.18, T + 0.3, nz - 0.04), v3(nx, T + 0.38, nz + 0.05), 0.005, GRAPHITE);
  part(g, cyl(0.02, 0.03, 0.04, 10), GRAPHITE, nx, T + 0.37, nz + 0.05, NO);
  const lamp = ownLit(g, ball(0.015), '#b7b09a', nx, T + 0.352, nz + 0.05);
  // Trays either side: cut pieces waiting, sewn ones folded.
  for (let i = 0; i < 4; i++) part(g, box(0.2, 0.01, 0.22), FABRICS[wrap(i, FABRICS.length)], SM.pile[0], T + 0.005 + i * 0.011, SM.pile[2], NO);
  for (let i = 0; i < 3; i++) part(g, box(0.2, 0.012, 0.2), FABRICS[wrap(i + 3, FABRICS.length)], SM.done[0], T + 0.006 + i * 0.013, SM.done[2], NO);
  spoolOf(g, 0.22, T, 0.3, '#2f4858');
  // The cloth, turning about the needle as it's pivoted.
  const cloth = group(g, nx, T + 0.033, nz);
  const inner = group(cloth);
  const sheet = liveScreen(inner, CLOTH, CLOTH, 230, 230, 0, 0, 0, 0, -Math.PI / 2);
  cloth.visible = false;
  return { bar, foot, wheel, pedal, lamp, cloth, inner, sheet };
}
function runMachine(M: Machine, t: number, run: number, foot: number) {
  M.bar.position.y = SM.top + (run > 0.5 ? 0.013 * Math.sin(t * 34) : 0.012);
  M.foot.position.y = SM.top + (foot > 0.5 ? 0.012 : 0);
  M.wheel.rotation.x = run > 0.5 ? -t * 26 : M.wheel.rotation.x;
  M.pedal.rotation.x = run > 0.5 ? 0.18 : 0;
  setLit(M.lamp, run > 0.5 ? '#fff3c4' : '#b7b09a');
}
function sewingMachine(g: THREE.Group, out: Built) {
  const M = machineBody(g);
  stool(g, SM.seat);
  const snips = snipsTool(g);
  const ripper = penTool(g, 'fdRipper', PEN_DIR, '#3a6ea5', CHROME, false);
  const spots: Record<string, Spot> = { sewGarment: seatAt(g, 'fdSew', SM.seat), alterGarment: seatAt(g, 'fdAlter', SM.seat) };
  let seed = -1;
  drive(g, out, spots, { snips: snips.held, ripper: ripper.held }, (_now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const col = FABRICS[wrap(seed + round, FABRICS.length)];
    runMachine(M, t, n.run ?? 0, n.foot ?? 1);
    const on = (n.cloth ?? 0) > 0.5;
    M.cloth.visible = on;
    if (on) {
      const piv = n.pivot ?? 0;
      const leg1 = n.leg1 ?? 0;
      const leg2 = n.leg2 ?? 0;
      const up = clamp01(n.up);
      const heldAt = N?.props.clothUp;
      M.inner.position.set(-(SM.u0 + SM.leg2 * leg2) * (1 - up), 0, -(SM.v0 + SM.leg1 * leg1) * (1 - up));
      M.cloth.rotation.set(-1.25 * up, -(Math.PI / 2) * piv * (1 - up), 0, 'YXZ');
      if (heldAt) M.cloth.position.set(SM.needle[0] + (heldAt[0] - SM.needle[0]) * up, SM.top + 0.033 + (heldAt[1] - SM.top - 0.033) * up, SM.needle[2] + (heldAt[2] - SM.needle[2]) * up);
      M.sheet.draw(`${col}|${q(leg1, 40)}|${q(leg2, 40)}|${q(n.alter, 1)}|${q(n.ripped, 30)}`, (c) => paintCloth(c, col, leg1, leg2, n.alter ?? 0, n.ripped ?? 0));
    }
    at(snips.root, N?.props.snips ?? null, SM.rest);
    const op = (n.snip ?? 0) > 0.5 ? 0.04 : 0.22;
    snips.a.rotation.y = op;
    snips.b.rotation.y = -op;
    at(ripper.root, N?.props.ripper ?? null, [SM.rest[0] - 0.03, SM.rest[1] + 0.05, SM.rest[2] - 0.1]);
  });
  out.work = marker(g, SM.needle[0], SM.top + 0.05, 0.2);
}

// 동료 재봉틀 (fdMateMachine, 1 × 1): the same machine with a colleague at it, a seam going through by the clock.
function mateMachine(g: THREE.Group, out: Built) {
  const M = machineBody(g);
  stool(g, SM.seat);
  let seed = -1;
  let mate: Fig | null = null;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  out.away = (_o, t) => {
    if (seed < 0) {
      seed = seedOf(g);
      mate = person(g, '#9575cd', '#3e4a50', '#2b1b10', SM.seat[0], SM.seat[2], Math.PI, 'male', SM.seat[1], seed);
      mate.root.visible = true;
      mate.opts.lean = 0.16;
      nodHead(mate, 0.34);
    }
    // A round: a long seam, the pivot left out, the cloth off and the next on.
    const round = 11;
    const c = t / round + seed * 0.13;
    const n = Math.floor(c);
    const u = c - n;
    const running = u > 0.08 && u < 0.82;
    const leg1 = THREE.MathUtils.clamp((u - 0.08) / 0.74, 0, 1);
    runMachine(M, t, running ? 1 : 0, running ? 0 : 1);
    M.cloth.visible = u < 0.93;
    M.inner.position.set(-SM.u0, 0, -(SM.v0 + SM.leg1 * leg1));
    const col = FABRICS[wrap(n + seed, FABRICS.length)];
    M.sheet.draw(`${col}|${q(leg1, 30)}`, (x) => paintCloth(x, col, leg1, 0, 0, 0));
    if (mate) {
      a.set(SM.needle[0] - 0.14, SM.top + 0.045, 0.23);
      b.set(SM.needle[0] + 0.14, SM.top + 0.045, 0.23);
      mate.armR(a);
      mate.armL(b);
    }
  };
}

// =============================================================================================
// 재단대 (fabricTable, 2 × 1): a broad table, cloth laid on it; a rail of paper patterns behind, a tray with the tools.

const GORE_SHAPE = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.22, -0.1);
  s.lineTo(-0.08, 0.1);
  s.lineTo(0.08, 0.1);
  s.lineTo(0.22, -0.1);
  s.closePath();
  return s;
})();
let goreGeo: THREE.ShapeGeometry | null = null;
const goreGeometry = () => (goreGeo ??= new THREE.ShapeGeometry(GORE_SHAPE));
const TABLE_W = 1.8;
const TABLE_D = 0.74;
const TZ = 0.02;
/** A table point to canvas pixels (the plane's top is its far edge). */
const tpx = (x: number) => (x / TABLE_W + 0.5) * 540;
const tpy = (z: number) => ((z - TZ) / TABLE_D + 0.5) * 222;
function paintTable(c: Ctx2, col: string, chalk: number, cut: number, cut2: number, freed: number) {
  c.fillStyle = col;
  c.fillRect(0, 0, 540, 222);
  c.globalAlpha = 0.12;
  c.strokeStyle = '#ffffff';
  for (let i = 0; i < 30; i++) {
    c.beginPath();
    c.moveTo(i * 20, 0);
    c.lineTo(i * 20 + 4, 222);
    c.stroke();
  }
  c.globalAlpha = 1;
  // The selvedge along the far edge.
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fillRect(0, 2, 540, 4);
  const G = FT.gore;
  const P = G.map((p) => [tpx(p[0]), tpy(p[2])] as const);
  if (freed > 0.5) {
    c.fillStyle = OAK;
    c.beginPath();
    c.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < 4; i++) c.lineTo(P[i][0], P[i][1]);
    c.closePath();
    c.fill();
  }
  // The chalk line, as far as it's gone.
  const seg = [0, 1, 2, 3].map((i) => {
    const a = P[i];
    const b = P[(i + 1) % 4];
    return { a, b, L: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  });
  const total = seg.reduce((n, s) => n + s.L, 0);
  let left = clamp01(chalk) * total;
  c.strokeStyle = CHALK;
  c.lineWidth = 2;
  c.beginPath();
  for (const s of seg) {
    if (left <= 0) break;
    const f = Math.min(1, left / s.L);
    c.moveTo(s.a[0], s.a[1]);
    c.lineTo(s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f);
    left -= s.L * f;
  }
  c.stroke();
  // Cuts: a dark slit along each edge as far as the blades have been.
  c.strokeStyle = '#1b1b1f';
  c.lineWidth = 2.4;
  const cutLen = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) + Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  let cl = clamp01(cut) * cutLen;
  c.beginPath();
  for (const [a, b] of [[P[0], P[1]], [P[1], P[2]]] as const) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (cl <= 0 || L <= 0) break;
    const f = Math.min(1, cl / L);
    c.moveTo(a[0], a[1]);
    c.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
    cl -= L * f;
  }
  const f2 = clamp01(cut2);
  if (f2 > 0) {
    c.moveTo(P[3][0], P[3][1]);
    c.lineTo(P[3][0] + (P[2][0] - P[3][0]) * f2, P[3][1] + (P[2][1] - P[3][1]) * f2);
  }
  c.stroke();
}
function paintDraft(c: Ctx2, a: number, b: number, curve: number, notch: number) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 300, 220);
  c.strokeStyle = '#d7cdb2';
  c.lineWidth = 1;
  for (let i = 1; i < 12; i++) {
    c.beginPath();
    c.moveTo(i * 25, 0);
    c.lineTo(i * 25, 220);
    c.moveTo(0, i * 20);
    c.lineTo(300, i * 20);
    c.stroke();
  }
  c.strokeStyle = INK;
  c.lineWidth = 2;
  const pts = [[40, 190], [40, 30], [260, 30], [260, 190], [40, 190]];
  const go = (from: number, to: number, f: number) => {
    let L = 0;
    for (let i = from; i < to; i++) L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    let left = clamp01(f) * L;
    c.beginPath();
    for (let i = from; i < to && left > 0; i++) {
      const S = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      const k = Math.min(1, left / S);
      c.moveTo(pts[i][0], pts[i][1]);
      c.lineTo(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k);
      left -= S * k;
    }
    c.stroke();
  };
  go(0, 2, a);
  go(2, 4, b);
  if (curve > 0.01) {
    c.strokeStyle = '#c62828';
    c.beginPath();
    c.arc(150, 190, pos(90), Math.PI, Math.PI + Math.PI * clamp01(curve));
    c.stroke();
  }
  for (let i = 0; i < 4; i++) {
    if (notch * 4 <= i) break;
    c.fillStyle = INK;
    c.fillRect(70 + i * 55, 186, 3, 10);
  }
  if (b > 0.9) text(c, '앞판 패턴 · 66', 150, 110, 15, INK, 'center');
}
function fabricTable(g: THREE.Group, out: Built) {
  const T = FT.top;
  part(g, rbox(1.94, 0.05, 0.88, 0.012), '#d8c7a9', 0, T - 0.025, 0);
  for (const sx of [-1, 1]) {
    part(g, box(0.05, T - 0.05, 0.7), WALNUT, sx * 0.9, (T - 0.05) / 2, 0, NO);
    part(g, box(0.07, 0.04, 0.8), WALNUT, sx * 0.9, 0.02, 0, NO);
  }
  // Under: a shelf of folded cloth, a paper roll.
  part(g, box(1.72, 0.03, 0.66), WALNUT, 0, 0.34, 0, NO);
  for (let i = 0; i < 5; i++) part(g, box(0.28, 0.12, 0.42), FABRICS[wrap(i, FABRICS.length)], -0.66 + i * 0.33, 0.42, 0.02);
  part(g, cyl(0.06, 0.06, 1.5, 14), PAPER, 0, 0.62, -0.28, { rz: Math.PI / 2 });
  // A measuring edge along the near side.
  part(g, box(1.8, 0.004, 0.024), TAPE, 0, T + 0.002, 0.42, NO);
  for (let i = 0; i < 19; i++) part(g, box(0.003, 0.005, 0.02), INK, -0.9 + i * 0.1, T + 0.003, 0.42, NO);
  // The rail of paper patterns behind, hung by their punched corners.
  for (const sx of [-1, 1]) rod(g, v3(sx * 0.9, T, -0.42), v3(sx * 0.9, T + 0.64, -0.42), 0.012, IRON);
  rod(g, v3(-0.9, T + 0.64, -0.42), v3(0.9, T + 0.64, -0.42), 0.009, IRON);
  const patternTex = painted('fdPatternHang', 96, 160, (c) => {
    c.fillStyle = '#e6d8a8';
    c.fillRect(0, 0, 96, 160);
    c.strokeStyle = '#6b4a10';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(16, 20);
    c.lineTo(80, 20);
    c.lineTo(70, 150);
    c.lineTo(26, 150);
    c.closePath();
    c.stroke();
    text(c, `${LABEL} 앞판`, 48, 80, 14, '#6b4a10', 'center');
    c.fillStyle = '#6b4a10';
    c.beginPath();
    c.arc(48, 10, 4, 0, 6.3);
    c.fill();
  });
  [-0.72, -0.42, -0.1, 0.22, 0.54].forEach((x, i) => {
    picture(g, patternTex, 0.24, 0.42, x, T + 0.4, -0.4 + i * 0.002, i % 2 ? '#ffffff' : '#ece6d6', (i - 2) * 0.05);
    part(g, ball(0.01), BRASS, x, T + 0.6, -0.4, NO);
  });
  // The tool tray, on the right; the weights, on the left.
  part(g, rbox(0.24, 0.012, 0.14, 0.004), GRAPHITE, 0.06, T + 0.006, 0.34, NO);
  for (let i = 0; i < 3; i++) part(g, cyl(0.03, 0.035, 0.03, 12), IRON, -0.78 + i * 0.07, T + 0.015, 0.33, NO);
  // The cloth, live; the pieces cut from it stacked beside.
  const sheet = liveScreen(g, TABLE_W, TABLE_D, 540, 222, 0, T + 0.002, TZ, 0, -Math.PI / 2);
  const paper = liveScreen(g, 0.48, 0.25, 96, 50, FT.cutX, T + 0.009, 0.23, 0, -Math.PI / 2);
  paper.mesh.visible = false;
  const weights = [-0.12, 0.1].map((dx) => part(g, cyl(0.03, 0.035, 0.03, 12), IRON, FT.cutX + dx, T + 0.024, 0.23, NO));
  const stackA = tinted(part(g, goreGeometry(), FABRICS[0], FT.stack[0], T + 0.012, FT.stack[2], { rx: -Math.PI / 2, outline: false }));
  const free = tinted(part(g, goreGeometry(), FABRICS[0], FT.cutX, T + 0.012, 0.23, { rx: -Math.PI / 2, outline: false }));
  free.visible = false;
  const draft = liveScreen(g, 0.62, 0.42, 300, 220, FT.draftX, T + 0.007, 0.2, 0, -Math.PI / 2);
  draft.mesh.visible = false;
  const shears = shearsTool(g);
  const chalk = chalkTool(g);
  const pencil = penTool(g, 'fdPencil', PEN_DIR, '#3a3a3a', '#caa56d');
  const spots: Record<string, Spot> = { cutFabric: standAt(g, 'fdCut', FT.cutX, FT.stand), fashionDesigner_patternStudy: standAt(g, 'fdPattern', FT.draftX, FT.stand) };
  let seed = -1;
  drive(g, out, spots, { shears: shears.held, chalk: chalk.held, pencil: pencil.held }, (_now, N) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const col = FABRICS[wrap(seed + round, FABRICS.length)];
    const ch = n.chalk ?? 0;
    const cu = n.cut ?? 0;
    const c2 = n.cut2 ?? 0;
    const fr = n.freed ?? 0;
    sheet.draw(`${col}|${q(ch, 40)}|${q(cu, 40)}|${q(c2, 40)}|${q(fr, 1)}`, (c) => paintTable(c, col, ch, cu, c2, fr));
    paper.mesh.visible = (n.paper ?? 0) > 0.05;
    if (paper.mesh.visible) {
      paper.mesh.position.y = T + 0.009 + (1 - clamp01(n.paper)) * 0.2;
      paper.draw('p', (c) => {
        c.fillStyle = '#e6d8a8';
        c.fillRect(0, 0, 96, 50);
        text(c, '치마 조각', 48, 25, 12, '#6b4a10', 'center');
      });
    }
    for (const w of weights) w.visible = (n.weights ?? 0) > 0.5;
    const col2 = FABRICS[wrap(seed + round + 1, FABRICS.length)];
    tint(stackA, col2);
    const freeShow = fr > 0.02;
    free.visible = freeShow && (n.stacked ?? 0) < 0.9;
    if (freeShow) {
      const k = clamp01(n.stacked);
      free.position.set(FT.cutX + (FT.stack[0] - FT.cutX) * k, T + 0.012 + 0.12 * clamp01(fr) * (1 - k), 0.23 + (FT.stack[2] - 0.23) * k);
      tint(free, col);
    }
    draft.mesh.visible = (n.draftPaper ?? 0) > 0.5;
    if (draft.mesh.visible) draft.draw(`${q(n.lines1, 30)}|${q(n.lines2, 30)}|${q(n.curve, 20)}|${q(n.notch, 8)}`, (c) => paintDraft(c, n.lines1 ?? 0, n.lines2 ?? 0, n.curve ?? 0, n.notch ?? 0));
    at(shears.root, N?.props.shears ?? null, FT.shearsRest);
    shears.root.rotation.y = n.shearYaw ?? 0.3;
    snipShears(shears, 0.15 + 0.85 * (n.snip ?? 0));
    at(chalk.root, N?.props.chalk ?? null, FT.chalkRest);
    at(pencil.root, N?.props.pencil ?? null, FT.pencilRest);
  });
  out.work = marker(g, 0, T + 0.04, 0.24);
}

// =============================================================================================
// 드로잉 테이블 (fdDrawingTable, 2 × 1): a tilted board, a tall stool, the swatch book, pencils in a cup; a design that develops.

interface SketchView {
  lines: number;
  shape: number;
  colour: number;
  detail: number;
  clipped: number;
  signed: number;
  report: number;
  ticks: number;
  circled: number;
  i: number;
}
const SEASONS = ['가을 코트', '봄 원피스', '겨울 수트', '여름 셔츠'];
function paintSketch(c: Ctx2, v: SketchView) {
  const W = 360;
  const H = 258;
  c.fillStyle = '#fbf8ef';
  c.fillRect(0, 0, W, H);
  if (v.report > 0.5) {
    text(c, `${LABEL} 지난 시즌 판매`, W / 2, 22, 17, INK, 'center');
    const bars = [0.5, 0.8, 0.35, 0.95, 0.6];
    const names = ['코트', '수트', '셔츠', '원피스', '가방'];
    bars.forEach((b, i) => {
      const x = 44 + i * 58;
      c.fillStyle = i === 3 ? ROSE : '#8a97a0';
      c.fillRect(x, 200 - b * 140, 34, b * 140);
      text(c, names[i], x + 17, 216, 12, INK, 'center', false);
      if (v.ticks > i - 0.5 && v.ticks > 0.1 && i < 4) {
        c.strokeStyle = '#c62828';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x + 8, 192 - b * 140);
        c.lineTo(x + 14, 198 - b * 140);
        c.lineTo(x + 26, 184 - b * 140);
        c.stroke();
      }
    });
    if (v.circled > 0.05) {
      c.strokeStyle = '#c62828';
      c.lineWidth = 2.4;
      c.beginPath();
      c.arc(235, 60, pos(32), -1.6, -1.6 + 6.3 * clamp01(v.circled));
      c.stroke();
      text(c, '다음 시즌 더!', 280, 106, 13, '#c62828', 'center');
    }
    return;
  }
  const cx = 160;
  const hip = 134;
  const waist = 106;
  // The croquis: first lines, a stretched figure.
  const lines = clamp01(v.lines);
  c.strokeStyle = 'rgba(70,70,76,0.55)';
  c.lineWidth = 1.2;
  if (lines > 0) {
    c.beginPath();
    c.moveTo(cx, 22);
    c.lineTo(cx + 4 * lines, 22 + 215 * lines);
    c.stroke();
    if (lines > 0.2) {
      c.beginPath();
      c.arc(cx, 26, pos(9 * Math.min(1, lines * 2)), 0, 6.3);
      c.stroke();
    }
    if (lines > 0.5) {
      c.beginPath();
      c.moveTo(cx - 26, 52);
      c.lineTo(cx + 26, 50);
      c.moveTo(cx - 20, hip);
      c.lineTo(cx + 22, hip);
      c.moveTo(cx - 12, waist);
      c.lineTo(cx + 12, waist);
      c.moveTo(cx - 26, 52);
      c.lineTo(cx - 34, 128);
      c.moveTo(cx + 26, 50);
      c.lineTo(cx + 38, 126);
      c.stroke();
    }
  }
  // The garment's outline, inked as it goes.
  const outline = (close: boolean) => {
    c.beginPath();
    c.moveTo(cx - 25, 52);
    c.quadraticCurveTo(cx - 16, 80, cx - 13, waist);
    c.lineTo(cx - 44, 218);
    c.lineTo(cx + 46, 218);
    c.lineTo(cx + 13, waist);
    c.quadraticCurveTo(cx + 16, 80, cx + 25, 52);
    if (close) c.closePath();
  };
  const col = FABRICS[wrap(v.i, FABRICS.length)];
  if (v.colour > 0.02) {
    c.save();
    outline(true);
    c.clip();
    c.fillStyle = col;
    c.fillRect(cx - 60, 40, 120, 180 * clamp01(v.colour) + 2);
    c.restore();
  }
  if (v.shape > 0.02) {
    c.strokeStyle = INK;
    c.lineWidth = 1.8;
    outline(false);
    c.setLineDash([500 * clamp01(v.shape), 500]);
    c.stroke();
    c.setLineDash([]);
  }
  if (v.detail > 0.02) {
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 1.2;
    const n = Math.floor(5 * clamp01(v.detail));
    for (let i = 0; i < n; i++) {
      c.beginPath();
      c.moveTo(cx - 8 - i * 7, waist + 8);
      c.lineTo(cx - 14 - i * 8, 214);
      c.moveTo(cx + 8 + i * 7, waist + 8);
      c.lineTo(cx + 14 + i * 8, 214);
      c.stroke();
    }
    c.fillStyle = BRASS;
    for (let i = 0; i < Math.min(4, n); i++) {
      c.beginPath();
      c.arc(cx, 62 + i * 12, 2, 0, 6.3);
      c.fill();
    }
    text(c, SEASONS[wrap(v.i, SEASONS.length)], 280, 38, 14, INK, 'center');
    c.strokeStyle = '#8a8a8a';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx + 30, 60);
    c.lineTo(250, 48);
    c.stroke();
  }
  if (v.clipped > 0.5) {
    c.fillStyle = col;
    c.fillRect(300, 92, 42, 42);
    c.fillStyle = BRASS;
    c.fillRect(312, 86, 18, 8);
  }
  if (v.signed > 0.2) text(c, `${LABEL} · 담당 라인`, 290, 232, 13, INK, 'center');
}
function drawingTable(g: THREE.Group, out: Built) {
  const B = DT.board;
  part(g, rbox(1.92, 0.04, 0.82, 0.01), WALNUT, 0, 0.84, 0.02);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.82, 0.7), IRON, sx * 0.9, 0.41, 0.02, NO);
  part(g, box(0.5, 0.56, 0.6), OAK, 0.66, 0.54, -0.04);
  for (let i = 0; i < 3; i++) {
    part(g, box(0.46, 0.15, 0.02), shadeOak(i), 0.66, 0.74 - i * 0.18, 0.265, NO);
    part(g, box(0.08, 0.012, 0.012), BRASS, 0.66, 0.74 - i * 0.18, 0.28, NO);
  }
  stool(g, DT.seat, ROSE);
  // The board on two struts.
  const face = group(g, B[0], B[1], B[2]);
  face.rotation.x = -(Math.PI / 2 - DT.tilt);
  part(face, rbox(DT.w + 0.06, DT.h + 0.06, 0.03, 0.008), '#dfe2e4', 0, 0, -0.016);
  part(face, box(DT.w + 0.04, 0.012, 0.024), STEEL, 0, -DT.h / 2 - 0.03, 0.01, NO);
  for (const sx of [-1, 1]) rod(g, v3(B[0] + sx * 0.3, 0.86, -0.1), v3(B[0] + sx * 0.3, B[1] + 0.1, B[2] - 0.18), 0.012, IRON);
  const page = liveScreen(g, DT.w, DT.h, 360, 258, B[0], B[1], B[2], 0, -(Math.PI / 2 - DT.tilt));
  const off = boardAt(0, 0, 0.004);
  page.mesh.position.set(off[0], off[1], off[2]);
  // Swatch book left, pencil cup right, a calculator, a lit lamp; the mood wall at the back of the table.
  const book = group(g, DT.bookAt[0], 0.86, DT.bookAt[2]);
  part(book, rbox(0.2, 0.028, 0.15, 0.006), INK, 0, 0.014, 0, NO);
  for (let i = 0; i < 5; i++) part(book, box(0.2, 0.004, 0.018), FABRICS[wrap(i, FABRICS.length)], 0, 0.03, -0.05 + i * 0.024, NO);
  const openBook = part(book, box(0.2, 0.006, 0.14), '#d7ccc8', 0, 0.038, 0, NO);
  part(g, cyl(0.04, 0.035, 0.1, 12), GRAPHITE, 0.3, 0.91, 0.0, NO);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    rod(g, v3(0.3, 0.88, 0.0), v3(0.3 + Math.cos(a) * 0.03, 1.08, Math.sin(a) * 0.03), 0.004, FABRICS[wrap(i, FABRICS.length)]);
  }
  part(g, rbox(0.1, 0.012, 0.14, 0.005), GRAPHITE, DT.calc[0], 0.866, DT.calc[2], NO);
  part(g, box(0.08, 0.002, 0.03), '#c8dcc6', DT.calc[0], 0.873, DT.calc[2] - 0.04, NO);
  workLamp(g, -0.78, 0.86, 0.02, 0.56);
  const mood = painted('fdMoodBoard', 240, 150, (c) => {
    c.fillStyle = '#efe8d8';
    c.fillRect(0, 0, 240, 150);
    FABRICS.forEach((f, i) => {
      c.fillStyle = f;
      c.fillRect(8 + (i % 4) * 56, 8 + Math.floor(i / 4) * 66, 50, 58);
    });
    text(c, `${LABEL} 다음 시즌`, 178, 118, 16, INK, 'center');
  });
  part(g, box(0.82, 0.54, 0.02), WALNUT, 0.52, 1.17, -0.33, NO);
  picture(g, mood, 0.78, 0.5, 0.52, 1.17, -0.318);
  const pencil = penTool(g, 'fdSketchPencil', PEN_DIR_TILT, '#3a3a3a', '#caa56d');
  const swatch = swatchTool(g);
  const spots: Record<string, Spot> = { designSketch: seatAt(g, 'fdSketch', DT.seat), fashionDesigner_ownLine: seatAt(g, 'fdOwnLine', DT.seat), fashionDesigner_salesAnalysis: seatAt(g, 'fdSales', DT.seat) };
  let seed = -1;
  drive(g, out, spots, { pencil: pencil.held, swatch: swatch.held }, (_now, N) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const i = (N?.b.n ?? 0) + seed;
    // Nobody here: a finished design stays pinned on the board.
    const v: SketchView = N
      ? { lines: n.lines ?? 0, shape: n.shape ?? 0, colour: n.colour ?? 0, detail: n.detail ?? 0, clipped: n.clipped ?? 0, signed: n.signed ?? 0, report: n.report ?? 0, ticks: n.ticks ?? 0, circled: n.circled ?? 0, i }
      : { lines: 1, shape: 1, colour: 1, detail: 1, clipped: 0, signed: 0, report: 0, ticks: 0, circled: 0, i: seed };
    page.draw(`${q(v.lines, 12)}|${q(v.shape, 24)}|${q(v.colour, 24)}|${q(v.detail, 10)}|${q(v.clipped, 1)}|${q(v.signed, 1)}|${q(v.report, 1)}|${q(v.ticks, 4)}|${q(v.circled, 12)}|${wrap(v.i, 28)}`, (c) => paintSketch(c, v));
    openBook.visible = (n.book ?? 0) > 0.5;
    at(pencil.root, N?.props.pencil ?? null, DT.pencilRest);
    at(swatch.root, N?.props.swatch ?? null, DT.swatchRest);
    tint(swatch.piece, FABRICS[wrap(i, FABRICS.length)]);
  });
  out.work = marker(g, B[0], B[1] + 0.02, B[2] + 0.04);
}
const shadeOak = (i: number) => (i === 1 ? '#b08f65' : '#b99970');

// =============================================================================================
// 드레이핑 폼 (fdDressForm, 1 × 1): a padded form on an iron stand; cloth over it that goes on, is pinned, and is trimmed.

const TORSO: ReadonlyArray<readonly [number, number]> = [[0.001, 0.97], [0.15, 0.97], [0.17, 1.0], [0.135, 1.08], [0.15, 1.2], [0.175, 1.3], [0.14, 1.38], [0.06, 1.42], [0.055, 1.46], [0.001, 1.46]];
const BODICE: ReadonlyArray<readonly [number, number]> = [[0.15, 1.02], [0.143, 1.08], [0.158, 1.2], [0.185, 1.3], [0.15, 1.38], [0.07, 1.425], [0.001, 1.43]];
const SKIRT: ReadonlyArray<readonly [number, number]> = [[0.005, 0], [0.26, 0], [0.22, 0.14], [0.17, 0.28], [0.14, 0.36], [0.001, 0.36]];
function dressForm(g: THREE.Group, out: Built) {
  // Iron base with three feet; the height collar.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    rod(g, v3(0, 0.12, 0), v3(Math.sin(a) * 0.27, 0.03, Math.cos(a) * 0.27), 0.016, IRON);
    part(g, ball(0.024), IRON, Math.sin(a) * 0.27, 0.025, Math.cos(a) * 0.27, NO);
  }
  part(g, cyl(0.02, 0.022, 0.86, 10), IRON, 0, 0.55, 0, NO);
  part(g, cyl(0.03, 0.03, 0.05, 12), BRASS, 0, 0.8, 0, NO);
  const form = group(g);
  const torso = part(form, lathe('fdTorso', TORSO), '#e3d5bd', 0, 0, 0);
  torso.scale.set(1, 1, 0.76);
  part(form, cyl(0.055, 0.07, 0.022, 14), WALNUT, 0, 1.47, 0);
  part(form, ball(0.024), BRASS, 0, 1.5, 0, NO);
  part(form, box(0.004, 0.42, 0.003), '#6b5a44', 0, 1.2, 0.128, NO);
  for (const sx of [-1, 1]) part(form, box(0.004, 0.36, 0.003), '#6b5a44', sx * 0.08, 1.19, 0.118, NO);
  // The cloth.
  const bodice = tinted(part(form, lathe('fdBodice', BODICE), MUSLIN, 0, 0, 0));
  bodice.scale.set(1, 1, 0.8);
  const skirtG = group(form, 0, 1.07, 0);
  const skirt = tinted(part(skirtG, lathe('fdSkirt', SKIRT), MUSLIN, 0, -0.36, 0));
  skirt.scale.set(1, 1, 0.8);
  // The chalk line at the waist.
  const chalkLine = part(form, cyl(0.15, 0.15, 0.004, 22), CHALK, 0, 1.05, 0, NO);
  chalkLine.scale.set(1, 1, 0.82);
  const pinBalls = DF.pins.map((p) => part(form, ball(0.006), '#d9445c', p[0], p[1], p[2], NO));
  // A little side table with the tools, its top well above the base.
  rod(g, v3(-0.3, 0, 0.28), v3(-0.3, 0.88, 0.28), 0.012, IRON);
  part(g, cyl(0.12, 0.12, 0.014, 14), OAK, -0.3, 0.89, 0.28, NO);
  part(g, cyl(0.1, 0.11, 0.012, 14), IRON, -0.3, 0.006, 0.28, NO);
  const cushion = group(g);
  part(cushion, cyl(0.032, 0.036, 0.022, 12), '#c2385b', 0, 0, 0, NO);
  part(cushion, ball(0.03), '#c2385b', 0, 0.012, 0, NO);
  const pin = pinTool(g);
  const shears = shearsTool(g);
  const chalk = chalkTool(g);
  const spots: Record<string, Spot> = {
    fdDrape: standAt(g, 'fdDrape', 0, DF.stand),
    fashionDesigner_lookbookShoot: standAt(g, 'fdCouture', 0, DF.stand),
  };
  let seed = -1;
  let lastCol = '';
  drive(g, out, spots, { pin: pin.held, shears: shears.held, chalk: chalk.held }, (_now, N) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    // Nobody here: a draped form stays dressed, half done.
    const dr = N ? clamp01(n.drape) : 1;
    const sk = N ? clamp01(n.skirt) : seed % 2 ? 1 : 0.6;
    const col = (n.silk ?? 0) > 0.5 ? SILK : MUSLIN;
    if (col !== lastCol) {
      lastCol = col;
      tint(bodice, col);
      tint(skirt, col);
    }
    bodice.visible = dr > 0.03;
    bodice.scale.y = 0.2 + 0.8 * dr;
    bodice.position.y = (1 - (0.2 + 0.8 * dr)) * 1.43;
    skirt.visible = sk > 0.03;
    const trim = clamp01(n.trim);
    skirtG.scale.set(0.85 + 0.15 * sk, sk * (1 - 0.45 * trim), 0.85 + 0.15 * sk);
    form.rotation.y = (n.turn ?? 0) * 0.9;
    chalkLine.visible = (n.chalk ?? 0) > 0.04;
    chalkLine.scale.x = 0.3 + 0.7 * clamp01(n.chalk);
    const count = N ? Math.floor(n.pins ?? 0) : 4;
    pinBalls.forEach((b, i) => (b.visible = i < count && dr > 0.3));
    at(pin.root, N?.props.pin ?? null, [DF.cushion[0], DF.cushion[1] + 0.06, DF.cushion[2]]);
    pin.root.visible = !!N?.tool && N.tool === 'pin';
    at(cushion, N?.props.cushion ?? null, [-0.38, 0.915, 0.2]);
    at(shears.root, N?.props.shears ?? null, DF.shearsRest);
    shears.root.rotation.y = n.shearYaw ?? 0.4;
    snipShears(shears, 0.15 + 0.85 * (n.snip ?? 0));
    at(chalk.root, N?.props.chalk ?? null, DF.chalkRest);
  });
  out.work = marker(g, 0, 1.2, 0.14);
}

// =============================================================================================
// 스팀 프레스 (fdSteamPress, 2 × 1): a padded buck, a hinged head with a two-hand bar, a boiler with a gauge, and a sleeve board with an iron.

function paintPressed(c: Ctx2, col: string, flat: number, flipped: number) {
  c.fillStyle = col;
  c.fillRect(0, 0, 280, 110);
  // Creases that go as it's pressed; a clean centre line that comes.
  const k = 1 - clamp01(flat);
  if (k > 0.02) {
    c.strokeStyle = `rgba(0,0,0,${0.32 * k})`;
    c.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.moveTo(20 + i * 28, 10 + (i % 3) * 22);
      c.quadraticCurveTo(40 + i * 28, 56, 8 + i * 30, 100 - (i % 2) * 18);
      c.stroke();
    }
  }
  c.strokeStyle = `rgba(255,255,255,${0.5 * clamp01(flat)})`;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, 55);
  c.lineTo(280, 55);
  c.stroke();
  if (flipped > 0.5) {
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(0, 0, 280, 110);
    c.fillStyle = IVORY;
    c.fillRect(120, 8, 40, 16);
  }
}
function steamPress(g: THREE.Group, out: Built) {
  const T = SP.top;
  part(g, rbox(1.94, 0.82, 0.72, 0.02), '#d9dcde', 0, T / 2 - 0.01, -0.02);
  part(g, box(1.86, 0.03, 0.03), STEEL, 0, 0.5, 0.345, NO);
  // The treadle lever and the buck.
  part(g, box(0.3, 0.02, 0.12), IRON, SP.x, 0.07, 0.4, NO);
  part(g, cyl(0.01, 0.01, 0.1, 6), IRON, SP.x, 0.04, 0.36, NO);
  part(g, rbox(1.0, 0.05, 0.46, 0.04), '#3d6a6d', SP.x, SP.buckY - 0.025, 0.04);
  part(g, box(1.06, 0.024, 0.5), '#b0b6ba', SP.x, T + 0.012, 0.04, NO);
  const clothS = liveScreen(g, 0.96, 0.38, 280, 110, SP.x, SP.buckY + 0.004, 0.05, 0, -Math.PI / 2);
  // The head on its hinge: a padded shell, a two-hand bar at the front.
  const head = group(g, SP.pivot[0], SP.pivot[1], SP.pivot[2]);
  part(head, rbox(1.02, 0.09, 0.42, 0.04), '#c9ccd0', 0, 0.02, 0.21);
  part(head, box(0.94, 0.012, 0.36), '#8f979c', 0, -0.03, 0.21, NO);
  rod(head, v3(-0.32, 0.03, 0.42), v3(-0.32, 0.1, SP.arm), 0.01, IRON);
  rod(head, v3(0.32, 0.03, 0.42), v3(0.32, 0.1, SP.arm), 0.01, IRON);
  rod(head, v3(-0.34, 0.1, SP.arm), v3(0.34, 0.1, SP.arm), 0.015, '#40362e');
  part(g, box(0.1, 0.17, 0.08), IRON, SP.x, SP.pivot[1] - 0.05, SP.pivot[2], NO);
  // The boiler at the back left; gauge, hose, and light.
  const bX = -0.8;
  part(g, cyl(0.1, 0.1, 0.34, 16), '#e8eaec', bX, T + 0.17, -0.2);
  part(g, cyl(0.1, 0.1, 0.012, 16), STEEL, bX, T + 0.34, -0.2, NO);
  part(g, cyl(0.04, 0.04, 0.01, 14), BLACK, bX, T + 0.22, -0.097, { rx: Math.PI / 2, outline: false });
  const needle = part(g, box(0.004, 0.03, 0.003), '#d32f2f', bX, T + 0.22, -0.09, NO);
  const ready = ownLit(g, ball(0.012), '#66bb6a', bX + 0.06, T + 0.13, -0.11);
  rod(g, v3(bX + 0.08, T + 0.2, -0.2), v3(SP.pivot[0] - 0.46, SP.pivot[1], SP.pivot[2]), 0.01, GRAPHITE);
  label(g, '고온 주의', 0.14, 0.05, bX, T + 0.07, -0.098, '#f9e79f', '#6b4a10');
  // The waiting basket of creased work on the left.
  const bk = SP.basket;
  part(g, cyl(0.15, 0.12, 0.08, 14), '#c7a97c', bk[0] + 0.02, T + 0.04, bk[2]);
  part(g, ball(0.11), FABRICS[1], bk[0] + 0.02, T + 0.08, bk[2]).scale.set(1.1, 0.5, 1.1);
  // Steam from under the head.
  const puffs = [0, 1, 2, 3, 4, 5].map(() => {
    const m = haze(g, ball(0.06), '#ffffff', 0.32, SP.x, SP.buckY, 0.2);
    m.visible = false;
    return m;
  });
  // The sleeve board on its own stand at the right, and the rest with the iron.
  const bx = SP.boardX;
  rod(g, v3(bx, T, -0.12), v3(bx, SP.boardTop - 0.02, -0.12), 0.012, IRON);
  part(g, box(0.16, 0.02, 0.5), '#54707a', bx, SP.boardTop - 0.01, SP.boardZ, NO);
  part(g, box(0.18, 0.012, 0.3), '#4b6670', bx, T + 0.006, -0.16, NO);
  part(g, rbox(0.16, 0.01, 0.26, 0.004), '#7a7a7a', SP.ironRest[0], SP.ironRest[1] - IRON_UP - 0.006, SP.ironRest[2], NO);
  rod(g, v3(SP.ironRest[0] - 0.05, T, SP.ironRest[2] - 0.14), v3(SP.ironRest[0], SP.ironRest[1] - IRON_UP - 0.01, SP.ironRest[2] - 0.1), 0.01, IRON);
  rod(g, v3(SP.ironRest[0] + 0.05, T, SP.ironRest[2] + 0.1), v3(SP.ironRest[0], SP.ironRest[1] - IRON_UP - 0.01, SP.ironRest[2] + 0.1), 0.01, IRON);
  const sleeve = tinted(part(g, box(0.13, 0.008, 0.44), FABRICS[0], bx, SP.boardTop + 0.004, SP.boardZ, NO));
  const seamOpen = part(g, box(0.02, 0.003, 0.42), '#2b2b30', bx, SP.boardTop + 0.01, SP.boardZ, NO);
  const iron = ironTool(g);
  const ironPuffs = [0, 1, 2].map(() => {
    const m = haze(g, ball(0.03), '#ffffff', 0.34, bx, SP.boardTop, 0.1);
    m.visible = false;
    return m;
  });
  const spots: Record<string, Spot> = { fdPress: standAt(g, 'fdPress', SP.x, SP.stand), fdIronSeam: standAt(g, 'fdIron', SP.boardX, SP.stand) };
  let seed = -1;
  drive(g, out, spots, { iron: iron.held }, (_now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const col = FABRICS[wrap(seed + round, FABRICS.length)];
    const open = N && N.n.head !== undefined ? clamp01(n.head) : 1;
    head.rotation.x = -SP.openAngle * open;
    clothS.mesh.visible = (n.cloth ?? 0) > 0.5;
    if (clothS.mesh.visible) clothS.draw(`${col}|${q(n.flat, 10)}|${q(n.flipped, 1)}`, (c) => paintPressed(c, col, n.flat ?? 0, n.flipped ?? 0));
    const steaming = (n.steam ?? 0) > 0.5 || (n.vac ?? 0) > 0.5;
    needle.rotation.z = (n.steam ?? 0) > 0.5 ? -0.9 + 0.1 * Math.sin(t * 9) : -0.2;
    setLit(ready, (n.steam ?? 0) > 0.5 ? '#ffb74d' : '#66bb6a');
    puffs.forEach((p, i) => {
      p.visible = steaming && (n.steam ?? 0) > 0.5;
      if (!p.visible) return;
      const a = ((t * 0.7 + i / puffs.length) % 1 + 1) % 1;
      p.position.set(SP.x - 0.4 + i * 0.16, SP.buckY + 0.06 + a * 0.45, 0.28 + 0.03 * Math.sin(i + t));
      p.scale.setScalar(0.5 + a * 1.2);
    });
    const onBoard = (n.sleeve ?? 0) > 0.5;
    sleeve.visible = true;
    tint(sleeve, col);
    seamOpen.visible = onBoard && (n.opened ?? 0) > 0.5;
    seamOpen.scale.x = 0.5 + 0.5 * clamp01(n.flat);
    at(iron.root, N?.props.iron ?? null, SP.ironRest);
    ironPuffs.forEach((p, i) => {
      p.visible = (n.puff ?? 0) > 0.5;
      if (!p.visible) return;
      const a = ((t * 1.1 + i / 3) % 1 + 1) % 1;
      p.position.set(bx + 0.02 * Math.sin(i * 2 + t), SP.boardTop + 0.05 + a * 0.3, 0.1 + i * 0.03);
      p.scale.setScalar(0.5 + a);
    });
  });
  const h = pressHandle(1);
  out.work = marker(g, h[0], h[1], h[2]);
}

// =============================================================================================
// 원단 랙 (fdFabricRack, 2 × 1): shelves of bolts floor to above the head, a ledge to unroll on, a tag on every shelf.

function fabricRack(g: THREE.Group, out: Built) {
  // The frame, standing against the wall.
  for (const sx of [-1, 1]) {
    part(g, box(0.05, 2.1, 0.05), IRON, sx * 0.92, 1.05, -0.34, NO);
    part(g, box(0.05, 2.1, 0.05), IRON, sx * 0.92, 1.05, 0.05, NO);
  }
  const ys = [0.4, 0.79, 1.17, 1.56, 1.94];
  ys.forEach((y, row) => {
    part(g, box(1.86, 0.02, 0.44), WALNUT, 0, y - 0.075, -0.15, NO);
    for (let i = 0; i < 3; i++) {
      // The slot the bolt comes from stays empty when it's out, and is drawn apart below.
      if (row === 2 && i === 0) continue;
      part(g, cyl(0.055, 0.055, 1.62, 14), FABRICS[wrap(row * 2 + i * 3, FABRICS.length)], 0, y, i === 0 ? FR.slot[2] : -0.14 - (i - 1) * 0.15, { rz: Math.PI / 2 });
      part(g, cyl(0.017, 0.017, 1.68, 8), '#caa56d', 0, y, i === 0 ? FR.slot[2] : -0.14 - (i - 1) * 0.15, { rz: Math.PI / 2, outline: false });
    }
    label(g, ['면', '울', '실크', '리넨', '데님'][row], 0.14, 0.05, -0.82, y - 0.09, 0.075, IVORY, INK);
  });
  // The ledge: a small table across the front.
  const L = FR.ledgeTop;
  part(g, rbox(1.84, 0.032, 0.36, 0.008), OAK, 0, L - 0.016, 0.26);
  for (const sx of [-1, 1]) part(g, box(0.04, L - 0.03, 0.04), IRON, sx * 0.88, (L - 0.03) / 2, 0.4, NO);
  part(g, box(1.8, 0.02, 0.03), IRON, 0, 0.3, 0.41, NO);
  // A swatch tray, a price book, a pencil tied on.
  part(g, rbox(0.22, 0.012, 0.16, 0.004), IVORY, FR.swatchRest[0], L + 0.006, 0.31, NO);
  part(g, rbox(0.22, 0.02, 0.15, 0.005), '#7b2d2d', 0.68, L + 0.012, 0.29, NO);
  label(g, `${LABEL} 원단 장부`, 0.16, 0.05, 0.68, L + 0.05, 0.208, IVORY, INK);
  // The unrolled length, down off the ledge's front.
  const bolt = boltTool(g);
  const lay = tinted(part(g, box(0.72, 0.004, 1), FABRICS[0], 0, L + 0.002, 0, NO));
  const hang = tinted(part(g, box(0.72, 1, 0.004), FABRICS[0], 0, 0, 0.44, NO));
  const swatch = swatchTool(g);
  const spots: Record<string, Spot> = { fdPickFabric: standAt(g, 'fdPick', 0, FR.stand) };
  let seed = -1;
  drive(g, out, spots, { bolt: bolt.held, swatch: swatch.held }, (_now, N) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const col = FABRICS[wrap(seed + (N?.b.n ?? 0), FABRICS.length)];
    tint(bolt.roll, col);
    tint(lay, col);
    tint(hang, col);
    tint(swatch.piece, col);
    at(bolt.root, N?.props.bolt ?? null, FR.slot);
    const u = clamp01(n.unroll);
    lay.visible = hang.visible = u > 0.02;
    if (u > 0.02) {
      const front = 0.44;
      const back = FR.ledge[2];
      lay.scale.z = Math.max(0.001, front - back);
      lay.position.z = (front + back) / 2;
      const d = Math.max(0.001, u * 0.62);
      hang.scale.y = d;
      hang.position.y = L - d / 2;
    }
    at(swatch.root, N?.tool === 'swatch' ? N.props.swatch : null);
  });
  out.work = marker(g, 0, 1.2, FR.slot[2]);
}

// =============================================================================================
// 가봉 코너 (fdFittingCorner, 2 × 2): a low round stand, a tall mirror of its own, a grown-up client in a basted jacket; shoulders and sleeves only.

function paintMirror(c: Ctx2, withClient: number) {
  const W = 180;
  const H = 380;
  const gr = c.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, '#dfe7ea');
  gr.addColorStop(0.5, '#c3d0d6');
  gr.addColorStop(1, '#e8eef0');
  c.fillStyle = gr;
  c.fillRect(0, 0, W, H);
  // The room, faintly: a floor line.
  c.fillStyle = 'rgba(120,100,80,0.18)';
  c.fillRect(0, 310, W, 70);
  if (withClient > 0.05) {
    c.globalAlpha = 0.25 + 0.5 * clamp01(withClient);
    c.fillStyle = MUSLIN;
    c.beginPath();
    c.moveTo(62, 110);
    c.lineTo(118, 110);
    c.lineTo(124, 210);
    c.lineTo(56, 210);
    c.closePath();
    c.fill();
    c.fillRect(38, 112, 18, 90);
    c.fillRect(124, 112, 18, 90);
    c.fillStyle = '#3e4a50';
    c.fillRect(66, 210, 22, 110);
    c.fillRect(92, 210, 22, 110);
    c.fillStyle = SKIN;
    c.beginPath();
    c.arc(90, 80, pos(24), 0, 6.3);
    c.fill();
    c.fillStyle = '#2b1b10';
    c.beginPath();
    c.arc(90, 72, pos(25), Math.PI, 0);
    c.fill();
    c.globalAlpha = 1;
  }
  // Glints across the glass.
  c.strokeStyle = 'rgba(255,255,255,0.65)';
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(24, 180);
  c.lineTo(84, 40);
  c.moveTo(44, 340);
  c.lineTo(120, 170);
  c.stroke();
}
function fittingCorner(g: THREE.Group, out: Built) {
  // A pale rug, the stand, the back screen with the mirror on it.
  part(g, cyl(0.96, 0.96, 0.01, 30), '#ead8d0', 0.05, 0.005, 0, NO);
  part(g, cyl(0.42, 0.44, 0.1, 26), WALNUT, FC.client[0], 0.05, FC.client[2]);
  part(g, cyl(0.39, 0.39, 0.006, 26), '#d7c9b6', FC.client[0], 0.103, FC.client[2], NO);
  part(g, box(1.96, 2.2, 0.05), IVORY, 0, 1.1, -0.95, NO);
  const mz = -0.92;
  part(g, rbox(0.92, 2, 0.05, 0.02), BRASS, -0.42, 1.04, mz);
  const glass = liveScreen(g, 0.84, 1.92, 180, 380, -0.42, 1.04, mz + 0.03);
  // A wing of mirror at the side, angled in.
  const wing = group(g, -0.9, 0, -0.94, 0.9);
  part(wing, rbox(0.42, 1.9, 0.04, 0.02), BRASS, 0.21, 0.98, 0.0);
  const wingG = liveScreen(wing, 0.36, 1.82, 90, 380, 0.21, 0.98, 0.026);
  // Client's things on a small stool and hook, a tray of pins, a pin cushion; a lit lamp.
  part(g, cyl(0.15, 0.15, 0.04, 16), '#a88a6f', 0.78, 0.44, 0.62);
  part(g, cyl(0.016, 0.02, 0.42, 8), IRON, 0.78, 0.21, 0.62, NO);
  part(g, cyl(0.16, 0.17, 0.012, 16), IRON, 0.78, 0.006, 0.62, NO);
  part(g, rbox(0.24, 0.01, 0.16, 0.004), IVORY, 0.78, 0.468, 0.62, NO);
  rod(g, v3(0.86, 0, -0.75), v3(0.86, 1.92, -0.75), 0.016, IRON);
  ownLit(g, ball(0.09), '#fff3c4', 0.86, 1.95, -0.75);
  part(g, cyl(0.2, 0.2, 0.012, 14), IRON, 0.86, 0.006, -0.75, NO);
  rod(g, v3(0.5, 1.72, -0.92), v3(0.72, 1.72, -0.92), 0.01, IRON);
  label(g, `${LABEL} · 가봉실`, 0.5, 0.14, 0.44, 1.92, -0.922, '#7a3a4c', IVORY);
  // A cushion on the dweller's wrist as they work, chalk and the pin; the tape and clipboard.
  const cushion = group(g);
  part(cushion, cyl(0.034, 0.038, 0.02, 12), '#c2385b', 0, 0, 0, NO);
  part(cushion, ball(0.03), '#c2385b', 0, 0.012, 0, NO);
  const pin = pinTool(g);
  const chalk = chalkTool(g);
  const tape = tapeTool(g, 'fdTape', [-0.2, 0, 0], [0.2, 0, 0]);
  const tapeArm = tapeTool(g, 'fdTapeArm', [-0.065, 0.195, -0.05], [0.065, -0.195, 0.05]);
  const clip = clipTool(g);
  // The basted jacket goes with the client, but apart from the figure's own parts (those give way to a body).
  const jacket = group(g, FC.client[0], FC.client[1], FC.client[2]);
  part(jacket, rbox(0.45, 0.11, 0.23, 0.05), MUSLIN, 0, 1.33, 0);
  part(jacket, rbox(0.4, 0.42, 0.235, 0.06), MUSLIN, 0, 1.08, 0);
  const SL: ReadonlyArray<readonly [THREE.Vector3, THREE.Vector3]> = [
    [v3(0.2, 1.33, 0), v3(0.33, 0.96, 0.09)],
    [v3(-0.2, 1.33, 0), v3(-0.33, 0.96, 0.09)],
  ];
  for (const [a, b] of SL) {
    rod(jacket, a, b, 0.052, MUSLIN);
    part(jacket, ball(0.06), MUSLIN, a.x, a.y, a.z);
  }
  part(jacket, box(0.42, 0.004, 0.24), '#6b5a44', 0, 1.27, 0, NO);
  const cuff = part(jacket, cyl(0.056, 0.056, 0.006, 10), CHALK, 0.33, 0.98, 0.09, NO);
  const pinBalls = FC.pins.map((p) => part(jacket, ball(0.007), '#d9445c', p[0] - FC.client[0], p[1] - FC.client[1], p[2] - FC.client[2], NO));
  jacket.visible = false;
  const looks: Array<[string, string, string, 'female' | 'male']> = [['#7a8ca0', '#3e4a50', '#2b1b10', 'female'], ['#9c7a5a', '#37474f', '#1a1a1a', 'male'], ['#a06a7a', '#2f3a40', '#5b3a1e', 'female']];
  let seed = -1;
  const client = lazy(() => {
    const L = looks[wrap(seed, looks.length)];
    const F = person(g, L[0], L[1], L[2], FC.client[0], FC.client[2], 0, L[3], undefined, seed + 40);
    F.root.position.y = FC.client[1];
    return F;
  });
  const spots: Record<string, Spot> = { fdFitMeasure: standAt(g, 'fdFitMeasure', FC.stand[0], FC.stand[1]), fdFitPin: standAt(g, 'fdFitPin', FC.stand[0], FC.stand[1]) };
  const aL = new THREE.Vector3();
  const aR = new THREE.Vector3();
  let wrote = -1;
  drive(g, out, spots, { pin: pin.held, chalk: chalk.held, tape: tape.held, tapeArm: tapeArm.held, clip: clip.held }, (_now, N) => {
    if (seed < 0) {
      seed = seedOf(g);
      wingG.draw('w', (c) => paintMirror(c, 0));
    }
    const n = N?.n ?? {};
    const here = !!N;
    if (here) {
      const F = client.get();
      F.root.visible = true;
      const yaw = n.clientYaw ?? 0;
      F.root.rotation.y = yaw;
      jacket.rotation.y = yaw;
      jacket.visible = true;
      const s = Math.sin(yaw);
      const k = Math.cos(yaw);
      // The arms a little out, in the jacket's sleeves.
      aL.set(FC.client[0] + 0.33 * k + 0.1 * s, FC.client[1] + 0.93, FC.client[2] - 0.33 * s + 0.1 * k);
      aR.set(FC.client[0] - 0.33 * k + 0.1 * s, FC.client[1] + 0.93, FC.client[2] + 0.33 * s + 0.1 * k);
      F.armL(aL);
      F.armR(aR);
      nodHead(F, (n.nodC ?? 0) > 0.5 ? 0.2 : 0.02);
    } else {
      client.hide();
      jacket.visible = false;
    }
    const pinsIn = Math.floor(n.pins ?? 0);
    pinBalls.forEach((b, i) => (b.visible = i < pinsIn));
    cuff.visible = (n.cuff ?? 0) > 0.5;
    const m = n.mirror ?? 0;
    glass.draw(`${here ? 1 : 0}|${q(m, 6)}`, (c) => paintMirror(c, here ? 0.3 + m : 0));
    at(cushion, N?.props.cushion ?? null, [0.78, 0.49, 0.62]);
    at(pin.root, N?.props.pin ?? null, [0.78, 0.5, 0.66]);
    pin.root.visible = N?.tool === 'pin';
    at(chalk.root, N?.props.chalk ?? null, [0.72, 0.49, 0.58]);
    at(tape.root, N?.tool === 'tape' ? N.props.tape : null);
    at(tapeArm.root, N?.tool === 'tapeArm' ? N.props.tapeArm : null);
    at(clip.root, N?.tool === 'clip' ? N.props.clip : null);
    const w = q(n.wrote, 2);
    if (clip.root.visible && w !== wrote) {
      wrote = w;
      clip.page.draw(`${w}`, (c) => paintClip(c, '가봉 기록', (n.wrote ?? 0) * 2.4));
    }
  });
  out.work = marker(g, FC.shoulderL[0], FC.shoulderL[1], -0.05);
}

// =============================================================================================
// 쇼 레일 (fdShowRail, 3 × 1): the season's finished looks on a brass rail, each with its tag; a card of notes.

const LOOKS: ReadonlyArray<{ top: string; bot: string; kind: 'dress' | 'coat' | 'suit' | 'gown' | 'set'; tag: string }> = [
  { top: '#27496d', bot: '#27496d', kind: 'coat', tag: '01' },
  { top: '#efe7d8', bot: '#2f3a40', kind: 'set', tag: '02' },
  { top: '#8e3b46', bot: '#8e3b46', kind: 'gown', tag: '03' },
  { top: '#3f6b4f', bot: '#3f6b4f', kind: 'suit', tag: '04' },
  { top: '#c9a13b', bot: '#5b4b8a', kind: 'dress', tag: '05' },
];
/** A look on a hanger, its top at the rail, its front +z. */
function hungLook(g: THREE.Object3D, L: (typeof LOOKS)[number], x: number): { root: THREE.Group; tag: THREE.Mesh } {
  const root = group(g, x, SR.rail, 0);
  rod(root, v3(0, 0, 0), v3(0, -0.05, 0), 0.004, STEEL);
  rod(root, v3(-0.17, -0.09, 0), v3(0, -0.05, 0), 0.006, OAK);
  rod(root, v3(0.17, -0.09, 0), v3(0, -0.05, 0), 0.006, OAK);
  part(root, rbox(0.36, 0.48, 0.12, 0.05), L.top, 0, -0.34, 0);
  for (const sx of [-1, 1]) part(root, rbox(0.075, 0.48, 0.09, 0.03), L.top, sx * 0.205, -0.35, 0);
  if (L.kind === 'coat') {
    part(root, rbox(0.38, 0.5, 0.13, 0.05), L.top, 0, -0.76, 0);
    part(root, box(0.012, 0.86, 0.004), shadeOf(L.top), 0, -0.52, 0.066, NO);
    for (let i = 0; i < 3; i++) part(root, ball(0.012), BRASS, 0.03, -0.26 - i * 0.14, 0.07, NO);
  } else if (L.kind === 'suit') {
    part(root, box(0.1, 0.32, 0.005), shadeOf(L.top), -0.08, -0.26, 0.064, NO);
    part(root, box(0.1, 0.32, 0.005), shadeOf(L.top), 0.08, -0.26, 0.064, NO);
    for (const sx of [-1, 1]) part(root, rbox(0.15, 0.6, 0.1, 0.03), L.bot, sx * 0.09, -0.86, 0);
  } else if (L.kind === 'gown') {
    part(root, lathePart('fdGown'), L.bot, 0, -1.18, 0).scale.set(1, 1, 0.65);
  } else if (L.kind === 'set') {
    part(root, rbox(0.34, 0.5, 0.13, 0.04), L.bot, 0, -0.82, 0);
    part(root, box(0.26, 0.03, 0.135), BRASS, 0, -0.58, 0, NO);
  } else {
    part(root, lathePart('fdDress'), L.bot, 0, -0.98, 0).scale.set(1, 1, 0.7);
  }
  const tagTex = painted(`fdTag${L.tag}`, 60, 90, (c) => {
    c.fillStyle = IVORY;
    c.fillRect(0, 0, 60, 90);
    text(c, LABEL, 30, 28, 22, '#7a3a4c', 'center');
    text(c, L.tag, 30, 64, 18, INK, 'center');
  });
  const tag = picture(root, tagTex, 0.05, 0.075, 0.12, -0.25, 0.085);
  return { root, tag };
}
const shadeOf = (c: string) => '#' + new THREE.Color(c).multiplyScalar(0.72).getHexString();
function lathePart(key: string): THREE.BufferGeometry {
  return key === 'fdGown' ? lathe(key, [[0.001, 0], [0.32, 0], [0.24, 0.3], [0.16, 0.65], [0.15, 0.68], [0.001, 0.68]]) : lathe(key, [[0.001, 0], [0.24, 0], [0.18, 0.22], [0.15, 0.4], [0.001, 0.4]]);
}
function showRail(g: THREE.Group, out: Built) {
  for (const sx of [-1, 1]) {
    part(g, cyl(0.02, 0.02, SR.rail, 10), BRASS, sx * 1.42, SR.rail / 2, 0, NO);
    part(g, rbox(0.1, 0.03, 0.5, 0.01), IRON, sx * 1.42, 0.015, 0, NO);
  }
  rod(g, v3(-1.42, SR.rail, 0), v3(1.42, SR.rail, 0), 0.016, BRASS);
  part(g, box(2.9, 0.02, 0.5), WALNUT, 0, 0.1, 0, NO);
  // A row of shoes under the looks, a season's card on the end.
  for (let i = 0; i < 5; i++) part(g, rbox(0.1, 0.06, 0.22, 0.02), i % 2 ? '#3a3a3a' : '#7b5a3a', SR.xs[i], 0.14, 0.1);
  const plate = painted('fdRailSign', 260, 70, (c) => {
    c.fillStyle = '#7a3a4c';
    c.fillRect(0, 0, 260, 70);
    text(c, `${LABEL} 이번 시즌`, 130, 36, 28, IVORY, 'center');
  });
  picture(g, plate, 0.72, 0.19, 0, SR.rail + 0.2, 0.0);
  part(g, box(0.76, 0.23, 0.012), BRASS, 0, SR.rail + 0.2, -0.008, NO);
  const looks = SR.xs.map((x, i) => hungLook(g, LOOKS[i], x));
  const roller = rollerTool(g);
  const clip = clipTool(g);
  // A little table for the roller by the middle; the fluff a roller takes off.
  rod(g, v3(0.24, 0.1, 0.27), v3(0.24, 0.9, 0.27), 0.01, IRON);
  part(g, cyl(0.09, 0.09, 0.012, 12), OAK, 0.24, 0.905, 0.27, NO);
  const fluff = [0, 1, 2, 3, 4].map((i) => part(g, ball(0.007), '#f7f7ee', -0.08 + i * 0.04, 1.32 - (i * 0.09), 0.08, NO));
  // The show's line-up is checked look by look the same way (2026-11-05, the layout audit: the show is at the venue, not here).
  const look = standAt(g, 'fdLook', 0, SR.stand);
  const spots: Record<string, Spot> = { fdCheckLook: look, fdShowLineup: look };
  let wrote = -1;
  drive(g, out, spots, { roller: roller.held, clip: clip.held }, (_now, N) => {
    const n = N?.n ?? {};
    looks[2].root.position.z = 0.05 * clamp01(n.out);
    looks[2].tag.rotation.y = -0.9 * clamp01(n.tag);
    fluff.forEach((f, i) => (f.visible = !!N && (n.rolled ?? 0) < (i + 1) / 5));
    at(roller.root, N?.props.roller ?? null, [0.24, 0.98, 0.27]);
    at(clip.root, N?.tool === 'clip' ? N.props.clip : null);
    const w = q(n.carded, 2);
    if (clip.root.visible && w !== wrote) {
      wrote = w;
      clip.page.draw(`${w}`, (c) => paintClip(c, '룩 03 확인', (n.carded ?? 0) * 3.6));
    }
  });
  out.work = marker(g, 0, 1.2, 0.16);
}

// =============================================================================================
// 런웨이 (runway, 1 × 3): a raised white walk, lights along its edges, the label's wall at its head; models when it's a rehearsal.

function stride(z: number, walking: boolean, back: boolean, t: number, seed: number, x: number) {
  const s = walking ? Math.sin(t * 8 + seed) : 0;
  const sgn = back ? -1 : 1;
  return {
    l: v3(x + 0.09, RW.deck + 0.08 + Math.max(0, s) * 0.05, z + sgn * s * 0.17),
    r: v3(x - 0.09, RW.deck + 0.08 + Math.max(0, -s) * 0.05, z - sgn * s * 0.17),
  };
}
function runway(g: THREE.Group, _W: number, D: number, out: Built) {
  const L = D - 0.08;
  part(g, rbox(0.9, RW.deck - 0.02, L, 0.01), BLACK, 0, (RW.deck - 0.02) / 2, 0);
  part(g, box(0.84, 0.01, L - 0.04), '#f7f5f0', 0, RW.deck - 0.005, 0, NO);
  const bulbs: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 9; i++) bulbs.push(ownLit(g, ball(0.016), '#b9b09a', sx * 0.43, RW.deck + 0.004, -L / 2 + 0.16 + (i * (L - 0.32)) / 8));
  }
  // The wall at the head: the label's name, a doorway with a curtain behind which they come.
  const wallZ = -L / 2 + 0.05;
  part(g, rbox(1.3, 2.4, 0.1, 0.01), '#2b2b30', 0, 1.2, wallZ);
  const sign = painted('fdWall', 280, 80, (c) => {
    c.fillStyle = '#2b2b30';
    c.fillRect(0, 0, 280, 80);
    text(c, `${LABEL}  ATELIER`, 140, 42, 36, '#e7d7b5', 'center');
  });
  picture(g, sign, 1.16, 0.33, 0, 2.2, wallZ + 0.056);
  part(g, box(0.72, 1.92, 0.012), '#5b1f33', 0, 0.96 + RW.deck - 0.01, wallZ + 0.058, NO);
  for (let i = 0; i < 6; i++) part(g, box(0.012, 1.9, 0.016), '#451727', -0.3 + i * 0.12, 0.96 + RW.deck - 0.01, wallZ + 0.062, NO);
  // A small audience stand with show notes, by the foot.
  const clip = clipTool(g);
  const looks: Array<[string, string, string, 'female' | 'male']> = [['#8e3b46', '#8e3b46', '#1a1a1a', 'female'], ['#27496d', '#27496d', '#2b1b10', 'male']];
  const stride1 = { z: -9, walking: false, back: false, t: 0 };
  const stride2 = { z: -9, walking: false, back: false, t: 0 };
  let seed = -1;
  const m1 = lazy(() => person(g, looks[0][0], looks[0][1], looks[0][2], -0.14, -9, 0, 'female', undefined, seed + 60, { legs: () => stride(stride1.z, stride1.walking, stride1.back, stride1.t, 0, -0.14) }));
  const m2 = lazy(() => person(g, looks[1][0], looks[1][1], looks[1][2], 0.14, -9, 0, 'male', undefined, seed + 61, { legs: () => stride(stride2.z, stride2.walking, stride2.back, stride2.t, 1.3, 0.14) }));
  const spots: Record<string, Spot> = { walkRunway: spot(g, 'stand', 0, RW.deck, RW.foot, Math.PI), runShow: standAt(g, 'fdShow', 0, RW.floorZ), fashionDesigner_collectionMeeting: standAt(g, 'fdCollection', 0, RW.floorZ) };
  spots.walkRunway.motion = 'fdWalk';
  const place = (m: ReturnType<typeof lazy>, S: typeof stride1, z: number | undefined, walking: number | undefined, back: number | undefined, t: number) => {
    if (z === undefined || z < -3) {
      m.hide();
      return;
    }
    const F = m.get();
    F.root.visible = true;
    F.root.position.set(F.root.position.x, RW.deck, z);
    const isBack = (back ?? 0) > 0.5;
    F.root.rotation.y = isBack ? Math.PI : 0;
    S.z = z;
    S.walking = (walking ?? 0) > 0.5;
    S.back = isBack;
    S.t = t;
  };
  let wrote = -1;
  drive(g, out, spots, { clip: clip.held }, (_now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const on = (n.lights ?? 0) > 0.5;
    bulbs.forEach((b, i) => setLit(b, on ? ((Math.floor(t * 2) + i) % 3 === 0 ? '#ffffff' : '#fff0c0') : '#b9b09a'));
    place(m1, stride1, n.m1z, n.m1walk, n.m1back, t);
    place(m2, stride2, n.m2z, n.m2walk, n.m2back, t);
    at(clip.root, N?.tool === 'clip' ? N.props.clip : null);
    const w = q(n.ticks, 2);
    if (clip.root.visible && w !== wrote) {
      wrote = w;
      clip.page.draw(`${w}`, (c) => paintClip(c, (n.meeting ?? 0) > 0.5 ? '컬렉션 방향' : '리허설 큐시트', n.ticks ?? 0));
    }
  });
  out.work = marker(g, 0, RW.deck + 1, 0);
}

// =============================================================================================
// 간판 (fdLabelSign, 1 × 1): the label's standing sign in the corridor, this season's lookbook on a stand.

function labelSign(g: THREE.Group) {
  part(g, rbox(0.72, 0.03, 0.34, 0.01), IRON, 0, 0.015, 0, NO);
  part(g, rbox(0.66, 1.4, 0.05, 0.012), '#7a3a4c', 0, 0.74, -0.04);
  const tex = painted('fdLabelSign', 200, 400, (c) => {
    c.fillStyle = '#7a3a4c';
    c.fillRect(0, 0, 200, 400);
    text(c, LABEL, 100, 110, 120, IVORY, 'center');
    c.fillStyle = BRASS;
    c.fillRect(50, 190, 100, 3);
    text(c, '결 아틀리에', 100, 228, 22, IVORY, 'center');
    text(c, '맞춤 · 가봉 · 컬렉션', 100, 268, 15, '#e7d7b5', 'center', false);
    text(c, '상담은 안쪽으로', 100, 350, 15, '#e7d7b5', 'center', false);
  });
  picture(g, tex, 0.6, 1.3, 0, 0.74, -0.012);
  rod(g, v3(0.24, 0.03, 0.08), v3(0.24, 0.72, 0.1), 0.01, BRASS);
  part(g, box(0.2, 0.27, 0.012), '#fbf8ef', 0.24, 0.82, 0.1, { rx: -0.5 });
  part(g, box(0.16, 0.2, 0.002), '#8e3b46', 0.24, 0.83, 0.108, { rx: -0.5, outline: false });
}

// =============================================================================================

export const BUILDERS: Record<string, Builder> = {
  sewingMachine(g, _W, _D, _c, _def, _ctx, out) {
    sewingMachine(g, out);
  },
  fdMateMachine(g, _W, _D, _c, _def, _ctx, out) {
    mateMachine(g, out);
  },
  fabricTable(g, _W, _D, _c, _def, _ctx, out) {
    fabricTable(g, out);
  },
  fdDrawingTable(g, _W, _D, _c, _def, _ctx, out) {
    drawingTable(g, out);
  },
  fdDressForm(g, _W, _D, _c, _def, _ctx, out) {
    dressForm(g, out);
  },
  fdSteamPress(g, _W, _D, _c, _def, _ctx, out) {
    steamPress(g, out);
  },
  fdFabricRack(g, _W, _D, _c, _def, _ctx, out) {
    fabricRack(g, out);
  },
  fdFittingCorner(g, _W, _D, _c, _def, _ctx, out) {
    fittingCorner(g, out);
  },
  fdShowRail(g, _W, _D, _c, _def, _ctx, out) {
    showRail(g, out);
  },
  runway(g, W, D, _c, _def, _ctx, out) {
    runway(g, W, D, out);
  },
  fdLabelSign(g) {
    labelSign(g);
  },
  /** The atelier's street front (2026-11-05, the layout audit; shopFront.ts): the glass of the showroom with its name over it. */
  fdShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 14, door: 12, name: '아틀리에 은채', sub: 'COUTURE · MADE TO MEASURE', bg: '#4a1a2c', fg: '#f5e6c8', awning: '#7a3a4c', frame: '#2b2b2b', posters: [['맞춤 정장·드레스', '#f5e6c8', '#4a1a2c', 6.5], ['26 F/W 컬렉션', '#ffffff', '#7a3a4c', 9.5]] });
  },
};
