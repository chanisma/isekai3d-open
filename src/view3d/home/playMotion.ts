import * as THREE from 'three';
import type { BodyPose, Reach } from '../avatar';
import type { BodyAt, Doing } from '../activity';
import type { HeldTool } from '../handTool';
import type { Spot } from '../parts';

/*
 * Play and media at home (2026-11-01, at the user's request). In a piece's frame: x across, y up, z out of its front;
 * facing the piece the dweller's right hand is on +x.
 *
 * Shared uses (several dwellers at once) take the first free place of the spot's `userData.slots`, so nobody stands in anyone:
 * - pgWatch (TV, 서서 보기): stood well back; the first to come has the remote, thumbed at each change of channel; the
 *   others fold their arms or put a hand on a hip. A laugh now and then.
 * - pgListen (오디오, 음악 듣기): a slow sway and a nod on the beat, a hand tapping the thigh.
 * - pgDance (오디오, 춤추기): steps side to side on the beat, arms going up in turn, a turn on the spot every eight bars.
 * - pgSing (노래방 기계): the mic to the mouth (the third singer has none and claps), the free hand with the song.
 * - pgGaze (어항): bent to the glass, a finger following one fish, then stood back with a hand at the chin.
 *
 * One at a time:
 * - pgWorkout (TV, 운동 채널): the same four moves as the teacher on the screen, on the same clock (pgMove).
 * - pgDrill (오디오, 안무 연습): counted eights, each pose held; then hands on hips and a look at the feet.
 * - pgAngle (낚시 연못): the rod off its stick, cast, the float watched, a bite, reeled in, the fish unhooked into the creel.
 * - pgBars (정글짐, 놀기): jumps up to the first rung, hand over hand along the bars with the feet off the ground, two
 *   pull-ups at the end, drops, walks back under.
 * - pgPerch (정글짐, 걸터앉기): sat up on the side rail, hands by the hips, the feet on the foot rail, looking about.
 * - pgSwim (수영장): swims lengths in a lane, front crawl then breaststroke, face down at the water's level.
 *
 * pgTread is what a swimmer does if they're ever sat on the pool the old way (no lane for them): sculling, chest deep.
 */
export type PgMotion = 'pgWatch' | 'pgWorkout' | 'pgListen' | 'pgDance' | 'pgDrill' | 'pgSing' | 'pgGaze' | 'pgAngle' | 'pgBars' | 'pgPerch' | 'pgSwim';
export type PgSeat = 'pgTread';
export const PG_MOTIONS = new Set<string>(['pgWatch', 'pgWorkout', 'pgListen', 'pgDance', 'pgDrill', 'pgSing', 'pgGaze', 'pgAngle', 'pgBars', 'pgPerch', 'pgSwim']);
export const PG_SEATS = new Set<string>(['pgTread']);

export type V = [number, number, number];
export const sm = (u: number, a: number, b: number) => {
  const k = Math.min(1, Math.max(0, (u - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
export const fract = (x: number) => x - Math.floor(x);
const mix3 = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const vec = (p: V) => new THREE.Vector3(p[0], p[1], p[2]);

// -------------------------------------------------------------------------------------------------
// The clocks the pieces and the bodies share.

/** The music at home: stereo, karaoke and whoever dances to them. */
export const PG_BPM = 112;
export const PG_BEAT = 60 / PG_BPM;
/** How hard the beat hits at `t`: 1 on the beat, dying away before the next. */
export const pgPulse = (t: number) => Math.exp(-4 * fract(t / PG_BEAT));

/** How long a programme stays on before the channel's changed. */
export const CHANNEL_HOLD = 11;
/** Which channel number is on at `t`, how long it's been on, and how far the thumb's on the button (0–1, just before the change). */
export function pgChannel(t: number) {
  const n = Math.floor(t / CHANNEL_HOLD);
  const since = t - n * CHANNEL_HOLD;
  return { n, since, press: sm(since, CHANNEL_HOLD - 1.1, CHANNEL_HOLD - 0.6) };
}

/** Where a TV teacher (and whoever follows along) is, on the same clock: hands from the feet (ahead, to their left, as a part of their height), the knees and the bend. */
export interface PgMoveNow {
  name: string;
  l: V;
  r: V;
  crouch: number;
  lean: number;
  side: number;
}
export const WORKOUT_NAMES = ['팔 벌려 뛰기', '앉았다 일어나기', '옆구리 늘이기', '무릎 올리기'];
export const MOVE_SECONDS = 10;
export function pgMove(t: number): PgMoveNow {
  const n = Math.floor(t / MOVE_SECONDS);
  const i = ((n % 4) + 4) % 4;
  const b = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 1.6);
  const name = WORKOUT_NAMES[i];
  switch (i) {
    case 0:
      return { name, l: [0.05, 0.14 + 0.2 * (1 - b), 0.62 + 0.46 * b], r: [0.05, -0.14 - 0.2 * (1 - b), 0.62 + 0.46 * b], crouch: 0.06 * (1 - b), lean: 0, side: 0 };
    case 1:
      return { name, l: [0.26, 0.1, 0.8 - 0.26 * b], r: [0.26, -0.1, 0.8 - 0.26 * b], crouch: 0.62 * b, lean: 0.22 * b, side: 0 };
    case 2: {
      const a = Math.sin((t * Math.PI * 2) / 3.2);
      return { name, l: [0.03, 0.12 - 0.12 * a, 0.56 + 0.52 * Math.max(0, -a)], r: [0.03, -0.12 - 0.12 * a, 0.56 + 0.52 * Math.max(0, a)], crouch: 0, lean: 0, side: a };
    }
    default:
      return { name, l: [0.2, 0.17, 0.62 + 0.14 * b], r: [0.2, -0.17, 0.62 + 0.14 * (1 - b)], crouch: 0.12 * b, lean: 0.04, side: 0 };
  }
}

/** The tank's inside (play.ts builds to it), and where its fish are: x, y, z and the way each heads. */
export const TANK = { x: 0.84, y0: 0.76, y1: 1.26, z0: -0.36, z1: 0.26, glass: 0.34 };
export const FISH_N = 9;
export function pgFishAt(i: number, t: number): { x: number; y: number; z: number; heading: number } {
  const n = ((i % FISH_N) + FISH_N) % FISH_N;
  const sp = 0.16 + 0.07 * ((n * 5) % 4);
  const ph = t * sp + n * 1.7;
  const ax = TANK.x * (0.5 + 0.09 * (n % 5));
  const cz = (TANK.z0 + TANK.z1) / 2;
  const az = (TANK.z1 - TANK.z0) * 0.34;
  const x = ax * Math.sin(ph);
  const z = cz + az * Math.cos(ph);
  const y = TANK.y0 + (TANK.y1 - TANK.y0) * (0.3 + 0.45 * fract(n * 0.37)) + 0.03 * Math.sin(ph * 2.3);
  return { x, y, z, heading: Math.atan2(ax * Math.cos(ph), -az * Math.sin(ph)) };
}

/** The bars (play.ts builds to these): a rung's x, their height, the side rails either side, the rail under a percher's feet. */
export const BARS = { y: 1.72, x0: -0.75, step: 0.3, n: 6, half: 0.2, perchZ: 0.3, footY: 1.34, footZ: 0.46, wrist: 0.04 };
export const rungX = (i: number) => BARS.x0 + BARS.step * Math.min(BARS.n - 1, Math.max(0, i));
/** How far up the hands go above the feet, hanging by straight arms, for someone `H` tall. */
const hangReach = (H: number) => 1.13 * H;
/** How high the feet are, hanging (always a bit off the ground, however tall they've got). */
export const hangFeet = (H: number) => Math.max(0.06, BARS.y - BARS.wrist - hangReach(H));

/** The pool (play.ts builds to it): the water's level, the inside, each lane's z, a swimmer's depth. */
export const POOL = { water: 0.5, x: 1.36, z: 0.86, laneZ: 0.46, mid: 0.47, length: 12, edge: 0.03 };
export const poolLane = (lane: number) => Math.max(-1, Math.min(1, lane)) * POOL.laneZ;
/** A swimmer laid out, from their `at` (avatar.ts flyFrame) for someone 1.6 m tall: the crown ahead, the toes behind, and what a tuck takes off the toes' side. */
export const SWIMMER = { ahead: 0.6, behind: 1.0, tucked: 0.27 };
/** Keeps `want` where a body with its ends `a` and `b` from it fits within ±`room`; the middle, if it can't. */
function fit(want: number, a: number, b: number, room: number): number {
  const lo = -room - Math.min(a, b);
  const hi = room - Math.max(a, b);
  return lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, want));
}
/**
 * A swimmer's `at` and heading at `t` in a lane (-1, 0, 1), for someone `s` × 1.6 m tall. The pool is barely wider than a body
 * is long: they swim a length in their lane, stop short of the wall, and turn in a tuck out in the middle of the pool's width,
 * always the same way round, so the whole body stays inside.
 */
export function pgSwimAt(lane: number, t: number, s = 1): { x: number; z: number; heading: number; tuck: number } {
  const LENGTH = 0.32;
  const u = fract((t + (lane + 1) * 2.7) / POOL.length);
  const out = u < 0.5;
  const part = out ? u : u - 0.5;
  const way = out ? 1 : -1;
  const along = sm(part, 0, LENGTH);
  const turn = sm(part, LENGTH, 0.5);
  const heading = Math.PI / 2 + (out ? 0 : Math.PI) + Math.PI * turn;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const tuck = Math.sin(Math.PI * turn);
  const ahead = SWIMMER.ahead * s;
  const behind = (SWIMMER.behind - SWIMMER.tucked * tuck) * s;
  const roomX = POOL.x - POOL.edge;
  const roomZ = POOL.z - POOL.edge;
  // The far wall stops the crown; the wall behind, the toes. A length goes from one to the other; a turn makes up the difference.
  const far = roomX - SWIMMER.ahead * s;
  const near = roomX - SWIMMER.behind * s;
  const wantX = way * (along < 1 ? -near + (far + near) * along : far + (near - far) * turn);
  // Over towards the middle of the pool's width as they come round, the only place the body fits across it.
  const wantZ = (poolLane(lane) + way * 0.12 * (1 - 2 * turn)) * (1 - tuck);
  return { x: fit(wantX, fx * ahead, -fx * behind, roomX), z: fit(wantZ, fz * ahead, -fz * behind, roomZ), heading, tuck };
}

// -------------------------------------------------------------------------------------------------
// The fishing, in the pond's frame.

/** Where the angler stands, the stick the rod rests on, and the water's places. */
export const POND = { st: 1.14, stX: 0.08, water: 0.075, rest: [0.62, 0.86, 0.84] as V, restDir: [-0.2, 0.62, -0.76] as V, float: [-0.14, 0.085, -0.52] as V, creel: [-0.46, 0.3, 0.84] as V, rod: 1.6 };
export const ANGLE_SECONDS = 24;

export interface AngleNow {
  /** The rod's grip (the origin of its group) and the way it points. */
  grip: V;
  dir: V;
  /** On its stick, the hand only reaching for it. */
  resting: boolean;
  /** Where the left hand is: on the butt, on the reel's handle, or free at a point of the piece's. */
  left: 'butt' | 'reel' | 'free';
  leftAt?: V;
  /** The reel handle's turn. */
  crank: number;
  /** How much the tip's bent (0–1). */
  bend: number;
  /** The float, or null with the line in. */
  float: V | null;
  /** The fish, on the line or going to the creel. */
  fish: V | null;
  lean: number;
  nod: number;
}

/** Everything at `u` of a round, for someone `H` tall at time `t`. */
export function pgAngleNow(u: number, H: number, t: number): AngleNow {
  const s = H / 1.6;
  const st = POND.st;
  const X = POND.stX + 0.13 * s;
  const ready: V = [X, 0.97 * s, st - 0.3 * s];
  const readyDir: V = [0, 0.6, -0.8];
  const back: V = [X, 1.28 * s, st - 0.12 * s];
  const backDir: V = [0.04, 0.9, 0.42];
  const flick: V = [X, 1.12 * s, st - 0.42 * s];
  const flickDir: V = [0, 0.36, -0.93];
  const wait: V = [X, 0.93 * s, st - 0.3 * s];
  const waitDir: V = [0.02, 0.42, -0.9];
  const reel: V = [X, 1.03 * s, st - 0.27 * s];
  const reelDir: V = [-0.02, 0.8, -0.6];
  const land: V = [X + 0.03, 1.12 * s, st - 0.24 * s];
  const landDir: V = [-0.36, 0.76, -0.54];
  const hand: V = [POND.stX - 0.12 * s, 1.0 * s, st - 0.33 * s];
  const drop: V = [POND.creel[0] + 0.03, Math.max(0.62, 0.72 * s), POND.creel[2] + 0.02];

  let grip = ready;
  let dir = readyDir;
  const lift = sm(u, 0.03, 0.08);
  if (u < 0.08) {
    grip = mix3(POND.rest, ready, lift);
    dir = mix3(POND.restDir, readyDir, lift);
  } else if (u < 0.14) {
    const k = sm(u, 0.09, 0.14);
    grip = mix3(ready, back, k);
    dir = mix3(readyDir, backDir, k);
  } else if (u < 0.17) {
    const k = sm(u, 0.14, 0.17);
    grip = mix3(back, flick, k);
    dir = mix3(backDir, flickDir, k);
  } else if (u < 0.62) {
    const k = sm(u, 0.17, 0.24);
    const sway = 0.012 * Math.sin(t * 0.9);
    grip = mix3(flick, wait, k);
    dir = mix3(flickDir, [waitDir[0] + sway, waitDir[1], waitDir[2]], k);
  } else if (u < 0.86) {
    const k = sm(u, 0.62, 0.66);
    grip = mix3(wait, reel, k);
    dir = mix3(waitDir, reelDir, k);
  } else if (u < 0.97) {
    const k = sm(u, 0.86, 0.9);
    grip = mix3(reel, land, k);
    dir = mix3(reelDir, landDir, k);
  } else {
    const k = sm(u, 0.97, 1);
    grip = mix3(land, ready, k);
    dir = mix3(landDir, readyDir, k);
  }

  const reeling = u >= 0.64 && u < 0.84;
  const unhook = u >= 0.84 && u < 0.97;
  const f = POND.float;
  let float: V | null = null;
  if (u >= 0.15 && u < 0.2) {
    const k = sm(u, 0.15, 0.2);
    const tip: V = [flick[0] + flickDir[0] * POND.rod, flick[1] + flickDir[1] * POND.rod, flick[2] + flickDir[2] * POND.rod];
    const p = mix3(tip, f, k);
    float = [p[0], p[1] + 0.5 * Math.sin(Math.PI * k), p[2]];
  } else if (u >= 0.2 && u < 0.62) {
    const bob = 0.006 * Math.sin(t * 2.4);
    // Nibbles, then the bite takes it under.
    const nib = u > 0.52 ? 0.012 * Math.max(0, Math.sin(t * 9)) : 0;
    const under = sm(u, 0.595, 0.615);
    float = [f[0] + 0.02 * Math.sin(t * 0.3), f[1] + bob - nib - 0.05 * under, f[2]];
  } else if (u >= 0.62 && u < 0.86) {
    const k = sm(u, 0.64, 0.84);
    const p = mix3(f, hand, k);
    float = [p[0] + 0.05 * Math.sin(t * 7) * (1 - k), p[1] + 0.12 * k, p[2]];
  }

  let fish: V | null = null;
  if (u >= 0.62 && u < 0.84) fish = float && [float[0], Math.max(POND.water - 0.02, float[1] - 0.14), float[2]];
  else if (u >= 0.84 && u < 0.93) fish = mix3(hand, drop, sm(u, 0.88, 0.92));
  else if (u >= 0.93 && u < 0.955) fish = mix3(drop, POND.creel, sm(u, 0.93, 0.955));

  const bite = sm(u, 0.595, 0.62);
  const bend = u < 0.595 ? 0.04 * Math.max(0, Math.sin(t * 2.4)) : u < 0.84 ? 0.35 + 0.65 * bite - 0.25 * sm(u, 0.76, 0.84) + 0.08 * Math.sin(t * 11) : 0;
  return {
    grip,
    dir,
    resting: u < 0.03,
    left: reeling ? 'reel' : unhook ? 'free' : 'butt',
    leftAt: unhook ? mix3(hand, drop, sm(u, 0.88, 0.92)) : undefined,
    crank: reeling ? t * 11 : 0,
    bend,
    float,
    fish,
    lean: u < 0.2 ? 0.05 + 0.12 * sm(u, 0.14, 0.17) : u < 0.62 ? 0.08 : 0.04 - 0.1 * bite * (u < 0.84 ? 1 : 0),
    nod: u < 0.62 ? 0.2 : unhook ? 0.3 : 0.1,
  };
}

// -------------------------------------------------------------------------------------------------
// Timing a use from when it began, and who has which place.

const SECONDS: Partial<Record<PgMotion, number>> = { pgAngle: ANGLE_SECONDS };

/** How far on a use is: told each frame by its pose, it knows when it began. */
export function pgPhase(m: PgMotion, spot: Spot, t: number): number {
  const ud = spot.at.userData;
  if (t - ((ud.pgLast as number | undefined) ?? -1e9) > 0.6) ud.pgBegan = t;
  ud.pgLast = t;
  return fract((t - (ud.pgBegan as number)) / (SECONDS[m] ?? 1));
}
/** Whether the spot is being used now, and how far on (for the piece, which runs before the pose). */
export function pgLive(m: PgMotion, spot: Spot, t: number): number | null {
  const ud = spot.at.userData;
  const last = ud.pgLast as number | undefined;
  if (last === undefined || Math.abs(t - last) > 0.6) return null;
  return fract((t - (ud.pgBegan as number)) / (SECONDS[m] ?? 1));
}
/** Whether anyone's posed at this spot just now. */
export const pgPosed = (spot: Spot | undefined, t: number) => !!spot && Math.abs(t - ((spot.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;

type Claims = Map<number, { slot: number; last: number }>;
/** The place of a shared spot this dweller has, the first free one when they come; those gone a moment give theirs up. */
export function pgClaim(spot: Spot, seed: number, t: number, n: number): number {
  const ud = spot.at.userData;
  const claims = (ud.claims ??= new Map()) as Claims;
  for (const [k, c] of claims) if (Math.abs(t - c.last) > 1) claims.delete(k);
  let mine = claims.get(seed);
  if (!mine) {
    const taken = new Set([...claims.values()].map((c) => c.slot));
    let slot = 0;
    while (slot < n && taken.has(slot)) slot++;
    mine = { slot: slot < n ? slot : ((seed % n) + n) % n, last: t };
    claims.set(seed, mine);
  }
  mine.last = t;
  return mine.slot;
}
/** Whether someone has this place just now. */
export function pgHolds(spot: Spot, slot: number, t: number): boolean {
  const claims = spot.at.userData.claims as Claims | undefined;
  if (!claims) return false;
  for (const c of claims.values()) if (c.slot === slot && Math.abs(t - c.last) < 1) return true;
  return false;
}

/** Sets a tool at `p`, its +y along `y` and its +z as near `z` as that lets it (all in its parent's frame). */
export function pgAim(tool: THREE.Object3D, p: V, y: V, z: V = [0, 1, 0]) {
  const Y = vec(y).normalize();
  const Z = vec(z);
  if (Math.abs(Z.clone().normalize().dot(Y)) > 0.98) Z.set(0, 0, 1);
  Z.addScaledVector(Y, -Z.dot(Y)).normalize();
  const X = new THREE.Vector3().crossVectors(Y, Z);
  tool.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  tool.position.set(p[0], p[1], p[2]);
}

// -------------------------------------------------------------------------------------------------
// The grips.

const G0 = new THREE.Vector3();
const AXIS = new THREE.Vector3(0, 1, 0);
/** The remote: lying in the palm, the buttons up, the thumb along it. */
export const REMOTE_GRIP = { at: G0, axis: AXIS, palm: new THREE.Vector3(0, 0, 1), shape: 'power' as const, radius: 0.022 };
/** The mic: round its handle, the thumb to the head. */
export const MIC_GRIP = { at: G0, axis: AXIS, shape: 'power' as const, radius: 0.017 };
/** The rod: on the cork at the reel with the thumb along the blank; the left low on the butt. */
export const ROD_GRIP = { at: G0, axis: AXIS, palm: new THREE.Vector3(0, 0, 1), shape: 'power' as const, radius: 0.015 };
export const ROD_BUTT = { at: new THREE.Vector3(0, -0.17, 0), axis: AXIS, shape: 'power' as const, radius: 0.015 };
/** The reel's handle on the rod, on the left of it and under, the crank's middle and how far it goes round. */
export const REEL = { at: [-0.075, 0.09, -0.06] as V, r: 0.032 };

// -------------------------------------------------------------------------------------------------
// The poses.

interface Place {
  at: THREE.Vector3;
  yaw: number;
  /** A point from the feet: ahead, to their left, up: all as given, for someone this size. */
  b: (ahead: number, side: number, up: number) => THREE.Vector3;
  /** A point in the piece's frame, in the world. */
  W: (p: V) => THREE.Vector3;
  L: (w: THREE.Vector3) => V;
  s: number;
  H: number;
}

/** Stood at (x, y, z) of the piece, facing `a` (0 is its front, π towards it). */
function place(spot: Spot, x: number, y: number, z: number, a: number, H: number): Place {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const W = (p: V) => par.localToWorld(vec(p));
  const at = W([x, y, z]);
  const face = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(face.x, face.z);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const s = H / 1.6;
  return {
    at,
    yaw,
    W,
    L: (w) => par.worldToLocal(w.clone()).toArray() as V,
    s,
    H,
    b: (ahead, side, up) => at.clone().addScaledVector(fwd, ahead * s).addScaledVector(left, side * s).setY(at.y + up * s),
  };
}

const slotsOf = (spot: Spot) => (spot.at.userData.slots as Array<[number, number]> | undefined) ?? [[spot.at.position.x, spot.at.position.z]];
const standing = (p: Place, reach: Reach, crouch = 0, atOverride?: THREE.Vector3, yaw?: number): { pose: BodyPose; doing: Doing } => ({
  pose: { kind: 'stand', at: atOverride ?? p.at, yaw: yaw ?? p.yaw, crouch },
  doing: { reach, crouch },
});

function watch(spot: Spot, H: number, t: number, seed: number) {
  const slots = slotsOf(spot);
  const slot = pgClaim(spot, seed, t, slots.length);
  const [x, z] = slots[slot];
  const p = place(spot, x, 0, z, Math.PI, H);
  const ch = pgChannel(t);
  // A laugh: shoulders going, a little way into some programmes.
  const laugh = sm(ch.since, 5, 5.3) * (1 - sm(ch.since, 7, 7.4)) * (ch.n % 2 ? 1 : 0);
  const shake = laugh * 0.05 * Math.sin(t * 16);
  const nod = -0.04 + shake;
  if (slot === 0) {
    const tool = spot.at.userData.tool as THREE.Object3D | undefined;
    const k = ch.press;
    const up = 0.9 + 0.2 * k;
    const hand = p.L(p.b(0.26 + 0.14 * k, -0.13, up));
    const hold: HeldTool | undefined = tool ? { tool, lead: 'right', grips: { right: REMOTE_GRIP } } : undefined;
    if (tool) pgAim(tool, hand, [0, 0.22 + 0.25 * k, -1], [0, 1, 0.22]);
    return standing(p, { r: p.b(0.26 + 0.14 * k, -0.13, up), l: p.b(0.08, 0.2, 0.84), nod, palms: 0.2, grip: { l: 0.3, r: 0.7 }, hold });
  }
  if (slot === 1) return standing(p, { l: p.b(0.17, -0.05, 1.08), r: p.b(0.17, 0.06, 1.03), nod, grip: { l: 0.4, r: 0.4 } });
  return standing(p, { r: p.b(0.03, -0.19, 0.93), l: p.b(0.16, 0.13, 0.98 + shake), nod, grip: { l: 0.35, r: 0.3 } });
}

function workout(spot: Spot, H: number, t: number) {
  const p = place(spot, spot.at.position.x, 0, spot.at.position.z, Math.PI, H);
  const m = pgMove(t);
  // A part of the height as the teacher's are; the side bend moves the hands, the head follows.
  const hand = (h: V) => p.b(h[0] * 1.6, h[1] * 1.6, h[2] * 1.6);
  return standing(p, { l: hand(m.l), r: hand(m.r), lean: m.lean, nod: 0.02, grip: { l: 0.25, r: 0.25 }, palms: 0 }, m.crouch);
}

function listen(spot: Spot, H: number, t: number, seed: number) {
  const slots = slotsOf(spot);
  const slot = pgClaim(spot, seed, t, slots.length);
  const [x, z] = slots[slot];
  const p = place(spot, x, 0, z, Math.PI, H);
  const b = pgPulse(t + slot * 0.1);
  const sway = 0.035 * Math.sin((t * Math.PI) / (PG_BEAT * 2));
  const at = p.at.clone();
  return standing(p, { r: p.b(0.05, -0.2, 0.86 + 0.015 * b), l: p.b(0.18, 0.08 + sway, 1.0), nod: 0.04 + 0.1 * b, lean: -0.02, grip: { l: 0.35, r: 0.25 } }, 0.02 + 0.03 * b, at.addScaledVector(new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw)), sway));
}

function dance(spot: Spot, H: number, t: number, seed: number) {
  const slots = slotsOf(spot);
  const slot = pgClaim(spot, seed, t, slots.length);
  const [x, z] = slots[slot];
  const p = place(spot, x, 0, z, Math.PI, H);
  const beats = t / PG_BEAT + slot * 0.5;
  const b = pgPulse(t);
  // Four beats to the left, four to the right; on every eighth bar, a turn on the spot.
  const walk = Math.sin((beats * Math.PI) / 4);
  const bar = fract(beats / 32);
  const spin = sm(bar, 0.9, 1) * Math.PI * 2;
  const across = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const at = p.at.clone().addScaledVector(across, 0.2 * walk * p.s);
  const up = Math.sin((beats * Math.PI) / 2);
  const high = (k: number) => 1.02 + 0.3 * Math.max(0, k);
  const fwd = (a: number, ahead: number, side: number, y: number) => {
    const yaw = p.yaw + a;
    const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const l = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    return at.clone().addScaledVector(f, ahead * p.s).addScaledVector(l, side * p.s).setY(at.y + y * p.s);
  };
  return standing(p, { l: fwd(spin, 0.18, 0.3, high(up)), r: fwd(spin, 0.18, -0.3, high(-up)), nod: -0.05 + 0.08 * b, palms: 0, grip: { l: 0.2, r: 0.2 } }, 0.05 + 0.13 * b, at, p.yaw + spin);
}

function drill(spot: Spot, H: number, t: number) {
  const p = place(spot, spot.at.position.x, 0, spot.at.position.z, Math.PI, H);
  const count = t / (PG_BEAT * 2);
  const n = Math.floor(count);
  // Eight counts of poses, snapped to and held; then eight of looking the feet over with the hands on the hips.
  const i = ((n % 16) + 16) % 16;
  const POSES: Array<{ l: V; r: V; c: number; x: number }> = [
    { l: [0.14, 0.3, 1.0], r: [0.14, -0.3, 1.0], c: 0.06, x: 0 },
    { l: [0.05, 0.14, 1.3], r: [0.2, -0.3, 0.95], c: 0.1, x: 0.14 },
    { l: [0.2, 0.3, 0.95], r: [0.05, -0.14, 1.3], c: 0.1, x: -0.14 },
    { l: [0.28, 0.1, 1.1], r: [0.28, -0.1, 1.1], c: 0.3, x: 0 },
    { l: [0.05, 0.12, 1.34], r: [0.05, -0.12, 1.34], c: 0, x: 0 },
    { l: [0.2, 0.28, 0.85], r: [0.2, -0.28, 0.85], c: 0.26, x: 0.1 },
    { l: [0.2, 0.28, 0.85], r: [0.2, -0.28, 0.85], c: 0.26, x: -0.1 },
    { l: [0.16, 0.08, 1.05], r: [0.16, -0.08, 1.05], c: 0.04, x: 0 },
  ];
  const across = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  if (i >= 8) {
    return standing(p, { l: p.b(0.03, 0.2, 0.92), r: p.b(0.03, -0.2, 0.92), nod: 0.42, lean: 0.1, grip: { l: 0.35, r: 0.35 } }, 0, p.at.clone(), p.yaw + 0.25 * Math.sin((t * Math.PI * 2) / 7));
  }
  const a = POSES[i];
  const c = POSES[(i + 1) % POSES.length];
  const e = sm(count - n, 0.72, 1);
  const hand = (u: V, v: V) => {
    const q = mix3(u, v, i === 7 ? 0 : e);
    return p.b(q[0], q[1], q[2]);
  };
  const shift = a.x + (c.x - a.x) * (i === 7 ? 0 : e);
  return standing(p, { l: hand(a.l, c.l), r: hand(a.r, c.r), nod: 0.1, grip: { l: 0.15, r: 0.15 }, palms: 0 }, a.c + (c.c - a.c) * (i === 7 ? 0 : e), p.at.clone().addScaledVector(across, shift * p.s));
}

function sing(spot: Spot, H: number, t: number, seed: number) {
  const slots = slotsOf(spot);
  const slot = pgClaim(spot, seed, t, slots.length);
  const [x, z] = slots[slot];
  const p = place(spot, x, 0, z, Math.PI, H);
  const b = pgPulse(t);
  const phrase = fract((t + slot * 0.7) / 11);
  const chorus = sm(phrase, 0.5, 0.56) * (1 - sm(phrase, 0.92, 0.98));
  const breath = 0.05 * Math.sin((t * Math.PI * 2) / (PG_BEAT * 4));
  const across = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const sway = 0.04 * Math.sin((t * Math.PI) / (PG_BEAT * 2)) * p.s;
  const at = p.at.clone().addScaledVector(across, sway);
  const mics = spot.at.userData.tools as THREE.Object3D[] | undefined;
  const tool = mics?.[slot];
  const nod = -0.1 - 0.14 * chorus + 0.05 * b;
  const freeHand = p.b(0.3 + 0.1 * chorus, 0.22 + 0.16 * chorus, 1.02 + 0.3 * chorus + breath).addScaledVector(across, sway);
  if (tool) {
    // The head of it at the mouth, the handle going down and out from there.
    const head = p.b(0.12, -0.012, 1.4).addScaledVector(across, sway);
    const hand = head.clone().addScaledVector(p.b(0.12, 0, 0).sub(p.b(0, 0, 0)).normalize(), 0.06).setY(head.y - 0.13);
    const L = p.L(hand);
    const H2 = p.L(head);
    pgAim(tool, L, [H2[0] - L[0], H2[1] - L[1], H2[2] - L[2]], [0, 0, 1]);
    const hold: HeldTool = { tool, lead: 'right', grips: { right: MIC_GRIP }, free: { left: freeHand }, freeShape: 'flat' };
    return standing(p, { r: hand, l: freeHand, nod, lean: -0.02, grip: { r: 0.9, l: 0.15 }, hold }, 0.03 + 0.05 * b, at);
  }
  // No mic left: clapping along.
  const clap = 0.5 + 0.5 * Math.cos((t * Math.PI * 2) / PG_BEAT);
  return standing(p, { l: p.b(0.26, 0.03 + 0.07 * clap, 1.02), r: p.b(0.26, -0.03 - 0.07 * clap, 1.02), nod: nod * 0.6, palms: 0, grip: { l: 0.1, r: 0.1 } }, 0.03 + 0.05 * b, at);
}

function gaze(spot: Spot, H: number, t: number, seed: number) {
  const slots = slotsOf(spot);
  const slot = pgClaim(spot, seed, t, slots.length);
  const [x, z] = slots[slot];
  const p = place(spot, x, 0, z, Math.PI, H);
  const u = fract((t + slot * 3) / 13);
  const close = sm(u, 0.02, 0.1) * (1 - sm(u, 0.62, 0.72));
  const fish = pgFishAt(slot * 3 + Math.floor((t + slot * 3) / 13), t);
  // A finger after it along the glass, as far as an arm goes from here.
  const fx = Math.max(x - 0.42, Math.min(x + 0.42, fish.x));
  const glass = p.W([fx, Math.max(TANK.y0 + 0.08, Math.min(Math.min(TANK.y1, 1.24 * p.s), fish.y)), TANK.glass + 0.035]);
  const chin = p.b(0.13, -0.03, 1.31);
  const r = chin.clone().lerp(glass, close);
  return standing(p, { r, l: p.b(0.12, 0.17, 0.82 + 0.08 * close), nod: -0.02 + 0.2 * close, lean: 0.22 * close, grip: { l: 0.35, r: 0.62 } });
}

function angle(spot: Spot, H: number, t: number) {
  const u = pgPhase('pgAngle', spot, t);
  const p = place(spot, POND.stX, 0, POND.st, Math.PI, H);
  const n = pgAngleNow(u, H, t);
  const off = (q: V) => p.W(q);
  const l = n.leftAt ? off(n.leftAt) : off([n.grip[0] - 0.17 * n.dir[0], n.grip[1] - 0.17 * n.dir[1], n.grip[2] - 0.17 * n.dir[2]]);
  return standing(p, { r: off(n.grip), l, lean: n.lean, nod: n.nod, palms: 0.3, grip: { l: 0.8, r: 0.9 } });
}

/** Where a child on the bars is at `u` of a go: exposed for the bars and the test. */
export const BARS_SECONDS = 20;
export interface BarsNow {
  kind: 'stand' | 'walk';
  x: number;
  y: number;
  a: number;
  crouch: number;
  l?: V;
  r?: V;
  hanging: boolean;
}
export function pgBarsNow(u: number, H: number): BarsNow {
  const s = H / 1.15;
  const feet = hangFeet(H);
  const start = rungX(0) - 0.05;
  const end = rungX(BARS.n - 1) + 0.05;
  const hy = BARS.y - BARS.wrist;
  const onRung = (i: number, side: number): V => [rungX(i), hy, side * 0.085];
  // Facing +x their left is at -z.
  if (u < 0.06) return { kind: 'stand', x: start, y: 0, a: Math.PI / 2, crouch: 0.45 * sm(u, 0.01, 0.05), l: [start + 0.18, 0.72 * s, -0.09], r: [start + 0.18, 0.72 * s, 0.09], hanging: false };
  if (u < 0.09) {
    const k = sm(u, 0.06, 0.09);
    return { kind: 'stand', x: start, y: feet * k, a: Math.PI / 2, crouch: 0.45 * (1 - k), l: onRung(0, -1), r: onRung(0, 1), hanging: k > 0.9 };
  }
  if (u < 0.58) {
    // A rung at a time: the leading hand on, the other brought past it next.
    const moves = 2 * (BARS.n - 1);
    const q = ((u - 0.09) / (0.58 - 0.09)) * moves;
    const i = Math.floor(q);
    const e = sm(q - i, 0.15, 0.85);
    const a0 = Math.floor((i + 1) / 2);
    const b0 = Math.floor(i / 2);
    // Even moves: the right reaches on; odd: the left.
    const r0 = a0;
    const l0 = b0;
    const rightGoes = i % 2 === 0;
    const armArc = 0.09 * Math.sin(Math.PI * e);
    const r: V = rightGoes ? [rungX(r0) + BARS.step * e, hy - armArc, 0.085] : onRung(r0, 1);
    const l: V = rightGoes ? onRung(l0, -1) : [rungX(l0) + BARS.step * e, hy - armArc, -0.085];
    const mid = (r[0] + l[0]) / 2;
    const swing = 0.08 * Math.sin(q * Math.PI);
    return { kind: 'stand', x: mid - 0.05 + swing * 0.4, y: feet + 0.02 * Math.abs(Math.sin(q * Math.PI)), a: Math.PI / 2 + swing, crouch: 0, l, r, hanging: true };
  }
  const last = BARS.n - 1;
  if (u < 0.7) {
    const k = (u - 0.58) / 0.12;
    return { kind: 'stand', x: rungX(last) - 0.02, y: feet + 0.17 * Math.max(0, Math.sin(k * Math.PI * 4)), a: Math.PI / 2, crouch: 0, l: onRung(last, -1), r: onRung(last, 1), hanging: true };
  }
  if (u < 0.75) {
    const k = sm(u, 0.7, 0.73);
    const c = sm(u, 0.7, 0.72) * (1 - sm(u, 0.73, 0.75));
    return { kind: 'stand', x: end, y: feet * (1 - k), a: Math.PI / 2, crouch: 0.42 * c, hanging: false };
  }
  // Round again, under the bars.
  const k = sm(u, 0.76, 0.98);
  const a = u < 0.78 ? Math.PI / 2 + Math.PI * sm(u, 0.75, 0.78) : -Math.PI / 2;
  return { kind: k > 0 && k < 1 ? 'walk' : 'stand', x: end + (start - end) * k, y: 0, a, crouch: 0, hanging: false };
}

function bars(spot: Spot, H: number, t: number) {
  const u = fract(t / BARS_SECONDS);
  const n = pgBarsNow(u, H);
  const p = place(spot, n.x, n.y, 0, n.a, H);
  const reach: Reach = n.l && n.r
    ? { l: p.W(n.l), r: p.W(n.r), nod: n.hanging ? -0.22 : 0.15, palms: 0, grip: { l: n.hanging ? 0.95 : 0.3, r: n.hanging ? 0.95 : 0.3 }, shape: n.hanging ? { l: 'power', r: 'power' } : undefined }
    : {};
  return { pose: { kind: n.kind, at: p.at, yaw: p.yaw, crouch: n.crouch } as BodyPose, doing: { reach, crouch: n.crouch } };
}

function perch(spot: Spot, H: number, t: number): { pose: BodyPose; doing: Doing } {
  const s = H / 1.15;
  const p = place(spot, spot.at.position.x, BARS.y + 0.02, BARS.perchZ, 0, H);
  const look = 0.5 * Math.sin(t * 0.35);
  const wave = sm(fract(t / 12), 0.7, 0.74) * (1 - sm(fract(t / 12), 0.85, 0.89));
  const onRail = (side: number) => p.W([spot.at.position.x + side * 0.2 * s, BARS.y + 0.03, BARS.half + 0.005]);
  const r = onRail(-1).lerp(p.b(0.2, -0.26, 0.74), wave);
  r.y += wave * 0.03 * Math.sin(t * 11);
  return {
    pose: { kind: 'sit', at: p.at, yaw: p.yaw + 0.18 * look, floor: BARS.y - 0.4 * s },
    doing: { reach: { l: onRail(1), r, nod: 0.12 + 0.05 * Math.sin(t * 0.6), palms: 0.8, grip: { l: 0.9, r: 0.9 - 0.7 * wave } } },
  };
}

/** How a swimmer's hands go: front crawl, then breaststroke, by turns; from the middle of the body. */
export function pgStroke(t: number, lane: number, s: number) {
  const round = fract((t + lane * 3) / 18);
  const crawl = round < 0.6;
  const hand = (side: number): V => {
    if (crawl) {
      const p = fract(t * 0.62 + (side > 0 ? 0 : 0.5));
      if (p < 0.5) {
        const e = p * 2;
        return [(0.74 - 0.7 * e) * s, -0.06 - 0.09 * Math.sin(Math.PI * e), side * 0.16 * s];
      }
      const e = (p - 0.5) * 2;
      return [(0.04 + 0.7 * e) * s, 0.04 + 0.2 * Math.sin(Math.PI * e), side * (0.2 - 0.04 * e) * s];
    }
    const p = fract(t * 0.42);
    // Out together in a heart, drawn in under the chin, shot forward.
    if (p < 0.45) {
      const e = sm(p, 0, 0.45);
      return [(0.72 - 0.26 * e) * s, -0.02 - 0.05 * e, side * (0.06 + 0.3 * Math.sin(Math.PI * e * 0.9)) * s];
    }
    if (p < 0.65) {
      const e = sm(p, 0.45, 0.65);
      return [(0.46 - 0.12 * e) * s, -0.07 + 0.05 * e, side * (0.2 - 0.14 * e) * s];
    }
    const e = sm(p, 0.65, 0.9);
    return [(0.34 + 0.38 * e) * s, -0.02, side * 0.06 * s];
  };
  return { l: hand(1), r: hand(-1), crawl };
}

function swim(spot: Spot, H: number, t: number): { pose: BodyPose; doing: Doing } {
  const lane = (spot.at.userData.lane as number | undefined) ?? 0;
  const s = H / 1.6;
  const at = pgSwimAt(lane, t, s);
  const stroke = pgStroke(t, lane, s);
  const bob = 0.015 * Math.sin(t * 3.9);
  const y = POOL.mid + bob - (1 - s) * 0.05;
  const p = place(spot, at.x, y, at.z, at.heading, H);
  // A reach that would go through the wall stops at it. Worked out in the pool's frame, whichever way the pool is turned.
  const fx = Math.sin(at.heading);
  const fz = Math.cos(at.heading);
  const roomX = POOL.x - 0.05;
  const roomZ = POOL.z - 0.05;
  const pt = (q: V) => p.W([
    Math.max(-roomX, Math.min(roomX, at.x + fx * q[0] + fz * q[2])),
    y + q[1],
    Math.max(-roomZ, Math.min(roomZ, at.z + fz * q[0] - fx * q[2])),
  ]);
  return {
    pose: { kind: 'fly', at: p.at, yaw: p.yaw, floor: p.at.y - POOL.mid, kick: Math.sin(t * 7), tuck: at.tuck },
    doing: { reach: { l: pt(stroke.l), r: pt(stroke.r), palms: 0.9, grip: { l: 0.08, r: 0.08 } } },
  };
}

export function pgPose(m: PgMotion, spot: Spot, height: number, t: number, seed: number): { pose: BodyPose; doing: Doing } {
  switch (m) {
    case 'pgWatch':
      return watch(spot, height, t, seed);
    case 'pgWorkout':
      return workout(spot, height, t);
    case 'pgListen':
      return listen(spot, height, t, seed);
    case 'pgDance':
      return dance(spot, height, t, seed);
    case 'pgDrill':
      return drill(spot, height, t);
    case 'pgSing':
      return sing(spot, height, t, seed);
    case 'pgGaze':
      return gaze(spot, height, t, seed);
    case 'pgAngle':
      return angle(spot, height, t);
    case 'pgBars':
      return bars(spot, height, t);
    case 'pgPerch':
      return perch(spot, height, t);
    case 'pgSwim':
      return swim(spot, height, t);
  }
}

/** Sat on a pool the old way: chest deep, sculling at the water. */
export function pgDoing(_m: PgSeat, b: BodyAt, t: number, seed: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const k = b.height / 1.6;
  const a = Math.sin(t * 2.2 + seed);
  const h = (side: number) => b.base.clone().addScaledVector(fwd, (0.3 + 0.05 * a * side) * k).addScaledVector(left, side * (0.28 + 0.06 * a) * k).setY(POOL.water + 0.03);
  return { reach: { l: h(1), r: h(-1), palms: 1.3, nod: -0.05, grip: { l: 0.08, r: 0.08 } } };
}
