import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { CA, CD, DC, DG, IN, LG, MD, SC, XR, carouselAt, cuNow, cuPhase, frac } from './customsOfficerMotion';
import type { CuMotion, CuNow } from './customsOfficerMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 공항 세관 drawn as itself (2026-11-01 workplace pipeline, at the user's request), the arrivals hall of a made-up airport,
 * 별무리공항. Doors from the baggage hall under a gantry of green and red lanes; a carousel with bags going round; X-ray
 * machines whose screen shows the very bag on the belt; steel tables where a case is opened with its owner watching; a
 * beagle working along a bench of bags; a cage of what's been held back (far too much fruit, handbags with no name); desks
 * where declarations are stamped; a wall of cameras; and a counter where duty is worked out and paid.
 *
 * Nothing worse than a wooden duck, an apple or a crate of handbags is ever found. All names are made up. Everything that
 * moves follows customsOfficerMotion.ts. The whiteboard and archive shelf are shared with other workplaces and stay.
 */

const AIRPORT = '별무리공항';
const NAVY = '#1f2d5c';
const NAVY_D = '#141d3f';
const GREEN = '#2e9e4f';
const GREEN_D = '#1b5e20';
const RED = '#d6403a';
const RED_D = '#8e1f1b';
const AMBER = '#f2b632';
const CREAM = '#f6f3ea';
const PAPER = '#fbfaf6';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GREY_L = '#d5dbdf';
const RUBBER = '#2f3338';
const KRAFT = '#c79a6b';
const WOOD = '#b98a57';
const SKIN = '#f1c9a5';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const CASES = ['#c94f3d', '#3f6fb5', '#2f8f7a', '#e0a93c', '#6b5b95', '#39424e', '#d77fa1', '#7a8b52'];
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);

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
function glass(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, opacity = 0.2): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#cfe8f5', transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
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
function standAt(g: THREE.Object3D, motion: CuMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: CuMotion, seat: V): Spot {
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
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: CuNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? cuNow(sp.motion as CuMotion, t, cuPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
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
/** A wire wall: see-through, only the mesh drawn. */
function wire(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const tex = painted('cuWire', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = '#59646d';
    c.lineWidth = 3;
    for (let i = 0; i <= 128; i += 16) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 128);
      c.moveTo(0, i);
      c.lineTo(128, i);
      c.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 3, uv.getY(i) * h * 3);
  const m = new THREE.Mesh(geo, mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
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
  part(c, box(0.04, 0.2, 0.03), BLACK, 0, T + 0.08, 0.23, { outline: false });
}
function clipboard(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  const inner = group(b);
  inner.rotation.x = -0.9;
  part(inner, box(0.2, 0.28, 0.008), '#8a6242', 0, 0, 0);
  part(inner, box(0.17, 0.23, 0.002), PAPER, 0, -0.015, 0.006, { outline: false });
  part(inner, box(0.07, 0.02, 0.012), CHROME, 0, 0.125, 0.008, { outline: false });
  for (let i = 0; i < 5; i++) part(inner, box(0.13, 0.004, 0.001), GREY_D, 0, 0.06 - i * 0.04, 0.0075, { outline: false });
  return b;
}
function torchMesh(g: THREE.Object3D): { root: THREE.Group; beam: THREE.Mesh } {
  const root = group(g);
  part(root, cyl(0.022, 0.018, 0.17, 10), BLACK, 0, 0, 0, { rx: Math.PI / 2 - 0.5 });
  const mat = new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: 0.32, depthWrite: false });
  const beam = new THREE.Mesh(cyl(0.11, 0.024, 0.6, 12), mat);
  beam.userData.ownMaterial = true;
  beam.position.set(0, -0.15, -0.28);
  beam.rotation.x = Math.PI / 2 - 0.5;
  root.add(beam);
  return { root, beam };
}
function radioMesh(g: THREE.Object3D): THREE.Group {
  const r = group(g);
  part(r, rbox(0.055, 0.12, 0.03, 0.01), BLACK, 0, 0, 0);
  part(r, cyl(0.004, 0.004, 0.08, 6), BLACK, 0.016, 0.1, 0, { outline: false });
  ownLit(r, box(0.012, 0.012, 0.002), GREEN, -0.012, 0.045, 0.016);
  return r;
}
function stampMesh(g: THREE.Object3D, color = RED_D): THREE.Group {
  const s = group(g);
  part(s, rbox(0.07, 0.02, 0.05, 0.006), BLACK, 0, 0.012, 0);
  part(s, cyl(0.012, 0.016, 0.05, 8), color, 0, 0.045, 0, { outline: false });
  part(s, ball(0.02), color, 0, 0.078, 0, { outline: false });
  return s;
}
/** An upright suitcase, its origin on the floor at its middle. */
function suitcase(g: THREE.Object3D, color: string, w = 0.36, h = 0.54, d = 0.2, handle = true): THREE.Group {
  const b = group(g);
  part(b, rbox(w, h, d, 0.03), color, 0, h / 2 + 0.03, 0);
  for (let i = 0; i < 3; i++) part(b, box(0.012, h - 0.08, 0.004), shade(color, 0.8), -w * 0.28 + i * w * 0.28, h / 2 + 0.03, d / 2 + 0.002, { outline: false });
  part(b, rbox(w * 0.34, 0.02, 0.03, 0.008), BLACK, 0, h + 0.04, 0, { outline: false });
  for (const sx of [-1, 1]) part(b, cyl(0.02, 0.02, 0.025, 8), BLACK, sx * (w / 2 - 0.04), 0.02, -d / 2 + 0.02, { rz: Math.PI / 2, outline: false });
  if (handle) for (const sx of [-1, 1]) rod(b, v3(sx * 0.05, h + 0.02, -d / 2 + 0.01), v3(sx * 0.05, h + 0.2, -d / 2 + 0.01), 0.006, CHROME);
  return b;
}
/** A soft bag lying down: duffel. */
function softBag(g: THREE.Object3D, color: string): THREE.Group {
  const b = group(g);
  part(b, rbox(0.42, 0.2, 0.22, 0.09), color, 0, 0.1, 0);
  for (const sx of [-1, 1]) part(b, cyl(0.1, 0.1, 0.01, 12), shade(color, 0.8), sx * 0.21, 0.1, 0, { rz: Math.PI / 2, outline: false });
  rod(b, v3(-0.1, 0.2, 0), v3(0, 0.27, 0), 0.008, shade(color, 0.7));
  rod(b, v3(0.1, 0.2, 0), v3(0, 0.27, 0), 0.008, shade(color, 0.7));
  return b;
}
/** A handbag with no name on it: the whole point. */
function handbag(g: THREE.Object3D, color: string): THREE.Group {
  const b = group(g);
  part(b, rbox(0.26, 0.17, 0.09, 0.03), color, 0, 0.085, 0);
  part(b, box(0.22, 0.05, 0.002), shade(color, 0.85), 0, 0.14, 0.046, { outline: false });
  part(b, box(0.03, 0.02, 0.004), AMBER, 0, 0.115, 0.047, { outline: false });
  for (const sx of [-1, 1]) rod(b, v3(sx * 0.07, 0.17, 0), v3(sx * 0.02, 0.25, 0), 0.005, shade(color, 0.7));
  rod(b, v3(-0.02, 0.25, 0), v3(0.02, 0.25, 0), 0.005, shade(color, 0.7));
  return b;
}
/** A box of fruit, slatted, with its label; origin on the floor. */
function fruitBox(g: THREE.Object3D, x: number, y: number, z: number, fruit = '#d84a3a', w = 0.44, d = 0.3): THREE.Group {
  const b = group(g, x, y, z);
  const h = 0.2;
  part(b, box(w, h, d), KRAFT, 0, h / 2, 0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) part(b, ball(0.046), fruit, -w * 0.36 + i * w * 0.24, h + 0.012, -d * 0.3 + j * d * 0.3, { outline: false });
  part(b, box(0.16, 0.08, 0.002), PAPER, 0, h * 0.55, d / 2 + 0.001, { outline: false });
  part(b, box(0.1, 0.012, 0.001), fruit, 0, h * 0.6, d / 2 + 0.0025, { outline: false });
  return b;
}
function carton(g: THREE.Object3D, w = 0.5, h = 0.32, d = 0.38): { root: THREE.Group; flaps: THREE.Mesh[]; tape: THREE.Mesh } {
  const root = group(g);
  part(root, box(w, h, d), KRAFT, 0, h / 2, 0);
  part(root, box(0.16, 0.08, 0.002), PAPER, -w * 0.2, h * 0.55, d / 2 + 0.001, { outline: false });
  const flaps = [-1, 1].map((sx) => part(root, box(w / 2, 0.006, d), shade(KRAFT, 0.94), sx * (w / 4), h + 0.002, 0, { outline: false }));
  const tape = part(root, box(w + 0.004, 0.003, 0.05), '#e7cfa8', 0, h + 0.007, 0, { outline: false });
  return { root, flaps, tape };
}
function woodenDuck(g: THREE.Object3D): THREE.Group {
  const d = group(g);
  part(d, ball(0.075), WOOD, 0, 0.07, 0);
  part(d, ball(0.044), shade(WOOD, 1.08), 0.02, 0.17, 0.05);
  part(d, rbox(0.05, 0.016, 0.06, 0.006), AMBER, 0.02, 0.165, 0.11, { outline: false });
  for (const sx of [-1, 1]) part(d, ball(0.007), BLACK, 0.02 + sx * 0.028, 0.183, 0.082, { outline: false });
  part(d, rbox(0.1, 0.01, 0.13, 0.005), GREEN_D, 0, 0.012, 0, { outline: false });
  return d;
}
function cone(g: THREE.Object3D, x: number, z: number) {
  part(g, box(0.2, 0.02, 0.2), '#e65100', x, 0.012, z, { outline: false });
  part(g, cyl(0.022, 0.08, 0.28, 12), '#ef6c00', x, 0.16, z);
  part(g, cyl(0.05, 0.062, 0.05, 12), '#ffffff', x, 0.18, z, { outline: false });
}
function stanchion(g: THREE.Object3D, x: number, z: number) {
  part(g, cyl(0.1, 0.11, 0.02, 14), GREY_D, x, 0.01, z);
  part(g, cyl(0.016, 0.018, 0.86, 8), CHROME, x, 0.44, z, { outline: false });
  part(g, ball(0.024), CHROME, x, 0.88, z, { outline: false });
}
const emblem = () =>
  painted('cuEmblem', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = NAVY;
    c.beginPath();
    c.arc(64, 64, 60, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = AMBER;
    c.lineWidth = 5;
    c.stroke();
    text(c, '세관', 64, 64, 40, '#ffffff', 'center');
  });

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const LOOKS: Record<string, Look> = {
  a: { top: '#e57373', bottom: '#37474f', hair: '#2b1b10' },
  b: { top: '#7cb342', bottom: '#455a64', hair: '#1a1a1a', skin: '#f8d9c0' },
  c: { top: '#8d6e63', bottom: '#3e2723', hair: '#b0b0b0', skin: '#eac09a' },
  d: { top: '#42a5f5', bottom: '#263238', hair: '#5b3a1e' },
  e: { top: '#ffb74d', bottom: '#5d4037', hair: '#3a2a20', skin: '#f8d9c0' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender?: 'female' | 'male'): Fig {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, skin);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
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
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
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
function comes(f: Fig, there: number, x: number, z: number, dz: number, t: number) {
  f.root.visible = there > 0.02;
  if (!f.root.visible) return;
  const off = 1 - THREE.MathUtils.clamp(there, 0, 1);
  f.root.position.set(x, off > 0.01 ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z + dz * off);
}

// =============================================================================================
// 수하물 엑스레이 (baggageXray, 2 × 1): a tunnel with lead curtains over a running belt, the picture on a screen before you.

const X_KINDS = ['평범한 짐', '카메라와 양말', '나무 오리?', '과일 상자', '헤어드라이어'];
/** The picture: the bag `pos` of the way along, enlarged by `zoom`, with `mark` round what's odd. */
function paintXray(c: Ctx2, kind: number, pos01: number, zoom: number, mark: number, w: number, h: number) {
  c.fillStyle = '#e9eff3';
  c.fillRect(0, 0, w, h);
  c.fillStyle = NAVY_D;
  c.fillRect(0, 0, w, 20);
  text(c, '수하물 판독', 8, 11, 12, '#ffffff');
  text(c, `판독 ${String(1200 + wrap(kind, 5) * 37)}`, w - 8, 11, 11, AMBER, 'right');
  // The bag slides across and stops in the middle.
  const s = 1 + 0.8 * zoom;
  const along = pos01 <= XR.stop ? pos01 / XR.stop : 1 + (pos01 - XR.stop) / (1 - XR.stop);
  const cx = w * (1.15 - 0.65 * along);
  const cy = (h + 20) / 2;
  c.save();
  c.beginPath();
  c.rect(0, 20, w, h - 20);
  c.clip();
  c.translate(cx, cy);
  c.scale(s, s);
  const orange = '#e38a2e';
  const blue = '#3a6fd0';
  const green = '#3fa15c';
  c.fillStyle = 'rgba(226,150,70,0.22)';
  c.strokeStyle = orange;
  c.lineWidth = 3;
  c.fillRect(-70, -44, 140, 88);
  c.strokeRect(-70, -44, 140, 88);
  c.fillStyle = blue;
  c.fillRect(-16, -54, 32, 10);
  const blob = (x: number, y: number, r: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, pos(r), 0, Math.PI * 2);
    c.fill();
  };
  const rect = (x: number, y: number, a: number, b: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, a, b);
  };
  switch (wrap(kind, 5)) {
    case 0:
      rect(-60, -30, 44, 22, orange);
      rect(-60, 4, 44, 22, orange);
      rect(-4, -32, 60, 40, green);
      rect(10, 14, 40, 16, blue);
      break;
    case 1:
      rect(-54, -26, 40, 28, blue);
      blob(-34, -12, 10, '#1d3f88');
      for (let i = 0; i < 6; i++) rect(0 + (i % 3) * 22, -30 + Math.floor(i / 3) * 28, 18, 22, orange);
      break;
    case 2:
      // A duck, unmistakable once you know.
      blob(-6, 8, 28, orange);
      blob(20, -18, 15, orange);
      rect(30, -21, 18, 7, green);
      rect(-50, -30, 18, 54, green);
      break;
    case 3:
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) blob(-52 + i * 26, -24 + j * 24, 10, green);
      break;
    default:
      rect(-40, -20, 46, 20, blue);
      rect(-14, 0, 14, 28, blue);
      rect(14, -28, 40, 56, orange);
      break;
  }
  if (mark > 0.02) {
    c.strokeStyle = AMBER;
    c.lineWidth = 3;
    c.setLineDash([6, 4]);
    c.strokeRect(-46, -40, 96, 76);
    c.setLineDash([]);
  }
  c.restore();
  if (mark > 0.5) {
    c.fillStyle = AMBER;
    c.fillRect(8, h - 26, w * 0.46, 20);
    text(c, X_KINDS[wrap(kind, 5)], 14, h - 16, 12, NAVY_D);
  }
  text(c, zoom > 0.5 ? '×1.8' : '×1.0', w - 8, h - 14, 12, NAVY_D, 'right');
}
function baggageXray(g: THREE.Group, out: Built, W: number) {
  const tunnelW = 0.92;
  // The belt's bed, with rollers at each end.
  part(g, box(W - 0.02, 0.5, 0.56), GREY_L, 0, 0.3, XR.z);
  part(g, box(W - 0.06, 0.06, 0.6), GREY_D, 0, 0.59, XR.z);
  part(g, box(W - 0.02, 0.014, 0.5), RUBBER, 0, XR.beltY - 0.008, XR.z, { outline: false });
  const slats = Array.from({ length: 10 }, () => part(g, box(0.012, 0.003, 0.48), '#4b5157', 0, XR.beltY, XR.z, { outline: false }));
  for (const sx of [-1, 1]) for (const z of [-0.22, 0.2]) part(g, box(0.05, 0.08, 0.05), BLACK, sx * 0.88, 0.04, XR.z + z, { outline: false });
  // The tunnel, its hood curved, a warning stripe and a lit "scanning" sign.
  part(g, rbox(tunnelW, 0.66, 0.72, 0.05), '#e4e8ea', 0, 0.98, XR.z);
  part(g, box(tunnelW + 0.004, 0.04, 0.73), NAVY, 0, 1.2, XR.z, { outline: false });
  for (const sx of [-1, 1]) {
    part(g, box(0.02, 0.4, 0.56), BLACK, sx * (tunnelW / 2 + 0.004), 0.87, XR.z, { outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.008, 0.38, 0.09), '#3a3f45', sx * (tunnelW / 2 + 0.012), 0.86, XR.z - 0.2 + i * 0.1, { outline: false });
  }
  const lamp = ownLit(g, box(0.28, 0.05, 0.02), '#3a4048', 0.28, 1.32, XR.z + 0.32);
  label(g, '수하물 검색기', 0.3, 0.08, 0.3, 1.1, XR.z + 0.363, NAVY, '#ffffff');
  picture(g, emblem(), 0.14, 0.14, 0.3, 0.92, XR.z + 0.363);
  // The operator's console, a shelf before the tunnel.
  part(g, rbox(0.94, 0.04, 0.34, 0.012), GREY_D, -0.32, 0.74, 0.34);
  part(g, box(0.05, 0.72, 0.05), GREY_D, -0.7, 0.36, 0.42);
  part(g, box(0.05, 0.72, 0.05), GREY_D, 0.08, 0.36, 0.42);
  part(g, rbox(0.26, 0.016, 0.12, 0.006), BLACK, XR.keys[0], 0.767, XR.keys[2], { outline: false });
  for (let i = 0; i < 18; i++) part(g, box(0.02, 0.005, 0.02), i % 7 === 3 ? AMBER : '#5c6670', XR.keys[0] - 0.1 + (i % 6) * 0.04, 0.778, XR.keys[2] - 0.035 + Math.floor(i / 6) * 0.035, { outline: false });
  part(g, cyl(0.03, 0.04, 0.012, 12), BLACK, XR.stick[0], 0.766, XR.stick[2], { outline: false });
  part(g, cyl(0.007, 0.007, 0.05, 8), CHROME, XR.stick[0], 0.79, XR.stick[2], { outline: false });
  part(g, ball(0.017), RED, XR.stick[0], 0.82, XR.stick[2], { outline: false });
  part(g, cyl(0.03, 0.034, 0.012, 14), '#c62828', XR.red[0], 0.766, XR.red[2], { outline: false });
  // The screen on its arm: the whole point.
  part(g, box(0.05, 0.3, 0.05), BLACK, XR.screen[0], 0.92, 0.17, { outline: false });
  part(g, rbox(0.58, 0.4, 0.04, 0.012), BLACK, XR.screen[0], XR.screen[1], XR.screen[2] - 0.005);
  const scr = liveScreen(g, 0.54, 0.36, 320, 214, XR.screen[0], XR.screen[1], XR.screen[2] + 0.018);
  chair(g, XR.seat);
  // What's on the belt.
  const bags = [suitcase(g, CASES[0], 0.36, 0.34, 0.24, false), softBag(g, CASES[1]), suitcase(g, CASES[2], 0.38, 0.3, 0.24, false), fruitBox(g, 0, 0, 0, '#e08a2e'), softBag(g, CASES[4])];
  bags.forEach((b) => (b.visible = false));
  const idleBag = softBag(g, CASES[3]);
  idleBag.position.set(XR.from, XR.beltY, XR.z);
  const spots: Record<string, Spot> = { scanBaggage: seatAt(g, 'cuScan', XR.seat) };
  spots['*'] = spots.scanBaggage;
  const show = (_now: string | null, N: CuNow | null) => {
    const n = N?.n ?? {};
    const kind = wrap(N?.b.n ?? 0, 5);
    bags.forEach((b, i) => {
      b.visible = !!N && i === kind;
      if (b.visible) at(b, N?.props.bag);
    });
    idleBag.visible = !N;
    const offset = frac(((n.pos ?? 0) * 1.7 + kind * 0.31) / 0.2);
    slats.forEach((s, i) => (s.position.x = -0.9 + ((i + 1 - offset) % 10) * 0.2));
    setLit(lamp, (n.run ?? 0) > 0.5 ? '#ffb300' : N ? '#7a6a2c' : '#3a4048');
    scr.draw(N ? `${kind}|${q(n.pos, 60)}|${q(n.zoom)}|${q(n.mark, 4)}` : 'idle', (c) => {
      if (!N) {
        c.fillStyle = '#0d2130';
        c.fillRect(0, 0, 320, 214);
        text(c, AIRPORT, 160, 88, 24, '#8fd0f0', 'center');
        text(c, '판독 대기 중', 160, 126, 18, '#ffffff', 'center');
        return;
      }
      paintXray(c, kind, n.pos ?? 0, n.zoom ?? 0, n.mark ?? 0, 320, 214);
    });
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, XR.keys[0], XR.keys[1], XR.keys[2]);
}

// =============================================================================================
// 세관 검사대 (inspectionTable, 2 × 1): a steel roller table, a box of gloves and stickers; a traveller at the far side.

function inspectionTable(g: THREE.Group, out: Built, W: number) {
  const T = IN.top;
  // The table: a steel frame and a top of rollers either side of a flat bed.
  for (const sx of [-1, 1]) for (const z of [-0.36, 0.36]) part(g, box(0.05, T - 0.04, 0.05), GREY, sx * (W / 2 - 0.07), (T - 0.04) / 2, z);
  part(g, box(W - 0.1, 0.03, 0.74), GREY_D, 0, 0.3, 0);
  part(g, rbox(W - 0.02, 0.05, 0.86, 0.012), STEEL, 0, T - 0.025, 0);
  for (let i = 0; i < 6; i++) part(g, cyl(0.016, 0.016, 0.78, 8), CHROME, -0.92 + i * 0.05, T + 0.008, 0, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 6; i++) part(g, cyl(0.016, 0.016, 0.78, 8), CHROME, 0.67 + i * 0.05, T + 0.008, 0, { rx: Math.PI / 2, outline: false });
  // A yellow rule around, a number at the end.
  part(g, box(W, 0.012, 0.012), AMBER, 0, T - 0.03, 0.436, { outline: false });
  label(g, '검사대', 0.36, 0.09, -0.62, T - 0.13, 0.42, NAVY, '#ffffff');
  // Under the top: bins and trays.
  part(g, rbox(0.46, 0.16, 0.36, 0.02), '#39506b', -0.5, 0.41, 0.04);
  part(g, rbox(0.46, 0.14, 0.36, 0.02), '#6d7b85', 0.32, 0.4, 0.04);
  // A box of gloves and a roll of checked stickers by the hand.
  part(g, rbox(0.2, 0.09, 0.1, 0.008), '#7fb3d5', 0.82, T + 0.045, 0.33);
  part(g, cyl(0.04, 0.04, 0.03, 14), '#2e9e4f', 0.58, T + 0.015, 0.34);
  const sign = group(g, -0.86, T, -0.36);
  part(sign, box(0.02, 0.26, 0.02), BLACK, 0, 0.13, 0, { outline: false });
  label(sign, '협조 감사합니다', 0.36, 0.1, 0.1, 0.28, 0.012, CREAM, NAVY);
  label(sign, '협조 감사합니다', 0.36, 0.1, 0.1, 0.28, -0.012, CREAM, NAVY, Math.PI);

  // The case: base and lid, opened on its hinge at the back.
  const caseG = group(g);
  const caseCol = CASES[3];
  part(caseG, rbox(0.62, 0.12, 0.42, 0.024), caseCol, 0, 0.06, 0);
  part(caseG, box(0.56, 0.006, 0.36), '#6f5a78', 0, 0.118, 0, { outline: false });
  for (const sx of [-1, 1]) part(caseG, box(0.04, 0.03, 0.01), CHROME, sx * 0.16, 0.105, 0.212, { outline: false });
  const hinge = group(caseG, 0, 0.12, -0.21);
  part(hinge, rbox(0.62, 0.09, 0.42, 0.024), shade(caseCol, 0.94), 0, 0.045, 0.21);
  part(hinge, box(0.56, 0.004, 0.36), '#6f5a78', 0, -0.001, 0.21, { outline: false });
  for (let i = 0; i < 3; i++) part(hinge, box(0.56, 0.008, 0.012), shade(caseCol, 0.78), 0, 0.09, 0.08 + i * 0.13, { outline: false });
  const stuffing = group(caseG);
  part(stuffing, rbox(0.24, 0.05, 0.3, 0.02), '#90a4ae', -0.14, 0.14, 0, { outline: false });
  part(stuffing, rbox(0.2, 0.04, 0.26, 0.018), '#e8d5b7', 0.15, 0.135, 0.02, { outline: false });
  const sticker = part(caseG, box(0.12, 0.002, 0.08), GREEN, 0.12, 0.215, 0.1, { outline: false });
  const clothes = group(g);
  part(clothes, rbox(0.3, 0.05, 0.24, 0.02), '#5c6bc0', 0, 0.026, 0);
  part(clothes, rbox(0.28, 0.04, 0.22, 0.018), '#ef9a9a', 0, 0.07, 0, { outline: false });
  const duck = woodenDuck(g);
  const traveller = person(g, LOOKS.a, IN.cust[0], IN.cust[1], 0, 'female');

  // The crate that set off the flag.
  const crate = group(g, IN.crate[0], IN.crate[1], IN.crate[2]);
  part(crate, box(0.9, 0.5, 0.54), WOOD, 0, 0.25, 0, { outline: true });
  for (let i = 0; i < 3; i++) part(crate, box(0.91, 0.014, 0.55), shade(WOOD, 0.74), 0, 0.09 + i * 0.16, 0, { outline: false });
  part(crate, box(0.8, 0.012, 0.44), '#3a2a1c', 0, 0.495, 0, { outline: false });
  label(crate, '화물 0412', 0.3, 0.1, -0.2, 0.26, 0.276, CREAM, BLACK);
  const stuff = group(crate);
  const r = seeded(19);
  for (let i = 0; i < 6; i++) {
    const h = handbag(stuff, CASES[i % 8]);
    h.position.set(-0.3 + (i % 3) * 0.3, 0.45 + r() * 0.02, -0.11 + (Math.floor(i / 3) % 2) * 0.22);
    h.rotation.y = (r() - 0.5) * 0.3;
  }
  const lid = group(g);
  part(lid, box(0.92, 0.03, 0.56), shade(WOOD, 1.06), 0, 0, 0);
  for (let i = 0; i < 2; i++) part(lid, box(0.92, 0.006, 0.05), shade(WOOD, 0.8), 0, 0.017, -0.15 + i * 0.3, { outline: false });
  const flagMast = group(g, IN.crate[0] + 0.5, IN.crate[1], IN.crate[2] - 0.18);
  part(flagMast, cyl(0.008, 0.008, 0.46, 6), BLACK, 0, 0.23, 0, { outline: false });
  part(flagMast, box(0.14, 0.09, 0.004), RED, 0.07, 0.42, 0, { outline: false });
  const beacon = ownLit(g, cyl(0.04, 0.05, 0.08, 12), '#8a2020', -0.86, T + 0.04, 0.3);
  const bags2 = [handbag(g, CASES[6]), handbag(g, CASES[1])];
  const bar = group(g);
  part(bar, cyl(0.012, 0.012, 0.46, 8), '#b23b3b', 0, 0.08, 0.02, { outline: false, rx: 0.1 });
  const torch = torchMesh(g);
  const clip = clipboard(g);
  const tally = part(clip, box(0.09, 0.012, 0.002), RED, 0.02, 0.03, 0.03, { outline: false, rx: -0.9 });
  // The carton that's gone through, and what cuts its tape.
  const cart = carton(g);
  const knife = group(g);
  part(knife, box(0.015, 0.02, 0.1), AMBER, 0, 0, 0);
  part(knife, box(0.004, 0.012, 0.04), CHROME, 0, -0.002, -0.066, { outline: false });
  const dig = group(cart.root);
  part(dig, rbox(0.14, 0.05, 0.1, 0.012), '#e8d5b7', -0.08, 0.31, 0, { outline: false });
  part(dig, rbox(0.13, 0.05, 0.09, 0.012), '#7f9c8b', 0.09, 0.31, 0.02, { outline: false });
  const second = carton(g, 0.42, 0.28, 0.36);
  second.root.position.set(-0.44, T, -0.06);

  const spots: Record<string, Spot> = { inspectLuggage: standAt(g, 'cuInspect', -0.18, IN.stand), suspiciousCargo: standAt(g, 'cuCargo', -0.1, IN.stand), customsOfficer_cargoSweep: standAt(g, 'cuSweep', 0.22, IN.stand) };
  spots['*'] = spots.inspectLuggage;
  const show = (now: string | null, N: CuNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const insp = now === 'inspectLuggage';
    const cargo = now === 'suspiciousCargo';
    const sweep = now === 'customsOfficer_cargoSweep';
    at(caseG, insp ? P.case : null);
    hinge.rotation.x = -THREE.MathUtils.clamp(n.lid ?? 0, 0, 1) * 1.85;
    sticker.visible = (n.sticker ?? 0) > 0.5;
    stuffing.visible = (n.lid ?? 0) > 0.1;
    at(clothes, insp ? P.clothes : null);
    at(duck, insp ? P.duck : null);
    if (insp) {
      comes(traveller, n.cust ?? 0, IN.cust[0], IN.cust[1], -0.4, t);
      const lay = n.cLay ?? 0;
      const caseAt = P.case;
      traveller.armR(lay > 0.05 && caseAt ? v3(caseAt[0] + 0.16, caseAt[1] + 0.13, caseAt[2] - 0.15) : null);
      traveller.armL(lay > 0.05 && caseAt ? v3(caseAt[0] - 0.16, caseAt[1] + 0.13, caseAt[2] - 0.15) : (n.ask ?? 0) > 0.5 ? v3(IN.cust[0] - 0.22, 1.25, IN.cust[1] + 0.26) : null);
      const nod = (n.cNod ?? 0) > 0.5 ? 0.18 + 0.14 * Math.sin(t * 7) : 0.12;
      traveller.opts.nod = nod;
      if (traveller.root.visible && traveller.head) traveller.head.rotation.x = nod;
    } else traveller.root.visible = false;
    crate.visible = !!cargo;
    lid.visible = !!cargo;
    flagMast.visible = !!cargo;
    if (cargo) at(lid, P.lid);
    stuff.visible = (n.full ?? 0) > 0.3;
    const flash = n.flash ?? 0;
    setLit(beacon, cargo && flash > 0.05 && Math.sin(t * 9) > 0 ? '#ff3b30' : '#8a2020');
    at(bags2[0], cargo ? P.b1 : null);
    at(bags2[1], cargo ? P.b2 : null);
    at(bar, cargo ? P.bar : null);
    at(torch.root, P.torch);
    torch.beam.visible = !!P.torch && (n.beam ?? 0) > 0.5;
    at(clip, P.clip);
    tally.visible = (n.tally ?? 0) > 0.3 || (n.tick ?? 0) > 0.5;
    // A carton goes through while `sweep` runs.
    at(cart.root, sweep ? P.carton : null);
    const fl = THREE.MathUtils.clamp(n.flaps ?? 0, 0, 1);
    cart.flaps.forEach((f, i) => {
      const sx = i ? 1 : -1;
      f.rotation.z = -sx * fl * 2.2;
      f.position.x = sx * (0.25 - 0.125 * Math.cos(fl * 2.2));
      f.position.y = 0.322 + 0.125 * Math.sin(fl * 2.2);
    });
    cart.tape.visible = (n.tape ?? 1) > 0.4;
    dig.visible = fl > 0.4;
    at(knife, P.knife);
    second.root.visible = !!sweep;
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, -0.1, T + 0.02, 0.1);
}

// =============================================================================================
// 통관 서류 데스크 (customsDesk, 1 × 1): a screen with the declaration on it, trays either side, a stamp and a calculator.

function paintDesk(c: Ctx2, w: number, h: number, mode: number, n: Record<string, number>) {
  c.fillStyle = '#eef3f7';
  c.fillRect(0, 0, w, h);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, w, 24);
  text(c, mode === 1 ? '여행자 휴대품 신고' : mode === 2 ? '과세 가격 심사' : '수입 신고 정밀 심사', 8, 13, 13, '#ffffff');
  const rows = ['품명', '수량', '가격', '세율', '세액'];
  const vals = mode === 1 ? ['나무 오리', '2개', '38,000원', '20%', '7,600원'] : mode === 2 ? ['손가방(무상표)', '12개', '240,000원', '8%', '19,200원'] : ['꿀사과 가공품', '40상자', '820,000원', '30%', '246,000원'];
  const lines = n.lines ?? 0;
  rows.forEach((r, i) => {
    const y = 42 + i * 24;
    c.strokeStyle = '#c4ced6';
    c.strokeRect(8, y - 10, w - 16, 22);
    text(c, r, 14, y, 12, '#4a5560');
    if (lines * rows.length > i) text(c, vals[i], w - 14, y, 13, mode === 3 && i === 4 && (n.mark ?? 0) > 0.5 ? RED : NAVY_D, 'right');
  });
  if ((n.done ?? 0) > 0.5 || (n.stamped ?? 0) > 0.5) {
    c.strokeStyle = GREEN_D;
    c.lineWidth = 3;
    c.strokeRect(w - 96, h - 28, 88, 22);
    c.lineWidth = 1;
    text(c, '심사 완료', w - 52, h - 16, 13, GREEN_D, 'center');
  }
  if (mode === 3 && (n.tab ?? 0) > 0.5) {
    c.fillStyle = AMBER;
    c.fillRect(8, h - 28, 100, 22);
    text(c, '다시 확인', 58, h - 16, 13, NAVY_D, 'center');
  }
}
function customsDesk(g: THREE.Group, out: Built, W: number) {
  const T = CD.top;
  const w = W - 0.04;
  // A grey desk with a modesty panel and a drawer unit.
  part(g, rbox(w, 0.04, 0.68, 0.012), '#dfe4e7', 0, T - 0.02, -0.1);
  part(g, box(0.04, T - 0.04, 0.6), GREY, -w / 2 + 0.03, (T - 0.04) / 2, -0.1);
  part(g, rbox(0.32, T - 0.05, 0.56, 0.012), GREY, w / 2 - 0.17, (T - 0.05) / 2, -0.1);
  for (let i = 0; i < 3; i++) {
    part(g, box(0.28, 0.17, 0.006), '#b0bac2', w / 2 - 0.17, 0.11 + i * 0.21, 0.181, { outline: false });
    part(g, box(0.1, 0.012, 0.012), CHROME, w / 2 - 0.17, 0.16 + i * 0.21, 0.188, { outline: false });
  }
  part(g, box(w - 0.1, 0.5, 0.012), GREY_D, 0, 0.42, -0.4);
  // The screen and keyboard.
  part(g, box(0.16, 0.012, 0.12), BLACK, 0, T + 0.006, -0.29, { outline: false });
  part(g, cyl(0.012, 0.016, 0.1, 8), BLACK, 0, T + 0.06, -0.3, { outline: false });
  part(g, rbox(0.44, 0.3, 0.025, 0.01), BLACK, 0, T + 0.25, -0.3);
  const scr = liveScreen(g, 0.41, 0.27, 256, 170, 0, T + 0.25, -0.286);
  part(g, rbox(0.3, 0.014, 0.11, 0.006), '#39424b', CD.keys[0], T + 0.008, CD.keys[2], { outline: false });
  for (let j = 0; j < 3; j++) part(g, box(0.27, 0.003, 0.018), '#6b7680', CD.keys[0], T + 0.016, CD.keys[2] - 0.03 + j * 0.03, { outline: false });
  // The trays.
  for (const [x, col] of [[CD.in[0], '#90a4ae'], [CD.out[0], '#7fb3d5']] as Array<[number, string]>) {
    part(g, box(0.25, 0.012, 0.3), col, x, T + 0.006, CD.in[2], { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.008, 0.04, 0.3), col, x + sx * 0.125, T + 0.02, CD.in[2], { outline: false });
  }
  const stackIn = group(g, CD.in[0], T + 0.014, CD.in[2]);
  for (let i = 0; i < 5; i++) part(stackIn, box(0.2, 0.004, 0.27), PAPER, 0.003 * (i % 2), i * 0.005, 0, { outline: false });
  const stackOut = group(g, CD.out[0], T + 0.014, CD.out[2]);
  for (let i = 0; i < 3; i++) part(stackOut, box(0.2, 0.004, 0.27), PAPER, -0.003 * (i % 2), i * 0.005, 0, { outline: false });
  // A nameplate on the desk's own front edge, seen from the room.
  label(g, '통관 심사', 0.3, 0.06, -0.14, T - 0.04, 0.243, NAVY, '#ffffff');
  chair(g, CD.seat);
  const flat = (col = PAPER) => {
    const m = group(g);
    part(m, box(0.2, 0.004, 0.28), col, 0, 0, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(m, box(0.15, 0.001, 0.006), GREY_D, 0, 0.0025, -0.1 + i * 0.03, { outline: false });
    return m;
  };
  const paper = flat();
  const inked = part(paper, cyl(0.03, 0.03, 0.001, 16), RED, 0.05, 0.003, 0.08, { outline: false });
  const other = flat('#fdf3d8');
  const blot = part(paper, box(0.13, 0.002, 0.018), '#ffeb3b', 0, 0.0035, -0.05, { outline: false });
  const tab = part(paper, box(0.03, 0.002, 0.06), AMBER, 0.11, 0.003, -0.08, { outline: false });
  const stamp = stampMesh(g);
  // The calculator, always there, in the right-hand place.
  const calc = group(g, CD.calc[0], T, CD.calc[2] + 0.02);
  part(calc, rbox(0.1, 0.014, 0.15, 0.006), '#39424b', 0, 0.008, 0, { outline: false });
  ownLit(calc, box(0.08, 0.002, 0.026), '#bcd8b0', 0, 0.016, -0.05);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) part(calc, box(0.015, 0.003, 0.015), '#9aa5ad', -0.03 + i * 0.02, 0.016, -0.018 + j * 0.022, { outline: false });
  const ruler = group(g);
  part(ruler, box(0.26, 0.004, 0.026), '#f2d479', 0, 0, 0, { outline: false });
  const pen = group(g);
  part(pen, cyl(0.006, 0.002, 0.13, 8), '#ffd54f', 0.02, 0.06, 0.02, { rz: -0.3, rx: 0.42, outline: false });

  const spots: Record<string, Spot> = {
    reviewDeclaration: seatAt(g, 'cuDeclare', CD.seat),
    customsOfficer_valuationReview: seatAt(g, 'cuValue', CD.seat),
    customsOfficer_dutyAudit: seatAt(g, 'cuAudit', CD.seat),
  };
  spots['*'] = spots.reviewDeclaration;
  const show = (_now: string | null, N: CuNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(paper, P.paper);
    at(other, P.paper2);
    at(ruler, P.ruler);
    at(pen, P.pen);
    at(stamp, P.stampAt, [CD.stamp[0], T, CD.stamp[2] - 0.12]);
    inked.visible = (n.stamped ?? 0) > 0.5;
    blot.visible = (n.mark ?? 0) > 0.4;
    tab.visible = (n.tab ?? 0) > 0.5;
    calc.visible = !P.stampAt;
    const mode = n.mode ?? 0;
    scr.draw(N ? `${mode}|${q(n.lines, 5)}|${q(n.done, 2)}|${q(n.stamped, 2)}|${q(n.mark, 2)}|${q(n.tab, 2)}` : 'idle', (c) => {
      if (!mode) {
        c.fillStyle = '#16294d';
        c.fillRect(0, 0, 256, 170);
        text(c, '통관 시스템', 128, 72, 22, '#ffffff', 'center');
        text(c, AIRPORT, 128, 104, 15, '#9fc0e8', 'center');
        return;
      }
      paintDesk(c, 256, 170, mode, n);
    });
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, CD.paper[0], CD.paper[1], CD.paper[2]);
}

// =============================================================================================
// 녹색·적색 통로 (cuLaneGate, 3 × 1): frosted doors from the baggage hall and a lit gantry over two painted lanes.

function trolley(g: THREE.Object3D, col1: string, col2: string): THREE.Group {
  const b = group(g);
  part(b, box(0.4, 0.03, 0.56), GREY, 0, 0.14, 0);
  for (const sx of [-1, 1]) for (const z of [-0.22, 0.22]) part(b, cyl(0.045, 0.045, 0.025, 10), BLACK, sx * 0.17, 0.05, z, { rz: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) rod(b, v3(sx * 0.18, 0.14, -0.26), v3(sx * 0.18, 0.96, -0.32), 0.012, GREY_D);
  rod(b, v3(-0.18, 0.96, -0.32), v3(0.18, 0.96, -0.32), 0.014, RED_D);
  const c1 = suitcase(b, col1, 0.36, 0.42, 0.26, false);
  c1.position.set(0, 0.15, 0.05);
  const c2 = softBag(b, col2);
  c2.position.set(0, 0.6, 0.05);
  return b;
}
function laneGate(g: THREE.Group, out: Built, W: number) {
  const H = 2.4;
  // The wall behind, with a door in each lane.
  part(g, box(W, H, 0.08), '#e9ebe6', 0, H / 2, -0.46);
  const leaves: THREE.Group[] = [];
  for (const x of [LG.green, LG.red]) {
    part(g, box(1.0, 2.14, 0.03), GREY_D, x, 1.07, -0.41);
    for (const sx of [-1, 1]) {
      const hinge = group(g, x + sx * 0.46, 0, -0.395);
      part(hinge, box(0.45, 2.04, 0.025), '#dbe8ee', -sx * 0.225, 1.03, 0);
      part(hinge, box(0.36, 1.1, 0.002), '#f1f7fa', -sx * 0.225, 1.26, 0.014, { outline: false });
      part(hinge, box(0.02, 0.3, 0.03), CHROME, -sx * 0.4, 1.0, 0.02, { outline: false });
      hinge.userData.sx = sx;
      leaves.push(hinge);
    }
  }
  // Painted lanes running out into the hall.
  part(g, box(0.86, 0.004, 1.9), GREEN, LG.green, 0.004, 0.5, { outline: false, shadow: false });
  part(g, box(0.86, 0.004, 1.9), RED, LG.red, 0.004, 0.5, { outline: false, shadow: false });
  for (const [x, col] of [[LG.green, '#bff0cc'], [LG.red, '#ffcfcb']] as Array<[number, string]>) for (let i = 0; i < 3; i++) part(g, box(0.28, 0.002, 0.2), col, x, 0.007, 0.06 + i * 0.5, { outline: false, shadow: false, rx: 0 });
  // The gantry and its two lit signs, in the wall above the doors.
  for (const sx of [-1, 1]) part(g, box(0.1, 2.5, 0.12), NAVY, sx * (W / 2 - 0.06), 1.25, -0.34);
  part(g, box(W, 0.1, 0.16), NAVY, 0, 2.5, -0.34);
  const signTex = (word: string, sub: string, col: string, key: string) =>
    painted(key, 512, 128, (c) => {
      c.fillStyle = col;
      c.fillRect(0, 0, 512, 128);
      text(c, word, 256, 50, 52, '#ffffff', 'center');
      text(c, sub, 256, 100, 26, '#ffffff', 'center', false);
    });
  part(g, box(1.28, 0.36, 0.1), BLACK, LG.green, 2.26, -0.33);
  part(g, box(1.28, 0.36, 0.1), BLACK, LG.red, 2.26, -0.33);
  const gs = picture(g, signTex('신고 물품 없음', 'NOTHING TO DECLARE', GREEN, 'cuSignG'), 1.22, 0.3, LG.green, 2.26, -0.278);
  const rs = picture(g, signTex('신고 물품 있음', 'GOODS TO DECLARE', RED, 'cuSignR'), 1.22, 0.3, LG.red, 2.26, -0.278);
  picture(g, emblem(), 0.3, 0.3, 0, 1.92, -0.415);
  label(g, AIRPORT, 0.5, 0.12, 0, 1.68, -0.416, CREAM, NAVY);
  // The island between the lanes, a lectern to the officer's hand, tape to either side.
  part(g, rbox(0.3, 0.92, 0.2, 0.02), GREY_D, 0, 0.46, 0.14);
  part(g, rbox(0.4, 0.04, 0.3, 0.012), CREAM, 0, 0.94, 0.16, { rx: 0.24 });
  part(g, box(0.28, 0.004, 0.2), PAPER, 0, 0.965, 0.16, { rx: 0.24, outline: false });
  for (const sx of [-1, 1]) {
    stanchion(g, sx * 0.32, -0.2);
    stanchion(g, sx * 0.32, 0.8);
    part(g, box(0.012, 0.05, 1.0), sx < 0 ? GREEN : RED, sx * 0.32, 0.82, 0.3, { outline: false });
  }
  // The two who come through.
  const t1 = person(g, LOOKS.b, LG.green, 0, 0, 'male');
  const t2 = person(g, LOOKS.e, LG.red, 0, 0, 'female');
  const tr1 = trolley(g, CASES[1], CASES[5]);
  const tr2 = trolley(g, CASES[0], CASES[3]);
  tr1.visible = tr2.visible = false;
  const spots: Record<string, Spot> = { cuDirectLanes: standAt(g, 'cuLane', LG.stand[0], LG.stand[1]) };
  spots['*'] = spots.cuDirectLanes;
  const zOf = (u: number) => LG.from + (LG.to - LG.from) * u;
  const walker = (f: Fig, tr: THREE.Group, x: number, u: number, t: number, moving: boolean) => {
    const on = u > 0.005 && u < 0.995;
    f.root.visible = on;
    tr.visible = on;
    if (!on) return;
    const z = zOf(u);
    f.root.position.set(x, moving ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z);
    tr.position.set(x, 0, z + 0.48);
    f.armR(v3(x - 0.13, 0.98, z + 0.2));
    f.armL(v3(x + 0.13, 0.98, z + 0.2));
  };
  const opened = (u: number) => THREE.MathUtils.clamp(1 - Math.abs(u - 0.06) / 0.08, 0, 1);
  const show = (_now: string | null, N: CuNow | null, t: number) => {
    const n = N?.n ?? {};
    const u1 = n.t1 ?? 0;
    const u2 = n.t2 ?? 0;
    walker(t1, tr1, LG.green, u1 > 1 ? 1 : u1, t, true);
    walker(t2, tr2, LG.red, u2, t, (n.red ?? 0) < 0.5 || u2 > 0.63);
    t2.opts.nod = (n.nod2 ?? 0) > 0.5 ? 0.2 + 0.1 * Math.sin(t * 7) : 0.08;
    t2.head.rotation.x = t2.opts.nod ?? 0;
    leaves.forEach((h, i) => {
      const o = i < 2 ? opened(u1) : opened(u2);
      h.rotation.y = (h.userData.sx as number) * o * 1.2;
    });
    const pulse = 0.82 + 0.18 * Math.sin(t * 6);
    (gs.material as THREE.MeshBasicMaterial).color.setScalar((n.green ?? 0) > 0.5 ? 1 : pulse * 0.85);
    (rs.material as THREE.MeshBasicMaterial).color.setScalar((n.red ?? 0) > 0.5 ? 1 : pulse * 0.85);
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, 0, 0.96, 0.18);
}

// =============================================================================================
// 탐지견 검색대 (cuDogLane, 2 × 1): a low bench of bags, a dog in a little vest, a bed and a bin.

interface Dog {
  root: THREE.Group;
  set(x: number, z: number, yaw: number, sit: number, sniff: number, wag: number, t: number): void;
  neck(): THREE.Vector3;
}
function beagle(g: THREE.Object3D): Dog {
  const TAN = '#b77a44';
  const WHITE = '#f4eee3';
  const DARK = '#3a2a20';
  const root = group(g);
  const body = group(root, 0, 0.27, 0);
  part(body, rbox(0.15, 0.15, 0.36, 0.06), TAN, 0, 0, 0);
  part(body, rbox(0.1, 0.09, 0.28, 0.04), WHITE, 0, -0.05, 0.02, { outline: false });
  part(body, rbox(0.155, 0.07, 0.2, 0.03), DARK, 0, 0.05, -0.04, { outline: false });
  // A little work vest with the word on it.
  part(body, rbox(0.165, 0.12, 0.16, 0.03), NAVY, 0, 0.02, 0.04, { outline: false });
  label(body, '세관', 0.1, 0.05, 0.085, 0.03, 0.04, NAVY, '#ffffff', Math.PI / 2);
  label(body, '세관', 0.1, 0.05, -0.085, 0.03, 0.04, NAVY, '#ffffff', -Math.PI / 2);
  const headG = group(body, 0, 0.1, 0.2);
  part(headG, rbox(0.13, 0.12, 0.13, 0.05), TAN, 0, 0, 0);
  part(headG, rbox(0.08, 0.07, 0.11, 0.03), WHITE, 0, -0.03, 0.09);
  part(headG, ball(0.02), BLACK, 0, -0.005, 0.145, { outline: false });
  for (const sx of [-1, 1]) {
    part(headG, ball(0.012), BLACK, sx * 0.035, 0.025, 0.066, { outline: false });
    part(headG, rbox(0.03, 0.12, 0.05, 0.014), DARK, sx * 0.07, -0.02, 0, { outline: false });
  }
  part(headG, box(0.02, 0.01, 0.02), '#d9707a', 0, -0.07, 0.11, { outline: false });
  const legs: THREE.Group[] = [];
  for (const [sx, z] of [[-1, 0.13], [1, 0.13], [-1, -0.13], [1, -0.13]] as Array<[number, number]>) {
    const hip = group(root, sx * 0.055, 0.22, z);
    part(hip, rbox(0.045, 0.22, 0.05, 0.015), WHITE, 0, -0.11, 0);
    legs.push(hip);
  }
  const tail = group(body, 0, 0.06, -0.18);
  part(tail, cyl(0.009, 0.016, 0.17, 6), TAN, 0, 0.08, -0.02, { rx: -0.3, outline: false });
  part(tail, ball(0.013), WHITE, 0, 0.165, -0.045, { outline: false });
  const neckAt = new THREE.Vector3();
  let sitNow = 0;
  return {
    root,
    set(x, z, yaw, sit, sniff, wag, t) {
      root.position.set(x, 0, z);
      root.rotation.y = yaw;
      sitNow = sit;
      // Sitting: the hind end down, chest up. Sniffing: the nose down.
      body.position.y = 0.27 - 0.09 * sit - 0.04 * sniff;
      body.rotation.x = -0.42 * sit + 0.2 * sniff;
      headG.rotation.x = 0.42 * sit * 0.7 + 0.55 * sniff + 0.05 * Math.sin(t * 9) * sniff;
      legs[2].rotation.x = 1.0 * sit;
      legs[3].rotation.x = 1.0 * sit;
      legs[2].position.y = legs[3].position.y = 0.22 - 0.1 * sit;
      legs[0].position.y = legs[1].position.y = 0.22 + 0.01 * sit;
      tail.rotation.z = Math.sin(t * 10) * 0.25 * Math.max(0, wag);
    },
    neck() {
      const s = Math.sin(root.rotation.y);
      const c = Math.cos(root.rotation.y);
      return neckAt.set(root.position.x + s * 0.18, 0.36 + 0.05 * sitNow, root.position.z + c * 0.18);
    },
  };
}
function dogLane(g: THREE.Group, out: Built, W: number) {
  // A rubber mat, a low bench with a number per bay.
  part(g, box(W, 0.008, 0.98), '#39424b', 0, 0.004, 0, { outline: false, shadow: false });
  part(g, box(W - 0.3, 0.02, 0.36), GREY, 0.12, DG.bench - 0.01, DG.benchZ);
  for (const x of [-0.7, 0.2, 0.94]) part(g, box(0.05, DG.bench - 0.02, 0.32), GREY_D, x, (DG.bench - 0.02) / 2, DG.benchZ);
  DG.bags.forEach((x, i) => label(g, String(i + 1), 0.09, 0.05, x, DG.bench - 0.012, DG.benchZ + 0.184, AMBER, BLACK));
  // The back wall of bench: a sign, on a low stand.
  const sign = group(g, -0.3, 0, -0.44);
  part(sign, box(0.03, 1.1, 0.03), GREY_D, -0.44, 0.55, 0);
  part(sign, box(0.03, 1.1, 0.03), GREY_D, 0.44, 0.55, 0);
  picture(sign, painted('cuDogSign', 384, 128, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 384, 128);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 384, 30);
    text(c, '탐지견 근무 중', 192, 16, 20, '#ffffff', 'center');
    text(c, '쓰다듬지 말아 주세요', 192, 60, 22, BLACK, 'center');
    text(c, '과일·육류를 찾아요', 192, 96, 20, GREEN_D, 'center');
  }), 0.9, 0.3, 0, 0.95, 0.02);
  // The bags in the row: the third has a pocket that opens.
  const cols = [CASES[1], CASES[6], CASES[2], CASES[7]];
  const pocket = group(g, DG.bags[2], DG.bench, DG.benchZ);
  suitcase(pocket, cols[2], 0.32, 0.38, 0.2, false);
  const pocketFlap = part(pocket, box(0.26, 0.15, 0.015), shade(cols[2], 0.85), 0, 0.23, 0.11);
  DG.bags.forEach((x, i) => {
    if (i === 2) return;
    const b = i === 3 ? softBag(g, cols[i]) : suitcase(g, cols[i], 0.34, 0.36, 0.2, false);
    b.position.set(x, DG.bench, DG.benchZ);
  });
  // The dog's bed, its water bowl and treats; the bin.
  part(g, cyl(0.2, 0.22, 0.05, 16), '#a65d57', DG.home[0], 0.035, DG.home[1] + 0.02);
  part(g, cyl(0.16, 0.16, 0.012, 16), '#e6c5b5', DG.home[0], 0.066, DG.home[1] + 0.02, { outline: false });
  part(g, cyl(0.06, 0.07, 0.03, 12), CHROME, -0.84, 0.03, -0.26);
  part(g, cyl(0.05, 0.05, 0.002, 12), '#7fc5ee', -0.84, 0.046, -0.26, { outline: false });
  part(g, cyl(0.1, 0.08, 0.3, 14), '#2e9e4f', DG.bin[0], 0.15, DG.bin[2]);
  part(g, cyl(0.105, 0.105, 0.012, 14), '#1b5e20', DG.bin[0], 0.306, DG.bin[2], { outline: false });
  label(g, '과일', 0.1, 0.05, DG.bin[0], 0.19, DG.bin[2] + 0.092, CREAM, GREEN_D);
  const dog = beagle(g);
  const leashG = group(g);
  const leash = limb(leashG, 0.006, RED_D);
  const apple = group(g);
  part(apple, ball(0.05), '#d84a3a', 0, 0, 0);
  part(apple, cyl(0.004, 0.004, 0.03, 6), '#5d4037', 0, 0.056, 0, { outline: false });
  const toy = group(g);
  part(toy, ball(0.035), '#f2b632', 0, 0, 0);
  const spots: Record<string, Spot> = { cuDogRound: standAt(g, 'cuDog', -0.5, DG.stand) };
  spots['*'] = spots.cuDogRound;
  const hand = new THREE.Vector3();
  const show = (_now: string | null, N: CuNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    if (N && (n.dout ?? 0) > 0.5) dog.set(n.dx ?? DG.home[0], n.dz ?? DG.dogZ, n.dyaw ?? 0, n.dsit ?? 0, n.dsniff ?? 0, n.dwag ?? 0.5, t);
    else dog.set(DG.home[0], DG.home[1] + 0.02, 0.8, 1, 0, 0.2 + 0.1 * Math.sin(t * 0.4), t);
    leashG.visible = !!N && !!N.key.l;
    if (leashG.visible && N?.key.l) {
      hand.set(N.key.l[0], N.key.l[1], N.key.l[2]);
      leash(hand, dog.neck());
    }
    pocketFlap.rotation.x = 1.1 * THREE.MathUtils.clamp(n.pocket ?? 0, 0, 1);
    pocketFlap.position.y = 0.23 + 0.06 * THREE.MathUtils.clamp(n.pocket ?? 0, 0, 1);
    pocketFlap.position.z = 0.11 + 0.06 * THREE.MathUtils.clamp(n.pocket ?? 0, 0, 1);
    at(apple, P.apple);
    toy.visible = (n.ball ?? 0) > 0.5;
    if (toy.visible) toy.position.set(DG.bags[2] + 0.1, 0.56 + 0.02 * Math.sin(t * 6), DG.dogZ + 0.14);
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, DG.bags[0], 0.4, 0);
}

// =============================================================================================
// 유치품 보관함 (cuSeizedCage, 2 × 1): a wire cage of goods held till somebody comes for them.

function seizedCage(g: THREE.Group, out: Built, W: number) {
  const H = 2.05;
  const ZF = 0.44;
  const ZB = -0.46;
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) for (const z of [ZB, ZF]) part(g, box(0.05, H, 0.05), GREY_D, x, H / 2, z);
  part(g, box(0.05, H, 0.05), GREY_D, 0.04, H / 2, ZF);
  part(g, box(W, 0.05, 0.05), GREY_D, 0, H, ZF);
  part(g, box(W, 0.05, 0.05), GREY_D, 0, H, ZB);
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) part(g, box(0.05, 0.05, ZF - ZB), GREY_D, x, H, (ZF + ZB) / 2);
  part(g, box(W - 0.08, 0.05, 0.05), GREY_D, 0, 0.03, ZF);
  part(g, box(W - 0.04, 0.012, 0.86), '#7a858e', 0, 0.01, -0.01, { outline: false });
  wire(g, W - 0.08, H - 0.06, 0, H / 2, ZB);
  for (const sx of [-1, 1]) wire(g, ZF - ZB - 0.04, H - 0.06, sx * (W / 2 - 0.03), H / 2, (ZF + ZB) / 2, Math.PI / 2);
  wire(g, 0.94, H - 0.06, -0.47, H / 2, ZF);
  // The shelves on the right; the fixed face and door.
  part(g, box(0.05, 1.7, 0.4), GREY, 0.08, 0.85, -0.2, { outline: false });
  for (const y of [SC.shelf[1] - 0.012, SC.rail]) part(g, box(0.88, 0.03, 0.5), GREY, 0.52, y, -0.18);
  // On the left, stacked to the head: the far-too-many boxes of fruit.
  const reds = ['#d84a3a', '#e8842a', '#c9b32a'];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 2; x++) fruitBox(g, -0.68 + x * 0.42 + (y % 2) * 0.02, 0.03 + y * 0.27, -0.12, reds[(x + y) % 3], 0.4, 0.5);
  // On the upper shelf: a row of handbags with no name on, and below them a sack and a pile of tagged cartons.
  const bagCols = ['#7a4b2a', '#3a3f54', '#a2484a', '#7a4b2a', '#2f6c5e', '#a2484a'];
  bagCols.forEach((col, i) => {
    const b = handbag(g, col);
    b.position.set(0.22 + (i % 3) * 0.3, SC.rail + 0.016, -0.26 + Math.floor(i / 3) * 0.2);
    b.rotation.y = i * 0.17 - 0.3;
  });
  // Tags and a board: what's in the cage, in numbers made up by the man who counted them.
  const board = group(g, -0.38, 1.6, ZF + 0.02);
  picture(board, painted('cuCageBoard', 256, 192, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 256, 192);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 256, 34);
    text(c, '유치품 보관함', 128, 18, 21, '#ffffff', 'center');
    text(c, '과일 상자 ·········· 41', 14, 62, 18, BLACK);
    text(c, '이름 없는 손가방 ·· 63', 14, 90, 18, BLACK);
    text(c, '대형 나무 오리 ····· 2', 14, 118, 18, BLACK);
    text(c, '찾아가세요: 세금 납부 창구', 128, 160, 15, GREEN_D, 'center');
  }), 0.62, 0.46, 0, 0, 0);
  const ticks = Array.from({ length: 5 }, (_, i) => part(board, box(0.012, 0.05, 0.002), RED, -0.26 + i * 0.03, -0.26, 0.002, { outline: false }));
  // The door, hung on the right, its lock on the left.
  const door = group(g, W / 2 - 0.04, 0, ZF);
  const dw = W / 2 - 0.1;
  part(door, box(dw, 0.04, 0.03), GREY_D, -dw / 2, 0.08, 0);
  part(door, box(dw, 0.04, 0.03), GREY_D, -dw / 2, H - 0.08, 0);
  part(door, box(0.04, H - 0.14, 0.03), GREY_D, -dw + 0.02, H / 2, 0);
  part(door, box(0.04, H - 0.14, 0.03), GREY_D, -0.02, H / 2, 0);
  wire(door, dw - 0.06, H - 0.18, -dw / 2, H / 2, 0);
  part(door, rbox(0.07, 0.11, 0.03, 0.01), AMBER, -dw + 0.06, SC.lock[1], 0.02);
  label(door, '보관 중', 0.26, 0.08, -dw / 2, 1.6, 0.02, RED_D, '#ffffff');
  const newBox = fruitBox(g, 0, 0, 0, '#d84a3a', 0.46, 0.34);
  const tag = part(newBox, box(0.06, 0.08, 0.002), AMBER, 0.2, 0.1, 0.172, { outline: false });
  const clip = clipboard(g);
  const keyG = group(g);
  part(keyG, cyl(0.012, 0.012, 0.004, 10), AMBER, 0, 0, 0.018, { rx: Math.PI / 2, outline: false });
  part(keyG, box(0.008, 0.008, 0.05), AMBER, 0, 0, -0.012, { outline: false });
  const spots: Record<string, Spot> = { cuLogSeized: standAt(g, 'cuSeized', 0.08, SC.stand) };
  spots['*'] = spots.cuLogSeized;
  const show = (_now: string | null, N: CuNow | null) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    door.rotation.y = THREE.MathUtils.clamp(n.door ?? 0, 0, 1);
    at(newBox, P.box);
    tag.visible = (n.tagged ?? 0) > 0.5;
    at(clip, P.clip);
    at(keyG, P.key);
    const count = n.count ?? 0;
    ticks.forEach((m, i) => (m.visible = count > (i + 0.5) / ticks.length));
  };
  show(null, null);
  drive(g, out, spots, show);
  out.work = marker(g, 0.1, 1.05, ZF);
}

// =============================================================================================
// 관제실 (cuMonitorDesk, 3 × 1): six cameras of the hall on the wall, a low console.

const CAM_NAMES = ['1 녹색 통로', '2 적색 통로', '3 수취대', '4 엑스레이', '5 검사대', '6 탐지견'];
function paintCam(c: Ctx2, i: number, x: number, y: number, w: number, h: number, t: number) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.fillStyle = '#39424b';
  c.fillRect(x, y, w, h);
  const walkers = (lane: number, col: string, n: number) => {
    for (let k = 0; k < n; k++) {
      const u = frac(t * 0.07 + k / n + i * 0.13);
      const r = pos(Math.min(w, h) * 0.05 + u * Math.min(w, h) * 0.03);
      c.fillStyle = col;
      c.beginPath();
      c.arc(x + w * lane, y + h * (0.15 + u * 0.75), r, 0, Math.PI * 2);
      c.fill();
    }
  };
  switch (wrap(i, 6)) {
    case 0:
      c.fillStyle = '#2e9e4f';
      c.fillRect(x + w * 0.3, y, w * 0.4, h);
      walkers(0.5, '#ffe6c7', 3);
      break;
    case 1:
      c.fillStyle = '#c0403a';
      c.fillRect(x + w * 0.3, y, w * 0.4, h);
      walkers(0.5, '#cfe3ff', 1);
      break;
    case 2: {
      c.strokeStyle = '#1d2024';
      c.lineWidth = pos(h * 0.16);
      c.strokeRect(x + w * 0.16, y + h * 0.28, w * 0.68, h * 0.44);
      c.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        const u = frac(t * 0.05 + k / 6);
        const edge = u * 4;
        const e = edge % 1;
        const px = edge < 1 ? 0.16 + 0.68 * e : edge < 2 ? 0.84 : edge < 3 ? 0.84 - 0.68 * e : 0.16;
        const py = edge < 1 ? 0.28 : edge < 2 ? 0.28 + 0.44 * e : edge < 3 ? 0.72 : 0.72 - 0.44 * e;
        c.fillStyle = CASES[wrap(k, CASES.length)];
        c.fillRect(x + w * px - 5, y + h * py - 4, 10, 8);
      }
      break;
    }
    case 3:
      c.fillStyle = '#b6bfc6';
      c.fillRect(x + w * 0.12, y + h * 0.46, w * 0.76, h * 0.2);
      c.fillStyle = '#e4e8ea';
      c.fillRect(x + w * 0.36, y + h * 0.26, w * 0.28, h * 0.46);
      c.fillStyle = CASES[1];
      c.fillRect(x + w * (0.1 + 0.8 * frac(t * 0.1)), y + h * 0.44, 12, 9);
      break;
    case 4:
      c.fillStyle = '#c3cad0';
      c.fillRect(x + w * 0.2, y + h * 0.42, w * 0.6, h * 0.3);
      c.fillStyle = CASES[3];
      c.fillRect(x + w * 0.38, y + h * 0.44, w * 0.2, h * 0.14);
      walkers(0.75, '#ffd9a0', 1);
      break;
    default:
      for (let k = 0; k < 4; k++) {
        c.fillStyle = CASES[wrap(k + 2, CASES.length)];
        c.fillRect(x + w * (0.14 + k * 0.2), y + h * 0.28, w * 0.13, h * 0.2);
      }
      c.fillStyle = '#b77a44';
      c.fillRect(x + w * (0.12 + 0.68 * frac(t * 0.06)), y + h * 0.62, 14, 6);
      break;
  }
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.fillRect(x, y + h - 15, w, 15);
  text(c, CAM_NAMES[wrap(i, 6)], x + 4, y + h - 7, 10, '#ffffff');
  c.restore();
}
function monitorDesk(g: THREE.Group, out: Built, W: number) {
  const T = 0.72;
  // The console, low, curved a little to the seat.
  part(g, rbox(W - 0.06, 0.05, 0.56, 0.015), '#3a424b', 0, T - 0.025, 0.14);
  part(g, box(W - 0.1, T - 0.08, 0.04), '#2a3138', 0, (T - 0.05) / 2, -0.12);
  for (const sx of [-1, 1]) part(g, box(0.04, T - 0.05, 0.5), '#2a3138', sx * (W / 2 - 0.08), (T - 0.05) / 2, 0.14);
  part(g, rbox(0.36, 0.014, 0.12, 0.006), '#20252a', MD.keys[0], T + 0.008, MD.keys[2], { outline: false });
  for (let j = 0; j < 3; j++) part(g, box(0.33, 0.003, 0.02), '#6b7680', MD.keys[0], T + 0.016, MD.keys[2] - 0.03 + j * 0.03, { outline: false });
  // The camera switcher: six lit buttons.
  const btns = Array.from({ length: 6 }, (_, i) => ownLit(g, box(0.05, 0.012, 0.05), '#2a5c3a', MD.pick[0] - 0.16 + (i % 3) * 0.075, T + 0.012, MD.pick[2] - 0.04 + Math.floor(i / 3) * 0.075));
  // The radio's base, the log, a mug.
  part(g, rbox(0.12, 0.06, 0.1, 0.012), BLACK, MD.radio[0], T + 0.03, MD.radio[2] - 0.04);
  const baseRadio = radioMesh(g);
  baseRadio.position.set(MD.radio[0], T + 0.12, MD.radio[2] - 0.04);
  const log = group(g, MD.log[0], T, MD.log[2]);
  part(log, box(0.26, 0.012, 0.2), PAPER, 0, 0.006, 0, { outline: false });
  part(log, box(0.012, 0.014, 0.2), RED_D, 0, 0.007, 0, { outline: false });
  const inked = Array.from({ length: 4 }, (_, i) => part(log, box(0.08, 0.001, 0.005), NAVY, 0.06, 0.013, -0.06 + i * 0.04, { outline: false }));
  part(g, cyl(0.035, 0.03, 0.09, 12), CREAM, 0.95, T + 0.045, 0.2);
  // The wall of screens, on a dark frame behind.
  const FZ = -0.42;
  part(g, box(W - 0.04, 2.06, 0.06), '#20252a', 0, 1.03, FZ - 0.02);
  const scr = liveScreen(g, W - 0.24, 1.14, 640, 256, 0, 1.42, FZ + 0.015);
  part(g, box(W - 0.2, 0.012, 0.012), '#454f58', 0, 1.42, FZ + 0.016, { outline: false });
  label(g, '세관 관제실', 0.7, 0.14, 0, 2.03, FZ + 0.016, NAVY_D, '#ffffff');
  chair(g, MD.seat);
  const held = radioMesh(g);
  const spots: Record<string, Spot> = { cuWatchCctv: seatAt(g, 'cuWatch', MD.seat) };
  spots['*'] = spots.cuWatchCctv;
  const show = (_now: string | null, N: CuNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const round = N?.b.n ?? 0;
    const picked = wrap(round, 6);
    const big = (n.big ?? 0) > 0.5;
    baseRadio.visible = !P.radio;
    at(held, P.radio);
    inked.forEach((m, i) => (m.visible = (n.logged ?? 0) > (i + 0.5) / inked.length));
    btns.forEach((b, i) => setLit(b, big && i === picked ? '#ffd54f' : '#2a5c3a'));
    scr.draw(`${big ? picked : 'all'}|${Math.floor(t * 6)}`, (c) => {
      c.fillStyle = '#0e1216';
      c.fillRect(0, 0, 640, 256);
      if (big) {
        paintCam(c, picked, 0, 0, 640, 256, t);
        c.strokeStyle = AMBER;
        c.lineWidth = 4;
        c.strokeRect(2, 2, 636, 252);
        c.lineWidth = 1;
        return;
      }
      for (let i = 0; i < 6; i++) paintCam(c, i, 2 + (i % 3) * 213, 2 + Math.floor(i / 3) * 127, 209, 123, t);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, MD.keys[0], MD.keys[1], MD.keys[2]);
}

// =============================================================================================
// 수하물 수취대 (cuCarousel, 4 × 2): a low loop of rubber plates with bags going round and a board of flights.

function carousel(g: THREE.Group, out: Built) {
  const H = CA.half;
  const R = CA.radius + 0.18;
  const Y = CA.y;
  // The skirt, the belt and the island at its middle.
  part(g, box(2 * H, Y - 0.02, 2 * R), GREY_L, 0, (Y - 0.02) / 2, 0);
  for (const sx of [-1, 1]) part(g, cyl(R, R, Y - 0.02, 32), GREY_L, sx * H, (Y - 0.02) / 2, 0);
  part(g, box(2 * H, 0.02, 2 * R - 0.02), RUBBER, 0, Y - 0.01, 0, { outline: false });
  for (const sx of [-1, 1]) part(g, cyl(R - 0.01, R - 0.01, 0.02, 32), RUBBER, sx * H, Y - 0.01, 0, { outline: false });
  const Ri = CA.radius - 0.18;
  part(g, box(2 * H, 0.12, 2 * Ri), GREY, 0, Y + 0.05, 0);
  for (const sx of [-1, 1]) part(g, cyl(Ri, Ri, 0.12, 24), GREY, sx * H, Y + 0.05, 0);
  // The plates, which go round.
  const plates = Array.from({ length: 28 }, () => {
    const m = part(g, box(0.02, 0.003, 0.34), '#4a5057', 0, Y + 0.003, 0, { outline: false, shadow: false });
    return m;
  });
  // A stripe along the skirt.
  part(g, box(2 * H, 0.04, 2 * R + 0.006), AMBER, 0, 0.14, 0, { outline: false, shadow: false });
  // The mast with its flights.
  part(g, cyl(0.05, 0.06, 1.6, 12), GREY_D, 0, 0.98, 0);
  part(g, box(1.14, 0.46, 0.08), BLACK, 0, 1.72, 0);
  const flights = painted('cuFlights', 384, 156, (c) => {
    c.fillStyle = '#0b1f33';
    c.fillRect(0, 0, 384, 156);
    c.fillStyle = AMBER;
    c.fillRect(0, 0, 384, 30);
    text(c, '수취대 3', 192, 16, 20, NAVY_D, 'center');
    [['SB 204', '달빛섬'], ['SB 317', '구름시'], ['SB 482', '은하만']].forEach(([f, p], i) => {
      text(c, f, 14, 52 + i * 34, 19, '#ffffff');
      text(c, p, 156, 52 + i * 34, 19, '#9fd8ff');
      text(c, '도착', 340, 52 + i * 34, 16, '#7ee89e', 'center');
    });
  });
  picture(g, flights, 1.08, 0.4, 0, 1.72, 0.042);
  // A cone and a sign by the belt's end: don't climb on it.
  label(g, '올라가지 마세요', 0.48, 0.09, -1.2, 0.24, R + 0.004, CREAM, RED_D);
  // The bags going round.
  const bags = Array.from({ length: CA.n }, (_, i) => (i % 3 === 1 ? softBag(g, CASES[i % 8]) : suitcase(g, CASES[(i * 3) % 8], 0.36, 0.2, 0.32, false)));
  // A trolley for the unclaimed; the bag lifted off; the scanner and radio.
  const lone = suitcase(g, '#7a6a9c', 0.36, 0.52, 0.2);
  const tag = part(lone, box(0.06, 0.09, 0.002), PAPER, 0.04, 0.54, 0.12, { outline: false });
  const redTag = part(lone, box(0.06, 0.09, 0.002), RED, 0.04, 0.54, 0.122, { outline: false });
  const scanner = group(g);
  part(scanner, rbox(0.05, 0.12, 0.03, 0.01), AMBER, 0, 0, 0);
  ownLit(scanner, box(0.03, 0.03, 0.002), '#7ee89e', 0, 0.03, 0.016);
  const radio = radioMesh(g);
  cone(g, 1.7, 1.18);
  const spots: Record<string, Spot> = { cuClaimCheck: standAt(g, 'cuBelt', CA.grab, CA.stand) };
  spots['*'] = spots.cuClaimCheck;
  const show = (_now: string | null, N: CuNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const rot = t * 0.035;
    plates.forEach((m, i) => {
      const a = carouselAt(rot + i / plates.length);
      m.position.x = a.x;
      m.position.z = a.z;
      m.rotation.y = a.yaw;
    });
    const loneAt = P.bag;
    bags.forEach((b, i) => {
      const a = carouselAt(rot + i / CA.n);
      b.position.set(a.x, Y, a.z);
      b.rotation.y = a.yaw + i * 0.4;
      b.visible = !loneAt || Math.hypot(a.x - loneAt[0], a.z - loneAt[2]) > 0.44;
    });
    at(lone, P.bag);
    tag.visible = (n.tagged ?? 0) < 0.5;
    redTag.visible = (n.tagged ?? 0) >= 0.5;
    at(scanner, P.scan);
    at(radio, P.radio);
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, CA.grab, CA.y + 0.2, CA.radius);
}

// =============================================================================================
// 세금 납부 창구 (cuDutyCounter, 2 × 1): an officer on the front, the traveller on the back; a shield with a slot.

function dutyCounter(g: THREE.Group, out: Built, W: number) {
  const T = DC.top;
  part(g, rbox(W - 0.04, T - 0.05, 0.8, 0.02), '#dfe4e7', 0, (T - 0.05) / 2, -0.05);
  part(g, rbox(W, 0.05, 0.92, 0.012), CREAM, 0, T - 0.025, -0.05);
  part(g, box(W - 0.04, 0.05, 0.8), NAVY, 0, 0.03, -0.05, { outline: false });
  // The customers' face: its name, under the shield.
  picture(g, painted('cuDutySign', 480, 128, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 480, 128);
    text(c, '세금 납부 창구', 240, 48, 44, '#ffffff', 'center');
    text(c, '신고하면 가산세가 없어요', 240, 98, 26, AMBER, 'center', false);
  }), 1.5, 0.4, 0, 0.62, -0.456, '#ffffff', Math.PI);
  // The shield, with a slot at the counter.
  part(g, box(W - 0.06, 0.04, 0.03), GREY_D, 0, T + 0.48, -0.16);
  for (const x of [-0.94, 0, 0.94]) part(g, box(0.03, 0.48, 0.03), GREY_D, x, T + 0.24, -0.16);
  glass(g, W - 0.1, 0.38, 0, T + 0.27, -0.16);
  // Staff side: a shelf underneath, the paper tray, the printer, calculator and stamp.
  part(g, box(W - 0.1, 0.014, 0.3), STEEL, 0, 0.36, 0.2);
  for (let i = 0; i < 3; i++) part(g, box(0.3, 0.05 + i * 0.02, 0.2), [PAPER, '#fdf3d8', '#cfe3ff'][i], -0.5 + i * 0.4, 0.4, 0.2, { outline: false });
  part(g, rbox(0.2, 0.09, 0.2, 0.012), '#dde2e6', DC.print[0], T + 0.045, DC.print[2]);
  part(g, box(0.1, 0.002, 0.03), '#2b2b30', DC.print[0], T + 0.092, DC.print[2] - 0.05, { outline: false });
  // The calculator, big-keyed.
  const calc = group(g, DC.calc[0], T, DC.calc[2]);
  part(calc, rbox(0.16, 0.014, 0.2, 0.006), '#39424b', 0, 0.008, 0, { outline: false });
  const calcScreen = liveScreen(calc, 0.13, 0.036, 128, 36, 0, 0.017, -0.066, 0, -Math.PI / 2);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) part(calc, box(0.024, 0.004, 0.022), j === 3 && i === 3 ? '#e57373' : '#9aa5ad', -0.05 + i * 0.033, 0.017, -0.025 + j * 0.03, { outline: false });
  // The card reader across the counter and a slim screen facing the traveller.
  part(g, rbox(0.1, 0.03, 0.15, 0.01), BLACK, DC.card[0], T + 0.015, DC.card[2]);
  const reader = ownLit(g, box(0.06, 0.002, 0.05), '#3a5a6e', DC.card[0], T + 0.032, DC.card[2] - 0.02);
  part(g, cyl(0.012, 0.016, 0.16, 8), BLACK, 0.62, T + 0.08, -0.28, { outline: false });
  part(g, rbox(0.34, 0.14, 0.02, 0.008), BLACK, 0.62, T + 0.2, -0.28);
  const lcd = liveScreen(g, 0.31, 0.11, 192, 68, 0.62, T + 0.2, -0.292, Math.PI);
  // What moves.
  const flat = (col = PAPER) => {
    const m = group(g);
    part(m, box(0.2, 0.004, 0.28), col, 0, 0, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(m, box(0.15, 0.001, 0.006), GREY_D, 0, 0.0025, -0.1 + i * 0.03, { outline: false });
    return m;
  };
  const form = flat();
  const inked = part(form, cyl(0.03, 0.03, 0.001, 16), RED, 0.05, 0.003, 0.08, { outline: false });
  const slip = group(g);
  part(slip, box(0.12, 0.002, 0.2), PAPER, 0, 0, 0, { outline: false });
  const stamp = stampMesh(g);
  const traveller = person(g, LOOKS.c, DC.cust[0], DC.cust[1], 0, 'male');
  const card = group(g);
  part(card, box(0.085, 0.002, 0.055), '#3f6fb5', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { cuAssessDuty: standAt(g, 'cuDuty', 0, DC.stand) };
  spots['*'] = spots.cuAssessDuty;
  const show = (_now: string | null, N: CuNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(form, P.form);
    inked.visible = (n.stamped ?? 0) > 0.5;
    at(slip, P.slip);
    at(stamp, P.stampAt, DC.stamp);
    const here = n.cust ?? 0;
    comes(traveller, here, DC.cust[0], DC.cust[1], -0.35, t);
    if (traveller.root.visible) {
      const tap = (n.cTap ?? 0) > 0.5;
      const bye = (n.cHand ?? 0) > 0.5;
      traveller.armR(tap ? v3(DC.card[0] + 0.02, T + 0.09 + 0.02 * Math.sin(t * 6), DC.card[2] - 0.02) : bye ? v3(DC.slot[0], DC.slot[1] + 0.05, DC.slot[2] - 0.18) : null);
      traveller.armL(null);
      const sigh = (n.cSigh ?? 0) > 0.5;
      traveller.opts.nod = sigh ? 0.2 + 0.06 * Math.sin(t * 3) : 0.1;
      traveller.head.rotation.x = traveller.opts.nod ?? 0;
    }
    card.visible = (n.cTap ?? 0) > 0.5;
    if (card.visible) card.position.set(DC.card[0] + 0.02, T + 0.05 + 0.02 * Math.sin(t * 6), DC.card[2] - 0.02);
    setLit(reader, (n.paid ?? 0) > 0.5 ? '#7ee89e' : (n.cTap ?? 0) > 0.5 ? '#ffd54f' : '#3a5a6e');
    const sum = n.sum ?? 0;
    const total = Math.round(sum * 42) * 1000;
    const amount = `${total.toLocaleString('en-US')}원`;
    calcScreen.draw(`${q(sum, 42)}`, (c) => {
      c.fillStyle = '#bcd8b0';
      c.fillRect(0, 0, 128, 36);
      text(c, String(total), 122, 18, 22, BLACK, 'right');
    });
    lcd.draw(`${(n.lcd ?? 0) > 0.5 ? amount : 'x'}|${(n.paid ?? 0) > 0.5 ? 1 : 0}`, (c) => {
      c.fillStyle = '#0b1f33';
      c.fillRect(0, 0, 192, 68);
      if ((n.lcd ?? 0) <= 0.5) {
        text(c, '세금 납부 창구', 96, 34, 20, '#ffffff', 'center');
        return;
      }
      text(c, (n.paid ?? 0) > 0.5 ? '납부 완료' : '납부할 세금', 96, 18, 14, (n.paid ?? 0) > 0.5 ? '#7ee89e' : '#9fd8ff', 'center');
      text(c, amount, 96, 46, 26, '#ffffff', 'center');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, show);
  out.work = marker(g, DC.paper[0], DC.paper[1], DC.paper[2]);
}

// =============================================================================================
// Set dressing: where the form's filled in, and what's allowed.

function formStand(g: THREE.Group) {
  part(g, cyl(0.04, 0.05, 1.0, 10), GREY_D, 0, 0.5, -0.06);
  part(g, cyl(0.26, 0.28, 0.03, 16), GREY_D, 0, 0.015, -0.06);
  const top = group(g, 0, 1.02, -0.06);
  top.rotation.x = 0.3;
  part(top, rbox(0.84, 0.03, 0.54, 0.012), CREAM, 0, 0, 0);
  part(top, box(0.82, 0.01, 0.02), GREY_D, 0, 0.02, 0.26, { outline: false });
  const r = seeded(7);
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) part(top, box(0.2, 0.004, 0.28), PAPER, -0.26 + i * 0.26 + (r() - 0.5) * 0.008, 0.017 + k * 0.004, 0.02 + (r() - 0.5) * 0.008, { outline: false });
  part(top, box(0.16, 0.002, 0.03), RED, -0.26, 0.036, -0.08, { outline: false });
  part(top, box(0.16, 0.002, 0.03), GREEN, 0, 0.036, -0.08, { outline: false });
  part(top, box(0.16, 0.002, 0.03), NAVY, 0.26, 0.036, -0.08, { outline: false });
  // Pens on their chains.
  for (const x of [-0.34, 0.34]) {
    part(top, cyl(0.006, 0.006, 0.14, 6), BLACK, x, 0.03, 0.18, { rz: Math.PI / 2 - 0.3, outline: false });
    rod(top, v3(x, 0.03, 0.14), v3(x + 0.04, 0.02, 0.04), 0.002, CHROME);
  }
  const sign = group(g, 0, 1.3, -0.34);
  part(sign, box(0.02, 0.5, 0.02), GREY_D, 0, -0.1, 0);
  label(sign, '휴대품 신고서', 0.62, 0.15, 0, 0.2, 0.012, NAVY, '#ffffff');
}
function limitBoard(g: THREE.Group) {
  part(g, box(0.9, 1.94, 0.06), NAVY, 0, 0.97, -0.38);
  picture(g, painted('cuLimit', 360, 720, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 360, 720);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 360, 84);
    text(c, '면세 안내', 180, 44, 44, '#ffffff', 'center');
    text(c, `${AIRPORT} 세관`, 180, 112, 22, NAVY, 'center');
    const rows: Array<[string, string, string]> = [
      ['기념품', '적당히', GREEN_D],
      ['나무 오리', '두 마리까지', GREEN_D],
      ['손가방', '내가 쓸 만큼', GREEN_D],
      ['사과·귤', '가져올 수 없어요', RED_D],
      ['과일 40상자', '곤란해요', RED_D],
    ];
    rows.forEach(([a, b, col], i) => {
      const y = 170 + i * 92;
      c.strokeStyle = '#c4ced6';
      c.strokeRect(20, y - 34, 320, 80);
      text(c, a, 36, y - 10, 28, BLACK);
      text(c, b, 324, y + 24, 26, col, 'right');
    });
    c.fillStyle = AMBER;
    c.fillRect(0, 640, 360, 80);
    text(c, '모르면 물어보세요!', 180, 682, 30, NAVY_D, 'center');
  }), 0.84, 1.68, 0, 1.0, -0.345);
  part(g, cyl(0.28, 0.3, 0.03, 18), GREY_D, 0, 0.015, -0.36);
}

export const BUILDERS: Record<string, Builder> = {
  baggageXray(g, W, _D, _c, _def, _ctx, out) {
    baggageXray(g, out, W);
  },
  inspectionTable(g, W, _D, _c, _def, _ctx, out) {
    inspectionTable(g, out, W);
  },
  customsDesk(g, W, _D, _c, _def, _ctx, out) {
    customsDesk(g, out, W);
  },
  cuLaneGate(g, W, _D, _c, _def, _ctx, out) {
    laneGate(g, out, W);
  },
  cuDogLane(g, W, _D, _c, _def, _ctx, out) {
    dogLane(g, out, W);
  },
  cuSeizedCage(g, W, _D, _c, _def, _ctx, out) {
    seizedCage(g, out, W);
  },
  cuMonitorDesk(g, W, _D, _c, _def, _ctx, out) {
    monitorDesk(g, out, W);
  },
  cuCarousel(g, _W, _D, _c, _def, _ctx, out) {
    carousel(g, out);
  },
  cuDutyCounter(g, W, _D, _c, _def, _ctx, out) {
    dutyCounter(g, out, W);
  },
  cuFormStand(g) {
    formStand(g);
  },
  cuLimitBoard(g) {
    limitBoard(g);
  },
};
