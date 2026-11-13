import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A labourer's day at the 조경 공사 현장 (2026-11-01, the workplace pipeline, at the user's request). Each motion
 * is a round of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by the
 * same clock (manualLabor.ts), so the soil the shovel lifts is the soil that lands on the heap.
 *
 * - mlBed (화단): crouched at the edge, weeds pulled and dropped in a pail, the soil loosened, then watered.
 * - mlPrune (화단): secateurs along a shrub, a branch held and cut, the cuttings gathered.
 * - mlShrub (화단): a hole dug with the spade, the shrub out of its pot and set in, firmed, watered.
 * - mlPlan (화단): stood with a clipboard, looked over, pointed along the bed, ticked.
 * - mlMow (잔디 깎는 기계): the cord pulled, two strips walked behind it, each going paler, the grass box tipped.
 * - mlHaul (외바퀴 수레): soil shovelled from a heap, the handles lifted, wheeled over, tipped, wheeled back.
 * - mlBricks (자재 더미): mortar on the trowel, a brick off the pallet, buttered, set, tapped; a level laid along.
 * - mlCover (자재 더미): the tarp pulled across from one end, its corners tied, sandbags on it, rain coming.
 * - mlAssign (자재 더미): two of the crew called over and sent off, one each way, off the clipboard.
 * - mlPave (포장 구역): the sand screeded, block after block off the stack, set to the string, tapped with a mallet.
 * - mlTree (묘목 야적장): a pit dug, a root ball rocked over by its trunk, plumbed, backfilled, staked, watered.
 * - mlDig (소형 굴착기): up into the cab, the levers worked, the bucket filling and swung aside; out to measure.
 * - mlStake (측량 말뚝): two stakes driven, the line pulled taut, the level read against a helper's staff.
 * - mlTalk (안전 게시판): the morning's talk, the items pointed at and ticked, everyone's hand up for the chant.
 * - mlLog (현장 사무소): the drawing unrolled on the shelf, the day's log written and stamped, the date card turned.
 * - mlTools (공구 보관함): the cage opened, a shovel down, looked over, its edge filed, wiped, hung back, ticked.
 * - mlGravel (골재 더미): gravel thrown at the screen, the fines raked out from under it.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x.
 */
export type MlMotion = 'mlBed' | 'mlPrune' | 'mlShrub' | 'mlPlan' | 'mlMow' | 'mlHaul' | 'mlBricks' | 'mlCover' | 'mlAssign' | 'mlPave' | 'mlTree' | 'mlDig' | 'mlStake' | 'mlTalk' | 'mlLog' | 'mlTools' | 'mlGravel';
export const ML_MOTIONS = new Set<string>(['mlBed', 'mlPrune', 'mlShrub', 'mlPlan', 'mlMow', 'mlHaul', 'mlBricks', 'mlCover', 'mlAssign', 'mlPave', 'mlTree', 'mlDig', 'mlStake', 'mlTalk', 'mlLog', 'mlTools', 'mlGravel']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const mlPhase = (p: THREE.Vector3) => frac(p.x * 0.419 + p.z * 0.637);
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------
// The script engine.

type Seq = Array<[string, number, number?]>;
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
  floor?: number;
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
  tap?: boolean;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface MlNow {
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
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = {
    t,
    H,
    st: here,
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function mlNow(m: MlMotion, t: number, ph: number, H = 1.6): MlNow {
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
export function mlPose(m: MlMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = mlNow(m, t, mlPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  let pose: BodyPose;
  if (s.sit) pose = { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y };
  else if (N.walking) pose = { kind: 'walk', at, yaw };
  else pose = { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: !s.sit && k.crouch ? k.crouch : undefined,
    },
  };
}
const scrub = (a: V, t: number, w = 0.07, d = 0.05): V => [a[0] + w * Math.sin(t * 7), a[1], a[2] + d * Math.cos(t * 7)];

// ---------------------------------------------------------------------------------------------
// The shovel: the top hand on its grip, the other down the shaft. The piece lays it from one point to the other.

function shovel(grip: V, blade: V): Key {
  return { r: grip, l: lerpV(grip, blade, 0.42), gr: 0.95, gl: 0.9, palms: 0.2, props: { shG: grip, shB: blade } };
}
/** Rounds of digging from `pit` and throwing at `toss`, `u` over them all. */
function dig(c: Ctx, u: number, rounds: number, pit: V, toss: V, lean = 0.26): { k: Key; f: number; round: number } {
  const x = u * rounds;
  const round = Math.min(rounds - 1, Math.floor(x));
  const f = x - round;
  const high = add(pit, 0.02, 0.34, 0.04);
  const lifted = add(pit, 0, 0.42, 0.08);
  const over = add(toss, 0, 0.22, 0);
  const G0 = c.bd(-0.1, 1.06, 0.2);
  const G1 = c.bd(-0.08, 0.86, 0.26);
  const G2 = c.bd(0.03, 1.02, 0.26);
  let blade: V;
  let grip: V;
  let load = false;
  if (f < 0.3) {
    const e = sm(f, 0, 0.3);
    blade = lerpV(high, pit, e);
    grip = lerpV(G0, G1, e);
  } else if (f < 0.55) {
    const e = sm(f, 0.3, 0.55);
    blade = lerpV(pit, lifted, e);
    grip = lerpV(G1, G0, e);
    load = e > 0.15;
  } else if (f < 0.8) {
    const e = sm(f, 0.55, 0.8);
    blade = lerpV(lifted, over, e);
    grip = lerpV(G0, G2, e);
    load = e < 0.86;
  } else {
    const e = sm(f, 0.8, 1);
    blade = lerpV(over, high, e);
    grip = lerpV(G2, G0, e);
  }
  const k = shovel(grip, blade);
  k.props = { ...k.props, load: load ? blade : null };
  return { k: { ...k, lean, nod: 0.42 }, f, round };
}
function merge(k: Key, more: Key): Key {
  return { ...k, ...more, props: { ...k.props, ...more.props }, n: { ...k.n, ...more.n } };
}

// =============================================================================================
// 화단 (gardenBed, 2 × 1): soil in a raised edging; shrubs at each end, flowers between. Also the greenhouse's.

export const BD = {
  top: 0.27,
  stand: 0.74,
  shrubA: [-0.56, 0.27, -0.04] as V,
  shrubB: [0.56, 0.27, -0.04] as V,
  weeds: [[-0.22, 0.2], [0.05, 0.28], [0.26, 0.17]] as ReadonlyArray<readonly [number, number]>,
  hole: [0.02, 0.27, 0.14] as V,
  pail: [-0.62, 0, 0.72] as V,
  can: [0.72, 0, 0.72] as V,
  pot: [-0.3, 0, 0.74] as V,
};
const BED_SEQ: Seq = [['look', 1.2], ['down', 0.8], ['weed', 4.5], ['pail', 1.0], ['loosen', 3.4], ['up', 0.6], ['can', 0.9], ['water', 4.6], ['set', 0.9]];
const BED: Script = {
  seq: BED_SEQ,
  at: (k) => (k === 'look' || k === 'up' ? st(0, BD.stand + 0.04) : k === 'pail' ? st(-0.26, BD.stand) : k === 'can' || k === 'water' || k === 'set' ? st(0.32, BD.stand + 0.02) : st(0, BD.stand - 0.04)),
  key(k, u, c): Key {
    const n = { weeds: Math.round(c.p('weed') * 3), held: 0, wet: c.p('water', 0.1, 0.9), turned: c.p('loosen'), pour: 0, inPail: c.p('pail', 0.5, 0.7) };
    const edge = (x: number): V => [x, BD.top + 0.02, 0.36];
    switch (k) {
      case 'look':
        return { nod: 0.42, l: c.bd(0.22, 0.86, 0.04), r: c.bd(-0.22, 0.86, 0.04), n };
      case 'down':
        return { crouch: 0.85, nod: 0.5, lean: 0.25, l: edge(-0.18), r: edge(0.18), n };
      case 'weed': {
        // Three weeds, each worked loose and pulled up in the right, gathered in the left.
        const x = u * 3;
        const i = Math.min(2, Math.floor(x));
        const f = x - i;
        const [wx, wz] = BD.weeds[i];
        const up = sm(f, 0.45, 0.8);
        const w: V = [wx + 0.012 * Math.sin(c.t * 22) * (f < 0.45 ? 1 : 0), BD.top + 0.03 + up * 0.2, wz];
        return { crouch: 0.9, nod: 0.58, lean: 0.34, gr: 0.85, gl: 0.7, r: w, l: edge(-0.3), props: { weed: f > 0.4 ? w : null }, n };
      }
      case 'pail':
        return { crouch: 0.55, nod: 0.45, lean: 0.2, r: add(BD.pail, 0.03, 0.34 - 0.06 * Math.sin(u * PI), 0), gr: u < 0.55 ? 0.8 : 0.3, n };
      case 'loosen': {
        // The hand fork worked along the row, tine by tine.
        const dx = -0.32 + 0.64 * u;
        const tip: V = [dx, BD.top + 0.04 + 0.05 * Math.abs(Math.sin(c.t * 5)), 0.2 + 0.05 * Math.cos(c.t * 2.5)];
        return { crouch: 0.9, nod: 0.58, lean: 0.34, r: add(tip, 0.02, 0.08, 0.04), l: edge(-0.42), gr: 0.95, props: { fork: tip }, n };
      }
      case 'up':
        return { nod: 0.2, l: c.bd(0.22, 0.86, 0.04), r: c.bd(-0.22, 0.86, 0.04), n };
      case 'can': {
        const y = lerpV(BD.can, [0.5, 0.86, 0.5], sm(u, 0.25, 1));
        return { crouch: u < 0.4 ? 0.7 : 0, r: add(y, 0.02, 0.28, 0), gr: 0.95, nod: 0.35, props: { can: y }, n };
      }
      case 'water': {
        const y: V = [0.42 - 0.72 * Math.abs(frac(u * 1.5) * 2 - 1), 0.9, 0.42];
        return { r: add(y, 0.02, 0.28, 0), gr: 0.95, nod: 0.4, lean: 0.08, props: { can: y }, n: { ...n, pour: sm(u, 0.02, 0.1) - sm(u, 0.93, 0.99), canTip: 1 } };
      }
      case 'set': {
        const y = lerpV([0.5, 0.86, 0.5], BD.can, sm(u, 0, 0.75));
        return { crouch: u > 0.5 ? 0.7 : 0, r: add(y, 0.02, 0.28, 0), gr: 0.95, nod: 0.35, props: { can: y }, n };
      }
      default:
        return { n };
    }
  },
};

const PRUNE_SEQ: Seq = [['look', 1.3], ['cut1', 2.4], ['cut2', 2.4, 1.2], ['walk', 0.1, 0.4], ['cut3', 2.4], ['cut4', 2.4], ['gather', 2.4], ['back', 0.8]];
const SNIPS: Record<string, V> = { cut1: add(BD.shrubB, -0.14, 0.42, 0.16), cut2: add(BD.shrubB, 0.14, 0.5, 0.16), cut3: add(BD.shrubA, -0.14, 0.46, 0.16), cut4: add(BD.shrubA, 0.14, 0.4, 0.16) };
const PRUNE: Script = {
  seq: PRUNE_SEQ,
  at: (k) => (k === 'cut1' || k === 'cut2' || k === 'look' ? st(BD.shrubB[0], BD.stand) : k === 'gather' || k === 'back' ? st(0, BD.stand - 0.02) : st(BD.shrubA[0], BD.stand)),
  key(k, u, c): Key {
    const cut = (name: string) => c.p(name, 0.5, 0.56);
    const n = { b1: cut('cut1'), b2: cut('cut2'), b3: cut('cut3'), b4: cut('cut4'), snip: 0, gone: c.p('gather', 0.2, 0.9) };
    const sn = SNIPS[k];
    if (sn) {
      // Reached in, the branch steadied in the left, two bites and it's off.
      const r = add(sn, 0.02 * Math.sin(c.t * 2), 0, 0.02);
      const bite = Math.abs(Math.sin(u * PI * 5));
      return { r, l: add(sn, -0.14, 0.1, 0.02), gr: 0.95, gl: 0.8, nod: 0.25, lean: 0.14, props: { snips: r }, n: { ...n, snip: bite } };
    }
    if (k === 'gather') {
      const x = -0.5 + u;
      return { crouch: 0.9, nod: 0.55, lean: 0.35, r: [x + 0.1, BD.top - 0.02, 0.45], l: [x - 0.1, BD.top - 0.02, 0.45], gr: 0.7, gl: 0.7, n };
    }
    if (k === 'look') return { nod: 0.08, r: add(BD.shrubB, 0.0, 0.3, 0.3), gr: 0.8, props: { snips: add(BD.shrubB, 0.0, 0.3, 0.3) }, n };
    return { nod: 0.2, n };
  },
};

const SHRUB_SEQ: Seq = [['look', 1.1], ['dig', 5.2], ['stow', 0.7], ['tip', 1.6], ['lift', 1.3], ['fill', 2.2], ['firm', 2.0], ['can', 0.8], ['water', 3.2], ['set', 0.8]];
const SHRUB: Script = {
  seq: SHRUB_SEQ,
  at: (k) => (k === 'tip' ? st(-0.12, BD.stand + 0.12) : k === 'can' || k === 'water' || k === 'set' ? st(0.32, BD.stand) : st(BD.hole[0] - 0.04, BD.stand)),
  key(k, u, c): Key {
    const n = { hole: c.p('dig', 0, 0.8) - c.p('fill', 0, 0.9), spoil: c.p('dig', 0, 0.8) - c.p('fill', 0, 0.9), planted: c.p('lift', 0.75, 0.85), pour: 0, potFull: 1 - c.p('tip', 0.4, 0.7), wet: c.p('water', 0.1, 0.9) };
    const near: V = add(BD.hole, 0.3, 0.02, 0.1);
    switch (k) {
      case 'look':
        return merge(shovel(c.bd(-0.2, 1.04, 0.16), [BD.hole[0] + 0.1, BD.top + 0.1, 0.4]), { nod: 0.4, n });
      case 'dig':
        return merge(dig(c, u, 3, BD.hole, near, 0.24).k, { crouch: 0.2, n });
      case 'stow':
        return merge(shovel(c.bd(-0.3, 1.0, 0.1), [0.46, 0.03, 0.72]), { nod: 0.1, n });
      case 'tip': {
        const y: V = [BD.pot[0], 0.03 + 0.18 * sm(u, 0.1, 0.5), BD.pot[2]];
        return { crouch: 0.85, nod: 0.5, lean: 0.3, l: add(y, -0.1, 0.1, 0), r: add(y, 0.1, 0.1, 0), gr: 0.8, gl: 0.8, props: { pot: y }, n: { ...n, potRot: sm(u, 0.2, 0.55) } };
      }
      case 'lift': {
        const from: V = [BD.pot[0] + 0.05, 0.3, BD.pot[2] - 0.04];
        const y = lerpV(from, add(BD.hole, 0, 0.0, 0), sm(u, 0, 0.8));
        return { crouch: 0.7, nod: 0.5, lean: 0.3, l: add(y, -0.1, 0.1, 0.03), r: add(y, 0.1, 0.1, 0.03), gr: 0.8, gl: 0.8, props: { shrub: y, pot: [BD.pot[0], 0.1, BD.pot[2]] }, n: { ...n, potRot: 1 } };
      }
      case 'fill':
        return { crouch: 0.9, nod: 0.55, lean: 0.35, l: scrub(add(BD.hole, -0.14, 0.03, 0.04), c.t, 0.05, 0.03), r: scrub(add(BD.hole, 0.14, 0.03, 0.04), c.t + 1.4, 0.05, 0.03), gl: 0.2, gr: 0.2, props: { pot: [BD.pot[0], 0.1, BD.pot[2]] }, n: { ...n, potRot: 1 } };
      case 'firm': {
        // Heels of the hands pressed in around the stem.
        const d = 0.025 * Math.abs(Math.sin(c.t * 4));
        return { crouch: 0.9, nod: 0.58, lean: 0.38, l: add(BD.hole, -0.1, 0.05 + d, 0.05), r: add(BD.hole, 0.1, 0.05 + d, 0.05), gl: 0.1, gr: 0.1, palms: 1, props: { pot: [BD.pot[0], 0.1, BD.pot[2]] }, n: { ...n, potRot: 1 } };
      }
      case 'can': {
        const y = lerpV(BD.can, [0.32, 0.86, 0.48], sm(u, 0.2, 1));
        return { crouch: u < 0.4 ? 0.7 : 0, r: add(y, 0.02, 0.28, 0), gr: 0.95, nod: 0.3, props: { can: y, pot: [BD.pot[0], 0.1, BD.pot[2]] }, n: { ...n, potRot: 1 } };
      }
      case 'water': {
        const y: V = [0.3 + 0.05 * Math.sin(c.t * 1.4), 0.88, 0.42];
        return { r: add(y, 0.02, 0.28, 0), gr: 0.95, nod: 0.4, lean: 0.08, props: { can: y, pot: [BD.pot[0], 0.1, BD.pot[2]] }, n: { ...n, pour: sm(u, 0.03, 0.12) - sm(u, 0.92, 0.99), canTip: 1, potRot: 1 } };
      }
      case 'set': {
        const y = lerpV([0.32, 0.86, 0.48], BD.can, sm(u, 0, 0.8));
        return { crouch: u > 0.5 ? 0.7 : 0, r: add(y, 0.02, 0.28, 0), gr: 0.95, nod: 0.3, props: { can: y, pot: [BD.pot[0], 0.1, BD.pot[2]] }, n: { ...n, potRot: 1 } };
      }
      default:
        return { n };
    }
  },
};

const PLAN_SEQ: Seq = [['read', 2.2], ['pointL', 2.0], ['pointR', 2.0], ['write', 2.6, 1.4], ['pace', 0.2, 0.4], ['check', 2.4, 1.4], ['back', 0.4]];
const PLAN: Script = {
  seq: PLAN_SEQ,
  at: (k) => (k === 'pace' || k === 'check' ? st(0.5, BD.stand + 0.04) : st(-0.2, BD.stand + 0.04)),
  key(k, _u, c): Key {
    const board = c.bd(0.14, 1.02, 0.24);
    const paper = { board };
    const hold: V = add(board, 0.02, -0.03, 0);
    switch (k) {
      case 'pointL':
        return { l: hold, gl: 0.8, r: c.bd(-0.16, 1.15, 0.5), gr: 0.1, nod: 0.05, props: paper };
      case 'pointR':
        return { l: hold, gl: 0.8, r: [0.72, 0.98, 0.3], gr: 0.1, nod: 0.18, props: paper };
      case 'write':
      case 'check':
        return { l: hold, gl: 0.8, r: scrub(add(board, -0.04, 0.01, 0.02), c.t, 0.03, 0.012), gr: 0.8, nod: 0.5, props: paper };
      default:
        return { l: hold, gl: 0.8, r: c.bd(-0.2, 0.92, 0.1), nod: 0.4, props: paper };
    }
  },
};

// =============================================================================================
// 잔디 깎는 기계 (lawnMower, 1 × 1): walked up and down a strip either side of it, its handle towards the dweller.

export const MW = { handle: 0.7, lane1: 0.25, lane2: 0.95, reach: 1.45 };
const MOW_SEQ: Seq = [['pull', 2.0, 1.2], ['go1', 0.2, 5.4], ['end1', 0.3, 1.5], ['turn', 0.3, 5.4], ['end2', 0.3, 0.8], ['bag', 2.2, 1.8], ['park', 0.6]];
function mowKey(c: Ctx, more: Record<string, number>): Key {
  const yaw = c.st.yaw;
  const body: V = [c.st.x, 0, c.st.z];
  const fwd: V = [Math.sin(yaw), 0, Math.cos(yaw)];
  const m = add(body, fwd[0] * MW.handle, 0, fwd[2] * MW.handle);
  const shake = 0.006 * Math.sin(c.t * 40);
  return { l: c.bd(0.2, 0.94 + shake, 0.3), r: c.bd(-0.2, 0.94 + shake, 0.3), gl: 0.95, gr: 0.95, nod: 0.18, lean: 0.08, props: { mower: m }, n: { ...more, my: yaw + PI } };
}
const MOW: Script = {
  seq: MOW_SEQ,
  at: (k) => {
    switch (k) {
      case 'go1':
        return st(MW.reach - MW.handle, MW.lane1, -PI / 2);
      case 'end1':
        return st(-MW.reach + MW.handle, MW.lane1, -PI / 2);
      case 'turn':
        return st(-MW.reach - 0.1, MW.lane2, PI / 2);
      case 'end2':
        return st(MW.reach - MW.handle, MW.lane2, PI / 2);
      case 'bag':
        return st(MW.reach - MW.handle - 0.2, MW.lane2 - 0.05, PI / 2);
      default:
        return st(0, MW.handle, PI);
    }
  },
  key(k, u, c): Key {
    const n = { s1: k === 'pull' || k === 'go1' ? 0 : 1, s2: k === 'end2' || k === 'bag' || k === 'park' ? 1 : 0, run: k === 'pull' ? sm(u, 0.7, 0.8) : k === 'bag' || k === 'park' ? 0 : 1, box: k === 'bag' ? Math.sin(u * PI) : 0 };
    if (k === 'pull') {
      // The cord drawn with a jerk from the top of the engine, the other hand on the bar.
      const jerk = Math.max(0, Math.sin(u * PI * 2.5));
      return { l: [0.18, 0.94, 0.4], gl: 0.9, r: [-0.05 - 0.05 * jerk, 0.5 + 0.28 * jerk, 0.22 + 0.2 * jerk], gr: 0.95, crouch: 0.22, lean: 0.2, nod: 0.4, props: { mower: [0, 0, 0] }, n: { ...n, my: 0, cord: jerk } };
    }
    if (k === 'bag') {
      const b: V = add([c.st.x, 0, c.st.z], 0.3, 0.42, 0.38);
      return { l: add(b, -0.12, 0.08, 0), r: add(b, 0.12, 0.08, 0), gl: 0.9, gr: 0.9, crouch: 0.5, nod: 0.4, lean: 0.2, props: { mower: add([c.st.x, 0, c.st.z], MW.handle + 0.2, 0, 0.05), catcher: b }, n: { ...n, my: c.st.yaw + PI } };
    }
    if (k === 'park') return { l: [0.2, 0.94, 0.4], r: [-0.2, 0.94, 0.4], gl: 0.95, gr: 0.95, nod: 0.15, props: { mower: [0, 0, 0] }, n: { ...n, my: 0 } };
    return mowKey(c, n);
  },
};

// =============================================================================================
// 외바퀴 수레 (wheelbarrow, 1 × 1): from a little heap on its left over to a spot two tiles to its right.

export const WB = { heap: [-0.92, 0.05, 0.3] as V, tray: [0, 0.48, 0.14] as V, wheelTo: 1, dumpAt: [2.55, 0, 0.62] as V, home: [0, 0, -0.32] as V };
const HAUL_SEQ: Seq = [['dig', 7.2], ['stow', 0.6], ['lift', 0.9, 1.3], ['turn', 0.2, 2.8], ['drop', 0.2], ['tip', 2.2], ['level', 0.8, 2.6], ['back', 0.2, 0.9], ['rest', 1.2]];
const HAUL: Script = {
  seq: HAUL_SEQ,
  at: (k) => {
    switch (k) {
      case 'dig':
      case 'stow':
        return st(-0.42, 0.72, -PI * 0.86);
      case 'turn':
        return st(-0.55, 0.62, PI / 2);
      case 'drop':
      case 'tip':
      case 'level':
        return st(1.3, 0.62, PI / 2);
      case 'back':
        return st(0.05, 0.62, -PI / 2);
      default:
        return st(0, 0.68, PI);
    }
  },
  key(k, u, c): Key {
    const load = c.p('dig') - c.p('tip', 0.1, 0.65);
    const n = { load, heap: 1 - 0.55 * c.p('dig') + 0.55 * c.p('rest', 0.8, 1), dumped: c.p('tip', 0.1, 0.7) - c.p('rest', 0.8, 1), tip: k === 'tip' ? sm(u, 0.05, 0.3) - sm(u, 0.82, 1) : 0, tilt: 0, by: 0 };
    const handles = (tilt: number, wheel: V, by: number, tip = 0): Key => ({
      l: c.bd(0.24, 0.76 + tip * 0.32 - (1 - tilt) * 0.16, 0.16),
      r: c.bd(-0.24, 0.76 + tip * 0.32 - (1 - tilt) * 0.16, 0.16),
      gl: 0.95,
      gr: 0.95,
      nod: 0.18,
      lean: 0.06 + (1 - tilt) * 0.2,
      crouch: (1 - tilt) * 0.3,
      props: { barrow: wheel },
      n: { ...n, tilt, by },
    });
    const ahead = (d = WB.wheelTo): V => [c.st.x + Math.sin(c.st.yaw) * d, 0, c.st.z + Math.cos(c.st.yaw) * d];
    switch (k) {
      case 'dig': {
        const dg = dig(c, u, 4, WB.heap, WB.tray, 0.24);
        return merge(dg.k, { props: { barrow: WB.home }, n: { ...n, load: (dg.round + sm(dg.f, 0.7, 0.8)) / 4 } });
      }
      case 'stow':
        return merge(shovel(c.bd(-0.34, 0.96, 0.1), [-0.82, 0.03, 0.05]), { props: { barrow: WB.home }, n });
      case 'lift':
        return handles(sm(u, 0.2, 0.9), WB.home, 0);
      case 'turn':
        return handles(1, ahead(), -PI / 2);
      case 'drop':
      case 'level':
        return handles(1, ahead(), -PI / 2);
      case 'tip':
        return handles(1, ahead(), -PI / 2, n.tip);
      case 'back':
        return handles(1, ahead(), PI / 2);
      default:
        return handles(1 - sm(u, 0.2, 0.9), WB.home, 0);
    }
  },
};

// =============================================================================================
// 자재 더미 (materialPile, 2 × 1): pallets of cement bags and bricks at the back, a low wall going up in front.

export const PL = {
  stack: [0.56, 0.62, -0.14] as V,
  tub: [-0.86, 0.1, 0.32] as V,
  wallZ: 0.3,
  wallY: 0.1,
  course: 0.075,
  slots: [-0.42, -0.2, 0.02, 0.24] as const,
};
const BRICKS_SEQ: Seq = [['mix', 2.2], ['walk', 0.3, 1.0], ...[0, 1, 2, 3].flatMap((i): Seq => [[`pick${i}`, 0.9, 0.9], [`mud${i}`, 0.7, 0.7], [`set${i}`, 1.7, 0.7]]), ['level', 2.4], ['point', 2.6], ['back', 0.5, 1.0]];
const BRICKS: Script = {
  seq: BRICKS_SEQ,
  at: (k) => {
    if (k === 'mix' || k === 'walk' || k === 'back') return st(-0.72, 0.76);
    if (k.startsWith('pick')) return st(0.42, 0.5, PI * 1.04);
    if (k.startsWith('mud')) return st(-0.5, 0.76);
    if (k.startsWith('set')) return st(PL.slots[Number(k[3])], 0.84);
    return st(-0.08, 0.86);
  },
  key(k, u, c): Key {
    const laid = c.p('set0', 0.35, 0.4) + c.p('set1', 0.35, 0.4) + c.p('set2', 0.35, 0.4) + c.p('set3', 0.35, 0.4);
    const n = { laid, mud: 0, wet: 0.5 + c.p('mix') * 0.5 };
    const tub = PL.tub;
    const trowelR = (r: V, more: Key = {}): Key => ({ r, gr: 0.95, props: { trowel: r, ...more.props }, ...more, n: { ...n, ...more.n } });
    if (k === 'mix') {
      const r = scrub(add(tub, 0, 0.08, 0), c.t, 0.09, 0.06);
      return trowelR(r, { crouch: 0.7, nod: 0.5, lean: 0.28, l: c.bd(0.25, 0.5, 0.2), n: { mixing: 1 } });
    }
    if (k === 'walk' || k === 'back') return trowelR(c.bd(-0.24, 0.86, 0.12), { nod: 0.1 });
    if (k.startsWith('pick')) {
      const top = add(PL.stack, 0, 0.0, 0.02);
      return trowelR(c.bd(-0.3, 0.88, 0.05), { l: top, gl: 0.9, nod: 0.3, lean: 0.24, props: { brick: u > 0.55 ? top : null } });
    }
    if (k.startsWith('mud')) {
      // The brick on its edge in the left, mortar buttered on its end.
      const b = c.bd(0.1, 0.98, 0.28);
      const swipe = add(b, -0.1 + 0.1 * Math.sin(c.t * 8), 0.04, 0.02);
      return trowelR(swipe, { l: add(b, 0.02, -0.03, 0), gl: 0.9, nod: 0.45, props: { brick: b }, n: { mud: 1 } });
    }
    if (k.startsWith('set')) {
      const i = Number(k[3]);
      const slot: V = [PL.slots[i], PL.wallY + PL.course * 2 + 0.05 + 0.08 * (1 - sm(u, 0.05, 0.4)), PL.wallZ];
      const tapping = u > 0.4;
      const tap = 0.06 * Math.abs(Math.sin(c.t * 9));
      return trowelR(tapping ? add(slot, 0.05, 0.09 + tap, 0.03) : c.bd(-0.3, 0.5, 0.12), { l: u < 0.42 ? add(slot, -0.02, 0.05, 0.02) : c.bd(0.3, 0.38, 0.12), gl: 0.9, crouch: 0.8, nod: 0.55, lean: 0.34, props: { brick: u < 0.4 ? slot : null } });
    }
    if (k === 'level') {
      const y: V = [-0.09, PL.wallY + PL.course * 2 + 0.1 + 0.008 * Math.sin(c.t * 3), PL.wallZ];
      return { l: add(y, -0.26, 0.03, 0.02), r: add(y, 0.26, 0.03, 0.02), gl: 0.8, gr: 0.8, crouch: 0.75, nod: 0.6, lean: 0.34, props: { level: y }, n };
    }
    // The joints struck off with the trowel's edge, end to end.
    const x = -0.45 + 0.8 * u;
    return trowelR([x, PL.wallY + PL.course * 2 + 0.03, PL.wallZ + 0.07], { crouch: 0.8, nod: 0.55, lean: 0.3, l: c.bd(0.28, 0.4, 0.14) });
  },
};

const COVER_SEQ: Seq = [['grab', 1.2, 3.4], ['pull', 0.2, 0.9], ['tie1', 2.0, 0.9], ['bag1', 1.6, 1.2], ['tie2', 2.0, 0.8], ['bag2', 1.6, 1.0], ['check', 1.4, 1.8], ['roll', 0.8, 1.0]];
const COVER: Script = {
  seq: COVER_SEQ,
  at: (k) => (k === 'grab' || k === 'roll' ? st(-0.88, 0.8) : k === 'pull' ? st(0.84, 0.8, PI / 2) : k === 'tie1' ? st(0.84, 0.72) : k === 'bag1' ? st(0.3, 0.74) : k === 'tie2' ? st(-0.84, 0.72) : k === 'bag2' ? st(-0.28, 0.74) : st(0.1, 0.72)),
  key(k, u, c): Key {
    const tarp = k === 'grab' ? 0 : 1;
    const n = { tarp, rain: 0.35 + 0.65 * c.p('pull', 0, 1), knots: c.p('tie1', 0.8, 0.9) + c.p('tie2', 0.8, 0.9), bags: c.p('bag1', 0.5, 0.6) + c.p('bag2', 0.5, 0.6) };
    switch (k) {
      case 'grab':
        return { l: [-0.9, 0.72, 0.3], r: [-0.68, 0.72, 0.3], gl: 0.9, gr: 0.9, crouch: 0.3, nod: 0.3, lean: 0.14, n };
      case 'pull':
        return { l: c.bd(0.25, 0.8, -0.3), r: c.bd(-0.2, 0.84, -0.26), gl: 0.95, gr: 0.95, lean: 0.2, nod: 0.05, n };
      case 'tie1':
      case 'tie2': {
        const x = k === 'tie1' ? 0.86 : -0.86;
        const w = 0.03 * Math.sin(c.t * 10);
        return { l: [x - 0.05 + w, 0.14, 0.36], r: [x + 0.05 - w, 0.14, 0.36], gl: 0.8, gr: 0.8, crouch: 0.9, nod: 0.6, lean: 0.34, n };
      }
      case 'bag1':
      case 'bag2': {
        const x = k === 'bag1' ? 0.3 : -0.28;
        const y: V = [x, 0.14 + 0.6 * Math.sin(u * PI) * (u < 0.6 ? 1 : 0.6), 0.34 - 0.1 * sm(u, 0.3, 0.6)];
        return { l: add(y, -0.14, 0.05, 0.02), r: add(y, 0.14, 0.05, 0.02), gl: 0.9, gr: 0.9, crouch: u < 0.25 || u > 0.7 ? 0.7 : 0.15, nod: 0.45, lean: 0.25, props: { sandbag: u < 0.58 ? y : null }, n };
      }
      case 'check':
        return { r: [0.2, 0.74, 0.3], l: c.bd(0.22, 0.86, 0.05), nod: 0.25, gr: 0.3, palms: 1, n };
      default:
        return { nod: 0.05, n };
    }
  },
};

const ASSIGN_SEQ: Seq = [['read', 2.0], ['call', 1.6], ['one', 2.6], ['two', 2.6], ['send', 1.8], ['write', 2.4], ['away', 1.2]];
const ASSIGN: Script = {
  seq: ASSIGN_SEQ,
  at: () => st(0, 0.62, 0),
  key(k, u, c): Key {
    const board = c.bd(0.14, 1.03, 0.24);
    const hold = add(board, 0.02, -0.03, 0);
    const n = { a: c.p('call', 0, 0.8) - c.p('away', 0, 1), b: c.p('call', 0.1, 0.9) - c.p('away', 0, 1), aNod: 0, bNod: 0, tick: 0 };
    const base: Key = { l: hold, gl: 0.8, props: { board }, nod: 0.05, n };
    switch (k) {
      case 'read':
        return merge(base, { r: c.bd(-0.2, 0.92, 0.1), nod: 0.42 });
      case 'call':
        return merge(base, { r: c.bd(-0.24, 1.62, 0.08 + 0.05 * Math.sin(c.t * 7)), gr: 0.1, nod: 0 });
      case 'one':
        return merge(base, { r: c.bd(0.5, 1.25, 0.46), gr: 0.1, n: { aNod: Math.max(0, Math.sin(u * PI * 3)) } });
      case 'two':
        return merge(base, { r: c.bd(-0.5, 1.25, 0.46), gr: 0.1, n: { bNod: Math.max(0, Math.sin(u * PI * 3)) } });
      case 'send':
        return merge(base, { r: c.bd(-0.3, 1.1 + 0.08 * Math.sin(c.t * 5), 0.42), gr: 0.1 });
      case 'write':
        return merge(base, { r: scrub(add(board, -0.04, 0.01, 0.02), c.t, 0.03, 0.012), gr: 0.8, nod: 0.5 });
      default:
        return merge(base, { r: c.bd(-0.2, 0.9, 0.1), nod: 0.2 });
    }
  },
};

// =============================================================================================
// 포장 구역 (mlPavingBed, 3 × 2): sand, edging stones down two sides, a line pegged along the row being laid.

export const PV = {
  top: 0.08,
  row: 0.62,
  slots: [-0.98, -0.7, -0.42, -0.14, 0.14, 0.42] as const,
  pile: [1.12, 0.2, 0.42] as V,
  screed: 0.42,
};
const PAVE_SEQ: Seq = [['read', 1.2, 0.9], ['screed', 0.2, 3.0], ['screed2', 0.2, 0.9], ['walk', 0.2, 1.0], ...[0, 1, 2, 3, 4, 5].flatMap((i): Seq => [[`pick${i}`, 0.7, i < 3 ? 1.6 - i * 0.2 : 1.0], [`set${i}`, 1.5, 1.1]]), ['level', 2.2], ['sweep', 3.0], ['back', 0.6, 1.8]];
const PAVE: Script = {
  seq: PAVE_SEQ,
  at: (k) => {
    if (k === 'screed') return st(-1.25, 1.22);
    if (k === 'screed2') return st(0.7, 1.22);
    if (k === 'walk' || k.startsWith('pick')) return st(1.04, 0.92, -PI * 0.96);
    if (k.startsWith('set')) return st(PV.slots[Number(k[3])], 1.22);
    if (k === 'level') return st(-0.3, 1.26);
    return st(-0.3, 1.3);
  },
  key(k, u, c): Key {
    const laid = [0, 1, 2, 3, 4, 5].reduce((a, i) => a + c.p(`set${i}`, 0.25, 0.3), 0);
    const n = { laid, swept: c.p('sweep', 0, 1) };
    const on = (i: number): V => [PV.slots[i], PV.top + 0.03, PV.row];
    switch (true) {
      case k === 'read':
        return { nod: 0.4, l: c.bd(0.22, 0.88, 0.05), r: c.bd(-0.22, 0.88, 0.05), n };
      case k === 'screed' || k === 'screed2':
        // Pulling the straight board across the rails, stooped, walking backwards along it.
        return { l: [c.st.x - 0.22, 0.2, PV.screed + 0.32], r: [c.st.x + 0.22, 0.2, PV.screed + 0.32], gl: 0.95, gr: 0.95, crouch: 0.85, nod: 0.5, lean: 0.36, props: { screedB: [c.st.x, 0.1, PV.screed + 0.26] }, n };
      case k === 'walk':
        return { nod: 0.2, n };
      case k.startsWith('pick'): {
        const b = lerpV(PV.pile, c.bd(0, 0.86, 0.25), sm(u, 0.3, 1));
        return { l: add(b, -0.11, 0.02, 0.02), r: add(b, 0.11, 0.02, 0.02), gl: 0.9, gr: 0.9, crouch: u < 0.5 ? 0.75 : 0, nod: 0.45, lean: 0.25, props: { block: u > 0.2 ? b : null }, n };
      }
      case k.startsWith('set'): {
        const i = Number(k[3]);
        const down = add(on(i), 0, 0.09 * (1 - sm(u, 0, 0.28)), 0);
        if (u < 0.3) return { l: add(down, -0.11, 0.02, 0.02), r: add(down, 0.11, 0.02, 0.02), gl: 0.9, gr: 0.9, crouch: 0.92, nod: 0.6, lean: 0.4, props: { block: down }, n };
        // Then tapped with the rubber mallet, the other hand spread to feel it flush.
        const tap = 0.08 * Math.abs(Math.sin(c.t * 9));
        const m = add(on(i), 0, 0.12 + tap, 0.02);
        return { r: add(m, 0.07, 0.02, 0.1), gr: 0.95, l: add(on(i), -0.2, 0.05, 0.05), gl: 0.1, palms: 1, crouch: 0.92, nod: 0.6, lean: 0.4, props: { mallet: m }, n };
      }
      case k === 'level': {
        const y: V = [-0.28, PV.top + 0.08, PV.row];
        return { l: add(y, -0.28, 0.03, 0.02), r: add(y, 0.28, 0.03, 0.02), gl: 0.8, gr: 0.8, crouch: 0.9, nod: 0.6, lean: 0.38, props: { level: y }, n };
      }
      case k === 'sweep': {
        // A push broom over the joints, the fine sand worked in.
        const head: V = [-0.3 + 0.55 * Math.sin(c.t * 2.2), 0.08, PV.row + 0.05];
        const grip = c.bd(-0.14, 1.04, 0.22);
        return { r: grip, l: lerpV(grip, head, 0.4), gl: 0.9, gr: 0.95, nod: 0.35, lean: 0.14, props: { broomG: grip, broomH: head }, n };
      }
      default:
        return { nod: 0.15, n };
    }
  },
};

// =============================================================================================
// 묘목 야적장 (mlTreeYard, 3 × 1): trees with burlapped root balls; a pit dug at the left end.

export const TR = {
  pit: [-1.02, 0.02, 0.04] as V,
  home: [0.1, 0, 0.0] as V,
  heap: [-0.5, 0.05, 0.3] as V,
  can: [-0.42, 0, 0.72] as V,
  stakes: [[-0.22, -0.13], [0.22, -0.13], [0, 0.24]] as ReadonlyArray<readonly [number, number]>,
};
const TREE_SEQ: Seq = [['eye', 1.1], ['dig', 6.2], ['stow', 0.6, 1.0], ['grab', 0.9], ['roll', 0.2, 4.0], ['lower', 1.3], ['plumb', 1.6], ['back', 0.3, 0.8], ['fill', 5.0], ['tread', 2.0], ['stake', 4.2], ['tie', 2.0], ['can', 0.8, 0.6], ['water', 3.6], ['look', 1.2, 1.2]];
const TREE: Script = {
  seq: TREE_SEQ,
  at: (k) => {
    switch (k) {
      case 'grab':
      case 'roll':
        return st(TR.home[0] + 0.1, 0.52);
      case 'lower':
      case 'plumb':
        return st(TR.pit[0] + 0.1, 0.56);
      case 'can':
      case 'water':
        return st(TR.pit[0] + 0.5, 0.66, -PI * 0.86);
      default:
        return st(TR.pit[0] + 0.28, 0.74, PI * 1.1);
    }
  },
  key(k, u, c): Key {
    const planted = c.p('lower');
    const n = { pit: c.p('dig'), heap: c.p('dig') - c.p('fill'), fill: c.p('fill'), tilt: k === 'roll' ? 0.38 : k === 'grab' ? 0.2 * u : k === 'lower' ? 0.3 * (1 - u) : k === 'plumb' ? 0.08 * Math.sin(u * PI * 3) * (1 - u) : 0, stakes: Math.round(c.p('stake', 0, 0.95) * 3), tied: c.p('tie', 0.2, 0.9), pour: 0, wet: c.p('water'), moved: c.p('roll') };
    const seat: V = [TR.pit[0], -0.12 * planted, TR.pit[2]];
    const tree: V = k === 'grab' || k === 'roll' ? TR.home : seat;
    const P = { tree };
    const trunk = (h: V): { l: V; r: V } => ({ l: add(h, -0.09, 0.9, 0.09), r: add(h, 0.09, 0.9, 0.09) });
    switch (k) {
      case 'eye':
        return merge(shovel(c.bd(-0.2, 1.04, 0.16), add(TR.pit, 0.1, 0, 0.1)), { nod: 0.4, props: P, n });
      case 'dig':
        return merge(dig(c, u, 5, TR.pit, TR.heap, 0.26).k, { props: P, n });
      case 'stow':
        return merge(shovel(c.bd(-0.3, 1.0, 0.1), [TR.pit[0] + 0.78, 0.03, 0.72]), { nod: 0.15, props: P, n });
      case 'grab':
      case 'roll':
      case 'lower':
      case 'plumb': {
        const h = k === 'lower' ? add(TR.pit, 0, -0.12 * u, 0) : tree;
        return { ...trunk(h), gl: 0.92, gr: 0.92, crouch: k === 'lower' ? 0.2 : 0, lean: 0.12, nod: k === 'plumb' ? 0 : 0.18, props: { tree: h }, n };
      }
      case 'back':
        return merge(shovel(c.bd(-0.2, 1.04, 0.16), [TR.pit[0] + 0.5, 0.03, 0.44]), { nod: 0.2, props: P, n });
      case 'fill':
        return merge(dig(c, u, 4, TR.heap, add(TR.pit, 0.08, 0.05, 0.06), 0.22).k, { props: P, n });
      case 'tread': {
        return { nod: 0.42, lean: 0.14, crouch: 0.22 + 0.2 * Math.abs(Math.sin(c.t * 5)), l: c.bd(0.3, 0.74, 0.12), r: c.bd(-0.3, 0.74, 0.12), props: P, n };
      }
      case 'stake': {
        // Each stake stood and driven in with a mallet, one after another.
        const x = u * 3;
        const i = Math.min(2, Math.floor(x));
        const f = x - i;
        const [sx, sz] = TR.stakes[i];
        const top: V = [TR.pit[0] + sx, 1.0, TR.pit[2] + sz];
        const blow = Math.abs(Math.sin(c.t * 6));
        const m = add(top, 0.04, 0.09 + 0.12 * blow, 0.06);
        return { r: add(m, 0.03, 0.02, 0.16), gr: 0.95, l: add(top, 0, -0.14, 0.04), gl: 0.9, nod: 0.05, lean: 0.1, props: { ...P, mallet: m, stake: f < 0.9 ? top : null }, n };
      }
      case 'tie': {
        const y: V = [TR.pit[0], 0.98 + 0.04 * Math.sin(c.t * 7), TR.pit[2] + 0.12];
        return { l: add(y, -0.09, 0, 0), r: add(y, 0.09, 0, 0), gl: 0.8, gr: 0.8, nod: 0.08, lean: 0.12, props: P, n };
      }
      case 'can': {
        const y = lerpV(TR.can, [TR.pit[0] + 0.32, 0.86, 0.4], sm(u, 0.15, 1));
        return { r: add(y, 0.02, 0.28, 0), gr: 0.95, crouch: u < 0.3 ? 0.65 : 0, nod: 0.3, props: { ...P, can: y }, n };
      }
      case 'water': {
        const y: V = [TR.pit[0] + 0.26 + 0.04 * Math.sin(c.t * 1.3), 0.86, 0.34];
        return { r: add(y, 0.02, 0.28, 0), gr: 0.95, nod: 0.38, props: { ...P, can: y }, n: { ...n, pour: sm(u, 0.03, 0.12) - sm(u, 0.92, 0.99), canTip: 1 } };
      }
      default:
        return { nod: -0.05, l: c.bd(0.22, 0.86, 0.04), r: c.bd(-0.22, 0.86, 0.04), props: P, n };
    }
  },
};

// =============================================================================================
// 소형 굴착기 (mlExcavator, 3 × 3): the cab at the back under a canopy, its boom digging a trench out in front.

export const EX = {
  seat: [0, 0.96, -0.72] as V,
  floor: 0.58,
  pivot: [0, 0.66, -0.08] as V,
  lever: (side: number, ahead = 0): V => [side, 1.14, -0.42 + ahead],
  rail: [-0.42, 1.36, -0.54] as V,
  trench: [0, 0.015, 0.92] as V,
  spoil: [1.06, 0, 0.62] as V,
};
/** Boom up from level, arm and bucket each bent from what's before them; the boom's swing to the dweller's left. */
const BOOM = {
  rest: { boom: 0.92, arm: -1.75, bkt: 1.0, swing: 0 },
  reach: { boom: 0.55, arm: -1.15, bkt: -0.45, swing: 0 },
  dig: { boom: 0.4, arm: -1.65, bkt: -0.65, swing: 0 },
  curl: { boom: 0.46, arm: -2.0, bkt: 0.92, swing: 0 },
  lift: { boom: 0.92, arm: -1.62, bkt: 0.92, swing: 0 },
  over: { boom: 0.88, arm: -1.5, bkt: 0.92, swing: 0.95 },
  dump: { boom: 0.88, arm: -1.32, bkt: -1.1, swing: 0.95 },
};
const DIG_SEQ: Seq = [['climb', 1.3, 1.1], ['start', 1.6], ...[0, 1, 2].flatMap((i): Seq => [[`reach${i}`, 0.5, 1.1], [`dig${i}`, 0.3, 1.0], [`curl${i}`, 0.4, 1.0], [`lift${i}`, 0.2, 0.9], [`over${i}`, 0.2, 1.1], [`dump${i}`, 0.9, 0.7]]), ['park', 0.8, 1.2], ['off', 0.9, 1.0], ['staff', 3.2, 1.2], ['walk', 0.4, 1.6]];
const SEATED = new Set(['start', 'park', 'off']);
const DIG: Script = {
  seq: DIG_SEQ,
  at: (k) => {
    if (k === 'climb' || k === 'walk') return st(-0.86, -0.62, PI / 2);
    if (k === 'staff') return st(-0.58, 1.0, PI / 2);
    const s: St = { x: EX.seat[0], y: EX.seat[1], z: EX.seat[2], yaw: 0, sit: true, floor: EX.floor };
    return SEATED.has(k) || /^(reach|dig|curl|lift|over|dump)\d$/.test(k) ? s : st(-0.86, -0.62, PI / 2);
  },
  key(k, u, c): Key {
    const done = (i: number) => c.p(`curl${i}`, 0.4, 1);
    const dug = (done(0) + done(1) + done(2)) / 3;
    const dumped = (c.p('dump0', 0.1, 0.8) + c.p('dump1', 0.1, 0.8) + c.p('dump2', 0.1, 0.8)) / 3;
    const on = (b: (typeof BOOM)['rest'], full = 0) => ({ boom: b.boom, arm: b.arm, bkt: b.bkt, swing: b.swing, full, trench: dug, spoil: dumped, engine: k === 'climb' || k === 'walk' || k === 'staff' ? 0 : k === 'start' ? sm(u, 0.4, 0.6) : k === 'off' ? 1 - sm(u, 0.2, 0.5) : 1 });
    if (k === 'climb') return { r: EX.rail, gr: 0.95, l: add(EX.rail, 0.12, -0.26, 0.2), gl: 0.9, nod: -0.05, lean: 0.08, n: on(BOOM.rest) };
    if (k === 'walk') return { nod: 0.1, n: on(BOOM.rest) };
    if (k === 'staff') {
      // Out with the depth staff, stood in the cut and read.
      const top: V = [-0.15, 1.16, 1.04];
      return { l: add(top, -0.03, -0.14, 0.02), r: add(top, 0.03, -0.42, 0.02), gl: 0.9, gr: 0.9, nod: 0.45, lean: 0.16, props: { staff: top }, n: on(BOOM.rest) };
    }
    const lv = (la: number, ra: number): Pick<Key, 'l' | 'r' | 'gl' | 'gr' | 'nod' | 'palms'> => ({ l: EX.lever(0.2, la), r: EX.lever(-0.2, ra), gl: 0.95, gr: 0.95, nod: 0.12, palms: 0.5 });
    if (k === 'start') return { ...lv(0, 0), n: on(BOOM.rest) };
    if (k === 'park') return { ...lv(0.03, -0.03), n: on(BOOM.rest) };
    if (k === 'off') return { ...lv(0, 0), r: [-0.26, 1.02, -0.5], tap: true, n: on(BOOM.rest) };
    const name = k.slice(0, -1);
    const sh = 0.008 * Math.sin(c.t * 30);
    switch (name) {
      case 'reach':
        return { ...lv(0.07, -0.07), r: EX.lever(-0.2 + sh, -0.07), n: on(BOOM.reach) };
      case 'dig':
        return { ...lv(0.08, 0.06), n: on(BOOM.dig) };
      case 'curl':
        return { ...lv(-0.07, -0.08), n: on(BOOM.curl, sm(u, 0.1, 0.8)) };
      case 'lift':
        return { ...lv(-0.06, 0.05), n: on(BOOM.lift, 1) };
      case 'over':
        return { ...lv(0.05, 0.05), nod: 0.06, n: on(BOOM.over, 1) };
      default:
        return { ...lv(0.05, 0.08), nod: 0.06, n: on(BOOM.dump, 1 - sm(u, 0.05, 0.6)) };
    }
  },
};

// =============================================================================================
// 측량 말뚝 (mlSurveyLine, 3 × 1): a line between two stakes, and an auto level on a tripod.

export const SV = {
  a: [-1.28, 0.16] as const,
  b: [1.28, 0.16] as const,
  tripod: [-0.3, -0.02] as const,
  scope: 1.36,
  staff: [1.0, 0.02] as const,
  line: 0.32,
};
const STAKE_SEQ: Seq = [['readA', 1.0], ['driveA', 2.8], ['tieA', 1.8, 3.0], ['walkOut', 0.2, 0.3], ['driveB', 2.8], ['pull', 2.0, 2.2], ['toScope', 0.3], ['peek', 2.0], ['wave', 2.2], ['read', 2.2], ['note', 2.2, 1.6], ['backTo', 0.5]];
const STAKE: Script = {
  seq: STAKE_SEQ,
  at: (k) => {
    if (k === 'walkOut' || k === 'driveB' || k === 'pull') return st(SV.b[0] - 0.1, SV.b[1] + 0.58);
    if (k === 'readA' || k === 'driveA' || k === 'tieA' || k === 'backTo') return st(SV.a[0] + 0.08, SV.a[1] + 0.58);
    return st(SV.tripod[0], SV.tripod[1] + 0.46);
  },
  key(k, _u, c): Key {
    const n = { aIn: c.p('driveA', 0, 0.9), bIn: c.p('driveB', 0, 0.9), line: c.p('tieA', 0.5, 0.8), taut: c.p('pull', 0.1, 0.8), staff: c.p('toScope', 0, 1), staffY: c.p('wave', 0, 0.8), sign: 0, leave: c.p('backTo', 0, 1), note: c.p('note', 0.1, 0.9) };
    const stake = (s: readonly [number, number], d: number): V => [s[0], 0.6 - d * 0.18, s[1]];
    const blow = Math.abs(Math.sin(c.t * 6.5));
    switch (k) {
      case 'readA':
        return { nod: 0.25, l: stake(SV.a, 0), gl: 0.85, r: c.bd(-0.22, 0.8, 0.1), crouch: 0.22, lean: 0.1, n };
      case 'driveA':
      case 'driveB': {
        const s = k === 'driveA' ? SV.a : SV.b;
        const y = stake(s, k === 'driveA' ? n.aIn : n.bIn);
        const m = add(y, 0.02, 0.14 + 0.2 * blow, 0.02);
        return { l: add(y, -0.1, -0.05, 0.03), gl: 0.9, r: add(m, 0.03, 0.02, 0.14), gr: 0.95, crouch: 0.68, nod: 0.5, lean: 0.25, props: { mallet: m }, n };
      }
      case 'tieA':
      case 'pull': {
        const s = k === 'tieA' ? SV.a : SV.b;
        const w = 0.03 * Math.sin(c.t * 9);
        const y: V = [s[0], SV.line + 0.02, s[1] + 0.02];
        return { l: add(y, -0.06 + w, 0.02, 0.03), r: add(y, 0.06 - w, 0.02, 0.03), gl: 0.85, gr: 0.85, crouch: 0.72, nod: 0.55, lean: 0.25, n };
      }
      case 'walkOut':
      case 'toScope':
      case 'backTo':
        return { nod: 0.14, n };
      case 'peek':
      case 'read': {
        const y: V = [SV.tripod[0], SV.scope, SV.tripod[1] + 0.06];
        return { l: add(y, -0.1, 0, 0.04), r: add(y, 0.11, -0.01, 0.04), gl: 0.72, gr: 0.72, nod: 0.3, lean: 0.14, n };
      }
      case 'wave': {
        // The eye still at it, the free arm signalling the staff down.
        const y: V = [SV.tripod[0], SV.scope, SV.tripod[1] + 0.06];
        return { l: add(y, -0.1, 0, 0.04), gl: 0.72, r: c.bd(-0.46, 1.04 + 0.16 * Math.sin(c.t * 4.5), 0.14), gr: 0.1, nod: 0.3, lean: 0.14, n: { ...n, sign: 1 } };
      }
      default: {
        const b = c.bd(0.14, 1.0, 0.24);
        return { l: add(b, 0.02, -0.03, 0), gl: 0.8, r: scrub(add(b, -0.03, 0.01, 0.02), c.t, 0.025, 0.012), gr: 0.8, nod: 0.5, props: { book: b }, n };
      }
    }
  },
};

// =============================================================================================
// 안전 게시판 (mlSafetyBoard, 2 × 1): the morning's toolbox talk before the board.

export const SB = { y: [1.68, 1.44, 1.2] as const, x: -0.35, z: -0.34, ptr: 0.62 };
const TALK_SEQ: Seq = [['gather', 1.6], ['one', 2.3], ['two', 2.3], ['three', 2.3], ['ask', 2.3], ['chant1', 1.0, 0.25], ['chant2', 1.0, 0.25], ['chant3', 1.0, 0.25], ['bye', 1.2]];
const TALK: Script = {
  seq: TALK_SEQ,
  at: (k) => st(-0.72, 0.42, k === 'one' || k === 'two' || k === 'three' ? PI * 0.75 : 0.65),
  key(k, u, c): Key {
    const n = { crew: k === 'bye' ? 1 - sm(u, 0.1, 1) : k === 'gather' ? sm(u, 0, 0.9) : 1, tick: c.p('one', 0.75, 0.85) + c.p('two', 0.75, 0.85) + c.p('three', 0.75, 0.85), nod: 0, up: 0 };
    const pointAt = (i: number): Key => {
      const y = SB.y[i];
      const tip: V = [SB.x, y, SB.z + 0.02];
      const hand = c.bd(-0.14, 1.28, 0.28);
      return { r: hand, gr: 0.95, l: c.bd(0.2, 0.94, 0.14), nod: 0.0, palms: 0.2, props: { ptrA: hand, ptrB: lerpV(tip, hand, 0.012 * Math.sin(c.t * 5)) }, n: { ...n, nod: Math.max(0, Math.sin(u * PI * 4)) * 0.8 } };
    };
    switch (k) {
      case 'gather':
        return { r: c.bd(-0.2, 0.96, 0.15), l: c.bd(0.2, 0.96, 0.15), nod: 0, n };
      case 'one':
        return pointAt(0);
      case 'two':
        return pointAt(1);
      case 'three':
        return pointAt(2);
      case 'ask':
        return { r: c.bd(-0.3, 1.1 + 0.06 * Math.sin(c.t * 4), 0.36), gr: 0.1, palms: 0.9, l: c.bd(0.22, 0.92, 0.12), nod: -0.02, n: { ...n, nod: 0.6 * Math.max(0, Math.sin(u * PI * 5)) } };
      case 'chant1':
      case 'chant2':
      case 'chant3': {
        // The hand thrown up on each call, a fist: 안전!
        const up = Math.sin(u * PI);
        return { r: c.bd(-0.2, 1.1 + 0.68 * up, 0.14), gr: 0.95, l: c.bd(0.22, 0.92, 0.1), nod: -0.05 * up, n: { ...n, up } };
      }
      default:
        return { r: c.bd(-0.2, 0.96, 0.12), l: c.bd(0.2, 0.96, 0.12), nod: 0.05, n };
    }
  },
};

// =============================================================================================
// 현장 사무소 (mlSiteOffice, 4 × 2): a blue container; a drop shelf under its window and the date cards by its door.

export const OF = {
  shelf: [0.62, 1.04, 1.12] as V,
  stand: 1.46,
  card: [-0.42, 1.44, 1.0] as V,
};
const LOG_SEQ: Seq = [['up', 0.9], ['roll', 2.2], ['trace', 3.0], ['book', 0.8], ['write', 3.8], ['stamp', 1.5], ['look', 1.8, 1.5], ['walk', 0.2, 0.3], ['card', 2.1, 1.5], ['back', 0.4]];
const LOG: Script = {
  seq: LOG_SEQ,
  at: (k) => (k === 'walk' || k === 'card' ? st(OF.card[0], OF.stand - 0.1) : st(OF.shelf[0], OF.stand)),
  key(k, u, c): Key {
    const n = { plan: c.p('roll', 0.1, 0.9) - c.p('back', 0, 0.8), book: c.p('book', 0.3, 0.7) - c.p('back', 0, 0.8), lines: c.p('write', 0, 1), stamped: c.p('stamp', 0.5, 0.56) - c.p('back', 0, 0.8), card: c.p('card', 0.45, 0.55) };
    const S = OF.shelf;
    switch (k) {
      case 'roll': {
        const x = -0.34 + 0.68 * sm(u, 0.1, 0.9);
        return { l: add(S, -0.34, 0.03, 0.02), r: add(S, x, 0.04, 0.02), gl: 0.5, gr: 0.8, nod: 0.45, lean: 0.12, n: { ...n, planX: x } };
      }
      case 'trace': {
        const x = -0.2 + 0.4 * Math.sin(c.t * 0.9);
        return { l: add(S, -0.32, 0.03, 0.02), r: add(S, x, 0.04, 0.06 * Math.sin(c.t * 1.6)), gl: 0.3, gr: 0.5, nod: 0.5, lean: 0.14, n: { ...n, planX: 0.34 } };
      }
      case 'book':
        return { l: add(S, -0.42, 0.03, 0), r: add(S, 0.1, 0.1, 0), gl: 0.5, nod: 0.45, n: { ...n, planX: 0.34 } };
      case 'write':
        return { l: add(S, -0.2, 0.03, 0.08), gl: 0.2, r: scrub(add(S, 0.04, 0.05, 0.04), c.t, 0.06, 0.012), gr: 0.82, nod: 0.5, lean: 0.14, n: { ...n, planX: 0.34 } };
      case 'stamp': {
        const m = add(S, 0.22, 0.03 + 0.14 * Math.abs(Math.cos(u * PI * 1.0)), 0.05);
        return { r: add(m, 0, 0.08, 0.02), gr: 0.95, l: add(S, -0.2, 0.03, 0.08), gl: 0.2, nod: 0.5, lean: 0.14, props: { stamp: m }, n: { ...n, planX: 0.34 } };
      }
      case 'look':
        // A hand over the eyes, the sky looked at.
        return { r: c.bd(-0.05, 1.55, 0.14), gr: 0.1, l: c.bd(0.22, 0.92, 0.1), nod: -0.28, n: { ...n, planX: 0.34 } };
      case 'card':
        return { r: add(OF.card, 0.0, -0.03 + 0.1 * Math.sin(u * PI), 0.04), gr: 0.8, l: c.bd(0.22, 0.92, 0.1), nod: 0.0, n: { ...n, planX: 0.34 } };
      default:
        return { r: c.bd(-0.22, 0.9, 0.1), l: c.bd(0.22, 0.9, 0.1), nod: 0.25, n: { ...n, planX: k === 'up' ? -0.34 : 0.34 } };
    }
  },
};

// =============================================================================================
// 공구 보관함 (mlToolCrib, 2 × 1): a steel-mesh cage, long tools hung inside, a bench with a vice on its left.

export const CR = {
  stand: 0.86,
  hang: [0.42, 1.54, -0.16] as V,
  hangB: [0.42, 0.4, -0.16] as V,
  bench: [-0.5, 0.92, 0.44] as V,
  sheet: [-0.62, 1.42, 0.2] as V,
};
const TOOLS_SEQ: Seq = [['unlock', 1.5], ['open', 1.1], ['reach', 1.2], ['down', 1.0, 1.0], ['look', 1.5], ['clamp', 0.9], ['file', 3.8], ['wipe', 1.8, 1.0], ['lift', 0.8, 0.7], ['hang', 1.2, 0.7], ['close', 1.0, 0.9], ['tick', 1.8, 0.9]];
/** The handle of the cage door, `u` of the way open. */
const doorHand = (u: number): V => [0.92 - 0.88 * Math.cos(u * 1.3), 1.08, 0.13 + 0.88 * Math.sin(u * 1.3) + 0.03];
const TOOLS: Script = {
  seq: TOOLS_SEQ,
  at: (k) => (['look', 'clamp', 'file', 'wipe', 'tick'].includes(k) ? st(CR.bench[0], CR.stand + 0.1) : k === 'unlock' || k === 'open' || k === 'close' ? st(0.12, CR.stand) : st(0.38, 0.48)),
  key(k, u, c): Key {
    const n = { door: c.p('open', 0, 1) - c.p('close', 0, 1), sparks: k === 'file' ? 1 : 0, ticks: c.p('tick', 0.5, 0.6) };
    const atBench = (): Key => {
      // Its blade up on the bench's edge, the shaft sloping down to the ground.
      const grip: V = [CR.bench[0] + 0.85, 0.04, CR.bench[2] + 0.06];
      const blade: V = add(CR.bench, -0.05, 0.03, 0);
      return { props: { shG: grip, shB: blade } };
    };
    const ben = atBench().props as { shG: V; shB: V };
    switch (k) {
      case 'unlock':
        return { r: [0.04, 1.08, 0.34], gr: 0.9, l: c.bd(0.22, 0.9, 0.12), nod: 0.24, tap: true, n };
      case 'open':
        return { r: doorHand(Math.min(u, 0.6)), gr: 0.8, nod: 0.05, n };
      case 'reach':
        return { r: add(CR.hang, 0, -0.1, 0.02), l: add(CR.hang, -0.08, -0.5, 0.02), gr: 0.9, gl: 0.9, nod: -0.05, lean: 0.06, n };
      case 'down':
      case 'lift': {
        const g: V = [0.3, 1.16, 0.72];
        const b: V = [0.28, 0.1, 0.2];
        return merge(shovel(g, b), { nod: 0.2, n });
      }
      case 'look':
        return merge(shovel(c.bd(0.12, 0.92, 0.44), c.bd(-0.4, 1.12, 0.3)), { nod: 0.2, n });
      case 'clamp':
        return merge(shovel(ben.shG, ben.shB), { r: add(ben.shB, 0.08, 0.1, 0.02), l: add(ben.shB, 0.06, -0.04, 0.09), nod: 0.42, lean: 0.14, n });
      case 'file': {
        // Long strokes down the edge, away from the body, both hands on the file.
        const s = Math.sin(c.t * 5.5);
        const f = add(ben.shB, 0.04 + 0.1 * s, 0.04, 0.05);
        return { props: { ...ben, file: f }, l: add(f, -0.1, 0.02, 0.04), r: add(f, 0.1, 0.02, 0.04), gl: 0.92, gr: 0.92, nod: 0.52, lean: 0.2, n };
      }
      case 'wipe':
        return { props: { ...ben, rag: scrub(add(ben.shB, 0.05, 0.02, 0.02), c.t, 0.08, 0.012) }, r: scrub(add(ben.shB, 0.05, 0.05, 0.05), c.t, 0.08, 0.012), gr: 0.6, l: add(ben.shB, -0.16, 0.04, 0.06), gl: 0.8, nod: 0.5, lean: 0.18, n };
      case 'hang':
        return { r: add(CR.hang, 0, -0.1, 0.02), l: add(CR.hang, -0.08, -0.5, 0.02), gr: 0.9, gl: 0.9, nod: -0.05, lean: 0.06, n };
      case 'close':
        return { r: doorHand(Math.min(1 - u, 0.6)), gr: 0.8, nod: 0.05, n };
      default: {
        return { r: add(CR.sheet, 0.02, 0, 0.03), gr: 0.82, l: c.bd(0.22, 0.92, 0.1), nod: -0.02, tap: true, n };
      }
    }
  },
};

// =============================================================================================
// 골재 더미 (mlSoilHeap, 3 × 1): gravel and soil in bays, a throwing screen between them.

export const HP = {
  gravel: [-0.92, 0.1, 0.12] as V,
  screen: [0.05, 0.62, -0.1] as V,
  fines: [0.1, 0, 0.32] as V,
};
const GRAVEL_SEQ: Seq = [['look', 1.0], ['dig', 8.2], ['stow', 0.6], ['rake', 4.4], ['shake', 2.0]];
const GRAVEL: Script = {
  seq: GRAVEL_SEQ,
  at: (k) => (k === 'dig' || k === 'look' || k === 'stow' ? st(-0.42, 0.72, -PI * 0.88) : k === 'shake' ? st(0.05, 0.56) : st(0.32, 0.86)),
  key(k, u, c): Key {
    const n = { used: c.p('dig'), fines: c.p('dig') * 0.8 + c.p('rake') * 0.2 - c.p('shake', 0.7, 1), rattle: 0, dust: 0, raked: c.p('rake') };
    switch (k) {
      case 'dig': {
        const d = dig(c, u, 4, HP.gravel, HP.screen, 0.26);
        const f = d.f;
        return merge(d.k, { n: { ...n, rattle: sm(f, 0.72, 0.76) - sm(f, 0.92, 1), dust: sm(f, 0.72, 0.76) - sm(f, 0.92, 1) } });
      }
      case 'look':
        return merge(shovel(c.bd(-0.2, 1.04, 0.16), add(HP.gravel, 0.3, -0.08, 0.2)), { nod: 0.4, n });
      case 'stow':
        return merge(shovel(c.bd(-0.3, 1.0, 0.1), [-0.2, 0.03, 0.68]), { nod: 0.2, n });
      case 'rake': {
        const h: V = [0.18 + 0.28 * Math.sin(c.t * 2.2), 0.06, 0.38 + 0.08 * Math.cos(c.t * 2.2)];
        const grip = c.bd(-0.12, 1.06, 0.2);
        return { r: grip, l: lerpV(grip, h, 0.42), gl: 0.92, gr: 0.95, nod: 0.4, lean: 0.2, props: { rakeG: grip, rakeH: h }, n };
      }
      default:
        return { r: [HP.screen[0] + 0.18, 0.86, 0.1 + 0.03 * Math.sin(c.t * 17)], l: [HP.screen[0] - 0.18, 0.86, 0.1 + 0.03 * Math.sin(c.t * 17)], gl: 0.92, gr: 0.92, nod: 0.3, lean: 0.12, n: { ...n, rattle: 1, dust: 0.7 } };
    }
  },
};

const SCRIPTS: Record<MlMotion, Script> = { mlBed: BED, mlPrune: PRUNE, mlShrub: SHRUB, mlPlan: PLAN, mlMow: MOW, mlHaul: HAUL, mlBricks: BRICKS, mlCover: COVER, mlAssign: ASSIGN, mlPave: PAVE, mlTree: TREE, mlDig: DIG, mlStake: STAKE, mlTalk: TALK, mlLog: LOG, mlTools: TOOLS, mlGravel: GRAVEL };
