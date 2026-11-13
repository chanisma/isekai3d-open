import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * Care work in a 국공립 어린이집 with its own beats (2026-11-02, at the user's request).
 *
 * A nappy change at the changing table, in the order the childcare guidance gives it (hands washed, gloves, the child
 * lifted up and spoken to, the old one into a lidded bin, gloves off, the new one on, dressed, the child back in a safe
 * place, the surface sprayed and wiped, hands washed, the change noted). The child is a small child and is drawn so
 * throughout: dressed in a onesie every frame, no state here undresses them, and a soft towel lies over the lower half
 * for the whole of the work. It reads only through the things and the order. The teacher's hands stay at the towel's
 * near edge and one hand on the child's chest, as a child on a table is never left. No wiping of the child is drawn.
 *
 * Lunch at the serving cart: a 식판 filled (rice, soup with the ladle, side dishes), carried to a child at the low
 * table, the teacher down beside them (골고루 먹자), a mouth wiped; each round the next of two children.
 *
 * One clock for the hands, the child and what's in the hand; workplaces/childcareTeacher.ts draws what it says. Every
 * place is in the piece's frame (x across, y up, z to its front). Moving spots: `at` says where the body stands now.
 */
export type CareMotion = 'ccDiaper' | 'ccTableClean' | 'ccLunch' | 'ccLunchPrep';
export const CARE_MOTIONS = new Set<string>(['ccDiaper', 'ccTableClean', 'ccLunch', 'ccLunchPrep']);

export type P = [number, number, number];
const frac = (x: number) => ((x % 1) + 1) % 1;
const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const wave = (t: number, hz: number, s = 0) => Math.sin((t * hz + s) * Math.PI * 2);

/** The clock's offset, from a fixed mark on the piece. */
export const carePhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

export interface SpotAt {
  x: number;
  z: number;
  yaw: number;
}
/** A point in a stance's own frame (`side` to the dweller's left, `up`, `ahead`), in the piece's. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, up, s.z - side * n + ahead * c];
}
function inSpot(s: SpotAt, p: P): P {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1], dx * n + dz * c];
}
export function shoulderOf(at: SpotAt, sx: number, k: Pick<Key, 'lean' | 'crouch'>): P {
  return sp(at, sx * 0.18, 1.3 - 0.45 * (1 - Math.cos(k.lean)) - 0.37 * k.crouch, 0.45 * Math.sin(k.lean));
}

type Step<K extends string> = { key: K; hold: number; move: number };
const st = <K extends string>(key: K, hold: number, move = 0.5): Step<K> => ({ key, hold, move });
interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  n: number;
}
const roundOf = <K extends string>(steps: Array<Step<K>>) => steps.reduce((n, k) => n + k.hold + k.move, 0);
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = roundOf(steps);
  const c = t / T + phase;
  const n = Math.floor(c);
  let u = frac(c) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold, n };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: ss(Math.min(1, u / k.move)), p: 1, n };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0, n };
}
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
function beatTimesOf<K extends string>(steps: Array<Step<K>>): Array<[string, number]> {
  let u = 0;
  return steps.map((k) => {
    const at: [string, number] = [k.key, u];
    u += k.hold + k.move;
    return at;
  });
}

// =============================================================================================
// The changing table (2 × 1): the padded top, a little basin to its right, a lidded bin on the floor.

export const TB = {
  top: 0.82,
  /** The cabinet's ends and its front and back. */
  left: -0.98,
  right: 0.62,
  front: 0.08,
  back: -0.48,
  /** The pad's top, its middle and size. */
  padY: 0.87,
  padX: -0.5,
  padZ: -0.2,
  padW: 0.94,
  padD: 0.46,
};
/** How big the child is drawn (about 75 cm: the age of nappies), and where their feet come. */
export const CHILD_K = 0.45;
export const FLOOR_FEET: P = [-0.24, 0, 0.22];
export const LAID_FEET: P = [-0.02, TB.padY + 0.058, TB.padZ];
/** The towel: from just past the feet up to the waist, as long and wide as covers them. */
export const TOWEL = { len: 0.44, wide: 0.38, high: 0.125, footX: 0.03 };
export const PLACE = {
  water: [0.12, 0.97, -0.12] as P,
  tap: [0.12, 1.02, -0.17] as P,
  caddy: [0.06, 0.93, -0.33] as P,
  gloves: [0.21, 0.94, -0.33] as P,
  pump: [0.33, 0.98, -0.33] as P,
  spray: [0.46, 0.95, -0.14] as P,
  cloth: [0.46, 0.86, -0.34] as P,
  clip: [0.46, 0.84, -0.03] as P,
  /** The bin's place on the floor, its top, and where a hand lets go over it. */
  bin: [0.36, 0, 0.26] as P,
  binTop: 0.56,
  over: [0.34, 0.76, 0.24] as P,
  /** At the towel's near edge, where the things go to and from. */
  edge: [-0.2, TB.padY + 0.07, TB.padZ + 0.21] as P,
};
export const AT_WORK: SpotAt = { x: -0.06, z: 0.2, yaw: Math.PI };
export const AT_BACK: SpotAt = { x: -0.06, z: 0.5, yaw: Math.PI };

const UP_Q = new THREE.Quaternion();
const LAID_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'));
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const Q = new THREE.Quaternion();
const V = new THREE.Vector3();
/** The child at `e` of the way up to the table: their feet and turn. */
export function childAt(e: number): { feet: P; q: THREE.Quaternion } {
  const feet = add(mixP(FLOOR_FEET, LAID_FEET, e), [0, 0.1 * Math.sin(Math.PI * e), 0.12 * Math.sin(Math.PI * e)]);
  return { feet, q: Q.copy(UP_Q).slerp(LAID_Q, ss(e, 0.35, 1)).clone() };
}
/** A point up the child's body (in their own height, `along`), and off it to their left. */
function onChild(e: number, along: number, off: number, towardTeacher: number): P {
  const { feet, q } = childAt(e);
  V.copy(Y).applyQuaternion(q);
  const up: P = [V.x, V.y, V.z];
  V.copy(X).applyQuaternion(q);
  return [feet[0] + up[0] * along + V.x * off, feet[1] + up[1] * along + V.y * off, feet[2] + up[2] * along + V.z * off + towardTeacher];
}

export type DiaperTool = 'glove' | 'oldNappy' | 'newNappy' | 'spray' | 'cloth' | 'pen';
export interface DiaperNow {
  beat: string;
  key: Key;
  at: SpotAt;
  /** How far up on the table the child is (0 stood by it, 1 lying on the pad). They're always dressed; there is no state otherwise. */
  child: number;
  /** Whether a child's in this scene at all (the table's own cleaning has none). */
  withChild: boolean;
  /** The towel's spread: 0 folded at the foot, 1 over the lower half. */
  towel: number;
  /** The bin's lid (0 shut, 1 open), running water, spray on the air. */
  lid: number;
  water: boolean;
  mist: boolean;
  tool: DiaperTool | null;
  toolAt: P;
  /** The nappy stack's height this moment; a new one in the hand has left it. */
  say?: string;
  /** Looking at the teacher (their head turned). */
  look: number;
  wave: number;
}

export type DiaperKey = 'wash' | 'gloves' | 'greet' | 'lift' | 'towel' | 'talk' | 'old' | 'bin' | 'gloveOff' | 'fresh' | 'fasten' | 'smooth' | 'fold' | 'down' | 'bye' | 'spray' | 'wipe' | 'wash2' | 'note';
const DIAPER: Array<Step<DiaperKey>> = [
  st('wash', 3.0), st('gloves', 1.6), st('greet', 2.4, 0.8), st('lift', 2.2, 0.4), st('towel', 1.6), st('talk', 1.8), st('old', 2.4, 0.3), st('bin', 1.2, 0.3), st('gloveOff', 1.2),
  st('fresh', 2.2, 0.3), st('fasten', 2.6), st('smooth', 2.0), st('fold', 1.2, 0.4), st('down', 2.2, 0.3), st('bye', 1.8, 0.8), st('spray', 1.8), st('wipe', 3.0), st('wash2', 3.0), st('note', 2.2, 0.7),
];
export const DIAPER_ROUND = roundOf(DIAPER);
export const DIAPER_ORDER = DIAPER.map((d) => d.key);
export type CleanKey = 'spray' | 'wipe' | 'fresh2' | 'wash2' | 'note';
const CLEAN: Array<Step<DiaperKey | 'stack'>> = [st('spray', 2.2), st('wipe', 3.4), st('stack', 3.0), st('wash2', 3.0), st('note', 2.4, 0.7)];
export const CLEAN_ROUND = roundOf(CLEAN);

const childOf = (k: DiaperKey | 'stack', p: number): number => {
  switch (k) {
    case 'lift':
      return ss(p, 0.2, 0.9);
    case 'down':
      return 1 - ss(p, 0.1, 0.8);
    case 'towel':
    case 'talk':
    case 'old':
    case 'bin':
    case 'gloveOff':
    case 'fresh':
    case 'fasten':
    case 'smooth':
    case 'fold':
      return 1;
    default:
      return 0;
  }
};
const towelOf = (k: DiaperKey | 'stack', p: number): number => {
  switch (k) {
    case 'towel':
      return ss(p, 0.1, 0.9);
    case 'fold':
      return 1 - ss(p, 0.1, 0.9);
    case 'talk':
    case 'old':
    case 'bin':
    case 'gloveOff':
    case 'fresh':
    case 'fasten':
    case 'smooth':
      return 1;
    default:
      return 0;
  }
};
const backOf = (k: DiaperKey | 'stack', p: number): number => {
  switch (k) {
    case 'greet':
    case 'bye':
      return 1;
    case 'lift':
      return 1 - ss(p, 0.12, 0.65);
    case 'down':
      return ss(p, 0.35, 0.88);
    default:
      return 0;
  }
};

const IDLE_L = (a: SpotAt): P => sp(a, 0.17, 0.98, 0.17);
const IDLE_R = (a: SpotAt): P => sp(a, -0.17, 0.98, 0.17);
/** The left hand on the child's chest (over the onesie): a child on a table isn't left. */
const onChest = (t: number, s: number): P => add(onChild(1, 0.5, 0, 0.06), [0, 0.035 + 0.004 * wave(t, 0.8, s), 0]);
const laidKey = (l: P, r: P, nod = 0.5, gr = 0.45): Key => ({ l, r, lean: 0.4, nod, palms: 1.2, gl: 0.15, gr, crouch: 0.1 });

function diaperKey(k: DiaperKey | 'stack', p: number, t: number, s: number): Key {
  const W = AT_WORK;
  const B = AT_BACK;
  const chest = onChest(t, s);
  const E = PLACE.edge;
  switch (k) {
    case 'wash':
    case 'wash2': {
      const a = t * Math.PI * 2 * 1.3 + s;
      const w = PLACE.water;
      return { l: [w[0] - 0.04 - 0.025 * Math.cos(a), w[1] + 0.02 * Math.sin(a), w[2]], r: [w[0] + 0.04 + 0.025 * Math.cos(a), w[1] - 0.02 * Math.sin(a), w[2]], lean: 0.26, nod: 0.45, palms: 0.4, gl: 0.3, gr: 0.3, crouch: 0 };
    }
    case 'gloves':
      return { l: sp(W, 0.03, 1.04, 0.28), r: mixP(PLACE.gloves, sp(W, -0.03, 1.06, 0.3), ss(p, 0.1, 0.5)), lean: 0.3, nod: 0.45, palms: 0.8, gl: 0.3, gr: 0.5, crouch: 0 };
    case 'greet':
      return { l: onChild(0, 0.45, -0.085, 0.07), r: onChild(0, 0.45, 0.085, 0.07), lean: 0.35, nod: 0.2 + 0.06 * wave(t, 0.7, s), palms: 0.6, gl: 0.3, gr: 0.3, crouch: 1 };
    case 'lift': {
      const e = childOf('lift', p);
      const o = 0.085 * (1 - e);
      const crouch = 1 - 0.9 * ss(p, 0.25, 0.8);
      return { l: onChild(e, 0.45 + 0.05 * e, -o, 0.07), r: onChild(e, mix(0.45, 0.25, e), o, 0.07), lean: mix(0.35, 0.4, e), nod: 0.4, palms: 0.8, gl: 0.45, gr: 0.45, crouch };
    }
    case 'towel':
      return laidKey(chest, [mix(-0.03, -0.19, ss(p, 0.1, 0.9)), E[1] + 0.03, E[2] - 0.02], 0.5, 0.6);
    case 'talk':
      return laidKey(chest, [E[0], E[1] + 0.06, E[2]], 0.34 + 0.05 * wave(t, 0.6, s), 0.1);
    case 'old':
      return { ...laidKey(chest, mixP(E, PLACE.over, ss(p, 0.3, 0.95)), 0.42, 0.6), crouch: 0.1 + 0.2 * ss(p, 0.3, 0.9), lean: mix(0.4, 0.3, ss(p, 0.3, 0.9)) };
    case 'bin':
      return { ...laidKey(chest, PLACE.over, 0.45, 0.2), crouch: 0.3, lean: 0.3 };
    case 'gloveOff':
      return { ...laidKey(chest, add(PLACE.over, [0, 0.02 * wave(t, 1.4, s), 0]), 0.45, 0.6), crouch: 0.3, lean: 0.3 };
    case 'fresh': {
      const a = ss(p, 0, 0.42);
      const c = ss(p, 0.5, 0.95);
      return { ...laidKey(chest, mixP(mixP(PLACE.over, add(PLACE.caddy, [0, 0.03, 0]), a), E, c), 0.42, 0.6), crouch: 0.3 * (1 - a) + 0.1 * a, lean: mix(0.3, 0.42, a) };
    }
    case 'fasten':
      // At the towel's near edge, on top of it; a small press now and then.
      return laidKey(chest, add(E, [0.02 * wave(t, 0.5, s), 0.012 * Math.max(0, wave(t, 1.1, s)), 0]), 0.46, 0.5);
    case 'smooth':
      return laidKey(add(chest, [0.04 * wave(t, 0.8, s), 0, 0]), add(E, [0, 0.06, 0]), 0.45, 0.1);
    case 'fold':
      return laidKey(chest, [mix(-0.19, -0.03, ss(p, 0.1, 0.9)), E[1] + 0.03, E[2] - 0.02], 0.45, 0.6);
    case 'down': {
      const e = childOf('down', p);
      const o = 0.085 * (1 - e);
      const crouch = 0.1 + 0.9 * ss(p, 0.2, 0.75);
      return { l: onChild(e, 0.45 + 0.05 * e, -o, 0.07), r: onChild(e, mix(0.45, 0.25, e), o, 0.07), lean: mix(0.35, 0.4, e), nod: 0.4, palms: 0.8, gl: 0.45, gr: 0.45, crouch };
    }
    case 'bye':
      return { l: IDLE_L(B), r: sp(B, -0.14, 1.28, 0.2), lean: 0.03, nod: 0.12, palms: 0.2, gl: 0.2, gr: 0.1, crouch: 0 };
    case 'spray':
      return { l: IDLE_L(W), r: mixP(PLACE.spray, [-0.1, 1.08, -0.08], ss(p, 0.05, 0.4)), lean: 0.24, nod: 0.45, palms: 0.5, gl: 0.3, gr: 0.75, crouch: 0 };
    case 'wipe': {
      const x = mix(-0.55, -0.06, 0.5 + 0.5 * wave(t, 0.55, s));
      return { l: [x, TB.padY + 0.012, TB.padZ + 0.1 * wave(t, 1.1, s) + 0.06], r: IDLE_R(W), lean: 0.4, nod: 0.5, palms: 1.5, gl: 0.08, gr: 0.3, crouch: 0.05 };
    }
    case 'stack':
      return { l: IDLE_L(W), r: mixP(sp(W, -0.34, 0.9, 0.12), add(PLACE.caddy, [0, 0.03, 0]), 0.5 + 0.5 * wave(p * 3, 1, 0.75)), lean: 0.34, nod: 0.45, palms: 1, gl: 0.3, gr: 0.6, crouch: 0.06 };
    default: {
      // Note: the change on the sheet.
      const c = PLACE.clip;
      return { l: IDLE_L(W), r: [c[0] - 0.03 + 0.04 * wave(t, 1.3, s), c[1] + 0.09, c[2] + 0.015 * wave(t, 0.6, s)], lean: 0.3, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.85, crouch: 0.08 };
    }
  }
}
function diaperTool(k: DiaperKey | 'stack', p: number, r: P, l: P): Pick<DiaperNow, 'tool' | 'toolAt'> {
  const none = { tool: null, toolAt: [0, 0, 0] as P };
  switch (k) {
    case 'gloves':
      return p < 0.8 ? { tool: 'glove', toolAt: r } : none;
    case 'old':
      return p > 0.26 ? { tool: 'oldNappy', toolAt: r } : none;
    case 'bin':
      return p < 0.4 ? { tool: 'oldNappy', toolAt: r } : none;
    case 'gloveOff':
      return p < 0.7 ? { tool: 'glove', toolAt: r } : none;
    case 'fresh':
      return p > 0.42 ? { tool: 'newNappy', toolAt: r } : none;
    case 'fasten':
      // Slid in under the towel's edge straight away; from then on it's only the hands at the edge.
      return p < 0.18 ? { tool: 'newNappy', toolAt: r } : none;
    case 'stack':
      return frac(p * 3) > 0.5 ? { tool: 'newNappy', toolAt: r } : none;
    case 'spray':
      return { tool: 'spray', toolAt: r };
    case 'wipe':
      return { tool: 'cloth', toolAt: l };
    case 'note':
      return { tool: 'pen', toolAt: r };
    default:
      return none;
  }
}
function diaperNow(m: CareMotion, t: number, ph: number): DiaperNow {
  const withChild = m === 'ccDiaper';
  const b = beatOf(withChild ? (DIAPER as Array<Step<DiaperKey | 'stack'>>) : CLEAN, t, ph);
  const s = ph * 7.1;
  const key = blended(b, (x, q) => diaperKey(x, q, t, s));
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const back = valueOf(b, backOf);
  const at: SpotAt = { x: AT_WORK.x, z: mix(AT_WORK.z, AT_BACK.z, withChild ? back : 0), yaw: AT_WORK.yaw };
  const child = valueOf(b, childOf);
  const towel = valueOf(b, towelOf);
  const lid = valueOf(b, (q, u) => (q === 'old' ? ss(u, 0.7, 1) : q === 'bin' ? 1 : q === 'gloveOff' ? 1 - ss(u, 0.75, 1) : 0));
  const tool = b.e > 0 && b.e > 0.5 ? { tool: null, toolAt: [0, 0, 0] as P } : diaperTool(k, p, key.r, key.l);
  const say = !withChild ? undefined : k === 'greet' ? '기저귀 갈러 갈까?' : k === 'talk' ? '시원하게 갈아 줄게' : k === 'bye' ? '다 됐다, 잘했어!' : undefined;
  const look = k === 'talk' || k === 'fasten' || k === 'smooth' || k === 'towel' ? 0.75 : 0.25;
  return {
    beat: k, key, at, withChild, child, towel, lid, ...tool, say, look,
    water: (k === 'wash' || k === 'wash2') && b.e === 0,
    mist: k === 'spray' && p > 0.4,
    wave: k === 'bye' ? 1 : 0,
  };
}

// =============================================================================================
// The serving cart and the low table (3 × 2).

export const LUNCH = {
  cart: { x: -0.95, z: -0.5, w: 1.03, d: 0.5, top: 0.8 },
  table: { x: 0.55, z: 0, w: 1.36, d: 0.66, top: 0.42 },
  seat: 0.24,
  /** On the cart: the tray where it's filled, the stack, the rice, the pot, the side dishes. */
  fill: [-0.92, 0.815, -0.34] as P,
  stack: [-1.17, 0.86, -0.36] as P,
  rice: [-0.98, 0.86, -0.56] as P,
  pot: [-0.72, 0.92, -0.56] as P,
  sides: [-0.5, 0.84, -0.46] as P,
  /** Where each of the two near children's tray goes on the table, their mouth, and the tissues. */
  tray: [[0.05, 0.43, -0.17], [0.05, 0.43, 0.17]] as P[],
  mouth: [[0.05, 0.6, -0.45], [0.05, 0.6, 0.45]] as P[],
  tissue: [-0.05, 0.46, 0] as P,
};
export const AT_CART: SpotAt = { x: -0.92, z: -0.08, yaw: Math.PI };
export const AT_KNEEL: SpotAt = { x: -0.36, z: 0, yaw: Math.PI / 2 };
const midStand = (e: number): SpotAt => ({ x: mix(AT_CART.x, AT_KNEEL.x, e), z: mix(AT_CART.z, AT_KNEEL.z, e), yaw: mix(AT_CART.yaw, AT_KNEEL.yaw, e) });

export type LunchKey = 'take' | 'rice' | 'soup' | 'side' | 'pick' | 'carry' | 'set' | 'urge' | 'wipe' | 'praise' | 'back';
const LUNCH_STEPS: Array<Step<LunchKey>> = [st('take', 1.6), st('rice', 2.2), st('soup', 2.6), st('side', 2.0), st('pick', 1.0, 0.3), st('carry', 2.4, 0.3), st('set', 1.4, 0.5), st('urge', 3.6), st('wipe', 2.6), st('praise', 1.8, 0.6), st('back', 2.0, 0.5)];
export const LUNCH_ROUND = roundOf(LUNCH_STEPS);
const PREP_STEPS: Array<Step<LunchKey>> = [st('take', 1.8), st('rice', 2.4), st('soup', 2.8), st('side', 2.2), st('take', 1.6, 0.7)];
export const PREP_ROUND = roundOf(PREP_STEPS);

export type LunchTool = 'tray' | 'paddle' | 'ladle' | 'tongs' | 'tissue';
export interface LunchNow {
  beat: string;
  key: Key;
  at: SpotAt;
  /** Whose tray this round is (0 the far child, 1 the near). */
  who: number;
  tool: LunchTool | null;
  toolAt: P;
  /** A tilt of the ladle as it pours. */
  tip: number;
  /** The tray on its way, and what's on it. */
  trayAt: P;
  trayYaw: number;
  rice: boolean;
  soup: boolean;
  side: boolean;
  /** The tray's down in front of the child. */
  served: boolean;
  say?: string;
  /** Beside the child: looked at, wiped. */
  tend: number;
  wiping: boolean;
}
const LIFT_Y = 0.98;
const seatedNear = (who: number) => (who === 0 ? 1 : -1);
function lunchWalk(k: LunchKey, p: number): number {
  switch (k) {
    case 'carry':
      return ss(p, 0.05, 0.95);
    case 'back':
      return 1 - ss(p, 0.25, 0.95);
    case 'set':
    case 'urge':
    case 'wipe':
    case 'praise':
      return 1;
    default:
      return 0;
  }
}
const lunchCrouch = (k: LunchKey, p: number) => {
  switch (k) {
    case 'set':
      return ss(p, 0.05, 0.8);
    case 'urge':
    case 'wipe':
    case 'praise':
      return 1;
    case 'back':
      return 1 - ss(p, 0, 0.3);
    default:
      return 0;
  }
};
function lunchKey(k: LunchKey, p: number, t: number, s: number, who: number): Key {
  const at = midStand(lunchWalk(k, p));
  const F = LUNCH.fill;
  const steady: P = add(F, [-0.15, 0.02, 0.02]);
  const near = seatedNear(who);
  const low = { lean: 0.5, nod: 0.3, palms: 0.8, gl: 0.3, gr: 0.3, crouch: 1 };
  const knee = (side: number): P => sp(AT_KNEEL, side * 0.2, 0.42, 0.26);
  switch (k) {
    case 'take':
      return { l: mixP(LUNCH.stack, add(F, [-0.16, 0.02, 0.02]), ss(p, 0.15, 0.8)), r: sp(AT_CART, -0.17, 0.98, 0.14), lean: 0.3, nod: 0.45, palms: 1, gl: 0.6, gr: 0.3, crouch: 0 };
    case 'rice': {
      const down = 0.5 + 0.5 * wave(p * 2, 1, 0.75);
      return { l: steady, r: add(mixP(LUNCH.rice, add(F, [-0.05, 0.05, 0]), down), [0, 0.2, 0]), lean: 0.34, nod: 0.5, palms: 0.5, gl: 0.6, gr: 0.85, crouch: 0.03 };
    }
    case 'soup': {
      const down = ss(p, 0.3, 0.6) * (1 - ss(p, 0.88, 1));
      return { l: steady, r: add(mixP(LUNCH.pot, add(F, [0.09, 0.06, 0.03]), down), [0, 0.2, 0]), lean: 0.34, nod: 0.5, palms: 0.5, gl: 0.6, gr: 0.85, crouch: 0.03 };
    }
    case 'side': {
      const down = 0.5 + 0.5 * wave(p * 2, 1, 0.75);
      return { l: steady, r: add(mixP(LUNCH.sides, add(F, [0.04, 0.05, -0.05]), down), [0, 0.2, 0]), lean: 0.34, nod: 0.5, palms: 0.5, gl: 0.6, gr: 0.85, crouch: 0.03 };
    }
    case 'pick': {
      const tr = trayPlace('pick', p, who);
      return { l: sp(trayAt(tr, AT_CART.yaw), 0.15, tr[1] - 0.012, 0), r: sp(trayAt(tr, AT_CART.yaw), -0.15, tr[1] - 0.012, 0), lean: 0.2, nod: 0.4, palms: 1.1, gl: 0.3, gr: 0.3, crouch: 0 };
    }
    case 'carry': {
      const tr = trayPlace('carry', p, who);
      return { l: sp(trayAt(tr, at.yaw), 0.15, tr[1] - 0.012, 0), r: sp(trayAt(tr, at.yaw), -0.15, tr[1] - 0.012, 0), lean: 0.05, nod: 0.3, palms: 1.1, gl: 0.3, gr: 0.3, crouch: 0 };
    }
    case 'set': {
      const tr = trayPlace('set', p, who);
      const c = lunchCrouch('set', p);
      return { l: sp(trayAt(tr, AT_KNEEL.yaw), 0.15, tr[1] - 0.012, 0), r: sp(trayAt(tr, AT_KNEEL.yaw), -0.15, tr[1] - 0.012, 0), lean: 0.1 + 0.4 * c, nod: 0.4, palms: 1.1, gl: 0.3, gr: 0.3, crouch: c };
    }
    case 'urge': {
      // An open hand towards the side dish on their tray; the other on the knee.
      const T = LUNCH.tray[who];
      const toTray = add(T, [0.02 * wave(t, 0.8, s), 0.07 + 0.012 * wave(t, 1.3, s), 0]);
      return near > 0 ? { ...low, l: toTray, r: knee(-1) } : { ...low, l: knee(1), r: toTray };
    }
    case 'wipe': {
      const M = LUNCH.mouth[who];
      const hand = mixP(LUNCH.tissue, add(M, [-0.045 + 0.012 * wave(t, 2.2, s), 0.005 * wave(t, 3.1, s), near * 0.05]), ss(p, 0.1, 0.4));
      return near > 0 ? { ...low, l: hand, r: knee(-1), gl: 0.6, nod: 0.25 } : { ...low, l: knee(1), r: hand, gr: 0.6, nod: 0.25 };
    }
    case 'praise': {
      const c = 0.035 * Math.abs(wave(t, 2, s));
      return { ...low, lean: 0.25, l: sp(AT_KNEEL, 0.03 + c, 0.86, 0.26), r: sp(AT_KNEEL, -0.03 - c, 0.86, 0.26), palms: 0.05, nod: 0.05, crouch: 0.9 };
    }
    default:
      return { l: sp(at, 0.17, 0.95, 0.14), r: sp(at, -0.17, 0.95, 0.14), lean: 0.08 * (1 - lunchCrouch('back', p)) + 0.4 * lunchCrouch('back', p), nod: 0.12, palms: 0.5, gl: 0.3, gr: 0.3, crouch: lunchCrouch('back', p) };
  }
}
/** A stance centred on the tray, for the two hands at its ends. */
const trayAt = (tr: P, yaw: number): SpotAt => ({ x: tr[0], z: tr[2], yaw });
function trayPlace(k: LunchKey, p: number, who: number): P {
  const F = LUNCH.fill;
  switch (k) {
    case 'pick':
      return mixP(F, sp(AT_CART, 0, LIFT_Y, 0.3), ss(p, 0.2, 1));
    case 'carry': {
      const a = midStand(lunchWalk('carry', p));
      return sp(a, 0, LIFT_Y, 0.3);
    }
    case 'set':
      return mixP(sp(AT_KNEEL, 0, LIFT_Y, 0.3), LUNCH.tray[who], ss(p, 0.05, 0.9));
    default:
      return LUNCH.tray[who];
  }
}
function lunchNow(m: CareMotion, t: number, ph: number): LunchNow {
  const prep = m === 'ccLunchPrep';
  const b = beatOf(prep ? PREP_STEPS : LUNCH_STEPS, t, ph);
  const s = ph * 7.1;
  const who = ((b.n % 2) + 2) % 2;
  const key = blended(b, (x, q) => lunchKey(x, q, t, s, who));
  const k = b.from;
  const p = b.e > 0 ? 1 : b.p;
  const walk = valueOf(b, lunchWalk);
  const at = midStand(walk);
  const order: LunchKey[] = ['take', 'rice', 'soup', 'side', 'pick', 'carry', 'set', 'urge', 'wipe', 'praise', 'back'];
  const i = order.indexOf(k);
  const held = !prep && (k === 'pick' || k === 'carry' || k === 'set');
  let tool: LunchTool | null = null;
  if (k === 'rice') tool = 'paddle';
  if (k === 'soup') tool = 'ladle';
  if (k === 'side') tool = 'tongs';
  if (held) tool = 'tray';
  if (k === 'wipe' && p > 0.1) tool = 'tissue';
  if (b.e > 0.5 && !held) tool = null;
  const near = seatedNear(who);
  const hand = near > 0 ? key.l : key.r;
  const trayNow = !prep && i >= 4 ? trayPlace(k, p, who) : LUNCH.fill;
  const yaw = k === 'set' || i >= 7 ? AT_KNEEL.yaw : k === 'carry' ? at.yaw : AT_CART.yaw;
  return {
    beat: k, key, at, who, tool,
    toolAt: tool === 'tissue' ? hand : tool === 'tray' ? trayNow : key.r,
    tip: k === 'soup' ? 0.8 * ss(p, 0.5, 0.7) * (1 - ss(p, 0.82, 0.92)) : 0,
    trayAt: trayNow,
    trayYaw: yaw,
    rice: i > 1 || (k === 'rice' && p > 0.4),
    soup: i > 2 || (k === 'soup' && p > 0.68),
    side: i > 3 || (k === 'side' && p > 0.5),
    served: k === 'urge' || k === 'wipe' || k === 'praise' || k === 'back' || (k === 'set' && p > 0.9),
    say: k === 'urge' ? '골고루 먹자' : k === 'praise' ? '잘 먹었네!' : undefined,
    tend: k === 'urge' || k === 'wipe' || k === 'praise' ? 1 : 0,
    wiping: k === 'wipe' && p > 0.3,
  };
}

// =============================================================================================

export function careNowDiaper(m: 'ccDiaper' | 'ccTableClean', t: number, ph: number): DiaperNow {
  return diaperNow(m, t, ph);
}
export function careNowLunch(m: 'ccLunch' | 'ccLunchPrep', t: number, ph: number): LunchNow {
  return lunchNow(m, t, ph);
}
/** Seconds into a round where each beat starts (for the lead's shots). */
export function careBeatTimes(m: CareMotion): Array<[string, number]> {
  return m === 'ccDiaper' ? beatTimesOf(DIAPER) : m === 'ccTableClean' ? beatTimesOf(CLEAN) : m === 'ccLunch' ? beatTimesOf(LUNCH_STEPS) : beatTimesOf(PREP_STEPS);
}

export function careDoing(m: CareMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const ph = carePhase(work?.point ?? b.base);
  const { key: k, at } = m === 'ccDiaper' || m === 'ccTableClean' ? diaperNow(m, t, ph) : lunchNow(m, t, ph);
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
