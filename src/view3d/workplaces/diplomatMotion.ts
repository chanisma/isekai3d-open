import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * At the 외교부 청사 (2026-10-27, at the user's request: diplomacy should look like diplomacy). Each
 * motion is a round of beats, each held a while and eased into the next, by the same clock (dpPhase of
 * the spot) as the piece it's done at, so what the piece draws keeps in step (workplaces/diplomat.ts):
 * the counterpart across the negotiating table reaches over to shake the hand held out to them; the
 * globe on a desk spins under the hand that flicks it and slows; the champagne flute is in the left
 * hand at a reception all through, raised for the toast and tipped to the lips; a flag's cloth hangs
 * straighter once it's been smoothed and its corner tugged out; at a 협정 서명식 the folder's opened,
 * signed, shut, the hand shaken with the partner beside, and the folder held up for the cameras; in
 * the interpreters' booth the headset's on and the mic's light is lit while it's spoken into.
 * Kept out of activity.ts (which only hands these motions over here) so it imports nothing from it
 * at run time.
 */
export type DiplomatMotion = 'dpNegotiate' | 'dpTalks' | 'dpGlobe' | 'dpMingle' | 'dpFlag' | 'dpSign' | 'dpInterpret';
export const DIPLOMAT_MOTIONS = new Set<string>(['dpNegotiate', 'dpTalks', 'dpGlobe', 'dpMingle', 'dpFlag', 'dpSign', 'dpInterpret']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset (as activity.ts toolPhase): from where the spot is, so two places aren't in step. */
export const dpPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

type Step<K extends string> = { key: K; hold: number; turn: number; move: number };
export interface Beat<K extends string> {
  from: K;
  to: K;
  /** How far it's eased into the next (0 while held). */
  e: number;
  /** How far through the hold (0–1; 1 while easing on). */
  u: number;
  turn: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0);
  let u = frac(t / T + phase) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, u: u / k.hold, turn: k.turn };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) {
      const e = sm(Math.min(1, u / k.move), 0, 1);
      return { from: k.key, to: next.key, e, u: 1, turn: k.turn + (next.turn - k.turn) * e };
    }
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, u: 0, turn: 0 };
}
const st = <K extends string>(key: K, hold: number, turn = 0, move = 0.9): Step<K> => ({ key, hold, turn, move });
const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);
/** How much of a beat (by key) there is at this moment (0–1), eased in and out. */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  const w = (k: K) => (k === key ? 1 : 0);
  return w(b.from) + (w(b.to) - w(b.from)) * b.e;
}

// ---------------------------------------------------------------------------------------------
// The rounds.

/**
 * Negotiating at the 회담 테이블, sat, ~29 s round: listening with the hands clasped on the table and
 * a slow nod; both hands opened out over it, palms up, putting the case; a note written on the pad; a
 * finger tapping the clause in the draft; the hands opened again; then leant right in and the right
 * hand held out over the table's middle for the handshake (NEG_HAND from the papers), the counterpart
 * across reaching to it, both pumping together (shakePump). Talks with a delegation sat across
 * (dpTalks) leave out the handshake.
 */
export type NegKey = 'listen' | 'open' | 'note' | 'point' | 'shake';
const NEG: Array<Step<NegKey>> = [st('listen', 4), st('open', 3.5), st('note', 3), st('point', 2.5), st('open', 3), st('shake', 3.6, 0, 1.1), st('listen', 3)];
const TALKS: Array<Step<NegKey>> = [st('listen', 4), st('open', 3.5), st('note', 3), st('point', 2.5), st('open', 3), st('listen', 3)];
/** The handshake, from the papers at the dweller's place: over the table's middle, a hand's height up. */
export const NEG_HAND = { side: -0.03, up: 0.17, ahead: 0.3 };
export const negBeat = (t: number, phase: number) => beatOf(NEG, t, phase);
/** How far into the handshake both are (0–1). */
export const negShake = (t: number, phase: number) => amountOf(negBeat(t, phase), 'shake');
/** The two hands pumping together, up and down. */
export const shakePump = (t: number) => 0.022 * wave(t, 1.7);

/**
 * Studying the region at the desk's globe, sat, ~14 s round: the left hand flicks it round (globeTurn
 * spins it, slowing), stops it with a finger on a country, keeps it there with the right hand at the
 * chin, thinking; then a note on the pad (GLOBE.pad from the globe's near side) and back.
 */
export type GlobeKey = 'spin' | 'stop' | 'think' | 'note';
const GLOBE_SEQ: Array<Step<GlobeKey>> = [st('spin', 2.4, 0, 0.5), st('stop', 2.2), st('think', 2.8), st('note', 3.5), st('stop', 1.5, 0, 0.8)];
/** From the globe's near side at the equator (the motion's `work`), in the sitter's frame: the pad. */
export const GLOBE = { pad: { side: -0.16, up: -0.21, ahead: -0.06 } };
/** How far the globe's been turned (radians): flicked round at the start of each round and slowing. */
export function globeTurn(t: number, phase: number): number {
  const T = roundOf(GLOBE_SEQ);
  const c = t / T + phase;
  const n = Math.floor(c);
  const u = (c - n) * T;
  return (n + 1 - Math.exp(-u / 1.3)) * 3.4;
}

/**
 * Hosting a reception at the buffet, stood, ~22 s round: turned to the buffet, a canapé taken off the
 * tray with the right hand and eaten; turned round to the room (turn 1, the spot turned by a half
 * turn), the flute raised in a toast, a sip, chatting with the right hand making the point, listening
 * with a nod, and back to the buffet. The flute's in the left hand all through (glassAt: where, by the
 * same table as the hand), the canapé in the right while it's eaten.
 */
export type MingleKey = 'pick' | 'bite' | 'toast' | 'sip' | 'chat' | 'listen';
const MINGLE: Array<Step<MingleKey>> = [st('pick', 2.2, 0, 0.8), st('bite', 1.6, 0, 1.2), st('toast', 2.4, 1), st('sip', 1.8, 1), st('chat', 3.5, 1), st('listen', 3, 1), st('chat', 2.4, 1, 1.3)];
export const mingleBeat = (t: number, phase: number) => beatOf(MINGLE, t, phase);
/** The flute in the left hand, in the body's frame (to the left, up from the floor as a share of height, ahead) for a 1.6 m dweller; its tip toward the lips. */
const GLASS: Record<MingleKey, [number, number, number, number]> = {
  pick: [0.16, 0.66, 0.22, 0],
  bite: [0.16, 0.66, 0.22, 0],
  toast: [0.07, 0.94, 0.36, 0],
  sip: [0.04, 0.855, 0.12, 1.05],
  chat: [0.15, 0.64, 0.22, 0],
  listen: [0.12, 0.62, 0.2, 0],
};
/** Where the flute is held (x to the left, y up from the feet, z ahead, by height) and how far it's tipped. */
export function glassAt(t: number, phase: number, height: number): { at: THREE.Vector3; tip: number } {
  const b = mingleBeat(t, phase);
  const k = height / 1.6;
  const a = GLASS[b.from];
  const z = GLASS[b.to];
  const mix = (i: number) => a[i] + (z[i] - a[i]) * b.e;
  return { at: new THREE.Vector3(mix(0) * k, mix(1) * height, mix(2) * k), tip: mix(3) };
}
/** The canapé at the lips (the right hand), while it's eaten. */
export const CANAPE_AT = [-0.02, 0.86, 0.11] as const;

/**
 * Straightening the flags on their stand, stood, ~13 s round: both hands up to the cloth, smoothed
 * down it, the fly's lower corner tugged out straight, a step back to look up at it. flagTidy says how
 * straight it hangs (the stand draws its ripples smaller).
 */
export type FlagKey = 'reach' | 'smooth' | 'tug' | 'look';
const FLAG: Array<Step<FlagKey>> = [st('reach', 1.6, 0, 0.7), st('smooth', 3), st('tug', 2.2, 0, 0.7), st('look', 3, 0, 1)];
export const flagBeat = (t: number, phase: number) => beatOf(FLAG, t, phase);
export function flagTidy(t: number, phase: number): number {
  const b = flagBeat(t, phase);
  switch (b.from) {
    case 'reach':
      return 0.15;
    case 'smooth':
      return 0.15 + 0.55 * b.u;
    case 'tug':
      return 0.7 + 0.3 * b.u;
    default:
      return 1 - 0.85 * b.e;
  }
}

/**
 * A 협정 서명식 at the signing table, sat beside the partner, ~20 s round: the leather folder opened,
 * signed with a flourish (the left hand holding the page), shut; turned to the partner (SIGN_TURN)
 * and the hands shaken over the table between them (SIGN_HAND from the middle); turned back to the
 * cameras and the folder held up in both hands. The partner (drawn by the table) does the same.
 */
export type SignKey = 'open' | 'sign' | 'close' | 'shake' | 'show';
const SIGN: Array<Step<SignKey>> = [st('open', 2.2, 0, 0.8), st('sign', 4.5), st('close', 1.4, 0, 0.8), st('shake', 3.8, 1, 1.1), st('show', 3.2, 0, 1)];
export const SIGN_TURN = 0.9;
/** Each signatory's seat this far either side of the middle; the handshake this far out from the seats' line, this high up from the seats. */
export const SIGN_AT = { gap: 0.42, ahead: 0.34, up: 0.44 };
export const signBeat = (t: number, phase: number) => beatOf(SIGN, t, phase);
/** The folder held up for the cameras, in the body's frame (from the seat: to the left, up, ahead) for a 1.6 m dweller. */
export const SHOW_AT = [0, 0.45, 0.27] as const;

/**
 * Interpreting in the booth, sat, ~19 s round: the left hand pressing the headset's cup to the ear
 * all through; listening, the right hand on the notes; speaking into the mic with the right hand
 * shaping it; numbers jotted down; the cough key pressed (the mic off) and back. interpOn says when
 * the mic's lit.
 */
export type InterpKey = 'listen' | 'speak' | 'jot' | 'mute';
const INTERP: Array<Step<InterpKey>> = [st('listen', 3), st('speak', 4.5), st('jot', 2.5), st('speak', 3.5, 0, 0.6), st('mute', 1, 0, 0.5), st('listen', 2)];
export const interpBeat = (t: number, phase: number) => beatOf(INTERP, t, phase);
export const interpOn = (t: number, phase: number) => {
  const b = interpBeat(t, phase);
  return b.from === 'speak' || b.from === 'jot' || (b.to === 'speak' && b.e > 0.5);
};
/** The cough key, from the notes (the motion's `work`) in the sitter's frame. */
export const INTERP_KEY = { side: -0.19, up: 0.03, ahead: 0.1 };
/** How far the interpreter leans in all through (the headset's drawn on the leant head). */
export const INTERP_LEAN = 0.08;
/** Where the middle of the head is for someone `height` tall sat at a spot (x to their left, y up from the seat, z ahead), leant INTERP_LEAN. */
export function boothHead(height: number): THREE.Vector3 {
  const k = height / 1.6;
  const up = 0.46 * height + 0.05 * k;
  return new THREE.Vector3(0, up * Math.cos(INTERP_LEAN), up * Math.sin(INTERP_LEAN) + 0.03 * k);
}

// ---------------------------------------------------------------------------------------------
// The hands.

type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number };
function blend(a: Key, z: Key, e: number): Doing {
  const mix = (q: number, r: number) => q + (r - q) * e;
  return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: mix(a.gl, z.gl), r: mix(a.gr, z.gr) } } };
}
function posed<K extends string>(b: Beat<K>, pose: (k: K) => Key): Doing {
  return blend(pose(b.from), b.e > 0 ? pose(b.to) : pose(b.from), b.e);
}

export function diplomatDoing(m: DiplomatMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  const k = H / 1.6;
  const y0 = b.base.y;
  const ph = dpPhase(b.base);
  const s = ph * 7.1;
  /** The body's frame turned `turn` from where it faces (to their left, up, ahead). */
  const frame = (turn = 0) => {
    const yaw = b.yaw - turn;
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    return {
      fwd,
      left,
      bd: (side: number, up: number, ahead: number) => b.base.clone().addScaledVector(left, side).addScaledVector(fwd, ahead).setY(y0 + up),
      at: (p: THREE.Vector3, side: number, up = 0, ahead = 0) => p.clone().addScaledVector(left, side).addScaledVector(UP, up).addScaledVector(fwd, ahead),
    };
  };
  const { bd, at } = frame();
  const chest = (b.sitting ? 0.3 : 0.7) * H;
  const mouth = (b.sitting ? 0.46 : 0.86) * H;
  switch (m) {
    case 'dpNegotiate':
    case 'dpTalks': {
      // `work` is the papers at their place on the table.
      const p = work?.point ?? bd(0, 0.28 * k, 0.4 * k);
      const beat = m === 'dpTalks' ? beatOf(TALKS, t, ph) : negBeat(t, ph);
      return posed(beat, (key) => {
        switch (key) {
          case 'listen':
            return { l: at(p, 0.05, 0.03, 0.0), r: at(p, -0.04, 0.035, 0.02), lean: 0.1, nod: 0.06 + 0.08 * Math.max(0, wave(t, 0.4, s)) ** 4, palms: 1.0, gl: 0.6, gr: 0.6 };
          case 'open': {
            const lift = 0.025 * wave(t, 0.7, s);
            return { l: at(p, 0.22, 0.12 + lift, 0.14), r: at(p, -0.22, 0.12 - lift, 0.14), lean: 0.24, nod: -0.04, palms: -0.95, gl: 0.08, gr: 0.08 };
          }
          case 'note':
            return { l: at(p, 0.12, 0.008, -0.02), r: at(p, -0.03 + 0.03 * wave(t, 1.9, s), 0.012 + 0.006 * wave(t, 4.2, s), 0.02 * wave(t, 1.1, s)), lean: 0.3, nod: 0.45, palms: 1.25, gl: 0.25, gr: 0.85 };
          case 'point':
            return { l: at(p, 0.12, 0.008, -0.02), r: at(p, -0.13, 0.015 + 0.012 * Math.max(0, wave(t, 1.8, s)), 0.17), lean: 0.34, nod: 0.36, palms: 1.2, gl: 0.25, gr: 0.75 };
          default:
            return { l: at(p, 0.15, 0.01, -0.02), r: at(p, NEG_HAND.side, NEG_HAND.up + shakePump(t), NEG_HAND.ahead), lean: 0.42, nod: -0.06, palms: 0.05, gl: 0.3, gr: 0.6 };
        }
      });
    }
    case 'dpGlobe': {
      // `work` is the globe's near side at the equator.
      const p = work?.point ?? bd(0.2 * k, 0.5 * k, 0.45 * k);
      const pad = at(p, GLOBE.pad.side, GLOBE.pad.up, GLOBE.pad.ahead);
      const rest = at(pad, -0.2, 0.01, 0.02);
      return posed(beatOf(GLOBE_SEQ, t, ph), (key) => {
        switch (key) {
          case 'spin': {
            // A flick across its face, the hand lifting back for the next.
            const f = frac(t * 0.9 + s);
            const side = f < 0.4 ? 0.08 - 0.16 * sm(f, 0, 0.4) : -0.08 + 0.16 * sm(f, 0.4, 1);
            const off = f < 0.4 ? 0 : 0.05 * Math.sin(((f - 0.4) / 0.6) * Math.PI);
            return { l: at(p, side, 0.01 + off, -off * 0.6), r: rest, lean: 0.24, nod: 0.25, palms: 0.3, gl: 0.15, gr: 0.3 };
          }
          case 'stop':
            return { l: at(p, 0.0, 0.04, 0.005), r: rest, lean: 0.28, nod: 0.3, palms: 0.4, gl: 0.7, gr: 0.3 };
          case 'think':
            return { l: at(p, 0.0, 0.04, 0.005), r: bd(-0.04 * k, mouth - 0.07 * k, 0.15 * k), lean: 0.2, nod: 0.22 + 0.04 * wave(t, 0.3, s), palms: 0.2, gl: 0.7, gr: 0.7 };
          default:
            return { l: at(pad, 0.09, 0.008, 0.0), r: at(pad, -0.03 + 0.03 * wave(t, 1.9, s), 0.012 + 0.006 * wave(t, 4.2, s), 0.02 * wave(t, 1.1, s)), lean: 0.3, nod: 0.46, palms: 1.25, gl: 0.25, gr: 0.85 };
        }
      });
    }
    case 'dpMingle': {
      // `work` is the canapé tray's near edge; the spot turns round to the room (turn 1).
      const beat = mingleBeat(t, ph);
      const g = glassAt(t, ph, H);
      const glass = bd(g.at.x, g.at.y, g.at.z);
      const p = work?.point ?? bd(0, 0.55 * H, 0.45 * k);
      return posed(beat, (key) => {
        // The left hand's where the flute's drawn whatever the beat (glassAt blends the same table).
        const l = glass;
        switch (key) {
          case 'pick':
            return { l, r: at(p, -0.03 + 0.03 * wave(t, 0.5, s), 0.03 + 0.03 * Math.max(0, wave(t, 0.9, s)), 0.02), lean: 0.22, nod: 0.4, palms: 1.2, gl: 0.55, gr: 0.7 };
          case 'bite':
            return { l, r: bd(CANAPE_AT[0] * k, CANAPE_AT[1] * H, CANAPE_AT[2] * k), lean: 0.03, nod: 0.05, palms: 0.4, gl: 0.55, gr: 0.75 };
          case 'toast':
            return { l, r: bd(-0.24 * k, chest - 0.02 * k, 0.24 * k), lean: 0.0, nod: -0.12, palms: -0.7, gl: 0.55, gr: 0.1 };
          case 'sip':
            return { l, r: bd(-0.08 * k, 0.56 * H, 0.12 * k), lean: 0.0, nod: -0.18, palms: 0.4, gl: 0.55, gr: 0.3 };
          case 'chat':
            return { l, r: bd(-0.22 * k, chest - 0.03 * k + 0.035 * k * wave(t, 0.8, s), 0.3 * k), lean: 0.03, nod: -0.03 + 0.05 * Math.max(0, wave(t, 1.1, s)), palms: -0.6, gl: 0.55, gr: 0.15 };
          default:
            return { l, r: bd(-0.08 * k, 0.6 * H, 0.17 * k), lean: 0.04, nod: 0.06 + 0.08 * Math.max(0, wave(t, 0.45, s)) ** 4, palms: 0.4, gl: 0.55, gr: 0.4 };
        }
      });
    }
    case 'dpFlag': {
      // `work` is the middle of the cloth's face.
      const p = work?.point ?? bd(0, 0.95 * H, 0.4 * k);
      const beat = flagBeat(t, ph);
      return posed(beat, (key) => {
        switch (key) {
          case 'reach':
            return { l: at(p, 0.14, 0.12, -0.03), r: at(p, -0.12, 0.1, -0.03), lean: -0.04, nod: -0.3, palms: 0.2, gl: 0.3, gr: 0.3 };
          case 'smooth': {
            const d = 0.22 * beat.u;
            return { l: at(p, 0.14 - 0.04 * beat.u, 0.12 - d, -0.03), r: at(p, -0.12 - 0.08 * beat.u, 0.1 - d, -0.03), lean: -0.03, nod: -0.25, palms: 0.6, gl: 0.1, gr: 0.1 };
          }
          case 'tug':
            return { l: at(p, 0.06, -0.08, -0.02), r: at(p, -0.3, -0.16, 0.02 + 0.03 * Math.max(0, wave(t, 1.2, s))), lean: -0.02, nod: -0.18, palms: 0.2, gl: 0.3, gr: 0.85 };
          default:
            return { l: bd(0.2 * k, 0.47 * H, 0.04 * k), r: bd(-0.2 * k, 0.47 * H, 0.04 * k), lean: -0.06, nod: -0.32, palms: 0, gl: 0.3, gr: 0.3 };
        }
      });
    }
    case 'dpSign': {
      // `work` is the middle of their folder on the table; the spot turns to the partner on their left for the handshake.
      const beat = signBeat(t, ph);
      const f0 = frame(beat.turn * SIGN_TURN);
      const p = work?.point ?? f0.bd(0, 0.28 * k, 0.38 * k);
      const a0 = f0.at;
      return posed(beat, (key) => {
        switch (key) {
          case 'open':
            return { l: a0(p, 0.12, 0.012, 0.03), r: a0(p, -0.12 + 0.12 * beat.u, 0.012 + 0.05 * Math.sin(beat.u * Math.PI), 0.03), lean: 0.24, nod: 0.42, palms: 1.2, gl: 0.3, gr: 0.4 };
          case 'sign': {
            const u = frac(t * 0.45 + s);
            const flourish = u > 0.8 ? sm(u, 0.8, 0.9) - sm(u, 0.9, 1) : 0;
            return {
              l: a0(p, 0.09, 0.008, 0.02),
              r: a0(p, 0.03 - 0.12 * u + 0.03 * flourish, 0.012 + 0.005 * wave(t, 5.1, s) + 0.03 * flourish, -0.03 + 0.012 * wave(t, 2.3, s)),
              lean: 0.32,
              nod: 0.5,
              palms: 1.25,
              gl: 0.25,
              gr: 0.85,
            };
          }
          case 'close':
            return { l: a0(p, 0.12, 0.012, 0.03), r: a0(p, -0.02, 0.03, 0.03), lean: 0.24, nod: 0.38, palms: 1.2, gl: 0.3, gr: 0.4 };
          case 'shake': {
            const hand = f0.bd(SIGN_AT.gap, SIGN_AT.up + shakePump(t), SIGN_AT.ahead);
            return { l: a0(p, 0.05, 0.01, 0), r: hand, lean: 0.28, nod: -0.05, palms: 0.05, gl: 0.3, gr: 0.6 };
          }
          default:
            return { l: bd(0.12 * k, SHOW_AT[1] * k, SHOW_AT[2] * k), r: bd(-0.12 * k, SHOW_AT[1] * k, SHOW_AT[2] * k), lean: 0.02, nod: -0.08, palms: -0.2, gl: 0.6, gr: 0.6 };
        }
      });
    }
    default: {
      // dpInterpret: `work` is the notes on the console; the left hand at the headset's cup.
      const p = work?.point ?? bd(0, 0.28 * k, 0.38 * k);
      const head = boothHead(H);
      const cup = bd(head.x + 0.1 * k, head.y, head.z);
      const beat = interpBeat(t, ph);
      return posed(beat, (key) => {
        switch (key) {
          case 'listen':
            return { l: cup, r: at(p, -0.05, 0.012, 0.0), lean: INTERP_LEAN, nod: 0.12 + 0.04 * Math.max(0, wave(t, 0.5, s)) ** 4, palms: 1.2, gl: 0.5, gr: 0.3 };
          case 'speak':
            return { l: cup, r: at(p, -0.08 + 0.03 * wave(t, 0.7, s), 0.1 + 0.03 * wave(t, 1.1, s), 0.05), lean: INTERP_LEAN, nod: 0.02 + 0.03 * wave(t, 1.3, s), palms: -0.3, gl: 0.5, gr: 0.2 };
          case 'jot':
            return { l: cup, r: at(p, -0.02 + 0.03 * wave(t, 1.9, s), 0.012 + 0.006 * wave(t, 4.2, s), 0.02 * wave(t, 1.1, s)), lean: INTERP_LEAN, nod: 0.15, palms: 1.25, gl: 0.5, gr: 0.85 };
          default:
            return { l: cup, r: at(p, INTERP_KEY.side, INTERP_KEY.up - 0.008 * Math.max(0, wave(t, 2, s)), INTERP_KEY.ahead), lean: INTERP_LEAN, nod: 0.1, palms: 1.3, gl: 0.5, gr: 0.4 };
        }
      });
    }
  }
}
