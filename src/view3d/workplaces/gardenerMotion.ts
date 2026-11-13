import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * In the 식물원 온실 (2026-10-27, the botanical greenhouse, at the user's request: gardening work
 * should look right). Each round gives the hands as offsets (BarOffset: to the gardener's left, up,
 * away from them) from where they work, and where the plant, the pots, the knife, the seed packet,
 * the watering wand… are by the same clock (gPhase of the gardener's spot), so the pieces
 * (workplaces/gardener.ts) move them in step with the hands. Kept out of activity.ts (which only hands
 * these motions over here) so it imports nothing from it at run time.
 */
export type GardenerMotion =
  | 'repot' | 'graft' | 'mixSoil' | 'mistCase' | 'plantSurvey' | 'climatePanel' | 'stormPanel' | 'budgetTablet'
  | 'sowSeeds' | 'waterBasket' | 'feedKoi' | 'fillCan' | 'stockPots';
export const GARDENER_MOTIONS = new Set<string>([
  'repot', 'graft', 'mixSoil', 'mistCase', 'plantSurvey', 'climatePanel', 'stormPanel', 'budgetTablet',
  'sowSeeds', 'waterBasket', 'feedKoi', 'fillCan', 'stockPots',
]);

export const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
export const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
export const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const boScale = (a: BarOffset, k: number): BarOffset => bo(a.side * k, a.up * k, a.ahead * k);
const numMix = (a: number, b: number, e: number) => a + (b - a) * e;
const sstep = THREE.MathUtils.smoothstep;
const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
/** Eased along keys [u, value]: held before the first and after the last. */
function keyed<T>(keys: Array<[number, T]>, u: number, mix: (a: T, b: T, e: number) => T): T {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}
const path = (keys: Array<[number, BarOffset]>, u: number) => keyed(keys, u, boMix);
const num = (keys: Array<[number, number]>, u: number) => keyed(keys, u, numMix);
const frac = (x: number) => ((x % 1) + 1) % 1;
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
/** Between u0 and u1 (0–1 along it), else -1. */
const within = (u: number, u0: number, u1: number) => (u >= u0 && u < u1 ? (u - u0) / (u1 - u0) : -1);
/** The same clock offset as activity.ts toolPhase: from where the gardener stands, so two benches aren't in step. */
export const gPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const cyc = (t: number, T: number, ph: number) => frac(t / T + ph);

/** What every round gives: the hands (offsets from the work point), the bend, the grips. */
export interface Hands {
  l: BarOffset;
  r: BarOffset;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
}

// ---------------------------------------------------------------------------------------------
// The potting bench: repotting, grafting, mixing the soil.

/**
 * A repot at the potting bench, ~18 s round (`work` the bench top in the middle of the job). The
 * nursery pot on the left is taken in the left hand, the right spread over the soil with the stems
 * between the fingers, and the lot turned upside down (`tip`) and tapped; the pot drawn off and set
 * down aside; the plant turned up again and the root ball's roots teased loose; it's set into the new
 * terracotta pot on the right, two handfuls of soil from the bin sprinkled round it (`soil` the level
 * in the pot), and the soil firmed round the stem with both thumbs.
 */
export const REPOT = {
  T: 18,
  /** The root ball's middle: in the old pot, lifted and turned, held to loosen, in the new pot. */
  A: bo(0.13, 0.065, 0),
  C: bo(0.03, 0.25, -0.07),
  L: bo(0.0, 0.21, -0.06),
  B: bo(-0.13, 0.085, 0),
  /** Where the empty old pot is set down, and the soil bin's surface. */
  D: bo(0.34, 0.065, 0.07),
  bin: bo(-0.37, 0.05, 0.05),
};
const TIP = Math.PI * 0.92;
/** The plant's up (its stems) tipped `a` back towards the gardener. */
const upOf = (a: number) => bo(0, Math.cos(a), -Math.sin(a));
export function repotRound(t: number, ph: number) {
  const R = REPOT;
  const u = cyc(t, R.T, ph);
  const over = boAdd(R.B, bo(0, 0.15, -0.02));
  const ball = path([[0.06, R.A], [0.15, R.C], [0.31, R.C], [0.36, R.L], [0.5, R.L], [0.55, boAdd(R.B, bo(0, 0.13, 0))], [0.6, R.B]], u);
  const tip = num([[0.07, 0], [0.15, TIP], [0.29, TIP], [0.35, 0]], u);
  const up = upOf(tip);
  // The old pot: on the root ball, slid off it along the plant's axis, then set down upright aside.
  let pot: BarOffset;
  let potTip: number;
  if (u < 0.25) {
    pot = boAdd(ball, boScale(up, -num([[0.2, 0], [0.25, 0.15]], u)));
    potTip = tip;
  } else {
    const off = boAdd(R.C, boScale(upOf(TIP), -0.15));
    pot = path([[0.25, off], [0.29, bo(0.26, 0.24, -0.02)], [0.33, R.D]], u);
    potTip = num([[0.25, TIP], [0.33, 0]], u);
  }
  // A knock on the pot's bottom while it's upside down.
  const knock = within(u, 0.16, 0.2) >= 0 ? 0.012 * Math.max(0, wave(t, 3.2)) : 0;
  const potSide = boAdd(pot, bo(0.075, knock, 0));
  const stem = boAdd(ball, boScale(up, 0.075));
  const press = 0.01 * Math.max(0, wave(t, 1.5)) ** 2;
  const thumbL = boAdd(R.B, bo(0.045, 0.09 - press, -0.035));
  const thumbR = boAdd(R.B, bo(-0.045, 0.09 - press, -0.035));
  const restL = bo(0.2, 0.02, -0.18);
  const restR = bo(-0.2, 0.02, -0.18);
  const l = path([[0, restL], [0.04, potSide], [0.33, potSide], [0.37, boAdd(stem, bo(0.025, 0, 0))], [0.78, boAdd(stem, bo(0.025, 0, 0))], [0.8, thumbL], [0.9, thumbL], [0.96, restL]], u);
  // The right hand: over the soil (under it when tipped), teasing the roots, carrying, the soil, the thumbs.
  const tease = boAdd(ball, bo(-0.045 + 0.015 * wave(t, 1.3), -0.055 + 0.02 * wave(t, 2.1), 0.02 * wave(t, 0.9)));
  const carry = boAdd(ball, bo(-0.07, 0, 0));
  let r: BarOffset;
  let handful = false;
  const sc = within(u, 0.6, 0.78);
  if (sc >= 0) {
    const i = sc < 0.5 ? 0 : 1;
    const v = (sc - i * 0.5) / 0.5;
    const from = i === 0 ? boAdd(R.B, bo(-0.07, 0, 0)) : over;
    const sprinkle = v > 0.72 ? bo(0.03 * wave(t, 2.5), 0, 0.02 * wave(t, 1.9)) : bo(0, 0, 0);
    r = boAdd(path([[0, from], [0.3, R.bin], [0.42, boAdd(R.bin, bo(0, -0.03, 0.02))], [0.72, over], [1, over]], v), sprinkle);
    handful = v > 0.42 && v < 0.92;
  } else {
    r = path([[0, restR], [0.05, boAdd(stem, bo(-0.01, 0, 0))], [0.33, boAdd(stem, bo(-0.01, 0, 0))], [0.36, tease], [0.5, tease], [0.53, carry], [0.6, carry], [0.78, over], [0.8, thumbR], [0.9, thumbR], [0.96, restR]], u);
  }
  const soil = num([[0.6, 0.3], [0.69, 0.62], [0.78, 0.95], [0.88, 0.85]], u);
  const firming = u > 0.8 && u < 0.9;
  return {
    u,
    l,
    r,
    ball,
    tip,
    pot,
    potTip,
    soil,
    handful,
    loose: u > 0.4,
    lean: num([[0, 0.12], [0.06, 0.2], [0.15, 0.08], [0.33, 0.1], [0.6, 0.16], [0.62, 0.26], [0.9, 0.28], [0.96, 0.12]], u),
    nod: num([[0, 0.45], [0.12, 0.32], [0.33, 0.35], [0.55, 0.45]], u),
    palms: firming ? 1.2 : 0.7,
    gl: u > 0.04 && u < 0.92 ? (firming ? 0.45 : 0.8) : 0.3,
    gr: handful ? 0.8 : firming ? 0.45 : sc < 0 && u > 0.36 && u < 0.5 ? 0.4 + 0.15 * wave(t, 2.2) : 0.55,
  };
}

/**
 * Grafting at the bench, ~16 s round (`work` the rootstock's pot on the bench): the stock's stem held
 * in the left hand, three slicing strokes of the grafting knife and its top comes away (`cut`); the
 * knife down, a scion taken from the tray and set on the cut; the grafting tape wound round the join
 * (`tape` 0–1) and pressed off.
 */
export const GRAFT = {
  T: 16,
  /** The join on the stock's stem, the scion tray, where the knife and the tape lie. */
  J: bo(0, 0.2, 0),
  tray: bo(-0.27, 0.03, 0.02),
  knife: bo(-0.16, 0.008, -0.1),
  tape: bo(-0.22, 0.025, -0.12),
};
export function graftRound(t: number, ph: number) {
  const G = GRAFT;
  const u = cyc(t, G.T, ph);
  const restL = bo(0.2, 0.02, -0.18);
  const restR = bo(-0.2, 0.02, -0.18);
  const hold = boAdd(G.J, bo(0.03, -0.065, -0.01));
  const l = path([[0, restL], [0.04, hold], [0.9, hold], [0.96, restL]], u);
  let r: BarOffset;
  const cuts = within(u, 0.07, 0.3);
  const wrap = within(u, 0.6, 0.84);
  if (cuts >= 0) {
    const v = frac(cuts * 3);
    const top = boAdd(G.J, bo(-0.03, 0.035, 0.012));
    const low = boAdd(G.J, bo(-0.03, -0.03, 0.012));
    r = v < 0.7 ? boMix(top, low, sstep(v, 0, 0.7)) : boMix(low, top, sstep(v, 0.7, 1));
  } else if (wrap >= 0) {
    const a = wrap * Math.PI * 2 * 4;
    r = boAdd(G.J, bo(-0.045 * Math.cos(a), -0.025 + 0.05 * wrap, 0.04 * Math.sin(a) - 0.01));
  } else {
    const above = boAdd(G.J, bo(-0.01, 0.12, 0));
    const on = boAdd(G.J, bo(-0.01, 0.06, 0));
    const startCut = boAdd(G.J, bo(-0.03, 0.035, 0.012));
    r = path([[0, restR], [0.04, G.knife], [0.07, startCut], [0.3, startCut], [0.33, G.knife], [0.38, G.tray], [0.44, above], [0.5, on], [0.53, on], [0.57, G.tape], [0.6, boAdd(G.J, bo(-0.045, -0.025, -0.01))], [0.84, boAdd(G.J, bo(-0.045, 0.025, -0.01))], [0.88, boAdd(G.J, bo(-0.025, 0, -0.03))], [0.95, restR]], u);
  }
  return {
    u,
    l,
    r,
    knife: u > 0.045 && u < 0.33,
    scion: u > 0.38 && u < 0.5 ? 'hand' : u >= 0.5 ? 'on' : 'tray',
    tapeRoll: u > 0.57 && u < 0.86,
    tape: u < 0.6 ? 0 : u < 0.84 ? (u - 0.6) / 0.24 : 1,
    cut: u > 0.28,
    lean: 0.16,
    nod: 0.45,
    palms: 0.7,
    gl: u > 0.04 && u < 0.92 ? 0.85 : 0.3,
    gr: u > 0.04 && u < 0.88 ? 0.8 : 0.35,
  };
}

/**
 * Mixing potting soil, ~14 s round (`work` the soil's surface in the tub's middle): the perlite bag
 * lifted in the left hand and tipped in (`bagTip`, the stream while `pouring`); the trowel turned
 * through the mix; a handful dug and squeezed in the fist to feel it hold, then crumbled back over
 * the tub.
 */
export const SOIL = { T: 14, bag: bo(0.32, 0.01, 0.22), pour: bo(0.12, 0.22, -0.02), trowel: bo(-0.3, 0.01, -0.06), fist: bo(-0.05, 0.24, -0.15) };
export function soilRound(t: number, ph: number) {
  const S = SOIL;
  const u = cyc(t, S.T, ph);
  const restL = bo(0.24, 0.0, -0.2);
  const restR = bo(-0.24, 0.0, -0.2);
  const rimL = bo(0.17, 0.04, -0.02);
  const rimR = bo(-0.17, 0.04, -0.02);
  const l = path([[0, restL], [0.04, S.bag], [0.1, S.pour], [0.22, S.pour], [0.27, S.bag], [0.31, rimL], [0.94, rimL], [0.98, restL]], u);
  const mixing = within(u, 0.34, 0.58);
  let r: BarOffset;
  if (mixing >= 0) {
    const a = mixing * Math.PI * 2 * 3;
    r = bo(-0.02 + 0.08 * Math.cos(a), 0.03 + 0.015 * Math.sin(a * 2), 0.06 * Math.sin(a));
  } else {
    const squeeze = within(u, 0.7, 0.8) >= 0 ? bo(0, 0.006 * wave(t, 2), 0) : bo(0, 0, 0);
    r = path([[0, restR], [0.04, rimR], [0.27, rimR], [0.31, S.trowel], [0.34, bo(0.06, 0.03, 0)], [0.58, bo(0.06, 0.03, 0)], [0.62, S.trowel], [0.66, bo(-0.03, -0.01, 0.02)], [0.7, S.fist], [0.8, S.fist], [0.85, bo(-0.03, 0.1, -0.02)], [0.9, bo(-0.03, 0.1, -0.02)], [0.96, restR]], u);
    r = boAdd(r, squeeze);
  }
  const crumble = within(u, 0.84, 0.92);
  return {
    u,
    l,
    r,
    bagHeld: u > 0.04 && u < 0.27,
    bagTip: num([[0.1, 0], [0.13, 1.35], [0.2, 1.35], [0.24, 0]], u),
    pouring: u > 0.125 && u < 0.21,
    trowel: u > 0.31 && u < 0.62,
    handful: u > 0.66 && u < 0.9 ? (crumble >= 0 ? 1 - crumble : 1) : 0,
    lean: num([[0, 0.12], [0.3, 0.12], [0.34, 0.22], [0.6, 0.22], [0.7, 0.08], [0.82, 0.08], [0.86, 0.18], [0.96, 0.12]], u),
    nod: num([[0, 0.45], [0.66, 0.45], [0.7, 0.28], [0.82, 0.28], [0.86, 0.45]], u),
    palms: 0.7,
    gl: u > 0.04 && u < 0.27 ? 0.85 : 0.5,
    gr: within(u, 0.7, 0.8) >= 0 ? 0.85 + 0.15 * Math.max(0, wave(t, 2)) : crumble >= 0 ? 0.25 + 0.2 * wave(t, 3) : u > 0.31 && u < 0.62 ? 0.85 : 0.5,
  };
}

// ---------------------------------------------------------------------------------------------
// The rare-plant case: misting and a close look, measuring and recording.

/**
 * At the rare-plant case with its glass slid open, ~16 s round (`work` the lower shelf's plants, in
 * the case's middle): the hand sprayer taken off its hook and the plants misted shelf by shelf, the
 * trigger squeezed (`puff` 0–1 the mist out of the nozzle); the sprayer hung up, the loupe taken in
 * the left hand to a leaf, the right turning the leaf to the light.
 */
export const MISTC = { T: 16, hook: bo(-0.27, -0.05, -0.04) };
export function mistCaseRound(t: number, ph: number) {
  const u = cyc(t, MISTC.T, ph);
  const restL = bo(0.24, -0.15, -0.3);
  const restR = bo(-0.24, -0.15, -0.3);
  const frame = bo(0.27, 0.0, -0.08);
  const sweep = within(u, 0.09, 0.38);
  const aim = sweep >= 0 ? bo(0.08 - 0.18 * (sweep < 0.5 ? sweep * 2 : (sweep - 0.5) * 2), sweep < 0.5 ? 0.04 : 0.4, -0.16) : bo(0, 0.04, -0.16);
  const r = sweep >= 0 ? aim : path([[0, restR], [0.05, MISTC.hook], [0.09, bo(0.08, 0.04, -0.16)], [0.38, bo(-0.1, 0.4, -0.16)], [0.43, MISTC.hook], [0.48, bo(-0.05, 0.1, 0.06)], [0.86, bo(-0.05, 0.1, 0.06)], [0.93, restR]], u);
  const turn = within(u, 0.5, 0.86) >= 0 ? bo(0.01 * wave(t, 0.5), 0.008 * wave(t, 0.35), 0) : bo(0, 0, 0);
  const loupe = bo(0.02, 0.13, -0.07);
  const l = path([[0, restL], [0.06, frame], [0.42, frame], [0.48, loupe], [0.86, loupe], [0.93, restL]], u);
  const pump = sweep >= 0 ? Math.max(0, wave(t, 1.6)) ** 4 : 0;
  return {
    u,
    l,
    r: boAdd(r, turn),
    sprayer: u > 0.05 && u < 0.43,
    puff: pump,
    loupe: u > 0.45 && u < 0.9,
    lean: num([[0, 0.05], [0.1, 0.12], [0.4, 0.12], [0.5, 0.36], [0.86, 0.36], [0.93, 0.05]], u),
    nod: num([[0, 0.15], [0.1, 0.2], [0.5, 0.42], [0.86, 0.42], [0.93, 0.15]], u),
    palms: 0.4,
    gl: u > 0.06 && u < 0.42 ? 0.5 : 0.75,
    gr: u > 0.05 && u < 0.43 ? 0.6 + 0.35 * pump : 0.45,
  };
}

/**
 * Recording a rare plant's growth, ~16 s round (`work` the lower shelf's plants): the clipboard held in
 * the left hand all through; the folding rule stood beside the orchid's spike and read off; the
 * figures written down; the leaves counted with a fingertip; written again.
 */
export const SURVEY = { T: 16, clip: bo(0.08, 0.06, -0.3), rule: bo(-0.08, 0.02, 0.06) };
export function surveyRound(t: number, ph: number) {
  const S = SURVEY;
  const u = cyc(t, S.T, ph);
  const restR = bo(-0.24, -0.15, -0.3);
  const writing = (k: number) => boAdd(S.clip, bo(-0.03 + 0.03 * wave(t, 1.1, k), 0.012 + 0.005 * wave(t, 4.4), 0.012 * wave(t, 2.2)));
  const ruleTop = boAdd(S.rule, bo(0, 0.3, 0));
  const read = bo(0, 0.04 * wave(t, 0.4), 0);
  const count = (i: number) => bo(0.05 - i * 0.04, 0.06 + 0.01 * (i % 2), 0.08);
  let r: BarOffset;
  const counting = within(u, 0.64, 0.8);
  if (counting >= 0) {
    const i = Math.min(3, Math.floor(counting * 4));
    r = boAdd(count(i), bo(0, 0.012 * Math.max(0, wave(t, 2.5)), 0));
  } else {
    r = path([[0, restR], [0.06, ruleTop], [0.3, ruleTop], [0.35, writing(0)], [0.6, writing(0.3)], [0.64, count(0)], [0.8, count(3)], [0.84, writing(0.6)], [0.95, writing(0.9)], [0.99, restR]], u);
    if (u > 0.06 && u < 0.3) r = boAdd(r, read);
  }
  return {
    u,
    l: S.clip,
    r,
    rule: u > 0.05 && u < 0.32,
    lean: num([[0, 0.08], [0.06, 0.2], [0.3, 0.2], [0.36, 0.06], [0.62, 0.06], [0.66, 0.25], [0.8, 0.25], [0.84, 0.06]], u),
    nod: num([[0, 0.3], [0.06, 0.32], [0.3, 0.32], [0.36, 0.55], [0.62, 0.55], [0.66, 0.35], [0.8, 0.35], [0.84, 0.55]], u),
    palms: 0.6,
    gl: 0.7,
    gr: counting >= 0 ? 0.65 : u > 0.06 && u < 0.3 ? 0.75 : 0.85,
  };
}

// ---------------------------------------------------------------------------------------------
// The greenhouse climate panel.

/**
 * Setting the greenhouse's climate at the panel, ~12 s round (`work` the touchscreen's middle): the
 * humidity tab tapped, its target dragged up (`frame` the screen showing 0 now, 1 dragging, 2 set),
 * the 확인 tapped; the vent dial turned (`dial`). The left hand on the panel's edge.
 */
export const CLIMATE = { T: 12, dial: bo(-0.15, -0.26, 0.0), tab: bo(0.1, 0.07, 0), slideA: bo(0.08, -0.03, 0), slideB: bo(-0.08, -0.03, 0), ok: bo(-0.1, -0.09, 0) };
export function climateRound(t: number, ph: number) {
  const C = CLIMATE;
  const u = cyc(t, C.T, ph);
  const off = bo(0, 0, -0.03);
  const restR = bo(-0.22, -0.45, -0.28);
  const tap = (p: BarOffset, u0: number) => (Math.abs(u - u0) < 0.02 ? boAdd(p, bo(0, 0, 0.015 * (1 - Math.abs(u - u0) / 0.02))) : p);
  let r = path([[0, restR], [0.07, boAdd(C.tab, off)], [0.12, boAdd(C.slideA, off)], [0.16, C.slideA], [0.32, C.slideB], [0.36, boAdd(C.slideB, off)], [0.42, boAdd(C.ok, off)], [0.5, boAdd(C.ok, off)], [0.56, boAdd(C.dial, bo(0, 0, -0.02))], [0.8, boAdd(C.dial, bo(0, 0, -0.02))], [0.9, restR]], u);
  r = tap(tap(r, 0.09), 0.46);
  return {
    u,
    l: bo(0.3, -0.22, -0.03),
    r,
    frame: u < 0.16 ? 0 : u < 0.44 ? 1 : 2,
    slider: num([[0.16, 0], [0.32, 1]], u),
    dial: num([[0.6, 0], [0.76, 1.4]], u),
    lean: 0.04,
    nod: 0.05,
    palms: 0.3,
    gl: 0.4,
    gr: u > 0.56 && u < 0.8 ? 0.9 : 0.7,
  };
}

/**
 * Battening down for a rainstorm, ~10 s round (`work` the touchscreen's middle): the row of buttons
 * under the screen pressed one after another (`lit`, how many are on: vents shut, shades down, the
 * drains open, the backup pump), both hands on the big lever and it pulled down (`lever` 0–1), then a
 * look up at the roof; the lever pushed back up at the end.
 */
export const STORM = {
  T: 10,
  button: (i: number) => bo(0.12 - i * 0.08, -0.2, 0),
  /** The lever's pivot on the panel's face at the right, its arm's length, and how far it swings down towards them. */
  pivot: bo(-0.3, -0.2, -0.03),
  arm: 0.18,
  swing: 2.8,
};
/** The lever's handle at `lever` (0 up, 1 pulled down), round its pivot. */
export const stormGrip = (lever: number) => boAdd(STORM.pivot, bo(0, STORM.arm * Math.cos(lever * STORM.swing), -STORM.arm * Math.sin(lever * STORM.swing)));
export function stormRound(t: number, ph: number) {
  const S = STORM;
  const u = cyc(t, S.T, ph);
  const presses = within(u, 0.04, 0.36);
  const lever = num([[0.5, 0], [0.62, 1], [0.92, 1], [0.98, 0]], u);
  const grip = stormGrip(lever);
  const restR = bo(-0.22, -0.45, -0.28);
  let r: BarOffset;
  if (presses >= 0) {
    const i = Math.min(3, Math.floor(presses * 4));
    const v = frac(presses * 4);
    const p = S.button(i);
    r = boAdd(p, bo(0, 0, v < 0.4 ? -0.05 * (1 - v / 0.4) : v < 0.6 ? 0.01 : -0.05 * ((v - 0.6) / 0.4)));
  } else {
    r = path([[0, restR], [0.04, boAdd(S.button(0), bo(0, 0, -0.05))], [0.36, boAdd(S.button(3), bo(0, 0, -0.05))], [0.45, grip], [0.98, grip], [1, restR]], u);
  }
  const edge = bo(0.3, -0.22, -0.03);
  const l = path([[0, edge], [0.4, edge], [0.47, boAdd(grip, bo(0.07, 0.03, 0))], [0.66, boAdd(grip, bo(0.07, 0.03, 0))], [0.72, edge], [0.9, edge], [0.94, boAdd(grip, bo(0.07, 0.03, 0))], [1, edge]], u);
  return {
    u,
    l,
    r,
    lit: presses < 0 ? (u < 0.04 ? 0 : 4) : Math.floor(presses * 4 + 0.6),
    lever,
    lean: num([[0, 0.06], [0.5, 0.06], [0.62, 0.22], [0.68, 0.08]], u),
    nod: num([[0, 0.08], [0.66, 0.08], [0.7, -0.35], [0.86, -0.35], [0.9, 0.08]], u),
    palms: 0.3,
    gl: u > 0.45 && u < 0.68 ? 0.9 : 0.4,
    gr: u > 0.45 ? 0.9 : 0.65,
  };
}

/**
 * The budget and the rota on the tablet at the panel, ~14 s round (`work` the touchscreen's middle):
 * the tablet held low in the left hand and tapped through, a look up and a finger to the screen's
 * figures now and then.
 */
export const BUDGET = { T: 14, tablet: bo(0.04, -0.34, -0.26) };
export function budgetRound(t: number, ph: number) {
  const u = cyc(t, BUDGET.T, ph);
  const tb = BUDGET.tablet;
  const tapAt = (k: number) => boAdd(tb, bo(-0.04 + 0.05 * wave(t, 0.37, k), 0.025 + 0.012 * Math.max(0, wave(t, 2.6)), 0.02 * wave(t, 0.23, k)));
  const point = bo(-0.06, 0.02, -0.05);
  const r = path([[0, tapAt(0)], [0.42, tapAt(0.2)], [0.48, point], [0.6, point], [0.66, tapAt(0.5)], [1, tapAt(0.7)]], u);
  const up = u > 0.44 && u < 0.64;
  return { u, l: tb, r, lean: 0.04, nod: up ? 0.02 : 0.42, palms: 0.9, gl: 0.6, gr: up ? 0.7 : 0.75 };
}

// ---------------------------------------------------------------------------------------------
// The propagation shelf.

/**
 * Sowing a seed tray under the grow lights, ~14 s round (`work` the tray's middle on the working
 * shelf): four holes poked with a fingertip (`holes`), the seed packet taken in the left hand, a pinch
 * of seed rubbed into each hole (`seeds`), then the tray misted from the little sprayer.
 */
export const SOW = { T: 14, cell: (i: number) => bo(0.0825 - i * 0.055, 0, 0), packet: bo(0.3, 0.005, 0.02), held: bo(0.11, 0.1, -0.15), mister: bo(-0.3, 0.005, 0.03) };
export function sowRound(t: number, ph: number) {
  const S = SOW;
  const u = cyc(t, S.T, ph);
  const restL = bo(0.24, -0.05, -0.22);
  const restR = bo(-0.24, -0.05, -0.22);
  const edge = bo(0.18, 0.01, -0.07);
  const l = path([[0, restL], [0.05, edge], [0.28, edge], [0.31, S.packet], [0.35, S.held], [0.68, S.held], [0.71, S.packet], [0.74, edge], [0.92, edge], [0.97, restL]], u);
  const pokes = within(u, 0.05, 0.3);
  const drops = within(u, 0.38, 0.7);
  const mist = within(u, 0.77, 0.9);
  let r: BarOffset;
  if (pokes >= 0) {
    const i = Math.min(3, Math.floor(pokes * 4));
    const v = frac(pokes * 4);
    const from = S.cell(Math.max(0, i - 1));
    const above = boMix(from, S.cell(i), sstep(v, 0, 0.3));
    r = boAdd(above, bo(0, 0.035 - 0.042 * Math.sin(Math.PI * clamp01((v - 0.3) / 0.5)), 0));
  } else if (drops >= 0) {
    const i = Math.min(3, Math.floor(drops * 4));
    const v = frac(drops * 4);
    const from = i === 0 ? boAdd(S.held, bo(-0.02, 0.03, 0)) : S.cell(i - 1);
    r = boAdd(boMix(from, S.cell(i), sstep(v, 0, 0.35)), bo(0.006 * wave(t, 5), 0.04, 0));
  } else if (mist >= 0) {
    r = bo(0.07 * Math.sin(mist * Math.PI * 2), 0.17, -0.07);
  } else {
    r = path([[0, restR], [0.05, boAdd(S.cell(0), bo(0, 0.035, 0))], [0.3, boAdd(S.cell(3), bo(0, 0.035, 0))], [0.34, boAdd(S.held, bo(-0.02, 0.03, 0))], [0.38, boAdd(S.held, bo(-0.02, 0.03, 0))], [0.7, boAdd(S.cell(3), bo(0, 0.04, 0))], [0.73, S.mister], [0.77, bo(0, 0.17, -0.07)], [0.9, bo(0, 0.17, -0.07)], [0.93, S.mister], [0.97, restR]], u);
  }
  const pump = mist >= 0 ? Math.max(0, wave(t, 1.6)) ** 4 : 0;
  return {
    u,
    l,
    r,
    holes: pokes >= 0 ? Math.floor(pokes * 4 + 0.5) : u < 0.05 ? 0 : 4,
    seeds: drops >= 0 ? Math.floor(drops * 4 + 0.35) : u < 0.38 ? 0 : 4,
    packet: u > 0.31 && u < 0.71,
    mister: u > 0.73 && u < 0.93,
    puff: pump,
    lean: num([[0, 0.12], [0.05, 0.26], [0.3, 0.26], [0.35, 0.18], [0.7, 0.24], [0.77, 0.12], [0.92, 0.12]], u),
    nod: 0.45,
    palms: 0.9,
    gl: u > 0.31 && u < 0.71 ? 0.75 : 0.35,
    gr: pokes >= 0 ? 0.65 : drops >= 0 ? 0.8 : u > 0.73 && u < 0.93 ? 0.6 + 0.35 * pump : 0.4,
  };
}

// ---------------------------------------------------------------------------------------------
// A hanging basket on the misting post.

/**
 * Watering a hanging basket with the hose wand, ~14 s round (`work` the basket's middle, overhead):
 * the wand taken off its hook on the post, held up two-handed with its rose over the basket and the
 * water on (`water`), the rose moved slowly round it; then the wand lowered, the left hand under the
 * basket to lift it and feel the weight (`lift`); the wand hung up again. `hand` and `head` are the
 * wand's grip and rose.
 */
export const BASKET = { T: 14, hook: bo(0.06, -0.55, 0.19) };
export function basketRound(t: number, ph: number) {
  const u = cyc(t, BASKET.T, ph);
  const hookGrip = BASKET.hook;
  const hookHead = boAdd(BASKET.hook, bo(0, -0.72, 0.02));
  const water = u > 0.16 && u < 0.52;
  const swirl = water ? bo(0.04 * Math.cos(t * 1.4), 0, 0.03 * Math.sin(t * 1.4)) : bo(0, 0, 0);
  const gripUp = bo(-0.05, -0.56, -0.38);
  const headUp = boAdd(bo(0, 0.17, -0.06), swirl);
  const gripLow = bo(-0.1, -0.62, -0.36);
  const headLow = bo(-0.05, -0.32, -0.22);
  const hand = path([[0, hookGrip], [0.06, hookGrip], [0.14, gripUp], [0.52, gripUp], [0.56, gripLow], [0.74, gripLow], [0.78, gripUp], [0.8, gripUp], [0.88, hookGrip]], u);
  const head = path([[0, hookHead], [0.06, hookHead], [0.14, headUp], [0.52, headUp], [0.56, headLow], [0.74, headLow], [0.78, headUp], [0.8, headUp], [0.88, hookHead]], u);
  const lance = (k: number) => boMix(hand, head, k);
  const lift = num([[0.58, 0], [0.62, 1], [0.7, 1], [0.73, 0]], u);
  const under = bo(0.03, -0.17 + 0.04 * lift, 0.02);
  const restL = bo(0.22, -0.75, -0.3);
  const restR = bo(-0.22, -0.75, -0.3);
  const held = u > 0.04 && u < 0.9;
  const r = held ? hand : path([[0.88, hand], [0.94, restR], [1, restR]], u) ;
  const r0 = u < 0.04 ? boMix(restR, hookGrip, sstep(u, 0, 0.04)) : r;
  const lOnLance = lance(0.42);
  const l = u < 0.04 ? boMix(restL, lOnLance, sstep(u, 0, 0.04)) : u < 0.56 ? lOnLance : u < 0.74 ? path([[0.56, lOnLance], [0.6, under], [0.7, under], [0.74, lOnLance]], u) : u < 0.88 ? lOnLance : path([[0.88, lOnLance], [0.94, restL]], u);
  return {
    u,
    l,
    r: r0,
    hand,
    head,
    water,
    lift,
    lean: u > 0.56 && u < 0.74 ? 0.04 : 0,
    nod: u > 0.14 && u < 0.52 ? -0.38 : u > 0.56 && u < 0.74 ? -0.25 : 0.1,
    palms: 0.2,
    gl: u > 0.6 && u < 0.7 ? 0.4 : 0.85,
    gr: held ? 0.95 : 0.3,
  };
}

// ---------------------------------------------------------------------------------------------
// The koi pond.

/**
 * Feeding the koi, ~15 s round (`work` the middle of the pond's front rim, its top): the food tub in
 * the left hand, three pinches tossed out over the water (`toss` which, `fly` 0–1 the pellets' flight
 * out to `land`), the koi crowding in; the tub set down on the rim and a crouch at the edge, the
 * fingers trailed in the water (`dip`) to the fish that come to them.
 */
export const KOI = {
  T: 15,
  tub: bo(0.12, 0.5, -0.18),
  rimTub: bo(0.28, 0.04, 0.0),
  land: (i: number) => bo(0.18 - i * 0.16, -0.12, 0.42 + 0.08 * (i % 2)),
};
export function koiRound(t: number, ph: number) {
  const K = KOI;
  const u = cyc(t, K.T, ph);
  const restR = bo(-0.22, 0.48, -0.25);
  const tossing = within(u, 0, 0.6);
  let r: BarOffset;
  let toss = -1;
  let fly = -1;
  let release = bo(0, 0, 0);
  if (tossing >= 0) {
    toss = Math.min(2, Math.floor(tossing * 3));
    const v = frac(tossing * 3);
    const mouth = boAdd(K.tub, bo(-0.02, 0.05, 0));
    const back = bo(-0.1, 0.56, -0.14);
    release = bo(-0.03 + 0.1 * (1 - toss), 0.62, 0.2);
    r = path([[0, restR], [0.2, mouth], [0.3, mouth], [0.5, back], [0.68, release], [1, restR]], v);
    fly = v > 0.66 ? (v - 0.66) / 0.34 : -1;
  } else {
    const dip = boAdd(bo(-0.06, -0.12, 0.12), bo(0.03 * wave(t, 0.4), 0.008 * wave(t, 1.2), 0.03 * wave(t, 0.3)));
    r = path([[0.6, restR], [0.63, restR], [0.7, bo(-0.1, 0.03, -0.02)], [0.74, dip], [0.88, dip], [0.92, bo(-0.1, 0.03, -0.02)], [0.97, restR]], u);
  }
  const crouch = num([[0.64, 0], [0.71, 0.75], [0.9, 0.75], [0.96, 0]], u);
  const l = path([[0, K.tub], [0.6, K.tub], [0.65, K.rimTub], [0.94, K.rimTub], [0.99, K.tub]], u);
  return {
    u,
    l,
    r,
    toss,
    fly,
    release,
    tubOnRim: u > 0.65 && u < 0.94,
    dip: u > 0.74 && u < 0.88,
    feeding: u < 0.7,
    crouch,
    lean: crouch > 0 ? 0.35 : 0.06,
    nod: crouch > 0 ? 0.5 : 0.35,
    palms: 0.5,
    gl: 0.85,
    gr: tossing >= 0 ? (fly >= 0 ? 0.1 : 0.85) : 0.3,
  };
}

// ---------------------------------------------------------------------------------------------
// The watering-can tap.

/**
 * Filling a watering can at the tap, ~12 s round (`work` the can's mouth under the tap): the can held
 * by its handle in the left hand, the tap turned on (`flow`) and the can filling (`fill` 0–1), the
 * right hand on the trough's rim meanwhile; the tap off, the full can lifted (`lift`) to feel its
 * weight and set back.
 */
export const CAN = { T: 12, tap: bo(-0.02, 0.27, 0.08), handle: bo(0.11, 0.02, 0.0) };
export function canRound(t: number, ph: number) {
  const C = CAN;
  const u = cyc(t, C.T, ph);
  const restL = bo(0.24, -0.1, -0.26);
  const restR = bo(-0.24, -0.1, -0.26);
  const lift = num([[0.72, 0], [0.8, 1], [0.84, 1], [0.9, 0]], u);
  const can = bo(0, 0.12 * lift, 0);
  const twist = (u0: number, u1: number) => (u > u0 && u < u1 ? bo(0.012 * wave(t, 2.2), 0, 0) : bo(0, 0, 0));
  const rim = bo(-0.22, -0.12, -0.08);
  const l = path([[0, restL], [0.06, C.handle], [0.92, C.handle], [0.98, restL]], u);
  const r = path([[0, restR], [0.07, C.tap], [0.15, C.tap], [0.2, rim], [0.6, rim], [0.65, C.tap], [0.7, C.tap], [0.74, bo(-0.11, -0.04, 0.0)], [0.9, bo(-0.11, -0.04, 0.0)], [0.96, restR]], u);
  return {
    u,
    l: boAdd(l, u > 0.06 && u < 0.92 ? can : bo(0, 0, 0)),
    r: boAdd(boAdd(r, twist(0.08, 0.15)), boAdd(twist(0.65, 0.7), u > 0.74 && u < 0.9 ? can : bo(0, 0, 0))),
    flow: u > 0.14 && u < 0.67,
    fill: num([[0.14, 0], [0.66, 1]], u),
    lift,
    tap: num([[0.08, 0], [0.14, 1], [0.65, 1], [0.7, 0]], u),
    lean: u > 0.72 && u < 0.9 ? 0.15 : 0.08,
    nod: 0.38,
    palms: 0.4,
    gl: u > 0.06 && u < 0.92 ? 0.9 : 0.3,
    gr: (u > 0.07 && u < 0.15) || (u > 0.65 && u < 0.7) || (u > 0.74 && u < 0.9) ? 0.85 : 0.4,
  };
}

// ---------------------------------------------------------------------------------------------
// The gift stand.

/**
 * Restocking the gift stand, ~12 s round (`work` the empty place on its middle tier): a little potted
 * plant lifted out of the restock crate on the bottom tier at the right (`pot`: 'crate', 'hand',
 * 'shelf'), set into the gap and turned to face out; the left hand takes a price tag off the roll and
 * sticks it on the pot's front (`tag`).
 */
export const GIFT = { T: 12, crate: bo(-0.62, -0.2, -0.3), tagRoll: bo(0.4, -0.3, -0.24) };
export function giftRound(t: number, ph: number) {
  const G = GIFT;
  const u = cyc(t, G.T, ph);
  const restL = bo(0.2, 0.05, -0.32);
  const restR = bo(-0.22, 0.05, -0.32);
  const gap = bo(0, 0.05, 0);
  const potAt = path([[0.08, G.crate], [0.13, boAdd(G.crate, bo(0, 0.14, 0))], [0.3, boAdd(gap, bo(0, 0.1, -0.06))], [0.36, gap]], u);
  const turn = within(u, 0.38, 0.46) >= 0 ? bo(0.015 * wave(t, 1.5), 0, 0) : bo(0, 0, 0);
  const r = path([[0, restR], [0.08, boAdd(G.crate, bo(-0.05, 0.03, 0))], [0.36, boAdd(gap, bo(-0.05, 0.03, 0))], [0.46, boAdd(gap, bo(-0.05, 0.03, 0))], [0.52, restR]], u);
  const front = boAdd(gap, bo(0.01, 0.0, -0.06));
  const l = path([[0, restL], [0.48, restL], [0.55, G.tagRoll], [0.6, G.tagRoll], [0.66, front], [0.74, front], [0.8, restL]], u);
  return {
    u,
    l: boAdd(l, u > 0.66 && u < 0.74 ? bo(0, 0, 0.004 * wave(t, 3)) : bo(0, 0, 0)),
    r: u > 0.08 && u < 0.36 ? boAdd(potAt, bo(-0.05, 0.03, 0)) : boAdd(r, turn),
    potAt,
    pot: u < 0.08 ? 'crate' : u < 0.36 ? 'hand' : 'shelf',
    tagInHand: u > 0.57 && u < 0.68,
    tag: u >= 0.68,
    crouch: num([[0.03, 0], [0.08, 0.35], [0.12, 0.35], [0.2, 0]], u),
    lean: num([[0, 0.1], [0.08, 0.3], [0.15, 0.15], [0.36, 0.2], [0.5, 0.1], [0.58, 0.25], [0.62, 0.15], [0.8, 0.1]], u),
    nod: 0.4,
    palms: 0.5,
    gl: u > 0.55 && u < 0.74 ? 0.7 : 0.3,
    gr: u > 0.08 && u < 0.46 ? 0.8 : 0.3,
  };
}

const ROUNDS: Record<GardenerMotion, (t: number, ph: number) => Hands> = {
  repot: repotRound,
  graft: graftRound,
  mixSoil: soilRound,
  mistCase: mistCaseRound,
  plantSurvey: surveyRound,
  climatePanel: climateRound,
  stormPanel: stormRound,
  budgetTablet: budgetRound,
  sowSeeds: sowRound,
  waterBasket: basketRound,
  feedKoi: koiRound,
  fillCan: canRound,
  stockPots: giftRound,
};

export function gardenerDoing(m: GardenerMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.4).setY(b.base.y + 0.9);
  const to = (o: BarOffset) => p.clone().addScaledVector(left, o.side).setY(p.y + o.up).addScaledVector(fwd, o.ahead);
  const k = ROUNDS[m](t, gPhase(b.base));
  return { reach: { l: to(k.l), r: to(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, crouch: k.crouch };
}
