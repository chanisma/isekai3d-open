import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, toon } from '../toon';
import { BLACK, CHROME, STEEL, label, litScreen, painted, picture, seeded, text } from './doctor';
import { DK, FT, MS, PB, SB, SD, TH, TP, TS, TW, VB, fgNow, fgPhase } from './foresterMotion';
import type { FgMotion, FgNow } from './foresterMotion';
import { vroidFigure, type Figure, type FigureOptions } from './vroidFigure';

/**
 * The 국유림 관리소 drawn as itself (2026-11-01 workplace pipeline, at the user's request), in the made-up 솔재 hills. Along
 * the top of the lot ridges of pine going back in layers; on the forest floor a dirt lane. A steel lookout with a ladder
 * and a fire finder, thinning stands with a banded tree that really comes down and a browned pine with its ribbon, a
 * numbered measuring tree, a pine-wilt trap and its sample table, a shed of fire tools; lower down the seedling benches
 * under their shade nets, a trail sign, a patrol board with magnets and radios, a stack of logs; by the gate the
 * hikers' sign-in stand, the forest road sign and the red fire truck; indoors a desk with the district on its screen.
 *
 * Everything that moves follows the scripts in foresterMotion.ts; other people are VRoid bodies where there are any
 * (vroidFigure.ts). Every place on the signs is made up. Hours are 8 to 17: daylight, the desk with its own lamp.
 */

const HILL = '솔재';
const BARK = '#8a5a3c';
const BARK_D = '#5e3f2c';
const NEEDLE = '#2f5d34';
const NEEDLE_L = '#3f7341';
const SICK = '#a8743a';
const WOOD = '#9c7a52';
const WOOD_D = '#6d4c41';
const CUT = '#d8b483';
const RED = '#c62828';
const ORANGE = '#ef6c00';
const GREEN = '#2e7d32';
const SOIL = '#4b3a2c';
const PAPER = '#fbfaf6';
const INK = '#263238';
const SKIN = '#e0b48d';
const POT = '#2b2b30';
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
function standAt(g: THREE.Object3D, motion: FgMotion, z = 0.6): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: FgNow | null, t: number, gone: boolean) => void) {
  out.spots = spots;
  out.away = (gone, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? fgNow(sp.motion as FgMotion, t, fgPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t, gone);
  };
}
/** Smoke, chips, mist, dust: soft balls from a place, each on its own loop. */
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
interface Inst {
  x: number;
  y: number;
  z: number;
  s?: number;
  sy?: number;
  ry?: number;
}
/** Many of one thing, drawn at once: pots, seedlings, tufts, far trees. */
function many(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, list: Inst[], shadow = true) {
  const m = new THREE.InstancedMesh(geom, toon(color), list.length);
  const o = new THREE.Object3D();
  list.forEach((p, i) => {
    o.position.set(p.x, p.y, p.z);
    o.rotation.set(0, p.ry ?? 0, 0);
    o.scale.set(p.s ?? 1, p.sy ?? p.s ?? 1, p.s ?? 1);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
const TRUNK_G = new THREE.CylinderGeometry(0.06, 0.1, 1, 7);
const CONE_G = new THREE.ConeGeometry(0.5, 1, 8);
/** A stand of pines drawn at once. `x, z` the foot, `s` the height. */
function forest(g: THREE.Object3D, list: Array<{ x: number; z: number; s: number; y?: number }>, needle = NEEDLE) {
  const y = (p: { y?: number }) => p.y ?? 0;
  many(g, TRUNK_G, BARK_D, list.map((p) => ({ x: p.x, y: y(p) + p.s * 0.28, z: p.z, s: p.s * 1.1, sy: p.s * 0.56 })));
  many(g, CONE_G, needle, list.map((p) => ({ x: p.x, y: y(p) + p.s * 0.56, z: p.z, s: p.s * 0.62, sy: p.s * 0.52, ry: p.x })));
  many(g, CONE_G, shade(needle, 1.2), list.map((p) => ({ x: p.x, y: y(p) + p.s * 0.82, z: p.z, s: p.s * 0.42, sy: p.s * 0.38, ry: p.z })));
}
/** A Korean red pine: a rust trunk leaning a little, flat layers of needles high up. Its origin at the foot. */
function pine(g: THREE.Object3D, x: number, z: number, h: number, needle = NEEDLE, y = 0): THREE.Group {
  const t = group(g, x, y, z);
  part(t, cyl(h * 0.022, h * 0.045, h * 0.8, 10), BARK, 0, h * 0.4, 0);
  for (let i = 0; i < 4; i++) part(t, box(0.02, 0.06, 0.006), BARK_D, h * 0.04 * Math.cos(i * 2), 0.3 + i * 0.28, h * 0.038 * Math.sin(i * 2) + 0.005, { outline: false, shadow: false });
  ([[0, 0.72, 0, 0.33], [h * 0.09, 0.84, 0.03, 0.26], [-h * 0.08, 0.86, -0.02, 0.24], [0, 0.97, 0, 0.2]] as const).forEach(([dx, yy, dz, r], i) => {
    const m = part(t, ball(1), i === 3 ? NEEDLE_L : needle, dx, yy * h, dz);
    m.scale.set(r * h, r * h * 0.42, r * h);
  });
  rod(t, v3(0, h * 0.62, 0), v3(h * 0.16, h * 0.76, 0.02), h * 0.012, BARK);
  rod(t, v3(0, h * 0.68, 0), v3(-h * 0.15, h * 0.82, 0), h * 0.012, BARK);
  return t;
}
const penMesh = (g: THREE.Object3D): THREE.Mesh => part(g, cyl(0.005, 0.005, 0.12, 6), '#1976d2', 0, 0, 0, { rx: 0.7, rz: 0.3, outline: false });
const cardTex = (key: string, title: string, rows: string[]) =>
  painted(`fg${key}`, 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, title, 64, 16, 15, INK, 'center');
    rows.forEach((s, i) => {
      c.strokeStyle = INK;
      c.strokeRect(8, 40 + i * 26, 10, 10);
      text(c, s, 24, 45 + i * 26, 12, INK);
    });
  });
function cardMesh(g: THREE.Object3D, tex: THREE.Texture): THREE.Group {
  const root = group(g);
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, box(0.16, 0.21, 0.006), WOOD_D, 0, 0, 0, { outline: false });
  picture(tilt, tex, 0.14, 0.19, 0, 0, 0.005);
  return root;
}
function radioMesh(g: THREE.Object3D): THREE.Group {
  const r = group(g);
  part(r, rbox(0.055, 0.12, 0.03, 0.008), BLACK, 0, 0, 0, { outline: false });
  part(r, cyl(0.004, 0.005, 0.1, 5), BLACK, 0.015, 0.1, 0, { outline: false });
  part(r, box(0.035, 0.03, 0.002), '#7fd0a0', 0, 0.03, 0.016, { outline: false });
  return r;
}
/** A hard hat for someone else's head: a plain dome about the head's size. */
function hat(head: THREE.Object3D, color: string) {
  const d = part(head, ball(0.142), color, 0, 0.06, -0.012, { outline: false });
  d.scale.y = 0.86;
  part(head, cyl(0.15, 0.15, 0.012, 16), shade(color, 0.86), 0, 0.03, -0.01, { outline: false });
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hat?: string;
}
const LOOKS: Record<string, Look> = {
  chief: { top: '#556b4a', bottom: '#3d4436', hair: '#3a2b20', hat: '#f5f5f0' },
  crew: { top: '#d84315', bottom: '#37474f', hair: '#1a1a1a', hat: '#ef6c00' },
  crew2: { top: '#d84315', bottom: '#37474f', hair: '#2b1b10', hat: '#ef6c00' },
  senior: { top: '#657151', bottom: '#444c3b', hair: '#5a5148' },
  hiker: { top: '#ef9a3a', bottom: '#3e4a50', hair: '#2b1b10', hat: '#546e7a' },
  walkerA: { top: '#4fc3f7', bottom: '#455a64', hair: '#1a1a1a' },
  walkerB: { top: '#ce93d8', bottom: '#37474f', hair: '#3a2b20' },
};
function person(parent: THREE.Object3D, look: Look): Figure {
  const root = group(parent);
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#4e4238', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
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
/** Someone made the first time they're wanted (bodies are few), then shown. */
function cast(parent: THREE.Object3D, look: Look, opts: FigureOptions, x: number, z: number, yaw: number) {
  let f: Figure | null = null;
  return {
    get(): Figure {
      if (!f) {
        f = vroidFigure(person(parent, look), { ...opts });
        f.root.position.set(x, 0, z);
        f.root.rotation.y = yaw;
        if (look.hat) hat(f.head, look.hat);
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
// 솔재 능선 (fgHills, 16 × 2) and the forest floor (fgGround, 16 × 13).

function hills(g: THREE.Group, out: Built) {
  // Ridges going back in layers, each paler than the one in front.
  ([[-5, -7.5, 9, 3.4, '#5f8558'], [4, -8.5, 10, 3.9, '#6c9165'], [-1, -11, 13, 5, '#86a584'], [9, -11.5, 8, 4.2, '#8faf8e'], [-10, -9.5, 7, 3.4, '#7a9c75']] as const).forEach(([x, z, r, h, c]) => {
    const m = part(g, ball(1), c, x, 0, z, { outline: false, shadow: false });
    m.scale.set(r, h, r * 0.6);
  });
  // Pines over the near slopes and thick along the edge of the lot, leaving a cut for a fire break.
  const rnd = seeded(71);
  const near: Array<{ x: number; z: number; s: number; y?: number }> = [];
  for (let i = 0; i < 120; i++) {
    const x = -13 + rnd() * 24;
    if (Math.abs(x - 3.2) < 0.45) continue;
    const z = -0.7 - rnd() * 6;
    near.push({ x, z, s: 1.7 + rnd() * 1.6, y: Math.max(0, (-z - 1) * 0.5) });
  }
  forest(g, near);
  const edge: Array<{ x: number; z: number; s: number }> = [];
  // 2026-11-05, the layout audit: the summit the lookout stands on (lot x 1.5, in front of the ridge's west end) is bare rock, the
  // trees stopping short of it; a cairn and the summit stone beside the tower.
  for (let x = -8; x < 8; x += 0.72) {
    const xx = x + rnd() * 0.3;
    const z = -0.2 + rnd() * 0.8;
    const s = 2.2 + rnd() * 0.9;
    if (Math.abs(xx + 6.5) < 1.3) continue;
    edge.push({ x: xx, z, s });
  }
  forest(g, edge, '#34633a');
  for (let i = 0; i < 9; i++) {
    const m = part(g, ball(0.5), i % 2 ? '#8b8678' : '#9e998b', -6.5 + Math.cos(i * 2.1) * (0.5 + (i % 3) * 0.35), 0.08, 0.2 + Math.sin(i * 2.1) * 0.4, { ry: i, outline: false });
    m.scale.set(0.5 + (i % 3) * 0.18, 0.3 + (i % 2) * 0.12, 0.42);
  }
  part(g, box(0.5, 0.62, 0.14), '#d7d2c8', -7.5, 0.31, 0.5);
  label(g, `${HILL} 정상`, 0.42, 0.12, -7.5, 0.45, 0.575, '#d7d2c8', INK);
  label(g, '612 m', 0.3, 0.1, -7.5, 0.3, 0.575, '#d7d2c8', INK);
  // A small flag of mist in the valley, drifting.
  const mist = [0, 1, 2].map((i) => {
    const mat = new THREE.MeshBasicMaterial({ color: '#f0f4f2', transparent: true, opacity: 0.32, depthWrite: false });
    const m = new THREE.Mesh(ball(1), mat);
    m.userData.ownMaterial = true;
    m.position.set(-6 + i * 6, 1.5 + i * 0.3, -7 - i);
    m.scale.set(3.2, 0.26, 0.8);
    g.add(m);
    return m;
  });
  out.away = (_gone, t) => {
    mist.forEach((m, i) => {
      m.position.x = -6 + i * 6 + 0.9 * Math.sin(t * 0.06 + i * 2);
    });
  };
}
function ground(g: THREE.Group, W: number, D: number) {
  part(g, box(W, 0.008, D), '#74814f', 0, 0.004, 0, { outline: false, shadow: false });
  const rnd = seeded(47);
  // Duff and moss in blotches.
  for (let i = 0; i < 50; i++) {
    const m = part(g, cyl(0.5, 0.5, 0.002, 12), ['#6a7a48', '#837e4e', '#8c7a50'][i % 3], -W / 2 + 0.5 + rnd() * (W - 1), 0.0095, -D / 2 + 0.5 + rnd() * (D - 1), { ry: rnd() * 3, outline: false, shadow: false });
    m.scale.set(0.8 + rnd() * 1.8, 1, 0.5 + rnd() * 1);
  }
  // 2026-11-05, the layout audit (the piece is the lot's west 16 m from the ridge's foot to the street; lot (x, z) is (x - 8, z - 8.5)
  // here). The 임도 in from the street up the east side and along under the ridge, its wheel ruts; the 등산로 up the west edge from the
  // trailhead to the lookout on the summit, stone steps at its top; the 통제선 between them, tape on posts, with its sign.
  const DIRT = '#a58c66';
  const at = (x: number, z: number) => [x - 8, z - 8.5] as const;
  part(g, box(13, 0.002, 1.0), DIRT, at(8.4, 0)[0], 0.0105, at(0, 3.5)[1], { outline: false, shadow: false });
  part(g, box(1.8, 0.002, 12), DIRT, at(14, 0)[0], 0.0105, at(0, 9)[1], { outline: false, shadow: false });
  for (const dx of [-0.4, 0.4]) part(g, box(0.12, 0.002, 11.6), '#8f7755', at(14 + dx, 0)[0], 0.0118, at(0, 9.2)[1], { outline: false, shadow: false });
  for (const dz of [-0.25, 0.25]) part(g, box(11, 0.002, 0.1), '#8f7755', at(7.6, 0)[0], 0.0118, at(0, 3.5 + dz)[1], { outline: false, shadow: false });
  part(g, box(0.9, 0.002, 11.6), '#b49a74', at(0.9, 0)[0], 0.0105, at(0, 9.2)[1], { outline: false, shadow: false });
  for (let i = 0; i < 4; i++) part(g, box(0.8, 0.06, 0.22), '#9e998b', at(1.2, 0)[0], 0.03, at(0, 3.3 + i * 0.35)[1], { outline: false });
  // The 통제선 along x 1.95 from under the road to the trailhead.
  const cx = at(1.95, 0)[0];
  const z0 = at(0, 4.1)[1];
  const z1 = at(0, 12.6)[1];
  for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 6) part(g, cyl(0.025, 0.03, 1.0, 6), '#e0e0e0', cx, 0.5, z, { outline: false });
  for (let i = 0; i < 12; i++) part(g, box(0.012, 0.06, (z1 - z0) / 12), i % 2 ? BLACK : '#fbc02d', cx, 0.92, z0 + ((i + 0.5) * (z1 - z0)) / 12, { outline: false });
  part(g, box(0.04, 0.4, 0.62), '#fbc02d', cx + 0.03, 0.62, at(0, 8.4)[1]);
  label(g, '작업 구역 · 출입 통제', 0.58, 0.14, cx - 0.005, 0.68, at(0, 8.4)[1], '#fbc02d', INK, -Math.PI / 2);
  label(g, '산림 작업 중', 0.5, 0.12, cx + 0.055, 0.68, at(0, 8.4)[1], '#fbc02d', INK, Math.PI / 2);
  // Tufts, fallen cones and stones, none of them anywhere one walks into.
  const tufts: Inst[] = [];
  const stones: Inst[] = [];
  for (let i = 0; i < 110; i++) tufts.push({ x: -W / 2 + 0.3 + rnd() * (W - 0.6), y: 0.05, z: -D / 2 + 0.3 + rnd() * (D - 0.6), s: 0.1 + rnd() * 0.12, sy: 0.08 + rnd() * 0.08, ry: rnd() * 3 });
  for (let i = 0; i < 46; i++) stones.push({ x: -W / 2 + 0.3 + rnd() * (W - 0.6), y: 0.02, z: -D / 2 + 0.3 + rnd() * (D - 0.6), s: 0.04 + rnd() * 0.06, sy: 0.03, ry: rnd() * 3 });
  many(g, CONE_G, '#5c7a3e', tufts, false);
  many(g, ball(1), '#8b8678', stones, false);
}
/**
 * A stand of the forest (fgWood 2 × 2, fgWoodW 3 × 2, fgWoodT 2 × 1; 2026-11-05, the layout audit): 소나무 close together with an oak
 * or two among them, their crowns joining overhead, ferns and saplings at their feet.
 */
function stand(g: THREE.Group, W: number, D: number) {
  const rnd = seeded(W * 31 + D * 17);
  const pines: Array<{ x: number; z: number; s: number }> = [];
  const n = Math.round(W * D * 2.2);
  for (let i = 0; i < n; i++) pines.push({ x: -W / 2 + 0.3 + rnd() * (W - 0.6), z: -D / 2 + 0.3 + rnd() * (D - 0.6), s: 2.4 + rnd() * 1.5 });
  forest(g, pines, i0(rnd) ? NEEDLE : '#34633a');
  for (let i = 0; i < Math.max(1, Math.round((W * D) / 3)); i++) {
    const x = -W / 2 + 0.4 + rnd() * (W - 0.8);
    const z = -D / 2 + 0.4 + rnd() * (D - 0.8);
    const h = 2.6 + rnd() * 1.2;
    part(g, cyl(0.06, 0.09, h * 0.6, 7), BARK_D, x, h * 0.3, z, { outline: false });
    const c = part(g, ball(1), ['#557f3a', '#6b8f3e', '#4f7a3a'][i % 3], x, h * 0.72, z, { outline: false });
    c.scale.set(0.48, 0.42, 0.48);
  }
  pine(g, -W / 2 + 0.5 + rnd() * (W - 1), -D / 2 + 0.5 + rnd() * (D - 1), 3.8 + rnd());
  for (let i = 0; i < W * D * 2; i++) {
    const f = part(g, ball(0.16), i % 3 ? '#5c8a3e' : '#6f9447', -W / 2 + 0.15 + rnd() * (W - 0.3), 0.07, -D / 2 + 0.15 + rnd() * (D - 0.3), { outline: false });
    f.scale.set(1.3, 0.5, 1.3);
  }
}
const i0 = (rnd: () => number) => rnd() > 0.5;

/**
 * 조림지 (fgPlantation, 9 × 4): a slope logged off and planted again: bare soil with the old stumps and the slash in windrows along the
 * contour, young 편백 and 낙엽송 in rows a pace and a half apart, each about knee high with its stake; the planting sign at its corner.
 */
function plantation(g: THREE.Group, W: number, D: number) {
  part(g, box(W, 0.006, D), '#8d7a56', 0, 0.006, 0, { outline: false, shadow: false });
  const rnd = seeded(97);
  for (let i = 0; i < 30; i++) {
    const m = part(g, cyl(0.5, 0.5, 0.002, 10), i % 2 ? '#7f6c4a' : '#9a8762', -W / 2 + 0.5 + rnd() * (W - 1), 0.0095, -D / 2 + 0.4 + rnd() * (D - 0.8), { ry: rnd() * 3, outline: false, shadow: false });
    m.scale.set(0.6 + rnd(), 1, 0.4 + rnd() * 0.6);
  }
  // The slash in windrows along the contour.
  for (const z of [-D / 2 + 0.15, D / 2 - 0.15]) for (let i = 0; i < 14; i++) part(g, cyl(0.03, 0.04, 0.6 + rnd() * 0.5, 5), i % 2 ? '#7b5237' : '#9c7a52', -W / 2 + 0.4 + i * (W - 0.8) / 13, 0.05, z + (rnd() - 0.5) * 0.15, { rz: Math.PI / 2, ry: rnd() - 0.5, outline: false });
  // Old stumps.
  for (let i = 0; i < 9; i++) {
    const x = -W / 2 + 0.6 + rnd() * (W - 1.2);
    const z = -D / 2 + 0.6 + rnd() * (D - 1.2);
    part(g, cyl(0.16, 0.2, 0.22, 10), BARK, x, 0.11, z, { outline: false });
    part(g, cyl(0.15, 0.15, 0.01, 10), CUT, x, 0.225, z, { outline: false });
  }
  // The young trees in rows, each with its stake.
  const young: Array<{ x: number; z: number; s: number }> = [];
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 7; k++) {
      const x = -W / 2 + 0.7 + k * ((W - 1.4) / 6) + (r % 2) * 0.35;
      const z = -D / 2 + 0.5 + r * ((D - 1) / 3);
      young.push({ x, z, s: 0.45 + rnd() * 0.25 });
    }
  forest(g, young, NEEDLE_L);
  for (const p of young) part(g, box(0.02, 0.5, 0.02), '#c8a56f', p.x + 0.08, 0.25, p.z, { outline: false });
  // The sign.
  for (const x of [-W / 2 + 0.2, -W / 2 + 0.9]) part(g, cyl(0.03, 0.03, 1.1, 6), WOOD_D, x, 0.55, -D / 2 + 0.3);
  part(g, rbox(0.86, 0.42, 0.04, 0.02), '#fffde7', -W / 2 + 0.55, 0.9, -D / 2 + 0.32);
  label(g, '조림지 · 2026년 봄', 0.78, 0.13, -W / 2 + 0.55, 0.98, -D / 2 + 0.345, '#fffde7', GREEN);
  label(g, '편백 · 낙엽송 2,400본', 0.78, 0.11, -W / 2 + 0.55, 0.82, -D / 2 + 0.345, '#fffde7', INK);
}

function roadSign(g: THREE.Group) {
  for (const x of [-0.36, 0.36]) part(g, cyl(0.04, 0.05, 1.5, 8), WOOD_D, x, 0.75, -0.12);
  part(g, rbox(0.98, 0.72, 0.05, 0.02), GREEN, 0, 1.16, -0.08);
  picture(g, painted('fgRoad', 256, 188, (c) => {
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 256, 188);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.strokeRect(6, 6, 244, 176);
    text(c, `${HILL} 임도 3호선`, 128, 32, 25, '#ffffff', 'center');
    text(c, '전망대 3.2 km  →', 128, 72, 20, '#ffffff', 'center');
    text(c, '차량 통행 제한', 128, 106, 19, '#ffe082', 'center');
    text(c, '시속 20 km · 낙석 주의', 128, 138, 16, '#ffffff', 'center');
    text(c, '국유림 관리소', 128, 164, 15, '#c8e6c9', 'center');
  }), 0.94, 0.68, 0, 1.16, -0.05);
  // Under it, the day's fire danger on its pointer.
  part(g, rbox(0.72, 0.26, 0.04, 0.02), '#fafafa', 0, 0.56, -0.1);
  (['#4caf50', '#fbc02d', '#ef6c00', '#c62828'] as const).forEach((col, i) => part(g, box(0.16, 0.08, 0.044), col, -0.26 + i * 0.173, 0.62, -0.1, { outline: false }));
  label(g, '오늘 산불 위험', 0.5, 0.08, 0, 0.51, -0.077, '#fafafa', INK);
  part(g, cyl(0.004, 0.024, 0.09, 4), INK, 0.09, 0.6, -0.07, { rz: Math.PI, outline: false });
}
function logStack(g: THREE.Group) {
  for (const x of [-0.72, 0, 0.72]) part(g, box(0.1, 0.1, 0.84), '#6d5a44', x, 0.05, 0);
  const rows = [5, 4, 3];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const z = (i - (n - 1) / 2) * 0.17;
      const m = part(g, cyl(0.082, 0.086, 1.78, 12), i % 2 ? BARK : '#7b5237', 0, 0.18 + r * 0.145, z, { rz: Math.PI / 2 });
      m.castShadow = true;
      part(g, cyl(0.07, 0.07, 0.006, 12), CUT, 0.893, 0.18 + r * 0.145, z, { rz: Math.PI / 2, outline: false });
    }
  });
  part(g, box(0.02, 0.76, 0.02), '#fafafa', -0.9, 0.38, 0.42);
  label(g, '솔재 12-4구역', 0.34, 0.09, -0.46, 0.34, 0.43, '#fff8e1', INK);
}

// =============================================================================================
// 묘목 포트 (saplingBed, 2 × 1).

function potMesh(g: THREE.Object3D) {
  const root = group(g);
  part(root, cyl(0.045, 0.034, 0.09, 10), POT, 0, 0, 0, { outline: false });
  const soil = part(root, cyl(0.04, 0.04, 0.006, 10), SOIL, 0, 0.04, 0, { outline: false });
  const sprout = group(root, 0, 0.04, 0);
  part(sprout, cyl(0.004, 0.005, 0.07, 5), BARK, 0, 0.035, 0, { outline: false });
  part(sprout, new THREE.ConeGeometry(0.03, 0.11, 7), NEEDLE_L, 0, 0.1, 0, { outline: false });
  const tag = part(root, box(0.018, 0.05, 0.002), '#fafafa', 0.03, 0.06, 0.02, { outline: false });
  return { root, soil, sprout, tag };
}
function saplingBed(g: THREE.Group, out: Built) {
  // The bench: slatted over steel legs, carrying its trays.
  part(g, box(1.92, 0.05, 0.84), '#8f9aa0', 0, 0.72, -0.02);
  for (let i = 0; i < 9; i++) part(g, box(1.9, 0.012, 0.05), WOOD, 0, 0.752, -0.38 + i * 0.09, { outline: false, shadow: false });
  for (const x of [-0.9, 0.9]) for (const z of [-0.38, 0.34]) part(g, box(0.05, 0.72, 0.05), '#6f7a80', x, 0.36, z);
  part(g, box(1.8, 0.03, 0.03), '#6f7a80', 0, 0.26, -0.38, { outline: false });
  // Back trays of pots, each with a seedling; two kinds, by the labels.
  const pots: Inst[] = [];
  const seeds: Inst[] = [];
  const seeds2: Inst[] = [];
  const POT_G = new THREE.CylinderGeometry(0.044, 0.034, 0.09, 8);
  const SEED_G = new THREE.ConeGeometry(0.034, 0.13, 7);
  const rnd = seeded(23);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 15; c++) {
      const x = -0.86 + c * 0.104;
      const z = -0.36 + r * 0.1;
      // The working part of the bench is left clear; the near tray has its place to fill.
      if (x > -0.34 && x < -0.22 && r === 2) continue;
      if (x < -0.5 && r === 2) continue;
      pots.push({ x, y: 0.8, z });
      (c % 8 < 4 ? seeds : seeds2).push({ x, y: 0.91 + rnd() * 0.012, z, s: 0.9 + rnd() * 0.3, ry: rnd() * 3 });
    }
  many(g, POT_G, POT, pots);
  many(g, SEED_G, NEEDLE_L, seeds);
  many(g, SEED_G, '#54884c', seeds2);
  for (let c = 0; c < 2; c++) label(g, c ? '잣나무 2년생' : '소나무 2년생', 0.3, 0.075, -0.5 + c * 0.86, 0.79, -0.44, '#fff8e1', INK);
  // The stack of pots, the soil bin, the tags, the sample box.
  for (let i = 0; i < 6; i++) part(g, cyl(0.046, 0.036, 0.09, 10), POT, SB.stack[0], 0.8 + i * 0.024, SB.stack[2], { outline: false });
  part(g, rbox(0.32, 0.08, 0.26, 0.015), '#37474f', SB.soil[0], 0.8, SB.soil[2]);
  part(g, box(0.28, 0.01, 0.22), SOIL, SB.soil[0], 0.84, SB.soil[2], { outline: false });
  const tags = group(g, SB.tags[0], 0.76, SB.tags[2]);
  part(tags, cyl(0.03, 0.026, 0.05, 10), '#b0bec5', 0, 0.025, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(tags, box(0.012, 0.05, 0.002), '#fafafa', -0.01 + i * 0.007, 0.06, 0, { rz: i * 0.08 - 0.1, outline: false });
  part(g, rbox(0.2, 0.06, 0.13, 0.012), '#bcaaa4', SB.box[0], 0.79, SB.box[2]);
  label(g, '수종 표본', 0.17, 0.04, SB.box[0], 0.8, SB.box[2] + 0.066, '#fff8e1', INK);
  const canHome = group(g, SB.can[0], SB.can[1], SB.can[2]);
  const canMesh = (r: THREE.Object3D) => {
    part(r, cyl(0.07, 0.08, 0.15, 12), '#5a9a7f', 0, 0, 0);
    part(r, cyl(0.009, 0.014, 0.19, 7), '#5a9a7f', 0.12, 0.02, 0, { rz: -0.9, outline: false });
    part(r, cyl(0.024, 0.016, 0.018, 8), '#3f7a62', 0.2, 0.08, 0, { rz: -0.9, outline: false });
    torus(r, 0.06, 0.007, '#3f7a62', 0, 0.1, 0, { rx: 0 });
  };
  canMesh(canHome);
  const can = group(g);
  canMesh(can);
  // The shade net on two low hoops: seen through, well under the height that would hide someone behind it.
  for (const x of [-0.92, 0.92]) {
    rod(g, v3(x, 0.76, 0.36), v3(x, 1.32, 0.0), 0.011, '#607d8b');
    rod(g, v3(x, 0.76, -0.42), v3(x, 1.32, 0.0), 0.011, '#607d8b');
  }
  part(g, box(1.84, 0.012, 0.012), '#607d8b', 0, 1.32, 0, { outline: false });
  const net = new THREE.MeshBasicMaterial({ color: '#17331d', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const backNet = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 0.7), net);
  backNet.userData.ownGeometry = backNet.userData.ownMaterial = true;
  backNet.position.set(0, 1.04, -0.21);
  backNet.rotation.x = 0.65;
  g.add(backNet);
  // The pot that's being done, the trowel, the seedling on its way, the water, the one left in its place.
  const worked = potMesh(g);
  const trowel = group(g);
  part(trowel, box(0.04, 0.008, 0.07), STEEL, 0, 0, -0.05, { outline: false });
  part(trowel, cyl(0.009, 0.009, 0.08, 6), WOOD_D, 0, 0, 0.03, { rx: Math.PI / 2, outline: false });
  const seedling = group(g);
  part(seedling, cyl(0.004, 0.005, 0.07, 5), BARK, 0, 0, 0, { outline: false });
  part(seedling, new THREE.ConeGeometry(0.03, 0.11, 7), NEEDLE_L, 0, 0.08, 0, { outline: false });
  const done = potMesh(g);
  place(done.root, SB.slot);
  done.tag.visible = true;
  const drops = puffs(g, 7, '#bfe8ff', 0.012);
  const sprigs = group(g);
  const sprigMesh = (r: THREE.Object3D, n: number, c: string) => {
    part(r, cyl(0.004, 0.005, 0.1, 5), BARK, 0, -0.03, 0, { outline: false });
    for (let i = 0; i < n; i++) part(r, cyl(0.0015, 0.003, 0.12, 4), c, Math.sin(i * 2.4) * 0.03, 0.06, Math.cos(i * 2.4) * 0.03, { rz: -Math.sin(i * 2.4) * 0.45, rx: Math.cos(i * 2.4) * 0.45, outline: false });
  };
  sprigMesh(sprigs, 8, NEEDLE_L);
  const five = group(g);
  sprigMesh(five, 15, '#6f9e78');
  const card = cardMesh(g, cardTex('Trees', '나무 이름 익히기', ['소나무 잎 2개', '잣나무 잎 5개', '굴참나무', '신갈나무']));
  const pen = penMesh(g);
  const senior = cast(g, LOOKS.senior, { gender: 'male', seed: 41 }, 1.12, 0.62, -Math.PI / 2);
  const spots: Record<string, Spot> = { plantSaplings: standAt(g, 'fgPlant'), forester_learnTrees: standAt(g, 'fgLearn') };
  spots['*'] = spots.plantSaplings;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const planting = now === 'plantSaplings';
    at(worked.root, planting ? P.pot : null);
    worked.soil.visible = (n.soil ?? 0) > 0.1;
    worked.soil.position.y = 0.0 + 0.04 * (n.soil ?? 0);
    worked.sprout.visible = (n.sprout ?? 0) > 0.5;
    worked.tag.visible = (n.tag ?? 0) > 0.5;
    at(trowel, P.trowel);
    at(seedling, P.sprig);
    canHome.visible = !P.can;
    at(can, P.can);
    can.rotation.z = -0.8 * (n.tilt ?? 0);
    done.root.visible = !planting || (n.slot ?? 0) > 0.5;
    drops(n.pour ?? 0, SB.work[0] + 0.04, SB.work[1] + 0.06, SB.work[2], 0.012, t * 3, 0.1);
    at(sprigs, P.pine);
    at(five, P.five);
    at(card, P.card);
    at(pen, P.pen);
    if (now === 'forester_learnTrees') {
      const s = senior.get();
      s.head.rotation.y = 0.25 * Math.sin(t * 0.7);
      s.head.rotation.x = 0.12;
      s.armR((n.talk ?? 0) > 0.5 ? v3(0.58, 1.0 + 0.04 * Math.sin(t * 3), 0.42) : null);
    } else senior.hide();
  });
  out.work = marker(g, 0, 0.82, 0.26);
}

// =============================================================================================
// 숲가꾸기 구역 (thinningSite, 2 × 1).

function sawMesh(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, rbox(0.1, 0.13, 0.26, 0.03), ORANGE, 0, 0.0, 0.12);
  part(s, rbox(0.1, 0.05, 0.05, 0.015), INK, 0, 0.09, 0.02, { outline: false });
  torus(s, 0.06, 0.009, INK, 0, 0.1, 0.14, { ry: Math.PI / 2 });
  part(s, box(0.012, 0.055, 0.42), STEEL, 0, 0.0, 0.44, { outline: false });
  part(s, box(0.018, 0.012, 0.42), INK, 0, 0.03, 0.44, { outline: false });
  part(s, box(0.018, 0.012, 0.42), INK, 0, -0.03, 0.44, { outline: false });
  return s;
}
function thinningSite(g: THREE.Group, out: Built) {
  // A slash of brash on the floor of the stand; the trees that stay, with a white ribbon; the one with the band.
  const rnd = seeded(61);
  const brash: Inst[] = [];
  for (let i = 0; i < 30; i++) brash.push({ x: -0.95 + rnd() * 1.9, y: 0.03, z: -0.95 + rnd() * 0.5, s: 0.1 + rnd() * 0.14, sy: 0.05, ry: rnd() * 3 });
  many(g, CONE_G, '#5a6b3c', brash, false);
  pine(g, 0.98, -1.08, 3.0);
  pine(g, -1.0, -1.1, 2.9);
  part(g, cyl(0.075, 0.075, 0.06, 10), '#fafafa', 0.98, 1.1, -1.08, { outline: false });
  // The one to come down: its stump below the cut stays; the rest is on a pivot.
  const [tx, tz] = TH.tree;
  part(g, cyl(0.1, 0.13, TH.cut, 12), BARK, tx, TH.cut / 2, tz);
  part(g, cyl(0.1, 0.1, 0.006, 12), CUT, tx, TH.cut + 0.003, tz, { outline: false });
  const tree = group(g, tx, TH.cut, tz);
  const body = pine(tree, 0, 0, 2.85);
  const band = part(tree, cyl(0.082, 0.082, 0.1, 12), ORANGE, 0, 0.72, 0, { outline: false });
  const notch = part(tree, box(0.11, 0.09, 0.08), '#3a2a1e', 0, 0.04, 0.085, { outline: false, shadow: false });
  const backCut = part(tree, box(0.1, 0.012, 0.23), '#2a1e16', 0.09, 0.05, 0, { outline: false, shadow: false });
  // The browned pine and the mark on it; the twig that gets pulled down.
  const [sx, sz] = TH.sick;
  pine(g, sx, sz, 2.7, SICK);
  const hole = part(g, cyl(0.012, 0.012, 0.01, 8), '#231810', sx + 0.05, 1.0, sz + 0.098, { rx: Math.PI / 2, outline: false });
  const ribbon = part(g, cyl(0.09, 0.095, 0.05, 12), RED, sx, 1.16, sz, { outline: false });
  const twig = group(g, sx + 0.2, 1.68, sz + 0.14);
  part(twig, cyl(0.006, 0.008, 0.28, 5), BARK, 0.02, -0.14, 0.02, { outline: false });
  for (let i = 0; i < 5; i++) part(twig, cyl(0.002, 0.004, 0.1, 4), SICK, 0.04 * Math.cos(i), -0.24 - i * 0.008, 0.04 * Math.sin(i), { rz: Math.cos(i) * 0.5, outline: false });
  // A stump for the saw, a hard hat, a fuel can, a sample tin.
  part(g, cyl(0.18, 0.22, TH.stump[1], 12), BARK_D, TH.stump[0], TH.stump[1] / 2, TH.stump[2]);
  part(g, cyl(0.17, 0.17, 0.005, 12), CUT, TH.stump[0], TH.stump[1] + 0.003, TH.stump[2], { outline: false });
  part(g, rbox(0.1, 0.17, 0.07, 0.015), RED, -0.3, 0.09, 0.32);
  part(g, cyl(0.014, 0.014, 0.03, 6), '#fbc02d', -0.28, 0.19, 0.32, { outline: false });
  part(g, rbox(0.16, 0.1, 0.12, 0.012), STEEL, TH.bag[0], 0.05, TH.bag[2]);
  // The blocks and the length on them, cut in rounds; the stack the rounds go on.
  for (const x of [-0.26, 0.28]) part(g, box(0.12, 0.13, 0.32), BARK_D, TH.log[0] + x, 0.065, TH.log[2]);
  part(g, cyl(0.082, 0.09, 1.0, 12), BARK, TH.log[0], TH.log[1], TH.log[2], { rz: Math.PI / 2 });
  part(g, cyl(0.07, 0.07, 0.006, 12), CUT, TH.log[0] + 0.503, TH.log[1], TH.log[2], { rz: Math.PI / 2, outline: false });
  const kerfs = [-0.14, 0.14].map((d) => part(g, cyl(0.086, 0.086, 0.012, 12), CUT, TH.log[0] + d, TH.log[1], TH.log[2], { rz: Math.PI / 2, outline: false }));
  const stackGroup = group(g, TH.rounds[0], 0, TH.rounds[2]);
  const roundsMade: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const m = part(stackGroup, cyl(0.085, 0.085, 0.26, 12), BARK, -0.12 + (i % 2) * 0.18, 0.09 + (i > 1 ? 0.15 : 0), 0, { rx: Math.PI / 2 });
    part(m, cyl(0.07, 0.07, 0.004, 12), CUT, 0, 0.132, 0, { outline: false });
    roundsMade.push(m);
  }
  const round = group(g);
  part(round, cyl(0.085, 0.085, 0.26, 12), BARK, 0, 0, 0, { rz: Math.PI / 2, outline: false });
  // The boundary stake with its sign, under 1.5 m.
  part(g, box(0.045, 0.82, 0.045), '#c8b08a', 0.0, 0.41, 0.42);
  label(g, '솔재 12-4 · 간벌', 0.42, 0.13, 0, 0.74, 0.445, '#fff3e0', INK);
  const saw = sawMesh(g);
  const spray = group(g);
  part(spray, cyl(0.03, 0.03, 0.14, 8), ORANGE, 0, 0, 0, { outline: false });
  const tube = group(g);
  part(tube, cyl(0.012, 0.012, 0.08, 7), '#e0e0e0', 0, 0, 0, { rz: 1.2, outline: false });
  const drillBody = group(g);
  part(drillBody, rbox(0.06, 0.1, 0.16, 0.015), '#1565c0', 0, 0, 0.05);
  part(drillBody, cyl(0.006, 0.006, 0.12, 6), STEEL, 0, 0, -0.08, { rx: Math.PI / 2, outline: false });
  part(drillBody, rbox(0.04, 0.1, 0.05, 0.01), BLACK, 0, -0.08, 0.08, { outline: false });
  const card = cardMesh(g, cardTex('Pest', '병해충 조사', ['솔재 12-4 · 3번목', '잎 갈변 · 처짐', '시료 채취', '리본 표시']));
  const pen = penMesh(g);
  const chips = puffs(g, 9, '#e2c799', 0.018);
  const exhaust = puffs(g, 5, '#d0d0d0', 0.035);
  const shoutWord = picture(g, painted('fgTimber', 256, 64, (c) => {
    c.clearRect(0, 0, 256, 64);
    text(c, '넘어갑니다!', 128, 34, 40, '#ffffff', 'center');
  }), 0.72, 0.18, 0.9, 2.08, 0.2);
  (shoutWord.material as THREE.MeshBasicMaterial).transparent = true;
  (shoutWord.material as THREE.MeshBasicMaterial).depthWrite = false;
  const dust = puffs(g, 8, '#c6b48c', 0.09);
  const spotter = cast(g, LOOKS.crew, { gender: 'male', seed: 46 }, -1.42, 0.62, 1.15);
  const spots: Record<string, Spot> = { thinTrees: standAt(g, 'fgThin', 0.62), forester_checkPests: standAt(g, 'fgPest', 0.62) };
  spots['*'] = spots.thinTrees;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const felling = now === 'thinTrees';
    const fall = felling ? (n.fall ?? 0) : 0;
    const eased = fall * fall;
    const lying = fall >= 0.999;
    // The tree that was left to come on takes the place of the one that's gone: it stays stood as the next round starts.
    const beat = felling ? N?.b : undefined;
    const regrowing = beat?.from === 'next';
    const up = regrowing ? (beat!.e > 0 ? 1 : beat!.u) : 0;
    if (regrowing) {
      tree.rotation.x = 0;
      tree.scale.setScalar(0.25 + 0.75 * up);
    } else {
      tree.rotation.x = -1.48 * eased;
      tree.scale.setScalar(1);
    }
    body.visible = true;
    band.visible = true;
    notch.visible = felling && (n.notch ?? 0) > 0.2 && !regrowing;
    backCut.visible = felling && (n.backCut ?? 0) > 0.3 && !regrowing;
    tree.position.y = TH.cut + (lying ? -0.02 : 0);
    at(saw, P.saw, TH.saw);
    saw.rotation.y = N && felling ? (n.sawYaw ?? Math.PI) : -Math.PI / 2;
    const buzz = (n.run ?? 0) > 0.5 ? 0.004 * Math.sin(t * 70) : 0;
    saw.rotation.z = buzz * 4;
    at(round, P.round);
    const cuts = felling ? (n.cuts ?? 0) : 1;
    kerfs.forEach((m, i) => (m.visible = cuts * 2 > i + 0.2));
    const made = felling ? (n.rounds ?? 0) : 1;
    roundsMade.forEach((m, i) => (m.visible = i < 3 || made > 0.5));
    at(spray, P.spray);
    if (felling && (n.spray ?? 0) > 0.5) band.scale.y = 0.4 + 0.6 * up;
    else band.scale.y = 1;
    const sawTip = P.saw ?? TH.saw;
    const yaw = saw.rotation.y;
    chips(n.chips ?? 0, sawTip[0] + Math.sin(yaw) * 0.32, sawTip[1] - 0.02, sawTip[2] + Math.cos(yaw) * 0.32, 0.08, t * 4, -0.26);
    exhaust(n.smoke ?? 0, sawTip[0], sawTip[1] + 0.12, sawTip[2], 0.03, t * 2, 0.34);
    dust(n.hit ?? 0, tx, 0.12, tz - 2.2, 0.8, t * 2, 0.5);
    shoutWord.visible = (n.shout ?? 0) > 0.5;
    // Checking.
    const checking = now === 'forester_checkPests';
    hole.visible = checking && (n.hole ?? 0) > 0.5;
    ribbon.visible = !checking || (n.ribbon ?? 0) > 0.5;
    twig.position.y = 1.68 - 0.14 * (n.twig ?? 0);
    at(tube, P.tube);
    at(drillBody, P.drill);
    drillBody.rotation.y = 0;
    at(card, P.card);
    at(pen, P.pen);
    if (felling) {
      const s = spotter.get();
      s.head.rotation.x = -0.1;
      s.armL((n.shout ?? 0) > 0.5 ? v3(-1.05, 1.75, 0.7) : null);
    } else spotter.hide();
  });
  out.work = marker(g, 0, 0.5, -0.4);
}

// =============================================================================================
// 산불 감시탑 (fireWatchTower, 1 × 1).

function fireTower(g: THREE.Group, out: Built) {
  const d = TW.deck;
  const STEEL_D = '#59636a';
  // Four legs splayed to concrete pads, cross-bracing, the ladder up the front and through the deck.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      rod(g, v3(sx * 0.46, 0, sz * 0.42), v3(sx * 0.36, d, sz * 0.34), 0.022, STEEL_D);
      part(g, box(0.16, 0.06, 0.16), '#a4a6a0', sx * 0.46, 0.03, sz * 0.42);
    }
  }
  for (const [a, b] of [[0.02, 0.72], [0.72, 1.46], [1.46, 2.18]] as const) {
    const e = (y: number) => 0.46 - 0.1 * (y / d);
    const f = (y: number) => 0.42 - 0.08 * (y / d);
    for (const sx of [-1, 1]) {
      rod(g, v3(sx * e(a), a, f(a)), v3(sx * e(b), b, -f(b)), 0.009, STEEL_D);
      rod(g, v3(sx * e(a), a, -f(a)), v3(sx * e(b), b, f(b)), 0.009, STEEL_D);
    }
    rod(g, v3(-e(a), a, -f(a)), v3(e(b), b, -f(b)), 0.009, STEEL_D);
    rod(g, v3(e(a), a, -f(a)), v3(-e(b), b, -f(b)), 0.009, STEEL_D);
  }
  for (const sx of [-1, 1]) rod(g, v3(sx * 0.17, 0, 0.5), v3(sx * 0.17, d + 0.92, 0.5), 0.014, '#c4c9cc');
  for (let y = 0.2; y < d + 0.1; y += 0.24) part(g, cyl(0.009, 0.009, 0.34, 6), '#dfe3e5', 0, y, 0.5, { rz: Math.PI / 2, outline: false });
  // The deck, a little wider than the legs, a rail round it open where the ladder arrives, boards on top.
  part(g, box(1.16, 0.06, 1.16), STEEL_D, 0, d - 0.03, 0);
  for (let i = 0; i < 7; i++) part(g, box(1.14, 0.012, 0.15), i % 2 ? '#a68a64' : '#9a7d58', 0, d + 0.006, -0.48 + i * 0.16, { outline: false, shadow: false });
  for (const [x, z] of [[-0.56, -0.56], [0.56, -0.56], [-0.56, 0.56], [0.56, 0.56]] as const) part(g, box(0.04, 1.86, 0.04), '#e3dfd2', x, d + 0.93, z);
  for (const y of [0.5, 0.98]) {
    part(g, box(1.14, 0.03, 0.03), '#e3dfd2', 0, d + y, -0.56, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, box(0.03, 0.03, 1.14), '#e3dfd2', sx * 0.56, d + y, 0, { outline: false });
      part(g, box(0.3, 0.03, 0.03), '#e3dfd2', sx * 0.42, d + y, 0.56, { outline: false });
    }
  }
  part(g, box(1.14, 0.3, 0.018), RED, 0, d + 0.26, -0.56, { outline: false });
  label(g, `${HILL} 3호 감시탑`, 0.5, 0.11, 0.0, d + 1.06, -0.55, '#fafafa', RED);
  // The roof: green, shallow, small enough to see who's under it from the lot.
  const roof = part(g, new THREE.ConeGeometry(0.92, 0.34, 4), '#3f7341', 0, d + 2.05, 0, { ry: Math.PI / 4 });
  roof.userData.ownGeometry = true;
  part(g, cyl(0.012, 0.012, 0.62, 6), STEEL_D, 0.44, d + 2.3, 0.44, { outline: false });
  // The wind sock, the fire finder, its plate of bearings, a logbook.
  const sock = group(g, 0.44, d + 2.55, 0.44);
  for (let i = 0; i < 4; i++) part(sock, cyl(0.05 - i * 0.008, 0.055 - i * 0.008, 0.08, 8), i % 2 ? '#fafafa' : ORANGE, 0.05 + i * 0.08, 0, 0, { rz: Math.PI / 2, outline: false });
  const F = TW.finder;
  part(g, cyl(0.03, 0.05, F[1] - d - 0.04, 8), STEEL_D, F[0], (F[1] + d) / 2 - 0.02, F[2]);
  part(g, cyl(0.16, 0.16, 0.022, 20), '#f4efdf', F[0], F[1] - 0.02, F[2]);
  const finder = group(g, F[0], F[1], F[2]);
  part(finder, box(0.03, 0.008, 0.3), '#6d4c41', 0, 0.002, 0, { outline: false });
  part(finder, box(0.006, 0.05, 0.006), BLACK, 0, 0.03, 0.14, { outline: false });
  part(finder, box(0.03, 0.05, 0.004), BLACK, 0, 0.03, -0.14, { outline: false });
  part(g, rbox(0.2, 0.024, 0.14, 0.006), '#37474f', -0.34, d + 0.98 + 0.015, -0.48);
  // Foot: a sign and a closed cabinet, the drill's folding table and map only when it's going on.
  label(g, '산불 감시탑 · 관계자 외 출입 금지', 0.5, 0.1, 0, 1.04, 0.44, '#fff8e1', INK);
  part(g, box(0.05, 0.56, 0.05), STEEL_D, 0.4, 0.28, -0.1);
  part(g, rbox(0.24, 0.3, 0.14, 0.01), '#607d8b', 0.4, 0.5, -0.1);
  const table = group(g, TW.table[0], 0, TW.table[2]);
  part(table, box(0.68, 0.03, 0.94), '#e8e0cc', 0, TW.table[1] - 0.015, 0);
  for (const x of [-0.28, 0.28]) rod(table, v3(x, 0, -0.4), v3(x, TW.table[1] - 0.03, 0.4), 0.012, CHROME);
  for (const x of [-0.28, 0.28]) rod(table, v3(x, 0, 0.4), v3(x, TW.table[1] - 0.03, -0.4), 0.012, CHROME);
  const map = picture(table, painted('fgDrillMap', 256, 340, (c) => {
    c.fillStyle = '#dcebc8';
    c.fillRect(0, 0, 256, 340);
    c.strokeStyle = '#8ba86f';
    c.lineWidth = 2;
    for (let i = 1; i < 8; i++) {
      c.beginPath();
      c.ellipse(120, 170, 16 * i + 6, 22 * i + 6, 0.4, 0, Math.PI * 2);
      c.stroke();
    }
    text(c, `${HILL} 산불 훈련도`, 128, 20, 18, INK, 'center');
    c.strokeStyle = '#6d4c41';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(20, 320);
    c.bezierCurveTo(70, 240, 90, 160, 210, 90);
    c.stroke();
  }), 0.62, 0.84, 0, TW.table[1] + 0.006, 0, '#ffffff', Math.PI / 2, -Math.PI / 2);
  const fireLines = [0, 1, 2].map((i) => part(table, box(0.012, 0.002, 0.26 - i * 0.03), RED, 0.1 - i * 0.1, TW.table[1] + 0.008, 0.08 * (i - 1), { ry: 0.5 + i * 0.3, outline: false, shadow: false }));
  const pen = penMesh(g);
  const radio = radioMesh(g);
  const bino = group(g);
  for (const sx of [-1, 1]) part(bino, cyl(0.022, 0.026, 0.1, 10), BLACK, sx * 0.03, 0, 0, { rx: Math.PI / 2, outline: false });
  // A thread of smoke far off, seen through the glasses.
  const farSmoke = puffs(g, 7, '#d8d4c8', 0.16);
  const crew = [cast(g, LOOKS.chief, { gender: 'female', seed: 48 }, TW.crew[0], TW.crew[1], 1.1), cast(g, LOOKS.crew2, { gender: 'male', seed: 49 }, TW.crew[0] + 0.1, TW.crew[1] + 0.82, 2.2)];
  const spots: Record<string, Spot> = { watchForFire: standAt(g, 'fgWatch', 0.74), forester_planFireDrill: standAt(g, 'fgDrill', 0.74) };
  spots['*'] = spots.watchForFire;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    sock.rotation.y = 0.5 * Math.sin(t * 0.3);
    sock.rotation.z = 0.08 * Math.sin(t * 2.3);
    finder.rotation.y = n.sight ?? 0;
    at(bino, P.bino);
    if (P.bino) bino.rotation.y = N?.st.yaw ?? 0;
    at(radio, P.radio);
    at(pen, P.pen);
    farSmoke(now === 'watchForFire' ? (n.smoke ?? 0) : 0, TW.smoke[0], TW.smoke[1], TW.smoke[2], 0.1, t * 0.6, 1.3);
    const drill = now === 'forester_planFireDrill';
    table.visible = drill;
    map.scale.z = Math.max(0.02, n.map ?? 0);
    fireLines.forEach((m, i) => (m.visible = (n.lines ?? 0) * 3 > i + 0.1));
    crew.forEach((c, i) => {
      if (!drill) {
        c.hide();
        return;
      }
      const f = c.get();
      f.head.rotation.x = (n.crewNod ?? 0) > 0.5 ? 0.18 + 0.1 * Math.sin(t * 5 + i) : 0.25;
      f.armR(i === 0 && (n.ptr ?? 0) > 0.5 ? v3(TW.table[0] - 0.05, TW.table[1] + 0.1, TW.table[2] - 0.1) : null);
    });
  });
  out.work = marker(g, 0, 0.9, 0.4);
}

// =============================================================================================
// 숲길 안내판 (trailSign, 1 × 1).

function trailSign(g: THREE.Group, out: Built) {
  // A board on two posts under a shingle roof; low, so what's behind it stays in sight.
  for (const x of [-0.42, 0.26]) part(g, box(0.06, 1.32, 0.06), WOOD_D, x, 0.66, 0.02);
  part(g, rbox(0.74, 0.56, 0.04, 0.012), WOOD, -0.08, TS.board[1], 0.02);
  const bm = picture(g, painted('fgTrail', 256, 192, (c) => {
    c.fillStyle = '#eef3dc';
    c.fillRect(0, 0, 256, 192);
    c.strokeStyle = '#bdcfa2';
    for (let i = 1; i < 6; i++) {
      c.beginPath();
      c.ellipse(170, 80, 24 * i, 16 * i, -0.3, 0, Math.PI * 2);
      c.stroke();
    }
    text(c, `${HILL} 숲길`, 128, 18, 21, INK, 'center');
    ([[RED, [[24, 170], [70, 130], [110, 120], [170, 80]]], ['#1976d2', [[24, 170], [90, 165], [160, 150], [226, 110]]]] as const).forEach(([col, pts]) => {
      c.strokeStyle = col;
      c.lineWidth = 4;
      c.setLineDash([9, 5]);
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
      c.setLineDash([]);
    });
    text(c, '전망대', 170, 62, 15, INK, 'center');
    text(c, '약수터', 226, 96, 14, INK, 'center');
    c.fillStyle = RED;
    c.beginPath();
    c.arc(24, 170, 6, 0, Math.PI * 2);
    c.fill();
    text(c, '현 위치', 54, 182, 13, INK, 'center');
  }), 0.68, 0.5, -0.08, TS.board[1], 0.045);
  const roof = part(g, box(0.84, 0.04, 0.32), '#5a4a3e', -0.08, 1.3, 0.02, { rx: 0.25 });
  roof.castShadow = true;
  // The fingerpost: two arrows, one of them worn until it's repainted.
  part(g, cyl(0.035, 0.042, 1.42, 8), BARK_D, TS.foot[0], 0.71, 0.08);
  part(g, cyl(0.07, 0.09, 0.08, 8), '#7f7a6d', TS.foot[0], 0.04, 0.08);
  const finger = (y: number, s: string, flip: number) => {
    const f = group(g, TS.foot[0], y, 0.12);
    part(f, box(0.46, 0.1, 0.022), '#e9dcb9', flip * 0.2, 0, 0);
    part(f, cyl(0.002, 0.06, 0.05, 3), '#e9dcb9', flip * 0.45, 0, 0, { rz: -flip * Math.PI / 2, outline: false });
    label(f, s, 0.38, 0.07, flip * 0.19, 0, 0.012, '#e9dcb9', INK);
    return f;
  };
  finger(1.1, '약수터 1.1 km', 1);
  finger(TS.arrow[1], '전망대 2.4 km', -1);
  const fresh = part(g, box(0.34, 0.016, 0.003), GREEN, TS.foot[0] - 0.2, TS.arrow[1] - 0.042, 0.135, { outline: false });
  // The weeds round the foot; the brush, the mallet, a tin; a little kit bag on the floor.
  const weeds = group(g);
  const W_G = new THREE.ConeGeometry(0.05, 0.22, 6);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(W_G, toon(i % 2 ? '#6c8f45' : '#7fa04f'));
    m.position.set(TS.weeds[0] + 0.14 * Math.cos(i * 1.7), 0.1, TS.weeds[2] + 0.1 * Math.sin(i * 1.7));
    weeds.add(m);
  }
  part(g, rbox(0.26, 0.15, 0.16, 0.03), '#5d6d3f', TS.kit[0], 0.075, TS.kit[2] - 0.08);
  const brush = group(g);
  part(brush, box(0.13, 0.02, 0.04), WOOD_D, 0, 0.02, 0, { outline: false });
  part(brush, box(0.12, 0.03, 0.03), '#bda06e', 0, -0.005, 0, { outline: false });
  const pbrush = group(g);
  part(pbrush, cyl(0.006, 0.008, 0.14, 6), WOOD_D, 0.02, 0.05, 0, { rz: -0.4, outline: false });
  part(pbrush, cyl(0.012, 0.006, 0.03, 6), GREEN, -0.02, -0.02, 0, { rz: -0.4, outline: false });
  const tin = group(g);
  part(tin, cyl(0.04, 0.04, 0.06, 10), '#b0bec5', 0, 0, 0, { outline: false });
  const mallet = group(g);
  part(mallet, cyl(0.009, 0.01, 0.22, 6), WOOD_D, 0, -0.08, 0.03, { outline: false });
  part(mallet, rbox(0.14, 0.06, 0.06, 0.012), '#8d6e4a', 0, 0.03, 0.03, { outline: false });
  const dustP = puffs(g, 6, '#d8cfae', 0.03);
  const smallSprig = group(g);
  part(smallSprig, cyl(0.004, 0.005, 0.1, 5), BARK, 0, -0.03, 0, { outline: false });
  part(smallSprig, new THREE.ConeGeometry(0.03, 0.09, 7), NEEDLE_L, 0, 0.05, 0, { outline: false });
  const card = cardMesh(g, cardTex('Trail', '숲길 점검표', ['안내판 먼지', '화살표 칠', '기둥 흔들림', '풀 베기']));
  const pen = penMesh(g);
  const walkers = [cast(g, LOOKS.walkerA, { gender: 'female', seed: 52 }, TS.v1[0], TS.v1[1], Math.PI + 0.4), cast(g, LOOKS.walkerB, { gender: 'male', seed: 53 }, TS.v2[0], TS.v2[1], Math.PI - 0.4)];
  const spots: Record<string, Spot> = { maintainTrail: standAt(g, 'fgTrail', TS.stand), forester_guideForest: standAt(g, 'fgGuide', TS.stand) };
  spots['*'] = spots.maintainTrail;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const fix = now === 'maintainTrail';
    (bm.material as THREE.MeshBasicMaterial).color.setScalar(fix ? 0.72 + 0.28 * (n.clean ?? 0) : 1);
    fresh.scale.x = Math.max(0.01, fix ? (n.paint ?? 0) : 1);
    fresh.position.x = TS.foot[0] - 0.2 * (fix ? 0.5 + 0.5 * (n.paint ?? 0) : 1);
    weeds.scale.setScalar(fix ? Math.max(0.01, n.weeds ?? 0) : 1);
    at(brush, P.brush);
    at(pbrush, P.pbrush);
    at(tin, P.tin);
    at(mallet, P.mallet);
    dustP(n.dust ?? 0, P.brush?.[0] ?? 0, P.brush?.[1] ?? 1, (P.brush?.[2] ?? 0) + 0.04, 0.04, t * 3, -0.26);
    at(smallSprig, P.sprig);
    at(card, P.card);
    at(pen, P.pen);
    walkers.forEach((w, i) => {
      if (now !== 'forester_guideForest') {
        w.hide();
        return;
      }
      const f = w.get();
      const b = n.breathe ?? 0;
      const sx = i === 0 ? TS.v1 : TS.v2;
      const up = (b: number, s: number) => v3(sx[0] + s * (0.3 + 0.12 * b), 0.84 + 0.8 * b, sx[1] + 0.06);
      const breathing = b > 0.02;
      f.armL(breathing ? up(b, -1) : null);
      f.armR(breathing ? up(b, 1) : (n.show ?? 0) > 0.5 && i === 0 ? v3(TS.board[0] - 0.1, 1.3, TS.board[2] + 0.5) : null);
      f.head.rotation.x = -0.14 * b + ((n.sprig ?? 0) > 0.5 ? 0.1 : 0);
      f.head.rotation.y = (n.show ?? 0) > 0.5 ? 0 : 0.1 * Math.sin(t * 0.5 + i);
    });
  });
  out.work = marker(g, 0, 0.96, 0.2);
}

// =============================================================================================
// 산림 진화 차량 (forestTruck, 2 × 1): stays put while it's checked; off on a call it drives away and backs in again.

function forestTruck(g: THREE.Group, out: Built) {
  const truck = group(g);
  const R = '#d32f2f';
  const WHITE = '#f6f6f2';
  part(truck, rbox(1.88, 0.14, 0.84, 0.03), INK, 0, 0.31, 0);
  // The cab on the right, the bed on the left with sides.
  part(truck, rbox(0.8, 0.34, 0.84, 0.04), R, 0.55, 0.56, 0);
  part(truck, rbox(0.54, 0.46, 0.8, 0.04), R, 0.42, 0.94, 0);
  const glass = new THREE.MeshBasicMaterial({ color: '#9dd3e4' });
  part(truck, box(0.32, 0.26, 0.81), '#9dd3e4', 0.46, 1.0, 0, { material: glass, outline: false }).userData.ownMaterial = true;
  part(truck, box(0.012, 0.3, 0.66), '#9dd3e4', 0.69, 1.0, 0, { material: glass, outline: false }).userData.ownMaterial = true;
  part(truck, rbox(0.56, 0.05, 0.8, 0.015), WHITE, 0.42, 1.18, 0);
  label(truck, '산림 진화', 0.34, 0.1, 0.56, 0.62, 0.428, R, '#ffffff');
  part(truck, rbox(0.04, 0.12, 0.78, 0.015), INK, 0.96, 0.44, 0);
  for (const z of [-0.28, 0.28]) part(truck, box(0.018, 0.1, 0.16), '#fff3c6', 0.955, 0.62, z);
  part(truck, box(1.0, 0.25, 0.04), WHITE, -0.42, 0.56, 0.41);
  part(truck, box(1.0, 0.25, 0.04), WHITE, -0.42, 0.56, -0.41);
  part(truck, box(0.04, 0.25, 0.8), WHITE, -0.9, 0.56, 0);
  part(truck, box(1.0, 0.07, 0.042), R, -0.42, 0.56, 0.412, { outline: false });
  // The tank with its gauge, the reel with its hose, a pair of backpack pumps, rakes strapped along the side.
  part(truck, rbox(0.56, 0.5, 0.66, 0.08), '#fafafa', -0.56, 0.86, -0.02);
  part(truck, box(0.57, 0.04, 0.67), R, -0.56, 0.98, -0.02, { outline: false });
  label(truck, '물 800 L', 0.28, 0.08, -0.62, 0.8, 0.312, '#fafafa', R);
  const gaugePipe = part(truck, cyl(0.012, 0.012, 0.16, 6), STEEL, FT.gauge[0], FT.gauge[1] - 0.04, 0.38, { rx: Math.PI / 2, outline: false });
  gaugePipe.castShadow = false;
  part(truck, cyl(0.046, 0.046, 0.016, 16), '#fafafa', FT.gauge[0], FT.gauge[1], FT.gauge[2], { rx: Math.PI / 2 });
  const needle = group(truck, FT.gauge[0], FT.gauge[1], FT.gauge[2] + 0.01);
  part(needle, box(0.006, 0.036, 0.002), RED, 0, 0.016, 0, { outline: false });
  const reel = group(truck, FT.reel[0], FT.reel[1], FT.reel[2] - 0.22);
  for (const dz of [-0.09, 0.09]) part(reel, cyl(0.15, 0.15, 0.012, 18), '#ffa000', 0, 0, dz, { rx: Math.PI / 2 });
  part(reel, cyl(0.1, 0.1, 0.17, 18), '#ad1457', 0, 0, 0, { rx: Math.PI / 2 });
  part(reel, box(0.012, 0.09, 0.012), INK, 0.1, 0, 0.1, { outline: false });
  rod(truck, v3(FT.nozzleHome[0], FT.nozzleHome[1] - 0.08, 0.42), v3(FT.nozzleHome[0], FT.nozzleHome[1] - 0.02, 0.46), 0.01, CHROME);
  for (let i = 0; i < 3; i++) rod(truck, v3(-0.84, 0.74 + i * 0.015, 0.45), v3(0.0, 0.72 + i * 0.015, 0.45), 0.007, '#c8a56f');
  part(truck, rbox(0.14, 0.24, 0.1, 0.02), ORANGE, 0.0, 0.84, -0.26);
  part(truck, rbox(0.14, 0.24, 0.1, 0.02), ORANGE, 0.0, 0.84, 0.1);
  // A beacon bar on the cab; the wheels.
  part(truck, box(0.08, 0.02, 0.5), BLACK, 0.42, 1.21, 0, { outline: false });
  const beacons = [-0.18, 0.18].map((z) => ownLit(truck, ball(0.05), '#6b1a14', 0.42, 1.26, z));
  const wheels: THREE.Object3D[] = [];
  for (const x of [-0.58, 0.58]) for (const z of [-0.43, 0.43]) {
    const w = group(truck, x, 0.24, z);
    part(w, cyl(0.22, 0.22, 0.1, 22), '#23272b', 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.11, 0.11, 0.105, 14), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
    part(w, box(0.03, 0.17, 0.11), INK, 0, 0, 0, { outline: false });
    wheels.push(w);
  }
  label(truck, '솔재 72', 0.2, 0.06, 0.92, 0.38, 0.3, '#fffde7', INK, Math.PI / 2);
  const driver = group(truck, 0.42, 0.78, 0.17, Math.PI / 2);
  part(driver, rbox(0.24, 0.3, 0.16, 0.05), '#d84315', 0, 0.14, 0);
  part(driver, ball(0.095), SKIN, 0, 0.38, 0);
  part(driver, ball(0.1), ORANGE, 0, 0.41, -0.01);
  driver.visible = false;
  // In the hands: the nozzle on its hose, the mist, the card.
  const nozzle = group(g);
  part(nozzle, cyl(0.016, 0.025, 0.14, 8), RED, 0, 0, 0.04, { rx: Math.PI / 2, outline: false });
  const hose = limb(g, 0.014, '#ad1457');
  const hoseEnd = new THREE.Vector3();
  const hoseFrom = v3(FT.reel[0], FT.reel[1] - 0.1, FT.reel[2] - 0.1);
  const mist = puffs(g, 9, '#d8f0ff', 0.04);
  const card = cardMesh(g, cardTex('Truck', '차량 점검표', ['수량 게이지', '호스 · 관창', '타이어', '경광등']));
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { fgCheckTruck: standAt(g, 'fgTruck', FT.stand), wildfireCall: standAt(g, 'fgTruck', FT.stand) };
  spots['*'] = spots.fgCheckTruck;
  let state: 'parked' | 'ready' | 'leaving' | 'gone' | 'back' = 'parked';
  let since = 0;
  let travel = 0;
  let returnFrom = 1;
  drive(g, out, spots, (_now, N, t, gone) => {
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
    }
    truck.position.x = travel * 16;
    truck.visible = state !== 'gone';
    const moving = state === 'leaving' || state === 'back';
    if (moving) wheels.forEach((w) => (w.rotation.z = -travel * 60));
    driver.visible = state !== 'parked';
    const flash = state !== 'parked' && Math.sin(t * 12) > 0;
    beacons.forEach((b, i) => (b.material as THREE.MeshBasicMaterial).color.set((flash ? i === 0 : i === 1) && state !== 'parked' ? '#ff5240' : '#6b1a14'));
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    needle.rotation.z = -0.5 - 0.6 * (N ? 0.5 + 0.1 * Math.sin(t * 2) : 1);
    reel.rotation.z = -(n.hose ?? 0) * 7 - (n.turn ?? 0) * 6;
    at(nozzle, P.nozzle);
    hoseEnd.set(P.nozzle?.[0] ?? 0, P.nozzle?.[1] ?? 0, P.nozzle?.[2] ?? 0);
    const hoseShown = !!P.nozzle && !gone;
    if (hoseShown) hose(hoseFrom, hoseEnd);
    else hose(hoseFrom, hoseFrom.clone().add(UP.clone().multiplyScalar(0.001)));
    const fw = N?.st.yaw ?? 0;
    const nz = P.nozzle ?? add(FT.nozzleHome, 0, 0, 0);
    mist(n.spray ?? 0, nz[0] + Math.sin(fw) * 0.5, nz[1], nz[2] + Math.cos(fw) * 0.5, 0.16, t * 3, -0.28);
    at(card, P.card);
    at(pen, P.pen);
  });
  out.work = marker(g, 0, 0.9, 0.4);
}

// =============================================================================================
// 표준지 측정목 (fgMeasure, 2 × 1).

function measureTree(g: THREE.Group, out: Built) {
  const [x, z] = MS.tree;
  pine(g, x, z, 3.0);
  part(g, cyl(0.12, 0.13, 0.02, 12), BARK_D, x, 0.01, z, { outline: false });
  // The tag nailed at breast height, a painted line, the plot's stakes and rope.
  part(g, box(0.1, 0.08, 0.006), '#fafafa', x, 1.36, z + 0.08, { outline: false });
  label(g, 'No. 27', 0.09, 0.05, x, 1.36, z + 0.086, '#fafafa', INK);
  part(g, cyl(0.1, 0.1, 0.012, 12), '#fafafa', x, MS.dbh, z, { outline: false });
  const stakes = [[-0.94, -0.4], [0.96, -0.4], [0.96, 0.4], [-0.94, 0.4]] as const;
  stakes.forEach(([a, b], i) => {
    part(g, box(0.035, 0.44, 0.035), '#fafafa', a, 0.22, b);
    part(g, box(0.038, 0.06, 0.038), RED, a, 0.4, b, { outline: false });
    const [c, d] = stakes[(i + 1) % 4];
    rod(g, v3(a, 0.36, b), v3(c, 0.36, d), 0.004, '#fbc02d');
  });
  // A small table: a diameter tape on a card, the calliper, a clinometer in its case, the plot sheet.
  const T = MS.table;
  part(g, box(0.78, 0.03, 0.46), '#c7a26f', T[0], T[1] - 0.015, T[2]);
  for (const a of [-0.34, 0.34]) for (const b of [-0.18, 0.18]) part(g, box(0.03, T[1] - 0.03, 0.03), WOOD_D, T[0] + a, (T[1] - 0.03) / 2, T[2] + b);
  const tapeHome = group(g, MS.tape[0], MS.tape[1], MS.tape[2]);
  const tapeMesh = (r: THREE.Object3D) => part(r, cyl(0.046, 0.046, 0.03, 16), '#fbc02d', 0, 0, 0);
  tapeMesh(tapeHome);
  const scopeHome = group(g, MS.scope[0], MS.scope[1], MS.scope[2]);
  const scopeMesh = (r: THREE.Object3D) => {
    part(r, rbox(0.05, 0.05, 0.1, 0.008), '#37474f', 0, 0, 0, { outline: false });
    part(r, cyl(0.012, 0.012, 0.03, 8), BLACK, 0, 0, 0.06, { rx: Math.PI / 2, outline: false });
  };
  scopeMesh(scopeHome);
  // The calliper, big enough to read as itself.
  const cal = group(g, T[0] - 0.14, T[1] + 0.012, T[2] + 0.13);
  part(cal, box(0.46, 0.012, 0.026), STEEL, 0, 0, 0, { outline: false });
  for (const dx of [-0.22, 0.04]) part(cal, box(0.02, 0.012, 0.16), STEEL, dx, 0, 0.09, { outline: false });
  picture(g, painted('fgPlot', 128, 96, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 96);
    text(c, '표준지 12-4', 64, 14, 14, INK, 'center');
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#90a4ae';
      c.fillRect(10, 32 + i * 14, 108, 2);
    }
  }), 0.24, 0.17, T[0] + 0.24, T[1] + 0.003, T[2] + 0.08, '#ffffff', 0, -Math.PI / 2);
  // In use: the tape round the trunk with its number, the instruments.
  const band = part(g, cyl(0.106, 0.106, 0.018, 16), '#fbc02d', x, MS.dbh + 0.02, z, { outline: false });
  const reading = picture(g, painted('fgDbh', 128, 40, (c) => {
    c.fillStyle = '#fff59d';
    c.fillRect(0, 0, 128, 40);
    text(c, '흉고 28 cm', 64, 20, 22, INK, 'center');
  }), 0.2, 0.06, x, MS.dbh + 0.13, z + 0.15);
  const tape = group(g);
  tapeMesh(tape);
  const scope = group(g);
  scopeMesh(scope);
  const sightLine = part(g, box(0.004, 0.004, 1), '#e53935', 0, 0, 0, { outline: false, shadow: false });
  const card = cardMesh(g, cardTex('Measure', '측정 야장', ['No. 27 소나무', '흉고 28 cm', '수고 17 m', '수관 양호']));
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { fgMeasureTree: standAt(g, 'fgMeasure', 0.66) };
  spots['*'] = spots.fgMeasureTree;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    band.visible = (n.band ?? 0) > 0.5;
    reading.visible = (n.num ?? 0) > 0.4 && (n.band ?? 0) > 0.05;
    tapeHome.visible = !P.tape && (n.band ?? 0) < 0.05;
    at(tape, P.tape);
    scopeHome.visible = !P.scope;
    at(scope, P.scope);
    if (P.scope && N) {
      scope.rotation.y = N.st.yaw;
      const dst = N.key.nod !== undefined && N.key.nod < 0 ? 2.8 : 0.04;
      a.set(P.scope[0], P.scope[1], P.scope[2]);
      b.set(x, dst, z);
      sightLine.visible = true;
      sightLine.position.copy(a).add(b).multiplyScalar(0.5);
      sightLine.scale.z = a.distanceTo(b);
      sightLine.lookAt(g.localToWorld(b.clone()));
    } else sightLine.visible = false;
    at(card, P.card);
    at(pen, P.pen);
  });
  out.work = marker(g, 0, 1.0, -0.1);
}

// =============================================================================================
// 재선충 트랩 (fgPineTrap, 2 × 1).

function pineTrap(g: THREE.Group, out: Built) {
  const [tx, tz] = TP.tree;
  pine(g, tx, tz, 2.9);
  // An arm off the trunk, then a stack of black funnels with the lure hung in them.
  rod(g, v3(tx, 1.62, tz), v3(TP.hook[0], TP.hook[1] + 0.06, TP.z), 0.012, '#607d8b');
  const x = TP.hook[0];
  for (let i = 0; i < 6; i++) {
    const m = part(g, new THREE.ConeGeometry(0.1, 0.1, 14, 1, true), '#1d1f22', x, TP.hook[1] - 0.05 - i * 0.092, TP.z, { rx: Math.PI, outline: false });
    m.userData.ownGeometry = true;
    (m.material as THREE.Material).side = THREE.DoubleSide;
  }
  part(g, cyl(0.004, 0.004, 0.56, 5), '#90a4ae', x, TP.hook[1] - 0.26, TP.z, { outline: false });
  part(g, rbox(0.05, 0.08, 0.02, 0.006), '#f7e394', x + 0.015, TP.hook[1] - 0.15, TP.z + 0.018, { outline: false });
  label(g, '솔재 트랩 B-07', 0.26, 0.08, tx - 0.04, 1.38, tz + 0.1, '#fff8e1', INK);
  // The cup under the funnels; beetles in it.
  const cupMesh = (r: THREE.Object3D) => part(r, cyl(0.055, 0.045, 0.1, 12), '#e3e7e8', 0, 0, 0);
  const cup = group(g, TP.cup[0], TP.cup[1], TP.cup[2]);
  cupMesh(cup);
  const inCup = group(cup, 0, 0.05, 0);
  for (let i = 0; i < 4; i++) part(inCup, cyl(0.009, 0.009, 0.022, 5), '#2a1c14', 0.024 * Math.cos(i * 1.6), 0, 0.024 * Math.sin(i * 1.6), { rz: Math.PI / 2, outline: false });
  // The sample table; a white tray where the beetles are tipped, a lens, vials in a rack, a cold box under it.
  const T = TP.tray;
  part(g, box(0.92, 0.03, 0.5), '#b9bdb7', T[0] - 0.02, T[1] - 0.015, T[2]);
  for (const a of [-0.42, 0.38]) for (const b of [-0.2, 0.2]) part(g, box(0.03, T[1] - 0.03, 0.03), '#6f7a80', T[0] + a, (T[1] - 0.03) / 2, T[2] + b);
  part(g, box(0.36, 0.016, 0.26), '#fbfbf8', T[0], T[1] + 0.008, T[2]);
  const bugs = Array.from({ length: 8 }, (_, i) => part(g, cyl(0.008, 0.008, 0.022, 5), '#2a1c14', T[0] - 0.12 + (i % 4) * 0.08, T[1] + 0.024, T[2] - 0.08 + Math.floor(i / 4) * 0.15 + 0.02 * Math.sin(i * 2), { rz: Math.PI / 2, ry: i, outline: false, shadow: false }));
  const lens = group(g, TP.glass[0], TP.glass[1], TP.glass[2]);
  const lensMesh = (r: THREE.Object3D) => {
    torus(r, 0.05, 0.006, BLACK, 0, 0, 0, { rx: Math.PI / 2 });
    part(r, cyl(0.046, 0.046, 0.002, 14), '#c3e4ef', 0, 0, 0, { outline: false });
    part(r, cyl(0.006, 0.007, 0.08, 6), BLACK, 0.09, 0, 0, { rz: Math.PI / 2, outline: false });
  };
  lensMesh(lens);
  const held = group(g);
  lensMesh(held);
  part(g, rbox(0.14, 0.05, 0.05, 0.008), WOOD, T[0] + 0.32, T[1] + 0.025, T[2] - 0.15);
  for (let i = 0; i < 5; i++) part(g, cyl(0.011, 0.011, 0.07, 7), '#e4f2f5', T[0] + 0.27 + i * 0.026, T[1] + 0.07, T[2] - 0.15, { outline: false });
  part(g, rbox(0.34, 0.24, 0.24, 0.03), '#2f7fb8', TP.cooler[0], 0.12, TP.cooler[2] - 0.08);
  part(g, box(0.35, 0.03, 0.25), '#fafafa', TP.cooler[0], 0.22, TP.cooler[2] - 0.08, { outline: false });
  label(g, '시료 · 냉장', 0.22, 0.06, TP.cooler[0], 0.12, TP.cooler[2] + 0.041, '#2f7fb8', '#ffffff');
  const tweezer = group(g);
  part(tweezer, box(0.006, 0.006, 0.1), STEEL, 0, 0, 0, { rx: 0.5, outline: false });
  const card = cardMesh(g, cardTex('Trap', '매개충 조사', ['트랩 B-07', '솔수염하늘소', '합계 __ 마리', '시료 보관']));
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { fgCheckTrap: standAt(g, 'fgTrap', 0.64) };
  spots['*'] = spots.fgCheckTrap;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(cup, P.cup, TP.cup);
    cup.rotation.z = (n.tilt ?? 0) * 1.8;
    inCup.visible = N ? (n.inCup ?? 0) > 0.3 : true;
    const c = n.counted ?? 0;
    bugs.forEach((m, i) => {
      m.visible = (n.bugs ?? 0) > 0.5 && (i / bugs.length) >= c * 0.5;
    });
    lens.visible = !P.glass;
    at(held, P.glass);
    at(tweezer, P.tweezer);
    at(card, P.card);
    at(pen, P.pen);
  });
  out.work = marker(g, 0, 0.6, 0.1);
}

// =============================================================================================
// 산불 장비 창고 (fgFireShed, 2 × 1).

function pumpMesh(r: THREE.Object3D) {
  part(r, rbox(0.24, 0.38, 0.14, 0.04), ORANGE, 0, 0, 0);
  part(r, cyl(0.04, 0.04, 0.03, 10), '#fafafa', 0, 0.2, 0, { outline: false });
  for (const sx of [-1, 1]) part(r, box(0.03, 0.34, 0.01), BLACK, sx * 0.08, 0, 0.074, { outline: false });
}
function fireShed(g: THREE.Group, out: Built) {
  // Board walls, a corrugated roof, a sign; what's inside hung on the back and sides.
  part(g, box(1.94, 0.05, 0.82), '#8b8678', 0, 0.025, 0);
  const W = 1.92;
  const H = 1.86;
  for (const sx of [-1, 1]) part(g, box(0.05, H, 0.74), '#7a5a3a', sx * (W / 2 - 0.025), H / 2 + 0.05, -0.02);
  part(g, box(W, H, 0.04), '#6d4c34', 0, H / 2 + 0.05, -0.38);
  for (let i = 0; i < 10; i++) part(g, box(0.008, H, 0.042), '#5a3e2a', -0.86 + i * 0.19, H / 2 + 0.05, -0.378, { outline: false, shadow: false });
  part(g, box(2.1, 0.05, 1.0), '#99a2a6', 0, H + 0.14, 0.02, { rx: 0.12 });
  for (let i = 0; i < 12; i++) part(g, box(0.02, 0.02, 1.0), '#7c8589', -1.0 + i * 0.18, H + 0.17, 0.02, { rx: 0.12, outline: false, shadow: false });
  label(g, '산불 진화 장비', 0.92, 0.17, 0, H + 0.02, 0.37, '#c62828', '#ffffff');
  part(g, box(W, 0.1, 0.72), '#7a5a3a', 0, H + 0.0, -0.02);
  // A shelf; backpack pumps on the left; rakes and fire flappers on the right; shovels; helmets above.
  part(g, box(W - 0.1, 0.03, 0.34), WOOD, 0, 0.56, -0.2);
  for (const x of [-0.72, -0.42]) {
    const p = group(g, x, 0.78, -0.14);
    pumpMesh(p);
    if (x === -0.42) p.name = 'pump';
  }
  const shelfPump = g.getObjectByName('pump')!;
  for (let i = 0; i < 5; i++) {
    const x = SD.rakes[0] - 0.2 + i * 0.12;
    part(g, cyl(0.009, 0.009, 1.32, 6), '#b89466', x, 0.92, -0.26);
    if (i < 3) {
      // A rake: a fan of steel tines.
      part(g, box(0.1, 0.012, 0.016), STEEL, x, 1.56, -0.26, { outline: false });
      for (let k = 0; k < 5; k++) part(g, box(0.004, 0.05, 0.004), STEEL, x - 0.044 + k * 0.022, 1.59, -0.24, { outline: false });
    } else part(g, rbox(0.15, 0.17, 0.016, 0.02), '#37474f', x, 1.62, -0.26);
  }
  for (let i = 0; i < 4; i++) {
    const h = part(g, ball(0.09), i % 2 ? ORANGE : '#fbc02d', -0.74 + i * 0.22, 1.32, -0.2);
    h.scale.y = 0.7;
    part(g, box(0.02, 0.02, 0.1), WOOD_D, -0.74 + i * 0.22, 1.22, -0.28, { outline: false });
  }
  for (const x of [-0.08, 0.04]) {
    part(g, cyl(0.01, 0.01, 0.6, 6), '#b89466', x, 0.36, -0.24);
    part(g, rbox(0.1, 0.13, 0.012, 0.02), '#546e7a', x, 0.08, -0.24, { outline: false });
  }
  for (let i = 0; i < 3; i++) torus(g, 0.13, 0.03, '#b71c1c', 0.56 + i * 0.012, 0.17 + i * 0.05, -0.16, { rx: Math.PI / 2 });
  // The list on the post between the doors, ticked as it goes.
  const listTex = painted('fgShedList', 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, '장비 수량표', 64, 14, 14, INK, 'center');
    ['등짐펌프  8', '갈퀴  12', '불털이개  6', '삽  8', '안전모  10'].forEach((s, i) => {
      c.strokeStyle = INK;
      c.strokeRect(8, 36 + i * 26, 10, 10);
      text(c, s, 24, 41 + i * 26, 13, INK);
    });
  });
  part(g, box(0.05, 0.86, 0.05), WOOD_D, SD.list[0], 1.3, 0.34);
  picture(g, listTex, 0.17, 0.23, SD.list[0], SD.list[1], 0.39);
  const ticks = [0, 1, 2].map((i) => part(g, box(0.02, 0.012, 0.003), GREEN, SD.list[0] - 0.056, SD.list[1] + 0.05 - i * 0.04, 0.393, { rz: 0.5, outline: false, shadow: false }));
  // The doors: two leaves swung open round their hinges, shut when no one's here but with a gap; a red band.
  const door = (s: number) => {
    const h = group(g, s * (W / 2), 0.05, 0.36);
    const leaf = part(h, box(W / 2 - 0.02, H - 0.14, 0.03), '#a04030', -s * (W / 4), (H - 0.14) / 2 + 0.03, 0);
    part(leaf, box(W / 2 - 0.04, 0.14, 0.034), '#fafafa', 0, 0.1, 0, { outline: false });
    part(leaf, box(0.03, 0.14, 0.02), BLACK, -s * (W / 4 - 0.06), 0, 0.03, { outline: false });
    return h;
  };
  const leaves = [door(-1), door(1)];
  // In the hands.
  const pump = group(g);
  pumpMesh(pump);
  const wand = group(g);
  part(wand, cyl(0.012, 0.016, 0.3, 7), '#37474f', 0, 0, 0.14, { rx: Math.PI / 2, outline: false });
  const hose = limb(g, 0.01, BLACK);
  const mist = puffs(g, 10, '#d8f0ff', 0.04);
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { fgCheckGear: standAt(g, 'fgGear', SD.stand) };
  spots['*'] = spots.fgCheckGear;
  const P1 = new THREE.Vector3();
  const P2 = new THREE.Vector3();
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const open = n.open ?? 0;
    leaves.forEach((h, i) => (h.rotation.y = (i ? 1 : -1) * 1.9 * open));
    shelfPump.visible = !P.pump;
    at(pump, P.pump);
    if (P.pump && N) pump.rotation.y = N.st.yaw + Math.PI;
    at(wand, P.wand);
    if (P.wand && N) wand.rotation.y = N.st.yaw;
    if (P.wand && P.pump) {
      P1.set(P.pump[0], P.pump[1] - 0.14, P.pump[2]);
      P2.set(P.wand[0], P.wand[1], P.wand[2]);
      hose(P1, P2);
    } else hose(P1.set(0, -1, 0), P2.set(0, -1.001, 0));
    const fw = N?.st.yaw ?? 0;
    if (P.wand) mist(n.spray ?? 0, P.wand[0] + Math.sin(fw) * 0.5, P.wand[1], P.wand[2] + Math.cos(fw) * 0.5, 0.18, t * 3, -0.28);
    else mist(0, 0, 0, 0, 0, t);
    ticks.forEach((m, i) => (m.visible = (n.tick ?? 0) * 3 > i + 0.2));
    at(pen, P.pen);
  });
  out.work = marker(g, 0, 1.0, 0.1);
}

// =============================================================================================
// 순찰 현황판 (fgPatrolBoard, 2 × 1).

function patrolBoard(g: THREE.Group, out: Built) {
  for (const x of [-0.86, 0.86]) part(g, box(0.06, 1.42, 0.06), WOOD_D, x, 0.71, 0.0);
  part(g, rbox(1.86, 0.74, 0.04, 0.01), '#f4f6f4', 0, 1.04, 0.02);
  picture(g, painted('fgPatrolMap', 512, 200, (c) => {
    c.fillStyle = '#e3eed3';
    c.fillRect(0, 0, 512, 200);
    c.strokeStyle = '#a9c290';
    c.lineWidth = 2;
    for (const [x, y] of [[120, 110], [320, 90], [430, 130]]) for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.ellipse(x, y, 22 * i, 14 * i, 0.3, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = '#6d4c41';
    c.lineWidth = 2;
    c.setLineDash([8, 6]);
    for (const x of [172, 340]) {
      c.beginPath();
      c.moveTo(x, 26);
      c.lineTo(x, 196);
      c.stroke();
    }
    c.setLineDash([]);
    text(c, `${HILL} 순찰 구역`, 256, 13, 18, INK, 'center');
    ['1구역 안개골', '2구역 전망대', '3구역 약수터'].forEach((s, i) => text(c, s, 88 + i * 170, 38, 15, INK, 'center'));
  }), 1.78, 0.66, 0, 1.04, 0.043);
  const stay = ['#1976d2', '#fbc02d', '#8e24aa', '#00897b'];
  stay.forEach((col, i) => part(g, cyl(0.022, 0.022, 0.012, 10), col, -0.62 + (i % 2) * 0.1 + i * 0.3, 0.9 + (i % 2) * 0.15, 0.052, { rx: Math.PI / 2, outline: false }));
  const dangerRow = group(g, 0.66, 1.3, 0.05);
  label(dangerRow, '위험 높음', 0.3, 0.07, 0, 0, 0.002, '#ef6c00', '#ffffff');
  // Under it, a shelf: the log on the left, the radios in their charger on the right.
  part(g, box(1.76, 0.03, 0.3), WOOD, 0, 0.62, 0.06);
  part(g, rbox(0.28, 0.02, 0.2, 0.004), '#37474f', PB.log[0], 0.645, 0.08);
  picture(g, painted('fgPatrolLog', 128, 90, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 90);
    text(c, '순찰 일지', 64, 12, 13, INK, 'center');
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#90a4ae';
      c.fillRect(8, 28 + i * 14, 112, 1.5);
    }
  }), 0.25, 0.17, PB.log[0], 0.656, 0.08, '#ffffff', 0, -Math.PI / 2);
  const signed = part(g, box(0.1, 0.001, 0.05), '#5f7f99', PB.log[0] + 0.03, 0.658, 0.1, { outline: false, shadow: false });
  part(g, rbox(0.5, 0.05, 0.14, 0.012), BLACK, PB.radio[0] - 0.12, 0.66, PB.radio[2]);
  const docked = [0, 1, 2].map((i) => {
    const r = radioMesh(g);
    r.position.set(PB.radio[0] - 0.28 + i * 0.16, 0.74, PB.radio[2]);
    return r;
  });
  const leds = [0, 1, 2].map((i) => ownLit(g, ball(0.007), '#4caf50', PB.radio[0] - 0.28 + i * 0.16, 0.668, PB.radio[2] + 0.072));
  const magnet = group(g);
  part(magnet, cyl(0.024, 0.024, 0.012, 10), RED, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  const radio = radioMesh(g);
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { fgPatrol: standAt(g, 'fgPatrol', PB.stand) };
  spots['*'] = spots.fgPatrol;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(magnet, P.magnet, (n.moved ?? 0) > 0.5 ? PB.magnetTo : PB.magnet);
    at(radio, P.radio);
    docked[2].visible = !P.radio && !N;
    (leds[2].material as THREE.MeshBasicMaterial).color.set(N ? '#c62828' : '#4caf50');
    signed.visible = (n.signed ?? 0) > 0.4;
    at(pen, P.pen);
  });
  out.work = marker(g, 0, 1.0, 0.12);
}

// =============================================================================================
// 입산 신고대 (fgVisitorBoard, 2 × 1).

function visitorBoard(g: THREE.Group, out: Built) {
  // A notice under a small roof; low, by the gate; a lectern for the book; a little box of leaflets.
  for (const x of [-0.92, 0.2]) part(g, box(0.07, 1.46, 0.07), WOOD_D, x, 0.73, -0.14);
  part(g, box(1.28, 0.04, 0.44), '#5a4a3e', VB.board[0], 1.46, -0.1, { rx: 0.22 });
  part(g, rbox(1.08, 0.7, 0.04, 0.01), WOOD, VB.board[0], VB.board[1], -0.12);
  picture(g, painted('fgVisit', 384, 248, (c) => {
    c.fillStyle = '#f5f1e2';
    c.fillRect(0, 0, 384, 248);
    text(c, `${HILL} 탐방 안내`, 192, 22, 26, GREEN, 'center');
    c.fillStyle = '#dcebc8';
    c.fillRect(14, 44, 210, 188);
    c.strokeStyle = '#a9c290';
    for (let i = 1; i < 6; i++) {
      c.beginPath();
      c.ellipse(110, 130, 18 * i, 14 * i, 0.3, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = 'rgba(198,40,40,.32)';
    c.fillRect(150, 60, 70, 74);
    text(c, '입산 통제', 186, 96, 15, RED, 'center');
    text(c, '입산 신고 필수', 305, 62, 17, INK, 'center');
    ['라이터 금지', '취사 금지', '정해진 길로', '일몰 전 하산'].forEach((s, i) => text(c, `· ${s}`, 240, 100 + i * 30, 17, INK));
  }), 1.02, 0.66, VB.board[0], VB.board[1], -0.095);
  // The stand and its book.
  part(g, cyl(0.03, 0.05, 0.86, 8), WOOD_D, VB.book[0], 0.43, VB.book[2] - 0.05);
  const stand = group(g, VB.book[0], VB.book[1] - 0.04, VB.book[2]);
  stand.rotation.x = 0.28;
  part(stand, rbox(0.4, 0.024, 0.28, 0.006), WOOD, 0, 0, 0);
  part(stand, box(0.34, 0.012, 0.24), PAPER, 0, 0.016, 0, { outline: false });
  for (let i = 0; i < 5; i++) part(stand, box(0.32, 0.001, 0.003), '#90a4ae', 0, 0.023, -0.09 + i * 0.045, { outline: false, shadow: false });
  const lines = [0, 1, 2].map((i) => part(stand, box(0.16, 0.001, 0.012), '#5f7f99', -0.05, 0.024, -0.06 + i * 0.045, { outline: false, shadow: false }));
  const check = part(stand, box(0.022, 0.001, 0.012), RED, 0.13, 0.024, -0.06, { rz: 0, ry: 0.4, outline: false, shadow: false });
  part(g, rbox(0.14, 0.12, 0.1, 0.006), '#d4a84f', VB.leaflet[0], VB.leaflet[1] - 0.06, VB.leaflet[2]);
  label(g, '안내도', 0.1, 0.04, VB.leaflet[0], VB.leaflet[1] - 0.06, VB.leaflet[2] + 0.052, '#d4a84f', INK);
  part(g, cyl(0.03, 0.04, 0.78, 8), WOOD_D, VB.leaflet[0], 0.39, VB.leaflet[2]);
  const leaflet = group(g);
  part(leaflet, box(0.11, 0.006, 0.15), '#fff3c6', 0, 0, 0, { outline: false });
  const hiker = cast(g, LOOKS.hiker, { gender: 'female', seed: 57 }, VB.hiker[0], VB.hiker[1], Math.PI + 0.6);
  const spots: Record<string, Spot> = { fgSignIn: standAt(g, 'fgSignIn', VB.stand) };
  spots['*'] = spots.fgSignIn;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    lines.forEach((m, i) => (m.visible = !N || (n.lines ?? 0) * 3 > i + 0.1));
    check.visible = !N || (n.checked ?? 0) > 0.5;
    at(leaflet, P.leaflet);
    if (N) {
      const f = hiker.get();
      const w = (n.write ?? 0) > 0.5;
      f.armR(w ? v3(VB.book[0] + 0.06 + 0.06 * Math.sin(t * 6), VB.book[1] + 0.04, VB.book[2] + 0.02) : (n.hArm ?? 0) > 0.5 ? v3(VB.hiker[0] - 0.3, 1.1, VB.hiker[1] - 0.22) : null);
      f.head.rotation.x = w ? 0.4 : 0.05;
    } else hiker.hide();
  });
  out.work = marker(g, 0, 0.96, 0.2);
}

// =============================================================================================
// 관리소 책상 (fgDesk, 2 × 1).

function officeDesk(g: THREE.Group, out: Built) {
  part(g, rbox(1.94, 0.05, 0.76, 0.012), '#a7835c', 0, 0.74, -0.04);
  for (const x of [-0.92, 0.92]) part(g, box(0.05, 0.72, 0.68), WOOD_D, x, 0.36, -0.04);
  part(g, box(1.8, 0.4, 0.02), WOOD_D, 0, 0.5, -0.38);
  // The screen: the district map with its fire layers, a keyboard, the radio base, the log.
  part(g, rbox(0.68, 0.42, 0.03, 0.012), BLACK, 0.16, 1.1, -0.26);
  part(g, cyl(0.03, 0.03, 0.16, 8), BLACK, 0.16, 0.84, -0.27);
  part(g, cyl(0.1, 0.11, 0.015, 14), BLACK, 0.16, 0.77, -0.27, { outline: false });
  const screen = litScreen(g, painted('fgScreen', 256, 148, (c) => {
    c.fillStyle = '#17331d';
    c.fillRect(0, 0, 256, 148);
    c.strokeStyle = '#67a36a';
    for (let i = 1; i < 7; i++) {
      c.beginPath();
      c.ellipse(120, 80, 18 * i, 12 * i, 0.3, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = '#ff7043';
    c.beginPath();
    c.arc(88, 64, 5, 0, Math.PI * 2);
    c.fill();
    text(c, `${HILL} 관내도`, 8, 12, 15, '#e8f5e9');
    text(c, '위험도 높음 · 습도 28%', 8, 136, 13, '#ffcc80');
  }), 0.62, 0.36, 0.16, 1.1, -0.243);
  out.screen = screen;
  part(g, rbox(0.34, 0.012, 0.12, 0.004), '#37474f', DK.keys[0], 0.772, DK.keys[2]);
  // The log with a page filling up, the stamp and pad.
  part(g, box(0.36, 0.022, 0.26), '#3e5243', DK.book[0], 0.776, DK.book[2]);
  part(g, box(0.34, 0.01, 0.24), PAPER, DK.book[0], 0.79, DK.book[2], { outline: false });
  const written = part(g, box(0.14, 0.001, 0.15), '#5f7f99', DK.book[0] - 0.06, 0.796, DK.book[2], { outline: false, shadow: false });
  const mark = part(g, cyl(0.022, 0.022, 0.001, 12), RED, DK.book[0] + 0.08, 0.796, DK.book[2] + 0.04, { outline: false, shadow: false });
  part(g, rbox(0.1, 0.012, 0.07, 0.004), '#7f1d1d', DK.stamp[0], 0.772, DK.stamp[2] - 0.12);
  const stampMesh = (r: THREE.Object3D) => {
    part(r, cyl(0.02, 0.024, 0.06, 10), WOOD_D, 0, 0, 0, { outline: false });
    part(r, ball(0.018), WOOD_D, 0, 0.04, 0, { outline: false });
  };
  const stampHome = group(g, DK.stamp[0], DK.stamp[1], DK.stamp[2]);
  stampMesh(stampHome);
  const stamp = group(g);
  stampMesh(stamp);
  part(g, rbox(0.22, 0.09, 0.14, 0.012), '#37474f', DK.mic[0], 0.81, DK.mic[2] - 0.08);
  part(g, box(0.1, 0.03, 0.002), '#7fd0a0', DK.mic[0], 0.82, DK.mic[2] - 0.009, { outline: false });
  rod(g, v3(DK.mic[0] + 0.05, 0.84, DK.mic[2] - 0.08), v3(DK.mic[0] - 0.02, 0.92, DK.mic[2]), 0.006, BLACK);
  part(g, rbox(0.04, 0.07, 0.03, 0.01), BLACK, DK.mic[0] - 0.02, 0.92, DK.mic[2], { outline: false });
  // A small bonsai pine, a pot of pens, a lamp, a cone on a paperweight.
  part(g, cyl(0.07, 0.05, 0.05, 10), '#8d6e4a', -0.8, 0.79, -0.26);
  pine(g, -0.8, -0.26, 0.26, NEEDLE, 0.8);
  part(g, cyl(0.035, 0.03, 0.09, 10), '#90a4ae', -0.18, 0.81, -0.26, { outline: false });
  for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.13, 5), ['#1976d2', RED, GREEN][i], -0.2 + i * 0.02, 0.87, -0.26, { outline: false });
  part(g, cyl(0.06, 0.07, 0.02, 12), BLACK, 0.72, 0.775, -0.3, { outline: false });
  rod(g, v3(0.72, 0.78, -0.3), v3(0.6, 1.2, -0.28), 0.008, BLACK);
  rod(g, v3(0.6, 1.2, -0.28), v3(0.46, 1.16, -0.14), 0.008, BLACK);
  part(g, cyl(0.03, 0.08, 0.08, 12), BLACK, 0.46, 1.13, -0.14, { outline: false });
  const lamp = ownLit(g, cyl(0.07, 0.07, 0.006, 12), '#fff3c6', 0.46, 1.086, -0.14);
  out.glow = lamp;
  // The chair.
  part(g, rbox(0.42, 0.06, 0.4, 0.02), '#44565e', DK.seat[0], DK.seat[1] - 0.03, DK.seat[2]);
  part(g, cyl(0.025, 0.03, 0.34, 8), STEEL, DK.seat[0], 0.2, DK.seat[2]);
  part(g, rbox(0.4, 0.42, 0.05, 0.03), '#44565e', DK.seat[0], DK.seat[1] + 0.3, DK.seat[2] + 0.22);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    part(g, box(0.24, 0.018, 0.03), BLACK, DK.seat[0] + 0.12 * Math.cos(a), 0.05, DK.seat[2] + 0.12 * Math.sin(a), { ry: -a, outline: false });
  }
  const pen = penMesh(g);
  const spots: Record<string, Spot> = { fgWriteLog: standAt(g, 'fgDesk', DK.seat[2]) };
  spots['*'] = spots.fgWriteLog;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    written.scale.z = Math.max(0.02, N ? (n.written ?? 0) : 0.5);
    mark.visible = !N || (n.stamped ?? 0) > 0.5;
    stampHome.visible = !P.stamp;
    at(stamp, P.stamp);
    at(pen, P.pen);
  });
  out.work = marker(g, 0, 0.8, 0.18);
}

export const BUILDERS: Record<string, Builder> = {
  // The 치유의 숲's pieces (2026-11-04, the branch lots).
  fhDeck(g, W, D) {
    fhDeck(g, W, D);
  },
  fhGrove(g, W, D) {
    fhGrove(g, W, D);
  },
  fhFootTub(g, W, D) {
    fhFootTub(g, W, D);
  },
  fhHammock(g, W, D) {
    fhHammock(g, W, D);
  },
  fgHills(g, _W, _D, _c, _def, _ctx, out) {
    hills(g, out);
  },
  fgGround(g, W, D) {
    ground(g, W, D);
  },
  fgRoadSign(g) {
    roadSign(g);
  },
  fgWood(g, W, D) {
    stand(g, W, D);
  },
  fgWoodW(g, W, D) {
    stand(g, W, D);
  },
  fgWoodT(g, W, D) {
    stand(g, W, D);
  },
  fgPlantation(g, W, D) {
    plantation(g, W, D);
  },
  fgLogs(g) {
    logStack(g);
  },
  saplingBed(g, _W, _D, _c, _def, _ctx, out) {
    saplingBed(g, out);
  },
  thinningSite(g, _W, _D, _c, _def, _ctx, out) {
    thinningSite(g, out);
  },
  fireWatchTower(g, _W, _D, _c, _def, _ctx, out) {
    fireTower(g, out);
  },
  trailSign(g, _W, _D, _c, _def, _ctx, out) {
    trailSign(g, out);
  },
  forestTruck(g, _W, _D, _c, _def, _ctx, out) {
    forestTruck(g, out);
  },
  fgMeasure(g, _W, _D, _c, _def, _ctx, out) {
    measureTree(g, out);
  },
  fgPineTrap(g, _W, _D, _c, _def, _ctx, out) {
    pineTrap(g, out);
  },
  fgFireShed(g, _W, _D, _c, _def, _ctx, out) {
    fireShed(g, out);
  },
  fgPatrolBoard(g, _W, _D, _c, _def, _ctx, out) {
    patrolBoard(g, out);
  },
  fgVisitorBoard(g, _W, _D, _c, _def, _ctx, out) {
    visitorBoard(g, out);
  },
  fgDesk(g, _W, _D, _c, _def, _ctx, out) {
    officeDesk(g, out);
  },
};

// ---------------------------------------------------------------------------------------------
// The 치유의 숲's pieces (2026-11-04, the branch lots: workFurniture/forester.ts). The forest's name is made up.

const FH_DECK = '#b58b62';
const FH_CYPRESS = '#2d5a3a';

/** 무장애 데크로드 (4 × 1, walked on): a low timber deck, its boards across, kerbs along both edges (no step anywhere), posts now and then. */
function fhDeck(g: THREE.Group, W: number, D: number) {
  part(g, box(W, 0.05, D - 0.08), shade(FH_DECK, 0.8), 0, 0.025, 0, { outline: false });
  for (let x = -W / 2 + 0.07; x < W / 2; x += 0.14) part(g, box(0.12, 0.012, D - 0.12), FH_DECK, x, 0.056, 0, { outline: false, shadow: false });
  for (const s of [-1, 1]) part(g, box(W, 0.06, 0.05), shade(FH_DECK, 0.7), 0, 0.08, s * (D / 2 - 0.06), { outline: false });
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) part(g, cyl(0.04, 0.04, 0.5, 8), shade(FH_DECK, 0.65), x, 0.25, -D / 2 + 0.06);
}

/** 편백 숲 (2 × 2): a close stand of 편백 (hinoki cypress), tall dark cones on red-brown trunks, and a pine among them; ferns at their feet. */
function fhGrove(g: THREE.Group, W: number, D: number) {
  const rnd = seeded(Math.round(W * 13 + D * 7));
  const list: Array<{ x: number; z: number; s: number }> = [];
  for (let i = 0; i < 5; i++) list.push({ x: -W / 2 + 0.35 + rnd() * (W - 0.7), z: -D / 2 + 0.35 + rnd() * (D - 0.7), s: 3.2 + rnd() * 1.4 });
  forest(g, list, FH_CYPRESS);
  pine(g, 0.2, 0.15, 3.6);
  for (let i = 0; i < 6; i++) {
    const f = part(g, ball(0.18), '#5c8a3e', -W / 2 + 0.2 + rnd() * (W - 0.4), 0.08, -D / 2 + 0.2 + rnd() * (D - 0.4), { outline: false });
    f.scale.set(1.2, 0.5, 1.2);
  }
}

/**
 * 편백 족욕기 (2 × 1): a long trough of 편백 boards with warm water steaming in it and a bench along its back to sit on, towels folded on
 * its end, the sign of how long to soak.
 */
function fhFootTub(g: THREE.Group, W: number, D: number) {
  const wood = '#d9b98c';
  part(g, rbox(W - 0.1, 0.35, 0.45, 0.03), wood, 0, 0.175, 0.12);
  part(g, box(W - 0.24, 0.02, 0.33), '#80cbc4', 0, 0.33, 0.12, { outline: false });
  part(g, rbox(W - 0.1, 0.06, 0.32, 0.02), wood, 0, 0.44, -D / 2 + 0.2);
  for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) part(g, box(0.06, 0.42, 0.28), shade(wood, 0.8), x, 0.21, -D / 2 + 0.2);
  for (let i = 0; i < 3; i++) part(g, rbox(0.22, 0.03, 0.16, 0.02), '#fafafa', W / 2 - 0.2, 0.48 + i * 0.03, -D / 2 + 0.2, { outline: false });
  label(g, '편백 족욕 · 15분', 0.6, 0.14, -W / 2 + 0.45, 0.2, 0.12 + 0.226, '#5d4037', '#fff8e1');
}

/** 풍욕장 해먹 (2 × 1): a hammock slung between two timber posts in the breeze, a cushion in it. */
function fhHammock(g: THREE.Group, W: number, D: number) {
  for (const s of [-1, 1]) part(g, cyl(0.06, 0.07, 1.5, 10), BARK, s * (W / 2 - 0.12), 0.75, 0);
  for (const s of [-1, 1]) rod(g, v3(s * (W / 2 - 0.15), 1.3, 0), v3(s * 0.55, 0.62, 0), 0.01, '#d7ccc8');
  const sling = part(g, ball(0.5), '#ffcc80', 0, 0.62, 0, { outline: false });
  sling.scale.set(1.15, 0.18, 0.55);
  part(g, rbox(0.3, 0.06, 0.24, 0.03), '#a5d6a7', -0.35, 0.7, 0, { outline: false });
  void D;
}
