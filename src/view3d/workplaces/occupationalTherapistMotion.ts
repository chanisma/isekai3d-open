import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 작업치료실 (2026-10-27, the workplace pipeline, at the user's request): fine-motor training
 * across the table with a stroke patient (the pegboard, a hand guided over theirs, therapy putty, the
 * buttoning board, beads picked up with tweezers), a child's urgent 발달 평가 timed with the
 * stopwatch, a junior therapist coached at the table, a thermoplastic splint moulded on a forearm,
 * mirror therapy at the mirror box, a dressing and sit-to-stand session in the ADL room, 화투 pairs and a
 * puzzle at the cognitive table, the assessment kit checked (the grip dynamometer squeezed, the
 * goniometer opened). Each is a round of beats, each held a while and eased into the next, by the same
 * clock (otPhase of the spot) as the piece it's done at — the peg is in the client's hand as it goes
 * into the board, the splint is on the arm once it's draped, the cards face up as they're turned
 * (workplaces/occupationalTherapist.ts). Every place is in the spot's own frame: `side` to the dweller's
 * left, `up` from the feet (stood) or the seat's top (sat), `ahead` the way they face. Kept out of
 * activity.ts (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type OtMotion = 'otHand' | 'otAssess' | 'otCoach' | 'otSplint' | 'otMirror' | 'otAdl' | 'otCognitive' | 'otKit';
export const OT_MOTIONS = new Set<string>(['otHand', 'otAssess', 'otCoach', 'otSplint', 'otMirror', 'otAdl', 'otCognitive', 'otKit']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The same clock offset as activity.ts toolPhase: from where they're placed, so two tables aren't in step. */
export const otPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
export const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
export const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;

type Step<K extends string> = { key: K; hold: number; move: number };
/** Where a round is: the beat it's on (or easing out of, `e` of the way to the next), `p` how far through its hold, `n` which round, `i` which step. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  n: number;
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
export const mixLoc = (a: Loc, b: Loc, e: number): Loc => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
function mixKey(a: Key, b: Key, e: number): Key {
  const m = (q: number, r: number) => q + (r - q) * e;
  return { l: mixLoc(a.l, b.l, e), r: mixLoc(a.r, b.r, e), lean: m(a.lean, b.lean), nod: m(a.nod, b.nod), palms: m(a.palms, b.palms), gl: m(a.gl, b.gl), gr: m(a.gr, b.gr), crouch: m(a.crouch ?? 0, b.crouch ?? 0) };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K) => Key): Key {
  const a = pose(beat.from);
  return beat.e > 0 ? mixKey(a, pose(beat.to), beat.e) : a;
}

// ---------------------------------------------------------------------------------------------
// The fine-motor table: sat behind it on the therapist's stool, the client across.

/**
 * Where things are on the fine-motor table, in the piece's own frame (x across, y up, z out to the
 * front): the therapist's stool (the spot) behind it, the client's chair across it, the pegboard with
 * its peg well, the cushion the weak hand rests on, the bead tray and its cup, the buttoning board,
 * the putty tub. The table (workplaces/occupationalTherapist.ts) is drawn from the same numbers.
 */
export const FMT = {
  top: 0.72,
  seat: [0, 0.48, -0.33] as Loc,
  chair: [0.02, 0.56] as [number, number],
  board: [-0.02, 0.12] as [number, number],
  hole: 0.045,
  well: [-0.02, 0.255] as [number, number],
  cushion: [-0.29, 0.22] as [number, number],
  beads: [0.2, 0.27] as [number, number],
  cup: [0.31, 0.28] as [number, number],
  buttons: [0.4, 0.08] as [number, number],
  putty: [-0.5, 0.0] as [number, number],
  form: [-0.32, 0.0] as [number, number],
  test: [0.02, 0.22] as [number, number],
  /** Where the lead stands to coach, and which way they face (at the pegboard). */
  coach: [0.52, -0.3] as [number, number],
};
/** A place on the table top (piece x, z) in the sat therapist's frame. */
const onTable = (x: number, z: number, dy = 0.01): Loc => [x - FMT.seat[0], FMT.top - FMT.seat[1] + dy, z - FMT.seat[2]];
/** The pegboard's hole `i` (0–15, row by row from the therapist's side), piece x and z. */
export function holeAt(i: number): [number, number] {
  const c = i % 4;
  const r = Math.floor(i / 4) % 4;
  return [FMT.board[0] + (c - 1.5) * FMT.hole, FMT.board[1] + (r - 1.5) * FMT.hole];
}

/**
 * A fine-motor session, ~31 s round: the client puts pegs into the board from the well with their good
 * hand (the therapist steadying the board and pointing to the next hole), the therapist's hand over
 * the weak one guiding it from its cushion to a hole and back, both kneading therapy putty (the
 * therapist showing how), the buttoning board (the flap held, the button shown through), beads picked
 * out of the tray with the tweezers and dropped in the cup (the cup held steady), a clap (잘하셨어요!).
 */
export type HandKey = 'pegs' | 'guide' | 'putty' | 'button' | 'beads' | 'praise';
const HAND: Array<Step<HandKey>> = [st('pegs', 6), st('guide', 5, 0.9), st('putty', 4.5), st('button', 4.5), st('beads', 5), st('praise', 2, 0.9)];
export const handBeat = (t: number, phase: number) => beatOf(HAND, t, phase);
/** How many pegs are in (they come out again at the round's end), and how many beads in the cup. */
export function handCounts(b: Beat<HandKey>): { pegs: number; beads: number } {
  const pegs = b.i === 0 ? Math.floor(b.p * 6) : b.i === 1 ? 6 + Math.floor(b.p * 2) : b.i < 5 ? 8 : b.e > 0.5 ? 0 : 8;
  const beads = b.i === 4 ? Math.floor(b.p * 5) : b.i === 5 ? (b.e > 0.5 ? 0 : 5) : 0;
  return { pegs, beads };
}
/** The client's good hand going back and forth (0 at the well or tray, 1 at the hole or cup), a trip every 1 s. */
export const tripOf = (t: number, s: number) => 0.5 - 0.5 * Math.cos(frac(t * 1 + s) * Math.PI * 2);
/** The weak hand as it's guided (0 on its cushion, 1 at its hole). */
export const guidedOf = (t: number, s: number) => 0.5 - 0.5 * Math.cos(frac(t * 0.45 + s) * Math.PI * 2);
function handKey(k: HandKey, t: number, s: number): Key {
  const edge = onTable(FMT.board[0] + 0.12, FMT.board[1]);
  switch (k) {
    case 'guide': {
      const h = holeAt(5);
      const g = mixLoc(onTable(FMT.cushion[0], FMT.cushion[1], 0.04), onTable(h[0], h[1], 0.05), guidedOf(t, s));
      return { l: edge, r: [g[0], g[1] + 0.025, g[2] - 0.01], lean: 0.42, nod: 0.5, palms: 1.4, gl: 0.3, gr: 0.45 };
    }
    case 'putty': {
      const sq = 0.012 * pulse(t, 1.1, s, 2);
      return { l: [0.05 - sq, 0.33, 0.3], r: [-0.05 + sq, 0.33, 0.3], lean: 0.14, nod: 0.3, palms: 0.4, gl: 0.6 + 0.35 * pulse(t, 1.1, s, 2), gr: 0.6 + 0.35 * pulse(t, 1.1, s, 2) };
    }
    case 'button': {
      const b = FMT.buttons;
      return { l: onTable(b[0] + 0.07, b[1] - 0.02, 0.06), r: onTable(b[0] - 0.04 + 0.02 * wave(t, 0.8, s), b[1] + 0.01, 0.08), lean: 0.34, nod: 0.45, palms: 1.1, gl: 0.6, gr: 0.75 };
    }
    case 'beads': {
      const c = FMT.cup;
      return { l: onTable(c[0], c[1] - 0.05, 0.04), r: onTable(FMT.beads[0] - 0.06, FMT.beads[1] - 0.1, 0.08 + 0.02 * wave(t, 0.6, s)), lean: 0.36, nod: 0.5, palms: 1.2, gl: 0.6, gr: 0.2 };
    }
    case 'praise': {
      const c = 0.035 * Math.abs(wave(t, 2.2, s));
      return { l: [0.03 + c, 0.38, 0.3], r: [-0.03 - c, 0.38, 0.3], lean: 0.08, nod: 0.05, palms: 0.05, gl: 0.05, gr: 0.05 };
    }
    default: {
      // Steadying the board, pointing to the next hole.
      const h = holeAt(2 + (Math.floor(t + s) % 4));
      return { l: edge, r: onTable(h[0], h[1] - 0.04, 0.06 + 0.015 * pulse(t, 1, s, 2)), lean: 0.36, nod: 0.5, palms: 1.3, gl: 0.3, gr: 0.6 };
    }
  }
}

/**
 * The urgent 발달 평가 of a child at the same table, ~21 s round: the nine-hole peg test shown (the
 * pegs put in quick), timed with the stopwatch while the child does it, the score written on the
 * form, a word with the child, a sticker held out to them.
 */
export type AssessKey = 'demo' | 'time' | 'write' | 'talk' | 'sticker';
const ASSESS: Array<Step<AssessKey>> = [st('demo', 3), st('time', 6.5), st('write', 4), st('talk', 2.5), st('sticker', 2.2, 0.8)];
export const assessBeat = (t: number, phase: number) => beatOf(ASSESS, t, phase);
/** How many of the nine pegs are in (the therapist's in the demo, the child's while timed). */
export function assessPegs(b: Beat<AssessKey>): number {
  if (b.i === 0) return Math.min(9, Math.floor(b.p * 10));
  if (b.i === 1) return Math.min(9, Math.floor(b.p * 10));
  if (b.i === 4 && b.e > 0.5) return 0;
  return 9;
}
function assessKey(k: AssessKey, t: number, s: number): Key {
  const tst = FMT.test;
  switch (k) {
    case 'demo':
      return { l: onTable(tst[0] + 0.14, tst[1] - 0.02), r: onTable(tst[0] - 0.04 + 0.08 * frac(t * 0.9 + s), tst[1] + 0.02, 0.04 + 0.03 * pulse(t, 1.8, s, 2)), lean: 0.4, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.75 };
    case 'time':
      return { l: [0.12, 0.36, 0.3], r: onTable(-0.12, 0.05), lean: 0.2, nod: 0.38, palms: 0.4, gl: 0.75, gr: 0.3 };
    case 'write': {
      const f = FMT.form;
      return { l: onTable(f[0] + 0.12, f[1] - 0.02), r: onTable(f[0] - 0.01 + 0.025 * wave(t, 2.2, s), f[1] + 0.01, 0.012 + 0.006 * wave(t, 4.4, s)), lean: 0.3, nod: 0.45, palms: 1.25, gl: 0.2, gr: 0.85 };
    }
    case 'talk':
      return { l: onTable(0.12, 0.0), r: [-0.1, 0.34 + 0.03 * wave(t, 0.7, s), 0.32], lean: 0.12, nod: 0.08, palms: -0.4, gl: 0.3, gr: 0.15 };
    default:
      return { l: onTable(0.12, 0.0), r: onTable(0.06, 0.36, 0.1), lean: 0.36, nod: 0.2, palms: 0.6, gl: 0.3, gr: 0.6 };
  }
}

/**
 * Coaching a junior therapist at the table (the lead's), ~22 s round: watching with the arms folded,
 * pointing at how the client's hand is held, leaning in to show the grip over the junior's hand, a
 * note on the clipboard, a nod and a word.
 */
export type CoachKey = 'watch' | 'point' | 'show' | 'note' | 'nod';
const COACH: Array<Step<CoachKey>> = [st('watch', 5), st('point', 3.5), st('show', 4.5, 0.9), st('note', 4), st('nod', 2.5)];
export const coachBeat = (t: number, phase: number) => beatOf(COACH, t, phase);
/** The coach's facing: from where they stand toward the pegboard. */
export const COACH_YAW = Math.atan2(FMT.board[0] - FMT.coach[0], FMT.board[1] - FMT.coach[1]);
/** How far ahead of the coach the pegboard is. */
const COACH_REACH = Math.hypot(FMT.board[0] - FMT.coach[0], FMT.board[1] - FMT.coach[1]);
function coachKey(k: CoachKey, t: number, s: number): Key {
  const top = FMT.top;
  switch (k) {
    case 'point':
      return { l: [0.14, 0.98, 0.16], r: [-0.02, top + 0.16 + 0.02 * wave(t, 0.8, s), COACH_REACH - 0.14], lean: 0.32, nod: 0.5, palms: 0.6, gl: 0.4, gr: 0.75 };
    case 'show':
      return { l: [0.06, top + 0.05, COACH_REACH - 0.06], r: [-0.06, top + 0.06 + 0.012 * wave(t, 0.9, s), COACH_REACH - 0.04], lean: 0.55, nod: 0.55, palms: 1.3, gl: 0.4, gr: 0.4, crouch: 0.25 };
    case 'note':
      return { l: [0.1, 1.0, 0.28], r: [0.04 + 0.03 * wave(t, 1.8, s), 1.03 + 0.008 * wave(t, 3.6, s), 0.3], lean: 0.05, nod: 0.5, palms: 0.8, gl: 0.7, gr: 0.85 };
    case 'nod':
      return { l: [0.18, 0.88, 0.1], r: [-0.14, 1.0 + 0.04 * wave(t, 0.7, s), 0.3], lean: 0.05, nod: 0.12 + 0.08 * pulse(t, 0.8, s), palms: -0.5, gl: 0.3, gr: 0.15 };
    default:
      return { l: [0.07, 1.06, 0.17], r: [-0.07, 1.04, 0.19], lean: 0.02, nod: 0.3 + 0.04 * wave(t, 0.3, s), palms: 0.2, gl: 0.5, gr: 0.5 };
  }
}

// ---------------------------------------------------------------------------------------------
// The splint table: a thermoplastic splint moulded on the client's forearm.

/** The splint table in its own frame: the stool, the client's chair, the splint pan, where the forearm lies. */
export const SPL = {
  top: 0.72,
  seat: [0, 0.48, -0.33] as Loc,
  chair: [0.1, 0.56] as [number, number],
  pan: [-0.45, 0.02] as [number, number],
  /** The client's hand on the rest (wrist), and the elbow end of the forearm. */
  wrist: [0.2, 0.8, 0.14] as Loc,
  elbow: [0.28, 0.79, 0.4] as Loc,
  rest: [0.22, 0.24] as [number, number],
};
const onSplint = (x: number, y: number, z: number): Loc => [x - SPL.seat[0], y - SPL.seat[1], z - SPL.seat[2]];
/**
 * Making a resting splint, ~31 s round: the forearm measured with the tape (wrist to elbow), the
 * softened sheet lifted out of the 70℃ pan, draped over the forearm, moulded round the wrist and the
 * palm with both hands while it sets, trimmed along its edge with the scissors, the velcro straps
 * wound on, the fit checked (the hand lifted, the wrist eased).
 */
export type SplintKey = 'measure' | 'heat' | 'drape' | 'mould' | 'trim' | 'strap' | 'check';
const SPLINT: Array<Step<SplintKey>> = [st('measure', 3.5), st('heat', 4), st('drape', 1.6, 0.6), st('mould', 6), st('trim', 4), st('strap', 3.5), st('check', 3, 0.9)];
export const splintBeat = (t: number, phase: number) => beatOf(SPLINT, t, phase);
/** Where the splint is: 0 in the pan, 1 carried, 2 on the arm, 3 strapped. */
export function splintState(b: Beat<SplintKey>): number {
  if (b.i <= 1) return b.i === 1 && b.e > 0.4 ? 1 : 0;
  if (b.i === 2) return b.e > 0.5 ? 2 : 1;
  if (b.i <= 4) return 2;
  if (b.i === 5) return b.p > 0.5 || b.e > 0 ? 3 : 2;
  return b.e > 0.6 ? 0 : 3;
}
function splintKey(k: SplintKey, t: number, s: number): Key {
  const w = SPL.wrist;
  const el = SPL.elbow;
  const mid = (u: number, dy = 0.03): Loc => onSplint(w[0] + (el[0] - w[0]) * u, w[1] + dy, w[2] + (el[2] - w[2]) * u);
  switch (k) {
    case 'measure':
      return { l: mid(0.95, 0.04), r: mid(0.0, 0.04), lean: 0.42, nod: 0.5, palms: 1.2, gl: 0.6, gr: 0.6 };
    case 'heat': {
      const p = SPL.pan;
      const lift = 0.05 * Math.max(0, wave(t, 0.5, s));
      return { l: onSplint(p[0] + 0.07, SPL.top + 0.12 + lift, p[1] + 0.02), r: onSplint(p[0] - 0.07, SPL.top + 0.12 + lift, p[1] + 0.02), lean: 0.32, nod: 0.5, palms: 1.3, gl: 0.6, gr: 0.6 };
    }
    case 'drape':
      return { l: mid(0.7, 0.1), r: mid(0.1, 0.1), lean: 0.38, nod: 0.5, palms: 1.3, gl: 0.5, gr: 0.5 };
    case 'mould': {
      const u = 0.25 + 0.2 * wave(t, 0.35, s);
      return { l: mid(u + 0.25, 0.045), r: mid(u - 0.15, 0.045), lean: 0.44, nod: 0.52, palms: 1.5, gl: 0.2, gr: 0.2 };
    }
    case 'trim':
      return { l: mid(0.6, 0.05), r: mid(0.05 + 0.5 * frac(t * 0.25 + s), 0.06), lean: 0.4, nod: 0.5, palms: 0.6, gl: 0.6, gr: 0.5 + 0.4 * Math.abs(wave(t, 2.4, s)) };
    case 'strap': {
      const a = t * Math.PI * 2 * 0.6 + s;
      const m = mid(0.45, 0.02);
      return { l: mid(0.8, 0.05), r: [m[0] + 0.06 * Math.cos(a), m[1] + 0.04 + 0.04 * Math.sin(a), m[2]], lean: 0.42, nod: 0.5, palms: 1.0, gl: 0.6, gr: 0.75 };
    }
    default:
      return { l: mid(-0.1, 0.05 + 0.03 * pulse(t, 0.5, s, 2)), r: mid(0.25, 0.04), lean: 0.4, nod: 0.45, palms: 1.6, gl: 0.5, gr: 0.4 };
  }
}

// ---------------------------------------------------------------------------------------------
// The mirror box: the weak hand hidden, the good one moving before the mirror.

/** The mirror table: the stool, the client's chair, the box's mirror (x = 0) and where the good hand works. */
export const MIR = { top: 0.72, seat: [0, 0.48, -0.3] as Loc, chair: [0, 0.56] as [number, number], box: [0, 0.1] as [number, number], hand: [0.12, 0.76, 0.12] as Loc, pad: [-0.28, 0.0] as [number, number] };
const onMirror = (x: number, y: number, z: number): Loc => [x - MIR.seat[0], y - MIR.seat[1], z - MIR.seat[2]];
/**
 * Mirror therapy, ~24 s round: the therapist's own hand up showing the fist opened and closed, the
 * client copying with the good hand before the mirror (in it, the weak hand seems to move); fingers
 * tapped on the table in time, the therapist tapping along on the box; the good hand stroked with a
 * soft brush; a ball rolled to and fro under the palm while the therapist watches; a note.
 */
export type MirrorKey = 'open' | 'tap' | 'touch' | 'roll' | 'note';
const MIRROR: Array<Step<MirrorKey>> = [st('open', 5.5), st('tap', 4), st('touch', 4.5), st('roll', 4.5), st('note', 2.8, 0.9)];
export const mirrorBeat = (t: number, phase: number) => beatOf(MIRROR, t, phase);
/** How the client's good hand moves (in the piece's frame, from MIR.hand) and how far it's closed (0–1). */
export function mirrorHand(b: Beat<MirrorKey>, t: number, s: number): { dx: number; dy: number; dz: number; close: number } {
  const open = amountOf(b, 'open');
  const tap = amountOf(b, 'tap');
  const roll = amountOf(b, 'roll');
  const close = open * (0.5 + 0.5 * wave(t, 0.5, s));
  return { dx: 0, dy: 0.03 * open + 0.02 * tap * pulse(t, 1.6, s, 3) + 0.035 * roll, dz: 0.07 * roll * wave(t, 0.4, s), close };
}
function mirrorKey(k: MirrorKey, t: number, s: number): Key {
  const h = MIR.hand;
  switch (k) {
    case 'open':
      return { l: onMirror(0.18, MIR.top + 0.01, 0.0), r: [-0.13, 0.42, 0.28], lean: 0.08, nod: 0.12, palms: -0.2, gl: 0.5 * (0.5 + 0.5 * wave(t, 0.5, s)) + 0.1, gr: 0.9 * (0.5 + 0.5 * wave(t, 0.5, s)) };
    case 'tap':
      return { l: onMirror(0.18, MIR.top + 0.01, 0.0), r: onMirror(-0.02, MIR.top + 0.32 + 0.025 * pulse(t, 1.6, s, 3), MIR.box[1] - 0.05), lean: 0.22, nod: 0.3, palms: 1.4, gl: 0.3, gr: 0.6 };
    case 'touch':
      return { l: onMirror(0.2, MIR.top + 0.01, 0.0), r: onMirror(h[0] + 0.04 * wave(t, 0.8, s), h[1] + 0.05, h[2] - 0.02), lean: 0.4, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.8 };
    case 'roll':
      return { l: [0.06, MIR.top - MIR.seat[1] + 0.01, 0.26], r: [-0.06, MIR.top - MIR.seat[1] + 0.01, 0.27], lean: 0.18, nod: 0.3 + 0.04 * wave(t, 0.3, s), palms: 1.3, gl: 0.3, gr: 0.3 };
    default: {
      const p = MIR.pad;
      return { l: onMirror(p[0] + 0.13, MIR.top + 0.01, p[1] - 0.02), r: onMirror(p[0] - 0.01 + 0.025 * wave(t, 2.2, s), MIR.top + 0.02 + 0.006 * wave(t, 4.4, s), p[1] + 0.01), lean: 0.3, nod: 0.45, palms: 1.25, gl: 0.2, gr: 0.85 };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The ADL room: dressing and a sit-to-stand from the bed's edge.

/**
 * The ADL room in its own frame: the bed's edge where the client sits (facing +x), the transfer pole
 * at their left, where the therapist stands before them (facing -x), the client's feet.
 */
export const ADL = { stand: [0.52, 0.15] as [number, number], client: [-0.14, 0.15] as [number, number], seat: 0.46, up: [0.06, 0.15] as [number, number], pole: [0.12, -0.2] as [number, number], feet: 0.33 };
/** A place in the room's frame (x, y, z) in the stood therapist's (they face -x, their left is +z). */
const onAdl = (x: number, y: number, z: number): Loc => [z - ADL.stand[1], y, ADL.stand[0] - x];
/**
 * A dressing and transfer session, ~29 s round: crouched at the client's feet guiding the sock aid
 * (they pull it up by its cords), up to point them through the buttons (a button hook in their hand),
 * hands on their shoulders to get ready (하나, 둘, 셋), a hand on each side of the gait belt as they
 * stand (the pole in their hand), guarding while they stand, lowering them back to the bed, a thumbs up.
 */
export type AdlKey = 'sock' | 'button' | 'ready' | 'rise' | 'hold' | 'lower' | 'praise';
const ADL_STEPS: Array<Step<AdlKey>> = [st('sock', 5.5, 0.9), st('button', 4.5), st('ready', 2), st('rise', 1.6, 0.4), st('hold', 4.5), st('lower', 1.8, 0.5), st('praise', 2.2, 0.9)];
export const adlBeat = (t: number, phase: number) => beatOf(ADL_STEPS, t, phase);
/** Whether the client's up on their feet (from halfway through the rise to halfway through the lowering). */
export function adlStanding(b: Beat<AdlKey>): boolean {
  return (b.i === 3 && (b.p > 0.5 || b.e > 0)) || b.i === 4 || (b.i === 5 && b.p < 0.5);
}
function adlKey(k: AdlKey, t: number, s: number): Key {
  const c = ADL.client;
  switch (k) {
    case 'sock':
      return { l: onAdl(ADL.feet - 0.02, 0.14, c[1] - 0.04), r: onAdl(ADL.feet - 0.02, 0.14 + 0.05 * frac(t * 0.4 + s), c[1] - 0.16), lean: 0.4, nod: 0.45, palms: 0.8, gl: 0.6, gr: 0.6, crouch: 0.85 };
    case 'button':
      return { l: onAdl(0.4, 0.86, c[1] + 0.18), r: onAdl(c[0] + 0.22, 0.9 + 0.03 * wave(t, 0.6, s), c[1] - 0.02), lean: 0.2, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.75 };
    case 'ready':
      return { l: onAdl(c[0] + 0.14, 0.96, c[1] + 0.17), r: onAdl(c[0] + 0.14, 0.96, c[1] - 0.17), lean: 0.42, nod: 0.25, palms: 0.6, gl: 0.4, gr: 0.4, crouch: 0.2 };
    case 'rise':
    case 'lower':
      return { l: onAdl(c[0] + 0.2, 0.72, c[1] + 0.16), r: onAdl(c[0] + 0.2, 0.72, c[1] - 0.16), lean: 0.45, nod: 0.25, palms: 0.4, gl: 0.8, gr: 0.8, crouch: 0.35 };
    case 'hold': {
      const u = ADL.up;
      return { l: onAdl(u[0] + 0.05, 0.92 + 0.01 * wave(t, 0.3, s), u[1] + 0.17), r: onAdl(u[0] + 0.05, 0.92, u[1] - 0.17), lean: 0.2, nod: 0.15, palms: 0.4, gl: 0.8, gr: 0.8, crouch: 0.08 };
    }
    default:
      return { l: onAdl(0.45, 0.86, c[1] + 0.18), r: [-0.12, 1.12 + 0.02 * wave(t, 1.2, s), 0.3], lean: 0.02, nod: 0.05, palms: -1.2, gl: 0.3, gr: 0.95 };
  }
}

// ---------------------------------------------------------------------------------------------
// The cognitive table: 화투 pairs, a puzzle, the clock drawn.

/** The cognitive table in its own frame: the stool, the client's chair, the 화투 grid, the clock sheet, the puzzle and its pieces. */
export const COG = {
  top: 0.72,
  seat: [0, 0.48, -0.33] as Loc,
  chair: [0, 0.56] as [number, number],
  grid: [-0.28, 0.12] as [number, number],
  card: [0.06, 0.085] as [number, number],
  sheet: [0.03, 0.22] as [number, number],
  puzzle: [0.32, 0.12] as [number, number],
  tray: [0.54, -0.04] as [number, number],
};
const onCog = (x: number, z: number, dy = 0.01): Loc => [x - COG.seat[0], COG.top - COG.seat[1] + dy, z - COG.seat[2]];
/** The 화투 grid's card `i` (0–11, four across, three deep from the client's side), piece x and z. */
export function cardAt(i: number): [number, number] {
  const c = i % 4;
  const r = Math.floor(i / 4) % 3;
  return [COG.grid[0] + (c - 1.5) * COG.card[0], COG.grid[1] + (1 - r) * COG.card[1]];
}
/**
 * Cognitive training, ~27 s round: 화투 짝 맞추기 — the therapist turns a card, the client turns the one
 * they think matches, the pair taken off with a clap; a puzzle piece handed across and fitted; the
 * clock drawn (the therapist pointing at the numbers as the client writes them in); a word of praise.
 */
export type CogKey = 'flip' | 'match' | 'puzzle' | 'clock' | 'praise';
const COGS: Array<Step<CogKey>> = [st('flip', 5), st('match', 2.4), st('puzzle', 5.5), st('clock', 5.5), st('praise', 2, 0.9)];
export const cogBeat = (t: number, phase: number) => beatOf(COGS, t, phase);
/** Which two cards this round's pair is (round by round round the grid), and how many puzzle pieces are in (0–4). */
export function cogRound(b: Beat<CogKey>): { a: number; b: number; up: number; pieces: number } {
  const r = ((b.n % 6) + 6) % 6;
  const a = (r * 5) % 12;
  const c = (a + 7) % 12;
  const up = b.i === 0 ? (b.p < 0.35 ? 0 : b.p < 0.7 ? 1 : 2) : b.i === 1 ? (b.p < 0.6 ? 2 : 3) : 3;
  const pieces = b.i < 2 ? 0 : b.i === 2 ? Math.floor(b.p * 3) : 3;
  return { a, b: c, up, pieces };
}
function cogKey(k: CogKey, t: number, s: number, a: number): Key {
  switch (k) {
    case 'flip': {
      const ca = cardAt(a);
      return { l: onCog(COG.grid[0] + 0.25, COG.grid[1] - 0.12), r: onCog(ca[0], ca[1] - 0.02, 0.02 + 0.03 * pulse(t, 0.5, s, 2)), lean: 0.36, nod: 0.5, palms: 1.3, gl: 0.3, gr: 0.6 };
    }
    case 'match': {
      const c = 0.035 * Math.abs(wave(t, 2.2, s));
      return { l: [0.03 + c, 0.38, 0.3], r: [-0.03 - c, 0.38, 0.3], lean: 0.08, nod: 0.12, palms: 0.05, gl: 0.05, gr: 0.05 };
    }
    case 'puzzle': {
      const tr = COG.tray;
      const u = 0.5 - 0.5 * Math.cos(frac(t * 0.36 + s) * Math.PI * 2);
      const from = onCog(tr[0], tr[1], 0.02);
      const to = onCog(COG.puzzle[0] - 0.02, COG.puzzle[1] + 0.2, 0.08);
      return { l: onCog(0.05, -0.02), r: mixLoc(from, to, u), lean: 0.32, nod: 0.4, palms: 0.9, gl: 0.3, gr: 0.7 };
    }
    case 'clock': {
      const sh = COG.sheet;
      const a2 = t * 0.9 + s;
      return { l: onCog(sh[0] + 0.15, sh[1] - 0.12), r: onCog(sh[0] + 0.05 * Math.cos(a2), sh[1] + 0.05 * Math.sin(a2), 0.03), lean: 0.38, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.75 };
    }
    default:
      return { l: onCog(0.12, -0.02), r: [-0.1, 0.36 + 0.03 * wave(t, 0.7, s), 0.32], lean: 0.1, nod: 0.06, palms: -0.4, gl: 0.3, gr: 0.15 };
  }
}

// ---------------------------------------------------------------------------------------------
// The assessment cabinet: the kit checked.

/** The cabinet in its own frame: where they stand (facing it), its door's hinge and handle, the shelf, the log sheet. */
export const KIT = { stand: [0, 0.32] as [number, number], face: -0.07, hinge: -0.42, handle: [0.36, 1.3] as [number, number], shelf: [0.05, 1.33, -0.24] as Loc, log: [0.22, 0.85] as [number, number] };
/** A place in the cabinet's frame in the stood checker's (they face -z, their left is -x). */
const onKit = (x: number, y: number, z: number): Loc => [KIT.stand[0] - x, y, KIT.stand[1] - z];
/**
 * Checking the assessment kit, ~21 s round: the glass door opened, the grip dynamometer taken off its
 * shelf, squeezed three times (the needle up to its mark), the goniometer's arms opened and closed
 * against its scale, the calibration log ticked, the kit put back and the door shut.
 */
export type KitKey = 'open' | 'take' | 'squeeze' | 'goni' | 'tick' | 'close';
const KITS: Array<Step<KitKey>> = [st('open', 1.4, 0.6), st('take', 1.4, 0.7), st('squeeze', 4.5), st('goni', 4), st('tick', 3), st('close', 1.6, 0.9)];
export const kitBeat = (t: number, phase: number) => beatOf(KITS, t, phase);
/** How far the door's open (0 shut, 1 open), and what's in the hands. */
export function kitOf(b: Beat<KitKey>): { door: number; dyna: boolean; goni: boolean } {
  const door = b.i === 0 ? Math.min(1, b.p * 1.4 + b.e) : b.i === 5 ? Math.max(0, 1 - b.p * 1.2 - b.e) : 1;
  return { door, dyna: b.i === 2 || (b.i === 1 && b.e > 0.4), goni: b.i === 3 && b.e < 0.5 };
}
function kitKey(k: KitKey, t: number, s: number): Key {
  const sh = KIT.shelf;
  switch (k) {
    case 'open':
    case 'close': {
      const h = KIT.handle;
      return { l: [0.2, 0.86, 0.06], r: onKit(h[0], h[1], KIT.face + 0.03), lean: 0.06, nod: 0.1, palms: 0.2, gl: 0.3, gr: 0.85 };
    }
    case 'take':
      return { l: onKit(sh[0] + 0.06, sh[1], sh[2] + 0.1), r: onKit(sh[0] - 0.04, sh[1], sh[2] + 0.1), lean: 0.12, nod: 0.05, palms: 0.4, gl: 0.6, gr: 0.75 };
    case 'squeeze': {
      const q = pulse(t, 0.7, s, 2);
      return { l: [0.06, 1.0, 0.27], r: [-0.08, 1.02, 0.3], lean: 0.04, nod: 0.42, palms: 0.2, gl: 0.5, gr: 0.5 + 0.5 * q };
    }
    case 'goni': {
      const o = 0.05 * wave(t, 0.4, s);
      return { l: [0.07 + o, 1.06, 0.3], r: [-0.07 - o, 1.06, 0.3], lean: 0.04, nod: 0.38, palms: 0.4, gl: 0.7, gr: 0.7 };
    }
    default: {
      const g = KIT.log;
      return { l: [0.2, 0.9, 0.12], r: onKit(g[0] + 0.02 * wave(t, 1.8, s), g[1] + 0.01 * wave(t, 3.6, s), KIT.face + 0.02), lean: 0.12, nod: 0.3, palms: 1.4, gl: 0.3, gr: 0.85 };
    }
  }
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a motion, in the spot's frame (the pieces put what's held at these). */
export function otKey(m: OtMotion, t: number, phase: number): Key {
  const s = phase * 7.1;
  switch (m) {
    case 'otHand':
      return blended(handBeat(t, phase), (k) => handKey(k, t, s));
    case 'otAssess':
      return blended(assessBeat(t, phase), (k) => assessKey(k, t, s));
    case 'otCoach':
      return blended(coachBeat(t, phase), (k) => coachKey(k, t, s));
    case 'otSplint':
      return blended(splintBeat(t, phase), (k) => splintKey(k, t, s));
    case 'otMirror':
      return blended(mirrorBeat(t, phase), (k) => mirrorKey(k, t, s));
    case 'otAdl':
      return blended(adlBeat(t, phase), (k) => adlKey(k, t, s));
    case 'otCognitive': {
      const b = cogBeat(t, phase);
      const a = cogRound(b).a;
      return blended(b, (k) => cogKey(k, t, s, a));
    }
    default:
      return blended(kitBeat(t, phase), (k) => kitKey(k, t, s));
  }
}

export function otDoing(m: OtMotion, b: BodyAt, _work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const k = otKey(m, t, otPhase(b.base));
  const w = (p: Loc) => b.base.clone().addScaledVector(left, p[0]).addScaledVector(fwd, p[2]).setY(b.base.y + p[1]);
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
