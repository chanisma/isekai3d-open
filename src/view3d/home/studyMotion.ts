import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { HandShape } from '../handTool';
import type { Spot } from '../parts';

/*
 * Studying and making things at home (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구).
 * In a piece's frame: x across, y up, z out of its front; facing the piece the dweller's right hand is on +x.
 *
 * Every motion is a round of beats, one after another, the same for the body (gbPose) and for the piece (study.ts, which
 * reads gbNow in Built.away for what its screens, books and tools are doing). A held tool's +y runs along its handle and its
 * origin is where the leading hand closes.
 *
 * At a computer, sat: gbGame (mouse and keys, a fist in the air), gbDrill (leant in, a replay watched), gbChat, gbWriteBook,
 * gbCode, gbTutorial (following along, a note with a pen), gbCall (headset on, talking with the hands), gbNews, gbTranslate
 * (a look in the dictionary), gbJobs.
 * At the study desk, sat: gbRead (pages turned, a chin on a hand), gbWrite (reading and a pen in the notebook), gbFlash (word
 * cards held up and said aloud).
 * gbScope, gbSlide at the microscope, sat, bent to the eyepieces with a hand on the focus. gbAnatomy (a heart lifted out of
 * the model and looked over), gbAid (a bandage round the practice arm, then compressions), gbChem (pipette, then a flask
 * swirled and held to the light), all stood. gbDrive (sat at the wheel, a hand to the gear), gbPlan (marker on the board),
 * gbPresent (saying it to the room, then the pointer on the chart), gbTycoon (dice, a token moved, thinking).
 * gbWood (saw, plane, chisel, a step along the bench each), gbFile (a file in both hands at the vice), gbFix (screwdriver and a
 * small radio), gbBuild, gbTune, gbBoard (the rocket, with a spanner or a hand on the hatch).
 */
export type GbMotion =
  | 'gbGame' | 'gbDrill' | 'gbChat' | 'gbWriteBook' | 'gbCode' | 'gbTutorial' | 'gbCall' | 'gbNews' | 'gbTranslate' | 'gbJobs'
  | 'gbRead' | 'gbWrite' | 'gbFlash' | 'gbScope' | 'gbSlide' | 'gbAnatomy' | 'gbAid' | 'gbChem' | 'gbDrive' | 'gbPlan' | 'gbPresent' | 'gbTycoon'
  | 'gbWood' | 'gbFile' | 'gbFix' | 'gbBuild' | 'gbTune' | 'gbBoard';
export const GB_MOTIONS = new Set<string>(['gbGame', 'gbDrill', 'gbChat', 'gbWriteBook', 'gbCode', 'gbTutorial', 'gbCall', 'gbNews', 'gbTranslate', 'gbJobs', 'gbRead', 'gbWrite', 'gbFlash', 'gbScope', 'gbSlide', 'gbAnatomy', 'gbAid', 'gbChem', 'gbDrive', 'gbPlan', 'gbPresent', 'gbTycoon', 'gbWood', 'gbFile', 'gbFix', 'gbBuild', 'gbTune', 'gbBoard']);

export type V = [number, number, number];
const TAU = Math.PI * 2;
export const sm = (u: number, a: number, b: number) => {
  const k = Math.min(1, Math.max(0, (u - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
export const fract = (x: number) => x - Math.floor(x);
const mix3 = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];

// -------------------------------------------------------------------------------------------------
// The places the pieces are built to.

/** A computer desk and a study desk: its top, its chair, the keyboard, the mouse and what's on it. */
export const DK = {
  top: 0.74, seatY: 0.47, seatZ: 0.37, front: 0.13,
  kbL: [-0.1, 0.785, 0.0] as V, kbR: [0.1, 0.785, 0.0] as V, mouse: [0.29, 0.785, 0.0] as V,
  note: [0.31, 0.752, -0.17] as V, penRest: [0.42, 0.757, -0.17] as V, dict: [-0.34, 0.79, -0.08] as V,
  book: [0, 0.752, -0.05] as V, notebook: [0.24, 0.752, -0.03] as V, deskPen: [0.4, 0.757, -0.03] as V, cards: [-0.34, 0.77, -0.02] as V,
};
/** The microscope's table: the focus knob, the eyepieces, the stage, the slide tray and the notebook. */
export const MS = { top: 0.74, seatY: 0.52, seatZ: 0.42, knob: [0.11, 0.86, -0.13] as V, stage: [0, 0.895, -0.09] as V, eye: [0, 1.17, 0.05] as V, tray: [0.24, 0.76, 0.06] as V, note: [0.28, 0.752, -0.1] as V, pen: [0.41, 0.757, -0.1] as V };
/** The anatomy model's stand: where it's stood at, its heart's place, the shelf with the practice arm and chest. */
export const AN = { st: 0.56, heart: [0.02, 1.2, 0.1] as V, shelf: 0.86, arm: [-0.14, 0.92, 0.2] as V, chest: [0.17, 0.95, 0.2] as V, roll: [0.36, 0.89, 0.2] as V, lung: [0.1, 1.29, 0.14] as V, head: [0, 1.56, 0.1] as V };
/** The chemistry table. */
export const CM = { top: 0.8, st: 0.46, flask: [0, 0.82, 0.02] as V, bottle: [-0.3, 0.97, -0.02] as V, pipette: [-0.14, 0.82, 0.18] as V, note: [0.3, 0.802, 0.12] as V };
/** The driving rig: the seat, the wheel and the gear lever. */
export const DR = { seatY: 0.42, seatZ: 0.3, wheel: [0, 0.8, -0.1] as V, r: 0.15, tilt: 0.45, shift: [0.27, 0.66, 0.1] as V };
/** The planning board: its face and its marker tray. */
export const PB = { z: -0.3, x0: -0.4, x1: 0.4, y0: 0.85, y1: 1.65, st: 0.08, tray: [0.2, 0.83, -0.25] as V, pointer: [-0.2, 0.83, -0.25] as V, chart: [0.2, 1.3, -0.28] as V };
/** The tycoon table. */
export const TY = { top: 0.72, seatY: 0.47, seatZ: 0.56, board: 0.6, dice: [0.2, 0.74, 0.33] as V, n: 16 };
/** The woodworking bench (2 × 1). */
export const WB = { top: 0.84, st: 0.3, saw: [0.62, 0.97, -0.06] as V, sawRest: [0.28, 0.862, -0.1] as V, plane: [0, 0.945, 0.02] as V, planeRest: [-0.22, 0.92, 0.02] as V, chisel: [-0.56, 0.98, -0.04] as V, chiselRest: [-0.36, 0.86, 0.02] as V };
/** The tool bench (2 × 1). */
export const TB = { top: 0.84, st: 0.3, vice: [0.55, 1.01, -0.02] as V, fileRest: [0.38, 0.862, 0] as V, radio: [-0.42, 0.92, -0.08] as V, driverRest: [-0.1, 0.857, -0.02] as V };
/** The rocket (2 × 2): where it's stood at, the hull's front, the panel and its bolts, the hatch and the spanner on its hook. */
export const RK = { st: 0.98, hull: 0.5, panel: [0.24, 1.23, 0.47] as V, bolts: [[0.13, 1.4], [0.35, 1.4], [0.13, 1.06], [0.35, 1.06]] as Array<[number, number]>, bay: [-0.22, 1.02, 0.47] as V, hatch: [0, 1.5, 0.5] as V, hook: [0.74, 0.96, 0.8] as V };

/** The road ahead's bend at `t`, -1..1 (the screen draws it, the wheel follows it). */
export const gbRoad = (t: number) => 0.62 * Math.sin(t * 0.31) + 0.38 * Math.sin(t * 0.73 + 1.3);
/** Where a hand is on the wheel, in the piece's frame: `a` round from the top, the wheel turned `turn`. */
export function wheelPoint(a: number, turn: number): V {
  const k = a + turn;
  const x = Math.sin(k) * DR.r;
  const up = Math.cos(k) * DR.r;
  return [DR.wheel[0] + x, DR.wheel[1] + up * Math.cos(DR.tilt) + 0.02, DR.wheel[2] - up * Math.sin(DR.tilt) + 0.03];
}
/** The way round the tycoon board: a square's middle, on the table, for `i`. */
export function squareAt(i: number): V {
  const n = TY.n;
  const k = ((Math.floor(i) % n) + n) % n;
  const side = Math.floor(k / 4);
  const along = (k % 4) / 4;
  const half = TY.board / 2 - 0.05;
  const a = -half + along * 2 * half;
  const z = -0.02;
  const y = TY.top + 0.018;
  return side === 0 ? [a, y, half + z] : side === 1 ? [half, y, -a + z] : side === 2 ? [-a, y, -half + z] : [-half, y, a + z];
}
/** The line and how far along it a marker on the board is, at `s` seconds of writing (the board's goals). */
export const PLAN_ROW = 2.4;
export const PLAN_ROWS = 4;
export function planPen(s: number): { row: number; along: number; x: number; y: number } {
  const clipped = Math.max(0, Math.min(PLAN_ROWS * PLAN_ROW - 0.001, s));
  const row = Math.floor(clipped / PLAN_ROW);
  const along = clipped / PLAN_ROW - row;
  return { row, along, x: -0.28 + 0.34 * along, y: 1.46 - row * 0.13 };
}

// -------------------------------------------------------------------------------------------------
// Beats.

export interface GbNow {
  beat: string;
  /** How far on the beat is, 0–1, and seconds into the round. */
  k: number;
  time: number;
  /** How many rounds have gone by. */
  round: number;
  st: [number, number];
  turn: number;
  crouch: number;
  lean: number;
  nod: number;
  palms: number;
  tap: boolean;
  l: V;
  r: V;
  shape?: HandShape;
  tool: null | { name: string; at: V; y: V; z?: V; spin: number; resting: boolean };
}

interface Beat {
  name: string;
  s: number;
  l: V;
  r: V;
  lean?: number;
  nod?: number;
  palms?: number;
  tap?: boolean;
  st?: [number, number];
  turn?: number;
  crouch?: number;
  shape?: HandShape;
  tool?: string;
  at?: V;
  y?: V;
  z?: V;
  resting?: boolean;
  /** What goes on in the beat, on top of the places: k is seconds into it. */
  go?: (n: GbNow, k: number, t: number) => void;
}
type O = Partial<Omit<Beat, 'name' | 's' | 'l' | 'r'>>;
const B = (name: string, s: number, l: V, r: V, o: O = {}): Beat => ({ name, s, l, r, ...o });

/** A chin on a hand, a hand at rest, in a seat at y, z; for someone H tall. */
const chin = (y: number, z: number, H: number, side = -1): V => [side * 0.05, y + 0.43 * H, z - 0.17];
const lap = (y: number, z: number, side: number): V => [side * 0.13, y + 0.1, z - 0.1];
const wob = (p: V, x: number, y: number, z: number) => {
  p[0] += x;
  p[1] += y;
  p[2] += z;
};
const shake = (hz: number, t: number) => Math.sin(t * hz * TAU);
/** How far someone taller than a bench is made for bends the knees to work at it (a full crouch lowers the shoulders about 0.37 m). */
const tallStoop = (H: number) => Math.max(0, H - 1.6) * 2.2;

function deskType(s: number, lean = 0.12): Beat {
  return B('type', s, DK.kbL, DK.kbR, { lean, nod: 0.14, palms: 1.25, tap: true, shape: undefined });
}
function deskMouse(s: number, name = 'mouse', left: V = DK.kbL, lean = 0.08): Beat {
  return B(name, s, left, DK.mouse, { lean, nod: 0.1, palms: 1.2, go: (n, k) => wob(n.r, 0.02 * Math.sin(k * 2.1), 0, 0.016 * Math.sin(k * 3.3)) });
}
const deskThink = (s: number, H: number): Beat => B('think', s, chin(DK.seatY, DK.seatZ, H), DK.mouse, { lean: 0.02, nod: -0.04, palms: 1.2 });

/** A pen in a notebook lying at `p`: small words along the line, the free hand on the page's far side. */
function pen(name: string, s: number, p: V, free: V, lean = 0.2, nod = 0.42): Beat {
  return B(name, s, free, p, {
    lean,
    nod,
    tool: 'pen',
    at: [p[0], p[1] + 0.052, p[2]],
    y: [0.14, 0.8, 0.5],
    go: (n, k) => {
      const q = fract(k / 2.4);
      const line = Math.floor(k / 2.4) % 3;
      n.tool!.at[0] += -0.05 + 0.1 * q + 0.004 * shake(5, k);
      n.tool!.at[2] += -0.03 + line * 0.022;
      n.tool!.at[1] += 0.004 * Math.max(0, shake(4, k));
    },
  });
}
const penRest = (name: string, s: number, rest: V, free: V, lean = 0.14): Beat => B(name, s, free, rest, { lean, nod: 0.25, tool: 'pen', at: rest, y: [0, 0.02, 1], resting: true });

function beats(m: GbMotion, H: number, t: number): Beat[] {
  const Y = DK.seatY;
  const Z = DK.seatZ;
  const sY = MS.seatY;
  const sZ = MS.seatZ;
  switch (m) {
    case 'gbGame':
      return [
        B('play', 16, [-0.14, 0.785, 0.01], DK.mouse, { lean: 0.16, nod: 0.05, palms: 1.2, tap: true, go: (n, k) => wob(n.r, 0.03 * Math.sin(k * 3.1) * Math.sin(k * 7.7), 0, 0.02 * Math.sin(k * 4.3)) }),
        B('win', 2.4, [-0.14, 0.785, 0.01], [0.2, Y + 0.68 * H, Z - 0.1], { lean: -0.05, nod: -0.1, shape: 'power', go: (n, k) => wob(n.r, 0, 0.03 * shake(3, k), 0) }),
      ];
    case 'gbDrill':
      return [
        B('aim', 11, [-0.14, 0.785, 0.01], DK.mouse, { lean: 0.26, nod: 0, palms: 1.2, tap: true, go: (n, k) => wob(n.r, 0.05 * Math.sin(k * 5.3), 0, 0.03 * Math.cos(k * 6.1)) }),
        deskThink(6, H),
      ];
    case 'gbChat':
      return [deskType(5), B('readReply', 4.5, lap(Y, Z, -1), DK.mouse, { lean: -0.02, nod: -0.02, palms: 1.2 }), deskType(3.5), B('smile', 3.5, chin(Y, Z, H), DK.mouse, { nod: -0.05, palms: 1.2 })];
    case 'gbWriteBook':
      return [deskType(13, 0.14), deskThink(6, H), deskType(9, 0.14), B('stretch', 2.6, [-0.2, Y + 0.7 * H, Z - 0.06], [0.2, Y + 0.7 * H, Z - 0.06], { lean: -0.08, nod: -0.16, shape: 'pinch' })];
    case 'gbCode':
      return [deskType(9), deskMouse(3), deskThink(5, H), deskType(7)];
    case 'gbTutorial':
      return [
        deskMouse(5, 'watch', lap(Y, Z, -1), 0.02),
        deskType(8),
        penRest('takePen', 1, DK.penRest, lap(Y, Z, -1)),
        pen('note', 6.5, DK.note, [DK.note[0] - 0.16, DK.note[1] + 0.03, DK.note[2] + 0.03], 0.26, 0.4),
        penRest('putPen', 1, DK.penRest, lap(Y, Z, -1)),
        deskType(6),
      ];
    case 'gbCall': {
      const talk = (n: GbNow, k: number) => wob(n.r, 0.05 * Math.sin(k * 2.1), 0.04 * Math.sin(k * 3.3), 0.02 * Math.sin(k * 1.7));
      return [
        B('talk', 7, lap(Y, Z, -1), [0.14, Y + 0.32 * H, Z - 0.2], { lean: 0.02, nod: -0.02, go: talk }),
        B('listen', 4.5, chin(Y, Z, H), lap(Y, Z, 1), { lean: 0.06, nod: 0.02 }),
        B('repeat', 5, [-0.13, Y + 0.3 * H, Z - 0.2], [0.14, Y + 0.32 * H, Z - 0.2], { go: (n, k) => {
          talk(n, k);
          wob(n.l, 0.04 * Math.sin(k * 1.9 + 1), 0.03 * Math.sin(k * 2.7), 0);
        } }),
        deskType(3),
      ];
    }
    case 'gbNews':
      return [deskMouse(9, 'scroll', chin(Y, Z, H), 0.02), B('leanBack', 4, lap(Y, Z, -1), DK.mouse, { lean: -0.04, nod: -0.02, palms: 1.2 })];
    case 'gbTranslate':
      return [
        deskType(8),
        B('lookUp', 4.5, DK.dict, DK.mouse, { lean: 0.22, nod: 0.3, palms: 1.2, go: (n, k) => wob(n.l, 0, 0.012 * Math.max(0, shake(0.5, k)), 0.03 * Math.sin(k * 0.8)) }),
        deskType(7),
        deskThink(3.5, H),
      ];
    case 'gbJobs':
      return [deskMouse(6, 'scroll', lap(Y, Z, -1)), deskThink(3, H), deskType(3)];
    case 'gbRead': {
      const book = DK.book;
      const left: V = [book[0] - 0.17, book[1] + 0.035, book[2] + 0.1];
      const right: V = [book[0] + 0.17, book[1] + 0.035, book[2] + 0.1];
      const turn = (n: GbNow, k: number) => {
        const u = sm(k, 0, 1.1);
        n.r[0] = right[0] - 0.34 * u;
        n.r[1] = right[1] + 0.09 * Math.sin(u * Math.PI);
      };
      return [
        B('read', 7, left, right, { lean: 0.24, nod: 0.48 }),
        B('turn', 1.2, left, right, { lean: 0.24, nod: 0.42, shape: 'pinch', go: turn }),
        B('read', 6.5, left, right, { lean: 0.24, nod: 0.48 }),
        B('ponder', 4, chin(Y, Z, H), right, { lean: 0.12, nod: 0.3 }),
        B('turn', 1.2, left, right, { lean: 0.24, nod: 0.42, shape: 'pinch', go: turn }),
      ];
    }
    case 'gbWrite': {
      const left: V = [DK.book[0] - 0.12, DK.book[1] + 0.035, DK.book[2] + 0.1];
      return [
        B('read', 3.5, left, [0.05, 0.79, 0.07], { lean: 0.22, nod: 0.46 }),
        penRest('takePen', 0.9, DK.deskPen, left),
        pen('write', 8, DK.notebook, left, 0.22, 0.44),
        B('check', 2.4, left, [0.05, 0.79, 0.07], { lean: 0.24, nod: 0.5 }),
        pen('write', 7, DK.notebook, left, 0.22, 0.44),
        penRest('putPen', 0.9, DK.deskPen, left),
      ];
    }
    case 'gbFlash': {
      const up: V = [-0.08, Y + 0.34 * H, Z - 0.22];
      return [
        B('takeCard', 1.1, DK.cards, lap(Y, Z, 1), { lean: 0.22, nod: 0.3, tool: 'card', at: [DK.cards[0], DK.cards[1], DK.cards[2]], y: [0, 0.2, 1], resting: true }),
        B('say', 3.6, up, lap(Y, Z, 1), { lean: 0.02, nod: 0, tool: 'card', at: up, y: [0, 1, 0.1], z: [0, -0.1, 1] }),
        B('flip', 1.1, up, lap(Y, Z, 1), { lean: 0.03, nod: 0.03, tool: 'card', at: up, y: [0, 1, 0.1], z: [0, -0.1, -1] }),
        B('say', 2.8, up, lap(Y, Z, 1), { lean: 0.02, nod: 0, tool: 'card', at: up, y: [0, 1, 0.1], z: [0, -0.1, -1] }),
        B('putCard', 1, [DK.cards[0] + 0.1, DK.cards[1], DK.cards[2]], lap(Y, Z, 1), { lean: 0.2, nod: 0.3, tool: 'card', at: [DK.cards[0], DK.cards[1] + 0.02, DK.cards[2]], y: [0, 0.2, 1] }),
        B('read', 5, [DK.book[0] - 0.14, DK.book[1] + 0.035, DK.book[2] + 0.1], [DK.book[0] + 0.14, DK.book[1] + 0.035, DK.book[2] + 0.1], { lean: 0.22, nod: 0.46 }),
      ];
    }
    case 'gbScope': {
      const look = (s: number): Beat => B('look', s, [-0.11, MS.stage[1] + 0.005, MS.stage[2] + 0.05], MS.knob, { lean: 0.5, nod: 0.3, shape: 'pinch', go: (n, k) => wob(n.r, 0, 0.004 * Math.sin(k * 3), 0.006 * Math.sin(k * 2)) });
      const free: V = [MS.note[0] - 0.14, MS.note[1] + 0.03, MS.note[2] + 0.03];
      return [
        look(7),
        B('sitUp', 1.6, [-0.11, MS.stage[1] + 0.005, MS.stage[2] + 0.05], lap(sY, sZ, 1), { lean: 0.1, nod: 0.1 }),
        B('takePen', 0.9, free, MS.pen, { lean: 0.16, nod: 0.3, shape: 'pinch', tool: 'pen', at: MS.pen, y: [0.2, 0.02, 1], resting: true }),
        pen('note', 5, MS.note, free, 0.26, 0.4),
        B('putPen', 0.9, free, MS.pen, { lean: 0.16, nod: 0.3, tool: 'pen', at: MS.pen, y: [0.2, 0.02, 1] }),
        look(6),
      ];
    }
    case 'gbSlide': {
      const tray = MS.tray;
      const stage = MS.stage;
      return [
        B('takeSlide', 1.2, lap(sY, sZ, -1), tray, { lean: 0.2, nod: 0.3, tool: 'slide', at: tray, y: [0, 0, 1], z: [1, 0, 0], resting: true }),
        B('toLight', 1.8, lap(sY, sZ, -1), [0.1, 1.02, 0.06], { lean: 0.12, nod: 0.08, tool: 'slide', at: [0.1, 1.02, 0.06], y: [0, 1, 0.2], z: [1, 0, 0] }),
        B('onStage', 1.5, [-0.1, stage[1] + 0.005, stage[2] + 0.06], [stage[0] + 0.06, stage[1] + 0.012, stage[2] + 0.02], { lean: 0.26, nod: 0.3, tool: 'slide', at: [stage[0], stage[1] + 0.008, stage[2]], y: [0, 0, 1], z: [1, 0, 0] }),
        B('look', 8.5, [-0.11, stage[1] + 0.005, stage[2] + 0.05], MS.knob, { lean: 0.5, nod: 0.3, shape: 'pinch', go: (n, k) => wob(n.r, 0, 0.004 * Math.sin(k * 3), 0.006 * Math.sin(k * 2)) }),
      ];
    }
    case 'gbAnatomy': {
      const st: [number, number] = [0, AN.st];
      const heartAt: V = [0.02, Math.min(1.26, 0.74 * H), 0.3];
      return [
        B('point', 3.2, [-0.14, 0.72 * H * 0.8, 0.42], AN.lung, { st, lean: 0.06, nod: 0.1, shape: 'pinch', go: (n, k) => wob(n.r, 0.03 * Math.sin(k * 1.5), 0.02 * Math.sin(k * 1.1), 0) }),
        B('takeHeart', 1.2, [AN.heart[0] - 0.05, AN.heart[1], AN.heart[2] + 0.02], [AN.heart[0] + 0.05, AN.heart[1], AN.heart[2] + 0.02], { st, lean: 0.12, nod: 0.08, tool: 'heart', at: AN.heart, y: [0, 1, 0], resting: true }),
        B('look', 5.6, heartAt, heartAt, { st, lean: 0.03, nod: 0.26, tool: 'heart', at: heartAt, y: [0, 1, 0], go: (n, k) => {
          n.tool!.y = [0.5 * Math.sin(k * 0.8), 1, 0.4 * Math.cos(k * 0.8)];
        } }),
        B('backHeart', 1.2, heartAt, heartAt, { st, lean: 0.12, nod: 0.08, tool: 'heart', at: AN.heart, y: [0, 1, 0] }),
        B('head', 3, [-0.14, 0.72 * H * 0.8, 0.42], [AN.head[0] + 0.05, Math.min(AN.head[1], 0.92 * H), AN.head[2] + 0.04], { st, lean: 0.03, nod: -0.1, shape: 'flat' }),
        B('chart', 3.4, [-0.12, 0.6 * H, 0.36], [0.14, 0.6 * H, 0.36], { st, turn: 0.5, lean: 0.02, nod: 0.05 }),
      ];
    }
    case 'gbAid': {
      const st: [number, number] = [0, AN.st - 0.04];
      const arm = AN.arm;
      const chest = AN.chest;
      return [
        B('takeRoll', 1.1, [arm[0], arm[1] + 0.03, arm[2] + 0.02], AN.roll, { st: [0.12, st[1]], lean: 0.3, nod: 0.3, tool: 'roll', at: AN.roll, y: [1, 0, 0], resting: true }),
        B('wrap', 8.5, [arm[0] - 0.14, arm[1] + 0.03, arm[2]], arm, { st: [-0.08, st[1]], lean: 0.34, nod: 0.36, tool: 'roll', at: arm, y: [1, 0, 0], go: (n, k) => {
          const a = k * 3.2;
          const x = -0.09 + 0.18 * Math.min(1, k / 7.5);
          n.tool!.at = [arm[0] + x, arm[1] + 0.05 * Math.cos(a), arm[2] + 0.05 * Math.sin(a)];
        } }),
        B('putRoll', 1, [arm[0], arm[1] + 0.03, arm[2] + 0.02], AN.roll, { st: [0.12, st[1]], lean: 0.3, nod: 0.3, tool: 'roll', at: AN.roll, y: [1, 0, 0] }),
        B('compress', 8, [chest[0] - 0.012, chest[1], chest[2] + 0.015], [chest[0] + 0.012, chest[1] + 0.012, chest[2]], { st: [chest[0], st[1]], lean: 0.52, nod: 0.3, palms: 1.3, shape: 'flat', go: (n, k) => {
          const d = 0.03 * Math.max(0, Math.sin(k * 3.3 * TAU * 0.6));
          n.l[1] -= d;
          n.r[1] -= d;
          n.lean += d * 2;
        } }),
        B('check', 2.4, [chest[0] - 0.05, chest[1] + 0.05, chest[2] + 0.06], [chest[0] + 0.1, chest[1] + 0.05, chest[2] + 0.06], { st: [chest[0], st[1]], lean: 0.24, nod: 0.4 }),
      ];
    }
    case 'gbChem': {
      const st: [number, number] = [0, CM.st];
      const dropAt: V = [CM.flask[0], CM.flask[1] + 0.3, CM.flask[2]];
      const flaskUp: V = [0.04, Math.min(1.34, 0.82 * H), 0.3];
      const pipY: V = [0.04, 1, 0.1];
      return [
        B('takePipette', 1, [-0.05, 0.86, 0.14], CM.pipette, { st, lean: 0.24, nod: 0.3, tool: 'pipette', at: CM.pipette, y: [0, 0.03, 1], resting: true }),
        B('draw', 2.4, [CM.bottle[0] + 0.02, CM.bottle[1] - 0.08, CM.bottle[2]], [CM.bottle[0], CM.bottle[1] + 0.1, CM.bottle[2]], { st: [-0.1, st[1]], lean: 0.2, nod: 0.24, tool: 'pipette', at: [CM.bottle[0], CM.bottle[1] + 0.14, CM.bottle[2]], y: pipY, go: (n, k) => { n.tool!.at[1] += 0.015 * Math.sin(k * 3); } }),
        B('drop', 3.6, [-0.1, 0.9, 0.13], dropAt, { st, lean: 0.2, nod: 0.28, tool: 'pipette', at: dropAt, y: pipY }),
        B('putPipette', 0.9, [-0.05, 0.86, 0.14], CM.pipette, { st, lean: 0.24, nod: 0.3, tool: 'pipette', at: CM.pipette, y: [0, 0.03, 1] }),
        B('takeFlask', 0.9, [-0.1, 0.86, 0.14], [CM.flask[0], CM.flask[1] + 0.13, CM.flask[2]], { st, lean: 0.22, nod: 0.26, tool: 'flask', at: [CM.flask[0], CM.flask[1] + 0.13, CM.flask[2]], y: [0, 1, 0], resting: true }),
        B('swirl', 4, [-0.1, 0.92, 0.2], [0.04, 1.08, 0.24], { st, lean: 0.08, nod: 0.26, tool: 'flask', at: [0.04, 1.08, 0.24], y: [0, 1, 0], go: (n, k) => {
          n.tool!.at[0] += 0.025 * Math.cos(k * 9);
          n.tool!.at[2] += 0.025 * Math.sin(k * 9);
          n.tool!.y = [0.14 * Math.cos(k * 9), 1, 0.14 * Math.sin(k * 9)];
        } }),
        B('toLight', 2.8, [-0.1, 0.92, 0.2], flaskUp, { st, lean: -0.02, nod: -0.1, tool: 'flask', at: flaskUp, y: [0.1, 1, 0] }),
        B('putFlask', 1, [-0.1, 0.86, 0.14], [CM.flask[0], CM.flask[1] + 0.13, CM.flask[2]], { st, lean: 0.22, nod: 0.26, tool: 'flask', at: [CM.flask[0], CM.flask[1] + 0.13, CM.flask[2]], y: [0, 1, 0] }),
      ];
    }
    case 'gbDrive': {
      const hands = (n: GbNow) => {
        const turn = gbRoad(t) * 0.95;
        n.l = wheelPoint(-1.15, turn);
        if (n.beat !== 'shift') n.r = wheelPoint(1.15, turn);
      };
      const wheel = (s: number, name = 'steer'): Beat => B(name, s, wheelPoint(-1.15, 0), wheelPoint(1.15, 0), { lean: 0.03, nod: -0.02, palms: 0.5, shape: 'power', go: hands });
      return [wheel(11), B('shift', 1.6, wheelPoint(-1.15, 0), DR.shift, { lean: 0.03, nod: 0.08, palms: 0.5, shape: 'power', go: (n, k) => {
        hands(n);
        n.r[2] += 0.03 * Math.sin(k * 4);
      } }), wheel(9)];
    }
    case 'gbPlan': {
      const st: [number, number] = [0.08, PB.st];
      const rest: V = [-0.12, 0.62 * H, PB.st - 0.18];
      const penY: V = [0.12, 0.5, 0.86];
      return [
        B('takeMarker', 1, rest, PB.tray, { st, lean: 0.14, nod: 0.3, tool: 'marker', at: PB.tray, y: [1, 0.02, 0], resting: true }),
        B('write', PLAN_ROWS * PLAN_ROW, rest, [0, 1.3, PB.z + 0.02], { st, lean: 0.06, nod: 0, tool: 'marker', at: [0, 1.3, PB.z + 0.04], y: penY, go: (n, k) => {
          const p = planPen(k);
          n.tool!.at = [p.x + 0.004 * shake(6, k), Math.min(p.y, 0.86 * H + 0.16) + 0.004 * shake(3.5, k), PB.z + 0.05];
        } }),
        B('stepBack', 3.2, chin(0, st[1] + 0.1, H * 2) , [0.14, 0.6 * H, st[1] - 0.14], { st: [0.08, st[1] + 0.12], lean: 0, nod: -0.02, tool: 'marker', at: [0.14, 0.6 * H, st[1] - 0.14], y: [0, 1, 0.3] }),
        B('tick', 2, rest, [0, 1.3, PB.z + 0.02], { st, lean: 0.06, nod: 0, tool: 'marker', at: [0.2, 1.3, PB.z + 0.05], y: penY, go: (n, k) => {
          n.tool!.at[1] = Math.min(1.46 - Math.floor(k / 0.5) * 0.13, 0.86 * H + 0.16);
        } }),
        B('putMarker', 1, rest, PB.tray, { st, lean: 0.14, nod: 0.3, tool: 'marker', at: PB.tray, y: [1, 0.02, 0] }),
      ];
    }
    case 'gbPresent': {
      const st: [number, number] = [0.34, PB.st + 0.1];
      const talk = (n: GbNow, k: number) => {
        wob(n.r, 0.08 * Math.sin(k * 1.6), 0.06 * Math.sin(k * 2.3), 0);
        wob(n.l, 0.06 * Math.sin(k * 1.3 + 1), 0.05 * Math.sin(k * 1.9), 0);
        n.turn += 0.22 * Math.sin(k * 0.5);
      };
      // Facing out from the board, in the piece's frame their hands are towards +z of them.
      const out = (x: number, y: number): V => [st[0] + x, y, st[1] + 0.24];
      return [
        B('talk', 6, out(0.14, 0.62 * H), out(-0.16, 0.66 * H), { st, turn: Math.PI, nod: -0.02, go: talk }),
        B('takePointer', 1.4, [0.26, 0.6 * H, st[1] - 0.14], PB.pointer, { st: [0.05, PB.st], lean: 0.16, nod: 0.3, tool: 'pointer', at: PB.pointer, y: [1, 0.02, 0], resting: true }),
        B('point', 4.6, [-0.1, 0.56 * H, PB.st - 0.16], [0.16, 0.72 * H, PB.st - 0.1], { st: [0.05, PB.st], tool: 'pointer', at: [0.16, Math.min(1.16, 0.72 * H), PB.st - 0.1], y: [0.06, 0.2, -0.96], go: (n, k) => { n.tool!.y = [0.06 + 0.16 * Math.sin(k * 0.9), 0.14 + 0.1 * Math.sin(k * 1.4), -0.96]; } }),
        B('putPointer', 1.2, [0.26, 0.6 * H, st[1] - 0.14], PB.pointer, { st: [0.05, PB.st], lean: 0.16, nod: 0.3, tool: 'pointer', at: PB.pointer, y: [1, 0.02, 0] }),
        B('talk', 5, out(0.14, 0.62 * H), out(-0.16, 0.66 * H), { st, turn: Math.PI, nod: -0.02, go: talk }),
      ];
    }
    case 'gbTycoon': {
      const y = TY.seatY;
      const z = TY.seatZ;
      const dice = TY.dice;
      const shakeAt: V = [0.14, 0.9, 0.34];
      return [
        B('takeDice', 0.9, lap(y, z, -1), dice, { lean: 0.26, nod: 0.3, tool: 'dice', at: dice, y: [0, 1, 0], resting: true }),
        B('shake', 1.6, lap(y, z, -1), shakeAt, { lean: 0.1, nod: 0.1, tool: 'dice', at: shakeAt, y: [0, 1, 0], go: (n, k) => { n.tool!.at[1] += 0.03 * shake(4, k); } }),
        B('throw', 1.8, lap(y, z, -1), [0.03, 0.82, 0.14], { lean: 0.18, nod: 0.34, shape: 'flat' }),
        B('move', 3, [-0.14, TY.top + 0.04, 0.3], [0, TY.top + 0.03, 0.2], { lean: 0.32, nod: 0.36, shape: 'pinch' }),
        B('think', 5, chin(y, z, H), [0.14, TY.top + 0.03, 0.34], { lean: 0.16, nod: 0.26 }),
        B('money', 2.2, [-0.17, TY.top + 0.04, 0.3], [-0.08, TY.top + 0.04, 0.33], { lean: 0.28, nod: 0.32, shape: 'pinch', go: (n, k) => wob(n.r, 0.05 * Math.sin(k * 3), 0, 0) }),
      ];
    }
    case 'gbWood': {
      const stoop = tallStoop(H);
      const sawSt: [number, number] = [WB.saw[0] - 0.13, 0.4];
      const sawTake: [number, number] = [WB.sawRest[0] + 0.1, WB.st];
      const midSt: [number, number] = [0, WB.st];
      const planeTake: [number, number] = [WB.planeRest[0], WB.st];
      const chiSt: [number, number] = [WB.chisel[0] + 0.04, WB.st];
      const chiTake: [number, number] = [WB.chiselRest[0] - 0.04, WB.st];
      const hold: V = [WB.saw[0] - 0.24, WB.top + 0.08, WB.saw[2] + 0.06];
      const off: V = [-0.15, 0.56 * H, WB.st - 0.18];
      const offR: V = [0.15, 0.56 * H, WB.st - 0.18];
      const planeAt = (z: number): V => [WB.plane[0], WB.plane[1], WB.plane[2] + z];
      const chiselAt: V = [WB.chisel[0], WB.chisel[1] + 0.08, WB.chisel[2] + 0.14];
      const low = stoop + 0.3;
      return [
        B('takeSaw', 1, hold, WB.sawRest, { st: sawTake, lean: 0.32, nod: 0.3, crouch: low, tool: 'saw', at: WB.sawRest, y: [0, 0.02, 1], z: [1, 0, 0], resting: true }),
        B('saw', 8, hold, WB.saw, { st: sawSt, lean: 0.24, nod: 0.32, crouch: stoop, tool: 'saw', at: WB.saw, y: [0, 0.9, -0.42], go: (n, k) => {
          const p = Math.sin(k * 6.4);
          n.tool!.at = [WB.saw[0], WB.saw[1] + 0.05 - 0.012 * p - 0.05 * Math.min(1, k / 8), WB.saw[2] + 0.13 + 0.11 * p];
          n.lean += 0.03 * p;
        } }),
        B('putSaw', 0.9, hold, WB.sawRest, { st: sawTake, lean: 0.32, nod: 0.3, crouch: low, tool: 'saw', at: WB.sawRest, y: [0, 0.02, 1], z: [1, 0, 0] }),
        // Walked along the bench with the hands free, so nothing is reached for from across it.
        B('walk', 1.1, off, offR, { st: planeTake }),
        B('takePlane', 1, off, WB.planeRest, { st: planeTake, lean: 0.3, nod: 0.3, crouch: low, tool: 'plane', at: WB.planeRest, y: [0, 1, 0], resting: true }),
        B('plane', 9, off, WB.plane, { st: midSt, lean: 0.26, nod: 0.3, crouch: stoop, tool: 'plane', at: WB.plane, y: [0, 1, 0], go: (n, k) => {
          const p = fract(k / 1.6);
          const push = p < 0.62 ? sm(p, 0, 0.62) : 1 - sm(p, 0.62, 1);
          n.tool!.at = planeAt(0.11 - 0.12 * push);
          n.tool!.at[1] += p < 0.62 ? 0 : 0.012;
          n.lean += 0.06 * push;
        } }),
        B('putPlane', 1, off, WB.planeRest, { st: planeTake, lean: 0.3, nod: 0.3, crouch: low, tool: 'plane', at: WB.planeRest, y: [0, 1, 0] }),
        B('walk', 0.7, off, offR, { st: chiTake }),
        B('takeChisel', 0.9, off, WB.chiselRest, { st: chiTake, lean: 0.3, nod: 0.3, crouch: low, tool: 'chisel', at: WB.chiselRest, y: [1, 0, 0], resting: true }),
        B('chisel', 8, off, chiselAt, { st: chiSt, lean: 0.26, nod: 0.34, crouch: stoop, tool: 'chisel', at: chiselAt, y: [0.1, 0.56, 0.82], go: (n, k) => {
          const p = fract(k / 1.3);
          const cut = p < 0.5 ? sm(p, 0, 0.5) : 1 - sm(p, 0.5, 1);
          const row = Math.floor(k / 2.6) % 3;
          n.tool!.at = [chiselAt[0] - 0.03 + row * 0.03, chiselAt[1] - 0.012 * cut, chiselAt[2] - 0.05 * cut];
        } }),
        B('putChisel', 0.9, off, WB.chiselRest, { st: chiTake, lean: 0.3, nod: 0.3, crouch: low, tool: 'chisel', at: WB.chiselRest, y: [1, 0, 0] }),
        B('brush', 2.6, [WB.chisel[0] - 0.08, WB.chisel[1] + 0.02, WB.chisel[2] + 0.08], [WB.chisel[0] + 0.1, WB.chisel[1] + 0.03, WB.chisel[2] + 0.1], { st: chiSt, lean: 0.24, nod: 0.36, crouch: stoop, shape: 'flat', go: (n, k) => wob(n.r, 0.05 * Math.sin(k * 7), 0, 0) }),
        B('walk', 1.3, off, offR, { st: sawTake }),
      ];
    }
    case 'gbFile': {
      const stoop = tallStoop(H);
      const low = stoop + 0.3;
      const v = TB.vice;
      const st: [number, number] = [v[0], TB.st];
      const take: [number, number] = [TB.fileRest[0] - 0.06, TB.st];
      const off: V = [v[0] - 0.2, TB.top + 0.05, v[2] + 0.08];
      const fileAt = (z: number): V => [v[0], v[1] + 0.012, v[2] + 0.2 + z];
      const fileY: V = [0, 0.1, 0.99];
      // Across the body in front of the chest, the blade to the left: both arms get to it (held up on end, the left hand on the blade was out of reach).
      const held: V = [v[0] + 0.08, 0.66 * H, TB.st - 0.26];
      const stroke = (n: GbNow, k: number) => {
        const p = fract(k / 1.4);
        const push = p < 0.6 ? sm(p, 0, 0.6) : 1 - sm(p, 0.6, 1);
        n.tool!.at = fileAt(-0.1 * push);
        n.tool!.at[1] += p < 0.6 ? 0 : 0.008;
        n.lean += 0.06 * push;
      };
      return [
        B('takeFile', 1, off, TB.fileRest, { st: take, lean: 0.32, nod: 0.3, crouch: low, tool: 'file', at: TB.fileRest, y: [1, 0.01, 0], resting: true }),
        B('file', 9, off, fileAt(0), { st, lean: 0.2, nod: 0.32, crouch: stoop, tool: 'file', at: fileAt(0), y: fileY, go: stroke }),
        // Held up out of the way in both hands, while the work is looked over.
        B('inspect', 3.2, held, held, { st, lean: 0.3, nod: 0.46, crouch: stoop, tool: 'file', at: held, y: [0.9, 0.3, 0.25] }),
        B('file', 7, off, fileAt(0), { st, lean: 0.2, nod: 0.32, crouch: stoop, tool: 'file', at: fileAt(0), y: fileY, go: stroke }),
        B('putFile', 1, off, TB.fileRest, { st: take, lean: 0.32, nod: 0.3, crouch: low, tool: 'file', at: TB.fileRest, y: [1, 0.01, 0] }),
      ];
    }
    case 'gbFix': {
      const st: [number, number] = [TB.radio[0] + 0.04, TB.st];
      const rad = TB.radio;
      const steady: V = [rad[0] - 0.13, rad[1], rad[2] + 0.07];
      const screw: V = [rad[0] - 0.08, rad[1] + 0.19, rad[2] + 0.04];
      const dy: V = [0.06, 0.92, 0.38];
      const off: V = [-0.14, 0.56 * H, TB.st - 0.18];
      return [
        B('takeDriver', 1, steady, TB.driverRest, { st: [TB.driverRest[0] - 0.08, TB.st], lean: 0.3, nod: 0.3, tool: 'driver', at: TB.driverRest, y: [1, 0.02, 0], resting: true }),
        B('screw', 7, steady, screw, { st, lean: 0.24, nod: 0.36, tool: 'driver', at: screw, y: dy, go: (n, k) => {
          n.tool!.spin = k * 7;
          n.tool!.at = [screw[0] + (Math.floor(k / 3.5) % 2) * 0.09, screw[1], screw[2]];
        } }),
        B('lookIn', 3.4, [rad[0] - 0.1, rad[1] + 0.13, rad[2] + 0.04], [0.02 + rad[0], rad[1] + 0.2, rad[2] + 0.14], { st, lean: 0.34, nod: 0.44, tool: 'driver', at: [0.02 + rad[0], rad[1] + 0.2, rad[2] + 0.14], y: [0.3, 0.9, 0.3] }),
        B('screw', 5, steady, screw, { st, lean: 0.24, nod: 0.36, tool: 'driver', at: screw, y: dy, go: (n, k) => {
          n.tool!.spin = -k * 7;
          n.tool!.at = [screw[0] + (Math.floor(k / 2.5) % 2) * 0.09, screw[1], screw[2]];
        } }),
        B('putDriver', 1, steady, TB.driverRest, { st: [TB.driverRest[0] - 0.08, TB.st], lean: 0.3, nod: 0.3, tool: 'driver', at: TB.driverRest, y: [1, 0.02, 0] }),
        B('tryIt', 3.6, off, [rad[0] + 0.1, rad[1] + 0.06, rad[2] + 0.1], { st, lean: 0.14, nod: 0.3, shape: 'pinch', go: (n, k) => wob(n.r, 0, -0.008 * Math.max(0, shake(0.6, k)), 0) }),
      ];
    }
    case 'gbBuild': {
      const st: [number, number] = [0.24, RK.st];
      const steady: V = [0.03, 1.2, RK.hull + 0.02];
      const bolt = (i: number, s: number): Beat => {
        const [bx, by] = RK.bolts[i];
        const head: V = [bx, by, RK.hull + 0.2];
        return B(`bolt${i}`, s, steady, head, { st, lean: 0.14, nod: 0.1, tool: 'spanner', at: head, y: [0.02, 0.02, -1], go: (n, k) => {
          // The hand out to the side of the bolt, the jaw on it, swung up and down.
          const a = 0.55 * Math.sin(k * 3.1);
          n.tool!.at = [bx + Math.cos(a) * 0.16, by - Math.sin(a) * 0.16, RK.hull + 0.03];
          n.tool!.y = [-Math.cos(a), Math.sin(a), 0];
          n.lean += 0.02 * Math.sin(k * 3.1);
        } });
      };
      return [
        B('takeSpanner', 1.2, steady, RK.hook, { st: [0.46, RK.st - 0.02], lean: 0.05, nod: 0.08, tool: 'spanner', at: RK.hook, y: [0, -1, 0], resting: true }),
        bolt(0, 5), bolt(1, 5), bolt(2, 5), bolt(3, 5),
        B('putSpanner', 1.2, steady, RK.hook, { st: [0.46, RK.st - 0.02], lean: 0.05, nod: 0.08, tool: 'spanner', at: RK.hook, y: [0, -1, 0] }),
        B('fit', 4.4, [0.12, 1.23, RK.hull + 0.04], [0.36, 1.23, RK.hull + 0.04], { st, lean: 0.12, nod: 0.05, shape: 'flat' }),
      ];
    }
    case 'gbTune': {
      const st: [number, number] = [-0.22, RK.st];
      const bay = RK.bay;
      const free: V = [bay[0] - 0.2, bay[1] + 0.26, RK.hull + 0.03];
      return [
        B('takeSpanner', 1.4, free, RK.hook, { st: [0.46, RK.st - 0.02], lean: 0.05, nod: 0.08, tool: 'spanner', at: RK.hook, y: [0, -1, 0], resting: true }),
        B('inBay', 8, free, bay, { st, lean: 0.2, nod: 0.3, tool: 'spanner', at: bay, y: [0.3, 0.3, -0.9], go: (n, k) => {
          const a = 0.5 * Math.sin(k * 2.7);
          n.tool!.at = [bay[0] + 0.05 * a, bay[1] + 0.04 * Math.cos(k * 2.7), bay[2] + 0.08];
        } }),
        B('putSpanner', 1.4, free, RK.hook, { st: [0.46, RK.st - 0.02], lean: 0.05, nod: 0.08, tool: 'spanner', at: RK.hook, y: [0, -1, 0] }),
        B('gauge', 4.4, [-0.04, 1.3, RK.hull + 0.03], [-0.1, 1.14, RK.hull + 0.04], { st: [-0.05, RK.st], lean: 0.06, nod: 0.04, shape: 'pinch' }),
      ];
    }
    case 'gbBoard':
      return [
        B('hatch', 4, [-0.14, Math.min(RK.hatch[1], 0.88 * H), RK.hull + 0.03], [0.14, Math.min(RK.hatch[1], 0.88 * H), RK.hull + 0.03], { st: [0, RK.st - 0.02], lean: 0.06, nod: -0.1, shape: 'power' }),
        B('wave', 3, [-0.14, 0.58 * H, RK.st - 0.16], [0.24, 0.98 * H, RK.st + 0.06], { st: [0, RK.st], turn: Math.PI, nod: 0, shape: 'flat', go: (n, k) => wob(n.r, 0.09 * Math.sin(k * 8), 0, 0) }),
      ];
  }
}

/** How long a round of a motion is, seconds. */
const ROUND = new Map<GbMotion, number>();
export function gbSeconds(m: GbMotion): number {
  let s = ROUND.get(m);
  if (s === undefined) {
    s = beats(m, 1.6, 0).reduce((a, b) => a + b.s, 0);
    ROUND.set(m, s);
  }
  return s;
}
/** The beats' names and when each begins, for the piece and for the report. */
export function gbBeats(m: GbMotion): Array<{ name: string; from: number; s: number; tool?: string }> {
  let from = 0;
  return beats(m, 1.6, 0).map((b) => {
    const r = { name: b.name, from, s: b.s, tool: b.tool };
    from += b.s;
    return r;
  });
}

const BLEND = 0.45;

/** Everything at `time` seconds into a use, for someone `H` tall at clock time `t`. */
export function gbNow(m: GbMotion, time: number, H: number, t: number): GbNow {
  const list = beats(m, H, t);
  const total = gbSeconds(m);
  const safe = Number.isFinite(time) ? Math.max(0, time) : 0;
  const round = Math.floor(safe / total);
  const into = safe - round * total;
  let i = 0;
  let from = 0;
  while (i < list.length - 1 && into >= from + list[i].s) from += list[i++].s;
  const b = list[i];
  const a = list[(i + list.length - 1) % list.length];
  const k = into - from;
  const stepped = Math.hypot(b.st && a.st ? b.st[0] - a.st[0] : 0, b.st && a.st ? b.st[1] - a.st[1] : 0);
  const e = sm(k, 0, Math.min(Math.max(BLEND, stepped * 1.6), b.s));
  const num = (x: number | undefined, y: number | undefined, d = 0) => (x ?? d) + ((y ?? d) - (x ?? d)) * e;
  const stA = a.st ?? b.st ?? [0, 0];
  const stB = b.st ?? [0, 0];
  const sameTool = a.tool && a.tool === b.tool;
  const n: GbNow = {
    beat: b.name,
    k: Math.min(1, k / b.s),
    time: into,
    round,
    st: [stA[0] + (stB[0] - stA[0]) * e, stA[1] + (stB[1] - stA[1]) * e],
    turn: num(a.turn, b.turn),
    crouch: num(a.crouch, b.crouch),
    lean: num(a.lean, b.lean),
    nod: num(a.nod, b.nod),
    palms: num(a.palms, b.palms),
    tap: !!b.tap,
    l: mix3(a.l, b.l, e),
    r: mix3(a.r, b.r, e),
    shape: b.shape,
    tool: b.tool
      ? {
          name: b.tool,
          at: sameTool ? mix3(a.at!, b.at!, e) : [b.at![0], b.at![1], b.at![2]],
          y: sameTool ? mix3(a.y!, b.y!, e) : [b.y![0], b.y![1], b.y![2]],
          z: b.z ? (sameTool && a.z ? mix3(a.z, b.z, e) : [b.z[0], b.z[1], b.z[2]]) : undefined,
          spin: 0,
          resting: !!b.resting,
        }
      : null,
  };
  b.go?.(n, k, t);
  // What the beat's moves do to a tool comes in as the beat does, from where the last one left it.
  if (sameTool && n.tool && e < 1) {
    n.tool.at = mix3(a.at!, n.tool.at, e);
    n.tool.y = mix3(a.y!, n.tool.y, e);
  }
  return n;
}

/** A spot's use, told each frame by its pose: when it began. */
export function gbPhase(spot: Spot, t: number): number {
  const ud = spot.at.userData;
  if (t - ((ud.gbLast as number | undefined) ?? -1e9) > 0.6) ud.gbBegan = t;
  ud.gbLast = t;
  return t - (ud.gbBegan as number);
}
/** Seconds into a use if the spot's being used now (for the piece, which runs before the pose), else null. */
export function gbLive(spot: Spot, t: number): number | null {
  const ud = spot.at.userData;
  const last = ud.gbLast as number | undefined;
  if (last === undefined || Math.abs(t - last) > 0.6) return null;
  return t - (ud.gbBegan as number);
}

/** A dweller at a spot of these. */
export function gbPose(m: GbMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const n = gbNow(m, gbPhase(spot, t), height, t);
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(par.matrixWorld);
  const yaw0 = Math.atan2(dir.x, dir.z);
  const reach = {
    l: W(n.l),
    r: W(n.r),
    lean: n.lean,
    nod: n.nod,
    palms: n.palms,
    tap: n.tap || undefined,
    grip: { l: 0.3, r: 0.3 },
    shape: n.shape ? { l: n.shape, r: n.shape } : undefined,
  };
  if (spot.how === 'sit') {
    const seat = spot.at.getWorldPosition(new THREE.Vector3());
    return { pose: { kind: 'sit', at: seat, yaw: yaw0, floor: par.getWorldPosition(new THREE.Vector3()).y }, doing: { reach } };
  }
  return { pose: { kind: 'stand', at: W([n.st[0], 0, n.st[1]]), yaw: yaw0 + n.turn, crouch: n.crouch || undefined }, doing: { reach, crouch: n.crouch || undefined } };
}
