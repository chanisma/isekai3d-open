import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, toon } from '../toon';
import { BLACK, glow, label, painted, text } from './doctor';
import { GP, MB, MR, PARTS, PEN_UP, RC, RG, miNow, miPhase, pieceToRifle } from './militaryMotion';
import type { MiMotion, MiNow, MiTool } from './militaryMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The made-up 한빛 훈련대's training ground drawn as itself (2026-11-02): a range with round paper bullseyes and a berm, a sentry post, a
 * march's staging point by the gate (the march itself goes out along the road) and a maintenance bench. The training rifle is plain and made up (no real model's shape, no brand), and nothing here
 * has a real unit's name or insignia. The 국기 게양대 keeps the look it had for its other use and only adds the morning's rank.
 * Everything that moves follows militaryMotion.ts.
 */

const OLIVE = '#59663f';
const OLIVE_D = '#3f4a2d';
const KHAKI = '#a39b7a';
const SAND = '#c9bb92';
const SAND_D = '#a8996f';
const EARTH = '#7d6a4c';
const WOOD = '#a77f54';
const WOOD_D = '#7b5b39';
const PAPER = '#f7f3e4';
const INK = '#20241c';
const GUN = '#34382f';
const GUN_D = '#25281f';
const STEEL = '#8d9498';
const RED = '#c8382c';
const SKIN = '#ecc6a3';
const METAL = '#b0b6ba';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
const FLAT = -Math.PI / 2;
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;

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
function standAt(g: THREE.Object3D, motion: MiMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && s.motion && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to; what the script says is in the hand goes in the hand. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<MiTool, HeldTool>>, show: (now: string | null, N: MiNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? miNow(sp.motion as MiMotion, t, miPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
  };
}
const paintBubble = (s: string) => (c: Ctx2) => {
  c.clearRect(0, 0, 256, 96);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#4a4238';
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(6, 6, 244, 72, 26);
  c.fill();
  c.stroke();
  text(c, s, 128, 44, s.length > 9 ? 24 : 31, OLIVE_D, 'center');
};
/** Words in a bubble, one sprite that changes its picture. */
function words(parent: THREE.Object3D, w: number, x: number, y: number, z: number) {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true;
  sp.scale.set(w, w * 0.375, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 5;
  sp.visible = false;
  parent.add(sp);
  let was = '';
  return {
    sprite: sp,
    say(s: string | undefined) {
      sp.visible = !!s;
      if (s && s !== was) {
        was = s;
        mat.map = painted(`miBubble|${s}`, 256, 96, paintBubble(s));
        mat.needsUpdate = true;
      }
    },
  };
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    if (d.lengthSq() > 1e-9) m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** Lines of handwriting on a page, as far as `lines` has got. */
function paintPage(c: Ctx2, w: number, h: number, title: string, lines: number) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);
  text(c, title, 12, 16, 14, OLIVE_D);
  for (let i = 0; i < 6; i++) {
    const y = 42 + i * ((h - 56) / 6);
    c.fillStyle = '#d7d0b8';
    c.fillRect(10, y, w - 20, 1);
    const f = Math.min(1, Math.max(0, lines - i));
    if (f > 0.02) {
      c.strokeStyle = '#34405e';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(14, y - 6);
      for (let x = 0; x < (w - 40 - i * 6) * f; x += 6) c.lineTo(14 + x, y - 8 + 3 * Math.sin(x * 0.6 + i));
      c.stroke();
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies in the same 전투복 as anyone on the lot when they've come.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
function soldier(parent: THREE.Object3D, x: number, z: number, ry: number, seed: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const top = OLIVE;
  const bottom = OLIVE_D;
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), BLACK, sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), BLACK, sx * 0.04, 0, 0.104, { outline: false });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.03);
    const upper = limb(root, 0.042, top);
    const lower = limb(root, 0.035, top);
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
  const opts: FigureOptions = { seed, garment: 'combat' };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return f;
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => void (f && (f.root.visible = false)) };
}
/** A point in a figure's own frame, as its arms want it (the frame of its parent). */
const figPt = (F: Fig, x: number, y: number, z: number) => v3(x, y, z).applyAxisAngle(UP, F.root.rotation.y).add(F.root.position);

// ---------------------------------------------------------------------------------------------
// Things for the hand. Each has its origin where it's held and is named for the probe; no ink line on what's held.

const NO = { outline: false } as const;
/**
 * A plain training rifle of no real model: a box, a straight stock, a round guard. Muzzle along -z, origin at the top of the grip. Its
 * five parts that come off are groups of their own, at their place on it (PARTS).
 */
function trainingRifle(g: THREE.Object3D, name: string) {
  const root = group(g);
  root.name = name;
  root.rotation.order = 'YXZ';
  part(root, box(0.05, 0.05, 0.3), GUN, 0, 0.012, -0.03, NO);
  part(root, box(0.04, 0.06, 0.26), GUN_D, 0, 0.018, 0.2, NO);
  part(root, box(0.044, 0.11, 0.03), GUN_D, 0, 0.015, 0.33, NO);
  part(root, rbox(0.034, 0.1, 0.04, 0.008), GUN_D, 0, -0.045, 0.012, { rx: -0.2, ...NO });
  part(root, cyl(0.012, 0.012, 0.2, 10), STEEL, 0, 0.03, -0.5, { rx: Math.PI / 2, ...NO });
  part(root, box(0.007, 0.03, 0.03), STEEL, 0, 0.06, -0.57, NO);
  const parts = PARTS.map((p, i) => {
    const m = group(root, p.home[0], p.home[1], p.home[2]);
    m.name = `${name}Part${i}`;
    if (i === 0) part(m, rbox(0.03, 0.1, 0.05, 0.006), OLIVE_D, 0, 0, 0, NO);
    if (i === 1) part(m, cyl(0.026, 0.026, 0.22, 12), OLIVE_D, 0, 0, 0, { rx: Math.PI / 2, ...NO });
    if (i === 2) part(m, box(0.046, 0.02, 0.22), GUN, 0, 0, 0, NO);
    if (i === 3) part(m, cyl(0.01, 0.01, 0.2, 8), STEEL, 0, 0, 0, { rx: Math.PI / 2, ...NO });
    if (i === 4) {
      part(m, cyl(0.016, 0.016, 0.1, 10), STEEL, 0, 0, 0, { rx: Math.PI / 2, ...NO });
      part(m, box(0.022, 0.012, 0.03), METAL, 0, 0.018, 0.01, NO);
    }
    return m;
  });
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), glow('#ffd76a'));
  muzzle.userData.ownGeometry = muzzle.userData.ownMaterial = true;
  muzzle.position.set(0, 0.03, -0.62);
  muzzle.visible = false;
  root.add(muzzle);
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: {
      right: { at: v3(0, -0.045, 0.012), axis: v3(0, 1, 0), palm: v3(-1, 0, 0), shape: 'trigger', radius: 0.02 },
      left: { at: v3(0, 0.03, -0.2), axis: v3(0, 0, -1), palm: v3(0, 1, 0), shape: 'power', radius: 0.027 },
    },
  };
  const partHeld = parts.map((m): HeldTool => ({ tool: m, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'pinch', radius: 0.018 } } }));
  return { root, parts, muzzle, held, partHeld };
}
function rucksack(g: THREE.Object3D, name: string, color = OLIVE) {
  const root = group(g);
  root.name = name;
  part(root, rbox(0.34, 0.46, 0.2, 0.06), color, 0, 0, -0.02);
  part(root, rbox(0.26, 0.16, 0.06, 0.03), OLIVE_D, 0, -0.08, -0.14);
  part(root, rbox(0.34, 0.06, 0.2, 0.03), OLIVE_D, 0, 0.21, -0.02);
  // The rolled mat on top, the harness on the side that goes on the back, a handle to lift it by.
  part(root, cyl(0.055, 0.055, 0.36, 12), KHAKI, 0, 0.29, -0.02, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) part(root, box(0.04, 0.42, 0.012), OLIVE_D, sx * 0.09, 0, 0.085, NO);
  part(root, cyl(0.012, 0.012, 0.16, 8), OLIVE_D, 0, 0.255, 0.06, { rz: Math.PI / 2, ...NO });
  part(root, cyl(0.03, 0.032, 0.13, 12), OLIVE_D, 0.2, -0.1, -0.02, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(-0.05, 0.255, 0.06), axis: v3(1, 0, 0), shape: 'power', radius: 0.014 }, left: { at: v3(0.05, 0.255, 0.06), axis: v3(1, 0, 0), shape: 'power', radius: 0.014 } } };
  return { root, held };
}
const DOWN_IN = v3(-0.12, -1, -0.28).normalize();
function penTool(g: THREE.Object3D, name: string): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = name;
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), DOWN_IN);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 10), OLIVE_D, 0, (0.05 - PEN_UP * 0.78) / 2, 0, NO);
  part(inner, cyl(0.006, 0.002, PEN_UP * 0.22, 10), BLACK, 0, -PEN_UP * 0.89, 0, NO);
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: DOWN_IN.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } } };
}
function binoculars(g: THREE.Object3D, name: string) {
  const root = group(g);
  root.name = name;
  for (const sx of [-1, 1]) part(root, cyl(0.026, 0.024, 0.12, 12), GUN, sx * 0.04, 0, 0, { rx: Math.PI / 2, ...NO });
  part(root, box(0.05, 0.02, 0.05), GUN_D, 0, 0, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(-0.05, 0, 0), axis: v3(0, 0, 1), shape: 'power', radius: 0.026 }, left: { at: v3(0.05, 0, 0), axis: v3(0, 0, 1), shape: 'power', radius: 0.026 } } };
  return { root, held };
}

// =============================================================================================
// 사격장 (miFiringRange, 2 × 10).

const paintTarget = (c: Ctx2, hits: ReadonlyArray<readonly [number, number]>) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 200, 200);
  const rings = ['#f7f3e4', '#20241c', '#f7f3e4', '#20241c', '#c8382c'];
  rings.forEach((col, i) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(100, 100, 92 - i * 19, 0, Math.PI * 2);
    c.fill();
  });
  c.strokeStyle = '#20241c';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(100, 100, 92, 0, Math.PI * 2);
  c.stroke();
  for (const [x, y] of hits) {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(100 + x * 92, 100 - y * 92, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111111';
    c.beginPath();
    c.arc(100 + x * 92, 100 - y * 92, 4, 0, Math.PI * 2);
    c.fill();
  }
};
const RANGE_SAY = ['', '사격 준비!', '사격 개시!', '사격 끝, 안전 확인!', '표적 확인', '탄착군 확인', '가늠자 조정', '영점 확인 끝'];
function firingRange(g: THREE.Group, out: Built) {
  // The ground: raked sand with a lane marked each side, the firing line painted across.
  part(g, box(1.96, 0.02, 9.96), SAND, 0, 0.01, 0, NO);
  for (const x of [-1, 0, 1]) part(g, box(0.03, 0.006, 9.3), PAPER, x * 0.96, 0.024, -0.1, NO);
  part(g, box(1.96, 0.006, 0.05), RED, 0, 0.024, 4.14, NO);
  // The berm, heaped earth behind the targets, in steps to look heaped.
  part(g, rbox(1.96, 0.5, 0.42, 0.1), EARTH, 0, 0.25, -4.76);
  part(g, rbox(1.96, 0.5, 0.3, 0.1), '#6f5d41', 0, 0.72, -4.84);
  part(g, rbox(1.96, 0.4, 0.2, 0.08), '#5d4e36', 0, 1.14, -4.9);
  for (let i = 0; i < 7; i++) part(g, ball(0.05 + (i % 3) * 0.012), '#6f8a4a', -0.84 + i * 0.28, 1.34 + (i % 2) * 0.03, -4.9, NO);
  // 2026-11-05, the layout audit: low earth walls down both sides of the lanes (the range lies along the yard), and the distance marked
  // at the targets' foot, the lot's ten tiles standing for the 25 m of a zeroing range.
  for (const sx of [-1, 1]) part(g, rbox(0.14, 0.55, 8.4, 0.06), EARTH, sx * 0.91, 0.28, -0.45, NO);
  label(g, '25m 영점 사격', 0.7, 0.16, 0, 0.32, -4.5, OLIVE_D, PAPER);
  // A round paper target on a board in each lane.
  const screens = RG.lanes.map((x) => {
    for (const sx of [-1, 1]) part(g, box(0.03, RG.targetY + 0.3, 0.03), WOOD_D, x + sx * 0.28, (RG.targetY + 0.3) / 2, RG.targetZ - 0.02);
    part(g, box(0.62, 0.62, 0.015), WOOD, x, RG.targetY, RG.targetZ - 0.01);
    return liveScreen(g, 0.54, 0.54, 200, 200, x, RG.targetY, RG.targetZ + 0.001);
  });
  // The sandbags at the firing line: three courses staggered, each lane's own rest.
  // Set out from the lanes' middles, for a gap to walk downrange through.
  for (const x of [-0.6, 0.6]) {
    for (let row = 0; row < 5; row++) {
      const n = 3 - (row % 2);
      for (let i = 0; i < n; i++) {
        part(g, rbox(0.24, 0.24, 0.44, 0.08), row % 2 ? SAND_D : '#b7a87e', x + (i - (n - 1) / 2) * 0.24, 0.13 + row * 0.24, RG.bagZ, row === 4 ? {} : NO);
      }
    }
  }
  // The range flag: raised while firing.
  part(g, cyl(0.016, 0.018, 2.1, 8), METAL, -0.94, 1.05, 4.84, NO);
  const flag = group(g, -0.94, 1.0, 4.84);
  part(flag, box(0.42, 0.26, 0.008), RED, -0.21, 0, 0, NO);
  // A post with the ear protection on its peg, and the unit's sign.
  part(g, box(0.05, 1.45, 0.05), WOOD_D, 0.96, 0.72, RG.muffs[2] + 0.02);
  part(g, cyl(0.008, 0.008, 0.06, 6), METAL, 0.94, RG.muffs[1] + 0.02, RG.muffs[2] + 0.02, { rz: Math.PI / 2, ...NO });
  label(g, '한빛 훈련대 사격장', 0.6, 0.14, 0.52, 1.82, 4.92, OLIVE_D, PAPER);
  label(g, '사격 중 출입 금지', 0.56, 0.13, 0.52, 1.62, 4.92, RED, PAPER);
  part(g, box(0.62, 0.16, 0.02), WOOD_D, 0.52, 1.82, 4.905, NO);
  for (const sx of [-1, 1]) part(g, box(0.03, 1.82, 0.03), WOOD_D, 0.52 + sx * 0.28, 0.91, 4.895, NO);
  // The spotting scope on its stand, on the bags.
  part(g, cyl(0.032, 0.022, 0.26, 12), GUN, RG.scope[0], RG.scope[1], RG.scope[2] - 0.1, { rx: Math.PI / 2, ...NO });
  part(g, cyl(0.012, 0.012, 0.09, 6), GUN_D, RG.scope[0], RG.scope[1] - 0.04, RG.scope[2] - 0.1, NO);
  // The kit.
  const rifle = trainingRifle(g, 'miRangeRifle');
  const muffs = group(g);
  muffs.name = 'miMuffs';
  for (const sx of [-1, 1]) part(muffs, rbox(0.04, 0.09, 0.07, 0.016), '#c76b1e', sx * 0.092, 0, 0, NO);
  const arc: V[] = [[-0.09, 0.03, 0], [-0.07, 0.1, 0], [0, 0.135, 0], [0.07, 0.1, 0], [0.09, 0.03, 0]];
  for (let i = 0; i < arc.length - 1; i++) rod(muffs, v3(...arc[i]), v3(...arc[i + 1]), 0.007, BLACK);
  const tools: Partial<Record<MiTool, HeldTool>> = {
    rifle: rifle.held,
    muffs: { tool: muffs, lead: 'right', grips: { right: { at: v3(-0.092, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.022 } } },
  };
  const officer = lazy(() => {
    const F = soldier(g, -0.42, 4.72, Math.PI, 41);
    part(F.head, box(0.05, 0.02, 0.26), PAPER, 0, 0.12, 0, NO);
    return F;
  });
  const say = words(g, 0.9, -0.42, 2.1, 4.72);
  const spots: Record<string, Spot> = { miZeroRifle: standAt(g, 'miZero', RG.x, RG.z), miShootTraining: standAt(g, 'miShoot', RG.x, RG.z) };
  spots['*'] = spots.miZeroRifle;
  out.work = marker(g, RG.rest[0], RG.rest[1], RG.rest[2]);
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(rifle.root, P.rifle, RG.rest);
    rifle.root.rotation.x = (n.kick ?? 0) * 0.035;
    rifle.muzzle.visible = (n.flash ?? 0) > 0.5;
    at(muffs, P.muffs, RG.muffs);
    if (N) muffs.rotation.y = P.muffs && N.tool !== 'muffs' ? N.st.yaw : Math.PI / 2;
    else muffs.rotation.y = Math.PI / 2;
    flag.position.y = (n.flag ?? 0) > 0.5 ? 1.98 : 1.05;
    if (N) {
      const F = officer.get();
      F.root.visible = true;
      say.say(RANGE_SAY[n.say ?? 0] || undefined);
    } else {
      officer.hide();
      say.say(undefined);
    }
    // The left lane's target keeps an old group; the dweller's fills as they fire.
    const shown: Array<readonly [number, number]> = (n.group ?? 1) > 0.5 ? RG.groupB.slice(0, n.hits ?? 0) : [...RG.groupA.slice(0, n.hits ?? 0), ...RG.groupB.slice(0, n.hits2 ?? 0)];
    screens[0].draw('old', (c) => paintTarget(c, [[-0.2, 0.25], [0.15, 0.3], [-0.05, -0.2]]));
    screens[1].draw(`${n.group ?? 1}|${n.hits ?? 0}|${n.hits2 ?? 0}`, (c) => paintTarget(c, shown));
  });
}

// =============================================================================================
// 초소 (miGuardPost, 2 × 1).

const POST_SAY: Record<string, string[]> = {
  xwGuardDuty: ['', '초소, 이상 없습니다'],
  miPostHandover: ['', '', '근무 교대합니다!', '특이 사항 없습니다', '쌍안경 인계', '수고하십시오!'],
};
function guardPost(g: THREE.Group, out: Built) {
  const FLOOR = 0.06;
  part(g, box(1.96, FLOOR, 0.96), '#8d8a78', 0, FLOOR / 2, 0);
  // Half walls of planks at the back and the sides, so whoever's inside shows; corner posts; a pitched roof.
  for (let i = 0; i < 6; i++) part(g, box(1.84, 0.16, 0.03), i % 2 ? OLIVE : OLIVE_D, 0, 0.16 + i * 0.17, -0.45, NO);
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) part(g, box(0.03, 0.16, 0.5), i % 2 ? OLIVE : OLIVE_D, sx * 0.92, 0.16 + i * 0.17, -0.22, NO);
  for (const sx of [-1, 1]) for (const z of [-0.45, 0.42]) part(g, box(0.07, 2.28, 0.07), WOOD_D, sx * 0.92, 1.14, z);
  const roof = group(g, 0, 2.3, 0);
  part(roof, box(2.12, 0.06, 1.2), OLIVE_D, 0, 0.1, 0, { rx: 0.1 });
  part(roof, box(1.92, 0.05, 0.05), WOOD_D, 0, 0, 0.42, NO);
  part(roof, box(1.92, 0.05, 0.05), WOOD_D, 0, 0.09, -0.45, NO);
  label(g, '제1 초소', 0.48, 0.16, 0, 2.2, 0.455, OLIVE_D, PAPER);
  part(g, box(0.52, 0.2, 0.02), WOOD_D, 0, 2.2, 0.443, NO);
  // The telephone in its box on the post at their left, a lamp that shows on a call.
  part(g, rbox(0.16, 0.26, 0.08, 0.012), GUN, GP.phone[0] + 0.1, GP.phone[1], GP.phone[2], NO);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), glow('#5a2a22'));
  lamp.userData.ownGeometry = lamp.userData.ownMaterial = true;
  lamp.position.set(GP.phone[0] + 0.1, GP.phone[1] + 0.1, GP.phone[2] + 0.045);
  g.add(lamp);
  const handset = group(g);
  handset.name = 'miHandset';
  part(handset, rbox(0.045, 0.19, 0.035, 0.012), BLACK, 0, 0, 0, NO);
  // The log's shelf at their right, the board with the day's page, the pen on it.
  part(g, box(0.5, 0.03, 0.42), WOOD, GP.log[0], GP.log[1] - 0.025, GP.log[2] - 0.02);
  part(g, box(0.03, GP.log[1] - 0.06, 0.03), WOOD_D, GP.log[0] + 0.2, (GP.log[1] - 0.06) / 2 + FLOOR, GP.log[2] + 0.12, NO);
  part(g, box(0.27, 0.008, 0.34), WOOD_D, GP.log[0], GP.log[1] - 0.006, GP.log[2], NO);
  const page = liveScreen(g, 0.25, 0.32, 150, 200, GP.log[0], GP.log[1] + 0.0005, GP.log[2], 0, FLAT);
  const pen = penTool(g, 'miPostPen');
  // The binoculars on their peg.
  part(g, cyl(0.008, 0.008, 0.06, 6), METAL, GP.binos[0], GP.binos[1] + 0.05, GP.binos[2] - 0.08, { rx: Math.PI / 2, ...NO });
  const binos = binoculars(g, 'miBinoculars');
  const tools: Partial<Record<MiTool, HeldTool>> = {
    pen: pen.held,
    handset: { tool: handset, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.02 } } },
    binos: binos.held,
  };
  const relief = lazy(() => soldier(g, GP.relief[0], GP.relief[1], Math.PI, 43));
  const say = words(g, 0.86, 0, 2.05, 0.75);
  const spots: Record<string, Spot> = { miPostHandover: standAt(g, 'miHandover', 0, 0.2), xwGuardDuty: standAt(g, 'miWatch', GP.stand[0], GP.stand[1]) };
  spots['*'] = spots.miPostHandover;
  out.work = marker(g, GP.log[0], GP.log[1], GP.log[2]);
  drive(g, out, spots, tools, (now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pen.root, P.pen, GP.penHome);
    at(handset, P.handset, GP.phone);
    const passed = (n.passed ?? 0) > 0.5;
    at(binos.root, P.binos ?? (passed ? [GP.relief[0], 1.2, GP.relief[1] - 0.26] : null), GP.binos);
    binos.root.rotation.y = N && P.binos ? N.st.yaw : 0;
    (lamp.material as THREE.MeshBasicMaterial).color.set((n.lamp ?? 0) > 0.5 ? '#ff5a3c' : '#5a2a22');
    const lines = n.lines ?? 0;
    page.draw(`${Math.floor(lines * 3)}`, (c) => paintPage(c, 150, 200, '근무 일지', 2 + lines));
    say.say(now && POST_SAY[now] ? POST_SAY[now][n.say ?? 0] || undefined : undefined);
    if (now === 'miPostHandover' && (n.relief ?? 0) > 0.01) {
      const F = relief.get();
      F.root.visible = true;
      F.root.position.z = GP.relief[1] + (1 - (n.relief ?? 1)) * 1.1;
      F.armR((n.rSalute ?? 0) > 0.5 ? figPt(F, -0.1, 1.5, 0.14) : null);
      F.armL(passed ? figPt(F, 0.04, 1.2, 0.26) : null);
    } else relief.hide();
  });
}

// =============================================================================================
// 행군 집결지 (miMarchRoute, 3 × 1): only the start; the march itself goes out of the gate (militaryMotion.ts).

function marchRoute(g: THREE.Group, out: Built) {
  // A board saying where the march goes, behind the trestle's left end.
  part(g, box(0.05, 1.2, 0.05), WOOD_D, -1.2, 0.6, -0.36);
  label(g, '행군 집결지', 0.56, 0.16, -1.2, 1.12, -0.33, OLIVE_D, PAPER);
  label(g, '정문 → 부대 밖 도로', 0.56, 0.1, -1.2, 0.96, -0.33, KHAKI, INK);
  // The trestle and the rucksacks, the checklist by it.
  const [, , tz] = MR.ruck;
  part(g, box(1.62, 0.04, 0.34), WOOD, 0, 0.62, tz);
  for (const x of [-0.73, 0.73]) for (const sz of [-1, 1]) rod(g, v3(x, 0.6, tz), v3(x, 0.02, tz + sz * 0.14), 0.016, WOOD_D);
  for (const i of [0, 2]) {
    const r = rucksack(g, `miRuck${i}`, i ? '#66704a' : OLIVE);
    r.root.position.set(MR.rucks[i][0], MR.rucks[i][1], MR.rucks[i][2]);
  }
  const mine = rucksack(g, 'miRuck');
  part(g, box(0.04, 0.96, 0.04), WOOD_D, MR.sheet[0], 0.48, MR.sheet[2] - 0.12, NO);
  part(g, box(0.28, 0.012, 0.32), WOOD_D, MR.sheet[0], MR.sheet[1] - 0.008, MR.sheet[2], NO);
  const sheet = liveScreen(g, 0.25, 0.3, 150, 180, MR.sheet[0], MR.sheet[1] + 0.0005, MR.sheet[2], 0, FLAT);
  const pen = penTool(g, 'miRuckPen');
  const canteen = group(g);
  canteen.name = 'miCanteen';
  canteen.rotation.order = 'YXZ';
  part(canteen, cyl(0.036, 0.036, 0.15, 14), OLIVE_D, 0, 0, 0, NO);
  part(canteen, cyl(0.016, 0.018, 0.03, 10), BLACK, 0, 0.09, 0, NO);
  const tools: Partial<Record<MiTool, HeldTool>> = {
    ruck: mine.held,
    pen: pen.held,
    canteen: { tool: canteen, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.036 } } },
  };
  const say = words(g, 0.8, 0, 2.05, 0.3);
  const spots: Record<string, Spot> = { miCheckRuck: standAt(g, 'miCheckRuck', 0, 0.33), miRuckMarch: standAt(g, 'miMarch', MR.start[0], MR.start[1]) };
  spots['*'] = spots.miCheckRuck;
  out.work = marker(g, MR.ruck[0], MR.ruck[1], MR.ruck[2]);
  drive(g, out, spots, tools, (now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(mine.root, P.ruck, MR.ruck);
    const onTrestle = !N || (n.onTrestle ?? 1) > 0.5 || !P.ruck;
    mine.root.rotation.y = onTrestle ? 0 : N.st.yaw;
    at(pen.root, P.pen, [MR.sheet[0] + 0.08, MR.sheet[1] + 0.012, MR.sheet[2] + 0.1]);
    at(canteen, P.canteen);
    canteen.rotation.set(-(n.tip ?? 0) * 1.5, N?.st.yaw ?? 0, 0);
    const ticks = n.ticks ?? 0;
    sheet.draw(`${Math.floor(ticks)}`, (c) => {
      paintPage(c, 150, 180, '군장 점검표', 0);
      ['멜빵', '수통', '결속'].forEach((s, i) => {
        text(c, s, 18, 58 + i * 34, 14, INK);
        c.strokeStyle = INK;
        c.strokeRect(112, 48 + i * 34, 18, 18);
        if (ticks > i + 0.5) text(c, '✔', 114, 58 + i * 34, 16, '#2d6a3f');
      });
    });
    // Over their head wherever the march has got to.
    if (N) say.sprite.position.set(N.st.x, 2.05, N.st.z);
    say.say(now === 'miRuckMarch' ? (n.say === 1 ? '10분 휴식, 물 한 모금' : n.say === 2 ? '군장 메!' : undefined) : undefined);
  });
}

// =============================================================================================
// 정비 작업대 (miMaintBench, 2 × 1).

const BENCH_SAY = ['', '안전 검사', '약실 확인, 이상 없음', '닦고 기름칠', '기능 검사, 찰칵'];
function maintBench(g: THREE.Group, out: Built) {
  const T = MB.top;
  part(g, rbox(1.94, 0.05, 0.86, 0.012), WOOD, 0, T - 0.025, 0);
  for (const sx of [-1, 1]) for (const z of [-0.36, 0.36]) part(g, box(0.06, T - 0.05, 0.06), OLIVE_D, sx * 0.9, (T - 0.05) / 2, z);
  part(g, box(1.8, 0.04, 0.04), OLIVE_D, 0, 0.3, -0.36, NO);
  part(g, box(1.7, 0.02, 0.6), OLIVE, 0, 0.32, 0, NO);
  // The rubber mat, its rows of little rests, the rifle's wooden block.
  part(g, box(1.46, 0.008, 0.72), '#3f5a4a', 0, T + 0.004, 0.04, NO);
  for (const p of PARTS) part(g, box(0.2, 0.002, 0.12), '#5d7a68', p.slot[0], T + 0.009, p.slot[2], NO);
  part(g, box(0.05, 0.03, 0.26), WOOD_D, MB.rifle[0] + 0.2, T + 0.02, MB.rifle[2], NO);
  part(g, box(0.05, 0.03, 0.26), WOOD_D, MB.rifle[0] - 0.14, T + 0.02, MB.rifle[2], NO);
  // A low board behind: the kit's outlines and a list; a tin of oil.
  part(g, box(1.94, 0.5, 0.03), '#d9d3ba', 0, T + 0.28, -0.41);
  label(g, '총기 정비 순서 · 안전 검사 먼저', 1.1, 0.1, -0.26, T + 0.44, -0.392, OLIVE_D, PAPER);
  for (let i = 0; i < 4; i++) part(g, box(0.02, 0.2, 0.012), STEEL, 0.5 + i * 0.1, T + 0.24, -0.39, NO);
  part(g, cyl(0.03, 0.036, 0.09, 12), '#b7912d', 0.72, T + 0.05, -0.14, NO);
  part(g, cyl(0.006, 0.012, 0.06, 8), METAL, 0.72, T + 0.12, -0.14, NO);
  // The parts tray.
  part(g, box(0.36, 0.03, 0.2), STEEL, -0.66, T + 0.018, -0.18, NO);
  // The rifle, muzzle along -x.
  const rifle = trainingRifle(g, 'miBenchRifle');
  rifle.root.rotation.y = Math.PI / 2;
  // The bore brush, the rag, the card.
  const brush = group(g);
  brush.name = 'miBrush';
  part(brush, cyl(0.012, 0.012, 0.16, 8), WOOD_D, 0, 0, 0.05, { rx: Math.PI / 2, ...NO });
  part(brush, cyl(0.004, 0.004, 0.08, 6), METAL, 0, 0, -0.07, { rx: Math.PI / 2, ...NO });
  part(brush, cyl(0.016, 0.016, 0.06, 8), '#d9c38a', 0, 0, -0.13, { rx: Math.PI / 2, ...NO });
  const rag = group(g);
  rag.name = 'miRag';
  part(rag, rbox(0.15, 0.016, 0.11, 0.006), '#d8cfae', 0, 0, 0, NO);
  part(g, box(0.2, 0.004, 0.27), PAPER, MB.card[0], MB.card[1] - 0.002, MB.card[2], NO);
  const card = liveScreen(g, 0.19, 0.26, 150, 200, MB.card[0], MB.card[1] + 0.001, MB.card[2], 0, FLAT);
  const pen = penTool(g, 'miBenchPen');
  const tools: Partial<Record<MiTool, HeldTool>> = {
    rifle: rifle.held,
    pen: pen.held,
    brush: { tool: brush, lead: 'right', grips: { right: { at: v3(0, 0, 0.05), axis: v3(0, 0, 1), shape: 'power', radius: 0.013 } } },
    rag: { tool: rag, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(1, 0, 0), palm: v3(0, -1, 0), shape: 'flat', radius: 0.01 } } },
    p0: rifle.partHeld[0],
    p1: rifle.partHeld[1],
    p2: rifle.partHeld[2],
    p3: rifle.partHeld[3],
    p4: rifle.partHeld[4],
  };
  const say = words(g, 0.86, 0, T + 0.9, 0.2);
  const spots: Record<string, Spot> = { miCleanRifle: standAt(g, 'miClean', 0.02, MB.stand), xwFieldStrip: standAt(g, 'miStrip', 0.05, MB.stand) };
  spots['*'] = spots.miCleanRifle;
  out.work = marker(g, MB.rifle[0], MB.rifle[1], MB.rifle[2]);
  drive(g, out, spots, tools, (now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(rifle.root, P.rifle, MB.rifle);
    rifle.parts.forEach((m, i) => {
      const held = P[`p${i}`];
      const place = held ? pieceToRifle(held, MB.rifle) : (n[`o${i}`] ?? 0) > 0.5 ? pieceToRifle(PARTS[i].slot, MB.rifle) : PARTS[i].home;
      m.position.set(place[0], place[1], place[2]);
    });
    at(brush, P.brush, MB.brush);
    at(rag, P.rag, MB.rag);
    at(pen.root, P.pen, MB.penHome);
    const lines = n.lines ?? 0;
    card.draw(`${Math.floor(lines * 3)}`, (c) => paintPage(c, 150, 200, '총기 점검 카드', 1 + lines));
    say.say(now === 'xwFieldStrip' ? BENCH_SAY[n.say ?? 0] || undefined : undefined);
  });
}

// =============================================================================================
// 국기 게양대 (flagPole, 1 × 1): as it was, with the morning's rank that only shows for 점호.

const ROLL_SAY = ['', '부대 차렷!', '경례!', '번호 붙여 가!', '인원 이상 없습니다', '오늘 일과 전달한다', '해산!'];
const COUNT = ['', '하나!', '둘!', '셋!', '넷!', '다섯!'];
function flagPole(g: THREE.Group, out: Built) {
  // The pole and a made-up unit's flag: olive, a pale star in the middle.
  part(g, cyl(0.03, 0.045, 4.4, 8), METAL, 0, 2.2, 0, NO);
  const flag = new THREE.Mesh(box(0.7, 0.46, 0.01), toon('#556b2f'));
  flag.position.set(0.37, 4.1, 0);
  g.add(flag);
  part(g, cyl(0.11, 0.11, 0.012, 5), '#f0e6b0', 0.37, 4.1, 0.006, { rx: Math.PI / 2, ...NO });
  // Forward of the piece, so it doesn't count as the pole's solid part.
  const yard = group(g, 0, 0, RC.z);
  const others = RC.rank.map((x, i) => ({ x, i })).filter((r) => r.x !== 0);
  const rank = others.map((r) => lazy(() => soldier(yard, r.x, 0, 0, 50 + r.i)));
  const leader = lazy(() => soldier(yard, RC.leader[0], RC.leader[1] - RC.z, Math.PI, 49));
  const lead = words(yard, 0.9, RC.leader[0], 2.05, RC.leader[1] - RC.z);
  const counts = RC.rank.map((x) => words(yard, 0.42, x, 1.98, 0));
  // Only 점호's place; everything else on the pole carries on as before.
  const spots: Record<string, Spot> = { xwRollCall: standAt(g, 'miRollCall', 0, RC.z) };
  drive(g, out, spots, {}, (_now, N) => {
    if (!N) {
      rank.forEach((f) => f.hide());
      leader.hide();
      lead.say(undefined);
      counts.forEach((c) => c.say(undefined));
      return;
    }
    const n = N.n;
    const salute = (n.salute ?? 0) > 0.3;
    rank.forEach((f) => {
      const F = f.get();
      F.root.visible = true;
      F.armR(salute ? figPt(F, -0.1, 1.5, 0.14) : null);
    });
    const L = leader.get();
    L.root.visible = true;
    L.armR((n.ldSalute ?? 0) > 0.3 ? figPt(L, -0.1, 1.5, 0.14) : null);
    lead.say(ROLL_SAY[n.say ?? 0] || undefined);
    counts.forEach((c, i) => c.say((n.call ?? 0) === i + 1 ? COUNT[i + 1] : undefined));
  });
}

// =============================================================================================
// 부대 마당 (miBaseGround, 15 × 16): the yard's packed earth, the parade square, the road in from the gate, and the fence round the whole base.
// Flat and walked over; the fence stands where nothing goes, so it's only drawn. Tile x's centre is x - 7 here, tile y's is y - 7.5.

const paintYard = (c: Ctx2) => {
  const S = 32;
  c.fillStyle = '#b8a97f';
  c.fillRect(0, 0, 15 * S, 16 * S);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = i % 2 ? 'rgba(90,75,50,0.12)' : 'rgba(255,245,215,0.1)';
    c.fillRect((i * 197) % (15 * S), (i * 113) % (16 * S), 4 + (i % 7), 2 + (i % 3));
  }
  // The parade square, raked and lined (2026-11-05, the layout audit: the range moved to the west fence, the motor pool by the gate).
  c.fillStyle = '#c4b78f';
  c.fillRect(3 * S, 2 * S, 8 * S, 7 * S);
  c.strokeStyle = '#f2ead0';
  c.lineWidth = 3;
  c.strokeRect(3 * S, 2 * S, 8 * S, 7 * S);
  // The motor pool's concrete standing west of the gate road.
  c.fillStyle = '#9b988c';
  c.fillRect(2 * S, 12 * S, 8 * S, 4 * S);
  c.strokeStyle = '#f2c230';
  c.lineWidth = 2;
  for (const x of [3.5, 6.5]) c.strokeRect(x * S, 12.3 * S, 3 * S, 2.4 * S);
  // The road: in at the gate, up to the barracks' door, a branch to the armoury's.
  c.fillStyle = '#8f8a7c';
  c.fillRect(11.5 * S, 8 * S, S, 8 * S);
  for (const y of [8, 11]) c.fillRect(11.5 * S, y * S, 3.5 * S, S);
};
function fenceRun(g: THREE.Object3D, x0: number, z0: number, x1: number, z1: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const along = z0 === z1;
  const n = Math.max(1, Math.round(len / 2));
  for (let i = 0; i <= n; i++) part(g, box(0.08, 1.5, 0.08), '#6d6f68', x0 + ((x1 - x0) * i) / n, 0.75, z0 + ((z1 - z0) * i) / n, NO);
  for (const y of [0.45, 0.85, 1.25, 1.46]) part(g, along ? box(len, 0.02, 0.02) : box(0.02, 0.02, len), y > 1.4 ? '#4e504a' : '#8a8c84', (x0 + x1) / 2, y, (z0 + z1) / 2, NO);
}
function baseGround(g: THREE.Group, W: number, D: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: painted('miYard', W * 32, D * 32, paintYard) }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.x = FLAT;
  m.position.y = 0.006;
  g.add(m);
  const W0 = -W / 2;
  const N = -D / 2;
  const S = D / 2;
  const E = W0 + 26;
  fenceRun(g, W0, N, E, N);
  fenceRun(g, W0, N, W0, S);
  fenceRun(g, E, N, E, S);
  fenceRun(g, W0, S, 4.1, S);
  fenceRun(g, 5.9, S, E, S);
  // The gate: two pillars, the barrier raised, the made-up unit's name.
  for (const x of [4.1, 5.9]) part(g, box(0.34, 1.9, 0.34), '#b9b5a4', x, 0.95, S);
  part(g, box(0.05, 1.7, 0.05), '#d9d3ba', 3.86, 1.2, S, NO);
  label(g, '한빛 훈련대', 1.3, 0.3, 2.9, 1.45, S + 0.03, OLIVE_D, PAPER);
  // Sandbags each side of the gate, on the yard's side.
  for (const x of [3.2, 6.8]) for (let i = 0; i < 3; i++) part(g, rbox(0.62, 0.22, 0.34, 0.08), i % 2 ? SAND_D : SAND, x, 0.11 + i * 0.22, S - 0.3, NO);
}

export const BUILDERS: Record<string, Builder> = {
  miBaseGround(g, W, D) {
    baseGround(g, W, D);
  },
  miFiringRange(g, _W, _D, _c, _def, _ctx, out) {
    firingRange(g, out);
  },
  miGuardPost(g, _W, _D, _c, _def, _ctx, out) {
    guardPost(g, out);
  },
  miMarchRoute(g, _W, _D, _c, _def, _ctx, out) {
    marchRoute(g, out);
  },
  miMaintBench(g, _W, _D, _c, _def, _ctx, out) {
    maintBench(g, out);
  },
  flagPole(g, _W, _D, _c, _def, _ctx, out) {
    flagPole(g, out);
  },
  miArmsRack(g) {
    armsRack(g);
  },
  miBunkLocker(g) {
    bunkLocker(g);
  },
};

/**
 * 총기함 (miArmsRack, 2 × 1; 2026-11-05, the layout audit): a steel rack against the 무기고's wall behind a mesh door, the company's
 * rifles standing in it muzzle up, chained and padlocked; the 총기 출납 대장 on its clipboard hung at the side.
 */
const MESH = new THREE.MeshToonMaterial({ color: '#9aa39a', transparent: true, opacity: 0.32, depthWrite: false });
function armsRack(g: THREE.Group) {
  const W = 1.84;
  const H = 1.72;
  const Z = -0.18;
  part(g, rbox(W, H, 0.44, 0.03), '#5d6652', 0, H / 2, Z);
  part(g, box(W - 0.12, H - 0.16, 0.02), '#3f4638', 0, H / 2, Z + 0.21, NO);
  // The rifles in two rows of slots, butts in the foot rail, a chain through the guards.
  part(g, box(W - 0.14, 0.08, 0.28), '#454c3d', 0, 0.12, Z + 0.06, NO);
  for (let i = 0; i < 9; i++) {
    const x = -0.76 + i * 0.19;
    part(g, box(0.05, 0.86, 0.08), GUN, x, 0.6, Z + 0.06, NO);
    part(g, box(0.03, 0.34, 0.04), GUN_D, x, 1.2, Z + 0.06, NO);
    part(g, box(0.04, 0.1, 0.12), GUN_D, x, 0.55, Z + 0.12, NO);
  }
  part(g, box(W - 0.2, 0.015, 0.015), METAL, 0, 0.82, Z + 0.15, NO);
  // The mesh door, its frame, the hasp and the padlock.
  part(g, box(W - 0.06, H - 0.08, 0.01), '#9aa39a', 0, H / 2, Z + 0.225, { outline: false, material: MESH });
  for (const sx of [-1, 1]) part(g, box(0.04, H - 0.08, 0.03), '#4a5241', sx * (W / 2 - 0.03), H / 2, Z + 0.23, NO);
  part(g, box(0.04, H - 0.08, 0.03), '#4a5241', 0, H / 2, Z + 0.23, NO);
  part(g, rbox(0.07, 0.08, 0.03, 0.01), '#c9a227', 0.06, 0.95, Z + 0.25, NO);
  label(g, '총기함 1', 0.4, 0.1, -0.5, H - 0.12, Z + 0.24, OLIVE_D, PAPER);
  // The ledger on its clipboard at the right side.
  part(g, box(0.02, 0.34, 0.25), WOOD_D, W / 2 + 0.012, 1.1, Z + 0.02, NO);
  const sheetTex = painted('miLedger', 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    text(c, '총기 출납 대장', 48, 14, 11, INK, 'center');
    c.fillStyle = '#9a9a8c';
    for (let r = 0; r < 8; r++) c.fillRect(8, 30 + r * 12, 80, 1);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.29), new THREE.MeshBasicMaterial({ map: sheetTex }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(W / 2 + 0.024, 1.08, Z + 0.02);
  m.rotation.y = Math.PI / 2;
  g.add(m);
}

/**
 * 관물대 (miBunkLocker, 1 × 1): the soldier's own locker by his bed, its open top shelf with the folded uniform and the helmet on it,
 * the closed cupboard below and his name tag (2026-11-05, the layout audit).
 */
function bunkLocker(g: THREE.Group) {
  const W = 0.8;
  const H = 1.8;
  const Z = -0.12;
  part(g, rbox(W, H, 0.6, 0.03), WOOD, 0, H / 2, Z);
  // The open shelves: the folded combat uniform, a T-shirt, the helmet on top.
  part(g, box(W - 0.08, 0.6, 0.02), WOOD_D, 0, 1.38, Z + 0.3, { outline: false, material: toon('#3e2f1f') });
  part(g, box(W - 0.08, 0.02, 0.5), WOOD_D, 0, 1.08, Z + 0.06, NO);
  part(g, rbox(0.42, 0.1, 0.32, 0.03), OLIVE, -0.08, 1.15, Z + 0.1, NO);
  part(g, rbox(0.4, 0.08, 0.3, 0.03), KHAKI, -0.08, 1.24, Z + 0.1, NO);
  part(g, ball(0.16), OLIVE_D, 0.02, H + 0.08, Z, NO);
  // The cupboard below, its handle; the name tag.
  part(g, box(W - 0.06, 0.98, 0.02), shadeHex(WOOD, 0.92), 0, 0.53, Z + 0.305, NO);
  part(g, box(0.02, 0.12, 0.03), METAL, W / 2 - 0.12, 0.62, Z + 0.32, NO);
  label(g, '일병 김한빛', 0.34, 0.07, 0, 0.92, Z + 0.32, PAPER, INK);
}
const shadeHex = (hex: string, k: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
