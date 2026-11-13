import { add, beatOf, blended, key, mix, mixP, roundOf, ss, st, timesOf, wave, type Key, type Now, type P, type SpotAt, type Step } from './handWorkKit';

/*
 * 사포질 (xwSanding), at the finishing table: a flat block with #120 on it, long strokes along the grain (the panel's grain runs across the
 * dweller, x here) row by row, never across; the surface felt with a flat left palm; the dust swept off with that palm and blown after (dust
 * left on scratches under the next sheet); the sheet changed for #220 and the same again.
 */
export const CP_PANEL = { x: 0.1, y: 0.865, z: 0.04, w: 0.6, d: 0.4 };
export const CP_AT: SpotAt = { x: 0.06, z: 0.5, yaw: Math.PI };
export const CP_REST: P = [0.5, 0.78, 0.27];
export const CP_SHEET: P = [0.5, 0.782, 0.1];
const P_ = CP_PANEL;
const TOP = P_.y;

type K = 'take' | 'sand1' | 'feel1' | 'dust1' | 'change' | 'sand2' | 'feel2' | 'blow' | 'set';
const STEPS: Array<Step<K>> = [st('take', 1.2), st('sand1', 7), st('feel1', 2.8), st('dust1', 2.4), st('change', 3.2), st('sand2', 6), st('feel2', 2.4), st('blow', 2.2), st('set', 1.1)];
export const CP_ROUND = roundOf(STEPS);
export const cpBeatTimes = () => timesOf(STEPS);

/** How much higher than the block's foot the hand closes. */
const BLOCK_HAND = 0.03;
const PARK: P = [P_.x + 0.2, TOP + BLOCK_HAND, P_.z + 0.12];
/** Along the grain, a row at a time from the front of the panel to the back: there and back, there and back. */
function along(p: number, rows: number, t: number): P {
  const r = Math.min(rows - 1, Math.floor(p * rows));
  const u = p * rows - r;
  const x = P_.x + 0.16 * Math.sin(u * Math.PI * 2 * 3);
  const rz = P_.z + P_.d / 2 - 0.05 - (r * (P_.d - 0.16)) / Math.max(1, rows - 1);
  return [x, TOP + BLOCK_HAND + 0.002 * wave(t, 5), rz];
}
const HOLD_L: P = [P_.x - P_.w / 2 - 0.04, TOP + 0.015, P_.z + 0.1];
const idleL: P = [P_.x - 0.2, 1.0, 0.45];
const idleR: P = [P_.x + 0.2, 1.0, 0.45];
const feel = (p: number): P => [P_.x + 0.1 - 0.32 * ss(p, 0.05, 0.95), TOP + 0.022, P_.z + 0.1 - 0.12 * ss(p)];

function pose(k: K, p: number, t: number): Key {
  switch (k) {
    case 'take':
      return key(HOLD_L, mixP(idleR, add(CP_REST, [0, BLOCK_HAND, 0]), Math.sin(Math.PI * ss(p)) ** 2 * 0.8 + 0.2 * ss(p)), 0.3, 0.45, 0.6, 0.3, 0.7);
    case 'sand1':
      return key(HOLD_L, along(p, 3, t), 0.5, 0.6, 0.6, 0.35, 0.8);
    case 'sand2':
      return key(HOLD_L, along(p, 2, t), 0.5, 0.6, 0.6, 0.35, 0.8);
    case 'feel1':
    case 'feel2':
      return key(feel(p), PARK, 0.4, 0.58, 1.1, 0.05, 0.7);
    case 'dust1':
      // The side of the palm drawn off towards the far edge.
      return key([P_.x + 0.06 - 0.26 * ((p * 3) % 1), TOP + 0.03, P_.z + 0.06], PARK, 0.5, 0.58, 1, 0.1, 0.7);
    case 'change': {
      // The block held down in the left; the old sheet off to the side, the new one brought over.
      const l = add(PARK, [0, 0.005, 0]);
      const r = p < 0.5 ? mixP(add(PARK, [0.0, 0.03, 0.03]), add(CP_SHEET, [0, 0.02, 0]), ss(p, 0.05, 0.45)) : mixP(add(CP_SHEET, [0, 0.02, 0]), add(PARK, [0.0, 0.03, 0.03]), ss(p, 0.55, 0.95));
      return key(l, r, 0.38, 0.5, 0.8, 0.6, 0.55);
    }
    case 'blow':
      return key(HOLD_L, PARK, 0.72, 0.85, 0.6, 0.3, 0.7);
    default:
      return key(idleL, mixP(add(CP_REST, [0, BLOCK_HAND, 0]), idleR, ss(p, 0.6, 1)), 0.26, 0.4, 0.6, 0.3, 0.7);
  }
}

export interface CpNow extends Now {
  /** The block in the right hand, or on the table; the left's on it while the sheet's changed. */
  block: 'rest' | 'right' | 'left';
  blockAt: P;
  /** Which sheet's on the block. */
  grit: 120 | 220;
  /** The sheet being brought over. */
  sheetAt: P | null;
  /** A flat left hand, and where. */
  palm: boolean;
  sanding: boolean;
  /** Dust lying on the panel, 0-1; rough marks left, 0-1. */
  dust: number;
  rough: number;
  blowing: number;
}

export function cpNow(t: number): CpNow {
  const b = beatOf(STEPS, t);
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const K = blended(b, (x, q) => pose(x, q, t));
  const inRight = (k === 'take' && p > 0.55) || k === 'sand1' || k === 'feel1' || k === 'dust1' || k === 'sand2' || k === 'feel2' || k === 'blow' || (k === 'set' && p < 0.55);
  const left = k === 'change';
  const grit = k === 'change' ? (p > 0.5 ? 220 : 120) : k === 'sand2' || k === 'feel2' || k === 'blow' || k === 'set' ? 220 : 120;
  const blockAt: P = left ? [PARK[0], TOP, PARK[2]] : inRight ? [K.r[0], K.r[1] - BLOCK_HAND, K.r[2]] : [CP_REST[0], CP_REST[1], CP_REST[2]];
  return {
    beat: k,
    key: K,
    at: CP_AT,
    block: left ? 'left' : inRight ? 'right' : 'rest',
    blockAt,
    grit,
    sheetAt: k === 'change' && p > 0.4 ? [K.r[0], K.r[1] - 0.015, K.r[2]] : null,
    palm: k === 'feel1' || k === 'feel2' || k === 'dust1',
    sanding: k === 'sand1' || k === 'sand2',
    dust: k === 'sand1' ? ss(p, 0, 0.8) * 0.9 : k === 'feel1' ? 0.9 : k === 'dust1' ? mix(0.9, 0.25, ss(p)) : k === 'change' ? 0.25 : k === 'sand2' ? mix(0.25, 0.7, ss(p)) : k === 'feel2' ? 0.7 : k === 'blow' ? mix(0.7, 0, ss(p, 0.1, 0.8)) : 0,
    rough: k === 'take' ? 1 : k === 'sand1' ? 1 - 0.6 * ss(p) : k === 'feel1' || k === 'dust1' || k === 'change' ? 0.4 : k === 'sand2' ? 0.4 * (1 - ss(p)) : 0,
    blowing: k === 'blow' ? p : -1,
  };
}
