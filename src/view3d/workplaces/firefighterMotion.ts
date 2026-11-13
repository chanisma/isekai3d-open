import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * Two pieces of a fire station's quiet work (2026-11-02, at the user's request), at the one piece, ffInspectBoard.
 *
 * 소방 시설 점검 기록 (fsInspect): an extinguisher looked over in the published order: the gauge's needle in the green, the pin and its seal whole
 * (only tested by hand, never pulled: a pulled pin or a little discharge is what those guides warn against), the hose and nozzle clear, the
 * cylinder's outside down to its foot. Ticks on the clipboard's sheet between, then the log filled in from it.
 *
 * 주민 소방 안전 교육 준비 (fsClass): leaflets and a plain CPR torso set out, and the demonstration practised with a training extinguisher: pull the pin,
 * aim the nozzle at the fire's foot, squeeze the handle, sweep side to side. Stood clear of the table, facing the room.
 *
 * 소화전함 점검 (fsHydrant), the piece's own base use: the hydrant box opened, hose, valve and gauge looked at, ticked, shut.
 *
 * One clock: `fsNow` says all of it for a moment and workplaces/firefighter.ts draws it. Every place is in the piece's frame (x across, y
 * up, z to its front). The prefix isn't `ff`: fastFoodMotion.ts has that for its motions.
 */
export type FsMotion = 'fsInspect' | 'fsClass' | 'fsHydrant';
export const FS_MOTIONS = new Set<string>(['fsInspect', 'fsClass', 'fsHydrant']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
export type P = [number, number, number];
const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const wave = (t: number, hz: number, s = 0) => Math.sin((t * hz + s) * Math.PI * 2);
const pulse = (t: number, hz: number, s = 0) => Math.max(0, wave(t, hz, s)) ** 4;

export const fsPhase = (p: THREE.Vector3) => frac(p.x * 0.431 + p.z * 0.277);

export interface SpotAt {
  x: number;
  z: number;
  yaw: number;
}
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the floor, `ahead`), in the piece's. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, up, s.z - side * n + ahead * c];
}
function inSpot(s: SpotAt, p: P): P {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1], dx * n + dz * c];
}
const mixAt = (a: SpotAt, b: SpotAt, e: number): SpotAt => ({ x: mix(a.x, b.x, e), z: mix(a.z, b.z, e), yaw: mix(a.yaw, b.yaw, e) });

type Step<K extends string> = { key: K; hold: number; move: number };
const st = <K extends string>(key: K, hold: number, move = 0.5): Step<K> => ({ key, hold, move });
const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);
interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = roundOf(steps);
  let u = frac(t / T + phase) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: ss(Math.min(1, u / k.move)), p: 1 };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0 };
}

export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
}
const key = (l: P, r: P, lean: number, nod: number, palms = 0.6, gl = 0.3, gr = 0.3, crouch = 0): Key => ({ l, r, lean, nod, palms, gl, gr, crouch });
function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch, b.crouch, e) };
}
function blended<K extends string>(b: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(b.from, b.e > 0 ? 1 : b.p);
  return b.e > 0 ? mixKey(a, pose(b.to, 0), b.e) : a;
}

/** How the dweller's shoulders stand for a key (see avatar.ts), for checking reach. */
export function shoulderOf(at: SpotAt, sx: number, k: Pick<Key, 'lean' | 'crouch'>): P {
  return sp(at, sx * 0.18, 1.3 - 0.45 * (1 - Math.cos(k.lean)) - 0.37 * k.crouch, 0.45 * Math.sin(k.lean));
}

export type FsTool = 'clip' | 'pen' | 'leaflets' | 'trainer';

export interface FsNow {
  beat: string;
  key: Key;
  at: SpotAt;
  tool: FsTool | null;
  /** Clipboard: where it is (its grip), on its hook or in the hand; the pen on it or in the right hand; ticks and the log so far. */
  clipAt: P;
  penInHand: boolean;
  penAt: P;
  ticks: number;
  log: number;
  /** Hydrant box: how far its door's open; its sheet's ticks. */
  door: number;
  boxTicks: number;
  /** Class: leaflets (null: in the carton), the torso's place, and the training extinguisher: its handle, facing, lever, pin, nozzle, spray. */
  leaflets: P | null;
  torsoZ: number;
  trainerAt: P;
  trainerYaw: number;
  lever: number;
  pinIn: number;
  pinOut: boolean;
  pinInHand: boolean;
  nozzle: P | null;
  spray: boolean;
  aimAt: P;
  demo: boolean;
}

// =============================================================================================
// The piece: hydrant box on the left, the extinguisher on its step in the middle, the table on the right.

export const BOARD = {
  box: { x0: -0.92, x1: -0.42, y0: 0.42, y1: 1.22, z0: -0.4, z1: -0.02 },
  step: { x0: -0.28, x1: 0.12, z0: -0.4, z1: 0.02, h: 0.5 },
  ext: { x: -0.06, z: -0.14, r: 0.075, h: 0.36, gauge: [-0.06, 0.915, -0.058] as P, pin: [-0.01, 0.945, -0.075] as P, foot: [-0.01, 0.56, -0.05] as P, hoseTop: [0.02, 0.9, -0.12] as P, hoseEnd: [0.06, 0.62, -0.08] as P },
  table: { x0: 0.14, x1: 0.95, z0: -0.36, z1: 0.3, top: 0.82 },
  hook: [-0.3, 1.02, 0.05] as P,
};
export const INSPECT_AT: SpotAt = { x: -0.06, z: 0.36, yaw: Math.PI };
const IN_R = sp(INSPECT_AT, -0.13, 1.03, 0.2);
/** The clipboard in the left hand, tipped to be read. */
const CLIP_HOLD: P = [-0.2, 1.1, 0.13];
/** A point on the board's sheet (its own x, y; the board tips back 0.55 rad), from the grip, with the pen's hand standing off along its face. */
const onSheet = (x: number, y: number, off: number): P => [x, 0.853 * y + 0.523 * off, -0.523 * y + 0.853 * off];
/** How far a pen's hand stands from its tip. */
const PEN_OFF = 0.09;
export const CLIP_PEN: P = [0.09, 0.16, 0.03];
export const LOG: P = [0.27, 0.835, 0.12];

type InspectKey = 'take' | 'gauge' | 'tick1' | 'pin' | 'hose' | 'tick2' | 'body' | 'tick3' | 'record' | 'hang';
const INSPECT: Array<Step<InspectKey>> = [st('take', 1.8), st('gauge', 3.0), st('tick1', 1.6), st('pin', 2.6), st('hose', 2.4), st('tick2', 1.6), st('body', 2.2), st('tick3', 1.6), st('record', 3.6), st('hang', 1.6, 0.7)];
export const INSPECT_ROUND = roundOf(INSPECT);
const ORDER = INSPECT.map((x) => x.key);
const past = (k: InspectKey, than: InspectKey) => ORDER.indexOf(k) >= ORDER.indexOf(than);
const tickAt = (i: number, p: number, t: number): P => add(CLIP_HOLD, onSheet(0.04 + 0.03 * ss(p, 0.25, 0.8) + 0.002 * wave(t, 6), 0.07 - i * 0.05, PEN_OFF));

function inspectKey(k: InspectKey, p: number, t: number, s: number): Key {
  const E = BOARD.ext;
  const peek = add(CLIP_HOLD, [0, 0, 0]);
  const homeR = add(CLIP_HOLD, CLIP_PEN);
  const tick = (i: number) => key(peek, mixP(homeR, tickAt(i, p, t), ss(p, 0, 0.25)), 0.16, 0.36, 0.6, 0.65, 0.7);
  switch (k) {
    case 'take':
      return key(mixP(BOARD.hook, CLIP_HOLD, ss(p, 0.2, 0.85)), IN_R, 0.14, 0.2, 0.6, 0.65, 0.3);
    case 'gauge':
      return key(peek, add(E.gauge, [0.05, 0.03 + 0.004 * wave(t, 1.2, s), 0.05]), 0.42, 0.62 + 0.04 * pulse(t, 0.7, s), 0.6, 0.65, 0.45, 0.1);
    case 'tick1':
      return tick(0);
    case 'pin':
      // Felt with finger and thumb: a little wiggle, and it stays in.
      return key(peek, add(E.pin, [0.01 + 0.003 * wave(t, 2.2, s), 0.012, 0.02]), 0.42, 0.6, 0.6, 0.65, 0.65, 0.1);
    case 'hose':
      return key(peek, add(mixP(E.hoseTop, E.hoseEnd, ss(p, 0.1, 0.9)), [0.03, 0, 0.04]), 0.46, 0.62, 0.6, 0.65, 0.55, 0.42);
    case 'tick2':
      return tick(1);
    case 'body':
      return key(peek, add(E.foot, [0.04 * wave(t, 0.5, s), 0.04 + 0.1 * (1 - ss(p, 0, 0.5)), 0.02]), 0.5, 0.68, 0.9, 0.65, 0.2, 0.55);
    case 'tick3':
      return tick(2);
    case 'record': {
      const u = THREE.MathUtils.clamp((p - 0.1) / 0.75, 0, 1);
      const w = add(LOG, [-0.05 + 0.11 * frac(u * 3), PEN_OFF + 0.003 * wave(t, 7), 0.04 - 0.035 * Math.floor(u * 3)]);
      const r = p < 0.1 ? mixP(homeR, w, ss(p, 0, 0.1)) : p > 0.85 ? mixP(w, homeR, ss(p, 0.85, 1)) : w;
      return key(peek, r, 0.36, 0.5, 0.05, 0.65, 0.7);
    }
    default:
      return key(mixP(CLIP_HOLD, BOARD.hook, ss(p, 0.1, 0.8)), IN_R, 0.14, 0.2, 0.6, 0.65, 0.3);
  }
}
function blank(beat: string, k: Key, at: SpotAt): FsNow {
  return {
    beat, key: k, at, tool: null, clipAt: BOARD.hook, penInHand: false, penAt: CLIP_PEN, ticks: 0, log: 0, door: 0, boxTicks: 0,
    leaflets: null, torsoZ: TORSO.home, trainerAt: TRAINER_HOME, trainerYaw: Math.PI, lever: 0, pinIn: 1, pinOut: false, pinInHand: false, nozzle: null, spray: false, aimAt: [0, 0, 0], demo: false,
  };
}
function inspectNow(t: number, ph: number): FsNow {
  const b = beatOf(INSPECT, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const K = blended(b, (x, q) => inspectKey(x, q, t, s));
  const n = blank(k, K, INSPECT_AT);
  n.clipAt = K.l;
  n.tool = k === 'hang' && p > 0.9 ? null : 'clip';
  if (n.tool === null) n.clipAt = BOARD.hook;
  // The pen stays clipped to the board but for a tick or the log, when it's in the right hand.
  n.penInHand = k === 'tick1' || k === 'tick2' || k === 'tick3' || k === 'record';
  n.penAt = K.r;
  n.ticks = past(k, 'tick3') ? (k === 'tick3' ? 2 + (p > 0.6 ? 1 : 0) : 3) : past(k, 'tick2') ? (k === 'tick2' ? 1 + (p > 0.6 ? 1 : 0) : 2) : past(k, 'tick1') ? (k === 'tick1' ? (p > 0.6 ? 1 : 0) : 1) : 0;
  n.log = k === 'record' ? ss(p, 0.1, 0.85) : k === 'hang' ? 1 : 0;
  return n;
}

// =============================================================================================
// 소화전함: the door's on the left, the handle on its right.

export const HYDRANT_AT: SpotAt = { x: -0.52, z: 0.36, yaw: Math.PI };
export const HANDLE_R = 0.46;
const HY = BOARD.box;
/** The handle, the door open `a`. */
const handleAt = (a: number): P => [HY.x0 + HANDLE_R * Math.cos(a), 0.82, HY.z1 + 0.02 + HANDLE_R * Math.sin(a)];
export const HOSE_ROLL: P = [-0.66, 0.78, -0.2];
export const VALVE: P = [-0.5, 1.02, -0.16];
export const BOX_GAUGE: P = [-0.5, 1.13, -0.16];
export const BOX_SHEET: P = [-0.66, 1.29, -0.01];
export const BOX_PEN: P = [-0.36, 1.2, -0.1];
type HydrantKey = 'open' | 'hose' | 'valve' | 'gauge' | 'tick' | 'close';
const HYDRANT: Array<Step<HydrantKey>> = [st('open', 2.2), st('hose', 2.8), st('valve', 2.2), st('gauge', 1.8), st('tick', 2.4), st('close', 2.0, 0.7)];
export const HYDRANT_ROUND = roundOf(HYDRANT);
/** How far the door swings, and how far the hand goes with it before it swings on by itself. */
export const DOOR_OPEN = 1.45;
const HAND_A = 0.7;
const hyL = sp(HYDRANT_AT, 0.13, 1.03, 0.2);
const hyR = sp(HYDRANT_AT, -0.13, 1.03, 0.2);
const onDoor = (a: number): P => (a <= HAND_A ? handleAt(a) : mixP(handleAt(HAND_A), hyR, ss(a, HAND_A, HAND_A + 0.35)));
const doorOf = (k: HydrantKey, p: number) => (k === 'open' ? ss(p, 0.15, 0.95) : k === 'close' ? 1 - ss(p, 0.1, 0.8) : 1);
function hydrantKey(k: HydrantKey, p: number, t: number, s: number): Key {
  const lean = 0.42;
  switch (k) {
    case 'open':
      return key(hyL, onDoor(DOOR_OPEN * doorOf(k, p)), lean - 0.12, 0.4, 0.6, 0.3, 0.75);
    case 'hose':
      return key(add(HOSE_ROLL, [-0.04, 0.1, 0.13]), add(HOSE_ROLL, [0.1 + 0.03 * wave(t, 0.8, s), -0.02, 0.14]), lean, 0.52, 1.0, 0.45, 0.45, 0.2);
    case 'valve':
      return key(hyL, add(VALVE, [0.0, 0.0, 0.09]), lean, 0.42, 0.6, 0.3, 0.8);
    case 'gauge':
      return key(hyL, add(BOX_GAUGE, [0.03, 0.03, 0.09]), lean, 0.3 + 0.04 * pulse(t, 0.7, s), 0.6, 0.3, 0.4);
    case 'tick': {
      const w = add(BOX_SHEET, [-0.03 + 0.07 * ss(p, 0.25, 0.8), 0.085, 0.04]);
      return key(hyL, p < 0.18 ? mixP(BOX_PEN, w, ss(p, 0, 0.18)) : p > 0.82 ? mixP(w, BOX_PEN, ss(p, 0.82, 1)) : w, lean - 0.1, 0.1, 0.05, 0.3, 0.7);
    }
    default:
      return key(hyL, onDoor(DOOR_OPEN * doorOf(k, p)), lean - 0.12, 0.34, 0.6, 0.3, 0.75);
  }
}
function hydrantNow(t: number, ph: number): FsNow {
  const b = beatOf(HYDRANT, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const K = blended(b, (x, q) => hydrantKey(x, q, t, s));
  const n = blank(k, K, HYDRANT_AT);
  n.door = b.e > 0 ? mix(doorOf(b.from, 1), doorOf(b.to, 0), b.e) : doorOf(k, p);
  if (k === 'tick' && p < 0.97) {
    n.tool = 'pen';
    n.penAt = K.r;
  }
  n.boxTicks = k === 'tick' ? ss(p, 0.2, 0.8) : k === 'close' ? 1 : 0;
  return n;
}

// =============================================================================================
// 주민 소방 안전 교육 준비: at the table, then turned to the room with the training extinguisher.

export const CLASS_AT: SpotAt = { x: 0.46, z: 0.62, yaw: Math.PI };
export const DEMO_AT: SpotAt = { x: 0.46, z: 0.78, yaw: 0 };
export const CARTON: P = [0.78, 0.82, 0.06];
const LEAF_FRONT: P = [0.68, 0.86, 0.22];
const LEAF_OUT: P = [0.78, 0.98, 0.06];
export const TORSO = { x: 0.52, home: -0.06, out: 0.08 };
/** The training extinguisher's handle (its grip), standing on the table. */
export const TRAINER_HOME: P = [0.28, 0.51, 0.4];
export const TRAINER = { drop: 0.51, r: 0.07, pin: [0.03, -0.035, 0.06] as P, rest: [-0.09, -0.15, 0.07] as P, top: [-0.05, -0.06, 0.02] as P };
/** The fire's paper mock on the floor, out in front. */
export const FLAME: P = [0.46, 0.02, 1.92];
const nozzleRest = (at: SpotAt, hand: P): P => add(hand, [Math.cos(at.yaw) * TRAINER.rest[0] + Math.sin(at.yaw) * TRAINER.rest[2], TRAINER.rest[1], -Math.sin(at.yaw) * TRAINER.rest[0] + Math.cos(at.yaw) * TRAINER.rest[2]]);
const pinAt = (at: SpotAt, hand: P, out: number): P => add(hand, [Math.cos(at.yaw) * (TRAINER.pin[0] - out) + Math.sin(at.yaw) * TRAINER.pin[2], TRAINER.pin[1], -Math.sin(at.yaw) * (TRAINER.pin[0] - out) + Math.cos(at.yaw) * TRAINER.pin[2]]);
const AIM: P = sp(DEMO_AT, -0.1, 0.96, 0.4);

type ClassKey = 'fetch' | 'square' | 'torso' | 'lift' | 'turn' | 'pull' | 'aim' | 'squeeze' | 'sweep' | 'stop' | 'repin' | 'back' | 'set' | 'clear';
const CLASS: Array<Step<ClassKey>> = [st('fetch', 1.8), st('square', 1.4), st('torso', 2.6), st('lift', 2.0), st('turn', 1.6, 0.3), st('pull', 2.4), st('aim', 2.4), st('squeeze', 2.2, 0.3), st('sweep', 3.6, 0.3), st('stop', 1.2), st('repin', 2.2), st('back', 1.6, 0.3), st('set', 1.8), st('clear', 2.2, 0.7)];
export const CLASS_ROUND = roundOf(CLASS);
const cL = sp(CLASS_AT, 0.13, 1.03, 0.2);
const cR = sp(CLASS_AT, -0.13, 1.03, 0.2);
const sweepX = (t: number, s: number) => 0.14 * wave(t, 0.55, s);

/** Where they stand and face at a beat. */
function atOf(k: ClassKey, p: number): SpotAt {
  switch (k) {
    case 'turn':
      return mixAt(CLASS_AT, DEMO_AT, ss(p, 0, 1));
    case 'pull':
    case 'aim':
    case 'squeeze':
    case 'sweep':
    case 'stop':
    case 'repin':
      return DEMO_AT;
    case 'back':
      return mixAt(DEMO_AT, CLASS_AT, ss(p, 0, 1));
    default:
      return CLASS_AT;
  }
}
function classKey(k: ClassKey, p: number, t: number, s: number): Key {
  const at = atOf(k, p);
  const leftNow = sp(at, 0.16, 1.03, 0.14);
  const rest = nozzleRest(at, leftNow);
  switch (k) {
    case 'fetch':
      return key(cL, mixP(LEAF_OUT, LEAF_FRONT, ss(p, 0.2, 0.9)), 0.44, 0.42, 0.7, 0.3, 0.3);
    case 'square': {
      const o = 0.01 * wave(t, 1.6, s);
      return key(add(LEAF_FRONT, [-0.13, 0.015 + o, 0]), add(LEAF_FRONT, [0.0, 0.03, 0]), 0.36, 0.45, 1.2, 0.1, 0.3);
    }
    case 'torso': {
      const z = mix(TORSO.home, TORSO.out, ss(p, 0.2, 0.85));
      return key([TORSO.x - 0.1, 0.99, z + 0.08], [TORSO.x + 0.1, 0.99, z + 0.08], 0.42, 0.46, 1.4, 0.1, 0.1);
    }
    case 'lift':
      return key(mixP(TRAINER_HOME, sp(CLASS_AT, 0.2, 1.1, 0.22), ss(p, 0.15, 0.95)), cR, mix(0.6, 0.2, ss(p, 0.15, 0.95)), 0.4, 0.6, 0.85, 0.3, 1 - ss(p, 0.15, 0.95));
    case 'turn':
      return key(leftNow, sp(at, -0.13, 1.03, 0.2), 0.08, 0.1, 0.6, 0.85, 0.3);
    case 'pull': {
      const out = 0.1 * ss(p, 0.35, 0.7);
      const pin = add(pinAt(at, leftNow, out), [0, 0.005 * wave(t, 3, s) * (1 - ss(p, 0.35, 0.5)), 0]);
      return key(leftNow, p > 0.82 ? mixP(pin, sp(at, -0.2, 0.98, 0.04), ss(p, 0.82, 1)) : mixP(sp(at, -0.13, 1.03, 0.2), pin, ss(p, 0, 0.2)), 0.1, 0.42, 0.6, 0.85, 0.7);
    }
    case 'aim':
      return key(leftNow, mixP(rest, AIM, ss(p, 0.15, 0.8)), 0.1, 0.24, 0.6, 0.85, 0.75);
    case 'squeeze':
      return key(leftNow, AIM, 0.1, 0.2, 0.6, 0.85 + 0.12 * ss(p, 0.1, 0.5), 0.75);
    case 'sweep':
      return key(leftNow, add(AIM, [sweepX(t, s), 0, 0]), 0.1, 0.2, 0.6, 0.97, 0.75);
    case 'stop':
      return key(leftNow, mixP(AIM, rest, ss(p, 0.15, 0.95)), 0.08, 0.16, 0.6, 0.85, 0.75);
    case 'repin': {
      const pin = pinAt(at, leftNow, 0.1 * (1 - ss(p, 0.3, 0.8)));
      return key(leftNow, mixP(sp(at, -0.2, 0.98, 0.04), pin, ss(p, 0, 0.3)), 0.1, 0.42, 0.6, 0.85, 0.7);
    }
    case 'back':
      return key(leftNow, sp(at, -0.13, 1.03, 0.2), 0.08, 0.1, 0.6, 0.85, 0.3);
    case 'set':
      return key(mixP(sp(CLASS_AT, 0.2, 1.1, 0.22), TRAINER_HOME, ss(p, 0.05, 0.85)), cR, mix(0.2, 0.6, ss(p, 0.05, 0.85)), 0.4, 0.6, 0.85, 0.3, ss(p, 0.05, 0.85));
    default: {
      const z = mix(TORSO.out, TORSO.home, ss(p, 0.1, 0.8));
      return key([TORSO.x - 0.1, 0.99, z + 0.08], mixP(LEAF_FRONT, LEAF_OUT, ss(p, 0.1, 0.85)), 0.44, 0.44, 1.2, 0.1, 0.3);
    }
  }
}
const CLASS_ORDER = CLASS.map((x) => x.key);
const cPast = (k: ClassKey, than: ClassKey) => CLASS_ORDER.indexOf(k) >= CLASS_ORDER.indexOf(than);
function classNow(t: number, ph: number): FsNow {
  const b = beatOf(CLASS, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const at = b.e > 0 ? mixAt(atOf(b.from, 1), atOf(b.to, 0), b.e) : atOf(k, p);
  const K = blended(b, (x, q) => classKey(x, q, t, s));
  const n = blank(k, K, at);
  // Leaflets: out of the carton in the hand, on the table's front until they're cleared.
  if (k === 'fetch' || (k === 'clear' && p < 0.86)) {
    n.tool = 'leaflets';
    n.leaflets = K.r;
  } else if (cPast(k, 'square') && k !== 'clear') n.leaflets = LEAF_FRONT;
  n.torsoZ = k === 'torso' ? mix(TORSO.home, TORSO.out, ss(p, 0.2, 0.85)) : k === 'clear' ? mix(TORSO.out, TORSO.home, ss(p, 0.1, 0.8)) : k === 'fetch' || k === 'square' ? TORSO.home : TORSO.out;
  const inHand = cPast(k, 'lift') && !(k === 'set' && p > 0.9) && k !== 'clear';
  if (inHand) {
    n.tool = 'trainer';
    n.trainerAt = K.l;
    n.trainerYaw = at.yaw;
    n.demo = true;
  }
  n.pinOut = (k === 'pull' && p > 0.82) || k === 'aim' || k === 'squeeze' || k === 'sweep' || k === 'stop' || (k === 'repin' && p < 0.3);
  n.pinInHand = (k === 'pull' && p > 0.2 && p <= 0.82) || (k === 'repin' && p >= 0.3 && p < 0.86);
  n.pinIn = k === 'pull' ? 1 - ss(p, 0.35, 0.7) : k === 'repin' ? ss(p, 0.3, 0.8) : n.pinOut ? 0 : 1;
  if (n.pinInHand) n.penAt = K.r;
  if (k === 'aim' || k === 'squeeze' || k === 'sweep' || k === 'stop') n.nozzle = K.r;
  n.lever = k === 'squeeze' ? ss(p, 0.1, 0.5) : k === 'sweep' ? 1 : k === 'stop' ? 1 - ss(p, 0, 0.2) : 0;
  n.spray = (k === 'squeeze' && p > 0.4) || k === 'sweep';
  n.aimAt = add(FLAME, [(k === 'sweep' ? sweepX(t, s) : 0) * 2.2, 0.03, 0]);
  return n;
}

// =============================================================================================

export function fsNow(m: FsMotion, t: number, ph: number): FsNow {
  return m === 'fsInspect' ? inspectNow(t, ph) : m === 'fsClass' ? classNow(t, ph) : hydrantNow(t, ph);
}

const stepsOf = (m: FsMotion) => (m === 'fsInspect' ? INSPECT : m === 'fsClass' ? CLASS : HYDRANT) as Array<Step<string>>;
/** Seconds into a round where each beat starts (for the lead's shots). */
export function fsBeatTimes(m: FsMotion): Array<[string, number]> {
  let u = 0;
  return stepsOf(m).map((k) => {
    const at: [string, number] = [k.key, u];
    u += k.hold + k.move;
    return at;
  });
}

export function fsDoing(m: FsMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = fsNow(m, t, fsPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
