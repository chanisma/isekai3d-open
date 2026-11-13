import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import {
  CANAPE_AT,
  INTERP_KEY,
  NEG_HAND,
  SHOW_AT,
  SIGN_AT,
  SIGN_TURN,
  amountOf,
  boothHead,
  dpPhase,
  flagTidy,
  glassAt,
  globeTurn,
  interpOn,
  mingleBeat,
  negBeat,
  shakePump,
  signBeat,
  type NegKey,
  type SignKey,
} from './diplomatMotion';

/**
 * The 외교부 청사 drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * diplomats' desks with the 전문 (a cable) on screen and a globe to study the region on, the summit
 * hall's negotiating table with the two delegations' table flags and nameplates and the draft in its
 * folder (a counterpart drawn across it for the talks, who leans over to shake on it), the flag stands,
 * the reception buffet with its canapés and champagne. And what it was missing
 * (workFurniture/diplomat.ts): the delegations' chairs, the 협정 서명식 table with its photo backdrop,
 * the interpreters' booth, the 외교 행낭 safe, the world-time clocks and a row of flags in the lobby.
 *
 * Korea's flag is the 태극기; every partner nation (아르벨리아 공화국 first among them), its flag, its
 * people and every 협정 are made up, and nothing stands for a real country's government.
 */

const WALNUT = '#4e342e';
const MAHOGANY = '#5b2c22';
const GOLD = '#c9a227';
const NAVY = '#1a2b4c';
const PAPER = '#fbfaf5';
const LEATHER = '#2c3550';
const BURGUNDY = '#6d1f2a';
const TEAL = '#00838f';
const KOREA = '대한민국';
const PARTNER = '아르벨리아';
const PARTNER_FULL = '아르벨리아 공화국';
/** The top of the negotiating and signing tables, metres; the delegates' seats. */
const TABLE_TOP = 0.75;
const SEAT_Y = 0.47;
/** How far forward of its tile's middle a delegate's chair's seat is (toward the table). */
const SEAT_Z = 0.3;

// ---------------------------------------------------------------------------------------------
// Small parts.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** Which of a piece's spots is being used just now, if any. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (posed(s, t) && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** How tall whoever's posed at a spot is. */
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const phaseOf = (s: Spot) => dpPhase(s.at.getWorldPosition(tmp));

/** A spot sat at (the seat's top `y`), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot stood at, facing `yaw`, and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A sheet lying flat on a top, its head away from +z, turned `ry` about the vertical. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A pen lying on a top. */
const pen = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a1a1a') => {
  part(g, cyl(0.005, 0.005, 0.14, 8), color, x, y + 0.006, z, { rz: Math.PI / 2, ry, outline: false });
  part(g, cyl(0.0055, 0.0055, 0.03, 8), GOLD, x + Math.cos(ry) * 0.055, y + 0.006, z - Math.sin(ry) * 0.055, { rz: Math.PI / 2, ry, outline: false });
};
/** A point in a spot's frame (to their left, up, ahead) in the piece's frame. */
function fromSpot(s: Spot, side: number, up: number, ahead: number, out = new THREE.Vector3()): THREE.Vector3 {
  const yaw = s.at.rotation.y;
  return out.set(side, up, ahead).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(s.at.position);
}

/** A swivel chair, built facing +z: five-star base, gas lift, the seat's top at 0.48, a back `back` high, arms. */
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color: string, back = 0.55): THREE.Group {
  const c = group(g, x, 0, z, ry);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.5, 0.09, 0.48, 0.04), color, 0, 0.435, 0);
  part(c, rbox(0.5, back, 0.1, 0.05), color, 0, 0.5 + back / 2, -0.24, { rx: -0.08 });
  part(c, rbox(0.42, back - 0.16, 0.02, 0.04), shade(color, 1.25), 0, 0.5 + back / 2, -0.185, { rx: -0.08, outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.04, 0.3, 0.015), color, sx * 0.27, 0.67, 0.0);
    part(c, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.27, 0.57, 0.04, { outline: false });
  }
  return c;
}

/** A ceremonial armchair, built facing +z, its seat's top at SEAT_Y over z = `sz`: walnut frame, tufted leather, gold nailheads. */
function armchair(g: THREE.Object3D, x: number, z: number, ry: number, leather: string, sz = 0, tall = 0.72): THREE.Group {
  const c = group(g, x, 0, z, ry);
  for (const sx of [-1, 1])
    for (const fz of [-1, 1]) part(c, cyl(0.022, 0.016, 0.36, 8), WALNUT, sx * 0.23, 0.18, sz + fz * 0.2);
  part(c, rbox(0.54, 0.06, 0.5, 0.015), WALNUT, 0, 0.37, sz);
  part(c, rbox(0.5, 0.08, 0.46, 0.035), leather, 0, SEAT_Y - 0.04, sz + 0.01);
  // The tall back, raked, its tufts.
  const back = group(c, 0, 0.42, sz - 0.24);
  back.rotation.x = -0.12;
  part(back, rbox(0.56, tall, 0.06, 0.02), WALNUT, 0, tall / 2, 0);
  part(back, rbox(0.48, tall - 0.1, 0.05, 0.03), leather, 0, tall / 2 + 0.02, 0.04);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) part(back, ball(0.008), shade(leather, 0.7), -0.1 + j * 0.2, 0.18 + i * 0.17, 0.068, { outline: false });
  part(back, rbox(0.6, 0.05, 0.08, 0.02), WALNUT, 0, tall + 0.01, 0.0);
  // The arms on turned posts, the nailheads along the seat's front.
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.035, 0.44, 0.015), WALNUT, sx * 0.29, 0.65, sz + 0.02);
    part(c, cyl(0.016, 0.02, 0.26, 8), WALNUT, sx * 0.29, 0.52, sz + 0.18);
  }
  for (let i = 0; i < 9; i++) part(c, ball(0.006), GOLD, -0.22 + i * 0.055, SEAT_Y - 0.06, sz + 0.24, { outline: false });
  return c;
}

/** A tent card that reads from both sides, along x at `x, y, z`. */
function tentCard(g: THREE.Object3D, s: string, w: number, x: number, y: number, z: number, bg = '#fafafa', fg = NAVY, back = s) {
  const tent = group(g, x, y, z);
  for (const sz of [-1, 1]) {
    part(tent, box(w, 0.1, 0.005), bg, 0, 0.046, sz * 0.018, { rx: -sz * 0.35 });
    label(tent, sz > 0 ? s : back, w - 0.03, 0.06, 0, 0.046, sz * 0.022, bg, fg, sz > 0 ? 0 : Math.PI).rotation.x = -sz * 0.35;
  }
}

/** A gooseneck microphone on its base bending out over +z; its tally ring drawn again in `lit` (shown while it's live). */
function gooseMic(g: THREE.Object3D, x: number, y: number, z: number, ry: number, lit?: THREE.Object3D, rise = 0.3, reach = 0.12) {
  const m = group(g, x, y, z, ry);
  part(m, rbox(0.09, 0.025, 0.11, 0.01), BLACK, 0, 0.012, 0);
  part(m, cyl(0.011, 0.011, 0.008, 10), '#9e9e9e', 0.022, 0.028, 0.03, { outline: false });
  const knee = new THREE.Vector3(0, rise * 0.72, -0.01);
  const head = new THREE.Vector3(0, rise, reach);
  rod(m, new THREE.Vector3(0, 0.025, -0.02), knee, 0.005, BLACK);
  rod(m, knee, head.clone().add(new THREE.Vector3(0, -0.02, -0.02)), 0.005, BLACK);
  const tilt = Math.PI / 2 - Math.atan2(rise - knee.y, reach - knee.z) * 0.5;
  part(m, cyl(0.012, 0.01, 0.065, 10), '#424242', 0, head.y, head.z + 0.02, { rx: tilt });
  part(m, cyl(0.0135, 0.0135, 0.007, 12), '#5a1a1a', 0, head.y - 0.007, head.z - 0.01, { rx: tilt, outline: false });
  if (lit) {
    const on = group(lit, 0, 0, 0);
    on.position.copy(m.position);
    on.rotation.copy(m.rotation);
    glowing(on, cyl(0.015, 0.015, 0.009, 12), '#ff1744', 0, head.y - 0.007, head.z - 0.01, tilt);
  }
}

/** A water glass and a little bottle. */
function water(g: THREE.Object3D, x: number, y: number, z: number) {
  glass(g, cyl(0.026, 0.022, 0.09, 12), x, y + 0.045, z);
  part(g, cyl(0.022, 0.022, 0.05, 12), '#e1f5fe', x, y + 0.025, z, { outline: false });
  part(g, cyl(0.022, 0.024, 0.12, 12), '#b3e5fc', x + 0.06, y + 0.06, z - 0.02, { outline: false });
  part(g, cyl(0.011, 0.016, 0.03, 10), '#b3e5fc', x + 0.06, y + 0.135, z - 0.02, { outline: false });
  part(g, cyl(0.012, 0.012, 0.015, 10), '#1565c0', x + 0.06, y + 0.158, z - 0.02, { outline: false });
}

/**
 * A flag on its pole (the cloth rippling, a gold fringe along its foot), the pole at the group's
 * middle, the cloth out to `side` (+1 to the right as you face it; its face is +z either way, so it
 * never reads backwards). The finial: a gold 무궁화 bud for the 태극기, a spearhead for the others.
 * Returns the group and `wave(t, amp)` to ripple it.
 */
function poleFlag(g: THREE.Object3D, tex: THREE.Texture, x: number, z: number, ry: number, o: { side?: number; pole?: number; fw?: number; fh?: number; bud?: boolean; base?: boolean } = {}) {
  const side = o.side ?? 1;
  const pole = o.pole ?? 2.0;
  const fw = o.fw ?? 0.66;
  const fh = o.fh ?? 0.44;
  const f = group(g, x, 0, z, ry);
  if (o.base ?? true) {
    part(f, cyl(0.15, 0.18, 0.05, 20), '#3e2723', 0, 0.025, 0);
    part(f, cyl(0.045, 0.065, 0.08, 14), GOLD, 0, 0.09, 0);
  }
  part(f, cyl(0.013, 0.013, pole, 10), '#6d4c41', 0, pole / 2 + 0.05, 0, { outline: false });
  part(f, cyl(0.02, 0.02, 0.03, 10), GOLD, 0, pole + 0.06, 0, { outline: false });
  if (o.bud) {
    // The 무궁화 bud: a closed gold bud in its five sepals.
    part(f, ball(0.032), GOLD, 0, pole + 0.12, 0).scale.set(0.8, 1.35, 0.8);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(f, box(0.012, 0.05, 0.004), GOLD, Math.cos(a) * 0.022, pole + 0.095, Math.sin(a) * 0.022, { ry: -a + Math.PI / 2, rx: 0.4, outline: false });
    }
  } else {
    part(f, cyl(0, 0.026, 0.08, 4), GOLD, 0, pole + 0.12, 0, { outline: false });
    part(f, ball(0.016), GOLD, 0, pole + 0.075, 0, { outline: false });
  }
  const top = pole - 0.1;
  const geom = new THREE.PlaneGeometry(fw, fh, 14, 3);
  const pos = geom.attributes.position;
  const base = (pos.array as Float32Array).slice();
  const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: gradient, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(geom, mat);
  cloth.userData.ownGeometry = cloth.userData.ownMaterial = true;
  cloth.castShadow = true;
  cloth.position.set(side * (fw / 2 + 0.015), top - fh / 2, 0);
  f.add(cloth);
  const fringe: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) fringe.push(part(f, box(fw / 6 + 0.01, 0.022, 0.01), GOLD, 0, 0, 0, { outline: false }));
  rod(f, new THREE.Vector3(side * 0.01, top + 0.02, 0), new THREE.Vector3(side * 0.02, top - 0.4, 0.02), 0.004, GOLD);
  part(f, cyl(0.011, 0.018, 0.06, 8), GOLD, side * 0.02, top - 0.43, 0.02, { outline: false });
  let last = -1;
  const wave = (t: number, amp: number) => {
    const key = Math.round(t * 30) + amp * 1000;
    if (key === last) return;
    last = key;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const u = side > 0 ? (bx + fw / 2) / fw : (fw / 2 - bx) / fw;
      pos.setZ(i, amp * Math.sin(u * Math.PI * 2.4 - t * 1.6) * u);
      pos.setY(i, by - (0.1 + amp) * u * u);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    for (let i = 0; i < fringe.length; i++) {
      const u = (i + 0.5) / fringe.length;
      fringe[i].position.set(side * (0.015 + u * fw), top - fh - (0.1 + amp) * u * u - 0.01, amp * Math.sin(u * Math.PI * 2.4 - t * 1.6) * u);
    }
  };
  wave(0, 0.045);
  return { root: f, wave };
}

/** A little pair of desk flags on a walnut base, crossed. */
function deskFlags(g: THREE.Object3D, x: number, y: number, z: number, ry: number, a: THREE.Texture, b: THREE.Texture, k = 1) {
  const fl = group(g, x, y, z, ry);
  fl.scale.setScalar(k);
  part(fl, rbox(0.12, 0.02, 0.06, 0.01), '#3e2723', 0, 0.01, 0);
  for (const [sx, tex] of [[-1, a], [1, b]] as const) {
    const pole = group(fl, sx * 0.02, 0.02, 0);
    pole.rotation.z = -sx * 0.32;
    part(pole, cyl(0.003, 0.003, 0.26, 6), GOLD, 0, 0.13, 0, { outline: false });
    part(pole, ball(0.007), GOLD, 0, 0.265, 0, { outline: false });
    (picture(pole, tex, 0.12, 0.08, sx * 0.062, 0.21, 0).material as THREE.Material).side = THREE.DoubleSide;
  }
}
/** One desk flag standing on its own little base. */
function deskFlag(g: THREE.Object3D, x: number, y: number, z: number, ry: number, tex: THREE.Texture) {
  const fl = group(g, x, y, z, ry);
  part(fl, cyl(0.03, 0.035, 0.015, 14), GOLD, 0, 0.008, 0);
  part(fl, cyl(0.003, 0.003, 0.3, 6), GOLD, 0, 0.16, 0, { outline: false });
  part(fl, ball(0.008), GOLD, 0, 0.31, 0, { outline: false });
  (picture(fl, tex, 0.15, 0.1, 0.078, 0.245, 0).material as THREE.Material).side = THREE.DoubleSide;
}

// ---------------------------------------------------------------------------------------------
// Someone drawn sat at a piece (the counterpart across the negotiating table, the partner at a
// signing): legs and a body that leans from the hips, a head that turns, and arms reaching wherever
// they're sent (a two-bone reach, the elbow down and out).

interface Look {
  suit: string;
  shirt: string;
  tie?: string;
  skin: string;
  hair: string;
  long?: boolean;
}
const COUNTERPART: Look = { suit: '#2f3a45', shirt: '#e3f2fd', tie: TEAL, skin: '#c98e68', hair: '#3a2b22' };
const PARTNER_SIGNER: Look = { suit: '#3b2f4a', shirt: '#fafafa', skin: '#a8724f', hair: '#1f1611', long: true };

const Y = new THREE.Vector3(0, 1, 0);
interface Figure {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  /** Sends the hands (in the root's frame) to `l` and `r`. */
  reach(l: THREE.Vector3, r: THREE.Vector3): void;
}
function headOf(g: THREE.Object3D, look: Look): THREE.Group {
  const h = new THREE.Group();
  h.rotation.order = 'YXZ';
  g.add(h);
  part(h, ball(0.09), look.skin, 0, 0, 0).scale.set(0.92, 1.06, 1);
  part(h, ball(0.096), look.hair, 0, 0.026, -0.018).scale.set(1, 0.92, 1);
  part(h, box(0.15, 0.04, 0.04), look.hair, 0, 0.07, 0.05, { rx: 0.4, outline: false });
  for (const sx of [-1, 1]) {
    part(h, ball(0.016), look.skin, sx * 0.083, -0.005, 0);
    part(h, ball(0.011), '#2b1d16', sx * 0.032, 0.004, 0.08, { outline: false });
    part(h, box(0.026, 0.005, 0.004), look.hair, sx * 0.033, 0.032, 0.08, { rz: -sx * 0.12, outline: false });
  }
  part(h, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.046, 0.084, { outline: false });
  // Hair up in a low bun, or the temples greying.
  if (look.long) part(h, ball(0.05), look.hair, 0, -0.03, -0.1);
  else for (const sx of [-1, 1]) part(h, box(0.012, 0.04, 0.05), '#9e9e9e', sx * 0.09, 0.0, -0.01, { outline: false });
  return h;
}
function seatedFigure(parent: THREE.Object3D, look: Look, sy: number): Figure {
  const root = new THREE.Group();
  parent.add(root);
  // The legs and shoes (they don't move).
  part(root, rbox(0.32, 0.13, 0.3, 0.06), look.suit, 0, sy + 0.06, -0.02);
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.09, sy + 0.07, 0.02), new THREE.Vector3(sx * 0.09, sy + 0.07, 0.4), 0.058, look.suit);
    rod(root, new THREE.Vector3(sx * 0.09, sy + 0.06, 0.41), new THREE.Vector3(sx * 0.1, 0.09, 0.45), 0.048, look.suit);
    part(root, rbox(0.085, 0.06, 0.18, 0.025), '#1b1b1b', sx * 0.1, 0.03, 0.48);
  }
  // The body from the hips: the jacket, the shirt and tie, the neck and head.
  const torso = group(root, 0, sy + 0.06, -0.02);
  part(torso, rbox(0.31, 0.44, 0.2, 0.08), look.suit, 0, 0.26, -0.02);
  part(torso, box(0.1, 0.16, 0.02), look.shirt, 0, 0.38, 0.08, { rx: -0.05, outline: false });
  if (look.tie) part(torso, box(0.035, 0.15, 0.012), look.tie, 0, 0.36, 0.092, { outline: false });
  for (const sx of [-1, 1]) part(torso, box(0.05, 0.18, 0.012), shade(look.suit, 0.8), sx * 0.06, 0.38, 0.085, { rz: sx * 0.35, outline: false });
  part(torso, cyl(0.042, 0.045, 0.1, 12), look.skin, 0, 0.53, -0.01);
  const head = headOf(torso, look);
  head.position.set(0, 0.66, 0);
  // The arms: an upper arm, a forearm and a hand a side, set each frame.
  const limb = (r: number, color: string) => part(root, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0);
  const arms = [-1, 1].map((sx) => ({ sx, upper: limb(0.034, look.suit), fore: limb(0.028, look.suit), cuff: part(root, cyl(0.026, 0.026, 0.02, 8), look.shirt, 0, 0, 0, { outline: false }), hand: part(root, ball(0.032), look.skin, 0, 0, 0) }));
  const shoulder = new THREE.Vector3();
  const set = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    const d = tmp.subVectors(b, a);
    const len = Math.max(0.001, d.length());
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(Y, d.divideScalar(len));
  };
  const A = 0.285;
  const B = 0.285;
  const reach = (l: THREE.Vector3, r: THREE.Vector3) => {
    torso.updateMatrix();
    for (const arm of arms) {
      const T = arm.sx > 0 ? l : r;
      shoulder.set(arm.sx * 0.17, 0.46, -0.03).applyMatrix4(torso.matrix);
      const d = new THREE.Vector3().subVectors(T, shoulder);
      const L = THREE.MathUtils.clamp(d.length(), 0.08, A + B - 0.002);
      const dir = d.normalize();
      const hand = shoulder.clone().addScaledVector(dir, L);
      const x = (A * A - B * B + L * L) / (2 * L);
      const h = Math.sqrt(Math.max(0, A * A - x * x));
      const hint = new THREE.Vector3(arm.sx * 0.45, -1, -0.25);
      hint.addScaledVector(dir, -hint.dot(dir)).normalize();
      const elbow = shoulder.clone().addScaledVector(dir, x).addScaledVector(hint, h);
      set(arm.upper, shoulder, elbow);
      const wrist = hand.clone().addScaledVector(dir.copy(hand).sub(elbow).normalize(), -0.03);
      set(arm.fore, elbow, wrist);
      arm.cuff.position.copy(wrist);
      arm.cuff.quaternion.copy(arm.fore.quaternion);
      arm.hand.position.copy(hand);
    }
  };
  reach(new THREE.Vector3(0.12, sy + 0.22, 0.3), new THREE.Vector3(-0.12, sy + 0.22, 0.3));
  return { root, torso, head, reach };
}
/** A point in the piece's frame in a figure's root frame. */
function intoFigure(f: Figure, p: THREE.Vector3): THREE.Vector3 {
  return p.clone().sub(f.root.position).applyAxisAngle(Y, -f.root.rotation.y);
}

// ---------------------------------------------------------------------------------------------
// What's painted on the flags, the papers and the screens.

/** 태극기. */
const paintTaegeukgi: Paint = (c) => {
  const W = 300;
  const H = 200;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);
  const R = H / 4;
  c.save();
  c.translate(W / 2, H / 2);
  c.rotate(Math.atan2(2, 3));
  c.fillStyle = '#0047a0';
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#cd2e3a';
  c.beginPath();
  c.arc(0, 0, R, Math.PI, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(-R / 2, 0, R / 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0047a0';
  c.beginPath();
  c.arc(R / 2, 0, R / 2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // The four trigrams at the corners, their bars across the diagonal: 건 ☰, 감 ☵, 곤 ☷, 리 ☲.
  const bars: Array<[number, number, boolean[]]> = [
    [-3, -2, [true, true, true]],
    [3, -2, [false, true, false]],
    [3, 2, [false, false, false]],
    [-3, 2, [true, false, true]],
  ];
  const d = Math.hypot(3, 2);
  c.fillStyle = '#000000';
  for (const [dx, dy, solid] of bars) {
    c.save();
    c.translate(W / 2 + (dx / d) * R * 2.05, H / 2 + (dy / d) * R * 2.05);
    c.rotate(Math.atan2(dy, dx));
    const t = R / 4;
    const L = R;
    solid.forEach((s, i) => {
      const x = (i - 1) * t * 1.5;
      if (s) c.fillRect(x - t / 2, -L / 2, t, L);
      else {
        c.fillRect(x - t / 2, -L / 2, t, L * 0.45);
        c.fillRect(x - t / 2, L * 0.05, t, L * 0.45);
      }
    });
    c.restore();
  }
};
/** A sun of `n` rays. */
function sun(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, n = 12) {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.55 : r;
    c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
  c.fill();
}
function star(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}
/** 아르벨리아 공화국 (made up): teal, white, teal, a gold sun at the hoist. */
const paintArvelia: Paint = (c) => {
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 300, 200);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 50, 300, 100);
  sun(c, 82, 100, 40, '#f2b705');
};
/** 솔바렌 왕국 (made up): plum, a white bend from the foot of the hoist, three white stars. */
const paintSolvaren: Paint = (c) => {
  c.fillStyle = '#5e2a6e';
  c.fillRect(0, 0, 300, 200);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(0, 200);
  c.lineTo(0, 160);
  c.lineTo(260, 0);
  c.lineTo(300, 0);
  c.lineTo(300, 40);
  c.lineTo(40, 200);
  c.closePath();
  c.fill();
  for (const [x, y] of [[40, 40], [80, 30], [60, 74]]) star(c, x, y, 13, '#ffffff');
};
/** 카엘라 연방 (made up): green, a white wave across, an orange disc. */
const paintKaela: Paint = (c) => {
  c.fillStyle = '#2e7d32';
  c.fillRect(0, 0, 300, 200);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 26;
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const x = (i / 30) * 300;
    const y = 100 + Math.sin((i / 30) * Math.PI * 3) * 22;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  c.fillStyle = '#ff8f00';
  c.beginPath();
  c.arc(150, 100, 34, 0, Math.PI * 2);
  c.fill();
};
/** 메리디아 공화국 (made up): crimson, a white chevron at the hoist with a blue lozenge. */
const paintMeridia: Paint = (c) => {
  c.fillStyle = '#b71c1c';
  c.fillRect(0, 0, 300, 200);
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(120, 100);
  c.lineTo(0, 200);
  c.closePath();
  c.fill();
  c.fillStyle = '#1565c0';
  c.beginPath();
  c.moveTo(44, 70);
  c.lineTo(70, 100);
  c.lineTo(44, 130);
  c.lineTo(18, 100);
  c.closePath();
  c.fill();
};
const FLAG = {
  korea: () => painted('dpTaegeukgi', 300, 200, paintTaegeukgi),
  arvelia: () => painted('dpArvelia', 300, 200, paintArvelia),
  solvaren: () => painted('dpSolvaren', 300, 200, paintSolvaren),
  kaela: () => painted('dpKaela', 300, 200, paintKaela),
  meridia: () => painted('dpMeridia', 300, 200, paintMeridia),
};

/** Grey lines standing for text, `n` of them from `y0`. */
function lines(c: CanvasRenderingContext2D, x: number, y0: number, w: number, n: number, seed: number, gap = 14, color = '#9e9e9e') {
  const r = seeded(seed);
  c.fillStyle = color;
  for (let i = 0; i < n; i++) c.fillRect(x, y0 + i * gap, (i === n - 1 ? 0.5 : 0.8 + r() * 0.18) * w, 4);
}
/** The 외교 전문 (cable) on a desk's screen. */
const paintCable: Paint = (c) => {
  c.fillStyle = '#e8ecef';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#183a6b';
  c.fillRect(0, 0, 384, 24);
  text(c, '외교부 전문 시스템', 8, 12, 12, '#ffffff', 'left');
  c.fillStyle = '#c62828';
  c.fillRect(300, 4, 76, 16);
  text(c, '대 외 비', 338, 12, 11, '#ffffff', 'center');
  c.fillStyle = '#ffffff';
  c.fillRect(10, 32, 364, 218);
  const rows: Array<[string, string]> = [
    ['번호', 'ARV-2026-1027'],
    ['수신', '장관 (참조: 유라시아국장)'],
    ['발신', `주${PARTNER} 대사`],
    ['제목', '신임 외교장관 면담 결과 보고'],
  ];
  rows.forEach(([k, v], i) => {
    const y = 46 + i * 20;
    text(c, k, 22, y, 11, '#546e7a', 'left');
    text(c, v, 70, y, 11, '#212121', 'left', i === 3);
  });
  c.fillStyle = '#cfd8dc';
  c.fillRect(20, 128, 344, 1);
  text(c, '1. 본직은 10.26.(월) 신임 외교장관을 면담하고', 22, 142, 11, '#212121', 'left', false);
  text(c, '   경제·문화 협력 협정 서명 일정을 협의함.', 22, 158, 11, '#212121', 'left', false);
  lines(c, 22, 172, 330, 4, 11, 14);
  c.fillStyle = '#212121';
  c.fillRect(200, 214, 2, 12);
};
/** A draft of the 협정 (made up): the 조항s, one marked. */
function paintDraftOf(title: string, sub: string, head = '협 정 문 (안)', headColor = '#1a2b4c'): Paint {
  return (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 256, 362);
    text(c, head, 128, 26, 15, headColor, 'center');
    text(c, title, 128, 52, 11, '#111111', 'center');
    text(c, sub, 128, 68, 11, '#111111', 'center');
    const art = (s: string, y: number, n: number, seed: number) => {
      text(c, s, 18, y, 11, '#111111', 'left');
      lines(c, 18, y + 12, 220, n, seed, 12);
    };
    art('제1조 (목적)', 96, 3, 3);
    art('제2조 (협력 분야)', 146, 3, 5);
    art('제3조 (공동위원회)', 196, 3, 7);
    art('제4조 (발효)', 246, 2, 9);
    c.fillStyle = 'rgba(255,235,59,0.5)';
    c.fillRect(16, 156, 200, 12);
    c.fillStyle = '#c62828';
    text(c, '?', 238, 160, 14, '#c62828', 'center');
    text(c, '2026년 10월 27일 서울에서 작성', 128, 300, 10, '#455a64', 'center', false);
    text(c, `${KOREA} 정부를 대표하여        ${PARTNER_FULL} 정부를 대표하여`, 128, 326, 8, '#455a64', 'center', false);
  };
}
const paintDraft = paintDraftOf(`${KOREA} 정부와 ${PARTNER_FULL} 정부 간의`, '경제·문화 협력에 관한 협정');
const paintSummit = paintDraftOf('정상회담 핵심 의제 · 대응 방향', '(10.27. 긴급 · 대통령 보고용)', '긴 급', '#c62828');
const paintPolicy = paintDraftOf('국제기구 기후·보건 협력 정책 보고', '(다자외교조정관실)', '정 책 보 고', '#00695c');
/** The text in the partner's own (made-up) script, to be translated. */
const paintSourceDoc: Paint = (c) => {
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, 256, 362);
  sun(c, 128, 34, 18, TEAL);
  const r = seeded(31);
  c.strokeStyle = '#263238';
  c.lineWidth = 2;
  for (let row = 0; row < 18; row++) {
    const y = 72 + row * 15;
    let x = 18;
    while (x < 230 - (row % 6 === 5 ? 90 : 0)) {
      const w = 8 + r() * 26;
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k <= 6; k++) c.lineTo(x + (k / 6) * w, y + Math.sin(k * 1.9 + r() * 3) * 3);
      c.stroke();
      if (r() > 0.6) {
        c.beginPath();
        c.arc(x + w / 2, y - 6, 1.5, 0, Math.PI * 2);
        c.stroke();
      }
      x += w + 6;
    }
  }
};
/** The translation going on beside it. */
const paintTranslation = paintDraftOf('(가번역) 아르벨리아 외교부 공한', '제2026-118호', '번 역 본', '#37474f');
/** The 협정서 signing page: the parties, two signature lines. */
const paintSigningPage: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  c.strokeStyle = GOLD;
  c.lineWidth = 4;
  c.strokeRect(10, 10, 236, 342);
  text(c, '이상의 증거로 아래 서명자는', 128, 60, 11, '#212121', 'center', false);
  text(c, '각자의 정부로부터 정당하게 권한을', 128, 78, 11, '#212121', 'center', false);
  text(c, '위임받아 이 협정에 서명하였다.', 128, 96, 11, '#212121', 'center', false);
  text(c, '2026년 10월 27일 서울', 128, 130, 12, '#212121', 'center');
  text(c, `${KOREA} 정부를 대표하여`, 128, 190, 12, NAVY, 'center');
  c.fillStyle = '#90a4ae';
  c.fillRect(48, 246, 160, 2);
  text(c, `${PARTNER_FULL} 정부를 대표하여`, 128, 280, 11, '#455a64', 'center');
  c.fillRect(48, 330, 160, 2);
};
/** A signature, as it's written. */
const paintSignature: Paint = (c) => {
  c.clearRect(0, 0, 256, 64);
  c.strokeStyle = '#0d1b4a';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(12, 44);
  c.bezierCurveTo(30, 0, 50, 60, 70, 30);
  c.bezierCurveTo(90, 4, 100, 56, 124, 34);
  c.bezierCurveTo(150, 10, 160, 50, 186, 28);
  c.bezierCurveTo(206, 12, 220, 40, 246, 20);
  c.stroke();
  c.beginPath();
  c.moveTo(40, 52);
  c.lineTo(210, 46);
  c.stroke();
};
/** The signing ceremony's backdrop. */
const paintSigningBackdrop: Paint = (c) => {
  const W = 768;
  const H = 576;
  const grd = c.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#1d3f78');
  grd.addColorStop(1, '#0c1f40');
  c.fillStyle = grd;
  c.fillRect(0, 0, W, H);
  // Faint rings, an olive branch either side.
  c.strokeStyle = 'rgba(255,255,255,0.07)';
  c.lineWidth = 3;
  for (let i = 1; i < 9; i++) {
    c.beginPath();
    c.arc(W / 2, H * 0.55, i * 60, 0, Math.PI * 2);
    c.stroke();
  }
  for (const sx of [-1, 1]) {
    c.strokeStyle = '#d4b45a';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(W / 2 + sx * 10, 300, 210, sx > 0 ? -0.9 : Math.PI - 0.6, sx > 0 ? 0.6 : Math.PI + 0.9);
    c.stroke();
    for (let i = 0; i < 9; i++) {
      const a = (sx > 0 ? -0.8 : Math.PI - 0.5) + i * 0.16 * (sx > 0 ? 1 : 1);
      const x = W / 2 + sx * 10 + Math.cos(a) * 210;
      const y = 300 + Math.sin(a) * 210;
      c.fillStyle = '#d4b45a';
      c.beginPath();
      c.ellipse(x, y, 16, 6, a + 0.8, 0, Math.PI * 2);
      c.fill();
    }
  }
  // The two flags at the top, the title, the date.
  c.drawImage(painted('dpTaegeukgi', 300, 200, paintTaegeukgi).image as CanvasImageSource, 150, 70, 150, 100);
  c.drawImage(painted('dpArvelia', 300, 200, paintArvelia).image as CanvasImageSource, 468, 70, 150, 100);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 2;
  c.strokeRect(150, 70, 150, 100);
  c.strokeRect(468, 70, 150, 100);
  text(c, `${KOREA} 정부 · ${PARTNER_FULL} 정부`, W / 2, 230, 30, '#ffffff', 'center');
  text(c, '경제·문화 협력 협정', W / 2, 300, 52, '#ffffff', 'center');
  text(c, '서 명 식', W / 2, 368, 44, '#f5d76e', 'center');
  text(c, '2026. 10. 27.  서울', W / 2, 440, 24, '#cfd8dc', 'center', false);
};
/** The hall's camera feed on the interpreters' monitor: the table, the flags, the delegates. */
const paintHallFeed: Paint = (c) => {
  c.fillStyle = '#3e2f26';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#6d4c41';
  c.fillRect(0, 96, 256, 64);
  c.fillStyle = MAHOGANY;
  c.fillRect(30, 92, 196, 22);
  for (let i = 0; i < 3; i++) {
    c.fillStyle = '#263238';
    c.fillRect(56 + i * 60, 60, 28, 34);
    c.fillStyle = '#c99a6e';
    c.beginPath();
    c.arc(70 + i * 60, 52, 9, 0, Math.PI * 2);
    c.fill();
  }
  c.drawImage(painted('dpTaegeukgi', 300, 200, paintTaegeukgi).image as CanvasImageSource, 8, 20, 36, 24);
  c.drawImage(painted('dpArvelia', 300, 200, paintArvelia).image as CanvasImageSource, 212, 20, 36, 24);
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.fillRect(0, 140, 256, 20);
  text(c, '● LIVE  회담장 · CH1 한국어 / CH2 아르벨리아어', 6, 150, 9, '#ffffff', 'left');
};
/** The globe's map (made-up lands on blue). */
const paintGlobe: Paint = (c) => {
  c.fillStyle = '#3f7fbf';
  c.fillRect(0, 0, 256, 128);
  const r = seeded(77);
  const lands = ['#d7c38a', '#a5c882', '#c9b37a', '#8fbf7a'];
  for (let i = 0; i < 9; i++) {
    const cx = r() * 256;
    const cy = 22 + r() * 84;
    c.fillStyle = lands[i % lands.length];
    for (let k = 0; k < 7; k++) {
      c.beginPath();
      c.ellipse(cx + (r() - 0.5) * 50, cy + (r() - 0.5) * 26, 10 + r() * 22, 6 + r() * 12, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    c.beginPath();
    c.moveTo(0, (i / 6) * 128);
    c.lineTo(256, (i / 6) * 128);
    c.stroke();
  }
  for (let i = 0; i < 12; i++) {
    c.beginPath();
    c.moveTo((i / 12) * 256, 0);
    c.lineTo((i / 12) * 256, 128);
    c.stroke();
  }
};
/** A clock's face: numerals round a cream dial. */
const paintDial: Paint = (c) => {
  c.fillStyle = '#fbf6e9';
  c.beginPath();
  c.arc(64, 64, 62, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = i % 5 ? 56 : 50;
    c.strokeStyle = '#3e2723';
    c.lineWidth = i % 5 ? 1 : 3;
    c.beginPath();
    c.moveTo(64 + Math.sin(a) * r0, 64 - Math.cos(a) * r0);
    c.lineTo(64 + Math.sin(a) * 60, 64 - Math.cos(a) * 60);
    c.stroke();
  }
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    text(c, `${h}`, 64 + Math.sin(a) * 40, 65 - Math.cos(a) * 40, 13, '#3e2723', 'center');
  }
};

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * A diplomat's desk (외교관 책상): walnut with a green leather inlay on a panelled pedestal, the
   * 전문 (a cable from the embassy in 아르벨리아, 대외비) on the monitor, the keyboard, a brass-meridian
   * globe on its turned stand at the left, a notepad and pen, the 태극기 on a little desk stand, the
   * 영한 and 아르벨리아어 dictionaries, a green banker's lamp, a swivel chair. The region's studied at
   * the globe (dpGlobe: flicked round, stopped with a finger, thought over, a note taken) — the globe
   * spins under the hand; documents translated on the pad with the source text and the open
   * dictionary out, the cable typed, the 협정문 reviewed with a highlighter.
   */
  diplomatDesk(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.04;
    const d = 0.6;
    const h = 0.74;
    const zc = -D / 2 + d / 2 + 0.03;
    const zf = zc + d / 2;
    const top = h + 0.02;
    part(g, rbox(w, 0.04, d, 0.012), WALNUT, 0, h, zc);
    part(g, rbox(w - 0.2, 0.004, d - 0.16, 0.002), '#2e5d4b', 0, h + 0.021, zc + 0.02, { outline: false });
    // The pedestal on the right (three drawers with brass pulls), a panel on the left, the modesty panel.
    const px = w / 2 - 0.18;
    part(g, rbox(0.32, h - 0.03, d - 0.06, 0.01), shade(WALNUT, 0.9), px, (h - 0.03) / 2, zc);
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.28, 0.19, 0.012, 0.005), WALNUT, px, 0.14 + i * 0.21, zf - 0.024);
      part(g, rbox(0.08, 0.014, 0.014, 0.005), GOLD, px, 0.2 + i * 0.21, zf - 0.014, { outline: false });
    }
    part(g, rbox(0.04, h - 0.02, d - 0.06, 0.01), shade(WALNUT, 0.9), -w / 2 + 0.03, (h - 0.02) / 2, zc);
    part(g, rbox(w - 0.1, 0.36, 0.015, 0.006), shade(WALNUT, 0.8), 0, h - 0.22, zc - d / 2 + 0.04);
    // The monitor with the cable, the keyboard and mouse.
    const mx = 0.1;
    const mz = zc - 0.19;
    part(g, rbox(0.16, 0.012, 0.12, 0.006), BLACK, mx, top + 0.006, mz);
    part(g, rbox(0.035, 0.18, 0.025, 0.008), BLACK, mx, top + 0.09, mz - 0.03);
    part(g, rbox(0.44, 0.28, 0.03, 0.01), BLACK, mx, top + 0.3, mz);
    out.screen = litScreen(g, painted('dpCable', 384, 256, paintCable), 0.41, 0.25, mx, top + 0.3, mz + 0.017);
    const kz = zf - 0.17;
    part(g, rbox(0.34, 0.014, 0.12, 0.006), '#37474f', mx + 0.02, top + 0.007, kz);
    part(g, box(0.32, 0.004, 0.1), '#eceff1', mx + 0.02, top + 0.016, kz, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#37474f', mx + 0.28, top + 0.01, kz + 0.01);
    // The globe: its turned walnut stand, the brass meridian, the map turning inside it.
    const gx = -w / 2 + 0.14;
    const gz = zc - 0.05;
    const gr = 0.11;
    const gy = top + 0.22;
    part(g, cyl(0.07, 0.085, 0.025, 18), WALNUT, gx, top + 0.012, gz);
    part(g, cyl(0.018, 0.03, 0.08, 10), WALNUT, gx, top + 0.065, gz);
    const tilt = group(g, gx, gy, gz);
    tilt.rotation.z = 0.41;
    part(tilt, ring(gr + 0.012, 0.006, Math.PI * 1.25), GOLD, 0, 0, 0, { rz: -Math.PI * 0.62, outline: false });
    part(tilt, cyl(0.004, 0.004, gr * 2 + 0.04, 6), GOLD, 0, 0, 0, { outline: false });
    const spin = group(tilt, 0, 0, 0);
    const globeMat = new THREE.MeshToonMaterial({ map: painted('dpGlobe', 256, 128, paintGlobe), gradientMap: gradient });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(gr, 28, 18), globeMat);
    sphere.userData.ownGeometry = sphere.userData.ownMaterial = true;
    sphere.castShadow = true;
    spin.add(sphere);
    rod(g, new THREE.Vector3(gx, top + 0.1, gz), new THREE.Vector3(gx - 0.05, gy - 0.1, gz), 0.006, GOLD);
    // The notepad and pen, the desk flag, the dictionaries, the banker's lamp.
    const padX = gx + 0.16;
    const padZ = gz + 0.17;
    part(g, rbox(0.15, 0.012, 0.21, 0.004), '#fff9c4', padX, top + 0.006, padZ, { ry: 0.08 });
    for (let i = 0; i < 6; i++) part(g, box(0.12, 0.002, 0.004), '#90a4ae', padX, top + 0.013, padZ - 0.07 + i * 0.03, { ry: 0.08, outline: false });
    pen(g, padX + 0.1, top, padZ + 0.02, 1.2);
    deskFlag(g, -0.2, top, zc - 0.24, 0.25, FLAG.korea());
    const dx = w / 2 - 0.12;
    part(g, rbox(0.16, 0.05, 0.22, 0.008), '#0d47a1', dx, top + 0.025, zc - 0.03, { ry: -0.12 });
    label(g, '영한사전', 0.1, 0.03, dx, top + 0.051, zc - 0.03, '#0d47a1', '#ffffff').rotation.set(-Math.PI / 2, 0, 0.12);
    part(g, rbox(0.15, 0.045, 0.2, 0.008), TEAL, dx, top + 0.073, zc - 0.03, { ry: 0.05 });
    label(g, '아르벨리아어', 0.11, 0.028, dx, top + 0.097, zc - 0.03, TEAL, '#ffffff').rotation.set(-Math.PI / 2, 0, -0.05);
    const lamp = group(g, dx, top, zc - 0.21);
    part(lamp, cyl(0.05, 0.06, 0.02, 14), GOLD, 0, 0.01, 0);
    part(lamp, cyl(0.008, 0.008, 0.2, 8), GOLD, 0, 0.11, 0, { outline: false });
    part(lamp, cyl(0.04, 0.07, 0.05, 14), '#1b5e20', 0, 0.22, 0.03, { rx: 0.2 });
    // In use: the source text with its translation, the dictionary open; or the 협정문 with a highlighter; the cable printed out.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const translating = group(use, 0, 0, 0);
    flat(translating, painted('dpSource', 256, 362, paintSourceDoc), 0.15, 0.21, padX + 0.02, top + 0.016, padZ - 0.02, 0.15);
    flat(translating, painted('dpTranslation', 256, 362, paintTranslation), 0.15, 0.21, padX + 0.17, top + 0.004, padZ + 0.02, -0.1);
    const dict = group(translating, dx - 0.02, top + 0.11, zc - 0.03, -0.15);
    for (const sx of [-1, 1]) part(dict, box(0.12, 0.012, 0.18), '#fafafa', sx * 0.062, 0, 0, { rz: -sx * 0.06, outline: false });
    part(dict, box(0.25, 0.01, 0.19), '#0d47a1', 0, -0.01, 0, { outline: false });
    const reviewing = group(use, 0, 0, 0);
    flat(reviewing, painted('dpDraft', 256, 362, paintDraft), 0.15, 0.21, padX + 0.02, top + 0.016, padZ - 0.01, 0.1);
    part(reviewing, cyl(0.007, 0.007, 0.11, 8), '#ffeb3b', padX + 0.14, top + 0.025, padZ + 0.03, { rz: Math.PI / 2, ry: 0.7, outline: false });
    const cable = group(use, 0, 0, 0);
    flat(cable, painted('dpDraftCable', 256, 362, paintDraftOf('발신: 장관  수신: 주아르벨리아 대사', '제목: 협정 서명 일정 회신', '전 문 (안)', '#183a6b')), 0.15, 0.21, padX + 0.02, top + 0.016, padZ - 0.01, 0.12);
    // The chair, and how it's sat in.
    swivel(g, 0, zf + 0.24, Math.PI, '#2b2b30', 0.6);
    const keys = marker(g, mx + 0.02, top + 0.02, kz);
    const pad = marker(g, padX, top + 0.01, padZ);
    const globeAt = marker(g, gx, gy, gz + gr);
    out.work = keys;
    const seat = (m: Motion, work: THREE.Object3D) => sitAt(g, 0, 0.48, zf + 0.24, Math.PI, m, work);
    const spots: Record<string, Spot> = {
      translateDocs: seat('write', pad),
      studyRegion: seat('dpGlobe', globeAt),
      diplomat_cableDraft: seat('type', keys),
      diplomat_treatyReview: seat('write', pad),
      diplomat_deskOfficer: seat('type', keys),
    };
    spots['*'] = spots.translateDocs;
    out.seat = spots.translateDocs.at;
    out.spots = spots;
    // diplomatMotion.ts GLOBE.pad is the pad from the globe's near side in the sitter's frame: keep the two in step.
    out.animate = (t) => {
      const now = nowAt(spots, t);
      translating.visible = now === 'translateDocs' || now === null;
      reviewing.visible = now === 'diplomat_treatyReview';
      cable.visible = now === 'diplomat_cableDraft' || now === 'diplomat_deskOfficer' || now === 'studyRegion';
      spin.rotation.y = now === 'studyRegion' ? -globeTurn(t, phaseOf(spots.studyRegion)) : spin.rotation.y;
    };
  },

  /**
   * The summit hall's negotiating table (회담 테이블): a long mahogany table with a green felt runner
   * on two slab pedestals. Our delegation's side (+z) and the 아르벨리아 delegation's (-z), three
   * places a side, each with a leather blotter and pad, a pen, water; tent nameplates facing the other
   * side (대한민국 수석대표 · 아르벨리아 수석대표 in the middle); a gooseneck microphone at each head
   * of delegation whose ring lights while it's in use; the 태극기 on a desk stand before our head and
   * the 아르벨리아 flag before theirs; a low arrangement of white and pink flowers either end. The
   * delegations sit in the dpDelegateChairs drawn up to it.
   *
   * Negotiating (conductTalks) from our head's chair (dpNegotiate): the draft open on the blotter, the
   * head of the other delegation drawn across, talking while we listen and listening while we put the
   * case, and leaning over to shake on it when the hand's held out. An emergency summit the same with
   * the red 긴급 folder and both mics live; a delegation meeting chaired (dpTalks); a policy brief
   * given with the report and a tablet.
   */
  negotiationTable(g, W, _D, _c, _def, _ctx, out) {
    const w = W - 0.12;
    const d = 0.8;
    const top = TABLE_TOP;
    // The top: mahogany with a lighter banding, the felt runner down the middle.
    part(g, rbox(w, 0.05, d, 0.04), MAHOGANY, 0, top - 0.025, 0);
    part(g, rbox(w - 0.08, 0.004, d - 0.08, 0.02), shade(MAHOGANY, 1.18), 0, top + 0.001, 0, { outline: false });
    part(g, box(w - 0.5, 0.004, 0.22), '#1f4d3a', 0, top + 0.004, 0, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.12, top - 0.07, d - 0.3, 0.02), shade(MAHOGANY, 0.85), sx * (w / 2 - 0.45), (top - 0.07) / 2, 0);
      part(g, rbox(0.2, 0.04, d - 0.18, 0.015), shade(MAHOGANY, 0.7), sx * (w / 2 - 0.45), 0.02, 0);
    }
    part(g, rbox(w - 1.0, 0.08, 0.06, 0.015), shade(MAHOGANY, 0.8), 0, 0.3, 0);
    // The flowers at either end of the runner.
    for (const sx of [-1, 1]) {
      const fx = sx * 0.95;
      part(g, cyl(0.08, 0.06, 0.06, 16), '#cfd8dc', fx, top + 0.03, 0);
      const r = seeded(sx > 0 ? 3 : 5);
      for (let i = 0; i < 11; i++) {
        const a = r() * Math.PI * 2;
        const rr = r() * 0.09;
        part(g, ball(0.024 + r() * 0.01), ['#ffffff', '#f8bbd0', '#ffffff', '#ec407a'][i % 4], fx + Math.cos(a) * rr, top + 0.08 + r() * 0.04, Math.sin(a) * rr * 0.6, { outline: false });
      }
      for (let i = 0; i < 6; i++) part(g, box(0.07, 0.006, 0.025), '#558b2f', fx + (i - 2.5) * 0.04, top + 0.065, (i % 2 ? 1 : -1) * 0.07, { ry: i, outline: false });
    }
    // The places: x across, side +1 ours (+z), -1 theirs.
    const places = [-1, 0, 1];
    for (const side of [1, -1]) {
      const z = side * 0.26;
      for (const x of places) {
        const head = x === 0;
        part(g, rbox(0.42, 0.008, 0.26, 0.006), side > 0 ? LEATHER : '#3a2f2a', x, top + 0.004, z);
        part(g, box(0.15, 0.004, 0.2), '#fafafa', x + 0.06, top + 0.01, z, { outline: false });
        if (!head) pen(g, x + 0.17, top + 0.008, z, 1.4);
        water(g, x - 0.29, top, side * 0.3);
        const name = side > 0 ? (head ? `${KOREA} 수석대표` : KOREA) : head ? `${PARTNER} 수석대표` : PARTNER;
        // The plate faces the other side: its name toward them.
        tentCard(g, name, head ? 0.3 : 0.22, x, top, side * 0.06, '#fafafa', side > 0 ? NAVY : '#00585f');
      }
    }
    // The table flags before each head, the microphones (ours lit when in use).
    deskFlag(g, 0.2, top, 0.08, 0, FLAG.korea());
    deskFlag(g, -0.2, top, -0.08, Math.PI, FLAG.arvelia());
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const lit = group(use, 0, 0, 0);
    gooseMic(g, -0.26, top, 0.1, 0.35, lit, 0.3, 0.13);
    const theirLit = group(use, 0, 0, 0);
    gooseMic(g, 0.26, top, -0.1, Math.PI + 0.35, theirLit, 0.3, 0.13);
    // Our head's place: the navy folder of the draft (closed while nobody's at it).
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const fz = 0.3;
    part(idle, rbox(0.24, 0.02, 0.32, 0.008), NAVY, 0, top + 0.012, fz);
    label(idle, '협정문 초안', 0.14, 0.03, 0, top + 0.023, fz - 0.04, NAVY, '#f5d76e').rotation.set(-Math.PI / 2, 0, Math.PI);
    // In use: the folder open, the draft and the pad, the pen out; for a summit the red folder.
    const talks = group(use, 0, 0, 0);
    part(talks, rbox(0.48, 0.008, 0.32, 0.006), NAVY, 0, top + 0.012, fz);
    flat(talks, painted('dpDraft', 256, 362, paintDraft), 0.2, 0.28, -0.11, top + 0.018, fz, Math.PI);
    part(talks, box(0.16, 0.004, 0.22), '#fff9c4', 0.12, top + 0.018, fz, { outline: false });
    pen(talks, 0.14, top + 0.018, fz + 0.04, 2.2);
    const summit = group(use, 0, 0, 0);
    part(summit, rbox(0.24, 0.02, 0.32, 0.008), '#b71c1c', 0.32, top + 0.012, fz - 0.02, { ry: 0.15 });
    label(summit, '긴 급', 0.1, 0.035, 0.32, top + 0.023, fz - 0.02, '#b71c1c', '#ffffff').rotation.set(-Math.PI / 2, 0, Math.PI + 0.15);
    flat(summit, painted('dpSummit', 256, 362, paintSummit), 0.2, 0.28, -0.11, top + 0.02, fz, Math.PI);
    const brief = group(use, 0, 0, 0);
    flat(brief, painted('dpPolicy', 256, 362, paintPolicy), 0.2, 0.28, -0.11, top + 0.02, fz, Math.PI);
    const tablet = group(brief, 0.15, top + 0.012, fz - 0.02, Math.PI + 0.2);
    part(tablet, rbox(0.17, 0.008, 0.24, 0.01), '#212121', 0, 0, 0);
    glowing(tablet, box(0.15, 0.002, 0.21), '#b2dfdb', 0, 0.006, 0);
    // The head of the other delegation, drawn across for the talks.
    const across = seatedFigure(use, COUNTERPART, SEAT_Y);
    across.root.position.set(0, 0, -(1 - SEAT_Z));
    flat(use, painted('dpDraft', 256, 362, paintDraft), 0.2, 0.28, -0.05, top + 0.014, -fz, 0.1);
    // How it's sat at: our head's chair (the dpDelegateChair a tile out), facing the table.
    const papers = marker(g, 0, top + 0.01, fz);
    out.work = papers;
    const seat = (m: Motion) => sitAt(g, 0, SEAT_Y, 1 - SEAT_Z, Math.PI, m, papers);
    const spots: Record<string, Spot> = {
      conductTalks: seat('dpNegotiate'),
      emergencySummit: seat('dpNegotiate'),
      diplomat_leadDelegation: seat('dpTalks'),
      diplomat_policyBrief: seat('meeting'),
    };
    spots['*'] = spots.conductTalks;
    out.spots = spots;
    // Where the hands meet, in the table's frame (NEG_HAND from the papers, the sitter facing -z).
    const shakeAt = new THREE.Vector3(-NEG_HAND.side, top + 0.01 + NEG_HAND.up, fz - NEG_HAND.ahead);
    const rest = (k: NegKey, t: number, s: number): { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; turn: number } => {
      // The counterpart talks while we listen, listens while we talk, and reaches over to shake.
      switch (k) {
        case 'listen': {
          const lift = 0.03 * Math.sin(t * 4.2 + s);
          return { l: new THREE.Vector3(0.22, top + 0.12 + lift, -0.42), r: new THREE.Vector3(-0.2, top + 0.1 - lift, -0.4), lean: 0.18, nod: -0.05, turn: 0.1 * Math.sin(t * 0.7) };
        }
        case 'shake':
          return { l: new THREE.Vector3(0.12, top + 0.02, -0.4), r: shakeAt.clone().setY(shakeAt.y + shakePump(t)), lean: 0.5, nod: -0.05, turn: 0 };
        case 'note':
          return { l: new THREE.Vector3(0.1, top + 0.02, -0.38), r: new THREE.Vector3(-0.06, top + 0.03, -0.36), lean: 0.12, nod: 0.25, turn: 0 };
        default:
          return { l: new THREE.Vector3(0.08, top + 0.03, -0.36), r: new THREE.Vector3(-0.06, top + 0.035, -0.34), lean: 0.12, nod: 0.08 + 0.06 * Math.max(0, Math.sin(t * 2.4 + s)), turn: 0 };
      }
    };
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const negotiating = now === 'conductTalks' || now === 'emergencySummit';
      talks.visible = now !== 'emergencySummit' && now !== 'diplomat_policyBrief';
      summit.visible = now === 'emergencySummit';
      brief.visible = now === 'diplomat_policyBrief';
      across.root.visible = negotiating;
      theirLit.visible = now === 'emergencySummit' || (negotiating && negBeat(t, phaseOf(spots.conductTalks)).from === 'listen');
      if (!negotiating) return;
      const s = spots[now!];
      const ph = phaseOf(s);
      const b = negBeat(t, ph);
      const a = rest(b.from, t, ph * 7);
      const z = b.e > 0 ? rest(b.to, t, ph * 7) : a;
      const l = a.l.clone().lerp(z.l, b.e);
      const r = a.r.clone().lerp(z.r, b.e);
      across.torso.rotation.x = a.lean + (z.lean - a.lean) * b.e;
      across.head.rotation.x = a.nod + (z.nod - a.nod) * b.e - across.torso.rotation.x * 0.6;
      across.head.rotation.y = a.turn + (z.turn - a.turn) * b.e;
      across.reach(intoFigure(across, l), intoFigure(across, r));
    };
  },

  /**
   * The flag stand (국기 스탠드) for a bilateral meeting: two poles on one walnut plinth with brass
   * collars, the 태극기 on the left as you face them (its gold 무궁화 bud finial) and the 아르벨리아
   * flag on the right (a spearhead), each with a gold fringe and tassel, the cloth stirring. Put
   * straight (dpFlag): the 태극기's cloth reached up to, smoothed down, its corner tugged out — it
   * hangs straighter for it — and looked up at.
   */
  flagStand(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.62, 0.06, 0.34, 0.03), '#3e2723', 0, 0.03, -0.05);
    part(g, rbox(0.56, 0.012, 0.28, 0.006), GOLD, 0, 0.066, -0.05, { outline: false });
    const kr = poleFlag(g, FLAG.korea(), -0.16, -0.05, 0, { side: -1, bud: true, base: false, fh: 0.46, pole: 1.85 });
    const ar = poleFlag(g, FLAG.arvelia(), 0.16, -0.05, 0, { side: 1, base: false, fh: 0.46, pole: 1.85 });
    for (const x of [-0.16, 0.16]) part(g, cyl(0.04, 0.055, 0.08, 14), GOLD, x, 0.1, -0.05);
    const cloth = marker(g, -0.16 - 0.35, 1.52, 0.0);
    out.work = cloth;
    const fix = standAt(g, -0.4, 0.58, Math.PI, 'dpFlag', cloth);
    out.spots = { '*': fix };
    out.animate = (t) => {
      const tidy = posed(fix, t) ? flagTidy(t, phaseOf(fix)) : 0.4;
      kr.wave(t, 0.012 + 0.05 * (1 - tidy));
      ar.wave(t + 0.7, 0.04);
    };
  },

  /**
   * The reception buffet (리셉션 뷔페): a long table in a white cloth to the floor, its pleats and a
   * navy runner with gold edging; a three-tier silver stand of canapés, the champagne flutes in rows
   * on a silver tray with the bottle in its ice bucket, a platter of 한과 and 떡 for the guests from
   * abroad, a tall arrangement of white lilies, the two flags crossed, a card of welcome. Hosting
   * (dpMingle): a canapé taken off the tray and eaten, turned round to the room to raise the flute in
   * a toast, a sip, talked and listened with it in the left hand all through.
   */
  receptionBuffet(g, W, _D, _c, _def, _ctx, out) {
    const w = W - 0.1;
    const d = 0.72;
    const h = 0.78;
    const zc = -0.06;
    const zf = zc + d / 2;
    // The cloth to the floor, its pleats, the runner.
    part(g, rbox(w, 0.04, d, 0.02), '#fafafa', 0, h - 0.02, zc);
    part(g, box(w - 0.02, h - 0.04, d - 0.02), '#f1f1f1', 0, (h - 0.04) / 2, zc);
    for (let i = 0; i < 18; i++) part(g, box(0.02, h - 0.05, 0.012), '#e6e6e6', -w / 2 + 0.06 + i * ((w - 0.12) / 17), (h - 0.05) / 2, zf - 0.005, { outline: false });
    part(g, box(0.4, 0.004, d + 0.02), NAVY, 0, h + 0.002, zc, { outline: false });
    part(g, box(0.4, 0.2, 0.006), NAVY, 0, h - 0.1, zf + 0.006, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.012, 0.204, 0.008), GOLD, sx * 0.2, h - 0.1, zf + 0.008, { outline: false });
    const top = h + 0.004;
    // The canapé stand: three silver tiers, canapés on each.
    const cx = 0.12;
    const cz = zc + 0.02;
    part(g, cyl(0.012, 0.012, 0.42, 8), CHROME, cx, top + 0.21, cz, { outline: false });
    const r = seeded(9);
    [0.17, 0.13, 0.09].forEach((rad, i) => {
      const y = top + 0.04 + i * 0.15;
      part(g, cyl(rad, rad - 0.01, 0.012, 24), '#cfd8dc', cx, y, cz);
      for (let k = 0; k < 6 + (2 - i) * 3; k++) {
        const a = (k / (6 + (2 - i) * 3)) * Math.PI * 2;
        const x = cx + Math.cos(a) * (rad - 0.035);
        const z = cz + Math.sin(a) * (rad - 0.035);
        part(g, cyl(0.016, 0.016, 0.01, 10), '#e0c08a', x, y + 0.012, z, { outline: false });
        part(g, ball(0.012), ['#ef5350', '#66bb6a', '#ffca28', '#8d6e63'][Math.floor(r() * 4)], x, y + 0.022, z, { outline: false });
      }
    });
    part(g, ball(0.02), CHROME, cx, top + 0.44, cz, { outline: false });
    // The canapé tray at the front, where the hand takes one.
    const tx = 0.5;
    const tz = zf - 0.15;
    part(g, rbox(0.34, 0.015, 0.2, 0.01), '#cfd8dc', tx, top + 0.008, tz);
    for (let i = 0; i < 10; i++) {
      const x = tx - 0.13 + (i % 5) * 0.065;
      const z = tz - 0.05 + Math.floor(i / 5) * 0.1;
      part(g, rbox(0.04, 0.012, 0.04, 0.005), '#e8c48a', x, top + 0.022, z, { outline: false });
      part(g, ball(0.013), ['#e57373', '#81c784', '#fff176', '#a1887f', '#ffb74d'][i % 5], x, top + 0.034, z, { outline: false });
    }
    // The flutes on their tray, the bottle in its bucket.
    const fx = -0.5;
    const fz = zc + 0.05;
    part(g, cyl(0.2, 0.2, 0.012, 28), '#cfd8dc', fx, top + 0.006, fz);
    const flute = (parent: THREE.Object3D, x: number, y: number, z: number) => {
      glass(parent, cyl(0.022, 0.006, 0.11, 10), x, y + 0.155, z);
      part(parent, cyl(0.018, 0.005, 0.08, 10), '#f7e7a6', x, y + 0.14, z, { outline: false, material: glow('#f5e4a0') });
      part(parent, cyl(0.003, 0.003, 0.08, 6), '#e3f2fd', x, y + 0.05, z, { outline: false });
      part(parent, cyl(0.025, 0.025, 0.004, 12), '#e3f2fd', x, y + 0.008, z, { outline: false });
    };
    const fluteSpots: Array<[number, number]> = [];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 4 - (i % 2); k++) fluteSpots.push([fx - 0.12 + k * 0.08 + (i % 2) * 0.04, fz - 0.12 + i * 0.08]);
    fluteSpots.forEach(([x, z], i) => (i === 0 ? null : flute(g, x, top + 0.012, z)));
    const taken = new THREE.Group();
    g.add(taken);
    flute(taken, fluteSpots[0][0], top + 0.012, fluteSpots[0][1]);
    const bk = group(g, -0.86, top, zc - 0.12);
    part(bk, cyl(0.075, 0.06, 0.18, 18), '#b0bec5', 0, 0.09, 0);
    part(bk, cyl(0.07, 0.07, 0.01, 18), '#e1f5fe', 0, 0.17, 0, { outline: false });
    part(bk, cyl(0.03, 0.035, 0.22, 12), '#1b5e20', 0.01, 0.2, 0, { rz: 0.2 });
    part(bk, cyl(0.014, 0.024, 0.06, 10), '#1b5e20', 0.04, 0.33, 0, { rz: 0.2 });
    part(bk, cyl(0.016, 0.016, 0.04, 10), GOLD, 0.048, 0.37, 0, { rz: 0.2, outline: false });
    // The 한과 and 떡 platter, the napkins, the welcome card.
    const hx = -0.12;
    const hz = zf - 0.14;
    part(g, cyl(0.13, 0.11, 0.02, 24), '#fafafa', hx, top + 0.01, hz);
    const rr = seeded(13);
    for (let i = 0; i < 12; i++) {
      const a = rr() * Math.PI * 2;
      const rad = 0.03 + rr() * 0.07;
      const col = ['#f48fb1', '#fff59d', '#a5d6a7', '#ffffff', '#ffcc80'][i % 5];
      part(g, i % 2 ? rbox(0.03, 0.018, 0.03, 0.008) : cyl(0.017, 0.017, 0.016, 10), col, hx + Math.cos(a) * rad, top + 0.03, hz + Math.sin(a) * rad, { outline: false });
    }
    for (let i = 0; i < 6; i++) part(g, box(0.12, 0.006, 0.12), i % 2 ? '#ffffff' : NAVY, 0.84, top + 0.004 + i * 0.006, zf - 0.14, { ry: i * 0.1, outline: false });
    tentCard(g, `${PARTNER_FULL} 대표단 환영 리셉션`, 0.4, 0.82, top, zc - 0.1, '#fffdf6', NAVY);
    // The lilies, tall at the back, the crossed flags.
    const lx = -0.25;
    const lz = zc - 0.2;
    glass(g, cyl(0.06, 0.05, 0.25, 16), lx, top + 0.125, lz);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const tip = new THREE.Vector3(lx + Math.cos(a) * 0.12, top + 0.42 + (i % 3) * 0.05, lz + Math.sin(a) * 0.07);
      rod(g, new THREE.Vector3(lx, top + 0.2, lz), tip, 0.005, '#558b2f');
      part(g, cyl(0.035, 0.005, 0.07, 6), '#ffffff', tip.x, tip.y, tip.z, { rx: Math.PI, outline: false });
      part(g, ball(0.006), '#ff8f00', tip.x, tip.y - 0.02, tip.z, { outline: false });
    }
    deskFlags(g, 0.34, top, zc - 0.22, 0, FLAG.korea(), FLAG.arvelia(), 1.2);
    // In use: the flute in the left hand, a canapé at the lips.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const held = new THREE.Group();
    use.add(held);
    held.rotation.order = 'YXZ';
    glass(held, cyl(0.022, 0.006, 0.11, 10), 0, 0.09, 0);
    part(held, cyl(0.018, 0.005, 0.08, 10), '#f7e7a6', 0, 0.075, 0, { outline: false, material: glow('#f5e4a0') });
    part(held, cyl(0.003, 0.003, 0.08, 6), '#e3f2fd', 0, -0.005, 0, { outline: false });
    part(held, cyl(0.025, 0.025, 0.004, 12), '#e3f2fd', 0, -0.045, 0, { outline: false });
    const canape = new THREE.Group();
    use.add(canape);
    part(canape, rbox(0.04, 0.012, 0.04, 0.005), '#e8c48a', 0, 0, 0, { outline: false });
    part(canape, ball(0.013), '#e57373', 0, 0.012, 0, { outline: false });
    const tray = marker(g, tx, top + 0.03, tz + 0.08);
    out.work = tray;
    const host = standAt(g, tx - 0.05, zf + 0.45, Math.PI, 'dpMingle', tray);
    out.spots = { '*': host };
    const at = new THREE.Vector3();
    out.animate = (t) => {
      const on = posed(host, t);
      taken.visible = !on;
      if (!on) return;
      const ph = phaseOf(host);
      const b = mingleBeat(t, ph);
      host.at.rotation.y = Math.PI + b.turn * Math.PI;
      const H = heightAt(host);
      const gl = glassAt(t, ph, H);
      // The hand holds the flute by its stem, just below the bowl.
      fromSpot(host, gl.at.x, gl.at.y - 0.02, gl.at.z, at);
      held.position.copy(at);
      held.rotation.set(-gl.tip, host.at.rotation.y, 0);
      canape.visible = b.from === 'bite' && b.e < 0.3;
      const k = H / 1.6;
      fromSpot(host, CANAPE_AT[0] * k, CANAPE_AT[1] * H + 0.015, CANAPE_AT[2] * k + 0.02, at);
      canape.position.copy(at);
      canape.rotation.y = host.at.rotation.y;
    };
  },

  /**
   * A delegate's chair (대표단 의자): a ceremonial armchair, walnut frame and arms, tufted navy
   * leather, gold nailheads, drawn up close to the table in front of it. A foreign delegation waits
   * sat in one; negotiating a 협정 with them (negotiateTreaty), the diplomat sits in the chair across
   * the table (two tiles out, facing back) with the draft between them (dpTalks); a cultural exchange
   * (cultureExchange) brings out a 나전칠기 box and a 한지 fan as a gift on the table between them.
   */
  dpDelegateChair(g, _W, _D, _c, _def, _ctx, out) {
    armchair(g, 0, 0, 0, LEATHER, SEAT_Z - 0.02);
    out.seat = marker(g, 0, SEAT_Y, SEAT_Z);
    const across = 2 - SEAT_Z;
    // What's set out on the table between them (in a group out in front, so it isn't counted as the chair's body).
    const between = group(g, 0, 0, 1);
    const draft = group(between, 0, 0, 0);
    flat(draft, painted('dpDraft', 256, 362, paintDraft), 0.2, 0.28, 0.0, TABLE_TOP + 0.02, across - 1 - 0.4, Math.PI + 0.05);
    flat(draft, painted('dpDraft', 256, 362, paintDraft), 0.2, 0.28, 0.0, TABLE_TOP + 0.02, -0.32, 0.08);
    pen(draft, 0.16, TABLE_TOP + 0.02, -0.3, 0.9);
    const gift = group(between, 0, 0, 0);
    // The 나전칠기 box: black lacquer, mother-of-pearl flowers, the lid open a little; the fan beside it.
    const bx = group(gift, 0.05, TABLE_TOP + 0.004, 0.05, 0.3);
    part(bx, rbox(0.2, 0.08, 0.14, 0.01), '#111111', 0, 0.04, 0);
    for (let i = 0; i < 5; i++) part(bx, ball(0.012), ['#e0f7fa', '#f3e5f5', '#e8f5e9'][i % 3], -0.07 + i * 0.035, 0.081, (i % 2 ? 1 : -1) * 0.03, { outline: false, material: glow(['#e0f7fa', '#f3e5f5', '#e8f5e9'][i % 3]) }).scale.set(1, 0.3, 1);
    part(bx, rbox(0.2, 0.012, 0.03, 0.005), GOLD, 0, 0.07, 0.07, { outline: false });
    const fan = group(gift, -0.18, TABLE_TOP + 0.006, 0.1, -0.4);
    for (let i = 0; i < 9; i++) part(fan, box(0.02, 0.003, 0.2), i % 2 ? '#fff8e1' : '#ffe0b2', 0, 0, 0.1, { ry: -0.6 + i * 0.15, outline: false }).position.set(Math.sin(-0.6 + i * 0.15) * 0.1, 0, Math.cos(-0.6 + i * 0.15) * 0.1);
    part(fan, cyl(0.012, 0.012, 0.01, 10), '#5d4037', 0, 0.004, 0, { outline: false });
    const papers = marker(g, 0, TABLE_TOP + 0.01, across - 0.4);
    const giftAt = marker(g, 0.05, TABLE_TOP + 0.06, 1.05);
    const spots: Record<string, Spot> = {
      'social:negotiateTreaty': sitAt(g, 0, SEAT_Y, across, Math.PI, 'dpTalks', papers),
      'social:cultureExchange': sitAt(g, 0, SEAT_Y, across, Math.PI, 'meeting', giftAt),
    };
    out.spots = spots;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      draft.visible = now === 'social:negotiateTreaty';
      gift.visible = now === 'social:cultureExchange';
    };
  },

  /**
   * The signing table for a 협정 서명식 (협정 서명 테이블): before a backdrop of the two governments'
   * names, the title and both flags, the 태극기 and the 아르벨리아 flag on their poles behind the two
   * tall ceremonial chairs; the table in a navy cloth to the floor with a gold edge, a navy leather
   * folder at our place and a burgundy one at theirs, a fountain pen in its stand for each, the two
   * flags crossed between them, the nameplates. Signed (dpSign) beside the partner (drawn): the
   * folders opened, signed (the signature written out across the line), shut; the hands shaken turned
   * to each other; the folders held up to the cameras.
   */
  dpSigningTable(g, W, D, _c, _def, _ctx, out) {
    // The backdrop on its frame along the back.
    const bw = W - 0.2;
    const bz = -D / 2 + 0.08;
    const bh = 2.1;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.05, bh + 0.1, 0.05, 0.01), '#b0bec5', sx * (bw / 2 + 0.03), (bh + 0.1) / 2, bz);
      part(g, rbox(0.08, 0.03, 0.4, 0.01), '#90a4ae', sx * (bw / 2 + 0.03), 0.015, bz + 0.1);
    }
    part(g, rbox(bw + 0.1, 0.05, 0.05, 0.01), '#b0bec5', 0, bh + 0.12, bz);
    part(g, box(bw, bh - 0.1, 0.02), NAVY, 0, 0.12 + (bh - 0.1) / 2, bz - 0.01, { outline: false });
    picture(g, painted('dpSigningBackdrop', 768, 576, paintSigningBackdrop), bw, bh - 0.1, 0, 0.12 + (bh - 0.1) / 2, bz + 0.002);
    // The flags on their poles behind the chairs.
    const krF = poleFlag(g, FLAG.korea(), -0.12, bz + 0.3, 0, { side: -1, bud: true, pole: 2.05 });
    const arF = poleFlag(g, FLAG.arvelia(), 0.12, bz + 0.3, 0, { side: 1, pole: 2.05 });
    // The table in its cloth.
    const tz = 0.36;
    const td = 0.7;
    const tw = W - 0.5;
    const top = TABLE_TOP;
    part(g, rbox(tw, 0.04, td, 0.015), NAVY, 0, top - 0.02, tz);
    part(g, box(tw - 0.02, top - 0.04, td - 0.02), shade(NAVY, 0.92), 0, (top - 0.04) / 2, tz);
    part(g, box(tw + 0.01, 0.025, 0.008), GOLD, 0, top - 0.05, tz + td / 2 + 0.002, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.008, 0.025, td + 0.01), GOLD, sx * (tw / 2 + 0.002), top - 0.05, tz, { outline: false });
    part(g, box(tw - 0.6, 0.003, td - 0.2), '#22385f', 0, top + 0.001, tz, { outline: false });
    // The nameplates along the front, the flags crossed in the middle, a pen stand at each place.
    const PX = SIGN_AT.gap;
    tentCard(g, `${KOREA}`, 0.3, -PX, top, tz + td / 2 - 0.07, '#fafafa', NAVY, KOREA);
    tentCard(g, PARTNER_FULL, 0.34, PX, top, tz + td / 2 - 0.07, '#fafafa', '#00585f', PARTNER_FULL);
    deskFlags(g, 0, top, tz + 0.1, 0, FLAG.korea(), FLAG.arvelia(), 1.3);
    for (const sx of [-1, 1]) {
      const ps = group(g, sx * (PX + 0.22), top, tz + 0.12);
      part(ps, rbox(0.1, 0.02, 0.07, 0.008), '#111111', 0, 0.01, 0);
      part(ps, cyl(0.009, 0.012, 0.03, 10), GOLD, 0, 0.035, 0);
      rod(ps, new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(0, 0.15, -0.05), 0.006, '#111111');
    }
    // The chairs: tall, carved, burgundy velvet.
    for (const sx of [-1, 1]) armchair(g, sx * PX, -0.22, 0, BURGUNDY, 0, 0.9);
    // The folders: a back and a cover hinged on the left (+x as the signer has it); open on the table, or held up.
    const folder = (color: string, line: number) => {
      const f = new THREE.Group();
      g.add(f);
      const fw = 0.24;
      part(f, rbox(fw, 0.012, 0.32, 0.006), color, 0, 0.006, 0);
      flat(f, painted('dpSigningPage', 256, 362, paintSigningPage), fw - 0.03, 0.3, 0, 0.013, 0);
      const sig = flat(f, painted('dpSignature', 256, 64, paintSignature), 0.15, 0.04, 0, 0.0135, line);
      (sig.material as THREE.MeshBasicMaterial).transparent = true;
      const hinge = group(f, fw / 2, 0.014, 0);
      const cover = group(hinge, 0, 0, 0);
      part(cover, rbox(fw, 0.01, 0.32, 0.006), color, -fw / 2, 0.005, 0);
      label(cover, '협 정 서', 0.1, 0.03, -fw / 2, 0.011, -0.05, color, '#f5d76e').rotation.set(-Math.PI / 2, 0, 0);
      part(cover, ring(0.03, 0.003), GOLD, -fw / 2, 0.011, 0.04, { rx: Math.PI / 2, outline: false });
      return { f, hinge, sig };
    };
    const ours = folder(NAVY, 0.04);
    const theirs = folder(BURGUNDY, 0.11);
    const FZ = tz - 0.13;
    const rest = (fo: ReturnType<typeof folder>, x: number) => {
      fo.f.position.set(x, top, FZ);
      fo.f.rotation.set(0, 0, 0);
    };
    rest(ours, -PX);
    rest(theirs, PX);
    // The partner (drawn) beside us, in use.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const partner = seatedFigure(use, PARTNER_SIGNER, SEAT_Y);
    partner.root.position.set(PX, 0, -0.22);
    const work = marker(g, -PX, top + 0.015, FZ);
    out.work = work;
    const sign = sitAt(g, -PX, SEAT_Y, -0.22, 0, 'dpSign', work);
    out.spots = { '*': sign };
    const shakeAt = new THREE.Vector3(0, SEAT_Y + SIGN_AT.up, -0.22 + SIGN_AT.ahead);
    const showAt = (k: number, x: number, turn: number) => {
      // Held up in front of the chest, facing out, in the piece's frame.
      const p = new THREE.Vector3(0, SHOW_AT[1] * k, SHOW_AT[2] * k).applyAxisAngle(Y, turn);
      return new THREE.Vector3(x + p.x, SEAT_Y + p.y, -0.22 + p.z);
    };
    const coverAt = (b: { from: SignKey; to: SignKey; e: number; u: number }) => {
      const v = (k: SignKey, u: number) => (k === 'open' ? u : k === 'sign' ? 1 : k === 'close' ? 1 - u : 0);
      return b.e > 0 ? v(b.from, 1) + (v(b.to, 0) - v(b.from, 1)) * b.e : v(b.from, b.u);
    };
    const place = (fo: ReturnType<typeof folder>, x: number, b: ReturnType<typeof signBeat>, k: number, turn: number, signed: number) => {
      const shown = amountOf(b, 'show');
      const onTable = new THREE.Vector3(x, top, FZ);
      const up = showAt(k, x, turn);
      fo.f.position.copy(onTable).lerp(up, shown);
      // Stood up on end, facing out, as it's held up.
      fo.f.rotation.set(shown * (Math.PI / 2 - 0.15), turn * shown, 0, 'YXZ');
      fo.hinge.rotation.z = -Math.PI * 0.97 * Math.max(coverAt(b), shown);
      fo.sig.scale.x = Math.max(0.001, signed);
      fo.sig.position.x = -0.075 * (1 - signed);
    };
    out.animate = (t) => {
      krF.wave(t, 0.03);
      arF.wave(t + 0.6, 0.03);
      const on = posed(sign, t);
      if (!on) {
        sign.at.rotation.y = 0;
        rest(ours, -PX);
        rest(theirs, PX);
        ours.hinge.rotation.z = theirs.hinge.rotation.z = 0;
        ours.sig.scale.x = theirs.sig.scale.x = 0.001;
        return;
      }
      const ph = phaseOf(sign);
      const b = signBeat(t, ph);
      sign.at.rotation.y = b.turn * SIGN_TURN;
      const signed = b.from === 'open' ? 0 : b.from === 'sign' ? THREE.MathUtils.clamp(b.u * 1.1, 0, 1) : 1;
      const k = heightAt(sign) / 1.6;
      place(ours, -PX, b, k, 0, signed);
      place(theirs, PX, b, 1, 0, signed);
      // The partner: signs, turns to shake, holds the folder up.
      partner.root.rotation.y = -b.turn * SIGN_TURN;
      const tf = theirs.f.position;
      const handsOf = (key: SignKey): [THREE.Vector3, THREE.Vector3, number] => {
        switch (key) {
          case 'sign': {
            const u = (t * 0.45 + ph * 3) % 1;
            return [new THREE.Vector3(tf.x + 0.1, top + 0.02, tf.z + 0.02), new THREE.Vector3(tf.x + 0.04 - 0.12 * u, top + 0.025 + 0.005 * Math.sin(t * 30), tf.z - 0.02), 0.32];
          }
          case 'shake':
            return [new THREE.Vector3(tf.x + 0.05, top + 0.02, tf.z), shakeAt.clone().setY(shakeAt.y + shakePump(t)), 0.3];
          case 'show': {
            const c = theirs.f.position;
            return [new THREE.Vector3(c.x + 0.12, c.y, c.z + 0.02), new THREE.Vector3(c.x - 0.12, c.y, c.z + 0.02), 0.04];
          }
          default:
            return [new THREE.Vector3(tf.x + 0.12, top + 0.025, tf.z + 0.03), new THREE.Vector3(tf.x - 0.12, top + 0.025, tf.z + 0.03), 0.24];
        }
      };
      const [al, ar, alean] = handsOf(b.from);
      const [zl, zr, zlean] = b.e > 0 ? handsOf(b.to) : [al, ar, alean];
      partner.torso.rotation.x = alean + (zlean - alean) * b.e;
      partner.head.rotation.x = (b.from === 'sign' ? 0.35 : -0.05) - partner.torso.rotation.x * 0.5;
      partner.reach(intoFigure(partner, al.clone().lerp(zl, b.e)), intoFigure(partner, ar.clone().lerp(zr, b.e)));
    };
  },

  /**
   * The simultaneous interpreters' booth (동시통역 부스): a little room of grey acoustic panels with
   * a door on its side, its window onto the hall, 통역 · INTERPRETATION over it and a 통역 중 lamp
   * that lights while it's working; inside, the console desk along the window — two interpreters'
   * consoles with their channel display, mic and cough keys and volume knobs, two goosenecks, the
   * hall's camera feed on a small monitor, the glossary, water — and two chairs. Interpreting
   * (dpInterpret): the headset on (drawn on the head), the left hand pressing its cup to the ear, the
   * right hand on the notes, shaping the words, jotting a number, on the cough key; the mic's ring
   * lit while it's spoken into.
   */
  dpInterpreterBooth(g, W, D, _c, _def, _ctx, out) {
    interpreterBooth(g, W, D, out, false);
  },
  /**
   * The same booth built into the 회담장's wall (동시통역 부스, 2026-11-06): it stands in its own little room behind the hall, its
   * window flush against the wall with the hall's glass (dpBoothGlass) on the far side, and its door to the piece's front, where
   * it's walked into from. Turned a quarter (the window to the piece's left, -x), and with the sign and the lamp on the hall's side.
   */
  dpBoothInWall(g, W, D, _c, _def, _ctx, out) {
    interpreterBooth(group(g, 0, 0, 0, -Math.PI / 2), W, D, out, true);
  },

  /**
   * The window into the interpreters' booth from the 회담장 (통역 부스 창, 2026-11-06): stood on one tile against the wall and drawn
   * two tiles long towards +x, a dark-framed window in the wall with the booth seen through it — the acoustic panels, the console
   * desk, the goosenecks and two interpreters in their headsets — 통역 · INTERPRETATION over it and the 통역 중 lamp.
   */
  dpBoothGlass(g, _W, D) {
    const bz = -D / 2;
    const ox = 0.5;
    const ww = 1.7;
    const wh = 1.0;
    const wy = 1.4;
    picture(g, painted('dpBoothView', 384, 224, paintBoothView), ww, wh, ox, wy, bz + 0.012);
    glass(g, box(ww, wh, 0.006), ox, wy, bz + 0.05);
    const F = '#263238';
    part(g, rbox(ww + 0.14, 0.07, 0.1, 0.01), F, ox, wy + wh / 2 + 0.035, bz + 0.05);
    part(g, rbox(ww + 0.18, 0.05, 0.16, 0.01), F, ox, wy - wh / 2 - 0.025, bz + 0.08);
    for (const sx of [-1, 1]) part(g, rbox(0.07, wh, 0.1, 0.01), F, ox + sx * (ww / 2 + 0.035), wy, bz + 0.05);
    part(g, rbox(0.04, wh, 0.07, 0.008), F, ox, wy, bz + 0.05);
    const sy = wy + wh / 2 + 0.2;
    part(g, rbox(1.0, 0.16, 0.04, 0.01), F, ox - 0.25, sy, bz + 0.02);
    label(g, '통역 · INTERPRETATION', 0.9, 0.12, ox - 0.25, sy, bz + 0.045, F, '#eceff1');
    part(g, rbox(0.34, 0.12, 0.04, 0.01), '#212121', ox + 0.6, sy, bz + 0.02);
    label(g, '통역 중', 0.28, 0.08, ox + 0.6, sy, bz + 0.045, '#3a1010', '#ff8a80');
  },

  /**
   * The 외교 행낭 safe (외교 행낭 보안 금고): a heavy green-grey safe on its plinth, the combination
   * dial and a keypad with its light, the three-spoke handle, the hinges, a brass plate; the 외교
   * 행낭 itself on top — a canvas bag with leather straps, 외교행낭 · DIPLOMATIC POUCH on its label,
   * the red seal tag on its wire — the dispatch log and the seal press beside it. Sealed (tinker): the
   * door swung open on its shelves of red-stamped 대외비 envelopes, the pouch's neck drawn up and
   * the seal pressed on its wire.
   */
  dpPouchSafe(g, _W, D, _c, _def, _ctx, out) {
    const w = 0.64;
    const d = 0.56;
    const H = 1.02;
    const zc = -D / 2 + d / 2 + 0.05;
    const zf = zc + d / 2;
    const STEEL = '#4f5d58';
    part(g, rbox(w + 0.06, 0.08, d + 0.04, 0.01), '#263238', 0, 0.04, zc);
    part(g, rbox(w, H, d, 0.03), STEEL, 0, 0.08 + H / 2, zc);
    // The door: shut, or swung open on its hinges (on the left as you face it).
    const doorFront = (parent: THREE.Object3D) => {
      part(parent, rbox(w - 0.08, H - 0.1, 0.05, 0.02), shade(STEEL, 1.1), (w - 0.08) / 2, 0, 0.025);
      const cx = (w - 0.08) / 2;
      part(parent, cyl(0.075, 0.075, 0.03, 28), CHROME, cx - 0.08, 0.18, 0.06, { rx: Math.PI / 2 });
      part(parent, cyl(0.055, 0.055, 0.035, 28), '#263238', cx - 0.08, 0.18, 0.07, { rx: Math.PI / 2 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        part(parent, box(0.004, 0.012, 0.004), '#eceff1', cx - 0.08 + Math.sin(a) * 0.068, 0.18 + Math.cos(a) * 0.068, 0.08, { rz: -a, outline: false });
      }
      const hub = group(parent, cx - 0.08, -0.05, 0.07);
      part(hub, cyl(0.03, 0.03, 0.04, 14), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        rod(hub, new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.03), 0.009, CHROME);
        part(hub, ball(0.018), '#212121', Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.03);
      }
      const kp = group(parent, cx + 0.14, 0.18, 0.055);
      part(kp, rbox(0.1, 0.15, 0.015, 0.006), '#212121', 0, 0, 0);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) part(kp, box(0.02, 0.02, 0.006), '#cfd8dc', -0.028 + c * 0.028, 0.035 - r * 0.026, 0.01, { outline: false });
      glowing(kp, box(0.06, 0.012, 0.004), '#ff1744', 0, 0.062, 0.01);
      part(parent, rbox(0.24, 0.05, 0.006, 0.003), GOLD, cx, -0.3, 0.054, { outline: false });
      label(parent, '보안문서 보관함 · Ⅱ급', 0.22, 0.035, cx, -0.3, 0.058, GOLD, '#3e2723');
    };
    const hingeX = -w / 2 + 0.04;
    const hingeY = 0.08 + H / 2;
    for (const y of [-0.3, 0.3]) part(g, cyl(0.018, 0.018, 0.1, 10), CHROME, hingeX - 0.01, hingeY + y, zf + 0.01);
    const shut = group(g, hingeX, hingeY, zf);
    doorFront(shut);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const open = group(use, hingeX, hingeY, zf, -1.9);
    doorFront(open);
    out.idle = shut;
    // Inside (seen with the door open): the shelves and envelopes, a red 대외비 stamp on each.
    part(use, box(w - 0.1, H - 0.14, 0.01), '#263238', 0, hingeY, zf - 0.005);
    for (let i = 0; i < 3; i++) {
      const y = 0.2 + i * 0.3;
      part(use, box(w - 0.12, 0.015, d - 0.1), '#90a4ae', 0, y, zc + 0.05);
      for (let k = 0; k < 5; k++) {
        part(use, box(0.012, 0.22, 0.3), k % 2 ? '#d7ccc8' : '#efebe9', -0.2 + k * 0.03, y + 0.12, zc + 0.08, { outline: false });
      }
      label(use, '대외비', 0.1, 0.035, 0.12, y + 0.06, zc + 0.24, '#ffebee', '#c62828');
      part(use, rbox(0.18, 0.04, 0.25, 0.006), '#a1887f', 0.12, y + 0.03, zc + 0.08);
    }
    // On top: the pouch, the log and the seal press.
    const ty = 0.08 + H;
    const pouch = group(g, 0.04, ty, zc + 0.02, 0.15);
    part(pouch, rbox(0.4, 0.2, 0.26, 0.08), '#8d8a74', 0, 0.1, 0);
    part(pouch, cyl(0.07, 0.12, 0.1, 14), '#7d7a64', 0, 0.24, 0);
    for (const sx of [-1, 1]) part(pouch, box(0.035, 0.205, 0.27), '#5d4037', sx * 0.12, 0.1, 0, { outline: false });
    part(pouch, rbox(0.2, 0.1, 0.01, 0.005), '#fafafa', 0, 0.11, 0.135);
    label(pouch, '외교행낭', 0.17, 0.04, 0, 0.125, 0.142, '#fafafa', '#1a2b4c');
    label(pouch, 'DIPLOMATIC POUCH', 0.17, 0.025, 0, 0.088, 0.142, '#fafafa', '#c62828');
    rod(pouch, new THREE.Vector3(0, 0.28, 0), new THREE.Vector3(0.05, 0.2, 0.12), 0.002, '#9e9e9e');
    part(pouch, cyl(0.022, 0.022, 0.012, 14), '#c62828', 0.05, 0.19, 0.125, { rx: Math.PI / 2 });
    part(g, rbox(0.16, 0.035, 0.22, 0.006), '#1a237e', -0.22, ty + 0.018, zc - 0.05, { ry: -0.1 });
    label(g, '행낭 발송 대장', 0.12, 0.028, -0.22, ty + 0.037, zc - 0.05, '#1a237e', '#ffffff').rotation.set(-Math.PI / 2, 0, 0.1);
    const press = group(g, 0.25, ty, zc - 0.17);
    part(press, rbox(0.08, 0.02, 0.08, 0.006), '#424242', 0, 0.01, 0);
    rod(press, new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 0.1, 0.02), 0.01, '#616161');
    part(press, rbox(0.12, 0.015, 0.025, 0.005), '#616161', 0, 0.1, 0.03, { ry: 0.3 });
    const neck = marker(g, 0.06, ty + 0.24, zc + 0.08);
    out.work = neck;
    out.spots = { '*': standAt(g, 0.05, zf + 0.42, Math.PI, 'tinker', neck) };
  },

  /**
   * The world-time clocks (세계 시각 시계) over a low walnut credenza: five brass-rimmed clocks on a
   * walnut board — 서울 in the middle, larger, with 뉴욕, 런던, 제네바 and 아르벨 (the partner's capital,
   * made up) either side, each hand set to its own hour, the seconds ticking on 서울's — with a plate
   * of each city's name and offset under it and 세계 주요 도시 시각 over them; on the credenza the
   * day's newspapers, a tray of files and a little orchid.
   */
  dpWorldClocks(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.12;
    const zb = -D / 2 + 0.05;
    // The credenza.
    const cd = 0.42;
    const cz = zb + cd / 2;
    part(g, rbox(w, 0.66, cd, 0.015), WALNUT, 0, 0.36, cz);
    part(g, rbox(w + 0.03, 0.035, cd + 0.03, 0.012), shade(WALNUT, 1.15), 0, 0.705, cz);
    for (let i = 0; i < 4; i++) {
      part(g, rbox(w / 4 - 0.04, 0.54, 0.012, 0.005), shade(WALNUT, 1.08), -w / 2 + (i + 0.5) * (w / 4), 0.36, cz + cd / 2 + 0.002);
      part(g, cyl(0.012, 0.012, 0.02, 10), GOLD, -w / 2 + (i + 0.5) * (w / 4) + (i % 2 ? -1 : 1) * 0.12, 0.42, cz + cd / 2 + 0.014, { rx: Math.PI / 2, outline: false });
    }
    for (const sx of [-1, 1]) part(g, rbox(0.05, 0.05, cd - 0.06, 0.01), '#3e2723', sx * (w / 2 - 0.08), 0.025, cz);
    const top = 0.725;
    part(g, rbox(0.3, 0.02, 0.22, 0.004), '#f5f5f5', -0.55, top + 0.01, cz, { ry: 0.08 });
    part(g, rbox(0.3, 0.02, 0.22, 0.004), '#eeeeee', -0.53, top + 0.03, cz, { ry: -0.05 });
    label(g, '외교 일보', 0.14, 0.04, -0.53, top + 0.042, cz - 0.05, '#eeeeee', '#212121').rotation.set(-Math.PI / 2, 0, 0.05);
    part(g, rbox(0.26, 0.05, 0.3, 0.008), '#3e2723', 0.15, top + 0.025, cz);
    for (let i = 0; i < 3; i++) part(g, box(0.22, 0.01, 0.26), ['#90caf9', '#ef9a9a', '#fff59d'][i], 0.15, top + 0.05 + i * 0.012, cz, { outline: false });
    part(g, cyl(0.05, 0.04, 0.08, 14), '#fafafa', 0.6, top + 0.04, cz);
    for (let i = 0; i < 3; i++) {
      rod(g, new THREE.Vector3(0.6, top + 0.08, cz), new THREE.Vector3(0.58 + i * 0.03, top + 0.3 + i * 0.04, cz + 0.02), 0.004, '#33691e');
      for (let k = 0; k < 3; k++) part(g, ball(0.02), k % 2 ? '#f8bbd0' : '#ffffff', 0.58 + i * 0.03 + k * 0.03, top + 0.28 + i * 0.04 - k * 0.03, cz + 0.04, { outline: false }).scale.set(1, 0.5, 1);
    }
    // The board and its clocks.
    const by = 1.62;
    const bh = 0.62;
    part(g, rbox(w, bh, 0.04, 0.015), WALNUT, 0, by, zb);
    part(g, rbox(w - 0.06, 0.08, 0.01, 0.004), shade(WALNUT, 0.7), 0, by + bh / 2 - 0.07, zb + 0.022);
    label(g, '세계 주요 도시 시각', 0.6, 0.06, 0, by + bh / 2 - 0.07, zb + 0.028, '#3e2723', '#f5d76e');
    const cities: Array<[string, number, number]> = [
      ['뉴욕', -13, 0.12],
      ['런던', -9, 0.12],
      ['서울', 0, 0.16],
      ['제네바', -8, 0.12],
      ['아르벨', -6, 0.12],
    ];
    const hands: Array<{ h: THREE.Object3D; m: THREE.Object3D; s?: THREE.Object3D; off: number }> = [];
    const dial = painted('dpDial', 128, 128, paintDial);
    cities.forEach(([name, off, r], i) => {
      const x = (i - 2) * ((w - 0.2) / 4.6) * 1.0;
      const y = by - 0.02;
      const z = zb + 0.03;
      part(g, cyl(r + 0.015, r + 0.015, 0.03, 28), GOLD, x, y, z, { rx: Math.PI / 2 });
      const face = picture(g, dial, r * 2, r * 2, x, y, z + 0.017);
      void face;
      const hand = (len: number, wd: number, color: string, dz: number) => {
        const p = group(g, x, y, z + dz);
        part(p, box(wd, len, 0.004), color, 0, len / 2 - 0.01, 0, { outline: false });
        return p;
      };
      const h = hand(r * 0.55, 0.012, '#3e2723', 0.022);
      const m = hand(r * 0.82, 0.008, '#3e2723', 0.025);
      const s = i === 2 ? hand(r * 0.86, 0.003, '#c62828', 0.028) : undefined;
      part(g, ball(0.008), GOLD, x, y, z + 0.03, { outline: false });
      hands.push({ h, m, s, off });
      label(g, `${name} ${off === 0 ? 'GMT+9' : `${off > 0 ? '+' : ''}${off}h`}`, 0.2, 0.045, x, y - r - 0.07, z + 0.012, '#3e2723', '#fbf6e9');
    });
    // Seoul's time runs from 10:08 at a minute a second.
    out.animate = (t) => {
      const minutes = 10 * 60 + 8 + t;
      for (const c of hands) {
        const local = minutes + c.off * 60 + 24 * 60;
        c.m.rotation.z = -((local % 60) / 60) * Math.PI * 2;
        c.h.rotation.z = -((((local / 60) % 12) + 12) % 12 / 12) * Math.PI * 2;
        if (c.s) c.s.rotation.z = -(Math.floor(t * 60) % 60) / 60 * Math.PI * 2;
      }
    };
  },

  /**
   * A row of flags (국기 게양대) along the lobby wall: five poles in a granite plinth, the 태극기 in
   * the middle on the tallest with its 무궁화 bud, and the flags of the made-up nations we deal with
   * either side (솔바렌 왕국, 아르벨리아 공화국, 카엘라 연방, 메리디아 공화국), each named on a
   * brass plate on the plinth; a red rope on brass posts before them.
   */
  dpFlagRow(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.1;
    const z = -D / 2 + 0.22;
    part(g, rbox(w, 0.14, 0.34, 0.02), '#9e9e9e', 0, 0.07, z);
    part(g, rbox(w + 0.02, 0.02, 0.36, 0.01), '#bdbdbd', 0, 0.15, z);
    const row: Array<[THREE.Texture, string, boolean]> = [
      [FLAG.solvaren(), '솔바렌 왕국', false],
      [FLAG.arvelia(), PARTNER_FULL, false],
      [FLAG.korea(), KOREA, true],
      [FLAG.kaela(), '카엘라 연방', false],
      [FLAG.meridia(), '메리디아 공화국', false],
    ];
    const step = 0.6;
    const flags = row.map(([tex, name, home], i) => {
      const x = -1.25 + i * step;
      part(g, cyl(0.035, 0.045, 0.06, 12), GOLD, x, 0.18, z);
      part(g, rbox(0.34, 0.06, 0.006, 0.003), GOLD, x + 0.25, 0.075, z + 0.172, { outline: false });
      label(g, name, 0.32, 0.045, x + 0.25, 0.075, z + 0.176, GOLD, '#3e2723');
      return poleFlag(g, tex, x, z, 0, { side: 1, base: false, bud: home, pole: home ? 2.25 : 2.05, fw: 0.48, fh: 0.33 });
    });
    // The rope on its posts.
    const rz = z + 0.42;
    const posts = [-w / 2 + 0.1, 0, w / 2 - 0.1];
    for (const x of posts) {
      part(g, cyl(0.1, 0.12, 0.03, 18), GOLD, x, 0.015, rz);
      part(g, cyl(0.02, 0.02, 0.85, 10), GOLD, x, 0.44, rz, { outline: false });
      part(g, ball(0.035), GOLD, x, 0.89, rz);
    }
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      const n = 8;
      for (let k = 0; k < n; k++) {
        const u0 = k / n;
        const u1 = (k + 1) / n;
        const y = (u: number) => 0.82 - 0.16 * Math.sin(u * Math.PI);
        rod(g, new THREE.Vector3(a + (b - a) * u0, y(u0), rz), new THREE.Vector3(a + (b - a) * u1, y(u1), rz), 0.016, '#8e1b2b');
      }
    }
    out.animate = (t) => flags.forEach((f, i) => f.wave(t + i * 0.9, 0.035));
  },

  /**
   * The bag scanner at the 청사's security line (엑스레이 검색대, 2026-11-05, the layout audit): a grey tunnel with its lead
   * curtains over a belt on rollers, a grey tray waiting at the mouth, the operator's screen on its arm showing a bag in false
   * colour, and 보안 검색 over the tunnel. Its belt runs across the tile, the public side at +z.
   */
  dpBagScanner(g, W) {
    const L = W - 0.1;
    const BELT_Y = 0.72;
    // The frame and the belt with its rollers either end.
    part(g, rbox(L, 0.06, 0.56, 0.01), '#78909c', 0, BELT_Y - 0.03, 0);
    part(g, box(L - 0.04, 0.01, 0.48), '#263238', 0, BELT_Y + 0.006, 0, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, BELT_Y - 0.06, 0.48, 0.01), '#90a4ae', sx * (L / 2 - 0.08), (BELT_Y - 0.06) / 2, 0);
      for (let i = 0; i < 3; i++) part(g, cyl(0.02, 0.02, 0.48, 10), CHROME, sx * (L / 2 - 0.1 - i * 0.07), BELT_Y + 0.01, 0, { rx: Math.PI / 2, outline: false });
    }
    // The tunnel.
    const TW = 0.9;
    part(g, rbox(TW, 0.62, 0.66, 0.04), '#cfd8dc', 0, BELT_Y + 0.31, 0);
    for (const sx of [-1, 1]) {
      part(g, box(0.01, 0.42, 0.5), '#37474f', sx * (TW / 2 + 0.004), BELT_Y + 0.22, 0, { outline: false });
      for (let i = 0; i < 6; i++) part(g, box(0.012, 0.4, 0.075), '#455a64', sx * (TW / 2 + 0.012), BELT_Y + 0.21, -0.2 + i * 0.08, { outline: false });
    }
    part(g, rbox(0.62, 0.1, 0.01, 0.005), '#1e3a5f', 0, BELT_Y + 0.5, 0.335, { outline: false });
    label(g, '보안 검색', 0.5, 0.08, 0, BELT_Y + 0.5, 0.341, '#1e3a5f', '#ffffff');
    glowing(g, box(0.05, 0.03, 0.01), '#66bb6a', TW / 2 - 0.08, BELT_Y + 0.58, 0.336);
    // A tray at the mouth with a bag in it.
    part(g, rbox(0.4, 0.06, 0.3, 0.01), '#9e9e9e', -L / 2 + 0.3, BELT_Y + 0.04, 0);
    part(g, rbox(0.3, 0.14, 0.18, 0.03), '#3e2723', -L / 2 + 0.3, BELT_Y + 0.13, 0);
    // The operator's screen on its arm, turned to the inner side.
    rod(g, new THREE.Vector3(L / 2 - 0.15, BELT_Y, -0.26), new THREE.Vector3(L / 2 - 0.15, BELT_Y + 0.55, -0.3), 0.015, '#546e7a');
    const scr = group(g, L / 2 - 0.15, BELT_Y + 0.6, -0.3, Math.PI);
    part(scr, rbox(0.36, 0.26, 0.04, 0.01), BLACK, 0, 0, 0);
    picture(scr, painted('dpScanView', 256, 184, (c) => {
      c.fillStyle = '#0b1a2a';
      c.fillRect(0, 0, 256, 184);
      c.fillStyle = '#ff9800';
      c.fillRect(48, 50, 160, 90);
      c.fillStyle = '#4caf50';
      c.fillRect(70, 70, 50, 40);
      c.fillStyle = '#2196f3';
      c.fillRect(140, 64, 44, 60);
      c.fillStyle = '#ffffff';
      c.font = 'bold 18px sans-serif';
      c.fillText('X-RAY 1', 10, 24);
    }), 0.32, 0.22, 0, 0, 0.022);
  },

  /**
   * The stone at the 청사's gate (청사 표지석, 2026-11-05, the layout audit): a long granite block on a low plinth with 외교부 cut
   * into its face and picked out in black, the 청사's name below, a bed of clipped box shrubs in front.
   */
  dpGovSign(g, W) {
    const L = W - 0.4;
    part(g, rbox(L + 0.2, 0.12, 0.7, 0.02), '#9e9e9e', 0, 0.06, -0.05);
    part(g, rbox(L, 0.9, 0.42, 0.04), '#bdb8ae', 0, 0.57, -0.1);
    part(g, rbox(L - 0.1, 0.04, 0.38, 0.02), shade('#bdb8ae', 1.08), 0, 1.04, -0.1);
    label(g, '외 교 부', 1.3, 0.34, 0, 0.7, 0.115, '#bdb8ae', '#1b1b1b');
    label(g, '외교부 청사', 0.8, 0.12, 0, 0.36, 0.115, '#bdb8ae', '#3e3e3e');
    for (let i = 0; i < 5; i++) part(g, ball(0.16), '#3b6e2c', -L / 2 + 0.25 + i * ((L - 0.5) / 4), 0.16, 0.24, { outline: false });
  },

  /**
   * One more place at the negotiating table (회담 테이블 보조석, 2026-11-05, the layout audit): a section of the same mahogany top
   * and felt runner on its own slab pedestal, set at the table's end so each side seats four, a place laid either side (the
   * blotter and pad, the water, the tent card toward the other side).
   */
  dpTableWing(g, W) {
    const w = W + 0.12;
    const d = 0.8;
    const top = TABLE_TOP;
    part(g, rbox(w, 0.05, d, 0.02), MAHOGANY, 0, top - 0.025, 0);
    part(g, box(w - 0.08, 0.004, d - 0.08), shade(MAHOGANY, 1.18), 0, top + 0.001, 0, { outline: false });
    part(g, box(w, 0.004, 0.22), '#1f4d3a', 0, top + 0.004, 0, { outline: false });
    part(g, rbox(0.12, top - 0.07, d - 0.3, 0.02), shade(MAHOGANY, 0.85), 0, (top - 0.07) / 2, 0);
    part(g, rbox(0.2, 0.04, d - 0.18, 0.015), shade(MAHOGANY, 0.7), 0, 0.02, 0);
    for (const side of [1, -1]) {
      const z = side * 0.26;
      part(g, rbox(0.42, 0.008, 0.26, 0.006), side > 0 ? LEATHER : '#3a2f2a', 0, top + 0.004, z);
      part(g, box(0.15, 0.004, 0.2), '#fafafa', 0.06, top + 0.01, z, { outline: false });
      water(g, -0.29, top, side * 0.3);
      tentCard(g, side > 0 ? KOREA : PARTNER, 0.22, 0, top, side * 0.06, '#fafafa', side > 0 ? NAVY : '#00585f');
    }
  },

  /**
   * A locked cabinet of the 보안 문서실 (보안 문서함, 2026-11-05, the layout audit): grey steel, four drawers with their pulls and
   * card holders, a combination dial and a locking bar down its front, a red 대외비 label and the 비밀 관리 tag.
   */
  dpSecureCabinet(g, _W, D) {
    const w = 0.5;
    const d = 0.6;
    const H = 1.32;
    const zc = -D / 2 + d / 2 + 0.04;
    const zf = zc + d / 2;
    const STEEL = '#78909c';
    part(g, rbox(w, H, d, 0.02), STEEL, 0, H / 2, zc);
    for (let i = 0; i < 4; i++) {
      const y = 0.18 + i * 0.31;
      part(g, rbox(w - 0.05, 0.28, 0.02, 0.01), shade(STEEL, 1.08), 0, y, zf + 0.01);
      part(g, rbox(0.16, 0.025, 0.03, 0.008), CHROME, 0, y + 0.06, zf + 0.03);
      part(g, box(0.08, 0.04, 0.005), PAPER, 0, y - 0.04, zf + 0.022, { outline: false });
    }
    part(g, box(0.035, H - 0.12, 0.03), '#37474f', w / 2 - 0.06, H / 2, zf + 0.04);
    part(g, cyl(0.04, 0.04, 0.03, 20), '#212121', -w / 2 + 0.09, H - 0.08, zf + 0.03, { rx: Math.PI / 2 });
    part(g, rbox(0.2, 0.06, 0.006, 0.003), '#c62828', 0.02, H - 0.08, zf + 0.022, { outline: false });
    label(g, '대외비', 0.18, 0.05, 0.02, H - 0.08, zf + 0.026, '#c62828', '#ffffff');
  },
};

/** What's seen through the booth's window from the hall: the foam, the console desk, two interpreters in headsets at it. */
const paintBoothView: Paint = (c) => {
  const w = 384;
  const h = 224;
  c.fillStyle = '#4a545b';
  c.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 8; k++) {
    c.fillStyle = (r + k) % 2 ? '#525d64' : '#444d53';
    c.fillRect(k * (w / 8) + 2, r * (h * 0.15) + 2, w / 8 - 4, h * 0.15 - 4);
  }
  for (const x of [w * 0.3, w * 0.7]) {
    c.fillStyle = '#263238';
    c.fillRect(x - 46, h * 0.5, 92, h * 0.4);
    c.fillStyle = '#e0b48c';
    c.beginPath();
    c.arc(x, h * 0.42, 24, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2b1b10';
    c.beginPath();
    c.arc(x, h * 0.38, 25, Math.PI, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#111';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(x, h * 0.42, 28, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
    c.fillStyle = '#111';
    c.fillRect(x - 33, h * 0.4, 10, 18);
    c.fillRect(x + 23, h * 0.4, 10, 18);
  }
  c.fillStyle = '#cfd8dc';
  c.fillRect(0, h * 0.74, w, 12);
  c.fillStyle = '#90a4ae';
  c.fillRect(0, h * 0.74 + 12, w, h);
  c.strokeStyle = '#212121';
  c.lineWidth = 3;
  for (const x of [w * 0.36, w * 0.76]) {
    c.beginPath();
    c.moveTo(x, h * 0.74);
    c.quadraticCurveTo(x, h * 0.55, x - 20, h * 0.52);
    c.stroke();
  }
};

/** The booth (dpInterpreterBooth), free-standing or (`inWall`) built behind the hall's wall with its sign and lamp on dpBoothGlass. */
function interpreterBooth(g: THREE.Object3D, W: number, D: number, out: Parameters<Builder>[6], inWall: boolean) {
    const PANEL = '#5f6b73';
    const FOAM = '#4a545b';
    const hw = W / 2 - 0.04;
    const hd = D / 2 - 0.04;
    const H = 2.15;
    part(g, rbox(W - 0.08, 0.06, D - 0.08, 0.01), '#37474f', 0, 0.03, 0);
    // The back wall and its foam, the side walls (the door on the right), a rim round the top (no roof: it's looked into from above).
    part(g, rbox(W - 0.08, H, 0.08, 0.01), PANEL, 0, H / 2, -hd + 0.04);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) part(g, box(0.25, 0.25, 0.03), (r + c) % 2 ? FOAM : shade(FOAM, 1.15), -0.75 + c * 0.3, 0.55 + r * 0.3, -hd + 0.095, { outline: false });
    part(g, rbox(0.08, H, D - 0.08, 0.01), PANEL, -hw + 0.04, H / 2, 0);
    part(g, rbox(0.08, H, 0.6, 0.01), PANEL, hw - 0.04, H / 2, -hd + 0.34);
    part(g, rbox(0.08, H, 0.35, 0.01), PANEL, hw - 0.04, H / 2, hd - 0.2);
    const door = group(g, hw - 0.04, 0, -hd + 0.64);
    part(door, rbox(0.06, H - 0.12, 0.9, 0.01), shade(PANEL, 1.12), 0, (H - 0.12) / 2, 0.45);
    glass(door, box(0.07, 0.4, 0.25), 0, 1.45, 0.45);
    part(door, rbox(0.05, 0.03, 0.14, 0.01), CHROME, 0.05, 1.0, 0.78);
    for (const sz of [-1, 1]) part(g, rbox(W - 0.04, 0.06, 0.1, 0.01), shade(PANEL, 0.8), 0, H + 0.03, sz * (hd - 0.03));
    for (const sx of [-1, 1]) part(g, rbox(0.1, 0.06, D - 0.04, 0.01), shade(PANEL, 0.8), sx * (hw - 0.03), H + 0.03, 0);
    // The front: a panel up to the desk, the window, its frame and mullion, the sign and lamp over it.
    part(g, rbox(W - 0.08, 0.78, 0.06, 0.01), PANEL, 0, 0.39, hd - 0.03);
    glass(g, box(W - 0.2, 1.1, 0.02), 0, 1.38, hd - 0.03);
    part(g, rbox(W - 0.08, 0.06, 0.08, 0.01), '#263238', 0, 0.81, hd - 0.03);
    part(g, rbox(W - 0.08, 0.3, 0.08, 0.01), PANEL, 0, H - 0.15, hd - 0.03);
    part(g, rbox(0.05, 1.1, 0.07, 0.01), '#263238', 0, 1.38, hd - 0.03);
    if (!inWall) {
      label(g, '통역 · INTERPRETATION', 0.9, 0.12, -0.25, H - 0.15, hd + 0.015, '#263238', '#eceff1');
      part(g, rbox(0.34, 0.12, 0.04, 0.01), '#212121', 0.6, H - 0.15, hd + 0.02);
      label(g, '통역 중', 0.28, 0.08, 0.6, H - 0.15, hd + 0.042, '#3a1010', '#7a3a3a');
    }
    // The console desk along the window inside.
    const top = 0.76;
    const dz = hd - 0.25;
    part(g, rbox(W - 0.24, 0.04, 0.44, 0.01), '#cfd8dc', 0, top - 0.02, dz);
    part(g, rbox(W - 0.24, top - 0.06, 0.04, 0.01), '#90a4ae', 0, (top - 0.06) / 2, dz + 0.19);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const lit = group(use, 0, 0, 0);
    // Ours at -x (on the right as the interpreter faces the window, +z); the colleague's at +x.
    const sx0 = -0.45;
    const seatZ = 0.12;
    const notesZ = dz - 0.14;
    for (const x of [sx0, -sx0]) {
      // The console to the right of the notes (INTERP_KEY from them): the display angled up, the red
      // mic key, the white cough key under the hand, two knobs.
      const keyX = x + INTERP_KEY.side;
      const keyZ = notesZ + INTERP_KEY.ahead;
      const con = group(g, keyX - 0.06, top, keyZ);
      part(con, rbox(0.24, 0.035, 0.18, 0.01), '#37474f', 0, 0.018, 0);
      const disp = group(con, 0, 0.045, -0.06);
      disp.rotation.x = -0.6;
      part(disp, rbox(0.2, 0.06, 0.012, 0.004), '#263238', 0, 0, 0);
      label(disp, 'CH1 한 ▸ CH2 아', 0.18, 0.045, 0, 0, 0.007, '#0b1f12', '#69f0ae');
      part(con, rbox(0.05, 0.012, 0.045, 0.006), '#c62828', -0.06, 0.04, 0.03);
      part(con, rbox(0.05, 0.012, 0.045, 0.006), '#eceff1', 0.06, 0.04, 0.0);
      for (let i = 0; i < 2; i++) part(con, cyl(0.013, 0.013, 0.02, 10), '#212121', -0.08 + i * 0.04, 0.045, -0.03, { outline: false });
      // The gooseneck from the window side, bending back to the mouth.
      gooseMic(g, x + 0.1, top, dz + 0.14, Math.PI + 0.2, x === sx0 ? lit : undefined, 0.34, 0.22);
      // The glossary (the notes), a pencil.
      flat(g, painted('dpGlossary', 256, 362, paintDraftOf('회담 용어집 (한-아르벨리아)', '경제·문화 분야', '용 어 집', '#37474f')), 0.15, 0.21, x, top + 0.003, notesZ, 0.05);
      part(g, cyl(0.004, 0.004, 0.13, 6), '#ffb300', x + 0.13, top + 0.006, notesZ + 0.03, { rz: Math.PI / 2, ry: 0.4, outline: false });
    }
    // The colleague's headset on the desk; ours on its hook unless it's on.
    const headset = (parent: THREE.Object3D) => {
      const h = new THREE.Group();
      parent.add(h);
      part(h, ring(0.095, 0.009, Math.PI), '#212121', 0, 0, 0, { outline: false });
      for (const sx of [-1, 1]) {
        part(h, cyl(0.045, 0.045, 0.03, 16), '#212121', sx * 0.095, -0.005, 0, { rz: Math.PI / 2 });
        part(h, cyl(0.04, 0.04, 0.012, 16), '#455a64', sx * 0.08, -0.005, 0, { rz: Math.PI / 2, outline: false });
      }
      rod(h, new THREE.Vector3(0.1, -0.03, 0.01), new THREE.Vector3(0.05, -0.1, 0.11), 0.004, '#212121');
      part(h, ball(0.012), '#424242', 0.045, -0.1, 0.115, { outline: false });
      return h;
    };
    const lying = headset(g);
    lying.position.set(-sx0 + 0.12, top + 0.02, dz + 0.02);
    lying.rotation.set(-Math.PI / 2 + 0.2, 0, 0.3);
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const hook = headset(idle);
    hook.position.set(-hw + 0.17, 1.35, -0.1);
    hook.rotation.set(0, Math.PI / 2, 0);
    part(g, cyl(0.008, 0.008, 0.08, 6), CHROME, -hw + 0.12, 1.43, -0.1, { rz: Math.PI / 2, outline: false });
    const worn = headset(use);
    // The hall's feed on a small monitor in the middle, water.
    const mon = group(g, 0, top, dz + 0.1);
    part(mon, rbox(0.1, 0.01, 0.08, 0.005), BLACK, 0, 0.005, 0);
    part(mon, rbox(0.02, 0.12, 0.02, 0.005), BLACK, 0, 0.065, -0.02);
    part(mon, rbox(0.32, 0.21, 0.025, 0.008), BLACK, 0, 0.2, 0);
    out.screen = litScreen(mon, painted('dpHallFeed', 256, 160, paintHallFeed), 0.3, 0.19, 0, 0.2, 0.014);
    water(g, -0.2, top, dz + 0.1);
    if (!inWall) glowing(use, box(0.28, 0.08, 0.01), '#ff3d3d', 0.6, H - 0.15, hd + 0.045);
    // The two chairs, facing the window.
    swivel(g, sx0, seatZ, 0, '#263238', 0.5);
    swivel(g, -sx0, seatZ - 0.08, -0.2, '#263238', 0.5);
    const notes = marker(g, sx0, top + 0.01, notesZ);
    out.work = notes;
    const seat = sitAt(g, sx0, 0.48, seatZ, 0, 'dpInterpret', notes);
    out.seat = seat.at;
    out.spots = { '*': seat };
    const head = new THREE.Vector3();
    out.animate = (t) => {
      const on = posed(seat, t);
      worn.visible = on;
      lit.visible = on && interpOn(t, phaseOf(seat));
      if (!on) return;
      const H = heightAt(seat);
      const c = boothHead(H);
      fromSpot(seat, c.x, c.y + 0.02 * (H / 1.6), c.z - 0.01, head);
      worn.position.copy(head);
      worn.scale.setScalar(H / 1.6);
      worn.rotation.set(0.05, seat.at.rotation.y, 0, 'YXZ');
    };
}
