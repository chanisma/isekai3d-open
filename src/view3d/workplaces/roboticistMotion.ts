import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 로봇 연구소 (2026-11-01, a new career at the user's request). Each motion is a round of beats: where the dweller is, where
 * the hands go, and what the robots do. The piece reads the same script by the same clock (roboticist.ts), so the arm stops on the
 * very moment a hand breaks the light curtain, and the robot on the simulation wall follows the real one (RL_LIVE).
 *
 * The robots are worked out here too, as pure functions of where they've got to, so a script can stop or rewind them:
 * - armPose: the arm's pick-and-place round (a cycle number, its fraction how far through this part).
 * - quadPose: where the four-legged robot is on the course (a lap number, likewise), its gait following the distance it has covered.
 * - servePose: the serving robot on its taped route.
 *
 * - 로봇 팔 안전 구역 (rlArmCell): rlArmRun a trial run; rlTeach points taught by pendant; rlCurtain a hand through the curtain; rlCycle cycle time.
 * - 사족 보행 시험장 (rlQuadCourse): rlWalk, by remote over ramp and steps; rlLegCheck a hip joint; rlDemoAlarm a demo going wrong.
 * - 조립대 (rlAssemblyBench): rlSolder, rlServo seated; rlLearn with a senior beside.
 * - 충전 도크 (rlChargeDock): rlServe a cone on the route; rlDock the contacts; rlRoute the corner it couldn't get round.
 * - 시뮬레이션 (rlSimulatorStation): rlSim, rlCode seated. 시험 보드 (rlReviewBoard): rlLog, rlLead. 3D 프린터 (rlPrinter): rlPrint.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's
 * right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type RlMotion = 'rlArmRun' | 'rlTeach' | 'rlCurtain' | 'rlCycle' | 'rlWalk' | 'rlLegCheck' | 'rlDemoAlarm' | 'rlSolder' | 'rlServo' | 'rlLearn' | 'rlServe' | 'rlDock' | 'rlRoute' | 'rlSim' | 'rlCode' | 'rlLog' | 'rlLead' | 'rlPrint';
export const RL_MOTIONS = new Set<string>(['rlArmRun', 'rlTeach', 'rlCurtain', 'rlCycle', 'rlWalk', 'rlLegCheck', 'rlDemoAlarm', 'rlSolder', 'rlServo', 'rlLearn', 'rlServe', 'rlDock', 'rlRoute', 'rlSim', 'rlCode', 'rlLog', 'rlLead', 'rlPrint']);
export type RlTool = 'pendant' | 'tablet' | 'remote' | 'iron' | 'driver' | 'gear' | 'probe' | 'cone' | 'marker' | 'bracket';

/** What the real robots are doing now, set by their pieces and drawn on the simulation wall. */
export const RL_LIVE = {
  arm: [0, 0.4, 1.2] as [number, number, number],
  armAt: -1e9,
  grip: 0,
  quadX: 0,
  quadYaw: 0,
  quadPitch: 0,
  quadLegs: [0, 0, 0, 0] as [number, number, number, number],
  quadAt: -1e9,
  faultAt: -1e9,
};

export const frac = (x: number) => ((x % 1) + 1) % 1;
export const rlPhase = (p: THREE.Vector3) => frac(p.x * 0.283 + p.z * 0.619);
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;

// =============================================================================================
// The robots.

/** 로봇 팔 안전 구역 (5 × 3): the arm in the middle of the cage, the conveyor on its left, the pallet on its right, the console outside. */
export const AC = {
  stand: 1.92,
  curtainZ: 1.3,
  curtainX: 0.95,
  hmi: [1.56, 1.32, 1.44] as V,
  start: [1.44, 1.03, 1.47] as V,
  reset: [1.68, 1.03, 1.47] as V,
  hook: [1.18, 1.0, 1.4] as V,
  base: [0, 0.42, -0.35] as V,
  shoulder: 0.2,
  l1: 0.62,
  l2: 0.6,
  /** From the wrist to between the fingertips. */
  wrist: 0.24,
  pick: [-0.82, 0.88, 0.1] as V,
  home: [0.1, 1.22, 0.3] as V,
};
export const placeAt = (i: number): V => {
  const k = ((Math.floor(i) % 6) + 6) % 6;
  return [0.5 + 0.18 * (k % 3), 0.74, -0.04 + 0.22 * Math.floor(k / 3)];
};
/** Over one point and on to the next, easing: the tip of the arm through one part's round. */
export function armPose(c: number): { tip: V; grip: number; carry: boolean; count: number; u: number } {
  const i = Math.floor(c);
  const u = c - i;
  const pick = AC.pick;
  const place = placeAt(i);
  const overPick = add(pick, 0, 0.22, 0);
  const overPlace = add(place, 0, 0.26, 0);
  let tip: V;
  if (u < 0.1) tip = lerpV(AC.home, overPick, sm(u, 0, 0.1));
  else if (u < 0.2) tip = lerpV(overPick, pick, sm(u, 0.1, 0.2));
  else if (u < 0.28) tip = pick;
  else if (u < 0.38) tip = lerpV(pick, overPick, sm(u, 0.28, 0.38));
  else if (u < 0.6) {
    // Up and over in an arc, as the joints would take it.
    const e = sm(u, 0.38, 0.6);
    tip = add(lerpV(overPick, overPlace, e), 0, 0.2 * Math.sin(e * PI), 0.16 * Math.sin(e * PI));
  } else if (u < 0.7) tip = lerpV(overPlace, place, sm(u, 0.6, 0.7));
  else if (u < 0.78) tip = place;
  else if (u < 0.86) tip = lerpV(place, overPlace, sm(u, 0.78, 0.86));
  else tip = lerpV(overPlace, AC.home, sm(u, 0.86, 1));
  const closing = sm(u, 0.2, 0.26);
  const opening = sm(u, 0.72, 0.77);
  return { tip, grip: closing * (1 - opening), carry: u > 0.26 && u < 0.74, count: ((i % 7) + 7) % 7 + (u > 0.74 && ((i % 7) + 7) % 7 < 6 ? 1 : 0), u };
}

/** 사족 보행 시험장 (6 × 3): flat, a ramp up, a plateau, three steps down, flat again; the mat along the back half. */
export const QC = {
  stand: 1.92,
  z: -0.3,
  x0: -2.3,
  x1: 2.3,
  /** The hips from the middle of the body, the legs' two lengths, how high the body rides. */
  hipF: 0.22,
  hipS: 0.13,
  l1: 0.17,
  l2: 0.19,
  ride: 0.29,
  stride: 0.09,
};
export function quadGround(x: number): number {
  if (x < -1.3) return 0;
  if (x < -0.3) return 0.24 * (x + 1.3);
  if (x < 0.4) return 0.24;
  if (x < 0.7) return 0.16;
  if (x < 1.0) return 0.08;
  return 0;
}
export interface QuadPose {
  x: number;
  y: number;
  yaw: number;
  pitch: number;
  /** Each leg's hip and knee (front left, front right, back left, back right). */
  hip: [number, number, number, number];
  knee: [number, number, number, number];
}
/**
 * The whole robot from how far it's got: a lap is over the course, a turn on the spot, back, and another turn. Its feet follow the
 * ground under each one, and its body the ground under its hips. `m` is how much it's stepping (a held robot's feet come down),
 * `sit` how far it's folded down.
 */
export function quadPose(c: number, m = 1, sit = 0): QuadPose {
  const u = frac(c);
  const span = QC.x1 - QC.x0;
  const turnWalk = 0.8;
  const total = span * 2 + turnWalk * 2;
  let x: number;
  let yaw: number;
  let dist: number;
  let stride = 1;
  if (u < 0.4) {
    const e = u / 0.4;
    x = QC.x0 + span * e;
    yaw = 0;
    dist = span * e;
  } else if (u < 0.5) {
    const e = (u - 0.4) / 0.1;
    x = QC.x1;
    yaw = PI * e;
    dist = span + turnWalk * e;
    stride = 0.15;
  } else if (u < 0.9) {
    const e = (u - 0.5) / 0.4;
    x = QC.x1 - span * e;
    yaw = PI;
    dist = span + turnWalk + span * e;
  } else {
    const e = (u - 0.9) / 0.1;
    x = QC.x0;
    yaw = PI + PI * e;
    dist = span * 2 + turnWalk + turnWalk * e;
    stride = 0.15;
  }
  // A whole number of steps to the lap, so the gait joins up: `total` is 30 of them.
  const gait = (dist / total) * 30;
  const cy = Math.cos(yaw);
  const worldX = (F: number) => x + cy * F;
  const gF = quadGround(worldX(QC.hipF));
  const gB = quadGround(worldX(-QC.hipF));
  const pitch = Math.atan2(gF - gB, QC.hipF * 2);
  const y = (gF + gB) / 2 + QC.ride - 0.17 * THREE.MathUtils.clamp(sit, 0, 1);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const hip: QuadPose['hip'] = [0, 0, 0, 0];
  const knee: QuadPose['knee'] = [0, 0, 0, 0];
  const legs: Array<[number, number]> = [[1, 0], [1, 0.5], [-1, 0.5], [-1, 0]];
  legs.forEach(([fb, off], i) => {
    const p = frac(gait + off);
    // On the ground it runs backwards under the body; in the air forwards and up.
    const on = p < 0.5;
    const s = QC.stride * stride * m * (on ? 1 - p * 4 : -1 + (p - 0.5) * 4);
    const lift = on ? 0 : 0.055 * m * Math.sin((p - 0.5) * 2 * PI);
    const hipF = fb * QC.hipF;
    const F = hipF + s;
    const footY = quadGround(worldX(F)) + lift;
    const U = footY - y;
    // Into the body's own frame, then from its hip.
    const f = F * cp + U * sp - hipF;
    const v = -F * sp + U * cp;
    const d = THREE.MathUtils.clamp(Math.hypot(f, v), 0.05, QC.l1 + QC.l2 - 0.004);
    const th = Math.atan2(f, -v);
    const a = Math.acos(THREE.MathUtils.clamp((QC.l1 * QC.l1 + d * d - QC.l2 * QC.l2) / (2 * QC.l1 * d), -1, 1));
    const b = Math.acos(THREE.MathUtils.clamp((QC.l2 * QC.l2 + d * d - QC.l1 * QC.l1) / (2 * QC.l2 * d), -1, 1));
    // The knees bend backwards: the thigh goes back of the line to the foot, the shin forward.
    hip[i] = th - a;
    knee[i] = a + b;
  });
  return { x, y, yaw, pitch, hip, knee };
}

/** 충전 도크 (4 × 3): the dock at the back, a taped loop round a mock table. */
export const CD = {
  stand: 1.92,
  dock: [0, 0, -1.02] as V,
  /** Where it's backed on to the contacts, and where it starts from out on the floor. */
  plugged: [0, 0, -0.72] as V,
  table: [0, 0, 0.38] as V,
  contact: [0.22, 0.26, -0.98] as V,
  go: [0.62, 0.98, 1.42] as V,
  cone: [-1.32, 0, 0.62] as V,
  coneHome: [1.72, 0, 1.28] as V,
};
const ROUTE_POINTS: Array<[number, number]> = [[0, -0.42], [-0.8, -0.5], [-1.38, 0.0], [-1.34, 0.8], [-0.5, 1.0], [0.5, 1.0], [1.34, 0.8], [1.38, 0.0], [0.8, -0.5]];
export const ROUTE = new THREE.CatmullRomCurve3(ROUTE_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.5);
/** Where it pulls up: at the table (front of the loop) and where the cone goes. */
export const ROUTE_TABLE = 0.5;
export const ROUTE_CONE = 0.27;
/** The robot on its route, u round the loop, `home` 1 when it's on the dock. */
export function servePose(u: number, home = 0): { x: number; z: number; yaw: number } {
  const p = ROUTE.getPointAt(frac(u));
  const d = ROUTE.getTangentAt(frac(u));
  const yaw = Math.atan2(d.x, d.z);
  const e = THREE.MathUtils.clamp(home, 0, 1);
  return { x: mixN(p.x, CD.plugged[0], e), z: mixN(p.z, CD.plugged[2], e), yaw: angle(yaw, 0, e) };
}

// =============================================================================================
// The script engine.

type Seq = Array<[string, number, number?]>;
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
}
const st = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
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
  tool?: RlTool;
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
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface RlNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: RlTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number): { st: St; key: Key } {
  const here = s.at(k);
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
export function rlNow(m: RlMotion, t: number, ph: number, H = 1.6): RlNow {
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
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function rlPose(m: RlMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = rlNow(m, t, rlPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Hands easy at the waist. */
const easy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const leftEasy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.08), gl: 0.3 });
const rightEasy = (c: Ctx) => ({ r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
const press = (p: V, u: number, a = 0.3, b = 0.5): Pick<Key, 'r' | 'gr' | 'palms'> => ({ r: add(p, 0, 0, 0.05 - 0.03 * sm(u, a, b)), gr: 0.15, palms: 0.05 });
/** A tablet held in the left arm; the right free to tap on it. */
const tabletAt = (c: Ctx): V => c.bd(0.14, 0.66 * c.H, 0.28);
const tapTablet = (tab: V, c: Ctx): V => add(tab, 0.08 + 0.018 * Math.sin(c.t * 13), 0.05, 0.03);
const pointAt = (p: V): Pick<Key, 'r' | 'gr' | 'palms'> => ({ r: p, gr: 0.15, palms: 0.1 });

// =============================================================================================
// 로봇 팔 안전 구역 (rlArmCell).

const AT_CONSOLE = st(AC.hmi[0], AC.stand);
const hmiPoint: V = add(AC.hmi, 0.02, -0.08, 0.1);
const ARMRUN: Script = {
  seq: [['read', 1.6], ['start', 1.1], ['watch', 7.0, 0.9], ['near', 5.0, 0.9], ['tick', 1.4], ['stop', 1.1, 0.02]],
  at: (k) => (k === 'near' || k === 'tick' ? st(0.72, AC.stand) : AT_CONSOLE),
  key(k, u, c) {
    const tablet = tabletAt(c);
    const n = {
      arm: k === 'watch' ? u : k === 'near' ? 1 + u : k === 'read' || k === 'start' ? 0 : 2,
      tower: k === 'read' ? 1 : k === 'start' ? (u > 0.45 ? 2 : 1) : k === 'stop' ? (u > 0.45 ? 1 : 2) : 2,
      ticked: c.p('tick', 0.3, 0.7),
    };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'read':
        return { ...base, ...pointAt(hmiPoint), nod: 0.14 };
      case 'start':
        return { ...base, ...press(AC.start, u), nod: 0.2 };
      case 'watch':
        // Following the arm from the conveyor to the pallet with the head.
        return { ...base, ...rightEasy(c), nod: 0.06 + 0.1 * Math.sin(u * PI * 2), lean: 0.02 };
      case 'near':
        return { ...base, ...rightEasy(c), nod: 0.26, lean: 0.08 };
      case 'tick':
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.3 };
      default:
        return { ...base, ...press(AC.reset, u), nod: 0.2 };
    }
  },
};
const TEACH: Script = {
  seq: [['take', 1.1, 0.9], ['jog1', 3.2], ['jog2', 3.2], ['save1', 1.2], ['jog3', 3.2], ['jog4', 2.6], ['save2', 1.2], ['home', 1.2], ['play', 5.0], ['ok', 1.0, 0.9], ['hang', 1.0]],
  at: (k) => (k === 'take' || k === 'hang' ? st(1.2, AC.stand) : st(0.2, AC.stand)),
  key(k, u, c) {
    const chest: V = c.bd(0, 0.66 * c.H, 0.3);
    const pendant: V = k === 'take' ? lerpV(AC.hook, chest, sm(u, 0.25, 1)) : k === 'hang' ? lerpV(chest, AC.hook, sm(u, 0, 0.8)) : chest;
    // Jogged in small steps, the way a pendant does: each a little move and a stop.
    const step = (x: number, s = 5) => {
      const f = x * s;
      return (Math.floor(f) + sm(f - Math.floor(f), 0, 0.5)) / s;
    };
    const overPick = add(AC.pick, 0.04, 0.22, 0.03);
    const pick = add(AC.pick, 0, 0, 0);
    const overPlace = add(placeAt(1), 0.04, 0.26, 0.03);
    const place = placeAt(1);
    const tip: V | null = k === 'take' || k === 'hang' || k === 'ok' ? AC.home
      : k === 'jog1' ? lerpV(AC.home, overPick, step(u))
      : k === 'jog2' ? lerpV(overPick, pick, step(u, 4))
      : k === 'save1' ? pick
      : k === 'jog3' ? lerpV(pick, overPlace, step(u))
      : k === 'jog4' ? lerpV(overPlace, place, step(u, 4))
      : k === 'save2' ? place
      : k === 'home' ? lerpV(place, AC.home, sm(u, 0, 1))
      : null;
    const n = {
      arm: k === 'play' ? u : 0,
      tower: k === 'play' ? 2 : 1,
      saved: c.p('save1', 0.3, 0.5) + c.p('save2', 0.3, 0.5),
      jog: k === 'jog1' || k === 'jog2' || k === 'jog3' || k === 'jog4' ? 1 : 0,
      play: k === 'play' ? 1 : 0,
      tg: k === 'play' ? -1 : c.p('save1', 0.3, 0.6) * (1 - c.p('save2', 0.3, 0.6)),
      stick: k === 'jog1' ? -1 : k === 'jog3' ? 1 : 0,
    };
    const onPendant = k !== 'take' && k !== 'hang';
    return { tool: 'pendant', nod: k === 'play' ? 0.06 : k === 'save1' || k === 'save2' ? 0.44 : 0.1 + 0.26 * Math.abs(Math.sin(u * PI * 2)), lean: onPendant ? 0.04 : 0.02, n, props: { pendant, tip } };
  },
};
const CURTAIN: Script = {
  seq: [['run', 2.8, 1.0], ['reach', 0.9], ['cut', 3.2], ['out', 0.8, 1.1], ['read', 1.5], ['reset', 1.3], ['again', 3.4], ['tick', 1.4, 0.02]],
  at: (k) => (k === 'run' || k === 'reach' || k === 'cut' || k === 'out' ? st(0.1, 1.78) : k === 'tick' ? st(0.1, AC.stand) : AT_CONSOLE),
  key(k, u, c) {
    const beam: V = [0.22, 1.08, AC.curtainZ - 0.03];
    const by: V = [0.22, 1.08, AC.curtainZ + 0.2];
    const tablet = tabletAt(c);
    const arm = k === 'run' ? 0.4 * u : k === 'again' ? 0.4 + 0.6 * u : k === 'tick' ? 1 : 0.4;
    const tripped = k === 'cut' || k === 'out' || k === 'read' || (k === 'reset' && u < 0.45);
    const n = { arm, tower: tripped ? 0 : k === 'reset' ? 1 : 2, broke: k === 'cut' ? sm(u, 0, 0.05) : 0, tripped: tripped ? 1 : 0, ticked: c.p('tick', 0.3, 0.7) };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'run':
        return { ...base, ...rightEasy(c), nod: 0.06 };
      case 'reach':
        return { ...base, r: lerpV(c.bd(-0.2, 0.55 * c.H, 0.1), by, u), gr: 0.1, palms: 0.5, nod: 0.08 };
      case 'cut':
        // The palm flat through the beams, the head up to see the arm has stopped.
        return { ...base, r: beam, gr: 0.05, palms: 0.5, nod: -0.02 };
      case 'out':
        return { ...base, r: by, gr: 0.1, palms: 0.5, nod: 0.1 };
      case 'read':
        return { ...base, ...pointAt(hmiPoint), nod: 0.14 };
      case 'reset':
        return { ...base, ...press(AC.reset, u), nod: 0.2 };
      case 'again':
        return { ...base, ...rightEasy(c), nod: 0.06 };
      default:
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.3 };
    }
  },
};
const CYCLE: Script = {
  seq: [['slow', 6.2, 0.8], ['note', 1.6], ['edit', 3.4], ['go', 1.0], ['fast', 4.4], ['ok', 1.4, 0.02]],
  at: () => AT_CONSOLE,
  key(k, u, c) {
    const tablet = tabletAt(c);
    const n = {
      arm: k === 'slow' ? u : k === 'fast' ? 1 + u : k === 'ok' ? 2 : 1,
      tower: k === 'slow' || k === 'fast' ? 2 : 1,
      sec: k === 'slow' ? 7.4 * u : k === 'fast' ? 6.1 * u : 0,
      was: c.p('note', 0, 0.2),
      now: k === 'ok' ? 1 : 0,
      edit: k === 'edit' ? u : k === 'go' || k === 'fast' || k === 'ok' ? 1 : 0,
    };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'slow':
      case 'fast':
        return { ...base, ...pointAt(hmiPoint), nod: 0.04 + 0.08 * Math.sin(u * PI * 3) };
      case 'note':
      case 'edit':
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.32 };
      case 'go':
        return { ...base, ...press(AC.start, u), nod: 0.2 };
      default:
        return { ...base, ...rightEasy(c), nod: 0.12 * Math.sin(u * PI) };
    }
  },
};

// =============================================================================================
// 사족 보행 시험장 (rlQuadCourse).

/** A lap from a beat: the robot's feet come down at the ends, as it stops for a moment. */
const lap = (a: number, b: number, u: number) => ({ q: a + (b - a) * u, qm: sm(u, 0, 0.05) * (1 - sm(u, 0.95, 1)) });
const WALK: Script = {
  seq: [['take', 1.0, 0.7], ['rise', 1.4, 0.8], ['g1', 5.0, 0.7], ['g2', 5.0, 0.7], ['g3', 5.0, 0.7], ['g4', 5.0, 0.7], ['fold', 1.4], ['log', 1.2, 0.02]],
  at: (k) => (k === 'g1' ? st(-1.1, QC.stand) : k === 'g2' ? st(1.2, QC.stand) : k === 'g3' ? st(0.5, QC.stand) : k === 'g4' ? st(-1.3, QC.stand) : st(-2.3, QC.stand)),
  key(k, u, c) {
    const remote: V = c.bd(0, 0.66 * c.H, 0.3);
    const home: V = [-2.46, 0.82, 1.4];
    const place = k === 'take' ? lerpV(home, remote, sm(u, 0.2, 1)) : k === 'log' ? lerpV(remote, home, sm(u, 0, 0.8)) : remote;
    const walk = k === 'g1' ? lap(0, 0.25, u) : k === 'g2' ? lap(0.25, 0.5, u) : k === 'g3' ? lap(0.5, 0.75, u) : k === 'g4' ? lap(0.75, 1, u) : { q: k === 'take' || k === 'rise' ? 0 : 1, qm: 0 };
    const n = { ...walk, qsit: k === 'take' ? 1 : k === 'rise' ? 1 - sm(u, 0.1, 0.9) : k === 'fold' ? sm(u, 0.1, 0.9) : k === 'log' ? 1 : 0, stick: k.startsWith('g') ? 1 : 0, driving: k.startsWith('g') ? 1 : 0 };
    return { tool: 'remote', nod: 0.12 + 0.06 * Math.sin(c.t * 1.4), lean: 0.02, n, props: { remote: place } };
  },
};
/** Where it's folded down for a look at its hip, and the place on it the driver goes. */
const QR_X = -1.84;
const LEGFIX: Script = {
  seq: [['come', 0.4, 1.0], ['open', 2.0], ['screw', 2.8], ['wiggle', 3.0], ['tight', 2.4], ['test', 3.4, 0.9], ['tick', 1.3]],
  at: (k) => (k === 'tick' || k === 'test' ? st(QR_X + 0.3, 1.02) : st(QR_X + 0.1, 0.3)),
  key(k, u, c) {
    const hipAt: V = [QR_X + QC.hipF, 0.19, QC.z + QC.hipS + 0.03];
    const driver: V = k === 'screw' || k === 'tight' ? add(hipAt, 0, 0.0, 0.16) : k === 'open' ? add(hipAt, 0.2, -0.1, 0.34) : add(hipAt, 0.26, -0.15, 0.3);
    const n = { qsit: k === 'test' ? 0.3 - 0.3 * Math.sin(u * PI) : 1, cover: k === 'open' ? sm(u, 0.2, 0.8) : k === 'come' || k === 'test' || k === 'tick' ? 0 : k === 'tight' ? 1 - sm(u, 0.5, 0.95) : 1, spin: k === 'screw' || k === 'tight' ? c.t * 11 : 0, wiggle: k === 'wiggle' ? Math.sin(u * PI * 6) * 0.45 : 0, test: k === 'test' ? Math.sin(u * PI * 4) * 0.35 : 0, ticked: c.p('tick', 0.3, 0.7), parked: 1 };
    const props = { driver };
    const down = { crouch: 0.9, nod: 0.46, lean: 0.2 };
    switch (k) {
      case 'come':
        return { ...easy(c), crouch: 0.9 * u, nod: 0.3, n, props };
      case 'open':
        return { ...down, l: add(hipAt, -0.04, 0.05, 0.06), gl: 0.5, n, props, tool: 'driver' };
      case 'screw':
      case 'tight':
        return { ...down, l: add(hipAt, -0.1, 0.02, 0.04), gl: 0.6, n, props, tool: 'driver' };
      case 'wiggle':
        return { ...down, l: [hipAt[0], 0.15, hipAt[2] + 0.05], gl: 0.8, ...pointAt(add(hipAt, 0.1, 0.02, 0.1)), n, props };
      case 'test':
        return { ...easy(c), nod: 0.3, n, props };
      default: {
        const tablet = tabletAt(c);
        return { r: tapTablet(tablet, c), gr: 0.7, gl: 0.1, nod: 0.3, tool: 'tablet', n, props: { ...props, tablet } };
      }
    }
  },
};
const ALARM: Script = {
  seq: [['show', 3.0, 0.5], ['wrong', 2.2, 0.4], ['stop', 1.0, 1.2], ['kneel', 1.0], ['right', 2.6], ['look', 2.6, 1.1], ['read', 2.4, 0.9], ['again', 5.0], ['ok', 1.6, 0.02]],
  at: (k) => (k === 'kneel' || k === 'right' || k === 'look' ? st(0.16, 0.34) : k === 'read' ? st(0.9, QC.stand) : st(0.1, QC.stand)),
  key(k, u, c) {
    const remote: V = c.bd(0, 0.66 * c.H, 0.3);
    const a = 0.19;
    const body: V = [0.16, 0.38, QC.z];
    // It goes wrong on the plateau: legs thrash, it topples, and it's righted by hand.
    const n = {
      q: k === 'show' ? a + 0.03 * u : k === 'again' ? a + 0.03 + 0.14 * u : k === 'ok' ? a + 0.17 : a + 0.03,
      qm: k === 'show' || k === 'again' ? 1 : 0,
      at0: 1,
      flail: k === 'wrong' ? sm(u, 0, 0.15) : k === 'stop' ? 1 - sm(u, 0.2, 0.4) : 0,
      fall: k === 'stop' ? sm(u, 0.25, 0.8) : k === 'kneel' ? 1 : k === 'right' ? 1 - sm(u, 0.15, 0.85) : 0,
      qsit: k === 'stop' || k === 'kneel' || k === 'right' || k === 'look' ? 1 : k === 'read' ? 1 : 0,
      alarm: k === 'wrong' || k === 'stop' || k === 'kneel' || k === 'right' ? 1 : 0,
      guests: 1,
      gasp: k === 'wrong' || k === 'stop' ? 1 : 0,
      clap: k === 'ok' || (k === 'again' && u > 0.7) ? 1 : 0,
      ok: k === 'ok' ? 1 : 0,
      log: k === 'look' ? u : k === 'read' ? 1 : 0,
    };
    const props = { remote };
    switch (k) {
      case 'show':
      case 'again':
        return { tool: 'remote', nod: 0.12, lean: 0.02, n, props };
      case 'wrong':
        return { tool: 'remote', nod: 0.1, lean: 0.08, n, props };
      case 'stop':
        return { tool: 'remote', nod: 0.34, lean: 0.03, n, props };
      case 'kneel':
        return { crouch: 0.85 * u, nod: 0.4, lean: 0.1, ...easy(c), n };
      case 'right': {
        const lift = sm(u, 0.15, 0.85);
        return { crouch: 0.85 - 0.25 * lift, nod: 0.36, lean: 0.14, r: add(body, 0.12, 0.05 + 0.04 * lift, 0.1), l: add(body, -0.12, 0.05 + 0.04 * lift, 0.1), gr: 0.75, gl: 0.75, n };
      }
      case 'look':
        return { crouch: 0.6, nod: 0.36, lean: 0.1, r: add(body, 0.1, 0.1, 0.08), l: add(body, -0.1, 0.1, 0.08), gr: 0.2, gl: 0.2, palms: 0.1, n };
      case 'read':
        return { ...typing([0.9, 0.86, 1.5], c.t), nod: 0.34, lean: 0.06, n };
      default:
        return { tool: 'remote', nod: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 조립대 (rlAssemblyBench, 3 × 1): the board in its clamp on the left, the servo vice on the right, a scope behind.

export const AB = {
  seat: [0, 0.47, 0.84] as V,
  top: 0.78,
  board: [-0.34, 0.86, 0.24] as V,
  joints: [[-0.08, 0.04], [-0.03, 0.04], [0.02, 0.04], [0.07, 0.04], [-0.08, -0.03], [0.07, -0.03]] as Array<[number, number]>,
  ironHome: [0.06, 0.9, 0.34] as V,
  spool: [-0.72, 0.84, 0.3] as V,
  sw: [0.62, 0.82, 0.36] as V,
  vice: [0.34, 0.88, 0.22] as V,
  gears: [0.6, 0.8, 0.2] as V,
  driverHome: [0.74, 0.82, 0.3] as V,
};
/** The iron's tip is 0.16 along it, tipped down 0.8; the grip at its origin. */
const ironOver = (j: V): V => add(j, 0, 0.115, 0.111);
export const jointAt = (i: number): V => {
  const J = AB.joints[((Math.floor(i) % 6) + 6) % 6];
  return [AB.board[0] + J[0], AB.board[1] + 0.014, AB.board[2] + J[1]];
};
function solderBeats(k: string, u: number, c: Ctx, senior = 0, total = 6): Key {
  const seq = ['j0', 'j1', 'j2', 'j3', 'j4', 'j5'];
  const i = seq.indexOf(k);
  const iron: V = k === 'take' ? lerpV(AB.ironHome, ironOver(jointAt(0)), sm(u, 0.2, 1)) : i >= 0 ? add(ironOver(jointAt(i)), 0, 0.012 * (1 - sm(u, 0.05, 0.25)) + 0.012 * sm(u, 0.75, 1), 0) : k === 'stow' ? lerpV(ironOver(jointAt(total - 1)), AB.ironHome, sm(u, 0, 0.9)) : AB.ironHome;
  let done = 0;
  for (let j = 0; j < total; j++) done += c.p(seq[j], 0.65, 0.75);
  const heat = i >= 0 ? sm(u, 0.15, 0.3) * (1 - sm(u, 0.75, 0.85)) : 0;
  const n = { done, heat, at: i, power: k === 'test' ? sm(u, 0.3, 0.45) : 0, senior };
  const wireTo: V = i >= 0 ? add(jointAt(i), -0.1, 0.05, 0.06) : add(AB.board, -0.2, 0.05, 0.18);
  const props = { iron, wire: wireTo };
  if (i >= 0 || k === 'take') return { tool: 'iron', l: wireTo, gl: 0.75, nod: 0.36, lean: 0.12, n, props };
  if (k === 'stow') return { tool: 'iron', l: wireTo, gl: 0.75, nod: 0.2, n, props };
  if (k === 'test') return { ...press(AB.sw, u), l: add(AB.board, -0.2, -0.02, 0.2), gl: 0.3, nod: 0.2, n, props: { ...props, wire: null } };
  return { r: add(AB.board, 0.16, -0.02, 0.22), l: add(AB.board, -0.2, -0.02, 0.22), gr: 0.3, gl: 0.3, palms: 0.05, nod: 0.26, n, props: { ...props, wire: null } };
}
const SOLDER: Script = {
  seq: [['look', 1.2], ['take', 1.0], ['j0', 1.5, 0.3], ['j1', 1.5, 0.3], ['j2', 1.5, 0.3], ['j3', 1.5, 0.3], ['j4', 1.5, 0.3], ['j5', 1.5, 0.4], ['stow', 0.8], ['test', 2.0]],
  at: () => sat(AB.seat),
  key: (k, u, c) => solderBeats(k, u, c),
};
const LEARN: Script = {
  seq: [['watch', 3.2], ['point', 2.4], ['take', 1.0], ['j0', 1.9, 0.3], ['j1', 1.9, 0.3], ['j2', 1.9, 0.3], ['stow', 0.8], ['look', 2.0], ['praise', 1.4]],
  at: () => sat(AB.seat),
  key(k, u, c) {
    if (k === 'watch' || k === 'point' || k === 'praise') {
      const hands = { r: add(AB.board, 0.16, -0.02, 0.22), l: add(AB.board, -0.2, -0.02, 0.22), gr: 0.3, gl: 0.3, palms: 0.05 };
      return { ...hands, nod: k === 'praise' ? 0.2 * Math.sin(u * PI * 2) : 0.3, n: { senior: 1, teach: k === 'watch' ? 1 : k === 'point' ? 2 : 0, nods: k === 'praise' ? 1 : 0, done: k === 'watch' ? 0 : k === 'point' ? 0 : 3 }, props: {} };
    }
    const K = solderBeats(k, u, c, 1, 3);
    const m: Record<string, number> = { ...K.n, teach: 0, nods: k === 'look' ? 1 : 0 };
    return { ...K, n: m };
  },
};
const SERVO: Script = {
  seq: [['take', 1.0], ['gear', 1.3], ['gear2', 1.4], ['lid', 1.2, 0.3], ['screw1', 2.0, 0.3], ['screw2', 2.0, 0.3], ['stowD', 0.8], ['test', 3.6], ['ok', 1.2]],
  at: () => sat(AB.seat),
  key(k, u, c) {
    const v = AB.vice;
    const open: V = add(v, 0, 0.09, 0);
    const gear: V = k === 'take' ? lerpV(AB.gears, open, sm(u, 0.3, 1)) : k === 'gear' ? lerpV(open, add(v, 0, 0.044, 0), sm(u, 0.1, 0.8)) : k === 'gear2' ? (u < 0.3 ? lerpV(AB.gears, open, sm(u, 0, 0.3)) : lerpV(open, add(v, 0.03, 0.044, 0), sm(u, 0.4, 0.9))) : AB.gears;
    const scr = (sx: number): V => add(v, sx * 0.05, 0.06, 0.22);
    const driver: V = k === 'screw1' ? scr(1) : k === 'screw2' ? scr(-1) : k === 'stowD' ? lerpV(scr(-1), AB.driverHome, sm(u, 0, 0.9)) : AB.driverHome;
    const n = { gears: c.p('gear', 0.7, 0.8) + c.p('gear2', 0.8, 0.9), lid: k === 'lid' ? sm(u, 0.1, 0.8) : c.p('lid', 0, 1), spin: k === 'screw1' || k === 'screw2' ? c.t * 11 : 0, horn: k === 'test' ? Math.sin(u * PI * 4) * 1.3 : 0, power: k === 'test' || k === 'ok' ? 1 : 0, working: 1 };
    const props = { gear, driver };
    switch (k) {
      case 'take':
      case 'gear':
      case 'gear2':
        return { tool: 'gear', l: add(v, -0.14, -0.04, 0.12), gl: 0.5, nod: 0.36, lean: 0.12, n, props };
      case 'lid':
        return { r: add(v, 0, 0.09 - 0.03 * sm(u, 0.1, 0.8), 0.02), gr: 0.5, l: add(v, -0.14, -0.04, 0.12), gl: 0.5, nod: 0.36, lean: 0.12, n, props };
      case 'screw1':
      case 'screw2':
        return { tool: 'driver', l: add(v, -0.14, -0.04, 0.12), gl: 0.5, nod: 0.32, lean: 0.1, n, props };
      case 'stowD':
        return { tool: 'driver', l: add(v, -0.14, -0.04, 0.12), gl: 0.5, nod: 0.2, n, props };
      case 'test':
        return { ...press(AB.sw, Math.min(u * 6, 1)), l: add(v, -0.14, -0.04, 0.12), gl: 0.3, nod: 0.3, n, props };
      default:
        return { r: add(AB.sw, 0, 0.03, 0.04), gr: 0.3, l: add(v, -0.14, -0.04, 0.12), gl: 0.3, palms: 0.05, nod: 0.12 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 충전 도크 (rlChargeDock).

const SERVE: Script = {
  seq: [['go', 1.3, 0.8], ['run1', 4.0, 1.0], ['cone', 1.3, 0], ['halt', 2.6], ['clear', 1.3, 1.0], ['run2', 3.4, 0.5], ['table', 2.6], ['run3', 4.2, 0.8], ['tick', 1.2]],
  at: (k) => (k === 'go' ? st(CD.go[0], CD.stand - 0.1) : k === 'run1' || k === 'tick' ? st(-0.2, CD.stand) : k === 'cone' || k === 'halt' || k === 'clear' ? st(CD.cone[0] - 0.14, CD.cone[2] + 0.38) : st(-0.1, CD.stand)),
  key(k, u, c) {
    const r = k === 'run1' ? ROUTE_CONE * 0.86 * u : k === 'cone' ? ROUTE_CONE * 0.86 : k === 'halt' ? ROUTE_CONE * (0.86 + 0.1 * sm(u, 0, 0.3)) : k === 'clear' ? ROUTE_CONE * 0.96 : k === 'run2' ? mixN(ROUTE_CONE * 0.96, ROUTE_TABLE, sm(u, 0, 1)) : k === 'table' ? ROUTE_TABLE : k === 'run3' ? mixN(ROUTE_TABLE, 1, u) : 0;
    const hand: V = c.bd(-0.16, 0.5, 0.22);
    const conePlace: V = add(CD.cone, 0, 0.31, 0);
    const held: V = k === 'cone' ? lerpV(hand, conePlace, sm(u, 0.15, 0.55)) : k === 'clear' ? lerpV(conePlace, hand, sm(u, 0.45, 0.85)) : conePlace;
    const n = {
      serve: r,
      home: k === 'go' ? 1 - sm(u, 0.4, 1) : k === 'tick' ? 1 : k === 'run3' ? sm(u, 0.88, 1) : 0,
      coneOn: k === 'halt' || (k === 'cone' && u > 0.8) || (k === 'clear' && u < 0.3) ? 1 : 0,
      face: k === 'halt' ? 1 : k === 'table' ? 2 : 0,
      moving: k === 'run1' || k === 'run2' || k === 'run3' ? 1 : 0,
      tray: k === 'table' ? sm(u, 0.1, 0.4) : 0,
      working: 1,
      ticked: c.p('tick', 0.3, 0.7),
    };
    const tablet = tabletAt(c);
    switch (k) {
      case 'go':
        return { ...press(CD.go, u), ...leftEasy(c), nod: 0.2, n, props: {} };
      case 'cone':
        // Down with it, set on the tape, the hand off it before standing again.
        return { ...(u < 0.8 ? { tool: 'cone' as const } : rightEasy(c)), crouch: 0.85 * sm(u, 0, 0.4) * (1 - sm(u, 0.8, 1)), nod: 0.4, lean: 0.14, ...leftEasy(c), n, props: { cone: held } };
      case 'clear':
        return { ...(u >= 0.3 ? { tool: 'cone' as const } : rightEasy(c)), crouch: 0.85 * sm(u, 0, 0.3) * (1 - sm(u, 0.55, 1)), nod: 0.4, lean: 0.14, ...leftEasy(c), n, props: { cone: held } };
      case 'halt':
        return { ...easy(c), nod: 0.2, lean: 0.04, n, props: {} };
      case 'tick':
        return { tool: 'tablet', r: tapTablet(tablet, c), gr: 0.7, gl: 0.1, nod: 0.3, n, props: { tablet } };
      default:
        return { tool: 'tablet', ...rightEasy(c), gl: 0.1, nod: 0.08, n, props: { tablet } };
    }
  },
};
const DOCK: Script = {
  seq: [['back', 2.4, 0.9], ['kneel', 0.9], ['wipe', 2.2], ['probe', 2.8], ['seat', 2.8, 0.8], ['read', 1.8, 0.8], ['tick', 1.1]],
  at: (k) => (k === 'read' || k === 'tick' ? st(CD.go[0], CD.stand - 0.1) : st(CD.contact[0] + 0.12, -0.34)),
  key(k, u, c) {
    const lead = k === 'probe';
    const contact = CD.contact;
    const probe: V = lead ? add(contact, 0.01 * Math.sin(c.t * 5), 0.0, 0.14) : add(contact, 0.3, -0.16, 0.36);
    const n = {
      serve: k === 'back' ? 0.96 + 0.04 * u : 1,
      home: k === 'back' ? 0.5 * u : k === 'seat' ? 0.5 + 0.5 * sm(u, 0.1, 0.8) : k === 'read' || k === 'tick' ? 1 : 0.5,
      volts: k === 'probe' ? 24.1 * sm(u, 0.15, 0.3) : k === 'seat' || k === 'read' || k === 'tick' ? 24.1 : 0,
      glint: k === 'wipe' ? 1 : 0,
      charging: k === 'seat' ? sm(u, 0.75, 0.9) : k === 'read' || k === 'tick' ? 1 : 0,
      working: 1,
      ticked: c.p('tick', 0.3, 0.7),
    };
    const down = { crouch: 0.9, nod: 0.46, lean: 0.18 };
    const props = { probe };
    switch (k) {
      case 'back':
        return { ...easy(c), nod: 0.14, n, props };
      case 'kneel':
        return { ...easy(c), crouch: 0.9 * u, nod: 0.36, n, props };
      case 'wipe':
        return { ...down, r: add(contact, 0.03 * Math.sin(c.t * 8), 0.0, 0.09), gr: 0.5, ...leftEasy(c), n, props };
      case 'probe':
        return { ...down, tool: 'probe', ...leftEasy(c), n, props };
      case 'seat':
        return { crouch: 0.9 * (1 - sm(u, 0, 0.4)), nod: 0.26, ...easy(c), n, props };
      case 'read':
        return { ...pointAt(add(CD.go, -0.1, 0.16, 0.12)), ...leftEasy(c), nod: 0.2, n, props };
      default: {
        const tablet = tabletAt(c);
        return { tool: 'tablet', r: tapTablet(tablet, c), gr: 0.7, gl: 0.1, nod: 0.3, n, props: { ...props, tablet } };
      }
    }
  },
};
const ROUTEFIX: Script = {
  seq: [['try', 5.0, 0.5], ['stuck', 2.2, 0.9], ['edit', 3.8, 0.9], ['send', 1.2], ['round', 6.0, 0.8], ['tick', 1.2]],
  at: () => st(-0.3, CD.stand),
  key(k, u, c) {
    const tablet = tabletAt(c);
    const stuckAt = 0.62;
    const n = {
      serve: k === 'try' ? mixN(0, stuckAt, u) : k === 'stuck' || k === 'edit' ? stuckAt : k === 'send' ? stuckAt - 0.06 * u : k === 'round' ? mixN(stuckAt - 0.06, 1, u) : 0,
      home: k === 'round' ? sm(u, 0.9, 1) : k === 'tick' ? 1 : 0,
      face: k === 'stuck' || k === 'edit' ? 1 : 0,
      wobble: k === 'stuck' ? 1 : 0,
      edit: k === 'edit' ? u : k === 'send' || k === 'round' || k === 'tick' ? 1 : 0,
      moving: k === 'try' || k === 'round' ? 1 : 0,
      working: 1,
      ticked: c.p('tick', 0.3, 0.7),
    };
    const base = { tool: 'tablet' as const, gl: 0.1, n, props: { tablet } };
    switch (k) {
      case 'edit':
      case 'send':
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.34 };
      case 'tick':
        return { ...base, r: tapTablet(tablet, c), gr: 0.7, nod: 0.3 };
      default:
        return { ...base, ...rightEasy(c), nod: 0.1 + 0.05 * Math.sin(c.t * 1.2) };
    }
  },
};

// =============================================================================================
// 시뮬레이션 (rlSimulatorStation, 4 × 2), 시험 보드 (rlReviewBoard, 3 × 1), 3D 프린터 (rlPrinter, 1 × 1).

export const SS = { seat: [0, 0.47, 1.06] as V, top: 0.76, keys: [0, 0.79, 0.52] as V, mouse: [0.28, 0.79, 0.52] as V, wallZ: -0.72, wallY0: 0.86, wallY1: 2.18, wallW: 3.5 };
const deskHands = (): Key => ({ l: add(SS.keys, -0.1, 0.03, 0), r: add(SS.mouse, 0, 0.03, 0), gl: 0.25, gr: 0.45, palms: 0.05 });
const DWELLER: Script = {
  seq: [['watch', 3.6], ['drift', 3.2], ['type', 3.0], ['run', 3.6], ['ok', 1.6]],
  at: () => sat(SS.seat),
  key(k, u, c) {
    const n = { off: k === 'watch' ? 1 : k === 'drift' ? 1 : k === 'type' ? 1 - 0.4 * u : k === 'run' ? 0.6 * (1 - sm(u, 0.1, 0.9)) : 0, focus: k === 'drift' ? 1 : 0, typed: k === 'type' ? u : c.p('type', 0, 1), ok: k === 'ok' ? 1 : 0, mode: 0, working: 1 };
    switch (k) {
      case 'type':
        return { ...typing(SS.keys, c.t), nod: 0.14, n };
      case 'drift':
        return { ...deskHands(), nod: -0.2, lean: 0.12, n };
      case 'ok':
        return { ...deskHands(), nod: -0.12 + 0.12 * Math.sin(u * PI), n };
      default:
        return { ...deskHands(), nod: -0.18, n };
    }
  },
};
const CODE: Script = {
  seq: [['read', 2.4], ['type', 4.4], ['build', 2.2], ['type2', 2.6], ['run', 3.0]],
  at: () => sat(SS.seat),
  key(k, u, c) {
    const n = { off: k === 'run' ? 0.3 * (1 - u) : 0.5, typed: k === 'type' ? u * 0.6 : k === 'type2' ? 0.6 + 0.4 * u : k === 'read' ? 0 : k === 'build' ? 0.6 : 1, build: k === 'build' ? u : 0, mode: 1, ok: k === 'run' && u > 0.8 ? 1 : 0, working: 1 };
    switch (k) {
      case 'type':
      case 'type2':
        return { ...typing(SS.keys, c.t), nod: 0.14, n };
      case 'run':
        return { ...deskHands(), nod: -0.18, n };
      default:
        return { ...deskHands(), nod: 0.1, n };
    }
  },
};

export const BR = { stand: 0.12, home: [-0.3, 0.74, -0.26] as V, z: -0.36, x0: -1.32, x1: 1.32, y0: 0.72, y1: 1.92 };
/** A point on the board: u across, v up. */
export const onBoard = (u: number, v: number, z = BR.z + 0.02): V => [BR.x0 + (BR.x1 - BR.x0) * u, BR.y0 + (BR.y1 - BR.y0) * v, z];
const penAt = (p: V): V => add(p, 0, 0, 0.085);
const LOG: Script = {
  seq: [['read', 1.8], ['take', 0.7], ['w0', 2.0, 0.3], ['w1', 2.0, 0.3], ['w2', 2.0, 0.3], ['tick', 1.2], ['back', 0.8]],
  at: (k) => (k === 'read' || k === 'take' || k === 'back' ? st(-0.5, BR.stand) : st(-0.18, BR.stand)),
  key(k, u, c) {
    const home = BR.home;
    const row = k === 'w0' ? 0 : k === 'w1' ? 1 : k === 'w2' ? 2 : -1;
    const write = (i: number, f: number): V => penAt(onBoard(0.32 + 0.3 * f, 0.62 - i * 0.17 + 0.006 * Math.sin(c.t * 18)));
    const marker: V = row >= 0 ? write(row, u) : k === 'tick' ? penAt(onBoard(0.67 + 0.02 * Math.sin(u * PI), 0.28 + 0.02 * u)) : k === 'take' ? lerpV(home, write(0, 0), sm(u, 0.2, 1)) : k === 'back' ? lerpV(write(2, 1), home, sm(u, 0, 0.9)) : home;
    const n = { w0: c.p('w0', 0, 1), w1: c.p('w1', 0, 1), w2: c.p('w2', 0, 1), tick: c.p('tick', 0.3, 0.8) };
    const props = { marker };
    if (k === 'read') return { ...pointAt(penAt(onBoard(0.3, 0.72))), ...leftEasy(c), nod: -0.12, n, props };
    if (k === 'back') return { tool: 'marker', ...leftEasy(c), nod: -0.02, n, props };
    return { tool: 'marker', ...leftEasy(c), nod: -0.08, n, props };
  },
};
const LEAD: Script = {
  seq: [['open', 2.4, 0.8], ['show', 3.4, 0.7], ['ask', 2.8, 0.7], ['mark', 2.4, 0.7], ['decide', 2.4], ['close', 1.2]],
  at: (k) => (k === 'open' || k === 'ask' || k === 'decide' || k === 'close' ? st(0.05, BR.stand + 0.1, 0) : st(0.05, BR.stand)),
  key(k, u, c) {
    const home = BR.home;
    const marker: V = k === 'mark' ? penAt(onBoard(0.56 + 0.1 * u, 0.3 + 0.03 * Math.sin(u * PI))) : home;
    const n = { says: k === 'ask' ? 1 : 0, nods: k === 'decide' || k === 'close' ? 1 : 0, mates: 2, w0: 1, w1: 1, w2: 1, tick: c.p('mark', 0.3, 0.8) };
    const props = { marker };
    const talking = 0.04 * Math.sin(c.t * 3);
    switch (k) {
      case 'open':
        return { l: c.bd(0.3, 0.72 * c.H, 0.24), r: c.bd(-0.3, 0.72 * c.H + talking, 0.24), gl: 0.12, gr: 0.12, palms: 0.5, nod: 0, n, props };
      case 'show':
        return { ...leftEasy(c), ...pointAt(add(onBoard(0.42 + 0.22 * u, 0.5), 0, 0, 0.1)), nod: -0.14, n, props };
      case 'ask':
        return { ...leftEasy(c), r: c.bd(-0.26, 0.82 * c.H, 0.28), gr: 0.15, palms: 0.5, nod: 0, n, props };
      case 'mark':
        return { tool: 'marker', ...leftEasy(c), nod: -0.06, n, props };
      case 'decide':
        return { l: c.bd(0.14, 0.74 * c.H, 0.26), r: c.bd(-0.14, 0.74 * c.H + 0.03 * Math.sin(c.t * 5), 0.26), gl: 0.2, gr: 0.2, palms: 0.6, nod: 0.05, n, props };
      default:
        return { ...easy(c), nod: 0.16 * Math.sin(u * PI), n, props };
    }
  },
};

export const PR = { stand: 0.62, bed: [0, 0.98, 0.04] as V, panel: [0.3, 0.86, 0.34] as V, tray: [-0.28, 0.82, 0.36] as V };
const PRINT: Script = {
  seq: [['load', 1.4], ['start', 1.1], ['watch', 5.0], ['open', 1.1], ['take', 1.0], ['look', 2.2], ['set', 1.1]],
  at: () => st(0.02, PR.stand),
  key(k, u, c) {
    const onBed: V = add(PR.bed, 0, 0.03, 0);
    const eye: V = c.bd(-0.08, 0.72 * c.H, 0.24);
    const bracket: V = k === 'take' ? lerpV(onBed, eye, sm(u, 0.25, 1)) : k === 'look' ? add(eye, 0.015 * Math.sin(c.t * 2), 0.01 * Math.sin(c.t * 1.3), 0) : k === 'set' ? lerpV(eye, PR.tray, sm(u, 0, 0.9)) : onBed;
    const n = { h: k === 'load' || k === 'start' ? 0 : k === 'watch' ? u : 1, door: k === 'open' ? sm(u, 0.2, 0.9) : k === 'take' || k === 'look' || k === 'set' ? 1 : 0, heads: k === 'watch' ? 1 : 0, printing: 1, inTray: k === 'set' ? sm(u, 0.85, 0.95) : 0, carried: k === 'take' || k === 'look' || k === 'set' ? 1 : 0, lit: k === 'watch' ? 2 : k === 'start' && u > 0.45 ? 2 : 1 };
    const props = { bracket };
    switch (k) {
      case 'load':
        return { ...pointAt(add(PR.panel, 0, 0.02, 0.1)), ...leftEasy(c), nod: 0.24, n, props };
      case 'start':
        return { ...press(PR.panel, u), ...leftEasy(c), nod: 0.24, n, props };
      case 'watch':
        return { ...easy(c), nod: 0.26 + 0.04 * Math.sin(c.t), lean: 0.08, n, props };
      case 'open':
        return { ...leftEasy(c), r: [0.24, 1.02 + 0.28 * sm(u, 0.2, 0.9), 0.36 + 0.02], gr: 0.6, nod: 0.2, n, props };
      case 'take':
      case 'look':
      case 'set':
        return { tool: 'bracket', ...leftEasy(c), nod: k === 'look' ? 0.2 + 0.1 * Math.sin(u * PI * 2) : 0.24, n, props };
      default:
        return { ...easy(c), n, props };
    }
  },
};

const SCRIPTS: Record<RlMotion, Script> = {
  rlArmRun: ARMRUN,
  rlTeach: TEACH,
  rlCurtain: CURTAIN,
  rlCycle: CYCLE,
  rlWalk: WALK,
  rlLegCheck: LEGFIX,
  rlDemoAlarm: ALARM,
  rlSolder: SOLDER,
  rlServo: SERVO,
  rlLearn: LEARN,
  rlServe: SERVE,
  rlDock: DOCK,
  rlRoute: ROUTEFIX,
  rlSim: DWELLER,
  rlCode: CODE,
  rlLog: LOG,
  rlLead: LEAD,
  rlPrint: PRINT,
};
