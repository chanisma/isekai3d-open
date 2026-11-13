import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * A 택배 물류센터's work (2026-10-27, the workplace pipeline, at the user's request): done the way it's
 * done at a Korean parcel hub. Each motion is a round of beats, each held a while and eased into the
 * next, by the same clock (cxPhase of the spot's work mark) as the piece it's done at, so what the
 * piece shows — the box riding the belt up to the hands, the PDA's beep, the scale's reading, the
 * door of the locker swinging open — is drawn there in step (workplaces/courier.ts):
 *
 * - cxSort (the conveyor): a box watched coming along the belt, taken off it as it reaches the hands,
 *   its label read held up, the PDA taken off the rail and the label scanned (삑), the box turned and
 *   set down on this route's pile on the floor.
 * - cxThroughput (the conveyor's control box): the tablet held, the boxes counted going by, the
 *   panel's count tapped, a note made.
 * - cxStack (the roll cage): a box lifted from the stack on the floor, pushed into the cage, a shelf
 *   at a time, and patted in flush.
 * - cxClipboard (anywhere with a clipboard: the cage's placard, the scale's reading): read, written
 *   up, pointed at.
 * - cxScan (the scanning desk): the next box slid over, the scan gun taken up and the waybill scanned,
 *   the printed label peeled and pressed on, the box pushed off to the tote.
 * - cxLearn (the scanning desk): the 분류 코드표 followed down with a finger, written up, the screen
 *   checked.
 * - cxWeigh (the scale): a box lifted from the floor onto the platform, the reading watched settle,
 *   the label printed and stuck on, the box lifted down the other side.
 * - cxCall (the scale): the phone tapped and held to the ear, a hand on the box's label, a note.
 * - cxLoad (the truck's open back): a box lifted off the hand truck, put on the cargo bed's lip and
 *   shoved in to its place.
 * - cxShelve (the 구역 shelf): a box taken off the trolley, its zone read, put in its cubby.
 * - cxPallet (the pallet jack): the T-handle gripped and pumped to lift the pallet, leant back on
 *   to pull, the lever squeezed to let it down, a look at the load.
 * - cxRepack (the packing table): the flaps opened, bubble wrap pulled off the roll and tucked in,
 *   the flaps folded, the tape gun run along the seam, a new label.
 * - cxReturn (the returns bin): a parcel taken out of the 미확인 side, its 반품 sticker read and
 *   scanned, dropped in the 확인 side.
 * - cxBoard (the 배송 현황판): looked up at, a driver's row followed with a finger, a hand to the chin.
 * - cxLocker (the 무인 택배함): the kiosk tapped, a door pops open, the box put in, the door shut.
 *
 * Kept out of activity.ts (which only hands these motions over) so it imports nothing from it at run
 * time. A pose is worked out against a Frame: `o` places a point by where it is in the piece (x across,
 * y up, z out of its front), `w` by its offset from the spot's work mark, `bd` by the body (to their
 * left, up from the feet, ahead).
 */
export type CxMotion =
  | 'cxSort' | 'cxThroughput' | 'cxStack' | 'cxClipboard' | 'cxScan' | 'cxLearn' | 'cxWeigh' | 'cxCall'
  | 'cxLoad' | 'cxShelve' | 'cxPallet' | 'cxRepack' | 'cxReturn' | 'cxBoard' | 'cxLocker';
export const CX_MOTIONS = new Set<string>(['cxSort', 'cxThroughput', 'cxStack', 'cxClipboard', 'cxScan', 'cxLearn', 'cxWeigh', 'cxCall', 'cxLoad', 'cxShelve', 'cxPallet', 'cxRepack', 'cxReturn', 'cxBoard', 'cxLocker']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset: from where the spot's work mark is (across the floor only), so two pieces aren't in step. */
export const cxPhase = (p: THREE.Vector3) => frac(p.x * 0.371 + p.z * 0.617);
export const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
export const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;

// ---------------------------------------------------------------------------------------------
// Rounds of beats.

/** A round: each beat's key, how long it's held, and how long it takes to ease into the next. */
type Seq = Array<[string, number, number?]>;
export interface Beat {
  /** Which round this is (counts up), the beat's place in it, its key and the next one's. */
  n: number;
  i: number;
  from: string;
  to: string;
  /** How far through the hold (0–1; 1 while easing on). */
  u: number;
  /** How far eased into the next (0 while held). */
  e: number;
}
const MOVE = 0.5;
const lengthOf = (seq: Seq) => seq.reduce((n, [, h, m = MOVE]) => n + h + m, 0);
export function beatOf(seq: Seq, t: number, phase: number): Beat {
  const T = lengthOf(seq);
  const c = t / T + phase;
  const n = Math.floor(c);
  let x = (c - n) * T;
  for (let i = 0; i < seq.length; i++) {
    const [key, hold, move = MOVE] = seq[i];
    const next = seq[(i + 1) % seq.length][0];
    if (x < hold) return { n, i, from: key, to: key, u: hold > 0 ? x / hold : 1, e: 0 };
    x -= hold;
    if (x < move || i === seq.length - 1) return { n, i, from: key, to: next, u: 1, e: sm(Math.min(1, x / move), 0, 1) };
    x -= move;
  }
  return { n, i: 0, from: seq[0][0], to: seq[0][0], u: 0, e: 0 };
}
/** Where in its round (0–1) a beat's hold starts. */
function startOf(seq: Seq, key: string): number {
  let x = 0;
  for (const [k, h, m = MOVE] of seq) {
    if (k === key) return x / lengthOf(seq);
    x += h + m;
  }
  return 0;
}
/** In beat `k` (held, or easing on into the next while still mostly in it). */
const inBeat = (b: Beat, k: string) => (b.from === k && b.e < 0.5) || (b.to === k && b.e >= 0.5);

export type V = readonly [number, number, number];

/** Where things are worked out: the piece's frame (by the work mark), the body's place and axes, how tall they are. */
export interface Frame {
  /** A point in the piece (x across, y up, z out of its front). */
  o(x: number, y: number, z: number): THREE.Vector3;
  /** A point at an offset from the spot's work mark, in the piece's axes. */
  w(dx: number, dy: number, dz: number): THREE.Vector3;
  /** A point from the body: to their left, up from the feet, ahead of them. */
  bd(side: number, up: number, ahead: number): THREE.Vector3;
  /** The body's left. */
  left: THREE.Vector3;
  H: number;
  k: number;
}
/**
 * A frame: the work mark (where it is now, and where it is in the piece), the piece's turn, the feet
 * and the body's turn.
 */
export function frameAt(work: THREE.Vector3, workIn: V, pieceYaw: number, feet: THREE.Vector3, yaw: number, H: number): Frame {
  const c = Math.cos(pieceYaw);
  const s = Math.sin(pieceYaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const w = (dx: number, dy: number, dz: number) => new THREE.Vector3(work.x + dx * c + dz * s, work.y + dy, work.z - dx * s + dz * c);
  return {
    w,
    o: (x, y, z) => w(x - workIn[0], y - workIn[1], z - workIn[2]),
    bd: (side, up, ahead) => feet.clone().addScaledVector(left, side).addScaledVector(fwd, ahead).setY(feet.y + up),
    left,
    H,
    k: H / 1.6,
  };
}
const ov = (f: Frame, v: V, dx = 0, dy = 0, dz = 0) => f.o(v[0] + dx, v[1] + dy, v[2] + dz);

/** Where the hands are, how the body goes with them, and where what's held is (its middle). */
export interface Hands {
  l: THREE.Vector3;
  r: THREE.Vector3;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
  tap?: boolean;
  /** The box (or the tablet, the clipboard, the bubble wrap) carried between the hands. */
  item?: THREE.Vector3;
  /** What's in the right hand (the PDA, the scan gun, the phone, the tape gun, the pen). */
  tool?: THREE.Vector3;
}
type Part = Partial<Hands> & { l: THREE.Vector3; r: THREE.Vector3 };
const hands = (h: Part): Hands => ({ lean: 0, nod: 0.2, palms: 0.4, gl: 0.3, gr: 0.3, crouch: 0, ...h });
function mixV(a: THREE.Vector3 | undefined, b: THREE.Vector3 | undefined, e: number): THREE.Vector3 | undefined {
  if (a && b) return a.clone().lerp(b, e);
  return e < 0.5 ? a : b;
}
function mix(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  return {
    l: a.l.clone().lerp(b.l, e),
    r: a.r.clone().lerp(b.r, e),
    lean: mixN(a.lean, b.lean, e),
    nod: mixN(a.nod, b.nod, e),
    palms: mixN(a.palms, b.palms, e),
    gl: mixN(a.gl, b.gl, e),
    gr: mixN(a.gr, b.gr, e),
    crouch: mixN(a.crouch, b.crouch, e),
    tap: e < 0.5 ? a.tap : b.tap,
    item: mixV(a.item, b.item, e),
    tool: mixV(a.tool, b.tool, e),
  };
}
/** Both hands on a box's sides (`half` its half-width plus a little), the box's middle at `at`. */
function carry(f: Frame, at: THREE.Vector3, half: number, h: Partial<Hands> = {}): Hands {
  return hands({ l: at.clone().addScaledVector(f.left, half), r: at.clone().addScaledVector(f.left, -half), palms: 0, gl: 0.65, gr: 0.65, item: at, ...h });
}
/** A box held at the chest. */
const chest = (f: Frame, up = 0.6, ahead = 0.3) => f.bd(0, up * f.H, ahead * f.k);
/** Bent down to a height: squat for the low ones. */
const lowFor = (f: Frame, y: number) => THREE.MathUtils.clamp((0.75 - (y - f.bd(0, 0, 0).y)) / 0.55, 0, 1);

type KeyFn = (key: string, f: Frame, u: number, t: number, n: number) => Hands;
interface Round {
  seq: Seq;
  key: KeyFn;
  /** Where the spot's work mark is in the piece. */
  work: V;
  /** Which way the spot faces in the piece square on (π: at its front, facing in). */
  base: number;
  /** How far the spot turns from that (to their left +), by beat key and round. */
  turn?: (key: string, n: number) => number;
}

// =============================================================================================
// The conveyor (conveyorBelt, 3 × 1): the belt runs from the infeed chute at the left (-x) to the
// slide at the right (+x) into the bin; the sorter stands at its front.

export const BELT = { x0: -1.15, x1: 1.0, y: 0.8, hw: 0.28, rail: 0.34, n: 3 };
/** The boxes on the belt (index 1 is the one taken off): width, height, depth. */
export const BELT_BOXES: V[] = [[0.4, 0.28, 0.32], [0.32, 0.24, 0.28], [0.36, 0.1, 0.3]];
const SORT_SEQ: Seq = [['watch', 1.6], ['grab', 0.6], ['read', 1.2], ['scan', 1.6], ['place', 1.2]];
/** Where box 1 is along the belt (0–1) as the hands close on it, and so where that is. */
/** How long the sorter's round is (and so how fast the belt runs: its length a round). */
export const SORT_T = lengthOf(SORT_SEQ);
export const PICK_S = frac(startOf(SORT_SEQ, 'grab') + 1 / BELT.n);
export const PICK_X = BELT.x0 + PICK_S * (BELT.x1 - BELT.x0);
export const SORT_WORK: V = [PICK_X, BELT.y + BELT_BOXES[1][1] / 2, 0];
export const SORT_SPOT = { x: PICK_X + 0.04, z: 0.8 };
/** The PDA's holster on the front rail, and this route's pile on the floor to the sorter's right. */
export const SORT_HOLSTER: V = [PICK_X + 0.42, 0.9, 0.37];
export const SORT_PILE = { x: SORT_SPOT.x + 0.6, z: 0.84, y: 0.1 };
/** Box i's place along the belt (0 at the infeed, 1 off the end), by the same clock as the sorter. */
export function beltAt(t: number, ph: number, i: number): number {
  return frac(t / lengthOf(SORT_SEQ) + ph + i / BELT.n);
}
const sortKey: KeyFn = (key, f, u, t, n) => {
  const k = f.k;
  const B = BELT_BOXES[1];
  switch (key) {
    case 'watch': {
      // Hands on the rail, a look up the belt for the next one.
      const sway = 0.01 * wave(t, 0.6);
      return hands({ l: f.o(PICK_X - 0.2, 0.87 + sway, BELT.rail), r: f.o(PICK_X + 0.22, 0.87, BELT.rail), lean: 0.12, nod: 0.35, palms: 1.2, gl: 0.6, gr: 0.6 });
    }
    case 'grab':
      return carry(f, f.w(0, 0.03 * sm(u, 0.5, 1), 0), B[0] / 2 + 0.02, { lean: 0.45, nod: 0.55 });
    case 'read':
      return carry(f, chest(f, 0.6, 0.3), (B[0] / 2 + 0.02) * Math.min(1, k + 0.15), { lean: 0.05, nod: 0.5 });
    case 'scan': {
      // The box on the left forearm; the PDA off the rail, aimed at the label, back in its holster.
      const box = f.bd(0.1 * k, 0.58 * f.H, 0.27 * k);
      const holster = ov(f, SORT_HOLSTER, 0, 0.05, 0);
      const aim = f.bd(-0.1 * k, 0.74 * f.H, 0.38 * k);
      const r = u < 0.22 ? box.clone().lerp(holster, sm(u, 0, 0.2)) : u < 0.8 ? holster.clone().lerp(aim, sm(u, 0.22, 0.38)) : aim.clone().lerp(holster, sm(u, 0.8, 0.98));
      const held = u > 0.18 && u < 0.9;
      return hands({ l: box.clone().addScaledVector(f.left, 0.17), r, item: box, tool: held ? r : undefined, lean: 0.08, nod: 0.45, palms: 0.2, gl: 0.7, gr: held ? 0.85 : 0.4 });
    }
    case 'place': {
      // Turned to the pile, down to its top, and let go.
      const top = SORT_PILE.y + (n % 4) * 0.245 + B[1] / 2;
      const at = f.o(SORT_PILE.x, top, SORT_PILE.z);
      const from = chest(f, 0.58, 0.32);
      const box = from.clone().lerp(at, sm(u, 0.05, 0.6));
      const crouch = lowFor(f, box.y) * 0.9;
      const half = B[0] / 2 + 0.02;
      if (u < 0.7) return carry(f, box, half, { lean: 0.25 + 0.3 * sm(u, 0, 0.6), nod: 0.55, crouch });
      // Let go: the hands come up off it.
      const up = 0.08 * sm(u, 0.7, 1);
      return hands({ l: at.clone().addScaledVector(f.left, half + 0.02).setY(at.y + up), r: at.clone().addScaledVector(f.left, -half - 0.02).setY(at.y + up), lean: 0.5 - 0.3 * sm(u, 0.7, 1), nod: 0.5, palms: 0, crouch: crouch * (1 - 0.6 * sm(u, 0.75, 1)) });
    }
  }
  return hands({ l: f.o(PICK_X - 0.2, 0.87, BELT.rail), r: f.o(PICK_X + 0.2, 0.87, BELT.rail) });
};
/** What the conveyor shows for the sorter: box 1 off the belt (in the hands or on the pile), the PDA's laser and beep, the pile's height. */
export function sortAt(t: number, ph: number): { taken: boolean; laser: boolean; beep: boolean; pda: boolean; pile: number } {
  const b = beatOf(SORT_SEQ, t, ph);
  const s1 = beltAt(t, ph, 1);
  const scanning = b.from === 'scan' && b.e === 0;
  const placed = b.from === 'place' && (b.u >= 0.7 || b.e > 0);
  return { taken: s1 >= PICK_S - 0.002, laser: scanning && b.u > 0.4 && b.u < 0.62, beep: scanning && b.u > 0.5 && b.u < 0.7, pda: !(scanning && b.u > 0.18 && b.u < 0.9), pile: (((b.n % 4) + 4) % 4) + (placed ? 1 : 0) };
}

/** The control box at the conveyor's right end, its screen turned up to the front. */
export const PANEL: V = [0.8, 1.02, 0.4];
export const THRU_SPOT = { x: 0.78, z: 0.84 };
const THRU_SEQ: Seq = [['watch', 2.4], ['tap', 1.4], ['note', 2.0], ['count', 1.8]];
const thruKey: KeyFn = (key, f, u, t) => {
  const k = f.k;
  const tablet = f.bd(0.06 * k, 0.6 * f.H, 0.28 * k);
  switch (key) {
    case 'watch':
      return hands({ l: tablet, r: f.bd(-0.14 * k, 0.56 * f.H, 0.22 * k), item: tablet, nod: 0.15, gl: 0.7 });
    case 'tap': {
      const press = 0.012 * Math.max(0, wave(t, 1.6));
      return hands({ l: f.bd(0.12 * k, 0.5 * f.H, 0.22 * k), r: f.w(0.02 * wave(t, 0.4), 0.03 - press, 0.03), item: f.bd(0.12 * k, 0.5 * f.H, 0.22 * k), lean: 0.2, nod: 0.45, palms: 1.0, gr: 0.2, gl: 0.7 });
    }
    case 'note':
      return hands({ l: tablet, r: tablet.clone().addScaledVector(f.left, -0.04 + 0.03 * wave(t, 1.3)).setY(tablet.y + 0.02 + 0.006 * wave(t, 3.1)), item: tablet, nod: 0.5, palms: 0.9, gl: 0.7, gr: 0.2, tap: true });
    case 'count': {
      // A finger following the boxes along: one, two, three.
      const along = frac(u * 3);
      return hands({ l: tablet, r: f.o(0.15 + 0.4 * along, 1.12, 0.3), item: tablet, nod: 0.25, gl: 0.7, gr: 0.2 });
    }
  }
  return hands({ l: tablet, r: f.bd(-0.14 * k, 0.56 * f.H, 0.22 * k), item: tablet });
};

// =============================================================================================
// The roll cage (parcelCage, 1 × 1): open at the front, a shelf halfway up; the stack it's filled
// from on the floor to the courier's left.

export const CAGE = { z: -0.12, w: 0.72, d: 0.56, deck: 0.18, shelf: 0.92, top: 1.72 };
export const CAGE_BOX: V = [0.32, 0.26, 0.3];
/** The front row's places (x, the box's middle y) filled one a round. */
export const CAGE_SLOTS: Array<[number, number]> = [[-0.17, CAGE.deck + 0.13], [0.17, CAGE.deck + 0.13], [-0.17, CAGE.shelf + 0.15], [0.17, CAGE.shelf + 0.15]];
export const CAGE_SLOT_Z = -0.02;
export const CAGE_STACK = { x: -0.38, z: 0.6 };
export const CAGE_SPOT = { x: 0.06, z: 0.68 };
export const CAGE_WORK: V = [0, 0.6, 0.16];
const STACK_SEQ: Seq = [['pick', 1.3], ['lift', 0.6], ['push', 1.4], ['pat', 0.7]];
const stackKey: KeyFn = (key, f, u, _t, n) => {
  const B = CAGE_BOX;
  const half = B[0] / 2 + 0.02;
  const [sx, sy] = CAGE_SLOTS[((n % 4) + 4) % 4];
  switch (key) {
    case 'pick': {
      const at = f.o(CAGE_STACK.x, 0.26 + B[1] / 2, CAGE_STACK.z);
      const c = lowFor(f, at.y);
      return carry(f, at.clone().setY(at.y + 0.04 * sm(u, 0.6, 1)), half, { lean: 0.45, nod: 0.6, crouch: c * sm(u, 0, 0.4), item: u > 0.5 ? at.clone().setY(at.y + 0.04 * sm(u, 0.6, 1)) : undefined });
    }
    case 'lift':
      return carry(f, chest(f), half, { nod: 0.4 });
    case 'push': {
      const mouth = f.o(sx, sy, 0.32);
      const home = f.o(sx, sy, CAGE_SLOT_Z);
      const box = u < 0.4 ? chest(f).lerp(mouth, sm(u, 0, 0.4)) : mouth.clone().lerp(home, sm(u, 0.4, 0.85));
      const crouch = lowFor(f, sy + f.bd(0, 0, 0).y) * 0.8;
      if (u < 0.85) return carry(f, box, half, { lean: sy < 0.6 ? 0.5 : 0.25, nod: 0.5, crouch });
      return hands({ l: home.clone().addScaledVector(f.left, half + 0.03).setZ(home.z + 0.1), r: home.clone().addScaledVector(f.left, -half - 0.03).setZ(home.z + 0.1), lean: sy < 0.6 ? 0.45 : 0.2, nod: 0.5, palms: 0, crouch });
    }
    case 'pat': {
      const home = f.o(sx, sy, CAGE_SLOT_Z + B[2] / 2 + 0.03);
      const push = 0.015 * Math.max(0, wave(_t, 2));
      const crouch = lowFor(f, sy + f.bd(0, 0, 0).y) * 0.7;
      return hands({ l: f.o(-CAGE.w / 2 + 0.02, 1.0, 0.18), r: home.clone().setZ(home.z - push), lean: sy < 0.6 ? 0.4 : 0.15, nod: 0.45, palms: 1.3, gl: 0.8, gr: 0.1, crouch });
    }
  }
  return carry(f, chest(f), half);
};
/** The cage's front row filled so far, and whether the stack's top box is off it. */
export function stackAt(t: number, ph: number): { filled: number; topOff: boolean } {
  const b = beatOf(STACK_SEQ, t, ph);
  const done = (b.from === 'push' && (b.u >= 0.85 || b.e > 0)) || b.from === 'pat';
  return { filled: (((b.n % 4) + 4) % 4) + (done ? 1 : 0), topOff: (b.from === 'pick' && b.u > 0.5) || b.from === 'lift' || (b.from === 'push' && b.u < 0.85 && b.e === 0) || (b.from === 'pick' && b.e > 0) };
}

// =============================================================================================
// A clipboard (the cage's placard, the scale's reading): offsets from the work mark only.

const CLIP_SEQ: Seq = [['read', 1.8], ['write', 2.2], ['point', 1.6]];
const clipKey: KeyFn = (key, f, u, t) => {
  const k = f.k;
  const board = f.bd(0.07 * k, 0.63 * f.H, 0.3 * k);
  switch (key) {
    case 'read':
      return hands({ l: board, r: f.w(0.01 * wave(t, 0.5), 0.01, 0.04), item: board, lean: 0.1, nod: 0.15, gl: 0.75, gr: 0.2 });
    case 'write':
      return hands({ l: board, r: board.clone().addScaledVector(f.left, -0.05 + 0.025 * wave(t, 1.2)).setY(board.y + 0.015 + 0.006 * wave(t, 3.3)), tool: board.clone().addScaledVector(f.left, -0.05 + 0.025 * wave(t, 1.2)).setY(board.y + 0.03), item: board, nod: 0.5, gl: 0.75, gr: 0.8 });
    case 'point': {
      const low = f.bd(0.17 * k, 0.5 * f.H, 0.2 * k);
      return hands({ l: low, r: f.w(0.12 * wave(t, 0.5) * sm(u, 0, 0.2), 0.04, 0.22), item: low, nod: 0.1, gl: 0.75, gr: 0.15 });
    }
  }
  return hands({ l: board, r: f.bd(-0.12 * k, 0.55 * f.H, 0.2 * k), item: board });
};

// =============================================================================================
// The scanning desk (scannerDesk, 1 × 1): a standing steel bench, the box pile on the left, the
// scan gun's holster at the front right, the label printer at the back right, the monitor on its arm.

export const DESK = { y: 0.9, z: -0.15, front: 0.15 };
export const DESK_BOX: V = [0.3, 0.2, 0.26];
export const DESK_IN: V = [-0.33, DESK.y, -0.05];
export const DESK_MID: V = [0.02, DESK.y, -0.06];
export const DESK_OUT: V = [0.36, DESK.y, -0.06];
export const DESK_HOLSTER: V = [0.38, 0.98, 0.09];
export const DESK_PRINTER: V = [0.27, 1.0, -0.3];
export const DESK_SPOT = { x: 0, z: 0.44 };
export const DESK_WORK: V = [DESK_MID[0], DESK.y + DESK_BOX[1], DESK_MID[2]];
const SCAN_SEQ: Seq = [['take', 1.0], ['gun', 1.8], ['stick', 1.6], ['push', 0.9]];
const scanKey: KeyFn = (key, f, u) => {
  const B = DESK_BOX;
  const half = B[0] / 2 + 0.02;
  const mid = ov(f, DESK_MID, 0, B[1] / 2, 0);
  switch (key) {
    case 'take': {
      const top = ov(f, DESK_IN, 0, B[1] * 1.5, 0);
      const box = top.clone().lerp(mid, sm(u, 0.25, 0.9));
      return carry(f, box, half, { lean: 0.25, nod: 0.55, item: u > 0.2 ? box : undefined });
    }
    case 'gun': {
      const holster = ov(f, DESK_HOLSTER, 0, 0.04, 0);
      const aim = f.o(DESK_MID[0] + 0.08, DESK.y + 0.42, DESK_MID[2] + 0.2);
      const r = u < 0.2 ? mid.clone().addScaledVector(f.left, -half).lerp(holster, sm(u, 0, 0.18)) : u < 0.8 ? holster.clone().lerp(aim, sm(u, 0.2, 0.36)) : aim.clone().lerp(holster, sm(u, 0.8, 0.98));
      const held = u > 0.16 && u < 0.88;
      return hands({ l: mid.clone().addScaledVector(f.left, half), r, tool: held ? r : undefined, lean: 0.2, nod: 0.55, palms: 0.1, gl: 0.5, gr: held ? 0.85 : 0.4 });
    }
    case 'stick': {
      const slot = ov(f, DESK_PRINTER, 0, 0.02, 0.04);
      const onTop = ov(f, DESK_MID, 0.0, B[1] + 0.02, 0.02);
      const r = u < 0.35 ? mid.clone().addScaledVector(f.left, -half).lerp(slot, sm(u, 0, 0.3)) : u < 0.7 ? slot.clone().lerp(onTop, sm(u, 0.38, 0.62)) : onTop.clone().add(new THREE.Vector3(0.04 * Math.sin((u - 0.7) * 20), 0, 0));
      return hands({ l: mid.clone().addScaledVector(f.left, half), r, lean: 0.25, nod: 0.6, palms: u > 0.6 ? 1.3 : 0.4, gl: 0.5, gr: 0.6 });
    }
    case 'push': {
      const out = ov(f, DESK_OUT, 0, B[1] / 2, 0);
      const box = mid.clone().lerp(out, sm(u, 0.1, 0.8));
      return hands({ l: box.clone().addScaledVector(f.left, half), r: box.clone().addScaledVector(f.left, -half).setY(box.y + 0.08), item: u < 0.85 ? box : undefined, lean: 0.25, nod: 0.5, palms: 0.1, gl: 0.3, gr: 0.3 });
    }
  }
  return carry(f, mid, half);
};
/** What the desk shows: the box (pile top off, on the desk, gone to the tote), the laser, the beep, the screen, the new label. */
export function scanAt(t: number, ph: number): { topOff: boolean; onDesk: boolean; laser: boolean; beep: boolean; gun: boolean; screen: 'idle' | 'read' | 'done'; label: 0 | 1 | 2 } {
  const b = beatOf(SCAN_SEQ, t, ph);
  const held = b.e === 0;
  const gunning = b.from === 'gun' && held;
  const sticking = b.from === 'stick';
  const label: 0 | 1 | 2 = sticking ? (b.u > 0.6 || b.e > 0 ? 2 : b.u > 0.3 ? 1 : 0) : b.from === 'push' ? 2 : 0;
  const screen = b.from === 'take' ? 'idle' : gunning && b.u < 0.5 ? 'read' : 'done';
  return { topOff: !(b.from === 'take' && b.u < 0.2 && held), onDesk: (b.from === 'take' && b.e > 0) || b.from === 'gun' || sticking, laser: gunning && b.u > 0.38 && b.u < 0.55, beep: gunning && b.u > 0.48 && b.u < 0.66, gun: !(gunning && b.u > 0.16 && b.u < 0.88), screen, label };
}

/** Learning the 분류 코드: the laminated code chart on the desk's left, the notebook on its right. */
export const DESK_CHART: V = [-0.17, DESK.y, 0.0];
export const DESK_BOOK: V = [0.2, DESK.y, 0.01];
const LEARN_SEQ: Seq = [['trace', 2.4], ['write', 2.0], ['look', 1.4]];
const learnKey: KeyFn = (key, f, u, t) => {
  const row = Math.floor(u * 5) / 5;
  switch (key) {
    case 'trace':
      return hands({ l: ov(f, DESK_CHART, -0.08 + 0.14 * frac(u * 5), 0.015, -0.07 + 0.13 * row), r: ov(f, DESK_BOOK, 0, 0.02, 0.04), lean: 0.3, nod: 0.65, palms: 1.2, gl: 0.15, gr: 0.4 });
    case 'write': {
      const pen = ov(f, DESK_BOOK, 0.03 * wave(t, 1.1), 0.02 + 0.005 * wave(t, 3.5), 0.02 * wave(t, 0.3));
      return hands({ l: ov(f, DESK_CHART, 0.02, 0.015, 0.02), r: pen, tool: pen, lean: 0.3, nod: 0.65, palms: 1.2, gl: 0.2, gr: 0.8 });
    }
    case 'look':
      return hands({ l: f.o(-0.2, DESK.y + 0.02, DESK.front - 0.02), r: f.o(0.2, DESK.y + 0.02, DESK.front - 0.02), lean: 0.1, nod: -0.05, palms: 1.3, gl: 0.3, gr: 0.3 });
  }
  return hands({ l: ov(f, DESK_CHART), r: ov(f, DESK_BOOK) });
};
export const learnAt = (t: number, ph: number) => ({ writing: inBeat(beatOf(LEARN_SEQ, t, ph), 'write') });

// =============================================================================================
// The parcel scale (parcelScale, 1 × 1): a bench scale on its stand, the reading on the column at its
// back, the label printer on a side tray; boxes come off the floor at the left and go down at the right.

export const SCALE = { y: 0.8, z: -0.08, display: [0, 1.3, -0.3] as V, printer: [0.36, 0.86, -0.04] as V };
export const SCALE_BOX: V = [0.36, 0.26, 0.3];
export const SCALE_IN = { x: -0.4, z: 0.46 };
export const SCALE_OUT = { x: 0.42, z: 0.44 };
export const SCALE_SPOT = { x: 0, z: 0.58 };
export const SCALE_WORK: V = [0, SCALE.y + SCALE_BOX[1] / 2, SCALE.z];
const WEIGH_SEQ: Seq = [['lift', 1.4], ['read', 1.6], ['label', 1.6], ['off', 1.3]];
const weighKey: KeyFn = (key, f, u) => {
  const B = SCALE_BOX;
  const half = B[0] / 2 + 0.02;
  const plat = f.o(0, SCALE.y + B[1] / 2, SCALE.z);
  switch (key) {
    case 'lift': {
      const floor = f.o(SCALE_IN.x, B[1] / 2 + 0.02, SCALE_IN.z);
      const up = f.o(-0.12, 1.08, 0.18);
      const box = u < 0.4 ? floor : floor.clone().lerp(up, sm(u, 0.4, 1));
      return carry(f, box, half, { lean: 0.45 - 0.3 * sm(u, 0.4, 1), nod: 0.55, crouch: 1 - sm(u, 0.35, 0.85), item: u > 0.3 ? box : undefined });
    }
    case 'read': {
      const off = sm(u, 0.05, 0.3);
      const l = plat.clone().addScaledVector(f.left, half).lerp(f.o(-0.26, SCALE.y + 0.02, SCALE.z + 0.2), off);
      const r = plat.clone().addScaledVector(f.left, -half).lerp(f.o(0.26, SCALE.y + 0.02, SCALE.z + 0.2), off);
      return hands({ l, r, item: off < 0.5 ? plat : undefined, lean: 0.15, nod: 0.05, palms: 1.2 * off, gl: 0.3, gr: 0.3 });
    }
    case 'label': {
      const slot = ov(f, SCALE.printer, 0, 0.06, 0.02);
      const top = f.o(0.04, SCALE.y + B[1] + 0.02, SCALE.z + 0.03);
      const r = u < 0.35 ? f.o(0.26, SCALE.y + 0.02, SCALE.z + 0.2).lerp(slot, sm(u, 0, 0.3)) : u < 0.7 ? slot.clone().lerp(top, sm(u, 0.38, 0.62)) : top.clone().add(new THREE.Vector3(0.035 * Math.sin((u - 0.7) * 20), 0, 0));
      return hands({ l: f.o(-0.26, SCALE.y + 0.02, SCALE.z + 0.2), r, lean: 0.25, nod: 0.55, palms: u > 0.6 ? 1.3 : 0.5, gl: 0.3, gr: 0.6 });
    }
    case 'off': {
      const floor = f.o(SCALE_OUT.x, B[1] / 2 + 0.02, SCALE_OUT.z);
      const box = plat.clone().lerp(floor, sm(u, 0.1, 0.75));
      return carry(f, box, half, { lean: 0.2 + 0.3 * sm(u, 0.1, 0.75), nod: 0.55, crouch: sm(u, 0.25, 0.75), item: u > 0.1 && u < 0.82 ? box : undefined });
    }
  }
  return carry(f, plat, half);
};
/** Where the scale's box is (or held), the reading in kg (0 when empty), the new label. */
export function weighAt(t: number, ph: number): { where: 'floor' | 'held' | 'plat' | 'down'; kg: number; label: 0 | 1 | 2; lifting?: boolean } {
  const b = beatOf(WEIGH_SEQ, t, ph);
  const kg = Math.round((1.2 + frac(b.n * 0.377) * 7.5) * 100) / 100;
  const held = b.e === 0;
  if (b.from === 'lift') return { where: held && b.u < 0.3 ? 'floor' : 'held', kg: 0, label: 0, lifting: !held || b.u >= 0.3 };
  if (b.from === 'read') {
    // The reading climbs and wobbles as it settles.
    const s = held ? sm(b.u, 0.12, 0.55) : 1;
    const wob = held && b.u < 0.75 ? 0.4 * Math.sin(b.u * 40) * (1 - sm(b.u, 0.3, 0.75)) : 0;
    return { where: held && b.u < 0.175 ? 'held' : 'plat', kg: Math.max(0, Math.round((kg * s + wob) * 100) / 100), label: 0 };
  }
  if (b.from === 'label') return { where: 'plat', kg, label: b.u > 0.6 || b.e > 0 ? 2 : b.u > 0.3 ? 1 : 0 };
  return { where: !held || b.u > 0.82 ? 'down' : b.u < 0.1 ? 'plat' : 'held', kg: held && b.u < 0.1 ? kg : 0, label: 2 };
}

const CALL_SEQ: Seq = [['dial', 1.2], ['talk', 3.2], ['note', 1.6]];
const callKey: KeyFn = (key, f, _u, t) => {
  const k = f.k;
  const H = f.H;
  const label = f.o(0.02, SCALE.y + SCALE_BOX[1] + 0.02, SCALE.z + 0.04);
  switch (key) {
    case 'dial': {
      const phone = f.bd(-0.06 * k, 0.62 * H, 0.27 * k);
      return hands({ l: phone.clone().addScaledVector(f.left, 0.05), r: phone, tool: phone, nod: 0.5, palms: 0.8, gl: 0.3, gr: 0.75, tap: true });
    }
    case 'talk': {
      // The phone to the right ear, a finger on the box's address: 고객님, 오늘 두 시에서 네 시 사이에…
      const ear = f.bd(-0.085 * k, 0.905 * H, 0.03 * k);
      return hands({ l: label.clone().add(new THREE.Vector3(0.02 * wave(t, 0.4), 0, 0)), r: ear, tool: ear, lean: 0.12, nod: 0.25 + 0.06 * wave(t, 0.7), palms: 1.2, gl: 0.2, gr: 0.8 });
    }
    case 'note': {
      const phone = f.bd(-0.05 * k, 0.6 * H, 0.28 * k);
      return hands({ l: label, r: phone, tool: phone, lean: 0.12, nod: 0.45, palms: 1.0, gl: 0.2, gr: 0.75, tap: true });
    }
  }
  return hands({ l: label, r: f.bd(-0.12 * k, 0.55 * H, 0.2 * k) });
};
export const callAt = (t: number, ph: number) => ({ talking: inBeat(beatOf(CALL_SEQ, t, ph), 'talk') });

// =============================================================================================
// The delivery truck (deliveryTruck, 2 × 1, a 1톤 탑차 along x with its back at -x): the back doors
// folded round to the sides, the cargo bed's lip at TRUCK.lip; the hand truck beside the courier.

export const TRUCK = { rear: -2.0, bed: 0.8, lip: -1.78, deep: -1.52 };
export const TRUCK_BOX: V = [0.38, 0.28, 0.34];
/** Where each round's box goes in the bed: across (z) and which layer. */
export const TRUCK_SLOTS: Array<[number, number]> = [[-0.4, 0], [0, 0], [0.4, 0], [-0.4, 1], [0, 1], [0.4, 1]];
export const TRUCK_DOLLY = { x: -2.27, z: -0.66, deck: 0.16 };
export const TRUCK_SPOT = { x: -2.32, z: 0.04 };
export const TRUCK_WORK: V = [TRUCK.lip, TRUCK.bed + 0.15, 0];
const LOAD_SEQ: Seq = [['pick', 1.3], ['lift', 0.6], ['put', 1.3], ['shove', 0.9]];
const slotY = (layer: number) => TRUCK.bed + TRUCK_BOX[1] / 2 + layer * (TRUCK_BOX[1] + 0.01);
const loadKey: KeyFn = (key, f, u, _t, n) => {
  const B = TRUCK_BOX;
  const half = B[0] / 2 + 0.02;
  const [sz, layer] = TRUCK_SLOTS[((n % 6) + 6) % 6];
  const y = slotY(layer);
  switch (key) {
    case 'pick': {
      const top = f.o(TRUCK_DOLLY.x, TRUCK_DOLLY.deck + B[1] * 2.5, TRUCK_DOLLY.z);
      const box = top.clone().setY(top.y + 0.05 * sm(u, 0.6, 1));
      return carry(f, box, half, { lean: 0.35, nod: 0.5, crouch: lowFor(f, top.y) * sm(u, 0, 0.4), item: u > 0.5 ? box : undefined });
    }
    case 'lift':
      return carry(f, chest(f), half, { nod: 0.35 });
    case 'put': {
      const lip = f.o(TRUCK.lip, y, sz);
      const box = chest(f).lerp(lip, sm(u, 0.05, 0.8));
      return carry(f, box, half, { lean: 0.25 + 0.15 * sm(u, 0, 0.8), nod: 0.45 });
    }
    case 'shove': {
      const lip = f.o(TRUCK.lip, y, sz);
      const deep = f.o(TRUCK.deep, y, sz);
      const box = lip.clone().lerp(deep, sm(u, 0.05, 0.75));
      // Palms on its back face, pushed in.
      const back = box.clone().add(new THREE.Vector3(-B[2] / 2 - 0.02, 0, 0));
      return hands({ l: back.clone().addScaledVector(f.left, 0.1), r: back.clone().addScaledVector(f.left, -0.1), item: u < 0.9 ? box : undefined, lean: 0.4 + 0.15 * sm(u, 0, 0.75), nod: 0.45, palms: 1.4, gl: 0.1, gr: 0.1 });
    }
  }
  return carry(f, chest(f), half);
};
/** The truck's bed filled so far this round of six, and whether the hand truck's top box is off it. */
export function loadAt(t: number, ph: number): { filled: number; topOff: boolean } {
  const b = beatOf(LOAD_SEQ, t, ph);
  const done = (b.from === 'shove' && (b.u >= 0.9 || b.e > 0));
  return { filled: (((b.n % 6) + 6) % 6) + (done ? 1 : 0), topOff: (b.from === 'pick' && (b.u > 0.5 || b.e > 0)) || b.from === 'lift' || b.from === 'put' || (b.from === 'shove' && !done) };
}
export const truckSlotAt = (i: number): [number, number, number] => [TRUCK.deep, slotY(TRUCK_SLOTS[i][1]), TRUCK_SLOTS[i][0]];

// =============================================================================================
// The 구역 shelf (cxZoneShelf, 2 × 1): four columns of cubbies, a zone each, shelves at SHELF.levels;
// the trolley of boxes in front at the left.

export const SHELF = { back: -0.5, front: -0.04, levels: [0.12, 0.6, 1.08, 1.56], cols: [-0.705, -0.235, 0.235, 0.705], top: 2.02 };
export const SHELF_BOX: V = [0.34, 0.24, 0.3];
export const SHELF_TARGETS: Array<[number, number]> = [[1, 1], [2, 2], [1, 3], [2, 0], [2, 1], [1, 2], [1, 0], [2, 3]];
export const SHELF_TROLLEY = { x: -0.55, z: 0.26, deck: 0.2 };
export const SHELF_SPOT = { x: 0.06, z: 0.47 };
export const SHELF_WORK: V = [0, 1.1, SHELF.front];
export const shelfTarget = (n: number): [number, number, number] => {
  const [c, l] = SHELF_TARGETS[((n % SHELF_TARGETS.length) + SHELF_TARGETS.length) % SHELF_TARGETS.length];
  return [SHELF.cols[c], SHELF.levels[l] + 0.02 + SHELF_BOX[1] / 2, -0.26];
};
const SHELVE_SEQ: Seq = [['pick', 1.2], ['read', 1.2], ['put', 1.4], ['tap', 0.6]];
const shelveKey: KeyFn = (key, f, u, t, n) => {
  const B = SHELF_BOX;
  const half = B[0] / 2 + 0.02;
  const [x, y, z] = shelfTarget(n);
  switch (key) {
    case 'pick': {
      const top = f.o(SHELF_TROLLEY.x, SHELF_TROLLEY.deck + B[1] * 1.5, SHELF_TROLLEY.z);
      const box = top.clone().setY(top.y + 0.05 * sm(u, 0.6, 1));
      return carry(f, box, half, { lean: 0.45, nod: 0.55, crouch: 0.35 * sm(u, 0, 0.4), item: u > 0.5 ? box : undefined });
    }
    case 'read':
      return carry(f, chest(f, 0.62, 0.3), half, { nod: 0.5 });
    case 'put': {
      const mouth = f.o(x, y, SHELF.front + 0.2);
      const home = f.o(x, y, z);
      const box = u < 0.45 ? chest(f).lerp(mouth, sm(u, 0, 0.45)) : mouth.clone().lerp(home, sm(u, 0.45, 0.85));
      const crouch = lowFor(f, y + f.bd(0, 0, 0).y);
      const high = y > 1.4;
      if (u < 0.85) return carry(f, box, half, { lean: y < 0.5 ? 0.45 : 0.15, nod: high ? -0.25 : 0.45, crouch });
      return hands({ l: home.clone().addScaledVector(f.left, half + 0.03).setZ(home.z + 0.12), r: home.clone().addScaledVector(f.left, -half - 0.03).setZ(home.z + 0.12), lean: y < 0.5 ? 0.4 : 0.12, nod: high ? -0.2 : 0.45, palms: 0, crouch });
    }
    case 'tap': {
      const face = f.o(x, y, z + B[2] / 2 + 0.03 - 0.015 * Math.max(0, wave(t, 2)));
      return hands({ l: f.bd(0.2 * f.k, 0.52 * f.H, 0.15 * f.k), r: face, lean: y < 0.5 ? 0.35 : 0.1, nod: y > 1.4 ? -0.2 : 0.4, palms: 1.3, gr: 0.1, crouch: lowFor(f, y + f.bd(0, 0, 0).y) * 0.8 });
    }
  }
  return carry(f, chest(f), half);
};
/** How many of this round's run of boxes are in their cubbies, and whether the trolley's top box is off. */
export function shelveAt(t: number, ph: number): { n: number; placed: boolean; topOff: boolean } {
  const b = beatOf(SHELVE_SEQ, t, ph);
  const placed = (b.from === 'put' && (b.u >= 0.85 || b.e > 0)) || b.from === 'tap';
  return { n: b.n, placed, topOff: (b.from === 'pick' && (b.u > 0.5 || b.e > 0)) || b.from === 'read' || (b.from === 'put' && !placed) };
}

// =============================================================================================
// The pallet jack (cxPalletJack, 2 × 1): the pallet on its forks at the left, the tiller's pivot at
// PJ.pivot, its T-handle up toward the courier, who stands at the right end facing -x.

export const PJ = { pivot: [0.22, 0.26, 0] as V, len: 0.95, rest: 0.28, lift: 0.07 };
export const PJ_SPOT = { x: 1.08, z: 0.0 };
export const PJ_WORK: V = PJ.pivot;
const PALLET_SEQ: Seq = [['grip', 0.8], ['pump', 3.0], ['pull', 2.0], ['release', 1.2], ['look', 1.4]];
/** The handle's tilt toward the courier, how far the forks are up (0–1), the lever squeezed. */
export function palletAt(t: number, ph: number): { a: number; lift: number; lever: boolean } {
  const b = beatOf(PALLET_SEQ, t, ph);
  const key = b.e > 0.5 ? b.to : b.from;
  const u = b.e > 0 ? (b.e > 0.5 ? 0 : 1) : b.u;
  switch (key) {
    case 'grip':
      return { a: PJ.rest + 0.12 * sm(u, 0, 1), lift: 0, lever: false };
    case 'pump': {
      const k = u * 3;
      const s = 0.5 - 0.5 * Math.cos(frac(k) * Math.PI * 2);
      return { a: PJ.rest + 0.12 + 0.36 * s, lift: Math.min(1, (Math.floor(k) + sm(frac(k), 0.25, 0.6)) / 3), lever: false };
    }
    case 'pull':
      return { a: 0.72 + 0.03 * wave(t, 0.9), lift: 1, lever: false };
    case 'release':
      return { a: 0.55, lift: 1 - sm(u, 0.25, 0.9), lever: u > 0.15 };
    default:
      return { a: PJ.rest, lift: 0, lever: false };
  }
}
/** The T-handle's middle with the handle at tilt `a`. */
export const pjGrip = (a: number): [number, number, number] => [PJ.pivot[0] + Math.sin(a) * PJ.len, PJ.pivot[1] + Math.cos(a) * PJ.len, 0];
const palletKey: KeyFn = (key, f, u, t) => {
  const k = f.k;
  const grip = (a: number) => {
    const g = pjGrip(a);
    const p = f.o(g[0], g[1], g[2]);
    return { l: p.clone().addScaledVector(f.left, 0.11), r: p.clone().addScaledVector(f.left, -0.11) };
  };
  switch (key) {
    case 'grip': {
      const g = grip(PJ.rest + 0.12 * sm(u, 0, 1));
      return hands({ ...g, lean: 0.2, nod: 0.35, palms: 1.2, gl: 0.95, gr: 0.95, crouch: 0.15 });
    }
    case 'pump': {
      const kk = u * 3;
      const sw = 0.5 - 0.5 * Math.cos(frac(kk) * Math.PI * 2);
      const g = grip(PJ.rest + 0.12 + 0.36 * sw);
      return hands({ ...g, lean: 0.25 + 0.25 * sw, nod: 0.4, palms: 1.2, gl: 0.95, gr: 0.95, crouch: 0.15 + 0.35 * sw });
    }
    case 'pull': {
      const g = grip(0.72 + 0.03 * wave(t, 0.9));
      return hands({ ...g, lean: -0.12 + 0.04 * wave(t, 0.9), nod: 0.1, palms: 1.2, gl: 1, gr: 1, crouch: 0.3 });
    }
    case 'release': {
      const g = grip(0.55);
      // The lever under the right hand squeezed up into the grip.
      return hands({ ...g, r: g.r.clone().setY(g.r.y - 0.02 * sm(u, 0.1, 0.2)), lean: 0.15, nod: 0.45, palms: 1.2, gl: 0.95, gr: 1, crouch: 0.2 });
    }
    case 'look':
      // Hands on the hips, a look over the load.
      return hands({ l: f.bd(0.2 * k, 0.55 * f.H, 0.03 * k), r: f.bd(-0.2 * k, 0.55 * f.H, 0.03 * k), nod: -0.05, palms: 0.2, gl: 0.6, gr: 0.6 });
  }
  return hands(grip(PJ.rest));
};

// =============================================================================================
// The packing table (cxPackStation, 2 × 1): the box being repacked in the middle, the bubble wrap
// roll at the left end, the tape gun on the pegboard, the label printer at the right.

export const PACK = { y: 0.88, z: -0.1, front: 0.24, roll: [-0.74, 1.04, -0.16] as V, gunHook: [0.48, 1.36, -0.43] as V, printer: [0.6, 0.88, -0.07] as V };
export const PACK_BOX: V = [0.42, 0.3, 0.34];
export const PACK_MID: V = [0.04, PACK.y, PACK.z];
export const PACK_SPOT = { x: 0.0, z: 0.5 };
export const PACK_WORK: V = [PACK_MID[0], PACK.y + PACK_BOX[1], PACK_MID[2]];
const REPACK_SEQ: Seq = [['open', 1.0], ['wrap', 1.8], ['fold', 1.2], ['tape', 1.6], ['label', 1.2]];
const repackKey: KeyFn = (key, f, u, t) => {
  const B = PACK_BOX;
  const top = PACK.y + B[1];
  const [mx, , mz] = PACK_MID;
  switch (key) {
    case 'open': {
      const lift = 0.12 * sm(u, 0.1, 0.8);
      return hands({ l: f.o(mx - 0.12, top + 0.02 + lift, mz + B[2] / 2 + 0.02 - 0.1 * sm(u, 0.4, 0.9)), r: f.o(mx + 0.12, top + 0.02 + lift, mz + B[2] / 2 + 0.02 - 0.1 * sm(u, 0.4, 0.9)), lean: 0.3, nod: 0.6, palms: 0.6, gl: 0.6, gr: 0.6 });
    }
    case 'wrap': {
      // Bubble wrap pulled off the roll, then pushed down into the box.
      const roll = f.o(PACK.roll[0] + 0.24, PACK.y + 0.14, PACK.roll[2] + 0.16);
      const into = f.o(mx, top - 0.06, mz);
      const sheet = u < 0.4 ? roll.clone().lerp(roll.clone().add(new THREE.Vector3(0.25, 0, 0.05)), sm(u, 0.05, 0.4)) : roll.clone().add(new THREE.Vector3(0.25, 0, 0.05)).lerp(into, sm(u, 0.4, 0.8));
      const press = u > 0.8 ? 0.02 * Math.max(0, wave(t, 2.5)) : 0;
      return hands({ l: sheet.clone().addScaledVector(f.left, 0.12).setY(sheet.y - press), r: sheet.clone().addScaledVector(f.left, -0.12).setY(sheet.y - press), item: sheet, lean: 0.3, nod: 0.55, palms: 0.9, gl: 0.7, gr: 0.7 });
    }
    case 'fold':
      return hands({ l: f.o(mx - 0.1, top + 0.1 - 0.08 * sm(u, 0.2, 0.9), mz), r: f.o(mx + 0.1, top + 0.1 - 0.08 * sm(u, 0.2, 0.9), mz), lean: 0.35, nod: 0.6, palms: 1.4, gl: 0.1, gr: 0.1 });
    case 'tape': {
      // The tape gun run along the seam with a screech, the other hand holding the flaps down.
      const gun = f.o(mx - B[0] / 2 - 0.05 + (B[0] + 0.12) * sm(u, 0.12, 0.85), top + 0.05, mz);
      return hands({ l: f.o(mx - 0.05, top + 0.01, mz + 0.1), r: gun, tool: gun, lean: 0.38, nod: 0.6, palms: 0.3, gl: 0.1, gr: 0.9 });
    }
    case 'label': {
      const slot = ov(f, PACK.printer, 0, 0.1, 0.06);
      const on = f.o(mx + 0.06, top + 0.02, mz + 0.05);
      const r = u < 0.4 ? slot : slot.clone().lerp(on, sm(u, 0.4, 0.7));
      return hands({ l: f.o(mx - 0.1, top + 0.01, mz + 0.1), r: u > 0.75 ? on.clone().add(new THREE.Vector3(0.03 * Math.sin(u * 30), 0, 0)) : r, lean: 0.3, nod: 0.55, palms: 1.2, gl: 0.1, gr: 0.5 });
    }
  }
  return hands({ l: f.o(mx - 0.15, top, mz + 0.1), r: f.o(mx + 0.15, top, mz + 0.1) });
};
/** The flaps' opening (0 shut, 1 open), the tape along the seam (0–1), the new label, the bubble wrap in the box. */
export function repackAt(t: number, ph: number): { flaps: number; tape: number; label: boolean; wrapIn: boolean; gun: boolean; slip: boolean } {
  const b = beatOf(REPACK_SEQ, t, ph);
  const key = b.from;
  const u = b.u;
  const flaps = key === 'open' ? (b.e > 0 ? 1 : sm(u, 0.15, 0.9)) : key === 'wrap' ? 1 : key === 'fold' ? (b.e > 0 ? 0 : 1 - sm(u, 0.15, 0.9)) : 0;
  const tape = key === 'tape' ? (b.e > 0 ? 1 : sm(u, 0.12, 0.85)) : key === 'label' ? 1 : 0;
  return { flaps, tape, label: key === 'label' && (u > 0.7 || b.e > 0), wrapIn: (key === 'wrap' && u > 0.8) || key === 'fold' || key === 'tape' || key === 'label', gun: !(key === 'tape' && b.e === 0), slip: key === 'label' && b.e === 0 && u > 0.35 && u <= 0.72 };
}

// =============================================================================================
// The returns bin (cxReturnsBin, 1 × 1): a blue pallet box split down the middle, 미확인 on the
// courier's left, 확인 on the right; the PDA hangs on its front right.

export const RET = { z: -0.08, w: 0.86, d: 0.7, h: 0.72, holster: [0.33, 0.76, 0.28] as V };
export const RET_BOX: V = [0.26, 0.14, 0.22];
export const RET_SPOT = { x: 0, z: 0.62 };
export const RET_WORK: V = [-0.2, 0.55, RET.z];
const RETURN_SEQ: Seq = [['reach', 1.2], ['check', 1.6], ['scan', 1.4], ['drop', 1.0]];
const returnKey: KeyFn = (key, f, u) => {
  const k = f.k;
  const half = RET_BOX[0] / 2 + 0.02;
  switch (key) {
    case 'reach': {
      const p = f.w(0, -0.04 + 0.12 * sm(u, 0.55, 1), 0);
      return carry(f, p, half, { lean: 0.75, nod: 0.6, crouch: 0.3, item: u > 0.5 ? p : undefined });
    }
    case 'check':
      return carry(f, chest(f, 0.62, 0.28), half, { nod: 0.5 });
    case 'scan': {
      const box = f.bd(0.1 * k, 0.6 * f.H, 0.26 * k);
      const holster = ov(f, RET.holster, 0, 0.05, 0);
      const aim = f.bd(-0.08 * k, 0.75 * f.H, 0.36 * k);
      const r = u < 0.22 ? box.clone().lerp(holster, sm(u, 0, 0.2)) : u < 0.8 ? holster.clone().lerp(aim, sm(u, 0.22, 0.38)) : aim.clone().lerp(holster, sm(u, 0.8, 0.98));
      const held = u > 0.18 && u < 0.9;
      return hands({ l: box.clone().addScaledVector(f.left, 0.13), r, item: box, tool: held ? r : undefined, lean: 0.1, nod: 0.45, palms: 0.2, gl: 0.7, gr: held ? 0.85 : 0.4 });
    }
    case 'drop': {
      const into = f.o(0.2, 0.6, RET.z);
      const box = chest(f).lerp(into, sm(u, 0.05, 0.6));
      return carry(f, box, half, { lean: 0.2 + 0.4 * sm(u, 0, 0.6), nod: 0.55, item: u < 0.7 ? box : undefined });
    }
  }
  return carry(f, chest(f), half);
};
/** The PDA in the hand, its laser and beep; the parcel gone from the left side, landed in the right. */
export function returnAt(t: number, ph: number): { pda: boolean; laser: boolean; beep: boolean; landed: boolean } {
  const b = beatOf(RETURN_SEQ, t, ph);
  const scanning = b.from === 'scan' && b.e === 0;
  return { pda: !(scanning && b.u > 0.18 && b.u < 0.9), laser: scanning && b.u > 0.4 && b.u < 0.62, beep: scanning && b.u > 0.5 && b.u < 0.7, landed: b.from === 'drop' && (b.u > 0.7 || b.e > 0) };
}

// =============================================================================================
// The 배송 현황판 (cxStatusBoard, 2 × 1): the big screen on its stand, a row a driver.

export const BOARD = { y: 1.48, z: -0.3, w: 1.6, h: 0.9, rows: [0.075, -0.0625, -0.2, -0.3375] };
export const BOARD_SPOT = { x: 0.1, z: 0.4 };
export const BOARD_WORK: V = [0, BOARD.y, BOARD.z];
const BOARD_SEQ: Seq = [['look', 2.0], ['point', 2.6], ['think', 1.6]];
const boardKey: KeyFn = (key, f, u, t, n) => {
  const k = f.k;
  switch (key) {
    case 'look':
      return hands({ l: f.bd(0.2 * k, 0.5 * f.H, 0.08 * k), r: f.bd(-0.2 * k, 0.5 * f.H, 0.08 * k), nod: -0.28, palms: 0.2 });
    case 'point': {
      const row = BOARD.rows[((n % 4) + 4) % 4];
      return hands({ l: f.bd(0.2 * k, 0.5 * f.H, 0.08 * k), r: f.o(-0.33 + 0.8 * sm(u, 0.1, 0.9), BOARD.y + row, BOARD.z + 0.1), nod: -0.25, palms: 0.2, gr: 0.15 });
    }
    case 'think':
      return hands({ l: f.bd(-0.04 * k, 0.6 * f.H, 0.13 * k), r: f.bd(-0.02 * k, 0.83 * f.H + 0.005 * wave(t, 0.5), 0.13 * k), nod: -0.2, palms: 0.4, gl: 0.5, gr: 0.6 });
  }
  return hands({ l: f.bd(0.2 * k, 0.5 * f.H, 0.08 * k), r: f.bd(-0.2 * k, 0.5 * f.H, 0.08 * k) });
};
/** Which driver's row is being followed (−1 none). */
export function boardAt(t: number, ph: number): { row: number } {
  const b = beatOf(BOARD_SEQ, t, ph);
  return { row: inBeat(b, 'point') ? ((b.n % 4) + 4) % 4 : -1 };
}

// =============================================================================================
// The 무인 택배함 (cxParcelLocker, 2 × 1): small doors at the left, the kiosk in the middle with a
// ledge under its screen for the box, big doors at the right; each door hung on its left edge.

export const LOCKER = { front: 0, screen: [0.03, 1.3, 0.02] as V, ledge: [0.03, 0.86, 0.12] as V };
export const LOCKER_BOX: V = [0.2, 0.15, 0.24];
/** The cells filled in turn: their middle x, y, and width and height (the door hung at x − w/2). */
export const LOCKER_CELLS: Array<[number, number, number, number]> = [[-0.335, 1.03, 0.24, 0.3], [0.425, 0.94, 0.34, 0.44], [0.425, 0.5, 0.34, 0.44]];
export const LOCKER_SPOT = { x: 0.05, z: 0.52 };
export const LOCKER_WORK: V = LOCKER.screen;
const LOCKER_SEQ: Seq = [['tap', 1.6], ['open', 0.6], ['put', 1.5], ['shut', 0.8]];
const cellOf = (n: number) => LOCKER_CELLS[((n % 3) + 3) % 3];
const lockerKey: KeyFn = (key, f, u, t, n) => {
  const B = LOCKER_BOX;
  const half = B[0] / 2 + 0.02;
  const [cx, cy, cw, ch] = cellOf(n);
  const onLedge = ov(f, LOCKER.ledge, 0, B[1] / 2, 0);
  switch (key) {
    case 'tap': {
      const press = 0.012 * Math.max(0, wave(t, 2.2));
      return hands({ l: onLedge.clone().addScaledVector(f.left, half), r: ov(f, LOCKER.screen, 0.05 * Math.sin(u * 7), -0.04 + 0.08 * frac(u * 2), 0.03 - press), lean: 0.1, nod: 0.2, palms: 1.0, gl: 0.4, gr: 0.2 });
    }
    case 'open': {
      // The door's edge caught and swung wide.
      const edge = f.o(cx + cw / 2 - 0.02, cy, 0.08 + 0.2 * sm(u, 0, 1));
      return hands({ l: onLedge.clone().addScaledVector(f.left, half), r: edge, lean: 0.12, nod: 0.25, palms: 0.2, gr: 0.7 });
    }
    case 'put': {
      const into = f.o(cx, cy - ch / 2 + B[1] / 2 + 0.02, -0.13);
      const mouth = f.o(cx, cy - ch / 2 + B[1] / 2 + 0.02, 0.12);
      const box = u < 0.4 ? onLedge.clone().lerp(mouth, sm(u, 0.05, 0.4)) : mouth.clone().lerp(into, sm(u, 0.4, 0.8));
      if (u < 0.82) return carry(f, box, half, { lean: 0.2, nod: cy > 1.0 ? 0.0 : 0.45, crouch: lowFor(f, box.y) * 0.6 });
      return hands({ l: into.clone().addScaledVector(f.left, half + 0.03).setZ(into.z + 0.15), r: into.clone().addScaledVector(f.left, -half - 0.03).setZ(into.z + 0.15), lean: 0.15, nod: 0.3, palms: 0, crouch: lowFor(f, into.y) * 0.5 });
    }
    case 'shut': {
      const door = f.o(cx + cw * 0.3, cy, 0.05 + 0.18 * (1 - sm(u, 0.1, 0.7)));
      return hands({ l: f.bd(0.2 * f.k, 0.52 * f.H, 0.12 * f.k), r: door, lean: 0.12, nod: 0.2, palms: 1.4, gr: 0.05, crouch: lowFor(f, cy + f.bd(0, 0, 0).y) * 0.4 });
    }
  }
  return hands({ l: onLedge.clone().addScaledVector(f.left, half), r: ov(f, LOCKER.screen) });
};
export const lockerTurn = (n: number) => -0.7 * (cellOf(n)[0] - LOCKER_SPOT.x);
/** Where the box sits in a cell (its middle). */
export const lockerInside = (i: number): [number, number, number] => [LOCKER_CELLS[i][0], LOCKER_CELLS[i][1] - LOCKER_CELLS[i][3] / 2 + LOCKER_BOX[1] / 2 + 0.02, -0.13];
/** The cell in use, its door's swing (0–1), the box (on the ledge, carried, in the cell), the kiosk's screen. */
export function lockerAt(t: number, ph: number): { cell: number; door: number; box: 'ledge' | 'held' | 'in'; screen: 'home' | 'pick' | 'open' } {
  const b = beatOf(LOCKER_SEQ, t, ph);
  const cell = ((b.n % 3) + 3) % 3;
  const key = b.from;
  const u = b.u;
  const door = key === 'open' ? (b.e > 0 ? 1 : sm(u, 0, 0.5)) : key === 'put' ? 1 : key === 'shut' ? (b.e > 0 ? 0 : 1 - sm(u, 0.1, 0.7)) : 0;
  const box = key === 'tap' || key === 'open' ? 'ledge' : key === 'put' && u < 0.82 && b.e === 0 ? 'held' : 'in';
  return { cell, door, box, screen: key === 'tap' ? (u < 0.5 ? 'home' : 'pick') : key === 'shut' ? 'home' : 'open' };
}

// ---------------------------------------------------------------------------------------------

const ROUNDS: Record<CxMotion, Round> = {
  cxSort: { seq: SORT_SEQ, key: sortKey, work: SORT_WORK, base: Math.PI, turn: (k) => (k === 'watch' ? 0.35 : k === 'place' ? -1.45 : 0) },
  cxThroughput: { seq: THRU_SEQ, key: thruKey, work: PANEL, base: Math.PI, turn: (k) => (k === 'watch' || k === 'count' ? 0.55 : 0) },
  cxStack: { seq: STACK_SEQ, key: stackKey, work: CAGE_WORK, base: Math.PI, turn: (k) => (k === 'pick' ? 0.85 : 0) },
  cxClipboard: { seq: CLIP_SEQ, key: clipKey, work: [0, 0, 0], base: Math.PI },
  cxScan: { seq: SCAN_SEQ, key: scanKey, work: DESK_WORK, base: Math.PI, turn: (k) => (k === 'take' ? 0.2 : 0) },
  cxLearn: { seq: LEARN_SEQ, key: learnKey, work: DESK_WORK, base: Math.PI, turn: (k) => (k === 'look' ? 0.25 : 0) },
  cxWeigh: { seq: WEIGH_SEQ, key: weighKey, work: SCALE_WORK, base: Math.PI, turn: (k) => (k === 'lift' ? 0.75 : k === 'off' ? -0.75 : 0) },
  cxCall: { seq: CALL_SEQ, key: callKey, work: SCALE_WORK, base: Math.PI },
  cxLoad: { seq: LOAD_SEQ, key: loadKey, work: TRUCK_WORK, base: Math.PI / 2, turn: (k) => (k === 'pick' ? 1.45 : 0) },
  cxShelve: { seq: SHELVE_SEQ, key: shelveKey, work: SHELF_WORK, base: Math.PI, turn: (k, n) => (k === 'pick' ? 0.8 : k === 'put' || k === 'tap' ? -0.45 * (shelfTarget(n)[0] - SHELF_SPOT.x) : 0) },
  cxPallet: { seq: PALLET_SEQ, key: palletKey, work: PJ_WORK, base: -Math.PI / 2, turn: (k) => (k === 'look' ? 0.35 : 0) },
  cxRepack: { seq: REPACK_SEQ, key: repackKey, work: PACK_WORK, base: Math.PI, turn: (k) => (k === 'wrap' ? 0.3 : k === 'label' ? -0.25 : 0) },
  cxReturn: { seq: RETURN_SEQ, key: returnKey, work: RET_WORK, base: Math.PI, turn: (k) => (k === 'reach' ? 0.15 : k === 'drop' ? -0.3 : 0) },
  cxBoard: { seq: BOARD_SEQ, key: boardKey, work: BOARD_WORK, base: Math.PI },
  cxLocker: { seq: LOCKER_SEQ, key: lockerKey, work: LOCKER_WORK, base: Math.PI, turn: (k, n) => (k === 'tap' ? 0 : lockerTurn(n)) },
};

/** The spot's turn from square on now (to their left +), eased from beat to beat. */
export function cxTurn(m: CxMotion, t: number, ph: number): number {
  const R = ROUNDS[m];
  if (!R.turn) return 0;
  const b = beatOf(R.seq, t, ph);
  const nNext = b.i === R.seq.length - 1 ? b.n + 1 : b.n;
  const a = R.turn(b.from, b.n);
  return a + (R.turn(b.to, nNext) - a) * b.e;
}
/** Which way a spot faces in its piece now (its base and turn). */
export const cxYaw = (m: CxMotion, t: number, ph: number) => ROUNDS[m].base + cxTurn(m, t, ph);
/** Where the motion's work mark is in its piece. */
export const cxWork = (m: CxMotion): V => ROUNDS[m].work;
/** The hands for a motion worked out in a frame (the builder puts what's held in them). */
export function cxHands(m: CxMotion, f: Frame, t: number, ph: number): Hands {
  const R = ROUNDS[m];
  const b = beatOf(R.seq, t, ph);
  const a = R.key(b.from, f, b.u, t, b.n);
  if (b.e <= 0) return a;
  return mix(a, R.key(b.to, f, 0, t, b.i === R.seq.length - 1 ? b.n + 1 : b.n), b.e);
}

/**
 * A dweller doing one of these: the frame from where they are and the spot's work mark. A spot faces
 * its piece at its round's base turned by cxTurn, so the piece's own turn is the body's less that.
 */
export function cxDoing(m: CxMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const R = ROUNDS[m];
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.35).setY(b.base.y + 0.9);
  const ph = cxPhase(p);
  const f = frameAt(p, R.work, b.yaw - R.base - cxTurn(m, t, ph), b.base, b.yaw, b.height);
  const h = cxHands(m, f, t, ph);
  return { reach: { l: h.l, r: h.r, lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap }, crouch: h.crouch || undefined };
}
