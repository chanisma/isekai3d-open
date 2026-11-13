import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';
import { ASANAS, type Asana, type AsanaKey } from '../asana';
import type { BodyPose } from '../avatar';
import type { Spot } from '../parts';

/*
 * At the 스포츠 구단 훈련장 (2026-10-27 workplace pipeline, at the user's request: the training should
 * look like training). The club (솔뫼 FC of the 누리 리그) and everyone in it are made up. Two kinds of
 * motion live here, kept out of activity.ts (which only hands them over) so this imports nothing from
 * it at run time:
 *
 * - Whole-body ones (ATH_POSES), posed like the yoga studio's asanas (avatar.ts 'asana' pose: bones
 *   turned, the body set down on what it's on) with poses of their own added to asana.ts's table at
 *   load: down the sprint lane from a crouched start in the blocks (제자리에 — 차렷 — 탕!), braking,
 *   hands on the knees, walking back; through the tyres, over the hurdle and under the crawl net;
 *   chalked up, jumped to the bar and six pull-ups; a back squat out of the rack; a bench press lying
 *   on the bench; lying on the physio table while the physio stretches the hamstring and bends the
 *   knee; sat shivering in the ice bath; quick feet through the agility ladder, and the ball dribbled
 *   through the cones and shot into the little goal. Each is worked out in its spot's frame (Spot.at:
 *   +z the way the dweller faces, +x their left), so the pieces (workplaces/athletic.ts) draw the bar, the
 *   ball, the lights and the physio's hands from the same numbers by the same clock (athPhase of the
 *   spot).
 * - Hand ones (ATH_HANDS) at the tactics board, the weight rack (spotting, a programme on the
 *   clipboard), the water station, the lockers and the bus's luggage bay, given in the body's frame
 *   (to their left, up from the feet, ahead of them) by rounds of beats.
 */
export type AthPoseMotion = 'athSprint' | 'athObstacle' | 'athPullUp' | 'athSquat' | 'athBench' | 'athPhysio' | 'athIceBath' | 'athLadder' | 'athDrill' | 'athDribble';
export type AthHandMotion = 'athPlays' | 'athScout' | 'athTeamTalk' | 'athSpotSquat' | 'athSpotBench' | 'athProgram' | 'athFill' | 'athDrink' | 'athTidy' | 'athLoadKit';
export type AthMotion = AthPoseMotion | AthHandMotion;
export const ATH_POSES = new Set<string>(['athSprint', 'athObstacle', 'athPullUp', 'athSquat', 'athBench', 'athPhysio', 'athIceBath', 'athLadder', 'athDrill', 'athDribble']);
export const ATH_HANDS = new Set<string>(['athPlays', 'athScout', 'athTeamTalk', 'athSpotSquat', 'athSpotBench', 'athProgram', 'athFill', 'athDrink', 'athTidy', 'athLoadKit']);
export const ATH_MOTIONS = new Set<string>([...ATH_POSES, ...ATH_HANDS]);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
export const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
/** avatar.ts eases the blend between two poses (smoothstep); a blend that has to track something (the physio's hands) is handed the inverse. */
const unease = (y: number) => {
  const v = clamp01(y);
  return 0.5 - Math.sin(Math.asin(1 - 2 * v) / 3);
};
/** The clock offset of a place (its spot's, across the floor), so two lanes or two racks aren't in step. */
export const athPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.583);

/** A point in a spot's (or a body's) frame: +x their left, y up from the feet, +z ahead. */
export interface P3 {
  x: number;
  y: number;
  z: number;
}
export const p3 = (x: number, y: number, z: number): P3 => ({ x, y, z });
export const pMix = (a: P3, b: P3, e: number): P3 => p3(mixN(a.x, b.x, e), mixN(a.y, b.y, e), mixN(a.z, b.z, e));
const pAdd = (a: P3, x: number, y: number, z: number): P3 => p3(a.x + x, a.y + y, a.z + z);

// ---------------------------------------------------------------------------------------------
// Timelines: a round of named steps, each lasting so long; where we are in it.

type Line = Array<[string, number]>;
export interface At {
  /** Which round (counts up), the step's key, how far through it (0–1), and the step before's key. */
  n: number;
  key: string;
  u: number;
  i: number;
  prev: string;
}
const lineLength = (line: Line) => line.reduce((s, [, d]) => s + d, 0);
export function lineAt(line: Line, t: number, ph: number): At {
  const T = lineLength(line);
  const c = t / T + ph;
  const n = Math.floor(c);
  let x = (c - n) * T;
  for (let i = 0; i < line.length; i++) {
    const [key, d] = line[i];
    if (x < d || i === line.length - 1) return { n, key, u: clamp01(x / d), i, prev: line[(i + line.length - 1) % line.length][0] };
    x -= d;
  }
  return { n, key: line[0][0], u: 0, i: 0, prev: line[line.length - 1][0] };
}

// ---------------------------------------------------------------------------------------------
// The poses, added to asana.ts's table (model units; +x the body's left). A leg is given by where its
// ankle is from the hip (below, ahead) in the world, the hips' own pitch taken off; or by its angles.

type E3 = [number, number, number];
type Bones = Asana['bones'];
const THIGH = 0.42;
const SHIN = 0.4;
function legAngles(dy: number, dz: number): [number, number, number] {
  const d = THREE.MathUtils.clamp(Math.hypot(dy, dz), Math.abs(THIGH - SHIN) + 0.01, THIGH + SHIN - 0.001);
  const toFoot = Math.atan2(dz, dy);
  const lift = Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1));
  const bend = Math.PI - Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN), -1, 1));
  const up = toFoot + lift;
  return [-up, bend, up - bend];
}
type LegAt = [number, number, number];
/**
 * Both legs by where the ankles are from the hip in the world ([below, ahead, the knee turned out]),
 * the hips pitched `pitch` forward (the targets turned into their frame, the soles kept flat on the
 * floor), and how far each sole is turned from flat (+ the toes down).
 */
function legs(l: LegAt, r: LegAt, pitch = 0, soleL = 0, soleR = soleL): Bones {
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  const one = ([dy, dz]: LegAt) => legAngles(dy * c - dz * s, dy * s + dz * c);
  const [lu, lk, lf] = one(l);
  const [ru, rk, rf] = one(r);
  return {
    hips: [pitch, 0, 0],
    leftUpperLeg: [lu, 0, l[2]], rightUpperLeg: [ru, 0, -r[2]],
    leftLowerLeg: [lk, 0, 0], rightLowerLeg: [rk, 0, 0],
    leftFoot: [lf - pitch + soleL, 0, -l[2] * 0.6], rightFoot: [rf - pitch + soleR, 0, r[2] * 0.6],
  };
}
/** The same pose the other way round (left for right). */
function mirror(b: Bones): Bones {
  const out: Bones = {};
  for (const [k, v] of Object.entries(b) as Array<[keyof Bones, E3]>) {
    const name = String(k);
    const other = (name.startsWith('left') ? 'right' + name.slice(4) : name.startsWith('right') ? 'left' + name.slice(5) : name) as keyof Bones;
    out[other] = [v[0], -v[1], -v[2]];
  }
  return out;
}
const ARMS_DOWN: Bones = { leftUpperArm: [0, 0, -1.25], rightUpperArm: [0, 0, 1.25], leftLowerArm: [0, -0.15, 0], rightLowerArm: [0, 0.15, 0] };
const STRAIGHT: Bones = { leftUpperLeg: [-0.016, 0, 0.04], rightUpperLeg: [-0.016, 0, -0.04], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.019, 0, -0.02], rightFoot: [-0.019, 0, 0.02] };
const LOOK_AHEAD: Bones = { neck: [-0.12, 0, 0], head: [-0.06, 0, 0] };
/** Lying on the back (the hips tipped back): the legs out straight along the table, the toes up. */
const LIE = -Math.PI / 2;
const lyingLegs = (lu: E3, ru: E3, lk = 0.03, rk = 0.03, lf = 0, rf = 0): Bones => ({
  hips: [LIE, 0, 0],
  leftUpperLeg: lu, rightUpperLeg: ru,
  leftLowerLeg: [lk, 0, 0], rightLowerLeg: [rk, 0, 0],
  leftFoot: [lf, 0, 0], rightFoot: [rf, 0, 0],
});

const runA: Bones = { ...legs([0.5, 0.3, 0.03], [0.84, -0.32, 0.03], 0.16, 0, 0.55), spine: [0.04, 0, 0], ...LOOK_AHEAD, ...ARMS_DOWN };
const driveA: Bones = { ...legs([0.44, 0.28, 0.03], [0.76, -0.44, 0.03], 0.55, 0.2, 0.7), neck: [-0.35, 0, 0], head: [-0.1, 0, 0], ...ARMS_DOWN };
const walkA: Bones = { ...legs([0.86, 0.18, 0.04], [0.86, -0.18, 0.04], 0.02, 0, 0.18), ...ARMS_DOWN };
const quickA: Bones = { ...legs([0.66, 0.1, 0.06], [0.84, -0.04, 0.06], 0.22, 0.1, 0.25), ...LOOK_AHEAD, neck: [0.15, 0, 0], ...ARMS_DOWN };
const highA: Bones = { ...legs([0.4, 0.3, 0.05], [0.86, -0.06, 0.05], 0.06, 0.2, 0.2), ...ARMS_DOWN };
const kickBack: Bones = { ...legs([0.8, 0.06, 0.06], [0.58, -0.45, 0.06], 0.12, 0, 0.6), neck: [0.3, 0, 0], ...ARMS_DOWN };
const kick: Bones = {
  hips: [-0.12, 0, 0],
  leftUpperLeg: [0.1, 0, 0.06], leftLowerLeg: [0.25, 0, 0], leftFoot: [-0.2, 0, 0],
  rightUpperLeg: [-1.25, 0, -0.08], rightLowerLeg: [0.25, 0, 0], rightFoot: [0.6, 0, 0],
  neck: [0.25, 0, 0], ...ARMS_DOWN,
};
const crawlA: Bones = {
  hips: [1.5, 0, 0], spine: [-0.18, 0, 0], chest: [-0.12, 0, 0], neck: [-0.55, 0, 0], head: [-0.25, 0, 0],
  leftUpperLeg: [-0.8, 0, 0.95], leftLowerLeg: [1.35, 0, 0], leftFoot: [0.5, 0, 0],
  rightUpperLeg: [0.05, 0, -0.06], rightLowerLeg: [0.15, 0, 0], rightFoot: [0.9, 0, 0],
  ...ARMS_DOWN,
};
const hurdle: Bones = {
  ...legs([0.06, 0.8, 0.02], [0.8, 0, 0.02], 0.5, -0.4, 0.4),
  rightUpperLeg: [-0.55, 0, -1.25], rightLowerLeg: [1.75, 0, 0], rightFoot: [0.3, 0, 0],
  ...LOOK_AHEAD, ...ARMS_DOWN,
};

const ATH_ASANAS: Record<string, Asana> = {
  athStand: { hip: [0, 0.91, 0], bones: { ...STRAIGHT, ...ARMS_DOWN } },
  athReady: { hip: [0, 0.84, 0], bones: { ...legs([0.78, 0.06, 0.12], [0.78, 0.06, 0.12], 0.28), ...LOOK_AHEAD, ...ARMS_DOWN } },
  athKnees: { hip: [0, 0.82, 0], bones: { ...legs([0.78, 0.14, 0.1], [0.78, 0.14, 0.1], 0.8), neck: [-0.3, 0, 0], ...ARMS_DOWN } },
  // 제자리에: the rear knee down under the hips, the front foot in its block, the torso out over the hands.
  athMarks: { hip: [0, 0.5, 0], bones: { ...legs([0.43, 0.12, 0.08], [0.43, -0.38, 0.08], 1.37, 0, 0.9), neck: [0.25, 0, 0], ...ARMS_DOWN } },
  // 차렷 (set): the hips up above the shoulders, both knees bent, the weight on the hands.
  athSet: { hip: [0, 0.72, 0], bones: { ...legs([0.65, 0.06, 0.08], [0.65, -0.32, 0.08], 1.75, 0.6, 0.6), neck: [0.15, 0, 0], ...ARMS_DOWN } },
  athRunA: { hip: [0, 0.86, 0], bones: runA },
  athRunB: { hip: [0, 0.86, 0], bones: mirror(runA) },
  athDriveA: { hip: [0, 0.78, 0], bones: driveA },
  athDriveB: { hip: [0, 0.78, 0], bones: mirror(driveA) },
  athWalkA: { hip: [0, 0.9, 0], bones: walkA },
  athWalkB: { hip: [0, 0.9, 0], bones: mirror(walkA) },
  athQuickA: { hip: [0, 0.84, 0], bones: quickA },
  athQuickB: { hip: [0, 0.84, 0], bones: mirror(quickA) },
  athShuffle: { hip: [0, 0.8, 0], bones: { ...legs([0.76, 0, 0.32], [0.76, 0, 0.32], 0.32), ...LOOK_AHEAD, ...ARMS_DOWN } },
  athHighA: { hip: [0, 0.88, 0], bones: highA },
  athHighB: { hip: [0, 0.88, 0], bones: mirror(highA) },
  athHurdle: { hip: [0, 0.8, 0], bones: hurdle },
  athCrawlA: { hip: [0, 0.2, 0], bones: crawlA },
  athCrawlB: { hip: [0, 0.2, 0], bones: mirror(crawlA) },
  athKickBack: { hip: [0, 0.84, 0], bones: kickBack },
  athKick: { hip: [0, 0.86, 0], bones: kick },
  // On the bar: hanging with the knees soft and the toes pointed; at the top the knees drawn back.
  athHang: { hip: [0, 0.9, 0], bones: { ...legs([0.8, 0.1, 0.03], [0.8, 0.1, 0.03], 0, 0.6), ...ARMS_DOWN } },
  athHangTop: { hip: [0, 0.9, 0], bones: { ...legs([0.66, -0.2, 0.03], [0.66, -0.2, 0.03], 0, 0.7), neck: [-0.25, 0, 0], ...ARMS_DOWN } },
  athLand: { hip: [0, 0.75, 0], bones: { ...legs([0.66, 0.1, 0.1], [0.66, 0.1, 0.1], 0.3), ...ARMS_DOWN } },
  // The back squat: down with the hips back, the knees out over the toes, the chest up.
  athSquatDown: { hip: [0, 0.5, 0], bones: { ...legs([0.43, 0.16, 0.32], [0.43, 0.16, 0.32], 0.62), neck: [-0.3, 0, 0], ...ARMS_DOWN } },
  athSquatDip: { hip: [0, 0.86, 0], bones: { ...legs([0.8, 0.08, 0.14], [0.8, 0.08, 0.14], 0.12), ...ARMS_DOWN } },
  // On the bench: sat at its end, and lying back along it, the feet flat and wide on the floor.
  athBenchSit: { hip: [0, 0.56, 0], bones: { ...legs([0.47, 0.42, 0.14], [0.47, 0.42, 0.14], 0), ...ARMS_DOWN } },
  athBenchLie: { hip: [0, 0.56, 0], bones: { ...legs([0.47, 0.42, 0.35], [0.47, 0.42, 0.35], LIE), neck: [0.1, 0, 0], ...ARMS_DOWN } },
  // On the physio table: flat; the left leg lifted straight (the hamstring stretched); the knee bent to 90/90.
  athLie: { hip: [0, 0.1, 0], bones: { ...lyingLegs([0, 0, 0.05], [0, 0, -0.05]), neck: [0.12, 0, 0], ...ARMS_DOWN } },
  athHamL: { hip: [0, 0.1, 0], bones: { ...lyingLegs([-1.22, 0, 0.04], [0, 0, -0.05], 0.03, 0.03, -0.3), neck: [0.18, 0, 0], ...ARMS_DOWN } },
  athKneeL: { hip: [0, 0.1, 0], bones: { ...lyingLegs([-1.45, 0, 0.06], [0, 0, -0.05], 1.5), neck: [0.18, 0, 0], ...ARMS_DOWN } },
  // Sat in the ice bath, the legs out straight under the water; hunched against the cold.
  athTub: { hip: [0, 0.12, 0], bones: { leftUpperLeg: [-1.5, 0, 0.06], rightUpperLeg: [-1.5, 0, -0.06], leftLowerLeg: [0.06, 0, 0], rightLowerLeg: [0.06, 0, 0], ...ARMS_DOWN } },
  athTubHunch: { hip: [0, 0.12, 0], bones: { leftUpperLeg: [-1.62, 0, 0.1], rightUpperLeg: [-1.62, 0, -0.1], leftLowerLeg: [0.3, 0, 0], rightLowerLeg: [0.3, 0, 0], spine: [0.22, 0, 0], chest: [0.12, 0, 0], neck: [0.2, 0, 0], ...ARMS_DOWN } },
};
Object.assign(ASANAS, ATH_ASANAS);
type AKey = keyof typeof ATH_ASANAS;

// =============================================================================================
// The sprint lane (its spot: the blocks, facing down the lane).

/** Down the lane from the blocks (z = 0 the front block): the start line, the finish, where they stop. */
export const LANE = { line: 0.42, finish: 2.25, stop: 2.5, blockR: -0.38 };
const SPRINT: Line = [['marks', 2.2], ['set', 1.1], ['run', 1.35], ['brake', 0.55], ['knees', 1.6], ['look', 1.0], ['turn', 0.7], ['walk', 2.5], ['turn2', 0.7]];
export interface SprintNow {
  at: At;
  /** The start light (off, red for 제자리에, amber for 차렷, green on the gun) and the clock (seconds, or null while blank). */
  light: 'off' | 'red' | 'amber' | 'green';
  clock: number | null;
  /** Just gone (the 탕! shown). */
  gun: boolean;
}
/** The time the round's run shows on the clock (a 100 m time, as if it were one). */
export const runTime = (n: number) => 10.84 + 0.31 * frac(Math.sin(n * 12.9898) * 43758.5);
export function sprintNow(t: number, ph: number): SprintNow {
  const a = lineAt(SPRINT, t, ph);
  const T = runTime(a.n);
  const light = a.key === 'marks' ? 'red' : a.key === 'set' ? 'amber' : a.key === 'run' ? 'green' : 'off';
  const clock = a.key === 'run' ? T * a.u : a.key === 'brake' || a.key === 'knees' || a.key === 'look' ? T : null;
  return { at: a, light, clock, gun: a.key === 'run' && a.u < 0.25 };
}

interface Whole {
  hipX: number;
  hipZ: number;
  floor: number;
  from: AKey;
  to: AKey;
  e: number;
  turnFrom?: number;
  turnTo?: number;
  l?: P3;
  r?: P3;
  gl?: number;
  gr?: number;
  nod?: number;
  palms?: number;
  shut?: boolean;
}
/** Stride by stride over a distance run: which foot's forward and how far into the step. */
function stride(dist: number, len: number, a: AKey, b: AKey): { from: AKey; to: AKey; e: number } {
  const s = dist / len;
  const i = Math.floor(s);
  return i % 2 === 0 ? { from: a, to: b, e: s - i } : { from: b, to: a, e: s - i };
}
/** The arms pumping with the legs: the hand opposite the forward leg up in front, the other back by the hip. */
function pump(hipZ: number, e: number, legA: boolean, k: number, amp = 1, hipY = 0.86): { l: P3; r: P3 } {
  const s = Math.cos(Math.PI * e) * (legA ? 1 : -1);
  const hand = (side: number, f: number) => p3(side * 0.2 * k, (hipY + 0.2 + 0.14 * amp * f) * k, hipZ + (0.05 + 0.24 * amp * f) * k);
  return { l: hand(1, -s), r: hand(-1, s) };
}
function sprintPose(t: number, ph: number, k: number): Whole {
  const { at } = sprintNow(t, ph);
  const hands0 = { l: p3(0.17 * k, 0.03, LANE.line - 0.02), r: p3(-0.17 * k, 0.03, LANE.line - 0.02) };
  switch (at.key) {
    case 'marks': {
      const e = sm(at.u, 0, 0.35);
      return { hipX: 0, hipZ: -0.12, floor: 0, from: 'athStand', to: 'athMarks', e, ...hands0, gl: 0.1, gr: 0.1, palms: 1.3, nod: 0.4 };
    }
    case 'set':
      return { hipX: 0, hipZ: mixN(-0.12, -0.06, sm(at.u, 0, 0.4)), floor: 0, from: 'athMarks', to: 'athSet', e: sm(at.u, 0, 0.4), ...hands0, gl: 0.1, gr: 0.1, palms: 1.3, nod: 0.3 };
    case 'run': {
      // Accelerating out of the blocks: the first strides low and driving, then upright.
      const z = mixN(-0.06, LANE.finish, at.u * at.u * 0.55 + at.u * 0.45);
      const dist = z + 0.06;
      if (at.u < 0.12) {
        const e = at.u / 0.12;
        return { hipX: 0, hipZ: z, floor: 0, from: 'athSet', to: 'athDriveA', e, l: pMix(hands0.l, p3(0.2 * k, 1.0 * k, 0.35 * k), e), r: pMix(hands0.r, p3(-0.2 * k, 0.75 * k, -0.25 * k), e), gl: 0.5, gr: 0.5, nod: 0.1, palms: 0.4 };
      }
      const drive = at.u < 0.4;
      const st = drive ? stride(dist, 0.62 * k, 'athDriveA', 'athDriveB') : stride(dist, 0.95 * k, 'athRunA', 'athRunB');
      const arms = pump(z, st.e, st.from.endsWith('A'), k, 1, drive ? 0.78 : 0.86);
      return { hipX: 0, hipZ: z, floor: 0.03 * Math.sin(Math.PI * st.e), ...st, ...arms, gl: 0.55, gr: 0.55, nod: drive ? 0.15 : -0.05, palms: 0.3 };
    }
    case 'brake': {
      const z = mixN(LANE.finish, LANE.stop, sm(at.u, 0, 1));
      return { hipX: 0, hipZ: z, floor: 0, from: 'athRunB', to: 'athStand', e: sm(at.u, 0, 0.9), ...pump(z, 0.5, true, k, 0.4), gl: 0.4, gr: 0.4 };
    }
    case 'knees': {
      // Bent over, the hands on the knees, the back going up and down with the breath.
      const e = sm(at.u, 0, 0.3) * (1 - sm(at.u, 0.85, 1));
      const knee = (side: number) => p3(side * 0.12 * k, (0.5 + 0.015 * wave(t, 0.9)) * k, LANE.stop + 0.12 * k);
      return { hipX: 0, hipZ: LANE.stop - 0.06, floor: 0, from: 'athStand', to: 'athKnees', e, l: knee(1), r: knee(-1), gl: 0.5, gr: 0.5, nod: 0.3, palms: 1.2 };
    }
    case 'look': {
      // Up, the hands on the hips, a look back at the clock.
      const hip = (side: number) => p3(side * 0.2 * k, 0.94 * k, LANE.stop + 0.02);
      return { hipX: 0, hipZ: LANE.stop, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: hip(1), r: hip(-1), gl: 0.4, gr: 0.4, nod: -0.15, palms: 1.5 };
    }
    case 'turn':
    case 'turn2': {
      const back = at.key === 'turn';
      const z = back ? LANE.stop : -0.12;
      const side = (s: number) => p3(s * 0.22 * k, 0.78 * k, z);
      return { hipX: 0, hipZ: z, floor: 0, from: 'athStand', to: 'athStand', e: sm(at.u, 0, 1), turnFrom: back ? 0 : Math.PI, turnTo: back ? Math.PI : 0, l: side(1), r: side(-1), gl: 0.3, gr: 0.3 };
    }
    default: {
      // Walking back to the blocks along the lane.
      const z = mixN(LANE.stop, -0.12, at.u);
      const st = stride(LANE.stop - z, 0.62 * k, 'athWalkA', 'athWalkB');
      const s = Math.cos(Math.PI * st.e) * (st.from === 'athWalkA' ? 1 : -1);
      // Turned round: their left is the lane's right, their ahead its back.
      const hand = (side: number, f: number) => p3(-side * 0.21 * k, 0.8 * k, z - 0.12 * f * k);
      return { hipX: 0, hipZ: z, floor: 0, ...st, turnFrom: Math.PI, turnTo: Math.PI, l: hand(1, -s), r: hand(-1, s), gl: 0.3, gr: 0.3 };
    }
  }
}

// =============================================================================================
// The obstacle course (its spot: the start, facing along it; the walk back along its front).

/** Along the course: two pairs of tyres, the hurdle, the crawl net, the end; the walk back `back` to their right. */
export const OBST = { tyres: [0.32, 0.62, 0.92], hurdle: 1.32, netFrom: 1.68, netTo: 2.32, end: 2.55, back: -0.45, tyreX: 0.14, hurdleH: 0.48, netH: 0.42 };
const OBSTACLE: Line = [['ready', 1.0], ['tyres', 1.3], ['approach', 0.35], ['hurdle', 0.55], ['drop', 0.55], ['crawl', 2.6], ['up', 0.7], ['cheer', 0.9], ['turn', 0.7], ['walk', 2.7], ['turn2', 0.7]];
export const obstacleNow = (t: number, ph: number) => lineAt(OBSTACLE, t, ph);
function obstaclePose(t: number, ph: number, k: number): Whole {
  const at = obstacleNow(t, ph);
  const side = (s: number, z: number, y = 0.8) => p3(s * 0.22 * k, y * k, z);
  switch (at.key) {
    case 'ready':
      return { hipX: 0, hipZ: 0, floor: 0, from: 'athStand', to: 'athReady', e: sm(at.u, 0, 0.5), l: side(1, 0.15, 0.95), r: side(-1, 0.15, 0.95), gl: 0.6, gr: 0.6, nod: 0.2 };
    case 'tyres': {
      // High knees, a foot into each tyre.
      const z = mixN(0.05, OBST.tyres[2] + 0.12, at.u);
      const st = stride(at.u * 6, 1, 'athHighA', 'athHighB');
      return { hipX: 0, hipZ: z, floor: 0.02 * Math.sin(Math.PI * st.e), ...st, ...pump(z, st.e, st.from === 'athHighA', k, 0.8, 0.88), gl: 0.6, gr: 0.6, nod: 0.25 };
    }
    case 'approach': {
      const z = mixN(OBST.tyres[2] + 0.12, OBST.hurdle - 0.32, at.u);
      return { hipX: 0, hipZ: z, floor: 0, from: 'athRunA', to: 'athRunB', e: at.u, ...pump(z, at.u, true, k), gl: 0.55, gr: 0.55 };
    }
    case 'hurdle': {
      // Over it: the lead leg straight out, the trail knee out to the side; up and down over the bar.
      const z = mixN(OBST.hurdle - 0.32, OBST.hurdle + 0.3, at.u);
      const e = Math.sin(Math.PI * at.u);
      return { hipX: 0, hipZ: z, floor: 0.2 * e, from: 'athRunB', to: 'athHurdle', e, l: p3(0.25 * k, 0.85 * k, z - 0.2 * k), r: p3(-0.1 * k, 0.95 * k, z + 0.45 * k), gl: 0.5, gr: 0.4, nod: 0.3 };
    }
    case 'drop': {
      const z = mixN(OBST.hurdle + 0.3, OBST.netFrom - 0.2, at.u);
      const e = sm(at.u, 0, 1);
      return { hipX: 0, hipZ: z, floor: 0, from: 'athRunB', to: 'athCrawlA', e, l: p3(0.2 * k, mixN(0.6, 0.03, e) * k, z + 0.45 * k), r: p3(-0.2 * k, mixN(0.6, 0.03, e) * k, z + 0.3 * k), gl: 0.4, gr: 0.4, nod: 0.1 };
    }
    case 'crawl': {
      // On the belly under the net, elbow over elbow, a knee drawn up to the side.
      const z = mixN(OBST.netFrom - 0.2, OBST.netTo + 0.05, at.u);
      const st = stride(at.u * 6, 1, 'athCrawlA', 'athCrawlB');
      const s = Math.cos(Math.PI * st.e) * (st.from === 'athCrawlA' ? 1 : -1);
      const hand = (side: number, f: number) => p3(side * 0.2 * k, 0.03, z + (0.38 + 0.14 * f) * k);
      return { hipX: 0, hipZ: z, floor: 0, ...st, l: hand(1, s), r: hand(-1, -s), gl: 0.5, gr: 0.5, nod: -0.2, palms: 1.2 };
    }
    case 'up': {
      const z = mixN(OBST.netTo + 0.05, OBST.end, at.u);
      const e = sm(at.u, 0, 1);
      return { hipX: 0, hipZ: z, floor: 0, from: 'athCrawlA', to: 'athStand', e, l: p3(0.2 * k, mixN(0.03, 0.8, e) * k, z + 0.3 * k), r: p3(-0.2 * k, mixN(0.03, 0.8, e) * k, z + 0.3 * k), gl: 0.4, gr: 0.4 };
    }
    case 'cheer': {
      // A fist up, done.
      const up = Math.sin(Math.PI * Math.min(1, at.u * 1.4));
      return { hipX: 0, hipZ: OBST.end, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: side(1, OBST.end + 0.05, 0.92), r: p3(-0.18 * k, mixN(0.95, 1.85, up) * k, OBST.end + 0.12), gl: 0.4, gr: 1, nod: -0.25 };
    }
    case 'turn':
    case 'turn2': {
      const back = at.key === 'turn';
      // Side-stepped out to the course's front for the walk back, and in again at the start.
      const x = back ? mixN(0, OBST.back, sm(at.u, 0, 1)) : mixN(OBST.back, 0, sm(at.u, 0, 1));
      const z = back ? OBST.end : 0;
      return { hipX: x, hipZ: z, floor: 0, from: 'athStand', to: 'athStand', e: sm(at.u, 0, 1), turnFrom: back ? 0 : Math.PI, turnTo: back ? Math.PI : 0, l: p3(x + 0.22 * k, 0.8 * k, z), r: p3(x - 0.22 * k, 0.8 * k, z), gl: 0.3, gr: 0.3 };
    }
    default: {
      const z = mixN(OBST.end, 0, at.u);
      const st = stride(OBST.end - z, 0.62 * k, 'athWalkA', 'athWalkB');
      const s = Math.cos(Math.PI * st.e) * (st.from === 'athWalkA' ? 1 : -1);
      const hand = (sd: number, f: number) => p3(OBST.back - sd * 0.21 * k, 0.8 * k, z - 0.12 * f * k);
      return { hipX: OBST.back, hipZ: z, floor: 0, ...st, turnFrom: Math.PI, turnTo: Math.PI, l: hand(1, -s), r: hand(-1, s), gl: 0.3, gr: 0.3 };
    }
  }
}

// =============================================================================================
// The pull-up bar (its spot right under the bar, facing out of its front).

/** The bar's height and where it is from the spot (just ahead), the grip's half width, the chalk box (to their left, on the post). */
export const BAR = { y: 2.3, z: 0.03, grip: 0.25, chalk: p3(0.37, 1.1, 0.06) };
/** How high the feet hang from the bar: the reach overhead of a body this tall, the arms nearly straight. */
const hangFeet = (k: number) => BAR.y - 1.9 * k;
const PULL: Line = [['chalk', 1.8], ['clap', 0.6], ['reach', 0.5], ['jump', 0.35], ['hang', 0.5], ['reps', 8.4], ['drop', 0.45], ['shake', 1.6], ['rest', 1.4]];
export const PULL_REPS = 6;
export interface PullNow {
  at: At;
  /** How far up the body is (0 hanging … 1 chin over the bar), the rep, a puff of chalk off the hands. */
  up: number;
  rep: number;
  puff: number;
  hanging: boolean;
}
export function pullNow(t: number, ph: number): PullNow {
  const at = lineAt(PULL, t, ph);
  let up = 0;
  let rep = 0;
  if (at.key === 'reps') {
    const v = at.u * PULL_REPS;
    rep = Math.min(PULL_REPS - 1, Math.floor(v));
    const w = v - rep;
    up = w < 0.42 ? sm(w, 0, 0.42) : w < 0.55 ? 1 : 1 - sm(w, 0.55, 1);
  }
  return { at, up, rep, puff: at.key === 'clap' ? Math.sin(Math.PI * at.u) : 0, hanging: at.key === 'jump' || at.key === 'hang' || at.key === 'reps' };
}
function pullPose(t: number, ph: number, k: number): Whole {
  const p = pullNow(t, ph);
  const { at } = p;
  const grip = (s: number) => p3(s * BAR.grip, BAR.y + 0.02, BAR.z);
  const hang = hangFeet(k);
  switch (at.key) {
    case 'chalk': {
      // Hands into the chalk box on the post and rubbed together.
      const dip = at.u < 0.4;
      const c = BAR.chalk;
      const rub = 0.03 * wave(t, 2.4);
      if (dip) return { hipX: 0.08, hipZ: 0, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: pAdd(c, 0.02, 0.02, 0), r: pAdd(c, -0.05, 0.03, 0.02), gl: 0.4, gr: 0.4, nod: 0.35, palms: 1.2 };
      return { hipX: 0.04, hipZ: 0, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: p3(0.03 + rub, 1.08 * k, 0.28 * k), r: p3(-0.03 + rub, 1.1 * k, 0.28 * k), gl: 0.2, gr: 0.2, nod: 0.3, palms: 0.1 };
    }
    case 'clap':
      return { hipX: 0, hipZ: 0, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: p3(0.04 * (1 - Math.abs(wave(t, 3))), 1.12 * k, 0.3 * k), r: p3(-0.04 * (1 - Math.abs(wave(t, 3))), 1.12 * k, 0.3 * k), gl: 0.1, gr: 0.1, nod: 0.1, palms: 0 };
    case 'reach':
      return { hipX: 0, hipZ: 0, floor: 0, from: 'athStand', to: 'athLand', e: sm(at.u, 0, 1), l: p3(BAR.grip, 1.95 * k, 0.05), r: p3(-BAR.grip, 1.95 * k, 0.05), gl: 0.3, gr: 0.3, nod: -0.4 };
    case 'jump': {
      const e = sm(at.u, 0, 1);
      return { hipX: 0, hipZ: 0, floor: Math.max(0, hang) * e, from: 'athLand', to: 'athHang', e, l: grip(1), r: grip(-1), gl: 0.95, gr: 0.95, nod: -0.4 };
    }
    case 'hang':
      return { hipX: 0, hipZ: 0, floor: Math.max(0.02, hang), from: 'athHang', to: 'athHang', e: 0, l: grip(1), r: grip(-1), gl: 1, gr: 1, nod: -0.35 };
    case 'reps':
      return { hipX: 0, hipZ: 0.02 * p.up, floor: Math.max(0.02, hang) + 0.5 * k * p.up, from: 'athHang', to: 'athHangTop', e: p.up, l: grip(1), r: grip(-1), gl: 1, gr: 1, nod: mixN(-0.35, 0.05, p.up) };
    case 'drop': {
      const e = sm(at.u, 0, 1);
      const land = Math.sin(Math.PI * at.u);
      return { hipX: 0, hipZ: 0, floor: Math.max(0.02, hang) * (1 - e), from: 'athHang', to: 'athLand', e: Math.min(1, e + land * 0.3), l: pMix(grip(1), p3(0.25 * k, 1.2 * k, 0.15), e), r: pMix(grip(-1), p3(-0.25 * k, 1.2 * k, 0.15), e), gl: 0.5, gr: 0.5 };
    }
    case 'shake': {
      // The arms shaken out loose by the sides.
      const sh = 0.04 * wave(t, 3.2);
      return { hipX: 0, hipZ: 0, floor: 0, from: 'athLand', to: 'athStand', e: sm(at.u, 0, 0.3), l: p3(0.3 * k + sh, 0.72 * k, 0.05 - sh), r: p3(-0.3 * k - sh, 0.72 * k, 0.05 + sh), gl: 0.1, gr: 0.1, nod: 0.15, palms: 0.6 };
    }
    default: {
      const hip = (s: number) => p3(s * 0.2 * k, 0.94 * k, 0.02);
      return { hipX: 0, hipZ: 0, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: hip(1), r: hip(-1), gl: 0.4, gr: 0.4, nod: -0.3, palms: 1.5 };
    }
  }
}

// =============================================================================================
// The weight rack: a squat rack or a bench press station (which by where it stands: rackKind).

/** The squat rack: its spot under the bar (facing out), the bar on its J-hooks behind the neck. */
export const SQUAT = { hooks: 1.32, hookZ: -0.07, spotZ: 0.04, plateR: 0.22 };
/** The bench: along z, its head end at the back under the uprights; its top; where the hips lie; the uprights' hooks. */
export const BENCH = { top: 0.44, head: -0.55, foot: 0.62, hipZ: 0.12, hooks: 1.02, hookZ: -0.4, lockout: 1.1, chest: 0.66 };
/** Which kind a rack is (the two in the gym alternate), by where its middle is. */
export const rackKind = (p: THREE.Vector3): 'squat' | 'bench' => (((Math.round(p.x) + Math.round(p.z)) % 2) + 2) % 2 === 0 ? 'squat' : 'bench';

export const SQUAT_REPS = 5;
const SQUAT_LINE: Line = [['step', 1.0], ['unrack', 0.7], ['reps', 9.5], ['rerack', 0.7], ['shake', 1.4], ['rest', 2.2]];
export interface SquatNow {
  at: At;
  /** How far down (0 stood … 1 at the bottom), and whether the bar's on the back (or on the hooks). */
  down: number;
  onBack: boolean;
}
export function squatNow(t: number, ph: number): SquatNow {
  const at = lineAt(SQUAT_LINE, t, ph);
  let down = 0;
  if (at.key === 'reps') {
    const w = frac(at.u * SQUAT_REPS);
    down = w < 0.52 ? sm(w, 0, 0.52) : w < 0.6 ? 1 : 1 - sm(w, 0.6, 1);
  }
  if (at.key === 'step') down = 0.12 * sm(at.u, 0.4, 1);
  if (at.key === 'unrack') down = 0.12 * (1 - sm(at.u, 0, 0.6));
  if (at.key === 'rerack') down = 0.12 * Math.sin(Math.PI * at.u);
  return { at, down, onBack: at.key === 'unrack' ? at.u > 0.3 : at.key === 'reps' || (at.key === 'rerack' && at.u < 0.6) };
}
/** Where the bar is (the spot's frame) for a body this tall `down` into the squat: on the upper back, over the middle of the foot. */
export function squatBar(down: number, k: number): P3 {
  const e = sm(down, 0, 1);
  return p3(0, mixN(1.33 * k, 0.93 * k, e), mixN(-0.07, 0.02, e));
}
function squatPose(t: number, ph: number, k: number): Whole {
  const s = squatNow(t, ph);
  const hold = (bar: P3, side: number) => p3(side * 0.42, bar.y + 0.01, bar.z + 0.02);
  if (!s.onBack && (s.at.key === 'shake' || s.at.key === 'rest')) {
    if (s.at.key === 'shake') {
      // Stepped out, the shoulders rolled, the arms shaken loose.
      const sh = 0.04 * wave(t, 2.6);
      return { hipX: 0, hipZ: 0.18, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: p3(0.28 * k + sh, 0.78 * k, 0.22), r: p3(-0.28 * k - sh, 0.78 * k, 0.22), gl: 0.1, gr: 0.1, nod: -0.1 };
    }
    const hip = (sd: number) => p3(sd * 0.2 * k, 0.94 * k, 0.2);
    return { hipX: 0, hipZ: 0.18, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: hip(1), r: hip(-1), gl: 0.4, gr: 0.4, nod: 0.2, palms: 1.5 };
  }
  const bar = s.onBack ? squatBar(s.down, k) : p3(0, SQUAT.hooks + 0.04, SQUAT.hookZ - SQUAT.spotZ);
  const deep = s.at.key === 'reps';
  return {
    hipX: 0,
    hipZ: SQUAT.spotZ - 0.17 * sm(s.down, 0, 1) * (deep ? 1 : 0),
    floor: 0,
    from: 'athStand',
    to: deep ? 'athSquatDown' : 'athSquatDip',
    e: deep ? s.down : s.down / 0.12,
    l: hold(bar, 1),
    r: hold(bar, -1),
    gl: 1,
    gr: 1,
    nod: deep ? -0.25 : 0,
    palms: 0.9,
  };
}

export const BENCH_REPS = 5;
const BENCH_LINE: Line = [['sit', 1.6], ['lie', 1.2], ['grip', 0.8], ['unrack', 0.8], ['reps', 9.0], ['rerack', 0.8], ['sitUp', 1.3], ['rest', 2.2]];
export interface BenchNow {
  at: At;
  /** Where the bar is (the piece's frame along the bench: y up, z along it). */
  bar: { y: number; z: number };
  held: boolean;
}
export function benchNow(t: number, ph: number, k: number): BenchNow {
  const at = lineAt(BENCH_LINE, t, ph);
  const rack = { y: BENCH.hooks + 0.03, z: BENCH.hookZ };
  const lock = { y: BENCH.top + 0.66 * k, z: BENCH.hipZ - 0.3 * k };
  const chest = { y: BENCH.top + 0.22 * k, z: BENCH.hipZ - 0.24 * k };
  let bar = rack;
  let held = false;
  if (at.key === 'unrack') {
    const e = sm(at.u, 0, 1);
    bar = { y: mixN(rack.y, lock.y, e) + 0.05 * Math.sin(Math.PI * e), z: mixN(rack.z, lock.z, e) };
    held = true;
  } else if (at.key === 'reps') {
    const w = frac(at.u * BENCH_REPS);
    const d = w < 0.55 ? sm(w, 0, 0.55) : w < 0.62 ? 1 : 1 - sm(w, 0.62, 1);
    bar = { y: mixN(lock.y, chest.y, d), z: mixN(lock.z, chest.z, d) };
    held = true;
  } else if (at.key === 'rerack') {
    const e = sm(at.u, 0, 1);
    bar = { y: mixN(lock.y, rack.y, e) + 0.05 * Math.sin(Math.PI * e), z: mixN(lock.z, rack.z, e) };
    held = true;
  }
  return { at, bar, held };
}
function benchPose(t: number, ph: number, k: number): Whole {
  const b = benchNow(t, ph, k);
  const { at } = b;
  const onBar = (s: number) => p3(s * 0.4, b.bar.y + 0.01, b.bar.z - BENCH.hipZ);
  // The spot is where the hips lie, facing along the bench to its foot: lying, the bar is behind the head (−z).
  switch (at.key) {
    case 'sit': {
      const knee = (s: number) => p3(s * 0.16 * k, BENCH.top + 0.15 * k, 0.55);
      return { hipX: 0, hipZ: 0.18, floor: 0, from: 'athStand', to: 'athBenchSit', e: sm(at.u, 0, 0.6), l: knee(1), r: knee(-1), gl: 0.4, gr: 0.4, nod: 0.2, palms: 1.2 };
    }
    case 'lie': {
      const e = sm(at.u, 0, 1);
      return { hipX: 0, hipZ: mixN(0.18, 0, e), floor: 0, from: 'athBenchSit', to: 'athBenchLie', e, l: p3(0.3 * k, BENCH.top + 0.12, 0.05), r: p3(-0.3 * k, BENCH.top + 0.12, 0.05), gl: 0.3, gr: 0.3 };
    }
    case 'sitUp': {
      const e = sm(at.u, 0, 1);
      return { hipX: 0, hipZ: mixN(0, 0.18, e), floor: 0, from: 'athBenchLie', to: 'athBenchSit', e, l: p3(0.3 * k, BENCH.top + 0.12, 0.1), r: p3(-0.3 * k, BENCH.top + 0.12, 0.1), gl: 0.3, gr: 0.3 };
    }
    case 'rest': {
      const knee = (s: number) => p3(s * 0.16 * k, BENCH.top + 0.16 * k, 0.55);
      return { hipX: 0, hipZ: 0.18, floor: 0, from: 'athBenchSit', to: 'athBenchSit', e: 0, l: knee(1), r: knee(-1), gl: 0.4, gr: 0.4, nod: 0.35 + 0.05 * wave(t, 0.4), palms: 1.2 };
    }
    default:
      return { hipX: 0, hipZ: 0, floor: 0, from: 'athBenchLie', to: 'athBenchLie', e: 0, l: onBar(1), r: onBar(-1), gl: 1, gr: 1, nod: 0, palms: 1.1 };
  }
}

// =============================================================================================
// The physio table (its spot where the hips lie, facing down the table to its foot).

/** The table's top, its length either way of the hips (the head end at −z). */
export const TABLE = { top: 0.66, head: -0.9, foot: 0.95, hipZ: 0.05 };
const PHYSIO: Line = [['lie', 3.0], ['hamUp', 0.9], ['ham', 3.2], ['hamDown', 0.9], ['kneeUp', 0.9], ['knee', 3.4], ['kneeDown', 0.9], ['calf', 4.2], ['quad', 3.6]];
export interface PhysioNow {
  at: At;
  /** How far the straight leg is lifted (radians up from the table), how far the knee's bent (0 … 1 at 90/90). */
  lift: number;
  bend: number;
}
export function physioNow(t: number, ph: number): PhysioNow {
  const at = lineAt(PHYSIO, t, ph);
  const H = 1.22;
  let lift = 0;
  let bend = 0;
  if (at.key === 'hamUp') lift = H * sm(at.u, 0, 1);
  if (at.key === 'ham') lift = H + 0.08 * Math.max(0, wave(t, 0.3));
  if (at.key === 'hamDown') lift = H * (1 - sm(at.u, 0, 1));
  if (at.key === 'kneeUp') bend = sm(at.u, 0, 1);
  if (at.key === 'knee') bend = 0.75 + 0.25 * (0.5 + 0.5 * Math.cos(at.u * Math.PI * 6));
  if (at.key === 'kneeDown') bend = 1 - sm(at.u, 0, 1);
  return { at, lift, bend };
}
/** Where the left leg is now (the spot's frame; lying on the table): the hip joint, the knee, the heel. */
export function physioLeg(p: PhysioNow, k: number): { hip: P3; knee: P3; heel: P3 } {
  const hip = p3(0.09 * k, TABLE.top + 0.1 * k, 0);
  if (p.bend > 0) {
    const a = mixN(0, 1.45, p.bend);
    const knee = p3(hip.x, hip.y + Math.sin(a) * THIGH * k, Math.cos(a) * THIGH * k);
    const b = a - mixN(0, 1.5, p.bend);
    const heel = p3(hip.x, knee.y + Math.sin(b) * SHIN * k, knee.z + Math.cos(b) * SHIN * k);
    return { hip, knee, heel };
  }
  const a = p.lift;
  const knee = p3(hip.x, hip.y + Math.sin(a) * THIGH * k, Math.cos(a) * THIGH * k);
  const heel = p3(hip.x, hip.y + Math.sin(a) * (THIGH + SHIN) * k, Math.cos(a) * (THIGH + SHIN) * k);
  return { hip, knee, heel };
}
function physioPose(t: number, ph: number, k: number): Whole {
  const p = physioNow(t, ph);
  const { at } = p;
  // The hands: by the sides on the table, or folded on the belly; holding the table's edge for the stretch.
  const side = (s: number) => p3(s * 0.3 * k, TABLE.top + 0.05, -0.05 * k);
  const belly = (s: number) => p3(s * 0.06, TABLE.top + 0.24 * k, -0.18 * k);
  const shut = at.key === 'lie' || at.key === 'calf' || at.key === 'quad';
  let from: AKey = 'athLie';
  let to: AKey = 'athLie';
  let e = 0;
  if (p.lift > 0) [to, e] = ['athHamL', unease(p.lift / 1.22)];
  if (p.bend > 0) [to, e] = ['athKneeL', unease(p.bend)];
  const hold = at.key === 'ham' || at.key === 'hamUp' || at.key === 'hamDown';
  return { hipX: 0, hipZ: 0, floor: TABLE.top, from, to, e, l: hold ? side(1) : belly(1), r: hold ? side(-1) : belly(-1), gl: hold ? 0.8 : 0.3, gr: hold ? 0.8 : 0.3, nod: 0, palms: 1.2, shut };
}

// =============================================================================================
// The ice bath (its spot sat on the tub's floor at one end, facing along it).

export const TUB = { floor: 0.14, water: 0.6 };
const TUB_LINE: Line = [['in', 2.0], ['shiver', 4.0], ['splash', 2.4], ['breathe', 4.6]];
export const tubNow = (t: number, ph: number) => lineAt(TUB_LINE, t, ph);
function tubPose(t: number, ph: number, k: number): Whole {
  const at = tubNow(t, ph);
  const sh = 0.008 * wave(t, 7);
  const shoulder = (s: number) => p3(-s * 0.15 * k + sh, TUB.floor + 0.62 * k, 0.12 * k);
  switch (at.key) {
    case 'in': {
      const e = sm(at.u, 0.2, 1);
      return { hipX: 0, hipZ: 0, floor: TUB.floor, from: 'athTub', to: 'athTubHunch', e, l: p3(0.22 * k, TUB.floor + 0.3 * k, 0.15), r: p3(-0.22 * k, TUB.floor + 0.3 * k, 0.15), gl: 0.4, gr: 0.4, nod: 0.2 };
    }
    case 'shiver':
      // Arms wrapped round, hands on the other shoulder, teeth going.
      return { hipX: 0, hipZ: 0, floor: TUB.floor, from: 'athTubHunch', to: 'athTubHunch', e: 0, l: shoulder(1), r: shoulder(-1), gl: 0.6, gr: 0.6, nod: 0.3 + sh * 3, palms: 0.5 };
    case 'splash': {
      // Water scooped up over the shoulders.
      const w = Math.abs(wave(t, 0.9));
      const hand = (s: number) => p3(s * mixN(0.3, 0.16, w) * k, TUB.floor + mixN(0.38, 0.68, w) * k, mixN(0.35, 0.05, w) * k);
      return { hipX: 0, hipZ: 0, floor: TUB.floor, from: 'athTubHunch', to: 'athTub', e: 0.5, l: hand(1), r: hand(-1), gl: 0.5, gr: 0.5, nod: 0.1, palms: 1.4 };
    }
    default:
      // Sat back, hands resting on the rim, breathing slow, eyes shut.
      return { hipX: 0, hipZ: 0, floor: TUB.floor, from: 'athTubHunch', to: 'athTub', e: sm(at.u, 0, 0.2), l: p3(0.42, 0.78, 0.15), r: p3(-0.42, 0.78, 0.15), gl: 0.6, gr: 0.6, nod: -0.15 + 0.03 * wave(t, 0.2), palms: 1.4, shut: true };
  }
}

// =============================================================================================
// The agility zone (its spot at the ladder's start, facing along it to the little goal).

/** Along the zone: the ladder's rungs, the two cones, the goal's mouth; where the ball waits. */
export const AGIL = { rungs: [-0.1, 0.22, 0.54, 0.86, 1.18], cones: [p3(-0.18, 0, 1.45), p3(0.18, 0, 1.75)], goal: 2.5, back: 2.8, kick: 1.98, ballStart: p3(-0.2, 0.11, 0.25) };
const LADDER: Line = [['ready', 0.8], ['ladder', 2.4], ['weave', 1.4], ['stop', 0.6], ['turn', 0.7], ['jog', 2.2], ['turn2', 0.7]];
const DRILL: Line = [['watch', 3.0], ['ready', 0.8], ['ladder', 4.2], ['stop', 0.8], ['turn', 0.7], ['jog', 2.4], ['turn2', 0.7]];
export const ladderNow = (t: number, ph: number, slow: boolean) => lineAt(slow ? DRILL : LADDER, t, ph);
function ladderPose(t: number, ph: number, k: number, slow: boolean): Whole {
  const at = ladderNow(t, ph, slow);
  const side = (s: number, z: number, y = 0.88) => p3(s * 0.22 * k, y * k, z);
  const end = AGIL.cones[1].z + 0.15;
  switch (at.key) {
    case 'watch':
      // Watching the coach show the footwork: arms folded.
      return { hipX: 0, hipZ: -0.1, floor: 0, from: 'athStand', to: 'athStand', e: 0, l: p3(-0.12 * k, 1.12 * k, 0.16 * k), r: p3(0.12 * k, 1.1 * k, 0.17 * k), gl: 0.5, gr: 0.5, nod: 0.25 };
    case 'ready':
      return { hipX: 0, hipZ: -0.1, floor: 0, from: 'athStand', to: 'athReady', e: sm(at.u, 0, 0.5), l: side(1, 0.1, 0.95), r: side(-1, 0.1, 0.95), gl: 0.6, gr: 0.6, nod: 0.35 };
    case 'ladder': {
      // Two feet in every box, quick and light, the eyes down on the rungs.
      const z = mixN(-0.1, AGIL.rungs[4] + 0.1, at.u);
      const st = stride(at.u * (slow ? 10 : 14), 1, 'athQuickA', 'athQuickB');
      return { hipX: 0.03 * Math.sin(Math.PI * st.e), hipZ: z, floor: 0.015 * Math.sin(Math.PI * st.e), ...st, ...pump(z, st.e, st.from === 'athQuickA', k, 0.5, 0.84), gl: 0.6, gr: 0.6, nod: 0.4 };
    }
    case 'weave': {
      // Side-stepping round the cones.
      const z = mixN(AGIL.rungs[4] + 0.1, end, at.u);
      const x = 0.16 * Math.sin(at.u * Math.PI * 2);
      const st = stride(at.u * 6, 1, 'athShuffle', 'athReady');
      return { hipX: x, hipZ: z, floor: 0.01 * Math.sin(Math.PI * st.e), ...st, l: side(1, z + 0.15, 0.9), r: side(-1, z + 0.15, 0.9), gl: 0.6, gr: 0.6, nod: 0.25 };
    }
    case 'stop': {
      const z = slow ? AGIL.rungs[4] + 0.1 : end;
      const hip = (s: number) => p3(s * 0.2 * k, 0.94 * k, z + 0.02);
      return { hipX: 0, hipZ: z, floor: 0, from: 'athReady', to: 'athStand', e: sm(at.u, 0, 1), l: hip(1), r: hip(-1), gl: 0.4, gr: 0.4, nod: -0.1, palms: 1.5 };
    }
    case 'turn':
    case 'turn2': {
      const back = at.key === 'turn';
      const z = back ? (slow ? AGIL.rungs[4] + 0.1 : end) : -0.1;
      const x = back ? mixN(0, -0.38, sm(at.u, 0, 1)) : mixN(-0.38, 0, sm(at.u, 0, 1));
      return { hipX: x, hipZ: z, floor: 0, from: 'athStand', to: 'athStand', e: 0, turnFrom: back ? 0 : Math.PI, turnTo: back ? Math.PI : 0, l: p3(x + 0.22 * k, 0.8 * k, z), r: p3(x - 0.22 * k, 0.8 * k, z), gl: 0.3, gr: 0.3 };
    }
    default: {
      // Jogged back beside the ladder.
      const z0 = slow ? AGIL.rungs[4] + 0.1 : end;
      const z = mixN(z0, -0.1, at.u);
      const st = stride(z0 - z, 0.7 * k, 'athRunA', 'athRunB');
      const s = Math.cos(Math.PI * st.e) * (st.from === 'athRunA' ? 1 : -1);
      const hand = (sd: number, f: number) => p3(-0.38 - sd * 0.2 * k, 1.0 * k, z - 0.12 * f * k);
      return { hipX: -0.38, hipZ: z, floor: 0.02 * Math.sin(Math.PI * st.e), ...st, turnFrom: Math.PI, turnTo: Math.PI, l: hand(1, -s), r: hand(-1, s), gl: 0.5, gr: 0.5 };
    }
  }
}

const DRIBBLE: Line = [['ready', 0.9], ['dribble', 2.6], ['plant', 0.45], ['shoot', 0.35], ['flight', 0.5], ['celebrate', 1.3], ['turn', 0.7], ['jog', 2.3], ['fetch', 0.9], ['turn2', 0.7]];
export interface DribbleNow {
  at: At;
  /** Where the ball is (the spot's frame), in the net (how far the net's pushed back), or gone into the bag. */
  ball: P3 | null;
  net: number;
}
/** The dribbler's line through the cones: across, by how far along. */
const weaveX = (z: number) => (z < 1.3 ? -0.04 : z > 1.9 ? -0.04 : -0.04 + 0.2 * Math.sin(((z - 1.3) / 0.6) * Math.PI * 2));
export function dribbleNow(t: number, ph: number): DribbleNow {
  const at = lineAt(DRIBBLE, t, ph);
  const kickAt = AGIL.kick;
  const goal = p3(0.12, 0.28, AGIL.goal + 0.2);
  switch (at.key) {
    case 'ready':
      return { at, ball: AGIL.ballStart, net: 0 };
    case 'dribble': {
      // Touched on ahead, rolling out a little and caught up with each stride.
      const z = mixN(0, kickAt - 0.2, at.u);
      const touch = frac(at.u * 7);
      const lead = 0.12 + 0.18 * sm(touch, 0, 0.3) * (1 - sm(touch, 0.4, 1));
      const bz = z + lead + 0.25;
      return { at, ball: p3(weaveX(bz) - 0.12, 0.11, bz), net: 0 };
    }
    case 'plant':
      return { at, ball: p3(weaveX(kickAt) - 0.08, 0.11, kickAt + 0.02), net: 0 };
    case 'shoot':
      return { at, ball: p3(weaveX(kickAt) - 0.08, 0.11, kickAt + 0.02), net: 0 };
    case 'flight': {
      const e = sm(at.u, 0, 0.6);
      const from = p3(weaveX(kickAt) - 0.08, 0.11, kickAt + 0.02);
      const p = pMix(from, goal, e);
      p.y += 0.25 * Math.sin(Math.PI * e);
      return { at, ball: p, net: sm(at.u, 0.5, 0.8) * (1 - sm(at.u, 0.85, 1) * 0.5) };
    }
    case 'celebrate':
    case 'turn':
    case 'jog':
      return { at, ball: p3(goal.x, 0.11, AGIL.goal + 0.18), net: at.key === 'celebrate' ? 0.5 * (1 - at.u) : 0 };
    case 'fetch':
      return { at, ball: at.u < 0.5 ? null : AGIL.ballStart, net: 0 };
    default:
      return { at, ball: AGIL.ballStart, net: 0 };
  }
}
function dribblePose(t: number, ph: number, k: number): Whole {
  const d = dribbleNow(t, ph);
  const { at } = d;
  const kickAt = AGIL.kick;
  switch (at.key) {
    case 'ready':
      return { hipX: 0, hipZ: 0, floor: 0, from: 'athStand', to: 'athReady', e: sm(at.u, 0, 0.6), l: p3(0.25 * k, 0.9 * k, 0.1), r: p3(-0.25 * k, 0.9 * k, 0.1), gl: 0.4, gr: 0.4, nod: 0.45 };
    case 'dribble': {
      const z = mixN(0, kickAt - 0.2, at.u);
      const st = stride(at.u * 7, 1, 'athRunA', 'athRunB');
      return { hipX: weaveX(z + 0.2), hipZ: z, floor: 0.015 * Math.sin(Math.PI * st.e), ...st, ...pump(z, st.e, st.from === 'athRunA', k, 0.5), gl: 0.4, gr: 0.4, nod: 0.4 };
    }
    case 'plant': {
      const z = mixN(kickAt - 0.2, kickAt - 0.3, at.u);
      return { hipX: weaveX(kickAt), hipZ: z, floor: 0, from: 'athRunA', to: 'athKickBack', e: sm(at.u, 0, 1), l: p3(0.45 * k, 1.05 * k, z + 0.1), r: p3(-0.3 * k, 0.95 * k, z - 0.1), gl: 0.3, gr: 0.3, nod: 0.45 };
    }
    case 'shoot':
    case 'flight': {
      const z = kickAt - 0.28;
      const e = at.key === 'shoot' ? sm(at.u, 0, 1) : 1;
      return { hipX: weaveX(kickAt), hipZ: z, floor: 0, from: 'athKickBack', to: 'athKick', e, l: p3(0.45 * k, 1.05 * k, z + 0.15), r: p3(-0.35 * k, 1.0 * k, z - 0.05), gl: 0.3, gr: 0.3, nod: at.key === 'flight' ? -0.05 : 0.35 };
    }
    case 'celebrate': {
      // Both fists up.
      const up = Math.sin(Math.PI * Math.min(1, at.u * 1.3));
      const z = kickAt - 0.28;
      return { hipX: weaveX(kickAt), hipZ: z, floor: 0.06 * Math.max(0, Math.sin(at.u * Math.PI * 2)), from: 'athKick', to: 'athStand', e: sm(at.u, 0, 0.3), l: p3(0.22 * k, mixN(1.0, 1.85, up) * k, z + 0.1), r: p3(-0.22 * k, mixN(1.0, 1.85, up) * k, z + 0.1), gl: 1, gr: 1, nod: -0.3 };
    }
    case 'turn':
    case 'turn2': {
      const back = at.key === 'turn';
      const z = back ? kickAt - 0.28 : 0;
      const x = back ? mixN(weaveX(kickAt), -0.4, sm(at.u, 0, 1)) : mixN(-0.4, 0, sm(at.u, 0, 1));
      return { hipX: x, hipZ: z, floor: 0, from: 'athStand', to: 'athStand', e: 0, turnFrom: back ? 0 : Math.PI, turnTo: back ? Math.PI : 0, l: p3(x + 0.22 * k, 0.8 * k, z), r: p3(x - 0.22 * k, 0.8 * k, z), gl: 0.3, gr: 0.3 };
    }
    case 'fetch': {
      // A new ball out of the bag at the start (on their right, the course's front).
      const dip = Math.sin(Math.PI * at.u);
      return { hipX: -0.2, hipZ: 0, floor: 0, from: 'athStand', to: 'athKnees', e: dip * 0.7, l: p3(0.1, mixN(0.8, 0.5, dip) * k, 0.2), r: p3(-0.38, mixN(0.8, 0.25, dip) * k, 0.12), gl: 0.4, gr: 0.6, nod: 0.5 };
    }
    default: {
      const z0 = kickAt - 0.28;
      const z = mixN(z0, 0, at.u);
      const st = stride(z0 - z, 0.7 * k, 'athRunA', 'athRunB');
      const s = Math.cos(Math.PI * st.e) * (st.from === 'athRunA' ? 1 : -1);
      const hand = (sd: number, f: number) => p3(-0.4 - sd * 0.2 * k, 1.0 * k, z - 0.12 * f * k);
      return { hipX: -0.4, hipZ: z, floor: 0.02 * Math.sin(Math.PI * st.e), ...st, turnFrom: Math.PI, turnTo: Math.PI, l: hand(1, -s), r: hand(-1, s), gl: 0.5, gr: 0.5 };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Posing them.

function wholeOf(m: AthPoseMotion, t: number, ph: number, k: number): Whole {
  switch (m) {
    case 'athSprint':
      return sprintPose(t, ph, k);
    case 'athObstacle':
      return obstaclePose(t, ph, k);
    case 'athPullUp':
      return pullPose(t, ph, k);
    case 'athSquat':
      return squatPose(t, ph, k);
    case 'athBench':
      return benchPose(t, ph, k);
    case 'athPhysio':
      return physioPose(t, ph, k);
    case 'athIceBath':
      return tubPose(t, ph, k);
    case 'athLadder':
      return ladderPose(t, ph, k, false);
    case 'athDrill':
      return ladderPose(t, ph, k, true);
    default:
      return dribblePose(t, ph, k);
  }
}
/** The clock offset of a spot (where its marker is). */
export const spotPhase = (s: Spot) => athPhase(s.at.getWorldPosition(new THREE.Vector3()));

/** A whole-body motion at a spot: the pose (one of ours in the spot's frame) and the hands. */
export function athPose(m: AthPoseMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const at = spot.at;
  at.updateWorldMatrix(true, false);
  const origin = at.getWorldPosition(new THREE.Vector3());
  const face = new THREE.Vector3(0, 0, 1).transformDirection(at.matrixWorld);
  const yaw = Math.atan2(face.x, face.z);
  const W = (p: P3) => at.localToWorld(new THREE.Vector3(p.x, p.y, p.z));
  const k = height / 1.6;
  const w = wholeOf(m, t, athPhase(origin), k);
  const pose: BodyPose = {
    kind: 'asana',
    at: W(p3(w.hipX, 0, w.hipZ)),
    yaw,
    floor: origin.y + w.floor,
    from: { key: w.from as AsanaKey, turn: w.turnFrom ?? 0 },
    to: { key: w.to as AsanaKey, turn: w.turnTo ?? w.turnFrom ?? 0 },
    e: w.e,
  };
  const doing: Doing = { reach: { l: w.l && W(w.l), r: w.r && W(w.r), grip: { l: w.gl ?? 0.3, r: w.gr ?? 0.3 }, nod: w.nod ?? 0.1, palms: w.palms ?? 0.5 } };
  if (w.shut) doing.shut = true;
  return { pose, doing };
}

// =============================================================================================
// The hand motions (the body's frame: +x their left, y up from the feet, +z ahead).

export interface Hands {
  l: P3;
  r: P3;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
  tap?: boolean;
}
type Part = Partial<Hands> & { l: P3; r: P3 };
const hands = (h: Part): Hands => ({ lean: 0, nod: 0.2, palms: 0.4, gl: 0.3, gr: 0.3, crouch: 0, ...h });
function mixHands(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  return {
    l: pMix(a.l, b.l, e),
    r: pMix(a.r, b.r, e),
    lean: mixN(a.lean, b.lean, e),
    nod: mixN(a.nod, b.nod, e),
    palms: mixN(a.palms, b.palms, e),
    gl: mixN(a.gl, b.gl, e),
    gr: mixN(a.gr, b.gr, e),
    crouch: mixN(a.crouch, b.crouch, e),
    tap: e < 0.5 ? a.tap : b.tap,
  };
}
/** Each step's hands, eased into from the last step's over its first `ease` seconds-worth of it. */
function eased(line: Line, at: At, key: (k: string, u: number) => Hands, ease = 0.18): Hands {
  const now = key(at.key, at.u);
  const d = line[at.i][1];
  const v = clamp01((at.u * d) / Math.max(0.05, ease * 2.5));
  if (v >= 1) return now;
  return mixHands(key(at.prev, 1), now, sm(v, 0, 1));
}
const atSide = (s: number, k: number) => p3(s * 0.22 * k, 0.78 * k, 0.06);
const chest = (k: number, x = 0, up = 1.12, ahead = 0.28) => p3(x, up * k, ahead * k);
const scribble = (p: P3, t: number, w = 0.04) => p3(p.x + w * wave(t, 0.7), p.y + 0.012 * wave(t, 1.9), p.z + 0.004 * wave(t, 6));

// ---------------------------------------------------------------------------------------------
// The tactics board (its face `face` ahead of the spot; points on it as the board has them: across
// from its middle (+ to the board's right as you face it… so the body's -x), up from the floor).

export const BOARD = { face: 0.5, x0: -0.72, x1: 0.72, y0: 0.95, y1: 1.75, tray: 0.88, plays: -0.2, scout: 0.25, face0: 0.06 };
/** A point on the board's face (bx across, + the board's right as you face it; by up) in the body's frame of a spot square in front of it at `spotX` across. */
export const onBoard = (bx: number, by: number, off = 0.02, spotX: number = BOARD.plays) => p3(-(bx - spotX), by, BOARD.face - off);
/** The three plays shown round by round: which red magnet moves, from where to where, and the run drawn after it. */
export const PLAYS: Array<{ from: [number, number]; to: [number, number]; arrow: Array<[number, number]> }> = [
  { from: [-0.4, 1.22], to: [-0.12, 1.42], arrow: [[-0.12, 1.42], [0.04, 1.5], [0.2, 1.42]] },
  { from: [-0.3, 1.56], to: [-0.05, 1.62], arrow: [[-0.05, 1.62], [0.12, 1.56], [0.24, 1.38]] },
  { from: [-0.44, 1.06], to: [-0.16, 1.1], arrow: [[-0.16, 1.1], [0.02, 1.18], [0.18, 1.3]] },
];
export const playOf = (n: number) => PLAYS[((n % PLAYS.length) + PLAYS.length) % PLAYS.length];
/** Along a drawn run: the point `s` (0–1) of the way. */
export function alongRun(pts: Array<[number, number]>, s: number): [number, number] {
  const seg = pts.length - 1;
  const v = clamp01(s) * seg;
  const i = Math.min(seg - 1, Math.floor(v));
  const e = v - i;
  return [mixN(pts[i][0], pts[i + 1][0], e), mixN(pts[i][1], pts[i + 1][1], e)];
}
const PLAYS_LINE: Line = [['think', 1.6], ['pick', 0.7], ['slide', 1.3], ['marker', 0.6], ['draw', 2.0], ['tap', 1.1], ['wipe', 1.5], ['back', 1.0]];
export interface PlaysNow {
  at: At;
  /** Where the round's magnet is now (board), how much of the run is drawn (0–1), the marker in the hand. */
  magnet: [number, number];
  drawn: number;
  marker: boolean;
  eraser: boolean;
}
export function playsNow(t: number, ph: number): PlaysNow {
  const at = lineAt(PLAYS_LINE, t, ph);
  const p = playOf(at.n);
  let magnet = p.from;
  let drawn = 0;
  const k = at.key;
  if (k === 'slide') magnet = [mixN(p.from[0], p.to[0], sm(at.u, 0.1, 0.9)), mixN(p.from[1], p.to[1], sm(at.u, 0.1, 0.9))];
  if (k === 'marker' || k === 'draw' || k === 'tap' || k === 'wipe') magnet = p.to;
  if (k === 'back') magnet = [mixN(p.to[0], p.from[0], sm(at.u, 0.1, 0.8)), mixN(p.to[1], p.from[1], sm(at.u, 0.1, 0.8))];
  if (k === 'draw') drawn = at.u;
  if (k === 'tap') drawn = 1;
  if (k === 'wipe') drawn = 1 - sm(at.u, 0.1, 0.9);
  return { at, magnet, drawn, marker: k === 'marker' ? at.u > 0.5 : k === 'draw' || k === 'tap', eraser: k === 'wipe' };
}
function playsHands(t: number, ph: number, k: number): Hands {
  const s = playsNow(t, ph);
  const p = playOf(s.at.n);
  const key = (key: string, u: number): Hands => {
    switch (key) {
      case 'think':
        return hands({ l: p3(0.0, 1.06 * k, 0.2 * k), r: p3(-0.02, 1.42 * k, 0.17 * k), gl: 0.5, gr: 0.6, nod: -0.05, palms: 0.2 });
      case 'pick':
        return hands({ l: atSide(1, k), r: onBoard(p.from[0], p.from[1], 0.03), gr: 0.7, nod: 0.05, palms: 1.2 });
      case 'slide': {
        const m = [mixN(p.from[0], p.to[0], sm(u, 0.1, 0.9)), mixN(p.from[1], p.to[1], sm(u, 0.1, 0.9))];
        return hands({ l: atSide(1, k), r: onBoard(m[0], m[1], 0.03), gr: 0.7, nod: 0.05, palms: 1.2 });
      }
      case 'marker':
        return hands({ l: atSide(1, k), r: onBoard(0.1, BOARD.tray + 0.02, 0.06), gr: 0.8, nod: 0.35, palms: 1.0 });
      case 'draw': {
        const [x, y] = alongRun(p.arrow, u);
        return hands({ l: atSide(1, k), r: onBoard(x, y, 0.025), gr: 0.9, nod: 0.05, palms: 1.2 });
      }
      case 'tap': {
        const [x, y] = p.arrow[p.arrow.length - 1];
        const tap = Math.max(0, wave(t, 2.2));
        return hands({ l: atSide(1, k), r: onBoard(x, y, 0.025 + 0.04 * tap), gr: 0.9, nod: 0, palms: 1.2 });
      }
      case 'wipe': {
        const [x, y] = alongRun(p.arrow, 0.5);
        return hands({ l: onBoard(x + 0.1 * wave(t, 1.4), y + 0.04 * wave(t, 2.8), 0.04), r: atSide(-1, k), gl: 0.8, nod: 0.05, palms: 1.3 });
      }
      default: {
        const m = [mixN(p.to[0], p.from[0], sm(u, 0.1, 0.8)), mixN(p.to[1], p.from[1], sm(u, 0.1, 0.8))];
        return hands({ l: atSide(1, k), r: onBoard(m[0], m[1], 0.03), gr: 0.7, nod: 0.05, palms: 1.2 });
      }
    }
  };
  return eased(PLAYS_LINE, s.at, key);
}

/** Scouting the opponent: their formation on a tablet, blue magnets set out to match, notes in the margin. */
export const SCOUT = { magnets: [[0.42, 1.2], [0.38, 1.5], [0.2, 1.35], [0.3, 1.64], [0.25, 1.06]] as Array<[number, number]>, notes: [0.5, 1.7] as [number, number], tray: 0.62 };
const SCOUT_LINE: Line = [['tablet', 2.0], ['place', 1.4], ['compare', 1.4], ['note', 2.2], ['swipe', 1.4]];
export interface ScoutNow {
  at: At;
  /** How many blue magnets are up (the round's one going on in the hand), how many lines of notes are written. */
  placed: number;
  inHand: [number, number] | null;
  lines: number;
}
export function scoutNow(t: number, ph: number): ScoutNow {
  const at = lineAt(SCOUT_LINE, t, ph);
  const j = ((at.n % 5) + 5) % 5;
  const placed = j + (at.i > 1 ? 1 : 0);
  let inHand: [number, number] | null = null;
  if (at.key === 'place') {
    const m = SCOUT.magnets[j];
    inHand = [mixN(SCOUT.tray, m[0], sm(at.u, 0.1, 0.85)), mixN(BOARD.tray + 0.04, m[1], sm(at.u, 0.1, 0.85))];
  }
  return { at, placed, inHand, lines: j + (at.key === 'note' ? at.u : at.i > 3 ? 1 : 0) };
}
function scoutHands(t: number, ph: number, k: number): Hands {
  const s = scoutNow(t, ph);
  const tab = p3(0.12, 1.12 * k, 0.3 * k);
  const key = (key: string, u: number): Hands => {
    switch (key) {
      case 'tablet':
        return hands({ l: tab, r: p3(0.03 + 0.04 * wave(t, 0.8), 1.15 * k, 0.33 * k), gl: 0.7, gr: 0.4, nod: 0.45, palms: 1.0, tap: true });
      case 'place': {
        const j = ((s.at.n % 5) + 5) % 5;
        const m = SCOUT.magnets[j];
        const at = [mixN(SCOUT.tray, m[0], sm(u, 0.1, 0.85)), mixN(BOARD.tray + 0.04, m[1], sm(u, 0.1, 0.85))];
        return hands({ l: tab, r: onBoard(at[0], at[1], 0.03, BOARD.scout), gl: 0.7, gr: 0.7, nod: 0.1, palms: 1.2 });
      }
      case 'compare':
        return hands({ l: pAdd(tab, 0.02, 0.06, 0.02), r: onBoard(0.3, 1.35, 0.12, BOARD.scout), gl: 0.7, gr: 0.4, nod: u < 0.5 ? 0.45 : 0.0, palms: 0.6 });
      case 'note': {
        const [x, y] = SCOUT.notes;
        const line = Math.min(4, Math.floor(s.lines));
        return hands({ l: tab, r: scribble(onBoard(x + 0.08 * u, y - 0.07 * line, 0.025, BOARD.scout), t, 0.02), gl: 0.7, gr: 0.9, nod: 0.05, palms: 1.2 });
      }
      default:
        return hands({ l: tab, r: p3(0.12 - 0.12 * frac(u * 2), 1.15 * k, 0.33 * k), gl: 0.7, gr: 0.4, nod: 0.45, palms: 1.0 });
    }
  };
  return eased(SCOUT_LINE, s.at, key);
}

/**
 * The team talk: stood at the board's end facing the players on their bench (+z), the marker pointed
 * back at the board on their right, then the hands opened out to the room, a fist up (화이팅!), a clap.
 */
export const TALK = { spotX: 0.98, spotZ: 0.55, yaw: -1.0 };
const TALK_LINE: Line = [['point', 2.2], ['explain', 2.4], ['point2', 1.6], ['fist', 1.3], ['clap', 1.3]];
export const talkNow = (t: number, ph: number) => lineAt(TALK_LINE, t, ph);
function talkHands(t: number, ph: number, k: number): Hands {
  const at = talkNow(t, ph);
  // The board from the spot (turned to the players): to their right and behind.
  const c = Math.cos(TALK.yaw);
  const sn = Math.sin(TALK.yaw);
  const board = (bx: number, by: number) => {
    const dx = bx - TALK.spotX;
    const dz = BOARD.face0 - TALK.spotZ;
    return p3(dx * c - dz * sn, by, dx * sn + dz * c);
  };
  const key = (key: string, u: number): Hands => {
    switch (key) {
      case 'point':
        return hands({ l: p3(0.2 * k, 0.92 * k, 0.12), r: pMix(board(0.55, 1.4), board(0.6, 1.3), 0.5 + 0.5 * wave(t, 0.6)), gr: 0.9, nod: 0.05, palms: 0.4 });
      case 'point2':
        return hands({ l: p3(0.2 * k, 0.92 * k, 0.12), r: board(0.62, 1.55), gr: 0.9, nod: 0.05, palms: 0.4, tap: u > 0.3 });
      case 'explain': {
        const w = 0.5 + 0.5 * wave(t, 0.7);
        return hands({ l: p3(mixN(0.25, 0.42, w) * k, 1.1 * k, 0.35 * k), r: p3(-mixN(0.25, 0.42, 1 - w) * k, 1.1 * k, 0.35 * k), gl: 0.1, gr: 0.1, palms: 0.2, nod: -0.05 });
      }
      case 'fist': {
        const up = Math.sin(Math.PI * Math.min(1, u * 1.4));
        return hands({ l: p3(0.2 * k, 0.92 * k, 0.12), r: p3(-0.2 * k, mixN(1.15, 1.75, up) * k, 0.18 * k), gr: 1, nod: -0.15, palms: 0.4 });
      }
      default: {
        const c = Math.abs(wave(t, 2.2));
        return hands({ l: p3(0.03 + 0.06 * c, 1.15 * k, 0.32 * k), r: p3(-0.03 - 0.06 * c, 1.15 * k, 0.32 * k), gl: 0.1, gr: 0.1, palms: 0, nod: -0.05 });
      }
    }
  };
  return eased(TALK_LINE, at, key);
}

// ---------------------------------------------------------------------------------------------
// The weight rack, someone else lifting: a junior's heavy set spotted, a member's programme on the clipboard.

/** The spotter's place: behind the squatter in the rack, at the head of the bench behind the bar. */
export const SPOTTER = { squat: p3(0, 0, -0.52), bench: p3(0, 0, -0.78) };
/** A lifter's height (the NPCs drawn in the rack). */
export const LIFTER_K = 1;
function spotSquatHands(t: number, ph: number, k: number): Hands {
  // The lifter squats in front (z ahead, by the spot's facing +z of the piece): the hands follow the bar down, under it.
  const s = squatNow(t, ph);
  const bar = s.onBack ? squatBar(s.down, LIFTER_K) : p3(0, SQUAT.hooks + 0.04, SQUAT.hookZ);
  const z = SQUAT.spotZ + bar.z - SPOTTER.squat.z;
  const by = (side: number) => p3(side * 0.26, bar.y - 0.12, z - 0.05);
  const deep = s.at.key === 'reps' ? s.down : 0;
  if (!s.onBack) return hands({ l: p3(0.18 * k, 1.02 * k, 0.22), r: p3(-0.18 * k, 1.02 * k, 0.22), gl: 0.3, gr: 0.3, nod: 0.1, palms: 0.4 });
  return hands({ l: by(1), r: by(-1), gl: 0.15, gr: 0.15, palms: 1.5, nod: 0.25, lean: 0.15 + 0.3 * deep, crouch: 0.45 * deep });
}
function spotBenchHands(t: number, ph: number, k: number): Hands {
  const b = benchNow(t, ph, LIFTER_K);
  const z = b.bar.z - SPOTTER.bench.z;
  if (!b.held) return hands({ l: p3(0.2 * k, 0.94 * k, 0.05), r: p3(-0.2 * k, 0.94 * k, 0.05), gl: 0.4, gr: 0.4, palms: 1.5, nod: 0.3 });
  // Hands open just under the bar, inside the lifter's grip, ready.
  const by = (side: number) => p3(side * 0.18, b.bar.y - 0.06, z);
  return hands({ l: by(1), r: by(-1), gl: 0.15, gr: 0.15, palms: -0.2, nod: 0.5, lean: 0.25, crouch: b.bar.y < 0.8 ? 0.15 : 0 });
}
const PROGRAM_LINE: Line = [['watch', 2.4], ['write', 2.6], ['cue', 1.8], ['write2', 1.6], ['point', 1.4]];
export const programNow = (t: number, ph: number) => lineAt(PROGRAM_LINE, t, ph);
function programHands(t: number, ph: number, k: number): Hands {
  const at = programNow(t, ph);
  const board = chest(k, 0.08, 1.08, 0.3);
  const key = (key: string): Hands => {
    switch (key) {
      case 'watch':
        return hands({ l: board, r: p3(-0.02, 1.4 * k, 0.17 * k), gl: 0.7, gr: 0.6, nod: 0.1, palms: 0.4 });
      case 'write':
      case 'write2':
        return hands({ l: board, r: scribble(pAdd(board, -0.08, 0.04, 0.03), t), gl: 0.7, gr: 0.9, nod: 0.55, palms: 1.2 });
      case 'cue': {
        // "무릎은 바깥으로": the free hand out, palm down, pressed outward.
        const w = 0.5 + 0.5 * wave(t, 0.9);
        return hands({ l: board, r: p3(-mixN(0.2, 0.42, w) * k, 0.98 * k, 0.4 * k), gl: 0.7, gr: 0.1, nod: 0.1, palms: 1.4 });
      }
      default:
        return hands({ l: board, r: p3(-0.15 * k, 1.25 * k, 0.55 * k), gl: 0.7, gr: 0.8, nod: 0.05, palms: 0.4 });
    }
  };
  return eased(PROGRAM_LINE, at, (k2) => key(k2));
}

// ---------------------------------------------------------------------------------------------
// The water station: bottles filled one by one from the jug's tap; a cup of the ion drink.

/** In the body's frame of the spot in front: the jug's tap, the bottle carrier's slots (2 × 3), the cup stack, the bin. */
export const WATER = {
  tap: p3(0.12, 0.98, 0.3),
  slot: (j: number) => p3(-0.2 + (j % 3) * 0.08 - 0.08, 0.55, 0.26 + Math.floor(j / 3) * 0.08),
  cups: p3(-0.24, 1.12, 0.3),
  drinkTap: p3(-0.1, 0.98, 0.3),
};
export const BOTTLES = 6;
const FILL_LINE: Line = [['take', 0.9], ['fill', 2.0], ['cap', 0.8], ['put', 0.9]];
export interface FillNow {
  at: At;
  /** The bottle in hand (its slot), how many are full, whether the tap's running. */
  j: number;
  full: number;
  inHand: boolean;
  flowing: boolean;
  level: number;
}
export function fillNow(t: number, ph: number): FillNow {
  const at = lineAt(FILL_LINE, t, ph);
  const j = ((at.n % BOTTLES) + BOTTLES) % BOTTLES;
  const inHand = (at.key === 'take' && at.u > 0.45) || at.key === 'fill' || at.key === 'cap' || (at.key === 'put' && at.u < 0.6);
  const level = at.key === 'fill' ? sm(at.u, 0.1, 0.9) : at.key === 'take' ? 0 : 1;
  return { at, j, full: j, inHand, flowing: at.key === 'fill' && at.u > 0.1 && at.u < 0.9, level };
}
function fillHands(t: number, ph: number, k: number): Hands {
  const f = fillNow(t, ph);
  const slot = WATER.slot(f.j);
  const under = pAdd(WATER.tap, 0, -0.14, 0.02);
  const key = (key: string, u: number): Hands => {
    switch (key) {
      case 'take':
        return hands({ l: p3(0.2 * k, 0.9 * k, 0.15), r: pAdd(slot, 0, 0.1 + 0.08 * sm(u, 0.5, 1), 0), gr: 0.8, nod: 0.6, lean: 0.25, crouch: 0.25 });
      case 'fill':
        return hands({ l: pAdd(WATER.tap, 0.02, 0.02, -0.01), r: under, gl: 0.6, gr: 0.85, nod: 0.45, lean: 0.15, palms: 1.0 });
      case 'cap':
        return hands({ l: chest(k, 0.04, 1.02, 0.28), r: chest(k, -0.02, 0.94, 0.27), gl: 0.8, gr: 0.85, nod: 0.45, palms: 0.4 + 0.3 * wave(t, 2.5) });
      default:
        return hands({ l: p3(0.2 * k, 0.9 * k, 0.15), r: pAdd(slot, 0, 0.1 + 0.08 * (1 - sm(u, 0, 0.6)), 0), gr: 0.8, nod: 0.6, lean: 0.25, crouch: 0.25 });
    }
  };
  return eased(FILL_LINE, f.at, key);
}
const DRINK_LINE: Line = [['cup', 1.0], ['pour', 1.6], ['drink', 2.4], ['toss', 0.9], ['wipe', 1.0]];
export interface DrinkNow {
  at: At;
  /** The cup in hand, how full, how far tipped to the mouth. */
  cup: boolean;
  level: number;
  tip: number;
  flowing: boolean;
}
export function drinkNow(t: number, ph: number): DrinkNow {
  const at = lineAt(DRINK_LINE, t, ph);
  const tip = at.key === 'drink' ? Math.sin(Math.PI * clamp01(at.u * 1.1)) : 0;
  const level = at.key === 'pour' ? sm(at.u, 0.1, 0.9) : at.key === 'drink' ? 1 - sm(at.u, 0.1, 0.9) : at.key === 'cup' ? 0 : 0;
  return { at, cup: (at.key === 'cup' && at.u > 0.4) || at.key === 'pour' || at.key === 'drink' || (at.key === 'toss' && at.u < 0.5), level, tip, flowing: at.key === 'pour' && at.u > 0.1 && at.u < 0.9 };
}
function drinkHands(t: number, ph: number, k: number): Hands {
  const d = drinkNow(t, ph);
  const key = (key: string, u: number): Hands => {
    switch (key) {
      case 'cup':
        return hands({ l: p3(0.2 * k, 0.9 * k, 0.15), r: pAdd(WATER.cups, 0, -0.04 * sm(u, 0.4, 1), 0), gr: 0.6, nod: 0.3 });
      case 'pour':
        return hands({ l: pAdd(WATER.drinkTap, 0.02, 0.03, -0.01), r: pAdd(WATER.drinkTap, 0, -0.13, 0.02), gl: 0.6, gr: 0.7, nod: 0.4, lean: 0.12, palms: 1.0 });
      case 'drink':
        return hands({ l: p3(0.2 * k, 0.9 * k, 0.12), r: p3(-0.03, mixN(1.15, 1.42, d.tip) * k, mixN(0.28, 0.1, d.tip) * k), gr: 0.7, nod: mixN(0.1, -0.4, d.tip), palms: 0.3 });
      case 'toss':
        return hands({ l: p3(0.2 * k, 0.9 * k, 0.12), r: p3(-0.32 * k, mixN(1.0, 0.75, u), 0.25), gr: u < 0.5 ? 0.8 : 0.1, nod: 0.3 });
      default:
        return hands({ l: p3(0.2 * k, 0.9 * k, 0.12), r: p3(-0.06 + 0.06 * wave(t, 1.4), 1.36 * k, 0.12 * k), gr: 0.4, nod: -0.1, palms: 1.0 });
    }
  };
  return eased(DRINK_LINE, d.at, key);
}

// ---------------------------------------------------------------------------------------------
// The lockers: a clean shirt out of the laundry basket hung in its locker, the boots lined up.

/** The four lockers' middles across (the body's frame, in front of them), the hook's height, the boot shelf; the basket on their left. */
export const LOCKERS = { across: [0.75, 0.25, -0.25, -0.75], hook: 1.48, boots: 0.3, face: 0.42, basket: p3(0.95, 0.35, 0.2) };
const TIDY_LINE: Line = [['basket', 1.2], ['carry', 0.8], ['hang', 1.2], ['smooth', 1.2], ['boots', 1.6], ['look', 0.8]];
export interface TidyNow {
  at: At;
  /** Which locker this round, whether its shirt's in the hand (or hung), its boots straightened yet. */
  j: number;
  inHand: boolean;
  hung: boolean;
  bootsTidy: boolean;
}
export function tidyNow(t: number, ph: number): TidyNow {
  const at = lineAt(TIDY_LINE, t, ph);
  const j = ((at.n % 4) + 4) % 4;
  return { at, j, inHand: (at.key === 'basket' && at.u > 0.5) || at.key === 'carry' || (at.key === 'hang' && at.u < 0.6), hung: at.i > 2 || (at.key === 'hang' && at.u >= 0.6), bootsTidy: at.i > 4 || (at.key === 'boots' && at.u > 0.6) };
}
function tidyHands(t: number, ph: number, k: number): Hands {
  const s = tidyNow(t, ph);
  const x = LOCKERS.across[s.j];
  const key = (key: string, u: number): Hands => {
    switch (key) {
      case 'basket':
        return hands({ l: pAdd(LOCKERS.basket, 0.06, 0.08, 0), r: pAdd(LOCKERS.basket, -0.08, 0.08 + 0.2 * sm(u, 0.5, 1), 0), gl: 0.6, gr: 0.6, nod: 0.6, lean: 0.4, crouch: 0.35 });
      case 'carry':
        return hands({ l: chest(k, 0.12, 1.05, 0.28), r: chest(k, -0.12, 1.05, 0.28), gl: 0.7, gr: 0.7, nod: 0.3 });
      case 'hang':
        return hands({ l: p3(x + 0.12, LOCKERS.hook - 0.05, LOCKERS.face + 0.1), r: p3(x - 0.12, LOCKERS.hook - 0.05, LOCKERS.face + 0.1), gl: 0.7, gr: 0.7, nod: -0.1, palms: 1.0, lean: 0.15 });
      case 'smooth': {
        const w = 0.5 + 0.5 * wave(t, 1.2);
        return hands({ l: p3(x + 0.1, mixN(1.38, 1.05, w), LOCKERS.face + 0.1), r: p3(x - 0.1, mixN(1.38, 1.05, w), LOCKERS.face + 0.1), gl: 0.1, gr: 0.1, nod: 0.1, palms: 1.4, lean: 0.2 });
      }
      case 'boots':
        return hands({ l: p3(x + 0.1, LOCKERS.boots + 0.06, LOCKERS.face + 0.12), r: p3(x - 0.08 + 0.03 * wave(t, 1.1), LOCKERS.boots + 0.06, LOCKERS.face + 0.12), gl: 0.6, gr: 0.6, nod: 0.7, lean: 0.45, crouch: 0.75 });
      default:
        return hands({ l: p3(0.2 * k, 0.94 * k, 0.05), r: p3(-0.2 * k, 0.94 * k, 0.05), gl: 0.4, gr: 0.4, palms: 1.5, nod: 0.05 });
    }
  };
  return eased(TIDY_LINE, s.at, key);
}

// ---------------------------------------------------------------------------------------------
// The team bus's luggage bay: the kit bags off the kerb and shoved in.

/** The bag on the ground to their left, the bay's mouth ahead (its floor's height, how deep in). */
export const BAY = { bag: p3(0.42, 0.14, 0.18), mouth: p3(0, 0.5, 0.42), deep: 0.45 };
const LOAD_LINE: Line = [['bend', 1.0], ['lift', 0.7], ['swing', 0.9], ['shove', 1.1], ['back', 0.8]];
export interface LoadNow {
  at: At;
  /** The bag in hand (where, the body's frame), and how many are in the bay this round of three. */
  bag: P3 | null;
  loaded: number;
}
export function loadNow(t: number, ph: number, k: number): LoadNow {
  const at = lineAt(LOAD_LINE, t, ph);
  const j = ((at.n % 3) + 3) % 3;
  let bag: P3 | null = null;
  if (at.key === 'bend') bag = at.u > 0.6 ? BAY.bag : null;
  if (at.key === 'lift') bag = pMix(BAY.bag, p3(0.2, 0.8 * k, 0.3), sm(at.u, 0, 1));
  if (at.key === 'swing') bag = pMix(p3(0.2, 0.8 * k, 0.3), pAdd(BAY.mouth, 0, 0.12, 0), sm(at.u, 0, 1));
  if (at.key === 'shove') bag = pAdd(BAY.mouth, 0, 0.12, BAY.deep * sm(at.u, 0, 0.8));
  return { at, bag, loaded: j + (at.i >= 3 && !(at.key === 'shove' && at.u < 0.8) ? 1 : 0) };
}
function loadHands(t: number, ph: number, k: number): Hands {
  const s = loadNow(t, ph, k);
  const key = (key: string, u: number): Hands => {
    switch (key) {
      case 'bend':
        return hands({ l: pAdd(BAY.bag, 0.08, 0.12, 0), r: pAdd(BAY.bag, -0.08, 0.12, 0), gl: 0.9, gr: 0.9, nod: 0.6, lean: 0.45, crouch: 0.5 });
      case 'lift': {
        const b = pMix(BAY.bag, p3(0.2, 0.8 * k, 0.3), sm(u, 0, 1));
        return hands({ l: pAdd(b, 0.08, 0.12, 0), r: pAdd(b, -0.08, 0.12, 0), gl: 0.9, gr: 0.9, nod: 0.3, lean: 0.2 });
      }
      case 'swing': {
        const b = pMix(p3(0.2, 0.8 * k, 0.3), pAdd(BAY.mouth, 0, 0.12, 0), sm(u, 0, 1));
        return hands({ l: pAdd(b, 0.1, 0.1, -0.05), r: pAdd(b, -0.1, 0.1, -0.05), gl: 0.9, gr: 0.9, nod: 0.3, lean: 0.25 });
      }
      case 'shove': {
        const z = BAY.deep * sm(u, 0, 0.8);
        return hands({ l: pAdd(BAY.mouth, 0.1, 0.18, Math.min(0.32, z - 0.1)), r: pAdd(BAY.mouth, -0.1, 0.18, Math.min(0.32, z - 0.1)), gl: 0.2, gr: 0.2, palms: 1.2, nod: 0.4, lean: 0.5, crouch: 0.35 });
      }
      default:
        return hands({ l: p3(0.2 * k, 0.9 * k, 0.1), r: p3(-0.1, 1.3 * k, 0.12), gl: 0.3, gr: 0.5, nod: 0.1, palms: 0.6 });
    }
  };
  return eased(LOAD_LINE, s.at, key);
}

/** The hands for a hand motion, worked out by the clock of the spot (its feet's place). */
export function athHands(m: AthHandMotion, t: number, ph: number, k: number): Hands {
  switch (m) {
    case 'athPlays':
      return playsHands(t, ph, k);
    case 'athScout':
      return scoutHands(t, ph, k);
    case 'athTeamTalk':
      return talkHands(t, ph, k);
    case 'athSpotSquat':
      return spotSquatHands(t, ph, k);
    case 'athSpotBench':
      return spotBenchHands(t, ph, k);
    case 'athProgram':
      return programHands(t, ph, k);
    case 'athFill':
      return fillHands(t, ph, k);
    case 'athDrink':
      return drinkHands(t, ph, k);
    case 'athTidy':
      return tidyHands(t, ph, k);
    default:
      return loadHands(t, ph, k);
  }
}

/** A dweller doing one of the hand motions: worked out in their own frame from where they stand. */
export function athDoing(m: AthMotion, b: BodyAt, _work: Work | null, t: number): Doing {
  if (ATH_POSES.has(m)) return {};
  const k = b.height / 1.6;
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const W = (p: P3) => b.base.clone().addScaledVector(left, p.x).addScaledVector(fwd, p.z).setY(b.base.y + p.y);
  const h = athHands(m as AthHandMotion, t, athPhase(b.base), k);
  return {
    reach: { l: W(h.l), r: W(h.r), lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap },
    crouch: h.crouch || undefined,
  };
}
