import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * Work at a hospital bed with someone in it (2026-11-02, at the user's request): a blood draw as the
 * 대한진단검사의학회 정맥혈 채혈 표준술기 지침 has it (greeting and two identifiers with the bracelet, hand
 * hygiene, gloves, a tourniquet 7-10 cm above the site, the vein felt, 70% alcohol left to dry, the needle at
 * under 30° with the skin held below the site, tubes in order of draw and each inverted while the other hand
 * keeps the holder still, the tourniquet off before the needle, the last tube off, gauze on and the needle
 * out, the needle straight into a sharps bin within an arm's width, the barcode put on in front of the patient);
 * a dressing changed on a forearm that's been operated on; a turn onto the side; a talk with the family.
 *
 * One clock for the dweller's hands, the patient and what's in the hand: `drNow` says all of it for a moment,
 * and workplaces/doctor.ts draws what it says. Every place is in the bed's frame (x across, y up from the
 * floor, z to the foot, the head at -z), the deck raised. Kept out of activity.ts, which only hands these over.
 */
export type DrMotion = 'drBlood' | 'drDress' | 'drTurn' | 'drTalk' | 'drMake';
export const DR_MOTIONS = new Set<string>(['drBlood', 'drDress', 'drTurn', 'drTalk', 'drMake']);

const frac = (x: number) => ((x % 1) + 1) % 1;
const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
export type P = [number, number, number];
const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: P, k: number): P => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: P) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: P): P => scale(a, 1 / (len(a) || 1));
const pulse = (t: number, hz: number, s = 0) => Math.max(0, Math.sin((t * hz + s) * Math.PI * 2)) ** 4;
const wave = (t: number, hz: number, s = 0) => Math.sin((t * hz + s) * Math.PI * 2);

/** The clock's offset, from a fixed mark on the bed, so two beds aren't in step. */
export const drPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** Where a spot is in the bed, and which way it faces (0 = +z). */
export interface SpotAt {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the floor, `ahead`), in the bed's. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, s.y + up, s.z - side * n + ahead * c];
}
function inSpot(s: SpotAt, p: P): P {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1] - s.y, dx * n + dz * c];
}

type Step<K extends string> = { key: K; hold: number; move: number };
const st = <K extends string>(key: K, hold: number, move = 0.5): Step<K> => ({ key, hold, move });
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = roundOf(steps);
  let u = frac(t / T + phase) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: ss(Math.min(1, u / k.move)), p: 1 };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0 };
}
const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);

/** Hands and bend, the hands in the bed's frame. */
export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
}
function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch, b.crouch, e) };
}
function blended<K extends string>(b: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(b.from, b.e > 0 ? 1 : b.p);
  return b.e > 0 ? mixKey(a, pose(b.to, 0), b.e) : a;
}
function valueOf<K extends string>(b: Beat<K>, v: (k: K, p: number) => number): number {
  return b.e > 0 ? mix(v(b.from, 1), v(b.to, 0), b.e) : v(b.from, b.p);
}

// =============================================================================================
// The bed and the patient.

/** The mattress's top, how far the deck rises for care (to spare the back), the backrest's hinge, how high the body's middle lies over the mattress. */
// The hinge sits far enough from the headboard that the patient's head rests on the pillow, clear of the board (2026-11-04).
export const BED = { top: 0.625, raise: 0.16, hinge: -0.08, lift: 0.105 };
/** The mattress's top with the deck raised. */
export const TOP = BED.top + BED.raise;
/** The backrest as the patient has it, and for a procedure at the arm. */
export const IDLE_BACK = 0.5;
const PROC_BACK = 0.2;

/**
 * A point on the patient (deck raised), the backrest up `a`, rolled `roll` about their length (negative: away
 * from +x): `side` to their left (+x), `along` up the body from the hips (negative: down the legs), `out` out of their front.
 */
export function onBody(a: number, roll: number, side: number, along: number, out: number): P {
  let y0: number;
  let z: number;
  if (along >= 0) {
    y0 = along * Math.sin(a) + out * Math.cos(a);
    z = BED.hinge - along * Math.cos(a) + out * Math.sin(a);
  } else {
    y0 = out;
    z = BED.hinge - along;
  }
  const c = Math.cos(roll);
  const n = Math.sin(roll);
  return [side * c + y0 * n, TOP + BED.lift - side * n + y0 * c, z];
}

const UPPER = 0.27;
const FORE = 0.25;
/** The patient's arm to a hand point: where the shoulder and the elbow are, and the hand as far as it gets. */
export function patientArm(a: number, roll: number, sx: number, to: P): { shoulder: P; elbow: P; hand: P } {
  const shoulder = onBody(a, roll, sx * 0.2, 0.47, 0);
  const d = sub(to, shoulder);
  const L = Math.min(0.5, Math.max(0.05, len(d)));
  const way = norm(d);
  const hand = add(shoulder, scale(way, L));
  const cosA = THREE.MathUtils.clamp((UPPER * UPPER + L * L - FORE * FORE) / (2 * UPPER * L), -1, 1);
  const b0: P = [sx * 0.6, -0.25, 1];
  const dot = b0[0] * way[0] + b0[1] * way[1] + b0[2] * way[2];
  const bend = norm(sub(b0, scale(way, dot)));
  const elbow = add(add(shoulder, scale(way, UPPER * cosA)), scale(bend, UPPER * Math.sqrt(1 - cosA * cosA)));
  return { shoulder, elbow, hand };
}

/** The near arm laid out on its pad for a procedure, and the places on it. */
const OUT_HAND: P = [0.39, 0.875, -0.22];
const ARM = patientArm(PROC_BACK, 0, 1, OUT_HAND);
const toElbow = norm(sub(ARM.shoulder, ARM.elbow));
const toWrist = norm(sub(ARM.hand, ARM.elbow));
export const ARM_OUT = { hand: OUT_HAND, elbow: ARM.elbow, shoulder: ARM.shoulder };
/** The crease of the elbow, on the skin, where the needle goes in. */
export const SITE: P = add(ARM.elbow, [0, 0.03, 0]);
/** The tourniquet's place: 8 cm up the arm from the site (the guideline's 7-10 cm). */
export const TOURNIQUET: P = add(ARM.elbow, scale(toElbow, 0.08));
/** Where the skin's held, below the site. */
const STEADY: P = add(add(SITE, scale(toWrist, 0.07)), [0.03, 0.015, 0]);
/** The needle's way in: up the arm, about 25° down into it. */
export const NEEDLE_WAY: P = norm(add(toElbow, [0, -0.47, 0]));
/** From the grip on the holder to the needle's tip. */
export const NEEDLE_REACH = 0.075;
/** The holder's seat for a tube: along its -y, in its own frame. */
export const TUBE_SEAT: P = [0, -0.085, 0];
/** The wound's place on the forearm: on the skin, half way down it. */
export const WOUND: P = add(mixP(ARM.elbow, ARM.hand, 0.5), [0, 0.034, 0]);
/** The bracelet's place: near the wrist. */
export const BRACELET: P = add(ARM.hand, add(scale(toWrist, -0.05), [0, 0.03, 0]));

/** The over-bed table's top, and where each thing on it is. */
export const TABLE = { x: 0.37, y: 1.035, z: 0.24 };
export const HOME = {
  gloves: [0.27, 1.1, 0.15] as P,
  swab: [0.36, 1.052, 0.13] as P,
  gauze: [0.42, 1.052, 0.14] as P,
  tape: [0.36, 1.07, 0.2] as P,
  holder: [0.3, 1.07, 0.2] as P,
  bin: [0.47, 1.13, 0.13] as P,
  slot: [[0.24, 1.11, 0.3], [0.28, 1.11, 0.3]] as P[],
  bag: [0.5, 1.09, 0.25] as P,
};

/** How the dweller's shoulders stand for a key (see avatar.ts: about 1.3 m up, 0.18 m out, down half a leg at full crouch), for checking reach. */
export function shoulderOf(at: SpotAt, sx: number, k: Pick<Key, 'lean' | 'crouch'>): P {
  const fwd = 0.45 * Math.sin(k.lean);
  const h = 1.3 - 0.45 * (1 - Math.cos(k.lean)) - 0.37 * k.crouch;
  return sp(at, sx * 0.18, h, fwd);
}

/** What's in the hand. */
export type DrTool = 'holder' | 'swab' | 'gauze' | 'tape' | 'glove' | 'oldDressing' | 'labelTube' | 'pillow' | 'chart';

/** Everything about a moment of a motion. */
export interface DrNow {
  beat: string;
  key: Key;
  at: SpotAt;
  /** The backrest, the patient's roll, whether the deck's raised and the near rail's down. */
  back: number;
  roll: number;
  raised: boolean;
  /** The blanket up over the chest (else folded to the waist). */
  chest: boolean;
  /** The near arm's hand; the sleeve pushed up; the arm pad and the table. */
  nearHand: P;
  sleeveUp: boolean;
  pad: boolean;
  table: boolean;
  headTurn: number;
  talk: number;
  /** In the hand: which, where its origin is, and how it's turned (its +y). */
  tool: DrTool | null;
  toolAt: P;
  toolUp: P;
  /** Blood draw: the tourniquet on, the tube in the left hand (bed frame), gauze on the site, a plaster, the tubes filled, the barcode on. */
  tourniquet: boolean;
  tube: { which: 0 | 1; at: P; rock: number; fill: number } | null;
  filled: [boolean, boolean];
  gauzeOn: boolean;
  plaster: boolean;
  labelled: boolean;
  needleInBin: boolean;
  /** Dressing: what's on the forearm. */
  dressing: 'old' | 'none' | 'new';
  taped: boolean;
  /** A turn: the pillow behind the back; a talk: the guardian. */
  pillowIn: boolean;
  guardian: { nod: number; talk: number; hand: boolean } | null;
}
function blank(beat: string, key: Key, at: SpotAt, nearHand: P): DrNow {
  return {
    beat, key, at, nearHand,
    back: IDLE_BACK, roll: 0, raised: true, chest: true, sleeveUp: false, pad: false, table: false, headTurn: 0.2, talk: 0,
    tool: null, toolAt: [0, 0, 0], toolUp: [0, 1, 0],
    tourniquet: false, tube: null, filled: [false, false], gauzeOn: false, plaster: false, labelled: false, needleInBin: false,
    dressing: 'none', taped: false, pillowIn: false, guardian: null,
  };
}
/** Where the near hand rests when nothing's being done with it. */
export const nearRest = (a: number, roll: number): P => onBody(a, roll, 0.24, 0.1, 0.29);
export const farRest = (a: number, roll: number, chest: boolean): P => onBody(a, roll, -0.26, 0.1, chest ? 0.29 : 0.13);

const atArm = (l: P, r: P, nod = 0.55, gl = 0.35, gr = 0.35): Key => ({ l, r, lean: 0.42, nod, palms: 1.1, gl, gr, crouch: 0.32 });

// =============================================================================================
// 환자 채혈하기.

export const DRAW_AT: SpotAt = { x: 0.64, y: 0, z: 0.14, yaw: -Math.PI / 2 - 0.8 };
export type DrawKey = 'greet' | 'band' | 'rub' | 'gloves' | 'tie' | 'feel' | 'swab' | 'dry' | 'needle' | 'fill1' | 'mix' | 'fill2' | 'release' | 'untube' | 'out' | 'sharps' | 'tape' | 'label' | 'done';
const DRAW: Array<Step<DrawKey>> = [
  st('greet', 2.0), st('band', 2.4), st('rub', 1.8), st('gloves', 1.8), st('tie', 2.2), st('feel', 1.4), st('swab', 2.2), st('dry', 1.4), st('needle', 2.0),
  st('fill1', 2.4, 0.3), st('mix', 1.8, 0.3), st('fill2', 3.4, 0.3), st('release', 1.2, 0.3), st('untube', 1.4, 0.3), st('out', 1.8, 0.3), st('sharps', 1.6), st('tape', 1.8), st('label', 2.4), st('done', 1.6, 0.6),
];
export const DRAW_ROUND = roundOf(DRAW);
const SEATED: P = add(add(SITE, scale(NEEDLE_WAY, -NEEDLE_REACH)), scale(NEEDLE_WAY, TUBE_SEAT[1]));
const holderIn = (slide: number): P => add(SITE, scale(NEEDLE_WAY, -NEEDLE_REACH - slide));
const IDLE_L = sp(DRAW_AT, 0.15, 1.02, 0.24);
const IDLE_R = sp(DRAW_AT, -0.13, 1.02, 0.26);
const tubeAside: P = add(SEATED, [0.05, 0.1, 0.07]);

function drawTool(k: DrawKey, p: number): Pick<DrNow, 'tool' | 'toolAt' | 'toolUp'> {
  const none = { tool: null, toolAt: [0, 0, 0] as P, toolUp: [0, 1, 0] as P };
  switch (k) {
    case 'gloves': {
      const up = ss(p, 0.05, 0.5);
      const at = mixP(HOME.gloves, sp(DRAW_AT, -0.02, 1.08, 0.28), up);
      return p < 0.92 ? { tool: 'glove', toolAt: at, toolUp: [0, 1, 0] } : none;
    }
    case 'swab': {
      // From the middle outward (the guideline's rub, by the common circular way of it).
      const r = 0.006 + 0.026 * p;
      const a = p * Math.PI * 7;
      const at = add(SITE, [r * Math.cos(a), 0.008, r * Math.sin(a)]);
      return { tool: 'swab', toolAt: mixP(HOME.swab, at, ss(p, 0, 0.18)), toolUp: [0, 1, 0] };
    }
    case 'needle': {
      const at = holderIn(0.05 * (1 - ss(p, 0.3, 0.75)));
      return { tool: 'holder', toolAt: mixP(HOME.holder, at, ss(p, 0, 0.28)), toolUp: NEEDLE_WAY };
    }
    case 'fill1':
    case 'mix':
    case 'fill2':
    case 'release':
    case 'untube':
      return { tool: 'holder', toolAt: holderIn(0), toolUp: NEEDLE_WAY };
    case 'out':
      return { tool: 'holder', toolAt: holderIn(0.06 * ss(p, 0.3, 0.75)), toolUp: NEEDLE_WAY };
    case 'sharps': {
      const at = mixP(holderIn(0.06), add(HOME.bin, [0, 0.08, 0]), ss(p, 0.05, 0.6));
      return p < 0.8 ? { tool: 'holder', toolAt: at, toolUp: norm(mixP(NEEDLE_WAY, [0, -1, 0], ss(p, 0.3, 0.6))) } : none;
    }
    case 'tape':
      return { tool: 'tape', toolAt: mixP(HOME.tape, add(SITE, [0.0, 0.03, 0]), ss(p, 0.05, 0.5)), toolUp: [0, 1, 0] };
    case 'label':
      return { tool: 'labelTube', toolAt: mixP(HOME.slot[1], sp(DRAW_AT, 0.05, 1.12, 0.3), ss(p, 0, 0.3)), toolUp: [0, 1, 0] };
    case 'done':
      return { tool: 'labelTube', toolAt: mixP(sp(DRAW_AT, 0.05, 1.12, 0.3), HOME.slot[1], ss(p, 0.05, 0.6)), toolUp: [0, 1, 0] };
    default:
      return none;
  }
}
function drawTube(k: DrawKey, p: number, t: number): DrNow['tube'] {
  switch (k) {
    case 'fill1':
      return { which: 0, at: mixP(HOME.slot[0], SEATED, ss(p, 0, 0.3)), rock: 0, fill: ss(p, 0.32, 0.98) };
    case 'mix': {
      const off = ss(p, 0, 0.22);
      return { which: 0, at: mixP(SEATED, tubeAside, off), rock: off * Math.PI * (0.5 + 0.5 * wave(t, 1.1)), fill: 1 };
    }
    case 'fill2':
      if (p < 0.24) return { which: 0, at: mixP(tubeAside, HOME.slot[0], ss(p, 0, 0.22)), rock: 0, fill: 1 };
      return { which: 1, at: mixP(HOME.slot[1], SEATED, ss(p, 0.24, 0.45)), rock: 0, fill: ss(p, 0.46, 0.98) };
    case 'release':
      return { which: 1, at: SEATED, rock: 0, fill: 1 };
    case 'untube':
      // Inverted on the way back to the rack, as every tube is.
      return { which: 1, at: mixP(SEATED, HOME.slot[1], ss(p, 0.05, 0.9)), rock: Math.sin(ss(p, 0.1, 0.9) * Math.PI) * Math.PI * (0.5 + 0.5 * wave(t, 1.1)), fill: 1 };
    default:
      return null;
  }
}
function drawKey(k: DrawKey, p: number, t: number, s: number): Key {
  const tool = drawTool(k, p);
  const r = tool.tool && tool.tool !== 'labelTube' ? tool.toolAt : IDLE_R;
  const tube = drawTube(k, p, t);
  switch (k) {
    case 'greet':
      return { l: IDLE_L, r: IDLE_R, lean: 0.12, nod: 0.2 + 0.1 * pulse(t, 0.6, s), palms: 0.6, gl: 0.3, gr: 0.3, crouch: 0 };
    case 'band':
      // Bracelet read against the order; the arm taken at the wrist.
      return atArm(add(BRACELET, [0.05, 0.04, 0.05]), add(BRACELET, [0.0, 0.03, -0.01]), 0.6 + 0.05 * pulse(t, 0.8, s), 0.3, 0.55);
    case 'rub': {
      const o = 0.025 * wave(t, 1.6, s);
      return { l: sp(DRAW_AT, 0.03, 1.06 + o, 0.3), r: sp(DRAW_AT, -0.03, 1.06 - o, 0.3), lean: 0.08, nod: 0.45, palms: 1.5, gl: 0.2, gr: 0.2, crouch: 0 };
    }
    case 'gloves':
      return { l: sp(DRAW_AT, 0.05, 1.05, 0.3), r, lean: 0.28, nod: 0.45, palms: 0.8, gl: 0.2, gr: 0.5, crouch: 0.18 };
    case 'tie':
      return atArm(add(TOURNIQUET, [0.04, 0.05, 0.04]), add(TOURNIQUET, [0.0, 0.05, -0.04]), 0.55, 0.7, 0.7);
    case 'feel': {
      const o = 0.008 * wave(t, 1.8, s);
      return atArm(STEADY, add(SITE, [0.0, 0.03 + o, 0.0]), 0.62, 0.3, 0.4);
    }
    case 'swab':
      return atArm(STEADY, r, 0.62, 0.3, 0.6);
    case 'dry':
      return { l: IDLE_L, r: IDLE_R, lean: 0.24, nod: 0.5, palms: 0.5, gl: 0.3, gr: 0.3, crouch: 0.15 };
    case 'needle':
      return atArm(STEADY, r, 0.65, 0.4, 0.8);
    case 'fill1':
    case 'mix':
    case 'fill2':
    case 'untube':
      return atArm(tube!.at, r, 0.6, 0.6, 0.8);
    case 'release':
      return atArm(add(TOURNIQUET, [0.03, 0.05, 0.04]), r, 0.6, 0.65, 0.8);
    case 'out':
      return atArm(add(SITE, [0.0, 0.03, 0.0]), r, 0.62, 0.45, 0.8);
    case 'sharps':
      return atArm(add(SITE, [0.0, 0.03, 0.0]), p < 0.8 ? r : IDLE_R, 0.45, 0.45, 0.7);
    case 'tape':
      return atArm(add(SITE, [0.03, 0.04, 0.03]), r, 0.6, 0.4, 0.6);
    case 'label': {
      const T = tool.toolAt;
      return { l: T, r: mixP(IDLE_R, add(T, [0, 0.012 * wave(t, 1.4, s), -0.05]), ss(p, 0.28, 0.5)), lean: 0.14, nod: 0.5, palms: 0.7, gl: 0.6, gr: 0.5, crouch: 0 };
    }
    default:
      return { l: tool.toolAt, r: IDLE_R, lean: 0.14, nod: 0.25 + 0.1 * pulse(t, 0.6, s), palms: 0.6, gl: 0.6, gr: 0.3, crouch: 0 };
  }
}
const DRAW_ORDER: DrawKey[] = DRAW.map((d) => d.key);
const past = (k: DrawKey, than: DrawKey) => DRAW_ORDER.indexOf(k) >= DRAW_ORDER.indexOf(than);
function drawNow(t: number, ph: number): DrNow {
  const b = beatOf(DRAW, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const n = blank(k, blended(b, (x, q) => drawKey(x, q, t, s)), DRAW_AT, past(k, 'band') && !past(k, 'done') ? OUT_HAND : nearRest(PROC_BACK, 0));
  Object.assign(n, drawTool(k, p));
  n.back = PROC_BACK;
  n.chest = false;
  n.sleeveUp = past(k, 'tie');
  n.pad = past(k, 'band') && !past(k, 'done');
  n.table = true;
  n.headTurn = k === 'greet' || k === 'band' || k === 'done' ? 0.5 : -0.25;
  n.talk = k === 'greet' || k === 'band' ? 0.8 : k === 'done' ? 0.5 : 0;
  n.tourniquet = (k === 'tie' && p > 0.45) || (past(k, 'feel') && !past(k, 'untube') && !(k === 'release' && p > 0.5));
  n.tube = drawTube(k, p, t);
  n.filled = [past(k, 'fill2') && !(k === 'fill2' && p < 0.24), past(k, 'out')];
  n.gauzeOn = past(k, 'out') && !(k === 'tape' && p > 0.7) && k !== 'label' && k !== 'done';
  n.plaster = (k === 'tape' && p > 0.7) || k === 'label' || k === 'done';
  n.labelled = (k === 'label' && p > 0.55) || k === 'done';
  n.needleInBin = k === 'sharps' && p >= 0.8;
  return n;
}

// =============================================================================================
// 수술 부위 소독하기: a dressing on a forearm that's been operated on.

export const DRESS_AT: SpotAt = DRAW_AT;
export type DressKey = 'tell' | 'rub' | 'gloves' | 'peel' | 'look' | 'swab' | 'gauze' | 'tape' | 'check';
const DRESS: Array<Step<DressKey>> = [st('tell', 2.0), st('rub', 1.8), st('gloves', 1.6), st('peel', 2.6), st('look', 1.6), st('swab', 3.0), st('gauze', 2.2), st('tape', 2.4), st('check', 1.8, 0.7)];
export const DRESS_ROUND = roundOf(DRESS);
function dressTool(k: DressKey, p: number): Pick<DrNow, 'tool' | 'toolAt' | 'toolUp'> {
  switch (k) {
    case 'gloves':
      return p < 0.92 ? { tool: 'glove', toolAt: mixP(HOME.gloves, sp(DRESS_AT, -0.02, 1.08, 0.28), ss(p, 0.05, 0.5)), toolUp: [0, 1, 0] } : { tool: null, toolAt: [0, 0, 0], toolUp: [0, 1, 0] };
    case 'peel':
      // From a corner, towards the wound, and into the bag on the table.
      return p < 0.88 ? { tool: 'oldDressing', toolAt: mixP(add(WOUND, [0.01, 0.006 + 0.05 * ss(p, 0.1, 0.45), 0]), HOME.bag, ss(p, 0.45, 0.85)), toolUp: [0, 1, 0] } : { tool: null, toolAt: [0, 0, 0], toolUp: [0, 1, 0] };
    case 'swab': {
      const r = 0.006 + 0.03 * p;
      const a = p * Math.PI * 7;
      return { tool: 'swab', toolAt: mixP(HOME.swab, add(WOUND, [r * Math.cos(a), 0.008, r * Math.sin(a)]), ss(p, 0, 0.15)), toolUp: [0, 1, 0] };
    }
    case 'gauze':
      return { tool: 'gauze', toolAt: mixP(HOME.gauze, add(WOUND, [0, 0.008, 0]), ss(p, 0, 0.6)), toolUp: [0, 1, 0] };
    case 'tape':
      return { tool: 'tape', toolAt: mixP(HOME.tape, add(WOUND, [0.0, 0.02, 0.0]), ss(p, 0.05, 0.5)), toolUp: [0, 1, 0] };
    default:
      return { tool: null, toolAt: [0, 0, 0], toolUp: [0, 1, 0] };
  }
}
function dressKey(k: DressKey, p: number, t: number, s: number): Key {
  const tool = dressTool(k, p);
  const steady = add(mixP(ARM.elbow, ARM.hand, 0.2), [0.03, 0.05, 0]);
  const r = tool.tool ? tool.toolAt : IDLE_R;
  switch (k) {
    case 'rub': {
      const o = 0.025 * wave(t, 1.6, s);
      return { l: sp(DRESS_AT, 0.03, 1.06 + o, 0.3), r: sp(DRESS_AT, -0.03, 1.06 - o, 0.3), lean: 0.08, nod: 0.45, palms: 1.5, gl: 0.2, gr: 0.2, crouch: 0 };
    }
    case 'gloves':
      return { l: sp(DRESS_AT, 0.05, 1.05, 0.3), r, lean: 0.28, nod: 0.45, palms: 0.8, gl: 0.2, gr: 0.5, crouch: 0.18 };
    case 'peel':
    case 'swab':
    case 'gauze':
    case 'tape':
      return atArm(steady, r, 0.62, 0.35, 0.6);
    case 'look':
      return atArm(steady, add(WOUND, [0.05, 0.1, 0.06]), 0.68, 0.35, 0.3);
    default:
      return { l: IDLE_L, r: IDLE_R, lean: 0.14, nod: 0.25 + 0.1 * pulse(t, 0.6, s), palms: 0.6, gl: 0.3, gr: 0.3, crouch: 0 };
  }
}
function dressNow(t: number, ph: number): DrNow {
  const b = beatOf(DRESS, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const n = blank(k, blended(b, (x, q) => dressKey(x, q, t, s)), DRESS_AT, OUT_HAND);
  Object.assign(n, dressTool(k, p));
  n.back = PROC_BACK;
  n.chest = false;
  n.sleeveUp = true;
  n.pad = true;
  n.table = true;
  n.headTurn = k === 'tell' || k === 'check' ? 0.5 : -0.2;
  n.talk = k === 'tell' || k === 'check' ? 0.7 : 0;
  const i = DRESS.findIndex((d) => d.key === k);
  n.dressing = i < 3 ? 'old' : k === 'peel' ? (p < 0.1 ? 'old' : 'none') : k === 'look' || k === 'swab' ? 'none' : k === 'gauze' ? (p > 0.6 ? 'new' : 'none') : 'new';
  n.taped = (k === 'tape' && p > 0.6) || k === 'check';
  return n;
}

// =============================================================================================
// 환자 체위 변경하기: flat, explained, rolled away with hands on the shoulder and the hip, a pillow behind.

export const TURN_AT: SpotAt = { x: 0.66, y: 0, z: -0.12, yaw: -Math.PI / 2 };
export type TurnKey = 'tell' | 'fold' | 'arms' | 'hold' | 'roll' | 'pillow' | 'settle' | 'smooth' | 'check' | 'back';
const TURN: Array<Step<TurnKey>> = [st('tell', 2.0), st('fold', 1.6), st('arms', 1.6), st('hold', 1.0, 0.4), st('roll', 2.0, 0.3), st('pillow', 2.4), st('settle', 1.8), st('smooth', 2.4, 0.6), st('check', 2.2, 0.7), st('back', 1.8, 0.7)];
export const TURN_ROUND = roundOf(TURN);
const turnRollOf = (b: Beat<TurnKey>) =>
  valueOf(b, (k, p) => {
    switch (k) {
      case 'roll':
        return -1.1 * ss(p, 0.05, 0.95);
      case 'pillow':
        return -1.1;
      case 'settle':
        return -1.1 + 0.55 * ss(p, 0.1, 0.9);
      case 'smooth':
      case 'check':
        return -0.55;
      case 'back':
        return -0.55 * (1 - ss(p, 0.1, 0.9));
      default:
        return 0;
    }
  });
export const pillowAt = (roll: number): P => onBody(0, roll, 0, 0.26, -0.17);
export const PILLOW_HOME: P = [0.3, TOP + 0.3, 0.06];
function turnKey(k: TurnKey, p: number, t: number, s: number, roll: number): Key {
  const shoulder = onBody(0, roll, 0.16, 0.43, 0.03);
  const hip = onBody(0, roll, 0.17, -0.02, 0.02);
  const base = { lean: 0.42, nod: 0.42, palms: 1.3, gl: 0.3, gr: 0.3, crouch: 0.22 };
  switch (k) {
    case 'tell':
      return { ...base, l: sp(TURN_AT, 0.15, 1.04, 0.24), r: shoulder, lean: 0.3, nod: 0.25 + 0.08 * pulse(t, 0.6, s), crouch: 0.15 };
    case 'fold': {
      const z = -0.46 + 0.26 * ss(p);
      return { ...base, l: [0.2, TOP + 0.26, z + 0.08], r: [0.32, TOP + 0.26, z - 0.08], gl: 0.6, gr: 0.6 };
    }
    case 'arms':
      return { ...base, l: hip, r: add(mixP(nearRest(0, 0), onBody(0, 0, -0.03, 0.37, 0.15), ss(p, 0.1, 0.7)), [0.03, 0.03, 0]), gr: 0.6 };
    case 'pillow':
      return { ...base, l: hip, r: mixP(PILLOW_HOME, add(pillowAt(roll), [0.09, 0.03, 0]), ss(p, 0, 0.55)), gr: 0.5 };
    case 'smooth': {
      const z = 0.02 + 0.1 * wave(t, 0.33, s);
      return { ...base, l: [0.18, TOP + 0.24, z + 0.1], r: [0.3, TOP + 0.24, z - 0.1], palms: 1.5, gl: 0, gr: 0 };
    }
    case 'check':
      return { ...base, l: sp(TURN_AT, 0.15, 1.04, 0.24), r: shoulder, lean: 0.3, nod: 0.25 + 0.06 * pulse(t, 0.5, s), crouch: 0.15 };
    default:
      return { ...base, l: hip, r: shoulder };
  }
}
function turnNow(t: number, ph: number): DrNow {
  const b = beatOf(TURN, t, ph);
  const s = ph * 7.1;
  const roll = turnRollOf(b);
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const crossed = (k === 'arms' && p > 0.5) || k === 'hold' || k === 'roll' || k === 'pillow' || k === 'settle';
  const n = blank(k, blended(b, (x, q) => turnKey(x, q, t, s, roll)), TURN_AT, crossed ? onBody(0, roll, -0.03, 0.37, 0.15) : nearRest(0, roll));
  n.back = 0;
  n.roll = roll;
  n.chest = !((k === 'fold' && p > 0.55) || k === 'arms' || k === 'hold' || k === 'roll' || k === 'pillow' || k === 'settle' || (k === 'smooth' && p < 0.35));
  n.headTurn = k === 'tell' || k === 'check' ? 0.35 : 0.08;
  n.talk = k === 'tell' || k === 'check' ? 0.7 : 0;
  n.pillowIn = (k === 'pillow' && p > 0.55) || k === 'settle' || k === 'smooth' || k === 'check' || (k === 'back' && p < 0.7);
  if (k === 'pillow' && p <= 0.55) {
    n.tool = 'pillow';
    n.toolAt = mixP(PILLOW_HOME, pillowAt(roll), ss(p, 0, 0.55));
  }
  return n;
}

// =============================================================================================
// 보호자에게 설명하기: stood at the bed with the chart, the guardian at the corner of it.

export const TALK_AT: SpotAt = { x: 0.7, y: 0, z: 0.22, yaw: 0.3 };
export const GUARDIAN = { x: 0.96, z: 0.86, yaw: Math.PI + 0.3 };
export type TalkKey = 'show' | 'point' | 'listen' | 'plan';
const TALK: Array<Step<TalkKey>> = [st('show', 4.0, 0.7), st('point', 3.0, 0.7), st('listen', 3.6, 0.7), st('plan', 3.4, 0.8)];
export const TALK_ROUND = roundOf(TALK);
const CHART_AT = sp(TALK_AT, 0.1, 1.08, 0.3);
function talkKey(k: TalkKey, _p: number, t: number, s: number): Key {
  const base = { l: CHART_AT, lean: 0.06, palms: 0.5, gl: 0.6, gr: 0.45, crouch: 0 };
  switch (k) {
    case 'show':
      return { ...base, r: add(CHART_AT, [-0.03 + 0.02 * wave(t, 0.5, s), 0.04, -0.03]), nod: 0.3 + 0.06 * pulse(t, 0.55, s) };
    case 'point':
      // The open hand towards the patient (the bed's on their right), the eyes back to the guardian.
      return { ...base, r: sp(TALK_AT, -0.38, 1.1, 0.1), nod: 0.12 };
    case 'listen':
      return { ...base, r: sp(TALK_AT, -0.14, 1.0, 0.2), nod: 0.1 + 0.14 * pulse(t, 0.45, s) };
    default:
      return { ...base, r: sp(TALK_AT, -0.1 + 0.03 * wave(t, 0.7, s), 1.16, 0.26), nod: 0.14 + 0.05 * pulse(t, 0.6, s) };
  }
}
function talkNow(t: number, ph: number): DrNow {
  const b = beatOf(TALK, t, ph);
  const s = ph * 7.1;
  const k = b.from;
  const n = blank(k, blended(b, (x, q) => talkKey(x, q, t, s)), TALK_AT, nearRest(IDLE_BACK, 0));
  n.raised = false;
  n.tool = 'chart';
  n.toolAt = CHART_AT;
  n.headTurn = 0.45;
  n.talk = k === 'plan' ? 0.15 : 0;
  n.guardian = {
    nod: k === 'listen' ? 0.05 : 0.18 + 0.2 * pulse(t, 0.5, s),
    talk: k === 'listen' ? 1 : 0,
    hand: k === 'listen',
  };
  return n;
}

// =============================================================================================
// 병상 정리하기, with someone in it: the blanket smoothed and tucked round them, the sheet's fold turned straight.

export const MAKE_AT: SpotAt = { x: 0.66, y: 0, z: 0.3, yaw: -Math.PI / 2 };
export type MakeKey = 'ask' | 'smooth' | 'tuck' | 'fold';
const MAKE: Array<Step<MakeKey>> = [st('ask', 2.0, 0.6), st('smooth', 3.6, 0.6), st('tuck', 3.0, 0.6), st('fold', 3.0, 0.7)];
export const MAKE_ROUND = roundOf(MAKE);
function makeKey(k: MakeKey, _p: number, t: number, s: number): Key {
  switch (k) {
    case 'smooth': {
      const z = 0.4 + 0.2 * wave(t, 0.33, s);
      return { l: [0.22, TOP + 0.24, z + 0.14], r: [0.3, TOP + 0.24, z - 0.14], lean: 0.44, nod: 0.5, palms: 1.5, gl: 0, gr: 0, crouch: 0.1 };
    }
    case 'tuck': {
      const z = 0.4 + 0.12 * wave(t, 0.5, s);
      return { l: [0.46, TOP - 0.01, z + 0.14], r: [0.46, TOP - 0.01, z - 0.14], lean: 0.5, nod: 0.55, palms: 1.4, gl: 0.5, gr: 0.5, crouch: 0.3 };
    }
    case 'fold':
      return { l: [0.26, TOP + 0.26, 0.02], r: [0.34, TOP + 0.26, -0.1], lean: 0.44, nod: 0.45, palms: 1.3, gl: 0.7, gr: 0.7, crouch: 0.1 };
    default:
      return { l: sp(MAKE_AT, 0.14, 1.02, 0.24), r: sp(MAKE_AT, -0.12, 1.04, 0.26), lean: 0.14, nod: 0.22 + 0.08 * pulse(t, 0.6, s), palms: 0.6, gl: 0.3, gr: 0.3, crouch: 0 };
  }
}
function makeNow(t: number, ph: number): DrNow {
  const b = beatOf(MAKE, t, ph);
  const s = ph * 7.1;
  const n = blank(b.from, blended(b, (x, q) => makeKey(x, q, t, s)), MAKE_AT, nearRest(IDLE_BACK, 0));
  n.headTurn = b.from === 'ask' ? 0.4 : 0.15;
  n.talk = b.from === 'ask' ? 0.6 : 0;
  return n;
}

// =============================================================================================

export function drNow(m: DrMotion, t: number, ph: number): DrNow {
  switch (m) {
    case 'drBlood':
      return drawNow(t, ph);
    case 'drDress':
      return dressNow(t, ph);
    case 'drTurn':
      return turnNow(t, ph);
    case 'drTalk':
      return talkNow(t, ph);
    default:
      return makeNow(t, ph);
  }
}

/** Seconds into a round where each beat starts (for the lead's shots). */
export function beatTimes(m: DrMotion): Array<[string, number]> {
  const steps = (m === 'drBlood' ? DRAW : m === 'drDress' ? DRESS : m === 'drTurn' ? TURN : m === 'drTalk' ? TALK : MAKE) as Array<Step<string>>;
  let u = 0;
  return steps.map((k) => {
    const at: [string, number] = [k.key, u];
    u += k.hold + k.move;
    return at;
  });
}

export function drDoing(m: DrMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = drNow(m, t, drPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
