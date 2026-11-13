import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * Two pieces of police desk work drawn in their own right (2026-11-02, at the user's request).
 *
 * 분실물 접수 (poLostShelf): 유실물법 시행령 제1조 has what's handed in come with a report and the one handing it in given a 보관증
 * (a receipt). So: the found item taken and looked over, a tag written and tied on, the entry made in the ledger,
 * the receipt torn off for the tray, and the bag put up on the shelf. The ledger itself is the game's: the article doesn't name one.
 *
 * 지문 대조 (poPrintScanner): the general way of it, a print's ridge endings and forks compared one by one against a known print. The
 * card goes on the scanner's plate and comes back to its tray, a loupe goes over it while the two prints are side by side on the screen, the
 * points are marked, and a result noted. No threshold is shown as if it were the rule: sources give different numbers.
 *
 * One clock for the hands and what they hold: `poNow` says all of it for a moment and workplaces/police.ts draws it. Every place
 * is in the piece's frame (x across, y up, z to its front), the dweller facing -z.
 */
export type PoMotion = 'poLost' | 'poSort' | 'poPrint' | 'poEnrol';
export const PO_MOTIONS = new Set<string>(['poLost', 'poSort', 'poPrint', 'poEnrol']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
export type P = [number, number, number];
const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const wave = (t: number, hz: number, s = 0) => Math.sin((t * hz + s) * Math.PI * 2);
const pulse = (t: number, hz: number, s = 0) => Math.max(0, wave(t, hz, s)) ** 4;

export const poPhase = (p: THREE.Vector3) => frac(p.x * 0.283 + p.z * 0.517);

export interface SpotAt {
  x: number;
  z: number;
  yaw: number;
}
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the floor, `ahead`), in the piece's. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, up, s.z - side * n + ahead * c];
}
function inSpot(s: SpotAt, p: P): P {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1], dx * n + dz * c];
}

type Step<K extends string> = { key: K; hold: number; move: number };
const st = <K extends string>(key: K, hold: number, move = 0.5): Step<K> => ({ key, hold, move });
const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);
interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = roundOf(steps);
  let u = frac(t / T + phase) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: ss(Math.min(1, u / k.move)), p: 1 };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0 };
}

export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
}
const key = (l: P, r: P, lean: number, nod: number, palms = 0.6, gl = 0.3, gr = 0.3, crouch = 0): Key => ({ l, r, lean, nod, palms, gl, gr, crouch });
function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch, b.crouch, e) };
}
function blended<K extends string>(b: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(b.from, b.e > 0 ? 1 : b.p);
  return b.e > 0 ? mixKey(a, pose(b.to, 0), b.e) : a;
}

/** How the dweller's shoulders stand for a key (see avatar.ts: about 1.3 m up, 0.18 m out, down half a leg at full crouch), for checking reach. */
export function shoulderOf(at: SpotAt, sx: number, k: Pick<Key, 'lean' | 'crouch'>): P {
  return sp(at, sx * 0.18, 1.3 - 0.45 * (1 - Math.cos(k.lean)) - 0.37 * k.crouch, 0.45 * Math.sin(k.lean));
}

/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;

export type PoTool = 'bag' | 'pen' | 'slip' | 'card' | 'loupe';

/** Everything about a moment. */
export interface PoNow {
  beat: string;
  key: Key;
  at: SpotAt;
  tool: PoTool | null;
  /** Which hand the bag follows; the other on it too. */
  lead: 'left' | 'right';
  two: boolean;
  /** The found bag (the middle of its seal), turned a little to be looked at. */
  bagAt: P;
  bagTurn: number;
  /** The tag: where it is if it isn't on the bag, and whether the left hand has it; written so far; tied. */
  tagAt: P | null;
  tagInHand: boolean;
  tagWrit: number;
  tied: boolean;
  /** The ledger's new entry so far (0-1), the receipt in the tray. */
  entry: number;
  slipAt: P | null;
  slipOut: boolean;
  penAt: P | null;
  /** The card (the point it's held by), and what's on the screen. */
  cardAt: P;
  loupeAt: P | null;
  scan: number | null;
  screen: 'idle' | 'scan' | 'compare' | 'result' | 'filed';
  marks: number;
  /** The result form's lines. */
  form: number;
}

// =============================================================================================
// 분실물 보관 선반: the shelf bay on the left, the intake counter on the right.

export const SHELF = { levels: [0.12, 0.55, 0.98], top: 1.4, front: 0.05, x0: -0.96, x1: -0.02, counter: 0.95, counterFront: 0.3 };
export const LOST_AT: SpotAt = { x: 0.2, z: 0.55, yaw: Math.PI };
/** How far apart along the seal the two hands take the bag. */
const G = 0.05;
export const BAG = { grip: G, drop: 0.24 };
export const BAG_HOME: P = [0.66, 1.21, 0.06];
const LOOK: P = [0.34, 1.2, 0.24];
const TIE: P = [0.24, 1.12, 0.26];
const MID: P = [0.14, 1.22, 0.2];
export const BAG_SLOT: P = [-0.16, SHELF.levels[2] + 0.24, -0.02];
export const TAG_HOME: P = [0.05, 0.962, 0.22];
export const TAG_ON: P = [-0.05, -0.03, 0.022];
const TAG_WRITE = add(TAG_HOME, [0, PEN_UP, 0]);
const PAD_STEADY: P = [-0.04, 0.975, 0.24];
export const PEN_CUP: P = [0.5, 1.035, 0.27];
export const LEDGER: P = [0.33, 0.958, 0.14];
export const SLIP_PAD: P = [0.56, 0.962, 0.24];
export const SLIP_TRAY: P = [0.78, 0.975, 0.24];
const IDLE_L = sp(LOST_AT, 0.13, 1.03, 0.2);
const IDLE_R = sp(LOST_AT, -0.13, 1.03, 0.2);
const onR = (a: P): P => add(a, [G, 0, 0]);
const onL = (a: P): P => add(a, [-G, 0, 0]);

type LostKey = 'take' | 'look' | 'down' | 'write' | 'tie' | 'ledger' | 'slip' | 'carry' | 'pass' | 'shelve' | 'check';
const LOST: Array<Step<LostKey>> = [st('take', 2.0), st('look', 1.8), st('down', 1.2), st('write', 3.4), st('tie', 3.0), st('ledger', 3.8), st('slip', 2.0), st('carry', 1.8), st('pass', 0.8, 0.3), st('shelve', 2.0), st('check', 1.6, 0.7)];
export const LOST_ROUND = roundOf(LOST);

function writing(cup: P, p: number, at: (u: number) => P): P {
  const u = THREE.MathUtils.clamp((p - 0.14) / 0.68, 0, 1);
  if (p < 0.14) return mixP(cup, at(0), ss(p, 0, 0.14));
  if (p > 0.82) return mixP(at(1), cup, ss(p, 0.82, 1));
  return at(u);
}
const tagLine = (t: number) => (u: number): P => add(TAG_WRITE, [-0.03 + 0.06 * frac(u * 2), 0.003 * wave(t, 7), 0.008 - 0.016 * Math.floor(u * 2)]);
const entryLine = (t: number) => (u: number): P => add(LEDGER, [0.03 + 0.11 * frac(u * 3), PEN_UP + 0.003 * wave(t, 7), 0.05 - 0.035 * Math.floor(u * 3)]);

function lostKey(k: LostKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'take':
      return key(mixP(IDLE_L, onL(LOOK), ss(p, 0.6, 1)), onR(mixP(BAG_HOME, LOOK, ss(p, 0.2, 0.8))), 0.26, 0.3, 0.6, 0.4, 0.75);
    case 'look':
      return key(onL(LOOK), onR(LOOK), 0.2, 0.34 + 0.05 * pulse(t, 0.7, s), 0.6, 0.75, 0.75);
    case 'down':
      return key(mixP(onL(LOOK), IDLE_L, ss(p, 0, 0.5)), onR(mixP(LOOK, BAG_HOME, ss(p, 0.1, 0.9))), 0.26, 0.3, 0.6, 0.3, 0.75);
    case 'write':
      return key(PAD_STEADY, writing(PEN_CUP, p, tagLine(t)), 0.3, 0.48, 0.05, 0.2, 0.7);
    case 'tie': {
      const up = ss(p, 0.05, 0.3) * (1 - ss(p, 0.78, 1));
      const tag = add(TIE, TAG_ON);
      const l = p < 0.72 ? mixP(TAG_HOME, add(tag, [0, 0.005 * wave(t, 3), 0]), ss(p, 0.02, 0.3)) : mixP(tag, IDLE_L, ss(p, 0.72, 0.95));
      return key(l, onR(mixP(BAG_HOME, TIE, up)), 0.3, 0.44, 0.6, 0.65, 0.75);
    }
    case 'ledger':
      return key([0.2, 0.975, 0.2], writing(PEN_CUP, p, entryLine(t)), 0.32, 0.5, 0.05, 0.15, 0.7);
    case 'slip':
      return key(IDLE_L, mixP(add(SLIP_PAD, [0, 0.008, 0]), add(SLIP_TRAY, [0, 0.03, 0]), ss(p, 0.15, 0.8)), 0.24, 0.38, 0.6, 0.3, 0.7);
    case 'carry':
      return key(mixP(IDLE_L, onL(MID), ss(p, 0.55, 1)), onR(mixP(BAG_HOME, MID, ss(p, 0.1, 0.9))), 0.26, 0.26, 0.6, 0.5, 0.75);
    case 'pass':
      return key(onL(MID), onR(MID), 0.26, 0.26, 0.6, 0.75, 0.75);
    case 'shelve':
      return key(onL(mixP(MID, BAG_SLOT, ss(p, 0.05, 0.8))), mixP(onR(MID), IDLE_R, ss(p, 0, 0.5)), 0.5, 0.2, 0.6, 0.75, 0.3);
    default:
      return key(mixP(onL(BAG_SLOT), IDLE_L, ss(p, 0, 0.5)), IDLE_R, 0.2, 0.12, 0.6, 0.3, 0.3);
  }
}
const LOST_ORDER = LOST.map((x) => x.key);
const lostPast = (k: LostKey, than: LostKey) => LOST_ORDER.indexOf(k) >= LOST_ORDER.indexOf(than);

function blank(beat: string, k: Key, at: SpotAt): PoNow {
  return {
    beat, key: k, at, tool: null, lead: 'right', two: false,
    bagAt: BAG_HOME, bagTurn: 0, tagAt: TAG_HOME, tagInHand: false, tagWrit: 0, tied: false, entry: 0, slipAt: null, slipOut: false, penAt: null,
    cardAt: CARD_TRAY, loupeAt: null, scan: null, screen: 'idle', marks: 0, form: 0,
  };
}

function lostNow(t: number, ph: number): PoNow {
  const b = beatOf(LOST, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const K = blended(b, (x, q) => lostKey(x, q, t, s));
  const n = blank(k, K, LOST_AT);
  n.tagWrit = lostPast(k, 'tie') ? 1 : k === 'write' ? ss(p, 0.14, 0.82) : 0;
  n.tied = (k === 'tie' && p >= 0.72) || lostPast(k, 'ledger');
  n.tagInHand = k === 'tie' && p < 0.72;
  n.tagAt = n.tied ? null : n.tagInHand ? K.l : TAG_HOME;
  n.entry = lostPast(k, 'slip') ? 1 : k === 'ledger' ? ss(p, 0.14, 0.82) : 0;
  n.slipOut = lostPast(k, 'carry') || (k === 'slip' && p >= 0.85);
  n.bagAt = lostPast(k, 'shelve') && !(k === 'shelve' && p < 0.86) ? BAG_SLOT : BAG_HOME;
  switch (k) {
    case 'take':
    case 'look':
    case 'down':
      if (k !== 'down' || p < 0.95) {
        n.tool = 'bag';
        n.two = k === 'look' || (k === 'take' && p > 0.7) || (k === 'down' && p < 0.15);
        n.bagAt = onLess(K.r);
        n.bagTurn = k === 'look' ? 0.5 * wave(t, 0.5, s) : 0;
      }
      break;
    case 'write':
    case 'ledger':
      if (p < 0.97) {
        n.tool = 'pen';
        n.penAt = K.r;
      }
      break;
    case 'tie':
      n.tool = 'bag';
      n.bagAt = onLess(K.r);
      if (p > 0.96) n.tool = null;
      break;
    case 'slip':
      if (p < 0.85) {
        n.tool = 'slip';
        n.slipAt = K.r;
      }
      break;
    case 'carry':
    case 'pass':
      n.tool = 'bag';
      n.two = k === 'pass' || p > 0.7;
      n.lead = k === 'pass' && p > 0.5 ? 'left' : 'right';
      n.bagAt = n.lead === 'left' ? add(K.l, [G, 0, 0]) : onLess(K.r);
      break;
    case 'shelve':
      if (p < 0.86) {
        n.tool = 'bag';
        n.lead = 'left';
        n.two = p < 0.1;
        n.bagAt = add(K.l, [G, 0, 0]);
      }
      break;
    default:
      break;
  }
  return n;
}
function onLess(r: P): P {
  return add(r, [-G, 0, 0]);
}

// 보관 분실물 정리하기: tags read along the shelf, a box squared up, the low shelf looked over.
export const SORT_AT: SpotAt = { x: -0.42, z: 0.5, yaw: Math.PI };
type SortKey = 'read' | 'square' | 'low' | 'done';
const SORT: Array<Step<SortKey>> = [st('read', 3.2, 0.6), st('square', 2.8, 0.7), st('low', 3.0, 0.7), st('done', 1.6, 0.7)];
export const SORT_ROUND = roundOf(SORT);
function sortKey(k: SortKey, p: number, t: number, s: number): Key {
  const L = sp(SORT_AT, 0.13, 1.03, 0.2);
  const R = sp(SORT_AT, -0.13, 1.03, 0.2);
  switch (k) {
    case 'read': {
      const x = mix(-0.58, -0.26, frac(p * 1.5));
      return key(L, [x, SHELF.levels[2] + 0.16, 0.06], 0.42, 0.26, 0.6, 0.3, 0.6);
    }
    case 'square': {
      const o = 0.012 * wave(t, 0.8, s);
      return key([-0.6 + o, SHELF.levels[1] + 0.3, 0.05], [-0.26 + o, SHELF.levels[1] + 0.3, 0.05], 0.5, 0.42, 1.3, 0.1, 0.1, 0.1);
    }
    case 'low':
      return key(L, [mix(-0.56, -0.3, frac(p * 1.2)), SHELF.levels[1] + 0.2, 0.08], 0.5, 0.55, 0.6, 0.3, 0.6, 0.45);
    default:
      return key(L, R, 0.14, 0.16 + 0.06 * pulse(t, 0.6, s));
  }
}
function sortNow(t: number, ph: number): PoNow {
  const b = beatOf(SORT, t, ph);
  const K = blended(b, (x, q) => sortKey(x, q, t, ph * 7.1));
  const n = blank(b.from, K, SORT_AT);
  n.tied = false;
  return n;
}

// =============================================================================================
// 지문 대조기: a bench with a flatbed scanner on the right, the monitor at the back, the card's tray, a loupe and the form in front.

export const BENCH = { top: 0.9, back: -0.46, front: 0.3 };
export const PRINT_AT: SpotAt = { x: 0.1, z: 0.5, yaw: Math.PI };
/** The card's held at its near right corner: from there to its middle. */
export const CARD_MID: P = [-0.07, 0, -0.04];
export const CARD_TRAY: P = [0.07, 0.916, 0.2];
export const CARD_PLATE: P = [0.53, 0.958, 0.06];
export const MOUSE: P = [0.5, 0.935, 0.26];
export const FORM: P = [0.2, 0.904, 0.22];
export const PRINT_PEN_CUP: P = [0.34, 0.99, 0.27];
export const LOUPE_HOME: P = [-0.2, 0.914, 0.28];
const OVER_CARD: P = [0.0, 0.985, 0.25];
const P_L = sp(PRINT_AT, 0.13, 1.03, 0.2);
const P_R = sp(PRINT_AT, -0.13, 1.03, 0.2);

type PrintKey = 'take' | 'scan' | 'lift' | 'loupe' | 'mark' | 'note' | 'file';
const PRINT: Array<Step<PrintKey>> = [st('take', 2.4), st('scan', 3.0), st('lift', 1.8), st('loupe', 4.0), st('mark', 5.0), st('note', 3.4), st('file', 1.6, 0.7)];
export const PRINT_ROUND = roundOf(PRINT);
const ENROL: Array<Step<PrintKey>> = [st('take', 2.4), st('scan', 3.0), st('lift', 1.8), st('file', 2.4, 0.7)];
export const ENROL_ROUND = roundOf(ENROL);
const click = (t: number, s: number) => -0.004 * pulse(t, 1.1, s);

function printKey(k: PrintKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'take': {
      const r = mixP(CARD_TRAY, CARD_PLATE, ss(p, 0.15, 0.9));
      return key(P_L, add(r, [0, 0.05 * Math.sin(ss(p, 0.15, 0.9) * Math.PI), 0]), 0.36, 0.42, 0.6, 0.3, 0.7);
    }
    case 'scan':
      return key(P_L, add(MOUSE, [0, click(t, s), 0]), 0.26, 0.2, 0.6, 0.3, 0.35);
    case 'lift': {
      const r = mixP(CARD_PLATE, CARD_TRAY, ss(p, 0.1, 0.85));
      return key(P_L, add(r, [0, 0.05 * Math.sin(ss(p, 0.1, 0.85) * Math.PI), 0]), 0.36, 0.42, 0.6, 0.3, 0.7);
    }
    case 'loupe': {
      const over = add(OVER_CARD, [0.03 * wave(t, 0.25, s), 0, 0.015 * wave(t, 0.4, s)]);
      return key(mixP(LOUPE_HOME, over, ss(p, 0, 0.18)), MOUSE, 0.3, p % 0.5 < 0.25 ? 0.5 : 0.2, 0.6, 0.75, 0.35);
    }
    case 'mark': {
      const over = add(OVER_CARD, [0.03 * wave(t, 0.25, s), 0, 0.015 * wave(t, 0.4, s)]);
      return key(mixP(over, LOUPE_HOME, ss(p, 0.84, 0.98)), add(MOUSE, [0.012 * wave(t, 0.3, s), click(t, s), 0.008 * wave(t, 0.45, s)]), 0.3, 0.24, 0.6, 0.75, 0.35);
    }
    case 'note': {
      const at = (u: number): P => add(FORM, [-0.04 + 0.08 * frac(u * 3), PEN_UP + 0.003 * wave(t, 7), 0.03 - 0.03 * Math.floor(u * 3)]);
      return key(add(FORM, [-0.15, 0.03, 0.03]), writing(PRINT_PEN_CUP, p, at), 0.3, 0.46, 0.05, 0.2, 0.7);
    }
    default:
      return key(P_L, P_R, 0.14, 0.16);
  }
}
function printNow(steps: Array<Step<PrintKey>>, t: number, ph: number): PoNow {
  const b = beatOf(steps, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const K = blended(b, (x, q) => printKey(x, q, t, s));
  const n = blank(k, K, PRINT_AT);
  n.cardAt = k === 'scan' ? CARD_PLATE : CARD_TRAY;
  const full = steps === PRINT;
  n.screen = 'idle';
  if (k === 'take' && p >= 0.95) n.cardAt = CARD_PLATE;
  if ((k === 'take' && p < 0.95) || (k === 'lift' && p < 0.95)) {
    n.tool = 'card';
    n.cardAt = K.r;
  }
  if (k === 'scan') {
    n.scan = ss(p, 0.1, 0.9);
    n.screen = 'scan';
  }
  if (k === 'lift') n.screen = full ? 'compare' : 'filed';
  if (k === 'loupe' || (k === 'mark' && p < 0.97)) {
    n.tool = 'loupe';
    n.loupeAt = K.l;
  }
  if (k === 'loupe') n.screen = 'compare';
  if (k === 'mark') {
    n.screen = 'compare';
    n.marks = Math.floor(ss(p, 0.04, 0.82) * 8.99);
  }
  if (k === 'note') {
    n.screen = 'result';
    n.marks = 8;
    n.form = ss(p, 0.14, 0.82);
    if (p < 0.97) {
      n.tool = 'pen';
      n.penAt = K.r;
    }
  }
  if (k === 'file') {
    n.screen = full ? 'result' : 'filed';
    n.marks = full ? 8 : 0;
    n.form = full ? 1 : 0;
  }
  return n;
}

// =============================================================================================

export function poNow(m: PoMotion, t: number, ph: number): PoNow {
  switch (m) {
    case 'poLost':
      return lostNow(t, ph);
    case 'poSort':
      return sortNow(t, ph);
    case 'poPrint':
      return printNow(PRINT, t, ph);
    default:
      return printNow(ENROL, t, ph);
  }
}

const stepsOf = (m: PoMotion) => (m === 'poLost' ? LOST : m === 'poSort' ? SORT : m === 'poPrint' ? PRINT : ENROL) as Array<Step<string>>;
/** Seconds into a round where each beat starts (for the lead's shots). */
export function poBeatTimes(m: PoMotion): Array<[string, number]> {
  let u = 0;
  return stepsOf(m).map((k) => {
    const at: [string, number] = [k.key, u];
    u += k.hold + k.move;
    return at;
  });
}

export function poDoing(m: PoMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = poNow(m, t, poPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
