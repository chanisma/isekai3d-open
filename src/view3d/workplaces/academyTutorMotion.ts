import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 입시학원 (2026-10-27, the workplace pipeline, at the user's request): the 강사's day done the
 * way it's done in a Korean cram school. At the 교탁 the lecture goes round the board — a line of
 * 수능 수학 written up facing it, a star drawn beside it, turned to the class to explain, half turned
 * back pointing at the line, a finger up (여기 중요해요) — faster and in red before an exam; a junior
 * 강사 coached from beside the board, the clipboard noted and the board pointed at. At the 질문 책상
 * (sat) a pupil's answer is read through, circled in red, the problem pointed at, explained turned
 * to them and the step written in the margin while they nod; a stack of word tests marked O/X; a
 * 문제지 typed up and proofread. At the 인강 camera the 강사 talks into the lens through the
 * teleprompter, counts off on the fingers, turns to point at the 전자칠판 behind and waves. And the
 * new pieces: a 자습실 carrel patrolled (a dozing pupil tapped awake, a problem whispered through),
 * the 성적 게시판 (a sheet pinned, the D-day card flipped), the 상담 table (the 배치표 shown to the
 * parents, their worries listened to, a leaflet handed across), the copier printing 모의고사 (paper
 * loaded, the stack gathered, knocked even and stapled).
 *
 * Each is a round of beats by one clock (atPhase of the piece's fixed mark), shared with the piece
 * (workplaces/academyTutor.ts) so the marker's on the board where the line's got to, the sheet's in
 * the hand when the hand's at the stack. Every place is in the PIECE's frame (x across its front, y
 * up from the floor, z out of its front), turned into the dweller's own frame by the spot it's done at —
 * which turns, at the 교탁 and the camera, by the same clock (the piece turns its spot's marker).
 */
export type AtMotion = 'atLecture' | 'atCram' | 'atCoach' | 'atExplain' | 'atMark' | 'atHandout' | 'atRecord' | 'atSupervise' | 'atPost' | 'atConsult' | 'atPrint';
export const AT_MOTIONS = new Set<string>(['atLecture', 'atCram', 'atCoach', 'atExplain', 'atMark', 'atHandout', 'atRecord', 'atSupervise', 'atPost', 'atConsult', 'atPrint']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset from a fixed mark on the piece, so two desks aren't in step. */
export const atPhase = (p: THREE.Vector3) => frac(p.x * 0.411 + p.z * 0.587);
export const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
/** From one heading to another the short way round. */
function turnTo(a: number, b: number, e: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * e;
}

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
/** A hand reaching from the shoulder toward a far point, as far as an arm goes. */
function toward(from: P, to: P, reach = 0.58): P {
  const d: P = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const L = Math.hypot(d[0], d[1], d[2]) || 1;
  const k = Math.min(reach, L) / L;
  return [from[0] + d[0] * k, from[1] + d[1] * k, from[2] + d[2] * k];
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
/** In beat `k` between `p0` and `p1` of it (and not easing out). */
export const during = <K extends string>(b: Beat<K>, k: K, p0 = 0, p1 = 1) => b.from === k && b.e === 0 && b.p >= p0 && b.p <= p1;
/** A heading each beat has, turned from one beat's to the next's. */
function yawOf<K extends string>(b: Beat<K>, yaws: Record<K, number>): number {
  return b.e > 0 ? turnTo(yaws[b.from], yaws[b.to], b.e) : yaws[b.from];
}

/** Hands and bend, the hands in the piece's frame; `book` a book (a clipboard, the 교재) held in the left hand. */
export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
  tap?: boolean;
  book?: boolean;
}
function mixKey(a: Key, b: Key, e: number): Key {
  return {
    l: mixP(a.l, b.l, e),
    r: mixP(a.r, b.r, e),
    lean: mix(a.lean, b.lean, e),
    nod: mix(a.nod, b.nod, e),
    palms: mix(a.palms, b.palms, e),
    gl: mix(a.gl, b.gl, e),
    gr: mix(a.gr, b.gr, e),
    crouch: mix(a.crouch ?? 0, b.crouch ?? 0, e),
    tap: e < 0.5 ? a.tap : b.tap,
    book: e < 0.5 ? a.book : b.book,
  };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(beat.from, beat.e > 0 ? 1 : beat.p);
  return beat.e > 0 ? mixKey(a, pose(beat.to, 0), beat.e) : a;
}

// =============================================================================================
// The 교탁 (lecturePodium, 1 × 1, against the front wall): a stretch of whiteboard on the wall at
// the back, the lectern at the front facing the class, the 강사 stood between them.

export const PD = {
  /** The board's writing face, and the lines written on it: from x0 along `len`, row by row down from y0. */
  boardZ: -0.44,
  x0: -0.38,
  len: 0.66,
  y0: 1.67,
  gap: 0.115,
  rows: 4,
  /** The lectern: its top's middle and height (sloped to the 강사), the 교재 on it. */
  lectern: { z: 0.21, top: 1.06, w: 0.6, d: 0.34 },
};
export const LECT_AT: SpotAt = { x: -0.14, y: 0, z: -0.17, yaw: 0 };
export const COACH_AT: SpotAt = { x: 0.37, y: 0, z: -0.04, yaw: -2.0 };
/** Where the coached junior stands at the board (facing it), and where a line's at. */
export const JUNIOR = { x: -0.16, z: -0.2 };
export const linePt = (row: number, along: number): P => [PD.x0 + PD.len * along, PD.y0 - PD.gap * row, PD.boardZ + 0.03];

/**
 * A lecture (강의), ~24 s round (a third faster cramming before an exam): a line of the problem
 * written up facing the board; a star drawn at its end; turned round to explain it to the class;
 * half turned back, the arm out at the line; a finger up to the class — 여기 중요해요 — and round to
 * the board for the next line (four lines, then the board's wiped for the next problem).
 */
export type LectKey = 'write' | 'star' | 'explain' | 'point' | 'ask';
const LECT: Array<Step<LectKey>> = [st('write', 6.5, 1.0), st('star', 1.6, 1.0), st('explain', 4.5, 0.7), st('point', 3.4, 0.8), st('ask', 3.0, 1.2)];
const LECT_YAW: Record<LectKey, number> = { write: Math.PI, star: Math.PI, explain: 0, point: -2.2, ask: 0 };
export const lectBeat = (t: number, ph: number, cram = false) => beatOf(LECT, t, ph, cram ? 1.35 : 1);
export const lectYaw = (b: Beat<LectKey>) => yawOf(b, LECT_YAW);
/** How far the board's been written: rows before `row` whole, `row` as far as `along`, its star. */
export function lectBoard(b: Beat<LectKey>): { row: number; along: number; star: boolean } {
  const row = ((b.n % PD.rows) + PD.rows) % PD.rows;
  if (b.from === 'write') return { row, along: b.e > 0 ? 1 : b.p, star: false };
  if (b.from === 'star') return { row, along: 1, star: b.e > 0 || b.p > 0.45 };
  return { row, along: 1, star: true };
}
/** What's said to the class just now (0 nothing, 1 the question, 2 the warning). */
export const lectSays = (b: Beat<LectKey>) => (during(b, 'ask', 0.1, 0.95) ? 1 : during(b, 'point', 0.2, 0.9) ? 2 : 0);
function lectKey(b: Beat<LectKey>, k: LectKey, p: number, t: number, s: number, at: SpotAt): Key {
  const B = lectBoard(b);
  const book = sp(at, 0.15, 1.0, 0.2);
  switch (k) {
    case 'write': {
      // Easing in from the last beat, the hand goes to the start of the next round's line.
      const along = b.from === 'write' && b.e === 0 ? p : b.from === 'write' ? 1 : 0;
      const row = b.from === 'write' ? B.row : (B.row + 1) % PD.rows;
      return { l: book, r: add(linePt(row, along), [0, 0.012 * wave(t, 2.8, s), 0]), lean: 0.02, nod: -0.18 + 0.03 * row, palms: 0.5, gl: 0.55, gr: 0.85, book: true };
    }
    case 'star': {
      const a = t * 9;
      return { l: book, r: add(linePt(B.row, 1), [0.05 + 0.025 * Math.cos(a), 0.025 * Math.sin(a), 0]), lean: 0.02, nod: -0.12 + 0.03 * B.row, palms: 0.5, gl: 0.55, gr: 0.85, book: true };
    }
    case 'explain':
      return { l: book, r: sp(at, -0.26, 1.16 + 0.04 * wave(t, 0.7, s), 0.34), lean: 0.03, nod: -0.04 + 0.04 * Math.max(0, wave(t, 0.9, s)), palms: -0.6, gl: 0.55, gr: 0.35, book: true };
    case 'point':
      return { l: book, r: toward(sp(at, -0.18, 1.4, 0), linePt(B.row, 0.45)), lean: -0.02, nod: -0.1, palms: 0.1, gl: 0.55, gr: 0.6, book: true };
    default:
      return { l: book, r: sp(at, -0.17, 1.52 + 0.02 * wave(t, 1.2, s), 0.24), lean: -0.02, nod: -0.06, palms: 0.2, gl: 0.55, gr: 0.6, book: true };
  }
}

/**
 * Coaching a junior 강사 (강사 수업 코칭), ~18 s round: stood at the board's side with a clipboard,
 * watching them write; a note made; the line pointed at (글씨는 크게); turned to them talking it
 * through; a nod as they go on.
 */
export type CoachKey = 'watch' | 'note' | 'point' | 'talk' | 'nod';
const COACH: Array<Step<CoachKey>> = [st('watch', 4, 0.6), st('note', 3, 0.5), st('point', 3, 0.6), st('talk', 4, 0.6), st('nod', 2.5, 0.8)];
export const coachBeat = (t: number, ph: number) => beatOf(COACH, t, ph);
/** The junior's line on the board (written while watched), and whether they've turned to listen. */
export function coachBoard(b: Beat<CoachKey>): { row: number; along: number; listening: boolean } {
  const row = ((b.n % PD.rows) + PD.rows) % PD.rows;
  const listening = b.from === 'point' || b.from === 'talk';
  if (b.from === 'watch') return { row, along: b.e > 0 ? 0.6 : 0.6 * b.p, listening };
  if (b.from === 'note') return { row, along: b.e > 0 ? 1 : 0.6 + 0.4 * b.p, listening };
  return { row, along: 1, listening };
}
export const coachSays = (b: Beat<CoachKey>) => (during(b, 'talk', 0.1, 0.9) ? 1 : 0);
function coachKey(b: Beat<CoachKey>, k: CoachKey, p: number, t: number, s: number): Key {
  const A = COACH_AT;
  const clip = sp(A, 0.1, 1.05, 0.22);
  switch (k) {
    case 'watch':
      return { l: clip, r: sp(A, -0.06, 1.06, 0.22), lean: 0.0, nod: 0.02, palms: 0.6, gl: 0.6, gr: 0.6, book: true };
    case 'note':
      return { l: clip, r: add(clip, [0.02 * wave(t, 2.4, s), 0.03, 0.02 * Math.sin(p * 9)]), lean: 0.06, nod: 0.38, palms: 0.9, gl: 0.6, gr: 0.85, book: true };
    case 'point':
      return { l: clip, r: toward(sp(A, -0.18, 1.4, 0), linePt(coachBoard(b).row, 0.5)), lean: 0.0, nod: -0.08, palms: 0.1, gl: 0.6, gr: 0.6, book: true };
    case 'talk':
      return { l: clip, r: sp(A, -0.2, 1.14 + 0.04 * wave(t, 0.8, s), 0.34), lean: 0.04, nod: 0.0, palms: -0.7, gl: 0.6, gr: 0.25, book: true };
    default:
      return { l: clip, r: sp(A, -0.04, 1.05, 0.2), lean: 0.02, nod: 0.12 * Math.max(0, wave(t, 1.1, s)), palms: 0.6, gl: 0.6, gr: 0.6, book: true };
  }
}

// =============================================================================================
// The 질문 책상 (tutorDesk, 1 × 1, against a wall): the 강사's swivel chair at the front left, a
// pupil's stool at the front right; the monitor and keyboard at the left, the work in the middle.

export const TD = {
  top: 0.74,
  z: -0.19,
  w: 0.96,
  d: 0.52,
  /** The pupil's 문제집 open (or the sheet being marked), the keyboard, the mouse, the stack to mark, the marked pile. */
  sheet: [0.1, 0.745, -0.04] as P,
  kb: [-0.22, 0.745, -0.18] as P,
  mouse: [0.04, 0.745, -0.17] as P,
  stack: [0.34, 0.745, -0.27] as P,
  done: [-0.36, 0.745, 0.0] as P,
  /** The pupil's stool. */
  stool: { x: 0.34, z: 0.3, seat: 0.48 },
};
export const TUTOR_AT: SpotAt = { x: -0.13, y: 0.5, z: 0.36, yaw: Math.PI };

/**
 * Going over a pupil's work with them (첨삭 · 1:1 질의응답), ~24 s round: their answer read through
 * with the pen; circled in red; the problem pointed at, tapped; turned to them explaining; the step
 * written in the margin; listening as they get it (아, 이제 알겠어요!).
 */
export type ExplainKey = 'read' | 'mark' | 'point' | 'talk' | 'write' | 'ask';
const EXPLAIN: Array<Step<ExplainKey>> = [st('read', 3.5, 0.5), st('mark', 3, 0.5), st('point', 3.5, 0.6), st('talk', 4, 0.6), st('write', 4, 0.5), st('ask', 3, 0.7)];
export const explainBeat = (t: number, ph: number) => beatOf(EXPLAIN, t, ph);
/** Who's talking: 1 the 강사, 2 the pupil. */
export const explainSays = (b: Beat<ExplainKey>) => (during(b, 'talk', 0.15, 0.9) ? 1 : during(b, 'ask', 0.1, 0.9) ? 2 : 0);
/** How much red's on the pupil's page (circles, then the step in the margin). */
export const explainInk = (b: Beat<ExplainKey>) => {
  const i = EXPLAIN.findIndex((x) => x.key === b.from);
  return { circle: i > 1 || (i === 1 && b.p > 0.5), step: i > 4 || (i === 4 ? b.p : 0) };
};
function explainKey(k: ExplainKey, p: number, t: number, s: number): Key {
  const S = TD.sheet;
  const flat = add(S, [-0.17, 0.006, 0.06]);
  switch (k) {
    case 'read':
      return { l: flat, r: add(S, [-0.06 + 0.12 * frac(p * 2), 0.014, -0.07 + 0.05 * Math.floor(p * 2)]), lean: 0.28, nod: 0.5, palms: 1.2, gl: 0.1, gr: 0.8 };
    case 'mark': {
      const a = t * 7;
      return { l: flat, r: add(S, [0.02 + 0.03 * Math.cos(a), 0.016 + 0.006 * Math.sin(a * 2), -0.04 + 0.025 * Math.sin(a)]), lean: 0.3, nod: 0.55, palms: 1.2, gl: 0.1, gr: 0.85 };
    }
    case 'point':
      return { l: flat, r: add(S, [0.04, 0.02 + 0.014 * Math.max(0, wave(t, 2.2, s)), -0.06]), lean: 0.25, nod: 0.45, palms: 1.0, gl: 0.1, gr: 0.6 };
    case 'talk':
      return { l: flat, r: sp(TUTOR_AT, -0.3, 0.96 + 0.03 * wave(t, 0.8, s), 0.3), lean: 0.1, nod: 0.08, palms: -0.8, gl: 0.1, gr: 0.2 };
    case 'write':
      return { l: flat, r: add(S, [0.11 + 0.05 * frac(t * 0.8), 0.014 + 0.004 * wave(t, 5, s), 0.05 - 0.016 * Math.floor(p * 4)]), lean: 0.3, nod: 0.55, palms: 1.2, gl: 0.1, gr: 0.85 };
    default:
      return { l: add(S, [-0.2, 0.02, 0.1]), r: add(S, [-0.09, 0.02, 0.1]), lean: 0.12, nod: 0.12 + 0.05 * Math.max(0, wave(t, 0.9, s)), palms: 1.3, gl: 0.4, gr: 0.4 };
  }
}

/**
 * Marking a stack of word tests (단어 시험 채점), ~12 s round: a sheet taken off the stack; marked
 * down the page O and X in red; the score written at the top; put on the marked pile.
 */
export type MarkKey = 'take' | 'mark' | 'score' | 'set';
const MARK: Array<Step<MarkKey>> = [st('take', 1.4, 0.3), st('mark', 6, 0.3), st('score', 1.6, 0.3), st('set', 1.2, 0.4)];
export const markBeat = (t: number, ph: number) => beatOf(MARK, t, ph);
/** Where the sheet being marked is: 'stack' (not taken yet), 'hand', 'desk'. */
export function markSheet(b: Beat<MarkKey>): 'stack' | 'hand' | 'desk' {
  if (b.from === 'take') return b.e > 0 ? 'hand' : b.p < 0.4 ? 'stack' : 'hand';
  if (b.from === 'set') return 'hand';
  return 'desk';
}
/** How far down the sheet it's been marked (0–1), and the score on it. */
export const markRows = (b: Beat<MarkKey>) => (b.from === 'mark' ? (b.e > 0 ? 1 : b.p) : b.from === 'take' ? 0 : 1);
function markKey(k: MarkKey, p: number, t: number): Key {
  const C = TD.sheet;
  const flat = add(C, [-0.15, 0.006, 0.03]);
  switch (k) {
    case 'take':
      return { l: flat, r: mixP(add(TD.stack, [0, 0.03, 0.04]), add(C, [0.02, 0.03, 0]), ss(p, 0.4, 1)), lean: 0.3, nod: 0.45, palms: 1.2, gl: 0.1, gr: 0.6 };
    case 'mark': {
      const row = Math.floor(p * 8);
      return { l: flat, r: add(C, [0.05 + 0.018 * Math.sin(t * 16), 0.015 + 0.006 * Math.abs(Math.sin(t * 16)), -0.1 + row * 0.024]), lean: 0.32, nod: 0.6, palms: 1.2, gl: 0.1, gr: 0.85 };
    }
    case 'score':
      return { l: flat, r: add(C, [0.07 + 0.015 * Math.cos(t * 10), 0.016, -0.12 + 0.015 * Math.sin(t * 10)]), lean: 0.3, nod: 0.55, palms: 1.2, gl: 0.1, gr: 0.85 };
    default:
      return { l: flat, r: mixP(add(C, [0.02, 0.03, 0]), add(TD.done, [0, 0.04, 0]), ss(p, 0.1, 0.8)), lean: 0.28, nod: 0.4, palms: 1.2, gl: 0.1, gr: 0.6 };
  }
}

/**
 * Making a 문제지 (교재 만들기), ~20 s round: typed into the editor; a click or two with the mouse;
 * the printed draft picked up and read through with the pen; put back on the stack.
 */
export type HandoutKey = 'type' | 'mouse' | 'proof' | 'set';
const HANDOUT: Array<Step<HandoutKey>> = [st('type', 8, 0.5), st('mouse', 3, 0.6), st('proof', 5, 0.5), st('set', 1.4, 0.6)];
export const handoutBeat = (t: number, ph: number) => beatOf(HANDOUT, t, ph);
/** Whether the draft's in the hands. */
export const handoutHeld = (b: Beat<HandoutKey>) => b.from === 'proof' || (b.from === 'mouse' && b.e > 0.4) || (b.from === 'set' && b.p < 0.6);
function handoutKey(k: HandoutKey, p: number, t: number, s: number): Key {
  const K = TD.kb;
  switch (k) {
    case 'type':
      return { l: add(K, [-0.1, 0.02 + 0.012 * Math.max(0, wave(t, 6.5, s)), 0.02]), r: add(K, [0.1, 0.02 + 0.012 * Math.max(0, wave(t, 6.5, s + 0.5)), 0.02]), lean: 0.22, nod: 0.08, palms: 1.45, gl: 0.35, gr: 0.35, tap: true };
    case 'mouse':
      return { l: add(K, [-0.1, 0.02, 0.02]), r: add(TD.mouse, [0.01 * wave(t, 0.7, s), 0.03, 0.01 * wave(t, 0.5, s)]), lean: 0.2, nod: 0.06, palms: 1.35, gl: 0.35, gr: 0.4 };
    case 'proof':
      return { l: sp(TUTOR_AT, 0.1, 0.98, 0.3), r: sp(TUTOR_AT, -0.1 + 0.03 * wave(t, 0.6, s), 0.97, 0.32), lean: 0.12, nod: 0.38, palms: 0.4, gl: 0.6, gr: 0.85 };
    default:
      return { l: sp(TUTOR_AT, 0.1, 0.98, 0.3), r: mixP(sp(TUTOR_AT, -0.1, 0.97, 0.32), add(TD.stack, [0, 0.05, 0]), ss(p, 0.1, 0.7)), lean: 0.2, nod: 0.35, palms: 0.8, gl: 0.6, gr: 0.6 };
  }
}

// =============================================================================================
// The 인강 camera (lectureCamera, 1 × 1): the camera on its tripod, its lens out the front through
// the teleprompter's glass, softboxes either side; the 강사 stood a tile out in front, facing it,
// the studio's 전자칠판 behind them.

export const CAM = { lens: [0, 1.5, 0.12] as P, board: [0.2, 1.55, 2.4] as P };
export const REC_AT: SpotAt = { x: 0, y: 0, z: 1.2, yaw: Math.PI };
/**
 * Recording an 인강 (인터넷 강의 찍기), ~20 s round: talking into the lens with both hands; counting
 * off three things on the fingers; half turned, pointing back at the board behind; leaning in to
 * the camera (이건 꼭 나옵니다); a wave.
 */
export type RecKey = 'talk' | 'count' | 'back' | 'lean' | 'wave';
const REC: Array<Step<RecKey>> = [st('talk', 5, 0.6), st('count', 3.5, 0.5), st('back', 4, 0.8), st('lean', 3, 0.6), st('wave', 2.4, 0.8)];
const REC_YAW: Record<RecKey, number> = { talk: Math.PI, count: Math.PI, back: Math.PI - 0.75, lean: Math.PI, wave: Math.PI };
export const recBeat = (t: number, ph: number) => beatOf(REC, t, ph);
export const recYaw = (b: Beat<RecKey>) => yawOf(b, REC_YAW);
/** Which caption's in the teleprompter's line (it scrolls a line a beat). */
export const recLine = (b: Beat<RecKey>) => REC.findIndex((x) => x.key === b.from) + b.e;
function recKey(k: RecKey, p: number, t: number, s: number, at: SpotAt): Key {
  switch (k) {
    case 'talk':
      return { l: sp(at, 0.22, 1.12 + 0.035 * wave(t, 1.1, s), 0.3), r: sp(at, -0.22, 1.12 + 0.035 * wave(t, 1.1, s + 0.5), 0.3), lean: 0.03, nod: -0.03, palms: -0.9, gl: 0.15, gr: 0.15 };
    case 'count': {
      const bob = Math.max(0, Math.sin(p * Math.PI * 3)) * 0.04;
      return { l: sp(at, 0.18, 1.0, 0.22), r: sp(at, -0.14, 1.3 + bob, 0.28), lean: 0.02, nod: -0.04, palms: 0.1, gl: 0.3, gr: 0.5 };
    }
    case 'back':
      return { l: sp(at, 0.15, 1.0, 0.2), r: toward(sp(at, -0.18, 1.4, 0), CAM.board), lean: -0.02, nod: -0.08, palms: 0.1, gl: 0.3, gr: 0.6 };
    case 'lean':
      return { l: sp(at, 0.07, 1.14, 0.32), r: sp(at, -0.07, 1.14, 0.32), lean: 0.18, nod: -0.12, palms: 1.0, gl: 0.5, gr: 0.5 };
    default:
      return { l: sp(at, 0.16, 1.0, 0.2), r: sp(at, -0.28 + 0.06 * Math.sin(t * 7), 1.55, 0.2), lean: 0.0, nod: -0.04, palms: -0.2, gl: 0.3, gr: 0.05 };
  }
}

// =============================================================================================
// The 자습실 carrel (atStudyCarrel, 1 × 1): a partitioned desk, a pupil sat at it with their back to
// the room; the 강사 stands behind them to one side.

export const SC = { top: 0.74, z: -0.2, book: [0.0, 0.752, -0.08] as P, chairZ: 0.26, seat: 0.46, shoulder: [0.13, 1.04, 0.3] as P };
export const SUP_AT: SpotAt = { x: 0.3, y: 0, z: 0.56, yaw: -2.45 };
/**
 * Patrolling the 자습실 (자습 감독), ~18 s round: stood behind with the hands behind the back,
 * looking over a pupil asleep on the desk; a tap on the shoulder (they jolt up); leaning in to
 * whisper a problem through, a finger on the page; a note on the clipboard; watching them work.
 */
export type SupKey = 'patrol' | 'tap' | 'whisper' | 'note' | 'watch';
const SUP: Array<Step<SupKey>> = [st('patrol', 3, 0.6), st('tap', 2.4, 0.6), st('whisper', 4, 0.6), st('note', 3, 0.5), st('watch', 3, 0.8)];
export const supBeat = (t: number, ph: number) => beatOf(SUP, t, ph);
/** What the pupil's doing: 0 asleep on the desk, 1 just woken, 2 looking at the finger, 3 writing. */
export function supPupil(b: Beat<SupKey>): 0 | 1 | 2 | 3 {
  if (b.from === 'patrol') return 0;
  if (b.from === 'tap') return b.p < 0.55 && b.e === 0 ? 0 : 1;
  if (b.from === 'whisper') return 2;
  return 3;
}
function supKey(k: SupKey, p: number, t: number, s: number): Key {
  const A = SUP_AT;
  const back: [P, P] = [sp(A, 0.1, 0.92, -0.15), sp(A, -0.1, 0.92, -0.15)];
  switch (k) {
    case 'patrol':
      return { l: back[0], r: back[1], lean: 0.06, nod: 0.3, palms: 0.4, gl: 0.4, gr: 0.4 };
    case 'tap':
      return { l: back[0], r: add(SC.shoulder, [0, 0.02 + 0.02 * Math.max(0, wave(t, 3, s)) * (p < 0.6 ? 1 : 0), 0]), lean: 0.2, nod: 0.4, palms: 0.9, gl: 0.4, gr: 0.2 };
    case 'whisper':
      return { l: sp(A, 0.18, 1.0, 0.18), r: add(SC.book, [0.12 + 0.02 * wave(t, 0.5, s), 0.04, 0.1]), lean: 0.42, nod: 0.5, palms: 1.0, gl: 0.4, gr: 0.6 };
    case 'note': {
      const clip = sp(A, 0.1, 1.05, 0.22);
      return { l: clip, r: add(clip, [0.02 * wave(t, 2.4, s), 0.03, 0.02 * Math.sin(p * 9)]), lean: 0.06, nod: 0.38, palms: 0.9, gl: 0.6, gr: 0.85, book: true };
    }
    default:
      return { l: back[0], r: back[1], lean: 0.04, nod: 0.22, palms: 0.4, gl: 0.4, gr: 0.4 };
  }
}

// =============================================================================================
// The 성적 게시판 (atDdayBoard, 2 × 1, on a wall): the D-day flip counter at the left, the score
// sheets pinned at the right.

export const DB = { z: -0.42, sheet: [0.4, 1.3, -0.4] as P, card: [-0.55, 1.56, -0.39] as P };
export const POST_AT: SpotAt = { x: 0.0, y: 0, z: 0.02, yaw: Math.PI };
/**
 * Posting the results (성적 게시하기), ~16 s round: a sheet taken off the pile in the left hand; held
 * up to the board; pinned at its four corners; smoothed down; the D-day card flipped over to the
 * next day; stood back to look.
 */
export type PostKey = 'take' | 'hold' | 'pin' | 'smooth' | 'flip' | 'look';
const POST: Array<Step<PostKey>> = [st('take', 1.5, 0.6), st('hold', 1.4, 0.3), st('pin', 2.6, 0.3), st('smooth', 1.4, 0.7), st('flip', 2.6, 0.6), st('look', 2.4, 0.8)];
export const postBeat = (t: number, ph: number) => beatOf(POST, t, ph);
/** Where the new sheet is: 'pile' in the hand at the waist, 'held' up, 'up' pinned. */
export function postSheet(b: Beat<PostKey>): 'pile' | 'held' | 'up' {
  if (b.from === 'take') return b.e > 0.3 ? 'held' : 'pile';
  if (b.from === 'hold') return 'held';
  if (b.from === 'pin') return b.p < 0.2 ? 'held' : 'up';
  return 'up';
}
/** How far the D-day card's turned over (0–1). */
export const postFlip = (b: Beat<PostKey>) => (b.from === 'flip' ? (b.e > 0 ? 1 : ss(b.p, 0.3, 0.7)) : b.from === 'look' ? 1 : 0);
const CORNERS: Array<[number, number]> = [[-0.1, 0.14], [0.1, 0.14], [0.1, -0.14], [-0.1, -0.14]];
function postKey(k: PostKey, p: number): Key {
  const S = DB.sheet;
  const pile = sp(POST_AT, 0.14, 1.0, 0.22);
  switch (k) {
    case 'take':
      return { l: pile, r: mixP(add(pile, [0, 0.03, 0]), sp(POST_AT, -0.08, 1.1, 0.26), ss(p, 0.4, 1)), lean: 0.05, nod: 0.35, palms: 0.8, gl: 0.6, gr: 0.6 };
    case 'hold':
      return { l: add(S, [-0.11, 0.1, 0.03]), r: add(S, [0.11, 0.1, 0.03]), lean: 0.05, nod: -0.05, palms: 0.2, gl: 0.5, gr: 0.5 };
    case 'pin': {
      const c = CORNERS[Math.min(3, Math.floor(p * 4))];
      const push = Math.max(0, Math.sin(frac(p * 4) * Math.PI)) * 0.02;
      return { l: add(S, [-0.06, 0.0, 0.03]), r: add(S, [c[0], c[1], 0.045 - push]), lean: 0.06, nod: -0.02, palms: 0.3, gl: 0.2, gr: 0.6 };
    }
    case 'smooth':
      return { l: add(S, [-0.06, 0.1 - 0.2 * p, 0.03]), r: add(S, [0.06, 0.1 - 0.2 * p, 0.03]), lean: 0.06, nod: 0.0, palms: 0.2, gl: 0.0, gr: 0.0 };
    case 'flip':
      // The card's at the left: the left hand turns it over.
      return { l: add(DB.card, [0.02, 0.12 - 0.22 * ss(p, 0.25, 0.7), 0.05]), r: sp(POST_AT, -0.16, 0.98, 0.18), lean: 0.04, nod: -0.05, palms: 0.3, gl: 0.5, gr: 0.4 };
    default:
      return { l: sp(POST_AT, 0.22, 0.98, 0.02), r: sp(POST_AT, -0.22, 0.98, 0.02), lean: -0.03, nod: -0.06, palms: 0.4, gl: 0.4, gr: 0.4 };
  }
}

// =============================================================================================
// The 상담 table (atConsultTable, 2 × 2): the parents sat on the far side, the 강사 at the near.

export const CT = { top: 0.74, z: -0.1, w: 1.3, d: 0.74, chart: [-0.12, 0.745, -0.06] as P, grades: [0.2, 0.745, 0.06] as P, memo: [0.46, 0.745, 0.12] as P, mom: { x: -0.32, z: -0.74 }, dad: { x: 0.32, z: -0.74 }, seat: 0.46 };
export const CONS_AT: SpotAt = { x: 0, y: 0.5, z: 0.52, yaw: Math.PI };
/**
 * An 입시 상담 with the parents, ~26 s round: the 배치표 turned to them, a finger down its rows;
 * the 성적 추이 traced up its graph; listening, hands folded, as the mother asks (정시로 가능할까요?);
 * making the case with both hands; the plan written on a memo; a leaflet handed across.
 */
export type ConsKey = 'show' | 'trace' | 'listen' | 'explain' | 'write' | 'hand';
const CONS: Array<Step<ConsKey>> = [st('show', 4, 0.6), st('trace', 3.6, 0.6), st('listen', 5, 0.6), st('explain', 5, 0.6), st('write', 3.4, 0.6), st('hand', 2.6, 0.8)];
export const consBeat = (t: number, ph: number) => beatOf(CONS, t, ph);
/** Who's talking: 1 the mother, 2 the 강사. */
export const consSays = (b: Beat<ConsKey>) => (during(b, 'listen', 0.1, 0.85) ? 1 : during(b, 'explain', 0.1, 0.9) ? 2 : 0);
/** Where the leaflet is: on the memo, in the 강사's hand, in the mother's. */
export function consLeaflet(b: Beat<ConsKey>): 'desk' | 'tutor' | 'mom' {
  if (b.from === 'hand') return b.e > 0 || b.p > 0.75 ? 'mom' : 'tutor';
  return 'desk';
}
function consKey(k: ConsKey, p: number, t: number, s: number): Key {
  const C = CT.chart;
  switch (k) {
    case 'show':
      return { l: add(C, [0.22, 0.006, 0.14]), r: add(C, [0.08 - 0.03 * Math.floor(p * 3), 0.02 + 0.01 * Math.max(0, wave(t, 2, s)), -0.06 + 0.045 * Math.floor(p * 3)]), lean: 0.3, nod: 0.45, palms: 1.0, gl: 0.1, gr: 0.6 };
    case 'trace':
      return { l: add(C, [0.22, 0.006, 0.14]), r: add(CT.grades, [-0.08 + 0.14 * p, 0.018, 0.05 - 0.1 * p]), lean: 0.3, nod: 0.5, palms: 1.0, gl: 0.1, gr: 0.6 };
    case 'listen':
      return { l: [-0.07, 0.77, 0.2], r: [0.07, 0.77, 0.2], lean: 0.1, nod: 0.06 + 0.08 * Math.max(0, wave(t, 0.7, s)) ** 3, palms: 1.3, gl: 0.4, gr: 0.4 };
    case 'explain':
      return { l: sp(CONS_AT, 0.2, 0.95 + 0.03 * wave(t, 0.8, s + 0.5), 0.36), r: sp(CONS_AT, -0.2, 0.95 + 0.03 * wave(t, 0.8, s), 0.36), lean: 0.12, nod: 0.0, palms: -0.8, gl: 0.15, gr: 0.15 };
    case 'write':
      return { l: [-0.1, 0.77, 0.18], r: add(CT.memo, [-0.04 + 0.08 * frac(t * 0.7), 0.014 + 0.004 * wave(t, 5, s), -0.03 + 0.015 * Math.floor(p * 4)]), lean: 0.3, nod: 0.55, palms: 1.2, gl: 0.1, gr: 0.85 };
    default:
      return { l: [-0.1, 0.77, 0.18], r: mixP(add(CT.memo, [0, 0.03, 0]), [-0.14, 0.82, -0.2], ss(p, 0.1, 0.6)), lean: 0.36, nod: 0.2, palms: 0.6, gl: 0.1, gr: 0.6 };
  }
}

// =============================================================================================
// The 모의고사 copier (atExamPrinter, 1 × 1): a big office copier, the paper drawer at the bottom,
// the panel at the front right, the output tray on its left side, the stapler and the pile on top.

export const PR = { top: 1.0, z: -0.12, w: 0.62, d: 0.6, panel: [0.18, 1.06, 0.15] as P, drawer: [0, 0.32, 0.19] as P, out: [-0.42, 0.86, -0.1] as P, pile: [-0.14, 1.0, -0.24] as P, stapler: [0.16, 1.0, -0.22] as P };
export const PRINT_AT: SpotAt = { x: 0.02, y: 0, z: 0.56, yaw: Math.PI };
/**
 * Printing a 모의고사 (모의고사 인쇄하기), ~20 s round: crouched to the drawer, pulled out, a ream
 * dropped in, pushed shut; the panel pressed; watching the sheets come out; the stack gathered;
 * knocked even on the top; stapled; put on the pile.
 */
export type PrintKey = 'load' | 'press' | 'wait' | 'gather' | 'even' | 'staple' | 'stack';
const PRINT: Array<Step<PrintKey>> = [st('load', 3.2, 0.6), st('press', 1.4, 0.4), st('wait', 4.6, 0.5), st('gather', 1.6, 0.5), st('even', 2.2, 0.4), st('staple', 2.2, 0.4), st('stack', 1.4, 0.8)];
export const printBeat = (t: number, ph: number) => beatOf(PRINT, t, ph);
/** How far the paper drawer's out (m). */
export const printDrawer = (b: Beat<PrintKey>) => (b.from === 'load' && b.e === 0 ? 0.22 * ss(b.p, 0.05, 0.3) * (1 - ss(b.p, 0.72, 0.95)) : 0);
/** The ream in the hands going into the drawer. */
export const printReam = (b: Beat<PrintKey>) => b.from === 'load' && b.e === 0 && b.p > 0.15 && b.p < 0.6;
/** How many sheets have come out (0–1 of the stack), and whether it's printing. */
export function printOut(b: Beat<PrintKey>): { k: number; running: boolean } {
  if (b.from === 'press') return { k: 0, running: b.p > 0.6 || b.e > 0 };
  if (b.from === 'wait') return { k: b.e > 0 ? 1 : b.p, running: b.e === 0 };
  if (b.from === 'gather') return { k: 1, running: false };
  return { k: 0, running: false };
}
/** Where the printed stack is: 'tray' (coming out), 'hands', 'stapler', 'pile', or not yet. */
export function printStack(b: Beat<PrintKey>): 'none' | 'tray' | 'hands' | 'pile' {
  if (b.from === 'press' || b.from === 'wait') return 'tray';
  if (b.from === 'gather') return b.p < 0.4 && b.e === 0 ? 'tray' : 'hands';
  if (b.from === 'even' || b.from === 'staple') return 'hands';
  if (b.from === 'stack') return b.p > 0.7 || b.e > 0 ? 'pile' : 'hands';
  return 'none';
}
export const printClick = (b: Beat<PrintKey>) => (b.from === 'staple' && b.e === 0 ? Math.max(0, Math.sin(ss(b.p, 0.3, 0.7) * Math.PI)) : 0);
function printKey(k: PrintKey, p: number, t: number, s: number): Key {
  const D = PR.drawer;
  switch (k) {
    case 'load': {
      const out = 0.22 * ss(p, 0.05, 0.3) * (1 - ss(p, 0.72, 0.95));
      const drop = p > 0.15 && p < 0.6;
      return drop
        ? { l: add(D, [-0.12, 0.12 - 0.06 * ss(p, 0.3, 0.55), 0.14 + out * 0.5]), r: add(D, [0.12, 0.12 - 0.06 * ss(p, 0.3, 0.55), 0.14 + out * 0.5]), lean: 0.35, nod: 0.5, palms: 0.4, gl: 0.6, gr: 0.6, crouch: 0.55 }
        : { l: add(D, [-0.1, 0.02, 0.05 + out]), r: add(D, [0.1, 0.02, 0.05 + out]), lean: 0.35, nod: 0.5, palms: 1.2, gl: 0.8, gr: 0.8, crouch: 0.55 };
    }
    case 'press':
      return { l: sp(PRINT_AT, 0.16, 0.98, 0.18), r: add(PR.panel, [0, 0.03 - 0.015 * Math.max(0, wave(t, 2.5, s)), 0.02]), lean: 0.2, nod: 0.45, palms: 1.0, gl: 0.3, gr: 0.4 };
    case 'wait':
      return { l: [-0.12, PR.top + 0.02, 0.12], r: sp(PRINT_AT, -0.18, 0.95, 0.05), lean: 0.1, nod: 0.3, palms: 1.2, gl: 0.2, gr: 0.4 };
    case 'gather':
      return { l: mixP(add(PR.out, [0, 0.03, 0.1]), [-0.12, 1.06, 0.18], ss(p, 0.4, 1)), r: mixP(add(PR.out, [0, 0.03, -0.1]), [0.12, 1.06, 0.18], ss(p, 0.4, 1)), lean: 0.25, nod: 0.4, palms: 0.3, gl: 0.6, gr: 0.6 };
    case 'even': {
      const knock = Math.abs(Math.sin(t * 8)) * 0.04;
      return { l: [-0.12, 1.06 + knock, 0.16], r: [0.12, 1.06 + knock, 0.16], lean: 0.18, nod: 0.45, palms: 0.2, gl: 0.6, gr: 0.6 };
    }
    case 'staple': {
      const c = Math.max(0, Math.sin(ss(p, 0.3, 0.7) * Math.PI));
      return { l: add(PR.stapler, [-0.12, 0.04, 0.06]), r: add(PR.stapler, [0, 0.1 - 0.05 * c, 0]), lean: 0.25, nod: 0.5, palms: 1.4, gl: 0.6, gr: 0.0 };
    }
    default:
      return { l: mixP([-0.12, 1.06, 0.16], add(PR.pile, [-0.08, 0.05, 0]), ss(p, 0.1, 0.7)), r: mixP([0.12, 1.06, 0.16], add(PR.pile, [0.08, 0.05, 0]), ss(p, 0.1, 0.7)), lean: 0.28, nod: 0.4, palms: 0.3, gl: 0.6, gr: 0.6 };
  }
}

// =============================================================================================

/** The hands and where they're done from for a motion at `t` (`ph`: the piece's clock offset). */
export function atKeyOf(m: AtMotion, t: number, ph: number): { key: Key; at: SpotAt } {
  const s = ph * 7.3;
  switch (m) {
    case 'atLecture':
    case 'atCram': {
      const b = lectBeat(t, ph, m === 'atCram');
      const at = { ...LECT_AT, yaw: lectYaw(b) };
      return { key: blended(b, (k, p) => lectKey(b, k, p, t, s, at)), at };
    }
    case 'atCoach': {
      const b = coachBeat(t, ph);
      return { key: blended(b, (k, p) => coachKey(b, k, p, t, s)), at: COACH_AT };
    }
    case 'atExplain':
      return { key: blended(explainBeat(t, ph), (k, p) => explainKey(k, p, t, s)), at: TUTOR_AT };
    case 'atMark':
      return { key: blended(markBeat(t, ph), (k, p) => markKey(k, p, t)), at: TUTOR_AT };
    case 'atHandout':
      return { key: blended(handoutBeat(t, ph), (k, p) => handoutKey(k, p, t, s)), at: TUTOR_AT };
    case 'atRecord': {
      const b = recBeat(t, ph);
      const at = { ...REC_AT, yaw: recYaw(b) };
      return { key: blended(b, (k, p) => recKey(k, p, t, s, at)), at };
    }
    case 'atSupervise':
      return { key: blended(supBeat(t, ph), (k, p) => supKey(k, p, t, s)), at: SUP_AT };
    case 'atPost':
      return { key: blended(postBeat(t, ph), (k, p) => postKey(k, p)), at: POST_AT };
    case 'atConsult':
      return { key: blended(consBeat(t, ph), (k, p) => consKey(k, p, t, s)), at: CONS_AT };
    default:
      return { key: blended(printBeat(t, ph), (k, p) => printKey(k, p, t, s)), at: PRINT_AT };
  }
}

export function atDoing(m: AtMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = atKeyOf(m, t, atPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  const l = w(k.l);
  return {
    reach: { l, r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr }, ...(k.tap ? { tap: true } : {}) },
    ...(k.crouch ? { crouch: k.crouch } : {}),
    ...(k.book ? { prop: { kind: 'book' as const, at: l.clone().addScaledVector(left, -0.05), yaw: b.yaw } } : {}),
  };
}
