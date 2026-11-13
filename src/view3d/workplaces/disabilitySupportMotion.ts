import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * At a 장애인 복지관 (2026-10-27, the workplace pipeline, at the user's request): the worker beside
 * the users, never over them. A sensory session sat cross-legged on the mat (a tactile ball offered,
 * the fibre-optic strands laid across open palms, the bubble tube pointed out, breathing together);
 * a 보호작업장 job shown at the bench (the part picked, put together slowly, held out to see, a
 * thumbs up) and the jig fitted to the user's hand; gait training at the parallel bars, side-stepping
 * along the rail with a hand at the user's gait belt; a sit-to-stand practised from the wheelchair;
 * 라면 cooked at the lowered counter, the worker pointing along the picture recipe and steadying
 * the pot; a health check (the wrist cuff, the 요일별 약통, the log); a chat on the picture-symbol
 * board and the talker; a braille book read together; a computer used with a big switch; a painting
 * made together; the tactile map and the ramp checked by the door.
 *
 * Each is a round of beats by one clock (dsPhase of a fixed mark on the piece, the spot's `work`),
 * shared with the piece (workplaces/disabilitySupport.ts), which draws the user, what the hands hold
 * and moves the spot (the walk). Every piece's layout is set out here in its own frame (x across, y
 * up, z out of its front) and the hands go to it in the spot's frame: `side` to the dweller's left, `up`
 * from the feet (stood) or the seat's top (sat), `ahead` the way they face. Kept out of activity.ts
 * (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type DsMotion = 'dsSensory' | 'dsDemo' | 'dsCoach' | 'dsWalk' | 'dsTransfer' | 'dsCook' | 'dsHealth' | 'dsAac' | 'dsRead' | 'dsPc' | 'dsArt' | 'dsAccess';
export const DS_MOTIONS = new Set<string>(['dsSensory', 'dsDemo', 'dsCoach', 'dsWalk', 'dsTransfer', 'dsCook', 'dsHealth', 'dsAac', 'dsRead', 'dsPc', 'dsArt', 'dsAccess']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const sstep = THREE.MathUtils.smoothstep;
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset of a piece, from its fixed mark, so two benches aren't in step. */
export const dsPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;

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
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: sstep(Math.min(1, u / k.move), 0, 1), p: 1, n };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0, n };
}
const st = <K extends string>(key: K, hold: number, move = 0.8): Step<K> => ({ key, hold, move });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}

/** A place: [x, y, z] in a piece's frame, or [to the dweller's left, up, ahead] in a spot's. */
export type Loc = [number, number, number];
/** Where a spot is in its piece's frame and the way it faces (0 out of the front). */
export interface SpotAt {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
/** A place in the piece's frame, in a spot's frame. */
export function rel(s: SpotAt, p: Loc): Loc {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1] - s.y, dx * n + dz * c];
}
/** A place in a spot's frame, in the piece's frame. */
export function abs(s: SpotAt, l: Loc): Loc {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + c * l[0] + n * l[2], s.y + l[1], s.z - n * l[0] + c * l[2]];
}
const add = (a: Loc, b: Loc): Loc => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** A hand pointed from a shoulder towards something, `len` out along the line. */
function pointing(shoulder: Loc, at: Loc, len = 0.5): Loc {
  const d = [at[0] - shoulder[0], at[1] - shoulder[1], at[2] - shoulder[2]];
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  const k = Math.min(len, l) / l;
  return [shoulder[0] + d[0] * k, shoulder[1] + d[1] * k, shoulder[2] + d[2] * k];
}

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
const mixLoc = (a: Loc, b: Loc, e: number): Loc => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
function mixKey(a: Key, b: Key, e: number): Key {
  const m = (q: number, r: number) => q + (r - q) * e;
  return { l: mixLoc(a.l, b.l, e), r: mixLoc(a.r, b.r, e), lean: m(a.lean, b.lean), nod: m(a.nod, b.nod), palms: m(a.palms, b.palms), gl: m(a.gl, b.gl), gr: m(a.gr, b.gr), crouch: m(a.crouch ?? 0, b.crouch ?? 0) };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K) => Key): Key {
  const a = pose(beat.from);
  return beat.e > 0 ? mixKey(a, pose(beat.to), beat.e) : a;
}
/** The right shoulder of a 1.6 m dweller, stood, sat on a chair or cross-legged, in their own frame. */
const SHOULDER_R_STAND: Loc = [-0.18, 1.3, 0.02];
const SHOULDER_R_SIT: Loc = [-0.18, 0.55, 0.0];
const SHOULDER_R_CROSS: Loc = [-0.18, 0.52, 0.0];

// ---------------------------------------------------------------------------------------------
// The sensory room's mat: sat cross-legged on it, the user on the beanbag across.

const MAT = 0.08;
/**
 * The 감각 통합 매트, 2 × 1: the mat's top, the dweller cross-legged at the front right turned to the user
 * on the beanbag at the back left, the bubble tube in the back right corner (over their shoulder),
 * the fibre-optic light box at the back left.
 */
export const SENSE = {
  top: MAT,
  dweller: { x: 0.42, y: MAT, z: 0.24, yaw: Math.atan2(-0.57, -0.36) } as SpotAt,
  user: { x: -0.15, z: -0.12, yaw: Math.atan2(0.57, 0.36), seat: 0.3 },
  tube: [0.78, 0.95, -0.3] as Loc,
  fibre: [-0.66, 0.16, -0.36] as Loc,
};
/** The user's open palms over the lap (in the mat's frame). */
export const SENSE_PALMS: Loc = [SENSE.user.x + Math.sin(SENSE.user.yaw) * 0.27, SENSE.user.seat + 0.15, SENSE.user.z + Math.cos(SENSE.user.yaw) * 0.27];
/**
 * A sensory session, ~26 s round: a spiky tactile ball offered to the user's hands; a bundle of the
 * glowing fibre-optic strands drawn slowly over their open palms; the bubble tube pointed out as it
 * turns another colour; breathing slowly together, a hand on the chest; resting, the hands on the knees.
 */
export type SenseKey = 'offer' | 'fibre' | 'point' | 'breathe' | 'rest';
const SENSORY: Array<Step<SenseKey>> = [st('offer', 4, 0.9), st('fibre', 5, 0.9), st('point', 3, 0.9), st('breathe', 5.5, 0.9), st('rest', 3, 0.9)];
export const sensoryBeat = (t: number, phase: number) => beatOf(SENSORY, t, phase);
const SENSE_HANDS = rel(SENSE.dweller, SENSE_PALMS);
const SENSE_TUBE = pointing(SHOULDER_R_CROSS, rel(SENSE.dweller, SENSE.tube), 0.5);
function sensoryKey(k: SenseKey, t: number, s: number): Key {
  const knees: Pick<Key, 'l' | 'r'> = { l: [0.2, 0.1, 0.2], r: [-0.2, 0.1, 0.2] };
  const h = SENSE_HANDS;
  switch (k) {
    case 'offer':
      return { l: knees.l, r: [h[0] - 0.01, h[1] + 0.02 + 0.01 * wave(t, 0.6, s), h[2] - 0.08], lean: 0.3, nod: 0.25, palms: 0.2, gl: 0.3, gr: 0.6 };
    case 'fibre':
      return { l: [h[0] + 0.1, h[1] - 0.02, h[2] - 0.16], r: [h[0] - 0.02 + 0.07 * wave(t, 0.22, s), h[1] + 0.03, h[2] - 0.06], lean: 0.32, nod: 0.3, palms: 1.0, gl: 0.6, gr: 0.6 };
    case 'point':
      return { l: knees.l, r: SENSE_TUBE, lean: 0.06, nod: -0.12, palms: 0.2, gl: 0.3, gr: 0.75 };
    case 'breathe': {
      const b = 0.018 * wave(t, 0.16, s);
      return { l: [0.05, 0.4 + b, 0.11 + b], r: [-0.07, 0.3 + b, 0.13 + b], lean: 0.02 - b, nod: 0.08, palms: 1.4, gl: 0.1, gr: 0.1 };
    }
    default:
      return { ...knees, lean: 0.1, nod: 0.12 + 0.06 * pulse(t, 0.35, s), palms: 1.2, gl: 0.3, gr: 0.3 };
  }
}
/** Whether the ball's in the hand (offered and back), and the fibre bundle. */
export const ballOut = (b: Beat<SenseKey>) => amountOf(b, 'offer') > 0.3;
export const fibreOut = (b: Beat<SenseKey>) => amountOf(b, 'fibre') > 0.3;

// ---------------------------------------------------------------------------------------------
// The 보호작업장 bench: a job shown sat beside the user, the jig fitted stood behind them.

/**
 * The workshop bench, 2 × 1: its top, the user's stool at the front right and the worker's at the
 * front left, the worker stood between and behind them to coach; the parts bins along the back (the
 * worker's three at the left, the user's at the right), each one's jig in front of them, the step
 * card on its stand in the middle, the worker's demo tray at the far left, the finished box at the
 * user's right, and where the worker stands to coach: at the bench's right end, turned in to the user.
 */
export const BENCH = {
  top: 0.76,
  front: 0.26,
  user: { x: 0.34, y: 0.48, z: 0.6, yaw: Math.PI } as SpotAt,
  demo: { x: -0.36, y: 0.48, z: 0.6, yaw: Math.PI } as SpotAt,
  coach: { x: 0.74, y: 0, z: 0.52, yaw: Math.PI + 0.5 } as SpotAt,
  binZ: -0.1,
  bins: [-0.8, -0.6, -0.4, 0.4, 0.6, 0.8],
  jigZ: 0.1,
  card: [0, 0.93, 0.0] as Loc,
  tray: [-0.64, 0.77, 0.16] as Loc,
  box: [0.72, 0.76, 0.06] as Loc,
};
const J_DEMO: Loc = [BENCH.demo.x, BENCH.top + 0.02, BENCH.jigZ];
const J_USER: Loc = [BENCH.user.x, BENCH.top + 0.02, BENCH.jigZ];
/**
 * Showing the job, ~16 s round, sat on the stool beside the user: a part picked from the bin, put
 * together slowly over the jig (the refill in, the cap turned on), held out to them to see, laid in
 * the demo tray; then watching them do it, a part passed across when they reach for one, a thumbs up.
 */
export type DemoKey = 'pick' | 'join' | 'show' | 'lay' | 'watch' | 'pass' | 'praise';
const DEMO: Array<Step<DemoKey>> = [st('pick', 1.2, 0.8), st('join', 3, 0.7), st('show', 2.4, 0.8), st('lay', 0.8, 0.7), st('watch', 3.5, 0.7), st('pass', 1.4, 0.7), st('praise', 1.4, 0.8)];
export const demoBeat = (t: number, phase: number) => beatOf(DEMO, t, phase);
/** Where the part shown is held out (the piece's frame), and where it's passed to the user. */
export const BENCH_SHOW: Loc = [-0.02, 0.98, 0.34];
export const BENCH_PASS: Loc = [0.06, 0.8, 0.24];
function demoKey(k: DemoKey, t: number, s: number): Key {
  const sp = BENCH.demo;
  const jig = rel(sp, J_DEMO);
  const edge = (x: number): Loc => rel(sp, [x, BENCH.top + 0.01, BENCH.front - 0.04]);
  switch (k) {
    case 'pick': {
      const b = rel(sp, [BENCH.bins[2], BENCH.top + 0.08, BENCH.binZ]);
      return { l: b, r: add(jig, [-0.06, 0.02, -0.02]), lean: 0.42, nod: 0.45, palms: 1.0, gl: 0.8, gr: 0.3 };
    }
    case 'join':
      return { l: add(jig, [0.05, 0.07, -0.02]), r: add(jig, [-0.04, 0.08 + 0.01 * wave(t, 1.4, s), 0.0]), lean: 0.34, nod: 0.5, palms: 0.6, gl: 0.8, gr: 0.75 };
    case 'show':
      return { l: edge(BENCH.demo.x + 0.1), r: rel(sp, BENCH_SHOW), lean: 0.18, nod: 0.12, palms: 0.4, gl: 0.3, gr: 0.75 };
    case 'lay':
      return { l: edge(BENCH.demo.x + 0.1), r: rel(sp, add(BENCH.tray, [0, 0.04, 0])), lean: 0.36, nod: 0.45, palms: 1.1, gl: 0.3, gr: 0.6 };
    case 'pass': {
      const p = rel(sp, BENCH_PASS);
      return { l: edge(BENCH.demo.x + 0.1), r: p, lean: 0.28, nod: 0.3, palms: 0.8, gl: 0.3, gr: 0.7 };
    }
    case 'praise':
      return { l: edge(BENCH.demo.x + 0.08), r: rel(sp, [-0.2, 1.02, 0.36]), lean: 0.1, nod: 0.02, palms: 0, gl: 0.3, gr: 0.95 };
    default:
      return { l: edge(BENCH.demo.x + 0.12), r: edge(BENCH.demo.x - 0.08), lean: 0.16, nod: 0.3 + 0.08 * pulse(t, 0.45, s), palms: 1.2, gl: 0.3, gr: 0.3 };
  }
}
/** Which hand the part's in (if any): the left from the bin, the right while it's joined and shown; and whether the passed part's out. */
export function demoPart(b: Beat<DemoKey>): 'l' | 'r' | null {
  if (b.from === 'pick') return b.p > 0.45 || b.e > 0 ? (b.e > 0.5 ? 'r' : 'l') : null;
  if (b.from === 'join' || b.from === 'show') return 'r';
  if (b.from === 'lay') return b.p < 0.5 && b.e === 0 ? 'r' : null;
  return null;
}
export const passOut = (b: Beat<DemoKey>) => amountOf(b, 'pass') > 0.4;

/**
 * Fitting the job to the user (작업 공정 맞춰 주기), ~14 s round, stood at their right by the bench's end:
 * the user's jig loosened, slid nearer their hand and tightened; a finger along the step card
 * (① 심 넣기 ② 뚜껑 끼우기 ③ 10개 담기); watching them try it; a little clap.
 */
export type CoachKey = 'jig' | 'card' | 'watch' | 'clap';
const COACH: Array<Step<CoachKey>> = [st('jig', 3.4, 0.8), st('card', 3, 0.8), st('watch', 3.5, 0.7), st('clap', 1.4, 0.8)];
export const coachBeat = (t: number, phase: number) => beatOf(COACH, t, phase);
/** How far the user's jig has been slid towards them this round (it goes back while nobody's looking). */
export function jigSlide(b: Beat<CoachKey>): number {
  if (b.from === 'jig') return b.e > 0 ? 1 : sstep(b.p, 0.3, 0.75);
  if (b.from === 'clap' && b.e > 0) return 1 - b.e;
  return 1;
}
function coachKey(k: CoachKey, t: number, s: number): Key {
  const sp = BENCH.coach;
  switch (k) {
    case 'jig': {
      const j = rel(sp, J_USER);
      const twist = 0.01 * wave(t, 1.6, s);
      return { l: add(j, [0.08, 0.04, 0]), r: add(j, [-0.08, 0.05 + twist, 0.01]), lean: 0.42, nod: 0.5, palms: 1.0, gl: 0.7, gr: 0.7 };
    }
    case 'card': {
      const row = Math.floor(frac(t * 0.33 + s) * 3);
      const c = pointing(SHOULDER_R_STAND, rel(sp, [BENCH.card[0] - 0.09 + row * 0.09, BENCH.card[1], BENCH.card[2]]), 0.56);
      return { l: rel(sp, [0.6, BENCH.top + 0.02, BENCH.front + 0.02]), r: c, lean: 0.3, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.75 };
    }
    case 'clap': {
      const c = 0.04 * pulse(t, 2.2, s, 2);
      return { l: [0.03 + c, 1.08, 0.28], r: [-0.03 - c, 1.08, 0.28], lean: 0.05, nod: 0.12, palms: 0, gl: 0.1, gr: 0.1 };
    }
    default:
      return { l: [0.2, 0.92, 0.0], r: [-0.2, 0.92, 0.0], lean: 0.18, nod: 0.36 + 0.06 * pulse(t, 0.5, s), palms: 0.6, gl: 0.4, gr: 0.4 };
  }
}

// ---------------------------------------------------------------------------------------------
// The parallel bars: walking alongside, a hand at the gait belt; a sit-to-stand from the wheelchair.

/**
 * The walking bars, 2 × 1: the deck's top, the rails' height and how far they are either side of the
 * middle, where the user walks between (x0 to x1), the line the worker side-steps along outside the
 * front rail, the wheelchair at the left end facing in, the user's feet in front of it and the spot
 * the worker stands at to help them up.
 */
export const BARS = {
  deck: 0.05,
  rail: 0.9,
  railZ: 0.27,
  railX: 0.84,
  x0: -0.62,
  x1: 0.62,
  dwellerZ: 0.56,
  chair: { x: -1.27, z: 0, yaw: Math.PI / 2 },
  feetX: -0.93,
  transfer: { x: -0.7, y: 0.05, z: 0.05, yaw: -Math.PI / 2 } as SpotAt,
};
const STEPS = 8;
/** The walk's legs, in seconds: out along the bars, a rest, turned round, back, a rest, turned round. */
const WALK = { out: 11, rest: 3.6, turn: 2.6 };
const WALK_T = 2 * (WALK.out + WALK.rest + WALK.turn);
export interface WalkAt {
  beat: 'walk' | 'rest' | 'turn';
  /** Where the user's hips are along the bars, which way they face (yaw), and how far through the beat. */
  px: number;
  yaw: number;
  u: number;
  /** Where their feet are along the bars, and how high each is lifted mid-step. */
  footL: number;
  footR: number;
  liftL: number;
  liftR: number;
  /** Where the worker's side-stepped to. */
  sx: number;
  /** Which way along the bars they're going (+1, -1). */
  dir: number;
}
/** The feet of a walk `u` (0–1) of the way from x0 to x1 (STEPS steps and a closing step), `dir` the way. */
function feet(u: number, from: number, to: number) {
  const n = STEPS + 1;
  const s = (to - from) / STEPS;
  const k = Math.min(n - 1, Math.floor(u * n));
  const f = sstep(u * n - k, 0.05, 0.95);
  // Foot positions in steps from the start: R leads, L passes it, … R closes at the end.
  const posR = (i: number) => (i <= 0 ? 0 : i >= n ? STEPS : 2 * Math.ceil(i / 2) - 1);
  const posL = (i: number) => (i <= 0 ? 0 : Math.min(STEPS, 2 * Math.floor(i / 2)));
  // After step i, R is at posR(i+1)… step k moves one foot: even k → R, odd k → L (the last closes R).
  const rAt = (i: number) => posR(i);
  const lAt = (i: number) => posL(i);
  const movingR = k % 2 === 0 || k === n - 1;
  const r0 = rAt(k);
  const r1 = rAt(k + 1);
  const l0 = lAt(k);
  const l1 = lAt(k + 1);
  const footR = from + s * (movingR ? mix(r0, r1, f) : r0);
  const footL = from + s * (!movingR ? mix(l0, l1, f) : l0);
  const lift = 0.07 * Math.sin(f * Math.PI);
  return { footR, footL, liftR: movingR && r1 !== r0 ? lift : 0, liftL: !movingR && l1 !== l0 ? lift : 0 };
}
export function walkAt(t: number, phase: number): WalkAt {
  let u = frac(t / WALK_T + phase) * WALK_T;
  const half = WALK.out + WALK.rest + WALK.turn;
  const back = u >= half;
  if (back) u -= half;
  const from = back ? BARS.x1 : BARS.x0;
  const to = back ? BARS.x0 : BARS.x1;
  const dir = back ? -1 : 1;
  const face = dir * (Math.PI / 2);
  const q = 0.32;
  // The worker side-steps along in little shuffles, a step behind and then level with the user.
  const shuffle = (px: number) => {
    const d = (px - BARS.x0) / q;
    const k = Math.floor(d);
    return BARS.x0 + q * (k + sstep(d - k, 0.5, 0.95));
  };
  if (u < WALK.out) {
    const w = u / WALK.out;
    const f = feet(w, from, to);
    const px = (f.footL + f.footR) / 2 + dir * 0.03;
    return { beat: 'walk', px, yaw: face, u: w, ...f, sx: shuffle(px) + dir * 0.06, dir };
  }
  u -= WALK.out;
  const sx = to + dir * 0.06;
  if (u < WALK.rest) return { beat: 'rest', px: to + dir * 0.03, yaw: face, u: u / WALK.rest, footL: to, footR: to, liftL: 0, liftR: 0, sx: mix(shuffle(to + dir * 0.03) + dir * 0.06, sx, sstep(u / WALK.rest, 0, 0.3)), dir };
  u -= WALK.rest;
  // Turned round through facing the worker, with little steps on the spot.
  const w = u / WALK.turn;
  const yaw = face - dir * Math.PI * sstep(w, 0, 1);
  const step = Math.floor(w * 4);
  const fs = sstep(w * 4 - step, 0.1, 0.9);
  const lift = 0.05 * Math.sin(fs * Math.PI);
  return { beat: 'turn', px: to + dir * 0.03 * (1 - 2 * sstep(w, 0, 1)), yaw, u: w, footL: to, footR: to, liftL: step % 2 ? lift : 0, liftR: step % 2 ? 0 : lift, sx, dir: -dir };
}
function walkKey(w: WalkAt, t: number, s: number): Key {
  // The belt's handle at the user's side towards the worker, the other hand ready by their shoulder.
  const side = -(w.px - w.sx);
  const belt: Loc = [side, BARS.deck + 0.93, BARS.dwellerZ - 0.14];
  const ready: Loc = [side + 0.1 * w.dir, BARS.deck + 1.16, BARS.dwellerZ - 0.18];
  if (w.beat === 'rest' && w.u > 0.25 && w.u < 0.8) return { l: [side + 0.12, 1.02, belt[2]], r: [-0.14, 1.22, 0.3], lean: 0.08, nod: -0.02, palms: 0, gl: 0.7, gr: 0.95 };
  const watchFeet = w.beat === 'walk' ? 0.12 * pulse(t, 0.12, s, 2) : 0;
  return { l: ready, r: belt, lean: 0.14 + watchFeet, nod: 0.2 + watchFeet * 2, palms: 0.9, gl: 0.3, gr: 0.85 };
}

/**
 * A sit-to-stand practised (안전한 부축법), ~17 s round: the worker crouched in front, knees to the
 * user's knees, both hands on the belt; rocking forward on 하나 둘 셋; up together, the user's hands
 * going from the armrests to the bars' ends; stood steady a while; lowered back down slowly; a rest,
 * talking it over.
 */
export type TransferKey = 'ready' | 'rock' | 'rise' | 'stand' | 'lower' | 'rest';
const TRANSFER: Array<Step<TransferKey>> = [st('ready', 2.4, 0.6), st('rock', 1.8, 0.4), st('rise', 0.4, 1.6), st('stand', 4, 0.6), st('lower', 0.3, 2), st('rest', 3, 0.8)];
export const transferBeat = (t: number, phase: number) => beatOf(TRANSFER, t, phase);
/** How far the user's up (0 sat in the chair, 1 stood at the bars) and how far forward they lean. */
export function riseOf(b: Beat<TransferKey>): { up: number; lean: number } {
  const up = b.from === 'rise' ? b.e : b.from === 'stand' ? 1 : b.from === 'lower' ? 1 - b.e : 0;
  const rock = b.from === 'rock' && b.e === 0 ? 0.14 * Math.max(0, Math.sin(b.p * Math.PI * 3)) : 0;
  return { up, lean: 0.08 + rock + 0.5 * Math.sin(Math.PI * up) };
}
/** The user's hips (the piece's frame) as they rise: from the chair's seat to over their feet. */
export function transferHips(up: number): Loc {
  return [mix(BARS.chair.x + 0.03, BARS.feetX - 0.04, sstep(up, 0, 0.8)), mix(0.5, BARS.deck + 0.86, sstep(up, 0.15, 1)), BARS.chair.z];
}
function transferKey(k: TransferKey, t: number, s: number, b: Beat<TransferKey>): Key {
  const sp = BARS.transfer;
  const { up } = riseOf(b);
  const hips = transferHips(up);
  const belt = (dz: number): Loc => rel(sp, [hips[0] + 0.12, hips[1] + 0.07, hips[2] + dz]);
  switch (k) {
    case 'ready':
    case 'rock':
    case 'lower':
    case 'rise':
      return { l: belt(0.15), r: belt(-0.15), lean: 0.3, nod: 0.3, palms: 1.2, gl: 0.85, gr: 0.85, crouch: 0.75 * (1 - up) };
    case 'stand':
      return { l: belt(0.15), r: rel(sp, [hips[0] + 0.08, hips[1] + 0.36, hips[2] - 0.16]), lean: 0.1, nod: 0.05, palms: 1.2, gl: 0.85, gr: 0.4 };
    default:
      return { l: [0.18, 0.9, 0.08], r: [-0.14, 1.0 + 0.05 * wave(t, 0.7, s), 0.28], lean: 0.12, nod: 0.25, palms: -0.4, gl: 0.3, gr: 0.15 };
  }
}

// ---------------------------------------------------------------------------------------------
// The training kitchen: 라면 cooked by the user at the lowered counter; a health check.

/**
 * The 일상 훈련 주방, 2 × 1: the lowered counter's top and front edge, the worker stood at the front
 * left turned to the user, the user's wheelchair at the hob (the right), its knees under the counter;
 * the pot on the hob and its handle, the picture recipe on its stand between the sink and the hob,
 * the big-button timer, the 요일별 약통 and the health log at the left, the wrist cuff's monitor.
 */
export const KITCHEN = {
  top: 0.76,
  front: 0.16,
  dweller: { x: -0.14, y: 0, z: 0.48, yaw: Math.PI - 0.45 } as SpotAt,
  user: { x: 0.42, z: 0.5, yaw: Math.PI },
  pot: [0.42, 0.77, -0.12] as Loc,
  handle: [0.16, 0.86, -0.03] as Loc,
  card: [0.06, 0.95, -0.12] as Loc,
  timer: [0.2, 0.8, 0.06] as Loc,
  pills: [-0.4, 0.8, 0.04] as Loc,
  log: [-0.15, 0.77, 0.07] as Loc,
  bp: [0.03, 0.79, 0.09] as Loc,
  wrist: [0.31, 0.8, 0.06] as Loc,
};
/**
 * Cooking 라면 together, ~18 s round: a finger along the picture recipe (① 물 550mL ② 끓으면 면 · 스프
 * ③ 4분 ④ 불 끄기); a hand steadying the pot's handle while the user stirs; the big timer pressed;
 * watching them, nodding along; a thumbs up.
 */
export type CookKey = 'card' | 'steady' | 'timer' | 'watch' | 'praise';
const COOK: Array<Step<CookKey>> = [st('card', 3.2, 0.8), st('steady', 4, 0.8), st('timer', 1.4, 0.7), st('watch', 4, 0.7), st('praise', 1.6, 0.8)];
export const cookBeat = (t: number, phase: number) => beatOf(COOK, t, phase);
function cookKey(k: CookKey, t: number, s: number): Key {
  const sp = KITCHEN.dweller;
  const edge = rel(sp, [-0.26, KITCHEN.top + 0.01, KITCHEN.front - 0.03]);
  switch (k) {
    case 'card': {
      const c = rel(sp, KITCHEN.card);
      const row = Math.floor(frac(t * 0.3 + s) * 4);
      return { l: edge, r: [c[0], c[1] + 0.09 - row * 0.06, c[2] - 0.03], lean: 0.36, nod: 0.25, palms: 0.4, gl: 0.3, gr: 0.75 };
    }
    case 'steady':
      return { l: edge, r: rel(sp, KITCHEN.handle), lean: 0.34, nod: 0.45, palms: 1.0, gl: 0.3, gr: 0.85 };
    case 'timer': {
      const p = rel(sp, KITCHEN.timer);
      return { l: edge, r: [p[0], p[1] + 0.03 - 0.02 * pulse(t, 1.6, s, 2), p[2]], lean: 0.3, nod: 0.45, palms: 1.3, gl: 0.3, gr: 0.6 };
    }
    case 'praise':
      return { l: edge, r: [-0.12, 1.2, 0.3], lean: 0.06, nod: 0.02, palms: 0, gl: 0.3, gr: 0.95 };
    default:
      return { l: [0.2, 0.9, 0.06], r: [-0.18, 0.92, 0.1], lean: 0.1, nod: 0.3 + 0.07 * pulse(t, 0.45, s), palms: 0.5, gl: 0.4, gr: 0.4 };
  }
}
/**
 * A health check (건강 상태 확인), ~17 s round: the wrist cuff put on the user's wrist on the counter;
 * its button pressed and the reading looked at; today's lid of the 요일별 약통 opened; the reading and
 * the pills written in the log.
 */
export type HealthKey = 'cuff' | 'read' | 'pills' | 'note';
const HEALTH: Array<Step<HealthKey>> = [st('cuff', 3.2, 0.8), st('read', 3.2, 0.8), st('pills', 3, 0.8), st('note', 3.6, 0.8)];
export const healthBeat = (t: number, phase: number) => beatOf(HEALTH, t, phase);
function healthKey(k: HealthKey, t: number, s: number): Key {
  const sp = KITCHEN.dweller;
  const edge = rel(sp, [-0.26, KITCHEN.top + 0.01, KITCHEN.front - 0.03]);
  switch (k) {
    case 'cuff': {
      const w = rel(sp, KITCHEN.wrist);
      return { l: add(w, [0.05, 0.03, -0.01]), r: add(w, [-0.04, 0.04 + 0.01 * wave(t, 1.2, s), 0.02]), lean: 0.42, nod: 0.45, palms: 1.0, gl: 0.6, gr: 0.6 };
    }
    case 'read': {
      const p = rel(sp, KITCHEN.bp);
      return { l: edge, r: [p[0], p[1] + 0.035 - 0.012 * pulse(t, 1.2, s, 2), p[2]], lean: 0.36, nod: 0.5, palms: 1.3, gl: 0.3, gr: 0.6 };
    }
    case 'pills': {
      const p = rel(sp, KITCHEN.pills);
      return { l: [p[0], p[1] + 0.05, p[2] + 0.01], r: rel(sp, [-0.02, KITCHEN.top + 0.01, KITCHEN.front - 0.03]), lean: 0.3, nod: 0.45, palms: 1.2, gl: 0.6, gr: 0.3 };
    }
    default: {
      const p = rel(sp, KITCHEN.log);
      return { l: [p[0] + 0.12, p[1] + 0.01, p[2] - 0.02], r: [p[0] - 0.02 + 0.025 * wave(t, 2.2, s), p[1] + 0.015 + 0.006 * wave(t, 4.4, s), p[2] + 0.015 * wave(t, 1.1, s)], lean: 0.34, nod: 0.5, palms: 1.25, gl: 0.2, gr: 0.85 };
    }
  }
}
/** Whether today's lid's open. */
export const lidOpen = (b: Beat<HealthKey>) => amountOf(b, 'pills') > 0.4 || b.from === 'note';

// ---------------------------------------------------------------------------------------------
// The picture-symbol board (AAC): modelling on the board, waiting, the talker.

/**
 * The 의사소통 보드, 2 × 1: the board's face (against the back), its symbols in a 6 × 4 grid, the
 * worker stood at the front left turned in, the user's wheelchair at the board's right half, the
 * talker tablet on its stand between them.
 */
export const AAC = {
  z: -0.42,
  x0: -0.75,
  w: 1.5,
  y0: 0.6,
  h: 0.92,
  cols: 6,
  rows: 4,
  dweller: { x: -0.52, y: 0, z: 0.12, yaw: Math.PI - 0.3 } as SpotAt,
  user: { x: 0.26, z: 0.1, yaw: Math.PI },
  tablet: [-0.16, 0.92, 0.02] as Loc,
};
/** A symbol's middle on the board's face. */
export function aacCell(c: number, r: number): Loc {
  return [AAC.x0 + ((c + 0.5) * AAC.w) / AAC.cols, AAC.y0 + AAC.h - ((r + 0.5) * AAC.h) / AAC.rows, AAC.z + 0.03];
}
/** What the worker models (나 · 그림 · 그리다 · 좋아요), and what the user answers nearer them (음악 · 듣다 · 더). */
export const AAC_MODEL: Array<[number, number]> = [[0, 0], [1, 2], [2, 1], [0, 3]];
export const AAC_ANSWER: Array<[number, number]> = [[3, 2], [4, 1], [2, 3]];
/**
 * A chat on the board, ~17 s round: a sentence modelled, a finger on each symbol in turn as it's
 * said; waiting with the hands down while the user points out their answer; a nod and an open hand
 * (그렇구나!); the talker tapped so it says the sentence aloud.
 */
export type AacKey = 'model' | 'wait' | 'answer' | 'talker';
const AACSTEPS: Array<Step<AacKey>> = [st('model', 4.8, 0.8), st('wait', 4.2, 0.7), st('answer', 2.6, 0.7), st('talker', 2.6, 0.8)];
export const aacBeat = (t: number, phase: number) => beatOf(AACSTEPS, t, phase);
/** Which of the modelled symbols the worker's finger is on, which of the answer's the user's is on. */
export const aacModelAt = (b: Beat<AacKey>) => (b.from === 'model' && b.e === 0 ? Math.min(AAC_MODEL.length - 1, Math.floor(b.p * AAC_MODEL.length)) : -1);
export const aacAnswerAt = (b: Beat<AacKey>) => (b.from === 'wait' && b.e === 0 && b.p > 0.15 ? Math.min(AAC_ANSWER.length - 1, Math.floor(((b.p - 0.15) / 0.85) * AAC_ANSWER.length)) : -1);
function aacKey(k: AacKey, t: number, s: number, b: Beat<AacKey>): Key {
  const sp = AAC.dweller;
  switch (k) {
    case 'model': {
      const i = Math.max(0, aacModelAt(b));
      const [c, r] = AAC_MODEL[b.from === 'model' ? i : 0];
      const p = rel(sp, aacCell(c, r));
      // Down on the knees a little for the lower rows.
      const low = THREE.MathUtils.clamp((1.05 - p[1]) * 1.3, 0, 0.5);
      return { l: [0.18, 0.9 - 0.3 * low, 0.08], r: [p[0], p[1], p[2] - 0.03 - 0.012 * pulse(t, 1.3, s, 2)], lean: 0.2 + 0.25 * low, nod: -0.05 + 0.3 * low, palms: 0.4, gl: 0.3, gr: 0.75, crouch: low };
    }
    case 'answer':
      return { l: [0.18, 0.92, 0.1], r: [-0.12, 1.06 + 0.04 * wave(t, 0.8, s), 0.34], lean: 0.06, nod: 0.12 + 0.08 * pulse(t, 0.7, s), palms: -0.5, gl: 0.3, gr: 0.1 };
    case 'talker': {
      const p = rel(sp, AAC.tablet);
      return { l: [0.18, 0.92, 0.08], r: [p[0], p[1] + 0.03 - 0.012 * pulse(t, 1.5, s, 2), p[2] - 0.02], lean: 0.26, nod: 0.4, palms: 1.2, gl: 0.3, gr: 0.6 };
    }
    default:
      return { l: [0.2, 0.9, 0.04], r: [-0.18, 0.9, 0.06], lean: 0.05, nod: 0.18, palms: 0.5, gl: 0.4, gr: 0.4 };
  }
}

// ---------------------------------------------------------------------------------------------
// The braille and large-print corner: reading together.

/**
 * The 점자 · 큰글씨 열람 코너, 2 × 1: the reading table's top, the worker's chair at the front left and
 * the user's at the front right, the large-print book open on its tilted bookrest before the worker,
 * the braille book flat before the user.
 */
export const READ = {
  top: 0.74,
  dweller: { x: -0.4, y: 0.46, z: 0.6, yaw: Math.PI } as SpotAt,
  user: { x: 0.4, z: 0.6, seat: 0.46 },
  page: [-0.4, 0.86, 0.04] as Loc,
  braille: [0.4, 0.745, 0.12] as Loc,
};
/**
 * Reading together, ~17 s round: the hands either side of the bookrest, reading aloud; a finger along
 * the big print line by line; listening while the user reads their braille aloud, nodding; the page
 * turned.
 */
export type ReadKey = 'aloud' | 'follow' | 'listen' | 'turn';
const READSTEPS: Array<Step<ReadKey>> = [st('aloud', 4, 0.8), st('follow', 3.6, 0.8), st('listen', 4.6, 0.8), st('turn', 1.2, 0.8)];
export const readBeat = (t: number, phase: number) => beatOf(READSTEPS, t, phase);
function readKey(k: ReadKey, t: number, s: number, b: Beat<ReadKey>): Key {
  const sp = READ.dweller;
  const pg = rel(sp, READ.page);
  const rest = (dx: number): Loc => rel(sp, [READ.dweller.x + dx, READ.top + 0.01, 0.2]);
  switch (k) {
    case 'follow': {
      const u = frac(t * 0.28 + s);
      return { l: rest(0.18), r: [pg[0] + 0.07 - 0.14 * frac(u * 4), pg[1] + 0.06 - 0.03 * Math.floor(u * 4), pg[2] + 0.03 * Math.floor(u * 4) - 0.02], lean: 0.3, nod: 0.5, palms: 1.1, gl: 0.3, gr: 0.6 };
    }
    case 'listen':
      return { l: rest(0.1), r: rest(-0.1), lean: 0.14, nod: 0.25 + 0.08 * pulse(t, 0.45, s), palms: 1.3, gl: 0.3, gr: 0.3 };
    case 'turn': {
      const u = b.from === 'turn' && b.e === 0 ? b.p : 1;
      return { l: rest(0.18), r: [pg[0] - 0.1 + 0.2 * sstep(u, 0.1, 0.9), pg[1] + 0.05 + 0.05 * Math.sin(Math.PI * u), pg[2] - 0.03], lean: 0.3, nod: 0.45, palms: 1.0, gl: 0.3, gr: 0.5 };
    }
    default:
      return { l: rest(0.16), r: rest(-0.16), lean: 0.22, nod: 0.42 + 0.03 * wave(t, 0.3, s), palms: 1.2, gl: 0.3, gr: 0.3 };
  }
}
/** How far the page being turned is over (0 lying right, 1 turned left). */
export const pageTurn = (b: Beat<ReadKey>) => (b.from === 'turn' && b.e === 0 ? sstep(b.p, 0.1, 0.9) : b.from === 'turn' ? 1 : 0);

// ---------------------------------------------------------------------------------------------
// The accessible computer: helping with a big switch and the screen reader.

/**
 * The 접근성 컴퓨터 자리, 2 × 1: the desk's top, the worker's chair at the front left turned in, the
 * user's wheelchair at the right, the big monitor, the big switch between them, the big-key keyboard
 * and the trackball before the user.
 */
export const PC = {
  top: 0.72,
  dweller: { x: -0.44, y: 0.46, z: 0.56, yaw: Math.PI - 0.35 } as SpotAt,
  user: { x: 0.38, z: 0.5, yaw: Math.PI },
  screen: [0.12, 1.06, -0.3] as Loc,
  switchA: [0.02, 0.75, 0.08] as Loc,
  keys: [0.38, 0.735, 0.02] as Loc,
  ball: [0.66, 0.75, 0.06] as Loc,
};
/**
 * Helping at the computer, ~16 s round: pointing out the menu on the screen; the big switch pressed
 * to show it (the screen reader says the item); watching the user try it, hands in the lap; an open
 * hand explaining; a thumbs up.
 */
export type PcKey = 'point' | 'press' | 'watch' | 'explain' | 'praise';
const PCSTEPS: Array<Step<PcKey>> = [st('point', 3, 0.8), st('press', 2, 0.7), st('watch', 4.2, 0.7), st('explain', 2.6, 0.7), st('praise', 1.4, 0.8)];
export const pcBeat = (t: number, phase: number) => beatOf(PCSTEPS, t, phase);
function pcKey(k: PcKey, t: number, s: number): Key {
  const sp = PC.dweller;
  const lap: Pick<Key, 'l' | 'r'> = { l: [0.1, 0.17, 0.24], r: [-0.1, 0.17, 0.24] };
  switch (k) {
    case 'point':
      return { l: lap.l, r: pointing(SHOULDER_R_SIT, rel(sp, PC.screen), 0.5), lean: 0.1, nod: -0.02, palms: 0.3, gl: 0.3, gr: 0.75 };
    case 'press': {
      const p = rel(sp, PC.switchA);
      return { l: lap.l, r: [p[0], p[1] + 0.06 - 0.03 * pulse(t, 1.4, s, 2), p[2]], lean: 0.34, nod: 0.4, palms: 1.4, gl: 0.3, gr: 0.4 };
    }
    case 'explain':
      return { l: lap.l, r: [-0.14, 0.42 + 0.04 * wave(t, 0.8, s), 0.32], lean: 0.08, nod: 0.05, palms: -0.5, gl: 0.3, gr: 0.1 };
    case 'praise':
      return { l: lap.l, r: [-0.14, 0.5, 0.3], lean: 0.08, nod: 0.02, palms: 0, gl: 0.3, gr: 0.95 };
    default:
      return { ...lap, lean: 0.12, nod: 0.2 + 0.07 * pulse(t, 0.45, s), palms: 1.2, gl: 0.3, gr: 0.3 };
  }
}
/** Whether the switch is being pressed down just now (by the worker or, while watched, the user). */
export const switchDown = (b: Beat<PcKey>, t: number, ph: number) => (b.from === 'press' && b.e === 0 ? pulse(t, 1.4, ph * 7.1, 2) > 0.5 : false);

// ---------------------------------------------------------------------------------------------
// The art table: painting together.

/**
 * The 미술 활동 테이블, 2 × 1: the table's top, the worker stood at the front left turned to the user,
 * the user's wheelchair at the tabletop easel (the right), the canvas's middle on it, the water jar.
 */
export const ART = {
  top: 0.72,
  dweller: { x: -0.16, y: 0, z: 0.5, yaw: Math.PI - 0.55 } as SpotAt,
  user: { x: 0.44, z: 0.5, yaw: Math.PI },
  canvas: [0.44, 1.0, -0.16] as Loc,
  jar: [0.08, 0.8, 0.0] as Loc,
};
/** Where the palette's held out to the user (the piece's frame). */
export const ART_OFFER: Loc = [0.2, 0.92, 0.26];
/**
 * Painting together, ~15 s round: the palette on the left hand, a colour mixed on it with the brush;
 * the palette held out for the user to dip into; the brush rinsed in the jar; stood back admiring the
 * painting, the hands together.
 */
export type ArtKey = 'mix' | 'offer' | 'rinse' | 'admire';
const ARTSTEPS: Array<Step<ArtKey>> = [st('mix', 3, 0.8), st('offer', 3.2, 0.8), st('rinse', 2, 0.7), st('admire', 3.4, 0.8)];
export const artBeat = (t: number, phase: number) => beatOf(ARTSTEPS, t, phase);
const PALETTE_AT: Loc = [0.12, 0.98, 0.28];
function artKey(k: ArtKey, t: number, s: number): Key {
  const sp = ART.dweller;
  switch (k) {
    case 'offer':
      return { l: rel(sp, ART_OFFER), r: [-0.18, 0.9, 0.1], lean: 0.2, nod: 0.25, palms: 1.0, gl: 0.6, gr: 0.8 };
    case 'rinse': {
      const j = rel(sp, ART.jar);
      return { l: PALETTE_AT, r: [j[0] + 0.02 * Math.cos(t * 9), j[1] + 0.08, j[2] + 0.02 * Math.sin(t * 9)], lean: 0.36, nod: 0.45, palms: 0.6, gl: 0.6, gr: 0.85 };
    }
    case 'admire':
      return { l: [0.1, 0.92, 0.18], r: [-0.04, 1.02, 0.2], lean: -0.02, nod: 0.08 + 0.05 * pulse(t, 0.4, s), palms: 0.6, gl: 0.6, gr: 0.85 };
    default: {
      const a = t * Math.PI * 2 * 0.9 + s;
      return { l: PALETTE_AT, r: [PALETTE_AT[0] - 0.08 + 0.035 * Math.cos(a), PALETTE_AT[1] + 0.03, PALETTE_AT[2] + 0.03 * Math.sin(a)], lean: 0.12, nod: 0.45, palms: 0.6, gl: 0.6, gr: 0.85 };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The tactile map by the door: the access check.

/**
 * The 촉지도 · 경사로 안내판, 1 × 1: the tactile map's middle on its sloped top, the braille strip
 * along its foot, the voice guide's button at its right, and the worker stood before it.
 */
export const ACCESS = {
  dweller: { x: 0, y: 0, z: 0.44, yaw: Math.PI } as SpotAt,
  map: [0, 1.0, 0.0] as Loc,
  braille: [0, 0.91, 0.13] as Loc,
  button: [0.24, 0.95, 0.1] as Loc,
};
/**
 * Checking the centre's access (편의시설 점검), ~14 s round: both hands over the tactile map, tracing
 * the raised routes; a fingertip along the braille strip; the voice guide's button pressed; ticks on
 * the 점검표 on its clipboard; a look up at the ramp and lift sign.
 */
export type AccessKey = 'trace' | 'braille' | 'button' | 'tick' | 'look';
const ACCESSSTEPS: Array<Step<AccessKey>> = [st('trace', 3.4, 0.7), st('braille', 2.2, 0.6), st('button', 1.2, 0.6), st('tick', 3, 0.7), st('look', 1.8, 0.8)];
export const accessBeat = (t: number, phase: number) => beatOf(ACCESSSTEPS, t, phase);
export const ACCESS_CLIP: Loc = [0.1, 1.02, 0.26];
function accessKey(k: AccessKey, t: number, s: number): Key {
  const sp = ACCESS.dweller;
  const m = rel(sp, ACCESS.map);
  switch (k) {
    case 'trace':
      return { l: [m[0] + 0.1 + 0.05 * wave(t, 0.3, s), m[1] + 0.02, m[2] - 0.02 + 0.04 * wave(t, 0.23, s)], r: [m[0] - 0.08 + 0.07 * wave(t, 0.21, s + 0.3), m[1] + 0.03 + 0.02 * wave(t, 0.4, s), m[2] - 0.0 + 0.05 * wave(t, 0.17, s)], lean: 0.3, nod: 0.5, palms: 1.4, gl: 0.1, gr: 0.1 };
    case 'braille': {
      const p = rel(sp, ACCESS.braille);
      return { l: [m[0] + 0.14, m[1] + 0.0, m[2]], r: [p[0] + 0.1 - 0.2 * frac(t * 0.4 + s), p[1] + 0.012, p[2]], lean: 0.32, nod: 0.5, palms: 1.4, gl: 0.2, gr: 0.4 };
    }
    case 'button': {
      const p = rel(sp, ACCESS.button);
      return { l: [0.2, 0.92, 0.06], r: [p[0], p[1] + 0.03 - 0.015 * pulse(t, 1.5, s, 2), p[2]], lean: 0.24, nod: 0.35, palms: 1.2, gl: 0.3, gr: 0.5 };
    }
    case 'tick':
      return { l: ACCESS_CLIP, r: [ACCESS_CLIP[0] - 0.12 + 0.025 * wave(t, 1.8, s), ACCESS_CLIP[1] + 0.02 + 0.008 * pulse(t, 1.8, s, 2), ACCESS_CLIP[2] + 0.01], lean: 0.05, nod: 0.45, palms: 1.1, gl: 0.6, gr: 0.85 };
    default:
      return { l: ACCESS_CLIP, r: [-0.18, 0.92, 0.06], lean: -0.04, nod: -0.32, palms: 0.5, gl: 0.6, gr: 0.4 };
  }
}
/** Whether the clipboard's in the hand. */
export const clipOut = (b: Beat<AccessKey>) => amountOf(b, 'tick') + amountOf(b, 'look') > 0.3;

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a motion at `t`, by the piece's clock `phase`, in the spot's frame. */
export function dsKey(m: DsMotion, t: number, phase: number): Key {
  const s = phase * 7.1;
  switch (m) {
    case 'dsSensory':
      return blended(sensoryBeat(t, phase), (k) => sensoryKey(k, t, s));
    case 'dsDemo':
      return blended(demoBeat(t, phase), (k) => demoKey(k, t, s));
    case 'dsCoach':
      return blended(coachBeat(t, phase), (k) => coachKey(k, t, s));
    case 'dsWalk':
      return walkKey(walkAt(t, phase), t, s);
    case 'dsTransfer': {
      const b = transferBeat(t, phase);
      return blended(b, (k) => transferKey(k, t, s, b));
    }
    case 'dsCook':
      return blended(cookBeat(t, phase), (k) => cookKey(k, t, s));
    case 'dsHealth':
      return blended(healthBeat(t, phase), (k) => healthKey(k, t, s));
    case 'dsAac': {
      const b = aacBeat(t, phase);
      return blended(b, (k) => aacKey(k, t, s, b));
    }
    case 'dsRead': {
      const b = readBeat(t, phase);
      return blended(b, (k) => readKey(k, t, s, b));
    }
    case 'dsPc':
      return blended(pcBeat(t, phase), (k) => pcKey(k, t, s));
    case 'dsArt':
      return blended(artBeat(t, phase), (k) => artKey(k, t, s));
    default:
      return blended(accessBeat(t, phase), (k) => accessKey(k, t, s));
  }
}

export function dsDoing(m: DsMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  // The clock goes by the piece's fixed mark (the walk moves the spot itself).
  const k = dsKey(m, t, dsPhase(work?.point ?? b.base));
  const w = (p: Loc) => b.base.clone().addScaledVector(left, p[0]).addScaledVector(fwd, p[2]).setY(b.base.y + p[1]);
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
