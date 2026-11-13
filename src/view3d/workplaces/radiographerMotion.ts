import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 영상의학센터 (2026-10-27, the workplace pipeline, at the user's request): radiography done
 * calmly and safely, nothing gory. At the chest stand a patient in a gown is set up — chest to the
 * detector, arms round it, chin up on its top — the collimator's light lined up on their back, then
 * the radiographer steps round behind the lead-glass screen, says 숨 들이마시고 참으세요 and presses
 * the hand switch (the 촬영 중 lamp lights), and the chest comes up on the console. At the CT the
 * patient is settled on the table (head in the holder, a strap), the gantry's buttons raise the
 * table under the red lasers and slide them into the bore, then from the console behind its lead
 * glass the scan is run (the bore lit, the slices appearing one by one), checked, and the table
 * brought out again; an urgent CT the same, quicker, the patient in a neck collar; a contrast CT with
 * the injector's line connected to the cannula first. At the MRI: headphones, the head coil, the
 * squeeze ball into the hand, slid in, the scan run with a word over the intercom. At the linac the
 * patient is lined up to the green lasers by the sheet under them and the marks checked, the couch
 * raised from its pendant, and from the console the gantry swung round them in an arc (치료 중), then
 * the couch lowered and a hand on the shoulder; or a few quiet minutes at their side. And the new
 * pieces: the control-room console (reading, dictating, the dose log), a lead apron held up and
 * checked, the contrast injector filled and purged, the changing booth's gowns folded.
 *
 * Each is a round of beats by one clock (rgPhase of the piece's fixed mark), shared with the piece it's
 * done at (workplaces/radiographer.ts), which moves the spot along as the radiographer steps from the
 * patient to the console and back (`at` of each beat). Every place is in the PIECE's frame (x across
 * its front, y up from the floor, z out of its front). Kept out of activity.ts, which only hands these
 * motions over here.
 */
export type RgMotion =
  | 'rgXray'
  | 'rgCt' | 'rgCtUrgent' | 'rgCtContrast' | 'rgRecon'
  | 'rgMri'
  | 'rgLinac' | 'rgComfort'
  | 'rgPacs' | 'rgApron' | 'rgInject' | 'rgGown';
export const RG_MOTIONS = new Set<string>(['rgXray', 'rgCt', 'rgCtUrgent', 'rgCtContrast', 'rgRecon', 'rgMri', 'rgLinac', 'rgComfort', 'rgPacs', 'rgApron', 'rgInject', 'rgGown']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset from a fixed mark on the piece, so two machines aren't in step. */
export const rgPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
export const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
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
const at = (x: number, z: number, yaw: number, y = 0): SpotAt => ({ x, y, z, yaw });
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
function mixYaw(a: number, b: number, e: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * e;
}
const mixAt = (a: SpotAt, b: SpotAt, e: number): SpotAt => ({ x: mix(a.x, b.x, e), y: mix(a.y, b.y, e), z: mix(a.z, b.z, e), yaw: mixYaw(a.yaw, b.yaw, e) });

/** A beat: held `hold` seconds at `at`, then `move` seconds easing into the next (stepping to its place). */
type Step<K extends string> = { key: K; hold: number; move: number; at: SpotAt };
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  /** Where the radiographer is now (stepping between beats' places). */
  at: SpotAt;
  /** The beat's place in the round. */
  i: number;
  /** How far apart the two beats' places are (stepping between them when it's more than a few cm). */
  gap: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0);
  let u = frac(t / T + phase) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold, at: k.at, i, gap: 0 };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) {
      const e = ss(Math.min(1, u / k.move));
      return { from: k.key, to: next.key, e, p: 1, at: mixAt(k.at, next.at, e), i, gap: Math.hypot(next.at.x - k.at.x, next.at.z - k.at.z) };
    }
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0, at: steps[0].at, i: 0, gap: 0 };
}
const st = <K extends string>(key: K, hold: number, move: number, a: SpotAt): Step<K> => ({ key, hold, move, at: a });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}
/** A value each beat has (given how far through it is), eased from one beat's to the next's. */
function valueOf<K extends string>(b: Beat<K>, v: (k: K, p: number) => number): number {
  return b.e > 0 ? mix(v(b.from, 1), v(b.to, 0), b.e) : v(b.from, b.p);
}
/** Whether the round has got to beat `k` yet (or is past it). */
function reached<K extends string>(steps: Array<Step<K>>, b: Beat<K>, k: K): boolean {
  return b.i >= steps.findIndex((s) => s.key === k);
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
/** The hands loose at the sides (stepping from one place to another). */
const easy = (s: SpotAt): Key => ({ l: sp(s, 0.2, 0.8, 0.05), r: sp(s, -0.2, 0.8, 0.05), lean: 0, nod: 0.08, palms: 0.4, gl: 0.3, gr: 0.3 });
function blended<K extends string>(beat: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(beat.from, beat.e > 0 ? 1 : beat.p);
  if (beat.e <= 0) return a;
  const k = mixKey(a, pose(beat.to, 0), beat.e);
  // Stepping somewhere: the hands come in to the sides on the way, not trailing behind.
  return beat.gap > 0.12 ? mixKey(k, easy(beat.at), Math.sin(Math.PI * beat.e)) : k;
}

// =============================================================================================
// The patients drawn in. Built stood at the origin facing +z, 1.6 m tall (scaled `k` lying down),
// the same figure the pieces draw (radiographer.ts): the shoulders 1.31 up, the head's middle 1.51.

/** Lying face up on a table along x, the head toward -x: their feet at x `feet`, the top `top`, along z `z`. */
export function supine(feet: number, top: number, z: number, k = 0.92) {
  const pt = (ly: number, lx: number, up: number): P => [feet - ly * k, top + up * k, z - lx * k];
  return {
    head: pt(1.51, 0, 0.12),
    headTop: pt(1.62, 0, 0.12),
    earL: pt(1.51, 0.115, 0.12),
    earR: pt(1.51, -0.115, 0.12),
    shoulderR: pt(1.3, -0.19, 0.17),
    shoulderL: pt(1.3, 0.19, 0.17),
    chest: pt(1.18, 0, 0.215),
    belly: pt(0.98, 0, 0.2),
    hipR: pt(0.86, -0.15, 0.15),
    hipL: pt(0.86, 0.15, 0.15),
    kneeR: pt(0.47, -0.09, 0.1),
    elbowR: pt(1.05, -0.24, 0.08),
    handR: pt(0.82, -0.25, 0.06),
  };
}

// =============================================================================================
// The chest stand (엑스레이 촬영기, 2 × 1): the detector on its wall stand at the left facing +x, the
// tube hung from its column aimed back at it, the lead screen at the right with the console behind it.

export const XR = {
  /** The detector's face (x), its middle's height, half its size. */
  det: { x: -0.8, y: 1.2, half: 0.23 },
  /** The patient's feet (they face -x, the chest to the detector). */
  pat: { x: -0.69, z: 0 },
  /** The collimator's face and middle (aimed at -x), its knob on the near side. */
  coll: { x: 0.12, y: 1.22, z: 0 },
  knob: [0.2, 1.17, 0.13] as P,
  /** The lead screen along z at x, from z0 to z1, its lead-glass window. */
  wall: { x: 0.47, z0: -0.5, z1: 0.14, win: [1.25, 1.72] as [number, number] },
  /** The generator's panel and the hand switch's holster on the shelf behind it. */
  panel: [0.56, 1.1, -0.28] as P,
  holster: [0.58, 1.06, 0.07] as P,
};
/** The patient's points (stood facing -x, chest to the detector). */
export const XP = {
  back: [XR.pat.x + 0.12, 1.28, 0] as P,
  shoulderL: [XR.pat.x + 0.02, 1.33, 0.18] as P,
  shoulderR: [XR.pat.x + 0.02, 1.33, -0.18] as P,
  elbowL: [XR.pat.x - 0.02, 1.2, 0.32] as P,
  elbowR: [XR.pat.x - 0.02, 1.2, -0.32] as P,
  chin: [XR.pat.x - 0.1, 1.42, 0.02] as P,
};
/** Stood behind the patient (between them and the tube); at the collimator; behind the screen. */
export const XR_POS = at(-0.37, 0.1, -Math.PI / 2);
export const XR_LIGHT = at(0.1, 0.42, Math.PI);
const XR_W = at(0.64, 0.4, 2.2);
const XR_WB = at(0.6, 0.42, -1.9);
export const XR_CON = at(0.84, -0.06, -Math.PI / 2);
/**
 * A chest X-ray, ~26 s round: a word to the patient (the hand to the detector); hands on their back,
 * the chest pressed to it; their arms brought round it; the chin lifted onto its top; the collimator's
 * light switched on and lined up on their back; round behind the lead screen; the exposure set and
 * 숨 들이마시고… 참으세요 (their chest swells and holds); the hand switch pressed (촬영 중); the film
 * looked over on the console; back to them, a hand on the shoulder, the arms let down.
 */
export type XrKey = 'greet' | 'chest' | 'arms' | 'chin' | 'light' | 'walk' | 'breath' | 'expose' | 'check' | 'back' | 'release';
const XRS: Array<Step<XrKey>> = [
  st('greet', 1.6, 0.4, XR_POS), st('chest', 2.4, 0.4, XR_POS), st('arms', 2.6, 0.4, XR_POS), st('chin', 1.8, 0.9, XR_POS), st('light', 2.2, 0.7, XR_LIGHT),
  st('walk', 0.05, 0.7, XR_W), st('breath', 2.2, 0.3, XR_CON), st('expose', 1.4, 0.3, XR_CON), st('check', 2.6, 0.7, XR_CON), st('back', 0.05, 1.3, XR_WB), st('release', 2.2, 0.6, XR_POS),
];
export const xrBeat = (t: number, ph: number) => beatOf(XRS, t, ph);
/** What's going on: the arms round the detector (0–1), the chin up (0–1), the light on, the chest held, the exposure, the film on the console. */
export function xrState(b: Beat<XrKey>) {
  const arms = valueOf(b, (k, p) => (k === 'greet' || k === 'chest' ? 0 : k === 'arms' ? ss(p, 0.15, 0.8) : k === 'release' ? 1 - ss(p, 0.3, 0.9) : 1));
  const chin = valueOf(b, (k, p) => (k === 'chin' ? ss(p, 0.2, 0.7) : k === 'release' ? 1 - ss(p, 0.3, 0.9) : reached(XRS, b, 'chin') && k !== 'greet' && k !== 'chest' && k !== 'arms' ? 1 : 0));
  const light = (b.from === 'light' && b.p > 0.2) || b.from === 'walk' || b.from === 'breath';
  const breath = valueOf(b, (k, p) => (k === 'breath' ? ss(p, 0.3, 0.8) : k === 'expose' ? 1 : k === 'check' ? 1 - ss(p, 0, 0.3) : 0));
  const expose = b.from === 'expose' && b.p > 0.35 && b.p < 0.62;
  const image = (b.from === 'expose' && b.p > 0.62) || b.from === 'check' || b.from === 'back';
  return { arms, chin, light, breath, expose, image, press: b.from === 'chest' ? pulse(b.p * 3, 1, 0, 2) : 0 };
}
/** The hand switch in the hand (else in its holster on the shelf). */
export const xrSwitchHeld = (b: Beat<XrKey>) => b.from === 'breath' || b.from === 'expose';
function xrKey(k: XrKey, p: number, t: number, s: number, cur: SpotAt): Key {
  switch (k) {
    case 'greet':
      return { l: sp(cur, 0.18, 0.95, 0.12), r: add(XR_POS_AHEAD, [0, 0.02 * wave(t, 0.7, s), 0]), lean: 0.1, nod: 0.15 + 0.05 * pulse(t, 0.6, s), palms: 0.3, gl: 0.3, gr: 0.2 };
    case 'chest': {
      const push = 0.015 * pulse(t, 0.9, s, 2);
      return { l: add(XP.back, [0.03 - push, 0.02, 0.09]), r: add(XP.back, [0.03 - push, 0.0, -0.09]), lean: 0.22, nod: 0.3, palms: 1.5, gl: 0.2, gr: 0.2 };
    }
    case 'arms': {
      // From the elbows hanging to brought round the detector, a hand on each.
      const e = ss(p, 0.15, 0.8);
      return { l: mixP(add(XP.shoulderL, [0.02, -0.22, 0.06]), add(XP.elbowL, [0.04, 0.02, -0.02]), e), r: mixP(add(XP.shoulderR, [0.02, -0.22, -0.06]), add(XP.elbowR, [0.04, 0.02, 0.02]), e), lean: 0.28, nod: 0.3, palms: 1.2, gl: 0.5, gr: 0.5 };
    }
    case 'chin':
      return { l: add(XP.shoulderL, [0.03, 0.03, -0.02]), r: add(XP.chin, [0.02, -0.03 + 0.03 * ss(p, 0.2, 0.7), -0.04]), lean: 0.36, nod: 0.25, palms: 1.0, gl: 0.3, gr: 0.4 };
    case 'light': {
      // The left hand on the collimator's handle, the right turning its knob; the light comes on.
      const turn = 0.012 * wave(t, 0.8, s);
      return { l: add(XR.knob, [-0.12, 0.02, 0]), r: add(XR.knob, [turn, 0, 0.02]), lean: 0.12, nod: 0.05, palms: 0.6, gl: 0.6, gr: 0.75 };
    }
    case 'walk':
    case 'back':
      return easy(cur);
    case 'breath':
      // Setting the kV and mAs on the panel; then the switch picked up off its holster.
      return { l: sp(cur, 0.18, 0.98, 0.15), r: p < 0.45 ? add(XR.panel, [0.02, 0.03 + 0.008 * pulse(t, 2.5, s, 2), -0.03 + 0.05 * Math.floor(p * 6) / 6]) : sp(cur, -0.06, 1.08, 0.24), lean: 0.12, nod: 0.12, palms: 0.8, gl: 0.3, gr: 0.75 };
    case 'expose':
      return { l: sp(cur, 0.12, 1.05, 0.2), r: sp(cur, -0.05, 1.1 - 0.01 * (p > 0.35 && p < 0.62 ? 1 : 0), 0.24), lean: 0.1, nod: 0.02, palms: 0.8, gl: 0.6, gr: 0.95 };
    case 'check':
      return { l: sp(cur, 0.18, 0.98, 0.15), r: add(XR.panel, [0.02, 0.05, -0.04]), lean: 0.18, nod: 0.25, palms: 0.8, gl: 0.3, gr: 0.4 };
    default:
      // A hand on each shoulder: done, the arms can come down.
      return { l: add(XP.shoulderL, [0.04, 0.03, -0.03]), r: add(XP.shoulderR, [0.04, 0.03, 0.03]), lean: 0.2, nod: 0.2 + 0.05 * pulse(t, 0.6, s), palms: 1.4, gl: 0.3, gr: 0.3 };
  }
}
const XR_POS_AHEAD: P = [XR.det.x + 0.12, 1.25, 0.32];

// =============================================================================================
// The CT, the MRI and the linac (2 × 2 each), drawn to one plan: the machine at the left with its
// bore (or gantry) facing +x, the table along x through it at BORE_Z, and in the front right corner
// a lead-glass screen across z = CON.shield with the console desk behind it, the radiographer at it
// facing back into the room through the glass.

export const BORE_Z = -0.25;
export const CON = { shield: 0.5, x0: 0.38, x1: 0.98, desk: 0.6, top: 0.9, kb: [0.62, 0.93, 0.71] as P, mouse: [0.84, 0.92, 0.71] as P, mic: [0.47, 0.95, 0.64] as P };
export const AT_CON = at(0.68, 0.95, Math.PI);
const AT_W = at(0.18, 0.84, Math.PI / 2);
/** Coming back from the console, facing the way back. */
const AT_WB = at(0.16, 0.82, -2.0);

/** A table that rises and slides: its top's height (lift 0–1) and how far the cradle's gone in (slide, -x). */
export interface TableAt {
  lift: number;
  slide: number;
}

export const CT = { face: -0.4, boreY: 1.0, boreR: 0.36, low: 0.6, high: 0.84, home: 0.2, half: 0.8 };
export const CT_SET = at(-0.05, 0.21, Math.PI);
/** By the patient's head (settling it in the holder). */
export const CT_HEAD = at(-0.2, 0.23, -2.75);
export const CT_PANEL = at(-0.12, 0.5, -2.3);
/** The table's buttons on the gantry's face, on the near side of the bore. */
export const CT_BTN: P = [CT.face + 0.03, 1.05, 0.26];
/** The patient at home (the table down and out). */
export const CTP = supine(CT.home + CT.half, CT.low, BORE_Z);
/**
 * A CT scan, ~31 s round: a hand on the shoulder; the head settled in its holder; the strap across;
 * at the gantry, the table raised under the red lasers and slid in; round to the console; the scan
 * run (the bore lit, the gantry turning, the table creeping through, 숨 참으세요 on its display, the
 * slices coming up); checked, scrolling; back to the gantry and the table out and down; a hand on the
 * shoulder, the strap off. Urgent (응급 CT): the same, brisker, the patient in a neck collar. Contrast
 * (조영 CT): the injector's line connected to the cannula in the arm before the table goes up.
 */
export type CtKey = 'greet' | 'pillow' | 'strap' | 'line' | 'panel' | 'slide' | 'walk' | 'scan' | 'review' | 'back' | 'out' | 'done';
const CTS: Array<Step<CtKey>> = [
  st('greet', 1.8, 0.4, CT_SET), st('pillow', 2.2, 0.4, CT_HEAD), st('strap', 2.0, 0.6, CT_SET), st('panel', 2.4, 0.3, CT_PANEL), st('slide', 2.0, 0.9, CT_PANEL),
  st('walk', 0.05, 0.7, AT_W), st('scan', 7, 0.3, AT_CON), st('review', 2.6, 0.7, AT_CON), st('back', 0.05, 0.9, AT_WB), st('out', 2.4, 0.6, CT_PANEL), st('done', 2.0, 0.6, CT_SET),
];
const CTS_URGENT: Array<Step<CtKey>> = [
  st('greet', 1.2, 0.3, CT_SET), st('pillow', 1.6, 0.4, CT_HEAD), st('panel', 1.8, 0.3, CT_PANEL), st('slide', 1.4, 0.7, CT_PANEL),
  st('walk', 0.05, 0.6, AT_W), st('scan', 5, 0.3, AT_CON), st('review', 1.8, 0.6, AT_CON), st('back', 0.05, 0.7, AT_WB), st('out', 1.8, 0.5, CT_PANEL), st('done', 1.4, 0.5, CT_SET),
];
const CTS_CONTRAST: Array<Step<CtKey>> = [
  st('greet', 1.8, 0.4, CT_SET), st('pillow', 2.0, 0.4, CT_HEAD), st('line', 2.6, 0.4, CT_SET), st('strap', 1.8, 0.6, CT_SET), st('panel', 2.4, 0.3, CT_PANEL), st('slide', 2.0, 0.9, CT_PANEL),
  st('walk', 0.05, 0.7, AT_W), st('scan', 8, 0.3, AT_CON), st('review', 2.6, 0.7, AT_CON), st('back', 0.05, 0.9, AT_WB), st('out', 2.4, 0.6, CT_PANEL), st('done', 2.0, 0.6, CT_SET),
];
export type CtKind = 'rgCt' | 'rgCtUrgent' | 'rgCtContrast';
const ctSteps = (m: CtKind) => (m === 'rgCtUrgent' ? CTS_URGENT : m === 'rgCtContrast' ? CTS_CONTRAST : CTS);
export const ctBeat = (m: CtKind, t: number, ph: number) => beatOf(ctSteps(m), t, ph);
/** The table (raised in `panel`, slid in through `slide` and on through the scan, out and down in `out`). */
function scanTable<K extends string>(b: Beat<K>, inFirst: number, inScan: number): TableAt {
  const lift = valueOf(b, (k, p) => (k === 'panel' ? ss(p, 0.15, 0.85) : k === 'out' ? 1 - ss(p, 0.55, 0.95) : ['slide', 'walk', 'scan', 'review', 'talk', 'back'].includes(k) ? 1 : 0));
  const slide = valueOf(b, (k, p) =>
    k === 'slide' ? inFirst * ss(p, 0.1, 0.9) : k === 'walk' ? inFirst : k === 'scan' ? mix(inFirst, inScan, ss(p, 0.1, 0.9)) : k === 'review' || k === 'talk' || k === 'back' ? inScan : k === 'out' ? inScan * (1 - ss(p, 0.05, 0.6)) : 0,
  );
  return { lift, slide };
}
export function ctState(m: CtKind, b: Beat<CtKey>) {
  const steps = ctSteps(m);
  const table = scanTable(b, -0.45, -0.75);
  const scanning = b.from === 'scan' && b.p > 0.1 && b.p < 0.9;
  return {
    table,
    lasers: b.from === 'panel' || b.from === 'slide',
    /** How lit the bore is (dim once they're in, bright while it scans). */
    bore: scanning ? 1 : ['slide', 'walk', 'review', 'back'].includes(b.from) || (b.from === 'scan' && !scanning) ? 0.4 : 0,
    scanning,
    /** How far through the scan (which slice is up), and whether the series is done. */
    slice: b.from === 'scan' ? ss(b.p, 0.1, 0.9) : b.from === 'review' || b.from === 'back' ? 1 : 0,
    series: reached(steps, b, 'scan') && b.from !== 'out' && b.from !== 'done',
    strap: reached(steps, b, steps.some((s) => s.key === 'strap') ? 'strap' : 'pillow') && !(b.from === 'done' && b.p > 0.4) && !(b.from === 'strap' && b.p < 0.6),
    line: m === 'rgCtContrast' && reached(steps, b, 'line') && !(b.from === 'line' && b.p < 0.55) && !(b.from === 'done' && b.p > 0.5),
    /** The contrast going in (the first part of the scan). */
    inject: m === 'rgCtContrast' && b.from === 'scan' && b.p > 0.05 && b.p < 0.45,
    hold: scanning,
  };
}
function ctKey(k: CtKey, p: number, t: number, s: number, cur: SpotAt): Key {
  const P0 = CTP;
  switch (k) {
    case 'greet':
      return { l: add(P0.shoulderR, [0.02, 0.04, 0.03]), r: add(P0.hipR, [0, 0.05, 0.03]), lean: 0.35, nod: 0.35 + 0.05 * pulse(t, 0.6, s), palms: 1.4, gl: 0.3, gr: 0.3 };
    case 'pillow': {
      const w = 0.01 * wave(t, 0.8, s);
      return { l: add(P0.earL, [w, 0.03, -0.03]), r: add(P0.earR, [-w, 0.03, 0.03]), lean: 0.48, nod: 0.5, palms: 1.3, gl: 0.4, gr: 0.4 };
    }
    case 'strap': {
      // The strap's buckle pulled across from the far side and clicked in on the near side.
      const e = ss(p, 0.1, 0.7);
      return { l: add(P0.hipR, [-0.12, 0.1, 0.06]), r: add(P0.hipL, [0.02, 0.1, mix(-0.02, 0.22, e)]), lean: 0.48, nod: 0.45, palms: 1.2, gl: 0.6, gr: 0.75 };
    }
    case 'line': {
      // The extension line's end screwed onto the cannula at the inside of the elbow.
      const twist = 0.006 * wave(t, 2.2, s);
      return { l: add(P0.elbowR, [0.02, 0.05, 0.04]), r: add(P0.elbowR, [0.07 + twist, 0.06, 0.05]), lean: 0.45, nod: 0.55, palms: 1.1, gl: 0.75, gr: 0.8 };
    }
    case 'panel':
    case 'slide':
    case 'out': {
      const press = k === 'panel' && p < 0.2 ? 0.01 * pulse(t, 3, s, 2) : 0;
      return { l: sp(cur, 0.2, 0.86, 0.1), r: add(CT_BTN, [0.03 - press, 0, k === 'slide' ? -0.05 : 0]), lean: 0.1, nod: 0.25, palms: 0.4, gl: 0.3, gr: 0.6 };
    }
    case 'scan':
      return { l: add(CON.kb, [0.04 * Math.floor(p * 9) / 9 - 0.02, 0.012 * pulse(t, 3.2, s, 3), 0]), r: add(CON.mouse, [0.01 * wave(t, 0.4, s), 0.01, 0.008 * wave(t, 0.3, s)]), lean: 0.2, nod: 0.22, palms: 1.4, gl: 0.35, gr: 0.55 };
    case 'review':
      return { l: add(CON.kb, [-0.04, 0.0, 0.05]), r: add(CON.mouse, [0, 0.008 * pulse(t, 1.6, s, 3), 0]), lean: 0.24, nod: 0.3, palms: 1.4, gl: 0.3, gr: 0.6 };
    case 'walk':
    case 'back':
      return easy(cur);
    default:
      return { l: add(P0.shoulderR, [0.02, 0.04, 0.03]), r: add(P0.handR, [0.0, 0.06, 0.03]), lean: 0.36, nod: 0.3 + 0.05 * pulse(t, 0.6, s), palms: 1.4, gl: 0.3, gr: 0.4 };
  }
}
/**
 * Reconstructing a series in 3D (3D 영상 재구성, at the CT's console), ~9 s round: the volume dragged
 * round with the mouse, a few keys, the window changed.
 */
export type ReconKey = 'drag' | 'type';
const RECONS: Array<Step<ReconKey>> = [st('drag', 6, 0.5, AT_CON), st('type', 2.2, 0.5, AT_CON)];
export const reconBeat = (t: number, ph: number) => beatOf(RECONS, t, ph);
function reconKey(k: ReconKey, _p: number, t: number, s: number): Key {
  if (k === 'type') return { l: add(CON.kb, [-0.05, 0.012 * pulse(t, 3.4, s, 3), 0]), r: add(CON.kb, [0.06, 0.012 * pulse(t, 3.4, s + 0.5, 3), 0]), lean: 0.22, nod: 0.25, palms: 1.45, gl: 0.35, gr: 0.35 };
  const a = t * 0.9 * Math.PI * 2;
  return { l: add(CON.kb, [-0.05, 0, 0.02]), r: add(CON.mouse, [0.03 * Math.cos(a), 0.008, 0.02 * Math.sin(a)]), lean: 0.22, nod: 0.28, palms: 1.4, gl: 0.3, gr: 0.6 };
}

export const MR = { face: -0.45, back: -0.98, boreY: 1.0, boreR: 0.33, low: 0.6, high: 0.82, home: 0.22, half: 0.75 };
export const MR_SET = at(0.0, 0.21, Math.PI);
export const MR_HEAD = at(-0.2, 0.25, -2.7);
export const MR_PANEL = at(-0.16, 0.52, -2.3);
export const MR_BTN: P = [MR.face + 0.03, 1.05, 0.26];
export const MRP = supine(MR.home + MR.half, MR.low, BORE_Z);
/**
 * An MRI scan, ~37 s round: a hand on the shoulder; the headphones on (to the head, the cups over the
 * ears); the head coil brought over and clicked down; the squeeze ball put in the right hand (꼭 쥐고
 *계세요); at the magnet, the table raised and slid in; round to the console; the scan run (the bore
 * lit, the sequence's progress bar going, the slices coming); a word over the intercom (잘하고
 *계세요); checked; back to the magnet, the table out and down; the coil and headphones off.
 */
export type MrKey = 'greet' | 'phones' | 'coil' | 'ball' | 'panel' | 'slide' | 'walk' | 'scan' | 'talk' | 'review' | 'back' | 'out' | 'off';
const MRS: Array<Step<MrKey>> = [
  st('greet', 1.8, 0.6, MR_SET), st('phones', 2.4, 0.4, MR_HEAD), st('coil', 2.6, 0.6, MR_HEAD), st('ball', 2.0, 0.5, MR_SET), st('panel', 2.2, 0.3, MR_PANEL), st('slide', 2.2, 0.9, MR_PANEL),
  st('walk', 0.05, 0.7, AT_W), st('scan', 8, 0.3, AT_CON), st('talk', 2.4, 0.3, AT_CON), st('review', 2.4, 0.7, AT_CON), st('back', 0.05, 0.9, AT_WB), st('out', 2.4, 0.6, MR_PANEL), st('off', 2.4, 0.6, MR_HEAD),
];
export const mrBeat = (t: number, ph: number) => beatOf(MRS, t, ph);
export function mrState(b: Beat<MrKey>) {
  const scanning = (b.from === 'scan' && b.p > 0.08) || b.from === 'talk';
  const on = (k: MrKey, until: (b: Beat<MrKey>) => boolean) => reached(MRS, b, k) && !until(b);
  return {
    table: scanTable(b, -0.3, -0.3),
    bore: scanning ? 1 : ['slide', 'walk', 'review', 'back', 'scan'].includes(b.from) ? 0.45 : 0,
    scanning,
    slice: b.from === 'scan' ? ss(b.p, 0.08, 1) : ['talk', 'review', 'back'].includes(b.from) ? 1 : 0,
    series: reached(MRS, b, 'scan') && b.from !== 'out' && b.from !== 'off',
    phones: on('phones', (x) => (x.from === 'phones' && x.p < 0.55) || (x.from === 'off' && x.p > 0.75)),
    /** The coil: 0 on its shelf, carried (0–1 of the way), 1 on. */
    coil: b.from === 'coil' ? ss(b.p, 0.15, 0.75) : b.from === 'off' ? 1 - ss(b.p, 0.1, 0.6) : reached(MRS, b, 'coil') ? 1 : 0,
    ball: on('ball', (x) => (x.from === 'ball' && x.p < 0.5) || x.from === 'off'),
    talk: b.from === 'talk' && b.p > 0.15 && b.p < 0.85,
  };
}
function mrKey(k: MrKey, p: number, t: number, s: number, cur: SpotAt): Key {
  const P0 = MRP;
  switch (k) {
    case 'greet':
      return { l: add(P0.shoulderR, [0.02, 0.04, 0.03]), r: add(P0.hipR, [0, 0.05, 0.03]), lean: 0.35, nod: 0.35 + 0.05 * pulse(t, 0.6, s), palms: 1.4, gl: 0.3, gr: 0.3 };
    case 'phones': {
      const e = ss(p, 0.1, 0.55);
      return { l: mixP(sp(cur, 0.14, 1.05, 0.3), add(P0.earL, [0, 0.04, -0.04]), e), r: mixP(sp(cur, -0.14, 1.05, 0.3), add(P0.earR, [0, 0.04, 0.04]), e), lean: 0.5, nod: 0.5, palms: 1.2, gl: 0.6, gr: 0.6 };
    }
    case 'coil':
    case 'off': {
      // Both hands on the coil's sides, from the shelf at the table's head end to over the head.
      const e = k === 'coil' ? ss(p, 0.15, 0.75) : 1 - ss(p, 0.1, 0.6);
      const from: P = [MR.face + 0.12, MR.low + 0.12, BORE_Z + 0.3];
      const c = mixP(from, add(P0.head, [0, 0.05, 0]), e);
      return { l: add(c, [0.0, 0.08, -0.13]), r: add(c, [0.0, 0.08, 0.13]), lean: 0.5, nod: 0.5, palms: 1.1, gl: 0.75, gr: 0.75 };
    }
    case 'ball':
      return { l: add(P0.shoulderR, [0.02, 0.04, 0.03]), r: add(P0.handR, [0.0, 0.07 - 0.03 * ss(p, 0.2, 0.5), 0.03]), lean: 0.42, nod: 0.45, palms: 1.0, gl: 0.3, gr: 0.7 };
    case 'panel':
    case 'slide':
    case 'out': {
      const press = k === 'panel' && p < 0.2 ? 0.01 * pulse(t, 3, s, 2) : 0;
      return { l: sp(cur, 0.2, 0.86, 0.1), r: add(MR_BTN, [0.03 - press, 0, k === 'slide' ? -0.05 : 0]), lean: 0.1, nod: 0.25, palms: 0.4, gl: 0.3, gr: 0.6 };
    }
    case 'scan':
      return { l: add(CON.kb, [0.04 * Math.floor(p * 7) / 7 - 0.02, 0.012 * pulse(t, 3, s, 3), 0]), r: add(CON.mouse, [0.01 * wave(t, 0.4, s), 0.01, 0.008 * wave(t, 0.3, s)]), lean: 0.2, nod: 0.22, palms: 1.4, gl: 0.35, gr: 0.55 };
    case 'talk':
      // The intercom's button held down, leant in to the gooseneck mic.
      return { l: add(CON.mic, [0.03, -0.02, 0.06]), r: add(CON.mouse, [0, 0.01, 0]), lean: 0.34, nod: 0.12 + 0.04 * pulse(t, 2, s), palms: 1.3, gl: 0.6, gr: 0.5 };
    case 'review':
      return { l: add(CON.kb, [-0.04, 0.0, 0.05]), r: add(CON.mouse, [0, 0.008 * pulse(t, 1.6, s, 3), 0]), lean: 0.24, nod: 0.3, palms: 1.4, gl: 0.3, gr: 0.6 };
    default:
      return easy(cur);
  }
}

export const LN = { iso: [-0.1, 1.15, BORE_Z] as P, drum: -0.62, arm: 0.62, low: 0.74, high: 1.0, couch: 0.2, half: 0.78 };
export const LN_SET = at(-0.02, 0.22, Math.PI);
export const LN_PEND = at(0.42, 0.24, Math.PI);
/** The couch's pendant on its hook at the couch's near side. */
export const LN_HOOK: P = [0.42, 0.9, 0.0];
export const LN_TALK = at(-0.08, 0.2, Math.PI - 0.15);
export const lnPatient = (lift: number) => supine(LN.couch + LN.half, mix(LN.low, LN.high, lift), BORE_Z);
/**
 * Radiotherapy (방사선 치료), ~33 s round: a hand on the shoulder; the patient lined up to the green
 * lasers by the sheet under them (drawn a little toward the radiographer); the skin marks checked
 * against the laser cross; the couch raised to the isocentre from its pendant; round to the console
 * (BEAM ON, 치료 중); the gantry swung right round them in an arc, the CCTV watched; back, the couch
 * lowered; a hand on the shoulder (수고하셨어요).
 */
export type LnKey = 'greet' | 'align' | 'marks' | 'up' | 'walk' | 'beam' | 'watch' | 'back' | 'down' | 'help';
const LNS: Array<Step<LnKey>> = [
  st('greet', 1.8, 0.4, LN_SET), st('align', 3.0, 0.4, LN_SET), st('marks', 2.2, 0.6, LN_SET), st('up', 2.4, 0.6, LN_PEND),
  st('walk', 0.05, 0.7, AT_W), st('beam', 9, 0.3, AT_CON), st('watch', 2.6, 0.7, AT_CON), st('back', 0.05, 0.9, AT_WB), st('down', 2.2, 0.6, LN_PEND), st('help', 2.0, 0.6, LN_SET),
];
export const lnBeat = (t: number, ph: number) => beatOf(LNS, t, ph);
export function lnState(b: Beat<LnKey>) {
  const lift = valueOf(b, (k, p) => (k === 'up' ? ss(p, 0.2, 0.85) : k === 'down' ? 1 - ss(p, 0.2, 0.85) : ['walk', 'beam', 'watch', 'back'].includes(k) ? 1 : 0));
  const beaming = b.from === 'beam' && b.p > 0.08 && b.p < 0.92;
  return {
    lift,
    /** The gantry's angle (0 the head on top), right round in the arc. */
    gantry: b.from === 'beam' ? Math.PI * 2 * ss(b.p, 0.08, 0.92) : 0,
    beaming,
    lasers: b.from === 'align' || b.from === 'marks' || b.from === 'up',
    field: b.from === 'marks' || b.from === 'up',
    /** The patient drawn toward the radiographer by the sheet while they're lined up (z). */
    shift: b.from === 'align' ? 0.015 * Math.sin(b.p * Math.PI * 2) : 0,
    pendant: b.from === 'up' || b.from === 'down',
  };
}
function lnKey(k: LnKey, p: number, t: number, s: number, cur: SpotAt, ph: number): Key {
  const P0 = lnPatient(k === 'down' ? 1 - ss(p, 0.2, 0.85) : k === 'up' ? ss(p, 0.2, 0.85) : 0);
  switch (k) {
    case 'greet':
      return { l: add(P0.shoulderR, [0.02, 0.04, 0.03]), r: add(P0.handR, [0, 0.06, 0.03]), lean: 0.35, nod: 0.35 + 0.05 * pulse(t, 0.6, s), palms: 1.4, gl: 0.3, gr: 0.3 };
    case 'align': {
      const d = 0.02 * Math.sin(p * Math.PI * 2);
      return { l: add(P0.shoulderR, [0.06, -0.08, 0.05 + d]), r: add(P0.hipR, [0, -0.06, 0.05 + d]), lean: 0.5, nod: 0.45, palms: 1.5, gl: 0.8, gr: 0.8 };
    }
    case 'marks': {
      // A finger to the mark on the chest under the laser cross, then the one on the near side.
      const near = p > 0.55;
      const mark: P = near ? [LN.iso[0], LN.low + 0.11, BORE_Z + 0.2] : [LN.iso[0], LN.low + 0.2, BORE_Z];
      return { l: add(P0.shoulderR, [0.02, 0.04, 0.03]), r: add(mark, [0.02, 0.03, near ? 0.03 : 0.02]), lean: 0.5, nod: 0.6, palms: 1.0, gl: 0.3, gr: 0.5 };
    }
    case 'up':
    case 'down':
      return { l: [LN.couch + 0.15, mix(LN.low, LN.high, k === 'up' ? ss(p, 0.2, 0.85) : 1 - ss(p, 0.2, 0.85)) + 0.02, BORE_Z + 0.24], r: sp(cur, -0.08, 1.08, 0.26), lean: 0.12, nod: 0.3, palms: 0.6, gl: 0.5, gr: 0.85 };
    case 'beam':
      return p < 0.25
        ? { l: add(CON.kb, [-0.02, 0.012 * pulse(t, 3, s, 3), 0]), r: add(CON.kb, [0.08, 0.012 * pulse(t, 3, s + 0.5, 3), 0]), lean: 0.2, nod: 0.25, palms: 1.45, gl: 0.35, gr: 0.35 }
        : { l: add(CON.kb, [-0.06, 0, 0.05]), r: add(CON.mouse, [0, 0.008, 0]), lean: 0.18, nod: 0.12 + 0.03 * wave(t, 0.2, ph), palms: 1.3, gl: 0.3, gr: 0.5 };
    case 'watch':
      return { l: add(CON.kb, [-0.08, 0, 0.06]), r: add(CON.mouse, [0, 0.01, 0]), lean: 0.12, nod: 0.15, palms: 1.3, gl: 0.3, gr: 0.5 };
    case 'help':
      return { l: add(P0.shoulderR, [0.02, 0.04, 0.03]), r: add(P0.handR, [0, 0.06, 0.03]), lean: 0.36, nod: 0.3 + 0.05 * pulse(t, 0.6, s), palms: 1.4, gl: 0.3, gr: 0.4 };
    default:
      return easy(cur);
  }
}
/**
 * A few quiet minutes with a patient on the couch (치료 환자 마음 살피기), ~14 s round: a hand over
 * theirs; a word, a little gesture; listening, nodding, the hands folded.
 */
export type ComfortKey = 'hand' | 'talk' | 'listen';
const COMFORTS: Array<Step<ComfortKey>> = [st('hand', 4.5, 0.6, LN_TALK), st('talk', 3.4, 0.6, LN_TALK), st('listen', 4.2, 0.6, LN_TALK)];
export const comfortBeat = (t: number, ph: number) => beatOf(COMFORTS, t, ph);
function comfortKey(k: ComfortKey, _p: number, t: number, s: number, cur: SpotAt): Key {
  const P0 = lnPatient(0);
  switch (k) {
    case 'hand':
      return { l: add(P0.shoulderR, [0.03, 0.04, 0.03]), r: add(P0.handR, [0.02, 0.06, 0.02]), lean: 0.3, nod: 0.3 + 0.06 * pulse(t, 0.5, s), palms: 1.4, gl: 0.3, gr: 0.3 };
    case 'talk':
      return { l: add(P0.shoulderR, [0.03, 0.04, 0.03]), r: sp(cur, -0.14, 1.12 + 0.03 * wave(t, 0.7, s), 0.3), lean: 0.2, nod: 0.2 + 0.05 * wave(t, 0.9, s), palms: 0.4, gl: 0.3, gr: 0.2 };
    default:
      return { l: sp(cur, 0.06, 0.98, 0.2), r: sp(cur, -0.06, 0.98, 0.21), lean: 0.18, nod: 0.3 + 0.08 * pulse(t, 0.45, s), palms: 0.6, gl: 0.6, gr: 0.6 };
  }
}

// =============================================================================================
// The control-room console (판독 · 조정실 콘솔, 2 × 1): sat at the desk facing back (-z) through the
// lead-glass window over the monitors.

export const DESK = { top: 0.74, seat: 0.48, kb: [0, 0.765, 0.04] as P, mouse: [0.3, 0.765, 0.06] as P, mic: [-0.32, 0.79, 0.02] as P };
export const DESK_AT = at(0, 0.5, Math.PI, DESK.seat);
/**
 * Reading at the console (영상 검수 · 선량 기록), ~16 s round: scrolling through a series; measuring
 * something with a drag; typing; the dictation mic picked up and spoken into.
 */
export type DeskKey = 'scroll' | 'measure' | 'type' | 'dictate';
const DESKS: Array<Step<DeskKey>> = [st('scroll', 4, 0.5, DESK_AT), st('measure', 3, 0.5, DESK_AT), st('type', 3.2, 0.5, DESK_AT), st('dictate', 3.4, 0.6, DESK_AT)];
export const deskBeat = (t: number, ph: number) => beatOf(DESKS, t, ph);
export const micHeld = (b: Beat<DeskKey>) => b.from === 'dictate' && b.p > 0.1 && b.p < 0.9;
function deskKey(k: DeskKey, p: number, t: number, s: number, cur: SpotAt): Key {
  switch (k) {
    case 'scroll':
      return { l: add(DESK.kb, [-0.12, 0, 0.02]), r: add(DESK.mouse, [0, 0.008 * pulse(t, 2.2, s, 3), 0]), lean: 0.18, nod: 0.25, palms: 1.4, gl: 0.3, gr: 0.6 };
    case 'measure':
      return { l: add(DESK.kb, [-0.12, 0, 0.02]), r: add(DESK.mouse, [-0.03 + 0.06 * ss(frac(p * 2), 0.2, 0.8), 0.004, 0.02 * ss(frac(p * 2), 0.2, 0.8)]), lean: 0.2, nod: 0.28, palms: 1.4, gl: 0.3, gr: 0.65 };
    case 'type':
      return { l: add(DESK.kb, [-0.07, 0.012 * pulse(t, 3.4, s, 3), 0]), r: add(DESK.kb, [0.07, 0.012 * pulse(t, 3.4, s + 0.5, 3), 0]), lean: 0.2, nod: 0.25, palms: 1.45, gl: 0.35, gr: 0.35 };
    default: {
      const e = ss(p, 0.05, 0.15) * (1 - ss(p, 0.88, 0.98));
      return { l: mixP(DESK.mic, sp(cur, 0.07, 0.66, 0.16), e), r: add(DESK.mouse, [0, 0.006 * pulse(t, 1.4, s, 3), 0]), lean: mix(0.18, 0.08, e), nod: 0.2, palms: 0.9, gl: 0.85, gr: 0.6 };
    }
  }
}

// =============================================================================================
// The apron rack (납 가운 걸이, 1 × 1): four aprons on hangers along its rail.

export const RACK = { rail: 1.62, z: -0.12, front: -0.02 };
export const RACK_AT = at(0, 0.42, Math.PI);
/**
 * Checking a lead apron (납 가운 점검), ~15 s round: the front one lifted off its hanger; held up and
 * looked over; bent gently along its folds (for cracks in the lead); turned round to its back; hung
 * back and ticked on the check card on the rack's side.
 */
export type ApronKey = 'lift' | 'hold' | 'flex' | 'turn' | 'hang' | 'note';
const APRONS: Array<Step<ApronKey>> = [st('lift', 1.6, 0.6, RACK_AT), st('hold', 2.4, 0.5, RACK_AT), st('flex', 2.6, 0.5, RACK_AT), st('turn', 2.4, 0.6, RACK_AT), st('hang', 1.6, 0.5, RACK_AT), st('note', 2.0, 0.6, RACK_AT)];
export const apronBeat = (t: number, ph: number) => beatOf(APRONS, t, ph);
/** The apron in the hands (else on the rail), how far it's turned round and bent. */
export function apronState(b: Beat<ApronKey>) {
  const held = (b.from === 'lift' && b.p > 0.5) || b.from === 'hold' || b.from === 'flex' || b.from === 'turn' || (b.from === 'hang' && b.p < 0.6);
  const turn = valueOf(b, (k, p) => (k === 'turn' ? ss(p, 0.15, 0.6) * Math.PI : 0));
  const bend = b.from === 'flex' ? 0.35 * Math.sin(b.p * Math.PI * 3) ** 2 : 0;
  return { held, turn, bend, ticked: b.from === 'note' && b.p > 0.6 };
}
function apronKey(k: ApronKey, p: number, t: number, s: number, cur: SpotAt): Key {
  const hook: P = [0, RACK.rail - 0.02, RACK.front];
  switch (k) {
    case 'lift':
    case 'hang': {
      const e = k === 'lift' ? ss(p, 0.4, 1) : 1 - ss(p, 0, 0.6);
      return { l: mixP(add(hook, [-0.03, -0.02, 0.02]), sp(cur, 0.2, 1.42, 0.34), e), r: mixP(add(hook, [0.03, -0.02, 0.02]), sp(cur, -0.2, 1.42, 0.34), e), lean: 0.12, nod: -0.1, palms: 1.0, gl: 0.8, gr: 0.8 };
    }
    case 'hold':
      return { l: sp(cur, 0.2, 1.42, 0.34), r: sp(cur, -0.2, 1.42 + 0.01 * wave(t, 0.5, s), 0.34), lean: 0.06, nod: 0.18, palms: 1.0, gl: 0.8, gr: 0.8 };
    case 'flex': {
      const b = 0.06 * Math.sin(p * Math.PI * 3) ** 2;
      return { l: sp(cur, 0.2 - b, 1.3, 0.34 + b * 0.8), r: sp(cur, -0.2 + b, 1.3, 0.34 + b * 0.8), lean: 0.12, nod: 0.32, palms: 1.0, gl: 0.85, gr: 0.85 };
    }
    case 'turn':
      return { l: sp(cur, 0.2, 1.42, 0.34), r: sp(cur, -0.2, 1.42, 0.34), lean: 0.08, nod: 0.2, palms: 1.0, gl: 0.8, gr: 0.8 };
    default:
      // A tick on the check card clipped to the rack's right post.
      return { l: sp(cur, 0.18, 0.95, 0.14), r: [0.36 + 0.01 * wave(t, 3, s), 1.2, 0.08], lean: 0.12, nod: 0.3, palms: 0.8, gl: 0.3, gr: 0.85 };
  }
}

// =============================================================================================
// The contrast injector (조영제 자동 주입기, 1 × 1): its head on a column, two syringes (A contrast,
// B saline) that tip up to fill and down to inject, the touch screen on its arm, the bottle warmer.

export const INJ = { pivot: [0, 1.12, -0.08] as P, screen: [0.27, 1.36, -0.02] as P, warmer: [-0.25, 0.96, -0.06] as P };
export const INJ_AT = at(0, 0.45, Math.PI);
/**
 * Getting the injector ready (조영제 주입기 준비), ~17 s round: a warmed bottle of contrast taken from
 * the warmer and spiked upside down over syringe A; the plunger drawn back (it fills); then B with
 * saline; the syringes tapped, tipped up, the air pushed out (bubbles); the protocol set on the
 * screen; the head tipped down, ready.
 */
export type InjKey = 'bottle' | 'fillA' | 'fillB' | 'purge' | 'program' | 'ready';
const INJS: Array<Step<InjKey>> = [st('bottle', 2.4, 0.4, INJ_AT), st('fillA', 3.0, 0.4, INJ_AT), st('fillB', 2.4, 0.4, INJ_AT), st('purge', 2.8, 0.4, INJ_AT), st('program', 2.6, 0.5, INJ_AT), st('ready', 1.8, 0.6, INJ_AT)];
export const injBeat = (t: number, ph: number) => beatOf(INJS, t, ph);
export function injState(b: Beat<InjKey>) {
  const a = valueOf(b, (k, p) => (k === 'bottle' ? 0.15 : k === 'fillA' ? mix(0.15, 1, ss(p, 0.1, 0.9)) : k === 'ready' ? mix(0.95, 0.15, ss(p, 0.6, 1)) : 0.95));
  const bb = valueOf(b, (k, p) => (k === 'bottle' || k === 'fillA' ? 0.1 : k === 'fillB' ? mix(0.1, 0.9, ss(p, 0.1, 0.9)) : k === 'ready' ? mix(0.85, 0.1, ss(p, 0.6, 1)) : 0.85));
  // Tipped up (filling, purging), level-ish while programmed, down when ready.
  const tilt = valueOf(b, (k, p) => (k === 'program' ? mix(1.0, 0.2, ss(p, 0.2, 0.8)) : k === 'ready' ? mix(0.2, -0.45, ss(p, 0, 0.5)) : 1.0));
  return { a, b: bb, tilt, bottle: b.from === 'bottle' ? (b.p > 0.7 ? 1 : 0.5) : b.from === 'fillA' ? 1 : 0, bubbles: b.from === 'purge' && b.p > 0.3, screen: b.from === 'program' || b.from === 'ready' };
}
function injKey(k: InjKey, p: number, t: number, s: number, cur: SpotAt): Key {
  const head = INJ.pivot;
  switch (k) {
    case 'bottle': {
      const e = ss(p, 0.15, 0.7);
      const c = mixP(add(INJ.warmer, [0, 0.08, 0.04]), add(head, [-0.05, 0.36, 0.06]), e);
      return { l: c, r: add(c, [0.06, -0.04, 0.02]), lean: 0.15, nod: mix(0.4, -0.1, e), palms: 1.0, gl: 0.85, gr: 0.6, crouch: (1 - e) * 0.18 };
    }
    case 'fillA':
    case 'fillB':
      return { l: add(head, [-0.12, 0.1, 0.1]), r: add(head, [0.11, 0.0, 0.06 + 0.006 * pulse(t, 1.4, s, 2)]), lean: 0.15, nod: 0.25, palms: 0.8, gl: 0.4, gr: 0.6 };
    case 'purge':
      return { l: add(head, [-0.12, 0.08, 0.1]), r: add(head, [k === 'purge' ? -0.02 : 0, 0.22 + 0.015 * pulse(t, 2.6, s, 2), 0.1]), lean: 0.12, nod: 0.0, palms: 1.0, gl: 0.4, gr: 0.5 };
    case 'program':
      return { l: sp(cur, 0.18, 0.95, 0.15), r: add(INJ.screen, [0.01 * Math.floor(p * 5) / 5, 0.01 * pulse(t, 2.4, s, 3) - 0.02, 0.06]), lean: 0.12, nod: 0.15, palms: 0.7, gl: 0.3, gr: 0.5 };
    default:
      return { l: add(head, [-0.1, 0.05, 0.12]), r: add(head, [0.1, 0.05, 0.12]), lean: 0.15, nod: 0.3, palms: 1.0, gl: 0.6, gr: 0.6 };
  }
}

// =============================================================================================
// The changing booth (탈의실, 2 × 1): two cubicles, the left one's curtain open — a bench, hooks, a
// shelf of folded gowns, a basket for valuables.

export const BOOTH = { bench: [-0.5, 0.46, -0.22] as P, shelf: [-0.82, 1.12, -0.3] as P, hook: [-0.3, 1.55, -0.42] as P, basket: [-0.5, 0.18, -0.2] as P };
export const BOOTH_AT = at(-0.5, 0.4, Math.PI);
/**
 * Tidying the changing booth (검사복 정리), ~15 s round: a used gown picked up off the bench; shaken
 * out; folded; put on the shelf's stack; a fresh one hung on the hook; the basket under the bench set
 * straight.
 */
export type GownKey = 'pick' | 'shake' | 'fold' | 'stack' | 'hook' | 'basket';
const GOWNS: Array<Step<GownKey>> = [st('pick', 1.8, 0.5, BOOTH_AT), st('shake', 2.0, 0.4, BOOTH_AT), st('fold', 2.4, 0.5, BOOTH_AT), st('stack', 1.6, 0.5, BOOTH_AT), st('hook', 2.0, 0.5, BOOTH_AT), st('basket', 2.0, 0.6, BOOTH_AT)];
export const gownBeat = (t: number, ph: number) => beatOf(GOWNS, t, ph);
/** The gown in the hands (open 1 … folded 0), on the bench, the stack's count up by one, the hung one. */
export function gownState(b: Beat<GownKey>) {
  return {
    held: (b.from === 'pick' && b.p > 0.5) || b.from === 'shake' || b.from === 'fold' || (b.from === 'stack' && b.p < 0.6),
    open: b.from === 'shake' ? 1 : b.from === 'fold' ? 1 - ss(b.p, 0.1, 0.9) : b.from === 'pick' ? 0.6 : 0,
    onBench: b.from === 'basket' || (b.from === 'pick' && b.p <= 0.5),
    stacked: (b.from === 'stack' && b.p >= 0.6) || b.from === 'hook' || b.from === 'basket',
    hung: (b.from === 'hook' && b.p > 0.55) || b.from === 'basket' || b.from === 'pick' || b.from === 'shake',
    fresh: b.from === 'hook' && b.p <= 0.55,
  };
}
function gownKey(k: GownKey, p: number, t: number, s: number, cur: SpotAt): Key {
  switch (k) {
    case 'pick': {
      const e = ss(p, 0.5, 1);
      return { l: mixP(add(BOOTH.bench, [-0.08, 0.06, 0.02]), sp(cur, 0.16, 1.1, 0.3), e), r: mixP(add(BOOTH.bench, [0.08, 0.06, 0.02]), sp(cur, -0.16, 1.1, 0.3), e), lean: mix(0.45, 0.1, e), nod: 0.45, palms: 1.2, gl: 0.8, gr: 0.8, crouch: 0.45 * (1 - e) };
    }
    case 'shake': {
      const w = 0.04 * Math.abs(wave(t, 1.6, s));
      return { l: sp(cur, 0.24, 1.4 + w, 0.32), r: sp(cur, -0.24, 1.4 + w, 0.32), lean: 0.05, nod: 0.1, palms: 1.0, gl: 0.85, gr: 0.85 };
    }
    case 'fold': {
      const e = ss(p, 0.1, 0.9);
      return { l: sp(cur, mix(0.24, 0.1, e), mix(1.4, 1.05, e), 0.3), r: sp(cur, mix(-0.24, -0.1, e), mix(1.4, 1.05, e), 0.3), lean: 0.12, nod: 0.35, palms: 1.2, gl: 0.8, gr: 0.8 };
    }
    case 'stack':
      return { l: add(BOOTH.shelf, [0.05, 0.08, 0.06]), r: add(BOOTH.shelf, [0.17, 0.08, 0.06]), lean: 0.18, nod: 0.2, palms: 1.3, gl: 0.6, gr: 0.6 };
    case 'hook':
      return { l: sp(cur, 0.12, 1.0, 0.2), r: add(BOOTH.hook, [0, 0.0, 0.06]), lean: 0.15, nod: -0.05, palms: 0.8, gl: 0.3, gr: 0.8 };
    default:
      return { l: add(BOOTH.basket, [-0.12, 0.08, 0.1]), r: add(BOOTH.basket, [0.12, 0.08, 0.1]), lean: 0.55, nod: 0.5, palms: 1.2, gl: 0.6, gr: 0.6, crouch: 0.9 };
  }
}

// =============================================================================================

/** The hands and where the radiographer is for a motion at `t` (`ph`: the piece's clock offset). */
export function rgKeyOf(m: RgMotion, t: number, ph: number): { key: Key; at: SpotAt } {
  const s = ph * 7.3;
  switch (m) {
    case 'rgXray': {
      const b = xrBeat(t, ph);
      return { key: blended(b, (k, p) => xrKey(k, p, t, s, b.at)), at: b.at };
    }
    case 'rgCt':
    case 'rgCtUrgent':
    case 'rgCtContrast': {
      const b = ctBeat(m, t, ph);
      return { key: blended(b, (k, p) => ctKey(k, p, t, s, b.at)), at: b.at };
    }
    case 'rgRecon': {
      const b = reconBeat(t, ph);
      return { key: blended(b, (k, p) => reconKey(k, p, t, s)), at: b.at };
    }
    case 'rgMri': {
      const b = mrBeat(t, ph);
      return { key: blended(b, (k, p) => mrKey(k, p, t, s, b.at)), at: b.at };
    }
    case 'rgLinac': {
      const b = lnBeat(t, ph);
      return { key: blended(b, (k, p) => lnKey(k, p, t, s, b.at, ph)), at: b.at };
    }
    case 'rgComfort': {
      const b = comfortBeat(t, ph);
      return { key: blended(b, (k, p) => comfortKey(k, p, t, s, b.at)), at: b.at };
    }
    case 'rgPacs': {
      const b = deskBeat(t, ph);
      return { key: blended(b, (k, p) => deskKey(k, p, t, s, b.at)), at: b.at };
    }
    case 'rgApron': {
      const b = apronBeat(t, ph);
      return { key: blended(b, (k, p) => apronKey(k, p, t, s, b.at)), at: b.at };
    }
    case 'rgInject': {
      const b = injBeat(t, ph);
      return { key: blended(b, (k, p) => injKey(k, p, t, s, b.at)), at: b.at };
    }
    default: {
      const b = gownBeat(t, ph);
      return { key: blended(b, (k, p) => gownKey(k, p, t, s, b.at)), at: b.at };
    }
  }
}

export function rgDoing(m: RgMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at: cur } = rgKeyOf(m, t, rgPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(cur, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
