import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * In a creator studio (2026-10-27, the 크리에이터 스튜디오, at the user's request: making short-form
 * content should look like it). A selfie taken at arm's length with a V by the cheek; an info short
 * told to the phone held out in one hand while the other points up at the captions beside the head;
 * a dance challenge danced on the mark to the phone on its tripod; a phone held in both hands and
 * thumbed through (replying to comments, scrolling a rival channel); a sponsor's box unboxed and the
 * product shown to the camera. Each round gives the hands — and the phone, the lid, the product — as
 * offsets in the creator's own frame (BarOffset: to their left, up, ahead), so the pieces
 * (workplaces/socialMedia.ts) draw the phone in the hand by the same clock (smPhase of a fixed mark
 * on the piece). Kept out of activity.ts (which only hands these motions over here) so it imports
 * nothing from it at run time.
 */
export type SocialMotion = 'smSelfie' | 'smVlog' | 'smChallenge' | 'smPhone' | 'smUnbox';
export const SOCIAL_MOTIONS = new Set<string>(['smSelfie', 'smVlog', 'smChallenge', 'smPhone', 'smUnbox']);

const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const boScale = (a: BarOffset, k: number): BarOffset => bo(a.side * k, a.up * k, a.ahead * k);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const sstep = THREE.MathUtils.smoothstep;
const frac = (x: number) => ((x % 1) + 1) % 1;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** The same clock offset as activity.ts toolPhase: from a fixed mark on the piece, so two of them aren't in step. */
export const smPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** A held pose: the hands (and the phone) in the creator's frame, from the feet (or the seat's top). */
interface Hold {
  l: BarOffset;
  r: BarOffset;
  phone?: BarOffset;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
}
const holdMix = (a: Hold, b: Hold, e: number): Hold => ({
  l: boMix(a.l, b.l, e),
  r: boMix(a.r, b.r, e),
  phone: a.phone && b.phone ? boMix(a.phone, b.phone, e) : (e < 0.5 ? a : b).phone,
  lean: mix(a.lean, b.lean, e),
  nod: mix(a.nod, b.nod, e),
  palms: mix(a.palms, b.palms, e),
  gl: mix(a.gl, b.gl, e),
  gr: mix(a.gr, b.gr, e),
});
/** Round a list of holds, each `hold` s then `move` s to the next: which two, and how far between. */
function cycle<T>(keys: T[], hold: number, move: number, t: number, ph: number): { a: T; b: T; e: number; i: number; v: number } {
  const T = keys.length * (hold + move);
  const u = frac(t / T + ph) * T;
  const i = Math.floor(u / (hold + move));
  const v = u - i * (hold + move);
  return { a: keys[i], b: keys[(i + 1) % keys.length], e: sstep(v, hold, hold + move), i, v };
}
/** The right hand round a phone held upright (it at the phone's lower half, a little nearer the face). */
const gripOf = (phone: BarOffset) => boAdd(phone, bo(-0.012, -0.045, -0.02));

/** Where the eyes are from the feet (standing) or the seat's top (sitting), for a phone turned to them. */
export const eyesAt = (H: number, sitting: boolean) => bo(0, (sitting ? 0.53 : 0.93) * H, 0.06 * (H / 1.6));

// ---------------------------------------------------------------------------------------------
// A selfie (smSelfie, 12.8 s): four angles, each held while the shutter goes, the free hand posing.

/**
 * The phone up high to the right with a V by the cheek; held out straight with a finger heart to the
 * cheek (볼하트); low from the right with the hand under the chin (꽃받침); down at the chest to
 * check the shots, the thumb swiping. `flash` 0–1 as each is taken.
 */
export function selfieRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const keys: Hold[] = [
    { phone: bo(-0.15, 1.62, 0.38), l: bo(0.13, 1.43, 0.12), r: bo(0, 0, 0), lean: -0.04, nod: -0.2, palms: 0.1, gl: 0.55, gr: 0.75 },
    { phone: bo(-0.06, 1.47, 0.45), l: bo(0.07, 1.37, 0.12), r: bo(0, 0, 0), lean: 0, nod: -0.05, palms: 0.2, gl: 0.7, gr: 0.75 },
    { phone: bo(-0.27, 1.3, 0.36), l: bo(0.03, 1.3, 0.13), r: bo(0, 0, 0), lean: 0.03, nod: 0.06, palms: 1.2, gl: 0.15, gr: 0.75 },
    { phone: bo(-0.04, 1.1, 0.3), l: bo(0.03, 1.07, 0.29), r: bo(0, 0, 0), lean: 0.08, nod: 0.42, palms: 0.6, gl: 0.45, gr: 0.75 },
  ];
  const c = cycle(keys, 2.6, 0.6, t, ph);
  const h = holdMix(c.a, c.b, c.e);
  // A little sway, the head tipped with it.
  const sway = 0.012 * wave(t, 0.35, ph);
  const phone = boScale(boAdd(h.phone!, bo(sway, 0.006 * wave(t, 0.7, ph), 0)), k);
  const l = boScale(c.i === 3 ? boAdd(h.l, bo(0.01 * wave(t, 1.6, ph), 0, 0)) : h.l, k);
  const flash = c.i < 3 ? Math.max(0, 1 - Math.abs(c.v - 1.9) / 0.15) : 0;
  return { phone, l, r: gripOf(phone), lean: h.lean, nod: h.nod, palms: h.palms, gl: h.gl, gr: h.gr, flash, pose: c.e < 0.5 ? c.i : (c.i + 1) % 4 };
}

// ---------------------------------------------------------------------------------------------
// An info short told to the phone (smVlog, 14 s): the phone held out in the right hand, the left
// talking, counting, and pointing up at the captions that will be beside the head.

/** Which caption the left hand points at (0 none, 1 the top one, 2 the lower one), for the set to pop. */
export function vlogRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const talk: Hold = { l: bo(0.2, 1.02, 0.3), r: bo(0, 0, 0), lean: 0.02, nod: -0.04, palms: -0.6, gl: 0.15, gr: 0.75 };
  const top: Hold = { l: bo(0.42, 1.56, 0.2), r: bo(0, 0, 0), lean: -0.02, nod: -0.08, palms: 0.2, gl: 0.8, gr: 0.75 };
  const count: Hold = { l: bo(0.15, 1.24, 0.3), r: bo(0, 0, 0), lean: 0.03, nod: -0.04, palms: -0.2, gl: 0.45, gr: 0.75 };
  const low: Hold = { l: bo(0.43, 1.2, 0.28), r: bo(0, 0, 0), lean: 0, nod: -0.02, palms: 0.2, gl: 0.8, gr: 0.75 };
  const keys = [talk, top, count, low, talk, count];
  const c = cycle(keys, 1.8, 0.5, t, ph);
  const h = holdMix(c.a, c.b, c.e);
  const beat = 0.012 * Math.max(0, wave(t, 2.2, ph));
  const phone = boScale(bo(-0.12 + 0.01 * wave(t, 0.4, ph), 1.38 + 0.012 * wave(t, 0.9, ph), 0.46), k);
  const l = boScale(boAdd(h.l, bo(0, c.i === 0 || c.i === 4 ? beat : 0, 0)), k);
  const at = c.e < 0.5 ? c.i : (c.i + 1) % keys.length;
  const caption = at === 1 ? 1 : at === 3 ? 2 : 0;
  return { phone, l, r: gripOf(phone), lean: h.lean, nod: h.nod, palms: h.palms, gl: h.gl, gr: h.gr, caption, rec: true };
}

// ---------------------------------------------------------------------------------------------
// A dance challenge (smChallenge): eight moves of two beats at 120 bpm, the end pose, a breath.

export const CHALLENGE_BEAT = 0.5;
const MOVES = 8;
/** The round: 16 beats danced, the finger heart held to the lens, a breath before the next take. */
const CHALLENGE_T = MOVES * 2 * CHALLENGE_BEAT + 1.6 + 1.4;
/**
 * Pointed up to the right then the left, the arms rolled in front, clapped to one side then the
 * other, waved out at the shoulders, finger guns dipped at the lens, a shimmy, a heart over the
 * head; then the finger heart to the phone with a hand on the hip, and the arms down for a breath.
 * `step` (to their left) and `twist` turn the spot itself with the moves; `crouch` bounces on the beat.
 */
export function challengeRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const u = frac(t / CHALLENGE_T + ph) * CHALLENGE_T;
  const danceT = MOVES * 2 * CHALLENGE_BEAT;
  const beatF = frac(u / CHALLENGE_BEAT);
  const n = Math.floor(u / CHALLENGE_BEAT);
  const hip = (s: number) => bo(s * 0.2, 0.93, 0.02);
  const move = (i: number, v: number): Hold & { step: number; twist: number; crouch: number } => {
    const a = v * Math.PI * 2;
    switch (i) {
      case 0:
        return { l: hip(1), r: bo(-0.4, 1.62, 0.14), lean: -0.02, nod: -0.1, palms: 0.6, gl: 0.6, gr: 0.85, step: -0.06, twist: -0.22, crouch: 0.06 };
      case 1:
        return { l: bo(0.4, 1.62, 0.14), r: hip(-1), lean: -0.02, nod: -0.1, palms: 0.6, gl: 0.85, gr: 0.6, step: 0.06, twist: 0.22, crouch: 0.06 };
      case 2:
        return {
          l: bo(0.08 + 0.07 * Math.cos(a * 2), 1.12 + 0.07 * Math.sin(a * 2), 0.3),
          r: bo(-0.08 - 0.07 * Math.cos(a * 2), 1.12 - 0.07 * Math.sin(a * 2), 0.3),
          lean: 0.06, nod: 0.04, palms: 1.0, gl: 0.7, gr: 0.7, step: 0, twist: 0, crouch: 0.18,
        };
      case 3: {
        const side = v < 0.5 ? -1 : 1;
        return { l: bo(side * 0.17 + 0.03, 1.32, 0.3), r: bo(side * 0.17 - 0.03, 1.32, 0.3), lean: 0, nod: -0.04, palms: 0, gl: 0.05, gr: 0.05, step: side * 0.04, twist: side * 0.3, crouch: 0.08 };
      }
      case 4:
        return { l: bo(0.52, 1.3 + 0.12 * Math.sin(a * 2), 0.08), r: bo(-0.52, 1.3 - 0.12 * Math.sin(a * 2), 0.08), lean: 0, nod: -0.06, palms: 0.2, gl: 0.1, gr: 0.1, step: 0, twist: 0.12 * Math.sin(a), crouch: 0.1 };
      case 5:
        return { l: bo(0.12, 1.28, 0.48), r: bo(-0.12, 1.28, 0.48), lean: 0.14, nod: 0.02, palms: 0.4, gl: 0.8, gr: 0.8, step: 0, twist: 0, crouch: 0.32 };
      case 6: {
        const sh = 0.04 * Math.sin(a * 8);
        return { l: bo(0.15, 1.12 + sh, 0.2), r: bo(-0.15, 1.12 - sh, 0.2), lean: -0.04, nod: -0.02, palms: 0.4, gl: 0.9, gr: 0.9, step: 0.02 * Math.sin(a * 4), twist: 0.15 * Math.sin(a * 4), crouch: 0.12 };
      }
      default:
        return { l: bo(0.07, 1.72, 0.08), r: bo(-0.07, 1.72, 0.08), lean: -0.03, nod: -0.08, palms: 0, gl: 0.35, gr: 0.35, step: 0, twist: 0, crouch: 0.04 };
    }
  };
  const heart = { l: hip(1), r: bo(-0.05, 1.38, 0.4), lean: 0.04, nod: -0.02, palms: 0.3, gl: 0.6, gr: 0.75, step: 0, twist: -0.1, crouch: 0.1 };
  const rest = { l: bo(0.2, 0.86, 0.06), r: bo(-0.2, 0.86, 0.06), lean: 0.06, nod: 0.12, palms: 0.2, gl: 0.3, gr: 0.3, step: 0, twist: 0, crouch: 0 };
  let a: ReturnType<typeof move>;
  let b: ReturnType<typeof move>;
  let e: number;
  let bounce = 0;
  if (u < danceT) {
    const i = Math.floor(n / 2);
    const v = (u - i * 2 * CHALLENGE_BEAT) / (2 * CHALLENGE_BEAT);
    a = i === 0 ? rest : move(i - 1, 1);
    b = move(i, v);
    e = sstep(v, 0, 0.22);
    // Down on every beat, up between.
    bounce = 1 - sstep(beatF, 0, 0.35) + sstep(beatF, 0.75, 1) * 0.3;
  } else if (u < danceT + 1.6) {
    a = move(MOVES - 1, 1);
    b = heart;
    e = sstep(u - danceT, 0, 0.3);
  } else {
    a = heart;
    b = rest;
    e = sstep(u - danceT - 1.6, 0, 0.5);
  }
  const h = holdMix(a, b, e);
  const crouch = mix(a.crouch, b.crouch, e) * (u < danceT ? 0.4 + 0.6 * bounce : 1);
  return {
    l: boScale(h.l, k),
    r: boScale(h.r, k),
    lean: h.lean,
    nod: h.nod,
    palms: h.palms,
    gl: h.gl,
    gr: h.gr,
    crouch,
    step: mix(a.step, b.step, e) * k,
    twist: mix(a.twist, b.twist, e),
    /** On the take (the phone's red dot) or between takes. */
    rec: u < danceT + 1.6,
    beat: u < danceT ? 1 - sstep(beatF, 0, 0.3) : 0,
  };
}

// ---------------------------------------------------------------------------------------------
// A phone in both hands (smPhone, 9 s): the thumbs tapping out a reply, a scroll, brought closer to read.

export function phoneRound(t: number, ph: number, H: number, sitting: boolean) {
  const k = H / 1.6;
  const u = frac(t / 9 + ph);
  const close = sstep(u, 0.55, 0.62) * (1 - sstep(u, 0.8, 0.86));
  const scroll = u > 0.36 && u < 0.52 ? wave(t, 1.4, ph) : 0;
  const base = sitting ? bo(-0.02, 0.36, 0.27) : bo(-0.02, 1.08, 0.29);
  const phone = boScale(boAdd(base, bo(0, 0.07 * close, -0.05 * close)), k);
  const typing = u < 0.36 || u > 0.88;
  const tapL = typing ? 0.006 * Math.max(0, wave(t, 4.2, ph)) : 0;
  const tapR = typing ? 0.006 * Math.max(0, wave(t, 4.2, ph + 0.5)) : 0;
  const l = boAdd(phone, bo(0.038, -0.05 + tapL, -0.022));
  const r = boAdd(phone, bo(-0.038, -0.05 + tapR + 0.02 * scroll, -0.022));
  return { phone, l, r, lean: (sitting ? 0.12 : 0.08) - 0.06 * close, nod: 0.45 - 0.12 * close, palms: 0.9, gl: 0.55, gr: 0.55, tap: typing };
}

// ---------------------------------------------------------------------------------------------
// A sponsor's box unboxed to the camera (smUnbox, 18 s), from the middle of the box's lid (`work`).

/**
 * The lid lifted off with both hands and set down to the right; the tissue parted; the product lifted
 * out and shown to the camera over the box, turned in the hand while the other hand presents it; held
 * up by the cheek ("너무 예쁘죠?"); put back and the lid on again. `lid` and `product` are where they
 * are (their middles, from the lid's middle when it's on), `held` whether the product's in the hand,
 * `spin` how far it's turned.
 */
export function unboxRound(t: number, ph: number) {
  const u = frac(t / 18 + ph);
  const on = bo(0, 0, 0);
  const aside = bo(-0.34, -0.06, 0.04);
  const up = bo(-0.12, 0.2, 0.0);
  const lidKeys: Array<[number, BarOffset]> = [[0.08, on], [0.13, bo(0, 0.18, 0)], [0.17, up], [0.2, aside], [0.88, aside], [0.92, up], [0.95, bo(0, 0.14, 0)], [0.98, on]];
  const lid = keyedBo(lidKeys, u);
  const inBox = bo(0, -0.07, 0);
  const prodKeys: Array<[number, BarOffset]> = [
    [0.38, inBox], [0.46, bo(0, 0.3, -0.1)], [0.5, bo(-0.03, 0.44, 0.05)], [0.68, bo(-0.03, 0.44, 0.05)],
    [0.72, bo(-0.11, 0.5, -0.28)], [0.79, bo(-0.11, 0.5, -0.28)], [0.84, bo(0, 0.2, -0.02)], [0.87, inBox],
  ];
  const product = keyedBo(prodKeys, u);
  const held = u > 0.38 && u < 0.87;
  const spin = u > 0.5 && u < 0.68 ? Math.sin((u - 0.5) / 0.18 * Math.PI * 2) * 1.1 : 0;
  let l: BarOffset;
  let r: BarOffset;
  let lean = 0.22;
  let nod = 0.38;
  let palms = 0.9;
  let gl = 0.6;
  let gr = 0.6;
  const rummage = (s: number) => bo(s * 0.06 + 0.02 * wave(t, 1.3, ph + s), -0.03 + 0.015 * wave(t, 2.6, ph), 0.015 * wave(t, 1.1, ph));
  if (u < 0.08) {
    l = bo(0.14, 0.0, 0);
    r = bo(-0.14, 0.0, 0);
  } else if (u < 0.22 || u > 0.87) {
    // Carrying the lid off (or back), a hand either end.
    l = boAdd(lid, bo(0.13, 0, 0));
    r = boAdd(lid, bo(-0.13, 0, 0));
    gl = gr = 0.7;
  } else if (u < 0.38) {
    l = rummage(1);
    r = rummage(-1);
    lean = 0.3;
    nod = 0.5;
    gl = gr = 0.35;
  } else if (u < 0.5 || (u > 0.79 && u <= 0.87)) {
    // Lifted out (or put back) in both hands.
    l = boAdd(product, bo(0.05, -0.02, -0.01));
    r = boAdd(product, bo(-0.05, -0.02, -0.01));
    lean = 0.12;
    nod = 0.2;
    gl = gr = 0.7;
  } else if (u < 0.68) {
    // Shown to the lens in the right hand; the left opens out to it, then points at the label.
    r = boAdd(product, bo(-0.035, -0.03, -0.015));
    const point = sstep(u, 0.58, 0.61);
    l = boMix(bo(0.2, 0.32, 0.02), bo(0.05, 0.45, 0.02), point);
    lean = 0.04;
    nod = -0.04;
    palms = mix(-0.6, 0.2, point);
    gl = mix(0.1, 0.8, point);
    gr = 0.8;
  } else {
    // By the cheek, the free hand in a V.
    r = boAdd(product, bo(-0.03, -0.03, -0.01));
    l = bo(0.13, 0.56, -0.3);
    lean = 0;
    nod = -0.06;
    palms = 0.2;
    gl = 0.55;
    gr = 0.8;
  }
  return { lid, product, held, spin, l, r, lean, nod, palms, gl, gr, lidOn: u < 0.08 || u > 0.98 };
}
function keyedBo(keys: Array<[number, BarOffset]>, u: number): BarOffset {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return boMix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a creator studio motion (activity.ts doing hands these over). */
export function socialDoing(m: SocialMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  const ph = smPhase(work?.point ?? b.base);
  const from = (p: THREE.Vector3, o: BarOffset) => p.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  const body = (o: BarOffset) => from(b.base, o);
  switch (m) {
    case 'smSelfie': {
      const k = selfieRound(t, ph, H);
      return { reach: { l: body(k.l), r: body(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } } };
    }
    case 'smVlog': {
      const k = vlogRound(t, ph, H);
      return { reach: { l: body(k.l), r: body(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } } };
    }
    case 'smChallenge': {
      const k = challengeRound(t, ph, H);
      return { reach: { l: body(k.l), r: body(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, crouch: k.crouch };
    }
    case 'smPhone': {
      const k = phoneRound(t, ph, H, b.sitting);
      return { reach: { l: body(k.l), r: body(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr }, tap: k.tap } };
    }
    case 'smUnbox': {
      const p = work?.point ?? body(bo(0, 0.88, 0.45));
      const k = unboxRound(t, ph);
      return { reach: { l: from(p, k.l), r: from(p, k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } } };
    }
  }
}
