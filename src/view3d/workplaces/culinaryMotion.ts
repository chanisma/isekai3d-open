import { PEN_HAND, add, beatOf, blended, key, longHands, mix, mixAt, mixP, roundOf, sp, ss, st, tickTip, timesOf, wave, type Key, type Now, type P, type SpotAt, type Step, type Stroke } from './handWorkKit';

/*
 * 주방 마감 청소 (xwCloseKitchen), at the dish pit: the published closing order is surfaces first, then floor last, and a sign-off.
 * Crumbs wiped off the steel; degreaser sprayed, left a moment, wiped off where the grease was; the mop out of its bucket, turned round to
 * the floor in front of the pit and worked in an eight, a wet patch behind it; the sheet ticked last.
 */
export const KC_TOP = 0.9;
export const KC_AT: SpotAt = { x: -0.45, z: 0.56, yaw: Math.PI };
export const KC_MOP_AT: SpotAt = { x: -0.45, z: 0.62, yaw: 0 };
export const KC_CHECK_AT: SpotAt = { x: -0.72, z: 0.54, yaw: Math.PI };
/** Where things are kept while it's being done. */
export const KC_CLOTH: P = [-0.1, KC_TOP, 0.19];
export const KC_SPRAY: P = [-0.24, KC_TOP + 0.17, 0.19];
export const KC_BUCKET: P = [-0.15, 0, 0.44];
export const KC_BOARD: P = [-0.88, KC_TOP, 0.02];
/** The strip along the pit's front that's wiped. */
export const KC_STRIP = { x0: -0.72, x1: -0.34, z: 0.18 };

type K = 'getCloth' | 'crumbs' | 'dropCloth' | 'getSpray' | 'spray' | 'setSpray' | 'reCloth' | 'wipe' | 'setCloth' | 'takeMop' | 'turn' | 'mop' | 'unturn' | 'putMop' | 'toBoard' | 'tick' | 'fromBoard';
const STEPS: Array<Step<K>> = [st('getCloth', 1.2), st('crumbs', 3.4), st('dropCloth', 0.8), st('getSpray', 0.8), st('spray', 2.8), st('setSpray', 0.8), st('reCloth', 0.8), st('wipe', 4.6), st('setCloth', 0.8), st('takeMop', 1.4), st('turn', 1.3, 0.1), st('mop', 8), st('unturn', 1.3, 0.1), st('putMop', 1.0), st('toBoard', 0.8, 0.1), st('tick', 4.8), st('fromBoard', 0.8, 0.1)];
export const KC_ROUND = roundOf(STEPS);
export const kcBeatTimes = () => timesOf(STEPS);
const ORDER = STEPS.map((x) => x.key);
const past = (k: K, than: K) => ORDER.indexOf(k) >= ORDER.indexOf(than);

const L_BRACE: P = [-0.86, KC_TOP + 0.03, 0.26];
const HAND_UP = 0.022;
const stripAt = (e: number, wob: number): P => [mix(KC_STRIP.x0, KC_STRIP.x1, e), KC_TOP + HAND_UP, KC_STRIP.z + wob];
const clothUp = (p: P): P => add(p, [0, HAND_UP, 0]);
const stroke = (p: number, n: number) => 0.5 - 0.5 * Math.cos(p * n * Math.PI * 2);
const AIM_FROM: P = [-0.38, 1.15, 0.28];
const AIM_TO: P = [-0.62, 1.15, 0.28];
const REST_R: P = sp(KC_AT, -0.2, 1.0, 0.16);
export const TOP_MOP_R: P = [KC_BUCKET[0], 1.2, KC_BUCKET[2]];
export const TOP_MOP_L: P = [KC_BUCKET[0], 1.0, KC_BUCKET[2]];
const CHECK_L: P = [-0.98, KC_TOP + 0.05, 0.12];

export function kcStroke(t: number): Stroke {
  const a = (t * Math.PI * 2) / 2.4;
  return { side: 0.26 * Math.sin(a), ahead: 0.62 + 0.1 * Math.sin(2 * a), lift: 0, spin: 0 };
}

function atOf(k: K, p: number): SpotAt {
  switch (k) {
    case 'turn':
      return mixAt(KC_AT, KC_MOP_AT, ss(p));
    case 'mop':
      return KC_MOP_AT;
    case 'unturn':
      return mixAt(KC_MOP_AT, KC_AT, ss(p));
    case 'toBoard':
      return mixAt(KC_AT, KC_CHECK_AT, ss(p));
    case 'tick':
      return KC_CHECK_AT;
    case 'fromBoard':
      return mixAt(KC_CHECK_AT, KC_AT, ss(p));
    default:
      return KC_AT;
  }
}
const tickI = (p: number) => Math.min(3, Math.floor(p * 4));
function pose(k: K, p: number, t: number, H: number): Key {
  const at = atOf(k, p);
  const hands = longHands(at, H);
  switch (k) {
    case 'getCloth':
    case 'reCloth':
      return key(L_BRACE, mixP(REST_R, clothUp(KC_CLOTH), ss(p, 0.1, 0.9)), 0.3, 0.4, 0.6, 0.2, 0.2);
    case 'crumbs':
      return key(L_BRACE, clothUp(stripAt(1 - stroke(p, 2), 0)), 0.42, 0.5, 1, 0.2, 0.1);
    case 'dropCloth':
    case 'setCloth':
      return key(L_BRACE, mixP(clothUp(stripAt(1, 0)), clothUp(KC_CLOTH), ss(p, 0.1, 0.9)), 0.34, 0.4, 0.6, 0.2, 0.2);
    case 'getSpray':
      return key(L_BRACE, mixP(REST_R, KC_SPRAY, ss(p, 0.1, 0.9)), 0.28, 0.4, 0.6, 0.2, 0.7);
    case 'spray':
      return key(L_BRACE, mixP(AIM_FROM, AIM_TO, ss(p, 0.1, 0.9)), 0.26, 0.5, 0.6, 0.2, 0.8);
    case 'setSpray':
      return key(L_BRACE, mixP(AIM_TO, KC_SPRAY, ss(p, 0.1, 0.9)), 0.28, 0.4, 0.6, 0.2, 0.7);
    case 'wipe': {
      const u = ss(p, 0, 1);
      return key(L_BRACE, clothUp(stripAt(1 - u, 0.03 * wave(t, 1.3))), 0.42, 0.5, 1, 0.2, 0.1);
    }
    case 'takeMop':
    case 'putMop':
      return key(TOP_MOP_L, TOP_MOP_R, 0.12, 0.25, 0.5, 0.75, 0.75);
    case 'turn':
    case 'unturn':
    case 'mop':
      return key(hands.l, hands.r, 0.2, 0.4, 0.5, 0.75, 0.75);
    case 'toBoard':
    case 'fromBoard':
      return key(sp(at, 0.2, 1.0, 0.1), sp(at, -0.2, 1.0, 0.1), 0.1, 0.2);
    default: {
      const i = tickI(p);
      const q = p * 4 - i;
      return key(CHECK_L, add(tickTip(KC_BOARD, i, q), PEN_HAND), 0.42, 0.62, 0.3, 0.4, 0.75);
    }
  }
}

export interface KcNow extends Now {
  cloth: boolean;
  clothAt: P;
  spray: boolean;
  sprayAt: P;
  mist: boolean;
  /** How much of the crumbs and the grease are still there. */
  crumbs: number;
  grease: number;
  /** The mop: `rest` in the bucket being taken, `e` how far from the bucket to the floor; its stroke. */
  mop: 'off' | 'rest' | 'carry' | 'work';
  mopE: number;
  stroke: Stroke;
  /** How long it's been worked, for how far the floor's done. */
  mopped: number;
  pen: boolean;
  penAt: P;
  ticks: number;
}

export function kcNow(t: number, H = 1.6): KcNow {
  const b = beatOf(STEPS, t);
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const at = b.e > 0 ? mixAt(atOf(b.from, 1), atOf(b.to, 0), b.e) : atOf(k, p);
  const K = blended(b, (x, q) => pose(x, q, t, H));
  const clothing = (k === 'getCloth' && p > 0.7) || k === 'crumbs' || (k === 'dropCloth' && p < 0.9) || (k === 'reCloth' && p > 0.7) || k === 'wipe' || (k === 'setCloth' && p < 0.9);
  const spraying = (k === 'getSpray' && p > 0.7) || k === 'spray' || (k === 'setSpray' && p < 0.9);
  const mop = k === 'takeMop' || k === 'putMop' ? 'rest' : k === 'turn' || k === 'unturn' ? 'carry' : k === 'mop' ? 'work' : 'off';
  const pen = k === 'tick';
  const i = pen ? tickI(p) : 0;
  return {
    beat: k,
    key: K,
    at,
    walking: k === 'toBoard' || k === 'fromBoard',
    cloth: clothing,
    clothAt: [K.r[0], K.r[1] - HAND_UP, K.r[2]],
    spray: spraying,
    sprayAt: K.r,
    // Three pumps along the strip.
    mist: k === 'spray' && p > 0.1 && p < 0.9 && (p * 3) % 1 < 0.45,
    crumbs: k === 'crumbs' ? 1 - ss(p, 0.1, 0.95) : past(k, 'dropCloth') ? 0 : 1,
    grease: k === 'wipe' ? 1 - ss(p, 0.05, 0.95) : past(k, 'setCloth') ? 0 : 1,
    mop,
    mopE: k === 'turn' ? ss(p, 0.1, 1) : k === 'unturn' ? 1 - ss(p, 0, 0.9) : 1,
    stroke: k === 'mop' ? kcStroke(t) : kcStroke(0),
    mopped: k === 'mop' ? p : past(k, 'mop') ? 1 : 0,
    pen,
    penAt: pen ? tickTip(KC_BOARD, i, p * 4 - i) : KC_BOARD,
    ticks: pen ? i + (p * 4 - i > 0.7 ? 1 : 0) : k === 'fromBoard' ? 4 : 0,
  };
}
