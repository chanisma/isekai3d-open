import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * A model's work at the agency (2026-10-27, the 모델 에이전시, at the user's request: model work should
 * look like it). The catwalk walked for real: out from the entrance, down the runway at a steady
 * stride, a stop at the end with a hand on the hip to the front row, a three-quarter turn to the
 * photo pit, turned round and walked back; the posing spot's poses one after another under the
 * strobes (a hand on the hip, the chin on the hand, the hands in the hair, the arms folded, the
 * profile…), wilder ones in the wind for a concept shoot; making up at the vanity with a compact and
 * a sponge, a brush, the mascara and the lipstick; practising expressions in its mirror; a go-see at
 * the casting table (the book handed over, front, both profiles, the back, a walk along the table);
 * being measured on the fitting podium, turned a quarter at a time; a quick change at the backstage
 * rack; a comp card off the printer.
 *
 * Each is a round by the same clock (mdPhase of a fixed mark on the piece, its `work`) as the piece
 * it's done at (workplaces/model.ts), which moves the spot along (the walk) or turns it (a profile)
 * and draws what's in the hands. Hands are offsets in the body's own frame (BarOffset: to their left,
 * up from the feet or the seat's top, ahead), for a 1.6 m dweller, scaled with height. Kept out of
 * activity.ts (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type ModelMotion = 'mdWalk' | 'mdPose' | 'mdConcept' | 'mdMakeup' | 'mdExpress' | 'mdGoSee' | 'mdMeasure' | 'mdQuickChange' | 'mdCompCheck';
export const MODEL_MOTIONS = new Set<string>(['mdWalk', 'mdPose', 'mdConcept', 'mdMakeup', 'mdExpress', 'mdGoSee', 'mdMeasure', 'mdQuickChange', 'mdCompCheck']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const sstep = THREE.MathUtils.smoothstep;
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
export const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(mix(a.side, b.side, e), mix(a.up, b.up, e), mix(a.ahead, b.ahead, e));
export const boScale = (a: BarOffset, k: number): BarOffset => bo(a.side * k, a.up * k, a.ahead * k);
const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
/** The clock offset (as activity.ts toolPhase): from a fixed mark on the piece, so two pieces aren't in step. */
export const mdPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** A held pose: the hands (none: they hang or swing as the body has them), the bend, the grip. */
export interface Hold {
  l?: BarOffset;
  r?: BarOffset;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
}
const H0: Hold = { lean: 0, nod: 0, palms: 0, gl: 0.3, gr: 0.3 };
function holdMix(a: Hold, b: Hold, e: number): Hold {
  const hand = (p?: BarOffset, q?: BarOffset) => (p && q ? boMix(p, q, e) : e < 0.5 ? p : q);
  return {
    l: hand(a.l, b.l),
    r: hand(a.r, b.r),
    lean: mix(a.lean, b.lean, e),
    nod: mix(a.nod, b.nod, e),
    palms: mix(a.palms, b.palms, e),
    gl: mix(a.gl, b.gl, e),
    gr: mix(a.gr, b.gr, e),
    crouch: mix(a.crouch ?? 0, b.crouch ?? 0, e),
  };
}

/** Hands on the hips, knuckles in (standing). */
const HIP_L = bo(0.17, 0.95, -0.02);
const HIP_R = bo(-0.17, 0.95, -0.02);

// ---------------------------------------------------------------------------------------------
// Tracks: where a spot is and which way it faces through a round (the walk, the go-see).

/** A key of a track: from `t` the spot is at (x, z) facing `yaw` in the piece's frame, doing `beat` till the next key. */
export interface TrackKey {
  t: number;
  x: number;
  z: number;
  yaw: number;
  beat: string;
}
export interface TrackAt {
  x: number;
  z: number;
  yaw: number;
  beat: string;
  /** Seconds into the beat, and how long it lasts. */
  v: number;
  len: number;
  /** The beat's place in the round. */
  i: number;
}
/** Where a track is at `t` (its last key is the end of the round, the same place as its first). */
export function trackAt(keys: TrackKey[], t: number, ph: number): TrackAt {
  const T = keys[keys.length - 1].t;
  const u = frac(t / T + ph) * T;
  let i = 0;
  while (i < keys.length - 2 && u >= keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const len = b.t - a.t;
  const v = u - a.t;
  const lin = THREE.MathUtils.clamp(v / len, 0, 1);
  // A walk keeps its pace (just eased off at either end); a turn or a step eases all through.
  const e = a.beat === 'walk' ? (lin < 0.12 ? (lin * lin) / 0.24 : lin > 0.88 ? 1 - ((1 - lin) * (1 - lin)) / 0.24 : (lin - 0.06) / 0.88) : sstep(lin, 0, 1);
  return { x: mix(a.x, b.x, e), z: mix(a.z, b.z, e), yaw: mix(a.yaw, b.yaw, sstep(lin, 0, 1)), beat: a.beat, v, len, i };
}

/**
 * The catwalk (mdWalk, 14.5 s), along the runway's x from the entrance (RUNWAY.x0) to the mark at its
 * end (RUNWAY.x1): a breath at the entrance facing down it, the walk, a quarter turn to the front row
 * and the pose there (a hand on the hip), a three-quarter turn to the photo pit and a second pose,
 * turned round through the front to walk back, and round again at the entrance.
 */
export const RUNWAY = { x0: -1.48, x1: 0.92 };
const HALF = Math.PI / 2;
export const WALK_KEYS: TrackKey[] = [
  { t: 0, x: RUNWAY.x0, z: 0, yaw: HALF, beat: 'still' },
  { t: 1.2, x: RUNWAY.x0, z: 0, yaw: HALF, beat: 'walk' },
  { t: 4.3, x: RUNWAY.x1, z: 0, yaw: HALF, beat: 'turn' },
  { t: 4.9, x: RUNWAY.x1, z: 0, yaw: 0, beat: 'pose' },
  { t: 7.3, x: RUNWAY.x1, z: 0, yaw: 0, beat: 'turn' },
  { t: 7.8, x: RUNWAY.x1, z: 0, yaw: 0.9, beat: 'pose2' },
  { t: 9.6, x: RUNWAY.x1, z: 0, yaw: 0.9, beat: 'turn' },
  { t: 10.5, x: RUNWAY.x1, z: 0, yaw: -HALF, beat: 'walk' },
  { t: 13.6, x: RUNWAY.x0, z: 0, yaw: -HALF, beat: 'turn' },
  { t: 14.5, x: RUNWAY.x0, z: 0, yaw: HALF, beat: 'still' },
];
export const walkAt = (t: number, ph: number) => trackAt(WALK_KEYS, t, ph);

function walkHold(beat: string): Hold {
  switch (beat) {
    case 'pose':
      // To the front row: the left hand on the hip, the chin down a touch, the weight back.
      return { ...H0, l: HIP_L, lean: -0.05, nod: 0.04, palms: 0.5, gl: 0.55 };
    case 'pose2':
      // To the pit: both hands on the hips, the chin up.
      return { ...H0, l: HIP_L, r: HIP_R, lean: -0.04, nod: -0.06, palms: 0.5, gl: 0.55, gr: 0.55 };
    default:
      // Walking or turning: the arms swing loose, the chin level, the shoulders back.
      return { ...H0, lean: -0.04, nod: -0.05 };
  }
}

/**
 * A go-see at the casting table (mdGoSee, 23.6 s), in the table's frame, stood GOSEE.z in front of
 * it: the book handed across, stood to the front, turned for the left profile, the back, the right
 * profile and to the front again with a hand on the hip (the polaroid flashing each time), a walk
 * along the table and back ("워킹 한번 볼게요"), and talking about the last jobs.
 */
export const GOSEE = { z: 0.85, x: 1.0 };
const P = Math.PI;
export const GOSEE_KEYS: TrackKey[] = [
  { t: 0, x: 0, z: GOSEE.z, yaw: P, beat: 'book' },
  { t: 2.6, x: 0, z: GOSEE.z, yaw: P, beat: 'front' },
  { t: 4.8, x: 0, z: GOSEE.z, yaw: P, beat: 'turn' },
  { t: 5.3, x: 0, z: GOSEE.z, yaw: HALF, beat: 'profile' },
  { t: 6.9, x: 0, z: GOSEE.z, yaw: HALF, beat: 'turn' },
  { t: 7.4, x: 0, z: GOSEE.z, yaw: 0, beat: 'back' },
  { t: 8.8, x: 0, z: GOSEE.z, yaw: 0, beat: 'turn' },
  { t: 9.3, x: 0, z: GOSEE.z, yaw: -HALF, beat: 'profile' },
  { t: 10.7, x: 0, z: GOSEE.z, yaw: -HALF, beat: 'turn' },
  { t: 11.2, x: 0, z: GOSEE.z, yaw: -P, beat: 'hip' },
  { t: 12.8, x: 0, z: GOSEE.z, yaw: -P, beat: 'turn' },
  { t: 13.3, x: 0, z: GOSEE.z, yaw: -HALF, beat: 'walk' },
  { t: 14.7, x: -GOSEE.x, z: GOSEE.z, yaw: -HALF, beat: 'turn' },
  { t: 15.3, x: -GOSEE.x, z: GOSEE.z, yaw: -1.5 * P, beat: 'walk' },
  { t: 18.1, x: GOSEE.x, z: GOSEE.z, yaw: -1.5 * P, beat: 'turn' },
  { t: 18.7, x: GOSEE.x, z: GOSEE.z, yaw: -HALF, beat: 'walk' },
  { t: 20.1, x: 0, z: GOSEE.z, yaw: -HALF, beat: 'turn' },
  { t: 20.6, x: 0, z: GOSEE.z, yaw: -P, beat: 'talk' },
  { t: 23.6, x: 0, z: GOSEE.z, yaw: -P, beat: 'book' },
];
export const goSeeAt = (t: number, ph: number) => trackAt(GOSEE_KEYS, t, ph);
/** The book held out over the table in both hands (its middle, in the body's frame). */
export const BOOK_OUT = bo(0, 1.02, 0.46);

function goSeeHold(beat: string, t: number, s: number): Hold {
  switch (beat) {
    case 'book':
      return { ...H0, l: boAdd(BOOK_OUT, bo(0.13, 0, -0.02)), r: boAdd(BOOK_OUT, bo(-0.13, 0, -0.02)), lean: 0.28, nod: 0.3, palms: 0.9, gl: 0.6, gr: 0.6 };
    case 'front':
    case 'back':
      return { ...H0, lean: -0.03, nod: -0.02 };
    case 'profile':
      return { ...H0, lean: -0.03, nod: -0.04 };
    case 'hip':
      return { ...H0, l: HIP_L, lean: -0.05, nod: 0.03, palms: 0.5, gl: 0.55 };
    case 'talk': {
      const up = 0.03 * wave(t, 0.7, s);
      return { ...H0, l: bo(0.07, 0.93, 0.16), r: bo(-0.2, 1.08 + up, 0.3), lean: 0.03, nod: 0.02 + 0.05 * Math.max(0, wave(t, 0.5, s)) ** 3, palms: -0.4, gl: 0.45, gr: 0.2 };
    }
    default:
      return { ...H0, lean: -0.04, nod: -0.05 };
  }
}

// ---------------------------------------------------------------------------------------------
// Rounds of held poses: each held a while, then eased into the next.

interface Step {
  hold: Hold;
  /** How far the spot turns for it (to the left, radians). */
  twist?: number;
  /** Which measurement it's for, or which tool's in the hand (the piece draws them). */
  tag?: string;
}
export interface StepAt {
  i: number;
  h: Hold;
  twist: number;
  /** Seconds into the hold (−1 while easing on to the next). */
  v: number;
  tag: string;
}
function stepAt(steps: Step[], hold: number, move: number, t: number, ph: number): StepAt {
  const T = steps.length * (hold + move);
  const u = frac(t / T + ph) * T;
  const i = Math.floor(u / (hold + move)) % steps.length;
  const v = u - i * (hold + move);
  const a = steps[i];
  const b = steps[(i + 1) % steps.length];
  const e = sstep(v, hold, hold + move);
  return { i, h: holdMix(a.hold, b.hold, e), twist: mix(a.twist ?? 0, b.twist ?? 0, e), v: v < hold ? v : -1, tag: (e < 0.5 ? a : b).tag ?? '' };
}

/**
 * Posing for the camera (mdPose, 7 × 3 s): a hand on the hip turned a little; the chin on the hand,
 * the other arm under the elbow; both hands up in the hair, the chin up; arms folded, turned away;
 * the hands at the pockets, three-quarter on; a hand at the collar; the profile, hands on the hips.
 */
const POSES: Step[] = [
  { hold: { ...H0, l: HIP_L, r: bo(-0.21, 0.82, 0.05), lean: -0.04, nod: -0.03, palms: 0.5, gl: 0.55 }, twist: 0.3 },
  { hold: { ...H0, l: bo(-0.04, 1.12, 0.21), r: bo(-0.01, 1.4, 0.15), lean: 0.04, nod: 0.07, palms: 0.9, gl: 0.5, gr: 0.75 }, twist: -0.3 },
  { hold: { ...H0, l: bo(0.13, 1.63, -0.03), r: bo(-0.13, 1.63, -0.03), lean: -0.06, nod: -0.13, palms: 0.4, gl: 0.45, gr: 0.45 }, twist: 0.1 },
  { hold: { ...H0, l: bo(-0.11, 1.12, 0.16), r: bo(0.11, 1.15, 0.15), lean: -0.02, nod: 0.03, palms: 1.2, gl: 0.6, gr: 0.6 }, twist: -0.5 },
  { hold: { ...H0, l: bo(0.15, 0.88, 0.07), r: bo(-0.15, 0.88, 0.07), lean: -0.05, nod: 0.08, palms: 0.8, gl: 0.7, gr: 0.7 }, twist: 0.55 },
  { hold: { ...H0, l: HIP_L, r: bo(-0.05, 1.33, 0.13), lean: -0.03, nod: -0.06, palms: 0.6, gl: 0.55, gr: 0.6 }, twist: -0.15 },
  { hold: { ...H0, l: HIP_L, r: HIP_R, lean: -0.04, nod: -0.05, palms: 0.5, gl: 0.55, gr: 0.55 }, twist: 1.3 },
];
/**
 * A concept shoot in the wind (mdConcept, 6 × 3 s): an arm flung up and out; the face framed in both
 * hands; leant into the wind, a hand holding the hair back; both arms out wide like wings; a crouch
 * with the hands on the knees, the chin up; turned away, looking back over the shoulder.
 */
const CONCEPT: Step[] = [
  { hold: { ...H0, l: bo(0.38, 1.82, 0.14), r: bo(-0.21, 0.83, 0.05), lean: -0.08, nod: -0.16, palms: -0.4, gl: 0.15 }, twist: 0.25 },
  { hold: { ...H0, l: bo(0.09, 1.45, 0.12), r: bo(-0.09, 1.45, 0.12), lean: 0.05, nod: 0.04, palms: 1.6, gl: 0.2, gr: 0.2 }, twist: -0.2 },
  { hold: { ...H0, l: bo(0.1, 1.66, -0.05), r: bo(-0.2, 0.9, 0.12), lean: 0.12, nod: -0.08, palms: 0.4, gl: 0.6, gr: 0.3 }, twist: 0.45 },
  { hold: { ...H0, l: bo(0.62, 1.35, 0.05), r: bo(-0.62, 1.35, 0.05), lean: -0.05, nod: -0.1, palms: 0.2, gl: 0.1, gr: 0.1 }, twist: 0 },
  { hold: { ...H0, l: bo(0.14, 0.55, 0.3), r: bo(-0.14, 0.55, 0.3), lean: 0.3, nod: -0.25, palms: 1.2, gl: 0.5, gr: 0.5, crouch: 0.45 }, twist: -0.35 },
  { hold: { ...H0, l: HIP_L, r: bo(-0.15, 0.95, -0.1), lean: -0.04, nod: -0.04, palms: 0.5, gl: 0.55, gr: 0.4 }, twist: 2.3 },
];
export const POSE_HOLD = 2.4;
export const POSE_MOVE = 0.6;
export const poseAt = (concept: boolean, t: number, ph: number) => stepAt(concept ? CONCEPT : POSES, POSE_HOLD, POSE_MOVE, t, ph);
/** The strobes' flash (0–1) at `v` seconds into a pose: two frames a pose. */
export const poseFlash = (v: number) => (v < 0 ? 0 : Math.max(0, 1 - Math.abs(v - 0.95) / 0.09, 1 - Math.abs(v - 1.75) / 0.09));

/**
 * Making up at the vanity, sat (mdMakeup, 6 × 2.6 s), the compact in the left hand: the sponge dabbed
 * on the right cheek, then the left; the powder brush swept over the cheek; the mascara at the eye,
 * the chin up and the other hand on the counter; the lipstick along the lips; leant to the mirror to
 * look it over, the hands on the counter. Offsets from the seat's top; `tag` the tool in the hand.
 */
const COMPACT = bo(0.09, 0.47, 0.27);
const COUNTER_L = bo(0.17, 0.27, 0.33);
const COUNTER_R = bo(-0.17, 0.27, 0.33);
const MAKEUP: Step[] = [
  { hold: { ...H0, l: COMPACT, r: bo(-0.065, 0.79, 0.15), lean: 0.12, nod: 0.05, palms: 0.9, gl: 0.6, gr: 0.7 }, tag: 'sponge' },
  { hold: { ...H0, l: COMPACT, r: bo(0.05, 0.8, 0.16), lean: 0.12, nod: 0.05, palms: 0.9, gl: 0.6, gr: 0.7 }, tag: 'sponge' },
  { hold: { ...H0, l: COMPACT, r: bo(-0.08, 0.81, 0.16), lean: 0.14, nod: 0.02, palms: 0.6, gl: 0.6, gr: 0.8 }, tag: 'brush' },
  { hold: { ...H0, l: COUNTER_L, r: bo(-0.035, 0.87, 0.17), lean: 0.2, nod: -0.12, palms: 0.9, gl: 0.3, gr: 0.85 }, tag: 'mascara' },
  { hold: { ...H0, l: COMPACT, r: bo(0, 0.745, 0.17), lean: 0.16, nod: -0.02, palms: 0.9, gl: 0.6, gr: 0.85 }, tag: 'lipstick' },
  { hold: { ...H0, l: COUNTER_L, r: COUNTER_R, lean: 0.3, nod: 0.02, palms: 1.3, gl: 0.3, gr: 0.3 }, tag: '' },
];
export const MAKEUP_HOLD = 2.0;
export const MAKEUP_MOVE = 0.6;
export const makeupAt = (t: number, ph: number) => stepAt(MAKEUP, MAKEUP_HOLD, MAKEUP_MOVE, t, ph);
/** The compact in the left hand when it's there (its middle from the hand), and the tool in the right. */
export const COMPACT_AT = COMPACT;

/**
 * Practising expressions in the mirror, sat (mdExpress, 6 × 2.4 s): the face framed in both palms;
 * the chin on the right fist, the left arm on the counter; the fingertips at the corners of the mouth
 * (a smile pushed up); the fingers at the brows; the hands down on the counter, leant in close; a
 * look away over the shoulder and back.
 */
const EXPRESS: Step[] = [
  { hold: { ...H0, l: bo(0.1, 0.8, 0.12), r: bo(-0.1, 0.8, 0.12), lean: 0.12, nod: 0.02, palms: 1.6, gl: 0.15, gr: 0.15 } },
  { hold: { ...H0, l: COUNTER_L, r: bo(-0.02, 0.71, 0.17), lean: 0.22, nod: 0.08, palms: 0.4, gl: 0.3, gr: 0.85 }, twist: 0.12 },
  { hold: { ...H0, l: bo(0.035, 0.76, 0.15), r: bo(-0.035, 0.76, 0.15), lean: 0.16, nod: -0.03, palms: 1.4, gl: 0.6, gr: 0.6 } },
  { hold: { ...H0, l: bo(0.045, 0.9, 0.14), r: bo(-0.045, 0.9, 0.14), lean: 0.16, nod: -0.06, palms: 1.4, gl: 0.6, gr: 0.6 } },
  { hold: { ...H0, l: COUNTER_L, r: COUNTER_R, lean: 0.32, nod: 0.05, palms: 1.3, gl: 0.3, gr: 0.3 } },
  { hold: { ...H0, l: COUNTER_L, r: bo(-0.15, 0.42, 0.12), lean: 0.06, nod: -0.04, palms: 0.6, gl: 0.3, gr: 0.3 }, twist: -0.5 },
];
export const expressAt = (t: number, ph: number) => stepAt(EXPRESS, 2.4, 0.6, t, ph);

/**
 * Measured on the fitting podium (mdMeasure, 5 × 3.2 s), turned a quarter each time: the arms out for
 * the bust, side on with the arms out for the waist, to the mirror with the hands on the hips for the
 * hips, side on with the arms down by the sides for the height, and to the front again, the hands
 * clasped in front. `tag` is what's measured (the piece draws the tape there).
 */
const MEASURE: Step[] = [
  { hold: { ...H0, l: bo(0.6, 1.3, 0.02), r: bo(-0.6, 1.3, 0.02), lean: -0.02, nod: -0.02, palms: 0.2, gl: 0.2, gr: 0.2 }, twist: 0, tag: 'bust' },
  { hold: { ...H0, l: bo(0.6, 1.3, 0.02), r: bo(-0.6, 1.3, 0.02), lean: -0.02, nod: -0.02, palms: 0.2, gl: 0.2, gr: 0.2 }, twist: Math.PI / 2, tag: 'waist' },
  { hold: { ...H0, l: HIP_L, r: HIP_R, lean: -0.03, nod: 0.05, palms: 0.5, gl: 0.55, gr: 0.55 }, twist: Math.PI, tag: 'hip' },
  { hold: { ...H0, lean: -0.03, nod: 0 }, twist: 1.5 * Math.PI, tag: 'height' },
  { hold: { ...H0, l: bo(0.03, 0.82, 0.12), r: bo(-0.03, 0.82, 0.12), lean: 0, nod: 0.04, palms: 1.2, gl: 0.5, gr: 0.5 }, twist: 2 * Math.PI, tag: '' },
];
export const MEASURE_HOLD = 2.4;
export const MEASURE_MOVE = 0.8;
export function measureAt(t: number, ph: number): StepAt {
  const s = stepAt(MEASURE, MEASURE_HOLD, MEASURE_MOVE, t, ph);
  // Round from the front again without spinning back the whole way.
  return { ...s, twist: s.i === MEASURE.length - 1 ? 2 * Math.PI : s.twist };
}

/**
 * A quick change at the backstage rack (mdQuickChange, 5 × 2.4 s), stood at it: the next look's
 * hanger taken off the rail; held up against the body to check it, the head down to it; hung back;
 * crouched to the shoe shelf for the shoes; a finger on the running order's polaroid. `tag` 'dress'
 * while the look's in the hands.
 */
const RAIL = bo(-0.12, 1.62, 0.38);
const CHANGE: Step[] = [
  { hold: { ...H0, l: bo(0.2, 0.86, 0.06), r: RAIL, lean: 0.05, nod: -0.12, palms: 0.3, gr: 0.85 }, tag: 'rail' },
  { hold: { ...H0, l: bo(0.05, 1.42, 0.22), r: bo(-0.05, 1.42, 0.22), lean: 0.02, nod: 0.38, palms: 0.4, gl: 0.8, gr: 0.8 }, tag: 'dress' },
  { hold: { ...H0, l: bo(0.2, 0.86, 0.06), r: RAIL, lean: 0.05, nod: -0.12, palms: 0.3, gr: 0.85 }, tag: 'rail' },
  { hold: { ...H0, l: bo(0.12, 0.3, 0.42), r: bo(-0.1, 0.3, 0.42), lean: 0.4, nod: 0.4, palms: 1.1, gl: 0.7, gr: 0.7, crouch: 0.75 }, tag: 'shoes' },
  { hold: { ...H0, l: HIP_L, r: bo(0.02, 1.84, 0.48), lean: 0.02, nod: -0.3, palms: 0.4, gl: 0.55, gr: 0.4 }, tag: 'board' },
];
export const quickChangeAt = (t: number, ph: number) => stepAt(CHANGE, 2.0, 0.6, t, ph);
/** The hanger's hook when the look's held up against the body (body frame). */
export const DRESS_HOLD = bo(0, 1.46, 0.24);

/**
 * A comp card off the printer (mdCompCheck, 5 steps), stood at the printer desk: the layout sent from
 * the keyboard; waiting as the card feeds out; taken off the tray; held up in both hands and looked
 * over; laid on the stack. Points on the desk are given in the body's frame by the piece (COMP).
 */
export const COMP = { keys: bo(-0.32, 0.79, 0.42), tray: bo(0.3, 0.87, 0.38), look: bo(0, 1.25, 0.3), stack: bo(-0.02, 0.79, 0.42) };
const COMPSTEPS: Step[] = [
  { hold: { ...H0, l: boAdd(COMP.keys, bo(0.1, 0, 0)), r: boAdd(COMP.keys, bo(-0.1, 0, 0)), lean: 0.2, nod: 0.3, palms: 1.45, gl: 0.35, gr: 0.35 }, tag: 'type' },
  { hold: { ...H0, l: bo(0.18, 0.88, 0.08), r: bo(-0.18, 0.88, 0.08), lean: 0.06, nod: 0.25, palms: 0.4 }, tag: 'feed' },
  { hold: { ...H0, l: boAdd(COMP.tray, bo(0.07, 0, 0)), r: boAdd(COMP.tray, bo(-0.07, 0, 0)), lean: 0.22, nod: 0.38, palms: 1.2, gl: 0.6, gr: 0.6 }, tag: 'take' },
  { hold: { ...H0, l: boAdd(COMP.look, bo(0.07, 0, 0)), r: boAdd(COMP.look, bo(-0.07, 0, 0)), lean: 0.02, nod: 0.12, palms: 0.4, gl: 0.6, gr: 0.6 }, tag: 'look' },
  { hold: { ...H0, l: boAdd(COMP.stack, bo(0.07, 0, 0)), r: boAdd(COMP.stack, bo(-0.07, 0, 0)), lean: 0.22, nod: 0.4, palms: 1.2, gl: 0.6, gr: 0.6 }, tag: 'stack' },
];
export const compAt = (t: number, ph: number) => stepAt(COMPSTEPS, 2.2, 0.6, t, ph);

// ---------------------------------------------------------------------------------------------

/** The hands and bend for a model's motion at `t`, from the piece's fixed mark (`work`). */
export function modelDoing(m: ModelMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const k = b.height / 1.6;
  const ph = mdPhase(work?.point ?? b.base);
  const s = ph * 7.1;
  const place = (o: BarOffset) => b.base.clone().addScaledVector(left, o.side * k).addScaledVector(fwd, o.ahead * k).setY(b.base.y + o.up * k);
  let h: Hold;
  switch (m) {
    case 'mdWalk':
      h = walkHold(walkAt(t, ph).beat);
      break;
    case 'mdGoSee':
      h = goSeeHold(goSeeAt(t, ph).beat, t, s);
      break;
    case 'mdPose':
    case 'mdConcept': {
      h = poseAt(m === 'mdConcept', t, ph).h;
      // A breath in the pose.
      h = { ...h, nod: h.nod + 0.015 * wave(t, 0.3, s) };
      break;
    }
    case 'mdMakeup': {
      const at = makeupAt(t, ph);
      h = at.h;
      if (at.v >= 0 && h.r) {
        // Dabbing, sweeping, combing up the lashes, drawing along the lips.
        const d = at.tag === 'sponge' ? bo(0, 0, 0.012 * Math.max(0, wave(t, 2.6, s))) : at.tag === 'brush' ? bo(0.025 * wave(t, 1.3, s), 0.015 * wave(t, 2.6, s), 0) : at.tag === 'mascara' ? bo(0, 0.008 * wave(t, 2.2, s), 0) : at.tag === 'lipstick' ? bo(0.025 * wave(t, 0.8, s), 0, 0) : bo(0, 0, 0);
        h = { ...h, r: boAdd(h.r, d) };
      }
      break;
    }
    case 'mdExpress':
      h = expressAt(t, ph).h;
      break;
    case 'mdMeasure':
      h = measureAt(t, ph).h;
      break;
    case 'mdQuickChange':
      h = quickChangeAt(t, ph).h;
      break;
    default:
      h = compAt(t, ph).h;
      if (compAt(t, ph).tag === 'type' && h.l && h.r) h = { ...h, l: boAdd(h.l, bo(0, 0.012 * Math.max(0, wave(t, 6.5, s)), 0)), r: boAdd(h.r, bo(0, 0.012 * Math.max(0, wave(t, 6.5, s + 0.5)), 0)) };
  }
  const reach = { l: h.l && place(h.l), r: h.r && place(h.r), lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: m === 'mdCompCheck' && compAt(t, ph).tag === 'type' };
  return { reach, crouch: h.crouch || undefined };
}
