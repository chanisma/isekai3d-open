import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/** A family farm's work, in fixture metres. Tools are drawn from these exact hands.
 * The clock starts on arrival, so planting always begins with the hoe, and a customer
 * never receives an empty bag just because the global animation clock was halfway round. */
export type FarmMotion = 'fmTend' | 'fmHarvest' | 'fmCover' | 'fmSoil' | 'fmDrive'
  | 'fmPack' | 'fmMeeting' | 'fmSeeds' | 'fmSeasons' | 'fmArrange' | 'fmSell'
  | 'fmDeal' | 'fmTour' | 'fmSow' | 'fmCompost' | 'fmWater' | 'fmDry';
export const FARM_MOTIONS = new Set<string>([
  'fmTend', 'fmHarvest', 'fmCover', 'fmSoil', 'fmDrive', 'fmPack', 'fmMeeting',
  'fmSeeds', 'fmSeasons', 'fmArrange', 'fmSell', 'fmDeal', 'fmTour', 'fmSow',
  'fmCompost', 'fmWater', 'fmDry',
]);
export type V = readonly [number, number, number];
export const v = (p: V) => new THREE.Vector3(...p);
export const mix = THREE.MathUtils.lerp;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const wave = (t: number, hz = 1) => Math.sin(t * hz * Math.PI * 2);
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const between = (a: V, b: V, u: number): V => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
const arc = (a: V, b: V, u: number, lift = 0.08) => add(between(a, b, sm(u)), 0, lift * Math.sin(sm(u) * Math.PI));
type Line = ReadonlyArray<readonly [string, number]>;
export const LINES: Record<FarmMotion, Line> = {
  fmTend: [['hoe', 2.6], ['pull', 1.8], ['hole', 1.8], ['plug', 1.8], ['firm', 1.8], ['liftCan', 1.3], ['water', 3], ['return', 1.5]],
  fmHarvest: [['inspect', 1.7], ['cut', 2.1], ['lift', 1.7], ['basket', 1.7], ['next', 2.1], ['carry', 2.2]],
  fmCover: [['unroll', 2], ['spread', 2.5], ['pegLeft', 2], ['pegRight', 2], ['tie', 2], ['check', 1.7]],
  fmSoil: [['scoop', 2], ['vial', 1.6], ['dose', 1.7], ['shake', 1.7], ['compare', 2.5], ['write', 2.2]],
  fmDrive: [['climb', 2.2], ['start', 1.5], ['lower', 1.4], ['out', 5.5], ['check', 1.5], ['back', 5.5], ['park', 1.5], ['down', 2.2]],
  fmPack: [['box', 1.8], ['grade', 2.2], ['fill', 2.8], ['fold', 1.8], ['tape', 2], ['label', 1.6], ['stack', 2]],
  fmMeeting: [['open', 1.8], ['yield', 2], ['point', 2], ['listen', 2.4], ['agree', 2], ['write', 2.4]],
  fmSeeds: [['packet', 1.8], ['read', 2], ['pour', 2], ['sort', 2.3], ['seal', 1.8], ['shelf', 1.8]],
  fmSeasons: [['open', 1.8], ['spring', 2], ['summer', 2], ['autumn', 2], ['write', 2.2], ['close', 1.6]],
  fmArrange: [['crate', 1.6], ['lift', 1.6], ['face', 2.2], ['price', 1.8], ['wipe', 1.8]],
  fmSell: [['greet', 1.5], ['choose', 1.8], ['weigh', 2.3], ['bag', 2], ['pay', 2], ['give', 2]],
  fmDeal: [['sample', 1.8], ['quality', 2], ['quote', 2.2], ['reply', 2.4], ['sign', 2], ['give', 1.8]],
  fmTour: [['welcome', 1.8], ['map', 2], ['leaf', 2], ['explain', 2.4], ['reply', 2], ['give', 1.8]],
  fmSow: [['soil', 2.2], ['level', 2], ['dibble', 2.2], ['seed', 2.6], ['cover', 2], ['mist', 2.5], ['tag', 1.8]],
  fmCompost: [['lid', 1.6], ['brown', 2], ['green', 2], ['turn', 3], ['probe', 2.3], ['record', 2], ['close', 1.6]],
  fmWater: [['gauge', 1.8], ['valve', 1.8], ['start', 1.5], ['flow', 2.6], ['filter', 2.2], ['stop', 1.5], ['coil', 2.2]],
  fmDry: [['basket', 1.8], ['spread', 2.5], ['turn', 2.5], ['check', 2], ['pick', 2], ['bag', 2], ['date', 1.8]],
};

const clocks = new Map<string, { start: number; last: number }>();
export function farmTime(m: FarmMotion, t: number, origin: THREE.Vector3) {
  const key = `${m}:${origin.x.toFixed(3)}:${origin.z.toFixed(3)}`;
  let clock = clocks.get(key);
  if (!clock || t - clock.last > 15 || t < clock.last - 1e-6) {
    clock = { start: t, last: t }; clocks.set(key, clock);
    if (clocks.size > 256) for (const [k, c] of clocks) if (t - c.last > 30) clocks.delete(k);
  }
  clock.last = t;
  return t - clock.start;
}
export function farmStop(m: FarmMotion, origin: THREE.Vector3) {
  clocks.delete(`${m}:${origin.x.toFixed(3)}:${origin.z.toFixed(3)}`);
}
export interface Beat { key: string; prev: string; i: number; n: number; u: number; elapsed: number }
export function farmBeat(m: FarmMotion, t: number): Beat {
  const line = LINES[m], length = line.reduce((a, b) => a + b[1], 0);
  const n = Math.floor(Math.max(0, t) / length);
  let elapsed = Math.max(0, t) - n * length;
  for (let i = 0; i < line.length; i++) {
    if (elapsed < line[i][1] || i === line.length - 1) return {
      key: line[i][0], prev: line[(i + line.length - 1) % line.length][0], i, n,
      u: elapsed / line[i][1], elapsed,
    };
    elapsed -= line[i][1];
  }
  throw new Error('Empty farm timeline');
}

/** Soil at the front edge is reachable from the furrow, without standing on the mulch. */
export const FIELD = {
  plant: [0, 0.24, 0.16] as V, fruit: [0, 0.47, 0.19] as V,
  tray: [-0.37, 0.26, 0.49] as V, can: [-0.86, 0.37, 0.58] as V,
  basket: [0.68, 0.25, 0.57] as V, page: [-0.33, 0.69, 0.55] as V,
};
export const PACK = {
  box: [0, 1.05, 0.16] as V, crate: [-0.48, 1.03, 0.12] as V,
  tape: [0.52, 1.02, 0.21] as V, label: [0.48, 1.05, -0.09] as V,
  stack: [0.62, 1.06, 0.12] as V, page: [0, 0.94, 0.15] as V,
};
export const SEED = {
  packet: [-0.19, 1.17, 0.0] as V, dish: [0, 0.97, 0.23] as V,
  page: [0, 0.98, 0.20] as V, sorted: [0.26, 1.0, 0.19] as V,
};
export const STAND = {
  produce: [-0.25, 1.02, 0.10] as V, scale: [0.16, 1.04, 0.16] as V,
  bag: [0.13, 1.12, 0.19] as V, till: [0.5, 0.98, 0.15] as V,
  page: [-0.08, 0.97, 0.16] as V, give: [0.0, 1.16, -0.09] as V,
};
export const SOW = { tray: [0, 0.96, 0.65] as V, soil: [-0.48, 1.02, 0.60] as V, spray: [0.54, 1.12, 0.65] as V };
export const WATER = { valve: [-0.32, 1.05, 0.22] as V, button: [-0.58, 0.87, 0.24] as V,
  filter: [0.12, 0.78, 0.27] as V, hose: [0.38, 0.60, 0.32] as V };

export function spotOf(m: FarmMotion): V {
  if (['fmTend', 'fmHarvest', 'fmCover', 'fmSoil'].includes(m)) return [0, 0, 0.70];
  if (m === 'fmDrive') return [-0.72, 0, 0.24];
  if (m === 'fmSow') return [0, 0, 1.12];
  if (m === 'fmSeeds' || m === 'fmSeasons') return [0, 0, 0.60];
  if (m === 'fmWater') return [-0.18, 0, 0.65];
  if (m === 'fmCompost') return [0, 0, 0.68];
  return [0, 0, 0.66];
}

/** The tractor drives in the empty service lane beside the nine beds. It reverses
 * home in its own tracks; rotating a tractor across a planted bed would crush it. */
export function tractorAt(t: number) {
  const b = farmBeat('fmDrive', t), u = sm(b.u);
  const z = b.key === 'out' ? -6 * u : b.key === 'check' ? -6
    : b.key === 'back' ? -6 * (1 - u) : 0;
  const up = b.key === 'climb' ? sm(b.u, 0.12, 0.92) : b.key === 'down' ? 1 - sm(b.u, 0.12, 0.92) : 1;
  const travelling = ['climb', 'down'].includes(b.key);
  const seated = !travelling || up >= 0.35;
  const slide = sm(up, 0.35, 0.94);
  const at: V = !travelling ? [0, 0.82, 0.28 + z]
    : seated ? [mix(-0.66, 0, slide), 0.82 + 0.24 * Math.sin(slide * Math.PI), mix(0.04, 0.28, slide)]
    : [-0.78, 0.28 * up / 0.35, 0.04];
  return { b, z, at, seated, up, engine: b.i >= 1 && b.i <= 6,
    plow: b.key === 'lower' ? u : ['out', 'check', 'back'].includes(b.key) ? 1 : 0 };
}

/** Side steps are eased with the hands. Other positions stay anchored to the fixture. */
export function farmStep(m: FarmMotion, t: number) {
  const b = farmBeat(m, t);
  const position = (key: string, u: number) => {
    if (m === 'fmCover') return key === 'pegLeft' ? -0.85 : key === 'pegRight' ? 0.85 : 0;
    if (m === 'fmPack' && key === 'stack') return 0.28 * sm(u);
    if (m === 'fmArrange' && ['price', 'wipe'].includes(key)) return 0.24;
    return 0;
  };
  return mix(b.i === 0 && b.n === 0 ? 0 : position(b.prev, 1), position(b.key, b.u), sm(b.elapsed, 0, 0.45));
}

export interface Hands {
  l: V; r: V; lean: number; nod: number; palms: number; gl: number; gr: number; crouch: number; tap?: boolean;
}
const hands = (l: V, r: V, h: Partial<Hands> = {}): Hands => ({
  l, r, lean: 0.12, nod: 0.25, palms: 0.7, gl: 0.35, gr: 0.6, crouch: 0, ...h,
});
const two = (p: V, w = 0.13, h: Partial<Hands> = {}) => hands(add(p, -w), add(p, w), { gl: 0.8, gr: 0.8, ...h });
const jot = (p: V, t: number) => add(p, 0.035 * wave(t, 0.8), 0.055 + 0.005 * wave(t, 4), 0.012 * wave(t, 1.4));
const low = { crouch: 1, lean: 0.65, nod: 0.45 };

function tend(key: string, u: number, t: number): Hands {
  const knee: V = [-0.18, 0.53, 0.52];
  switch (key) {
    case 'hoe': return hands(knee, [0.08, 0.42 + 0.10 * Math.max(0, wave(t, 1.25)), 0.32 + 0.07 * wave(t, 1.25)], { ...low, gr: 0.95 });
    case 'pull': return hands(knee, arc([0.15, 0.24, 0.27], [-0.39, 0.39, 0.5], u), { ...low, gr: 0.85 });
    case 'hole': return hands(knee, [0, 0.40 + 0.05 * wave(t, 1.2), 0.21], { ...low, gr: 0.95 });
    case 'plug': return hands(knee, arc(FIELD.tray, add(FIELD.plant, 0, 0.05), u), { ...low, gr: 0.6 });
    case 'firm': return two([0, 0.27 + 0.014 * wave(t, 2), 0.22], 0.07, { ...low, palms: 1.4, gr: 0.1, gl: 0.1 });
    case 'liftCan': return hands(knee, arc(FIELD.can, [0.29, 0.71, 0.36], u), { crouch: 0.7, lean: 0.35, gr: 0.9 });
    case 'water': return hands([-0.16, 0.69, 0.45], [0.29, 0.71, 0.36 + 0.025 * wave(t, 0.6)], { crouch: 0.7, lean: 0.35, gr: 0.9 });
    default: return hands(knee, arc([0.29, 0.71, 0.36], FIELD.can, u), { ...low, gr: 0.8 });
  }
}
function harvest(key: string, u: number, t: number): Hands {
  const p = FIELD.fruit, held: V = [0.04, 0.70, 0.42];
  switch (key) {
    case 'inspect': return hands(add(p, -0.1), add(p, 0.08, 0.03 * wave(t, 0.8)), { ...low, lean: 0.4, gl: 0.2, gr: 0.1 });
    case 'cut': return hands(add(p, -0.035, -0.025), add(p, 0.08, 0.07, 0.03), { ...low, lean: 0.4, gl: 0.7, gr: 0.85 });
    case 'lift': return two(arc(p, held, u), 0.06, { crouch: 0.75, lean: 0.25 });
    case 'basket': return two(arc(held, FIELD.basket, u), 0.06, { ...low, lean: 0.4 });
    case 'next': return hands([-0.17, 0.53, 0.5], arc([0.15, 0.48, 0.13], FIELD.basket, u), { ...low, lean: 0.4 });
    default: return two(arc(add(FIELD.basket, 0, 0.16), [0, 0.88, 0.46], u), 0.19, { crouch: 1 - sm(u), lean: 0.2, gl: 0.9, gr: 0.9 });
  }
}
function cover(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'unroll': return two([0, 0.50 + 0.08 * sm(u), mix(0.38, 0.12, sm(u))], 0.27, { ...low, lean: 0.4 });
    case 'spread': return two([0, 1.25, mix(0.28, 0.10, sm(u))], 0.35, { crouch: 0, lean: 0.3 });
    case 'pegLeft': case 'pegRight': {
      const x = key === 'pegLeft' ? -0.85 : 0.85;
      return hands([x - 0.10, 0.25, 0.29], [x + 0.02, 0.31 + 0.06 * Math.abs(wave(t, 1.6)), 0.28], { ...low, gr: 0.9 });
    }
    case 'tie': return two([0.01, 0.54, 0.25], 0.035 + 0.025 * Math.abs(wave(t, 1.3)), { crouch: 0.9, lean: 0.3 });
    default: return hands([-0.2, 0.95, 0.52], [0.26, 1.0, 0.35], { nod: 0.35, gr: 0.1 });
  }
}
function soil(key: string, u: number, t: number): Hands {
  const vial: V = [-0.05, 0.72, 0.44];
  switch (key) {
    case 'scoop': return hands([-0.18, 0.56, 0.50], arc([0.04, 0.35, 0.24], vial, u), { ...low, lean: 0.45 });
    case 'vial': return hands(vial, add(vial, 0.05, 0.15), { crouch: 0.8, lean: 0.2, gl: 0.9 });
    case 'dose': return hands(vial, add(vial, 0.02, 0.18), { crouch: 0.8, lean: 0.2, gl: 0.9 });
    case 'shake': return hands([-0.2, 0.7, 0.5], add(vial, 0.08, 0.1 + 0.05 * wave(t, 3)), { crouch: 0.8, lean: 0.2, gr: 0.9 });
    case 'compare': return hands([-0.17, 0.83, 0.47], [0.09, 0.86, 0.43], { crouch: 0.7, lean: 0.15, nod: 0.25 });
    default: return hands(add(FIELD.page, -0.08), jot(FIELD.page, t), { crouch: 0.8, lean: 0.35, palms: 1.2 });
  }
}
function drive(key: string, u: number, t: number): Hands {
  const d = tractorAt(t), z = d.z;
  if (key === 'climb' || key === 'down') return hands([-0.38, 1.1, 0.16], [-0.10, 1.13, -0.02], { lean: 0.22, gl: 0.95, gr: 0.95 });
  const wheel: V = [0, 1.17, -0.06 + z];
  if (key === 'start') return hands(add(wheel, -0.12), [0.23, 1.0, -0.01 + z], { gr: 0.9, palms: 0.3 + 0.4 * sm(u) });
  if (key === 'lower' || key === 'park') return hands(add(wheel, -0.12), [0.28, 0.93 - 0.01 * sm(u), 0.13 + 0.08 * sm(u) + z], { nod: 0.35, gr: 0.9 });
  if (key === 'check') return hands(add(wheel, -0.12), [0.25, 1.1, 0.35 + z], { nod: 0.1, lean: -0.05 });
  return hands(add(wheel, -0.115, 0.02 * wave(t, 0.5)), add(wheel, 0.115, -0.02 * wave(t, 0.5)), { palms: 0.1, gl: 0.95, gr: 0.95, nod: key === 'back' ? 0.15 : -0.08 });
}
function pack(key: string, u: number, _t: number): Hands {
  switch (key) {
    case 'box': return two(arc([-0.25, 1.12, 0.14], PACK.box, u), 0.20);
    case 'grade': return two([-0.28, 1.22, 0.30], 0.06, { nod: 0.1, lean: 0.06 });
    case 'fill': return hands([-0.15, 1.09, 0.20], arc(PACK.crate, [0.02, 1.10, 0.16], (u * 3) % 1), { gr: 0.7 });
    case 'fold': return hands([-0.21 * (1 - sm(u)), 1.19, 0.16], [0.21 * (1 - sm(u, 0.25, 0.9)), 1.20, 0.16], { palms: 1.3, gr: 0.1 });
    case 'tape': return hands([-0.12, 1.18, 0.18], [0, 1.23, mix(0.02, 0.32, sm(u))], { gr: 0.9 });
    case 'label': return two([0.06, 1.19, 0.17], 0.075, { palms: 1.4, gr: 0.2 });
    default: return two(arc(PACK.box, PACK.stack, u, 0.14), 0.21, { gl: 0.9, gr: 0.9, lean: 0.2 });
  }
}
function meeting(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'open': return two(PACK.page, 0.16, { palms: 1.2 });
    case 'yield': return hands([-0.16, 0.98, 0.18], [-0.05 + 0.18 * u, 1.0, 0.10], { gr: 0.1, nod: 0.4 });
    case 'point': return hands([-0.18, 1.0, 0.21], [0.20, 1.18, 0.02], { gr: 0.1, nod: 0.05 });
    case 'listen': return hands([-0.2, 1.01, 0.25], [0.2, 1.01, 0.25], { nod: 0.06 + 0.06 * wave(t, 0.7), lean: 0.04 });
    case 'agree': return hands([-0.2, 1.01, 0.25], [0.13, 1.22, 0.17], { gr: 0.1, palms: -0.4, nod: 0.1 });
    default: return hands([-0.15, 0.98, 0.17], jot(PACK.page, t), { palms: 1.2, gr: 0.9, nod: 0.45 });
  }
}
function seeds(m: FarmMotion, key: string, u: number, t: number): Hands {
  if (m === 'fmSeasons') {
    if (key === 'open' || key === 'close') return two(SEED.page, 0.12);
    if (key === 'write') return hands(add(SEED.page, -0.12), jot(SEED.page, t), { palms: 1.2, nod: 0.45 });
    const x = key === 'spring' ? -0.18 : key === 'summer' ? 0 : 0.18;
    return hands([-0.17, 1.02, 0.25], [x, 1.36, 0.04 + 0.015 * wave(t)], { gr: 0.1, nod: 0 });
  }
  switch (key) {
    case 'packet': return hands([-0.17, 1.03, 0.28], arc(SEED.packet, [-0.04, 1.20, 0.32], u));
    case 'read': return two([-0.04, 1.20, 0.32], 0.065, { nod: 0.25 });
    case 'pour': return hands([-0.13, 1.01, 0.26], [0, 1.13, 0.22], { gr: 0.8, palms: 0.3 });
    case 'sort': return hands([-0.12, 1.0, 0.24], arc([0.0, 1.0, 0.22], SEED.sorted, (u * 3) % 1, 0.025), { gr: 0.8, palms: 1.2 });
    case 'seal': return two([0.08, 1.14, 0.28], 0.04, { gr: 0.9, gl: 0.9 });
    default: return hands([-0.15, 1.03, 0.28], arc([0.08, 1.14, 0.28], [0.20, 1.18, 0.0], u));
  }
}
function market(m: FarmMotion, key: string, u: number, t: number): Hands {
  const rest: V = [-0.20, 1.01, 0.30];
  if (m === 'fmArrange') {
    if (key === 'crate') return two([-0.28, 0.54, 0.35], 0.17, { crouch: 0.9, lean: 0.4 });
    if (key === 'lift') return two(arc([-0.28, 0.54, 0.35], [-0.24, 1.0, 0.14], u), 0.17, { crouch: 0.9 * (1 - sm(u)), lean: 0.2 });
    if (key === 'face') return hands(rest, [-0.20 + u * 0.32, 1.06, 0.15], { palms: 1.3 });
    if (key === 'price') return two([0.29, 0.98, 0.31], 0.10);
    return hands(rest, [0.29 + 0.16 * wave(t, 1), 0.94, 0.26], { palms: 1.4, gr: 0.7 });
  }
  if (m === 'fmSell') {
    if (key === 'greet') return hands(rest, [0.20, 1.23, 0.24], { gr: 0.1, palms: -0.3, nod: 0.05 });
    if (key === 'choose') return two(arc(STAND.produce, [0, 1.22, 0.27], u), 0.06);
    if (key === 'weigh') return two(arc([0, 1.22, 0.27], STAND.scale, sm(u, 0, 0.45)), 0.07);
    if (key === 'bag') return hands([0.02, 1.18, 0.17], arc(STAND.scale, STAND.bag, u), { gl: 0.8 });
    if (key === 'pay') return hands(rest, add(STAND.till, 0, 0.035 + 0.01 * wave(t, 4)), { palms: 1.3, tap: true });
    return two(arc(STAND.bag, STAND.give, u), 0.085, { lean: 0.28 });
  }
  if (m === 'fmTour') {
    if (key === 'welcome') return hands(rest, [0.23, 1.23, 0.2], { gr: 0.1, palms: -0.3 });
    if (key === 'map') return hands(rest, [-0.16 + u * 0.22, 1.00, 0.12], { gr: 0.1 });
    if (key === 'leaf') return two([0, 1.23, 0.24], 0.08, { nod: 0.1 });
    if (key === 'explain') return hands([-0.13, 1.23, 0.24], [0.18, 1.27, 0.13], { gr: 0.1, palms: -0.2 });
    if (key === 'reply') return hands(rest, [0.20, 1.05, 0.23], { nod: 0.05 + 0.07 * wave(t, 0.8) });
    return hands(rest, arc([0.12, 1.1, 0.18], [0, 1.05, -0.10], u));
  }
  switch (key) {
    case 'sample': return two([0, 1.19, 0.21], 0.07, { nod: 0.12 });
    case 'quality': return hands(rest, [-0.08, 1.14, 0.08], { gr: 0.1, palms: 1.1 });
    case 'quote': return hands(rest, add(STAND.till, 0, 0.035 + 0.012 * wave(t, 4)), { tap: true, palms: 1.2 });
    case 'reply': return hands(rest, [0.19, 1.17, 0.18], { gr: 0.1, nod: 0.07 * wave(t), palms: -0.3 });
    case 'sign': return hands(add(STAND.page, -0.12), jot(STAND.page, t), { gr: 0.9, palms: 1.2, nod: 0.4 });
    default: return two(arc(STAND.page, [0, 1.01, -0.12], u), 0.12, { lean: 0.3 });
  }
}
function sow(key: string, u: number, t: number): Hands {
  const p = SOW.tray, l = add(p, -0.23, 0.08);
  switch (key) {
    case 'soil': return hands(l, arc(SOW.soil, add(p, 0, 0.20), (u * 2) % 1));
    case 'level': return hands(l, add(p, 0.17 * wave(t, 0.8), 0.045, 0.02), { palms: 1.3 });
    case 'dibble': return hands(l, add(p, -0.15 + Math.floor(u * 4) * 0.1, 0.13 + 0.025 * wave(t, 2), 0), { gr: 0.9 });
    case 'seed': return hands([-0.24, 1.14, 0.70], add(p, -0.15 + Math.floor(u * 4) * 0.1, 0.08, 0.02), { gr: 0.8, palms: 1.2 });
    case 'cover': return hands(l, add(p, 0.18 * wave(t, 0.8), 0.08, 0.01), { gr: 0.4, palms: 1.3 });
    case 'mist': return hands(l, [0.28, 1.20, 0.76], { gr: 0.85 });
    default: return hands(l, arc([0.42, 1.07, 0.70], [0.22, 1.07, 0.56], u));
  }
}
function compost(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'lid': return two([0, 0.91 + 0.40 * sm(u), 0.15 - 0.25 * sm(u)], 0.24);
    case 'brown': return two(arc([-0.35, 0.65, 0.35], [-0.1, 1.08, 0.15], u), 0.13, { crouch: 0.3 * (1 - u) });
    case 'green': return hands([-0.15, 1.07, 0.22], [0.12, 1.08, 0.1], { palms: 1.3 });
    case 'turn': return hands([0.03, 1.12 + 0.06 * wave(t, 0.7), 0.26], [0.05, 0.93 + 0.08 * wave(t, 0.7), 0.23], { gl: 0.9, gr: 0.9, lean: 0.25 });
    case 'probe': return hands([-0.22, 1.04, 0.28], [0.04, 1.10 - 0.12 * sm(u, 0.15, 0.55), 0.18], { gr: 0.9, lean: 0.2 });
    case 'record': return hands([-0.16, 1.05, 0.30], jot([0.08, 1.02, 0.31], t), { nod: 0.4 });
    default: return two([0, 1.31 - 0.4 * sm(u), -0.1 + 0.25 * sm(u)], 0.24);
  }
}
function water(key: string, u: number, t: number): Hands {
  const l: V = [-0.36, 0.98, 0.42];
  switch (key) {
    case 'gauge': return hands(l, [-0.16, 1.21, 0.25], { gr: 0.1, nod: -0.05 });
    case 'valve': return hands(l, add(WATER.valve, 0.06 * Math.sin(u * Math.PI * 3), 0.06 * Math.cos(u * Math.PI * 3)), { gr: 0.95 });
    case 'start': case 'stop': return hands(l, add(WATER.button, 0, 0, 0.015 * wave(t, 2)), { gr: 0.2, tap: true });
    case 'flow': return hands(l, [0.11, 0.88, 0.37], { crouch: 0.15, nod: 0.35, gr: 0.9 });
    case 'filter': return hands([-0.10, 0.83, 0.33], add(WATER.filter, 0, 0.05, 0.04 * Math.sin(u * Math.PI)), { crouch: 0.2, gr: 0.9, palms: 0.4 + 0.3 * wave(t, 1.6) });
    default: return hands([-0.1, 0.90, 0.42], [0.20 + 0.10 * Math.cos(u * Math.PI * 4), 0.86 + 0.10 * Math.sin(u * Math.PI * 4), 0.39], { gr: 0.9 });
  }
}
function dry(key: string, u: number, t: number): Hands {
  const l: V = [-0.22, 0.88, 0.26];
  switch (key) {
    case 'basket': return two([-0.4, 0.97, 0.16], 0.13);
    case 'spread': return hands(l, [-0.18 + 0.36 * u, 0.84, 0.10 + 0.06 * wave(t, 0.8)], { palms: 1.3 });
    case 'turn': return hands(l, [-0.15 + 0.3 * u, 0.86 + 0.025 * Math.abs(wave(t, 1.5)), 0.16], { gr: 0.7 });
    case 'check': return two([0, 1.15, 0.30], 0.065, { nod: 0.1, lean: 0.03 });
    case 'pick': return hands(l, arc([0.1, 0.85, 0.17], [0.40, 1.04, 0.19], u));
    case 'bag': return two([0.38, 1.06, 0.20], 0.04, { gl: 0.95, gr: 0.95 });
    default: return hands([0.21, 0.88, 0.2], jot([0.36, 0.86, 0.21], t), { gr: 0.9, palms: 1.2 });
  }
}

/** All points remain in the fixture frame, including the moving driver's hands. */
export function farmHands(m: FarmMotion, t: number, H = 1.6): Hands {
  const b = farmBeat(m, t);
  const sample = (key: string, u: number): Hands => {
    switch (m) {
      case 'fmTend': return tend(key, u, t);
      case 'fmHarvest': return harvest(key, u, t);
      case 'fmCover': return cover(key, u, t);
      case 'fmSoil': return soil(key, u, t);
      case 'fmDrive': return drive(key, u, t);
      case 'fmPack': return pack(key, u, t);
      case 'fmMeeting': return meeting(key, u, t);
      case 'fmSeeds': case 'fmSeasons': return seeds(m, key, u, t);
      case 'fmArrange': case 'fmSell': case 'fmDeal': case 'fmTour': return market(m, key, u, t);
      case 'fmSow': return sow(key, u, t);
      case 'fmCompost': return compost(key, u, t);
      case 'fmWater': return water(key, u, t);
      default: return dry(key, u, t);
    }
  };
  const p = spotOf(m);
  const a = b.i === 0 && b.n === 0 ? hands([p[0] - 0.2, H * 0.57, p[2] - 0.13], [p[0] + 0.2, H * 0.57, p[2] - 0.13], { lean: 0, nod: 0.1 }) : sample(b.prev, 1);
  const c = sample(b.key, b.u), e = sm(b.elapsed, 0, 0.30);
  return { l: between(a.l, c.l, e), r: between(a.r, c.r, e),
    lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e), palms: mix(a.palms, c.palms, e),
    gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e), crouch: mix(a.crouch, c.crouch, e), tap: c.tap };
}
export function farmDoing(m: FarmMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const yaw = b.yaw - Math.PI, up = new THREE.Vector3(0, 1, 0);
  const origin = work?.point ?? b.base.clone().sub(v(spotOf(m)).applyAxisAngle(up, yaw));
  const h = farmHands(m, farmTime(m, t, origin), b.height);
  const world = (p: V) => v(p).applyAxisAngle(up, yaw).add(origin);
  return { reach: { l: world(h.l), r: world(h.r), lean: h.lean, nod: h.nod,
    palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap }, crouch: h.crouch || undefined };
}
