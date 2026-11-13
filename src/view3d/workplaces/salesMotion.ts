import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/** One clock per interaction and furniture origin, starting when the worker arrives.
 * Builders consume the same beat and hand coordinates as the avatar. */
export type SalesMotion = 'slCall' | 'slProposal' | 'slShadow' | 'slAccounts'
  | 'slReview' | 'slClose' | 'slStrategy' | 'slSamples'
  | 'slRecord' | 'slPresent' | 'slVisit' | 'slHuddle';
export const SALES_MOTIONS = new Set<string>([
  'slCall', 'slProposal', 'slShadow', 'slAccounts', 'slReview', 'slClose',
  'slStrategy', 'slSamples', 'slRecord', 'slPresent', 'slVisit', 'slHuddle',
]);
export type V = readonly [number, number, number];
export const v = (p: V) => new THREE.Vector3(...p);
export const mix = THREE.MathUtils.lerp;
export const smooth = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const wave = (t: number, hz = 1) => Math.sin(t * hz * Math.PI * 2);
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const between = (a: V, b: V, u: number): V => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
export const LINES: Record<SalesMotion, ReadonlyArray<readonly [string, number]>> = {
  slCall: [['select', 2], ['dial', 2], ['listen', 3], ['offer', 3], ['note', 3], ['agree', 3], ['save', 2]],
  slProposal: [['brief', 2.5], ['type', 3], ['cost', 2.5], ['chart', 2.5], ['proof', 3], ['send', 2]],
  slShadow: [['connect', 2], ['listen', 3], ['note', 3], ['question', 2.5], ['retry', 3], ['return', 1.5], ['check', 2]],
  slAccounts: [['select', 2], ['history', 2.5], ['dial', 2], ['followup', 3], ['schedule', 2.5], ['save', 2]],
  slReview: [['open', 2], ['read', 3], ['compare', 2.5], ['query', 2.5], ['correct', 3], ['file', 2]],
  slClose: [['greet', 2], ['tablet', 3], ['terms', 3], ['sign', 3], ['ink', 1.5], ['stamp', 2], ['shake', 3], ['exchange', 2.5]],
  slStrategy: [['agenda', 2], ['forecast', 3], ['listen', 3], ['allocate', 3], ['decide', 2.5], ['minutes', 2.5]],
  slSamples: [['list', 1.5], ['pick', 2], ['inspect', 2], ['pack', 2], ['card', 2], ['close', 2], ['carry', 2]],
  slRecord: [['receipt', 2], ['enter', 2], ['move', 2.5], ['verify', 2], ['bell', 2.5], ['celebrate', 2.5]],
  slPresent: [['remote', 2], ['intro', 2.5], ['demo', 3], ['benefit', 3], ['question', 3], ['answer', 3], ['finish', 2]],
  slVisit: [['greet', 2], ['give', 2.5], ['receive', 2.5], ['read', 2], ['brochure', 2.5], ['pack', 2.5], ['confirm', 2]],
  slHuddle: [['roll', 2], ['yesterday', 2.5], ['move', 3], ['route', 3], ['listen', 3], ['assign', 2.5], ['cheer', 2]],
};
const clocks = new Map<string, { start: number; last: number }>();
export function salesTime(m: SalesMotion, t: number, origin: THREE.Vector3) {
  const key = `${m}:${origin.x.toFixed(3)}:${origin.y.toFixed(3)}:${origin.z.toFixed(3)}`;
  let c = clocks.get(key);
  if (!c || t - c.last > 0.65 || t < c.last - 1e-6) {
    c = { start: t, last: t }; clocks.set(key, c);
    if (clocks.size > 256) for (const [k, old] of clocks) if (t - old.last > 30) clocks.delete(k);
  }
  c.last = t;
  return t - c.start;
}
export interface Beat { key: string; prev: string; i: number; n: number; u: number; elapsed: number }
export function beat(m: SalesMotion, t: number): Beat {
  const line = LINES[m], duration = line.reduce((a, b) => a + b[1], 0);
  const n = Math.floor(Math.max(0, t) / duration);
  let elapsed = Math.max(0, t) - n * duration;
  for (let i = 0; i < line.length; i++) {
    if (elapsed < line[i][1] || i === line.length - 1) return {
      key: line[i][0], prev: line[(i + line.length - 1) % line.length][0],
      i, n, u: elapsed / line[i][1], elapsed,
    };
    elapsed -= line[i][1];
  }
  throw new Error('Empty sales timeline');
}
export const DESK = {
  keys: [0, 0.79, 0.16] as V,
  phone: [-0.31, 0.82, 0.08] as V,
  paper: [0.28, 0.79, 0.19] as V,
  mouse: [0.29, 0.79, 0.1] as V,
};
export const TABLE = {
  paper: [-0.28, 0.79, 0.16] as V,
  tablet: [0.05, 0.87, 0.0] as V,
  ink: [0.35, 0.81, 0.15] as V,
  seal: [-0.17, 0.79, 0.23] as V,
  shake: [-0.08, 1.0, 0.05] as V,
};
export const SAMPLE = {
  product: [-0.22, 1.13, 0.02] as V,
  tray: [0.0, 0.84, 0.22] as V,
  card: [0.29, 1.13, -0.05] as V,
};
export function spotOf(m: SalesMotion): V {
  if (['slCall', 'slProposal', 'slShadow', 'slAccounts'].includes(m)) return [0, 0.46, 0.64];
  if (['slReview', 'slClose', 'slStrategy'].includes(m)) return [-0.28, 0.46, 0.58];
  if (m === 'slPresent') return [-0.75, 0, 0.48];
  if (m === 'slVisit') return [-0.33, 0, 0.61];
  if (m === 'slRecord' || m === 'slHuddle') return [-0.20, 0, 0.55];
  return [0, 0, 0.57];
}
export interface Hands {
  l: V; r: V; lean: number; nod: number; palms: number;
  gl: number; gr: number; tap?: boolean;
}
const hands = (l: V, r: V, opts: Partial<Hands> = {}): Hands => ({
  l, r, lean: 0.14, nod: 0.2, palms: 0.7, gl: 0.25, gr: 0.25, ...opts,
});
const two = (p: V, width = 0.12, opts: Partial<Hands> = {}) =>
  hands(add(p, -width), add(p, width), { gl: 0.65, gr: 0.65, ...opts });
const write = (p: V, t: number) => add(p, 0.025 * wave(t, 1.3), 0.065, 0.018 * wave(t, 2.3));
/** The same headset travels from the monitor hook into both hands, on to the ears,
 * and back. Its cups, not its headband centre, are the two grip targets. */
export function headsetAt(key: string, u: number, H: number): V {
  const hook: V = [0.245, 1.06, -0.17];
  const head: V = [0, 0.46 + H * 0.42, 0.60];
  if (key === 'connect') return between(hook, head, smooth(u, 0.08, 0.85));
  if (key === 'return') return between(head, hook, smooth(u, 0.08, 0.85));
  return head;
}

function desk(m: SalesMotion, k: string, u: number, t: number, H: number): Hands {
  const lap: V = [-0.17, 0.74, 0.45];
  const ear: V = [-0.105 * H / 1.6, 0.46 + H * 0.36, 0.60];
  const keyL = add(DESK.keys, -0.105, 0.012 + 0.006 * wave(t, 5));
  const keyR = add(DESK.keys, 0.105, 0.012 - 0.006 * wave(t, 5));
  if (m === 'slProposal') {
    switch (k) {
      case 'brief': return two([0.0, 0.99, 0.35], 0.115, { nod: 0.32 });
      case 'type': return hands(keyL, keyR, { palms: 1.4, tap: true, lean: 0.20 });
      case 'cost': return hands(add(DESK.paper, -0.09), [0.30, 0.82, 0.02 + 0.03 * wave(t, 2)], { gr: 0.1 });
      case 'chart': return hands(keyL, DESK.mouse, { gr: 0.4, nod: 0.03 });
      case 'proof': return hands(add(DESK.paper, -0.09), write(DESK.paper, t), { gr: 0.95, nod: 0.38 });
      default: return hands(lap, [0.08, 0.80, 0.12], { gr: 0.1, nod: -0.03 });
    }
  }
  if (m === 'slShadow') {
    const trainingEar = add(ear, 0, H * 0.06);
    switch (k) {
      case 'connect': return two(headsetAt(k, u, H), 0.112, { gl: 0.8, gr: 0.8 });
      case 'return': return two(headsetAt(k, u, H), 0.112, { gl: 0.8, gr: 0.8 });
      case 'listen': return hands(trainingEar, [0.17, 0.88, 0.40], { gl: 0.7, nod: 0.1 + 0.07 * wave(t, 0.8) });
      case 'note': return hands(trainingEar, write(DESK.paper, t), { gl: 0.7, gr: 0.95, lean: 0.19, nod: 0.32 });
      case 'question': return hands(trainingEar, [0.19, 1.02, 0.32], { gl: 0.7, palms: -0.4, nod: -0.08 });
      case 'retry': return hands(trainingEar, [0.20 + 0.03 * wave(t), 1.0, 0.32], { gl: 0.7, palms: -0.3 });
      default: return hands(keyL, keyR, { tap: true, palms: 1.3 });
    }
  }
  switch (k) {
    case 'select': return hands(lap, DESK.mouse, { nod: 0.02 });
    case 'history': return hands(keyL, [0.13, 0.84, 0.12 + 0.03 * u], { nod: 0.12 });
    case 'dial': return hands(between(DESK.phone, ear, smooth(u, 0.1, 0.8)), [-0.25, 0.83, 0.08], { gl: 0.85, gr: 0.1 });
    case 'listen': return hands(ear, [0.18, 0.81, 0.28], { gl: 0.8, nod: 0.06 + 0.04 * wave(t) });
    case 'offer': return hands(ear, [0.21, 1.02 + 0.02 * wave(t), 0.30], { gl: 0.8, palms: -0.3, lean: 0.08 });
    case 'followup': return hands(ear, [0.24, 0.94, 0.24], { gl: 0.8, palms: -0.2, nod: 0.08 });
    case 'note': return hands(ear, write(DESK.paper, t), { gl: 0.8, gr: 0.95, nod: 0.32 });
    case 'schedule': return hands(keyL, keyR, { palms: 1.35, tap: true });
    case 'agree': return hands(ear, [0.16, 1.12, 0.37], { gl: 0.8, gr: 0.65, nod: -0.07, lean: -0.03 });
    default: return hands(keyL, keyR, { palms: 1.35, tap: true, nod: 0.07 });
  }
}
function contract(m: SalesMotion, k: string, u: number, t: number): Hands {
  const left: V = [-0.48, 0.81, 0.23];
  const right: V = [-0.10, 0.83, 0.23];
  if (m === 'slReview') {
    switch (k) {
      case 'open': return hands(left, [-0.15 - 0.22 * smooth(u), 0.83, 0.07], { gr: 0.6 });
      case 'read': return two([-0.25, 1.03, 0.32], 0.12, { nod: 0.32 });
      case 'compare': return hands(left, [-0.05, 0.91, 0.02 + 0.04 * wave(t, 0.5)], { gr: 0.1 });
      case 'query': return hands(left, [-0.02, 1.05, 0.23], { palms: -0.5, nod: -0.02 });
      case 'correct': return hands(left, write(TABLE.paper, t), { gr: 0.95, nod: 0.4 });
      default: return two([-0.20 + 0.30 * smooth(u), 0.81, 0.16], 0.12);
    }
  }
  if (m === 'slStrategy') {
    switch (k) {
      case 'agenda': return hands(left, write(TABLE.paper, t), { gr: 0.9 });
      case 'forecast': return hands(left, [-0.03, 0.94, -0.02 + 0.08 * u], { gr: 0.1, lean: 0.22 });
      case 'listen': return hands(left, right, { lean: 0.04, nod: 0.04 + 0.07 * wave(t, 0.7) });
      case 'allocate': return hands(left, [-0.32 + 0.35 * smooth(u), 0.83, 0.08], { gr: 0.7 });
      case 'decide': return hands(left, [-0.07, 1.07, 0.19], { palms: -0.4, nod: -0.06 });
      default: return hands(left, write(TABLE.paper, t), { gr: 0.95, nod: 0.35 });
    }
  }
  switch (k) {
    case 'greet': return hands(left, [-0.04, 1.07, 0.25], { palms: -0.4, lean: 0.05 });
    case 'tablet': return two([-0.20, 0.96, 0.28], 0.14, { palms: 0.25, nod: 0.12 });
    case 'terms': return hands(left, [-0.02, 0.91, 0.03], { gr: 0.1, lean: 0.22 });
    case 'sign': return hands(left, write(TABLE.paper, t), { gr: 0.95, nod: 0.38 });
    case 'ink': return hands(left, add(TABLE.ink, 0, 0.08 - 0.03 * Math.sin(u * Math.PI)), { gr: 0.95 });
    case 'stamp': return hands(left, add(TABLE.seal, 0, 0.075 + 0.13 * (1 - smooth(u, 0.05, 0.45)) + 0.06 * smooth(u, 0.65, 1)), { gr: 0.95, nod: 0.3 });
    case 'shake': return hands(left, add(TABLE.shake, 0, 0.018 * wave(t, 1.8)), { gr: 0.7, lean: 0.24, nod: -0.05 });
    default: {
      const push = between([-0.28, 0.83, 0.20], [-0.13, 0.83, 0.02], smooth(u, 0, 0.55));
      const release = between(push, [-0.28, 0.85, 0.25], smooth(u, 0.55, 0.90));
      return two(release, 0.13, { lean: 0.24, nod: 0.10, gl: 0.15, gr: 0.15 });
    }
  }
}
function samples(k: string, u: number, _t: number): Hands {
  const left: V = [-0.18, 0.98, 0.31];
  switch (k) {
    case 'list': return hands(left, [0.23, 1.15, -0.02], { gr: 0.1 });
    case 'pick': return hands(left, between(SAMPLE.product, [0.13, 1.20, 0.24], smooth(u)), { gr: 0.8, lean: 0.16 });
    case 'inspect': return two([0, 1.27, 0.24], 0.09, { nod: 0.10, lean: 0.02 });
    case 'pack': return hands(left, between([0.10, 1.20, 0.24], [0.09, 0.95, 0.24], smooth(u)), { gr: 0.8, nod: 0.38 });
    case 'card': return hands(left, between(SAMPLE.card, [0.05, 0.90, 0.27], smooth(u)), { gr: 0.7 });
    case 'close': return two([0, 0.96 - 0.08 * smooth(u), 0.18], 0.18, { nod: 0.35 });
    default: return two([0, 1.10, 0.32], 0.10, { lean: 0.02, nod: 0.08 });
  }
}
function record(k: string, u: number, t: number): Hands {
  const left: V = [-0.38, 1.0, 0.33];
  switch (k) {
    case 'receipt': return two([-0.2, 1.20, 0.26], 0.10, { nod: 0.28 });
    case 'enter': return hands(left, [-0.32, 1.05, 0.12], { gr: 0.1, nod: 0.30 });
    case 'move': return hands(left, [-0.42 + 0.70 * smooth(u), 1.43, -0.07], { gr: 0.7, nod: -0.08 });
    case 'verify': return hands(left, [0.17, 1.44, -0.07], { gr: 0.1, nod: -0.08 });
    case 'bell': return hands(left, [0.43, 1.13 - 0.06 * Math.max(0, wave(u, 2)), 0.03], { gr: 0.1 });
    default: return two([-0.17, 1.30, 0.25], 0.025 + 0.045 * Math.abs(wave(t, 2)), { gr: 0, gl: 0, palms: 0, lean: 0.01, nod: -0.06 });
  }
}
function present(k: string, u: number, t: number): Hands {
  const left: V = [-0.92, 1.0, 0.33];
  const remote: V = [-0.56, 1.13, 0.25];
  switch (k) {
    case 'remote': return hands(left, between([-0.75, 0.98, 0.05], remote, smooth(u)), { gr: 0.9 });
    case 'intro': return hands([-0.97, 1.22, 0.19], remote, { gr: 0.9, palms: -0.4, nod: -0.06 });
    case 'demo': return hands([-0.87, 1.37, -0.08], remote, { gr: 0.9, gl: 0.1, lean: 0.12, nod: -0.12 });
    case 'benefit': return hands([-0.94, 1.24, 0.12 + 0.05 * wave(t)], remote, { gr: 0.9, palms: -0.4 });
    case 'question': return hands(left, remote, { gr: 0.9, nod: 0.04 + 0.06 * wave(t, 0.7), lean: 0.01 });
    case 'answer': return hands([-0.91, 1.28, 0.16], remote, { gr: 0.9, palms: -0.4, nod: -0.03 });
    default: return hands(left, between(remote, [-0.75, 0.98, 0.05], smooth(u)), { gr: 0.7, nod: 0.22 });
  }
}
function visit(k: string, u: number, t: number): Hands {
  const left: V = [-0.48, 1.0, 0.27];
  switch (k) {
    case 'greet': return two([-0.30, 1.04, 0.23], 0.10, { nod: 0.25 });
    case 'give': return two([-0.25, 1.02, -0.02], 0.07, { nod: 0.18, lean: 0.23 });
    case 'receive': return two([-0.22, 1.03, 0.04], 0.07, { nod: 0.20, lean: 0.23 });
    case 'read': return two([-0.27, 1.24, 0.28], 0.07, { nod: 0.28, lean: 0.02 });
    case 'brochure': return hands(left, between([0.10, 1.05, 0.06], [-0.15, 1.15, 0.23], smooth(u)), { gr: 0.8 });
    case 'pack': return hands([-0.42, 0.96, 0.20], [-0.18, 1.03 - 0.08 * smooth(u), 0.25], { gr: 0.8, nod: 0.3 });
    default: return hands(left, [-0.12, 1.12, 0.19], { palms: -0.4, nod: 0.1 + 0.06 * wave(t) });
  }
}
function huddle(k: string, u: number, t: number): Hands {
  const left: V = [-0.39, 1.04, 0.26];
  switch (k) {
    case 'roll': return hands(left, [-0.05, 1.10, 0.24], { gr: 0.9, nod: 0.26 });
    case 'yesterday': return hands(left, [-0.34, 1.43, -0.07], { gr: 0.1, nod: -0.08 });
    case 'move': return hands(left, [-0.35 + 0.56 * smooth(u), 1.43, -0.07], { gr: 0.7 });
    case 'route': return hands(left, [-0.34 + 0.44 * u, 1.17 + 0.07 * wave(u), -0.07], { gr: 0.9, nod: 0.03 });
    case 'listen': return hands(left, [0.04, 1.08, 0.25], { nod: 0.06 * wave(t), lean: 0.02 });
    case 'assign': return hands(left, [0.15, 1.20, 0.11], { gr: 0.1, palms: -0.2 });
    default: return hands([-0.35, 1.3, 0.24], [-0.04, 1.48, 0.27], { gr: 0.9, gl: 0.9, nod: -0.12, lean: 0.02 });
  }
}
function sample(m: SalesMotion, k: string, u: number, t: number, H: number) {
  if (['slCall', 'slProposal', 'slShadow', 'slAccounts'].includes(m)) return desk(m, k, u, t, H);
  if (['slReview', 'slClose', 'slStrategy'].includes(m)) return contract(m, k, u, t);
  if (m === 'slSamples') return samples(k, u, t);
  if (m === 'slRecord') return record(k, u, t);
  if (m === 'slPresent') return present(k, u, t);
  if (m === 'slVisit') return visit(k, u, t);
  return huddle(k, u, t);
}
export function salesHands(m: SalesMotion, t: number, H = 1.6): Hands {
  const b = beat(m, t), p = spotOf(m);
  const rest = hands([p[0] - 0.17, p[1] + (p[1] ? 0.22 : 0.58) * H, p[2] - 0.12],
    [p[0] + 0.17, p[1] + (p[1] ? 0.22 : 0.58) * H, p[2] - 0.12], { lean: 0.02, nod: 0 });
  const a = b.i === 0 && b.n === 0 ? rest : sample(m, b.prev, 1, t, H);
  const c = sample(m, b.key, b.u, t, H), e = smooth(b.elapsed, 0, 0.30);
  return { l: between(a.l, c.l, e), r: between(a.r, c.r, e),
    lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e),
    palms: mix(a.palms, c.palms, e), gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e), tap: c.tap };
}
/** The senior answers the trainee rather than repeating the trainee's pose. The targets
 * are in the desk frame, so the coaching hand actually indicates the CRM and memo. */
export function coachHands(t: number): { l: V; r: V; talking: boolean; nod: number } {
  const b = beat('slShadow', t);
  const at = (key: string, u: number) => {
    const l: V = [0.64, 1.06, 0.25];
    switch (key) {
      case 'connect': return { l, r: [0.34, 1.14, 0.14] as V, talking: true, nod: 0.08 };
      case 'listen': return { l, r: [0.75, 1.38, 0.28] as V, talking: true, nod: 0.03 };
      case 'note': return { l, r: [0.40, 1.01, 0.19] as V, talking: false, nod: 0.15 };
      case 'question': return { l, r: [0.68, 1.12, 0.27] as V, talking: false, nod: 0.05 + 0.04 * wave(t) };
      case 'retry': return { l, r: [0.55, 1.30, 0.30] as V, talking: true, nod: -0.03 };
      default: return { l, r: [0.59, 1.29 + 0.04 * Math.sin(u * Math.PI), 0.32] as V, talking: false, nod: 0.10 };
    }
  };
  const a = at(b.prev, 1), c = at(b.key, b.u), e = smooth(b.elapsed, 0, 0.30);
  return { l: between(a.l, c.l, e), r: between(a.r, c.r, e), talking: c.talking, nod: mix(a.nod, c.nod, e) };
}

/** Reaching the bell and crossing the board uses a small lateral step. This is shared
 * with both the marker and the hands, preventing an overextended shoulder. */
export function stepOf(m: SalesMotion, t: number) {
  const b = beat(m, t);
  const at = (key: string, u: number) => {
    if (m === 'slRecord') {
      if (key === 'move') return 0.22 * smooth(u);
      if (key === 'verify' || key === 'bell') return 0.22;
      if (key === 'celebrate') return 0.22 * (1 - smooth(u));
    }
    if (m === 'slHuddle') {
      if (key === 'move') return 0.12 * smooth(u);
      if (key === 'route') return 0.12;
      if (key === 'listen') return 0.12 * (1 - smooth(u));
    }
    return 0;
  };
  const from = b.i === 0 && b.n === 0 ? 0 : at(b.prev, 1);
  return mix(from, at(b.key, b.u), smooth(b.elapsed, 0, 0.30));
}

/** A sequence-specific status strip supplies readable feedback in addition to the hands. */
export function deskStatus(m: SalesMotion, key: string): number {
  if (m === 'slProposal') {
    if (key === 'brief') return 0;
    if (key === 'type' || key === 'cost') return 1;
    if (key === 'chart' || key === 'proof') return 2;
    return 3;
  }
  if (m === 'slShadow') {
    if (key === 'connect') return 0;
    if (key === 'listen' || key === 'note') return 1;
    if (key === 'question' || key === 'retry') return 2;
    return 3;
  }
  if (m === 'slAccounts') {
    if (key === 'select' || key === 'history') return 0;
    if (key === 'dial' || key === 'followup') return 1;
    if (key === 'schedule') return 2;
    return 3;
  }
  if (key === 'select' || key === 'dial') return 0;
  if (key === 'listen' || key === 'offer') return 1;
  if (key === 'note') return 2;
  return 3;
}

export function salesDoing(m: SalesMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const yaw = b.yaw - Math.PI, up = new THREE.Vector3(0, 1, 0);
  const origin = work?.point ?? b.base.clone().sub(v(spotOf(m)).applyAxisAngle(up, yaw));
  const h = salesHands(m, salesTime(m, t, origin), b.height);
  const world = (p: V) => v(p).applyAxisAngle(up, yaw).add(origin);
  return { reach: { l: world(h.l), r: world(h.r), lean: h.lean,
    nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap } };
}

