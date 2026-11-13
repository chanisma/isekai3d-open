import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/** All targets are furniture metres. Props, drawn clients and the dweller share this
 * arrival clock, including when several notes desks are occupied at once. */
export type ThMotion = 'thSand' | 'thArt' | 'thNotes' | 'thStudy' | 'thSupervise'
  | 'thTest' | 'thConference' | 'thPlan' | 'thCrisis'
  | 'thListen' | 'thReframe' | 'thGroup' | 'thIntake';
export const TH_MOTIONS = new Set<string>([
  'thSand', 'thArt', 'thNotes', 'thStudy', 'thSupervise', 'thTest',
  'thConference', 'thPlan', 'thCrisis', 'thListen', 'thReframe', 'thGroup', 'thIntake',
]);
export type V = readonly [number, number, number];
export const v = (p: V) => new THREE.Vector3(...p);
export const mix = THREE.MathUtils.lerp;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const wave = (t: number, hz = 1) => Math.sin(t * hz * Math.PI * 2);
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const between = (a: V, b: V, u: number): V => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];

type Line = ReadonlyArray<readonly [string, number]>;
/** Every line completes inside its shortest game interaction. No held generic
 * talking pose: an invitation is followed by listening, response and closure. */
export const LINES: Record<ThMotion, Line> = {
  thSand: [['invite', 1.5], ['place', 2.5], ['observe', 2], ['note', 2.5], ['photo', 2], ['clear', 1.5], ['smooth', 2]],
  thArt: [['offer', 2.5], ['choose', 2.5], ['draw', 4], ['show', 3], ['reflect', 3], ['note', 3], ['close', 2]],
  thNotes: [['open', 2], ['read', 3], ['write', 4], ['type', 4], ['check', 2.5], ['file', 2.5]],
  thStudy: [['index', 2.5], ['read', 4], ['turn', 2], ['compare', 3], ['underline', 3], ['bookmark', 2], ['close', 2]],
  thSupervise: [['connect', 2], ['greet', 2], ['present', 3], ['listen', 4], ['ask', 3], ['note', 3], ['close', 2]],
  thTest: [['forms', 2], ['score', 4], ['sum', 3], ['plot', 3], ['compare', 3], ['write', 3], ['file', 2]],
  thConference: [['agenda', 2], ['present', 3], ['listen', 3], ['point', 3], ['agree', 2.5], ['minutes', 3], ['close', 2]],
  thPlan: [['open', 2], ['review', 3], ['goal', 3], ['schedule', 3], ['write', 3], ['check', 2], ['file', 2]],
  thCrisis: [['answer', 2], ['listen', 4], ['ground', 4], ['script', 3], ['log', 4], ['confirm', 3], ['close', 2]],
  thListen: [['welcome', 2], ['offer', 2.5], ['choose', 3], ['listen', 4], ['reflect', 3], ['tissue', 2.5], ['note', 3], ['close', 2]],
  thReframe: [['welcome', 2], ['sheet', 3], ['listen', 4], ['point', 3], ['write', 3], ['review', 3], ['return', 2.5]],
  thGroup: [['open', 2], ['pass', 3], ['first', 4], ['second', 4], ['reflect', 3], ['breathe', 4], ['close', 2]],
  thIntake: [['welcome', 2], ['privacy', 2], ['start', 2], ['answer', 4], ['review', 3], ['print', 2], ['handover', 3]],
};
const clocks = new Map<string, { start: number; last: number }>();
export function thTime(m: ThMotion, t: number, origin: THREE.Vector3) {
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
export function thBeat(m: ThMotion, t: number): Beat {
  const line = LINES[m], total = line.reduce((a, b) => a + b[1], 0);
  const n = Math.floor(Math.max(t, 0) / total);
  let elapsed = Math.max(t, 0) - n * total;
  for (let i = 0; i < line.length; i++) {
    if (elapsed < line[i][1] || i === line.length - 1) return {
      key: line[i][0], prev: line[(i + line.length - 1) % line.length][0],
      i, n, elapsed, u: elapsed / line[i][1],
    };
    elapsed -= line[i][1];
  }
  throw new Error('Empty counselling timeline');
}

export const DESK = {
  page: [0.16, 0.785, 0.23] as V,
  pen: [0.29, 0.82, 0.27] as V,
  keys: [-0.14, 0.79, 0.27] as V,
  mouse: [0.36, 0.8, 0.23] as V,
  file: [-0.32, 0.82, -0.12] as V,
  calc: [0.36, 0.8, 0.23] as V,
};
export const SAND = {
  page: [0.28, 0.72, 0.29] as V,
  rake: [-0.26, 0.76, 0.23] as V,
  camera: [0.27, 0.76, 0.05] as V,
  scene: [0, 0.71, 0] as V,
};
/** The child's placement stays within a child's arm span. The object is
 * gripped above its base, so it sits on the sand when the hand lets go. */
export function sandChildHand(key: string, u: number, t: number): V | undefined {
  if (key === 'place') return between([-0.13, 0.85, -0.39], [0.08, 0.748, -0.12], sm(u));
  if (key === 'draw') return [0.03 + 0.055 * wave(t, 0.6), 0.81, -0.13 + 0.035 * wave(t, 0.9)];
  return undefined;
}
export const PAIR = {
  cards: [0.32, 0.68, 0.42] as V,
  tissue: [0.52, 0.73, 0.1] as V,
  page: [0, 0.77, 0.5] as V,
};
export const PHONE = {
  dock: [-0.28, 0.92, 0.04] as V,
  keys: [-0.12, 0.79, 0.31] as V,
  script: [0.23, 0.83, 0.24] as V,
};
export function spotOf(m: ThMotion): V {
  if (m === 'thSand' || m === 'thArt') return [0, 0.42, 0.66];
  if (m === 'thListen' || m === 'thReframe') return [-0.14, 0.46, 0.67];
  if (m === 'thGroup') return [0, 0.46, 0.97];
  if (m === 'thIntake') return [0.16, 0, 0.67];
  if (m === 'thCrisis') return [0, 0.46, 0.64];
  return [0, 0.46, 0.54];
}
export interface Hands {
  l: V; r: V; lean: number; nod: number; palms: number; gl: number; gr: number; tap?: boolean;
}
const hands = (l: V, r: V, more: Partial<Hands> = {}): Hands => ({
  l, r, lean: 0.12, nod: 0.15, palms: 0.2, gl: 0.15, gr: 0.15, ...more,
});
const lap = (): Hands => hands([-0.18, 0.72, 0.5], [0.18, 0.72, 0.5], { lean: 0.03 });
const pen = (p: V, t: number): V => add(p, 0.035 * wave(t, 0.8), 0.055 + 0.004 * wave(t, 4), 0.014 * wave(t, 1.7));
const writing = (p: V, t: number) => hands(add(p, -0.12, 0.02), pen(p, t), { gr: 0.9, nod: 0.35, lean: 0.2 });
const typing = (p: V, t: number) => hands(add(p, -0.08, 0.025 + 0.009 * wave(t, 4)), add(p, 0.08, 0.025 - 0.009 * wave(t, 4)), { tap: true, nod: 0.22 });
const explain = (t: number, y = 1.01, z = 0.4) => hands([-0.2, y - 0.12, z], [0.2 + 0.025 * wave(t, 0.6), y, z - 0.02], { palms: -0.5, nod: 0.06 + 0.03 * wave(t, 0.7) });
const listen = (t: number) => hands([-0.18, 0.75, 0.48], [0.18, 0.76, 0.48], { nod: 0.1 + 0.06 * wave(t, 0.45), lean: 0.12 });
const read = (p: V = [0, 0.98, 0.36]) => hands(add(p, -0.12), add(p, 0.12), { gl: 0.55, gr: 0.55, nod: 0.25 });

/** Two sessions use the same tray, but art makes a drawing while sand play
 * changes a miniature landscape. Observation leaves the child's work alone. */
function sand(m: ThMotion, key: string, u: number, t: number): Hands {
  if (m === 'thArt') {
    switch (key) {
      case 'offer': return hands([-0.18, 0.75, 0.2], [0.17, 0.75, 0.2], { palms: -0.3 });
      case 'choose': return hands([-0.2, 0.73, 0.27], [0.22, 0.77, 0.08], { gr: 0.4 });
      case 'draw': return listen(t);
      case 'show': return read([0, 0.93, 0.3]);
      case 'reflect': return explain(t, 0.96, 0.33);
      case 'note': return writing(SAND.page, t);
      default: return hands([-0.17, 0.75, 0.18], [0.17, 0.75, 0.18]);
    }
  }
  switch (key) {
    case 'invite': return explain(t, 0.94, 0.33);
    case 'place': return hands([-0.22, 0.76, 0.28], [0.2, 0.77, 0.28], { palms: -0.4 });
    case 'observe': return listen(t);
    case 'note': return writing(SAND.page, t);
    case 'photo': return hands([-0.11, 1.02, 0.28], [0.1, 1.02, 0.28], { gl: 0.7, gr: 0.8, nod: 0.3 });
    case 'clear': return hands([-0.2, 0.77, 0.25], between([0.08, 0.79, -0.12], [0.29, 0.81, -0.1], sm(u)), { gr: 0.8, lean: 0.28 });
    default: return hands([-0.27, 0.76, 0.25], [-0.18 + 0.36 * u, 0.78, 0.08 + 0.07 * wave(t, 1.4)], { gr: 0.85, nod: 0.4 });
  }
}

function notes(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'open': return hands(add(DESK.page, -0.13, 0.04), add(DESK.page, 0.12 - 0.2 * sm(u), 0.05));
    case 'read': return read();
    case 'write': return writing(DESK.page, t);
    case 'type': return typing(DESK.keys, t);
    case 'check': return hands(add(DESK.page, -0.12, 0.02), add(DESK.page, 0.06, 0.035, -0.07 + 0.14 * u), { gr: 0.15, nod: 0.3 });
    default: return hands(between([0.04, 0.84, 0.23], [-0.4, 0.9, 0.23], sm(u)), between([0.28, 0.84, 0.23], [-0.16, 0.9, 0.23], sm(u)), { gl: 0.65, gr: 0.65, lean: 0.25 });
  }
}
function study(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'index': return hands([-0.22, 0.83, 0.15], [-0.04, 0.84, 0.1 + 0.1 * u], { nod: 0.3 });
    case 'read': return read([0, 0.96, 0.34]);
    case 'turn': return hands([-0.14, 0.95, 0.34], [0.14 - 0.25 * sm(u), 0.99 + 0.04 * Math.sin(u * Math.PI), 0.33], { gr: 0.4 });
    case 'compare': return hands([-0.18, 0.82, 0.17], [0.24, 0.83, 0.1], { nod: 0.28 });
    case 'underline': return writing(DESK.page, t * 0.35);
    case 'bookmark': return hands([-0.14, 0.84, 0.2], [0.03, 0.87, 0.11 - 0.05 * u], { gr: 0.6 });
    default: return notes('open', 1 - u, t);
  }
}
function supervise(key: string, _u: number, t: number): Hands {
  switch (key) {
    case 'connect': return hands([-0.18, 0.8, 0.22], add(DESK.mouse, 0, 0.02), { tap: true });
    case 'greet': return hands([-0.18, 0.75, 0.48], [0.2, 1.08, 0.38], { palms: -0.5, nod: 0.04 });
    case 'present': return read([0, 0.98, 0.32]);
    case 'listen': return listen(t);
    case 'ask': return explain(t);
    case 'note': return writing(DESK.page, t);
    default: return hands([-0.18, 0.8, 0.22], add(DESK.mouse, 0, 0.025), { tap: true, nod: 0.1 });
  }
}
function test(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'forms': return read([0, 0.93, 0.32]);
    case 'score': return writing(add(DESK.page, 0, 0, -0.07 + Math.floor(u * 5) * 0.025), t);
    case 'sum': return hands(add(DESK.page, -0.1, 0.02), add(DESK.calc, 0, 0.025 + 0.008 * wave(t, 3)), { tap: true });
    case 'plot': return typing(DESK.keys, t);
    case 'compare': return hands([-0.15, 0.85, 0.17], [0.09, 0.93, -0.02], { gr: 0.1, nod: 0.16 });
    case 'write': return writing(DESK.page, t);
    default: return notes('file', u, t);
  }
}
function conference(key: string, _u: number, t: number): Hands {
  switch (key) {
    case 'agenda': return read([0, 0.94, 0.32]);
    case 'present': return explain(t);
    case 'listen': return listen(t);
    case 'point': return hands([-0.17, 0.82, 0.21], [0.06, 1.02, -0.03], { gr: 0.1, lean: 0.2 });
    case 'agree': return hands([-0.17, 0.81, 0.4], [0.15, 0.98, 0.37], { nod: 0.16 + 0.08 * wave(t, 1), palms: -0.4 });
    case 'minutes': return writing(DESK.page, t);
    default: return typing(DESK.keys, t);
  }
}
function plan(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'open': return notes(key, u, t);
    case 'review': return read();
    case 'goal': return hands([0.03, 0.82, 0.23], between([0.3, 0.84, 0.23], [0.16, 0.84, 0.23], sm(u)), { gr: 0.65 });
    case 'schedule': return typing(DESK.keys, t);
    case 'write': return writing(DESK.page, t);
    case 'check': return notes(key, u, t);
    default: return notes('file', u, t);
  }
}

/** Headset ear target follows the avatar's height; the binder and keys remain
 * fixed to the desk. The boom is attached to this same target by the builder. */
// sitFrame puts the hips a tenth of a metre behind the seat marker. Match the
// seated head, rather than centring the headset above the front of the cushion.
export function ear(H: number): V { return [-0.105 * H / 1.6, 0.46 + H * 0.44, 0.74]; }
function crisis(key: string, u: number, t: number, H: number): Hands {
  switch (key) {
    case 'answer': return hands(between(PHONE.dock, ear(H), sm(u, 0.1, 0.8)), [0.2, 0.8, 0.3], { gl: 0.65 });
    case 'listen': return hands(ear(H), [0.2, 0.79, 0.3], { gl: 0.3, nod: 0.12 + 0.04 * wave(t, 0.5), lean: 0.15 });
    case 'ground': return hands([-0.16, 0.85, 0.46], [0.19, 0.95 + 0.06 * wave(t, 0.2), 0.4], { palms: -0.7, nod: 0.08 });
    case 'script': return hands([-0.18, 0.8, 0.29], add(PHONE.script, -0.04, 0.025, -0.05 + 0.1 * u), { nod: 0.3 });
    case 'log': return typing(PHONE.keys, t);
    case 'confirm': return hands(ear(H), [0.2, 0.94, 0.4], { palms: -0.5, nod: 0.1 + 0.05 * wave(t, 0.6) });
    default: return hands(between(ear(H), PHONE.dock, sm(u, 0.2, 0.9)), [0.19, 0.8, 0.25], { gl: 0.65 });
  }
}
function pair(m: ThMotion, key: string, u: number, t: number): Hands {
  if (m === 'thReframe') {
    switch (key) {
      case 'welcome': return explain(t, 1.0, 0.43);
      case 'sheet': return read(PAIR.page);
      case 'listen': return listen(t);
      case 'point': return hands([-0.14, 0.78, 0.49], [0.08, 0.81, 0.45 - 0.05 * u], { gr: 0.1, nod: 0.3 });
      case 'write': return writing(PAIR.page, t);
      case 'review': return read([0, 0.98, 0.35]);
      default: return hands([-0.13, 0.86, 0.34 - 0.2 * u], [0.13, 0.86, 0.34 - 0.2 * u], { gl: 0.5, gr: 0.5, lean: 0.25 });
    }
  }
  switch (key) {
    case 'welcome': return explain(t, 1.0, 0.42);
    case 'offer': return hands([-0.24, 0.76, 0.5], between(PAIR.cards, [0.07, 0.87, 0.14], sm(u)), { gr: 0.6, lean: 0.25 });
    case 'choose': return hands([-0.24, 0.76, 0.5], [0.07, 0.87, 0.14], { gr: 0.5, lean: 0.25 });
    case 'listen': return listen(t);
    case 'reflect': return explain(t, 0.99, 0.37);
    case 'tissue': return hands([-0.24, 0.77, 0.5], between(PAIR.tissue, [0.22, 0.88, 0.14], sm(u)), { gr: 0.5, lean: 0.25 });
    case 'note': return writing(PAIR.page, t);
    default: return explain(t, 0.91, 0.4);
  }
}
export function tokenAt(key: string, u: number): V {
  switch (key) {
    case 'pass': return between([-0.12, 0.92, 0.72], [-0.42, 0.9, 0.6], sm(u));
    case 'first': return [-0.42, 0.9 + 0.015 * wave(u, 2), 0.6];
    // Back through the facilitator's hands; never fly through the empty centre.
    case 'second': return u < 0.25
      ? between([-0.42, 0.9, 0.6], [-0.12, 0.92, 0.72], sm(u, 0, 0.25))
      : u < 0.45 ? between([-0.12, 0.92, 0.72], [0.12, 0.92, 0.72], sm(u, 0.25, 0.45))
      : between([0.12, 0.92, 0.72], [0.42, 0.9, 0.6], sm(u, 0.45, 0.7));
    case 'reflect': return between([0.42, 0.9, 0.6], [0.12, 0.92, 0.72], sm(u, 0, 0.45));
    default: return [-0.12, 0.92, 0.72];
  }
}
function circle(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'open': return hands(tokenAt(key, u), [0.18, 1.04, 0.68], { gl: 0.6, palms: -0.4 });
    case 'pass': return hands(tokenAt(key, u), [0.18, 0.76, 0.77], { gl: 0.6, lean: 0.18 });
    case 'first': return hands([-0.18, 0.76, 0.77], [0.18, 0.76, 0.77], { nod: 0.1 + 0.06 * wave(t, 0.5) });
    case 'second': return hands(u < 0.45 ? tokenAt(key, u) : [-0.18, 0.76, 0.77],
      u >= 0.25 && u < 0.75 ? tokenAt(key, u) : [0.18, 0.76, 0.77], { gl: 0.6, gr: 0.6, nod: 0.1 });
    case 'reflect': return hands([-0.19, 1.0, 0.72], tokenAt(key, u), { gr: 0.6, palms: -0.4 });
    case 'breathe': return hands([-0.18, 0.77 + 0.12 * Math.sin(u * Math.PI), 0.75], [0.18, 0.77 + 0.12 * Math.sin(u * Math.PI), 0.75], { nod: 0.08, palms: -0.65 });
    default: return hands([-0.22, 0.98, 0.68], [0.22, 0.98, 0.68], { palms: -0.5, nod: 0.08 });
  }
}
function intake(key: string, u: number, t: number): Hands {
  switch (key) {
    case 'welcome': return hands([-0.12, 1.08, 0.44], [0.33, 1.2, 0.38], { palms: -0.6, nod: 0.06 });
    case 'privacy': return hands([-0.08, 1.0, 0.3], [0.35, 1.04, 0.06], { gr: 0.1 });
    case 'start': return hands([-0.1, 1.0, 0.37], [0.07, 1.16, -0.03], { tap: true });
    case 'answer': return hands([-0.1, 0.98, 0.4], [0.07 + 0.1 * Math.floor(u * 3), 1.12, -0.02], { tap: true, nod: 0.15 });
    case 'review': return hands([-0.1, 1.0, 0.4], [0.09, 1.2, -0.05], { gr: 0.1 });
    case 'print': return hands([-0.1, 1.0, 0.4], [0.36, 0.97, 0.19], { gr: 0.5 });
    default: return hands([-0.1, 1.0, 0.4], between([0.36, 0.98, 0.19], [-0.18, 1.0, 0.15], sm(u)), { gr: 0.5, nod: 0.08 + 0.03 * wave(t, 0.5) });
  }
}

export function thHands(m: ThMotion, t: number, H = 1.6): Hands {
  const b = thBeat(m, t);
  const sample = (key: string, u: number) => {
    switch (m) {
      case 'thSand': case 'thArt': return sand(m, key, u, t);
      case 'thNotes': return notes(key, u, t);
      case 'thStudy': return study(key, u, t);
      case 'thSupervise': return supervise(key, u, t);
      case 'thTest': return test(key, u, t);
      case 'thConference': return conference(key, u, t);
      case 'thPlan': return plan(key, u, t);
      case 'thCrisis': return crisis(key, u, t, H);
      case 'thListen': case 'thReframe': return pair(m, key, u, t);
      case 'thGroup': return circle(key, u, t);
      case 'thIntake': return intake(key, u, t);
    }
  };
  const a = b.i === 0 && b.n === 0 ? (m === 'thIntake' ? sample('welcome', 0) : lap()) : sample(b.prev, 1);
  const c = sample(b.key, b.u), e = sm(b.elapsed, 0, 0.3);
  return { l: between(a.l, c.l, e), r: between(a.r, c.r, e), lean: mix(a.lean, c.lean, e),
    nod: mix(a.nod, c.nod, e), palms: mix(a.palms, c.palms, e),
    gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e), tap: c.tap };
}
export function thDoing(m: ThMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const up = new THREE.Vector3(0, 1, 0), yaw = b.yaw - Math.PI;
  const origin = work?.point ?? b.base.clone().sub(v(spotOf(m)).applyAxisAngle(up, yaw));
  const h = thHands(m, thTime(m, t, origin), b.height);
  const world = (p: V) => v(p).applyAxisAngle(up, yaw).add(origin);
  return { reach: { l: world(h.l), r: world(h.r), lean: h.lean, nod: h.nod,
    palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap } };
}
