import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/** Furniture metres, shared by the hands, tools and workpieces. The clock starts on arrival;
 * three identical benches never borrow one another's state. No runtime activity.ts import. */
export type ToyMotion = 'tmCarve' | 'tmPaint' | 'tmSafety' | 'tmSew' | 'tmPlay'
  | 'tmReview' | 'tmWrap' | 'tmRush' | 'tmStock' | 'tmPrice' | 'tmDry'
  | 'tmSaw' | 'tmTune' | 'tmCode' | 'tmDemo' | 'tmOrder';
export const TOY_MOTIONS = new Set<string>([
  'tmCarve', 'tmPaint', 'tmSafety', 'tmSew', 'tmPlay', 'tmReview', 'tmWrap', 'tmRush',
  'tmStock', 'tmPrice', 'tmDry', 'tmSaw', 'tmTune', 'tmCode', 'tmDemo', 'tmOrder',
]);
export type V = readonly [number, number, number];
export const v = (p: V) => new THREE.Vector3(...p);
export const mix = THREE.MathUtils.lerp;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const wave = (t: number, hz = 1) => Math.sin(t * hz * Math.PI * 2);
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const between = (a: V, b: V, u: number): V => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
type Line = ReadonlyArray<readonly [string, number]>;
export const LINES: Record<ToyMotion, Line> = {
  tmCarve: [['clamp', 2], ['saw', 3], ['carve', 3], ['sand', 3], ['axle', 2], ['wheels', 2.5], ['roll', 2.5]],
  tmPaint: [['choose', 2], ['dip', 1.8], ['coat', 3.4], ['turn', 2], ['detail', 3], ['inspect', 2], ['rack', 2]],
  tmSafety: [['open', 2], ['read', 2.5], ['gauge', 2.5], ['pull', 2.5], ['edge', 2], ['tick', 2.5]],
  tmSew: [['pattern', 2], ['cut', 2.5], ['sew', 3.5], ['stuff', 3], ['close', 2.5], ['eyes', 2.5], ['hug', 2]],
  tmPlay: [['wind', 2], ['release', 3], ['train', 3], ['blocks', 2.5], ['drop', 2], ['inspect', 2], ['tick', 2]],
  tmReview: [['read', 2], ['pull', 2.5], ['drop', 2.5], ['inspect', 2], ['show', 2.5], ['reply', 2.5], ['tick', 2]],
  tmWrap: [['paper', 2], ['box', 2], ['fold', 2.5], ['tape', 2], ['ribbon', 2.5], ['tag', 2], ['stack', 2]],
  tmRush: [['scan', 1.5], ['box', 1.6], ['fold', 1.8], ['tape', 1.5], ['label', 1.8], ['scanOut', 1.6], ['stack', 1.6], ['count', 1.6]],
  tmStock: [['crate', 1.2], ['lift', 1.5], ['shelf', 1.8], ['face', 1.5], ['tag', 1.5], ['count', 1.5]],
  tmPrice: [['card', 2], ['cost', 2.5], ['calc', 2.5], ['write', 2.5], ['tag', 2], ['compare', 2]],
  tmDry: [['tray', 2], ['lift', 2], ['turn', 2.5], ['wipe', 2.5], ['stamp', 2], ['return', 2.5]],
  tmSaw: [['pattern', 2], ['guard', 1.5], ['feed', 3.5], ['turn', 3], ['off', 1.5], ['lift', 2], ['check', 2]],
  tmTune: [['open', 2], ['wheel', 2.5], ['driver', 3], ['sensor', 2.5], ['close', 2], ['run', 3], ['tick', 2]],
  tmCode: [['plug', 2], ['type', 3], ['upload', 2.5], ['run', 3], ['stop', 1.5], ['revise', 3], ['pass', 2]],
  // Both also serve the existing 15-second client socials; include the return/receipt.
  tmDemo: [['take', 1.5], ['show', 1.8], ['wind', 2], ['run', 2.5], ['child', 2.5], ['praise', 1.5], ['return', 1.7]],
  tmOrder: [['greet', 1.5], ['choose', 2], ['colour', 2], ['draw', 2.5], ['price', 1.5], ['confirm', 2], ['receipt', 2]],
};
const clocks = new Map<string, { start: number; last: number }>();
export function toyTime(m: ToyMotion, t: number, origin: THREE.Vector3) {
  const key = `${m}:${origin.x.toFixed(3)}:${origin.y.toFixed(3)}:${origin.z.toFixed(3)}`;
  let clock = clocks.get(key);
  // Matrix/animation sampling can repeat a timestamp with floating-point noise.
  if (!clock || t - clock.last > 0.65 || t < clock.last - 1e-6) {
    clock = { start: t, last: t }; clocks.set(key, clock);
    // Bounded even after a long session visiting many rebuilt lots.
    if (clocks.size > 256) for (const [k, c] of clocks) if (t - c.last > 30) clocks.delete(k);
  }
  clock.last = t;
  return t - clock.start;
}
export interface Beat { key: string; prev: string; i: number; n: number; u: number; elapsed: number }
export function toyBeat(m: ToyMotion, t: number): Beat {
  const line = LINES[m], duration = line.reduce((a, b) => a + b[1], 0);
  const n = Math.floor(Math.max(0, t) / duration);
  let elapsed = Math.max(0, t) - n * duration;
  for (let i = 0; i < line.length; i++) {
    if (elapsed < line[i][1] || i === line.length - 1) return {
      key: line[i][0], prev: line[(i + line.length - 1) % line.length][0], i, n,
      u: elapsed / line[i][1], elapsed,
    };
    elapsed -= line[i][1];
  }
  throw new Error('Empty toy timeline');
}

export const BENCH = { toy: [0, 0.99, 0.18] as V, vice: [0, 0.86, 0.46] as V,
  saw: [0.48, 0.99, 0.22] as V, chisel: [0.42, 1.02, 0.12] as V,
  sand: [0.43, 0.97, 0.16] as V, paint: [0.32, 1.02, 0.12] as V,
  rack: [-0.62, 1.04, 0.12] as V, page: [-0.45, 0.95, 0.16] as V };
export const SEW = { cloth: [0, 0.79, 0.16] as V, needle: [-0.18, 0.82, 0.09] as V,
  stuffing: [0.38, 1.05, 0.23] as V, bear: [0.1, 0.92, 0.24] as V };
export const WRAP = { box: [0, 1.03, 0.15] as V, paper: [0, 0.94, 0.05] as V,
  tape: [0.47, 0.97, 0.2] as V, stack: [-0.58, 1.24, 0.14] as V,
  pen: [0.43, 0.99, 0.15] as V, tag: [0.1, 1.17, 0.2] as V };
export const SHOP = { toy: [-0.12, 0.86, 0.48] as V, paper: [0, 0.785, 0.48] as V,
  till: [0.28, 0.88, 0.48] as V, swatch: [-0.28, 0.8, 0.45] as V };
export const ROBOT = { body: [0, 1.03, 0.17] as V, keys: [-0.43, 0.96, 0.15] as V,
  driver: [0.43, 0.98, 0.18] as V, sensor: [0, 1.21, 0.15] as V };
export function spotOf(m: ToyMotion): V {
  if (m === 'tmSew') return [0, 0.46, 0.66];
  if (m === 'tmPlay' || m === 'tmReview') return [0, 0.12, 0.73];
  if (m === 'tmDemo' || m === 'tmOrder') return [0, 0, 0.94];
  if (m === 'tmStock' || m === 'tmPrice') return [0, 0, 0.54];
  if (m === 'tmSafety' || m === 'tmCode') return [-0.2, 0, 0.61];
  return [0, 0, 0.61];
}
/** Small sideways steps keep the far drying tray and dispatch pile inside arm reach. */
export function toyStep(m: ToyMotion, t: number) {
  const b = toyBeat(m, t);
  const at = (key: string, u: number) => m === 'tmPaint' && key === 'rack' ? -0.3 * sm(u)
    : (m === 'tmWrap' || m === 'tmRush') && key === 'stack' ? -0.28 * sm(u)
    : m === 'tmRush' && key === 'count' ? -0.28
    : m === 'tmTune' && key === 'tick' ? -0.2 * sm(u, 0, 0.25) : 0;
  return mix(b.i === 0 && b.n === 0 ? 0 : at(b.prev, 1), at(b.key, b.u), sm(b.elapsed, 0, 0.28));
}
export interface Hands { l: V; r: V; lean: number; nod: number; palms: number; gl: number; gr: number; crouch: number; tap?: boolean }
const hands = (l: V, r: V, h: Partial<Hands> = {}): Hands => ({ l, r, lean: 0.16, nod: 0.35, palms: 0.8, gl: 0.3, gr: 0.3, crouch: 0, ...h });
const two = (p: V, width = 0.12, h: Partial<Hands> = {}) => hands(add(p, -width), add(p, width), { gl: 0.7, gr: 0.7, ...h });
const scribble = (p: V, t: number): V => add(p, 0.035 * wave(t, 0.8), 0.045 + 0.004 * wave(t, 5), 0.015 * wave(t, 1.7));
const rest = (m: ToyMotion, H: number) => {
  const p = spotOf(m), k = H / 1.6, y = p[1] + (p[1] > 0 ? 0.24 : 0.58) * H;
  return hands([p[0] - 0.21 * k, y, p[2] - 0.12], [p[0] + 0.21 * k, y, p[2] - 0.12], { lean: 0.04, nod: 0.1 });
};

/** Wood car: screw the vice, cope the blank, chisel the bonnet, sand, axle, wheels, roll. */
function carve(key: string, u: number, t: number): Hands {
  const p = BENCH.toy;
  const hold = add(p, -0.12, 0.01);
  switch (key) {
    case 'clamp': return hands(hold, add(BENCH.vice, 0.07 * Math.sin(u * Math.PI * 4), 0.06 * Math.cos(u * Math.PI * 4)), { gr: 0.9 });
    case 'saw': return hands(hold, add(p, 0.12, 0.12, 0.12 + 0.09 * wave(t, 1.8)), { gr: 0.95, lean: 0.25 });
    case 'carve': return hands(hold, add(p, 0.04, 0.06, 0.04 + 0.055 * wave(t, 1.2)), { gr: 0.9, lean: 0.28 });
    case 'sand': return hands(hold, add(p, 0.11 * wave(t, 1.1), 0.085, 0.02), { gr: 0.7, lean: 0.24 });
    case 'axle': return two(add(p, 0, 0.01), 0.14, { nod: 0.55 });
    case 'wheels': return hands(hold, add(p, 0.13 - 0.03 * sm(u), -0.02, 0.07 * wave(u, 1)), { gl: 0.7, gr: 0.8 });
    default: return hands([-0.25, 1.08, 0.25], [mix(0.0, 0.42, sm(u)), 1.06, 0.24], { gr: 0.1, lean: 0.13, nod: 0.2 });
  }
}
/** Paint is attached by its ferrule; the tip is 0.11 below the right hand. */
function paint(key: string, u: number, t: number): Hands {
  const p = BENCH.toy;
  switch (key) {
    case 'choose': return hands(add(p, -0.14), [0.32, 1.14, 0.12], { gr: 0.85 });
    case 'dip': return hands(add(p, -0.14), add(BENCH.paint, 0, 0.12 - 0.04 * Math.sin(u * Math.PI)), { gr: 0.9 });
    case 'coat': return hands(add(p, -0.12), add(p, 0.1 * wave(t, 0.75), 0.17, 0.035 * wave(t, 1.5)), { gr: 0.9 });
    case 'turn': return two(add(p, 0, 0.07), 0.13, { palms: 0.4, nod: 0.35 });
    case 'detail': return hands(add(p, -0.12), add(p, 0.04, 0.16 + 0.01 * wave(t, 2), 0.045), { gr: 0.9, lean: 0.28 });
    case 'inspect': return two([0, 1.22, 0.35], 0.13, { lean: 0.02, nod: 0.25 });
    default: return two(between([0, 1.22, 0.35], BENCH.rack, sm(u, 0.1, 0.8)), 0.11, { lean: 0.2 });
  }
}
function safety(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'open': return two(BENCH.page, 0.1);
    case 'read': return hands(add(BENCH.page, -0.1), add(BENCH.page, 0.05, 0.025, -0.07 + 0.15 * u), { nod: 0.55 });
    case 'gauge': return hands([-0.05, 1.07, 0.19], [0.13, 1.05, 0.22], { gl: 0.8, gr: 0.8 });
    case 'pull': return hands([-0.12 - 0.025 * wave(t, 1.2), 1.13, 0.2], [0.14 + 0.025 * wave(t, 1.2), 1.13, 0.2], { gl: 0.9, gr: 0.9 });
    case 'edge': return hands([-0.12, 1.09, 0.22], [0.04 + 0.09 * wave(u, 1), 1.11, 0.22], { gr: 0.1 });
    default: return hands(add(BENCH.page, -0.1), scribble(BENCH.page, t), { gr: 0.9 });
  }
}
function sew(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'pattern': return hands([-0.12, 0.81, 0.2], [0.1 * wave(t, 0.7), 0.82, 0.13], { gr: 0.85 });
    case 'cut': return hands([-0.12, 0.81, 0.16], [0.14, 0.83, mix(0.3, 0.13, u)], { gr: 0.8 });
    case 'sew': return hands([-0.27, 0.84, 0.22 - 0.05 * u], [-0.06, 0.84, 0.24 - 0.05 * u], { palms: 1.3, lean: 0.23 });
    case 'stuff': return hands([0.0, 0.96, 0.25], between(SEW.stuffing, [0.12, 1.02, 0.23], sm((u * 3) % 1, 0.15, 0.65)), { gl: 0.8, gr: 0.6 });
    case 'close': return hands([0.0, 0.99, 0.25], [0.14, 1.01 + 0.12 * Math.abs(wave(t, 0.9)), 0.22], { gr: 0.85 });
    case 'eyes': return hands([0.02, 1.0, 0.24], [0.1 + (u > 0.5 ? 0.045 : -0.025), 1.13, 0.29], { gr: 0.9, nod: 0.2 });
    default: return two([0, 1.08, 0.4], 0.12, { lean: -0.03, nod: 0.1 });
  }
}
export function playCar(key: string, u: number): V {
  // The front lane clears the robot's impact pad at z=.15 throughout the roll.
  return key === 'release' ? [mix(-0.35, 0.48, sm(u)), 0.13, 0.36] : [-0.35, 0.13, 0.36];
}
function play(m: ToyMotion, key: string, u: number, t: number): Hands {
  const l: V = [-0.25, 0.4, 0.48];
  switch (key) {
    case 'wind': return hands([-0.42, 0.22, 0.38], [-0.28, 0.24, 0.38 + 0.04 * wave(t, 1.4)], { gl: 0.75, gr: 0.8, lean: 0.38 });
    case 'release': return hands(l, add(playCar(key, u), 0.08, 0.05, 0.03), { lean: 0.36, gr: 0.1 });
    case 'train': return hands(l, [-0.05, 0.26, 0.4], { lean: 0.42 });
    case 'blocks': return two([0.3, 0.2 + 0.2 * sm(u), 0.38], 0.065, { lean: 0.35 });
    case 'read': return hands([-0.35, 0.4, 0.39], [-0.12, 0.43, 0.39], { nod: 0.5 });
    case 'pull': return hands([-0.12 - 0.04 * wave(t), 0.52, 0.32], [0.12 + 0.04 * wave(t), 0.52, 0.32], { gl: 0.9, gr: 0.9 });
    case 'drop': return two([0.05, u < 0.4 ? 0.61 : 0.58, 0.22], 0.1, { gl: u < 0.4 ? 0.8 : 0.1, gr: u < 0.4 ? 0.8 : 0.1 });
    case 'inspect': return two([0.02, 0.58, 0.32], 0.1, { nod: 0.3 });
    case 'show': return two([0, 0.53, 0.07], 0.12, { lean: 0.28, nod: 0.1 });
    case 'reply': return hands(l, [0.25, 0.6 + 0.025 * wave(t), 0.23], { palms: -0.3, nod: 0.04 });
    default: return hands([-0.32, 0.41, 0.4], scribble([-0.2, 0.42, 0.4], t), { gr: 0.85, nod: m === 'tmReview' ? 0.4 : 0.3 });
  }
}
export function giftAt(key: string, u: number): V {
  if (key === 'box') return between([0.55, 1.1, 0.1], WRAP.box, sm(u, 0.15, 0.8));
  if (key === 'stack') return between(WRAP.box, WRAP.stack, sm(u, 0.1, 0.85));
  return WRAP.box;
}
function wrap(key: string, u: number, t: number): Hands {
  const p = giftAt(key, u);
  switch (key) {
    case 'paper': return hands([-0.2, 0.95, mix(-0.1, 0.27, u)], [0.2, 0.95, mix(-0.1, 0.27, u)], { palms: 1.2 });
    case 'box': case 'stack': return two(p, 0.18, { lean: 0.22 });
    case 'fold': return hands([-0.18 * (1 - sm(u)), 1.08, 0.15], [0.18 * (1 - sm(u, 0.2, 0.8)), 1.13, 0.15], { palms: 1.2 });
    case 'tape': return hands([-0.08, 1.15, 0.17], [0.06, 1.17, mix(0.06, 0.24, u)], { gr: 0.7 });
    case 'ribbon': return hands([-0.06 - 0.03 * wave(t), 1.19, 0.15], [0.06 + 0.03 * wave(t), 1.19, 0.15], { gl: 0.85, gr: 0.85 });
    case 'tag': return hands([-0.12, 1.15, 0.15], scribble(WRAP.tag, t), { gr: 0.9 });
    case 'scan': return hands([-0.18, 1.04, 0.16], [0.25, 1.23, 0.18], { gr: 0.9 });
    case 'label': return two([0, 1.16, 0.15], 0.09, { palms: 1.3 });
    case 'scanOut': return hands([-0.18, 1.04, 0.16], [0.15, 1.25, 0.15], { gr: 0.9 });
    default: return hands([-0.22, 1.0, 0.2], [0.35, 1.08, -0.06], { palms: 1.2, tap: true });
  }
}
export function stockAt(key: string, u: number): V {
  const crate: V = [-0.27, 0.44, 0.22], high: V = [0.12, 1.15, -0.02];
  if (key === 'crate') return crate;
  if (key === 'lift') return between(crate, [0, 1.12, 0.25], sm(u));
  if (key === 'shelf') return between([0, 1.12, 0.25], high, sm(u));
  return high;
}
function stock(m: ToyMotion, key: string, u: number, t: number): Hands {
  if (m === 'tmStock') {
    if (['crate', 'lift', 'shelf'].includes(key)) return two(stockAt(key, u), 0.11, {
      lean: key === 'crate' ? 0.4 : 0.18,
      crouch: key === 'crate' ? 0.95 : key === 'lift' ? 0.95 * (1 - sm(u)) : 0,
    });
    if (key === 'face') return hands([-0.15, 1.16, 0.02], [0.24, 1.16, -0.02 + 0.05 * (1 - sm(u))], { palms: 1.2 });
    if (key === 'tag') return two([0.14, 1.02, 0.1], 0.065);
    return hands([-0.18, 0.95, 0.28], [mix(-0.2, 0.3, u), 1.2, 0.09], { gr: 0.1 });
  }
  switch (key) {
    case 'card': return two([-0.1, 1.05, 0.27], 0.1);
    case 'cost': return hands([-0.18, 1.02, 0.28], [-0.07, 1.05, 0.26 + 0.03 * wave(t)], { nod: 0.5 });
    case 'calc': return hands([-0.18, 1.02, 0.28], [0.26, 0.99 + 0.01 * wave(t, 5), 0.18], { tap: true });
    case 'write': return hands([-0.18, 1.02, 0.28], scribble([-0.04, 1.02, 0.27], t), { gr: 0.85 });
    case 'tag': return two([0.14, 1.02, 0.1], 0.065);
    default: return hands([-0.18, 1.02, 0.28], [0.22, 1.18, 0.12], { palms: -0.2 });
  }
}
export function dryAt(key: string, u: number): V {
  const home: V = [0, 1.09, 0.08], held: V = [0, 1.2, 0.34];
  return key === 'tray' ? home : key === 'lift' ? between(home, held, sm(u)) : key === 'return' ? between(held, home, sm(u)) : held;
}
function dry(key: string, u: number, t: number): Hands {
  const p = dryAt(key, u);
  if (key === 'tray') return two([0, 1.02, 0.24 + 0.12 * sm(u)], 0.22);
  if (key === 'wipe') return hands(add(p, -0.12), add(p, 0.07 * wave(t, 1.2), 0.07), { gr: 0.6 });
  if (key === 'stamp') return hands(add(p, -0.12), [0.36, 1.1 + 0.08 * Math.abs(wave(u, 1)), 0.18], { gr: 0.9 });
  return two(p, 0.12, { nod: 0.2, lean: 0.1 });
}
export function sawBlank(key: string, u: number): V {
  if (key === 'feed') return [0, 0.98, mix(0.29, 0.03, sm(u))];
  if (key === 'turn') return [0.04 * Math.sin(u * Math.PI), 0.98, 0.03];
  if (['off', 'lift', 'check'].includes(key)) return [0, key === 'lift' ? 0.98 + 0.2 * sm(u) : key === 'check' ? 1.18 : 0.98, 0.2];
  return [0, 0.98, 0.29];
}
function saw(key: string, u: number): Hands {
  if (key === 'guard') return hands([-0.15, 1.0, 0.3], [0.16, 1.23 - 0.09 * sm(u), 0.02], { gr: 0.8 });
  if (key === 'off') return hands([-0.15, 1.01, 0.22], [0.4, 0.98, 0.27], { palms: 1.3 });
  return two(add(sawBlank(key, u), 0, 0.045, 0.01), 0.15, { lean: 0.24, nod: 0.5, palms: 1.2 });
}
function robot(m: ToyMotion, key: string, u: number, t: number): Hands {
  const p = ROBOT.body;
  if (m === 'tmCode') {
    if (key === 'plug') return hands(add(p, -0.1), [0.19, 1.04, 0.19], { gr: 0.8 });
    if (key === 'type' || key === 'revise') return hands(add(ROBOT.keys, -0.08, 0.015 * Math.max(0, wave(t, 4))), add(ROBOT.keys, 0.08, 0.015 * Math.max(0, wave(t, 4,))), { palms: 1.3, tap: true, lean: 0.2 });
    if (key === 'upload' || key === 'stop') return hands(add(ROBOT.keys, -0.08), add(ROBOT.keys, 0.12, 0.01), { tap: true });
    if (key === 'pass') return two([0, 1.16, 0.27], 0.14, { lean: 0.04 });
    return hands([-0.2, 1.1, 0.31], [0.2, 1.12, 0.32], { palms: -0.2, nod: 0.1 });
  }
  switch (key) {
    case 'open': return two([0, 1.27 + 0.1 * sm(u), 0.18], 0.1);
    case 'wheel': return hands(add(p, -0.12), add(p, 0.15, -0.035, 0.03 * wave(t, 1)), { gl: 0.8, gr: 0.9 });
    case 'driver': return hands(add(p, -0.12), add(p, 0.1, 0.2, 0.01), { gr: 0.95, palms: 0.4 + 0.35 * wave(t, 1.5) });
    case 'sensor': return hands(add(p, -0.12), add(ROBOT.sensor, 0.0, 0.025, 0.08), { gr: 0.7 });
    case 'close': return two([0, 1.37 - 0.1 * sm(u), 0.18], 0.1);
    case 'run': return hands([-0.2, 1.13, 0.3], [0.23, 1.13, 0.3], { palms: -0.2, nod: 0.1 });
    default: return hands([-0.46, 0.97, 0.13], scribble([-0.38, 0.97, 0.13], t), { gr: 0.85 });
  }
}
export function demoAt(key: string, u: number): V {
  const held: V = [0, 1.12, 0.63];
  if (key === 'take') return between(SHOP.toy, held, sm(u));
  if (key === 'show') return held;
  if (key === 'wind') return between(held, [-0.18, 0.86, 0.47], sm(u, 0, 0.35));
  if (key === 'run') return [mix(-0.18, 0.18, sm(u)), 0.86, 0.47];
  if (key === 'child') return [mix(0.18, -0.18, sm(u, 0.25, 0.9)), 0.86, 0.47];
  if (key === 'return') return between([-0.18, 0.86, 0.47], SHOP.toy, sm(u));
  return [-0.18, 0.86, 0.47];
}
function shop(m: ToyMotion, key: string, u: number, t: number): Hands {
  if (m === 'tmDemo') {
    const p = demoAt(key, u);
    if (key === 'take' || key === 'show' || key === 'return') return two(p, 0.1, { lean: 0.2, nod: 0.1 });
    if (key === 'wind') return hands(add(p, -0.08, 0.04), add(p, 0.08, 0.06, 0.025 * wave(t, 1.5)), { gl: 0.7, gr: 0.8 });
    if (key === 'praise') return hands([-0.2, 1.1, 0.68], [0.2, 1.25, 0.65], { palms: -0.4, nod: 0.1 + 0.05 * wave(t, 1) });
    return hands([-0.26, 0.94, 0.6], [0.26, 0.94, 0.6], { palms: -0.1, nod: 0.12 });
  }
  switch (key) {
    case 'greet': return hands([-0.17, 0.95, 0.74], [0.19, 1.18 + 0.04 * wave(t), 0.63], { palms: -0.2, nod: 0.05 });
    case 'choose': return hands([-0.2, 0.83, 0.6], [-0.1 + 0.12 * u, 0.83, 0.43], { gr: 0.1 });
    case 'colour': return hands(add(SHOP.swatch, 0.07 * u, 0.03), [0.2, 0.83, 0.6], { gl: 0.4 });
    case 'draw': return hands(add(SHOP.paper, -0.12, 0.03), scribble(SHOP.paper, t), { gr: 0.9 });
    case 'price': return hands(add(SHOP.paper, -0.12, 0.03), add(SHOP.till, 0, 0.025 + 0.01 * wave(t, 4)), { tap: true });
    case 'confirm': return two([0, 0.83, mix(0.48, 0.32, sm(u))], 0.11, { lean: 0.3 });
    default: return hands([-0.15, 0.85, 0.6], between([0.25, 0.92, 0.47], [0.07, 0.85, 0.3], sm(u)), { gr: 0.65, lean: 0.3 });
  }
}

/** The same eased hands are used to attach held props; fixed furniture targets never scale with height. */
export function toyHands(m: ToyMotion, t: number, H = 1.6): Hands {
  const b = toyBeat(m, t);
  const sample = (key: string, u: number) => {
    switch (m) {
      case 'tmCarve': return carve(key, u, t);
      case 'tmPaint': return paint(key, u, t);
      case 'tmSafety': return safety(key, u, t);
      case 'tmSew': return sew(key, u, t);
      case 'tmPlay': case 'tmReview': return play(m, key, u, t);
      case 'tmWrap': case 'tmRush': return wrap(key, u, t);
      case 'tmStock': case 'tmPrice': return stock(m, key, u, t);
      case 'tmDry': return dry(key, u, t);
      case 'tmSaw': return saw(key, u);
      case 'tmTune': case 'tmCode': return robot(m, key, u, t);
      case 'tmDemo': case 'tmOrder': return shop(m, key, u, t);
    }
  };
  const a = b.i === 0 && b.n === 0 ? rest(m, H) : sample(b.prev, 1);
  const c = sample(b.key, b.u), e = sm(b.elapsed, 0, 0.28);
  return { l: between(a.l, c.l, e), r: between(a.r, c.r, e),
    lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e), palms: mix(a.palms, c.palms, e),
    gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e), crouch: mix(a.crouch, c.crouch, e), tap: c.tap };
}

/** A real waiting child uses the common `lap` motion. Only the occupied seat of
 * a currently served toy counter opts into these responses; other seats keep lap.
 * Furniture publishes its world frame before avatars update, sharing the worker's
 * beat instead of starting a second clock when the child is drawn first. */
interface ToyClientFrame {
  matrix: THREE.Matrix4; seat: THREE.Vector3; motion: ToyMotion; elapsed: number; updated: number;
}
const clients = new Map<string, ToyClientFrame>();
export function poseToyClient(root: THREE.Object3D, seat: THREE.Object3D, motion: ToyMotion, elapsed: number, t: number) {
  const at = seat.getWorldPosition(new THREE.Vector3());
  const key = at.toArray().map(n => n.toFixed(3)).join(':');
  clients.set(key, { matrix: root.matrixWorld.clone(), seat: at, motion, elapsed, updated: t });
  for (const [k, f] of clients) if (t - f.updated > 1 || t < f.updated) clients.delete(k);
}
export function toyClientAt(m: string, b: BodyAt, t: number): ToyClientFrame | undefined {
  if (m !== 'lap' || !b.sitting) return undefined;
  return [...clients.values()].find(f => Math.abs(t - f.updated) < 0.6 && f.seat.distanceToSquared(b.base) < 0.0025);
}
function clientHands(m: ToyMotion, key: string, u: number, t: number, H: number): Hands {
  const lap = 0.46 + H * 0.16;
  const l: V = [-0.14, lap, 0.16], r: V = [0.14, lap, 0.16];
  if (m === 'tmDemo') {
    if (key === 'show') return hands([-0.14, 0.9, 0.3], [0.14, 0.9, 0.3], { palms: -0.3, nod: -0.08, lean: 0.08 });
    if (key === 'wind') return hands(l, [0.12, 0.9, 0.37], { gr: 0.1, lean: 0.14 });
    if (key === 'run') return hands([-0.18, 0.86, 0.3], [0.18, 0.86, 0.3], { palms: -0.4, nod: 0.25, lean: 0.14 });
    if (key === 'child') return hands([-0.2, 0.82, 0.3], add(demoAt(key, u), 0.03, 0.075), { gr: 0.1, nod: 0.3, lean: 0.22 });
    if (key === 'praise') return two([0, 1.0, 0.29], 0.035 + 0.035 * Math.abs(wave(t, 2)), { palms: 0, gr: 0.1, gl: 0.1, nod: 0.05 + 0.08 * wave(t), lean: 0.05 });
    return hands(l, r, { nod: 0.08, lean: 0.05 });
  }
  switch (key) {
    case 'greet': return hands(l, [0.17, 1.03, 0.3], { palms: -0.4, nod: 0.05, lean: 0.04 });
    case 'choose': return hands(l, [-0.08 + 0.08 * u, 0.82, 0.35], { gr: 0.1, nod: 0.3, lean: 0.15 });
    case 'colour': return hands([-0.27 + 0.06 * u, 0.82, 0.43], r, { gl: 0.1, nod: 0.25, lean: 0.18 });
    case 'draw': return hands([-0.15, 0.81, 0.29], [0.15, 0.81, 0.29], { nod: 0.28 + 0.04 * wave(t), lean: 0.12 });
    case 'price': return hands(l, [0.16, 0.94, 0.32], { palms: -0.5, nod: 0.1, lean: 0.06 });
    case 'confirm': return two([0, 0.84, 0.31], 0.11, { gr: 0.5, gl: 0.5, nod: 0.18 + 0.08 * wave(t), lean: 0.14 });
    default: return hands(l, [0.07, 0.86, 0.3], { gr: 0.55, nod: 0.2, lean: 0.13 });
  }
}
function toyClientDoing(f: ToyClientFrame, b: BodyAt): Doing {
  const beat = toyBeat(f.motion, f.elapsed);
  const a = clientHands(f.motion, beat.prev, 1, f.elapsed, b.height);
  const c = clientHands(f.motion, beat.key, beat.u, f.elapsed, b.height);
  const e = sm(beat.elapsed, 0, 0.28);
  const world = (p: V) => v(p).applyMatrix4(f.matrix);
  return { reach: { l: world(between(a.l, c.l, e)), r: world(between(a.r, c.r, e)),
    lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e), palms: mix(a.palms, c.palms, e),
    grip: { l: mix(a.gl, c.gl, e), r: mix(a.gr, c.gr, e) } } };
}
export function toyDoing(m: ToyMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const client = toyClientAt(m, b, t);
  if (client) return toyClientDoing(client, b);
  const yaw = b.yaw - Math.PI;
  const up = new THREE.Vector3(0, 1, 0);
  const origin = work?.point ?? b.base.clone().sub(v(spotOf(m)).applyAxisAngle(up, yaw));
  const h = toyHands(m, toyTime(m, t, origin), b.height);
  const world = (p: V) => v(p).applyAxisAngle(up, yaw).add(origin);
  return { reach: { l: world(h.l), r: world(h.r), lean: h.lean, nod: h.nod,
    palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap }, crouch: h.crouch || undefined };
}
