import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, text } from './doctor';
import { BN, BO, DR, FX, LD, LW, PC, RK, TH, VN, pbNow, pbPhase } from './plumberMotion';
import type { PbMotion, PbNow } from './plumberMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 설비 업체 drawn as itself (2026-11-01 workplace pipeline, at the user's request): a heating and plumbing
 * contractor, the made-up 물길설비. Along the back of the workshop a pipe rack, benches with their chain vises and
 * pegboards of fittings, a threading machine with its oil pan, and a mock-up wall of hot and cold pipes with
 * one joint that always drips; on the floor boilers on service frames, a clear drain run with a clog in it and a
 * spring machine and camera, and a tiled corner with this workplace's own training toilet and basin (not the
 * house's, which aren't touched); a parts counter across the lobby's end; the service van in the yard.
 *
 * Everything that moves follows the scripts in plumberMotion.ts; other people are played by VRoid bodies where
 * there are any (vroidFigure.ts). The company and the brands on its boxes are made up.
 */

const BRAND = '물길설비';
const BLUE = '#1565c0';
const BLUE_D = '#0d3f7a';
const HOT = '#d84a3a';
const COLD = '#2f7fc1';
const COPPER = '#c77b4a';
const GALV = '#9aa5ab';
const PVC = '#d9dde0';
const BRASS = '#c9a13b';
const GAS = '#e8b923';
const WOOD = '#c8b690';
const SKIN = '#f1c9a5';
const PAPER = '#fbfaf6';
const PEG = '#d7cfc0';
const RED = '#c62828';
const FRAME = '#51606a';
const INK = '#263238';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
const place = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
/** At the script's place while it says so, hidden or at home otherwise. */
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  m.visible = !!(p ?? home);
  if (p) place(m, p);
  else if (home) place(m, home);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture | null) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function standAt(g: THREE.Object3D, motion: PbMotion, z = 0.6): Spot {
  const s = spot(g, 'stand', 0, 0, z, Math.PI);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: PbNow | null, t: number, gone: boolean) => void) {
  out.spots = spots;
  out.away = (gone, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? pbNow(sp.motion as PbMotion, t, pbPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t, gone);
  };
}
/** A picture drawn afresh each frame while something's going on: one small canvas, made when first needed. */
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  return (paint: (c: CanvasRenderingContext2D) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (ctx) paint(ctx);
    tex.needsUpdate = true;
    return tex;
  };
}
/** Steam, chips, spray: soft balls from a place, each on its own loop. */
function puffs(g: THREE.Object3D, n: number, color = '#ffffff', size = 0.05) {
  const list = Array.from({ length: n }, () => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(ball(size), mat);
    m.userData.ownMaterial = true;
    m.visible = false;
    g.add(m);
    return { m, mat };
  });
  return (strength: number, x: number, y: number, z: number, spread: number, t: number, rise = 0.5) => {
    list.forEach(({ m, mat }, i) => {
      const u = (t * 0.55 + i / n) % 1;
      m.visible = strength > 0.03;
      if (!m.visible) return;
      const s = Math.sin(i * 12.9) * 0.5;
      m.position.set(x + spread * s * 2 + 0.03 * Math.sin(t * 2 + i), y + u * rise, z + spread * Math.cos(i * 7.7) * 0.6);
      m.scale.setScalar(0.6 + u * 1.6);
      mat.opacity = Math.min(1, strength) * 0.5 * (1 - u) * Math.min(1, u * 6);
    });
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
/** A length of pipe between two points, with its colour. */
const pipe = (g: THREE.Object3D, a: V, b: V, r: number, color: string) => rod(g, v3(a[0], a[1], a[2]), v3(b[0], b[1], b[2]), r, color);
/** A length along x, its origin at `x0` along it. */
function xPipe(g: THREE.Object3D, from: number, to: number, r: number, color: string): THREE.Mesh {
  return part(g, cyl(r, r, to - from, 12), color, (from + to) / 2, 0, 0, { rz: Math.PI / 2 });
}

// Tools and small things. Each has its origin about where it's held.

/** Jaw at the origin, the handle hanging from it. */
function wrenchMesh(g: THREE.Object3D, L = 0.26, color = RED): THREE.Group {
  const w = group(g);
  part(w, box(0.03, L, 0.018), color, 0, -L / 2, 0);
  part(w, box(0.05, 0.05, 0.04), STEEL, 0, 0.01, 0);
  part(w, box(0.075, 0.018, 0.04), STEEL, 0.012, 0.045, 0, { outline: false });
  part(w, cyl(0.01, 0.01, 0.03, 8), BLACK, -0.015, 0.03, 0, { outline: false });
  return w;
}
function clipMesh(g: THREE.Object3D, tex: THREE.Texture, w = 0.2, h = 0.27): { root: THREE.Group; sheet: THREE.Mesh } {
  const root = group(g);
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, box(w + 0.02, h + 0.02, 0.008), '#6d4c41', 0, 0, 0, { outline: false });
  const sheet = picture(tilt, tex, w, h, 0, -0.005, 0.006);
  part(tilt, box(0.07, 0.022, 0.012), CHROME, 0, h / 2 - 0.005, 0.01, { outline: false });
  return { root, sheet };
}
const penMesh = (g: THREE.Object3D): THREE.Mesh => part(g, cyl(0.005, 0.005, 0.13, 6), BLUE, 0, 0, 0, { rx: 0.7, rz: 0.3, outline: false });
function rollMesh(g: THREE.Object3D): THREE.Mesh {
  const m = part(g, new THREE.TorusGeometry(0.022, 0.012, 8, 14), '#fafafa', 0, 0, 0, { ry: Math.PI / 2, outline: false });
  m.userData.ownGeometry = true;
  return m;
}
/** A tape measure: the body and a blade drawn out along −x from it (or +x), scaled by `set`. */
function tapeMesh(g: THREE.Object3D, dir = 1): { root: THREE.Group; set(l: number): void } {
  const root = group(g);
  part(root, rbox(0.07, 0.07, 0.03, 0.012), '#fbc02d', 0, 0, 0);
  const blade = part(root, box(1, 0.002, 0.018), '#fff59d', dir * 0.5, -0.03, 0, { outline: false });
  return {
    root,
    set(l) {
      blade.scale.x = Math.max(0.001, l);
      blade.position.x = (dir * Math.max(0.001, l)) / 2;
    },
  };
}
function fitting(g: THREE.Object3D, kind: 'elbow' | 'tee' | 'union' | 'valve', color = BRASS): THREE.Group {
  const f = group(g);
  const r = 0.024;
  if (kind === 'elbow') {
    part(f, cyl(r, r, 0.05, 10), color, -0.025, 0, 0, { rz: Math.PI / 2 });
    part(f, cyl(r, r, 0.05, 10), color, 0, 0.025, 0);
    part(f, ball(r), color, 0, 0, 0, { outline: false });
  } else if (kind === 'tee') {
    part(f, cyl(r, r, 0.1, 10), color, 0, 0, 0, { rz: Math.PI / 2 });
    part(f, cyl(r, r, 0.05, 10), color, 0, 0.03, 0);
  } else if (kind === 'union') {
    part(f, cyl(r * 0.9, r * 0.9, 0.1, 10), color, 0, 0, 0, { rz: Math.PI / 2 });
    part(f, cyl(r * 1.35, r * 1.35, 0.036, 6), shade(color, 0.86), 0, 0, 0, { rz: Math.PI / 2 });
  } else {
    part(f, cyl(r, r, 0.1, 10), color, 0, 0, 0, { rz: Math.PI / 2 });
    part(f, ball(r * 1.35), color, 0, 0, 0, { outline: false });
    part(f, cyl(0.006, 0.006, 0.04, 6), STEEL, 0, 0.04, 0, { outline: false });
    part(f, box(0.075, 0.01, 0.018), RED, 0.02, 0.06, 0, { outline: false });
  }
  return f;
}
const FITS: Array<['elbow' | 'tee' | 'union' | 'valve', string]> = [['elbow', '엘보'], ['tee', '티'], ['union', '유니온'], ['valve', '볼 밸브']];
/** A dial on a pipe: its own needle, turned by `set` (0–1 of the sweep). */
function dial(g: THREE.Object3D, x: number, y: number, z: number, r: number, face: string, unit: string, max: number): (v: number) => void {
  part(g, cyl(r + 0.012, r + 0.012, 0.03, 20), BLACK, x, y, z - 0.015, { rx: Math.PI / 2 });
  picture(g, painted(`pbDial${face}${max}${unit}`, 128, 128, (c) => {
    c.fillStyle = PAPER;
    c.beginPath();
    c.arc(64, 64, 64, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      c.beginPath();
      c.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46);
      c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56);
      c.stroke();
    }
    c.strokeStyle = face;
    c.lineWidth = 7;
    c.beginPath();
    c.arc(64, 64, 52, Math.PI * 1.9, Math.PI * 2.25);
    c.stroke();
    text(c, unit, 64, 92, 18, INK, 'center');
    text(c, `0-${max}`, 64, 112, 12, '#607d8b', 'center');
  }), r * 1.9, r * 1.9, x, y, z + 0.003);
  const needle = group(g, x, y, z + 0.008);
  part(needle, box(0.005, r * 0.85, 0.003), RED, 0, r * 0.4, 0, { outline: false });
  return (v) => {
    needle.rotation.z = Math.PI * 0.75 - Math.min(1, Math.max(0, v)) * Math.PI * 1.5;
  };
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const LOOKS: Record<string, Look> = {
  foreman: { top: BLUE, bottom: '#37474f', hair: '#444444', skin: '#eac09a' },
  client: { top: '#8d6e63', bottom: '#3e2723', hair: '#9e9e9e', skin: '#eac09a' },
  buyer: { top: '#26a69a', bottom: '#263238', hair: '#2b1b10' },
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
  // `nod` is read off these options every frame.
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}

// =============================================================================================
// 배관 작업대 (pipeBench, 2 × 1).

function pipeBench(g: THREE.Group, out: Built) {
  // The bench: angle-iron legs, a steel top, a shelf under it with what's been finished.
  for (const x of [-0.88, 0.88]) for (const z of [-0.38, 0.26]) part(g, box(0.06, 0.84, 0.06), FRAME, x, 0.42, z);
  part(g, rbox(1.9, 0.05, 0.74, 0.012), '#8d99a1', 0, 0.86, -0.06);
  part(g, box(1.84, 0.012, 0.68), '#a9b4bb', 0, 0.888, -0.06, { outline: false });
  part(g, box(1.8, 0.03, 0.6), '#7c6b58', 0, 0.3, -0.06);
  for (let i = 0; i < 3; i++) {
    const done = group(g, -0.05 + i * 0.03, 0.34, 0.12 - i * 0.1);
    xPipe(done, -0.55, 0.28, 0.021, i === 1 ? COPPER : GALV);
    place(fitting(done, 'elbow'), [0.31, 0, 0]);
  }
  // The pegboard: wrenches by size, a hacksaw, rolls of tape, the fittings with their names.
  part(g, box(1.92, 0.88, 0.02), PEG, 0, 1.34, -0.44);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 16; x++) part(g, box(0.008, 0.008, 0.002), shade(PEG, 0.72), -0.84 + x * 0.112, 0.98 + y * 0.14, -0.428, { outline: false });
  for (const x of [-0.94, 0.94]) part(g, box(0.04, 0.9, 0.04), FRAME, x, 1.34, -0.44);
  label(g, '배관 부속 이름', 0.5, 0.07, 0, 1.72, -0.428, BLUE, '#ffffff');
  const lamps: THREE.Mesh[] = [];
  FITS.forEach(([kind, name], i) => {
    const x = BN.board[i][0];
    place(fitting(g, kind), [x, 1.5, -0.4]);
    label(g, name, 0.22, 0.07, x, 1.38, -0.428, '#ffffff', INK);
    lamps.push(ownLit(g, ball(0.014), '#3b2a18', x, 1.62, -0.42));
  });
  [0.3, 0.24, 0.2].forEach((L, i) => {
    const w = wrenchMesh(g, L, i === 1 ? '#1565c0' : RED);
    place(w, [-0.86 + i * 0.1, 1.26, -0.42]);
  });
  // A hacksaw and tapes on the right.
  part(g, box(0.34, 0.01, 0.01), STEEL, 0.72, 1.14, -0.42, { outline: false });
  rod(g, v3(0.56, 1.14, -0.42), v3(0.56, 1.24, -0.42), 0.008, RED);
  rod(g, v3(0.88, 1.14, -0.42), v3(0.88, 1.24, -0.42), 0.008, RED);
  rod(g, v3(0.56, 1.24, -0.42), v3(0.88, 1.24, -0.42), 0.008, RED);
  for (let i = 0; i < 3; i++) place(rollMesh(g), [0.64 + i * 0.09, 1.04, -0.41]);
  // The spare lengths on their blocks, along the back of the bench.
  for (const x of [-0.5, 0.5]) part(g, box(0.06, 0.03, 0.2), '#6d4c41', x, 0.905, -0.28);
  [[-0.22, GALV], [-0.27, COPPER], [-0.32, GALV]].forEach(([z, col], i) => {
    const s = group(g, 0, 0.94 + (i === 1 ? 0.03 : 0), z as number);
    xPipe(s, -0.6, 0.6 - i * 0.05, 0.02, col as string);
  });
  // The chain vise: its yoke, the chain over, the handle on top turning.
  const vs = group(g, BN.vise[0], 0, BN.vise[2]);
  part(vs, box(0.2, 0.06, 0.24), '#37474f', 0, 0.92, 0);
  part(vs, box(0.1, 0.1, 0.14), BLUE_D, 0, 0.97, 0);
  for (const sx of [-1, 1]) part(vs, box(0.03, 0.2, 0.03), '#37474f', sx * 0.06, 1.1, -0.07);
  part(vs, box(0.16, 0.03, 0.05), '#37474f', 0, 1.13, 0);
  const handle = group(g, BN.handle[0], BN.handle[1], BN.handle[2]);
  part(handle, cyl(0.009, 0.009, 0.12, 8), CHROME, 0, -0.06, 0, { outline: false });
  part(handle, cyl(0.007, 0.007, 0.16, 8), CHROME, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  // The offcut bin at the right end.
  part(g, cyl(0.13, 0.1, 0.46, 14), '#546e7a', BN.bin[0], 0.23, BN.bin[2]);
  part(g, cyl(0.12, 0.12, 0.01, 14), '#1d2428', BN.bin[0], 0.465, BN.bin[2], { outline: false });
  for (let i = 0; i < 3; i++) part(g, cyl(0.02, 0.02, 0.2, 8), i ? GALV : COPPER, BN.bin[0] - 0.05 + i * 0.05, 0.5, BN.bin[2] + 0.02, { rz: 0.5 - i * 0.35, outline: false });
  // The tray of fittings and the stub to try them on.
  part(g, box(0.92, 0.02, 0.1), '#37474f', 0, 0.9, BN.tray[0][2]);
  const fits = FITS.map(([kind]) => fitting(g, kind));
  part(g, box(0.1, 0.1, 0.1), '#37474f', BN.stub[0] + 0.14, 0.94, BN.stub[2]);
  const stub = group(g, BN.stub[0], BN.stub[1], BN.stub[2]);
  xPipe(stub, 0, 0.14, 0.021, GALV);
  // What's in use.
  const pipeG = group(g);
  const long = xPipe(pipeG, -0.55, BN.cutX, 0.021, GALV);
  long.castShadow = true;
  const offOn = xPipe(pipeG, BN.cutX, 0.55, 0.021, GALV);
  const ring = part(pipeG, cyl(0.022, 0.022, 0.006, 12), BLACK, BN.cutX, 0, 0, { rz: Math.PI / 2, outline: false });
  const wrap = part(pipeG, cyl(0.024, 0.024, 0.05, 12), '#fafafa', BN.cutX - 0.03, 0, 0, { rz: Math.PI / 2, outline: false });
  const offcut = group(g);
  xPipe(offcut, -0.13, 0.13, 0.021, GALV);
  const elbow = fitting(g, 'elbow');
  const cutter = group(g);
  const cutterRot = group(cutter);
  const yoke = part(cutterRot, new THREE.TorusGeometry(0.05, 0.012, 8, 20), BLUE, 0, 0, 0, { ry: Math.PI / 2 });
  yoke.userData.ownGeometry = true;
  part(cutterRot, cyl(0.009, 0.009, 0.13, 8), CHROME, 0, -0.1, 0, { outline: false });
  part(cutterRot, cyl(0.018, 0.018, 0.03, 8), BLACK, 0, -0.17, 0, { outline: false });
  part(cutterRot, cyl(0.016, 0.016, 0.01, 10), STEEL, 0, 0.032, 0, { rz: Math.PI / 2, outline: false });
  const reamer = group(g);
  const reamerRot = group(reamer);
  part(reamerRot, cyl(0.002, 0.024, 0.05, 8), STEEL, 0.025, 0, 0, { rz: Math.PI / 2, outline: false });
  part(reamerRot, cyl(0.016, 0.016, 0.1, 8), '#ef6c00', 0.08, 0, 0, { rz: Math.PI / 2 });
  const roll = group(g);
  rollMesh(roll);
  const wrench = wrenchMesh(g, 0.26);
  const level = group(g);
  part(level, rbox(0.3, 0.035, 0.03, 0.005), '#fbc02d', 0, 0, 0);
  ownLit(level, box(0.05, 0.012, 0.004), '#c6ff00', 0, 0.002, 0.016);
  const bub = part(level, ball(0.006), '#ffffff', 0, 0.002, 0.019, { outline: false });
  const tape = tapeMesh(g);
  const pencil = part(g, cyl(0.005, 0.005, 0.11, 6), '#ffb300', 0, 0, 0, { rz: 0.5, outline: false });
  const chips = puffs(g, 4, '#cfd8dc', 0.007);
  const foreman = person(g, LOOKS.foreman, BN.boss[0], BN.boss[1], -Math.PI * 0.82, 'male');
  const spots: Record<string, Spot> = { cutPipes: standAt(g, 'pbCut'), plumber_learnFittings: standAt(g, 'pbLearn') };
  spots['*'] = spots.cutPipes;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(pipeG, P.pipe);
    offOn.visible = (n.off ?? 0) < 0.5;
    ring.visible = (n.ring ?? 0) > 0.5;
    wrap.visible = (n.wrap ?? 0) > 0.05;
    wrap.scale.x = wrap.scale.z = 0.9 + 0.1 * (n.wrap ?? 0);
    at(offcut, P.offcut);
    at(elbow, P.elbow);
    at(cutter, P.cutter);
    cutterRot.rotation.x = n.cutA ?? 0;
    at(reamer, P.reamer);
    reamerRot.rotation.x = n.twist ?? 0;
    at(roll, P.roll);
    at(wrench, P.wrench);
    wrench.rotation.x = n.wrA ?? -0.7;
    at(level, P.level);
    bub.position.x = 0.018 * (n.bubble ?? 0);
    at(tape.root, P.tape);
    tape.set(n.blade ?? 0);
    at(pencil, P.pencil);
    handle.rotation.y = (n.viseA ?? 0) || 0.4;
    chips(n.chips ?? 0, BN.cutX, BN.pipe[1] - 0.02, BN.pipe[2], 0.02, t * 2.4, -0.14);
    // The tray: each at home, the one in hand where it's held.
    const lit = n.lit ?? 0;
    fits.forEach((f, i) => {
      at(f, P[`f${i}`], BN.tray[i]);
      f.rotation.y = P[`f${i}`] ? (n.turn ?? 0) : 0.3;
    });
    lamps.forEach((m, i) => setLit(m, Math.round(lit) === i + 1 ? '#ffd54f' : '#3b2a18'));
    // The foreman, when he's teaching: pointing up at the name on the board.
    foreman.root.visible = now === 'plumber_learnFittings';
    if (foreman.root.visible) {
      const pointing = (n.point ?? 0) > 0.4 && lit > 0;
      foreman.armL(null);
      foreman.armR(pointing ? tmp.set(BN.board[Math.round(lit) - 1][0], BN.board[0][1], BN.board[0][2]).clone() : null);
      foreman.opts.nod = 0.1 + 0.22 * (n.nodB ?? 0) * Math.abs(Math.sin(t * 2.4));
    }
  });
  out.work = marker(g, BN.pipe[0], BN.pipe[1], BN.pipe[2]);
}

// =============================================================================================
// 나사 절삭기 (pbThreader, 2 × 1).

function threader(g: THREE.Group, out: Built) {
  // The stand, the long oil pan with its chips, and the rails.
  for (const x of [-0.8, 0.8]) for (const z of [-0.28, 0.3]) part(g, box(0.06, 0.68, 0.06), FRAME, x, 0.34, z);
  part(g, box(1.72, 0.04, 0.62), FRAME, 0, 0.26, 0.01);
  part(g, rbox(1.86, 0.1, 0.66, 0.02), '#37474f', 0, 0.72, 0.01);
  ownLit(g, box(1.6, 0.004, 0.46), '#3d2f12', 0.08, 0.772, 0.01);
  for (let i = 0; i < 18; i++) {
    const c = part(g, new THREE.TorusGeometry(0.018, 0.003, 5, 8, 4), i % 3 ? '#cfd8dc' : BRASS, -0.42 + ((i * 53) % 90) * 0.012, 0.782, -0.14 + ((i * 29) % 30) * 0.01, { rx: 1.3, ry: i });
    c.userData.ownGeometry = true;
  }
  for (const z of [-0.14, 0.18]) part(g, cyl(0.016, 0.016, 1.5, 10), CHROME, 0.1, 0.84, z, { rz: Math.PI / 2 });
  // The headstock: the motor behind, the chuck turning at the front of it.
  part(g, rbox(0.34, 0.48, 0.56, 0.03), '#d84315', -0.72, 1.03, 0);
  part(g, cyl(0.12, 0.12, 0.3, 16), '#37474f', -0.72, 1.12, -0.34, { rx: Math.PI / 2 });
  label(g, '나사 절삭기', 0.28, 0.07, -0.72, 1.18, 0.283, '#d84315', '#ffffff');
  const chuck = group(g, TH.chuck, TH.y, TH.z);
  part(chuck, cyl(0.15, 0.15, 0.1, 18), BLACK, 0.06, 0, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 3; i++) {
    const j = group(chuck);
    j.rotation.x = (i * Math.PI * 2) / 3;
    part(j, box(0.06, 0.09, 0.04), CHROME, 0.12, 0.08, 0, { outline: false });
  }
  // The chuck's tightening wheel.
  const chuckWheel = group(g, TH.chuck + 0.1, TH.y, TH.z + 0.24);
  const cw = part(chuckWheel, new THREE.TorusGeometry(0.08, 0.008, 6, 18), CHROME, 0, 0, 0, { outline: false });
  cw.userData.ownGeometry = true;
  part(chuckWheel, box(0.16, 0.012, 0.012), CHROME, 0, 0, 0, { outline: false });
  // The carriage: moves along the rails with its wheel and its die, which hinges down on the pipe.
  const car = group(g, TH.dieX, TH.y, TH.z);
  part(car, rbox(0.24, 0.14, 0.42, 0.02), BLUE, 0, -0.13, 0.02);
  const wheel = group(car, TH.wheel[0], TH.wheel[1], TH.wheel[2]);
  const ww = part(wheel, new THREE.TorusGeometry(0.07, 0.009, 6, 18), CHROME, 0, 0, 0, { outline: false });
  ww.userData.ownGeometry = true;
  for (const a of [0, Math.PI / 2]) part(wheel, box(0.14, 0.01, 0.01), CHROME, 0, 0, 0, { rz: a, outline: false });
  part(car, cyl(0.012, 0.012, 0.12, 8), STEEL, 0, TH.wheel[1], 0.22, { rx: Math.PI / 2, outline: false });
  const die = group(car, 0, 0.14, 0);
  part(die, cyl(0.075, 0.075, 0.09, 14), '#455a64', 0, -0.09, 0, { rz: Math.PI / 2 });
  part(die, cyl(0.035, 0.035, 0.1, 10), '#90a4ae', 0, -0.09, 0, { rz: Math.PI / 2, outline: false });
  part(die, cyl(0.009, 0.009, 0.12, 8), RED, 0, 0, 0.06, { rx: 0.9, outline: false });
  // The oil nozzle over the die.
  rod(car, v3(-0.03, 0.2, -0.16), v3(-0.07, 0.08, 0), 0.008, '#37474f');
  // The switch box, a can of oil, the rag and the thread gauge at home.
  part(g, rbox(0.14, 0.2, 0.1, 0.012), '#fbc02d', TH.sw[0], TH.sw[1], TH.sw[2] - 0.06);
  rod(g, v3(TH.sw[0], 0.76, TH.sw[2] - 0.06), v3(TH.sw[0], TH.sw[1] - 0.1, TH.sw[2] - 0.06), 0.012, FRAME);
  ownLit(g, cyl(0.022, 0.022, 0.01, 10), '#2e7d32', TH.sw[0] - 0.03, TH.sw[1] + 0.03, TH.sw[2] - 0.006).rotation.x = Math.PI / 2;
  const redBtn = ownLit(g, cyl(0.022, 0.022, 0.01, 10), '#6a0d0d', TH.sw[0] + 0.03, TH.sw[1] + 0.03, TH.sw[2] - 0.006);
  redBtn.rotation.x = Math.PI / 2;
  part(g, cyl(0.05, 0.06, 0.12, 12), '#2e7d32', 0.54, 0.84, 0.28);
  part(g, cyl(0.006, 0.02, 0.1, 8), '#2e7d32', 0.54, 0.95, 0.3, { rx: 0.4, outline: false });
  label(g, '절삭유', 0.08, 0.035, 0.54, 0.84, 0.34, '#ffffff', INK);
  const rag = group(g);
  part(rag, rbox(0.12, 0.018, 0.09, 0.008), '#ffb74d', 0, 0, 0, { outline: false });
  const gauge = group(g);
  part(gauge, cyl(0.035, 0.035, 0.03, 10), '#90a4ae', 0, 0, 0, { rz: Math.PI / 2 });
  // The pipe in the chuck: the thread ribs come up on its end as the die goes along.
  const pipeG = group(g);
  xPipe(pipeG, -0.6, TH.dieX + 0.05, 0.026, GALV);
  const ribs = group(pipeG);
  const ribList: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) ribList.push(part(ribs, cyl(0.0275, 0.0275, 0.01, 12), i % 2 ? '#d7dde0' : '#6f7c84', TH.dieX + 0.04 - i * 0.022, 0, 0, { rz: Math.PI / 2, outline: false }));
  const oil = puffs(g, 5, '#6d4c1b', 0.008);
  const curls = puffs(g, 4, '#eceff1', 0.007);
  const spots: Record<string, Spot> = { pbThreadPipe: standAt(g, 'pbThread') };
  spots['*'] = spots.pbThreadPipe;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const run = n.run ?? 0;
    chuck.rotation.x = run > 0.1 ? t * 14 : 0;
    chuckWheel.rotation.z = (n.jaws ?? 0) * 4;
    const f = n.f ?? 0;
    car.position.x = TH.dieX - TH.feed * f;
    wheel.rotation.z = f * 9;
    die.position.y = 0.14 + 0.13 * (1 - (n.die ?? 0));
    at(pipeG, P.pipe);
    // Spinning with the chuck.
    pipeG.rotation.x = run > 0.1 ? t * 14 : 0;
    const th = n.thread ?? 0;
    ribList.forEach((m, i) => (m.visible = th * 10 > i));
    const cut = run > 0.3 && (n.oil ?? 0) > 0.5;
    const dx = car.position.x;
    oil(cut ? 1 : 0, dx - 0.07, TH.y + 0.02, TH.z, 0.02, t * 2.6, -0.24);
    curls(cut ? 1 : 0, dx + 0.07, TH.y - 0.03, TH.z, 0.04, t * 1.7, -0.22);
    at(rag, P.rag, TH.rag);
    at(gauge, P.gauge, TH.gauge);
    setLit(redBtn, run > 0.1 ? '#ff5252' : '#6a0d0d');
  });
  // Where the rag and the gauge wait: the end of the pan.
  part(g, box(0.2, 0.012, 0.14), '#455a64', TH.gauge[0], 0.875, TH.gauge[2], { outline: false });
  part(g, cyl(0.008, 0.008, 0.1, 6), FRAME, TH.gauge[0], 0.82, TH.gauge[2], { outline: false });
  out.work = marker(g, 0.2, TH.y, TH.z + 0.08);
}

// =============================================================================================
// 파이프 랙 (pbPipeRack, 2 × 1).

function pipeRack(g: THREE.Group, out: Built) {
  for (const x of [-0.88, 0, 0.88]) {
    part(g, box(0.08, 1.74, 0.08), BLUE_D, x, 0.87, -0.38);
    part(g, box(0.1, 0.05, 0.6), BLUE_D, x, 0.03, -0.14);
    for (const y of RK.tiers) {
      part(g, box(0.05, 0.04, 0.46), '#ef6c00', x, y, -0.15);
      part(g, box(0.05, 0.06, 0.02), '#ef6c00', x, y + 0.03, 0.08);
    }
  }
  part(g, box(1.86, 0.06, 0.08), BLUE_D, 0, 1.72, -0.38);
  // By tier: drain pipe, steel, copper; each with a tag along its front.
  const T: Array<[number, string, string, number]> = [[0.05, PVC, 'PVC 50A', 3], [0.026, GALV, '강관 20A', 6], [0.016, COPPER, '동관 15A', 8]];
  T.forEach(([r, col, name, count], ti) => {
    const y = RK.tiers[ti] + 0.02 + r;
    for (let i = 0; i < count; i++) {
      const row = i % 2;
      const m = group(g, 0, y + row * r * 1.6, -0.3 + (i * 0.34) / count);
      xPipe(m, -0.98 + ((i * 7) % 5) * 0.012, 0.98 - ((i * 3) % 5) * 0.012, r, col);
    }
    label(g, name, 0.24, 0.06, -0.44 + ti * 0.44, RK.tiers[ti] + 0.01, 0.1, '#ffffff', INK);
  });
  // A coil of orange 엑셀 on top, a coil of drain hose on the floor at the end.
  const coil = part(g, new THREE.TorusGeometry(0.26, 0.04, 8, 26), '#ef6c00', 0.42, 1.8, -0.3, { rx: Math.PI / 2 });
  coil.userData.ownGeometry = true;
  const coil2 = part(g, new THREE.TorusGeometry(0.2, 0.03, 8, 22), '#ef6c00', 0.42, 1.86, -0.3, { rx: Math.PI / 2 });
  coil2.userData.ownGeometry = true;
  label(g, '엑셀관', 0.14, 0.05, 0.42, 1.8, -0.02, '#ffffff', INK);
  // The sheet on its arm.
  rod(g, v3(0.88, 1.0, -0.2), v3(0.88, 1.0, 0.3), 0.01, FRAME);
  const sheet = clipMesh(g, painted('pbCutList', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '자재 요청서', 64, 16, 15, INK, 'center');
    [['동관 15A', '6m'], ['강관 20A', '4m'], ['엘보 20A', '8개'], ['유니온', '2개'], ['테프론', '5개']].forEach(([a, b], i) => {
      text(c, a, 8, 48 + i * 22, 13, INK);
      text(c, b, 120, 48 + i * 22, 13, BLUE, 'right');
    });
  }), 0.15, 0.2);
  const pipeG = group(g);
  xPipe(pipeG, -0.56, 0.56, 0.026, GALV);
  const tag = part(pipeG, box(0.06, 0.04, 0.003), '#ffd54f', 0.12, -0.04, 0.03, { outline: false });
  const tape = tapeMesh(g);
  const spots: Record<string, Spot> = { pbPickPipe: standAt(g, 'pbPick', 0.68) };
  spots['*'] = spots.pbPickPipe;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(pipeG, P.pipe, [0, RK.tiers[1] + 0.05, RK.z + 0.14]);
    tag.visible = (n.tagged ?? 0) > 0.5;
    at(sheet.root, P.sheet, RK.sheet);
    at(tape.root, P.tape);
    tape.set(n.blade ?? 0);
  });
  out.work = marker(g, 0, RK.tiers[1] + 0.1, 0.1);
}

// =============================================================================================
// 누수 탐지기 (leakDetector, 1 × 1).

function leakDetector(g: THREE.Group, out: Built) {
  // A hand cart with the case on top, its pole in a holder on the side.
  part(g, rbox(0.56, 0.05, 0.46, 0.012), '#37474f', 0, 0.14, 0);
  for (const x of [-0.22, 0.22]) for (const z of [-0.18, 0.18]) part(g, cyl(0.055, 0.055, 0.04, 12), BLACK, x, 0.06, z, { rz: Math.PI / 2 });
  for (const x of [-0.24, 0.24]) part(g, box(0.035, 0.76, 0.035), FRAME, x, 0.53, -0.14);
  part(g, box(0.56, 0.03, 0.38), '#607d8b', 0, 0.86, 0);
  rod(g, v3(-0.24, 0.9, -0.14), v3(-0.24, 1.46, -0.26), 0.012, FRAME);
  rod(g, v3(0.24, 0.9, -0.14), v3(0.24, 1.46, -0.26), 0.012, FRAME);
  rod(g, v3(-0.24, 1.46, -0.26), v3(0.24, 1.46, -0.26), 0.012, FRAME);
  // A coil of spare hose and a case below; the sign.
  part(g, rbox(0.34, 0.26, 0.3, 0.02), '#fbc02d', 0, 0.3, -0.02);
  part(g, box(0.1, 0.02, 0.02), BLACK, 0, 0.4, 0.13, { outline: false });
  label(g, '누수 탐지 장비', 0.28, 0.07, 0, 0.29, 0.132, '#fbc02d', INK);
  // The instrument, its face tilted up to whoever's at it.
  const inst = group(g, 0, 1.04, 0.02);
  inst.rotation.x = -0.55;
  part(inst, rbox(0.46, 0.34, 0.14, 0.02), '#263238', 0, 0, 0);
  const screen = swapPic(inst, 0.3, 0.2, -0.05, 0.03, 0.075);
  for (let i = 0; i < 3; i++) part(inst, cyl(0.018, 0.018, 0.018, 12), i === 2 ? RED : CHROME, 0.17, 0.09 - i * 0.07, 0.08, { rx: Math.PI / 2, outline: false });
  label(inst, '음청식 탐지기', 0.26, 0.04, -0.05, -0.12, 0.072, '#263238', '#b0bec5');
  const idle = painted('pbLdIdle', 192, 128, (c) => {
    c.fillStyle = '#10201a';
    c.fillRect(0, 0, 192, 128);
    text(c, '대기', 96, 64, 22, '#3fae7c', 'center');
  });
  screen.set(idle);
  const wave = live(192, 128);
  // The earpiece on its hook, its cord; the pole with the ground mic.
  const ear = group(g);
  part(ear, cyl(0.035, 0.035, 0.03, 14), BLACK, 0, 0, 0, { rz: Math.PI / 2 });
  const cord = limb(g, 0.005, BLACK);
  const cordFrom = v3(-0.2, 0.96, 0.08);
  part(g, cyl(0.006, 0.006, 0.05, 6), CHROME, LD.ear[0], LD.ear[1] + 0.03, LD.ear[2] - 0.03, { outline: false });
  const pole = group(g);
  part(pole, cyl(0.05, 0.06, 0.05, 14), '#455a64', 0, 0.02, 0);
  part(pole, cyl(0.009, 0.009, 0.86, 8), CHROME, 0, 0.47, 0, { outline: false });
  part(pole, cyl(0.016, 0.016, 0.12, 8), BLACK, 0, 0.86, 0, { outline: false });
  part(g, cyl(0.022, 0.022, 0.03, 10), FRAME, LD.pole[0], 0.72, LD.pole[2], { outline: false });
  rod(g, v3(LD.pole[0], 0.72, LD.pole[2]), v3(0.24, 0.72, -0.1), 0.008, FRAME);
  const poleWire = limb(g, 0.004, BLACK);
  // The tablet.
  const tablet = group(g);
  tablet.rotation.set(-0.8, -Math.PI / 2, 0, 'YXZ');
  part(tablet, rbox(0.24, 0.17, 0.012, 0.008), BLACK, 0, 0, 0);
  const tabScreen = swapPic(tablet, 0.21, 0.145, 0, 0, 0.0075);
  const page = (i: number) =>
    painted(`pbLeakPage${i}`, 192, 132, (c) => {
      c.fillStyle = '#f7f5ef';
      c.fillRect(0, 0, 192, 132);
      c.strokeStyle = '#90a4ae';
      c.lineWidth = 3;
      c.strokeRect(10, 24, 172, 96);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(90, 24);
      c.lineTo(90, 120);
      c.moveTo(10, 72);
      c.lineTo(90, 72);
      c.stroke();
      c.strokeStyle = COLD;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(20, 110);
      c.lineTo(140, 110);
      c.lineTo(140, 40);
      c.stroke();
      text(c, i === 3 ? '수리 2일 · 약 40만 원' : '배관 평면도', 96, 12, 13, INK, 'center');
      if (i >= 2) {
        c.fillStyle = HOT;
        c.beginPath();
        c.arc(140, 72, 8 + 2 * (i % 2), 0, Math.PI * 2);
        c.fill();
        text(c, '여기서 샘', 136, 92, 12, HOT, 'right');
      }
    });
  // The mock-up floor in front: tiled, with the pipe's run under it faint, and the marks.
  picture(g, painted('pbLeakFloor', 256, 256, (c) => {
    c.fillStyle = '#b6bcb9';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#98a09c';
    c.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      c.beginPath();
      c.moveTo(i * 64, 0);
      c.lineTo(i * 64, 256);
      c.moveTo(0, i * 64);
      c.lineTo(256, i * 64);
      c.stroke();
    }
    c.strokeStyle = '#7f9aa8';
    c.setLineDash([12, 10]);
    c.beginPath();
    c.moveTo(0, 60);
    c.bezierCurveTo(120, 80, 110, 170, 256, 210);
    c.stroke();
    c.setLineDash([]);
    LD.marks.forEach(([x, z], i) => {
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(128 + (x / 0.92) * 256, 128 + ((z - LD.pad) / 0.92) * 256, 12, 0, Math.PI * 2);
      c.fill();
      text(c, `${i + 1}`, 128 + (x / 0.92) * 256, 128 + ((z - LD.pad) / 0.92) * 256, 15, INK, 'center');
    });
  }), 0.92, 0.92, 0, 0.012, LD.pad, '#ffffff', 0, -Math.PI / 2);
  const crossAt = LD.marks[2];
  const cross = group(g, crossAt[0], 0.018, crossAt[1]);
  for (const a of [Math.PI / 4, -Math.PI / 4]) part(cross, box(0.18, 0.003, 0.025), '#ff1744', 0, 0, 0, { ry: a, outline: false });
  const ripples = [0, 1, 2].map(() => {
    const mat = new THREE.MeshBasicMaterial({ color: '#4fc3f7', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.11, 24), mat);
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.rotation.x = -Math.PI / 2;
    m.position.set(crossAt[0], 0.02, crossAt[1]);
    m.visible = false;
    g.add(m);
    return { m, mat };
  });
  const client = person(g, LOOKS.client, LD.client[0], LD.client[1], -Math.PI / 2, 'male');
  const spots: Record<string, Spot> = { testLeak: standAt(g, 'pbListen', 0.86), plumber_explainLeak: standAt(g, 'pbExplain', 0.86) };
  spots['*'] = spots.testLeak;
  const hookP = new THREE.Vector3();
  const pTop = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(ear, P.ear, LD.ear);
    hookP.set(ear.position.x, ear.position.y, ear.position.z);
    cord(cordFrom, hookP);
    at(pole, P.pole, LD.pole);
    pTop.set(pole.position.x, pole.position.y + 0.8, pole.position.z);
    poleWire(v3(0.2, 0.96, 0.08), pTop);
    cross.visible = (n.cross ?? 0) > 0.3;
    const wv = n.wave ?? 0;
    ripples.forEach(({ m, mat }, i) => {
      m.visible = wv > 0.2;
      if (!m.visible) return;
      const u = (t * 0.7 + i / 3) % 1;
      m.scale.setScalar(0.5 + u * 2.4);
      mat.opacity = 0.7 * (1 - u) * wv;
    });
    at(tablet, P.tablet, LD.tablet);
    tabScreen.set(page(Math.round(n.page ?? 0)));
    const level = n.level ?? 0;
    if (now) {
      screen.set(wave((c) => {
        c.fillStyle = '#10201a';
        c.fillRect(0, 0, 192, 128);
        c.strokeStyle = '#1f4034';
        c.lineWidth = 1;
        for (let i = 1; i < 6; i++) {
          c.beginPath();
          c.moveTo(i * 32, 0);
          c.lineTo(i * 32, 100);
          c.stroke();
        }
        c.strokeStyle = level > 0.7 ? '#ff5252' : '#5cffb0';
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= 192; x += 3) {
          const y = 52 + Math.sin(x * 0.35 + t * 16) * (3 + 38 * level) * Math.sin(x * 0.07 + t * 3);
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
        c.fillStyle = '#16362a';
        c.fillRect(8, 106, 176, 14);
        c.fillStyle = level > 0.7 ? '#ff5252' : '#5cffb0';
        c.fillRect(8, 106, 176 * level, 14);
        text(c, `${Math.round(level * 62)} dB`, 184, 92, 14, '#c8ffe5', 'right');
      }));
    } else screen.set(idle);
    client.root.visible = now === 'plumber_explainLeak';
    if (client.root.visible) {
      client.armL((n.cPoint ?? 0) > 0.5 ? v3(0.7, 0.96, 0.98) : null);
      client.armR(null);
      client.opts.nod = 0.08 + 0.28 * (n.cNod ?? 0);
    }
  });
  out.work = marker(g, 0, 1.04, 0.14);
}

// =============================================================================================
// 보일러 수리대 (boilerUnit, 1 × 1).

function boiler(g: THREE.Group, out: Built) {
  // The service frame: posts, a back board, feet out to the front; the brand's a made-up one.
  for (const x of [-0.42, 0.42]) {
    part(g, box(0.05, 1.86, 0.05), FRAME, x, 0.93, -0.36);
    part(g, box(0.05, 0.05, 0.72), FRAME, x, 0.03, -0.02);
  }
  part(g, box(0.84, 1.3, 0.025), WOOD, 0, 1.26, -0.34);
  part(g, box(0.88, 0.05, 0.05), FRAME, 0, 1.88, -0.36);
  // The shell with its works, seen once the cover's off.
  part(g, box(0.52, 0.66, 0.26), '#3a4248', 0, 1.36, -0.09);
  part(g, box(0.46, 0.6, 0.012), '#1f2529', 0, 1.36, 0.042, { outline: false });
  for (let i = 0; i < 5; i++) part(g, cyl(0.014, 0.014, 0.34, 8), COPPER, -0.03, 1.5 + i * 0.024, 0.052 - (i % 2) * 0.008, { rz: Math.PI / 2, outline: false });
  part(g, cyl(0.075, 0.075, 0.06, 16), '#90a4ae', 0.14, 1.5, 0.045, { rx: Math.PI / 2 });
  part(g, box(0.28, 0.05, 0.03), '#78909c', -0.03, 1.26, 0.05);
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const f = ownLit(g, cyl(0.002, 0.016, 0.07, 8), '#4fa8ff', -0.13 + i * 0.05, 1.32, 0.052);
    flames.push(f);
  }
  part(g, cyl(0.042, 0.042, 0.06, 14), '#1565c0', -0.17, 1.16, 0.05, { rx: Math.PI / 2 });
  // The igniter: the bad one's sooty, the new one clean; wires up to it.
  const bad = group(g, BO.igniter[0], BO.igniter[1], BO.igniter[2] + 0.04);
  part(bad, box(0.05, 0.03, 0.03), '#2b2b30', 0, 0, 0);
  part(bad, cyl(0.004, 0.004, 0.05, 6), '#6d4c41', 0, 0.035, 0, { outline: false });
  const good = group(g, BO.igniter[0], BO.igniter[1], BO.igniter[2] + 0.04);
  part(good, box(0.05, 0.03, 0.03), '#eceff1', 0, 0, 0);
  part(good, cyl(0.004, 0.004, 0.05, 6), CHROME, 0, 0.035, 0, { outline: false });
  rod(g, v3(BO.igniter[0] + 0.015, BO.igniter[1] - 0.015, BO.igniter[2] + 0.04), v3(0.2, 1.1, 0.052), 0.004, RED);
  rod(g, v3(BO.igniter[0] - 0.015, BO.igniter[1] - 0.015, BO.igniter[2] + 0.04), v3(0.2, 1.08, 0.052), 0.004, '#fbc02d');
  const spark = ownLit(g, ball(0.012), '#ffffff', BO.igniter[0], BO.igniter[1] + 0.06, BO.igniter[2] + 0.05);
  // The control panel and its gauge under the cover.
  part(g, rbox(0.52, 0.14, 0.2, 0.01), '#f1f3f4', 0, 0.96, -0.06);
  const codeScreen = swapPic(g, 0.14, 0.07, -0.08, 0.98, 0.042);
  const codeTex = (s: string, col: string) =>
    painted(`pbCode${s}`, 96, 48, (c) => {
      c.fillStyle = '#11201a';
      c.fillRect(0, 0, 96, 48);
      text(c, s, 48, 25, 26, col, 'center');
    });
  const bad3 = codeTex('E-03', '#ff5252');
  const ok60 = codeTex('60℃', '#5cffb0');
  for (let i = 0; i < 2; i++) part(g, cyl(0.012, 0.012, 0.012, 10), i ? '#ef6c00' : '#2e7d32', 0.01 + i * 0.05, 0.98, 0.046, { rx: Math.PI / 2, outline: false });
  const barDial = dial(g, BO.gauge[0], BO.gauge[1] - 0.02, 0.056, 0.05, '#2e7d32', 'bar', 4);
  // Pipes under it: gas with its valve, flow and return, hot and cold; a drip tray.
  const pipes: Array<[number, string]> = [[-0.2, GAS], [-0.1, HOT], [0, COLD], [0.1, HOT], [0.2, COLD]];
  for (const [x, col] of pipes) {
    pipe(g, [x, 0.88, -0.06], [x, 0.26, -0.06], 0.017, col);
    part(g, cyl(0.022, 0.022, 0.03, 10), BRASS, x, 0.74, -0.06, { outline: false });
    pipe(g, [x, 0.26, -0.06], [x, 0.26, -0.32], 0.017, col);
    pipe(g, [x, 0.26, -0.32], [x, 0.06, -0.32], 0.017, col);
  }
  const gasLever = group(g, BO.gas[0], BO.gas[1] - 0.04, BO.gas[2] - 0.11);
  part(gasLever, box(0.03, 0.012, 0.13), GAS, 0, 0, 0.06, { outline: false });
  part(g, box(0.56, 0.02, 0.26), STEEL, 0, 0.07, -0.08);
  label(g, '실습용 · 가스 차단', 0.3, 0.05, 0, 0.14, 0.07, '#fffde7', INK);
  rod(g, v3(0, 1.7, -0.14), v3(0, 1.96, -0.2), 0.05, STEEL);
  // A tool tray on an arm, the clipboard on the post.
  part(g, box(0.28, 0.02, 0.2), '#607d8b', BO.tray[0], 0.87, BO.tray[2] - 0.02);
  rod(g, v3(BO.tray[0], 0.86, BO.tray[2] - 0.1), v3(-0.42, 0.86, -0.3), 0.012, FRAME);
  const onTray = wrenchMesh(g, 0.2);
  place(onTray, [BO.tray[0] - 0.08, 0.895, BO.tray[2] + 0.04]);
  onTray.rotation.x = Math.PI / 2;
  // The cover: the part that comes off, with the flame's window and a badge.
  const cover = group(g);
  part(cover, rbox(0.54, 0.64, 0.03, 0.012), '#fafafa', 0, 0, 0);
  part(cover, box(0.5, 0.02, 0.002), BLUE, 0, -0.26, 0.016, { outline: false });
  label(cover, '온누리 가스보일러', 0.36, 0.055, 0, 0.22, 0.017, '#fafafa', BLUE);
  part(cover, cyl(0.05, 0.05, 0.008, 14), '#263238', 0, -0.06, 0.016, { rx: Math.PI / 2, outline: false });
  const windowLit = ownLit(cover, cyl(0.038, 0.038, 0.004, 14), '#2b1b10', 0, -0.06, 0.022);
  windowLit.rotation.x = Math.PI / 2;
  // The part in hand, the meter and its probe, the sheet.
  const oldPart = group(g);
  part(oldPart, box(0.05, 0.03, 0.03), '#2b2b30', 0, 0, 0);
  const newPart = group(g);
  part(newPart, box(0.05, 0.03, 0.03), '#eceff1', 0, 0, 0);
  const meter = group(g);
  meter.rotation.x = -0.6;
  part(meter, rbox(0.09, 0.16, 0.03, 0.01), '#fbc02d', 0, 0, 0);
  const meterRead = swapPic(meter, 0.065, 0.04, 0, 0.04, 0.017);
  const meterLive = live(64, 40);
  const probe = group(g);
  part(probe, cyl(0.004, 0.009, 0.1, 8), RED, 0, 0.04, 0, { rz: 0.4, outline: false });
  const sheets = [0, 1, 2, 3].map((k) =>
    painted(`pbHeatPlan${k}`, 128, 172, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 128, 172);
      text(c, '난방 배관 계통', 64, 14, 13, INK, 'center');
      c.strokeStyle = '#90a4ae';
      c.lineWidth = 2;
      c.strokeRect(12, 30, 104, 92);
      c.fillStyle = '#b0bec5';
      c.fillRect(54, 118, 20, 14);
      if (k >= 1) {
        c.strokeStyle = HOT;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(58, 118);
        for (let i = 0; i < 4; i++) {
          c.lineTo(i % 2 ? 54 : 18, 110 - i * 18);
          c.lineTo(i % 2 ? 18 : 54, 110 - i * 18);
        }
        c.stroke();
      }
      if (k >= 2) {
        c.strokeStyle = COLD;
        c.beginPath();
        c.moveTo(70, 118);
        for (let i = 0; i < 4; i++) {
          c.lineTo(i % 2 ? 108 : 72, 110 - i * 18);
          c.lineTo(i % 2 ? 72 : 108, 110 - i * 18);
        }
        c.stroke();
      }
      if (k >= 3) text(c, '합계 42m · 분배기 4구', 64, 152, 11, BLUE, 'center');
    }),
  );
  const clip = clipMesh(g, sheets[0], 0.18, 0.24);
  const pen = group(g);
  penMesh(pen);
  const steam = puffs(g, 4, '#eceff1', 0.045);
  const spots: Record<string, Spot> = { repairBoiler: standAt(g, 'pbBoil'), plumber_designHeating: standAt(g, 'pbDesign') };
  spots['*'] = spots.repairBoiler;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(cover, P.cover, BO.cover);
    const lit = now ? (n.flame ?? 0) > 0.5 : false;
    flames.forEach((f, i) => {
      f.visible = lit;
      if (lit) f.scale.y = 0.8 + 0.3 * Math.abs(Math.sin(t * 11 + i * 2));
    });
    setLit(windowLit, lit ? (Math.sin(t * 19) > 0 ? '#ff9f43' : '#ffb74d') : '#2b1b10');
    const newIn = (n.newPart ?? 0) > 0.5;
    bad.visible = !newIn && (n.oldGone ?? 0) < 0.5;
    good.visible = newIn || !now;
    bad.visible = bad.visible && !!now;
    at(oldPart, P.oldPart);
    at(newPart, P.newPart);
    spark.visible = (n.spark ?? 0) > 0.5;
    codeScreen.set(!now ? ok60 : (n.code ?? 0) > 0.5 ? bad3 : ok60);
    barDial(now ? (lit ? 0.42 + 0.02 * Math.sin(t * 2) : 0.12) : 0.42);
    gasLever.rotation.y = (n.gasOn ?? 1) > 0.5 || !now ? 0 : Math.PI / 2;
    at(meter, P.meter);
    at(probe, P.probe);
    if (P.meter) {
      const read = n.volts ?? 0;
      meterRead.set(meterLive((c) => {
        c.fillStyle = '#c5d6c0';
        c.fillRect(0, 0, 64, 40);
        text(c, read.toFixed(1), 60, 22, 22, BLACK, 'right');
      }));
    }
    at(clip.root, P.clip, BO.clip);
    const m = clip.sheet.material as THREE.MeshBasicMaterial;
    const want = sheets[Math.round(Math.min(3, n.lines ?? 0))];
    if (m.map !== want) {
      m.map = want;
      m.needsUpdate = true;
    }
    at(pen, P.pen);
    steam(lit && (n.flame ?? 0) > 0.8 ? 1 : 0, 0, 1.96, -0.2, 0.05, t * 0.8, 0.5);
  });
  // The clipboard's hook.
  part(g, cyl(0.008, 0.008, 0.06, 6), CHROME, BO.clip[0], BO.clip[1] + 0.13, BO.clip[2] - 0.04, { rx: Math.PI / 2, outline: false });
  rod(g, v3(0.42, BO.clip[1] + 0.12, -0.34), v3(BO.clip[0], BO.clip[1] + 0.12, BO.clip[2] - 0.06), 0.008, FRAME);
  out.work = marker(g, 0, 1.3, 0.1);
}

// =============================================================================================
// 누수 실습 벽 (pbLeakWall, 3 × 1).

function leakWall(g: THREE.Group, out: Built, W: number) {
  const hw = W / 2 - 0.04;
  part(g, box(hw * 2, 2.02, 0.04), WOOD, 0, 1.07, -0.44);
  for (const x of [-hw, -hw / 3, hw / 3, hw]) part(g, box(0.06, 2.1, 0.08), FRAME, x, 1.05, -0.42);
  part(g, box(hw * 2 + 0.06, 0.06, 0.1), FRAME, 0, 2.1, -0.42);
  part(g, box(hw * 2, 0.1, 0.3), FRAME, 0, 0.05, -0.28);
  label(g, '누수 찾기 실습 벽', 0.9, 0.11, 0, 1.96, -0.415, BLUE, '#ffffff');
  // Mains along the wall on their clips.
  pipe(g, [-hw, LW.hot, LW.z], [hw, LW.hot, LW.z], 0.024, HOT);
  pipe(g, [-hw, LW.cold, LW.z], [hw, LW.cold, LW.z], 0.024, COLD);
  label(g, '온수', 0.14, 0.055, -1.28, LW.hot + 0.08, -0.415, HOT, '#ffffff');
  label(g, '냉수', 0.14, 0.055, -1.28, LW.cold + 0.08, -0.415, COLD, '#ffffff');
  for (let i = 0; i < 7; i++) {
    const x = -hw + 0.2 + (i * (hw * 2 - 0.4)) / 6;
    for (const y of [LW.hot, LW.cold]) part(g, box(0.04, 0.03, 0.16), CHROME, x, y, LW.z - 0.08, { outline: false });
  }
  // Branches: each drop with a joint, an elbow to a drain along the foot.
  const drain = 0.3;
  pipe(g, [-hw, drain, LW.z], [hw, drain, LW.z], 0.034, PVC);
  for (let i = 0; i < 3; i++) {
    const [x, y] = LW.joints[i];
    const col = i === 1 ? HOT : COLD;
    pipe(g, [x, i === 1 ? LW.hot : LW.cold, LW.z], [x, y, LW.z], 0.02, col);
    pipe(g, [x, y, LW.z], [x, drain, LW.z], 0.02, col);
    part(g, cyl(0.032, 0.032, 0.07, 6), BRASS, x, y, LW.z);
    label(g, `이음 ${i + 1}`, 0.13, 0.05, x + 0.14, y + 0.03, -0.415, '#ffffff', INK);
  }
  // A radiator of tees between them: a bit of a real manifold.
  const manX = 0.5;
  part(g, rbox(0.34, 0.1, 0.09, 0.012), BRASS, manX, 0.76, LW.z);
  for (let i = 0; i < 4; i++) {
    const x = manX - 0.12 + i * 0.08;
    pipe(g, [x, 0.76, LW.z], [x, 0.56, LW.z], 0.012, i % 2 ? HOT : COLD);
    part(g, cyl(0.018, 0.018, 0.04, 10), i % 2 ? HOT : COLD, x, 0.84, LW.z, { outline: false });
  }
  label(g, '분배기', 0.15, 0.05, manX, 0.66, -0.415, '#ffffff', INK);
  // The main wheel valve.
  pipe(g, [LW.main[0], LW.cold, LW.z], LW.main, 0.024, COLD);
  part(g, cyl(0.04, 0.04, 0.08, 12), BRASS, LW.main[0], LW.main[1], LW.main[2] + 0.02, { rx: Math.PI / 2 });
  const valve = group(g, LW.main[0], LW.main[1], LW.main[2] + 0.1);
  const vw = part(valve, new THREE.TorusGeometry(0.06, 0.01, 8, 18), RED, 0, 0, 0);
  vw.userData.ownGeometry = true;
  part(valve, box(0.12, 0.012, 0.012), RED, 0, 0, 0, { outline: false });
  part(valve, box(0.012, 0.12, 0.012), RED, 0, 0, 0, { outline: false });
  label(g, '메인 밸브', 0.2, 0.05, LW.main[0], LW.main[1] + 0.14, -0.415, '#ffffff', INK);
  // Pressure on the line, a big gauge by the pump.
  pipe(g, [LW.gauge[0], LW.cold, LW.z], [LW.gauge[0], LW.gauge[1] - 0.06, LW.z], 0.008, BRASS);
  const lineDial = dial(g, LW.gauge[0], LW.gauge[1], LW.gauge[2], 0.08, '#2e7d32', 'bar', 6);
  const testDial = dial(g, LW.bigGauge[0], LW.bigGauge[1], LW.bigGauge[2], 0.12, '#c62828', 'bar', 12);
  pipe(g, [LW.bigGauge[0], LW.hot, LW.z], [LW.bigGauge[0], LW.bigGauge[1] - 0.1, LW.z], 0.008, BRASS);
  // The stub for the pump's hose.
  pipe(g, [LW.test[0], 0.82, LW.z], [LW.test[0], LW.test[1], LW.test[2] - 0.08], 0.014, GALV);
  part(g, cyl(0.02, 0.02, 0.05, 10), BRASS, LW.test[0], LW.test[1], LW.test[2] - 0.02, { rx: Math.PI / 2 });
  // The hand test pump on the floor: red tank, gauge pipe, the lever.
  const pump = group(g, LW.pump[0], 0, LW.pump[2]);
  part(pump, rbox(0.42, 0.24, 0.24, 0.02), '#c62828', 0, 0.12, 0);
  part(pump, cyl(0.05, 0.05, 0.3, 12), STEEL, 0.1, 0.38, 0);
  label(pump, '수압 펌프', 0.2, 0.05, 0, 0.14, 0.123, '#c62828', '#ffffff');
  const leverG = group(pump, -0.04, 0.3, 0);
  part(leverG, cyl(0.012, 0.012, 0.56, 8), CHROME, 0.02, 0.28, 0.0, { outline: false });
  part(leverG, cyl(0.018, 0.018, 0.16, 8), BLACK, 0.02, 0.56, 0, { rz: Math.PI / 2, outline: false });
  const hose = limb(g, 0.012, BLACK);
  const hoseFrom = v3(LW.pump[0] - 0.2, 0.28, LW.pump[2]);
  const hoseTo = v3(LW.test[0], LW.test[1], LW.test[2] + 0.02);
  const hoseHome = v3(LW.pump[0] - 0.24, 0.5, LW.pump[2] + 0.1);
  // The bucket under the bad joint; what's in it; a drip.
  part(g, cyl(0.15, 0.11, 0.26, 14), '#42a5f5', LW.bucket[0], 0.13, LW.bucket[2]);
  const water = ownLit(g, cyl(0.135, 0.135, 0.004, 14), '#90caf9', LW.bucket[0], 0.22, LW.bucket[2]);
  const drip = ownLit(g, ball(0.012), '#4fc3f7', 0, 0, 0);
  const wet = ownLit(g, box(0.05, 0.1, 0.06), '#5fa8d0', LW.joints[2][0], LW.joints[2][1] - 0.07, LW.z);
  // A little shelf for the rag, the wrench on its nail.
  part(g, box(0.28, 0.02, 0.28), '#607d8b', LW.rag[0], 0.87, -0.06);
  rod(g, v3(LW.rag[0], 0.86, -0.2), v3(LW.rag[0], 0.86, -0.42), 0.012, FRAME);
  const rag = group(g);
  part(rag, rbox(0.14, 0.02, 0.1, 0.008), '#ffb74d', 0, 0, 0, { outline: false });
  const wrench = wrenchMesh(g, 0.28);
  const clip = clipMesh(g, painted('pbPressSheet', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '수압 시험 기록', 64, 14, 13, INK, 'center');
    ['시험 압력  10 bar', '유지 시간  10분', '누수 없음  ✓'].forEach((s, i) => text(c, s, 8, 48 + i * 26, 12, INK));
  }), 0.16, 0.22);
  clip.root.visible = false;
  const spots: Record<string, Spot> = { pbFindLeak: standAt(g, 'pbFind', LW.stand), pbPressureTest: standAt(g, 'pbPressure', LW.stand) };
  spots['*'] = spots.pbFindLeak;
  const jt = LW.joints[2];
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    valve.rotation.z = n.valveA ?? 0;
    lineDial(now === 'pbFindLeak' ? (n.bar ?? 3.2) / 6 : 0.55);
    testDial(now === 'pbPressureTest' ? (n.bar ?? 0) / 12 : 0);
    leverG.rotation.z = (n.lev ?? 0) * 0.45;
    const hoseOn = (n.hose ?? 0) > 0.5;
    hose(hoseFrom, hoseOn ? hoseTo : hoseHome);
    // One joint always weeps, until it's been done up.
    const f = now === 'pbFindLeak' ? (n.fixed ?? 0) : 0;
    const dr = now === 'pbFindLeak' ? (n.drip ?? 1) : now === 'pbPressureTest' ? 0 : 1;
    drip.visible = dr > 0.05 && f < 0.9;
    if (drip.visible) {
      const u = (t * (0.5 + dr * 0.9)) % 1;
      drip.position.set(jt[0], jt[1] - 0.04 - u * u * (jt[1] - 0.26), LW.z);
    }
    wet.visible = (now === 'pbFindLeak' ? (n.wet ?? 1) : 1) > 0.35;
    water.position.y = 0.2 + 0.02 * Math.sin(t * 0.4);
    at(rag, P.rag, [LW.rag[0], 0.89, -0.06]);
    at(wrench, P.wrench, LW.wrench);
    wrench.rotation.x = P.wrench ? (n.wrA ?? -0.5) : 0;
    at(clip.root, P.clip);
  });
  out.work = marker(g, 0, 1.2, LW.z + 0.1);
}

// =============================================================================================
// 배수 실습대 (pbDrainRig, 2 × 1).

function drainRig(g: THREE.Group, out: Built) {
  // A low table with the clear run on trestles, a stack at one end with a tap, the mouth at the other.
  part(g, box(1.92, 0.06, 0.64), '#607d8b', 0, 0.03, -0.1);
  for (const x of [-0.5, 0.05, 0.42]) {
    part(g, box(0.05, 0.46, 0.05), FRAME, x, 0.25, DR.z);
    part(g, box(0.16, 0.02, 0.14), FRAME, x, 0.47, DR.z);
  }
  const glass = new THREE.MeshBasicMaterial({ color: '#bfe6f5', transparent: true, opacity: 0.32, depthWrite: false });
  const run = new THREE.Mesh(cyl(0.056, 0.056, DR.mouth + 0.78, 16), glass);
  run.userData.ownMaterial = true;
  run.rotation.z = Math.PI / 2;
  run.position.set((DR.mouth - 0.78) / 2, DR.y, DR.z);
  g.add(run);
  for (const x of [-0.78, -0.3, 0.2, DR.mouth]) part(g, cyl(0.062, 0.062, 0.02, 14), PVC, x, DR.y, DR.z, { rz: Math.PI / 2, outline: false });
  // The stack: down from a little funnel under the tap.
  const stack = new THREE.Mesh(cyl(0.056, 0.056, 0.62, 16), glass);
  stack.position.set(-0.8, DR.y + 0.31, DR.z);
  g.add(stack);
  part(g, cyl(0.06, 0.06, 0.14, 14), PVC, -0.8, DR.y, DR.z, { outline: false });
  part(g, cyl(0.11, 0.058, 0.12, 14), PVC, -0.8, 1.2, DR.z);
  part(g, box(0.05, 1.3, 0.05), FRAME, -0.9, 0.68, -0.3);
  pipe(g, [-0.9, 1.34, -0.3], [-0.9, 1.34, DR.z + 0.02], 0.012, COLD);
  pipe(g, [-0.9, 1.34, DR.z + 0.02], [-0.8, 1.3, DR.z + 0.02], 0.012, COLD);
  const tapLever = group(g, DR.tap[0], DR.tap[1] + 0.06, DR.tap[2]);
  part(tapLever, box(0.08, 0.012, 0.02), RED, 0.03, 0, 0, { outline: false });
  // What's standing in the pipe, the clog, the moving water.
  const full = part(g, cyl(0.046, 0.046, 1, 12), '#4f97c7', 0, DR.y - 0.006, DR.z, { rz: Math.PI / 2, outline: false });
  const clog = group(g, DR.clog, DR.y, DR.z);
  for (let i = 0; i < 7; i++) part(clog, ball(0.028), i % 3 ? '#4e3b2c' : '#3a2c20', -0.03 + (i % 3) * 0.03, -0.02 + ((i * 5) % 3) * 0.018, -0.02 + ((i * 3) % 3) * 0.02, { outline: false });
  const dash = Array.from({ length: 7 }, () => part(g, cyl(0.03, 0.03, 0.1, 8), '#90caf9', 0, DR.y, DR.z, { rz: Math.PI / 2, outline: false }));
  const fall = part(g, cyl(0.03, 0.03, 0.6, 8), '#90caf9', -0.8, DR.y + 0.31, DR.z, { outline: false });
  // The spring and its head, on the end of what's been fed; the camera's the same with a light.
  const cable = limb(g, 0.008, '#37474f');
  const headG = group(g);
  part(headG, cyl(0.02, 0.012, 0.06, 8), CHROME, -0.03, 0, 0, { rz: -Math.PI / 2, outline: false });
  for (let i = 0; i < 4; i++) part(headG, cyl(0.018, 0.018, 0.005, 8), STEEL, 0.01 + i * 0.012, 0, 0, { rz: Math.PI / 2, outline: false });
  const muck = group(headG, -0.05, 0, 0);
  for (let i = 0; i < 4; i++) part(muck, ball(0.022), '#4e3b2c', (i % 2) * 0.02, -0.012 + i * 0.008, -0.012 + (i % 2) * 0.02, { outline: false });
  const camG = group(g);
  part(camG, cyl(0.022, 0.022, 0.06, 10), '#fafafa', 0, 0, 0, { rz: Math.PI / 2 });
  const camLed = ownLit(camG, cyl(0.016, 0.016, 0.004, 10), '#fff59d', -0.032, 0, 0);
  camLed.rotation.z = Math.PI / 2;
  // The machine: a drum on a cradle, a motor, the guide up to the mouth, the pedal.
  part(g, box(0.3, 0.08, 0.3), RED, DR.drum[0], 0.08, DR.drum[2]);
  const drum = group(g, DR.drum[0], DR.drum[1], DR.drum[2]);
  part(drum, cyl(0.17, 0.17, 0.2, 18), '#37474f', 0, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 6; i++) part(drum, box(0.02, 0.26, 0.21), '#546e7a', 0, 0, 0, { rz: (i * Math.PI) / 3, outline: false });
  part(g, box(0.05, 0.32, 0.05), RED, DR.drum[0], 0.36, DR.drum[2] - 0.14);
  part(g, rbox(0.14, 0.14, 0.14, 0.02), BLUE_D, DR.drum[0] + 0.02, 0.5, DR.drum[2] - 0.14);
  const pedal = part(g, rbox(0.12, 0.03, 0.16, 0.01), '#fbc02d', 0.5, 0.05, 0.4);
  label(g, '스프링 청소기', 0.26, 0.05, DR.drum[0], 0.08, DR.drum[2] + 0.153, RED, '#ffffff');
  // The bin, the cap, the monitor on its post.
  part(g, cyl(0.12, 0.09, 0.26, 14), '#37474f', DR.bin[0], 0.13, DR.bin[2]);
  part(g, cyl(0.11, 0.11, 0.008, 14), '#1a1a1a', DR.bin[0], 0.26, DR.bin[2], { outline: false });
  const cap = group(g);
  part(cap, cyl(0.066, 0.066, 0.04, 12), '#eceff1', 0.01, 0, 0, { rz: Math.PI / 2 });
  part(cap, box(0.012, 0.08, 0.02), '#90a4ae', 0.035, 0, 0, { outline: false });
  part(g, box(0.05, 0.86, 0.05), FRAME, DR.monitor[0], 0.46, DR.monitor[2] - 0.12);
  part(g, box(0.5, 0.3, 0.06), BLACK, DR.monitor[0], DR.monitor[1], DR.monitor[2] - 0.04);
  part(g, box(0.34, 0.03, 0.14), '#37474f', DR.monitor[0] + 0.2, 0.94, DR.monitor[2]);
  const camLamp = ownLit(g, ball(0.01), '#3b2a18', DR.monitor[0] + 0.2, 0.96, DR.monitor[2] + 0.07);
  const scr = swapPic(g, 0.44, 0.25, DR.monitor[0], DR.monitor[1], DR.monitor[2] - 0.008);
  const scrIdle = painted('pbCamIdle', 160, 92, (c) => {
    c.fillStyle = '#0d1a22';
    c.fillRect(0, 0, 160, 92);
    text(c, '배관 내시경', 80, 46, 16, '#78909c', 'center');
  });
  scr.set(scrIdle);
  const scrLive = live(192, 110);
  label(g, '배수 실습대', 0.42, 0.08, -0.38, 1.0, -0.35, BLUE, '#ffffff');
  rod(g, v3(-0.6, 0.9, -0.36), v3(-0.6, 1.08, -0.36), 0.012, FRAME);
  rod(g, v3(-0.16, 0.9, -0.36), v3(-0.16, 1.08, -0.36), 0.012, FRAME);
  rod(g, v3(-0.6, 0.06, -0.36), v3(-0.6, 0.9, -0.36), 0.012, FRAME);
  rod(g, v3(-0.16, 0.06, -0.36), v3(-0.16, 0.9, -0.36), 0.012, FRAME);
  const gunk = group(g);
  for (let i = 0; i < 3; i++) part(gunk, ball(0.022), '#4e3b2c', i * 0.02 - 0.02, (i % 2) * 0.02, 0, { outline: false });
  const spots: Record<string, Spot> = { pbSnakeDrain: standAt(g, 'pbSnake'), pbCameraDrain: standAt(g, 'pbCamera') };
  spots['*'] = spots.pbSnakeDrain;
  const mouth = v3(DR.mouth + 0.02, DR.y, DR.z);
  const end = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const snaking = now === 'pbSnakeDrain';
    const camming = now === 'pbCameraDrain';
    at(cap, P.cap, DR.cap);
    const left = snaking ? (n.clog ?? 1) : 1;
    clog.visible = !camming && left > 0.04;
    clog.scale.setScalar(Math.max(0.05, left));
    clog.position.x = DR.clog - (snaking ? (1 - left) * 0.1 : 0);
    // Water backed up behind the clog until it's cleared.
    const fullness = now ? (n.full ?? 1) : 1;
    const backed = camming ? 0 : fullness;
    full.visible = backed > 0.03;
    full.scale.y = DR.clog + 0.76;
    full.scale.x = full.scale.z = Math.max(0.2, backed);
    full.position.x = (-0.76 + DR.clog) / 2;
    const w = n.water ?? 0;
    fall.visible = w > 0.1;
    dash.forEach((d, i) => {
      d.visible = w > 0.1;
      if (d.visible) d.position.x = -0.76 + ((t * 0.9 + i / 7) % 1) * (DR.mouth + 0.76);
    });
    tapLever.rotation.z = w > 0.1 ? 0.7 : 0;
    // The cable.
    const cabled = (n.cable ?? 0) > 0.5;
    const x = snaking ? (n.head ?? DR.mouth) : (n.cam ?? DR.mouth);
    headG.visible = snaking && cabled;
    camG.visible = camming && cabled;
    if (cabled) {
      place(snaking ? headG : camG, [x, DR.y, DR.z]);
      headG.rotation.x = (n.spin ?? 0) > 0.5 ? t * 26 : 0;
      muck.visible = (n.muck ?? 0) > 0.5;
    }
    end.set(cabled ? x : DR.mouth, DR.y, DR.z);
    cable(mouth, end);
    drum.rotation.z = (n.spin ?? 0) > 0.5 ? t * 12 : cabled ? (x - DR.mouth) * 9 : 0;
    pedal.position.y = (n.spin ?? 0) > 0.5 ? 0.035 : 0.05;
    at(gunk, P.gunk);
    // The monitor.
    const onCam = camming && (n.camOn ?? 0) > 0.5;
    setLit(camLamp, onCam ? '#66ff99' : '#3b2a18');
    if (onCam) {
      const depth = n.depth ?? 0;
      const crack = n.crack ?? 0;
      const found = n.found ?? 0;
      scr.set(scrLive((c) => {
        const g2 = c.createRadialGradient(96, 55, 8, 96, 55, 90);
        g2.addColorStop(0, '#05070a');
        g2.addColorStop(0.45, '#4a4133');
        g2.addColorStop(1, '#a89a7e');
        c.fillStyle = g2;
        c.fillRect(0, 0, 192, 110);
        c.strokeStyle = 'rgba(30,20,10,0.5)';
        c.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const r = ((i * 26 + depth * 240 + t * 6 * (depth > 0 && depth < 1 ? 1 : 0)) % 104) + 6;
          c.beginPath();
          c.ellipse(96, 55, r, r * 0.74, 0, 0, Math.PI * 2);
          c.stroke();
        }
        if (crack > 0.3) {
          c.strokeStyle = '#1a0d04';
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(50, 30);
          c.lineTo(72, 48);
          c.lineTo(62, 60);
          c.lineTo(88, 82);
          c.stroke();
        }
        if (found > 0.3) {
          c.strokeStyle = '#ff5252';
          c.lineWidth = 3;
          c.strokeRect(38, 22, 62, 68);
          text(c, '균열', 144, 30, 18, '#ff5252', 'center');
        }
        text(c, `${(depth * 12).toFixed(1)} m`, 186, 100, 15, '#ffffff', 'right');
      }));
    } else scr.set(scrIdle);
  });
  out.work = marker(g, 0.1, DR.y + 0.1, DR.z + 0.06);
}

// =============================================================================================
// 위생기구 실습대 (pbFixtureRig, 2 × 1). This workplace's own training toilet and basin; the house's aren't touched.

function fixtureRig(g: THREE.Group, out: Built) {
  const tile = painted('pbTile', 256, 256, (c) => {
    c.fillStyle = '#eaf0f1';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#bcc9cd';
    c.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      c.beginPath();
      c.moveTo(i * 32, 0);
      c.lineTo(i * 32, 256);
      c.moveTo(0, i * 32);
      c.lineTo(256, i * 32);
      c.stroke();
    }
  });
  part(g, box(1.96, 1.96, 0.04), FRAME, 0, 0.98, -0.47);
  picture(g, tile, 1.9, 1.9, 0, 0.98, -0.447);
  part(g, box(1.96, 0.02, 0.88), '#9fb0b5', 0, 0.01, -0.04);
  label(g, '위생기구 실습대', 0.62, 0.1, 0, 1.78, -0.44, BLUE, '#ffffff');
  // The supply pipes down the wall, a cut-out in the tile, the valves.
  for (const [x, col] of [[-0.64, HOT], [-0.34, COLD], [0.24, COLD]] as Array<[number, string]>) pipe(g, [x, 1.6, -0.42], [x, 0.5, -0.42], 0.012, col);
  part(g, cyl(0.02, 0.02, 0.05, 10), CHROME, FX.valve[0], FX.valve[1], FX.valve[2] - 0.1, { rx: Math.PI / 2 });
  const basinValve = group(g, FX.valve[0], FX.valve[1], FX.valve[2] - 0.04);
  part(basinValve, box(0.06, 0.014, 0.014), RED, 0, 0, 0, { outline: false });
  part(g, cyl(0.02, 0.02, 0.1, 10), CHROME, FX.shut[0], FX.shut[1], FX.shut[2] - 0.03, { rx: Math.PI / 2 });
  const tankValve = group(g, FX.shut[0], FX.shut[1], FX.shut[2] + 0.03);
  part(tankValve, box(0.06, 0.014, 0.014), RED, 0, 0, 0, { outline: false });
  pipe(g, [FX.shut[0], FX.shut[1], FX.shut[2]], [0.3, 0.68, -0.36], 0.007, CHROME);
  // The basin: wall-hung, its bowl, the tap, the trap under it in the open.
  const bx = FX.basin[0];
  const bz = FX.basin[2];
  part(g, rbox(0.56, 0.12, 0.46, 0.04), '#fafafa', bx, 0.8, bz);
  part(g, cyl(0.19, 0.15, 0.03, 18), '#d4dde0', bx, 0.855, bz + 0.04, { outline: false });
  part(g, cyl(0.02, 0.02, 0.006, 10), CHROME, bx, 0.872, bz + 0.05, { outline: false });
  part(g, box(0.05, 0.04, 0.2), STEEL, bx - 0.22, 0.72, bz - 0.1, { outline: false });
  part(g, box(0.05, 0.04, 0.2), STEEL, bx + 0.22, 0.72, bz - 0.1, { outline: false });
  // The tap.
  part(g, cyl(0.028, 0.034, 0.1, 12), CHROME, FX.tapHead[0], 0.92, FX.tapHead[2]);
  const spoutEnd = FX.tapHead[2] + 0.16;
  pipe(g, [FX.tapHead[0], 0.98, FX.tapHead[2]], [FX.tapHead[0], 0.98, spoutEnd], 0.013, CHROME);
  part(g, cyl(0.016, 0.016, 0.03, 10), CHROME, FX.tapHead[0], 0.965, spoutEnd, { outline: false });
  const lever = group(g, FX.tapHead[0], 1.0, FX.tapHead[2]);
  part(lever, cyl(0.03, 0.03, 0.03, 12), CHROME, 0, 0, 0);
  part(lever, cyl(0.008, 0.008, 0.11, 8), CHROME, 0, 0.05, 0.03, { rx: 0.6, outline: false });
  const stream = ownLit(g, cyl(0.009, 0.009, 0.1, 8), '#90caf9', FX.tapHead[0], 0.91, spoutEnd);
  const drop = ownLit(g, ball(0.008), '#4fc3f7', FX.tapHead[0], 0.93, spoutEnd);
  // The trap and tail.
  pipe(g, [bx, 0.74, bz + 0.05], [bx, 0.5, bz + 0.05], 0.022, CHROME);
  const trap = part(g, new THREE.TorusGeometry(0.05, 0.022, 8, 14, Math.PI), CHROME, bx, 0.5, bz + 0.0, { ry: Math.PI / 2, rx: Math.PI });
  trap.userData.ownGeometry = true;
  pipe(g, [bx, 0.5, bz - 0.05], [bx, 0.54, -0.44], 0.022, CHROME);
  place(wrenchMesh(g, 0.2, '#1565c0'), [0.92, 1.3, -0.43]);
  // The toilet.
  const tx = FX.bowl[0];
  part(g, cyl(0.12, 0.15, 0.36, 16), '#fafafa', tx, 0.18, -0.05);
  part(g, rbox(0.36, 0.1, 0.46, 0.05), '#fafafa', tx, 0.38, 0.0);
  part(g, cyl(0.15, 0.13, 0.008, 18), '#b8dff0', tx, 0.433, 0.02, { outline: false });
  const seat = part(g, new THREE.TorusGeometry(0.15, 0.024, 8, 22), '#f4f6f6', tx, 0.45, 0.02, { rx: Math.PI / 2 });
  seat.userData.ownGeometry = true;
  const swirl = group(g, tx, 0.438, 0.02);
  for (let i = 0; i < 3; i++) part(swirl, box(0.12, 0.003, 0.016), '#5fa8d0', 0.06, 0, 0, { ry: (i * Math.PI * 2) / 3, outline: false });
  // The tank: walls and a floor, so that what's in it shows with the lid off.
  const tz = FX.tank[2];
  part(g, box(0.4, 0.34, 0.012), '#fafafa', FX.tank[0], 0.69, tz + 0.1);
  part(g, box(0.4, 0.34, 0.012), '#fafafa', FX.tank[0], 0.69, tz - 0.1);
  part(g, box(0.012, 0.34, 0.2), '#fafafa', FX.tank[0] - 0.2, 0.69, tz);
  part(g, box(0.012, 0.34, 0.2), '#fafafa', FX.tank[0] + 0.2, 0.69, tz);
  part(g, box(0.4, 0.012, 0.2), '#d9e1e3', FX.tank[0], 0.53, tz);
  const tankWater = ownLit(g, box(0.38, 0.003, 0.18), '#7fc4e6', FX.tank[0], 0.78, tz);
  const oldValve = group(g, FX.float[0], 0.54, tz);
  part(oldValve, cyl(0.012, 0.012, 0.22, 8), '#8d6e63', 0, 0.11, 0, { outline: false });
  part(oldValve, ball(0.028), '#8d6e63', 0.04, 0.2, 0, { outline: false });
  const newValve = group(g, FX.float[0], 0.54, tz);
  part(newValve, cyl(0.012, 0.012, 0.22, 8), '#1e88e5', 0, 0.11, 0, { outline: false });
  part(newValve, ball(0.028), '#fafafa', 0.04, 0.2, 0, { outline: false });
  const handleL = group(g, FX.lever[0], FX.lever[1], FX.lever[2]);
  part(handleL, box(0.07, 0.016, 0.018), CHROME, -0.02, 0, 0, { outline: false });
  const lid = group(g);
  part(lid, rbox(0.42, 0.03, 0.22, 0.012), '#fafafa', 0, 0, 0);
  // The parts box on the floor; what's in hand.
  part(g, rbox(0.28, 0.14, 0.18, 0.015), '#ef6c00', FX.box[0], 0.09, FX.box[2]);
  label(g, '부속', 0.1, 0.05, FX.box[0], 0.09, FX.box[2] + 0.092, '#ef6c00', '#ffffff');
  const inHandOld = group(g);
  part(inHandOld, cyl(0.012, 0.012, 0.2, 8), '#8d6e63', 0, 0, 0, { outline: false });
  const inHandNew = group(g);
  part(inHandNew, cyl(0.012, 0.012, 0.2, 8), '#1e88e5', 0, 0, 0, { outline: false });
  const oldC = group(g);
  part(oldC, cyl(0.016, 0.016, 0.07, 10), '#6d4c41', 0, 0, 0, { outline: false });
  const newC = group(g);
  part(newC, cyl(0.016, 0.016, 0.07, 10), BRASS, 0, 0, 0, { outline: false });
  const wrench = wrenchMesh(g, 0.2);
  const spray = puffs(g, 4, '#bfe6f5', 0.012);
  const spots: Record<string, Spot> = { pbFixToilet: standAt(g, 'pbToilet', 0.36), pbFixFaucet: standAt(g, 'pbFaucet', FX.stand) };
  spots['*'] = spots.pbFixFaucet;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const inToilet = now === 'pbFixToilet';
    const inFaucet = now === 'pbFixFaucet';
    at(lid, P.lid, add3(FX.tank, 0, 0.1, 0));
    const lvl = inToilet ? (n.water ?? 1) : 1;
    tankWater.position.y = 0.55 + 0.23 * lvl;
    tankWater.visible = lvl > 0.02;
    const newOn = inToilet && (n.newV ?? 0) > 0.5;
    oldValve.visible = !newOn && (!inToilet || !P.old);
    newValve.visible = newOn;
    at(inHandOld, P.old);
    at(inHandNew, P.nv);
    swirl.rotation.y = (n.swirl ?? 0) > 0.05 ? t * 9 : 0;
    swirl.visible = (n.swirl ?? 0) > 0.05;
    handleL.rotation.z = (n.fl ?? 0) > 0.5 ? -0.2 : 0;
    tankValve.rotation.z = inToilet && (n.valveOpen ?? 1) < 0.5 ? Math.PI / 2 : 0;
    // The tap: weeps until it's mended; runs when it's tried.
    const on = inFaucet ? (n.on ?? 0) : 0;
    stream.visible = on > 0.05;
    stream.scale.x = stream.scale.z = 0.6 + on * 0.6;
    spray(on, FX.tapHead[0], 0.87, FX.tapHead[2] + 0.2, 0.05, t * 3, 0.08);
    const dripping = (inFaucet ? (n.dripping ?? 1) : 1) > 0.5 && !on;
    drop.visible = dripping;
    if (dripping) drop.position.y = 0.95 - ((t * 0.7) % 1) ** 2 * 0.08;
    lever.rotation.x = -0.45 * (n.leverUp ?? 0);
    lever.rotation.y = 0.6 * (n.leverSwing ?? 0);
    lever.visible = !(inFaucet && (n.off ?? 0) > 0.5);
    basinValve.rotation.z = inFaucet && (n.dripping ?? 1) < 0.5 && on < 0.05 ? Math.PI / 2 : 0;
    at(oldC, P.oldC);
    at(newC, P.newC);
    at(wrench, P.wrench);
    wrench.rotation.x = n.wrA ?? -0.5;
  });
  out.work = marker(g, FX.tapHead[0], 0.92, FX.tapHead[2] + 0.2);
}
const add3 = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];

// =============================================================================================
// 부품 카운터 (pbCounter, 3 × 1): staff on its front (+z), the customer on the showcase side (−z).

function partsCounter(g: THREE.Group, out: Built, W: number) {
  const hw = W / 2 - 0.05;
  part(g, rbox(hw * 2, 0.92, 0.66, 0.015), '#f1f3f4', 0, 0.46, 0);
  part(g, rbox(hw * 2 + 0.06, 0.04, 0.72, 0.012), BLUE_D, 0, PC.top - 0.02, 0);
  // The customer's side: a lit glass case of fittings, the sign under it.
  part(g, box(hw * 2 - 0.1, 0.5, 0.008), '#1a2a33', 0, 0.62, -0.333);
  const light = ownLit(g, box(hw * 2 - 0.14, 0.012, 0.004), '#fff8e1', 0, 0.85, -0.338);
  light.castShadow = false;
  for (const y of [0.48, 0.68]) part(g, box(hw * 2 - 0.14, 0.012, 0.03), CHROME, 0, y, -0.348, { outline: false });
  const kinds = ['elbow', 'tee', 'union', 'valve'] as const;
  for (let i = 0; i < 14; i++) {
    const f = fitting(g, kinds[i % 4], i % 3 ? BRASS : GALV);
    f.position.set(-1.15 + i * 0.18, i % 2 ? 0.52 : 0.72, -0.35);
    f.scale.setScalar(1.15);
  }
  part(g, box(hw * 2, 0.26, 0.012), BLUE, 0, 0.17, -0.336);
  label(g, `${BRAND} 부품 판매`, 1.3, 0.16, 0, 0.17, -0.344, BLUE, '#ffffff', Math.PI);
  // The staff's side: numbered drawers.
  for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
    const x = -1.3 + i * 0.236;
    const y = 0.26 + r * 0.26;
    part(g, rbox(0.22, 0.22, 0.012, 0.006), '#b0bec5', x, y, 0.335);
    label(g, `${String.fromCharCode(65 + r)}${i + 1}`, 0.09, 0.04, x, y + 0.04, 0.343, '#ffffff', INK);
    part(g, box(0.08, 0.012, 0.018), STEEL, x, y - 0.05, 0.345, { outline: false });
  }
  const drawer = group(g, PC.drawer[0], PC.drawer[1], PC.drawer[2] - 0.05);
  part(drawer, rbox(0.22, 0.22, 0.2, 0.006), '#90a4ae', 0, 0, 0);
  // The top: till, catalogue, printer, little boxes, a card of samples, bags.
  const pos = group(g, PC.pos[0], PC.top, PC.pos[2]);
  part(pos, rbox(0.3, 0.05, 0.2, 0.01), BLACK, 0, 0.025, 0);
  part(pos, box(0.03, 0.14, 0.03), BLACK, 0, 0.11, -0.05);
  const posScr = group(pos, 0, 0.26, -0.05);
  posScr.rotation.x = -0.3;
  part(posScr, rbox(0.3, 0.2, 0.02, 0.008), BLACK, 0, 0, 0);
  const screen = swapPic(posScr, 0.27, 0.17, 0, 0, 0.012);
  const screenTex = (paid: boolean) =>
    painted(`pbPos${paid}`, 192, 120, (c) => {
      c.fillStyle = '#f7fafc';
      c.fillRect(0, 0, 192, 120);
      c.fillStyle = BLUE;
      c.fillRect(0, 0, 192, 22);
      text(c, BRAND, 96, 12, 13, '#ffffff', 'center');
      text(c, '볼 밸브 15A', 8, 42, 13, INK);
      text(c, '8,500', 184, 42, 13, INK, 'right');
      text(c, paid ? '결제 완료' : '카드 대기', 184, 100, 16, paid ? '#2e7d32' : RED, 'right');
    });
  const posIdle = screenTex(false);
  const posPaid = screenTex(true);
  screen.set(posIdle);
  // The customer's card reader.
  part(g, rbox(0.1, 0.05, 0.14, 0.012), '#37474f', PC.terminal[0], PC.top + 0.03, PC.terminal[2]);
  const termLed = ownLit(g, ball(0.008), '#3b2a18', PC.terminal[0], PC.top + 0.06, PC.terminal[2] - 0.05);
  const card = part(g, box(0.085, 0.003, 0.055), '#1e88e5', PC.terminal[0], PC.top + 0.07, PC.terminal[2], { outline: false });
  // The catalogue: an open book with its pages.
  part(g, box(0.4, 0.02, 0.28), BLUE_D, PC.book[0], PC.top + 0.01, PC.book[2]);
  const pages = [0, 1, 2].map((k) =>
    painted(`pbCat${k}`, 128, 90, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 128, 90);
      text(c, ['밸브', '이음쇠', '수전'][k], 8, 12, 12, BLUE);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = '#cfd8dc';
        c.fillRect(8, 24 + i * 16, 20, 12);
        text(c, `${15 + i * 5}A`, 34, 30 + i * 16, 10, INK);
      }
    }),
  );
  const catPic = swapPic(g, 0.36, 0.25, PC.book[0], PC.top + 0.023, PC.book[2], 0, -Math.PI / 2);
  catPic.set(pages[0]);
  // Boxes and a rack of samples at the far end; bags.
  for (let i = 0; i < 6; i++) part(g, box(0.14, 0.1, 0.12), i % 2 ? '#fbc02d' : '#eceff1', -1.2 + (i % 3) * 0.16, PC.top + 0.05 + Math.floor(i / 3) * 0.1, -0.12);
  part(g, box(0.4, 0.3, 0.012), PEG, -0.74, PC.top + 0.17, -0.2);
  for (let i = 0; i < 6; i++) place(fitting(g, kinds[i % 4]), [-0.88 + (i % 3) * 0.14, PC.top + 0.25 - Math.floor(i / 3) * 0.14, -0.19]);
  for (let i = 0; i < 4; i++) part(g, box(0.2, 0.006, 0.26), '#c79a6b', PC.bags[0], PC.top + 0.012 + i * 0.006, PC.bags[2], { outline: false });
  // The sign's on the wall behind the staff, so nothing stands in front of whoever's serving.
  part(g, box(1.6, 0.3, 0.03), BLUE, 0, PC.top + 0.92, 1.44);
  label(g, '부품 · 자재 판매', 1.3, 0.2, 0, PC.top + 0.92, 1.42, BLUE, '#ffffff', Math.PI);
  // What's in hand.
  const broke = fitting(g, 'valve', '#6d5a36');
  const fresh = fitting(g, 'valve', BRASS);
  const bag = group(g);
  part(bag, rbox(0.14, 0.2, 0.08, 0.01), '#c79a6b', 0, 0.1, 0);
  const cust = person(g, LOOKS.buyer, PC.cust[0], PC.cust[1], 0, 'female');
  const spots: Record<string, Spot> = { pbServeParts: standAt(g, 'pbServe') };
  spots['*'] = spots.pbServeParts;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(broke, P.broke);
    at(fresh, P.fresh);
    if (P.broke) broke.rotation.y = n.turn ?? 0;
    at(bag, P.bag);
    drawer.position.z = PC.drawer[2] - 0.05 + 0.14 * (n.drawer ?? 0);
    const pg = Math.round(n.pages ?? 0);
    if (pg > 0) catPic.set(pages[Math.min(2, pg - 1)]);
    const there = n.cust ?? 0;
    cust.root.visible = !!now && there > 0.02;
    if (cust.root.visible) {
      const off = 1 - there;
      cust.root.position.set(PC.cust[0] + off * 1.6, off > 0.01 ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, PC.cust[1]);
      cust.opts.nod = 0.1 + 0.3 * (n.cBow ?? 0);
      const give = (n.cGive ?? 0) > 0 && (n.cGive ?? 0) < 1;
      const taking = (n.cTake ?? 0) > 0.05 && (n.cTake ?? 0) < 0.98;
      cust.armL(give ? v3(PC.mid[0] - 0.1, 1.08, -0.42) : (n.cTap ?? 0) > 0.05 ? v3(PC.terminal[0], PC.top + 0.1, PC.terminal[2]) : null);
      cust.armR(taking ? v3(PC.mid[0] + 0.02, 1.04, -0.2) : null);
    }
    card.visible = (n.cTap ?? 0) > 0.05;
    setLit(termLed, (n.paid ?? 0) > 0.5 ? '#66ff99' : '#3b2a18');
    screen.set((n.paid ?? 0) > 0.5 ? posPaid : posIdle);
  });
  out.work = marker(g, PC.mid[0], PC.mid[1], PC.mid[2]);
}

// =============================================================================================
// 출장 차량 (plumbingVan, 2 × 1): stays put while it's loaded; off on a call it drives away and backs in again.

function serviceVan(g: THREE.Group, out: Built) {
  const van = group(g);
  const WHITE = '#f4f6f6';
  // Chassis, lower body, roof, the back and rear of the cargo box.
  part(van, rbox(1.88, 0.14, 0.84, 0.03), INK, 0, 0.31, 0);
  part(van, rbox(1.92, 0.4, 0.86, 0.05), WHITE, 0, 0.56, 0);
  part(van, box(1.92, 0.1, 0.87), BLUE, 0, 0.52, 0);
  part(van, rbox(1.3, 0.56, 0.05, 0.02), WHITE, -0.3, 1.04, -0.41);
  part(van, box(0.045, 0.56, 0.84), WHITE, -0.94, 1.04, 0);
  part(van, box(0.045, 0.56, 0.84), WHITE, 0.34, 1.04, 0);
  part(van, rbox(1.32, 0.06, 0.88, 0.03), WHITE, -0.3, 1.34, 0);
  // The near side either side of the door's opening.
  part(van, box(0.56, 0.56, 0.03), WHITE, -0.66, 1.04, 0.42);
  label(van, BRAND, 0.46, 0.12, -0.66, 1.14, 0.437, WHITE, BLUE);
  label(van, '누수 · 보일러 · 동파', 0.5, 0.06, -0.66, 0.98, 0.437, WHITE, INK);
  // Inside: the floor, shelves of bins on the far wall, pipe hooks.
  part(van, box(1.22, 0.02, 0.78), '#6b777b', -0.3, 0.77, 0);
  part(van, box(1.2, 0.02, 0.2), STEEL, -0.3, 0.98, -0.28);
  part(van, box(1.2, 0.02, 0.2), STEEL, -0.3, 1.18, -0.28);
  for (let i = 0; i < 6; i++) part(van, box(0.16, 0.11, 0.17), i % 2 ? '#1e5aa8' : '#ef6c00', -0.82 + i * 0.2, 1.05, -0.28);
  for (let i = 0; i < 6; i++) part(van, box(0.16, 0.1, 0.17), i % 3 ? '#fbc02d' : '#eceff1', -0.82 + i * 0.2, 1.24, -0.28);
  for (const x of [-0.72, 0.1]) part(van, box(0.03, 0.14, 0.12), STEEL, x, VN.pipeIn[1] + 0.03, VN.pipeIn[2] - 0.05);
  const stored = group(van, VN.pipeIn[0], VN.pipeIn[1], VN.pipeIn[2]);
  xPipe(stored, -0.45, 0.45, 0.024, GALV);
  const strap = part(van, box(0.03, 0.34, 0.008), '#ef6c00', 0.02, 1.0, VN.pipeIn[2] + 0.02, { outline: false });
  const inBox = group(van, VN.boxIn[0], VN.boxIn[1], VN.boxIn[2]);
  toolbox(inBox);
  // The cab.
  part(van, rbox(0.56, 0.2, 0.84, 0.035), WHITE, 0.64, 0.86, 0);
  part(van, rbox(0.6, 0.045, 0.86, 0.02), WHITE, 0.64, 1.3, 0);
  for (const x of [0.37, 0.92]) for (const z of [-0.39, 0.39]) part(van, box(0.035, 0.36, 0.035), WHITE, x, 1.1, z);
  const glass = new THREE.MeshBasicMaterial({ color: '#9dd3e4', transparent: true, opacity: 0.45 });
  part(van, box(0.46, 0.3, 0.008), '#9dd3e4', 0.64, 1.1, 0.41, { material: glass, outline: false }).userData.ownMaterial = true;
  part(van, box(0.46, 0.3, 0.008), '#9dd3e4', 0.64, 1.1, -0.41, { material: glass, outline: false }).userData.ownMaterial = true;
  part(van, box(0.02, 0.3, 0.72), '#5f8899', 0.93, 1.1, 0, { outline: false });
  rod(van, v3(0.86, 1.04, 0.42), v3(0.92, 1.04, 0.52), 0.012, INK);
  part(van, rbox(0.09, 0.11, 0.04, 0.015), INK, 0.92, 1.05, 0.52);
  part(van, rbox(0.06, 0.12, 0.84, 0.015), INK, 0.96, 0.42, 0);
  for (const z of [-0.28, 0.28]) part(van, box(0.018, 0.1, 0.16), '#fff3c6', 0.976, 0.66, z);
  part(van, rbox(0.26, 0.05, 0.3, 0.02), INK, 0.56, 0.84, 0.19);
  part(van, rbox(0.04, 0.26, 0.3, 0.02), INK, 0.42, 0.96, 0.19);
  const steer = part(van, new THREE.TorusGeometry(0.075, 0.009, 8, 18), INK, 0.77, 1.02, 0.19, { ry: Math.PI / 2, rz: 0.15 });
  steer.userData.ownGeometry = true;
  const driver = group(van, 0.55, 0.86, 0.19, Math.PI / 2);
  part(driver, rbox(0.24, 0.3, 0.16, 0.05), BLUE, 0, 0.14, 0);
  part(driver, ball(0.095), SKIN, 0, 0.38, 0);
  part(driver, ball(0.1), '#2b1b10', 0, 0.41, -0.02);
  driver.visible = false;
  const hood = part(van, box(0.3, 0.012, 0.3), '#e8ecec', 0.82, 0.92, 0, { outline: false });
  hood.castShadow = false;
  part(van, box(0.02, 0.05, 0.3), INK, 0.97, 0.5, 0, { outline: false });
  label(van, '설비 2048', 0.22, 0.06, 0.0, 0.42, 0.432, '#fffde7', INK);
  // The wheels.
  const wheels: THREE.Object3D[] = [];
  for (const x of [-0.6, 0.62]) for (const z of [-0.43, 0.43]) {
    const w = group(van, x, 0.25, z);
    part(w, cyl(0.21, 0.21, 0.095, 24), '#23272b', 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.12, 0.12, 0.1, 18), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.05, 0.05, 0.105, 12), INK, 0, 0, 0, { rx: Math.PI / 2 });
    wheels.push(w);
  }
  // The roof: a rack with pipes strapped on and a red flag on the longest, a beacon on the cab.
  for (const x of [-0.72, 0.2]) {
    for (const z of [-0.34, 0.34]) part(van, box(0.04, 0.09, 0.04), INK, x, 1.41, z);
    part(van, box(0.05, 0.04, 0.78), STEEL, x, 1.47, 0);
  }
  [[-0.2, GALV, 0.02], [-0.1, COPPER, 0.02], [0.0, GALV, 0.026], [0.12, PVC, 0.05], [0.26, PVC, 0.05]].forEach(([z, col, r], i) => {
    const p = group(van, -0.2, 1.51 + (r as number), z as number);
    xPipe(p, -0.84, 0.84 + (i === 0 ? 0.24 : 0), r as number, col as string);
  });
  part(van, box(0.1, 0.1, 0.01), RED, 0.95, 1.5, -0.2, { outline: false });
  for (const x of [-0.72, 0.2]) part(van, box(0.03, 0.012, 0.74), '#ef6c00', x, 1.6, 0, { outline: false });
  const beacon = ownLit(van, ball(0.045), '#6b4f12', 0.6, 1.36, 0);
  part(van, cyl(0.05, 0.05, 0.02, 12), BLACK, 0.6, 1.33, 0, { outline: false });
  // The sliding door, run back along the body.
  const door = group(van, VN.doorShut, 0, 0.44);
  part(door, rbox(0.66, 0.54, 0.028, 0.014), WHITE, 0, 1.04, 0);
  part(door, box(0.62, 0.05, 0.03), BLUE, 0, 0.82, 0);
  label(door, '24시 출동', 0.42, 0.09, 0, 1.08, 0.016, WHITE, HOT);
  part(door, rbox(0.1, 0.025, 0.025, 0.006), INK, 0.28, 1.02, 0.02);
  // On the ground beside it: a stool with the tool box, a length, while it's being loaded.
  part(g, rbox(0.42, 0.03, 0.26, 0.012), STEEL, VN.box[0], 0.245, VN.box[2]);
  for (const x of [-0.16, 0.16]) for (const z of [-0.09, 0.09]) part(g, box(0.024, 0.24, 0.024), INK, VN.box[0] + x, 0.12, VN.box[2] + z);
  const loose = group(g);
  toolbox(loose);
  const pipeL = group(g);
  xPipe(pipeL, -0.45, 0.45, 0.024, GALV);
  const clip = clipMesh(g, painted('pbJobSheet', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '출동 지시서', 64, 14, 14, INK, 'center');
    ['배관 절단기', '공구함', '강관 3m', '동파 열선', '보온재'].forEach((s, i) => {
      c.strokeStyle = INK;
      c.strokeRect(8, 38 + i * 24, 10, 10);
      text(c, s, 26, 43 + i * 24, 12, INK);
    });
  }), 0.16, 0.22);
  const spots: Record<string, Spot> = { pbLoadVan: standAt(g, 'pbLoad', VN.stand), serviceCall: standAt(g, 'pbLoad', VN.stand), burstPipe: standAt(g, 'pbLoad', VN.stand) };
  spots['*'] = spots.pbLoadVan;
  let state: 'parked' | 'ready' | 'leaving' | 'gone' | 'back' = 'parked';
  let since = 0;
  let travel = 0;
  let returnFrom = 1;
  drive(g, out, spots, (now, N, t, gone) => {
    // Out on a call: a moment with the engine on, off down the road, and back in when the job's done.
    if (gone && (state === 'parked' || state === 'back')) {
      state = 'ready';
      since = t;
    } else if (!gone && (state === 'ready' || state === 'leaving' || state === 'gone')) {
      returnFrom = travel;
      state = 'back';
      since = t;
    }
    if (state === 'ready' && t - since > 1.2) {
      state = 'leaving';
      since = t;
    }
    if (state === 'leaving') {
      travel = Math.min(1, (t - since) / 5) ** 2;
      if (travel === 1) state = 'gone';
    } else if (state === 'back') {
      travel = returnFrom * (1 - Math.min(1, (t - since) / 6)) ** 2;
      if (travel === 0) state = 'parked';
    } else if (state === 'parked' || state === 'ready') travel = 0;
    van.position.x = travel * 8;
    van.visible = state !== 'gone';
    wheels.forEach((w) => (w.rotation.z = (-travel * 8) / 0.21));
    driver.visible = state === 'ready' || state === 'leaving' || state === 'back';
    steer.rotation.x = driver.visible ? 0.12 * Math.sin(t * 2) : 0;
    setLit(beacon, (gone || state === 'back') && Math.sin(t * 12) > 0 ? '#ffb300' : '#6b4f12');
    const out_ = state !== 'parked';
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const scripted = !out_ && now === 'pbLoadVan';
    door.position.x = VN.doorShut + (scripted ? (n.open ?? 0) : 0) * (VN.doorOpen - VN.doorShut);
    const boxIn = out_ || (scripted && (n.boxIn ?? 0) > 0.5);
    inBox.visible = boxIn;
    at(loose, scripted ? P.box : null, boxIn ? undefined : VN.box);
    stored.visible = out_ || (scripted && (n.pipeIn ?? 0) > 0.5);
    at(pipeL, scripted ? P.pipe : null);
    if (scripted && !P.pipe && !stored.visible) at(pipeL, null, VN.pipe);
    strap.visible = stored.visible && (out_ || (n.strap ?? 0) > 0.5);
    at(clip.root, scripted ? P.clip : null);
  });
  out.work = marker(g, -0.06, 1.0, 0.3);
}
/** The red tool box: its origin at the bottom, the handle over it. */
function toolbox(g: THREE.Object3D) {
  part(g, rbox(0.36, 0.17, 0.18, 0.015), RED, 0, 0.085, 0);
  part(g, box(0.37, 0.012, 0.19), '#8e1c1c', 0, 0.12, 0, { outline: false });
  part(g, box(0.2, 0.012, 0.02), BLACK, 0, 0.2, 0, { outline: false });
  for (const x of [-0.1, 0.1]) part(g, box(0.012, 0.03, 0.02), BLACK, x, 0.185, 0, { outline: false });
}

export const BUILDERS: Record<string, Builder> = {
  pipeBench(g, _W, _D, _c, _def, _ctx, out) {
    pipeBench(g, out);
  },
  leakDetector(g, _W, _D, _c, _def, _ctx, out) {
    leakDetector(g, out);
  },
  boilerUnit(g, _W, _D, _c, _def, _ctx, out) {
    boiler(g, out);
  },
  plumbingVan(g, _W, _D, _c, _def, _ctx, out) {
    serviceVan(g, out);
  },
  pbThreader(g, _W, _D, _c, _def, _ctx, out) {
    threader(g, out);
  },
  pbPipeRack(g, _W, _D, _c, _def, _ctx, out) {
    pipeRack(g, out);
  },
  pbLeakWall(g, W, _D, _c, _def, _ctx, out) {
    leakWall(g, out, W);
  },
  pbDrainRig(g, _W, _D, _c, _def, _ctx, out) {
    drainRig(g, out);
  },
  pbFixtureRig(g, _W, _D, _c, _def, _ctx, out) {
    fixtureRig(g, out);
  },
  pbCounter(g, W, _D, _c, _def, _ctx, out) {
    partsCounter(g, out, W);
  },
};
