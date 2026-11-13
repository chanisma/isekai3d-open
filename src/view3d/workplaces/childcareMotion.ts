import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';
import { CARE_MOTIONS, careDoing, type CareMotion } from './childcareCareMotion';

/*
 * In a 국공립 어린이집 (2026-10-27, the workplace pipeline, at the user's request): crafts at the low
 * table with the toddlers (crayons, scissors, glue, the finished piece held up), a block tower built on
 * the mat with a toddler until it topples, a toddler patted to sleep on the nap mat (토닥토닥) and a
 * crying one rocked in the arms, the snack poured into four cups and the fruit laid out, hands washed
 * at the little sink, the 출석 chart stickered, a toddler caught at the bottom of the slide, the
 * cubbies tidied. Each is a round of beats, each held a while and eased into the next, by the same
 * clock (ccPhase of the spot) as the piece it's done at — the crayon is in the hand that colours, the
 * tower is as high as the blocks put on it, the cup fills as it's poured, the toddler is in the arms
 * that rock them (workplaces/childcareTeacher.ts). Every place is in the spot's own frame: `side` to
 * the dweller's left, `up` from the feet (stood) or the seat's top (sat), `ahead` the way they face. Kept
 * out of activity.ts (which only hands these motions over here) so it imports nothing from it at run
 * time.
 */
export type ChildcareMotion = 'ccCraft' | 'ccBlocks' | 'ccPat' | 'ccRock' | 'ccSnack' | 'ccWash' | 'ccSticker' | 'ccCatch' | 'ccTidy' | CareMotion;
export const CHILDCARE_MOTIONS = new Set<string>(['ccCraft', 'ccBlocks', 'ccPat', 'ccRock', 'ccSnack', 'ccWash', 'ccSticker', 'ccCatch', 'ccTidy', ...CARE_MOTIONS]);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The same clock offset as activity.ts toolPhase: from where they're placed, so two mats aren't in step. */
export const ccPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;

type Step<K extends string> = { key: K; hold: number; move: number };
/** Where a round is: the beat it's on (or easing out of, `e` of the way to the next), `p` how far through its hold, `n` which round. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  n: number;
  /** Which step of the round it's on (a key can come round twice). */
  i: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0);
  const c = t / T + phase;
  const n = Math.floor(c);
  let u = frac(c) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold, n, i };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: THREE.MathUtils.smoothstep(Math.min(1, u / k.move), 0, 1), p: 1, n, i };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0, n, i: 0 };
}
const st = <K extends string>(key: K, hold: number, move = 0.7): Step<K> => ({ key, hold, move });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}

/** A place in a spot's frame: [to the dweller's left, up, ahead]. */
export type Loc = [number, number, number];
export interface Key {
  l: Loc;
  r: Loc;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
}
const mixLoc = (a: Loc, b: Loc, e: number): Loc => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
export const midLoc = (a: Loc, b: Loc): Loc => mixLoc(a, b, 0.5);
function mixKey(a: Key, b: Key, e: number): Key {
  const m = (q: number, r: number) => q + (r - q) * e;
  return { l: mixLoc(a.l, b.l, e), r: mixLoc(a.r, b.r, e), lean: m(a.lean, b.lean), nod: m(a.nod, b.nod), palms: m(a.palms, b.palms), gl: m(a.gl, b.gl), gr: m(a.gr, b.gr), crouch: m(a.crouch ?? 0, b.crouch ?? 0) };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K) => Key): Key {
  const a = pose(beat.from);
  return beat.e > 0 ? mixKey(a, pose(beat.to), beat.e) : a;
}

// ---------------------------------------------------------------------------------------------
// The craft table: sat on a little chair at the low table, the toddlers round it.

/**
 * Crafts with the toddlers, ~19 s round: colouring in a leaf on the sheet (the left hand holding it
 * flat), the sheet held up and its outline cut round with the round-ended scissors, a cut shape
 * pressed down with the glue stick, a hand over the toddler's beside them guiding their crayon, the
 * finished piece held up to the table (잘했어요!).
 */
export type CraftKey = 'color' | 'cut' | 'glue' | 'help' | 'show';
const CRAFT: Array<Step<CraftKey>> = [st('color', 4.5), st('cut', 3.5), st('glue', 2.2), st('help', 3.5, 0.8), st('show', 2.4, 0.8)];
export const craftBeat = (t: number, phase: number) => beatOf(CRAFT, t, phase);
/** From the seat's top: the table's top, the sheet before the teacher, the paper of the toddler on their right. */
export const CRAFT_AT = { top: 0.16, sheet: [0.0, 0.165, 0.4] as Loc, kid: [-0.44, 0.165, 0.36] as Loc, held: [0.0, 0.34, 0.36] as Loc };
function craftKey(k: CraftKey, t: number, s: number): Key {
  const top = CRAFT_AT.top + 0.01;
  const sh = CRAFT_AT.sheet;
  switch (k) {
    case 'cut': {
      const h = CRAFT_AT.held;
      const snip = 0.5 + 0.5 * wave(t, 2.4, s);
      return { l: [h[0] + 0.08, h[1], h[2]], r: [h[0] - 0.05 - 0.04 * frac(t * 0.3 + s), h[1] - 0.01, h[2] + 0.01], lean: 0.18, nod: 0.36, palms: 0.3, gl: 0.6, gr: 0.5 + 0.4 * snip };
    }
    case 'glue':
      return { l: [sh[0] + 0.14, top, sh[2] - 0.02], r: [sh[0] - 0.02, top + 0.01 + 0.02 * pulse(t, 1.6, s, 2), sh[2] + 0.02], lean: 0.36, nod: 0.5, palms: 1.4, gl: 0.2, gr: 0.3 };
    case 'help': {
      const kp = CRAFT_AT.kid;
      return { l: [sh[0] + 0.1, top, sh[2] - 0.04], r: [kp[0] + 0.03 * wave(t, 1.8, s), kp[1] + 0.03, kp[2] + 0.02 * wave(t, 0.9, s)], lean: 0.3, nod: 0.45, palms: 1.2, gl: 0.25, gr: 0.6 };
    }
    case 'show':
      return { l: [0.11, 0.42, 0.38], r: [-0.11, 0.42, 0.38], lean: 0.1, nod: -0.02 + 0.04 * pulse(t, 0.8, s), palms: 0.2, gl: 0.6, gr: 0.6 };
    default:
      return { l: [sh[0] + 0.13, top, sh[2] - 0.04], r: [sh[0] - 0.03 + 0.045 * wave(t, 1.7, s), top + 0.012, sh[2] + 0.035 * wave(t, 0.8, s)], lean: 0.36, nod: 0.5, palms: 1.25, gl: 0.2, gr: 0.85 };
  }
}
/** What's in the hands: the crayon (colouring, guiding), the scissors, and the sheet up off the table. */
export function craftHeld(b: Beat<CraftKey>): { crayon: boolean; scissors: boolean; sheetUp: number } {
  const sheetUp = Math.max(amountOf(b, 'cut'), amountOf(b, 'show'));
  return { crayon: amountOf(b, 'color') + amountOf(b, 'help') > 0.5, scissors: amountOf(b, 'cut') > 0.5, sheetUp };
}

// ---------------------------------------------------------------------------------------------
// The block mat: sat cross-legged on it, a toddler across the tower.

/**
 * A block tower built with a toddler, ~13 s round: a block taken off the pile at the right, set on
 * top of the tower, both hands steadying it, then hands on the knees while the toddler puts theirs
 * on, a clap (짝짝짝). Every fourth round the tower's eight high and topples over in the clap; the
 * next round starts again from the mat.
 */
export type BlocksKey = 'pick' | 'place' | 'steady' | 'watch' | 'clap';
const BLOCKS: Array<Step<BlocksKey>> = [st('pick', 1.1), st('place', 1.2, 0.6), st('steady', 0.9), st('watch', 3.2), st('clap', 1.6, 0.8)];
export const blocksBeat = (t: number, phase: number) => beatOf(BLOCKS, t, phase);
/** From the mat's top: the tower's foot, a block's size, the pile at the teacher's right. */
export const BLOCKS_AT = { tower: [0.0, 0.0, 0.42] as Loc, size: 0.075, pile: [-0.3, 0.05, 0.3] as Loc, rounds: 4 };
/** How many blocks are up (the teacher's and the toddler's), and how far it's toppled (0–1). */
export function towerOf(b: Beat<BlocksKey>): { up: number; topple: number } {
  const r = ((b.n % BLOCKS_AT.rounds) + BLOCKS_AT.rounds) % BLOCKS_AT.rounds;
  const mine = b.i >= 2 || (b.i === 1 && b.e > 0.5) ? 1 : 0;
  const theirs = b.i >= 4 || (b.i === 3 && b.p > 0.55) ? 1 : 0;
  const topple = r === BLOCKS_AT.rounds - 1 && b.i === 4 ? Math.min(1, b.p * 2.2 + b.e) : 0;
  return { up: r * 2 + mine + theirs, topple };
}
function blocksKey(k: BlocksKey, t: number, s: number, level: number): Key {
  const T = BLOCKS_AT.tower;
  const top = T[1] + (level + 0.5) * BLOCKS_AT.size;
  const knee = (side: number): Loc => [side * 0.2, 0.08, 0.22];
  switch (k) {
    case 'pick': {
      const p = BLOCKS_AT.pile;
      return { l: knee(1), r: [p[0], p[1] + 0.02, p[2]], lean: 0.42, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.7 };
    }
    case 'place':
      return { l: knee(1), r: [T[0] - 0.01, top + 0.05 + 0.03 * (1 - pulse(t, 1, s, 2)), T[2] - 0.02], lean: 0.4, nod: 0.45, palms: 1.2, gl: 0.3, gr: 0.7 };
    case 'steady':
      return { l: [T[0] + 0.07, top - 0.02, T[2]], r: [T[0] - 0.07, top - 0.02, T[2]], lean: 0.4, nod: 0.42, palms: 0.1, gl: 0.1, gr: 0.1 };
    case 'clap': {
      const c = 0.04 * Math.abs(wave(t, 2.2, s));
      return { l: [0.03 + c, 0.36, 0.26], r: [-0.03 - c, 0.36, 0.26], lean: 0.05, nod: -0.1, palms: 0.05, gl: 0.05, gr: 0.05 };
    }
    default:
      return { l: knee(1), r: knee(-1), lean: 0.22, nod: 0.38 + 0.05 * wave(t, 0.4, s), palms: 1.3, gl: 0.3, gr: 0.3 };
  }
}
/** Whether a block's in the teacher's hand (from the pile to the top of the tower). */
export const blockInHand = (b: Beat<BlocksKey>) => b.from === 'pick' || (b.from === 'place' && b.e < 0.5);

// ---------------------------------------------------------------------------------------------
// The nap mats: sat cross-legged beside a toddler, patting them to sleep.

/**
 * Settling a toddler for their nap, ~16 s round: patting their tummy over the blanket (토닥토닥, a
 * slow beat), a hand stroking their hair, the blanket tucked up under the chin with both hands, then
 * a finger to the lips (쉿) looking round the room, and patting again.
 */
export type PatKey = 'pat' | 'stroke' | 'tuck' | 'hush';
const PAT: Array<Step<PatKey>> = [st('pat', 6, 0.9), st('stroke', 3, 0.8), st('tuck', 2, 0.8), st('hush', 1.8, 0.9)];
export const patBeat = (t: number, phase: number) => beatOf(PAT, t, phase);
/** From the floor they sit on: the toddler's tummy under the blanket, the head on its pillow (to the dweller's left). */
export const PAT_AT = { tummy: [-0.02, 0.12, 0.42] as Loc, head: [0.24, 0.12, 0.42] as Loc, chin: [0.14, 0.12, 0.42] as Loc };
function patKey(k: PatKey, t: number, s: number): Key {
  const knee: Loc = [0.2, 0.1, 0.22];
  switch (k) {
    case 'stroke': {
      const h = PAT_AT.head;
      return { l: knee, r: [h[0] - 0.03 + 0.05 * wave(t, 0.5, s), h[1] + 0.06, h[2] - 0.02], lean: 0.42, nod: 0.5, palms: 1.4, gl: 0.3, gr: 0.2 };
    }
    case 'tuck': {
      const c = PAT_AT.chin;
      return { l: [c[0] + 0.02, c[1] + 0.03, c[2] - 0.12], r: [c[0] - 0.16, c[1] + 0.03, c[2] - 0.12], lean: 0.45, nod: 0.52, palms: 1.2, gl: 0.6, gr: 0.6 };
    }
    case 'hush':
      return { l: knee, r: [-0.02, 0.6, 0.15], lean: 0.08, nod: 0.02 + 0.1 * wave(t, 0.25, s), palms: 0.1, gl: 0.3, gr: 0.75 };
    default: {
      const p = PAT_AT.tummy;
      return { l: knee, r: [p[0], p[1] + 0.03 + 0.035 * pulse(t, 1.1, s, 2), p[2]], lean: 0.4, nod: 0.45, palms: 1.5, gl: 0.3, gr: 0.15 };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The nap mats: a toddler woken up crying, rocked in the arms.

/**
 * Soothing a crying toddler held on the hip and chest, ~12 s round: rocked side to side, a hand
 * patting their back, then leant back a little to look at their face and wipe a tear away (괜찮아),
 * and rocking again. The piece draws the toddler where the arms are.
 */
export type RockKey = 'rock' | 'pat' | 'look';
const ROCK: Array<Step<RockKey>> = [st('rock', 4.5, 0.6), st('pat', 4, 0.7), st('look', 2, 0.8)];
export const rockBeat = (t: number, phase: number) => beatOf(ROCK, t, phase);
/** How far the arms sway either way (and the toddler with them), at `t`. */
export const rockSway = (t: number, s: number) => 0.06 * wave(t, 0.38, s);
/** Where the toddler sits in the arms (their seat), and their back. */
export const ROCK_AT = { seat: [0.06, 0.98, 0.2] as Loc, back: [-0.03, 1.22, 0.32] as Loc, face: [0.02, 1.3, 0.24] as Loc };
function rockKey(k: RockKey, t: number, s: number): Key {
  const sw = rockSway(t, s);
  const seat = ROCK_AT.seat;
  const b = ROCK_AT.back;
  switch (k) {
    case 'pat':
      return { l: [seat[0] + sw, seat[1], seat[2]], r: [b[0] + sw, b[1] + 0.03 * pulse(t, 1.2, s, 2), b[2]], lean: -0.06, nod: 0.2, palms: 0.9, gl: 0.5, gr: 0.2 };
    case 'look': {
      const f = ROCK_AT.face;
      return { l: [seat[0] + sw, seat[1] + 0.02, seat[2] + 0.06], r: [f[0] + 0.03 * wave(t, 0.9, s), f[1], f[2] + 0.12], lean: -0.1, nod: 0.25, palms: 0.4, gl: 0.5, gr: 0.4 };
    }
    default:
      return { l: [seat[0] + sw, seat[1], seat[2]], r: [b[0] + sw, b[1] - 0.04, b[2]], lean: -0.06, nod: 0.22, palms: 0.9, gl: 0.5, gr: 0.4 };
  }
}

// ---------------------------------------------------------------------------------------------
// The snack counter: milk poured into four cups, the fruit laid out.

/**
 * Getting the snack ready, ~15 s round: the jug taken up and the milk poured into each of the four
 * cups on the tray in turn, the jug set down, the apple slices laid out on the plate with the
 * tongs, then the 알레르기 card checked against the tray.
 */
export type SnackKey = 'jug' | 'pour0' | 'pour1' | 'pour2' | 'pour3' | 'set' | 'fruit' | 'check';
const SNACK: Array<Step<SnackKey>> = [st('jug', 0.8, 0.5), st('pour0', 1.1, 0.4), st('pour1', 1.1, 0.4), st('pour2', 1.1, 0.4), st('pour3', 1.1, 0.5), st('set', 0.6, 0.6), st('fruit', 3, 0.7), st('check', 2, 0.8)];
export const snackBeat = (t: number, phase: number) => beatOf(SNACK, t, phase);
/** From the feet: the cups along the tray (across, to the dweller's left), the jug's place, the fruit plate, the card. */
export const SNACK_AT = { cups: [0.18, 0.06, -0.06, -0.18], cupY: 0.9, cupAhead: 0.4, jug: [-0.32, 0.86, 0.38] as Loc, plate: [0.0, 0.88, 0.22] as Loc, card: [0.27, 0.9, 0.24] as Loc };
/** How many cups are full, and the jug: where its spout is (or set down) and how far it's tipped. */
export function snackOf(b: Beat<SnackKey>): { full: number; pour: number; tip: number; held: boolean } {
  const pours: SnackKey[] = ['pour0', 'pour1', 'pour2', 'pour3'];
  let full = 0;
  pours.forEach((_k, i) => {
    if (b.i > i + 1 || (b.i === i + 1 && b.p > 0.55)) full = i + 1;
  });
  const at = pours.indexOf(b.from);
  const tip = at >= 0 ? (b.e > 0 ? 1 - b.e : Math.min(1, b.p * 3)) : 0;
  const held = b.i >= 1 && b.i <= 4 ? true : b.i === 0 ? b.e > 0.3 || b.p > 0.6 : b.i === 5 ? b.p < 0.6 : false;
  return { full, pour: Math.max(0, at), tip, held };
}
function snackKey(k: SnackKey, t: number, s: number): Key {
  const A = SNACK_AT;
  const rest: Loc = [0.2, 0.9, 0.22];
  switch (k) {
    case 'jug':
    case 'set':
      return { l: rest, r: [A.jug[0], A.jug[1] + 0.12, A.jug[2] - 0.04], lean: 0.18, nod: 0.4, palms: 0.4, gl: 0.3, gr: 0.85 };
    case 'fruit': {
      const p = A.plate;
      return { l: [p[0] + 0.14, p[1] + 0.01, p[2]], r: [p[0] - 0.04 + 0.06 * frac(t * 0.6 + s), p[1] + 0.05 + 0.02 * pulse(t, 1.2, s, 2), p[2] + 0.02], lean: 0.24, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.75 };
    }
    case 'check': {
      const c = A.card;
      return { l: [c[0], c[1] + 0.22, c[2] + 0.02], r: [-0.06 + 0.1 * frac(t * 0.4 + s), 0.95, A.cupAhead - 0.06], lean: 0.12, nod: 0.38, palms: 0.4, gl: 0.6, gr: 0.4 };
    }
    default: {
      const i = Number(k.slice(4));
      const x = A.cups[i];
      return { l: [x + 0.09, A.cupY + 0.01, A.cupAhead - 0.02], r: [x - 0.1, A.cupY + 0.17, A.cupAhead - 0.03], lean: 0.26, nod: 0.5, palms: 0.8, gl: 0.4, gr: 0.85 };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The little sink: a toddler's hands washed, the teacher crouched behind them.

/**
 * Washing a toddler's hands, ~15 s round: crouched behind them, the tap turned on, their hands wet
 * under it, a pump of soap, rubbed together (palms, backs, between the fingers — 뽀득뽀득), rinsed, the
 * tap off, a paper towel pulled and the hands patted dry, then up for a high five.
 */
export type WashKey = 'tap' | 'wet' | 'soap' | 'rub' | 'rinse' | 'towel' | 'five';
const WASH: Array<Step<WashKey>> = [st('tap', 0.8, 0.5), st('wet', 1.5, 0.5), st('soap', 0.9, 0.5), st('rub', 3.8, 0.5), st('rinse', 1.8, 0.6), st('towel', 2.2, 0.6), st('five', 1.4, 0.8)];
export const washBeat = (t: number, phase: number) => beatOf(WASH, t, phase);
/** From the feet: the water under the tap (where the hands go), the tap's handle, the soap pump, the towel box. */
export const WASH_AT = { water: [0.0, 0.62, 0.52] as Loc, tap: [-0.02, 0.72, 0.62] as Loc, pump: [0.16, 0.7, 0.6] as Loc, towel: [-0.3, 0.88, 0.5] as Loc };
/** Whether the water's running, and whether the hands are soapy. */
export function washOf(b: Beat<WashKey>): { running: boolean; soapy: boolean } {
  return { running: b.i >= 1 && b.i <= 4 && !(b.i === 4 && b.e > 0.5), soapy: b.i === 3 || (b.i === 2 && b.e > 0.4) || (b.i === 4 && b.p < 0.5) };
}
function washKey(k: WashKey, t: number, s: number): Key {
  const w = WASH_AT.water;
  const low = 0.62;
  switch (k) {
    case 'tap':
      return { l: [w[0] + 0.12, w[1] + 0.02, w[2] - 0.12], r: [WASH_AT.tap[0], WASH_AT.tap[1], WASH_AT.tap[2] - 0.02], lean: 0.3, nod: 0.4, palms: 1.2, gl: 0.3, gr: 0.6, crouch: low };
    case 'soap':
      return { l: [w[0] + 0.05, w[1], w[2] - 0.04], r: [WASH_AT.pump[0], WASH_AT.pump[1] + 0.03 - 0.03 * pulse(t, 1.4, s, 2), WASH_AT.pump[2]], lean: 0.3, nod: 0.4, palms: 1.4, gl: 0.3, gr: 0.3, crouch: low };
    case 'rub': {
      const a = t * Math.PI * 2 * 1.3 + s;
      return { l: [w[0] + 0.04 + 0.03 * Math.cos(a), w[1] + 0.02 * Math.sin(a), w[2] - 0.06], r: [w[0] - 0.04 - 0.03 * Math.cos(a), w[1] - 0.02 * Math.sin(a), w[2] - 0.06], lean: 0.3, nod: 0.45, palms: 0.3, gl: 0.3, gr: 0.3, crouch: low };
    }
    case 'towel': {
      const tw = WASH_AT.towel;
      const pat = 0.02 * pulse(t, 1.5, s, 2);
      return { l: [w[0] + 0.06, w[1] + 0.04 + pat, w[2] - 0.14], r: [tw[0] * 0.3, w[1] + 0.06 - pat, w[2] - 0.14], lean: 0.25, nod: 0.4, palms: 0.4, gl: 0.4, gr: 0.4, crouch: low };
    }
    case 'five':
      return { l: [0.18, 0.8, 0.12], r: [-0.12, 0.98, 0.42], lean: 0.1, nod: 0.1, palms: 0, gl: 0.3, gr: 0.05, crouch: 0.5 };
    default:
      // Wet or rinsed: the toddler's hands held under the water, turned over.
      return { l: [w[0] + 0.05, w[1] + 0.01 * wave(t, 1.6, s), w[2] - 0.03], r: [w[0] - 0.05, w[1] - 0.01 * wave(t, 1.6, s), w[2] - 0.03], lean: 0.3, nod: 0.45, palms: 0.6, gl: 0.3, gr: 0.3, crouch: low };
  }
}

// ---------------------------------------------------------------------------------------------
// The 출석 board: a sticker beside each name as the children come in.

/**
 * Taking the register on the attendance board, ~9 s round: a smiley sticker peeled off the sheet,
 * pressed on beside the next child's name (one row a round, eight names), smoothed down, a step's look
 * at the board, and a line written in the 오늘의 한마디 box.
 */
export type StickerKey = 'peel' | 'stick' | 'smooth' | 'write' | 'look';
const STICKER: Array<Step<StickerKey>> = [st('peel', 1.4, 0.6), st('stick', 0.8, 0.4), st('smooth', 0.6, 0.6), st('write', 2.2, 0.6), st('look', 1.4, 0.7)];
export const stickerBeat = (t: number, phase: number) => beatOf(STICKER, t, phase);
/** From the feet: the board's face (`ahead`), the first name's sticker box and the rows' spacing, the 한마디 box. */
export const STICKER_AT = { face: 0.44, col: 0.02, row0: 1.42, rowGap: 0.07, rows: 8, note: [-0.22, 1.04, 0.44] as Loc };
export const stickerRow = (b: Beat<StickerKey>) => ((b.n % STICKER_AT.rows) + STICKER_AT.rows) % STICKER_AT.rows;
function stickerKey(k: StickerKey, t: number, s: number, row: number): Key {
  const A = STICKER_AT;
  const cell: Loc = [A.col, A.row0 - row * A.rowGap, A.face - 0.02];
  const sheet: Loc = [0.12, 1.08, 0.3];
  switch (k) {
    case 'stick':
      return { l: sheet, r: [cell[0], cell[1], cell[2] + 0.01 * pulse(t, 2, s, 2)], lean: 0.05, nod: -0.05, palms: 1.5, gl: 0.6, gr: 0.6 };
    case 'smooth':
      return { l: sheet, r: [cell[0] + 0.02 * wave(t, 2.5, s), cell[1], cell[2]], lean: 0.05, nod: -0.05, palms: 1.5, gl: 0.6, gr: 0.05 };
    case 'write': {
      const n = A.note;
      return { l: sheet, r: [n[0] + 0.05 + 0.04 * wave(t, 1.6, s), n[1] + 0.01 * wave(t, 3.2, s), n[2] - 0.02], lean: 0.08, nod: 0.25, palms: 1.4, gl: 0.6, gr: 0.85 };
    }
    case 'look':
      return { l: sheet, r: [-0.16, 0.95, 0.16], lean: -0.04, nod: -0.1, palms: 0.4, gl: 0.6, gr: 0.4 };
    default:
      return { l: [sheet[0] + 0.03, sheet[1], sheet[2]], r: [sheet[0] - 0.05 + 0.03 * wave(t, 1.4, s), sheet[1] + 0.02, sheet[2] + 0.01], lean: 0.02, nod: 0.38, palms: 0.6, gl: 0.6, gr: 0.75 };
  }
}
/** Whether this round's sticker is on the board yet. */
export const stuck = (b: Beat<StickerKey>) => b.i >= 2 || (b.i === 1 && b.p > 0.5);

// ---------------------------------------------------------------------------------------------
// The slide: a toddler caught at the bottom.

/**
 * Spotting at the slide, ~11 s round: stood at the foot of the chute, the arms out ready while the
 * toddler climbs the steps and sits at the top; caught as they whizz down, lifted off onto their feet,
 * a clap (한 번 더!) as they run round to the steps again.
 */
export type CatchKey = 'ready' | 'catch' | 'lift' | 'clap';
const CATCH: Array<Step<CatchKey>> = [st('ready', 4, 0.4), st('catch', 1.4, 0.4), st('lift', 1.2, 0.6), st('clap', 2.4, 0.8)];
export const catchBeat = (t: number, phase: number) => beatOf(CATCH, t, phase);
/** From the feet: where the toddler comes off the chute (their middle) and where they're set down. */
export const CATCH_AT = { end: [0.0, 0.42, 0.42] as Loc, down: [0.32, 0.0, 0.32] as Loc };
function catchKey(k: CatchKey, t: number, s: number): Key {
  const e = CATCH_AT.end;
  switch (k) {
    case 'catch':
      return { l: [e[0] + 0.14, e[1] + 0.06, e[2] - 0.02], r: [e[0] - 0.14, e[1] + 0.06, e[2] - 0.02], lean: 0.3, nod: 0.4, palms: 0.1, gl: 0.4, gr: 0.4, crouch: 0.5 };
    case 'lift':
      return { l: [0.26, 0.74, 0.34], r: [0.05, 0.74, 0.34], lean: 0.12, nod: 0.3, palms: 0.1, gl: 0.5, gr: 0.5, crouch: 0.15 };
    case 'clap': {
      const c = 0.04 * Math.abs(wave(t, 2.2, s));
      return { l: [0.03 + c, 1.08, 0.28], r: [-0.03 - c, 1.08, 0.28], lean: 0.02, nod: -0.05, palms: 0.05, gl: 0.05, gr: 0.05 };
    }
    default:
      return { l: [e[0] + 0.2, e[1] + 0.1, e[2] - 0.08], r: [e[0] - 0.2, e[1] + 0.1, e[2] - 0.08], lean: 0.22, nod: 0.05 + 0.08 * wave(t, 0.3, s), palms: -0.3, gl: 0.2, gr: 0.2, crouch: 0.35 };
  }
}

// ---------------------------------------------------------------------------------------------
// The cubbies: the shoes paired up, a bag hung, a name tag straightened.

/**
 * Tidying the cubbies before 하원, ~11 s round: crouched to the shoe shelf pairing a child's shoes
 * and setting them in toes-in, up to hang their bag on their hook, the name tag over it straightened,
 * then on to the next cubby along.
 */
export type TidyKey = 'shoes' | 'bag' | 'tag' | 'look';
const TIDY: Array<Step<TidyKey>> = [st('shoes', 2.6, 0.9), st('bag', 1.6, 0.6), st('tag', 1.2, 0.6), st('look', 1.2, 0.8)];
export const tidyBeat = (t: number, phase: number) => beatOf(TIDY, t, phase);
/** From the feet: the cubby columns across (to the dweller's left), the shoe shelf, the hooks, the name tags. */
export const TIDY_AT = { cols: [0.37, 0.0, -0.37], shoe: 0.12, hook: 1.02, tag: 1.18, face: 0.4 };
export const tidyCol = (b: Beat<TidyKey>) => ((b.n % TIDY_AT.cols.length) + TIDY_AT.cols.length) % TIDY_AT.cols.length;
function tidyKey(k: TidyKey, t: number, s: number, col: number): Key {
  const A = TIDY_AT;
  const x = A.cols[col];
  switch (k) {
    case 'shoes':
      return { l: [x + 0.07, A.shoe + 0.03, A.face - 0.02], r: [x - 0.07, A.shoe + 0.03 + 0.02 * pulse(t, 0.9, s, 2), A.face - 0.02], lean: 0.4, nod: 0.5, palms: 0.4, gl: 0.6, gr: 0.6, crouch: 1 };
    case 'bag':
      return { l: [x + 0.08, A.hook - 0.12, A.face - 0.06], r: [x - 0.02, A.hook + 0.03, A.face - 0.04], lean: 0.08, nod: 0.05, palms: 0.4, gl: 0.6, gr: 0.75 };
    case 'tag':
      return { l: [x + 0.2, 0.9, 0.12], r: [x + 0.02 * wave(t, 1.8, s), A.tag, A.face - 0.02], lean: 0.05, nod: -0.08, palms: 1.5, gl: 0.4, gr: 0.6 };
    default:
      return { l: [0.2, 0.9, 0.08], r: [-0.2, 0.9, 0.08], lean: 0, nod: 0.05, palms: 0.4, gl: 0.4, gr: 0.4 };
  }
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a motion, in the spot's frame (the pieces put what's held at these). */
export function childcareKey(m: Exclude<ChildcareMotion, CareMotion>, t: number, phase: number): Key {
  const s = phase * 7.1;
  switch (m) {
    case 'ccCraft':
      return blended(craftBeat(t, phase), (k) => craftKey(k, t, s));
    case 'ccBlocks': {
      const b = blocksBeat(t, phase);
      const r = ((b.n % BLOCKS_AT.rounds) + BLOCKS_AT.rounds) % BLOCKS_AT.rounds;
      return blended(b, (k) => blocksKey(k, t, s, r * 2));
    }
    case 'ccPat':
      return blended(patBeat(t, phase), (k) => patKey(k, t, s));
    case 'ccRock':
      return blended(rockBeat(t, phase), (k) => rockKey(k, t, s));
    case 'ccSnack':
      return blended(snackBeat(t, phase), (k) => snackKey(k, t, s));
    case 'ccWash':
      return blended(washBeat(t, phase), (k) => washKey(k, t, s));
    case 'ccSticker': {
      const b = stickerBeat(t, phase);
      return blended(b, (k) => stickerKey(k, t, s, stickerRow(b)));
    }
    case 'ccCatch':
      return blended(catchBeat(t, phase), (k) => catchKey(k, t, s));
    default: {
      const b = tidyBeat(t, phase);
      const col = tidyCol(b);
      // Moving on to the next cubby as the round comes round.
      const k = blended(b, (q) => tidyKey(q, t, s, col));
      if (b.from === 'look' && b.e > 0) {
        const next = tidyKey('shoes', t, s, (col + 1) % TIDY_AT.cols.length);
        return mixKey(tidyKey('look', t, s, col), next, b.e);
      }
      return k;
    }
  }
}

export function childcareDoing(m: ChildcareMotion, b: BodyAt, _work: Work | null, t: number): Doing {
  if (CARE_MOTIONS.has(m)) return careDoing(m as CareMotion, b, _work, t);
  if (CARE_MOTIONS.has(m)) return careDoing(m as CareMotion, b, _work, t);
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const k = childcareKey(m as Exclude<ChildcareMotion, CareMotion>, t, ccPhase(b.base));
  const w = (p: Loc) => b.base.clone().addScaledVector(left, p[0]).addScaledVector(fwd, p[2]).setY(b.base.y + p[1]);
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
