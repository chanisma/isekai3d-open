import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * 119 구급대 work (2026-10-27, the 119 안전센터, at the user's request: the work should look like the
 * work). Each motion is a round of beats, each held a while and eased into the next, by the same clock
 * (emsPhase of the piece's work point) as the piece it's done at, so what the piece shows — the AED's
 * voice prompts, the pads on the chest, the cot rising, the item in the hand — is drawn there in step
 * (workplaces/paramedic.ts):
 *
 * - emsCpr: knelt at a CPR manikin's right side. Shoulders tapped (괜찮으세요?), thirty compressions,
 *   the head tilted and two breaths through the pocket mask; the AED trainer switched on, the pads
 *   peeled and pressed on (under the right collarbone, then reached across to the left side), hands up
 *   off the chest while it analyses, the flashing shock button pressed, and straight back to the chest.
 * - emsRestock: at the kit shelf, something taken from a bin (a high one or, crouched, a low one), its
 *   expiry date read held up, packed into the open trauma bag, ticked off the checklist on the post.
 * - emsTriage: a triage tag taken from its box, written on held at the chest, its colour strip torn
 *   off, and tied on the bag's handle (red, yellow, green in turn).
 * - emsDispatch: sat at the 119 console with the headset on, typing the call in, a hand to the earcup
 *   and the other on the mouse while the caller's talked to, the map pointed at, the red 출동 button
 *   pressed.
 * - emsCare: stood at a cot rolled out of the ambulance, two fingers on the casualty's wrist (a look at
 *   the watch), the oxygen mask fitted, the monitor tapped, a hand on the shoulder and a word.
 * - emsCot: at the cot's side, both hands on its rail as it's raised, a strap pulled across and
 *   buckled, the side rail lifted, and lowered again.
 *
 * Kept out of activity.ts (which only hands these motions over here) so it imports nothing from it at
 * run time. A pose is worked out against a Frame: `o` places a point by its offset from the piece's
 * work point in the piece's own axes (x across, y up, z out of its front), `bd` by the body's (to their
 * left, up from the feet or the seat, ahead). The builder works the same poses out in the piece's frame.
 */
export type EmsMotion = 'emsCpr' | 'emsRestock' | 'emsTriage' | 'emsDispatch' | 'emsCare' | 'emsCot';
export const EMS_MOTIONS = new Set<string>(['emsCpr', 'emsRestock', 'emsTriage', 'emsDispatch', 'emsCare', 'emsCot']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset: from where the piece's work point is (across the floor only), so two pieces aren't in step. */
export const emsPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

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
const MOVE = 0.6;
function beatOf(seq: Seq, t: number, phase: number): Beat {
  const T = seq.reduce((n, [, h, m = MOVE]) => n + h + m, 0);
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

/** Where things are worked out: the piece's work point and axes, the body's place and axes, how tall they are. */
export interface Frame {
  /** A point at an offset from the work point, in the piece's own axes (x across, y up, z out of its front). */
  o(dx: number, dy: number, dz: number): THREE.Vector3;
  /** A point from the body: to their left, up from the feet (or the seat), ahead of them. */
  bd(side: number, up: number, ahead: number): THREE.Vector3;
  H: number;
  k: number;
  sitting: boolean;
}
/** A frame: the work point and the piece's turn, the feet (or the seat's top) and the body's turn. */
export function frameAt(work: THREE.Vector3, pieceYaw: number, feet: THREE.Vector3, yaw: number, H: number, sitting = false): Frame {
  const c = Math.cos(pieceYaw);
  const s = Math.sin(pieceYaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return {
    o: (dx, dy, dz) => new THREE.Vector3(work.x + dx * c + dz * s, work.y + dy, work.z - dx * s + dz * c),
    bd: (side, up, ahead) => feet.clone().addScaledVector(left, side).addScaledVector(fwd, ahead).setY(feet.y + up),
    H,
    k: H / 1.6,
    sitting,
  };
}
type V = readonly [number, number, number];
const ov = (f: Frame, v: V, dx = 0, dy = 0, dz = 0) => f.o(v[0] + dx, v[1] + dy, v[2] + dz);

/** Where the hands are and how the body goes with them. */
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
}
type Part = Partial<Hands> & { l: THREE.Vector3; r: THREE.Vector3 };
const hands = (h: Part): Hands => ({ lean: 0, nod: 0, palms: 0.4, gl: 0.3, gr: 0.3, crouch: 0, ...h });
function mix(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  const n = (p: number, q: number) => p + (q - p) * e;
  return { l: a.l.clone().lerp(b.l, e), r: a.r.clone().lerp(b.r, e), lean: n(a.lean, b.lean), nod: n(a.nod, b.nod), palms: n(a.palms, b.palms), gl: n(a.gl, b.gl), gr: n(a.gr, b.gr), crouch: n(a.crouch, b.crouch), tap: e < 0.5 ? a.tap : b.tap };
}

type KeyFn = (key: string, f: Frame, u: number, t: number, n: number) => Hands;
interface Round {
  seq: Seq;
  key: KeyFn;
  /** How far the spot turns from facing the piece square on (to their left +), by beat key. */
  turn?: Record<string, number>;
}

// ---------------------------------------------------------------------------------------------
// CPR on the manikin, with the AED trainer.

/**
 * The CPR manikin (offsets from its breastbone, the work point, in the piece's axes): it lies on its
 * back along x with its head to -x, so its right side is +z, toward the rescuer knelt at its front.
 */
export const CPR = {
  shoulderNear: [-0.18, -0.03, 0.15] as V,
  shoulderFar: [-0.18, -0.03, -0.15] as V,
  forehead: [-0.37, -0.02, 0] as V,
  chin: [-0.27, -0.07, 0.03] as V,
  mask: [-0.31, 0.0, 0] as V,
  /** The pads' places: under the right collarbone, and low on the left side. */
  padA: [-0.12, -0.02, 0.08] as V,
  padB: [0.13, -0.04, -0.14] as V,
  /** The AED trainer by the right hip: its power button, its shock button, the pads' packet. */
  power: [0.31, -0.105, 0.25] as V,
  shock: [0.38, -0.105, 0.22] as V,
  packet: [0.27, -0.16, 0.02] as V,
};
const CPR_SEQ: Seq = [
  ['check', 2.4], ['push', 8], ['tilt', 0.7], ['breath', 2.4],
  ['aedOn', 1.6], ['pads', 3.2], ['clear', 2.8], ['shock', 1.8],
  ['push', 7], ['tilt', 0.7], ['breath', 2.4],
];
/** Compressions, about 110 a minute. */
const PUSH_HZ = 1.85;
const pushDepth = (t: number) => Math.max(0, Math.sin(t * Math.PI * 2 * PUSH_HZ));
export type AedScreen = 'off' | 'pads' | 'analyse' | 'shock' | 'shocked' | 'cpr';
/** What the manikin and the AED show now: the chest pushed in, pads on, the screen, the mask on the face. */
export function cprAt(t: number, ph: number): { push: number; pads: number; screen: AedScreen; mask: boolean; flash: boolean } {
  const b = beatOf(CPR_SEQ, t, ph);
  const held = b.e === 0;
  const push = b.from === 'push' && held ? pushDepth(t) : 0;
  const i = b.i;
  const pads = i < 5 ? 0 : i === 5 ? (b.u < 0.38 ? 0 : b.u < 0.84 && held ? 1 : 2) : 2;
  const screen: AedScreen = i < 4 ? 'off' : i === 4 ? (b.u < 0.45 && held ? 'off' : 'pads') : i === 5 ? 'pads' : i === 6 ? 'analyse' : i === 7 ? (b.u < 0.62 && held ? 'shock' : 'shocked') : 'cpr';
  return { push, pads, screen, mask: b.from === 'breath' && (held || b.e < 0.3), flash: screen === 'shock' && Math.sin(t * 14) > 0 };
}
const cprKey: KeyFn = (key, f, u, t) => {
  const C = CPR;
  switch (key) {
    case 'check': {
      // A tap on both shoulders, loud: 괜찮으세요?
      const tap = 0.025 * Math.max(0, wave(t, 2.2));
      return hands({ l: ov(f, C.shoulderFar, 0, 0.02 + tap), r: ov(f, C.shoulderNear, 0, 0.02 + tap), lean: 0.55, nod: 0.5, palms: 1.4, crouch: 1 });
    }
    case 'push': {
      const d = pushDepth(t);
      const at = f.o(0, 0.06 - 0.05 * d, 0);
      return hands({ l: at.clone().add(new THREE.Vector3(0, 0.025, 0)), r: at, lean: 0.62 + 0.07 * d, nod: 0.45, palms: 1.5, gl: 0.3, gr: 0.3, crouch: 1 });
    }
    case 'tilt':
      return hands({ l: ov(f, C.forehead, 0, 0.04, 0), r: ov(f, C.chin, 0, 0.01, 0.02), lean: 0.72, nod: 0.55, palms: 1.4, gl: 0.2, gr: 0.5, crouch: 1 });
    case 'breath': {
      // Two slow breaths through the mask, a look along the chest to see it rise between them.
      const blow = Math.max(0, wave(t, 0.42));
      return hands({ l: ov(f, C.mask, -0.03, 0.05, -0.03), r: ov(f, C.mask, 0.03, 0.04, 0.04), lean: 0.88 + 0.08 * blow, nod: 0.62, palms: 1.2, gl: 0.55, gr: 0.6, crouch: 1 });
    }
    case 'aedOn': {
      const press = sm(u, 0.25, 0.4) * (1 - sm(u, 0.5, 0.65));
      return hands({ l: f.o(0.04, 0.0, 0.12), r: ov(f, C.power, 0, 0.03 - 0.02 * press, 0), lean: 0.52, nod: 0.6, palms: 1.3, gl: 0.3, gr: 0.6, crouch: 1 });
    }
    case 'pads': {
      // The packet torn open, pad one pressed under the right collarbone, then across for the left side.
      const r = u < 0.5 ? ov(f, C.packet, 0, 0.04).lerp(ov(f, C.padA, 0, 0.02), sm(u, 0.05, 0.36)) : ov(f, C.padA, 0, 0.015, 0);
      const l = u < 0.45 ? ov(f, C.packet, -0.05, 0.05) : ov(f, C.packet, -0.05, 0.05).lerp(ov(f, C.padB, 0, 0.02), sm(u, 0.45, 0.82));
      return hands({ l, r, lean: 0.7, nod: 0.58, palms: 1.45, gl: 0.2, gr: 0.2, crouch: 1 });
    }
    case 'clear':
      // 분석 중입니다 — 환자에게서 떨어지세요: hands up off the chest, sat back on the heels.
      return hands({ l: f.o(-0.08, 0.36, 0.22), r: f.o(0.1, 0.34, 0.22), lean: 0.18, nod: 0.3, palms: -0.5, gl: 0.05, gr: 0.05, crouch: 1 });
    case 'shock': {
      const press = sm(u, 0.45, 0.6) * (1 - sm(u, 0.72, 0.9));
      return hands({ l: f.o(-0.1, 0.32, 0.22), r: ov(f, C.shock, 0, 0.03 - 0.02 * press, 0), lean: 0.45, nod: 0.5, palms: 1.2, gl: 0.05, gr: 0.6, crouch: 1 });
    }
  }
  return hands({ l: f.o(0, 0.06, 0), r: f.o(0, 0.04, 0), lean: 0.6, crouch: 1 });
};

// ---------------------------------------------------------------------------------------------
// The kit shelf: restocking the trauma bag, triage tags.

/**
 * The kit shelf (offsets from the open trauma bag's mouth, the work point): two bins on the top shelf
 * and two on the bottom, the checklist clipped to the left upright, the box of triage tags by the bag.
 */
export const KIT = {
  bins: [[-0.34, 0.44, 0.1], [0.1, 0.44, 0.1], [-0.34, -0.5, 0.12], [0.12, -0.5, 0.12]] as V[],
  clip: [-0.53, 0.07, 0.2] as V,
  tags: [-0.4, -0.13, 0.04] as V,
  handle: [0.02, 0.03, 0.13] as V,
};
const RESTOCK_SEQ: Seq = [['reach', 1.1], ['read', 1.5], ['pack', 1.2], ['tick', 1.5]];
const restockKey: KeyFn = (key, f, _u, t, n) => {
  const k = f.k;
  switch (key) {
    case 'reach': {
      const bin = KIT.bins[((n % 4) + 4) % 4];
      const low = bin[1] < 0;
      return hands({ l: f.o(0.08, 0.04, 0.14), r: ov(f, bin, 0, 0.02, 0.02), lean: low ? 0.4 : 0.08, nod: low ? 0.5 : -0.2, palms: 0.8, gl: 0.4, gr: 0.8, crouch: low ? 0.5 : 0 });
    }
    case 'read':
      // The expiry date read, held up and turned a little to the light.
      return hands({ l: f.bd(0.06 * k, 0.79 * f.H, 0.28 * k), r: f.bd(-0.04 * k, 0.8 * f.H + 0.01 * wave(t, 0.6), 0.29 * k), lean: 0, nod: 0.18, palms: 0.5, gl: 0.6, gr: 0.8 });
    case 'pack':
      return hands({ l: f.o(-0.02, 0.05, 0.13), r: f.o(0.02, -0.03 + 0.02 * wave(t, 1.1), 0), lean: 0.32, nod: 0.55, palms: 1.2, gl: 0.6, gr: 0.75 });
    case 'tick':
      return hands({ l: ov(f, KIT.clip, 0.02, -0.04, 0.01), r: ov(f, KIT.clip, 0.03 * wave(t, 1.4), 0.02 + 0.008 * wave(t, 3.1), 0.02), lean: 0.08, nod: 0.38, palms: 1.0, gl: 0.3, gr: 0.85 });
  }
  return hands({ l: f.o(0.08, 0.04, 0.14), r: f.o(0, 0, 0.1) });
};
/** Whether the restocked item's in the right hand (taken off the bin until it's in the bag), and which bin's. */
export function restockAt(t: number, ph: number): { held: boolean; bin: number } {
  const b = beatOf(RESTOCK_SEQ, t, ph);
  return { held: (b.from === 'reach' && b.e > 0.4) || b.from === 'read' || (b.from === 'pack' && b.u < 0.7 && b.e === 0), bin: ((b.n % 4) + 4) % 4 };
}

const TRIAGE_SEQ: Seq = [['pick', 1.2], ['write', 2.4], ['tear', 1.4], ['hang', 1.4]];
const triageKey: KeyFn = (key, f, u, t) => {
  const k = f.k;
  const H = f.H;
  switch (key) {
    case 'pick':
      return hands({ l: f.bd(0.16 * k, 0.6 * H, 0.16 * k), r: ov(f, KIT.tags, 0, 0.03, 0.02), lean: 0.32, nod: 0.5, palms: 0.9, gl: 0.3, gr: 0.75 });
    case 'write':
      return hands({ l: f.bd(0.05 * k, 0.72 * H, 0.3 * k), r: f.bd((-0.04 + 0.02 * wave(t, 1.3)) * k, 0.73 * H + 0.005 * wave(t, 3.7), 0.31 * k), lean: 0.04, nod: 0.45, palms: 0.9, gl: 0.6, gr: 0.85 });
    case 'tear':
      return hands({ l: f.bd(0.05 * k, 0.71 * H, 0.3 * k), r: f.bd(-0.02 * k, 0.69 * H - 0.08 * k * sm(u, 0.3, 0.75), 0.31 * k), lean: 0.04, nod: 0.42, palms: 0.7, gl: 0.8, gr: 0.8 });
    case 'hang':
      return hands({ l: ov(f, KIT.handle, -0.08, 0.02, 0), r: ov(f, KIT.handle, 0.03, 0.02 + 0.015 * wave(t, 1.6), 0), lean: 0.3, nod: 0.5, palms: 1.1, gl: 0.7, gr: 0.7 });
  }
  return hands({ l: f.o(-0.1, 0, 0.1), r: f.o(0.1, 0, 0.1) });
};
/** Where the triage tag is: which hand, whether its strip's torn off, its colour (0 red, 1 yellow, 2 green). */
export function triageAt(t: number, ph: number): { hand: 'l' | 'r' | 'none'; torn: boolean; colour: number; tied: boolean } {
  const b = beatOf(TRIAGE_SEQ, t, ph);
  const colour = ((b.n % 3) + 3) % 3;
  if (b.from === 'pick') return { hand: b.e > 0.5 ? 'l' : b.u > 0.5 ? 'r' : 'none', torn: false, colour, tied: false };
  if (b.from === 'write') return { hand: 'l', torn: false, colour, tied: false };
  if (b.from === 'tear') return { hand: b.e > 0.5 ? 'r' : 'l', torn: b.u > 0.6, colour, tied: false };
  return { hand: b.u < 0.5 ? 'r' : 'none', torn: true, colour, tied: b.u >= 0.5 };
}

// ---------------------------------------------------------------------------------------------
// The 119 console.

/** The console (offsets from the keyboard, the work point): the mouse, the red 출동 button, the map monitor. */
export const CONSOLE = {
  mouse: [0.25, 0.0, 0.02] as V,
  button: [-0.33, 0.025, -0.02] as V,
  map: [0.2, 0.31, -0.27] as V,
};
/** How far the call-taker leans in all through (the headset's drawn on the leant head). */
export const DISPATCH_LEAN = 0.08;
/** The middle of the head of someone `height` tall sat at a spot (x to their left, y up from the seat, z ahead), leant DISPATCH_LEAN. */
export function consoleHead(height: number): THREE.Vector3 {
  const k = height / 1.6;
  const up = 0.46 * height + 0.05 * k;
  return new THREE.Vector3(0, up * Math.cos(DISPATCH_LEAN), up * Math.sin(DISPATCH_LEAN) + 0.03 * k);
}
const DISPATCH_SEQ: Seq = [['type', 3], ['talk', 2.6], ['map', 1.8], ['type', 2.2], ['talk', 2], ['go', 1.2]];
const dispatchKey: KeyFn = (key, f, u, t) => {
  const k = f.k;
  const typing = (side: number, ph: number) => f.o(side, 0.016 + 0.015 * Math.max(0, wave(t, 6.5, ph)), 0);
  const c = consoleHead(f.H);
  // The left hand at the left earcup, pressing it on to hear the caller over the room.
  const cup = f.bd(0.11 * k, c.y + 0.0 * k, c.z + 0.01 * k);
  switch (key) {
    case 'type':
      return hands({ l: typing(-0.12, 0), r: typing(0.1, 0.5), lean: DISPATCH_LEAN, nod: 0.2, palms: 1.45, gl: 0.35, gr: 0.35, tap: true });
    case 'talk':
      return hands({ l: cup, r: ov(f, CONSOLE.mouse, 0.01 * wave(t, 0.5), 0.02, 0.01 * wave(t, 0.7)), lean: DISPATCH_LEAN, nod: 0.05, palms: 0.3, gl: 0.5, gr: 0.6 });
    case 'map':
      return hands({ l: typing(-0.12, 0), r: ov(f, CONSOLE.map, 0.02 * wave(t, 0.8), 0.015 * wave(t, 1.3), 0.03), lean: DISPATCH_LEAN, nod: -0.12, palms: 0.2, gl: 0.35, gr: 0.75 });
    case 'go': {
      const press = sm(u, 0.2, 0.4) * (1 - sm(u, 0.6, 0.85));
      return hands({ l: typing(-0.12, 0), r: ov(f, CONSOLE.button, 0, 0.03 - 0.02 * press, 0), lean: DISPATCH_LEAN, nod: 0.25, palms: 1.2, gl: 0.35, gr: 0.6 });
    }
  }
  return hands({ l: typing(-0.12, 0), r: typing(0.1, 0.5), lean: DISPATCH_LEAN });
};
/** What the console shows: the caller's line live (talking), the map's route (pointed at), the call-out lamp (pressed). */
export function dispatchAt(t: number, ph: number): { talking: boolean; goLamp: boolean; typing: boolean } {
  const b = beatOf(DISPATCH_SEQ, t, ph);
  return { talking: b.from === 'talk', goLamp: b.from === 'go' && b.u > 0.35, typing: b.from === 'type' };
}

// ---------------------------------------------------------------------------------------------
// Field care at the cot behind the ambulance.

/** The casualty on the cot (offsets from their chest, the work point): head to -x, so their right is +z. */
export const CARE = {
  wrist: [0.2, -0.05, 0.19] as V,
  mask: [-0.37, 0.04, 0] as V,
  monitor: [0.5, 0.06, 0.04] as V,
  shoulder: [-0.2, 0.0, 0.15] as V,
};
const CARE_SEQ: Seq = [['pulse', 2.8], ['mask', 2.2], ['monitor', 2], ['talk', 2.2]];
const careKey: KeyFn = (key, f, _u, t) => {
  const k = f.k;
  switch (key) {
    case 'pulse':
      // Two fingers on the wrist, the watch on the other wrist held where it can be read.
      return hands({ l: f.bd(0.1 * k, 0.66 * f.H, 0.26 * k), r: ov(f, CARE.wrist, 0, 0.02, 0), lean: 0.38, nod: 0.45, palms: 1.2, gl: 0.4, gr: 0.5 });
    case 'mask':
      return hands({ l: ov(f, CARE.mask, -0.04, 0.05, -0.02), r: ov(f, CARE.mask, 0.04, 0.05, 0.04), lean: 0.42, nod: 0.5, palms: 1.3, gl: 0.45, gr: 0.45 });
    case 'monitor':
      return hands({ l: f.o(0.1, -0.08, 0.24), r: ov(f, CARE.monitor, 0.01 * wave(t, 1.2), 0.05, 0.02), lean: 0.32, nod: 0.4, palms: 0.9, gl: 0.6, gr: 0.4 });
    case 'talk':
      // A hand on the shoulder: 병원으로 바로 모실게요.
      return hands({ l: f.bd(0.16 * k, 0.55 * f.H, 0.14 * k), r: ov(f, CARE.shoulder, 0, 0.03, 0), lean: 0.24, nod: 0.3, palms: 1.2, gl: 0.3, gr: 0.35 });
  }
  return hands({ l: f.o(0.1, 0, 0.2), r: f.o(-0.1, 0, 0.2) });
};
/** Whether the oxygen mask is on the casualty's face (fitted at the mask beat and left on until the round starts again). */
export function careAt(t: number, ph: number): { mask: boolean; tap: boolean } {
  const b = beatOf(CARE_SEQ, t, ph);
  return { mask: b.i >= 2 || (b.i === 1 && b.u > 0.5), tap: b.from === 'monitor' && b.e === 0 };
}

// ---------------------------------------------------------------------------------------------
// The cot's checks.

/** The cot's rail (the work point, on its near side, moving with its top as it's raised). */
const COT_SEQ: Seq = [['lift', 2.4], ['strap', 2.2], ['rail', 1.6], ['lower', 2.4]];
/** How far the cot's raised (0 its low loading height, 1 its working height). */
export function cotAt(t: number, ph: number): { lift: number; strap: number; rail: number } {
  const b = beatOf(COT_SEQ, t, ph);
  const lift = b.from === 'lift' ? (b.e > 0 ? 1 : sm(b.u, 0.1, 0.9)) : b.from === 'lower' ? (b.e > 0 ? 0 : 1 - sm(b.u, 0.1, 0.9)) : 1;
  const strap = b.from === 'strap' ? sm(b.u, 0.1, 0.75) : b.from === 'rail' ? 1 : b.from === 'lower' ? 1 : 0;
  const rail = b.from === 'rail' ? sm(b.u, 0.2, 0.7) : b.from === 'lower' ? 1 - sm(b.u, 0, 0.3) : 0;
  return { lift, strap, rail };
}
const cotKey: KeyFn = (key, f, u, t) => {
  // Bent further, and down on the knees a little, the lower the rail is (the work point rides on it).
  const h = f.o(0, 0, 0).y - f.bd(0, 0, 0).y;
  const lean = THREE.MathUtils.clamp((1.1 - h) * 0.8, 0.1, 0.55);
  const crouch = THREE.MathUtils.clamp((0.65 - h) / 0.35, 0, 0.5);
  switch (key) {
    case 'lift':
    case 'lower': {
      // Both hands on the rail, the weight taken as it goes.
      const effort = 0.01 * wave(t, 1.5);
      return hands({ l: f.o(-0.2, 0.02 + effort, 0), r: f.o(0.2, 0.02 + effort, 0), lean, nod: 0.45, palms: 1.3, gl: 0.9, gr: 0.9, crouch });
    }
    case 'strap': {
      const r = f.o(0.02, 0.06, -0.48).lerp(f.o(0.04, 0.07, 0.0), sm(u, 0.1, 0.7));
      return hands({ l: f.o(-0.06, 0.06, -0.02), r, lean: lean + 0.2 * (1 - sm(u, 0.1, 0.6)), nod: 0.5, palms: 1.1, gl: 0.5, gr: 0.85, crouch });
    }
    case 'rail': {
      const up = 0.12 * sm(u, 0.2, 0.7);
      return hands({ l: f.o(-0.16, 0.0 + up, 0.0), r: f.o(0.16, 0.0 + up, 0.0), lean: lean - 0.04, nod: 0.45, palms: 1.2, gl: 0.85, gr: 0.85, crouch });
    }
  }
  return hands({ l: f.o(-0.2, 0.02, 0), r: f.o(0.2, 0.02, 0), lean, crouch });
};

// ---------------------------------------------------------------------------------------------

const ROUNDS: Record<EmsMotion, Round> = {
  emsCpr: { seq: CPR_SEQ, key: cprKey, turn: { check: 0.12, tilt: 0.42, breath: 0.52, aedOn: -0.32, shock: -0.36 } },
  emsRestock: { seq: RESTOCK_SEQ, key: restockKey, turn: { tick: 0.38 } },
  emsTriage: { seq: TRIAGE_SEQ, key: triageKey },
  emsDispatch: { seq: DISPATCH_SEQ, key: dispatchKey, turn: { map: -0.12, go: 0.1 } },
  emsCare: { seq: CARE_SEQ, key: careKey, turn: { mask: 0.35, monitor: -0.3 } },
  emsCot: { seq: COT_SEQ, key: cotKey },
};

/** The spot's turn from square on now (to their left +), eased from beat to beat. */
export function emsTurn(m: EmsMotion, t: number, ph: number): number {
  const R = ROUNDS[m];
  const b = beatOf(R.seq, t, ph);
  const by = R.turn ?? {};
  return (by[b.from] ?? 0) + ((by[b.to] ?? 0) - (by[b.from] ?? 0)) * b.e;
}
/** The hands for a motion worked out in a frame (the builder puts what's held in them). */
export function emsHands(m: EmsMotion, f: Frame, t: number, ph: number): Hands {
  const R = ROUNDS[m];
  const b = beatOf(R.seq, t, ph);
  const a = R.key(b.from, f, b.u, t, b.n);
  if (b.e <= 0) return a;
  return mix(a, R.key(b.to, f, 0, t, b.i === R.seq.length - 1 ? b.n + 1 : b.n), b.e);
}

/**
 * A dweller doing one of these: the frame from where they are and the piece's work point. Every spot of
 * these faces its piece square on (its yaw π in the piece's frame) turned by emsTurn, so the piece's
 * own turn is the body's less that.
 */
export function emsDoing(m: EmsMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.35).setY(b.base.y + (b.sitting ? 0.28 : 0.9));
  const ph = emsPhase(p);
  const f = frameAt(p, b.yaw - Math.PI - emsTurn(m, t, ph), b.base, b.yaw, b.height, b.sitting);
  const h = emsHands(m, f, t, ph);
  return { reach: { l: h.l, r: h.r, lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap }, crouch: h.crouch || undefined };
}
