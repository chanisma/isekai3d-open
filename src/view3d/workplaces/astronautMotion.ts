import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 우주 센터, under the made-up agency 하늘마루 우주기구 and its made-up mission 별마루 7호 (2026-11-01). Each motion is a round
 * of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by the same clock (astronaut.ts), so the
 * polls turn to GO under the fingers, the canopy goes up as it's tied, the crystal grows in its well and the arm follows the sticks.
 *
 * - 관제 콘솔 (missionConsole): asMonitor keys, trackball, the go/no-go poll ticked through, a word on the loop. asComms the loop key held, a reply heard,
 *   the read-back logged. asAnomaly stood up to a red console: the binder, the guard flipped, the switch, typed, cleared. asBriefing stood beside it, turned to the room.
 * - 훈련용 우주복 (spacesuitDisplay): asSuitCheck pressure gauge on the chest port, wrist rings pressed, the front gone over, the sheet ticked.
 * - 우주복 피팅 랙 (asSuitRack): asFitSuit the upper torso taped across, its sizing ring turned, a glove pressed, noted. asCarryHelmet a helmet off the shelf, carried in both hands to the peg, its visor cleaned, carried back.
 * - 저중력 훈련 장치 (asLowGravRig): asLowWalk clipped in to the offload cable, long bounding steps down the mat and back. asLowSample the same with long tongs, a rock lifted into the box.
 * - 로봇팔 훈련기 (asArmTrainer): asArmCapture both sticks, the arm closing on a drifting module, caught. asArmBerth the module caught and taken to its port.
 * - 과학 글러브박스 (asGlovebox): asGloveCrystal arms in the ports, a pipette, drops into the wells, the plate sealed. asGloveFluid a film drawn on a wire loop, a drop fed into it.
 * - 생존 훈련 코너 (asSurvivalCorner): asShelter a parachute canopy spread, its pole raised, the line tied, a stake driven. asSignal a beacon's aerial up, the radio, a mirror flashed, a fire struck.
 * - 언론·견학 벽 (asPressWall): asPress at the lectern, a reporter across it, the model rocket shown. asCards a child's question card answered and pinned up.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's
 * right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type AsMotion = 'asMonitor' | 'asComms' | 'asAnomaly' | 'asBriefing' | 'asSuitCheck' | 'asFitSuit' | 'asCarryHelmet' | 'asLowWalk' | 'asLowSample' | 'asArmCapture' | 'asArmBerth' | 'asGloveCrystal' | 'asGloveFluid' | 'asShelter' | 'asSignal' | 'asPress' | 'asCards';
export const AS_MOTIONS = new Set<string>(['asMonitor', 'asComms', 'asAnomaly', 'asBriefing', 'asSuitCheck', 'asFitSuit', 'asCarryHelmet', 'asLowWalk', 'asLowSample', 'asArmCapture', 'asArmBerth', 'asGloveCrystal', 'asGloveFluid', 'asShelter', 'asSignal', 'asPress', 'asCards']);
export type AsTool = 'pen' | 'clip' | 'gauge' | 'tape' | 'spanner' | 'helmet' | 'cloth' | 'tongs' | 'pipette' | 'mallet' | 'radio' | 'mirror' | 'striker' | 'rocket' | 'card';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const asPhase = (p: THREE.Vector3) => frac(p.x * 0.379 + p.z * 0.613);
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
export const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
export const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------
// The script engine.

type Seq = Array<[string, number, number?]>;
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
  crouch?: number;
  /** Striding on the spot's own path through this beat. */
  bound?: boolean;
}
const st = (x: number, z: number, yaw = PI, y = 0, crouch = 0): St => ({ x, y, z, yaw, crouch });
const sat = (s: V, yaw = PI): St => ({ x: s[0], y: s[1], z: s[2], yaw, sit: true });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  tap?: boolean;
  tool?: AsTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  round: number;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string, u: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface AsNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: AsTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number): { st: St; key: Key } {
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
    round,
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function asNow(m: AsMotion, t: number, ph: number, H = 1.6): AsNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.n) : A;
  const e = b.e;
  const nearer = e < 0.5 ? A.st : B.st;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: nearer.sit, crouch: mixN(A.st.crouch ?? 0, B.st.crouch ?? 0, e), bound: nearer.bound };
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
  return { b, st: here, walking: !here.sit && (!!here.bound || (e > 0 && e < 1 && dist > 0.12)), key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function asPose(m: AsMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = asNow(m, t, asPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw, pace: s.bound ? 0.8 : undefined } : { kind: 'stand', at, yaw, crouch: s.crouch };
  return {
    pose,
    doing: {
      crouch: s.crouch || undefined,
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
    },
  };
}
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });

/** How far a pen's grip stands from its point. */
export const PEN_UP = 0.075;
/** The way a pen's or pipette's point goes from the hand (the dweller facing -z). */
export const PEN_DIR: V = [-0.13, -0.92, -0.37];
const penGrip = (tip: V): V => [tip[0] - PEN_DIR[0] * PEN_UP, tip[1] - PEN_DIR[1] * PEN_UP, tip[2] - PEN_DIR[2] * PEN_UP];

// =============================================================================================
// 관제 콘솔 (missionConsole, 2 × 1): a long desk, a tier of three screens behind, a slope of switches behind the keyboard.

export const MC = {
  top: 0.74,
  seat: [0, 0.47, 0.64] as V,
  stand: 0.5,
  kbL: [-0.1, 0.77, 0.16] as V,
  kbR: [0.1, 0.77, 0.16] as V,
  ball: [0.33, 0.775, 0.19] as V,
  ptt: [-0.32, 0.785, 0.2] as V,
  poll: [-0.04, 0.84, 0.03] as V,
  guard: [0.24, 0.85, 0.05] as V,
  reset: [-0.2, 0.85, 0.05] as V,
  binder: [-0.6, 0.79, 0.14] as V,
  log: [0.46, 0.75, 0.24] as V,
};
const typing = (c: Ctx, s = 1): { l: V; r: V } => ({ l: add(MC.kbL, 0.012 * Math.sin(c.t * 9 * s), 0, 0), r: add(MC.kbR, 0.012 * Math.sin(c.t * 11 * s + 1), 0, 0) });
const MONITOR: Script = {
  seq: [['watch', 3], ['type', 2.6], ['ball', 2.4], ['poll', 4.4], ['loop', 2.2]],
  at: () => sat(MC.seat),
  key(k, u, c) {
    const n = { poll: c.p('poll') * 6, loop: k === 'loop' ? 1 : 0, typing: k === 'type' ? 1 : 0 };
    const T = typing(c);
    switch (k) {
      case 'watch':
        return { l: [-0.2, 0.77, 0.26], r: [0.2, 0.77, 0.26], gl: 0.3, gr: 0.3, palms: 0.2, nod: -0.04 + 0.03 * Math.sin(c.t * 0.9), lean: 0.05, n };
      case 'type':
        return { ...T, palms: 1, tap: true, gl: 0.2, gr: 0.2, nod: 0.04, lean: 0.1, n };
      case 'ball':
        return { l: T.l, r: add(MC.ball, 0.012 * Math.sin(c.t * 2.2), 0, 0.012 * Math.cos(c.t * 1.7)), palms: 0.9, gl: 0.2, gr: 0.45, nod: -0.02, lean: 0.08, n };
      case 'poll': {
        const row = wrap(u * 6, 6);
        return { l: [-0.2, 0.77, 0.26], r: add(MC.poll, row * 0.045, u * 6 % 1 < 0.4 ? -0.006 : 0.006, 0), palms: 0.9, gl: 0.3, gr: 0.4, nod: 0.06, lean: 0.14, n };
      }
      default:
        return { l: add(MC.ptt, 0, u > 0.1 && u < 0.9 ? -0.006 : 0.004, 0), r: [0.2, 0.77, 0.26], palms: 0.9, gl: 0.45, gr: 0.3, nod: -0.05, lean: 0.06, n };
    }
  },
};
const COMMS: Script = {
  seq: [['call', 3.2], ['hear', 3], ['log', 3.4], ['reply', 2.6]],
  at: () => sat(MC.seat),
  key(k, u, c) {
    const n = { talk: k === 'call' || k === 'reply' ? 1 : 0, hear: k === 'hear' ? 1 : 0, logged: c.p('log') };
    const tip = add(MC.log, -0.05 + 0.1 * frac(u * 3), 0.002, -0.04 + 0.05 * u);
    const props = { pen: k === 'log' ? penGrip(tip) : add(MC.log, 0.13, 0.02, 0.02) };
    const key = add(MC.ptt, 0, -0.005, 0);
    switch (k) {
      case 'call':
      case 'reply':
        return { l: key, r: [0.2, 0.77, 0.26], palms: 0.9, gl: 0.45, gr: 0.3, nod: -0.06 + 0.03 * Math.sin(c.t * 2.2), lean: 0.08, n, props };
      case 'hear':
        return { l: [-0.2, 0.77, 0.26], r: [0.2, 0.77, 0.26], palms: 0.3, nod: 0.03 + 0.05 * Math.sin(c.t * 1.2), lean: 0.03, n, props };
      default:
        return { l: [-0.04, 0.77, 0.26], palms: 0.5, gl: 0.3, tool: 'pen', nod: 0.34, lean: 0.14, n, props };
    }
  },
};
const ANOMALY: Script = {
  seq: [['alarm', 1.6], ['read', 2.6], ['binder', 3.2], ['guard', 1.8], ['switch', 2], ['type', 3], ['clear', 2.6]],
  at: (k) => (k === 'alarm' ? sat(MC.seat) : k === 'binder' ? st(-0.3, MC.stand) : st(0, MC.stand)),
  key(k, u, c) {
    const n = { alarm: 1 - c.p('type', 0.75, 0.95), chair: k === 'alarm' ? sm(u, 0.6, 1) : 1, page: c.p('binder'), guard: c.p('guard', 0.2, 0.7), thrown: c.p('switch', 0.3, 0.5), fixed: c.p('type', 0.75, 0.95) };
    const T = typing(c, 1.4);
    switch (k) {
      case 'alarm':
        return { l: [-0.2, 0.77, 0.26], r: [0.2, 0.77, 0.26], gl: 0.5, gr: 0.5, palms: 0.5, nod: -0.06, lean: 0.12, n };
      case 'read':
        return { l: [-0.28, 0.78, 0.26], r: [0.28, 0.78, 0.26], gl: 0.2, gr: 0.2, palms: 0.8, nod: 0.02, lean: 0.24, n };
      case 'binder':
        return { l: add(MC.binder, 0.03 + 0.1 * frac(u * 2), 0.015, 0.02), r: [-0.04, 0.78, 0.26], gl: 0.25, gr: 0.2, palms: 0.8, nod: 0.3, lean: 0.3, n };
      case 'guard':
        return { l: [-0.28, 0.78, 0.26], r: add(MC.guard, 0, 0.03 + 0.03 * sm(u, 0.2, 0.7), 0), gl: 0.2, gr: 0.5, palms: 0.9, nod: 0.24, lean: 0.28, n };
      case 'switch':
        return { l: [-0.28, 0.78, 0.26], r: add(MC.guard, 0, 0.02 - 0.015 * sm(u, 0.3, 0.5), 0), gl: 0.2, gr: 0.6, palms: 0.9, nod: 0.26, lean: 0.28, n };
      case 'type':
        return { ...T, palms: 1, tap: u < 0.75, gl: 0.2, gr: 0.2, nod: 0.08, lean: 0.26, n };
      default:
        return { l: add(MC.reset, 0, 0.012, 0), r: [0.2, 0.8, 0.28], gl: 0.5, gr: 0.3, palms: 0.8, nod: -0.04, lean: 0.14, n };
    }
  },
};
const BRIEF_AT = st(-0.86, 0.62, 0.35);
const BRIEF_TURN: St = { ...BRIEF_AT, yaw: 2.4 };
const BRIEFING: Script = {
  seq: [['open', 3.4], ['point', 3], ['ask', 2.6], ['tick', 2.6]],
  at: (k) => (k === 'point' ? BRIEF_TURN : BRIEF_AT),
  key(k, _u, c) {
    const clip = c.bd(0.14, 1.0, 0.24);
    const n = { ticks: c.p('tick') * 4 };
    const props = { clip };
    switch (k) {
      case 'open':
        return { r: c.bd(-0.26, 1.08 + 0.05 * Math.sin(c.t * 2.4), 0.26), gr: 0.15, palms: 0.5, nod: 0.02, lean: 0.03, tool: 'clip', n, props };
      case 'point':
        return { r: c.bd(-0.14, 1.42, 0.42), gr: 0.65, palms: 0.2, nod: -0.16, lean: 0, tool: 'clip', n, props };
      case 'ask':
        return { r: c.bd(-0.3, 1.14, 0.3), gr: 0.05, palms: 0, nod: -0.03 + 0.03 * Math.sin(c.t * 1.8), lean: 0.02, tool: 'clip', n, props };
      default:
        return { r: add(clip, -0.02, 0.05, 0.02), gr: 0.4, palms: 0.5, nod: 0.3, lean: 0.06, tool: 'clip', n, props };
    }
  },
};

// =============================================================================================
// 훈련용 우주복 (spacesuitDisplay, 1 × 1): the suit up on a stand, arms a little out.

export const SD = {
  stand: 0.62,
  port: [0.09, 1.25, 0.19] as V,
  wristL: [-0.36, 1.04, 0.16] as V,
  wristR: [0.36, 1.04, 0.16] as V,
  gaugeRest: [0.42, 0.62, 0.3] as V,
};
const SUIT_CHECK: Script = {
  seq: [['look', 1.8], ['gauge', 3.6], ['ringL', 1.8], ['ringR', 1.8], ['front', 2.6], ['tick', 2.6]],
  at: () => st(0, SD.stand),
  key(k, u, c) {
    const clip = c.bd(0.14, 1.0, 0.22);
    const n = { reading: k === 'gauge' ? sm(u, 0.25, 0.8) : k === 'ringL' || k === 'ringR' || k === 'front' || k === 'tick' ? 1 : 0, ticks: c.p('tick') * 4, ringL: c.p('ringL', 0.3, 0.7), ringR: c.p('ringR', 0.3, 0.7) };
    const props: Record<string, V> = { gauge: k === 'gauge' ? add(SD.port, 0.015, -0.07, 0.06) : SD.gaugeRest, clip };
    switch (k) {
      case 'look':
        return { ...easy(c), nod: 0.0, lean: 0.03, n, props };
      case 'gauge':
        return { l: add(SD.port, -0.09, 0.03, 0.03), gl: 0.3, palms: 0.5, nod: 0.3, lean: 0.14, tool: 'gauge', n, props };
      case 'ringL':
        return { l: add(SD.wristL, 0, 0, 0.03), r: c.bd(-0.2, 0.9, 0.08), gl: 0.7, gr: 0.3, palms: 0.5, nod: 0.2, lean: 0.12, n, props };
      case 'ringR':
        return { l: c.bd(0.2, 0.9, 0.08), r: add(SD.wristR, 0, 0, 0.03), gl: 0.3, gr: 0.7, palms: 0.5, nod: 0.2, lean: 0.12, n, props };
      case 'front':
        return { l: [-0.1, 1.4 - 0.24 * u, 0.22], r: [0.1, 1.4 - 0.24 * u, 0.22], gl: 0.1, gr: 0.1, palms: 0.9, nod: 0.12 + 0.14 * u, lean: 0.12, n, props };
      default:
        return { r: add(clip, -0.02, 0.05, 0.02), gr: 0.4, palms: 0.5, nod: 0.34, lean: 0.06, tool: 'clip', n, props };
    }
  },
};

// =============================================================================================
// 우주복 피팅 랙 (asSuitRack, 2 × 1): a suit's hard torso on its pedestal at the left, a table with a helmet peg in the middle, the helmet shelf at the right.

export const SR = {
  stand: 0.64,
  torsoX: -0.6,
  tapeL: [-0.77, 1.4, 0.22] as V,
  tapeR: [-0.43, 1.4, 0.22] as V,
  ring: [-0.39, 1.26, 0.14] as V,
  glove: [-0.16, 0.9, 0.2] as V,
  peg: [0.05, 1.03, 0.12] as V,
  shelf: [0.62, 1.16, 0.06] as V,
  table: 0.86,
  spannerRest: [-0.02, 0.89, 0.27] as V,
  clothRest: [0.2, 0.875, 0.26] as V,
};
const FIT_SUIT: Script = {
  seq: [['tape', 3.2], ['ring', 3], ['glove', 2.6], ['note', 2.6]],
  at: (k) => (k === 'glove' ? st(-0.28, SR.stand) : st(SR.torsoX, SR.stand)),
  key(k, u, c) {
    const n = { ring: c.p('ring', 0.1, 0.9), press: k === 'glove' ? sm(Math.sin(u * PI * 4), 0, 1) : 0, ticks: c.p('note') * 4 };
    const clip = c.bd(0.14, 1.0, 0.22);
    const props: Record<string, V> = { spanner: k === 'ring' ? add(SR.ring, 0.015 * Math.sin(c.t * 3), -0.08, 0.03) : SR.spannerRest, clip };
    switch (k) {
      case 'tape':
        return { tool: 'tape', lean: 0.1, nod: -0.04 + 0.04 * Math.sin(c.t * 0.9), n, props };
      case 'ring':
        return { l: add(SR.ring, -0.06, 0.04, 0.03), gl: 0.5, palms: 0.5, nod: 0.14, lean: 0.14, tool: 'spanner', n, props };
      case 'glove':
        return { l: add(SR.glove, -0.04, 0.03 - 0.012 * n.press, 0), r: add(SR.glove, 0.04, 0.03 - 0.012 * n.press, 0), gl: 0.15, gr: 0.15, palms: 1, nod: 0.36, lean: 0.2, n, props };
      default:
        return { r: add(clip, -0.02, 0.05, 0.02), gr: 0.4, palms: 0.5, nod: 0.34, lean: 0.06, tool: 'clip', n, props };
    }
  },
};
const atShelf = st(SR.shelf[0], 0.5);
const atPeg = st(SR.peg[0], 0.58);
const CARRY_HELMET: Script = {
  seq: [['take', 1.4], ['lift', 0.8], ['carry', 0.6, 1.8], ['set', 1.4], ['spray', 1.1], ['wipe', 3.2], ['look', 1.8], ['pick', 1.4], ['back', 0.6, 1.8], ['shelve', 1.4]],
  at: (k) => (k === 'take' || k === 'lift' || k === 'shelve' ? atShelf : atPeg),
  key(k, u, c) {
    const carried = c.bd(0, 1.05, 0.31);
    const n = { clean: c.p('wipe', 0.05, 0.95) };
    let helmet: V = SR.shelf;
    if (k === 'take') helmet = SR.shelf;
    else if (k === 'lift') helmet = lerpV(SR.shelf, carried, sm(u, 0.05, 0.95));
    else if (k === 'carry' || k === 'back') helmet = carried;
    else if (k === 'set') helmet = lerpV(carried, SR.peg, sm(u, 0.1, 0.8));
    else if (k === 'spray' || k === 'wipe' || k === 'look') helmet = SR.peg;
    else if (k === 'pick') helmet = lerpV(SR.peg, carried, sm(u, 0.2, 0.9));
    else if (k === 'shelve') helmet = lerpV(carried, SR.shelf, sm(u, 0.1, 0.8));
    const face = add(SR.peg, 0, 0.02, 0.15);
    const props: Record<string, V> = { helmet, cloth: k === 'wipe' ? add(face, 0.05 * Math.sin(c.t * 6), 0.03 * Math.cos(c.t * 4.3), 0.025) : SR.clothRest };
    switch (k) {
      case 'spray':
        return { l: add(SR.peg, -0.14, 0, 0.04), r: add(SR.clothRest, 0, 0.03, 0), gl: 0.6, gr: 0.6, nod: 0.26, lean: 0.14, n, props };
      case 'wipe':
        return { l: add(SR.peg, -0.14, 0, 0.04), gl: 0.5, palms: 0.5, nod: 0.26, lean: 0.14, tool: 'cloth', n, props };
      case 'look':
        return { l: add(SR.peg, -0.14, 0, 0.04), r: add(SR.peg, 0.14, 0, 0.04), gl: 0.5, gr: 0.5, palms: 0.5, nod: 0.18, lean: 0.14, n, props };
      default:
        return { tool: 'helmet', lean: k === 'carry' || k === 'back' ? 0.03 : 0.14, nod: k === 'carry' || k === 'back' ? 0.08 : 0.22, n, props };
    }
  },
};

// =============================================================================================
// 저중력 훈련 장치 (asLowGravRig, 3 × 2): a gantry over a grey mat, a trolley running on it, a cable down to a waist harness that carries most of the weight.

export const LG = {
  lane: 0.28,
  xa: -1.0,
  xb: 1.0,
  hop: 0.2,
  /** A rock on the mat, and where the tongs lift it to, both as the tip goes. */
  rock: [0.62, 0.17, 0.0] as V,
  bin: [1.06, 0.3, 0.32] as V,
  /** Tongs: from the hand to the tip. */
  tip: [0, -0.74, -0.27] as V,
};
const bounding = (from: number, to: number, u: number, steps: number, z = LG.lane): St => ({
  x: mixN(from, to, u),
  y: LG.hop * Math.abs(Math.sin(u * PI * steps)),
  z,
  yaw: to > from ? PI / 2 : -PI / 2,
  bound: true,
});
const arms = (c: Ctx, u: number): Key => {
  const sw = 0.05 * Math.sin(u * PI * 12);
  return { l: c.bd(0.3, 1.0 + sw, 0.14), r: c.bd(-0.3, 1.0 - sw, 0.14), gl: 0.25, gr: 0.25, palms: 0.3, lean: 0.14, nod: 0.08 };
};
const LOW_WALK: Script = {
  seq: [['clip', 2.2], ['go', 7], ['turn', 1.2], ['back', 7], ['unclip', 1.8]],
  at(k, u) {
    if (k === 'go') return bounding(LG.xa, LG.xb, u, 5);
    if (k === 'back') return bounding(LG.xb, LG.xa, u, 5);
    if (k === 'turn') return { x: LG.xb, y: 0, z: LG.lane, yaw: -PI / 2 };
    return { x: LG.xa, y: 0, z: LG.lane, yaw: PI / 2 };
  },
  key(k, u, c) {
    const on = k === 'clip' ? sm(u, 0.5, 0.75) : k === 'unclip' ? 1 - sm(u, 0.3, 0.55) : 1;
    const n = { on };
    if (k === 'clip' || k === 'unclip') return { l: c.bd(0.1, 0.96, 0.15), r: c.bd(-0.1, 0.96, 0.15), gl: 0.6, gr: 0.6, palms: 0.7, nod: 0.3, lean: 0.1, n };
    if (k === 'turn') return { ...arms(c, 0), n };
    return { ...arms(c, u), n };
  },
};
/** Where the hand holds the tongs for the tip to be at `tip`. */
const tongsFor = (tip: V): V => [tip[0] - LG.tip[0], tip[1] - LG.tip[1], tip[2] - LG.tip[2]];
const LOW_SAMPLE: Script = {
  seq: [['clip', 2.2], ['out', 4], ['aim', 1.5], ['grab', 1.4], ['lift', 1.6], ['turn', 0.8], ['drop', 1.6], ['home', 4]],
  at(k, u) {
    const stop = LG.rock[0];
    if (k === 'out') return bounding(LG.xa, stop, u, 3, LG.rock[2] + 0.52);
    if (k === 'home') return bounding(stop, LG.xa, u, 3, LG.rock[2] + 0.52);
    if (k === 'clip') return { x: LG.xa, y: 0, z: LG.rock[2] + 0.52, yaw: PI / 2 };
    if (k === 'aim' || k === 'grab' || k === 'lift') return st(stop, LG.rock[2] + 0.52);
    return { x: stop - 0.12, y: 0, z: LG.bin[2] - 0.26, yaw: PI / 2 };
  },
  key(k, u, c) {
    const on = k === 'clip' ? sm(u, 0.5, 0.75) : 1;
    const low: V = LG.rock;
    const high: V = [low[0], low[1] + 0.34, low[2]];
    const dropHand: V = [LG.bin[0] - 0.05 + LG.tip[2], LG.bin[1] + 0.2 - LG.tip[1], LG.bin[2]];
    const n = { on, rock: (k === 'grab' ? sm(u, 0.5, 0.7) : 0) + (k === 'lift' || k === 'turn' ? 1 : 0) + (k === 'drop' ? 1 - sm(u, 0.5, 0.65) : 0), got: c.p('drop', 0.6, 0.7), scissor: k === 'grab' ? 1 - sm(u, 0.3, 0.6) : k === 'aim' ? 1 : k === 'drop' ? sm(u, 0.5, 0.65) : 0 };
    const rest = c.bd(-0.26, 1.02, 0.18);
    let tongs: V = rest;
    let tool: AsTool | undefined;
    if (k === 'aim') tongs = lerpV(tongsFor(high), tongsFor(low), sm(u, 0, 0.8));
    else if (k === 'grab') tongs = tongsFor(low);
    else if (k === 'lift') tongs = lerpV(tongsFor(low), tongsFor(high), sm(u, 0, 1));
    // Faced along +x here, the tongs turned with the body: the tip's ahead of the hand on x.
    else if (k === 'turn') tongs = lerpV(tongsFor(high), dropHand, sm(u, 0, 1));
    else if (k === 'drop') tongs = dropHand;
    if (k !== 'clip') tool = 'tongs';
    const props = { tongs };
    if (k === 'clip') return { l: c.bd(0.1, 0.96, 0.15), r: c.bd(-0.1, 0.96, 0.15), gl: 0.6, gr: 0.6, palms: 0.7, nod: 0.3, lean: 0.1, n, props };
    const sway = c.bd(0.3, 1.0 + 0.05 * Math.sin(u * PI * 8), 0.14);
    return { l: sway, gl: 0.25, palms: 0.3, tool, lean: k === 'aim' || k === 'grab' ? 0.24 : 0.14, nod: k === 'out' || k === 'home' ? 0.1 : 0.4, n, props };
  },
};

// =============================================================================================
// 로봇팔 훈련기 (asArmTrainer, 2 × 1): a desk with two hand controllers, a low star-field board behind on which a scale arm reaches for a drifting module.

export const AT = {
  top: 0.74,
  seat: [0, 0.47, 0.64] as V,
  stickL: [-0.22, 0.875, 0.17] as V,
  stickR: [0.22, 0.875, 0.17] as V,
  /** The arm's shoulder, the elbow's two lengths, where it rests, the module's mean path and its port. */
  base: [-0.72, 1.02, -0.3] as V,
  link: 0.55,
  home: [-0.28, 0.98, -0.28] as V,
  fly: [0.3, 1.14, -0.28] as V,
  port: [-0.1, 1.42, -0.28] as V,
  button: [0.22, 0.895, 0.17] as V,
};
const stickHands = (c: Ctx, tx: number, ty: number): { l: V; r: V } => ({
  l: add(AT.stickL, 0.018 * tx, 0.008, -0.018 * ty),
  r: add(AT.stickR, 0.018 * Math.sin(c.t * 0.7) * 0.6, 0.008, 0.018 * Math.cos(c.t * 0.9) * 0.6),
});
const ARM_CAPTURE: Script = {
  seq: [['brief', 1.8], ['near', 5.5], ['fine', 3.4], ['grab', 1.8], ['hold', 2.2], ['free', 1.8], ['park', 3]],
  at: () => sat(AT.seat),
  key(k, _u, c) {
    const reach = 0.82 * c.p('near', 0, 1) + 0.18 * c.p('fine', 0, 1);
    const n = { reach: reach * (1 - c.p('park', 0, 1)), caught: c.p('grab', 0.4, 0.55) * (1 - c.p('free', 0.4, 0.55)), trig: k === 'grab' ? 1 : 0, drift: 1 - c.p('fine', 0.5, 1) * (1 - c.p('free', 0.5, 1)), move: 0 };
    const tx = k === 'near' ? Math.sin(c.t * 1.1) : k === 'fine' ? 0.4 * Math.sin(c.t * 2.2) : 0;
    const ty = k === 'near' ? 0.9 : k === 'fine' ? 0.4 : k === 'park' ? -0.8 : 0;
    const S = stickHands(c, tx, ty);
    return { ...S, gl: 0.8, gr: 0.8, palms: 0.45, nod: -0.04 + (k === 'grab' ? 0.06 : 0), lean: k === 'fine' || k === 'grab' ? 0.14 : 0.07, n: { ...n, tx, ty }, tap: false };
  },
};
const ARM_BERTH: Script = {
  seq: [['near', 4.4], ['grab', 1.6], ['move', 6], ['align', 3], ['latch', 2.4], ['back', 3]],
  at: () => sat(AT.seat),
  key(k, _u, c) {
    const n = { reach: c.p('near') * (1 - c.p('back', 0, 1)), caught: k === 'near' ? 0 : c.p('grab', 0.4, 0.55) * (1 - c.p('back', 0, 0.05)), trig: k === 'grab' || k === 'latch' ? 1 : 0, drift: 1 - c.p('near', 0.6, 1), move: c.p('move') * (1 - c.p('back', 0, 0.05)) + (k === 'back' ? 1 : 0), berthed: c.p('latch', 0.3, 0.6) };
    const tx = k === 'near' || k === 'move' ? Math.sin(c.t * 1.1) : k === 'align' ? 0.3 * Math.sin(c.t * 2.2) : 0;
    const ty = k === 'near' ? 0.9 : k === 'move' ? -0.5 : k === 'align' ? 0.3 : k === 'back' ? -0.8 : 0;
    return { ...stickHands(c, tx, ty), gl: 0.8, gr: 0.8, palms: 0.45, nod: -0.04, lean: k === 'align' ? 0.14 : 0.07, n: { ...n, tx, ty }, tap: false };
  },
};

// =============================================================================================
// 과학 글러브박스 (asGlovebox, 2 × 1): a clear box on a bench, two gloved ports, a plate of wells and a rack of vials inside.

export const GB = {
  stand: 0.52,
  floor: 0.9,
  portL: [-0.2, 1.14, 0.21] as V,
  portR: [0.2, 1.14, 0.21] as V,
  vial: [0.36, 0.965, 0.04] as V,
  /** The plate's four wells along x. */
  well: (i: number): V => [-0.14 + 0.07 * wrap(i, 4), 0.925, 0.03],
  loop: [-0.06, 1.1, 0.04] as V,
  restL: [-0.2, 1.02, 0.08] as V,
  restR: [0.2, 1.02, 0.08] as V,
  tipRest: [0.17, 0.98, 0.0] as V,
};
const CRYSTAL: Script = {
  seq: [['in', 1.6], ['take', 1.6], ['draw', 1.8], ['drop', 5], ['back', 1.2], ['seal', 2.4], ['watch', 3], ['out', 1.4]],
  at: () => st(0, GB.stand),
  key(k, u, c) {
    const wells = c.p('drop') * 4;
    const n = { wells, sealed: c.p('seal', 0.2, 0.9), grow: c.p('seal', 0.5, 1) * 0.3 + c.p('watch', 0, 1) * 0.7, inBox: k === 'out' ? 1 - sm(u, 0.2, 0.9) : k === 'in' ? sm(u, 0.1, 0.8) : 1 };
    const pipe: V = k === 'take' ? lerpV(GB.tipRest, penGrip(GB.vial), sm(u, 0, 0.9)) : k === 'draw' ? penGrip(GB.vial) : k === 'drop' ? penGrip(add(GB.well(u * 4), 0, 0.018, 0)) : k === 'back' ? lerpV(penGrip(GB.well(3)), GB.tipRest, sm(u, 0, 0.9)) : GB.tipRest;
    const props: Record<string, V> = { pipette: pipe };
    const inL = lerpV(GB.portL, GB.restL, n.inBox);
    const inR = lerpV(GB.portR, GB.restR, n.inBox);
    switch (k) {
      case 'take':
      case 'draw':
      case 'drop':
      case 'back':
        return { l: add(GB.well(0), -0.09, 0.05, 0.03), gl: 0.45, palms: 0.5, tool: 'pipette', nod: 0.34, lean: 0.14, n: { ...n, sucked: k === 'draw' ? sm(u, 0.2, 0.8) : k === 'drop' ? 1 - u : 0 }, props };
      case 'seal':
        return { l: add(GB.well(0), -0.04 + 0.2 * u, 0.04, 0.02), r: add(GB.well(3), 0.09 - 0.1 * u, 0.04, 0.02), gl: 0.2, gr: 0.2, palms: 1, nod: 0.34, lean: 0.14, n, props };
      case 'watch':
        return { l: GB.restL, r: GB.restR, gl: 0.3, gr: 0.3, palms: 0.7, nod: 0.1 + 0.03 * Math.sin(c.t), lean: 0.1, n, props };
      default:
        return { l: inL, r: inR, gl: 0.3, gr: 0.3, palms: 0.7, nod: 0.2, lean: 0.1, n, props };
    }
  },
};
const FLUID: Script = {
  seq: [['in', 1.6], ['dip', 2], ['film', 2.4], ['take', 1.4], ['feed', 4.4], ['back', 1.2], ['watch', 2.8], ['out', 1.4]],
  at: () => st(0, GB.stand),
  key(k, u, c) {
    const n = { film: c.p('film', 0.1, 0.9), drop: c.p('feed') * (1 - c.p('out', 0.3, 0.9)), wob: k === 'watch' ? 1 : 0, inBox: k === 'out' ? 1 - sm(u, 0.2, 0.9) : k === 'in' ? sm(u, 0.1, 0.8) : 1, fluid: 1 };
    const above: V = add(GB.loop, 0, 0.09, 0.03);
    const props: Record<string, V> = { pipette: k === 'take' ? lerpV(GB.tipRest, penGrip(above), sm(u, 0, 0.9)) : k === 'feed' ? penGrip(add(above, 0, -0.02 * sm(u, 0, 0.2), 0)) : k === 'back' ? lerpV(penGrip(above), GB.tipRest, sm(u, 0, 0.9)) : GB.tipRest, loopAt: k === 'dip' ? add(GB.loop, 0, -0.1 * Math.sin(u * PI), 0) : GB.loop };
    switch (k) {
      case 'dip':
        return { l: add(props.loopAt as V, -0.015, -0.06, 0.02), r: GB.restR, gl: 0.8, gr: 0.3, palms: 0.5, nod: 0.3, lean: 0.14, n, props };
      case 'film':
        return { l: add(GB.loop, -0.015, -0.06, 0.02), r: GB.restR, gl: 0.8, gr: 0.3, palms: 0.5, nod: 0.24, lean: 0.14, n, props };
      case 'take':
      case 'feed':
      case 'back':
        return { l: add(GB.loop, -0.015, -0.06, 0.02), gl: 0.8, palms: 0.5, tool: 'pipette', nod: 0.22, lean: 0.14, n, props };
      case 'watch':
        return { l: add(GB.loop, -0.015, -0.06, 0.02), r: GB.restR, gl: 0.8, gr: 0.3, palms: 0.5, nod: 0.16, lean: 0.1, n, props };
      default:
        return { l: lerpV(GB.portL, add(GB.loop, -0.015, -0.06, 0.02), n.inBox), r: lerpV(GB.portR, GB.restR, n.inBox), gl: 0.3, gr: 0.3, palms: 0.7, nod: 0.2, lean: 0.1, n, props };
    }
  },
};

// =============================================================================================
// 생존 훈련 코너 (asSurvivalCorner, 2 × 2): a mat of grass and gravel, a canopy over a pole, a stake and line, a chopping stump with a fire tray; the raft behind.

export const SV = {
  /** A stake head, standing high enough to be reached from a crouch. */
  stake: [-0.42, 0.56, 0.38] as V,
  corner: [-0.42, 1.02, 0.32] as V,
  pole: [-0.42, 1.18, 0.12] as V,
  /** The guy-line's knot on the post. */
  knot: [-0.2, 0.96, 0.42] as V,
  stump: [0.46, 0.52, 0.34] as V,
  beacon: [0.2, 0.86, 0.44] as V,
  malletRest: [-0.08, 0.32, 0.72] as V,
  radioRest: [0.72, 0.56, 0.32] as V,
  mirrorRest: [0.34, 0.56, 0.46] as V,
  strikerRest: [0.62, 0.56, 0.46] as V,
  /** From the mallet's grip to where its head strikes. */
  head: 0.24,
};
const SHELTER: Script = {
  seq: [['spread', 3], ['pole', 2.4], ['tie', 3.4], ['stoop', 0.6], ['drive', 3.6], ['rise', 0.6], ['tug', 1.8]],
  at(k) {
    if (k === 'stoop' || k === 'drive') return st(SV.stake[0], SV.stake[2] + SV.head + 0.16, PI, 0, 0.72);
    if (k === 'tie' || k === 'tug') return st(SV.knot[0], 0.82);
    return st(SV.pole[0], 0.68);
  },
  key(k, u, c) {
    const n = { tarp: 0.35 * c.p('spread') + 0.45 * c.p('pole') + 0.2 * c.p('tie', 0.3, 1), tied: c.p('tie', 0.5, 0.95), driven: c.p('drive', 0.05, 0.95), tug: k === 'tug' ? Math.abs(Math.sin(u * PI * 3)) : 0 };
    const beat = k === 'drive' ? 0.07 * Math.abs(Math.sin(c.t * 5)) : 0;
    const sink = -0.1 * n.driven;
    const props: Record<string, V> = { mallet: k === 'drive' ? [SV.stake[0], SV.stake[1] + sink + 0.07 + beat, SV.stake[2] + SV.head] : SV.malletRest };
    switch (k) {
      case 'spread':
        return { l: add(SV.corner, -0.14, -0.05 + 0.1 * u, 0.04), r: add(SV.corner, 0.14, -0.05 + 0.1 * u, 0.04), gl: 0.7, gr: 0.7, palms: 0.5, nod: 0.02, lean: 0.08, n, props };
      case 'pole':
        return { l: add(SV.pole, -0.04, -0.1 + 0.1 * u, 0.09), r: add(SV.pole, 0.05, -0.2 + 0.1 * u, 0.09), gl: 0.85, gr: 0.85, palms: 0.4, nod: -0.06, lean: 0.1, n, props };
      case 'tie':
        return { l: add(SV.knot, -0.03 + 0.02 * Math.sin(c.t * 5), 0, 0.05), r: add(SV.knot, 0.04 + 0.02 * Math.cos(c.t * 4.3), 0.015 * Math.sin(c.t * 6), 0.05), gl: 0.6, gr: 0.6, palms: 0.6, nod: 0.3, lean: 0.16, n, props };
      case 'stoop':
      case 'drive':
        return { l: c.bd(0.24, 0.72, 0.18), gl: 0.3, palms: 0.5, tool: k === 'drive' ? 'mallet' : undefined, r: k === 'drive' ? undefined : c.bd(-0.2, 0.7, 0.2), nod: 0.4, lean: 0.22, n, props };
      case 'rise':
        return { ...easy(c), nod: 0.2, lean: 0.1, n, props };
      default:
        return { l: add(SV.knot, -0.03, 0.03 - 0.02 * n.tug, 0.08), r: add(SV.knot, 0.03, 0.03 - 0.02 * n.tug, 0.08), gl: 0.8, gr: 0.8, palms: 0.5, nod: 0.08, lean: -0.02 + 0.06 * n.tug, n, props };
    }
  },
};
const SIGNAL: Script = {
  seq: [['beacon', 2.6], ['radio', 3], ['toMirror', 0.8], ['mirror', 3.6], ['stoop', 0.6], ['fire', 3.6], ['warm', 2]],
  at(k) {
    if (k === 'beacon') return st(SV.beacon[0], 0.84);
    if (k === 'stoop' || k === 'fire' || k === 'warm') return st(SV.stump[0], SV.stump[2] + 0.28, PI, 0, 0.74);
    if (k === 'mirror' || k === 'toMirror') return { ...st(0.3, 0.64), yaw: 2.5 };
    return st(0.3, 0.64, PI);
  },
  key(k, u, c) {
    const n = { aerial: c.p('beacon', 0.1, 0.8), blink: c.p('beacon', 0.8, 1), talk: k === 'radio' ? 1 : 0, flash: k === 'mirror' ? (Math.sin(c.t * 7) > 0 ? 1 : 0) * sm(u, 0.1, 0.25) : 0, fire: c.p('fire', 0.55, 0.9), spark: k === 'fire' && u < 0.65 ? 1 : 0 };
    const props: Record<string, V> = {
      radio: k === 'radio' ? c.bd(-0.1, 0.84 * c.H - 0.06, 0.1) : SV.radioRest,
      mirror: k === 'mirror' ? c.bd(-0.26, 1.32, 0.32) : SV.mirrorRest,
      striker: k === 'fire' ? add(SV.stump, 0.03, 0.2 + 0.016 * Math.sin(c.t * 11), 0.03) : SV.strikerRest,
    };
    switch (k) {
      case 'beacon':
        return { l: add(SV.beacon, -0.03, 0, 0.05), r: add(SV.beacon, 0.015, 0.03 + 0.2 * n.aerial, 0.02), gl: 0.8, gr: 0.8, palms: 0.5, nod: 0.22, lean: 0.14, n, props };
      case 'radio':
        return { l: c.bd(0.2, 0.9, 0.1), gl: 0.3, tool: 'radio', nod: 0.04, lean: 0.04, n, props };
      case 'toMirror':
        return { ...easy(c), nod: -0.1, n, props };
      case 'mirror':
        return { l: c.bd(0.14, 1.4, 0.34), gl: 0.15, palms: 0.5, tool: 'mirror', nod: -0.14, lean: 0.02, n, props };
      case 'stoop':
        return { l: add(SV.stump, -0.14, 0.14, 0.06), r: add(SV.stump, 0.1, 0.14, 0.06), gl: 0.4, gr: 0.4, nod: 0.4, lean: 0.2, n, props };
      case 'fire':
        return { l: add(SV.stump, -0.08, 0.18, 0.04), gl: 0.8, palms: 0.3, tool: 'striker', nod: 0.4, lean: 0.2, n, props };
      default:
        return { l: add(SV.stump, -0.08, 0.3, 0.05), r: add(SV.stump, 0.08, 0.3, 0.05), gl: 0.1, gr: 0.1, palms: 1, nod: 0.34, lean: 0.16, n, props };
    }
  },
};

// =============================================================================================
// 언론·견학 벽 (asPressWall, 3 × 1): the agency's backdrop with a lectern before it at the left; a board of children's question cards at the right.

export const PW = {
  lecternX: -0.62,
  lecternZ: 0.34,
  top: 1.04,
  speakZ: -0.02,
  rocketRest: [-0.92, 1.08, 0.3] as V,
  stand: 0.52,
  boardX: 0.82,
  board: [0.82, 1.3, -0.03] as V,
  box: [1.26, 0.96, 0.14] as V,
  ledge: [0.82, 0.93, 0.12] as V,
  penRest: [0.56, 0.95, 0.12] as V,
};
const PRESS: Script = {
  seq: [['answer', 3.4], ['rocket', 1], ['show', 3.6], ['place', 1], ['gesture', 3], ['listen', 2.6]],
  at: () => st(PW.lecternX, PW.speakZ, 0),
  key(k, u, c) {
    const on: { l: V; r: V } = { l: [PW.lecternX + 0.16, PW.top + 0.02, PW.lecternZ - 0.1], r: [PW.lecternX - 0.16, PW.top + 0.02, PW.lecternZ - 0.1] };
    const shown: V = c.bd(-0.24, 1.2 + 0.03 * Math.sin(c.t * 1.4), 0.3);
    const props: Record<string, V> = { rocket: k === 'rocket' ? lerpV(PW.rocketRest, shown, sm(u, 0, 1)) : k === 'show' ? shown : k === 'place' ? lerpV(shown, PW.rocketRest, sm(u, 0, 1)) : PW.rocketRest };
    const n = { talking: k === 'listen' ? 0 : 1, asking: k === 'listen' ? 1 : 0 };
    switch (k) {
      case 'answer':
        return { l: on.l, r: c.bd(-0.26, 1.1 + 0.05 * Math.sin(c.t * 2.3), 0.28), gl: 0.3, gr: 0.1, palms: 0.4, nod: -0.02 + 0.03 * Math.sin(c.t * 1.7), lean: 0.03, n, props };
      case 'rocket':
      case 'show':
      case 'place':
        return { l: on.l, gl: 0.3, palms: 0.4, tool: 'rocket', nod: k === 'show' ? 0.04 : 0.12, lean: 0.04, n, props };
      case 'gesture':
        return { l: c.bd(0.28, 1.1 + 0.05 * Math.sin(c.t * 2.1), 0.26), r: c.bd(-0.28, 1.1 - 0.05 * Math.sin(c.t * 2.1), 0.26), gl: 0.1, gr: 0.1, palms: 0.2, nod: 0, lean: 0.03, n, props };
      default:
        return { l: on.l, r: on.r, gl: 0.3, gr: 0.3, palms: 0.8, nod: 0.05 + 0.03 * Math.sin(c.t * 1.2), lean: 0.05, n, props };
    }
  },
};
const CARD_SLOTS = 6;
/** Where each answered card goes on the board: columns of a loose row. */
export const cardSlot = (i: number): V => {
  const j = wrap(i, CARD_SLOTS);
  return [PW.board[0] - 0.16 + 0.16 * (j % 3), PW.board[1] + 0.08 - 0.15 * Math.floor(j / 3), PW.board[2] + 0.018];
};
const CARDS: Script = {
  seq: [['take', 1.5], ['read', 2.2], ['write', 3.6], ['lift', 1], ['pin', 1.6], ['look', 1.8]],
  at: (k) => st(PW.boardX, k === 'lift' || k === 'pin' ? 0.42 : PW.stand),
  key(k, u, c) {
    const slot = cardSlot(c.round);
    const onLedge: V = add(PW.ledge, -0.08, 0.01, 0.02);
    const reading: V = c.bd(0.05, 1.12, 0.26);
    const n = { up: c.p('pin', 0.5, 0.65), written: c.p('write', 0, 1), slot: wrap(c.round, CARD_SLOTS) };
    const pen = k === 'write' ? penGrip(add(onLedge, -0.03 + 0.05 * frac(u * 4), 0.006, 0.005 * Math.sin(u * 30))) : PW.penRest;
    let card: V = PW.box;
    if (k === 'take') card = lerpV(PW.box, reading, sm(u, 0.3, 1));
    else if (k === 'read') card = reading;
    else if (k === 'write') card = onLedge;
    else if (k === 'lift') card = lerpV(onLedge, slot, sm(u, 0, 1));
    else if (k === 'pin') card = slot;
    const props: Record<string, V> = { card, pen };
    switch (k) {
      case 'take':
        return { l: easy(c).l, gl: 0.3, tool: 'card', nod: 0.08, lean: 0.08, n, props };
      case 'read':
        return { l: easy(c).l, gl: 0.3, tool: 'card', nod: 0.28, lean: 0.03, n, props };
      case 'write':
        return { l: add(onLedge, -0.13, 0.01, 0.05), gl: 0.15, palms: 0.9, tool: 'pen', nod: 0.34, lean: 0.14, n: { ...n, inHand: 0 }, props };
      case 'lift':
        return { l: easy(c).l, gl: 0.3, tool: 'card', nod: 0.02, lean: 0.08, n, props };
      case 'pin':
        return { l: add(slot, -0.05, 0.02, 0.05), gl: 0.3, palms: 0.8, r: u > 0.5 ? add(slot, 0.05, 0.02, 0.05) : undefined, tool: u > 0.5 ? undefined : 'card', nod: -0.1, lean: 0.12, n, props };
      default:
        return { ...easy(c), nod: -0.06, lean: 0.01, n, props };
    }
  },
};

const SCRIPTS: Record<AsMotion, Script> = {
  asMonitor: MONITOR,
  asComms: COMMS,
  asAnomaly: ANOMALY,
  asBriefing: BRIEFING,
  asSuitCheck: SUIT_CHECK,
  asFitSuit: FIT_SUIT,
  asCarryHelmet: CARRY_HELMET,
  asLowWalk: LOW_WALK,
  asLowSample: LOW_SAMPLE,
  asArmCapture: ARM_CAPTURE,
  asArmBerth: ARM_BERTH,
  asGloveCrystal: CRYSTAL,
  asGloveFluid: FLUID,
  asShelter: SHELTER,
  asSignal: SIGNAL,
  asPress: PRESS,
  asCards: CARDS,
};
