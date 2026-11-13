import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * A harbour office's ship work (2026-10-27, the 해운 항만 사무소, at the user's request: the work
 * should look like the work). Each motion is a round of beats, each held a while and eased into the
 * next, by the same clock (sfPhase of the piece's work point) as the piece it's done at, so what's in
 * the hands and what the piece shows are drawn in step (workplaces/seafarer.ts):
 *
 * - sfHelm: at the bridge simulator's wheel — both hands on the spokes, put over to port and back,
 *   the engine lever pushed ahead, the binoculars up to the eyes sweeping the horizon, a finger on the
 *   ECDIS, the wheel put over to starboard, the lever eased back.
 * - sfLookout: a watch stood on the bridge — the binoculars swept slowly across, lowered, a line in
 *   the deck log, a glance at the radar, the binoculars up again.
 * - sfPlot: at the chart table — the parallel rulers walked from the compass rose to the course, the
 *   line pencilled along their edge, the dividers stepped along it, laid on the latitude scale to
 *   read the miles, the passage plan noted, the rulers slid back.
 * - sfCargo: sat at the stowage planner — typing, a container dragged into its slot on the bay plan,
 *   the manifest's pages turned, the stability screen looked over, leant back.
 * - sfRadar: sat at the radar — watching the sweep, the trackball rolled to put the cursor on a
 *   target, acquired, the range and bearing noted, the VHF handset up to call it, listened to.
 * - sfGear: at the rescue gear locker — the doors opened, a life jacket off its hook and its light and
 *   whistle checked, hung back, the immersion suit's bag unzipped and looked into, the liferaft's
 *   hydrostatic release tag read, the checklist ticked, the doors shut.
 * - sfDrill: an emergency drill run from the locker — the whistle blown, the muster station pointed
 *   to, a life jacket pulled on over the head and strapped, heads counted on the clipboard.
 * - sfVts: at the port VTS screen — watching the traffic, a ship pointed out, called on the VHF,
 *   listened to, logged.
 * - sfFax: at the weather fax — the chart printing, torn off, read, pinned up, the barometer tapped,
 *   the forecast written up.
 * - sfBitt: at the mooring bitts — crouched for the line, figure-eighted round the posts, heaved
 *   tight, the tail coiled down, set on the deck.
 * - sfBell: the ship's bell — the lanyard taken, rung two and two (the watch changing), let go.
 *
 * Kept out of activity.ts (which only hands these motions over here) so it imports nothing from it at
 * run time. A pose is worked out against a Frame: `o` places a point by its offset from the piece's
 * work point in the piece's own axes (x across, y up, z out of its front), `bd` by the body's (to their
 * left, up from the feet or the seat, ahead). The builder works the same poses out in the piece's frame.
 */
export type SeaMotion = 'sfHelm' | 'sfLookout' | 'sfPlot' | 'sfCargo' | 'sfRadar' | 'sfGear' | 'sfDrill' | 'sfVts' | 'sfFax' | 'sfBitt' | 'sfBell';
export const SEA_MOTIONS = new Set<string>(['sfHelm', 'sfLookout', 'sfPlot', 'sfCargo', 'sfRadar', 'sfGear', 'sfDrill', 'sfVts', 'sfFax', 'sfBitt', 'sfBell']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset: from where the piece's work point is, so two pieces aren't in step. */
export const sfPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const lerp = (a: number, b: number, e: number) => a + (b - a) * e;

// ---------------------------------------------------------------------------------------------
// Rounds of beats.

/** A round: each beat's key, how long it's held, and how long it takes to ease into the next. */
type Seq = Array<[string, number, number?]>;
export interface Beat {
  /** Which round this is (counts up), the beat's place in it, its key and the next one's. */
  n: number;
  i: number;
  from: string;
  to: string;
  /** How far through the hold (0–1; 1 while easing on). */
  u: number;
  /** How far eased into the next (0 while held). */
  e: number;
  /** The hold's length, seconds. */
  hold: number;
}
const MOVE = 0.7;
function beatOf(seq: Seq, t: number, phase: number): Beat {
  const T = seq.reduce((n, [, h, m = MOVE]) => n + h + m, 0);
  const c = t / T + phase;
  const n = Math.floor(c);
  let x = (c - n) * T;
  for (let i = 0; i < seq.length; i++) {
    const [key, hold, move = MOVE] = seq[i];
    const next = seq[(i + 1) % seq.length][0];
    if (x < hold) return { n, i, from: key, to: key, u: hold > 0 ? x / hold : 1, e: 0, hold };
    x -= hold;
    if (x < move || i === seq.length - 1) return { n, i, from: key, to: next, u: 1, e: sm(Math.min(1, x / move), 0, 1), hold };
    x -= move;
  }
  return { n, i: 0, from: seq[0][0], to: seq[0][0], u: 0, e: 0, hold: seq[0][1] };
}

/** Where things are worked out: the piece's work point and axes, the body's place and axes, how tall they are. */
export interface Frame {
  /** A point at an offset from the work point, in the piece's own axes (x across, y up, z out of its front). */
  o(dx: number, dy: number, dz: number): THREE.Vector3;
  /** A point from the body: to their left, up from the feet (or the seat), ahead of them. */
  bd(side: number, up: number, ahead: number): THREE.Vector3;
  H: number;
  k: number;
  sitting: boolean;
}
/** A frame: the work point and the piece's turn, the feet (or the seat's top) and the body's turn. */
export function frameAt(work: THREE.Vector3, pieceYaw: number, feet: THREE.Vector3, yaw: number, H: number, sitting = false): Frame {
  const c = Math.cos(pieceYaw);
  const s = Math.sin(pieceYaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return {
    o: (dx, dy, dz) => new THREE.Vector3(work.x + dx * c + dz * s, work.y + dy, work.z - dx * s + dz * c),
    bd: (side, up, ahead) => feet.clone().addScaledVector(left, side).addScaledVector(fwd, ahead).setY(feet.y + up),
    H,
    k: H / 1.6,
    sitting,
  };
}

/** Where the hands are and how the body goes with them. */
export interface Hands {
  l?: THREE.Vector3;
  r?: THREE.Vector3;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  tap?: boolean;
  crouch: number;
}
const hands = (h: Partial<Hands>): Hands => ({ lean: 0, nod: 0, palms: 0.4, gl: 0.3, gr: 0.3, crouch: 0, ...h });
function mixHands(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  const n = (p: number, q: number) => p + (q - p) * e;
  const v = (p?: THREE.Vector3, q?: THREE.Vector3) => (p && q ? p.clone().lerp(q, e) : e < 0.5 ? p : q);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean), nod: n(a.nod, b.nod), palms: n(a.palms, b.palms), gl: n(a.gl, b.gl), gr: n(a.gr, b.gr), tap: e < 0.5 ? a.tap : b.tap, crouch: n(a.crouch, b.crouch) };
}
/** A hand hanging easy at the side (+1 the left). */
const atSide = (f: Frame, side: number) => f.bd(side * 0.2 * f.k, 0.5 * f.H, 0.06 * f.k);
const chestY = (f: Frame) => (f.sitting ? 0.3 : 0.7) * f.H;
const mouthY = (f: Frame) => (f.sitting ? 0.46 : 0.86) * f.H;
const eyeY = (f: Frame) => (f.sitting ? 0.52 : 0.925) * f.H;
const waistY = (f: Frame) => (f.sitting ? 0.12 : 0.56) * f.H;

type KeyFn = (key: string, f: Frame, u: number, t: number, s: number, b: Beat) => Hands;
interface Round {
  seq: Seq;
  key: KeyFn;
  /** How far the spot turns from facing the piece square on (to their left +), by the beat. */
  turn: (b: Beat) => number;
  /** How far the spot steps along the piece (its +x), by the beat: along a chart table to its far end. */
  shift?: (b: Beat) => number;
}
/** A turn eased from one beat's to the next's. */
const turning = (by: Record<string, number>) => (b: Beat) => (by[b.from] ?? 0) + ((by[b.to] ?? 0) - (by[b.from] ?? 0)) * b.e;
/** The binoculars up at the eyes (both hands). */
const binoHands = (f: Frame, sway = 0): Pick<Hands, 'l' | 'r'> => ({
  l: f.bd((0.05 + sway) * f.k, eyeY(f) - 0.02 * f.k, 0.11 * f.k),
  r: f.bd((-0.05 + sway) * f.k, eyeY(f) - 0.02 * f.k, 0.11 * f.k),
});
/** Writing: a pen moving over a point. */
const writing = (p: THREE.Vector3, t: number, s: number) => p.clone().add(new THREE.Vector3(0.025 * wave(t, 2.2, s), 0.012 + 0.006 * wave(t, 4.4, s), 0.02 * wave(t, 1.1, s)));

// ---------------------------------------------------------------------------------------------
// The bridge simulator.

/**
 * The bridge's controls from the wheel's hub (the work point; the helmsman stood at +z facing -z, so
 * their left is the piece's -x): the wheel's radius, the engine lever's pivot to their right and its
 * length, the deck log on the console to their left, the ECDIS and radar screens.
 */
export const HELM = {
  R: 0.16,
  lever: [0.4, -0.08, -0.12] as const,
  leverLen: 0.15,
  log: [-0.36, -0.14, -0.24] as const,
  ecdis: [-0.42, 0.1, -0.38] as const,
  radar: [0.42, 0.1, -0.38] as const,
  /** Where a finger points at a screen from: short of it, toward the helmsman. */
  point: 0.22,
};
/** Where the wheel's put (radians, + to port), by the beat. */
function helmOf(key: string, u: number, t: number, s: number): number {
  if (key === 'port') return 0.95 * Math.sin(Math.PI * u);
  if (key === 'stbd') return -0.95 * Math.sin(Math.PI * u);
  return 0.06 * wave(t, 0.15, s);
}
/** The engine lever, 0 dead slow to 1 full ahead, by the beat. */
const LEVER_HOLD: Record<string, number> = { wheel: 0.15, port: 0.15, wheel2: 0.6, bino: 0.6, ecdis: 0.6, stbd: 0.6 };
function leverOf(key: string, u: number): number {
  if (key === 'ahead') return lerp(0.15, 0.6, sm(u, 0.2, 0.8));
  if (key === 'slow') return lerp(0.6, 0.15, sm(u, 0.2, 0.8));
  return LEVER_HOLD[key] ?? 0.15;
}
/** The lever's knob for its setting (it tips forward, away from them, for ahead). */
function leverKnob(f: Frame, q: number): THREE.Vector3 {
  const a = -0.7 + 1.4 * q;
  return f.o(HELM.lever[0], HELM.lever[1] + HELM.leverLen * Math.cos(a) + 0.015, HELM.lever[2] - HELM.leverLen * Math.sin(a));
}
const rim = (f: Frame, a: number) => f.o(HELM.R * Math.cos(a), HELM.R * Math.sin(a), 0.03);
const GRIP_L = Math.PI - 0.55;
const GRIP_R = 0.55;
const HELM_ROUND: Round = {
  seq: [['wheel', 3.6], ['port', 3.4, 0.5], ['ahead', 2.2, 0.6], ['wheel2', 2.2], ['bino', 4.6, 0.8], ['ecdis', 2.6, 0.7], ['stbd', 3.4, 0.5], ['slow', 2.0, 0.6]],
  turn: (b) => (b.from === 'bino' ? 0.36 * Math.sin(Math.PI * 2 * b.u) * (1 - b.e) : 0),
  key(key, f, u, t, s) {
    const h = helmOf(key, u, t, s);
    const wheel = { l: rim(f, GRIP_L + h), r: rim(f, GRIP_R + h) };
    switch (key) {
      case 'ahead':
      case 'slow':
        return hands({ l: wheel.l, r: leverKnob(f, leverOf(key, u)), lean: 0.08, nod: 0.2, palms: 0.5, gl: 0.9, gr: 0.9 });
      case 'bino':
        return hands({ ...binoHands(f), lean: 0, nod: -0.06 + 0.02 * wave(t, 0.3, s), palms: 0.2, gl: 0.85, gr: 0.85 });
      case 'ecdis':
        return hands({ l: wheel.l, r: f.o(HELM.ecdis[0] * 0.75 + 0.03 * wave(t, 0.5, s), HELM.ecdis[1] + 0.02 * wave(t, 0.4, s), HELM.ecdis[2] + HELM.point), lean: 0.2, nod: 0.3, palms: 0.3, gl: 0.9, gr: 0.15 });
      default:
        return hands({ ...wheel, lean: 0.05, nod: -0.06 + 0.03 * wave(t, 0.11, s), palms: 0.6, gl: 0.9, gr: 0.9 });
    }
  },
};
const LOOKOUT_ROUND: Round = {
  seq: [['bino', 5.2], ['lower', 1.4, 0.6], ['log', 3.6, 0.8], ['radar', 2.6, 0.7], ['bino2', 4.2, 0.8], ['rest', 2.2]],
  turn: (b) => (b.from === 'bino' || b.from === 'bino2' ? (b.from === 'bino' ? 0.42 : -0.42) * Math.sin(Math.PI * b.u) * (1 - b.e) : 0),
  // A step to the left to write up the log.
  shift: turning({ log: -0.2 }),
  key(key, f, _u, t, s) {
    const wheelL = rim(f, GRIP_L);
    switch (key) {
      case 'bino':
      case 'bino2':
        return hands({ ...binoHands(f), lean: 0, nod: -0.05, palms: 0.2, gl: 0.85, gr: 0.85 });
      case 'lower':
        return hands({ l: f.bd(0.06 * f.k, chestY(f) - 0.04 * f.k, 0.24 * f.k), r: f.bd(-0.06 * f.k, chestY(f) - 0.04 * f.k, 0.24 * f.k), lean: 0.02, nod: 0.05, palms: 0.2, gl: 0.85, gr: 0.85 });
      case 'log':
        return hands({ l: f.o(HELM.log[0] - 0.13, HELM.log[1] + 0.008, HELM.log[2] + 0.02), r: writing(f.o(HELM.log[0], HELM.log[1], HELM.log[2]), t, s), lean: 0.35, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.85 });
      case 'radar':
        return hands({ l: wheelL, r: f.o(HELM.radar[0] * 0.75, HELM.radar[1] + 0.02 * wave(t, 0.4, s), HELM.radar[2] + HELM.point), lean: 0.2, nod: 0.25, palms: 0.3, gl: 0.6, gr: 0.15 });
      default:
        return hands({ l: wheelL, r: rim(f, GRIP_R), lean: 0.04, nod: -0.04, palms: 0.6, gl: 0.7, gr: 0.7 });
    }
  },
};
/** The bridge now: the wheel's angle, the engine lever, the binoculars (up, lowered or put down), the beat. */
export function helmAt(m: 'sfHelm' | 'sfLookout', f: Frame, t: number, ph: number): { wheel: number; lever: number; bino: boolean; l?: THREE.Vector3; r?: THREE.Vector3; key: string } {
  const R = m === 'sfHelm' ? HELM_ROUND : LOOKOUT_ROUND;
  const b = beatOf(R.seq, t, ph);
  const s = ph * 7.1;
  const h = poseOf(R, f, t, ph);
  let wheel = 0;
  let lever = 0.3;
  if (m === 'sfHelm') {
    const a = helmOf(b.from, b.e > 0 ? 1 : b.u, t, s);
    wheel = b.e > 0 ? lerp(a, helmOf(b.to, 0, t, s), b.e) : a;
    const q = leverOf(b.from, b.e > 0 ? 1 : b.u);
    lever = b.e > 0 ? lerp(q, leverOf(b.to, 0), b.e) : q;
  }
  const up = (k: string) => k === 'bino' || k === 'bino2' || (m === 'sfLookout' && k === 'lower');
  const bino = b.e < 0.5 ? up(b.from) : up(b.to);
  return { wheel, lever, bino, l: h.l, r: h.r, key: b.from };
}

// ---------------------------------------------------------------------------------------------
// The chart table.

/**
 * The chart's marks from the work point (the chart's middle, on its top; piece axes, the navigator
 * stood at +z): the course line's ends, the compass rose, the latitude scale at its left edge, the
 * passage plan notebook at the right.
 */
export const CHART = {
  a: [-0.5, 0, 0.12] as const,
  b: [0.45, 0, -0.12] as const,
  rose: [0.38, 0, 0.12] as const,
  scale: [-0.74, 0, -0.02] as const,
  note: [0.66, 0, 0.2] as const,
  /** Half the parallel rulers' length and half their (closed) width. */
  rulerHalf: 0.2,
  rulerW: 0.035,
};
const dir = new THREE.Vector2(CHART.b[0] - CHART.a[0], CHART.b[2] - CHART.a[2]).normalize();
/** The course's heading on the chart (as the rulers lie: their length along it), about the vertical. */
export const COURSE_RY = Math.atan2(-dir.y, dir.x);
const perp = new THREE.Vector2(-dir.y, dir.x); // toward the navigator (+z mostly)
const rulerOnLine = (): [number, number] => [(CHART.a[0] + CHART.b[0]) / 2 + perp.x * CHART.rulerW, (CHART.a[2] + CHART.b[2]) / 2 + perp.y * CHART.rulerW];
const rulerAtRose = (): [number, number] => [CHART.rose[0], CHART.rose[2]];
/** Where the rulers lie (their middle, x and z from the work point) by the beat. */
function rulerOf(key: string, u: number): [number, number] {
  const R0 = rulerAtRose();
  const M = rulerOnLine();
  if (key === 'ruler') {
    // Walked across in three steps, one blade then the other.
    const k = Math.min(2.999, u * 3);
    const p = (Math.floor(k) + sm(k - Math.floor(k), 0.25, 0.85)) / 3;
    return [lerp(R0[0], M[0], p), lerp(R0[1], M[1], p)];
  }
  if (key === 'tidy') {
    const p = sm(u, 0.15, 0.85);
    return [lerp(M[0], R0[0], p), lerp(M[1], R0[1], p)];
  }
  if (key === 'look') return R0;
  return M;
}
const along = (x: number, z: number, d: number): [number, number] => [x + dir.x * d, z + dir.y * d];
const PLOT_ROUND: Round = {
  seq: [['look', 2.4], ['ruler', 4.4, 0.5], ['line', 3.2, 0.6], ['divide', 4.4, 0.6], ['read', 2.4, 0.9], ['note', 3.0, 0.9], ['tidy', 1.6, 0.6]],
  turn: () => 0,
  // Along the table: over to the rose for the rulers, to the left edge for the scale, to the notebook at the right.
  shift: (b) => {
    const at = (k: string, u: number) => (k === 'line' || k === 'divide' ? lerp(-0.22, 0.22, u) : ({ ruler: 0.12, read: -0.42, note: 0.4, tidy: 0.15 } as Record<string, number>)[k] ?? 0);
    return lerp(at(b.from, b.e > 0 ? 1 : b.u), at(b.to, 0), b.e);
  },
  key(key, f, u, t, s) {
    const [rx, rz] = rulerOf(key, u);
    switch (key) {
      case 'ruler': {
        const k = u * 3;
        const lift = (side: number) => (Math.floor(k) % 2 === (side > 0 ? 0 : 1) ? 0.02 * Math.sin(Math.PI * (k - Math.floor(k))) : 0);
        const [lx, lz] = along(rx, rz, -0.15);
        const [qx, qz] = along(rx, rz, 0.15);
        return hands({ l: f.o(lx, 0.022 + lift(1), lz), r: f.o(qx, 0.022 + lift(-1), qz), lean: 0.42, nod: 0.6, palms: 1.3, gl: 0.4, gr: 0.4 });
      }
      case 'line': {
        const p = sm(u, 0.1, 0.9);
        const [lx, lz] = along(rx, rz, -0.1);
        return hands({ l: f.o(lx, 0.02, lz), r: f.o(lerp(CHART.a[0], CHART.b[0], p), 0.03, lerp(CHART.a[2], CHART.b[2], p) + 0.01), lean: 0.45, nod: 0.62, palms: 1.2, gl: 0.3, gr: 0.85 });
      }
      case 'divide': {
        const k = Math.min(3.999, u * 4);
        const p = (Math.floor(k) + sm(k - Math.floor(k), 0.35, 0.85)) / 4;
        const hop = 0.035 * Math.sin(Math.PI * sm(k - Math.floor(k), 0.35, 0.85));
        return hands({ l: f.o(-0.25, 0.01, 0.3), r: f.o(lerp(CHART.a[0], CHART.b[0], p), 0.1 + hop, lerp(CHART.a[2], CHART.b[2], p)), lean: 0.42, nod: 0.6, palms: 0.9, gl: 0.2, gr: 0.8 });
      }
      case 'read':
        return hands({ l: f.o(-0.4, 0.01, 0.28), r: f.o(CHART.scale[0], 0.1, CHART.scale[2] + 0.02 * wave(t, 0.3, s)), lean: 0.45, nod: 0.62, palms: 0.9, gl: 0.2, gr: 0.8 });
      case 'note':
        return hands({ l: f.o(CHART.note[0] - 0.14, 0.01, CHART.note[2] + 0.03), r: writing(f.o(CHART.note[0], 0.005, CHART.note[2]), t, s), lean: 0.4, nod: 0.6, palms: 1.2, gl: 0.3, gr: 0.85 });
      case 'tidy': {
        const [lx, lz] = along(rx, rz, -0.12);
        return hands({ l: f.o(lx, 0.022, lz), r: f.o(0.3, 0.01, 0.3), lean: 0.38, nod: 0.5, palms: 1.2, gl: 0.4, gr: 0.3 });
      }
      default:
        return hands({ l: f.o(-0.3, 0.0, 0.38), r: f.o(0.3, 0.0, 0.38), lean: 0.3 + 0.03 * wave(t, 0.2, s), nod: 0.55, palms: 1.2, gl: 0.3, gr: 0.3 });
    }
  },
};
/** The chart table now: where the rulers lie (x, z from the work point), the dividers in the hand (their hinge) and how far open, the pencil in the hand. */
export function plotAt(f: Frame, t: number, ph: number): { ruler: [number, number]; dividers?: THREE.Vector3; spread: number; pencil?: THREE.Vector3; key: string } {
  const b = beatOf(PLOT_ROUND.seq, t, ph);
  const h = poseOf(PLOT_ROUND, f, t, ph);
  const r0 = rulerOf(b.from, b.e > 0 ? 1 : b.u);
  const r1 = b.e > 0 ? rulerOf(b.to, 0) : r0;
  const ruler: [number, number] = [lerp(r0[0], r1[0], b.e), lerp(r0[1], r1[1], b.e)];
  const key = b.e < 0.5 ? b.from : b.to;
  const dividers = key === 'divide' || key === 'read' ? h.r?.clone() : undefined;
  const pencil = key === 'line' || key === 'note' ? h.r?.clone() : undefined;
  return { ruler, dividers, spread: key === 'read' ? 0.07 : 0.1, pencil, key };
}

// ---------------------------------------------------------------------------------------------
// The stowage planner.

/** From the keyboard (the work point): the mouse, the manifest binder. */
export const CARGO = { mouse: [0.27, 0, 0.02] as const, binder: [-0.34, 0.02, -0.02] as const };
function dragOf(key: string, u: number): number {
  return key === 'drag' ? sm(u, 0.12, 0.85) : key === 'manifest' || key === 'type2' || key === 'stab' ? 1 : 0;
}
const CARGO_ROUND: Round = {
  seq: [['type', 3.4], ['drag', 4.4, 0.6], ['manifest', 3.0, 0.7], ['type2', 2.4], ['stab', 2.8, 0.8]],
  turn: () => 0,
  key(key, f, u, t, s) {
    const kb = (side: number, p: number) => f.o(side, 0.012 + 0.012 * Math.max(0, wave(t, 6.5, s + p)), 0.02);
    const mouse = (p: number) => f.o(CARGO.mouse[0] - 0.03 + 0.07 * p, 0.012, CARGO.mouse[2] + 0.025 - 0.05 * p + 0.008 * Math.sin(Math.PI * p));
    switch (key) {
      case 'type':
      case 'type2':
        return hands({ l: kb(-0.12, 0), r: kb(0.12, 0.5), lean: 0.22, nod: 0.2, palms: 1.45, gl: 0.35, gr: 0.35, tap: true });
      case 'drag':
        return hands({ l: f.o(-0.12, 0.012, 0.02), r: mouse(dragOf(key, u)), lean: 0.22, nod: 0.12, palms: 1.4, gl: 0.3, gr: 0.6 });
      case 'manifest':
        return hands({ l: f.o(CARGO.binder[0] + 0.05 * Math.max(0, wave(t, 0.5, s)), CARGO.binder[1] + 0.02 + 0.03 * Math.max(0, wave(t, 0.5, s)), CARGO.binder[2] + 0.03), r: mouse(1), lean: 0.32, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.5 });
      default:
        return hands({ l: f.o(-0.2, 0.0, 0.12), r: mouse(1), lean: -0.04, nod: 0.0, palms: 1.2, gl: 0.3, gr: 0.5 });
    }
  },
};
/** The bay plan now: which round (a container a round), how far this round's box has been dragged to its slot (0–1). */
export function cargoAt(t: number, ph: number): { n: number; drag: number; key: string } {
  const b = beatOf(CARGO_ROUND.seq, t, ph);
  const d0 = dragOf(b.from, b.e > 0 ? 1 : b.u);
  const d1 = b.e > 0 ? dragOf(b.to, 0) : d0;
  // Round's end: the next box starts from the list.
  const drag = b.from === 'stab' && b.e > 0 ? 1 : lerp(d0, d1, b.e);
  return { n: b.n, drag, key: b.from };
}

// ---------------------------------------------------------------------------------------------
// The radar.

/** From the trackball (the work point): the acquire key, the plotting sheet at the right, the VHF handset's hook at the left. */
export const RADAR = { acq: [-0.09, 0.005, 0.01] as const, sheet: [0.34, -0.02, 0.06] as const, hook: [-0.36, 0.1, -0.04] as const };
function cursorOf(key: string, u: number): number {
  return key === 'ball' ? sm(u, 0.1, 0.9) : key === 'acq' || key === 'note' || key === 'vhf' || key === 'listen' ? 1 : 0;
}
const RADAR_ROUND: Round = {
  seq: [['watch', 3.8], ['ball', 3.6, 0.5], ['acq', 1.4, 0.5], ['note', 3.2, 0.7], ['vhf', 3.6, 0.8], ['listen', 2.6, 0.8]],
  turn: () => 0,
  key(key, f, u, t, s) {
    const ball = f.o(0.012 * Math.cos(t * 5 + s), 0.03, 0.01 + 0.012 * Math.sin(t * 5 + s));
    const edgeL = f.o(-0.2, 0.0, 0.08);
    switch (key) {
      case 'ball':
        return hands({ l: edgeL, r: ball, lean: 0.24, nod: 0.05, palms: 1.3, gl: 0.3, gr: 0.6 });
      case 'acq': {
        const press = 0.012 * sm(u, 0.3, 0.5) * (1 - sm(u, 0.7, 0.9));
        return hands({ l: edgeL, r: f.o(RADAR.acq[0], RADAR.acq[1] + 0.02 - press, RADAR.acq[2]), lean: 0.24, nod: 0.12, palms: 1.2, gl: 0.3, gr: 0.4 });
      }
      case 'note':
        return hands({ l: f.o(0.18, 0.0, 0.08), r: writing(f.o(RADAR.sheet[0], RADAR.sheet[1], RADAR.sheet[2]), t, s), lean: 0.3, nod: 0.5, palms: 1.2, gl: 0.3, gr: 0.85 });
      case 'vhf':
        return hands({ l: f.bd(0.06 * f.k, mouthY(f) - 0.04 * f.k, 0.12 * f.k).add(new THREE.Vector3(0, 0.005 * wave(t, 1.3, s), 0)), r: ball, lean: 0.12, nod: 0.05 + 0.04 * Math.max(0, wave(t, 0.9, s)), palms: 1.0, gl: 0.85, gr: 0.6 });
      case 'listen':
        return hands({ l: f.bd(0.1 * f.k, eyeY(f) - 0.04 * f.k, 0.03 * f.k), r: ball, lean: 0.15, nod: 0.1, palms: 0.6, gl: 0.85, gr: 0.6 });
      default:
        return hands({ l: edgeL, r: f.o(0.2, 0.0, 0.08), lean: 0.2 + 0.03 * wave(t, 0.15, s), nod: 0.0, palms: 1.2, gl: 0.3, gr: 0.3 });
    }
  },
};
/** The radar now: which target this round, how far the cursor's got to it (0–1), whether it's acquired, the handset in the left hand. */
export function radarAt(f: Frame, t: number, ph: number): { n: number; cursor: number; acquired: boolean; handset?: THREE.Vector3; key: string } {
  const b = beatOf(RADAR_ROUND.seq, t, ph);
  const c0 = cursorOf(b.from, b.e > 0 ? 1 : b.u);
  const c1 = b.e > 0 ? cursorOf(b.to, 0) : c0;
  const acquired = (b.from === 'acq' && b.u > 0.45) || b.i > 2;
  const up = b.e < 0.5 ? b.from === 'vhf' || b.from === 'listen' : b.to === 'vhf' || b.to === 'listen';
  return { n: b.n, cursor: b.from === 'listen' && b.e > 0 ? 1 - b.e : lerp(c0, c1, b.e), acquired: acquired && !(b.from === 'listen' && b.e > 0.5), handset: up ? poseOf(RADAR_ROUND, f, t, ph).l : undefined, key: b.from };
}

// ---------------------------------------------------------------------------------------------
// The rescue gear locker.

/** From the work point (the middle of the locker's opening at chest height): the jacket's hook, the immersion suit's bag on the top shelf, the liferaft's release tag up on its cradle, the checklist's hook. */
export const GEAR = {
  hook: [-0.17, 0.12, -0.16] as const,
  suit: [0.14, 0.24, -0.14] as const,
  tag: [0.2, 0.52, -0.12] as const,
  clip: [0.18, -0.22, -0.12] as const,
};
function doorsOf(key: string, u: number): number {
  if (key === 'open') return sm(u, 0.1, 0.8);
  if (key === 'shut') return 1 - sm(u, 0.1, 0.8);
  return 1;
}
const GEAR_ROUND: Round = {
  seq: [['open', 1.4, 0.6], ['take', 1.0, 0.5], ['check', 3.4, 0.6], ['hang', 1.0, 0.6], ['suit', 3.2, 0.7], ['raft', 2.8, 0.8], ['clip', 0.8, 0.5], ['tick', 3.0, 0.7], ['shut', 1.4, 0.5]],
  turn: turning({ tick: 0.12 }),
  key(key, f, u, t, s) {
    const vest = (dx: number) => f.bd(dx * f.k, chestY(f) - 0.04 * f.k, 0.3 * f.k);
    switch (key) {
      case 'open': {
        // The two handles, swung out.
        const a = doorsOf(key, u);
        return hands({ l: f.o(-0.06 - 0.25 * a, -0.05, 0.03 + 0.25 * a), r: f.o(0.06 + 0.25 * a, -0.05, 0.03 + 0.25 * a), lean: 0.05, nod: 0.1, palms: 0.4, gl: 0.8, gr: 0.8 });
      }
      case 'shut': {
        const a = doorsOf(key, u);
        return hands({ l: f.o(-0.06 - 0.25 * a, -0.05, 0.03 + 0.25 * a), r: f.o(0.06 + 0.25 * a, -0.05, 0.03 + 0.25 * a), lean: 0.05, nod: 0.1, palms: -0.2, gl: 0.2, gr: 0.2 });
      }
      case 'take':
      case 'hang':
        return hands({ l: f.o(GEAR.hook[0] - 0.05, GEAR.hook[1] - 0.05, GEAR.hook[2] + 0.06), r: f.o(GEAR.hook[0] + 0.05, GEAR.hook[1], GEAR.hook[2] + 0.06), lean: 0.12, nod: -0.05, palms: 0.4, gl: 0.8, gr: 0.8 });
      case 'check':
        // The jacket held up; the right hand to its light on the shoulder, then the whistle on its cord.
        return hands({ l: vest(0.1), r: u < 0.5 ? vest(0.0).add(new THREE.Vector3(0, 0.12 * f.k, 0.0)) : vest(-0.06).add(new THREE.Vector3(0, 0.02 + 0.01 * wave(t, 2, s), 0.02)), lean: 0.04, nod: 0.38, palms: 0.4, gl: 0.8, gr: 0.6 });
      case 'suit': {
        const z = lerp(-0.06, 0.06, 0.5 + 0.5 * Math.sin(Math.PI * 2 * u));
        return hands({ l: f.o(GEAR.suit[0] - 0.12, GEAR.suit[1], GEAR.suit[2] + 0.08), r: f.o(GEAR.suit[0] + z, GEAR.suit[1] + 0.06, GEAR.suit[2] + 0.1), lean: 0.08, nod: -0.25, palms: 0.6, gl: 0.6, gr: 0.85 });
      }
      case 'raft':
        return hands({ l: atSide(f, 1), r: f.o(GEAR.tag[0], GEAR.tag[1] + 0.01 * wave(t, 0.6, s), GEAR.tag[2] + 0.05), lean: -0.04, nod: -0.5, palms: 0.2, gl: 0.3, gr: 0.6 });
      case 'clip':
        return hands({ l: atSide(f, 1), r: f.o(GEAR.clip[0], GEAR.clip[1] + 0.05, GEAR.clip[2] + 0.04), lean: 0.2, nod: 0.3, palms: 0.4, gl: 0.3, gr: 0.8 });
      case 'tick': {
        const board = f.bd(0.04 * f.k, chestY(f) - 0.1 * f.k, 0.3 * f.k);
        return hands({ l: board, r: writing(board.clone().add(f.bd(-0.07 * f.k, 0, 0).sub(f.bd(0, 0, 0))), t, s), lean: 0.05, nod: 0.5, palms: 1.0, gl: 0.8, gr: 0.85 });
      }
      default:
        return hands({ l: atSide(f, 1), r: atSide(f, -1), lean: 0, nod: 0 });
    }
  },
};
const DRILL_ROUND: Round = {
  seq: [['whistle', 3.4], ['point', 2.6, 0.8], ['don', 2.8, 0.8], ['strap', 2.6, 0.6], ['count', 3.6, 0.8]],
  // Turned round from the locker to the crew (π), and further to point the way to the muster station.
  turn: turning({ whistle: Math.PI - 0.15, point: Math.PI + 0.65, don: Math.PI, strap: Math.PI, count: Math.PI - 0.35 }),
  key(key, f, u, t, s) {
    switch (key) {
      case 'whistle': {
        // Seven short and one long: the general alarm.
        const blast = u < 0.65 ? Math.max(0, wave(t, 1.6, s)) : 1;
        return hands({ l: f.bd(0.2 * f.k, waistY(f) + 0.04 * f.k, 0.12 * f.k), r: f.bd(-0.01 * f.k, mouthY(f) - 0.01 * f.k, 0.08 * f.k), lean: -0.02 - 0.03 * blast, nod: -0.08, palms: 0.2, gl: 0.6, gr: 0.85 });
      }
      case 'point':
        return hands({ l: f.bd((0.36 + 0.03 * wave(t, 0.6, s)) * f.k, chestY(f) + 0.14 * f.k, 0.44 * f.k), r: atSide(f, -1), lean: 0, nod: -0.05, palms: -0.9, gl: 0.05, gr: 0.6 });
      case 'don': {
        // The jacket held up over the head and pulled down over it.
        const y = lerp(1.08, 0.82, sm(u, 0.35, 0.9)) * f.H;
        return hands({ l: f.bd(0.13 * f.k, y, 0.12 * f.k), r: f.bd(-0.13 * f.k, y, 0.12 * f.k), lean: 0, nod: -0.1 + 0.25 * sm(u, 0.4, 0.9), palms: 0.3, gl: 0.8, gr: 0.8 });
      }
      case 'strap': {
        const pull = 0.04 * Math.max(0, wave(t, 1.4, s));
        return hands({ l: f.bd((0.06 + pull) * f.k, waistY(f) + 0.08 * f.k, 0.15 * f.k), r: f.bd((-0.06 - pull) * f.k, waistY(f) + 0.08 * f.k, 0.15 * f.k), lean: 0.04, nod: 0.45, palms: 0.8, gl: 0.85, gr: 0.85 });
      }
      default: {
        const board = f.bd(0.06 * f.k, chestY(f) - 0.08 * f.k, 0.3 * f.k);
        return hands({ l: board, r: board.clone().add(new THREE.Vector3(0, 0.02 + 0.015 * Math.max(0, wave(t, 1.2, s)), 0)).add(f.bd(-0.08 * f.k, 0, 0).sub(f.bd(0, 0, 0))), lean: 0.02, nod: 0.15 + 0.2 * Math.max(0, wave(t, 0.4, s)), palms: 1.0, gl: 0.8, gr: 0.3 });
      }
    }
  },
};
/** The locker now: how far the doors are open (0–1), the life jacket (on its hook or in the hands), the checklist (on its hook or held). */
export function gearAt(f: Frame, t: number, ph: number): { doors: number; vest?: THREE.Vector3; clip?: THREE.Vector3; key: string } {
  const b = beatOf(GEAR_ROUND.seq, t, ph);
  const h = poseOf(GEAR_ROUND, f, t, ph);
  const d0 = doorsOf(b.from, b.e > 0 ? 1 : b.u);
  const doors = b.e > 0 ? lerp(d0, doorsOf(b.to, 0), b.e) : d0;
  const inHand = (b.from === 'take' && (b.u > 0.5 || b.e > 0)) || b.from === 'check' || (b.from === 'hang' && b.u < 0.5 && b.e === 0);
  const clipHeld = (b.from === 'clip' && (b.u > 0.5 || b.e > 0)) || b.from === 'tick';
  return {
    doors,
    vest: inHand && h.l && h.r ? h.l.clone().lerp(h.r, 0.5).add(new THREE.Vector3(0, -0.08, 0)) : undefined,
    clip: clipHeld ? (b.from === 'clip' ? h.r?.clone() : h.l?.clone()) : undefined,
    key: b.from,
  };
}
/** The drill now: the whistle at the mouth (in the right hand), the life jacket (held up, or on), the clipboard. */
export function drillAt(f: Frame, t: number, ph: number): { whistle?: THREE.Vector3; vest?: THREE.Vector3; worn: boolean; clip?: THREE.Vector3; key: string } {
  const b = beatOf(DRILL_ROUND.seq, t, ph);
  const h = poseOf(DRILL_ROUND, f, t, ph);
  const key = b.e < 0.5 ? b.from : b.to;
  const held = key === 'don' && b.from === 'don' && b.u < 0.6;
  const worn = (b.from === 'don' && b.u >= 0.6) || key === 'strap' || key === 'count';
  return {
    whistle: key === 'whistle' ? h.r?.clone() : undefined,
    vest: held && h.l && h.r ? h.l.clone().lerp(h.r, 0.5).add(new THREE.Vector3(0, -0.12, 0)) : worn ? f.bd(0, chestY(f) - 0.06 * f.k, 0.11 * f.k) : undefined,
    worn,
    clip: key === 'count' ? h.l?.clone() : undefined,
    key,
  };
}

// ---------------------------------------------------------------------------------------------
// The VTS screen, the weather fax, the bitts, the bell.

/** From the VTS desk's keyboard (the work point): the VHF handset's cradle at the left. */
export const VTS = { cradle: [-0.4, 0.02, -0.05] as const };
const VTS_ROUND: Round = {
  seq: [['watch', 3.2], ['point', 2.8, 0.8], ['call', 4.0, 0.8], ['listen', 3.0, 0.7], ['log', 3.2, 0.7]],
  turn: turning({ point: -0.12 }),
  key(key, f, _u, t, s) {
    const kb = (side: number, p: number) => f.o(side, 0.012 + 0.012 * Math.max(0, wave(t, 6.5, s + p)), 0.02);
    const edge = (side: number) => f.o(side, 0.0, 0.12);
    switch (key) {
      case 'point':
        return hands({ l: edge(-0.2), r: f.bd(-0.12 * f.k, 0.86 * f.H + 0.02 * wave(t, 0.5, s), 0.52 * f.k), lean: 0.04, nod: -0.3, palms: -0.9, gl: 0.3, gr: 0.1 });
      case 'call':
        return hands({ l: f.bd(0.06 * f.k, mouthY(f) - 0.04 * f.k, 0.12 * f.k).add(new THREE.Vector3(0, 0.005 * wave(t, 1.3, s), 0)), r: edge(0.15), lean: 0.06, nod: -0.15 + 0.04 * Math.max(0, wave(t, 0.9, s)), palms: 0.6, gl: 0.85, gr: 0.3 });
      case 'listen':
        return hands({ l: f.bd(0.1 * f.k, eyeY(f) - 0.04 * f.k, 0.03 * f.k), r: edge(0.15), lean: 0.06, nod: -0.25, palms: 0.6, gl: 0.85, gr: 0.3 });
      case 'log':
        return hands({ l: kb(-0.12, 0), r: kb(0.12, 0.5), lean: 0.25, nod: 0.35, palms: 1.45, gl: 0.35, gr: 0.35, tap: true });
      default:
        return hands({ l: edge(-0.2), r: edge(0.2), lean: 0.1, nod: -0.32 + 0.04 * wave(t, 0.12, s), palms: 1.2, gl: 0.3, gr: 0.3 });
    }
  },
};
/** The VTS desk now: the handset up (in the left hand), the ship pointed at picked out. */
export function vtsAt(f: Frame, t: number, ph: number): { handset?: THREE.Vector3; picked: boolean; n: number; key: string } {
  const b = beatOf(VTS_ROUND.seq, t, ph);
  const key = b.e < 0.5 ? b.from : b.to;
  const up = key === 'call' || key === 'listen';
  return { handset: up ? poseOf(VTS_ROUND, f, t, ph).l : undefined, picked: b.i >= 1 && b.i <= 3, n: b.n, key };
}

/** From the fax's paper slot (the work point): the board's spot for the new chart, the barometer, the forecast's write-up line. */
export const FAX = { pin: [0.0, 0.66, -0.33] as const, baro: [0.3, 0.84, -0.33] as const, board: [-0.2, 0.42, -0.33] as const };
const FAX_ROUND: Round = {
  seq: [['wait', 2.6], ['tear', 1.4, 0.5], ['read', 3.4, 0.7], ['pin', 2.4, 0.7], ['baro', 2.2, 0.6], ['note', 2.6, 0.7]],
  turn: () => 0,
  shift: turning({ baro: 0.15, note: -0.12 }),
  key(key, f, u, t, s) {
    switch (key) {
      case 'tear': {
        const snap = sm(u, 0.4, 0.55);
        return hands({ l: f.o(-0.09, 0.06 + 0.02 * snap, 0.03), r: f.o(0.09 + 0.03 * snap, 0.06 + 0.04 * snap, 0.03 + 0.02 * snap), lean: 0.15, nod: 0.45, palms: 0.2, gl: 0.7, gr: 0.7 });
      }
      case 'read':
        return hands({ l: f.bd(0.12 * f.k, chestY(f) + 0.04 * f.k, 0.3 * f.k), r: f.bd(-0.12 * f.k, chestY(f) + 0.04 * f.k, 0.3 * f.k), lean: 0.02, nod: 0.32, palms: 0.1, gl: 0.7, gr: 0.7 });
      case 'pin':
        return hands({ l: f.o(FAX.pin[0] - 0.11, FAX.pin[1] + 0.1, FAX.pin[2] + 0.03), r: f.o(FAX.pin[0] + 0.11, FAX.pin[1] + 0.1 - 0.02 * sm(u, 0.4, 0.6), FAX.pin[2] + 0.03), lean: 0.04, nod: -0.15, palms: 0.0, gl: 0.6, gr: 0.6 });
      case 'baro': {
        const tap = 0.012 * Math.max(0, wave(t, 2.4, s)) ** 3;
        return hands({ l: atSide(f, 1), r: f.o(FAX.baro[0], FAX.baro[1], FAX.baro[2] + 0.04 + tap), lean: 0.05, nod: -0.2, palms: 0.0, gl: 0.3, gr: 0.2 });
      }
      case 'note':
        return hands({ l: atSide(f, 1), r: f.o(FAX.board[0] + 0.1 * sm(u, 0, 1) + 0.02 * wave(t, 2.2, s), FAX.board[1] + 0.012 * wave(t, 4.4, s), FAX.board[2] + 0.03), lean: 0.03, nod: 0.0, palms: 0.0, gl: 0.3, gr: 0.85 });
      default:
        return hands({ l: f.o(-0.25, -0.02, 0.1), r: f.o(0.25, -0.02, 0.1), lean: 0.18, nod: 0.45, palms: 1.2, gl: 0.3, gr: 0.3 });
    }
  },
};
/** The fax now: how much of the chart's been printed (0–1), the sheet in the hands (its middle) or pinned up. */
export function faxAt(f: Frame, t: number, ph: number): { printed: number; held?: THREE.Vector3; pinned: boolean; n: number; key: string } {
  const b = beatOf(FAX_ROUND.seq, t, ph);
  const h = poseOf(FAX_ROUND, f, t, ph);
  const printed = b.from === 'wait' ? sm(b.e > 0 ? 1 : b.u, 0, 0.95) : b.from === 'tear' && b.u < 0.5 && b.e === 0 ? 1 : 0;
  const inHand = (b.from === 'tear' && (b.u >= 0.5 || b.e > 0)) || b.from === 'read' || (b.from === 'pin' && b.u < 0.55 && b.e === 0);
  const pinned = (b.from === 'pin' && (b.u >= 0.55 || b.e > 0)) || b.from === 'baro' || b.from === 'note';
  return { printed, held: inHand && h.l && h.r ? h.l.clone().lerp(h.r, 0.5) : undefined, pinned, n: b.n, key: b.from };
}

/** From the bitts' middle (the work point, at their caps' height): the posts either side, the coil on the deck. */
export const BITT = { post: 0.15, coil: [0.3, -0.29, 0.24] as const };
const BITT_ROUND: Round = {
  seq: [['grab', 1.4, 0.6], ['eight', 6.0, 0.6], ['heave', 1.6, 0.6], ['coil', 4.0, 0.7], ['set', 1.4, 0.7]],
  turn: turning({ coil: 0.2 }),
  key(key, f, u) {
    switch (key) {
      case 'grab':
        return hands({ l: f.o(BITT.coil[0] - 0.08, BITT.coil[1] + 0.08, BITT.coil[2]), r: f.o(BITT.coil[0] + 0.04, BITT.coil[1] + 0.08, BITT.coil[2] - 0.02), lean: 0.5, nod: 0.5, palms: 1.0, gl: 0.85, gr: 0.85, crouch: 0.75 });
      case 'eight': {
        const p = eightPoint(u);
        return hands({ l: f.o(0.05 + 0.04 * Math.sin(Math.PI * 4 * u), -0.02, 0.3), r: f.o(p[0], p[1], p[2]), lean: 0.4, nod: 0.5, palms: 0.8, gl: 0.85, gr: 0.85, crouch: 0.6 });
      }
      case 'heave': {
        const pull = sm(u, 0.1, 0.5) - 0.3 * sm(u, 0.6, 1);
        return hands({ l: f.bd(0.05 * f.k, (0.5 - 0.03 * pull) * f.H, (0.38 - 0.1 * pull) * f.k), r: f.bd(-0.05 * f.k, (0.48 - 0.03 * pull) * f.H, (0.3 - 0.1 * pull) * f.k), lean: 0.2 - 0.25 * pull, nod: 0.3, palms: 0.6, gl: 0.95, gr: 0.95, crouch: 0.25 });
      }
      case 'coil': {
        const a = Math.PI * 2 * frac(u * 4);
        return hands({ l: f.bd(0.12 * f.k, 0.58 * f.H, 0.25 * f.k), r: f.bd((0.02 + 0.08 * Math.cos(a)) * f.k, (0.58 + 0.08 * Math.sin(a)) * f.H, 0.3 * f.k), lean: 0.05, nod: 0.35, palms: 0.4, gl: 0.9, gr: 0.8 });
      }
      default:
        return hands({ l: f.o(BITT.coil[0] - 0.1, BITT.coil[1] + 0.1, BITT.coil[2]), r: f.o(BITT.coil[0] + 0.1, BITT.coil[1] + 0.1, BITT.coil[2]), lean: 0.5, nod: 0.5, palms: 1.0, gl: 0.6, gr: 0.6, crouch: 0.75 });
    }
  },
};
/** The running end carried in figure-eights round the two posts (two laps), from the bitts' middle. */
export function eightPoint(u: number): [number, number, number] {
  const a = Math.PI * 2 * 2 * u;
  return [0.24 * Math.sin(a), 0.03 - 0.12 * u + 0.02 * Math.cos(a), 0.12 * Math.sin(2 * a)];
}
/** The bitts now: the line's running end (in the right hand while it's worked), the coil (held, or down on the deck). */
export function bittAt(f: Frame, t: number, ph: number): { end?: THREE.Vector3; coil?: THREE.Vector3; key: string; u: number } {
  const b = beatOf(BITT_ROUND.seq, t, ph);
  const h = poseOf(BITT_ROUND, f, t, ph);
  const key = b.e < 0.5 ? b.from : b.to;
  const working = key === 'grab' || key === 'eight' || key === 'heave';
  return { end: working ? h.r?.clone() : undefined, coil: key === 'coil' ? h.l?.clone() : undefined, key, u: b.e > 0 ? 1 : b.u };
}

/** The bell: its lanyard's grip (the work point). */
const STRIKES = [0.12, 0.27, 0.58, 0.73];
function pullOf(key: string, u: number): number {
  if (key !== 'ring' && key !== 'ring2') return 0;
  let p = 0;
  for (const s of STRIKES) p = Math.max(p, Math.exp(-(((u - s) / 0.045) ** 2)));
  return p;
}
const BELL_ROUND: Round = {
  seq: [['reach', 1.2, 0.5], ['ring', 2.6, 0.4], ['hold', 1.8, 0.5], ['ring2', 2.6, 0.4], ['rest', 2.6, 0.8]],
  turn: turning({ rest: -0.4 }),
  key(key, f, u) {
    const grip = (p: number) => f.o(0, -0.07 * p, 0.03 + 0.05 * p);
    switch (key) {
      case 'ring':
      case 'ring2':
        return hands({ l: atSide(f, 1), r: grip(pullOf(key, u)), lean: 0.02, nod: -0.25, palms: 0.3, gl: 0.3, gr: 0.9 });
      case 'reach':
      case 'hold':
        return hands({ l: atSide(f, 1), r: grip(0), lean: 0.02, nod: -0.2, palms: 0.3, gl: 0.3, gr: 0.9 });
      default:
        return hands({ l: f.bd(0.05 * f.k, 0.48 * f.H, -0.08 * f.k), r: f.bd(-0.05 * f.k, 0.48 * f.H, -0.08 * f.k), lean: -0.02, nod: -0.05, palms: 0.4, gl: 0.4, gr: 0.4 });
    }
  },
};
/** The bell now: how hard the lanyard's pulled (0–1, the clapper swung with it), seconds since it last struck. */
export function bellAt(t: number, ph: number): { pull: number; since: number } {
  const b = beatOf(BELL_ROUND.seq, t, ph);
  const ringing = b.from === 'ring' || b.from === 'ring2';
  const u = b.e > 0 ? 1 : b.u;
  let since = 99;
  if (ringing) for (const s of STRIKES) if (u >= s) since = (u - s) * b.hold;
  if (b.from === 'hold' || b.from === 'rest') since = 99;
  return { pull: ringing ? pullOf(b.from, u) * (1 - b.e) : 0, since };
}

// ---------------------------------------------------------------------------------------------

const ROUNDS: Record<SeaMotion, Round> = {
  sfHelm: HELM_ROUND,
  sfLookout: LOOKOUT_ROUND,
  sfPlot: PLOT_ROUND,
  sfCargo: CARGO_ROUND,
  sfRadar: RADAR_ROUND,
  sfGear: GEAR_ROUND,
  sfDrill: DRILL_ROUND,
  sfVts: VTS_ROUND,
  sfFax: FAX_ROUND,
  sfBitt: BITT_ROUND,
  sfBell: BELL_ROUND,
};
function poseOf(R: Round, f: Frame, t: number, ph: number): Hands {
  const b = beatOf(R.seq, t, ph);
  const s = ph * 7.1;
  const a = R.key(b.from, f, b.e > 0 ? 1 : b.u, t, s, b);
  return b.e > 0 ? mixHands(a, R.key(b.to, f, 0, t, s, b), b.e) : a;
}
/** The spot's turn from square on now (the motion's own round). */
export const sfTurn = (m: SeaMotion, t: number, ph: number) => ROUNDS[m].turn(beatOf(ROUNDS[m].seq, t, ph));
/** How far the spot's stepped along the piece now (the motion's own round). */
export const sfShift = (m: SeaMotion, t: number, ph: number) => ROUNDS[m].shift?.(beatOf(ROUNDS[m].seq, t, ph)) ?? 0;
/** The hands for a motion worked out in a frame (the builder puts what's held in them). */
export const sfHands = (m: SeaMotion, f: Frame, t: number, ph: number) => poseOf(ROUNDS[m], f, t, ph);

/**
 * A dweller doing one of these: the frame from where they are and the piece's work point. Every spot of
 * these faces its piece square on (its yaw π in the piece's frame) turned by sfTurn, so the piece's
 * own turn is the body's less that.
 */
export function seaDoing(m: SeaMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const R = ROUNDS[m];
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.35).setY(b.base.y + (b.sitting ? 0.28 : 0.9));
  const ph = sfPhase(p);
  const f = frameAt(p, b.yaw - Math.PI - R.turn(beatOf(R.seq, t, ph)), b.base, b.yaw, b.height, b.sitting);
  const h = poseOf(R, f, t, ph);
  return { reach: { l: h.l, r: h.r, lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap }, crouch: h.crouch || undefined };
}
