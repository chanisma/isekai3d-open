import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 안경원 (2026-10-27, the workplace pipeline, at the user's request): the optician's day done the
 * way it's done in a Korean glasses shop. At the 검안 unit a customer sits behind the phoropter: it's
 * lowered to their eyes, the chart on the wall lit and a line pointed at, the lenses flipped with a
 * turn of the dial (1번이 잘 보여요? 2번은요?), the answer listened for, the red-green chart, the result
 * tapped into the controller; for 시기능 훈련 the phoropter goes up and a target on a stick is brought
 * in to the customer's nose, a vectogram card held up. At the edger a lens is taken from the job
 * tray, centred and blocked, loaded, the lid shut and started, watched spinning under the spray,
 * lifted out dripping and checked against the light (faster when it's 급한 안경), or a junior coached
 * through it. At the frame wall a frame is taken down, wiped, shown, hung back and the row
 * straightened; stock counted with the tablet and a drawer pulled. At the fitting table (sat) the
 * temple is warmed over the frame warmer, bent with pliers, the glasses set on the customer's nose,
 * looked at, the pads nipped in, the mirror turned to them; a junior practises on a head form. And
 * the new pieces: the autorefractor (chin on the rest, the joystick, the shot, the printout), the
 * lensometer (the old glasses read), the contact-lens counter (a lens on the fingertip, the eyelid
 * shown, the customer helped, the case handed over; boxes shelved), the try-on mirror (a frame handed
 * over, put on, looked at both ways), the ultrasonic cleaner (in, buzzing, out, dried, handed back).
 *
 * Each is a round of beats by one clock (opPhase of the piece's fixed mark), shared with the piece
 * (workplaces/optician.ts) so the lens is in the hand when the hand's at the tray, the lid opens as
 * it's lifted. Every place is in the PIECE's frame (x across its front, y up from the floor, z out of
 * its front), turned into the dweller's own frame by the spot it's done at.
 */
export type OpMotion =
  | 'opExam' | 'opTrain'
  | 'opEdge' | 'opRush' | 'opTeach'
  | 'opFrames' | 'opOrder'
  | 'opFit' | 'opFitLearn'
  | 'opRefract' | 'opLensmeter' | 'opContacts' | 'opStock' | 'opTryOn' | 'opClean';
export const OP_MOTIONS = new Set<string>(['opExam', 'opTrain', 'opEdge', 'opRush', 'opTeach', 'opFrames', 'opOrder', 'opFit', 'opFitLearn', 'opRefract', 'opLensmeter', 'opContacts', 'opStock', 'opTryOn', 'opClean']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset from a fixed mark on the piece, so two edgers aren't in step. */
export const opPhase = (p: THREE.Vector3) => frac(p.x * 0.377 + p.z * 0.613);
export const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);

/** A place in a piece's frame: [x, y, z]. */
export type P = [number, number, number];
export const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Where a spot is in the piece: its marker (the feet stood, the seat's top sat) and which way it faces (0 = +z). */
export interface SpotAt {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the floor, `ahead`), in the piece's frame. */
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
  return [dx * c - dz * n, p[1] - s.y, dx * n + dz * c];
}

type Step<K extends string> = { key: K; hold: number; move: number };
/** Where a round is: the beat it's on (or easing out of, `e` of the way to the next), `p` how far through its hold, `n` which round. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  n: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number, speed = 1): Beat<K> {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0) / speed;
  const c = t / T + phase;
  const n = Math.floor(c);
  let u = frac(c) * T * speed;
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
const st = <K extends string>(key: K, hold: number, move = 0.5): Step<K> => ({ key, hold, move });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}
/** A value each beat has (given how far through it is), eased from one beat's to the next's. */
export function valueOf<K extends string>(b: Beat<K>, v: (k: K, p: number) => number): number {
  return b.e > 0 ? mix(v(b.from, 1), v(b.to, 0), b.e) : v(b.from, b.p);
}
/** In beat `k` past `p0` of it (and not easing out). */
const during = <K extends string>(b: Beat<K>, k: K, p0 = 0, p1 = 1) => b.from === k && b.e === 0 && b.p >= p0 && b.p <= p1;

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
// The 검안 unit (eyeTestChart, 2 × 1, against a wall): the customer's chair on the left facing the
// wall chart, the phoropter hung in front of their eyes from the column at the back right, the
// controller on the stand between them and the optician, who stands at the front right.

export const EX = {
  chair: { x: -0.42, z: 0.14, seat: 0.5 },
  /** The phoropter's middle (in front of the customer's eyes), its dial on the optician's side, its top. */
  phor: [-0.42, 1.24, -0.08] as P,
  dial: [-0.235, 1.22, -0.08] as P,
  top: [-0.42, 1.4, -0.08] as P,
  /** How far the phoropter goes up out of the way for training. */
  lift: 0.3,
  /** The column it hangs from, and the LCD chart on the wall. */
  column: [0.32, -0.32] as [number, number],
  chart: [-0.42, 1.6, -0.47] as P,
  /** The controller on the stand's top. */
  pad: [-0.02, 0.96, -0.12] as P,
};
export const EXAM_AT: SpotAt = { x: 0.04, y: 0, z: 0.36, yaw: -2.3 };
export const TRAIN_AT: SpotAt = { x: 0.32, y: 0, z: 0.3, yaw: -1.75 };
/**
 * A refraction (자각적 굴절검사), ~25 s round: the phoropter set to the eyes; a line on the chart
 * pointed at; the dial turned — 1번이 잘 보여요? — and again — 2번은요?; listened to; the red-green
 * chart (빨간색, 초록색 어느 쪽이 선명해요?); the result tapped into the controller.
 */
export type ExamKey = 'set' | 'chart' | 'one' | 'two' | 'listen' | 'duo' | 'note';
const EXAM: Array<Step<ExamKey>> = [st('set', 2.6, 0.6), st('chart', 3, 0.5), st('one', 2.6, 0.4), st('two', 2.6, 0.5), st('listen', 2.2, 0.5), st('duo', 3.2, 0.6), st('note', 3.4, 0.7)];
export const examBeat = (t: number, ph: number) => beatOf(EXAM, t, ph);
/** The chart's face: 0 dark, 'rows' the letters with line `row` lit, 'duo' the red-green. */
export function chartOf(b: Beat<ExamKey>): { mode: 'rows' | 'duo'; row: number } {
  if (b.from === 'duo' || (b.to === 'duo' && b.e > 0.5)) return { mode: 'duo', row: 0 };
  return { mode: 'rows', row: (b.n + (b.from === 'two' || b.from === 'listen' ? 1 : 0)) % 4 };
}
/** What the optician's asking just now (shown over the phoropter), if anything. */
export function examAsks(b: Beat<ExamKey>): 0 | 1 | 2 | 3 {
  if (during(b, 'one', 0.15, 0.95)) return 1;
  if (during(b, 'two', 0.15, 0.95)) return 2;
  if (during(b, 'duo', 0.2, 0.9)) return 3;
  return 0;
}
/** How far the dial has turned (radians), a click each flip. */
export function dialTurn(b: Beat<ExamKey>): number {
  const at = EXAM.findIndex((x) => x.key === b.from);
  let c = b.n * 2;
  for (const k of ['one', 'two'] as const) {
    const i = EXAM.findIndex((x) => x.key === k);
    if (at > i) c += 1;
    else if (at === i) c += ss(b.p, 0.05, 0.3);
  }
  return 0.6 * c;
}
/** The customer answering (their mouth). */
export const examTalk = (b: Beat<ExamKey>) => amountOf(b, 'listen') + 0.6 * (during(b, 'duo', 0.85) ? 1 : 0);
function examKey(k: ExamKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'set': {
      // Both hands on it, easing it down to the eyes.
      const dy = 0.06 * (1 - ss(p, 0.1, 0.8));
      return { l: add(EX.top, [0.08, 0.02 + dy, 0.02]), r: add(EX.dial, [0.02, 0.06 + dy, 0.0]), lean: 0.22, nod: 0.25, palms: 0.9, gl: 0.6, gr: 0.6 };
    }
    case 'chart':
      // The left hand points up at the chart's line, the right on the dial.
      return { l: sp(EXAM_AT, 0.16, 1.5 + 0.015 * wave(t, 0.8, s), 0.48), r: add(EX.dial, [0.02, 0.02, 0.0]), lean: 0.12, nod: -0.1, palms: 0.1, gl: 0.8, gr: 0.6 };
    case 'one':
    case 'two': {
      // A click of the dial: the fingers round it, turned.
      const a = ss(p, 0.05, 0.3) * 0.9;
      return { l: add(EX.top, [0.12, 0.02, 0.02]), r: add(EX.dial, [0.02, 0.03 * Math.cos(a), 0.03 * Math.sin(a)]), lean: 0.18, nod: 0.2, palms: 0.4, gl: 0.5, gr: 0.7 };
    }
    case 'listen':
      return { l: sp(EXAM_AT, 0.2, 1.1 + 0.02 * wave(t, 0.6, s), 0.36), r: add(EX.dial, [0.02, 0.02, 0.0]), lean: 0.14, nod: 0.06 + 0.06 * Math.max(0, wave(t, 0.7, s)), palms: 0.2, gl: 0.3, gr: 0.6 };
    case 'duo':
      return { l: sp(EXAM_AT, 0.16, 1.52 + 0.02 * wave(t, 0.5, s), 0.46), r: add(EX.dial, [0.02, 0.02, 0.0]), lean: 0.12, nod: -0.12, palms: 0.1, gl: 0.8, gr: 0.6 };
    default: {
      // Tapping in the result on the controller.
      const tap = 0.012 * Math.max(0, wave(t, 2.6, s));
      return { l: add(EX.pad, [0.06, 0.03, 0.06]), r: add(EX.pad, [-0.03 + 0.03 * wave(t, 0.7, s), 0.03 + tap, 0.0]), lean: 0.3, nod: 0.6, palms: 1.3, gl: 0.3, gr: 0.4 };
    }
  }
}
/**
 * 시기능 훈련, ~19 s round: the phoropter pushed up out of the way (the customer swivels round to
 * face the optician); a target on a stick brought in to the bridge of their nose and back (twice);
 * a vectogram card held up in both hands; explained; the phoropter brought back down.
 */
export type TrainKey = 'up' | 'push' | 'card' | 'talk' | 'down';
const TRAIN: Array<Step<TrainKey>> = [st('up', 1.8, 0.5), st('push', 5, 0.5), st('card', 3.6, 0.5), st('talk', 3, 0.5), st('down', 1.8, 0.5)];
export const trainBeat = (t: number, ph: number) => beatOf(TRAIN, t, ph);
/** How far up the phoropter is (0 at the eyes, 1 out of the way). */
export const phorUp = (b: Beat<TrainKey>) => valueOf(b, (k, p) => (k === 'up' ? ss(p, 0.2, 0.9) : k === 'down' ? 1 - ss(p, 0.1, 0.8) : 1));
/** The customer's eyes, turned to the optician. */
export const TRAIN_EYES: P = [-0.32, 1.24, 0.14];
/** Where the target is (how near the nose: 1 at it). */
export function targetNear(b: Beat<TrainKey>): number {
  return b.from === 'push' ? 0.5 - 0.5 * Math.cos(b.p * Math.PI * 4) : 0;
}
export const targetAt = (near: number): P => mixP([0.02, 1.22, 0.12], add(TRAIN_EYES, [0.07, -0.01, 0.0]), near * 0.92);
function trainKey(k: TrainKey, p: number, t: number, s: number): Key {
  const up: P = add(EX.top, [0.06, EX.lift, 0.02]);
  switch (k) {
    case 'up':
    case 'down': {
      const e = k === 'up' ? ss(p, 0.2, 0.9) : 1 - ss(p, 0.1, 0.8);
      return { l: mixP(add(EX.top, [0.06, 0.0, 0.02]), up, e), r: mixP(add(EX.dial, [0.0, 0.04, 0]), add(EX.dial, [0.0, 0.04 + EX.lift, 0]), e), lean: 0.2, nod: 0.1, palms: 0.8, gl: 0.6, gr: 0.6 };
    }
    case 'push': {
      const tg = targetAt(targetNear({ from: 'push', to: 'push', e: 0, p, n: 0 }));
      return { l: sp(TRAIN_AT, 0.18, 1.0, 0.25), r: add(tg, [0.1, -0.08, 0.0]), lean: 0.12, nod: 0.05, palms: 0.2, gl: 0.3, gr: 0.85 };
    }
    case 'card':
      return { l: [-0.04, 1.24, 0.24], r: [-0.04, 1.24, 0.04], lean: 0.1, nod: 0.0, palms: 0.0, gl: 0.75, gr: 0.75 };
    default:
      return { l: sp(TRAIN_AT, 0.2, 1.1 + 0.03 * wave(t, 0.6, s + 0.3), 0.32), r: sp(TRAIN_AT, -0.18, 1.12 + 0.03 * wave(t, 0.7, s), 0.3), lean: 0.08, nod: 0.02 + 0.05 * Math.max(0, wave(t, 0.5, s)), palms: 0.2, gl: 0.3, gr: 0.3 };
  }
}

// =============================================================================================
// The lens edger (렌즈 가공기, 1 × 1): a cabinet, the edger on its top at the left (the lid over the
// chamber at the front, the touch screen beside it, the job tray behind), the blocker at the right.

export const ED = {
  top: 0.86,
  body: { x: -0.18, z: -0.02, w: 0.42, h: 0.3, d: 0.4 },
  chamber: [-0.22, 1.04, 0.05] as P,
  /** The lid's hinge (at the back of the lid, on the top) and its depth. */
  hinge: [-0.22, 1.16, -0.08] as P,
  lidD: 0.26,
  screen: [-0.02, 0.99, 0.185] as P,
  tray: [-0.1, 1.17, -0.16] as P,
  stage: [0.27, 0.95, 0.08] as P,
  /** The blocker's handle: its pivot at the column's side, its length. */
  lever: [0.32, 1.2, -0.06] as P,
  leverLen: 0.13,
};
/** The tip of the blocker's handle, pulled `down` (0–1). */
export function leverTip(down: number): P {
  const a = 0.88 * down;
  return [ED.lever[0], ED.lever[1] - ED.leverLen * Math.sin(a), ED.lever[2] + ED.leverLen * Math.cos(a)];
}
export const EDGE_AT: SpotAt = { x: 0, y: 0, z: 0.5, yaw: Math.PI };
export const TEACH_AT: SpotAt = { x: 0.4, y: 0, z: 0.55, yaw: -2.75 };
/** The junior being taught, stood at the edger's left. */
export const TRAINEE = { x: -0.22, z: 0.56 };
/**
 * Edging a lens (렌즈 가공), ~25 s round: the lens from the job tray; set on the blocker, the arm
 * pulled down to stick the cup on; the lid lifted, the lens clamped in the chamber, the lid shut;
 * started on the screen; watched as it spins under the spray; lifted out dripping; held up to the
 * light and turned; fitted into the frame. A rush job goes faster.
 */
export type EdgeKey = 'take' | 'block' | 'load' | 'start' | 'watch' | 'out' | 'check' | 'fit';
const EDGE: Array<Step<EdgeKey>> = [st('take', 1.6, 0.5), st('block', 2.8, 0.5), st('load', 2.6, 0.4), st('start', 1.2, 0.4), st('watch', 6, 0.5), st('out', 2, 0.5), st('check', 2.8, 0.5), st('fit', 2.2, 0.6)];
export const edgeBeat = (t: number, ph: number, rush = false) => beatOf(EDGE, t, ph, rush ? 1.6 : 1);
/** Where the lens is: in the tray, the hand, on the blocker, in the chamber. */
export function lensWhere(b: Beat<EdgeKey>): 'tray' | 'hand' | 'stage' | 'chamber' {
  switch (b.from) {
    case 'take':
      return b.p > 0.55 || b.e > 0 ? 'hand' : 'tray';
    case 'block':
      return b.p > 0.25 && b.p < 0.85 ? 'stage' : 'hand';
    case 'load':
      return b.p > 0.55 || b.e > 0 ? 'chamber' : 'hand';
    case 'start':
    case 'watch':
      return 'chamber';
    case 'out':
      return b.p > 0.45 || b.e > 0 ? 'hand' : 'chamber';
    case 'check':
      return 'hand';
    default:
      return b.e > 0.5 ? 'tray' : 'hand';
  }
}
/** The lid's opening (0 shut, 1 up). */
export const lidOpen = (b: Beat<EdgeKey>) => valueOf(b, (k, p) => (k === 'load' ? ss(p, 0, 0.25) * (1 - ss(p, 0.75, 1)) : k === 'out' ? ss(p, 0, 0.3) * (1 - ss(p, 0.8, 1)) : 0));
/** The blocker's arm down (sticking the cup on). */
export const leverDown = (b: Beat<EdgeKey>) => (b.from === 'block' ? ss(b.p, 0.35, 0.5) * (1 - ss(b.p, 0.65, 0.8)) : 0);
/** Grinding: 0 still, 1 at full spin and spray. */
export const grinding = (b: Beat<EdgeKey>) => (b.from === 'watch' ? ss(b.p, 0, 0.08) * (1 - ss(b.p, 0.92, 1)) : 0);
/** How far through the job the screen's bar is. */
export const edgeProgress = (b: Beat<EdgeKey>) => (b.from === 'watch' ? b.p : b.from === 'out' || b.from === 'check' || b.from === 'fit' ? 1 : 0);
function edgeKey(k: EdgeKey, p: number, t: number, s: number): Key {
  const restL: P = [-0.32, ED.top + 0.04, 0.32];
  const restR: P = [0.1, ED.top + 0.04, 0.32];
  switch (k) {
    case 'take':
      return { l: restL, r: mixP(add(ED.tray, [0.04, 0.05, 0.03]), add(ED.tray, [0.04, 0.1, 0.18]), ss(p, 0.55, 1)), lean: 0.32, nod: 0.45, palms: 0.8, gl: 0.3, gr: 0.75 };
    case 'block': {
      const down = ss(p, 0.35, 0.5) * (1 - ss(p, 0.65, 0.8));
      return { l: add(ED.stage, [-0.08, 0.02, 0.02]), r: add(leverTip(down), [0.0, 0.02, 0.0]), lean: 0.3, nod: 0.55, palms: 0.9, gl: 0.6, gr: 0.75 };
    }
    case 'load': {
      const open = ss(p, 0, 0.25) * (1 - ss(p, 0.75, 1));
      const lidEdge = add(ED.hinge, [0, 0.02 + 0.2 * open, ED.lidD * (1 - 0.6 * open)]);
      return { l: lidEdge, r: p < 0.35 ? add(ED.chamber, [0.12, 0.12, 0.12]) : add(ED.chamber, [0.04, 0.04 + 0.04 * (1 - ss(p, 0.4, 0.6)), 0.03]), lean: 0.34, nod: 0.6, palms: 1.0, gl: 0.6, gr: 0.75 };
    }
    case 'start':
      return { l: restL, r: add(ED.screen, [0.0, 0.01 + 0.015 * Math.max(0, wave(t, 2.2, s)), 0.03]), lean: 0.24, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.4 };
    case 'watch':
      return { l: add(restL, [0.0, 0.0, -0.04]), r: add(restR, [0.0, 0.0, -0.04]), lean: 0.22 + 0.04 * wave(t, 0.15, s), nod: 0.45, palms: 1.4, gl: 0.3, gr: 0.3 };
    case 'out': {
      const open = ss(p, 0, 0.3) * (1 - ss(p, 0.8, 1));
      const lidEdge = add(ED.hinge, [0, 0.02 + 0.2 * open, ED.lidD * (1 - 0.6 * open)]);
      const r = p < 0.45 ? add(ED.chamber, [0.04, 0.05, 0.03]) : add(ED.chamber, [0.12, 0.14 + 0.01 * wave(t, 5, s), 0.22]);
      return { l: lidEdge, r, lean: 0.32, nod: 0.55, palms: 1.0, gl: 0.6, gr: 0.75 };
    }
    case 'check': {
      // Held up to the light, turned to see the bevel.
      const a = 0.5 * wave(t, 0.4, s);
      return { l: sp(EDGE_AT, 0.08, 1.3, 0.3), r: sp(EDGE_AT, -0.06 + 0.02 * a, 1.36, 0.3), lean: 0.0, nod: -0.15, palms: 0.0, gl: 0.6, gr: 0.75 };
    }
    default:
      return { l: sp(EDGE_AT, 0.08, 1.06, 0.32), r: sp(EDGE_AT, -0.04, 1.08 + 0.01 * wave(t, 3, s), 0.32), lean: 0.12, nod: 0.6, palms: 0.4, gl: 0.75, gr: 0.75 };
  }
}
/**
 * Teaching a junior to edge (직원 가공 교육), ~16 s round: the screen pointed at and explained; the
 * edged lens held up and shown; watching them run it, arms folded; a pat and a thumbs-up.
 */
export type TeachKey = 'point' | 'show' | 'watch' | 'praise';
const TEACH: Array<Step<TeachKey>> = [st('point', 3.6, 0.5), st('show', 3, 0.5), st('watch', 5, 0.5), st('praise', 2, 0.6)];
export const teachBeat = (t: number, ph: number) => beatOf(TEACH, t, ph);
function teachKey(k: TeachKey, _p: number, t: number, s: number): Key {
  switch (k) {
    case 'point':
      return { l: sp(TEACH_AT, 0.18, 1.02, 0.18), r: add(ED.screen, [0.04, 0.05 + 0.02 * wave(t, 0.8, s), 0.1]), lean: 0.2, nod: 0.35, palms: 0.4, gl: 0.3, gr: 0.85 };
    case 'show':
      return { l: sp(TEACH_AT, 0.1, 1.3, 0.3), r: sp(TEACH_AT, -0.04, 1.32 + 0.02 * wave(t, 0.5, s), 0.3), lean: 0.02, nod: -0.05, palms: 0.0, gl: 0.6, gr: 0.75 };
    case 'watch':
      // Arms folded.
      return { l: sp(TEACH_AT, -0.1, 1.08, 0.14), r: sp(TEACH_AT, 0.1, 1.1, 0.15), lean: 0.06, nod: 0.3 + 0.06 * Math.max(0, wave(t, 0.4, s)), palms: 0.0, gl: 0.7, gr: 0.7 };
    default:
      return { l: [TRAINEE.x + 0.1, 1.3, TRAINEE.z + 0.02], r: sp(TEACH_AT, -0.18, 1.3 + 0.03 * wave(t, 1.5, s), 0.22), lean: 0.06, nod: 0.05, palms: 0.0, gl: 0.3, gr: 0.95 };
  }
}

// =============================================================================================
// The frame wall (안경테 진열장, 2 × 1, against a wall): a lit cabinet below, rails of frames above.

export const FD = { cab: 0.88, cabFront: -0.2, face: -0.42, hang: -0.355, rows: [1.08, 1.29, 1.5, 1.71], cols: 8, x0: -0.8, dx: 0.2286 };
export const frameAt = (row: number, col: number): P => [FD.x0 + col * FD.dx, FD.rows[row], FD.hang];
/** The frame taken down (row, column). */
export const PICK = { row: 1, col: 5 };
export const FRAME_AT: SpotAt = { x: 0, y: 0, z: 0.3, yaw: Math.PI };
/**
 * Arranging the frames (안경테 진열), ~19 s round: a frame taken off its rail; wiped with the cloth;
 * turned and shown to someone at the right (picking one out for them); hung back; the bottom row
 * straightened along with a finger.
 */
export type FrameKey = 'pick' | 'wipe' | 'show' | 'hang' | 'tidy';
const FRAMES: Array<Step<FrameKey>> = [st('pick', 2, 0.5), st('wipe', 3.4, 0.5), st('show', 3.2, 0.6), st('hang', 2, 0.5), st('tidy', 4.4, 0.6)];
export const framesBeat = (t: number, ph: number) => beatOf(FRAMES, t, ph);
export const frameHeld = (b: Beat<FrameKey>) => (b.from === 'pick' && b.p > 0.5) || b.from === 'wipe' || b.from === 'show' || (b.from === 'hang' && b.p < 0.6);
/** Where along the bottom row the finger is (column), while straightening. */
export const tidyCol = (b: Beat<FrameKey>) => (b.from === 'tidy' ? b.p * (FD.cols - 1) : -9);
export const showAt: P = sp(FRAME_AT, -0.36, 1.3, 0.3);
function framesKey(k: FrameKey, p: number, t: number, s: number): Key {
  const f = frameAt(PICK.row, PICK.col);
  switch (k) {
    case 'pick':
      return { l: sp(FRAME_AT, 0.18, 1.0, 0.2), r: mixP(add(f, [0, 0.0, 0.05]), sp(FRAME_AT, -0.08, 1.2, 0.3), ss(p, 0.5, 1)), lean: 0.24, nod: 0.0, palms: 0.4, gl: 0.3, gr: 0.75 };
    case 'wipe': {
      const w = wave(t, 1.6, s);
      return { l: sp(FRAME_AT, 0.04 + 0.04 * w, 1.18, 0.28), r: sp(FRAME_AT, -0.06, 1.2, 0.3), lean: 0.06, nod: 0.45, palms: 0.3, gl: 0.8, gr: 0.75 };
    }
    case 'show':
      return { l: sp(FRAME_AT, 0.16, 1.05, 0.2), r: add(showAt, [0, 0.02 * wave(t, 0.5, s), 0]), lean: 0.04, nod: 0.05, palms: 0.1, gl: 0.3, gr: 0.75 };
    case 'hang':
      return { l: sp(FRAME_AT, 0.18, 1.0, 0.2), r: mixP(sp(FRAME_AT, -0.08, 1.2, 0.3), add(f, [0, 0.0, 0.05]), ss(p, 0, 0.55)), lean: 0.24, nod: 0.0, palms: 0.4, gl: 0.3, gr: p < 0.6 ? 0.75 : 0.3 };
    default: {
      const c = p * (FD.cols - 1);
      const at = frameAt(0, c);
      return { l: sp(FRAME_AT, 0.2, 1.0, 0.18), r: add(at, [0, 0.03, 0.06]), lean: 0.26, nod: 0.2, palms: 1.0, gl: 0.3, gr: 0.4 };
    }
  }
}
/**
 * Ordering stock (안경테 발주), ~17 s round: the tablet held, the rows counted with a finger; down to
 * the cabinet, a drawer pulled out and looked in; the order tapped in.
 */
export type OrderKey = 'count' | 'drawer' | 'type';
const ORDER: Array<Step<OrderKey>> = [st('count', 5, 0.7), st('drawer', 4.4, 0.7), st('type', 5, 0.7)];
export const orderBeat = (t: number, ph: number) => beatOf(ORDER, t, ph);
export const drawerOut = (b: Beat<OrderKey>) => valueOf(b, (k, p) => (k === 'drawer' ? ss(p, 0.1, 0.35) * (1 - ss(p, 0.8, 1)) : 0));
export const DRAWER: P = [0.48, 0.3, FD.cabFront];
export const TABLET_L: P = sp(FRAME_AT, 0.1, 1.15, 0.28);
function orderKey(k: OrderKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'count': {
      const c = 1 + p * 5;
      return { l: TABLET_L, r: add(frameAt(2, c), [0, -0.02, 0.1]), lean: 0.16, nod: -0.05, palms: 0.2, gl: 0.75, gr: 0.85 };
    }
    case 'drawer': {
      const out = ss(p, 0.1, 0.35) * (1 - ss(p, 0.8, 1));
      return { l: sp(FRAME_AT, 0.2, 0.62, 0.3), r: add(DRAWER, [0, 0.02, 0.04 + 0.26 * out]), lean: 0.3, nod: 0.6, palms: 0.6, gl: 0.75, gr: 0.75, crouch: 0.75 };
    }
    default:
      return { l: TABLET_L, r: add(TABLET_L, [-0.04 + 0.03 * wave(t, 0.8, s), 0.03 + 0.012 * Math.max(0, wave(t, 2.6, s)), 0.0]), lean: 0.06, nod: 0.6, palms: 1.2, gl: 0.75, gr: 0.4 };
  }
}

// =============================================================================================
// The fitting table (안경 피팅 테이블, 2 × 1): the optician sat at its front, the customer on a stool
// across it, the frame warmer at the optician's left, the pliers stand behind it, the mirror at the
// right turned to the customer.

export const FT = { top: 0.76, w: 1.8, d: 0.42, cz: -0.02, warmer: [-0.46, 0.76, -0.02] as P, pliers: [-0.76, 0.76, -0.12] as P, mirror: [0.66, 0.76, -0.12] as P };
export const FIT_AT: SpotAt = { x: 0, y: 0.5, z: 0.4, yaw: Math.PI };
export const CUST = { x: 0.18, z: -0.44, seat: 0.47, lean: 0.1 };
/** The customer's glasses on their face (where the hands go to set them on), and the head form's. */
export const ON_FACE: P = [0.18, 1.2, -0.3];
export const BUST: P = [0.18, FT.top, -0.12];
export const ON_BUST: P = [0.18, FT.top + 0.31, -0.03];
/**
 * Fitting glasses (안경 피팅), ~27 s round: a temple warmed over the frame warmer; bent with the
 * pliers; leant across and set on the customer's nose; looked at (어떠세요? 귀 뒤 안 아프세요?), the
 * customer turning their head; taken off, the nose pads nipped in; set on again; the mirror turned
 * to them.
 */
export type FitKey = 'warm' | 'bend' | 'on' | 'look' | 'off' | 'pads' | 'on2' | 'mirror';
const FIT: Array<Step<FitKey>> = [st('warm', 3.6, 0.5), st('bend', 3.2, 0.5), st('on', 2.2, 0.4), st('look', 3, 0.5), st('off', 1.4, 0.4), st('pads', 3, 0.5), st('on2', 2, 0.4), st('mirror', 3.4, 0.7)];
export const fitBeat = (t: number, ph: number) => beatOf(FIT, t, ph);
/** Where the glasses are: in the hands or on the face. */
export function glassesWhere(b: Beat<FitKey>): 'hand' | 'face' {
  if (b.from === 'on' || b.from === 'on2') return b.p > 0.75 || b.e > 0 ? 'face' : 'hand';
  if (b.from === 'look' || b.from === 'mirror') return 'face';
  if (b.from === 'off') return b.p < 0.35 ? 'face' : 'hand';
  return 'hand';
}
export const pliersHeld = (b: Beat<FitKey>) => b.from === 'bend' || b.from === 'pads';
/** The warmer blowing (its grille glowing). */
export const warming = (b: Beat<FitKey>) => amountOf(b, 'warm');
function fitKey(k: FitKey, p: number, t: number, s: number, onto: P): Key {
  const mat: P = [-0.04, FT.top + 0.1, 0.12];
  switch (k) {
    case 'warm': {
      // The temple turned back and forth in the hot air.
      const w = 0.03 * wave(t, 0.9, s);
      return { l: add(FT.warmer, [0.08, 0.2, 0.06]), r: add(FT.warmer, [0.2 + w, 0.21, 0.04]), lean: 0.26, nod: 0.45, palms: 0.4, gl: 0.75, gr: 0.75 };
    }
    case 'bend':
    case 'pads': {
      const twist = 0.012 * wave(t, 1.4, s);
      return k === 'bend'
        ? { l: add(mat, [-0.1, 0, 0]), r: add(mat, [0.08, 0.02 + twist, 0.0]), lean: 0.3, nod: 0.6, palms: 0.5, gl: 0.75, gr: 0.85 }
        : { l: add(mat, [-0.02, 0.06, 0.02]), r: add(mat, [0.03, 0.05 + twist, -0.03]), lean: 0.3, nod: 0.55, palms: 0.4, gl: 0.75, gr: 0.85 };
    }
    case 'on':
    case 'on2': {
      const e = ss(p, 0.0, 0.75);
      const near = mixP(add(mat, [0, 0.1, 0]), onto, e);
      return { l: add(near, [-0.08, 0.0, 0.0]), r: add(near, [0.08, 0.0, 0.0]), lean: 0.2 + 0.25 * e, nod: 0.1, palms: 0.0, gl: 0.7, gr: 0.7 };
    }
    case 'look':
      return { l: [-0.12, FT.top + 0.04, 0.16], r: [0.06 + 0.04 * wave(t, 0.6, s), FT.top + 0.1 + 0.03 * wave(t, 0.5, s), 0.08], lean: 0.12, nod: -0.05, palms: 0.2, gl: 0.3, gr: 0.3 };
    case 'off': {
      const e = ss(p, 0.3, 1);
      const near = mixP(onto, add(mat, [0, 0.1, 0]), e);
      return { l: add(near, [-0.08, 0, 0]), r: add(near, [0.08, 0, 0]), lean: 0.45 - 0.25 * e, nod: 0.1, palms: 0.0, gl: 0.7, gr: 0.7 };
    }
    default:
      // The mirror turned to them, a hand opened towards it.
      return { l: [-0.12, FT.top + 0.04, 0.16], r: add(FT.mirror, [-0.08, 0.2, 0.06]), lean: 0.2, nod: 0.0, palms: 0.3, gl: 0.3, gr: 0.5 };
  }
}
/**
 * A junior practising fitting on the head form (피팅 요령 배우기), ~20 s round: the temple warmed,
 * bent, the frame set on the form, the PD rule held to it, a note in the book.
 */
export type LearnKey = 'warm' | 'bend' | 'on' | 'rule' | 'note';
const LEARN: Array<Step<LearnKey>> = [st('warm', 3.4, 0.5), st('bend', 3.2, 0.5), st('on', 2.4, 0.5), st('rule', 3, 0.5), st('note', 3.6, 0.7)];
export const learnBeat = (t: number, ph: number) => beatOf(LEARN, t, ph);
export const learnOnBust = (b: Beat<LearnKey>) => (b.from === 'on' && (b.p > 0.75 || b.e > 0)) || b.from === 'rule' || (b.from === 'note' && b.e === 0);
function learnKey(k: LearnKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'warm':
      return fitKey('warm', p, t, s, ON_BUST);
    case 'bend':
      return fitKey('bend', p, t, s, ON_BUST);
    case 'on':
      return fitKey('on', p, t, s, ON_BUST);
    case 'rule':
      return { l: add(ON_BUST, [-0.08, 0.0, 0.04]), r: add(ON_BUST, [0.06, -0.02, 0.05]), lean: 0.4, nod: 0.35, palms: 0.0, gl: 0.75, gr: 0.75 };
    default: {
      const book: P = [-0.22, FT.top + 0.01, 0.14];
      return { l: add(book, [-0.08, 0.03, 0]), r: add(book, [0.03 + 0.025 * wave(t, 2.1, s), 0.03 + 0.006 * wave(t, 4.2, s), 0.0]), lean: 0.3, nod: 0.6, palms: 1.3, gl: 0.2, gr: 0.85 };
    }
  }
}

// =============================================================================================
// The new pieces.

/** The autorefractor (자동 굴절검사기, 1 × 2): the lift table in the middle, the customer at the back with their chin on the rest, the optician sat at the front. */
export const REF = { top: 0.74, chin: [0, 1.08, -0.2] as P, eyes: [0, 1.19, -0.2] as P, screen: [0, 1.05, 0.18] as P, joy: [0.04, 0.83, 0.25] as P, slot: [-0.14, 0.8, 0.2] as P };
export const REF_AT: SpotAt = { x: 0, y: 0.5, z: 0.64, yaw: Math.PI };
export const CUST_R = { x: 0, z: -0.52, seat: 0.5, lean: 0.38 };
/**
 * Autorefraction (자동 굴절 검사), ~16 s round: "턱을 여기 올려 주세요" — a hand towards the chin rest;
 * the joystick nudged till the eye's in the ring; the shot; over to the other eye; its shot; the
 * printout torn off and read.
 */
export type RefKey = 'chin' | 'align' | 'shot' | 'other' | 'shot2' | 'print';
const REFR: Array<Step<RefKey>> = [st('chin', 2.2, 0.5), st('align', 3, 0.3), st('shot', 1.2, 0.4), st('other', 2.4, 0.3), st('shot2', 1.2, 0.4), st('print', 2.6, 0.6)];
export const refBeat = (t: number, ph: number) => beatOf(REFR, t, ph);
/** The head's slide across (-1 the right eye, 1 the left). */
export const headSlide = (b: Beat<RefKey>) => valueOf(b, (k, p) => (k === 'other' ? -1 + 2 * ss(p, 0.1, 0.7) : k === 'shot2' ? 1 : k === 'print' ? 1 - 2 * ss(p, 0.4, 0.9) : -1));
/** The flash of a shot. */
export const refFlash = (b: Beat<RefKey>) => ((b.from === 'shot' || b.from === 'shot2') && b.p > 0.3 && b.p < 0.55 ? 1 : 0);
/** Which eyes have been measured this round (0, 1, 2). */
export const refDone = (b: Beat<RefKey>) => (b.from === 'shot' ? (b.p > 0.5 ? 1 : 0) : b.from === 'other' ? 1 : b.from === 'shot2' ? (b.p > 0.5 ? 2 : 1) : b.from === 'print' ? 2 : 0);
/** The paper out of the slot (0 in, 1 torn off and held). */
export const paperOut = (b: Beat<RefKey>) => (b.from === 'print' ? ss(b.p, 0.0, 0.5) : 0);
function refKey(k: RefKey, p: number, t: number, s: number): Key {
  const restL: P = [-0.16, REF.top + 0.03, 0.26];
  switch (k) {
    case 'chin':
      return { l: restL, r: [0.1, 1.0 + 0.02 * wave(t, 0.6, s), 0.0], lean: 0.18, nod: 0.0, palms: 0.2, gl: 0.3, gr: 0.2 };
    case 'align':
    case 'other': {
      const jx = k === 'align' ? 0.01 * wave(t, 0.9, s) : -0.015 + 0.03 * ss(p, 0.1, 0.7);
      return { l: restL, r: add(REF.joy, [jx, 0.05, 0.01 * wave(t, 0.7, s)]), lean: 0.24, nod: 0.4, palms: 0.6, gl: 0.3, gr: 0.8 };
    }
    case 'shot':
    case 'shot2':
      return { l: restL, r: add(REF.joy, [0, 0.07 - 0.01 * ss(p, 0.2, 0.35) * (1 - ss(p, 0.55, 0.7)), 0.0]), lean: 0.24, nod: 0.42, palms: 0.6, gl: 0.3, gr: 0.8 };
    default: {
      const e = ss(p, 0.0, 0.5);
      return { l: mixP(restL, [-0.06, 1.0, 0.34], e), r: mixP(add(REF.slot, [0.02, 0.02, 0.04]), [0.04, 1.0, 0.34], e), lean: 0.2 - 0.1 * e, nod: 0.5, palms: 0.2, gl: 0.6, gr: 0.75 };
    }
  }
}

/** The lensometer (렌즈미터, 1 × 1): on a cabinet, the stage at its front, the basket of glasses at the right. */
export const LM = { top: 0.9, stage: [-0.1, 1.0, 0.04] as P, screen: [-0.1, 1.33, -0.1] as P, lever: [-0.1, 1.12, -0.03] as P, basket: [0.24, 0.9, 0.02] as P, btn: [0.04, 0.99, 0.08] as P };
export const LM_AT: SpotAt = { x: 0, y: 0, z: 0.46, yaw: Math.PI };
/**
 * Reading a pair of glasses (렌즈 도수 측정), ~15 s round: a pair from the basket; laid on the stage,
 * lens down; the holder lowered; the screen read; the mark pressed; slid over to the other lens and
 * read; back in the basket.
 */
export type LmKey = 'take' | 'set' | 'clamp' | 'read' | 'mark' | 'slide' | 'read2' | 'back';
const LMS: Array<Step<LmKey>> = [st('take', 1.6, 0.5), st('set', 1.6, 0.3), st('clamp', 1, 0.3), st('read', 2.2, 0.3), st('mark', 1, 0.3), st('slide', 1.6, 0.3), st('read2', 2, 0.4), st('back', 1.4, 0.5)];
export const lmBeat = (t: number, ph: number) => beatOf(LMS, t, ph);
export function lmGlasses(b: Beat<LmKey>): { where: 'basket' | 'hand' | 'stage'; slide: number } {
  const slide = b.from === 'slide' ? ss(b.p, 0.1, 0.8) : b.from === 'read2' || b.from === 'back' ? 1 : 0;
  if (b.from === 'take') return { where: b.p > 0.5 ? 'hand' : 'basket', slide };
  if (b.from === 'set') return { where: b.p > 0.6 ? 'stage' : 'hand', slide };
  if (b.from === 'back') return { where: b.p < 0.3 ? 'stage' : b.p < 0.85 ? 'hand' : 'basket', slide };
  return { where: 'stage', slide };
}
export const lmHolder = (b: Beat<LmKey>) => valueOf(b, (k, p) => (k === 'clamp' ? ss(p, 0.1, 0.8) : k === 'back' ? 1 - ss(p, 0, 0.3) : k === 'take' || k === 'set' ? 0 : 1));
export const lmReading = (b: Beat<LmKey>): 0 | 1 | 2 => (b.from === 'read' || b.from === 'mark' ? 1 : b.from === 'read2' || b.from === 'back' ? 2 : 0);
function lmKey(k: LmKey, p: number, t: number, s: number): Key {
  const onStage = (slide: number): P => add(LM.stage, [0.07 - 0.12 * slide, 0.03, 0.03]);
  switch (k) {
    case 'take':
      return { l: [-0.26, LM.top + 0.03, 0.2], r: mixP(add(LM.basket, [0, 0.08, 0]), sp(LM_AT, -0.06, 1.12, 0.3), ss(p, 0.5, 1)), lean: 0.24, nod: 0.45, palms: 0.6, gl: 0.3, gr: 0.75 };
    case 'set':
      return { l: add(onStage(0), [-0.12, 0.0, 0.02]), r: mixP(sp(LM_AT, -0.06, 1.12, 0.3), onStage(0), ss(p, 0.0, 0.6)), lean: 0.3, nod: 0.55, palms: 1.0, gl: 0.6, gr: 0.75 };
    case 'clamp':
      return { l: add(onStage(0), [-0.12, 0.0, 0.02]), r: add(LM.lever, [0.05, 0.04 - 0.05 * ss(p, 0.1, 0.8), 0.04]), lean: 0.3, nod: 0.5, palms: 1.0, gl: 0.6, gr: 0.7 };
    case 'read':
    case 'read2': {
      const sl = k === 'read' ? 0 : 1;
      return { l: add(onStage(sl), [-0.12, 0.0, 0.02]), r: add(onStage(sl), [0.12, 0.0, 0.02]), lean: 0.2, nod: -0.05 + 0.03 * wave(t, 0.3, s), palms: 1.0, gl: 0.6, gr: 0.6 };
    }
    case 'mark':
      return { l: add(onStage(0), [-0.12, 0.0, 0.02]), r: add(LM.btn, [0, 0.02 - 0.012 * ss(p, 0.3, 0.5) * (1 - ss(p, 0.6, 0.8)), 0.02]), lean: 0.26, nod: 0.45, palms: 1.3, gl: 0.6, gr: 0.4 };
    case 'slide': {
      const sl = ss(p, 0.1, 0.8);
      return { l: add(onStage(sl), [-0.12, 0.0, 0.02]), r: add(onStage(sl), [0.12, 0.0, 0.02]), lean: 0.26, nod: 0.5, palms: 1.0, gl: 0.6, gr: 0.6 };
    }
    default:
      return { l: [-0.26, LM.top + 0.03, 0.2], r: mixP(onStage(1), add(LM.basket, [0, 0.08, 0]), ss(p, 0.25, 0.85)), lean: 0.26, nod: 0.45, palms: 0.6, gl: 0.3, gr: 0.75 };
  }
}

/** The contact-lens counter (콘택트렌즈 카운터, 2 × 1, against a wall): shelves of boxes over a counter, the mirror on it at the left. */
export const CL = { top: 0.9, front: 0.06, shelf: -0.3, rows: [1.2, 1.42, 1.64], mirror: [-0.48, 0.9, -0.1] as P, pump: [-0.08, 0.9, -0.06] as P, case_: [-0.18, 0.9, 0.0] as P, carton: [0.5, 0.9, -0.08] as P };
export const CL_AT: SpotAt = { x: 0.22, y: 0, z: 0.5, yaw: -2.05 };
export const STOCK_AT: SpotAt = { x: 0.12, y: 0, z: 0.42, yaw: Math.PI };
/** The customer stood at the mirror (facing it), and their face. */
export const CL_CUST = { x: -0.46, z: 0.46 };
export const CL_FACE: P = [-0.46, 1.5, 0.35];
/**
 * Helping someone with their first contacts (콘택트렌즈 착용 도와주기), ~20 s round: hands sanitised
 * at the pump; a lens out of the case on the tip of a finger, held up to show which way is right;
 * shown on the optician's own eye, the lower lid drawn down; the customer tries at the mirror, the
 * optician's hands guiding in the air; they blink and look round; the lens case handed over.
 */
export type ClKey = 'wash' | 'tip' | 'demo' | 'help' | 'blink' | 'case';
const CLS: Array<Step<ClKey>> = [st('wash', 2.2, 0.5), st('tip', 3, 0.5), st('demo', 3, 0.5), st('help', 4, 0.5), st('blink', 2.6, 0.5), st('case', 2.4, 0.6)];
export const clBeat = (t: number, ph: number) => beatOf(CLS, t, ph);
export const lensOnTip = (b: Beat<ClKey>) => b.from === 'tip' || b.from === 'demo';
function clKey(k: ClKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'wash': {
      const press = p < 0.3;
      const rub = 0.03 * wave(t, 2.4, s);
      return press
        ? { l: sp(CL_AT, 0.18, 1.0, 0.25), r: add(CL.pump, [0, 0.16 - 0.03 * ss(p, 0.05, 0.2), 0.02]), lean: 0.28, nod: 0.45, palms: 1.3, gl: 0.3, gr: 0.3 }
        : { l: sp(CL_AT, 0.04 + rub, 1.05, 0.28), r: sp(CL_AT, -0.04 - rub, 1.06, 0.28), lean: 0.1, nod: 0.4, palms: 0.0, gl: 0.3, gr: 0.3 };
    }
    case 'tip':
      return { l: sp(CL_AT, 0.16, 1.05, 0.22), r: sp(CL_AT, 0.02, 1.36 + 0.01 * wave(t, 0.5, s), 0.36), lean: 0.06, nod: -0.05, palms: 0.0, gl: 0.3, gr: 0.6 };
    case 'demo':
      // The lower lid drawn down with the left hand, the lens brought to the eye with the right.
      return { l: sp(CL_AT, 0.05, 1.44, 0.1), r: sp(CL_AT, -0.02, 1.5, 0.14 + 0.02 * wave(t, 0.4, s)), lean: 0.0, nod: -0.15, palms: 0.0, gl: 0.3, gr: 0.6 };
    case 'help':
      return { l: sp(CL_AT, 0.18, 1.2, 0.3), r: add(CL_FACE, [0.18, -0.08 + 0.02 * wave(t, 0.6, s), 0.06]), lean: 0.14, nod: -0.05, palms: 0.2, gl: 0.3, gr: 0.3 };
    case 'blink':
      return { l: sp(CL_AT, 0.12, 1.12, 0.26), r: sp(CL_AT, -0.12, 1.14, 0.26), lean: 0.06, nod: 0.0 + 0.05 * Math.max(0, wave(t, 0.6, s)), palms: 0.0, gl: 0.3, gr: 0.3 };
    default:
      return { l: sp(CL_AT, 0.16, 1.02, 0.2), r: mixP(add(CL.case_, [0, 0.05, 0]), add(CL_FACE, [0.14, -0.42, 0.12]), ss(p, 0.2, 0.7)), lean: 0.12, nod: 0.2, palms: 0.4, gl: 0.3, gr: 0.75 };
  }
}
/** The slots boxes go into, one per shelving round. */
export const SLOTS: P[] = [[-0.59, CL.rows[1], CL.shelf], [0.41, CL.rows[0], CL.shelf], [0.77, CL.rows[2], CL.shelf]];
/**
 * Shelving lens boxes (렌즈 재고 정리), ~16 s round: a box from the carton, into its slot (three
 * times), then the rows looked along and checked.
 */
export type StockKey = 'grab0' | 'slot0' | 'grab1' | 'slot1' | 'grab2' | 'slot2' | 'check';
const STOCK: Array<Step<StockKey>> = [st('grab0', 1.2, 0.5), st('slot0', 1.2, 0.5), st('grab1', 1.2, 0.5), st('slot1', 1.2, 0.5), st('grab2', 1.2, 0.5), st('slot2', 1.2, 0.5), st('check', 3.2, 0.7)];
export const stockBeat = (t: number, ph: number) => beatOf(STOCK, t, ph);
/** The box in the hand (which one) or none. */
export function boxHeld(b: Beat<StockKey>): number {
  const m = /^(grab|slot)(\d)$/.exec(b.from);
  if (!m) return -1;
  if (m[1] === 'grab') return b.p > 0.5 || b.e > 0 ? +m[2] : -1;
  return b.p < 0.6 ? +m[2] : -1;
}
/** How many boxes have gone onto the shelves this round. */
export const boxesIn = (b: Beat<StockKey>) => (b.from === 'check' ? 3 : (() => {
  const m = /^(grab|slot)(\d)$/.exec(b.from);
  return m ? +m[2] + (m[1] === 'slot' && b.p >= 0.6 ? 1 : 0) : 0;
})());
function stockKey(k: StockKey, p: number, t: number, s: number): Key {
  const m = /^(grab|slot)(\d)$/.exec(k);
  if (m) {
    const i = +m[2];
    if (m[1] === 'grab') return { l: sp(STOCK_AT, 0.2, 1.0, 0.22), r: mixP(add(CL.carton, [0, 0.1, 0.02]), add(CL.carton, [-0.1, 0.25, 0.15]), ss(p, 0.5, 1)), lean: 0.28, nod: 0.45, palms: 0.6, gl: 0.3, gr: 0.75 };
    return { l: sp(STOCK_AT, 0.22, 1.05, 0.22), r: mixP(add(SLOTS[i], [0, 0.03, 0.2]), add(SLOTS[i], [0, 0.03, 0.05]), ss(p, 0.0, 0.5)), lean: 0.3, nod: -0.1, palms: 0.4, gl: 0.3, gr: 0.75 };
  }
  return { l: sp(STOCK_AT, 0.18, 1.04, 0.22), r: [-0.6 + 1.2 * p, CL.rows[1] + 0.02 * wave(t, 0.7, s), CL.shelf + 0.16], lean: 0.2, nod: -0.05, palms: 0.4, gl: 0.3, gr: 0.85 };
}

/** The try-on mirror (안경 써 보는 거울, 1 × 1, against a wall): the mirror over a console of frames, the customer stood before it. */
export const TRY = { top: 0.95, tray: [0.14, 0.95, -0.22] as P };
export const TRY_AT: SpotAt = { x: 0.42, y: 0, z: 0.42, yaw: -2.25 };
export const TRY_CUST = { x: -0.16, z: 0.22 };
export const TRY_FACE: P = [-0.16, 1.5, 0.11];
/**
 * A frame tried on (안경테 써 보게 하기), ~18 s round: a frame from the tray; held out; the customer
 * puts it on; looks in the mirror, turning this way and that (잘 어울리세요); a word, pointing at the
 * mirror; taken back off and handed back; laid back on the tray.
 */
export type TryKey = 'pick' | 'offer' | 'puton' | 'look' | 'point' | 'off' | 'back';
const TRYS: Array<Step<TryKey>> = [st('pick', 1.6, 0.5), st('offer', 1.6, 0.3), st('puton', 1.6, 0.4), st('look', 3.6, 0.5), st('point', 2.4, 0.5), st('off', 1.8, 0.4), st('back', 1.4, 0.6)];
export const tryBeat = (t: number, ph: number) => beatOf(TRYS, t, ph);
export function tryFrame(b: Beat<TryKey>): 'tray' | 'mine' | 'theirs' | 'face' {
  switch (b.from) {
    case 'pick':
      return b.p > 0.5 ? 'mine' : 'tray';
    case 'offer':
      return 'mine';
    case 'puton':
      return b.p < 0.25 ? 'mine' : b.p < 0.85 ? 'theirs' : 'face';
    case 'look':
    case 'point':
      return 'face';
    case 'off':
      return b.p < 0.3 ? 'face' : b.p < 0.65 ? 'theirs' : 'mine';
    default:
      return b.p < 0.7 ? 'mine' : 'tray';
  }
}
export const OFFER: P = [0.04, 1.3, 0.2];
function tryKey(k: TryKey, p: number, t: number, s: number): Key {
  const rest: P = sp(TRY_AT, 0.16, 1.0, 0.2);
  switch (k) {
    case 'pick':
      return { l: rest, r: mixP(add(TRY.tray, [0, 0.05, 0.02]), add(TRY.tray, [0, 0.2, 0.2]), ss(p, 0.5, 1)), lean: 0.3, nod: 0.5, palms: 0.6, gl: 0.3, gr: 0.75 };
    case 'offer':
      return { l: rest, r: mixP(add(TRY.tray, [0, 0.2, 0.2]), OFFER, ss(p, 0, 0.7)), lean: 0.1, nod: 0.05, palms: 0.1, gl: 0.3, gr: 0.75 };
    case 'puton':
      return { l: rest, r: mixP(OFFER, sp(TRY_AT, -0.1, 1.05, 0.25), ss(p, 0.2, 0.6)), lean: 0.06, nod: 0.0, palms: 0.2, gl: 0.3, gr: 0.3 };
    case 'look':
      return { l: sp(TRY_AT, 0.14, 1.06, 0.26), r: sp(TRY_AT, -0.12, 1.12 + 0.03 * wave(t, 0.6, s), 0.3), lean: 0.04, nod: 0.0, palms: 0.2, gl: 0.3, gr: 0.3 };
    case 'point':
      return { l: rest, r: [0.1, 1.42 + 0.02 * wave(t, 0.5, s), -0.1], lean: 0.12, nod: -0.08, palms: 0.1, gl: 0.3, gr: 0.85 };
    case 'off':
      return { l: rest, r: mixP(sp(TRY_AT, -0.1, 1.05, 0.25), OFFER, ss(p, 0.3, 0.7)), lean: 0.08, nod: 0.05, palms: 0.1, gl: 0.3, gr: p > 0.6 ? 0.75 : 0.3 };
    default:
      return { l: rest, r: mixP(OFFER, add(TRY.tray, [0, 0.05, 0.02]), ss(p, 0, 0.7)), lean: 0.28, nod: 0.5, palms: 0.6, gl: 0.3, gr: 0.75 };
  }
}

/** The ultrasonic cleaner (초음파 세척기, 1 × 1): a small counter, the bath at the left, the button, the cloth. */
export const UC = { top: 0.88, bath: [-0.12, 0.88, -0.06] as P, hingeZ: -0.17, btn: [0.07, 0.96, 0.06] as P, cloth: [0.22, 0.88, 0.1] as P };
export const UC_AT: SpotAt = { x: 0, y: 0, z: 0.5, yaw: Math.PI };
/**
 * Cleaning someone's glasses (안경 세척), ~15 s round: the lid up; the glasses lowered in the basket;
 * the button pressed, the lid shut; buzzing (the bath shivers, bubbles); lifted out dripping; dried
 * with the cloth; handed back to someone at the right.
 */
export type CleanKey = 'open' | 'dip' | 'start' | 'wait' | 'lift' | 'dry' | 'hand';
const CLEAN: Array<Step<CleanKey>> = [st('open', 1, 0.3), st('dip', 1.6, 0.3), st('start', 1, 0.4), st('wait', 4, 0.4), st('lift', 1.8, 0.4), st('dry', 2.8, 0.5), st('hand', 2, 0.6)];
export const cleanBeat = (t: number, ph: number) => beatOf(CLEAN, t, ph);
export const ucLid = (b: Beat<CleanKey>) => valueOf(b, (k, p) => (k === 'open' ? ss(p, 0.1, 0.9) : k === 'dip' ? 1 : k === 'start' ? 1 - ss(p, 0.3, 0.9) : k === 'lift' ? ss(p, 0, 0.3) : k === 'dry' || k === 'hand' ? 0 : 0));
export const ucBuzz = (b: Beat<CleanKey>) => (b.from === 'wait' ? ss(b.p, 0, 0.05) * (1 - ss(b.p, 0.95, 1)) : 0);
export function ucGlasses(b: Beat<CleanKey>): 'hand' | 'bath' | 'counter' {
  if (b.from === 'dip') return b.p > 0.6 ? 'bath' : 'hand';
  if (b.from === 'start' || b.from === 'wait') return 'bath';
  if (b.from === 'lift') return b.p < 0.4 ? 'bath' : 'hand';
  if (b.from === 'open') return 'counter';
  return 'hand';
}
export const ucDrip = (b: Beat<CleanKey>) => b.from === 'lift' && b.p > 0.4;
function cleanKey(k: CleanKey, p: number, t: number, s: number): Key {
  const B = UC.bath;
  const restL: P = [-0.3, UC.top + 0.04, 0.3];
  switch (k) {
    case 'open':
      return { l: add(B, [0, 0.14 + 0.16 * ss(p, 0.1, 0.9), UC.hingeZ + 0.06 + 0.16 * (1 - ss(p, 0.1, 0.9))]), r: [0.12, UC.top + 0.03, 0.22], lean: 0.24, nod: 0.5, palms: 1.0, gl: 0.5, gr: 0.6 };
    case 'dip':
      return { l: restL, r: mixP(add(B, [0.04, 0.3, 0.1]), add(B, [0.0, 0.12, 0.02]), ss(p, 0.1, 0.6)), lean: 0.3, nod: 0.6, palms: 0.6, gl: 0.3, gr: 0.75 };
    case 'start':
      return { l: add(B, [0, 0.14 + 0.16 * (1 - ss(p, 0.3, 0.9)), UC.hingeZ + 0.06 + 0.16 * ss(p, 0.3, 0.9)]), r: add(UC.btn, [0, 0.015 - 0.01 * ss(p, 0.1, 0.3), 0.02]), lean: 0.26, nod: 0.5, palms: 1.2, gl: 0.5, gr: 0.4 };
    case 'wait':
      return { l: restL, r: [0.14, UC.top + 0.04, 0.3], lean: 0.18, nod: 0.4, palms: 1.4, gl: 0.3, gr: 0.3 };
    case 'lift':
      return { l: add(B, [0, 0.3, UC.hingeZ + 0.06]), r: mixP(add(B, [0.0, 0.12, 0.02]), add(B, [0.04, 0.3, 0.12]), ss(p, 0.4, 1)), lean: 0.28, nod: 0.6, palms: 0.6, gl: 0.5, gr: 0.75 };
    case 'dry': {
      const w = wave(t, 1.7, s);
      return { l: sp(UC_AT, 0.04 + 0.04 * w, 1.1, 0.3), r: sp(UC_AT, -0.06, 1.12, 0.32), lean: 0.1, nod: 0.5, palms: 0.3, gl: 0.8, gr: 0.75 };
    }
    default:
      return { l: sp(UC_AT, 0.16, 1.0, 0.2), r: sp(UC_AT, -0.38, 1.1 + 0.02 * wave(t, 0.5, s), 0.36), lean: 0.08, nod: 0.05, palms: 0.1, gl: 0.3, gr: 0.75 };
  }
}

// =============================================================================================

/** The hands and where they're done from for a motion at `t` (`ph`: the piece's clock offset). */
export function opKeyOf(m: OpMotion, t: number, ph: number): { key: Key; at: SpotAt } {
  const s = ph * 7.3;
  switch (m) {
    case 'opExam':
      return { key: blended(examBeat(t, ph), (k, p) => examKey(k, p, t, s)), at: EXAM_AT };
    case 'opTrain':
      return { key: blended(trainBeat(t, ph), (k, p) => trainKey(k, p, t, s)), at: TRAIN_AT };
    case 'opEdge':
      return { key: blended(edgeBeat(t, ph), (k, p) => edgeKey(k, p, t, s)), at: EDGE_AT };
    case 'opRush':
      return { key: blended(edgeBeat(t, ph, true), (k, p) => edgeKey(k, p, t, s)), at: EDGE_AT };
    case 'opTeach':
      return { key: blended(teachBeat(t, ph), (k, p) => teachKey(k, p, t, s)), at: TEACH_AT };
    case 'opFrames':
      return { key: blended(framesBeat(t, ph), (k, p) => framesKey(k, p, t, s)), at: FRAME_AT };
    case 'opOrder':
      return { key: blended(orderBeat(t, ph), (k, p) => orderKey(k, p, t, s)), at: FRAME_AT };
    case 'opFit':
      return { key: blended(fitBeat(t, ph), (k, p) => fitKey(k, p, t, s, ON_FACE)), at: FIT_AT };
    case 'opFitLearn':
      return { key: blended(learnBeat(t, ph), (k, p) => learnKey(k, p, t, s)), at: FIT_AT };
    case 'opRefract':
      return { key: blended(refBeat(t, ph), (k, p) => refKey(k, p, t, s)), at: REF_AT };
    case 'opLensmeter':
      return { key: blended(lmBeat(t, ph), (k, p) => lmKey(k, p, t, s)), at: LM_AT };
    case 'opContacts':
      return { key: blended(clBeat(t, ph), (k, p) => clKey(k, p, t, s)), at: CL_AT };
    case 'opStock':
      return { key: blended(stockBeat(t, ph), (k, p) => stockKey(k, p, t, s)), at: STOCK_AT };
    case 'opTryOn':
      return { key: blended(tryBeat(t, ph), (k, p) => tryKey(k, p, t, s)), at: TRY_AT };
    default:
      return { key: blended(cleanBeat(t, ph), (k, p) => cleanKey(k, p, t, s)), at: UC_AT };
  }
}

export function opDoing(m: OpMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = opKeyOf(m, t, opPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
