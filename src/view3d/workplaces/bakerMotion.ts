import { PEN_HAND, add, beatOf, blended, key, longHands, mix, mixAt, mixP, roundOf, sp, ss, st, tickTip, timesOf, wave, type Key, type Now, type P, type SpotAt, type Step, type Stroke } from './handWorkKit';

/*
 * 베이커리 마감 청소 (xwCloseBakery), at the dough bench: crumbs and flour brushed off the maple into a pan and tipped in the bin, the
 * sheet tray wiped, the floor in front swept last, the sheet ticked. There's no published bakery order that I could read: it follows the
 * kitchen's (tops before floors, a sign-off), and a dry brush on the bench since flour and water make paste.
 */
export const BQ_TOP = 0.88;
export const BQ_AT: SpotAt = { x: -0.35, z: 0.6, yaw: Math.PI };
export const BQ_TRAY_AT: SpotAt = { x: 0.38, z: 0.6, yaw: Math.PI };
export const BQ_SWEEP_AT: SpotAt = { x: 0.38, z: 0.68, yaw: 0 };
export const BQ_BOARD_AT: SpotAt = { x: 0.08, z: 0.58, yaw: Math.PI };
export const BQ_BOARD: P = [0.05, BQ_TOP, 0.1];
export const BQ_TRAY: P = [0.38, BQ_TOP, 0.08];
export const BQ_BRUSH: P = [-0.1, BQ_TOP + 0.03, 0.22];
/** The hand on the little pan's handle, its lip towards the brush (+x). */
export const BQ_PAN: P = [-0.6, BQ_TOP + 0.04, 0.2];
export const BQ_BIN: P = [-0.74, 0, 0.62];
export const BQ_CLOTH: P = [0.5, BQ_TOP, 0.28];
/** The broom, leaned on the bench's front. */
export const BQ_BROOM_FOOT: P = [0.64, 0, 0.56];
const BROOM_R: P = [0.62, 1.14, 0.31];
const BROOM_L: P = [0.625, 0.94, 0.36];

type K = 'getBrush' | 'brush' | 'toBin' | 'tip' | 'setDown' | 'toTray' | 'getCloth' | 'tray' | 'setCloth' | 'getBroom' | 'turn' | 'sweep' | 'unturn' | 'putBroom' | 'toBoard' | 'tick' | 'home';
const STEPS: Array<Step<K>> = [st('getBrush', 1.0), st('brush', 4.6), st('toBin', 1.2), st('tip', 1.4), st('setDown', 1.0), st('toTray', 1.0, 0.1), st('getCloth', 0.7), st('tray', 4.2), st('setCloth', 0.7), st('getBroom', 1.2), st('turn', 1.2, 0.1), st('sweep', 7.5), st('unturn', 1.2, 0.1), st('putBroom', 0.9), st('toBoard', 0.9, 0.1), st('tick', 4.8), st('home', 1.0, 0.1)];
export const BQ_ROUND = roundOf(STEPS);
export const bqBeatTimes = () => timesOf(STEPS);
const ORDER = STEPS.map((x) => x.key);
const past = (k: K, than: K) => ORDER.indexOf(k) >= ORDER.indexOf(than);

export function bqStroke(t: number): Stroke {
  const a = (t * Math.PI * 2) / 1.5;
  return { side: 0.26 * Math.sin(a), ahead: 0.6 + 0.05 * Math.cos(a), lift: 0.02 * Math.max(0, Math.cos(a)), spin: Math.PI / 2 + 0.25 * Math.sin(a) };
}
function atOf(k: K, p: number): SpotAt {
  switch (k) {
    case 'toTray':
      return mixAt(BQ_AT, BQ_TRAY_AT, ss(p));
    case 'getCloth':
    case 'tray':
    case 'setCloth':
    case 'getBroom':
    case 'putBroom':
      return BQ_TRAY_AT;
    case 'turn':
      return mixAt(BQ_TRAY_AT, BQ_SWEEP_AT, ss(p));
    case 'sweep':
      return BQ_SWEEP_AT;
    case 'unturn':
      return mixAt(BQ_SWEEP_AT, BQ_TRAY_AT, ss(p));
    case 'toBoard':
      return mixAt(BQ_TRAY_AT, BQ_BOARD_AT, ss(p));
    case 'tick':
      return BQ_BOARD_AT;
    case 'home':
      return mixAt(BQ_BOARD_AT, BQ_AT, ss(p));
    default:
      return BQ_AT;
  }
}
const REST_R: P = sp(BQ_AT, -0.2, 1.0, 0.16);
const BIN_OVER: P = [BQ_BIN[0] + 0.17, 0.76, BQ_BIN[2]];
const BRUSH_HAND = (e: number, z: number): P => [mix(0.02, -0.28, e), BQ_TOP + 0.075, z];
const tickI = (p: number) => Math.min(3, Math.floor(p * 4));
function pose(k: K, p: number, t: number, H: number): Key {
  const at = atOf(k, p);
  const hands = longHands(at, H);
  const idleL = sp(at, 0.2, 1.0, 0.1);
  const idleR = sp(at, -0.2, 1.0, 0.1);
  switch (k) {
    case 'getBrush':
      return key(mixP(idleL, BQ_PAN, ss(p, 0.1, 0.9)), mixP(REST_R, add(BQ_BRUSH, [0, 0.02, 0]), ss(p, 0.1, 0.9)), 0.34, 0.45, 0.6, 0.65, 0.75);
    case 'brush': {
      // Strokes from the right to the pan at the left, a new line each.
      const n = p * 4;
      const u = n % 1;
      const e = u < 0.7 ? ss(u / 0.7) : 1 - ss((u - 0.7) / 0.3);
      return key(BQ_PAN, BRUSH_HAND(e, 0.2 - 0.05 * Math.floor(n % 2)), 0.42, 0.55, 0.6, 0.65, 0.75);
    }
    case 'toBin':
      return key(mixP(BQ_PAN, BIN_OVER, ss(p, 0.1, 0.9)), REST_R, 0.2, 0.42, 0.6, 0.65, 0.75, 0.2 * ss(p));
    case 'tip':
      return key(BIN_OVER, REST_R, 0.2, 0.5, 0.6, 0.65, 0.75, 0.2);
    case 'setDown':
      return key(mixP(BIN_OVER, BQ_PAN, ss(p, 0.1, 0.9)), mixP(REST_R, add(BQ_BRUSH, [0, 0.02, 0]), ss(p, 0.1, 0.9)), 0.34, 0.42, 0.6, 0.65, 0.75, 0.2 * (1 - ss(p)));
    case 'toTray':
    case 'toBoard':
    case 'home':
      return key(idleL, idleR, 0.08, 0.2);
    case 'getCloth':
    case 'setCloth':
      return key([BQ_TRAY[0] - 0.14, BQ_TOP + 0.03, BQ_TRAY[2] + 0.1], mixP(idleR, add(BQ_CLOTH, [0, 0.022, 0]), k === 'getCloth' ? ss(p, 0.1, 0.9) : 1 - ss(p, 0.3, 1)), 0.32, 0.45, 0.6, 0.65, 0.2);
    case 'tray': {
      // Up and down the tray in overlapping loops.
      const a = t * 3.1;
      return key([BQ_TRAY[0] - 0.14, BQ_TOP + 0.03, BQ_TRAY[2] + 0.1], [BQ_TRAY[0] + 0.03 + 0.05 * Math.cos(a), BQ_TOP + 0.042, BQ_TRAY[2] + 0.13 * wave(p, 2) + 0.02 * Math.sin(a)], 0.42, 0.55, 1, 0.65, 0.1);
    }
    case 'getBroom':
    case 'putBroom':
      return key(BROOM_L, BROOM_R, 0.12, 0.25, 0.5, 0.75, 0.75);
    case 'turn':
    case 'unturn':
    case 'sweep':
      return key(hands.l, hands.r, 0.2, 0.42, 0.5, 0.75, 0.75);
    default: {
      const i = tickI(p);
      return key([BQ_BOARD[0] - 0.13, BQ_TOP + 0.05, BQ_BOARD[2] + 0.1], add(tickTip(BQ_BOARD, i, p * 4 - i), PEN_HAND), 0.42, 0.62, 0.3, 0.4, 0.75);
    }
  }
}

export interface BqNow extends Now {
  brush: boolean;
  brushAt: P;
  /** The left hand on the pan; the pan, tipping; what's left on the bench, what's in the pan. */
  pan: boolean;
  panAt: P;
  panTip: number;
  /** 0 its lip to the brush, 1 to the bin. */
  panTurn: number;
  crumbs: number;
  inPan: number;
  falling: number;
  cloth: boolean;
  clothAt: P;
  film: number;
  broom: 'off' | 'rest' | 'carry' | 'work';
  broomE: number;
  stroke: Stroke;
  swept: number;
  pen: boolean;
  penAt: P;
  ticks: number;
}

export function bqNow(t: number, H = 1.6): BqNow {
  const b = beatOf(STEPS, t);
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const at = b.e > 0 ? mixAt(atOf(b.from, 1), atOf(b.to, 0), b.e) : atOf(k, p);
  const K = blended(b, (x, q) => pose(x, q, t, H));
  const brushing = (k === 'getBrush' && p > 0.7) || k === 'brush' || k === 'toBin' || k === 'tip' || (k === 'setDown' && p < 0.9);
  const crumbs = k === 'brush' ? 1 - ss(p, 0.08, 0.95) : past(k, 'toBin') ? 0 : 1;
  const pen = k === 'tick';
  const i = pen ? tickI(p) : 0;
  return {
    beat: k,
    key: K,
    at,
    walking: k === 'toTray' || k === 'toBoard' || k === 'home',
    brush: brushing,
    brushAt: add(K.r, [0, -0.02, 0]),
    pan: brushing,
    panAt: K.l,
    panTip: k === 'tip' ? Math.sin(Math.PI * ss(p, 0.05, 0.95)) : 0,
    panTurn: k === 'toBin' ? ss(p) : k === 'tip' ? 1 : k === 'setDown' ? 1 - ss(p) : 0,
    crumbs,
    inPan: k === 'brush' ? 1 - crumbs : k === 'toBin' ? 1 : k === 'tip' ? 1 - ss(p, 0.25, 0.7) : 0,
    falling: k === 'tip' ? p : -1,
    cloth: (k === 'getCloth' && p > 0.7) || k === 'tray' || (k === 'setCloth' && p < 0.5),
    clothAt: [K.r[0], K.r[1] - 0.022, K.r[2]],
    film: k === 'tray' ? 1 - ss(p, 0.05, 0.95) : past(k, 'setCloth') ? 0 : 1,
    broom: k === 'getBroom' || k === 'putBroom' ? 'rest' : k === 'turn' || k === 'unturn' ? 'carry' : k === 'sweep' ? 'work' : 'off',
    broomE: k === 'turn' ? ss(p, 0.1, 1) : k === 'unturn' ? 1 - ss(p, 0, 0.9) : 1,
    stroke: k === 'sweep' ? bqStroke(t) : bqStroke(0),
    swept: k === 'sweep' ? p : past(k, 'unturn') ? 1 : 0,
    pen,
    penAt: pen ? tickTip(BQ_BOARD, i, p * 4 - i) : BQ_BOARD,
    ticks: pen ? i + (p * 4 - i > 0.7 ? 1 : 0) : k === 'home' ? 4 : 0,
  };
}
