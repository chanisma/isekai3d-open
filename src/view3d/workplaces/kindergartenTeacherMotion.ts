import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/** The classroom's stories. Furniture and people sample these same timelines, including the
 * transitions: a mould stays in the hand, the pupil answers after the cue, a page meets the fingers.
 * All tool targets are in furniture metres, not multiplied by the adult's height. Gestures alone
 * scale with the person. The work marker is the furniture origin, even when the seat moves. */
export type KgMotion = 'kgSand' | 'kgRecital' | 'kgRehearsal' | 'kgMeeting' | 'kgBoard'
  | 'kgNature' | 'kgSafety' | 'kgToys' | 'kgPiano' | 'kgLesson' | 'kgCompetition'
  | 'kgAccompany' | 'kgCompose' | 'kgViolin' | 'kgWelcome' | 'kgHealthLog' | 'kgRest' | 'kgMatTidy';
export const KG_MOTIONS = new Set<string>([
  'kgSand', 'kgRecital', 'kgRehearsal', 'kgMeeting', 'kgBoard', 'kgNature', 'kgSafety',
  'kgToys', 'kgPiano', 'kgLesson', 'kgCompetition', 'kgAccompany', 'kgCompose', 'kgViolin',
  'kgWelcome', 'kgHealthLog', 'kgRest', 'kgMatTidy',
]);
export type V = readonly [number, number, number];
type Line = ReadonlyArray<readonly [string, number]>;
export const v = (p: V) => new THREE.Vector3(...p);
export const mix = THREE.MathUtils.lerp;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const wave = (t: number, hz = 1) => Math.sin(t * hz * Math.PI * 2);
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const between = (a: V, b: V, u: number): V => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];

// Start at the first beat after arrival, including independent copies in the same room.
// The prop renderer and avatar share this clock without changing the generic pose dispatcher.
const clocks = new Map<string, { start: number; last: number }>();
export function kgTime(m: KgMotion, t: number, origin: THREE.Vector3) {
  const key = `${m}:${origin.x.toFixed(3)}:${origin.y.toFixed(3)}:${origin.z.toFixed(3)}`;
  let clock = clocks.get(key);
  if (!clock || t - clock.last > 0.65 || t < clock.last) {
    clock = { start: t, last: t }; clocks.set(key, clock);
  }
  clock.last = t; return t - clock.start;
}

const LINES: Record<KgMotion, Line> = {
  kgSand: [['scoop', 3], ['fill', 2.4], ['press', 2], ['lift', 2], ['tunnel', 3], ['show', 2.2], ['smooth', 2.4]],
  kgRecital: [['ready', 2], ['open', 2.5], ['over', 2.5], ['clap', 2.5], ['ribbon', 3], ['bow', 2], ['praise', 2]],
  kgRehearsal: [['count', 2], ['ribbon', 3], ['shake', 3], ['listen', 2], ['again', 3], ['bow', 2.5], ['praise', 2]],
  kgMeeting: [['open', 2], ['point', 3], ['listen', 3], ['write', 3], ['agree', 2], ['close', 2]],
  kgBoard: [['greet', 2.4], ['date', 2.8], ['choose', 2.4], ['weather', 3.2], ['ask', 2.4], ['answer', 2.8], ['plan', 3]],
  kgNature: [['take', 2], ['inspect', 3], ['share', 2.5], ['water', 3], ['draw', 3], ['compare', 2.5], ['put', 2]],
  kgSafety: [['stop', 3], ['left', 2], ['right', 2], ['raise', 2], ['cross', 4], ['praise', 2], ['return', 4]],
  kgToys: [['open', 2], ['take', 2], ['drive', 3], ['stack', 3], ['show', 2.5], ['put', 2.5], ['close', 2]],
  kgPiano: [['open', 1.7], ['ready', 1.5], ['play', 4], ['page', 1.8], ['phrase', 4], ['release', 1.8], ['close', 1.7]],
  kgLesson: [['open', 1.7], ['point', 2.5], ['demo', 3], ['pupil', 4], ['together', 3], ['praise', 2], ['close', 1.7]],
  kgCompetition: [['open', 1.7], ['count', 2], ['pupil', 4], ['correct', 2.5], ['demo', 3], ['together', 4], ['close', 1.7]],
  kgAccompany: [['open', 1.7], ['count', 2], ['bass', 3], ['chord', 3], ['page', 1.8], ['together', 4], ['close', 1.7]],
  kgCompose: [['open', 1.7], ['try', 3], ['listen', 2], ['write', 3], ['play', 3], ['revise', 2.5], ['close', 1.7]],
  kgViolin: [['ready', 2], ['upbow', 3], ['downbow', 3], ['listen', 2], ['phrase', 3], ['bow', 2]],
  // A child met at the door and looked over; only then ticked on the list and sent in.
  kgWelcome: [['greet', 2.6], ['low', 1.4], ['temp', 3.4], ['throat', 2.6], ['palms', 2.4], ['tick', 2.8], ['send', 2.2]],
  kgHealthLog: [['file', 3], ['tick', 4], ['look', 2]],
  // Rest time: the lamp down, soft music on, a child settled; one who isn't sleepy has a picture book.
  kgRest: [['dim', 2.4], ['music', 2], ['pat', 6], ['stroke', 3], ['tuck', 2.4], ['hush', 2]],
  kgMatTidy: [['smooth', 3], ['tuck', 3], ['music', 2]],
};
export interface Beat { key: string; prev: string; i: number; n: number; u: number; elapsed: number; duration: number }
export function kgBeat(m: KgMotion, t: number): Beat {
  const line = LINES[m], duration = line.reduce((a, b) => a + b[1], 0);
  const n = Math.floor(t / duration);
  let elapsed = t - n * duration;
  for (let i = 0; i < line.length; i++) {
    if (elapsed < line[i][1] || i === line.length - 1) return {
      key: line[i][0], prev: line[(i + line.length - 1) % line.length][0], i, n,
      u: elapsed / line[i][1], elapsed, duration: line[i][1],
    };
    elapsed -= line[i][1];
  }
  throw new Error('Empty kindergarten timeline');
}

export const SAND = {
  seat: [-0.08, 0, 0.54] as V, scoop: [-0.45, 0.7, 0.19] as V,
  mould: [0.12, 0.69, 0.08] as V, castle: [0.12, 0.64, 0.02] as V,
  dig: [-0.12, 0.64, 0.18] as V, park: [0.6, 0.7, 0.16] as V,
};
export const NATURE = {
  stand: [-0.2, 0, 0.46] as V, glass: [-0.35, 0.79, 0.19] as V,
  plant: [-0.27, 0.83, -0.02] as V, can: [0.36, 0.82, 0.16] as V,
  paper: [0.02, 0.752, 0.16] as V,
};
export const PIANO = {
  seat: [0, 0.48, 0.58] as V, lessonSeat: [-0.28, 0.48, 0.58] as V,
  keys: [0, 0.785, 0.2] as V, page: [0.02, 1.12, 0.075] as V,
  hinge: [0, 0.825, -0.01] as V, notebook: [-0.68, 0.86, 0.08] as V,
};
export const TOYS = { seat: [0, 0.11, 0.5] as V, hinge: [0, 0.36, -0.4] as V, car: [0.12, 0.31, 0.055] as V };
/** The health desk by the door (2 x 1): the teacher's place, the child's, the things on it, the list's sheet. */
export const WELCOME = {
  stand: [0, 0, 0.32] as V, kid: [0.32, 0, -0.1] as V, from: [1.25, 0, 0.62] as V, off: [1.2, 0, -0.25] as V,
  clip: [-0.1, 0.862, 0] as V, gun: [0.02, 0.92, -0.14] as V, light: [-0.1, 0.885, -0.16] as V,
  brow: [0.31, 0.93, 0.12] as V, read: [0.14, 1.02, 0.2] as V, throat: [0.3, 0.84, 0.13] as V,
};
/** The rest mats (3 x 1): sat on the floor between two mats, facing the middle one; the lamp and the player either side. */
export const REST = {
  seat: [0.46, 0.012, 0.02] as V, tummy: [0.06, 0.17, 0.0] as V, head: [0.02, 0.17, -0.31] as V,
  lamp: [0.44, 0.33, -0.39] as V, player: [0.46, 0.12, 0.42] as V,
};
export const isPiano = (m: KgMotion) => ['kgPiano', 'kgLesson', 'kgCompetition', 'kgAccompany', 'kgCompose'].includes(m);
export const isLesson = (m: KgMotion) => m === 'kgLesson' || m === 'kgCompetition';
export function spotOf(m: KgMotion): V {
  if (isPiano(m)) return isLesson(m) ? PIANO.lessonSeat : PIANO.seat;
  switch (m) {
    case 'kgSand': return SAND.seat;
    case 'kgNature': return NATURE.stand;
    case 'kgRecital': case 'kgRehearsal': return [0, 0, 1.02];
    case 'kgMeeting': return [-0.62, 0, 0.9];
    case 'kgBoard': return [-0.48, 0, 0.32];
    case 'kgSafety': return [-0.78, 0.035, 0.38];
    case 'kgToys': return TOYS.seat;
    case 'kgViolin': return [0.05, 0, 1.18];
    case 'kgWelcome': case 'kgHealthLog': return WELCOME.stand;
    case 'kgRest': case 'kgMatTidy': return REST.seat;
  }
  return PIANO.seat;
}
export const yawOf = (m: KgMotion) => m === 'kgRest' || m === 'kgMatTidy' ? -Math.PI / 2 : m === 'kgSafety' || m === 'kgViolin' ? 0 : m === 'kgMeeting' ? Math.PI / 2 : Math.PI;

export interface Hands {
  l: V; r: V; lean: number; nod: number; palms: number; gl: number; gr: number; crouch: number; tap?: boolean;
}
const hands = (l: V, r: V, h: Partial<Hands> = {}): Hands => ({ l, r, lean: 0.08, nod: 0.15, palms: 0.6, gl: 0.2, gr: 0.2, crouch: 0, ...h });
const blend = (a: Hands, b: Hands, u: number): Hands => ({
  l: between(a.l, b.l, u), r: between(a.r, b.r, u), lean: mix(a.lean, b.lean, u),
  nod: mix(a.nod, b.nod, u), palms: mix(a.palms, b.palms, u), gl: mix(a.gl, b.gl, u),
  gr: mix(a.gr, b.gr, u), crouch: mix(a.crouch, b.crouch, u), tap: b.tap,
});
/** Relative gestures are turned into the piece frame. Seated hands scale up from the bench. */
function body(m: KgMotion, H: number, x: number, y: number, z: number): V {
  const p = spotOf(m), k = H / 1.6, a = yawOf(m);
  return [p[0] + (x * Math.cos(a) + z * Math.sin(a)) * k, p[1] + y * k, p[2] + (-x * Math.sin(a) + z * Math.cos(a)) * k];
}

function sandHands(key: string, u: number, t: number): Hands {
  const rim: V = [-0.42, 0.68, 0.26];
  switch (key) {
    case 'scoop': return hands(rim, [-0.28 + 0.12 * wave(u, 1), 0.68 + 0.035 * Math.cos(u * Math.PI * 2), 0.16], { crouch: 0.48, lean: 0.3, gr: 0.85, nod: 0.5 });
    case 'fill': return hands(add(SAND.mould, -0.07, 0.02), between([-0.28, 0.76, 0.16], [0.12, 0.88, 0.08], sm(u, 0, 0.6)), { crouch: 0.4, lean: 0.2, gr: 0.9, gl: 0.7, nod: 0.45 });
    case 'press': return hands([0.02, 0.76 - 0.035 * Math.abs(wave(u, 2)), 0.06], [0.2, 0.76 - 0.035 * Math.abs(wave(u, 2)), 0.06], { crouch: 0.5, lean: 0.25, palms: 1.3, nod: 0.5 });
    case 'lift': return hands([0.02, 0.74 + 0.26 * sm(u, 0.1, 0.8), 0.06], [0.2, 0.74 + 0.26 * sm(u, 0.1, 0.8), 0.06], { crouch: 0.4, lean: 0.18, gl: 0.8, gr: 0.8, nod: 0.35 });
    case 'tunnel': return hands(rim, [-0.1 + 0.08 * wave(u, 2), 0.71 + 0.012 * wave(t, 2), 0.15 + 0.04 * wave(u, 2)], { crouch: 0.53, lean: 0.27, gr: 0.9, nod: 0.6 });
    case 'show': return hands([-0.36, 0.83, 0.1], [0.25, 0.85, 0.12], { crouch: 0.25, lean: 0.08, palms: -0.4, nod: 0.1 });
    default: return hands(rim, [mix(0.32, -0.3, u), 0.68, 0.16], { crouch: 0.5, lean: 0.25, palms: 1.4, nod: 0.5 });
  }
}
export function sandNow(t: number) {
  const b = kgBeat('kgSand', t);
  return { b, scoop: b.key === 'scoop' || b.key === 'fill' || b.key === 'tunnel',
    mouldHeld: b.key === 'lift', castle: b.i >= 3 ? b.key === 'smooth' ? 1 - sm(b.u) : 1 : 0,
    tunnel: b.key === 'tunnel' ? sm(b.u) : b.i > 4 ? 1 : 0,
    falling: b.key === 'fill' && b.u > 0.55, mound: b.key === 'fill' ? sm(b.u) : b.i > 1 ? 1 : 0 };
}

/** A dance is taught slowly; the rehearsal is a call, ribbon phrase, tambourines, a correction,
 * another phrase and a bow. The children mirror these, with a small human response delay. */
function recitalHands(m: KgMotion, key: string, u: number, t: number, H: number): Hands {
  const B = (x: number, y: number, z: number) => body(m, H, x, y, z);
  const restL = B(0.2, 0.9, 0.12), restR = B(-0.2, 0.9, 0.12);
  const w = wave(t, 0.75);
  switch (key) {
    case 'ready': case 'count': return hands(B(0.18, 1, 0.2), B(-0.14, 1.35, 0.3), { nod: 0.03, gr: 0.4 });
    case 'open': return hands(B(0.45, 1.2, 0.12), B(-0.45, 1.2, 0.12), { lean: -0.03 });
    case 'over': return hands(B(0.2, 1.72, 0.08), B(-0.2, 1.72, 0.08), { nod: -0.15 });
    case 'clap': { const x = 0.04 + 0.09 * Math.abs(w); return hands(B(x, 1.12, 0.3), B(-x, 1.12, 0.3), { palms: 0 }); }
    case 'ribbon': case 'again': return hands(B(0.24, 1.05, 0.2), B(-0.27 + 0.15 * w, 1.35 + 0.22 * Math.cos(t * Math.PI * 1.5), 0.2), { gr: 0.8, crouch: 0.05 * (1 + w) });
    case 'shake': return hands(B(0.12, 1.17, 0.3), B(-0.13, 1.15 + 0.04 * wave(t, 4), 0.3), { gr: 0.85, gl: 0.3 });
    case 'listen': return hands(restL, B(-0.11, 1.42, 0.05), { nod: 0.15 });
    case 'bow': return hands(B(0.12, 0.87, 0.18), B(-0.12, 0.87, 0.18), { lean: 0.55 * Math.sin(Math.PI * u), nod: 0.4 * Math.sin(Math.PI * u) });
    case 'praise': return hands(B(0.06 + 0.05 * Math.abs(w), 1.18, 0.3), B(-0.06 - 0.05 * Math.abs(w), 1.18, 0.3), { palms: 0, nod: -0.04 });
    default: return hands(restL, restR);
  }
}

function boardHands(key: string, u: number, t: number, H: number): Hands {
  const B = (x: number, y: number, z: number) => body('kgBoard', H, x, y, z);
  const l = B(0.18, 0.96, 0.18), r = B(-0.18, 1.04, 0.2);
  switch (key) {
    case 'greet': return hands(l, B(-0.2, 1.5, 0.12 + 0.04 * wave(t, 1.4)), { palms: -0.1 });
    case 'date': return hands(l, [-0.28 + 0.13 * sm(u, 0.2, 0.8), 1.22, -0.34], { gr: 0.7, nod: 0.05 });
    case 'choose': return hands(l, [-0.13, 0.82, -0.22], { nod: 0.35, gr: 0.5 });
    case 'weather': return hands(l, [0.0, 0.95, -0.05], { palms: -0.2, nod: 0.25 });
    case 'ask': return hands(B(0.25, 1.05, 0.12), B(-0.2, 1.2, 0.12), { palms: -0.3, nod: -0.08 });
    case 'answer': return hands(l, r, { nod: 0.1 + 0.1 * wave(t, 0.8) });
    default: return hands(l, [-0.2 + u * 0.2, 1.05 - 0.1 * u, -0.33], { nod: 0.2 });
  }
}

function natureHands(key: string, u: number, t: number): Hands {
  const rest: V = [-0.42, 0.77, 0.25];
  switch (key) {
    case 'take': return hands(rest, between(NATURE.glass, [-0.28, 0.96, 0.12], sm(u, 0.3, 1)), { gr: 0.8, lean: 0.25, nod: 0.45 });
    case 'inspect': return hands([-0.37, 0.86, 0.03], [-0.25 + 0.025 * wave(t, 0.4), 0.98, 0.06], { gr: 0.85, lean: 0.32, nod: 0.55 });
    case 'share': return hands(rest, between([-0.25, 0.98, 0.06], [-0.05, 0.89, -0.12], sm(u)), { gr: 0.8, lean: 0.3, nod: 0.2 });
    case 'water': return hands(rest, between(NATURE.can, [-0.12, 1, 0.08], sm(u, 0.05, 0.35) * (1 - sm(u, 0.75, 1))), { gr: 0.9, lean: 0.25, nod: 0.4 });
    case 'draw': return hands([-0.1, 0.77, 0.19], [0.03 + 0.05 * wave(u, 2), 0.78, 0.16 + 0.03 * wave(u, 3)], { gr: 0.9, palms: 1.2, lean: 0.35, nod: 0.55 });
    case 'compare': return hands([-0.37, 0.8, 0.14], [-0.18, 0.93, -0.04], { palms: -0.2, nod: 0.1 });
    default: return hands(rest, between([-0.05, 0.89, -0.12], NATURE.glass, sm(u, 0.1, 0.7)), { gr: 0.7, nod: 0.4 });
  }
}
export function natureNow(t: number) {
  const b = kgBeat('kgNature', t);
  return { b, teacherGlass: b.i < 3 || b.key === 'put', childGlass: b.i >= 3 && b.i < 6,
    water: b.key === 'water' && b.u > 0.35 && b.u < 0.75,
    drawn: b.key === 'draw' ? b.u : b.i > 4 ? 1 : 0 };
}

export function safetyNow(t: number) {
  const b = kgBeat('kgSafety', t);
  const go = ['raise', 'cross', 'praise', 'return'].includes(b.key);
  return { b, go, crossing: b.key === 'cross' || b.key === 'return',
    travel: b.key === 'cross' ? sm(b.u) : b.key === 'praise' ? 1 : b.key === 'return' ? 1 - sm(b.u) : 0 };
}
function safetyHands(key: string, _u: number, t: number, H: number): Hands {
  const B = (x: number, y: number, z: number) => body('kgSafety', H, x, y, z);
  const l = B(0.17, 0.93, 0.1);
  if (key === 'stop') return hands(l, B(-0.2, 1.33, 0.32), { palms: 0, nod: 0 });
  if (key === 'left' || key === 'right') return hands(l, B(key === 'left' ? 0.32 : -0.38, 1.2, 0.18), { nod: 0.1 });
  if (key === 'praise') return hands(B(0.05 + 0.05 * Math.abs(wave(t, 1)), 1.1, 0.25), B(-0.05 - 0.05 * Math.abs(wave(t, 1)), 1.1, 0.25), { palms: 0 });
  return hands(l, B(-0.15, 1.72, 0.08), { nod: -0.1, palms: 0.1 });
}

/** The same fallboard handle as the builder, a hinged path rather than a vertical hand lift. */
export function lidPoint(angle: number, length: number, hinge: V): V {
  return [hinge[0], hinge[1] + Math.sin(angle) * length, hinge[2] + Math.cos(angle) * length];
}
export function pianoNow(m: KgMotion, t: number) {
  const b = kgBeat(m, t);
  const open = b.key === 'open' ? sm(b.u, 0.1, 0.85) : b.key === 'close' ? 1 - sm(b.u, 0.1, 0.85) : 1;
  const playing = ['play', 'phrase', 'demo', 'together', 'try', 'bass', 'chord'].includes(b.key);
  const pupil = b.key === 'pupil' || b.key === 'together';
  const page = b.key === 'page' ? sm(b.u, 0.12, 0.88) : 0;
  return { b, open, playing, pupil, page, writing: b.key === 'write' || b.key === 'revise',
    pedal: playing ? 0.5 + 0.5 * Math.sin(t * 3) : 0 };
}
function pianoHands(m: KgMotion, key: string, u: number, t: number, H: number): Hands {
  const B = (x: number, y: number, z: number) => body(m, H, x, y, z);
  const shift = isLesson(m) ? -0.28 : 0;
  const restL = B(0.15, 0.16, 0.17), restR = B(-0.15, 0.16, 0.17);
  const kl: V = [shift - 0.16 + 0.045 * wave(t, 0.5), 0.798 + 0.012 * Math.max(0, wave(t, 3)), 0.22];
  const kr: V = [shift + 0.14 + 0.065 * wave(t, 0.36), 0.798 + 0.012 * Math.max(0, wave(t, 3,)), 0.22];
  switch (key) {
    case 'open': case 'close': {
      const open = key === 'open' ? sm(u, 0.1, 0.85) : 1 - sm(u, 0.1, 0.85);
      return hands(restL, lidPoint(1.48 * open, 0.26, PIANO.hinge), { gr: 0.7, lean: 0.18, nod: 0.25 });
    }
    case 'point': case 'correct': return hands(kl, [0.15, 1.1 + 0.03 * wave(t, 0.5), 0.065], { nod: -0.05, lean: 0.15 });
    case 'count': return hands(restL, B(-0.16, 0.63 + 0.06 * wave(t, 1.5), 0.28), { nod: 0.05 });
    case 'pupil': return hands(restL, B(-0.2, 0.45 + 0.04 * wave(t, 1), 0.25), { nod: 0.1, palms: -0.1 });
    case 'page': { const a = sm(u, 0.12, 0.88) * Math.PI; return hands(kl, [0.2 * Math.cos(a), 1.13 + 0.08 * Math.sin(a), 0.075 + 0.15 * Math.sin(a)], { gr: 0.65, nod: -0.1 }); }
    case 'listen': return hands(restL, B(-0.02, 0.78, 0.11), { lean: -0.02, nod: 0.1 });
    case 'write': case 'revise': return hands([-0.12, 1.03, 0.48], [-0.1 + 0.035 * wave(t, 1), 1.055, 0.46 + 0.015 * wave(t, 1.7)], { gl: 0.8, gr: 0.9, nod: 0.5, palms: 1.1 });
    case 'praise': return hands(B(0.045, 0.6, 0.3), B(-0.045 - 0.055 * Math.abs(wave(t, 1.4)), 0.6, 0.3), { palms: 0, nod: -0.05 });
    case 'ready': case 'release': return hands(restL, restR, { lean: 0, nod: 0.1 });
    case 'bass': return hands(kl, restR, { palms: 1.3, tap: true, nod: 0.2 });
    case 'chord': return hands([shift - 0.28, 0.8 + 0.02 * Math.max(0, wave(t, 1.5)), 0.22], kr, { palms: 1.3, tap: true, nod: 0.2 });
    default: return hands(kl, kr, { palms: 1.4, gl: 0.35, gr: 0.35, tap: true, lean: 0.12, nod: 0.15 + 0.04 * wave(t, 0.6) });
  }
}

export function toysNow(t: number) {
  const b = kgBeat('kgToys', t);
  const open = b.key === 'open' ? sm(b.u, 0.1, 0.9) : b.key === 'close' ? 1 - sm(b.u, 0.1, 0.9) : 1;
  return { b, open, car: ['take', 'drive', 'show', 'put'].includes(b.key),
    stacked: b.key === 'stack' ? sm(b.u, 0.3, 0.85) : b.key === 'show' ? 1 : b.key === 'put' ? 1 - sm(b.u) : 0 };
}
function toyHands(key: string, u: number, t: number, H: number): Hands {
  const B = (x: number, y: number, z: number) => body('kgToys', H, x, y, z);
  const lap = B(-0.12, 0.23, 0.2), left = B(0.14, 0.15, 0.2);
  switch (key) {
    case 'open': case 'close': {
      const a = (key === 'open' ? sm(u, 0.1, 0.9) : 1 - sm(u, 0.1, 0.9)) * 1.55;
      // The fabric pull stays at the front of this soft-close chest; a child needn't reach
      // across the entire box when the lid is upright. Its other end follows the hinge.
      const p: V = [0, 0.38 + 0.05 * Math.sin(a), 0.17];
      return hands(left, p, { lean: 0.35, nod: 0.3, gr: 0.65 });
    }
    case 'take': { const a = sm(u, 0.15, 0.85); return hands(left, add(between(TOYS.car, lap, a), 0, 0.21 * Math.sin(a * Math.PI)), { gr: 0.8, lean: 0.3 * (1 - u), nod: 0.4 }); }
    case 'drive': return hands(left, [0.12 + 0.12 * wave(u, 1), 0.11, 0.35 + 0.06 * Math.cos(u * Math.PI * 2)], { gr: 0.75, lean: 0.22, nod: 0.5 });
    case 'stack': return hands(left, between([-0.23, 0.1, 0.27], [-0.17, 0.21, 0.32], sm(u, 0.1, 0.75)), { gr: 0.7, lean: 0.25, nod: 0.5 });
    case 'show': return hands(B(0.12, 0.4, 0.3), B(-0.08, 0.43 + 0.02 * wave(t, 1), 0.3), { gr: 0.75, nod: -0.08 });
    case 'put': {
      const a = sm(u, 0.1, 0.9), b = sm(u, 0.25, 0.9);
      const blocks = add(between([-0.17, 0.12, 0.32], [-0.05, 0.18, -0.16], b), 0, 0.4 * Math.sin(b * Math.PI));
      return hands(blocks, add(between(lap, TOYS.car, a), 0, 0.21 * Math.sin(a * Math.PI)), { gl: 0.8, gr: 0.7, lean: 0.25, nod: 0.4 });
    }
    default: return hands(left, lap);
  }
}

function meetingHands(key: string, _u: number, t: number, H: number): Hands {
  const B = (x: number, y: number, z: number) => body('kgMeeting', H, x, y, z);
  const l = B(0.08, 1.03, 0.32);
  if (key === 'write') return hands(l, B(0.05 + 0.025 * wave(t, 1), 1.1, 0.38), { gl: 0.8, gr: 0.85, nod: 0.5 });
  if (key === 'point') return hands(l, B(-0.25, 1.3, 0.4), { gl: 0.8, nod: -0.05 });
  if (key === 'agree') return hands(l, B(-0.15, 1.2, 0.24), { gl: 0.8, gr: 0.7, nod: 0.1 * wave(t, 1) });
  return hands(l, B(-0.12, 1.04, 0.34), { gl: 0.8, nod: key === 'listen' ? 0.08 * wave(t, 0.8) : 0.3 });
}

function violinHands(key: string, u: number, t: number, H: number): Hands {
  const B = (x: number, y: number, z: number) => body('kgViolin', H, x, y, z);
  const playing = ['upbow', 'downbow', 'phrase'].includes(key);
  const bow = key === 'upbow' ? u : key === 'downbow' ? 1 - u : 0.5 + 0.5 * wave(t, 0.7);
  return hands(B(0.22, 1.36, 0.24), B(playing ? -0.18 + bow * 0.1 : -0.12, playing ? 1.39 : 1.05, playing ? 0.4 + bow * 0.12 : 0.2), {
    gl: 0.75, gr: 0.85, nod: key === 'listen' ? -0.04 : 0.1,
    lean: key === 'bow' ? 0.4 * Math.sin(u * Math.PI) : 0.03,
  });
}

const welcomeRest = { l: [-0.17, 0.92, 0.2] as V, knee: [-0.14, 0.62, 0.22] as V };
function welcomeHands(key: string, u: number, t: number): Hands {
  const W = WELCOME, low = { crouch: 0.55, lean: 0.14, nod: 0.12 };
  switch (key) {
    case 'greet': return hands(welcomeRest.l, [0.16, 1.42, 0.2 + 0.03 * wave(t, 1.3)], { palms: -0.1, nod: 0.05, gr: 0.1 });
    case 'low': return hands(between(welcomeRest.l, welcomeRest.knee, sm(u)), between([0.16, 1.1, 0.2], add(W.gun, 0, 0.02), sm(u, 0.1, 0.8)), { ...low, crouch: 0.3 * sm(u), lean: 0.25, gr: 0.75 });
    case 'temp': return hands(welcomeRest.knee, u < 0.62 ? between(add(W.gun, 0, 0.02), W.brow, sm(u, 0, 0.3)) : between(W.brow, W.read, sm(u, 0.62, 0.85)), { ...low, gr: 0.8 });
    case 'throat': return hands(welcomeRest.knee, u < 0.3 ? between(W.read, add(W.light, 0, 0.02), sm(u, 0, 0.28)) : between(add(W.light, 0, 0.02), W.throat, sm(u, 0.32, 0.6)), { ...low, nod: 0.25, gr: 0.7 });
    case 'palms': return hands([0.15, 0.68, 0.12], [0.3 + 0.02 * wave(t, 0.8), 0.68, 0.12], { ...low, nod: 0.45, palms: 0.1, lean: 0.2 });
    case 'tick': return hands([-0.22, 0.875, 0.03], [-0.1 + 0.05 * wave(t, 0.5), 0.952, 0 + 0.012 * wave(t, 1.3)], { lean: 0.36, nod: 0.5, palms: 1.1, gl: 0.3, gr: 0.85 });
    case 'file': return hands([-0.22, 0.88, 0.02], [0.02, 0.88, 0.0], { lean: 0.34, nod: 0.5, palms: 1.2 });
    case 'look': return hands(welcomeRest.l, [0.17, 0.95, 0.2], { nod: 0.1 });
    default: return hands(welcomeRest.l, [0.18, 1.2 + 0.03 * wave(t, 1.3), 0.14], { palms: -0.1, nod: 0.05, gr: 0.1 });
  }
}
/** What's in the hand and the child this moment. */
export function welcomeNow(t: number) {
  const b = kgBeat('kgWelcome', t);
  const tool: 'gun' | 'light' | null = (b.key === 'low' && b.u > 0.7) || b.key === 'temp' ? 'gun' : b.key === 'throat' && b.u > 0.32 ? 'light' : null;
  return {
    b, tool, pen: b.key === 'tick',
    /** How far the child has come in (1 stood here) and how far they've gone (1 away). */
    come: b.key === 'greet' ? sm(b.u, 0, 0.5) : 1, go: b.key === 'send' ? sm(b.u, 0.25, 1) : 0,
    beep: b.key === 'temp' && b.u > 0.3 && b.u < 0.88, ticked: b.i > 5 || (b.key === 'tick' && b.u > 0.45),
    say: b.key === 'greet' ? '안녕! 좋은 아침이야' : b.key === 'throat' ? '아~ 해 볼까?' : b.key === 'palms' ? '손도 보여 줘' : b.key === 'send' ? '오늘도 재밌게 놀자' : undefined,
  };
}
function restHands(key: string, u: number, t: number): Hands {
  const R = REST, knee: V = [0.27, 0.12, 0.2], kneeR: V = [0.27, 0.12, -0.16], bent = { lean: 0.42, nod: 0.45, palms: 1.4 };
  switch (key) {
    case 'dim': return hands(knee, between(kneeR, add(R.lamp, 0, 0.02), sm(u, 0.1, 0.5)), { lean: 0.15, nod: 0.3, gr: 0.6 });
    case 'music': return hands(between(knee, add(R.player, 0, 0.05), sm(u, 0.1, 0.5)), kneeR, { lean: 0.12, nod: 0.3, palms: 1.2 });
    case 'pat': return hands(knee, add(R.tummy, 0, 0.03 + 0.03 * Math.max(0, wave(t, 1.1)) ** 2), { ...bent, gl: 0.3, gr: 0.15 });
    case 'stroke': return hands(knee, add(R.head, 0.03 * wave(t, 0.5), 0.06), { ...bent, nod: 0.5, gr: 0.2 });
    case 'tuck': return hands([0.1, 0.2, 0.06], [0.1, 0.2, -0.2], { ...bent, nod: 0.5, gl: 0.6, gr: 0.6 });
    case 'smooth': return hands([0.1 + 0.03 * wave(t, 0.6), 0.1, 0.18], [0.1 + 0.03 * wave(t, 0.6), 0.1, -0.14], { ...bent, gl: 0.1, gr: 0.1 });
    default: return hands(knee, [0.42, 0.72, 0.0], { lean: 0.05, nod: 0.05 + 0.06 * wave(t, 0.25), gr: 0.75, palms: 0.1 });
  }
}
/** The lamp's brightness and the music: down and on through the first round, and they stay so. */
export function restNow(t: number) {
  const b = kgBeat('kgRest', t);
  const after = b.n > 0 || b.i > 0;
  return { b, lamp: after ? 0.25 : 1 - 0.75 * sm(b.u, 0.35, 0.8), music: b.n > 0 || b.i > 1 || (b.key === 'music' && b.u > 0.45), say: b.key === 'hush' ? '쉬…' : undefined };
}

/** One sampler used by both the avatar and carried props. First 0.32 s of each beat eases from
 * the previous beat's end; no independent oscillation can leave a tool floating off the palm. */
export function kgLocal(m: KgMotion, t: number, H = 1.6): Hands {
  const b = kgBeat(m, t);
  const key = (k: string, u: number): Hands => {
    if (isPiano(m)) return pianoHands(m, k, u, t, H);
    switch (m) {
      case 'kgSand': return sandHands(k, u, t);
      case 'kgRecital': case 'kgRehearsal': return recitalHands(m, k, u, t, H);
      case 'kgBoard': return boardHands(k, u, t, H);
      case 'kgNature': return natureHands(k, u, t);
      case 'kgSafety': return safetyHands(k, u, t, H);
      case 'kgToys': return toyHands(k, u, t, H);
      case 'kgMeeting': return meetingHands(k, u, t, H);
      case 'kgViolin': return violinHands(k, u, t, H);
      case 'kgWelcome': case 'kgHealthLog': return welcomeHands(k, u, t);
      case 'kgRest': case 'kgMatTidy': return restHands(k, u, t);
      default: return hands(body(m, H, 0.22, 1.36, 0.24), body(m, H, -0.15 + 0.1 * wave(t, 0.7), 1.25, 0.2), { gr: 0.8, gl: 0.7 });
    }
  };
  return blend(key(b.prev, 1), key(b.key, b.u), sm(b.elapsed, 0, 0.32));
}
export function kgDoing(m: KgMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const yaw = b.yaw - yawOf(m);
  const origin = work?.point ?? b.base.clone().sub(v(spotOf(m)).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  const h = kgLocal(m, kgTime(m, t, origin), b.height);
  const world = (p: V) => v(p).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(origin);
  const result: Doing = {
    reach: { l: world(h.l), r: world(h.r), lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap },
    crouch: h.crouch || undefined,
  };
  return result;
}
