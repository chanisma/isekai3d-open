import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';
import type { HandShape } from '../handTool';

/*
 * Three pieces of a homeroom teacher's work with their own beats (2026-11-02, at the user's request).
 *
 * 생활기록부 쓰기: typed at the desk's computer into the 행동특성 및 종합의견 of a made-up pupil. By the 학교생활기록부 훈령 (제16조) that
 * section is the homeroom teacher's sentences, written from behaviour observed and noted through the year, so the typing stops
 * for the observation notebook, goes on, and the whole is read through and saved. The form is a generic one of our own.
 *
 * 학부모와 전화 상담하기: dialled on the desk phone, the handset to the ear in the left hand; greeted, listened to with nods,
 * spoken to, a note taken with the right hand, a goodbye, the handset put back, the note finished.
 *
 * 급식·청소 당번 정하기: at the 당번표 on the notice board; two children's name tags change places through the spare slot, pressed
 * on, a nod. Each round is the next swap, so the chart really changes.
 *
 * One clock for the hands and what they move: `tcNow` says all of it for a moment, and workplaces/teacher.ts draws what it says.
 * Desk places are in the desk's frame (x across, y up from the floor, z to its front; sat facing -z, the right hand on +x). Chart
 * places are in the board's frame: the same, with z = 0 at the board's wall side (the board can stand off a wall).
 */
export type TcMotion = 'tcRecord' | 'tcCall' | 'tcDuty';
export const TC_MOTIONS = new Set<string>(['tcRecord', 'tcCall', 'tcDuty']);

export type P = [number, number, number];
const frac = (x: number) => ((x % 1) + 1) % 1;
const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
const add = (a: P, x: number, y: number, z: number): P => [a[0] + x, a[1] + y, a[2] + z];
const wave = (t: number, hz: number, s = 0) => Math.sin((t * hz + s) * Math.PI * 2);
const pulse = (t: number, hz: number, s = 0) => Math.max(0, wave(t, hz, s)) ** 4;

/** The clock's offset, from a fixed mark on the piece, so two desks aren't in step. */
export const tcPhase = (p: THREE.Vector3) => frac(p.x * 0.397 + p.z * 0.641);

/** Where the body is in the piece, and which way it faces (0 = +z). `y` is the seat's top, 0 stood. */
export interface SpotAt {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
/** A point in a stance's own frame (`side` to the dweller's left, `up` from `y`, `ahead`), in the piece's. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, s.y + up, s.z - side * n + ahead * c];
}
function inSpot(s: SpotAt, p: P): P {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1] - s.y, dx * n + dz * c];
}

type Step<K extends string> = { key: K; hold: number; move: number };
const st = <K extends string>(key: K, hold: number, move = 0.4): Step<K> => ({ key, hold, move });
interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  n: number;
}
const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = roundOf(steps);
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

/** Hands and bend, the hands in the piece's frame. */
export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  tap?: boolean;
  shape?: { l?: HandShape; r?: HandShape };
}
function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), shape: e < 0.5 ? a.shape : b.shape };
}
function blended<K extends string>(b: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(b.from, b.e > 0 ? 1 : b.p);
  return b.e > 0 ? mixKey(a, pose(b.to, 0), b.e) : a;
}
function times<K extends string>(steps: Array<Step<K>>): Array<[string, number]> {
  let u = 0;
  return steps.map((k) => {
    const at: [string, number] = [k.key, u];
    u += k.hold + k.move;
    return at;
  });
}

// =============================================================================================
// The desk (a 1 × 1 교사용 책상: see teacherDesk in teacher.ts, which draws at these places).

/** The glass top's height, the seat. */
export const TOP = 0.745;
export const DESK_AT: SpotAt = { x: 0, y: 0.48, z: 0.42, yaw: Math.PI };
export const KEYS: P = [-0.14, TOP + 0.04, -0.02];
export const MOUSE: P = [0.12, TOP + 0.04, -0.01];
/** The open notebook: its centre, the size of it; the right page's centre. */
export const BOOK = { x: 0.09, z: 0.115, w: 0.26, d: 0.13, y: TOP + 0.016 };
const RIGHT_PAGE: P = [BOOK.x + BOOK.w / 4, BOOK.y, BOOK.z];
const LEFT_PAGE: P = [BOOK.x - BOOK.w / 4, BOOK.y, BOOK.z];
/** The phone at the left of the desk: its base's centre, the handset's cradle, the keys. */
export const PHONE = { base: [-0.4, TOP, -0.12] as P, cradle: [-0.438, TOP + 0.082, -0.12] as P, keys: [-0.362, TOP + 0.05, -0.1] as P };
/** How far along a pen, from the grip to the tip. */
export const PEN_TIP = 0.07;
export const PEN_HOME: P = [0.15, BOOK.y + 0.008, BOOK.z + 0.052];

/** Where the shoulders are, sat (about 0.52 m above the seat), for checking reach. */
export function shoulderSat(sx: number, lean: number): P {
  return sp(DESK_AT, sx * 0.18, 0.52 - 0.2 * (1 - Math.cos(lean)), 0.35 * Math.sin(lean));
}
/** A handset at the left ear, for someone `H` tall. */
export const earOf = (H: number): P => sp(DESK_AT, 0.11, 0.4 * H, 0.03);

/** A moment at the desk. */
export interface DeskNow {
  beat: string;
  key: Key;
  at: SpotAt;
  /** What the hands' tool is this moment, and whether it's still in its place, being reached for. */
  tool: 'handset' | 'pen' | null;
  resting: boolean;
  /** Where the handset's origin is, and how far from lying in the cradle (0) to the ear's slant (1); 0 and the cradle when it's down. */
  handsetAt: P;
  lift: number;
  /** The pen's origin and how far from lying (0) to stood on its tip (1). */
  penAt: P;
  penUp: number;
  /** How much of the record is typed (0-1), whether it's saved, whether the form's up. */
  typed: number;
  saved: boolean;
  /** The call's note: lines on the right page so far. A lamp on the phone while it's on a call. */
  lines: number;
  onCall: boolean;
}
function deskBlank(beat: string, key: Key): DeskNow {
  return { beat, key, at: DESK_AT, tool: null, resting: false, handsetAt: PHONE.cradle, lift: 0, penAt: PEN_HOME, penUp: 0, typed: 0, saved: false, lines: 0, onCall: false };
}
const REST_L: P = add(LEFT_PAGE, -0.14, 0.04, 0.03);
const REST_R: P = add(RIGHT_PAGE, 0.02, 0.05, 0.1);
const typing = (t: number, s: number, lean = 0.12, nod = 0.1): Key => ({ l: add(KEYS, -0.1 + 0.012 * wave(t, 2.3, s), 0, 0), r: add(KEYS, 0.1 + 0.012 * wave(t, 2.7, s), 0, 0), lean, nod, palms: 1.2, gl: 0.3, gr: 0.3, tap: true });

// ---------------------------------------------------------------------------------------------
// 생활기록부 쓰기.

export type RecordKey = 'open' | 'type1' | 'check' | 'turn' | 'type2' | 'read' | 'save' | 'done';
const RECORD: Array<Step<RecordKey>> = [st('open', 2.2), st('type1', 5.5), st('check', 4), st('turn', 1.4), st('type2', 5.5), st('read', 4.4), st('save', 1.4), st('done', 1.6, 0.6)];
export const RECORD_ROUND = roundOf(RECORD);
function recordKey(k: RecordKey, p: number, t: number, s: number): Key {
  const clickR = { r: add(MOUSE, 0, 0.006 * pulse(t, 0.8, s), 0), gr: 0.4 };
  switch (k) {
    case 'open':
    case 'save':
      return { l: add(KEYS, -0.12, 0, 0.02), ...clickR, lean: 0.08, nod: 0.08, palms: 1.2, gl: 0.25 };
    case 'type1':
    case 'type2':
      return typing(t, s);
    case 'check':
      // A finger down the dated notes on the left page, the eyes with it.
      return { l: add(KEYS, -0.12, 0, 0.02), r: add(LEFT_PAGE, 0.02, 0.018, -0.04 + 0.085 * ss(p, 0.05, 0.92)), lean: 0.26, nod: 0.62, palms: 1.15, gl: 0.25, gr: 0.45 };
    case 'turn':
      // The page lifted by its corner and laid over, and back.
      return { l: add(KEYS, -0.12, 0, 0.02), r: add(RIGHT_PAGE, -0.06 + 0.1 * Math.sin(p * Math.PI), 0.02 + 0.05 * Math.sin(p * Math.PI), 0.03), lean: 0.24, nod: 0.56, palms: 1, gl: 0.25, gr: 0.5 };
    case 'read':
      // Sat back and read through, the finger on the wheel.
      return { l: add(KEYS, -0.12, 0, 0.03), r: add(MOUSE, 0, 0.004 * wave(t, 0.7, s), 0), lean: 0, nod: 0.03 + 0.04 * wave(t, 0.11, s), palms: 1.15, gl: 0.25, gr: 0.45 };
    default:
      return { l: REST_L, r: add(MOUSE, 0, 0.01, 0.06), lean: 0.02, nod: 0.05 + 0.2 * pulse(t, 0.6, s), palms: 1.05, gl: 0.3, gr: 0.3 };
  }
}
function recordNow(t: number, ph: number): DeskNow {
  const b = beatOf(RECORD, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const n = deskBlank(k, blended(b, (x, q) => recordKey(x, q, t, s)));
  n.typed = k === 'open' ? 0 : k === 'type1' ? 0.46 * ss(p, 0.02, 0.98) : k === 'check' || k === 'turn' ? 0.46 : k === 'type2' ? mix(0.46, 1, ss(p, 0.02, 0.98)) : 1;
  n.saved = (k === 'save' && p > 0.55) || k === 'done';
  return n;
}

// ---------------------------------------------------------------------------------------------
// 학부모와 전화 상담하기.

export type CallKey = 'dial' | 'lift' | 'ring' | 'greet' | 'listen' | 'note1' | 'speak' | 'listen2' | 'note2' | 'bye' | 'hang' | 'finish';
const CALL: Array<Step<CallKey>> = [st('dial', 2.4), st('lift', 1.3), st('ring', 1.8), st('greet', 2.6), st('listen', 3.4), st('note1', 3.6), st('speak', 3.6), st('listen2', 2.8), st('note2', 3.2), st('bye', 2.0), st('hang', 1.4), st('finish', 3.0, 0.7)];
export const CALL_ROUND = roundOf(CALL);
const NOTE_LINES = 3;
/** The pen's tip on a line of the right page, going along it. */
function nib(line: number, u: number, t: number): P {
  return [RIGHT_PAGE[0] - 0.045 + 0.09 * u, BOOK.y + 0.002 + 0.003 * Math.abs(Math.sin(t * 15)), BOOK.z - 0.035 + line * 0.035];
}
/** A stretch with the pen in hand: taken up, a line written, laid down. */
function penIn(p: number, line: number, t: number): { at: P; up: number; resting: boolean } {
  if (p < 0.16) return { at: PEN_HOME, up: 0, resting: true };
  const u = ss(p, 0.3, 0.86);
  const writing = add(nib(line, u, t), 0, PEN_TIP, 0);
  const up = ss(p, 0.16, 0.3) * (1 - ss(p, 0.88, 1));
  return { at: mixP(PEN_HOME, writing, up), up, resting: p > 0.97 };
}
function callKey(k: CallKey, p: number, t: number, s: number, H: number): Key {
  const ear = earOf(H);
  // The handset's in the left hand: the hand's at it, by the tool or (with the pen in the other) by this.
  const heldL = { l: ear, gl: 0.75, shape: { l: 'power' as HandShape } };
  switch (k) {
    case 'dial':
      return { l: add(PHONE.keys, 0.012 * Math.sin(t * 7 + s), 0.012 * Math.abs(Math.sin(t * 9 + s)), 0.008 * Math.cos(t * 5 + s)), r: REST_R, lean: 0.3, nod: 0.45, palms: 1.1, gl: 0.2, gr: 0.3 };
    case 'lift':
    case 'hang': {
      const e = k === 'lift' ? ss(p, 0.18, 1) : 1 - ss(p, 0, 0.82);
      return { l: mixP(PHONE.cradle, ear, e), r: REST_R, lean: mix(0.3, 0.05, e), nod: mix(0.35, 0.08, e), palms: 0.3, gl: 0.75, gr: 0.3 };
    }
    case 'ring':
      return { ...heldL, r: REST_R, lean: 0.04, nod: 0.06, palms: 1.05, gr: 0.3 };
    case 'greet':
    case 'bye':
      // Bowing a little to someone who can't see it, as people do.
      return { ...heldL, r: REST_R, lean: 0.06 + 0.08 * pulse(t, 0.5, s), nod: 0.1 + 0.2 * pulse(t, 0.5, s), palms: 1.05, gr: 0.3 };
    case 'listen':
    case 'listen2':
      return { ...heldL, r: REST_R, lean: 0.05, nod: 0.08 + 0.2 * pulse(t, 0.45, s), palms: 1.05, gr: 0.3 };
    case 'note1':
    case 'note2':
      return { ...heldL, r: penIn(p, k === 'note1' ? 0 : 1, t).at, lean: 0.18, nod: 0.46 + 0.08 * pulse(t, 0.4, s), palms: 0.9, gr: 0.6, shape: { l: 'power', r: 'pen' } };
    case 'speak':
      // The free hand goes with the words.
      return { ...heldL, r: sp(DESK_AT, -0.16 + 0.03 * wave(t, 0.6, s), 0.34 + 0.03 * wave(t, 0.9, s), 0.28), lean: 0.03, nod: 0.08 + 0.04 * wave(t, 0.7, s), palms: 0.5, gr: 0.3 };
    default:
      return { l: add(LEFT_PAGE, -0.02, 0.03, 0.02), r: penIn(p, 2, t).at, lean: 0.2, nod: 0.5, palms: 1.05, gl: 0.2, gr: 0.6, shape: { r: 'pen' } };
  }
}
function callNow(t: number, ph: number, H: number): DeskNow {
  const b = beatOf(CALL, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const n = deskBlank(k, blended(b, (x, q) => callKey(x, q, t, s, H)));
  const ear = earOf(H);
  const order = CALL.map((c) => c.key);
  const i = order.indexOf(k);
  const up = k === 'dial' ? 0 : k === 'lift' ? ss(p, 0.18, 1) : k === 'hang' ? 1 - ss(p, 0, 0.82) : k === 'finish' ? 0 : 1;
  n.lift = up;
  n.handsetAt = mixP(PHONE.cradle, ear, up);
  n.onCall = i >= 2 && i <= 9;
  if (k === 'note1' || k === 'note2' || k === 'finish') {
    const pen = penIn(p, k === 'note1' ? 0 : k === 'note2' ? 1 : 2, t);
    n.penAt = pen.at;
    n.penUp = pen.up;
    if (b.e === 0) {
      n.tool = 'pen';
      n.resting = pen.resting;
    }
  } else if (k !== 'dial' && b.e === 0) {
    n.tool = 'handset';
    n.resting = (k === 'lift' && p < 0.18) || (k === 'hang' && p > 0.86);
  }
  // A line appears as it's written.
  const wrote = (q: number) => q > 0.5;
  n.lines = i < order.indexOf('note1') ? 0 : k === 'note1' ? (wrote(p) ? 1 : 0) : i < order.indexOf('note2') ? 1 : k === 'note2' ? (wrote(p) ? 2 : 1) : k !== 'finish' ? 2 : wrote(p) ? NOTE_LINES : 2;
  return n;
}

// =============================================================================================
// The 당번표: in the board's frame, the chart's slots as the canvas paints them (teacher.ts paintNotices).

/** The board's size (m) and its picture's size (px), and its centre's height. */
export const BOARD = { w: 1.86, h: 1.0, y: 1.42, pxW: 1024, pxH: 552, z: 0.022 };
const bx = (px: number) => -BOARD.w / 2 + (px / BOARD.pxW) * BOARD.w;
const by = (py: number) => BOARD.y + BOARD.h / 2 - (py / BOARD.pxH) * BOARD.h;
/** On the canvas: the chart's box, the rows of duties, the two slots a row and the spare slot's middles. */
export const CHART = { x0: 330, y0: 412, x1: 650, y1: 548, rows: 4, rowY: 454, rowH: 26, colX: [465, 540], spareX: 612 };
export const DUTIES = ['급식 당번', '청소 당번', '칠판 정리', '분리수거'];
export const CHILDREN = ['민준', '서연', '지호', '유나', '하은', '도윤', '서아', '은우'];
const TAG_Z = BOARD.z + 0.008;
/** A slot (row × 2 + column) on the board. */
export const slotAt = (i: number): P => [bx(CHART.colX[i % 2]), by(CHART.rowY + Math.floor(i / 2) * CHART.rowH), TAG_Z];
export const SPARE: P = [bx(CHART.spareX), by(CHART.rowY + CHART.rowH), TAG_Z];
/** Each round's pair of slots; none shares a slot with another, so eight rounds come back round. */
const SWAPS: Array<[number, number]> = [[0, 5], [2, 7], [1, 4], [3, 6]];
const SWAP_PERIOD = 8;
/** Which tag's in each slot at the start of round `n`. */
export function slotsAtRound(n: number): number[] {
  const s = CHILDREN.map((_, i) => i);
  const k = ((n % SWAP_PERIOD) + SWAP_PERIOD) % SWAP_PERIOD;
  for (let i = 0; i < k; i++) {
    const [a, b] = SWAPS[i % SWAPS.length];
    [s[a], s[b]] = [s[b], s[a]];
  }
  return s;
}

export const DUTY_AT: SpotAt = { x: -0.035, y: 0, z: 0.42, yaw: Math.PI };
export type DutyKey = 'read' | 'takeA' | 'takeB' | 'putA' | 'press' | 'nod';
const DUTY: Array<Step<DutyKey>> = [st('read', 2.6), st('takeA', 1.8), st('takeB', 2.2), st('putA', 2.2), st('press', 1.2), st('nod', 2.2, 0.6)];
export const DUTY_ROUND = roundOf(DUTY);
/** Shoulders stood (about 1.3 m up), for checking reach. */
export const shoulderStood = (sx: number, lean: number): P => sp(DUTY_AT, sx * 0.18, 1.3 - 0.45 * (1 - Math.cos(lean)), 0.45 * Math.sin(lean));

export interface DutyNow {
  beat: string;
  key: Key;
  at: SpotAt;
  /** Every tag's place, by child; the tag in the hand (if any) and whether it's still being reached for. */
  tags: P[];
  held: number | null;
  resting: boolean;
}
/** A tag going from one place to another, a little off the board on its way. */
function carried(from: P, to: P, e: number): P {
  const q = mixP(from, to, e);
  return [q[0], q[1], q[2] + 0.035 * Math.sin(e * Math.PI)];
}
function dutyNow(t: number, ph: number): DutyNow {
  const b = beatOf(DUTY, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const start = slotsAtRound(b.n);
  const [sa, sb] = SWAPS[((b.n % SWAPS.length) + SWAPS.length) % SWAPS.length];
  const A = start[sa];
  const B = start[sb];
  const tags: P[] = CHILDREN.map(() => [0, 0, 0]);
  start.forEach((child, slot) => (tags[child] = slotAt(slot)));
  const a = slotAt(sa);
  const c = slotAt(sb);
  // The tag's way through each beat; a hand on it from just after a beat starts until just before it's let go.
  const go = (q: number) => ss(q, 0.3, 0.85);
  const place = (key: DutyKey, q: number): { held: number | null; at: P } | null => {
    if (key === 'takeA') return { held: A, at: carried(a, SPARE, go(q)) };
    if (key === 'takeB') return { held: B, at: carried(c, a, go(q)) };
    if (key === 'putA') return { held: A, at: carried(SPARE, c, go(q)) };
    return null;
  };
  const order = DUTY.map((d) => d.key);
  const i = order.indexOf(k);
  if (i >= order.indexOf('takeA')) tags[A] = SPARE;
  if (i >= order.indexOf('takeB')) tags[B] = i > order.indexOf('takeB') || p >= 1 ? a : tags[B];
  if (i > order.indexOf('putA')) tags[A] = c;
  const mine = place(k, p);
  if (mine && mine.held !== null) tags[mine.held] = mine.at;

  const pose = (key: DutyKey, q: number): Key => {
    const left: P = sp(DUTY_AT, 0.2, 0.86, 0.14);
    const base = { lean: 0.14, nod: 0.3, palms: 0.2, gl: 0.3, gr: 0.5, l: left };
    const here = place(key, q);
    if (here) return { ...base, r: add(here.at, 0, -0.012, 0.02), shape: { r: 'pinch' } };
    switch (key) {
      case 'read': {
        // A finger down the rows, reading who did what last.
        const row = ss(q, 0.1, 0.9);
        return { ...base, r: [bx(CHART.x0 + 92), by(CHART.rowY + row * (CHART.rows - 1) * CHART.rowH), TAG_Z + 0.015], nod: 0.28, gr: 0.45 };
      }
      case 'press': {
        const m = slotAt(sb);
        return { ...base, r: add(m, 0, 0, 0.012 + 0.012 * (1 - Math.sin(q * Math.PI))), gr: 0.15, palms: 0.1, nod: 0.32 };
      }
      default:
        // Back a little from it, looked over, a nod.
        return { ...base, l: sp(DUTY_AT, 0.2, 0.84, 0.1), r: sp(DUTY_AT, -0.2, 0.84, 0.1), lean: 0.02, nod: 0.08 + 0.26 * pulse(t, 0.55, s), gr: 0.3 };
    }
  };
  const held = mine && b.e === 0 && mine.held !== null ? mine.held : null;
  // In the hand while it moves; reached for at the start, let go at the end.
  const resting = !!mine && (p < 0.25 || p > 0.9);
  return { beat: k, key: blended(b, pose), at: DUTY_AT, tags, held, resting };
}

// =============================================================================================

export const recordNowAt = recordNow;
export const callNowAt = callNow;
export const dutyNowAt = dutyNow;

/** Seconds into a round where each beat starts (for the lead's shots). */
export function beatTimes(m: TcMotion): Array<[string, number]> {
  return m === 'tcRecord' ? times(RECORD) : m === 'tcCall' ? times(CALL) : times(DUTY);
}

export function tcDoing(m: TcMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const ph = tcPhase(work?.point ?? b.base);
  const N = m === 'tcRecord' ? recordNow(t, ph) : m === 'tcCall' ? callNow(t, ph, b.height) : dutyNow(t, ph);
  const k = N.key;
  const w = (p: P) => {
    const q = inSpot(N.at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr }, tap: k.tap, shape: k.shape } };
}
