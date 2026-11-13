import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/**
 * Electrician choreography. Hands, tools, breakers and displays share this clock.
 * Coordinates are in the fixture's frame, in metres; +z is its front. Every fixed
 * work marker is (0, 1, 0). All operators face -z, so even a moving platform can
 * use the same contacts. A tool's origin is its grip, never its decorative tip.
 */
export type ElMotion =
  | 'elWire' | 'elAssist' | 'elInspect' | 'elCut'
  | 'elDesign' | 'elReview' | 'elLoad'
  | 'elSite' | 'elEmergency' | 'elPanelLoad'
  | 'elLight' | 'elMegger' | 'elClamp' | 'elPpe' | 'elMeter'
  | 'elQuote' | 'elExplain';
export const EL_MOTIONS = new Set<string>([
  'elWire', 'elAssist', 'elInspect', 'elCut', 'elDesign', 'elReview', 'elLoad',
  'elSite', 'elEmergency', 'elPanelLoad', 'elLight', 'elMegger', 'elClamp',
  'elPpe', 'elMeter', 'elQuote', 'elExplain',
]);
export type V = readonly [number, number, number];
type Sequence = ReadonlyArray<readonly [string, number]>;
export const frac = (n: number) => ((n % 1) + 1) % 1;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const mix = (a: number, b: number, e: number) => a + (b - a) * e;
export const add = (p: V, x = 0, y = 0, z = 0): V => [p[0] + x, p[1] + y, p[2] + z];
export const lerp = (a: V, b: V, e: number): V => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
export const elPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number) => Math.sin(t * hz * Math.PI * 2);

/** Each operation has its own readable sequence, including the return of tools. */
const SEQUENCES: Record<ElMotion, Sequence> = {
  elWire: [['isolate', 1.5], ['strip', 2.2], ['feed', 2.3], ['terminal', 2.5], ['switch', 1.5], ['verify', 2], ['return', 1.5]],
  elAssist: [['listen', 1.7], ['select', 1.7], ['handover', 2.1], ['steady', 2.4], ['copy', 2.3], ['test', 1.8], ['return', 1.4]],
  elInspect: [['open', 1.6], ['lock', 1.6], ['prove', 1.7], ['probe', 2.7], ['thermal', 2.2], ['tick', 2], ['close', 1.6]],
  elCut: [['take', 1.5], ['pull', 2.4], ['measure', 2], ['cut', 1.8], ['coil', 2.6], ['tie', 1.7], ['shelve', 1.4]],
  elDesign: [['read', 1.5], ['route', 2.6], ['symbol', 2.1], ['type', 2.3], ['compare', 1.8], ['print', 1.6], ['file', 1.4]],
  elReview: [['open', 1.6], ['trace', 2.4], ['compare', 2], ['mark', 2.3], ['approve', 1.7], ['file', 1.6]],
  elLoad: [['read', 1.6], ['list', 2], ['calculate', 2.4], ['type', 2.1], ['check', 2], ['record', 2.2]],
  elSite: [['order', 1.6], ['lift', 1.8], ['load', 1.8], ['strap', 1.8], ['radio', 1.8], ['ready', 1.6]],
  elEmergency: [['radio', 2], ['map', 1.7], ['lamp', 1.6], ['lift', 1.7], ['load', 1.8], ['ready', 1.8]],
  elPanelLoad: [['order', 1.5], ['panel', 2], ['lift', 1.8], ['load', 2], ['strap', 2], ['check', 1.6]],
  elLight: [['isolate', 1.6], ['take', 1.8], ['connect', 2.5], ['springs', 2], ['fit', 2.4], ['test', 2], ['record', 1.8]],
  elMegger: [['isolate', 1.6], ['zero', 1.8], ['clip', 2], ['test', 2.8], ['discharge', 2], ['record', 2], ['return', 1.4]],
  elClamp: [['zero', 1.8], ['open', 1.8], ['clamp', 2.4], ['read', 2.4], ['record', 2], ['return', 1.7]],
  elPpe: [['helmet', 2], ['strap', 1.8], ['glove', 2.2], ['inflate', 2], ['lock', 2.2], ['tick', 2], ['return', 1.5]],
  elMeter: [['seal', 1.8], ['isolate', 1.6], ['terminal', 2.4], ['pulse', 2.3], ['read', 2], ['record', 2], ['sealBack', 1.5]],
  elQuote: [['greet', 1.6], ['listen', 2.3], ['measure', 2], ['calculate', 2.2], ['write', 2.3], ['offer', 2], ['agree', 1.8]],
  elExplain: [['greet', 1.5], ['diagram', 2.4], ['route', 2.2], ['sample', 2.2], ['question', 2.3], ['answer', 2], ['confirm', 1.8]],
};

export interface Beat {
  key: string;
  previous: string;
  i: number;
  u: number;
  n: number;
  seconds: number;
}
export function elBeat(m: ElMotion, t: number, ph: number): Beat {
  const seq = SEQUENCES[m];
  const duration = seq.reduce((n, [, d]) => n + d, 0);
  const cycle = t / duration + ph;
  let seconds = frac(cycle) * duration;
  for (let i = 0; i < seq.length; i++) {
    const [key, d] = seq[i];
    if (seconds < d || i === seq.length - 1) return {
      key, previous: seq[(i + seq.length - 1) % seq.length][0], i,
      u: seconds / d, n: Math.floor(cycle), seconds,
    };
    seconds -= d;
  }
  throw new Error('Empty electrician sequence');
}

/** These contacts also place the physical controls and tool racks in the builders. */
export const WIRE = {
  strip: [-0.25, 1.03, 0.24] as V,
  conduit: [-0.23, 1.3, -0.05] as V,
  terminal: [0.13, 1.28, 0] as V,
  switch: [0.39, 1.12, 0.025] as V,
  tool: [0.39, 0.93, 0.22] as V,
};
export const PANEL = {
  handle: [0.28, 1.18, 0.16] as V,
  breaker: [-0.19, 1.35, 0.05] as V,
  probeL: [-0.13, 1.08, 0.13] as V,
  probeR: [0.10, 1.08, 0.13] as V,
  page: [0.22, 0.87, 0.29] as V,
};
export const CABLE = {
  start: [-0.23, 0.94, 0.17] as V,
  end: [0.28, 0.94, 0.17] as V,
  cutter: [0.29, 0.97, 0.27] as V,
  coil: [0, 1.10, 0.31] as V,
};
export const DESK = {
  paper: [-0.20, 0.79, 0.18] as V,
  keys: [0.13, 0.80, 0.12] as V,
  calc: [0.32, 0.82, 0.21] as V,
  screen: [0.03, 1.14, -0.20] as V,
};
export const TEST = {
  knob: [-0.28, 1.01, 0.10] as V,
  clipL: [0.02, 1.12, 0.05] as V,
  clipR: [0.21, 1.12, 0.05] as V,
  wire: [0.15, 1.31, -0.07] as V,
  page: [0.28, 0.98, 0.30] as V,
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
const h = (l: V, r: V, extra: Partial<Hands> = {}): Hands => ({
  l, r, lean: 0.12, nod: 0.25, palms: 0.7, gl: 0.45, gr: 0.8,
  crouch: 0, tap: false, ...extra,
});
const restL: V = [-0.18, 0.96, 0.36];
const restR: V = [0.18, 0.96, 0.36];
const stroke = (p: V, t: number): V => add(p, 0.035 * wave(t, 0.8), 0.035, 0.012 * wave(t, 1.7));
const carry = (a: V, b: V, u: number): V => add(lerp(a, b, sm(u)), 0, 0.09 * Math.sin(Math.PI * sm(u)));

function wireHands(m: ElMotion, k: string, u: number, t: number): Hands {
  if (m === 'elAssist') {
    switch (k) {
      case 'listen': return h(restL, restR, { nod: 0.08 + 0.06 * wave(t, 0.8), gr: 0.2 });
      case 'select': return h(restL, carry(WIRE.tool, [0.15, 1.13, 0.29], u));
      case 'handover': return h(restL, [0.43, 1.14, 0.30], { palms: 0, gr: u < 0.55 ? 0.85 : 0.05 });
      case 'steady': return h([-0.26, 1.27, 0.06], [-0.05, 1.27, 0.06], { gl: 0.75, gr: 0.7, nod: 0.1 });
      case 'copy': return h(add(WIRE.terminal, -0.12), add(WIRE.terminal, 0, 0, 0.15), { palms: 0.3 + 0.15 * wave(t, 2.4) });
      case 'test': return h(restL, WIRE.switch, { gr: 0.25 });
      default: return h(restL, WIRE.tool);
    }
  }
  switch (k) {
    case 'isolate': return h(restL, [-0.43, 1.15, 0.05], { gr: 0.9, nod: 0.12 });
    case 'strip': return h(add(WIRE.strip, -0.09), add(WIRE.strip, 0.015 * wave(t, 2), 0, 0.02), { gl: 0.8, nod: 0.45 });
    case 'feed': return h(add(WIRE.conduit, -0.06, -0.12, 0.08), add(WIRE.conduit, 0.02, -0.08 + 0.13 * sm(u), 0.055), { gl: 0.7, nod: 0.1 });
    case 'terminal': return h(add(WIRE.terminal, -0.09, -0.02), add(WIRE.terminal, 0, 0, 0.16), { palms: 0.25 + 0.2 * wave(t, 2.5), gl: 0.7, nod: 0.1 });
    case 'switch': return h(restL, add(WIRE.switch, 0, 0.02 * (1 - sm(u, 0.2, 0.5)), 0.015), { gr: 0.2, tap: true });
    case 'verify': return h(restL, [0.23, 1.25, 0.24], { nod: -0.08, gr: 0.1, palms: -0.2 });
    default: return h(restL, WIRE.tool, { nod: 0.4 });
  }
}

export const panelDoorAngle = (open: number) => -1.65 * open;
function doorGrip(open: number): V {
  const a = panelDoorAngle(open);
  return [-0.39 + 0.50 * Math.cos(a) + 0.055 * Math.sin(a), 1.18,
    0.045 - 0.50 * Math.sin(a) + 0.055 * Math.cos(a)];
}
function panelHands(k: string, u: number, t: number): Hands {
  switch (k) {
    case 'open': return h(doorGrip(sm(u)), restR, { gl: 0.9, lean: 0.2 });
    case 'lock': return h(add(PANEL.breaker, -0.05), add(PANEL.breaker, 0.04, -0.06, 0.04), { gl: 0.8, nod: 0.1 });
    case 'prove': return h([-0.17, 0.97, 0.33], [0.01, 0.99, 0.34], { nod: 0.45 });
    case 'probe': return h(add(PANEL.probeL, 0, 0, 0.10), add(PANEL.probeR, 0, 0, 0.10), { gl: 0.9, gr: 0.9, lean: 0.20 });
    case 'thermal': return h(restL, [0.05 + 0.1 * wave(t, 0.3), 1.26, 0.37], { nod: 0.03 });
    case 'tick': return h([0.08, 0.91, 0.29], stroke(PANEL.page, t), { nod: 0.5, palms: 1.2, lean: 0.25 });
    default: return h(doorGrip(1 - sm(u)), restR, { gl: 0.8, lean: 0.2 });
  }
}

function cableHands(k: string, u: number, t: number): Hands {
  switch (k) {
    case 'take': return h(CABLE.start, add(CABLE.start, 0.08, 0.04), { nod: 0.5, gl: 0.8 });
    case 'pull': return h(CABLE.start, lerp(CABLE.start, CABLE.end, sm(u)), { nod: 0.5, gl: 0.8 });
    case 'measure': return h(CABLE.start, add(CABLE.end, 0, 0.035, 0), { nod: 0.55, palms: 1.2 });
    case 'cut': return h(add(CABLE.end, -0.09), add(CABLE.end, 0, 0.04, 0.025), { gr: 0.95, nod: 0.5, palms: 0.4 });
    case 'coil': return h(add(CABLE.coil, -0.08), add(CABLE.coil, 0.09 * Math.cos(u * 4 * Math.PI), 0.075 * Math.sin(u * 4 * Math.PI), 0.02), { gl: 0.8, nod: 0.4 });
    case 'tie': return h(add(CABLE.coil, -0.05), add(CABLE.coil, 0.04, 0.015 * wave(t, 2)), { gl: 0.9 });
    default: return h([-0.06, 0.83, 0.44], [0.20, 0.83, 0.44], { nod: 0.5, lean: 0.22 });
  }
}

function deskHands(m: ElMotion, k: string, u: number, t: number): Hands {
  const paper = DESK.paper;
  const left = add(paper, -0.09, 0.025);
  switch (k) {
    case 'read': case 'open': return h(left, add(paper, 0.10 * Math.cos(u * Math.PI), 0.05 + 0.09 * Math.sin(u * Math.PI)), { nod: 0.5, lean: 0.24 });
    case 'route': return h(left, add(paper, -0.05 + 0.14 * u, 0.03, -0.07 + 0.13 * u), { nod: 0.5, palms: 1.25 });
    case 'symbol': return h(left, add(paper, 0.05 * Math.cos(u * 6), 0.03, 0.04 * Math.sin(u * 6)), { nod: 0.5, palms: 1.2 });
    case 'type': return h(add(DESK.keys, -0.08, 0.015 * Math.max(0, wave(t, 5))), add(DESK.keys, 0.08, 0.015 * Math.max(0, -wave(t, 5))), { nod: 0.05, palms: 1.4, tap: true });
    case 'compare': return h(left, [0.15, 1.07, 0.05], { nod: u < 0.5 ? -0.02 : 0.4, gr: 0.15 });
    case 'trace': return h(left, add(paper, -0.07 + 0.15 * u, 0.035, 0.07 - 0.15 * u), { gr: 0.15, nod: 0.55, palms: 1.3 });
    case 'mark': case 'list': case 'record': return h(left, stroke(paper, t), { nod: 0.55, palms: 1.2 });
    case 'approve': return h(left, add(paper, 0.06, 0.08 + 0.08 * Math.abs(Math.sin(Math.PI * u)), 0.06), { palms: 0.2, gr: 1, nod: 0.5 });
    case 'calculate': return h(left, add(DESK.calc, 0.025 * wave(t, 1), 0.01 + 0.009 * Math.max(0, wave(t, 3))), { palms: 1.3, gr: 0.2, nod: 0.45, tap: true });
    case 'check': return h(left, [0.16, 1.05, 0.09], { gr: 0.15, nod: 0.0 });
    case 'print': return h(left, [0.33, 0.92, -0.06], { nod: 0.4 });
    default: return h(left, carry(paper, [-0.34, 0.83, -0.12], u), { nod: m === 'elReview' ? 0.4 : 0.3 });
  }
}

function testHands(m: ElMotion, k: string, u: number, t: number): Hands {
  const rest: V = [-0.16, 1.02, 0.30];
  if (m === 'elClamp') {
    switch (k) {
      case 'zero': return h(rest, [-0.18, 1.1, 0.26], { nod: 0.4, palms: 0.2 });
      case 'open': return h(rest, carry([-0.18, 1.1, 0.26], [0.15, 1.18, 0.04], u), { nod: 0.1 });
      case 'clamp': return h(rest, [0.15, 1.18, 0.04], { nod: 0.08 });
      case 'read': return h(rest, [0.10, 1.17, 0.34], { nod: 0.3 });
      case 'record': return h([0.10, 0.99, 0.32], stroke(TEST.page, t), { nod: 0.5, palms: 1.3 });
      default: return h(rest, [-0.43, 1.04, 0.16]);
    }
  }
  switch (k) {
    case 'isolate': return h(rest, [0.43, 1.27, -0.04], { nod: 0.08 });
    case 'zero': return h(rest, TEST.knob, { palms: 0.2 + 0.2 * wave(t, 1.5), nod: 0.4 });
    case 'clip': return h(TEST.clipL, TEST.clipR, { gl: 0.85, gr: 0.85, nod: 0.2 });
    case 'test': return h(rest, add(TEST.knob, 0.10, -0.01, 0.04), { gr: 0.2, nod: 0.4, tap: true });
    case 'discharge': return h(TEST.clipL, TEST.clipR, { gl: 0.7, gr: 0.7, nod: 0.3 });
    case 'record': return h([0.10, 0.99, 0.32], stroke(TEST.page, t), { palms: 1.3, nod: 0.5 });
    default: return h(rest, [-0.29, 1.04, 0.25]);
  }
}

function lightHands(k: string, u: number, t: number): Hands {
  const lamp: V = [0, 1.45, 0.30];
  const roof: V = [0, 2.10, 0.18];
  switch (k) {
    case 'isolate': return h([-0.18, 1.24, 0.34], [0.29, 1.32, 0.17], { nod: 0.2 });
    case 'take': {
      const p = carry([0.30, 1.29, 0.24], lamp, u);
      return h(add(p, -0.08), add(p, 0.08), { gl: 0.8, gr: 0.8 });
    }
    case 'connect': return h(add(lamp, -0.09), add(lamp, 0.05, 0.10, -0.04 + 0.01 * wave(t, 2)), { nod: -0.1 });
    case 'springs': return h(add(lamp, -0.10), add(lamp, 0.10), { gl: 0.9, gr: 0.9, nod: 0.05 });
    case 'fit': {
      const p = lerp(lamp, roof, sm(u, 0.05, 0.65));
      return h(add(p, -0.09), add(p, 0.09), { gl: 0.6, gr: 0.6, nod: -0.35, lean: -0.03 });
    }
    case 'test': return h([-0.18, 1.24, 0.34], [0.29, 1.32, 0.17], { nod: -0.32, gr: 0.2 });
    default: return h([-0.13, 1.28, 0.32], stroke([0.45, 1.28, 0.23], t), { nod: 0.4, palms: 1.2 });
  }
}

function ppeHands(k: string, u: number, t: number): Hands {
  const helmet: V = [-0.16, 1.26, 0.25];
  switch (k) {
    case 'helmet': return h(add(helmet, -0.12), add(helmet, 0.12), { gl: 0.7, gr: 0.7, nod: 0.15 });
    case 'strap': return h(add(helmet, -0.08, -0.1), add(helmet, 0.08, -0.1 + 0.02 * wave(t, 2)), { nod: 0.4 });
    case 'glove': return h([0, 1.12, 0.27], [0.12, 1.12, 0.27], { gl: 0.85, gr: 0.85, nod: 0.4 });
    case 'inflate': return h([-0.03, 1.29, 0.26], [0.09, 1.31, 0.26], { gl: 0.8, gr: 0.75, nod: 0.2 });
    case 'lock': return h([0.27, 1.22, 0.03], [0.33, 1.22, 0.04], { nod: 0.15, gr: 0.9 });
    case 'tick': return h([-0.13, 0.94, 0.25], stroke([0.10, 0.94, 0.25], t), { nod: 0.5, palms: 1.2 });
    default: return h(restL, carry([0.09, 1.29, 0.26], [0.04, 1.17, -0.07], u));
  }
}

function meterHands(k: string, u: number, t: number): Hands {
  switch (k) {
    case 'seal': case 'sealBack': return h([-0.11, 1.12, 0.17], [0.12, 1.12 + 0.015 * Math.sin(u * Math.PI), 0.17], { gl: 0.8, nod: 0.2 });
    case 'isolate': return h(restL, [-0.27, 1.0, 0.11], { nod: 0.3 });
    case 'terminal': return h([-0.10, 1.13, 0.11], [0.05, 1.10, 0.25], { palms: 0.3 + 0.2 * wave(t, 2), nod: 0.2 });
    case 'pulse': return h(restL, [0.18, 1.42, 0.14], { gr: 0.1, nod: 0 });
    case 'read': return h(restL, [0.04, 1.30, 0.23], { gr: 0.15, nod: 0.05 });
    default: return h([-0.12, 0.92, 0.27], stroke([0.14, 0.91, 0.27], t), { nod: 0.5, palms: 1.3 });
  }
}

function vanHands(m: ElMotion, k: string, u: number, t: number): Hands {
  const gripY = m === 'elPanelLoad' ? 1.03 : 1.07;
  const box: V = [-0.30, gripY, 0.57];
  switch (k) {
    case 'order': case 'map': return h([-0.43, 1.04, 0.51], [-0.18, 1.06, 0.50], { nod: 0.5, palms: 1.2 });
    case 'panel': {
      const p = carry([-0.30, 0.57, 0.59], box, u);
      return h(add(p, -0.15), add(p, 0.15), { gl: 0.9, gr: 0.9, nod: 0.3, crouch: 0.25 * (1 - u), lean: 0.23 });
    }
    case 'lift': {
      const p = m === 'elPanelLoad' ? box : carry([-0.30, 0.61, 0.59], box, u);
      return h(add(p, -0.15), add(p, 0.15), { gl: 0.95, gr: 0.95, crouch: 0.25 * (1 - u), nod: 0.4, lean: 0.23 });
    }
    case 'load': return h([-0.45, gripY, 0.57 - 0.28 * sm(u)], [-0.15, gripY, 0.57 - 0.28 * sm(u)], { gl: 0.85, gr: 0.85, lean: 0.25 });
    case 'strap': return h([-0.47, 1.03, 0.38], [-0.13, 1.03, 0.38 + 0.02 * wave(t, 2)], { nod: 0.4, lean: 0.25 });
    case 'lamp': return h([-0.45, 0.99, 0.54], [-0.23, 1.18, 0.55], { nod: 0.1 });
    case 'radio': return h([-0.45, 1.0, 0.53], [-0.14, 1.40, 0.76], { nod: 0, lean: 0 });
    default: return h([-0.44, 0.99, 0.57], [-0.12, m === 'elEmergency' ? 1.30 : 1.14, 0.50], { nod: 0, gr: 0.15 });
  }
}

function consultHands(m: ElMotion, k: string, u: number, t: number): Hands {
  const left: V = [-0.28, 0.82, 0.25];
  const page: V = [-0.05, 0.83, 0.08];
  switch (k) {
    case 'greet': return h(left, [0.12, 1.04, 0.19], { nod: 0.1, gr: 0.05, palms: -0.3 });
    case 'listen': case 'question': return h(left, [0.10, 0.87, 0.26], { nod: 0.05 + 0.06 * wave(t, 0.8), gr: 0.15 });
    case 'measure': return h(add(page, -0.15, 0.01), add(page, 0.15, 0.01), { nod: 0.45, palms: 1.2 });
    case 'calculate': return h(left, [0.28 + 0.02 * wave(t, 1), 0.84, 0.21], { nod: 0.4, palms: 1.3, tap: true });
    case 'write': return h(left, stroke(page, t), { nod: 0.5, palms: 1.2 });
    case 'offer': return h(left, carry(page, [0.08, 0.84, -0.13], u), { lean: 0.3, nod: 0.35 });
    case 'diagram': return h(left, [-0.03, 1.0, 0.03], { nod: 0.2, gr: 0.25 });
    case 'route': return h(left, [-0.17 + 0.25 * u, 0.88, 0.03 - 0.10 * u], { nod: 0.4, gr: 0.1 });
    case 'sample': return h(left, [0.06, 1.08, 0.13], { nod: 0.1 });
    case 'answer': return h([-0.22, 1.02, 0.21], [0.14, 1.03, 0.12 + 0.04 * wave(t, 0.6)], { gl: 0.05, gr: 0.05, palms: -0.2, nod: 0 });
    default: return h(left, [0.12, 0.93, 0.04], { gr: 0.15, nod: m === 'elQuote' ? 0.08 : 0.15 });
  }
}

function keyHands(m: ElMotion, key: string, u: number, t: number): Hands {
  switch (m) {
    case 'elWire': case 'elAssist': return wireHands(m, key, u, t);
    case 'elInspect': return panelHands(key, u, t);
    case 'elCut': return cableHands(key, u, t);
    case 'elDesign': case 'elReview': case 'elLoad': return deskHands(m, key, u, t);
    case 'elMegger': case 'elClamp': return testHands(m, key, u, t);
    case 'elLight': return lightHands(key, u, t);
    case 'elPpe': return ppeHands(key, u, t);
    case 'elMeter': return meterHands(key, u, t);
    case 'elQuote': case 'elExplain': return consultHands(m, key, u, t);
    default: return vanHands(m, key, u, t);
  }
}

/** Blend contacts over the first .35 seconds of every beat, for tools and hands alike. */
export function elNow(m: ElMotion, t: number, ph: number): Hands & { b: Beat } {
  const b = elBeat(m, t, ph);
  const a = keyHands(m, b.previous, 1, t);
  const c = keyHands(m, b.key, b.u, t);
  const e = sm(b.seconds, 0, 0.35);
  return {
    ...c, b, l: lerp(a.l, c.l, e), r: lerp(a.r, c.r, e),
    lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e),
    palms: mix(a.palms, c.palms, e), gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e),
    crouch: mix(a.crouch, c.crouch, e),
  };
}

export function elDoing(m: ElMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const p = work?.point ?? b.base.clone().add(new THREE.Vector3(0, 1, 0));
  const s = elNow(m, t, elPhase(p));
  const world = (v: V) => p.clone().addScaledVector(left, -v[0]).addScaledVector(fwd, -v[2]).add(new THREE.Vector3(0, v[1] - 1, 0));
  return {
    reach: { l: world(s.l), r: world(s.r), lean: s.lean, nod: s.nod, palms: s.palms, grip: { l: s.gl, r: s.gr }, tap: s.tap },
    crouch: s.crouch || undefined,
  };
}
