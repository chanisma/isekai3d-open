import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, toon } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, text } from './doctor';
import { BT, CT, DS, HC, SL, SW, TC, TR, WS, faceFire, hyNow, hyPhase, tcCell } from './haenyeoMotion';
import type { HyMotion, HyNow } from './haenyeoMotion';
import { vroidFigure, type Figure, type FigureOptions } from './vroidFigure';

/**
 * The 해녀의 집 drawn as itself (2026-11-01 workplace pipeline, at the user's request), on the made-up 검은여 shore. Along
 * the top of the lot the sea breaking on black lava, a green cone behind it, a reef with foam round it and other
 * women's tewak bobbing far out; on the rock three ledges with steps down into the water, each with its tewak, mask
 * and mugwort. The bulteok, a ring of stacked stone with a fire in it and an elder always at it; the table where the
 * catch is cleaned, the frame of tewak and nets, the line of suits and flippers, the lunar tide calendar, the scale
 * the nets are weighed on with an elder keeping count, a frame of seaweed, and a small counter selling the morning's
 * catch.
 *
 * Everything that moves follows the scripts in haenyeoMotion.ts; other people are VRoid bodies where there are any
 * (vroidFigure.ts). The shore and everything on its signs are made up. Working hours are 8 to 14: full daylight.
 */

const SHORE = '검은여';
const SEA = '#27708f';
const SEA_D = '#1d5a76';
const GLINT = '#7cc4d6';
const LAVA = '#3a3a3e';
const LAVA_D = '#2a2a2e';
const LAVA_L = '#505055';
const WOOD = '#9c7a52';
const WOOD_D = '#6d4c41';
const ORANGE = '#ef6c00';
const RED = '#c62828';
const NET = '#d9c36a';
const ROPE = '#d6c49a';
const SKIN = '#e0b48d';
const PAPER = '#fbfaf6';
const INK = '#263238';
const SUIT = '#17181b';
const ABALONE = '#8d7d6b';
const CONCH = '#c9a27c';
const ROE = '#f2a93b';
const WEED = '#4a4a22';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];

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
function standAt(g: THREE.Object3D, motion: HyMotion, z = 0.6): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: HyNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_gone, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? hyNow(sp.motion as HyMotion, t, hyPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
/** Spray, smoke, breath, drips: soft balls from a place, each on its own loop. */
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
      mat.opacity = Math.min(1, strength) * 0.6 * (1 - u) * Math.min(1, u * 6);
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
function torus(g: THREE.Object3D, r: number, t: number, color: string, x: number, y: number, z: number, o: { rx?: number; ry?: number; rz?: number } = {}): THREE.Mesh {
  const m = part(g, new THREE.TorusGeometry(r, t, 8, 20), color, x, y, z, { ...o, outline: false });
  m.userData.ownGeometry = true;
  return m;
}

/** Chunks of rock: a faceted ball, shared. */
const ROCK = new THREE.IcosahedronGeometry(0.5, 1);
/** One rock. */
function rock(g: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, color = LAVA, ry = 0): THREE.Mesh {
  const m = part(g, ROCK, color, x, y, z, { ry, outline: false });
  m.scale.set(sx, sy, sz);
  return m;
}
interface Stone {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry?: number;
}
/** Many rocks of one colour, drawn at once: walls and shorelines. */
function stones(g: THREE.Object3D, list: Stone[], color: string) {
  const m = new THREE.InstancedMesh(ROCK, toon(color), list.length);
  const o = new THREE.Object3D();
  list.forEach((s, i) => {
    o.position.set(s.x, s.y, s.z);
    o.rotation.set(s.ry ?? 0, (s.ry ?? 0) * 2.3, 0);
    o.scale.set(s.sx, s.sy, s.sz);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  });
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
/** The diamond mesh of a net, tinted. */
const meshTex = (c0: string) =>
  painted(`hyMesh${c0}`, 64, 64, (c) => {
    c.clearRect(0, 0, 64, 64);
    c.strokeStyle = c0;
    c.lineWidth = 3;
    for (let i = -64; i < 128; i += 16) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 64, 64);
      c.moveTo(i, 64);
      c.lineTo(i + 64, 0);
      c.stroke();
    }
  });
/** A tewak: a float wrapped in orange cloth, a rope round its waist, its origin in the middle. */
function tewakMesh(g: THREE.Object3D, color = ORANGE, r = 0.17): THREE.Group {
  const t = group(g);
  const b = part(t, ball(r), color, 0, 0, 0);
  b.scale.y = 0.82;
  torus(t, r * 0.98, 0.008, ROPE, 0, 0, 0, { rx: Math.PI / 2 });
  for (const ry of [0, Math.PI / 2]) torus(t, r * 0.82, 0.005, shade(color, 0.72), 0, 0, 0, { ry });
  part(t, cyl(0.03, 0.03, 0.02, 10), '#fafafa', 0, r * 0.84, 0, { outline: false });
  return t;
}
/** A mangsari: a net bag on a hoop, with what's in it showing through; `fill` from 0 to 1. */
function netBag(g: THREE.Object3D, kinds: string[] = [ABALONE, CONCH, '#3a3338']): { root: THREE.Group; fill(k: number): void } {
  const root = group(g);
  torus(root, 0.12, 0.008, ROPE, 0, 0.12, 0, { rx: Math.PI / 2 });
  const mat = new THREE.MeshBasicMaterial({ map: meshTex(NET), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), mat);
  bag.userData.ownGeometry = bag.userData.ownMaterial = true;
  bag.scale.set(1, 0.95, 1);
  root.add(bag);
  const shells = Array.from({ length: 9 }, (_, i) => {
    const a = i * 2.4;
    const r = 0.03 + (i % 3) * 0.035;
    const m = part(root, ball(0.038), kinds[i % kinds.length], r * Math.cos(a), -0.09 + (i / 9) * 0.15, r * Math.sin(a), { outline: false });
    m.scale.y = 0.65;
    return m;
  });
  return {
    root,
    fill(k) {
      bag.scale.set(0.8 + 0.25 * k, 0.72 + 0.35 * k, 0.8 + 0.25 * k);
      shells.forEach((m, i) => {
        m.visible = k * shells.length > i + 0.2;
      });
    },
  };
}
/** An abalone: a flat oval shell, its origin at the middle. */
function abaloneMesh(g: THREE.Object3D): THREE.Group {
  const a = group(g);
  const s = part(a, ball(0.055), ABALONE, 0, 0, 0, { outline: false });
  s.scale.set(1.15, 0.42, 0.85);
  for (let i = 0; i < 4; i++) part(a, ball(0.005), '#2b2b30', -0.035 + i * 0.022, 0.024 - Math.abs(i - 1.5) * 0.002, 0.018, { outline: false });
  return a;
}
function conchMesh(g: THREE.Object3D): THREE.Group {
  const a = group(g);
  part(a, cyl(0.012, 0.05, 0.08, 10), CONCH, 0, 0.02, 0, { outline: false });
  part(a, cyl(0.05, 0.03, 0.04, 10), shade(CONCH, 0.82), 0, -0.04, 0, { outline: false });
  for (let i = 0; i < 6; i++) part(a, cyl(0.002, 0.009, 0.03, 5), shade(CONCH, 0.7), 0.05 * Math.cos(i * 1.05), -0.005, 0.05 * Math.sin(i * 1.05), { rz: -Math.cos(i * 1.05) * 1.1, rx: Math.sin(i * 1.05) * 1.1, outline: false });
  return a;
}
/** A sea urchin, the two halves on `halves`. */
function urchinMesh(g: THREE.Object3D): { root: THREE.Group; open(k: number): void } {
  const root = group(g);
  const half = (s: number) => {
    const h = group(root);
    part(h, ball(0.052), '#2a2230', s * 0.018, 0, 0, { outline: false }).scale.set(0.72, 1, 1);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4;
      const y = -0.05 + (i / 12) * 0.1;
      const c = part(h, cyl(0.001, 0.005, 0.05, 4), '#1d1820', s * 0.03 + s * 0.03 * Math.abs(Math.cos(a)), y, 0.05 * Math.sin(a), { outline: false });
      c.rotation.set(Math.sin(a) * 1.3, 0, -s * Math.abs(Math.cos(a)) * 1.3);
    }
    const roe = part(h, cyl(0.04, 0.04, 0.004, 10), ROE, s * -0.012, 0, 0, { rz: Math.PI / 2, outline: false });
    return { h, roe, s };
  };
  const parts = [half(-1), half(1)];
  return {
    root,
    open(k) {
      parts.forEach(({ h, roe, s }) => {
        h.position.x = s * 0.04 * k;
        h.rotation.z = s * -0.6 * k;
        roe.visible = k > 0.1;
      });
    },
  };
}
/** Flat black suit on its hanger: the origin at the hook. */
function suitMesh(g: THREE.Object3D, trim = '#e0e0e0'): THREE.Group {
  const s = group(g);
  part(s, cyl(0.004, 0.004, 0.06, 5), CHROME, 0, -0.03, 0, { outline: false });
  part(s, box(0.34, 0.016, 0.02), WOOD, 0, -0.06, 0, { outline: false });
  part(s, rbox(0.3, 0.5, 0.04, 0.03), SUIT, 0, -0.32, 0);
  part(s, rbox(0.12, 0.08, 0.05, 0.02), SUIT, 0, -0.08, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(s, rbox(0.075, 0.46, 0.035, 0.02), SUIT, sx * 0.2, -0.33, 0, { rz: sx * 0.1 });
    part(s, rbox(0.1, 0.42, 0.035, 0.02), SUIT, sx * 0.075, -0.76, 0);
  }
  part(s, box(0.32, 0.012, 0.044), trim, 0, -0.56, 0, { outline: false });
  return s;
}
/** Two flippers, heels up, tied together. Origin at the heels. */
function finPair(g: THREE.Object3D, color = '#fbc02d'): THREE.Group {
  const f = group(g);
  for (const sx of [-1, 1]) {
    part(f, rbox(0.1, 0.13, 0.05, 0.02), BLACK, sx * 0.07, -0.08, 0, { outline: false });
    part(f, box(0.12, 0.3, 0.012), color, sx * 0.07, -0.3, 0, { outline: false });
    part(f, box(0.014, 0.28, 0.018), BLACK, sx * 0.07, -0.3, 0, { outline: false });
  }
  return f;
}
/** The old round mask with its rubber rim, origin at the glass. Its lens is plain, so nothing on it reads as a face. */
function maskMesh(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  torus(m, 0.055, 0.011, BLACK, 0, 0, 0);
  part(m, cyl(0.052, 0.052, 0.004, 14), '#9fc9d8', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  return m;
}
/** A bitchang: a flat iron bar with a hooked end, along x, its origin at the grip. */
function bitchangMesh(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, box(0.1, 0.02, 0.024), WOOD_D, 0, 0, 0, { outline: false });
  part(b, box(0.26, 0.008, 0.032), STEEL, -0.17, 0, 0, { outline: false });
  return b;
}
const clipTex = () =>
  painted('hyCard', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '오늘 물때', 64, 16, 15, INK, 'center');
    c.strokeStyle = '#1976d2';
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x < 128; x += 4) c.lineTo(x, 60 + 22 * Math.sin((x / 128) * Math.PI * 4));
    c.stroke();
    [['물아래', '08:40'], ['물위', '12:10'], ['파도', '낮음']].forEach(([a, b], i) => {
      text(c, a, 8, 108 + i * 22, 13, INK);
      text(c, b, 120, 108 + i * 22, 13, '#1976d2', 'right');
    });
  });
function cardMesh(g: THREE.Object3D): THREE.Group {
  const root = group(g);
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, box(0.16, 0.21, 0.006), WOOD_D, 0, 0, 0, { outline: false });
  picture(tilt, clipTex(), 0.14, 0.19, 0, 0, 0.005);
  return root;
}
const penMesh = (g: THREE.Object3D): THREE.Mesh => part(g, cyl(0.005, 0.005, 0.12, 6), '#1976d2', 0, 0, 0, { rx: 0.7, rz: 0.3, outline: false });
function bookMesh(g: THREE.Object3D): { root: THREE.Group; written: THREE.Mesh; stamp: THREE.Mesh } {
  const root = group(g);
  part(root, box(0.36, 0.022, 0.26), '#37474f', 0, 0, 0, { outline: false });
  part(root, box(0.34, 0.012, 0.24), PAPER, 0, 0.016, 0, { outline: false });
  part(root, box(0.006, 0.014, 0.24), '#b0bec5', 0, 0.018, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(root, box(0.14, 0.001, 0.005), '#b0bec5', -0.09, 0.023, -0.08 + i * 0.05, { outline: false });
  const written = part(root, box(0.14, 0.001, 0.14), '#5f7f99', 0.09, 0.023, 0, { outline: false });
  const stamp = part(root, cyl(0.022, 0.022, 0.001, 12), RED, 0.12, 0.024, 0.08, { outline: false });
  return { root, written, stamp };
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come. None of them has a crossed leg or a lean.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
  scarf?: string;
}
const LOOKS: Record<string, Look> = {
  elderA: { top: '#3f4a5a', bottom: '#2b2f38', hair: '#c9c9c9', skin: '#c99c78', scarf: '#eceff1' },
  elderB: { top: '#6d5a4c', bottom: '#33363d', hair: '#aeb1b5', skin: '#d4a884', scarf: '#90a4ae' },
  elderC: { top: '#4f6a5e', bottom: '#2b2f38', hair: '#d8d8d8', skin: '#c99c78', scarf: '#d7ccc8' },
  visitorA: { top: '#ffb74d', bottom: '#455a64', hair: '#2b1b10' },
  visitorB: { top: '#4fc3f7', bottom: '#37474f', hair: '#1a1a1a' },
  guest: { top: '#8d6e63', bottom: '#263238', hair: '#2b1b10' },
};
function person(parent: THREE.Object3D, look: Look, seat?: number): Figure {
  const root = group(parent);
  const skin = look.skin ?? SKIN;
  const dy = seat === undefined ? 0 : seat - 0.8;
  for (const sx of [-1, 1]) {
    if (seat === undefined) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    } else {
      rod(root, v3(sx * 0.085, seat + 0.05, 0), v3(sx * 0.09, seat + 0.05, 0.3), 0.056, look.bottom);
      rod(root, v3(sx * 0.09, seat + 0.05, 0.3), v3(sx * 0.09, 0.07, 0.32), 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.36);
    }
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88 + dy, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11 + dy, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37 + dy, 0, { outline: false });
  const head = group(root, 0, 1.51 + dy, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31 + dy, 0);
    const rest = seat === undefined ? v3(sx * 0.23, 0.82, 0.05) : v3(sx * 0.17, seat + 0.14, 0.26);
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
  return { root, head, armL, armR };
}
/** Someone made the first time they're wanted (most pieces aren't used on a given day; bodies are few), then shown. */
function cast(parent: THREE.Object3D, look: Look, opts: FigureOptions, x: number, z: number, yaw: number) {
  let f: (Figure & { opts: FigureOptions }) | null = null;
  return {
    get(): Figure & { opts: FigureOptions } {
      if (!f) {
        const o = { ...opts };
        const got = vroidFigure(person(parent, look, opts.seat), o);
        got.root.position.set(x, 0, z);
        got.root.rotation.y = yaw;
        // The elders' cotton headcloth: a plain band the size of the head, nothing on it that could read as a face.
        if (look.scarf) {
          part(got.head, cyl(0.118, 0.13, 0.085, 16), look.scarf, 0, 0.075, -0.012, { outline: false });
          part(got.head, ball(0.118), look.scarf, 0, 0.09, -0.02, { outline: false }).scale.y = 0.55;
        }
        f = { ...got, opts: o };
      }
      f.root.visible = true;
      return f;
    },
    hide() {
      if (f) f.root.visible = false;
    },
  };
}

// =============================================================================================
// 바다 (hySea, 1 × 1): what the sea is besides the lot's water tiles; 갯바위 (hyShore, 16 × 10): the walkable black rock of the lot.
//
// 2026-11-05, the layout audit (before, the sea was a strip two tiles wide along the top that read as a canal, its foam a dashed road
// line): the lot's top five rows are water right across, and this piece, from the shore tile (15, 14), draws the rest. The sea past
// the lot's edge out to the horizon; the black lava broken along the waterline, outcrops reaching into the water between the ledges,
// the sea wall under the 해녀의 집; the surf working along it; a reef with the sea breaking round it; an islet far out; the floats
// of the others in the water, one diver up for breath now and then; gulls.

/** Where the ledges come down to the water, lot x: the rocks leave room there. */
const LEDGES = [1, 5, 9];

function sea(g: THREE.Group, out: Built) {
  const L = (x: number, z: number): [number, number] => [x - 15.5, z - 14.5];
  const rnd = seeded(91);
  // The sea past the lot, out to the horizon, darker further out.
  part(g, box(140, 0.02, 90), SEA, L(13, 0)[0], 0.0, L(0, -45)[1], { outline: false, shadow: false });
  part(g, box(140, 0.004, 50), SEA_D, L(13, 0)[0], 0.013, L(0, -55)[1], { outline: false, shadow: false });
  // Either side of the lot the sea comes in as far as its waterline too.
  for (const x of [-30, 56]) part(g, box(60, 0.02, 4.9), SEA, L(x, 0)[0], 0.0, L(0, 2.45)[1], { outline: false, shadow: false });
  // (The trees round the lot that would stand in the sea aren't drawn: lot3d hides them where the lot's edge is water.)
  const glints = group(g);
  for (let i = 0; i < 140; i++) part(glints, box(0.14 + rnd() * 0.22, 0.003, 0.012), GLINT, L(-8 + rnd() * 42, 0)[0], 0.026, L(0, -24 + rnd() * 28)[1], { outline: false, shadow: false });
  // The waterline: black rock, broken, straddling the edge of the land; outcrops reaching out between the ledges.
  const edge: Stone[] = [];
  const edgeD: Stone[] = [];
  for (let x = 0.1; x < 16; x += 0.3) {
    if (LEDGES.some((l) => Math.abs(x - l) < 1.05)) continue;
    const s = 0.34 + rnd() * 0.36;
    const [lx, lz] = L(x, 4.65 + rnd() * 0.45);
    (rnd() > 0.45 ? edge : edgeD).push({ x: lx, y: 0.04 + rnd() * 0.08, z: lz, sx: s * 1.3, sy: s * 0.75, sz: s, ry: rnd() * 3 });
  }
  for (const [ox, reach] of [[3, 1.4], [7, 1.1], [12.4, 1.7], [14.6, 0.9]] as const)
    for (let i = 0; i < 9; i++) {
      const s = 0.4 + rnd() * 0.45;
      const [lx, lz] = L(ox + (rnd() - 0.5) * 1.4, 5 - rnd() * reach);
      (i % 2 ? edge : edgeD).push({ x: lx, y: 0.06 + rnd() * 0.12, z: lz, sx: s * 1.25, sy: s * 0.8, sz: s, ry: rnd() * 3 });
    }
  // Under the 해녀의 집 (x 16 to the lot's edge) a low sea wall of dressed basalt, the rock piled at its foot.
  part(g, box(10, 0.5, 0.3), LAVA_D, L(21, 0)[0], 0.25, L(0, 4.92)[1]);
  for (let x = 16.1; x < 26; x += 0.42) {
    const s = 0.32 + rnd() * 0.3;
    const [lx, lz] = L(x, 4.45 + rnd() * 0.3);
    edgeD.push({ x: lx, y: 0.05, z: lz, sx: s * 1.3, sy: s * 0.7, sz: s, ry: rnd() * 3 });
  }
  stones(g, edge, LAVA);
  stones(g, edgeD, LAVA_D);
  // The surf along it: soft patches of foam, close in against the rock and thinning out, never in a line.
  const foam = [0, 1, 2].map((i) => {
    const f = group(g);
    for (let k = 0; k < 46 - i * 12; k++) {
      const [lx, lz] = L(0.2 + rnd() * 25.6, 4.5 - i * 0.35 - rnd() * 0.45);
      const m = part(f, cyl(0.5, 0.5, 0.004, 10), i ? '#e3f3f8' : '#f4fbfd', lx, 0.028 - i * 0.002, lz, { ry: rnd() * 3, outline: false, shadow: false });
      m.scale.set(0.25 + rnd() * 0.7 - i * 0.05, 1, 0.12 + rnd() * 0.22);
    }
    return f;
  });
  // A reef out past the lot's edge, the sea breaking round it.
  const reef: Stone[] = [];
  const [rx, rz] = L(19, -6);
  for (let i = 0; i < 12; i++) reef.push({ x: rx + 1.1 * Math.cos(i * 0.9) * (0.5 + (i % 3) * 0.25), y: 0.1 + (i % 3) * 0.07, z: rz + 0.5 * Math.sin(i * 0.9) * (0.5 + (i % 3) * 0.25), sx: 0.6, sy: 0.42 + (i % 2) * 0.2, sz: 0.5, ry: i });
  stones(g, reef, LAVA_D);
  const reefFoam = torus(g, 1.05, 0.05, '#e8f6fa', rx, 0.03, rz, { rx: Math.PI / 2 });
  reefFoam.scale.y = 0.55;
  // An islet far out, green on its black cliffs.
  const [ix, iz] = L(3, -32);
  part(g, cyl(1.6, 5.2, 2.6, 22), '#6f8f5a', ix, 1.3, iz);
  part(g, cyl(5.2, 5.6, 0.8, 22), LAVA_D, ix, 0.4, iz, { outline: false });
  // Others' floats in the water off the ledges, each with a net, one with a woman up for breath now and then.
  const FLOATS = [[2.6, 2.4, ORANGE], [6.4, 1.2, '#fafafa'], [10.8, 2.8, ORANGE], [14.2, -2.6, ORANGE], [22, -1.5, ORANGE]] as const;
  const far = FLOATS.map(([x, z, c]) => {
    const t = tewakMesh(g, c, 0.13);
    const [lx, lz] = L(x, z);
    t.position.set(lx, 0.05, lz);
    return t;
  });
  const [hx, hz] = L(6.9, 1.4);
  const breath = puffs(g, 5, '#ffffff', 0.05);
  const headUp = group(g);
  part(headUp, ball(0.1), BLACK, 0, 0, 0, { outline: false });
  // A gull or two, going round.
  const gulls = [0, 1].map(() => {
    const b = group(g);
    const body = part(b, ball(0.05), '#fafafa', 0, 0, 0, { outline: false });
    body.scale.set(1, 0.7, 2);
    part(b, cyl(0.008, 0.016, 0.03, 6), '#fbc02d', 0, 0, 0.12, { rx: Math.PI / 2, outline: false });
    const wings = [-1, 1].map((sx) => {
      const w = group(b);
      part(w, box(0.26, 0.008, 0.09), '#eceff1', sx * 0.13, 0, 0, { outline: false });
      return w;
    });
    return { b, wings };
  });
  const [gx, gz] = L(10, 0);
  out.away = (_gone, t) => {
    glints.position.x = 0.12 * Math.sin(t * 0.4);
    glints.position.z = 0.05 * Math.cos(t * 0.31);
    foam.forEach((f, i) => {
      const s = Math.sin(t * 0.7 + i * 2.1);
      f.position.z = 0.1 * s;
      f.position.x = 0.04 * Math.sin(t * 0.3 + i);
    });
    reefFoam.scale.setScalar(1 + 0.03 * Math.sin(t * 1.1));
    reefFoam.scale.y = 0.55;
    far.forEach((b, i) => {
      b.position.y = 0.05 + 0.018 * Math.sin(t * 1.2 + i * 2);
      b.rotation.z = 0.08 * Math.sin(t * 0.9 + i);
    });
    // She's up for a few seconds of every twenty, by the second float.
    const u = (t * 0.05) % 1;
    const up = u < 0.2;
    headUp.visible = up;
    headUp.position.set(hx, 0.06, hz);
    breath(up ? 1 : 0, hx, 0.14, hz, 0.02, t * 1.4, 0.34);
    gulls.forEach(({ b, wings }, i) => {
      const a = t * (0.3 + i * 0.05) + i * 2.4;
      const R = 3 + i;
      b.position.set(gx + R * Math.cos(a), 3.0 + i * 0.5 + 0.2 * Math.sin(a * 2), gz + 1.4 * Math.sin(a));
      b.rotation.y = -a;
      const f = 0.35 * Math.sin(t * (6 + i));
      wings[0].rotation.z = -f;
      wings[1].rotation.z = f;
    });
  };
}

function shore(g: THREE.Group, W: number, D: number) {
  part(g, box(W, 0.008, D), LAVA_L, 0, 0.004, 0, { outline: false, shadow: false });
  const rnd = seeded(47);
  // Blotches of darker rock, pale salt, pools left by the tide, a worn lane the barrows and feet have made.
  for (let i = 0; i < 46; i++) {
    const m = part(g, cyl(0.5, 0.5, 0.002, 12), i % 3 ? LAVA : LAVA_D, -W / 2 + 0.5 + rnd() * (W - 1), 0.0095, -D / 2 + 0.5 + rnd() * (D - 1), { ry: rnd() * 3, outline: false, shadow: false });
    m.scale.set(0.8 + rnd() * 1.8, 1, 0.5 + rnd() * 1);
  }
  for (const [x, z, r] of [[-5.7, 1.7, 0.42], [-3.8, -2.6, 0.5], [-1, 3.6, 0.34], [2.4, 0.4, 0.3]] as const) {
    const m = part(g, cyl(r, r, 0.003, 18), '#3f7f94', x, 0.0115, z, { outline: false, shadow: false });
    m.scale.z = 0.62;
    torus(g, r * 0.98, 0.012, LAVA_D, x, 0.012, z, { rx: Math.PI / 2 }).scale.y = 0.62;
  }
  // The pale lane: along the ledges and down to the gate.
  part(g, box(W - 2, 0.002, 1), '#6a6862', 0, 0.0105, -D / 2 + 1.5, { outline: false, shadow: false });
  part(g, box(1, 0.002, 7), '#6a6862', 4.5, 0.0105, D / 2 - 3.5, { outline: false, shadow: false });
  const pebbles: Stone[] = [];
  for (let i = 0; i < 70; i++) {
    const s = 0.04 + rnd() * 0.08;
    pebbles.push({ x: -W / 2 + 0.3 + rnd() * (W - 0.6), y: 0.015, z: -D / 2 + 0.3 + rnd() * (D - 0.6), sx: s * 1.2, sy: s * 0.5, sz: s, ry: rnd() * 3 });
  }
  stones(g, pebbles, LAVA_D);
}

// =============================================================================================
// 물질 포인트 (diveSpot, 2 × 1).

function diveSpot(g: THREE.Group, out: Built) {
  // The ledge, the steps cut down into the water with a rope along them.
  part(g, rbox(1.96, 0.1, 0.98, 0.03), LAVA, 0, 0.05, 0.02, { shadow: false });
  const top: Stone[] = [];
  const rnd = seeded(13);
  for (let i = 0; i < 12; i++) top.push({ x: -0.9 + rnd() * 1.8, y: 0.09, z: -0.4 + rnd() * 0.9, sx: 0.26 + rnd() * 0.2, sy: 0.07, sz: 0.2 + rnd() * 0.2, ry: rnd() * 3 });
  stones(g, top, LAVA_D);
  part(g, rbox(0.6, 0.14, 0.34, 0.03), LAVA, 0.1, 0.07, -0.16);
  part(g, rbox(0.6, 0.1, 0.34, 0.03), LAVA_D, 0.1, 0.05, -0.52);
  part(g, rbox(0.56, 0.04, 0.34, 0.02), '#22252a', 0.1, 0.03, -0.84, { outline: false });
  for (const x of [-0.26, 0.46]) {
    rod(g, v3(x, 0.1, -0.08), v3(x, 0.62, -0.08), 0.014, '#5d5f64');
    rod(g, v3(x, 0.05, -0.68), v3(x, 0.42, -0.68), 0.014, '#5d5f64');
    rod(g, v3(x, 0.62, -0.08), v3(x, 0.42, -0.68), 0.008, ROPE);
  }
  // A float's stone, the mask's stone with its sprig, a basket for the shells; irons laid by.
  rock(g, DS.tewak[0], 0.14, DS.tewak[2], 0.42, 0.3, 0.36, LAVA_L, 0.4);
  rock(g, DS.mask[0] - 0.1, 0.14, DS.mask[2], 0.56, 0.3, 0.36, LAVA_L, 1.1);
  const sprigStill = group(g, DS.mug[0], DS.mug[1], DS.mug[2]);
  for (let i = 0; i < 4; i++) part(sprigStill, box(0.05, 0.006, 0.018), '#8aa76b', -0.02 + i * 0.015, 0, i * 0.008, { ry: i * 0.5, outline: false });
  // The basket is round bamboo; it fills as the net is tipped out.
  const bk = group(g, DS.basket[0], 0.1, DS.basket[2]);
  part(bk, cyl(0.17, 0.13, 0.17, 14), '#c2a366', 0, 0.085, 0);
  for (let i = 0; i < 12; i++) part(bk, box(0.008, 0.17, 0.008), shade('#c2a366', 0.74), 0.155 * Math.cos(i * 0.52), 0.085, 0.155 * Math.sin(i * 0.52), { outline: false });
  torus(bk, 0.17, 0.012, '#8d6e4a', 0, 0.17, 0, { rx: Math.PI / 2 });
  const inBasket = group(bk, 0, 0.14, 0);
  for (let i = 0; i < 6; i++) {
    const m = part(inBasket, ball(0.04), i % 2 ? ABALONE : CONCH, 0.08 * Math.cos(i * 1.05), 0.012 * (i % 2), 0.08 * Math.sin(i * 1.05), { outline: false });
    m.scale.y = 0.6;
  }
  const iron = bitchangMesh(g);
  iron.position.set(0.86, 0.11, 0.38);
  iron.rotation.y = 0.5;
  // The tide staff at the edge, black and red on white; a sign; a flag pole under 1.5 m.
  part(g, box(0.05, 0.92, 0.02), '#fafafa', DS.staff[0], 0.46, DS.staff[2]);
  for (let i = 0; i < 9; i++) part(g, box(i % 3 === 0 ? 0.05 : 0.026, 0.012, 0.022), i % 3 === 0 ? RED : INK, DS.staff[0], 0.08 + i * 0.1, DS.staff[2], { outline: false });
  part(g, box(0.05, 0.1, 0.06), LAVA_D, DS.staff[0], 0.06, DS.staff[2] + 0.04);
  part(g, box(0.04, 1.42, 0.04), '#8d8f94', -0.93, 0.71, -0.14);
  part(g, box(0.06, 0.03, 0.08), BLACK, -0.93, 0.92, -0.08, { outline: false });
  const flag = group(g, -0.91, 0.5, -0.14);
  part(flag, box(0.28, 0.18, 0.006), RED, 0.14, 0, 0, { outline: false });
  part(flag, box(0.28, 0.03, 0.007), '#fafafa', 0.14, 0, 0, { outline: false });
  part(g, box(0.03, 0.44, 0.03), WOOD_D, -0.34, 0.3, 0.36);
  label(g, `${SHORE} 물질 터`, 0.42, 0.13, -0.34, 0.56, 0.378, '#efe6d0', INK);
  // What's carried, what's worn, what comes up.
  const tewak = tewakMesh(g);
  const net = netBag(g);
  const mask = maskMesh(g);
  const sprig = group(g);
  for (let i = 0; i < 3; i++) part(sprig, box(0.05, 0.006, 0.018), '#7f9e62', i * 0.015, i * 0.008, 0, { ry: i * 0.6, outline: false });
  const fins = group(g);
  for (const sx of [-1, 1]) {
    part(fins, box(0.1, 0.34, 0.012), '#fbc02d', sx * 0.07, 0.17, 0, { outline: false });
    part(fins, rbox(0.1, 0.1, 0.05, 0.02), BLACK, sx * 0.07, 0.0, 0, { outline: false });
  }
  const shellA = abaloneMesh(g);
  const shellC = conchMesh(g);
  const lump = group(g);
  part(lump, ball(0.04), ABALONE, 0, 0, 0, { outline: false }).scale.y = 0.6;
  const card = cardMesh(g);
  const pencil = penMesh(g);
  // The water: a ring where they went in, the splash, the bubbles, and the breath let go.
  const splash = puffs(g, 8, '#ffffff', 0.06);
  const bubbles = puffs(g, 7, '#eafcff', 0.026);
  const whistle = puffs(g, 5, '#ffffff', 0.03);
  const word = picture(g, painted('hySumbi', 192, 64, (c) => {
    c.clearRect(0, 0, 192, 64);
    text(c, '호오이~', 96, 34, 42, '#ffffff', 'center');
  }), 0.56, 0.19, 0, 0, 0);
  (word.material as THREE.MeshBasicMaterial).transparent = true;
  (word.material as THREE.MeshBasicMaterial).depthWrite = false;
  const ring = torus(g, 0.22, 0.014, '#e6f6fa', DS.up[0], 0.03, DS.up[1], { rx: Math.PI / 2 });
  const spots: Record<string, Spot> = { freeDive: standAt(g, 'hyDive'), seasonOpen: standAt(g, 'hySeason'), haenyeo_readTide: standAt(g, 'hyReadSea') };
  spots['*'] = spots.freeDive;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const diving = now === 'freeDive' || now === 'seasonOpen';
    const hangHome = add(DS.tewak, 0.2, -0.24, 0.1);
    if (diving) {
      at(tewak, P.tewak);
      at(net.root, P.net ?? add(P.tewak ?? DS.tewak, 0.18, -0.24, 0.1));
      at(mask, P.mask);
    } else {
      place(tewak, DS.tewak);
      tewak.visible = true;
      place(net.root, hangHome);
      net.root.visible = true;
      place(mask, DS.mask);
      mask.visible = true;
    }
    tewak.rotation.z = diving && (P.tewak?.[1] ?? 1) < 0.2 ? 0.1 * Math.sin(t * 1.3) : 0;
    net.fill(diving ? (n.catch ?? 0) * ((n.season ?? 0) > 0.5 ? 1 : 0.72) : 0.1);
    at(sprig, P.sprig);
    at(fins, P.fins);
    at(card, P.card, DS.card);
    at(pencil, P.pencil);
    sprigStill.visible = true;
    const conch = (n.season ?? 0) > 0.5 || (n.shell ?? 0) === 1;
    at(shellA, !conch ? P.shell : null);
    at(shellC, conch ? P.shell : null);
    at(lump, P.piece);
    inBasket.visible = (n.basket ?? 0) > 0.05;
    inBasket.scale.setScalar(0.4 + 0.6 * (n.basket ?? 0));
    flag.position.y = 0.5 + 0.8 * (n.flag ?? 0);
    flag.rotation.y = 0.12 * Math.sin(t * 3);
    const up = DS.up;
    splash(n.splash ?? 0, up[0], 0.04, up[1], 0.16, t * 2.4, 0.42);
    bubbles(n.bub ?? 0, up[0], 0.03, up[1], 0.1, t * 1.6, 0.1);
    whistle(n.sum ?? 0, up[0], 0.42, up[1] + 0.12, 0.03, t * 1.6, 0.34);
    word.visible = (n.sum ?? 0) > 0.5;
    if (word.visible) word.position.set(up[0] + 0.02, 0.92 + 0.02 * Math.sin(t * 3), up[1] + 0.2);
    ring.visible = (n.splash ?? 0) > 0.1 || (n.bub ?? 0) > 0.1;
    ring.scale.setScalar(1 + ((t * 0.7) % 1) * 1.1);
  });
  out.work = marker(g, 0, 0.4, -0.6);
}

// =============================================================================================
// 불턱 (bulteok, 2 × 1) and the piece under its back, 장작 더미 (hyFirewood, 2 × 1).

function bulteok(g: THREE.Group, out: Built) {
  const cz = BT.z;
  // The floor: swept sand, and a ring of stacked lava open to the front, high at the back against the wind.
  part(g, cyl(BT.r, BT.r, 0.012, 32), '#8b8678', 0, 0.012, cz, { outline: false, shadow: false });
  const lo: Stone[] = [];
  const hi: Stone[] = [];
  const rnd = seeded(29);
  const gate = 0.6;
  for (let course = 0; course < 4; course++) {
    const n = 26 - course * 2;
    for (let i = 0; i < n; i++) {
      const a = (i + (course % 2) * 0.5) / n * Math.PI * 2 - Math.PI;
      // Measured from the front: a is 0 straight at the opening.
      if (Math.abs(a) < gate + (3 - course) * 0.012) continue;
      // Lower towards the opening, so the fire and whoever's at it can be seen.
      const lowness = 1 - Math.min(1, Math.abs(a) / 2.2);
      if (course > 3 - lowness * 2.4) continue;
      const R = (BT.R + BT.r) / 2 + (rnd() - 0.5) * 0.05;
      const s = 0.3 + rnd() * 0.08;
      (rnd() > 0.5 ? lo : hi).push({ x: R * Math.sin(a), y: 0.15 + course * 0.25, z: cz + R * Math.cos(a), sx: s * 1.15, sy: s * 0.9, sz: s, ry: rnd() * 3 });
    }
  }
  stones(g, lo, LAVA);
  stones(g, hi, LAVA_D);
  // The stones to sit on, one by the opening and the elders' round the back.
  for (const [x, z] of [[BT.seat[0], BT.seat[2]], ...BT.elders] as Array<readonly [number, number]>) part(g, cyl(0.19, 0.24, 0.3, 10), LAVA_L, x, 0.15, z);
  // The fire: its ring of stones, ash where the elder draws, logs, the flames.
  const ringS: Stone[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ringS.push({ x: 0.32 * Math.cos(a), y: 0.07, z: cz + 0.32 * Math.sin(a), sx: 0.16, sy: 0.13, sz: 0.14, ry: i });
  }
  stones(g, ringS, LAVA_D);
  part(g, cyl(0.28, 0.28, 0.02, 16), '#403a36', 0, 0.022, cz, { outline: false, shadow: false });
  for (const a of [0.4, 1.5, 2.6]) part(g, cyl(0.03, 0.035, 0.38, 7), '#5a3c28', 0, 0.08, cz, { rz: Math.PI / 2, ry: a });
  const flames = [[0, 0.17, 0, 0.13, '#ff7a1a'], [0.07, 0.13, 0.04, 0.09, '#ffa726'], [-0.06, 0.13, -0.03, 0.08, '#ff8f2a'], [0.01, 0.12, 0.02, 0.06, '#ffe082']].map(([x, y, z, r, c]) => {
    const m = ownLit(g, cyl(0.002, r as number, (r as number) * 2.8, 8), c as string, x as number, y as number, cz + (z as number));
    return { m, y: y as number, s: r as number };
  });
  const glow = ownLit(g, cyl(0.2, 0.2, 0.004, 14), '#b84a14', 0, 0.034, cz);
  const smoke = puffs(g, 6, '#9a9a96', 0.07);
  // The log pile, the kettle on its stone, a stack of cups.
  for (let i = 0; i < 5; i++) part(g, cyl(0.03, 0.03, 0.34, 7), i % 2 ? '#7a5a3a' : '#8d6e4a', BT.logs[0] + 0.1 - (i % 3) * 0.07, 0.05 + (i > 2 ? 0.055 : 0), BT.logs[2] + (i % 2) * 0.04, { rx: Math.PI / 2, ry: 0.5 });
  rock(g, BT.kettle[0], 0.09, BT.kettle[2], 0.24, 0.16, 0.22, LAVA_L);
  part(g, cyl(0.07, 0.085, 0.1, 12), '#37474f', BT.kettle[0], 0.22, BT.kettle[2]);
  part(g, cyl(0.012, 0.018, 0.08, 7), '#37474f', BT.kettle[0] + 0.09, 0.24, BT.kettle[2], { rz: -0.9, outline: false });
  // A rough stone ash patch to draw in, its marks growing.
  part(g, cyl(0.26, 0.26, 0.008, 16), '#a8a49a', BT.ash[0], 0.02, BT.ash[2], { outline: false, shadow: false });
  const lines = (color: string, dx: number) =>
    [0, 1, 2].map((i) => {
      const m = part(g, box(0.15 - i * 0.02, 0.002, 0.008), color, BT.ash[0] + dx, 0.026, BT.ash[2] - 0.06 + i * 0.06, { ry: 0.5 - i * 0.4, outline: false, shadow: false });
      return m;
    });
  const hers = lines('#3a3633', -0.08);
  const ours = lines('#5a544f', 0.1);
  // Props in the hand.
  const log = group(g);
  part(log, cyl(0.03, 0.03, 0.3, 7), '#7a5a3a', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const cup = group(g);
  part(cup, cyl(0.03, 0.026, 0.055, 10), '#eceff1', 0, 0, 0, { outline: false });
  const stick = group(g);
  part(stick, cyl(0.005, 0.005, 0.3, 5), '#6d4c41', 0, -0.03, 0, { rx: 0.5, outline: false });
  const herStick = group(g);
  part(herStick, cyl(0.005, 0.005, 0.34, 5), '#5d4037', 0, -0.03, 0, { rx: 0.6, outline: false });
  const tool = bitchangMesh(g);
  const herTool = bitchangMesh(g);
  const book = bookMesh(g);
  const pen = penMesh(g);
  const stamp = group(g);
  part(stamp, cyl(0.022, 0.026, 0.05, 10), WOOD_D, 0, 0, 0, { outline: false });
  // The elders: the eldest is always there.
  const elders = BT.elders.map(([x, z], i) => cast(g, [LOOKS.elderA, LOOKS.elderB, LOOKS.elderC][i], { stage: 'elder', gender: 'female', seat: 0.3, seed: 30 + i }, x, z, faceFire(x, z)));
  const spots: Record<string, Spot> = { warmUp: standAt(g, 'hyWarm', 0.62), haenyeo_learnFromElder: standAt(g, 'hyLearn', 0.62), haenyeo_setRules: standAt(g, 'hyRules', 0.62) };
  spots['*'] = spots.warmUp;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const fire = N ? (n.fire ?? 1) : 0.8;
    flames.forEach(({ m, y, s }, i) => {
      const f = 1 + 0.22 * Math.sin(t * (9 + i * 2.3) + i);
      const h = fire * (0.72 + 0.34 * Math.sin(t * (6.3 + i)));
      m.scale.set(fire * f, Math.max(0.2, h), fire * f);
      m.position.y = y + s * 1.4 * (h - 1);
    });
    (glow.material as THREE.MeshBasicMaterial).color.set(Math.sin(t * 7) > 0 ? '#c9561a' : '#b84a14');
    smoke(1, 0, 0.5, cz, 0.06, t * 0.9, 1.1);
    const draw = N ? (n.draw ?? 1) : 1;
    hers.forEach((m, i) => (m.visible = draw * 3 > i + 0.1));
    ours.forEach((m, i) => (m.visible = (n.ours ?? 0) * 3 > i + 0.1));
    at(log, P.log);
    at(cup, P.cup);
    at(stick, P.stick);
    at(tool, P.bitchang);
    at(book.root, P.book);
    book.written.scale.z = Math.max(0.01, n.written ?? 0);
    book.stamp.visible = (n.stamped ?? 0) > 0.5;
    at(pen, P.pen);
    at(stamp, P.stamp);
    // Who's there, what each is doing.
    const inUse = !!N;
    let stickP: V | null = null;
    let toolP: V | null = null;
    elders.forEach((e, i) => {
      const on = i === 0 || (inUse && (n[`e${i}`] ?? 0) > 0.5);
      if (!on) return e.hide();
      const f = e.get();
      const [x, z] = BT.elders[i];
      const yaw = faceFire(x, z);
      const ahead = (s: number, up: number, d: number) => v3(x + Math.cos(yaw) * s + Math.sin(yaw) * d, up, z - Math.sin(yaw) * s + Math.cos(yaw) * d);
      const warm = () => {
        f.armL(ahead(0.12, 0.72 + 0.015 * Math.sin(t * 1.3 + i), 0.34));
        f.armR(ahead(-0.12, 0.72 - 0.015 * Math.sin(t * 1.3 + i), 0.34));
      };
      f.opts.nod = 0.14 + 0.05 * Math.sin(t * 0.7 + i);
      f.head.rotation.y = 0;
      const vote = n[`v${i}`] ?? 0;
      if (vote > 0.05) {
        warm();
        f.armR(ahead(-0.2, 0.86 + 0.42 * vote, 0.12));
        f.opts.nod = 0.02;
      } else if (i === 0 && (n.eStick ?? 0) > 0.5) {
        const a = t * 2.1;
        const p = add(BT.ash, -0.08 + 0.1 * Math.cos(a), 0.06, 0.05 * Math.sin(a * 0.5));
        stickP = p;
        f.armR(v3(p[0], p[1], p[2]));
        f.armL(ahead(0.16, 0.56, 0.28));
        f.opts.nod = 0.4;
      } else if (i === 0 && (n.eChest ?? 0) > 0.5) {
        const b = Math.sin(t * 1.4);
        f.armR(ahead(-0.03, 0.82 + 0.04 * b, 0.14));
        f.armL(ahead(0.16, 0.56, 0.26));
        f.opts.nod = 0.02 - 0.08 * b;
      } else if (i === 0 && (n.eTool ?? 0) > 0.05) {
        const p = ahead(-0.08, 0.76, 0.3);
        toolP = [p.x, p.y, p.z];
        f.armR(p);
        f.armL(ahead(0.12, 0.72, 0.3));
      } else if ((n.offer ?? 0) > 0.05 && i === 1) {
        f.armR(v3(BT.kettle[0] + 0.1, 0.34, BT.kettle[2]));
        f.armL(ahead(0.12, 0.72, 0.34));
      } else if ((n.chat ?? 0) > 0.5 || (n.speak ?? 0) > 0.5 || (n.eNod ?? 0) > 0.5) {
        warm();
        f.opts.nod = 0.12 + 0.2 * Math.abs(Math.sin(t * (1.8 + i * 0.6)));
      } else warm();
    });
    at(herStick, stickP);
    at(herTool, toolP);
  });
  out.work = marker(g, 0, 0.4, cz);
}

function firewood(g: THREE.Group) {
  // Inside the ring's back: a little driftwood and a bucket of shore water for the fire, nothing in anyone's way.
  for (let i = 0; i < 4; i++) part(g, cyl(0.025, 0.03, 0.3, 6), '#b4a58c', -0.82 + i * 0.03, 0.04 + (i % 2) * 0.03, 0.72, { rx: Math.PI / 2, ry: 0.4 + i * 0.3, outline: false, shadow: false });
  part(g, cyl(0.07, 0.06, 0.12, 10), '#8d8f94', -0.55, 0.07, 0.8, { outline: false });
}

// =============================================================================================
// 해산물 손질대 (catchTable, 2 × 1).

function catchTable(g: THREE.Group, out: Built) {
  for (const x of [-0.92, 0.92]) for (const z of [-0.36, 0.36]) part(g, box(0.05, CT.top - 0.03, 0.05), '#90a4ae', x, (CT.top - 0.03) / 2, z);
  part(g, box(1.9, 0.02, 0.7), '#78909c', 0, 0.28, 0, { outline: false });
  part(g, box(1.96, 0.04, 0.82), STEEL, 0, CT.top - 0.02, 0);
  for (const [w, d, x, z] of [[1.96, 0.02, 0, 0.41], [1.96, 0.02, 0, -0.41], [0.02, 0.82, -0.98, 0], [0.02, 0.82, 0.98, 0]] as const) part(g, box(w, 0.04, d), CHROME, x, CT.top + 0.02, z, { outline: false });
  part(g, box(0.06, 0.012, 0.12), BLACK, 0.92, CT.top + 0.002, 0.28, { outline: false });
  // Tubs and a sack of ice under it; a wet rubber mat where you stand.
  part(g, cyl(0.2, 0.16, 0.22, 14), '#2f80c9', -0.5, 0.11, -0.05);
  part(g, cyl(0.2, 0.2, 0.01, 14), '#cfe1e6', -0.5, 0.215, -0.05, { outline: false });
  part(g, rbox(0.34, 0.12, 0.26, 0.05), '#eceff1', 0.4, 0.34, -0.05);
  part(g, box(1.5, 0.008, 0.44), '#1f2023', 0, 0.012, 0.66, { outline: false, shadow: false });
  // The morning's basket.
  const B = CT.basket;
  part(g, cyl(0.24, 0.18, 0.2, 16), '#c2a366', B[0], CT.top + 0.1, B[2]);
  for (let i = 0; i < 12; i++) part(g, box(0.008, 0.2, 0.008), shade('#c2a366', 0.74), B[0] + 0.21 * Math.cos(i * 0.52), CT.top + 0.1, B[2] + 0.21 * Math.sin(i * 0.52), { outline: false });
  const rnd = seeded(61);
  for (let i = 0; i < 9; i++) {
    const a = rnd() * 6.28;
    const r = rnd() * 0.15;
    const m = part(g, ball(0.045), [ABALONE, CONCH, '#2a2230'][i % 3], B[0] + r * Math.cos(a), CT.top + 0.2 + rnd() * 0.02, B[2] + r * Math.sin(a), { outline: false });
    m.scale.y = 0.6;
  }
  // The board, the bowl of gold, the tools.
  part(g, rbox(0.4, 0.03, 0.28, 0.01), '#d7b98a', CT.board[0], CT.top + 0.015, CT.board[2]);
  part(g, cyl(0.1, 0.07, 0.07, 14), '#eceff1', CT.bowl[0], CT.top + 0.035, CT.bowl[2]);
  const roe = part(g, cyl(0.085, 0.085, 0.01, 14), ROE, CT.bowl[0], CT.top + 0.05, CT.bowl[2], { outline: false });
  // Trays along the back: each with its name, what's in it, one more to come.
  const NAMES = ['성게', '전복', '소라', '미역'];
  const COLS = ['#f7d774', '#b9a78f', '#d8bb94', '#7f7f3a'];
  CT.trays.forEach((x, i) => {
    part(g, box(0.32, 0.03, 0.24), '#eceff1', x, CT.trayY - 0.04, CT.trayZ);
    label(g, NAMES[i], 0.16, 0.05, x, CT.trayY - 0.04, CT.trayZ + 0.124, '#eceff1', INK);
    for (let k = 0; k < 4; k++) {
      const m = part(g, ball(0.035), COLS[i], x - 0.08 + k * 0.055, CT.trayY - 0.015 + (k % 2) * 0.008, CT.trayZ - 0.05 + (k % 2) * 0.08, { outline: false });
      m.scale.y = 0.55;
    }
  });
  const addA = abaloneMesh(g);
  place(addA, [CT.trays[1] + 0.07, CT.trayY, CT.trayZ + 0.04]);
  const addC = conchMesh(g);
  place(addC, [CT.trays[2] + 0.08, CT.trayY + 0.02, CT.trayZ + 0.04]);
  const addW = part(g, box(0.14, 0.012, 0.1), WEED, CT.trays[3] + 0.04, CT.trayY - 0.005, CT.trayZ + 0.03, { outline: false });
  // The hose reel on the end and its stream.
  part(g, cyl(0.1, 0.1, 0.05, 14), '#2e7d32', CT.hose[0] + 0.14, 0.72, -0.38, { rx: Math.PI / 2 });
  rod(g, v3(CT.hose[0] + 0.14, 0.72, -0.38), v3(CT.hose[0], CT.hose[1], CT.hose[2]), 0.008, '#2e7d32');
  // What the hands hold.
  const urchin = urchinMesh(g);
  const abalone = abaloneMesh(g);
  const conch = conchMesh(g);
  const weed = group(g);
  for (let i = 0; i < 4; i++) part(weed, box(0.03, 0.22, 0.005), WEED, -0.04 + i * 0.03, -0.1, 0, { rz: (i - 1.5) * 0.14, outline: false });
  const knife = group(g);
  part(knife, box(0.1, 0.02, 0.014), BLACK, 0.05, 0, 0, { outline: false });
  part(knife, box(0.08, 0.006, 0.02), CHROME, -0.04, 0, 0, { outline: false });
  const shears = group(g);
  for (const s of [-1, 1]) part(shears, box(0.1, 0.006, 0.012), CHROME, 0, 0, s * 0.01, { ry: s * 0.25, outline: false });
  const spoon = group(g);
  part(spoon, box(0.09, 0.005, 0.01), CHROME, 0.04, 0, 0, { outline: false });
  part(spoon, ball(0.016), ROE, -0.01, 0, 0, { outline: false });
  const hose = group(g);
  part(hose, cyl(0.014, 0.014, 0.1, 8), '#2e7d32', 0, 0, 0, { outline: false });
  const stream = puffs(g, 8, '#c8eaf5', 0.018);
  // The trial class's gear and who's there for it.
  const vest = group(g);
  part(vest, rbox(0.3, 0.38, 0.05, 0.03), ORANGE, 0, 0, 0);
  for (const y of [-0.08, 0.08]) part(vest, box(0.3, 0.018, 0.054), '#fafafa', 0, y, 0, { outline: false });
  const vestRack = group(g, CT.vest[0], CT.top + 0.03, CT.vest[2]);
  part(vestRack, rbox(0.26, 0.05, 0.2, 0.02), ORANGE, 0, 0, 0);
  part(vestRack, rbox(0.25, 0.05, 0.19, 0.02), '#ff8f2a', 0, 0.05, 0);
  const tewak = tewakMesh(g);
  const whistle = group(g);
  part(whistle, rbox(0.05, 0.022, 0.024, 0.008), '#fbc02d', 0, 0, 0, { outline: false });
  const blown = puffs(g, 4, '#ffffff', 0.02);
  const visitors = CT.tourists.map(([x, z], i) => cast(g, [LOOKS.visitorA, LOOKS.visitorB][i], { gender: i ? 'male' : 'female', seed: 40 + i }, x, z, Math.PI + (i ? 0.48 : -0.48)));
  const spots: Record<string, Spot> = { cleanSeafood: standAt(g, 'hyClean', CT.stand), haenyeo_tellStory: standAt(g, 'hyBrief', CT.stand) };
  spots['*'] = spots.cleanSeafood;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    roe.scale.y = Math.max(0.2, N && now === 'cleanSeafood' ? n.roe ?? 0 : 0.6);
    roe.position.y = CT.top + 0.045 + 0.02 * (N && now === 'cleanSeafood' ? n.roe ?? 0 : 0.6);
    at(urchin.root, P.urchin);
    urchin.open(n.half ?? 0);
    at(abalone, P.abalone);
    at(conch, P.conch);
    at(weed, P.weed);
    at(knife, P.knife);
    at(shears, P.shears);
    at(spoon, P.spoon);
    at(hose, P.hose);
    addA.visible = !!N && (n.abTray ?? 0) > 0.5;
    addC.visible = !!N && (n.coTray ?? 0) > 0.5;
    addW.visible = !!N && (n.weedTray ?? 0) > 0.5;
    const water = n.water ?? 0;
    stream(water, n.waterX ?? 0, CT.top + 0.03, 0.22, 0.03, t * 2.6, 0.2);
    at(vest, P.vest);
    at(tewak, P.tewak);
    at(whistle, P.whistle);
    vestRack.visible = !P.vest;
    const b = P.whistle;
    blown((n.blown ?? 0) > 0.5 ? 1 : 0, b ? b[0] : 0, b ? b[1] + 0.02 : 0, b ? b[2] + 0.1 : 0, 0.02, t * 2, 0.16);
    visitors.forEach((v, i) => {
      if (now !== 'haenyeo_tellStory' || !N) return v.hide();
      const f = v.get();
      f.opts.nod = 0.06 + 0.26 * (n[`nod${i}`] ?? 0);
      const [x, z] = CT.tourists[i];
      const breathe = n.try ?? 0;
      const s = i ? -1 : 1;
      if (breathe > 0.01) {
        f.armL(v3(x + 0.18 * s, 1.05 + 0.2 * breathe, z - 0.2));
        f.armR(v3(x - 0.18 * s, 1.05 + 0.2 * breathe, z - 0.2));
      } else if ((n.up ?? 0) > 0.3) {
        f.armR(v3(x - 0.14 * s, 1.34, z - 0.22));
        f.armL(null);
      } else {
        f.armL(null);
        f.armR(null);
      }
    });
  });
  out.work = marker(g, CT.board[0], CT.top + 0.03, CT.board[2]);
}

// =============================================================================================
// 테왁·망사리 정리대 (tewakRack, 1 × 1).

function tewakRack(g: THREE.Group, out: Built) {
  for (const x of [-0.42, 0.42]) {
    part(g, box(0.06, 1.32, 0.06), WOOD, x, 0.66, -0.14);
    part(g, box(0.06, 0.05, 0.4), WOOD_D, x, 0.03, -0.14);
  }
  part(g, box(0.9, 0.06, 0.06), WOOD, 0, 1.3, -0.14);
  part(g, box(0.86, 0.04, 0.05), WOOD_D, 0, 0.72, -0.14);
  for (const x of [-0.3, 0, 0.3]) part(g, cyl(0.009, 0.009, 0.07, 6), STEEL, x, 1.27, -0.1, { rx: Math.PI / 2, outline: false });
  // Two floats, one old and patched; a net hung to dry, the one to mend.
  const a = tewakMesh(g);
  a.position.set(-0.26, 0.96, -0.08);
  rod(g, v3(-0.3, 1.27, -0.08), v3(-0.26, 1.1, -0.08), 0.005, ROPE);
  const b = tewakMesh(g, '#ff8a65', 0.15);
  b.position.set(-0.24, 0.5, -0.1);
  rod(g, v3(-0.26, 0.72, -0.1), v3(-0.24, 0.62, -0.1), 0.005, ROPE);
  // A hook and iron on the lower rail.
  const hooked = bitchangMesh(g);
  hooked.position.set(0.26, 0.6, -0.1);
  hooked.rotation.z = Math.PI / 2;
  const hanging = netBag(g);
  place(hanging.root, TR.peg);
  hanging.fill(0.2);
  const hole = part(hanging.root, ball(0.03), LAVA_D, 0.1, -0.02, 0.1, { outline: false });
  // The stool, the spare float at its side, the spool of twine.
  part(g, cyl(0.15, 0.14, 0.04, 14), WOOD, TR.seat[0], TR.seat[1] - 0.02, TR.seat[2]);
  for (let i = 0; i < 3; i++) part(g, cyl(0.016, 0.018, TR.seat[1] - 0.04, 6), WOOD_D, TR.seat[0] + 0.09 * Math.cos(i * 2.09), (TR.seat[1] - 0.04) / 2, TR.seat[2] + 0.09 * Math.sin(i * 2.09));
  const spare = tewakMesh(g, ORANGE, 0.16);
  place(spare, TR.float);
  part(g, cyl(0.05, 0.05, 0.09, 10), ROPE, -0.3, 0.05, 0.3);
  part(g, box(0.02, 0.1, 0.02), WOOD_D, -0.3, 0.14, 0.3, { outline: false });
  // In hand.
  const net = netBag(g);
  net.fill(0.15);
  const patch = part(net.root, ball(0.05), '#ffb74d', 0.04, 0.0, 0.1, { outline: false });
  patch.scale.z = 0.3;
  const needle = group(g);
  part(needle, box(0.02, 0.12, 0.006), '#2e7d32', 0, 0, 0, { outline: false });
  part(needle, box(0.01, 0.07, 0.008), ROPE, 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { repairGear: standAt(g, 'hyMend', TR.stand) };
  spots['*'] = spots.repairGear;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const off = (n.off ?? 0) > 0.5;
    hanging.root.visible = !off && !P.net;
    hole.visible = !N;
    at(net.root, P.net);
    patch.scale.setScalar(Math.max(0.05, n.laced ?? 0));
    patch.scale.z *= 0.3;
    at(needle, P.needle);
    spare.scale.set(1 + 0.05 * (n.squeeze ?? 0), 1 - 0.07 * (n.squeeze ?? 0), 1 + 0.05 * (n.squeeze ?? 0));
    a.rotation.z = 0.04 * Math.sin(t * 0.9);
    b.rotation.z = 0.05 * Math.sin(t * 0.7 + 1);
  });
  out.work = marker(g, 0, 0.72, 0.1);
}

// =============================================================================================
// 고무옷 건조대 (hySuitLine, 3 × 1).

function suitLine(g: THREE.Group, out: Built) {
  for (const x of [-1.42, 1.42]) {
    part(g, cyl(0.04, 0.05, 1.86, 10), WOOD_D, x, 0.93, SL.z);
    part(g, box(0.5, 0.06, 0.06), WOOD_D, x, 0.03, SL.z, { ry: Math.PI / 2 });
    rock(g, x, 0.1, SL.z, 0.44, 0.24, 0.42, LAVA, x);
  }
  for (const [y, r] of [[SL.line, 0.008], [SL.low, 0.006]] as const) part(g, cyl(r, r, 2.84, 6), ROPE, 0, y, SL.z, { rz: Math.PI / 2, outline: false });
  // The suits already out, moving in the wind, and the one that goes up.
  const hung = [-1.0, -0.42, 0.98].map((x, i) => {
    const s = suitMesh(g, ['#e0e0e0', '#ef6c00', '#4fc3f7'][i]);
    s.position.set(x, SL.line, SL.z);
    return s;
  });
  const newSuit = suitMesh(g, '#fbc02d');
  place(newSuit, SL.slot);
  // Flippers pegged heels up along the low line.
  const pegged = [-1.1, -0.7, 0.7, 1.08].map((x, i) => {
    const f = finPair(g, ['#fbc02d', '#4fc3f7', '#ef5350', '#fbc02d'][i]);
    f.position.set(x, SL.low, SL.z + 0.02);
    return f;
  });
  const newFins = finPair(g, '#66bb6a');
  place(newFins, SL.fins);
  // The tub of fresh water, a crate with its boots, drips on the rock.
  const T = SL.tub;
  part(g, cyl(0.34, 0.27, 0.36, 18), '#2f80c9', T[0], 0.18, T[2]);
  torus(g, 0.34, 0.014, '#17598f', T[0], 0.36, T[2], { rx: Math.PI / 2 });
  part(g, cyl(0.31, 0.31, 0.01, 18), '#8ec9de', T[0], 0.33, T[2], { outline: false });
  const blackIn = part(g, rbox(0.3, 0.05, 0.22, 0.02), SUIT, T[0], 0.34, T[2], { outline: false });
  const slosh = puffs(g, 5, '#d4f1fa', 0.03);
  part(g, rbox(0.4, 0.26, 0.32, 0.015), '#37474f', SL.crate[0], 0.13, SL.crate[2]);
  for (const x of [-0.08, 0.08]) part(g, rbox(0.1, 0.16, 0.22, 0.03), BLACK, SL.crate[0] + x, 0.3, SL.crate[2], { outline: false });
  label(g, '민물에 헹궈 널기', 0.74, 0.12, 0, 0.34, SL.z + 0.02, '#efe6d0', INK);
  part(g, box(0.05, 0.34, 0.03), WOOD_D, 0, 0.17, SL.z - 0.02);
  // In hand.
  const rolled = group(g);
  part(rolled, cyl(0.06, 0.06, 0.34, 10), SUIT, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const carried = suitMesh(g, '#fbc02d');
  const finsHeld = finPair(g, '#66bb6a');
  const drip = puffs(g, 5, '#bfe5f0', 0.012);
  const spots: Record<string, Spot> = { hyHangSuit: standAt(g, 'hySuit', SL.stand) };
  spots['*'] = spots.hyHangSuit;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    hung.forEach((s, i) => {
      s.rotation.y = 0.2 * Math.sin(t * 0.8 + i);
      s.rotation.z = 0.02 * Math.sin(t * 1.1 + i * 2);
    });
    pegged.forEach((f, i) => (f.rotation.y = 0.28 * Math.sin(t * 1.1 + i * 1.6)));
    newSuit.visible = !N || (n.hung ?? 0) > 0.5;
    newSuit.rotation.y = 0.18 * Math.sin(t * 0.7);
    newFins.visible = !N || (n.pegged ?? 0) > 0.5;
    newFins.rotation.y = 0.25 * Math.sin(t * 1.3);
    blackIn.visible = (n.inTub ?? 0) > 0.5;
    blackIn.position.x = T[0] + 0.05 * Math.sin(t * 4);
    slosh(n.slosh ?? 0, T[0], 0.34, T[2], 0.18, t * 2, 0.22);
    at(rolled, P.rolled);
    if (P.rolled) rolled.rotation.x = (n.wring ?? 0) * 0.6;
    at(carried, P.suit);
    at(finsHeld, P.fins);
    const p = P.rolled ?? P.suit;
    drip((n.drip ?? 0) * (p ? 1 : 0), p ? p[0] : 0, p ? p[1] - 0.4 : 0, p ? p[2] : 0, 0.05, t * 3, -0.3);
  });
  out.work = marker(g, SL.slot[0], SL.slot[1] - 0.2, SL.slot[2]);
}

// =============================================================================================
// 물때 달력 (hyTide, 2 × 1).

function tideCalendar(g: THREE.Group, out: Built) {
  for (const x of [-0.9, 0.9]) {
    part(g, box(0.08, 1.92, 0.08), WOOD_D, x, 0.96, 0);
    rock(g, x, 0.1, 0.02, 0.42, 0.26, 0.4, LAVA, x * 2);
  }
  part(g, box(1.84, 1.3, 0.04), WOOD, 0, 1.22, 0);
  part(g, box(1.96, 0.05, 0.14), WOOD_D, 0, 1.92, 0.02);
  label(g, `${SHORE} 어촌계 물때 달력`, 1.3, 0.13, -0.16, 1.78, TC.z - 0.01, '#fbf4e0', '#3e2723');
  // The board's month: lunar days and the name of each day's water.
  const names = ['조금', '한물', '두물', '세물', '네물', '다섯물', '여섯물', '일곱물', '여덟물', '아홉물', '열물', '한꺾기', '두꺾기', '사리', '조금'];
  picture(g, painted('hyTideGrid', 416, 256, (c) => {
    c.fillStyle = '#fbf4e0';
    c.fillRect(0, 0, 416, 256);
    c.strokeStyle = '#b8a888';
    c.lineWidth = 1.5;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const x = col * 83;
        const y = row * 64;
        c.strokeRect(x + 1, y + 1, 81, 62);
        const i = (row * 5 + col) % names.length;
        const day = row * 5 + col + 1;
        text(c, `${day}`, x + 6, y + 14, 15, INK);
        const big = names[i] === '사리';
        text(c, names[i], x + 41, y + 42, big ? 20 : 15, big ? '#c62828' : '#1565c0', 'center');
      }
    }
  }), 1.05, 0.65, TC.grid[0] + 0.42, 1.14, TC.z - 0.012);
  // The moon disc, the slate, the sign.
  part(g, cyl(0.12, 0.12, 0.012, 22), '#263238', TC.moon[0], TC.moon[1] - 0.02, TC.z - 0.012, { rx: Math.PI / 2, outline: false });
  const moon = part(g, ball(0.09), '#fff3c4', TC.moon[0], TC.moon[1] - 0.02, TC.z - 0.012, { outline: false });
  moon.scale.z = 0.08;
  part(g, ball(0.09), '#263238', TC.moon[0] - 0.05, TC.moon[1] - 0.02, TC.z - 0.004, { outline: false }).scale.z = 0.06;
  part(g, box(0.5, 0.36, 0.02), '#37474f', TC.slate[0], TC.slate[1], TC.z - 0.01);
  part(g, box(0.54, 0.4, 0.012), WOOD_D, TC.slate[0], TC.slate[1], TC.z - 0.018, { outline: false });
  label(g, '오늘 물질', 0.3, 0.07, TC.slate[0], TC.slate[1] + 0.13, TC.z + 0.003, '#37474f', '#fffde7');
  const hours = picture(g, painted('hyHours', 192, 96, (c) => {
    c.clearRect(0, 0, 192, 96);
    text(c, '08:40 물아래', 96, 28, 26, '#fffde7', 'center');
    text(c, '12:10 물위', 96, 68, 26, '#fffde7', 'center');
  }), 0.42, 0.21, TC.slate[0], TC.slate[1] - 0.05, TC.z + 0.003);
  (hours.material as THREE.MeshBasicMaterial).transparent = true;
  (hours.material as THREE.MeshBasicMaterial).depthWrite = false;
  part(g, box(0.05, 0.012, 0.05), STEEL, TC.chalk[0], TC.chalk[1], TC.chalk[2], { outline: false });
  part(g, box(0.5, 0.02, 0.1), WOOD_D, TC.slate[0], TC.chalk[1] - 0.012, 0.06, { outline: false });
  const chalkHome = group(g, TC.chalk[0] + 0.06, TC.chalk[1] + 0.008, TC.chalk[2]);
  part(chalkHome, box(0.05, 0.012, 0.012), '#fffde7', 0, 0, 0, { outline: false });
  const chalk = group(g);
  part(chalk, box(0.05, 0.012, 0.012), '#fffde7', 0, 0, 0, { outline: false });
  // The sign on its hook, turned to show today's word; the magnet on the month.
  const signHook = group(g, TC.sign[0], TC.sign[1], TC.z + 0.01);
  const signA = label(signHook, '오늘 쉼', 0.34, 0.15, 0, 0, 0.006, '#c62828', '#ffffff');
  const signB = label(signHook, '물질 함', 0.34, 0.15, 0, 0, 0.006, '#2e7d32', '#ffffff');
  part(signHook, box(0.36, 0.17, 0.006), WOOD_D, 0, 0, 0, { outline: false });
  const magnet = part(g, cyl(0.03, 0.03, 0.016, 12), RED, 0, 0, 0, { rx: Math.PI / 2 });
  const lit = part(g, box(0.2, 0.15, 0.004), '#ffe082', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { hyMarkTide: standAt(g, 'hyTideMark', TC.stand) };
  spots['*'] = spots.hyMarkTide;
  const from = tcCell(...TC.from);
  const to = tcCell(...TC.to);
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const k = N ? (n.moved ?? 0) : 1;
    place(magnet, [from[0] + (to[0] - from[0]) * k + 0.07, from[1] + (to[1] - from[1]) * k + 0.03, from[2] + 0.008]);
    const cell = n.cell ?? -1;
    lit.visible = cell >= 0;
    if (cell >= 0) place(lit, tcCell(Math.round(cell), 2));
    const h = N ? (n.hours ?? 0) : 1;
    hours.visible = h > 0.02;
    hours.scale.x = Math.max(0.02, h);
    hours.position.x = TC.slate[0] - 0.21 * (1 - h);
    const sign = N ? (n.sign ?? 0) : 1;
    signA.visible = sign < 0.5;
    signB.visible = sign >= 0.5;
    signHook.rotation.y = Math.PI * 2 * sign;
    at(chalk, P.chalk);
    chalkHome.visible = !P.chalk;
  });
  out.work = marker(g, TC.grid[0] + 0.3, TC.grid[1] - 0.2, TC.z + 0.02);
}

// =============================================================================================
// 망사리 저울 (hyScale, 2 × 1).

function weighScale(g: THREE.Group, out: Built) {
  // A low iron frame: everything on this row stays under 1.5 m, so nobody at the shore is hidden behind it.
  const H = WS.hook;
  for (const x of [-0.8, 0.04]) {
    part(g, box(0.05, 1.42, 0.05), '#546e7a', x, 0.71, -0.2);
    part(g, box(0.05, 0.05, 0.44), '#455a64', x, 0.025, -0.1);
  }
  part(g, box(0.9, 0.05, 0.05), '#546e7a', -0.38, 1.42, -0.2);
  part(g, box(0.04, 0.04, 0.26), '#546e7a', H[0], 1.41, -0.09);
  // The dial: round steel, its face and its needle; the hook under it.
  part(g, cyl(0.14, 0.14, 0.05, 22), STEEL, WS.dial[0], WS.dial[1], WS.dial[2] - 0.03, { rx: Math.PI / 2 });
  picture(g, painted('hyDial', 128, 128, (c) => {
    c.fillStyle = '#fafafa';
    c.beginPath();
    c.arc(64, 64, 62, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.beginPath();
      c.moveTo(64 + 50 * Math.sin(a), 64 - 50 * Math.cos(a));
      c.lineTo(64 + 60 * Math.sin(a), 64 - 60 * Math.cos(a));
      c.stroke();
    }
    text(c, 'kg', 64, 90, 18, INK, 'center');
    ['0', '10', '20', '30'].forEach((s, i) => {
      const a = (i / 4) * Math.PI * 2;
      text(c, s, 64 + 36 * Math.sin(a), 64 - 36 * Math.cos(a), 15, RED, 'center');
    });
  }), 0.25, 0.25, WS.dial[0], WS.dial[1], WS.dial[2] - 0.003);
  const needle = group(g, WS.dial[0], WS.dial[1], WS.dial[2]);
  part(needle, box(0.006, 0.1, 0.002), RED, 0, 0.05, 0, { outline: false });
  const hookG = group(g, H[0], H[1], H[2]);
  part(hookG, cyl(0.007, 0.007, 0.08, 6), CHROME, 0, 0.04, 0, { outline: false });
  torus(hookG, 0.026, 0.006, CHROME, 0, -0.024, 0, { ry: Math.PI / 2 });
  rod(g, v3(H[0], 1.13, H[2]), v3(H[0], 1.4, H[2] - 0.06), 0.006, CHROME);
  // Nets waiting their turn on the rock, a fish-box for what's weighed, the book on its stand.
  const waiting = netBag(g);
  place(waiting.root, WS.waiting);
  waiting.fill(0.9);
  const wait2 = netBag(g);
  place(wait2.root, add(WS.waiting, 0.2, 0.02, -0.26));
  wait2.fill(1);
  part(g, rbox(0.42, 0.46, 0.46, 0.02), '#2f80c9', WS.bin[0], 0.23, WS.bin[2]);
  part(g, box(0.38, 0.01, 0.42), '#cfe1e6', WS.bin[0], 0.45, WS.bin[2], { outline: false });
  const binFill = group(g, WS.bin[0], 0.47, WS.bin[2]);
  for (let i = 0; i < 6; i++) part(binFill, ball(0.04), i % 2 ? ABALONE : CONCH, -0.1 + (i % 3) * 0.1, 0.01, -0.08 + Math.floor(i / 3) * 0.14, { outline: false }).scale.y = 0.6;
  label(g, '어촌계 위판', 0.34, 0.09, WS.bin[0], 0.28, WS.bin[2] + 0.235, '#2f80c9', '#ffffff');
  const tag = part(g, box(0.1, 0.06, 0.004), PAPER, WS.bin[0] - 0.1, 0.36, WS.bin[2] + 0.233, { outline: false });
  part(g, box(0.05, 0.86, 0.05), WOOD_D, WS.book[0], 0.43, WS.book[2] - 0.06);
  part(g, box(0.46, 0.03, 0.32), WOOD, WS.book[0], 0.88, WS.book[2]);
  const book = bookMesh(g);
  place(book.root, add(WS.book, 0, 0.015, 0));
  part(g, box(0.34, 0.06, 0.012), '#37474f', WS.book[0], 0.78, WS.book[2] + 0.15, { outline: false });
  // In hand.
  const net = netBag(g);
  net.fill(1);
  const pen = penMesh(g);
  const keeper = cast(g, LOOKS.elderB, { stage: 'elder', gender: 'female', seed: 33 }, WS.elder[0], WS.elder[1], -Math.PI * 0.7);
  const spots: Record<string, Spot> = { hyWeigh: standAt(g, 'hyWeigh', WS.stand) };
  spots['*'] = spots.hyWeigh;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const k = n.kilos ?? 0;
    needle.rotation.z = -(0.04 + k * 1.3 + k * 0.1 * (n.sway ?? 0) * Math.sin(t * 9));
    hookG.position.y = H[1] - 0.025 * k;
    waiting.root.visible = !N || !P.net || P.net[1] > 0.5;
    at(net.root, P.net);
    if (P.net) net.root.rotation.z = 0.05 * (n.sway ?? 0) * Math.sin(t * 5);
    book.written.scale.z = Math.max(0.01, N ? n.written ?? 0 : 1);
    book.stamp.visible = false;
    at(pen, P.pen);
    binFill.visible = !N || !!P.net === false;
    tag.visible = !N || (n.tagged ?? 0) > 0.5;
    if (!N) return keeper.hide();
    const f = keeper.get();
    f.opts.nod = 0.12 + 0.24 * (n.hNod ?? 0);
    f.armL(null);
    f.armR(null);
  });
  out.work = marker(g, H[0], H[1] - 0.2, H[2]);
}

// =============================================================================================
// 미역 건조대 (hyWeedRack, 3 × 1).

function weedRack(g: THREE.Group, out: Built) {
  // A low frame of bleached poles with netting stretched over it, so the air comes from below.
  for (const x of [-1.36, -0.44, 0.44, 1.36]) for (const z of [-0.26, 0.28]) rod(g, v3(x, 0, z), v3(x, SW.top, z), 0.022, '#c7b58f');
  for (const z of [-0.26, 0.28]) rod(g, v3(-1.42, SW.top, z), v3(1.42, SW.top, z), 0.02, '#c7b58f');
  for (const x of [-1.36, 1.36]) rod(g, v3(x, SW.top, -0.26), v3(x, SW.top, 0.28), 0.018, '#c7b58f');
  const mat = new THREE.MeshBasicMaterial({ map: meshTex('#a89a7a'), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const netting = new THREE.Mesh(new THREE.PlaneGeometry(2.84, 0.6), mat);
  netting.userData.ownGeometry = netting.userData.ownMaterial = true;
  netting.position.set(0, SW.top + 0.002, 0.01);
  netting.rotation.x = -Math.PI / 2;
  (mat.map as THREE.Texture).wrapS = (mat.map as THREE.Texture).wrapT = THREE.RepeatWrapping;
  (mat.map as THREE.Texture).repeat.set(14, 3);
  g.add(netting);
  // Strands laid along it, some already darkening; four new ones fresh and wet.
  const strand = (par: THREE.Object3D, color: string) => {
    const s = group(par);
    for (let i = 0; i < 3; i++) part(s, box(0.05, 0.006, 0.5), i === 1 ? color : shade(color, 0.86), -0.04 + i * 0.04, 0.008 + (i % 2) * 0.002, 0.02 * (i - 1), { outline: false, shadow: false });
    part(s, cyl(0.012, 0.012, 0.06, 6), '#6b6531', 0, 0.01, -0.25, { rz: Math.PI / 2, outline: false });
    return s;
  };
  for (const x of [-1.18, -0.95, 0.96, 1.2]) strand(g, shade(WEED, 0.8)).position.set(x, SW.top, 0.01);
  const fresh = SW.xs.map((x) => {
    const s = strand(g, '#6a6c28');
    s.position.set(x, SW.top, 0.01);
    return s;
  });
  // The basket, the tag on the frame.
  const basket = group(g);
  const basketMesh = (b: THREE.Object3D) => {
    part(b, cyl(0.2, 0.15, 0.2, 14), '#c2a366', 0, 0.1, 0);
    torus(b, 0.2, 0.012, '#8d6e4a', 0, 0.2, 0, { rx: Math.PI / 2 });
    part(b, cyl(0.17, 0.17, 0.02, 14), '#5a5b24', 0, 0.2, 0, { outline: false });
  };
  basketMesh(basket);
  label(g, '오늘 미역 · 그늘에 사흘', 0.92, 0.1, 0, SW.top - 0.16, 0.285, '#efe6d0', INK);
  // In hand.
  const held = group(g);
  for (let i = 0; i < 3; i++) part(held, box(0.04, 0.34, 0.006), i === 1 ? '#6a6c28' : '#585a22', -0.03 + i * 0.03, -0.16, 0, { rz: (i - 1) * 0.1, outline: false });
  const spots: Record<string, Spot> = { hyDryWeed: standAt(g, 'hyWeed', SW.stand) };
  spots['*'] = spots.hyDryWeed;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const laid = N ? (n.laid ?? 0) : 4;
    fresh.forEach((s, i) => {
      s.visible = laid > i + 0.5;
      s.rotation.z = 0.01 * Math.sin(t * 0.9 + i);
      const turn = n.turn ?? 0;
      const tx = n.turnX ?? -9;
      s.position.y = SW.top + (turn > 0.5 && Math.abs(SW.xs[i] - tx) < 0.2 ? 0.08 * Math.abs(Math.sin(t * 5)) : 0);
    });
    if (P.basket) place(basket, add(P.basket, 0, -0.1, 0));
    else place(basket, SW.basket);
    at(held, P.strand);
  });
  out.work = marker(g, 0, SW.top + 0.05, 0);
}

// =============================================================================================
// 해산물 카운터 (hyCounter, 3 × 1).

function counter(g: THREE.Group, out: Built) {
  // The counter: tarred boards on a footing of lava, a thick top, the shore's name; everything under 1.5 m.
  const stonesF: Stone[] = [];
  const rnd = seeded(83);
  for (let i = 0; i < 16; i++) stonesF.push({ x: -1.36 + (i % 8) * 0.39, y: 0.09 + Math.floor(i / 8) * 0.14, z: 0.26, sx: 0.38, sy: 0.17, sz: 0.2, ry: rnd() * 2 });
  stones(g, stonesF, LAVA);
  part(g, box(2.9, HC.top - 0.05, 0.5), '#5c4a3a', 0, (HC.top - 0.05) / 2, 0);
  part(g, rbox(2.98, 0.05, 0.62, 0.015), '#c7a26f', 0, HC.top - 0.025, 0);
  label(g, `${SHORE} 해녀의 집`, 1.2, 0.2, 0, 0.62, 0.252, '#efe6d0', '#3e2723');
  // The glass case with the morning's catch laid on ice.
  const cb = HC.catchBox;
  part(g, box(0.86, 0.02, 0.26), '#eceff1', cb[0], HC.top + 0.012, cb[2], { outline: false });
  part(g, box(0.82, 0.03, 0.22), '#dbecf1', cb[0], HC.top + 0.035, cb[2], { outline: false });
  for (let i = 0; i < 9; i++) {
    const m = part(g, ball(0.04), [ABALONE, CONCH, ROE][i % 3], cb[0] - 0.32 + i * 0.08, HC.top + 0.07, cb[2] - 0.06 + (i % 2) * 0.12, { outline: false });
    m.scale.y = 0.6;
  }
  const glass = new THREE.MeshBasicMaterial({ color: '#c8e6ef', transparent: true, opacity: 0.25, depthWrite: false });
  for (const [w, h, d, x, y, z] of [[0.86, 0.18, 0.006, cb[0], HC.top + 0.11, cb[2] + 0.13], [0.006, 0.18, 0.26, cb[0] - 0.43, HC.top + 0.11, cb[2]], [0.006, 0.18, 0.26, cb[0] + 0.43, HC.top + 0.11, cb[2]]] as const) {
    const m = new THREE.Mesh(box(w, h, d), glass);
    m.userData.ownMaterial = true;
    m.position.set(x, y, z);
    g.add(m);
  }
  const lid = group(g, cb[0], HC.top + 0.2, cb[2] - 0.13);
  const lidGlass = new THREE.Mesh(box(0.86, 0.006, 0.26), glass);
  lidGlass.position.z = 0.13;
  lid.add(lidGlass);
  // The board and knife, plates, the till, chili paste and sesame oil, wooden spoons in a jug.
  part(g, rbox(0.4, 0.03, 0.26, 0.01), '#d7b98a', HC.board[0], HC.top + 0.015, HC.board[2]);
  const knifeHome = group(g, HC.board[0] + 0.28, HC.top + 0.012, HC.board[2]);
  part(knifeHome, box(0.1, 0.02, 0.014), BLACK, 0.05, 0, 0, { outline: false });
  part(knifeHome, box(0.1, 0.006, 0.02), CHROME, -0.05, 0, 0, { outline: false });
  for (let i = 0; i < 3; i++) part(g, cyl(0.1, 0.075, 0.016, 16), '#fafafa', 0.96, HC.top + 0.01 + i * 0.016, -0.12, { outline: false });
  for (const [x, c] of [[0.46, '#b71c1c'], [0.56, '#c2882e']] as const) {
    part(g, cyl(0.03, 0.035, 0.1, 10), c, x, HC.top + 0.05, -0.2);
    part(g, cyl(0.016, 0.016, 0.03, 8), '#fafafa', x, HC.top + 0.115, -0.2, { outline: false });
  }
  part(g, rbox(0.24, 0.12, 0.2, 0.02), '#455a64', HC.till[0], HC.top + 0.06, HC.till[2]);
  part(g, box(0.2, 0.012, 0.15), '#90a4ae', HC.till[0], HC.top + 0.126, HC.till[2], { outline: false });
  const drawer = part(g, box(0.2, 0.04, 0.012), '#37474f', HC.till[0], HC.top + 0.03, HC.till[2] + 0.1, { outline: false });
  // The menu on two short posts behind the counter, below the eye of anyone standing at the shore.
  for (const x of [-0.5, 0.5]) part(g, box(0.05, 1.32, 0.05), WOOD_D, x + 0.2, 0.66, -0.34);
  picture(g, painted('hyMenu', 320, 96, (c) => {
    c.fillStyle = '#fbf4e0';
    c.fillRect(0, 0, 320, 96);
    text(c, '오늘 잡은 것', 160, 18, 22, '#b71c1c', 'center');
    [['전복회', '18,000'], ['성게알', '15,000'], ['소라', '12,000']].forEach(([a, b], i) => {
      text(c, a, 8 + i * 106, 52, 18, INK);
      text(c, b, 8 + i * 106, 78, 16, '#1565c0');
    });
  }), 1.2, 0.36, 0.2, 1.18, -0.32);
  // Two stools at the front, the second taken by someone having lunch.
  const stool = (x: number) => {
    part(g, cyl(0.16, 0.15, 0.04, 14), '#37474f', x, HC.stool[1] - 0.02, HC.stool[2]);
    for (let i = 0; i < 3; i++) part(g, cyl(0.014, 0.018, HC.stool[1] - 0.04, 6), '#90a4ae', x + 0.1 * Math.cos(i * 2.09), (HC.stool[1] - 0.04) / 2, HC.stool[2] + 0.1 * Math.sin(i * 2.09));
  };
  stool(HC.stool[0]);
  stool(-0.62);
  // In hand.
  const abalone = abaloneMesh(g);
  const knife = group(g);
  part(knife, box(0.1, 0.02, 0.014), BLACK, 0.05, 0, 0, { outline: false });
  part(knife, box(0.14, 0.006, 0.024), CHROME, -0.06, 0, 0, { outline: false });
  const pad = group(g);
  part(pad, box(0.12, 0.004, 0.16), PAPER, 0, 0, 0, { rx: -0.8, outline: false });
  const pen = penMesh(g);
  const cloth = group(g);
  part(cloth, rbox(0.14, 0.018, 0.1, 0.008), '#e0e0e0', 0, 0, 0, { outline: false });
  // Sliced on the board, on the plate, across to them.
  const slices = [0, 1, 2, 3, 4].map((i) => part(g, ball(0.024), '#e8dcc0', HC.board[0] + 0.02 + i * 0.038, HC.top + 0.042, HC.board[2], { outline: false }));
  slices.forEach((m) => (m.scale.y = 0.35));
  const dish = group(g);
  part(dish, cyl(0.1, 0.075, 0.016, 16), '#fafafa', 0, 0, 0, { outline: false });
  for (let i = 0; i < 5; i++) part(dish, ball(0.024), '#e8dcc0', -0.04 + i * 0.02, 0.016, 0.02 * Math.sin(i * 2), { outline: false }).scale.y = 0.35;
  part(dish, box(0.03, 0.006, 0.05), '#6a8a3a', 0.05, 0.014, 0, { outline: false });
  const sticks = group(g);
  for (const s of [-1, 1]) part(sticks, box(0.16, 0.004, 0.004), '#8d6e4a', 0, 0, s * 0.006, { outline: false });
  const guest = cast(g, LOOKS.guest, { gender: 'male', seat: HC.stool[1], seed: 50 }, HC.stool[0], HC.stool[2] + 0.04, Math.PI);
  const spots: Record<string, Spot> = { hyServe: standAt(g, 'hyServe', HC.stand) };
  spots['*'] = spots.hyServe;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    lid.rotation.x = -(n.lid ?? 0) * 0.9;
    at(abalone, P.abalone);
    at(knife, P.knife);
    knifeHome.visible = !P.knife;
    at(pad, P.pad);
    at(pen, P.pad ? add(P.pad, -0.03, 0.02, 0.04) : null);
    at(cloth, P.cloth);
    const k = n.slices ?? 0;
    slices.forEach((m, i) => (m.visible = !!N && !P.dish && (n.served ?? 0) < 0.5 && !P.sliced && k * 5 > i + 0.2));
    const dishP: V | null = P.sliced ?? P.dish ?? ((n.onPlate ?? 0) > 0.5 && (n.served ?? 0) < 0.5 ? HC.plate : (n.served ?? 0) > 0.5 && (n.customer ?? 0) > 0.5 ? HC.served : null);
    at(dish, dishP);
    drawer.position.z = HC.till[2] + 0.1 + 0.08 * Math.sin((n.paid ?? 0) * Math.PI);
    if (!N) {
      guest.hide();
      sticks.visible = false;
      return;
    }
    const f = guest.get();
    const eating = (n.eat ?? 0) > 0.5;
    const G = HC.stool;
    const lift = eating ? Math.abs(Math.sin(t * 1.3)) : 0;
    const hand = v3(G[0] + 0.05, HC.top + 0.1 + 0.32 * lift, 0.26 + 0.12 * lift);
    f.armR(eating ? hand : (n.cNod ?? 0) > 0.5 ? v3(G[0] + 0.1, 1.26, 0.34) : null);
    f.armL(null);
    f.opts.nod = eating ? 0.26 - 0.2 * lift : 0.06 + 0.2 * (n.cNod ?? 0);
    sticks.visible = eating;
    if (eating) place(sticks, [hand.x, hand.y, hand.z - 0.05]);
  });
  out.work = marker(g, HC.board[0], HC.top + 0.04, HC.board[2]);
}

// =============================================================================================
// Decor: 테왁 더미 (hyFloats, 1 × 1) and 돌담 (hyWall, 4 × 1).

function floats(g: THREE.Group) {
  rock(g, -0.1, 0.1, 0.1, 0.8, 0.22, 0.7, LAVA, 0.6);
  const list: Array<[number, number, number, string]> = [[-0.22, 0.32, -0.08, ORANGE], [0.14, 0.3, -0.14, '#fafafa'], [-0.02, 0.3, 0.22, ORANGE], [0.3, 0.26, 0.18, '#ff8a65'], [-0.06, 0.58, 0.02, ORANGE]];
  for (const [x, y, z, c] of list) tewakMesh(g, c, 0.15).position.set(x, y, z);
  const n = netBag(g);
  place(n.root, [0.32, 0.5, -0.28]);
  n.fill(0.1);
  part(g, cyl(0.016, 0.016, 1.3, 6), '#c8a76a', -0.38, 0.65, -0.34, { rz: 0.06, outline: false });
}

function wall(g: THREE.Group, W: number) {
  // A field wall as the shore builds them: dry-stacked, the sky showing through the gaps.
  const rnd = seeded(211);
  const a: Stone[] = [];
  const b: Stone[] = [];
  for (let c = 0; c < 3; c++) {
    for (let x = -W / 2 + 0.16; x < W / 2; x += 0.3) {
      if (c === 2 && rnd() < 0.2) continue;
      const s = 0.25 + rnd() * 0.1;
      (rnd() > 0.5 ? a : b).push({ x: x + (c % 2) * 0.13 + rnd() * 0.04, y: 0.13 + c * 0.22, z: (rnd() - 0.5) * 0.05, sx: s * 1.2, sy: s * 0.86, sz: s * 0.9, ry: rnd() * 3 });
    }
  }
  stones(g, a, LAVA);
  stones(g, b, LAVA_D);
}

// =============================================================================================
// 2026-11-05, the layout audit: the 해녀 탈의장 (cubbies and hooks, the heater) and the 해녀 작업장 (its roof, the ice boxes and nets).

/** 탈의장 옷장·옷걸이 (hyChangeWall, 2 × 1): pigeonholes of folded clothes and towels, a row of hooks with 물옷 and flippers, a mirror. */
function changeWall(g: THREE.Group) {
  const z = -0.32;
  part(g, box(1.9, 1.1, 0.34), WOOD, 0, 0.55, z);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      part(g, box(0.32, 0.3, 0.02), WOOD_D, -0.76 + c * 0.38, 0.22 + r * 0.34, z + 0.16, { outline: false });
      const k = (r * 5 + c) % 4;
      if (k !== 3) part(g, box(0.26, 0.12, 0.2), ['#ef9a9a', '#90caf9', '#fff59d'][k], -0.76 + c * 0.38, 0.16 + r * 0.34, z + 0.05, { outline: false });
    }
  part(g, box(1.9, 0.06, 0.06), WOOD_D, 0, 1.55, z - 0.12);
  for (let i = 0; i < 4; i++) {
    const s = suitMesh(g, i % 2 ? '#e0e0e0' : '#90caf9');
    s.position.set(-0.7 + i * 0.46, 1.55, z - 0.06);
    s.scale.setScalar(0.62);
  }
  part(g, box(0.36, 0.5, 0.02), '#cfe8f0', 0.78, 1.38, z - 0.15, { outline: false });
  label(g, '해녀 탈의장', 0.6, 0.12, -0.3, 1.82, z - 0.14, '#efe6d0', INK);
}

/** 탈의장 난로 (hyHeater, 1 × 1): an oil heater on its tray, the kettle steaming on top, stools round it. */
function heater(g: THREE.Group) {
  part(g, box(0.62, 0.04, 0.62), '#90a4ae', 0, 0.02, 0);
  part(g, cyl(0.2, 0.22, 0.62, 16), '#b0bec5', 0, 0.35, 0);
  part(g, cyl(0.17, 0.17, 0.2, 16), '#ff7043', 0, 0.36, 0, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#ff8a50' }) }).userData.ownMaterial = true;
  part(g, cyl(0.22, 0.22, 0.04, 16), '#78909c', 0, 0.68, 0);
  part(g, cyl(0.08, 0.1, 0.12, 12), '#5d6b72', 0.04, 0.76, 0);
  part(g, cyl(0.12, 0.12, 0.3, 10), '#8d6e63', -0.36, 0.15, 0.32, { outline: false });
}

/** 해녀 작업장 지붕 (hyWorkShed), at the shed's north-west tile (10, 6): posts and a roof over x 10..16, y 6..10, the 어촌계's sign. */
function workShed(g: THREE.Group) {
  const W = 5.8;
  const D = 3.8;
  const cx = -0.5 + 0.1 + W / 2;
  const cz = -0.5 + 0.1 + D / 2;
  const h = 2.9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.14, h, 0.14), '#90a4ae', cx + sx * (W / 2 - 0.1), h / 2, cz + sz * (D / 2 - 0.1));
  part(g, box(W + 0.2, 0.08, D + 0.3), '#5f8fa8', cx, h + 0.1, cz, { rx: -0.06 });
  part(g, box(W + 0.22, 0.32, 0.04), '#efe6d0', cx, h - 0.08, cz + D / 2 + 0.06, { outline: false });
  label(g, `${SHORE} 어촌계 해녀 작업장`, 2.6, 0.24, cx, h - 0.08, cz + D / 2 + 0.085, '#efe6d0', INK);
  // The concrete slab it stands on, wet in patches; a drain along its front.
  part(g, box(W, 0.02, D), '#8e9196', cx, 0.012, cz, { outline: false, shadow: false });
  part(g, box(W - 0.4, 0.004, 0.12), '#5b5f64', cx, 0.024, cz + D / 2 - 0.15, { outline: false, shadow: false });
}

/** 아이스박스·망사리 (hyIceBoxes, 2 × 1): white ice boxes stacked for the 출하, the 어촌계's name on them, a heap of empty nets. */
function iceBoxes(g: THREE.Group) {
  for (const [x, y] of [[-0.5, 0], [-0.5, 1], [0.05, 0]] as const) {
    part(g, rbox(0.5, 0.32, 0.42, 0.03), '#f5f5f5', x, 0.17 + y * 0.33, -0.05);
    label(g, `${SHORE} 어촌계`, 0.34, 0.07, x, 0.17 + y * 0.33, 0.165, '#f5f5f5', '#1976d2');
  }
  for (let i = 0; i < 3; i++) {
    const n = netBag(g);
    n.fill(0);
    place(n.root, [0.55 + (i % 2) * 0.18, 0.12 + i * 0.06, -0.1 + i * 0.12]);
  }
}

export const BUILDERS: Record<string, Builder> = {
  hyChangeWall(g) {
    changeWall(g);
  },
  hyHeater(g) {
    heater(g);
  },
  hyWorkShed(g) {
    workShed(g);
  },
  hyIceBoxes(g) {
    iceBoxes(g);
  },
  diveSpot(g, _W, _D, _c, _def, _ctx, out) {
    diveSpot(g, out);
  },
  bulteok(g, _W, _D, _c, _def, _ctx, out) {
    bulteok(g, out);
  },
  catchTable(g, _W, _D, _c, _def, _ctx, out) {
    catchTable(g, out);
  },
  tewakRack(g, _W, _D, _c, _def, _ctx, out) {
    tewakRack(g, out);
  },
  hySea(g, _W, _D, _c, _def, _ctx, out) {
    sea(g, out);
  },
  hyShore(g, W, D) {
    shore(g, W, D);
  },
  hyFirewood(g) {
    firewood(g);
  },
  hyFloats(g) {
    floats(g);
  },
  hyWall(g, W) {
    wall(g, W);
  },
  hySuitLine(g, _W, _D, _c, _def, _ctx, out) {
    suitLine(g, out);
  },
  hyTide(g, _W, _D, _c, _def, _ctx, out) {
    tideCalendar(g, out);
  },
  hyScale(g, _W, _D, _c, _def, _ctx, out) {
    weighScale(g, out);
  },
  hyWeedRack(g, _W, _D, _c, _def, _ctx, out) {
    weedRack(g, out);
  },
  hyCounter(g, _W, _D, _c, _def, _ctx, out) {
    counter(g, out);
  },
};
