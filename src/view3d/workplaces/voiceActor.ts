import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, text } from './doctor';
import { CAST, CD, DB, EL, FT, MC, ND, PEN_UP, SR, SS, TC, VM, vaNow, vaPhase, wrap } from './voiceActorMotion';
import type { VaMotion, VaNow, VaTool } from './voiceActorMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 녹음 스튜디오 drawn as itself (2026-11-01), a dubbing studio of a made-up name, 울림나래 녹음실, working on an invented cartoon,
 * 별똥 순찰대. Foam booths with a condenser mic, pop filter and script stand; the cartoon playing silently on a screen with a timing
 * bar to fit the lips to; a control room looking through glass at a colleague in a booth, with a director and an engineer; an
 * ensemble line of mics; a foley table of noises with gravel and boards to walk on; a throat-care tea corner and a rack of scripts.
 * Everything that moves follows voiceActorMotion.ts. All names are invented.
 */

const STUDIO = '울림나래 녹음실';
const SHOW = '별똥 순찰대';
const FOAM = '#3b4150';
const FOAM_L = '#555c6e';
const PLUM = '#4527a0';
const VIOLET = '#7e57c2';
const LILAC = '#d9cdf2';
const WALNUT = '#6d4c33';
const WOOD = '#b08a62';
const GRAPHITE = '#2f363c';
const GREY_D = '#55616b';
const PAPER = '#fbfaf3';
const RED = '#e53935';
const AMBER = '#ffb300';
const GREEN = '#43a047';
const MINT = '#7ee89e';
const SKIN = '#f1c9a5';
const INK = '#14131c';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const frac = (x: number) => ((x % 1) + 1) % 1;
const typed = (s: string, e: number | undefined) => s.slice(0, Math.floor(s.length * clamp01(e) + 0.001));

// ---------------------------------------------------------------------------------------------
// The room's one shared thing: a word over the talkback reaches the actor in the booth through the glass.

const ROOM = { talkAt: -1e9, directAt: -1e9 };

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
function standAt(g: THREE.Object3D, motion: VaMotion, x = 0, z = 0.6, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: VaMotion, seat: V, yaw = Math.PI): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<VaTool, HeldTool>>, show: (now: string | null, N: VaNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? vaNow(sp.motion as VaMotion, t, vaPhase(g.getWorldPosition(tmp)), H) : null;
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
function chair(g: THREE.Object3D, seat: V, color = PLUM) {
  const c = group(g, seat[0], 0, seat[2]);
  const T = seat[1];
  part(c, rbox(0.44, 0.07, 0.42, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.23, 0.05, Math.sin(a) * 0.23), 0.014, BLACK);
    part(c, ball(0.024), BLACK, Math.cos(a) * 0.23, 0.026, Math.sin(a) * 0.23, { outline: false });
  }
  part(c, rbox(0.4, 0.42, 0.06, 0.04), color, 0, T + 0.3, 0.23, { rx: 0.1 });
}
/** Acoustic foam: a wall of wedges, painted once. */
function foamTexture(): THREE.Texture {
  return painted('vaFoam', 128, 128, (c) => {
    const s = 16;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const px = x * s;
        const py = y * s;
        const flip = (x + y) % 2 === 0;
        c.fillStyle = FOAM;
        c.fillRect(px, py, s, s);
        c.fillStyle = flip ? FOAM_L : '#2d3240';
        c.beginPath();
        if (flip) {
          c.moveTo(px, py);
          c.lineTo(px + s, py);
          c.lineTo(px + s / 2, py + s);
        } else {
          c.moveTo(px, py + s);
          c.lineTo(px + s, py + s);
          c.lineTo(px + s / 2, py);
        }
        c.closePath();
        c.fill();
      }
    }
  });
}
function foamWall(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0) {
  const tex = foamTexture().clone();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, Math.round(w * 2.4)), Math.max(1, Math.round(h * 2.4)));
  tex.needsUpdate = true;
  return picture(g, tex, w, h, x, y, z, '#ffffff', ry);
}
/**
 * A condenser mic in a shock mount on a boom from a floor stand, its capsule at `m`, the pop filter on the side the
 * voice comes from (`to`, a unit direction across the floor).
 */
function micRig(g: THREE.Object3D, m: V, to: readonly [number, number], foot: readonly [number, number]) {
  const baseY = 0.016;
  part(g, cyl(0.14, 0.16, 0.03, 16), GRAPHITE, foot[0], baseY, foot[1], { outline: false });
  const topY = m[1] + 0.16;
  rod(g, v3(foot[0], 0.03, foot[1]), v3(foot[0], topY, foot[1]), 0.012, BLACK);
  rod(g, v3(foot[0], topY, foot[1]), v3(m[0], m[1] + 0.13, m[2]), 0.008, BLACK);
  const spin = Math.atan2(to[0], to[1]);
  const h = group(g, m[0], m[1], m[2], spin);
  // The body, its grille and the cradle round it.
  part(h, cyl(0.026, 0.024, 0.13, 14), '#c9cdd1', 0, -0.015, 0, { outline: false });
  part(h, ball(0.03), '#9aa2a8', 0, 0.05, 0, { outline: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.004, 6, 18), new THREE.MeshToonMaterial({ color: BLACK }));
  ring.userData.ownGeometry = ring.userData.ownMaterial = true;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.005;
  h.add(ring);
  rod(h, v3(0, 0.09, 0), v3(0, -0.005, 0), 0.004, BLACK);
  // The pop filter: a ring of black gauze on a bent neck, between the capsule and the mouth.
  const popZ = 0.095;
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.004, 6, 22), new THREE.MeshToonMaterial({ color: BLACK }));
  hoop.userData.ownGeometry = hoop.userData.ownMaterial = true;
  hoop.position.set(0, 0.03, popZ);
  h.add(hoop);
  haze(h, new THREE.CircleGeometry(0.056, 22), '#101014', 0.45, 0, 0.03, popZ);
  rod(h, v3(0.05, 0.1, 0.02), v3(0.03, 0.08, popZ), 0.003, BLACK);
  return h;
}
/** A music stand, the page's centre at `p`, tilted to the eye; returns the page. */
function musicStand(g: THREE.Object3D, p: V, w = 0.34, h = 0.25, px = 300, py = 220) {
  const tilt = -0.9;
  const s = Math.sin(0.9);
  const c = Math.cos(0.9);
  part(g, box(w + 0.05, h + 0.05, 0.01), GRAPHITE, p[0], p[1], p[2], { rx: tilt, outline: false });
  part(g, box(w + 0.05, 0.02, 0.03), GRAPHITE, p[0], p[1] - (h / 2 + 0.03) * c, p[2] + (h / 2 + 0.03) * s, { outline: false });
  rod(g, v3(p[0], 0.03, p[2]), v3(p[0], p[1] - 0.04, p[2]), 0.011, BLACK);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, v3(p[0], 0.3, p[2]), v3(p[0] + Math.cos(a) * 0.22, 0.015, p[2] + Math.sin(a) * 0.22), 0.007, BLACK);
  }
  return liveScreen(g, w, h, px, py, p[0], p[1] + s * 0.007, p[2] + c * 0.007, 0, tilt);
}
/** Headphones round the group's origin at the head's centre. */
function cans(g: THREE.Object3D, color = '#26262e'): THREE.Group {
  const h = group(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.009, 8, 22, Math.PI), new THREE.MeshToonMaterial({ color }));
  band.userData.ownGeometry = band.userData.ownMaterial = true;
  h.add(band);
  for (const sx of [-1, 1]) part(h, cyl(0.052, 0.052, 0.036, 14), color, sx * 0.122, -0.005, 0, { rz: Math.PI / 2 });
  return h;
}
function wearing(worn: THREE.Object3D, parked: THREE.Object3D, on: boolean, seat: V, N: VaNow | null, H: number) {
  worn.visible = on;
  parked.visible = !on;
  if (on && N) {
    const lean = N.key.lean ?? 0.05;
    worn.position.set(seat[0], seat[1] + 0.44 * H * Math.cos(lean), seat[2] - 0.44 * H * Math.sin(lean));
    worn.scale.setScalar(H / 1.6);
  }
}
/** A small pair of cans hanging on a hook, for the actor who works with one ear free. */
function hungCans(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const h = cans(g);
  h.position.set(x, y, z);
  h.rotation.y = ry;
  h.scale.setScalar(0.72);
  return h;
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

const DOWN = v3(-0.12, -1, -0.28).normalize();
function penTool(g: THREE.Object3D, color = '#f9a825'): THREE.Group {
  const root = group(g);
  root.name = 'vaPencil';
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), DOWN);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 8), color, 0, (0.05 - PEN_UP * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(0.006, 0.0015, PEN_UP * 0.22, 8), '#e8cfa8', 0, -PEN_UP * 0.89, 0, { outline: false });
  part(inner, cyl(0.0065, 0.0065, 0.014, 8), '#ef9a9a', 0, 0.054, 0, { outline: false });
  return root;
}
const penHeld = (tool: THREE.Object3D): HeldTool => ({ tool, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: DOWN.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } });
/** What's carried flat on the left forearm: a script, a clipboard. */
const FLAT_LEFT: HeldTool['grips'] = { left: boardGrip(0.6) };
function stopwatchTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'vaStopwatch';
  const face = group(root);
  face.rotation.x = -1.0;
  part(face, cyl(0.03, 0.03, 0.014, 18), CHROME, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(face, cyl(0.006, 0.006, 0.014, 8), GREY_D, 0, 0.036, 0, { outline: false });
  const screen = liveScreen(face, 0.042, 0.042, 64, 64, 0, 0, 0.0085);
  return { root, screen };
}
function heelTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'vaHeel';
  // The shoe held by its upper, the heel straight down below the hand.
  part(root, rbox(0.17, 0.05, 0.065, 0.02), '#7b1f2d', 0.03, 0, 0, { outline: false });
  part(root, rbox(0.07, 0.04, 0.06, 0.014), '#5e1520', -0.045, 0.025, 0, { outline: false });
  part(root, cyl(0.016, 0.008, 0.06, 10), '#2a2024', -0.06, -0.03, 0, { outline: false });
  return root;
}
function cupTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'vaCup';
  part(root, cyl(0.04, 0.034, 0.09, 16), '#d9cdf2', 0, 0, 0, { outline: false });
  const tea = part(root, cyl(0.036, 0.036, 0.003, 14), '#d9a441', 0, 0.038, 0, { outline: false });
  return { root, tea };
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
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number): Fig {
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
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, base + 1.37, dz, { outline: false });
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const rest = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
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
  const opts: FigureOptions = { gender, seat, seed };
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
/** A point from someone's body, in the frame of their parent: to their left, up from the floor, ahead of them. */
function bodyAt(F: Fig, side: number, up: number, ahead: number, out = new THREE.Vector3()) {
  return out.set(side, up, ahead).applyAxisAngle(UP, F.root.rotation.y).add(F.root.position);
}
/** A colleague standing, acting a character: their arms and head as a dweller's are in voiceActorMotion's `acted`. */
function npcActs(F: Fig, mood: number, e: number, t: number) {
  const L = new THREE.Vector3();
  const R = new THREE.Vector3();
  switch (wrap(mood, CAST.length)) {
    case 0:
      bodyAt(F, 0.14, 1.12, 0.2, L);
      bodyAt(F, -0.24, 1.32 + 0.3 * e, 0.24, R);
      nodHead(F, -0.06 - 0.12 * e);
      break;
    case 1:
      bodyAt(F, 0.3, 1.16 + 0.26 * e, 0.24, L);
      bodyAt(F, -0.3, 1.16 + 0.26 * e, 0.24, R);
      nodHead(F, 0.14 - 0.34 * e + 0.04 * e * Math.sin(t * 11));
      break;
    case 2:
      bodyAt(F, 0.1, 1.42, 0.14, L);
      bodyAt(F, -0.1, 1.42, 0.14, R);
      nodHead(F, 0.08 + 0.06 * Math.sin(t * 5));
      break;
    default:
      bodyAt(F, 0.2, 0.96, -0.08, L);
      bodyAt(F, -0.18, 0.92 + 0.012 * Math.sin(t * 15), 0.3, R);
      nodHead(F, 0.12 + 0.05 * Math.sin(t * 2));
  }
  F.armL(L);
  F.armR(R);
}
/** A colleague waiting their turn: a script held low, reading. */
function npcWaits(F: Fig, script: THREE.Object3D | null, t: number) {
  const L = bodyAt(F, 0.08, 1.04, 0.28);
  F.armL(L);
  F.armR(null);
  if (script) script.position.copy(L).add(tmp.set(0, 0.03, 0));
  nodHead(F, 0.22 + 0.02 * Math.sin(t * 1.4));
}

// ---------------------------------------------------------------------------------------------
// The cartoon, playing silently, and the timing bar. `head` runs 0 to 1 through a line.

interface Reel {
  scene: number;
  talk: boolean;
  flap: number;
  head: number;
  spoken: number;
  rec: boolean;
  count?: number;
  urgent?: boolean;
  noBar?: boolean;
}
function drawCharacter(c: Ctx2, who: number, x: number, y: number, r: number, open: number) {
  const R = pos(r);
  const col = CAST[wrap(who, CAST.length)].color;
  c.fillStyle = col;
  switch (wrap(who, CAST.length)) {
    case 0:
      // 콩떡, a round cat with a cape.
      c.fillStyle = '#e53935';
      c.beginPath();
      c.moveTo(x - R * 0.9, y + R * 0.5);
      c.lineTo(x + R * 0.9, y + R * 0.5);
      c.lineTo(x + R * 1.3, y + R * 1.7);
      c.lineTo(x - R * 1.3, y + R * 1.7);
      c.closePath();
      c.fill();
      c.fillStyle = col;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(x + s * R * 0.9, y - R * 0.3);
        c.lineTo(x + s * R * 0.75, y - R * 1.3);
        c.lineTo(x + s * R * 0.2, y - R * 0.85);
        c.closePath();
        c.fill();
      }
      break;
    case 1:
      // 먹구름 대왕, a storm cloud with a crown.
      for (const [dx, dy, s] of [[-0.8, 0.2, 0.7], [0.8, 0.2, 0.7], [-0.4, -0.45, 0.65], [0.4, -0.45, 0.65]] as const) {
        c.beginPath();
        c.arc(x + dx * R, y + dy * R, pos(R * s), 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = AMBER;
      c.beginPath();
      c.moveTo(x - R * 0.5, y - R * 0.9);
      c.lineTo(x - R * 0.5, y - R * 1.45);
      c.lineTo(x - R * 0.2, y - R * 1.15);
      c.lineTo(x, y - R * 1.5);
      c.lineTo(x + R * 0.2, y - R * 1.15);
      c.lineTo(x + R * 0.5, y - R * 1.45);
      c.lineTo(x + R * 0.5, y - R * 0.9);
      c.closePath();
      c.fill();
      c.fillStyle = col;
      break;
    case 2:
      // 꼬마 별이, a little star.
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? R * 0.75 : R * 1.45;
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
      c.fill();
      break;
    default:
      // 달 할아범, a crescent with a beard.
      c.fillStyle = '#fafafa';
      c.beginPath();
      c.moveTo(x - R * 0.6, y + R * 0.45);
      c.lineTo(x + R * 0.6, y + R * 0.45);
      c.lineTo(x, y + R * 1.7);
      c.closePath();
      c.fill();
      c.fillStyle = col;
  }
  c.beginPath();
  c.arc(x, y, R, 0, Math.PI * 2);
  c.fill();
  // The eyes, and the mouth the actor is fitting to.
  c.fillStyle = INK;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(x + s * R * 0.38, y - R * 0.15, pos(R * 0.11), 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#7a1f2e';
  c.beginPath();
  c.ellipse(x, y + R * 0.38, pos(R * 0.32), pos(R * (0.04 + 0.3 * clamp01(open))), 0, 0, Math.PI * 2);
  c.fill();
}
function paintReel(c: Ctx2, w: number, h: number, v: Reel) {
  const who = wrap(v.scene, CAST.length);
  const cast = CAST[who];
  const barH = v.noBar ? 0 : Math.max(26, Math.round(h * 0.16));
  const picH = h - barH;
  c.fillStyle = cast.sky;
  c.fillRect(0, 0, w, picH);
  // The sky goes by while it plays.
  c.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 16; i++) {
    const sx = frac(i * 0.137 - v.head * 0.1) * w;
    const sy = frac(i * 0.59) * picH * 0.55;
    c.beginPath();
    c.arc(sx, sy, pos(1 + (i % 3)), 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(30,20,50,0.38)';
  c.beginPath();
  c.ellipse(w / 2, picH * 1.02, pos(w * 0.7), pos(picH * 0.24), 0, 0, Math.PI * 2);
  c.fill();
  const r = Math.min(picH * 0.24, w * 0.14);
  drawCharacter(c, who, w * 0.5, picH * 0.46, r, v.talk ? 0.25 + 0.75 * v.flap : 0);
  const fs = Math.max(12, Math.round(picH * 0.075));
  text(c, `${SHOW} 12화`, 8, fs * 0.8, fs, 'rgba(255,255,255,0.85)');
  // Subtitle of the line, what's been said brighter.
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, picH - fs * 1.8, w, fs * 1.8);
  text(c, `${cast.who}: ${cast.line}`, w / 2, picH - fs * 0.9, fs, 'rgba(255,255,255,0.45)', 'center', false);
  c.save();
  c.beginPath();
  c.rect(0, picH - fs * 1.8, w * clamp01(v.spoken), fs * 1.8);
  c.clip();
  text(c, `${cast.who}: ${cast.line}`, w / 2, picH - fs * 0.9, fs, '#fff176', 'center', false);
  c.restore();
  if (v.rec) {
    c.fillStyle = RED;
    c.beginPath();
    c.arc(w - fs * 3.2, fs * 0.8, pos(fs * 0.34), 0, Math.PI * 2);
    c.fill();
    text(c, 'REC', w - 6, fs * 0.8, fs, '#ffffff', 'right');
  }
  if (v.urgent) {
    c.fillStyle = 'rgba(229,57,53,0.9)';
    c.fillRect(0, fs * 1.6, w, fs * 1.6);
    text(c, '방송 직전 수정! 긴급 재녹음', w / 2, fs * 2.4, fs, '#ffffff', 'center');
  }
  if (v.count) text(c, String(Math.max(1, Math.round(v.count))), w / 2, picH * 0.46, Math.round(picH * 0.4), '#ffffff', 'center');
  if (v.noBar) return;
  // The timing bar: three cue marks, the block of the line, the head sweeping over.
  c.fillStyle = '#14141c';
  c.fillRect(0, picH, w, barH);
  const bx = 10;
  const bw = w - 20;
  const start = 0.2;
  const end = 0.86;
  c.fillStyle = v.talk ? '#3fbf6f' : '#2e7d52';
  c.fillRect(bx + bw * start, picH + barH * 0.28, bw * (end - start), barH * 0.44);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 24; i++) c.fillRect(bx + bw * start + (i * bw * (end - start)) / 24, picH + barH * 0.28, 1, barH * 0.44);
  c.fillStyle = AMBER;
  for (const m of [0.05, 0.1, 0.15]) c.fillRect(bx + bw * m, picH + barH * 0.2, 3, barH * 0.6);
  c.fillStyle = '#ffffff';
  c.fillRect(bx + bw * clamp01(v.head) - 1, picH + 1, 3, barH - 2);
}
const reelKey = (v: Reel) => `${wrap(v.scene, CAST.length)}|${v.talk ? q(v.flap, 2) : -1}|${q(v.head, 48)}|${q(v.spoken, 24)}|${v.rec ? 1 : 0}|${v.count ?? 0}|${v.urgent ? 1 : 0}`;
/** A mouth going by the clock, not quite regular, as a mouth is. */
const flapAt = (t: number) => (Math.sin(t * 13) + Math.sin(t * 7.3) > 0 ? 1 : 0);
/** The show running by the clock when no one's recording: it just loops silently. */
function idleReel(t: number): Reel {
  const u = frac(t / 11);
  const scene = wrap(Math.floor(t / 11), CAST.length);
  return { scene, talk: u > 0.2 && u < 0.86, flap: flapAt(t), head: u, spoken: clamp01((u - 0.2) / 0.66), rec: false };
}
function paintScript(c: Ctx2, w: number, h: number, v: { scene: number; hi: number; marks: number; fixed?: number; note?: boolean }) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#ded6c3';
  c.fillRect(0, 0, w, 22);
  text(c, `${SHOW} 12화 대본`, 8, 12, 13, GREY_D);
  const who = wrap(v.scene, CAST.length);
  const rows = [0, 1, 2, 3].map((i) => CAST[wrap(who + i, CAST.length)]);
  rows.forEach((r, i) => {
    const y = 42 + i * ((h - 52) / 4);
    if (i === 0 && clamp01(v.hi) > 0.5) {
      c.fillStyle = 'rgba(255,224,90,0.7)';
      c.fillRect(4, y - 10, w - 8, 40);
    }
    text(c, r.who, 8, y, 13, i === 0 ? PLUM : GREY_D);
    text(c, r.line, 16, y + 18, 13, INK, 'left', false);
  });
  // Breath marks pencilled in.
  c.strokeStyle = '#555';
  c.lineWidth = 2;
  for (let i = 0; i < Math.min(6, Math.floor(clamp01((v.marks ?? 0) / 6) * 6)); i++) {
    const x = 36 + ((i * 53) % (w - 60));
    const y = 66 + ((i * 41) % (h - 90));
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 5, y - 7);
    c.lineTo(x + 10, y);
    c.stroke();
  }
  if (v.note) {
    c.fillStyle = '#ffcdd2';
    c.fillRect(w - 112, 28, 104, 30);
    text(c, '대사 수정!', w - 60, 43, 14, '#b71c1c', 'center');
    if (clamp01(v.fixed) > 0.3) {
      c.strokeStyle = RED;
      c.beginPath();
      c.moveTo(14, 60);
      c.lineTo(14 + (w - 40) * clamp01(v.fixed), 60);
      c.stroke();
    }
  }
}

// =============================================================================================
// 더빙 부스 (dubbingBooth, 2 × 1).

function dubbingBooth(g: THREE.Group, out: Built) {
  part(g, box(1.96, 2.08, 0.03), FOAM, 0, 1.04, -0.485);
  foamWall(g, 1.92, 2.0, 0, 1.05, -0.465);
  for (const sx of [-1, 1]) {
    part(g, box(0.04, 2.08, 0.96), FOAM, sx * 0.98, 1.04, 0);
    foamWall(g, 0.92, 2.0, sx * 0.957, 1.05, 0, -sx * Math.PI / 2);
  }
  part(g, box(2.02, 0.14, 0.14), GRAPHITE, 0, 2.12, 0.42);
  part(g, rbox(2, 0.02, 1.0, 0.008), '#2a2d36', 0, 0.01, 0.45, { outline: false });
  // The lamp over the door.
  part(g, box(0.48, 0.13, 0.03), BLACK, 0, 2.12, 0.5, { outline: false });
  label(g, '녹음 중', 0.3, 0.09, 0, 2.12, 0.517, '#22090a', '#ffffff');
  const onAir = ownLit(g, ball(0.03), '#3a1515', -0.2, 2.12, 0.52);
  // The screen with the cartoon.
  part(g, box(1.18, 0.7, 0.04), BLACK, DB.screen[0], DB.screen[1], DB.screen[2] - 0.025, { outline: false });
  const screen = liveScreen(g, 1.12, 0.64, 512, 292, DB.screen[0], DB.screen[1], DB.screen[2]);
  const mic = DB.mic;
  micRig(g, mic, [-0.44, 0.9], [0.45, 0.28]);
  const page = musicStand(g, DB.script);
  const pen = penTool(g);
  hungCans(g, -0.92, 1.42, 0.1, Math.PI / 2);
  // A stool, water with its cap off, and a towel.
  part(g, cyl(0.15, 0.15, 0.04, 14), WALNUT, 0.72, 0.56, 0.1);
  part(g, cyl(0.02, 0.026, 0.54, 8), CHROME, 0.72, 0.27, 0.1, { outline: false });
  part(g, cyl(0.13, 0.15, 0.02, 12), GREY_D, 0.72, 0.012, 0.1, { outline: false });
  part(g, cyl(0.03, 0.033, 0.16, 12), '#b3e5fc', 0.68, 0.66, 0.08, { outline: false });
  part(g, rbox(0.1, 0.02, 0.09, 0.006), '#ede7f6', 0.78, 0.59, 0.14, { outline: false });
  const tools: Partial<Record<VaTool, HeldTool>> = { pen: penHeld(pen) };
  const spots: Record<string, Spot> = {
    dubCharacter: standAt(g, 'vaDub', DB.stand[0], DB.stand[1], Math.PI - 0.45),
    urgentDub: standAt(g, 'vaUrgent', DB.stand[0], DB.stand[1], Math.PI - 0.45),
  };
  const show = (_now: string | null, N: VaNow | null, t: number) => {
    const n = N?.n ?? {};
    at(pen, N?.props.pen ?? null, DB.penRest);
    const rec = (n.rec ?? 0) > 0.5;
    const urgent = (n.urgent ?? 0) > 0.5;
    setLit(onAir, urgent ? (Math.sin(t * 10) > 0 ? '#ff3b30' : '#6a1a1a') : rec ? '#e53935' : (n.ok ?? 0) > 0.5 ? '#2e7d32' : '#3a1515');
    const v: Reel = N
      ? { scene: n.scene ?? 0, talk: (n.talk ?? 0) > 0.5, flap: flapAt(t), head: clamp01(n.head), spoken: clamp01(n.spoken), rec, count: n.count, urgent }
      : idleReel(t);
    screen.draw(reelKey(v), (c) => paintReel(c, 512, 292, v));
    const P = { scene: n.scene ?? 0, hi: 1, marks: 3, fixed: n.fixed, note: (n.note ?? 0) > 0.5 };
    page.draw(`${wrap(P.scene, CAST.length)}|${q(n.page, 2)}|${q(P.fixed, 20)}|${P.note ? 1 : 0}`, (c) => paintScript(c, 300, 220, { ...P, scene: P.scene + ((n.page ?? 0) > 0.5 ? 1 : 0) }));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, mic[0], mic[1], mic[2]);
}

// =============================================================================================
// 대본 보면대 (scriptStand, 1 × 1), and the senior's mic when one's being watched.

function scriptStand(g: THREE.Group, out: Built) {
  const page = musicStand(g, SS.page);
  const pen = penTool(g);
  part(g, cyl(0.03, 0.033, 0.16, 12), '#b3e5fc', -0.3, 0.08, 0.08, { outline: false });
  const tools: Partial<Record<VaTool, HeldTool>> = { pen: penHeld(pen) };
  const rig = group(g);
  rig.visible = false;
  micRig(rig, [SS.senior[0] - 0.03, 1.46, SS.senior[1] - 0.34], [0, 1], [SS.senior[0] + 0.34, SS.senior[1] - 0.4]);
  part(rig, box(0.5, 0.004, 0.5), AMBER, SS.senior[0], 0.002, SS.senior[1], { outline: false });
  const senior = lazy(() => person(g, '#7e57c2', '#37474f', '#2b1b10', SS.senior[0], SS.senior[1], Math.PI, 'female'));
  const spots: Record<string, Spot> = {
    studyScript: standAt(g, 'vaStudy', 0, SS.stand),
    voiceActor_watchSession: standAt(g, 'vaWatch', 0.1, SS.stand + 0.06, Math.PI / 2 + 0.25),
  };
  const show = (_now: string | null, N: VaNow | null, t: number) => {
    const n = N?.n ?? {};
    at(pen, N?.props.pen ?? null, SS.penRest);
    const watching = (n.senior ?? 0) > 0.5;
    rig.visible = watching;
    if (watching) {
      const f = senior.get();
      f.root.visible = true;
      if ((n.srActs ?? 0) > 0.5) npcActs(f, n.srMood ?? 0, clamp01(n.srPeak), t);
      else {
        f.armL(null);
        f.armR(null);
        nodHead(f, (n.srBow ?? 0) > 0.5 ? 0.35 : 0.12);
      }
    } else senior.hide();
    page.draw(`${wrap(n.scene ?? 0, CAST.length)}|${q(n.hi, 2)}|${Math.floor(n.marks ?? 0)}`, (c) => paintScript(c, 300, 220, { scene: n.scene ?? 0, hi: n.hi ?? 0, marks: n.marks ?? 0 }));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, SS.page[0], SS.page[1], SS.page[2]);
}

// =============================================================================================
// 발성 연습 거울 (voiceMirror, 1 × 1).

const TWISTER = ['간장 공장 공장장', '들의 콩깍지는 깐 콩깍지', '저기 저 말뚝은', '말 맬 말뚝이냐'];
function voiceMirror(g: THREE.Group, out: Built) {
  part(g, box(0.86, 1.92, 0.05), WALNUT, 0, 0.98, -0.38);
  for (const sx of [-1, 1]) part(g, box(0.06, 0.03, 0.4), WALNUT, sx * 0.34, 0.015, -0.26);
  const glass = painted('vaMirror', 64, 128, (c) => {
    const lg = c.createLinearGradient(0, 0, 64, 128);
    lg.addColorStop(0, '#e8f1f6');
    lg.addColorStop(0.45, '#b9ccd8');
    lg.addColorStop(0.55, '#d8e6ee');
    lg.addColorStop(1, '#a4bac8');
    c.fillStyle = lg;
    c.fillRect(0, 0, 64, 128);
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = 4;
    for (const off of [18, 34]) {
      c.beginPath();
      c.moveTo(off, 0);
      c.lineTo(off - 30, 60);
      c.stroke();
    }
  });
  picture(g, glass, 0.76, 1.82, 0, 0.98, -0.352);
  // Taped on: today's tongue twister at eye height, the character cards below, and a level ladder down the side.
  const sheet = liveScreen(g, 0.34, 0.2, 256, 150, -0.17, 1.62, -0.348);
  const cards = liveScreen(g, 0.72, 0.18, 512, 128, 0, 0.42, -0.348);
  const ladder = Array.from({ length: 10 }, (_, i) => ownLit(g, new THREE.CircleGeometry(0.014, 10), '#2e3540', 0.42, 0.72 + i * 0.09, -0.352));
  part(g, box(0.06, 1.0, 0.02), GRAPHITE, 0.42, 1.12, -0.37, { outline: false });
  part(g, cyl(0.03, 0.033, 0.16, 12), '#b3e5fc', -0.36, 0.08, -0.12, { outline: false });
  const spots: Record<string, Spot> = {
    voiceWarmup: standAt(g, 'vaWarm', 0, VM.stand),
    voiceActor_createVoice: standAt(g, 'vaVoice', 0, VM.stand),
  };
  const show = (_now: string | null, N: VaNow | null) => {
    const n = N?.n ?? {};
    const lv = clamp01(n.level);
    ladder.forEach((m, i) => setLit(m, lv * 10 > i ? (i > 7 ? '#ff5252' : i > 5 ? '#ffc107' : '#66bb6a') : '#2e3540'));
    const hot = (n.twister ?? 0) > 0.5;
    sheet.draw(hot ? 'on' : 'off', (c) => {
      c.fillStyle = hot ? '#fff3c9' : PAPER;
      c.fillRect(0, 0, 256, 150);
      text(c, '오늘의 잰말', 128, 18, 18, PLUM, 'center');
      TWISTER.forEach((s, i) => text(c, s, 12, 48 + i * 26, 18, INK, 'left', false));
    });
    const card = n.card ?? -1;
    const got = (n.got ?? 0) > 0.5;
    cards.draw(`${Math.round(card)}|${got ? 1 : 0}`, (c) => {
      c.clearRect(0, 0, 512, 128);
      c.fillStyle = '#a4bac8';
      c.fillRect(0, 0, 512, 128);
      CAST.forEach((p, i) => {
        const x = 6 + i * 126;
        const on = Math.round(card) === i;
        c.fillStyle = on ? (got ? '#c8e6c9' : '#fff59d') : PAPER;
        c.fillRect(x, 6, 120, 116);
        drawCharacter(c, i, x + 60, 54, 26, on ? 0.7 : 0.1);
        text(c, p.who, x + 60, 108, 15, INK, 'center');
      });
    });
  };
  show(null, null);
  drive(g, out, spots, {}, show);
  out.work = marker(g, 0, 1.4, -0.3);
}

// =============================================================================================
// 내레이션 데스크 (narrationDesk, 1 × 1).

const COPY_LINES = ['깊은 숲속, 아침이 밝아 옵니다.', '작은 다람쥐가 먼 길을 나섭니다.', '겨울이 오기 전에 말이지요.'];
function narrationDesk(g: THREE.Group, out: Built) {
  const T = ND.top;
  part(g, rbox(0.98, 0.04, 0.72, 0.012), WALNUT, 0, T - 0.02, -0.08);
  for (const sx of [-1, 1]) part(g, box(0.04, T - 0.04, 0.6), GRAPHITE, sx * 0.44, (T - 0.04) / 2, -0.1, { outline: false });
  part(g, box(0.86, 0.32, 0.02), GRAPHITE, 0, 0.42, -0.38, { outline: false });
  chair(g, ND.seat, VIOLET);
  // A curved reflection screen of foam behind the mic, kept low.
  part(g, box(0.72, 0.44, 0.03), FOAM, 0, T + 0.22, -0.4);
  foamWall(g, 0.68, 0.4, 0, T + 0.22, -0.382);
  // Lectern with the copy on it, and what's been read laid aside.
  part(g, box(0.34, 0.012, 0.25), GRAPHITE, ND.page[0], ND.page[1] - 0.01, ND.page[2], { rx: 0.22, outline: false });
  part(g, box(0.28, 0.06, 0.03), GREY_D, ND.page[0], T + 0.03, ND.page[2] - 0.1, { outline: false });
  const page = liveScreen(g, 0.3, 0.22, 300, 220, ND.page[0], ND.page[1], ND.page[2], 0, -Math.PI / 2 + 0.22);
  const done = part(g, box(0.21, 0.01, 0.29), PAPER, ND.done[0], T + 0.006, ND.done[2] - 0.04, { rx: 0.02, outline: false });
  // The screen with the waveform; low, so it doesn't hide the reader.
  part(g, box(0.36, 0.24, 0.03), BLACK, -0.28, T + 0.2, -0.28, { outline: false });
  const screen = liveScreen(g, 0.33, 0.21, 256, 164, -0.28, T + 0.2, -0.262);
  part(g, box(0.1, 0.008, 0.08), GRAPHITE, -0.28, T + 0.004, -0.27, { outline: false });
  // A mic on a sprung arm, clamped to the back of the desk, reaching towards the mouth.
  const micPos: V = [0.02, ND.seat[1] + 0.63, 0.28];
  rod(g, v3(0.36, T, -0.3), v3(0.3, T + 0.42, -0.1), 0.009, BLACK);
  rod(g, v3(0.3, T + 0.42, -0.1), v3(micPos[0] + 0.03, micPos[1] + 0.12, micPos[2] - 0.02), 0.008, BLACK);
  part(g, cyl(0.022, 0.026, 0.05, 10), GREY_D, 0.36, T + 0.02, -0.3, { outline: false });
  const h = group(g, micPos[0], micPos[1], micPos[2]);
  part(h, cyl(0.026, 0.024, 0.13, 14), '#c9cdd1', 0, 0, 0, { outline: false });
  part(h, ball(0.03), '#9aa2a8', 0, 0.066, 0, { outline: false });
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.004, 6, 22), new THREE.MeshToonMaterial({ color: BLACK }));
  hoop.userData.ownGeometry = hoop.userData.ownMaterial = true;
  hoop.position.set(0, 0.03, 0.09);
  h.add(hoop);
  haze(h, new THREE.CircleGeometry(0.054, 22), '#101014', 0.42, 0, 0.03, 0.09);
  // The on-air lamp at the desk's edge, cans on a stand, pencil and watch.
  const lamp = ownLit(g, ball(0.016), '#3a1515', 0.42, T + 0.02, 0.2);
  part(g, cyl(0.04, 0.045, 0.012, 12), BLACK, 0.38, T + 0.006, -0.08, { outline: false });
  rod(g, v3(0.38, T, -0.08), v3(0.38, T + 0.2, -0.08), 0.006, BLACK);
  const parked = hungCans(g, 0.38, T + 0.16, -0.08, 0.5);
  const worn = cans(g);
  worn.visible = false;
  const pen = penTool(g);
  const sw = stopwatchTool(g);
  const tools: Partial<Record<VaTool, HeldTool>> = {
    pen: penHeld(pen),
    watch: { tool: sw.root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.02 } } },
  };
  const spots: Record<string, Spot> = {
    recordNarration: seatAt(g, 'vaNarrate', ND.seat),
    voiceActor_rewriteCopy: seatAt(g, 'vaCopy', ND.seat),
  };
  const show = (_now: string | null, N: VaNow | null, t: number, H: number) => {
    const n = N?.n ?? {};
    wearing(worn, parked, (n.hs ?? 0) > 0.5, ND.seat, N, H);
    at(pen, N?.props.pen ?? null, ND.penRest);
    at(sw.root, N?.props.watch ?? null, ND.watchRest);
    const rec = (n.rec ?? 0) > 0.5;
    setLit(lamp, rec ? '#e53935' : '#3a1515');
    done.visible = (n.page ?? 0) > 0.5 || !N;
    const copyMode = (n.copy ?? 0) > 0.5;
    const secs = n.timing ?? 0;
    sw.screen.draw(`${q(secs, 1)}`, (c) => {
      c.fillStyle = '#d7e8c8';
      c.fillRect(0, 0, 64, 64);
      text(c, secs.toFixed(0), 32, 34, 34, INK, 'center');
    });
    const cut = clamp01(n.cut);
    const added = clamp01(n.added);
    const round = wrap(n.round ?? 0, COPY_LINES.length);
    page.draw(`${copyMode ? 1 : 0}|${q(cut, 12)}|${q(added, 8)}|${round}|${q(n.page, 2)}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 300, 220);
      text(c, copyMode ? '광고 문안 (15초)' : '자연 다큐 원고', 10, 16, 15, PLUM);
      COPY_LINES.forEach((s, i) => text(c, s, 10, 50 + i * 42, 15, INK, 'left', false));
      if (copyMode && cut > 0.05) {
        c.strokeStyle = RED;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(10, 92);
        c.lineTo(10 + 260 * cut, 92);
        c.stroke();
      }
      if (copyMode && added > 0.3) text(c, typed('길을 나섭니다.', added), 60, 112, 15, RED, 'left', false);
    });
    const tick = (n.talk ?? 0) > 0.5 ? Math.floor(t * 6) : 0;
    screen.draw(`${tick}|${q(n.pos, 30)}|${copyMode ? q(secs, 2) : -1}|${rec ? 1 : 0}|${N ? 1 : 0}`, (c) => {
      c.fillStyle = '#10121a';
      c.fillRect(0, 0, 256, 164);
      text(c, copyMode ? '문안 길이' : rec ? '● 녹음 중' : STUDIO, 8, 14, 13, rec ? '#ff6b6b' : '#c9d6e3');
      if (copyMode) {
        const over = secs > 15;
        c.fillStyle = '#2b2f3a';
        c.fillRect(10, 60, 236, 22);
        c.fillStyle = over ? RED : GREEN;
        c.fillRect(10, 60, (236 * Math.min(20, secs)) / 20, 22);
        c.fillStyle = '#ffffff';
        c.fillRect(10 + (236 * 15) / 20, 54, 2, 34);
        text(c, `${secs.toFixed(1)}초 / 15초`, 128, 112, 18, over ? '#ff8a80' : MINT, 'center');
        return;
      }
      const bars = 40;
      for (let i = 0; i < bars; i++) {
        const u = i / bars;
        const a = 0.2 + 0.8 * Math.abs(Math.sin(i * 0.7 + tick * 0.21) * Math.cos(i * 0.21));
        const y = 40 * a * (u < clamp01(n.pos) ? 1 : 0.25);
        c.fillStyle = u < clamp01(n.pos) ? '#7ee89e' : '#3c4656';
        c.fillRect(8 + i * 6, 88 - y, 4, y * 2);
      }
    });
  };
  show(null, null, 0, 1.6);
  drive(g, out, spots, tools, show);
  out.work = marker(g, ND.page[0], ND.page[1], ND.page[2]);
}

// =============================================================================================
// 믹싱 콘솔 (mixingConsole, 2 × 1): also the singer's, so its names are the trade's and not this studio's.

function mixingConsole(g: THREE.Group, out: Built) {
  const T = MC.top;
  // The body: a desk with a slope of channels.
  part(g, box(1.84, T - 0.1, 0.7), GRAPHITE, 0, (T - 0.1) / 2, -0.08);
  part(g, box(1.9, 0.1, 0.1), '#7a5a3e', 0, T - 0.03, 0.31);
  const slope = group(g, 0, T + 0.02, 0.06);
  slope.rotation.x = 0.22;
  part(slope, box(1.84, 0.04, 0.6), '#3a424a', 0, -0.02, 0, { outline: false });
  // Faders along the front, knobs in rows behind them, meters behind those.
  const faders: THREE.Object3D[] = [];
  for (let i = 0; i < 7; i++) {
    const x = -0.3 + i * 0.1;
    part(slope, box(0.012, 0.003, 0.18), BLACK, x, 0.002, 0.18, { outline: false });
    faders.push(part(slope, rbox(0.04, 0.022, 0.03, 0.006), i === 1 ? '#ef5350' : i === 4 ? '#ffb300' : '#cfd8dc', x, 0.012, 0.18, { outline: false }));
    for (const z of [-0.02, -0.1]) part(slope, cyl(0.014, 0.016, 0.014, 10), z < -0.05 ? '#90a4ae' : '#78909c', x, 0.008, z, { outline: false });
  }
  for (let i = 0; i < 6; i++) {
    const x = -0.82 + i * 0.09;
    for (let j = 0; j < 4; j++) part(slope, cyl(0.011, 0.013, 0.012, 8), j % 2 ? '#607d8b' : '#90a4ae', x, 0.007, 0.16 - j * 0.09, { outline: false });
  }
  const big = group(g, MC.knob[0], MC.knob[1], MC.knob[2]);
  const bigKnob = part(big, cyl(0.03, 0.034, 0.03, 16), '#eceff1', 0, 0, 0, { outline: false });
  part(bigKnob, box(0.006, 0.006, 0.03), RED, 0, 0.016, -0.014, { outline: false });
  const meters = Array.from({ length: 7 }, (_, i) => {
    const m = part(slope, box(0.018, 0.003, 0.11), MINT, -0.3 + i * 0.1, 0.006, -0.22, { outline: false });
    return m;
  });
  // The talkback key and its lamp.
  part(g, rbox(0.08, 0.02, 0.07, 0.006), GREY_D, MC.talkback[0], MC.talkback[1] - 0.012, MC.talkback[2], { outline: false });
  const key = ownLit(g, rbox(0.05, 0.012, 0.05, 0.004), '#7a2e2e', MC.talkback[0], MC.talkback[1], MC.talkback[2]);
  label(g, '토크백', 0.1, 0.03, MC.talkback[0], MC.talkback[1] + 0.008, MC.talkback[2] - 0.06, BLACK, '#ffffff');
  // Take sheet and pencil to the right.
  part(g, box(0.2, 0.004, 0.26), PAPER, MC.sheet[0], MC.sheet[1] - 0.001, MC.sheet[2], { rx: 0.2, outline: false });
  const ticks = [0, 1, 2].map((i) => part(g, box(0.08, 0.002, 0.004), RED, MC.sheet[0], MC.sheet[1] + 0.006 - i * 0.012, MC.sheet[2] - 0.05 + i * 0.05, { rx: 0.2, outline: false }));
  const pen = penTool(g);
  // A wide screen, speakers on stands either side (low enough to see past), cans on a hook.
  part(g, box(0.96, 0.46, 0.03), BLACK, 0, T + 0.42, -0.34, { outline: false });
  const screen = liveScreen(g, 0.92, 0.42, 512, 234, 0, T + 0.42, -0.322);
  part(g, cyl(0.03, 0.04, 0.17, 10), GREY_D, 0, T + 0.09, -0.34, { outline: false });
  for (const sx of [-1, 1]) {
    const s = group(g, sx * 0.72, T + 0.18, -0.26, -sx * 0.25);
    part(s, rbox(0.2, 0.32, 0.2, 0.02), '#22262c', 0, 0, 0);
    part(s, cyl(0.07, 0.07, 0.01, 18), '#4a525c', 0, -0.05, 0.102, { rx: Math.PI / 2, outline: false });
    part(s, cyl(0.03, 0.03, 0.01, 14), '#cfd8dc', 0, 0.09, 0.102, { rx: Math.PI / 2, outline: false });
  }
  chair(g, MC.seat, '#37474f');
  const tools: Partial<Record<VaTool, HeldTool>> = { pen: penHeld(pen) };
  const spots: Record<string, Spot> = {
    mixAlbum: seatAt(g, 'vaMix', MC.seat),
    singer_produceAlbum: seatAt(g, 'vaMix', MC.seat),
    voiceActor_directSession: seatAt(g, 'vaDirect', MC.seat),
  };
  const show = (_now: string | null, N: VaNow | null, t: number) => {
    const n = N?.n ?? {};
    at(pen, N?.props.pen ?? null, MC.penRest);
    const playing = (n.playing ?? 0) > 0.5;
    faders.forEach((f, i) => {
      const val = i === 1 ? (n.f0 ?? 0.5) : i === 4 ? (n.f1 ?? 0.5) : 0.45 + 0.1 * Math.sin(i * 1.7);
      f.position.z = 0.18 - 0.09 * (clamp01(val) - 0.5) * 2;
    });
    bigKnob.rotation.y = -(n.knob ?? 0) * 2;
    meters.forEach((m, i) => {
      const lv = playing ? 0.3 + 0.7 * Math.abs(Math.sin(t * (3 + i * 0.4) + i)) : 0.04;
      m.scale.z = Math.max(0.05, lv);
    });
    const talk = (n.talkback ?? 0) > 0.5;
    setLit(key, talk ? '#ff5252' : '#7a2e2e');
    if (talk) ROOM.talkAt = t;
    if ((n.direct ?? 0) > 0.5) ROOM.directAt = t;
    const direct = (n.direct ?? 0) > 0.5;
    const marks = clamp01(n.marks);
    ticks.forEach((m, i) => (m.visible = !N || marks > (i + 0.3) / 3 || !direct));
    const tick = playing ? Math.floor(t * 4) : 0;
    const take = Math.round(n.take ?? 0);
    screen.draw(`${tick}|${direct ? take : 0}|${talk ? 1 : 0}|${q(n.pos, 40)}`, (c) => {
      c.fillStyle = '#12151d';
      c.fillRect(0, 0, 512, 234);
      c.fillStyle = '#1f2533';
      c.fillRect(0, 0, 512, 24);
      text(c, direct ? `녹음 중 · 테이크 ${take}` : '트랙 믹스', 8, 13, 14, '#dfe7ef');
      if (talk) text(c, '토크백 켜짐', 504, 13, 14, '#ff8a80', 'right');
      const names = ['보컬', '보컬 2', '현악', '드럼', '효과'];
      const colors = ['#ef5350', '#ffb300', '#66bb6a', '#42a5f5', '#ab47bc'];
      names.forEach((s, i) => {
        const y = 28 + i * 40;
        c.fillStyle = '#1a1f2b';
        c.fillRect(70, y, 438, 36);
        text(c, s, 6, y + 18, 13, '#b8c4d0', 'left', false);
        for (let j = 0; j < 72; j++) {
          const a = 0.2 + 0.8 * Math.abs(Math.sin(j * (0.33 + i * 0.09) + i) * Math.cos(j * 0.11));
          c.fillStyle = colors[i];
          c.fillRect(72 + j * 6, y + 18 - 15 * a, 4, 30 * a);
        }
      });
      c.fillStyle = '#ffffff';
      c.fillRect(70 + 438 * clamp01(n.pos), 26, 2, 204);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, MC.fader(3)[0], MC.fader(3)[1], MC.fader(3)[2]);
}

// =============================================================================================
// 단체 더빙 라인 (vaEnsembleLine, 5 × 2): a big screen, three mics in a row, two colleagues at theirs, the dweller at the first.

function ensembleLine(g: THREE.Group, out: Built) {
  const S = EL.screen;
  // The screen on legs, with speakers below it.
  part(g, box(3.98, 1.86, 0.06), BLACK, S[0], S[1], S[2] - 0.05);
  for (const x of [-1.7, 1.7]) part(g, box(0.08, 0.72, 0.08), GREY_D, x, 0.36, S[2] - 0.05, { outline: false });
  const screen = liveScreen(g, 3.86, 1.74, 960, 432, S[0], S[1], S[2]);
  label(g, `${STUDIO} 더빙 1실`, 1.1, 0.09, 0, 2.62, S[2] - 0.015, PLUM, '#ffffff');
  for (const x of [-0.9, 0.9]) part(g, rbox(0.42, 0.42, 0.26, 0.03), '#262a31', x, 0.36, S[2] - 0.04);
  // Three mics, three stands, tape on the floor where each stands.
  EL.mics.forEach((m, i) => {
    micRig(g, m, i === 1 ? [0, 1] : [-Math.sin(0.32) * (i === 2 ? -1 : 1), Math.cos(0.32)], [m[0] + (i === 2 ? -0.42 : 0.42), m[2] - 0.2]);
    part(g, box(0.44, 0.004, 0.44), AMBER, EL.places[i][0], 0.002, EL.places[i][1], { outline: false });
    part(g, box(0.4, 0.006, 0.4), '#2a2d36', EL.places[i][0], 0.004, EL.places[i][1], { outline: false });
  });
  const pageA = musicStand(g, [-0.92, 1.06, 0.34], 0.3, 0.22, 200, 150);
  const pageB = musicStand(g, [0.5, 1.06, 0.34], 0.3, 0.22, 200, 150);
  const pageC = musicStand(g, [0.98, 1.06, 0.34], 0.3, 0.22, 200, 150);
  for (const p of [pageA, pageB, pageC]) p.draw('x', (c) => paintScript(c, 200, 150, { scene: 0, hi: 0, marks: 0 }));
  const A = person(g, '#ad1457', '#37474f', '#2b1b10', EL.places[1][0], EL.places[1][1], Math.PI, 'male', undefined, 21);
  const B = person(g, '#00796b', '#455a64', '#4a2e1a', EL.places[2][0], EL.places[2][1], Math.PI + 0.32, 'female', undefined, 22);
  A.root.visible = B.root.visible = true;
  const scriptOf = (F: Fig) => {
    const s = part(g, box(0.2, 0.01, 0.28), PAPER, 0, 0, 0, { rx: 0.8, outline: false });
    s.position.copy(F.root.position);
    return s;
  };
  const sa = scriptOf(A);
  const sb = scriptOf(B);
  const spots: Record<string, Spot> = {
    vaEnsemble: standAt(g, 'vaEnsemble', EL.places[0][0], EL.places[0][1], Math.PI - 0.32),
    vaWalla: standAt(g, 'vaWalla', EL.places[0][0], EL.places[0][1], Math.PI - 0.32),
  };
  const show = (_now: string | null, N: VaNow | null, t: number) => {
    const n = N?.n ?? {};
    // With no one on the line they run it anyway, a turn each.
    const round = frac(t / 20);
    const who = N ? (n.who ?? -1) : round < 0.5 ? 1 : 2;
    const crowd = (n.crowd ?? 0) > 0.5;
    const cheer = (n.cheer ?? 0) > 0.5;
    const murmur = (n.murmur ?? 0) > 0.5;
    const each = (F: Fig, s: THREE.Object3D, mine: number) => {
      s.visible = !(crowd && cheer);
      if (cheer) {
        F.armL(bodyAt(F, 0.26, 1.66 + 0.03 * Math.sin(t * 9), 0.14));
        F.armR(bodyAt(F, -0.26, 1.66 - 0.03 * Math.sin(t * 9), 0.14));
        nodHead(F, -0.16);
      } else if (murmur) {
        const L = bodyAt(F, 0.08, 1.04, 0.28);
        F.armL(L);
        s.position.copy(L);
        F.armR(bodyAt(F, -0.28, 1.08 + 0.05 * Math.sin(t * 3.3 + mine), 0.24));
        nodHead(F, 0.05 + 0.05 * Math.sin(t * 2.4 + mine));
      } else if (who === mine) {
        s.visible = false;
        npcActs(F, mine === 1 ? 1 : 3, clamp01(frac(t / 4)), t);
      } else npcWaits(F, s, t);
    };
    each(A, sa, 1);
    each(B, sb, 2);
    const v: Reel = N
      ? { scene: n.scene ?? 0, talk: (n.talk ?? 0) > 0.5, flap: flapAt(t), head: clamp01(n.head), spoken: clamp01(n.spoken), rec: true }
      : idleReel(t);
    screen.draw(`${reelKey(v)}|${crowd ? 1 : 0}|${q(n.laugh, 2)}`, (c) => {
      paintReel(c, 960, 432, v);
      if (crowd) text(c, cheer ? '와아아아!' : '(웅성웅성)', 480, 150, 72, '#ffffff', 'center');
    });
  };
  show(null, null, 0);
  drive(g, out, spots, {}, show);
  out.work = marker(g, EL.mics[0][0], EL.mics[0][1], EL.mics[0][2]);
}

// =============================================================================================
// 폴리 테이블 (vaFoleyTable, 3 × 2).

function foleyTable(g: THREE.Group, out: Built) {
  const T = FT.top;
  // The table, scarred and busy, along the back row.
  part(g, rbox(2.9, 0.05, 0.94, 0.012), WOOD, 0, T - 0.025, -0.52);
  for (const [x, z] of [[-1.38, -0.92], [1.38, -0.92], [-1.38, -0.12], [1.38, -0.12]]) part(g, box(0.06, T - 0.05, 0.06), WALNUT, x, (T - 0.05) / 2, z);
  // A small door in its frame, hinged on the left, a real handle and a real creak.
  const dx = FT.doorX;
  const fw = FT.handle[0] - dx;
  part(g, box(0.03, 0.34, 0.05), WALNUT, dx - 0.015, T + 0.17, FT.handle[2]);
  part(g, box(0.03, 0.34, 0.05), WALNUT, dx + fw + 0.035, T + 0.17, FT.handle[2]);
  part(g, box(fw + 0.08, 0.03, 0.05), WALNUT, dx + fw / 2 + 0.01, T + 0.34, FT.handle[2]);
  part(g, box(fw + 0.14, 0.03, 0.14), WALNUT, dx + fw / 2 + 0.01, T + 0.012, FT.handle[2]);
  const hinge = group(g, dx, T, FT.handle[2]);
  part(hinge, box(fw + 0.02, 0.3, 0.018), '#a0764f', (fw + 0.02) / 2, 0.17, 0);
  part(hinge, ball(0.014), '#d4af37', fw - 0.005, FT.handle[1] - T, 0.02, { outline: false });
  // The hard plate for heels, a shoe on it; a heap of cellophane; coconut halves, a tin thunder sheet, a box of keys.
  part(g, box(0.42, 0.015, 0.3), '#7e8a94', FT.plate[0], T + 0.008, FT.plate[2]);
  const heel = heelTool(g);
  const film = group(g, FT.film[0], FT.film[1] - 0.025, FT.film[2]);
  film.name = 'vaFilm';
  for (let i = 0; i < 9; i++) {
    const m = haze(film, new THREE.PlaneGeometry(0.1, 0.1), i % 2 ? '#fff3c4' : '#ffb74d', 0.55, -0.1 + (i * 0.2) / 8, 0.02 + ((i * 3) % 5) * 0.012, ((i * 7) % 5) * 0.012 - 0.02);
    m.rotation.set(0.8 + i, i * 1.3, i * 0.5);
  }
  label(g, '불 소리', 0.14, 0.04, FT.film[0], T + 0.12, -0.34, PAPER, INK);
  for (const [x, z] of [[-0.3, -0.42], [-0.17, -0.48]] as const) {
    const m = part(g, ball(0.055), '#6f4e2e', x, T + 0.03, z);
    m.scale.y = 0.6;
  }
  part(g, box(0.18, 0.02, 0.26), '#b0bec5', 0.48, T + 0.012, -0.52, { rx: 0.03, outline: false });
  part(g, rbox(0.14, 0.06, 0.09, 0.012), '#6d7b85', 0.76, T + 0.03, -0.72);
  for (let i = 0; i < 3; i++) part(g, cyl(0.006, 0.006, 0.05, 6), '#d4af37', 0.72 + i * 0.04, T + 0.08, -0.72, { outline: false });
  // A low screen so the feet can be timed, and a mic on the table for what's in the hands.
  part(g, box(0.56, 0.34, 0.03), BLACK, -0.06, T + 0.36, -0.82, { outline: false });
  part(g, cyl(0.02, 0.03, 0.18, 8), GREY_D, -0.06, T + 0.09, -0.84, { outline: false });
  const screen = liveScreen(g, 0.52, 0.3, 320, 186, -0.06, T + 0.36, -0.802);
  rod(g, v3(0.6, T, -0.74), v3(0.45, T + 0.32, -0.3), 0.008, BLACK);
  part(g, cyl(0.024, 0.022, 0.11, 12), '#c9cdd1', 0.45, T + 0.3, -0.29, { rx: 0.5, outline: false });
  // The two trays on the floor: gravel, and boards that really give. A low mic on a stub stand aims at each.
  const tray = (cx: number, c: string) => {
    part(g, box(1.02, 0.04, 0.74), WALNUT, cx, 0.02, FT.gravel[1]);
    part(g, box(0.96, 0.012, 0.68), c, cx, 0.044, FT.gravel[1], { outline: false });
  };
  tray(FT.gravel[0], '#8f8778');
  tray(FT.boards[0], '#c49b6c');
  const pebbles: THREE.Object3D[] = [];
  for (let i = 0; i < 46; i++) {
    const x = FT.gravel[0] - 0.43 + frac(i * 0.381) * 0.86;
    const z = FT.gravel[1] - 0.3 + frac(i * 0.733) * 0.6;
    const m = part(g, ball(0.012 + (i % 3) * 0.006), i % 4 === 0 ? '#a6a091' : i % 4 === 1 ? '#6f6a5f' : '#8e8878', x, 0.056, z, { outline: false });
    m.scale.y = 0.6;
    pebbles.push(m);
  }
  const planks: THREE.Object3D[] = [];
  for (let i = 0; i < 5; i++) planks.push(part(g, box(0.9, 0.012, 0.125), i % 2 ? '#b98f5f' : '#c9a273', FT.boards[0], 0.056, FT.boards[1] - 0.27 + i * 0.135));
  for (const cx of [FT.gravel[0], FT.boards[0]]) {
    part(g, cyl(0.05, 0.06, 0.02, 10), GRAPHITE, cx + 0.42, 0.012, 0.1, { outline: false });
    rod(g, v3(cx + 0.42, 0.02, 0.1), v3(cx + 0.42, 0.22, 0.1), 0.006, BLACK);
    part(g, cyl(0.016, 0.014, 0.07, 10), '#c9cdd1', cx + 0.4, 0.2, 0.15, { rx: 0.9, outline: false });
  }
  const tools: Partial<Record<VaTool, HeldTool>> = { heel: { tool: heel, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'power', radius: 0.03 } } } };
  const spots: Record<string, Spot> = {
    vaFoleySteps: standAt(g, 'vaFoleySteps', FT.gravel[0], FT.gravel[1]),
    vaFoleyProps: standAt(g, 'vaFoleyProps', FT.handle[0] + 0.08, FT.stand),
  };
  const show = (_now: string | null, N: VaNow | null, t: number) => {
    const n = N?.n ?? {};
    at(heel, N?.props.heel ?? null, FT.heelRest);
    hinge.rotation.y = -(n.door ?? 0);
    const crunch = n.crunch ?? 0;
    const knock = n.knock ?? 0;
    pebbles.forEach((m, i) => {
      m.position.y = 0.056 + crunch * 0.012 * Math.max(0, Math.sin(t * 9 + i * 1.7));
    });
    planks.forEach((m, i) => {
      m.position.y = 0.056 - knock * 0.004 * Math.max(0, Math.sin(t * 7.5 + i));
    });
    const cr = n.crumple ?? 0;
    const fire = n.fire ?? 0;
    film.scale.set(1 - 0.25 * cr * fire, 1 + 0.25 * cr * fire, 1 - 0.2 * cr * fire);
    const v: Reel = N ? { scene: n.scene ?? 0, talk: false, flap: 0, head: clamp01(n.head), spoken: 0, rec: (n.rec ?? 0) > 0.5 } : idleReel(t);
    screen.draw(reelKey(v), (c) => paintReel(c, 320, 186, v));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, FT.plate[0], FT.plate[1], FT.plate[2]);
}

// =============================================================================================
// 목 관리 차 코너 (vaTeaCorner, 2 × 1).

function teaCorner(g: THREE.Group, out: Built) {
  const T = 0.88;
  part(g, box(1.9, T - 0.03, 0.68), '#efe7dc', 0, (T - 0.03) / 2, -0.12);
  part(g, rbox(1.94, 0.04, 0.72, 0.012), WOOD, 0, T - 0.02, -0.12);
  // Doors below, a shelf of cups and jars above it on the wall side.
  for (const x of [-0.46, 0.46]) part(g, box(0.86, 0.68, 0.01), '#e2d6c6', x, 0.42, 0.226, { outline: false });
  part(g, box(1.9, 0.03, 0.22), WOOD, 0, 1.46, -0.38);
  for (let i = 0; i < 6; i++) part(g, cyl(0.04, 0.034, 0.09, 12), i % 2 ? '#d9cdf2' : '#f8e1c4', -0.8 + i * 0.13, 1.52, -0.38);
  for (const [i, s, c] of [[0, '배도라지', '#ffe29a'], [1, '모과', '#f6c85f'], [2, '생강', '#e2b97c']] as const) {
    part(g, cyl(0.06, 0.06, 0.14, 14), c, 0.2 + i * 0.22, 1.55, -0.38);
    label(g, s, 0.1, 0.04, 0.2 + i * 0.22, 1.55, -0.316, PAPER, INK);
  }
  // The urn and its button, honey, a tray with a spoon, a card to remind them.
  const K: V = [TC.cup[0], T, -0.05];
  part(g, cyl(0.09, 0.1, 0.36, 16), '#b0bec5', K[0], T + 0.18, K[2]);
  part(g, cyl(0.03, 0.035, 0.02, 10), BLACK, K[0], T + 0.37, K[2], { outline: false });
  part(g, rbox(0.05, 0.05, 0.03, 0.006), RED, TC.button[0], TC.button[1], TC.button[2], { outline: false });
  part(g, cyl(0.012, 0.012, 0.13, 8), GREY_D, K[0], T + 0.25, 0.015, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.2, 0.012, 0.16, 0.004), '#c8ad92', TC.cup[0], T + 0.006, TC.cup[2], { outline: false });
  part(g, cyl(0.045, 0.04, 0.1, 12), '#ffca28', -0.3, T + 0.05, -0.08);
  part(g, cyl(0.048, 0.048, 0.016, 12), '#fff8e1', -0.3, T + 0.108, -0.08, { outline: false });
  label(g, '꿀', 0.05, 0.04, -0.3, T + 0.05, -0.036, PAPER, INK);
  rod(g, v3(-0.48, T + 0.02, 0.04), v3(-0.62, T + 0.015, 0.1), 0.004, CHROME);
  label(g, '녹음 전엔 찬물 NO! 따뜻하게 천천히', 0.82, 0.08, -0.34, 1.26, -0.46, '#fff3c9', '#6b4a10');
  part(g, box(0.88, 0.1, 0.02), '#a88b5d', -0.34, 1.26, -0.475, { outline: false });
  const cup = cupTool(g);
  const steam = [0, 1].map(() => haze(g, new THREE.PlaneGeometry(0.05, 0.14), '#ffffff', 0.32, 0, 0, 0));
  const stream = part(g, cyl(0.005, 0.005, 0.1, 6), '#d9a441', K[0], T + 0.195, TC.cup[2], { outline: false });
  const tools: Partial<Record<VaTool, HeldTool>> = { cup: { tool: cup.root, lead: 'right', grips: { right: { at: v3(0, -0.005, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.036 } } } };
  const spots: Record<string, Spot> = { vaTea: standAt(g, 'vaTea', TC.at, TC.stand) };
  const show = (_now: string | null, N: VaNow | null, t: number) => {
    const n = N?.n ?? {};
    at(cup.root, N?.props.cup ?? null, TC.cup);
    cup.root.rotation.x = (n.tilt ?? 0) * 0.8;
    cup.tea.scale.setScalar(1);
    cup.tea.visible = !N || (n.water ?? 0) > 0.05;
    cup.tea.position.y = -0.04 + 0.078 * clamp01(N ? n.water : 1);
    stream.visible = (n.pouring ?? 0) > 0.5;
    const steamy = (n.steam ?? 0) > 0.5 && N?.props.cup;
    steam.forEach((m, i) => {
      m.visible = !!steamy;
      if (steamy && N?.props.cup) {
        const p = N.props.cup;
        m.position.set(p[0] + (i ? 0.02 : -0.02) + 0.012 * Math.sin(t * 1.5 + i * 2), p[1] + 0.12 + 0.03 * frac(t * 0.5 + i * 0.5), p[2]);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, TC.cup[0], TC.cup[1], TC.cup[2]);
}

// =============================================================================================
// 대본 선반 (vaScriptRack, 2 × 1).

const TITLES = ['별똥 순찰대', '바다 밑 우체국', '고양이 탐정', '구름 빵집', '달빛 기차', '꼬마 로봇', '여름 도깨비', '숲속 학교'];
const SPINES = ['#7e57c2', '#26a69a', '#ef5350', '#ffa726', '#42a5f5', '#ec407a', '#78909c', '#9ccc65'];
function scriptRack(g: THREE.Group, out: Built) {
  const W = 1.9;
  const H = 1.88;
  part(g, box(W, H, 0.02), WALNUT, 0, H / 2, -0.44);
  for (const x of [-W / 2, 0, W / 2]) part(g, box(0.03, H, 0.38), WOOD, x, H / 2, -0.26);
  for (const y of [0.04, 0.52, 0.98, 1.44, H - 0.015]) part(g, box(W, 0.03, 0.38), WOOD, 0, y, -0.26);
  const taken: THREE.Object3D[] = [];
  [1.2, 0.74, 0.28, 1.66].forEach((y, row) => {
    for (let i = 0; i < 16; i++) {
      if (i === 8) continue;
      const k = wrap(i + row * 3, TITLES.length);
      const x = -0.86 + i * 0.112;
      const b = part(g, box(0.1, row === 3 ? 0.36 : 0.4, 0.28), SPINES[k], x, y, -0.2);
      const lb = label(g, TITLES[k].slice(0, 4), 0.09, 0.052, x, y + 0.08, -0.058, '#ffffff', INK);
      if (row === 0 && i === 6) taken.push(b, lb);
    }
  });
  label(g, '작품별 대본', 0.5, 0.08, 0.46, 1.8, -0.42, PLUM, '#ffffff');
  // A title in the hand, open.
  const script = group(g);
  script.name = 'vaScriptBook';
  const tilt = group(script);
  tilt.rotation.x = -0.6;
  part(tilt, box(0.4, 0.28, 0.012), SPINES[0], 0, 0, 0, { outline: false });
  const pages = liveScreen(tilt, 0.38, 0.26, 340, 230, 0, 0, 0.008);
  const tools: Partial<Record<VaTool, HeldTool>> = { script: { tool: script, lead: 'left', grips: FLAT_LEFT } };
  const spots: Record<string, Spot> = { vaPickScript: standAt(g, 'vaPickScript', -0.12, SR.stand) };
  const show = (_now: string | null, N: VaNow | null) => {
    const n = N?.n ?? {};
    const inHand = N?.tool === 'script';
    at(script, inHand ? (N?.props.script ?? null) : null);
    for (const m of taken) m.visible = !inHand;
    if (!inHand) return;
    const who = N?.b.n ?? 0;
    pages.draw(`${q(n.page, 2)}|${q(n.hi, 2)}|${wrap(who, CAST.length)}`, (c) => paintScript(c, 340, 230, { scene: who + ((n.page ?? 0) > 0.5 ? 1 : 0), hi: n.hi ?? 0, marks: 0 }));
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, SR.slot[0], SR.slot[1], SR.slot[2]);
}

// =============================================================================================
// 연출·녹음 감독석 (vaCrewDesk, 3 × 2).

function crewDesk(g: THREE.Group, out: Built) {
  const T = CD.top;
  part(g, rbox(2.9, 0.05, 0.86, 0.012), WALNUT, 0, T - 0.025, -0.52);
  for (const x of [-1.38, 0, 1.38]) part(g, box(0.05, T - 0.05, 0.76), GRAPHITE, x, (T - 0.05) / 2, -0.52, { outline: false });
  // The director's screen with the cartoon, the engineer's with the takes, a talkback mic on a stem, a stopwatch.
  part(g, box(0.72, 0.42, 0.03), BLACK, CD.screen[0], CD.screen[1], CD.screen[2] - 0.02, { outline: false });
  part(g, cyl(0.02, 0.03, 0.2, 8), GREY_D, CD.screen[0], T + 0.1, CD.screen[2] - 0.03, { outline: false });
  const reel = liveScreen(g, 0.68, 0.38, 340, 190, CD.screen[0], CD.screen[1], CD.screen[2]);
  part(g, box(0.78, 0.42, 0.03), BLACK, 0.72, CD.screen[1], CD.screen[2] - 0.02, { outline: false });
  part(g, cyl(0.02, 0.03, 0.2, 8), GREY_D, 0.72, T + 0.1, CD.screen[2] - 0.03, { outline: false });
  const takes = liveScreen(g, 0.74, 0.38, 370, 190, 0.72, CD.screen[1], CD.screen[2]);
  part(g, rbox(0.42, 0.02, 0.15, 0.006), GRAPHITE, 0.8, T + 0.01, -0.24, { outline: false });
  part(g, rbox(0.08, 0.03, 0.12, 0.012), GRAPHITE, 1.12, T + 0.015, -0.24, { outline: false });
  part(g, cyl(0.04, 0.045, 0.012, 12), BLACK, -0.12, T + 0.006, -0.3, { outline: false });
  rod(g, v3(-0.12, T, -0.3), v3(-0.1, T + 0.26, -0.18), 0.005, BLACK);
  part(g, cyl(0.016, 0.014, 0.05, 10), '#c9cdd1', -0.1, T + 0.27, -0.17, { rx: 1, outline: false });
  part(g, box(0.21, 0.006, 0.28), PAPER, -0.42, T + 0.003, -0.24, { rz: 0.05, outline: false });
  part(g, cyl(0.04, 0.034, 0.09, 12), '#ffe0b2', -0.72, T + 0.045, -0.24);
  chair(g, CD.director, '#4e342e');
  chair(g, CD.engineer, '#37474f');
  label(g, '연출', 0.14, 0.05, CD.director[0] + 0.12, T + 0.04, -0.09, PLUM, '#ffffff');
  label(g, '녹음 감독', 0.2, 0.05, CD.engineer[0] - 0.12, T + 0.04, -0.09, '#00695c', '#ffffff');
  const director = person(g, '#4527a0', '#3e2723', '#2a2520', CD.director[0], CD.director[2], Math.PI, 'male', CD.director[1], 31);
  const engineer = person(g, '#00695c', '#37474f', '#3c2412', CD.engineer[0], CD.engineer[2], Math.PI, 'female', CD.engineer[1], 32);
  director.root.visible = engineer.root.visible = true;
  // The clipboard of takes on the arm.
  const clip = group(g);
  clip.name = 'vaClipboard';
  const tilt = group(clip);
  tilt.rotation.x = -0.6;
  part(tilt, box(0.24, 0.32, 0.01), '#8d6e63', 0, 0, 0, { outline: false });
  part(tilt, box(0.08, 0.025, 0.015), CHROME, 0, 0.15, 0.006, { outline: false });
  const sheet = liveScreen(tilt, 0.21, 0.27, 168, 216, 0, -0.012, 0.0065);
  const tools: Partial<Record<VaTool, HeldTool>> = { clip: { tool: clip, lead: 'left', grips: FLAT_LEFT } };
  const spots: Record<string, Spot> = { vaPickTake: standAt(g, 'vaPickTake', CD.stand[0], CD.stand[1], Math.PI - 0.25) };
  const engL = v3(CD.engineer[0] - 0.16, T + 0.05, -0.24);
  const engR = v3(CD.engineer[0] + 0.27, T + 0.04, -0.24);
  const drTalk = v3(CD.director[0] - 0.22, T + 0.1, -0.16);
  const drPoint = v3(CD.screen[0] + 0.06, T + 0.3, -0.18);
  const show = (_now: string | null, N: VaNow | null, t: number) => {
    const n = N?.n ?? {};
    at(clip, N?.tool === 'clip' ? (N.props.clip ?? null) : null);
    // The engineer's fingers go on with it; the director watches and comes in now and then.
    engL.y = T + 0.05 + 0.006 * Math.sin(t * 9);
    engR.z = -0.24 + 0.012 * Math.sin(t * 1.7);
    engineer.armL(engL);
    engineer.armR(engR);
    nodHead(engineer, 0.08 + 0.03 * Math.sin(t * 1.3));
    const directorTalks = (n.drTalks ?? 0) > 0.5 || (!N && frac(t / 16) > 0.7);
    director.armL(directorTalks ? drTalk : null);
    director.armR((n.drPoints ?? 0) > 0.5 ? drPoint : null);
    nodHead(director, (n.drNods ?? 0) > 0.5 ? 0.1 + 0.1 * Math.sin(t * 5) : directorTalks ? 0.04 + 0.03 * Math.sin(t * 4) : 0.1);
    const v = idleReel(t);
    reel.draw(reelKey(v), (c) => paintReel(c, 340, 190, v));
    const picked = (n.picked ?? 0) > 0.5;
    const take = wrap(n.take ?? 0, 6);
    const chosen = clamp01(n.chosen);
    takes.draw(`${take}|${picked ? 1 : 0}|${q(chosen, 2)}`, (c) => {
      c.fillStyle = '#12151d';
      c.fillRect(0, 0, 370, 190);
      text(c, '테이크 목록', 8, 12, 14, '#dfe7ef');
      for (let i = 0; i < 6; i++) {
        const y = 28 + i * 26;
        const on = picked && i === take;
        c.fillStyle = on ? (chosen > 0.5 ? '#2e7d32' : PLUM) : '#1f2533';
        c.fillRect(6, y, 358, 23);
        text(c, `테이크 ${i + 1}`, 14, y + 12, 13, '#ffffff', 'left', false);
        for (let j = 0; j < 40; j++) {
          const a = 0.2 + 0.8 * Math.abs(Math.sin(j * 0.5 + i));
          c.fillStyle = on ? '#fff176' : '#7ee89e';
          c.fillRect(90 + j * 6, y + 12 - 8 * a, 4, 16 * a);
        }
      }
    });
    sheet.draw(`${take}|${q(chosen, 2)}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 168, 216);
      text(c, '테이크 기록', 84, 16, 15, PLUM, 'center');
      for (let i = 0; i < 6; i++) {
        text(c, `${i + 1}`, 14, 44 + i * 28, 15, INK);
        text(c, i === take && chosen > 0.5 ? '○ 채택' : '△', 60, 44 + i * 28, 15, i === take && chosen > 0.5 ? RED : GREY_D, 'left', false);
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, CD.screen[0], CD.screen[1], CD.screen[2]);
}

// =============================================================================================
// 유리 너머 녹음 부스 (vaGlassBooth, 4 × 2): decor at the back of the control room, an actor at work behind the glass.

function glassBooth(g: THREE.Group, out: Built) {
  const W = 3.9;
  const H = 2.34;
  part(g, box(W, H, 0.04), FOAM, 0, H / 2, -0.97);
  foamWall(g, W - 0.1, H - 0.1, 0, H / 2, -0.945);
  for (const sx of [-1, 1]) {
    part(g, box(0.05, H, 1.78), FOAM, sx * (W / 2 - 0.025), H / 2, -0.08);
    foamWall(g, 1.72, H - 0.1, sx * (W / 2 - 0.058), H / 2, -0.08, -sx * Math.PI / 2);
  }
  part(g, box(W, 0.16, 1.82), GRAPHITE, 0, H - 0.08, -0.08);
  part(g, box(W, 0.82, 0.05), '#3b4150', 0, 0.41, 0.82);
  // The glass over the low wall, framed in three panes; a lamp and the studio's name over it.
  haze(g, new THREE.PlaneGeometry(W - 0.1, H - 0.98), '#a8d8ee', 0.16, 0, 0.82 + (H - 0.98) / 2, 0.83);
  for (const x of [-(W / 2) + 0.03, -0.65, 0.65, W / 2 - 0.03]) part(g, box(0.05, H - 0.98, 0.06), GRAPHITE, x, 0.82 + (H - 0.98) / 2, 0.83, { outline: false });
  part(g, box(W, 0.06, 0.06), GRAPHITE, 0, H - 0.17, 0.83, { outline: false });
  part(g, box(W, 0.05, 0.1), WALNUT, 0, 0.84, 0.84);
  label(g, '녹음 중', 0.4, 0.1, 0, H - 0.08, 0.84, '#22090a', '#ffffff');
  const lamp = ownLit(g, ball(0.035), '#3a1515', -0.27, H - 0.08, 0.84);
  label(g, `${STUDIO} B부스`, 0.72, 0.09, -1.2, H - 0.08, 0.84, GRAPHITE, '#ffffff');
  // Inside: a screen on the back wall, a mic, a stand; the actor, facing the glass.
  part(g, box(1.06, 0.64, 0.03), BLACK, 0, 1.5, -0.92, { outline: false });
  const screen = liveScreen(g, 1.0, 0.58, 400, 232, 0, 1.5, -0.9);
  const stage: readonly [number, number] = [-0.3, 0.1];
  micRig(g, [stage[0] + 0.08, 1.46, stage[1] + 0.34], [0, -1], [stage[0] + 0.5, stage[1] + 0.5]);
  const page = musicStand(g, [stage[0] + 0.42, 1.06, stage[1] + 0.32], 0.3, 0.22, 200, 150);
  page.draw('x', (c) => paintScript(c, 200, 150, { scene: 2, hi: 1, marks: 3 }));
  hungCans(g, -1.82, 1.5, -0.2, Math.PI / 2);
  const actor = person(g, '#c2185b', '#37474f', '#3e2723', stage[0], stage[1], 0.25, 'female', undefined, 41);
  actor.root.visible = true;
  out.work = marker(g, 0, 1.4, 0.83);
  const ROUND = 16;
  out.away = (_o, t) => {
    const talkback = Math.abs(t - ROOM.talkAt) < 0.8;
    const directed = Math.abs(t - ROOM.directAt) < 0.8;
    const u = frac(t / ROUND);
    const round = Math.floor(t / ROUND);
    const scene = wrap(round, CAST.length);
    const acting = !talkback && u > 0.12 && u < 0.82;
    if (talkback) {
      // A word from the glass: a hand up to the can, listening, nodding.
      actor.armL(bodyAt(actor, 0.14, 1.42, 0.03));
      actor.armR(null);
      nodHead(actor, 0.1 + 0.08 * Math.sin(t * 5));
    } else if (acting) npcActs(actor, scene, clamp01((u - 0.12) / 0.7), t);
    else {
      actor.armL(bodyAt(actor, 0.2, 1.0, 0.2));
      actor.armR(null);
      nodHead(actor, 0.14);
    }
    setLit(lamp, acting ? '#e53935' : directed ? '#7a2e2e' : '#3a1515');
    const v: Reel = { scene, talk: acting, flap: flapAt(t), head: u, spoken: clamp01((u - 0.2) / 0.66), rec: acting };
    screen.draw(reelKey(v), (c) => paintReel(c, 400, 232, v));
  };
}

// =============================================================================================
// 녹음실 안내판 (vaStudioSign, 1 × 1): the day's sessions on an easel in the lobby.

function studioSign(g: THREE.Group) {
  part(g, box(0.72, 1.0, 0.03), WALNUT, 0, 0.92, -0.08);
  for (const sx of [-1, 1]) rod(g, v3(sx * 0.3, 0.5, -0.08), v3(sx * 0.34, 0.01, sx * 0.0 + 0.1), 0.014, WALNUT);
  rod(g, v3(0, 0.6, -0.1), v3(0, 0.01, -0.32), 0.014, WALNUT);
  const tex = painted('vaSign', 288, 400, (c) => {
    c.fillStyle = PLUM;
    c.fillRect(0, 0, 288, 400);
    c.fillStyle = LILAC;
    c.fillRect(12, 70, 264, 318);
    text(c, STUDIO, 144, 36, 30, '#ffffff', 'center');
    text(c, '오늘의 녹음', 144, 96, 22, PLUM, 'center');
    const rows = [['10:00', `${SHOW} 12화`], ['13:00', '자연 다큐 내레이션'], ['15:30', '게임 단체 더빙'], ['17:00', '광고 15초']];
    rows.forEach((r, i) => {
      text(c, r[0], 26, 142 + i * 60, 20, VIOLET);
      text(c, r[1], 26, 170 + i * 60, 20, INK, 'left', false);
    });
  });
  picture(g, tex, 0.68, 0.94, 0, 0.92, -0.062);
}

export const BUILDERS: Record<string, Builder> = {
  dubbingBooth(g, _W, _D, _c, _def, _ctx, out) {
    dubbingBooth(g, out);
  },
  scriptStand(g, _W, _D, _c, _def, _ctx, out) {
    scriptStand(g, out);
  },
  voiceMirror(g, _W, _D, _c, _def, _ctx, out) {
    voiceMirror(g, out);
  },
  narrationDesk(g, _W, _D, _c, _def, _ctx, out) {
    narrationDesk(g, out);
  },
  mixingConsole(g, _W, _D, _c, _def, _ctx, out) {
    mixingConsole(g, out);
  },
  vaEnsembleLine(g, _W, _D, _c, _def, _ctx, out) {
    ensembleLine(g, out);
  },
  vaFoleyTable(g, _W, _D, _c, _def, _ctx, out) {
    foleyTable(g, out);
  },
  vaTeaCorner(g, _W, _D, _c, _def, _ctx, out) {
    teaCorner(g, out);
  },
  vaScriptRack(g, _W, _D, _c, _def, _ctx, out) {
    scriptRack(g, out);
  },
  vaCrewDesk(g, _W, _D, _c, _def, _ctx, out) {
    crewDesk(g, out);
  },
  vaGlassBooth(g, _W, _D, _c, _def, _ctx, out) {
    glassBooth(g, out);
  },
  vaStudioSign(g) {
    studioSign(g);
  },
};
