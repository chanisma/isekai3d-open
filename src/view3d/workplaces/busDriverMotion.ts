import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';

/*
 * A 시내버스 기사's work at the 버스 차고지 (2026-10-27, the workplace pipeline, at the user's request:
 * the work should look like the work). Each motion is a round of beats, each held a while and eased
 * into the next, by the same clock (bdPhase of the spot's work mark) as the piece it's done at, so
 * what the piece shows — the headlights coming on, the coins pouring, the breathalyser's reading,
 * the gauge climbing — is drawn there in step (workplaces/busDriver.ts):
 *
 * - bdWalkRound (the bus, 차량 점검): the walk round before the first run: the front tyre on the door
 *   side tapped with the tyre hammer, crouched; round the front to the headlights (they come on); the
 *   tyre on the driver's side; the wiper lifted off the glass and let back; and round again. The spot
 *   itself walks (the builder moves it by walkAt), so the dweller steps from one place to the next.
 * - bdDash (the bus, sat in the driver's seat): hands at ten to two on the big flat wheel, the gauges
 *   tapped, the 디지털 운행기록계 pressed, the mirror set, the 카드 단말기 by the door checked.
 * - bdSettle (the 요금 정산기): the farebox's vault unlocked, its cash drawer pulled and tipped into the
 *   coin counter, put back, a test card tapped on the reader (삑), the 정산서 written up.
 * - bdTrace (the 노선 안내판): a finger along the 노선도 stop by stop, then a hand to the chin.
 * - bdMemorize (the 노선 안내판): a little notebook in the left hand, three stops traced, written down,
 *   recited with a finger on the last.
 * - bdSchedule (the 노선 안내판): a driver's magnet off the tray onto the 배차표, the time written in,
 *   a step back to look, hands on the hips.
 * - bdWash (the wash bay): the lance off its hook, sprayed back and forth at what's in the bay, hung
 *   up; the long brush out of the suds bucket and scrubbed up and down.
 * - bdBreath (the 배차실 window): the breathalyser's wand off its clip, blown into, the reading watched
 *   (0.000% 정상), hung back.
 * - bdLog (the 배차실 window): the 운행 일지 opened, written in, stamped, a finger down the page.
 * - bdFuel (the CNG 충전기): a palm on the 정전기 패드, the nozzle off its holster and clipped onto the
 *   bus's filler, the green button, the gauge watched, the red button, unclipped, hung up.
 * - bdLost (the 분실물 보관함): a found phone (a wallet, a cap) off the 접수 tray, tagged, written up in
 *   the ledger, put in its bin.
 * - bdRest (the 안마의자): sat back, hands on the arm cuffs, eyes shut.
 *
 * Kept out of activity.ts (which only hands these motions over) so it imports nothing from it at run
 * time. A pose is worked out against a Frame: `o` places a point by where it is in the piece (x across,
 * y up, z out of its front), `bd` by the body (to their left, up from the feet or the seat, ahead).
 */
export type BdMotion =
  | 'bdWalkRound' | 'bdDash' | 'bdSettle' | 'bdTrace' | 'bdMemorize' | 'bdSchedule' | 'bdWash'
  | 'bdBreath' | 'bdLog' | 'bdFuel' | 'bdLost' | 'bdRest';
export const BD_MOTIONS = new Set<string>(['bdWalkRound', 'bdDash', 'bdSettle', 'bdTrace', 'bdMemorize', 'bdSchedule', 'bdWash', 'bdBreath', 'bdLog', 'bdFuel', 'bdLost', 'bdRest']);

const frac = (x: number) => ((x % 1) + 1) % 1;
/** The clock offset: from where the spot's work mark is (across the floor only), so two pieces aren't in step. */
export const bdPhase = (p: THREE.Vector3) => frac(p.x * 0.353 + p.z * 0.641);
export const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);
export const sm = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
/** The shorter way round from one heading to another. */
const mixAngle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;

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
}
const MOVE = 0.5;
const lengthOf = (seq: Seq) => seq.reduce((n, [, h, m = MOVE]) => n + h + m, 0);
export function beatOf(seq: Seq, t: number, phase: number): Beat {
  const T = lengthOf(seq);
  const c = t / T + phase;
  const n = Math.floor(c);
  let x = (c - n) * T;
  for (let i = 0; i < seq.length; i++) {
    const [key, hold, move = MOVE] = seq[i];
    const next = seq[(i + 1) % seq.length][0];
    if (x < hold) return { n, i, from: key, to: key, u: hold > 0 ? x / hold : 1, e: 0 };
    x -= hold;
    if (x < move || i === seq.length - 1) return { n, i, from: key, to: next, u: 1, e: sm(Math.min(1, x / move), 0, 1) };
    x -= move;
  }
  return { n, i: 0, from: seq[0][0], to: seq[0][0], u: 0, e: 0 };
}
/** In beat `k` (held, or easing on into the next while still mostly in it). */
const inBeat = (b: Beat, k: string) => (b.from === k && b.e < 0.5) || (b.to === k && b.e >= 0.5);
/** Done with beat `k` this round: past it (or easing out of it). */
const pastBeat = (seq: Seq, b: Beat, k: string) => {
  const i = seq.findIndex(([key]) => key === k);
  return b.i > i || (b.i === i && b.e > 0);
};

export type V = readonly [number, number, number];

/** Where things are worked out: the piece's frame (by the work mark), the body's place and axes, how tall they are. */
export interface Frame {
  /** A point in the piece (x across, y up, z out of its front). */
  o(x: number, y: number, z: number): THREE.Vector3;
  /** A point from the body: to their left, up from the feet (or the seat), ahead of them. */
  bd(side: number, up: number, ahead: number): THREE.Vector3;
  left: THREE.Vector3;
  fwd: THREE.Vector3;
  H: number;
  k: number;
}
/** A frame: the work mark (where it is now, and where it is in the piece), the piece's turn, the feet and the body's turn. */
export function frameAt(work: THREE.Vector3, workIn: V, pieceYaw: number, feet: THREE.Vector3, yaw: number, H: number): Frame {
  const c = Math.cos(pieceYaw);
  const s = Math.sin(pieceYaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const w = (dx: number, dy: number, dz: number) => new THREE.Vector3(work.x + dx * c + dz * s, work.y + dy, work.z - dx * s + dz * c);
  return {
    o: (x, y, z) => w(x - workIn[0], y - workIn[1], z - workIn[2]),
    bd: (side, up, ahead) => feet.clone().addScaledVector(left, side).addScaledVector(fwd, ahead).setY(feet.y + up),
    left,
    fwd,
    H,
    k: H / 1.6,
  };
}

/** Where the hands are, how the body goes with them, and where what's held is. */
export interface Hands {
  l?: THREE.Vector3;
  r?: THREE.Vector3;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
  tap?: boolean;
  /** What's carried between the hands (a cash drawer, a found phone, the nozzle). */
  item?: THREE.Vector3;
  /** What's in the right hand (the tyre hammer, the card, the pen, the wand, the magnet, the stamp). */
  tool?: THREE.Vector3;
  /** Where a held lance or brush points (its jet's or its head's end). */
  aim?: THREE.Vector3;
}
type Part = Partial<Hands>;
const hands = (h: Part): Hands => ({ lean: 0, nod: 0.2, palms: 0.4, gl: 0.3, gr: 0.3, crouch: 0, ...h });
function mixV(a: THREE.Vector3 | undefined, b: THREE.Vector3 | undefined, e: number): THREE.Vector3 | undefined {
  if (a && b) return a.clone().lerp(b, e);
  return e < 0.5 ? a : b;
}
function mix(a: Hands, b: Hands, e: number): Hands {
  if (e <= 0) return a;
  return {
    l: mixV(a.l, b.l, e),
    r: mixV(a.r, b.r, e),
    lean: mixN(a.lean, b.lean, e),
    nod: mixN(a.nod, b.nod, e),
    palms: mixN(a.palms, b.palms, e),
    gl: mixN(a.gl, b.gl, e),
    gr: mixN(a.gr, b.gr, e),
    crouch: mixN(a.crouch, b.crouch, e),
    tap: e < 0.5 ? a.tap : b.tap,
    item: mixV(a.item, b.item, e),
    tool: mixV(a.tool, b.tool, e),
    aim: mixV(a.aim, b.aim, e),
  };
}
/** Both hands on a thing's sides (`half` out from its middle), the thing at `at`. */
function carry(f: Frame, at: THREE.Vector3, half: number, h: Part = {}): Hands {
  return hands({ l: at.clone().addScaledVector(f.left, half), r: at.clone().addScaledVector(f.left, -half), palms: 0, gl: 0.65, gr: 0.65, item: at, ...h });
}
/** Held at the chest. */
const chest = (f: Frame, up = 0.62, ahead = 0.28) => f.bd(0, up * f.H, ahead * f.k);
/** A hand hanging easy at the side with something in it. */
const atSide = (f: Frame, side: number) => f.bd(side * 0.22 * f.k, 0.45 * f.H, 0.08 * f.k);
/** A pen's scribble about a point. */
const scribble = (p: THREE.Vector3, t: number, f: Frame, w = 0.05) => p.clone().addScaledVector(f.left, w * wave(t, 0.7)).add(new THREE.Vector3(0, 0.004 * wave(t, 6.5), 0)).addScaledVector(f.fwd, 0.012 * wave(t, 1.9));

type KeyFn = (key: string, f: Frame, u: number, t: number, n: number) => Hands;
interface Round {
  seq: Seq;
  key: KeyFn;
  /** Where the spot's work mark is in the piece. */
  work: V;
  /** Which way the spot faces in the piece square on (π: at its front, facing in). */
  base: number;
  /** How far the spot turns from that (to their left +), by beat key and round. */
  turn?: (key: string, n: number) => number;
}

// =============================================================================================
// The city bus (cityBus, 2 × 11): along z, its nose at +z, the driver's seat at the front on the left
// (+x, Korea), the doors on the right (-x). Low floor; the driver sits up on a platform. An 11 m 저상버스 (2026-11-04, the layout audit:
// it was drawn 6.5 m, a village bus's length): 2.6 m ahead of the front axle, 5.9 m between the axles.

export const BUS = { hw: 1.0, nose: 5.5, tail: -5.5, floor: 0.36, top: 2.55, fAxle: 2.9, rAxle: -3.0, wheelR: 0.44, track: 0.8 };
/** Where the raised floor at the back starts, just ahead of the back wheels. */
export const STEP_Z = BUS.rAxle + 0.48;
/** The driver's seat (its top's middle) and the big flat wheel (its hub, its radius, how far it lies back from upright). */
export const DRIVER = { x: 0.5, seat: 1.0, z: BUS.nose - 1.05, drop: 0.42 };
export const WHEEL = { hub: [0.5, 1.3, BUS.nose - 0.63] as V, r: 0.23, tilt: 0.5 };
export const GAUGES: V = [0.5, 1.5, BUS.nose - 0.25];
export const TACHO: V = [0.05, 1.3, BUS.nose - 0.3];
export const MIRROR: V = [0.2, 1.96, BUS.nose - 0.27];
/** The 승차 단말기 on its post by the front door (to the driver's right). */
export const CARD: V = [-0.28, 1.42, BUS.nose - 0.65];
/**
 * A point on the wheel's rim, `a` from its top (the far side) round to the driver's left (+x), the
 * wheel turned `turn` that way. A bus's wheel lies nearly flat: its plane tipped `tilt` up from level.
 */
export function rimAt(a: number, turn = 0): [number, number, number] {
  const [hx, hy, hz] = WHEEL.hub;
  const ang = a + turn;
  const far = Math.cos(ang) * WHEEL.r;
  return [hx + Math.sin(ang) * WHEEL.r, hy + far * Math.sin(WHEEL.tilt), hz + far * Math.cos(WHEEL.tilt)];
}
const DASH_SEQ: Seq = [['wheel', 2.4], ['gauge', 1.6], ['tacho', 1.8], ['wheel', 1.6], ['mirror', 1.6], ['card', 1.8]];
/** How far the wheel's turned now (radians, to the left +). */
export function dashTurn(t: number, ph: number): number {
  const b = beatOf(DASH_SEQ, t, ph);
  const k = b.from === 'wheel' ? 1 - b.e : b.to === 'wheel' ? b.e : 0;
  return k * wheelSway(t);
}
const wheelSway = (t: number) => 0.35 * wave(t, 0.09) + 0.1 * wave(t, 0.31);
const dashKey: KeyFn = (key, f, u, t) => {
  const turn = wheelSway(t);
  const rim = (a: number, tr = 0) => f.o(...rimAt(a, tr));
  const onL = rim(1.0);
  const onR = rim(-1.0);
  switch (key) {
    case 'wheel':
      return hands({ l: rim(1.0, turn), r: rim(-1.0, turn), palms: 0.7, gl: 0.9, gr: 0.9, nod: 0.05, lean: 0.04 });
    case 'gauge': {
      const g = f.o(GAUGES[0] - 0.12, GAUGES[1] - 0.04, GAUGES[2] - 0.12 + 0.02 * Math.max(0, wave(t, 1.6)));
      return hands({ l: onL, r: g, palms: 1.2, gl: 0.9, gr: 0.5, tap: u > 0.2 && u < 0.8, nod: 0.25, lean: 0.12 });
    }
    case 'tacho': {
      const p = f.o(TACHO[0], TACHO[1] + 0.03, TACHO[2] - 0.08 + 0.02 * sm(u, 0.3, 0.45) * (1 - sm(u, 0.55, 0.7)));
      return hands({ l: onL, r: p, palms: 1.3, gl: 0.9, gr: 0.45, nod: 0.3, lean: 0.18 });
    }
    case 'mirror':
      return hands({ l: f.o(MIRROR[0] + 0.03 * wave(t, 0.8), MIRROR[1] - 0.06, MIRROR[2] - 0.12), r: onR, palms: 0.3, gl: 0.7, gr: 0.9, nod: -0.4, lean: 0.06 });
    case 'card': {
      const p = f.o(CARD[0] + 0.02, CARD[1] + 0.02, CARD[2] + 0.02 * sm(u, 0.3, 0.45));
      return hands({ l: onL, r: p, palms: 1.0, gl: 0.9, gr: 0.4, nod: 0.25, lean: 0.12, tap: u > 0.3 && u < 0.6 });
    }
  }
  return hands({ l: onL, r: onR });
};
export function dashAt(t: number, ph: number): { turn: number; tacho: boolean; card: boolean } {
  const b = beatOf(DASH_SEQ, t, ph);
  return { turn: dashTurn(t, ph), tacho: inBeat(b, 'tacho') && b.u > 0.4, card: inBeat(b, 'card') && b.u > 0.35 && b.u < 0.8 };
}

/**
 * The walk round (bus-local): where each check is stood, and the corners gone round at the nose.
 * The tyres stood off a step; the front a step out from the bumper.
 */
export const WALK = {
  tyreR: { x: -1.62, z: BUS.fAxle, yaw: Math.PI / 2 },
  lights: { x: -0.45, z: BUS.nose + 0.8, yaw: Math.PI },
  tyreL: { x: 1.62, z: BUS.fAxle, yaw: -Math.PI / 2 },
  wiper: { x: 0.45, z: BUS.nose + 0.8, yaw: Math.PI },
  cornerR: { x: -1.6, z: BUS.nose + 0.65 },
  cornerL: { x: 1.6, z: BUS.nose + 0.65 },
};
type Station = 'tyreR' | 'lights' | 'tyreL' | 'wiper';
const WALK_SEQ: Seq = [['tyreR', 3.0, 2.8], ['lights', 2.6, 2.8], ['tyreL', 3.0, 2.8], ['wiper', 2.4, 2.8]];
/** The headlamp's middle (each side; x by the side), the wiper's foot. */
export const LAMP = { x: 0.72, y: 0.7, z: BUS.nose + 0.01 };
export const WIPER_FOOT: V = [0.42, 1.12, BUS.nose + 0.02];
export interface WalkNow {
  x: number;
  z: number;
  yaw: number;
  from: Station;
  to: Station;
  /** Stood at a check (not on the move between them). */
  at: Station | null;
  u: number;
  /** The headlamps on (checked from the front), the wiper lifted (0–1). */
  lights: boolean;
  wiper: number;
}
export function walkAt(t: number, ph: number): WalkNow {
  const b = beatOf(WALK_SEQ, t, ph);
  const from = b.from as Station;
  const to = b.to as Station;
  const A = WALK[from];
  const B = WALK[to];
  const lights = from === 'lights' && b.e === 0 && b.u > 0.15;
  const wiper = from === 'wiper' && b.e === 0 ? sm(b.u, 0.15, 0.35) * (1 - sm(b.u, 0.7, 0.9)) : 0;
  if (b.e === 0 || from === to) return { x: A.x, z: A.z, yaw: A.yaw, from, to, at: from, u: b.u, lights, wiper };
  // Round the nose's corner on that side.
  const C = from === 'tyreR' || to === 'tyreR' ? WALK.cornerR : WALK.cornerL;
  const s = b.e;
  const x = (1 - s) * (1 - s) * A.x + 2 * (1 - s) * s * C.x + s * s * B.x;
  const z = (1 - s) * (1 - s) * A.z + 2 * (1 - s) * s * C.z + s * s * B.z;
  const dx = 2 * (1 - s) * (C.x - A.x) + 2 * s * (B.x - C.x);
  const dz = 2 * (1 - s) * (C.z - A.z) + 2 * s * (B.z - C.z);
  const go = Math.atan2(dx, dz);
  const yaw = s < 0.2 ? mixAngle(A.yaw, go, sm(s, 0, 0.2)) : s > 0.8 ? mixAngle(go, B.yaw, sm(s, 0.8, 1)) : go;
  return { x, z, yaw, from, to, at: null, u: s, lights: false, wiper: 0 };
}
/** The hands at the walk round, worked out from the body alone (the spot carries them round). */
function walkHands(f: Frame, t: number, ph: number): Hands {
  const w = walkAt(t, ph);
  const k = f.k;
  const hammerSide = hands({ r: atSide(f, -1), tool: atSide(f, -1), gr: 0.9, nod: 0.1 });
  if (!w.at) return hammerSide;
  if (w.at === 'tyreR' || w.at === 'tyreL') {
    // Crouched to the tyre, rapping its tread with the hammer, the other hand on a knee.
    const settle = sm(w.u, 0, 0.18);
    const rap = Math.max(0, wave(t, 1.7, ph)) ** 2;
    const r = f.bd(-0.08 * k, (0.42 + 0.14 * rap) * k, (0.32 + 0.04 * rap) * k);
    const h = hands({ l: f.bd(0.16 * k, 0.5 * k, 0.24 * k), r, tool: r, gr: 0.95, gl: 0.4, palms: 0.6, lean: 0.35, nod: 0.55, crouch: 0.75 * settle });
    return mix(hammerSide, h, settle);
  }
  if (w.at === 'lights') {
    // Pointing at each lamp as it comes on, the hammer down at the side.
    const side = w.u < 0.55 ? 0.27 : -0.9;
    const l = f.bd(side * 0.6 * k, 1.0 * k, 0.48 * k);
    return hands({ l, r: atSide(f, -1), tool: atSide(f, -1), gl: 0.85, gr: 0.9, palms: 0, nod: 0.35, lean: 0.06 });
  }
  // The wiper's arm lifted off the glass by its blade and let back.
  const lift = w.wiper;
  const l = f.bd(0, (1.15 + 0.16 * lift) * k, (0.6 - 0.05 * lift) * k);
  return hands({ l, r: atSide(f, -1), tool: atSide(f, -1), gl: 0.7, gr: 0.9, palms: 0.8, nod: -0.05, lean: 0.12 });
}

// =============================================================================================
// The 요금 정산기 (farebox, 1 × 1): a steel counter, the bus's 현금 요금함 on it at the left (its
// vault's lock and cash drawer at the front), the coin counter in the middle, the test card reader on
// its post at the right with the 정산서 clipboard in front of it. Stood at its front, facing in.

export const FB = { top: 0.88, box: { x: -0.3, z: -0.18, w: 0.28, h: 0.42, d: 0.3 }, lock: [-0.3, 1.2, -0.02] as V };
export const FB_DRAWER: V = [0.22, 0.11, 0.25];
export const FB_DRAWER_IN: V = [-0.3, FB.top + 0.075, -0.17];
export const FB_DRAWER_OUT: V = [-0.3, FB.top + 0.075, 0.08];
export const FB_COUNTER = { x: 0.06, z: -0.22, w: 0.28, h: 0.24, d: 0.3, hopper: [0.06, 1.2, -0.25] as V };
export const FB_READER = { base: [0.36, FB.top, -0.26] as V, face: [0.36, 1.2, -0.2] as V };
export const FB_CLIP: V = [0.3, FB.top + 0.006, 0.0];
export const FB_SPOT = { x: 0, z: 0.5 };
export const FB_WORK: V = [0, 1.0, -0.15];
const SETTLE_SEQ: Seq = [['key', 1.4], ['pull', 1.2], ['tip', 2.4], ['back', 1.1], ['card', 1.4], ['write', 2.0]];
const settleKey: KeyFn = (key, f, u, t) => {
  const D = FB_DRAWER;
  const half = D[0] / 2 + 0.02;
  const rest = f.o(-0.08, FB.top + 0.02, 0.02);
  switch (key) {
    case 'key': {
      // The key in the vault's lock and turned.
      const p = f.o(FB.lock[0], FB.lock[1], FB.lock[2] + 0.04);
      return hands({ l: rest, r: p, tool: p, palms: 0.2 + 1.2 * sm(u, 0.35, 0.6), gr: 0.8, gl: 0.2, nod: 0.45, lean: 0.2 });
    }
    case 'pull': {
      const at = f.o(...FB_DRAWER_IN).lerp(f.o(...FB_DRAWER_OUT), sm(u, 0.1, 0.8));
      return carry(f, at, half, { nod: 0.5, lean: 0.25 });
    }
    case 'tip': {
      const [hx, hy, hz] = FB_COUNTER.hopper;
      const at = f.o(hx, hy + 0.14, hz + 0.1);
      return carry(f, at, half, { nod: 0.45, lean: 0.2, palms: 0.2 + 0.6 * sm(u, 0.1, 0.4) });
    }
    case 'back': {
      const at = f.o(...FB_DRAWER_OUT).lerp(f.o(...FB_DRAWER_IN), sm(u, 0.2, 0.85));
      return carry(f, at, half, { nod: 0.5, lean: 0.25, palms: 1.2 });
    }
    case 'card': {
      const [cx, cy, cz] = FB_READER.face;
      const p = f.o(cx, cy + 0.02, cz + 0.07 - 0.04 * sm(u, 0.3, 0.45) * (1 - sm(u, 0.7, 0.85)));
      return hands({ l: rest, r: p, tool: p, palms: 1.2, gr: 0.75, gl: 0.2, nod: 0.4, lean: 0.15 });
    }
    case 'write': {
      const p = scribble(f.o(FB_CLIP[0] - 0.01, FB_CLIP[1] + 0.02, FB_CLIP[2]), t, f, 0.04);
      return hands({ l: f.o(FB_CLIP[0] + 0.1, FB_CLIP[1] + 0.02, FB_CLIP[2] + 0.06), r: p, tool: p, palms: 1.3, gr: 0.75, gl: 0.2, nod: 0.6, lean: 0.3 });
    }
  }
  return hands({ l: rest, r: rest });
};
export interface SettleNow {
  /** Where the cash drawer is: in the farebox, or in the hands. */
  drawer: 'in' | 'held';
  /** How far it's tipped over the hopper (0–1), and coins pouring. */
  tilt: number;
  pour: boolean;
  /** The key in the lock (and turned 0–1), the card being read, the count on the counter's display. */
  key: number | null;
  beep: boolean;
  count: number;
  writing: boolean;
}
export function settleAt(t: number, ph: number): SettleNow {
  const b = beatOf(SETTLE_SEQ, t, ph);
  const k = b.from;
  const held = (k === 'pull' && b.u > 0.05) || k === 'tip' || (k === 'back' && b.u < 0.85 && b.e === 0);
  const tilt = k === 'tip' ? sm(b.u, 0.1, 0.35) * (1 - sm(b.u, 0.85, 1)) : 0;
  const pour = k === 'tip' && b.u > 0.3 && b.u < 0.88;
  const counted = pastBeat(SETTLE_SEQ, b, 'tip') ? 1 : k === 'tip' ? sm(b.u, 0.3, 0.88) : 0;
  const key = k === 'key' ? sm(b.u, 0.35, 0.6) : null;
  return { drawer: held ? 'held' : 'in', tilt, pour, key, beep: k === 'card' && b.u > 0.38 && b.u < 0.75, count: Math.round(counted * 187400), writing: k === 'write' };
}

// =============================================================================================
// The 노선 안내판 (routeBoard, 1 × 1): a board on two legs, the 노선도 on its left half (the route
// snaking through its stops), the 배차 시간표 on its right (a row a run: 순번, the driver's magnet, the
// times); the tray along its foot with the markers and the drivers' magnets.

export const RB = { face: -0.2, y0: 0.95, y1: 1.95, x0: -0.75, x1: 0.75, tray: [0.36, 0.95, -0.12] as V };
/** The route's stops on the board (x, y). */
export const STOPS: Array<[number, number]> = [
  [-0.64, 1.74], [-0.47, 1.74], [-0.3, 1.74], [-0.13, 1.66], [-0.13, 1.5], [-0.3, 1.42], [-0.5, 1.42], [-0.65, 1.3], [-0.5, 1.17], [-0.3, 1.12], [-0.12, 1.12],
];
export const STOP_NAMES = ['중랑차고지', '망우역', '상봉역', '중화역', '먹골역', '태릉입구', '석계역', '광운대역', '월계역', '녹천역', '창동역'];
/** The 배차표's rows (y), and where the driver's magnet and the time go across (x). */
export const GRID = { rows: [1.7, 1.58, 1.46, 1.34, 1.22, 1.1], magnet: 0.27, time: 0.49 };
export const RB_SPOT = { x: 0, z: 0.45 };
export const RB_WORK: V = [0, 1.45, RB.face];
const stopAt = (f: Frame, s: number) => {
  const i = Math.max(0, Math.min(STOPS.length - 1.001, s));
  const a = STOPS[Math.floor(i)];
  const b = STOPS[Math.min(STOPS.length - 1, Math.floor(i) + 1)];
  const e = i - Math.floor(i);
  return f.o(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, RB.face + 0.03);
};
/** Along the stops at a walking finger's pace, pausing at each. */
const pace = (u: number, n: number) => {
  const x = u * n;
  const i = Math.floor(x);
  return i + sm(x - i, 0.45, 1);
};
const TRACE_SEQ: Seq = [['trace', 6.4], ['think', 1.8]];
const traceKey: KeyFn = (key, f, u) => {
  const k = f.k;
  if (key === 'trace') {
    const r = stopAt(f, pace(u, STOPS.length - 1));
    return hands({ r, l: f.bd(0.12 * k, 0.55 * f.H, 0.12 * k), palms: 1.1, gr: 0.75, gl: 0.4, nod: -0.05 + 0.25 * (1.5 - r.y), lean: 0.06 });
  }
  // A hand to the chin, the other arm across.
  return hands({ r: f.bd(-0.02 * k, 0.84 * f.H, 0.13 * k), l: f.bd(-0.05 * k, 0.6 * f.H, 0.17 * k), palms: 0.2, gr: 0.6, gl: 0.5, nod: -0.1 });
};
export function traceAt(t: number, ph: number): { stop: number | null } {
  const b = beatOf(TRACE_SEQ, t, ph);
  return { stop: b.from === 'trace' && b.e === 0 ? Math.round(pace(b.u, STOPS.length - 1)) : null };
}
const MEMO_SEQ: Seq = [['trace', 2.8], ['write', 2.2], ['recite', 1.8]];
const memoFirst = (n: number) => ((n * 3) % (STOPS.length - 3) + (STOPS.length - 3)) % (STOPS.length - 3);
const memoKey: KeyFn = (key, f, u, t, n) => {
  const k = f.k;
  const book = f.bd(0.14 * k, 0.6 * f.H, 0.27 * k);
  const s0 = memoFirst(n);
  switch (key) {
    case 'trace':
      return hands({ l: book, item: book, r: stopAt(f, s0 + pace(u, 3)), palms: 1.1, gr: 0.75, gl: 0.6, nod: 0.05 });
    case 'write': {
      const p = scribble(book.clone().add(new THREE.Vector3(0, 0.02, 0)).addScaledVector(f.left, -0.05), t, f, 0.03);
      return hands({ l: book, item: book, r: p, tool: p, palms: 1.2, gr: 0.75, gl: 0.6, nod: 0.6 });
    }
    case 'recite': {
      const low = f.bd(0.16 * k, 0.5 * f.H, 0.2 * k);
      return hands({ l: low, item: low, r: stopAt(f, s0 + 3), palms: 1.1, gr: 0.75, gl: 0.6, nod: -0.15 + 0.05 * wave(t, 1.2) });
    }
  }
  return hands({ l: book, item: book });
};
export function memoAt(t: number, ph: number): { stops: [number, number] | null; writing: boolean } {
  const b = beatOf(MEMO_SEQ, t, ph);
  const s0 = memoFirst(b.n);
  return { stops: inBeat(b, 'trace') || inBeat(b, 'recite') ? [s0, s0 + 3] : null, writing: inBeat(b, 'write') };
}
const PLAN_SEQ: Seq = [['pick', 1.0], ['place', 1.4], ['write', 2.2], ['check', 1.6]];
export const planRow = (n: number) => ((n % GRID.rows.length) + GRID.rows.length) % GRID.rows.length;
const planKey: KeyFn = (key, f, u, t, n) => {
  const k = f.k;
  const y = GRID.rows[planRow(n)];
  const rest = f.bd(0.2 * k, 0.5 * f.H, 0.12 * k);
  switch (key) {
    case 'pick': {
      const p = f.o(RB.tray[0], RB.tray[1] + 0.03, RB.tray[2] + 0.02);
      return hands({ l: rest, r: p, tool: u > 0.5 ? p : undefined, palms: 1.2, gr: 0.6, nod: 0.5, lean: 0.25 });
    }
    case 'place': {
      const p = f.o(GRID.magnet, y, RB.face + 0.02 + 0.03 * (1 - sm(u, 0.3, 0.7)));
      return hands({ l: rest, r: p, tool: u < 0.7 ? p : undefined, palms: 1.1, gr: 0.6, nod: 0.2 - 0.3 * (y - 1.4) });
    }
    case 'write': {
      const p = scribble(f.o(GRID.time + 0.05, y, RB.face + 0.03), t, f, 0.04);
      return hands({ l: rest, r: p, tool: p, palms: 1.0, gr: 0.8, nod: 0.2 - 0.3 * (y - 1.4) });
    }
    case 'check':
      return hands({ l: f.bd(0.2 * k, 0.56 * f.H, 0.0), r: f.bd(-0.2 * k, 0.56 * f.H, 0.0), palms: 0.2, gl: 0.6, gr: 0.6, nod: 0.0, lean: -0.05 });
  }
  return hands({ l: rest });
};
export function planAt(t: number, ph: number): { row: number; placed: boolean; written: number } {
  const b = beatOf(PLAN_SEQ, t, ph);
  const placed = pastBeat(PLAN_SEQ, b, 'place') || (b.from === 'place' && b.u > 0.7);
  const written = pastBeat(PLAN_SEQ, b, 'write') ? 1 : b.from === 'write' ? b.u : 0;
  return { row: planRow(b.n), placed, written };
}

// =============================================================================================
// The wash bay (washBay, 1 × 1): the pressure washer and its frame at the back, the lance on its hook,
// the suds bucket with the long brush at the front left; what's washed stands a good step out in
// front, the washer's back to the wall. Stood out front facing away from the frame, into the bay.

/** `reach`: how far ahead of the washer what's washed stands (a bus's flank, at the depot). */
export const WB = { hook: [0.3, 1.22, -0.27] as V, bucket: [0.5, 0, 0.62] as V, lance: 0.72, brush: 1.0, reach: 1.15 };
export const WB_SPOT = { x: 0, z: 0.36 };
export const WB_WORK: V = [0, 1.0, 1.4];
const WASH_SEQ: Seq = [['take', 1.1], ['spray', 4.2], ['hang', 1.0], ['dip', 1.3], ['scrub', 3.6]];
const washKey: KeyFn = (key, f, u, t) => {
  const k = f.k;
  switch (key) {
    case 'take':
    case 'hang': {
      // Turned round to the hook: the lance's grip in the right hand, the left on its wand.
      const g = f.o(WB.hook[0], WB.hook[1] - 0.05, WB.hook[2] + 0.06);
      return hands({ r: g, l: g.clone().add(new THREE.Vector3(0, -0.28, 0)), tool: g, aim: g.clone().add(new THREE.Vector3(0, -0.7, 0)), palms: 0.2, gl: 0.8, gr: 0.9, nod: 0.1 });
    }
    case 'spray': {
      // Held at the hip, the jet swept side to side and up and down over what's in the bay.
      const sweep = 0.5 * wave(t, 0.22);
      const aim = f.bd(sweep, (0.75 + 0.3 * wave(t, 0.09)) * k, WB.reach);
      const grip = f.bd(-0.12 * k, 0.95 * k, 0.26 * k);
      const d = aim.clone().sub(grip).normalize();
      return hands({ r: grip, l: grip.clone().addScaledVector(d, 0.34), tool: grip, aim, palms: 0.3, gl: 0.85, gr: 0.95, nod: 0.25, lean: 0.06 });
    }
    case 'dip': {
      const b = f.o(WB.bucket[0], 0.35, WB.bucket[2]);
      const r = b.clone().add(new THREE.Vector3(0, 0.55 + 0.1 * sm(u, 0.4, 1), 0));
      return hands({ r, l: r.clone().add(new THREE.Vector3(0, 0.28, 0)), tool: r, aim: b.clone().setY(0.08 + 0.15 * sm(u, 0.5, 1)), palms: 0.2, gl: 0.85, gr: 0.9, nod: 0.6, lean: 0.35, crouch: 0.25 });
    }
    case 'scrub': {
      // The long brush scrubbed up and down along the side, the hands sliding on the pole.
      const sweep = 0.35 * Math.sin(t * 0.6);
      const head = f.bd(sweep, (0.95 + 0.35 * wave(t, 0.85)) * k, WB.reach - 0.1);
      const low = f.bd(-0.1 * k, 0.88 * k, 0.24 * k);
      const d = head.clone().sub(low).normalize();
      return hands({ r: low, l: low.clone().addScaledVector(d, 0.42), tool: low, aim: head, palms: 0.4, gl: 0.9, gr: 0.9, nod: 0.05, lean: 0.12 });
    }
  }
  return hands({});
};
export function washAt(t: number, ph: number): { lance: 'hook' | 'held'; brush: 'bucket' | 'held'; jet: boolean; dripping: boolean } {
  const b = beatOf(WASH_SEQ, t, ph);
  const k = b.from;
  const lanceHeld = (k === 'take' && b.u > 0.5) || k === 'spray' || (k === 'hang' && b.u < 0.5);
  const brushHeld = (k === 'dip' && b.u > 0.45) || k === 'scrub';
  return { lance: lanceHeld ? 'held' : 'hook', brush: brushHeld ? 'held' : 'bucket', jet: k === 'spray' && b.e === 0 && b.u > 0.05 && b.u < 0.97, dripping: k === 'scrub' };
}

// =============================================================================================
// The 배차실 window (bdDispatchWindow, 2 × 1, its back to the office wall): the window in its grey
// facade with the counter outside it, the breathalyser on the counter at the left with its wand on a
// clip, the 운행 일지 open in the middle with the pen on its chain, the stamp and pad to its right.

export const DW = { face: -0.2, ledge: 1.08, ledgeZ: [-0.2, 0.08] as [number, number] };
export const DW_BREATH = { unit: [-0.62, DW.ledge, -0.08] as V, clip: [-0.48, 1.16, -0.05] as V, screen: [-0.64, 1.19, 0.0] as V };
export const DW_BOOK: V = [-0.14, DW.ledge + 0.005, -0.05];
export const DW_PAD: V = [0.12, DW.ledge, -0.08];
export const DW_SPOTS = { breath: { x: -0.6, z: 0.58 }, log: { x: -0.12, z: 0.55 }, meet: { x: 0.55, z: 0.78 } };
export const DW_BREATH_WORK: V = [DW_BREATH.unit[0], 1.15, DW_BREATH.unit[2]];
export const DW_LOG_WORK: V = DW_BOOK;
const BREATH_SEQ: Seq = [['take', 1.0], ['blow', 3.2], ['read', 1.8], ['hang', 0.9]];
const breathKey: KeyFn = (key, f, _u, t) => {
  const k = f.k;
  const rest = f.o(-0.38, DW.ledge + 0.02, -0.02);
  switch (key) {
    case 'take':
    case 'hang': {
      const p = f.o(...DW_BREATH.clip);
      return hands({ l: rest, r: p, tool: p, palms: 0.2, gr: 0.85, gl: 0.2, nod: 0.35, lean: 0.12 });
    }
    case 'blow': {
      // The wand's mouthpiece to the lips, blown into steadily, the other hand on the counter.
      const p = f.bd(-0.02 * k, 0.86 * f.H - 0.05 * k, 0.15 * k);
      return hands({ l: rest, r: p, tool: p, palms: 0.1, gr: 0.85, gl: 0.2, nod: 0.05 + 0.02 * wave(t, 0.5) });
    }
    case 'read': {
      const p = f.bd(-0.1 * k, 0.62 * f.H, 0.26 * k);
      return hands({ l: rest, r: p, tool: p, palms: 0.4, gr: 0.85, gl: 0.2, nod: 0.45, lean: 0.12 });
    }
  }
  return hands({ l: rest });
};
export function breathAt(t: number, ph: number): { wand: 'clip' | 'held'; screen: 'idle' | 'blow' | 'ok'; blow: number } {
  const b = beatOf(BREATH_SEQ, t, ph);
  const k = b.from;
  const held = (k === 'take' && b.u > 0.5) || k === 'blow' || k === 'read' || (k === 'hang' && b.u < 0.5);
  const screen = k === 'blow' ? 'blow' : k === 'read' || (k === 'hang' && b.u < 0.6) ? 'ok' : 'idle';
  return { wand: held ? 'held' : 'clip', screen, blow: k === 'blow' ? b.u : 0 };
}
const LOG_SEQ: Seq = [['open', 1.0], ['write', 2.6], ['stamp', 1.6], ['read', 1.4]];
const logKey: KeyFn = (key, f, u, t) => {
  const [bx, by, bz] = DW_BOOK;
  const left = f.o(bx + 0.1, by + 0.02, bz + 0.02);
  switch (key) {
    case 'open': {
      // A page turned over from right to left.
      const a = Math.PI * sm(u, 0.15, 0.85);
      const p = f.o(bx - 0.09 * Math.cos(a) + 0.0, by + 0.02 + 0.1 * Math.sin(a), bz + 0.02);
      return hands({ l: left, r: p, palms: 1.0, gl: 0.2, gr: 0.5, nod: 0.55, lean: 0.2 });
    }
    case 'write': {
      const p = scribble(f.o(bx - 0.08, by + 0.02, bz + 0.03), t, f, 0.04);
      return hands({ l: left, r: p, tool: p, palms: 1.3, gl: 0.2, gr: 0.75, nod: 0.6, lean: 0.25 });
    }
    case 'stamp': {
      // Down onto the pad, up, and pressed onto the page.
      const pad = f.o(DW_PAD[0], DW_PAD[1] + 0.06, DW_PAD[2]);
      const page = f.o(bx - 0.08, by + 0.06, bz + 0.06);
      const up = (x: number) => new THREE.Vector3(0, 0.08 * x, 0);
      const p = u < 0.35 ? pad.clone().add(up(1 - sm(u, 0.05, 0.25))) : u < 0.6 ? pad.clone().lerp(page, sm(u, 0.35, 0.6)).add(up(1)) : page.clone().add(up(sm(u, 0.85, 1) + (1 - sm(u, 0.6, 0.72))));
      return hands({ l: left, r: p, tool: p, palms: 1.4, gl: 0.2, gr: 0.85, nod: 0.55, lean: 0.25 });
    }
    case 'read': {
      const p = f.o(bx - 0.08, by + 0.015, bz - 0.06 + 0.12 * u);
      return hands({ l: left, r: p, palms: 1.2, gl: 0.2, gr: 0.5, nod: 0.6, lean: 0.25 });
    }
  }
  return hands({ l: left });
};
export function logAt(t: number, ph: number): { writing: boolean; stamp: 'pad' | 'held'; stamped: boolean; page: number } {
  const b = beatOf(LOG_SEQ, t, ph);
  const k = b.from;
  return {
    writing: k === 'write',
    stamp: k === 'stamp' && b.u > 0.1 && b.u < 0.97 ? 'held' : 'pad',
    stamped: pastBeat(LOG_SEQ, b, 'stamp') || (k === 'stamp' && b.u > 0.72),
    page: k === 'open' ? sm(b.u, 0.15, 0.85) : 1,
  };
}

// =============================================================================================
// The CNG 충전기 (bdCngPump, 1 × 1): the dispenser on its island with the bollards, the nozzle on its
// holster on the right, the 정전기 패드 on its post at the front left; the bus being filled stands a
// good step out in front (its filler at CP.recept).

export const CP = { cab: { w: 0.56, h: 1.62, d: 0.32, z: -0.28 }, slab: 0.12, holster: [0.33, 1.05, -0.2] as V, pad: [-0.4, 1.02, 0.17] as V, recept: [0, 0.95, 1.42] as V, green: [0.08, 1.12, -0.11] as V, red: [0.19, 1.12, -0.11] as V, gauge: [-0.12, 1.3, -0.11] as V, outlet: [0.24, 1.72, -0.24] as V };
export const CP_SPOT = { x: 0.32, z: 0.66 };
export const CP_WORK: V = [0, 1.1, -0.11];
const TO_BUS = Math.atan2(CP.recept[0] - CP_SPOT.x, CP.recept[2] - CP_SPOT.z) - Math.PI;
const FUEL_SEQ: Seq = [['pad', 1.0], ['take', 1.0], ['clip', 1.6], ['start', 0.9], ['watch', 3.6], ['stop', 0.8], ['unclip', 1.3], ['hang', 1.0]];
const fuelKey: KeyFn = (key, f, u, t) => {
  const k = f.k;
  const recept = f.o(...CP.recept);
  const nozzle = recept.clone().addScaledVector(f.fwd, -0.12);
  switch (key) {
    case 'pad':
      return hands({ l: f.o(CP.pad[0], CP.pad[1], CP.pad[2] + 0.03), palms: 0, gl: 0.0, nod: 0.3, lean: 0.12 });
    case 'take':
    case 'hang': {
      const p = f.o(CP.holster[0], CP.holster[1], CP.holster[2] + 0.04);
      return hands({ r: p, item: p, palms: 0.3, gr: 0.9, nod: 0.3, lean: 0.12 });
    }
    case 'clip':
    case 'unclip': {
      // Pushed onto the filler and its lever turned down (or up), the left hand steadying the hose.
      const lock = key === 'clip' ? sm(u, 0.5, 0.8) : 1 - sm(u, 0.15, 0.45);
      const r = nozzle.clone().add(new THREE.Vector3(0, -0.02 * lock, 0));
      return hands({ r, item: r, l: r.clone().addScaledVector(f.fwd, -0.18).addScaledVector(f.left, 0.08).add(new THREE.Vector3(0, -0.04, 0)), palms: 0.3 + 0.8 * lock, gr: 0.9, gl: 0.8, nod: 0.45, lean: 0.3, crouch: 0.15 });
    }
    case 'start':
    case 'stop': {
      const b = key === 'start' ? CP.green : CP.red;
      const p = f.o(b[0], b[1], b[2] + 0.05 - 0.03 * sm(u, 0.3, 0.5) * (1 - sm(u, 0.65, 0.85)));
      return hands({ r: p, palms: 1.3, gr: 0.4, nod: 0.25, lean: 0.1, tap: u > 0.3 && u < 0.7 });
    }
    case 'watch':
      // Arms folded, watching the gauge climb.
      return hands({ l: f.bd(-0.1 * k, 0.66 * f.H, 0.16 * k), r: f.bd(0.1 * k, 0.64 * f.H, 0.17 * k), palms: 0.1, gl: 0.5, gr: 0.5, nod: 0.05 + 0.03 * wave(t, 0.3) });
  }
  return hands({});
};
export function fuelAt(t: number, ph: number): { nozzle: 'holster' | 'held' | 'clipped'; fill: number; flowing: boolean; pad: boolean } {
  const b = beatOf(FUEL_SEQ, t, ph);
  const k = b.from;
  const on = ['start', 'watch', 'stop'].includes(k) ? true : false;
  const clipped = (k === 'clip' && b.u > 0.5) || on || (k === 'unclip' && b.u < 0.45);
  const held = (k === 'take' && b.u > 0.4) || k === 'clip' || k === 'unclip' || (k === 'hang' && b.u < 0.6);
  const fill = k === 'watch' ? sm(b.u, 0, 1) : k === 'stop' || k === 'unclip' || k === 'hang' ? 1 : 0;
  return { nozzle: clipped ? 'clipped' : held ? 'held' : 'holster', fill, flowing: (k === 'start' && b.u > 0.5) || k === 'watch', pad: k === 'pad' && b.u > 0.2 };
}

// =============================================================================================
// The 분실물 보관함 (bdLostFound, 2 × 1): grey steel shelving of labelled bins, the 접수 tray at
// waist height on the left with the ledger beside it, the umbrellas in a bucket on the floor.

export const LF = { front: -0.06, back: -0.48, levels: [0.08, 0.5, 0.92, 1.34, 1.76], tray: [-0.62, 0.92, -0.24] as V, ledger: [-0.26, 0.926, -0.2] as V };
export const LF_SLOTS: Array<[number, number]> = [[0.22, 1.34], [0.62, 0.92], [0.22, 0.5], [0.62, 1.34]];
export const LF_SPOT = { x: 0, z: 0.34 };
export const LF_WORK: V = [0, 0.92, LF.front];
const LOST_SEQ: Seq = [['pick', 1.2], ['tag', 1.8], ['write', 2.0], ['put', 1.6]];
export const lostSlot = (n: number) => LF_SLOTS[((n % LF_SLOTS.length) + LF_SLOTS.length) % LF_SLOTS.length];
const lostKey: KeyFn = (key, f, u, t, n) => {
  const k = f.k;
  switch (key) {
    case 'pick': {
      const p = f.o(LF.tray[0], LF.tray[1] + 0.05 + 0.06 * sm(u, 0.5, 1), LF.tray[2]);
      return carry(f, p, 0.07, { item: u > 0.45 ? p : undefined, nod: 0.45, lean: 0.25 });
    }
    case 'tag': {
      const p = chest(f, 0.6, 0.26);
      return hands({ l: p.clone().addScaledVector(f.left, 0.06), r: p.clone().addScaledVector(f.left, -0.05).add(new THREE.Vector3(0, 0.02 * wave(t, 2.2), 0)), item: p, palms: 0.8, gl: 0.6, gr: 0.7, nod: 0.6 });
    }
    case 'write': {
      const held = f.bd(0.2 * k, 0.6 * f.H, 0.2 * k);
      const p = scribble(f.o(LF.ledger[0], LF.ledger[1] + 0.02, LF.ledger[2] + 0.02), t, f, 0.04);
      return hands({ l: held, item: held, r: p, tool: p, palms: 1.2, gl: 0.6, gr: 0.75, nod: 0.55, lean: 0.25 });
    }
    case 'put': {
      const [sx, sy] = lostSlot(n);
      const slot = f.o(sx, sy + 0.06, -0.22);
      const p = chest(f, 0.6, 0.26).lerp(slot, sm(u, 0.05, 0.75));
      const low = THREE.MathUtils.clamp((0.75 - (sy - f.bd(0, 0, 0).y)) / 0.55, 0, 1);
      return carry(f, p, 0.07, { item: u < 0.8 ? p : undefined, nod: 0.3 + 0.2 * low, lean: 0.2 + 0.2 * low, crouch: low * sm(u, 0.1, 0.6) });
    }
  }
  return hands({});
};
export function lostAt(t: number, ph: number): { n: number; item: 'tray' | 'held' | 'shelf'; tagged: boolean; writing: boolean } {
  const b = beatOf(LOST_SEQ, t, ph);
  const k = b.from;
  const item = k === 'pick' && b.u < 0.45 && b.e === 0 ? 'tray' : k === 'put' && (b.u >= 0.8 || b.e > 0) ? 'shelf' : 'held';
  return { n: b.n, item, tagged: pastBeat(LOST_SEQ, b, 'tag') || (k === 'tag' && b.u > 0.7), writing: k === 'write' };
}

// ---------------------------------------------------------------------------------------------

const ROUNDS: Record<Exclude<BdMotion, 'bdWalkRound' | 'bdRest'>, Round> = {
  bdDash: { seq: DASH_SEQ, key: dashKey, work: WHEEL.hub, base: 0 },
  bdSettle: { seq: SETTLE_SEQ, key: settleKey, work: FB_WORK, base: Math.PI, turn: (k) => (k === 'key' || k === 'pull' || k === 'back' ? 0.35 : k === 'card' ? -0.35 : k === 'write' ? -0.25 : 0) },
  bdTrace: { seq: TRACE_SEQ, key: traceKey, work: RB_WORK, base: Math.PI, turn: (k) => (k === 'trace' ? 0.3 : 0.15) },
  bdMemorize: { seq: MEMO_SEQ, key: memoKey, work: RB_WORK, base: Math.PI, turn: () => 0.3 },
  bdSchedule: { seq: PLAN_SEQ, key: planKey, work: RB_WORK, base: Math.PI, turn: (k) => (k === 'check' ? -0.1 : -0.3) },
  bdWash: { seq: WASH_SEQ, key: washKey, work: WB_WORK, base: 0, turn: (k) => (k === 'take' || k === 'hang' ? Math.PI * 0.92 : k === 'dip' ? 0.75 : 0) },
  bdBreath: { seq: BREATH_SEQ, key: breathKey, work: DW_BREATH_WORK, base: Math.PI, turn: (k) => (k === 'take' || k === 'hang' ? -0.25 : 0) },
  bdLog: { seq: LOG_SEQ, key: logKey, work: DW_LOG_WORK, base: Math.PI, turn: (k) => (k === 'stamp' ? -0.2 : 0) },
  bdFuel: { seq: FUEL_SEQ, key: fuelKey, work: CP_WORK, base: Math.PI, turn: (k) => (k === 'pad' ? 0.55 : k === 'clip' || k === 'unclip' ? TO_BUS : k === 'watch' ? 0.15 : 0) },
  bdLost: { seq: LOST_SEQ, key: lostKey, work: LF_WORK, base: Math.PI, turn: (k, n) => (k === 'pick' ? 0.5 : k === 'write' ? 0.3 : k === 'put' ? -0.45 * lostSlot(n)[0] : 0) },
};
type Framed = keyof typeof ROUNDS;

/** The spot's turn from square on now (to their left +), eased from beat to beat. */
export function bdTurn(m: BdMotion, t: number, ph: number): number {
  const R = ROUNDS[m as Framed];
  if (!R?.turn) return 0;
  const b = beatOf(R.seq, t, ph);
  const nNext = b.i === R.seq.length - 1 ? b.n + 1 : b.n;
  const a = R.turn(b.from, b.n);
  return mixAngle(a, R.turn(b.to, nNext), b.e);
}
/** Which way a spot faces in its piece now (its base and turn). */
export const bdYaw = (m: BdMotion, t: number, ph: number) => (ROUNDS[m as Framed]?.base ?? 0) + bdTurn(m, t, ph);
/** Where the motion's work mark is in its piece. */
export const bdWork = (m: BdMotion): V => ROUNDS[m as Framed]?.work ?? [0, 1, 0];
/** The hands for a motion worked out in a frame (the builder puts what's held in them). */
export function bdHands(m: BdMotion, f: Frame, t: number, ph: number): Hands {
  if (m === 'bdWalkRound') return walkHands(f, t, ph);
  if (m === 'bdRest') return restHands(f, t);
  const R = ROUNDS[m];
  const b = beatOf(R.seq, t, ph);
  const a = R.key(b.from, f, b.u, t, b.n);
  if (b.e <= 0) return a;
  return mix(a, R.key(b.to, f, 0, t, b.i === R.seq.length - 1 ? b.n + 1 : b.n), b.e);
}
/** Sat back in the 안마의자: the forearms in its arm cuffs, the head back, a slow breath. */
function restHands(f: Frame, t: number): Hands {
  const k = f.k;
  return hands({ l: f.bd(0.27 * k, 0.17 * k, 0.2 * k), r: f.bd(-0.27 * k, 0.17 * k, 0.2 * k), palms: 1.3, gl: 0.3, gr: 0.3, nod: -0.12 + 0.03 * wave(t, 0.18), lean: -0.1 });
}

/**
 * A dweller doing one of these: the frame from where they are and the spot's work mark. A spot faces its
 * piece at its round's base turned by bdTurn, so the piece's own turn is the body's less that. (The
 * walk round and the rest go by the body alone.)
 */
export function bdDoing(m: BdMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.35).setY(b.base.y + 0.9);
  const ph = bdPhase(p);
  const pieceYaw = m === 'bdWalkRound' || m === 'bdRest' ? b.yaw : b.yaw - bdYaw(m, t, ph);
  const f = frameAt(p, bdWork(m), pieceYaw, b.base, b.yaw, b.height);
  const h = bdHands(m, f, t, ph);
  return {
    reach: { l: h.l, r: h.r, lean: h.lean, nod: h.nod, palms: h.palms, grip: { l: h.gl, r: h.gr }, tap: h.tap },
    crouch: h.crouch || undefined,
    ...(m === 'bdRest' ? { shut: true } : {}),
  };
}
