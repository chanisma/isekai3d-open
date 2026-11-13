import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A shift at the 청소 차고지 before it's light (2026-11-01, the workplace pipeline, at the user's request). Each motion is a round
 * of beats: where the dweller is, where the hands go, and what moves. The piece reads the same script by the same clock
 * (sanitationWorker.ts), so the bag in the arms is the one that lands in the hopper, and what's in the hand goes through
 * handTool.ts (`tool`, the piece says how each is held). Hard, skilled work, shown as that. All names are made up.
 *
 * - 청소차 (garbageTruck, 5 × 2, its cab at -x, the hopper at +x): snLoad: street bags off the pile into the hopper, a wheelie bin
 *   rolled to the lifter and tipped, the lever, the blade comes round and packs it. snGate: the tailgate raised on its rams and
 *   the seals looked over with a torch. snPlan: the route sheet on a clipboard at the cab door. Rounds themselves are off the lot.
 * - 재활용 선별대 (recycleSorter, 4 × 1): snSort: what comes down the belt, taken off into the right chute by kind. snAssay: a sample
 *   basket off the belt, on the scale, the contamination written down.
 * - 가로 청소 수레 (snStreetCart): snSweep: the broom from the cart, swept to a heap on the floor, the long dustpan, into the cart's
 *   bin. snTongs: butts picked up with the long tongs into the bag on its hoop.
 * - 제설함 (snSandBox): snSand: the lid up, the shovel dug in, sand thrown in the barrow.
 * - 장비 보관함 (snLocker): snGear: the door, the vest looked over for its reflective tape, gloves taken.
 * - 노선 배차판 (snRouteBoard): snBoard: a route's magnet moved to the crew taking it.
 * - 봉투 집하장 (snBinRow): snBags: bags moved up to the kerb stack.
 * - 대형 폐기물 보관장 (snBulkYard): snBulk: the slip read against the piece, the fee sticker pressed on.
 * - 보리차 통 (snTeaUrn): snTea: a paper cup filled at the tap, drunk slowly.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front).
 */
export type SnMotion = 'snLoad' | 'snGate' | 'snPlan' | 'snSort' | 'snAssay' | 'snSweep' | 'snTongs' | 'snSand' | 'snGear' | 'snBoard' | 'snBags' | 'snBulk' | 'snTea';
export const SN_MOTIONS = new Set<string>(['snLoad', 'snGate', 'snPlan', 'snSort', 'snAssay', 'snSweep', 'snTongs', 'snSand', 'snGear', 'snBoard', 'snBags', 'snBulk', 'snTea']);
export type SnTool = 'broom' | 'broomRest' | 'broomCarry' | 'pan' | 'panRest' | 'panFree' | 'tongs' | 'shovelRest' | 'shovelFree' | 'shovelCarry' | 'torch' | 'clip' | 'cup';
/** Between where it's kept and the work it's in the one hand: the other couldn't get to it on a tool still swinging round, and it takes hold again there. */
const CARRIED: Partial<Record<SnTool, SnTool>> = { broom: 'broomCarry', shovelFree: 'shovelCarry' };

const frac = (x: number) => ((x % 1) + 1) % 1;
export const snPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.571);
export const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
/** Round `n` of a list, whichever way time's going. */
export const wrap = (n: number, len: number) => ((Math.floor(n) % len) + len) % len;
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------
// The script engine.

type Seq = Array<[string, number, number?]>;
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
const st = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  crouch?: number;
  tool?: SnTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  round: number;
  /** The way their left is. */
  lx: number;
  lz: number;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string, round: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface SnNow {
  b: Beat;
  st: St;
  walking: boolean;
  tool: SnTool | null;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number): { st: St; key: Key } {
  const here = s.at(k, round);
  const idx = s.seq.findIndex(([q]) => q === k);
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = {
    t,
    H,
    st: here,
    round,
    lx,
    lz,
    bd: (side, up, ahead) => [here.x + lx * side + fx * ahead, here.y + up, here.z + lz * side + fz * ahead],
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0) };
}
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function snNow(m: SnMotion, t: number, ph: number, H = 1.6): SnNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const last = b.i === s.seq.length - 1;
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, last ? b.n + 1 : b.n) : A;
  const e = b.e;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: 0, z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e) };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  let tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  if (tool && CARRIED[tool] && n.rest > 0.02 && n.rest < 0.98) tool = CARRIED[tool]!;
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12, tool, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function snPose(m: SnMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = snNow(m, t, snPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 } },
      crouch: k.crouch ? k.crouch : undefined,
    },
  };
}
const leftRest = (c: Ctx): V => c.bd(0.2, 0.55 * c.H, 0.08);
const rightRest = (c: Ctx): V => c.bd(-0.2, 0.55 * c.H, 0.08);
/** Both hands on the sides of something, across the body. */
const both = (c: Ctx, p: V, half: number): Pick<Key, 'l' | 'r' | 'gl' | 'gr' | 'palms'> => ({ l: add(p, c.lx * half, 0, c.lz * half), r: add(p, -c.lx * half, 0, -c.lz * half), gl: 0.7, gr: 0.7, palms: 0 });

// =============================================================================================
// 청소차 (garbageTruck, 5 × 2): the cab at -x, the hopper's mouth at +x; a pile of street bags off its near corner and a wheelie
// bin by the kerb that rolls to the lifter; the lever box on its post at the corner.

export const TR = {
  mouth: [2.32, 1.12, 0] as V,
  drop: [1.82, 0.98, 0] as V,
  pile: [2.95, 0.2, -0.78] as V,
  binHome: [2.82, 0, 1.02] as V,
  binHook: [2.55, 0, 0.42] as V,
  lever: [2.46, 1.14, 0.9] as V,
  door: [-1.75, 1.3, 0.9] as V,
};
export const TR_ROUND = 5;
const LOAD: Script = {
  seq: [['take1', 1.0], ['throw1', 0.9], ['take2', 1.0], ['throw2', 0.9], ['roll', 1.4], ['tip', 2.6], ['back', 1.0], ['lever', 0.8], ['press', 3.2]],
  at(k) {
    if (k === 'take1' || k === 'take2') return st(2.95, -0.46, PI);
    if (k === 'throw1' || k === 'throw2') return st(2.95, 0.02, -PI / 2);
    if (k === 'roll' || k === 'back') return st(3.02, 0.5, -PI / 2);
    return st(2.98, 0.84, -PI / 2);
  },
  key(k, u, c) {
    const bags = c.p('throw1', 0.6, 0.7) + c.p('throw2', 0.6, 0.7) + c.p('tip', 0.45, 0.5);
    const packed = c.p('press', 0.55, 0.75);
    const n: Record<string, number> = { bags: bags * (1 - packed), fill: wrap(c.round, TR_ROUND) + packed, blade: k === 'press' ? u : 0, tip: 0, on: k === 'press' || k === 'tip' ? 1 : 0 };
    const props: Record<string, V | null> = { bin: TR.binHome };
    switch (k) {
      case 'take1':
      case 'take2': {
        const p = lerpV(TR.pile, add(TR.pile, 0, 0.2, 0.1), sm(u, 0.55, 1));
        props.bag = p;
        return { ...both(c, add(p, 0, 0.1, 0), 0.16), lean: 0.42, nod: 0.5, crouch: 0.42 * (1 - sm(u, 0.6, 1)), n, props };
      }
      case 'throw1':
      case 'throw2': {
        const hold: V = c.bd(0, 0.74 * c.H, 0.32);
        const a = sm(u, 0.15, 0.65);
        const p: V = u < 0.65 ? [mixN(hold[0], TR.drop[0], a), mixN(hold[1], TR.drop[1], a) + 0.42 * Math.sin(PI * a), mixN(hold[2], TR.drop[2], a)] : TR.drop;
        props.bag = u < 0.65 ? p : null;
        const h = u < 0.2 ? hold : c.bd(0, 0.9 * c.H, 0.45);
        return { ...both(c, h, 0.15), lean: 0.2 * sm(u, 0.1, 0.5), nod: 0.1, n, props };
      }
      case 'roll':
      case 'back': {
        const e = k === 'roll' ? sm(u, 0.05, 0.95) : 1 - sm(u, 0.05, 0.95);
        const bin = lerpV(TR.binHome, TR.binHook, e);
        props.bin = bin;
        return { ...both(c, add(bin, 0.2, 0.98, 0), 0.14), lean: 0.2, nod: 0.25, n, props };
      }
      case 'tip': {
        props.bin = TR.binHook;
        n.tip = sm(u, 0.08, 0.4) * (1 - sm(u, 0.62, 0.92));
        return { l: add(TR.lever, 0, 0.02, 0.02), gl: 0.7, r: rightRest(c), nod: 0.05, lean: 0.12, n, props };
      }
      case 'lever':
        return { l: add(TR.lever, 0, 0.1 - 0.1 * sm(u, 0.2, 0.7), 0.02), gl: 0.7, r: rightRest(c), nod: 0.15, lean: 0.12, n, props };
      default:
        return { l: add(TR.lever, 0, 0.02, 0.02), gl: 0.7, r: rightRest(c), nod: 0.0, lean: 0.1, n, props };
    }
  },
};
const GATE: Script = {
  seq: [['lever', 0.8], ['raise', 2.4], ['look', 4.2], ['lever2', 0.6], ['lower', 2.4]],
  at: (k) => (k === 'look' ? st(3.02, 0.1, -PI / 2) : st(2.98, 0.84, -PI / 2)),
  key(k, u, c) {
    const gate = k === 'raise' ? sm(u, 0, 1) : k === 'look' || k === 'lever2' ? 1 : k === 'lower' ? 1 - sm(u, 0, 1) : 0;
    const n = { gate, on: k === 'raise' || k === 'lower' ? 1 : 0 };
    if (k === 'look') {
      const hand: V = c.bd(-0.14, 0.72 * c.H, 0.3);
      const a = c.t * 1.1;
      return { l: leftRest(c), nod: 0.0, lean: 0.08, tool: 'torch', n, props: { torch: hand, aim: [1.2, 1.1 + 0.3 * Math.sin(a), 0.5 * Math.cos(a * 0.8)] } };
    }
    return { l: add(TR.lever, 0, k === 'lever' || k === 'lever2' ? 0.08 - 0.08 * sm(u, 0.2, 0.7) : 0.02, 0.02), gl: 0.7, r: rightRest(c), nod: 0.0, lean: 0.12, n };
  },
};
const PLAN: Script = {
  seq: [['read', 2.8], ['look', 1.6], ['write', 2.8]],
  at: () => st(-1.75, 1.46, PI),
  key(k, u, c) {
    const clip: V = c.bd(0.05, 0.68 * c.H, 0.26);
    const n = { lines: c.p('write', 0.1, 0.9) };
    const base = { tool: 'clip' as const, gl: 0.1, n, props: { clip } };
    if (k === 'look') return { ...base, r: add(TR.door, 0.2, 0.15, 0.04), gr: 0.25, palms: 0.8, nod: -0.05 };
    if (k === 'write') return { ...base, r: add(clip, -0.08 + 0.1 * u, 0.04, 0.02 * Math.sin(u * 40)), gr: 0.75, nod: 0.5, lean: 0.06 };
    return { ...base, r: add(clip, -0.1, 0.03, -0.04), gr: 0.3, nod: 0.5, lean: 0.06 };
  },
};

// =============================================================================================
// 재활용 선별대 (recycleSorter, 4 × 1): the belt along x, flowing +x, its top at SR.y; chutes by kind behind it.

export const SR = {
  y: 0.96,
  beltZ: -0.02,
  chuteZ: -0.34,
  chuteY: 1.03,
  slots: [-1.2, -0.4, 0.4, 1.2],
  stand: 0.46,
  scale: [1.58, 1.0, 0.28] as V,
};
const SORT: Script = {
  seq: [['look', 0.8], ['grab', 0.6], ['hold', 0.35], ['drop', 0.55]],
  at(_k, round) {
    return st(SR.slots[wrap(round, 4)] * 0.62, SR.stand);
  },
  key(k, u, c) {
    const slot = SR.slots[wrap(c.round, 4)];
    const pick: V = [c.st.x - 0.14, SR.y + 0.05, SR.beltZ + 0.02];
    const hold: V = c.bd(-0.04, 0.72 * c.H, 0.22);
    const hole: V = [slot, SR.chuteY + 0.06, SR.chuteZ];
    const gaze = { nod: 0.52, lean: 0.18 };
    const lh: V = add(pick, -0.14, 0.04, 0.02);
    switch (k) {
      case 'look':
        return { ...gaze, l: lh, gl: 0.3, r: add(pick, 0.08, 0.12, 0.06), gr: 0.25, palms: 1 };
      case 'grab': {
        const p = lerpV(add(pick, 0.08, 0.1, 0.02), pick, sm(u, 0, 0.6));
        return { ...gaze, l: lh, gl: 0.3, r: p, gr: 0.3 + 0.5 * sm(u, 0.5, 0.9), props: { item: u > 0.6 ? p : null } };
      }
      case 'hold':
        return { ...gaze, l: lh, gl: 0.3, r: hold, gr: 0.8, props: { item: hold } };
      default: {
        const p = lerpV(hold, hole, sm(u, 0, 0.7));
        return { nod: 0.42, lean: 0.34, l: lh, gl: 0.3, r: p, gr: 0.8 - 0.6 * sm(u, 0.7, 0.9), props: { item: u < 0.85 ? p : null } };
      }
    }
  },
};
const ASSAY: Script = {
  seq: [['pick', 1.4], ['weigh', 2.4], ['note', 3.0], ['tip', 1.1]],
  at: (k) => (k === 'pick' ? st(0.72, SR.stand) : st(1.46, SR.stand + 0.06)),
  key(k, u, c) {
    const onBelt: V = [c.st.x, SR.y + 0.08, SR.beltZ];
    const n = { w: k === 'weigh' ? sm(u, 0.1, 0.6) : k === 'note' ? 1 : 0, ticks: k === 'note' ? 2 * u : 0 };
    switch (k) {
      case 'pick': {
        const p = lerpV(onBelt, add(onBelt, 0, 0.12, 0.1), sm(u, 0.5, 1));
        return { ...both(c, p, 0.12), nod: 0.5, lean: 0.24, n, props: { basket: p } };
      }
      case 'weigh': {
        const p = lerpV(add(SR.scale, 0, 0.14, 0), add(SR.scale, 0, 0.05, 0), sm(u, 0, 0.3));
        return { ...both(c, add(p, 0, 0.03, 0), 0.13), gl: 0.4 * (1 - sm(u, 0.3, 0.5)) + 0.2, gr: 0.4, nod: 0.46, lean: 0.14, n, props: { basket: p } };
      }
      case 'note': {
        const clip: V = c.bd(0.06, 0.68 * c.H, 0.24);
        return { tool: 'clip', gl: 0.1, r: add(clip, -0.06 + 0.1 * u, 0.04, 0.02 * Math.sin(u * 40)), gr: 0.75, nod: 0.5, lean: 0.06, n, props: { basket: add(SR.scale, 0, 0.05, 0), clip } };
      }
      default: {
        const p = lerpV(add(SR.scale, 0, 0.05, 0), [1.0, SR.y + 0.12, SR.beltZ], sm(u, 0.05, 0.9));
        return { ...both(c, p, 0.12), nod: 0.42, lean: 0.14, n, props: { basket: p } };
      }
    }
  },
};

// =============================================================================================
// 가로 청소 수레 (snStreetCart, 2 × 1): the cart at the back, its bin up top, broom at the left and long dustpan at the right
// resting on it; the street is the floor in front.

export const CT = {
  broomRest: [-0.78, 0, 0.3] as V,
  panRest: [0.78, 0, 0.3] as V,
  bin: [0.22, 0.86, 0.02] as V,
  heap: [0.28, 0, 1.36] as V,
  butts: [[-0.66, 1.3], [0.12, 1.56], [0.74, 1.24]] as Array<[number, number]>,
  tongsRest: [0.0, 0.95, 0.34] as V,
};
/** How high the hand's on the long dustpan with its head on the floor, of their height: where an arm from the shoulder gets to on anyone. */
const PAN_HAND = 0.6;
const sweepTip = (t: number): V => {
  const a = (t * PI * 2) / 1.6;
  return [0.1 + 0.32 * Math.sin(a), 0.02 * Math.max(0, Math.cos(a)), 1.34 + 0.05 * Math.cos(a)];
};
const SWEEP: Script = {
  // The moves at a walk: stepped through in the usual half second the arms can't keep up with what's in them.
  seq: [['take', 1.0, 0.8], ['turn', 0.8], ['sweep', 8.0, 1.0], ['stow', 1.0, 1.6], ['ptake', 0.8, 0.9], ['pturn', 0.7], ['scoop', 2.4, 0.9], ['dump', 1.5, 0.8], ['pback', 1.0, 1.6]],
  at(k) {
    switch (k) {
      case 'take':
      case 'stow':
        return st(-0.78, 0.62, PI);
      case 'turn':
        return st(-0.2, 0.82, 0);
      case 'sweep':
        return st(0.06, 0.8, 0);
      case 'ptake':
      case 'pback':
        return st(0.78, 0.62, PI);
      case 'pturn':
      case 'scoop':
        return st(0.3, 0.82, 0);
      default:
        return st(0.3, 0.86, PI);
    }
  },
  key(k, u, c) {
    const swept = (k === 'sweep' ? 0.85 * u : c.p('sweep') * 0.85) + 0.15 * c.p('scoop', 0.1, 0.9);
    const n: Record<string, number> = { swept, rest: 0, hu: 0.7, ha: 0.26, bspin: PI / 2, prest: 1, loaded: c.p('scoop', 0.5, 0.8) * (1 - c.p('dump', 0.5, 0.8)) };
    const free = { l: leftRest(c), r: rightRest(c) };
    const away = { broom: CT.broomRest, pan: CT.panRest };
    switch (k) {
      case 'take':
        return { tool: 'broomRest', lean: 0.2, crouch: 0.2, nod: 0.25, n: { ...n, rest: 1 }, props: away };
      case 'turn':
        return { tool: 'broom', lean: 0.12, nod: 0.3, n, props: { ...away, broom: sweepTip(0) } };
      case 'sweep': {
        const a = (c.t * PI * 2) / 1.6;
        return { tool: 'broom', lean: 0.2, nod: 0.42, n: { ...n, bspin: PI / 2 + 0.25 * Math.sin(a) }, props: { ...away, broom: sweepTip(c.t) } };
      }
      case 'stow':
        return { tool: 'broomRest', lean: 0.2, crouch: 0.2, nod: 0.25, n: { ...n, rest: 1 }, props: away };
      case 'ptake':
      case 'pback':
        return { tool: 'panRest', lean: 0.2, crouch: 0.2, nod: 0.25, n: { ...n, rest: 1 }, props: away };
      case 'pturn':
        // On its way from the cart it comes with the hand: pinned at its head, as it is once on the ground, it would pull out of it.
        return { tool: 'panFree', l: free.l, lean: 0.16, nod: 0.4, n: { ...n, rest: 1, prest: 0, hu: PAN_HAND, ha: 0.24 }, props: { ...away, pan: [0.26, 0, 1.2] } };
      case 'scoop': {
        const go = 0.03 * Math.sin(u * PI * 5);
        return { tool: 'pan', l: free.l, lean: 0.24, nod: 0.46, crouch: 0.1, n: { ...n, rest: 1, prest: 0, hu: PAN_HAND, ha: 0.24 }, props: { ...away, pan: [0.26 + go, 0, 1.2] } };
      }
      default: {
        const lift = sm(u, 0, 0.45);
        return { tool: 'panFree', l: free.l, lean: 0.14, nod: 0.3, n: { ...n, rest: 1, prest: 0, hu: 0.7, ha: 0.28, hs: 0.2 }, props: { ...away, pan: lerpV([0.3, 0.7, 0.42], add(CT.bin, 0, 0.1, 0.12), lift) } };
      }
    }
  },
};
const TONGS: Script = {
  seq: [['take', 1.0], ['pick0', 1.3], ['bag0', 0.9], ['pick1', 1.3], ['bag1', 0.9], ['pick2', 1.3], ['bag2', 0.9], ['stow', 1.0]],
  at(k) {
    if (k === 'take' || k === 'stow') return st(0.0, 0.72, PI);
    const i = Number(k[k.length - 1]);
    const [x, z] = CT.butts[i];
    return st(x + 0.2, z - 0.72, 0);
  },
  key(k, u, c) {
    const got = [c.p('pick0', 0.7, 0.72), c.p('pick1', 0.7, 0.72), c.p('pick2', 0.7, 0.72)];
    const n = { g0: got[0], g1: got[1], g2: got[2], snap: 0 };
    if (k === 'take' || k === 'stow') return { r: add(CT.tongsRest, 0, 0, 0.0), gr: 0.75, l: leftRest(c), nod: 0.25, lean: 0.1, n, props: { tongs: k === 'take' ? add(CT.tongsRest, 0, sm(u, 0.5, 1) * 0.06, 0) : CT.tongsRest } };
    const i = Number(k[k.length - 1]);
    const [x, z] = CT.butts[i];
    const hold: V = c.bd(0.24, 0.46 * c.H, 0.28);
    const mouth: V = add(hold, 0, -0.14, 0);
    const lit: V = [x, 0.015, z];
    const body = { l: add(hold, 0, 0.03, 0), gl: 0.8 };
    if (k[0] === 'p') {
      const down = sm(u, 0.05, 0.5);
      const hand: V = c.bd(-0.14, (0.7 - 0.14 * down) * c.H, 0.32);
      n.snap = sm(u, 0.55, 0.7);
      return { ...body, tool: 'tongs', crouch: 0.22 * down, nod: 0.5, lean: 0.24, n, props: { tongs: hand, tip: lit, bag: hold } };
    }
    const hand: V = lerpV(c.bd(-0.14, 0.62 * c.H, 0.32), c.bd(0.06, 0.74 * c.H, 0.3), sm(u, 0, 0.5));
    n.snap = 1 - sm(u, 0.6, 0.8);
    return { ...body, tool: 'tongs', nod: 0.36, lean: 0.08, n, props: { tongs: hand, tip: mouth, bag: hold } };
  },
};

// =============================================================================================
// 제설함 (snSandBox, 2 × 1): the yellow box with its lid, the shovel at its side, a barrow in the row in front.

export const SB = {
  rest: [0.86, 0, 0.26] as V,
  dig: [-0.22, 0.66, 0.02] as V,
  lip: [-0.22, 0.82, 0.12] as V,
  /** Over the box's front wall, still arm's length off. */
  out: [-0.22, 0.95, 0.02] as V,
  barrow: [0.62, 0.62, 1.0] as V,
  stance: [-0.2, 0.92] as [number, number],
};
const SAND: Script = {
  seq: [['open', 0.8, 1.0], ['take', 0.8, 1.1], ['scoop', 1.3], ['lift', 0.7], ['toss', 0.9], ['scoop2', 1.3], ['lift2', 0.7], ['toss2', 0.9, 1.1], ['stow', 0.9, 1.0]],
  at(k) {
    if (k === 'take' || k === 'stow') return st(0.6, 0.56, PI);
    if (k === 'open') return st(-0.2, 0.62, PI);
    // The feet stay put: a turn from the box to the barrow at their side.
    if (k === 'toss' || k === 'toss2') return st(SB.stance[0], SB.stance[1], PI / 2);
    return st(SB.stance[0], SB.stance[1], PI);
  },
  key(k, u, c) {
    const lid = k === 'stow' ? 1 - sm(u, 0.2, 1) : k === 'open' ? sm(u, 0.2, 1) : k === 'take' ? 1 : 1;
    const tossed = c.p('toss', 0.3, 0.5) + c.p('toss2', 0.3, 0.5);
    const n: Record<string, number> = { lid, rest: 0, hu: 0.68, ha: 0.2, hs: 0.08, load: 0, tossed: wrap(c.round, 3) * 2 + tossed, turn: 0 };
    const away = { shovel: SB.rest };
    const hands = { l: leftRest(c), r: rightRest(c) };
    switch (k) {
      case 'open':
        return { ...hands, r: [-0.1, 0.96, 0.3], gr: 0.7, nod: 0.3, lean: 0.14, n: { ...n, rest: 1 }, props: away };
      case 'take':
      case 'stow':
        return { tool: 'shovelRest', nod: 0.25, lean: 0.2, crouch: 0.25, n: { ...n, rest: 1 }, props: away };
      case 'scoop':
      case 'scoop2': {
        const push = sm(u, 0.1, 0.7);
        return { tool: 'shovelFree', nod: 0.46, lean: 0.2 + 0.1 * push, crouch: 0.08 * push, n, props: { shovel: lerpV(SB.lip, SB.dig, push) } };
      }
      case 'lift':
      case 'lift2':
        return { tool: 'shovelFree', nod: 0.3, lean: 0.12, n: { ...n, load: 1 }, props: { shovel: lerpV(SB.dig, SB.out, sm(u, 0, 1)) } };
      default: {
        const go = sm(u, 0, 0.35);
        return { tool: 'shovelFree', nod: 0.3, lean: 0.16, n: { ...n, load: u < 0.35 ? 1 : 0, turn: sm(u, 0.25, 0.5) }, props: { shovel: lerpV(add(SB.barrow, 0, 0.24, 0), SB.barrow, go) } };
      }
    }
  },
};

// =============================================================================================
// 장비 보관함 (snLocker, 3 × 1): three steel doors; the left one opens on the vests.

export const LK = {
  hinge: [-1.38, -0.48, 0.3] as [number, number, number],
  face: -0.14,
  vest: [-0.96, 1.42, -0.12] as V,
  gloves: [-0.96, 0.96, 0.02] as V,
};
const GEAR: Script = {
  seq: [['open', 1.0], ['take', 1.0], ['check', 2.6], ['hang', 1.0], ['gloves', 1.4], ['close', 0.8]],
  at: () => st(-0.86, 0.46, PI),
  key(k, u, c) {
    const door = k === 'open' ? sm(u, 0.2, 1) : k === 'close' ? 1 - sm(u, 0.1, 0.9) : 1;
    const pull: V = [-0.54, 1.1, -0.12 + 0.3 * door];
    const n = { door, gl: k === 'gloves' ? sm(u, 0.3, 0.5) : k === 'close' ? 1 : 0 };
    const front: V = c.bd(0, 0.92 * c.H, 0.32);
    const props: Record<string, V | null> = { vest: LK.vest };
    switch (k) {
      case 'open':
      case 'close':
        return { r: pull, gr: 0.75, l: leftRest(c), nod: 0.1, lean: 0.08, n, props };
      case 'take':
      case 'hang': {
        const e = k === 'take' ? sm(u, 0.1, 0.9) : 1 - sm(u, 0.1, 0.9);
        const p = lerpV(LK.vest, front, e);
        props.vest = p;
        return { ...both(c, add(p, 0, 0.26, 0), 0.14), gl: 0.8, gr: 0.8, nod: -0.05, n, props };
      }
      case 'check': {
        const sway = 0.14 * Math.sin(u * PI * 2);
        const p = add(front, sway, -0.02, 0);
        props.vest = p;
        return { ...both(c, add(p, 0, 0.26, 0), 0.14), gl: 0.8, gr: 0.8, nod: 0.3 + 0.1 * Math.sin(u * PI * 3), n, props };
      }
      default: {
        const p = lerpV(LK.gloves, c.bd(-0.17, 0.52 * c.H, 0.08), sm(u, 0.3, 0.9));
        props.glove = u > 0.3 && u < 0.92 ? p : null;
        return { r: p, gr: 0.7, l: leftRest(c), nod: 0.3, lean: 0.08, n, props };
      }
    }
  },
};

// =============================================================================================
// 노선 배차판 (snRouteBoard, 2 × 1): a board of six routes down the side and three columns across; a magnet for each route.

export const RB = {
  face: -0.34,
  rows: [1.86, 1.68, 1.5, 1.32, 1.14, 0.96],
  cols: [-0.08, 0.28, 0.64],
};
export const magnetAt = (row: number, col: number): V => [RB.cols[col], RB.rows[row], RB.face + 0.02];
const BOARD: Script = {
  seq: [['read', 2.4], ['take', 0.7], ['move', 1.2], ['tick', 1.8]],
  at: (_k, round) => st((RB.cols[wrap(round, 3)] + RB.cols[wrap(round + 1, 3)]) * 0.4, 0.12, PI),
  key(k, u, c) {
    const row = wrap(c.round, 6);
    const from = wrap(c.round, 3);
    const to = wrap(c.round + 1, 3);
    const A = magnetAt(row, from);
    const B = magnetAt(row, to);
    const mg: V = k === 'read' || k === 'take' ? A : k === 'move' ? lerpV(A, B, sm(u, 0.1, 0.9)) : B;
    const props = { magnet: mg };
    const n = { col: to };
    const look = row < 2 ? -0.2 : row < 4 ? -0.08 : 0.08;
    switch (k) {
      case 'read':
        return { r: [c.st.x - 0.22 - 0.1 * Math.sin(u * PI), A[1], A[2] + 0.04], gr: 0.25, palms: 0.8, l: leftRest(c), nod: look, n, props };
      case 'take':
        return { r: add(A, 0, 0, 0.03), gr: 0.75, l: leftRest(c), nod: look, n, props };
      case 'move':
        return { r: add(mg, 0, 0, 0.03), gr: 0.75, l: leftRest(c), nod: look, n, props };
      default: {
        const pen: V = [c.st.x + 0.2, 0.92 + 0.02 * Math.sin(u * 30), RB.face + 0.1];
        return { r: rightRest(c), l: pen, gl: 0.7, nod: 0.3, lean: 0.06, n, props };
      }
    }
  },
};

// =============================================================================================
// 봉투 집하장 (snBinRow, 3 × 1): wheelie bins along the back; the bags come off one heap and go on the kerb stack.

export const BR = {
  from: [-0.72, 0.16, 0.42] as V,
  to: [0.72, 0.16, 0.42] as V,
};
export const BR_N = 4;
const BAGS: Script = {
  seq: [['bend', 1.0], ['carry', 1.0], ['set', 0.9]],
  at(k) {
    if (k === 'bend') return st(-0.42, 0.76, PI + 0.72);
    if (k === 'carry') return st(0, 0.92, PI);
    return st(0.42, 0.76, PI - 0.72);
  },
  key(k, u, c) {
    const moved = wrap(c.round, BR_N);
    const hold: V = c.bd(0, 0.72 * c.H, 0.3);
    const n = { moved: moved + c.p('set', 0.75, 0.85) };
    if (k === 'bend') {
      const p = lerpV(BR.from, add(BR.from, 0, 0.3, 0.1), sm(u, 0.6, 1));
      return { ...both(c, add(p, 0, 0.1, 0), 0.16), crouch: 0.42 * (1 - sm(u, 0.6, 1)), lean: 0.4, nod: 0.5, n, props: { bag: p } };
    }
    if (k === 'carry') return { ...both(c, hold, 0.16), lean: -0.04, nod: 0.1, n, props: { bag: hold } };
    const p = lerpV(add(BR.to, 0, 0.3, 0.1), BR.to, sm(u, 0, 0.75));
    return { ...both(c, add(p, 0, 0.1, 0), 0.16), crouch: 0.42 * sm(u, 0, 0.7), lean: 0.38, nod: 0.5, n, props: { bag: u < 0.8 ? p : null } };
  },
};

// =============================================================================================
// 대형 폐기물 보관장 (snBulkYard, 3 × 1): a sofa, a chest, a mattress on the slab; a slip read and the fee sticker put on.

export const BK = {
  sticker: [-0.4, 0.62, 0.13] as V,
};
const BULK: Script = {
  seq: [['read', 2.4], ['peel', 1.0], ['stick', 1.3], ['tap', 0.8], ['note', 1.6]],
  at: () => st(-0.36, 0.8, PI),
  key(k, u, c) {
    const slip: V = c.bd(0.08, 0.7 * c.H, 0.28);
    const n = { stuck: c.p('stick', 0.75, 0.9) };
    const props: Record<string, V | null> = { slip };
    const hold = { l: add(slip, 0.06, -0.02, 0), gl: 0.7 };
    switch (k) {
      case 'read':
        return { ...hold, r: add(slip, -0.08, 0.02, 0), gr: 0.4, nod: 0.5, n, props };
      case 'peel': {
        const p = add(slip, -0.04 * u, 0.03 + 0.05 * u, 0.02);
        props.tag = p;
        return { ...hold, r: p, gr: 0.7, nod: 0.46, n, props };
      }
      case 'stick': {
        const p = lerpV(add(slip, -0.04, 0.08, 0.02), add(BK.sticker, 0, 0, 0.02), sm(u, 0, 0.75));
        props.tag = u < 0.85 ? p : null;
        return { ...hold, r: p, gr: 0.6, nod: 0.5, lean: 0.36, crouch: 0.18 * sm(u, 0, 0.7), n, props };
      }
      case 'tap':
        return { ...hold, r: add(BK.sticker, 0, 0.0, 0.03 + 0.012 * Math.sin(u * 22)), gr: 0.05, palms: 1, nod: 0.5, lean: 0.34, crouch: 0.18, n, props };
      default:
        return { ...hold, r: add(slip, -0.06 + 0.1 * u, 0.02, 0.015 * Math.sin(u * 30)), gr: 0.75, nod: 0.5, n, props };
    }
  },
};

// =============================================================================================
// 보리차 통 (snTeaUrn, 1 × 1): a small table with the urn at its back, its tap at the front, a stack of paper cups.

export const UR = {
  T: 0.76,
  tap: [-0.14, 0.97, 0.02] as V,
  under: [-0.14, 0.88, 0.04] as V,
  stack: [0.27, 0.86, 0.02] as V,
  bin: [0.27, 0.86, 0.02] as V,
};
const TEA: Script = {
  seq: [['take', 1.0], ['fill', 2.4], ['sip', 2.6], ['rest', 2.0], ['sip2', 2.4], ['done', 1.2]],
  at: (k) => (k === 'take' || k === 'fill' || k === 'done' ? st(0.02, 0.58, PI) : st(0.1, 0.86, 0.5)),
  key(k, u, c) {
    const mouth: V = c.bd(-0.01, 0.9 * c.H, 0.11);
    const chest: V = c.bd(-0.08, 0.66 * c.H, 0.22);
    const n: Record<string, number> = { tea: k === 'fill' ? sm(u, 0.15, 0.85) : k === 'done' ? 0.2 : k === 'sip' || k === 'rest' ? 1 - 0.3 * c.p('sip') : k === 'sip2' ? 0.7 - 0.4 * u : 0, pour: k === 'fill' && u > 0.15 && u < 0.85 ? 1 : 0, tilt: 0, steam: 0 };
    const relax = { l: leftRest(c) };
    switch (k) {
      case 'take': {
        const p = lerpV(UR.stack, add(UR.stack, -0.04, 0.05, 0.08), sm(u, 0.5, 1));
        return { ...relax, tool: u > 0.45 ? 'cup' : undefined, r: u <= 0.45 ? p : undefined, gr: 0.6, nod: 0.36, lean: 0.14, n, props: { cup: p } };
      }
      case 'fill':
        return { tool: 'cup', l: add(UR.tap, 0, 0.03 - 0.02 * sm(u, 0.1, 0.2) + 0.02 * sm(u, 0.85, 0.95), 0.03), gl: 0.6, nod: 0.36, lean: 0.14, n, props: { cup: UR.under } };
      case 'sip':
      case 'sip2': {
        const up = sm(u, 0, 0.35) * (1 - sm(u, 0.72, 1));
        n.tilt = up;
        return { ...relax, tool: 'cup', nod: 0.1 - 0.24 * up, n, props: { cup: lerpV(chest, mouth, up) } };
      }
      case 'rest':
        n.steam = 1;
        return { l: add(chest, 0.08, -0.03, 0.02), gl: 0.5, tool: 'cup', nod: 0.2, n, props: { cup: chest } };
      default: {
        const p = lerpV(chest, UR.bin, sm(u, 0.1, 0.9));
        return { ...relax, tool: 'cup', nod: 0.28, lean: 0.1, n, props: { cup: p } };
      }
    }
  },
};

const SCRIPTS: Record<SnMotion, Script> = { snLoad: LOAD, snGate: GATE, snPlan: PLAN, snSort: SORT, snAssay: ASSAY, snSweep: SWEEP, snTongs: TONGS, snSand: SAND, snGear: GEAR, snBoard: BOARD, snBags: BAGS, snBulk: BULK, snTea: TEA };
