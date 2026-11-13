import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 태양광·풍력 발전 단지 (2026-11-01, a new career at the user's request). Each motion is a round of beats: where the dweller
 * is, where the hands go, and what the plant does. The piece reads the same script by the same clock (greenEnergy.ts), so the blades
 * slow on the moment the brake button goes in and the dashboard's line follows the sun and the wind (sunAt, windAt, GE_LIVE).
 *
 * - 태양광 패널 열 (geSolarRow): geWash a soft brush on a pole, the dust going as it passes; geScan the thermal camera finding a hot cell;
 *   geSwap a cracked module out and a new one in.
 * - 풍력 터빈 (geTurbine): geDoor the base door and its control panel, the brake; geTyphoon made safe before a typhoon (the alarm).
 * - 나셀 훈련 모형 (geNacelleMock): geClimb, geLearn up the ladder clipped on; geTorque bolts by torque wrench; geOil the gearbox dipstick; geYaw the yaw gear greased.
 * - 인버터실 (geInverterBank): geRead readings and a clamp meter; geFilter a clogged fan filter.
 * - 배터리 컨테이너 (geBatteryBox): geVolts module voltages; geBms cell balancing.
 * - 관제실 (geControlDesk): geDispatch seated; geLead the morning's plan on its feet. 기상 마스트 (geMast): geMast.
 * - 변전 설비 (geSubstation): geFence, from outside the fence only. 안전 장구함 (gePpeRack): geHarness.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's
 * right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type GeMotion = 'geWash' | 'geScan' | 'geSwap' | 'geDoor' | 'geTyphoon' | 'geClimb' | 'geLearn' | 'geTorque' | 'geOil' | 'geYaw' | 'geRead' | 'geFilter' | 'geVolts' | 'geBms' | 'geDispatch' | 'geLead' | 'geMast' | 'geFence' | 'geHarness';
export const GE_MOTIONS = new Set<string>(['geWash', 'geScan', 'geSwap', 'geDoor', 'geTyphoon', 'geClimb', 'geLearn', 'geTorque', 'geOil', 'geYaw', 'geRead', 'geFilter', 'geVolts', 'geBms', 'geDispatch', 'geLead', 'geMast', 'geFence', 'geHarness']);
export type GeTool = 'tablet' | 'pole' | 'thermal' | 'driver' | 'radio' | 'wrench' | 'dip' | 'grease' | 'probe' | 'clamp' | 'filter' | 'harness' | 'cloth';

const PI = Math.PI;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const frac = (x: number) => ((x % 1) + 1) % 1;
export const gePhase = (p: THREE.Vector3) => frac(p.x * 0.283 + p.z * 0.619);
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;

// =============================================================================================
// The sun, the wind and what they make. Pure functions of the clock, so a script can rewind them.

/** What the pieces tell each other: a typhoon being made safe for, the turbine braked, the output held back at the desk. */
export const GE_LIVE = {
  stormAt: -1e9,
  brakeAt: -1e9,
  brake: 0,
  limitAt: -1e9,
  limit: 1,
};
const near = (at: number, t: number) => Math.abs(t - at) < 2;
export const stormy = (t: number) => near(GE_LIVE.stormAt, t);
export const sunAt = (t: number) => clamp01((stormy(t) ? 0.16 : 0.62) + (stormy(t) ? 0.04 : 0.22) * Math.sin(t / 37) + (stormy(t) ? 0.03 : 0.16) * Math.sin(t / 11 + 1));
export const windAt = (t: number) => clamp01(stormy(t) ? 0.95 + 0.05 * Math.sin(t * 1.7) : 0.55 + 0.25 * Math.sin(t / 29 + 2) + 0.2 * Math.sin(t / 7.3));
/** Metres a second on the mast. */
export const windMs = (t: number) => 2 + windAt(t) * 22;
/** What the site puts out now, megawatts. A turbine in a typhoon is feathered and stopped, whatever the wind. */
export function outputAt(t: number): { solar: number; wind: number; total: number } {
  const limit = near(GE_LIVE.limitAt, t) ? GE_LIVE.limit : 1;
  const solar = 3.2 * sunAt(t) * limit;
  const braked = stormy(t) || (near(GE_LIVE.brakeAt, t) && GE_LIVE.brake > 0.5);
  const wind = braked ? 0 : 4.2 * Math.pow(windAt(t), 3) * limit;
  return { solar, wind, total: solar + wind };
}

// =============================================================================================
// Where things are on each piece.

/** 태양광 패널 열 (6 × 2): the surface goes from its low edge at the front to its high edge at the back. */
export const SR = {
  stand: 1.42,
  tilt: 1.02,
  lowY: 0.56,
  highY: 1.38,
  lowZ: 0.62,
  highZ: -0.72,
  W: 5.76,
  /** The hot cell, and the module that gets changed. */
  hotX: 0.92,
  hotV: 0.2,
  swapX: -1.44,
  breaker: [-2.72, 0.98, 0.84] as V,
  stack: [-2.42, 0.3, 1.0] as V,
};
/** A point on the panels: x across, v from the low edge to the high. */
export const srAt = (x: number, v: number): V => [x, mixN(SR.lowY, SR.highY, v) + 0.03, mixN(SR.lowZ, SR.highZ, v)];

/** 풍력 터빈 (3 × 2): the tower behind the door; the control panel just inside it. */
export const TB = {
  stand: 1.42,
  towerZ: -0.35,
  doorZ: 0.66,
  hinge: -0.36,
  lock: [0.3, 1.04, 0.72] as V,
  screen: [0.04, 1.38, 0.42] as V,
  brake: [-0.16, 1.06, 0.44] as V,
  feather: [0.2, 1.06, 0.44] as V,
  box: [1.08, 0.82, 0.62] as V,
  hub: 15,
};

/** 나셀 훈련 모형 (5 × 3): a deck on a stand, a ladder up its front, the works set out on it. */
export const NM = {
  stand: 1.92,
  deck: 1.1,
  ladderX: 1.42,
  ladderZ: 0.86,
  climbZ: 1.2,
  rail: 0.6,
  /** The yaw ring on its pedestal at bench height, its bolts, the yaw drive's pinion beside it: worked on standing, as a crouch doesn't get the hands to the deck. */
  ring: [0.2, 1.95, -0.2] as V,
  ringR: 0.36,
  pinion: [0.72, 2.06, -0.24] as V,
  gearbox: [-1.0, 1.52, -0.62] as V,
  dipPort: [-0.66, 1.92, -0.36] as V,
  jar: [-1.42, 1.85, 0.2] as V,
};
export const boltAt = (i: number): V => {
  const a = (Math.floor(i) / 12) * PI * 2;
  return [NM.ring[0] + Math.sin(a) * NM.ringR, NM.ring[1] + 0.04, NM.ring[2] + Math.cos(a) * NM.ringR];
};

/** 인버터실 (4 × 1): four cabinets along the back wall; the third is running warm. */
export const IB = {
  stand: 0.92,
  front: 0.2,
  xs: [-1.38, -0.46, 0.46, 1.38],
  screenY: 1.42,
  warm: 2,
  cable: [0.46, 0.96, 0.08] as V,
  filterY: 0.3,
};

/** 배터리 컨테이너 (4 × 2): open at the front, four racks inside. */
export const BB = {
  stand: 1.42,
  inZ: 0.92,
  rackZ: 0.24,
  xs: [-1.2, -0.4, 0.4, 1.2],
  hmi: [1.72, 1.32, 0.56] as V,
  lowRack: 2,
  lowTier: 5,
};
export const cellAt = (rack: number, tier: number): V => [BB.xs[((Math.floor(rack) % 4) + 4) % 4], 0.46 + Math.max(0, tier) * 0.21, BB.rackZ + 0.04];

/** 관제실 (5 × 2): the wall of screens at the back, the desk in front of it. */
export const CD = {
  seat: [0.3, 0.47, 1.14] as V,
  keys: [0.3, 0.79, 0.56] as V,
  mouse: [0.62, 0.79, 0.56] as V,
  stop: [0.95, 0.8, 0.56] as V,
  wallZ: -0.7,
  wallY: 1.5,
  wallW: 4.6,
  wallH: 1.5,
  lead: [-1.9, 0, 0.0] as V,
};
/** 기상 마스트 (1 × 1). */
export const MA = { stand: 0.92, logger: [0.14, 1.22, 0.22] as V, dome: [-0.02, 1.5, 0.36] as V };
/** 변전 설비 (5 × 2): nobody goes past the fence. */
export const SB = { stand: 1.42, fenceZ: 0.72 };
/** 안전 장구함 (2 × 1). */
export const PP = { stand: 0.92, hook: [-0.2, 1.12, 0.26] as V };

// =============================================================================================
// The script engine.

type Seq = Array<[string, number, number?]>;
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
}
const st = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
const sat = (s: V, yaw = PI): St => ({ x: s[0], y: s[1], z: s[2], yaw, sit: true });
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
  tool?: GeTool;
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
export interface GeNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: GeTool | null;
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
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function geNow(m: GeMotion, t: number, ph: number, H = 1.6): GeNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const sitNow = e < 0.5 ? A.st.sit : B.st.sit;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: sitNow };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  const tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function gePose(m: GeMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = geNow(m, t, gePhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch ? k.crouch : undefined,
    },
  };
}
/** Hands easy at the waist. */
const easy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const leftEasy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.08), gl: 0.3 });
const rightEasy = (c: Ctx) => ({ r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
const press = (p: V, u: number, a = 0.3, b = 0.5): Pick<Key, 'r' | 'gr' | 'palms'> => ({ r: add(p, 0, 0, 0.05 - 0.03 * sm(u, a, b)), gr: 0.15, palms: 0.05 });
const pointAt = (p: V): Pick<Key, 'r' | 'gr' | 'palms'> => ({ r: p, gr: 0.15, palms: 0.1 });
/** A tablet held in the left arm; the right free to tap on it. */
const tabletAt = (c: Ctx): V => c.bd(0.14, 0.66 * c.H, 0.28);
const tapTablet = (tab: V, c: Ctx): V => add(tab, 0.08 + 0.018 * Math.sin(c.t * 13), 0.05, 0.03);
/** Writing it down: the last beat of most rounds. */
function tick(c: Ctx, n: Record<string, number>, name = 'tick'): Key {
  const tablet = tabletAt(c);
  return { tool: 'tablet', r: tapTablet(tablet, c), gr: 0.7, gl: 0.1, nod: 0.3, n: { ...n, ticked: c.p(name, 0.3, 0.7) }, props: { tablet } };
}

// =============================================================================================
// 태양광 패널 열 (geSolarRow).

const WASH: Script = {
  seq: [['ready', 1.2, 0.8], ['p0', 2.8, 1.7], ['p1', 2.8, 1.7], ['p2', 2.8, 1.7], ['p3', 2.8, 0.5], ['rinse', 2.4, 0.5], ['tick', 1.4, 0.02]],
  at: (k) => (k === 'ready' ? st(-2.5, SR.stand) : k === 'p0' ? st(-2.1, SR.stand) : k === 'p1' ? st(-0.7, SR.stand) : k === 'p2' ? st(0.7, SR.stand) : st(2.1, SR.stand)),
  key(k, u, c) {
    const pass = k === 'p0' ? 0 : k === 'p1' ? 1 : k === 'p2' ? 2 : k === 'p3' ? 3 : -1;
    const clean = pass >= 0 ? (pass + u) / 4 : k === 'ready' ? 0 : 1;
    // Up and down the slope as it goes along, the way it's really scrubbed.
    const hx = pass >= 0 ? c.st.x + 0.62 * (2 * u - 1) : k === 'rinse' ? c.st.x + 0.4 * Math.sin(u * PI * 2) : c.st.x;
    // The rear hand goes a little with the head, across the middle of the body: the left has to get to the pole beyond it.
    const grip = c.bd(-0.14 * (hx - c.st.x), 0.64 * c.H, 0.2);
    const hv = pass >= 0 ? 0.56 + 0.32 * Math.sin(u * PI * 10) : k === 'rinse' ? 0.86 : 0.5;
    const n = { clean, hx, washing: pass >= 0 ? 1 : 0, rinse: k === 'rinse' ? 1 : 0, sheen: k === 'tick' ? 1 - sm(u, 0, 1) * 0.6 : k === 'rinse' ? 1 : pass >= 0 ? 0.5 : 0, wet: 1 };
    if (k === 'tick') return tick(c, n);
    const props = { pole: grip, head: k === 'ready' ? add(grip, 0.1, 1.05, -0.3) : srAt(hx, hv) };
    return { tool: 'pole', nod: 0.08 + 0.05 * Math.sin(c.t * 2.3), lean: pass >= 0 ? 0.06 : 0.02, n, props };
  },
};
const camAt = (c: Ctx): V => c.bd(-0.1, 0.74 * c.H, 0.3);
const SCAN: Script = {
  seq: [['raise', 1.2, 0.7], ['s1', 3.6, 0.9], ['s2', 3.2, 0.7], ['found', 2.4, 0.9], ['tag', 2.0, 0.8], ['tick', 1.4, 0.02]],
  at: (k) => (k === 'raise' || k === 's1' ? st(-1.5, SR.stand) : k === 's2' ? st(0.1, SR.stand) : k === 'found' ? st(SR.hotX, SR.stand) : k === 'tag' ? st(SR.hotX - 0.06, 0.94) : st(SR.hotX, SR.stand)),
  key(k, u, c) {
    const aim = k === 's1' ? -2.2 + 1.8 * u : k === 's2' ? -0.4 + 1.1 * u : k === 'raise' ? -2.2 : SR.hotX;
    const tagged = c.p('tag', 0.5, 0.7);
    const n = { scan: k === 'tick' || k === 'tag' ? 0 : 1, aim, found: k === 'found' ? 1 : c.p('found', 0, 0.2), tagged, temp: k === 'found' ? 62 + 16 * sm(u, 0, 0.6) : 34 + 4 * Math.sin(u * 9) };
    if (k === 'tick') return tick(c, n);
    if (k === 'tag') return { tool: 'thermal', l: add(srAt(SR.hotX, SR.hotV), 0, 0.02, 0.03), gl: 0.5, palms: 0.05, nod: 0.3, lean: 0.14, n, props: { thermal: c.bd(-0.2, 0.6 * c.H, 0.16) } };
    return { tool: 'thermal', ...leftEasy(c), nod: k === 'found' ? 0.2 : 0.12, n, props: { thermal: camAt(c) } };
  },
};
/** A module out with both hands: `mod` where it is, its `lay` 1 flat on the row, 0 upright against the chest. */
const SWAP: Script = {
  seq: [['off', 1.6, 0.9], ['under', 0.8, 0.2], ['plug', 2.2, 0.2], ['unbolt', 2.6, 0.2], ['lift', 1.4, 0.2], ['carry', 0.2, 1.1], ['set', 1.2, 0.2], ['take', 1.2, 0.2], ['back', 0.2, 1.1], ['fit', 1.4, 0.2], ['bolt', 2.6, 0.9], ['on', 1.4, 0.9], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'off' || k === 'on' || k === 'tick' ? st(SR.breaker[0] + 0.08, 1.42) : k === 'carry' || k === 'set' || k === 'take' || k === 'back' ? st(SR.stack[0] + 0.35, 1.5) : st(SR.swapX, 0.9)),
  key(k, u, c) {
    const seat = add(srAt(SR.swapX, 0.25), 0, 0.02, 0);
    const chest = c.bd(0, 0.62 * c.H, 0.32);
    const low = add(SR.stack, 0, 0.1, 0);
    const mod: V = k === 'lift' ? lerpV(seat, chest, sm(u, 0.2, 0.9)) : k === 'carry' || k === 'back' ? chest : k === 'set' ? lerpV(chest, low, sm(u, 0, 0.8)) : k === 'take' ? lerpV(low, chest, sm(u, 0.2, 1)) : k === 'fit' ? lerpV(chest, seat, sm(u, 0.1, 0.85)) : seat;
    const lay = k === 'lift' ? 1 - sm(u, 0.2, 0.9) : k === 'fit' ? sm(u, 0.1, 0.85) : k === 'carry' || k === 'back' ? 0 : k === 'set' ? sm(u, 0, 0.8) : k === 'take' ? 1 - sm(u, 0.2, 1) : 1;
    const stageOf = c.p('set', 0.7, 0.8);
    const n = {
      live: k === 'off' ? 1 - sm(u, 0.3, 0.5) : k === 'on' ? sm(u, 0.3, 0.5) : k === 'tick' ? 1 : 0,
      swap: 1,
      out: k === 'lift' || k === 'carry' || k === 'set' || k === 'take' || k === 'back' || k === 'fit' ? 1 : 0,
      loose: k === 'lift' || k === 'carry' || k === 'set' || k === 'take' || k === 'back' || k === 'fit' ? 1 : 0,
      fresh: stageOf > 0.5 ? 1 : 0,
      lay,
      spin: k === 'unbolt' || k === 'bolt' ? c.t * 11 : 0,
      tookNew: c.p('take', 0.3, 0.5),
      newIn: c.p('fit', 0.8, 1),
    };
    const props = { mod: n.loose > 0.5 ? mod : null, driver: null as V | null };
    const handsOn = { r: add(mod, 0.4, 0.02, 0), l: add(mod, -0.4, 0.02, 0), gr: 0.75, gl: 0.75, palms: 0.05 };
    switch (k) {
      case 'off':
      case 'on':
        return { ...press(add(SR.breaker, 0.0, 0, 0.0), u), ...leftEasy(c), nod: 0.26, n, props };
      case 'under':
        return { ...easy(c), crouch: 0.6 * u, nod: 0.3, n, props };
      case 'plug':
        // Under the low edge: the two connectors pulled apart.
        return { r: add(seat, 0.1 + 0.03 * sm(u, 0.4, 0.8), -0.1, 0.1), l: add(seat, -0.1, -0.1, 0.1), gr: 0.75, gl: 0.75, crouch: 0.6, nod: 0.4, lean: 0.14, n, props };
      case 'unbolt':
      case 'bolt':
        return { tool: 'driver', crouch: 0.4, l: add(seat, -0.34, 0.02, 0.08), gl: 0.5, nod: 0.34, lean: 0.16, n, props: { ...props, driver: add(seat, 0.2 + 0.2 * Math.sin(u * PI), 0.03, 0.28) } };
      case 'tick':
        return tick(c, n);
      case 'carry':
      case 'back':
      case 'fit':
      case 'lift':
        return { ...handsOn, nod: 0.22, lean: k === 'fit' || k === 'lift' ? 0.14 : 0.03, n, props };
      default:
        return { ...handsOn, crouch: 0.75 * (k === 'set' ? sm(u, 0, 0.7) : 1 - sm(u, 0.3, 1)), nod: 0.34, lean: 0.12, n, props };
    }
  },
};

// =============================================================================================
// 풍력 터빈 (geTurbine).

/** The door's handle, wherever the door has swung to. */
export const DOOR_SWING = 1.7;
const doorHand = (door: number): V => {
  const r = TB.lock[0] - TB.hinge;
  const a = door * DOOR_SWING;
  return [TB.hinge + r * Math.cos(a), TB.lock[1], TB.doorZ + 0.06 + r * Math.sin(a)];
};
const DOOR: Script = {
  seq: [['come', 0.5, 0.9], ['key', 1.5, 0.1], ['open', 1.3, 0.8], ['stop', 1.6, 0.1], ['slow', 3.2, 0.1], ['read', 3.0, 0.1], ['start', 1.5, 0.8], ['close', 1.3, 0.8], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'come' || k === 'key' || k === 'open' || k === 'close' ? st(0.12, 1.2) : k === 'tick' ? st(0.34, TB.stand) : st(0.04, 0.94)),
  key(k, u, c) {
    const door = k === 'open' ? sm(u, 0.1, 0.9) : k === 'close' ? 1 - sm(u, 0, 0.8) : k === 'come' || k === 'key' || k === 'tick' ? 0 : 1;
    const brake = k === 'stop' ? sm(u, 0.4, 0.55) : k === 'slow' || k === 'read' ? 1 : k === 'start' ? 1 - sm(u, 0.4, 0.55) : 0;
    const n = { door, brake, panel: 1, inUse: k === 'read' ? 1 : 0, ticked: 0 };
    switch (k) {
      case 'come':
        return { ...easy(c), nod: 0.1, n, props: {} };
      case 'key':
        return { r: add(TB.lock, 0.02 * Math.sin(u * PI * 3), 0, 0.03), gr: 0.7, ...leftEasy(c), nod: 0.22, n, props: {} };
      case 'open':
      case 'close':
        return { r: doorHand(door), gr: 0.75, ...leftEasy(c), nod: 0.14, n, props: {} };
      case 'stop':
        return { ...press(TB.brake, u, 0.3, 0.5), r: add(TB.brake, -0.0, 0, 0.05 - 0.03 * sm(u, 0.3, 0.5)), ...leftEasy(c), nod: 0.18, n, props: {} };
      case 'slow':
        // Out to look up at the blades coming to a stop.
        return { ...easy(c), nod: -0.34, lean: -0.04, n, props: {} };
      case 'read':
        return { ...pointAt(add(TB.screen, 0.05 * Math.sin(u * PI * 2), -0.06, 0.08)), ...leftEasy(c), nod: 0.12, n, props: {} };
      case 'start':
        return { ...press(TB.feather, u, 0.3, 0.5), ...leftEasy(c), nod: 0.18, n, props: {} };
      default:
        return tick(c, n);
    }
  },
};
const TYPHOON: Script = {
  seq: [['call', 2.2, 0.5], ['key', 1.2, 0.1], ['open', 1.2, 0.8], ['feather', 2.8, 0.1], ['brake', 2.6, 0.1], ['pin', 2.4, 0.8], ['close', 1.2, 0.5], ['lock', 1.6, 0.9], ['box', 2.6, 0.9], ['radio', 1.8, 0.02]],
  at: (k) => (k === 'call' || k === 'radio' ? st(0.5, TB.stand) : k === 'key' || k === 'open' || k === 'close' || k === 'lock' ? st(0.12, 1.2) : k === 'box' ? st(1.08, 1.14) : st(0.04, 0.94)),
  key(k, u, c) {
    const door = k === 'open' ? sm(u, 0.1, 0.9) : k === 'close' ? 1 - sm(u, 0, 0.8) : k === 'call' || k === 'key' || k === 'lock' || k === 'box' || k === 'radio' ? 0 : 1;
    const n = {
      storm: 1,
      door,
      panel: 1,
      feather: k === 'feather' ? sm(u, 0.2, 0.9) : c.p('feather', 0, 1),
      brake: k === 'brake' ? sm(u, 0.2, 0.5) : c.p('brake', 0, 1),
      pinned: c.p('pin', 0.5, 0.7),
      locked: c.p('lock', 0.5, 0.7),
      boxed: c.p('box', 0.6, 0.8),
      done: k === 'radio' ? 1 : 0,
    };
    const windy = { lean: 0.1 + 0.03 * Math.sin(c.t * 3.1) };
    const radio = c.bd(-0.12, 0.84 * c.H, 0.14);
    switch (k) {
      case 'call':
      case 'radio':
        return { tool: 'radio', ...leftEasy(c), ...windy, nod: 0.08, n, props: { radio } };
      case 'key':
      case 'lock':
        return { r: add(TB.lock, 0.02 * Math.sin(u * PI * 3), 0, 0.03), gr: 0.7, ...leftEasy(c), ...windy, nod: 0.22, n };
      case 'open':
      case 'close':
        return { r: doorHand(door), gr: 0.75, ...leftEasy(c), ...windy, nod: 0.14, n };
      case 'feather':
        return { ...press(TB.feather, u), ...leftEasy(c), nod: k === 'feather' && u > 0.5 ? -0.3 : 0.16, n };
      case 'brake':
        return { ...press(TB.brake, u), ...leftEasy(c), nod: u > 0.5 ? -0.3 : 0.16, n };
      case 'pin':
        // The lock lever, down with both hands.
        return { r: add(TB.brake, 0.34, 0.1 - 0.2 * sm(u, 0.1, 0.7), 0.06), l: add(TB.brake, 0.18, 0.1 - 0.2 * sm(u, 0.1, 0.7), 0.06), gr: 0.8, gl: 0.8, lean: 0.14, nod: 0.2, n };
      default:
        // The cable junction box by the pad: lid down, its bolt turned by hand.
        return { r: add(TB.box, 0.02 * Math.sin(c.t * 6), 0.22, 0.06), gr: 0.75, l: add(TB.box, -0.16, 0.22, 0.04), gl: 0.5, crouch: 0.35, nod: 0.34, lean: 0.14, n };
    }
  },
};

// =============================================================================================
// 나셀 훈련 모형 (geNacelleMock).

const ON_DECK = (x: number, z: number, yaw = PI) => st(x, z, yaw, NM.deck);
/** Hands on the rails of the ladder, turn about, as they climb. */
const rungs = (c: Ctx, u: number, side: number): Key => {
  const y = c.st.y;
  const R = NM.rail / 2.2;
  const up = 1.16 + (side > 0 ? 0.14 : 0) * (1 - sm(u, 0, 1) * 0.3);
  const dn = 1.02 + (side > 0 ? 0 : 0.14);
  return { r: [NM.ladderX + R, y + up, NM.ladderZ], l: [NM.ladderX - R, y + dn, NM.ladderZ], gr: 0.8, gl: 0.8, lean: 0.02, nod: side > 0 ? -0.1 : 0.04, palms: 0.05 };
};
function climbBeats(learn: boolean): Script {
  const heights: Record<string, number> = { c0: 0.28, c1: 0.56, c2: 0.84, c3: 1.1, d3: 1.1, d2: 0.84, d1: 0.56, d0: 0.28 };
  const seq: Seq = [['clip', 1.8, 0.1]];
  if (learn) seq.unshift(['watch', 3.0, 0.1], ['show', 2.4, 0.1]);
  seq.push(['c0', 0.9, 0.7], ['c1', 0.9, 0.7], ['c2', 0.9, 0.7], ['c3', 0.9, 0.7], ['over', 0.4, 1.0], ['clip2', 1.8, 0.3], ['look', 2.4, 0.3], ['unclip', 1.2, 1.0], ['d3', 0.6, 0.7], ['d2', 0.8, 0.7], ['d1', 0.8, 0.7], ['d0', 0.8, 0.7], ['ground', 1.2, 0.02]);
  return {
    seq,
    at(k) {
      if (heights[k] !== undefined) return st(NM.ladderX, NM.climbZ, PI, heights[k]);
      if (k === 'over' || k === 'clip2' || k === 'look' || k === 'unclip') return ON_DECK(NM.ladderX - 0.1, 0.4);
      return st(NM.ladderX, NM.climbZ + 0.1);
    },
    key(k, u, c) {
      const up = heights[k] !== undefined;
      const onTop = k === 'over' || k === 'clip2' || k === 'look' || k === 'unclip';
      // The fall-arrest runner goes up the line with them, a little over their chest.
      const runner = up ? c.st.y + 1.32 : k === 'clip' || k === 'watch' || k === 'show' || k === 'ground' ? 1.32 : NM.deck + 1.0;
      const n = { runner, lanyard: k === 'watch' || k === 'show' ? 0 : 1, top: onTop ? 1 : 0, deckClip: k === 'clip2' || k === 'look' ? 1 : 0, senior: learn ? 1 : 0, teach: k === 'watch' ? 1 : k === 'show' ? 2 : k === 'look' || k === 'ground' ? 3 : 0, sx: c.st.x, sy: c.st.y, sz: c.st.z };
      if (up) {
        const step = ['c0', 'c1', 'c2', 'c3', 'd3', 'd2', 'd1', 'd0'].indexOf(k);
        return { ...rungs(c, u, step % 2 ? 1 : -1), n };
      }
      switch (k) {
        case 'clip':
          return { r: [NM.ladderX + 0.02, 1.32, NM.ladderZ + 0.08], gr: 0.8, l: c.bd(0.14, 0.58 * c.H, 0.14), gl: 0.6, nod: 0.02, n };
        case 'watch':
          return { ...easy(c), nod: -0.04, n };
        case 'show':
          return { ...pointAt([NM.ladderX + 0.02, 1.32, NM.ladderZ + 0.08]), ...leftEasy(c), nod: 0.02, n };
        case 'clip2':
          return { r: add(c.bd(-0.2, 0.86 * c.H, 0.2), 0, 0, 0), gr: 0.8, l: c.bd(0.14, 0.58 * c.H, 0.14), gl: 0.6, nod: -0.1, n };
        case 'look':
          // Over the rail at the ground, and round at the works.
          return { r: [NM.ladderX + 0.1, NM.deck + 1.0, 0.68], gr: 0.7, ...leftEasy(c), nod: 0.2 + 0.24 * Math.sin(u * PI * 2), n };
        case 'unclip':
          return { r: c.bd(-0.2, 0.86 * c.H, 0.2), gr: 0.8, ...leftEasy(c), nod: -0.1, n };
        case 'over':
          return { ...easy(c), n };
        default:
          return { ...easy(c), nod: 0.14, n };
      }
    },
  };
}
const CLIMB = climbBeats(false);
const LEARN = climbBeats(true);

/** Work on the deck: up the ladder first and down it after, so nobody appears up there. */
function viaLadder(inner: Script): Script {
  const rung: Record<string, number> = { up0: 0.56, up1: 0.98, dn1: 0.98, dn0: 0.56 };
  const last = inner.seq[inner.seq.length - 1];
  return {
    seq: [['g0', 0.3, 0.8], ['up0', 0.3, 0.7], ['up1', 0.3, 0.7], ...inner.seq.slice(0, -1), [last[0], last[1], 0.9], ['dn1', 0.3, 0.7], ['dn0', 0.3, 0.7], ['g1', 0.3, 0.3]],
    at(k) {
      if (rung[k] !== undefined) return st(NM.ladderX, NM.climbZ, PI, rung[k]);
      if (k === 'g0' || k === 'g1') return st(NM.ladderX, NM.climbZ + 0.1);
      return inner.at(k);
    },
    key(k, u, c) {
      if (rung[k] !== undefined) return { ...rungs(c, u, k === 'up0' || k === 'dn1' ? 1 : -1), n: { working: 1 } };
      if (k === 'g0' || k === 'g1') return { ...easy(c), nod: -0.06, n: { working: 1 } };
      return inner.key(k, u, c);
    },
  };
}

export const WRENCH = 0.3;
/** Where on the handle the hand goes, back from the head; `pull` the swing of a bolt being done up. */
function wrenchAt(bolt: V, pull: number): V {
  return [bolt[0] + Math.sin(pull) * WRENCH, bolt[1] + 0.07, bolt[2] + Math.cos(pull) * WRENCH];
}
/** Square behind a bolt, the wrench's grip just ahead of the chest. */
const behindBolt = (i: number) => {
  const b = boltAt(i);
  return ON_DECK(b[0], b[2] + WRENCH + 0.1);
};
const BOLT_ORDER = [0, 1, 11, 10];
const TORQUE: Script = {
  seq: [['come', 0.5, 0.8], ['b0', 2.1, 0.5], ['b1', 2.1, 0.5], ['b2', 2.1, 0.5], ['b3', 2.1, 0.5], ['mark', 2.2, 0.5], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'come' ? ON_DECK(NM.ring[0] + 0.5, 0.56) : k === 'b1' ? behindBolt(BOLT_ORDER[1]) : k === 'b2' ? behindBolt(BOLT_ORDER[2]) : k === 'b3' ? behindBolt(BOLT_ORDER[3]) : behindBolt(BOLT_ORDER[0])),
  key(k, u, c) {
    const seqB = ['b0', 'b1', 'b2', 'b3'];
    const i = seqB.indexOf(k);
    // A third of the ring's bolts this round, each pulled round till it clicks, from the near ones outward.
    const order = BOLT_ORDER;
    const bolt = i >= 0 ? boltAt(order[i]) : boltAt(0);
    const swing = i >= 0 ? -0.24 + 0.48 * sm(u, 0.15, 0.72) : 0;
    let done = 0;
    for (const s of seqB) done += c.p(s, 0.72, 0.8);
    const n = { done, marks: c.p('mark', 0.1, 0.9) * 4, boltI: i >= 0 ? order[i] : -1, pull: swing, click: i >= 0 && u > 0.72 && u < 0.82 ? 1 : 0, torque: i >= 0 ? 320 * sm(u, 0.15, 0.72) : 0, working: 1 };
    if (k === 'tick') return tick(c, n);
    const down = { nod: 0.44, lean: 0.08 };
    if (k === 'come') return { ...easy(c), n };
    if (k === 'mark') return { ...down, ...leftEasy(c), ...pointAt(add(boltAt(order[Math.min(2, Math.floor(u * 3))]), 0, 0.03, 0.02)), gr: 0.75, n };
    return { ...down, tool: 'wrench', n, props: { wrench: wrenchAt(bolt, swing) } };
  },
};
/** How far the dipstick's tube stands up out of the gearbox, so its loop is in reach. */
export const DIP_TUBE = 0.15;
const OIL: Script = {
  seq: [['come', 0.5, 1.0], ['pull', 1.6, 0.1], ['wipe', 2.0, 0.1], ['dip', 1.6, 0.1], ['read', 2.8, 0.1], ['back', 1.2, 0.9], ['jar', 2.6, 0.9], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'come' ? ON_DECK(-0.2, 0.42) : k === 'jar' ? ON_DECK(-1.42, 0.56) : k === 'tick' ? ON_DECK(-0.5, 0.42) : ON_DECK(-0.82, 0.02)),
  key(k, u, c) {
    const port = add(NM.dipPort, 0, DIP_TUBE, 0);
    const eye = c.bd(-0.08, 0.86 * c.H, 0.26);
    const dip: V = k === 'pull' ? add(port, 0, 0.3 * sm(u, 0.1, 0.9), 0) : k === 'wipe' ? lerpV(add(port, 0, 0.3, 0), eye, sm(u, 0, 0.4)) : k === 'dip' ? (u < 0.5 ? lerpV(eye, add(port, 0, 0.3, 0), sm(u, 0, 0.5)) : add(port, 0, 0.3 - 0.3 * sm(u, 0.5, 0.9), 0)) : k === 'read' ? (u < 0.35 ? add(port, 0, 0.3 * sm(u, 0, 0.35), 0) : lerpV(add(port, 0, 0.3, 0), eye, sm(u, 0.35, 0.6))) : k === 'back' ? add(port, 0, 0.3 * (1 - sm(u, 0.2, 0.9)), 0) : port;
    const n = { dipOut: k === 'pull' || k === 'wipe' || k === 'dip' || k === 'read' || k === 'back' ? 1 : 0, clean: k === 'wipe' ? u : k === 'dip' ? 1 - sm(u, 0.5, 0.9) * 0 : 0, level: k === 'read' ? 0.68 : 0, wiping: k === 'wipe' ? 1 : 0, jar: k === 'jar' ? sm(u, 0.2, 0.8) : c.p('jar', 0, 1), pour: k === 'jar' ? 1 : 0, ticked: 0, working: 1 };
    if (k === 'tick') return tick(c, n);
    if (k === 'come') return { ...easy(c), n, props: { dip } };
    if (k === 'jar') return { r: add(NM.jar, 0.08, 0.1, 0.02), gr: 0.75, l: add(NM.jar, -0.08, 0.06, 0.03), gl: 0.5, nod: 0.36, lean: 0.06, n, props: { dip } };
    const left = k === 'wipe' ? { l: add(dip, -0.02, -0.03 + 0.06 * Math.sin(u * PI * 5), 0.02), gl: 0.7 } : leftEasy(c);
    return { tool: 'dip', ...left, nod: k === 'read' ? 0.04 : 0.22, lean: 0.06, n, props: { dip } };
  },
};
const YAW: Script = {
  seq: [['come', 0.5, 0.8], ['wipe', 2.2, 0.1], ['pump', 3.6, 0.1], ['turn', 3.4, 0.3], ['tick', 1.3, 0.02]],
  at: () => ON_DECK(NM.pinion[0] - 0.1, 0.3),
  key(k, u, c) {
    const nip: V = add(NM.pinion, -0.08, -0.1, 0.2);
    const n = { yaw: k === 'turn' ? sm(u, 0, 1) * 0.5 : c.p('turn', 0, 1) * 0.5, grease: k === 'pump' ? u : c.p('pump', 0, 1), pumpAt: k === 'pump' ? Math.abs(Math.sin(c.t * 5)) : 0, greyed: k === 'wipe' ? 1 - u : c.p('wipe', 0, 1) ? 0 : 1, working: 1 };
    if (k === 'tick') return tick(c, n);
    const down = { nod: 0.42, lean: 0.08 };
    if (k === 'come') return { ...easy(c), n };
    if (k === 'wipe') return { ...down, ...leftEasy(c), r: add(nip, 0.05 * Math.sin(c.t * 6), 0.03, 0.03), gr: 0.5, n };
    if (k === 'turn') return { ...down, nod: 0.34, ...leftEasy(c), r: add(nip, 0.1, 0.0, 0.1), gr: 0.5, n };
    return { ...down, tool: 'grease', l: add(nip, -0.06, -0.03, 0.14), gl: 0.7, n, props: { grease: add(nip, 0.06, 0.02, 0.2) } };
  },
};

// =============================================================================================
// 인버터실 (geInverterBank).

const READ: Script = {
  seq: [['c0', 1.5, 0.7], ['c1', 1.5, 0.7], ['c2', 1.7, 0.1], ['open', 1.2, 0.1], ['clamp', 3.2, 0.1], ['shut', 1.0, 0.7], ['c3', 1.4, 0.7], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'c0' ? st(IB.xs[0], IB.stand) : k === 'c1' ? st(IB.xs[1], IB.stand) : k === 'c3' || k === 'tick' ? st(IB.xs[3], IB.stand) : k === 'open' || k === 'shut' ? st(IB.xs[2] + 0.2, IB.stand) : st(IB.xs[2], IB.stand)),
  key(k, u, c) {
    const door = k === 'open' ? sm(u, 0.1, 0.9) : k === 'clamp' ? 1 : k === 'shut' ? 1 - sm(u, 0, 0.9) : 0;
    const on = c.st.x;
    const n = { door, clamped: k === 'clamp' ? sm(u, 0.2, 0.35) : 0, focus: k === 'c0' ? 0 : k === 'c1' ? 1 : k === 'c3' ? 3 : 2, working: 1 };
    if (k === 'tick') return tick(c, n);
    if (k === 'clamp') return { tool: 'clamp', ...leftEasy(c), nod: 0.26, lean: 0.08, n, props: { clamp: add(IB.cable, 0, 0.0, 0.1 + 0.1 * (1 - sm(u, 0.05, 0.3))) } };
    if (k === 'open' || k === 'shut') return { l: [IB.xs[2] - 0.41 + 0.75 * Math.cos(door * 1.2), 1.02, IB.front + 0.03 + 0.75 * Math.sin(door * 1.2)], gl: 0.75, ...rightEasy(c), nod: 0.18, n };
    return { ...pointAt([on + 0.04 * Math.sin(u * PI * 2), IB.screenY - 0.08, IB.front + 0.08]), ...leftEasy(c), nod: 0.04, n };
  },
};
const FILTER: Script = {
  seq: [['read', 1.8, 0.1], ['down', 0.7, 0.1], ['unclip', 1.1, 0.1], ['out', 1.5, 0.1], ['look', 1.6, 0.1], ['in', 1.8, 0.1], ['up', 0.7, 0.1], ['cool', 3.0, 0.8], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'tick' ? st(IB.xs[2] - 0.4, IB.stand) : st(IB.xs[2], IB.stand)),
  key(k, u, c) {
    const slot: V = [IB.xs[2], IB.filterY, IB.front + 0.03];
    const chest = c.bd(0, 0.44 * c.H, 0.26);
    const filter: V = k === 'out' ? lerpV(slot, chest, sm(u, 0.1, 0.9)) : k === 'look' ? chest : k === 'in' ? lerpV(chest, slot, sm(u, 0.2, 0.9)) : slot;
    const n = { fresh: c.p('look', 0.9, 1), filterOut: k === 'out' || k === 'look' || k === 'in' ? 1 : 0, temp: k === 'cool' ? 68 - 17 * sm(u, 0, 1) : c.p('cool', 0, 1) ? 51 : 68, flap: k === 'unclip' ? sm(u, 0.2, 0.8) : k === 'up' ? 1 - sm(u, 0, 0.8) : k === 'out' || k === 'look' || k === 'in' ? 1 : 0, focus: 2, working: 1 };
    const down = { crouch: 0.8, nod: 0.4, lean: 0.12 };
    switch (k) {
      case 'read':
      case 'cool':
        return { ...pointAt([IB.xs[2] + 0.03 * Math.sin(u * PI * 2), IB.screenY - 0.08, IB.front + 0.08]), ...leftEasy(c), nod: 0.04, n };
      case 'down':
      case 'up':
        return { ...easy(c), crouch: 0.8 * (k === 'down' ? u : 1 - u), nod: 0.3, n };
      case 'unclip':
        return { ...down, r: add(slot, 0.12, 0.14, 0.04), l: add(slot, -0.12, 0.14, 0.04), gr: 0.7, gl: 0.7, n };
      case 'tick':
        return tick(c, n);
      default:
        return { ...down, tool: 'filter', n, props: { filter } };
    }
  },
};

// =============================================================================================
// 배터리 컨테이너 (geBatteryBox).

const VOLTS: Script = {
  seq: [['go', 0.5, 0.8], ['r0', 1.8, 0.7], ['r1', 1.8, 0.7], ['r2', 2.4, 0.1], ['low', 2.4, 0.7], ['r3', 1.5, 0.8], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'go' || k === 'tick' ? st(0, BB.stand) : k === 'r0' ? st(BB.xs[0], BB.inZ) : k === 'r1' ? st(BB.xs[1], BB.inZ) : k === 'r3' ? st(BB.xs[3], BB.inZ) : st(BB.xs[2], BB.inZ)),
  key(k, u, c) {
    const rack = k === 'r0' ? 0 : k === 'r1' ? 1 : k === 'r3' ? 3 : 2;
    const tier = k === 'low' ? BB.lowTier : k === 'r2' ? 2 + Math.floor(u * 3) : 2 + Math.floor(u * 3);
    const cell = cellAt(rack, tier);
    const n = { rack, tier, reading: k === 'low' ? 3.14 : 3.31 + 0.01 * Math.sin(tier * 7), low: k === 'low' ? 1 : c.p('low', 0, 0.2), noted: c.p('tick', 0.3, 0.7), working: 1 };
    if (k === 'tick') return tick(c, n);
    if (k === 'go') return { ...easy(c), nod: 0.1, n };
    return { tool: 'probe', l: add(cell, -0.08, -0.02, 0.05), gl: 0.72, nod: tier > 3 ? -0.1 : 0.14, lean: 0.06, n, props: { probe: add(cell, 0.07, 0.01, 0.12 + 0.02 * Math.sin(c.t * 6)) } };
  },
};
const BMS: Script = {
  seq: [['come', 0.4, 0.8], ['read', 2.4, 0.1], ['select', 2.2, 0.1], ['start', 1.2, 0.1], ['watch', 4.6, 0.1], ['done', 1.4, 0.8], ['tick', 1.3, 0.02]],
  at: (k) => (k === 'tick' ? st(BB.hmi[0] - 0.5, BB.stand) : st(BB.hmi[0], 1.06)),
  key(k, u, c) {
    const n = { screen: 1, spread: k === 'watch' ? 0.17 * (1 - sm(u, 0, 1)) + 0.01 : k === 'done' ? 0.01 : 0.18, on: k === 'watch' ? 1 : 0, sel: c.p('select', 0.3, 0.7), working: 1 };
    if (k === 'tick') return tick(c, n);
    if (k === 'come') return { ...easy(c), nod: 0.1, n };
    if (k === 'watch') return { ...easy(c), nod: 0.14 + 0.04 * Math.sin(c.t), n };
    if (k === 'start' || k === 'select') return { ...press(add(BB.hmi, k === 'select' ? -0.06 : 0.06, -0.04, 0.0), u), ...leftEasy(c), nod: 0.14, n };
    return { ...pointAt(add(BB.hmi, 0.06 * Math.sin(u * PI * 2), 0.02, 0.06)), ...leftEasy(c), nod: 0.14, n };
  },
};

// =============================================================================================
// 관제실 (geControlDesk).

const DISPATCH: Script = {
  seq: [['watch', 3.4, 0.2], ['type', 3.0, 0.2], ['limit', 2.2, 0.2], ['hold', 3.4, 0.2], ['free', 1.6, 0.2], ['ok', 1.6, 0.3]],
  at: () => sat(CD.seat),
  key(k, u, c) {
    const desk: Key = { l: add(CD.keys, -0.1, 0.03, 0), r: add(CD.mouse, 0, 0.03, 0), gl: 0.25, gr: 0.45, palms: 0.05 };
    const n = { limit: k === 'limit' ? 1 - 0.3 * sm(u, 0.3, 0.6) : k === 'hold' ? 0.7 : k === 'free' ? 0.7 + 0.3 * sm(u, 0.3, 0.6) : 1, typed: k === 'type' ? u : c.p('type', 0, 1), holding: k === 'limit' || k === 'hold' || k === 'free' ? 1 : 0, using: 1, ok: k === 'ok' ? 1 : 0 };
    switch (k) {
      case 'type':
        return { ...typing(CD.keys, c.t), nod: 0.14, n };
      case 'limit':
      case 'free':
        return { ...press(CD.stop, u), l: add(CD.keys, -0.1, 0.03, 0), gl: 0.25, nod: 0.12, n };
      case 'ok':
        return { ...desk, nod: -0.12 + 0.12 * Math.sin(u * PI), n };
      default:
        return { ...desk, nod: -0.18, n };
    }
  },
};
const LEAD: Script = {
  seq: [['open', 2.4, 0.2], ['wall', 3.4, 0.2], ['ask', 2.6, 0.2], ['plan', 3.2, 0.2], ['tick', 2.0, 0.2], ['nods', 1.6, 0.02]],
  at: () => st(CD.lead[0], CD.lead[2], PI * 0.72),
  key(k, u, c) {
    const n = { crew: 1, talk: k === 'open' || k === 'wall' || k === 'plan' ? 0 : k === 'ask' ? 1 : 2, nods: k === 'nods' ? 1 : 0, using: 1, planned: c.p('plan', 0, 1) };
    if (k === 'tick') return tick(c, n);
    if (k === 'wall' || k === 'plan') return { ...pointAt([-1.7 + 0.2 * Math.sin(u * PI * 2), 1.5, CD.wallZ + 0.26]), ...leftEasy(c), nod: -0.04, n };
    return { ...easy(c), nod: 0.04 + 0.06 * Math.sin(c.t * 2.2), n };
  },
};

// =============================================================================================
// 기상 마스트 (geMast), 변전 설비 (geSubstation), 안전 장구함 (gePpeRack).

const MAST: Script = {
  seq: [['up', 2.6, 0.2], ['open', 1.2, 0.2], ['read', 3.0, 0.2], ['shut', 0.9, 0.3], ['wipe', 3.2, 0.5], ['tick', 1.3, 0.02]],
  at: () => st(0, MA.stand),
  key(k, u, c) {
    const lid = k === 'open' ? sm(u, 0.1, 0.9) : k === 'read' ? 1 : k === 'shut' ? 1 - sm(u, 0, 0.9) : 0;
    const n = { lid, reading: k === 'read' ? 1 : 0, wiped: k === 'wipe' ? u : c.p('wipe', 0, 1), working: 1 };
    switch (k) {
      case 'up':
        // The cups and the vane, away up the mast.
        return { ...easy(c), nod: -0.46, lean: -0.05, n };
      case 'open':
      case 'shut':
        return { r: add(MA.logger, 0.12, 0.1 + 0.08 * lid, 0.05 + 0.1 * lid), gr: 0.75, ...leftEasy(c), nod: 0.16, n };
      case 'read':
        return { ...pointAt(add(MA.logger, 0.03 * Math.sin(u * PI * 2), 0, 0.08)), ...leftEasy(c), nod: 0.12, n };
      case 'wipe':
        return { tool: 'cloth', ...leftEasy(c), nod: -0.04, n, props: { cloth: add(MA.dome, 0.03 * Math.sin(c.t * 7), 0.08, 0.05) } };
      default:
        return tick(c, n);
    }
  },
};
const FENCE: Script = {
  seq: [['sign', 1.8, 0.9], ['xfmr', 3.2, 0.9], ['gauge', 3.2, 0.9], ['line', 3.2, 0.7], ['tick', 1.5, 0.02]],
  at: (k) => (k === 'sign' ? st(-1.8, SB.stand) : k === 'xfmr' ? st(-0.3, SB.stand) : k === 'gauge' ? st(0.9, SB.stand) : st(1.7, SB.stand)),
  key(k, u, c) {
    const n = { focus: k === 'xfmr' ? 1 : k === 'gauge' ? 2 : k === 'line' ? 3 : 0, walking: 1, ticked: 0 };
    if (k === 'tick') return tick(c, n);
    const tablet = tabletAt(c);
    const look = k === 'line' ? -0.42 : k === 'xfmr' ? -0.08 : 0.02;
    return { tool: 'tablet', ...(k === 'gauge' ? { r: c.bd(-0.26, 0.82 * c.H, 0.42), gr: 0.15, palms: 0.1 } : rightEasy(c)), gl: 0.1, nod: look + 0.04 * Math.sin(u * PI * 2), n, props: { tablet } };
  },
};
const HARNESS: Script = {
  seq: [['take', 1.3, 0.3], ['web', 3.4, 0.2], ['buckle', 2.2, 0.2], ['hook', 2.0, 0.2], ['hang', 1.3, 0.8], ['tick', 1.3, 0.02]],
  at: () => st(0, PP.stand),
  key(k, u, c) {
    const near: V = c.bd(-0.12, 0.72 * c.H, 0.3);
    const harness: V = k === 'take' ? lerpV(PP.hook, near, sm(u, 0.2, 1)) : k === 'hang' ? lerpV(near, PP.hook, sm(u, 0, 0.85)) : near;
    const n = { held: k === 'tick' ? 0 : 1, gate: k === 'hook' ? Math.abs(Math.sin(u * PI * 3)) : 0, checked: c.p('hook', 0.5, 1), working: 1 };
    if (k === 'tick') return tick(c, n);
    // The left hand runs down the webbing, feeling for a cut.
    const run = k === 'web' ? 0.04 + 0.34 * (0.5 - 0.5 * Math.cos(u * PI * 4)) : k === 'buckle' ? 0.2 : 0.28;
    return { tool: 'harness', l: add(harness, -0.03, -run, 0.03), gl: k === 'web' ? 0.65 : 0.8, nod: 0.3, lean: 0.04, n, props: { harness } };
  },
};

const SCRIPTS: Record<GeMotion, Script> = {
  geWash: WASH,
  geScan: SCAN,
  geSwap: SWAP,
  geDoor: DOOR,
  geTyphoon: TYPHOON,
  geClimb: CLIMB,
  geLearn: LEARN,
  geTorque: viaLadder(TORQUE),
  geOil: viaLadder(OIL),
  geYaw: viaLadder(YAW),
  geRead: READ,
  geFilter: FILTER,
  geVolts: VOLTS,
  geBms: BMS,
  geDispatch: DISPATCH,
  geLead: LEAD,
  geMast: MAST,
  geFence: FENCE,
  geHarness: HARNESS,
};
