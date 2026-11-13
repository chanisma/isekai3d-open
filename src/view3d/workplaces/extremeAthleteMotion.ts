import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';
import { ASANAS, type Asana, type AsanaKey } from '../asana';
import type { BodyPose } from '../avatar';
import type { Spot } from '../parts';

/*
 * At the 익스트림 스포츠 센터 (2026-10-27 workplace pipeline, at the user's request: the sports should
 * look like the sports). Two kinds of motion live here, kept out of activity.ts (which only hands them
 * over) so this imports nothing from it at run time:
 *
 * - Whole-body ones (EXTREME_POSES), posed like the yoga studio's asanas (avatar.ts 'asana' pose,
 *   bones turned and the body set down on what it's on) with poses of their own added to asana.ts's
 *   table at load: up the climbing wall hold by hold and lowered off on the rope, a bouldering
 *   traverse dropped off onto the mat, riding the mini halfpipe with an air at one coping and a stall
 *   on the other, bouncing on the trampoline into a tuck jump and a back flip. Each is worked out in
 *   the frame of its spot (Spot.at: its +z the way the dweller faces, +x their left), so the pieces
 *   (workplaces/extremeAthlete.ts) draw the holds, the rope, the board and the bed from the same
 *   numbers and move them by the same clock (xPhase of the spot).
 * - Hand ones (EXTREME_MOTIONS) at the gear bench, the rental counter and the replay screen, given as
 *   offsets (BarOffset: to the dweller's left, up, away from them) from where they work.
 */
export type ExtremePoseMotion = 'xClimb' | 'xLead' | 'xBoulder' | 'xSkate' | 'xBounce';
export type ExtremeHandMotion = 'xPack' | 'xCoil' | 'xGearCheck' | 'xRental' | 'xReplay';
export type ExtremeMotion = ExtremePoseMotion | ExtremeHandMotion;
export const EXTREME_POSES = new Set<string>(['xClimb', 'xLead', 'xBoulder', 'xSkate', 'xBounce']);
export const EXTREME_MOTIONS = new Set<string>(['xPack', 'xCoil', 'xGearCheck', 'xRental', 'xReplay', ...EXTREME_POSES]);

export const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
export const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
export const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const numMix = (a: number, b: number, e: number) => a + (b - a) * e;
const sstep = THREE.MathUtils.smoothstep;
const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
const frac = (x: number) => ((x % 1) + 1) % 1;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** Eased along keys [u, value]: held before the first and after the last. */
function keyed<T>(keys: Array<[number, T]>, u: number, mix: (a: T, b: T, e: number) => T): T {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}
/** The clock offset of a place (from where its spot is), so two walls or two benches aren't in step. */
export const xPhase = (p: THREE.Vector3) => frac(p.x * 0.291 + p.z * 0.557);
/**
 * avatar.ts eases the blend between two asanas (smoothstep); a blend that has to track something
 * (the tilt on the ramp) is handed the inverse, so what shows is what's asked for.
 */
const unease = (y: number) => {
  const v = clamp01(y);
  return 0.5 - Math.sin(Math.asin(1 - 2 * v) / 3);
};

// ---------------------------------------------------------------------------------------------
// The poses, added to asana.ts's table (model units; +x the body's left; a leg's angles from where
// its foot is, below and ahead of the hip, the knee turned out by `splay`).

type E3 = [number, number, number];
type Bones = Asana['bones'];
const THIGH = 0.42;
const SHIN = 0.4;
/** The two-bone reach of a leg (as avatar.ts legReach) to a foot `dy` below and `dz` ahead of the hip: thigh, knee, ankle (the sole flat). */
function legAngles(dy: number, dz: number): [number, number, number] {
  const d = THREE.MathUtils.clamp(Math.hypot(dy, dz), Math.abs(THIGH - SHIN) + 0.01, THIGH + SHIN - 0.001);
  const toFoot = Math.atan2(dz, dy);
  const lift = Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1));
  const bend = Math.PI - Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN), -1, 1));
  const up = toFoot + lift;
  return [-up, bend, up - bend];
}
/** Both legs: each [dy, dz, splay] (the knee out), and how far the sole's turned from flat (+ the toes down). */
function legs(l: [number, number, number], r: [number, number, number], soleL = 0, soleR = soleL): Bones {
  const [lu, lk, lf] = legAngles(l[0], l[1]);
  const [ru, rk, rf] = legAngles(r[0], r[1]);
  return {
    leftUpperLeg: [lu, 0, l[2]], rightUpperLeg: [ru, 0, -r[2]],
    leftLowerLeg: [lk, 0, 0], rightLowerLeg: [rk, 0, 0],
    leftFoot: [lf + soleL, 0, -l[2] * 0.6], rightFoot: [rf + soleR, 0, r[2] * 0.6],
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
const ARMS_UP: Bones = { leftUpperArm: [3.134, 0, -1.405], rightUpperArm: [3.134, 0, 1.405], leftLowerArm: [0.109, 0, 0], rightLowerArm: [0.109, 0, 0] };
const ARMS_DOWN: Bones = { leftUpperArm: [0, 0, -1.25], rightUpperArm: [0, 0, 1.25], leftLowerArm: [0, -0.15, 0], rightLowerArm: [0, 0.15, 0], leftHand: [0, 0, -0.1], rightHand: [0, 0, 0.1] };
const ARMS_OUT: Bones = { leftUpperArm: [0, 0, -0.55], rightUpperArm: [0, 0, 0.55], leftLowerArm: [0, -0.3, 0], rightLowerArm: [0, 0.3, 0] };
const ARMS_HUG: Bones = { leftUpperArm: [-1.1, 0, -1.15], rightUpperArm: [-1.1, 0, 1.15], leftLowerArm: [0, -1.25, 0], rightLowerArm: [0, 1.25, 0] };
const STRAIGHT: Bones = { leftUpperLeg: [-0.016, 0, 0.004], rightUpperLeg: [-0.016, 0, -0.004], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.019, 0, -0.004], rightFoot: [-0.019, 0, 0.004] };

/** On the wall, the left foot up on a hold by the hip (the knee turned out, frog-like), the right low and nearly straight, the hips in, looking up. */
const climbA: Bones = { ...legs([0.35, 0.3, 0.95], [0.72, 0.2, 0.22]), spine: [0.08, 0, 0], chest: [0.04, 0, 0], neck: [-0.3, 0, 0], head: [-0.2, 0, 0], ...ARMS_UP };
/** Sat back in the harness, lowered off: the legs out to the wall, the soles flat on it, leant back, looking down past the feet. */
const lower: Bones = { ...legs([0.15, 0.68, 0.16], [0.15, 0.68, 0.16], -Math.PI / 2), spine: [-0.16, 0, 0], chest: [-0.1, 0, 0], neck: [0.22, 0, 0], head: [0.12, 0, 0], ...ARMS_UP };
/** Landed off a boulder problem: a deep squat, knees out, arms forward. */
const land: Bones = { ...legs([0.42, 0.12, 0.3], [0.42, 0.12, 0.3]), spine: [0.35, 0, 0], chest: [0.15, 0, 0], neck: [-0.25, 0, 0], head: [-0.1, 0, 0], leftUpperArm: [-0.9, 0, -1.15], rightUpperArm: [-0.9, 0, 1.15], leftLowerArm: [0, -0.4, 0], rightLowerArm: [0, 0.4, 0] };
/** Stood at the foot of it, looking up the route. */
const stand: Bones = { ...STRAIGHT, neck: [-0.12, 0, 0], head: [-0.1, 0, 0], ...ARMS_DOWN };
/** On the board side on: feet a shoulder's width apart along it, knees bent, a little forward, arms out. */
const skate: Bones = { ...legs([0.66, 0.04, 0.24], [0.66, 0.04, 0.24]), spine: [0.12, 0, 0], chest: [0.05, 0, 0], neck: [-0.05, 0, 0], ...ARMS_OUT };
/** The knees pulled up for an air, the board under the feet. */
const tuckSkate: Bones = { ...legs([0.42, 0.16, 0.3], [0.42, 0.16, 0.3]), spine: [0.3, 0, 0], chest: [0.1, 0, 0], neck: [-0.15, 0, 0], ...ARMS_OUT };
/** Sinking into the bed: the knees giving. */
const bounceSquat: Bones = { ...legs([0.66, 0.12, 0.06], [0.66, 0.12, 0.06]), spine: [0.2, 0, 0], neck: [-0.1, 0, 0], ...ARMS_DOWN };
/** Knees to the chest, the arms round the shins. */
const tuck: Bones = { ...legs([0.24, 0.3, 0.1], [0.24, 0.3, 0.1], 0.6), spine: [0.45, 0, 0], chest: [0.25, 0, 0], neck: [0.15, 0, 0], ...ARMS_HUG };
/** The tilt allowed on the ramp's walls (its poses are written at ±this), radians. */
export const TILT = 1.2;
const X_ASANAS: Record<string, Asana> = {
  xStand: { hip: [0, 0.9, 0], bones: stand },
  xClimbA: { hip: [0, 0.8, 0], bones: climbA },
  xClimbB: { hip: [0, 0.8, 0], bones: mirror(climbA) },
  xLower: { hip: [0, 0.3, 0], bones: lower },
  xLand: { hip: [0, 0.5, 0], bones: land },
  xSkate: { hip: [0, 0.8, 0], bones: skate },
  xSkateR: { hip: [0, 0.8, 0], bones: { ...skate, hips: [0, 0, TILT] } },
  xSkateL: { hip: [0, 0.8, 0], bones: { ...skate, hips: [0, 0, -TILT] } },
  xTuckM: { hip: [0, 0.6, 0], bones: { ...tuckSkate, hips: [0, 0, TILT * 0.5] } },
  xBounce: { hip: [0, 0.9, 0], bones: { ...STRAIGHT, ...ARMS_DOWN } },
  xBounceSquat: { hip: [0, 0.8, 0], bones: bounceSquat },
  xTuck0: { hip: [0, 0.5, 0], bones: tuck },
  xFlip1: { hip: [0, 0.5, 0], bones: { ...tuck, hips: [-Math.PI / 2, 0, 0] } },
  xFlip2: { hip: [0, 0.5, 0], bones: { ...tuck, hips: [Math.PI, 0, 0] } },
  xFlip3: { hip: [0, 0.5, 0], bones: { ...tuck, hips: [Math.PI / 2, 0, 0] } },
};
Object.assign(ASANAS, X_ASANAS);
type XKey = keyof typeof X_ASANAS;
const step = (key: XKey) => ({ key: key as AsanaKey, turn: 0 });

/** A point in a spot's frame (+x the dweller's left, +z the way they face). */
export interface P3 {
  x: number;
  y: number;
  z: number;
}
const p3 = (x: number, y: number, z: number): P3 => ({ x, y, z });
const pMix = (a: P3, b: P3, e: number): P3 => p3(numMix(a.x, b.x, e), numMix(a.y, b.y, e), numMix(a.z, b.z, e));

// ---------------------------------------------------------------------------------------------
// The climbing wall: a top-rope route and a lead route, the same moves.

/**
 * A route as its spot has it: the wall's face at z = 0 (the climber faces +z, into it), the floor at
 * y = 0. Hand holds `gap` apart up the route from `hand0` (the left hand on the even ones, a little to
 * the left), foot holds `gap` apart from the floor; `levels` moves to the top. The climber's hips are
 * `hip` off the face on the wall, `stand` at its foot, `lower` sat back in the harness.
 */
export const ROUTE = { gap: 0.32, hand0: 1.24, levels: 3, hip: 0.27, stand: 0.52, lower: 0.66, anchor: 2.9 };
const JIT = [0.03, -0.02, 0.04, -0.035, 0.015, -0.01];
export function handHold(j: number, lead = false): P3 {
  const side = j % 2 === 0 ? 1 : -1;
  return p3(side * 0.19 + JIT[(j + (lead ? 3 : 0)) % 6], ROUTE.hand0 + ROUTE.gap * j, -0.045);
}
export function footHold(j: number, lead = false): P3 {
  const side = j % 2 === 1 ? 1 : -1;
  return p3(side * 0.24 + JIT[(j + (lead ? 1 : 4)) % 6] * 0.6, ROUTE.gap * j, -0.035);
}
/** The lead route's quickdraws, one clipped after each move, and the top anchor. */
export const quickdraw = (m: number): P3 => p3(-0.07, ROUTE.gap * (m + 1) + 1.12, -0.02);
export const ANCHOR = p3(0, ROUTE.anchor, -0.03);
/** Where the rope comes down to: the belay device on its floor anchor, to the climber's right. */
export const BELAY = p3(-0.5, 0.22, -0.16);

const CL = { chalk: 3, mount: 1.2, move: 2.4, clip: 1.1, top: 1.6, lower: 5, land: 1.4, untie: 2 };
const climbKey = (m: number): XKey => (m % 2 === 0 ? 'xClimbA' : 'xClimbB');

export interface ClimbState {
  hipX: number;
  hipZ: number;
  /** How high the feet are (the lowest of them), off the floor. */
  floor: number;
  from: XKey;
  to: XKey;
  e: number;
  l: P3;
  r: P3;
  gl: number;
  gr: number;
  nod: number;
  palms: number;
  /** The front of the harness (the rope's tie-in). */
  harness: P3;
  /** On the lead route: quickdraws clipped so far, the top anchor clipped, the rope pulled up in a hand to clip. */
  clipped: number;
  anchored: boolean;
  ropeIn?: 'l' | 'r';
  /** On the rope at all (not yet tied in at the bottom, or untied). */
  tied: boolean;
}

/** Up the route hold by hold, the top, lowered off on the rope, untied, chalked and again (~22 s; the lead route clips as it goes). */
export function climbRound(t: number, phase: number, lead: boolean, k: number): ClimbState {
  const M = ROUTE.levels;
  const T = CL.chalk + CL.mount + M * (CL.move + (lead ? CL.clip : 0)) + CL.top + CL.lower + CL.land + CL.untie;
  let u = frac(t / T + phase) * T;
  const zS = -ROUTE.stand;
  const zW = -ROUTE.hip;
  const chest = (z: number, f: number) => p3(0, f + 1.15 * k, z + 0.22);
  const harnessAt = (x: number, f: number, z: number, h: number) => p3(x, f + h * k, z + 0.14);
  const base: Omit<ClimbState, 'l' | 'r' | 'harness'> = { hipX: 0, hipZ: zS, floor: 0, from: 'xStand', to: 'xStand', e: 0, gl: 0.4, gr: 0.4, nod: -0.2, palms: 0.4, clipped: 0, anchored: false, tied: true };
  // Chalking up at the foot of it: a hand into the bag at the back of the waist, the other, then rubbed together; a look up the route.
  if (u < CL.chalk) {
    const v = u / CL.chalk;
    const bag = p3(0.02, 0.95 * k, zS - 0.14);
    const side = (s: number) => p3(s * 0.24, 0.72 * k, zS + 0.04);
    const rub = (s: number) => p3(s * 0.03 + 0.03 * wave(t, 3), 1.12 * k, zS + 0.22);
    const l = keyed<P3>([[0.3, side(1)], [0.36, bag], [0.5, bag], [0.56, rub(1)], [0.85, rub(1)], [0.95, side(1)]], v, pMix);
    const r = keyed<P3>([[0.02, side(-1)], [0.08, bag], [0.24, bag], [0.32, side(-1)], [0.5, side(-1)], [0.56, rub(-1)], [0.85, rub(-1)], [0.95, side(-1)]], v, pMix);
    return { ...base, l, r, nod: v > 0.86 ? -0.4 : 0.25, harness: harnessAt(0, 0, zS, 0.92), tied: v > 0.5 };
  }
  u -= CL.chalk;
  // Hands up to the first two holds, a foot onto the wall.
  if (u < CL.mount) {
    const e = sstep(u, 0, CL.mount);
    const z = numMix(zS, zW, e);
    return { ...base, hipZ: z, from: 'xStand', to: climbKey(0), e, l: pMix(chest(zS, 0), handHold(0, lead), sstep(u, 0, CL.mount * 0.7)), r: pMix(chest(zS, 0), handHold(1, lead), sstep(u, CL.mount * 0.2, CL.mount)), gl: 0.85, gr: 0.85, nod: -0.35, harness: harnessAt(0, 0, z, numMix(0.92, 0.8, e)) };
  }
  u -= CL.mount;
  // The moves: the lower hand reaches past the other to the next hold up, then the body steps up after it.
  for (let m = 0; m < M; m++) {
    if (u < CL.move) {
      const reach = sstep(u, 0, CL.move * 0.35);
      const rise = sstep(u, CL.move * 0.3, CL.move * 0.8);
      const moving = m % 2 === 0 ? 'l' : 'r';
      const from = handHold(m, lead);
      const to = handHold(m + 2, lead);
      const hand = pMix(from, to, reach);
      hand.z -= 0.13 * Math.sin(Math.PI * reach);
      hand.y += 0.05 * Math.sin(Math.PI * reach);
      const still = handHold(m + 1, lead);
      const f = ROUTE.gap * (m + rise);
      const hipX = 0.05 * (moving === 'l' ? 1 : -1) * Math.sin(Math.PI * clamp01(u / (CL.move * 0.8)));
      return { ...base, hipX, hipZ: zW, floor: f, from: climbKey(m), to: climbKey(m + 1), e: rise, l: moving === 'l' ? hand : still, r: moving === 'r' ? hand : still, gl: moving === 'l' ? 0.4 + 0.5 * (1 - Math.sin(Math.PI * reach)) : 0.9, gr: moving === 'r' ? 0.4 + 0.5 * (1 - Math.sin(Math.PI * reach)) : 0.9, nod: reach < 1 ? -0.4 : -0.22, palms: 0.5, clipped: m, harness: harnessAt(hipX, f, zW, 0.8) };
    }
    u -= CL.move;
    if (lead) {
      // Clipping: the lower hand lets go, pulls up the rope from the harness and pushes it into the quickdraw by the chest.
      if (u < CL.clip) {
        const f = ROUTE.gap * (m + 1);
        const hand = (m + 1) % 2 === 0 ? 'l' : 'r';
        const hold = handHold(m + 1, lead);
        const tie = harnessAt(0, f, zW, 0.8);
        const qd = quickdraw(m);
        const v = u / CL.clip;
        const p = keyed<P3>([[0.0, hold], [0.25, p3(tie.x, tie.y + 0.02, tie.z - 0.06)], [0.55, p3(qd.x, qd.y - 0.08, qd.z - 0.1)], [0.72, p3(qd.x, qd.y - 0.1, qd.z - 0.05)], [1, hold]], v, pMix);
        const other = handHold(m + 2, lead);
        const ropeIn = v > 0.25 && v < 0.72 ? hand : undefined;
        return { ...base, hipZ: zW, floor: f, from: climbKey(m + 1), to: climbKey(m + 1), e: 0, l: hand === 'l' ? p : other, r: hand === 'r' ? p : other, gl: hand === 'l' ? 0.7 : 0.9, gr: hand === 'r' ? 0.7 : 0.9, nod: v > 0.3 && v < 0.75 ? 0.2 : -0.2, palms: 0.6, clipped: m + (v > 0.68 ? 1 : 0), ropeIn, harness: tie };
      }
      u -= CL.clip;
    }
  }
  const fTop = ROUTE.gap * M;
  const done = lead ? M : 0;
  // The top: matched on the last hold (top rope) or the anchor clipped (lead), then 'take!' — a look down to the floor.
  if (u < CL.top) {
    const v = u / CL.top;
    const lowHand = M % 2 === 0 ? 'l' : 'r';
    const topHold = handHold(M + 1, lead);
    const low = handHold(M, lead);
    const goal = lead ? p3(ANCHOR.x + (lowHand === 'l' ? 0.05 : -0.05), ANCHOR.y - 0.24, ANCHOR.z - 0.08) : p3(topHold.x + (lowHand === 'l' ? 0.07 : -0.07), topHold.y, topHold.z);
    const p = keyed<P3>([[0.05, low], [0.4, goal]], v, pMix);
    return { ...base, hipZ: zW, floor: fTop, from: climbKey(M), to: climbKey(M), e: 0, l: lowHand === 'l' ? p : topHold, r: lowHand === 'r' ? p : topHold, gl: 0.9, gr: 0.9, nod: v < 0.6 ? -0.45 : 0.35, palms: 0.5, clipped: done, anchored: lead && v > 0.38, harness: harnessAt(0, fTop, zW, 0.8) };
  }
  u -= CL.top;
  // Lowered off: sat back in the harness, the feet walking down the wall in little hops, both hands on the rope.
  if (u < CL.lower) {
    const v = u / CL.lower;
    const sit = sstep(v, 0, 0.18);
    const hop = Math.max(0, Math.sin(Math.PI * clamp01((v - 0.15) / 0.85) * 4));
    const z = numMix(zW, -ROUTE.lower, sstep(v, 0, 0.11)) - 0.1 * hop * sit;
    const hipY = numMix(fTop + 0.8 * k, 0.48 * k, sstep(v, 0.12, 1));
    const f = numMix(fTop, hipY - 0.24 * k, sit);
    const rope = (dy: number) => p3(0.02, hipY + dy * k, z + 0.3);
    const topHold = handHold(M + 1, lead);
    const l = pMix(topHold, rope(0.62), sstep(v, 0.02, 0.16));
    const r = pMix(handHold(M, lead), rope(0.44), sstep(v, 0, 0.14));
    return { ...base, hipZ: z, floor: f, from: climbKey(M), to: 'xLower', e: sit, l, r, gl: 0.9, gr: 0.9, nod: 0.3, palms: 0.3, clipped: done, anchored: lead, harness: p3(0, hipY + 0.05 * k, z + 0.16) };
  }
  u -= CL.lower;
  // Feet down on the floor, stood up off the rope.
  if (u < CL.land) {
    const e = sstep(u, 0, CL.land);
    const z = numMix(-ROUTE.lower, zS, e);
    const hipY = numMix(0.48 * k, 0.92 * k, e);
    const rope = (dy: number) => p3(0.02, hipY + dy * k, z + 0.3);
    return { ...base, hipZ: z, floor: numMix(0.24 * k, 0, e), from: 'xLower', to: 'xStand', e, l: rope(0.5), r: rope(0.34), gl: 0.9, gr: 0.9, nod: 0.15, palms: 0.3, clipped: done, anchored: lead, harness: p3(0, hipY, z + 0.14) };
  }
  u -= CL.land;
  // Untying the figure-eight at the harness, then the arms shaken out.
  const v = u / CL.untie;
  const knot = (s: number) => p3(s * 0.05 + 0.02 * wave(t, 2.4, s * 0.25), 0.95 * k, zS + 0.2);
  const shake = (s: number) => p3(s * 0.28, 0.7 * k + 0.03 * wave(t, 6, s * 0.25), zS + 0.02);
  return { ...base, l: v < 0.55 ? knot(1) : shake(1), r: v < 0.55 ? knot(-1) : shake(-1), gl: v < 0.55 ? 0.7 : 0.15, gr: v < 0.55 ? 0.7 : 0.15, nod: v < 0.55 ? 0.45 : 0, clipped: done, anchored: lead, tied: v < 0.55, harness: harnessAt(0, 0, zS, 0.92) };
}

// ---------------------------------------------------------------------------------------------
// The bouldering wall: a traverse to the right, matched on the top hold, dropped off onto the mat.

/**
 * The bouldering wall as its spot has it: the mat's top `mat` up, the wall's face at z = 0 at the foot
 * leaning out over the climber by `lean` (radians) above `mat`; hand holds along the problem from
 * the left to the top hold on the right.
 */
export const BOULDER = { mat: 0.3, lean: 0.1, hip: 0.28, stand: 0.62, stances: 4 };
/** Where the wall's face is (how far out over the mat) at a height. */
export const boulderFace = (y: number) => -Math.max(0, y - BOULDER.mat) * Math.tan(BOULDER.lean);
export function boulderHold(j: number): P3 {
  const y = BOULDER.mat + 1.36 + 0.11 * j + (j === BOULDER.stances + 1 ? 0.1 : 0);
  return p3(0.78 - 0.31 * j, y, boulderFace(y) - 0.045);
}
export function boulderFoot(j: number): P3 {
  const y = BOULDER.mat + 0.2 + 0.11 * j;
  return p3(0.72 - 0.31 * j + (j % 2 ? 0.08 : -0.08), y, boulderFace(y) - 0.035);
}
const BD = { chalk: 2.2, mount: 1.0, stance: 2.2, top: 1.3, drop: 0.45, land: 0.8, rise: 1.0, back: 0.8 };
export interface BoulderState {
  hipX: number;
  hipZ: number;
  floor: number;
  from: XKey;
  to: XKey;
  e: number;
  l?: P3;
  r?: P3;
  gl: number;
  gr: number;
  nod: number;
  /** How hard the mat's squashed under the landing (0–1), and where (x). */
  squash: number;
  landX: number;
}
const BD_T = BD.chalk + BD.mount + BOULDER.stances * BD.stance + BD.top + BD.drop + BD.land + BD.rise + BD.back;
const swapKey = (k: XKey): XKey => (k === 'xClimbA' ? 'xClimbB' : k === 'xClimbB' ? 'xClimbA' : k);
const flipX = (p?: P3) => p && p3(-p.x, p.y, p.z);
/**
 * The traverse to the right on the green problem, dropped off at its end; the next round the blue
 * problem (the same moves the other way round) back to the left from where they landed, and so on.
 */
export function boulderRound(t: number, phase: number, k: number): BoulderState {
  const s = boulderOneWay(t, phase, k);
  if (Math.floor(t / BD_T + phase) % 2 === 0) return s;
  return { ...s, hipX: -s.hipX, l: flipX(s.r), r: flipX(s.l), gl: s.gr, gr: s.gl, from: swapKey(s.from), to: swapKey(s.to), landX: -s.landX };
}
function boulderOneWay(t: number, phase: number, k: number): BoulderState {
  const N = BOULDER.stances;
  const T = BD_T;
  let u = frac(t / T + phase) * T;
  const mat = BOULDER.mat;
  // The hips off the face as far as puts the feet on it (it leans out further up).
  const hipFace = (f: number) => boulderFace(f + 0.15) - BOULDER.hip;
  const stanceX = (n: number) => (boulderHold(n).x + boulderHold(n + 1).x) / 2;
  const stanceF = (n: number) => mat + 0.11 * n + (n > 0 ? 0.14 : 0);
  const zS = -BOULDER.stand;
  const x0 = stanceX(0);
  const base: BoulderState = { hipX: x0, hipZ: zS, floor: mat, from: 'xStand', to: 'xStand', e: 0, gl: 0.4, gr: 0.4, nod: -0.25, squash: 0, landX: 0 };
  if (u < BD.chalk) {
    const v = u / BD.chalk;
    const bag = p3(x0 + 0.02, mat + 0.95 * k, zS - 0.14);
    const side = (s: number) => p3(x0 + s * 0.24, mat + 0.72 * k, zS + 0.04);
    const rub = (s: number) => p3(x0 + s * 0.03 + 0.03 * wave(t, 3), mat + 1.12 * k, zS + 0.22);
    const l = keyed<P3>([[0.1, side(1)], [0.2, bag], [0.32, bag], [0.42, rub(1)], [0.8, rub(1)], [0.92, side(1)]], v, pMix);
    const r = keyed<P3>([[0.1, side(-1)], [0.2, bag], [0.32, bag], [0.42, rub(-1)], [0.8, rub(-1)], [0.92, side(-1)]], v, pMix);
    return { ...base, l, r, nod: v > 0.82 ? -0.45 : 0.2 };
  }
  u -= BD.chalk;
  if (u < BD.mount) {
    const e = sstep(u, 0, BD.mount);
    const from = p3(x0, mat + 1.1 * k, zS + 0.22);
    return { ...base, hipZ: numMix(zS, hipFace(stanceF(0)), e), floor: numMix(mat, stanceF(0), e), from: 'xStand', to: climbKey(0), e, l: pMix(from, boulderHold(0), sstep(u, 0, BD.mount * 0.7)), r: pMix(from, boulderHold(1), sstep(u, BD.mount * 0.2, BD.mount)), gl: 0.85, gr: 0.85, nod: -0.3 };
  }
  u -= BD.mount;
  // Each stance: the right hand out to the next hold, the hips across after it, the left hand following onto the hold it left.
  for (let n = 0; n < N; n++) {
    if (u < BD.stance) {
      const a = sstep(u, 0, BD.stance * 0.35);
      const shift = sstep(u, BD.stance * 0.28, BD.stance * 0.7);
      const b = sstep(u, BD.stance * 0.6, BD.stance * 0.95);
      const arc = (p: P3, s: number) => p3(p.x, p.y + 0.04 * Math.sin(Math.PI * s), p.z - 0.12 * Math.sin(Math.PI * s));
      const r = arc(pMix(boulderHold(n + 1), boulderHold(n + 2), a), a);
      const l = arc(pMix(boulderHold(n), boulderHold(n + 1), b), b);
      const f = numMix(stanceF(n), stanceF(n + 1), shift);
      return { ...base, hipX: numMix(stanceX(n), stanceX(n + 1), shift), hipZ: hipFace(f), floor: f, from: climbKey(n), to: climbKey(n + 1), e: shift, l, r, gl: 0.45 + 0.45 * (1 - Math.sin(Math.PI * b)), gr: 0.45 + 0.45 * (1 - Math.sin(Math.PI * a)), nod: a < 1 ? -0.35 : -0.2 };
    }
    u -= BD.stance;
  }
  const fTop = stanceF(N);
  const top = boulderHold(N + 1);
  const xTop = stanceX(N);
  // Matched on the top hold (both hands on it), a breath.
  if (u < BD.top) {
    const v = u / BD.top;
    const l = pMix(boulderHold(N), p3(top.x + 0.07, top.y, top.z), sstep(v, 0.05, 0.45));
    return { ...base, hipX: xTop, hipZ: hipFace(fTop), floor: fTop, from: climbKey(N), to: climbKey(N), e: 0, l, r: p3(top.x - 0.06, top.y, top.z), gl: 0.95, gr: 0.95, nod: v > 0.6 ? 0.3 : -0.4 };
  }
  u -= BD.top;
  // Let go: dropped feet first onto the mat into a squat.
  const landX = xTop;
  if (u < BD.drop) {
    const v = u / BD.drop;
    const f = numMix(fTop, mat, v * v);
    return { ...base, hipX: landX, hipZ: numMix(hipFace(fTop), hipFace(fTop) - 0.12, v), floor: f, from: climbKey(N), to: 'xLand', e: sstep(v, 0.2, 1), l: p3(top.x + 0.1, top.y - 0.25 * v, top.z - 0.15 * v), r: p3(top.x - 0.12, top.y - 0.25 * v, top.z - 0.15 * v), gl: 0.2, gr: 0.2, nod: 0.3, squash: 0, landX };
  }
  u -= BD.drop;
  const zLand = hipFace(fTop) - 0.12;
  if (u < BD.land) {
    const v = u / BD.land;
    return { ...base, hipX: landX, hipZ: zLand, floor: mat - 0.06 * Math.sin(Math.PI * clamp01(v * 2)), from: 'xLand', to: 'xLand', e: 0, gl: 0.3, gr: 0.3, nod: 0.25, squash: Math.sin(Math.PI * clamp01(v * 1.6)), landX };
  }
  u -= BD.land;
  if (u < BD.rise) {
    const e = sstep(u, 0, BD.rise);
    return { ...base, hipX: landX, hipZ: zLand, floor: mat, from: 'xLand', to: 'xStand', e, nod: numMix(0.25, -0.3, e), landX };
  }
  u -= BD.rise;
  // Back off the wall where they landed, the start of the other problem (back the other way).
  const e = sstep(u, 0, BD.back);
  return { ...base, hipX: numMix(landX, -x0, e), hipZ: numMix(zLand, zS, e), floor: mat, nod: -0.3, landX };
}

// ---------------------------------------------------------------------------------------------
// The mini halfpipe.

/**
 * The ramp as its spot has it (the middle of its flat, +x along it to the rider's left, the rider
 * facing +z side on): a flat bottom `flat` either side of the middle, transitions of radius `R` up to
 * the coping at `end` and `H` high, then the decks to `half`; `width` across.
 */
export const RAMP = { flat: 0.65, R: 1.0, H: 0.85, end: 0.65 + Math.sqrt(1 - 0.15 * 0.15), half: 2.0, width: 1.8, board: 0.1 };
/** The riding surface at `x`: its height and slope (radians, + rising to +x). */
export function rampAt(x: number): { y: number; slope: number } {
  const ax = Math.abs(x);
  if (ax <= RAMP.flat) return { y: 0, slope: 0 };
  if (ax >= RAMP.end) return { y: RAMP.H, slope: 0 };
  const u = ax - RAMP.flat;
  return { y: RAMP.R - Math.sqrt(RAMP.R * RAMP.R - u * u), slope: Math.sign(x) * Math.asin(Math.min(1, u / RAMP.R)) };
}
const clampTilt = (a: number) => THREE.MathUtils.clamp(a, -TILT, TILT);

export interface SkateState {
  /** Where the middle of the board's wheels touch (ramp frame), and how it's tipped (+ nose up to +x). */
  x: number;
  y: number;
  tilt: number;
  /** Up off the surface (an air), metres; the knees pulled up for it (0–1); the back hand on the board. */
  air: number;
  tuck: number;
  grab: boolean;
  /** Stalled on the deck at the coping. */
  stall: boolean;
}
type Leg = { to: number; dur: number; kind?: 'air' | 'stall' };
/** Two pumps, an air at the right coping, a stall on the left deck and drop back in (~8 s). */
const RIDE: Leg[] = [{ to: 1.55, dur: 1.45 }, { to: -1.55, dur: 1.45 }, { to: 1.6, dur: 1.5, kind: 'air' }, { to: -1.6, dur: 1.5, kind: 'stall' }];
const AIR = { dur: 0.75, up: 0.42 };
const STALL = { on: 0.3, hold: 0.8, drop: 0.35, deck: 1.8 };
export function skateRound(t: number, phase: number): SkateState {
  const legT = (l: Leg) => l.dur + (l.kind === 'air' ? AIR.dur : l.kind === 'stall' ? STALL.on + STALL.hold + STALL.drop : 0);
  const T = RIDE.reduce((n, l) => n + legT(l), 0);
  let u = frac(t / T + phase) * T;
  let from = -1.55;
  for (const leg of RIDE) {
    if (u < leg.dur) {
      // Pumped across like a pendulum: slow at the top of each wall, fastest across the flat.
      const x = numMix(from, leg.to, 0.5 - 0.5 * Math.cos((Math.PI * u) / leg.dur));
      const s = rampAt(x);
      return { x, y: s.y, tilt: clampTilt(s.slope), air: 0, tuck: 0, grab: false, stall: false };
    }
    u -= leg.dur;
    if (leg.kind === 'air') {
      if (u < AIR.dur) {
        // Up off the coping and back in: the knees up, the back hand grabbing the toe edge, the board levelling out at the top.
        const v = u / AIR.dur;
        const lift = Math.sin(Math.PI * v);
        const s = rampAt(leg.to);
        return { x: leg.to + 0.08 * lift, y: s.y, tilt: clampTilt(s.slope) * (1 - 0.5 * lift), air: AIR.up * lift, tuck: lift, grab: v > 0.25 && v < 0.75, stall: false };
      }
      u -= AIR.dur;
    }
    if (leg.kind === 'stall') {
      const edge = Math.sign(leg.to) * STALL.deck;
      const s = rampAt(leg.to);
      const tilt0 = clampTilt(s.slope);
      if (u < STALL.on) {
        // Over the coping onto the deck, coming upright.
        const v = sstep(u, 0, STALL.on);
        return { x: numMix(leg.to, edge, v), y: numMix(s.y, RAMP.H, v), tilt: tilt0 * (1 - v), air: 0.06 * Math.sin(Math.PI * v), tuck: 0, grab: false, stall: true };
      }
      u -= STALL.on;
      if (u < STALL.hold) return { x: edge, y: RAMP.H, tilt: 0, air: 0, tuck: 0, grab: false, stall: true };
      u -= STALL.hold;
      if (u < STALL.drop) {
        // Leant forward and dropped back in.
        const v = sstep(u, 0, STALL.drop);
        const end = leg.to + Math.sign(leg.to) * -0.05;
        const x = numMix(edge, end, v);
        const back = rampAt(x);
        return { x, y: numMix(RAMP.H, back.y, v), tilt: numMix(0, clampTilt(rampAt(end).slope), v), air: 0, tuck: 0, grab: false, stall: v < 0.4 };
      }
      u -= STALL.drop;
      from = leg.to + Math.sign(leg.to) * -0.05;
      continue;
    }
    from = leg.to;
  }
  return { x: from, y: rampAt(from).y, tilt: clampTilt(rampAt(from).slope), air: 0, tuck: 0, grab: false, stall: false };
}
/** The board's top middle (ramp frame) for a ride state. */
export function boardTop(s: SkateState): { x: number; y: number } {
  return { x: s.x - Math.sin(s.tilt) * RAMP.board, y: s.y + Math.cos(s.tilt) * RAMP.board + s.air };
}

// ---------------------------------------------------------------------------------------------
// The trampoline.

/** The bed as its spot has it (its middle at y = 0); how far it gives under a landing at most. */
export const BED = { dip: 0.24 };
type Hop = { flight: number; kind: 'straight' | 'tuck' | 'flip' | 'settle' };
/** Three straight bounces, a tuck jump, two more, a back flip, a stuck landing; then a breath and a bow (~11 s). */
const HOPS: Hop[] = [
  { flight: 0.62, kind: 'straight' }, { flight: 0.72, kind: 'straight' }, { flight: 0.8, kind: 'straight' }, { flight: 0.86, kind: 'tuck' },
  { flight: 0.78, kind: 'straight' }, { flight: 0.86, kind: 'straight' }, { flight: 0.96, kind: 'flip' }, { flight: 0.32, kind: 'settle' },
];
const CONTACT = 0.24;
const REST = 2.2;
export interface BounceState {
  /** Feet (or the tucked body's lowest) above the bed's rest, metres; how far the bed's pushed down. */
  lift: number;
  dip: number;
  from: XKey;
  to: XKey;
  e: number;
  /** The arms swinging up (0 down … 1 overhead), or off (hugging the shins in a tuck). */
  arms: number;
  hug: boolean;
  /** Stood still at the end, arms up for the judges. */
  bow: number;
}
export function bounceRound(t: number, phase: number, k: number): BounceState {
  const T = HOPS.reduce((n, h) => n + CONTACT + h.flight, 0) + REST;
  let u = frac(t / T + phase) * T;
  for (const h of HOPS) {
    if (u < CONTACT) {
      // In the bed: sunk into it with the knees giving, the arms swung down.
      const v = Math.sin((Math.PI * u) / CONTACT);
      const dip = BED.dip * v * (h.kind === 'settle' ? 0.6 : 1);
      return { lift: -dip, dip, from: 'xBounce', to: 'xBounceSquat', e: v, arms: 0.1, hug: false, bow: 0 };
    }
    u -= CONTACT;
    if (u < h.flight) {
      const v = u / h.flight;
      // Up and down under gravity, the arms swung up through the top.
      const lift = 4.9 * u * (h.flight - u);
      const arms = Math.sin(Math.PI * Math.min(1, v * 1.3));
      if (h.kind === 'tuck') {
        const tk = sstep(v, 0.2, 0.42) * (1 - sstep(v, 0.6, 0.82));
        return { lift: lift + 0.4 * k * tk, dip: 0, from: 'xBounce', to: 'xTuck0', e: tk, arms: arms * (1 - tk), hug: tk > 0.5, bow: 0 };
      }
      if (h.kind === 'flip') {
        // Back over: tucked, the hips round a quarter at a time, opened out for the landing.
        const keys: Array<[number, XKey]> = [[0.0, 'xBounce'], [0.14, 'xTuck0'], [0.32, 'xFlip1'], [0.5, 'xFlip2'], [0.68, 'xFlip3'], [0.84, 'xTuck0'], [0.97, 'xBounce']];
        let i = 0;
        while (i < keys.length - 2 && v >= keys[i + 1][0]) i++;
        const e = clamp01((v - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
        const tk = sstep(v, 0, 0.12) * (1 - sstep(v, 0.84, 0.97));
        return { lift: lift + 0.45 * k * tk, dip: 0, from: keys[i][1], to: keys[i + 1][1], e, arms: arms * (1 - tk), hug: tk > 0.5, bow: 0 };
      }
      return { lift, dip: 0, from: 'xBounce', to: 'xBounce', e: 0, arms: h.kind === 'settle' ? 0.2 : arms, hug: false, bow: 0 };
    }
    u -= h.flight;
  }
  // Stuck it: knees bent a moment, stood up, arms up.
  const v = u / REST;
  const bend = Math.sin(Math.PI * clamp01(v / 0.3));
  return { lift: -0.04 * bend, dip: 0.04 * bend, from: 'xBounce', to: 'xBounceSquat', e: bend * 0.6, arms: sstep(v, 0.3, 0.5) * (1 - sstep(v, 0.85, 1)), hug: false, bow: sstep(v, 0.3, 0.5) * (1 - sstep(v, 0.85, 1)) };
}

// ---------------------------------------------------------------------------------------------
// Posing them.

/** A whole-body motion at a spot: the pose (an asana in the spot's frame) and the hands. */
export function extremePose(m: ExtremePoseMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const at = spot.at;
  at.updateWorldMatrix(true, false);
  const origin = at.getWorldPosition(new THREE.Vector3());
  const face = new THREE.Vector3(0, 0, 1).transformDirection(at.matrixWorld);
  const yaw = Math.atan2(face.x, face.z);
  const W = (p: P3) => at.localToWorld(new THREE.Vector3(p.x, p.y, p.z));
  const k = height / 1.6;
  const ph = xPhase(origin);
  const asana = (hipX: number, hipZ: number, floor: number, from: XKey, to: XKey, e: number): BodyPose => ({
    kind: 'asana',
    at: W(p3(hipX, 0, hipZ)),
    yaw,
    floor: origin.y + floor,
    from: step(from),
    to: step(to),
    e,
  });
  if (m === 'xClimb' || m === 'xLead') {
    const c = climbRound(t, ph, m === 'xLead', k);
    return { pose: asana(c.hipX, c.hipZ, c.floor, c.from, c.to, c.e), doing: { reach: { l: W(c.l), r: W(c.r), grip: { l: c.gl, r: c.gr }, nod: c.nod, palms: c.palms } } };
  }
  if (m === 'xBoulder') {
    const c = boulderRound(t, ph, k);
    return { pose: asana(c.hipX, c.hipZ, c.floor, c.from, c.to, c.e), doing: { reach: { l: c.l && W(c.l), r: c.r && W(c.r), grip: { l: c.gl, r: c.gr }, nod: c.nod, palms: 0.5 } } };
  }
  if (m === 'xSkate') {
    const s = skateRound(t, ph);
    const top = boardTop(s);
    // The hips over the board, square to it; the lower foot set on its deck.
    const hipH = 0.74 * k;
    const hipX = top.x - Math.sin(s.tilt) * hipH;
    const floor = top.y - 0.24 * k * Math.abs(Math.sin(s.tilt));
    const e = unease(Math.abs(s.tilt) / TILT);
    const pose = s.tuck > 0.001 ? asana(hipX, 0, floor, 'xSkateR', 'xTuckM', unease(s.tuck)) : asana(hipX, 0, floor, 'xSkate', s.tilt >= 0 ? 'xSkateR' : 'xSkateL', e);
    // Arms out for balance along the board's line (tipped with the body), waving; the back hand down to the toe edge in a grab.
    const along = p3(Math.cos(s.tilt), Math.sin(s.tilt), 0);
    const up = p3(-Math.sin(s.tilt), Math.cos(s.tilt), 0);
    const hip = p3(hipX, top.y + Math.cos(s.tilt) * hipH, 0);
    const arm = (side: number, wob: number) => p3(hip.x + along.x * side * 0.5 * k + up.x * (0.22 + wob) * k, hip.y + along.y * side * 0.5 * k + up.y * (0.22 + wob) * k, 0.12 * k);
    const l = arm(1, 0.08 * wave(t, 0.9, ph));
    const r = s.grab ? p3(top.x - along.x * 0.05, top.y + 0.02, 0.13) : arm(-1, 0.08 * wave(t, 0.9, ph + 0.5));
    return { pose, doing: { reach: { l: W(l), r: W(r), grip: { l: 0.25, r: s.grab ? 0.9 : 0.25 }, palms: 0.2, nod: s.stall ? 0.35 : 0.15 } } };
  }
  // The trampoline: bounced straight up over the middle of the bed.
  const b = bounceRound(t, ph, k);
  const pose = asana(0, 0, b.lift, b.from, b.to, b.e);
  if (b.hug) return { pose, doing: {} };
  const hip = 0.9 * k + b.lift;
  const hand = (side: number) => {
    const a = b.arms;
    // Swung from by the thighs up through the front to overhead (a bow: straight up, a little apart).
    const ang = numMix(-1.25, 1.45, a);
    return p3(side * (0.2 + 0.08 * b.bow) * k, hip + 0.5 * k + Math.sin(ang) * 0.55 * k, Math.cos(ang) * 0.3 * k);
  };
  return { pose, doing: { reach: { l: W(hand(1)), r: W(hand(-1)), grip: { l: 0.1, r: 0.1 }, palms: 0.3, nod: b.bow > 0.5 ? -0.1 : 0.1 } } };
}

// ---------------------------------------------------------------------------------------------
// The hands at the gear bench, the rental counter and the replay screen.

/** The canopy laid along the bench (`len` either side of where the hands work) and the container at the packer's right. */
export const PACK = { len: 0.42, cont: bo(-0.55, 0.06, -0.06) };
/**
 * Packing a parachute (18 s): walking along the canopy lifting and laying each panel straight
 * (flaking), two S-folds from the ends to the middle, the air pressed out of it with flat palms, the
 * bundle pushed into the container, and the closing pin pressed home. `spread` / `fold` / `press` /
 * `stow` say how far along the canopy is (0–1 each), `pin` the pin going in.
 */
export function packRound(t: number, phase: number) {
  const u = frac(t / 18 + phase);
  let l: BarOffset;
  let r: BarOffset;
  let lean = 0.3;
  let nod = 0.45;
  let crouch = 0;
  if (u < 0.36) {
    const v = u / 0.36;
    const x = 0.36 - 0.72 * v;
    const lift = Math.abs(Math.sin(Math.PI * 4 * v));
    l = bo(x + 0.13, 0.04 + 0.16 * lift, 0.04);
    r = bo(x - 0.13, 0.04 + 0.16 * lift, 0.04);
  } else if (u < 0.56) {
    const w = frac(((u - 0.36) / 0.2) * 2);
    const s = 0.42 - 0.3 * sstep(w, 0, 0.8);
    l = bo(s, 0.04 + 0.1 * Math.sin(Math.PI * w), 0.03);
    r = bo(-s, 0.04 + 0.1 * Math.sin(Math.PI * w), 0.03);
  } else if (u < 0.72) {
    const p = 0.02 + 0.035 * Math.abs(Math.sin(t * 5));
    l = bo(0.12, p, 0.02);
    r = bo(-0.12, p, 0.02);
    lean = 0.5;
    crouch = 0.12;
  } else if (u < 0.9) {
    const v = sstep(u, 0.72, 0.88);
    l = bo(numMix(0.14, -0.36, v), 0.08, -0.02);
    r = bo(numMix(-0.1, -0.56, v), 0.08, -0.04);
    lean = 0.4;
  } else {
    const v = (u - 0.9) / 0.1;
    l = bo(-0.44, 0.2, -0.04);
    r = boAdd(bo(-0.55, 0.17, -0.08), bo(0, -0.03 * sstep(v, 0.3, 0.6), 0));
    nod = 0.55;
  }
  return {
    u,
    l,
    r,
    lean,
    nod,
    crouch,
    palms: u > 0.56 && u < 0.72 ? 1.4 : 0.9,
    spread: 1 - sstep(u, 0.36, 0.56),
    press: sstep(u, 0.56, 0.72),
    stow: sstep(u, 0.72, 0.88),
    pin: sstep(u, 0.93, 0.97),
  };
}

/** The rope coiled over the left hand, a loop at a time: where the coil's held, where the rope pile is. */
export const COIL = { hold: bo(0.1, 0.32, -0.18), pile: bo(-0.32, 0.03, 0.06), loops: 6 };
/**
 * A rope coiled (12 s): held in the left hand by the chest, the right running it out an arm's length
 * and bringing each loop back over (six), then the tail wrapped round the coil and it's laid down.
 * `coil` 0–1 how much is in the hand, `wrap` the tail going round.
 */
export function coilRound(t: number, phase: number) {
  const u = frac(t / 12 + phase);
  const bob = bo(0, 0.01 * Math.sin(t * 4), 0);
  const l = boAdd(COIL.hold, bob);
  let r: BarOffset;
  let coil: number;
  let wrap = 0;
  if (u < 0.75) {
    const n = (u / 0.75) * COIL.loops;
    const v = frac(n);
    r = keyed<BarOffset>([[0, boAdd(COIL.hold, bo(-0.05, 0.02, 0))], [0.45, bo(-0.42, 0.3, -0.12)], [0.55, bo(-0.42, 0.32, -0.12)], [1, boAdd(COIL.hold, bo(-0.05, 0.02, 0))]], v, boMix);
    coil = (Math.floor(n) + sstep(v, 0.6, 1)) / COIL.loops;
  } else if (u < 0.92) {
    const a = ((u - 0.75) / 0.17) * Math.PI * 6;
    r = boAdd(COIL.hold, bo(-0.06 * Math.cos(a), 0.06 * Math.sin(a) - 0.06, 0.05 * Math.sin(a)));
    coil = 1;
    wrap = (u - 0.75) / 0.17;
  } else {
    const v = sstep(u, 0.92, 1);
    r = boMix(COIL.hold, COIL.pile, v);
    coil = 1;
    wrap = 1;
  }
  return { u, l, r, coil, wrap, pile: 1 - (u < 0.75 ? coil : 1) };
}

/**
 * Gear checked (13 s): a carabiner held up to the eyes and its gate pushed open three times (the left
 * thumb), turned to look at the spine; put down; the harness's waist belt tugged twice and the buckle
 * doubled back and pulled. `biner` where the carabiner is while it's held (else on the bench), `gate`
 * how far open, `tug` the belt pulled up.
 */
export const BINER = { rest: bo(-0.2, 0.02, -0.1) };
export function gearCheckRound(t: number, phase: number) {
  const u = frac(t / 13 + phase);
  const held = u < 0.38 || u > 0.97;
  const eye = bo(-0.06, 0.5, -0.16);
  let r: BarOffset;
  let l: BarOffset;
  let gate = 0;
  let tug = 0;
  let nod = 0.4;
  let lean = 0.15;
  if (u < 0.05) {
    r = boMix(BINER.rest, eye, sstep(u, 0, 0.05));
    l = boAdd(r, bo(0.16, -0.06, 0.04));
  } else if (u < 0.36) {
    const v = (u - 0.05) / 0.31;
    gate = Math.max(0, Math.sin(Math.PI * 3 * v)) ** 0.6;
    r = boAdd(eye, bo(0, 0.01 * Math.sin(t * 2), 0));
    l = boAdd(eye, bo(0.065, 0.01 - 0.015 * gate, 0.02));
    nod = -0.05;
  } else if (u < 0.42) {
    r = boMix(eye, BINER.rest, sstep(u, 0.36, 0.42));
    l = bo(0.15, 0.03, 0.02);
  } else if (u < 0.78) {
    const v = (u - 0.42) / 0.36;
    tug = Math.max(0, Math.sin(Math.PI * 2 * v));
    l = bo(0.15, 0.03 + 0.12 * tug, 0.02 - 0.1 * tug);
    r = bo(-0.12, 0.03 + 0.12 * tug, 0.02 - 0.1 * tug);
    nod = 0.55;
    lean = 0.3;
  } else {
    const v = (u - 0.78) / 0.19;
    l = bo(0.03, 0.04, 0.02);
    r = keyed<BarOffset>([[0, bo(-0.02, 0.04, 0.02)], [0.4, bo(-0.02, 0.06, 0.0)], [0.7, bo(-0.18, 0.08, -0.02)], [1, BINER.rest]], v, boMix);
    nod = 0.55;
    lean = 0.3;
  }
  return { u, l, r, held, gate, tug, nod, lean, biner: held ? r : BINER.rest };
}

/** The counter as the one renting out has it: the shoe cubbies to their left, the till to their right, the customer's side away from them. */
export const RENTAL = { cubby: bo(0.44, 0.2, -0.06), till: bo(-0.4, 0.08, -0.08), hand: bo(0, 0.04, 0.22) };
/**
 * Renting out a pair (10 s): a pair of climbing shoes taken from the cubby, set down and slid across
 * to the customer, the till tapped, the receipt handed over. `shoes` where the pair is (null once
 * they're taken), `held` in the hand.
 */
export function rentalRound(t: number, phase: number) {
  const u = frac(t / 10 + phase);
  const rest = (s: number) => bo(s * 0.16, 0.0, -0.06);
  const mid = bo(0.04, 0.03, 0.06);
  const l = keyed<BarOffset>([[0.02, rest(1)], [0.16, RENTAL.cubby], [0.22, RENTAL.cubby], [0.36, mid], [0.4, mid], [0.52, boAdd(mid, bo(0, 0, 0.28))], [0.6, rest(1)]], u, boMix);
  const tap = 0.015 * Math.max(0, Math.sin(t * 14));
  const r = keyed<BarOffset>([[0.36, rest(-1)], [0.4, boAdd(mid, bo(-0.12, 0, 0))], [0.52, boAdd(mid, bo(-0.12, 0, 0.28))], [0.6, RENTAL.till], [0.82, RENTAL.till], [0.92, RENTAL.hand], [0.97, RENTAL.hand], [1, rest(-1)]], u, boMix);
  const tapping = u > 0.6 && u < 0.82;
  const held = u > 0.2 && u < 0.38;
  const shoes = u < 0.2 ? RENTAL.cubby : held ? boAdd(l, bo(-0.02, -0.03, 0)) : u < 0.4 ? mid : u < 0.6 ? boAdd(mid, bo(-0.06, -0.02, 0.28 * sstep(u, 0.4, 0.52))) : null;
  return { u, l, r: tapping ? boAdd(r, bo(0, tap, 0)) : r, held, shoes, receipt: u > 0.84 && u < 0.97, nod: tapping ? 0.45 : 0.25 };
}

/** The screen's pointed-at place from where the tablet's held, in the analyst's frame. */
export const REPLAY = { point: bo(-0.22, 0.42, 0.95), point2: bo(0.5, 0.25, 0.97) };
/**
 * Going through a run on the replay screen (14 s): scrubbing on the tablet in the left hand, then the
 * right arm up pointing at the screen (the frame frozen, a circle where it points), back to the
 * tablet, and pointing at another place. `scrub` true while the right hand's on the tablet;
 * `pointing` 0, 1 or 2 (which place is circled).
 */
export function replayRound(t: number, phase: number) {
  const u = frac(t / 14 + phase);
  const l = bo(0.06, 0.01 * Math.sin(t * 1.3), 0);
  const tab = bo(-0.03 + 0.06 * Math.sin(t * 2.2), 0.025, 0.0);
  const aim = (p: BarOffset) => {
    const n = Math.hypot(p.side, p.up, p.ahead);
    return bo((p.side / n) * 0.24 - 0.06, (p.up / n) * 0.24 + 0.14, (p.ahead / n) * 0.24 - 0.04);
  };
  const pt1 = aim(REPLAY.point);
  const pt2 = aim(REPLAY.point2);
  const r = keyed<BarOffset>([[0.26, tab], [0.32, pt1], [0.52, pt1], [0.58, tab], [0.78, tab], [0.84, pt2], [0.95, pt2], [1, tab]], u, boMix);
  const pointing = u > 0.3 && u < 0.55 ? 1 : u > 0.82 && u < 0.97 ? 2 : 0;
  return { u, l, r, scrub: pointing === 0, pointing, nod: pointing ? -0.1 : 0.4 };
}

/** The hands for one of these at time `t`. */
export function extremeDoing(m: ExtremeMotion, b: BodyAt, work: Work | null, t: number): Doing {
  if (EXTREME_POSES.has(m)) return {};
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.4).setY(b.base.y + 0.9);
  const to = (o: BarOffset) => p.clone().addScaledVector(left, o.side).setY(p.y + o.up).addScaledVector(fwd, o.ahead);
  const ph = xPhase(b.base);
  switch (m) {
    case 'xPack': {
      const k = packRound(t, ph);
      return { reach: { l: to(k.l), r: to(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: 0.45, r: 0.45 } }, crouch: k.crouch };
    }
    case 'xCoil': {
      const k = coilRound(t, ph);
      return { reach: { l: to(k.l), r: to(k.r), lean: 0.05, nod: 0.3, palms: 0.5, grip: { l: 0.85, r: 0.8 } } };
    }
    case 'xGearCheck': {
      const k = gearCheckRound(t, ph);
      return { reach: { l: to(k.l), r: to(k.r), lean: k.lean, nod: k.nod, palms: 0.6, grip: { l: 0.7, r: 0.85 } } };
    }
    case 'xRental': {
      const k = rentalRound(t, ph);
      return { reach: { l: to(k.l), r: to(k.r), lean: 0.15, nod: k.nod, palms: 0.9, grip: { l: k.held ? 0.8 : 0.3, r: 0.4 }, tap: k.u > 0.6 && k.u < 0.82 } };
    }
    case 'xReplay': {
      const k = replayRound(t, ph);
      return { reach: { l: to(k.l), r: to(k.r), lean: 0.02, nod: k.nod, palms: 0.6, grip: { l: 0.8, r: k.scrub ? 0.35 : 0.6 } } };
    }
    default:
      return {};
  }
}
