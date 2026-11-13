import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 요양원 (2026-10-27, the workplace pipeline, at the user's request): warm, unhurried, dignified
 * care. At the care bed a resident is greeted with a hand on the shoulder, the backrest raised with
 * the pendant, given a drink through a straw, a hand held, the blanket smoothed; turned onto their side
 * (the blanket folded down, the arm crossed, rolled away gently, a wedge pillow tucked behind the back,
 * settled back onto it); a fall answered crouched beside them on the floor; a senior's care watched
 * and noted. At the meal cart a 죽 bowl filled for a soft diet, and a resident at their table helped
 * to eat, spoon by spoon. Along the walking rail a resident walked with their walker, a hand at the
 * elbow and one at the gait belt; stood up from the wheelchair to the rail and sat back down. Pills
 * handed out from the medication cart (the name read on the packet first) and a blood pressure taken;
 * 화투 slapped down on the green blanket, colouring done together, a song led with a tambourine,
 * old photos talked over, the nurse call answered.
 *
 * Each is a round of beats, each held a while and eased into the next, by one clock (carePhase of the
 * piece's fixed mark) shared with the piece it's done at — so the resident rolls as the hands push,
 * the spoon is at the mouth when they open it, the backrest rises as the pendant is pressed
 * (workplaces/careWorker.ts). Every place is written in the PIECE's frame (x across its front, y up
 * from the floor, z out of its front) and turned into the dweller's own frame by the spot it's done at.
 * Kept out of activity.ts (which only hands these motions over here) so it imports nothing from it at
 * run time.
 */
export type CareMotion =
  | 'cwCare' | 'cwTurn' | 'cwFall' | 'cwObserve'
  | 'cwFeed' | 'cwPrep'
  | 'cwWalk' | 'cwTransfer'
  | 'cwMeds' | 'cwBp'
  | 'cwHwatu' | 'cwColor' | 'cwSing' | 'cwRemember' | 'cwCall'
  | 'cwChange' | 'cwWash' | 'cwBath';
export const CARE_MOTIONS = new Set<string>(['cwCare', 'cwTurn', 'cwFall', 'cwObserve', 'cwFeed', 'cwPrep', 'cwWalk', 'cwTransfer', 'cwMeds', 'cwBp', 'cwHwatu', 'cwColor', 'cwSing', 'cwRemember', 'cwCall', 'cwChange', 'cwWash', 'cwBath']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset (as activity.ts toolPhase): from a fixed mark on the piece, so two beds aren't in step. */
export const carePhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;

/** A place in a piece's frame: [x, y, z]. */
export type P = [number, number, number];
const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const add3 = add;

/** Where a spot is in the piece: its marker (the feet stood, the seat's top sat) and which way it faces (0 = +z). */
export interface SpotAt {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the spot, `ahead`), in the piece's frame. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, s.y + up, s.z - side * n + ahead * c];
}
/** A piece point in a spot's frame: [side, up, ahead]. */
function inSpot(s: SpotAt, p: P): P {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1] - s.y, dx * n + dz * c];
}

type Step<K extends string> = { key: K; hold: number; move: number };
/** Where a round is: the beat it's on (or easing out of, `e` of the way to the next) and `p`, how far through its hold. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  /** Which time round it is. */
  n: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0);
  const c = t / T + phase;
  const n = Math.floor(c);
  let u = frac(c) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold, n };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: ss(Math.min(1, u / k.move)), p: 1, n };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0, n };
}
const st = <K extends string>(key: K, hold: number, move = 0.8): Step<K> => ({ key, hold, move });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}
/** A value each beat has (given how far through it is), eased from one beat's to the next's. */
function valueOf<K extends string>(b: Beat<K>, v: (k: K, p: number) => number): number {
  return b.e > 0 ? mix(v(b.from, 1), v(b.to, 0), b.e) : v(b.from, b.p);
}

/** Hands and bend, the hands in the piece's frame. */
export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
}
function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch ?? 0, b.crouch ?? 0, e) };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(beat.from, beat.e > 0 ? 1 : beat.p);
  return beat.e > 0 ? mixKey(a, pose(beat.to, 0), beat.e) : a;
}

// =============================================================================================
// The care bed (요양 침대): a resident lying in it, the carer at its side.

/**
 * The bed in its own frame (1 × 2, the head at -z against the wall, the foot at +z): the mattress's
 * top, the backrest's hinge (under the resident's hips), how high the resident's middle lies over the
 * mattress, the side rail's line.
 */
export const BED = { top: 0.56, raise: 0.16, hinge: -0.2, lift: 0.105, rail: 0.465 };
/** The mattress's top while care is given (the bed raised to the carer's waist, to spare the back). */
const TOP = BED.top + BED.raise;
/**
 * A point on the resident lying in the bed (raised for care), the backrest up `a`, rolled `roll` about their length
 * (negative: away from the carer's side, +x): `side` to their left (+x), `along` up the body from the
 * hips (negative: down the legs), `out` out of their front.
 */
export function onBody(a: number, roll: number, side: number, along: number, out: number): P {
  let y0: number;
  let z: number;
  if (along >= 0) {
    y0 = along * Math.sin(a) + out * Math.cos(a);
    z = BED.hinge - along * Math.cos(a) + out * Math.sin(a);
  } else {
    y0 = out;
    z = BED.hinge - along;
  }
  const c = Math.cos(roll);
  const n = Math.sin(roll);
  return [side * c + y0 * n, TOP + BED.lift - side * n + y0 * c, z];
}

/** Giving care at the bed (cwCare): stood at its right side by the resident's chest, facing across it. */
export const CARE_AT: SpotAt = { x: 0.7, y: 0, z: -0.3, yaw: -Math.PI / 2 };
/**
 * Giving care, ~23 s round: a greeting, a hand on the shoulder (잘 주무셨어요?); the backrest raised
 * with the hand pendant; a drink through the straw cup held to the lips; their hand held in both
 * hands, nodding along as they talk; the blanket smoothed down over the legs as the backrest goes
 * down again.
 */
export type CareKey = 'greet' | 'remote' | 'water' | 'hold' | 'smooth';
const CARE: Array<Step<CareKey>> = [st('greet', 3.5, 0.9), st('remote', 2.6, 0.6), st('water', 4, 0.8), st('hold', 5, 0.9), st('smooth', 4.2, 0.9)];
export const careBeat = (t: number, ph: number) => beatOf(CARE, t, ph);
/** The backrest's angle through the round. */
export const careBack = (b: Beat<CareKey>) =>
  valueOf(b, (k, p) => (k === 'greet' ? 0.15 : k === 'remote' ? 0.15 + 0.65 * ss(p, 0.15, 0.95) : k === 'smooth' ? 0.8 - 0.65 * ss(p, 0.1, 0.9) : 0.8));
/** The resident's mouth (the straw goes to it) and their left hand, held up for holding. */
export const careMouth = (a: number): P => onBody(a, 0, 0.0, 0.66, 0.13);
export const HELD_HAND: P = [0.31, TOP + 0.24, -0.2];
/** The cup's middle as it's held to them. */
export const careCup = (a: number): P => add(careMouth(a), [0.07, -0.06, 0.03]);
function careKey(k: CareKey, _p: number, t: number, s: number, a: number): Key {
  switch (k) {
    case 'remote':
      return { l: [0.5, 1.02 + 0.006 * pulse(t, 2.2, s, 2), -0.12], r: [0.5, TOP + 0.13, -0.4], lean: 0.1, nod: 0.38, palms: 0.3, gl: 0.85, gr: 0.2 };
    case 'water': {
      const c = careCup(a);
      return { l: onBody(a, 0, 0.2, 0.5, -0.03), r: add(c, [0.05, -0.01, 0.0]), lean: 0.34, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.75 };
    }
    case 'hold':
      return { l: add(HELD_HAND, [0.01, 0.035, 0.05]), r: add(HELD_HAND, [0.02, -0.03, -0.03]), lean: 0.3, nod: 0.28 + 0.07 * pulse(t, 0.42, s), palms: 1.25, gl: 0.45, gr: 0.45 };
    case 'smooth': {
      // Down over the hips and thighs, from where they stand.
      const z = -0.05 + 0.12 * wave(t, 0.33, s);
      return { l: [0.16, TOP + 0.21, z + 0.12], r: [0.3, TOP + 0.21, z - 0.12], lean: 0.46, nod: 0.5, palms: 1.5, gl: 0, gr: 0 };
    }
    default:
      return { l: [0.42, TOP + 0.05, 0.05], r: onBody(a, 0, 0.17, 0.42, 0.08), lean: 0.3, nod: 0.24 + 0.05 * pulse(t, 0.5, s), palms: 1.2, gl: 0.3, gr: 0.35 };
  }
}
/** Whether the pendant's in the hand (else hung on the rail), and the cup. */
export const remoteHeld = (b: Beat<CareKey>) => amountOf(b, 'remote') > 0.4;
export const cupHeld = (b: Beat<CareKey>) => amountOf(b, 'water') > 0.4;

/** Turning (cwTurn): stood at the same side, a little nearer the hips. */
export const TURN_AT: SpotAt = { x: 0.68, y: 0, z: -0.24, yaw: -Math.PI / 2 };
/**
 * Turning onto the side (체위 변경), ~22 s round: the blanket folded down to the waist; the near arm
 * laid across the chest; the hands on the near shoulder and hip; rolled gently away onto the side; a
 * wedge pillow tucked in behind the back; eased back onto it, half turned; the blanket drawn up and
 * smoothed; a look and a hand on the shoulder (편하세요?); and later laid back flat.
 */
export type TurnKey = 'fold' | 'arms' | 'hold' | 'roll' | 'wedge' | 'settle' | 'smooth' | 'check' | 'back';
const TURN: Array<Step<TurnKey>> = [st('fold', 1.8, 0.6), st('arms', 1.8, 0.6), st('hold', 1.0, 0.4), st('roll', 2.0, 0.3), st('wedge', 2.4, 0.6), st('settle', 1.8, 0.5), st('smooth', 2.6, 0.7), st('check', 2.4, 0.8), st('back', 1.8, 0.8)];
export const turnBeat = (t: number, ph: number) => beatOf(TURN, t, ph);
export const turnRoll = (b: Beat<TurnKey>) =>
  valueOf(b, (k, p) => {
    switch (k) {
      case 'roll':
        return -1.15 * ss(p, 0.05, 0.95);
      case 'wedge':
        return -1.15;
      case 'settle':
        return -1.15 + 0.6 * ss(p, 0.1, 0.9);
      case 'smooth':
      case 'check':
        return -0.55;
      case 'back':
        return -0.55 * (1 - ss(p, 0.1, 0.9));
      default:
        return 0;
    }
  });
/** Whether the wedge pillow's behind their back, and whether the blanket's up over the chest. */
export const wedgeIn = (b: Beat<TurnKey>) => (b.from === 'wedge' && b.p > 0.35) || b.from === 'settle' || b.from === 'smooth' || b.from === 'check' || (b.from === 'back' && b.e === 0 && b.p < 0.7);
export const chestCovered = (b: Beat<TurnKey>) => !((b.from === 'fold' && b.p > 0.55) || b.from === 'arms' || b.from === 'hold' || b.from === 'roll' || b.from === 'wedge' || b.from === 'settle' || (b.from === 'smooth' && b.p < 0.35));
/** Whether the near arm's laid across the chest. */
export const armCrossed = (b: Beat<TurnKey>) => (b.from === 'arms' && b.p > 0.5) || b.from === 'hold' || b.from === 'roll' || b.from === 'wedge' || b.from === 'settle';
/** The wedge pillow behind them, rolled `roll`. */
export const wedgeAt = (roll: number): P => onBody(0, roll, 0.0, 0.26, -0.17);
function turnKey(k: TurnKey, p: number, t: number, s: number, roll: number): Key {
  const shoulder = onBody(0, roll, 0.16, 0.43, 0.02);
  const hip = onBody(0, roll, 0.17, -0.02, 0.01);
  switch (k) {
    case 'fold': {
      const z = -0.5 + 0.28 * ss(p);
      return { l: [0.2, TOP + 0.24, z + 0.08], r: [0.32, TOP + 0.24, z - 0.08], lean: 0.44, nod: 0.45, palms: 1.3, gl: 0.6, gr: 0.6 };
    }
    case 'arms': {
      const from = onBody(0, 0, 0.15, 0.15, 0.17);
      const to = onBody(0, 0, -0.03, 0.37, 0.15);
      const h = mixP(from, to, ss(p, 0.1, 0.7));
      return { l: [0.42, TOP + 0.04, 0.05], r: add(h, [0.03, 0.03, 0.0]), lean: 0.4, nod: 0.45, palms: 1.2, gl: 0.3, gr: 0.6 };
    }
    case 'wedge':
      return { l: hip, r: add(wedgeAt(roll), [0.09, 0.02, 0.0]), lean: 0.4, nod: 0.42, palms: 1.4, gl: 0.2, gr: 0.6 };
    case 'smooth': {
      const z = 0.0 + 0.12 * wave(t, 0.33, s);
      return { l: [0.16, TOP + 0.22, z + 0.12], r: [0.3, TOP + 0.22, z - 0.12], lean: 0.46, nod: 0.5, palms: 1.5, gl: 0, gr: 0 };
    }
    case 'check':
      return { l: [0.42, TOP + 0.05, 0.05], r: shoulder, lean: 0.26, nod: 0.24 + 0.06 * pulse(t, 0.5, s), palms: 1.3, gl: 0.3, gr: 0.3 };
    default:
      // fold over, hold, roll, settle, back: one hand on the near shoulder, one on the hip.
      return { l: hip, r: shoulder, lean: 0.4, nod: 0.38, palms: 1.4, gl: 0.25, gr: 0.25 };
  }
}

/** A fall answered (cwFall): crouched on the floor at the bed's side, by the resident sat there. */
export const FALL_AT: SpotAt = { x: 0.86, y: 0, z: 0.3, yaw: Math.PI };
/** Where the resident sits on the floor: their middle, facing +x, back to the bed. */
export const FLOOR_SIT = { x: 0.71, z: -0.22, yaw: Math.PI / 2 };
/** A point on them in their own frame (x to their left, y up, z ahead), in the bed's. */
export const onFloorSitter = (x: number, y: number, z: number): P => [FLOOR_SIT.x + z, y, FLOOR_SIT.z - x];
/**
 * Answering a fall, crouched, ~16 s round: a hand on their shoulder, asking (어디 아프신 데 없으세요?);
 * the arm felt down to the wrist, the knee; their hand held in both hands, calming them; a hand
 * rubbing their back.
 */
export type FallKey = 'ask' | 'check' | 'hold' | 'rub';
const FALL: Array<Step<FallKey>> = [st('ask', 3.4, 0.8), st('check', 3.4, 0.8), st('hold', 3.4, 0.8), st('rub', 3, 0.8)];
export const fallBeat = (t: number, ph: number) => beatOf(FALL, t, ph);
export const FALL_HAND: P = onFloorSitter(-0.06, 0.46, 0.24);
function fallKey(k: FallKey, p: number, t: number, s: number): Key {
  const crouch = 1;
  const shoulder = onFloorSitter(-0.19, 0.55, 0.02);
  const hand = add(FALL_HAND, [0.0, 0.03, 0.0]);
  switch (k) {
    case 'check': {
      // Felt down the arm from the shoulder to the wrist.
      const along = mixP(onFloorSitter(-0.23, 0.5, 0.04), FALL_HAND, ss(p, 0.15, 0.85));
      return { l: onFloorSitter(-0.2, 0.5, 0.02), r: add(along, [0.0, 0.03, 0.0]), lean: 0.48, nod: 0.5, palms: 1.2, gl: 0.4, gr: 0.4, crouch };
    }
    case 'hold':
      return { l: add(FALL_HAND, [-0.02, 0.035, 0.02]), r: add(FALL_HAND, [0.03, -0.03, 0.0]), lean: 0.46, nod: 0.3 + 0.06 * pulse(t, 0.45, s), palms: 1.2, gl: 0.45, gr: 0.45, crouch };
    case 'rub': {
      const back = onFloorSitter(-0.02, 0.52 + 0.05 * wave(t, 0.8, s), -0.12);
      return { l: back, r: hand, lean: 0.5, nod: 0.3, palms: 1.4, gl: 0.1, gr: 0.3, crouch };
    }
    default:
      return { l: shoulder, r: hand, lean: 0.46, nod: 0.28 + 0.05 * pulse(t, 0.5, s), palms: 1.3, gl: 0.3, gr: 0.3, crouch };
  }
}

/** Watching a senior's care (cwObserve): stood at the foot of the bed with a notebook. */
export const OBSERVE_AT: SpotAt = { x: 0.3, y: 0, z: 1.32, yaw: Math.PI };
export type ObserveKey = 'watch' | 'note' | 'think';
const OBSERVE: Array<Step<ObserveKey>> = [st('watch', 4, 0.8), st('note', 3, 0.6), st('think', 2.2, 0.6)];
export const observeBeat = (t: number, ph: number) => beatOf(OBSERVE, t, ph);
function observeKey(k: ObserveKey, _p: number, t: number, s: number): Key {
  const S = OBSERVE_AT;
  switch (k) {
    case 'note':
      return { l: sp(S, 0.06, 1.0, 0.28), r: sp(S, -0.02 + 0.025 * wave(t, 2.1, s), 1.02 + 0.006 * wave(t, 4.2, s), 0.27), lean: 0.06, nod: 0.5, palms: 1.2, gl: 0.7, gr: 0.85 };
    case 'think':
      return { l: sp(S, 0.06, 0.96, 0.24), r: sp(S, -0.02, 1.4, 0.16), lean: 0.0, nod: 0.05 + 0.08 * pulse(t, 0.5, s), palms: 0.2, gl: 0.7, gr: 0.6 };
    default:
      return { l: sp(S, 0.08, 0.94, 0.24), r: sp(S, -0.08, 0.94, 0.24), lean: 0.03, nod: 0.12 + 0.06 * pulse(t, 0.4, s), palms: 0.8, gl: 0.7, gr: 0.5 };
  }
}
/** The notebook in the left hand. */
export const notebookAt = (k: Key): P => add(k.l, [0.0, 0.01, 0.0]);

// =============================================================================================
// The meal cart (식사 카트): the cart at the left, a resident at a little table at the right.

/** The cart (its middle, its top), the table, the resident's wheelchair, the carer's stool. */
export const MEAL = {
  cart: { x: -0.52, z: -0.12, w: 0.64, d: 0.5, top: 0.94 },
  table: { x: 0.52, z: 0.17, w: 0.5, d: 0.42, top: 0.72 },
  res: { x: 0.5, z: -0.3, yaw: 0, seat: 0.48 },
  bowl: [0.42, 0.755, 0.13] as P,
  cup: [0.66, 0.72, 0.27] as P,
};
/** Helping to eat (cwFeed): sat on a stool at the table's corner, turned to the resident. */
export const FEED_AT: SpotAt = { x: 0.06, y: 0.46, z: 0.05, yaw: 2.07 };
/** The resident's mouth, leant in `lean` (radians) towards the spoon. */
export const mealMouth = (lean: number): P => [MEAL.res.x, 0.48 + 0.07 + 0.62 * Math.cos(lean), MEAL.res.z - 0.03 + 0.62 * Math.sin(lean) + 0.11];
/**
 * Helping a resident eat, ~24 s round: the bib tucked in; 죽 scooped from the bowl, blown on, the
 * spoon held to their lips and waited on while they chew (천천히 드세요), again; the straw cup held
 * with them while they drink; the corner of the mouth dabbed with the napkin.
 */
export type FeedKey = 'bib' | 'scoop' | 'blow' | 'feed' | 'wait' | 'cup' | 'wipe';
const FEED: Array<Step<FeedKey>> = [st('bib', 2.2, 0.7), st('scoop', 1.4, 0.5), st('blow', 1.0, 0.5), st('feed', 2.0, 0.6), st('wait', 2.4, 0.6), st('scoop', 1.4, 0.5), st('feed', 2.0, 0.6), st('wait', 2.2, 0.7), st('cup', 3.0, 0.8), st('wipe', 1.8, 0.8)];
export const feedBeat = (t: number, ph: number) => beatOf(FEED, t, ph);
/** How far the resident leans in (to the spoon, to the cup). */
export const feedLean = (b: Beat<FeedKey>) => 0.04 + 0.13 * amountOf(b, 'feed') + 0.08 * amountOf(b, 'cup');
/** The spoon's tip at the mouth (the hand a little back towards the carer). */
const TO_CARER: P = [-0.94, 0, 0.33];
function feedKey(k: FeedKey, _p: number, t: number, s: number, lean: number): Key {
  const S = FEED_AT;
  const lap = sp(S, 0.12, 0.2, 0.3);
  const m = mealMouth(lean);
  switch (k) {
    case 'bib':
      return { l: [MEAL.res.x - 0.09, 0.96, MEAL.res.z + 0.14], r: [MEAL.res.x + 0.06, 0.96, MEAL.res.z + 0.15], lean: 0.32, nod: 0.3, palms: 1.2, gl: 0.5, gr: 0.5 };
    case 'scoop': {
      const b = MEAL.bowl;
      const a = t * 4 + s;
      return { l: lap, r: [b[0] + 0.025 * Math.cos(a), b[1] + 0.07 + 0.015 * Math.sin(a * 0.5), b[2] - 0.05 + 0.02 * Math.sin(a)], lean: 0.26, nod: 0.5, palms: 0.5, gl: 0.3, gr: 0.85 };
    }
    case 'blow':
      return { l: lap, r: sp(S, -0.03, 0.62, 0.22), lean: 0.05, nod: 0.05, palms: 0.4, gl: 0.3, gr: 0.85 };
    case 'feed':
      return { l: add(m, [-0.08, -0.12, 0.06]), r: [m[0] + TO_CARER[0] * 0.1, m[1] - 0.01, m[2] + TO_CARER[2] * 0.1], lean: 0.34, nod: 0.12, palms: 0.4, gl: 0.4, gr: 0.85 };
    case 'wait':
      return { l: lap, r: add(MEAL.bowl, [-0.04, 0.08, -0.02]), lean: 0.14, nod: 0.12 + 0.07 * pulse(t, 0.55, s), palms: 0.5, gl: 0.3, gr: 0.85 };
    case 'cup': {
      const c = add(m, [0.0, -0.08, 0.06]);
      return { l: add(c, [-0.03, -0.06, 0.02]), r: add(c, [-0.06, 0.0, 0.03]), lean: 0.32, nod: 0.15, palms: 1.0, gl: 0.4, gr: 0.6 };
    }
    default: {
      const a = t * 5 + s;
      return { l: [MEAL.res.x - 0.12, 1.02, MEAL.res.z + 0.02], r: add(m, [-0.05 + 0.01 * Math.cos(a), -0.01 + 0.01 * Math.sin(a), 0.01]), lean: 0.32, nod: 0.12, palms: 0.8, gl: 0.3, gr: 0.7 };
    }
  }
}
/** Whether there's 죽 on the spoon (from the scoop to the mouth), and where the cup is. */
export const spoonFull = (b: Beat<FeedKey>) => (b.from === 'scoop' && b.p > 0.5) || b.from === 'blow' || (b.from === 'feed' && b.e === 0 && b.p < 0.55) || (b.from === 'scoop' && b.e > 0);
export const cupUp = (b: Beat<FeedKey>) => amountOf(b, 'cup');
export const napkinUp = (b: Beat<FeedKey>) => amountOf(b, 'wipe') > 0.4;
export { mixP };

/** A soft diet made up (cwPrep): stood at the cart's front. */
export const PREP_AT: SpotAt = { x: -0.52, y: 0, z: 0.42, yaw: Math.PI };
/** The 죽 warmer on the cart's top (its middle, the rim's height), the bowl being filled, the name card's slot. */
export const PREP = { pot: [-0.7, 1.13, -0.2] as P, bowl: [-0.36, 0.94, 0.02] as P, card: [-0.27, 0.94, 0.14] as P, chart: [-0.77, 0.86, 0.13] as P };
/**
 * Making up a soft diet, ~13 s round: 죽 ladled from the warmer, poured into the bowl, stirred
 * smooth with the spoon, the name card (죽식 · 김순자 어르신) set on the tray, checked against the
 * diet chart on the cart.
 */
export type PrepKey = 'dip' | 'pour' | 'stir' | 'card' | 'check';
const PREPS: Array<Step<PrepKey>> = [st('dip', 1.8, 0.7), st('pour', 1.6, 0.6), st('stir', 2.0, 0.6), st('card', 1.6, 0.6), st('check', 2.4, 0.8)];
export const prepBeat = (t: number, ph: number) => beatOf(PREPS, t, ph);
function prepKey(k: PrepKey, _p: number, t: number, s: number): Key {
  const bw = PREP.bowl;
  const rim: P = [bw[0] + 0.07, bw[1] + 0.05, bw[2] + 0.03];
  switch (k) {
    case 'dip': {
      const a = t * 3.5 + s;
      return { l: [PREP.pot[0] + 0.03 * Math.cos(a), PREP.pot[1] + 0.17, PREP.pot[2] + 0.1 + 0.03 * Math.sin(a)], r: rim, lean: 0.2, nod: 0.45, palms: 0.4, gl: 0.9, gr: 0.5 };
    }
    case 'pour':
      return { l: [bw[0] - 0.05, bw[1] + 0.25, bw[2] - 0.02], r: rim, lean: 0.24, nod: 0.5, palms: 0.4, gl: 0.9, gr: 0.5 };
    case 'stir': {
      const a = t * 6 + s;
      return { l: [bw[0] - 0.08, bw[1] + 0.05, bw[2] + 0.03], r: [bw[0] + 0.025 * Math.cos(a), bw[1] + 0.1, bw[2] + 0.025 * Math.sin(a)], lean: 0.26, nod: 0.55, palms: 0.6, gl: 0.5, gr: 0.85 };
    }
    case 'card':
      return { l: [bw[0] - 0.08, bw[1] + 0.05, bw[2] + 0.03], r: add(PREP.card, [0.0, 0.07, 0.0]), lean: 0.22, nod: 0.5, palms: 1.0, gl: 0.5, gr: 0.7 };
    default: {
      const c = PREP.chart;
      return { l: [c[0] + 0.05, c[1] + 0.02 * wave(t, 0.6, s), c[2] + 0.04], r: sp(PREP_AT, -0.18, 0.95, 0.1), lean: 0.14, nod: 0.45, palms: 1.1, gl: 0.35, gr: 0.4 };
    }
  }
}
/** Whether the ladle's in the hand, and whether the bowl's filled yet. */
export const ladleHeld = (b: Beat<PrepKey>) => b.from === 'dip' || (b.from === 'pour' && b.e === 0);
export const bowlFilled = (b: Beat<PrepKey>) => (b.from === 'pour' && b.p > 0.4) || b.from === 'stir' || b.from === 'card' || b.from === 'check' || (b.from === 'pour' && b.e > 0);

// =============================================================================================
// The walking rail (보행 손잡이): a resident walked along it with a walker; stood up to it.

/** The rail's line along the wall (at the back), how far the walk goes, the lanes walked. */
export const RAIL = { z: -0.43, y: 0.86, x0: -0.98, x1: 0.98, walk: 0.72, resZ: -0.1, carerZ: 0.28 };
type WalkBeat = 'rest' | 'walk' | 'turn';
interface WalkKey {
  t: number;
  x: number;
  yaw: number;
  beat: WalkBeat;
}
const W = RAIL.walk;
const HP = Math.PI / 2;
/** The resident's track: a breath, along to the right, the walker turned round (towards the carer), a breath, back, round again. */
const WALK_KEYS: WalkKey[] = [
  { t: 0, x: -W, yaw: HP, beat: 'rest' },
  { t: 2.2, x: -W, yaw: HP, beat: 'walk' },
  { t: 10.2, x: W, yaw: HP, beat: 'turn' },
  { t: 13.4, x: W, yaw: -HP, beat: 'rest' },
  { t: 15.6, x: W, yaw: -HP, beat: 'walk' },
  { t: 23.6, x: -W, yaw: -HP, beat: 'turn' },
  { t: 26.8, x: -W, yaw: HP, beat: 'rest' },
];
export interface WalkState {
  /** The resident's middle (x) and which way they face. */
  x: number;
  yaw: number;
  beat: WalkBeat;
  /** +1 walking (or about to walk) to +x, -1 to -x. */
  dir: number;
  /** How far round the turn they are (0–1, else 0). */
  turn: number;
  /** The legs' swing (radians), from how far they've walked. */
  stride: number;
  /** Where the carer stands (x, the lane's z) and faces. */
  cx: number;
  cyaw: number;
}
export function walkAt(t: number, ph: number): WalkState {
  const T = WALK_KEYS[WALK_KEYS.length - 1].t;
  const u = frac(t / T + ph) * T;
  let i = 0;
  while (i < WALK_KEYS.length - 2 && u >= WALK_KEYS[i + 1].t) i++;
  const a = WALK_KEYS[i];
  const b = WALK_KEYS[i + 1];
  const k = (u - a.t) / (b.t - a.t);
  const e = a.beat === 'walk' ? k : ss(k);
  const x = mix(a.x, b.x, e);
  const yaw = mix(a.yaw, b.yaw, e);
  const dir = Math.sign(Math.sin(a.beat === 'turn' && k >= 0.5 ? b.yaw : a.yaw)) || 1;
  // The carer: a little behind them, on the room side; turned round through facing them at the turns.
  const behind = a.beat === 'turn' ? 0 : -0.1 * dir;
  let cyaw = dir > 0 ? HP : -HP;
  if (a.beat === 'turn') cyaw = a.yaw > 0 ? mix(HP, 1.5 * Math.PI, ss(k)) : mix(-HP, -1.5 * Math.PI, ss(k));
  // The legs' swing goes on with the distance walked along this stretch (and a few small steps round the turn).
  const stride = a.beat === 'walk' ? (Math.abs(x - a.x) / 0.3) * Math.PI : a.beat === 'turn' ? k * Math.PI * 3 : 0;
  return { x, yaw, beat: a.beat, dir, turn: a.beat === 'turn' ? k : 0, stride, cx: x + behind, cyaw };
}
/** The walk's spot as it is now. */
export const walkSpot = (w: WalkState): SpotAt => ({ x: w.cx, y: 0, z: RAIL.carerZ, yaw: w.cyaw });
function walkKey(w: WalkState, t: number, s: number): Key {
  const near: P = [w.x - 0.11 * w.dir, 0.95, RAIL.resZ + 0.09];
  const elbow: P = [w.x + 0.09 * w.dir, 0.98, RAIL.resZ + 0.17];
  // The hand on their side (the left walking to +x) at the gait belt behind them, the other at the elbow.
  const nod = w.beat === 'rest' ? 0.1 + 0.07 * pulse(t, 0.5, s) : 0.22;
  const walking: Key = w.dir > 0 ? { l: near, r: elbow, lean: 0.1, nod, palms: 1.2, gl: 0.6, gr: 0.5 } : { l: elbow, r: near, lean: 0.1, nod, palms: 1.2, gl: 0.5, gr: 0.6 };
  if (w.beat !== 'turn') return walking;
  // Round the turn: faced to them, both hands at the sides of the belt while they turn the walker.
  const turning: Key = { l: [w.x - 0.13, 0.94, RAIL.resZ + 0.12], r: [w.x + 0.13, 0.94, RAIL.resZ + 0.12], lean: 0.12, nod: 0.3, palms: 1.3, gl: 0.6, gr: 0.6 };
  return mixKey(walking, turning, Math.min(ss(w.turn / 0.3), ss((1 - w.turn) / 0.3)));
}

/** Standing up from the wheelchair (cwTransfer): the chair at the rail's left half, facing it; the carer at the resident's right. */
export const WC_AT = { x: -0.45, z: 0.06, yaw: Math.PI, seat: 0.48 };
export const TRANSFER_AT: SpotAt = { x: 0.03, y: 0, z: 0.12, yaw: -Math.PI / 2 };
/**
 * Practising standing up, ~19 s round: talked through it, a hand on the shoulder; crouched to put the
 * brakes on; both hands on the gait belt; up together (하나, 둘, 셋), the resident's hands from the
 * armrests to the rail; stood a while holding the rail, steadied, praised; lowered back down; a thumbs up.
 */
export type TransferKey = 'explain' | 'brake' | 'belt' | 'rise' | 'stand' | 'sit' | 'praise';
const TRANSFER: Array<Step<TransferKey>> = [st('explain', 3, 0.8), st('brake', 2.0, 0.7), st('belt', 1.8, 0.5), st('rise', 2.4, 0.4), st('stand', 3.8, 0.7), st('sit', 2.4, 0.6), st('praise', 1.8, 0.8)];
export const transferBeat = (t: number, ph: number) => beatOf(TRANSFER, t, ph);
/** How far down they are (1 sat, 0 stood) and how far forward they lean. */
export const transferSit = (b: Beat<TransferKey>) => valueOf(b, (k, p) => (k === 'rise' ? 1 - ss(p, 0.15, 0.95) : k === 'stand' ? 0 : k === 'sit' ? ss(p, 0.05, 0.9) : 1));
export const transferLean = (b: Beat<TransferKey>) => valueOf(b, (k, p) => (k === 'rise' ? 0.1 + 0.45 * Math.sin(Math.PI * ss(p, 0.0, 1)) : k === 'sit' ? 0.1 + 0.4 * Math.sin(Math.PI * p) : k === 'stand' ? 0.12 : 0.05));
/** Where they are: sat back in the chair, stood a step nearer the rail. */
export const transferZ = (sit: number) => mix(-0.1, WC_AT.z, sit);
/** The gait belt's height on them (sat or stood). */
const beltY = (sit: number) => mix(0.92, 0.62, sit);
function transferKey(k: TransferKey, _p: number, t: number, s: number, sit: number): Key {
  const z = transferZ(sit);
  const back: P = [WC_AT.x + 0.06, beltY(sit), z + 0.11];
  const side: P = [WC_AT.x + 0.17, beltY(sit), z - 0.05];
  const shoulder: P = [WC_AT.x + 0.19, mix(1.33, 1.02, sit), z + 0.03];
  switch (k) {
    case 'brake':
      return { l: sp(TRANSFER_AT, 0.15, 0.5, 0.25), r: [WC_AT.x + 0.31, 0.5, WC_AT.z - 0.1], lean: 0.38, nod: 0.5, palms: 0.8, gl: 0.4, gr: 0.8, crouch: 0.85 };
    case 'belt':
    case 'rise':
    case 'sit':
      return { l: back, r: side, lean: 0.3 + 0.15 * sit, nod: 0.3, palms: 1.3, gl: 0.85, gr: 0.85, crouch: 0.6 * sit };
    case 'stand':
      return { l: [WC_AT.x + 0.08, 1.12, z + 0.12], r: shoulder, lean: 0.25, nod: 0.18 + 0.06 * pulse(t, 0.5, s), palms: 1.3, gl: 0.4, gr: 0.3 };
    case 'praise':
      return { l: shoulder, r: sp(TRANSFER_AT, -0.15, 1.22, 0.26), lean: 0.08, nod: 0.05, palms: 0, gl: 0.3, gr: 0.95 };
    default:
      return { l: sp(TRANSFER_AT, 0.18, 1.05 + 0.04 * wave(t, 0.7, s), 0.28), r: shoulder, lean: 0.12, nod: 0.25, palms: -0.4, gl: 0.2, gr: 0.3 };
  }
}

// =============================================================================================
// The medication cart (투약 카트): the cart at the left, a resident in a wheelchair at the right.

export const MED = {
  cart: { x: -0.45, z: -0.12, w: 0.64, d: 0.48, top: 0.98 },
  res: { x: 0.46, z: 0.0, yaw: -Math.PI / 2, seat: 0.48 },
  /** The resident's drawer's handle (shut), the clipboard on the top, the blood pressure monitor (on the fold-out side shelf), its button and screen. */
  drawer: [-0.3, 0.79, 0.135] as P,
  clip: [-0.28, 0.99, 0.03] as P,
  bp: [-0.04, 0.9, 0.1] as P,
  bpButton: [0.0, 0.955, 0.16] as P,
  bpScreen: [-0.04, 0.99, 0.15] as P,
};
/** A point on the resident in the wheelchair in their own frame (x to their left, y up, z ahead), in the cart's. */
export function onMedResident(x: number, y: number, z: number): P {
  const r = MED.res;
  const c = Math.cos(r.yaw);
  const n = Math.sin(r.yaw);
  return [r.x + x * c + z * n, y, r.z - x * n + z * c];
}
/** Their palm held out (for the pills, the cup), their mouth, their right upper arm (the cuff goes on it). */
export const MED_PALM: P = onMedResident(0.08, 0.84, 0.33);
export const MED_MOUTH: P = onMedResident(0, 1.15, 0.1);
/** Their left upper arm (the cuff goes on it), and their left hand on the armrest. */
export const MED_ARM: P = onMedResident(0.21, 0.88, 0.0);
/** Handing out the medicine (cwMeds): stood between the cart (ahead to the left) and the resident (ahead to the right). */
export const MEDS_AT: SpotAt = { x: 0.0, y: 0, z: 0.42, yaw: Math.PI + 0.25 };
/**
 * The day's medicine, ~17 s round: the resident's drawer pulled open, their packet taken out; held up,
 * the name on it read and checked with them (김순자 어르신 맞으시죠?); torn open; tipped into the
 * cup in their palm; the water cup handed over while they swallow; ticked off on the 투약 기록지.
 */
export type MedsKey = 'drawer' | 'name' | 'tear' | 'pills' | 'water' | 'tick';
const MEDS: Array<Step<MedsKey>> = [st('drawer', 2.2, 0.7), st('name', 2.4, 0.7), st('tear', 1.4, 0.5), st('pills', 2.0, 0.6), st('water', 3.2, 0.8), st('tick', 2.6, 0.8)];
export const medsBeat = (t: number, ph: number) => beatOf(MEDS, t, ph);
/** How far the drawer's out. */
export const drawerOut = (b: Beat<MedsKey>) => valueOf(b, (k, p) => (k === 'drawer' ? ss(p, 0.0, 0.4) * (1 - ss(p, 0.75, 1)) : 0));
function medsKey(k: MedsKey, p: number, t: number, s: number): Key {
  const S = MEDS_AT;
  const d = MED.drawer;
  switch (k) {
    case 'drawer': {
      const out = ss(p, 0.0, 0.4) * (1 - ss(p, 0.75, 1));
      return { l: [d[0], d[1], d[2] + 0.17 * out], r: [d[0] + 0.15, d[1] + 0.08 + 0.1 * ss(p, 0.6, 1), d[2] + 0.12 + 0.06 * ss(p, 0.6, 1)], lean: 0.28, nod: 0.45, palms: 0.6, gl: 0.85, gr: 0.6 };
    }
    case 'name':
      return { l: sp(S, 0.07, 1.12, 0.3), r: sp(S, -0.07, 1.12, 0.3), lean: 0.03, nod: 0.14 - 0.12 * ss(p, 0.55, 0.8), palms: 0.3, gl: 0.6, gr: 0.6 };
    case 'tear':
      return { l: sp(S, 0.05, 1.08, 0.3), r: sp(S, -0.04, 1.08 + 0.05 * ss(p, 0.2, 0.7), 0.3), lean: 0.03, nod: 0.3, palms: 0.3, gl: 0.75, gr: 0.75 };
    case 'pills':
      return { l: add(MED_PALM, [-0.06, 0.09, 0.03]), r: add(MED_PALM, [0.0, 0.12, 0.02]), lean: 0.22, nod: 0.45, palms: 0.6, gl: 0.6, gr: 0.6 };
    case 'water': {
      const c = add(MED_MOUTH, [0, -0.07, 0.05]);
      return { l: [MED.cart.x + 0.25, MED.cart.top + 0.01, -0.0], r: add(c, [-0.02, -0.06, 0.03]), lean: 0.24, nod: 0.25, palms: 1.0, gl: 0.3, gr: 0.4 };
    }
    default: {
      const c = MED.clip;
      return { l: [c[0] - 0.08, c[1] + 0.01, c[2] + 0.05], r: [c[0] + 0.02 * wave(t, 2.2, s), c[1] + 0.012 + 0.006 * wave(t, 4.4, s), c[2] + 0.02 * wave(t, 1.1, s)], lean: 0.34, nod: 0.5, palms: 1.25, gl: 0.3, gr: 0.85 };
    }
  }
}
/** What's in the hands: the packet (from the drawer to the pills), and the water cup at their lips. */
export const packetHeld = (b: Beat<MedsKey>) => (b.from === 'drawer' && b.p > 0.65) || b.from === 'name' || b.from === 'tear' || (b.from === 'pills' && b.e === 0);
export const pillCup = (b: Beat<MedsKey>) => b.from === 'pills' || b.from === 'water' || (b.from === 'tear' && b.e > 0.3);
export const waterUp = (b: Beat<MedsKey>) => amountOf(b, 'water');

/** Taking a blood pressure (cwBp): stood at the resident's right side, by the cart's monitor. */
export const BP_AT: SpotAt = { x: 0.22, y: 0, z: 0.46, yaw: Math.PI };
/**
 * A blood pressure, ~16 s round: the cuff wrapped round the upper arm; the monitor's start pressed;
 * their hand held while it pumps up and lets down; the reading looked at; told them, their hand
 * patted (128에 82, 아주 좋으세요); the cuff taken off.
 */
export type BpKey = 'cuff' | 'start' | 'wait' | 'read' | 'tell' | 'off';
const BP: Array<Step<BpKey>> = [st('cuff', 2.8, 0.7), st('start', 1.0, 0.5), st('wait', 4.0, 0.6), st('read', 1.8, 0.6), st('tell', 2.2, 0.7), st('off', 1.6, 0.7)];
export const bpBeat = (t: number, ph: number) => beatOf(BP, t, ph);
export const BP_HAND: P = onMedResident(0.24, 0.74, 0.2);
function bpKey(k: BpKey, _p: number, t: number, s: number): Key {
  const arm = MED_ARM;
  switch (k) {
    case 'start':
      return { l: add(MED.bpButton, [0, 0.01 - 0.008 * pulse(t, 1.5, s, 2), 0.01]), r: add(BP_HAND, [0.0, 0.03, 0.0]), lean: 0.22, nod: 0.42, palms: 1.2, gl: 0.2, gr: 0.4, crouch: 0.35 };
    case 'wait':
      return { l: add(BP_HAND, [0.03, 0.035, 0.03]), r: add(BP_HAND, [0.0, -0.03, 0.0]), lean: 0.2, nod: 0.25, palms: 1.2, gl: 0.45, gr: 0.45, crouch: 0.35 };
    case 'read':
      return { l: add(MED.bpScreen, [0.02, 0.0, 0.06]), r: add(BP_HAND, [0.0, 0.03, 0.0]), lean: 0.18, nod: 0.3, palms: 0.8, gl: 0.3, gr: 0.4, crouch: 0.35 };
    case 'tell':
      return { l: add(BP_HAND, [0.02, 0.04 + 0.015 * pulse(t, 1.2, s, 2), 0.03]), r: add(BP_HAND, [0.0, -0.03, 0.0]), lean: 0.18, nod: 0.12 + 0.06 * pulse(t, 0.5, s), palms: 1.3, gl: 0.2, gr: 0.45, crouch: 0.35 };
    default: {
      // Round the arm: one hand over, one under, working round.
      const a = t * 3 + s;
      return { l: add(arm, [0.02 * Math.cos(a), 0.05, 0.06 + 0.02 * Math.sin(a)]), r: add(arm, [0.04, -0.05, 0.05]), lean: 0.26, nod: 0.4, palms: 1.0, gl: 0.6, gr: 0.6, crouch: 0.35 };
    }
  }
}
/** Whether the cuff's on the arm (from the wrap to the taking off). */
export const cuffOn = (b: Beat<BpKey>) => !(b.from === 'cuff' && b.p < 0.4) && !(b.from === 'off' && b.p > 0.6) && !(b.from === 'off' && b.e > 0);
/** The monitor's reading: pumping up, letting down, done. */
export function bpReading(b: Beat<BpKey>): { mmHg: number; done: boolean } {
  if (b.from === 'wait') return { mmHg: Math.round(b.p < 0.3 ? 40 + 120 * (b.p / 0.3) : 160 - 75 * ((b.p - 0.3) / 0.7)), done: false };
  if (b.from === 'read' || b.from === 'tell') return { mmHg: 128, done: true };
  return { mmHg: 0, done: false };
}

// =============================================================================================
// The 생활실 activity table: 화투 on the green blanket, colouring.

/** The table (2 × 2): its top, the 화투 mat, the residents' places at the back, the carer's chair at the front. */
export const ACT = {
  top: 0.72,
  mat: { x: 0, z: 0.0, w: 0.56, d: 0.44 },
  resA: { x: -0.42, z: -0.66, seat: 0.46 },
  resB: { x: 0.42, z: -0.68, seat: 0.48 },
  sheet: [0.02, 0.725, 0.27] as P,
  sheetA: [-0.34, 0.725, -0.12] as P,
  sheetB: [0.34, 0.725, -0.12] as P,
  pile: [0.36, 0.725, 0.27] as P,
};
export const ACT_AT: SpotAt = { x: 0, y: 0.46, z: 0.64, yaw: Math.PI };
/**
 * A hand of 화투, ~12 s round: thinking over the fan of cards; one picked out, raised and slapped
 * down on the blanket (탁!); the pair taken to the pile; a laugh and a clap; their turn watched (a
 * resident slaps one down).
 */
export type HwatuKey = 'think' | 'pick' | 'slap' | 'take' | 'laugh' | 'watch';
const HWATU: Array<Step<HwatuKey>> = [st('think', 2.4, 0.6), st('pick', 0.7, 0.35), st('slap', 0.8, 0.4), st('take', 1.3, 0.5), st('laugh', 1.8, 0.6), st('watch', 3, 0.6)];
export const hwatuBeat = (t: number, ph: number) => beatOf(HWATU, t, ph);
/** Where the `n`th round's card lands on the blanket. */
export function slapPoint(n: number): P {
  const r = frac(Math.sin(n * 12.9898) * 43758.5453);
  const q = frac(Math.sin(n * 78.233) * 12345.678);
  return [ACT.mat.x - 0.14 + r * 0.28, ACT.top + 0.012, ACT.mat.z + q * 0.1];
}
function hwatuKey(k: HwatuKey, p: number, t: number, s: number, n: number): Key {
  const S = ACT_AT;
  const fan = sp(S, 0.12, 0.38, 0.26);
  switch (k) {
    case 'pick':
      return { l: fan, r: add(fan, [0.1, 0.06 + 0.06 * ss(p), 0.0]), lean: 0.12, nod: 0.38, palms: 0.4, gl: 0.6, gr: 0.75 };
    case 'slap': {
      const high = sp(S, -0.04, 0.72, 0.32);
      const land = slapPoint(n);
      const down = ss(p, 0.4, 0.62);
      return { l: fan, r: mixP(high, add(land, [0, 0.02, 0.06]), down), lean: mix(0.15, 0.42, down), nod: 0.45, palms: 1.4 * down, gl: 0.6, gr: 0.75 };
    }
    case 'take': {
      const land = slapPoint(n);
      return { l: fan, r: mixP(add(land, [0, 0.03, 0.05]), add(ACT.pile, [0, 0.03, 0]), ss(p, 0.35, 0.9)), lean: 0.38, nod: 0.45, palms: 1.2, gl: 0.6, gr: 0.6 };
    }
    case 'laugh': {
      const c = pulse(t, 2.4, s, 2);
      return { l: sp(S, 0.05 + 0.05 * (1 - c), 0.42, 0.26), r: sp(S, -0.05 - 0.05 * (1 - c), 0.42, 0.26), lean: -0.06, nod: -0.12, palms: 0.0, gl: 0.1, gr: 0.1 };
    }
    case 'watch':
      return { l: fan, r: sp(S, -0.14, 0.28, 0.3), lean: 0.12, nod: 0.25 + 0.05 * pulse(t, 0.5, s), palms: 1.2, gl: 0.6, gr: 0.3 };
    default:
      return { l: fan, r: add(fan, [0.08, 0.02, 0.0]), lean: 0.1, nod: 0.36 + 0.03 * wave(t, 0.3, s), palms: 0.4, gl: 0.6, gr: 0.5 };
  }
}
/** Whether the card's in the right hand (picked, raised), and whether it's down on the blanket yet. */
export const cardInHand = (b: Beat<HwatuKey>) => b.from === 'pick' || (b.from === 'slap' && b.p < 0.55);
export const cardDown = (b: Beat<HwatuKey>) => (b.from === 'slap' && b.p >= 0.55) || (b.from === 'take' && b.p < 0.35);
export const pairTaken = (b: Beat<HwatuKey>) => b.from === 'take' && b.p >= 0.35 && b.p < 0.9;

/**
 * Colouring together, ~16 s round: colouring the 무궁화 on their own sheet; held up to show; a finger
 * along a resident's petals (곱게 칠하셨네요); a crayon handed over; colouring again.
 */
export type ColorKey = 'color' | 'show' | 'point' | 'hand';
const COLOR: Array<Step<ColorKey>> = [st('color', 4, 0.6), st('show', 2, 0.6), st('point', 3, 0.7), st('hand', 1.8, 0.6), st('color', 3, 0.6)];
export const colorBeat = (t: number, ph: number) => beatOf(COLOR, t, ph);
function colorKey(k: ColorKey, _p: number, t: number, s: number): Key {
  const S = ACT_AT;
  const sh = ACT.sheet;
  switch (k) {
    case 'show':
      return { l: sp(S, 0.13, 0.52, 0.32), r: sp(S, -0.13, 0.52, 0.32), lean: 0.02, nod: -0.02, palms: 0.4, gl: 0.6, gr: 0.6 };
    case 'point':
      return { l: [ACT.sheetA[0] + 0.12 + 0.05 * wave(t, 0.5, s), ACT.top + 0.07, ACT.sheetA[2] + 0.17], r: [sh[0] + 0.12, sh[1] + 0.01, sh[2] + 0.02], lean: 0.44, nod: 0.5, palms: 1.2, gl: 0.6, gr: 0.85 };
    case 'hand':
      return { l: [sh[0] - 0.12, sh[1] + 0.01, sh[2] + 0.02], r: [ACT.sheetB[0] - 0.12, ACT.top + 0.12, ACT.sheetB[2] + 0.2], lean: 0.4, nod: 0.35, palms: 0.6, gl: 0.3, gr: 0.8 };
    default: {
      const a = t * 7 + s;
      return { l: [sh[0] + 0.1, sh[1] + 0.01, sh[2] + 0.02], r: [sh[0] - 0.02 + 0.04 * Math.sin(a), sh[1] + 0.025 + 0.004 * Math.sin(a * 2), sh[2] - 0.01 + 0.025 * Math.cos(a * 0.7)], lean: 0.32, nod: 0.55, palms: 1.2, gl: 0.2, gr: 0.85 };
    }
  }
}
export const sheetShown = (b: Beat<ColorKey>) => amountOf(b, 'show');
export const crayonOut = (b: Beat<ColorKey>) => b.from === 'hand' && b.p > 0.2;

// =============================================================================================
// The song corner (노래 교실): stood before the lyric screen, facing the room, the tambourine up.

export const SING_AT: SpotAt = { x: 0, y: 0, z: 0.34, yaw: 0 };
/** The song's tempo (beats a second), for the tambourine and the screen's wipe. */
export const SONG_BPS = 1.6;
/**
 * Leading the song, ~15 s round: the tambourine shaken up high, swaying; struck against the palm on
 * each beat at the chest; both arms up waving side to side; the hands held out to the room (다 같이!).
 */
export type SingKey = 'shake' | 'clap' | 'sway' | 'invite';
const SING: Array<Step<SingKey>> = [st('shake', 3.6, 0.6), st('clap', 3.6, 0.6), st('sway', 3.6, 0.6), st('invite', 2.4, 0.6)];
export const singBeat = (t: number, ph: number) => beatOf(SING, t, ph);
function singKey(k: SingKey, _p: number, t: number): Key {
  const S = SING_AT;
  const beat = pulse(t, SONG_BPS, 0, 3);
  const sway = 0.07 * wave(t, SONG_BPS / 2);
  switch (k) {
    case 'clap':
      return { l: sp(S, 0.02 + 0.07 * (1 - beat), 1.17, 0.3), r: sp(S, -0.07, 1.15, 0.3), lean: 0.04, nod: 0.02, palms: 0.0, gl: 0.0, gr: 0.85 };
    case 'sway':
      return { l: sp(S, 0.3 + sway, 1.66, 0.12), r: sp(S, -0.3 + sway, 1.66 + 0.02 * beat, 0.12), lean: 0.0, nod: -0.15, palms: 0.0, gl: 0.1, gr: 0.85 };
    case 'invite':
      return { l: sp(S, 0.26, 1.12 + 0.04 * wave(t, 0.8), 0.38), r: sp(S, -0.26, 1.12 + 0.04 * wave(t, 0.8, 0.5), 0.38), lean: 0.06, nod: 0.0, palms: -0.6, gl: 0.15, gr: 0.85 };
    default:
      return { l: sp(S, 0.2, 0.96, 0.0), r: sp(S, -0.22 + 0.03 * wave(t, 6), 1.62 + 0.03 * beat, 0.22), lean: -0.02 + sway * 0.2, nod: -0.1, palms: 0.0, gl: 0.3, gr: 0.85 };
  }
}

// =============================================================================================
// The memory wall (추억의 사진관): stood at it with a resident, looking at old photos.

export const MEM_AT: SpotAt = { x: 0.3, y: 0, z: 0.18, yaw: Math.PI + 0.3 };
/** The resident (stood with his cane, turned to the carer) and the photo talked over. */
export const MEM = { res: { x: -0.22, z: 0.22, yaw: Math.PI - 0.5 }, photo: [-0.08, 1.42, -0.42] as P };
export function onMemResident(x: number, y: number, z: number): P {
  const r = MEM.res;
  const c = Math.cos(r.yaw);
  const n = Math.sin(r.yaw);
  return [r.x + x * c + z * n, y, r.z - x * n + z * c];
}
/**
 * Talking over old photos, ~13 s round: a finger to the black-and-white wedding photo (이때 몇 살이셨어요?);
 * listening as he tells it, hands folded, nodding; a laugh, a hand to the chest; a hand on his back.
 */
export type MemKey = 'point' | 'listen' | 'laugh' | 'arm';
const MEMS: Array<Step<MemKey>> = [st('point', 3, 0.7), st('listen', 4, 0.8), st('laugh', 2, 0.6), st('arm', 3.2, 0.8)];
export const memBeat = (t: number, ph: number) => beatOf(MEMS, t, ph);
function memKey(k: MemKey, _p: number, t: number, s: number): Key {
  const S = MEM_AT;
  switch (k) {
    case 'point':
      return { l: add(MEM.photo, [0.06, 0.0, 0.1]), r: sp(S, -0.2, 0.9, 0.06), lean: 0.05, nod: -0.12, palms: 0.3, gl: 0.75, gr: 0.3 };
    case 'laugh':
      return { l: sp(S, 0.2, 0.92, 0.06), r: sp(S, -0.05, 1.24, 0.14), lean: -0.06, nod: -0.1, palms: 0.8, gl: 0.3, gr: 0.3 };
    case 'arm':
      return { l: onMemResident(-0.18, 1.24, -0.06), r: sp(S, -0.04, 1.0, 0.18), lean: 0.04, nod: 0.05 + 0.05 * pulse(t, 0.5, s), palms: 1.2, gl: 0.3, gr: 0.4 };
    default:
      return { l: sp(S, 0.04, 1.0, 0.18), r: sp(S, -0.04, 1.0, 0.19), lean: 0.06, nod: 0.08 + 0.08 * pulse(t, 0.45, s), palms: 1.2, gl: 0.4, gr: 0.4 };
  }
}

// =============================================================================================
// The care station (간호 스테이션): the nurse call answered at the panel.

export const CALL_AT: SpotAt = { x: 0.44, y: 0, z: 0.08, yaw: Math.PI };
/** The panel's flashing lamp, the handset's cradle, the call log on the desk. */
export const CALL = { lamp: [0.45, 1.43, -0.44] as P, cradle: [0.8, 1.32, -0.42] as P, log: [0.42, 0.755, -0.09] as P };
/**
 * Answering the call, ~12 s round: the flashing room found on the panel; its lamp pressed (응답);
 * the interphone handset lifted to the ear; talked into (네, 어르신, 바로 갈게요), a note jotted; hung
 * up; the time written in the call log.
 */
export type CallKey = 'look' | 'press' | 'lift' | 'talk' | 'hang' | 'log';
const CALLS: Array<Step<CallKey>> = [st('look', 1.4, 0.5), st('press', 0.9, 0.5), st('lift', 0.6, 0.5), st('talk', 3.6, 0.6), st('hang', 0.6, 0.6), st('log', 2.4, 0.8)];
export const callBeat = (t: number, ph: number) => beatOf(CALLS, t, ph);
function callKey(k: CallKey, p: number, t: number, s: number): Key {
  const S = CALL_AT;
  const ear = sp(S, -0.11, 1.5, 0.03);
  const desk: P = sp(S, 0.2, 0.86, 0.06);
  switch (k) {
    case 'look':
      return { l: desk, r: add(CALL.lamp, [0.02, -0.02, 0.1]), lean: 0.12, nod: -0.25, palms: 0.6, gl: 0.3, gr: 0.7 };
    case 'press':
      return { l: desk, r: add(CALL.lamp, [0, 0, 0.04 - 0.02 * ss(p, 0.3, 0.6)]), lean: 0.18, nod: -0.22, palms: 0.9, gl: 0.3, gr: 0.75 };
    case 'lift':
      return { l: desk, r: mixP(add(CALL.cradle, [0, 0, 0.05]), ear, ss(p, 0.2, 1)), lean: 0.1, nod: -0.1, palms: 0.2, gl: 0.3, gr: 0.85 };
    case 'talk':
      return { l: [CALL.log[0] - 0.02 * wave(t, 2.1, s), CALL.log[1] + 0.012, CALL.log[2]], r: ear, lean: 0.42, nod: 0.3 + 0.05 * pulse(t, 0.6, s), palms: 1.2, gl: 0.85, gr: 0.85 };
    case 'hang':
      return { l: desk, r: add(CALL.cradle, [0, 0.02, 0.05]), lean: 0.12, nod: -0.12, palms: 0.2, gl: 0.3, gr: 0.85 };
    default:
      return { l: desk, r: [CALL.log[0] + 0.02 * wave(t, 2.3, s), CALL.log[1] + 0.012 + 0.006 * wave(t, 4.6, s), CALL.log[2] + 0.02 * wave(t, 1.1, s)], lean: 0.45, nod: 0.5, palms: 1.25, gl: 0.3, gr: 0.85 };
  }
}
/** Whether the handset's in the hand (else on its cradle), and whether the call's still flashing. */
export const handsetUp = (b: Beat<CallKey>) => (b.from === 'lift' && b.p > 0.2) || b.from === 'talk' || (b.from === 'hang' && b.e === 0);
export const callFlashing = (b: Beat<CallKey>) => b.from === 'look' || (b.from === 'press' && b.p < 0.5) || (b.from === 'log' && b.e > 0.5);

// =============================================================================================

// Personal care (2026-11-02, at the user's request): a pad changed and a wash at the care bed, a bath in the
// 목욕실. Dignity is the rule the sums keep: the resident is never uncovered. At the bed the blanket stays
// over them from start to finish and the pad is changed under it, read through what goes in and comes out;
// the only skin the wash shows is the face and a forearm with its sleeve pushed up. In the bathroom they
// sit in a long bath robe with a wrap over it, and the water goes over that. As DrNow in doctorMotion.ts,
// one clock says all of it for a moment and the piece draws what it says.

/** What's in the hand. */
export type CwTool = 'glove' | 'oldPad' | 'wipe' | 'towel' | 'newPad' | 'cloth' | 'shower' | 'bigTowel';
export interface CwNow {
  beat: string;
  key: Key;
  at: SpotAt;
  /** The backrest, the resident's roll. */
  back: number;
  roll: number;
  /** The blanket's over their chest and over their hips and legs. Always, at the bed: see the test. */
  covered: boolean;
  /** How far the near edge of the blanket's held up for hands to go under (0-1). */
  flap: number;
  /** The covered pail's lid up. */
  lid: boolean;
  /** The near hand, its sleeve pushed up, the towel under the arm; the eyes shut for the face. */
  nearHand: P;
  sleeveUp: boolean;
  armTowel: boolean;
  eyesShut: boolean;
  headTurn: number;
  talk: number;
  tool: CwTool | null;
  toolAt: P;
  /** The tool's +y (for a cloth, away from what it's on; for the hand shower, the way the water goes), its turn about that, and which hand leads. */
  toolUp: P;
  toolYaw: number;
  lead: 'left' | 'right';
  /** The water's running; how much steam; the big towel's round them. */
  spray: boolean;
  steam: number;
  towelOn: boolean;
}
const nowOf = (beat: string, key: Key, at: SpotAt, nearHand: P): CwNow => ({
  beat, key, at, nearHand,
  back: 0.12, roll: 0, covered: true, flap: 0, lid: false, sleeveUp: false, armTowel: false, eyesShut: false, headTurn: 0.2, talk: 0,
  tool: null, toolAt: [0, 0, 0], toolUp: [0, 1, 0], toolYaw: 0, lead: 'left', spray: false, steam: 0, towelOn: false,
});
const norm3 = (a: P): P => {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};
const sub3 = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale3 = (a: P, k: number): P => [a[0] * k, a[1] * k, a[2] * k];
const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);
/** How the dweller's shoulders stand for a key (see avatar.ts), for checking reach. */
export function shoulderOf(at: SpotAt, sx: number, k: Pick<Key, 'lean' | 'crouch'>): P {
  const h = 1.3 - 0.45 * (1 - Math.cos(k.lean)) - 0.37 * (k.crouch ?? 0);
  return sp(at, sx * 0.18, h, 0.45 * Math.sin(k.lean));
}
const bedKey = (l: P, r: P, nod = 0.5, crouch = 0.12, lean = 0.4, gl = 0.35, gr = 0.35): Key => ({ l, r, lean, nod, palms: 1.2, gl, gr, crouch });
/** The over-bed table's middle and top: over the legs for a change, nearer for a wash, where the basin's in reach of both hands. */
export const OVER = { x: 0.36, y: 1.03, changeZ: 0.36, washZ: 0.14 };
const restHand = (a: number, roll: number): P => onBody(a, roll, 0.07, 0.12, 0.17);

// ---------------------------------------------------------------------------------------------
// 기저귀 갈아 드리기. Told first, the screen up, gloves; rolled a little away; the old pad rolled up inside itself
// and out into the covered pail; wiped and dried under the blanket; the skin looked at; clean gloves; the
// new pad in, half rolled; back over; fastened; the creases smoothed (they cause sores); gloves off, hands cleaned.

export const CHANGE_AT: SpotAt = { x: 0.68, y: 0, z: -0.16, yaw: -Math.PI / 2 };
/** What's on the table, and the pail: its lid's top. */
export const CHANGE_HOME = { glove: [0.28, 1.09, 0.27] as P, wipe: [0.22, 1.07, 0.42] as P, towel: [0.44, 1.06, 0.24] as P, pad: [0.44, 1.07, 0.44] as P, gel: [0.18, 1.12, 0.25] as P };
export const PAIL: P = [0.74, 0.8, 0.26];
/** Where hands go under the blanket's near edge, by the hips; how far they go in with the new pad. */
const EDGE: P = [0.4, TOP + 0.1, -0.12];
const TUCKED: P = [0.24, TOP + 0.12, -0.18];
export type ChangeKey = 'tell' | 'gloves' | 'roll' | 'undo' | 'out' | 'bin' | 'wipe' | 'dry' | 'bin2' | 'look' | 'regloves' | 'new' | 'rollBack' | 'fasten' | 'smooth' | 'off' | 'gel' | 'ask';
const CHANGE: Array<Step<ChangeKey>> = [
  st('tell', 2.6, 0.5), st('gloves', 1.8, 0.5), st('roll', 2.0, 0.3), st('undo', 2.0, 0.4), st('out', 2.2, 0.3), st('bin', 1.4, 0.4), st('wipe', 3.0, 0.3), st('dry', 2.0, 0.4), st('bin2', 1.2, 0.4),
  st('look', 1.4, 0.4), st('regloves', 1.4, 0.4), st('new', 2.8, 0.3), st('rollBack', 1.8, 0.4), st('fasten', 2.2, 0.5), st('smooth', 2.6, 0.5), st('off', 1.4, 0.4), st('gel', 2.2, 0.5), st('ask', 1.8, 0.8),
];
export const CHANGE_ROUND = roundOf(CHANGE);
const ROLLED = -0.55;
const changeRoll = (k: ChangeKey, p: number) => (k === 'roll' ? ROLLED * ss(p, 0.05, 0.95) : k === 'rollBack' ? ROLLED * (1 - ss(p, 0.05, 0.95)) : ['undo', 'out', 'bin', 'wipe', 'dry', 'bin2', 'look', 'regloves', 'new'].includes(k) ? ROLLED : 0);
const overPail: P = add(PAIL, [0, 0.14, 0]);
function changeTool(k: ChangeKey, p: number, t: number): Pick<CwNow, 'tool' | 'toolAt'> | null {
  const rub: P = [0.012 * wave(t, 1.3), 0, 0.05 * wave(t, 0.9)];
  switch (k) {
    case 'gloves':
    case 'regloves':
      return p < 0.9 ? { tool: 'glove', toolAt: mixP(CHANGE_HOME.glove, sp(CHANGE_AT, 0.04, 1.1, 0.3), ss(p, 0.1, 0.55)) } : null;
    case 'out':
      return { tool: 'oldPad', toolAt: mixP(EDGE, overPail, ss(p, 0.15, 0.95)) };
    case 'bin':
      return p < 0.45 ? { tool: 'oldPad', toolAt: add(overPail, [0, -0.1 * ss(p, 0.1, 0.45), 0]) } : null;
    case 'wipe':
      return { tool: 'wipe', toolAt: p < 0.25 ? mixP(CHANGE_HOME.wipe, EDGE, ss(p, 0, 0.25)) : add(EDGE, rub) };
    case 'dry':
      return { tool: 'towel', toolAt: p < 0.25 ? mixP(EDGE, CHANGE_HOME.towel, ss(p, 0, 0.25)) : p < 0.45 ? mixP(CHANGE_HOME.towel, EDGE, ss(p, 0.25, 0.45)) : add(EDGE, rub) };
    case 'bin2':
      return p < 0.5 ? { tool: 'towel', toolAt: mixP(EDGE, overPail, ss(p, 0, 0.45)) } : null;
    case 'new':
      return p < 0.85 ? { tool: 'newPad', toolAt: p < 0.45 ? mixP(CHANGE_HOME.pad, EDGE, ss(p, 0, 0.45)) : mixP(EDGE, TUCKED, ss(p, 0.45, 0.85)) } : null;
    case 'off':
      return p < 0.7 ? { tool: 'glove', toolAt: mixP(sp(CHANGE_AT, 0.04, 1.1, 0.3), overPail, ss(p, 0.1, 0.6)) } : null;
    default:
      return null;
  }
}
function changeKey(k: ChangeKey, p: number, t: number, s: number, roll: number): Key {
  const up = 0.07 * Math.min(1, Math.abs(roll) / 0.5);
  const hip: P = [0.22, TOP + 0.25 + up, -0.12];
  const shoulder: P = [0.2, TOP + 0.33 + up, -0.58];
  const restL = sp(CHANGE_AT, 0.16, 1.04, 0.24);
  const restR = sp(CHANGE_AT, -0.13, 1.04, 0.26);
  const tool = changeTool(k, p, t);
  const inL = tool ? add(tool.toolAt, [0, 0.016, 0]) : null;
  switch (k) {
    case 'gloves':
    case 'regloves':
      return bedKey(inL ?? restL, sp(CHANGE_AT, -0.04, 1.08, 0.3), 0.55, 0, 0.3, 0.6, 0.5);
    case 'roll':
    case 'rollBack':
      return bedKey(hip, shoulder, 0.42, 0.12, 0.4, 0.2, 0.2);
    case 'undo':
      return bedKey(add(EDGE, [0, 0, 0.03 * wave(t, 0.8, s)]), hip, 0.55, 0.2, 0.42, 0.6, 0.2);
    case 'out':
    case 'bin':
    case 'bin2':
      return bedKey(inL ?? add(overPail, [0, 0.04, 0]), hip, 0.5, 0.25, 0.42, 0.7, 0.2);
    case 'wipe':
    case 'dry':
    case 'new':
      return bedKey(inL ?? add(TUCKED, [0.08, 0.02, 0]), hip, 0.55, 0.2, 0.42, 0.65, 0.2);
    case 'look':
      return bedKey(add(EDGE, [0, 0.03, 0]), hip, 0.68, 0.25, 0.46, 0.4, 0.2);
    case 'fasten': {
      const go = 0.04 * wave(t, 0.9, s);
      return bedKey(add(EDGE, [0, 0, 0.03 + go]), add(EDGE, [0, 0.01, -0.16 - go]), 0.55, 0.2, 0.42, 0.6, 0.6);
    }
    case 'smooth': {
      const z = -0.02 + 0.13 * wave(t, 0.33, s);
      return { l: [0.16, TOP + 0.25, z + 0.14], r: [0.3, TOP + 0.25, z - 0.14], lean: 0.46, nod: 0.5, palms: 1.5, gl: 0, gr: 0, crouch: 0.08 };
    }
    case 'off':
      return bedKey(inL ?? add(overPail, [0, 0.04, 0]), restR, 0.45, 0.2, 0.36, 0.6, 0.3);
    case 'gel': {
      if (p < 0.3) return bedKey(add(CHANGE_HOME.gel, [0.01, 0.05, 0]), restR, 0.42, 0, 0.3, 0.2, 0.3);
      const go = 0.018 * wave(t, 2.6, s);
      return { l: sp(CHANGE_AT, 0.03 + go, 1.08, 0.28), r: sp(CHANGE_AT, -0.03 + go, 1.08, 0.28 + go), lean: 0.14, nod: 0.4, palms: 0.3, gl: 0.4, gr: 0.4, crouch: 0 };
    }
    case 'ask':
    case 'tell':
      return bedKey(restL, shoulder, 0.2 + 0.06 * pulse(t, 0.5, s), 0.08, 0.32, 0.3, 0.3);
    default:
      return bedKey(restL, restR);
  }
}
function changeNow(t: number, ph: number): CwNow {
  const b = beatOf(CHANGE, t, ph);
  const s = ph * 7.1;
  const roll = valueOf(b, changeRoll);
  const n = nowOf(b.from, blended(b, (k, p) => changeKey(k, p, t, s, roll)), CHANGE_AT, restHand(0.12, roll));
  n.roll = roll;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  n.flap = valueOf(b, (x, q) => (x === 'undo' || x === 'wipe' || x === 'dry' || x === 'look' || x === 'fasten' || (x === 'out' && q < 0.3) || (x === 'new' && q > 0.3) ? 1 : 0));
  n.lid = (k === 'out' && p > 0.55) || (k === 'bin' && p < 0.7) || (k === 'bin2' && p < 0.75) || (k === 'off' && p > 0.3 && p < 0.85);
  n.talk = k === 'tell' || k === 'ask' ? 0.7 : k === 'roll' || k === 'rollBack' ? 0.3 : 0;
  n.headTurn = k === 'tell' || k === 'ask' ? 0.5 : 0.15;
  const tool = changeTool(k, p, t);
  if (tool) {
    n.tool = tool.tool;
    n.toolAt = tool.toolAt;
  }
  return n;
}

// ---------------------------------------------------------------------------------------------
// 몸 닦아 드리기. Told, the backrest up; the water tried on the inside of the wrist; a cloth wet and wrung; the
// face first, from the inner corner of each eye outward, then dried; the backrest eased down, the near arm
// out on a towel on the blanket, its sleeve pushed up; the cloth wrung again; the forearm wiped towards the
// elbow and the hand, held by the wrist, then dried; the sleeve down, the arm back under, the blanket smoothed.

export const WASH_AT: SpotAt = { x: 0.68, y: 0, z: -0.3, yaw: -Math.PI / 2 };
const FACE_BACK = 0.85;
const ARM_BACK = 0.35;
/** The basin's middle and its water's top, the dry towels. */
export const BASIN: P = [0.34, 1.095, 0.06];
export const WASH_TOWELS: P = [0.48, 1.07, 0.26];
const WRING: P = [0.36, 1.17, -0.05];
export const ARM_HAND: P = [0.34, TOP + 0.31, -0.22];
/** The near arm's shoulder and about where its elbow lies, out on the towel. */
const ARM_SHOULDER = onBody(ARM_BACK, 0, 0.2, 0.47, 0);
export const ARM_ELBOW: P = add(mixP(ARM_SHOULDER, ARM_HAND, 0.52), [0.05, -0.02, 0]);
/** Which way is out of the face at the backrest `a`, and a point on it. */
const faceOut = (a: number): P => [0, Math.cos(a), Math.sin(a)];
const facePoint = (a: number, side: number, along: number): P => add(onBody(a, 0, side, along, 0.06), scale3(faceOut(a), 0.13));
export type WashKey = 'tell' | 'temp' | 'wet' | 'wring' | 'face' | 'dryFace' | 'sleeve' | 'arm' | 'hand' | 'dryArm' | 'sleeveDown' | 'smooth' | 'ask';
const WASH: Array<Step<WashKey>> = [
  st('tell', 2.8, 0.5), st('temp', 1.8, 0.4), st('wet', 1.4, 0.3), st('wring', 1.6, 0.5), st('face', 4.0, 0.5), st('dryFace', 2.0, 0.6), st('sleeve', 2.4, 0.5), st('wet', 1.2, 0.3), st('wring', 1.4, 0.5), st('arm', 3.8, 0.3), st('hand', 2.4, 0.5), st('dryArm', 2.8, 0.5), st('sleeveDown', 2.0, 0.5), st('smooth', 2.2, 0.5), st('ask', 1.8, 0.8),
];
export const WASH_ROUND = roundOf(WASH);
/** Whether it's past the face: the second wet-and-wring, for the arm, not the first. */
const SLEEVE_FROM = roundOf(WASH.slice(0, 6));
const washBack = (b: Beat<WashKey>, armPart: boolean) =>
  valueOf(b, (k, p) => {
    switch (k) {
      case 'tell':
        return 0.15 + (FACE_BACK - 0.15) * ss(p, 0.25, 1);
      case 'temp':
      case 'face':
      case 'dryFace':
        return FACE_BACK;
      case 'wet':
      case 'wring':
        return armPart ? ARM_BACK : FACE_BACK;
      case 'sleeve':
        return FACE_BACK + (ARM_BACK - FACE_BACK) * ss(p, 0, 0.4);
      case 'smooth':
        return ARM_BACK + (0.15 - ARM_BACK) * ss(p, 0.1, 0.9);
      case 'ask':
        return 0.15;
      default:
        return ARM_BACK;
    }
  });
/** Where a cloth is on the skin (the middle of it), and which way is out of the skin. */
function washCloth(k: WashKey, p: number, t: number, s: number, a: number): { at: P; up: P } {
  switch (k) {
    case 'face':
      // An eye, from its inner corner out; the other; the cheeks and forehead.
      if (p < 0.25) return { at: facePoint(a, 0.015 + 0.05 * ss(p, 0, 0.25), 0.685), up: faceOut(a) };
      if (p < 0.5) return { at: facePoint(a, -0.015 - 0.05 * ss(p, 0.25, 0.5), 0.685), up: faceOut(a) };
      return { at: facePoint(a, 0.05 * wave(t, 0.9, s), 0.66 + 0.035 * wave(t, 0.45, s)), up: faceOut(a) };
    case 'dryFace':
      return { at: facePoint(a, 0.035 * wave(t, 0.8, s), 0.66), up: faceOut(a) };
    case 'arm': {
      // Long strokes from the wrist towards the elbow, the cloth lifted to come back.
      const u = frac(t * 0.8 + s);
      const along = u < 0.7 ? u / 0.7 : 1 - (u - 0.7) / 0.3;
      return { at: add(mixP(ARM_HAND, ARM_ELBOW, along), [0, 0.05 + (u < 0.7 ? 0 : 0.03), 0]), up: [0, 1, 0] };
    }
    case 'hand':
      return { at: add(ARM_HAND, [0.008 * wave(t, 2.4, s), 0.04, 0.05 + 0.02 * wave(t, 1.2, s)]), up: [0, 1, 0] };
    default:
      // Pressed dry rather than rubbed.
      return { at: add(mixP(ARM_HAND, ARM_ELBOW, 0.5 + 0.5 * wave(t, 0.5, s)), [0, 0.055 + 0.01 * pulse(t, 1.4, s), 0]), up: [0, 1, 0] };
  }
}
function washKey(k: WashKey, p: number, t: number, s: number, a: number): Key {
  const restL = sp(WASH_AT, 0.16, 1.1, 0.26);
  const restR = sp(WASH_AT, -0.14, 1.1, 0.28);
  switch (k) {
    case 'temp':
      return { l: add(BASIN, [0.03, 0.02, -0.04]), r: restR, lean: 0.34, nod: 0.55, palms: -0.5, gl: 0.1, gr: 0.3, crouch: 0.05 };
    case 'wet':
      return bedKey(add(BASIN, [0.08, 0.05, 0.02]), add(BASIN, [0.02, 0.03, -0.07]), 0.55, 0.05, 0.42, 0.4, 0.6);
    case 'wring': {
      const w = 0.012 * wave(t, 2.2, s);
      return bedKey(add(WRING, [w, 0, 0.06]), add(WRING, [-w, 0.005, -0.06]), 0.5, 0, 0.36, 0.85, 0.85);
    }
    case 'face':
    case 'dryFace': {
      const c = washCloth(k, p, t, s, a);
      return { l: restL, r: add(c.at, scale3(faceOut(a), 0.015)), lean: 0.58, nod: 0.3, palms: 1.1, gl: 0.3, gr: 0.1, crouch: 0 };
    }
    case 'sleeve': {
      const towards = mixP(ARM_HAND, ARM_ELBOW, 0.75 * ss(p, 0.4, 0.95));
      return bedKey(add(ARM_HAND, [0.02, 0.05, 0.03]), add(towards, [0.01, 0.05, -0.01]), 0.58, 0.05, 0.42, 0.6, 0.6);
    }
    case 'arm':
    case 'hand':
    case 'dryArm': {
      const c = washCloth(k, p, t, s, a);
      // The left hand holds the wrist, except while the hand itself is wiped, when it's under the palm.
      const hold = k === 'hand' ? add(ARM_HAND, [0.01, -0.012, 0.035]) : add(ARM_HAND, [0.015, 0.05, 0.045]);
      return bedKey(hold, add(c.at, [0, 0.015, 0]), 0.58, 0.05, 0.42, 0.5, 0.1);
    }
    case 'sleeveDown': {
      const go = ss(p, 0.1, 0.65);
      return bedKey(add(mixP(ARM_HAND, restHand(ARM_BACK, 0), ss(p, 0.55, 1)), [0.02, 0.05, 0.03]), add(mixP(ARM_ELBOW, ARM_HAND, go), [0.01, 0.05, -0.01]), 0.55, 0.05, 0.42, 0.6, 0.6);
    }
    case 'smooth': {
      const z = -0.15 + 0.08 * wave(t, 0.33, s);
      return { l: [0.2, TOP + 0.28, z + 0.12], r: [0.28, TOP + 0.34, z - 0.14], lean: 0.46, nod: 0.5, palms: 1.5, gl: 0, gr: 0, crouch: 0.05 };
    }
    default:
      return bedKey(restL, [0.22, TOP + 0.42, -0.56], 0.22 + 0.06 * pulse(t, 0.5, s), 0.03, 0.36, 0.3, 0.3);
  }
}
function washNow(t: number, ph: number): CwNow {
  const b = beatOf(WASH, t, ph);
  const s = ph * 7.1;
  const armPart = frac(t / WASH_ROUND + ph) * WASH_ROUND > SLEEVE_FROM;
  const a = washBack(b, armPart);
  const n = nowOf(b.from, blended(b, (k, p) => washKey(k, p, t, s, a)), WASH_AT, restHand(a, 0));
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  n.back = a;
  const lying = armPart && (k === 'wet' || k === 'wring' || k === 'arm' || k === 'hand' || k === 'dryArm');
  const out = k === 'sleeve' ? ss(p, 0.05, 0.4) : k === 'sleeveDown' ? 1 - ss(p, 0.55, 1) : lying ? 1 : 0;
  n.nearHand = mixP(restHand(a, 0), ARM_HAND, out);
  n.armTowel = out > 0.5 || (k === 'sleeve' && p > 0.2);
  n.sleeveUp = (k === 'sleeve' && p > 0.6) || lying || (k === 'sleeveDown' && p < 0.5);
  n.eyesShut = k === 'face' || k === 'dryFace';
  n.talk = k === 'tell' || k === 'ask' ? 0.7 : k === 'arm' ? 0.25 : 0;
  n.headTurn = k === 'face' || k === 'dryFace' ? 0.1 : k === 'tell' || k === 'ask' || k === 'arm' || k === 'hand' ? 0.5 : 0.2;
  n.lead = 'right';
  if (k === 'wet') {
    n.tool = 'cloth';
    n.toolAt = add(BASIN, [0.02, -0.005, -0.06]);
  } else if (k === 'wring') {
    n.tool = 'cloth';
    n.toolAt = WRING;
    n.toolYaw = Math.PI / 2;
  } else if (k === 'face' || k === 'arm' || k === 'hand' || k === 'dryFace' || k === 'dryArm') {
    const c = washCloth(k, p, t, s, a);
    n.tool = k === 'dryFace' || k === 'dryArm' ? 'towel' : 'cloth';
    n.toolAt = c.at;
    n.toolUp = c.up;
  }
  return n;
}

// ---------------------------------------------------------------------------------------------
// 목욕 도와드리기 (cwBathRoom, 3 × 2). The resident on the shower chair facing the carer, in a long robe with a wrap
// over it from first to last. Told; the mixer on; the hand shower down; the water tried on the carer's own
// wrist; from the feet (the far end from the heart, so they get used to it), then over the shoulder; off, and
// hung up; the big towel from its stand, round their shoulders and patted dry.

/** The chair (the middle of its seat, facing -x), the wet zone's mixer and the hook, the towel stand's stack. */
export const BATH = {
  chair: { x: -0.26, z: -0.35, yaw: -Math.PI / 2, seat: 0.46 },
  mixer: [-0.72, 1.02, -0.9] as P,
  hook: [-0.6, 1.4, -0.9] as P,
  stack: [-1.02, 0.9, 0.02] as P,
};
export const BATH_AT: SpotAt = { x: -0.95, y: 0, z: -0.35, yaw: Math.PI / 2 };
/** A point on the bather in their own frame (x to their left, y up, z ahead), in the piece's. */
export function onBather(x: number, y: number, z: number): P {
  const r = BATH.chair;
  const c = Math.cos(r.yaw);
  const n = Math.sin(r.yaw);
  return [r.x + x * c + z * n, y, r.z - x * n + z * c];
}
export type BathKey = 'tell' | 'mixer' | 'take' | 'wrist' | 'feet' | 'shoulder' | 'off' | 'towel' | 'wrap' | 'pat';
const BATHS: Array<Step<BathKey>> = [st('tell', 2.8, 0.6), st('mixer', 1.8, 0.4), st('take', 1.4, 0.4), st('wrist', 3.0, 0.6), st('feet', 4.0, 0.7), st('shoulder', 4.2, 0.6), st('off', 1.8, 0.5), st('towel', 2.2, 0.5), st('wrap', 2.8, 0.4), st('pat', 2.8, 0.8)];
export const BATH_ROUND = roundOf(BATHS);
const HANG_WAY: P = [0, -0.5, 0.85];
const wristAt = sp(BATH_AT, 0.0, 0.97, 0.34);
function bathTool(k: BathKey, p: number, t: number, s: number): Pick<CwNow, 'tool' | 'toolAt' | 'toolUp' | 'toolYaw' | 'lead' | 'spray'> | null {
  const ready = sp(BATH_AT, -0.03, 1.2, 0.34);
  const shower = (toolAt: P, toolUp: P, lead: 'left' | 'right', spray: boolean) => ({ tool: 'shower' as const, toolAt, toolUp, toolYaw: 0, lead, spray });
  const towel = (toolAt: P) => ({ tool: 'bigTowel' as const, toolAt, toolUp: [0, 1, 0] as P, toolYaw: Math.PI / 2, lead: 'right' as const, spray: false });
  switch (k) {
    case 'take':
      return shower(mixP(BATH.hook, ready, ss(p, 0.1, 0.9)), norm3(mixP(HANG_WAY, [0, -1, 0], ss(p, 0.1, 0.9))), 'left', p > 0.8);
    case 'wrist':
      return shower(ready, [0, -1, 0], 'right', true);
    case 'feet': {
      const h: P = [-0.68, 0.6, -0.35];
      return shower(h, norm3(sub3(onBather(0.1 * wave(t, 0.42, s), 0.1, 0.4), h)), 'right', true);
    }
    case 'shoulder': {
      const h: P = [-0.62, 1.32, -0.14];
      return shower(h, norm3(sub3(onBather(0.2, 1.0, 0.06 * wave(t, 0.4, s)), h)), 'right', true);
    }
    case 'off':
      return shower(mixP(ready, BATH.hook, ss(p, 0.1, 0.9)), norm3(mixP([0, -1, 0], HANG_WAY, ss(p, 0.1, 0.9))), 'left', p < 0.2);
    case 'towel':
      return p > 0.25 ? towel(mixP(BATH.stack, sp(BATH_AT, 0, 1.08, 0.34), ss(p, 0.3, 1))) : null;
    case 'wrap':
      return p < 0.7 ? towel(mixP(sp(BATH_AT, 0, 1.08, 0.34), onBather(0, 1.09, -0.02), ss(p, 0, 0.7))) : null;
    default:
      return null;
  }
}
function bathKey(k: BathKey, p: number, t: number, s: number): Key {
  const tool = bathTool(k, p, t, s);
  const on: P = tool ? add(tool.toolAt, [0, 0.01, 0]) : [0, 1, 0];
  const restL = sp(BATH_AT, 0.17, 1.02, 0.22);
  const restR = sp(BATH_AT, -0.15, 1.02, 0.24);
  const near = onBather(0.2, 1.02, 0.02);
  const far = onBather(-0.2, 1.02, 0.02);
  switch (k) {
    case 'mixer':
      return { l: add(BATH.mixer, [0.012 * wave(t, 0.9, s), 0, 0.03]), r: restR, lean: 0.14, nod: 0.3, palms: 0.5, gl: 0.75, gr: 0.3, crouch: 0.1 };
    case 'take':
      return { l: on, r: mixP(restR, sp(BATH_AT, -0.05, 1.15, 0.32), ss(p, 0.55, 1)), lean: 0.14, nod: 0.1, palms: 0.5, gl: 0.8, gr: 0.5, crouch: 0 };
    case 'wrist':
      return { l: wristAt, r: on, lean: 0.14, nod: 0.55, palms: -0.6, gl: 0.1, gr: 0.85, crouch: 0 };
    case 'feet':
      return { l: [-0.6, 0.57, -0.45], r: on, lean: 0.45, nod: 0.6, palms: 1.0, gl: 0.3, gr: 0.85, crouch: 1 };
    case 'shoulder':
      return { l: [-0.36, 0.92, -0.44], r: on, lean: 0.36, nod: 0.25, palms: 1.2, gl: 0.3, gr: 0.85, crouch: 0.05 };
    case 'off':
      return { l: on, r: restR, lean: 0.12, nod: 0.08, palms: 0.5, gl: 0.8, gr: 0.3, crouch: 0 };
    case 'towel': {
      const a = tool ? tool.toolAt : BATH.stack;
      return { l: add(a, [0, 0.02, -0.14]), r: add(a, [0, 0.02, 0.14]), lean: 0.36, nod: 0.45, palms: 1.3, gl: 0.3, gr: 0.3, crouch: 0.2 };
    }
    case 'wrap':
      return tool ? { l: add(on, [0, 0.01, -0.14]), r: add(on, [0, 0.01, 0.14]), lean: 0.5, nod: 0.3, palms: 1.3, gl: 0.3, gr: 0.3, crouch: 0.05 } : { l: add(far, [-0.02, 0.05, 0]), r: add(near, [-0.02, 0.05, 0]), lean: 0.5, nod: 0.3, palms: 1.3, gl: 0.3, gr: 0.3, crouch: 0.05 };
    case 'pat': {
      const pad = 0.018 * pulse(t, 1.5, s, 2);
      return { l: add(far, [-0.02, 0.05 + pad, 0]), r: add(near, [-0.02, 0.05 + pad, 0]), lean: 0.5, nod: 0.25 + 0.06 * pulse(t, 0.5, s), palms: 1.3, gl: 0.2, gr: 0.2, crouch: 0.05 };
    }
    default:
      return { l: restL, r: [-0.55, 0.8, -0.22], lean: 0.34, nod: 0.25 + 0.06 * pulse(t, 0.5, s), palms: 1.2, gl: 0.3, gr: 0.3, crouch: 0.2 };
  }
}
function bathNow(t: number, ph: number): CwNow {
  const b = beatOf(BATHS, t, ph);
  const s = ph * 7.1;
  const n = nowOf(b.from, blended(b, (k, p) => bathKey(k, p, t, s)), BATH_AT, [0, 0, 0]);
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const tool = bathTool(k, p, t, s);
  if (tool) Object.assign(n, tool);
  n.back = 0;
  n.talk = k === 'tell' || k === 'pat' ? 0.7 : k === 'feet' ? 0.3 : 0;
  n.headTurn = k === 'shoulder' ? 0.25 : 0;
  n.eyesShut = k === 'shoulder' && p > 0.5;
  n.steam = valueOf(b, (x) => (x === 'wrist' || x === 'feet' || x === 'shoulder' ? 1 : x === 'off' ? 0.5 : 0));
  n.towelOn = (k === 'wrap' && p >= 0.7) || k === 'pat';
  return n;
}

/** A moment of one of these. */
export function cwNow(m: 'cwChange' | 'cwWash' | 'cwBath', t: number, ph: number): CwNow {
  return m === 'cwChange' ? changeNow(t, ph) : m === 'cwWash' ? washNow(t, ph) : bathNow(t, ph);
}
/** Seconds into a round where each beat starts (for the lead's shots); a beat done twice is listed twice. */
export function cwBeatTimes(m: 'cwChange' | 'cwWash' | 'cwBath'): Array<[string, number]> {
  const steps = (m === 'cwChange' ? CHANGE : m === 'cwWash' ? WASH : BATHS) as Array<Step<string>>;
  let u = 0;
  return steps.map((k) => {
    const at: [string, number] = [k.key, u];
    u += k.hold + k.move;
    return at;
  });
}

// =============================================================================================

/**
 * The hands and bend for a motion, in the piece's frame, and the spot they're turned by (the walk's
 * moves). The pieces put what's held at these hands.
 */
export function careKeyOf(m: CareMotion, t: number, ph: number): { key: Key; at: SpotAt } {
  const s = ph * 7.1;
  switch (m) {
    case 'cwCare': {
      const b = careBeat(t, ph);
      const a = careBack(b);
      return { key: blended(b, (k, p) => careKey(k, p, t, s, a)), at: CARE_AT };
    }
    case 'cwTurn': {
      const b = turnBeat(t, ph);
      const roll = turnRoll(b);
      return { key: blended(b, (k, p) => turnKey(k, p, t, s, roll)), at: TURN_AT };
    }
    case 'cwFall':
      return { key: blended(fallBeat(t, ph), (k, p) => fallKey(k, p, t, s)), at: FALL_AT };
    case 'cwObserve':
      return { key: blended(observeBeat(t, ph), (k, p) => observeKey(k, p, t, s)), at: OBSERVE_AT };
    case 'cwFeed': {
      const b = feedBeat(t, ph);
      const lean = feedLean(b);
      return { key: blended(b, (k, p) => feedKey(k, p, t, s, lean)), at: FEED_AT };
    }
    case 'cwPrep':
      return { key: blended(prepBeat(t, ph), (k, p) => prepKey(k, p, t, s)), at: PREP_AT };
    case 'cwWalk': {
      const w = walkAt(t, ph);
      return { key: walkKey(w, t, s), at: walkSpot(w) };
    }
    case 'cwTransfer': {
      const b = transferBeat(t, ph);
      const sit = transferSit(b);
      return { key: blended(b, (k, p) => transferKey(k, p, t, s, sit)), at: TRANSFER_AT };
    }
    case 'cwMeds':
      return { key: blended(medsBeat(t, ph), (k, p) => medsKey(k, p, t, s)), at: MEDS_AT };
    case 'cwBp':
      return { key: blended(bpBeat(t, ph), (k, p) => bpKey(k, p, t, s)), at: BP_AT };
    case 'cwHwatu': {
      const b = hwatuBeat(t, ph);
      return { key: blended(b, (k, p) => hwatuKey(k, p, t, s, b.n)), at: ACT_AT };
    }
    case 'cwColor':
      return { key: blended(colorBeat(t, ph), (k, p) => colorKey(k, p, t, s)), at: ACT_AT };
    case 'cwSing':
      return { key: blended(singBeat(t, ph), (k, p) => singKey(k, p, t)), at: SING_AT };
    case 'cwRemember':
      return { key: blended(memBeat(t, ph), (k, p) => memKey(k, p, t, s)), at: MEM_AT };
    case 'cwChange':
    case 'cwWash':
    case 'cwBath': {
      const n = cwNow(m, t, ph);
      return { key: n.key, at: n.at };
    }
    default:
      return { key: blended(callBeat(t, ph), (k, p) => callKey(k, p, t, s)), at: CALL_AT };
  }
}

export function careDoing(m: CareMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = careKeyOf(m, t, carePhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
