import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * A coast guard's work at the 해양경찰 파출소 (2026-10-27 workplace pipeline, at the user's request:
 * the work should look like the work). Dive training in the tank — down the line pinching the nose
 * to equalise with the inflator hose held up, hovering in trim, the mask cleared, an OK sign, the
 * gauge read, a slow turn round the tank, back up to the surface (the diver's at the middle of their
 * body, face down: a Spot 'fly'); kitting up at the dive gear rack (the BCD and its tank swung on, the
 * straps and the waist buckle, the mask down, the regulator in, a breath, an OK) and checking a
 * regulator (purged, breathed from, the gauge read, the valve turned); a life ring thrown on its
 * line from the quay to a float and hauled back in hand over hand; a wetsuit rinsed in the tub and
 * hung up to dry; the VHF watched and called on with the handset; a rescue drone flown from its pad.
 *
 * Each is a round of beats by one clock (cgPhase of the piece's `work` mark), and the hands are
 * worked out as offsets in the body's own frame (BO: to the dweller's left, up from the feet or the seat,
 * ahead of them; the body's own parts scaled with height, the piece's fixed) so the pieces
 * (workplaces/coastGuard.ts) put what's held — the ring, the mic, the suit, the gear on the back — in
 * the same place by the same numbers. Kept out of activity.ts (which only hands these motions over
 * here) so this imports nothing from it at run time.
 */
export type CoastGuardMotion = 'cgDive' | 'cgGearUp' | 'cgRegCheck' | 'cgThrow' | 'cgRinse' | 'cgVhf' | 'cgVhfLog' | 'cgDrone';
export const COAST_GUARD_MOTIONS = new Set<string>(['cgDive', 'cgGearUp', 'cgRegCheck', 'cgThrow', 'cgRinse', 'cgVhf', 'cgVhfLog', 'cgDrone']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const sstep = THREE.MathUtils.smoothstep;
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** The clock offset (as activity.ts toolPhase): from a fixed mark on the piece, so two pieces aren't in step. */
export const cgPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** An offset in the body's frame: to their left, up, ahead (metres). */
export interface BO {
  side: number;
  up: number;
  ahead: number;
}
export const bo = (side: number, up: number, ahead: number): BO => ({ side, up, ahead });
const boMix = (a: BO, b: BO, e: number): BO => bo(mix(a.side, b.side, e), mix(a.up, b.up, e), mix(a.ahead, b.ahead, e));
const boAdd = (a: BO, b: BO): BO => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);

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
/** How far through its hold a beat is (1 once it's easing on). */
const held = <K extends string>(b: Beat<K>) => (b.e > 0 ? 1 : b.v / b.hold);

/** The hands and the bend for one beat, in the body's frame. */
export interface Hands {
  l: BO;
  r: BO;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
}
function blendHands(a: Hands, z: Hands, e: number): Hands {
  if (e <= 0) return a;
  return { l: boMix(a.l, z.l, e), r: boMix(a.r, z.r, e), lean: mix(a.lean, z.lean, e), nod: mix(a.nod, z.nod, e), palms: mix(a.palms, z.palms, e), gl: mix(a.gl, z.gl, e), gr: mix(a.gr, z.gr, e), crouch: mix(a.crouch ?? 0, z.crouch ?? 0, e) };
}

/** Heights on a 1.6 m body (scaled with height), from the feet stood or the seat's top sat. */
const BODY = { chest: 0.7 * 1.6, mouth: 0.86 * 1.6, waist: 0.56 * 1.6, eye: 0.925 * 1.6, sitChest: 0.3 * 1.6, sitMouth: 0.46 * 1.6, sitWaist: 0.12 * 1.6 };

// ---------------------------------------------------------------------------------------------
// The dive tank: where the diver is in the water, and their hands.

/**
 * A dive in the training tank (~37 s): down the line from the surface (the left hand pinching the
 * nose through the mask to equalise, the right holding the inflator hose up to let air out of the
 * BCD); hovering in trim with the hands together under the chest; the mask cleared (a hand pressed to
 * its top frame, the head tipped back); an OK sign to the instructor through the glass; the
 * pressure gauge held under the face and read; a slow turn right round the tank; back up with the
 * inflator held up and the eyes on the surface; a moment at the top.
 */
export type DiveKey = 'descend' | 'trim' | 'clear' | 'ok' | 'gauge' | 'turn' | 'ascend' | 'surface';
const DIVE: Array<Step<DiveKey>> = [st('descend', 6, 0.8), st('trim', 3.2, 0.8), st('clear', 2.6, 0.7), st('ok', 2.2, 0.7), st('gauge', 3, 0.8), st('turn', 7, 0.8), st('ascend', 5.5, 0.8), st('surface', 1.8, 0.8)];
export const diveBeat = (t: number, ph: number) => beatOf(DIVE, t, ph);
const depthOf = (b: Beat<DiveKey>): number => {
  const d = (k: DiveKey, u: number) => (k === 'descend' ? sstep(u, 0, 1) : k === 'ascend' ? 1 - sstep(u, 0, 1) : k === 'surface' ? 0 : 1);
  return b.e > 0 ? mix(d(b.from, 1), d(b.to, 0), b.e) : d(b.from, held(b));
};
/** How deep the diver is (0 just under the surface … 1 hovering over the bottom) and how far round they've turned (radians). */
export function diveAt(t: number, ph: number): { depth: number; turn: number; beat: Beat<DiveKey> } {
  const b = diveBeat(t, ph);
  const turn = b.from === 'turn' && b.e === 0 ? Math.PI * 2 * sstep(b.v / b.hold, 0, 1) : 0;
  return { depth: depthOf(b), turn, beat: b };
}
/** Where the diver's mask is on a face-down body (from the middle of it: ahead toward the head, up), metres on a 1.6 m body. */
export const DIVE_FACE = { ahead: 0.68, up: -0.1 };
/** Where each diver is just now (by their tank's work mark), so the tank can put the gear on them and the bubbles over them. */
export const DIVERS = new Map<string, { at: THREE.Vector3; yaw: number; k: number; t: number }>();
export const diverKey = (p: THREE.Vector3) => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;

/** The hands of the diver (`up` is up from the middle of the body, `ahead` toward the head). */
function diveHands(key: DiveKey, t: number, s: number, k: number): Hands {
  const claspL = bo(0.035 * k, -0.17 * k, 0.3 * k);
  const claspR = bo(-0.035 * k, -0.16 * k, 0.33 * k);
  const fin = 0.01 * wave(t, 0.9, s);
  switch (key) {
    case 'descend':
      return { l: bo(0.02 * k, -0.15 * k, 0.66 * k), r: bo(-0.2 * k, 0.26 * k + fin, 0.46 * k), lean: 0, nod: -0.25, palms: 0.3, gl: 0.8, gr: 0.85 };
    case 'clear':
      return { l: claspL, r: bo(-0.02 * k, -0.12 * k, 0.73 * k), lean: 0, nod: -0.6, palms: 0.6, gl: 0.6, gr: 0.3 };
    case 'ok':
      return { l: claspL, r: bo(-0.1 * k, -0.1 * k + fin, 0.98 * k), lean: 0, nod: -0.45, palms: 0, gl: 0.6, gr: 0.5 };
    case 'gauge':
      return { l: bo(0.04 * k, -0.36 * k, 0.6 * k), r: bo(-0.04 * k, -0.3 * k, 0.55 * k), lean: 0, nod: 0.2, palms: 1, gl: 0.85, gr: 0.4 };
    case 'ascend':
      return { l: claspL, r: bo(-0.2 * k, 0.28 * k + fin, 0.46 * k), lean: 0, nod: -0.7, palms: 0.3, gl: 0.6, gr: 0.85 };
    case 'surface':
      return { l: claspL, r: bo(-0.1 * k, -0.08 * k, 0.95 * k), lean: 0, nod: -0.6, palms: 0, gl: 0.6, gr: 0.5 };
    default:
      return { l: boAdd(claspL, bo(0, fin, 0)), r: claspR, lean: 0, nod: -0.4, palms: 0.6, gl: 0.6, gr: 0.6 };
  }
}

// ---------------------------------------------------------------------------------------------
// The dive gear rack: kitting up, and a regulator checked.

/** The rack as its spot has it: the BCD's hanger (where the hands take it) and the tank valve its regulator's on, metres from the feet. */
export const RACK = { hanger: bo(0, 1.22, 0.52), valve: bo(-0.36, 1.02, 0.5), hook: bo(-0.3, 1.18, 0.48) };
/**
 * Kitting up (~22 s): the BCD with its tank lifted off the rack, swung on (an arm back into the
 * strap), the shoulder straps pulled down snug, the waist buckle done, the mask pulled down from the
 * forehead and its strap set, the regulator into the mouth and a breath from it with the inflator
 * pressed, an OK sign; and the lot taken off and hung back.
 */
export type GearKey = 'reach' | 'lift' | 'shrug' | 'straps' | 'buckle' | 'mask' | 'reg' | 'breathe' | 'ok' | 'off';
const GEAR: Array<Step<GearKey>> = [st('reach', 1.4, 0.6), st('lift', 0.9, 0.6), st('shrug', 1.6, 0.6), st('straps', 1.6, 0.5), st('buckle', 2, 0.5), st('mask', 2.4, 0.6), st('reg', 1.4, 0.5), st('breathe', 2.6, 0.5), st('ok', 1.6, 0.6), st('off', 1.8, 0.7)];
export const gearBeat = (t: number, ph: number) => beatOf(GEAR, t, ph);
/** Where the gear is in a beat: on the rack, in the hands in front, or on the back; the mask on the forehead or the face; the regulator in. */
export function gearState(b: Beat<GearKey>) {
  const k = b.e > 0.5 ? b.to : b.from;
  const order: GearKey[] = ['reach', 'lift', 'shrug', 'straps', 'buckle', 'mask', 'reg', 'breathe', 'ok', 'off'];
  const i = order.indexOf(k);
  return {
    where: (k === 'reach' || k === 'off' ? 'rack' : k === 'lift' ? 'hands' : 'back') as 'rack' | 'hands' | 'back',
    mask: i > order.indexOf('mask') && i < order.indexOf('off') ? 'face' : k === 'mask' ? (b.e > 0 || b.v / b.hold > 0.45 ? 'face' : 'brow') : i > 1 && i < order.indexOf('off') ? 'brow' : 'none',
    reg: i >= order.indexOf('reg') && i <= order.indexOf('ok'),
  };
}
function gearHands(key: GearKey, t: number, s: number, k: number): Hands {
  const chest = BODY.chest * k;
  const waist = BODY.waist * k;
  const mouth = BODY.mouth * k;
  const eye = BODY.eye * k;
  switch (key) {
    case 'reach':
    case 'off':
      return { l: boAdd(RACK.hanger, bo(0.14, -0.1, -0.04)), r: boAdd(RACK.hanger, bo(-0.14, -0.1, -0.04)), lean: 0.14, nod: 0.12, palms: 0.4, gl: 0.9, gr: 0.9 };
    case 'lift':
      return { l: bo(0.16 * k, chest - 0.02 * k, 0.32 * k), r: bo(-0.16 * k, chest - 0.02 * k, 0.32 * k), lean: -0.04, nod: 0.2, palms: 0.4, gl: 0.95, gr: 0.95 };
    case 'shrug':
      return { l: bo(0.05 * k, chest, 0.18 * k), r: bo(-0.42 * k, chest - 0.05 * k, -0.12 * k), lean: 0.06, nod: 0.05, palms: 0.4, gl: 0.9, gr: 0.5 };
    case 'straps': {
      const tug = 0.025 * k * Math.max(0, wave(t, 1.2, s));
      return { l: bo(0.11 * k, chest + 0.06 * k - tug, 0.13 * k), r: bo(-0.11 * k, chest + 0.06 * k - tug, 0.13 * k), lean: 0.04, nod: 0.3, palms: 0.5, gl: 0.9, gr: 0.9 };
    }
    case 'buckle':
      return { l: bo(0.05 * k, waist + 0.03 * k, 0.17 * k), r: bo(-0.03 * k, waist + 0.03 * k + 0.008 * k * wave(t, 1.6, s), 0.17 * k), lean: 0.1, nod: 0.5, palms: 0.8, gl: 0.8, gr: 0.8 };
    case 'mask':
      return { l: bo(0.085 * k, eye + 0.01 * k, 0.07 * k), r: bo(-0.085 * k, eye + 0.01 * k, 0.07 * k), lean: 0, nod: -0.05, palms: -0.2, gl: 0.7, gr: 0.7 };
    case 'reg':
      return { l: bo(-0.06 * k, chest + 0.02 * k, 0.2 * k), r: bo(-0.015 * k, mouth - 0.03 * k, 0.15 * k), lean: 0.02, nod: 0.05, palms: 0.2, gl: 0.6, gr: 0.8 };
    case 'breathe':
      return { l: bo(0.15 * k, chest + 0.1 * k, 0.13 * k), r: bo(-0.015 * k, mouth - 0.03 * k, 0.15 * k), lean: 0.02, nod: 0.02 + 0.04 * wave(t, 0.25, s), palms: 0.2, gl: 0.8, gr: 0.8 };
    default:
      return { l: bo(0.18 * k, waist, 0.08 * k), r: bo(-0.15 * k, chest + 0.14 * k, 0.32 * k), lean: -0.02, nod: -0.06, palms: 0, gl: 0.3, gr: 0.5 };
  }
}
/**
 * A regulator checked (~14 s): its second stage taken off the hook on its hose, the purge pressed
 * (a hiss of air), breathed from, the pressure gauge held up and read, the tank valve opened a turn
 * and closed, and it's hung back.
 */
export type RegKey = 'take' | 'purge' | 'breathe' | 'gauge' | 'valve' | 'back';
const REG: Array<Step<RegKey>> = [st('take', 1.3, 0.6), st('purge', 2, 0.6), st('breathe', 2.8, 0.6), st('gauge', 2.6, 0.6), st('valve', 1.8, 0.6), st('back', 1.2, 0.6)];
export const regBeat = (t: number, ph: number) => beatOf(REG, t, ph);
function regHands(key: RegKey, t: number, s: number, k: number): Hands {
  const chest = BODY.chest * k;
  const mouth = BODY.mouth * k;
  const rest = bo(0.2 * k, BODY.waist * k, 0.1 * k);
  switch (key) {
    case 'take':
    case 'back':
      return { l: rest, r: boAdd(RACK.hook, bo(0, -0.02, -0.03)), lean: 0.1, nod: 0.15, palms: 0.4, gl: 0.3, gr: 0.85 };
    case 'purge': {
      const press = 0.01 * Math.max(0, wave(t, 1.4, s));
      return { l: rest, r: bo(-0.06 * k, chest + 0.04 * k - press, 0.3 * k), lean: 0.04, nod: 0.35, palms: 0.6, gl: 0.3, gr: 0.9 };
    }
    case 'breathe':
      return { l: rest, r: bo(-0.015 * k, mouth - 0.03 * k, 0.15 * k), lean: 0.02, nod: 0.02 + 0.05 * wave(t, 0.3, s), palms: 0.2, gl: 0.3, gr: 0.85 };
    case 'gauge':
      return { l: bo(0.04 * k, chest + 0.02 * k, 0.32 * k), r: bo(-0.06 * k, chest - 0.04 * k, 0.24 * k), lean: 0.05, nod: 0.45, palms: 1.1, gl: 0.85, gr: 0.85 };
    default:
      return { l: rest, r: boAdd(RACK.valve, bo(0, 0.08, -0.02)), lean: 0.12, nod: 0.2, palms: 0.4 + 0.5 * wave(t, 0.6, s), gl: 0.3, gr: 0.9 };
  }
}

// ---------------------------------------------------------------------------------------------
// The life ring thrown from the quay.

/** From the thrower's feet: the ring on its stand, the float it's thrown to (on the water), the quay's edge it's hauled back to. */
export const THROW = { rest: bo(0.52, 0.95, 0.18), target: bo(-0.1, 0.02, 1.85), edge: bo(-0.02, 0.05, 0.5), water: 0.02 };
/**
 * The throw (~18 s): the ring taken off its stand; the line's coil in the left hand, the ring in the
 * right, an eye on the float; an underarm swing back and the throw — the ring flies out (`flight`) and
 * lands by the float; hauled in hand over hand along the water; lifted out at the edge and hung back.
 */
export type ThrowKey = 'take' | 'coil' | 'swing' | 'throw' | 'watch' | 'haul' | 'lift' | 'hang';
const THROW_STEPS: Array<Step<ThrowKey>> = [st('take', 1.2, 0.6), st('coil', 1.6, 0.6), st('swing', 0.5, 0.45), st('throw', 1.1, 0.3), st('watch', 1.2, 0.5), st('haul', 5.5, 0.6), st('lift', 1, 0.6), st('hang', 1, 0.7)];
export const throwBeat = (t: number, ph: number) => beatOf(THROW_STEPS, t, ph);
function throwKey(key: ThrowKey, _t: number, _s: number, k: number, haul: number): Hands {
  const chest = BODY.chest * k;
  const waist = BODY.waist * k;
  const coil = bo(0.16 * k, waist + 0.08 * k, 0.24 * k);
  switch (key) {
    case 'take':
    case 'hang':
      return { l: boAdd(THROW.rest, bo(0.05, -0.12, 0)), r: boAdd(THROW.rest, bo(-0.1, -0.05, 0)), lean: 0.1, nod: 0.15, palms: 0.4, gl: 0.8, gr: 0.85 };
    case 'coil':
      return { l: coil, r: bo(-0.24 * k, waist, 0.12 * k), lean: 0.02, nod: -0.05, palms: 0.4, gl: 0.85, gr: 0.9 };
    case 'swing':
      return { l: coil, r: bo(-0.22 * k, waist - 0.22 * k, -0.28 * k), lean: 0.12, nod: -0.1, palms: 0.6, gl: 0.85, gr: 0.9, crouch: 0.2 };
    case 'throw':
    case 'watch':
      return { l: coil, r: bo(-0.12 * k, chest + 0.26 * k, 0.52 * k), lean: -0.04, nod: -0.12, palms: 0.2, gl: 0.85, gr: key === 'throw' ? 0.15 : 0.1, crouch: 0 };
    case 'haul': {
      // Hand over hand: each hand reaches out along the line and draws it back past the hip in turn.
      const a = haul * Math.PI * 2 * 4;
      const reach = (p: number) => bo(0, chest - 0.05 * k - 0.12 * k * (0.5 + 0.5 * Math.cos(a + p)), (0.28 + 0.24 * (0.5 + 0.5 * Math.sin(a + p))) * k);
      const l = reach(0);
      const r = reach(Math.PI);
      return { l: boAdd(l, bo(0.07 * k, 0, 0)), r: boAdd(r, bo(-0.07 * k, 0, 0)), lean: 0.22, nod: 0.12, palms: 0.9, gl: 0.9, gr: 0.9, crouch: 0.15 };
    }
    default:
      return { l: boAdd(THROW.edge, bo(0.12, 0.2, -0.07)), r: boAdd(THROW.edge, bo(-0.12, 0.2, -0.07)), lean: 0.45, nod: 0.5, palms: 0.8, gl: 0.9, gr: 0.9, crouch: 0.7 };
  }
}
/** The throw's hands and where the ring is (from the thrower's feet), and whether the line's paid out to it. */
export function throwRound(t: number, ph: number, k: number) {
  const b = throwBeat(t, ph);
  const s = ph * 7.1;
  const u = held(b);
  const haulOf = (key: ThrowKey) => (key === 'haul' ? (b.from === 'haul' && b.e === 0 ? u : 1) : 0);
  const a = throwKey(b.from, t, s, k, haulOf(b.from));
  const z = throwKey(b.to, t, s, k, 0);
  const hands = blendHands(a, z, b.e);
  const bob = 0.012 * wave(t, 0.5, s);
  const onWater = (p: BO) => bo(p.side, THROW.water + bob, p.ahead);
  const release = throwKey('throw', t, s, k, 0).r;
  let ring: BO;
  let out = true;
  if (b.from === 'throw' && b.e === 0) {
    // In the air from the hand to the float, the line paying out after it.
    const f = sstep(Math.min(1, b.v / 0.8), 0, 1);
    const p = boMix(release, onWater(THROW.target), f);
    ring = bo(p.side, p.up + 0.7 * Math.sin(Math.PI * f), p.ahead);
  } else if (b.from === 'watch' || (b.from === 'throw' && b.e > 0)) ring = onWater(THROW.target);
  else if (b.from === 'haul') ring = b.e > 0 ? boMix(onWater(THROW.edge), boAdd(hands.r, bo(0.12, -0.05, 0.04)), b.e) : onWater(boMix(THROW.target, THROW.edge, sstep(u, 0, 1)));
  else if (b.from === 'lift') ring = boAdd(hands.r, bo(0.12, -0.05, 0.04));
  else if (b.from === 'take' && b.e === 0) {
    ring = THROW.rest;
    out = false;
  } else if (b.from === 'hang') {
    ring = b.e > 0 ? THROW.rest : boMix(boAdd(hands.r, bo(0.12, -0.05, 0.04)), THROW.rest, sstep(u, 0.3, 1));
    out = false;
  } else {
    // In the right hand (taken, coiled, swung).
    ring = boAdd(hands.r, bo(-0.05, -0.12, 0.02));
    out = b.from !== 'take';
  }
  return { hands, ring, out, coil: hands.l, beat: b };
}

// ---------------------------------------------------------------------------------------------
// The wetsuit rinsed and hung up.

/** From the rinser's feet: the rinse tub's water (where the suit's dunked, just in front of the rail) and the hanger's hook on the drying rail over it. */
export const RINSE = { tub: bo(0, 0.5, 0.32), hook: bo(0, 1.6, 0.6) };
/**
 * A wetsuit rinsed (~17 s): taken down off the rail by its hanger, dunked in the tub of fresh water
 * and swished about (bent over it), lifted out dripping, hung back on the rail, smoothed down, and
 * sprayed over with the hose.
 */
export type RinseKey = 'take' | 'dunk' | 'lift' | 'hang' | 'smooth' | 'spray';
const RINSE_STEPS: Array<Step<RinseKey>> = [st('take', 1, 0.8), st('dunk', 3.6, 0.7), st('lift', 1.2, 0.8), st('hang', 1, 0.6), st('smooth', 2.4, 0.6), st('spray', 3, 0.7)];
export const rinseBeat = (t: number, ph: number) => beatOf(RINSE_STEPS, t, ph);
function rinseHands(key: RinseKey, t: number, s: number, k: number): Hands {
  const chest = BODY.chest * k;
  switch (key) {
    case 'take':
    case 'hang':
      return { l: boAdd(RINSE.hook, bo(0.05, -0.06, -0.02)), r: boAdd(RINSE.hook, bo(-0.04, -0.03, -0.02)), lean: 0.02, nod: -0.25, palms: 0.4, gl: 0.85, gr: 0.85 };
    case 'dunk': {
      const a = t * Math.PI * 2 * 0.6 + s;
      return { l: boAdd(RINSE.tub, bo(0.1 + 0.05 * Math.cos(a), 0.04 + 0.03 * Math.sin(a * 2), 0.03 * Math.sin(a))), r: boAdd(RINSE.tub, bo(-0.1 + 0.05 * Math.cos(a), 0.04 + 0.03 * Math.sin(a * 2 + 1), 0.03 * Math.sin(a))), lean: 0.45, nod: 0.5, palms: 0.9, gl: 0.85, gr: 0.85, crouch: 0.35 };
    }
    case 'lift':
      return { l: boAdd(RINSE.tub, bo(0.1, 0.95, -0.08)), r: boAdd(RINSE.tub, bo(-0.1, 0.95, -0.08)), lean: 0.06, nod: 0.1, palms: 0.4, gl: 0.9, gr: 0.9 };
    case 'smooth': {
      const d = 0.5 + 0.5 * wave(t, 0.45, s);
      return { l: boAdd(RINSE.hook, bo(0.1, -0.3 - 0.5 * d, -0.06)), r: boAdd(RINSE.hook, bo(-0.1, -0.3 - 0.5 * d, -0.06)), lean: 0.08 + 0.15 * d, nod: 0.2 + 0.2 * d, palms: 1.3, gl: 0.2, gr: 0.2, crouch: 0.15 * d };
    }
    default: {
      // The hose's spray gun in the right hand, played up and down the suit.
      const d = 0.5 + 0.5 * wave(t, 0.35, s);
      return { l: bo(0.18 * k, BODY.waist * k, 0.12 * k), r: bo(-0.18 * k, chest - 0.1 * k + 0.12 * k * d, 0.3 * k), lean: 0.04, nod: 0.2 - 0.3 * d, palms: 0.2, gl: 0.3, gr: 0.9 };
    }
  }
}
/** The rinse's hands and where the suit's hanger hook is (from the rinser's feet), and how far it's sunk in the tub (0–1). */
export function rinseRound(t: number, ph: number, k: number) {
  const b = rinseBeat(t, ph);
  const s = ph * 7.1;
  const hands = blendHands(rinseHands(b.from, t, s, k), rinseHands(b.to, t, s, k), b.e);
  const inHands = boAdd(boMix(hands.l, hands.r, 0.5), bo(0, 0.04, 0));
  const tubHook = boAdd(RINSE.tub, bo(0, 0.12, 0));
  let hook: BO;
  let sunk = 0;
  switch (b.from) {
    case 'take':
      hook = b.e > 0 ? inHands : RINSE.hook;
      break;
    case 'dunk':
      hook = b.e > 0 ? inHands : tubHook;
      sunk = b.e > 0 ? 1 - b.e : sstep(held(b), 0, 0.15);
      break;
    case 'lift':
      hook = inHands;
      break;
    default:
      hook = RINSE.hook;
  }
  if (b.from === 'take' && b.e > 0) hook = boMix(RINSE.hook, tubHook, b.e);
  return { hands, hook, sunk, dripping: b.from === 'lift' || (b.from === 'dunk' && b.e > 0), spraying: b.from === 'spray' && b.e === 0, beat: b };
}

// ---------------------------------------------------------------------------------------------
// The VHF desk (sat), and the drone (stood).

/** From the seat's top: the handset's hook on the radio's front, the channel knob, the log on the desk. */
export const VHF = { hook: bo(-0.24, 0.42, 0.5), knob: bo(0.1, 0.38, 0.52), log: bo(0.16, 0.27, 0.36) };
/**
 * Calling on the VHF (cgVhf, ~17 s): a listen with the hands on the desk; the handset off its hook,
 * the key pressed and talked into, held at the chest listening for the reply with a hand to the
 * volume; hung back up and the call written in the log. Keeping the watch (cgVhfLog, ~15 s): leant in
 * listening to channel 16, the squelch knob turned, a note in the log, sat back watching the screen.
 */
export type VhfKey = 'listen' | 'take' | 'talk' | 'reply' | 'hangup' | 'note' | 'knob' | 'sit';
const CALL: Array<Step<VhfKey>> = [st('listen', 2.4, 0.6), st('take', 0.5, 0.5), st('talk', 3.4, 0.5), st('reply', 2.6, 0.6), st('hangup', 0.5, 0.6), st('note', 3, 0.7)];
const WATCH: Array<Step<VhfKey>> = [st('listen', 3.4, 0.7), st('knob', 2.2, 0.6), st('note', 3.4, 0.7), st('sit', 3.2, 0.7)];
export const vhfBeat = (m: 'cgVhf' | 'cgVhfLog', t: number, ph: number) => beatOf(m === 'cgVhf' ? CALL : WATCH, t, ph);
/** Whether the handset's in the hand. */
export const micHeld = (b: Beat<VhfKey>) => (b.from === 'take' && b.e > 0.5) || b.from === 'talk' || b.from === 'reply' || (b.from === 'hangup' && b.e < 0.5 && b.e > 0) || (b.from === 'hangup' && b.e === 0 && b.v < 0.25);
function vhfHands(key: VhfKey, t: number, s: number, k: number): Hands {
  const mouth = BODY.sitMouth * k;
  const chest = BODY.sitChest * k;
  const deskL = bo(0.16, 0.27, 0.34);
  const deskR = bo(-0.16, 0.27, 0.34);
  switch (key) {
    case 'take':
    case 'hangup':
      return { l: deskL, r: boAdd(VHF.hook, bo(0, -0.02, -0.03)), lean: 0.2, nod: 0.2, palms: 0.4, gl: 0.3, gr: 0.85 };
    case 'talk':
      return { l: deskL, r: bo(-0.03 * k, mouth - 0.04 * k, 0.1 * k), lean: 0.08, nod: 0.12 + 0.03 * wave(t, 1.2, s), palms: 0.1, gl: 0.3, gr: 0.85 };
    case 'reply':
      return { l: VHF.knob, r: bo(-0.08 * k, chest + 0.03 * k, 0.24 * k), lean: 0.16, nod: 0.08 + 0.05 * Math.max(0, wave(t, 0.5, s)) ** 4, palms: 0.4 + 0.3 * wave(t, 0.4, s), gl: 0.7, gr: 0.85 };
    case 'note':
      return { l: boAdd(VHF.log, bo(0.08, 0.005, -0.02)), r: boAdd(VHF.log, bo(-0.04 + 0.025 * wave(t, 2.1, s), 0.01 + 0.005 * wave(t, 4.2, s), 0.02 * wave(t, 1.1, s))), lean: 0.3, nod: 0.5, palms: 1.25, gl: 0.2, gr: 0.85 };
    case 'knob':
      return { l: deskL, r: boAdd(VHF.knob, bo(-0.2, 0, 0)), lean: 0.22, nod: 0.18, palms: 0.4 + 0.6 * wave(t, 0.5, s), gl: 0.3, gr: 0.8 };
    case 'sit':
      return { l: bo(0.14, 0.12 * k, 0.24), r: bo(-0.14, 0.12 * k, 0.24), lean: -0.06, nod: -0.04, palms: 0.9, gl: 0.3, gr: 0.3 };
    default:
      return { l: deskL, r: deskR, lean: 0.24 + 0.04 * wave(t, 0.2, s), nod: 0.15, palms: 1.2, gl: 0.3, gr: 0.3 };
  }
}
export function vhfRound(m: 'cgVhf' | 'cgVhfLog', t: number, ph: number, k: number) {
  const b = vhfBeat(m, t, ph);
  const s = ph * 7.1;
  return { hands: blendHands(vhfHands(b.from, t, s, k), vhfHands(b.to, t, s, k), b.e), held: m === 'cgVhf' && micHeld(b), beat: b };
}

/**
 * A rescue drone flown (~26 s): the screen on the controller checked, the drone up off its pad, out
 * over the water to where someone's in it, the rescue tube let go on its parachute line, a hover
 * looking down on it, back in and landed. `pos` is the drone in the station's frame (x across, y up,
 * z out of its front), the flyer stood at its front facing back into it.
 */
export type DroneKey = 'check' | 'up' | 'out' | 'hover' | 'drop' | 'back' | 'land';
const DRONE: Array<Step<DroneKey>> = [st('check', 2.4, 0.6), st('up', 2.2, 0.4), st('out', 4.4, 0.4), st('hover', 2, 0.3), st('drop', 2.4, 0.4), st('back', 4.4, 0.4), st('land', 2.2, 0.6)];
export const droneBeat = (t: number, ph: number) => beatOf(DRONE, t, ph);
/** The pad (where it sits), its hover over the pad, and the hover out over the water (the station's frame). */
export const DRONE_AT = { pad: new THREE.Vector3(0.28, 0.66, -0.08), over: new THREE.Vector3(0.28, 2.2, -0.08), sea: new THREE.Vector3(-3.6, 2.3, -0.9) };
export function droneRound(t: number, ph: number) {
  const b = droneBeat(t, ph);
  const u = held(b);
  const at = (k: DroneKey, v: number): THREE.Vector3 => {
    switch (k) {
      case 'check':
        return DRONE_AT.pad.clone();
      case 'up':
        return DRONE_AT.pad.clone().lerp(DRONE_AT.over, sstep(v, 0, 1));
      case 'out':
        return DRONE_AT.over.clone().lerp(DRONE_AT.sea, sstep(v, 0, 1));
      case 'hover':
      case 'drop':
        return DRONE_AT.sea.clone().add(new THREE.Vector3(0.05 * Math.sin(v * 5), 0.04 * Math.sin(v * 7), 0));
      case 'back':
        return DRONE_AT.sea.clone().lerp(DRONE_AT.over, sstep(v, 0, 1));
      default:
        return DRONE_AT.over.clone().lerp(DRONE_AT.pad, sstep(v, 0, 1));
    }
  };
  const pos = b.e > 0 ? at(b.from, 1).lerp(at(b.to, 0), b.e) : at(b.from, u);
  // Tipped into the way it's going.
  const ahead = b.e > 0 ? at(b.to, 0) : at(b.from, Math.min(1, u + 0.05));
  const vel = ahead.clone().sub(pos);
  const flying = b.from !== 'check' && !(b.from === 'land' && b.e > 0) && !(b.from === 'land' && u > 0.97);
  // The tube: under it till it's dropped, then down on the water till it's back.
  const dropped = (b.from === 'drop' && (b.e > 0 || u > 0.25)) || b.from === 'back' || (b.from === 'land' && b.e === 0);
  const fall = b.from === 'drop' && b.e === 0 ? sstep(u, 0.25, 0.75) : dropped ? 1 : 0;
  return { pos, vel, flying, dropped, fall, beat: b };
}
function droneHands(key: DroneKey, t: number, s: number, k: number): Hands {
  const chest = BODY.chest * k;
  const jink = 0.006 * wave(t, 1.7, s);
  const pad = (lean: number, nod: number): Hands => ({ l: bo(0.075 * k + jink, chest - 0.08 * k, 0.26 * k), r: bo(-0.075 * k + jink, chest - 0.08 * k, 0.26 * k), lean, nod, palms: 0.7, gl: 0.75, gr: 0.75 });
  switch (key) {
    case 'check':
      return pad(0.06, 0.5);
    case 'up':
    case 'land':
      return pad(0.02, 0.05);
    case 'drop':
      return { ...pad(0.02, -0.15), r: bo(-0.06 * k, chest - 0.05 * k, 0.27 * k) };
    default:
      return pad(-0.02, -0.2);
  }
}

// ---------------------------------------------------------------------------------------------

/** A body-frame offset in the world, from where a dweller stands (or sits, or floats) and faces. */
function toWorld(b: BodyAt, p: BO, out = new THREE.Vector3()): THREE.Vector3 {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  return out.copy(b.base).addScaledVector(fwd, p.ahead).addScaledVector(left, p.side).add(new THREE.Vector3(0, p.up, 0));
}
const asDoing = (b: BodyAt, h: Hands): Doing => ({ reach: { l: toWorld(b, h.l), r: toWorld(b, h.r), lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr } }, crouch: h.crouch ?? 0 });

/** The hands for each of these at time `t` (`work` the piece's mark the clock's taken from). */
export function coastGuardDoing(m: CoastGuardMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const k = b.height / 1.6;
  const p0 = work?.point ?? b.base;
  const ph = cgPhase(p0);
  const s = ph * 7.1;
  switch (m) {
    case 'cgDive': {
      // The tank reads where the diver is, to put the tank on their back and the bubbles over them.
      DIVERS.set(diverKey(p0), { at: b.base.clone(), yaw: b.yaw, k, t });
      const d = diveBeat(t, ph);
      return asDoing(b, blendHands(diveHands(d.from, t, s, k), diveHands(d.to, t, s, k), d.e));
    }
    case 'cgGearUp': {
      const g = gearBeat(t, ph);
      return asDoing(b, blendHands(gearHands(g.from, t, s, k), gearHands(g.to, t, s, k), g.e));
    }
    case 'cgRegCheck': {
      const r = regBeat(t, ph);
      return asDoing(b, blendHands(regHands(r.from, t, s, k), regHands(r.to, t, s, k), r.e));
    }
    case 'cgThrow':
      return asDoing(b, throwRound(t, ph, k).hands);
    case 'cgRinse':
      return asDoing(b, rinseRound(t, ph, k).hands);
    case 'cgVhf':
    case 'cgVhfLog':
      return asDoing(b, vhfRound(m, t, ph, k).hands);
    default: {
      const d = droneBeat(t, ph);
      return asDoing(b, blendHands(droneHands(d.from, t, s, k), droneHands(d.to, t, s, k), d.e));
    }
  }
}

/** The rounds' hands, for the pieces to put what's held in them. */
export const cgHands = {
  gear: (t: number, ph: number, k: number) => {
    const g = gearBeat(t, ph);
    return { hands: blendHands(gearHands(g.from, t, ph * 7.1, k), gearHands(g.to, t, ph * 7.1, k), g.e), beat: g };
  },
  reg: (t: number, ph: number, k: number) => {
    const r = regBeat(t, ph);
    return { hands: blendHands(regHands(r.from, t, ph * 7.1, k), regHands(r.to, t, ph * 7.1, k), r.e), beat: r };
  },
  drone: (t: number, ph: number, k: number) => {
    const d = droneBeat(t, ph);
    return blendHands(droneHands(d.from, t, ph * 7.1, k), droneHands(d.to, t, ph * 7.1, k), d.e);
  },
};
