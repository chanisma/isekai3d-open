import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * In a film production company (2026-10-27, the 영화 제작사, at the user's request: filmmaking should
 * look like filmmaking). Behind the cinema camera with the eye to the eyepiece and a hand on the pan
 * bar, then back to watch the take on its monitor; beside it with the shot list, the hand raised for
 * "레디…" and brought down for "액션!", a slice across for "컷!"; in front of the lens with the
 * clapperboard, its sticks opened and snapped shut; at the editing suite turning the jog wheel and
 * trimming with the mouse, at the grading panel rolling the trackballs; before the screen with a
 * notebook at the dailies, or out front with a microphone at a premiere; reading the other part off
 * the sides with an auditioning actor and showing them the scene; voicing a guide track in the ADR
 * booth to the three beeps; and going through the headshots at the casting table. Each round gives
 * the hands — and what's in them, the clapperboard, the clipboard, the mic, a headshot — as offsets
 * in the dweller's own frame (BarOffset: to their left, up, ahead), so the pieces (workplaces/filmmaker.ts)
 * draw them where the hands are by the same clock (fmPhase of the spot). Kept out of activity.ts
 * (which only hands these motions over here) so it imports nothing from it at run time.
 */
export type FilmMotion = 'fmCamera' | 'fmAction' | 'fmSlate' | 'fmEdit' | 'fmGrade' | 'fmDailies' | 'fmPremiere' | 'fmSides' | 'fmCoach' | 'fmAdr' | 'fmHeadshots';
export const FILM_MOTIONS = new Set<string>(['fmCamera', 'fmAction', 'fmSlate', 'fmEdit', 'fmGrade', 'fmDailies', 'fmPremiere', 'fmSides', 'fmCoach', 'fmAdr', 'fmHeadshots']);

export const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
export const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const sstep = THREE.MathUtils.smoothstep;
const frac = (x: number) => ((x % 1) + 1) % 1;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** Turned about the vertical by `a` (to the left for a > 0). */
export const turnBo = (o: BarOffset, a: number) => bo(o.side * Math.cos(a) + o.ahead * Math.sin(a), o.up, -o.side * Math.sin(a) + o.ahead * Math.cos(a));
/** The same clock offset as activity.ts toolPhase: from where the spot is, so two pieces aren't in step. */
export const fmPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** A held pose: the hands in the dweller's frame (from the feet, or the seat's top), the bend, the grips. */
interface Hold {
  l: BarOffset;
  r: BarOffset;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
}
const holdMix = (a: Hold, b: Hold, e: number): Hold => ({
  l: boMix(a.l, b.l, e),
  r: boMix(a.r, b.r, e),
  lean: mix(a.lean, b.lean, e),
  nod: mix(a.nod, b.nod, e),
  palms: mix(a.palms, b.palms, e),
  gl: mix(a.gl, b.gl, e),
  gr: mix(a.gr, b.gr, e),
  crouch: mix(a.crouch ?? 0, b.crouch ?? 0, e),
});
/** Round a list of [pose, seconds held, seconds to the next]: the pose now, which step (i), and how far through it (v, seconds). */
function play(steps: Array<[Hold, number, number]>, t: number, ph: number): { h: Hold; i: number; v: number; e: number } {
  const T = steps.reduce((n, s) => n + s[1] + s[2], 0);
  let u = frac(t / T + ph) * T;
  for (let i = 0; i < steps.length; i++) {
    const [a, hold, move] = steps[i];
    if (u < hold + move || i === steps.length - 1) {
      const e = u < hold ? 0 : sstep(Math.min(1, (u - hold) / move), 0, 1);
      return { h: e > 0 ? holdMix(a, steps[(i + 1) % steps.length][0], e) : a, i, v: u, e };
    }
    u -= hold + move;
  }
  return { h: steps[0][0], i: 0, v: 0, e: 0 };
}
/** Eased along keys [u, offset]. */
function keyedBo(keys: Array<[number, BarOffset]>, u: number): BarOffset {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return boMix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}
function keyedN(keys: Array<[number, number]>, u: number): number {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------------------------------------
// The cinema camera (movieCamera). Its head is set to whoever's working it: the eyepiece at their eye.

/** The pan pivot (the fluid head's top) from the operator's feet, for someone `H` tall facing the camera. */
export function camPivot(H: number): BarOffset {
  const k = H / 1.6;
  return bo(0, 0.915 * H - 0.13, 0.15 * k + 0.2);
}
/**
 * From the pivot, in the operator's frame before it's panned: the eyepiece's cup, the pan bar's grip
 * (back along their right side), the handle on the camera's left side, the monitor on its arm to the
 * right (its middle) and its play button.
 */
export const CAM = {
  eyepiece: bo(0, 0.13, -0.2),
  grip: bo(-0.3, -0.12, -0.23),
  handle: bo(0.12, 0.08, -0.1),
  monitor: bo(-0.24, 0.2, -0.02),
  button: bo(-0.3, 0.13, -0.05),
};
/** Where the director stands beside the camera (from the operator's place): to its right and a little forward. */
export const BESIDE = bo(-0.62, 0, 0.15);

/**
 * Operating (16 s): the eye to the eyepiece, the right hand on the pan bar easing the frame round and
 * the left on the camera's handle; then back off it, the play button on the monitor pressed and the
 * take watched with a hand to the chin; back to the eyepiece. `pan` how far the head's turned, `eye`
 * 0–1 at the eyepiece, `playback` while the take's played back on the monitor.
 */
export function cameraRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const u = frac(t / 16 + ph);
  const eye = 1 - sstep(u, 0.42, 0.48) + sstep(u, 0.9, 0.96);
  const pan = 0.08 * Math.sin(t * 0.45 + ph * 6) * eye;
  const pv = camPivot(H);
  const grip = boAdd(pv, turnBo(CAM.grip, pan));
  const chin = bo(-0.04, 0.855 * H, 0.13 * k);
  const button = boAdd(pv, CAM.button);
  const r = keyedBo([[0.42, grip], [0.48, boAdd(button, bo(0, 0.02, -0.02))], [0.5, button], [0.53, boAdd(button, bo(0, 0.02, -0.03))], [0.6, chin], [0.84, chin], [0.9, grip]], u);
  const l = boAdd(pv, turnBo(CAM.handle, pan));
  const onGrip = u < 0.44 || u > 0.89;
  const atChin = u > 0.58 && u < 0.86;
  return {
    pan,
    eye,
    playback: u > 0.5 && u < 0.88,
    l,
    r,
    lean: 0.1 * eye,
    nod: mix(0.02, 0.06, 1 - eye) + (atChin ? 0.03 * Math.max(0, wave(t, 0.5, ph)) ** 4 : 0),
    palms: onGrip ? 0.7 : atChin ? 0.15 : 1.2,
    gl: 0.6,
    gr: onGrip ? 0.9 : atChin ? 0.55 : 0.4,
  };
}

/**
 * Calling the shot beside the camera (≈21 s): the shot list on the clipboard ticked, the right arm
 * out to the set for the angle, a lean to the camera's monitor to check the frame, the hand raised
 * high — "레디…" — and brought down — "액션!" — the take watched, a slice across — "컷!" — a fist
 * for the OK. `clip` is the clipboard (in the left hand), `rolling` from the call to the cut.
 */
export function actionRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const pv = boAdd(camPivot(H), bo(-BESIDE.side, 0, -BESIDE.ahead));
  const mon = boAdd(pv, CAM.monitor);
  const clipUp = bo(0.07, 0.65 * H, 0.27 * k);
  const clipDown = bo(0.19, 0.53 * H, 0.14 * k);
  const write = boAdd(clipUp, bo(-0.11 + 0.025 * wave(t, 1.9, ph), 0.02 + 0.006 * wave(t, 3.8, ph), 0.015 * wave(t, 1.1, ph)));
  const steps: Array<[Hold, number, number]> = [
    [{ l: clipUp, r: write, lean: 0.06, nod: 0.45, palms: 1.0, gl: 0.75, gr: 0.85 }, 3.5, 0.7],
    [{ l: clipDown, r: bo(-0.12, 0.83 * H, 0.55 * k), lean: 0.02, nod: -0.06, palms: 0.3, gl: 0.75, gr: 0.8 }, 2.4, 0.8],
    [{ l: clipDown, r: boAdd(mon, bo(0.03, -0.05, -0.08)), lean: 0.14, nod: 0.06, palms: 0.4, gl: 0.75, gr: 0.75 }, 2.6, 0.7],
    [{ l: clipDown, r: bo(-0.2, 1.1 * H, 0.1 * k), lean: -0.02, nod: -0.06, palms: -0.4, gl: 0.75, gr: 0.08 }, 1.4, 0.3],
    [{ l: clipDown, r: bo(-0.12, 0.6 * H, 0.42 * k), lean: 0.05, nod: -0.04, palms: 0.6, gl: 0.75, gr: 0.3 }, 3.6, 0.35],
    [{ l: clipDown, r: bo(0.12, 0.74 * H, 0.38 * k), lean: 0.04, nod: -0.02, palms: 1.45, gl: 0.75, gr: 0.05 }, 1.2, 0.6],
    [{ l: clipDown, r: bo(-0.15, 0.71 * H, 0.27 * k), lean: 0.02, nod: 0.12, palms: 0.2, gl: 0.75, gr: 1 }, 1.4, 0.7],
  ];
  const p = play(steps, t, ph);
  const clip = boAdd(p.h.l, bo(-0.04, 0.03, 0.02));
  return { ...p.h, clip, rolling: (p.i === 3 && p.e > 0.5) || p.i === 4 || (p.i === 5 && p.e === 0), live: p.i >= 2 && p.i <= 5 };
}

/** The clapperboard: its slate's size, and the hinge of its sticks (on the slate, at the loader's left, along its top). */
export const SLATE = { w: 0.28, h: 0.22, hinge: bo(0.14, 0.12, 0) };
/**
 * Slating a take (9 s): the take written up on the board held low, tipped back to read; raised in
 * front of the lens at arm's length with the sticks opened while the scene and take are called;
 * snapped shut; pulled down and away out of shot, carried at the side; back to write the next take.
 * `board` its middle, `pitch` how far it's tipped back, `open` the sticks' angle.
 */
export function slateRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const u = frac(t / 9 + ph);
  const low = bo(-0.02, 0.6 * H, 0.27 * k);
  const up = bo(0, 0.8 * H, 0.38 * k);
  const side = bo(-0.27, 0.52 * H, 0.1 * k);
  const board = keyedBo([[0.12, low], [0.2, up], [0.48, up], [0.58, side], [0.9, side], [0.98, low]], u);
  const pitch = keyedN([[0.12, 1.1], [0.2, 0], [0.48, 0], [0.58, 0.25], [0.9, 0.25], [0.98, 1.1]], u);
  const open = u < 0.13 ? 0 : u < 0.2 ? 0.55 * sstep(u, 0.13, 0.2) : u < 0.42 ? 0.55 : u < 0.43 ? 0.55 * (1 - (u - 0.42) / 0.01) : 0;
  const stick = (along: number) => {
    // A point `along` the sticks from the hinge, on the board tipped back by `pitch`.
    const x = SLATE.hinge.side - along * Math.cos(open);
    const y = SLATE.hinge.up + along * Math.sin(open);
    return boAdd(board, bo(x, y * Math.cos(pitch), -y * Math.sin(pitch)));
  };
  const writing = u < 0.12 || u > 0.97;
  const lHold = boAdd(board, bo(0.15, -0.04 * Math.cos(pitch), 0.04 * Math.sin(pitch)));
  const rWrite = boAdd(board, bo(-0.03 + 0.03 * wave(t, 1.7, ph), 0.03 * Math.cos(pitch), 0.02 - 0.03 * Math.sin(pitch)));
  const carried = u > 0.5 && u < 0.92;
  // Carried at the side by its top corner in the right hand, the left let go.
  const carry = sstep(u, 0.48, 0.55) * (1 - sstep(u, 0.9, 0.96));
  const held = writing ? rWrite : u < 0.2 ? boMix(rWrite, stick(0.24), sstep(u, 0.12, 0.18)) : stick(0.24);
  const r = boMix(held, boAdd(board, bo(-0.13, 0.11, 0)), carry);
  const l = boMix(lHold, bo(0.17, 0.5 * H, 0.06 * k), carry);
  return {
    board,
    pitch,
    open,
    clap: u > 0.425 && u < 0.45,
    l,
    r,
    lean: writing ? 0.1 : u < 0.5 ? 0.03 : 0,
    nod: writing ? 0.5 : u < 0.5 ? 0.12 : 0.04,
    palms: writing ? 1.1 : 0.5,
    gl: carried ? 0.2 : 0.75,
    gr: writing ? 0.85 : 0.8,
  };
}

// ---------------------------------------------------------------------------------------------
// The editing suite. Offsets from the keyboard's middle (`work`), in the editor's frame.

/** The jog/shuttle wheel to the right of the keyboard, the mouse beyond it; the J-K-L keys under the left hand. */
export const EDIT = { jog: bo(-0.29, 0.025, 0.01), mouse: bo(-0.45, 0.012, 0.03), keys: bo(0.02, 0.012, 0) };
/**
 * Cutting (16 s): scrubbing with the jog wheel (the right hand round its rim, back and forth) and the
 * left on J-K-L; trimming with the mouse; a cut made from the keyboard; sat back watching it play,
 * the hand at the chin. `jog` the wheel's turn, `head` the playhead along the timeline (0–1).
 */
export function editRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const u = frac(t / 16 + ph);
  const jog = 1.4 * Math.sin(t * 1.3 + ph * 5) + 0.6 * Math.sin(t * 2.9);
  const rim = boAdd(EDIT.jog, bo(0.03 * Math.sin(jog), 0.012, -0.03 * Math.cos(jog)));
  const mouse = boAdd(EDIT.mouse, bo(0.03 * wave(t, 0.4, ph), 0, 0.02 * wave(t, 0.27, ph)));
  const tap = 0.012 * Math.max(0, wave(t, 3.1, ph));
  const keys = boAdd(EDIT.keys, bo(0.015 * wave(t, 0.6, ph), tap, 0));
  const desk = bo(0.17, -0.01, 0.12);
  // The chin's from the seat, not the keyboard: handed back separately.
  const steps: Array<[Hold, number, number]> = [
    [{ l: keys, r: rim, lean: 0.2, nod: 0.08, palms: 1.35, gl: 0.35, gr: 0.5 }, 5, 0.6],
    [{ l: keys, r: mouse, lean: 0.22, nod: 0.1, palms: 1.4, gl: 0.35, gr: 0.45 }, 3.4, 0.4],
    [{ l: boAdd(EDIT.keys, bo(0.06, 0.012 * Math.max(0, wave(t, 1.2, ph)) ** 4, 0.02)), r: mouse, lean: 0.24, nod: 0.12, palms: 1.4, gl: 0.4, gr: 0.45 }, 2.2, 0.6],
    [{ l: desk, r: bo(0, 0, 0), lean: -0.04, nod: 0.0, palms: 0.3, gl: 0.3, gr: 0.55 }, 3.2, 0.6],
  ];
  const p = play(steps, t, ph);
  const T = 16;
  const watching = p.i === 3;
  const head = 0.22 + 0.5 * u + (p.i === 0 ? 0.03 * Math.sin(jog) : 0);
  return { ...p.h, chin: watching || (p.i === 2 && p.e > 0) || (p.i === 3 && p.e > 0), chinMix: p.i === 2 ? p.e : p.i === 3 ? 1 - p.e : 0, chinAt: bo(-0.04, 0.455 * H, 0.14 * k), jog: p.i === 0 ? jog : 0, head: frac(head), playing: watching, T };
}

/** The grading panel's three trackballs (lift, gamma, gain) from its middle, in the colourist's frame. */
export const BALLS = [bo(0.13, 0.035, -0.01), bo(0, 0.035, -0.01), bo(-0.13, 0.035, -0.01)];
/**
 * Grading (12 s): the left palm rolling the lift ball, the right the gamma, then the gain, small
 * circles; then sat back comparing, the hand at the chin. `roll` each ball's turn, `warm` how the
 * picture's pushed (-1 teal to 1 orange).
 */
export function gradeRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const circ = (i: number, r = 0.012) => boAdd(BALLS[i], bo(r * Math.sin(t * 2.4 + i), 0.035, r * Math.cos(t * 2.4 + i)));
  const rest = (i: number) => boAdd(BALLS[i], bo(0, 0.03, 0.03));
  const steps: Array<[Hold, number, number]> = [
    [{ l: circ(0), r: rest(1), lean: 0.2, nod: 0.06, palms: 1.5, gl: 0.3, gr: 0.3 }, 3, 0.5],
    [{ l: rest(0), r: circ(1), lean: 0.2, nod: 0.06, palms: 1.5, gl: 0.3, gr: 0.3 }, 2.6, 0.5],
    [{ l: rest(0), r: circ(2), lean: 0.2, nod: 0.06, palms: 1.5, gl: 0.3, gr: 0.3 }, 2.6, 0.5],
    [{ l: rest(0), r: bo(0, 0, 0), lean: -0.03, nod: 0.0, palms: 0.3, gl: 0.3, gr: 0.55 }, 1.8, 0.5],
  ];
  const p = play(steps, t, ph);
  const active = p.e > 0 ? -1 : p.i < 3 ? p.i : -1;
  const warm = Math.sin(t * 0.35 + ph * 4);
  return { ...p.h, active, roll: t * 2.4, warm, chinMix: p.i === 3 ? (p.e > 0 ? 1 - p.e : 1) : p.i === 2 ? p.e : 0, chinAt: bo(-0.04, 0.455 * H, 0.14 * k) };
}

// ---------------------------------------------------------------------------------------------
// The screening room.

/**
 * The dailies (18 s), stood before the screen with a notebook: watching with a hand at the chin,
 * a note written, the right hand up pointing at something on the screen, watching on with the arm
 * down. `book` the notebook (in the left hand).
 */
export function dailiesRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const bookAt = bo(0.08, 0.62 * H, 0.24 * k);
  const write = boAdd(bookAt, bo(-0.1 + 0.025 * wave(t, 1.8, ph), 0.02, 0.01 * wave(t, 1.1, ph)));
  const chin = bo(-0.04, 0.855 * H, 0.13 * k);
  const steps: Array<[Hold, number, number]> = [
    [{ l: bo(0.13, 0.56 * H, 0.16 * k), r: chin, lean: 0, nod: -0.14, palms: 0.2, gl: 0.75, gr: 0.5 }, 4, 0.8],
    [{ l: bookAt, r: write, lean: 0.05, nod: 0.42, palms: 1.0, gl: 0.75, gr: 0.85 }, 3, 0.7],
    [{ l: bo(0.13, 0.56 * H, 0.16 * k), r: bo(-0.1, 1.02 * H, 0.52 * k), lean: -0.02, nod: -0.18, palms: 0.3, gl: 0.75, gr: 0.8 }, 2.4, 0.8],
    [{ l: bo(0.13, 0.56 * H, 0.16 * k), r: bo(-0.15, 0.53 * H, 0.1 * k), lean: 0, nod: -0.12, palms: 0.4, gl: 0.75, gr: 0.3 }, 4, 0.8],
  ];
  const p = play(steps, t, ph);
  return { ...p.h, book: boAdd(p.h.l, bo(-0.05, 0.03, 0.03)) };
}

/**
 * Introducing a premiere (22 s), stood out front with a hand mic: a wave to the room, talking with
 * the free hand, a hand swept out to the cast at the side, talking on, then a bow with the mic down.
 * `mic` the mic's head (the right hand round its handle below it).
 */
export function premiereRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const atMouth = bo(-0.05, 0.79 * H, 0.14 * k);
  const say = 0.012 * wave(t, 1.3, ph);
  const steps: Array<[Hold, number, number]> = [
    [{ l: bo(0.3 + 0.04 * wave(t, 1.6, ph), 1.02 * H, 0.16 * k), r: atMouth, lean: 0, nod: -0.06, palms: -0.8, gl: 0.08, gr: 0.9 }, 2.8, 0.6],
    [{ l: bo(0.24, 0.66 * H + say, 0.3 * k), r: atMouth, lean: 0.02, nod: -0.04, palms: -0.7, gl: 0.12, gr: 0.9 }, 4.5, 0.7],
    [{ l: bo(0.55, 0.76 * H, 0.22 * k), r: atMouth, lean: 0, nod: -0.02, palms: -0.9, gl: 0.05, gr: 0.9 }, 3.2, 0.7],
    [{ l: bo(0.2, 0.62 * H - say, 0.28 * k), r: atMouth, lean: 0.02, nod: -0.04, palms: -0.5, gl: 0.2, gr: 0.9 }, 4, 0.8],
    [{ l: bo(0.06, 0.55 * H, 0.12 * k), r: bo(-0.13, 0.5 * H, 0.14 * k), lean: 0.5, nod: 0.35, palms: 0.6, gl: 0.3, gr: 0.9 }, 2.2, 0.9],
  ];
  const p = play(steps, t, ph);
  // The mic's head over the hand: up to the mouth, or tipped forward when it's held down.
  const down = p.i === 4 ? 1 - p.e : p.i === 3 ? p.e : 0;
  const mic = boAdd(p.h.r, boMix(bo(0.02, 0.13, 0.0), bo(0, 0.1, 0.07), down));
  return { ...p.h, mic, down };
}

// ---------------------------------------------------------------------------------------------
// With an auditioning actor, sat waiting in their chair (social places on fmAuditionChair).

/**
 * Reading with the actor (14 s): the sides held in both hands and the other part read; lowered to
 * look at them as they answer, a hand opened to them; a page turned; a note pencilled on it.
 * `pages` the sides.
 */
export function sidesRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const read = bo(0, 0.67 * H, 0.26 * k);
  const low = bo(0.05, 0.58 * H, 0.22 * k);
  const both = (p: BarOffset, gr = 0.7): Pick<Hold, 'l' | 'r' | 'gl' | 'gr'> => ({ l: boAdd(p, bo(0.1, -0.04, 0)), r: boAdd(p, bo(-0.1, -0.04, 0)), gl: 0.7, gr });
  const steps: Array<[Hold, number, number]> = [
    [{ ...both(read), lean: 0.04, nod: 0.42, palms: 0.6 }, 4.2, 0.7],
    [{ l: boAdd(low, bo(0.1, -0.04, 0)), r: bo(-0.2, 0.66 * H + 0.015 * wave(t, 0.9, ph), 0.32 * k), gl: 0.7, gr: 0.12, lean: 0.06, nod: 0.12, palms: -0.6 }, 3, 0.7],
    [{ l: boAdd(read, bo(0.1, -0.04, 0)), r: boAdd(read, bo(0.06, 0.04, 0.01)), gl: 0.7, gr: 0.6, lean: 0.04, nod: 0.4, palms: 0.8 }, 0.9, 0.6],
    [{ l: boAdd(read, bo(0.1, -0.04, 0)), r: boAdd(read, bo(-0.03 + 0.025 * wave(t, 1.8, ph), 0.0, 0.02)), gl: 0.7, gr: 0.85, lean: 0.06, nod: 0.45, palms: 1.0 }, 2.2, 0.7],
  ];
  const p = play(steps, t, ph);
  const pages = p.i === 1 ? boMix(low, read, p.e) : p.i === 0 && p.e > 0 ? boMix(read, low, p.e) : read;
  return { ...p.h, pages };
}

/**
 * Showing the actor the scene (≈18 s): a hand on the heart for the feeling, both palms down — softer —
 * the hands making a frame before the face, a point to them, down on the haunches level with them
 * talking it through, a nod.
 */
export function coachRound(t: number, ph: number, H: number) {
  const k = H / 1.6;
  const steps: Array<[Hold, number, number]> = [
    [{ l: bo(0.18, 0.5 * H, 0.08 * k), r: bo(0.05, 0.7 * H, 0.12 * k), lean: 0.02, nod: 0.05, palms: 0.5, gl: 0.3, gr: 0.2 }, 2.8, 0.7],
    [{ l: bo(0.22, 0.6 * H - 0.02 * Math.max(0, wave(t, 0.8, ph)), 0.32 * k), r: bo(-0.22, 0.6 * H - 0.02 * Math.max(0, wave(t, 0.8, ph)), 0.32 * k), lean: 0.06, nod: 0.05, palms: 1.3, gl: 0.08, gr: 0.08 }, 2.6, 0.7],
    [{ l: bo(0.11, 0.93 * H, 0.3 * k), r: bo(-0.11, 0.86 * H, 0.3 * k), lean: 0.06, nod: 0.02, palms: 0.05, gl: 0.55, gr: 0.55 }, 2.8, 0.7],
    [{ l: bo(0.18, 0.5 * H, 0.06 * k), r: bo(-0.06, 0.62 * H, 0.5 * k), lean: 0.08, nod: 0.12, palms: 0.3, gl: 0.3, gr: 0.8 }, 2, 0.8],
    [{ l: bo(0.14, 0.36 * H, 0.3 * k), r: bo(-0.16, 0.42 * H + 0.02 * wave(t, 0.8, ph), 0.36 * k), lean: 0.2, nod: 0.1, palms: -0.3, gl: 0.5, gr: 0.15, crouch: 0.7 }, 3.8, 0.9],
    [{ l: bo(0.05, 0.55 * H, 0.16 * k), r: bo(-0.05, 0.55 * H, 0.16 * k), lean: 0.03, nod: 0.06 + 0.08 * Math.max(0, wave(t, 0.6, ph)) ** 4, palms: 1.1, gl: 0.5, gr: 0.5 }, 2.2, 0.7],
  ];
  return play(steps, t, ph).h;
}

// ---------------------------------------------------------------------------------------------
// The ADR booth.

/** Where the headphones' cups sit on a 1.6 m head, from the feet (scaled with height), as at the singer's booth. */
export const ADR_EAR = { side: 0.1, down: 0.15, ahead: 0.02 };
/**
 * A line voiced to picture (8 s loop): the streamer wipes across the picture, three beeps, and the
 * line spoken on the fourth, the right hand acting it; then a nod listening back, the hand back on the
 * script on the stand. The left presses the headphones' cup to the ear all through. `streamer` 0–1
 * across, `beep` which beep's showing (0 none), `speaking`.
 */
export function adrRound(t: number, ph: number, H: number, script: BarOffset) {
  const k = H / 1.6;
  const u = frac(t / 8 + ph);
  const streamer = u < 0.3 ? u / 0.3 : -1;
  const beep = u > 0.31 && u < 0.34 ? 1 : u > 0.37 && u < 0.4 ? 2 : u > 0.43 && u < 0.46 ? 3 : 0;
  const speaking = u > 0.49 && u < 0.78;
  const l = bo((ADR_EAR.side + 0.04) * k, H - ADR_EAR.down * k, ADR_EAR.ahead * k);
  const act = bo(-0.2 + 0.05 * wave(t, 0.7, ph), 0.68 * H + 0.04 * wave(t, 1.1, ph), 0.3 * k);
  const onScript = boAdd(script, bo(0.02 * wave(t, 0.3, ph), 0.01, -0.03));
  const e = sstep(u, 0.46, 0.52) * (1 - sstep(u, 0.78, 0.84));
  return {
    streamer,
    beep,
    speaking,
    l,
    r: boMix(onScript, act, e),
    lean: 0.04,
    nod: speaking ? -0.04 : u > 0.84 ? 0.08 + 0.08 * Math.max(0, wave(t, 1.2, ph)) ** 4 : -0.02,
    palms: mix(1.1, -0.4, e),
    gl: 0.3,
    gr: mix(0.4, 0.12, e),
  };
}

// ---------------------------------------------------------------------------------------------
// The casting table. Offsets from the near edge's middle (`work`), in the frame of whoever's sat at it.

/** The pile of headshots to go through (to the left), the kept pile (right), the casting sheet before them. */
export const HEADSHOTS = { stack: bo(0.26, 0.01, 0.05), kept: bo(-0.27, 0.01, 0.06), sheet: bo(-0.03, 0.005, 0.1), view: bo(0, 0.24, -0.06) };
/**
 * Going through headshots (10 s): one taken off the pile, held up in both hands and looked at (a
 * tilt of the head), laid on the kept pile, and a note made on the casting sheet. `card` where the
 * one in hand is (null when none), `look` its tilt.
 */
export function headshotRound(t: number, ph: number) {
  const u = frac(t / 10 + ph);
  const S = HEADSHOTS;
  const card = u < 0.1 || u > 0.72 ? null : keyedBo([[0.1, boAdd(S.stack, bo(0, 0.012, 0))], [0.2, S.view], [0.58, S.view], [0.7, boAdd(S.kept, bo(0, 0.015, 0))]], u);
  const pen = boAdd(S.sheet, bo(-0.02 + 0.025 * wave(t, 1.8, ph), 0.012, 0.02 * wave(t, 1.1, ph)));
  let l: BarOffset;
  let r: BarOffset;
  if (card && u > 0.16 && u < 0.6) {
    l = boAdd(card, bo(0.075, -0.06, 0));
    r = boAdd(card, bo(-0.075, -0.06, 0));
  } else if (card) {
    l = boAdd(S.stack, bo(0.02, 0.015, -0.04));
    r = boAdd(card, bo(-0.04, 0.0, -0.04));
  } else {
    l = boAdd(S.stack, bo(0.02, 0.015, -0.04));
    r = u < 0.1 ? boMix(pen, boAdd(S.stack, bo(-0.03, 0.02, -0.03)), sstep(u, 0.0, 0.1)) : pen;
  }
  const looking = u > 0.2 && u < 0.58;
  return { card, look: looking ? 0.15 * Math.sin((u - 0.2) * 14) : 0, l, r, lean: looking ? 0.06 : 0.3, nod: looking ? 0.12 : 0.45, palms: looking ? 0.4 : 1.2, gl: looking ? 0.6 : 0.35, gr: card ? 0.6 : 0.85 };
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a film company motion (activity.ts doing hands these over). */
export function filmDoing(m: FilmMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  // The clock goes by where they're placed (the spot), as the pieces' props do.
  const ph = fmPhase(b.base);
  const from = (p: THREE.Vector3, o: BarOffset) => p.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  const body = (o: BarOffset) => from(b.base, o);
  const reach = (k: { l: BarOffset; r: BarOffset; lean: number; nod: number; palms: number; gl: number; gr: number }, at: (o: BarOffset) => THREE.Vector3 = body) => ({
    l: at(k.l),
    r: at(k.r),
    lean: k.lean,
    nod: k.nod,
    palms: k.palms,
    grip: { l: k.gl, r: k.gr },
  });
  switch (m) {
    case 'fmCamera':
      return { reach: reach(cameraRound(t, ph, H)) };
    case 'fmAction':
      return { reach: reach(actionRound(t, ph, H)) };
    case 'fmSlate':
      return { reach: reach(slateRound(t, ph, H)) };
    case 'fmEdit': {
      const p = work?.point ?? body(bo(0, 0.3, 0.4));
      const k = editRound(t, ph, H);
      const r = from(p, k.r).lerp(body(k.chinAt), k.chinMix);
      return { reach: { ...reach(k, (o) => from(p, o)), r } };
    }
    case 'fmGrade': {
      const p = work?.point ?? body(bo(0, 0.3, 0.4));
      const k = gradeRound(t, ph, H);
      const r = from(p, k.r).lerp(body(k.chinAt), k.chinMix);
      return { reach: { ...reach(k, (o) => from(p, o)), r } };
    }
    case 'fmDailies':
      return { reach: reach(dailiesRound(t, ph, H)) };
    case 'fmPremiere':
      return { reach: reach(premiereRound(t, ph, H)) };
    case 'fmSides':
      return { reach: reach(sidesRound(t, ph, H)) };
    case 'fmCoach': {
      const k = coachRound(t, ph, H);
      return { reach: reach(k), crouch: k.crouch };
    }
    case 'fmAdr': {
      // `work` is the script on the stand.
      const script = work ? toLocal(work.point, b, left, fwd) : bo(-0.22, 1.02, 0.32);
      return { reach: reach(adrRound(t, ph, H, script)) };
    }
    case 'fmHeadshots': {
      const p = work?.point ?? body(bo(0, 0.3, 0.4));
      return { reach: reach(headshotRound(t, ph), (o) => from(p, o)) };
    }
  }
}
/** A world point as an offset in a dweller's frame. */
function toLocal(p: THREE.Vector3, b: BodyAt, left: THREE.Vector3, fwd: THREE.Vector3): BarOffset {
  const d = p.clone().sub(b.base);
  return bo(d.dot(left), d.y, d.dot(fwd));
}
