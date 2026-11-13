import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * A style influencer's day at the studio (2026-10-27, the 스타일 스튜디오, at the user's request:
 * the work should look like it). A self-shot lookbook on the set, the wireless shutter hidden in the
 * right hand (a hand on the hip, the hands in the coat's pockets, the collar, a cuff fixed, a hand in
 * the hair, a stride), and a brand's 협찬 shoot with its bag and its perfume shown to the camera; a
 * dress form styled (the shoulders smoothed, a pin, the jacket put on it, the belt tied, stepped back
 * to look, the form turned); a look steamed on its hanger; the next week's outfits planned at the
 * desk with polaroids laid out in a grid and a swatch held to them; a full-length mirror's OOTD with
 * the phone in front of the face; the shoe and bag wall, one piece taken down and looked over at a
 * time; a 협찬 box opened and the knit in it held up to the body.
 *
 * Each is a round by the same clock (siPhase of a fixed mark on the piece, its `work`) as the piece
 * it's done at (workplaces/styleInfluencer.ts), which draws what's in the hands (the remote, the bag,
 * the bottle, the steamer's wand, a polaroid, the phone, a shoe, the knit) and moves or turns the
 * spot. Hands are offsets in the body's own frame (BarOffset: to their left, up from the feet or the
 * seat's top, ahead) for a 1.6 m dweller, scaled with height — or, at a table (the polaroids, the box),
 * from the piece's mark, unscaled. Kept out of activity.ts (which only hands these motions over here)
 * so it imports nothing from it at run time.
 */
export type StyleMotion = 'siLookbook' | 'siSponsor' | 'siDress' | 'siSteam' | 'siCards' | 'siMirror' | 'siPick' | 'siUnbox';
export const STYLE_MOTIONS = new Set<string>(['siLookbook', 'siSponsor', 'siDress', 'siSteam', 'siCards', 'siMirror', 'siPick', 'siUnbox']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const sstep = THREE.MathUtils.smoothstep;
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
export const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
export const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(mix(a.side, b.side, e), mix(a.up, b.up, e), mix(a.ahead, b.ahead, e));
export const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
export const boScale = (a: BarOffset, k: number): BarOffset => bo(a.side * k, a.up * k, a.ahead * k);
/** The clock offset (as activity.ts toolPhase): from a fixed mark on the piece, so two pieces aren't in step. */
export const siPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** A held pose: the hands (none: they hang), the bend, the grip. */
export interface Hold {
  l?: BarOffset;
  r?: BarOffset;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
}
const H0: Hold = { lean: 0, nod: 0, palms: 0, gl: 0.3, gr: 0.3 };
function holdMix(a: Hold, b: Hold, e: number): Hold {
  const hand = (p?: BarOffset, q?: BarOffset) => (p && q ? boMix(p, q, e) : e < 0.5 ? p : q);
  return {
    l: hand(a.l, b.l),
    r: hand(a.r, b.r),
    lean: mix(a.lean, b.lean, e),
    nod: mix(a.nod, b.nod, e),
    palms: mix(a.palms, b.palms, e),
    gl: mix(a.gl, b.gl, e),
    gr: mix(a.gr, b.gr, e),
    crouch: mix(a.crouch ?? 0, b.crouch ?? 0, e),
  };
}
const HIP_L = bo(0.17, 0.95, -0.02);
const HIP_R = bo(-0.17, 0.95, -0.02);

interface Step {
  hold: Hold;
  /** How far the spot turns for it (to the left, radians). */
  twist?: number;
  /** What's going on (the piece draws by it). */
  tag: string;
}
export interface StepAt {
  i: number;
  h: Hold;
  twist: number;
  /** Seconds into the hold (−1 while easing on to the next). */
  v: number;
  tag: string;
  /** How far between this step and the next (0 through the hold). */
  e: number;
  /** Which round this is (a new look each time). */
  n: number;
}
function stepAt(steps: Step[], hold: number, move: number, t: number, ph: number): StepAt {
  const T = steps.length * (hold + move);
  const c = t / T + ph;
  const n = Math.floor(c);
  const u = frac(c) * T;
  const i = Math.floor(u / (hold + move)) % steps.length;
  const v = u - i * (hold + move);
  const a = steps[i];
  const b = steps[(i + 1) % steps.length];
  const e = sstep(v, hold, hold + move);
  return { i, h: holdMix(a.hold, b.hold, e), twist: mix(a.twist ?? 0, b.twist ?? 0, e), v: v < hold ? v : -1, tag: (e < 0.5 ? a : b).tag, e, n };
}
/** The strobes fire twice a hold (as the shutter's pressed), 0–1. */
export const shotFlash = (v: number) => (v < 0 ? 0 : Math.max(0, 1 - Math.abs(v - 1.0) / 0.09, 1 - Math.abs(v - 1.85) / 0.09));

// ---------------------------------------------------------------------------------------------
// The lookbook (siLookbook, 6 × 3.3 s): self-shot, the remote in the right hand.

/** The remote in the right hand (body frame, from the hand). */
const LOOKS: Step[] = [
  { hold: { ...H0, l: HIP_L, r: bo(-0.2, 0.84, 0.06), lean: -0.03, nod: -0.03, palms: 0.5, gl: 0.55, gr: 0.85 }, twist: 0.35, tag: 'hip' },
  { hold: { ...H0, l: bo(0.16, 0.9, 0.07), r: bo(-0.16, 0.9, 0.07), lean: -0.04, nod: -0.05, palms: 0.3, gl: 0.6, gr: 0.85 }, twist: -0.25, tag: 'pockets' },
  { hold: { ...H0, l: bo(0.07, 1.4, 0.1), r: bo(-0.2, 0.85, 0.07), lean: 0, nod: 0.1, palms: 0.6, gl: 0.75, gr: 0.85 }, twist: 0.15, tag: 'collar' },
  { hold: { ...H0, l: bo(0.1, 1.04, 0.26), r: bo(0.05, 1.07, 0.27), lean: 0.05, nod: 0.32, palms: 0.9, gl: 0.6, gr: 0.85 }, twist: 0, tag: 'cuff' },
  { hold: { ...H0, l: bo(0.12, 1.6, -0.02), r: bo(-0.19, 0.86, 0.05), lean: -0.05, nod: -0.12, palms: 0.4, gl: 0.45, gr: 0.85 }, twist: 0.55, tag: 'hair' },
  { hold: { ...H0, l: bo(0.2, 0.86, 0.14), r: bo(-0.2, 0.88, -0.1), lean: -0.02, nod: -0.02, palms: 0.2, gl: 0.4, gr: 0.85 }, twist: -0.12, tag: 'stride' },
];
export const LOOK_HOLD = 2.6;
export const lookbookAt = (t: number, ph: number) => stepAt(LOOKS, LOOK_HOLD, 0.7, t, ph);

// ---------------------------------------------------------------------------------------------
// The 협찬 shoot (siSponsor, 5 × 3.4 s): the brand's bag and its perfume.

const SPONSOR: Step[] = [
  { hold: { ...H0, l: bo(0.24, 0.86, 0.05), r: HIP_R, lean: -0.03, nod: -0.03, palms: 0.2, gl: 0.9, gr: 0.55 }, twist: 0.3, tag: 'carry' },
  { hold: { ...H0, l: bo(0.1, 1.27, 0.2), r: bo(-0.06, 1.42, 0.13), lean: 0, nod: 0.05, palms: 0.1, gl: 0.3, gr: 0.6 }, twist: -0.25, tag: 'crook' },
  { hold: { ...H0, l: bo(0.24, 0.86, 0.05), r: bo(-0.1, 1.5, 0.12), lean: 0, nod: -0.05, palms: 0.4, gl: 0.9, gr: 0.8 }, twist: 0.1, tag: 'cheek' },
  { hold: { ...H0, l: bo(0.07, 1.2, 0.36), r: bo(-0.07, 1.26, 0.42), lean: 0.06, nod: 0.05, palms: 0.6, gl: 0.2, gr: 0.8 }, twist: 0.25, tag: 'present' },
  { hold: { ...H0, l: bo(0.06, 1.15, 0.3), r: bo(-0.06, 1.15, 0.3), lean: 0.02, nod: 0.12, palms: 0.5, gl: 0.9, gr: 0.9 }, twist: 0, tag: 'show' },
];
export const SPONSOR_HOLD = 2.8;
/** Where the bag's handles and the bottle are (body frame), the bottle null when it's on the plinth. */
export function sponsorAt(t: number, ph: number) {
  const s = stepAt(SPONSOR, SPONSOR_HOLD, 0.6, t, ph);
  const l = s.h.l!;
  const r = s.h.r!;
  const bag = s.tag === 'crook' ? boAdd(l, bo(0.1, -0.16, -0.12)) : s.tag === 'show' ? boMix(l, r, 0.5) : l;
  const bottle = s.tag === 'cheek' || s.tag === 'present' ? boAdd(r, bo(0, 0.04, 0)) : null;
  return { ...s, bag, bottle };
}

// ---------------------------------------------------------------------------------------------
// A dress form styled (siDress, 6 × 2.8 s), stood at it, the form ~0.42 ahead.

/** Where the form's shoulders and waist are from the stylist's feet (body frame). */
export const FORM = { ahead: 0.42, shoulder: 1.34, waist: 1.04 };
const DRESS: Step[] = [
  { hold: { ...H0, l: bo(0.15, 1.34, 0.33), r: bo(-0.15, 1.34, 0.33), lean: 0.12, nod: 0.15, palms: 1.0, gl: 0.1, gr: 0.1 }, tag: 'smooth' },
  { hold: { ...H0, l: bo(0.07, 1.06, 0.3), r: bo(-0.03, 1.07, 0.31), lean: 0.18, nod: 0.42, palms: 0.9, gl: 0.8, gr: 0.9 }, tag: 'pin' },
  { hold: { ...H0, l: bo(0.15, 1.44, 0.34), r: bo(-0.15, 1.44, 0.34), lean: 0.1, nod: 0.05, palms: 0.6, gl: 0.8, gr: 0.8 }, tag: 'layer' },
  { hold: { ...H0, l: bo(0.05, 1.03, 0.32), r: bo(-0.05, 1.03, 0.32), lean: 0.2, nod: 0.45, palms: 1.0, gl: 0.75, gr: 0.75 }, tag: 'tie' },
  { hold: { ...H0, l: HIP_L, r: bo(-0.03, 1.42, 0.15), lean: -0.03, nod: 0.05, palms: 0.9, gl: 0.55, gr: 0.6 }, tag: 'look' },
  { hold: { ...H0, l: bo(0.18, 0.95, 0.1), r: bo(-0.12, 1.3, 0.36), lean: 0.1, nod: 0.12, palms: 0.4, gl: 0.3, gr: 0.2 }, tag: 'turn' },
];
export const DRESS_HOLD = 2.2;
export const DRESS_MOVE = 0.6;
/** `back`: how far they've stepped back from the form to look (m). */
export function dressAt(t: number, ph: number) {
  const s = stepAt(DRESS, DRESS_HOLD, DRESS_MOVE, t, ph);
  const into = s.i === 4 ? 1 - s.e : s.i === 3 ? s.e : 0;
  return { ...s, back: 0.3 * into };
}

// ---------------------------------------------------------------------------------------------
// A look steamed (siSteam): the wand drawn down the garment in strokes, the hem held taut.

/** The garment on the steamer's hanger, from the feet (body frame). */
export const STEAM = { ahead: 0.38, top: 1.5, bottom: 0.92 };
export function steamAt(t: number, ph: number) {
  const T = 2.4;
  const c = t / T + ph * 3;
  const n = Math.floor(c);
  const u = frac(c);
  // Down slowly through the steam, back up quick.
  const down = u < 0.75 ? sstep(u, 0, 0.75) : 1 - sstep(u, 0.75, 1);
  const side = [-0.08, 0.02, 0.11][n % 3];
  const head = bo(side, mix(STEAM.top - 0.04, STEAM.bottom + 0.06, down), STEAM.ahead - 0.06);
  const r = boAdd(head, bo(-0.03, -0.02, -0.12));
  // The left hand holds the hem out (or the shoulder, for the top of the stroke).
  const l = boMix(bo(0.13, STEAM.top - 0.05, STEAM.ahead - 0.03), bo(0.12, STEAM.bottom + 0.03, STEAM.ahead), sstep(down, 0.1, 0.4));
  return { head, r, l, lean: 0.08, nod: mix(0.05, 0.4, down), palms: 0.5, gl: 0.75, gr: 0.85, puff: u < 0.75, n };
}

// ---------------------------------------------------------------------------------------------
// Outfits planned at the desk (siCards), sat: polaroids off the pile laid in a 3 × 2 grid, a swatch
// held to every other one, the grid looked over and swept back up. From the desk's mark, unscaled
// (side to their left, up, ahead away from them).

export const CARD_PILE = bo(-0.3, 0, -0.02);
export const SWATCHES = bo(0.3, 0, 0);
export const CARD_SLOTS: BarOffset[] = [bo(0.14, 0, 0.08), bo(0, 0, 0.08), bo(-0.14, 0, 0.08), bo(0.14, 0, -0.08), bo(0, 0, -0.08), bo(-0.14, 0, -0.08)];
const CARD_T = 2.2;
export function cardsAt(t: number, ph: number) {
  const T = CARD_T * (CARD_SLOTS.length + 2);
  const u = frac(t / T + ph) * T;
  const i = Math.floor(u / CARD_T);
  const v = (u - i * CARD_T) / CARD_T;
  const restL = bo(0.2, 0.02, -0.14);
  const restR = bo(-0.2, 0.02, -0.14);
  let l = restL;
  let r = restR;
  let inHand: BarOffset | null = null;
  let swatch: BarOffset | null = null;
  let laid = Math.min(i, CARD_SLOTS.length);
  let lean = 0.28;
  let nod = 0.45;
  let gl = 0.35;
  let gr = 0.35;
  if (i < CARD_SLOTS.length) {
    // Off the pile, up to look at, down on its place, tapped flat.
    const slot = CARD_SLOTS[i];
    const lookAt = bo(-0.06, 0.18, -0.08);
    const card = v < 0.15 ? boMix(CARD_PILE, bo(CARD_PILE.side, 0.05, CARD_PILE.ahead), sstep(v, 0.05, 0.15)) : v < 0.4 ? boMix(bo(CARD_PILE.side, 0.05, CARD_PILE.ahead), lookAt, sstep(v, 0.15, 0.3)) : boMix(lookAt, slot, sstep(v, 0.45, 0.62));
    if (v > 0.03 && v < 0.64) inHand = card;
    r = v < 0.03 ? boMix(restR, CARD_PILE, sstep(v, 0, 0.03)) : v < 0.64 ? boAdd(card, bo(-0.02, 0.01, -0.03)) : boMix(boAdd(slot, bo(0, 0.01, -0.02)), restR, sstep(v, 0.75, 0.95));
    gr = v < 0.64 ? 0.7 : 0.2;
    // Every other one, a fabric swatch off the left pile held against it.
    if (i % 2 === 1 && v > 0.62 && v < 0.98) {
      const sw = v < 0.7 ? boMix(SWATCHES, boAdd(slot, bo(0.04, 0.03, 0.02)), sstep(v, 0.62, 0.7)) : v < 0.9 ? boAdd(slot, bo(0.04, 0.03, 0.02)) : boMix(boAdd(slot, bo(0.04, 0.03, 0.02)), SWATCHES, sstep(v, 0.9, 0.98));
      swatch = sw;
      l = boAdd(sw, bo(0.03, 0.01, -0.02));
      gl = 0.7;
    }
    if (v >= 0.64) laid = i + 1;
    nod = v > 0.15 && v < 0.4 ? 0.3 : 0.5;
  } else if (i === CARD_SLOTS.length) {
    // Looked over, a finger going from one to the next.
    laid = CARD_SLOTS.length;
    const k = Math.min(CARD_SLOTS.length - 1, Math.floor(v * CARD_SLOTS.length));
    r = boAdd(CARD_SLOTS[k], bo(0, 0.02 + 0.015 * Math.max(0, wave(v * CARD_T, 2.5)), -0.03));
    l = bo(0.12, 0.25, -0.2);
    gl = 0.5;
    gr = 0.6;
    lean = 0.22;
    nod = 0.5;
  } else {
    // Swept together and squared on the pile.
    laid = v < 0.5 ? CARD_SLOTS.length : 0;
    l = boMix(bo(0.2, 0.01, 0), CARD_PILE, sstep(v, 0.1, 0.6));
    r = boMix(bo(-0.2, 0.01, 0.05), boAdd(CARD_PILE, bo(-0.05, 0, 0)), sstep(v, 0.1, 0.6));
    gl = gr = 0.4;
  }
  return { l, r, inHand, swatch, laid, lean, nod, palms: 1.1, gl, gr, gather: i > CARD_SLOTS.length ? sstep(v, 0.1, 0.5) : 0 };
}

// ---------------------------------------------------------------------------------------------
// The OOTD in the long mirror (siMirror, 4 × 3 s): the phone in front of the face to the mirror.

const MIRROR: Step[] = [
  { hold: { ...H0, l: HIP_L, r: bo(-0.08, 1.36, 0.27), lean: -0.02, nod: 0.02, palms: 0.4, gl: 0.55, gr: 0.8 }, twist: 0.35, tag: 'hip' },
  { hold: { ...H0, l: bo(0.21, 0.86, 0.07), r: bo(-0.02, 1.46, 0.24), lean: 0, nod: -0.04, palms: 0.4, gl: 0.7, gr: 0.8 }, twist: 0, tag: 'cover' },
  { hold: { ...H0, l: bo(0.12, 1.05, 0.15), r: bo(-0.06, 1.2, 0.28), lean: 0.05, nod: 0.25, palms: 0.5, gl: 0.75, gr: 0.8 }, twist: -0.3, tag: 'low' },
  { hold: { ...H0, l: bo(0.04, 1.13, 0.25), r: bo(-0.04, 1.13, 0.25), lean: 0.06, nod: 0.42, palms: 0.9, gl: 0.6, gr: 0.6 }, twist: 0, tag: 'check' },
];
export const MIRROR_HOLD = 2.4;
/** The phone (body frame), its camera to the mirror (to `ahead`), and whether it's being looked at instead. */
export function mirrorAt(t: number, ph: number) {
  const s = stepAt(MIRROR, MIRROR_HOLD, 0.6, t, ph);
  const r = s.h.r!;
  const checking = s.tag === 'check';
  const phone = checking ? boMix(s.h.l!, r, 0.5) : boAdd(r, bo(0.01, 0.05, 0.02));
  return { ...s, phone, checking, flash: checking ? 0 : Math.max(0, 1 - Math.abs(s.v - 1.4) / 0.08) };
}

// ---------------------------------------------------------------------------------------------
// The shoe and bag wall (siPick, 4 × 4 s): one piece taken down, looked over and put back.

/** The shelf places of the four pieces looked at (body frame, the wall ~0.42 ahead). */
export const PICKS: BarOffset[] = [bo(0.22, 1.58, 0.4), bo(-0.2, 1.12, 0.4), bo(0.05, 0.3, 0.38), bo(-0.02, 0.78, 0.4)];
const PICK_T = 4;
export function pickAt(t: number, ph: number) {
  const T = PICK_T * PICKS.length;
  const u = frac(t / T + ph) * T;
  const i = Math.floor(u / PICK_T);
  const v = (u - i * PICK_T) / PICK_T;
  const shelf = PICKS[i];
  const look = bo(0.0, 1.18, 0.26);
  const out = sstep(v, 0.12, 0.25) - sstep(v, 0.78, 0.9);
  const item = boMix(shelf, look, out);
  const holding = v > 0.1 && v < 0.92;
  const reach = boAdd(item, bo(-0.04, -0.01, -0.04));
  const restR = bo(-0.2, 0.86, 0.05);
  const restL = bo(0.2, 0.86, 0.05);
  const r = v < 0.1 ? boMix(restR, reach, sstep(v, 0, 0.1)) : v < 0.92 ? reach : boMix(reach, restR, sstep(v, 0.92, 1));
  // The left hand comes to it while it's looked over.
  const l = boMix(restL, boAdd(item, bo(0.06, -0.02, -0.02)), sstep(v, 0.25, 0.32) - sstep(v, 0.72, 0.78));
  // Down on the haunches for the bottom shelf.
  const low = shelf.up < 0.5 ? 1 - out : 0;
  const crouch = low * (sstep(v, 0, 0.12) - sstep(v, 0.9, 1)) * 0.8;
  const spin = out > 0.9 ? 0.9 * wave((v - 0.3) * PICK_T, 0.3) : 0;
  return { i, item, out, holding, r, l, crouch, spin, lean: 0.05 + crouch * 0.3, nod: mix(0.1, 0.35, out) + crouch * 0.3, palms: 0.6, gl: out > 0.5 ? 0.7 : 0.3, gr: 0.75 };
}

// ---------------------------------------------------------------------------------------------
// A 협찬 box opened (siUnbox, 16 s), stood at the table: the lid off, the tissue parted, the knit
// lifted out and held up to the body, held out to the camera, folded back in and the lid on. From
// the box's top (the piece's mark), unscaled: side to their left, up, ahead away from them.

const keyedBo = (keys: Array<[number, BarOffset]>, u: number): BarOffset => {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return boMix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
};
export function unboxAt(t: number, ph: number) {
  const u = frac(t / 16 + ph);
  const on = bo(0, 0, 0);
  const aside = bo(0.36, -0.03, 0.06);
  const lid = keyedBo([[0.05, on], [0.1, bo(0, 0.16, -0.04)], [0.16, aside], [0.88, aside], [0.93, bo(0, 0.16, -0.04)], [0.98, on]], u);
  // The knit's shoulders' middle (and how unfolded it is, 0 folded in the box … 1 hanging full).
  const inBox = bo(0, -0.05, 0);
  const chest = bo(0, 0.48, -0.32);
  const outThere = bo(0, 0.5, -0.02);
  const knit = keyedBo([[0.3, inBox], [0.38, bo(0, 0.3, -0.12)], [0.42, chest], [0.6, chest], [0.65, outThere], [0.76, outThere], [0.82, bo(0, 0.25, -0.1)], [0.86, inBox]], u);
  const open = sstep(u, 0.33, 0.42) - sstep(u, 0.78, 0.85);
  const held = u > 0.3 && u < 0.86;
  let l: BarOffset;
  let r: BarOffset;
  let lean = 0.2;
  let nod = 0.4;
  let gl = 0.6;
  let gr = 0.6;
  if (u < 0.05) {
    l = bo(0.17, -0.02, -0.04);
    r = bo(-0.17, -0.02, -0.04);
  } else if (u < 0.18 || u > 0.87) {
    l = boAdd(lid, bo(0.15, 0, 0));
    r = boAdd(lid, bo(-0.15, 0, 0));
    gl = gr = 0.7;
  } else if (u < 0.3) {
    // The tissue parted to either side.
    const p = sstep(u, 0.19, 0.28);
    l = bo(mix(0.03, 0.13, p), 0.0, -0.02 + 0.02 * wave(t, 1.2, ph));
    r = bo(mix(-0.03, -0.13, p), 0.0, -0.02 + 0.02 * wave(t, 1.2, ph + 0.5));
    lean = 0.3;
    nod = 0.55;
    gl = gr = 0.4;
  } else {
    // By its shoulders.
    const w = mix(0.08, 0.17, open);
    l = boAdd(knit, bo(w, 0.0, 0));
    r = boAdd(knit, bo(-w, 0.0, 0));
    lean = u > 0.42 && u < 0.6 ? -0.02 : u > 0.65 && u < 0.76 ? 0.08 : 0.18;
    nod = u > 0.42 && u < 0.6 ? 0.42 : u > 0.65 && u < 0.76 ? 0.05 : 0.35;
    gl = gr = 0.8;
  }
  return { u, lid, knit, open, held, l, r, lean, nod, palms: 0.8, gl, gr, lidOn: u < 0.05 || u > 0.98 };
}

// ---------------------------------------------------------------------------------------------

/** The hands and bend for a style studio motion at `t`, from the piece's fixed mark (`work`). */
export function styleDoing(m: StyleMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const k = b.height / 1.6;
  const ph = siPhase(work?.point ?? b.base);
  const s = ph * 7.1;
  const body = (o: BarOffset) => b.base.clone().addScaledVector(left, o.side * k).addScaledVector(fwd, o.ahead * k).setY(b.base.y + o.up * k);
  const mark = (o: BarOffset) => {
    const p = work?.point ?? body(bo(0, 0.8, 0.45));
    return p.clone().addScaledVector(left, o.side).addScaledVector(fwd, o.ahead).setY(p.y + o.up);
  };
  const posed = (h: Hold, at: (o: BarOffset) => THREE.Vector3 = body): Doing => ({
    reach: { l: h.l && at(h.l), r: h.r && at(h.r), lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr } },
    crouch: h.crouch || undefined,
  });
  switch (m) {
    case 'siLookbook': {
      const a = lookbookAt(t, ph);
      return posed({ ...a.h, nod: a.h.nod + 0.015 * wave(t, 0.3, s) });
    }
    case 'siSponsor': {
      const a = sponsorAt(t, ph);
      return posed({ ...a.h, nod: a.h.nod + 0.015 * wave(t, 0.3, s) });
    }
    case 'siDress': {
      const a = dressAt(t, ph);
      let h = a.h;
      if (a.v >= 0 && h.l && h.r) {
        // Smoothed down and out; the belt's ends worked; a pin pushed home.
        const d = a.tag === 'smooth' ? bo(0.03 * wave(t, 0.9, s), -0.06 * Math.max(0, wave(t, 0.9, s)), 0) : a.tag === 'tie' ? bo(0.015 * wave(t, 2.2, s), 0.01 * wave(t, 4.4, s), 0) : a.tag === 'pin' ? bo(0, 0, 0.012 * Math.max(0, wave(t, 1.2, s))) : bo(0, 0, 0);
        h = { ...h, l: boAdd(h.l, bo(-d.side, d.up, d.ahead)), r: boAdd(h.r, d) };
      }
      return posed(h);
    }
    case 'siSteam': {
      const a = steamAt(t, ph);
      return posed({ l: a.l, r: a.r, lean: a.lean, nod: a.nod, palms: a.palms, gl: a.gl, gr: a.gr });
    }
    case 'siCards': {
      const a = cardsAt(t, ph);
      return { reach: { l: mark(a.l), r: mark(a.r), lean: a.lean, nod: a.nod, palms: a.palms, grip: { l: a.gl, r: a.gr } } };
    }
    case 'siMirror': {
      const a = mirrorAt(t, ph);
      let h = a.h;
      if (a.checking && h.r) h = { ...h, r: boAdd(h.r, bo(0, 0.008 * Math.max(0, wave(t, 2.4, s)), 0)) };
      return posed(h);
    }
    case 'siPick': {
      const a = pickAt(t, ph);
      return posed({ l: a.l, r: a.r, lean: a.lean, nod: a.nod, palms: a.palms, gl: a.gl, gr: a.gr, crouch: a.crouch });
    }
    case 'siUnbox': {
      const a = unboxAt(t, ph);
      return { reach: { l: mark(a.l), r: mark(a.r), lean: a.lean, nod: a.nod, palms: a.palms, grip: { l: a.gl, r: a.gr } } };
    }
  }
}
