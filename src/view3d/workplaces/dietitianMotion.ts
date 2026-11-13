import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * In a 단체급식실 (2026-10-27, the workplace pipeline, at the user's request): a school cafeteria
 * kitchen as the dietitian runs it. At the 국솥 the soup stirred with the long paddle in both hands,
 * a spoonful ladled into a little bowl and tasted, the probe thermometer put in and read (중심온도),
 * the HACCP sheet written. Behind the 배식대 the dietitian moves along the line with each pupil
 * who slides their tray along the far side: rice scooped, soup ladled, three 반찬 with the tongs, and
 * "맛있게 먹어". Sat at the menu desk: the weekly 식단표 typed up, looked up at the board, highlighted
 * on paper; the calories punched into the calculator from the 식품성분표. At the hygiene station:
 * soap, a lather, a rinse, a paper towel, the cap set straight in the mirror, a swab of the chopping
 * board read on the ATP meter, the sheet ticked; and for the inspector from the 구청, the log binder
 * shown and leafed through, the meter held out, the report signed. At the store shelf a box pulled
 * out and its label read, the meat probed, the rice sack's tag checked, the 검수일지 ticked. And the
 * new pieces: a spoonful of each dish bagged, labelled and put in the 보존식 freezer; returned trays
 * scraped into the 잔반 hole and the weight noted; a rack pushed into the dishwasher and the rinse
 * temperature read, a clean tray held up to the light; today's menu written on the sign with the
 * allergy numbers stuck on.
 *
 * Each is a round of beats by one clock (dtPhase of the piece's fixed mark), shared with the piece
 * it's done at (workplaces/dietitian.ts), so the paddle goes round with the hands, a tray fills as
 * it's served, the scale reads what was scraped. Every place is in the PIECE's frame (x across its
 * front, y up from the floor, z out of its front) and turned into the dweller's own frame by the spot
 * it's done at. Kept out of activity.ts, which only hands these motions over here.
 */
export type DtMotion =
  | 'dtStir' | 'dtServe' | 'dtMenu' | 'dtCalc' | 'dtWash' | 'dtInspect' | 'dtStock'
  | 'dtSample' | 'dtWaste' | 'dtDish' | 'dtPost';
export const DT_MOTIONS = new Set<string>(['dtStir', 'dtServe', 'dtMenu', 'dtCalc', 'dtWash', 'dtInspect', 'dtStock', 'dtSample', 'dtWaste', 'dtDish', 'dtPost']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset from a fixed mark on the piece, so two 국솥s aren't in step. */
export const dtPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
const pulse = (t: number, hz: number, phase = 0, sharp = 4) => Math.max(0, wave(t, hz, phase)) ** sharp;

/** A place in a piece's frame: [x, y, z]. */
export type P = [number, number, number];
export const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Where a spot is in the piece: its marker (the feet stood, the seat's top sat) and which way it faces (0 = +z). */
export interface SpotAt {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the spot, `ahead`), in the piece's frame. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, s.y + up, s.z - side * n + ahead * c];
}
function inSpot(s: SpotAt, p: P): P {
  const dx = p[0] - s.x;
  const dz = p[2] - s.z;
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [dx * c - dz * n, p[1] - s.y, dx * n + dz * c];
}

type Step<K extends string> = { key: K; hold: number; move: number };
/** Where a round is: the beat it's on (or easing out of, `e` of the way to the next) and `p`, how far through its hold; `n` counts rounds. */
export interface Beat<K extends string> {
  from: K;
  to: K;
  e: number;
  p: number;
  n: number;
}
function beatOf<K extends string>(steps: Array<Step<K>>, t: number, phase: number): Beat<K> {
  const T = steps.reduce((n, k) => n + k.hold + k.move, 0);
  const c = t / T + phase;
  const n = Math.floor(c);
  let u = frac(c) * T;
  for (let i = 0; i < steps.length; i++) {
    const k = steps[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, p: u / k.hold, n };
    u -= k.hold;
    const next = steps[(i + 1) % steps.length];
    if (u < k.move || i === steps.length - 1) return { from: k.key, to: next.key, e: ss(Math.min(1, u / k.move)), p: 1, n };
    u -= k.move;
  }
  return { from: steps[0].key, to: steps[0].key, e: 0, p: 0, n };
}
const st = <K extends string>(key: K, hold: number, move = 0.5): Step<K> => ({ key, hold, move });
/** How much a beat is on (1 held, easing in and out). */
export function amountOf<K extends string>(b: Beat<K>, key: K): number {
  return (b.from === key ? 1 - b.e : 0) + (b.to === key ? b.e : 0);
}
/** A value each beat has (given how far through it is), eased from one beat's to the next's. */
function valueOf<K extends string>(b: Beat<K>, v: (k: K, p: number) => number): number {
  return b.e > 0 ? mix(v(b.from, 1), v(b.to, 0), b.e) : v(b.from, b.p);
}
/** How far through the round a beat is (its place in the list), for "has this happened yet". */
function orderOf<K extends string>(steps: Array<Step<K>>, k: K): number {
  return steps.findIndex((s) => s.key === k);
}
/** Whether beat `k` has come (or is under way past `at` of its hold) this round. */
function reached<K extends string>(steps: Array<Step<K>>, b: Beat<K>, k: K, at = 0.5): boolean {
  const now = orderOf(steps, b.from);
  const it = orderOf(steps, k);
  return now > it || (now === it && b.p >= at);
}

/** Hands and bend, the hands in the piece's frame; fingers tapping (keys, a calculator). */
export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch?: number;
  tap?: boolean;
}
function mixKey(a: Key, b: Key, e: number): Key {
  return { l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e), gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch ?? 0, b.crouch ?? 0, e), tap: e < 0.5 ? a.tap : b.tap };
}
function blended<K extends string>(beat: Beat<K>, pose: (k: K, p: number) => Key): Key {
  const a = pose(beat.from, beat.e > 0 ? 1 : beat.p);
  return beat.e > 0 ? mixKey(a, pose(beat.to, 0), beat.e) : a;
}

// =============================================================================================
// The 국솥 (bulkCooker, 2 × 1): a tilting steam kettle on the left, its console on the right.

/** The kettle: its middle, radius, rim and the soup's surface; the trunnions it tilts on. */
export const KETTLE = { cx: -0.3, cz: -0.06, r: 0.36, rim: 0.9, soup: 0.79, pivot: 0.74, console: { x: 0.66, w: 0.56, z: -0.2, d: 0.5, h: 1.12 } };
/** Stood at the kettle's front, facing it. */
export const COOK_AT: SpotAt = { x: KETTLE.cx + 0.02, y: 0, z: 0.56, yaw: Math.PI };
/** Briefing the cooks: stood by the console, turned to the two drawn in at the kettle's front. */
export const BRIEF_AT: SpotAt = { x: 0.6, y: 0, z: 0.66, yaw: -1.45 };
/** The two cooks (조리원) listening, and which way they face (towards the briefing). */
export const COOKS: Array<{ x: number; z: number; yaw: number }> = [
  { x: -0.12, z: 0.86, yaw: 1.84 },
  { x: -0.55, z: 0.7, yaw: 1.6 },
];
/** The clipboard on the console's side, the ladle's hook. */
export const SHEET: P = [KETTLE.console.x - KETTLE.console.w / 2 - 0.005, 1.0, -0.05];
/**
 * Checking the cooking (조리 점검), ~22 s round: the soup stirred with the long paddle (both hands on
 * its shaft, round and round); a spoonful ladled into the tasting bowl and tasted (blown on, sipped);
 * the probe thermometer held in the soup and read (중심온도 75℃ 이상); the HACCP sheet written.
 */
export type StirKey = 'stir' | 'ladle' | 'sip' | 'probe' | 'read' | 'note';
const STIRS: Array<Step<StirKey>> = [st('stir', 7, 0.6), st('ladle', 1.8, 0.4), st('sip', 2.2, 0.6), st('probe', 2.2, 0.4), st('read', 1.8, 0.6), st('note', 2.4, 0.7)];
export const stirBeat = (t: number, ph: number) => beatOf(STIRS, t, ph);
/** The paddle's blade (in the soup) and the top of its shaft, going round. */
export function paddleAt(t: number, ph: number): { blade: P; top: P } {
  const a = (t * 0.55 + ph) * Math.PI * 2;
  const K = KETTLE;
  return { blade: [K.cx - 0.15 * Math.cos(a), K.soup - 0.2, K.cz - 0.13 * Math.sin(a)], top: [K.cx + 0.1 * Math.cos(a), 1.3, 0.3 + 0.06 * Math.sin(a)] };
}
/** The paddle at rest, leant in the kettle against its back rim. */
export const PADDLE_REST = { blade: [KETTLE.cx + 0.05, KETTLE.soup - 0.22, KETTLE.cz - 0.02] as P, top: [KETTLE.cx + 0.22, 1.45, KETTLE.cz - 0.3] as P };
/** Along the shaft from the top towards the blade, `d` metres. */
export function alongShaft(pd: { blade: P; top: P }, d: number): P {
  const v: P = [pd.blade[0] - pd.top[0], pd.blade[1] - pd.top[1], pd.blade[2] - pd.top[2]];
  const L = Math.hypot(v[0], v[1], v[2]);
  return add(pd.top, [(v[0] / L) * d, (v[1] / L) * d, (v[2] / L) * d]);
}
export const paddleHeld = (b: Beat<StirKey>) => b.from === 'stir' || (b.to === 'stir' && b.e > 0.5);
export const ladleHeld = (b: Beat<StirKey>) => b.from === 'ladle' || b.from === 'sip';
export const probeHeld = (b: Beat<StirKey>) => b.from === 'probe' || b.from === 'read';
export const sheetHeld = (b: Beat<StirKey>) => b.from === 'note';
/** What the probe reads (rising as it sits in the soup). */
export const probeReads = (b: Beat<StirKey>) => (b.from === 'probe' ? 24 + 68 * ss(b.p, 0.1, 0.9) : b.from === 'read' ? 92.4 : 24);
function stirKey(k: StirKey, p: number, t: number, s: number, ph: number): Key {
  const K = KETTLE;
  switch (k) {
    case 'stir': {
      const pd = paddleAt(t, ph);
      return { r: alongShaft(pd, 0.03), l: alongShaft(pd, 0.36), lean: 0.3, nod: 0.5, palms: 0.4, gl: 0.95, gr: 0.95 };
    }
    case 'ladle': {
      // Down into the soup and up over the little bowl held in the left hand.
      const dip = 1 - ss(p, 0.35, 0.8);
      return { r: mixP([K.cx + 0.12, 1.04, 0.24], [K.cx + 0.08, K.soup + 0.16, 0.02], dip), l: [K.cx - 0.08, 1.02, 0.34], lean: 0.32, nod: 0.55, palms: 0.5, gl: 0.6, gr: 0.85 };
    }
    case 'sip': {
      // Blown on, then to the lips.
      const up = ss(p, 0.25, 0.55);
      return { l: mixP([K.cx - 0.04, 1.18, 0.38], [K.cx - 0.01, 1.36, 0.44], up), r: [K.cx + 0.22, 0.98, 0.4], lean: 0.05, nod: mix(0.3, -0.15, up), palms: 0.3, gl: 0.6, gr: 0.85 };
    }
    case 'probe':
      return { r: [K.cx + 0.08, K.soup + 0.27, 0.02 + 0.005 * wave(t, 0.7, s)], l: [K.cx - 0.24, K.rim + 0.03, 0.24], lean: 0.38, nod: 0.6, palms: 0.4, gl: 0.6, gr: 0.85 };
    case 'read':
      return { r: [K.cx + 0.05, 1.24, 0.36], l: [K.cx - 0.24, K.rim + 0.03, 0.24], lean: 0.08, nod: 0.3 + 0.04 * pulse(t, 0.5, s), palms: 0.2, gl: 0.6, gr: 0.85 };
    default:
      return { l: [K.cx + 0.0, 1.1, 0.38], r: [K.cx + 0.06 + 0.04 * wave(t, 1.2, s), 1.13, 0.37], lean: 0.08, nod: 0.5, palms: 0.4, gl: 0.75, gr: 0.8 };
  }
}

// =============================================================================================
// The 배식대 (servingLine, 2 × 1): the server's side its front (+z), the diners' rail behind (-z).

/** The counter's top, the wells (밥 · 국 · 반찬 셋) across it, the diners' tray rail. */
export const LINE = { top: 0.88, wells: [-0.68, -0.34, 0, 0.34, 0.68], wz: -0.03, rail: -0.36, tray: 0.9, trayZ: -0.41, front: 0.25, back: -0.3 };
/** Behind the line, facing it; it slides along with the pupil being served (serverX). */
export const SERVE_AT: SpotAt = { x: 0, y: 0, z: 0.44, yaw: Math.PI };
/**
 * Serving (배식 관리), ~15 s a pupil: one comes along the rail with an empty tray; rice scooped onto
 * it with the paddle, soup ladled, three 반찬 put on with the tongs, a word ("맛있게 먹어!") and on
 * they go as the next comes. The server steps along behind the line with them.
 */
export type ServeKey = 'come' | 'rice' | 'soup' | 'side0' | 'side1' | 'side2' | 'greet';
const SERVES: Array<Step<ServeKey>> = [st('come', 1.2, 0.5), st('rice', 2.2, 0.5), st('soup', 2.2, 0.5), st('side0', 1.6, 0.4), st('side1', 1.6, 0.4), st('side2', 1.6, 0.5), st('greet', 1.8, 0.7)];
export const serveBeat = (t: number, ph: number) => beatOf(SERVES, t, ph);
/** Which well each beat takes from. */
const WELL_OF: Record<ServeKey, number> = { come: 0, rice: 0, soup: 1, side0: 2, side1: 3, side2: 4, greet: 4 };
/** Where the pupil's tray is along the rail (x). */
export function trayX(b: Beat<ServeKey>): number {
  return valueOf(b, (k) => LINE.wells[WELL_OF[k]]);
}
/**
 * How far back from the rail the pupil is (0 at it, 1 gone: they step up to it at the rice and
 * walk off from the 김치, so neither strays along to the next line), and how far they've turned to go.
 */
export function pupilBack(b: Beat<ServeKey>): number {
  return valueOf(b, (k, p) => (k === 'come' ? 1 - ss(p, 0, 0.8) : k === 'greet' ? ss(p, 0.4, 1) : 0));
}
export function pupilTurn(b: Beat<ServeKey>): number {
  return b.from === 'greet' ? ss(b.p, 0.3, 0.7) : 0;
}
/** Where the server stands along the line (x), a little on the near side of the tray. */
export function serverX(b: Beat<ServeKey>): number {
  return valueOf(b, (k) => THREE.MathUtils.clamp(LINE.wells[WELL_OF[k]] * 0.75 + (k === 'come' ? -0.05 : 0.08), -0.55, 0.55));
}
/** The spot where the server stands now. */
export function serveAt(b: Beat<ServeKey>): SpotAt {
  return { ...SERVE_AT, x: serverX(b) };
}
/** What's on the tray: 0 rice, 1 soup, 2–4 the 반찬. */
export function served(b: Beat<ServeKey>, i: number): boolean {
  const k: ServeKey = (['rice', 'soup', 'side0', 'side1', 'side2'] as ServeKey[])[i];
  return reached(SERVES, b, k, 0.7) && b.from !== 'come';
}
/** The tool in the right hand: the rice paddle, the ladle, the tongs. */
export function toolOf(b: Beat<ServeKey>): 'paddle' | 'ladle' | 'tongs' | null {
  const k = b.e > 0.5 ? b.to : b.from;
  return k === 'rice' ? 'paddle' : k === 'soup' ? 'ladle' : k.startsWith('side') ? 'tongs' : null;
}
function serveKey(k: ServeKey, p: number, t: number, s: number, b: Beat<ServeKey>): Key {
  const L = LINE;
  const at = serveAt(b);
  const tx = trayX(b);
  const tray: P = [tx, L.tray + 0.07, L.trayZ + 0.06];
  if (k === 'come' || k === 'greet') {
    // Hands resting on the counter's edge, a nod to them.
    const nodK = k === 'greet' ? 0.12 * pulse(t, 0.8, s) : 0;
    return { l: [at.x - 0.2, L.top + 0.04, L.front - 0.02], r: [at.x + 0.2, L.top + 0.04, L.front - 0.02], lean: 0.12 + nodK, nod: 0.15 + nodK, palms: 1.2, gl: 0.3, gr: 0.3 };
  }
  const w: P = [L.wells[WELL_OF[k]], L.top + 0.06, L.wz + 0.02];
  // From the well (dip) over the glass to the tray (drop), and back.
  const u = k === 'rice' || k === 'soup' ? p : frac(p);
  const there = ss(u, 0.3, 0.6) * (1 - ss(u, 0.85, 1));
  const dip = 1 - ss(u, 0.15, 0.3);
  const hand = mixP(add(w, [0.03, 0.12 + 0.05 * (1 - dip), 0.06]), add(tray, [0.02, 0.2, 0.05]), there);
  // The left hand steadies on the counter's edge by the well.
  return { r: hand, l: [w[0] - 0.22, L.top + 0.03, L.front - 0.04], lean: 0.38 + 0.08 * there, nod: 0.55, palms: 0.6, gl: 0.3, gr: 0.88 };
}

// =============================================================================================
// The menu desk (식단 책상, 1 × 1): sat at it, the board of the month's 식단표 behind.

export const DESK = { top: 0.74, w: 0.92, d: 0.56, cz: -0.17 };
export const DESK_AT: SpotAt = { x: 0, y: 0.47, z: 0.42, yaw: Math.PI };
export const KEYS: P = [-0.02, DESK.top + 0.02, -0.02];
export const CALC: P = [0.27, DESK.top + 0.015, 0.0];
export const BOOK: P = [-0.27, DESK.top + 0.02, -0.02];
export const PRINT: P = [0.06, DESK.top + 0.004, 0.04];
/** The order card (치료식 처방) written on, the board looked up at. */
export const CARD: P = [0.1, DESK.top + 0.004, 0.05];
export const BOARD: P = [0.0, 1.22, -0.44];
/**
 * Planning the menu (식단 짜기), ~14 s round: typed into the 식단 program; a look up at the month
 * on the board (a finger to it); the printed week highlighted, dish by dish.
 */
export type MenuKey = 'type' | 'look' | 'mark';
const MENUS: Array<Step<MenuKey>> = [st('type', 5, 0.6), st('look', 2.2, 0.6), st('mark', 3.6, 0.6)];
export const menuBeat = (t: number, ph: number) => beatOf(MENUS, t, ph);
export const highlighterHeld = (b: Beat<MenuKey>) => b.from === 'mark';
function menuKey(k: MenuKey, p: number): Key {
  switch (k) {
    case 'type':
      return { l: add(KEYS, [-0.08, 0.01, 0.02]), r: add(KEYS, [0.08, 0.01, 0.02]), lean: 0.12, nod: 0.25, palms: 1.4, gl: 0.3, gr: 0.3, tap: true };
    case 'look':
      return { l: add(KEYS, [-0.1, 0.01, 0.06]), r: mixP([0.12, 1.0, -0.1], add(BOARD, [0.08, -0.05, 0.28]), ss(p, 0.1, 0.5)), lean: -0.02, nod: -0.22, palms: 0.4, gl: 0.3, gr: 0.5 };
    default: {
      const row = Math.floor(p * 4);
      const x = mix(-0.06, 0.07, frac(p * 4));
      return { l: add(PRINT, [-0.1, 0.012, 0.05]), r: add(PRINT, [x, 0.03, -0.05 + row * 0.03]), lean: 0.2, nod: 0.6, palms: 1.0, gl: 0.2, gr: 0.8 };
    }
  }
}
/**
 * Working out the nutrition (영양 계산), ~12 s round: a finger down the 식품성분표's column; the
 * calculator punched; the figure typed in.
 */
export type CalcKey = 'look' | 'punch' | 'type';
const CALCS: Array<Step<CalcKey>> = [st('look', 2.6, 0.5), st('punch', 4, 0.5), st('type', 3, 0.6)];
export const calcBeat = (t: number, ph: number) => beatOf(CALCS, t, ph);
function calcKey(k: CalcKey, p: number, t: number, s: number): Key {
  switch (k) {
    case 'look':
      return { l: add(BOOK, [0.03, 0.03, mix(-0.07, 0.07, p)]), r: add(CALC, [-0.02, 0.03, 0.06]), lean: 0.22, nod: 0.62, palms: 1.2, gl: 0.2, gr: 0.3 };
    case 'punch': {
      const tap = 0.012 * pulse(t, 3.2, s, 2);
      return { l: add(BOOK, [0.05, 0.03, 0.02]), r: add(CALC, [0.01 * wave(t, 1.6, s), 0.03 + tap, 0.0]), lean: 0.2, nod: 0.6, palms: 1.3, gl: 0.2, gr: 0.45 };
    }
    default:
      return { l: add(KEYS, [-0.08, 0.01, 0.02]), r: add(KEYS, [0.08, 0.01, 0.02]), lean: 0.12, nod: 0.25, palms: 1.4, gl: 0.3, gr: 0.3, tap: true };
  }
}

// =============================================================================================
// The hygiene station (위생 점검대, 1 × 1): the hand basin, the mirror over it, the swab shelf.

export const BASIN = { top: 0.86, z: -0.08, spout: [0, 1.0, -0.12] as P, soap: [-0.2, 1.06, -0.28] as P, towel: [0.4, 1.2, -0.26] as P, board: [-0.38, 0.9, -0.04] as P, meter: [-0.4, 0.92, -0.3] as P, clip: [0.43, 1.12, -0.05] as P };
export const WASH_AT: SpotAt = { x: 0, y: 0, z: 0.4, yaw: Math.PI };
/** The inspector from the 구청, drawn in at the station's front right, and the dietitian turned to them. */
export const INSPECTOR = { x: 0.62, z: 0.98, yaw: -2.25 };
export const INSPECT_AT: SpotAt = { x: -0.06, y: 0, z: 0.42, yaw: Math.atan2(INSPECTOR.x + 0.06, INSPECTOR.z - 0.42) };
/**
 * The hygiene check (위생 점검), ~21 s round: soap pumped; the hands lathered (palms, backs, between
 * the fingers); rinsed under the tap; dried on a paper towel; the cap set straight in the mirror;
 * the chopping board swabbed and the swab read on the ATP meter; the sheet ticked.
 */
export type WashKey = 'soap' | 'lather' | 'rinse' | 'dry' | 'cap' | 'swab' | 'read' | 'tick';
const WASHES: Array<Step<WashKey>> = [st('soap', 1.2, 0.4), st('lather', 3.4, 0.4), st('rinse', 2.2, 0.5), st('dry', 1.8, 0.5), st('cap', 2.2, 0.6), st('swab', 2.4, 0.5), st('read', 2, 0.5), st('tick', 1.8, 0.6)];
export const washBeat = (t: number, ph: number) => beatOf(WASHES, t, ph);
export const tapOn = (b: Beat<WashKey>) => b.from === 'rinse' && b.p > 0.08 && b.p < 0.92;
export const lathered = (b: Beat<WashKey>) => b.from === 'lather' || (b.from === 'rinse' && b.p < 0.5);
export const towelHeld = (b: Beat<WashKey>) => b.from === 'dry';
export const swabHeld = (b: Beat<WashKey>) => b.from === 'swab';
export const meterHeld = (b: Beat<WashKey>) => b.from === 'read';
function washKey(k: WashKey, p: number, t: number, s: number): Key {
  const B = BASIN;
  switch (k) {
    case 'soap':
      return { l: add(B.soap, [0.0, -0.1, 0.06]), r: add(B.soap, [0.02, 0.06 - 0.025 * pulse(t, 1.6, s, 2), 0.02]), lean: 0.25, nod: 0.45, palms: 0.2, gl: 0.3, gr: 0.4 };
    case 'lather': {
      // Rubbing: one hand over the other, swapping.
      const a = t * Math.PI * 2 * 1.6;
      const c: P = [0, B.top + 0.14, B.z + 0.06];
      return { l: add(c, [-0.03 + 0.03 * Math.cos(a), 0.01 * Math.sin(a), 0.015 * Math.sin(a)]), r: add(c, [0.03 - 0.03 * Math.cos(a), -0.01 * Math.sin(a), -0.015 * Math.sin(a)]), lean: 0.3, nod: 0.55, palms: 0.4 + 0.4 * Math.sin(a * 0.5), gl: 0.15, gr: 0.15 };
    }
    case 'rinse': {
      const c = add(B.spout, [0, -0.1, 0.02]);
      return { l: add(c, [-0.035, 0.012 * wave(t, 2, s), 0]), r: add(c, [0.035, -0.012 * wave(t, 2, s), 0]), lean: 0.35, nod: 0.6, palms: 0.5, gl: 0.15, gr: 0.15 };
    }
    case 'dry': {
      const pull = ss(p, 0, 0.3);
      const c: P = [0.12, 1.02, B.z + 0.18];
      return { l: mixP([-0.02, 1.0, 0.12], add(c, [-0.04, 0.0, 0]), ss(p, 0.15, 0.35)), r: mixP(add(B.towel, [-0.04, -0.06, 0.04]), add(c, [0.04 + 0.03 * wave(t, 2.2, s), 0.0, 0.0]), pull), lean: mix(0.3, 0.12, pull), nod: 0.45, palms: 0.4, gl: 0.6, gr: 0.6 };
    }
    case 'cap': {
      // Both hands up to the cap's brim, set straight; a look in the mirror.
      const tug = 0.01 * wave(t, 1.4, s);
      return { l: sp(WASH_AT, 0.1, 1.53 + tug, 0.06), r: sp(WASH_AT, -0.1, 1.53 - tug, 0.06), lean: 0.02, nod: -0.12, palms: 0.2, gl: 0.6, gr: 0.6 };
    }
    case 'swab': {
      const zig = 0.06 * wave(t, 1.6, s);
      return { r: add(B.board, [0.09, 0.02, 0.08]), l: add(B.board, [zig - 0.01, 0.03, -0.06 + 0.1 * p]), lean: 0.42, nod: 0.65, palms: 1.0, gl: 0.85, gr: 0.5 };
    }
    case 'read':
      return { l: [-0.06, 1.12, 0.3], r: [0.03, 1.1, 0.3], lean: 0.05, nod: 0.45, palms: 0.2, gl: 0.8, gr: 0.6 };
    default:
      return { l: add(B.clip, [-0.03, -0.05, 0.05]), r: add(B.clip, [-0.05 + 0.03 * wave(t, 1.5, s), 0.02, 0.06]), lean: 0.12, nod: 0.4, palms: 0.4, gl: 0.6, gr: 0.8 };
  }
}
/**
 * The hygiene inspection (위생 검사 대응), ~19 s round: a bow to the inspector; the log binder held
 * out and leafed through for them; the ATP meter's reading shown; listened to, hands folded; the
 * report signed on their clipboard.
 */
export type InspectKey = 'bow' | 'show' | 'flip' | 'meter' | 'listen' | 'sign';
const INSPECTS: Array<Step<InspectKey>> = [st('bow', 1.6, 0.5), st('show', 2.6, 0.5), st('flip', 3.2, 0.5), st('meter', 2.6, 0.5), st('listen', 2.6, 0.5), st('sign', 2.4, 0.6)];
export const inspectBeat = (t: number, ph: number) => beatOf(INSPECTS, t, ph);
export const binderHeld = (b: Beat<InspectKey>) => b.from === 'show' || b.from === 'flip';
export const meterShown = (b: Beat<InspectKey>) => b.from === 'meter';
export const signing = (b: Beat<InspectKey>) => b.from === 'sign';
function inspectKey(k: InspectKey, p: number, t: number, s: number): Key {
  const A = INSPECT_AT;
  switch (k) {
    case 'bow':
      return { l: sp(A, 0.06, 0.82, 0.12), r: sp(A, -0.06, 0.82, 0.12), lean: 0.5 * Math.sin(Math.PI * ss(p, 0.1, 0.9)), nod: 0.3, palms: 0.2, gl: 0.4, gr: 0.4 };
    case 'show':
      return { l: sp(A, 0.13, 1.08, 0.36), r: sp(A, -0.13, 1.08, 0.36), lean: 0.12, nod: 0.3, palms: 0.3, gl: 0.8, gr: 0.8 };
    case 'flip': {
      const u = frac(p * 3);
      return { l: sp(A, 0.12, 1.06, 0.34), r: sp(A, mix(-0.12, 0.08, ss(u, 0.2, 0.7)), 1.1 + 0.04 * Math.sin(Math.PI * u), 0.36), lean: 0.12, nod: 0.4, palms: 0.4, gl: 0.8, gr: 0.6 };
    }
    case 'meter':
      return { l: sp(A, 0.04, 0.98, 0.18), r: sp(A, -0.05, 1.15, 0.42), lean: 0.1, nod: 0.25, palms: 0.2, gl: 0.3, gr: 0.8 };
    case 'listen':
      return { l: sp(A, 0.05, 0.88, 0.14), r: sp(A, -0.05, 0.9, 0.15), lean: 0.06, nod: 0.2 + 0.08 * pulse(t, 0.6, s), palms: 0.3, gl: 0.5, gr: 0.5 };
    default:
      return { l: sp(A, 0.1, 1.04, 0.4), r: sp(A, -0.02 + 0.05 * wave(t, 1.6, s), 1.06, 0.42), lean: 0.2, nod: 0.5, palms: 0.6, gl: 0.4, gr: 0.8 };
  }
}

// =============================================================================================
// The store shelf (식재료 창고 선반, 1 × 1): a wire rack, the rice sacks on its bottom.

export const RACK = { shelves: [0.1, 0.48, 0.88, 1.28, 1.68], z: -0.17, d: 0.52, w: 0.92 };
export const STOCK_AT: SpotAt = { x: 0, y: 0, z: 0.47, yaw: Math.PI };
/** The delivery box on the middle shelf (pulled out and read), the meat box below, the rice sack's tag, the clipboard. */
export const CRATE: P = [0.12, RACK.shelves[2] + 0.002, -0.1];
export const MEAT: P = [-0.22, RACK.shelves[1] + 0.002, -0.08];
export const TAG: P = [0.2, RACK.shelves[0] + 0.24, 0.1];
export const CLIP: P = [-0.47, 1.12, 0.03];
/**
 * Checking the delivery (식재료 검수), ~16 s round: the box pulled forward and its label read (the
 * use-by date), pushed back; the probe pushed into the meat (냉장 5℃ 이하); down at the rice sacks,
 * the tag checked; the 검수일지 ticked.
 */
export type StockKey = 'pull' | 'label' | 'push' | 'probe' | 'sack' | 'tick';
const STOCKS: Array<Step<StockKey>> = [st('pull', 1.4, 0.3), st('label', 2.2, 0.3), st('push', 1, 0.5), st('probe', 2.8, 0.6), st('sack', 2.2, 0.6), st('tick', 2, 0.6)];
export const stockBeat = (t: number, ph: number) => beatOf(STOCKS, t, ph);
/** How far the box is out (0 in its place, 1 pulled to the shelf's edge and tipped up). */
export const crateOut = (b: Beat<StockKey>) => valueOf(b, (k, p) => (k === 'pull' ? ss(p, 0.1, 0.9) : k === 'label' ? 1 : k === 'push' ? 1 - ss(p, 0.1, 0.9) : 0));
export const stockProbe = (b: Beat<StockKey>) => b.from === 'probe';
export const stockProbeReads = (b: Beat<StockKey>) => (b.from === 'probe' ? mix(12, 3.1, ss(b.p, 0.1, 0.8)) : 3.1);
export const stockSheet = (b: Beat<StockKey>) => b.from === 'tick';
function stockKey(k: StockKey, _p: number, t: number, s: number, b: Beat<StockKey>): Key {
  const out = crateOut(b);
  const c = add(CRATE, [0, 0.12 + 0.05 * out, 0.26 * out]);
  switch (k) {
    case 'pull':
    case 'push':
    case 'label':
      return { l: add(c, [-0.17, 0, 0.02]), r: add(c, [0.17, 0, 0.02]), lean: 0.18, nod: k === 'label' ? 0.45 + 0.05 * wave(t, 0.4, s) : 0.35, palms: 0.1, gl: 0.75, gr: 0.75 };
    case 'probe':
      return { l: add(MEAT, [0.12, 0.17, 0.12]), r: add(MEAT, [-0.02, 0.2 + 0.01 * wave(t, 0.8, s), 0.06]), lean: 0.45, nod: 0.7, palms: 0.5, gl: 0.3, gr: 0.85, crouch: 0.35 };
    case 'sack':
      return { l: add(TAG, [-0.14, 0.02, 0.02]), r: add(TAG, [0.0, 0.0 + 0.01 * wave(t, 0.9, s), 0.04]), lean: 0.4, nod: 0.7, palms: 0.8, gl: 0.3, gr: 0.6, crouch: 0.6 };
    default:
      return { l: add(CLIP, [0.04, -0.06, 0.06]), r: add(CLIP, [0.1 + 0.03 * wave(t, 1.4, s), 0.02, 0.07]), lean: 0.1, nod: 0.4, palms: 0.4, gl: 0.6, gr: 0.8 };
  }
}

// =============================================================================================
// The 보존식 freezer (dtSampleFridge, 1 × 1): under the counter, today's dishes on its top.

export const FREEZER = { top: 0.86, front: 0.27, hinge: 0.42, dishes: [[-0.34, -0.04], [-0.16, -0.07], [0.02, -0.04], [0.2, -0.07]] as Array<[number, number]>, bagAt: [-0.06, 1.0, 0.3] as P, clip: [0.24, 0.87, 0.14] as P, box: [0.36, 0.86, -0.15] as P, shelf: 0.42 };
export const SAMPLE_AT: SpotAt = { x: -0.06, y: 0, z: 0.52, yaw: Math.PI };
/**
 * Keeping the 보존식 (보존식 채취), ~19 s round: a bag taken and held open; a spoonful of each of
 * the four dishes into it; the zip pressed shut; the date and the dish written on it; crouched, the
 * freezer door opened, the bag laid in, the door shut; the log on the wall written up.
 */
export type SampleKey = 'bag' | 's0' | 's1' | 's2' | 's3' | 'seal' | 'label' | 'open' | 'put' | 'shut' | 'log';
const SAMPLES: Array<Step<SampleKey>> = [st('bag', 1.4, 0.4), st('s0', 1.3, 0.3), st('s1', 1.3, 0.3), st('s2', 1.3, 0.3), st('s3', 1.3, 0.4), st('seal', 1.2, 0.4), st('label', 1.6, 0.6), st('open', 1, 0.3), st('put', 1.4, 0.3), st('shut', 0.9, 0.6), st('log', 2.2, 0.6)];
export const sampleBeat = (t: number, ph: number) => beatOf(SAMPLES, t, ph);
const SCOOPS: SampleKey[] = ['s0', 's1', 's2', 's3'];
/** How full the bag is (0–4 spoonfuls in), and whether it's in hand / lying on the top / in the freezer. */
export function bagOf(b: Beat<SampleKey>): { fill: number; where: 'hand' | 'top' | 'in' | 'none' } {
  const now = orderOf(SAMPLES, b.from);
  let fill = 0;
  SCOOPS.forEach((k) => (fill += reached(SAMPLES, b, k, 0.6) ? 1 : 0));
  if (b.from === 'log' || (b.from === 'shut' && b.p > 0.2)) return { fill: 4, where: 'in' };
  if (b.from === 'label') return { fill, where: 'top' };
  if (now >= orderOf(SAMPLES, 'bag') && (b.from !== 'bag' || b.p > 0.3)) return { fill, where: 'hand' };
  return { fill: 0, where: 'none' };
}
/** The freezer door's swing (0 shut, 1 open wide). */
export const doorOpen = (b: Beat<SampleKey>) => valueOf(b, (k, p) => (k === 'open' ? ss(p, 0.1, 0.9) : k === 'put' ? 1 : k === 'shut' ? 1 - ss(p, 0, 0.8) : 0));
export const spoonHeld = (b: Beat<SampleKey>) => SCOOPS.includes(b.from);
export const markerHeld = (b: Beat<SampleKey>) => b.from === 'label' || b.from === 'log';
function sampleKey(k: SampleKey, p: number, t: number, s: number): Key {
  const F = FREEZER;
  const bag = F.bagAt;
  switch (k) {
    case 'bag':
      return { l: mixP([-0.2, F.top + 0.12, 0.22], add(bag, [-0.02, 0, 0]), ss(p, 0.4, 0.8)), r: mixP(add(F.box, [-0.02, 0.12, 0.04]), add(bag, [0.05, 0.04, 0]), ss(p, 0.3, 0.9)), lean: 0.35, nod: 0.5, palms: 0.2, gl: 0.7, gr: 0.6 };
    case 'seal': {
      const x = mix(-0.05, 0.06, p);
      return { l: add(bag, [-0.06, 0.06, 0]), r: add(bag, [x, 0.07, 0]), lean: 0.15, nod: 0.45, palms: 0.1, gl: 0.8, gr: 0.85 };
    }
    case 'label':
      return { l: [-0.06, F.top + 0.03, 0.08], r: [0.0 + 0.04 * wave(t, 1.6, s), F.top + 0.04, 0.06], lean: 0.32, nod: 0.62, palms: 1.0, gl: 0.3, gr: 0.8 };
    case 'open':
      return { l: [-0.3, F.top + 0.02, 0.2], r: mixP([F.hinge - 0.08, 0.62, F.front + 0.05], [F.hinge + 0.1, 0.62, F.front + 0.32], ss(p, 0.1, 0.9)), lean: 0.3, nod: 0.5, palms: 0.2, gl: 0.3, gr: 0.85, crouch: 0.55 };
    case 'put': {
      const reach = Math.sin(Math.PI * ss(p, 0.05, 0.95));
      return { l: mixP([-0.12, 0.52, 0.3], [-0.04, F.shelf + 0.1, -0.05], reach), r: [F.hinge + 0.12, 0.62, F.front + 0.3], lean: 0.35, nod: 0.6, palms: 0.4, gl: 0.75, gr: 0.85, crouch: 0.6 };
    }
    case 'shut':
      return { l: [-0.28, F.top + 0.02, 0.2], r: mixP([F.hinge + 0.1, 0.62, F.front + 0.32], [F.hinge - 0.1, 0.62, F.front + 0.06], ss(p, 0, 0.8)), lean: 0.25, nod: 0.45, palms: 0.4, gl: 0.3, gr: 0.4, crouch: 0.4 };
    case 'log':
      return { l: add(F.clip, [-0.1, 0.02, 0.02]), r: add(F.clip, [0.0 + 0.04 * wave(t, 1.5, s), 0.03, 0.0]), lean: 0.4, nod: 0.62, palms: 1.0, gl: 0.3, gr: 0.8 };
    default: {
      // A spoonful from dish i up and into the bag's open mouth.
      const i = SCOOPS.indexOf(k);
      const d = F.dishes[i];
      const dish: P = [d[0], F.top + 0.06, d[1]];
      const up = ss(p, 0.3, 0.7);
      return { l: add(bag, [0, 0, 0]), r: mixP(add(dish, [0.02, 0.06, 0.04]), add(bag, [0.03, 0.12, 0.0]), up), lean: 0.3, nod: 0.55, palms: 0.5, gl: 0.75, gr: 0.85 };
    }
  }
}

// =============================================================================================
// The 퇴식구 (dtTrayReturn, 2 × 1): a roller belt bringing the trays from +x, the 잔반 hole at -x.

export const RETURN = { top: 0.86, beltZ: -0.05, beltEnd: 0.18, hole: [-0.42, 0.86, -0.06] as P, rack: [-0.82, 0.86, -0.04] as P, display: [-0.42, 1.28, -0.38] as P, clip: [0.0, 0.87, 0.16] as P };
export const WASTE_AT: SpotAt = { x: -0.3, y: 0, z: 0.52, yaw: Math.PI };
/**
 * Measuring the plate waste (잔반량 조사), ~13 s round: a tray taken off the end of the belt; tipped
 * over the hole and scraped clean with the spatula; a look at the scale's display; the tray put in
 * the rack; the figure written down.
 */
export type WasteKey = 'take' | 'scrape' | 'look' | 'stack' | 'note';
const WASTES: Array<Step<WasteKey>> = [st('take', 1.4, 0.5), st('scrape', 3, 0.5), st('look', 1.6, 0.5), st('stack', 1.3, 0.5), st('note', 2.2, 0.6)];
export const wasteBeat = (t: number, ph: number) => beatOf(WASTES, t, ph);
/** The tray in hand: where it is and how it's tipped (radians about the dweller's left-right). */
export function handTray(b: Beat<WasteKey>, k: Key): { at: P; tip: number; on: boolean; full: number } {
  const on = b.from === 'take' ? b.p > 0.45 : b.from === 'scrape' || b.from === 'look' || (b.from === 'stack' && b.p < 0.6);
  const tip = amountOf(b, 'scrape') * 0.9;
  const full = b.from === 'take' ? 1 : b.from === 'scrape' ? 1 - ss(b.p, 0.1, 0.9) : 0;
  return { at: add(k.l, [0.11, -0.02, -0.04]), tip, on, full };
}
/** How many kilos the scale reads (a little more for each tray). */
export const wasteKilos = (b: Beat<WasteKey>) => 12.4 + (b.n % 40) * 0.18 + (b.from === 'scrape' ? 0.18 * ss(b.p, 0.1, 0.9) : reached(WASTES, b, 'scrape', 1) ? 0.18 : 0);
/** Where along the counter they stand for each beat (x): by the belt's end, over the hole, at the rack. */
const WASTE_X: Record<WasteKey, number> = { take: -0.08, scrape: -0.34, look: -0.34, stack: -0.52, note: -0.16 };
export const wasteAt = (b: Beat<WasteKey>): SpotAt => ({ ...WASTE_AT, x: valueOf(b, (k) => WASTE_X[k]) });
export const wasteNote = (b: Beat<WasteKey>) => b.from === 'note';
export const scraperHeld = (b: Beat<WasteKey>) => b.from === 'scrape';
function wasteKey(k: WasteKey, p: number, t: number, s: number): Key {
  const R = RETURN;
  const end: P = [R.beltEnd - 0.05, R.top + 0.07, R.beltZ];
  const over: P = add(R.hole, [0.05, 0.22, 0.08]);
  switch (k) {
    case 'take': {
      const lift = ss(p, 0.45, 1);
      const c = mixP(end, add(end, [-0.12, 0.08, 0.12]), lift);
      return { l: add(c, [-0.13, 0, 0.02]), r: add(c, [0.13, 0, 0.02]), lean: 0.3, nod: 0.5, palms: 0.2, gl: 0.75, gr: 0.75 };
    }
    case 'scrape': {
      const sc = 0.07 * wave(t, 1.3, s);
      return { l: add(over, [-0.11, 0.02, 0.0]), r: add(over, [0.06 + sc, 0.06, 0.02]), lean: 0.35, nod: 0.62, palms: 0.4, gl: 0.8, gr: 0.85 };
    }
    case 'look':
      return { l: add(over, [-0.11, -0.02, 0.06]), r: add(over, [0.11, -0.04, 0.06]), lean: 0.08, nod: 0.05, palms: 0.2, gl: 0.75, gr: 0.6 };
    case 'stack': {
      const c = mixP(add(over, [0.0, -0.02, 0.06]), add(R.rack, [0.08, 0.2, 0.06]), ss(p, 0.1, 0.6));
      return { l: add(c, [-0.13, 0, 0]), r: add(c, [0.13, 0, 0]), lean: 0.3, nod: 0.5, palms: 0.2, gl: p < 0.6 ? 0.75 : 0.2, gr: p < 0.6 ? 0.75 : 0.2 };
    }
    default:
      return { l: add(R.clip, [-0.08, 0.02, 0.0]), r: add(R.clip, [0.0 + 0.04 * wave(t, 1.5, s), 0.03, -0.01]), lean: 0.38, nod: 0.6, palms: 1.0, gl: 0.3, gr: 0.8 };
  }
}

// =============================================================================================
// The dishwasher (dtDishwasher, 2 × 1): a tunnel in the middle, the dirty rack's table on the left.

export const WASHER = { top: 0.86, tunnel: 0.56, hoodTop: 1.48, front: 0.26, panel: [0.32, 1.22, 0.27] as P, window: [-0.12, 1.08, 0.27] as P, inRack: -0.8, exit: 0.8 };
export const DISH_AT: SpotAt = { x: 0, y: 0, z: 0.52, yaw: Math.PI };
/**
 * Checking the rinse (세척기 헹굼 온도 점검), ~14 s round: the rack of dirty trays pushed in through
 * the curtain; the panel read (헹굼 82℃ 이상) with a finger on it; a look through the window at the
 * sprays; a clean tray lifted off the exit, tilted to the light and looked over; stacked.
 */
export type DishKey = 'load' | 'panel' | 'window' | 'lift' | 'stack';
const DISHES: Array<Step<DishKey>> = [st('load', 2.2, 0.5), st('panel', 2.2, 0.5), st('window', 1.8, 0.6), st('lift', 2.4, 0.4), st('stack', 1.3, 0.6)];
export const dishBeat = (t: number, ph: number) => beatOf(DISHES, t, ph);
/** Where the dirty rack is (x: on the table, into the tunnel). */
export const rackX = (b: Beat<DishKey>) => valueOf(b, (k, p) => (k === 'load' ? mix(WASHER.inRack, -0.45, ss(p, 0.15, 0.95)) : k === 'stack' ? mix(-0.2, WASHER.inRack, ss(p, 0.4, 1)) : -0.45 + 0.25 * (k === 'lift' ? 1 : 0)));
/** Where along the machine they stand for each beat (x): at the entry, the panel, the window, the exit. */
const DISH_X: Record<DishKey, number> = { load: -0.4, panel: 0.14, window: -0.12, lift: 0.4, stack: 0.4 };
export const dishAt = (b: Beat<DishKey>): SpotAt => ({ ...DISH_AT, x: valueOf(b, (k) => DISH_X[k]) });
export const cleanHeld = (b: Beat<DishKey>) => b.from === 'lift' || (b.from === 'stack' && b.p < 0.6);
function dishKey(k: DishKey, p: number, t: number, s: number, b: Beat<DishKey>): Key {
  const W = WASHER;
  switch (k) {
    case 'load': {
      const x = rackX(b);
      return { l: [x - 0.08, W.top + 0.1, 0.14], r: [x + 0.16, W.top + 0.1, 0.16], lean: 0.32, nod: 0.45, palms: 1.1, gl: 0.7, gr: 0.6 };
    }
    case 'panel':
      return { l: [-0.12, W.top + 0.05, W.front + 0.06], r: add(W.panel, [-0.02 + 0.01 * pulse(t, 0.8, s), 0.0, 0.05]), lean: 0.1, nod: 0.25, palms: 0.6, gl: 0.3, gr: 0.4 };
    case 'window':
      return { l: [-0.2, W.top + 0.05, W.front + 0.06], r: [0.08, W.top + 0.05, W.front + 0.06], lean: 0.32, nod: 0.25, palms: 1.2, gl: 0.3, gr: 0.3 };
    case 'lift': {
      const up = ss(p, 0.15, 0.55);
      const c = mixP([W.exit - 0.05, W.top + 0.08, 0.0], [0.28, 1.25, 0.32], up);
      return { l: add(c, [-0.13, 0, 0]), r: add(c, [0.13, 0.02 * wave(t, 0.6, s) * up, 0]), lean: mix(0.3, 0.02, up), nod: mix(0.4, 0.15, up), palms: 0.2, gl: 0.75, gr: 0.75 };
    }
    default: {
      const c = mixP([0.28, 1.2, 0.3], [W.exit, W.top + 0.2, 0.05], ss(p, 0.1, 0.6));
      return { l: add(c, [-0.13, 0, 0]), r: add(c, [0.13, 0, 0]), lean: 0.25, nod: 0.45, palms: 0.2, gl: p < 0.6 ? 0.75 : 0.2, gr: p < 0.6 ? 0.75 : 0.2 };
    }
  }
}

// =============================================================================================
// The 오늘의 메뉴 sign (dtMenuSign, 1 × 1): the board on its stand over the sample tray's case.

export const SIGN = { face: -0.06, y0: 0.98, y1: 1.76, w: 0.82, caseTop: 0.84, magnets: [[0.28, 1.47], [0.3, 1.39], [0.26, 1.31], [0.3, 1.23], [0.29, 1.15]] as Array<[number, number]> };
export const POST_AT: SpotAt = { x: 0, y: 0, z: 0.42, yaw: Math.PI };
/** The menu's lines on the board, top to bottom (each to be written). */
export const LINES_Y = [1.47, 1.39, 1.31, 1.23, 1.15];
/**
 * Putting up today's menu (오늘의 메뉴 게시), ~12 s round: each line written with the marker; the
 * allergy-number magnets stuck after them; the sample tray in its case set square; a step back to
 * look at it.
 */
export type PostKey = 'write' | 'stick' | 'tray' | 'back';
const POSTS: Array<Step<PostKey>> = [st('write', 5, 0.5), st('stick', 2.4, 0.5), st('tray', 1.6, 0.5), st('back', 1.6, 0.6)];
export const postBeat = (t: number, ph: number) => beatOf(POSTS, t, ph);
/** How many lines are written so far (0–5), how many magnets are on. */
export const linesWritten = (b: Beat<PostKey>) => (b.from === 'write' ? Math.floor(b.p * 5 + 0.3) : 5);
export const magnetsOn = (b: Beat<PostKey>) => (b.from === 'write' ? 0 : b.from === 'stick' ? Math.floor(b.p * 5 + 0.4) : 5);
export const penHeld = (b: Beat<PostKey>) => b.from === 'write';
function postKey(k: PostKey, p: number, t: number, s: number): Key {
  const S = SIGN;
  switch (k) {
    case 'write': {
      const i = Math.min(4, Math.floor(p * 5));
      const x = mix(-0.3, 0.16, frac(p * 5));
      return { l: [-0.3, S.y0 + 0.08, S.face + 0.08], r: [x, LINES_Y[i] + 0.012 * wave(t, 4, s), S.face + 0.05], lean: 0.12, nod: 0.05, palms: 0.4, gl: 0.3, gr: 0.85 };
    }
    case 'stick': {
      const i = Math.min(4, Math.floor(p * 5));
      const u = frac(p * 5);
      const m = S.magnets[i];
      return { l: [-0.3, S.y0 + 0.08, S.face + 0.08], r: mixP([m[0] + 0.03, m[1] - 0.04, S.face + 0.1], [m[0], m[1], S.face + 0.03], ss(u, 0.2, 0.6)), lean: 0.1, nod: 0.05, palms: 0.3, gl: 0.6, gr: 0.6 };
    }
    case 'tray':
      return { l: [-0.17, S.caseTop + 0.05, 0.12], r: [0.17, S.caseTop + 0.05, 0.12], lean: 0.45, nod: 0.6, palms: 1.1, gl: 0.3, gr: 0.3 };
    default:
      return { l: sp(POST_AT, 0.06, 0.88, 0.12), r: sp(POST_AT, -0.06, 0.88, 0.12), lean: -0.04, nod: -0.05 + 0.05 * pulse(t, 0.5, s), palms: 0.3, gl: 0.5, gr: 0.5 };
  }
}

// =============================================================================================

/** The hands and where they're done from for a motion at `t` (`ph`: the piece's clock offset). */
export function dtKeyOf(m: DtMotion, t: number, ph: number): { key: Key; at: SpotAt } {
  const s = ph * 7.3;
  switch (m) {
    case 'dtStir':
      return { key: blended(stirBeat(t, ph), (k, p) => stirKey(k, p, t, s, ph)), at: COOK_AT };
    case 'dtServe': {
      const b = serveBeat(t, ph);
      return { key: blended(b, (k, p) => serveKey(k, p, t, s, b)), at: serveAt(b) };
    }
    case 'dtMenu':
      return { key: blended(menuBeat(t, ph), (k, p) => menuKey(k, p)), at: DESK_AT };
    case 'dtCalc':
      return { key: blended(calcBeat(t, ph), (k, p) => calcKey(k, p, t, s)), at: DESK_AT };
    case 'dtWash':
      return { key: blended(washBeat(t, ph), (k, p) => washKey(k, p, t, s)), at: WASH_AT };
    case 'dtInspect':
      return { key: blended(inspectBeat(t, ph), (k, p) => inspectKey(k, p, t, s)), at: INSPECT_AT };
    case 'dtStock': {
      const b = stockBeat(t, ph);
      return { key: blended(b, (k, p) => stockKey(k, p, t, s, b)), at: STOCK_AT };
    }
    case 'dtSample':
      return { key: blended(sampleBeat(t, ph), (k, p) => sampleKey(k, p, t, s)), at: SAMPLE_AT };
    case 'dtWaste': {
      const b = wasteBeat(t, ph);
      return { key: blended(b, (k, p) => wasteKey(k, p, t, s)), at: wasteAt(b) };
    }
    case 'dtDish': {
      const b = dishBeat(t, ph);
      return { key: blended(b, (k, p) => dishKey(k, p, t, s, b)), at: dishAt(b) };
    }
    default:
      return { key: blended(postBeat(t, ph), (k, p) => postKey(k, p, t, s)), at: POST_AT };
  }
}

export function dtDoing(m: DtMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const { key: k, at } = dtKeyOf(m, t, dtPhase(work?.point ?? b.base));
  const w = (p: P) => {
    const q = inSpot(at, p);
    return b.base.clone().addScaledVector(left, q[0]).addScaledVector(fwd, q[2]).setY(b.base.y + q[1]);
  };
  return { reach: { l: w(k.l), r: w(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr }, ...(k.tap ? { tap: true } : {}) }, ...(k.crouch ? { crouch: k.crouch } : {}) };
}
