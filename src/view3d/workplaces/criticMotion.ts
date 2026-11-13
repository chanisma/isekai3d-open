import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * A critic at work (2026-10-27, the 잡지사 편집국, at the user's request: tasting should look like
 * tasting, appraising like appraising). Each round gives the hands as offsets from where the critic
 * is (BarOffset from the feet stood, the seat's top sat: `side` to their left, `up`, `ahead` away from
 * them, metres) — the face's points scaled with their height — and what the glass, the knife and
 * fork, the pen, the loupe, the bottle and the page are doing by the same clock (critPhase of the
 * piece's work mark), so the pieces (workplaces/critic.ts) move them in step with the hands. The
 * pieces know the critic's height from the spot (activity.ts spotPose marks it). Kept out of
 * activity.ts (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type CriticMotion = 'wineTaste' | 'courseTaste' | 'appraise' | 'proofread' | 'loupe' | 'decant' | 'pinPage';
export const CRITIC_MOTIONS = new Set<string>(['wineTaste', 'courseTaste', 'appraise', 'proofread', 'loupe', 'decant', 'pinPage']);

export const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
export const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const numMix = (a: number, b: number, e: number) => a + (b - a) * e;
const sstep = THREE.MathUtils.smoothstep;
/** Eased along keys [u, value]: held before the first and after the last. */
function keyed<T>(keys: Array<[number, T]>, u: number, mix: (a: T, b: T, e: number) => T): T {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}
const frac = (x: number) => ((x % 1) + 1) % 1;
const within = (u: number, a: number, z: number) => u >= a && u < z;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** The same clock offset as activity.ts toolPhase, from the piece's work mark (in the world): two tables aren't in step, a critic and their glass always are. */
export const critPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** The face's points above the feet (stood) or the seat's top (sat), for someone `H` tall. */
function face(H: number, sitting: boolean) {
  const y = (stood: number, sat: number) => (sitting ? sat : stood) * H;
  return { eye: y(0.93, 0.53), nose: y(0.885, 0.49), mouth: y(0.86, 0.46), chin: y(0.83, 0.43), chest: y(0.7, 0.3), waist: y(0.56, 0.12) };
}

// ---------------------------------------------------------------------------------------------
// The wine cellar's tasting ledge (wineTaste): looked at, swirled, nosed, sipped, scored.

/**
 * Where things stand on the cellar's ledge, from the critic's feet: the glass (`glass`, the point on
 * its stem the fingers hold), the tasting card (`card`, its middle; the pencil on it).
 */
export const WINE = { glass: bo(-0.13, 1.01, 0.38), card: bo(0.15, 0.965, 0.36), stem: 0.045 };
/**
 * Stood at the ledge, ~16 s round. The glass taken by the stem and held up at arm's length, tipped,
 * against the white tasting card the left hand holds up behind it (the colour at the rim); brought
 * down and swirled; the nose put into it (a long sniff, the head bowed); swirled again and sipped
 * (the head back, the wine down a little: `level`); held a moment, then put down, and the score
 * written on the card. `glass` is the stem's grip (`held`, else at WINE.glass), `tilt` how far it's
 * tipped towards them, `card` the card's middle, `pen` the pencil's tip (`writing`).
 */
export function wineRound(t: number, phase: number, H: number) {
  const u = frac(t / 16 + phase);
  const f = face(H, false);
  const rest = WINE.glass;
  const eye = bo(-0.03, f.eye - 0.1, 0.36);
  const chest = bo(-0.07, f.chest - 0.02, 0.28);
  const nose = bo(-0.01, f.nose - 0.12, 0.15);
  const sip = bo(-0.01, f.mouth - 0.11, 0.13);
  const swirl = within(u, 0.3, 0.42) || within(u, 0.57, 0.62) ? bo(0.022 * Math.cos(t * Math.PI * 2 * 2.2), 0, 0.022 * Math.sin(t * Math.PI * 2 * 2.2)) : bo(0, 0, 0);
  const held = within(u, 0.05, 0.84);
  const glassAt = keyed<BarOffset>([[0.05, rest], [0.14, eye], [0.25, eye], [0.3, chest], [0.42, chest], [0.47, nose], [0.55, nose], [0.58, chest], [0.62, chest], [0.66, sip], [0.71, sip], [0.75, chest], [0.84, rest]], u, boMix);
  const glass = held ? boAdd(glassAt, swirl) : rest;
  const tilt = keyed<number>([[0.05, 0], [0.14, 0.6], [0.25, 0.6], [0.3, 0], [0.42, 0], [0.47, 0.35], [0.55, 0.35], [0.58, 0], [0.62, 0], [0.66, 1.0], [0.71, 1.0], [0.75, 0], [1, 0]], u, numMix);
  // The card held up behind the glass while its colour is looked at; else on the ledge under the left hand.
  const cardUp = sstep(u, 0.08, 0.13) * (1 - sstep(u, 0.25, 0.3));
  const card = boMix(WINE.card, boAdd(eye, bo(0.02, 0.06, 0.12)), cardUp);
  const l = boAdd(card, boMix(bo(0.05, 0.02, 0.05), bo(0.07, -0.02, 0), cardUp));
  const writing = within(u, 0.86, 0.98);
  const scribble = bo(0.03 * wave(t, 1.6), 0.004 * wave(t, 5), 0.01 * wave(t, 0.8));
  const penAt = boAdd(WINE.card, bo(-0.02, 0.012, -0.02));
  const onStem = (o: BarOffset) => boAdd(o, bo(-0.01, 0, -0.02));
  let r: BarOffset;
  if (held) r = onStem(glass);
  else if (u < 0.05) r = onStem(rest);
  else if (u < 0.86) r = boMix(onStem(rest), penAt, sstep(u, 0.84, 0.86));
  else if (writing) r = boAdd(penAt, scribble);
  else r = boMix(penAt, onStem(rest), sstep(u, 0.98, 1));
  // The pencil lies on the card where it's picked up.
  const pen = writing ? boAdd(penAt, scribble) : boAdd(penAt, bo(0, -0.006, 0));
  const level = 1 - 0.3 * sstep(u, 0.66, 0.71);
  const lean = keyed<number>([[0, 0.26], [0.05, 0.1], [0.1, 0.02], [0.42, 0.02], [0.46, 0.06], [0.55, 0.06], [0.58, 0.02], [0.8, 0.02], [0.86, 0.26]], u, numMix);
  const nod = keyed<number>([[0, 0.5], [0.05, 0.3], [0.12, -0.04], [0.25, -0.04], [0.3, 0.1], [0.42, 0.1], [0.46, 0.18], [0.55, 0.18], [0.58, 0.1], [0.64, -0.2], [0.71, -0.2], [0.75, 0.1], [0.82, 0.1], [0.86, 0.5]], u, numMix);
  return { u, l, r, glass, tilt, held, card, cardUp, pen, writing, level, lean, nod };
}

// ---------------------------------------------------------------------------------------------
// A course at the tasting table (courseTaste): cut, tasted, thought over, written up.

/** From the seat's top: the plate's middle, where the knife and fork rest on its rim, the notebook (its middle) and the pen on it. */
export const COURSE = { plate: bo(0, 0.29, 0.4), knife: bo(-0.13, 0.3, 0.39), fork: bo(0.13, 0.3, 0.39), book: bo(-0.33, 0.285, 0.34) };
/**
 * Sat at the table, ~18 s round: a piece cut (the knife sawing, the fork pinning it), carried to the
 * mouth on the fork, the cutlery laid on the plate's rim; chewed over, the chin in the right hand,
 * then the pen taken up and a line written in the notebook at the right; the knife and fork taken up
 * again. `knife` and `fork` are their grips (`knifeHeld`, `forkHeld`, else on the rim), `bite` while
 * there's a morsel on the fork, `pen` the pen's tip (`writing`).
 */
export function courseRound(t: number, phase: number, H: number) {
  const u = frac(t / 18 + phase);
  const f = face(H, true);
  const P = COURSE.plate;
  const saw = 0.028 * wave(t, 2.2);
  const cut = boAdd(P, bo(-0.045, 0.035, -0.03 + saw));
  const pin = boAdd(P, bo(0.035, 0.03, 0.0));
  const mouth = bo(0.0, f.mouth - 0.04, 0.12);
  const chin = bo(-0.02, f.chin - 0.03, 0.1);
  const penAt = boAdd(COURSE.book, bo(0.02, 0.01, 0));
  const scribble = bo(0.035 * wave(t, 1.3), 0.004 * wave(t, 4.4), 0.01 * wave(t, 0.65));
  const restL = bo(0.2, 0.3, 0.26);
  const r = keyed<BarOffset>([[0, cut], [0.26, cut], [0.29, COURSE.knife], [0.46, COURSE.knife], [0.5, chin], [0.6, chin], [0.64, penAt], [0.9, penAt], [0.95, COURSE.knife], [1, cut]], u, boMix);
  const writing = within(u, 0.64, 0.9);
  const rr = writing ? boAdd(r, scribble) : r;
  const l = keyed<BarOffset>([[0, pin], [0.26, pin], [0.32, mouth], [0.38, mouth], [0.42, COURSE.fork], [0.48, restL], [0.9, restL], [0.95, COURSE.fork], [1, pin]], u, boMix);
  const knifeHeld = u < 0.285 || u > 0.95;
  const forkHeld = u < 0.42 || u > 0.95;
  const pen = writing ? rr : boAdd(penAt, bo(0, -0.004, 0));
  const lean = keyed<number>([[0, 0.26], [0.27, 0.26], [0.31, 0.04], [0.42, 0.04], [0.46, 0.02], [0.62, 0.02], [0.65, 0.3], [0.89, 0.3], [0.94, 0.26]], u, numMix);
  const nod = keyed<number>([[0, 0.45], [0.27, 0.45], [0.31, -0.06], [0.4, -0.06], [0.46, 0.02], [0.62, 0.02], [0.65, 0.5], [0.89, 0.5], [0.94, 0.45]], u, numMix);
  return { u, l, r: rr, knife: knifeHeld ? r : COURSE.knife, fork: forkHeld ? l : COURSE.fork, knifeHeld, forkHeld, bite: within(u, 0.0, 0.37), pen, writing, chew: within(u, 0.38, 0.62), lean, nod, n: Math.floor(t / 18 + phase) };
}

// ---------------------------------------------------------------------------------------------
// A sculpture appraised (appraise): looked at from one side, the front, the other, close up.

/**
 * Stood round a work on its plinth, ~28 s round, the notebook in the left hand. From the front left
 * (the chin in the right hand), a few steps round to the front (a line written), on to the front
 * right, then in close bent to the surface, back to the front to write, and round to the left again.
 * `angle` is where round the plinth they stand (0 straight in front, + to its right as it faces
 * out), `dist` how far from its middle; `writing` while the pen's going. Notes for a show
 * (`exhibitNotes`) are taken without going round: the plinth leaves the critic where they are.
 */
export function appraiseRound(t: number, phase: number, H: number) {
  const u = frac(t / 28 + phase);
  const f = face(H, false);
  const stops: Array<[number, [number, number]]> = [
    [0.0, [-0.62, 0.95]], [0.2, [-0.62, 0.95]], [0.25, [0, 0.82]], [0.42, [0, 0.82]], [0.47, [0.62, 0.95]], [0.62, [0.62, 0.95]],
    [0.67, [0, 0.62]], [0.8, [0, 0.62]], [0.85, [0, 0.82]], [0.96, [0, 0.82]], [1, [-0.62, 0.95]],
  ];
  const [angle, dist] = keyed(stops, u, (a, b, e) => [numMix(a[0], b[0], e), numMix(a[1], b[1], e)] as [number, number]);
  const moving = within(u, 0.2, 0.25) || within(u, 0.42, 0.47) || within(u, 0.62, 0.67) || within(u, 0.8, 0.85) || u >= 0.96;
  const writing = within(u, 0.29, 0.4) || within(u, 0.87, 0.95);
  const close = within(u, 0.66, 0.81);
  const pad = bo(0.07, f.chest - 0.06, 0.27);
  const padDown = bo(0.13, f.waist + 0.06, 0.16);
  const raise = sstep(u, 0.26, 0.29) * (1 - sstep(u, 0.4, 0.43)) + sstep(u, 0.85, 0.87) * (1 - sstep(u, 0.95, 0.97));
  const l = boMix(padDown, pad, raise);
  const chin = bo(-0.01, f.chin - 0.05, 0.1);
  const scribble = bo(0.025 * wave(t, 1.5), 0.01 * wave(t, 0.7), 0.005 * wave(t, 4));
  const onPad = boAdd(pad, bo(-0.08, 0.02, 0.01));
  // Thinking (the chin in the hand), writing on the pad, the hand down at the side going round.
  const think = !moving && !writing;
  const side = bo(-0.2, f.waist - 0.02, 0.06);
  const near = boAdd(chin, bo(0, -0.02, 0.02));
  const r0 = keyed<BarOffset>([
    [0, side], [0.03, chin], [0.19, chin], [0.21, side], [0.25, side], [0.28, onPad], [0.4, onPad], [0.42, side], [0.47, side], [0.5, chin], [0.61, chin],
    [0.63, side], [0.66, side], [0.69, near], [0.79, near], [0.81, side], [0.85, side], [0.87, onPad], [0.95, onPad], [0.97, side],
  ], u, boMix);
  const r = writing ? boAdd(r0, scribble) : r0;
  const closeK = sstep(u, 0.64, 0.68) * (1 - sstep(u, 0.79, 0.82));
  const lean = 0.04 + 0.26 * closeK + 0.04 * raise;
  const nod = 0.12 + 0.05 * wave(t, 0.11) * (1 - raise) + 0.38 * raise + 0.13 * closeK;
  return { u, angle, dist, moving, writing, think, close, l, r, pad: boAdd(l, bo(-0.06, 0.02, 0.02)), lean, nod };
}

// ---------------------------------------------------------------------------------------------
// Page proofs marked up at the editor's desk (proofread).

/** From the seat's top: the proof's middle on the desk, its size (across, along), its lines' count, and the done pile's middle (at their left). */
export const PROOF = { sheet: bo(0.02, 0.27, 0.42), w: 0.21, len: 0.297, lines: 8, pile: bo(0.23, 0.27, 0.42) };
/**
 * Sat at the desk, ~14 s round: the left hand flat on the proof's left edge, the red pen down each
 * line in turn (lifted between), a mark made here and there; at the foot of the page the corner
 * taken and the page turned over onto the done pile at the left. `line` is the line the pen's on
 * (PROOF.lines when done), `flip` how far the page has gone over (0–1).
 */
export function proofRound(t: number, phase: number) {
  const u = frac(t / 14 + phase);
  const S = PROOF.sheet;
  const l = boAdd(S, bo(PROOF.w / 2 + 0.03, 0.012, 0.02));
  let r: BarOffset;
  let line = PROOF.lines;
  let flip = 0;
  let down = false;
  if (u < 0.84) {
    const v = (u / 0.84) * PROOF.lines;
    line = Math.floor(v);
    const w = v - line;
    const step = (PROOF.len - 0.08) / (PROOF.lines - 1);
    const ahead = PROOF.len / 2 - 0.04 - line * step - (w > 0.85 ? sstep(w, 0.85, 1) * step : 0);
    const along = w < 0.85 ? sstep(w, 0, 0.85) : 1 - sstep(w, 0.85, 1);
    down = w < 0.85;
    r = boAdd(S, bo(0.08 - 0.16 * along, down ? 0.012 + 0.003 * wave(t, 6) : 0.04, ahead));
  } else {
    flip = sstep(u, 0.86, 0.97);
    const corner = boAdd(S, bo(-PROOF.w / 2, 0.015, -PROOF.len / 2 + 0.03));
    const over = boAdd(PROOF.pile, bo(PROOF.w / 2 - 0.02, 0.03, -PROOF.len / 2 + 0.03));
    const start = boAdd(S, bo(0.08, 0.04, PROOF.len / 2 - 0.04));
    if (u < 0.86) r = boMix(boAdd(S, bo(0.08, 0.04, -PROOF.len / 2 + 0.04 - (PROOF.len - 0.08) / (PROOF.lines - 1))), corner, sstep(u, 0.84, 0.86));
    else if (u < 0.97) {
      const a = flip * Math.PI;
      r = boMix(corner, over, flip);
      r = boAdd(r, bo(0, Math.sin(a) * 0.16, 0));
    } else r = boMix(over, start, sstep(u, 0.97, 1));
  }
  return { u, l, r, line, flip, down, n: Math.floor(t / 14 + phase) };
}

// ---------------------------------------------------------------------------------------------
// Slides chosen on the light table (loupe).

/** From the feet: the light table's sheet of slides (its middle; 4 across, 3 along, `pitch` apart) and where the loupe's put down. */
export const LOUPE = { sheet: bo(0, 0.92, 0.44), cols: 4, rows: 3, pitch: 0.085, rest: bo(-0.3, 0.935, 0.34) };
/** A frame's middle on the sheet (k 0–11), from the feet. */
export const slideAt = (k: number): BarOffset => {
  const c = ((k % 12) + 12) % 12;
  const col = c % LOUPE.cols;
  const row = Math.floor(c / LOUPE.cols);
  return boAdd(LOUPE.sheet, bo((1.5 - col) * LOUPE.pitch, 0, (1 - row) * LOUPE.pitch * 1.2));
};
/**
 * Stood bent over the light table, ~16 s round: the loupe set on three frames of the sheet in turn,
 * the eye down to each; the loupe put down; the last one taken out of its sleeve and held up to the
 * light overhead, looked at long, and put back. `frames` are this round's three, `loupe` the loupe's
 * foot (`loupeHeld`), `slide` the held slide's middle (`slideUp`).
 */
export function loupeRound(t: number, phase: number, H: number) {
  const u = frac(t / 16 + phase);
  const n = Math.floor(t / 16 + phase);
  const f = face(H, false);
  const frames = [0, 1, 2].map((i) => (n * 5 + i * 7 + 3) % 12);
  const visit = (i: number) => boAdd(slideAt(frames[i]), bo(0, 0.04, 0));
  const loupe = keyed<BarOffset>([[0.0, LOUPE.rest], [0.05, visit(0)], [0.2, visit(0)], [0.25, visit(1)], [0.42, visit(1)], [0.47, visit(2)], [0.64, visit(2)], [0.7, LOUPE.rest]], u, boMix);
  const loupeHeld = u < 0.7;
  const slideUp = within(u, 0.72, 0.95);
  const lift = bo(0.02, f.eye + 0.08, 0.3);
  const home = slideAt(frames[2]);
  const slide = keyed<BarOffset>([[0.72, home], [0.78, lift], [0.9, lift], [0.95, home]], u, boMix);
  const restL = boAdd(LOUPE.sheet, bo(0.32, 0.015, -0.12));
  const restR = boAdd(LOUPE.rest, bo(-0.015, 0.03, -0.02));
  const l = slideUp ? boAdd(slide, bo(0.02, -0.02, 0)) : u < 0.72 ? (u < 0.7 ? restL : boMix(restL, home, sstep(u, 0.7, 0.72))) : boMix(home, restL, sstep(u, 0.95, 1));
  const r = loupeHeld ? boAdd(loupe, bo(-0.015, 0.03, -0.02)) : slideUp ? boMix(restR, boAdd(lift, bo(-0.08, -0.12, -0.05)), sstep(u, 0.72, 0.78) * (1 - sstep(u, 0.9, 0.95))) : restR;
  const looking = loupeHeld && !within(u, 0.0, 0.05) && !within(u, 0.2, 0.25) && !within(u, 0.42, 0.47) && u < 0.64;
  const lean = keyed<number>([[0, 0.45], [0.05, 0.55], [0.64, 0.55], [0.7, 0.45], [0.76, -0.04], [0.9, -0.04], [0.95, 0.45]], u, numMix);
  const nod = keyed<number>([[0, 0.5], [0.05, 0.65], [0.64, 0.65], [0.7, 0.5], [0.76, -0.35], [0.9, -0.35], [0.95, 0.5]], u, numMix) + (looking ? 0.02 * wave(t, 0.3) : 0);
  return { u, n, frames, l, r, loupe, loupeHeld, slide, slideUp, lean, nod };
}

// ---------------------------------------------------------------------------------------------
// A bottle decanted at the wine trolley (decant).

/** From the feet: the decanter's foot, the bottle's foot where it stands, the candle, the bottle's grip above its foot, the decanter's mouth above its foot. */
export const DECANT = { decanter: bo(0.1, 0.84, 0.4), bottle: bo(-0.2, 0.84, 0.38), candle: bo(0.05, 0.84, 0.54), grip: 0.12, mouth: 0.27 };
/**
 * Stood at the trolley, ~16 s round: the bottle taken up by its body and its neck brought over the
 * candle to the decanter's mouth, poured slow and steady (the left hand steadying the decanter's
 * neck, the eyes on the shoulder of the bottle for the sediment) as the decanter fills; the bottle
 * stood back; the decanter swirled on the trolley's top. `bottle` is the bottle's grip (`held`),
 * `tilt` how far it's tipped over to their left, `pour` the stream, `fill` the decanter (0–1),
 * `swirl` the decanter's foot's offset.
 */
export function decantRound(t: number, phase: number) {
  const u = frac(t / 16 + phase);
  const restGrip = boAdd(DECANT.bottle, bo(0, DECANT.grip, 0));
  const mouth = boAdd(DECANT.decanter, bo(0, DECANT.mouth, 0));
  const pourGrip = boAdd(mouth, bo(-0.17, 0.13, 0));
  const held = within(u, 0.06, 0.74);
  const bottle = keyed<BarOffset>([[0.06, restGrip], [0.16, pourGrip], [0.66, boAdd(pourGrip, bo(0.02, 0.03, 0))], [0.74, restGrip]], u, boMix);
  const tilt = keyed<number>([[0.06, 0], [0.16, 1.15], [0.22, 1.3], [0.66, 1.75], [0.74, 0]], u, numMix);
  const pour = sstep(u, 0.19, 0.22) * (1 - sstep(u, 0.64, 0.67));
  const fill = sstep(u, 0.2, 0.66) * (1 - sstep(u, 0.98, 1));
  const swirling = within(u, 0.78, 0.96);
  const swirl = swirling ? bo(0.018 * Math.cos(t * Math.PI * 2 * 1.4), 0, 0.018 * Math.sin(t * Math.PI * 2 * 1.4)) : bo(0, 0, 0);
  const neck = boAdd(boAdd(DECANT.decanter, swirl), bo(0.0, 0.19, -0.01));
  // The left hand on the decanter's neck throughout (steadying it, then swirling it).
  const l = neck;
  const handle = bo(-0.36, 0.86, 0.2);
  const gripOff = (o: BarOffset) => boAdd(o, bo(-0.02, 0, -0.03));
  const base = boAdd(DECANT.decanter, swirl);
  const steady = boAdd(base, bo(-0.11, 0.05, -0.02));
  let r: BarOffset;
  if (held) r = gripOff(bottle);
  else if (u < 0.06) r = boMix(handle, gripOff(restGrip), sstep(u, 0, 0.06));
  else if (u < 0.78) r = boMix(gripOff(restGrip), steady, sstep(u, 0.74, 0.78));
  else if (u < 0.96) r = steady;
  else r = boMix(steady, handle, sstep(u, 0.96, 1));
  return { u, l, r, bottle: held ? bottle : restGrip, tilt, held, pour, fill, swirl, lean: 0.2, nod: 0.45 };
}

// ---------------------------------------------------------------------------------------------
// The next issue's pages pinned up on the layout board (pinPage).

/** From the feet: the board's face (`ahead`), its spreads' middles (4 across, 2 high), and the tray of printed spreads at its foot. */
export const BOARD = { ahead: 0.42, cols: [0.45, 0.15, -0.15, -0.45], rows: [1.5, 1.17], tray: bo(0.0, 0.97, 0.3), w: 0.28, h: 0.2 };
export const spreadAt = (k: number): BarOffset => {
  const c = ((k % 8) + 8) % 8;
  return bo(BOARD.cols[c % 4], BOARD.rows[Math.floor(c / 4)], BOARD.ahead - 0.02);
};
/**
 * Stood at the board, ~11 s round: a printed spread taken off the tray in both hands, carried up to
 * its place in the run of pages (`slot`) and pressed home with the thumbs, then a step back in the
 * mind's eye — the hand at the chin, the head on one side — at how the issue reads.
 */
export function pinRound(t: number, phase: number, H: number) {
  const u = frac(t / 11 + phase);
  const n = Math.floor(t / 11 + phase);
  const f = face(H, false);
  const slot = n % 8;
  const at = spreadAt(slot);
  const page = keyed<BarOffset>([[0.08, BOARD.tray], [0.14, boAdd(BOARD.tray, bo(0, 0.12, -0.06))], [0.3, boAdd(at, bo(0, 0, -0.06))], [0.36, at]], u, boMix);
  const held = within(u, 0.06, 0.46);
  const pinned = u >= 0.36;
  const hand = (sx: number) => boAdd(page, bo(sx * 0.12, 0.0, -0.02));
  const restL = bo(0.18, f.waist + 0.02, 0.12);
  const restR = bo(-0.18, f.waist + 0.02, 0.12);
  const chin = bo(-0.01, f.chin - 0.05, 0.1);
  const press = within(u, 0.36, 0.46) ? bo(0, 0, 0.01 * Math.max(0, wave(t, 2))) : bo(0, 0, 0);
  const l = held ? boAdd(hand(1), press) : u < 0.06 ? boMix(restL, hand(1), sstep(u, 0, 0.06)) : boMix(hand(1), restL, sstep(u, 0.46, 0.52));
  const r = held ? boAdd(hand(-1), press) : u < 0.06 ? boMix(restR, hand(-1), sstep(u, 0, 0.06)) : u < 0.9 ? boMix(hand(-1), chin, sstep(u, 0.46, 0.54)) : boMix(chin, restR, sstep(u, 0.9, 1));
  const reachUp = at.up > f.chest;
  const lean = keyed<number>([[0, 0], [0.06, 0.2], [0.13, 0.2], [0.2, -0.04], [0.95, -0.04], [1, 0]], u, numMix);
  const nod = keyed<number>([[0, -0.1], [0.06, 0.4], [0.13, 0.4], [0.22, reachUp ? -0.25 : 0.05], [0.44, reachUp ? -0.25 : 0.05], [0.52, -0.12], [0.95, -0.12], [1, -0.1]], u, numMix) + 0.04 * wave(t, 0.13) * sstep(u, 0.5, 0.56);
  return { u, n, slot, page: held || pinned ? (pinned ? at : page) : BOARD.tray, held, pinned, l, r, lean, nod };
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a critic's motion (activity.ts doing hands these over). */
export function criticDoing(m: CriticMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  const ph = critPhase(work?.point ?? b.base);
  const off = (o: BarOffset) => b.base.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  switch (m) {
    case 'wineTaste': {
      const k = wineRound(t, ph, H);
      return { reach: { l: off(k.l), r: off(k.r), lean: k.lean, nod: k.nod, palms: k.held ? 0.3 : 1.1, grip: { l: k.cardUp > 0.5 ? 0.6 : 0.2, r: k.held ? 0.7 : k.writing ? 0.85 : 0.3 } } };
    }
    case 'courseTaste': {
      const k = courseRound(t, ph, H);
      return { reach: { l: off(k.l), r: off(k.r), lean: k.lean, nod: k.nod, palms: k.chew && !k.writing ? 0.3 : 1.1, grip: { l: k.forkHeld ? 0.85 : 0.25, r: k.knifeHeld || k.writing ? 0.85 : k.chew ? 0.5 : 0.3 } } };
    }
    case 'appraise': {
      const k = appraiseRound(t, ph, H);
      return { reach: { l: off(k.l), r: off(k.r), lean: k.lean, nod: k.nod, palms: 0.5, grip: { l: 0.6, r: k.writing ? 0.85 : 0.45 } } };
    }
    case 'proofread': {
      const k = proofRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), lean: 0.34, nod: 0.55, palms: 1.2, grip: { l: 0.15, r: 0.85 } } };
    }
    case 'loupe': {
      const k = loupeRound(t, ph, H);
      return { reach: { l: off(k.l), r: off(k.r), lean: k.lean, nod: k.nod, palms: k.slideUp ? 0.2 : 1.1, grip: { l: k.slideUp ? 0.6 : 0.15, r: k.loupeHeld ? 0.7 : 0.3 } } };
    }
    case 'decant': {
      const k = decantRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), lean: k.lean, nod: k.nod, palms: 0.4, grip: { l: 0.7, r: k.held ? 0.9 : 0.4 } } };
    }
    case 'pinPage': {
      const k = pinRound(t, ph, H);
      return { reach: { l: off(k.l), r: off(k.r), lean: k.lean, nod: k.nod, palms: k.held ? -0.2 : 0.4, grip: { l: k.held ? 0.5 : 0.3, r: k.held ? 0.5 : 0.45 } } };
    }
  }
  return {};
}
