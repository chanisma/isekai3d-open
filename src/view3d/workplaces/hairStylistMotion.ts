import { add, beatOf, blended, key, longHands, mix, mixAt, mixP, roundOf, sp, ss, st, timesOf, type Key, type Now, type P, type SpotAt, type Step, type Stroke } from './handWorkKit';

/*
 * 바닥 머리카락 쓸기 (xwSweepHair), by the chair: a broom clipped to a lobby dustpan (the long-handled one a salon keeps to hand). The cut hair
 * swept in from all round to a heap, the pan stood at it in the left hand, the heap brushed in with short strokes in the right, the pan
 * carried to the bin and tipped.
 */
export const HS_AT: SpotAt = { x: -0.1, z: 1.32, yaw: Math.PI };
export const HS_BIN_AT: SpotAt = { x: -0.42, z: 1.26, yaw: -Math.PI / 2 };
export const HS_BIN: P = [-0.86, 0, 1.26];
/** Where the heap ends up, and the middle of the drift that's swept to it. */
export const HS_HEAP: P = sp(HS_AT, 0, 0, 0.5);
export const HS_DRIFT = { x: HS_AT.x, z: HS_AT.z - 0.62, r: 0.32 };
export const HS_PAN_LEN = 0.95;
/** The pan's head: its lip towards `yaw`, hinged at its back 0.2 behind the lip; the handle up from the hinge, tipped `tilt` towards the lip. */
export interface PanPose {
  at: P;
  yaw: number;
  tilt: number;
  pitch: number;
}
/** The top of the handle: where the left hand holds it. */
export function panTop(s: PanPose): P {
  const back = -0.2;
  const y = HS_PAN_LEN * Math.cos(s.tilt);
  const z = back + HS_PAN_LEN * Math.sin(s.tilt);
  return [s.at[0] + z * Math.sin(s.yaw), s.at[1] + y, s.at[2] + z * Math.cos(s.yaw)];
}
/** Stood at the dweller's left, the broom against it. */
const PAN_REST: PanPose = { at: sp(HS_AT, 0.36, 0, 0.26), yaw: 0, tilt: 0, pitch: 0 };
/** Held to the heap: the lip towards them, just beyond it. */
const PAN_DOWN: PanPose = { at: sp(HS_AT, 0.02, 0, 0.58), yaw: 0, tilt: 0.62, pitch: 0 };
/** Over the bin, hanging from the handle, then swung forward to tip. */
const panOver = (pitch: number): PanPose => ({ at: sp(HS_BIN_AT, -0.02, 0.56, 0.4), yaw: HS_BIN_AT.yaw, tilt: -0.05, pitch });
const mixPan = (a: PanPose, b: PanPose, e: number): PanPose => ({ at: mixP(a.at, b.at, e), yaw: mix(a.yaw, b.yaw, e), tilt: mix(a.tilt, b.tilt, e), pitch: mix(a.pitch, b.pitch, e) });
const PAN_CARRY: PanPose = { at: sp(HS_AT, 0.2, 0.16, 0.3), yaw: 0, tilt: 0.3, pitch: -0.5 };

/** The broom, clipped on the pan. */
export const HS_BROOM_FOOT: P = sp(HS_AT, 0.24, 0, 0.22);

type K = 'take' | 'gather' | 'toPan' | 'brushIn' | 'lift' | 'walk' | 'over' | 'tip' | 'back' | 'put';
const STEPS: Array<Step<K>> = [st('take', 1.6), st('gather', 8), st('toPan', 1.3), st('brushIn', 3.6), st('lift', 0.9), st('walk', 1.3, 0.1), st('over', 0.8), st('tip', 2.2), st('back', 1.3, 0.1), st('put', 1.2)];
export const HS_ROUND = roundOf(STEPS);
export const hsBeatTimes = () => timesOf(STEPS);

export function hsStroke(t: number, k: K, p: number): Stroke {
  if (k === 'gather') {
    const a = (t * Math.PI * 2) / 1.6;
    // Wide at first, narrowing to the heap.
    const w = mix(0.3, 0.1, ss(p));
    return { side: w * Math.sin(a), ahead: 0.56 - 0.08 * ss(p) + 0.07 * Math.cos(a), lift: 0.02 * Math.max(0, Math.cos(a)), spin: Math.PI / 2 + 0.25 * Math.sin(a) };
  }
  if (k === 'brushIn') {
    // Short pushes from the near side, up to the lip.
    const u = (p * 5) % 1;
    const e = u < 0.6 ? ss(u / 0.6) : 1 - ss((u - 0.6) / 0.4);
    return { side: -0.02, ahead: 0.36 + 0.2 * e, lift: u < 0.6 ? 0 : 0.03, spin: Math.PI / 2 };
  }
  return { side: -0.16, ahead: 0.34, lift: 0, spin: Math.PI / 2 };
}

function atOf(k: K, p: number): SpotAt {
  if (k === 'walk') return mixAt(HS_AT, HS_BIN_AT, ss(p));
  if (k === 'back') return mixAt(HS_BIN_AT, HS_AT, ss(p));
  return k === 'over' || k === 'tip' ? HS_BIN_AT : HS_AT;
}
function panOf(k: K, p: number): PanPose {
  switch (k) {
    case 'take':
    case 'gather':
      return PAN_REST;
    case 'toPan':
      return mixPan(PAN_REST, PAN_DOWN, ss(p, 0.25, 1));
    case 'brushIn':
      return PAN_DOWN;
    case 'lift':
      return mixPan(PAN_DOWN, PAN_CARRY, ss(p));
    case 'walk':
      return mixPan(PAN_CARRY, panOver(-0.5), ss(p));
    case 'over':
      return panOver(-0.5);
    case 'tip':
      return panOver(mix(-0.5, 1.0, Math.sin(Math.PI * ss(p, 0.05, 0.95))));
    case 'back':
      return mixPan(panOver(-0.5), PAN_CARRY, ss(p));
    default:
      return mixPan(PAN_CARRY, PAN_REST, ss(p, 0, 0.7));
  }
}
const panHand = (s: PanPose) => add(panTop(s), [0, -0.02, 0]);

function pose(k: K, p: number, H: number): Key {
  const at = atOf(k, p);
  const hands = longHands(at, H);
  const l = panHand(panOf(k, p));
  const onePanR = sp(at, -0.18, 0.72 * H, 0.26);
  switch (k) {
    case 'take':
    case 'put': {
      const onBroom = add(HS_BROOM_FOOT, [-0.04, 1.14, 0.05]);
      return key(k === 'put' ? mixP(l, sp(at, 0.2, 1.0, 0.1), ss(p, 0.7, 1)) : sp(at, 0.2, 1.0, 0.1), k === 'take' ? mixP(sp(at, -0.2, 1.0, 0.1), onBroom, ss(p, 0, 0.6)) : mixP(onePanR, onBroom, ss(p, 0, 0.5)), 0.14, 0.3, 0.5, 0.3, 0.75);
    }
    case 'gather':
      return key(hands.l, hands.r, 0.22, 0.45, 0.5, 0.75, 0.75);
    case 'toPan':
      return key(l, onePanR, 0.26, 0.5, 0.5, 0.75, 0.75);
    case 'brushIn':
      return key(l, onePanR, 0.36, 0.55, 0.5, 0.75, 0.75);
    case 'lift':
    case 'walk':
    case 'back':
      return key(l, onePanR, 0.1, 0.25, 0.5, 0.75, 0.75);
    default:
      return key(l, onePanR, 0.14, 0.45, 0.5, 0.75, 0.75);
  }
}

export interface HsNow extends Now {
  /** The broom: resting on the pan being taken, or in both hands, or only the right; its stroke on the floor. */
  broom: 'rest' | 'two' | 'one' | 'off';
  stroke: Stroke;
  /** How far from where it is it's blended (take, put). */
  broomE: number;
  pan: PanPose;
  /** The left hand's on the pan's handle. */
  panHeld: boolean;
  /** 0 scattered round the chair, 1 all in a heap. */
  gather: number;
  /** 0 the heap on the floor, 1 all in the pan. */
  inPan: number;
  /** 0 in the pan, 1 all in the bin; < 0 not falling. */
  fall: number;
  lid: number;
}

export function hsNow(t: number, H = 1.6): HsNow {
  const b = beatOf(STEPS, t);
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const at = b.e > 0 ? mixAt(atOf(b.from, 1), atOf(b.to, 0), b.e) : atOf(k, p);
  const K = blended(b, (x, q) => pose(x, q, H));
  const pan = b.e > 0 ? mixPan(panOf(b.from, 1), panOf(b.to, 0), b.e) : panOf(k, p);
  const one = k === 'toPan' || k === 'brushIn' || k === 'lift' || k === 'walk' || k === 'over' || k === 'tip' || k === 'back';
  const atPan = k === 'take' || k === 'put';
  return {
    beat: k,
    key: K,
    at,
    walking: k === 'walk' || k === 'back',
    broom: atPan ? (p > 0.55 === (k === 'take') ? 'two' : 'rest') : one ? 'one' : 'two',
    stroke: hsStroke(t, k, p),
    broomE: k === 'take' ? ss(p, 0.55, 1) : k === 'put' ? 1 - ss(p, 0, 0.5) : 1,
    pan,
    panHeld: (k === 'toPan' && p > 0.2) || k === 'brushIn' || k === 'lift' || k === 'walk' || k === 'over' || k === 'tip' || k === 'back' || (k === 'put' && p < 0.8),
    gather: k === 'take' ? 0 : k === 'gather' ? ss(p, 0.03, 0.97) : 1,
    inPan: k === 'brushIn' ? ss(p, 0.1, 0.92) : k === 'lift' || k === 'walk' || k === 'over' ? 1 : k === 'tip' ? 1 : 0,
    fall: k === 'tip' ? ss(p, 0.3, 0.75) : k === 'back' || k === 'put' ? 1 : -1,
    lid: k === 'over' ? ss(p) : k === 'tip' ? 1 - ss(p, 0.8, 1) : 0,
  };
}
