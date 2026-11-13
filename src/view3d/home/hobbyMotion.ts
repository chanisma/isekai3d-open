import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';

/*
 * The hobbies at home (2026-11-01, at the user's request). In the piece's own frame (x across as you face its front,
 * y up, z out of its front; facing the piece the dweller's right hand is on +x), each timed from when they began. What's in
 * the hand goes through handTool.ts: `hold` names it and hobby.ts sets Spot.held from that.
 * - hfStar (망원경, 별 보기): stooped to the eyepiece, the focus knob turned, then a step back to look up with the bare eye.
 * - hfSky (하늘 관찰): the tube swung slowly over the sky, the body going round behind it.
 * - hfSpy (이웃 염탐): the tube down level and aside; every so often a look round to see who's watching.
 * - hfChess: sat on a stool to one side of the board (hobby.ts runs the game and says what the hand has to do).
 * - hfPsych, hfSilly, hfGussy, hfCalm, hfRomance, hfComedy, hfSpeech, hfHair: at the mirror, each its own business; the comb off
 *   the ledge for hair and for tidying up.
 * - hfWardrobe: a hanger off the rail, held up against the chest, hung back.
 * - hfPaint: the palette off the stand in the left hand, the brush in the right, the paint loaded and laid on stroke by stroke.
 * - hfViolin: out of its case, under the chin, the bow drawn; put back at the end of a round.
 * - hfGuitar: off its stand, on its strap across the body, the left hand changing chords, the right strumming.
 * - hfPhoto: the camera off the tripod, to the eye, a shot, a look at the screen, somewhere else for the next.
 * - hfSow, hfWater, hfWeed, hfPick: at the planter, with the seed packet, the can, a weed, a fruit into the basket.
 * - hfRead: the right book off its shelf, turned away from the shelf, opened and read in its own way, put back.
 */
export type HfMotion =
  | 'hfStar' | 'hfSky' | 'hfSpy' | 'hfChess'
  | 'hfPsych' | 'hfSilly' | 'hfGussy' | 'hfCalm' | 'hfRomance' | 'hfComedy' | 'hfSpeech' | 'hfHair'
  | 'hfWardrobe' | 'hfPaint' | 'hfViolin' | 'hfGuitar' | 'hfPhoto'
  | 'hfSow' | 'hfWater' | 'hfWeed' | 'hfPick' | 'hfRead';
export const HF_MOTIONS = new Set<string>(['hfStar', 'hfSky', 'hfSpy', 'hfChess', 'hfPsych', 'hfSilly', 'hfGussy', 'hfCalm', 'hfRomance', 'hfComedy', 'hfSpeech', 'hfHair', 'hfWardrobe', 'hfPaint', 'hfViolin', 'hfGuitar', 'hfPhoto', 'hfSow', 'hfWater', 'hfWeed', 'hfPick', 'hfRead']);

/** A round of each, seconds at normal speed (SPEEDS[1] is 2 game minutes a second): about its interaction's duration. */
export const HF_SECONDS: Record<HfMotion, number> = { hfStar: 30, hfSky: 22.5, hfSpy: 15, hfChess: 60, hfPsych: 4, hfSilly: 2.5, hfGussy: 10, hfCalm: 15, hfRomance: 15, hfComedy: 20, hfSpeech: 22.5, hfHair: 7.5, hfWardrobe: 3, hfPaint: 45, hfViolin: 22.5, hfGuitar: 22.5, hfPhoto: 20, hfSow: 7.5, hfWater: 3, hfWeed: 5, hfPick: 4, hfRead: 30 };
/** These happen once and hold at the end; the rest go round for as long as it takes. */
const ONCE = new Set<HfMotion>(['hfPaint', 'hfWardrobe']);

export type V = [number, number, number];
export type HfTool = 'comb' | 'outfit' | 'brush' | 'violin' | 'guitar' | 'camera' | 'packet' | 'can' | 'weed' | 'fruit' | 'book';
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const sm = (u: number, a: number, b: number) => {
  const k = clamp((u - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const mix = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const vec = (a: V) => new THREE.Vector3(a[0], a[1], a[2]);
const X = new THREE.Vector3();
/** The turn that puts a thing's +y along `y` and its +z as near `z` as that lets it. */
export function basisQ(y: V, z: V): THREE.Quaternion {
  const Y = vec(unit(y));
  const Z = vec(z).addScaledVector(Y, -vec(z).dot(Y));
  if (Z.lengthSq() < 1e-6) Z.set(Y.y, Y.z, Y.x);
  Z.normalize();
  X.crossVectors(Y, Z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}
const blend = (a: THREE.Quaternion, b: THREE.Quaternion, e: number) => a.clone().slerp(b, clamp(e, 0, 1));
const lift = (q: THREE.Quaternion, v: V, k = 1): V => {
  const p = vec(v).multiplyScalar(k).applyQuaternion(q);
  return [p.x, p.y, p.z];
};
const plus = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---- The places: hobby.ts builds each piece to these.

/** The telescope: the mount's pivot (its height follows who's at it), how far behind it the eyepiece's riser stands and how tall that is. */
export const SC = { pivotY: 1.44, pivotZ: -0.02, back: 0.34, riser: 0.1 };
export const scopePivotY = (H: number, alt: number) => clamp(SC.pivotY + (H - 1.6) * 0.92 - Math.max(0, 0.4 - alt) * 0.35, 0.92, 1.6);
export function scopeEye(H: number, alt: number, az: number): V {
  const c = Math.cos(alt) * SC.back;
  return [Math.sin(az) * c, scopePivotY(H, alt) - Math.sin(alt) * SC.back + SC.riser, SC.pivotZ + Math.cos(az) * c];
}
/** Where the tube points at `u` of a use: its height above the horizon and its turn. */
export function scopeAim(m: 'hfStar' | 'hfSky' | 'hfSpy', u: number): { alt: number; az: number } {
  if (m === 'hfStar') return { alt: 0.82 + 0.1 * Math.sin(u * Math.PI * 2), az: 0.22 * Math.sin(u * Math.PI * 2 + 0.7) };
  if (m === 'hfSky') return { alt: 0.62 + 0.14 * Math.sin(u * Math.PI * 4), az: 0.5 * Math.sin(u * Math.PI * 2) };
  return { alt: 0.05 + 0.02 * Math.sin(u * 40), az: -0.42 + 0.14 * Math.sin(u * Math.PI * 4) };
}

/** The chess table: the top of the board, a square's size, how far out each dweller sits, the clock. */
export const CH = { top: 0.77, sq: 0.05, seat: 0.5, seatY: 0.46, tuck: 0.2, clock: [0, 0.82, 0.265] as V };
export const chessSquare = (file: number, rank: number): V => [(rank - 3.5) * CH.sq, CH.top, (file - 3.5) * CH.sq];
/** What one player's hand is doing, told by the table (it runs the game): null, thinking. */
export interface ChessHand {
  /** The piece's place now and its top, and how far on the move is: 0–0.25 reaching, then carried, 0.8 let go. */
  piece?: V;
  u?: number;
  /** A press of the clock (0–1, 1 down on it). */
  tap?: number;
}
/** The mirror: where the ledge's comb lies, from the glass. */
export const MR = { comb: [0.33, 1.05, 0.06] as V, stand: 0.44 };
/** The wardrobe: its front face and where a hanger's hook hangs. */
export const WD = { front: 0.12, hook: [0.1, 1.6, -0.16] as V, stand: 0.36 };
/** The easel: the canvas (its middle at a height that follows who's painting), the palette's stand. */
export const EZ = { z: 0.04, w: 0.62, h: 0.5, tilt: 0.12, y: 1.16, stand: 0.41, rest: [-0.37, 0.8, 0.14] as V };
export const easelY = (H: number) => clamp(EZ.y + Math.min(0, H - 1.6) * 0.72, 0.8, EZ.y);
/** A point on the canvas (-1 to 1 each way, up +y), in the piece's frame. */
export function easelPoint(px: number, py: number, H: number): V {
  const h = (py * EZ.h) / 2;
  return [(px * EZ.w) / 2, easelY(H) + h * Math.cos(EZ.tilt), EZ.z - h * Math.sin(EZ.tilt) + 0.018];
}
export const VI = { rest: [0.24, 0.755, -0.2] as V, stand: 0.25 };
export const GT = { rest: [0, 0.42, -0.16] as V, stand: 0.28 };
export const CM = { rest: [0, 1.2, -0.1] as V, stand: 0.36 };
/** The planter: the top of its soil, the three plants along it, the side shelf's can, packet and basket. */
export const PT = {
  soil: 0.79,
  z: -0.18,
  plants: [-0.28, -0.06, 0.16],
  can: [0.38, 1.03, 0.1] as V,
  packet: [0.38, 0.87, -0.03] as V,
  basket: [0.38, 0.9, -0.17] as V,
  stand: 0.38,
  x: -0.04,
  weeds: [[0.06, 0.8, -0.07], [-0.19, 0.8, -0.09], [-0.36, 0.8, -0.27]] as V[],
  fruit: [[-0.21, 1.02, -0.07], [0.09, 1.08, -0.08], [-0.02, 0.98, -0.08], [0.23, 1.0, -0.08], [-0.35, 1.09, -0.08], [-0.1, 1.14, -0.08]] as V[],
};
/** A book's place on the shelf and what kind it is, by interaction. */
export type BookKind = 'novel' | 'psych' | 'logic' | 'cook' | 'garden' | 'gourmet';
export interface BookPlace {
  kind: BookKind;
  slot: V;
  /** Its size: tall as `h`, each page as wide as `w`. */
  h: number;
  w: number;
  seconds: number;
}
export const BK: Record<string, BookPlace> = {
  read: { kind: 'novel', slot: [-0.2, 1.21, -0.16], h: 0.19, w: 0.12, seconds: 22.5 },
  readPsychology: { kind: 'psych', slot: [0.22, 1.22, -0.16], h: 0.21, w: 0.135, seconds: 30 },
  readLogic: { kind: 'logic', slot: [-0.2, 0.88, -0.16], h: 0.2, w: 0.14, seconds: 30 },
  cookbook: { kind: 'cook', slot: [0.14, 0.89, -0.16], h: 0.25, w: 0.17, seconds: 30 },
  gardenBook: { kind: 'garden', slot: [-0.24, 0.54, -0.16], h: 0.23, w: 0.16, seconds: 30 },
  gourmetBook: { kind: 'gourmet', slot: [0.26, 0.55, -0.16], h: 0.26, w: 0.17, seconds: 30 },
};

// ---- Paint: what's laid on the canvas, stroke by stroke, so the brush and the picture keep together.

export interface Stroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  c: string;
}
const rnd = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const hex = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(k, 0, 1)).getHexString();
export const PAINT_N = 77;
/** Three pictures of no place in particular: hills under a sun, flowers in a jug, boats on a bay. */
export function paintPlan(which: number): Stroke[] {
  const k = ((Math.floor(which) % 3) + 3) % 3;
  const r = rnd(101 + k * 37);
  const out: Stroke[] = [];
  const add = (x0: number, y0: number, x1: number, y1: number, w: number, c: string) => out.push({ x0, y0, x1, y1, w, c });
  const band = (n: number, y0: number, y1: number, a: string, b: string, w: number) => {
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : 0;
      const y = y0 + (y1 - y0) * f;
      const flip = i % 2 ? -1 : 1;
      add(-0.92 * flip, y + (r() - 0.5) * 0.04, 0.92 * flip, y + (r() - 0.5) * 0.04, w, hex(a, b, f));
    }
  };
  if (k === 0) {
    band(16, 0.92, 0.12, '#7fb2dc', '#f5d9b0', 0.14);
    for (let i = 0; i < 5; i++) add(0.42 + r() * 0.06, 0.6 + r() * 0.06, 0.46 + r() * 0.06, 0.58 + r() * 0.06, 0.09, '#fff0b8');
    band(8, 0.16, -0.05, '#7f9ab0', '#6d9a78', 0.12);
    band(14, -0.08, -0.9, '#8fb35e', '#5a7f3c', 0.16);
    for (let i = 0; i < 16; i++) {
      const x = -0.75 + (i % 8) * 0.12 + r() * 0.05;
      const y = -0.05 - (i > 7 ? 0.2 : 0) + r() * 0.05;
      add(x, y, x + 0.05, y + 0.12, 0.09, i % 3 ? '#3f6b3a' : '#2f5630');
    }
    for (let i = 0; i < 18; i++) {
      const x = -0.85 + r() * 1.7;
      const y = -0.35 - r() * 0.5;
      add(x, y, x + 0.04, y + 0.02, 0.035, ['#e8c95a', '#d9745a', '#f4efd8'][i % 3]);
    }
  } else if (k === 1) {
    band(20, 0.92, -0.35, '#d9c7a8', '#c9ab86', 0.15);
    band(6, -0.42, -0.9, '#8a5a3e', '#6d4530', 0.14);
    for (let i = 0; i < 10; i++) add(-0.2 + (i % 5) * 0.09, -0.55, -0.2 + (i % 5) * 0.09, -0.12 - (i % 2) * 0.05, 0.1, i % 2 ? '#4e7fa8' : '#6a9cc4');
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28;
      add(0, -0.08, Math.cos(a) * 0.45, 0.15 + Math.abs(Math.sin(a)) * 0.45, 0.025, '#4f7f46');
    }
    for (let i = 0; i < 27; i++) {
      const a = r() * 6.28;
      const d = 0.15 + r() * 0.42;
      const x = Math.cos(a) * d;
      const y = 0.32 + Math.sin(a) * d * 0.75;
      add(x, y, x + 0.03, y + 0.03, 0.1 - (i % 3) * 0.02, ['#d9534f', '#f0a43c', '#f3e0a0', '#c8579a'][i % 4]);
    }
  } else {
    band(14, 0.92, 0.12, '#f3c9a0', '#9fc4dc', 0.14);
    band(22, 0.1, -0.9, '#6fa8c8', '#2f6d94', 0.11);
    for (let i = 0; i < 12; i++) {
      const x = -0.65 + (i % 3) * 0.55 + (i > 5 ? 0.1 : 0);
      const y = -0.12 - (i > 5 ? 0.3 : 0);
      if (i % 2) add(x - 0.13, y, x + 0.13, y - 0.01, 0.07, i % 4 === 1 ? '#a85438' : '#efe3c8');
      else add(x, y + 0.03, x + (i % 4 ? 0.1 : -0.1), y + 0.25, 0.06, '#f6f1e2');
    }
    for (let i = 0; i < 29; i++) {
      const x = -0.85 + r() * 1.7;
      const y = 0.05 - r() * 0.85;
      add(x, y, x + 0.08, y, 0.018, i % 2 ? '#d9eef5' : '#fbe7c9');
    }
  }
  return out;
}
const PAINT_ROUND = 6;
const PAINT_PER = 11;
/** How the painting's going at `u`: strokes done, where the brush's tip is (0 on the palette, else stroke `at`, how far along it). */
export function paintBeat(u: number): { done: number; dip: number; at: number; along: number; finished: number } {
  const secs = clamp(u, 0, 1) * HF_SECONDS.hfPaint;
  const lay = Math.min(secs, HF_SECONDS.hfPaint * 0.93);
  const c = Math.floor(lay / PAINT_ROUND);
  const cu = lay / PAINT_ROUND - c;
  const load = 0.16;
  const dip = cu < load ? Math.sin((cu / load) * Math.PI) : 0;
  const prog = cu < load ? 0 : ((cu - load) / (1 - load)) * PAINT_PER;
  const whole = Math.min(PAINT_PER - 1, Math.floor(prog));
  const done = Math.min(PAINT_N, c * PAINT_PER + (cu < load ? 0 : whole));
  return { done, dip, at: done, along: clamp(prog - whole, 0, 1), finished: sm(u, 0.93, 0.965) };
}

// ---- Timing.

/** How far on a use is: told each frame by its pose, it knows when it began. */
export function hfPhase(m: HfMotion, spot: Spot, t: number): number {
  const ud = spot.at.userData;
  if (t - ((ud.hfLast as number | undefined) ?? -1e9) > 0.6) ud.hfBegan = t;
  ud.hfLast = t;
  const secs = (spot.at.userData.hfSeconds as number | undefined) ?? HF_SECONDS[m];
  const u = (t - (ud.hfBegan as number)) / secs;
  return ONCE.has(m) ? Math.min(1, u) : ((u % 1) + 1) % 1;
}
/** Whether the spot's being used now, and how far on (for the piece, which runs before the pose). */
export function hfLive(m: HfMotion, spot: Spot, t: number): number | null {
  const ud = spot.at.userData;
  const last = ud.hfLast as number | undefined;
  if (last === undefined || Math.abs(t - last) > 0.6) return null;
  const secs = (ud.hfSeconds as number | undefined) ?? HF_SECONDS[m];
  const u = (t - (ud.hfBegan as number)) / secs;
  return ONCE.has(m) ? Math.min(1, u) : ((u % 1) + 1) % 1;
}

export interface HfNow {
  st: [number, number];
  /** Turned from facing the piece, radians, about +y. */
  turn: number;
  crouch: number;
  lean: number;
  nod: number;
  palms: number;
  l: V;
  r: V;
  shape?: 'cradle' | 'flat' | 'pinch' | 'power';
  grip?: { l: number; r: number };
  shut?: boolean;
  hold: HfTool | null;
  resting?: boolean;
  /** Where the tool's origin goes in the piece's frame, and how it's turned. */
  tool?: V;
  q?: THREE.Quaternion;
  /** In a tool carrying another (the brush on the palette, the bow with the violin): that one's place in the tool's frame, and its way. */
  sub?: V;
  subAxis?: V;
  /** Where the right hand is on the tool now, in its frame, if not on `sub`. */
  at?: V;
  /** How far on the piece's own moving things are. */
  v: Record<string, number>;
}

/** Where everything is at `u` of a use, for someone `H` tall at time `t`. `glass` is the mirror's z; `book` the book being read. */
export function hfNow(m: Exclude<HfMotion, 'hfChess'>, u: number, H: number, t: number, opt: { glass?: number; book?: BookPlace; picture?: number } = {}): HfNow {
  const s = H / 1.6;
  const at = (st: [number, number]) => (x: number, y: number, z: number): V => [st[0] + x * s, y * s, st[1] + z * s];
  switch (m) {
    case 'hfStar':
    case 'hfSky':
    case 'hfSpy': {
      const aim = scopeAim(m, u);
      const e = scopeEye(H, aim.alt, aim.az);
      const drop = clamp(1.47 * s - e[1], 0, 0.42);
      let away = 0;
      if (m === 'hfStar') away = sm(u, 0.5, 0.56) * (1 - sm(u, 0.66, 0.72));
      else if (m === 'hfSpy') {
        const v = u * 3 % 1;
        away = sm(v, 0.68, 0.74) * (1 - sm(v, 0.88, 0.94));
      }
      const lean0 = clamp(drop * 1.9 + 0.08, 0, 0.6);
      const f = 0.11 * s + 0.62 * s * Math.sin(lean0);
      const b: [number, number] = [Math.sin(aim.az), Math.cos(aim.az)];
      const step = m === 'hfSpy' ? 0.06 : 0.24;
      const st: [number, number] = [e[0] + b[0] * (f + step * away), e[2] + b[1] * (f + step * away)];
      const pY = scopePivotY(H, aim.alt);
      const tube = (d: number, side: number, down: number): V => {
        const fwd = Math.cos(aim.alt) * d;
        return [Math.sin(aim.az) * -fwd + Math.cos(aim.az) * side, pY + Math.sin(aim.alt) * d - down, SC.pivotZ + Math.cos(aim.az) * -fwd - Math.sin(aim.az) * side];
      };
      const focus = Math.sin(t * 2.4) * 0.006;
      const look = at(st);
      const restL = look(-0.2, 0.92, -0.04);
      const restR = look(0.2, 0.92, -0.04);
      return {
        st,
        turn: aim.az + (m === 'hfSpy' ? 0.6 * away : 0),
        crouch: clamp((drop - 0.08) / 0.37, 0, 0.6) * (1 - away),
        lean: lean0 * (1 - away),
        nod: m === 'hfStar' ? 0.3 - 0.72 * away : m === 'hfSpy' ? 0.12 - 0.1 * away : 0.28,
        palms: 0.5,
        l: mix(tube(0.1, -0.06, 0.05), restL, away),
        r: mix(tube(-0.23, 0.07 + focus, 0.02), restR, away),
        grip: { l: 0.55, r: 0.7 },
        hold: null,
        v: { alt: aim.alt, az: aim.az, pivot: pY, knob: Math.sin(t * 2.4) * 0.8 },
      };
    }
    case 'hfPsych':
    case 'hfSilly':
    case 'hfGussy':
    case 'hfCalm':
    case 'hfRomance':
    case 'hfComedy':
    case 'hfSpeech':
    case 'hfHair':
      return mirrorNow(m, u, H, t, opt.glass ?? -0.1);
    case 'hfWardrobe': {
      const st: [number, number] = [0.02, WD.stand];
      const p = at(st);
      const take = sm(u, 0, 0.24);
      const held = p(0, 1.4, -0.3);
      const raise = sm(u, 0.28, 0.42) * (1 - sm(u, 0.72, 0.84));
      const qRail = basisQ([0, 1, 0], [1, 0, 0]);
      const qHeld = basisQ([0, 1, 0], [Math.sin(t * 3) * 0.22, 0, 1]);
      const on = u >= 0.2 && u < 0.92;
      return {
        st,
        turn: 0,
        crouch: 0,
        lean: 0.26 * take * (1 - raise) + 0.04,
        nod: 0.12 * (1 - raise) + 0.26 * raise,
        palms: 0.3,
        l: raise > 0.05 ? p(-0.11, 1.08, -0.26) : p(-0.2, 0.92, -0.05),
        r: mix(p(0.2, 0.95, -0.05), WD.hook, u < 0.5 ? take : 1 - sm(u, 0.92, 1)),
        shape: 'pinch',
        hold: on ? 'outfit' : null,
        resting: u < 0.28 || u >= 0.84,
        tool: mix(WD.hook, held, raise),
        q: blend(qRail, qHeld, raise),
        v: { shown: raise },
      };
    }
    case 'hfPaint':
      return paintNow(u, H, t, opt.picture ?? 0);
    case 'hfViolin':
      return violinNow(u, H, t);
    case 'hfGuitar':
      return guitarNow(u, H, t);
    case 'hfPhoto':
      return photoNow(u, H);
    case 'hfSow':
    case 'hfWater':
    case 'hfWeed':
    case 'hfPick':
      return planterNow(m, u, H, t);
    case 'hfRead':
      return readNow(u, H, t, opt.book ?? BK.read);
  }
}

function mirrorNow(m: HfMotion, u: number, H: number, t: number, glass: number): HfNow {
  const s = H / 1.6;
  const st: [number, number] = [0, glass + MR.stand];
  const p = (x: number, y: number, z: number): V => [st[0] + x * s, y * s, st[1] + z * s];
  const base: HfNow = { st, turn: 0, crouch: 0, lean: 0.02, nod: 0, palms: 0.2, l: p(-0.19, 0.9, -0.05), r: p(0.19, 0.9, -0.05), hold: null, grip: { l: 0.3, r: 0.3 }, v: {} };
  switch (m) {
    case 'hfPsych': {
      // Fists at the chest, the chest out, a nod to yourself, then both fists pumped.
      const pump = sm(u, 0.55, 0.62) * Math.abs(Math.sin(t * 6));
      const fist = sm(u, 0, 0.14);
      return { ...base, lean: -0.05 * fist + 0.08 * pump, nod: 0.2 * Math.sin(t * 5) * (1 - sm(u, 0.55, 0.6)), l: mix(base.l, p(-0.15, 1.16 + 0.14 * pump, -0.2), fist), r: mix(base.r, p(0.15, 1.16 + 0.14 * pump, -0.2), fist), grip: { l: 0.95, r: 0.95 } };
    }
    case 'hfSilly': {
      // Fingers at the cheeks, pulling the face about; the head rolling with it.
      const up = sm(u, 0, 0.14) * (1 - sm(u, 0.9, 1));
      const w = Math.sin(t * 9);
      return { ...base, st: [0.03 * Math.sin(t * 5), st[1]], lean: 0.1 * up, nod: 0.12 * w * up, l: mix(base.l, p(-0.09 - 0.015 * w, 1.42, -0.1), up), r: mix(base.r, p(0.09 + 0.015 * w, 1.42, -0.1), up), shape: 'pinch' };
    }
    case 'hfGussy':
    case 'hfHair':
      return combNow(m, u, H, t, glass);
    case 'hfCalm': {
      // Hands on the chest, eyes shut, slow long breaths.
      const on = sm(u, 0, 0.1) * (1 - sm(u, 0.94, 1));
      const breath = Math.sin(t * 1.1);
      return { ...base, lean: -0.03 * breath * on, nod: (0.14 - 0.06 * breath) * on, l: mix(base.l, p(-0.06, 1.16 + 0.015 * breath, -0.15), on), r: mix(base.r, p(0.07, 1.1 + 0.015 * breath, -0.16), on), palms: 0.7 * on, grip: { l: 0.15, r: 0.15 }, shut: on > 0.6 };
    }
    case 'hfRomance': {
      // In three goes: the hair smoothed back, a finger pointed with a lean, a kiss blown.
      const v = (u * 3) % 1;
      const n = Math.floor(u * 3) % 3;
      const k = sm(v, 0.05, 0.2) * (1 - sm(v, 0.82, 0.98));
      if (n === 0) return { ...base, lean: -0.05 * k, nod: -0.1 * k, r: mix(base.r, p(0.1 - 0.02 * Math.sin(t * 3), 1.56, -0.04 + 0.08 * sm(v, 0.2, 0.8)), k), l: p(-0.19, 0.95, -0.03) };
      if (n === 1) return { ...base, st: [0.04 * k, st[1]], lean: 0.1 * k, nod: -0.06 * k, r: mix(base.r, p(0.12, 1.3 + 0.015 * Math.sin(t * 7), -0.42), k), shape: 'pinch', l: mix(base.l, p(-0.12, 1.0, -0.14), k) };
      const blow = sm(v, 0.5, 0.75);
      return { ...base, lean: 0.06 * k, r: mix(base.r, mix(p(0.03, 1.34, -0.13), p(0.14, 1.36, -0.42), blow), k), palms: 0.6, grip: { l: 0.3, r: 0.5 } };
    }
    case 'hfComedy': {
      // A bit into a fist for a mic, the other arm flung about; a slap on the thigh at the punchline; a bow.
      const v = (u * 2) % 1;
      const mic = sm(v, 0.04, 0.12) * (1 - sm(v, 0.7, 0.76));
      const slap = sm(v, 0.74, 0.78) * (1 - sm(v, 0.86, 0.9));
      const bow = sm(v, 0.88, 0.93) * (1 - sm(v, 0.96, 1));
      const fling = Math.sin(t * 2.8);
      const l: V = mix(mix(base.l, p(-0.3 - 0.08 * fling, 1.2 + 0.2 * fling, -0.25), mic), p(-0.16, 0.82 + 0.05 * Math.sin(t * 15), -0.07), slap);
      return { ...base, lean: 0.06 * Math.sin(t * 3.2) * mic + 0.28 * slap + 0.5 * bow, nod: 0.1 * Math.sin(t * 2.2) * mic + 0.2 * slap, r: mix(base.r, p(0.05, 1.33, -0.18), mic), l, grip: { l: 0.25, r: 0.9 * mic + 0.3 }, st: [0.05 * Math.sin(t * 1.3), st[1]] };
    }
    case 'hfSpeech': {
      // Stood square, an opening of both hands, a finger raised on the point, a hand on the heart for the close.
      const v = (u * 3) % 1;
      const open = Math.sin(v * Math.PI);
      const k = sm(v, 0.03, 0.12) * (1 - sm(v, 0.9, 0.99));
      const phase = Math.floor(u * 3) % 3;
      const bob = 0.03 * Math.sin(t * 3.4);
      if (phase === 0) return { ...base, lean: 0.03 + 0.03 * open, nod: 0.06 * Math.sin(t * 2.2), l: mix(base.l, p(-0.26 - 0.06 * open, 1.1 + bob, -0.24), k), r: mix(base.r, p(0.26 + 0.06 * open, 1.1 - bob, -0.24), k), palms: 0.2 + 0.6 * k, grip: { l: 0.15, r: 0.15 } };
      if (phase === 1) return { ...base, nod: 0.12 * Math.abs(Math.sin(t * 3.4)), r: mix(base.r, p(0.2, 1.42 + bob, -0.24), k), l: mix(base.l, p(-0.16, 1.0, -0.14), k), shape: 'pinch' };
      return { ...base, lean: 0.03, nod: 0.1 * k, r: mix(base.r, p(0.05, 1.15, -0.15), k), l: mix(base.l, p(-0.24, 1.08 + bob, -0.24), k), palms: 0.5 * k, grip: { l: 0.15, r: 0.15 } };
    }
  }
  return base;
}

/** The comb's hand: from the ledge, along the right side of the hair, front to back; tidying goes on to the cheeks and the collar. */
function combNow(m: HfMotion, u: number, H: number, t: number, glass: number): HfNow {
  const s = H / 1.6;
  const st: [number, number] = [0.06, glass + MR.stand];
  const p = (x: number, y: number, z: number): V => [st[0] + x * s, y * s, st[1] + z * s];
  const ledge: V = [MR.comb[0], MR.comb[1], glass + MR.comb[2]];
  const qLedge = basisQ([-1, 0, 0], [0, 1, 0]);
  const tidy = m === 'hfGussy';
  const end = tidy ? 0.42 : 0.84;
  const up = sm(u, 0.06, 0.14) * (1 - sm(u, end, end + 0.08));
  const sweep = 0.5 + 0.5 * Math.sin(t * 3.4);
  const side = Math.floor(t * 3.4 / (Math.PI * 2)) % 2 ? 0.14 : 0.16;
  const onHead = p(side, 1.53 - 0.04 * sweep, -0.1 + 0.15 * sweep);
  const qHead = basisQ([0, 0.15, -1], [-1, 0.25, 0]);
  const held = u >= 0.05 && u < end + 0.09;
  const r: V = mix(p(0.19, 0.9, -0.05), ledge, sm(u, 0, 0.06) * (1 - sm(u, 0.12, 0.14)));
  const out: HfNow = {
    st,
    turn: 0,
    crouch: 0,
    lean: 0.05 + 0.1 * sm(u, 0, 0.06) * (1 - sm(u, 0.08, 0.14)),
    nod: -0.03 + 0.06 * Math.sin(t * 1.7),
    palms: 0.25,
    l: mix(p(-0.19, 0.9, -0.05), p(-0.13, 1.5, -0.03), up),
    r,
    grip: { l: 0.3, r: 0.4 },
    hold: held ? 'comb' : null,
    resting: u < 0.09 || u >= end + 0.04,
    tool: mix(ledge, onHead, up),
    q: blend(qLedge, qHead, up),
    v: {},
  };
  if (tidy && u >= end + 0.09) {
    // Patted cheeks, then the collar set straight.
    const pat = sm(u, 0.54, 0.6) * (1 - sm(u, 0.76, 0.8));
    const collar = sm(u, 0.8, 0.84) * (1 - sm(u, 0.95, 1));
    const tap = 0.012 * Math.sin(t * 15);
    out.l = mix(mix(p(-0.19, 0.9, -0.05), p(-0.09, 1.38 + tap, -0.1), pat), p(-0.08, 1.26, -0.13), collar);
    out.r = mix(mix(p(0.19, 0.9, -0.05), p(0.09, 1.38 - tap, -0.1), pat), p(0.08, 1.26 + 0.008 * Math.sin(t * 8), -0.13), collar);
    out.grip = { l: 0.2 + 0.4 * collar, r: 0.2 + 0.4 * collar };
  }
  return out;
}

const PALETTE_WELL: V = [0.03, 0.012, -0.03];
/**
 * The brush is the tool, in the right hand; the palette rides on the left hand, a thing of its own (`sub`), the hand sent to it
 * as a free hand. So the arm that paints is never tied to the arm that holds. Long strokes are drawn short of the canvas's
 * sides, and the dweller stands over towards a stroke at a corner, so everything's in reach from where they are.
 */
function paintNow(u: number, H: number, t: number, picture: number): HfNow {
  const s = H / 1.6;
  const b = paintBeat(u);
  const plan = paintPlan(picture);
  const n = Math.max(1, plan.length);
  const stroke: Stroke | undefined = plan[b.at % n];
  const before: Stroke | undefined = plan[(b.at + n - 1) % n];
  const mid = (st: Stroke | undefined) => (st ? (st.x0 + st.x1) / 2 : 0);
  const tipOf = (st: Stroke | undefined, a: number): [number, number] => {
    if (!st) return [0, 0];
    const c = mid(st);
    return [c + (st.x0 + (st.x1 - st.x0) * a - c) * 0.66, st.y0 + (st.y1 - st.y0) * a];
  };
  // A fifth of the time going from where the last one ended to where this one starts, then along it.
  const a = b.along;
  const going = a < 0.2 ? a / 0.2 : 1;
  const from = tipOf(before, 1);
  const to = tipOf(stroke, a < 0.2 ? 0 : (a - 0.2) / 0.8);
  const px = from[0] + (to[0] - from[0]) * going;
  const py = from[1] + (to[1] - from[1]) * going;
  const over = mid(before) + (mid(stroke) - mid(before)) * sm(a, 0, 0.5);
  const back = b.finished;
  const take = sm(u, 0.022, 0.05) * (1 - sm(u, 0.97, 0.995));
  const st: [number, number] = [-0.2 * (1 - take) + over * 0.24 * take * (1 - back), EZ.stand + 0.2 * back];
  const hand = (x: number, y: number, z: number): V => [st[0] + x * s, y * s, st[1] + z * s];
  const palAt = hand(-0.25, 1.06, -0.22);
  const palette = mix(EZ.rest, palAt, take);
  const wellW = plus(palette, PALETTE_WELL);
  const canvas = easelPoint(px, py, H);
  const held = plus(palette, [0.22, 0.14, -0.02]);
  const tip = take < 0.5 ? plus(palette, [0.12, 0.012, 0.02]) : mix(mix(canvas, wellW, b.dip), held, back);
  // The way from the tip back to the hand: from the canvas towards the shoulder; on the palette, up and out.
  const onPal = Math.max(b.dip, back, 1 - take);
  const lay = unit(mix([0.3, -0.3, 0.92], [0.5, 0.75, 0.4], onPal));
  const G = 0.1;
  const down = 1 - sm(u, 0.022, 0.045) + sm(u, 0.97, 0.99);
  return {
    st,
    turn: 0,
    // Down to the bottom of the canvas with the knees, not a longer arm.
    crouch: 0.32 * down + 0.42 * clamp(-py - 0.1, 0, 1) * take * (1 - back) * (1 - b.dip),
    lean: 0.32 * down + 0.1 * (1 - back) - 0.04 * back,
    nod: 0.12 + 0.05 * Math.sin(t * 0.9) - 0.1 * back,
    palms: 1.25,
    // The wrist, back from the palette so the fingers come under it from the thumb hole.
    l: plus(palette, [-0.09, -0.035, 0.1]),
    r: hand(0.19, 0.92, -0.05),
    shape: 'flat',
    hold: 'brush',
    resting: u < 0.03 || u > 0.985,
    tool: [tip[0] + lay[0] * G, tip[1] + lay[1] * G, tip[2] + lay[2] * G],
    q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec([-lay[0], -lay[1], -lay[2]])),
    sub: palette,
    v: { done: b.done, dip: b.dip },
  };
}

function violinNow(u: number, H: number, t: number): HfNow {
  const s = H / 1.6;
  const k = clamp(s, 0.72, 1.1);
  const lifted = sm(u, 0.05, 0.1) * (1 - sm(u, 0.92, 0.97));
  const low = (1 - sm(u, 0.04, 0.09)) * sm(u, 0, 0.03) + sm(u, 0.92, 0.96) * (1 - sm(u, 0.98, 1));
  const st: [number, number] = [0, VI.stand + 0.1 * lifted];
  const p = (x: number, y: number, z: number): V => [st[0] + x * s, y * s, st[1] + z * s];
  const qRest = basisQ([-1, 0, 0], [0, 1, 0]);
  const yDir = unit([-0.52, -0.08, -0.85]);
  const qPlay = basisQ(yDir, [0.35, 0.9, 0.2]);
  const q = blend(qRest, qPlay, lifted);
  const butt = p(-0.08, 1.3, -0.075);
  const tool = mix(VI.rest, butt, lifted);
  // The bow: drawn across the strings between the bridge and the fingerboard, in slow and quick phrases.
  const phrase = Math.floor(t / 4) % 3;
  const hz = phrase === 0 ? 0.4 : phrase === 1 ? 0.8 : 0.28;
  const draw = 0.5 + 0.5 * Math.sin(t * hz * Math.PI * 2);
  const inv = qPlay.clone().invert();
  const dir = vec(unit([0.82, -0.12, -0.55])).applyQuaternion(inv);
  // How far the frog is from the strings: no further than the right arm gets with the shoulder where it is.
  const dist = (0.12 + 0.22 * draw) / k;
  const contact = new THREE.Vector3(0, 0.175, 0.05);
  const play = contact.clone().addScaledVector(dir, dist);
  const restBow = new THREE.Vector3(-0.1, -0.08, 0.005);
  const bowAt = restBow.clone().lerp(play, lifted);
  const axisPlay = dir.clone().negate();
  const axis = new THREE.Vector3(0, 1, 0).lerp(axisPlay, lifted).normalize();
  const sway = 0.04 * Math.sin(t * 0.75);
  return {
    st,
    turn: 0,
    crouch: 0.24 * low,
    lean: 0.42 * low + (0.03 + sway * 0.5) * lifted,
    nod: 0.16 * low + (0.3 + 0.04 * Math.sin(t * 0.9)) * lifted,
    palms: 0.6,
    l: tool,
    r: p(0.2, 0.92, -0.05),
    hold: 'violin',
    resting: u < 0.045 || u > 0.965,
    tool,
    q,
    sub: [bowAt.x, bowAt.y, bowAt.z],
    subAxis: [axis.x, axis.y, axis.z],
    v: { scale: k, lifted, vibrato: Math.sin(t * 34) * 0.004, shift: phrase * 0.03 },
  };
}

function guitarNow(u: number, H: number, t: number): HfNow {
  const s = H / 1.6;
  const k = clamp(s, 0.72, 1.1);
  const lifted = sm(u, 0.05, 0.1) * (1 - sm(u, 0.93, 0.97));
  const st: [number, number] = [0, GT.stand + 0.04 * lifted];
  const p = (x: number, y: number, z: number): V => [st[0] + x * s, y * s, st[1] + z * s];
  const qRest = basisQ([0, 1, -0.12], [0, 0.12, 1]);
  const qPlay = basisQ([-0.72, 0.66, -0.2], [0.25, 0.12, -0.95]);
  const q = blend(qRest, qPlay, lifted);
  const tool = mix(GT.rest, p(0.04, 0.98, -0.21), lifted);
  const bar = t * 1.15;
  const chord = [0.46, 0.41, 0.35, 0.41][Math.floor(bar) % 4];
  const next = [0.46, 0.41, 0.35, 0.41][(Math.floor(bar) + 1) % 4];
  const fret = chord + (next - chord) * sm(bar % 1, 0.86, 1);
  // Down-down-up, down-up over a bar.
  const a = t * Math.PI * 2 * 2.2;
  const strum = Math.sin(a) * (Math.sin(t * 0.7) > -0.4 ? 1 : 0.45);
  const local: V = [0.015, 0.06 + 0.055 * strum, 0.08];
  const r = plus(tool, lift(qPlay, local, k));
  const low = (1 - sm(u, 0.04, 0.09)) * sm(u, 0, 0.03) + sm(u, 0.93, 0.96) * (1 - sm(u, 0.98, 1));
  return {
    st,
    turn: 0,
    crouch: 0,
    lean: 0.26 * low + (0.04 + 0.03 * Math.sin(t * 2.2)) * lifted,
    nod: 0.14 * low + (0.2 + 0.05 * Math.sin(t * 2.2)) * lifted,
    palms: 0.9,
    l: tool,
    r: mix(p(0.2, 0.92, -0.05), r, lifted),
    shape: 'pinch',
    hold: 'guitar',
    resting: u < 0.045 || u > 0.965,
    tool,
    q,
    v: { scale: k, fret, lifted, strum },
  };
}

function photoNow(u: number, H: number): HfNow {
  const s = H / 1.6;
  const take = sm(u, 0.04, 0.09) * (1 - sm(u, 0.93, 0.97));
  const shots = [
    { x: 0, cr: 0, turn: 0 },
    { x: 0.14, cr: 0.5, turn: -0.22 },
    { x: -0.12, cr: 0, turn: 0.25 },
  ];
  const v = clamp((u - 0.1) / 0.82, 0, 0.9999) * 3;
  const n = Math.floor(v);
  const w = v - n;
  const shot = shots[n % 3];
  const prev = shots[(n + 2) % 3];
  const move = n === 0 ? 1 : sm(w, 0, 0.14);
  const x = (prev.x + (shot.x - prev.x) * move) * take;
  const cr = (prev.cr + (shot.cr - prev.cr) * move) * take * (n === 0 ? 0 : 1);
  const turn = (prev.turn + (shot.turn - prev.turn) * move) * take;
  const up = sm(w, 0.18, 0.32) * (1 - sm(w, 0.68, 0.78)) * take;
  const st: [number, number] = [x, CM.stand + 0.03 * take];
  const f: V = [-Math.sin(turn), 0, -Math.cos(turn)];
  const side: V = [Math.cos(turn), 0, -Math.sin(turn)];
  const body = (r: number, y: number, a: number): V => [st[0] + (f[0] * a + side[0] * r) * s, y * s - cr * 0.37 * s, st[1] + (f[2] * a + side[2] * r) * s];
  const eye = body(0.03, 1.46, 0.2);
  const chest = body(0, 1.1, 0.27);
  const heldQ = basisQ([0, 1, 0], [-f[0], 0, -f[2]]);
  const reviewQ = basisQ([f[0] * 0.5, 0.86, f[2] * 0.5], [-f[0] * 0.8, 0.6, -f[2] * 0.8]);
  const q = blend(blend(new THREE.Quaternion(), reviewQ, take), heldQ, up);
  const tool = mix(CM.rest, mix(chest, eye, up), take);
  const click = sm(w, 0.5, 0.52) * (1 - sm(w, 0.54, 0.58));
  const low = (1 - sm(u, 0.04, 0.09)) * sm(u, 0, 0.03) + sm(u, 0.93, 0.96) * (1 - sm(u, 0.98, 1));
  return {
    st,
    turn,
    crouch: cr,
    lean: 0.16 * low + 0.04,
    nod: (0.34 * (1 - up) - 0.02 * up) * take + 0.1 * low,
    palms: 0.5,
    l: tool,
    r: tool,
    hold: 'camera',
    resting: u < 0.045 || u > 0.965,
    tool,
    q,
    v: { click: up > 0.9 ? click : 0, up, take, neck: 1.36 * s - cr * 0.37 * s, neckX: st[0], neckZ: st[1] },
  };
}

function planterNow(m: 'hfSow' | 'hfWater' | 'hfWeed' | 'hfPick', u: number, H: number, t: number): HfNow {
  const s = H / 1.6;
  const st: [number, number] = [PT.x, PT.stand];
  const p = (x: number, y: number, z: number): V => [st[0] + x * s, y * s, st[1] + z * s];
  const restL = p(-0.2, 0.92, -0.05);
  const restR = p(0.2, 0.92, -0.05);
  const I = new THREE.Quaternion();
  switch (m) {
    case 'hfWater': {
      const lift = sm(u, 0.08, 0.2) * (1 - sm(u, 0.84, 0.94));
      const tilt = sm(u, 0.2, 0.3) * (1 - sm(u, 0.78, 0.86));
      const along = 0.5 + 0.5 * Math.sin(u * Math.PI * 4 - 1.2);
      const x = PT.plants[2] + (PT.plants[0] - PT.plants[2]) * along;
      const over: V = [x + 0.08, 1.22, 0.12];
      const tool = mix(PT.can, over, lift);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.68 * tilt, 0, 0));
      return { st, turn: 0, crouch: 0, lean: 0.14 + 0.12 * tilt, nod: 0.3 + 0.1 * tilt, palms: 0.3, l: mix(restL, [PT.x - 0.24, 0.86, 0.05], tilt), r: tool, hold: u >= 0.05 && u < 0.97 ? 'can' : null, resting: u < 0.08 || u >= 0.94, tool, q, grip: { l: 0.25, r: 0.4 }, v: { pour: u > 0.26 && u < 0.8 ? 1 : 0 } };
    }
    case 'hfSow': {
      const has = u >= 0.08 && u < 0.92;
      const over = sm(u, 0.1, 0.2) * (1 - sm(u, 0.72, 0.84));
      const along = sm(u, 0.2, 0.7);
      const x = PT.plants[2] + (PT.plants[0] - PT.plants[2]) * along;
      const shake = Math.sin(t * 22) * 0.012;
      const tool = mix(PT.packet, [x + 0.05, 0.98 + shake, PT.z + 0.05], over);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.9 * over));
      const pat = sm(u, 0.72, 0.76) * (1 - sm(u, 0.88, 0.94));
      const poke = sm(u, 0.16, 0.22) * (1 - sm(u, 0.7, 0.74));
      const l = mix(mix(restL, [x - 0.1, PT.soil + 0.03 + Math.max(0, Math.sin(t * 9)) * 0.03, PT.z], poke), [-0.06 - 0.12 * Math.sin(t * 5), PT.soil + 0.04 + 0.015 * Math.abs(Math.sin(t * 12)), PT.z], pat);
      return { st, turn: 0, crouch: 0.12, lean: 0.34, nod: 0.4, palms: 0.9, l, r: tool, hold: has ? 'packet' : null, resting: u < 0.1 || u >= 0.84, tool, q: q.multiply(I), shape: 'flat', grip: { l: 0.2, r: 0.5 }, v: { seeds: sm(u, 0.25, 0.3) } };
    }
    case 'hfWeed': {
      const v = (u * 2) % 1;
      const n = Math.floor(u * 2) % 2;
      const root = PT.weeds[n];
      const reach = sm(v, 0, 0.22);
      const up = sm(v, 0.3, 0.46);
      const toss = sm(v, 0.56, 0.72);
      const shake = Math.sin(t * 34) * 0.006 * (1 - sm(v, 0.3, 0.36));
      const held = v >= 0.16 && v < 0.74;
      const hip: V = [0.42, 0.98, 0.26];
      const tool = mix(mix([root[0] + shake, root[1], root[2]], [root[0] + 0.03, root[1] + 0.26, root[2] + 0.08], up), hip, toss);
      return { st, turn: 0, crouch: 0.18, lean: 0.4 - 0.2 * up, nod: 0.45 - 0.1 * up, palms: 0.7, l: [PT.x - 0.26, PT.soil + 0.05, 0.05], r: v < 0.16 ? mix(restR, root, reach) : mix(tool, restR, sm(v, 0.74, 0.95)), shape: 'flat', grip: { l: 0.25, r: 0.4 }, hold: held ? 'weed' : null, resting: v < 0.3, tool, q: I, v: { pulled: n + (v >= 0.3 ? 1 : 0), shown: held ? 1 : 0 } };
    }
    case 'hfPick': {
      const v = (u * 2) % 1;
      const n = Math.floor(u * 2) % 2;
      const fruit = PT.fruit[n % PT.fruit.length];
      const reach = sm(v, 0, 0.24);
      const carry = sm(v, 0.4, 0.74);
      const twist = Math.sin(t * 22) * 0.008 * (1 - sm(v, 0.34, 0.4));
      const held = v >= 0.2 && v < 0.82;
      const tool = mix([fruit[0] + twist, fruit[1], fruit[2]], [PT.basket[0], PT.basket[1] + 0.03, PT.basket[2]], carry);
      return { st: [PT.x + 0.1, PT.stand], turn: 0, crouch: 0, lean: 0.3, nod: 0.34, palms: 0.6, l: [PT.x - 0.1, fruit[1] + 0.03, fruit[2] + 0.04], r: v < 0.2 ? mix(restR, fruit, reach) : mix(tool, restR, sm(v, 0.82, 1)), shape: 'cradle', grip: { l: 0.3, r: 0.5 }, hold: held ? 'fruit' : null, resting: v < 0.34, tool, q: I, v: { pickedNow: n + (v >= 0.36 ? 1 : 0), shown: held ? 1 : 0 } };
    }
  }
}

/** The way a dweller turned `turn` from the piece faces, in its frame. */
const facing = (turn: number): V => [-Math.sin(turn), 0, -Math.cos(turn)];

function readNow(u: number, H: number, t: number, book: BookPlace): HfNow {
  const s = H / 1.6;
  const stAt = book.slot[0] * 0.55;
  const low = clamp((1.05 - book.slot[1]) / 0.5, 0, 1);
  const away = sm(u, 0.07, 0.13) * (1 - sm(u, 0.87, 0.93));
  const st: [number, number] = [stAt, 0.22 + 0.34 * away];
  const turn = away * Math.PI * 0.8;
  const f = facing(turn);
  const side: V = [Math.cos(turn), 0, -Math.sin(turn)];
  const q0 = basisQ([0, 1, 0], [0, 0, -1]);
  const tilt = 0.78;
  const nrm: V = [-f[0] * Math.cos(tilt), Math.sin(tilt), -f[2] * Math.cos(tilt)];
  const qRead = basisQ([f[0] * Math.sin(tilt), Math.cos(tilt), f[2] * Math.sin(tilt)], nrm);
  const q = blend(q0, qRead, away);
  const reader: V = [st[0] + f[0] * 0.3 * s, 1.14 * s, st[1] + f[2] * 0.3 * s];
  const tool = mix(book.slot, reader, sm(u, 0.05, 0.13) * (1 - sm(u, 0.87, 0.95)));
  const open = sm(u, 0.13, 0.17) * (1 - sm(u, 0.83, 0.87));
  // A page now and then, the turning hand with it.
  const every = book.kind === 'novel' ? 3.2 : 5.5;
  const pu = (t % every) / every;
  const reading = u > 0.18 && u < 0.82;
  const leaf = reading ? sm(pu, 0.84, 0.96) : 0;
  const onLeaf = reading ? sm(pu, 0.8, 0.84) * (1 - sm(pu, 0.97, 1)) : 0;
  const a = leaf * Math.PI;
  const edge: V = [Math.cos(a) * book.w, -0.03, 0.008 + Math.sin(a) * book.w];
  const leafAt = plus(tool, lift(q, edge));
  // What each kind of reading does with the free hand, when it isn't turning a page.
  let free = 0;
  let gesture: V = leafAt;
  const beat = (t / 7) % 1;
  const body = (r: number, y: number, a2: number): V => [st[0] + (f[0] * a2 + side[0] * r) * s, y * s, st[1] + (f[2] * a2 + side[2] * r) * s];
  let nodMore = 0;
  if (reading && onLeaf < 0.01) {
    if (book.kind === 'logic') {
      free = sm(beat, 0.1, 0.2) * (1 - sm(beat, 0.7, 0.8));
      gesture = body(0.04, 1.34 + 0.006 * Math.sin(t * 5), 0.15);
    } else if (book.kind === 'cook' || book.kind === 'gourmet') {
      free = sm(beat, 0.2, 0.3) * (1 - sm(beat, 0.8, 0.9));
      const line = (t * 0.6) % 1;
      gesture = plus(tool, lift(q, [book.w * (0.3 + 0.5 * Math.sin(t * 1.7) ** 2), book.h * (0.32 - 0.6 * line), 0.03]));
      nodMore = 0.08 * free;
    } else if (book.kind === 'garden') {
      free = sm(beat, 0.3, 0.4) * (1 - sm(beat, 0.7, 0.8));
      gesture = plus(tool, lift(q, [book.w * 0.55, 0.05 + 0.02 * Math.sin(t * 2.2), 0.03]));
      nodMore = 0.06 * free;
    } else if (book.kind === 'psych') {
      free = sm(beat, 0.35, 0.45) * (1 - sm(beat, 0.8, 0.9));
      gesture = body(0.05, 1.12, 0.16);
      nodMore = 0.08 * Math.abs(Math.sin(t * 2)) * free;
    }
  }
  const handOff = Math.max(onLeaf, free);
  const reach = sm(u, 0, 0.05) * (1 - sm(u, 0.95, 1));
  const down = low * reach * (1 - away);
  return {
    st,
    turn,
    crouch: 0.68 * down,
    lean: (0.12 + 0.34 * low) * reach * (1 - away) + 0.03 * away,
    nod: (0.22 + 0.2 * low) * (1 - away) + (0.5 + nodMore + 0.03 * Math.sin(t * 0.8)) * away,
    palms: 0.3,
    l: body(-0.2, 0.92, 0.05),
    r: onLeaf > 0 ? leafAt : gesture,
    shape: 'pinch',
    grip: { l: 0.3, r: 0.4 },
    hold: u >= 0.035 && u < 0.965 ? 'book' : null,
    resting: u < 0.06 || u >= 0.94,
    tool,
    q,
    v: { open, leaf, hand: handOff, gone: u >= 0.05 && u < 0.95 ? 1 : 0 },
  };
}

/** A hand on a chess table, sat at `side` (-1 at -x, +1 at +x). */
export function chessNow(side: number, hand: ChessHand | null, H: number, t: number) {
  const s = H / 1.6;
  const rz = side < 0 ? 1 : -1;
  const x = side * CH.seat;
  const on = (ins: number, y: number, z: number): V => [x - side * ins, y, z];
  const restFar = on(0.2, CH.top + 0.02, -rz * 0.16);
  const restNear = on(0.2, CH.top + 0.02, rz * 0.16);
  // Thinking: the chin on the near hand, the other on the table, a fingertip tapping now and then.
  const chin = on(0.13 * s, CH.seatY + 0.52 * s, rz * 0.03);
  const thinkAt = chin;
  const m = hand?.piece ? (hand.u ?? 0) : -1;
  const moving = m >= 0;
  const reach = moving ? sm(m, 0, 0.2) * (1 - sm(m, 0.82, 1)) : 0;
  const tap = hand?.tap ?? 0;
  const near: V = moving && hand!.piece ? [hand!.piece[0], hand!.piece[1] + 0.05, hand!.piece[2]] : thinkAt;
  // The clock's on the +z side of the table: whichever hand is on that side presses it.
  const clock: V = [side * 0.05, CH.clock[1] + 0.06 * (1 - tap), CH.clock[2]];
  let r = moving ? mix(thinkAt, near, sm(m, 0, 0.18)) : thinkAt;
  let l = restFar;
  if (moving && m > 0.82) r = mix(near, thinkAt, sm(m, 0.82, 1));
  if (tap > 0.001) {
    if (rz > 0) r = mix(r, clock, Math.min(1, tap * 1.4));
    else l = mix(l, clock, Math.min(1, tap * 1.4));
  }
  return {
    r,
    l,
    restNear,
    lean: 0.1 + 0.2 * Math.max(reach, tap),
    nod: 0.42 - 0.1 * (moving ? 0 : Math.sin(t * 0.7) * 0.5 + 0.5),
    moving,
    rz,
  };
}

/** A dweller at a spot of these: the same frame the piece works in. */
export function hfPose(m: HfMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const u = hfPhase(m, spot, t);
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(par.matrixWorld);
  const yaw0 = Math.atan2(dir.x, dir.z);
  if (m === 'hfChess') {
    const ud = spot.at.userData;
    const side = ud.side as number;
    const c = chessNow(side, (ud.chess as ChessHand | undefined) ?? null, height, t);
    const seat = spot.at.getWorldPosition(new THREE.Vector3());
    const face = new THREE.Vector3(0, 0, 1).transformDirection(spot.at.matrixWorld);
    return {
      pose: { kind: 'sit', at: seat, yaw: Math.atan2(face.x, face.z), floor: seat.y - CH.seatY },
      doing: { reach: { l: W(c.l), r: W(c.r), lean: c.lean, nod: c.nod, palms: 0.8, grip: { l: 0.3, r: 0.5 } } },
    };
  }
  const ud = spot.at.userData;
  const n = hfNow(m, u, height, t, { glass: ud.glass as number | undefined, book: ud.book as BookPlace | undefined, picture: ud.picture as number | undefined });
  return {
    pose: { kind: 'stand', at: W([n.st[0], 0, n.st[1]]), yaw: yaw0 + n.turn, crouch: n.crouch },
    doing: {
      reach: { l: W(n.l), r: W(n.r), lean: n.lean, nod: n.nod, palms: n.palms, grip: n.grip ?? { l: 0.3, r: 0.3 }, shape: n.shape ? { l: n.shape, r: n.shape } : undefined },
      crouch: n.crouch || undefined,
      shut: n.shut || undefined,
    },
  };
}
