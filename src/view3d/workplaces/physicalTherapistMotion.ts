import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 재활센터 (2026-10-27, the workplace pipeline, at the user's request): hands-on physical therapy.
 * At the treatment table a patient lying on their back has a knee bent and straightened through its
 * range (a hand under the heel, one on the knee), the kneecap glided, the shoulder lifted overhead (a
 * hand at the wrist, one cupping the elbow) — the therapist side-stepping up the table between them; a
 * patient lying face down has a hot pack laid on the lower back, covered, checked and timed; a knee
 * fresh from surgery (in its hinged brace) gets ankle pumps, a quad set and a very gentle bend; a
 * trainee watches a senior's mobilisation from the foot and takes notes; a plan is made sat on the
 * stool, the knee's bend measured with a goniometer and written up. On the gym ball a patient balances
 * (marching, reaching for the therapist's hand, bouncing) with the therapist half kneeling at their
 * side, hands at the hips; an athlete's knee is taped (the Y strip round the kneecap, the I strip
 * under it, rubbed on). At the stall bars a band press and external rotations are coached; on the
 * training stairs a patient with a cane climbs up with the good leg and comes down with the bad, the
 * therapist guarding at the belt from below; at the modality cart ultrasound is circled on a shoulder
 * and interferential suction cups are put on a lower back; a hot pack is lifted out of the heater with
 * the tongs and wrapped in its cover.
 *
 * Each is a round of beats by one clock (ptPhase of the piece's fixed mark) shared with the piece
 * (workplaces/physicalTherapist.ts), so the patient's leg bends as the hands push it. Every place is
 * written in the PIECE's frame (x across its front, y up from the floor, z out of its front) and
 * turned into the dweller's own frame by the spot it's done at. Kept out of activity.ts (which only hands
 * these motions over here) so it imports nothing from it at run time.
 */
export type PtMotion =
  | 'ptManual' | 'ptHeat' | 'ptPostOp' | 'ptObserve' | 'ptPlan'
  | 'ptBall' | 'ptTape'
  | 'ptBand' | 'ptStairs' | 'ptUltrasound' | 'ptIct' | 'ptHotPack';
export const PT_MOTIONS = new Set<string>(['ptManual', 'ptHeat', 'ptPostOp', 'ptObserve', 'ptPlan', 'ptBall', 'ptTape', 'ptBand', 'ptStairs', 'ptUltrasound', 'ptIct', 'ptHotPack']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset: from a fixed mark on the piece, so two tables aren't in step. */
export const ptPhase = (p: THREE.Vector3) => frac(p.x * 0.413 + p.z * 0.587);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;
const sin2 = (x: number) => Math.sin(x) ** 2;

/** A place in a piece's frame: [x, y, z]. */
export type P = [number, number, number];
export const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: P, k: number): P => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: P) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: P): P => scale(a, 1 / (len(a) || 1));
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

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
/** Facing from one place towards another (a spot's yaw). */
export const yawTo = (fx: number, fz: number, tx: number, tz: number) => Math.atan2(tx - fx, tz - fz);

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
const st = <K extends string>(key: K, hold: number, move = 0.7): Step<K> => ({ key, hold, move });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}
/** A value each beat has (given how far through it is), eased from one beat's to the next's. */
function valueOf<K extends string>(b: Beat<K>, v: (k: K, p: number) => number): number {
  return b.e > 0 ? mix(v(b.from, 1), v(b.to, 0), b.e) : v(b.from, b.p);
}
/** Whether the round's in a beat's hold (not easing out of it), and past `after` of it. */
export const holding = <K extends string>(b: Beat<K>, key: K, after = 0) => b.from === key && b.e === 0 && b.p >= after;

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
// Bodies drawn in: where a leg's knee goes, a leg moved through its range, an arm lifted.

export const THIGH = 0.42;
export const SHIN = 0.41;
/** The knee of a leg from the hip to the ankle, bending towards `pole`. */
export function kneeIK(hip: P, ankle: P, pole: P): P {
  const d0 = sub(ankle, hip);
  const L = Math.min(THIGH + SHIN - 0.005, Math.max(0.1, len(d0)));
  const d = norm(d0);
  const cosA = THREE.MathUtils.clamp((THIGH * THIGH + L * L - SHIN * SHIN) / (2 * THIGH * L), -1, 1);
  const bend = norm(sub(pole, scale(d, dot(pole, d))));
  return add(add(hip, scale(d, THIGH * cosA)), scale(bend, THIGH * Math.sqrt(1 - cosA * cosA)));
}

// =============================================================================================
// The treatment table (치료 베드), 1 × 2: its head against the wall (-z), the foot out at +z.

/** The cushion's top, half its width, half its length. */
export const TABLE = { top: 0.74, half: 0.33, len: 0.93 };
const TOP = TABLE.top;
/** Lying on the back: the hip line's middle, the way up the body (to the head), out of the chest. */
export const SUPINE = { pelvis: [0, TOP + 0.1, -0.08] as P, up: [0, 0, -1] as P, front: [0, 1, 0] as P };
/** Lying face down, the face in the table's breathing hole. */
export const PRONE = { pelvis: [0, TOP + 0.1, -0.06] as P, up: [0, 0, -1] as P, front: [0, -1, 0] as P };
/** The supine patient's left hip and shoulder (their left is +x, the therapist's side), and the right hip. */
export const HIP_L: P = [0.09, TOP + 0.1, -0.08];
export const HIP_R: P = [-0.09, TOP + 0.1, -0.08];
export const SHOULDER_L: P = [0.2, TOP + 0.1, -0.54];
const UPW: P = [0, 1, 0];
/** A leg lying on the table taken through its range by the therapist: `b` 0 flat, 1 hip and knee bent well up (the heel lifted). */
export function legRom(hip: P, b: number): P {
  const a = 0.95 * b;
  const k = 2.0 * b;
  const knee = add(hip, [0, THIGH * Math.sin(a), THIGH * Math.cos(a)]);
  return add(knee, [0, SHIN * Math.sin(a - k) - 0.04 * (1 - b), SHIN * Math.cos(a - k)]);
}
/** A heel slid up the table by the patient themself: `b` 0 flat, 1 the knee bent up. */
export const heelSlide = (hip: P, b: number): P => [hip[0], TOP + 0.06, hip[2] + 0.81 - 0.42 * b];
export const kneeOnTable = (hip: P, ankle: P): P => kneeIK(hip, ankle, UPW);
/** The supine left arm lifted overhead `phi` (0 by the side): the hand, the wrist and the elbow. */
export function armFlex(phi: number): { hand: P; wrist: P; elbow: P } {
  const d: P = [0, Math.sin(phi), Math.cos(phi)];
  const drop: P = [0, -0.045 * Math.max(0, Math.cos(phi)), 0];
  return { hand: add(add(SHOULDER_L, scale(d, 0.49)), drop), wrist: add(add(SHOULDER_L, scale(d, 0.43)), drop), elbow: add(SHOULDER_L, scale(d, 0.27)) };
}

// ---- Manual therapy (도수 치료): knee range, the kneecap glided, the shoulder lifted.
const KNEE_Z = 0.34;
const SHOULDER_Z = -0.38;
export const manualAt = (z: number): SpotAt => ({ x: 0.5, y: 0, z, yaw: -Math.PI / 2 });
/**
 * ~30 s round: asking where it hurts (a hand on the knee); the knee bent up towards the chest and
 * straightened three times (the heel cupped, a hand on the knee); the kneecap glided with both
 * thumbs; side-stepped up to the shoulder, lifted overhead twice (the wrist held, the elbow cupped);
 * back down to the knee, a word and a pat on the shin.
 */
export type ManualKey = 'greet' | 'knee' | 'patella' | 'up' | 'shoulder' | 'down' | 'rest';
const MANUAL: Array<Step<ManualKey>> = [st('greet', 2.6), st('knee', 9), st('patella', 4, 0.6), st('up', 0.7, 0.5), st('shoulder', 8), st('down', 0.7, 0.5), st('rest', 2.6, 0.8)];
export const manualBeat = (t: number, ph: number) => beatOf(MANUAL, t, ph);
export const manualKnee = (b: Beat<ManualKey>) => (holding(b, 'knee') ? sin2(Math.PI * 3 * b.p) : 0);
export const manualPhi = (b: Beat<ManualKey>) => (holding(b, 'shoulder') ? 2.0 * sin2(Math.PI * 2 * b.p) : 0);
export const manualZ = (b: Beat<ManualKey>) =>
  valueOf(b, (k, p) => (k === 'up' ? mix(KNEE_Z, SHOULDER_Z, ss(p)) : k === 'shoulder' ? SHOULDER_Z : k === 'down' ? mix(SHOULDER_Z, KNEE_Z, ss(p)) : KNEE_Z));
/** The knee-range hands (the heel cupped, a hand on the knee) for a leg bent `kb`. */
function romKey(kb: number): Key {
  const ankle = legRom(HIP_L, kb);
  const knee = kneeOnTable(HIP_L, ankle);
  return { l: add(ankle, [0.035, -0.03, 0.06]), r: add(knee, [0.03, 0.075, -0.01]), lean: 0.55 - 0.18 * kb, nod: 0.45, palms: 1.2, gl: 0.6, gr: 0.3 };
}
function manualKey(k: ManualKey, _p: number, t: number, s: number, kb: number, phi: number, z: number): Key {
  const ankle = legRom(HIP_L, kb);
  const knee = kneeOnTable(HIP_L, ankle);
  const edge = (dz: number): P => [0.38, TOP + 0.05, z + dz];
  switch (k) {
    case 'knee':
      return romKey(kb);
    case 'patella': {
      const g = 0.012 * wave(t, 1.4, s);
      return { l: add(knee, [0.02, 0.07, 0.05 + g]), r: add(knee, [0.02, 0.07, -0.05 + g]), lean: 0.6, nod: 0.6, palms: 1.4, gl: 0.2, gr: 0.2 };
    }
    case 'up':
    case 'down':
      return { l: edge(0.16), r: edge(-0.16), lean: 0.22, nod: 0.3, palms: 1.2, gl: 0.3, gr: 0.3 };
    case 'shoulder': {
      const a = armFlex(phi);
      return { l: add(a.wrist, [0.04, 0.0, 0.02]), r: add(a.elbow, [0.04, -0.035, 0.0]), lean: 0.42 - 0.22 * Math.sin(phi), nod: 0.35 - 0.2 * Math.sin(phi), palms: 0.6, gl: 0.75, gr: 0.4 };
    }
    case 'rest': {
      const shin = mixP(knee, ankle, 0.4);
      return { l: edge(0.25), r: add(shin, [0.03, 0.065, 0]), lean: 0.3, nod: 0.25 + 0.06 * pulse(t, 0.5, s), palms: 1.3, gl: 0.3, gr: 0.2 };
    }
    default:
      return { l: edge(0.25), r: add(knee, [0.03, 0.075, 0]), lean: 0.28, nod: 0.24 + 0.06 * pulse(t, 0.45, s), palms: 1.3, gl: 0.3, gr: 0.25 };
  }
}

// ---- A hot pack (온열 치료): lying face down, the pack laid on the lower back.
export const HEAT_AT: SpotAt = { x: 0.5, y: 0, z: -0.16, yaw: -Math.PI / 2 };
/** The pack on the lower back, and held up off it. */
export const PACK_ON: P = [0, TOP + 0.228, -0.22];
const PACK_HOLD: P = [0.26, TOP + 0.42, -0.2];
/** The timer clipped to the table's near side. */
export const TIMER: P = [TABLE.half + 0.02, TOP - 0.05, 0.12];
/**
 * ~24 s round: the wrapped pack lowered onto the lower back; covered with a towel, its edges tucked;
 * a corner lifted, a palm under it (뜨겁지 않으세요?); the timer set (15분); a hand on the shoulder
 * blade while it works; and lifted off again.
 */
export type HeatKey = 'lay' | 'cover' | 'check' | 'timer' | 'wait' | 'off';
const HEAT: Array<Step<HeatKey>> = [st('lay', 3.2, 0.6), st('cover', 2.6, 0.6), st('check', 3, 0.6), st('timer', 2.4, 0.6), st('wait', 5, 0.6), st('off', 2.4, 0.8)];
export const heatBeat = (t: number, ph: number) => beatOf(HEAT, t, ph);
/** Where the pack is, whether it shows, whether the towel's over it, how far its corner's lifted. */
export function heatPack(b: Beat<HeatKey>): { at: P; shown: boolean; towel: boolean; lift: number } {
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  if (k === 'lay') return { at: mixP(PACK_HOLD, PACK_ON, ss(p, 0.2, 0.85)), shown: true, towel: false, lift: 0 };
  if (k === 'off') return { at: mixP(PACK_ON, PACK_HOLD, ss(p, 0.15, 0.7)), shown: p < 0.97 || b.e < 0.2, towel: false, lift: 0 };
  return { at: PACK_ON, shown: true, towel: k !== 'cover' || p > 0.35, lift: k === 'check' && b.e === 0 ? Math.sin(Math.PI * p) : 0 };
}
function heatKey(k: HeatKey, p: number, t: number, s: number): Key {
  const edge = (z: number): P => [0.38, TOP + 0.05, z];
  switch (k) {
    case 'lay':
    case 'off': {
      const at = heatPack({ from: k, to: k, e: 0, p, n: 0 }).at;
      return { l: add(at, [0.11, 0.02, 0.13]), r: add(at, [0.11, 0.02, -0.13]), lean: 0.48, nod: 0.45, palms: 1.3, gl: 0.5, gr: 0.5 };
    }
    case 'cover': {
      const w = 0.06 * wave(t, 0.8, s);
      return { l: [0.13 + w, TOP + 0.26, -0.08], r: [0.13 - w, TOP + 0.26, -0.36], lean: 0.55, nod: 0.5, palms: 1.5, gl: 0, gr: 0 };
    }
    case 'check':
      return { l: [0.1, TOP + 0.26, -0.08], r: [0.12, TOP + 0.245 + 0.04 * Math.sin(Math.PI * p), -0.32], lean: 0.55, nod: 0.5, palms: 1.4, gl: 0.1, gr: 0.4 };
    case 'timer':
      return { l: add(TIMER, [0.05, 0.012 + 0.008 * pulse(t, 2, s, 2), 0]), r: edge(-0.34), lean: 0.5, nod: 0.6, palms: 0.6, gl: 0.7, gr: 0.3 };
    default:
      // A hand on the near shoulder blade (theirs is the right, lying face down), a word.
      return { l: edge(0.0), r: [0.1, TOP + 0.215, -0.42], lean: 0.45, nod: 0.25 + 0.06 * pulse(t, 0.45, s), palms: 1.3, gl: 0.3, gr: 0.15 };
  }
}

// ---- Straight after surgery (수술 직후 재활): the braced knee.
export const POSTOP_AT: SpotAt = { x: 0.5, y: 0, z: 0.5, yaw: -Math.PI / 2 };
/**
 * ~25 s round: a word to settle them (괜찮아요, 천천히 해 볼게요), a hand on the brace; ankle pumps
 * (the sole pushed and let go); a quad set (a hand under the knee to press down on); the knee bent a
 * very little way twice, slowly, watching their face; well done, a thumbs up.
 */
export type PostOpKey = 'explain' | 'ankle' | 'quad' | 'bend' | 'praise';
const POSTOP: Array<Step<PostOpKey>> = [st('explain', 3), st('ankle', 5, 0.6), st('quad', 4, 0.6), st('bend', 8), st('praise', 2.8, 0.8)];
export const postOpBeat = (t: number, ph: number) => beatOf(POSTOP, t, ph);
export const postOpKnee = (b: Beat<PostOpKey>) => (holding(b, 'bend') ? 0.36 * sin2(Math.PI * 2 * b.p) : 0);
/** The foot's angle (toes towards +z, pointed), pumped in the ankle beat. */
export const postOpFoot = (b: Beat<PostOpKey>, t: number) => 0.25 + amountOf(b, 'ankle') * 0.38 * wave(t, 0.8);
/** The foot of a leg lying on its back: the toes' way, given the foot's angle. */
export const toeOnBack = (a: number): P => [0, Math.cos(a), Math.sin(a)];
function postOpKey(k: PostOpKey, _p: number, t: number, s: number, kb: number, foot: number): Key {
  const ankle = legRom(HIP_L, kb);
  const knee = kneeOnTable(HIP_L, ankle);
  const edge: P = [0.38, TOP + 0.05, 0.72];
  switch (k) {
    case 'ankle': {
      const d = toeOnBack(foot);
      const n: P = [0, -Math.sin(foot), Math.cos(foot)];
      const sole = add(add(ankle, scale(d, 0.08)), scale(n, 0.075));
      return { l: add(sole, [0.03, 0, 0]), r: add(mixP(knee, ankle, 0.55), [0.04, -0.04, 0.0]), lean: 0.52, nod: 0.45, palms: 1.0, gl: 0.2, gr: 0.5 };
    }
    case 'quad':
      return { l: add(knee, [0.035, -0.04, 0.02]), r: add(mixP(HIP_L, knee, 0.55), [0.03, 0.075, 0]), lean: 0.55, nod: 0.45, palms: 1.2, gl: 0.3, gr: 0.2 };
    case 'bend':
      return romKey(kb);
    case 'praise':
      return { l: add(mixP(knee, ankle, 0.4), [0.04, 0.07, 0]), r: [0.42, 1.27, 0.12], lean: 0.12, nod: 0.05, palms: 0, gl: 0.3, gr: 0.95 };
    default:
      return { l: edge, r: add(mixP(HIP_L, knee, 0.75), [0.05, 0.08, 0]), lean: 0.4, nod: 0.22 + 0.06 * pulse(t, 0.45, s), palms: 1.3, gl: 0.3, gr: 0.2 };
  }
}

// ---- A trainee watching (선배 치료 참관): at the foot of the table with a notebook.
export const OBSERVE_AT: SpotAt = { x: 0.3, y: 0, z: 1.26, yaw: Math.PI };
/** Where the senior works the knee from, and the knee's bend now (their own slower rhythm). */
export const SENIOR_AT: SpotAt = { x: 0.5, y: 0, z: KNEE_Z, yaw: -Math.PI / 2 };
export const observeKnee = (t: number, ph: number) => sin2(Math.PI * (t / 3.2 + ph));
export const seniorKey = (kb: number) => romKey(kb);
export type ObserveKey = 'watch' | 'note' | 'think';
const OBSERVE: Array<Step<ObserveKey>> = [st('watch', 4, 0.8), st('note', 3, 0.6), st('think', 2.2, 0.6)];
export const observeBeat = (t: number, ph: number) => beatOf(OBSERVE, t, ph);
/** The notebook held open at the chest. */
export const NOTEBOOK: P = sp(OBSERVE_AT, 0.04, 1.0, 0.3);
function observeKey(k: ObserveKey, _p: number, t: number, s: number): Key {
  const nb = NOTEBOOK;
  switch (k) {
    case 'note':
      return { l: add(nb, [-0.07, -0.01, 0]), r: add(nb, [0.03 + 0.025 * wave(t, 1.8, s), 0.02, 0.005 * wave(t, 3.6, s)]), lean: 0.1, nod: 0.55, palms: 1.2, gl: 0.6, gr: 0.85 };
    case 'think':
      return { l: add(nb, [-0.07, -0.05, 0.03]), r: sp(OBSERVE_AT, -0.06, 1.42, 0.12), lean: 0.02, nod: 0.05, palms: 0, gl: 0.6, gr: 0.85 };
    default:
      return { l: add(nb, [-0.07, -0.02, 0.02]), r: add(nb, [0.07, -0.04, 0.02]), lean: 0.06, nod: 0.12 + 0.05 * pulse(t, 0.35, s), palms: 1.0, gl: 0.6, gr: 0.6 };
  }
}

// ---- A treatment plan (환자 치료 계획): sat on the stool, the knee measured, written up.
export const PLAN_AT: SpotAt = { x: 0.62, y: 0.5, z: 0.18, yaw: -Math.PI / 2 };
/**
 * ~20 s round: the patient slides their heel up; the goniometer laid along the thigh and shin at
 * the knee; read at eye height; written on the clipboard on the lap; explained with a hand towards
 * the knee as they straighten it again.
 */
export type PlanKey = 'measure' | 'read' | 'write' | 'explain';
const PLAN: Array<Step<PlanKey>> = [st('measure', 5), st('read', 2.4, 0.6), st('write', 5, 0.6), st('explain', 3.4, 0.8)];
export const planBeat = (t: number, ph: number) => beatOf(PLAN, t, ph);
export const planSlide = (b: Beat<PlanKey>) => valueOf(b, (k, p) => (k === 'measure' ? ss(p, 0, 0.35) : k === 'explain' ? 1 - ss(p, 0.1, 0.8) : 1));
/** The goniometer's place: at the knee, its arms along the thigh and the shin. */
export function goniometer(slide: number): { at: P; thigh: P; shin: P } {
  const ankle = heelSlide(HIP_L, slide);
  const knee = kneeOnTable(HIP_L, ankle);
  return { at: add(knee, [0.075, 0, 0]), thigh: norm(sub(HIP_L, knee)), shin: norm(sub(ankle, knee)) };
}
function planKey(k: PlanKey, _p: number, t: number, s: number, slide: number): Key {
  const g = goniometer(slide);
  switch (k) {
    case 'measure':
      return { l: add(g.at, scale(g.shin, 0.12)), r: add(g.at, scale(g.thigh, 0.12)), lean: 0.48, nod: 0.5, palms: 0.4, gl: 0.7, gr: 0.7 };
    case 'read':
      return { l: sp(PLAN_AT, 0.05, 0.5, 0.3), r: sp(PLAN_AT, -0.05, 0.5, 0.3), lean: 0.08, nod: -0.05, palms: 0.2, gl: 0.7, gr: 0.7 };
    case 'write':
      return { l: sp(PLAN_AT, 0.12, 0.2, 0.3), r: add(sp(PLAN_AT, -0.02, 0.215, 0.28), [0, 0.004 * wave(t, 3.4, s), 0.02 * wave(t, 1.7, s)]), lean: 0.28, nod: 0.55, palms: 1.2, gl: 0.6, gr: 0.85 };
    default:
      return { l: sp(PLAN_AT, 0.12, 0.24, 0.26), r: [0.3, TOP + 0.33, 0.2 + 0.04 * wave(t, 0.6, s)], lean: 0.2, nod: 0.15, palms: -0.3, gl: 0.6, gr: 0.2 };
  }
}

// =============================================================================================
// The exercise ball (재활 운동 기구), 1 × 1: the ball on its mat, a patient sat on it facing +z.

export const BALL = { x: 0, z: -0.1, r: 0.28 };
/** The hip line of someone sat on the ball, and their feet on the mat. */
export const BALL_SEAT: P = [0, 0.62, -0.1];
export const BALL_FEET: [P, P] = [[0.13, 0.08, 0.32], [-0.13, 0.08, 0.32]];
export const BALL_AT: SpotAt = { x: 0.42, y: 0, z: 0.04, yaw: -Math.PI / 2 };
/** The therapist's raised hand, a target to reach for. */
export const BALL_TARGET: P = [0.3, 1.02, 0.28];
/**
 * Balance on the ball (운동 치료), ~25 s round: settled, sat tall; marching (one foot lifted, then the
 * other, arms out); reaching forward and across for the therapist's raised hand, twice; little
 * bounces; a rest, hands on the thighs — the therapist half kneeling at their side all the while,
 * hands at the hips (front and back).
 */
export type BallKey = 'settle' | 'march' | 'reach' | 'bounce' | 'rest';
const BALLR: Array<Step<BallKey>> = [st('settle', 2.4, 0.6), st('march', 6, 0.6), st('reach', 5), st('bounce', 4, 0.6), st('rest', 2.6, 0.8)];
export const ballBeat = (t: number, ph: number) => beatOf(BALLR, t, ph);
export interface BallState {
  /** The hips' side sway and bounce; each foot's lift; how far they reach (0–1); arms out (0–1). */
  sway: number;
  bob: number;
  liftL: number;
  liftR: number;
  reach: number;
  out: number;
}
export function ballState(b: Beat<BallKey>, t: number): BallState {
  const s: BallState = { sway: 0.012 * Math.sin(t * 1.7), bob: 0, liftL: 0, liftR: 0, reach: 0, out: amountOf(b, 'march') };
  if (holding(b, 'march')) {
    const u = b.p * 4;
    const k = Math.floor(u);
    const lift = Math.sin(Math.PI * ss(u - k, 0.1, 0.9));
    if (k % 2 === 0) s.liftL = lift;
    else s.liftR = lift;
    s.sway += 0.03 * (k % 2 === 0 ? -lift : lift);
  }
  if (holding(b, 'reach')) s.reach = sin2(Math.PI * 2 * b.p);
  if (holding(b, 'bounce')) s.bob = 0.035 * Math.abs(Math.sin(Math.PI * 2.2 * t));
  return s;
}
function ballKey(k: BallKey, _p: number, t: number, s: number, bs: BallState): Key {
  const hip = add(BALL_SEAT, [bs.sway, bs.bob, 0]);
  const front = add(hip, [0.16, 0.0, 0.07]);
  const back = add(hip, [0.16, 0.02, -0.13]);
  const crouch = 0.55;
  switch (k) {
    case 'reach':
      return { l: add(BALL_TARGET, [0.07, 0.0, 0.04]), r: back, lean: 0.12, nod: 0.05, palms: -0.6, gl: 0.1, gr: 0.4, crouch };
    case 'rest':
      return { l: add(hip, [0.15, 0.4, 0.0]), r: back, lean: 0.12, nod: 0.12 + 0.05 * pulse(t, 0.45, s), palms: 1.1, gl: 0.3, gr: 0.4, crouch };
    default:
      return { l: front, r: back, lean: 0.18, nod: k === 'march' ? 0.4 : 0.2, palms: 1.1, gl: 0.4, gr: 0.4, crouch };
  }
}

// ---- Sports taping (스포츠 테이핑): the athlete's left knee, the therapist kneeling in front.
export const TAPE_AT: SpotAt = { x: 0.12, y: 0, z: 0.64, yaw: Math.PI };
/** The athlete's left ankle, at rest and kicked out straight to test the tape. */
export const TAPE_ANKLE: P = [0.13, 0.22, 0.42];
/** The foam block the taped foot rests on. */
export const TAPE_BLOCK: P = [0.13, 0.07, 0.44];
const TAPE_KICK: P = [0.12, 0.5, 0.66];
/**
 * ~22 s round: the tape measured against the leg; its backing torn; the Y strip laid from the thigh
 * round both sides of the kneecap; the I strip across under it; rubbed on with both palms to warm the
 * glue; the knee kicked straight and bent to try it, a thumbs up.
 */
export type TapeKey = 'measure' | 'tear' | 'lay1' | 'lay2' | 'rub' | 'check';
const TAPE: Array<Step<TapeKey>> = [st('measure', 3, 0.5), st('tear', 2, 0.5), st('lay1', 4.5, 0.5), st('lay2', 3.5, 0.5), st('rub', 3, 0.6), st('check', 3, 0.8)];
export const tapeBeat = (t: number, ph: number) => beatOf(TAPE, t, ph);
/** How much of each strip is on (the Y strip, the I strip), whether a strip's in the hands, how far the leg's kicked out. */
export function tapeState(b: Beat<TapeKey>): { y: number; i: number; held: boolean; kick: number } {
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  switch (k) {
    case 'measure':
    case 'tear':
      return { y: 0, i: 0, held: true, kick: 0 };
    case 'lay1':
      return { y: ss(p, 0.1, 0.9), i: 0, held: false, kick: 0 };
    case 'lay2':
      return { y: 1, i: ss(p, 0.1, 0.9), held: false, kick: 0 };
    case 'check':
      return { y: b.e > 0 ? 0 : 1, i: b.e > 0 ? 0 : 1, held: false, kick: b.e > 0 ? 0 : sin2(Math.PI * 2 * p) };
    default:
      return { y: 1, i: 1, held: false, kick: 0 };
  }
}
export const tapeAnkle = (kick: number): P => mixP(TAPE_ANKLE, TAPE_KICK, kick);
export const tapeHip: P = [0.09, BALL_SEAT[1], BALL_SEAT[2]];
export const tapeKnee = (kick: number): P => kneeIK(tapeHip, tapeAnkle(kick), [0, 0.2, 1]);
function tapeKey(k: TapeKey, p: number, t: number, s: number, kick: number): Key {
  const knee = tapeKnee(kick);
  const ankle = tapeAnkle(kick);
  const crouch = 1;
  const thigh = mixP(tapeHip, knee, 0.55);
  const below = mixP(knee, ankle, 0.25);
  switch (k) {
    case 'measure':
      return { l: add(thigh, [0.0, 0.07, 0.02]), r: add(below, [0.0, 0.0, 0.07]), lean: 0.5, nod: 0.5, palms: 1.0, gl: 0.7, gr: 0.7, crouch };
    case 'tear': {
      const j = 0.01 * wave(t, 3, s);
      return { l: sp(TAPE_AT, 0.05, 0.62, 0.3 + j), r: sp(TAPE_AT, -0.05, 0.62 - j, 0.3), lean: 0.2, nod: 0.5, palms: 0.5, gl: 0.85, gr: 0.85, crouch };
    }
    case 'lay1': {
      // The anchor pressed on the thigh, the tails drawn down either side of the kneecap.
      const e = ss(p, 0.1, 0.9);
      const tail = mixP(add(knee, [0.0, 0.07, 0.03]), add(below, [-0.05, 0.0, 0.07]), e);
      return { l: add(thigh, [0.02, 0.07, 0.0]), r: tail, lean: 0.5, nod: 0.55, palms: 1.2, gl: 0.3, gr: 0.6, crouch };
    }
    case 'lay2': {
      const e = ss(p, 0.1, 0.9);
      return { l: add(below, [0.02 + 0.07 * e, 0.0, 0.07]), r: add(below, [-0.02 - 0.07 * e, 0.0, 0.07]), lean: 0.5, nod: 0.55, palms: 1.3, gl: 0.4, gr: 0.4, crouch };
    }
    case 'rub': {
      const w = 0.04 * wave(t, 2.2, s);
      return { l: add(knee, [0.04, 0.03 + w, 0.07]), r: add(below, [-0.03, -w, 0.08]), lean: 0.5, nod: 0.5, palms: 1.5, gl: 0, gr: 0, crouch };
    }
    default:
      return { l: add(below, [0.08, 0.0, 0.1]), r: sp(TAPE_AT, -0.18, 0.95, 0.22), lean: 0.12, nod: 0.05, palms: 0, gl: 0.3, gr: 0.95, crouch };
  }
}

// =============================================================================================
// The stall bars (늑목) with the bands, 2 × 1, against the wall (-z): band exercise.

export const STALL = { z: -0.38, half: 0.9 };
/** Where the patient stands (their hip line), the band's anchors (a rung behind, the bars' left end). */
export const BAND_HIP: P = [0.02, 0.87, 0.3];
export const BAND_FEET: [P, P] = [[0.13, 0.08, 0.3], [-0.09, 0.08, 0.3]];
export const ANCHOR_PRESS: P = [0.02, 1.2, STALL.z + 0.03];
export const ANCHOR_ER: P = [0.84, 1.02, STALL.z + 0.03];
export const BAND_AT: SpotAt = { x: -0.5, y: 0, z: 0.76, yaw: yawTo(-0.5, 0.76, 0.02, 0.3) };
/**
 * ~25 s round: shown how (the therapist's hands pushing forward); a chest press with the green band
 * from the rung behind, five times, a hand at their elbow; the red band picked up; external rotation
 * with a towel roll under the right elbow, five times, a hand keeping the elbow in; a thumbs up.
 */
export type BandKey = 'demo' | 'press' | 'switch' | 'er' | 'praise';
const BAND: Array<Step<BandKey>> = [st('demo', 3, 0.6), st('press', 7), st('switch', 1.6, 0.5), st('er', 7, 0.6), st('praise', 2.6, 0.8)];
export const bandBeat = (t: number, ph: number) => beatOf(BAND, t, ph);
export function bandState(b: Beat<BandKey>): { press: number; er: number; green: boolean; red: boolean } {
  const press = holding(b, 'press') ? sin2(Math.PI * 5 * b.p) : 0;
  const er = holding(b, 'er') ? sin2(Math.PI * 5 * b.p) : 0;
  const k = b.from;
  return { press, er, green: k === 'demo' || k === 'press', red: k === 'er' || (k === 'switch' && b.p > 0.5) };
}
/** The patient's hands in the press (chest to arms out) and the right forearm turned out `er`. */
export const pressHand = (side: number, q: number): P => mixP([side * 0.17, 1.22, 0.44], [side * 0.14, 1.25, 0.8], q);
export const ER_ELBOW: P = [-0.19, 1.05, 0.33];
export function erHand(q: number): P {
  const a = mix(0.75, -0.85, q);
  return add(ER_ELBOW, [0.25 * Math.sin(a), 0.01, 0.25 * Math.cos(a)]);
}
function bandKey(k: BandKey, p: number, t: number, s: number, bs: { press: number; er: number }): Key {
  const at = BAND_AT;
  switch (k) {
    case 'demo': {
      const q = sin2(Math.PI * 2 * p);
      return { l: sp(at, 0.16, 1.25, 0.22 + 0.25 * q), r: sp(at, -0.16, 1.25, 0.22 + 0.25 * q), lean: 0.05, nod: 0.0, palms: -0.2, gl: 0.6, gr: 0.6 };
    }
    case 'press': {
      const elbow = mixP([-0.24, 1.12, 0.36], [-0.17, 1.2, 0.6], bs.press);
      return { l: [-0.22, 1.32, 0.42], r: add(elbow, [-0.04, -0.04, 0.02]), lean: 0.12, nod: 0.2, palms: 0.8, gl: 0.3, gr: 0.4 };
    }
    case 'er':
      return { l: add(erHand(bs.er), [-0.02, 0.05, 0.03]), r: add(ER_ELBOW, [-0.06, 0.0, 0.03]), lean: 0.16, nod: 0.3, palms: 0.8, gl: 0.2, gr: 0.4 };
    case 'praise':
      return { l: sp(at, 0.2, 0.92, 0.08), r: sp(at, -0.16, 1.35, 0.3), lean: 0.02, nod: 0.0, palms: 0, gl: 0.3, gr: 0.95 };
    default:
      return { l: sp(at, 0.2, 0.92, 0.08), r: sp(at, -0.2, 0.95, 0.12), lean: 0.05, nod: 0.15 + 0.06 * pulse(t, 0.5, s), palms: 0.6, gl: 0.3, gr: 0.3 };
  }
}

// =============================================================================================
// The training stairs (계단 보행 훈련대), 3 × 1: a floor landing at each end, two steps up to the
// platform from either side, a handrail along both sides.

export const STAIRS = { rise: 0.14, top: 0.42, railZ: 0.36, rail: 0.9, z: 0.03, edge: [0.65, 0.9, 1.15] };
/** The tread's height under a place along the stairs. */
export function levelAt(x: number): number {
  const a = Math.abs(x);
  return a > 1.15 ? 0 : a > 0.9 ? 0.14 : a > 0.65 ? 0.28 : 0.42;
}
/** The same, eased over the step's nose (for someone stepping up onto it). */
const levelEased = (x: number) => (levelAt(x - 0.06) + levelAt(x) + levelAt(x + 0.06)) / 3;
/** The handrail's height over a place along the stairs (level over the platform, sloping down the flights). */
export function railAt(x: number): number {
  const a = Math.abs(x);
  return STAIRS.rail + (a <= 0.62 ? 0.42 : Math.max(0, 0.42 - (0.42 * (a - 0.62)) / 0.6));
}
/** Where the feet land, walking out from the left landing: up two steps, onto the platform, a step along it. */
const STATIONS = [-1.32, -1.03, -0.78, -0.5, -0.2];
const MOVE = 0.95;
const LEG = (STATIONS.length - 1) * 2 * MOVE;
const TURN_TOP = 2.4;
const STAIR_REST = 2.6;
const TURN_BOTTOM = 2.4;
const STAIR_T = 2 * LEG + TURN_TOP + STAIR_REST + TURN_BOTTOM;
export interface StairsAt {
  beat: 'walk' | 'turn' | 'rest';
  footL: P;
  footR: P;
  hip: P;
  yaw: number;
  /** The way they're walking along the stairs (+1 out and up, -1 back down). */
  dir: number;
  /** The cane's tip; the left hand on the rail; the therapist's spot. */
  cane: P;
  rail: P;
  coach: SpotAt;
}
/**
 * Up and down the training stairs (계단 오르내리기), ~26 s round: a step at a time, the good (right)
 * leg up first and the cane and the bad (left) leg up to it (올라갈 때는 좋은 다리 먼저), along the
 * platform and turned round, then down leading with the bad leg and the cane (내려갈 때는 아픈 다리
 * 먼저), the left hand sliding along the rail; a rest at the bottom and turned round again. The
 * therapist guards on the low side, a step below, a hand at the gait belt and one by the shoulder —
 * behind them going up, in front of them coming down.
 */
export function stairsAt(t: number, ph: number): StairsAt {
  let u = frac(t / STAIR_T + ph) * STAIR_T;
  const z = STAIRS.z;
  const footAt = (x: number, side: P, lift: number, y0: number, y1: number, f: number): P => [x + side[0] * 0.1, mix(y0, y1, ss(f, 0, 0.5)) + 0.08 + lift, z + side[2] * 0.1];
  const leftOf = (yaw: number): P => [Math.cos(yaw), 0, -Math.sin(yaw)];
  let footL: P;
  let footR: P;
  let beat: StairsAt['beat'] = 'walk';
  let dir = 1;
  let yaw = Math.PI / 2;
  let liftL = 0;
  const walkLeg = (v: number, back: boolean) => {
    dir = back ? -1 : 1;
    yaw = dir * (Math.PI / 2);
    const S = (i: number) => (back ? STATIONS[STATIONS.length - 1 - i] : STATIONS[i]);
    const m = Math.min((STATIONS.length - 1) * 2 - 1, Math.floor(v / MOVE));
    const f = ss(v / MOVE - m, 0.08, 0.92);
    const i = Math.floor(m / 2);
    const second = m % 2 === 1;
    const x0 = S(i);
    const x1 = S(i + 1);
    // Climbing (and along the platform) leads with the right; coming down, with the left.
    const leadL = levelAt(x1) < levelAt(x0) - 0.01;
    const moving = second ? !leadL : leadL;
    const lift = 0.07 * Math.sin(Math.PI * f);
    const y0 = levelAt(x0);
    const y1 = levelAt(x1);
    const lv = leftOf(yaw);
    const pos = (isL: boolean): P => {
      const side: P = isL ? lv : scale(lv, -1);
      if (isL === moving) return footAt(mix(x0, x1, f), side, lift, y0, y1, f);
      // Not moving: still on the station it was on (the lead's already up on x1 by the second move).
      return second && isL === leadL ? footAt(x1, side, 0, y1, y1, 1) : footAt(x0, side, 0, y0, y0, 1);
    };
    footL = pos(true);
    footR = pos(false);
    if (moving) liftL = lift;
  };
  const turnOn = (x: number, w: number, from: number) => {
    beat = 'turn';
    yaw = from - Math.PI * ss(w, 0.05, 0.95);
    dir = 0;
    const lv = leftOf(yaw);
    const step = Math.floor(w * 4);
    const lift = 0.05 * Math.sin(Math.PI * ss(w * 4 - step, 0.1, 0.9));
    const y = levelAt(x) + 0.08;
    footL = [x + lv[0] * 0.1, y + (step % 2 ? lift : 0), z + lv[2] * 0.1];
    footR = [x - lv[0] * 0.1, y + (step % 2 ? 0 : lift), z - lv[2] * 0.1];
  };
  footL = [0, 0, 0];
  footR = [0, 0, 0];
  if (u < LEG) walkLeg(u, false);
  else if ((u -= LEG) < TURN_TOP) turnOn(STATIONS[STATIONS.length - 1], u / TURN_TOP, Math.PI / 2);
  else if ((u -= TURN_TOP) < LEG) walkLeg(u, true);
  else if ((u -= LEG) < STAIR_REST) {
    beat = 'rest';
    dir = -1;
    yaw = -Math.PI / 2;
    const lv = leftOf(yaw);
    footL = [STATIONS[0] + lv[0] * 0.1, 0.08, z + lv[2] * 0.1];
    footR = [STATIONS[0] - lv[0] * 0.1, 0.08, z - lv[2] * 0.1];
  } else turnOn(STATIONS[0], (u - STAIR_REST) / TURN_BOTTOM, -Math.PI / 2);
  const ground = (footL[1] + footR[1]) / 2 - 0.08;
  const hip: P = [(footL[0] + footR[0]) / 2 + (beat === 'walk' ? dir * 0.04 : 0), 0.87 + ground, z];
  // The cane goes with the bad (left) leg, on the right side; the left hand's on the rail a little ahead.
  const fv: P = [Math.sin(yaw), 0, Math.cos(yaw)];
  const right: P = scale(leftOf(yaw), -1);
  const caneX = (beat === 'walk' ? footL[0] : hip[0]) + fv[0] * 0.1 + right[0] * 0.24;
  const cane: P = [caneX, levelAt(caneX) + liftL, z + right[2] * 0.24];
  const railX = hip[0] + fv[0] * 0.14;
  const lz = -right[2] >= 0 ? STAIRS.railZ : -STAIRS.railZ;
  const rail: P = [railX, railAt(railX) + 0.02, lz];
  // The therapist: always on the low (left) side of them, a step below.
  const tx = hip[0] - 0.46;
  const tz = z + 0.04;
  const coach: SpotAt = { x: tx, y: levelEased(tx), z: tz, yaw: yawTo(tx, tz, hip[0], hip[2]) };
  return { beat, footL, footR, hip, yaw, dir, cane, rail, coach };
}
function stairsKey(w: StairsAt, t: number, s: number): Key {
  const c = w.coach;
  const to = norm([c.x - w.hip[0], 0, c.z - w.hip[2]]);
  const belt = add(w.hip, add(scale(to, 0.14), [0, 0.07, 0]));
  const guard = add(w.hip, add(scale(to, 0.15), [0, 0.42, 0]));
  const perp: P = [-to[2] * 0.09, 0, to[0] * 0.09];
  return { l: add(guard, perp), r: add(belt, scale(perp, -0.5)), lean: 0.14 + 0.06 * pulse(t, 0.2, s, 2), nod: 0.25, palms: 0.9, gl: 0.3, gr: 0.85 };
}

// =============================================================================================
// The modality corner (물리치료기 코너), 2 × 1: the cart on the left, the patient on a stool at the
// right leaning forward on a padded rest, their back to the room.

export const MOD = { cartX: -0.52, patX: 0.4, seat: 0.48, rest: 0.8 };
const lean = norm([0, 1, -0.5]);
export const MOD_BODY = { pelvis: [MOD.patX, MOD.seat + 0.07, 0.1] as P, up: lean, front: norm([0, -0.5, -1]) };
/** A point on their back: `h` up it from the hips, `s` to their right (+x). */
export const onBack = (h: number, s: number): P => add(add(add(MOD_BODY.pelvis, scale(MOD_BODY.up, h)), scale(MOD_BODY.front, -0.115)), [s, 0, 0]);
/** Ultrasound on the left shoulder blade (nearer the therapist), the cups on the lower back. */
export const US_AT_BACK: P = onBack(0.38, -0.1);
export const CUPS: P[] = [onBack(0.12, -0.08), onBack(0.12, 0.08), onBack(0.25, -0.08), onBack(0.25, 0.08)];
/** The cart's panel knob, the ultrasound head's holder, the cup tray. */
export const PANEL: P = [-0.36, 0.99, 0.05];
export const HOLDER: P = [-0.27, 0.9, 0.07];
export const CUP_TRAY: P = [-0.24, 0.85, 0.08];
export const MOD_AT: SpotAt = { x: 0.03, y: 0, z: 0.38, yaw: yawTo(0.03, 0.38, MOD.patX, 0.1) };
/**
 * Ultrasound (초음파 치료), ~22 s round: gel squeezed onto the shoulder blade; the head taken from its
 * holder; slow little circles over the sore spot, a glance at the screen and a button pressed; more
 * circles; the head put back.
 */
export type UsKey = 'gel' | 'pick' | 'circle' | 'screen' | 'circle2' | 'done';
const US: Array<Step<UsKey>> = [st('gel', 2.6, 0.5), st('pick', 1.4, 0.5), st('circle', 9, 0.5), st('screen', 2, 0.5), st('circle2', 5, 0.6), st('done', 1.8, 0.8)];
export const usBeat = (t: number, ph: number) => beatOf(US, t, ph);
/** Whether the head's in the hand (else in its holder), and the gel bottle. */
export const usHeadHeld = (b: Beat<UsKey>) => !(b.from === 'gel' || (b.from === 'pick' && b.e === 0 && b.p < 0.6) || (b.from === 'done' && (b.e > 0 || b.p > 0.5)));
export const usGelHeld = (b: Beat<UsKey>) => b.from === 'gel' && b.e === 0 && b.p > 0.1 && b.p < 0.92;
export const usCircle = (t: number, s: number): P => {
  const a = Math.PI * 2 * (t * 0.7 + s);
  return add(US_AT_BACK, add([0.035 * Math.cos(a), 0, 0], scale(MOD_BODY.up, 0.035 * Math.sin(a))));
};
function usKey(k: UsKey, _p: number, t: number, s: number): Key {
  const back = add(onBack(0.28, 0.06), [0, 0.02, 0.03]);
  switch (k) {
    case 'gel':
      return { l: add(US_AT_BACK, [0.0, 0.12 - 0.01 * pulse(t, 1.5, s, 2), 0.07]), r: back, lean: 0.4, nod: 0.45, palms: 0.4, gl: 0.9, gr: 0.3 };
    case 'pick':
    case 'done':
      return { l: add(HOLDER, [0.02, 0.02, 0.02]), r: back, lean: 0.36, nod: 0.4, palms: 0.6, gl: 0.7, gr: 0.3 };
    case 'screen':
      // A look at the screen, the head kept moving.
      return { l: add(usCircle(t, s), [0, 0.02, 0.04]), r: back, lean: 0.3, nod: 0.15, palms: 0.9, gl: 0.75, gr: 0.3 };
    default:
      return { l: add(usCircle(t, s), [0, 0.02, 0.04]), r: back, lean: 0.42, nod: 0.5, palms: 0.9, gl: 0.75, gr: 0.3 };
  }
}
/**
 * Interferential current (간섭파 치료), ~20 s round: four suction cups taken from the tray one by one
 * and pressed onto the lower back; the dial turned up; a hand on the shoulder (찌릿찌릿한 느낌
 * 괜찮으세요?); waiting; the cups pulled off again.
 */
export type IctKey = 'cups' | 'dial' | 'ask' | 'wait' | 'off';
const ICT: Array<Step<IctKey>> = [st('cups', 6, 0.5), st('dial', 2.4, 0.5), st('ask', 3, 0.6), st('wait', 4, 0.6), st('off', 2.4, 0.8)];
export const ictBeat = (t: number, ph: number) => beatOf(ICT, t, ph);
/** How many cups are on the back, and the one in the hand (going on or coming off). */
export function ictCups(b: Beat<IctKey>): { on: number; held: P | null } {
  const p = b.e > 0 ? 1 : b.p;
  if (b.from === 'cups') {
    const u = p * 4;
    const k = Math.min(3, Math.floor(u));
    const f = u - k;
    const placed = f > 0.7 ? k + 1 : k;
    return { on: placed, held: f <= 0.7 ? mixP(CUP_TRAY, CUPS[k], ss(f, 0.1, 0.7)) : null };
  }
  if (b.from === 'off') {
    if (b.e > 0) return { on: 0, held: null };
    const u = p * 4;
    const k = Math.min(3, Math.floor(u));
    const f = u - k;
    return { on: 3 - k, held: mixP(CUPS[3 - k], CUP_TRAY, ss(f, 0.1, 0.8)) };
  }
  return { on: 4, held: null };
}
function ictKey(k: IctKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'cups':
    case 'off': {
      const h = ictCups({ from: k, to: k, e: 0, p, n: 0 }).held ?? CUP_TRAY;
      return { l: add(h, [0, 0.02, 0.035]), r: add(onBack(0.3, 0.06), [0, 0.02, 0.03]), lean: 0.58, nod: 0.5, palms: 0.8, gl: 0.8, gr: 0.3 };
    }
    case 'dial':
      return { l: add(PANEL, [0.03, 0.0, 0.035]), r: add(onBack(0.3, 0.06), [0, 0.02, 0.03]), lean: 0.36, nod: 0.3, palms: 0.3 + 0.4 * ss(p), gl: 0.8, gr: 0.2 };
    case 'ask':
      return { l: [-0.12, 0.92, 0.42], r: add(onBack(0.42, -0.12), [0, 0.03, 0.03]), lean: 0.2, nod: 0.2 + 0.06 * pulse(t, 0.45, s), palms: 1.3, gl: 0.3, gr: 0.2 };
    default:
      return { l: [-0.12, 0.92, 0.42], r: [0.06, 0.92, 0.34], lean: 0.08, nod: 0.25, palms: 0.8, gl: 0.3, gr: 0.3 };
  }
}

// =============================================================================================
// The hot-pack heater (핫팩 가온기), 1 × 1: the steaming tank, its lid hinged at the back, the
// covers on the tray beside it.

export const HEATER = { x: -0.09, w: 0.52, back: -0.42, front: 0.04, top: 0.84, trayX: 0.33, trayZ: -0.02, trayTop: 0.8 };
export const HP_AT: SpotAt = { x: 0.04, y: 0, z: 0.38, yaw: Math.PI };
/** The lid's front edge (where it's lifted by), opened `a` (radians). */
export function lidEdge(a: number): P {
  const d = HEATER.front - HEATER.back;
  return [HEATER.x, HEATER.top + d * Math.sin(a) + 0.03, HEATER.back + d * Math.cos(a)];
}
const PACK_IN: P = [HEATER.x + 0.06, 0.62, -0.2];
const PACK_UP: P = [HEATER.x + 0.06, 1.1, -0.04];
export const PACK_TRAY: P = [HEATER.trayX, HEATER.trayTop + 0.02, HEATER.trayZ + 0.08];
/** How far the lid opens (it stays up by itself past `LID_HAND`, where the hand lets go of it). */
export const LID_OPEN = 1.45;
const LID_HAND = 0.95;
/** The tank's front rim, where a free hand steadies it. */
const RIM: P = [HEATER.x - 0.12, HEATER.top + 0.02, HEATER.front];
/**
 * A hot pack got ready (핫팩 준비), ~16 s round: the lid lifted; a pack drawn up out of the hot water
 * with the tongs; held a moment to drip; laid on its terry cover on the tray and the cover folded
 * over it; the lid shut; the wrapped pack picked up at the chest to take to the table.
 */
export type HotKey = 'lid' | 'lift' | 'drip' | 'wrap' | 'close' | 'carry';
const HOT: Array<Step<HotKey>> = [st('lid', 1.6, 0.5), st('lift', 2.8, 0.5), st('drip', 1.6, 0.4), st('wrap', 3.6, 0.6), st('close', 1.4, 0.6), st('carry', 2.2, 0.8)];
export const hotBeat = (t: number, ph: number) => beatOf(HOT, t, ph);
export function hotState(b: Beat<HotKey>, t: number): { lid: number; pack: P; wrap: number; tongs: boolean } {
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const lid = valueOf(b, (kk, pp) => (kk === 'lid' ? LID_OPEN * ss(pp, 0.1, 0.9) : kk === 'close' ? LID_OPEN * (1 - ss(pp, 0.1, 0.9)) : kk === 'carry' ? 0 : LID_OPEN));
  switch (k) {
    case 'lid':
      return { lid, pack: PACK_IN, wrap: 0, tongs: false };
    case 'lift':
      return { lid, pack: mixP(PACK_IN, PACK_UP, ss(p, 0.1, 0.85)), wrap: 0, tongs: true };
    case 'drip':
      return { lid, pack: add(PACK_UP, [0.01 * wave(t, 2.4), 0, 0]), wrap: 0, tongs: true };
    case 'wrap': {
      const e = ss(p, 0, 0.25);
      return { lid, pack: mixP(PACK_UP, PACK_TRAY, e), wrap: ss(p, 0.3, 0.9), tongs: p < 0.25 };
    }
    case 'close':
      return { lid, pack: PACK_TRAY, wrap: 1, tongs: false };
    default:
      return { lid, pack: mixP(PACK_TRAY, sp(HP_AT, 0, 1.05, 0.3), ss(p, 0.1, 0.6)), wrap: 1, tongs: false };
  }
}
function hotKey(k: HotKey, p: number, t: number, s: number, hs: { lid: number; pack: P }): Key {
  switch (k) {
    case 'lid':
    case 'close': {
      // The hand on the lid's edge as far as it reaches; past that the lid swings up (or is pushed down from there).
      const held = lidEdge(Math.min(hs.lid, LID_HAND));
      return { l: add(held, [0.0, 0.02, 0.02]), r: sp(HP_AT, -0.18, 0.96, 0.2), lean: 0.25, nod: 0.35, palms: 0.8, gl: 0.8, gr: 0.3 };
    }
    case 'lift':
    case 'drip':
      return { l: RIM, r: add(hs.pack, [0.0, 0.2, 0.06]), lean: 0.38, nod: 0.4, palms: 0.4, gl: 0.6, gr: 0.9 };
    case 'wrap': {
      if (p < 0.25) return { l: RIM, r: add(hs.pack, [0.0, 0.2, 0.06]), lean: 0.3, nod: 0.4, palms: 0.4, gl: 0.6, gr: 0.9 };
      const f = 0.03 * wave(t, 1.2, s);
      return { l: add(PACK_TRAY, [-0.1, 0.04, 0.05 + f]), r: add(PACK_TRAY, [0.1, 0.04, 0.05 - f]), lean: 0.34, nod: 0.55, palms: 1.4, gl: 0.3, gr: 0.3 };
    }
    default:
      return { l: add(hs.pack, [-0.12, -0.01, 0.0]), r: add(hs.pack, [0.12, -0.01, 0.0]), lean: 0.12, nod: 0.3, palms: 1.2, gl: 0.6, gr: 0.6 };
  }
}

// =============================================================================================

/** Where the hands are for a motion now, and the spot it's done from. */
export function ptKeyOf(m: PtMotion, t: number, ph: number): { key: Key; at: SpotAt } {
  const s = ph * 7.3;
  switch (m) {
    case 'ptManual': {
      const b = manualBeat(t, ph);
      const kb = manualKnee(b);
      const phi = manualPhi(b);
      const z = manualZ(b);
      return { key: blended(b, (k, p) => manualKey(k, p, t, s, kb, phi, z)), at: manualAt(z) };
    }
    case 'ptHeat':
      return { key: blended(heatBeat(t, ph), (k, p) => heatKey(k, p, t, s)), at: HEAT_AT };
    case 'ptPostOp': {
      const b = postOpBeat(t, ph);
      const kb = postOpKnee(b);
      const foot = postOpFoot(b, t);
      return { key: blended(b, (k, p) => postOpKey(k, p, t, s, kb, foot)), at: POSTOP_AT };
    }
    case 'ptObserve':
      return { key: blended(observeBeat(t, ph), (k, p) => observeKey(k, p, t, s)), at: OBSERVE_AT };
    case 'ptPlan': {
      const b = planBeat(t, ph);
      const slide = planSlide(b);
      return { key: blended(b, (k, p) => planKey(k, p, t, s, slide)), at: PLAN_AT };
    }
    case 'ptBall': {
      const b = ballBeat(t, ph);
      const bs = ballState(b, t);
      return { key: blended(b, (k, p) => ballKey(k, p, t, s, bs)), at: BALL_AT };
    }
    case 'ptTape': {
      const b = tapeBeat(t, ph);
      const kick = tapeState(b).kick;
      return { key: blended(b, (k, p) => tapeKey(k, p, t, s, kick)), at: TAPE_AT };
    }
    case 'ptBand': {
      const b = bandBeat(t, ph);
      const bs = bandState(b);
      return { key: blended(b, (k, p) => bandKey(k, p, t, s, bs)), at: BAND_AT };
    }
    case 'ptStairs': {
      const w = stairsAt(t, ph);
      return { key: stairsKey(w, t, s), at: w.coach };
    }
    case 'ptUltrasound':
      return { key: blended(usBeat(t, ph), (k, p) => usKey(k, p, t, s)), at: MOD_AT };
    case 'ptIct':
      return { key: blended(ictBeat(t, ph), (k, p) => ictKey(k, p, t, s)), at: MOD_AT };
    default: {
      const b = hotBeat(t, ph);
      const hs = hotState(b, t);
      return { key: blended(b, (k, p) => hotKey(k, p, t, s, hs)), at: HP_AT };
    }
  }
}

export function ptDoing(m: PtMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = ptKeyOf(m, t, ptPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
