import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/**
 * The ecological laboratory's hands and objects use one clock and one coordinate system.
 * Coordinates below are metres in the fixture: x across, y above its floor, z towards its user.
 * All work markers are fixed at (0, 1, 0), even when the user steps along a sorting station.
 * A tool's origin is its grip. The builder puts the SAME object at the hand, then back in its
 * holder; it never draws a second copy underneath a held one.
 */
export type EcoMotion =
  | 'ecoPipette' | 'ecoLog' | 'ecoIdentify' | 'ecoImpact' | 'ecoPlan' | 'ecoMonitor'
  | 'ecoPot' | 'ecoObserve' | 'ecoFeed' | 'ecoCount' | 'ecoSort'
  | 'ecoSurvey' | 'ecoCleanup' | 'ecoGear' | 'ecoCamera' | 'ecoMount' | 'ecoTeach';
export const ECO_MOTIONS = new Set<string>([
  'ecoPipette', 'ecoLog', 'ecoIdentify', 'ecoImpact', 'ecoPlan', 'ecoMonitor',
  'ecoPot', 'ecoObserve', 'ecoFeed', 'ecoCount', 'ecoSort',
  'ecoSurvey', 'ecoCleanup', 'ecoGear', 'ecoCamera', 'ecoMount', 'ecoTeach',
]);
export type V = readonly [number, number, number];
type Sequence = ReadonlyArray<readonly [string, number]>;
export const frac = (x: number) => ((x % 1) + 1) % 1;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const lerp = (a: V, b: V, u: number): V => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
export const ecoPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

/** Eight beats at most; a beat has enough time to see the action before the next begins. */
const SEQUENCES: Record<EcoMotion, Sequence> = {
  ecoPipette: [['uncap', 1.6], ['draw', 2], ['dose', 1.8], ['shake', 1.5], ['compare', 2], ['probe', 2.6], ['record', 2.2], ['reset', 1.4]],
  ecoLog: [['open', 1.6], ['read', 2.2], ['write', 3], ['check', 1.8], ['file', 1.6]],
  ecoIdentify: [['open', 1.6], ['lens', 2.4], ['compare', 2.2], ['point', 1.8], ['write', 2], ['file', 1.4]],
  ecoImpact: [['open', 1.5], ['read', 2.3], ['measure', 2], ['mark', 2], ['stamp', 1.4], ['file', 1.7]],
  ecoPlan: [['open', 1.6], ['map', 2.2], ['place', 1.8], ['route', 2.2], ['write', 2.2], ['file', 1.6]],
  ecoMonitor: [['open', 1.4], ['read', 2], ['check', 1.8], ['write', 2.6], ['radio', 2.8], ['file', 1.6]],
  ecoPot: [['loosen', 1.8], ['lift', 1.6], ['plant', 1.8], ['scoop', 1.8], ['firm', 2], ['water', 2.6], ['label', 1.6], ['return', 1.6]],
  ecoObserve: [['lens', 1.4], ['follow', 2.6], ['frog', 2.2], ['chart', 1.8], ['write', 2.4], ['return', 1.4]],
  ecoFeed: [['open', 1.2], ['pinch', 1.4], ['sprinkle', 2.2], ['watch', 2.2], ['close', 1.2]],
  ecoCount: [['net', 1.3], ['dip', 2], ['lift', 1.8], ['box', 1.8], ['count', 2.8], ['release', 2], ['write', 2]],
  ecoSort: [['pick', 1.5], ['inspect', 1.6], ['separate', 1.8], ['carry', 1.7], ['drop', 1.2], ['tally', 1.7]],
  ecoSurvey: [['map', 1.8], ['lift', 1.6], ['load', 1.6], ['secure', 1.6], ['radio', 1.8], ['ready', 1.4]],
  ecoCleanup: [['brief', 1.6], ['gloves', 1.8], ['lift', 1.6], ['load', 1.6], ['radio', 1.8], ['ready', 1.6]],
  ecoGear: [['boots', 1.8], ['net', 2], ['binocular', 1.4], ['look', 2.6], ['focus', 1.8], ['return', 1.6], ['tick', 1.8]],
  ecoCamera: [['card', 1.8], ['insert', 1.6], ['browse', 2.2], ['zoom', 2], ['tag', 2.2], ['save', 1.8], ['note', 2]],
  ecoMount: [['open', 1.6], ['lift', 1.8], ['arrange', 2.4], ['tape', 2.2], ['write', 2.4], ['press', 2], ['file', 1.6]],
  ecoTeach: [['invite', 1.8], ['river', 2.2], ['fish', 2], ['frog', 2], ['ask', 2.6], ['answer', 2], ['record', 1.8]],
};

export interface Beat {
  key: string;
  u: number;
  i: number;
  n: number;
  previous: string;
  seconds: number;
}
export function ecoBeat(m: EcoMotion, t: number, ph: number): Beat {
  const seq = SEQUENCES[m];
  const duration = seq.reduce((total, [, d]) => total + d, 0);
  const cycle = t / duration + ph;
  let seconds = frac(cycle) * duration;
  for (let i = 0; i < seq.length; i++) {
    const [key, d] = seq[i];
    if (seconds < d || i === seq.length - 1) {
      return { key, u: seconds / d, i, n: Math.floor(cycle), previous: seq[(i + seq.length - 1) % seq.length][0], seconds };
    }
    seconds -= d;
  }
  return { key: seq[0][0], u: 0, i: 0, n: 0, previous: seq[seq.length - 1][0], seconds: 0 };
}

/** Fixed contact points, also used to build the real objects. */
export const WATER = {
  bottle: [-0.32, 1.08, 0.22] as V,
  tube: [-0.06, 1.09, 0.18] as V,
  pipette: [-0.53, 1.19, 0.13] as V,
  compare: [-0.1, 1.36, 0.09] as V,
  probe: [0.16, 1.16, 0.19] as V,
  page: [0.49, 0.982, 0.19] as V,
  pen: [0.72, 1.02, 0.22] as V,
};
export const NURSERY = {
  plug: [-0.2, 1.11, 0.18] as V,
  pot: [0.13, 1.12, 0.19] as V,
  can: [0.57, 1.16, 0.21] as V,
  soil: [0.52, 1.06, -0.12] as V,
  tag: [0.36, 1.14, 0.23] as V,
};
export const TANK = {
  jar: [0.31, 1.14, 0.33] as V,
  surface: [-0.04, 1.02, -0.02] as V,
  lens: [-0.35, 1.17, 0.33] as V,
  view: [0.28, 0.86, 0.47] as V,
  page: [-0.19, 0.79, 0.49] as V,
};
export const CAMERA = {
  card: [-0.43, 0.83, 0.13] as V,
  reader: [-0.28, 0.81, 0.07] as V,
  keys: [0.0, 0.82, 0.17] as V,
  mouse: [0.32, 0.82, 0.17] as V,
  page: [0.58, 0.80, 0.09] as V,
};
export const HERB = {
  plant: [-0.38, 1.04, 0.14] as V,
  sheet: [0.02, 1.01, 0.17] as V,
  tape: [0.34, 1.06, 0.20] as V,
  page: [0.48, 1.02, 0.18] as V,
};

export interface Hands {
  l: V;
  r: V;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
  tap: boolean;
}
const hands = (l: V, r: V, other: Partial<Hands> = {}): Hands => ({
  l, r, lean: 0.13, nod: 0.28, palms: 0.65, gl: 0.35, gr: 0.75, crouch: 0, tap: false, ...other,
});
const wave = (t: number, hz: number) => Math.sin(t * hz * Math.PI * 2);
const scribble = (p: V, t: number): V => add(p, 0.035 * wave(t, 0.7), 0.045 + 0.004 * wave(t, 5), 0.012 * wave(t, 1.3));
const step = (a: V, b: V, u: number, lift = 0): V => add(lerp(a, b, sm(u)), 0, Math.sin(sm(u) * Math.PI) * lift);

function waterHands(key: string, u: number, t: number): Hands {
  const W = WATER;
  const left: V = [-0.21, 1.02, 0.28];
  switch (key) {
    case 'uncap': return hands(W.bottle, add(W.bottle, 0, 0.08 + 0.09 * sm(u, 0.3, 0.9)), { palms: 0.2 + 0.4 * wave(t, 2), gl: 0.85 });
    case 'draw': return hands(W.bottle, add(W.bottle, 0, 0.17 + 0.05 * (1 - sm(u, 0.3, 0.6))), { lean: 0.21, gl: 0.8, gr: 0.95 });
    case 'dose': return hands(add(W.tube, -0.035), add(W.tube, 0, 0.2 + 0.012 * wave(t, 2)), { lean: 0.22, gl: 0.8 });
    case 'shake': return hands(left, add(W.tube, 0.02 * wave(t, 3), 0.2 + 0.045 * wave(t, 3), 0.07), { gr: 0.9, nod: 0.1 });
    case 'compare': return hands(left, W.compare, { nod: -0.05, lean: 0.03 });
    case 'probe': return hands(add(W.tube, -0.035), add(W.tube, 0, 0.11 + 0.08 * (1 - sm(u, 0.15, 0.45))), { gl: 0.8, lean: 0.2 });
    case 'record': return hands([0.32, 0.99, 0.21], scribble(W.page, t), { palms: 1.25, nod: 0.5, lean: 0.24 });
    default: return hands(left, step(W.compare, W.tube, u), { gr: 0.7, nod: 0.35 });
  }
}

/** Six genuinely different ways of using the report end of the laboratory bench. */
function reportHands(m: EcoMotion, key: string, u: number, t: number, H: number): Hands {
  const page = WATER.page;
  const left = add(page, -0.14, 0.025, 0.03);
  const right = add(page, 0.08, 0.045, 0.04);
  switch (key) {
    case 'open': return hands(left, add(page, 0.11 * Math.cos(Math.PI * u), 0.035 + 0.12 * Math.sin(Math.PI * u)), { nod: 0.45, gr: 0.4 });
    case 'lens': return hands(left, [0.24, 1.17, 0.16], { lean: 0.28, nod: 0.5 });
    case 'compare': return hands([0.27, 1.17, 0.22], [0.56, 1.20, 0.15], { lean: 0.06, nod: 0.2 });
    case 'point': return hands(left, add(page, -0.08 + 0.16 * u, 0.035, -0.04), { gr: 0.12, palms: 1.2 });
    case 'read': return hands(left, add(page, -0.06 + 0.12 * u, 0.025, -0.08 + 0.15 * u), { gr: 0.2, nod: 0.5 });
    case 'measure': return hands(add(page, -0.12, 0.03, -0.02), add(page, 0.13, 0.03, -0.02), { palms: 1.2, lean: 0.23 });
    case 'mark': return hands(left, add(scribble(page, t), -0.03, 0, -0.06), { nod: 0.5, palms: 1.2 });
    case 'stamp': return hands(left, add(page, 0.08, 0.075 + 0.09 * Math.abs(Math.sin(u * Math.PI * 2)), 0.05), { gr: 1, palms: 0.2 });
    case 'map': return hands(left, [0.40 + u * 0.15, 1.14, -0.15], { nod: 0.13, gr: 0.2 });
    case 'place': return hands(left, step([0.76, 1.01, 0.0], [0.49, 1.015, 0.14], u, 0.12));
    case 'route': return hands(left, [0.38 + 0.2 * u, 1.04, 0.11 + 0.06 * Math.sin(u * Math.PI)], { palms: 1.2, nod: 0.45 });
    case 'check': return hands(left, m === 'ecoMonitor' ? [0.11, 1.17, -0.04] : add(page, 0.12, 0.04, 0.07), { nod: 0.3, gr: 0.2, tap: true });
    case 'radio': return hands(left, [0.55, H * 0.83, 0.56], { lean: 0, nod: 0.0, gr: 0.9 });
    case 'write': return hands(left, scribble(page, t), { palms: 1.2, nod: 0.5, lean: 0.2 });
    default: return hands(left, step(right, [0.72, 1.02, -0.15], u), { nod: 0.35, gr: 0.5 });
  }
}

function potHands(key: string, u: number, t: number): Hands {
  const N = NURSERY;
  switch (key) {
    case 'loosen': return hands(add(N.plug, -0.07), add(N.plug, 0.04, 0.02 + 0.025 * wave(t, 2)), { gl: 0.8, gr: 0.6 });
    case 'lift': {
      const p = step(N.plug, add(N.pot, 0, 0.22), u);
      return hands(add(p, -0.06, -0.04), p, { gl: 0.6, gr: 0.65 });
    }
    case 'plant': {
      const p = lerp(add(N.pot, 0, 0.22), N.pot, sm(u, 0.1, 0.7));
      return hands(add(N.pot, -0.10, -0.03), p, { lean: 0.23, gr: 0.45 });
    }
    case 'scoop': return hands(add(N.pot, -0.10, -0.02), step(add(N.soil, 0, 0.1), add(N.pot, 0.04, 0.14), u, 0.08), { lean: 0.22 });
    case 'firm': return hands(add(N.pot, -0.06, -0.015 + 0.018 * wave(t, 2)), add(N.pot, 0.06, -0.015 - 0.018 * wave(t, 2)), { gl: 0.1, gr: 0.1, palms: 1.4, nod: 0.5 });
    case 'water': return hands(add(N.pot, -0.11), [0.39, 1.37, 0.23], { gr: 0.9, nod: 0.3 });
    case 'label': return hands(add(N.pot, -0.10), step(N.tag, add(N.pot, 0.08, 0.09, -0.03), u), { gr: 0.6, nod: 0.45 });
    default: return hands(add(N.pot, -0.12), step([0.39, 1.37, 0.23], N.can, u), { nod: 0.12 });
  }
}

function tankHands(m: EcoMotion, key: string, u: number, t: number): Hands {
  const left: V = [-0.24, 1.18, 0.38];
  if (m === 'ecoFeed') {
    switch (key) {
      case 'open': return hands(TANK.jar, add(TANK.jar, 0, 0.07 + 0.06 * sm(u)), { palms: 0.25 + 0.2 * wave(t, 2) });
      case 'pinch': return hands(TANK.jar, add(TANK.jar, 0, 0.08));
      case 'sprinkle': return hands(TANK.jar, [-0.08 + 0.08 * wave(t, 0.5), 1.24, 0.10], { gr: 0.4, palms: 1.1 });
      case 'watch': return hands(left, [0.23, 1.1, 0.34], { nod: 0.35, gr: 0.1, lean: 0.22 });
      default: return hands(TANK.jar, add(TANK.jar, 0, 0.07), { palms: 0.2 + 0.2 * wave(t, 2) });
    }
  }
  if (m === 'ecoCount') {
    switch (key) {
      case 'net': return hands(left, [-0.32, 1.2, 0.31]);
      case 'dip': return hands(left, [-0.06 + 0.13 * u, 1.15 - 0.12 * Math.sin(Math.PI * u), 0.16], { lean: 0.24 });
      case 'lift': return hands(left, step([0.07, 1.15, 0.16], [0.13, 1.38, 0.26], u));
      case 'box': return hands(left, [0.28, 1.09 - 0.08 * sm(u), 0.62], { lean: 0.18, nod: 0.4 });
      case 'count': return hands(left, [0.39, 0.94 + 0.012 * wave(t, 2), 0.49], { gr: 0.1, tap: true, nod: 0.5 });
      case 'release': return hands(left, step([0.28, 1.03, 0.62], [0.0, 1.15, 0.16], u));
      default: return hands(add(TANK.page, -0.1, 0.03), scribble(TANK.page, t), { nod: 0.6, lean: 0.35, palms: 1.3 });
    }
  }
  switch (key) {
    case 'lens': return hands(left, TANK.lens);
    case 'follow': return hands(left, [-0.09 + 0.15 * Math.sin(u * Math.PI), 1.15, 0.40], { nod: 0.25, lean: 0.2 });
    case 'frog': return hands(left, [0.19, 1.20, 0.23], { nod: 0.15, lean: 0.25 });
    case 'chart': return hands(left, [-0.26, 1.25, 0.21], { gr: 0.1, nod: 0.1 });
    case 'write': return hands(add(TANK.page, -0.1, 0.03), scribble(TANK.page, t), { nod: 0.6, lean: 0.35, palms: 1.2 });
    default: return hands(left, TANK.lens, { nod: 0.3 });
  }
}

export const sortBin = (n: number) => ((n % 3) + 3) % 3;
export function sortX(key: string, n: number) {
  return key === 'carry' || key === 'drop' ? (sortBin(n) - 1) * 0.53 : 0;
}
function sortHands(key: string, u: number, t: number, n: number): Hands {
  const bin = sortBin(n);
  const x = (bin - 1) * 0.53;
  const item: V = [(bin - 1) * 0.16, 0.99, 0.35];
  const inspect: V = [0.05, 1.22, 0.4];
  switch (key) {
    case 'pick': return hands([-0.17, 0.95, 0.40], step(item, inspect, sm(u, 0.3, 1)), { nod: 0.5 });
    case 'inspect': return hands(add(inspect, -0.10), add(inspect, 0, 0.02 * wave(t, 0.7)), { gl: 0.6, nod: 0.2 });
    case 'separate': return hands([0.0, 1.17, 0.36], [0.16 + 0.06 * sm(u), 1.2, 0.36], { gl: 0.7, gr: 0.85, palms: 0.2 });
    case 'carry': return hands([x - 0.12, 0.98, 0.36], step(inspect, [x, 1.03, 0.02], u), { nod: 0.4 });
    case 'drop': return hands([x - 0.13, 0.98, 0.36], [x, 1.03, 0.02], { gr: u < 0.25 ? 0.8 : 0.05, nod: 0.4, palms: 1.2 });
    default: return hands([-0.12, 0.95, 0.38], scribble([0.25, 0.94, 0.37], t), { palms: 1.2, nod: 0.45 });
  }
}

function gearHands(key: string, u: number, t: number, H: number): Hands {
  const rest: V = [-0.13, 1.03, 0.31];
  const binocular: V = [0.0, H * 0.89, 0.52];
  switch (key) {
    case 'boots': return hands([-0.47, 0.85, 0.18], [-0.26, 0.86 + 0.018 * wave(t, 1), 0.18], { lean: 0.22, nod: 0.5, crouch: 0.12 });
    case 'net': return hands(rest, [0.31, 1.12, 0.18], { nod: 0.2 });
    case 'binocular': return hands(add(binocular, -0.05), step([0.0, 1.05, 0.18], binocular, u), { gr: 0.9, gl: 0.9, nod: -0.08 });
    case 'look': return hands(add(binocular, -0.055), add(binocular, 0.055), { gl: 0.9, gr: 0.9, lean: 0, nod: -0.06 });
    case 'focus': return hands(add(binocular, -0.055), add(binocular, 0.015, 0.025 * wave(t, 1.1)), { gl: 0.9, gr: 0.5, nod: -0.06 });
    case 'return': return hands(rest, step(binocular, [0, 1.05, 0.18], u));
    default: return hands([-0.12, 0.99, 0.3], scribble([0.19, 1.0, 0.26], t), { nod: 0.45, palms: 1.2 });
  }
}

function cameraHands(key: string, u: number, t: number): Hands {
  const C = CAMERA;
  const left = add(C.keys, -0.12, 0.01);
  switch (key) {
    case 'card': return hands(left, step(C.card, [-0.16, 0.97, 0.27], u), { nod: 0.4 });
    case 'insert': return hands(left, step([-0.16, 0.97, 0.27], C.reader, u), { nod: 0.45 });
    case 'browse': return hands(left, add(C.mouse, 0.018 * wave(t, 0.6), 0.012, 0.012 * wave(t, 1)), { nod: -0.08, palms: 1.4, tap: true });
    case 'zoom': return hands(left, add(C.mouse, 0, 0.015 + 0.008 * wave(t, 3)), { lean: 0.24, nod: -0.04, tap: true });
    case 'tag': return hands(add(left, 0, 0.015 * Math.max(0, wave(t, 5))), add(C.keys, 0.11, 0.025 * Math.max(0, -wave(t, 5))), { nod: 0.1, palms: 1.4, tap: true });
    case 'save': return hands(left, add(C.keys, 0.19, 0.02), { palms: 1.3, tap: true, nod: -0.1 });
    default: return hands([0.4, 0.81, 0.14], scribble(C.page, t), { lean: 0.25, nod: 0.5, palms: 1.2 });
  }
}

function mountHands(key: string, u: number, t: number): Hands {
  const H = HERB;
  const left = add(H.sheet, -0.15, 0.03, 0.04);
  switch (key) {
    case 'open': return hands([-0.55, 1.05, 0.15], [-0.25, 1.05 + 0.14 * sm(u), 0.15], { gl: 0.6, gr: 0.6 });
    case 'lift': return hands(left, step(H.plant, add(H.sheet, 0, 0.15), u, 0.04));
    case 'arrange': return hands(left, [0.03 + 0.07 * wave(t, 0.4), 1.09, 0.14 + 0.05 * wave(t, 0.7)], { lean: 0.23, nod: 0.5 });
    case 'tape': return hands(left, step(H.tape, [0.07, 1.035, 0.18], u), { gl: 0.15, gr: 0.4, palms: 1.2 });
    case 'write': return hands([0.34, 1.025, 0.21], scribble(H.page, t), { palms: 1.2, nod: 0.5 });
    case 'press': return hands(add(H.sheet, -0.14, 0.02), add(H.sheet, 0.14, 0.02), { lean: 0.28, palms: 1.5, gl: 0.05, gr: 0.05 });
    default: return hands([-0.12, 0.81, 0.38], [0.12, 0.81, 0.38 + 0.17 * Math.sin(u * Math.PI)], { nod: 0.5, crouch: 0.12 });
  }
}

function teachHands(key: string, u: number, t: number): Hands {
  // The guide stands at the left end of the board. Two drawn pupils wait at its right end.
  const rest: V = [-0.70, 1.05, 0.36];
  switch (key) {
    case 'invite': return hands(rest, [-0.34, 1.17, 0.38 + 0.06 * wave(t, 0.7)], { gr: 0.05, nod: 0.0, palms: -0.3 });
    case 'river': return hands(rest, [-0.39 + 0.12 * u, 1.26 - 0.04 * Math.sin(u * Math.PI), 0.30], { gr: 0.9, nod: 0.0 });
    case 'fish': return hands(rest, [-0.45, 1.23, 0.26], { nod: 0.12 });
    case 'frog': return hands(rest, [-0.25, 1.30, 0.30], { nod: -0.03 });
    case 'ask': return hands(rest, [-0.25, 1.2, 0.43], { gr: 0.05, palms: -0.4, nod: 0 });
    case 'answer': return hands([-0.68, 1.14, 0.38], [-0.27, 1.23, 0.38], { gl: 0.05, gr: 0.05, palms: 0.1, nod: 0.04 * wave(t, 1) });
    default: return hands([-0.57, 0.83, 0.30], scribble([-0.37, 0.81, 0.28], t), { palms: 1.2, nod: 0.5, lean: 0.22 });
  }
}

function jeepHands(m: EcoMotion, key: string, u: number, t: number): Hands {
  // The lab demonstrates packing at the open cargo side; off-lot trips use the vehicle's away hook.
  const base: V = [-0.5, 0.98, 0.58];
  const load = step([-0.55, 0.66, 0.62], [-0.5, 0.91, 0.46], u, 0.1);
  switch (key) {
    case 'map': case 'brief': return hands(add(base, -0.12), add(base, 0.12, 0.02 * wave(t, 1)), { palms: 1.2, nod: 0.45 });
    case 'gloves': return hands(add(base, -0.05), add(base, 0.05, 0.02 * wave(t, 1.5)), { gl: 0.6, gr: 0.7 });
    case 'lift': return hands(add(load, -0.16, 0.06), add(load, 0.16, 0.06), { gl: 0.9, gr: 0.9, crouch: 0.18 * (1 - u), nod: 0.45 });
    case 'load': return hands([-0.68, 0.97, 0.46 - 0.09 * u], [-0.32, 0.97, 0.46 - 0.09 * u], { gl: 0.7, gr: 0.7, lean: 0.27 });
    case 'secure': return hands([-0.63, 0.94, 0.39], [-0.37, 0.94, 0.39 + 0.04 * wave(t, 1.2)], { nod: 0.4 });
    case 'radio': return hands(add(base, -0.16), [-0.38, 1.39, 0.72], { lean: 0, nod: 0, gr: 0.9 });
    default: return hands(add(base, -0.13), [-0.3, m === 'ecoCleanup' ? 1.32 : 1.2, 0.42], { gr: 0.15, nod: 0 });
  }
}

function keyHands(m: EcoMotion, key: string, u: number, t: number, n: number, H: number): Hands {
  switch (m) {
    case 'ecoPipette': return waterHands(key, u, t);
    case 'ecoLog': case 'ecoIdentify': case 'ecoImpact': case 'ecoPlan': case 'ecoMonitor': return reportHands(m, key, u, t, H);
    case 'ecoPot': return potHands(key, u, t);
    case 'ecoObserve': case 'ecoFeed': case 'ecoCount': return tankHands(m, key, u, t);
    case 'ecoSort': return sortHands(key, u, t, n);
    case 'ecoGear': return gearHands(key, u, t, H);
    case 'ecoCamera': return cameraHands(key, u, t);
    case 'ecoMount': return mountHands(key, u, t);
    case 'ecoTeach': return teachHands(key, u, t);
    default: return jeepHands(m, key, u, t);
  }
}

/** Blend the first 0.32 s of each beat, for both the hands and everything held by them. */
export function ecoNow(m: EcoMotion, t: number, ph: number, H = 1.6): Hands & { b: Beat } {
  const b = ecoBeat(m, t, ph);
  const a = keyHands(m, b.previous, 1, t, b.n, H);
  const c = keyHands(m, b.key, b.u, t, b.n, H);
  const e = sm(b.seconds, 0, 0.32);
  return {
    ...c, b,
    l: lerp(a.l, c.l, e), r: lerp(a.r, c.r, e),
    lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e),
    palms: mix(a.palms, c.palms, e), gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e),
    crouch: mix(a.crouch, c.crouch, e),
  };
}

export function ecoDoing(m: EcoMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const p = work?.point ?? b.base.clone().add(new THREE.Vector3(0, 1, 0));
  const s = ecoNow(m, t, ecoPhase(p), b.height);
  const world = (a: V) => p.clone().addScaledVector(left, -a[0]).addScaledVector(fwd, -a[2]).add(new THREE.Vector3(0, a[1] - 1, 0));
  return {
    reach: { l: world(s.l), r: world(s.r), lean: s.lean, nod: s.nod, palms: s.palms, grip: { l: s.gl, r: s.gr }, tap: s.tap },
    crouch: s.crouch || undefined,
  };
}
