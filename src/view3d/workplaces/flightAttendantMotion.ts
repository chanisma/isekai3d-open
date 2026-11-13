import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, wave, type Beat, type V } from './busDriverMotion';

/*
 * A 승무원's work at the 승무원 브리핑 센터 (2026-10-31, the workplace pipeline, at the user's request:
 * the work should look like the work). Every motion is a script: a round of beats, each with where the
 * dweller is (they walk between beats: down the aisle behind the cart, up the trainer's stairs, down the
 * slide sat with the legs out), where the hands are and where what moves is (the meal tray, the coffee
 * pot, the life vest, the magnets). The piece reads the same script by the same clock (flightAttendant.ts),
 * so a tray is on the cart until the beat the hands take it, and the door swings as it's pulled.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front),
 * and the whole body is posed from here (activity.ts spotPose only hands over).
 */
export type FaMotion =
  | 'faServe' | 'faZone' | 'faCalm' | 'faAnnounce'
  | 'faBrew' | 'faLoad'
  | 'faEvac'
  | 'faDemo' | 'faCpr'
  | 'faAssign' | 'faReview'
  | 'faBrief' | 'faQuiz'
  | 'faPack' | 'faGroom';
export const FA_MOTIONS = new Set<string>(['faServe', 'faZone', 'faCalm', 'faAnnounce', 'faBrew', 'faLoad', 'faEvac', 'faDemo', 'faCpr', 'faAssign', 'faReview', 'faBrief', 'faQuiz', 'faPack', 'faGroom']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const faPhase = (p: THREE.Vector3) => frac(p.x * 0.291 + p.z * 0.673);
type Seq = Array<[string, number, number?]>;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;

// ---------------------------------------------------------------------------------------------
// The script engine.

/** Where the dweller is in a beat. */
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Sat with the feet on `floor` (else stood). */
  sit?: boolean;
  floor?: number;
  legs?: 'out';
}
const st = (x: number, y: number, z: number, yaw: number, more: Partial<St> = {}): St => ({ x, y, z, yaw, ...more });
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
  /** Where what moves is now (null: not there, at rest or put away). */
  props?: Record<string, V | null | undefined>;
  /** Doors, lamps, counts: eased between beats. */
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  k: number;
  st: St;
  round: number;
  /** A point from the body: to their left, up from the feet (or the seat), ahead of them. */
  bd(side: number, up: number, ahead: number): V;
  /** 0 before beat `name`, easing up through it (from `a` to `b` of the way), 1 after it, this round. */
  p(name: string, a?: number, b?: number): number;
  /** This beat comes after `name`. */
  after(name: string): boolean;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  /** Extra turn of the body while the beat's held (a turn in front of the mirror). */
  spin?(k: string, u: number): number;
  key(k: string, u: number, c: Ctx): Key;
}
export interface FaNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number): { st: St; key: Key } {
  const at = s.at(k);
  const here = s.spin ? { ...at, yaw: at.yaw + s.spin(k, u) } : at;
  const idx = s.seq.findIndex(([q]) => q === k);
  const f = new THREE.Vector3(Math.sin(here.yaw), 0, Math.cos(here.yaw));
  const lf = new THREE.Vector3(Math.cos(here.yaw), 0, -Math.sin(here.yaw));
  const c: Ctx = {
    t,
    H,
    k: H / 1.6,
    st: here,
    round,
    bd: (side, up, ahead) => [here.x + lf.x * side + f.x * ahead, here.y + up, here.z + lf.z * side + f.z * ahead],
    p: (name, a = 0, b = 1) => {
      const i = s.seq.findIndex(([q]) => q === name);
      return idx > i ? 1 : idx < i ? 0 : sm(u, a, b);
    },
    after: (name) => idx > s.seq.findIndex(([q]) => q === name),
  };
  return { st: here, key: s.key(k, u, c) };
}
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.1), nod: n(a.nod, b.nod, 0.2), palms: n(a.palms, b.palms, 0.5), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
const angle = (a: number, b: number, e: number) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * e;
};
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function faNow(m: FaMotion, t: number, ph: number, H = 1.6): FaNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.n) : A;
  const e = b.e;
  const here: St = e < 0.5 ? { ...A.st } : { ...B.st };
  here.x = mixN(A.st.x, B.st.x, e);
  here.y = mixN(A.st.y, B.st.y, e);
  here.z = mixN(A.st.z, B.st.z, e);
  here.yaw = angle(A.st.yaw, B.st.yaw, e);
  if (A.st.floor !== undefined && B.st.floor !== undefined) here.floor = mixN(A.st.floor, B.st.floor, e);
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
export function faPose(m: FaMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = faNow(m, t, faPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const k = N.key;
  const pose: BodyPose = s.sit
    ? { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y, legs: s.legs }
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
/** Fingers on keys or a touch screen, one and then the other. */
const tap = (t: number, hz = 3) => 0.012 * Math.max(0, wave(t, hz));
/** A hand held open towards someone, moving as they talk. */
const openTo = (c: Ctx, side: number, far = 0.34, up = 0.64) => c.bd(side * 0.2, (up + 0.02 * wave(c.t, 0.6)) * c.H, far);
const atMouth = (c: Ctx, side = 0) => c.bd(side, 0.86 * c.H, 0.1);

// =============================================================================================
// The 객실 모형 (cabinMockup, 6 × 3): the deck raised a step; cut away on the near side. Seats face
// forward (-x); the aisle runs along x at z = A; the cockpit-end bulkhead at -x, the lavatory at +x.

export const CM = {
  deck: 0.12,
  A: 0.32,
  rows: [-1.55, -0.65, 0.25, 1.15] as const,
  far: [-1.2, -0.74, -0.28] as const,
  near: [0.92, 1.38] as const,
  seat: 0.56,
  /** How far ahead of a seat its tray table lies. */
  table: 0.42,
  tableY: 0.76,
  handset: [-2.48, 1.42, 0.54] as V,
  panel: [-2.33, 1.42, 0.52] as V,
  cartTop: 1.07,
  /** The bin door's lower edge, shut and up. */
  binShut: [0.25, 1.68, -0.5] as V,
  binUp: [0.25, 1.96, -0.11] as V,
};
const SEAT1: V = [CM.rows[2] - CM.table, CM.tableY, CM.far[2]];
const SEAT2: V = [CM.rows[1] - CM.table, CM.tableY, CM.near[0]];
const D = CM.deck;
const A = CM.A;
const cartAt = (x: number): V => [x, D, A];
const cartHandle = (x: number, side: number): V => [x + 0.33, D + 0.96, A + side * 0.1];

const SERVE: Script = {
  seq: [['brake', 1.0, 2.0], ['ask', 1.5], ['tray', 2.4], ['pour', 2.6, 1.4], ['ask2', 1.4], ['hand2', 2.4], ['thanks', 1.0, 2.6]],
  at(k) {
    if (k === 'brake') return st(2.05, D, A, -Math.PI / 2);
    if (k === 'ask' || k === 'tray' || k === 'pour') return st(0.1, D, A, -2.85);
    return st(-0.75, D, A, -0.39);
  },
  key(k, u, c) {
    const x = k === 'brake' ? 1.5 : k === 'ask' || k === 'tray' || k === 'pour' ? -0.45 : -1.3;
    const top = (dz: number): V => [x, CM.cartTop + 0.01, A + dz];
    const potRest = top(0.06);
    const cupRest = add(top(-0.08), 0.12, 0, 0);
    const n = { table1: c.p('ask', 0.3, 0.8) * (k === 'brake' ? 0 : 1), table2: c.p('ask2', 0.3, 0.8), look1: k === 'ask' || k === 'tray' || k === 'pour' ? 1 : 0, look2: k === 'ask2' || k === 'hand2' || k === 'thanks' ? 1 : 0, door: k === 'tray' ? sm(u, 0, 0.2) * (1 - sm(u, 0.85, 1)) : 0, brake: k === 'brake' ? 1 - sm(u, 0.4, 0.8) : 0 };
    const trayRest: V = [SEAT1[0], SEAT1[1] + 0.01, SEAT1[2]];
    const trayGone = c.round % 1 === 0 && k === 'brake';
    const base = { cart: cartAt(x), pot: potRest, cup: cupRest, can: top(-0.04), cup2: add(top(0.02), 0.14, 0, 0), tray: trayGone || !c.after('ask') ? null : trayRest, hand1: null, hand2: null, cupOn: null, canOn: null } as Record<string, V | null>;
    switch (k) {
      case 'brake':
        return { l: cartHandle(x, 1), r: cartHandle(x, -1), lean: 0.12, nod: 0.3 + 0.2 * (1 - sm(u, 0.3, 0.7)), palms: 0.6, gl: 0.9, gr: 0.9, props: base, n };
      case 'ask':
        return { l: cartHandle(x, 1), r: openTo(c, -1, 0.34, 0.66), palms: -0.2, gr: 0.1, gl: 0.9, lean: 0.14, nod: 0.1, props: base, n };
      case 'tray': {
        // Out of the cart's end door, up, over and down on the tray table.
        const from: V = [x + 0.36, D + 0.56, A];
        const held: V = [0.02, 1.05, 0.08];
        const here = u < 0.25 ? lerpV(from, add(from, 0.12, 0.05, 0), sm(u, 0.02, 0.25)) : u < 0.6 ? lerpV(add(from, 0.12, 0.05, 0), held, sm(u, 0.25, 0.6)) : lerpV(held, trayRest, sm(u, 0.6, 0.85));
        const down = u > 0.9;
        return { l: down ? cartHandle(x, 1) : add(here, -0.13, 0.015, 0), r: down ? openTo(c, -1, 0.3, 0.6) : add(here, 0.13, 0.015, 0), lean: 0.2 + 0.28 * sm(u, 0.6, 0.85) * (1 - sm(u, 0.88, 1)), nod: 0.4, palms: 1.1, gl: down ? 0.9 : 0.55, gr: 0.55, props: { ...base, tray: here }, n };
      }
      case 'pour': {
        // The pot in the right, a cup in the left held out over the tray; the coffee running; set down.
        const pourAt: V = [0.04, 1.08, -0.02];
        const pot = u < 0.2 ? lerpV(potRest, add(pourAt, 0.1, 0.14, 0), sm(u, 0, 0.2)) : u < 0.68 ? add(pourAt, 0.1, 0.14, 0) : lerpV(add(pourAt, 0.1, 0.14, 0), potRest, sm(u, 0.68, 0.92));
        const cup = u < 0.2 ? lerpV(cupRest, pourAt, sm(u, 0, 0.2)) : u < 0.68 ? pourAt : lerpV(pourAt, add(trayRest, 0.06, 0.03, 0.02), sm(u, 0.68, 0.84));
        const onTray = u >= 0.84;
        return { l: onTray ? cartHandle(x, 1) : add(cup, 0, 0, 0.0), r: add(pot, 0, 0.09, 0), lean: 0.22, nod: 0.5, palms: 0.2, gl: onTray ? 0.9 : 0.85, gr: 0.95, props: { ...base, pot, cup: onTray ? null : cup, cupOn: onTray ? add(trayRest, 0.06, 0.03, 0.02) : null }, n: { ...n, stream: u > 0.26 && u < 0.62 ? 1 : 0, cupFull: sm(u, 0.26, 0.62) } };
      }
      case 'ask2':
        return { l: cartHandle(x, 1), r: openTo(c, -1, 0.34, 0.62), palms: -0.2, gr: 0.1, gl: 0.9, lean: 0.14, nod: 0.12, props: { ...base, cupOn: add(trayRest, 0.06, 0.03, 0.02) }, n };
      case 'hand2': {
        // A can and a cup off the cart and across to the near passenger, who takes the cup.
        const near = add(SEAT2, 0.02, 0.05, -0.02);
        const cup = u < 0.3 ? lerpV(base.cup2!, c.bd(-0.14, 0.62 * c.H, 0.3), sm(u, 0, 0.3)) : u < 0.8 ? lerpV(c.bd(-0.14, 0.62 * c.H, 0.3), near, sm(u, 0.35, 0.72)) : near;
        const handsOff = u > 0.8;
        return { l: cartHandle(x, 1), r: handsOff ? openTo(c, -1, 0.26, 0.58) : add(cup, 0, 0.02, 0), lean: 0.22 * (handsOff ? 0.3 : 1), nod: 0.3, palms: 0.3, gl: 0.9, gr: handsOff ? 0.1 : 0.85, props: { ...base, cup2: cup, cupOn: add(trayRest, 0.06, 0.03, 0.02), hand2: sm(u, 0.55, 0.72) > 0 ? near : null }, n };
      }
      default:
        return { l: cartHandle(x, 1), r: cartHandle(x, -1), lean: 0.1, nod: 0.05, palms: 0.6, gl: 0.9, gr: 0.9, props: { ...base, cup2: add(SEAT2, 0.02, 0.05, -0.02), cupOn: add(trayRest, 0.06, 0.03, 0.02) }, n };
    }
  },
};

// 담당 구역: a bag off the aisle stowed in the bin, the bin shut, belts and a cup seen to before landing.
const ZONE_FAR = st(0.25, D, 0.1, Math.PI);
const ZONE: Script = {
  seq: [['walk', 0.4, 1.6], ['lift', 1.4], ['stow', 1.8], ['close', 1.5, 0.9], ['belt', 2.2], ['cup', 1.6, 0.9], ['blind', 1.6], ['tick', 1.8, 2.0]],
  at(k) {
    if (k === 'walk') return st(2.0, D, A, -Math.PI / 2);
    if (k === 'belt' || k === 'cup') return st(-0.72, D, 0.42, 0.1);
    if (k === 'blind') return st(-0.65, D, 0.12, Math.PI);
    if (k === 'tick') return st(-0.65, D, A, Math.PI / 2);
    return ZONE_FAR;
  },
  key(k, u, c) {
    const BIN = 1 - 0;
    const bagFloor: V = [0.42, D + 0.14, 0.34];
    // Its handle is taller than the bin: once in, the bag is simply gone behind the door's dark.
    const bagIn: V = [0.25, 1.72, -0.8];
    const binOpen = k === 'close' ? 1 - sm(u, 0.15, 0.85) : c.after('close') ? 0 : BIN;
    const clip: V = c.bd(0.1, 0.62 * c.H, 0.28);
    const n = { bin: k === 'walk' ? 1 : binOpen, belt: c.p('belt', 0.45, 0.65), cupGone: c.p('cup', 0.5, 0.7), blind: c.p('blind', 0.3, 0.8), tick: k === 'tick' ? sm(u, 0.1, 0.9) : 0, look2: k === 'belt' || k === 'cup' ? 1 : 0 };
    const base: Record<string, V | null> = { bag: k === 'walk' ? bagFloor : null, clip: null, cupHeld: null };
    switch (k) {
      case 'walk':
        return { nod: 0.15, props: base, n };
      case 'lift': {
        const bag = lerpV(bagFloor, c.bd(0, 0.62 * c.H, 0.24), sm(u, 0.35, 0.95));
        return { l: add(bag, 0.17, 0.05, 0), r: add(bag, -0.17, 0.05, 0), crouch: 0.75 * (1 - sm(u, 0.4, 0.95)), lean: 0.28, nod: 0.5, palms: 0.2, gl: 0.8, gr: 0.8, props: { ...base, bag }, n };
      }
      case 'stow': {
        const bag = lerpV(c.bd(0, 0.62 * c.H, 0.24), bagIn, sm(u, 0.05, 0.75));
        const lim = lerpV(bag, [0.25, 1.86, -0.38], sm(u, 0.5, 0.75));
        return { l: add(lim, 0.16, -0.04, 0.0), r: add(lim, -0.16, -0.04, 0.0), lean: -0.05, nod: -0.4, palms: 0.1, gl: 0.8, gr: 0.8, props: { ...base, bag: u < 0.7 ? bag : null }, n };
      }
      case 'close': {
        const edge = lerpV(CM.binUp, CM.binShut, sm(u, 0.15, 0.85));
        return { l: add(edge, 0.2, -0.015, 0.02), r: add(edge, -0.2, -0.015, 0.02), lean: 0.02, nod: -0.35, palms: 0.1, gl: 0.8, gr: 0.8, props: base, n };
      }
      case 'belt': {
        // The near passenger's belt: leaning in, the buckle pointed at, they click it.
        const buckle: V = [CM.rows[1] - 0.1, CM.seat + 0.1, CM.near[0]];
        return { l: c.bd(0.22, 0.56 * c.H, 0.08), r: add(buckle, 0.04, 0.1 - 0.06 * sm(u, 0.1, 0.4), -0.06), lean: 0.4, nod: 0.55, palms: 0.3, gr: 0.15, props: base, n };
      }
      case 'cup': {
        // The finished cup off the near passenger's table into the waste bag in the left hand.
        const was = add(SEAT2, 0, 0.05, 0);
        const bag = c.bd(0.28, 0.62 * c.H, 0.2);
        const cup = u < 0.5 ? was : lerpV(was, add(bag, 0, 0.1, 0), sm(u, 0.5, 0.8));
        return { l: add(bag, 0, 0.14, 0), r: add(cup, 0, 0.02, 0), lean: 0.34, nod: 0.45, gl: 0.9, gr: 0.8, props: { ...base, wasteBag: bag, cupHeld: u < 0.82 ? cup : null }, n };
      }
      case 'blind': {
        // Over the far row: lean in and a nod to the window passenger to raise the blind.
        return { l: c.bd(0.2, 0.6 * c.H, 0.1), r: c.bd(-0.1, 0.92 * c.H, 0.34 + 0.02 * wave(c.t, 1)), lean: 0.3, nod: -0.1, palms: -0.2, gr: 0.1, props: base, n };
      }
      default:
        return { l: clip, r: add(clip, -0.03 + 0.06 * frac(u * 3), 0.05, 0.0), nod: 0.55, palms: 0.9, gl: 0.8, gr: 0.85, props: { ...base, clip }, n };
    }
  },
};

// A nervous passenger calmed: their call light seen, crouched beside them, water, a blanket, breathing together.
const CALM_AT = st(-0.32, D, 0.42, 0.25);
const CALM: Script = {
  seq: [['see', 1.0, 1.6], ['down', 2.2], ['water', 2.6], ['blanket', 2.4], ['breath', 3.6], ['light', 1.5], ['smile', 1.4, 2.0]],
  at(k) {
    return k === 'see' ? st(2.0, D, A, -Math.PI / 2) : CALM_AT;
  },
  key(k, u, c) {
    const seatP: V = [CM.rows[1], CM.seat, CM.near[0]];
    const armrest: V = [seatP[0] + 0.1, seatP[1] + 0.22, seatP[2] - 0.26];
    const n = { call: k === 'light' ? 1 - sm(u, 0.4, 0.6) : k === 'smile' ? 0 : 1, calm: k === 'see' ? 0 : k === 'down' ? 0.1 : k === 'water' ? 0.3 : k === 'blanket' ? 0.5 : k === 'breath' ? 0.5 + 0.5 * sm(u, 0.2, 1) : 1, breath: k === 'breath' ? 0.5 + 0.5 * wave(c.t, 0.28) : 0.5, blanket: c.p('blanket', 0.5, 0.85) * (k === 'see' ? 0 : 1), look: k === 'see' ? 0 : 1, sipping: k === 'water' && u > 0.55 ? 1 : 0, table: 0 };
    const crouch = k === 'see' ? 0 : k === 'light' ? 0.25 : k === 'smile' ? 0 : 0.8;
    switch (k) {
      case 'see':
        return { nod: -0.1, r: c.bd(-0.2, 0.6 * c.H, 0.18), props: {}, n };
      case 'down':
        return { l: armrest, r: openTo(c, -1, 0.3, 0.4), crouch, lean: 0.1, nod: -0.1, palms: 0, gl: 0.3, gr: 0.1, props: {}, n };
      case 'water': {
        // From the water bottle on the belt pouch: poured... a small cup held across, they take it.
        const near: V = [seatP[0] + 0.14, seatP[1] + 0.34, seatP[2] - 0.2];
        const cup = u < 0.4 ? lerpV(c.bd(0.22, 0.42 * c.H, 0.18), near, sm(u, 0.05, 0.4)) : near;
        return { l: u < 0.45 ? add(cup, 0, 0.02, 0) : armrest, r: openTo(c, -1, 0.3, 0.4), crouch, lean: 0.14, nod: 0.05, gl: 0.85, gr: 0.1, palms: 0.1, props: { water: cup }, n };
      }
      case 'blanket': {
        // The folded blanket from the arm, shaken open over their lap.
        const held = c.bd(0, 0.42 * c.H, 0.24);
        const fold = lerpV(held, [seatP[0] + 0.2, seatP[1] + 0.2, seatP[2]], sm(u, 0.25, 0.7));
        return { l: add(fold, 0.14, 0.02, 0), r: add(fold, -0.14, 0.02, 0), crouch: crouch * 0.85, lean: 0.25, nod: 0.25, palms: 0.4, gl: 0.7, gr: 0.7, props: { folded: u < 0.6 ? fold : null }, n };
      }
      case 'breath': {
        // In and out, palms rising and falling, slowly, for them to follow.
        const b = wave(c.t, 0.28);
        return { l: c.bd(0.15, (0.42 + 0.05 * b) * c.H, 0.26), r: c.bd(-0.15, (0.42 + 0.05 * b) * c.H, 0.26), crouch, lean: 0.04, nod: -0.05, palms: 1.0, gl: 0.05, gr: 0.05, props: {}, n };
      }
      case 'light':
        // The call button on the armrest; off.
        return { l: armrest, r: [CM.rows[1] + 0.1, CM.seat + 0.27, CM.near[0] - 0.26], crouch, lean: 0.12, nod: 0.2, palms: 0.1, gr: 0.2, props: {}, n };
      default:
        return { l: c.bd(0.2, 0.56 * c.H, 0.14), r: c.bd(-0.2, 0.56 * c.H, 0.14), nod: 0.32, lean: 0.25, palms: 0.5, props: {}, n };
    }
  },
};

// The handset: the seat-belt sign on, the 딩동, the words read off a card to the rows, the handset back.
const ANN_AT = st(-2.0, D, 0.26, -1.0);
const ANN_TURN = st(-1.95, D, 0.26, 1.15);
const ANNOUNCE: Script = {
  seq: [['sign', 1.6], ['lift', 1.2], ['ding', 1.0], ['talk', 3.4], ['talkEn', 3.0], ['point', 2.0], ['hang', 1.4], ['mood', 1.4]],
  at(k) {
    return k === 'talk' || k === 'talkEn' || k === 'point' || k === 'ding' ? ANN_TURN : ANN_AT;
  },
  key(k, u, c) {
    const sign = k === 'sign' ? sm(u, 0.45, 0.6) : 1;
    const mood = k === 'mood' ? sm(u, 0.3, 0.9) : k === 'sign' ? 1 - sm(u, 0, 0.1) : 0;
    const n = { sign: k === 'mood' ? 1 - sm(u, 0.6, 0.9) : sign, mood, ding: k === 'ding' ? 1 : 0, look: k === 'talk' || k === 'talkEn' || k === 'point' ? 1 : 0, cardUp: k === 'talk' || k === 'talkEn' ? 1 : 0 };
    const rest = CM.handset;
    const ear = atMouth(c, -0.03);
    const card = c.bd(0.14, 0.66 * c.H, 0.26);
    switch (k) {
      case 'sign':
        return { l: c.bd(0.22, 0.56 * c.H, 0.08), r: add(CM.panel, 0, 0.0, 0.02), lean: 0.05, nod: -0.05, palms: 0.05, gr: 0.2, props: { handset: rest }, n };
      case 'lift': {
        const h = lerpV(rest, ear, sm(u, 0.1, 0.85));
        return { l: c.bd(0.22, 0.56 * c.H, 0.08), r: add(h, 0, -0.03, 0), lean: 0.04, nod: 0.05, palms: 0.1, gr: 0.95, props: { handset: h }, n };
      }
      case 'ding':
        return { l: c.bd(0.14, 0.64 * c.H, 0.24), r: add(ear, 0, -0.03, 0), lean: 0, nod: 0.08, palms: 0.3, gr: 0.95, gl: 0.7, props: { handset: ear, card }, n };
      case 'talk':
      case 'talkEn': {
        const reads = (k === 'talk' ? u : 1 - u) * 0.02;
        return { l: add(card, 0, -0.02, 0), r: add(ear, 0, -0.03, 0), lean: 0.02, nod: 0.26 - reads + 0.05 * wave(c.t, 0.8), palms: 0.3, gl: 0.8, gr: 0.95, props: { handset: ear, card }, n };
      }
      case 'point': {
        // A hand up to the sign: 안전벨트를 매 주세요.
        return { l: [c.st.x - 0.1, 1.82, 0.0], r: add(ear, 0, -0.03, 0), lean: -0.02, nod: -0.18, palms: -0.1, gl: 0.3, gr: 0.95, props: { handset: ear }, n };
      }
      case 'hang': {
        const h = lerpV(ear, rest, sm(u, 0.1, 0.85));
        return { l: c.bd(0.22, 0.56 * c.H, 0.08), r: add(h, 0, -0.03, 0), lean: 0.04, nod: 0.05, gr: 0.95, props: { handset: h }, n };
      }
      default:
        // The mood-light dial on the panel.
        return { l: c.bd(0.22, 0.56 * c.H, 0.08), r: add(CM.panel, 0.0, -0.09, 0.02), lean: 0.05, nod: 0, palms: 0.05, gr: 0.5, props: { handset: rest }, n };
    }
  },
};

// =============================================================================================
// 갤리 (faGalley, 3 × 1): the counter across, the cart bay at the left, brewer in the middle, oven at the right.

export const GL = {
  top: 0.98,
  front: 0.12,
  placard: [-0.36, 1.46, -0.42] as V,
  pot: [0.05, 1.04, -0.14] as V,
  brewBtn: [0.28, 1.28, -0.1] as V,
  tap: [-0.33, 1.2, -0.2] as V,
  oven: [0.95, 1.38, -0.1] as V,
  ovenHandle: [0.7, 1.38, 0.1] as V,
  latch: [0.58, 1.62, 0.05] as V,
  cart: [-1.08, 0.0, -0.1] as V,
  cartOut: 0.62,
  trays: [-0.42, 1.0, -0.12] as V,
};
const BREW: Script = {
  seq: [['read', 1.8], ['pot', 1.2], ['fill', 1.8], ['brew', 1.8, 1.0], ['oven', 2.6], ['latch', 1.4, 1.0], ['pour', 2.2], ['sip', 1.6]],
  at(k) {
    if (k === 'read') return st(-0.3, 0, 0.42, Math.PI);
    if (k === 'pot' || k === 'fill') return st(-0.1, 0, 0.42, Math.PI);
    if (k === 'oven' || k === 'latch') return st(0.86, 0, 0.56, Math.PI);
    return st(0.16, 0, 0.42, Math.PI);
  },
  key(k, u, c) {
    const potHome = GL.pot;
    const under: V = [GL.tap[0], GL.top + 0.09, GL.tap[2] + 0.06];
    const brewing = k === 'brew' ? sm(u, 0.4, 0.5) : c.after('brew') ? 1 : 0;
    const n = { brewing: k === 'pour' || k === 'sip' ? 0 : brewing, level: k === 'read' || k === 'pot' ? 0.1 : k === 'fill' ? 0.1 + 0.8 * sm(u, 0.2, 0.9) : 0.9, oven: k === 'oven' ? sm(u, 0.05, 0.3) * (1 - sm(u, 0.75, 0.98)) : 0, rack: k === 'oven' ? sm(u, 0.3, 0.55) * (1 - sm(u, 0.6, 0.8)) : 0, latch: k === 'latch' ? sm(u, 0.2, 0.7) : c.after('latch') ? 1 : 0, ovenOn: c.p('latch', 0.3, 0.6), tapRun: k === 'fill' && u > 0.2 && u < 0.9 ? 1 : 0, stream: k === 'pour' && u > 0.3 && u < 0.75 ? 1 : 0, page: Math.min(2, Math.floor(u * 3)) * (k === 'read' ? 1 : 0) };
    const held: V = c.bd(-0.1, 0.72 * c.H, 0.3);
    const cup: V = c.bd(0.1, 0.68 * c.H, 0.3);
    switch (k) {
      case 'read': {
        const line = Math.floor(u * 3);
        return { l: [GL.placard[0] + 0.02, GL.placard[1] + 0.1 - line * 0.09, GL.placard[2] + 0.04], r: c.bd(-0.2, 0.56 * c.H, 0.1), lean: 0.14, nod: -0.05, palms: 0, gl: 0.1, props: { pot: potHome }, n };
      }
      case 'pot': {
        const p = lerpV(potHome, under, sm(u, 0.15, 0.85));
        return { r: add(p, 0.08, 0.08, 0.04), l: c.bd(0.22, 0.56 * c.H, 0.08), lean: 0.2, nod: 0.4, gr: 0.95, palms: 0.2, props: { pot: p }, n };
      }
      case 'fill':
        return { r: add(under, 0.08, 0.08, 0.04), l: add(GL.tap, 0.02, 0.0, 0.06), lean: 0.22, nod: 0.45, gr: 0.95, gl: 0.7, palms: 0.2, props: { pot: under }, n };
      case 'brew': {
        const p = lerpV(under, potHome, sm(u, 0, 0.4));
        return { r: u < 0.45 ? add(p, 0.08, 0.08, 0.04) : add(GL.brewBtn, 0, 0, 0.03), l: c.bd(0.22, 0.56 * c.H, 0.08), lean: 0.2, nod: 0.3, gr: u < 0.45 ? 0.95 : 0.15, palms: 0.2, props: { pot: p }, n };
      }
      case 'oven': {
        const out = n.rack;
        const rack: V = add(GL.oven, 0, -0.08, 0.05 + 0.34 * out);
        return { l: u < 0.32 ? GL.ovenHandle : add(rack, 0.17, 0.04, 0.19), r: add(rack, -0.17, 0.04, 0.19), lean: 0.2, nod: 0.25, gl: 0.9, gr: 0.85, palms: 0.2, props: { pot: potHome }, n };
      }
      case 'latch':
        return { l: c.bd(0.22, 0.56 * c.H, 0.08), r: add(GL.latch, 0, 0, 0.03), lean: 0.14, nod: -0.1, palms: 0.1, gr: 0.9, props: { pot: potHome }, n };
      case 'pour': {
        const p = u < 0.25 ? lerpV(potHome, add(cup, -0.1, 0.14, 0), sm(u, 0, 0.25)) : u < 0.78 ? add(cup, -0.1, 0.14, 0) : lerpV(add(cup, -0.1, 0.14, 0), potHome, sm(u, 0.78, 1));
        return { l: add(cup, 0, -0.01, 0), r: add(p, 0.03, 0.09, 0.02), lean: 0.12, nod: 0.5, gl: 0.85, gr: 0.95, palms: 0.2, props: { pot: p, cup }, n };
      }
      default: {
        const s = lerpV(cup, c.bd(0.02, 0.85 * c.H, 0.11), sm(u, 0.1, 0.5) * (1 - sm(u, 0.8, 1)));
        return { l: add(s, 0, -0.01, 0), r: held, gl: 0.85, gr: 0.3, lean: 0.02, nod: -0.05 + 0.15 * sm(u, 0.1, 0.5), palms: 0.3, props: { pot: potHome, cup: s }, n };
      }
    }
  },
};
const LOAD_AT = st(-0.42, 0, 0.72, -1.25);
const LOAD_S = st(-0.46, 0, 0.42, Math.PI);
const LOAD: Script = {
  seq: [['unlatch', 1.3], ['pull', 1.5, 0.8], ['door', 1.0], ['trays', 4.2], ['drinks', 2.2], ['shut', 1.2, 0.8], ['push', 1.6]],
  at(k) {
    return k === 'unlatch' || k === 'push' ? st(-0.92, 0, 0.72, Math.PI) : k === 'pull' ? st(-1.06, 0, 1.0, Math.PI) : k === 'trays' ? LOAD_S : LOAD_AT;
  },
  key(k, u, c) {
    const cz = k === 'unlatch' ? GL.cart[2] : k === 'pull' ? mixN(GL.cart[2], GL.cartOut, sm(u, 0.1, 0.95)) : k === 'push' ? mixN(GL.cartOut, GL.cart[2], sm(u, 0.1, 0.95)) : GL.cartOut;
    const cartP: V = [GL.cart[0], 0, cz];
    const top = cartP[2];
    const pulled = k === 'pull' || k === 'push';
    const n = { latch: k === 'unlatch' ? sm(u, 0.2, 0.7) : k === 'push' ? 1 - sm(u, 0.7, 1) : 1, door: k === 'door' ? sm(u, 0, 0.7) : k === 'trays' || k === 'drinks' ? 1 : k === 'shut' ? 1 - sm(u, 0.1, 0.7) : 0, trays: k === 'trays' ? Math.floor(u * 3 + 0.4) + 0 : k === 'drinks' || k === 'shut' || k === 'push' ? 3 : 0, drinks: k === 'drinks' ? sm(u, 0.1, 0.95) * 3 : k === 'shut' || k === 'push' ? 3 : 0, stack: k === 'trays' ? 3 - Math.floor(u * 3 + 0.4) : k === 'drinks' || k === 'shut' || k === 'push' ? 0 : 3 };
    switch (k) {
      case 'unlatch':
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: [GL.cart[0], 1.0, 0.16], lean: 0.2, nod: 0.3, gr: 0.85, palms: 0.2, props: { cart: cartP }, n };
      case 'pull':
      case 'push': {
        const h: V = [cartP[0] + 0.08, 0.95, top + 0.28];
        return { l: add(h, 0.12, 0, 0), r: add(h, -0.12, 0, 0), lean: 0.14, nod: 0.25, gl: 0.9, gr: 0.9, palms: 0.5, props: { cart: cartP }, n: { ...n, pulled: pulled ? 1 : 0 } };
      }
      case 'door':
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: [cartP[0] + 0.15, 0.6, top + 0.32], lean: 0.32, nod: 0.5, gr: 0.85, palms: 0.2, crouch: 0.2, props: { cart: cartP }, n };
      case 'trays': {
        // Off the stack on the counter, turned round, and into the cart's runners, three times.
        const lap = frac(u * 3);
        const from = GL.trays;
        const into: V = [cartP[0] + 0.06, 0.72 - Math.floor(u * 3) * 0.14, top + 0.2];
        const tray = lap < 0.45 ? lerpV(from, c.bd(0, 0.66 * c.H, 0.3), sm(lap, 0.1, 0.45)) : lerpV(c.bd(0, 0.66 * c.H, 0.3), into, sm(lap, 0.5, 0.9));
        return { l: add(tray, 0.13, 0.015, 0), r: add(tray, -0.13, 0.015, 0), lean: 0.22, nod: 0.45, gl: 0.55, gr: 0.55, palms: 1.1, props: { cart: cartP, tray }, n };
      }
      case 'drinks': {
        const lap = frac(u * 3);
        const b: V = lerpV([GL.trays[0] + 0.08, GL.top + 0.08, GL.trays[2]], [cartP[0] - 0.12 + Math.floor(u * 3) * 0.12, 1.03, top], sm(lap, 0.1, 0.8));
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: add(b, 0, 0.06, 0), lean: 0.2, nod: 0.45, gr: 0.9, palms: 0.2, props: { cart: cartP, bottle: b }, n };
      }
      default:
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: [cartP[0] + 0.15, 0.6, top + 0.32], lean: 0.3, nod: 0.45, gr: 0.85, palms: 0.2, crouch: 0.15, props: { cart: cartP }, n };
    }
  },
};

// =============================================================================================
// 비상 탈출 슬라이드 (evacSlide, 5 × 2): a platform at -x with its stairs at the far left, the door in a
// wall across at x = door, the slide running down to +x, seen from the side.

export const EV = {
  deck: 1.0,
  door: 1.0,
  doorHalf: 0.46,
  slideEnd: -2.35,
  slideY: (x: number) => {
    const u = THREE.MathUtils.clamp((0.95 - x) / 3.3, 0, 1);
    return 1.0 - 0.88 * sm(u, 0, 1) * 0.5 - 0.88 * u * 0.5;
  },
  handle: [1.05, 1.98, 0.24] as V,
  lever: [1.05, 1.2, -0.24] as V,
  assist: [1.04, 1.9, -0.52] as V,
};
const SIT_ON = 0.07;
const EVAC: Script = {
  seq: [['foot', 2.0, 3.0], ['stair', 0.02, 1.7], ['top', 0.02, 0.8], ['check', 1.8], ['arm', 1.4], ['open', 2.0], ['hold', 3.4], ['sit', 0.8], ['slide', 0.2, 1.3], ['end', 0.5, 0.7]],
  at(k) {
    if (k === 'foot') return st(-2.08, 0, 0.74, -0.3);
    if (k === 'stair') return st(2.1, 0, 0.9, Math.PI);
    if (k === 'top') return st(2.1, EV.deck, -0.42, Math.PI);
    if (k === 'check' || k === 'arm' || k === 'open') return st(1.42, EV.deck, 0, -Math.PI / 2);
    if (k === 'hold') return st(1.26, EV.deck, -0.04, -Math.PI / 2);
    if (k === 'sit' || k === 'slide') return st(0.86, EV.deck + SIT_ON, 0, -Math.PI / 2, { sit: true, floor: EV.deck - 0.28, legs: 'out' });
    return st(-2.0, EV.slideY(-2.0) + SIT_ON, 0, -Math.PI / 2, { sit: true, floor: 0, legs: 'out' });
  },
  key(k, u, c) {
    const door = k === 'open' ? sm(u, 0.25, 0.95) * 1.55 : k === 'hold' || k === 'sit' || k === 'slide' || k === 'end' ? 1.55 : k === 'foot' ? 1.55 * (1 - sm(u, 0.5, 1)) : 0;
    const blow = k === 'open' ? sm(u, 0.4, 0.98) : k === 'hold' || k === 'sit' || k === 'slide' || k === 'end' ? 1 : k === 'foot' ? 1 - sm(u, 0.35, 1) : 0;
    const train = k === 'hold' ? sm(u, 0.2, 0.62) : 0;
    const n = { door, blow, lever: k === 'arm' ? sm(u, 0.2, 0.7) : k === 'open' || k === 'hold' || k === 'sit' || k === 'slide' || k === 'end' ? 1 : k === 'foot' ? 1 - sm(u, 0.4, 0.8) : 0, handle: k === 'open' ? sm(u, 0, 0.25) : door > 0.1 ? 1 : 0, lamp: k === 'open' || k === 'hold' ? 1 : 0, train, trainee: k === 'hold' && u > 0.2 ? 1 : 0, stood: k === 'hold' && u > 0.62 ? 1 : 0, green: k === 'check' ? sm(u, 0.4, 0.5) : k === 'arm' ? 1 : 0 };
    switch (k) {
      case 'foot': {
        // Clear of the slide, an arm waving the next ones away from its foot.
        const w = wave(c.t, 1.1);
        return { l: c.bd(0.3 + 0.06 * w, 0.92 * c.H, 0.22), r: c.bd(-0.26, 0.56 * c.H, 0.08), lean: 0, nod: -0.08, gl: 0.05, palms: -0.1, n };
      }
      case 'stair':
      case 'top':
        return { nod: 0.1, lean: 0.05, n };
      case 'check':
        // A hand to the door's window, looking out for fire, smoke or water.
        return { r: [EV.door + 0.03, 1.86, -0.12], l: c.bd(0.2, 0.62 * c.H, 0.14), lean: 0.1, nod: -0.06 + 0.1 * wave(c.t, 0.5), palms: 0, gr: 0.1, n };
      case 'arm':
        return { l: c.bd(0.2, 0.58 * c.H, 0.1), r: add(EV.lever, 0, -0.08 * sm(u, 0.2, 0.7), 0), lean: 0.42, nod: 0.55, gr: 0.9, palms: 0.3, crouch: 0.15, n };
      case 'open': {
        // The handle up, then the door pushed out on its arm.
        const a = door;
        const push: V = [EV.door - Math.sin(a) * 0.5, 1.72, -EV.doorHalf + Math.cos(a) * 0.72];
        return { r: [EV.assist[0], EV.assist[1], -0.3], l: u < 0.3 ? add(EV.handle, 0, 0.08 * sm(u, 0, 0.25), 0) : a < 0.6 ? push : c.bd(0.24, 0.72 * c.H, 0.34), lean: 0.14, nod: 0, gr: 0.9, gl: 0.85, palms: 0.1, n };
      }
      case 'hold': {
        // One hand on the assist handle, the other beating the way out: 벨트 풀어! 이리로!
        const w = wave(c.t, 1.5);
        return { r: [EV.assist[0] - 0.02, EV.assist[1], -0.44], l: c.bd(0.28 + 0.1 * w, (0.76 + 0.14 * w) * c.H, 0.24), lean: 0.02, nod: -0.05, gr: 0.95, gl: 0.2, palms: 0, n };
      }
      case 'sit':
        return { l: c.bd(0.28, 0.3, 0.1), r: c.bd(-0.28, 0.3, 0.1), lean: 0.05, nod: 0.05, gl: 0.3, gr: 0.3, palms: 0.5, n };
      case 'slide':
        return { l: c.bd(0.3, 0.58 * c.H, 0.34), r: c.bd(-0.3, 0.58 * c.H, 0.34), lean: 0.2, nod: -0.05, gl: 0.3, gr: 0.3, palms: 0.5, n };
      default:
        return { l: c.bd(0.3, 0.45 * c.H, 0.34), r: c.bd(-0.3, 0.45 * c.H, 0.34), lean: 0.05, nod: 0.15, palms: 0.5, n };
    }
  },
};

// =============================================================================================
// 안전 시범 장비 (safetyDemoKit, 3 × 2).

export const DK = {
  at: st(-0.55, 0, 0.12, 0.55),
  psu: [-0.32, 1.98, 0.36] as V,
  /** The 응급처치 manikin's chest (lying along z, head to -z) and the AED's case. */
  chest: [0.02, 0.2, 0.22] as V,
  head: [0.02, 0.14, -0.26] as V,
  aed: [-1.2, 0.33, -0.72] as V,
};
const DEMO: Script = {
  seq: [['belt', 3.0], ['mask', 3.6], ['vest', 2.4], ['tie', 1.8], ['blow', 2.2], ['exits', 3.0], ['card', 2.2]],
  at: () => DK.at,
  key(k, u, c) {
    const H = c.H;
    const n = { mask: k === 'mask' ? 1 : 0, psu: k === 'mask' ? sm(u, 0, 0.12) : 0, worn: k === 'tie' || k === 'blow' || k === 'exits' || k === 'card' ? 1 : k === 'vest' ? sm(u, 0.45, 0.8) : 0, puff: k === 'blow' ? sm(u, 0.15, 0.95) : k === 'exits' || k === 'card' ? 1 : 0, lit: k === 'exits' || k === 'card' ? 1 : 0, nod: k === 'exits' ? 1 : 0 };
    const vestAt: V = k === 'vest' ? lerpV(c.bd(0, 0.46 * H, 0.26), c.bd(0, 0.82 * H, 0.08), sm(u, 0.05, 0.45)) : c.bd(0, 0.72 * H, 0.03);
    const vest = n.worn > 0.5 ? c.bd(0, 0.69 * H, 0.03) : k === 'vest' ? vestAt : null;
    switch (k) {
      case 'belt': {
        // The two ends held up apart, clicked at the waist, tugged tight, the lever lifted.
        const up = u < 0.33;
        const y = up ? 0.8 : 0.58;
        const gap = up ? 0.2 : 0.035;
        const tug = u > 0.66 && u < 0.84 ? 0.1 * sm(u, 0.66, 0.72) : 0;
        const lL = c.bd(gap + tug, y * H, 0.26);
        const lR = c.bd(-gap, y * H + (u > 0.84 ? 0.05 : 0), 0.26);
        return { l: lL, r: lR, nod: up ? -0.05 : 0.3, gl: 0.8, gr: 0.8, palms: 0.5, props: { beltL: add(lL, 0, 0.01, 0), beltR: add(lR, 0, 0.01, 0), vest: null, mask: null, card: null }, n };
      }
      case 'mask': {
        // Up to the mask that's dropped, pulled down to the face, the band over the head, breathing.
        const top = add(DK.psu, 0, -0.34, 0);
        const face = c.bd(0, 0.87 * H, 0.1);
        const mk = u < 0.3 ? top : lerpV(top, face, sm(u, 0.3, 0.55));
        return { l: add(mk, 0.05, -0.02, -0.02), r: u > 0.62 && u < 0.78 ? c.bd(-0.09, 0.95 * H, -0.03) : add(mk, -0.05, -0.02, -0.02), nod: u < 0.3 ? -0.45 : -0.02 + 0.03 * wave(c.t, 0.5), lean: 0, gl: 0.8, gr: 0.8, palms: 0.2, props: { mask: mk, vest: null, card: null }, n };
      }
      case 'vest':
      case 'tie': {
        if (k === 'tie') {
          // The tapes round the waist, tied in front.
          const a = u * Math.PI * 6;
          const tieAt = c.bd(0, 0.56 * H, 0.2);
          return { l: add(tieAt, 0.05 + 0.02 * Math.cos(a), 0.02 * Math.sin(a), 0), r: add(tieAt, -0.05 - 0.02 * Math.cos(a), -0.02 * Math.sin(a), 0), nod: 0.5, gl: 0.8, gr: 0.8, palms: 0.5, props: { vest, mask: null, card: null }, n };
        }
        return { l: add(vest!, 0.16, 0.0, 0.04), r: add(vest!, -0.16, 0.0, 0.04), nod: 0.0, gl: 0.7, gr: 0.7, palms: 0.1, props: { vest, mask: null, card: null }, n };
      }
      case 'blow': {
        // The red tube to the mouth, a hand on the toggle after.
        const tube = atMouth(c, 0.0);
        return { l: add(tube, 0.03, -0.03, 0), r: c.bd(-0.15, 0.63 * H, 0.12), nod: 0.04, gl: 0.8, gr: 0.5, palms: 0.2, props: { vest, tube, mask: null, card: null }, n };
      }
      case 'exits': {
        // Two fingers forward, both arms, out to the sides, and back: the exits this way and that way.
        const w = u < 0.34 ? 0 : u < 0.67 ? 1 : 2;
        const spread = w === 0 ? 0.22 : w === 1 ? 0.5 : 0.4;
        const ahead = w === 0 ? 0.5 : w === 1 ? 0.12 : 0.34;
        return { l: c.bd(spread, 0.8 * H, ahead), r: c.bd(-spread, 0.8 * H, ahead), nod: -0.05, gl: 0.65, gr: 0.65, palms: 0.1, lean: 0, props: { vest, mask: null, card: null }, n };
      }
      default: {
        const card = c.bd(0, 0.78 * H, 0.32);
        return { l: add(card, 0.11, -0.05, 0), r: add(card, -0.11, -0.05, 0), nod: 0.0, gl: 0.8, gr: 0.8, palms: 0.1, props: { vest, card, mask: null }, n };
      }
    }
  },
};
const CPR_AT = st(-0.42, 0, 0.22, Math.PI / 2);
const CPR_UP = st(-0.42, 0, 0.42, 0.9);
const CPR: Script = {
  seq: [['check', 2.2], ['call', 1.6], ['aed', 2.2], ['pads', 1.6], ['press', 4.2], ['breath', 2.0], ['show', 2.0]],
  at: (k) => (k === 'show' || k === 'call' ? CPR_UP : CPR_AT),
  key(k, u, c) {
    const H = c.H;
    const ch = DK.chest;
    const n = { manikin: 1, pads: k === 'pads' ? sm(u, 0.2, 0.7) : k === 'press' || k === 'breath' || k === 'show' ? 1 : 0, aedOpen: k === 'aed' ? sm(u, 0.6, 0.9) : k === 'pads' || k === 'press' || k === 'breath' ? 1 : 0, press: k === 'press' ? Math.max(0, wave(c.t, 1.9)) : 0, count: k === 'press' ? Math.floor(u * 30) : 0, callT: k === 'call' ? 1 : 0, trainee: 1, lift: k === 'breath' ? 0.5 + 0.5 * wave(c.t, 0.8) : 0 };
    const crouch = k === 'show' || k === 'call' ? 0 : 0.92;
    const aedRest = DK.aed;
    const aedFloor: V = [-0.42, 0.11, 0.62];
    switch (k) {
      case 'check': {
        // A tap on the shoulders and an ear to the mouth: 괜찮으세요?
        const shake = 0.02 * wave(c.t, 3);
        return { l: add(ch, 0.14 + shake, 0.05, -0.16), r: add(ch, -0.12 + shake, 0.05, -0.16), crouch, lean: 0.55, nod: 0.5, palms: 1.0, props: { aed: aedRest }, n };
      }
      case 'call':
        // Up, an arm straight at the trainee: 119 불러 주세요!
        return { l: c.bd(0.22, 0.56 * H, 0.1), r: c.bd(-0.16, 0.8 * H, 0.5), nod: -0.05, palms: 0.1, gr: 0.75, props: { aed: aedRest }, n };
      case 'aed': {
        const a = lerpV(aedRest, aedFloor, sm(u, 0.15, 0.7));
        return { l: add(a, 0.1, 0.12, 0), r: add(a, -0.1, 0.12, 0), crouch: crouch * sm(u, 0.3, 0.7), lean: 0.4, nod: 0.45, gl: 0.8, gr: 0.8, palms: 0.5, props: { aed: a }, n };
      }
      case 'pads': {
        const p = lerpV(add(aedFloor, 0.02, 0.1, -0.1), add(ch, 0.05, 0.06, 0.02), sm(u, 0.1, 0.5));
        return { l: add(ch, 0.1, 0.07, 0.1), r: add(p, 0, 0.02, 0), crouch, lean: 0.5, nod: 0.55, gr: 0.7, palms: 1.0, props: { aed: aedFloor }, n };
      }
      case 'press': {
        // Arms locked, shoulders over the chest, thirty at two a second.
        const d = 0.035 * n.press;
        return { l: add(ch, 0.03, 0.09 - d, 0), r: add(ch, -0.03, 0.1 - d, 0.01), crouch, lean: 0.78 + 0.08 * n.press, nod: 0.4, gl: 0.2, gr: 0.2, palms: 1.2, props: { aed: aedFloor }, n };
      }
      case 'breath': {
        // The head tilted back with two fingers under the chin, the bag squeezed.
        const b = add(DK.head, -0.02, 0.11, 0.0);
        return { l: add(b, 0.06, 0.05 - 0.015 * n.lift, 0), r: add(b, -0.06, 0.05 - 0.015 * n.lift, 0), crouch, lean: 0.55, nod: 0.55, gl: 0.9, gr: 0.9, palms: 0.7, props: { aed: aedFloor, bvm: b }, n };
      }
      default:
        return { l: c.bd(0.22, 0.62 * H, 0.2), r: openTo(c, -1, 0.42, 0.62), nod: 0, palms: -0.2, gr: 0.1, props: { aed: aedFloor }, n };
    }
  },
};

// =============================================================================================
// 브리핑 스크린 (faBriefBoard, 3 × 1).

export const BB = { z: -0.36, roster: -1.08, slots: [[0.02, 1.68], [0.62, 1.68], [0.32, 1.28]] as Array<[number, number]> };
const BB_AT = st(0.2, 0, 0.14, Math.PI);
const BB_L = st(-0.72, 0, 0.14, Math.PI);
const BB_TURN = st(0.05, 0, 0.3, 0.1);
const magnetAt = (i: number) => [BB.roster, 1.74 - i * 0.2, BB.z + 0.02] as V;
const slotAt = (i: number) => [BB.slots[i][0], BB.slots[i][1], BB.z + 0.02] as V;
const ASSIGN: Script = {
  seq: [['read', 1.4, 0.8], ['m0', 1.8, 0.8], ['m1', 1.8, 0.8], ['m2', 1.8], ['call', 2.4], ['clear', 1.6]],
  at: (k) => (k === 'read' ? BB_L : k === 'call' ? BB_TURN : BB_AT),
  key(k, u, c) {
    const placed = (i: number) => (k === `m${i}` ? 0 : c.after(`m${i}`) && k !== 'read' ? 1 : 0);
    const mag = (i: number): V => {
      if (k === `m${i}`) return lerpV(magnetAt(i), slotAt(i), sm(u, 0.2, 0.8));
      if (k === 'clear') return lerpV(slotAt(i), magnetAt(i), sm(u, 0.1 + i * 0.25, 0.3 + i * 0.25));
      return placed(i) ? slotAt(i) : magnetAt(i);
    };
    const props = { m0: mag(0), m1: mag(1), m2: mag(2) };
    const hL = c.bd(0.22, 0.56 * c.H, 0.08);
    const n = { nod: k === 'call' ? 1 : 0, answered: k === 'call' && u > 0.5 ? 1 : 0, look: 1 };
    switch (k) {
      case 'read':
        return { l: hL, r: [BB.roster, 1.5 + 0.2 * wave(c.t, 0.4), BB.z + 0.05], nod: -0.15, palms: 0, gr: 0.2, props, n };
      case 'call':
        return { l: hL, r: openTo(c, -1, 0.34, 0.66), nod: 0.0, palms: -0.2, gr: 0.05, props, n };
      case 'clear': {
        const i = Math.min(2, Math.floor((u - 0.1) / 0.25));
        return { l: hL, r: i >= 0 ? add(props[`m${i}` as 'm0'], 0, 0, 0.03) : hL, nod: -0.1, palms: 0, gr: 0.3, props, n };
      }
      default: {
        const i = Number(k[1]);
        return { l: hL, r: add(mag(i), 0, 0, 0.03), nod: -0.12, palms: 0, gr: 0.5, props, n };
      }
    }
  },
};
const REVIEW: Script = {
  seq: [['swipe', 1.2], ['point', 2.4], ['turn', 2.4], ['swipe2', 1.2], ['mark', 2.6], ['close', 2.2]],
  at: (k) => (k === 'turn' || k === 'close' ? BB_TURN : BB_AT),
  key(k, u, c) {
    const hL = c.bd(0.22, 0.56 * c.H, 0.08);
    const page = k === 'swipe' ? (u > 0.6 ? 1 : 0) : k === 'point' || k === 'turn' ? 1 : k === 'swipe2' ? (u > 0.6 ? 2 : 1) : 2;
    const n = { page, nod: k === 'turn' ? 1 : 0, answered: k === 'turn' && u > 0.4 ? 1 : 0, marked: k === 'mark' ? sm(u, 0.15, 0.85) : k === 'close' ? 1 : 0, look: 1 };
    switch (k) {
      case 'swipe':
      case 'swipe2':
        return { l: hL, r: [0.5 - 0.7 * sm(u, 0.1, 0.8), 1.5, BB.z + 0.05], nod: -0.1, palms: 0, gr: 0.2, n };
      case 'point': {
        const b = Math.floor(u * 4);
        return { l: hL, r: [-0.3 + b * 0.26, 1.28 + b * 0.1, BB.z + 0.05], nod: -0.1, palms: 0, gr: 0.25, n };
      }
      case 'turn':
        return { l: c.bd(0.2, 0.62 * c.H, 0.2), r: openTo(c, -1, 0.34, 0.66), nod: 0.0, palms: -0.2, gr: 0.05, n };
      case 'mark':
        return { l: hL, r: [-0.4 + 0.8 * sm(u, 0.15, 0.85), 1.3 + 0.02 * wave(c.t, 3), BB.z + 0.05], nod: -0.1, palms: 0, gr: 0.75, n };
      default:
        return { l: c.bd(0.14, 0.58 * c.H, 0.2), r: c.bd(-0.14, 0.58 * c.H, 0.2), nod: 0.25 + 0.2 * wave(c.t, 0.8), palms: 0.8, gl: 0.3, gr: 0.3, n };
    }
  },
};

// =============================================================================================
// 브리핑 테이블 (faBriefTable, 3 × 2): the dweller sat at the far side facing the room, the manager at the
// table's right end.

export const BT = { top: 0.74, seat: st(-0.4, 0.47, -0.82, 0, { sit: true, floor: 0 }), tablet: [-0.4, 0.765, -0.36] as V, binder: [-0.42, 0.765, -0.34] as V, pen: [-0.14, 0.765, -0.3] as V };
const QUIZ: Script = {
  seq: [['pick', 1.2], ['q0', 2.4], ['q1', 2.4], ['q2', 2.4], ['score', 2.2], ['down', 1.4]],
  at: () => BT.seat,
  key(k, u, c) {
    const up: V = [BT.tablet[0], BT.top + 0.2, BT.tablet[2] - 0.08];
    const tab = k === 'pick' ? lerpV(BT.tablet, up, sm(u, 0.1, 0.9)) : k === 'down' ? lerpV(up, BT.tablet, sm(u, 0.1, 0.9)) : up;
    const n = { screen: k === 'pick' ? 0 : k === 'q0' ? 1 + (u > 0.7 ? 1 : 0) : k === 'q1' ? 3 + (u > 0.7 ? 1 : 0) : k === 'q2' ? 5 + (u > 0.7 ? 1 : 0) : k === 'score' ? 7 : 0, tilt: k === 'pick' ? sm(u, 0.1, 0.9) : k === 'down' ? 1 - sm(u, 0.1, 0.9) : 1, manager: k === 'score' ? 1 : 0 };
    const hold = (dx: number): V => add(tab, dx, -0.04, 0.02);
    if (k === 'pick' || k === 'down') return { l: hold(0.13), r: hold(-0.13), lean: 0.16, nod: 0.42, gl: 0.7, gr: 0.7, palms: 0.5, props: { tablet: tab }, n };
    if (k === 'score') {
      // Shown across to the manager, a thumb up from them.
      return { l: hold(0.13), r: openTo(c, -1, 0.3, 0.35), lean: 0.1, nod: 0.05, gl: 0.7, gr: 0.1, palms: 0, props: { tablet: tab }, n };
    }
    const choice = k === 'q0' ? 0.05 : k === 'q1' ? -0.05 : 0.02;
    return { l: hold(0.14), r: add(tab, choice + 0.04 * wave(c.t, 0.4), 0.01 + tap(c.t, 1.3), 0.02), lean: 0.18, nod: 0.46, gl: 0.7, gr: 0.3, palms: 0.9, props: { tablet: tab }, n };
  },
};
const BRIEF: Script = {
  seq: [['open', 1.4], ['note', 3.0], ['listen', 2.6], ['raise', 2.0], ['answer', 2.4], ['note2', 2.0], ['shut', 1.2]],
  at: () => BT.seat,
  key(k, u, c) {
    const bd = BT.binder;
    const n = { open: k === 'open' ? sm(u, 0.2, 0.85) : k === 'shut' ? 1 - sm(u, 0.15, 0.8) : 1, manager: k === 'listen' ? 1 : k === 'raise' ? 2 : k === 'answer' ? 3 : 0, written: k === 'note' ? sm(u, 0, 1) * 0.5 : k === 'note2' ? 0.5 + sm(u, 0, 1) * 0.5 : k === 'shut' || k === 'listen' || k === 'raise' || k === 'answer' ? (k === 'shut' ? 1 : 0.5) : 0, crew: k === 'answer' ? 1 : 0 };
    const pen = (x: number): V => add(bd, x + 0.03 * wave(c.t, 0.8), 0.02 + 0.005 * wave(c.t, 6), 0.02 * wave(c.t, 1.9));
    switch (k) {
      case 'open':
        return { l: add(bd, 0.14, 0.02 + 0.1 * Math.sin(u * Math.PI), 0), r: add(bd, -0.14, 0.01, 0), lean: 0.2, nod: 0.45, gl: 0.5, gr: 0.3, palms: 0.9, n };
      case 'note':
      case 'note2':
        return { l: add(bd, 0.15, 0.005, 0.02), r: pen(k === 'note' ? -0.05 : 0.0), lean: 0.22, nod: 0.5, gl: 0.2, gr: 0.85, palms: 1.2, n };
      case 'listen':
        return { l: add(bd, 0.13, 0.01, 0.06), r: add(bd, -0.13, 0.01, 0.06), lean: 0.1, nod: 0.05 + 0.08 * wave(c.t, 0.5), gl: 0.3, gr: 0.6, palms: 0.8, n };
      case 'raise': {
        const up = c.bd(-0.2, 0.46 * c.H + 0.42 * sm(u, 0.1, 0.45), 0.1);
        return { l: add(bd, 0.13, 0.01, 0.06), r: up, lean: 0.02, nod: -0.05, gl: 0.3, gr: 0.1, palms: -0.1, n };
      }
      case 'answer':
        return { l: add(bd, 0.13, 0.01, 0.06), r: openTo(c, -1, 0.34, 0.34), lean: 0.08, nod: 0.05, gr: 0.05, palms: -0.2, n };
      default:
        return { l: add(bd, 0.14, 0.02 + 0.1 * Math.sin(u * Math.PI), 0), r: add(bd, -0.14, 0.01, 0), lean: 0.2, nod: 0.45, gl: 0.5, gr: 0.3, palms: 0.9, n };
    }
  },
};

// =============================================================================================
// 크루 라커 (faCrewLocker, 3 × 1): a run of lockers, a bench to the right with what's packed.

export const LK = { door: [-0.24, 1.14, 0.06] as V, inBag: [-0.24, 0.72, -0.16] as V, bench: [0.72, 0.5, 0.34] as V, items: [[0.42, 0.5, 0.34], [0.32, 0.5, 0.26], [0.42, 0.5, 0.26]] as V[], y: 0.46 };
const LK_AT = st(-0.1, 0, 0.56, Math.PI);
const LK_B = st(0.72, 0, 0.78, Math.PI);
const PACK: Script = {
  seq: [['open', 1.3], ['take', 1.6, 1.2], ['lay', 1.2], ['pack', 4.2], ['zip', 1.6], ['pull', 1.4, 1.5], ['roll', 0.6, 1.5], ['back', 1.0, 0.8], ['shut', 1.5]],
  at(k) {
    if (k === 'open' || k === 'take' || k === 'shut') return LK_AT;
    if (k === 'lay' || k === 'pack' || k === 'zip' || k === 'pull') return LK_B;
    if (k === 'roll') return st(-1.15, 0, 0.82, -Math.PI / 2);
    return st(-0.05, 0, 0.82, Math.PI / 2);
  },
  key(k, u, c) {
    const door = k === 'open' ? sm(u, 0.2, 0.9) : k === 'shut' ? 1 - sm(u, 0.15, 0.85) : 1;
    const bench = LK.bench;
    const walkBag = (s: number): V => c.bd(s, 0.08, -0.32);
    const packN = k === 'pack' ? Math.floor(u * 3) : 0;
    const n = { door, lid: k === 'lay' ? sm(u, 0.4, 0.9) : k === 'pack' ? 1 : k === 'zip' ? 1 - sm(u, 0.1, 0.9) : 0, packed: k === 'pack' ? packN : k === 'zip' || k === 'pull' || k === 'roll' || k === 'back' || k === 'shut' ? 3 : 0, handle: k === 'pull' ? sm(u, 0.1, 0.8) : k === 'roll' || k === 'back' ? 1 : 0, tilt: k === 'pull' ? sm(u, 0.5, 1) : k === 'roll' || k === 'back' ? 1 : 0, zip: k === 'zip' ? sm(u, 0.1, 0.9) : 0 };
    const hL = c.bd(0.22, 0.56 * c.H, 0.08);
    const trolley = c.bd(-0.1, 0.84, -0.14);
    switch (k) {
      case 'open':
        return { l: hL, r: add(LK.door, 0, 0, 0.0), lean: 0.2, nod: 0, palms: 0.1, gr: 0.85, props: { bag: LK.inBag }, n };
      case 'take': {
        const b = lerpV(LK.inBag, c.bd(0, 0.62 * c.H, 0.26), sm(u, 0.2, 0.9));
        return { l: add(b, 0.14, 0.07, 0), r: add(b, -0.14, 0.07, 0), lean: 0.2, nod: 0.3, gl: 0.8, gr: 0.8, palms: 0.2, props: { bag: b }, n };
      }
      case 'lay': {
        const b = lerpV(c.bd(0, 0.62 * c.H, 0.26), bench, sm(u, 0, 0.45));
        return { l: add(b, 0.14, 0.07, 0), r: add(b, -0.14, 0.07, 0), lean: 0.3, nod: 0.5, gl: 0.8, gr: 0.8, palms: 0.2, props: { bag: b }, n };
      }
      case 'pack': {
        const lap = frac(u * 3);
        const item = lerpV(LK.items[packN], add(bench, 0, 0.1, 0), sm(lap, 0.2, 0.7));
        return { l: add(bench, 0.14, 0.08, 0.1), r: add(item, 0, 0.03, 0), lean: 0.36, nod: 0.55, gl: 0.3, gr: 0.75, palms: 0.5, props: { bag: bench, item: lap < 0.85 ? item : null }, n };
      }
      case 'zip': {
        const z = n.zip;
        return { l: add(bench, 0.14, 0.14, 0.04), r: add(bench, 0.18 - 0.36 * z, 0.16, 0.13), lean: 0.34, nod: 0.5, gl: 0.3, gr: 0.85, palms: 0.5, props: { bag: bench }, n };
      }
      case 'pull': {
        const b = lerpV(bench, c.bd(-0.12, 0, 0.16), sm(u, 0.15, 0.7));
        return { l: hL, r: lerpV(add(bench, 0, 0.22, 0), add(b, 0, 0.74, 0), sm(u, 0.15, 0.7)), lean: 0.18, nod: 0.3, gr: 0.9, palms: 0.5, props: { bag: b }, n };
      }
      case 'roll':
      case 'back':
        // Trundled along behind by its handle.
        return { l: hL, r: trolley, nod: 0, lean: 0.03, gr: 0.9, palms: 0.5, props: { bag: walkBag(-0.14) }, n };
      default:
        return { l: hL, r: add(LK.door, 0, 0, 0.0), lean: 0.14, nod: 0, palms: 0.1, gr: 0.85, props: { bag: LK.inBag }, n };
    }
  },
};

// =============================================================================================
// 그루밍 코너 (faGroomCorner, 3 × 1): the uniform rail at the left, the lit mirror in the middle, the
// 용모 복장 점검표 at the right; the senior purser checks from beside.

export const GC = { mirror: [0.42, 1.1, -0.38] as V, scarfRail: [-0.34, 1.52, -0.08] as V, capShelf: [-0.04, 1.2, -0.26] as V, lightBtn: [0.97, 1.2, -0.3] as V, sheet: [1.2, 1.3, -0.33] as V };
const GC_AT = st(0.42, 0, 0.3, Math.PI);
const GROOM: Script = {
  seq: [['light', 1.2, 0.8], ['rail', 1.2, 0.8], ['scarf', 3.2], ['cap', 2.0], ['hair', 1.8], ['badge', 1.6], ['turn', 3.0], ['tick', 2.2, 0.7], ['hang', 1.2]],
  at(k) {
    if (k === 'rail' || k === 'hang') return st(-0.34, 0, 0.42, Math.PI);
    if (k === 'tick') return st(0.5, 0, 0.3, 2.4);
    if (k === 'light') return st(0.7, 0, 0.3, Math.PI);
    return GC_AT;
  },
  spin: (k, u) => (k === 'turn' ? Math.PI * 2 * sm(u, 0.05, 0.9) : 0),
  key(k, u, c) {
    const H = c.H;
    const hL = c.bd(0.22, 0.56 * H, 0.08);
    const hR = c.bd(-0.22, 0.56 * H, 0.08);
    const neck = c.bd(0, 0.79 * H, 0.08);
    const head = c.bd(0, 0.985 * H, 0);
    const worn = c.after('scarf') && !c.after('tick');
    const n = { lights: k === 'light' ? sm(u, 0.4, 0.5) : k === 'hang' ? 1 - sm(u, 0.5, 0.9) : 1, scarfOn: k === 'scarf' ? sm(u, 0.2, 0.3) : worn || k === 'tick' ? 1 : 0, capOn: k === 'cap' ? sm(u, 0.55, 0.75) : c.after('cap') && k !== 'hang' ? 1 : 0, badgeOn: k === 'badge' ? sm(u, 0.5, 0.7) : c.after('badge') && k !== 'hang' ? 1 : 0, ticks: k === 'tick' ? sm(u, 0.1, 0.9) * 4 : k === 'hang' ? 4 : k === 'turn' ? 2 * sm(u, 0.2, 0.9) : k === 'badge' ? 1 : 0, senior: k === 'turn' || k === 'tick' ? 1 : 0, hairT: 0 };
    const props: Record<string, V | null> = { scarf: k === 'rail' || k === 'hang' ? null : neck, cap: k === 'cap' ? lerpV(GC.capShelf, head, sm(u, 0.1, 0.75)) : n.capOn > 0.5 ? head : null, badge: n.badgeOn > 0.5 ? c.bd(0.11, 0.7 * H, 0.1) : null, held: null };
    switch (k) {
      case 'light':
        return { l: hL, r: add(GC.lightBtn, 0, 0, 0.03), nod: 0, lean: 0.1, palms: 0, gr: 0.2, props: { ...props, scarf: null }, n };
      case 'rail': {
        const held = lerpV(GC.scarfRail, c.bd(0.04, 0.72 * H, 0.26), sm(u, 0.3, 0.95));
        return { l: hL, r: add(held, 0, 0.02, 0), nod: -0.1, gr: 0.75, palms: 0.1, props: { ...props, scarf: null, held }, n };
      }
      case 'scarf': {
        const a = u * Math.PI * 6;
        return { l: add(neck, 0.05 + 0.02 * Math.cos(a), 0.02 * Math.sin(a), 0.1), r: add(neck, -0.05 - 0.02 * Math.cos(a), -0.02 * Math.sin(a), 0.1), nod: 0.15, gl: 0.75, gr: 0.75, palms: 0.5, props, n };
      }
      case 'cap': {
        const p = props.cap!;
        return { l: add(p, 0.09, 0.01, 0.0), r: add(p, -0.09, 0.01, 0.0), nod: -0.05, lean: 0, gl: 0.7, gr: 0.7, palms: 0.1, props, n };
      }
      case 'hair': {
        const w = 0.012 * wave(c.t, 1.4);
        return { l: c.bd(0.11 + w, 0.92 * H, -0.05), r: c.bd(-0.11 - w, 0.92 * H, -0.05), nod: 0.05, gl: 0.5, gr: 0.5, palms: 0.1, props, n };
      }
      case 'badge':
        return { l: c.bd(0.15, 0.68 * H, 0.14), r: c.bd(0.08, 0.72 * H, 0.14), nod: 0.45, gl: 0.3, gr: 0.8, palms: 0.5, props, n };
      case 'turn':
        return { l: hL, r: hR, nod: -0.02, lean: 0, props, n };
      case 'tick':
        // The sheet's tick looked over, a nod.
        return { l: hL, r: openTo(c, -1, 0.28, 0.6), nod: 0.3 * Math.max(0, wave(c.t, 0.6)), gr: 0.05, palms: -0.1, props, n };
      default: {
        const held = lerpV(c.bd(0.04, 0.72 * H, 0.26), GC.scarfRail, sm(u, 0.05, 0.7));
        return { l: hL, r: add(held, 0, 0.02, 0), nod: -0.1, gr: 0.75, palms: 0.1, props: { ...props, scarf: null, held }, n };
      }
    }
  },
};

/** A script written for the piece the other way round (x flipped, left and right swapped): the cabin's rows and the door trainer's slide come towards the game's camera. */
const mx = (v: V): V => [-v[0], v[1], v[2]];
function mirrored(s: Script): Script {
  const flipSt = (a: St): St => ({ ...a, x: -a.x, yaw: -a.yaw });
  return {
    seq: s.seq,
    at: (k) => flipSt(s.at(k)),
    key(k, u, c) {
      const inner: Ctx = { ...c, st: flipSt(c.st), bd: (side, up, ahead) => mx(c.bd(-side, up, ahead)) };
      const K = s.key(k, u, inner);
      const props: Record<string, V | null | undefined> = {};
      for (const [q, p] of Object.entries(K.props ?? {})) props[q] = p ? mx(p) : p;
      return { ...K, l: K.r && mx(K.r), r: K.l && mx(K.l), gl: K.gr, gr: K.gl, props };
    },
  };
}
const SCRIPTS: Record<FaMotion, Script> = {
  faServe: mirrored(SERVE),
  faZone: mirrored(ZONE),
  faCalm: mirrored(CALM),
  faAnnounce: ANNOUNCE,
  faBrew: BREW,
  faLoad: LOAD,
  faEvac: mirrored(EVAC),
  faDemo: DEMO,
  faCpr: CPR,
  faAssign: ASSIGN,
  faReview: REVIEW,
  faBrief: BRIEF,
  faQuiz: QUIZ,
  faPack: PACK,
  faGroom: GROOM,
};
