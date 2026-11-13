import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 한의원 (2026-10-27, the workplace pipeline, at the user's request): Korean medicine done
 * calmly and tastefully. At the treatment bed a patient lies face down, their gown open at the back:
 * the points felt for along the spine, swabbed, and fine needles tapped in through the guide tube,
 * one by one, a needle turned, two behind the knees, a word at the shoulder (따끔하세요?), left in a
 * while and taken out with a press of cotton; cups set along the back and pumped, waited on, let go
 * and the back wiped; an acute back pain pressed for, needled in the low back, 뜸 cones set on the
 * spine and lit, and the patient calmed. At the 약장 a prescription made up: drawers pulled, herbs
 * scooped onto the scale, weighed and shared out over five papers, the drawer shut, the papers
 * folded into 첩; a herb learnt (looked at, smelt, found in the book). At the 탕전기 the lid wheeled
 * open, the herb bag and the water put in, closed, set, watched; a sample drawn off for research.
 * At the pulse desk (sat): three fingers on the patient's wrist on the 맥침, eyes shut, then the
 * other wrist, the tongue looked at, the chart written; a lifestyle talk with a drawing and a
 * leaflet. And the new pieces: the infrared lamp aimed and set, cups wiped into the sterilizer and
 * 뜸 cones set out, pouches caught off the packer and boxed, herbs cut on the 작두 and rolled in the
 * 약연 (sat cross-legged), 대추차 poured for the waiting room.
 *
 * Each is a round of beats by one clock (kmPhase of the piece's fixed mark), shared with the piece
 * it's done at (workplaces/koreanMedicine.ts), so a needle shows as the tube lifts off, a drawer
 * slides as the hand pulls it, the scale reads what was scooped. Every place is in the PIECE's frame
 * (x across its front, y up from the floor, z out of its front) and turned into the dweller's own frame
 * by the spot it's done at. Kept out of activity.ts, which only hands these motions over here.
 */
export type KmMotion =
  | 'kmNeedle' | 'kmCup' | 'kmBack'
  | 'kmHerbs' | 'kmLearn'
  | 'kmBrew' | 'kmSample'
  | 'kmPulse' | 'kmCounsel'
  | 'kmLamp' | 'kmPrep' | 'kmPack' | 'kmCut' | 'kmGrind' | 'kmTea';
export const KM_MOTIONS = new Set<string>(['kmNeedle', 'kmCup', 'kmBack', 'kmHerbs', 'kmLearn', 'kmBrew', 'kmSample', 'kmPulse', 'kmCounsel', 'kmLamp', 'kmPrep', 'kmPack', 'kmCut', 'kmGrind', 'kmTea']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset from a fixed mark on the piece, so two beds aren't in step. */
export const kmPhase = (p: THREE.Vector3) => frac(p.x * 0.411 + p.z * 0.587);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;

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
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the spot, `ahead`), in the piece's frame. */
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
/** Where a round is: the beat it's on (or easing out of, `e` of the way to the next) and `p`, how far through its hold. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
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
const st = <K extends string>(key: K, hold: number, move = 0.5): Step<K> => ({ key, hold, move });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}
/** A value each beat has (given how far through it is), eased from one beat's to the next's. */
function valueOf<K extends string>(b: Beat<K>, v: (k: K, p: number) => number): number {
  return b.e > 0 ? mix(v(b.from, 1), v(b.to, 0), b.e) : v(b.from, b.p);
}
/** How far through the round a beat is (its place in the list), for "has this happened yet". */
function orderOf<K extends string>(steps: Array<Step<K>>, k: K): number {
  return steps.findIndex((s) => s.key === k);
}

/** Hands and bend, the hands in the piece's frame; the eyes shut (taking a pulse). */
export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
  shut?: boolean;
}
function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch ?? 0, b.crouch ?? 0, e), shut: e < 0.5 ? a.shut : b.shut };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(beat.from, beat.e > 0 ? 1 : beat.p);
  return beat.e > 0 ? mixKey(a, pose(beat.to, 0), beat.e) : a;
}

// =============================================================================================
// The treatment bed (침 치료 베드, 1 × 2): the head at -z against the wall, the patient face down.

/**
 * The bed in its own frame: the mattress's top, the patient's feet (z), how high their middle lies
 * over the mattress. Their back's surface is BACK, the pelvis's PELVIS.
 */
export const BED = { top: 0.66, w: 0.72, feet: 0.84, up: 0.12 };
export const BACK = BED.top + BED.up + 0.105;
export const PELVIS = BED.top + BED.up + 0.12;
/** The needles' points: six along the spine (방광경), two behind the knees (위중). */
export const NEEDLE_PTS: P[] = [
  [0.065, BACK, -0.42], [-0.065, BACK, -0.42], [0.065, BACK, -0.3], [-0.065, BACK, -0.3], [0.065, BACK, -0.18], [-0.065, BACK, -0.18],
  [0.09, BED.top + BED.up + 0.056, 0.37], [-0.09, BED.top + BED.up + 0.056, 0.37],
];
/** The cups' places, either side of the spine. */
export const CUP_PTS: P[] = [[0.075, BACK, -0.43], [-0.075, BACK, -0.43], [0.075, BACK, -0.31], [-0.075, BACK, -0.31], [0.075, BACK, -0.19], [-0.075, BACK, -0.19]];
/** An acute back pain: four needles in the low back, three 뜸 cones on the spine above them. */
export const LOW_PTS: P[] = [[0.07, BACK, -0.16], [-0.07, BACK, -0.16], [0.07, PELVIS, -0.06], [-0.07, PELVIS, -0.06]];
export const MOXA_PTS: P[] = [[0, BACK, -0.38], [0, BACK, -0.3], [0, BACK, -0.22]];
/** The little dish of 뜸 cones held in the left hand while they're set. */
export const MOXA_DISH: P = [0.22, BACK + 0.06, -0.12];
/** The needle tray on the mattress beside the thigh. */
export const TRAY: P = [0.25, BED.top + 0.012, 0.46];
/** Stood at the bed's side (the room's side, +x) by the patient's middle, facing across. */
export const BED_AT: SpotAt = { x: 0.6, y: 0, z: -0.16, yaw: -Math.PI / 2 };
/** The patient's near shoulder (for a hand on it). */
const SHOULDER: P = [0.17, BACK - 0.03, -0.48];

/**
 * Acupuncture, ~33 s round: the points felt for down the spine with both thumbs; swabbed with
 * alcohol cotton; six needles tapped in through the guide tube (the tube held on the point, the top
 * tapped, the tube lifted off), one turned gently; two behind the knees; a word at the shoulder; left
 * in a while (stood back, hands folded); taken out one by one, a press of cotton after each.
 */
export type NeedleKey = 'palp' | 'swab' | 'in0' | 'in1' | 'in2' | 'in3' | 'in4' | 'in5' | 'twirl' | 'knee0' | 'knee1' | 'ask' | 'rest' | 'out';
const NEEDLE: Array<Step<NeedleKey>> = [
  st('palp', 2.6, 0.6), st('swab', 2.2), st('in0', 1.5, 0.35), st('in1', 1.5, 0.35), st('in2', 1.5, 0.35), st('in3', 1.5, 0.35), st('in4', 1.5, 0.35), st('in5', 1.5, 0.4),
  st('twirl', 2.4), st('knee0', 1.5, 0.4), st('knee1', 1.5, 0.5), st('ask', 2.6, 0.6), st('rest', 3, 0.6), st('out', 3.4, 0.6),
];
export const needleBeat = (t: number, ph: number) => beatOf(NEEDLE, t, ph);
const NEEDLE_IN: NeedleKey[] = ['in0', 'in1', 'in2', 'in3', 'in4', 'in5', 'knee0', 'knee1'];
/** Whether needle `i` (0–7) is in. */
export function needleIn(b: Beat<NeedleKey>, i: number): boolean {
  if (b.from === 'out') return b.p * 8 < i + 0.7;
  const now = orderOf(NEEDLE, b.from);
  const at = orderOf(NEEDLE, NEEDLE_IN[i]);
  return now > at || (now === at && b.p > 0.55);
}
/** The guide tube on point `i` and how far it's lifted off (0 down on the skin). */
function tubeKey(pt: P, p: number, t: number, s: number): Key {
  const lift = ss(p, 0.55, 0.85);
  const tap = p < 0.55 ? 0.018 * pulse(t, 3.4, s, 2) : 0;
  return { l: add(pt, [0.012, 0.045 + 0.07 * lift, 0.03]), r: add(pt, [0.0, 0.105 + tap + 0.07 * lift, -0.012]), lean: 0.5, nod: 0.6, palms: 1.2, gl: 0.75, gr: 0.45 };
}
/** Where the guide tube is (its foot), held in the left hand. */
export function tubeAt(k: Key): P {
  return add(k.l, [-0.012, -0.045, -0.03]);
}
function needleKey(k: NeedleKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'palp': {
      const z = mix(-0.46, -0.14, p);
      const press = 0.012 * pulse(t, 1.4, s, 2);
      return { l: [0.07, BACK + 0.02 - press, z + 0.06], r: [-0.06, BACK + 0.02 - press, z - 0.02], lean: 0.52, nod: 0.55, palms: 1.5, gl: 0.3, gr: 0.3 };
    }
    case 'swab': {
      const i = Math.min(5, Math.floor(p * 6));
      const a = t * Math.PI * 2 * 2.2;
      return { l: [0.06, BACK + 0.02, -0.08], r: add(NEEDLE_PTS[i], [0.015 * Math.cos(a), 0.025, 0.015 * Math.sin(a)]), lean: 0.5, nod: 0.6, palms: 1.3, gl: 0.2, gr: 0.85 };
    }
    case 'twirl':
      return { l: [0.06, BACK + 0.02, -0.08], r: add(NEEDLE_PTS[2], [0.004 * wave(t, 3, s), 0.07, 0.004 * wave(t, 3, s + 0.25)]), lean: 0.5, nod: 0.62, palms: 1.1, gl: 0.2, gr: 0.6 };
    case 'knee0':
    case 'knee1': {
      // Down by the knees: the tube held and flicked in with the near hand alone, the other on the thigh.
      const pt = NEEDLE_PTS[k === 'knee0' ? 6 : 7];
      const tk = tubeKey(pt, p, t, s);
      return { ...tk, l: add(tk.l, [0, 0.012 * pulse(t, 3.4, s, 2) * (p < 0.55 ? 1 : 0), 0]), r: [0.12, BED.top + BED.up + 0.07, 0.14], lean: 0.55, gr: 0.3 };
    }
    case 'ask':
      return { l: [0.25, BED.top + 0.06, 0.05], r: SHOULDER, lean: 0.32, nod: 0.18 + 0.05 * pulse(t, 0.5, s), palms: 1.3, gl: 0.2, gr: 0.3 };
    case 'rest':
      return { l: sp(BED_AT, 0.05, 0.92, 0.2), r: sp(BED_AT, -0.05, 0.92, 0.21), lean: 0.04, nod: 0.3 + 0.05 * pulse(t, 0.25, s), palms: 0.6, gl: 0.6, gr: 0.6 };
    case 'out': {
      const j = Math.min(7, Math.floor(p * 8));
      const u = frac(p * 8);
      const pt = NEEDLE_PTS[j];
      const lift = 0.06 + 0.06 * ss(u, 0.3, 0.7);
      // Those behind the knees with the near hand, the other on the thigh.
      if (j >= 6) return { l: add(pt, [0.0, lift, 0.01]), r: [0.12, BED.top + BED.up + 0.07, 0.14], lean: 0.55, nod: 0.6, palms: 1.2, gl: 0.6, gr: 0.3 };
      return { l: add(pt, [0.02, 0.022, 0.025]), r: add(pt, [0.0, lift, -0.01]), lean: 0.5, nod: 0.6, palms: 1.2, gl: 0.8, gr: 0.6 };
    }
    default:
      return tubeKey(NEEDLE_PTS[NEEDLE_IN.indexOf(k)], p, t, s);
  }
}

/**
 * Cupping (부항), ~24 s round: a hand on the back; six cups set on, each held on the point while
 * the pump gun on its valve is squeezed (the skin rising a little into it); a check at the shoulder;
 * a wait, stood back; the cups let go one by one (the valve lifted); the back wiped with the towel.
 */
export type CupKey = 'look' | 'cup0' | 'cup1' | 'cup2' | 'cup3' | 'cup4' | 'cup5' | 'check' | 'wait' | 'off' | 'wipe';
const CUP: Array<Step<CupKey>> = [
  st('look', 1.6), st('cup0', 1.7, 0.4), st('cup1', 1.7, 0.4), st('cup2', 1.7, 0.4), st('cup3', 1.7, 0.4), st('cup4', 1.7, 0.4), st('cup5', 1.7, 0.5),
  st('check', 2.2, 0.6), st('wait', 2.8, 0.6), st('off', 3, 0.5), st('wipe', 2.2, 0.6),
];
export const cupBeat = (t: number, ph: number) => beatOf(CUP, t, ph);
const CUPS: CupKey[] = ['cup0', 'cup1', 'cup2', 'cup3', 'cup4', 'cup5'];
/** Whether cup `i` is on the back, and how far it's drawn (the skin up into it, 0–1). */
export function cupOn(b: Beat<CupKey>, i: number): number {
  if (b.from === 'off') return b.p * 6 < i + 0.6 ? 1 : 0;
  const now = orderOf(CUP, b.from);
  const at = orderOf(CUP, CUPS[i]);
  if (now > at && b.from !== 'wipe') return 1;
  if (now === at) return b.p > 0.12 ? 0.25 + 0.75 * ss(b.p, 0.25, 0.9) : 0;
  return 0;
}
/** The pump gun on the cup being drawn (in the right hand), else lying on the tray. */
export const gunHeld = (b: Beat<CupKey>) => CUPS.includes(b.from) && b.p > 0.1;
function cupKey(k: CupKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'look':
      return { l: [0.06, BACK + 0.02, -0.12], r: SHOULDER, lean: 0.4, nod: 0.45, palms: 1.4, gl: 0.2, gr: 0.3 };
    case 'check':
      return { l: [0.25, BED.top + 0.06, 0.05], r: SHOULDER, lean: 0.32, nod: 0.2 + 0.05 * pulse(t, 0.5, s), palms: 1.3, gl: 0.2, gr: 0.3 };
    case 'wait':
      return { l: sp(BED_AT, 0.05, 0.92, 0.2), r: sp(BED_AT, -0.05, 0.92, 0.21), lean: 0.04, nod: 0.32, palms: 0.6, gl: 0.6, gr: 0.6 };
    case 'off': {
      const j = Math.min(5, Math.floor(p * 6));
      const u = frac(p * 6);
      const c = CUP_PTS[j];
      return { l: add(c, [0.04, 0.0, 0.04]), r: add(c, [0.0, 0.075 + 0.08 * ss(u, 0.5, 0.9), 0.0]), lean: 0.5, nod: 0.58, palms: 1.2, gl: 0.3, gr: 0.75 };
    }
    case 'wipe': {
      const z = -0.3 + 0.13 * wave(t, 0.7, s);
      return { l: [0.03, BACK + 0.03, z + 0.08], r: [-0.04, BACK + 0.035, z - 0.06], lean: 0.5, nod: 0.55, palms: 1.5, gl: 0.5, gr: 0.5 };
    }
    default: {
      const c = CUP_PTS[CUPS.indexOf(k)];
      // The left hand holds the cup down; the right squeezes the gun on its valve.
      const sq = p > 0.25 && p < 0.9 ? pulse(t, 1.8, s, 2) : 0;
      return { l: add(c, [0.025, 0.035, 0.035]), r: add(c, [0.0, 0.16 - 0.012 * sq, -0.02]), lean: 0.5, nod: 0.58, palms: 1.1, gl: 0.7, gr: 0.6 + 0.35 * sq };
    }
  }
}

/**
 * An acute back pain (급성 요통), ~27 s round: the low back pressed for the sore spot (the patient's
 * hand goes to it); swabbed; four needles in the low back; three 뜸 cones set on the spine with the
 * tweezers and lit one by one with a stick of incense (a thread of smoke off each); a hand on the
 * shoulder, calming them; a rest; the needles out and the burnt cones lifted off.
 */
export type BackKey = 'press' | 'swab' | 'in0' | 'in1' | 'in2' | 'in3' | 'moxa' | 'light' | 'calm' | 'rest' | 'out';
const BACKS: Array<Step<BackKey>> = [
  st('press', 2.8, 0.6), st('swab', 1.8), st('in0', 1.4, 0.35), st('in1', 1.4, 0.35), st('in2', 1.4, 0.35), st('in3', 1.4, 0.5),
  st('moxa', 3, 0.5), st('light', 2.6, 0.6), st('calm', 3, 0.6), st('rest', 2.4, 0.6), st('out', 2.8, 0.6),
];
export const backBeat = (t: number, ph: number) => beatOf(BACKS, t, ph);
const LOW_IN: BackKey[] = ['in0', 'in1', 'in2', 'in3'];
export function lowNeedleIn(b: Beat<BackKey>, i: number): boolean {
  if (b.from === 'out') return b.p * 4 < i + 0.6;
  const now = orderOf(BACKS, b.from);
  const at = orderOf(BACKS, LOW_IN[i]);
  return now > at || (now === at && b.p > 0.55);
}
/** Whether 뜸 cone `i` is on, and lit. */
export function moxaOn(b: Beat<BackKey>, i: number): { on: boolean; lit: boolean } {
  const now = orderOf(BACKS, b.from);
  if (b.from === 'out') return { on: b.p < 0.75, lit: false };
  if (now < orderOf(BACKS, 'moxa')) return { on: false, lit: false };
  if (b.from === 'moxa') return { on: b.p * 3 > i + 0.6, lit: false };
  if (b.from === 'light') return { on: true, lit: b.p * 3 > i + 0.55 };
  return { on: true, lit: true };
}
/** How sore the patient is (1 at first, easing as the treatment goes on). */
export const backPain = (b: Beat<BackKey>) =>
  valueOf(b, (k, p) => (k === 'press' ? 1 : k === 'swab' ? 0.85 : LOW_IN.includes(k) ? 0.8 - 0.1 * LOW_IN.indexOf(k) : k === 'moxa' ? 0.45 : k === 'light' ? 0.35 - 0.15 * p : 0));
/** The tweezers (setting the cones) or the incense stick (lighting them) in the right hand. */
export const tweezersHeld = (b: Beat<BackKey>) => b.from === 'moxa' || (b.from === 'out' && b.p > 0.5);
export const incenseHeld = (b: Beat<BackKey>) => b.from === 'light';
function backKey(k: BackKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'press': {
      // The heel of the hand along the low back, the other hand over it.
      const z = mix(-0.26, -0.04, 0.5 + 0.5 * wave(t, 0.35, s));
      const push = 0.015 * pulse(t, 1.1, s, 2);
      return { l: [0.04, BACK + 0.04 - push, z + 0.03], r: [0.02, BACK + 0.025 - push, z - 0.04], lean: 0.55, nod: 0.55, palms: 1.5, gl: 0.2, gr: 0.2 };
    }
    case 'swab': {
      const i = Math.min(3, Math.floor(p * 4));
      const a = t * Math.PI * 2 * 2.2;
      return { l: [0.06, BACK + 0.02, -0.3], r: add(LOW_PTS[i], [0.015 * Math.cos(a), 0.025, 0.015 * Math.sin(a)]), lean: 0.5, nod: 0.6, palms: 1.3, gl: 0.2, gr: 0.85 };
    }
    case 'moxa': {
      const i = Math.min(2, Math.floor(p * 3));
      const u = frac(p * 3);
      // From the tray to the point, the cone set down.
      const tip = mixP(add(MOXA_DISH, [0.0, 0.03, 0.0]), add(MOXA_PTS[i], [0.0, 0.04, 0.0]), ss(u, 0.05, 0.55));
      return { l: MOXA_DISH, r: add(tip, [0.0, 0.06, -0.02]), lean: 0.5, nod: 0.6, palms: 1.1, gl: 0.2, gr: 0.75 };
    }
    case 'light': {
      const i = Math.min(2, Math.floor(p * 3));
      return { l: [0.07, BACK + 0.02, -0.08], r: add(MOXA_PTS[i], [0.04, 0.12 + 0.01 * wave(t, 1.2, s), 0.03]), lean: 0.46, nod: 0.6, palms: 1.0, gl: 0.2, gr: 0.8 };
    }
    case 'calm':
      return { l: [0.06, BACK + 0.02, -0.02], r: SHOULDER, lean: 0.34, nod: 0.18 + 0.06 * pulse(t, 0.45, s), palms: 1.4, gl: 0.2, gr: 0.3 };
    case 'rest':
      return { l: sp(BED_AT, 0.05, 0.92, 0.2), r: sp(BED_AT, -0.05, 0.92, 0.21), lean: 0.04, nod: 0.3, palms: 0.6, gl: 0.6, gr: 0.6 };
    case 'out': {
      const j = Math.min(3, Math.floor(p * 4));
      const u = frac(p * 4);
      const pt = LOW_PTS[j];
      return { l: add(pt, [0.02, 0.022, 0.025]), r: add(pt, [0.0, 0.06 + 0.06 * ss(u, 0.3, 0.7), -0.01]), lean: 0.52, nod: 0.6, palms: 1.2, gl: 0.8, gr: 0.6 };
    }
    default:
      return tubeKey(LOW_PTS[LOW_IN.indexOf(k)], p, t, s);
  }
}

// =============================================================================================
// The 약장 (2 × 1): the drawer wall over a worktop, the papers and the scale on it.

/**
 * The cabinet in its own frame: the worktop's top and its front edge, the drawer wall's face, the
 * small drawers' grid (columns across from `left`, rows up from `y0`), how far a drawer comes out.
 */
export const CAB = { top: 0.9, front: 0.14, face: -0.16, left: -0.95, cols: 12, rows: 7, y0: 0.96, cellW: 1.9 / 12, cellH: 0.127, out: 0.17 };
export const cellAt = (c: number, r: number): P => [CAB.left + (c + 0.5) * CAB.cellW, CAB.y0 + (r + 0.5) * CAB.cellH, CAB.face];
/** The drawers a prescription's three herbs come from (당귀, 천궁, 감초), and the one a herb's learnt from. */
export const HERB_DRAWERS: Array<[number, number]> = [[4, 2], [7, 3], [6, 1]];
export const LEARN_DRAWER: [number, number] = [5, 4];
/** The five 약포지 papers on the worktop, the scale's pan, the prescription slip, the folded 첩. */
export const PAPERS: P[] = [-0.3, -0.15, 0, 0.15, 0.3].map((x): P => [x, CAB.top + 0.003, 0.0]);
export const PAN: P = [0.56, CAB.top + 0.075, -0.02];
export const SLIP: P = [-0.55, CAB.top + 0.003, 0.06];
export const PACKETS: P = [0.84, CAB.top, 0.0];
/** Stood at the worktop's middle, facing the drawers. */
export const HERB_AT: SpotAt = { x: 0.06, y: 0, z: 0.4, yaw: Math.PI };
/** The grams a 첩's share of each herb weighs (five 첩 on the scale at once). */
export const HERB_GRAMS = [8, 6, 4];

/** A drawer's ring pull, the drawer `out` of the way out. */
const ringOf = (cr: [number, number], out: number): P => add(cellAt(cr[0], cr[1]), [0, -0.02, out * CAB.out + 0.025]);
/** Inside a drawer (its herbs), the drawer `out` of the way out. */
const insideOf = (cr: [number, number], out: number): P => add(cellAt(cr[0], cr[1]), [0, 0.0, out * CAB.out - 0.07]);

/**
 * Making up a prescription (한약 조제), ~32 s round: the slip read; for each of three herbs the drawer
 * pulled, a handful scooped into the scale's pan, weighed (a pinch more), the pan lifted and the herb
 * shared out over the five papers, the drawer pushed shut; then each paper folded into a 첩.
 */
export type HerbKey = 'read' | 'pull0' | 'scoop0' | 'weigh0' | 'pour0' | 'shut0' | 'pull1' | 'scoop1' | 'weigh1' | 'pour1' | 'shut1' | 'pull2' | 'scoop2' | 'weigh2' | 'pour2' | 'shut2' | 'fold';
const HERBS: Array<Step<HerbKey>> = [st('read', 2.2)];
for (const i of [0, 1, 2] as const) HERBS.push(st(`pull${i}`, 1.0, 0.35), st(`scoop${i}`, 1.8, 0.4), st(`weigh${i}`, 1.3, 0.4), st(`pour${i}`, 2.4, 0.4), st(`shut${i}`, 0.7, 0.4));
HERBS.push(st('fold', 3.4, 0.6));
export const herbBeat = (t: number, ph: number) => beatOf(HERBS, t, ph);
const herbOf = (k: HerbKey) => (k === 'read' || k === 'fold' ? -1 : Number(k[k.length - 1]));
const stageOf = (k: HerbKey) => k.replace(/\d$/, '');
/** How far drawer `i` is out. */
export function drawerOut(b: Beat<HerbKey>, i: number): number {
  return valueOf(b, (k, p) => {
    if (herbOf(k) !== i) return 0;
    const s = stageOf(k);
    return s === 'pull' ? ss(p, 0.1, 0.8) : s === 'shut' ? 1 - ss(p, 0.1, 0.9) : 1;
  });
}
/** How much of herb `i` is on paper `k` (0 or 1), and whether paper `k`'s been folded into a 첩. */
export function heapOn(b: Beat<HerbKey>, herb: number, paper: number): boolean {
  if (b.from === 'read') return false;
  if (b.from === 'fold') return true;
  const now = orderOf(HERBS, b.from);
  const at = orderOf(HERBS, `pour${herb}` as HerbKey);
  return now > at || (now === at && b.p > (paper + 0.6) / 5);
}
export const folded = (b: Beat<HerbKey>, paper: number) => b.from === 'fold' && b.p * 5 > paper + 0.7;
/** What's in the pan (which herb, or -1), and whether it's lifted in the hand (pouring). */
export function panOf(b: Beat<HerbKey>): { herb: number; lifted: boolean; amount: number } {
  const i = herbOf(b.from);
  const s = stageOf(b.from);
  if (i < 0) return { herb: -1, lifted: false, amount: 0 };
  if (s === 'scoop') return { herb: b.p > 0.75 ? i : -1, lifted: false, amount: 1 };
  if (s === 'weigh') return { herb: i, lifted: false, amount: 1 };
  if (s === 'pour') return { herb: i, lifted: b.p > 0.08 && b.p < 0.95, amount: 1 - b.p };
  return { herb: -1, lifted: false, amount: 0 };
}
/** What the scale reads, in grams. */
export function scaleReads(b: Beat<HerbKey>): number {
  const pan = panOf(b);
  if (pan.herb < 0 || pan.lifted) return 0;
  const g = HERB_GRAMS[pan.herb] * 5;
  return stageOf(b.from) === 'scoop' ? g - 1.5 : g;
}
/** A handful of herb in the right hand (scooping), at the hand. */
export const handful = (b: Beat<HerbKey>) => stageOf(b.from) === 'scoop' && b.p > 0.3 && b.p < 0.8;
function herbKey(k: HerbKey, p: number, t: number, s: number): Key {
  const rest: P = [-0.36, CAB.top + 0.025, 0.1];
  const i = herbOf(k);
  const stage = stageOf(k);
  if (k === 'read') return { l: add(SLIP, [0.0, 0.02, 0.0]), r: [0.12, CAB.top + 0.03, 0.1], lean: 0.18, nod: 0.62, palms: 1.4, gl: 0.1, gr: 0.3 };
  if (k === 'fold') {
    const j = Math.min(4, Math.floor(p * 5));
    const u = frac(p * 5);
    const c = PAPERS[j];
    const close = 0.06 - 0.04 * ss(u, 0.2, 0.7);
    return { l: add(c, [-close, 0.025 + 0.02 * ss(u, 0.2, 0.5), 0.0]), r: add(c, [close, 0.025 + 0.02 * ss(u, 0.2, 0.5), 0.0]), lean: 0.24, nod: 0.65, palms: 1.3, gl: 0.55, gr: 0.55 };
  }
  const cr = HERB_DRAWERS[i];
  switch (stage) {
    case 'pull': {
      const out = ss(p, 0.1, 0.8);
      return { l: rest, r: ringOf(cr, out), lean: 0.16, nod: 0.12, palms: 0.4, gl: 0.2, gr: 0.9 };
    }
    case 'scoop': {
      const into = ss(p, 0.0, 0.3);
      const over = ss(p, 0.35, 0.75);
      const hand = mixP(mixP(ringOf(cr, 1), insideOf(cr, 1), into), add(PAN, [0.0, 0.07, 0.0]), over);
      return { l: add(ringOf(cr, 1), [-0.07, 0.0, 0.0]), r: hand, lean: 0.18, nod: mix(0.12, 0.55, over), palms: mix(0.6, 1.3, over), gl: mix(0.6, 0.2, over), gr: p < 0.75 ? 0.8 : 0.25 };
    }
    case 'weigh':
      return { l: rest, r: add(PAN, [-0.03 + 0.008 * wave(t, 1.6, s), 0.06, 0.03]), lean: 0.22, nod: 0.7, palms: 1.2, gl: 0.1, gr: 0.7 };
    case 'pour': {
      // The pan carried along the papers, a share tipped onto each.
      const x = mix(PAPERS[0][0], PAPERS[4][0], ss(p, 0.08, 0.95));
      const r: P = p < 0.08 ? mixP(add(PAN, [0, 0.03, 0.03]), [PAPERS[0][0] + 0.04, CAB.top + 0.12, -0.0], ss(p, 0, 0.08)) : [x + 0.04, CAB.top + 0.12 + 0.01 * wave(t, 2.5, s), 0.0];
      return { l: rest, r, lean: 0.24, nod: 0.66, palms: 0.9, gl: 0.1, gr: 0.85 };
    }
    default: {
      const out = 1 - ss(p, 0.1, 0.9);
      return { l: rest, r: add(ringOf(cr, out), [0, 0.02, 0.0]), lean: 0.16, nod: 0.12, palms: 1.3, gl: 0.1, gr: 0.2 };
    }
  }
}

/**
 * A herb learnt (약재 구별 익히기), ~14 s round: a drawer pulled; a pinch taken; held up and looked
 * at; smelt; found in the 본초학 book held in the left hand; put back and the drawer shut.
 */
export type LearnKey = 'open' | 'pick' | 'look' | 'smell' | 'book' | 'back';
const LEARN: Array<Step<LearnKey>> = [st('open', 1.2, 0.4), st('pick', 1.4, 0.4), st('look', 2.2), st('smell', 1.8), st('book', 2.6), st('back', 1.6)];
export const learnBeat = (t: number, ph: number) => beatOf(LEARN, t, ph);
export const learnOut = (b: Beat<LearnKey>) => valueOf(b, (k, p) => (k === 'open' ? ss(p, 0.1, 0.8) : k === 'back' ? 1 - ss(p, 0.4, 0.95) : 1));
/** The pinch of herb in the right hand. */
export const pinchHeld = (b: Beat<LearnKey>) => (b.from === 'pick' && b.p > 0.5) || b.from === 'look' || b.from === 'smell' || b.from === 'book' || (b.from === 'back' && b.p < 0.35);
/** The book, open in the left hand. */
export const LEARN_BOOK: P = [-0.12, 1.1, 0.3];
function learnKey(k: LearnKey, p: number, t: number, s: number): Key {
  const book = add(LEARN_BOOK, [0.0, -0.02, 0.0]);
  switch (k) {
    case 'open':
      return { l: book, r: ringOf(LEARN_DRAWER, ss(p, 0.1, 0.8)), lean: 0.14, nod: 0.05, palms: 0.4, gl: 0.6, gr: 0.9 };
    case 'pick':
      return { l: book, r: mixP(ringOf(LEARN_DRAWER, 1), insideOf(LEARN_DRAWER, 1), ss(p, 0.1, 0.5)), lean: 0.16, nod: 0.08, palms: 1.2, gl: 0.6, gr: p > 0.5 ? 0.7 : 0.3 };
    case 'look':
      return { l: book, r: [0.03, 1.36 + 0.01 * wave(t, 0.4, s), 0.24], lean: 0.0, nod: -0.05, palms: 0.3, gl: 0.6, gr: 0.75 };
    case 'smell':
      return { l: book, r: [0.01, 1.43, 0.36], lean: 0.0, nod: 0.08, palms: 0.4, gl: 0.6, gr: 0.75 };
    case 'book':
      return { l: book, r: add(LEARN_BOOK, [0.08, 0.03, -0.03 + 0.02 * wave(t, 0.5, s)]), lean: 0.05, nod: 0.5, palms: 0.6, gl: 0.6, gr: 0.75 };
    default: {
      const back = ss(p, 0.0, 0.35);
      const shut = ss(p, 0.4, 0.95);
      return { l: book, r: back < 1 ? mixP([0.03, 1.3, 0.24], insideOf(LEARN_DRAWER, 1), back) : ringOf(LEARN_DRAWER, 1 - shut), lean: 0.15, nod: 0.1, palms: 1.2, gl: 0.6, gr: 0.4 };
    }
  }
}

// =============================================================================================
// The 탕전기 (1 × 1): the pressure tank, its lid on a hinge at the back, the panel on its front.

/** The tank (its middle, radius, body's top), the lid's hinge, the wheel, the panel, the drain, the side shelf's herb bag and jug, the gauge and the steam vent (both clear of the lid's swing). */
export const DEC = {
  cx: 0.07, cz: -0.1, r: 0.26, top: 1.0,
  hinge: [0.07, 1.04, -0.37] as P,
  wheel: [0.07, 1.16, -0.1] as P,
  panel: [0.07, 0.74, 0.17] as P,
  drain: [0.07, 0.4, 0.2] as P,
  bag: [-0.37, 0.93, -0.06] as P,
  jug: [-0.37, 0.88, 0.12] as P,
  gauge: [0.41, 1.16, -0.1] as P,
  vent: [-0.22, 1.32, -0.22] as P,
};
/** Stood at its front. */
export const DEC_AT: SpotAt = { x: -0.04, y: 0, z: 0.47, yaw: Math.PI };
/** A point on the lid, opened `open` (0–1): `out` from the hinge towards the front, `up` off it. */
export function lidPoint(open: number, out: number, up: number): P {
  const a = 1.75 * open;
  return [DEC.hinge[0], DEC.hinge[1] + up * Math.cos(a) + out * Math.sin(a), DEC.hinge[2] + out * Math.cos(a) - up * Math.sin(a)];
}
/**
 * Brewing (한약 달이기), ~21 s round: the lid's wheel turned and the lid swung up; the cloth bag of
 * herbs lowered in; water poured from the measuring jug; the lid shut and wheeled tight; the panel
 * set (the screen lights, 100℃ · 2시간); the pressure gauge watched as the steam starts.
 */
export type BrewKey = 'open' | 'bag' | 'water' | 'close' | 'set' | 'watch';
const BREW: Array<Step<BrewKey>> = [st('open', 2.4), st('bag', 2.4), st('water', 2.6), st('close', 2.2), st('set', 2.2), st('watch', 3.2, 0.7)];
export const brewBeat = (t: number, ph: number) => beatOf(BREW, t, ph);
export const lidOpen = (b: Beat<BrewKey>) => valueOf(b, (k, p) => (k === 'open' ? ss(p, 0.55, 1) : k === 'bag' || k === 'water' ? 1 : k === 'close' ? 1 - ss(p, 0, 0.4) : 0));
/** Where the herb bag is: on the shelf, in the left hand, or in the tank (hidden). */
export function bagWhere(b: Beat<BrewKey>): 'shelf' | 'hand' | 'in' {
  if (b.from === 'open' && b.e === 0) return 'shelf';
  if (b.from === 'bag') return b.p < 0.25 ? 'shelf' : b.p < 0.9 ? 'hand' : 'in';
  if (b.from === 'open') return 'shelf';
  return 'in';
}
export const jugHeld = (b: Beat<BrewKey>) => b.from === 'water' && b.p > 0.15 && b.p < 0.95;
export const pouring = (b: Beat<BrewKey>) => b.from === 'water' && b.p > 0.4 && b.p < 0.85;
/** The gauge's needle (0–1) and how hard the vent steams. */
export const brewHeat = (b: Beat<BrewKey>) => valueOf(b, (k, p) => (k === 'set' ? 0.2 * p : k === 'watch' ? 0.2 + 0.6 * p : k === 'open' ? 0.3 * (1 - p) : 0));
function brewKey(k: BrewKey, p: number, t: number, s: number): Key {
  const rim: P = [0.26, DEC.top + 0.02, 0.09];
  const turn = (a: number): Key => {
    const c = Math.cos(a) * 0.09;
    const n = Math.sin(a) * 0.09;
    return { l: add(DEC.wheel, [-c, 0.01, -n]), r: add(DEC.wheel, [c, 0.01, n]), lean: 0.28, nod: 0.5, palms: 1.3, gl: 0.85, gr: 0.85 };
  };
  switch (k) {
    case 'open': {
      if (p < 0.55) return turn(p * 5);
      // The hand follows the lid up as far as it's upright, then lets it swing back.
      const h = lidPoint(Math.min(0.5, ss(p, 0.55, 1)), 0.5, 0.05);
      return { l: [-0.2, DEC.top + 0.02, 0.06], r: add(h, [0.0, 0.02, 0.02]), lean: 0.25, nod: 0.35, palms: 0.8, gl: 0.2, gr: 0.85 };
    }
    case 'bag': {
      const top: P = [DEC.cx - 0.02, DEC.top + 0.28, DEC.cz + 0.02];
      const down: P = [DEC.cx - 0.02, DEC.top + 0.1, DEC.cz + 0.02];
      const hand = p < 0.25 ? mixP(add(DEC.bag, [0, 0.12, 0.0]), add(DEC.bag, [0, 0.08, 0.0]), ss(p, 0, 0.25)) : p < 0.7 ? mixP(add(DEC.bag, [0, 0.1, 0.0]), top, ss(p, 0.25, 0.7)) : mixP(top, down, ss(p, 0.7, 0.9));
      return { l: hand, r: rim, lean: 0.24, nod: 0.45, palms: 0.6, gl: p > 0.15 && p < 0.9 ? 0.9 : 0.3, gr: 0.4 };
    }
    case 'water': {
      const over: P = [DEC.cx - 0.08, DEC.top + 0.22, DEC.cz + 0.08];
      const hand = p < 0.15 ? add(DEC.jug, [0, 0.1, 0]) : p < 0.4 ? mixP(add(DEC.jug, [0, 0.1, 0]), over, ss(p, 0.15, 0.4)) : p < 0.85 ? over : mixP(over, add(DEC.jug, [0, 0.1, 0]), ss(p, 0.85, 1));
      return { l: hand, r: rim, lean: 0.22, nod: 0.45, palms: 0.5, gl: 0.9, gr: 0.4 };
    }
    case 'close': {
      if (p < 0.4) {
        const h = lidPoint(Math.min(0.5, 1 - ss(p, 0, 0.4)), 0.5, 0.05);
        return { l: [-0.2, DEC.top + 0.02, 0.06], r: add(h, [0.0, 0.02, 0.02]), lean: 0.25, nod: 0.35, palms: 0.8, gl: 0.2, gr: 0.85 };
      }
      return turn(-(p - 0.4) * 6);
    }
    case 'set': {
      const tap = pulse(t, 1.6, s, 3);
      const i = Math.floor(t * 1.6 + s) % 3;
      return { l: [-0.17, DEC.top + 0.02, 0.05], r: add(DEC.panel, [-0.06 + 0.06 * i, -0.03, 0.05 - 0.02 * tap]), lean: 0.12, nod: 0.45, palms: 0.2, gl: 0.2, gr: 0.4 };
    }
    default: {
      const point = pulse(t, 0.3, s, 2);
      return { l: [-0.2, DEC.top + 0.02, 0.07], r: mixP(sp(DEC_AT, -0.12, 0.95, 0.15), add(DEC.gauge, [0.0, 0.0, 0.12]), point), lean: 0.06, nod: 0.18, palms: 0.4, gl: 0.2, gr: 0.4 };
    }
  }
}

/**
 * A sample drawn for research (약재 성분 연구), ~13 s round: crouched at the drain, a beaker held
 * under it as the valve's opened; stood up and held to the light; swirled; numbers written on the
 * clipboard.
 */
export type SampleKey = 'fill' | 'look' | 'swirl' | 'note';
const SAMPLE: Array<Step<SampleKey>> = [st('fill', 3, 0.7), st('look', 2.2), st('swirl', 1.8), st('note', 3, 0.7)];
export const sampleBeat = (t: number, ph: number) => beatOf(SAMPLE, t, ph);
/** How full the beaker is. */
export const beakerFill = (b: Beat<SampleKey>) => (b.from === 'fill' ? ss(b.p, 0.2, 0.9) : b.from === 'note' && b.e > 0 ? 1 - b.e : 1);
export const valveOpen = (b: Beat<SampleKey>) => (b.from === 'fill' ? ss(b.p, 0.1, 0.25) * (1 - ss(b.p, 0.85, 0.95)) : 0);
function sampleKey(k: SampleKey, _p: number, t: number, s: number): Key {
  switch (k) {
    case 'fill':
      return { l: add(DEC.drain, [-0.0, -0.13, 0.07]), r: add(DEC.drain, [0.07, 0.01, 0.04]), lean: 0.3, nod: 0.6, palms: 0.4, gl: 0.8, gr: 0.8, crouch: 0.75 };
    case 'look':
      return { l: [-0.02, 1.42, 0.3], r: [0.08, 1.2, 0.36], lean: 0.0, nod: -0.08, palms: 0.3, gl: 0.8, gr: 0.3 };
    case 'swirl': {
      const a = t * Math.PI * 2 * 1.4;
      return { l: [-0.02 + 0.02 * Math.cos(a), 1.2, 0.32 + 0.02 * Math.sin(a)], r: [0.1, 1.05, 0.38], lean: 0.05, nod: 0.3, palms: 0.3, gl: 0.8, gr: 0.3 };
    }
    default:
      return { l: [-0.1, 1.06, 0.36], r: [0.0 + 0.02 * wave(t, 2.1, s), 1.09 + 0.005 * wave(t, 4.2, s), 0.35], lean: 0.05, nod: 0.55, palms: 1.2, gl: 0.7, gr: 0.85 };
  }
}
/** The beaker in the left hand. */
export const beakerAt = (k: Key): P => add(k.l, [0.0, -0.04, 0.0]);

// =============================================================================================
// The pulse desk (1 × 1, sat): the doctor's chair at its front, the patient on a stool at its side.

export const DESK = { top: 0.72, w: 0.86, d: 0.5, cz: -0.12 };
/** The doctor's seat (the top of it), facing the desk. */
export const DOC_AT: SpotAt = { x: 0, y: 0.47, z: 0.42, yaw: Math.PI };
/** The patient on the stool at the desk's right end, facing across it. */
export const PATIENT = { x: 0.66, z: -0.08, yaw: -Math.PI / 2, seat: 0.45 };
/** The 맥침 pulse pillow, and the patient's wrists laid on it (the left nearer the doctor). */
export const PILLOW: P = [0.28, DESK.top, -0.04];
export const WRIST_L: P = [0.29, DESK.top + 0.075, 0.0];
export const WRIST_R: P = [0.27, DESK.top + 0.075, -0.08];
/** The chart in front of the doctor. */
export const CHART: P = [0.0, DESK.top + 0.004, -0.02];
/**
 * Taking the pulse (진맥), ~21 s round: asking how they've been (문진), a hand opening towards them;
 * three fingers laid on the left wrist on the 맥침, eyes shut, still, feeling; then the right wrist;
 * the tongue looked at (설진) as they show it; the findings written on the chart.
 */
export type PulseKey = 'ask' | 'pulseL' | 'pulseR' | 'tongue' | 'note';
const PULSE: Array<Step<PulseKey>> = [st('ask', 3, 0.7), st('pulseL', 4, 0.7), st('pulseR', 4, 0.7), st('tongue', 2.6, 0.6), st('note', 3.6, 0.7)];
export const pulseBeat = (t: number, ph: number) => beatOf(PULSE, t, ph);
function pulseKey(k: PulseKey, _p: number, t: number, s: number): Key {
  const desk: P = [-0.2, DESK.top + 0.03, 0.02];
  switch (k) {
    case 'pulseL':
    case 'pulseR': {
      const w = k === 'pulseL' ? WRIST_L : WRIST_R;
      // The three fingers along the wrist, pressing lightly and easing (浮 · 中 · 沈).
      const press = 0.004 * wave(t, 0.25, s);
      return { l: desk, r: add(w, [0.0, 0.03 + press, 0.012]), lean: 0.14, nod: 0.3 + 0.03 * wave(t, 0.2, s), palms: 1.45, gl: 0.3, gr: 0.2, shut: true };
    }
    case 'tongue':
      return { l: desk, r: [0.1, DESK.top + 0.03, 0.06], lean: 0.02, nod: -0.04, palms: 1.2, gl: 0.3, gr: 0.3 };
    case 'note':
      return { l: add(CHART, [-0.12, 0.03, 0.0]), r: add(CHART, [0.04 + 0.025 * wave(t, 2.1, s), 0.03 + 0.006 * wave(t, 4.2, s), -0.01 + 0.02 * wave(t, 0.9, s)]), lean: 0.22, nod: 0.55, palms: 1.3, gl: 0.2, gr: 0.85 };
    default:
      return { l: desk, r: [0.17, DESK.top + 0.16 + 0.03 * wave(t, 0.6, s), 0.13], lean: 0.08, nod: 0.02 + 0.04 * pulse(t, 0.5, s), palms: 0.2, gl: 0.3, gr: 0.2 };
  }
}
/** Which of the patient's wrists is on the pillow (or neither), and whether they're showing their tongue. */
export function patientAt(b: Beat<PulseKey>): { wrist: 'l' | 'r' | null; tongue: number; talk: number } {
  return {
    wrist: b.from === 'pulseL' ? 'l' : b.from === 'pulseR' ? 'r' : null,
    tongue: amountOf(b, 'tongue'),
    talk: amountOf(b, 'ask'),
  };
}

/**
 * A lifestyle talk (생활 습관 상담), ~14 s round: talking, the hands going with it; drawing on a sheet
 * turned towards them (the four constitutions, what to eat and avoid); the leaflet handed across;
 * listening, nodding.
 */
export type CounselKey = 'talk' | 'draw' | 'hand' | 'nod';
const COUNSEL: Array<Step<CounselKey>> = [st('talk', 3.2, 0.6), st('draw', 3.4, 0.6), st('hand', 2.4, 0.6), st('nod', 2.6, 0.6)];
export const counselBeat = (t: number, ph: number) => beatOf(COUNSEL, t, ph);
/** Where the leaflet goes as it's handed over (the doctor's right hand, the patient's left). */
export const LEAFLET: P = [0.42, DESK.top + 0.14, -0.04];
export const SHEET: P = [0.1, DESK.top + 0.004, -0.06];
function counselKey(k: CounselKey, _p: number, t: number, s: number): Key {
  switch (k) {
    case 'draw':
      return { l: add(SHEET, [-0.1, 0.03, 0.02]), r: add(SHEET, [0.02 + 0.03 * wave(t, 1.3, s), 0.03, -0.01 + 0.02 * wave(t, 0.7, s)]), lean: 0.24, nod: 0.55, palms: 1.3, gl: 0.2, gr: 0.85 };
    case 'hand':
      return { l: [-0.18, DESK.top + 0.03, 0.02], r: add(LEAFLET, [-0.03, 0.0, 0.02]), lean: 0.2, nod: 0.1, palms: 0.6, gl: 0.2, gr: 0.7 };
    case 'nod':
      return { l: [-0.05, DESK.top + 0.04, 0.06], r: [0.05, DESK.top + 0.04, 0.07], lean: 0.1, nod: 0.08 + 0.1 * pulse(t, 0.6, s), palms: 1.0, gl: 0.6, gr: 0.6 };
    default:
      return { l: [-0.14, DESK.top + 0.14 + 0.03 * wave(t, 0.7, s + 0.3), 0.14], r: [0.16, DESK.top + 0.16 + 0.03 * wave(t, 0.6, s), 0.12], lean: 0.08, nod: 0.02, palms: 0.2, gl: 0.3, gr: 0.2 };
  }
}

// =============================================================================================
// The new pieces.

/** The infrared lamp (1 × 1): the pole at the back left, its arm out over the bed to its right. */
export const LAMP = { pole: [-0.24, -0.22] as [number, number], head: [0.92, 1.42, 0.2] as P };
export const LAMP_AT: SpotAt = { x: 0.38, y: 0, z: 0.62, yaw: 2.2 };
/**
 * Setting the lamp (적외선 치료기), ~12 s round: the head taken in both hands and tipped to the
 * back below; the timer turned; a palm held under it to feel the warmth; the timer checked.
 */
export type LampKey = 'aim' | 'dial' | 'feel' | 'check';
const LAMPS: Array<Step<LampKey>> = [st('aim', 3, 0.6), st('dial', 2), st('feel', 2.6), st('check', 2.2, 0.6)];
export const lampBeat = (t: number, ph: number) => beatOf(LAMPS, t, ph);
/** How the head's tipped (radians from its rest). */
export const lampTilt = (b: Beat<LampKey>) => (b.from === 'aim' ? 0.12 * Math.sin(b.p * Math.PI * 2) * (1 - b.e) : 0);
function lampKey(k: LampKey, _p: number, t: number, s: number): Key {
  const h = LAMP.head;
  switch (k) {
    case 'aim':
      return { l: add(h, [-0.06, -0.02, 0.15]), r: add(h, [-0.17, -0.02, -0.04]), lean: 0.05, nod: -0.1, palms: 0.6, gl: 0.8, gr: 0.8 };
    case 'dial':
      return { l: sp(LAMP_AT, 0.12, 0.92, 0.15), r: add(h, [-0.05, 0.1, 0.05 + 0.005 * wave(t, 1.5, s)]), lean: 0.05, nod: -0.15, palms: 0.4, gl: 0.3, gr: 0.85 };
    case 'feel':
      return { l: [h[0] - 0.05, h[1] - 0.38, h[2] + 0.05], r: sp(LAMP_AT, -0.14, 0.92, 0.12), lean: 0.2, nod: 0.25, palms: -1.2, gl: 0.0, gr: 0.3 };
    default:
      return { l: sp(LAMP_AT, 0.08, 0.92, 0.2), r: sp(LAMP_AT, -0.08, 0.92, 0.2), lean: 0.03, nod: -0.05 + 0.04 * pulse(t, 0.4, s), palms: 0.6, gl: 0.6, gr: 0.6 };
  }
}

/** The cupping cart (1 × 1): its top, the cups' tray, the sterilizer at the back, the 뜸 box and dish. */
export const CART = { top: 0.86, tray: [-0.14, 0.86, 0.04] as P, steri: [0.04, 0.86, -0.2] as P, moxaBox: [0.22, 0.86, 0.08] as P, dish: [0.06, 0.86, 0.12] as P, towels: [-0.2, 0.86, 0.12] as P };
export const CART_AT: SpotAt = { x: 0, y: 0, z: 0.46, yaw: Math.PI };
/**
 * Getting the cups and 뜸 ready (부항컵 소독 · 뜸 준비), ~12 s round: a cup wiped round with alcohol
 * cotton; put into the UV sterilizer (its door opened); 뜸 cones pinched from the box and set out on
 * the dish; the towels squared.
 */
export type PrepKey = 'wipe' | 'load' | 'moxa' | 'tidy';
const PREP: Array<Step<PrepKey>> = [st('wipe', 3), st('load', 2.2), st('moxa', 3), st('tidy', 2, 0.6)];
export const prepBeat = (t: number, ph: number) => beatOf(PREP, t, ph);
export const steriOpen = (b: Beat<PrepKey>) => valueOf(b, (k, p) => (k === 'load' ? ss(p, 0, 0.3) * (1 - ss(p, 0.75, 1)) : 0));
export const cupInHand = (b: Beat<PrepKey>) => b.from === 'wipe' || (b.from === 'load' && b.p < 0.6);
/** How many cones are on the dish (0–5). */
export const conesSet = (b: Beat<PrepKey>) => (b.from === 'moxa' ? Math.floor(b.p * 5.5) : b.from === 'tidy' ? 5 : 0);
function prepKey(k: PrepKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'wipe': {
      const a = t * Math.PI * 2 * 1.6;
      const cup: P = [-0.06, 1.02, 0.2];
      return { l: cup, r: add(cup, [0.045 * Math.cos(a), 0.02 + 0.02 * Math.sin(a * 0.5), 0.045 * Math.sin(a)]), lean: 0.1, nod: 0.5, palms: 0.4, gl: 0.8, gr: 0.8 };
    }
    case 'load': {
      const into = ss(p, 0.2, 0.55);
      return { l: mixP([-0.06, 1.02, 0.2], add(CART.steri, [0.0, 0.12, 0.08]), into), r: add(CART.steri, [0.2, 0.2, 0.08]), lean: 0.22, nod: 0.45, palms: 0.4, gl: 0.8, gr: 0.6 };
    }
    case 'moxa': {
      const u = frac(p * 5.5);
      const hand = mixP(add(CART.moxaBox, [0, 0.06, 0]), add(CART.dish, [0, 0.05, 0]), ss(u, 0.2, 0.6));
      return { l: [-0.16, CART.top + 0.03, 0.12], r: hand, lean: 0.22, nod: 0.6, palms: 1.2, gl: 0.2, gr: 0.75 };
    }
    default: {
      const tap = 0.01 * pulse(t, 1.2, s, 2);
      return { l: add(CART.towels, [-0.08, 0.06 + tap, 0.0]), r: add(CART.towels, [0.08, 0.06 + tap, 0.0]), lean: 0.2, nod: 0.5, palms: 0.2, gl: 0.3, gr: 0.3 };
    }
  }
}

/** The pouch packer (1 × 1): its panel, the chute's foot where the pouches land, the carton on its top. */
export const PACK = { panel: [0.22, 0.8, 0.17] as P, chuteTop: [0.06, 0.88, 0.2] as P, chuteFoot: [0.06, 0.56, 0.33] as P, carton: [0.17, 1.0, 0.0] as P };
export const PACK_AT: SpotAt = { x: 0, y: 0, z: 0.56, yaw: Math.PI };
/**
 * Packing the pouches (한약 파우치 포장), ~11 s round: the start button pressed; a pouch slides down
 * the chute and is caught; held up to check the seal and squeezed; laid in the carton; the carton's
 * label smoothed on.
 */
export type PackKey = 'start' | 'catch' | 'check' | 'box' | 'label';
const PACKS: Array<Step<PackKey>> = [st('start', 1.6, 0.4), st('catch', 2.6, 0.4), st('check', 1.8, 0.4), st('box', 2, 0.4), st('label', 1.8, 0.6)];
export const packBeat = (t: number, ph: number) => beatOf(PACKS, t, ph);
/** Where the pouch is: sliding down the chute (0–1), in the hands, or gone into the carton. */
export function pouchWhere(b: Beat<PackKey>): { chute: number; held: boolean } {
  if (b.from === 'start') return { chute: ss(b.p, 0.5, 1) * 0.6, held: false };
  if (b.from === 'catch') return b.p < 0.4 ? { chute: 0.6 + 0.4 * ss(b.p, 0, 0.4), held: false } : { chute: 1, held: true };
  if (b.from === 'check') return { chute: 1, held: true };
  if (b.from === 'box') return { chute: 1, held: b.p < 0.7 };
  return { chute: -1, held: false };
}
function packKey(k: PackKey, p: number, t: number, s: number): Key {
  const chest: P = [0.0, 1.12, 0.32];
  switch (k) {
    case 'start':
      return { l: [-0.18, 0.98, 0.12], r: add(PACK.panel, [0.0, -0.03, 0.05 - 0.02 * pulse(t, 1.4, s, 3)]), lean: 0.12, nod: 0.45, palms: 0.2, gl: 0.2, gr: 0.4 };
    case 'catch': {
      const up = ss(p, 0.45, 1);
      const at = mixP(add(PACK.chuteFoot, [0, 0.04, 0.03]), chest, up);
      return { l: add(at, [-0.05, 0, 0]), r: add(at, [0.05, 0, 0]), lean: mix(0.3, 0.04, up), nod: mix(0.6, 0.3, up), palms: 0.4, gl: 0.7, gr: 0.7, crouch: 0.35 * (1 - up) };
    }
    case 'check': {
      const sq = 0.01 * pulse(t, 1.6, s, 2);
      return { l: add(chest, [-0.05 + sq, 0.02, 0]), r: add(chest, [0.05 - sq, 0.02, 0]), lean: 0.02, nod: 0.3, palms: 0.3, gl: 0.8, gr: 0.8 };
    }
    case 'box': {
      const at = mixP(chest, add(PACK.carton, [0.0, 0.1, 0.0]), ss(p, 0.05, 0.6));
      return { l: add(at, [-0.05, 0, 0]), r: add(at, [0.05, 0, 0]), lean: 0.2, nod: 0.5, palms: 0.4, gl: p < 0.7 ? 0.7 : 0.2, gr: p < 0.7 ? 0.7 : 0.2 };
    }
    default: {
      const x = 0.08 + 0.05 * wave(t, 1, s);
      return { l: add(PACK.carton, [-0.06, 0.04, 0.12]), r: add(PACK.carton, [x - 0.08, 0.02, 0.13]), lean: 0.18, nod: 0.5, palms: 0.6, gl: 0.2, gr: 0.2 };
    }
  }
}

/** The 약연 · 작두 corner (2 × 1, a low 평상): sat cross-legged on its cushions, the tools beside. */
export const GRIND = { top: 0.32, seat: 0.37, knife: { x: -0.66, hinge: 0.27, len: 0.6, base: 0.41 }, yakyeon: { x: 0.66, z: 0.02, swing: 0.1, r: 0.085, y: 0.43 } };
/** At the 작두 (facing -x, its handle to the right hand) and at the 약연 (facing +x). */
export const CUT_AT: SpotAt = { x: -0.18, y: GRIND.seat, z: 0.05, yaw: -Math.PI / 2 };
export const GRIND_AT: SpotAt = { x: 0.18, y: GRIND.seat, z: 0.05, yaw: Math.PI / 2 };
/** The 작두's blade, lifted (radians up from the base). */
export function knifeLift(t: number, ph: number): number {
  const b = cutBeat(t, ph);
  if (b.from !== 'chop') return 0.45 * (1 - b.e);
  const u = frac(t * 0.75 + ph);
  // Slowly up, sharply down.
  return u < 0.75 ? 0.05 + 0.5 * ss(u, 0, 0.7) : 0.55 * (1 - ss(u, 0.75, 0.86)) + 0.05 * ss(u, 0.86, 1);
}
/** The handle's end with the blade lifted `a`. */
export function knifeHandle(a: number): P {
  const K = GRIND.knife;
  return [K.x, K.base + 0.03 + Math.sin(a) * K.len, K.hinge - Math.cos(a) * K.len];
}
/**
 * Cutting (작두질), ~10 s round: the handle lifted and brought down in a steady rhythm while the
 * left hand feeds the root under the blade; the cut slices swept into the 소쿠리; a new root taken.
 */
export type CutKey = 'chop' | 'gather' | 'feed';
const CUTS: Array<Step<CutKey>> = [st('chop', 6, 0.5), st('gather', 2), st('feed', 1.6)];
export const cutBeat = (t: number, ph: number) => beatOf(CUTS, t, ph);
function cutKey(k: CutKey, p: number, t: number, s: number, ph: number): Key {
  const K = GRIND.knife;
  switch (k) {
    case 'gather': {
      const z = mix(0.08, 0.22, 0.5 + 0.5 * wave(t, 0.8, s));
      return { l: [K.x + 0.1, K.base + 0.02, z], r: knifeHandle(0.45), lean: 0.4, nod: 0.6, palms: 1.4, gl: 0.2, gr: 0.85 };
    }
    case 'feed':
      return { l: mixP([K.x + 0.25, K.base, 0.3], [K.x + 0.02, K.base + 0.03, 0.12], ss(p, 0.3, 0.9)), r: knifeHandle(0.45), lean: 0.4, nod: 0.55, palms: 1.2, gl: 0.75, gr: 0.85 };
    default: {
      const a = knifeLift(t, ph);
      return { l: [K.x + 0.03, K.base + 0.035, 0.1 + 0.012 * (Math.floor(t * 0.75 + ph) % 3)], r: knifeHandle(a), lean: 0.38 + 0.08 * (0.55 - a), nod: 0.55, palms: 1.1, gl: 0.75, gr: 0.9 };
    }
  }
}
/**
 * Grinding (약연질), ~11 s round: both hands on the 연알's axle, the wheel rolled up and down the
 * trough; the powder gathered with the little brush into the bowl.
 */
export type GrindKey = 'roll' | 'scoop';
const GRINDS: Array<Step<GrindKey>> = [st('roll', 7, 0.6), st('scoop', 2.2, 0.6)];
export const grindBeat = (t: number, ph: number) => beatOf(GRINDS, t, ph);
/** The wheel's place along the trough (x) and how far it's turned. */
export function wheelAt(t: number, ph: number): { x: number; turn: number } {
  const Y = GRIND.yakyeon;
  const b = grindBeat(t, ph);
  const k = b.from === 'roll' ? 1 - b.e : b.to === 'roll' ? b.e : 0;
  const off = Y.swing * Math.sin((t * 0.55 + ph) * Math.PI * 2) * k;
  return { x: Y.x + off, turn: -off / Y.r };
}
function grindKey(k: GrindKey, _p: number, t: number, s: number, ph: number): Key {
  const Y = GRIND.yakyeon;
  if (k === 'scoop') return { l: [Y.x + 0.0, Y.y + 0.04, -0.1], r: [Y.x - 0.08 + 0.05 * wave(t, 1.3, s), Y.y + 0.03, 0.02], lean: 0.42, nod: 0.6, palms: 1.2, gl: 0.6, gr: 0.75 };
  const w = wheelAt(t, ph);
  return { l: [w.x, Y.y, Y.z - 0.13], r: [w.x, Y.y, Y.z + 0.13], lean: 0.42 + 0.1 * ((w.x - Y.x) / Y.swing), nod: 0.55, palms: 1.0, gl: 0.9, gr: 0.9 };
}

/** The 대추차 table (1 × 1): the urn's tap, the paper cups' stack. */
export const TEA = { top: 0.76, tap: [-0.12, 0.88, 0.05] as P, cups: [0.16, 0.76, -0.04] as P };
export const TEA_AT: SpotAt = { x: 0, y: 0, z: 0.46, yaw: Math.PI };
/**
 * Pouring tea for the waiting room (대추차 내기), ~10 s round: a paper cup taken off the stack; held
 * under the urn's tap as the lever's pressed; held out to someone at the right; the table wiped.
 */
export type TeaKey = 'cup' | 'pour' | 'offer' | 'tidy';
const TEAS: Array<Step<TeaKey>> = [st('cup', 1.4, 0.4), st('pour', 2.4, 0.4), st('offer', 2.4, 0.6), st('tidy', 1.8, 0.6)];
export const teaBeat = (t: number, ph: number) => beatOf(TEAS, t, ph);
export const teaCupHeld = (b: Beat<TeaKey>) => (b.from === 'cup' && b.p > 0.4) || b.from === 'pour' || b.from === 'offer';
export const teaFill = (b: Beat<TeaKey>) => (b.from === 'pour' ? ss(b.p, 0.2, 0.85) : b.from === 'offer' ? 1 : 0);
export const teaPouring = (b: Beat<TeaKey>) => b.from === 'pour' && b.p > 0.2 && b.p < 0.85;
function teaKey(k: TeaKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'cup':
      return { l: [-0.2, TEA.top + 0.03, 0.12], r: mixP(add(TEA.cups, [0, 0.16, 0]), add(TEA.cups, [0, 0.2, 0.1]), ss(p, 0.4, 1)), lean: 0.18, nod: 0.5, palms: 0.3, gl: 0.2, gr: 0.75 };
    case 'pour':
      return { l: add(TEA.tap, [0.0, 0.07, -0.02]), r: add(TEA.tap, [0.0, -0.08, 0.04]), lean: 0.18, nod: 0.5, palms: 0.3, gl: 0.6, gr: 0.75 };
    case 'offer':
      return { l: sp(TEA_AT, 0.12, 0.92, 0.15), r: sp(TEA_AT, -0.32, 1.05, 0.28 + 0.02 * wave(t, 0.5, s)), lean: 0.08, nod: 0.1, palms: 0.2, gl: 0.3, gr: 0.75 };
    default: {
      const x = 0.12 * wave(t, 0.9, s);
      return { l: [-0.2, TEA.top + 0.03, 0.12], r: [x, TEA.top + 0.025, 0.12], lean: 0.2, nod: 0.5, palms: 1.5, gl: 0.2, gr: 0.4 };
    }
  }
}

// =============================================================================================

/** The hands and where they're done from for a motion at `t` (`ph`: the piece's clock offset). */
export function kmKeyOf(m: KmMotion, t: number, ph: number): { key: Key; at: SpotAt } {
  const s = ph * 7.3;
  switch (m) {
    case 'kmNeedle':
      return { key: blended(needleBeat(t, ph), (k, p) => needleKey(k, p, t, s)), at: BED_AT };
    case 'kmCup':
      return { key: blended(cupBeat(t, ph), (k, p) => cupKey(k, p, t, s)), at: BED_AT };
    case 'kmBack':
      return { key: blended(backBeat(t, ph), (k, p) => backKey(k, p, t, s)), at: BED_AT };
    case 'kmHerbs':
      return { key: blended(herbBeat(t, ph), (k, p) => herbKey(k, p, t, s)), at: HERB_AT };
    case 'kmLearn':
      return { key: blended(learnBeat(t, ph), (k, p) => learnKey(k, p, t, s)), at: HERB_AT };
    case 'kmBrew':
      return { key: blended(brewBeat(t, ph), (k, p) => brewKey(k, p, t, s)), at: DEC_AT };
    case 'kmSample':
      return { key: blended(sampleBeat(t, ph), (k, p) => sampleKey(k, p, t, s)), at: DEC_AT };
    case 'kmPulse':
      return { key: blended(pulseBeat(t, ph), (k, p) => pulseKey(k, p, t, s)), at: DOC_AT };
    case 'kmCounsel':
      return { key: blended(counselBeat(t, ph), (k, p) => counselKey(k, p, t, s)), at: DOC_AT };
    case 'kmLamp':
      return { key: blended(lampBeat(t, ph), (k, p) => lampKey(k, p, t, s)), at: LAMP_AT };
    case 'kmPrep':
      return { key: blended(prepBeat(t, ph), (k, p) => prepKey(k, p, t, s)), at: CART_AT };
    case 'kmPack':
      return { key: blended(packBeat(t, ph), (k, p) => packKey(k, p, t, s)), at: PACK_AT };
    case 'kmCut':
      return { key: blended(cutBeat(t, ph), (k, p) => cutKey(k, p, t, s, ph)), at: CUT_AT };
    case 'kmGrind':
      return { key: blended(grindBeat(t, ph), (k, p) => grindKey(k, p, t, s, ph)), at: GRIND_AT };
    default:
      return { key: blended(teaBeat(t, ph), (k, p) => teaKey(k, p, t, s)), at: TEA_AT };
  }
}

export function kmDoing(m: KmMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = kmKeyOf(m, t, kmPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}), ...(k.shut ? { shut: true } : {}) };
}
