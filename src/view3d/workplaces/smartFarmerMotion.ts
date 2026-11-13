import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, wave, type Beat, type V } from './busDriverMotion';

/*
 * The work at 층층잎팜, the 스마트팜 (2026-11-01, a new career at the user's request). Every motion is a script: a
 * round of beats, each with where the dweller is, where the hands are and where what moves is (a tray drawn out, a
 * head of lettuce in the hand, the jug, the probe). The piece reads the same script by the same clock
 * (smartFarmer.ts), so a tank's level rises only while the jug pours and the graph bends only once the set point
 * is moved.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). A dweller facing
 * the piece has yaw π: their left is -x, ahead is -z. Tools are built with their grip at the origin and their head
 * along +y; `hold` names the tool in the hand, the prop of that name says where it is and n.rx, n.ry, n.rz how it's
 * turned (handTool.ts brings the hand to it).
 */
export type VfMotion =
  | 'vfInspect' | 'vfHarvest'
  | 'vfPollinate' | 'vfPick'
  | 'vfClean' | 'vfTrial'
  | 'vfClimate' | 'vfLogic'
  | 'vfMix' | 'vfCal' | 'vfFix'
  | 'vfSeedMove'
  | 'vfSow' | 'vfLearn'
  | 'vfPack' | 'vfBrix'
  | 'vfStock'
  | 'vfPlan' | 'vfLead'
  | 'vfGown';
export const VF_MOTIONS = new Set<string>(['vfInspect', 'vfHarvest', 'vfPollinate', 'vfPick', 'vfClean', 'vfTrial', 'vfClimate', 'vfLogic', 'vfMix', 'vfCal', 'vfFix', 'vfSeedMove', 'vfSow', 'vfLearn', 'vfPack', 'vfBrix', 'vfStock', 'vfPlan', 'vfLead', 'vfGown']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const vfPhase = (p: THREE.Vector3) => frac(p.x * 0.283 + p.z * 0.611);
type Seq = Array<[string, number, number?]>;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const clampI = (x: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(x)));

// ---------------------------------------------------------------------------------------------
// The script engine.

export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
  floor?: number;
}
const st = (x: number, y: number, z: number, yaw: number = Math.PI, more: Partial<St> = {}): St => ({ x, y, z, yaw, ...more });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  crouch?: number;
  tap?: boolean;
  /** The tool in the hand this beat (its prop says where). */
  hold?: string;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  bd(side: number, up: number, ahead: number): V;
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface VfNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number): { st: St; key: Key } {
  const here = s.at(k);
  const idx = s.seq.findIndex(([q]) => q === k);
  const f = new THREE.Vector3(Math.sin(here.yaw), 0, Math.cos(here.yaw));
  const lf = new THREE.Vector3(Math.cos(here.yaw), 0, -Math.sin(here.yaw));
  const c: Ctx = {
    t,
    H,
    st: here,
    bd: (side, up, ahead) => [here.x + lf.x * side + f.x * ahead, here.y + up, here.z + lf.z * side + f.z * ahead],
    p: (name, a = 0, b = 1) => {
      const i = s.seq.findIndex(([q]) => q === name);
      return idx > i ? 1 : idx < i ? 0 : sm(u, a, b);
    },
  };
  return { st: here, key: s.key(k, u, c) };
}
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.1), nod: n(a.nod, b.nod, 0.2), palms: n(a.palms, b.palms, 0.5), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap, hold: e < 0.5 ? a.hold : b.hold };
}
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;

/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function vfNow(m: VfMotion, t: number, ph: number, H = 1.6): VfNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const here: St = e < 0.5 ? { ...A.st } : { ...B.st };
  here.x = mixN(A.st.x, B.st.x, e);
  here.y = mixN(A.st.y, B.st.y, e);
  here.z = mixN(A.st.z, B.st.z, e);
  here.yaw = angle(A.st.yaw, B.st.yaw, e);
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12 && !here.sit, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function vfPose(m: VfMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = vfNow(m, t, vfPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const k = N.key;
  const pose: BodyPose = s.sit
    ? { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y }
    : N.walking
      ? { kind: 'walk', at, yaw }
      : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.1, nod: k.nod ?? 0.2, palms: k.palms ?? 0.5, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch || undefined,
    },
  };
}

/** Across the body: `d` to their left, as an offset. */
const sv = (c: Ctx, d: number): [number, number, number] => {
  const a = c.bd(d, 0, 0);
  const b = c.bd(0, 0, 0);
  return [a[0] - b[0], 0, a[2] - b[2]];
};
const plus = (a: V, b: readonly [number, number, number]): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const idle = (c: Ctx, side: number): V => c.bd(side * 0.23, 0.55 * c.H, 0.08);
const chest = (c: Ctx, side = 0, ahead = 0.28, up = 0.62): V => c.bd(side, up * c.H, ahead);
/** A tablet's tilt towards the face (its +y is the screen's normal). */
const TAB = { rx: 0.75, ry: 0, rz: 0 };
const POINT = { rx: -2.1, ry: 0, rz: 0 };

// =============================================================================================
// 상추 수직 재배 선반 (vfLettuceRack, 3 × 1): four tiers of drawn-out trays under pink-white LED bars.

export const LR = {
  tiers: [0.32, 0.82, 1.32, 1.82],
  trayZ: -0.12,
  lip: 0.17,
  pull: 0.36,
  crate: [-0.74, 0.6, 0.62] as V,
  tablet: [0.0, 0.0, 0.0] as V,
  knife: [0.4, 0.62, 0.66] as V,
};
/** A head on the middle tray, in the piece, with the tray drawn out by `pull` (0–1). */
export const lrHead = (i: number, pull: number): V => [-0.27 + 0.27 * (i % 3), LR.tiers[1] + 0.12, LR.trayZ + (i > 2 ? 0.13 : -0.05) + LR.pull * pull];

const INSPECT: Script = {
  seq: [['low', 3.0, 0.8], ['tapA', 1.6, 0.8], ['mid', 3.0, 0.8], ['tapB', 1.6, 0.8], ['root', 3.4, 0.5], ['tapC', 1.8, 0.8]],
  at: (k) => (k === 'low' || k === 'tapA' ? st(-0.9, 0, 0.64) : k === 'mid' || k === 'tapB' ? st(0.05, 0, 0.64) : st(0.9, 0, 0.64)),
  key(k, u, c) {
    const low = k === 'low';
    const tablet = low ? c.bd(0.16, 0.4 * c.H, 0.3) : chest(c, 0.12);
    const base = { hold: 'tablet', props: { tablet }, n: { ...TAB, pot: 0, leaf: 0, screen: k === 'tapA' ? 1 : k === 'mid' || k === 'tapB' ? 1 + (k === 'tapB' ? 1 : 0) : k === 'root' ? 2 : k === 'tapC' ? 3 : 0 } };
    switch (k) {
      case 'low':
        // Down on the bottom tier, a leaf turned over to see its back.
        return { ...base, r: [-0.75 + 0.05 * Math.sin(u * 9), LR.tiers[0] + 0.18 + 0.05 * sm(u, 0.2, 0.5), 0.14], lean: 0.2, nod: 0.65, crouch: 0.55, gr: 0.5, palms: 0.4 };
      case 'mid': {
        // Up on the third tier, tip of a leaf between the fingers: tip-burn is what's looked for.
        return { ...base, r: [0.18 - 0.2 * sm(u, 0.1, 0.8), LR.tiers[2] + 0.13, 0.1], lean: 0.05, nod: -0.25, gr: 0.6, palms: 0.2 };
      }
      case 'root': {
        // A net pot lifted out of the second tier, the white roots looked at, and let down.
        const up = sm(u, 0.05, 0.3) * (1 - sm(u, 0.78, 0.98));
        const pot: V = [0.8, LR.tiers[1] + 0.08 + 0.24 * up, 0.08 + 0.1 * up];
        return { ...base, r: add(pot, 0, 0.03, 0.03), lean: 0.22, nod: 0.3, crouch: 0.15, gr: 0.75, palms: 0.3, props: { tablet, pot }, n: { ...base.n, pot: 1 } };
      }
      default:
        return { ...base, r: add(tablet, -0.02 + 0.05 * Math.sin(u * 12), 0.05, 0.02), lean: 0.08, nod: 0.45, gr: 0.15, palms: 0.5, tap: true };
    }
  },
};

const HARVEST: Script = {
  seq: [['pull', 1.8], ['take', 1.0], ['cut', 12.0], ['stow', 1.2], ['push', 1.8], ['count', 2.2]],
  at: () => st(-0.12, 0, 0.68),
  key(k, u, c) {
    const pull = k === 'pull' ? sm(u, 0.1, 0.9) : k === 'push' ? 1 - sm(u, 0.1, 0.9) : k === 'count' ? 0 : 1;
    const lipY = LR.tiers[1] + 0.05;
    const lip = LR.lip + LR.pull * pull;
    const n: Record<string, number> = { pull, cut: 0, crate: 0, ...POINT };
    const round = k === 'count' ? 6 : k === 'push' || k === 'stow' ? 6 : 0;
    n.cut = round;
    n.crate = round;
    switch (k) {
      case 'pull':
        return { l: [-0.3, lipY, lip], r: [0.3, lipY, lip], lean: 0.28, nod: 0.45, crouch: 0.25, gl: 0.8, gr: 0.8, palms: 0.9, n };
      case 'push':
        return { l: [-0.3, lipY, lip], r: [0.3, lipY, lip], lean: 0.3, nod: 0.45, crouch: 0.22, gl: 0.4, gr: 0.4, palms: 0.1, n };
      case 'take': {
        const p = lerpV(LR.knife, c.bd(-0.2, 0.6 * c.H, 0.2), sm(u, 0.2, 0.9));
        return { l: idle(c, 1), lean: 0.14, nod: 0.3, hold: 'knife', props: { knife: p }, n };
      }
      case 'cut': {
        // Six heads: left hand round each, the knife under it, and the head across to the crate.
        const j = clampI(u * 6, 6);
        const v = frac(u * 6);
        const h = lrHead(j, 1);
        const crate = add(LR.crate, -0.05 + (j % 3) * 0.1, 0.08, (j > 2 ? 0.06 : -0.06));
        const lifted = sm(v, 0.42, 0.75);
        const head = lerpV(add(h, 0, 0.02 + 0.1 * sm(v, 0.34, 0.45), 0), crate, lifted);
        const blade: V = add(h, 0.1 + 0.03 * wave(c.t, 3.5), -0.06, 0.05 + 0.12 * sm(v, 0.42, 0.8));
        n.cut = j + (v > 0.36 ? 1 : 0);
        n.crate = j + (v > 0.78 ? 1 : 0);
        n.rz = 0.15 * wave(c.t, 3.5);
        return { l: add(head, 0, 0.06, 0.02), lean: 0.34 - 0.1 * lifted, nod: 0.55, crouch: 0.3, gl: v < 0.8 ? 0.65 : 0.2, palms: 0.8, hold: 'knife', props: { knife: blade, head: v > 0.36 && v < 0.78 ? head : null }, n };
      }
      case 'stow': {
        const p = lerpV(c.bd(-0.2, 0.6 * c.H, 0.2), LR.knife, sm(u, 0.1, 0.8));
        return { l: idle(c, 1), lean: 0.14, nod: 0.3, hold: 'knife', props: { knife: p }, n };
      }
      default:
        // The tally on the crate's tag, a finger counting them off.
        return { r: idle(c, -1), l: add(LR.crate, 0.1 * Math.sin(u * 10), 0.17, 0.02), lean: 0.24, nod: 0.6, crouch: 0.2, gl: 0.15, palms: 0.1, n };
    }
  },
};

// =============================================================================================
// 딸기 수직 재배 선반 (vfBerryRack, 3 × 1): hanging gutters, fruit trailing over their edge.

export const BR = {
  tiers: [0.62, 1.12, 1.6],
  z: 0.03,
  /** Ripe fruit, where it hangs. */
  fruit: [[-1.05, 0.5], [-0.72, 0.5], [-0.38, 1.0], [-0.1, 1.0], [0.24, 1.0], [0.56, 0.5], [0.86, 1.0], [1.14, 0.5]] as Array<[number, number]>,
  /** Flowers, on the top two gutters. */
  flower: [[-1.0, 1.26], [-0.55, 1.74], [-0.12, 1.26], [0.34, 1.74], [0.82, 1.26]] as Array<[number, number]>,
  punnet: [0.0, 0.0, 0.0] as V,
};
const brFruit = (i: number): V => [BR.fruit[i][0], BR.fruit[i][1], BR.z + 0.14];
const brFlower = (i: number): V => [BR.flower[i][0], BR.flower[i][1], BR.z + 0.13];

const POLLINATE: Script = {
  seq: [['a', 2.6, 0.7], ['b', 2.6, 0.7], ['c', 2.6, 0.7], ['d', 2.6, 0.7], ['e', 2.6, 0.7], ['look', 1.8, 0.8]],
  at: (k) => {
    const i = 'abcde'.indexOf(k);
    return st(i >= 0 ? BR.flower[i][0] + 0.1 : 0, 0, 0.62);
  },
  key(k, u, c) {
    const i = 'abcde'.indexOf(k);
    if (i < 0) return { l: idle(c, 1), hold: 'brush', lean: 0.02, nod: -0.05, props: { brush: c.bd(-0.2, 0.62 * c.H, 0.18) }, n: { ...POINT, rx: -0.4, done: 5, dust: 0 } };
    const f = brFlower(i);
    const a = u * Math.PI * 8;
    // Round the flower's middle with the tip: the brush's tip is 0.12 up its length.
    const tip = add(f, 0.016 * Math.cos(a), 0.016 * Math.sin(a), 0.01);
    const tiltX = -1.9;
    const grip = add(tip, 0, 0.12 * Math.sin(-tiltX - Math.PI / 2), 0.12 * Math.cos(-tiltX - Math.PI / 2));
    const n: Record<string, number> = { rx: tiltX, ry: 0, rz: 0, done: i + (u > 0.8 ? 1 : 0), dust: u > 0.1 && u < 0.85 ? 1 : 0, at: i };
    const cup = add(f, -0.03, -0.09, 0.04);
    return { l: cup, gl: 0.45, palms: 0.9, lean: 0.14, nod: f[1] > 1.5 ? -0.2 : 0.2, crouch: f[1] < 1.3 ? 0.08 : 0, hold: 'brush', props: { brush: grip }, n };
  },
};

const PICK_SEQ: Seq = [['take', 1.0, 0.6], ...BR.fruit.map((_, i): [string, number, number] => [`f${i}`, 2.2, 0.7]), ['tilt', 2.2, 0.8]];
const PICK: Script = {
  seq: PICK_SEQ,
  at: (k) => {
    const i = k[0] === 'f' ? Number(k.slice(1)) : k === 'take' ? 0 : BR.fruit.length - 1;
    return st(BR.fruit[i][0] + 0.12, 0, 0.62);
  },
  key(k, u, c) {
    const n: Record<string, number> = { rx: -1.7, ry: 0, rz: 0, picked: 0, inPunnet: 0 };
    const punnet = c.bd(0.3, 0.5 * c.H, 0.16);
    const snip = c.bd(-0.22, 0.56 * c.H, 0.16);
    if (k === 'take') return { l: add(punnet, 0, 0.08, 0), lean: 0.12, nod: 0.3, gl: 0.5, hold: 'snips', props: { snips: snip, punnet }, n };
    if (k === 'tilt') {
      n.picked = n.inPunnet = BR.fruit.length;
      return { l: add(punnet, 0, 0.1, 0), r: add(punnet, -0.1, 0.1, -0.06), lean: 0.2, nod: 0.65, gl: 0.3, gr: 0.2, palms: 0.5, props: { punnet }, n };
    }
    const idx = Number(k.slice(1));
    const f = brFruit(idx);
    const v = u;
    const reach = sm(v, 0, 0.3);
    const off = sm(v, 0.5, 0.82);
    const snipAt = lerpV(snip, add(f, 0.03, 0.07, 0.11), reach * (1 - off));
    const held = lerpV(f, add(punnet, -0.02 + (idx % 4) * 0.02, 0.04, 0), off);
    n.rz = 0.2 * Math.sin(sm(v, 0.34, 0.46) * Math.PI);
    n.picked = idx + (v > 0.45 ? 1 : 0);
    n.inPunnet = idx + (v > 0.82 ? 1 : 0);
    return { l: lerpV(add(punnet, 0, 0.08, 0), add(held, -0.02, 0.0, 0.05), sm(v, 0.1, 0.32) * (1 - sm(v, 0.82, 0.98))), gl: 0.5, palms: 0.7, lean: 0.14, nod: f[1] < 0.8 ? 0.5 : 0.15, crouch: f[1] < 0.8 ? 0.32 : 0.04, hold: 'snips', props: { snips: snipAt, berry: v > 0.45 && v < 0.82 ? held : null, punnet }, n };
  },
};

// =============================================================================================
// 시험 재배 베드 (vfLowBed, 3 × 1): low troughs under a bar of adjustable light; nothing over 1.5 m.

export const LB = {
  top: 0.74,
  lid: { x: 0.0, y: 0.76, z: 0.02, w: 0.84 } as { x: number; y: number; z: number; w: number },
  plantY: 0.8,
  channelY: 0.69,
  dial: [1.28, 0.62, 0.36] as V,
  valve: [0.68, 0.7, 0.38] as V,
  clip: [-1.0, 0.77, 0.31] as V,
  pen: [-1.22, 0.78, 0.32] as V,
  brush: [0.62, 0.78, 0.33] as V,
  ruler: [-1.28, 0.78, 0.32] as V,
};

const CLEAN: Script = {
  seq: [['lift', 2.2], ['take', 1.0], ['scrub', 7.0], ['stow', 1.0], ['flush', 2.6, 0.7], ['set', 2.2]],
  at: () => st(0.2, 0, 0.72),
  key(k, u) {
    const lid = k === 'lift' ? sm(u, 0.2, 0.9) : k === 'set' ? 1 - sm(u, 0.1, 0.85) : 1;
    const liftP: V = [LB.lid.x, LB.lid.y + 0.22 * lid, LB.lid.z + 0.3 * lid];
    const hl: V = add(liftP, -0.3, 0.02, 0.1);
    const hr: V = add(liftP, 0.3, 0.02, 0.1);
    const n: Record<string, number> = { lid, rx: 0, ry: 0, rz: Math.PI / 2, water: k === 'flush' ? 1 : 0, dirt: k === 'scrub' ? 1 - u : k === 'lift' || k === 'take' ? 1 : 0 };
    switch (k) {
      case 'lift':
      case 'set':
        return { l: hl, r: hr, lean: 0.34, nod: 0.5, crouch: 0.2, gl: 0.75, gr: 0.75, palms: 0.9, n };
      case 'take': {
        return { l: hl, lean: 0.2, nod: 0.45, crouch: 0.1, gl: 0.75, hold: 'gutterBrush', props: { gutterBrush: lerpV(LB.brush, [0.42, LB.channelY + 0.14, 0.26], sm(u, 0.1, 0.9)) }, n };
      }
      case 'stow': {
        return { l: hl, lean: 0.2, nod: 0.45, crouch: 0.1, gl: 0.75, hold: 'gutterBrush', props: { gutterBrush: lerpV([0.42, LB.channelY + 0.14, 0.26], LB.brush, sm(u, 0.1, 0.9)) }, n };
      }
      case 'scrub': {
        const s = Math.sin(u * Math.PI * 14);
        return { l: hl, gl: 0.75, palms: 0.9, lean: 0.38, nod: 0.6, crouch: 0.28, hold: 'gutterBrush', props: { gutterBrush: [0.32 + 0.14 * s, LB.channelY + 0.12, 0.2 + 0.03 * Math.sin(u * 7)] }, n };
      }
      default:
        // The valve at the bed's end opened and the channel watched running clear.
        return { l: hl, r: add(LB.valve, 0, 0.02, 0.03), gl: 0.75, gr: 0.7, palms: 0.5, lean: 0.25, nod: 0.5, crouch: 0.12, n };
    }
  },
};

const TRIAL: Script = {
  seq: [['take', 1.0], ['measureA', 3.4, 0.7], ['measureB', 3.4, 0.7], ['measureC', 3.4, 1.6], ['stow', 1.0], ['note', 4.2], ['dial', 3.2, 0.8], ['watch', 2.2, 0.7]],
  at: (k) => (k === 'measureB' ? st(0, 0, 0.7) : k === 'measureC' ? st(0.8, 0, 0.7) : k === 'dial' || k === 'watch' ? st(1.0, 0, 0.7) : st(-1.0, 0, 0.7)),
  key(k, u, c) {
    const n: Record<string, number> = { rx: 0, ry: 0, rz: 0, light: c.p('dial', 0.25, 0.8), rows: c.p('note', 0.05, 0.9) * 4, heightRead: 0 };
    const plant = (x: number): V => [x, LB.plantY + 0.13, 0.13];
    switch (k) {
      case 'take':
        return { l: idle(c, 1), lean: 0.2, nod: 0.45, hold: 'ruler', props: { ruler: lerpV(LB.ruler, plant(-0.9), sm(u, 0.2, 0.9)) }, n };
      case 'stow':
        return { l: idle(c, 1), lean: 0.2, nod: 0.45, hold: 'ruler', props: { ruler: lerpV(c.bd(-0.2, 0.6 * c.H, 0.2), LB.ruler, sm(u, 0.1, 0.9)) }, n };
      case 'measureA':
      case 'measureB':
      case 'measureC': {
        const x = k === 'measureA' ? -0.9 : k === 'measureB' ? -0.1 : 0.7;
        const leaf: V = [x + 0.06, LB.plantY + 0.16 + 0.02 * Math.sin(u * 7), 0.13];
        n.heightRead = 1;
        return { l: leaf, gl: 0.6, palms: 0.4, lean: 0.35, nod: 0.62, crouch: 0.24, hold: 'ruler', props: { ruler: plant(x) }, n };
      }
      case 'note': {
        const lap = frac(u * 4);
        const row = clampI(u * 4, 4);
        const tip: V = [LB.clip[0] - 0.06 + 0.12 * lap, LB.clip[1] + 0.02, LB.clip[2] - 0.05 + row * 0.03];
        n.rx = -2.3;
        return { l: add(LB.clip, -0.12, 0.03, 0.02), gl: 0.4, palms: 1, lean: 0.32, nod: 0.6, crouch: 0.2, hold: 'pen', props: { pen: add(tip, 0.02, 0.09, 0.07) }, n };
      }
      case 'dial': {
        // The bar's dimmer turned: the mix goes redder, the plants pinker.
        return { l: idle(c, 1), r: add(LB.dial, 0, 0.02, 0.02), gr: 0.65, palms: 0.4, lean: 0.28, nod: 0.5, crouch: 0.18, n };
      }
      default:
        return { l: idle(c, 1), r: idle(c, -1), lean: 0.02, nod: 0.25 + 0.05 * wave(c.t, 0.4), n };
    }
  },
};

// =============================================================================================
// 환경 제어 콘솔 (vfEnvConsole, 2 × 1): the desk; low enough to be seen over.

export const EC = {
  seat: st(0, 0.47, 0.56, Math.PI, { sit: true, floor: 0 }),
  desk: 0.74,
  keys: [-0.08, 0.76, 0.14] as V,
  mouse: [0.36, 0.76, 0.14] as V,
  screen: { y: 1.1, z: -0.2, w: 1.5, h: 0.56 },
};
const typing = (seed: number, t: number): { l: V; r: V; gl: number; gr: number } => ({
  l: add(EC.keys, -0.09 + 0.03 * wave(t + seed, 2.3), 0.05 + 0.006 * wave(t, 7), 0),
  r: add(EC.keys, 0.09 + 0.03 * wave(t + seed, 2.9, 0.3), 0.05 + 0.006 * wave(t, 8, 0.4), 0),
  gl: 0.15,
  gr: 0.15,
});

const CLIMATE: Script = {
  seq: [['read', 3.2], ['layer', 2.2], ['drag', 3.6], ['apply', 1.2], ['watch', 5.2], ['log', 2.6]],
  at: () => EC.seat,
  key(k, u, c) {
    const set = k === 'read' || k === 'layer' ? 0 : k === 'drag' ? sm(u, 0.1, 0.9) : 1;
    const took = k === 'watch' ? sm(u, 0, 0.95) : k === 'log' ? 1 : 0;
    const n: Record<string, number> = { set, took, page: k === 'layer' ? 1 : 0, layer: k === 'read' ? 0 : 1 + clampI(u * 1.99, 2), cursor: k === 'drag' ? 0.5 + 0.2 * sm(u, 0.1, 0.9) : k === 'apply' ? 0.82 : 0.2, flash: k === 'apply' ? 1 : 0 };
    const mouse = add(EC.mouse, (n.cursor - 0.5) * 0.14, 0.04, 0.02 * Math.sin(u * 6));
    switch (k) {
      case 'read':
        return { l: add(EC.keys, -0.15, 0.05, 0.02), r: mouse, lean: 0.08, nod: -0.05 + 0.05 * wave(c.t, 0.3), gl: 0.2, gr: 0.5, palms: 1, n };
      case 'layer':
      case 'log':
        return { ...typing(0, c.t), lean: 0.14, nod: 0.05, palms: 1, tap: true, n };
      case 'watch':
        return { l: [-0.08, 0.81, 0.3], r: mouse, lean: -0.02, nod: -0.08, gl: 0.3, gr: 0.5, palms: 0.8, n };
      default:
        return { l: add(EC.keys, -0.15, 0.05, 0.02), r: mouse, lean: 0.12, nod: 0.02, gl: 0.2, gr: 0.55, palms: 1, n };
    }
  },
};
const LOGIC: Script = {
  seq: [['read', 2.8], ['type', 6.2], ['run', 1.2], ['dweller', 4.6], ['fix', 3.4], ['deploy', 1.6]],
  at: () => EC.seat,
  key(k, u, c) {
    const n: Record<string, number> = { code: 1, lines: k === 'read' ? 3 : k === 'type' ? 3 + Math.floor(u * 4) : k === 'fix' ? 7 + Math.floor(u * 2) : 7, dweller: k === 'dweller' ? u : k === 'run' ? 0 : k === 'fix' || k === 'deploy' ? 1 : 0, bad: k === 'dweller' || k === 'run' ? 1 : 0, ok: k === 'deploy' ? 1 : 0 };
    if (k === 'type' || k === 'fix') return { ...typing(1.2, c.t), lean: 0.16, nod: 0.05, palms: 1, tap: true, n };
    if (k === 'read') return { l: add(EC.keys, -0.15, 0.05, 0.02), r: add(EC.mouse, 0, 0.04, 0.02 * Math.sin(u * 4)), lean: 0.1, nod: 0, gl: 0.2, gr: 0.5, palms: 1, n };
    if (k === 'dweller') return { l: [-0.04, 1.02, 0.42], r: add(EC.mouse, 0, 0.04, 0), lean: 0, nod: -0.06, gl: 0.6, gr: 0.5, palms: 0.8, n };
    return { l: add(EC.keys, -0.15, 0.05, 0.02), r: add(EC.keys, 0.2, u > 0.3 && u < 0.5 ? 0.012 : 0.05, 0), lean: 0.12, nod: 0.05, gr: 0.2, palms: 1, n };
  },
};

// =============================================================================================
// 양액기 (vfDoser, 3 × 1): stock tanks A and B, the acid can, the mixing column, the control box.

export const DS = {
  tankA: { x: -1.08, top: 1.2, z: -0.1 },
  tankB: { x: -0.52, top: 1.2, z: -0.1 },
  column: { x: 0.12, y0: 0.15, y1: 1.5, z: -0.22 },
  box: { x: 0.92, y: 1.22, z: -0.1, w: 0.56, h: 0.42 },
  btn: [0.92, 0.98, 0.0] as V,
  valve: [0.28, 0.78, 0.06] as V,
  shelf: 0.62,
  jug: [0.14, 0.24, 0.3] as V,
  meter: [0.72, 1.0, 0.14] as V,
  cups: [[0.62, 0.84, 0.28], [0.8, 0.84, 0.28]] as V[],
};

const MIX: Script = {
  seq: [['read', 2.2, 0.8], ['take', 1.2], ['pourA', 4.0, 0.9], ['pourB', 4.0, 0.9], ['put', 1.2, 0.8], ['dose', 2.0], ['watch', 4.8]],
  at: (k) => (k === 'pourA' ? st(-0.78, 0, 0.5) : k === 'pourB' ? st(-0.22, 0, 0.5) : k === 'read' || k === 'dose' || k === 'watch' ? st(0.78, 0, 0.56) : st(0.1, 0, 0.72)),
  key(k, u, c) {
    const pourAmt = (name: string) => (k === name ? sm(u, 0.2, 0.9) : c.p(name));
    const n: Record<string, number> = { a: pourAmt('pourA'), b: pourAmt('pourB'), ec: 0, flow: 0, stream: 0, rx: 0, ry: 0, rz: 0, pumping: 0 };
    n.ec = k === 'watch' ? sm(u, 0, 0.9) : 0;
    n.pumping = k === 'watch' ? 1 : 0;
    n.column = n.ec;
    switch (k) {
      case 'read':
        return { l: idle(c, 1), r: add(DS.btn, -0.08 + 0.14 * u, 0.2, 0.08), lean: 0.1, nod: -0.1, gr: 0.2, palms: 0.2, n };
      case 'take': {
        const p = lerpV(DS.jug, add(c.bd(-0.18, 0.56 * c.H, 0.2), 0, 0, 0), sm(u, 0.2, 0.9));
        return { l: idle(c, 1), lean: 0.3 * (1 - u), nod: 0.5, crouch: 0.5 * (1 - sm(u, 0.2, 0.9)), hold: 'jug', props: { jug: p }, n };
      }
      case 'pourA':
      case 'pourB': {
        const x = k === 'pourA' ? DS.tankA.x : DS.tankB.x;
        const tip = sm(u, 0.1, 0.25) * (1 - sm(u, 0.85, 0.98));
        // The handle stood off to the tank's right, the body and its spout over the tank's mouth.
        const p: V = [x + 0.26, DS.tankA.top + 0.1 + 0.05 * (1 - tip), DS.tankA.z + 0.12];
        n.rz = tip * 1.15;
        n.stream = tip > 0.6 ? 1 : 0;
        n.streamX = x;
        return { l: add([x, DS.tankA.top + 0.04, DS.tankA.z + 0.16], 0, 0, 0), gl: 0.5, palms: 0.5, lean: 0.12, nod: 0.05, hold: 'jug', props: { jug: p }, n };
      }
      case 'put': {
        const p = lerpV(add(c.bd(-0.18, 0.56 * c.H, 0.2), 0, 0, 0), DS.jug, sm(u, 0.2, 0.9));
        return { l: idle(c, 1), lean: 0.3 * u, nod: 0.5, crouch: 0.5 * sm(u, 0.2, 0.9), hold: 'jug', props: { jug: p }, n };
      }
      case 'dose': {
        return { l: idle(c, 1), r: add(DS.btn, 0, u > 0.35 && u < 0.55 ? 0.0 : 0.04, 0.05), gr: 0.2, palms: 0.05, lean: 0.14, nod: 0.05, tap: u > 0.35 && u < 0.55, n };
      }
      default:
        return { l: idle(c, 1), r: chest(c, -0.04, 0.2, 0.74), lean: 0.02, nod: -0.1, gr: 0.5, palms: 0.5, n };
    }
  },
};

const CAL: Script = {
  seq: [['take', 1.2], ['cupA', 3.2], ['okA', 1.4], ['rinse', 1.8], ['cupB', 3.2], ['okB', 1.4], ['line', 3.0], ['stow', 1.2]],
  at: () => st(0.75, 0, 0.54),
  key(k, u, c) {
    const n: Record<string, number> = { rx: -3.0, ry: 0, rz: 0, cal: k === 'take' || k === 'cupA' ? 0 : k === 'okA' ? (u > 0.4 ? 1 : 0) : k === 'rinse' || k === 'cupB' ? 1 : k === 'okB' ? (u > 0.4 ? 2 : 1) : 2, read: k === 'cupA' ? 7.0 - 0.34 * (1 - sm(u, 0.1, 0.9)) : k === 'cupB' ? 4.01 + 0.5 * (1 - sm(u, 0.1, 0.9)) : k === 'okA' ? 7 : k === 'okB' ? 4.01 : 5.9, dip: 0 };
    const hover = c.bd(-0.14, 0.62 * c.H, 0.24);
    const inCup = (i: number): V => add(DS.cups[i], 0, 0.06, 0);
    const press = (u2: number): V => add(DS.btn, 0, u2 > 0.35 && u2 < 0.6 ? 0 : 0.04, 0.05);
    switch (k) {
      case 'take':
        return { l: idle(c, 1), hold: 'meter', props: { meter: lerpV(DS.meter, hover, sm(u, 0.2, 0.9)) }, lean: 0.16, nod: 0.4, n };
      case 'cupA':
      case 'cupB': {
        const i = k === 'cupA' ? 0 : 1;
        const a = u * 12;
        n.dip = 1;
        return { l: add(DS.cups[i], 0, 0.08, 0.05), gl: 0.6, palms: 0.5, lean: 0.34, nod: 0.5, crouch: 0.24, hold: 'meter', props: { meter: add(inCup(i), 0.012 * Math.cos(a), 0.16, 0.012 * Math.sin(a)) }, n };
      }
      case 'okA':
      case 'okB':
        return { l: press(u), gl: 0.15, hold: 'meter', props: { meter: hover }, lean: 0.14, nod: 0.05, palms: 0.05, tap: u > 0.35 && u < 0.6, n };
      case 'rinse':
        return { l: add(hover, 0.06, 0.02 + 0.03 * Math.sin(u * 20), 0.02), gl: 0.7, palms: 0.5, hold: 'meter', props: { meter: add(hover, 0, 0.02 * Math.sin(u * 20), 0) }, lean: 0.1, nod: 0.45, n };
      case 'line': {
        // Into the sample line, and the live reading matched against it.
        return { l: idle(c, 1), hold: 'meter', props: { meter: add(DS.valve, 0.12, 0.22, 0.06) }, lean: 0.2, nod: 0.2, crouch: 0.1, n };
      }
      default:
        return { l: idle(c, 1), hold: 'meter', props: { meter: lerpV(hover, DS.meter, sm(u, 0.1, 0.9)) }, lean: 0.16, nod: 0.4, n };
    }
  },
};

const FIX: Script = {
  seq: [['alarm', 2.0, 0.6], ['read', 2.4, 0.8], ['stop', 1.6, 0.8], ['bypass', 3.8, 0.8], ['tube', 3.8, 0.8], ['reset', 1.6], ['settle', 4.0]],
  at: (k) => (k === 'alarm' ? st(0.5, 0, 0.84) : k === 'bypass' || k === 'tube' ? st(0.34, 0, 0.6) : st(0.86, 0, 0.56)),
  key(k, u, c) {
    const down = k === 'settle' ? sm(u, 0, 0.9) : 0;
    const n: Record<string, number> = { alarm: k === 'settle' ? 1 - sm(u, 0, 0.5) : 1, ec: 0, bad: 1 - down, valve: k === 'bypass' ? sm(u, 0.1, 0.9) : c.p('bypass'), tube: k === 'tube' ? (u > 0.5 ? 1 : 0) : c.p('tube') > 0 ? 1 : 0, pumping: k === 'stop' ? 0 : k === 'settle' ? 1 : 0, red: k === 'settle' ? 1 - down : 1 };
    const wh = n.valve * Math.PI * 3;
    const rimL: V = add(DS.valve, -0.1 * Math.cos(wh), 0.1 * Math.sin(wh) + 0.02, 0.06);
    const rimR: V = add(DS.valve, 0.1 * Math.cos(wh), -0.1 * Math.sin(wh) + 0.02, 0.06);
    switch (k) {
      case 'alarm':
        return { l: idle(c, 1), r: idle(c, -1), lean: 0.16, nod: -0.2, palms: 0.4, n };
      case 'read':
        return { l: idle(c, 1), r: add([DS.box.x, DS.box.y - 0.08, DS.box.z], -0.15 + 0.3 * u, 0, 0.13), gr: 0.15, lean: 0.14, nod: -0.1, palms: 0.1, n };
      case 'stop':
        return { l: idle(c, 1), r: add(DS.btn, 0.1, u > 0.3 && u < 0.55 ? 0 : 0.05, 0.05), gr: 0.1, palms: 0.05, lean: 0.14, nod: 0.05, tap: true, n };
      case 'bypass':
        return { l: rimL, r: rimR, gl: 0.85, gr: 0.85, palms: 0.5, lean: 0.25, nod: 0.3, crouch: 0.22, n };
      case 'tube': {
        // The pump's kinked line pulled off its barb and pushed back straight.
        const y = 0.3 + 0.03 * Math.sin(u * 14);
        return { l: [0.5, 0.78 + y * 0.08, 0.14], r: [0.62, 0.82 + y * 0.05 + (u > 0.5 ? 0 : 0.05), 0.14], gl: 0.75, gr: 0.75, palms: 0.5, lean: 0.3, nod: 0.45, crouch: 0.2, n };
      }
      case 'reset':
        return { l: idle(c, 1), r: add(DS.btn, 0, u > 0.35 && u < 0.6 ? 0 : 0.05, 0.05), gr: 0.1, palms: 0.05, lean: 0.14, nod: 0.05, n };
      default:
        return { l: c.bd(0.15, 0.82 * c.H, 0.1), r: idle(c, -1), gl: 0.3, lean: -0.02, nod: -0.1, palms: 0.3, n };
    }
  },
};

// =============================================================================================
// 육묘 챔버 (vfSeedChamber, 2 × 1): a lit cabinet behind glass doors; the trolley stands out in the aisle.

export const SC = {
  shelves: [0.5, 0.96, 1.42],
  front: 0.1,
  z: -0.14,
  doorH: 1.75,
  /** The door: hung on its right, its free end and handle at the left; how far it opens. */
  hinge: 0.95,
  r: 0.9,
  swing: 1.35,
  trolley: [-0.62, 0.56, 0.72] as V,
  /** The tray on the middle shelf that's taken. */
  tray: [0.5, 0.98, -0.14] as V,
};
const MOVE: Script = {
  seq: [['door', 1.6, 0.7], ['read', 1.8, 0.7], ['slide', 2.0, 0.3], ['carry', 1.4, 0.9], ['set', 1.6, 0.9], ['close', 1.8, 0.7], ['check', 3.2]],
  at: (k) => (k === 'read' ? st(-0.4, 0, 0.72) : k === 'carry' || k === 'set' ? st(-0.14, 0, 0.72, Math.PI + 1.0) : k === 'check' ? st(-0.14, 0, 0.72, -2.2) : st(0.22, 0, 0.72)),
  key(k, u, c) {
    const door = k === 'door' ? sm(u, 0.2, 0.9) : k === 'close' ? 1 - sm(u, 0.2, 0.9) : k === 'check' ? 0 : 1;
    const n: Record<string, number> = { door, out: k === 'set' ? (u > 0.7 ? 1 : 0) : k === 'close' || k === 'check' ? 1 : 0, gone: k === 'slide' || k === 'carry' || k === 'set' || k === 'close' || k === 'check' ? 1 : 0 };
    const th = door * SC.swing;
    const handle: V = [SC.hinge - SC.r * Math.cos(th), 1.0, SC.front + 0.06 + SC.r * Math.sin(th)];
    const trayAt = (e: number): V => lerpV(SC.tray, add(SC.tray, 0, 0.03, 0.56), e);
    switch (k) {
      case 'door':
      case 'close':
        return { l: idle(c, 1), r: handle, gr: 0.85, palms: 0.3, lean: 0.14, nod: 0.05, n };
      case 'read':
        return { l: idle(c, 1), r: [-0.5, 1.5, SC.front + 0.05], gr: 0.15, palms: 0.05, lean: 0.14, nod: -0.25, n };
      case 'slide': {
        const p = trayAt(sm(u, 0.15, 0.95));
        return { l: add(p, -0.2, 0.03, 0.15), r: add(p, 0.2, 0.03, 0.15), gl: 0.5, gr: 0.5, palms: 1.1, lean: 0.28, nod: 0.35, props: { tray: p }, n };
      }
      case 'carry': {
        const p = c.bd(0, 0.62 * c.H, 0.26);
        return { l: plus(p, sv(c, 0.17)), r: plus(p, sv(c, -0.17)), gl: 0.5, gr: 0.5, palms: 1.1, lean: 0.04, nod: 0.45, props: { tray: p }, n };
      }
      case 'set': {
        const p = lerpV(c.bd(0, 0.62 * c.H, 0.26), SC.trolley, sm(u, 0.1, 0.8));
        return { l: plus(p, sv(c, 0.17)), r: plus(p, sv(c, -0.17)), gl: 0.5, gr: 0.5, palms: 1.1, lean: 0.34 * sm(u, 0.1, 0.8), nod: 0.5, crouch: 0.3 * sm(u, 0.1, 0.8), props: { tray: u < 0.7 ? p : null }, n };
      }
      default:
        // Each row of seedlings counted off with a finger.
        return { l: idle(c, 1), r: add(SC.trolley, -0.14 + 0.28 * frac(u * 3), 0.1, -0.05 + 0.1 * clampI(u * 3, 3) * 0.5), gr: 0.15, palms: 0.1, lean: 0.34, nod: 0.6, crouch: 0.28, n };
    }
  },
};

// =============================================================================================
// 파종대 (vfSowBench, 2 × 1): a sponge sheet of cells, seeds in a dish, tweezers; net pots for transplanting.

export const SB = {
  top: 0.82,
  sheet: { x: -0.12, z: 0.0, nx: 8, nz: 5, dx: 0.075, dz: 0.075 },
  dish: [0.5, 0.84, 0.12] as V,
  tweezers: [0.42, 0.85, 0.3] as V,
  sprayer: [0.76, 1.0, 0.04] as V,
  pots: { x: -0.52, z: 0.14, n: 6 },
  sprout: { x: 0.5, z: -0.1 },
};
export const sbCell = (i: number): V => {
  const cx = i % SB.sheet.nx;
  const cz = clampI(i / SB.sheet.nx, SB.sheet.nz);
  return [SB.sheet.x + (cx - (SB.sheet.nx - 1) / 2) * SB.sheet.dx, SB.top + 0.04, SB.sheet.z + (cz - (SB.sheet.nz - 1) / 2) * SB.sheet.dz];
};

const SOW: Script = {
  seq: [['wet', 2.8], ['take', 1.0], ['seed', 11.0], ['put', 1.0], ['spray', 3.2], ['stack', 2.0]],
  at: () => st(-0.02, 0, 0.56),
  key(k, u, c) {
    const n: Record<string, number> = { sown: k === 'seed' ? u * 16 : k === 'put' || k === 'spray' || k === 'stack' ? 16 : 0, wet: k === 'wet' ? sm(u, 0.1, 0.8) : 1, rx: -2.5, ry: 0, rz: 0, mist: 0, cover: k === 'stack' ? sm(u, 0.2, 0.9) : 0 };
    switch (k) {
      case 'wet':
        n.rx = 0;
        return { l: add(sbCell(12), -0.12, 0.06, 0.02), r: add(sbCell(20), 0.12, 0.05, 0.02 + 0.03 * Math.sin(u * 15)), gl: 0.2, gr: 0.2, palms: 1, lean: 0.34, nod: 0.6, crouch: 0.14, n };
      case 'take':
        return { l: idle(c, 1), hold: 'tweezers', props: { tweezers: lerpV(SB.tweezers, add(SB.dish, 0, 0.14, 0.04), sm(u, 0.2, 0.9)) }, lean: 0.25, nod: 0.5, n };
      case 'seed': {
        const j = clampI(u * 16, 16);
        const v = frac(u * 16);
        const from = add(SB.dish, 0.01 * (j % 3), 0.0, 0.0);
        const to = sbCell(j * 2 + (j % 8 === 0 ? 0 : 0));
        const e = sm(v, 0.2, 0.75);
        const tip = lerpV(from, to, e);
        const lift = 0.05 * Math.sin(Math.PI * e);
        const point: V = add(tip, 0, 0.12 + lift, 0.06);
        return { l: add(SB.dish, -0.12, 0.05, 0.05), gl: 0.5, palms: 0.8, lean: 0.34, nod: 0.65, crouch: 0.16, hold: 'tweezers', props: { tweezers: point, seed: v > 0.2 && v < 0.75 ? add(tip, 0, lift, 0) : null }, n };
      }
      case 'put':
        return { l: idle(c, 1), hold: 'tweezers', props: { tweezers: lerpV(add(SB.dish, 0, 0.14, 0.04), SB.tweezers, sm(u, 0.1, 0.9)) }, lean: 0.25, nod: 0.5, n };
      case 'spray': {
        n.rx = -0.95;
        n.mist = frac(u * 4) < 0.5 ? 1 : 0;
        const p: V = [SB.sheet.x + 0.28 - 0.5 * frac(u * 2), SB.top + 0.26, SB.sheet.z + 0.22];
        return { l: idle(c, 1), hold: 'sprayer', props: { sprayer: p }, lean: 0.22, nod: 0.5, crouch: 0.05, n };
      }
      default:
        return { l: [SB.sheet.x - 0.35, SB.top + 0.06, SB.sheet.z + 0.12], r: [SB.sheet.x + 0.35, SB.top + 0.06, SB.sheet.z + 0.12], gl: 0.5, gr: 0.5, palms: 1, lean: 0.3, nod: 0.55, crouch: 0.1, n };
    }
  },
};

const LEARN: Script = {
  seq: [['watch', 4.0], ['take', 1.0], ['move', 11.0], ['put', 1.0], ['nod', 2.4]],
  at: () => st(-0.05, 0, 0.56),
  key(k, u, c) {
    const pot = (i: number): V => [SB.pots.x + (i % 3) * 0.13, SB.top + 0.04, SB.pots.z - (i > 2 ? 0.14 : 0)];
    const n: Record<string, number> = { rx: -2.5, ry: 0, rz: 0, mentor: k === 'watch' ? 1 : k === 'nod' ? 2 : 0, moved: k === 'move' ? clampI(u * 6, 6) + (frac(u * 6) > 0.72 ? 1 : 0) : k === 'put' || k === 'nod' ? 6 : 0, gone: 0 };
    n.gone = k === 'move' ? clampI(u * 6, 6) + (frac(u * 6) > 0.18 ? 1 : 0) : n.moved;
    switch (k) {
      case 'watch':
        return { l: c.bd(0.12, 0.6 * c.H, 0.14), r: c.bd(-0.12, 0.6 * c.H, 0.14), gl: 0.4, gr: 0.4, lean: 0.1, nod: 0.3 + 0.08 * wave(c.t, 0.5), palms: 0.8, n };
      case 'take':
        return { l: idle(c, 1), hold: 'tweezers', props: { tweezers: lerpV(SB.tweezers, [0.2, SB.top + 0.2, 0.14], sm(u, 0.2, 0.9)) }, lean: 0.2, nod: 0.45, n };
      case 'move': {
        // Each sprout by the stem out of its sponge, into a net pot, its roots through the holes.
        const j = clampI(u * 6, 6);
        const v = frac(u * 6);
        const from: V = [SB.sprout.x - (j % 3) * 0.09, SB.top + 0.08, SB.sprout.z + (j > 2 ? 0.1 : 0)];
        const to = add(pot(j), 0, 0.05, 0);
        const e = sm(v, 0.2, 0.72);
        const tip = lerpV(from, to, e);
        const lift = 0.1 * Math.sin(Math.PI * e);
        const held = add(tip, 0, lift, 0);
        return { l: add(to, 0.02, 0.0, 0.08), gl: 0.5, palms: 0.8, lean: 0.34, nod: 0.65, crouch: 0.18, hold: 'tweezers', props: { tweezers: add(held, 0, 0.11, 0.06), sprout: v > 0.18 && v < 0.72 ? held : null }, n };
      }
      case 'put':
        return { l: idle(c, 1), hold: 'tweezers', props: { tweezers: lerpV([-0.4, SB.top + 0.2, 0.14], SB.tweezers, sm(u, 0.1, 0.9)) }, lean: 0.2, nod: 0.45, n };
      default:
        return { l: idle(c, 1), r: idle(c, -1), lean: 0.05, nod: 0.1 + 0.12 * wave(c.t, 1), palms: 0.5, n };
    }
  },
};

// =============================================================================================
// 수확·포장대 (vfPackTable, 3 × 1): steel, a bin of leaves, a scale, bags, a heat sealer, a label printer.

export const PT = {
  top: 0.86,
  bin: [-1.05, 0.98, -0.02] as V,
  scale: [-0.3, 0.9, 0.08] as V,
  bags: [-0.65, 0.9, 0.3] as V,
  sealer: [0.35, 0.96, 0.1] as V,
  printer: [0.78, 0.98, -0.08] as V,
  box: [1.14, 0.98, 0.08] as V,
  tray: [-0.82, 0.92, -0.24] as V,
  refract: [-0.04, 0.9, 0.32] as V,
  bowl: [-0.54, 0.92, 0.14] as V,
  board: [-0.24, 0.88, 0.26] as V,
};
const PACK: Script = {
  seq: [['bag', 2.0, 0.7], ['fill', 6.5, 0.7], ['slide', 2.0, 0.6], ['seal', 2.6, 0.7], ['label', 2.4, 0.7], ['box', 2.2]],
  at: (k) => (k === 'bag' || k === 'fill' ? st(-0.58, 0, 0.62) : k === 'slide' || k === 'seal' ? st(0.18, 0, 0.62) : st(0.92, 0, 0.62)),
  key(k, u) {
    const grams = k === 'fill' ? sm(u, 0, 0.92) * 100 : k === 'bag' ? 0 : 100;
    const n: Record<string, number> = { g: grams, seal: k === 'seal' ? (u > 0.35 && u < 0.7 ? 1 : 0) : 0, sealed: k === 'label' || k === 'box' ? 1 : k === 'seal' && u > 0.7 ? 1 : 0, label: k === 'box' ? 1 : k === 'label' && u > 0.65 ? 1 : 0, boxed: k === 'box' && u > 0.65 ? 1 : 0, press: k === 'seal' ? sm(u, 0.25, 0.35) * (1 - sm(u, 0.65, 0.75)) : 0, onScale: k === 'fill' ? 1 : 0 };
    const bagOnScale = add(PT.scale, 0, 0.1, 0);
    switch (k) {
      case 'bag': {
        const p = lerpV(PT.bags, bagOnScale, sm(u, 0.15, 0.9));
        return { l: add(p, -0.08, 0.06, 0.02), r: add(p, 0.08, 0.06, 0.02), gl: 0.75, gr: 0.75, palms: 0.4, lean: 0.25, nod: 0.5, props: { bag: p }, n };
      }
      case 'fill': {
        // A handful from the bin into the bag, until the reading is on 100 g.
        const lap = frac(u * 4);
        const a = sm(lap, 0.05, 0.42);
        const b = sm(lap, 0.5, 0.82);
        const hand = lerpV(lerpV(add(bagOnScale, 0.0, 0.12, 0), add(PT.bin, 0.05, 0.08, 0), a), add(bagOnScale, 0, 0.14, 0), b);
        return { l: hand, gl: lap > 0.42 && lap < 0.84 ? 0.7 : 0.3, r: add(bagOnScale, 0.1, 0.04, 0.04), gr: 0.75, palms: 0.8, lean: 0.3, nod: 0.55, props: { bag: bagOnScale, handful: lap > 0.42 && lap < 0.82 ? add(hand, 0, -0.04, 0) : null }, n };
      }
      case 'slide': {
        const p = lerpV(bagOnScale, add(PT.sealer, 0, -0.03, 0.18), sm(u, 0.1, 0.9));
        return { l: add(p, -0.1, 0.03, 0.04), r: add(p, 0.1, 0.03, 0.04), gl: 0.7, gr: 0.7, palms: 0.8, lean: 0.25, nod: 0.5, props: { bag: p }, n };
      }
      case 'seal': {
        const p = add(PT.sealer, 0, -0.03, 0.18);
        return { l: add(p, -0.1, 0.04, 0.03), r: add(PT.sealer, 0.05, 0.1 - 0.05 * n.press, 0.03), gl: 0.7, gr: 0.8, palms: 0.4, lean: 0.25, nod: 0.5, props: { bag: p }, n };
      }
      case 'label': {
        const bag: V = [0.72, PT.top + 0.06, 0.26];
        const sticker = lerpV(add(PT.printer, 0.0, -0.02, 0.15), add(bag, 0, 0.06, 0), sm(u, 0.2, 0.65));
        return { l: add(bag, -0.1, 0.03, 0.03), r: add(sticker, 0, 0.02, 0.02), gl: 0.6, gr: 0.35, palms: 0.7, lean: 0.25, nod: 0.5, props: { bag, sticker: u < 0.65 ? sticker : null }, n };
      }
      default: {
        const p = lerpV([0.72, PT.top + 0.06, 0.26], add(PT.box, 0, 0.1, 0), sm(u, 0.15, 0.7));
        return { l: add(p, -0.1, 0.03, 0.03), r: add(p, 0.1, 0.03, 0.03), gl: 0.7, gr: 0.7, palms: 0.5, lean: 0.25, nod: 0.5, props: { bag: u < 0.7 ? p : null }, n };
      }
    }
  },
};
const BRIX: Script = {
  seq: [['cut', 2.6, 0.6], ['take', 1.0], ['drop', 2.6], ['look', 3.2], ['stow', 1.0, 0.7], ['note', 2.4]],
  at: () => st(-0.32, 0, 0.62),
  key(k, u, c) {
    const n: Record<string, number> = { rx: -1.55, ry: 0, rz: 0, reading: k === 'look' ? 8 + sm(u, 0.1, 0.8) * 3.6 : k === 'stow' || k === 'note' ? 11.6 : 0, rows: k === 'note' ? u * 3 : 0, squeeze: k === 'drop' ? sm(u, 0.2, 0.6) : 0 };
    const berry = add(PT.bowl, 0, 0.02, 0);
    const eye = c.bd(-0.02, 0.88 * c.H, 0.16);
    switch (k) {
      case 'cut':
        // A ripe berry out of the bowl, turned over to see its colour.
        return { l: add(berry, 0, 0.1 + 0.2 * sm(u, 0.1, 0.5), 0.05), r: idle(c, -1), gl: 0.55, lean: 0.2, nod: 0.5, palms: 0.6, props: { berryUp: add(berry, 0, 0.08 + 0.2 * sm(u, 0.1, 0.5), 0.05) }, n };
      case 'take':
        return { l: add(berry, 0, 0.3, 0.05), gl: 0.55, palms: 0.6, lean: 0.2, nod: 0.45, hold: 'refract', props: { refract: lerpV(PT.refract, c.bd(-0.12, 0.6 * c.H, 0.26), sm(u, 0.2, 0.9)), berryUp: add(berry, 0, 0.28, 0.05) }, n };
      case 'drop': {
        // Open on the prism under the berry, a squeeze, the flap shut.
        const prism = c.bd(-0.12, 0.6 * c.H, 0.26);
        return { l: add(prism, 0.0, 0.12 - 0.02 * n.squeeze, -0.03), gl: 0.55 + 0.35 * n.squeeze, palms: 0.8, lean: 0.14, nod: 0.5, hold: 'refract', props: { refract: prism, berryUp: add(prism, 0, 0.09, -0.03), drop: u > 0.45 && u < 0.7 ? add(prism, 0, 0.04 + 0.05 * (1 - frac(u * 6)), -0.03) : null }, n };
      }
      case 'look':
        return { l: idle(c, 1), hold: 'refract', props: { refract: add(eye, 0, -0.02, 0) }, lean: 0, nod: -0.1 + 0.02 * wave(c.t, 0.6), palms: 0.5, n: { ...n, rx: -1.55 } };
      case 'stow':
        return { l: idle(c, 1), hold: 'refract', props: { refract: lerpV(c.bd(-0.12, 0.6 * c.H, 0.26), PT.refract, sm(u, 0.1, 0.9)) }, lean: 0.14, nod: 0.45, n };
      default: {
        const row = clampI(u * 3, 3);
        return { l: idle(c, 1), r: add(PT.board, -0.04 + 0.1 * frac(u * 3), 0.03, -0.03 + row * 0.02), gr: 0.6, palms: 0.4, lean: 0.2, nod: 0.6, crouch: 0.05, n };
      }
    }
  },
};

// =============================================================================================
// 저온 저장고 (vfColdStore, 2 × 1): an insulated door with a lever and a readout; a box on a cart outside.

export const CS = {
  cart: [-0.72, 0.56, 0.68] as V,
  door: { x: 0.42, w: 0.92, h: 1.9, z: 0.16, hinge: 0.88, r: 0.86, swing: 1.35 },
  shelf: [0.42, 1.0, -0.2] as V,
  temp: [-0.36, 1.48, 0.17] as V,
  leverY: 1.05,
  log: [-0.36, 1.22, 0.17] as V,
};
const csLever = (door: number): V => {
  const th = door * CS.door.swing;
  return [CS.door.hinge - CS.door.r * Math.cos(th), CS.leverY, CS.door.z + 0.08 + CS.door.r * Math.sin(th)];
};
const STOCK: Script = {
  seq: [['lift', 1.6, 0.8], ['open', 1.8, 0.4], ['in', 1.8, 0.4], ['shut', 1.8, 0.8], ['log', 3.2]],
  at: (k) => (k === 'lift' ? st(-0.3, 0, 0.72, Math.PI + 0.9) : k === 'in' ? st(0.42, 0, 0.42) : k === 'log' ? st(-0.36, 0, 0.62) : st(0.1, 0, 0.74)),
  key(k, u, c) {
    const door = k === 'open' ? sm(u, 0.1, 0.8) : k === 'shut' ? 1 - sm(u, 0.2, 0.9) : k === 'in' ? 1 : 0;
    const n: Record<string, number> = { door, stacked: k === 'shut' || k === 'log' ? 1 : k === 'in' && u > 0.75 ? 1 : 0, cold: door, read: k === 'log' ? 1 : 0, rows: k === 'log' ? u * 3 : 0 };
    const hug = c.bd(0, 0.62 * c.H, 0.28);
    switch (k) {
      case 'lift': {
        const p = lerpV(CS.cart, hug, sm(u, 0.2, 0.95));
        return { l: plus(p, sv(c, 0.18)), r: plus(p, sv(c, -0.18)), gl: 0.6, gr: 0.6, palms: 0.9, lean: 0.3 * (1 - u), nod: 0.4, crouch: 0.35 * (1 - sm(u, 0.2, 0.9)), props: { box: p }, n };
      }
      case 'open': {
        // The box on the left arm, the right on the lever.
        const lever = csLever(door);
        const p = c.bd(0.12, 0.62 * c.H, 0.25);
        return { l: add(p, 0.14, -0.02, 0), r: lever, gl: 0.6, gr: 0.85, palms: 0.5, lean: 0.14, nod: 0.05, props: { box: p }, n };
      }
      case 'in': {
        const p = lerpV(hug, CS.shelf, sm(u, 0.1, 0.72));
        return { l: add(p, 0.18, 0, 0.05), r: add(p, -0.18, 0, 0.05), gl: 0.6, gr: 0.6, palms: 0.9, lean: 0.2, nod: 0.2, props: { box: u < 0.75 ? p : null }, n };
      }
      case 'shut': {
        const lever = csLever(door);
        return { l: idle(c, 1), r: lever, gr: 0.85, palms: 0.5, lean: 0.12, nod: 0.05, n };
      }
      default: {
        const row = clampI(u * 3, 3);
        return { l: idle(c, 1), r: add(CS.log, -0.06 + 0.12 * frac(u * 3), 0.05 - row * 0.03, 0.02), gr: 0.6, palms: 0.1, lean: 0.1, nod: -0.05, n };
      }
    }
  },
};

// =============================================================================================
// 생산 계획판 (vfPlanBoard, 2 × 1): weeks across, racks down, magnets for what's sown and what's due.

export const PB = {
  z: -0.32,
  x0: -0.836,
  y0: 1.797,
  dx: 0.232,
  dy: 0.2014,
  ledge: 0.9,
  marker: [0.8, 0.93, -0.22] as V,
};
export const pbCell = (col: number, row: number): V => [PB.x0 + 0.42 + col * PB.dx, PB.y0 - 0.16 - row * PB.dy, PB.z + 0.03];
const PLAN: Script = {
  seq: [['read', 3.0, 0.7], ['moveA', 2.6], ['moveB', 2.6], ['take', 1.0], ['writeA', 3.4], ['writeB', 3.4], ['stow', 1.0, 0.8], ['back', 2.2]],
  at: (k) => (k === 'back' ? st(0.1, 0, 0.72) : k === 'read' ? st(-0.3, 0, 0.18) : st(0.1, 0, 0.18)),
  key(k, u, c) {
    const n: Record<string, number> = { moved: c.p('moveA', 0.3, 0.8) + c.p('moveB', 0.3, 0.8), written: c.p('writeA', 0.1, 0.9) + c.p('writeB', 0.1, 0.9), rx: -1.55, ry: 0, rz: 0, sp: 0 };
    const penAt = (row: number, v: number): V => { const p = pbCell(4.2 + v * 1.5, row); return add(p, 0.03, 0, 0.12); };
    switch (k) {
      case 'read':
        return { l: pbCell(frac(u * 2) * 2.5, clampI(u * 4, 4)), r: idle(c, -1), gl: 0.2, palms: 0.05, lean: 0.08, nod: -0.05, n };
      case 'moveA':
      case 'moveB': {
        const a = k === 'moveA' ? pbCell(1, 1) : pbCell(2, 3);
        const b = k === 'moveA' ? pbCell(3, 1) : pbCell(4, 3);
        const e = sm(u, 0.25, 0.8);
        return { r: add(lerpV(a, b, e), 0, 0, 0.04), l: idle(c, 1), gr: 0.65, palms: 0.05, lean: 0.08, nod: -0.02, props: { magnet: lerpV(a, b, e) }, n: { ...n, which: k === 'moveA' ? 1 : 2 } };
      }
      case 'take':
        return { l: idle(c, 1), hold: 'marker', props: { marker: lerpV(PB.marker, add(pbCell(4.2, 0), 0.03, 0, 0.12), sm(u, 0.2, 0.9)) }, lean: 0.1, nod: 0.05, n };
      case 'writeA':
      case 'writeB': {
        const row = k === 'writeA' ? 0 : 2;
        const v = frac(u * 2);
        return { l: idle(c, 1), hold: 'marker', props: { marker: add(penAt(row, v), 0, 0.012 * Math.sin(u * 40), 0) }, lean: 0.08, nod: row > 0 ? 0.08 : -0.06, n };
      }
      case 'stow':
        return { l: idle(c, 1), hold: 'marker', props: { marker: lerpV(add(pbCell(4.2, 2), 0.03, 0, 0.12), PB.marker, sm(u, 0.1, 0.9)) }, lean: 0.14, nod: 0.3, n };
      default:
        return { l: c.bd(0.18, 0.84 * c.H, 0.08), r: idle(c, -1), gl: 0.3, lean: 0, nod: -0.05, palms: 0.3, n };
    }
  },
};
const LEAD: Script = {
  seq: [['open', 3.2, 0.7], ['point', 4.0, 0.7], ['ask', 3.6, 0.6], ['move', 3.0, 0.7], ['close', 3.2]],
  at: (k) => (k === 'open' || k === 'ask' || k === 'close' ? st(-0.42, 0, 0.5, 0.7) : st(0, 0, 0.18)),
  key(k, u, c) {
    const n: Record<string, number> = { moved: k === 'move' ? sm(u, 0.25, 0.8) : k === 'close' ? 1 : 0, team: k === 'ask' ? 1 : k === 'close' ? 2 : 0, written: 0, rx: 0, ry: 0, rz: 0 };
    switch (k) {
      case 'point':
        return { l: idle(c, 1), r: add(pbCell(0.4 + 3.4 * u, 1 + 2 * u), 0.0, 0, 0.05), gr: 0.15, palms: 0.05, lean: 0.06, nod: -0.04, n };
      case 'move': {
        const a = pbCell(1, 1);
        const b = pbCell(3, 1);
        const e = sm(u, 0.25, 0.8);
        return { l: idle(c, 1), r: add(lerpV(a, b, e), 0, 0, 0.04), gr: 0.65, palms: 0.05, lean: 0.06, nod: -0.03, props: { magnet: lerpV(a, b, e) }, n: { ...n, which: 1 } };
      }
      case 'ask':
        return { l: c.bd(0.22, (0.68 + 0.02 * wave(c.t, 0.7)) * c.H, 0.3), r: c.bd(-0.22, 0.62 * c.H, 0.26), gl: 0.15, gr: 0.15, palms: 0.6, lean: 0.02, nod: 0.05, n };
      default:
        return { l: c.bd(0.2, (0.68 + 0.03 * wave(c.t, 0.6)) * c.H, 0.3), r: idle(c, -1), gl: 0.15, palms: 0.7, lean: 0.03, nod: 0.08 * wave(c.t, 0.4), n };
    }
  },
};

// =============================================================================================
// 위생 전실 (vfCleanEntry, 3 × 1): gowns and hairnets, a boot wash on the floor, the sanitiser; the checklist.

export const CE = {
  locker: { x: -1.08, w: 0.64, h: 1.42, door: 0.06, pivot: -0.76 },
  gown: [-1.08, 1.12, 0.0] as V,
  hairnet: [-0.34, 1.14, -0.22] as V,
  tray: { x: 0.28, z: 0.56 },
  pump: [1.0, 1.08, -0.3] as V,
  list: [0.56, 1.24, -0.28] as V,
};
const GOWN: Script = {
  seq: [['open', 1.4, 0.3], ['gown', 3.4, 0.8], ['net', 2.6, 0.9], ['boots', 3.8, 0.9], ['rub', 3.4, 0.5], ['sign', 2.2]],
  at: (k) => (k === 'open' || k === 'gown' ? st(-1.2, 0, 0.46) : k === 'net' ? st(-0.3, 0, 0.26) : k === 'boots' ? st(0.28, 0.06, 0.28) : st(0.86, 0, 0.2)),
  key(k, u, c) {
    const n: Record<string, number> = { door: k === 'open' ? sm(u, 0.2, 0.9) : k === 'gown' ? 1 - sm(u, 0.75, 1) : 0, worn: k === 'gown' ? sm(u, 0.3, 0.85) : 0, netOn: k === 'net' ? sm(u, 0.5, 0.9) : 0, foam: k === 'boots' ? 1 : 0, drop: k === 'rub' && u < 0.3 ? 1 : 0, ticks: k === 'sign' ? u * 3 : 0 };
    const head = c.bd(0, 0.93 * c.H, 0.02);
    switch (k) {
      case 'open':
        return { l: idle(c, 1), r: [CE.locker.pivot - CE.locker.w * Math.cos(n.door * 1.3) + 0.08, 1.0, CE.locker.door + 0.03 + CE.locker.w * Math.sin(n.door * 1.3)], gr: 0.8, palms: 0.4, lean: 0.14, nod: 0.05, n };
      case 'gown': {
        // Off the peg, shaken out in front and drawn up over one arm and then the other.
        const a = sm(u, 0, 0.3);
        const up = sm(u, 0.3, 0.85);
        const front = lerpV(CE.gown, c.bd(0, 0.72 * c.H, 0.3), a);
        const shoulder = c.bd(0, 0.82 * c.H, 0.03);
        const p = lerpV(front, shoulder, up);
        return { l: add(p, 0.18 * (1 - up) + 0.16 * up, 0.02, 0.02), r: add(p, -0.18 * (1 - up) - 0.16 * up, 0.02, 0.02), gl: 0.7, gr: 0.7, palms: 0.6, lean: 0.06, nod: 0.25 - 0.2 * up, props: { gown: u < 0.92 ? p : null }, n };
      }
      case 'net': {
        const pick = lerpV(CE.hairnet, c.bd(0, 0.7 * c.H, 0.26), sm(u, 0.05, 0.4));
        const p = lerpV(pick, head, sm(u, 0.4, 0.8));
        return { l: add(p, 0.09, -0.02, 0.02), r: add(p, -0.09, -0.02, 0.02), gl: 0.6, gr: 0.6, palms: 0.7, lean: 0.03, nod: 0.1 - 0.15 * sm(u, 0.4, 0.8), props: { net: u < 0.9 ? p : null }, n };
      }
      case 'boots':
        // Treading in the wash: the body rocking side to side on its feet, the hands out for balance.
        return { l: c.bd(0.34, 0.58 * c.H + 0.03 * wave(c.t, 1.2), 0.12), r: c.bd(-0.34, 0.58 * c.H - 0.03 * wave(c.t, 1.2), 0.12), gl: 0.1, gr: 0.1, palms: 0.2, lean: 0.12 + 0.04 * wave(c.t, 1.2), nod: 0.65, crouch: 0.12 + 0.08 * Math.abs(wave(c.t, 1.2)), n };
      case 'rub': {
        if (u < 0.3) return { l: add(CE.pump, 0.0, -0.22, 0.05), r: add(CE.pump, 0, u > 0.1 && u < 0.2 ? 0.13 : 0.17, 0.0), gl: 0.2, gr: 0.2, palms: 0.9, lean: 0.14, nod: 0.05, n };
        const a = u * 40;
        const mid = c.bd(0, 0.62 * c.H, 0.24);
        return { l: add(mid, 0.03 * Math.cos(a), 0.015 * Math.sin(a * 0.7), 0), r: add(mid, -0.03 * Math.cos(a), -0.015 * Math.sin(a * 0.7), 0), gl: 0.25, gr: 0.25, palms: 0.5, lean: 0.06, nod: 0.45, n };
      }
      default:
        return { l: idle(c, 1), r: add(CE.list, -0.04, 0.02 - clampI(u * 3, 3) * 0.05, 0.06), gr: 0.15, palms: 0.05, lean: 0.14, nod: -0.05, tap: true, n };
    }
  },
};

const SCRIPTS: Record<VfMotion, Script> = {
  vfInspect: INSPECT,
  vfHarvest: HARVEST,
  vfPollinate: POLLINATE,
  vfPick: PICK,
  vfClean: CLEAN,
  vfTrial: TRIAL,
  vfClimate: CLIMATE,
  vfLogic: LOGIC,
  vfMix: MIX,
  vfCal: CAL,
  vfFix: FIX,
  vfSeedMove: MOVE,
  vfSow: SOW,
  vfLearn: LEARN,
  vfPack: PACK,
  vfBrix: BRIX,
  vfStock: STOCK,
  vfPlan: PLAN,
  vfLead: LEAD,
  vfGown: GOWN,
};
