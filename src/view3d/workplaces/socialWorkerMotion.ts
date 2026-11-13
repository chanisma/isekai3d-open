import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 종합사회복지관 (2026-10-27, the workplace pipeline, at the user's request): a case counselled
 * across the desk, donations shelved, lunch ladled out at the 경로식당, a game of 바둑 with one of
 * the seniors, homework looked over at the 공부방, a notice pinned up, volunteers signed in, a donor's
 * hand shaken. Each is a round of beats, each held a while and eased into the next, by the same clock
 * (welfarePhase of the spot) as the piece it's done at — so the leaflet is in the hand that holds it
 * out, the box is in the arms carrying it, the ladle is over the bowl when it's poured
 * (workplaces/socialWorker.ts). Every place here is in the spot's own frame: `side` to the dweller's left,
 * `up` from the feet (stood) or the seat's top (sat), `ahead` the way they face. Kept out of
 * activity.ts (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type WelfareMotion = 'swCounsel' | 'swStock' | 'swDonor' | 'swServe' | 'swBaduk' | 'swTutor' | 'swPin' | 'swGreet';
export const WELFARE_MOTIONS = new Set<string>(['swCounsel', 'swStock', 'swDonor', 'swServe', 'swBaduk', 'swTutor', 'swPin', 'swGreet']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The same clock offset as activity.ts toolPhase: from where they're placed, so two desks aren't in step. */
export const welfarePhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;

type Step<K extends string> = { key: K; hold: number; move: number };
/** Where a round is: the beat it's on (or easing out of, `e` of the way to the next) and `p`, how far through its hold. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  /** Which time round it is (to put the next stone somewhere new). */
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
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: THREE.MathUtils.smoothstep(Math.min(1, u / k.move), 0, 1), p: 1, n };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0, n };
}
const st = <K extends string>(key: K, hold: number, move = 0.8): Step<K> => ({ key, hold, move });
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
export const addLoc = (a: Loc, b: Loc): Loc => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function mixKey(a: Key, b: Key, e: number): Key {
  const m = (q: number, r: number) => q + (r - q) * e;
  return { l: mixLoc(a.l, b.l, e), r: mixLoc(a.r, b.r, e), lean: m(a.lean, b.lean), nod: m(a.nod, b.nod), palms: m(a.palms, b.palms), gl: m(a.gl, b.gl), gr: m(a.gr, b.gr), crouch: m(a.crouch ?? 0, b.crouch ?? 0) };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K) => Key): Key {
  const a = pose(beat.from);
  return beat.e > 0 ? mixKey(a, pose(beat.to), beat.e) : a;
}
/** Where something placed by the beat is, eased between the beats' places. */
function placed<K extends string>(beat: Beat<K>, at: (k: K) => Loc): Loc {
  return beat.e > 0 ? mixLoc(at(beat.from), at(beat.to), beat.e) : at(beat.from);
}

// ---------------------------------------------------------------------------------------------
// The case desk (사례 상담): sat behind it, the 이용자 across.

/**
 * Counselling a case, ~33 s round: listening, the hands folded on the desk, nodding along; a hand
 * reached across the desk, laid flat by theirs (it's all right); the case note written up; listening
 * again; a leaflet (기초생활보장 안내) held out across the desk to them; a last line in the note.
 */
export type CounselKey = 'listen' | 'reassure' | 'note' | 'leaflet';
const COUNSEL: Array<Step<CounselKey>> = [st('listen', 5, 0.9), st('reassure', 3.5, 1), st('note', 4.5), st('listen', 3), st('leaflet', 3.5, 1), st('note', 3)];
export const counselBeat = (t: number, phase: number) => beatOf(COUNSEL, t, phase);
/** The desk's top from the seat, the note pad on it, and where the leaflet's held out to across it. */
export const CASE = { top: 0.265, pad: [0.06, 0.27, 0.38] as Loc, leaflet: [-0.03, 0.36, 0.66] as Loc };
function counselKey(k: CounselKey, t: number, s: number): Key {
  const top = CASE.top + 0.01;
  switch (k) {
    case 'reassure':
      return { l: [0.03, top, 0.6], r: [-0.08, top, 0.31], lean: 0.34, nod: 0.06 + 0.06 * pulse(t, 0.45, s), palms: 1.5, gl: 0, gr: 0.3 };
    case 'note': {
      const pad = CASE.pad;
      return { l: [pad[0] + 0.13, top, pad[2] - 0.04], r: [pad[0] - 0.02 + 0.025 * wave(t, 2.2, s), top + 0.012 + 0.006 * wave(t, 4.4, s), pad[2] + 0.02 * wave(t, 1.1, s)], lean: 0.3, nod: 0.45, palms: 1.25, gl: 0.2, gr: 0.85 };
    }
    case 'leaflet':
      return { l: [0.1, top, 0.32], r: CASE.leaflet, lean: 0.3, nod: 0.06, palms: 0.5, gl: 0.25, gr: 0.6 };
    default:
      return { l: [0.07, top, 0.3], r: [-0.05, top + 0.02, 0.31], lean: 0.14, nod: 0.02 + 0.08 * pulse(t, 0.4, s), palms: 1.2, gl: 0.35, gr: 0.35 };
  }
}
/** Whether the leaflet's in the hand (out to them and back). */
export const leafletOut = (b: Beat<CounselKey>) => amountOf(b, 'leaflet') > 0.25;

// ---------------------------------------------------------------------------------------------
// The donation shelf (후원 물품): a box from the floor up onto the shelf, ticked off in the 입고 대장.

/**
 * Shelving a donation, ~13 s round: crouched to the box on the floor at the left, lifted to the
 * chest, up onto the shelf, pushed home, ticked off on the clipboard hanging on the post, a look
 * along the shelf.
 */
export type StockKey = 'crouch' | 'lift' | 'place' | 'push' | 'tick' | 'look';
const STOCK: Array<Step<StockKey>> = [st('crouch', 1.2, 1), st('lift', 0.8, 0.9), st('place', 0.6, 0.5), st('push', 0.6, 0.6), st('tick', 2.4, 0.7), st('look', 1.6, 0.9)];
export const stockBeat = (t: number, phase: number) => beatOf(STOCK, t, phase);
/** The box on the floor (its middle), held, set on the shelf and pushed in; the clipboard on the post. */
export const STOCK_AT = { floor: [0.46, 0.12, 0.16] as Loc, held: [0.05, 1.0, 0.3] as Loc, set: [0, 1.06, 0.5] as Loc, slot: [0, 1.06, 0.62] as Loc, clip: [-0.38, 1.22, 0.38] as Loc };
export function stockBox(b: Beat<StockKey>): Loc {
  // Round again: the next box is already on the floor.
  if (b.from === 'look' && b.e > 0) return STOCK_AT.floor;
  return placed(b, (k) => (k === 'crouch' ? STOCK_AT.floor : k === 'lift' ? STOCK_AT.held : k === 'place' ? STOCK_AT.set : STOCK_AT.slot));
}
function stockKey(k: StockKey, t: number, s: number): Key {
  const sides = (c: Loc, w: number, dy = 0): Pick<Key, 'l' | 'r'> => ({ l: [c[0] + w, c[1] + dy, c[2]], r: [c[0] - w, c[1] + dy, c[2]] });
  switch (k) {
    case 'crouch':
      return { ...sides(STOCK_AT.floor, 0.19, 0.03), lean: 0.4, nod: 0.5, palms: 0, gl: 0.5, gr: 0.5, crouch: 1 };
    case 'lift':
      return { ...sides(STOCK_AT.held, 0.19), lean: 0.04, nod: 0.25, palms: 0, gl: 0.5, gr: 0.5 };
    case 'place':
      return { ...sides(STOCK_AT.set, 0.19), lean: 0.12, nod: 0.15, palms: 0, gl: 0.5, gr: 0.5 };
    case 'push':
      return { l: [0.08, 1.05, 0.47], r: [-0.08, 1.05, 0.47], lean: 0.16, nod: 0.18, palms: 0.9, gl: 0, gr: 0 };
    case 'tick': {
      const c = STOCK_AT.clip;
      return { l: [0.22, 1.08, 0.42], r: [c[0] + 0.03 * wave(t, 1.3, s), c[1] - 0.03 + 0.012 * wave(t, 3.1, s), c[2] - 0.02], lean: 0.05, nod: 0.18, palms: 1.1, gl: 0.4, gr: 0.85 };
    }
    default:
      return { l: [0.2, 0.95, 0.04], r: [-0.2, 0.95, 0.04], lean: 0, nod: -0.12 + 0.05 * wave(t, 0.3, s), palms: 0.6, gl: 0.6, gr: 0.6 };
  }
}

/**
 * A donor come in (the 동네 빵집's owner with a 협약서), stood face to face, ~15 s round: talking it
 * through, a hand making the point; the agreement held up in both hands; the handshake — the left
 * hand under the right forearm, a little bow, as it's done here.
 */
export type DonorKey = 'talk' | 'show' | 'shake';
const DONOR: Array<Step<DonorKey>> = [st('talk', 4.5), st('show', 3), st('shake', 3, 1), st('talk', 3)];
export const donorBeat = (t: number, phase: number) => beatOf(DONOR, t, phase);
/** Where the hands meet in the handshake. */
export const SHAKE_AT: Loc = [-0.03, 0.98, 0.4];
function donorKey(k: DonorKey, t: number, s: number): Key {
  switch (k) {
    case 'show':
      return { l: [0.13, 1.02, 0.32], r: [-0.13, 1.02, 0.32], lean: 0.06, nod: 0.25, palms: 0.4, gl: 0.55, gr: 0.55 };
    case 'shake':
      return { l: [0.0, 0.95, 0.27], r: [SHAKE_AT[0], SHAKE_AT[1] + 0.025 * wave(t, 1.7), SHAKE_AT[2]], lean: 0.16, nod: 0.22, palms: 0.1, gl: 0.4, gr: 0.8 };
    default:
      return { l: [0.18, 0.86, 0.12], r: [-0.16, 0.98 + 0.06 * wave(t, 0.7, s), 0.3 + 0.04 * wave(t, 0.9, s)], lean: 0.02, nod: -0.04 + 0.05 * pulse(t, 0.5, s), palms: -0.4, gl: 0.3, gr: 0.15 };
  }
}

// ---------------------------------------------------------------------------------------------
// The 경로식당 serving counter: 국 ladled into the tray, the tray slid over, a little bow.

/**
 * Serving lunch, ~11 s round: the ladle dipped in the soup pot, lifted across and poured into the
 * bowl on the tray, hung back on the pot's rim, the tray slid over to the senior with both hands,
 * a little bow (맛있게 드세요).
 */
export type ServeKey = 'dip' | 'pour' | 'hook' | 'hand' | 'greet';
const SERVE: Array<Step<ServeKey>> = [st('dip', 1.8, 0.8), st('pour', 1.6, 0.6), st('hook', 0.5, 0.5), st('hand', 1.4, 0.6), st('greet', 1.6, 0.8)];
export const serveBeat = (t: number, phase: number) => beatOf(SERVE, t, phase);
/** The broth in the pot, the soup bowl on the tray (its middle), the tray as it's served and slid over. */
export const SERVE_AT = { pot: [-0.2, 0.97, 0.43] as Loc, bowl: [0.13, 0.95, 0.77] as Loc, tray: [0.05, 0.905, 0.73] as Loc, slid: 0.26 };
/** Where the ladle's bowl is, and whether it's in the hand at all (else hung on the pot). */
export function ladleOf(b: Beat<ServeKey>): { bowl: Loc; held: boolean; tip: number } {
  const held = (b.from === 'dip' || b.from === 'pour' || (b.from === 'hook' && b.e === 0)) || (b.to === 'dip' && b.e > 0.9);
  const bowl = placed(b, (k) => (k === 'pour' ? SERVE_AT.bowl : SERVE_AT.pot));
  const tip = amountOf(b, 'pour') * Math.min(1, b.from === 'pour' ? b.p * 2 : 1);
  return { bowl, held, tip };
}
/** Whether the bowl on the tray's full yet, how far the tray's been slid over, and whether it's gone. */
export function trayOf(b: Beat<ServeKey>): { full: boolean; slid: number; gone: boolean } {
  const full = (b.from === 'pour' && b.p > 0.45) || b.from === 'hook' || b.from === 'hand' || (b.from === 'pour' && b.e > 0);
  const slid = b.from === 'hand' ? (b.e > 0 ? 1 : THREE.MathUtils.smoothstep(b.p, 0.1, 0.8)) : 0;
  return { full, slid, gone: b.from === 'greet' };
}
function serveKey(k: ServeKey, t: number, s: number): Key {
  const edge: Loc = [0.26, 0.9, 0.28];
  switch (k) {
    case 'dip': {
      const p = SERVE_AT.pot;
      return { l: edge, r: [p[0] + 0.03 * Math.cos(t * 4 + s), p[1] + 0.24, p[2] - 0.13 + 0.02 * Math.sin(t * 4 + s)], lean: 0.2, nod: 0.45, palms: 0.4, gl: 0.6, gr: 0.9 };
    }
    case 'pour': {
      const p = SERVE_AT.bowl;
      return { l: [0.2, 0.92, 0.6], r: [p[0] - 0.02, p[1] + 0.2, p[2] - 0.15], lean: 0.32, nod: 0.5, palms: 0.4 + 0.5 * Math.min(1, 1), gl: 0.5, gr: 0.9 };
    }
    case 'hook': {
      const p = SERVE_AT.pot;
      return { l: edge, r: [p[0], p[1] + 0.2, p[2] - 0.1], lean: 0.2, nod: 0.4, palms: 0.4, gl: 0.6, gr: 0.7 };
    }
    case 'hand': {
      const p = SERVE_AT.tray;
      return { l: [p[0] + 0.18, p[1] + 0.02, p[2] + 0.12], r: [p[0] - 0.18, p[1] + 0.02, p[2] + 0.12], lean: 0.34, nod: 0.3, palms: 1.2, gl: 0.3, gr: 0.3 };
    }
    default:
      return { l: [0.04, 0.84, 0.16], r: [-0.04, 0.84, 0.17], lean: 0.3, nod: 0.32, palms: 0.4, gl: 0.4, gr: 0.4 };
  }
}

// ---------------------------------------------------------------------------------------------
// The seniors' corner: a game of 바둑.

/**
 * A move at 바둑, sat at the board, ~11 s round: a long think, the chin on the hand; a black stone
 * taken from the bowl, set down on the point with a click (somewhere new each move); the hands back
 * while the senior across thinks and plays white.
 */
export type BadukKey = 'think' | 'pick' | 'place' | 'watch';
const BADUK: Array<Step<BadukKey>> = [st('think', 3, 0.8), st('pick', 0.6, 0.7), st('place', 0.9, 0.7), st('watch', 4, 0.9)];
export const badukBeat = (t: number, phase: number) => beatOf(BADUK, t, phase);
/** The board's middle from the seat (its playing face), how far apart the lines are, the black stones' bowl. */
export const BADUK_AT = { board: [0, 0.335, 0.72] as Loc, pitch: 0.0235, bowl: [-0.27, 0.33, 0.38] as Loc };
/** The point the `n`th move's stone goes on: [across (to the dweller's left), along (away from them)] in lines from the middle. */
export function badukPoint(n: number): [number, number] {
  const r = frac(Math.sin(n * 12.9898) * 43758.5453);
  const q = frac(Math.sin(n * 78.233) * 12345.678);
  return [Math.round((r - 0.5) * 12), Math.round((q - 0.5) * 12)];
}
export function badukStoneAt(n: number): Loc {
  const [a, b] = badukPoint(n);
  return [BADUK_AT.board[0] + a * BADUK_AT.pitch, BADUK_AT.board[1] + 0.008, BADUK_AT.board[2] + b * BADUK_AT.pitch];
}
function badukKey(k: BadukKey, t: number, s: number, n: number): Key {
  switch (k) {
    case 'think':
      return { l: [0.16, 0.3, 0.38], r: [-0.04, 0.64, 0.2], lean: 0.24, nod: 0.3 + 0.03 * wave(t, 0.3, s), palms: 0.3, gl: 0.3, gr: 0.6 };
    case 'pick': {
      const b = BADUK_AT.bowl;
      return { l: [0.16, 0.3, 0.38], r: [b[0], b[1] + 0.06, b[2]], lean: 0.25, nod: 0.45, palms: 1.2, gl: 0.3, gr: 0.6 };
    }
    case 'place': {
      const p = badukStoneAt(n);
      return { l: [0.16, 0.3, 0.38], r: [p[0], p[1] + 0.02 + 0.03 * (1 - pulse(t, 1.2, s, 2)), p[2] - 0.02], lean: 0.4, nod: 0.55, palms: 1.3, gl: 0.3, gr: 0.75 };
    }
    default:
      return { l: [0.12, 0.29, 0.36], r: [-0.12, 0.29, 0.36], lean: 0.2, nod: 0.45 + 0.04 * wave(t, 0.25, s), palms: 1.2, gl: 0.35, gr: 0.35 };
  }
}
/** Whether a black stone's between the fingers (from the bowl to the board). */
export const stoneInHand = (b: Beat<BadukKey>) => b.from === 'pick' || (b.from === 'place' && b.e === 0 && b.p < 0.5) || (b.from === 'think' && b.e > 0.6);

// ---------------------------------------------------------------------------------------------
// The 방과후 공부방: homework looked over across the table.

/**
 * Helping with homework, ~15 s round: explaining (an open hand), leant in pointing along the line
 * in the child's 익힘책, listening to them work it out, a tick on the page, a thumbs up (잘했어!).
 */
export type TutorKey = 'explain' | 'point' | 'listen' | 'check' | 'praise';
const TUTOR: Array<Step<TutorKey>> = [st('explain', 3.5), st('point', 3), st('listen', 3), st('check', 2.2, 0.7), st('praise', 1.6)];
export const tutorBeat = (t: number, phase: number) => beatOf(TUTOR, t, phase);
/** The table's top from the seat, and the child's open book. */
export const TUTOR_AT = { top: 0.21, book: [0.05, 0.22, 0.6] as Loc };
function tutorKey(k: TutorKey, t: number, s: number): Key {
  const top = TUTOR_AT.top;
  const b = TUTOR_AT.book;
  switch (k) {
    case 'point':
      return { l: [0.18, top, 0.3], r: [b[0] - 0.06 + 0.07 * frac(t * 0.35 + s), b[1] + 0.01, b[2] - 0.03], lean: 0.42, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.55 };
    case 'listen':
      return { l: [0.12, top, 0.3], r: [-0.12, top, 0.3], lean: 0.25, nod: 0.3 + 0.07 * pulse(t, 0.45, s), palms: 1.2, gl: 0.35, gr: 0.35 };
    case 'check':
      return { l: [0.18, top, 0.3], r: [b[0] + 0.02 * wave(t, 2.5, s), b[1] + 0.012 + 0.008 * pulse(t, 2.5, s, 2), b[2] - 0.05], lean: 0.42, nod: 0.5, palms: 1.25, gl: 0.3, gr: 0.85 };
    case 'praise':
      return { l: [0.14, top, 0.3], r: [-0.1, 0.55, 0.36], lean: 0.12, nod: -0.02, palms: 0, gl: 0.3, gr: 0.95 };
    default:
      return { l: [0.15, top, 0.3], r: [-0.16, 0.4 + 0.04 * wave(t, 0.7, s), 0.34], lean: 0.18, nod: 0.08, palms: -0.5, gl: 0.3, gr: 0.15 };
  }
}

// ---------------------------------------------------------------------------------------------
// The 프로그램 안내 board: a new notice pinned up.

/**
 * Pinning up a notice, ~8 s round: held up flat by its top corners, a pin pressed in at each, the
 * sheet smoothed down, a step's look at it.
 */
export type PinKey = 'hold' | 'pinL' | 'pinR' | 'smooth' | 'look';
const PIN: Array<Step<PinKey>> = [st('hold', 1.2, 0.5), st('pinL', 0.7, 0.5), st('pinR', 0.7, 0.6), st('smooth', 1.4, 0.7), st('look', 2.2, 0.8)];
export const pinBeat = (t: number, phase: number) => beatOf(PIN, t, phase);
/** The new notice's middle (its face on the board, `ahead` from the feet), and its half width and height. */
export const PIN_AT = { sheet: [-0.1, 1.42, 0.42] as Loc, hw: 0.12, hh: 0.16 };
function pinKey(k: PinKey, t: number, s: number): Key {
  const [x, y, z] = PIN_AT.sheet;
  const tl: Loc = [x + PIN_AT.hw, y + PIN_AT.hh - 0.02, z - 0.02];
  const tr: Loc = [x - PIN_AT.hw, y + PIN_AT.hh - 0.02, z - 0.02];
  const press = 0.012 * pulse(t, 2.2, s, 2);
  switch (k) {
    case 'pinL':
      return { l: [tl[0], tl[1], tl[2] + press], r: [tr[0] + 0.03, tr[1] - 0.08, tr[2]], lean: 0.05, nod: -0.2, palms: 1.5, gl: 0.7, gr: 0.1 };
    case 'pinR':
      return { l: [tl[0] - 0.02, tl[1] - 0.06, tl[2]], r: [tr[0], tr[1], tr[2] + press], lean: 0.05, nod: -0.2, palms: 1.5, gl: 0.1, gr: 0.7 };
    case 'smooth':
      return { l: [x + 0.05, y - 0.03, z - 0.01], r: [x - 0.1 + 0.08 * wave(t, 0.8, s), y - 0.06 + 0.04 * wave(t, 0.4, s), z - 0.01], lean: 0.05, nod: -0.12, palms: 1.5, gl: 0, gr: 0 };
    case 'look':
      return { l: [0.2, 0.92, 0.06], r: [-0.12, 1.05, 0.18], lean: -0.03, nod: -0.16, palms: 0.4, gl: 0.6, gr: 0.4 };
    default:
      return { l: tl, r: tr, lean: 0.04, nod: -0.18, palms: 1.5, gl: 0.6, gr: 0.6 };
  }
}
/** Whether the new notice is up yet (pinned from the first pin on), and whether it's in the hands. */
export const noticeUp = (b: Beat<PinKey>) => b.from !== 'hold';

// ---------------------------------------------------------------------------------------------
// The volunteers' sign-in stand.

/**
 * Signing in a volunteer, ~13 s round: a little bow to greet them (어서 오세요), talking them
 * through the day, a finger on the line in the 활동 일지 where they sign, a name tag handed over,
 * more talk.
 */
export type GreetKey = 'bow' | 'talk' | 'point' | 'give';
const GREET: Array<Step<GreetKey>> = [st('bow', 1.4, 0.8), st('talk', 3), st('point', 2.6), st('give', 1.8), st('talk', 2.4)];
export const greetBeat = (t: number, phase: number) => beatOf(GREET, t, phase);
/** The book's open page on the stand's top, and where the name tag's held out to them. */
export const GREET_AT = { book: [0.02, 1.04, 0.36] as Loc, tag: [-0.06, 1.1, 0.64] as Loc };
function greetKey(k: GreetKey, t: number, s: number): Key {
  switch (k) {
    case 'bow':
      return { l: [0.05, 0.86, 0.17], r: [-0.05, 0.86, 0.18], lean: 0.38 * Math.min(1, 1), nod: 0.32, palms: 0.4, gl: 0.4, gr: 0.4 };
    case 'point': {
      const b = GREET_AT.book;
      return { l: [0.2, 1.03, 0.26], r: [b[0] - 0.05 + 0.08 * frac(t * 0.4 + s), b[1] + 0.01, b[2]], lean: 0.2, nod: 0.4, palms: 1.2, gl: 0.35, gr: 0.55 };
    }
    case 'give':
      return { l: [0.2, 1.03, 0.26], r: GREET_AT.tag, lean: 0.14, nod: 0.08, palms: 0.4, gl: 0.35, gr: 0.6 };
    default:
      return { l: [0.2, 1.03, 0.26], r: [-0.17, 1.12 + 0.05 * wave(t, 0.7, s), 0.32], lean: 0.03, nod: -0.04 + 0.05 * pulse(t, 0.5, s), palms: -0.5, gl: 0.35, gr: 0.15 };
  }
}
/** Whether the name tag's in the hand. */
export const tagOut = (b: Beat<GreetKey>) => amountOf(b, 'give') > 0.3;

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a motion, in the spot's frame (the pieces put what's held at these). */
export function welfareKey(m: WelfareMotion, t: number, phase: number): Key {
  const s = phase * 7.1;
  switch (m) {
    case 'swCounsel':
      return blended(counselBeat(t, phase), (k) => counselKey(k, t, s));
    case 'swStock':
      return blended(stockBeat(t, phase), (k) => stockKey(k, t, s));
    case 'swDonor':
      return blended(donorBeat(t, phase), (k) => donorKey(k, t, s));
    case 'swServe':
      return blended(serveBeat(t, phase), (k) => serveKey(k, t, s));
    case 'swBaduk': {
      const b = badukBeat(t, phase);
      return blended(b, (k) => badukKey(k, t, s, b.n));
    }
    case 'swTutor':
      return blended(tutorBeat(t, phase), (k) => tutorKey(k, t, s));
    case 'swPin':
      return blended(pinBeat(t, phase), (k) => pinKey(k, t, s));
    default:
      return blended(greetBeat(t, phase), (k) => greetKey(k, t, s));
  }
}

export function welfareDoing(m: WelfareMotion, b: BodyAt, _work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const k = welfareKey(m, t, welfarePhase(b.base));
  const w = (p: Loc) => b.base.clone().addScaledVector(left, p[0]).addScaledVector(fwd, p[2]).setY(b.base.y + p[1]);
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
