import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * A 승강기 정비원's work at the 승강기 서비스센터 (2026-10-31, the workplace pipeline). Hands, tools,
 * doors and displays all read this one clock, so what the piece shows (the landing doors parting, the
 * car rising, the 조속기 tripping, the fault code clearing) happens as the hands do it
 * (workplaces/elevatorTech.ts).
 *
 * Every point is in the piece's own frame, metres: x across its front, y up from the floor, z out of
 * its front. Every work mark is at (0, 1, 0), and everyone faces -z. A tool's origin is its grip.
 */
export type EtMotion =
  | 'etPractice' | 'etLearn'
  | 'etMotor' | 'etRope' | 'etFault'
  | 'etCabinet' | 'etGovernor' | 'etRail' | 'etParts'
  | 'etMonitor' | 'etTrap' | 'etDispatch' | 'etRounds'
  | 'etInspect' | 'etCert' | 'etGear' | 'etLoad';
export const ET_MOTIONS = new Set<string>([
  'etPractice', 'etLearn', 'etMotor', 'etRope', 'etFault', 'etCabinet', 'etGovernor', 'etRail', 'etParts',
  'etMonitor', 'etTrap', 'etDispatch', 'etRounds', 'etInspect', 'etCert', 'etGear', 'etLoad',
]);
export type V = readonly [number, number, number];
type Sequence = ReadonlyArray<readonly [string, number]>;
export const frac = (n: number) => ((n % 1) + 1) % 1;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const mix = (a: number, b: number, e: number) => a + (b - a) * e;
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const lerp = (a: V, b: V, e: number): V => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
export const etPhase = (p: THREE.Vector3) => frac(p.x * 0.291 + p.z * 0.537);
const wave = (t: number, hz: number) => Math.sin(t * hz * Math.PI * 2);

const SEQUENCES: Record<EtMotion, Sequence> = {
  etPractice: [['call', 1.8], ['tool', 1.2], ['sill', 2.6], ['shoe', 2.6], ['close', 1.6], ['eye', 2.2], ['shut', 1.6], ['tag', 1.8]],
  etLearn: [['read', 2.2], ['rope', 3], ['cwt', 2.4], ['pit', 2.8], ['door', 2.2], ['note', 2.2]],
  etMotor: [['lock', 1.8], ['cover', 1.8], ['grease', 2.4], ['gap', 2.2], ['turn', 2.6], ['run', 2.8], ['note', 2]],
  etRope: [['gauge', 2.4], ['strip', 2.6], ['pull', 2.8], ['seat', 2.4], ['clamp', 2.2], ['tag', 1.8]],
  etFault: [['code', 2], ['table', 2], ['probe', 2.6], ['out', 1.8], ['fit', 2], ['reset', 1.4], ['run', 2.2]],
  etCabinet: [['lock', 1.8], ['open', 1.6], ['meter', 2.6], ['read', 2], ['tighten', 2.4], ['close', 1.6], ['unlock', 1.4]],
  etGovernor: [['clip', 1.8], ['spin', 3.2], ['trip', 1.8], ['read', 2], ['note', 2], ['reset', 2]],
  etRail: [['plumb', 2.2], ['bar', 1.6], ['high', 2.4], ['low', 2.4], ['shim', 2.6], ['rag', 2.2], ['back', 1.6]],
  etParts: [['open', 1.6], ['scan', 2.2], ['pull', 1.8], ['count', 2.8], ['stow', 1.6], ['flag', 1.8], ['close', 1.6]],
  etMonitor: [['scan', 2.4], ['pick', 1.6], ['cam', 2.4], ['ask', 2.6], ['log', 2.2], ['clear', 1.8]],
  etTrap: [['ack', 1.8], ['headset', 1.6], ['cam', 2.2], ['calm', 3.2], ['send', 2.4], ['off', 1.8]],
  etDispatch: [['look', 2], ['point', 2.2], ['drag', 2.6], ['radio', 2.4], ['eta', 2], ['ok', 1.6]],
  etRounds: [['list', 2], ['take', 1.4], ['place', 2], ['write', 2.6], ['back', 2], ['tick', 1.6]],
  etInspect: [['binder', 1.8], ['open', 1.4], ['line', 2.8], ['law', 2.2], ['tick', 2.2], ['stamp', 1.8], ['file', 1.8]],
  etCert: [['type', 2.4], ['print', 2], ['peel', 1.6], ['stick', 2.2], ['smooth', 1.4], ['photo', 1.8]],
  etGear: [['helmet', 2.2], ['shell', 1.6], ['harness', 2.6], ['hook', 2.2], ['padlock', 2.2], ['tick', 1.8]],
  etLoad: [['list', 1.8], ['door', 1.6], ['box', 1.6], ['in', 1.8], ['coil', 1.6], ['in2', 1.8], ['strap', 1.8], ['shut', 1.6]],
};

export interface Beat {
  key: string;
  previous: string;
  i: number;
  u: number;
  n: number;
  seconds: number;
}
export function etBeat(m: EtMotion, t: number, ph: number): Beat {
  const seq = SEQUENCES[m];
  const duration = seq.reduce((n, [, d]) => n + d, 0);
  const cycle = t / duration + ph;
  let seconds = frac(cycle) * duration;
  for (let i = 0; i < seq.length; i++) {
    const [key, d] = seq[i];
    if (seconds < d || i === seq.length - 1) return { key, previous: seq[(i + seq.length - 1) % seq.length][0], i, u: seconds / d, n: Math.floor(cycle), seconds };
    seconds -= d;
  }
  throw new Error('Empty sequence');
}
/** Whether beat `k` is done with this round. */
export const past = (m: EtMotion, b: Beat, k: string) => b.i > SEQUENCES[m].findIndex(([x]) => x === k);

// =============================================================================================
// The contacts: these also place the controls and racks in the builders.

/** The 승강기 실습 기계 (2 × 2). */
export const MK = {
  face: 0.72,
  stand: [0.22, 1.2] as const,
  button: [0.6, 1.14, 0.76] as V,
  tray: [0.62, 0.9, 0.86] as V,
  sill: [0.02, 0.2, 0.84] as V,
  shoe: [-0.2, 0.2, 0.84] as V,
  edge: [0.02, 1.08, 0.82] as V,
  tag: [-0.6, 1.34, 0.76] as V,
};
/** How far the landing doors are open. */
export function mkDoor(k: string, u: number): number {
  switch (k) {
    case 'call': return sm(u, 0.35, 0.95);
    case 'tool': case 'sill': case 'shoe': return 1;
    case 'close': return 1 - 0.65 * sm(u, 0.25, 1);
    case 'eye': return u < 0.3 ? 0.35 - 0.1 * sm(u, 0, 0.3) : 0.25 + 0.75 * sm(u, 0.3, 0.75);
    case 'shut': return 1 - sm(u, 0.1, 0.95);
    default: return 0;
  }
}
/** How far the car has gone up its shaft while the parts are shown. */
export function mkCar(k: string, u: number): number {
  switch (k) {
    case 'rope': return sm(u, 0.2, 0.9);
    case 'cwt': return 1;
    case 'pit': return 1 - sm(u, 0, 0.6);
    default: return 0;
  }
}

/** The 권상기 정비대 (2 × 1): the machine on the left, the reel in the middle, the control board on the right. */
export const MB = {
  top: 0.82,
  sheave: [-0.2, 1.17, 0.06] as V,
  sheaveR: 0.24,
  grease: [-0.56, 1.2, 0.16] as V,
  brake: [-0.42, 1.28, 0.1] as V,
  lock: [-0.72, 0.68, 0.46] as V,
  cover: [-0.42, 1.36, 0.1] as V,
  coverOff: [-0.72, 0.9, 0.3] as V,
  run: [-0.14, 0.92, 0.36] as V,
  clip: [-0.62, 0.86, 0.34] as V,
  reel: [0.26, 1.02, 0.08] as V,
  bin: [-0.02, 0.86, 0.32] as V,
  board: [0.6, 1.2, 0.17] as V,
  relay: [0.5, 1.13, 0.2] as V,
  relayBox: [0.82, 0.86, 0.3] as V,
  reset: [0.76, 1.32, 0.2] as V,
  card: [0.36, 0.84, 0.32] as V,
  /** Where each use is stood. */
  xMotor: -0.34,
  xRope: -0.06,
  xFault: 0.58,
  z: 0.76,
};

/** The 제어반 (1 × 1): the door is hung at its right. */
export const CB = {
  stand: [-0.1, 0.66] as const,
  breaker: [-0.46, 1.16, 0.0] as V,
  hinge: [0.39, 0.165] as const,
  door: 0.76,
  grip: 0.68,
  gripY: 1.12,
  open: 1.9,
  probeL: [-0.2, 1.08, 0.13] as V,
  probeR: [0.08, 1.08, 0.13] as V,
  led: [0.1, 1.5, 0.1] as V,
  screw: [-0.05, 1.28, 0.13] as V,
};
export function cbDoor(k: string, u: number): number {
  switch (k) {
    case 'open': return CB.open * sm(u, 0.05, 0.95);
    case 'close': return CB.open * (1 - sm(u, 0.05, 0.95));
    case 'lock': case 'unlock': return 0;
    default: return CB.open;
  }
}
/** The door's handle with it swung `a` out. */
export function cbGrip(a: number): V {
  return [CB.hinge[0] - CB.grip * Math.cos(a), CB.gripY, CB.hinge[1] + CB.grip * Math.sin(a) + 0.05];
}

/** The 조속기 시험대 (1 × 1). */
export const GV = {
  wheel: [0, 1.16, 0.08] as V,
  r: 0.2,
  sensor: [0.26, 1.2, 0.18] as V,
  hold: [-0.26, 0.9, 0.32] as V,
  lever: [0.14, 1.03, 0.2] as V,
  clip: [0.28, 0.86, 0.3] as V,
};
/** The tacho's reading (m/min), how fast the sheave's going (turns a second), whether it's tripped. */
export function gvNow(k: string, u: number) {
  if (k === 'spin') return { speed: Math.round(126 * sm(u, 0.05, 1)), turn: 3 * sm(u, 0.05, 1), tripped: false };
  if (k === 'trip') return { speed: u < 0.15 ? 126 : 0, turn: u < 0.15 ? 3 : 0, tripped: u >= 0.15 };
  if (k === 'read' || k === 'note') return { speed: 126, turn: 0, tripped: true };
  if (k === 'reset') return { speed: 0, turn: 0, tripped: u < 0.6 };
  return { speed: 0, turn: 0, tripped: false };
}

/** The 가이드레일 실습대 (2 × 1). */
export const RL = {
  stand: [0, 0.6] as const,
  railX: 0.42,
  z: 0.17,
  high: 1.36,
  low: 0.62,
  bar: 0.97,
  plumb: [-0.42, 1.74, 0.2] as V,
  bob: [-0.42, 0.24, 0.2] as V,
  shim: [0.42, 1.0, 0.24] as V,
  rag: [-0.3, 0.86, 0.34] as V,
};

/** The 부품함 (1 × 1): doors hung at either side, bins on the shelves. */
export const PC = {
  stand: [0, 0.68] as const,
  half: 0.45,
  face: 0.22,
  open: 1.85,
  handleY: 1.04,
  bin: [0.2, 1.1, 0.14] as V,
  binOut: [0.04, 1.08, 0.38] as V,
  flag: [-0.22, 1.32, 0.17] as V,
  scanner: [-0.36, 1.48, 0.2] as V,
};
export function pcDoor(k: string, u: number): number {
  switch (k) {
    case 'open': return PC.open * sm(u, 0.05, 0.95);
    case 'close': return PC.open * (1 - sm(u, 0.05, 0.95));
    default: return PC.open;
  }
}
export const pcHandle = (sx: number, a: number): V => [sx * (PC.half + 0.01 - (PC.half - 0.05) * Math.cos(a)), PC.handleY, PC.face + (PC.half - 0.05) * Math.sin(a) + 0.04];

/** The 원격 감시 단말 (1 × 1): the desk, sat at. */
export const MD = {
  top: 0.74,
  keys: [-0.03, 0.78, 0.16] as V,
  mouse: [0.28, 0.77, 0.18] as V,
  screen: [-0.2, 1.08, -0.1] as V,
  ack: [-0.36, 0.78, 0.14] as V,
  hook: [0.42, 0.98, -0.1] as V,
  /** By the ear (a seated dweller of height H). */
  ear: (H: number): V => [0.13, 0.48 + 0.41 * H, 0.5],
  head: (H: number): V => [0, 0.48 + 0.47 * H, 0.52],
  mic: (H: number): V => [0.14, 0.48 + 0.36 * H, 0.36],
};

/** The 관제 상황판 (3 × 1), stood right up at it. */
export const MW = {
  stand: [0.15, 0.3] as const,
  face: -0.18,
  dot: [-0.22, 1.56, -0.16] as V,
  list: [0.48, 1.36, -0.16] as V,
  radio: [0.58, 0.98, 0.04] as V,
};

/** The 정기 점검 일정표 (2 × 1), stood at. */
export const RB = {
  stand: [0, 0.34] as const,
  face: -0.2,
  tray: [0.48, 0.98, -0.06] as V,
  /** The day each round's magnet goes on (in the board's frame). */
  slot: (n: number): V => {
    const k = ((n % 12) + 12) % 12;
    return [-0.36 + (k % 4) * 0.25, 1.63 - Math.floor(k / 4) * 0.238, -0.18];
  },
  clip: [-0.22, 1.1, 0.04] as V,
};

/** The 정기검사 기록대 (2 × 1): the desk, sat at. */
export const ID = {
  top: 0.74,
  seat: 0.56,
  binder: [0.52, 0.92, -0.14] as V,
  open: [-0.2, 0.78, 0.16] as V,
  law: [-0.46, 0.8, 0.1] as V,
  stamp: [0.2, 0.8, 0.02] as V,
  keys: [0.3, 0.78, 0.24] as V,
  printer: [-0.5, 0.9, -0.02] as V,
  plate: [-0.1, 0.98, -0.1] as V,
};

/** The 안전 장비 걸이 (2 × 1). */
export const SR = {
  stand: [0, 0.56] as const,
  helmet: [-0.58, 1.5, 0.08] as V,
  harness: [-0.04, 1.52, 0.1] as V,
  padlock: [0.56, 1.22, 0.07] as V,
  clip: [0.72, 1.02, 0.18] as V,
  look: [-0.1, 1.22, 0.3] as V,
};

/** The 승강기 서비스 차량 (2 × 1), loaded at its sliding door. */
export const VN = {
  stand: [-0.3, 0.86] as const,
  handle: [-0.82, 1.02, 0.47] as V,
  trolley: [0.34, 0.86] as const,
  shelf: [-0.3, 0.92, 0.1] as V,
  coil: [-0.62, 0.95, 0.12] as V,
  list: [-0.36, 1.06, 0.56] as V,
};

// =============================================================================================
// The hands.

export interface Hands {
  l: V;
  r: V;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
  tap: boolean;
}
const h = (l: V, r: V, extra: Partial<Hands> = {}): Hands => ({ l, r, lean: 0.12, nod: 0.25, palms: 0.7, gl: 0.45, gr: 0.8, crouch: 0, tap: false, ...extra });
const stroke = (p: V, t: number): V => add(p, 0.03 * wave(t, 0.8), 0.03, 0.012 * wave(t, 1.7));
const carry = (a: V, b: V, u: number): V => add(lerp(a, b, sm(u)), 0, 0.08 * Math.sin(Math.PI * sm(u)));
const at = (x: number, z: number, side: number, y = 0.92, ahead = 0.2): V => [x + side * 0.2, y, z - ahead];

function mockupHands(m: EtMotion, k: string, u: number, t: number): Hands {
  const [x, z] = MK.stand;
  const restL = at(x, z, -1);
  const restR = at(x, z, 1);
  if (m === 'etLearn') {
    const book: V = [x - 0.02, 1.06, z - 0.3];
    const bookL = add(book, -0.09, -0.02);
    switch (k) {
      case 'read': return h(bookL, add(book, 0.09, -0.02), { nod: 0.55, palms: 0.9, gl: 0.7, gr: 0.5 });
      case 'rope': return h(bookL, [0.14, 1.9, 0.86], { nod: -0.4, lean: 0, gr: 0.1, palms: -0.2 });
      case 'cwt': return h(bookL, [-0.1, 1.72, 0.84], { nod: -0.25, lean: 0, gr: 0.1, palms: -0.2 });
      case 'pit': return h(add(book, -0.02, -0.5, 0.02), [-0.3, 0.42, 0.84], { nod: 0.65, crouch: 0.42, lean: 0.25, gr: 0.1, palms: -0.2 });
      case 'door': return h(bookL, [-0.02 + 0.08 * wave(t, 0.5), 1.28, 0.84], { nod: 0.08, gr: 0.1, palms: -0.2 });
      default: return h(bookL, stroke(add(book, 0.02, 0.01), t), { nod: 0.55, palms: 1.2 });
    }
  }
  switch (k) {
    case 'call': return h(restL, add(MK.button, 0, 0, 0.02 + 0.02 * (1 - sm(u, 0.1, 0.35))), { gr: 0.2, palms: 0.2, nod: 0.05, lean: 0.2 });
    case 'tool': return h(restL, MK.tray, { nod: 0.5, lean: 0.2 });
    case 'sill': return h([-0.2, 0.42, 0.8], add(MK.sill, 0.04 * wave(t, 0.7)), { crouch: 0.5, nod: 0.65, lean: 0.25 });
    case 'shoe': return h([-0.42, 0.38, 0.8], add(MK.shoe, 0.02 * wave(t, 1.6), 0.02 * wave(t, 1.6)), { crouch: 0.5, nod: 0.6, lean: 0.25, gr: 0.95 });
    case 'close': return h(restL, add(MK.button, 0, -0.04, 0.02), { gr: 0.2, palms: 0.2, nod: 0.05, lean: 0.2 });
    case 'eye': return h(MK.edge, restR, { gl: 0.1, palms: -0.2, nod: 0.25, lean: 0.25 });
    case 'shut': return h(restL, restR, { nod: 0.05, lean: 0 });
    default: return h(add(MK.tag, 0.02, -0.08, 0.1), add(MK.tag, 0.08, 0.02, 0.03), { gl: 0.7, gr: 0.8, nod: 0.1, lean: 0.25 });
  }
}

function benchHands(m: EtMotion, k: string, u: number, t: number): Hands {
  const z = MB.z;
  if (m === 'etMotor') {
    const x = MB.xMotor;
    const restL = at(x, z, -1);
    switch (k) {
      case 'lock': return h(add(MB.lock, -0.02, 0.05), add(MB.lock, 0.04), { nod: 0.6, gl: 0.8, gr: 0.9, crouch: 0.22, lean: 0.25 });
      case 'cover': {
        const p = carry(MB.cover, MB.coverOff, sm(u, 0.1, 0.9));
        return h(add(p, -0.09), add(p, 0.09), { gl: 0.9, gr: 0.9, nod: 0.3, lean: 0.25 });
      }
      case 'grease': return h(add(MB.grease, 0.02, -0.14, 0.14), add(MB.grease, 0.02, 0.01, 0.05), { gl: 0.9, gr: 0.95, nod: 0.25, lean: 0.25 });
      case 'gap': return h(add(MB.brake, -0.1, -0.02, 0.05), add(MB.brake, 0.03 * wave(t, 0.7), -0.03, 0.08), { nod: 0.3, lean: 0.25 });
      case 'turn': {
        const a = u * Math.PI * 1.3;
        return h([MB.sheave[0] - 0.12 - 0.1 * Math.sin(a), MB.sheave[1] + 0.1 * Math.cos(a), MB.sheave[2] + 0.12], [MB.sheave[0] + 0.12 + 0.1 * Math.sin(a), MB.sheave[1] - 0.1 * Math.cos(a), MB.sheave[2] + 0.12], { gl: 0.85, gr: 0.85, nod: 0.25, lean: 0.25 });
      }
      case 'run': return h(restL, add(MB.run, 0, 0.02 * (1 - sm(u, 0.05, 0.2))), { gr: 0.2, palms: 0.9, nod: 0.3 });
      default: {
        const p = MB.clip;
        return h(add(p, -0.05, 0.05), stroke(add(p, 0.08, 0.04), t), { nod: 0.55, palms: 1.2, lean: 0.25, gl: 0.7 });
      }
    }
  }
  if (m === 'etRope') {
    const s = MB.sheave;
    const rim = (a: number): V => [s[0] + MB.sheaveR * Math.cos(a), s[1] + MB.sheaveR * Math.sin(a), s[2] + 0.09];
    switch (k) {
      case 'gauge': return h(rim(2.4), rim(1.4), { gl: 0.85, gr: 0.8, nod: 0.35, lean: 0.25 });
      case 'strip': {
        const a = 2.2 - 1.4 * u;
        return h(rim(a), carry(rim(a - 0.5), add(MB.bin, 0, 0.1), u), { gl: 0.8, gr: 0.9, nod: 0.4, lean: 0.25 });
      }
      case 'pull': {
        const p = lerp(add(MB.reel, -0.04, -0.02, 0.1), rim(0.5), sm(u, 0.1, 0.9));
        return h(add(p, -0.14, -0.02), p, { gl: 0.85, gr: 0.9, nod: 0.3, lean: 0.25 });
      }
      case 'seat': {
        const a = 0.5 + 2.2 * u;
        return h(rim(a + 0.5), rim(a), { gl: 0.85, gr: 0.9, palms: 1, nod: 0.3, lean: 0.25 });
      }
      case 'clamp': return h(add(s, -0.24, -0.26, 0.2), add(s, -0.08 + 0.02 * wave(t, 1.6), -0.26 + 0.02 * wave(t, 1.6), 0.2), { gl: 0.8, gr: 0.95, nod: 0.45, lean: 0.25 });
      default: return h(add(s, -0.14, -0.26, 0.22), add(s, -0.01, -0.24, 0.22), { gl: 0.75, gr: 0.8, nod: 0.4, lean: 0.25 });
    }
  }
  const x = MB.xFault;
  const restL = at(x, z, -1);
  const restR = at(x, z, 1);
  switch (k) {
    case 'code': return h(restL, add(MB.board, 0.04, 0.16, 0.08), { gr: 0.1, palms: -0.1, nod: 0.05 });
    case 'table': return h(add(MB.card, -0.03, 0.02), add(MB.card, 0.1 * wave(t, 0.5), 0.03), { gr: 0.15, palms: 1.2, nod: 0.55, lean: 0.25 });
    case 'probe': return h(add(MB.relay, -0.06, 0, 0.02), add(MB.relay, 0.12, 0, 0.03), { gl: 0.9, gr: 0.9, nod: 0.25, lean: 0.25 });
    case 'out': return h(restL, carry(MB.relay, add(MB.relayBox, -0.08, 0.06, 0), sm(u, 0.15, 1)), { gr: 0.85, nod: 0.3, lean: 0.2 });
    case 'fit': return h(restL, carry(add(MB.relayBox, 0, 0.04), MB.relay, sm(u, 0, 0.8)), { gr: 0.85, nod: 0.3, lean: 0.2 });
    case 'reset': return h(restL, add(MB.reset, 0, 0, 0.03), { gr: 0.2, palms: 0.2, nod: 0.05, lean: 0.2 });
    default: return h(restL, restR, { nod: 0.1, lean: 0 });
  }
}

function cabinetHands(k: string, u: number, t: number): Hands {
  const [x, z] = CB.stand;
  const restL = at(x, z, -1);
  const restR = at(x, z, 1);
  const grip = (a: number) => cbGrip(a);
  switch (k) {
    case 'lock': return h(add(CB.breaker, 0.04, 0.0, 0.2), add(CB.breaker, 0.2, 0.04, 0.22), { gl: 0.9, gr: 0.85, nod: 0.15, lean: 0.2 });
    case 'open': {
      const a = cbDoor(k, u);
      return h(restL, a < 1.1 ? grip(a) : restR, { gr: a < 1.1 ? 0.9 : 0.3, lean: 0.12, nod: 0.08 });
    }
    case 'close': {
      const a = cbDoor(k, u);
      return h(restL, a < 1.1 ? grip(a) : restR, { gr: a < 1.1 ? 0.9 : 0.3, lean: 0.12, nod: 0.08 });
    }
    case 'meter': return h(CB.probeL, CB.probeR, { gl: 0.9, gr: 0.9, nod: 0.2, lean: 0.3 });
    case 'read': return h(restL, add(CB.led, -0.02, -0.08, 0.1), { gr: 0.15, palms: -0.1, nod: -0.1, lean: 0.2 });
    case 'tighten': return h(add(CB.screw, -0.16, -0.06), add(CB.screw, 0.005 * wave(t, 2), 0.005 * wave(t, 2), 0.1), { gl: 0.5, gr: 0.9, nod: 0.15, lean: 0.3 });
    default: return h(add(CB.breaker, 0.04, 0, 0.2), add(CB.breaker, 0.2, -0.02, 0.22), { gl: 0.85, gr: 0.85, nod: 0.15, lean: 0.2 });
  }
}

function governorHands(k: string, u: number, t: number): Hands {
  const restL: V = [-0.2, 0.92, 0.42];
  const restR: V = [0.2, 0.92, 0.42];
  switch (k) {
    case 'clip': return h(add(GV.sensor, -0.14, -0.1, 0.04), GV.sensor, { gl: 0.7, gr: 0.9, nod: 0.3, lean: 0.25 });
    case 'spin': return h(add(GV.hold, 0, 0.03), restR, { gl: 0.2, palms: 1, nod: 0.05 });
    case 'trip': return h(add(GV.hold, 0, 0.03 + 0.05 * sm(u, 0.1, 0.5)), restR, { gl: 0.2, palms: 1, nod: -0.05, lean: 0.02 });
    case 'read': return h(restL, [0.06, 1.42, 0.2], { gr: 0.1, palms: -0.1, nod: -0.02 });
    case 'note': return h(add(GV.clip, -0.1, 0.03), stroke(add(GV.clip, 0.02), t), { nod: 0.55, palms: 1.2, lean: 0.3, gl: 0.7 });
    default: return h(restL, add(GV.lever, 0, 0.03 * sm(u, 0.2, 0.7), 0.02), { gr: 0.9, nod: 0.25, lean: 0.25 });
  }
}

export const railBarAt = (k: string, u: number): V | null => {
  const [, z] = RL.stand;
  const onZ = RL.z + 0.09;
  switch (k) {
    case 'bar': return lerp([0, RL.bar, z - 0.34], [0, RL.bar + 0.1, z - 0.3], sm(u));
    case 'high': return lerp([0, RL.bar + 0.1, z - 0.3], [0, RL.high, onZ], sm(u, 0, 0.4));
    case 'low': return lerp([0, RL.high, onZ], [0, RL.low, onZ], sm(u, 0, 0.4));
    case 'shim': return lerp([0, RL.low, onZ], [0, RL.bar, onZ], sm(u, 0, 0.25));
    case 'back': return lerp([0, RL.bar, onZ], [0, RL.bar, z - 0.34], sm(u, 0, 0.7));
    default: return null;
  }
};
function railHands(k: string, u: number, t: number): Hands {
  const [x, z] = RL.stand;
  const restL = at(x, z, -1);
  const bar = railBarAt(k, u);
  switch (k) {
    case 'plumb': return h(restL, add(RL.plumb, 0, -0.04 - 0.24 * (1 - sm(u, 0.1, 0.75)), 0.03), { gr: 0.75, nod: -0.25 + 0.5 * sm(u, 0.4, 1), lean: 0.1 });
    case 'bar': case 'high': case 'low': case 'back':
      return h(add(bar!, -0.26, 0.02), add(bar!, 0.26, 0.02), { gl: 0.85, gr: 0.85, nod: k === 'low' ? 0.5 : 0.15, crouch: k === 'low' ? 0.36 * sm(u, 0, 0.35) : 0, lean: 0.22 });
    case 'shim': return h(add(RL.shim, -0.3, -0.02, 0.04), add(RL.shim, 0.015 * wave(t, 1.6), 0.015 * wave(t, 1.6), 0.09), { gl: 0.7, gr: 0.95, nod: 0.2, lean: 0.25 });
    default: return h(restL, add(RL.rag, 0.02 * wave(t, 1.2), 0.5 * Math.abs(wave(t, 0.33)), -0.1), { gr: 0.75, palms: 0.1, nod: 0.15, lean: 0.25 });
  }
}

function partsHands(k: string, u: number, t: number): Hands {
  const [x, z] = PC.stand;
  const restL = at(x, z, -1);
  const out = PC.binOut;
  switch (k) {
    case 'open': return h(pcHandle(-1, cbClamp(pcDoor(k, u))), pcHandle(1, cbClamp(pcDoor(k, u))), { gl: 0.9, gr: 0.9, nod: 0.05, lean: 0.1 });
    case 'close': return h(pcHandle(-1, cbClamp(pcDoor(k, u))), pcHandle(1, cbClamp(pcDoor(k, u))), { gl: 0.9, gr: 0.9, nod: 0.05, lean: 0.1 });
    case 'scan': return h(restL, add(PC.bin, 0.03, 0.2 - 0.2 * sm(u, 0, 0.5), 0.2), { gr: 0.9, nod: 0.05 });
    case 'pull': {
      const p = lerp(PC.bin, out, sm(u, 0.1, 0.95));
      return h(add(p, -0.14, 0.02), add(p, 0.14, 0.02), { gl: 0.9, gr: 0.9, nod: 0.2, lean: 0.2 });
    }
    case 'count': return h(add(out, -0.14, 0.02), add(out, 0.04 + 0.06 * wave(t, 0.8), 0.07 + 0.03 * Math.abs(wave(t, 1.6))), { gl: 0.9, gr: 0.75, nod: 0.5 });
    case 'stow': {
      const p = lerp(out, PC.bin, sm(u, 0.05, 0.9));
      return h(add(p, -0.14, 0.02), add(p, 0.14, 0.02), { gl: 0.9, gr: 0.9, nod: 0.2, lean: 0.2 });
    }
    default: return h(restL, add(PC.flag, 0, 0, 0.02), { gr: 0.75, nod: 0.05, lean: 0.2 });
  }

}
const cbClamp = (a: number) => Math.min(a, 1.15);

function monitorHands(m: EtMotion, k: string, u: number, t: number, H: number): Hands {
  const keyL = add(MD.keys, -0.1);
  const keyR = add(MD.keys, 0.1);
  const typing = { palms: 1.4, tap: true, nod: 0.05, lean: 0.14 };
  const typeL = add(keyL, 0, 0.012 * Math.max(0, wave(t, 5.5)));
  const typeR = add(keyR, 0, 0.012 * Math.max(0, -wave(t, 5.5)));
  const mouse = add(MD.mouse, 0.03 * wave(t, 0.35), 0, 0.03 * wave(t, 0.5));
  if (m === 'etTrap') {
    switch (k) {
      case 'ack': return h(keyL, add(MD.ack, 0.02 * 0, 0.03 * (1 - sm(u, 0.05, 0.3))), { gl: 0.3, gr: 0.2, palms: 1.2, nod: 0.15, lean: 0.2 });
      case 'headset': {
        const p = lerp(MD.hook, MD.ear(H), sm(u, 0.05, 0.9));
        return h(keyL, p, { gr: 0.9, palms: 0.5, nod: 0.05 });
      }
      case 'cam': return h(keyL, mouse, { palms: 1.3, nod: 0.02, gr: 0.5 });
      case 'calm': return h(add(keyL, -0.04, 0.08, 0.1), add(MD.mic(H), 0.06 * wave(t, 0.7), -0.08, 0.04), { gl: 0.2, gr: 0.05, palms: -0.2, nod: 0.02 + 0.05 * wave(t, 0.9), lean: 0.05 });
      case 'send': return h(typeL, typeR, typing);
      default: {
        const p = lerp(MD.ear(H), MD.hook, sm(u, 0.05, 0.9));
        return h(keyL, p, { gr: 0.9, palms: 0.5, nod: 0.05 });
      }
    }
  }
  switch (k) {
    case 'scan': return h(keyL, mouse, { palms: 1.3, nod: 0.03, gr: 0.5 });
    case 'pick': return h(keyL, add(MD.mouse, 0, 0.006 * (wave(t, 3) > 0 ? 1 : 0)), { palms: 1.3, nod: 0.03, gr: 0.5 });
    case 'cam': return h(keyL, add(MD.screen, 0.03 * wave(t, 0.5), -0.03, 0.14), { gr: 0.1, palms: -0.1, nod: -0.02, lean: 0.24 });
    case 'ask': return h(add(keyL, 0, 0.0, 0.03), add(MD.ear(H), 0, -0.02, 0.02), { gr: 0.9, palms: 0.6, nod: 0.03, lean: 0.06 });
    case 'log': return h(typeL, typeR, typing);
    default: return h(keyL, add(MD.mouse, 0, 0.006), { palms: 1.3, nod: 0.03, gr: 0.5 });
  }
}

function wallHands(k: string, u: number, t: number): Hands {
  const [x, z] = MW.stand;
  const restL = at(x, z, -1, 0.92, 0.16);
  const restR = at(x, z, 1, 0.92, 0.16);
  switch (k) {
    case 'look': return h(restL, [x + 0.1, 1.24, z - 0.17], { gr: 0.6, palms: 0.2, nod: -0.12, lean: 0 });
    case 'point': return h(restL, add(MW.dot, 0, 0, 0.02), { gr: 0.1, palms: -0.1, nod: -0.15, lean: 0.12 });
    case 'drag': return h(restL, lerp(add(MW.list, 0, 0, 0.02), add(MW.dot, 0.07, -0.05, 0.02), sm(u, 0.1, 0.9)), { gr: 0.15, palms: -0.1, nod: -0.1, lean: 0.12 });
    case 'radio': return h(restL, [x + 0.12, 1.42, z - 0.1], { gr: 0.9, palms: 0.7, nod: -0.02, lean: 0 });
    case 'eta': return h(restL, [0.32 + 0.08 * wave(t, 0.8), 1.08, -0.15], { gr: 0.1, palms: -0.1, nod: -0.05, lean: 0.1 });
    default: return h(restL, restR, { nod: -0.05, lean: 0 });
  }
}

function roundsHands(k: string, u: number, n: number, t: number): Hands {
  const [x, z] = RB.stand;
  const clipL = add(RB.clip, 0, 0.0, 0.02);
  const slot = RB.slot(5 + (((n % 7) + 7) % 7));
  switch (k) {
    case 'list': return h(clipL, add(RB.clip, 0.13, 0.03, 0.03 + 0.03 * wave(t, 0.5)), { gl: 0.85, gr: 0.2, palms: 1.1, nod: 0.5, lean: 0 });
    case 'take': return h(clipL, add(RB.tray, 0, 0.02, 0.02), { gl: 0.85, nod: 0.3, lean: 0.1 });
    case 'place': return h(clipL, carry(RB.tray, add(slot, 0, 0, 0.03), sm(u, 0.05, 0.75)), { gl: 0.85, nod: -0.08, lean: 0.1 });
    case 'write': return h(clipL, add(slot, 0.09 + 0.05 * wave(t, 0.8), -0.03, 0.03), { gl: 0.85, nod: -0.08, lean: 0.1, palms: 0.6 });
    case 'back': return h(clipL, [x + 0.2, 1.02, z - 0.1], { gl: 0.85, gr: 0.3, nod: -0.06, lean: -0.06 });
    default: return h(clipL, stroke(add(RB.clip, 0.06, 0.01, 0.02), t), { gl: 0.85, nod: 0.5, palms: 1.2, lean: 0 });
  }
}

function inspectHands(m: EtMotion, k: string, u: number, t: number): Hands {
  const pageL = add(ID.open, -0.16, 0.0, 0.02);
  const page = ID.open;
  if (m === 'etCert') {
    switch (k) {
      case 'type': return h(add(ID.keys, -0.1, 0.012 * Math.max(0, wave(t, 5.5))), add(ID.keys, 0.1, 0.012 * Math.max(0, -wave(t, 5.5))), { palms: 1.4, tap: true, nod: 0.1, lean: 0.14 });
      case 'print': return h(add(ID.printer, 0.02, -0.08, 0.14), add(ID.keys, 0.1), { palms: 1, gl: 0.3, nod: 0.25, lean: 0.14 });
      case 'peel': return h(add(ID.printer, 0.04, -0.06, 0.2), add(ID.printer, 0.14, -0.05, 0.2), { gl: 0.85, gr: 0.85, nod: 0.3, lean: 0.14 });
      case 'stick': {
        const p = lerp(add(ID.printer, 0.14, -0.05, 0.2), add(ID.plate, 0, 0, 0.05), sm(u, 0.05, 0.7));
        return h(add(p, -0.14, -0.06), p, { gl: 0.4, gr: 0.85, nod: 0.12, lean: 0.25 });
      }
      case 'smooth': return h(add(ID.plate, -0.14, -0.06, 0.05), add(ID.plate, 0.05 * wave(t, 1.5), 0, 0.05), { gl: 0.4, gr: 0.05, palms: 0.1, nod: 0.12, lean: 0.25 });
      default: return h(add(ID.plate, -0.14, -0.06, 0.05), [0.12, 1.14, 0.2], { gr: 0.9, palms: 0.2, nod: 0.08, lean: 0.12 });
    }
  }
  switch (k) {
    case 'binder': {
      const p = carry(ID.binder, add(page, 0.1, 0.02), sm(u, 0.1, 1));
      return h(add(page, -0.14), p, { gr: 0.9, nod: 0.2, lean: 0.2 });
    }
    case 'open': return h(pageL, add(page, 0.18 - 0.3 * sm(u), 0.02 + 0.08 * Math.sin(u * Math.PI)), { gr: 0.5, nod: 0.45, lean: 0.2 });
    case 'line': return h(pageL, add(page, -0.02 + 0.03 * wave(t, 1.2), 0.02, -0.07 + 0.15 * u), { gr: 0.2, palms: 1.3, nod: 0.5, lean: 0.2 });
    case 'law': return h(add(ID.law, 0.0, 0.0, 0.04), add(page, -0.02, 0.02), { gl: 0.15, gr: 0.2, palms: 1.2, nod: 0.45, lean: 0.2 });
    case 'tick': return h(pageL, stroke(add(page, 0.03, 0, 0.02 + 0.04 * Math.floor(u * 3)), t), { palms: 1.2, nod: 0.55, lean: 0.2 });
    case 'stamp': {
      const up = 0.1 * Math.abs(Math.sin(u * Math.PI * 2));
      return h(pageL, u < 0.15 ? add(ID.stamp, 0, 0.04) : add(page, 0.08, 0.06 + up, 0.05), { gr: 0.95, palms: 0.3, nod: 0.5, lean: 0.2 });
    }
    default: {
      const p = carry(add(page, 0.1, 0.02), ID.binder, sm(u, 0, 0.9));
      return h(add(page, -0.14), p, { gr: 0.9, nod: 0.2, lean: 0.2 });
    }
  }
}

function gearHands(k: string, u: number, t: number): Hands {
  const look = SR.look;
  switch (k) {
    case 'helmet': {
      const p = lerp(add(SR.helmet, 0, -0.1, 0.08), add(look, 0, 0.06), sm(u, 0.15, 0.85));
      return h(add(p, -0.11, -0.03), add(p, 0.11, -0.03), { gl: 0.85, gr: 0.85, nod: 0.2 });
    }
    case 'shell': {
      const p = lerp(add(look, 0, 0.06), add(SR.helmet, 0, -0.1, 0.08), sm(u, 0.15, 0.9));
      return h(add(p, -0.11, -0.03), add(p, 0.11, -0.03), { gl: 0.85, gr: 0.85, nod: 0.2 });
    }
    case 'harness': {
      const y = 1.34 - 0.32 * u;
      return h(add(SR.harness, -0.12, -0.14, 0.04), [SR.harness[0] + 0.09, y, SR.harness[2] + 0.06], { gl: 0.9, gr: 0.75, nod: 0.3, lean: 0.2 });
    }
    case 'hook': return h([-0.08, 1.16, 0.24], [0.06, 1.17 + 0.012 * wave(t, 1.3), 0.26], { gl: 0.85, gr: 0.95, nod: 0.4, lean: 0.12 });
    case 'padlock': return h(add(SR.padlock, -0.08, 0, 0.03), add(SR.padlock, 0.03, -0.02 + 0.012 * wave(t, 1.1), 0.04), { gl: 0.85, gr: 0.9, nod: 0.05, lean: 0.25 });
    default: return h(add(SR.clip, -0.1, 0.04, 0.02), stroke(add(SR.clip, 0.02), t), { nod: 0.3, palms: 1.2, lean: 0.25, gl: 0.7 });
  }

}

const lowY = 0.58;
/** Where the trolley's things are lifted from and put in the van. */
export const vnBoxAt = (k: string, u: number): V => {
  const from: V = [VN.trolley[0] - 0.14, lowY, VN.trolley[1] - 0.04];
  if (k === 'box') return lerp(from, [VN.stand[0] + 0.05, 0.94, VN.stand[1] - 0.26], sm(u, 0.2, 1));
  if (k === 'in') return lerp([VN.stand[0] + 0.05, 0.94, VN.stand[1] - 0.26], VN.shelf, sm(u, 0, 0.8));
  return from;
};
export const vnCoilAt = (k: string, u: number): V => {
  const from: V = [VN.trolley[0] + 0.14, lowY, VN.trolley[1] - 0.04];
  if (k === 'coil') return lerp(from, [VN.stand[0] - 0.05, 1.02, VN.stand[1] - 0.28], sm(u, 0.2, 1));
  if (k === 'in2') return lerp([VN.stand[0] - 0.05, 1.02, VN.stand[1] - 0.28], VN.coil, sm(u, 0, 0.8));
  return from;
};
function vanHands(k: string, u: number, t: number): Hands {
  const [x, z] = VN.stand;
  const restL = at(x, z, -1, 0.92, 0.18);
  const list = VN.list;
  switch (k) {
    case 'list': return h(add(list, -0.09, -0.03), stroke(add(list, 0.02), t), { nod: 0.5, palms: 1.2, gl: 0.75, lean: 0 });
    case 'door': return h(restL, [mix(VN.handle[0] + 0.4, VN.handle[0] + 1.1, sm(u, 0.1, 0.9)), VN.handle[1], VN.handle[2] + 0.07], { gr: 0.9, nod: 0.1, lean: 0.18 });
    case 'shut': return h(restL, [mix(VN.handle[0] + 1.1, VN.handle[0] + 0.4, sm(u, 0.1, 0.9)), VN.handle[1], VN.handle[2] + 0.07], { gr: 0.9, nod: 0.1, lean: 0.18 });
    case 'box': case 'in': {
      const p = vnBoxAt(k, u);
      const low = k === 'box' ? 1 - sm(u, 0.2, 0.85) : 0;
      return h(add(p, -0.13, 0.03), add(p, 0.13, 0.03), { gl: 0.9, gr: 0.9, nod: 0.25 + 0.3 * low, crouch: 0.26 * low, lean: 0.24 });
    }
    case 'coil': case 'in2': {
      const p = vnCoilAt(k, u);
      const low = k === 'coil' ? 1 - sm(u, 0.2, 0.85) : 0;
      return h(add(p, -0.12, 0.05), add(p, 0.12, 0.05), { gl: 0.9, gr: 0.9, nod: 0.25 + 0.3 * low, crouch: 0.26 * low, lean: 0.24 });
    }
    default: return h([VN.shelf[0] - 0.15, 1.1, 0.34], [VN.shelf[0] + 0.15, 1.1 + 0.02 * wave(t, 2), 0.34], { gl: 0.85, gr: 0.9, nod: 0.2, lean: 0.26 });
  }

}

function keyHands(m: EtMotion, key: string, u: number, t: number, n: number, H: number): Hands {
  switch (m) {
    case 'etPractice': case 'etLearn': return mockupHands(m, key, u, t);
    case 'etMotor': case 'etRope': case 'etFault': return benchHands(m, key, u, t);
    case 'etCabinet': return cabinetHands(key, u, t);
    case 'etGovernor': return governorHands(key, u, t);
    case 'etRail': return railHands(key, u, t);
    case 'etParts': return partsHands(key, u, t);
    case 'etMonitor': case 'etTrap': return monitorHands(m, key, u, t, H);
    case 'etDispatch': return wallHands(key, u, t);
    case 'etRounds': return roundsHands(key, u, n, t);
    case 'etInspect': case 'etCert': return inspectHands(m, key, u, t);
    case 'etGear': return gearHands(key, u, t);
    case 'etLoad': return vanHands(key, u, t);
  }
}

/** Contacts blended over the first .35 s of each beat, for tools and hands alike. */
export function etNow(m: EtMotion, t: number, ph: number, H = 1.6): Hands & { b: Beat } {
  const b = etBeat(m, t, ph);
  const a = keyHands(m, b.previous, 1, t, b.n, H);
  const c = keyHands(m, b.key, b.u, t, b.n, H);
  const e = sm(b.seconds, 0, 0.35);
  return {
    ...c, b, l: lerp(a.l, c.l, e), r: lerp(a.r, c.r, e),
    lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e),
    palms: mix(a.palms, c.palms, e), gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e),
    crouch: mix(a.crouch, c.crouch, e),
  };
}

export function etDoing(m: EtMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const p = work?.point ?? b.base.clone().add(new THREE.Vector3(0, 1, 0));
  const s = etNow(m, t, etPhase(p), b.height);
  const world = (v: V) => p.clone().addScaledVector(left, -v[0]).addScaledVector(fwd, -v[2]).add(new THREE.Vector3(0, v[1] - 1, 0));
  return {
    reach: { l: world(s.l), r: world(s.r), lean: s.lean, nod: s.nod, palms: s.palms, grip: { l: s.gl, r: s.gr }, tap: s.tap },
    crouch: s.crouch || undefined,
  };
}
