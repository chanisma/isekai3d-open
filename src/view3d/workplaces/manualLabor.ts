import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glowing, label, painted, picture, text } from './doctor';
import { BD, CR, EX, HP, MW, OF, PL, PV, SB, SV, TR, WB, mlNow, mlPhase } from './manualLaborMotion';
import type { MlMotion, MlNow } from './manualLaborMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { pestKit } from './workExtraKits';

/**
 * The 조경 공사 현장 drawn as itself (2026-11-01 workplace pipeline, at the user's request): an open site run by
 * the made-up 단단조경. Beds being planted, mowers with their strips, wheelbarrows with a heap to fill from, a
 * pallet yard with a low wall going up. And what the site was missing: a paving area with its edging stones
 * and string line, a yard of root-balled trees and a pit to plant in, a small excavator cutting a trench, survey
 * stakes and an auto level, the safety board where the crew gather in the morning, the blue site office
 * container, a steel tool cage and the aggregate bays with a throwing screen.
 *
 * Everything that moves follows the scripts in manualLaborMotion.ts; other people are played by VRoid bodies
 * where there are any (vroidFigure.ts). `gardenBed` is also the greenhouse's, so it stays an ordinary bed; the
 * tool wall is the garage's (mechanic.ts), left as it is, its learnTools spot already there.
 */

const BRAND = '단단조경';
const SOIL = '#5d4330';
const SOIL_D = '#3e2c20';
const SOIL_WET = '#2f2118';
const SAND = '#d9c08a';
const GRAVEL = '#9a9a94';
const TIMBER = '#8d6e4a';
const TIMBER_D = '#6d5238';
const LEAF = '#4f8f3a';
const LEAF_D = '#39702b';
const LEAF_L = '#79b34e';
const BURLAP = '#a98a5e';
const TWINE = '#e7d9b5';
const CONC = '#b8b6ae';
const CONC_D = '#94928a';
const ORANGE = '#f57c00';
const YELLOW = '#f9c22e';
const YELLOW_D = '#c99714';
const CONTAINER = '#2f6db0';
const CONTAINER_D = '#24568c';
const SAFE_GREEN = '#1b8a4c';
const GRASS_CUT = '#a6cf6c';
const TARP = '#2f7fd6';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
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
function at(m: THREE.Object3D, p: V | null | undefined, home?: V | null) {
  m.visible = !!(p ?? home);
  if (p) place(m, p);
  else if (home) place(m, home);
}
function standAt(g: THREE.Object3D, motion: MlMotion, z = 0.6, x = 0): Spot {
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
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: MlNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? mlNow(sp.motion as MlMotion, t, mlPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
/** Dust, smoke, water: soft balls from a place, each on its own loop (`rise` below zero falls). */
function puffs(g: THREE.Object3D, n: number, color = '#ffffff', size = 0.05) {
  const list = Array.from({ length: n }, () => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(ball(size), mat);
    m.userData.ownMaterial = true;
    m.visible = false;
    g.add(m);
    return { m, mat };
  });
  return (strength: number, x: number, y: number, z: number, spread: number, t: number, rise = 0.5, speed = 0.55) => {
    list.forEach(({ m, mat }, i) => {
      const u = (t * speed + i / n) % 1;
      m.visible = strength > 0.03;
      if (!m.visible) return;
      const s = Math.sin(i * 12.9) * 0.5;
      m.position.set(x + spread * s * 2 + 0.02 * Math.sin(t * 2 + i), y + u * rise, z + spread * Math.cos(i * 7.7) * 0.6);
      m.scale.setScalar(0.7 + u * 0.9);
      mat.opacity = Math.min(1, strength) * 0.55 * (1 - u) * Math.min(1, u * 6);
    });
  };
}
/** A rounded mound of something, a little lumpy, its foot at y 0. */
function mound(g: THREE.Object3D, color: string, r: number, h: number, x: number, z: number, seed = 1): THREE.Group {
  const m = group(g, x, 0, z);
  part(m, cyl(r * 0.3, r, h * 0.72, 18), color, 0, h * 0.36, 0);
  const top = part(m, ball(r * 0.42), shade(color, 1.04), 0, h * 0.74, 0);
  top.scale.y = 0.75;
  for (let i = 0; i < 9; i++) {
    const a = (i + seed) * 2.399;
    const q = r * (0.55 + ((i * 37) % 10) * 0.035);
    part(m, ball(r * 0.13), shade(color, 0.88 + (i % 3) * 0.1), Math.cos(a) * q, h * (0.05 + (i % 3) * 0.1), Math.sin(a) * q, { outline: false });
  }
  return m;
}
/** Stones strewn on a mound. */
function pebbles(g: THREE.Object3D, n: number, r: number, h: number, seed = 3) {
  for (let i = 0; i < n; i++) {
    const a = (i + seed) * 2.399;
    const q = r * (0.2 + ((i * 53) % 10) * 0.08);
    const y = h * Math.max(0.04, 1 - q / r) * 0.8;
    part(g, ball(0.028 + (i % 3) * 0.007), shade(GRAVEL, 0.8 + (i % 4) * 0.13), Math.cos(a) * q, y, Math.sin(a) * q, { outline: false });
  }
}

// What's in hand. Long tools have their origin at the grip and run down to their working end.

function lay(m: THREE.Object3D, G: V, B: V) {
  m.position.set(G[0], G[1], G[2]);
  tmp.set(B[0] - G[0], B[1] - G[1], B[2] - G[2]).normalize();
  m.quaternion.setFromUnitVectors(DOWN, tmp);
}
function shovelMesh(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, box(0.11, 0.022, 0.022), BLACK, 0, 0, 0, { outline: false });
  part(s, cyl(0.016, 0.018, 1.1, 8), TIMBER, 0, -0.56, 0, { outline: false });
  part(s, cyl(0.022, 0.024, 0.1, 8), '#6a7278', 0, -1.1, 0, { outline: false });
  part(s, rbox(0.2, 0.26, 0.018, 0.04), '#71797e', 0, -1.25, 0.008);
  part(s, box(0.16, 0.02, 0.02), CHROME, 0, -1.37, 0.008, { outline: false });
  return s;
}
function soilLoad(g: THREE.Object3D, color = SOIL): THREE.Mesh {
  const m = part(g, ball(0.085), color, 0, 0, 0, { outline: false });
  m.scale.y = 0.62;
  return m;
}
function canMesh(g: THREE.Object3D): { root: THREE.Group; tilt: THREE.Group } {
  const root = group(g);
  const tilt = group(root, 0, 0.16, 0);
  part(tilt, cyl(0.082, 0.098, 0.2, 14), '#3f9a54', 0, -0.05, 0);
  part(tilt, cyl(0.082, 0.082, 0.012, 14), '#2f7b41', 0, 0.054, 0, { outline: false });
  rod(tilt, v3(-0.09, -0.08, 0), v3(-0.24, 0.13, 0), 0.012, '#2f7b41');
  part(tilt, cyl(0.05, 0.03, 0.022, 12), '#2f7b41', -0.255, 0.14, 0, { rz: 1.2, outline: false });
  const handle = part(tilt, cyl(0.009, 0.009, 0.22, 6), '#2f7b41', 0, 0.15, 0, { rz: Math.PI / 2, outline: false });
  handle.position.x = 0.02;
  rod(tilt, v3(0.09, 0.15, 0), v3(0.095, -0.02, 0), 0.008, '#2f7b41');
  return { root, tilt };
}
function malletMesh(g: THREE.Object3D, head = '#222a2e'): THREE.Group {
  const m = group(g);
  part(m, cyl(0.045, 0.045, 0.15, 12), head, 0, 0, 0, { rx: Math.PI / 2 });
  rod(m, v3(0, 0, 0.0), v3(0.03, 0.02, 0.2), 0.012, TIMBER);
  return m;
}
function trowelMesh(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, box(0.09, 0.005, 0.16), CHROME, 0, -0.01, -0.09, { outline: false });
  rod(m, v3(0, 0, 0.0), v3(0, -0.01, -0.03), 0.006, STEEL);
  part(m, cyl(0.015, 0.015, 0.09, 8), TIMBER, 0, 0.0, 0.04, { rx: Math.PI / 2, outline: false });
  return m;
}
function levelMesh(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, rbox(0.72, 0.05, 0.03, 0.006), YELLOW, 0, 0, 0);
  glowing(m, box(0.07, 0.022, 0.006), '#b2ff59', 0, 0, 0.017);
  glowing(m, box(0.022, 0.03, 0.006), '#b2ff59', -0.24, 0, 0.017);
  return m;
}
function boardMesh(g: THREE.Object3D, tex: THREE.Texture): THREE.Group {
  const m = group(g);
  part(m, box(0.22, 0.3, 0.012), TIMBER_D, 0, 0, 0, { rx: -0.45 });
  picture(m, tex, 0.19, 0.26, 0, 0.0, 0.01, '#ffffff', 0, -0.45);
  part(m, box(0.08, 0.018, 0.018), CHROME, 0, 0.145, -0.07, { rx: -0.45, outline: false });
  return m;
}
const planPaper = () =>
  painted('mlPlanSheet', 96, 128, (c) => {
    c.fillStyle = '#f5f2e6';
    c.fillRect(0, 0, 96, 128);
    text(c, '작업 배치표', 48, 14, 11, '#37474f', 'center');
    c.strokeStyle = '#90a4ae';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(8, 30 + i * 15);
      c.lineTo(88, 30 + i * 15);
      c.stroke();
    }
    ['수목 식재', '경계석', '터파기', '자재 정리'].forEach((s, i) => text(c, s, 10, 38 + i * 15, 10, '#37474f'));
  });

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come. A hard hat goes on the head group.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  a: { top: '#ef6c00', bottom: '#37474f', hair: '#2b1b10' },
  b: { top: '#fbc02d', bottom: '#455a64', hair: '#1a1a1a', skin: '#eac09a' },
  c: { top: '#7cb342', bottom: '#3e2723', hair: '#5b3a1e', skin: '#c99a6e' },
  d: { top: '#26a69a', bottom: '#263238', hair: '#3a2c20', skin: '#f8d9c0' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
const UP = new THREE.Vector3(0, 1, 0);
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
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, hat = YELLOW, gender?: 'female' | 'male'): Fig {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
    part(root, rbox(0.09, 0.08, 0.21, 0.03), '#4e342e', sx * 0.09, 0.04, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
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
  // A hard hat: a plain dome and brim about the size of the head, no markings towards the front.
  const dome = part(f.head, ball(0.13), hat, 0, 0.055, -0.005);
  dome.scale.set(1, 0.84, 1.08);
  part(f.head, cyl(0.15, 0.15, 0.012, 18), hat, 0, 0.042, 0, { outline: false });
  part(f.head, box(0.03, 0.022, 0.24), shade(hat, 0.86), 0, 0.165, -0.005, { outline: false });
  root.visible = false;
  return { ...f, opts };
}
/** A way in and out of a scene: along `dx`, gone at `there` 0. */
function comes(f: Fig, there: number, x: number, z: number, dx: number, t: number) {
  f.root.visible = there > 0.02;
  if (!f.root.visible) return;
  const off = 1 - there;
  f.root.position.set(x + dx * off, off > 0.01 ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z);
}

// =============================================================================================
// 화단 (gardenBed, 2 × 1): an ordinary raised bed, here and in the greenhouse.

function shrubMesh(g: THREE.Object3D, s = 1): { root: THREE.Group; bits: THREE.Mesh[] } {
  const root = group(g);
  part(root, cyl(0.022 * s, 0.03 * s, 0.14 * s, 8), TIMBER_D, 0, 0.06 * s, 0, { outline: false });
  part(root, ball(0.21 * s), LEAF, 0, 0.26 * s, 0);
  part(root, ball(0.15 * s), LEAF_D, -0.13 * s, 0.2 * s, 0.05 * s, { outline: false });
  part(root, ball(0.15 * s), LEAF_L, 0.13 * s, 0.22 * s, 0.03 * s, { outline: false });
  const bits = ([[-0.14, 0.38, 0.14], [0.14, 0.44, 0.13], [-0.1, 0.42, 0.13], [0.14, 0.36, 0.14]] as const).map(([x, y, z]) => part(root, ball(0.07 * s), LEAF_L, x * s, y * s, z * s, { outline: false }));
  return { root, bits };
}
function gardenBed(g: THREE.Group, out: Built) {
  // Timber sleepers round a bed of soil, stepped at the corners.
  for (const z of [-0.45, 0.45]) {
    part(g, rbox(1.98, 0.13, 0.09, 0.012), TIMBER, 0, 0.075, z);
    part(g, rbox(1.98, 0.13, 0.09, 0.012), shade(TIMBER, 0.9), 0, 0.2, z);
  }
  for (const x of [-0.95, 0.95]) {
    part(g, rbox(0.09, 0.13, 0.82, 0.012), shade(TIMBER, 0.95), x, 0.075, 0);
    part(g, rbox(0.09, 0.13, 0.82, 0.012), TIMBER, x, 0.2, 0);
  }
  part(g, box(1.82, 0.22, 0.82), SOIL, 0, 0.13, 0, { outline: false });
  const turned = part(g, box(0.72, 0.008, 0.26), SOIL_D, 0, BD.top - 0.012, 0.2, { outline: false });
  const wet = part(g, box(1.8, 0.006, 0.8), SOIL_WET, 0, BD.top - 0.008, 0, { outline: false });
  const A = shrubMesh(g);
  place(A.root, BD.shrubA);
  const B = shrubMesh(g);
  place(B.root, BD.shrubB);
  // A row of flowers between the shrubs.
  const blooms = ['#ef5350', '#ffca28', '#ec407a', '#ab47bc', '#ffffff'];
  for (let i = 0; i < 9; i++) {
    const x = -0.24 + i * 0.06;
    const z = -0.12 - (i % 2) * 0.1;
    part(g, cyl(0.006, 0.006, 0.12, 5), LEAF_D, x, BD.top + 0.05, z, { outline: false });
    part(g, ball(0.028), blooms[i % blooms.length], x, BD.top + 0.12, z, { outline: false });
    part(g, ball(0.03), LEAF, x + 0.02, BD.top + 0.02, z + 0.02, { outline: false });
  }
  // The weeds there to pull.
  const weeds = BD.weeds.map(([x, z]) => {
    const w = group(g, x, BD.top, z);
    for (let i = 0; i < 4; i++) part(w, box(0.012, 0.09, 0.006), '#8bbf3f', 0.012 * (i - 1.5), 0.04, 0, { rz: (i - 1.5) * 0.35, outline: false });
    return w;
  });
  const weedHeld = group(g);
  for (let i = 0; i < 4; i++) part(weedHeld, box(0.012, 0.1, 0.006), '#8bbf3f', 0.012 * (i - 1.5), -0.04, 0, { rz: (i - 1.5) * 0.3, outline: false });
  // A plant label at the corner.
  part(g, box(0.012, 0.16, 0.01), '#eceff1', 0.8, BD.top + 0.06, 0.28, { outline: false });
  label(g, '관목', 0.09, 0.05, 0.8, BD.top + 0.14, 0.287, '#eceff1', '#37474f');
  // What comes out while it's being worked.
  const pail = group(g);
  part(pail, cyl(0.12, 0.09, 0.2, 14), '#546e7a', 0, 0.1, 0);
  part(pail, cyl(0.1, 0.1, 0.01, 14), LEAF_D, 0, 0.185, 0, { outline: false });
  place(pail, BD.pail);
  const inPail = part(pail, ball(0.08), '#8bbf3f', 0, 0.2, 0, { outline: false });
  const can = canMesh(g);
  const drops = puffs(g, 7, '#90caf9', 0.014);
  const fork = group(g);
  for (const x of [-0.02, 0, 0.02]) part(fork, box(0.006, 0.08, 0.006), CHROME, x, -0.0, 0, { outline: false });
  part(fork, cyl(0.012, 0.012, 0.12, 8), '#2e7d32', 0, 0.09, 0.0, { outline: false });
  const snips = group(g);
  part(snips, box(0.016, 0.1, 0.006), CHROME, 0.012, 0.06, -0.03, { rz: -0.15, outline: false });
  const blade = part(snips, box(0.016, 0.1, 0.006), CHROME, -0.012, 0.06, -0.03, { rz: 0.15, outline: false });
  part(snips, box(0.016, 0.12, 0.016), '#c62828', 0.02, -0.05, 0, { outline: false });
  part(snips, box(0.016, 0.12, 0.016), '#c62828', -0.02, -0.05, 0, { outline: false });
  const cuttings = group(g, 0, BD.top, 0.3);
  for (let i = 0; i < 6; i++) part(cuttings, ball(0.025), LEAF_L, -0.56 + (i % 2 ? 1.1 : 0) + i * 0.02, 0.01, 0.02 * (i % 3), { outline: false });
  // Planting.
  const shovel = shovelMesh(g);
  const load = soilLoad(g);
  const hole = part(g, cyl(0.11, 0.09, 0.012, 14), SOIL_WET, BD.hole[0], BD.top, BD.hole[2], { outline: false });
  const spoil = mound(g, SOIL, 0.09, 0.08, BD.hole[0] + 0.3, BD.hole[2] + 0.1);
  spoil.position.y = BD.top;
  const pot = group(g);
  part(pot, cyl(0.1, 0.075, 0.16, 12), '#37474f', 0, 0.08, 0);
  const inPot = shrubMesh(pot, 0.7);
  inPot.root.position.y = 0.13;
  const newShrub = shrubMesh(g, 0.7);
  const board = boardMesh(g, planPaper());
  const spots: Record<string, Spot> = {
    tendBeds: standAt(g, 'mlBed'),
    pruneShrubs: standAt(g, 'mlPrune'),
    manualLabor_plantShrubs: standAt(g, 'mlShrub'),
    gardener_landscapePlan: standAt(g, 'mlPlan'),
  };
  spots['*'] = spots.tendBeds;
  // The greenhouse's pest round (xwPestCheck): its own script and props (workExtraMotion.ts, workExtraKits.ts).
  const bedWork = marker(g, 0, BD.top + 0.05, 0.25);
  const pests = pestKit(g, bedWork);
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const working = now === 'tendBeds';
    const pruning = now === 'pruneShrubs';
    const planting = now === 'manualLabor_plantShrubs';
    weeds.forEach((w, i) => (w.visible = !working || i >= (n.weeds ?? 0)));
    at(weedHeld, P.weed);
    pail.visible = working;
    inPail.visible = (n.inPail ?? 0) > 0.5;
    at(can.root, P.can, working || planting ? BD.can : null);
    can.tilt.rotation.z = (n.canTip ?? 0) * 0.75;
    const p = n.pour ?? 0;
    if (p > 0.05 && P.can) drops(p, P.can[0] - 0.22, P.can[1] + 0.05, P.can[2], 0.04, t, -0.6, 1.1);
    else drops(0, 0, 0, 0, 0, t);
    wet.visible = (n.wet ?? 0) > 0.35;
    turned.visible = (n.turned ?? 0) > 0.2;
    at(fork, P.fork);
    // Pruning: the bumps cut off, one at a time.
    B.bits[0].visible = !pruning || (n.b1 ?? 0) < 0.5;
    B.bits[1].visible = !pruning || (n.b2 ?? 0) < 0.5;
    A.bits[0].visible = !pruning || (n.b3 ?? 0) < 0.5;
    A.bits[1].visible = !pruning || (n.b4 ?? 0) < 0.5;
    at(snips, P.snips);
    blade.rotation.z = 0.15 + (n.snip ?? 0) * 0.35;
    const cut = (n.b1 ?? 0) + (n.b2 ?? 0) + (n.b3 ?? 0) + (n.b4 ?? 0);
    cuttings.visible = pruning && cut > 0.5 && (n.gone ?? 0) < 0.9;
    // Planting.
    if (P.shG && P.shB) {
      shovel.visible = true;
      lay(shovel, P.shG, P.shB);
    } else if (planting) {
      shovel.visible = true;
      lay(shovel, [0.46, 1.04, 0.86], [0.46, 0.02, 0.62]);
    } else shovel.visible = false;
    at(load, P.load);
    const dug = n.hole ?? 0;
    hole.visible = planting && dug > 0.05;
    spoil.visible = planting && (n.spoil ?? 0) > 0.05;
    spoil.scale.setScalar(Math.max(0.1, n.spoil ?? 0));
    at(pot, P.pot, planting ? ([BD.pot[0], 0, BD.pot[2]] as V) : null);
    pot.rotation.z = (n.potRot ?? 0) * 1.45;
    inPot.root.visible = (n.potFull ?? 1) > 0.5 && !P.shrub && (n.planted ?? 0) < 0.5;
    if (planting && (P.shrub || (n.planted ?? 0) > 0.5)) {
      newShrub.root.visible = true;
      place(newShrub.root, P.shrub ?? BD.hole);
    } else newShrub.root.visible = false;
    at(board, P.board);
  });
  // Not among drive's spots: this use isn't one of its scripts.
  out.spots = { ...out.spots, xwPestCheck: pests.spot };
  const bedAway = out.away!;
  out.away = (o, t) => {
    bedAway(o, t);
    pests.update(t);
  };
  out.work = marker(g, 0, BD.top + 0.05, 0.25);
}

// =============================================================================================
// 잔디 깎는 기계 (lawnMower, 1 × 1).

function lawnMower(g: THREE.Group, out: Built) {
  // A patch of uncut grass under it, standing tufts, and the strips it leaves.
  for (let i = 0; i < 18; i++) part(g, box(0.012, 0.07 + (i % 3) * 0.02, 0.006), '#6fae3f', -0.44 + ((i * 53) % 90) * 0.0098, 0.04, -0.42 + ((i * 29) % 80) * 0.0104, { ry: i, outline: false });
  const strips = [MW.lane1, MW.lane2].map((z, i) => {
    const s = group(g, i ? -MW.reach : MW.reach, 0.006, z);
    part(s, box(1, 0.004, 0.52), i ? shade(GRASS_CUT, 0.94) : GRASS_CUT, i ? 0.5 : -0.5, 0, 0, { outline: false });
    s.visible = false;
    return s;
  });
  const m = group(g);
  part(m, rbox(0.46, 0.12, 0.5, 0.05), '#d32f2f', 0, 0.16, -0.02);
  part(m, rbox(0.3, 0.04, 0.34, 0.015), '#ad2424', 0, 0.235, -0.04);
  for (const sx of [-1, 1]) {
    part(m, cyl(0.07, 0.07, 0.04, 14), BLACK, sx * 0.25, 0.07, 0.17, { rz: Math.PI / 2 });
    part(m, cyl(0.07, 0.07, 0.04, 14), BLACK, sx * 0.25, 0.07, -0.2, { rz: Math.PI / 2 });
    part(m, cyl(0.025, 0.025, 0.044, 8), '#cfd8dc', sx * 0.25, 0.07, 0.17, { rz: Math.PI / 2, outline: false });
    rod(m, v3(sx * 0.19, 0.2, 0.22), v3(sx * 0.2, 0.94, MW.handle - 0.3), 0.012, '#37474f');
  }
  part(m, cyl(0.012, 0.012, 0.42, 8), BLACK, 0, 0.94, MW.handle - 0.3, { rz: Math.PI / 2, outline: false });
  part(m, cyl(0.014, 0.014, 0.38, 8), '#d32f2f', 0, 0.89, MW.handle - 0.36, { rz: Math.PI / 2, outline: false });
  // The engine, its recoil and tank.
  part(m, rbox(0.17, 0.15, 0.17, 0.03), '#37474f', 0, 0.33, -0.08);
  part(m, cyl(0.07, 0.07, 0.05, 14), '#607d8b', 0, 0.43, -0.08);
  part(m, rbox(0.1, 0.06, 0.08, 0.015), YELLOW, 0.06, 0.3, 0.05);
  const handleOfCord = part(m, box(0.05, 0.016, 0.016), BLACK, 0, 0.48, -0.05, { outline: false });
  // The grass box behind, up against the handle.
  const catcher = group(g);
  part(catcher, rbox(0.36, 0.22, 0.28, 0.03), '#37474f', 0, 0.11, 0);
  part(catcher, box(0.3, 0.012, 0.22), GRASS_CUT, 0, 0.21, 0, { outline: false });
  const catcherOn = part(m, rbox(0.36, 0.22, 0.28, 0.03), '#37474f', 0, 0.23, 0.38);
  const clip = puffs(g, 7, GRASS_CUT, 0.017);
  const pile = mound(g, GRASS_CUT, 0.18, 0.1, 0.58, 0.95);
  const spots: Record<string, Spot> = { mowLawn: standAt(g, 'mlMow', MW.handle) };
  spots['*'] = spots.mowLawn;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(m, P.mower, [0, 0, 0]);
    m.rotation.y = n.my ?? 0;
    const run = n.run ?? 0;
    if (run > 0.5) m.position.y = 0.004 * Math.abs(Math.sin(t * 55));
    handleOfCord.position.y = 0.48 + (n.cord ?? 0) * 0.14;
    strips[0].visible = !!now && (n.s1 ?? 0) > 0.01;
    strips[0].scale.x = Math.max(0.01, (n.s1 ?? 0) * (MW.reach * 2));
    strips[1].visible = !!now && (n.s2 ?? 0) > 0.01;
    strips[1].scale.x = Math.max(0.01, (n.s2 ?? 0) * (MW.reach * 2));
    const c = P.mower;
    clip(run, c ? c[0] : 0, 0.06, c ? c[2] : 0, 0.14, t, 0.3, 1.1);
    at(catcher, P.catcher);
    catcherOn.visible = !P.catcher;
    pile.visible = !!now && (n.box ?? 0) + (n.s2 ?? 0) > 1.2;
  });
  out.work = marker(g, 0, 0.94, MW.handle - 0.3);
}

// =============================================================================================
// 외바퀴 수레 (wheelbarrow, 1 × 1): origin at the wheel on the ground, its handles running back along +z.

function wheelbarrow(g: THREE.Group, out: Built) {
  const b = group(g);
  const body = group(b);
  part(body, cyl(0.15, 0.15, 0.05, 16), BLACK, 0, 0.15, 0, { rz: Math.PI / 2 });
  part(body, cyl(0.06, 0.06, 0.056, 12), '#cfd8dc', 0, 0.15, 0, { rz: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) {
    rod(body, v3(sx * 0.03, 0.15, 0), v3(sx * 0.24, 0.54, 0.95), 0.016, ORANGE);
    part(body, cyl(0.02, 0.02, 0.13, 8), BLACK, sx * 0.24, 0.55, 1.0, { rx: 1.2, outline: false });
    rod(body, v3(sx * 0.2, 0.38, 0.62), v3(sx * 0.2, 0.0, 0.7), 0.014, ORANGE);
  }
  // The steel tray: sloped in front.
  const tray = group(body, 0, 0.42, 0.42);
  part(tray, rbox(0.56, 0.05, 0.54, 0.015), '#37834d', 0, -0.05, 0);
  for (const sx of [-1, 1]) part(tray, box(0.03, 0.2, 0.54), '#2e6e40', sx * 0.28, 0.05, 0, { rz: sx * 0.2 });
  part(tray, box(0.56, 0.2, 0.03), '#2e6e40', 0, 0.05, 0.27, { rx: 0.2 });
  part(tray, box(0.56, 0.24, 0.03), '#2e6e40', 0, 0.06, -0.3, { rx: -0.5 });
  const soil = group(tray);
  const top = part(soil, ball(0.26), SOIL, 0, 0.07, -0.02);
  top.scale.set(1.0, 0.48, 1.0);
  // The little heap it's loaded from, and where it's tipped.
  const heap = mound(g, SOIL, 0.34, 0.3, WB.heap[0], WB.heap[2]);
  const shovel = shovelMesh(g);
  const load = soilLoad(g);
  const dumped = mound(g, SOIL, 0.26, 0.22, WB.dumpAt[0] + 0.3, WB.dumpAt[2]);
  const dust = puffs(g, 5, '#a1887f', 0.06);
  const spots: Record<string, Spot> = { haulSoil: standAt(g, 'mlHaul', 0.68) };
  spots['*'] = spots.haulSoil;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(b, P.barrow, WB.home);
    const tilt = n.tilt ?? 0;
    const tip = n.tip ?? 0;
    b.rotation.set(-0.2 * tilt - 0.85 * tip, n.by ?? 0, 0, 'YXZ');
    const loaded = n.load ?? 0;
    soil.visible = loaded > 0.05;
    soil.scale.set(Math.min(1, loaded + 0.2), Math.max(0.2, loaded), Math.min(1, loaded + 0.2));
    heap.scale.setScalar(Math.max(0.5, now ? n.heap ?? 1 : 1));
    if (P.shG && P.shB) lay(shovel, P.shG, P.shB);
    else lay(shovel, [-0.62, 1.15, 0.22], [-0.9, 0.05, 0.22]);
    at(load, P.load);
    const d = n.dumped ?? 0;
    dumped.visible = !!now && d > 0.05;
    dumped.scale.setScalar(Math.max(0.1, d));
    dust(tip > 0.2 ? tip : 0, WB.dumpAt[0] + 0.3, 0.2, WB.dumpAt[2], 0.16, t, 0.4);
  });
  out.work = marker(g, 0, 0.55, 0.5);
}

// =============================================================================================
// 자재 더미 (materialPile, 2 × 1).

function palletAt(g: THREE.Object3D, x: number, z: number, w = 0.82, d = 0.66) {
  const p = group(g, x, 0, z);
  for (const q of [-1, 0, 1]) part(p, box(0.08, 0.075, d), TIMBER_D, q * (w / 2 - 0.05), 0.04, 0, { outline: false });
  for (let i = 0; i < 6; i++) part(p, box(w, 0.018, 0.09), TIMBER, 0, 0.088, -d / 2 + 0.05 + (i * (d - 0.1)) / 5, { outline: false });
  return p;
}
function materialPile(g: THREE.Group, out: Built) {
  // Cement bags, cross-stacked.
  palletAt(g, -0.5, -0.14);
  const bagTex = painted('mlCement', 128, 64, (c) => {
    c.fillStyle = '#ece8dc';
    c.fillRect(0, 0, 128, 64);
    c.fillStyle = '#c62828';
    c.fillRect(0, 0, 128, 14);
    text(c, '단단 시멘트', 64, 36, 16, '#37474f', 'center');
    text(c, '40kg', 64, 54, 11, '#607d8b', 'center');
  });
  for (let y = 0; y < 4; y++)
    for (let i = 0; i < 2; i++) {
      const hor = y % 2 === 0;
      part(g, rbox(hor ? 0.72 : 0.36, 0.1, hor ? 0.3 : 0.6, 0.04), '#e0dccf', -0.5 + (hor ? 0 : -0.18 + i * 0.36), 0.15 + y * 0.1, -0.14 + (hor ? -0.15 + i * 0.3 : 0));
    }
  picture(g, bagTex, 0.5, 0.1, -0.5, 0.35, 0.163);
  // Bricks in strapped packs, a few taken off the top.
  palletAt(g, 0.5, -0.14);
  const brickTex = painted('mlBrick', 128, 64, (c) => {
    c.fillStyle = '#c9c0b0';
    c.fillRect(0, 0, 128, 64);
    for (let y = 0; y < 5; y++)
      for (let x = -1; x < 7; x++) {
        c.fillStyle = ['#b3512f', '#a84a29', '#bd5b35'][(x + y + 9) % 3];
        c.fillRect(x * 22 + (y % 2) * 11 + 1, y * 13 + 1, 20, 11);
      }
  });
  part(g, box(0.72, 0.5, 0.56), '#a84a29', 0.5, 0.35, -0.14);
  picture(g, brickTex, 0.72, 0.5, 0.5, 0.35, 0.141);
  picture(g, brickTex, 0.56, 0.5, 0.861, 0.35, -0.14, '#ffffff', Math.PI / 2);
  picture(g, brickTex, 0.56, 0.5, 0.139, 0.35, -0.14, '#ffffff', -Math.PI / 2);
  for (const y of [0.22, 0.48]) part(g, box(0.74, 0.012, 0.58), '#263238', 0.5, y, -0.14, { outline: false });
  for (let i = 0; i < 5; i++) part(g, rbox(0.19, 0.055, 0.09, 0.006), '#b3512f', 0.33 + (i % 3) * 0.2, 0.635, -0.3 + Math.floor(i / 3) * 0.2);
  // The wall going up in front: its base courses, the mortar between.
  const brickRow = (y: number, off: number) => {
    for (let i = 0; i < 6; i++) part(g, rbox(0.2, 0.06, 0.095, 0.006), ['#b3512f', '#a84a29', '#bd5b35'][(i + (off ? 1 : 0)) % 3], -0.5 + i * 0.22 + off, y, PL.wallZ);
    part(g, box(1.28, 0.012, 0.08), '#d4cfc2', -0.5 + 0.55 + off, y + 0.036, PL.wallZ, { outline: false });
  };
  part(g, box(1.36, 0.04, 0.16), CONC, 0.05, 0.02, PL.wallZ);
  brickRow(PL.wallY - 0.03, 0);
  brickRow(PL.wallY - 0.03 + PL.course, 0.11);
  const laid = PL.slots.map((x) => part(g, rbox(0.2, 0.06, 0.095, 0.006), '#b3512f', x, PL.wallY - 0.03 + PL.course * 2, PL.wallZ));
  // A mortar tub with a hoe in it.
  part(g, cyl(0.17, 0.14, 0.12, 14), BLACK, PL.tub[0], 0.07, PL.tub[2]);
  const mortar = part(g, cyl(0.155, 0.155, 0.01, 14), '#9e9b90', PL.tub[0], 0.125, PL.tub[2], { outline: false });
  rod(g, v3(PL.tub[0] + 0.05, 0.12, PL.tub[2] - 0.05), v3(PL.tub[0] + 0.15, 0.82, PL.tub[2] - 0.34), 0.012, TIMBER);
  // The tarp, drawn across from the left; and its roll, lashed by the end when it's off.
  const roll = part(g, cyl(0.07, 0.07, 0.6, 12), TARP, -0.92, 0.1, -0.12, { rx: Math.PI / 2 });
  const tarp = group(g, -0.96, 0, 0);
  part(tarp, rbox(1.94, 0.74, 0.74, 0.1), TARP, 0.97, 0.37, -0.12);
  for (let i = 0; i < 5; i++) part(tarp, box(0.012, 0.76, 0.76), shade(TARP, 0.82), 0.25 + i * 0.36, 0.37, -0.12, { outline: false });
  const ropes = [-0.88, 0.88].map((x) => {
    const r = rod(g, v3(x, 0.72, 0.24), v3(x, 0.05, 0.38), 0.006, '#fff176');
    r.visible = false;
    return r;
  });
  const bags = [0.3, -0.28].map((x) => {
    const b = part(g, rbox(0.3, 0.08, 0.18, 0.035), '#b8a57f', x, 0.76, 0.1);
    b.visible = false;
    return b;
  });
  const rain = puffs(g, 16, '#90caf9', 0.012);
  // In hand.
  const trowel = trowelMesh(g);
  const brick = part(g, rbox(0.2, 0.06, 0.095, 0.006), '#b3512f', 0, 0, 0);
  const mudOn = part(brick, box(0.04, 0.05, 0.09), '#c9c6ba', 0.1, 0, 0, { outline: false });
  const level = levelMesh(g);
  const sandbag = part(g, rbox(0.3, 0.08, 0.18, 0.035), '#b8a57f', 0, 0, 0);
  const board = boardMesh(g, planPaper());
  // The two sent off.
  const a = person(g, LOOKS.a, -0.48, 1.42, Math.PI, YELLOW);
  const b = person(g, LOOKS.c, 0.48, 1.42, Math.PI, '#fafafa');
  const spots: Record<string, Spot> = {
    stackBricks: standAt(g, 'mlBricks', 0.84),
    coverMaterials: standAt(g, 'mlCover', 0.8),
    manualLabor_assignCrew: standAt(g, 'mlAssign', 0.62),
  };
  spots['*'] = spots.stackBricks;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const covering = now === 'coverMaterials';
    laid.forEach((m, i) => (m.visible = now !== 'stackBricks' || i < Math.round(n.laid ?? 0)));
    at(trowel, P.trowel);
    at(brick, P.brick);
    mudOn.visible = (n.mud ?? 0) > 0.5;
    at(level, P.level);
    mortar.position.y = 0.125 + ((n.mixing ?? 0) > 0.5 ? 0.004 * Math.sin(t * 14) : 0);
    const tv = covering ? n.tarp ?? 0 : 0;
    tarp.visible = tv > 0.02;
    tarp.scale.x = Math.max(0.03, tv);
    roll.visible = !covering || tv < 0.95;
    ropes[0].visible = covering && (n.knots ?? 0) > 1.5;
    ropes[1].visible = covering && (n.knots ?? 0) > 0.5;
    bags[0].visible = covering && (n.bags ?? 0) > 0.5;
    bags[1].visible = covering && (n.bags ?? 0) > 1.5;
    at(sandbag, P.sandbag);
    rain(covering ? n.rain ?? 0 : 0, 0, 2.3, 0.1, 0.9, t, -2.2, 1.5);
    at(board, P.board);
    comes(a, n.a ?? 0, -0.48, 1.42, -1.6, t);
    comes(b, n.b ?? 0, 0.48, 1.42, 1.6, t);
    a.opts.nod = 0.1 + (n.aNod ?? 0) * 0.35;
    b.opts.nod = 0.1 + (n.bNod ?? 0) * 0.35;
  });
  out.work = marker(g, 0, 0.3, PL.wallZ);
}

// =============================================================================================
// 포장 구역 (mlPavingBed, 3 × 2).

function pavingBed(g: THREE.Group, out: Built, W: number, D: number) {
  const hw = W / 2;
  const hd = D / 2;
  part(g, box(W - 0.04, 0.05, D - 0.04), SAND, 0, 0.03, 0, { outline: false });
  // Edging stones along the back and both sides, set on their mortar haunch.
  const curb = (x: number, z: number, w: number, d: number) => {
    part(g, rbox(w - 0.012, 0.18, d - 0.012, 0.012), CONC, x, 0.1, z);
    part(g, box(w, 0.02, d + 0.03), CONC_D, x, 0.01, z, { outline: false });
  };
  for (let i = 0; i < 6; i++) curb(-hw + 0.25 + i * 0.5, -hd + 0.06, 0.5, 0.12);
  for (let i = 0; i < 3; i++) {
    curb(-hw + 0.06, -hd + 0.37 + i * 0.5, 0.12, 0.5);
    curb(hw - 0.06, -hd + 0.37 + i * 0.5, 0.12, 0.5);
  }
  // The laid area: interlocking block in two reds, a soldier course down its front.
  const blockTex = painted('mlPavers', 256, 128, (c) => {
    c.fillStyle = '#7d7468';
    c.fillRect(0, 0, 256, 128);
    const cols = ['#a65f47', '#8f4f3c', '#b07058', '#7f7f78'];
    for (let y = 0; y < 8; y++)
      for (let x = -1; x < 12; x++) {
        c.fillStyle = cols[(x * 3 + y * 5 + 16) % 4];
        c.fillRect(x * 22 + (y % 2) * 11 + 1, y * 16 + 1, 20, 14);
      }
  });
  const fieldD = PV.row - 0.16 + hd - 0.12;
  picture(g, blockTex, W - 0.24, fieldD, 0, 0.082, -hd + 0.12 + fieldD / 2, '#ffffff', 0, -Math.PI / 2);
  // The rows still to lay, each its own block, and the string they go to.
  const slotB = PV.slots.map((x, i) => part(g, rbox(0.25, 0.06, 0.13, 0.006), i % 2 ? '#8f4f3c' : '#a65f47', x, PV.top + 0.02, PV.row));
  for (const x of [-1.34, 1.34]) part(g, box(0.03, 0.34, 0.03), TIMBER, x, 0.17, PV.row - 0.12);
  rod(g, v3(-1.34, 0.22, PV.row - 0.12), v3(1.34, 0.22, PV.row - 0.12), 0.003, '#ff5252');
  // Screed rails and board, the sand still loose ahead of them.
  const screedB = part(g, rbox(0.9, 0.05, 0.06, 0.008), TIMBER, 0, 0, 0);
  const smooth = group(g, -1.28, 0.058, PV.screed + 0.28);
  part(smooth, box(1, 0.004, 0.42), shade(SAND, 1.1), 0.5, 0, 0, { outline: false });
  // A pack of block on its pallet at the right, a bucket of joint sand and a broom.
  const P0 = PV.pile;
  palletAt(g, P0[0], P0[2] - 0.04, 0.44, 0.44);
  for (let y = 0; y < 5; y++) for (let i = 0; i < 2; i++) part(g, rbox(0.25, 0.058, 0.13, 0.006), y % 2 ? '#a65f47' : '#8f4f3c', P0[0] - 0.02, 0.135 + y * 0.06, P0[2] - 0.12 + i * 0.15);
  const cones = [[-1.3, 0.92], [1.3, 0.92]] as const;
  for (const [x, z] of cones) {
    part(g, box(0.2, 0.02, 0.2), BLACK, x, 0.01, z);
    part(g, cyl(0.018, 0.075, 0.3, 12), ORANGE, x, 0.17, z);
    part(g, cyl(0.04, 0.052, 0.06, 12), '#fafafa', x, 0.2, z, { outline: false });
  }
  label(g, `${BRAND} 보도 포장`, 0.56, 0.1, -0.7, 0.22, -hd + 0.125, '#37474f', '#ffffff');
  // In hand.
  const block = part(g, rbox(0.25, 0.06, 0.13, 0.006), '#a65f47', 0, 0, 0);
  const mallet = malletMesh(g);
  const level = levelMesh(g);
  const broom = group(g);
  part(broom, cyl(0.014, 0.014, 1.2, 8), TIMBER, 0, -0.6, 0, { outline: false });
  part(broom, rbox(0.42, 0.05, 0.08, 0.012), '#37474f', 0, -1.2, 0);
  const sandAt = puffs(g, 6, SAND, 0.02);
  const spots: Record<string, Spot> = { mlLayPaving: standAt(g, 'mlPave', 1.22) };
  spots['*'] = spots.mlLayPaving;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    slotB.forEach((m, i) => (m.visible = !now || i < Math.round(n.laid ?? 0)));
    at(block, P.block);
    at(mallet, P.mallet);
    at(level, P.level);
    at(screedB, P.screedB);
    smooth.visible = !!now;
    smooth.scale.x = Math.max(0.02, N && P.screedB ? (P.screedB[0] + 1.28) : 2.56);
    if (P.broomG && P.broomH) {
      broom.visible = true;
      lay(broom, P.broomG, P.broomH);
      sandAt(0.8, P.broomH[0], 0.1, P.broomH[2], 0.1, t, 0.2, 1.4);
    } else {
      broom.visible = false;
      sandAt(0, 0, 0, 0, 0, t);
    }
  });
  out.work = marker(g, 0, PV.top + 0.03, PV.row);
}

// =============================================================================================
// 묘목 야적장 (mlTreeYard, 3 × 1).

function treeMesh(g: THREE.Object3D, h = 1.75, leaf = LEAF): THREE.Group {
  const t = group(g);
  // The root ball in burlap and twine.
  const b = part(t, ball(0.21), BURLAP, 0, 0.17, 0);
  b.scale.y = 0.82;
  for (const ry of [0, 1.05, 2.1]) {
    part(t, cyl(0.212, 0.212, 0.008, 18), TWINE, 0, 0.17, 0, { outline: false, rx: Math.PI / 2, ry });
  }
  part(t, cyl(0.09, 0.12, 0.05, 12), shade(BURLAP, 0.86), 0, 0.33, 0, { outline: false });
  // The trunk, a little staggered, and a crown of leaves.
  part(t, cyl(0.03, 0.045, h * 0.62, 8), '#6b5140', 0, 0.33 + h * 0.31, 0);
  rod(t, v3(0, h * 0.68, 0), v3(0.2, h * 0.92, 0.05), 0.016, '#6b5140');
  rod(t, v3(0, h * 0.72, 0), v3(-0.18, h * 0.95, -0.04), 0.014, '#6b5140');
  part(t, ball(0.33), leaf, 0, h * 1.02, 0);
  part(t, ball(0.24), shade(leaf, 0.86), -0.2, h * 0.92, 0.08, { outline: false });
  part(t, ball(0.24), shade(leaf, 1.14), 0.2, h * 0.95, 0.06, { outline: false });
  // A nursery tag on its trunk.
  part(t, box(0.05, 0.08, 0.004), '#fff176', 0.05, 0.62, 0.05, { outline: false });
  return t;
}
function treeYard(g: THREE.Group, out: Built) {
  part(g, box(2.9, 0.012, 0.9), '#6d6048', 0.05, 0.008, 0, { outline: false });
  // Waiting trees, tied up against a rail, the saplings behind in black pots.
  const moving = treeMesh(g, 1.75);
  place(moving, TR.home);
  place(treeMesh(g, 1.9, LEAF_D), [0.68, 0, -0.08]);
  place(treeMesh(g, 1.65, LEAF_L), [1.2, 0, 0.04]);
  for (const x of [0.2, 0.55, 0.9, 1.25]) {
    part(g, cyl(0.08, 0.06, 0.15, 10), BLACK, x, 0.08, -0.36);
    part(g, cyl(0.012, 0.016, 0.42, 6), '#6b5140', x, 0.32, -0.36);
    part(g, ball(0.11), LEAF_L, x, 0.58, -0.36);
  }
  rod(g, v3(-0.1, 0.92, -0.2), v3(1.42, 0.92, -0.2), 0.016, TIMBER_D);
  for (const x of [-0.08, 1.4]) part(g, cyl(0.022, 0.026, 0.94, 8), TIMBER_D, x, 0.47, -0.2);
  // The labels on the row.
  const tag = painted('mlTreeTag', 128, 64, (c) => {
    c.fillStyle = '#fffde7';
    c.fillRect(0, 0, 128, 64);
    text(c, '이팝나무 H2.0', 64, 22, 14, '#33691e', 'center');
    text(c, '뿌리분 / 12주', 64, 46, 12, '#455a64', 'center');
  });
  part(g, box(0.34, 0.2, 0.012), TIMBER_D, -0.3, 0.72, -0.3);
  picture(g, tag, 0.3, 0.16, -0.3, 0.72, -0.292);
  part(g, cyl(0.016, 0.016, 0.6, 6), TIMBER_D, -0.3, 0.32, -0.31, { outline: false });
  // The pit and what comes out of it.
  const pit = part(g, cyl(0.28, 0.22, 0.012, 18), SOIL_WET, TR.pit[0], 0.018, TR.pit[2], { outline: false });
  const rim = part(g, cyl(0.31, 0.32, 0.02, 18), SOIL, TR.pit[0], 0.012, TR.pit[2], { outline: false });
  const heap = mound(g, SOIL, 0.27, 0.28, TR.heap[0], TR.heap[2]);
  const filled = part(g, cyl(0.26, 0.31, 0.06, 18), SOIL, TR.pit[0], 0.03, TR.pit[2], { outline: false });
  const wet = part(g, cyl(0.22, 0.22, 0.004, 18), SOIL_WET, TR.pit[0], 0.062, TR.pit[2], { outline: false });
  const stakes = TR.stakes.map(([x, z]) => {
    const m = group(g, TR.pit[0] + x, 0, TR.pit[2] + z);
    part(m, cyl(0.02, 0.024, 1.2, 8), TIMBER, 0, 0.6, 0);
    return m;
  });
  const ties = TR.stakes.map(([x, z]) => rod(g, v3(TR.pit[0] + x, 0.95, TR.pit[2] + z), v3(TR.pit[0], 0.95, TR.pit[2]), 0.006, TWINE));
  // In hand.
  const shovel = shovelMesh(g);
  const load = soilLoad(g);
  const mallet = malletMesh(g, TIMBER_D);
  const stake = part(g, cyl(0.02, 0.024, 1.0, 8), TIMBER, 0, 0, 0);
  const can = canMesh(g);
  const drops = puffs(g, 7, '#90caf9', 0.014);
  const spots: Record<string, Spot> = { mlPlantTree: standAt(g, 'mlTree', 0.7, -0.74) };
  spots['*'] = spots.mlPlantTree;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(moving, P.tree, TR.home);
    moving.rotation.z = n.tilt ?? 0;
    const dug = n.pit ?? 0;
    pit.visible = !!now && dug > 0.02;
    pit.scale.setScalar(Math.max(0.2, dug));
    rim.visible = pit.visible;
    rim.scale.setScalar(Math.max(0.2, dug));
    heap.visible = !!now && (n.heap ?? 0) > 0.03;
    heap.scale.setScalar(Math.max(0.15, n.heap ?? 0));
    filled.visible = !!now && (n.fill ?? 0) > 0.1;
    filled.scale.y = Math.max(0.2, n.fill ?? 0);
    wet.visible = !!now && (n.wet ?? 0) > 0.3;
    const st = n.stakes ?? 0;
    stakes.forEach((m, i) => (m.visible = !!now && i < st));
    ties.forEach((m) => (m.visible = !!now && (n.tied ?? 0) > 0.5));
    if (P.shG && P.shB) lay(shovel, P.shG, P.shB);
    else lay(shovel, [TR.pit[0] + 0.72, 1.06, 0.58], [TR.pit[0] + 0.78, 0.02, 0.4]);
    at(load, P.load);
    at(mallet, P.mallet);
    at(stake, P.stake ? ([P.stake[0], P.stake[1] - 0.45, P.stake[2]] as V) : null);
    at(can.root, P.can, now ? TR.can : null);
    can.tilt.rotation.z = (n.canTip ?? 0) * 0.75;
    const pour = n.pour ?? 0;
    if (pour > 0.05 && P.can) drops(pour, P.can[0] - 0.22, P.can[1] + 0.05, P.can[2], 0.04, t, -0.8, 1.1);
    else drops(0, 0, 0, 0, 0, t);
  });
  out.work = marker(g, TR.pit[0], 0.1, TR.pit[2]);
}

// =============================================================================================
// 소형 굴착기 (mlExcavator, 3 × 3).

function excavator(g: THREE.Group, out: Built) {
  // A stretch of dug-over ground for it to work on, the trench and its spoil heap.
  part(g, box(2.7, 0.01, 2.0), '#7a6a4d', 0, 0.006, 0.42, { outline: false });
  const trench = group(g, EX.trench[0], EX.trench[1], EX.trench[2] - 0.32);
  part(trench, box(0.5, 0.012, 1), SOIL_WET, 0, 0, 0.5, { outline: false });
  for (const x of [-0.27, 0.27]) part(trench, box(0.05, 0.03, 1), SOIL, x, 0.01, 0.5, { outline: false });
  const spoil = mound(g, SOIL, 0.36, 0.34, EX.spoil[0], EX.spoil[2]);
  // Tracks and undercarriage.
  for (const sx of [-1, 1]) {
    const x = sx * 0.5;
    part(g, rbox(0.28, 0.24, 1.32, 0.11), '#2a2c2f', x, 0.13, -0.68);
    part(g, rbox(0.17, 0.09, 1.05, 0.03), '#50565b', x, 0.15, -0.68, { outline: false });
    for (const z of [-1.2, -0.16]) part(g, cyl(0.1, 0.1, 0.18, 14), YELLOW_D, x, 0.13, z, { rz: Math.PI / 2, outline: false });
    for (let i = 0; i < 12; i++) part(g, box(0.285, 0.012, 0.04), '#1b1c1e', x, 0.26, -1.24 + i * 0.1, { outline: false });
  }
  part(g, rbox(0.8, 0.18, 0.9, 0.03), '#3a3d40', 0, 0.22, -0.68);
  // The dozer blade across the front.
  part(g, rbox(1.22, 0.24, 0.05, 0.02), YELLOW, 0, 0.14, -0.04);
  for (const sx of [-1, 1]) rod(g, v3(sx * 0.32, 0.22, -0.2), v3(sx * 0.32, 0.18, -0.05), 0.022, '#50565b');
  // The turntable: engine housing behind the seat, counterweight, step, canopy on four posts so the driver shows.
  part(g, cyl(0.42, 0.42, 0.06, 20), '#26282a', 0, 0.34, -0.68);
  part(g, rbox(1.14, 0.2, 1.3, 0.05), YELLOW, 0, 0.46, -0.72);
  part(g, rbox(1.08, 0.46, 0.46, 0.08), YELLOW, 0, 0.77, -1.12);
  part(g, rbox(1.1, 0.12, 0.28, 0.05), '#32363a', 0, 0.54, -1.3);
  part(g, rbox(0.68, 0.03, 0.7, 0.01), '#3f4347', 0, EX.floor, -0.56);
  for (let i = 0; i < 5; i++) part(g, box(0.7, 0.012, 0.012), BLACK, 0, 0.77, -1.02 - i * 0.05, { outline: false });
  part(g, box(0.5, 0.11, 0.003), BLACK, 0.3, 0.84, -0.888, { outline: false });
  // The seat, the side consoles and their levers.
  part(g, rbox(0.46, 0.09, 0.44, 0.04), '#23262a', EX.seat[0], EX.seat[1] - 0.06, EX.seat[2]);
  part(g, rbox(0.44, 0.48, 0.09, 0.04), '#23262a', EX.seat[0], EX.seat[1] + 0.2, EX.seat[2] - 0.24);
  part(g, cyl(0.06, 0.08, 0.34, 10), '#3f4347', EX.seat[0], EX.floor + 0.18, EX.seat[2]);
  const levers = [0.2, -0.2].map((sx) => {
    part(g, rbox(0.11, 0.3, 0.32, 0.02), '#2f3235', sx * 1.75, 0.82, -0.56);
    const lv = group(g, sx, 0.96, -0.42);
    part(lv, cyl(0.009, 0.009, 0.2, 6), CHROME, 0, 0.09, 0, { outline: false });
    part(lv, ball(0.024), BLACK, 0, 0.19, 0, { outline: false });
    return lv;
  });
  const panel = group(g, -0.26, 0.98, -0.5);
  part(panel, box(0.1, 0.02, 0.14), BLACK, 0, 0, 0);
  const gauge = ownLit(panel, box(0.05, 0.004, 0.03), '#37474f', 0, 0.013, 0.02);
  // Grab rail, canopy.
  rod(g, v3(-0.42, 0.68, -0.54), v3(-0.42, 1.36, -0.54), 0.014, '#fafafa');
  part(g, box(0.1, 0.03, 0.26), YELLOW_D, -0.67, 0.42, -0.62);
  part(g, box(0.1, 0.03, 0.26), YELLOW_D, -0.73, 0.26, -0.62);
  for (const [x, z] of [[-0.48, -0.26], [0.48, -0.26], [-0.48, -0.98], [0.48, -0.98]] as const) rod(g, v3(x, EX.floor, z), v3(x, 2.0, z * 0.96), 0.024, '#2a2c2f');
  part(g, rbox(1.12, 0.06, 0.92, 0.03), '#2a2c2f', 0, 2.02, -0.62);
  const beacon = ownLit(g, cyl(0.04, 0.05, 0.08, 12), '#8a5c1a', 0.42, 2.09, -0.92);
  label(g, BRAND, 0.42, 0.1, -0.26, 0.5, -0.07, YELLOW, '#263238');
  picture(g, painted('mlDigger', 192, 48, (c) => {
    c.fillStyle = YELLOW;
    c.fillRect(0, 0, 192, 48);
    text(c, 'DD-35', 96, 25, 28, '#263238', 'center');
  }), 0.58, 0.14, 0, 0.78, -0.888);
  // The boom's foot, boom, arm and bucket, each hung from the last.
  part(g, rbox(0.3, 0.26, 0.24, 0.03), YELLOW_D, EX.pivot[0], EX.pivot[1] - 0.1, EX.pivot[2] - 0.08);
  const boomG = group(g, EX.pivot[0], EX.pivot[1], EX.pivot[2]);
  boomG.rotation.order = 'YXZ';
  part(boomG, rbox(0.14, 0.16, 1.02, 0.03), YELLOW, 0, 0, 0.47);
  part(boomG, cyl(0.032, 0.032, 0.62, 8), '#d9dde0', 0.09, -0.07, 0.34, { rx: Math.PI / 2 - 0.1, outline: false });
  part(boomG, cyl(0.042, 0.042, 0.34, 8), '#2f3235', 0.09, -0.07, 0.12, { rx: Math.PI / 2 - 0.1, outline: false });
  const armG = group(boomG, 0, 0, 0.95);
  part(armG, cyl(0.05, 0.05, 0.18, 10), '#2f3235', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(armG, rbox(0.11, 0.12, 0.76, 0.025), YELLOW_D, 0, 0, 0.36);
  part(armG, cyl(0.026, 0.026, 0.42, 8), '#d9dde0', 0, 0.09, 0.28, { rx: Math.PI / 2, outline: false });
  const bucketG = group(armG, 0, 0, 0.72);
  part(bucketG, cyl(0.04, 0.04, 0.16, 8), '#2f3235', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(bucketG, rbox(0.3, 0.2, 0.2, 0.04), '#444a4e', 0, -0.01, 0.13);
  part(bucketG, box(0.3, 0.02, 0.1), '#32363a', 0, -0.1, 0.26);
  for (const x of [-0.11, 0, 0.11]) part(bucketG, box(0.04, 0.02, 0.07), CHROME, x, -0.1, 0.33, { outline: false });
  const inBucket = part(bucketG, ball(0.13), SOIL, 0, 0.09, 0.13, { outline: false });
  inBucket.scale.y = 0.55;
  // Exhaust stack.
  part(g, cyl(0.022, 0.022, 0.34, 8), BLACK, -0.34, 1.16, -1.08);
  const smoke = puffs(g, 6, '#6d6f72', 0.05);
  const dust = puffs(g, 6, '#a1887f', 0.07);
  // Depth staff when it's measured.
  const staff = group(g);
  part(staff, box(0.04, 1.2, 0.012), '#fafafa', 0, -0.6, 0);
  for (let i = 0; i < 6; i++) part(staff, box(0.042, 0.1, 0.014), '#d32f2f', 0, -0.05 - i * 0.2, 0, { outline: false });
  const spots: Record<string, Spot> = { mlDigTrench: standAt(g, 'mlDig', 1.0, -0.58) };
  spots['*'] = spots.mlDigTrench;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const eng = n.engine ?? 0;
    const sh = eng > 0.5 ? 0.0035 * Math.sin(t * 60) : 0;
    boomG.position.y = EX.pivot[1] + sh;
    boomG.rotation.set(-(n.boom ?? 0.92), n.swing ?? 0, 0, 'YXZ');
    armG.rotation.x = -(n.arm ?? -1.75);
    bucketG.rotation.x = -(n.bkt ?? 1.0);
    inBucket.visible = (n.full ?? 0) > 0.1;
    inBucket.scale.setScalar(Math.max(0.3, n.full ?? 0));
    const trenched = now ? Math.max(0.03, 0.2 + (n.trench ?? 0) * 0.56) : 0.76;
    trench.scale.z = trenched;
    const sp = now ? n.spoil ?? 0 : 1;
    spoil.scale.setScalar(Math.max(0.3, 0.55 + sp * 0.45));
    levers.forEach((l, i) => (l.rotation.x = i ? (n.boom ?? 0.92) * 0.3 - 0.18 : (n.bkt ?? 1) * 0.16));
    setLit(gauge, eng > 0.5 ? '#76ff03' : '#37474f');
    setLit(beacon, eng > 0.5 && Math.floor(t * 3) % 2 === 0 ? '#ffb300' : '#8a5c1a');
    smoke(eng, -0.34, 1.34, -1.08, 0.03, t, 0.7, 0.9);
    const dumping = (n.swing ?? 0) > 0.8 && (n.bkt ?? 0) < -0.2;
    dust(dumping ? 0.8 : 0, EX.spoil[0], 0.3, EX.spoil[2], 0.2, t, 0.5);
    at(staff, P.staff);
  });
  out.work = marker(g, -0.2, 1.14, -0.42);
}

// =============================================================================================
// 측량 말뚝 (mlSurveyLine, 3 × 1).

function surveyLine(g: THREE.Group, out: Built) {
  // Two batter boards, the stakes between, and the pink line that runs from one to the other.
  const stakes = [SV.a, SV.b].map((s) => {
    const m = group(g, s[0], 0, s[1]);
    part(m, box(0.05, 0.42, 0.05), TIMBER, 0, 0.21, 0);
    part(m, cyl(0.05, 0.03, 0.05, 4), '#ff5252', 0, 0.45, 0, { ry: Math.PI / 4, outline: false });
    part(m, box(0.03, 0.14, 0.004), '#ff4081', 0.03, 0.34, 0.03, { outline: false });
    return m;
  });
  for (const x of [-1.42, -1.14, 1.14, 1.42]) part(g, box(0.04, 0.44, 0.04), TIMBER_D, x, 0.22, 0.42);
  for (const x of [-1.28, 1.28]) part(g, box(0.36, 0.05, 0.02), '#d7ccc8', x, 0.4, 0.42);
  const line = rod(g, v3(SV.a[0], SV.line, SV.a[1]), v3(SV.b[0], SV.line, SV.b[1]), 0.004, '#ff4081');
  const slack = rod(g, v3(SV.a[0], SV.line, SV.a[1]), v3(SV.b[0], SV.line - 0.06, SV.b[1]), 0.004, '#ff4081');
  // Pegs and marks along the line, spray marks on the ground.
  for (const x of [-0.72, -0.1, 0.5]) {
    part(g, box(0.03, 0.2, 0.03), TIMBER, x, 0.1, SV.a[1]);
    part(g, box(0.1, 0.002, 0.018), '#ff5252', x, 0.006, SV.a[1] + 0.02, { outline: false });
  }
  label(g, '기준점 BM-3', 0.22, 0.07, -1.28, 0.42, 0.432, '#fff176', '#37474f');
  // The auto level on its tripod.
  const [tx, tz] = SV.tripod;
  for (const [dx, dz] of [[-0.26, 0.18], [0.26, 0.18], [0, -0.32]] as const) rod(g, v3(tx, SV.scope - 0.1, tz), v3(tx + dx, 0.0, tz + dz), 0.014, '#c9a35e');
  part(g, cyl(0.07, 0.07, 0.02, 14), '#546e7a', tx, SV.scope - 0.09, tz);
  part(g, rbox(0.1, 0.06, 0.24, 0.02), YELLOW, tx, SV.scope - 0.01, tz);
  part(g, cyl(0.032, 0.032, 0.1, 10), BLACK, tx, SV.scope - 0.01, tz + 0.15, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.022, 0.022, 0.05, 10), BLACK, tx, SV.scope - 0.01, tz - 0.14, { rx: Math.PI / 2, outline: false });
  const dot = ownLit(g, ball(0.012), '#3a4a2a', tx + 0.05, SV.scope + 0.02, tz + 0.02);
  // A hard case and a coil of line left by it.
  part(g, rbox(0.34, 0.2, 0.22, 0.02), '#fbc02d', tx + 0.6, 0.11, tz - 0.14);
  part(g, cyl(0.09, 0.09, 0.05, 14), '#ff80ab', tx - 0.55, 0.03, tz + 0.1);
  // The helper with the staff.
  const helper = person(g, LOOKS.b, SV.staff[0], SV.staff[1], Math.PI * 1.45, ORANGE);
  const staff = group(g);
  part(staff, box(0.05, 1.9, 0.015), '#fafafa', 0, 0.95, 0);
  for (let i = 0; i < 18; i++) part(staff, box(0.025, 0.05, 0.016), i % 3 === 0 ? '#d32f2f' : '#263238', 0.01, 0.08 + i * 0.1, 0.001, { outline: false });
  const mallet = malletMesh(g);
  const book = group(g);
  part(book, box(0.16, 0.22, 0.016), '#ffb300', 0, 0, 0, { rx: -0.4 });
  part(book, box(0.14, 0.19, 0.018), '#fafafa', 0, 0, 0.002, { rx: -0.4, outline: false });
  const spots: Record<string, Spot> = { mlStakeOut: standAt(g, 'mlStake', 0.7, -1.2) };
  spots['*'] = spots.mlStakeOut;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    stakes[0].position.y = now ? 0.18 * ((n.aIn ?? 0) - 1) * -1 : 0;
    stakes[1].position.y = now ? 0.18 * ((n.bIn ?? 0) - 1) * -1 : 0;
    const taut = n.taut ?? 0;
    line.visible = !now || taut > 0.5;
    slack.visible = !!now && (n.line ?? 0) > 0.5 && taut <= 0.5;
    setLit(dot, now ? '#76ff03' : '#3a4a2a');
    const there = now ? (n.staff ?? 0) * (1 - (n.leave ?? 0)) : 0;
    comes(helper, there, SV.staff[0], SV.staff[1], 1.4, t);
    staff.visible = there > 0.02;
    if (staff.visible) {
      staff.position.set(SV.staff[0] - 0.36 + 1.4 * (1 - there), 0.08 * (1 - (n.staffY ?? 0)) * Math.abs(Math.sin(t * 0.8)), SV.staff[1] + 0.08);
      const h = v3(staff.position.x + 0.03, 1.22, staff.position.z);
      helper.armL(h);
      helper.armR(v3(h.x, 1.0, h.z));
      helper.opts.nod = 0.1 + (n.sign ?? 0) * 0.14;
      helper.head.rotation.y = 0.45;
    }
    at(mallet, P.mallet);
    at(book, P.book);
  });
  out.work = marker(g, SV.a[0], 0.3, SV.a[1]);
}

// =============================================================================================
// 안전 게시판 (mlSafetyBoard, 2 × 1).

const boardTex = () =>
  painted('mlSafetyFace', 320, 256, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 320, 256);
    c.fillStyle = SAFE_GREEN;
    c.fillRect(0, 0, 320, 54);
    c.fillStyle = '#ffffff';
    c.fillRect(24, 22, 28, 10);
    c.fillRect(33, 13, 10, 28);
    text(c, '안전 제일', 188, 28, 32, '#ffffff', 'center');
    text(c, '오늘의 위험 요소', 12, 72, 16, '#37474f');
    c.fillStyle = '#eceff1';
    c.fillRect(10, 86, 196, 150);
    ['1. 굴착기 회전 반경 접근 금지', '2. 안전모·안전화 착용', '3. 맨손 들기 25kg 넘으면 둘이서'].forEach((s, i) => text(c, s, 16, 110 + i * 48, 11, '#263238'));
    c.fillStyle = '#ffc107';
    c.fillRect(216, 74, 96, 72);
    text(c, '무재해', 264, 94, 16, '#263238', 'center');
    text(c, '127일', 264, 124, 26, '#b71c1c', 'center');
    c.strokeStyle = '#90a4ae';
    c.strokeRect(216, 156, 96, 80);
    text(c, '서명', 264, 170, 12, '#607d8b', 'center');
    ['한', '오', '최'].forEach((s, i) => text(c, s, 236 + i * 26, 204, 14, '#1565c0', 'center'));
  });
function safetyBoard(g: THREE.Group, out: Built) {
  for (const x of [-0.86, 0.86]) part(g, rbox(0.08, 2.25, 0.08, 0.012), '#546e7a', x, 1.12, -0.36);
  part(g, rbox(1.84, 1.34, 0.04, 0.012), '#37474f', 0, 1.44, -0.38);
  picture(g, boardTex(), 1.74, 1.24, 0, 1.44, -0.358);
  // A little roof and a light under it for dark mornings.
  part(g, rbox(1.94, 0.04, 0.3, 0.012), SAFE_GREEN, 0, 2.2, -0.3, { rx: 0.08 });
  const lamp = ownLit(g, box(1.5, 0.018, 0.022), '#6e6a57', 0, 2.14, -0.28);
  // The hat rack and spare vests along the bottom.
  rod(g, v3(-0.76, 0.54, -0.33), v3(0.76, 0.54, -0.33), 0.014, CHROME);
  for (const [x, col] of [[-0.56, YELLOW], [-0.22, '#fafafa'], [0.12, ORANGE]] as const) {
    const dome = part(g, ball(0.115), col, x, 0.5, -0.3);
    dome.scale.y = 0.8;
    part(g, cyl(0.135, 0.135, 0.012, 16), col, x, 0.49, -0.3, { outline: false });
  }
  part(g, box(0.28, 0.42, 0.02), '#c6ff00', 0.56, 0.32, -0.32);
  part(g, box(0.28, 0.03, 0.022), '#eceff1', 0.56, 0.4, -0.32, { outline: false });
  part(g, box(0.28, 0.03, 0.022), '#eceff1', 0.56, 0.24, -0.32, { outline: false });
  // A box for the first-aid kit, and a fire extinguisher at the foot.
  part(g, rbox(0.3, 0.22, 0.14, 0.02), '#fafafa', -0.62, 0.11, -0.28);
  part(g, box(0.1, 0.03, 0.144), '#d32f2f', -0.62, 0.11, -0.28, { outline: false });
  part(g, box(0.03, 0.1, 0.144), '#d32f2f', -0.62, 0.11, -0.28, { outline: false });
  part(g, cyl(0.06, 0.06, 0.32, 12), '#d32f2f', 0.76, 0.17, -0.22);
  part(g, cyl(0.02, 0.03, 0.05, 8), BLACK, 0.76, 0.35, -0.22, { outline: false });
  // The ticks, and a pointer.
  const ticks = SB.y.map((y, i) => {
    const m = part(g, ball(0.024), SAFE_GREEN, -0.82, y - 0.06 - i * 0.02, -0.34, { outline: false });
    m.visible = false;
    return m;
  });
  const ptr = group(g);
  part(ptr, cyl(0.007, 0.007, 1, 6), '#cfd8dc', 0, -0.5, 0, { outline: false });
  // The crew listening.
  const crew = [person(g, LOOKS.a, 0.26, 1.28, Math.PI + 0.12, YELLOW), person(g, LOOKS.c, 0.72, 1.3, Math.PI - 0.08, '#fafafa'), person(g, LOOKS.d, -0.22, 1.42, Math.PI + 0.25, ORANGE)];
  const spots: Record<string, Spot> = { mlToolboxTalk: standAt(g, 'mlTalk', 0.5, -0.7) };
  spots['*'] = spots.mlToolboxTalk;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    setLit(lamp, now ? '#fff3b0' : '#6e6a57');
    ticks.forEach((m, i) => (m.visible = !!now && i < Math.round(n.tick ?? 0)));
    if (P.ptrA && P.ptrB) {
      ptr.visible = true;
      lay(ptr, P.ptrA, P.ptrB);
      tmp.set(P.ptrB[0] - P.ptrA[0], P.ptrB[1] - P.ptrA[1], P.ptrB[2] - P.ptrA[2]);
      ptr.scale.y = tmp.length();
    } else ptr.visible = false;
    crew.forEach((f, i) => {
      const [x, z] = [[0.26, 1.28], [0.72, 1.3], [-0.22, 1.42]][i];
      comes(f, now ? n.crew ?? 0 : 0, x, z, i === 1 ? 1.3 : -0.9, t);
      if (!f.root.visible) return;
      const up = n.up ?? 0;
      f.armR(up > 0.05 ? v3(x + (i === 0 ? -0.12 : 0.12), 1.05 + up * 0.7, z - 0.12) : null);
      f.opts.nod = 0.12 + (n.nod ?? 0) * 0.3 * Math.sin(t * 2 + i) ** 2 - up * 0.1;
    });
  });
  out.work = marker(g, 0, 1.4, -0.34);
}

// =============================================================================================
// 현장 사무소 (mlSiteOffice, 4 × 2).

function siteOffice(g: THREE.Group, out: Built, W: number, D: number) {
  const h = 2.4;
  const hd = D / 2 - 0.05;
  // The container: corrugated sides, corner posts, a raised floor on timbers.
  for (const x of [-1.6, 1.6]) part(g, box(0.28, 0.14, D - 0.3), TIMBER_D, x, 0.07, 0);
  part(g, rbox(W - 0.1, h, D - 0.12, 0.03), CONTAINER, 0, 0.14 + h / 2, -0.01);
  for (let i = 0; i < 26; i++) part(g, box(0.05, h - 0.06, 0.012), CONTAINER_D, -W / 2 + 0.2 + i * 0.145, 0.14 + h / 2, hd + 0.006, { outline: false });
  for (let i = 0; i < 13; i++) part(g, box(0.012, h - 0.06, 0.05), CONTAINER_D, W / 2 - 0.044, 0.14 + h / 2, -hd + 0.1 + i * 0.145, { outline: false });
  for (const [x, z] of [[-1, 1], [1, 1]] as const) part(g, box(0.1, h + 0.04, 0.1), '#1d4e80', x * (W / 2 - 0.09), 0.14 + h / 2, z * (hd - 0.03));
  part(g, box(W - 0.06, 0.08, D - 0.08), '#1d4e80', 0, 0.14 + h, 0);
  // The sign.
  const signTex = painted('mlOfficeSign', 320, 72, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 320, 72);
    c.fillStyle = SAFE_GREEN;
    c.fillRect(0, 0, 16, 72);
    text(c, `${BRAND} 현장 사무소`, 170, 28, 24, '#263238', 'center');
    text(c, '공사 관계자 외 출입 금지', 170, 56, 15, '#b71c1c', 'center');
  });
  picture(g, signTex, 1.7, 0.36, 0.5, 2.28, hd + 0.016);
  // The door with its steps at the left, a little awning.
  const door = group(g, -1.32, 0.14, hd + 0.012);
  part(door, rbox(0.82, 1.94, 0.04, 0.012), '#eceff1', 0, 0.98, 0);
  part(door, box(0.42, 0.5, 0.012), '#4f6a78', 0, 1.42, 0.022, { outline: false });
  part(door, box(0.04, 0.14, 0.04), BLACK, 0.34, 0.95, 0.03, { outline: false });
  for (let i = 0; i < 2; i++) part(g, box(0.86, 0.08, 0.26 - i * 0.1), '#607d8b', -1.32, 0.05 + i * 0.09, hd + 0.13 - i * 0.05);
  part(g, rbox(1.1, 0.03, 0.44, 0.01), '#eceff1', -1.32, 2.2, hd + 0.2, { rx: 0.1 });
  // The window in the middle, lit while someone's at it, with a shelf that drops down beneath.
  const S = OF.shelf;
  part(g, rbox(1.36, 0.9, 0.05, 0.012), '#eceff1', S[0], 1.7, hd + 0.018);
  const pane = ownLit(g, box(1.26, 0.8, 0.012), '#4b6472', S[0], 1.7, hd + 0.046);
  part(g, box(0.02, 0.8, 0.018), '#eceff1', S[0], 1.7, hd + 0.05, { outline: false });
  // Blinds half down inside the window.
  for (let i = 0; i < 6; i++) part(g, box(1.26, 0.008, 0.002), '#cfd8dc', S[0], 2.08 - i * 0.04, hd + 0.053, { outline: false });
  part(g, rbox(1.3, 0.035, 0.34, 0.01), '#b0bec5', S[0], S[1] - 0.02, S[2] - 0.02);
  for (const x of [-0.56, 0.56]) rod(g, v3(S[0] + x, S[1] - 0.04, S[2] + 0.1), v3(S[0] + x, S[1] - 0.34, hd + 0.01), 0.008, '#546e7a');
  // On the shelf: a mug, a tin of pens.
  part(g, cyl(0.036, 0.032, 0.09, 12), '#ef5350', S[0] + 0.52, S[1] + 0.045, S[2] - 0.08);
  part(g, cyl(0.04, 0.04, 0.1, 10), STEEL, S[0] - 0.54, S[1] + 0.05, S[2] - 0.1);
  for (const dx of [-0.01, 0.015]) part(g, cyl(0.004, 0.004, 0.13, 5), '#1565c0', S[0] - 0.54 + dx, S[1] + 0.13, S[2] - 0.1, { outline: false });
  // The air conditioner on the side, a rain barrel, boots drying at the door.
  part(g, rbox(0.5, 0.4, 0.3, 0.02), '#eceff1', 1.55, 0.36, hd + 0.17);
  part(g, cyl(0.15, 0.15, 0.02, 16), '#90a4ae', 1.55, 0.36, hd + 0.327, { rx: Math.PI / 2, outline: false });
  for (const dx of [-0.08, 0.08]) part(g, rbox(0.08, 0.22, 0.14, 0.03), '#37474f', -0.76 + dx, 0.11, hd + 0.1);
  // The date and weather cards.
  const C = OF.card;
  part(g, rbox(0.6, 0.42, 0.018, 0.01), '#eceff1', C[0], C[1], hd + 0.018);
  const cardTex = (k: string, day: string, sky: string) =>
    painted(k, 128, 80, (c) => {
      c.fillStyle = '#fffde7';
      c.fillRect(0, 0, 128, 80);
      text(c, '오늘 작업', 64, 14, 11, '#607d8b', 'center');
      text(c, day, 64, 40, 22, '#263238', 'center');
      text(c, sky, 64, 66, 13, '#1565c0', 'center');
    });
  const card1 = picture(g, cardTex('mlCard1', '11월 1일', '맑음 12도'), 0.52, 0.34, C[0], C[1], hd + 0.03);
  const card2 = picture(g, cardTex('mlCard2', '11월 2일', '소나기 예보'), 0.52, 0.34, C[0], C[1], hd + 0.031);
  // What's used.
  const plan = group(g, S[0] - 0.34, S[1] + 0.012, S[2]);
  const planTex = painted('mlPlan', 192, 96, (c) => {
    c.fillStyle = '#e3f0fa';
    c.fillRect(0, 0, 192, 96);
    c.strokeStyle = '#1565c0';
    c.lineWidth = 2;
    c.strokeRect(10, 10, 172, 76);
    c.beginPath();
    c.moveTo(10, 56);
    c.bezierCurveTo(60, 20, 130, 90, 182, 40);
    c.stroke();
    for (const [x, y] of [[40, 30], [78, 66], [120, 34], [160, 66]]) {
      c.beginPath();
      c.arc(x, y, 7, 0, Math.PI * 2);
      c.stroke();
    }
    text(c, '식재 평면도', 96, 24, 12, '#0d47a1', 'center');
  });
  picture(plan, planTex, 1, 0.28, 0.5, 0, 0, '#ffffff', 0, -Math.PI / 2);
  const roll = part(g, cyl(0.022, 0.022, 0.3, 10), '#e3f0fa', 0, S[1] + 0.03, S[2], { rx: Math.PI / 2 });
  const log = group(g, S[0] - 0.02, S[1] + 0.012, S[2] + 0.05);
  part(log, box(0.3, 0.018, 0.2), '#2e7d32', 0, 0, 0);
  part(log, box(0.28, 0.006, 0.18), '#fafafa', 0, 0.012, 0, { outline: false });
  const written = group(log, -0.12, 0.016, -0.07);
  const lines = [0, 1, 2, 3].map((i) => part(written, box(0.22, 0.002, 0.008), '#37474f', 0.11, 0, i * 0.04, { outline: false }));
  const stampMark = part(log, cyl(0.022, 0.022, 0.002, 12), '#d32f2f', 0.09, 0.017, 0.05, { outline: false });
  const stamp = group(g);
  part(stamp, cyl(0.02, 0.02, 0.05, 10), '#6d4c41', 0, 0, 0);
  const spots: Record<string, Spot> = { mlDailyLog: standAt(g, 'mlLog', OF.stand, S[0]) };
  spots['*'] = spots.mlDailyLog;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    setLit(pane, now ? '#ffeaa8' : '#4b6472');
    const px = n.planX ?? -0.34;
    plan.visible = !!now && (n.plan ?? 0) > 0.02;
    plan.scale.x = Math.max(0.03, px + 0.34);
    roll.visible = plan.visible;
    roll.position.x = S[0] + px;
    log.visible = !!now && (n.book ?? 0) > 0.3;
    const L = n.lines ?? 0;
    lines.forEach((m, i) => (m.visible = L > i * 0.25 + 0.05));
    stampMark.visible = (n.stamped ?? 0) > 0.5;
    at(stamp, P.stamp);
    const flipped = (n.card ?? 0) > 0.5;
    card1.visible = !flipped;
    card2.visible = flipped;
  });
  out.work = marker(g, S[0], S[1] + 0.04, S[2]);
}

// =============================================================================================
// 공구 보관함 (mlToolCrib, 2 × 1).

function toolCrib(g: THREE.Group, out: Built, W: number) {
  const hw = W / 2 - 0.04;
  const top = 1.95;
  const zb = -0.42;
  const zf = 0.1;
  // Angle-iron frame and a mesh back.
  for (const x of [-hw, 0, hw]) {
    part(g, box(0.05, top, 0.05), '#546e7a', x, top / 2, zb);
    part(g, box(0.05, top, 0.05), '#546e7a', x, top / 2, zf);
  }
  for (const y of [0.04, top]) {
    part(g, box(W - 0.08, 0.05, 0.05), '#546e7a', 0, y, zb);
    part(g, box(W - 0.08, 0.05, 0.05), '#546e7a', 0, y, zf);
    for (const x of [-hw, hw]) part(g, box(0.05, 0.05, zf - zb), '#546e7a', x, y, (zb + zf) / 2);
  }
  part(g, box(W - 0.06, 0.03, zf - zb + 0.08), '#37474f', 0, top + 0.03, (zb + zf) / 2);
  for (let i = 0; i < 9; i++) part(g, box(0.006, top - 0.08, 0.006), '#90a4ae', -hw + 0.05 + i * ((2 * hw - 0.1) / 8), top / 2, zb, { outline: false });
  for (let i = 0; i < 9; i++) part(g, box(W - 0.14, 0.006, 0.006), '#90a4ae', 0, 0.2 + i * 0.2, zb, { outline: false });
  // A hook bar, long tools hung up by their necks.
  rod(g, v3(-hw, 1.6, -0.2), v3(hw, 1.6, -0.2), 0.012, CHROME);
  const hung = group(g);
  const pick = (x: number) => {
    part(hung, cyl(0.016, 0.018, 1.0, 8), TIMBER, x, 1.08, -0.18, { outline: false });
    part(hung, box(0.42, 0.04, 0.03), '#4e555a', x, 1.56, -0.18, { rz: 0.1 });
  };
  const rake = (x: number) => {
    part(hung, cyl(0.014, 0.014, 1.16, 8), TIMBER, x, 1.0, -0.18, { outline: false });
    part(hung, box(0.34, 0.03, 0.03), '#37474f', x, 1.58, -0.18);
    for (let i = 0; i < 6; i++) part(hung, box(0.012, 0.05, 0.012), '#37474f', x - 0.14 + i * 0.056, 1.54, -0.17, { outline: false });
  };
  const spade = (x: number) => lay(shovelMesh(hung), [x, 1.62, -0.16], [x, 0.3, -0.16]);
  pick(0.82);
  spade(0.13);
  rake(-0.14);
  pick(0.62);
  // The shelf at the left: helmets, gloves, a fuel can, a tamper on the ground.
  part(g, box(0.72, 0.03, 0.36), '#546e7a', -0.56, 1.72, -0.2);
  for (const [x, col] of [[-0.74, YELLOW], [-0.42, ORANGE]] as const) {
    const d = part(g, ball(0.1), col, x, 1.8, -0.2);
    d.scale.y = 0.78;
  }
  part(g, rbox(0.26, 0.32, 0.14, 0.02), '#c62828', -0.76, 0.19, -0.2);
  part(g, box(0.1, 0.03, 0.03), BLACK, -0.76, 0.37, -0.2);
  part(g, cyl(0.14, 0.14, 0.05, 14), '#607d8b', -0.3, 0.05, -0.18);
  part(g, cyl(0.016, 0.016, 0.96, 8), TIMBER, -0.3, 0.52, -0.18, { outline: false });
  // The bench at the front left with a vice.
  const B = CR.bench;
  part(g, rbox(0.74, 0.05, 0.34, 0.01), TIMBER, B[0], B[1] - 0.04, B[2] - 0.1);
  for (const x of [-0.3, 0.3]) part(g, box(0.04, B[1] - 0.06, 0.04), '#546e7a', B[0] + x, (B[1] - 0.06) / 2, B[2] - 0.2);
  part(g, rbox(0.1, 0.07, 0.11, 0.012), '#37474f', B[0] - 0.2, B[1] + 0.02, B[2] - 0.04);
  // The checklist on the cage.
  const S = CR.sheet;
  picture(g, painted('mlToolList', 96, 128, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 96, 128);
    text(c, '공구 점검표', 48, 14, 11, '#37474f', 'center');
    ['삽', '곡괭이', '갈퀴', '다짐봉', '수레'].forEach((s, i) => {
      text(c, s, 10, 38 + i * 18, 11, '#37474f');
      c.strokeStyle = '#90a4ae';
      c.strokeRect(70, 30 + i * 18, 14, 14);
    });
  }), 0.3, 0.4, S[0], S[1], S[2] - 0.08);
  const tick = part(g, box(0.05, 0.02, 0.006), '#2e7d32', S[0] + 0.1, S[1] - 0.05, S[2] - 0.075, { outline: false });
  // The cage door on the right, hinged out; the padlock.
  const door = group(g, hw, 0, zf + 0.03);
  part(door, box(0.04, top - 0.1, 0.03), '#607d8b', -0.03, top / 2, 0);
  part(door, box(0.04, top - 0.1, 0.03), '#607d8b', -0.92, top / 2, 0);
  for (const y of [0.09, top - 0.06]) part(door, box(0.93, 0.03, 0.03), '#607d8b', -0.47, y, 0);
  for (let i = 0; i < 10; i++) part(door, box(0.006, top - 0.12, 0.006), '#a7b5bd', -0.05 - i * 0.094, top / 2, 0, { outline: false });
  for (let i = 0; i < 9; i++) part(door, box(0.9, 0.006, 0.006), '#a7b5bd', -0.47, 0.25 + i * 0.2, 0, { outline: false });
  part(door, rbox(0.05, 0.07, 0.03, 0.01), YELLOW, -0.88, 1.08, 0.025);
  label(door, '공구 대여 시 기록', 0.5, 0.09, -0.48, 1.32, 0.018, '#fff176', '#37474f');
  // What comes down.
  const shovel = shovelMesh(g);
  const file = group(g);
  part(file, box(0.2, 0.012, 0.024), '#616161', 0, 0, 0, { outline: false });
  part(file, cyl(0.012, 0.012, 0.1, 6), TIMBER, 0.14, 0, 0, { rz: Math.PI / 2, outline: false });
  const rag = part(g, rbox(0.09, 0.02, 0.09, 0.008), '#ffb74d', 0, 0, 0, { outline: false });
  const sparks = puffs(g, 5, '#ffcc80', 0.008);
  const spots: Record<string, Spot> = { mlCheckTools: standAt(g, 'mlTools', CR.stand, 0.3) };
  spots['*'] = spots.mlCheckTools;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    door.rotation.y = (n.door ?? 0) * 1.3;
    if (P.shG && P.shB) lay(shovel, P.shG, P.shB);
    else lay(shovel, CR.hang, CR.hangB);
    at(file, P.file);
    at(rag, P.rag);
    tick.visible = !!now && (n.ticks ?? 0) > 0.5;
    const f = P.file;
    sparks(f && (n.sparks ?? 0) > 0.5 ? 0.9 : 0, f ? f[0] - 0.14 : 0, f ? f[1] : 0, f ? f[2] : 0, 0.02, t, 0.08, 2.4);
  });
  out.work = marker(g, CR.bench[0], CR.bench[1], CR.bench[2]);
}

// =============================================================================================
// 골재 더미 (mlSoilHeap, 3 × 1).

function soilHeap(g: THREE.Group, out: Built, W: number) {
  // Concrete block bays with the heaps tipped in them.
  const wall = (x: number) => {
    for (let y = 0; y < 2; y++)
      for (let i = 0; i < 2; i++) part(g, rbox(0.14, 0.2, 0.43, 0.012), y ? CONC : CONC_D, x, 0.1 + y * 0.2, -0.22 + i * 0.44);
  };
  wall(-1.42);
  wall(-0.42);
  wall(0.5);
  wall(1.42);
  for (let i = 0; i < 6; i++) part(g, rbox(0.44, 0.2, 0.14, 0.012), i % 2 ? CONC : CONC_D, -W / 2 + 0.25 + i * 0.5, 0.1, -0.44);
  const gravel = mound(g, GRAVEL, 0.5, 0.68, HP.gravel[0], HP.gravel[2]);
  pebbles(gravel, 34, 0.48, 0.66);
  const soil = mound(g, SOIL, 0.46, 0.66, 0.96, 0.04, 5);
  part(soil, ball(0.06), '#7cb342', 0.08, 0.64, 0.1, { outline: false });
  // Signs on stakes.
  const sign = (x: number, s: string, bg: string) => {
    part(g, box(0.03, 0.72, 0.02), TIMBER_D, x, 0.36, -0.42);
    label(g, s, 0.3, 0.12, x, 0.7, -0.405, bg, '#ffffff');
  };
  sign(-1.1, '쇄석 25mm', '#546e7a');
  sign(1.14, '식재 토사', '#5d4037');
  // The throwing screen, propped, its mesh leaning back on two struts.
  const screen = group(g, HP.screen[0], 0, HP.screen[2]);
  const face = group(screen, 0, 0.56, 0);
  face.rotation.x = -0.42;
  for (const sx of [-1, 1]) part(face, box(0.04, 1.1, 0.04), TIMBER, sx * 0.3, 0, 0);
  for (const y of [-0.53, 0.53]) part(face, box(0.64, 0.04, 0.04), TIMBER, 0, y, 0);
  for (let i = 0; i < 8; i++) part(face, box(0.006, 1.06, 0.006), '#90a4ae', -0.26 + i * 0.075, 0, 0, { outline: false });
  for (let i = 0; i < 14; i++) part(face, box(0.58, 0.006, 0.006), '#90a4ae', 0, -0.48 + i * 0.075, 0, { outline: false });
  for (const sx of [-1, 1]) rod(screen, v3(sx * 0.3, 0.9, -0.14), v3(sx * 0.3, 0, -0.5), 0.016, TIMBER_D);
  // What's come through; what stayed on the screen's far side.
  const fines = mound(g, shade(GRAVEL, 0.82), 0.24, 0.1, HP.fines[0], HP.fines[2]);
  const stones = group(g, HP.screen[0], 0, HP.screen[2] - 0.34);
  pebbles(stones, 14, 0.22, 0.1, 7);
  const shovel = shovelMesh(g);
  const load = soilLoad(g, GRAVEL);
  const rakeTool = group(g);
  part(rakeTool, cyl(0.014, 0.014, 1.25, 8), TIMBER, 0, -0.62, 0, { outline: false });
  part(rakeTool, box(0.36, 0.03, 0.03), '#37474f', 0, -1.26, 0);
  const dust = puffs(g, 6, '#c4c0b6', 0.05);
  const spots: Record<string, Spot> = { mlShovelGravel: standAt(g, 'mlGravel', 0.72, -0.42) };
  spots['*'] = spots.mlShovelGravel;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    gravel.scale.set(1, now ? 1 - (n.used ?? 0) * 0.14 : 1, 1);
    const rattle = n.rattle ?? 0;
    face.position.y = 0.56 + rattle * 0.006 * Math.sin(t * 60);
    const fin = now ? n.fines ?? 0 : 0.6;
    fines.scale.set(Math.max(0.4, fin + 0.2), Math.max(0.2, fin), Math.max(0.4, fin + 0.2));
    if (P.shG && P.shB) lay(shovel, P.shG, P.shB);
    else lay(shovel, [-0.2, 1.1, 0.84], [-0.2, 0.02, 0.62]);
    at(load, P.load);
    if (P.rakeG && P.rakeH) {
      rakeTool.visible = true;
      lay(rakeTool, P.rakeG, P.rakeH);
    } else rakeTool.visible = false;
    dust(n.dust ?? 0, HP.screen[0], 0.45, HP.screen[2], 0.22, t, 0.5);
  });
  out.work = marker(g, HP.gravel[0], 0.2, HP.gravel[2]);
}

export const BUILDERS: Record<string, Builder> = {
  gardenBed(g, _W, _D, _c, _def, _ctx, out) {
    gardenBed(g, out);
  },
  lawnMower(g, _W, _D, _c, _def, _ctx, out) {
    lawnMower(g, out);
  },
  wheelbarrow(g, _W, _D, _c, _def, _ctx, out) {
    wheelbarrow(g, out);
  },
  materialPile(g, _W, _D, _c, _def, _ctx, out) {
    materialPile(g, out);
  },
  mlPavingBed(g, W, D, _c, _def, _ctx, out) {
    pavingBed(g, out, W, D);
  },
  mlTreeYard(g, _W, _D, _c, _def, _ctx, out) {
    treeYard(g, out);
  },
  mlExcavator(g, _W, _D, _c, _def, _ctx, out) {
    excavator(g, out);
  },
  mlSurveyLine(g, _W, _D, _c, _def, _ctx, out) {
    surveyLine(g, out);
  },
  mlSafetyBoard(g, _W, _D, _c, _def, _ctx, out) {
    safetyBoard(g, out);
  },
  mlSiteOffice(g, W, D, _c, _def, _ctx, out) {
    siteOffice(g, out, W, D);
  },
  mlToolCrib(g, W, _D, _c, _def, _ctx, out) {
    toolCrib(g, out, W);
  },
  mlSoilHeap(g, W, _D, _c, _def, _ctx, out) {
    soilHeap(g, out, W);
  },
  mlSiteFence(g) {
    siteFence(g);
  },
};

// 공사 가림막·출입구 (mlSiteFence, anchored at the lot's north-west tile, its middle (0.5, 0.5) on the lot).

const MESH = new THREE.MeshBasicMaterial({ color: '#5f6f66', transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });

/** A mesh fence run on posts every 2 m, low enough (1.6 m) to see the work through. */
function meshRun(g: THREE.Group, x0: number, z0: number, x1: number, z1: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(-(z1 - z0), x1 - x0);
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  part(g, box(len, 1.45, 0.01), '#5f6f66', mx, 0.8, mz, { ry, material: MESH, outline: false });
  for (const y of [0.08, 1.55]) part(g, box(len, 0.05, 0.05), '#9aa5a0', mx, y, mz, { ry });
  const n = Math.max(1, Math.round(len / 2));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    part(g, box(0.07, 1.7, 0.07), '#7c8781', x0 + (x1 - x0) * t, 0.85, z0 + (z1 - z0) * t);
  }
}

/**
 * The site's edge: a white steel hoarding along the back with the firm's green band, a mesh fence down the sides and across the
 * front (so the work can be seen), and the one way in from the street, its gateposts and notice, the wheel wash the lorries
 * cross on the way out.
 */
function siteFence(g: THREE.Group) {
  const at = (v: number) => v - 0.5;
  const H = 2.4;
  part(g, box(25.7, H, 0.06), '#f1f1ec', at(13), H / 2, at(0.15));
  part(g, box(25.72, 0.4, 0.07), '#2e7d32', at(13), H - 0.35, at(0.15), NO_OUTLINE);
  for (let x = 0.15; x <= 25.9; x += 2) part(g, box(0.09, H + 0.05, 0.09), '#a3a3a3', at(x), (H + 0.05) / 2, at(0.24));
  for (const x of [4, 13, 22]) label(g, `${BRAND} · 안전제일`, 3.2, 0.42, at(x), 1.2, at(0.2), '#2e7d32', '#ffffff');
  meshRun(g, at(0.15), at(0.15), at(0.15), at(14.9));
  meshRun(g, at(25.85), at(0.15), at(25.85), at(14.9));
  meshRun(g, at(0.15), at(14.9), at(9.8), at(14.9));
  meshRun(g, at(15.2), at(14.9), at(25.85), at(14.9));
  // The gateway: two posts, the notice of the works over the left one, the wheel wash's grating across the way in.
  for (const x of [9.8, 15.2]) part(g, rbox(0.3, 2.2, 0.3, 0.03), '#2e7d32', at(x), 1.1, at(14.9));
  label(g, '조경 공사 현장 · 관계자 외 출입 금지', 3.0, 0.4, at(7.6), 1.9, at(14.95), '#ffffff', '#c62828');
  part(g, box(5.2, 0.05, 1.3), '#8a8d8f', at(12.5), 0.03, at(14.2), NO_OUTLINE);
  for (let i = 0; i < 12; i++) part(g, box(0.05, 0.02, 1.2), '#55595c', at(10.1 + i * 0.44), 0.065, at(14.2), NO_OUTLINE);
}

const NO_OUTLINE = { outline: false };
