import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the made-up 한빛 훈련대 (2026-11-02). Training only: paper bullseyes, an empty training rifle, no enemy and nobody hurt. Each
 * motion is a round of beats; the piece reads the same script by the same clock (military.ts).
 *
 * - 사격장 (miFiringRange): miShoot muffs on, safety check, aimed, four rounds with a small kick, made safe, rifle left on the bags,
 *   walked down the lane to read the target. miZero three rounds, the group seen through the scope, the sight turned, three more.
 * - 초소 (miGuardPost): miWatch stood at watch, looking both ways, binoculars, the report by telephone, the log. miHandover a relief
 *   comes to the entrance: the binoculars checked and passed over, what's happened told, the log signed.
 * - 행군 집결지 (miMarchRoute): miMarch rucksack up and on, out through the gate and along the road outside, a water break, back, the rucksack back. miCheckRuck straps and canteen
 *   of each one on the trestle tried, ticked on the sheet.
 * - 정비 작업대 (miMaintBench): miStrip safety clear, parts onto the mat one by one, cleaned, back on, function check. miClean brush, rag
 *   and a line on the inspection card.
 * - 국기 게양대 (flagPole): miRollCall in the rank: attention, salute, sound-off down the line, the report, the day's notice.
 *
 * In the piece's frame (x across as you face its front, y up, z out of its front). A body facing -z (yaw PI) has its right hand on +x.
 */
export type MiMotion = 'miShoot' | 'miZero' | 'miWatch' | 'miHandover' | 'miMarch' | 'miCheckRuck' | 'miStrip' | 'miClean' | 'miRollCall';
export const MI_MOTIONS = new Set<string>(['miShoot', 'miZero', 'miWatch', 'miHandover', 'miMarch', 'miCheckRuck', 'miStrip', 'miClean', 'miRollCall']);
export type MiTool = 'rifle' | 'muffs' | 'pen' | 'handset' | 'binos' | 'ruck' | 'canteen' | 'brush' | 'rag' | 'p0' | 'p1' | 'p2' | 'p3' | 'p4';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const miPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.553);
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;

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
  tool?: MiTool;
  props?: Record<string, V | null | undefined>;
  /** Eased between beats. */
  n?: Record<string, number>;
  /** Changes at once half way between beats: which words, which shot. */
  d?: Record<string, number>;
}
interface Ctx {
  t: number;
  k: number;
  st: St;
  round: number;
  bd(side: number, up: number, ahead: number): V;
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string, round: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface MiNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: MiTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number) {
  const here = s.at(k, round);
  const idx = s.seq.findIndex(([q]) => q === k);
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = {
    t,
    k: H / 1.6,
    st: here,
    round,
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.03), nod: n(a.nod, b.nod, 0.05), palms: n(a.palms, b.palms, 0.3), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3) };
}
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function miNow(m: MiMotion, t: number, ph: number, H = 1.6): MiNow {
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
  Object.assign(n, (e < 0.5 ? A.key.d : B.key.d) ?? {});
  const tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.1, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function miPose(m: MiMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = miNow(m, t, miPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, 0, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw };
  return {
    pose,
    doing: { reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.03, nod: k.nod ?? 0.05, palms: k.palms ?? 0.3, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 } } },
  };
}
/** At attention: the arms straight down, the fists by the seams. */
const attention = (c: Ctx): Key => ({ l: c.bd(0.2, 0.78 * c.k, 0.02), r: c.bd(-0.2, 0.78 * c.k, 0.02), gl: 0.7, gr: 0.7, lean: 0, nod: 0 });
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.82 * c.k, 0.08), r: c.bd(-0.2, 0.82 * c.k, 0.08), gl: 0.3, gr: 0.3 });
/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;

// =============================================================================================
// 사격장 (miFiringRange, 2 × 10, out in the open; set sideways on the lot, so a shooter is seen from the side): the firing line at the front, the targets down the back.

export const RG = {
  lanes: [-0.5, 0.5] as const,
  /** The dweller's lane, where they stand. */
  x: 0.5,
  z: 4.4,
  bagTop: 1.25,
  bagZ: 3.82,
  /** The rifle laid on the bags, and shouldered: its origin is the grip. */
  rest: [0.58, 1.27, 4.14] as V,
  aim: [0.58, 1.3, 4.14] as V,
  low: [0.56, 1.1, 4.08] as V,
  muffs: [0.96, 1.2, 4.5] as V,
  scope: [0.32, 1.32, 4.02] as V,
  targetZ: -4.6,
  targetY: 1.2,
  read: -4.05,
  /** Where each round goes on the target, as a part of its radius (x, up): a loose group, then one the sight has brought in. */
  groupA: [[0.42, 0.5], [0.5, 0.36], [0.34, 0.42]] as ReadonlyArray<readonly [number, number]>,
  groupB: [[0.06, 0.08], [-0.05, 0.02], [0.02, -0.08], [0.1, -0.03]] as ReadonlyArray<readonly [number, number]>,
};
const onHead = (c: Ctx): V => c.bd(0, 1.44 * c.k, -0.01);
/** The kick of a shot, from when it was fired. */
const shots = (u: number, count: number) => {
  const x = u * count;
  const f = x - Math.floor(x);
  return { fired: Math.min(count, Math.floor(x) + (f > 0.25 ? 1 : 0)), kick: f > 0.25 ? Math.exp(-(f - 0.25) * 11) : 0, flash: f > 0.25 && f < 0.31 ? 1 : 0 };
};
const onRifle = (p: V, n: Record<string, number>, props: Record<string, V | null>, d?: Record<string, number>, lean = 0.14, nod = 0.1): Key => ({ tool: 'rifle', lean, nod, n, props: { ...props, rifle: p }, d, gl: 0.8, gr: 0.8 });
const SHOOT: Script = {
  seq: [['ready', 2], ['muffs', 1.6], ['safety', 2.4], ['aim', 2.2], ['fire', 4.8], ['safe', 1.8], ['lay', 1], ['gap', 0, 0.8], ['walk', 0, 5], ['read', 2.8], ['back', 0, 5], ['gap2', 0, 0.8], ['off', 1.4]],
  // Downrange through the gap between the lanes' bags, the rifle left behind.
  at: (k) => (k === 'read' ? st(RG.x - 0.1, RG.read) : k === 'gap' ? st(0, 4.22, -1.91) : k === 'walk' ? st(0, -2.65) : k === 'back' ? st(0, -2.65, 0) : k === 'gap2' ? st(0, 4.22, 1.23) : st(RG.x, RG.z)),
  key(k, u, c) {
    const worn = c.p('muffs', 0.5, 1) > 0.5 && k !== 'off' && k !== 'gap' && k !== 'walk' && k !== 'read' && k !== 'back' && k !== 'gap2';
    const base = { muffs: worn ? onHead(c) : null };
    const d = { hits: k === 'ready' || k === 'muffs' || k === 'safety' || k === 'aim' ? 0 : k === 'fire' ? shots(u, 4).fired : 4, group: 1, say: k === 'ready' ? 1 : k === 'aim' ? 2 : k === 'safe' ? 3 : k === 'read' ? 4 : 0, flag: k === 'fire' || k === 'aim' || k === 'safety' ? 1 : 0 };
    switch (k) {
      case 'ready':
        return { ...attention(c), d, props: base };
      case 'muffs':
        return { r: lerpV(RG.muffs, onHead(c), sm(u, 0.1, 0.9)), l: c.bd(0.2, 0.9, 0.1), gr: 0.6, tool: 'muffs', nod: 0.05, d, props: { muffs: lerpV(RG.muffs, onHead(c), sm(u, 0.1, 0.9)) } };
      case 'safety':
        // Lifted off the bags, muzzle downrange, a look along the top and a thumb at the catch.
        return { ...onRifle(lerpV(RG.rest, RG.low, sm(u, 0, 0.35)), { kick: 0 }, base, d, 0.1, 0.34), lean: 0.1 };
      case 'aim':
        return onRifle(lerpV(RG.low, RG.aim, sm(u, 0, 0.5)), { kick: 0 }, base, d);
      case 'fire': {
        const s = shots(u, 4);
        return onRifle(add(RG.aim, 0, 0.004 * s.kick, 0.022 * s.kick), { kick: s.kick }, base, { ...d, flash: s.flash }, 0.14 - 0.03 * s.kick);
      }
      case 'safe':
        return onRifle(lerpV(RG.aim, RG.low, sm(u, 0, 0.5)), { kick: 0 }, base, d, 0.1, 0.32);
      case 'lay':
        return { ...onRifle(lerpV(RG.low, RG.rest, sm(u, 0, 0.8)), { kick: 0 }, base, d, 0.1, 0.2) };
      case 'gap':
      case 'walk':
      case 'back':
      case 'gap2':
        return { ...easy(c), d, props: { rifle: RG.rest, muffs: null } };
      case 'read':
        // A finger round the group, the pen on the score sheet in the other.
        return { r: [RG.x + 0.06 + 0.03 * Math.sin(c.t * 3), RG.targetY + 0.03 * Math.cos(c.t * 3), RG.targetZ + 0.42], l: c.bd(0.2, 0.9, 0.12), gr: 0.4, lean: 0.12, nod: 0.02, d, props: { rifle: RG.rest, muffs: null } };
      default:
        return { r: lerpV(onHead(c), RG.muffs, sm(u, 0.1, 0.9)), l: c.bd(0.2, 0.86, 0.1), gr: 0.6, tool: 'muffs', d, props: { rifle: RG.rest, muffs: lerpV(onHead(c), RG.muffs, sm(u, 0.1, 0.9)) } };
    }
  },
};
const ZERO: Script = {
  seq: [['muffs', 1.6], ['aim', 2], ['three', 3.6], ['scope', 2.8], ['turn', 2.6], ['aim2', 1.4], ['again', 3.6], ['scope2', 2.2], ['off', 1.4]],
  at: (k) => (k === 'scope' || k === 'scope2' ? st(RG.x - 0.14, RG.z - 0.08) : st(RG.x, RG.z)),
  key(k, u, c) {
    const base = { muffs: k === 'muffs' || k === 'off' ? null : onHead(c) };
    const hitsNow = k === 'muffs' || k === 'aim' ? 0 : k === 'three' ? shots(u, 3).fired : 3;
    const d = { hits: hitsNow, group: 0, hits2: k === 'again' ? shots(u, 3).fired : k === 'scope2' || k === 'off' ? 3 : 0, say: k === 'scope' ? 5 : k === 'turn' ? 6 : k === 'scope2' ? 7 : 0, flag: k === 'aim' || k === 'three' || k === 'aim2' || k === 'again' ? 1 : 0 };
    switch (k) {
      case 'muffs':
        return { r: lerpV(RG.muffs, onHead(c), sm(u, 0.1, 0.9)), l: c.bd(0.2, 0.9, 0.1), gr: 0.6, tool: 'muffs', d, props: { muffs: lerpV(RG.muffs, onHead(c), sm(u, 0.1, 0.9)) } };
      case 'off':
        return { r: lerpV(onHead(c), RG.muffs, sm(u, 0.1, 0.9)), l: c.bd(0.2, 0.86, 0.1), gr: 0.6, tool: 'muffs', d, props: { rifle: RG.rest, muffs: lerpV(onHead(c), RG.muffs, sm(u, 0.1, 0.9)) } };
      case 'aim':
      case 'aim2':
        return onRifle(lerpV(RG.rest, RG.aim, sm(u, 0, 0.6)), { kick: 0 }, base, d);
      case 'three':
      case 'again': {
        const s = shots(u, 3);
        return onRifle(add(RG.aim, 0, 0.004 * s.kick, 0.022 * s.kick), { kick: s.kick }, base, { ...d, flash: s.flash });
      }
      case 'scope':
      case 'scope2':
        // Bent to the scope on its little stand, a hand on the bags.
        return { r: add(RG.scope, 0.04, 0.03, 0.14), l: [0.3, RG.bagTop + 0.02, RG.bagZ + 0.2], gr: 0.5, gl: 0.2, palms: 0.05, lean: 0.34, nod: 0.3, d, props: { ...base, rifle: RG.rest } };
      default:
        // Rifle on the bags: the sight's little wheel turned a click at a time.
        return { r: add(RG.rest, 0, 0.09, -0.04 + 0.004 * Math.sin(c.t * 7)), l: add(RG.rest, -0.12, 0.05, -0.14), gr: 0.75, gl: 0.3, palms: 0.05, lean: 0.2, nod: 0.3, d: { ...d, click: Math.floor(u * 6) % 2 }, props: { ...base, rifle: RG.rest } };
    }
  },
};

// =============================================================================================
// 초소 (miGuardPost, 2 × 1): stood inside it looking out over the front; the telephone on the post at their left, the log shelf at their right.

export const GP = {
  stand: [0, 0.06] as const,
  phone: [0.72, 1.28, -0.12] as V,
  binos: [0.42, 1.06, -0.28] as V,
  log: [-0.66, 1.0, -0.02] as V,
  penHome: [-0.5, 1.012, -0.14] as V,
  relief: [0.2, 1.1] as const,
};
const logPen = (u: number, t: number): V => add(GP.log, -0.06 + 0.12 * frac(u * 3), PEN_UP + 0.004 * Math.sin(t * 15), 0.04 - 0.03 * Math.floor(u * 3));
const toPhone = st(0.28, 0.02, PI / 2);
const toLog = st(-0.26, 0.02, -PI / 2);
const glasses = (c: Ctx): V => c.bd(0, 1.47 * c.k, 0.13);
const WATCH: Script = {
  seq: [['stand', 2], ['left', 2.4], ['right', 2.4], ['binos', 4], ['phone', 1], ['report', 3.6], ['hang', 0.8], ['log', 3.6]],
  at: (k) => (k === 'phone' || k === 'report' || k === 'hang' ? toPhone : k === 'log' ? toLog : k === 'left' ? st(GP.stand[0], GP.stand[1], 0.6) : k === 'right' ? st(GP.stand[0], GP.stand[1], -0.6) : st(GP.stand[0], GP.stand[1], 0)),
  key(k, u, c) {
    const n = { lines: 3 * c.p('log', 0, 0.95) };
    const handset = k === 'report' ? c.bd(0.13, 1.45 * c.k, 0.03) : k === 'phone' ? lerpV(GP.phone, c.bd(0.13, 1.45 * c.k, 0.03), sm(u, 0.2, 1)) : k === 'hang' ? lerpV(c.bd(0.13, 1.45 * c.k, 0.03), GP.phone, sm(u, 0, 0.9)) : null;
    const props = { handset, binos: k === 'binos' ? glasses(c) : null, pen: k === 'log' ? logPen(u, c.t) : null };
    const d = { say: k === 'report' ? 1 : 0, lamp: k === 'report' ? 1 : 0 };
    switch (k) {
      case 'stand':
        return { ...attention(c), n, d, props };
      case 'left':
      case 'right':
        return { ...easy(c), nod: -0.02, n, d, props };
      case 'binos':
        return { tool: 'binos', nod: -0.03, lean: 0, gl: 0.7, gr: 0.7, n, d, props };
      case 'phone':
      case 'hang':
        return { tool: 'handset', r: c.bd(-0.2, 0.82 * c.k, 0.08), gr: 0.3, gl: 0.7, n, d, props };
      case 'report':
        return { tool: 'handset', r: c.bd(-0.2, 1.0 * c.k + 0.02 * Math.sin(c.t * 2.8), 0.22), gr: 0.15, gl: 0.7, nod: 0.05 + 0.03 * Math.sin(c.t * 2), n, d, props };
      default:
        return { tool: 'pen', l: add(GP.log, 0.15, 0.03, 0.08), gl: 0.2, palms: 0.05, lean: 0.14, nod: 0.3, n, d, props };
    }
  },
};
const HANDOVER: Script = {
  seq: [['wait', 2.2], ['arrive', 2.4], ['salute', 1.8], ['tell', 3.6], ['pass', 3], ['sign', 3.4], ['leave', 1.8]],
  at: (k) => (k === 'sign' ? toLog : st(0.02, 0.2, 0)),
  key(k, u, c) {
    const passAt: V = [0.12, 1.15, 0.6];
    const n = { relief: k === 'wait' ? 0 : k === 'arrive' ? sm(u, 0, 0.9) : k === 'leave' ? 1 : 1, lines: 3 * c.p('sign', 0, 0.95), rSalute: k === 'salute' ? 1 : 0 };
    const props = { binos: k === 'pass' ? lerpV(c.bd(0, 1.2, 0.3), passAt, sm(u, 0.1, 0.8)) : null, pen: k === 'sign' ? logPen(u, c.t) : null };
    const d = { say: k === 'salute' ? 2 : k === 'tell' ? 3 : k === 'pass' ? 4 : k === 'leave' ? 5 : 0, passed: k === 'sign' || k === 'leave' ? 1 : 0 };
    switch (k) {
      case 'salute':
        return { l: c.bd(0.2, 0.78 * c.k, 0.02), gl: 0.7, r: c.bd(-0.1, 1.5 * c.k, 0.14), gr: 0.05, palms: 0.1, lean: 0, nod: 0, n, d, props };
      case 'tell':
        return { ...easy(c), r: c.bd(-0.2, 1.04 * c.k + 0.03 * Math.sin(c.t * 2.9), 0.28), gr: 0.1, palms: 0.5, nod: 0.05 + 0.03 * Math.sin(c.t * 2), n, d, props };
      case 'pass':
        return { tool: 'binos', gl: 0.7, gr: 0.7, lean: 0.08, nod: 0.12, n, d, props };
      case 'sign':
        return { tool: 'pen', l: add(GP.log, 0.15, 0.03, 0.08), gl: 0.2, palms: 0.05, lean: 0.14, nod: 0.3, n, d, props };
      default:
        return { ...attention(c), n, d, props };
    }
  },
};

// =============================================================================================
// 행군 집결지 (miMarchRoute, 3 × 1): a trestle of rucksacks inside the gate and the checklist by it. A march goes out of the base, so
// there's no track on the base: rucksack on, out through the gate, along the road outside the fence, a water break, back the same way.
// Placed at (8, 14) on the lot, so the gate's gap is at x 3, the fence at z 1.5 and the pavement along the road at z 3.1 in this frame.

export const MR = {
  /** The trestle's rucksacks, along x, the dweller's the middle one. */
  ruck: [0, 0.86, -0.05] as V,
  rucks: [[-0.5, 0.86, -0.05], [0, 0.86, -0.05], [0.5, 0.86, -0.05]] as ReadonlyArray<V>,
  sheet: [1.15, 1.0, -0.05] as V,
  /** In front of the trestle; inside the gate; out on the road; the far end of the road, where the break is. */
  start: [0, 0.28] as const,
  gate: [3, 0.75] as const,
  road: [3, 3.1] as const,
  far: [-8, 3.1] as const,
};
const onBack = (c: Ctx): V => c.bd(0, 1.1 * c.k, -0.2);
const straps = (c: Ctx): Key => ({ l: c.bd(0.13, 1.2 * c.k, 0.11), r: c.bd(-0.13, 1.2 * c.k, 0.11), gl: 0.8, gr: 0.8, lean: 0.1, nod: 0.05 });
const E = PI / 2;
const W = -PI / 2;
/** Each leg: turned on the spot (`t`), then walked (the third number the seconds on to the next, at about 1.4 tiles a second). */
const LEGS: Record<string, St> = {
  t1: st(MR.start[0], MR.start[1], E),
  o1: st(MR.gate[0], MR.gate[1], E),
  t2: st(MR.gate[0], MR.gate[1], 0),
  o2: st(MR.road[0], MR.road[1], 0),
  t3: st(MR.road[0], MR.road[1], W),
  o3: st(MR.far[0], MR.far[1], W),
  water: st(MR.far[0], MR.far[1], W),
  t4: st(MR.far[0], MR.far[1], E),
  i3: st(MR.road[0], MR.road[1], E),
  t5: st(MR.road[0], MR.road[1], PI),
  i2: st(MR.gate[0], MR.gate[1], PI),
  t6: st(MR.gate[0], MR.gate[1], W),
  i1: st(MR.start[0], MR.start[1], W),
};
const atStart: St = st(MR.start[0], MR.start[1], PI);
/** Where the march goes, in order, and the seconds from each place on to the next. */
export const marchPath = (): Array<St & { secs: number }> => MARCH.seq.map(([k, , mv = 0.5]) => ({ ...MARCH.at(k, 0), secs: mv }));
const MARCH: Script = {
  seq: [
    ['take', 1.8], ['lift', 1.4], ['settle', 1.2],
    ['t1', 0, 2.2], ['o1', 0, 0.4], ['t2', 0, 1.7], ['o2', 0, 0.4], ['t3', 0, 7.8], ['o3', 0, 0.5],
    ['water', 3.6, 0.6],
    ['t4', 0, 7.8], ['i3', 0, 0.4], ['t5', 0, 1.7], ['i2', 0, 0.4], ['t6', 0, 2.2], ['i1', 0, 0.5],
    ['down', 1.6],
  ],
  at: (k) => LEGS[k] ?? atStart,
  key(k, u, c) {
    const staged = k === 'take';
    const lifting = k === 'lift';
    const back = onBack(c);
    const ruck = staged ? MR.ruck : lifting ? lerpV(MR.ruck, c.bd(0, 1.05 * c.k, 0.28), sm(u, 0, 1)) : k === 'down' ? lerpV(back, MR.ruck, sm(u, 0.1, 0.9)) : back;
    const d = { say: k === 'water' ? 1 : k === 'take' ? 2 : 0 };
    const yawHome = k === 'take' || k === 'lift' || k === 'down' ? 1 : 0;
    const n = { onTrestle: yawHome };
    if (staged) return { ...easy(c), r: add(MR.ruck, 0.08, 0.25, 0.1), gr: 0.6, l: add(MR.ruck, -0.08, 0.25, 0.1), gl: 0.6, lean: 0.14, nod: 0.25, d, n, props: { ruck } };
    if (lifting) return { tool: 'ruck', gl: 0.8, gr: 0.8, lean: 0.06, nod: 0.1, d, n, props: { ruck } };
    if (k === 'settle') return { ...straps(c), d, n, props: { ruck } };
    if (k === 'water') {
      const up = sm(u, 0.1, 0.35) * (1 - sm(u, 0.75, 0.95));
      const cant = lerpV(c.bd(-0.2, 0.95 * c.k, 0.16), c.bd(-0.05, 1.42 * c.k, 0.13), up);
      return { tool: 'canteen', l: c.bd(0.13, 1.2 * c.k, 0.11), gl: 0.8, gr: 0.8, lean: 0.02 - 0.05 * up, nod: 0.08 - 0.22 * up, d, n: { ...n, tip: up }, props: { ruck, canteen: cant } };
    }
    if (k === 'down') return { tool: 'ruck', gl: 0.8, gr: 0.8, lean: 0.1, nod: 0.15, d, n, props: { ruck } };
    return { ...straps(c), d, n, props: { ruck } };
  },
};
const CHECK: Script = {
  seq: [['a', 2.6], ['b', 2.6], ['c', 2.6], ['tick', 3]],
  at: (k) => (k === 'tick' ? st(MR.sheet[0], 0.36) : st(MR.rucks[k === 'a' ? 0 : k === 'b' ? 1 : 2][0], 0.33)),
  key(k, u, c) {
    const n = { ticks: c.p('tick', 0, 0.95) * 3 };
    // Down the boxes at the page's right, a row at a time (the page's head away from them).
    const props = { pen: k === 'tick' ? add(MR.sheet, 0.07 + 0.02 * frac(u * 3), PEN_UP, -0.054 + 0.057 * Math.floor(u * 3)) : null };
    if (k === 'tick') return { tool: 'pen', l: add(MR.sheet, -0.14, 0.03, 0), gl: 0.2, palms: 0.05, lean: 0.12, nod: 0.3, n, props };
    const r = MR.rucks[k === 'a' ? 0 : k === 'b' ? 1 : 2];
    // The strap pulled, the top pressed, the canteen pocket tried.
    const tug = sm(frac(u * 2), 0.2, 0.5) * (1 - sm(frac(u * 2), 0.6, 0.9));
    return { r: add(r, 0.09, 0.2, 0.12 + 0.05 * tug), l: add(r, -0.1, 0.2 - 0.14 * sm(u, 0.5, 0.7), 0.12), gr: 0.75, gl: 0.5, lean: 0.14, nod: 0.26, n: { ...n, tug }, props };
  },
};

// =============================================================================================
// 정비 작업대 (miMaintBench, 2 × 1): a mat on the bench, the rifle on a block on it with its muzzle to their left, a tray of slots laid out nearer them.

const BT = 0.9;
export const MB = {
  top: BT,
  stand: 0.62,
  /** The rifle, its origin the grip, turned so the muzzle points along -x. */
  rifle: [0.08, BT + 0.14, 0.1] as V,
  lifted: [0.1, BT + 0.34, 0.26] as V,
  brush: [0.46, BT + 0.02, -0.16] as V,
  rag: [-0.78, BT + 0.012, 0.22] as V,
  penHome: [0.84, BT + 0.012, -0.12] as V,
  card: [0.84, BT + 0.006, 0.12] as V,
};
/** A part's place on the assembled rifle (the rifle's own frame), and on the mat (the piece's). */
export const PARTS: ReadonlyArray<{ home: V; slot: V; name: string }> = [
  { name: '탄창', home: [0, -0.08, -0.1], slot: [-0.46, BT + 0.024, 0.33] },
  { name: '총열 덮개', home: [0, 0.03, -0.27], slot: [-0.26, BT + 0.03, 0.33] },
  { name: '덮개', home: [0, 0.062, -0.07], slot: [-0.02, BT + 0.024, 0.33] },
  { name: '스프링', home: [0, 0.035, 0.06], slot: [0.22, BT + 0.016, 0.33] },
  { name: '노리쇠', home: [0, 0.035, -0.06], slot: [0.46, BT + 0.024, 0.33] },
];
/** The rifle's own frame to the piece's, at home on the bench. */
export const rifleToPiece = (p: V, at: V = MB.rifle): V => [at[0] + p[2], at[1] + p[1], at[2] - p[0]];
export const pieceToRifle = (p: V, at: V = MB.rifle): V => [-(p[2] - at[2]), p[1] - at[1], p[0] - at[0]];
const partHome = (i: number) => rifleToPiece(PARTS[i].home);
const partPath = (i: number, e: number): V => {
  const a = partHome(i);
  const b = PARTS[i].slot;
  const v = lerpV(a, b, e);
  return [v[0], v[1] + 0.07 * Math.sin(e * PI), v[2]];
};
const stripKeys: Seq = [0, 1, 2, 3, 4].map((i) => [`off${i}`, 1.1, 0.35]);
const backKeys: Seq = [4, 3, 2, 1, 0].map((i) => [`on${i}`, 0.9, 0.3]);
const benchX = (i: number) => (partHome(i)[0] + PARTS[i].slot[0]) / 2;
const brushing = (u: number, t: number): V => {
  const s = PARTS[4].slot;
  return [s[0] - 0.07 + 0.14 * (0.5 + 0.5 * Math.sin(t * 6)), s[1] + 0.05, s[2] - 0.005 * u];
};
const STRIP: Script = {
  seq: [['clear', 1.8], ...stripKeys.slice(0, 1), ['look', 1.8], ...stripKeys.slice(1), ['wipe', 3.2], ...backKeys, ['test', 2.6], ['down', 1]],
  at(k) {
    if (/^(off|on)\d/.test(k)) return st(benchX(Number(k.replace(/\D/g, ''))) * 1.1, MB.stand);
    return k === 'wipe' ? st(0.3, MB.stand) : st(0.05, MB.stand);
  },
  key(k, u, c) {
    const off = (i: number) => c.p(`off${i}`, 0.2, 0.95) * (1 - c.p(`on${i}`, 0.2, 0.95));
    const n: Record<string, number> = { o0: off(0), o1: off(1), o2: off(2), o3: off(3), o4: off(4) };
    const props: Record<string, V | null> = { pen: null };
    const lean = 0.26;
    const parked = (x: number): Key => ({ l: [x - 0.24, BT + 0.03, 0.34], gl: 0.25, palms: 0.05, lean, nod: 0.3, n, props });
    const m = /^(off|on)(\d)$/.exec(k);
    if (m) {
      const i = Number(m[2]);
      const out = m[1] === 'off';
      const e = sm(u, 0.1, 0.9);
      const tool = `p${i}` as MiTool;
      return { ...parked(c.st.x), tool, gr: 0.6, d: { say: 0, click: 0 }, props: { ...props, [tool]: partPath(i, out ? e : 1 - e) } };
    }
    switch (k) {
      case 'clear':
        // Safety first: a hand on the catch, the muzzle kept the safe way, a look.
        return { r: add(MB.rifle, 0.02, 0.05, 0.06), gr: 0.75, l: add(MB.rifle, -0.28, 0.0, 0.14), gl: 0.4, palms: 0.05, lean: 0.24, nod: 0.36, n, props, d: { say: 1, click: 0 } };
      case 'look':
        return { r: add(MB.rifle, -0.02, 0.07, 0.02), gr: 0.4, l: add(MB.rifle, -0.3, 0, 0.14), gl: 0.4, palms: 0.05, lean: 0.34, nod: 0.46, n, props, d: { say: 2, click: 0 } };
      case 'wipe':
        return { tool: 'brush', l: add(PARTS[4].slot, -0.14, 0.03, 0.02), gl: 0.5, palms: 0.05, lean, nod: 0.34, n, props: { ...props, brush: brushing(u, c.t) }, d: { say: 3, click: 0 } };
      case 'test': {
        // Together again, lifted clear, muzzle still to the left: the trigger tried, one click, nothing more.
        const p = lerpV(MB.rifle, MB.lifted, sm(u, 0, 0.4));
        return { tool: 'rifle', gl: 0.8, gr: 0.8, lean: 0.06, nod: 0.26, n, d: { say: u > 0.55 ? 4 : 0, click: u > 0.55 && u < 0.68 ? 1 : 0 }, props: { ...props, rifle: p } };
      }
      default:
        return { tool: 'rifle', gl: 0.8, gr: 0.8, lean: 0.14, nod: 0.26, n, props: { ...props, rifle: lerpV(MB.lifted, MB.rifle, sm(u, 0.1, 0.9)) } };
    }
  },
};
const CLEAN: Script = {
  seq: [['brush', 4], ['rag', 4], ['look', 2], ['card', 3.2]],
  at: (k) => (k === 'card' ? st(0.56, MB.stand) : st(0.02, MB.stand)),
  key(k, u, c) {
    const n = { lines: 3 * c.p('card', 0, 0.95), shine: c.p('rag', 0, 1) };
    const along = (a: number) => rifleToPiece([0, 0.075, -0.2 + a * 0.26]);
    if (k === 'brush') return { tool: 'brush', l: add(MB.rifle, -0.34, 0.02, 0.14), gl: 0.5, palms: 0.05, lean: 0.2, nod: 0.34, n, props: { brush: along(0.5 + 0.5 * Math.sin(c.t * 6)) } };
    if (k === 'rag') return { tool: 'rag', r: add(MB.rifle, 0.04, 0.05, 0.08), gr: 0.75, lean: 0.22, nod: 0.34, n, props: { rag: add(rifleToPiece([0, 0.1, -0.3 + 0.2 * Math.sin(c.t * 4)]), 0, 0, 0.02) } };
    if (k === 'look') return { r: add(MB.rifle, 0.02, 0.06, 0.08), gr: 0.4, l: add(MB.rifle, -0.3, 0.02, 0.14), gl: 0.4, palms: 0.05, lean: 0.3, nod: 0.42, n, props: {} };
    return { tool: 'pen', l: add(MB.card, -0.15, 0.03, 0.02), gl: 0.25, palms: 0.05, lean: 0.2, nod: 0.36, n, props: { pen: add(MB.card, -0.05 + 0.1 * frac(u * 3), PEN_UP, 0.03 - 0.03 * Math.floor(u * 3)) } };
  },
};

// =============================================================================================
// 국기 게양대 (flagPole, 1 × 1), the morning's roll call: a rank across the tile in front, facing out, the dweller in its middle, the duty sergeant before them.

export const RC = {
  z: 1,
  /** Across the rank; the dweller is the one at 0. */
  rank: [-1.44, -0.72, 0, 0.72, 1.44] as const,
  leader: [-0.36, 2.55] as const,
};
const salute = (c: Ctx): V => c.bd(-0.1, 1.5 * c.k, 0.14);
const ROLL: Script = {
  seq: [['fall', 1.4], ['att', 1.8], ['salute', 2], ['order', 1], ['c0', 0.8, 0.1], ['c1', 0.8, 0.1], ['c2', 0.8, 0.1], ['c3', 0.8, 0.1], ['c4', 0.8, 0.1], ['report', 2.2], ['notice', 2.4], ['off', 1.2]],
  at: () => st(0, RC.z, 0),
  key(k, u, c) {
    const called = /^c\d$/.test(k) ? Number(k[1]) + 1 : 0;
    const n = { rank: 1, salute: k === 'salute' ? sm(u, 0, 0.15) * (1 - sm(u, 0.85, 1)) : 0, ldSalute: k === 'salute' || k === 'report' ? sm(u, 0, 0.15) * (1 - sm(u, 0.85, 1)) : 0, att: k === 'fall' || k === 'off' ? 0 : 1 };
    const d = { call: called, say: k === 'att' ? 1 : k === 'salute' ? 2 : k === 'order' ? 3 : k === 'report' ? 4 : k === 'notice' ? 5 : k === 'off' ? 6 : 0 };
    if (k === 'salute') return { l: c.bd(0.2, 0.78 * c.k, 0.02), gl: 0.7, r: lerpV(c.bd(-0.2, 0.78 * c.k, 0.02), salute(c), n.salute), gr: 0.05, palms: 0.1, lean: 0, nod: 0, n, d, props: {} };
    if (k === 'fall' || k === 'off') return { ...easy(c), n, d, props: {} };
    // The dweller's own number: the chin up a little as it's called.
    return { ...attention(c), nod: called === 3 ? -0.08 : k === 'notice' ? 0.02 : 0, n, d, props: {} };
  },
};

const SCRIPTS: Record<MiMotion, Script> = { miShoot: SHOOT, miZero: ZERO, miWatch: WATCH, miHandover: HANDOVER, miMarch: MARCH, miCheckRuck: CHECK, miStrip: STRIP, miClean: CLEAN, miRollCall: ROLL };
/** How long a round of each takes, seconds, and when each beat starts (for the lab). */
export const roundOf = (m: MiMotion) => SCRIPTS[m].seq.reduce((n, [, h, mv = 0.5]) => n + h + mv, 0);
export const beatsOf = (m: MiMotion) => {
  let t = 0;
  return SCRIPTS[m].seq.map(([k, h, mv = 0.5]) => {
    const at = t;
    t += h + mv;
    return { k, at: Math.round(at * 10) / 10 };
  });
};
