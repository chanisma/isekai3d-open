import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * A bodyguard's work at the 경호 업체 (2026-10-27, the 경호 업체, at the user's request: the work
 * should look like the work — professional, nothing violent). Self-defence drilled on a padded
 * takedown dummy on the mat (squared up on guard, a high block, palm-heel strikes on its chest pad, a
 * clinch at its shoulders, a controlled takedown — followed down to a knee beside it, the chest and
 * shoulder pinned — and the dummy stood back up); the diamond formation walked round a VIP cone,
 * facing out and scanning, a hand to the earpiece; the motorcade route traced on the planning
 * table's map with a car token, the checkpoints pressed, a note made; the earpiece checked (fitted,
 * a hand to the ear, the cuff mic raised to the lips); suiting up at the locker (the tie, the
 * jacket's button, the cuffs, the sunglasses, a look in the mirror); and the handheld wand swept over
 * a mannequin at the metal-detector gate, the pocket that beeps patted down.
 *
 * Each is a round of beats by the same clock (bgPhase of the piece's `work` mark) as the piece it's
 * done at (workplaces/bodyguard.ts), which tips the dummy, moves the spot, slides the token and
 * draws the wand in the hand from the same functions here. Kept out of activity.ts (which only hands
 * these motions over here) so it imports nothing from it at run time.
 */
export type BodyguardMotion = 'bgDefense' | 'bgFormation' | 'bgRoute' | 'bgEarpiece' | 'bgSuitUp' | 'bgWand';
export const BODYGUARD_MOTIONS = new Set<string>(['bgDefense', 'bgFormation', 'bgRoute', 'bgEarpiece', 'bgSuitUp', 'bgWand']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const sstep = THREE.MathUtils.smoothstep;
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** The clock offset (as activity.ts toolPhase): from a fixed mark on the piece, so two pieces aren't in step. */
export const bgPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

type Step<K extends string> = { key: K; hold: number; move: number };
const st = <K extends string>(key: K, hold: number, move = 0.6): Step<K> => ({ key, hold, move });
/** Where a round of steps is at `t`: the beat held (`v` seconds into its `hold`) or eased into the next (`e`); `n` counts rounds. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  v: number;
  hold: number;
  n: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, ph: number): Beat<K> {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0);
  const c = t / T + ph;
  const n = Math.floor(c);
  let u = (c - n) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, v: u, hold: k.hold, n };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: sstep(Math.min(1, u / k.move), 0, 1), v: k.hold, hold: k.hold, n };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, v: 0, hold: steps[0].hold, n };
}

// ---------------------------------------------------------------------------------------------
// The sparring mat: the takedown dummy and where the drill puts the dweller.

/** The mat's top; the dummy's pivot (the back of its heels) on it, along the mat's x; its body. */
export const MAT = 0.045;
export const DUMMY = { pivot: -0.25, R: 0.12, shoulder: 1.2, chest: 1.05, hip: 0.8, head: 1.36, shoulderW: 0.16 };
/** Where the dweller stands for each beat (the mat's frame, facing +x down it to the dummy). */
const DEF_AT = { guard: [-0.85, 0], clinch: [-0.73, 0], pin: [0.36, 0.27] } as const;
/** How far the dummy's tipped over (radians, toward +x) when it's down. */
export const DOWN = 1.53;

/**
 * The self-defence round (bgDefense, ~22 s): on guard; a high block with the left forearm; palm-heel
 * strikes left and right into the chest pad; stepping in to clinch it at the shoulders; the
 * takedown — driven over backwards, followed down to a knee beside its hip; the pin (a hand flat on
 * its chest, the other on its near shoulder) held; and it's lifted back up by the shoulders.
 */
export type DefKey = 'guard' | 'block' | 'strike' | 'clinch' | 'take' | 'pin' | 'lift';
const DEFENSE: Array<Step<DefKey>> = [st('guard', 2.2, 0.5), st('block', 2.2, 0.5), st('strike', 3, 0.6), st('clinch', 1.0, 1.5), st('take', 0.5, 0.6), st('pin', 3.2, 1.7), st('lift', 0.5, 0.7)];
const tilt = (k: DefKey) => (k === 'take' || k === 'pin' ? DOWN : 0);
const defAt = (k: DefKey): readonly [number, number] => (k === 'take' || k === 'pin' ? DEF_AT.pin : k === 'clinch' || k === 'lift' ? DEF_AT.clinch : DEF_AT.guard);
export function defenseAt(t: number, ph: number) {
  const b = beatOf(DEFENSE, t, ph);
  // Down it goes faster at the end (it falls), up it comes steadily (it's lifted).
  const fall = b.from === 'clinch' ? b.e * b.e : b.e;
  const theta = mix(tilt(b.from), tilt(b.to), fall);
  const [x0, z0] = defAt(b.from);
  const [x1, z1] = defAt(b.to);
  return { ...b, theta, x: mix(x0, x1, b.e), z: mix(z0, z1, b.e) };
}
/**
 * A point on the dummy tipped `theta`, in the mat's frame: `h` up its body from the heels, `lx` out
 * of its back toward its front (0 its back, -2R its front face) and `lat` across (+z).
 */
export function dummyPoint(theta: number, h: number, lx: number, lat: number, out = new THREE.Vector3()): THREE.Vector3 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return out.set(DUMMY.pivot + lx * c + h * s, MAT - lx * s + h * c, lat);
}

// ---------------------------------------------------------------------------------------------
// The diamond formation round the VIP cone, on the far end of the mat.

export const CONE = { x: 0.5, z: 0 };
interface TrackKey {
  t: number;
  x: number;
  z: number;
  yaw: number;
  beat: 'scan' | 'walk';
}
const FX = 0.42;
const FZ = 0.32;
const P = Math.PI;
const FORMATION: TrackKey[] = [
  { t: 0, x: CONE.x, z: FZ, yaw: 0, beat: 'scan' },
  { t: 4, x: CONE.x, z: FZ, yaw: 0, beat: 'walk' },
  { t: 5.4, x: CONE.x + FX, z: 0, yaw: P / 2, beat: 'scan' },
  { t: 9.4, x: CONE.x + FX, z: 0, yaw: P / 2, beat: 'walk' },
  { t: 10.8, x: CONE.x, z: -FZ, yaw: P, beat: 'scan' },
  { t: 14.8, x: CONE.x, z: -FZ, yaw: P, beat: 'walk' },
  { t: 16.2, x: CONE.x - FX, z: 0, yaw: 1.5 * P, beat: 'scan' },
  { t: 20.2, x: CONE.x - FX, z: 0, yaw: 1.5 * P, beat: 'walk' },
  { t: 21.6, x: CONE.x, z: FZ, yaw: 2 * P, beat: 'scan' },
];
/**
 * Where the formation walk is (the mat's frame): a post on each side of the cone in turn, faced
 * out from it, the body turning slowly one way and the other to scan the crowd; then a sidestep
 * round to the next post.
 */
export function formationAt(t: number, ph: number) {
  const T = FORMATION[FORMATION.length - 1].t;
  const u = frac(t / T + ph) * T;
  let i = 0;
  while (i < FORMATION.length - 2 && u >= FORMATION[i + 1].t) i++;
  const a = FORMATION[i];
  const b = FORMATION[i + 1];
  const e = sstep((u - a.t) / (b.t - a.t), 0, 1);
  const scan = a.beat === 'scan' ? 0.45 * Math.sin(((u - a.t) / (b.t - a.t)) * Math.PI * 2) : 0;
  return { x: mix(a.x, b.x, e), z: mix(a.z, b.z, e), yaw: mix(a.yaw, b.yaw, e) + scan, beat: a.beat };
}

// ---------------------------------------------------------------------------------------------
// The planning table: the route on the map, from the `work` mark in the table's frame (x across it, z toward the planner).

export const ROUTE: Array<[number, number]> = [
  [-0.28, 0.2],
  [-0.28, 0.03],
  [-0.06, 0.03],
  [-0.06, -0.12],
  [0.14, -0.12],
  [0.26, -0.2],
];
export const CHECKPOINTS: Array<[number, number]> = [ROUTE[1], ROUTE[3], ROUTE[4]];
/** Where the notepad lies by the map (from `work`). */
export const NOTEPAD: [number, number] = [-0.4, 0.27];
const legs = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
const routeLen = legs.reduce((n, l) => n + l, 0);
/** The point `u` (0–1) of the way along the route. */
export function routeAt(u: number): [number, number] {
  let d = THREE.MathUtils.clamp(u, 0, 1) * routeLen;
  for (let i = 0; i < legs.length; i++) {
    if (d <= legs[i] || i === legs.length - 1) {
      const e = legs[i] ? Math.min(1, d / legs[i]) : 0;
      return [mix(ROUTE[i][0], ROUTE[i + 1][0], e), mix(ROUTE[i][1], ROUTE[i + 1][1], e)];
    }
    d -= legs[i];
  }
  return ROUTE[ROUTE.length - 1];
}
/**
 * Planning the route (bgRoute, ~25 s): studying the map with both hands on the table's edge; the
 * car token taken at the start and pushed along the route to the venue; a checkpoint pressed (a
 * pin, a different one each round); a note on the pad; stood up a little pointing the route out; and
 * the token slid back to the start.
 */
export type RouteKey = 'study' | 'take' | 'trace' | 'mark' | 'note' | 'point' | 'back';
const ROUTE_STEPS: Array<Step<RouteKey>> = [st('study', 3, 0.8), st('take', 0.6, 0.4), st('trace', 5.5, 0.6), st('mark', 2.2, 0.6), st('note', 3, 0.7), st('point', 2.4, 0.7), st('back', 1.6, 0.6)];
export const routeBeat = (t: number, ph: number) => beatOf(ROUTE_STEPS, t, ph);
/** Where the token is (from `work`, the table's frame) at `t`. */
export function tokenAt(t: number, ph: number): [number, number] {
  const b = routeBeat(t, ph);
  if (b.from === 'trace') return b.e > 0 ? routeAt(1) : routeAt(b.v / b.hold);
  if (b.from === 'back') return b.e > 0 ? routeAt(0) : routeAt(1 - b.v / b.hold);
  if (b.from === 'mark' || b.from === 'note' || b.from === 'point') return routeAt(1);
  return routeAt(0);
}

// ---------------------------------------------------------------------------------------------
// The metal-detector gate: the wand over the mannequin, from its feet (`work`) in the gate's frame
// (x across, z out of the mannequin's front toward the guard).

/** How far in front of the mannequin's middle the wand's head passes; how far back its grip is. */
export const WAND = { head: 0.21, grip: 0.2 };
const WAND_KEYS: Array<[number, number, number]> = [
  [0, 0.1, 1.2],
  [1.5, 0.0, 1.66],
  [2.3, 0.13, 1.5],
  [3.0, -0.13, 1.5],
  [3.6, -0.16, 1.32],
  [4.4, -0.33, 1.02],
  [5.0, -0.16, 1.32],
  [5.6, 0.16, 1.32],
  [6.4, 0.33, 1.02],
  [7.0, 0.16, 1.3],
  [7.6, 0.0, 1.2],
  [8.4, -0.12, 1.05],
  [9.0, 0.12, 0.95],
  [9.6, 0.09, 0.86],
  [12.0, 0.09, 0.86],
  [12.6, -0.1, 0.8],
  [13.4, -0.1, 0.5],
  [14.4, -0.1, 0.17],
  [15.0, 0.1, 0.17],
  [16.0, 0.1, 0.5],
  [16.8, 0.1, 0.8],
  [18.0, 0.1, 1.2],
  [19.5, 0.1, 1.2],
];
/** The pocket that beeps: the wand holds over it while it's patted. */
export const BEEP = { from: 9.6, to: 12.0, x: 0.09, y: 0.86 };
/**
 * The wand drill (bgWand, 19.5 s): the wand's head round the head, out along each arm and back,
 * zigzagging down the chest — it beeps at the right trouser pocket, held there while the left hand
 * pats it down — down one leg to the ankle and up the other. Its head's (x, y) on the mannequin.
 */
export function wandAt(t: number, ph: number) {
  const T = WAND_KEYS[WAND_KEYS.length - 1][0];
  const u = frac(t / T + ph) * T;
  let i = 0;
  while (i < WAND_KEYS.length - 2 && u >= WAND_KEYS[i + 1][0]) i++;
  const a = WAND_KEYS[i];
  const b = WAND_KEYS[i + 1];
  const e = sstep((u - a[0]) / (b[0] - a[0]), 0, 1);
  const beep = u >= BEEP.from && u < BEEP.to;
  return { x: mix(a[1], b[1], e), y: mix(a[2], b[2], e), beep, u };
}

// ---------------------------------------------------------------------------------------------
// The hands.

type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number; crouch?: number };
function blend(a: Key, z: Key, e: number): Doing {
  const m = (q: number, r: number) => q + (r - q) * e;
  return {
    reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: m(a.lean, z.lean), nod: m(a.nod, z.nod), palms: m(a.palms, z.palms), grip: { l: m(a.gl, z.gl), r: m(a.gr, z.gr) } },
    crouch: m(a.crouch ?? 0, z.crouch ?? 0),
  };
}

/** Where the earpiece is, at the left ear, for a dweller of height `H` (stood or sat): to their left, up from the feet or the seat, ahead. */
export function earAt(H: number, sitting: boolean) {
  const k = H / 1.6;
  return { side: 0.085 * k, up: (sitting ? 0.52 : 0.92) * H, ahead: 0.0 };
}

export function bodyguardDoing(m: BodyguardMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  const k = H / 1.6;
  const y0 = b.base.y;
  const chest = y0 + (b.sitting ? 0.3 : 0.7) * H;
  const mouth = y0 + (b.sitting ? 0.46 : 0.86) * H;
  const waist = y0 + (b.sitting ? 0.12 : 0.56) * H;
  const front = (ahead: number, side: number, y: number) => b.base.clone().addScaledVector(fwd, ahead).addScaledVector(left, side).setY(y);
  const p0 = work?.point ?? front(0.4 * k, 0, waist + 0.2 * k);
  const ph = bgPhase(p0);
  const s = ph * 7.1;
  const e0 = earAt(H, b.sitting);
  const ear = front(e0.ahead + 0.02 * k, e0.side + 0.015 * k, y0 + e0.up);
  /** The cuff mic: the right wrist raised under the chin. */
  const cuff = front(0.19 * k, -0.02 * k, mouth - 0.06 * k);
  const claspL = front(0.17 * k, 0.025 * k, waist - 0.03 * k);
  const claspR = front(0.18 * k, -0.015 * k, waist - 0.01 * k);
  /** Pieces facing their user (the user faces the piece's -z): a point `dx` across, `dy` up, `dz` toward the user from `work`. */
  const facing = (dx: number, dy: number, dz: number) => p0.clone().addScaledVector(left, -dx).addScaledVector(UP, dy).addScaledVector(fwd, -dz);
  switch (m) {
    case 'bgDefense': {
      // `work` is the dummy's pivot on the mat; the mat's +x is the way the dweller faces, its +z their right.
      const beat = defenseAt(t, ph);
      const onMat = (v: THREE.Vector3) => p0.clone().addScaledVector(fwd, v.x - DUMMY.pivot).addScaledVector(UP, v.y - MAT).addScaledVector(left, -v.z);
      const dp = (h: number, lx: number, lat: number) => onMat(dummyPoint(beat.theta, h, lx, lat));
      const R = DUMMY.R;
      const gl = front(0.26 * k, 0.13 * k, chest + 0.2 * k);
      const gr = front(0.24 * k, -0.12 * k, chest + 0.17 * k);
      const pose = (key: DefKey): Key => {
        switch (key) {
          case 'guard':
            return { l: gl, r: gr.clone().addScaledVector(UP, 0.01 * wave(t, 0.7, s)), lean: 0.08, nod: 0.05, palms: 0.2, gl: 0.9, gr: 0.9, crouch: 0.15 };
          case 'block':
            return { l: front(0.31 * k, 0.03 * k, mouth + 0.2 * k), r: gr, lean: 0.04, nod: 0.02, palms: 0.1, gl: 0.85, gr: 0.9, crouch: 0.2 };
          case 'strike': {
            const pr = Math.max(0, wave(t, 0.85, s)) ** 2;
            const pl = Math.max(0, wave(t, 0.85, s + 0.5)) ** 2;
            const padR = dp(DUMMY.chest, -2 * R - 0.01, 0.06);
            const padL = dp(DUMMY.chest + 0.02, -2 * R - 0.01, -0.06);
            return { l: gl.clone().lerp(padL, pl), r: gr.clone().lerp(padR, pr), lean: 0.1 + 0.06 * (pl + pr), nod: 0.06, palms: -0.3, gl: 0.9 - 0.7 * pl, gr: 0.9 - 0.7 * pr, crouch: 0.18 };
          }
          case 'clinch':
          case 'lift':
            return { l: dp(DUMMY.shoulder, -1.6 * R, -DUMMY.shoulderW), r: dp(DUMMY.shoulder, -1.6 * R, DUMMY.shoulderW), lean: 0.22, nod: 0.15, palms: 0.6, gl: 0.95, gr: 0.95, crouch: key === 'lift' ? 0.3 : 0.22 };
          case 'take':
            return { l: dp(DUMMY.shoulder, -1.6 * R, -DUMMY.shoulderW), r: dp(DUMMY.shoulder, -1.6 * R, DUMMY.shoulderW), lean: 0.45, nod: 0.35, palms: 0.9, gl: 0.95, gr: 0.95, crouch: 0.8 };
          default: {
            // The pin: the left hand flat on its chest, the right on its near shoulder, pressing a little.
            const press = 0.008 * wave(t, 0.6, s);
            return { l: dp(DUMMY.chest, -2 * R - 0.01 - press, -0.02), r: dp(DUMMY.shoulder - 0.04, -2 * R - 0.01 - press, DUMMY.shoulderW), lean: 0.5, nod: 0.5, palms: 1.25, gl: 0.45, gr: 0.75, crouch: 0.9 };
          }
        }
      };
      return blend(pose(beat.from), pose(beat.to), beat.e);
    }
    case 'bgFormation': {
      // Hands clasped low in front (right over left), now and then the left to the earpiece to listen
      // and the right cuff up to the lips to answer.
      type F = 'clasp' | 'listen' | 'talk';
      const f = beatOf<F>([st('clasp', 4.5, 0.5), st('listen', 1.8, 0.4), st('talk', 2.2, 0.5), st('clasp', 3, 0.5), st('listen', 2.4, 0.5)], t, ph + 0.13);
      const pose = (key: F): Key => {
        if (key === 'clasp') return { l: claspL, r: claspR, lean: 0.02, nod: -0.02, palms: 0.6, gl: 0.5, gr: 0.4 };
        if (key === 'listen') return { l: ear, r: claspR, lean: 0.02, nod: 0.06, palms: 0.4, gl: 0.6, gr: 0.4 };
        return { l: ear, r: cuff, lean: 0.03, nod: 0.14, palms: 0.2, gl: 0.6, gr: 0.6 };
      };
      return blend(pose(f.from), pose(f.to), f.e);
    }
    case 'bgRoute': {
      // `work` is the map's middle; the table's x across, z toward the planner.
      const beat = routeBeat(t, ph);
      const tk = tokenAt(t, ph);
      const token = facing(tk[0], 0.035, tk[1]);
      const rest = facing(-0.24, 0.012, 0.3);
      const pose = (key: RouteKey): Key => {
        switch (key) {
          case 'study':
            return { l: facing(-0.22, 0.012, 0.36), r: facing(0.22, 0.012, 0.36), lean: 0.3, nod: 0.5 + 0.06 * wave(t, 0.3, s), palms: 1.3, gl: 0.3, gr: 0.3 };
          case 'take':
          case 'trace':
          case 'back':
            return { l: rest, r: token, lean: 0.45, nod: 0.6, palms: 1.35, gl: 0.3, gr: 0.75 };
          case 'mark': {
            const c = CHECKPOINTS[beat.n % CHECKPOINTS.length];
            const push = 0.02 * Math.max(0, wave(t, 1.1, s)) ** 3;
            return { l: rest, r: facing(c[0], 0.03 - push, c[1]), lean: 0.42, nod: 0.6, palms: 1.4, gl: 0.3, gr: 0.85 };
          }
          case 'note':
            return { l: facing(NOTEPAD[0] - 0.06, 0.012, NOTEPAD[1] + 0.02), r: facing(NOTEPAD[0] + 0.02 + 0.025 * wave(t, 2.1, s), 0.015 + 0.006 * wave(t, 4.2, s), NOTEPAD[1] + 0.02 * wave(t, 1.1, s)), lean: 0.36, nod: 0.6, palms: 1.25, gl: 0.25, gr: 0.85 };
          default: {
            const mid = routeAt(0.5 + 0.25 * wave(t, 0.25, s));
            return { l: rest, r: facing(mid[0], 0.2, mid[1] + 0.05), lean: 0.18, nod: 0.35, palms: 0.4, gl: 0.3, gr: 0.75 };
          }
        }
      };
      return blend(pose(beat.from), pose(beat.to), beat.e);
    }
    case 'bgEarpiece': {
      // `work` is the radio in its cradle (or on the desk, or the car's door handle): taken out,
      // clipped on the belt, the earpiece fitted, a radio check talked into the cuff mic, listened to,
      // a nod, and put back.
      type E = 'take' | 'clip' | 'fit' | 'talk' | 'listen' | 'ok' | 'back';
      const f = beatOf<E>([st('take', 1.4, 0.6), st('clip', 1.2, 0.5), st('fit', 1.8, 0.5), st('talk', 3.2, 0.5), st('listen', 2.4, 0.5), st('ok', 1.2, 0.5), st('back', 1.2, 0.6)], t, ph);
      const belt = front(0.06 * k, -0.19 * k, waist - 0.03 * k);
      const pose = (key: E): Key => {
        switch (key) {
          case 'take':
          case 'back':
            return { l: p0.clone().addScaledVector(left, 0.09).addScaledVector(UP, -0.04), r: p0, lean: 0.12, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.85 };
          case 'clip':
            return { l: front(0.14 * k, 0.05 * k, waist), r: belt, lean: 0.06, nod: 0.3, palms: 0.5, gl: 0.3, gr: 0.8 };
          case 'fit': {
            const push = 0.01 * k * Math.max(0, wave(t, 1.6, s));
            return { l: front(e0.ahead + 0.03 * k, e0.side + 0.02 * k + push, y0 + e0.up), r: belt, lean: 0.02, nod: -0.04, palms: 0.3, gl: 0.75, gr: 0.6 };
          }
          case 'talk':
            return { l: ear, r: cuff.clone().addScaledVector(UP, 0.008 * k * wave(t, 1.3, s)), lean: 0.03, nod: 0.16, palms: 0.15, gl: 0.6, gr: 0.6 };
          case 'listen':
            return { l: ear, r: claspR, lean: 0.02, nod: 0.04 + 0.06 * Math.max(0, wave(t, 0.5, s)) ** 4, palms: 0.4, gl: 0.6, gr: 0.4 };
          default:
            return { l: claspL, r: front(0.24 * k, -0.1 * k, chest), lean: 0.02, nod: 0.12, palms: -0.2, gl: 0.5, gr: 0.95 };
        }
      };
      return blend(pose(f.from), pose(f.to), f.e);
    }
    case 'bgSuitUp': {
      // `work` is the tie on its hook in the locker: reached in for it, the knot done up and pulled
      // snug, the jacket buttoned, each cuff shot, the sunglasses on, the lapels squared in the mirror.
      type S = 'reach' | 'tie' | 'button' | 'cuffL' | 'cuffR' | 'glasses' | 'mirror';
      const f = beatOf<S>([st('reach', 1.8, 0.6), st('tie', 3.4, 0.5), st('button', 2, 0.5), st('cuffL', 1.2, 0.4), st('cuffR', 1.2, 0.5), st('glasses', 2.2, 0.6), st('mirror', 2.6, 0.6)], t, ph);
      const throat = y0 + 0.8 * H;
      const temple = y0 + 0.93 * H;
      const pose = (key: S): Key => {
        switch (key) {
          case 'reach':
            return { l: p0.clone().addScaledVector(left, 0.1).addScaledVector(UP, -0.05), r: p0, lean: 0.12, nod: 0.1, palms: 0.4, gl: 0.3, gr: 0.85 };
          case 'tie': {
            const tug = 0.015 * k * wave(t, 1.4, s);
            return { l: front(0.11 * k, 0.015 * k, throat - 0.01 * k), r: front(0.12 * k, -0.01 * k, throat - 0.06 * k + tug), lean: 0.02, nod: 0.3, palms: 0.2, gl: 0.8, gr: 0.8 };
          }
          case 'button':
            return { l: front(0.15 * k, 0.04 * k, waist + 0.06 * k), r: front(0.15 * k, -0.02 * k, waist + 0.05 * k), lean: 0.06, nod: 0.4, palms: 0.6, gl: 0.75, gr: 0.75 };
          case 'cuffL':
            return { l: front(0.26 * k, 0.04 * k, chest - 0.06 * k), r: front(0.25 * k, 0.07 * k, chest - 0.04 * k), lean: 0.04, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.85 };
          case 'cuffR':
            return { l: front(0.25 * k, -0.07 * k, chest - 0.04 * k), r: front(0.26 * k, -0.04 * k, chest - 0.06 * k), lean: 0.04, nod: 0.3, palms: 0.4, gl: 0.85, gr: 0.3 };
          case 'glasses':
            return { l: front(0.07 * k, 0.075 * k, temple), r: front(0.07 * k, -0.075 * k, temple), lean: 0, nod: -0.05, palms: -0.3, gl: 0.75, gr: 0.75 };
          default:
            return { l: front(0.12 * k, 0.09 * k, chest + 0.06 * k), r: front(0.12 * k, -0.09 * k, chest + 0.06 * k), lean: -0.02, nod: -0.06 + 0.04 * wave(t, 0.4, s), palms: 0.5, gl: 0.85, gr: 0.85 };
        }
      };
      return blend(pose(f.from), pose(f.to), f.e);
    }
    default: {
      // bgWand: `work` is the mannequin's feet; the right hand on the wand's grip, the left held out
      // to the side as if to say "팔 벌려 주세요", and on the pocket that beeps.
      const w = wandAt(t, ph);
      const grip = facing(w.x, w.y - 0.03, WAND.head + WAND.grip);
      const low = THREE.MathUtils.clamp((0.75 - w.y) / 0.58, 0, 1);
      const pat = facing(BEEP.x + 0.03, BEEP.y + 0.02 * Math.max(0, wave(t, 2.2, s)), 0.12);
      const aside = front(0.24 * k, 0.24 * k, waist + 0.14 * k - 0.25 * low * k);
      const patting = w.beep ? sstep(w.u, BEEP.from, BEEP.from + 0.5) * (1 - sstep(w.u, BEEP.to - 0.5, BEEP.to)) : 0;
      return {
        reach: { l: aside.lerp(pat, patting), r: grip, lean: 0.12 + 0.3 * low, nod: 0.25 + 0.3 * low, palms: 0.1, grip: { l: 0.2 + 0.2 * patting, r: 0.95 } },
        crouch: 0.75 * low,
      };
    }
  }
}
