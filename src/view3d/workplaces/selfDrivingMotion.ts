import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 자율주행차 개발 센터 (2026-11-01, a new career at the user's request). Each motion is a round of beats: where the dweller
 * is, where the hands go, and what moves. The piece reads the same script by the same clock (selfDriving.ts), so the test car with
 * the dweller in its seat is where the script says, and the desk's point cloud follows the same run (SD_LIVE).
 *
 * - 실내 시험 트랙 (sdTrack): sdRide into the safety operator's seat, the car drives itself, stops for the dummy on the crossing, drives
 *   the loop and parks, hands near the wheel all the way. sdScenario the same with a soft target in the lane to steer round, the
 *   hands closing on the wheel. sdEStop the alarm: the car comes on with the dummy in its way, the red button on the post is hit and it
 *   halts just short; a corner sensor wiped, the button twisted out, the car backed away. sdDummy the dummy straightened and run
 *   across by remote.
 * - 센서 보정판 (sdCalibBoard): sdCalib the checker board rolled to three places, the error read at the rig each time, falling.
 * - 주행 기록 분석 책상 (sdLogDesk): sdLog scrubbing a run, sdFix a fix typed and run again, sdLearn with a senior, sdTune the false alarms falling.
 * - 라벨링 작업대 (sdLabelStation): sdLabel boxes drawn with a stylus, sdAudit somebody's boxes checked and one corrected.
 * - 정비 베이 (sdGarage): sdHood the hood up and the computer's cable and bolts seen to, sdUnder the lift raised and a torch underneath,
 *   sdLidar the lidar off the roof, its window wiped on the bench, put back.
 * - 안전 게시판 (sdSafetyBoard): sdBrief going through the day's runs, sdLead chairing the safety review.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's right
 * hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type SdMotion = 'sdRide' | 'sdScenario' | 'sdEStop' | 'sdDummy' | 'sdCalib' | 'sdLog' | 'sdFix' | 'sdLearn' | 'sdTune' | 'sdLabel' | 'sdAudit' | 'sdHood' | 'sdUnder' | 'sdLidar' | 'sdBrief' | 'sdLead';
export const SD_MOTIONS = new Set<string>(['sdRide', 'sdScenario', 'sdEStop', 'sdDummy', 'sdCalib', 'sdLog', 'sdFix', 'sdLearn', 'sdTune', 'sdLabel', 'sdAudit', 'sdHood', 'sdUnder', 'sdLidar', 'sdBrief', 'sdLead']);
export type SdTool = 'tablet' | 'remote' | 'cloth' | 'stylus' | 'driver' | 'torch';

/** What the test car's doing now, for the desk's point cloud: set by the track while it's used, read by the desk. */
export const SD_LIVE = { s: 0, dodge: 0, dummy: 0, mode: 0, at: -1e9 };

export const frac = (x: number) => ((x % 1) + 1) % 1;
export const sdPhase = (p: THREE.Vector3) => frac(p.x * 0.241 + p.z * 0.577);
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------
// The loop the test car drives (sdTrack, 12 × 6): near straight towards -x, the driver on the camera's side.

export const TR = {
  a: 4.4,
  r: 1.1,
  zN: 1.45,
  zF: -1.65,
  hw: 1.0,
  /** The zebra crossing on the near straight, and the dummy's rail across it. */
  crossX: -1.45,
  crossW: 1.1,
  kerbN: 2.55,
  kerbF: 0.35,
  post: [0.6, 1.12, 2.82] as V,
  postStand: 3.22,
  /** The soft target in the far lane. */
  target: [0, -1.95] as const,
};
const ST = TR.a - TR.r;
const SIDE = TR.zN - TR.zF - 2 * TR.r;
const ARC = (PI / 2) * TR.r;
export const LOOP = 2 * (2 * ST) + 2 * SIDE + 4 * ARC;
export const CAR = { L: 3.2, Wd: 1.5, seatY: 0.42, sx: -0.38, dz: -0.33, hubX: 0.12, hubY: 0.86, door: -1.16, sensor: [1.45, 0.7, -0.62] as V };
/** The car's place: parked, stopped for the crossing, stopped by the alarm. */
export const S0 = 0.3;
export const SSTOP = 2.4;
const SBRAKE = 1.27;
const SHALT = 2.87;

const NEAR_C = TR.zN - TR.r;
const FAR_C = TR.zF + TR.r;
/** The centre of the loop at `s` along it: place and way of travel (x, z). */
function loopAt(sIn: number): { x: number; z: number; dx: number; dz: number; bend: number } {
  let s = ((sIn % LOOP) + LOOP) % LOOP;
  const arc = (cx: number, cz: number, from: number, u: number) => {
    const f = from + (u * PI) / 2;
    return { x: cx + TR.r * Math.sin(f), z: cz - TR.r * Math.cos(f), dx: Math.cos(f), dz: Math.sin(f), bend: 1 };
  };
  if (s < 2 * ST) return { x: ST - s, z: TR.zN, dx: -1, dz: 0, bend: 0 };
  s -= 2 * ST;
  if (s < ARC) return arc(-ST, NEAR_C, PI, s / ARC);
  s -= ARC;
  if (s < SIDE) return { x: -TR.a, z: NEAR_C - s, dx: 0, dz: -1, bend: 0 };
  s -= SIDE;
  if (s < ARC) return arc(-ST, FAR_C, (3 * PI) / 2, s / ARC);
  s -= ARC;
  if (s < 2 * ST) return { x: -ST + s, z: TR.zF, dx: 1, dz: 0, bend: 0 };
  s -= 2 * ST;
  if (s < ARC) return arc(ST, FAR_C, 2 * PI, s / ARC);
  s -= ARC;
  if (s < SIDE) return { x: TR.a, z: FAR_C + s, dx: 0, dz: 1, bend: 0 };
  s -= SIDE;
  return arc(ST, NEAR_C, (5 * PI) / 2, Math.min(1, s / ARC));
}
/** Past the soft target on the far straight, out of the lane and back: how far in. */
const SFAR = 2 * ST + 2 * ARC + SIDE;
const STARGET = SFAR + ST;
const dodgeAt = (s: number) => {
  const w = ((s % LOOP) + LOOP) % LOOP;
  return 0.95 * sm(w, STARGET - 2.2, STARGET - 0.9) * (1 - sm(w, STARGET + 0.9, STARGET + 2.2));
};
export interface CarPose {
  x: number;
  z: number;
  /** rotation.y of a group whose nose is +x. */
  th: number;
  /** The way a dweller's yaw faces along the car. */
  fy: number;
  /** The wheel's turn. */
  steer: number;
}
export function carPose(s: number, dodge = false): CarPose {
  const p = loopAt(s);
  const lat = dodge ? dodgeAt(s) : 0;
  const slope = dodge ? (dodgeAt(s + 0.3) - dodgeAt(s - 0.3)) / 0.6 : 0;
  const th = Math.atan2(-p.dz, p.dx) - 0.35 * slope;
  return { x: p.x + lat * Math.sin(th), z: p.z + lat * Math.cos(th), th, fy: th + PI / 2, steer: p.bend * 1.4 - 1.2 * slope };
}
/** A point on the car (x along it, nose +x; z to its right) in the track's frame. */
export function onCar(s: number, dodge: boolean, x: number, y: number, z: number): V {
  const c = carPose(s, dodge);
  const co = Math.cos(c.th);
  const si = Math.sin(c.th);
  return [c.x + x * co + z * si, y, c.z - x * si + z * co];
}

// ---------------------------------------------------------------------------------------------
// The script engine.

type Seq = Array<[string, number, number?]>;
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
}
const st = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
const sat = (s: V, yaw = PI): St => ({ x: s[0], y: s[1], z: s[2], yaw, sit: true });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  crouch?: number;
  tap?: boolean;
  /** Walking while the beat's held (alongside the board it's rolling). */
  walk?: boolean;
  tool?: SdTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string, u: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface SdNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: SdTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number): { st: St; key: Key } {
  const here = s.at(k, u);
  const idx = s.seq.findIndex(([q]) => q === k);
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = {
    t,
    H,
    st: here,
    bd: (side, up, ahead) => [here.x + lx * side + fx * ahead, here.y + up, here.z + lz * side + fz * ahead],
    p: (name, a = 0, b = 1) => {
      const i = s.seq.findIndex(([q]) => q === name);
      return idx > i ? 1 : idx < i ? 0 : sm(u, a, b);
    },
  };
  return { st: here, key: s.key(k, u, c) };
}
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function sdNow(m: SdMotion, t: number, ph: number, H = 1.6): SdNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const sitNow = e < 0.5 ? A.st.sit : B.st.sit;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: sitNow };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  const tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  const walking = !here.sit && ((e > 0 && e < 1 && dist > 0.12) || (e < 0.5 ? !!A.key.walk : !!B.key.walk));
  return { b, st: here, walking, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function sdPose(m: SdMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = sdNow(m, t, sdPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch ? k.crouch : undefined,
    },
  };
}
/** Both hands either side of a point (the right on +x as you face the piece). */
const both = (p: V, dx: number, up = 0.03, ahead = 0.05, g = 0.75): Key => ({ r: add(p, dx, up, ahead), l: add(p, -dx, up, ahead), gr: g, gl: g });
const easy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const leftEasy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.08), gl: 0.3 });
const rightEasy = (c: Ctx) => ({ r: c.bd(-0.2, 0.55 * c.H, 0.08), gr: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
/** A tablet held in the left arm; the right free to tap on it. */
const tabletAt = (c: Ctx): V => c.bd(0.14, 0.66 * c.H, 0.28);
const tapTablet = (tab: V, c: Ctx): V => add(tab, 0.08 + 0.018 * Math.sin(c.t * 13), 0.05, 0.03);

// =============================================================================================
// 실내 시험 트랙 (sdTrack): the rides.

const seatSt = (s: number, dodge: boolean): St => ({ ...sat(onCar(s, dodge, CAR.sx, CAR.seatY, CAR.dz), carPose(s, dodge).fy) });
/** The hands at the rim: `close` 0 a hand's breadth off it, ready; 1 on it. */
function rim(s: number, dodge: boolean, close: number): Key {
  const off = 0.05 * (1 - close);
  const y = CAR.hubY + 0.05;
  return {
    l: onCar(s, dodge, CAR.hubX - 0.05 - off, y, CAR.dz - 0.17),
    r: onCar(s, dodge, CAR.hubX - 0.05 - off, y, CAR.dz + 0.17),
    gl: mixN(0.2, 0.9, close),
    gr: mixN(0.2, 0.9, close),
    palms: 0.6,
  };
}
const CARX0 = carPose(S0).x;
const DOOR: V = onCar(S0, false, CAR.sx - 0.38, 0, CAR.door);
function boardBeats(k: string, u: number, c: Ctx, n: Record<string, number>): Key | null {
  switch (k) {
    case 'walk':
      return { ...easy(c), nod: 0.1, n };
    case 'door':
      return { ...leftEasy(c), r: onCar(S0, false, mixN(-0.51, -0.41, sm(u, 0.2, 0.9)), 0.74, mixN(-0.79, -1.2, sm(u, 0.2, 0.9))), gr: 0.8, palms: 0.4, nod: 0.18, n };
    case 'belt': {
      // Belted in, the system woken with a press on the console.
      const belt = onCar(S0, false, CAR.sx - 0.02, 0.84 + 0.2 * (1 - sm(u, 0.1, 0.6)), CAR.dz - 0.18 + 0.36 * sm(u, 0.1, 0.6));
      return { r: belt, gr: 0.8, palms: 0.3, l: onCar(S0, false, CAR.hubX + 0.18, 0.82, CAR.dz + 0.32), gl: 0.15, nod: 0.25, n };
    }
    default:
      return null;
  }
}
const atBoard = (k: string): St | null => (k === 'walk' ? st(CARX0, 3.1, PI) : k === 'door' ? st(DOOR[0], DOOR[2], PI) : k === 'belt' ? seatSt(S0, false) : null);
const eased = (u: number) => 0.45 * u + 0.55 * sm(u, 0, 1);
const wrapS = (s: number) => ((s % LOOP) + LOOP) % LOOP;

function rideS(k: string, u: number) {
  if (k === 'go1') return mixN(S0, SSTOP, eased(u));
  if (k === 'wait') return SSTOP;
  if (k === 'go2') return mixN(SSTOP, LOOP + S0, eased(u));
  return S0;
}
const RIDE: Script = {
  seq: [['walk', 0.4, 1.3], ['door', 0.9, 0.7], ['belt', 1.5, 0.01], ['go1', 3.2, 0.01], ['wait', 5.2, 0.01], ['go2', 16, 0.01], ['park', 1.2, 0.3], ['note', 3.0, 0.7], ['out', 0.6, 1.0]],
  at: (k, u) => atBoard(k) ?? (k === 'out' ? st(DOOR[0], DOOR[2], 0) : seatSt(rideS(k, u), false)),
  key(k, u, c) {
    const s = rideS(k, u);
    const parkedDoor = k === 'door' ? sm(u, 0.2, 0.9) : k === 'out' ? 1 - sm(u, 0.1, 0.8) : 0;
    const dummy = k === 'wait' ? sm(u, 0.14, 0.86) : k === 'go2' ? 1 - sm(u, 0.48, 0.74) : 0;
    const moving = k === 'go1' || k === 'go2' ? 1 : 0;
    const n: Record<string, number> = { carS: wrapS(s), door: parkedDoor, dummy, moving, brake: k === 'wait' || k === 'park' ? 1 : 0, on: k === 'walk' || k === 'door' || k === 'out' ? 0 : 1, mode: 1, ride: 1 };
    const board = boardBeats(k, u, c, n);
    if (board) return board;
    switch (k) {
      case 'go1':
        return { ...rim(s, false, 0), nod: 0.04, n };
      case 'wait':
        // Stopped at the line, the dummy crossing: eyes on it, a hand a little readier.
        return { ...rim(s, false, 0.35), nod: 0.1 + 0.05 * Math.sin(c.t * 0.9), lean: 0.06, n };
      case 'go2': {
        // Hands near the wheel all the way; they close on it for a moment on the far bend.
        const tense = sm(u, 0.3, 0.36) * (1 - sm(u, 0.42, 0.5));
        return { ...rim(s, false, tense), nod: 0.02 + 0.05 * Math.sin(c.t * 0.6), n };
      }
      case 'park':
        return { ...rim(s, false, 0), nod: 0.14, n };
      case 'note': {
        const tablet = c.bd(0.08, 0.3, 0.3);
        return { r: tapTablet(tablet, c), gr: 0.7, nod: 0.34, tool: 'tablet', n: { ...n, note: sm(u, 0.2, 0.8) }, props: { tablet } };
      }
      default:
        return { ...easy(c), nod: 0.05, n };
    }
  },
};
function scenS(k: string, u: number) {
  return k === 'go' ? mixN(S0, LOOP + S0, eased(u)) : S0;
}
const SCENARIO: Script = {
  seq: [['walk', 0.4, 1.3], ['door', 0.9, 0.7], ['belt', 1.5, 0.01], ['go', 18, 0.01], ['park', 1.0, 0.3], ['note', 2.6, 0.7], ['out', 0.6, 1.0]],
  at: (k, u) => atBoard(k) ?? (k === 'out' ? st(DOOR[0], DOOR[2], 0) : seatSt(scenS(k, u), k === 'go')),
  key(k, u, c) {
    const s = scenS(k, u);
    const door = k === 'door' ? sm(u, 0.2, 0.9) : k === 'out' ? 1 - sm(u, 0.1, 0.8) : 0;
    const n: Record<string, number> = { carS: wrapS(s), door, moving: k === 'go' ? 1 : 0, dodge: k === 'go' ? 1 : 0, target: 1, brake: k === 'park' ? 1 : 0, on: k === 'walk' || k === 'door' || k === 'out' ? 0 : 1, mode: 1, ride: 1 };
    const board = boardBeats(k, u, c, n);
    if (board) return board;
    if (k === 'go') {
      const w = wrapS(s);
      const close = sm(w, STARGET - 4, STARGET - 2.4) * (1 - sm(w, STARGET + 2.4, STARGET + 3.6));
      return { ...rim(s, true, close), lean: 0.08 * close, nod: 0.04, n };
    }
    if (k === 'park') return { ...rim(s, false, 0), nod: 0.14, n };
    if (k === 'note') {
      const tablet = c.bd(0.08, 0.3, 0.3);
      return { r: tapTablet(tablet, c), gr: 0.7, nod: 0.34, tool: 'tablet', n: { ...n, note: sm(u, 0.2, 0.8) }, props: { tablet } };
    }
    return { ...easy(c), nod: 0.05, n };
  },
};
function stopS(k: string, u: number) {
  if (k === 'run') return mixN(-9, SBRAKE, u);
  if (k === 'slam') return mixN(SBRAKE, SHALT, 1 - (1 - u) * (1 - u));
  if (k === 'rev') return mixN(SHALT, -9, sm(u, 0.1, 1));
  return SHALT;
}
/** The corner sensor on the stopped car, wiped from the kerb. */
const SENSOR: V = onCar(SHALT, false, CAR.sensor[0], CAR.sensor[1], CAR.sensor[2]);
const ESTOP: Script = {
  seq: [['run', 4.6, 0.01], ['slam', 0.9, 0.01], ['halt', 1.6, 1.0], ['look', 1.4, 0.3], ['wipe', 2.6, 1.0], ['reset', 1.8, 0.2], ['rev', 6.0, 0.2]],
  at: (k) => (k === 'look' || k === 'wipe' ? st(SENSOR[0] + 0.02, SENSOR[2] + 0.48) : st(TR.post[0], TR.postStand)),
  key(k, u, c) {
    const s = stopS(k, u);
    const dummy = k === 'run' ? 0.5 * sm(u, 0.3, 0.72) : k === 'rev' ? 0.5 * (1 - sm(u, 0.3, 0.9)) : 0.5;
    const btn = k === 'slam' || k === 'halt' || k === 'look' || k === 'wipe' ? 1 : k === 'reset' ? 1 - sm(u, 0.5, 0.75) : 0;
    const n: Record<string, number> = { carS: wrapS(s), dummy, moving: k === 'run' || k === 'slam' ? 1 : 0, brake: k === 'slam' || k === 'halt' ? 1 : 0, hazard: k === 'slam' || k === 'halt' || k === 'look' || k === 'wipe' || k === 'reset' ? 1 : 0, strobe: k === 'run' || k === 'slam' || k === 'halt' ? 1 : 0, btn, on: 1, mode: btn > 0.5 ? 2 : 1, stopped: k === 'run' ? 0 : k === 'rev' ? 0 : 1 };
    const button = add(TR.post, 0, 0.02, 0.06);
    switch (k) {
      case 'run': {
        // Eyes on the car, the hand coming up over the button as it doesn't slow.
        const up = add(button, 0, 0.14 * (1 - sm(u, 0.72, 1)), 0.1 * (1 - sm(u, 0.72, 1)));
        return { ...leftEasy(c), r: up, gr: 0.2, palms: 0.05, nod: -0.05, lean: 0.06 + 0.1 * sm(u, 0.72, 1), n };
      }
      case 'slam':
        return { ...leftEasy(c), r: add(button, 0, 0.012, 0.012), gr: 0.15, palms: 0.05, lean: 0.14, nod: 0.02, n };
      case 'halt':
        return { ...leftEasy(c), r: add(button, 0, 0.012, 0.012), gr: 0.15, palms: 0.05, lean: 0.08, nod: 0.05 - 0.06 * Math.sin(u * PI), n };
      case 'look':
        return { ...easy(c), crouch: 0.3 * sm(u, 0.2, 1), nod: 0.4, lean: 0.15, n };
      case 'wipe': {
        const cloth: V = add(SENSOR, 0.05 * Math.sin(c.t * 7), 0.03 * Math.cos(c.t * 5), 0.09);
        return { ...leftEasy(c), crouch: 0.3, nod: 0.42, lean: 0.16, tool: 'cloth', n, props: { cloth } };
      }
      case 'reset':
        // The mushroom twisted and pulled out.
        return { ...leftEasy(c), r: add(button, 0.012 * Math.sin(u * 8), 0.012, 0.02 + 0.03 * sm(u, 0.5, 0.75)), gr: 0.8, palms: 0.05, nod: 0.1, n };
      default:
        return { ...easy(c), nod: 0.02, n };
    }
  },
};
const DUMMY_AT: V = [TR.crossX, 0, TR.kerbN];
const DUMMY: Script = {
  seq: [['come', 0.3, 0.9], ['dress', 2.6, 0.5], ['step', 0.3, 0.7], ['remote', 6.5, 0.8], ['tick', 1.6, 0.8]],
  at: (k) => (k === 'come' ? st(DUMMY_AT[0] + 1.0, 3.3) : k === 'dress' ? st(DUMMY_AT[0] + 0.05, DUMMY_AT[2] + 0.5) : st(DUMMY_AT[0] + 0.95, 3.1, -PI + 0.5)),
  key(k, u, c) {
    const crossing = k === 'remote' ? sm(u, 0.1, 0.48) * (1 - sm(u, 0.56, 0.92)) : 0;
    const n: Record<string, number> = { carS: S0, dummy: crossing, on: k === 'remote' ? 1 : 0, mode: 0, dress: k === 'dress' ? 1 : 0 };
    const chest: V = [DUMMY_AT[0], 1.18, DUMMY_AT[2] + 0.1];
    const remote: V = c.bd(0.05, 0.66 * c.H, 0.24);
    switch (k) {
      case 'dress':
        // The vest pulled straight, the head turned to face the road.
        return { ...both(chest, 0.14 + 0.02 * Math.sin(c.t * 3), 0.02 * Math.sin(c.t * 4), 0.03, 0.8), nod: 0.14, n };
      case 'remote':
        return { ...rightEasy(c), tool: 'remote', nod: -0.02, n, props: { remote } };
      case 'tick': {
        const tablet = tabletAt(c);
        return { r: tapTablet(tablet, c), gr: 0.7, tool: 'tablet', nod: 0.3, n: { ...n, note: sm(u, 0.2, 0.8) }, props: { tablet } };
      }
      default:
        return { ...easy(c), nod: 0.1, n };
    }
  },
};

// =============================================================================================
// 센서 보정판 (sdCalibBoard, 3 × 2): a checker board on a wheeled stand at the back, a rig of sensors at the front.

export const CB = { xs: [-0.85, 0, 0.85], z: -0.45, tilt: [0.28, 0, -0.28], handleY: 0.98, rig: [0, 1.22, 0.72] as V, read: [0.6, 0.4] as const, shelf: [0.5, 0.96, 0.72] as V, err: [4.2, 1.6, 0.4] };
const bPos = (i: number) => CB.xs[((i % 3) + 3) % 3];
const rollBeat = (i: number, u: number) => mixN(bPos(i - 1), bPos(i), sm(u, 0.05, 0.95));
const CALIB: Script = {
  seq: [['p0', 2.0, 1.0], ['r0', 2.2, 1.0], ['p1', 2.0, 1.0], ['r1', 2.2, 1.0], ['p2', 2.0, 1.0], ['r2', 2.6, 1.0]],
  at: (k, u) => (k[0] === 'p' ? st(rollBeat(Number(k[1]), u), CB.z + 0.56) : st(CB.read[0], CB.read[1], -PI + 0.0)),
  key(k, u, c) {
    const i = Number(k[1]);
    const rolling = k[0] === 'p';
    const bx = rolling ? rollBeat(i, u) : bPos(i);
    const tiltAt = (j: number) => CB.tilt[((j % 3) + 3) % 3];
    const tilt = rolling ? mixN(tiltAt(i - 1), tiltAt(i), sm(u, 0.05, 0.95)) : tiltAt(i);
    const err = rolling ? (i === 0 ? CB.err[0] : CB.err[i - 1]) : mixN(i === 0 ? CB.err[0] : CB.err[i - 1], CB.err[i], sm(u, 0.15, 0.8));
    const n: Record<string, number> = { bx, tilt, err, seen: rolling ? 0 : 1, done: k === 'r2' ? sm(u, 0.7, 0.85) : 0 };
    if (rolling) return { ...both([bx, CB.handleY, CB.z + 0.05], 0.2, 0, 0.02, 0.85), nod: 0.2, lean: 0.06, walk: u > 0.05 && u < 0.95, n };
    const tablet = tabletAt(c);
    return { r: sm(u, 0.2, 0.3) > 0.5 ? tapTablet(tablet, c) : c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.6, tool: 'tablet', nod: 0.26 - 0.3 * sm(u, 0.6, 0.72) * (1 - sm(u, 0.82, 0.92)), n, props: { tablet } };
  },
};

// =============================================================================================
// 주행 기록 분석 책상 (sdLogDesk, 3 × 1).

export const LD = { seat: [0, 0.47, 0.82] as V, top: 0.76, keys: [0, 0.79, 0.3] as V, mouse: [0.28, 0.79, 0.3] as V };
const sitHands = (): Key => ({ l: add(LD.keys, -0.1, 0.03, 0), r: add(LD.mouse, 0, 0.03, 0), gl: 0.25, gr: 0.45, palms: 0.05 });
const rolling = (c: Ctx, dx = 0): V => add(LD.mouse, dx + 0.02 * Math.sin(c.t * 2.2), 0.03, 0.012 * Math.cos(c.t * 1.7));
const LOG: Script = {
  seq: [['scan', 4.0], ['scrub', 4.2], ['pick', 2.6], ['note', 3.0]],
  at: () => sat(LD.seat),
  key(k, u, c) {
    const n: Record<string, number> = { scrub: k === 'scan' ? -1 : k === 'scrub' ? u : k === 'pick' || k === 'note' ? 1 : 0, boxed: k === 'pick' ? sm(u, 0.3, 0.5) : k === 'note' ? 1 : 0, note: k === 'note' ? u : 0 };
    switch (k) {
      case 'scan':
        return { ...sitHands(), r: rolling(c), nod: -0.05 + 0.05 * Math.sin(c.t * 0.8), n };
      case 'scrub':
        return { ...sitHands(), r: add(LD.mouse, -0.05 + 0.1 * u, 0.03, 0), nod: 0, lean: 0.1, n };
      case 'pick':
        return { ...sitHands(), tap: u > 0.3 && u < 0.45, nod: 0.02, lean: 0.14, n };
      default:
        return { ...typing(LD.keys, c.t), nod: 0.12, n };
    }
  },
};
const FIX: Script = {
  seq: [['read', 2.4], ['type', 4.4], ['run', 3.0], ['pass', 1.8]],
  at: () => sat(LD.seat),
  key(k, u, c) {
    const n: Record<string, number> = { typed: k === 'type' ? u : k === 'read' ? 0 : 1, test: k === 'run' ? u : k === 'pass' ? 1 : 0, ok: k === 'pass' ? 1 : 0 };
    switch (k) {
      case 'read':
        return { ...sitHands(), r: rolling(c), nod: 0.02, lean: 0.08, n };
      case 'type':
        return { ...typing(LD.keys, c.t), nod: 0.12, n };
      case 'run':
        return { ...sitHands(), tap: u < 0.15, nod: -0.02, lean: 0.06, n };
      default:
        return { ...sitHands(), nod: 0.14 * Math.sin(u * PI), n };
    }
  },
};
const LEARN: Script = {
  seq: [['watch', 2.8], ['point', 3.2], ['try', 3.4], ['ask', 2.0], ['praise', 1.6]],
  at: () => sat(LD.seat),
  key(k, u, c) {
    const n: Record<string, number> = { senior: 1, point: k === 'point' || k === 'ask' ? 1 : 0, scrub: k === 'try' ? u : k === 'watch' ? -1 : 1, boxed: k === 'ask' || k === 'praise' ? 1 : 0, nods: k === 'praise' ? 1 : 0 };
    switch (k) {
      case 'try':
        return { ...sitHands(), r: add(LD.mouse, -0.05 + 0.1 * u, 0.03, 0), nod: 0.04, n };
      case 'ask':
        return { ...sitHands(), nod: 0.02, n };
      case 'praise':
        return { ...sitHands(), nod: 0.14 * Math.sin(u * PI), n };
      default:
        return { ...sitHands(), r: rolling(c), nod: -0.06, n };
    }
  },
};
const TUNE: Script = {
  seq: [['look', 2.6], ['type', 3.6], ['train', 5.0], ['ok', 1.8]],
  at: () => sat(LD.seat),
  key(k, u, c) {
    const n: Record<string, number> = { typed: k === 'type' ? u : k === 'look' ? 0 : 1, fall: k === 'train' ? u : k === 'ok' ? 1 : 0, ok: k === 'ok' ? 1 : 0 };
    switch (k) {
      case 'type':
        return { ...typing(LD.keys, c.t), nod: 0.12, n };
      case 'train':
        return { ...sitHands(), r: rolling(c), nod: -0.03, lean: 0.04, n };
      case 'ok':
        return { ...sitHands(), nod: 0.14 * Math.sin(u * PI), n };
      default:
        return { ...sitHands(), r: rolling(c), nod: -0.02, lean: 0.1, n };
    }
  },
};

// =============================================================================================
// 라벨링 작업대 (sdLabelStation, 2 × 1): a pen display laid back on the desk.

export const LS = { seat: [0, 0.47, 0.8] as V, top: 0.74, pad: [0, 0.84, 0.17] as V, w: 0.56, h: 0.34, tilt: 0.42, keys: [-0.42, 0.76, 0.3] as V };
/** A point on the pen display, u across, v up. */
export const onPad = (u: number, v: number, off = 0): V => {
  const sn = Math.sin(LS.tilt);
  const cs = Math.cos(LS.tilt);
  const dv = (v - 0.5) * LS.h;
  return [LS.pad[0] + (u - 0.5) * LS.w, LS.pad[1] + dv * sn + off * cs, LS.pad[2] - dv * cs + off * sn];
};
/** The boxes on the road scene: u0, v0, u1, v1. */
export const BOXES: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.1, 0.22, 0.36, 0.5],
  [0.44, 0.34, 0.54, 0.62],
  [0.62, 0.3, 0.74, 0.46],
  [0.8, 0.26, 0.97, 0.56],
];
const STYLUS_UP: V = [0, 0.05, 0.04];
/** The tip going round a box: u 0–1 once round. */
function boxTrace(i: number, u: number): [number, number] {
  const b = BOXES[((i % BOXES.length) + BOXES.length) % BOXES.length];
  const e = Math.max(0, Math.min(1, u)) * 4;
  const side = Math.min(3, Math.floor(e));
  const f = e - side;
  if (side === 0) return [mixN(b[0], b[2], f), b[3]];
  if (side === 1) return [b[2], mixN(b[3], b[1], f)];
  if (side === 2) return [mixN(b[2], b[0], f), b[1]];
  return [b[0], mixN(b[1], b[3], f)];
}
const LABEL: Script = {
  seq: [['b0', 2.4, 0.3], ['b1', 2.4, 0.3], ['b2', 2.4, 0.3], ['b3', 2.4, 0.3], ['next', 1.6, 0.4]],
  at: () => sat(LS.seat),
  key(k, u) {
    const i = k === 'next' ? 3 : Number(k[1]);
    const [tu, tv] = k === 'next' ? [0.5, 0.5] : boxTrace(i, u);
    const tip = onPad(tu, tv, k === 'next' ? 0.05 : 0.004);
    const n: Record<string, number> = { boxes: k === 'next' ? 4 : i, cur: k === 'next' ? 1 : u, scene: k === 'next' ? u : 0 };
    return { l: add(LS.keys, 0, 0.03, 0), gl: 0.25, palms: 0.05, nod: 0.24, lean: 0.1, tap: k === 'next' && u > 0.3 && u < 0.45, tool: 'stylus', n, props: { stylus: add(tip, STYLUS_UP[0], STYLUS_UP[1], STYLUS_UP[2]) } };
  },
};
const AUDIT: Script = {
  seq: [['look', 3.0, 0.3], ['drag', 2.4, 0.3], ['look2', 2.4, 0.3], ['pass', 1.6, 0.4]],
  at: () => sat(LS.seat),
  key(k, u, c) {
    const fix = k === 'look' ? 0 : k === 'drag' ? sm(u, 0.1, 0.9) : 1;
    // The second box, drawn too wide, its corner pulled in.
    const b = BOXES[1];
    const tip = k === 'drag' ? onPad(mixN(b[2] + 0.08, b[2], fix), b[1], 0.004) : onPad(0.5 + 0.12 * Math.sin(c.t * 0.9), 0.5 + 0.1 * Math.cos(c.t * 0.7), 0.05);
    const n: Record<string, number> = { boxes: 4, cur: 1, audit: 1, fix, stamp: k === 'pass' ? sm(u, 0.3, 0.5) : 0, scene: 0 };
    return { l: add(LS.keys, 0, 0.03, 0), gl: 0.25, palms: 0.05, tap: k === 'pass' && u > 0.25 && u < 0.45, nod: k === 'pass' ? 0.1 : 0.22, lean: 0.08, tool: 'stylus', n, props: { stylus: add(tip, STYLUS_UP[0], STYLUS_UP[1], STYLUS_UP[2]) } };
  },
};

// =============================================================================================
// 정비 베이 (sdGarage, 5 × 3): the second car on a four-post lift, a bench at its tail.

export const GA = { x: -0.3, z: -0.25, lift: 1.72, hoodX: 0.72, hoodL: 0.84, hoodA: 1.05, boxAt: [1.2, 0.72, 0] as V, lidar: [-0.35, 1.43, 0.42] as V, bench: [-1.75, 0.84, 0.92] as V, ctrl: [1.95, 1.1, 0.86] as V, stool: [-0.65, 0.66] as const };
const G = (x: number, y: number, z: number): V => [GA.x + x, y, GA.z + z];
const HOOD: Script = {
  seq: [['come', 0.3, 0.9], ['pop', 1.0, 0.1], ['raise', 1.2, 0.3], ['plug', 2.4, 0.2], ['bolt', 3.0, 0.2], ['test', 2.0, 0.2], ['shut', 1.2, 0.8]],
  at: (k) => (k === 'come' ? st(1.9, 1.15, PI) : st(GA.x + 1.85, GA.z - 0.04, -PI / 2)),
  key(k, u, c) {
    const hood = k === 'raise' ? sm(u, 0.1, 0.9) : k === 'shut' ? 1 - sm(u, 0.15, 0.9) : k === 'come' || k === 'pop' ? 0 : 1;
    const n: Record<string, number> = { hood, plug: k === 'plug' ? sm(u, 0.4, 0.7) : c.p('plug', 0, 0.01), bolt: k === 'bolt' ? u : c.p('bolt'), ok: k === 'test' ? sm(u, 0.5, 0.6) : k === 'shut' ? 1 : 0 };
    const lip = G(GA.hoodX + GA.hoodL * Math.cos(hood * GA.hoodA), 0.84 + GA.hoodL * Math.sin(hood * GA.hoodA), 0);
    const box = G(GA.boxAt[0], GA.boxAt[1], 0);
    switch (k) {
      case 'come':
        return { ...easy(c), nod: 0.1, n };
      case 'pop':
        return { ...leftEasy(c), r: G(1.58, 0.72, 0.12), gr: 0.7, palms: 0.8, nod: 0.3, n };
      case 'raise':
      case 'shut':
        return { r: add(lip, 0, 0, 0.26), l: add(lip, 0, 0, -0.26), gr: 0.7, gl: 0.7, palms: 0.9, nod: k === 'raise' ? -0.05 : 0.2, n };
      case 'plug': {
        const socket = add(box, 0.05, 0.08, 0.14 + 0.02 * Math.sin(c.t * 3));
        return { ...leftEasy(c), r: socket, gr: 0.75, palms: 0.5, lean: 0.34, nod: 0.5, crouch: 0.12, n };
      }
      case 'bolt': {
        const i = Math.floor(u * 2.999);
        const bolt = add(box, 0.13, 0.1, -0.14 + i * 0.14);
        return { l: add(box, 0.08, 0.12, 0.16), gl: 0.3, palms: 0.8, lean: 0.34, nod: 0.5, crouch: 0.12, tool: 'driver', n: { ...n, spin: c.t * 11 }, props: { driver: add(bolt, 0, 0.1, 0) } };
      }
      default:
        // Reading the small lamp on the computer come up green.
        return { ...easy(c), nod: 0.36, lean: 0.18, n };
    }
  },
};
const CTRL_STAND: St = st(GA.ctrl[0], GA.ctrl[2] + 0.42);
const UNDER: Script = {
  seq: [['up', 3.0, 1.6], ['look', 4.2, 0.4], ['tug', 2.4, 1.6], ['down', 3.0, 0.8]],
  at: (k) => (k === 'up' || k === 'down' ? CTRL_STAND : st(GA.x + (k === 'look' ? -0.3 : 0.5), GA.z + 0.1, PI)),
  key(k, u, c) {
    const lift = k === 'up' ? sm(u, 0.05, 0.95) : k === 'down' ? 1 - sm(u, 0.05, 0.95) : 1;
    const n: Record<string, number> = { lift, torch: k === 'look' || k === 'tug' ? 1 : 0, tagged: k === 'tug' ? sm(u, 0.5, 0.7) : k === 'down' ? 1 : 0 };
    const press: V = add(GA.ctrl, 0, 0.03 * (k === 'up' ? 1 : -1), 0.06);
    if (k === 'up' || k === 'down') return { ...leftEasy(c), r: press, gr: 0.15, palms: 0.05, nod: -0.06 - 0.15 * (k === 'up' ? u : 1 - u), n };
    if (k === 'look') {
      const torch: V = c.bd(-0.1, 1.42, 0.2 + 0.05 * Math.sin(c.t * 0.9));
      return { ...leftEasy(c), nod: -0.46, tool: 'torch', n, props: { torch } };
    }
    const torch: V = c.bd(-0.14, 1.36, 0.14);
    return { l: c.bd(0.16, 1.62 - 0.04 * Math.abs(Math.sin(c.t * 6)), 0.18), gl: 0.85, palms: -0.9, nod: -0.46, tool: 'torch', n, props: { torch } };
  },
};
const STOOL_Y = 0.3;
const LIDAR_ON: V = G(GA.lidar[0], GA.lidar[1], GA.lidar[2]);
const LIDAR_BENCH: V = add(GA.bench, 0, 0.1, 0);
const LIDAR: Script = {
  seq: [['climb', 0.4, 0.8], ['undo', 2.4, 0.2], ['lift', 1.2, 1.4], ['set', 0.8, 0.2], ['wipe', 3.4, 0.2], ['take', 0.8, 1.4], ['fit', 1.0, 0.2], ['do', 2.4, 0.8]],
  at: (k) => (k === 'climb' || k === 'undo' || k === 'lift' || k === 'fit' || k === 'do' ? st(GA.stool[0], GA.stool[1], PI, STOOL_Y) : st(GA.bench[0] + 0.62, GA.bench[2] + 0.02, -PI / 2)),
  key(k, u, c) {
    const carried: V = c.bd(0, 0.72 * c.H, 0.34);
    const lidar: V = k === 'lift' ? lerpV(LIDAR_ON, carried, sm(u, 0.15, 1)) : k === 'set' ? lerpV(carried, LIDAR_BENCH, sm(u, 0.05, 0.9)) : k === 'wipe' ? LIDAR_BENCH : k === 'take' ? lerpV(LIDAR_BENCH, carried, sm(u, 0.1, 1)) : k === 'fit' ? lerpV(carried, LIDAR_ON, sm(u, 0.05, 0.95)) : LIDAR_ON;
    const n: Record<string, number> = { clean: k === 'wipe' ? u : k === 'take' || k === 'fit' || k === 'do' ? 1 : 0, spinOff: k === 'do' || k === 'climb' ? 0 : 1 };
    const props: Record<string, V | null> = { lidar };
    switch (k) {
      case 'climb':
        return { ...easy(c), nod: -0.1, n, props };
      case 'undo':
      case 'do': {
        const i = Math.floor(u * 1.999);
        const bolt = add(LIDAR_ON, -0.1 + 0.2 * i, -0.06, 0.13);
        return { l: add(LIDAR_ON, -0.02, 0.05, 0.1), gl: 0.6, palms: 0.8, lean: 0.26, nod: 0.24, tool: 'driver', n: { ...n, spin: c.t * 11 }, props: { ...props, driver: add(bolt, 0, 0, 0.11) } };
      }
      case 'lift':
      case 'fit':
      case 'take':
      case 'set':
        return { r: add(lidar, 0.11, 0, 0.02), l: add(lidar, -0.11, 0, 0.02), gr: 0.75, gl: 0.75, palms: 0.9, lean: k === 'lift' || k === 'fit' ? 0.24 : 0.08, nod: 0.2, n, props };
      default: {
        // Facing -x at the bench: its near side is +x.
        const cloth: V = add(LIDAR_BENCH, 0.1, 0.02 + 0.03 * Math.sin(c.t * 2.5), 0.07 * Math.sin(c.t * 7));
        return { l: add(LIDAR_BENCH, 0, 0.11, -0.11), gl: 0.5, palms: 0.8, nod: 0.36, lean: 0.14, tool: 'cloth', n, props: { ...props, cloth } };
      }
    }
  },
};

// =============================================================================================
// 안전 게시판 (sdSafetyBoard, 3 × 1).

export const SB = { z: -0.34, y0: 0.82, y1: 2.08, x0: -1.4, x1: 1.4, stand: 0.82 };
export const onBoard = (u: number, v: number, z = SB.z + 0.02): V => [SB.x0 + (SB.x1 - SB.x0) * u, SB.y0 + (SB.y1 - SB.y0) * v, z];
const BRIEF: Script = {
  seq: [['read', 2.6, 0.8], ['route', 3.4, 0.6], ['turn', 2.8, 0.7], ['sign', 1.8, 0.8]],
  at: (k) => (k === 'read' ? st(0.15, SB.stand) : k === 'route' ? st(-0.9, SB.z + 0.56) : st(-0.45, SB.stand + 0.05, -1.25)),
  key(k, u, c) {
    const tablet = tabletAt(c);
    const n: Record<string, number> = { mate: 1, says: k === 'turn' ? 1 : 0, nods: k === 'sign' ? 1 : 0, ptr: k === 'route' ? u : -1, signed: k === 'sign' ? sm(u, 0.3, 0.6) : 0 };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'read':
        return { ...base, r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3, nod: 0.16 };
      case 'route':
        // A finger following the loop on the map.
        return { ...base, r: onBoard(0.17 + 0.1 * Math.cos(u * PI * 2), 0.52 + 0.14 * Math.sin(u * PI * 2), SB.z + 0.05), gr: 0.2, palms: 0.1, nod: -0.16 };
      case 'turn':
        return { ...base, r: c.bd(-0.26, 0.72 * c.H + 0.04 * Math.sin(c.t * 3), 0.26), gr: 0.15, palms: 0.5, nod: 0 };
      default:
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.28 };
    }
  },
};
const LEAD: Script = {
  seq: [['open', 2.4, 0.8], ['count', 3.2, 0.7], ['ask', 2.8, 0.6], ['decide', 2.6, 0.5], ['close', 1.4, 0.8]],
  at: (k) => (k === 'count' ? st(0.72, SB.z + 0.56) : st(0, SB.stand + 0.08, 0)),
  key(k, u, c) {
    const n: Record<string, number> = { mate: 2, says: k === 'ask' ? 1 : 0, nods: k === 'decide' || k === 'close' ? 1 : 0, ptr: -1, bars: k === 'count' ? 1 : 0, stamp: k === 'decide' ? sm(u, 0.5, 0.7) : k === 'close' ? 1 : 0 };
    switch (k) {
      case 'open':
        return { l: c.bd(0.3, 0.72 * c.H, 0.24), r: c.bd(-0.3, 0.72 * c.H + 0.04 * Math.sin(c.t * 3), 0.24), gl: 0.12, gr: 0.12, palms: 0.5, nod: 0, n };
      case 'count':
        return { ...leftEasy(c), r: onBoard(0.76, 0.42 + 0.1 * Math.sin(c.t * 1.2), SB.z + 0.05), gr: 0.2, palms: 0.1, nod: -0.16, n };
      case 'ask':
        return { ...leftEasy(c), r: c.bd(-0.26, 0.82 * c.H, 0.28), gr: 0.15, palms: 0.5, nod: 0, n };
      case 'decide':
        return { ...both(c.bd(0, 0.74 * c.H, 0.26), 0.14, 0.03 * Math.sin(c.t * 5), 0, 0.2), palms: 0.6, nod: 0.05, n };
      default:
        return { ...easy(c), nod: 0.16 * Math.sin(u * PI), n };
    }
  },
};

const SCRIPTS: Record<SdMotion, Script> = {
  sdRide: RIDE,
  sdScenario: SCENARIO,
  sdEStop: ESTOP,
  sdDummy: DUMMY,
  sdCalib: CALIB,
  sdLog: LOG,
  sdFix: FIX,
  sdLearn: LEARN,
  sdTune: TUNE,
  sdLabel: LABEL,
  sdAudit: AUDIT,
  sdHood: HOOD,
  sdUnder: UNDER,
  sdLidar: LIDAR,
  sdBrief: BRIEF,
  sdLead: LEAD,
};
