import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the made-up 새솔 교정시설 (2026-11-01). Quiet and unhurried: the work shown is looking after people. Each motion is a round
 * of beats: where the dweller is, where the hands go, what moves; the piece reads the same script by the same clock
 * (correctionsOfficer.ts). No force, no restraint and nothing that could be used as a weapon anywhere; a quarrel is settled by talking.
 *
 * - 보안 관제 콘솔 (cctvConsole): gjWatch cameras gone through, one looked at closer, a line in the log, a word on the radio. gjCalm the
 *   alarm: two people quarrelling on the yard camera, a calm voice on the speaker, they step apart. gjShadow a senior beside the chair.
 * - 출입문 현황판 (gjDoorPanel): gjDoors each door's lamp tried in turn and checked by telephone.
 * - 복도 출입문 (gjGate): gjGateRound the key taken, turned, the gate slid back, shut, locked and tried.
 * - 순찰 확인 지점 (gjRoundPost): gjRoundLog the clock read, a card to the reader, the log signed.
 * - 접견실 칸막이 (visitBooth): gjVisit a family shown to their seat, the visit watched from aside, the time told kindly, a hand on the glass.
 * - 교화 상담 테이블 (counselTable): gjCounsel tea, listening, notes. gjPlan a course chosen and planned. gjRecord written up alone.
 *   gjLetter a letter home started together.
 * - 제빵 실습실 (gjWorkshop): gjBake shaping shown, a tray out of the oven. gjToolCheck the utensils counted back to their board.
 * - 도서 카트 (gjBookCart): gjBooks the cart pushed along, a book handed over, pushed back.
 * - 운동 마당 (gjYard): gjYardWatch basketball watched, the ball passed back. gjYardTalk a quarrel talked out.
 * - 의무 확인 창구 (gjMedCounter): gjMedCheck someone unwell seen to with the nurse.
 * - 소지품 보관함 (gjLockers): gjLockerGuide a visitor's bag put away, the key tag handed over.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's
 * right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), its place in `props`.
 */
export type GjMotion = 'gjWatch' | 'gjCalm' | 'gjShadow' | 'gjDoors' | 'gjGateRound' | 'gjRoundLog' | 'gjVisit' | 'gjCounsel' | 'gjPlan' | 'gjRecord' | 'gjLetter' | 'gjBake' | 'gjToolCheck' | 'gjBooks' | 'gjYardWatch' | 'gjYardTalk' | 'gjMedCheck' | 'gjLockerGuide';
export const GJ_MOTIONS = new Set<string>(['gjWatch', 'gjCalm', 'gjShadow', 'gjDoors', 'gjGateRound', 'gjRoundLog', 'gjVisit', 'gjCounsel', 'gjPlan', 'gjRecord', 'gjLetter', 'gjBake', 'gjToolCheck', 'gjBooks', 'gjYardWatch', 'gjYardTalk', 'gjMedCheck', 'gjLockerGuide']);
export type GjTool = 'pen' | 'mic' | 'cup' | 'board' | 'write' | 'key' | 'card' | 'handset' | 'tray' | 'book' | 'ball' | 'thermo' | 'tag' | 'bag';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const gjPhase = (p: THREE.Vector3) => frac(p.x * 0.331 + p.z * 0.587);
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
export const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;
const yawTo = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);

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
  tap?: boolean;
  tool?: GjTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  round: number;
  bd(side: number, up: number, ahead: number): V;
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string, round: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface GjNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: GjTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number): { st: St; key: Key } {
  const here = s.at(k, round);
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
export function gjNow(m: GjMotion, t: number, ph: number, H = 1.6): GjNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const last = b.i === s.seq.length - 1;
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, last ? b.n + 1 : b.n) : A;
  const e = b.e;
  const nearer = e < 0.5 ? A.st : B.st;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: nearer.sit };
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
export function gjPose(m: GjMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = gjNow(m, t, gjPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
    },
  };
}
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
/** Talking from a chair: a hand out over the desk's edge, palm up, moving with the sentence. */
const talkSit = (c: Ctx, side = 0.2): V => c.bd(side, 0.42 + 0.03 * Math.sin(c.t * 3.1), 0.3);
/** Talking on one's feet: an open hand in front, moving with the sentence. */
const talkUp = (c: Ctx, side = -0.2): V => c.bd(side, 1.04 + 0.03 * Math.sin(c.t * 2.9), 0.28);
/** Writing's place on a clipboard held on the left arm. */
const boardAt = (c: Ctx): V => c.bd(0.1, 1.0, 0.27);

/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;

// =============================================================================================
// 보안 관제 콘솔 (cctvConsole, 2 × 1): sat at the front, the screens at the back of a long desk; the wall of cameras behind it.

const CT = 0.74;
export const CN = {
  top: CT,
  seat: [0, 0.47, 0.62] as V,
  keys: [-0.14, CT + 0.03, 0.16] as V,
  stick: [0.4, CT + 0.02, 0.16] as V,
  log: [0.12, CT + 0.008, 0.18] as V,
  penHome: [0.3, CT + 0.012, 0.2] as V,
  micHome: [-0.46, CT + 0.11, 0.18] as V,
  senior: [0.78, 0.62] as const,
};
const conLeft = add(CN.keys, -0.1, 0.03, 0.05);
const conPen = (u: number, t: number): V => add(CN.log, -0.05 + 0.1 * frac(u * 3), PEN_UP + 0.004 * Math.sin(t * 15), 0.04 - 0.03 * Math.floor(u * 3));
const conMic = (c: Ctx): V => c.bd(0.12, 0.6, 0.2);
const WATCH: Script = {
  seq: [['scan', 3.2], ['ptz', 3.2], ['note', 3], ['radio', 2.6]],
  at: () => sat(CN.seat),
  key(k, u, c) {
    const n = { cam: k === 'scan' ? Math.floor(u * 4) : wrap(c.round, 4), zoom: k === 'ptz' ? sm(u, 0.1, 0.8) : 0, lines: 3 * c.p('note', 0, 0.95), okay: k === 'radio' ? 1 : 0 };
    const props = { pen: k === 'note' ? conPen(u, c.t) : CN.penHome, mic: k === 'radio' ? conMic(c) : CN.micHome };
    switch (k) {
      case 'scan':
        return { ...typing(CN.keys, c.t), lean: 0.05, nod: -0.08, n, props };
      case 'ptz':
        return { l: conLeft, gl: 0.25, r: add(CN.stick, 0.012 * Math.sin(c.t * 1.8), 0.09, 0.012 * Math.cos(c.t * 1.4)), gr: 0.75, palms: 0.05, lean: 0.14, nod: -0.1, n, props };
      case 'note':
        return { l: conLeft, gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.15, nod: 0.3, n, props };
      default:
        return { r: add(CN.keys, 0.2, 0.03, 0.05), gr: 0.25, tool: 'mic', palms: 0.05, lean: 0.06, nod: -0.04, n, props };
    }
  },
};
const CALM: Script = {
  seq: [['spot', 1.8], ['speak', 4.4], ['listen', 2.6], ['settled', 2.4], ['report', 3]],
  at: () => sat(CN.seat),
  key(k, u, c) {
    const n = { alert: k === 'spot' || k === 'speak' ? 1 : k === 'listen' ? 1 - sm(u, 0.3, 0.9) : 0, cam: 1, yard: 1, apart: k === 'spot' ? 0 : k === 'speak' ? sm(u, 0.45, 1) * 0.6 : k === 'listen' ? 0.6 + 0.4 * sm(u, 0, 0.7) : 1, say: k === 'speak' ? 1 : 0, settled: k === 'settled' || k === 'report' ? 1 : 0, lines: 3 * c.p('report', 0, 0.95) };
    const props = { pen: CN.penHome, mic: k === 'speak' || k === 'listen' ? conMic(c) : CN.micHome };
    switch (k) {
      case 'spot':
        return { ...typing(CN.keys, c.t), lean: 0.2, nod: -0.14, n, props };
      case 'speak':
        // The free hand low and open, as if they could see it.
        return { r: add(talkSit(c, -0.14), 0, 0.02 * Math.sin(c.t * 2.2), 0), gr: 0.1, tool: 'mic', palms: 0.5, lean: 0.12, nod: -0.06 + 0.03 * Math.sin(c.t * 2), n, props };
      case 'listen':
        return { r: add(CN.keys, 0.2, 0.03, 0.05), gr: 0.25, tool: 'mic', palms: 0.05, lean: 0.1, nod: -0.1, n, props };
      case 'settled':
        return { l: conLeft, gl: 0.25, r: add(CN.keys, 0.2, 0.03, 0.05), gr: 0.25, palms: 0.05, lean: 0.02, nod: 0.08 + 0.08 * Math.sin(u * PI), n, props };
      default:
        return { ...typing(CN.keys, c.t), lean: 0.06, nod: 0.04, n, props };
    }
  },
};
const SHADOW: Script = {
  seq: [['watch', 3.2], ['try', 3.4], ['praise', 2.4], ['note', 3]],
  at: () => sat(CN.seat),
  key(k, u, c) {
    const n = { senior: 1, point: k === 'watch' ? 1 : 0, cam: k === 'try' ? Math.floor(u * 3) : 2, zoom: k === 'try' ? sm(u, 0.2, 0.9) : 0, glad: k === 'praise' ? 1 : 0, lines: 3 * c.p('note', 0, 0.95), talk: k === 'watch' || k === 'praise' ? 1 : 0 };
    const props = { pen: k === 'note' ? conPen(u, c.t) : CN.penHome, mic: CN.micHome };
    switch (k) {
      case 'watch':
        // Turned to the senior a little, the hands in the lap's edge.
        return { l: conLeft, gl: 0.25, r: add(CN.keys, 0.2, 0.03, 0.05), gr: 0.25, palms: 0.05, lean: 0.04, nod: -0.06 + 0.05 * Math.sin(c.t * 1.8), n, props };
      case 'try':
        return { l: conLeft, gl: 0.25, r: add(CN.stick, 0.012 * Math.sin(c.t * 2), 0.09, 0), gr: 0.75, palms: 0.05, lean: 0.14, nod: -0.1, n, props };
      case 'praise':
        return { l: conLeft, gl: 0.25, r: add(CN.keys, 0.2, 0.03, 0.05), gr: 0.25, palms: 0.05, lean: 0.02, nod: 0.1 * Math.sin(u * PI * 2), n, props };
      default:
        return { l: conLeft, gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.15, nod: 0.3, n, props };
    }
  },
};

// =============================================================================================
// 출입문 현황판 (gjDoorPanel, 2 × 1): a plan of the doors with their lamps on the back wall, a button under each, a telephone at its side.

export const DP = {
  face: -0.34,
  stand: 0.02,
  /** The door lamps tried: x across, y up. */
  doors: [[-0.48, 1.34], [-0.16, 1.34], [0.16, 1.34], [-0.48, 1.04], [-0.16, 1.04], [0.16, 1.04]] as ReadonlyArray<readonly [number, number]>,
  phone: [0.8, 1.18, -0.26] as V,
};
export const doorOf = (i: number) => DP.doors[wrap(i, DP.doors.length)];
const doorBtn = (i: number): V => {
  const d = doorOf(i);
  return [d[0], d[1] - 0.1, DP.face + 0.03];
};
const DOORS: Script = {
  seq: [['read', 2.2], ['t0', 1.5], ['t1', 1.5], ['t2', 1.5], ['call', 3], ['done', 1.6]],
  at: (k, round) => {
    const base = wrap(round, 2) * 3;
    return k === 't0' || k === 't1' || k === 't2' ? st(doorOf(base + Number(k[1]))[0] + 0.1, DP.stand) : k === 'call' ? st(0.28, DP.stand) : st(-0.1, DP.stand);
  },
  key(k, u, c) {
    const base = wrap(c.round, 2) * 3;
    const ti = k[0] === 't' ? Number(k[1]) : -1;
    const n = { base, trying: ti >= 0 ? base + ti : -1, ok: 3 * ((c.p('t0', 0.6, 0.7) + c.p('t1', 0.6, 0.7) + c.p('t2', 0.6, 0.7)) / 3), blink: ti >= 0 && u < 0.6 ? 1 : 0, phone: k === 'call' ? 1 : 0, done: k === 'done' ? 1 : 0 };
    const props = { handset: k === 'call' ? (u < 0.15 ? lerpV(DP.phone, c.bd(-0.17, 1.44, 0.05), sm(u, 0, 0.15)) : u > 0.88 ? lerpV(c.bd(-0.17, 1.44, 0.05), DP.phone, sm(u, 0.88, 1)) : c.bd(-0.17, 1.44, 0.05)) : DP.phone };
    if (ti >= 0) {
      const b = doorBtn(base + ti);
      return { ...easy(c), r: add(b, 0, 0, 0.012 + 0.03 * Math.abs(Math.cos(u * PI * 1.5))), gr: 0.25, palms: 0.1, tap: true, lean: 0.1, nod: b[1] > 1.15 ? -0.04 : 0.1, n, props };
    }
    switch (k) {
      case 'read':
        return { ...easy(c), r: c.bd(-0.14, 1.12, 0.26), gr: 0.15, palms: 0.1, nod: -0.06, n, props };
      case 'call':
        return { ...easy(c), tool: 'handset', r: undefined, nod: 0.06 + 0.04 * Math.sin(c.t * 1.7), n, props };
      default:
        return { ...easy(c), nod: 0.1 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 복도 출입문 (gjGate, 2 × 1): a sliding gate of painted steel on the back wall, the corridor painted beyond; a key box at its left.

export const GT = {
  plane: -0.2,
  /** Where the leaf's handle and lock are, shut. */
  lock: [0.34, 1.1, -0.17] as V,
  handle: [0.2, 1.06, -0.15] as V,
  slide: 0.72,
  keyHome: [-0.74, 1.24, -0.28] as V,
  stand: 0.2,
};
const keyLock: V = add(GT.lock, 0, 0, 0.08);
const GATE: Script = {
  seq: [['keys', 1.7, 0.8], ['unlock', 2.1], ['open', 1.6], ['look', 2.4], ['shut', 1.6], ['lock', 2], ['tug', 1.2, 0.8], ['hang', 1.5]],
  at: (k) => (k === 'keys' || k === 'hang' ? st(-0.56, 0.1) : st(0.02, GT.stand)),
  key(k, u, c) {
    const pocket: V = c.bd(-0.2, 0.98, 0.2);
    const key: V = k === 'keys' ? lerpV(GT.keyHome, pocket, sm(u, 0.45, 1)) : k === 'hang' ? lerpV(pocket, GT.keyHome, sm(u, 0, 0.6)) : k === 'unlock' || k === 'lock' ? lerpV(pocket, keyLock, sm(u, 0, 0.35)) : pocket;
    const open = k === 'open' ? sm(u, 0.1, 0.9) : k === 'look' ? 1 : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : 0;
    const n = { open, turn: k === 'unlock' ? sm(u, 0.45, 0.75) : k === 'lock' ? 1 - sm(u, 0.45, 0.75) : k === 'open' || k === 'look' || k === 'shut' ? 1 : 0, boxOpen: k === 'keys' ? 1 - sm(u, 0.7, 1) : k === 'hang' ? sm(u, 0, 0.2) * (1 - sm(u, 0.8, 1)) : 0, keyOut: k === 'keys' ? sm(u, 0.4, 0.5) : k === 'hang' ? 1 - sm(u, 0.55, 0.65) : 1 };
    const props = { key };
    const leaf: V = [GT.handle[0] - GT.slide * open, GT.handle[1], GT.handle[2] + 0.03];
    switch (k) {
      case 'keys':
        return { ...easy(c), tool: 'key', r: undefined, lean: 0.1, nod: -0.02, n, props };
      case 'hang':
        return { ...easy(c), tool: 'key', r: undefined, lean: 0.08, nod: -0.02, n, props };
      case 'unlock':
      case 'lock':
        return { l: add(GT.handle, -0.1, 0.12, 0.03), gl: 0.5, palms: 0.2, tool: 'key', lean: 0.1, nod: 0.1, n, props };
      case 'open':
      case 'shut':
        return { ...easy(c), r: undefined, tool: 'key', l: leaf, gl: 0.7, palms: 0.2, lean: 0.1, nod: 0.02, n, props };
      case 'look':
        return { ...easy(c), r: undefined, tool: 'key', l: c.bd(0.2, 0.9, 0.1), nod: -0.04, n, props };
      default:
        return { ...easy(c), r: undefined, tool: 'key', l: add(GT.handle, 0, 0.012 * Math.sin(u * 18), 0.03), gl: 0.75, palms: 0.2, lean: 0.08, nod: 0.04, n, props };
    }
  },
};

// =============================================================================================
// 순찰 확인 지점 (gjRoundPost, 1 × 1): a board on the wall with a clock and a card reader; the log on a sloping shelf, its pen on a chain.

export const RP = {
  face: -0.34,
  stand: 0.2,
  clock: [-0.22, 1.56, -0.32] as V,
  reader: [0.28, 1.28, -0.31] as V,
  book: [0, 1.05, -0.14] as V,
  penHome: [0.26, 1.08, -0.08] as V,
};
const ROUND: Script = {
  seq: [['clock', 1.8], ['tag', 1.7], ['write', 3.4], ['sign', 1.4], ['listen', 2.2]],
  at: () => st(0, RP.stand),
  key(k, u, c) {
    const pocket: V = c.bd(-0.22, 1.0, 0.14);
    const tapAt: V = add(RP.reader, 0, -0.01, 0.05);
    const card: V = k === 'tag' ? (u < 0.5 ? lerpV(pocket, tapAt, sm(u, 0.05, 0.5)) : lerpV(tapAt, pocket, sm(u, 0.72, 1))) : pocket;
    const pen: V = k === 'write' ? add(RP.book, -0.08 + 0.15 * frac(u * 3), PEN_UP + 0.004 * Math.sin(c.t * 15), 0.06 - 0.04 * Math.floor(u * 3)) : k === 'sign' ? add(RP.book, 0.05 + 0.03 * Math.sin(u * 16), PEN_UP, -0.06) : RP.penHome;
    const n = { beep: k === 'tag' && u > 0.4 && u < 0.72 ? 1 : 0, lines: 3 * c.p('write', 0, 0.97), signed: c.p('sign', 0.6, 0.9), lookUp: k === 'clock' ? 1 : 0 };
    const props = { card, pen };
    const hold: V = add(RP.book, -0.15, 0.03, 0.08);
    switch (k) {
      case 'clock':
        return { ...easy(c), r: c.bd(-0.16, 1.14, 0.26), gr: 0.15, palms: 0.1, nod: -0.16, n, props };
      case 'tag':
        return { ...easy(c), r: undefined, tool: 'card', nod: -0.05, lean: 0.08, n, props };
      case 'write':
      case 'sign':
        return { l: hold, gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.14, nod: 0.34, n, props };
      default:
        // A pause to listen down the corridor before going on.
        return { ...easy(c), nod: -0.03, lean: 0.01, n, props };
    }
  },
};

// =============================================================================================
// 접견실 칸막이 (visitBooth, 2 × 1): glass across the middle, a telephone each side; the family on the front, the one they've come to see beyond.

const VT = 0.74;
export const VB = {
  top: VT,
  glassZ: 0,
  sideX: -0.5,
  visitor: [-0.5, 0.47, 0.58] as V,
  inside: [-0.5, 0.47, -0.58] as V,
  /** Aside, so it isn't over their shoulders: from here the dweller can see them both. */
  stand: [0.62, 0.84] as const,
};
const VISIT_YAW = yawTo(VB.stand[0], VB.stand[1], -0.42, 0.1);
export const VISIT_MINUTES = 10;
const VISIT: Script = {
  seq: [['greet', 2.4], ['clock', 1.8], ['log', 3.6], ['watch', 4], ['remind', 2.4], ['part', 3]],
  at: () => st(VB.stand[0], VB.stand[1], VISIT_YAW),
  key(k, u, c) {
    const n = { people: 1, seated: k === 'greet' ? sm(u, 0.2, 0.7) : 1, talk: k === 'log' || k === 'watch' || k === 'clock' ? 1 : 0, phones: k === 'greet' ? sm(u, 0.7, 1) : k === 'part' ? 1 - sm(u, 0, 0.3) : 1, left: k === 'greet' ? VISIT_MINUTES : k === 'clock' ? 9 : k === 'log' ? 8 - 2 * u : k === 'watch' ? 6 - 4 * u : k === 'remind' ? 2 - u : 0, amber: k === 'remind' ? 1 : 0, palm: k === 'part' ? sm(u, 0.25, 0.5) : 0, lines: 3 * c.p('log', 0, 0.95), px: k === 'log' ? frac(u * 3) : 1, pz: k === 'log' ? Math.floor(u * 3) / 3 : 0.9, pen: k === 'log' ? 1 : 0 };
    const props = { board: boardAt(c) };
    switch (k) {
      case 'greet':
        return { tool: 'board', r: talkUp(c, -0.22), gr: 0.1, palms: 0.5, lean: 0.04, nod: 0.08 * Math.sin(c.t * 2.2), n, props };
      case 'clock':
        return { tool: 'board', r: c.bd(-0.2, 0.92, 0.12), gr: 0.3, palms: 0.2, nod: -0.04, n, props };
      case 'log':
        return { tool: 'write', lean: 0.04, nod: 0.34, n, props };
      case 'watch':
        return { tool: 'board', r: c.bd(-0.2, 0.92, 0.12), gr: 0.3, palms: 0.2, nod: 0.03, n, props };
      case 'remind':
        return { tool: 'board', r: talkUp(c, -0.22), gr: 0.1, palms: 0.45, lean: 0.06, nod: 0.1, n, props };
      default:
        return { tool: 'board', r: c.bd(-0.2, 0.92, 0.12), gr: 0.3, palms: 0.2, nod: 0.1, n, props };
    }
  },
};

// =============================================================================================
// 교화 상담 테이블 (counselTable, 2 × 1): a plain wooden table, two chairs, the dweller on the room's side.

const TT = 0.72;
export const TB = {
  top: TT,
  seat: [0, 0.47, 0.54] as V,
  other: [0, 0.47, -0.54] as V,
  note: [0.14, TT + 0.004, 0.16] as V,
  penHome: [0.34, TT + 0.012, 0.16] as V,
  cupHome: [0.3, TT + 0.05, 0.02] as V,
  cupThere: [0.1, TT + 0.05, -0.1] as V,
  pamphlet: [-0.14, TT + 0.006, 0.14] as V,
  pamThere: [-0.04, TT + 0.006, -0.08] as V,
  pad: [-0.02, TT + 0.006, -0.08] as V,
  laptop: [-0.4, TT, 0.04] as V,
};
const tbLeft = add(TB.note, -0.28, 0.03, 0.06);
const tbPen = (u: number, t: number): V => add(TB.note, -0.05 + 0.1 * frac(u * 3), PEN_UP + 0.004 * Math.sin(t * 15), -0.05 + 0.04 * Math.floor(u * 3));
const COUNSEL: Script = {
  seq: [['tea', 2.3], ['listen', 3.8], ['note', 3.4], ['talk', 3.2], ['nod', 2.4]],
  at: () => sat(TB.seat),
  key(k, u, c) {
    const n = { other: 1, speaks: k === 'listen' ? 1 : 0, nods: k === 'talk' || k === 'nod' ? 1 : 0, lines: 3 * c.p('note', 0.05, 0.95), glad: k === 'nod' ? 1 : 0, cupTaken: k === 'tea' ? 0 : 1 };
    const props = { pen: k === 'note' ? tbPen(u, c.t) : TB.penHome, cup: k === 'tea' ? lerpV(TB.cupHome, TB.cupThere, sm(u, 0.15, 0.85)) : k === 'nod' && u > 0.98 ? null : TB.cupThere };
    switch (k) {
      case 'tea':
        return { l: tbLeft, gl: 0.2, palms: 0.05, tool: 'cup', lean: 0.2, nod: 0.12, n, props };
      case 'listen':
        return { l: add(TB.note, -0.2, 0.05, 0.08), gl: 0.45, r: add(TB.note, -0.1, 0.05, 0.08), gr: 0.45, palms: 0.05, lean: 0.12, nod: 0.08 + 0.07 * Math.sin(c.t * 1.6), n, props };
      case 'note':
        return { l: tbLeft, gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      case 'talk':
        return { l: talkSit(c, 0.18), gl: 0.15, r: talkSit(c, -0.18), gr: 0.15, palms: 0.5, lean: 0.1, nod: 0.06, n, props };
      default:
        return { l: add(TB.note, -0.2, 0.05, 0.08), gl: 0.4, r: add(TB.note, -0.1, 0.05, 0.08), gr: 0.4, palms: 0.05, lean: 0.06, nod: 0.08 + 0.08 * Math.sin(u * PI * 2), n, props };
    }
  },
};
export const COURSES = ['제과·제빵', '조리', '목공', '바리스타', '용접 기초', '컴퓨터'];
const PLAN: Script = {
  seq: [['open', 2], ['point', 3.6], ['ask', 2.8], ['write', 3.6], ['hand', 2.2], ['glad', 2.2]],
  at: () => sat(TB.seat),
  key(k, u, c) {
    const n = { other: 1, plan: 1, sel: k === 'point' ? Math.floor(u * 3) : wrap(c.round, 3), speaks: k === 'ask' ? 1 : 0, lines: 3 * c.p('write', 0.05, 0.95), reach: k === 'hand' && u > 0.5 ? 1 : 0, nods: k === 'glad' ? 1 : 0, glad: k === 'glad' ? 1 : 0, chosen: c.p('ask', 0.6, 0.8) };
    const pamphlet: V = k === 'hand' ? lerpV(TB.pamphlet, TB.pamThere, sm(u, 0.1, 0.8)) : k === 'glad' ? TB.pamThere : TB.pamphlet;
    const props = { pen: k === 'write' ? tbPen(u, c.t) : TB.penHome, pamphlet };
    switch (k) {
      case 'open':
        return { l: add(TB.pamphlet, -0.1, 0.03, 0.04), gl: 0.3, r: add(TB.pamphlet, 0.1, 0.03, 0.04), gr: 0.3, palms: 0.05, lean: 0.14, nod: 0.26, n, props };
      case 'point':
        return { l: tbLeft, gl: 0.2, r: add(TB.pamphlet, -0.04 + 0.08 * frac(u * 3), 0.025, -0.06 + 0.05 * Math.floor(u * 3)), gr: 0.12, palms: 0.05, lean: 0.18, nod: 0.28, n, props };
      case 'ask':
        return { l: talkSit(c, 0.18), gl: 0.15, r: talkSit(c, -0.18), gr: 0.15, palms: 0.5, lean: 0.08, nod: 0.05 + 0.05 * Math.sin(c.t * 1.8), n, props };
      case 'write':
        return { l: tbLeft, gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      case 'hand':
        return { l: tbLeft, gl: 0.2, r: add(pamphlet, 0.03, 0.025, 0.06), gr: 0.25, palms: 0.05, lean: 0.2, nod: 0.14, n, props };
      default:
        return { l: tbLeft, gl: 0.2, r: talkSit(c, -0.16), gr: 0.15, palms: 0.5, lean: 0.05, nod: 0.08 + 0.08 * Math.sin(u * PI * 2), n, props };
    }
  },
};
const RECORD: Script = {
  seq: [['read', 3], ['write', 4.2], ['type', 3.2], ['close', 1.8]],
  at: () => sat(TB.seat),
  key(k, u, c) {
    const lid = k === 'close' ? 1 - sm(u, 0.2, 0.8) : 1;
    const n = { record: 1, lines: 4 * c.p('write', 0.03, 0.97), fill: 3 * c.p('type', 0, 0.95), lid, ticks: k === 'read' ? u * 2 : 2 };
    const props = { pen: k === 'write' ? tbPen(u, c.t) : TB.penHome };
    switch (k) {
      case 'read':
        return { l: tbLeft, gl: 0.2, r: add(TB.note, -0.06 + 0.1 * frac(u * 2), 0.03, -0.06 + 0.1 * u), gr: 0.15, palms: 0.05, lean: 0.14, nod: 0.3, n, props };
      case 'write':
        return { l: tbLeft, gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.33, n, props };
      case 'type':
        return { ...typing(add(TB.laptop, 0.14, 0.02, 0.13), c.t), lean: 0.1, nod: 0.12, n, props };
      default:
        return { l: tbLeft, gl: 0.2, r: add(TB.note, 0, 0.05, 0), gr: 0.3, palms: 0.05, lean: 0.06, nod: 0.08, n, props };
    }
  },
};
const LETTER: Script = {
  seq: [['paper', 2], ['show', 3.2], ['wait', 4.6], ['read', 2.6], ['fold', 2.2]],
  at: () => sat(TB.seat),
  key(k, u, c) {
    const n = { other: 1, letter: 1, shown: k === 'paper' ? sm(u, 0.2, 0.9) : 1, writes: k === 'wait' ? 1 : 0, written: c.p('wait', 0, 0.97), speaks: k === 'read' ? 1 : 0, nods: k === 'show' || k === 'read' ? 1 : 0, env: k === 'fold' ? sm(u, 0.3, 0.8) : 0, glad: k === 'fold' ? 1 : 0 };
    const props = { pen: TB.penHome };
    switch (k) {
      case 'paper':
        return { l: tbLeft, gl: 0.2, r: add(TB.pad, 0.1 * (1 - sm(u, 0.1, 0.8)) + 0.08, 0.03, 0.14 * (1 - sm(u, 0.1, 0.8)) + 0.08), gr: 0.25, palms: 0.05, lean: 0.22, nod: 0.22, n, props };
      case 'show':
        // Reading the first line out with a finger, upside down to them both ways.
        return { l: tbLeft, gl: 0.2, r: add(TB.pad, 0.08 - 0.12 * frac(u * 2), 0.03, 0.1), gr: 0.12, palms: 0.05, lean: 0.22, nod: 0.28, n, props };
      case 'wait':
        return { l: add(TB.note, -0.22, 0.05, 0.08), gl: 0.45, r: add(TB.note, -0.12, 0.05, 0.08), gr: 0.45, palms: 0.05, lean: 0.06, nod: 0.16 + 0.03 * Math.sin(c.t * 1.2), n, props };
      case 'read':
        return { l: tbLeft, gl: 0.2, r: talkSit(c, -0.16), gr: 0.15, palms: 0.5, lean: 0.08, nod: 0.08 + 0.05 * Math.sin(c.t * 2), n, props };
      default:
        return { l: tbLeft, gl: 0.2, r: talkSit(c, -0.16), gr: 0.15, palms: 0.5, lean: 0.03, nod: 0.08 * Math.sin(u * PI * 2), n, props };
    }
  },
};

// =============================================================================================
// 제빵 실습실 (gjWorkshop, 4 × 2): a long bench; the trainees behind it facing the room, the dweller on the front; the oven at its left end.

const WT = 0.88;
export const WS = {
  top: WT,
  benchZ: -0.05,
  stand: 0.52,
  trainees: [[-0.42, -0.72], [0.62, -0.72]] as ReadonlyArray<readonly [number, number]>,
  dough: [-0.42, WT + 0.04, -0.08] as V,
  own: [-0.42, WT + 0.04, 0.14] as V,
  ovenX: -1.52,
  ovenFace: 0.14,
  ovenRack: [-1.52, 0.86, 0.02] as V,
  coolAt: [-0.92, WT + 0.024, 0.08] as V,
  toolBoard: [1.26, 1.14, -0.02] as V,
  /** The utensils on the board, in the board's own x. */
  slots: 6,
};
const trayOut = add(WS.ovenRack, 0, 0, 0.24);
const BAKE: Script = {
  seq: [['look', 2.4], ['show', 3.8], ['praise', 2.2, 1], ['open', 1.5], ['tray', 1.6, 0.9], ['set', 1.4], ['taste', 2.4, 0.9]],
  at: (k) => (k === 'open' || k === 'tray' ? st(WS.ovenX, WS.stand + 0.1) : k === 'set' || k === 'taste' ? st(WS.coolAt[0], WS.stand) : st(WS.dough[0], WS.stand)),
  key(k, u, c) {
    const hold: V = c.bd(0, 1.04, 0.28);
    const tray: V = k === 'tray' ? lerpV(trayOut, hold, sm(u, 0.25, 0.95)) : k === 'set' ? lerpV(hold, WS.coolAt, sm(u, 0.1, 0.8)) : k === 'taste' ? WS.coolAt : trayOut;
    const roll = Math.sin(c.t * 5);
    const n = { people: 1, shaping: k === 'show' ? 1 : 0, ball: c.p('show', 0, 0.9), door: k === 'open' ? sm(u, 0.2, 0.9) : k === 'tray' ? 1 - sm(u, 0.7, 1) : 0, baked: k === 'tray' || k === 'set' || k === 'taste' ? 1 : 0, trayOut: c.p('open', 0.9, 1), glad: k === 'taste' ? 1 : 0, nodA: k === 'look' || k === 'praise' ? 1 : 0, heat: k === 'open' ? 0.4 : 1 };
    const props = { tray };
    switch (k) {
      case 'look':
        return { ...easy(c), r: add(WS.dough, 0.14, 0.02, 0.04), gr: 0.15, palms: 0.1, lean: 0.2, nod: 0.3, n, props };
      case 'show':
        return { l: add(WS.own, -0.05 + 0.02 * roll, 0.05, 0.015 * Math.cos(c.t * 5)), gl: 0.45, r: add(WS.own, 0.05 + 0.02 * roll, 0.05, -0.015 * Math.cos(c.t * 5)), gr: 0.45, palms: 0.02, lean: 0.24, nod: 0.36, n, props };
      case 'praise':
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, lean: 0.03, nod: 0.08 * Math.sin(c.t * 2.4), n, props };
      case 'open':
        return { ...easy(c), r: [WS.ovenX + 0.05, 1.08 - 0.22 * sm(u, 0.2, 0.9), WS.ovenFace + 0.06 + 0.32 * sm(u, 0.2, 0.9)], gr: 0.65, palms: 0.2, lean: 0.14, nod: 0.2, n, props };
      case 'tray':
        return { tool: 'tray', lean: u < 0.3 ? 0.2 : 0.06, nod: 0.24, n, props };
      case 'set':
        return { tool: 'tray', lean: 0.14, nod: 0.26, n, props };
      default:
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.45, lean: 0.03, nod: 0.06 + 0.08 * Math.sin(u * PI), n, props };
    }
  },
};
const TOOLS: Script = {
  seq: [['take', 1.6], ['count', 4.2], ['wait', 2.4], ['back', 2.4], ['tick', 3], ['done', 1.6]],
  at: () => st(WS.toolBoard[0], WS.stand),
  key(k, u, c) {
    const slot = k === 'count' ? Math.floor(u * (WS.slots - 1)) : k === 'back' || k === 'wait' ? WS.slots - 1 : -1;
    const n = { people: 1, slot, returned: k === 'back' ? sm(u, 0.45, 0.7) : k === 'tick' || k === 'done' ? 1 : 0, giving: k === 'back' || k === 'wait' ? 1 : 0, lines: (WS.slots - 1) * (k === 'count' ? u : c.p('count')) + c.p('tick', 0.4, 0.9), pen: k === 'tick' ? 1 : 0, px: k === 'tick' ? frac(u * 3) : 1, pz: k === 'tick' ? 0.2 + 0.4 * u : 0.9 };
    const props = { board: boardAt(c) };
    const point = (i: number): V => add(WS.toolBoard, -0.18 + (0.46 * wrap(i, WS.slots)) / (WS.slots - 1), 0, 0.1);
    switch (k) {
      case 'take':
        return { tool: 'board', r: c.bd(-0.2, 0.92, 0.12), gr: 0.3, palms: 0.2, nod: 0.3, n, props };
      case 'count':
        return { tool: 'board', r: point(slot), gr: 0.12, palms: 0.2, lean: 0.08, nod: 0.12, n, props };
      case 'wait':
        return { tool: 'board', r: c.bd(-0.2, 0.92, 0.12), gr: 0.3, palms: 0.2, nod: 0.02, n, props };
      case 'back':
        return { tool: 'board', r: point(WS.slots - 1), gr: 0.12, palms: 0.2, lean: 0.06, nod: 0.1, n, props };
      case 'tick':
        return { tool: 'write', lean: 0.04, nod: 0.34, n, props };
      default:
        return { tool: 'board', r: talkUp(c), gr: 0.1, palms: 0.45, nod: 0.08 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 도서 카트 (gjBookCart, 1 × 1): a two-tier cart, pushed along the room's aisle to a reader and back.

export const BC = {
  handleOff: 0.42,
  handleY: 0.96,
  far: 1.8,
  stand: 0.72,
  reader: [2.3, 0.86] as const,
  topShelf: 0.84,
};
const bookOff: V = [0.1, BC.topShelf + 0.08, 0.13];
const BOOKS: Script = {
  seq: [['ready', 1.4, 2.6], ['stop', 0.6], ['pick', 1.6], ['give', 1.8], ['thanks', 2, 1], ['end', 0.3, 2.6], ['home', 0.2, 0.7], ['round', 0.1, 0.7]],
  at(k) {
    const sideZ = 0.42;
    switch (k) {
      case 'ready':
        return st(-BC.stand, 0, PI / 2);
      case 'stop':
        return st(BC.far - BC.stand, 0, PI / 2);
      case 'pick':
        return st(BC.far + 0.06, sideZ, yawTo(BC.far + 0.06, sideZ, BC.far + 0.1, 0));
      case 'give':
      case 'thanks':
        return st(BC.far + 0.06, sideZ, yawTo(BC.far + 0.06, sideZ, BC.reader[0], BC.reader[1]));
      case 'end':
        return st(BC.far + BC.stand, 0, -PI / 2);
      case 'round':
        return st(0, 0.5, PI / 2);
      default:
        return st(BC.stand, 0, -PI / 2);
    }
  },
  key(k, u, c) {
    const atCart: V = [BC.far + bookOff[0], bookOff[1], bookOff[2]];
    const hold: V = c.bd(-0.14, 1.02, 0.24);
    const readerHand: V = [BC.reader[0] - 0.1, 1.02, BC.reader[1] - 0.3];
    const book: V = k === 'pick' ? lerpV(atCart, hold, sm(u, 0.35, 0.95)) : k === 'give' ? lerpV(hold, readerHand, sm(u, 0.1, 0.8)) : k === 'thanks' ? readerHand : atCart;
    const n = { cx: k === 'ready' || k === 'home' || k === 'round' ? 0 : BC.far, reader: k === 'stop' || k === 'pick' || k === 'give' || k === 'thanks' ? 1 : 0, reach: k === 'give' ? sm(u, 0.4, 0.7) : k === 'thanks' ? 1 : 0, gone: k === 'thanks' ? 1 : 0, glad: k === 'thanks' ? 1 : 0, rolling: k === 'ready' || k === 'end' ? 1 : 0 };
    const props = { book: k === 'pick' || k === 'give' || k === 'thanks' ? book : null };
    const hands = (x: number, side: number): Partial<Key> => ({ l: [x - side * BC.handleOff, BC.handleY, -side * 0.15], r: [x - side * BC.handleOff, BC.handleY, side * 0.15], gl: 0.7, gr: 0.7, palms: 0.05, lean: 0.08, nod: 0.06 });
    switch (k) {
      case 'ready':
        return { ...hands(0, 1), n, props };
      case 'stop':
        return { ...hands(BC.far, 1), n, props };
      case 'pick':
        return u < 0.35 ? { ...easy(c), r: add(atCart, 0, 0.03, 0.02), gr: 0.4, lean: 0.14, nod: 0.3, n, props } : { ...easy(c), r: undefined, tool: 'book', lean: 0.08, nod: 0.2, n, props };
      case 'give':
        return u < 0.8 ? { ...easy(c), r: undefined, tool: 'book', lean: 0.1, nod: 0.06, n, props } : { ...easy(c), r: talkUp(c), gr: 0.15, palms: 0.5, nod: 0.05, n, props };
      case 'thanks':
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, nod: 0.08 * Math.sin(u * PI * 2), n, props };
      case 'end':
        return { ...hands(BC.far, -1), n, props };
      case 'round':
        return { ...easy(c), n, props };
      default:
        return { ...hands(0, -1), n, props };
    }
  },
};

// =============================================================================================
// 운동 마당 (gjYard, 4 × 4): a court with a hoop at its back, a bench, low fencing; two people playing, the dweller towards the front.

export const YD = {
  rim: [0, 2.04, -1.34] as V,
  a: [-0.55, -0.25] as const,
  b: [0.65, -0.6] as const,
  dweller: [1.15, 1.08] as const,
  mid: [0.05, 0.3] as const,
  ballRest: [1.62, 0.13, -0.28] as V,
};
const DWELLER_YAW = yawTo(YD.dweller[0], YD.dweller[1], 0, -0.6);
const handOf = (p: readonly [number, number], up = 1.42): V => [p[0], up, p[1] + 0.02];
/** A ball thrown from one place to another, rising `h` over the middle. */
const arc = (a: V, b: V, e: number, h: number): V => [mixN(a[0], b[0], e), mixN(a[1], b[1], e) + h * Math.sin(PI * e), mixN(a[2], b[2], e)];
const YARD_WATCH: Script = {
  seq: [['watch', 3.4], ['roll', 1.1, 0.25], ['catch', 1.1, 0.25], ['pass', 0.9, 0.25], ['back', 0.8], ['chat', 2.6], ['note', 2.8]],
  at: () => st(YD.dweller[0], YD.dweller[1], DWELLER_YAW),
  key(k, u, c) {
    const hold: V = c.bd(0, 1.04, 0.28);
    const A = handOf(YD.a, 1.5);
    const B = handOf(YD.b, 1.0);
    let ball: V;
    if (k === 'watch') {
      const w = frac(u * 2);
      ball = w < 0.55 ? arc(A, YD.rim, sm(w, 0, 0.55), 0.5) : arc(YD.rim, B, sm(w, 0.55, 1), 0.1);
    } else if (k === 'roll') ball = arc(B, hold, sm(u, 0, 1), 0.3);
    else if (k === 'catch') ball = add(hold, 0, -0.02 * Math.sin(u * PI), 0);
    else if (k === 'pass') ball = hold;
    else if (k === 'back') ball = arc(hold, A, sm(u, 0, 1), 0.45);
    else ball = A;
    const n = { people: 1, aimA: k === 'watch' && frac(u * 2) < 0.2 ? 1 : k === 'chat' || k === 'note' ? 0.5 : 0, reachB: k === 'watch' && frac(u * 2) > 0.8 ? 1 : k === 'roll' && u < 0.2 ? 1 : 0, face: 1, glad: k === 'chat' ? 1 : 0, lines: 3 * c.p('note', 0, 0.95), pen: k === 'note' ? 1 : 0, px: k === 'note' ? frac(u * 3) : 1, pz: k === 'note' ? Math.floor(u * 3) / 3 : 0.9 };
    const props = { ball, board: boardAt(c) };
    switch (k) {
      case 'watch':
        return { ...easy(c), nod: -0.08 + 0.04 * Math.sin(c.t * 1.2), n, props };
      case 'roll':
        return { l: add(hold, -0.12 * Math.cos(DWELLER_YAW), 0, 0.12 * Math.sin(DWELLER_YAW)), r: add(hold, 0.12 * Math.cos(DWELLER_YAW), 0, -0.12 * Math.sin(DWELLER_YAW)), gl: 0.25, gr: 0.25, palms: 0.4, lean: 0.06, nod: 0.1, n, props };
      case 'catch':
      case 'pass':
        return { tool: 'ball', lean: 0.06, nod: 0.06, n, props };
      case 'back':
        return { l: c.bd(0.14, 1.18, 0.34), r: c.bd(-0.14, 1.18, 0.34), gl: 0.05, gr: 0.05, palms: 0.4, lean: 0.06, nod: -0.1, n, props };
      case 'chat':
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, nod: 0.05 * Math.sin(c.t * 2), n, props };
      default:
        return { tool: 'write', lean: 0.04, nod: 0.34, n, props };
    }
  },
};
const YARD_TALK: Script = {
  seq: [['hear', 2, 1.4], ['between', 2.6], ['toA', 3], ['toB', 3], ['sit', 2.6], ['shake', 2.6], ['leave', 1.2, 1.4]],
  at: (k) => {
    const [mx, mz] = YD.mid;
    if (k === 'hear' || k === 'leave') return st(YD.dweller[0], YD.dweller[1], DWELLER_YAW);
    if (k === 'toA') return st(mx, mz, yawTo(mx, mz, YD.a[0], YD.a[1]));
    if (k === 'toB') return st(mx, mz, yawTo(mx, mz, YD.b[0], YD.b[1]));
    return st(mx, mz, PI);
  },
  key(k, u, c) {
    const heat = k === 'hear' || k === 'between' ? 1 : k === 'toA' ? 1 - 0.4 * u : k === 'toB' ? 0.6 - 0.5 * u : 0;
    const n = { people: 1, quarrel: heat, face: k === 'leave' ? sm(u, 0.3, 1) : 0, sayA: k === 'hear' && u < 0.5 ? 1 : k === 'between' && u < 0.3 ? 1 : 0, sayB: k === 'hear' && u >= 0.5 ? 1 : k === 'between' && u >= 0.3 && u < 0.6 ? 1 : 0, calmWord: k === 'between' && u >= 0.6 ? 1 : 0, nodA: k === 'toA' || k === 'sit' ? 1 : 0, nodB: k === 'toB' || k === 'sit' ? 1 : 0, shake: k === 'shake' ? sm(u, 0.1, 0.5) : 0, sorry: k === 'shake' ? 1 : 0 };
    const props = { ball: YD.ballRest };
    switch (k) {
      case 'hear':
        return { ...easy(c), nod: -0.06, lean: 0.04, n, props };
      case 'between':
        // Hands low and open, palms showing: nobody is touched.
        return { l: c.bd(0.22, 0.98 + 0.02 * Math.sin(c.t * 2.2), 0.24), r: c.bd(-0.22, 0.98 + 0.02 * Math.sin(c.t * 2.2), 0.24), gl: 0.05, gr: 0.05, palms: 0.5, lean: 0.03, nod: 0.05, n, props };
      case 'toA':
      case 'toB':
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, lean: 0.05, nod: 0.05 + 0.06 * Math.sin(c.t * 1.9), n, props };
      case 'sit':
        return { l: talkUp(c, 0.2), gl: 0.1, r: talkUp(c, -0.2), gr: 0.1, palms: 0.5, lean: 0.03, nod: 0.08, n, props };
      case 'shake':
        return { ...easy(c), nod: 0.04 + 0.08 * Math.sin(u * PI), lean: 0.02, n, props };
      default:
        return { ...easy(c), nod: 0.05, n, props };
    }
  },
};

// =============================================================================================
// 의무 확인 창구 (gjMedCounter, 2 × 1): a low counter, the nurse behind it; someone unwell on a stool at its left.

const MT = 0.88;
export const MD = {
  top: MT,
  nurse: [-0.35, -0.82] as const,
  patient: [-0.56, 0.47, 0.62] as V,
  dweller: [-0.04, 0.72] as const,
  log: [0.42, MT + 0.005, 0.02] as V,
  penHome: [0.66, MT + 0.012, 0.02] as V,
  thermoHome: [0.2, MT + 0.03, -0.02] as V,
  cupHome: [-0.3, MT + 0.05, -0.12] as V,
  cupOut: [-0.1, MT + 0.05, 0.2] as V,
};
const MED_YAW = yawTo(MD.dweller[0], MD.dweller[1], MD.patient[0], MD.patient[2]);
const forehead: V = [MD.patient[0] + 0.12, 1.2, MD.patient[2]];
const cupGive: V = [MD.patient[0] + 0.2, 0.96, MD.patient[2]];
const MED: Script = {
  seq: [['ask', 2.8, 0.8], ['fetch', 1.3, 0.8], ['temp', 2.8], ['read', 1.8, 0.8], ['note', 3, 0.8], ['nurse', 2.6], ['water', 2, 0.8], ['ease', 2.2, 0.8]],
  at: (k) => {
    if (k === 'fetch' || k === 'read') return st(0.12, 0.42, PI);
    if (k === 'note') return st(0.42, 0.42, PI);
    if (k === 'water') return st(-0.02, 0.46, yawTo(-0.02, 0.46, MD.patient[0], MD.patient[2]));
    if (k === 'nurse') return st(0.02, 0.42, yawTo(0.02, 0.42, MD.nurse[0], MD.nurse[1]));
    return st(MD.dweller[0], MD.dweller[1], MED_YAW);
  },
  key(k, u, c) {
    const lastTemp = 36.5 + 0.1 * wrap(c.round, 7);
    const thermo: V = k === 'fetch' ? lerpV(MD.thermoHome, c.bd(-0.2, 1.06, 0.2), sm(u, 0.3, 1)) : k === 'temp' ? lerpV(c.bd(-0.2, 1.06, 0.2), forehead, sm(u, 0, 0.3)) : MD.thermoHome;
    const pen: V = k === 'note' ? add(MD.log, -0.06 + 0.12 * frac(u * 3), PEN_UP + 0.004 * Math.sin(c.t * 15), -0.03 + 0.04 * Math.floor(u * 3)) : MD.penHome;
    const cup: V | null = k === 'ask' ? null : k === 'nurse' ? lerpV(MD.cupHome, MD.cupOut, sm(u, 0.4, 0.9)) : k === 'water' ? lerpV(MD.cupOut, cupGive, sm(u, 0.1, 0.8)) : k === 'ease' ? add(cupGive, 0, -0.02, 0) : MD.cupHome;
    const n = { people: 1, nurseTalk: k === 'nurse' ? 1 : 0, temp: k === 'temp' && u > 0.6 ? lastTemp : k === 'read' ? lastTemp : 0, lines: 3 * c.p('note', 0.05, 0.95), water: k === 'water' ? sm(u, 0.5, 0.8) : k === 'ease' ? 1 : 0, glad: k === 'ease' ? 1 : 0, hurts: k === 'ask' ? 1 : 0, tilt: k === 'temp' ? 1 : 0 };
    const props = { thermo, pen, cup };
    switch (k) {
      case 'ask':
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, lean: 0.14, nod: 0.18, n, props };
      case 'fetch':
        return { ...easy(c), r: undefined, tool: 'thermo', lean: 0.1, nod: 0.2, n, props };
      case 'temp':
        return { ...easy(c), r: undefined, tool: 'thermo', lean: 0.18, nod: 0.26, n, props };
      case 'read':
        return { ...easy(c), r: undefined, l: c.bd(0.2, 0.9, 0.1), tool: 'thermo', nod: 0.2, n, props };
      case 'note':
        return { l: add(MD.log, -0.22, 0.03, 0.06), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.12, nod: 0.34, n, props };
      case 'nurse':
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, lean: 0.03, nod: 0.05 + 0.04 * Math.sin(c.t * 2), n, props };
      case 'water':
        return { ...easy(c), r: undefined, tool: 'cup', lean: 0.14, nod: 0.18, n, props };
      default:
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, lean: 0.1, nod: 0.08 + 0.08 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 소지품 보관함 (gjLockers, 2 × 1): a bank of numbered lockers on the wall with a shelf at their foot; the visitor at the dweller's left.

export const LK = {
  face: -0.2,
  stand: 0.24,
  visitor: [-0.72, 0.62] as const,
  shelfY: 0.82,
  /** Lockers: columns across, rows up. */
  cols: [-0.66, -0.33, 0, 0.33, 0.66],
  rows: [1.56, 1.14],
  tagHome: [0.74, 0.86, -0.08] as V,
  bagFrom: [-0.3, 1.08, 0.02] as V,
};
export const lockerOf = (round: number) => {
  const i = wrap(round, LK.cols.length - 1);
  return { i, x: LK.cols[i + 1], y: LK.rows[1] };
};
/** A locker door's handle as the door swings (hinged at its left). */
const lockerHandle = (x: number, y: number, door: number): V => [x - 0.165 + 0.28 * Math.cos(1.6 * door), y, LK.face + 0.03 + 0.28 * Math.sin(1.6 * door)];
const LOCK: Script = {
  seq: [['greet', 2.2], ['bag', 1.8], ['open', 1.3, 0.3], ['stow', 1.6], ['close', 1.2, 0.8], ['tag', 1.7, 0.9], ['give', 1.8], ['thanks', 2]],
  at: (k, round) => {
    const { x } = lockerOf(round);
    if (k === 'bag') return st(-0.2, LK.stand);
    if (k === 'tag') return st(0.5, LK.stand);
    if (k === 'give') return st(-0.18, LK.stand + 0.1, yawTo(-0.18, LK.stand + 0.1, LK.visitor[0], LK.visitor[1]));
    return k === 'greet' || k === 'thanks' ? st(0.02, LK.stand + 0.1, yawTo(0.02, LK.stand + 0.1, LK.visitor[0], LK.visitor[1])) : st(x * 0.9, LK.stand);
  },
  key(k, u, c) {
    const { x, y } = lockerOf(c.round);
    const inLocker: V = [x, y + 0.03, LK.face - 0.08];
    const hold: V = c.bd(-0.14, 1.02, 0.24);
    const bag: V | null = k === 'greet' ? LK.bagFrom : k === 'bag' ? lerpV(LK.bagFrom, hold, sm(u, 0.3, 1)) : k === 'open' ? hold : k === 'stow' ? lerpV(hold, inLocker, sm(u, 0.05, 0.85)) : null;
    const handOver: V = [LK.visitor[0] + 0.28, 1.02, LK.visitor[1] - 0.04];
    const tag: V = k === 'tag' ? lerpV(LK.tagHome, hold, sm(u, 0.35, 1)) : k === 'give' ? lerpV(hold, handOver, sm(u, 0.1, 0.8)) : k === 'thanks' ? handOver : LK.tagHome;
    const n = { people: 1, door: k === 'open' ? sm(u, 0.1, 0.9) : k === 'stow' ? 1 : k === 'close' ? 1 - sm(u, 0.1, 0.8) : 0, locker: lockerOf(c.round).i, reach: k === 'give' ? sm(u, 0.5, 0.8) : 0, has: c.p('give', 0.8, 0.9), glad: k === 'thanks' ? 1 : 0, talk: k === 'greet' ? 1 : 0 };
    const props = { bag, tag };
    switch (k) {
      case 'greet':
      case 'thanks':
        return { ...easy(c), r: talkUp(c), gr: 0.1, palms: 0.5, lean: 0.05, nod: 0.08 * Math.sin(c.t * 2.2), n, props };
      case 'bag':
        return { ...easy(c), r: undefined, tool: 'bag', lean: 0.1, nod: 0.18, n, props };
      case 'open':
        return { ...easy(c), tool: 'bag', r: undefined, l: lockerHandle(x, y, n.door), gl: 0.55, palms: 0.2, lean: 0.06, nod: 0.03, n, props };
      case 'stow':
        return { ...easy(c), tool: 'bag', r: undefined, lean: 0.14, nod: 0.03, n, props };
      case 'close':
        return { ...easy(c), l: lockerHandle(x, y, n.door), gl: 0.2, palms: 0.1, lean: 0.06, nod: 0.03, n, props };
      case 'tag':
      case 'give':
        return { ...easy(c), r: undefined, tool: 'tag', lean: 0.08, nod: 0.12, n, props };
      default:
        return { ...easy(c), n, props };
    }
  },
};

const SCRIPTS: Record<GjMotion, Script> = {
  gjWatch: WATCH,
  gjCalm: CALM,
  gjShadow: SHADOW,
  gjDoors: DOORS,
  gjGateRound: GATE,
  gjRoundLog: ROUND,
  gjVisit: VISIT,
  gjCounsel: COUNSEL,
  gjPlan: PLAN,
  gjRecord: RECORD,
  gjLetter: LETTER,
  gjBake: BAKE,
  gjToolCheck: TOOLS,
  gjBooks: BOOKS,
  gjYardWatch: YARD_WATCH,
  gjYardTalk: YARD_TALK,
  gjMedCheck: MED,
  gjLockerGuide: LOCK,
};
