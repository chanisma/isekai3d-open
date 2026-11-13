import { add, beatOf, blended, key, mixP, roundOf, ss, st, timesOf, type Key, type Now, type P, type SpotAt, type Step } from './handWorkKit';

/*
 * 젤 제거 (xwSoakOff), at the nail table, in the order a published guide gives (Allure Korea): the shine filed off, oil round the nails
 * against the acetone, soaked cotton on each nail and foil round it, about ten minutes (the dial runs them fast), the foil off and what's
 * softened eased from the cuticle towards the free edge with no force, the 220 buffer, oil last. The client's hand is the table's own.
 */
export const NL_W: P = [-0.03, 0.79, 0];
export const NL_AT: SpotAt = { x: -0.5, z: 0, yaw: Math.PI / 2 };
export const NL_SEAT = 0.48;
const SURF = 0.738;
/** MANI.nails in activity.ts (side, up, ahead; thumb first), copied since activity.ts imports this file; a test keeps them the same. */
export const NAIL_OFFSETS: P[] = [[-0.045, 0.012, -0.035], [-0.022, 0.016, -0.078], [0, 0.016, -0.088], [0.021, 0.015, -0.08], [0.04, 0.013, -0.064]];
/** The nails in the piece's frame: the artist faces +x, their left -z, the fingers back towards them. */
export const NAILS: P[] = NAIL_OFFSETS.map((n) => [NL_W[0] + n[2], NL_W[1] + n[1], NL_W[2] - n[0]]);
export const NL_TRAY: P = [-0.14, SURF, 0.2];
export const NL_DISH: P = [-0.14, SURF, -0.2];
export const NL_TIMER: P = [-0.03, SURF, 0.3];
/** A hand's standing off a pen's tip, in the piece's frame. */
const PEN_OFF: P = [-0.06, 0.06, 0.02];
const HOLD_L = (i: number): P => add(NAILS[Math.min(4, i)], [-0.02, 0.03, -0.035]);
/** A file's or buffer's hand is this far along it (towards the dweller's right) from what it rubs. */
export const FILE_HAND = 0.06;
const idleR: P = [-0.26, SURF + 0.04, 0.16];
const idleL: P = [-0.26, SURF + 0.04, -0.16];

type K = 'file' | 'preOil' | 'wrap' | 'wait' | 'push' | 'buff' | 'oil' | 'clear';
const STEPS: Array<Step<K>> = [st('file', 4), st('preOil', 2.5), st('wrap', 6.5), st('wait', 4), st('push', 8), st('buff', 3.5), st('oil', 3.5), st('clear', 1)];
export const NL_ROUND = roundOf(STEPS);
export const nlBeatTimes = () => timesOf(STEPS);
const ORDER = STEPS.map((x) => x.key);
const past = (k: K, than: K) => ORDER.indexOf(k) >= ORDER.indexOf(than);
const nailOf = (p: number) => Math.min(4, Math.floor(p * 5));
const within = (p: number) => {
  const i = nailOf(p);
  return p * 5 - i;
};

function pose(k: K, p: number): Key {
  const i = nailOf(p);
  const q = within(p);
  const n = NAILS[i];
  const nod = 0.62;
  switch (k) {
    case 'file':
    case 'buff': {
      const w = 0.012 * Math.sin(q * Math.PI * 12);
      return key(HOLD_L(i), add(n, [w, 0.035, FILE_HAND]), 0.34, nod, 0.7, 0.65, 0.7);
    }
    case 'preOil':
    case 'oil':
      return key(HOLD_L(i), add(add(n, [0.008, 0, 0]), PEN_OFF), 0.34, nod, 0.7, 0.65, 0.8);
    case 'wrap':
      // Off the tray to the nail and pressed on.
      return key(HOLD_L(i), q < 0.45 ? mixP(add(NL_TRAY, [-0.02, 0.04, 0]), add(n, [-0.012, 0.03, 0.008]), ss(q, 0.1, 0.45)) : mixP(add(n, [-0.012, 0.03, 0.008]), add(NL_TRAY, [-0.02, 0.04, 0]), ss(q, 0.8, 1)), 0.32, nod, 0.7, 0.65, 0.65);
    case 'wait':
      return key(idleL, idleR, 0.1, 0.32, 0.8, 0.2, 0.2);
    case 'push':
      return key(HOLD_L(i), add(add(n, [ss(q, 0.25, 0.9) * -0.012, 0, 0]), PEN_OFF), 0.36, 0.66, 0.7, 0.65, 0.8);
    default:
      return key(idleL, mixP(add(n, [-0.04, 0.05, 0.03]), idleR, ss(p)), 0.2, 0.4, 0.7, 0.2, 0.3);
  }
}

export type NlTool = 'file' | 'oil' | 'pusher' | 'buffer' | 'wrap' | null;
export interface NlNow extends Now {
  tool: NlTool;
  /** The tool's tip (a pen's), or the middle of a held thing. */
  toolAt: P;
  /** How worn each nail's gel is: 1 glossy, ~0.7 filed. */
  shine: number;
  /** Per nail: how much gel's left (1 on, 0 gone), whether its foil's on; `oil` on it. */
  gel: number[];
  foil: boolean[];
  wrapIn: P | null;
  oilSheen: number;
  /** How far round the dial's gone, 0-1. */
  dial: number;
  /** A nail's foil off in the dish so far. */
  foils: number;
}
const NONE: P = [0, 0, 0];

export function nlNow(t: number): NlNow {
  const b = beatOf(STEPS, t);
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const K = blended(b, (x, q) => pose(x, q));
  const i = nailOf(p);
  const q = within(p);
  const gel = [0, 1, 2, 3, 4].map((n) => {
    if (!past(k, 'push')) return 1;
    if (k !== 'push') return 0;
    return n < i ? 0 : n === i ? 1 - ss(q, 0.25, 0.9) : 1;
  });
  const foil = [0, 1, 2, 3, 4].map((n) => {
    if (k === 'wrap') return n < i || (n === i && q > 0.45);
    if (k === 'wait') return true;
    if (k === 'push') return n > i || (n === i && q < 0.2);
    return false;
  });
  const pen = k === 'file' || k === 'preOil' || k === 'push' || k === 'oil';
  const tool: NlTool = k === 'file' ? 'file' : k === 'preOil' || k === 'oil' ? 'oil' : k === 'push' ? 'pusher' : k === 'buff' ? 'buffer' : k === 'wrap' ? 'wrap' : null;
  return {
    beat: k,
    key: K,
    at: NL_AT,
    seat: NL_SEAT,
    tool,
    toolAt: tool === null ? NONE : pen && tool !== 'file' ? [K.r[0] - PEN_OFF[0], K.r[1] - PEN_OFF[1], K.r[2] - PEN_OFF[2]] : [K.r[0], K.r[1] - 0.027, K.r[2]],
    shine: k === 'file' ? 1 - 0.45 * ss(p) : 0.55,
    gel,
    foil,
    wrapIn: k === 'wrap' && q < 0.5 && q > 0.05 ? [K.r[0], K.r[1] - 0.025, K.r[2]] : null,
    oilSheen: k === 'oil' ? ss(p) : k === 'preOil' ? ss(p) * 0.5 : past(k, 'wrap') && !past(k, 'oil') ? 0.3 : k === 'clear' ? 1 : 0,
    dial: k === 'wait' ? p : k === 'wrap' ? 0 : 1,
    foils: k === 'push' ? i + (q > 0.2 ? 1 : 0) : past(k, 'buff') ? 5 : 0,
  };
}
