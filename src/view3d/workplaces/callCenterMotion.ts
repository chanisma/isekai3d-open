import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 고객센터 of a made-up company, 보듬온 (2026-11-01). Each motion is a round of beats: where the dweller is, where the
 * hands go, what moves. The piece reads the same script by the same clock (callCenter.ts), so the record fills under the fingers,
 * a kind customer's thanks comes up as the call closes, and the queue on the wall board goes down as calls are answered.
 * The strain is treated with care: a hard call has a quiet booth, a protection notice on screen, a breath afterwards.
 *
 * - 상담석 (callBooth): csAnswer a call taken, the record typed, the answer found, explained, thanked (or, the hard one, a breath).
 *   csNote the record finished and a memo written. csShadow a senior's call listened to beside them.
 * - 품질 모니터링석 (qaDesk): csReview a recording played, stopped, marked. csFeedback the recording played to a colleague beside.
 * - 콜 현황판 (callBoard): csQueue walked up to, read, a sign to the floor. csSurge the alarm: the board red, the team waved in,
 *   the roster changed, the queue falling. csVoc tablet in hand, what customers said. csStaff the roster's magnets moved.
 * - 바인더 선반 (csFaqShelf): csLookup a binder pulled and read, a line marked with a finger.
 * - 청취석 (csSupervisorDesk): csListenIn an agent chosen, listened to, a quiet word whispered, a note.
 * - 교육실 세트 (csRolePlaySet): csRolePlay a handset up, the customer played standing, then walking over to the trainee.
 * - 조용한 부스 (csQuietBooth): csHardCall in through the door, a breath, the hard call, the rule on screen, a breath, out.
 * - 동료 상담석 (csTeamDesk): csCoach standing behind a colleague, a hand on the shoulder, a clipboard.
 * - 차 코너 (csTeaCorner): csTea a paper cup, a tea bag, hot water, a sip. 안마 의자 (csRestChair): csRest back, eyes up, remote.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type CsMotion = 'csAnswer' | 'csNote' | 'csShadow' | 'csReview' | 'csFeedback' | 'csQueue' | 'csSurge' | 'csVoc' | 'csStaff' | 'csLookup' | 'csListenIn' | 'csRolePlay' | 'csHardCall' | 'csCoach' | 'csTea' | 'csRest';
export const CS_MOTIONS = new Set<string>(['csAnswer', 'csNote', 'csShadow', 'csReview', 'csFeedback', 'csQueue', 'csSurge', 'csVoc', 'csStaff', 'csLookup', 'csListenIn', 'csRolePlay', 'csHardCall', 'csCoach', 'csTea', 'csRest']);
export type CsTool = 'pen' | 'clip' | 'tablet' | 'magnet' | 'binder' | 'handset' | 'cup' | 'remote';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const csPhase = (p: THREE.Vector3) => frac(p.x * 0.419 + p.z * 0.613);
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
export const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
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
  /** Legs out straight on a foot rest. */
  out?: boolean;
}
const st = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
const sat = (s: V, yaw = PI, out = false): St => ({ x: s[0], y: s[1], z: s[2], yaw, sit: true, out });
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
  tool?: CsTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  /** Which round this is, for what changes round to round. */
  round: number;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface CsNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: CsTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number): { st: St; key: Key } {
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function csNow(m: CsMotion, t: number, ph: number, H = 1.6): CsNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.n) : A;
  const e = b.e;
  const nearer = e < 0.5 ? A.st : B.st;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: nearer.sit, out: nearer.out };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  // A tool stays held through a move only if both ends have it.
  const tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function csPose(m: CsMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = csNow(m, t, csPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y, ...(s.out ? { legs: 'out' as const } : {}) } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch ? k.crouch : undefined,
    },
  };
}
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
/** A hand held out, talking. */
const talking = (c: Ctx): Key => ({ l: c.bd(0.3, 0.72 * c.H, 0.24), r: c.bd(-0.3, 0.72 * c.H + 0.04 * Math.sin(c.t * 3), 0.24), gl: 0.12, gr: 0.12, palms: 0.5 });
/** Talking from a chair: the free hand out over the desk's edge, palm up, moving with the sentence. */
const talkSit = (c: Ctx, sideways = 0.2): V => c.bd(sideways, 0.36 + 0.03 * Math.sin(c.t * 3.1), 0.28);

/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;

// =============================================================================================
// 상담석 (callBooth, 1 × 1): seated close to the desk, a monitor, keys, a mouse and a memo pad to the right.

export const BT = {
  seat: [0, 0.47, 0.62] as V,
  top: 0.74,
  keys: [-0.06, 0.77, 0.2] as V,
  mouse: [0.17, 0.77, 0.2] as V,
  memo: [0.33, 0.745, 0.14] as V,
  screen: [-0.04, 1.07, -0.2] as V,
};
const penRestB: V = add(BT.memo, 0.03, 0.02, -0.11);
const penOnB = (u: number, t: number): V => add(BT.memo, -0.04 + 0.08 * frac(u * 3), PEN_UP + 0.005 * Math.sin(t * 16), -0.03 + 0.03 * Math.floor(u * 3));
const onMouse = (t: number): V => add(BT.mouse, 0.008 * Math.sin(t * 2.3), 0.03, 0.006 * Math.cos(t * 1.7));
const leftKeys = add(BT.keys, -0.09, 0.03, 0);

/** The calls of a day, invented. Most end kindly; the third is a hard one. */
export const CALLS: ReadonlyArray<{ who: string; issue: string; answer: string; thanks: string; tough: boolean }> = [
  { who: '김*솔 고객님', issue: '요금이 두 번 빠져나갔어요', answer: '중복 결제 환불 접수', thanks: '친절히 알려 주셔서 정말 고마워요!', tough: false },
  { who: '박*순 어르신', issue: '앱 글씨가 작아 못 보겠어요', answer: '글자 크기 함께 키우기', thanks: '젊은이 덕분에 됐어요. 복 받아요~', tough: false },
  { who: '이*호 고객님', issue: '왜 아직도 안 되냐고요!', answer: '장애 복구 일정 안내', thanks: '끝까지 들어 주셔서... 아까는 미안했어요', tough: true },
  { who: '최*아 고객님', issue: '택배 주소를 잘못 적었어요', answer: '배송지 변경 완료', thanks: '덕분에 생일 선물 제때 받아요 :)', tough: false },
];
const ANSWER: Script = {
  seq: [['ring', 1.2], ['greet', 2.6], ['listen', 3.4], ['type', 3.0], ['find', 2.4], ['explain', 3.2], ['close', 3.0], ['end', 1.0]],
  at: () => sat(BT.seat),
  key(k, u, c) {
    const tough = CALLS[wrap(c.round, CALLS.length)].tough;
    const n = { hs: 1, ringing: k === 'ring' ? 1 : 0, live: c.p('ring', 0.7, 0.9) * (1 - c.p('end', 0.2, 0.5)), cust: k === 'listen' ? 1 : k === 'greet' ? 0.5 : 0, form: c.p('type'), found: c.p('find', 0.3, 0.7), thanks: c.p('close', 0.1, 0.3) * (1 - c.p('end', 0.5, 1)), tough: tough ? 1 : 0, answered: c.p('end', 0.2, 0.3) };
    const props = { pen: penRestB };
    switch (k) {
      case 'ring':
        return { l: leftKeys, r: add(BT.keys, 0.17, 0.03 - (u > 0.55 && u < 0.8 ? 0.012 : 0), 0), gl: 0.25, gr: 0.2, palms: 0.05, tap: u > 0.55 && u < 0.8, nod: 0.14, n, props };
      case 'greet':
        // A touch to the mic, bright voice.
        return { l: c.bd(0.1, 0.6 * (c.H / 1.6), 0.13), gl: 0.5, r: onMouse(c.t), gr: 0.4, palms: 0.1, nod: 0.04 + 0.05 * Math.sin(c.t * 3), lean: 0.06, n, props };
      case 'listen':
        return tough
          ? { l: leftKeys, r: onMouse(c.t), gl: 0.3, gr: 0.4, palms: 0.05, lean: -0.03, nod: 0.2, n, props }
          : { l: leftKeys, r: onMouse(c.t), gl: 0.3, gr: 0.4, palms: 0.05, lean: 0.1, nod: 0.1 + 0.07 * Math.sin(c.t * 2.2), n, props };
      case 'type':
        return { ...typing(BT.keys, c.t), nod: 0.14, lean: 0.08, n, props };
      case 'find':
        return { l: leftKeys, gl: 0.3, r: onMouse(c.t * 2), gr: 0.45, palms: 0.05, lean: 0.18, nod: 0.05, n, props };
      case 'explain':
        return { l: talkSit(c), gl: 0.12, r: onMouse(c.t), gr: 0.4, palms: 0.5, lean: 0.08, nod: 0.08 + 0.05 * Math.sin(c.t * 3.4), n, props };
      case 'close':
        return tough
          ? // A breath: back in the chair, a hand on the chest, shoulders coming down.
            { l: leftKeys, gl: 0.3, r: c.bd(-0.03, 0.42, 0.16), gr: 0.1, palms: 0.9, lean: -0.05 + 0.025 * Math.sin(c.t * 1.6), nod: 0.02, n, props }
          : // A kind word on the screen; a little bow nobody sees, and a smile at it.
            { l: leftKeys, gl: 0.3, r: c.bd(-0.03, 0.42, 0.16), gr: 0.1, palms: 0.9, lean: 0.12, nod: 0.08 + 0.1 * sm(u, 0.2, 0.5) * (1 - sm(u, 0.6, 0.9)), n, props };
      default:
        return { l: leftKeys, gl: 0.3, r: add(BT.keys, 0.17, 0.03, 0), gr: 0.2, palms: 0.05, tap: u > 0.1 && u < 0.4, nod: 0.12, n, props };
    }
  },
};
const NOTE: Script = {
  seq: [['open', 1.2], ['type', 5.0], ['pick', 1.6], ['memo', 3.2], ['save', 1.2]],
  at: () => sat(BT.seat),
  key(k, u, c) {
    const n = { hs: 0, form: 0.12 * c.p('open') + 0.68 * c.p('type') + 0.2 * c.p('pick'), memo: c.p('memo', 0.1, 0.9), saved: c.p('save', 0.2, 0.4), note: 1 };
    const props = { pen: k === 'memo' ? penOnB(u, c.t) : penRestB };
    switch (k) {
      case 'type':
        return { ...typing(BT.keys, c.t), nod: 0.15, lean: 0.08, n, props };
      case 'memo':
        return { l: add(BT.memo, -0.17, 0.03, 0.02), gl: 0.25, palms: 0.05, tool: 'pen', nod: 0.34, lean: 0.17, n, props };
      default:
        return { l: leftKeys, gl: 0.3, r: onMouse(c.t), gr: 0.45, palms: 0.05, tap: k === 'save' && u > 0.2 && u < 0.4, nod: 0.1, lean: 0.08, n, props };
    }
  },
};
const SHADOW: Script = {
  seq: [['plug', 1.8], ['hear', 4.2], ['jot', 3.2], ['ask', 2.6], ['hear2', 3.0]],
  at: () => sat(BT.seat),
  key(k, u, c) {
    const n = { hs: k === 'plug' ? sm(u, 0.4, 0.6) : 1, shadow: 1, live: 1, cust: k === 'hear' ? 1 : 0, form: 0.2 * c.p('hear') + 0.3 * c.p('hear2'), memo: c.p('jot', 0.1, 0.9), says: k === 'ask' ? 0 : 1, srPoints: k === 'ask' ? 1 : 0 };
    const props = { pen: k === 'jot' ? penOnB(u, c.t) : penRestB };
    switch (k) {
      case 'plug':
        return { l: leftKeys, gl: 0.3, r: c.bd(-0.14, 0.72 * (c.H / 1.6), 0.03), gr: 0.5, nod: 0.08, n, props };
      case 'jot':
        return { l: add(BT.memo, -0.17, 0.03, 0.02), gl: 0.25, palms: 0.05, tool: 'pen', nod: 0.32, lean: 0.16, n, props };
      case 'ask':
        // Turned a little up to the senior, a question.
        return { l: talkSit(c, 0.18), gl: 0.12, r: onMouse(c.t), gr: 0.4, palms: 0.5, nod: -0.06, lean: -0.02, n, props };
      default:
        return { l: leftKeys, r: onMouse(c.t), gl: 0.3, gr: 0.4, palms: 0.05, lean: 0.1, nod: 0.1 + 0.05 * Math.sin(c.t * 2), n, props };
    }
  },
};

// =============================================================================================
// 품질 모니터링석 (qaDesk, 1 × 1): a waveform screen, a score sheet at the right, a stool to the left for a colleague.

export const QA = {
  seat: [0, 0.47, 0.62] as V,
  top: 0.74,
  keys: [-0.1, 0.77, 0.2] as V,
  mouse: [0.1, 0.77, 0.22] as V,
  sheet: [0.31, 0.745, 0.14] as V,
  stool: [-0.74, 0.46, 0.76] as V,
};
const penRestQ: V = add(QA.sheet, 0.1, 0.02, -0.09);
const onMouseQ = (t: number): V => add(QA.mouse, 0.006 * Math.sin(t * 2), 0.03, 0.005 * Math.cos(t * 1.4));
const leftQ = add(QA.keys, -0.04, 0.03, 0);
/** Marking: down the sheet's rows, one tick a row. */
const penMark = (u: number): V => add(QA.sheet, 0.05, PEN_UP + 0.01 * Math.abs(Math.sin(u * PI * 8)), -0.07 + 0.14 * u);
const REVIEW: Script = {
  seq: [['play', 2.4], ['hear', 3.6], ['stop', 1.4], ['again', 2.6], ['mark', 3.4], ['good', 2.0]],
  at: () => sat(QA.seat),
  key(k, u, c) {
    const n = { hs: 1, pos: 0.32 * c.p('play') + 0.26 * c.p('hear') + 0.04 * c.p('again') + 0.38 * c.p('good'), playing: k === 'stop' || k === 'mark' ? 0 : 1, flag: c.p('stop', 0.3, 0.5), marks: 5 * c.p('mark'), stamped: c.p('good', 0.3, 0.45) };
    const props = { pen: k === 'mark' ? penMark(u) : penRestQ };
    switch (k) {
      case 'hear':
      case 'again':
        return { l: leftQ, gl: 0.3, r: onMouseQ(c.t), gr: 0.4, palms: 0.05, lean: 0.14, nod: 0.08 + 0.04 * Math.sin(c.t * 1.8), n, props };
      case 'mark':
        return { l: add(QA.sheet, -0.16, 0.03, 0.03), gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.34, n, props };
      case 'good':
        // A thumb up to the empty air: this one was well done.
        return { l: leftQ, gl: 0.3, r: c.bd(-0.2, 0.42, 0.3), gr: 0.8, palms: 0.8, lean: -0.02, nod: 0, n, props };
      default:
        return { l: leftQ, gl: 0.3, r: onMouseQ(c.t), gr: 0.4, palms: 0.05, tap: k === 'stop' && u < 0.3, lean: 0.06, nod: 0.12, n, props };
    }
  },
};
const FEEDBACK: Script = {
  seq: [['play', 2.6], ['stop', 1.2], ['turn', 3.2], ['praise', 2.6], ['listen', 2.6], ['sheet', 2.4]],
  at: (k) => (k === 'play' || k === 'stop' ? sat(QA.seat) : sat(QA.seat, PI + 0.75)),
  key(k, u, c) {
    const n = { hs: 0, pos: 0.4 * c.p('play'), playing: k === 'play' ? 1 : 0, flag: c.p('stop', 0.3, 0.5), mate: 1, mateNods: k === 'turn' || k === 'praise' ? 1 : 0, mateTalks: k === 'listen' ? 1 : 0, stamped: c.p('sheet', 0.5, 0.7), marks: 3 };
    const props = { pen: penRestQ };
    switch (k) {
      case 'turn':
      case 'praise':
        return { r: onMouseQ(c.t), gr: 0.4, l: talkSit(c, 0.05), gl: 0.12, palms: 0.5, lean: 0.1, nod: 0.08, n, props };
      case 'listen':
        return { l: leftQ, gl: 0.3, r: onMouseQ(c.t), gr: 0.4, lean: 0.04, nod: 0.1 + 0.08 * Math.sin(c.t * 3), n, props };
      case 'sheet':
        // The sheet slid over to them.
        return { l: leftQ, gl: 0.3, r: add(QA.sheet, -0.14 * sm(u, 0.1, 0.8), 0.03, 0), gr: 0.1, palms: 0.05, lean: 0.14, nod: 0.2, n, props };
      default:
        return { l: leftQ, gl: 0.3, r: onMouseQ(c.t), gr: 0.4, palms: 0.05, tap: k === 'stop' && u < 0.3, lean: 0.08, nod: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 콜 현황판 (callBoard, 2 × 1): the live board and, to its right, a roster of magnets; a ledge under them.

export const CB = {
  face: -0.33,
  stand: 0.42,
  /** Close enough to touch it. */
  touch: 0.12,
  /** Live board: its centre, width, height. */
  live: [-0.3, 1.42, -0.33] as V,
  liveW: 1.26,
  liveH: 0.88,
  /** The roster: its centre. */
  roster: [0.65, 1.42, -0.33] as V,
  rosterW: 0.56,
  rosterH: 0.88,
  ledge: [0.65, 0.94, -0.27] as V,
  tabletHome: [-0.48, 0.97, -0.2] as V,
};
/** Where a slot on the roster is: column (0 phones, 1 chat, 2 rest) and row (0 to 4). */
export const rosterAt = (col: number, row: number): V => [CB.roster[0] + (col - 1) * 0.17, CB.roster[1] + 0.2 - row * 0.13, CB.face + 0.02];
/** The grip stands off the magnet's face. */
const magnetAt = (col: number, row: number): V => add(rosterAt(col, row), 0, 0, 0.03);
const handAtBoard = (x: number, y: number): V => [x, y, CB.face + 0.05];
const QUEUE: Script = {
  seq: [['walk', 0.8, 1.0], ['read', 2.8], ['point', 2.4], ['turn', 2.4], ['back', 0.8]],
  at: (k) => (k === 'walk' || k === 'back' ? st(-0.3, 1.25) : k === 'turn' ? st(-0.3, CB.stand, 0.5) : k === 'point' ? st(-0.3, CB.touch) : st(-0.3, CB.stand)),
  key(k, _u, c) {
    const n = { read: k === 'read' || k === 'point' ? 1 : 0, hi: k === 'point' ? 1 : 0, spare: c.p('turn', 0.3, 0.6) };
    switch (k) {
      case 'read':
        return { ...easy(c), nod: -0.1, lean: 0.03, n };
      case 'point':
        return { l: easy(c).l, gl: 0.3, r: handAtBoard(-0.38 + 0.03 * Math.sin(c.t * 2), 1.6), gr: 0.15, palms: 0.1, nod: -0.16, n };
      case 'turn':
        // To the floor: one hand up with fingers out, "둘 더 받아 주세요".
        return { l: easy(c).l, gl: 0.3, r: c.bd(-0.26, 1.42 + 0.04 * Math.sin(c.t * 7), 0.16), gr: 0.1, palms: 1.2, nod: 0.02, n };
      default:
        return { ...easy(c), nod: 0.1, n };
    }
  },
};
const SURGE: Script = {
  seq: [['see', 2.0], ['head', 1.6], ['wave', 3.0], ['take', 1.0], ['moveA', 1.8], ['moveB', 1.8], ['drop', 0.8], ['watch', 5.0], ['ok', 2.2]],
  at: (k) => (k === 'wave' ? st(-0.05, CB.stand + 0.24, 0.65) : k === 'see' || k === 'watch' || k === 'ok' || k === 'head' ? st(-0.3, CB.stand) : st(CB.roster[0] - 0.08, CB.touch)),
  key(k, u, c) {
    const n = { surge: 1 - c.p('ok', 0.1, 0.8), fall: 0.18 * c.p('moveA') + 0.18 * c.p('moveB') + 0.64 * c.p('watch'), m1: c.p('moveA', 0.1, 0.9), m2: c.p('moveB', 0.1, 0.9), cleared: c.p('ok', 0.1, 0.3) };
    const m1: V = lerpV(magnetAt(2, 1), magnetAt(0, 3), sm(u, 0.15, 0.85));
    const m2: V = lerpV(magnetAt(2, 2), magnetAt(0, 4), sm(u, 0.15, 0.85));
    const magnet: V = k === 'take' ? magnetAt(2, 1) : k === 'moveA' ? m1 : k === 'moveB' ? m2 : k === 'drop' ? magnetAt(0, 4) : magnetAt(2, 0);
    const props = { magnet };
    switch (k) {
      case 'see':
        return { ...easy(c), nod: -0.14, lean: 0.06, n, props };
      case 'head':
        return { l: easy(c).l, gl: 0.3, r: c.bd(-0.12, 0.92 * c.H, 0.14), gr: 0.2, palms: 0.9, nod: -0.05, n, props };
      case 'wave':
        // Calling the team back from their break: an arm high and beckoning.
        return { l: easy(c).l, gl: 0.3, r: c.bd(-0.28, 1.5 + 0.08 * Math.sin(c.t * 8), 0.14), gr: 0.08, palms: 1.1, nod: 0.02, n, props };
      case 'watch':
        return { l: easy(c).l, gl: 0.3, r: easy(c).r, gr: 0.5, nod: -0.12, lean: 0.03, n, props };
      case 'ok':
        return { ...easy(c), nod: 0.06 + 0.1 * Math.sin(u * PI), lean: -0.02, n, props };
      default:
        return { l: easy(c).l, gl: 0.3, tool: 'magnet', nod: -0.12, n, props };
    }
  },
};
const tabletAt = (c: Ctx): V => c.bd(0.14, 1.04 * (c.H / 1.6), 0.3);
const VOC: Script = {
  seq: [['take', 1.4], ['read', 3.4], ['tap', 3.0], ['look', 2.8], ['mark', 3.2], ['back', 1.2]],
  at: () => st(-0.3, 0.3),
  key(k, u, c) {
    const n = { voc: 1, bars: c.p('take') * 0.3 + 0.7 * c.p('tap'), hi: k === 'look' || k === 'mark' ? 1 : 0, marked: c.p('mark', 0.3, 0.8) };
    const hold = tabletAt(c);
    const tablet: V = k === 'take' ? lerpV(CB.tabletHome, hold, sm(u, 0.2, 0.9)) : k === 'back' ? lerpV(hold, CB.tabletHome, sm(u, 0.1, 0.8)) : hold;
    const props = { tablet };
    switch (k) {
      case 'take':
      case 'back':
        return { tool: 'tablet', r: easy(c).r, gr: 0.3, nod: 0.18, lean: 0.12, n, props };
      case 'tap':
        return { tool: 'tablet', r: add(hold, 0.02 + 0.05 * Math.sin(c.t * 2.2), 0.05, 0.03), gr: 0.12, palms: 0.1, nod: 0.3, lean: 0.03, n, props };
      case 'look':
        return { tool: 'tablet', r: c.bd(-0.2, 1.36 + 0.03 * Math.sin(c.t * 1.8), 0.34), gr: 0.15, nod: -0.12, n, props };
      case 'mark':
        return { tool: 'tablet', r: add(hold, 0.03, 0.05, 0.03), gr: 0.12, palms: 0.1, nod: 0.26, n, props };
      default:
        return { tool: 'tablet', r: easy(c).r, gr: 0.3, nod: 0.26, n, props };
    }
  },
};
const STAFF: Script = {
  seq: [['look', 2.2], ['one', 2.4], ['two', 2.4], ['three', 2.4], ['step', 2.0], ['tick', 2.0]],
  at: (k) => (k === 'step' ? st(CB.roster[0] - 0.05, CB.stand) : st(CB.roster[0] - 0.05, CB.touch)),
  key(k, u, c) {
    const n = { staff: 1, s1: c.p('one', 0.1, 0.9), s2: c.p('two', 0.1, 0.9), s3: c.p('three', 0.1, 0.9), hiRoster: 1, ticked: c.p('tick', 0.3, 0.6) };
    const magnet: V = k === 'one' ? lerpV(magnetAt(2, 0), magnetAt(0, 3), sm(u, 0.15, 0.85)) : k === 'two' ? lerpV(magnetAt(1, 1), magnetAt(0, 4), sm(u, 0.15, 0.85)) : k === 'three' ? lerpV(magnetAt(0, 1), magnetAt(1, 1), sm(u, 0.15, 0.85)) : magnetAt(0, 0);
    const props = { magnet };
    switch (k) {
      case 'one':
      case 'two':
      case 'three':
        return { l: easy(c).l, gl: 0.3, tool: 'magnet', nod: -0.12, n, props };
      case 'step':
        return { ...easy(c), nod: -0.06, n, props };
      case 'tick':
        return { l: easy(c).l, gl: 0.3, r: handAtBoard(CB.roster[0] - 0.2, 1.08), gr: 0.15, palms: 0.1, nod: 0.08, tap: u > 0.3 && u < 0.6, n, props };
      default:
        return { l: easy(c).l, gl: 0.3, r: c.bd(-0.14, 0.82 * c.H, 0.2), gr: 0.6, palms: 0.6, nod: -0.14, n, props };
    }
  },
};

// =============================================================================================
// 바인더 선반 (csFaqShelf, 2 × 1): a waist-high shelf of labelled binders; a binder goes from its slot to the left hand.

export const FQ = {
  stand: 0.34,
  /** The binder's slot on the upper shelf: grip here. */
  slot: [-0.14, 1.0, -0.06] as V,
};
const LOOKUP: Script = {
  seq: [['scan', 1.8], ['pull', 1.4], ['read', 3.2], ['flip', 2.0], ['finger', 2.6], ['back', 1.4]],
  at: () => st(-0.08, FQ.stand),
  key(k, u, c) {
    const hold = c.bd(0.1, 1.05 * (c.H / 1.6), 0.28);
    const n = { open: c.p('pull', 0.7, 1) * (1 - c.p('back', 0, 0.3)), page: c.p('flip', 0.1, 0.8), hi: c.p('finger', 0.2, 0.5) * (1 - c.p('back', 0, 0.3)) };
    const binder: V = k === 'pull' ? lerpV(FQ.slot, hold, sm(u, 0.15, 1)) : k === 'back' ? lerpV(hold, FQ.slot, sm(u, 0.2, 1)) : k === 'scan' ? FQ.slot : hold;
    const props = { binder };
    switch (k) {
      case 'scan':
        return { l: easy(c).l, gl: 0.3, r: c.bd(-0.12, 1.1 + 0.05 * Math.sin(c.t * 2), 0.3), gr: 0.2, palms: 0.2, nod: 0.3, lean: 0.1, n, props };
      case 'flip':
        return { tool: 'binder', r: add(hold, 0.1 - 0.2 * sm(u, 0.1, 0.8), 0.07, 0), gr: 0.1, palms: 0.1, nod: 0.3, n, props };
      case 'finger':
        return { tool: 'binder', r: add(hold, 0.06, 0.06, 0.02 * Math.sin(c.t * 1.4)), gr: 0.15, palms: 0.1, nod: 0.34, lean: 0.03, n, props };
      case 'read':
        return { tool: 'binder', r: add(hold, 0.13, 0.04, 0), gr: 0.1, palms: 0.1, nod: 0.3, n, props };
      default:
        return { tool: 'binder', r: easy(c).r, gr: 0.3, nod: 0.26, lean: k === 'back' ? 0.1 : 0.05, n, props };
    }
  },
};

// =============================================================================================
// 슈퍼바이저 청취석 (csSupervisorDesk, 2 × 1): a wide wall of agents on the left, the call on the right, a whisper key.

export const SV = {
  seat: [0, 0.47, 0.62] as V,
  top: 0.74,
  keys: [-0.14, 0.77, 0.2] as V,
  mouse: [0.12, 0.77, 0.22] as V,
  whisper: [-0.42, 0.775, 0.2] as V,
  note: [0.42, 0.745, 0.14] as V,
};
const onMouseS = (t: number): V => add(SV.mouse, 0.006 * Math.sin(t * 2), 0.03, 0.005 * Math.cos(t * 1.4));
const penRestS: V = add(SV.note, 0.1, 0.02, -0.09);
const LISTEN_IN: Script = {
  seq: [['scan', 2.6], ['pick', 1.2], ['hear', 4.0], ['whisper', 3.0], ['hear2', 2.2], ['jot', 2.8], ['nod', 1.6]],
  at: () => sat(SV.seat),
  key(k, u, c) {
    const n = { hs: 1, agent: wrap(c.round * 5 + 3, 12), picked: c.p('pick', 0.3, 0.6), live: c.p('pick', 0.5, 0.8), whisper: k === 'whisper' ? 1 : 0, noted: c.p('jot', 0.1, 0.9), calm: c.p('hear2', 0, 0.6) };
    const props = { pen: k === 'jot' ? add(SV.note, -0.04 + 0.08 * frac(u * 3), PEN_UP + 0.005 * Math.sin(c.t * 16), -0.03 + 0.03 * Math.floor(u * 3)) : penRestS };
    const left = add(SV.keys, -0.04, 0.03, 0);
    switch (k) {
      case 'scan':
        return { l: left, gl: 0.3, r: onMouseS(c.t * 1.5), gr: 0.45, palms: 0.05, lean: 0.1, nod: 0.05, n, props };
      case 'pick':
        return { l: left, gl: 0.3, r: onMouseS(c.t), gr: 0.45, palms: 0.05, tap: u > 0.3 && u < 0.6, lean: 0.12, nod: 0.08, n, props };
      case 'whisper':
        // The left finger holding the key; a quiet word to the agent only.
        return { l: add(SV.whisper, 0, 0.03, 0), gl: 0.15, r: onMouseS(c.t), gr: 0.4, palms: 0.05, lean: 0.14, nod: 0.12 + 0.03 * Math.sin(c.t * 4), n, props };
      case 'jot':
        return { l: add(SV.keys, -0.04, 0.03, 0), gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.34, n, props };
      case 'nod':
        return { l: left, gl: 0.3, r: onMouseS(c.t), gr: 0.4, lean: 0.03, nod: 0.08 + 0.1 * Math.sin(u * PI * 2), n, props };
      default:
        return { l: left, gl: 0.3, r: onMouseS(c.t), gr: 0.4, palms: 0.05, lean: 0.12, nod: 0.1 + 0.05 * Math.sin(c.t * 2), n, props };
    }
  },
};

// =============================================================================================
// 상담 교육실 세트 (csRolePlaySet, 3 × 1): a low phrase board, a small table with a phone; a trainee seated on the right.

export const RP = {
  stand: [-0.82, 0.6] as readonly [number, number],
  /** The handset's cradle on the left phone: its grip when it's down. */
  cradle: [-0.82, 0.86, 0.28] as V,
  traineeSeat: [0.86, 0.47, 0.74] as V,
  /** Beside the trainee, to teach. */
  by: [0.18, 0.8] as readonly [number, number],
};
const FACE_TRAINEE = PI / 2;
const atEar = (c: Ctx): V => c.bd(-0.13, 0.885 * c.H, 0.07);
const ROLE: Script = {
  seq: [['card', 2.4], ['lift', 1.2], ['upset', 3.4], ['listen', 2.8], ['softer', 2.8], ['down', 1.2], ['walk', 2.8, 1.1], ['laugh', 2.0, 1.1]],
  at: (k) => (k === 'walk' ? st(RP.by[0], RP.by[1], FACE_TRAINEE - 0.2) : k === 'card' || k === 'lift' || k === 'down' ? st(RP.stand[0], RP.stand[1], PI - 0.3) : st(RP.stand[0], RP.stand[1], FACE_TRAINEE)),
  key(k, u, c) {
    const ear = atEar(c);
    const handset: V = k === 'lift' ? lerpV(RP.cradle, ear, sm(u, 0.15, 0.9)) : k === 'down' ? lerpV(ear, RP.cradle, sm(u, 0.1, 0.85)) : k === 'upset' || k === 'listen' || k === 'softer' ? ear : RP.cradle;
    const n = { line: k === 'upset' ? 0 : k === 'listen' ? 1 : k === 'softer' ? 2 : k === 'walk' ? 3 : -1, trainPhone: k === 'upset' || k === 'listen' || k === 'softer' ? 1 : 0, trainTalks: k === 'listen' ? 1 : 0, trainLaugh: k === 'laugh' ? 1 : 0, trainNods: k === 'walk' || k === 'softer' ? 1 : 0, score: c.p('walk', 0.3, 0.8) };
    const props = { handset };
    switch (k) {
      case 'card':
        return { ...talking(c), nod: 0.02, n, props };
      case 'lift':
      case 'down':
        return { l: easy(c).l, gl: 0.3, tool: 'handset', nod: 0.2, lean: 0.14, n, props };
      case 'upset':
        // Playing the angry customer: the free arm chopping at the air.
        return { l: c.bd(0.3, 1.12 + 0.1 * Math.sin(c.t * 7), 0.3), gl: 0.7, palms: 0.4, tool: 'handset', nod: 0.02, lean: 0.08, n, props };
      case 'listen':
        return { l: easy(c).l, gl: 0.3, tool: 'handset', nod: 0.08 + 0.04 * Math.sin(c.t * 2.5), n, props };
      case 'softer':
        return { l: c.bd(0.24, 1.02, 0.22), gl: 0.15, palms: 0.5, tool: 'handset', nod: 0.1, n, props };
      case 'walk':
        return { l: c.bd(0.28, 1.08 + 0.03 * Math.sin(c.t * 3), 0.26), gl: 0.12, r: c.bd(-0.3, 1.08, 0.2), gr: 0.12, palms: 0.5, nod: 0.26, lean: 0.1, n, props };
      default:
        return { ...easy(c), nod: 0.14 * Math.sin(u * PI * 4), lean: 0.03, n, props };
    }
  },
};

// =============================================================================================
// 조용한 상담 부스 (csQuietBooth, 2 × 2): a glass door in front; a desk at the back; a chair.

export const QB = {
  seat: [0, 0.47, -0.06] as V,
  top: 0.74,
  keys: [-0.04, 0.77, -0.48] as V,
  note: [0.28, 0.745, -0.5] as V,
  doorZ: 0.92,
  out: [0, 1.18] as readonly [number, number],
  mid: [0, 0.42] as readonly [number, number],
  tissue: [-0.42, 0.8, -0.56] as V,
};
/** The handle on the glass door as it swings in about its hinge on the left (let go once it's half open). */
export const DOOR_SWING = 1.4;
const doorHandle = (door: number): V => {
  const a = Math.min(door, 0.2) * DOOR_SWING;
  return [-0.42 + 0.76 * Math.cos(a), 1.02, QB.doorZ - 0.76 * Math.sin(a) + 0.04];
};
const HARD: Script = {
  seq: [['door', 1.2, 0.9], ['close', 0.9, 0.5], ['breath', 2.4], ['listen', 4.0], ['rule', 2.4], ['speak', 3.6], ['type', 2.4], ['end', 1.0], ['after', 3.4], ['up', 0.8, 0.5], ['leave', 1.0, 0.9]],
  at: (k) => (k === 'door' || k === 'leave' ? st(QB.out[0], QB.out[1]) : k === 'close' || k === 'up' ? st(QB.mid[0], QB.mid[1]) : sat(QB.seat)),
  key(k, u, c) {
    const door = k === 'door' ? sm(u, 0.2, 0.9) : k === 'close' ? 1 - sm(u, 0.1, 0.9) : k === 'up' ? sm(u, 0.1, 0.9) : k === 'leave' ? 1 - sm(u, 0.2, 0.9) : 0;
    const n = { hs: k === 'door' || k === 'close' || k === 'up' || k === 'leave' ? 0 : 1, door, live: c.p('breath', 0.8, 1) * (1 - c.p('end', 0.3, 0.6)), loud: k === 'listen' ? 1 : k === 'rule' ? 0.6 : k === 'speak' ? 0.25 : 0, rule: k === 'rule' || k === 'speak' ? 1 : 0, form: 0.4 * c.p('listen') + 0.6 * c.p('type'), after: c.p('after', 0.05, 0.2) * (1 - c.p('up', 0, 0.5)) };
    const left = add(QB.keys, -0.09, 0.03, 0);
    const right = add(QB.keys, 0.09, 0.03, 0);
    switch (k) {
      case 'door':
        return { l: c.bd(0.2, 0.55 * c.H, 0.1), gl: 0.3, r: doorHandle(door), gr: 0.7, palms: 0.4, nod: 0.08, n };
      case 'close':
      case 'up':
      case 'leave':
        return { ...easy(c), nod: 0.08, n };
      case 'breath':
        // Before picking up: both hands flat on the thighs, chest rising.
        return { l: c.bd(0.14, 0.14, 0.26), r: c.bd(-0.14, 0.14, 0.26), gl: 0.05, gr: 0.05, palms: 0.05, lean: -0.03 + 0.03 * Math.sin(c.t * 1.5), nod: 0.04, n };
      case 'listen':
        return { l: left, r: c.bd(-0.03, 0.42, 0.17), gl: 0.3, gr: 0.1, palms: 0.9, lean: 0.03, nod: 0.2 + 0.04 * Math.sin(c.t * 1.7), n };
      case 'rule':
        return { l: left, r: right, gl: 0.3, gr: 0.3, palms: 0.05, lean: 0.14, nod: 0.08, n };
      case 'speak':
        return { l: left, gl: 0.3, r: talkSit(c, -0.16), gr: 0.1, palms: 0.5, lean: 0.06, nod: 0.09 + 0.03 * Math.sin(c.t * 2.2), n };
      case 'type':
        return { ...typing(QB.keys, c.t), nod: 0.14, lean: 0.08, n };
      case 'end':
        return { l: left, r: right, gl: 0.3, gr: 0.2, palms: 0.05, tap: u > 0.1 && u < 0.4, nod: 0.12, n };
      default:
        // After it: the chair, a long breath out, the hands round nothing in the lap; the note from the team on screen.
        return { l: c.bd(0.1, 0.18, 0.22), r: c.bd(-0.1, 0.18, 0.22), gl: 0.25, gr: 0.25, palms: 0.5, lean: -0.05 + 0.03 * Math.sin(c.t * 1.2), nod: 0.14, n };
    }
  },
};

// =============================================================================================
// 동료 상담석 (csTeamDesk, 1 × 1): the same desk with a colleague at it on a call. Coached standing behind them.

export const TM = {
  seat: [0, 0.47, 0.62] as V,
  stand: [0.34, 1.08] as readonly [number, number],
};
const COACH: Script = {
  seq: [['come', 1.6, 0.9], ['hear', 3.4], ['shoulder', 2.6], ['point', 2.8], ['write', 3.0], ['smile', 2.0], ['away', 0.6, 0.9]],
  at: (k) => (k === 'come' || k === 'away' ? st(0.5, 1.35, PI + 0.2) : st(TM.stand[0], TM.stand[1], PI + 0.3)),
  key(k, u, c) {
    const clip = c.bd(0.17, 1.02 * (c.H / 1.6), 0.28);
    const n = { mateNods: k === 'point' || k === 'smile' ? 1 : 0, mateLooks: k === 'shoulder' || k === 'point' || k === 'smile' ? 1 : 0, ticks: 3 * c.p('write', 0.1, 0.9), writing: k === 'write' ? 1 : 0, relief: c.p('shoulder', 0.3, 0.8) };
    const props = { clip };
    const base: Key = { tool: 'clip', gl: 0.1, n, props };
    switch (k) {
      case 'hear':
        return { ...base, r: easy(c).r, gr: 0.3, nod: 0.18, lean: 0.06 };
      case 'shoulder':
        // A hand on their shoulder while the hard part goes by.
        return { ...base, r: [0.17, 1.0 * (c.H / 1.6), TM.seat[2] + 0.02], gr: 0.15, palms: 0.3, lean: 0.1, nod: 0.24 };
      case 'point':
        // A word and a gesture at the screen, from behind them.
        return { ...base, r: c.bd(-0.14, 1.2, 0.34), gr: 0.15, palms: 0.3, lean: 0.14, nod: 0.2 + 0.03 * Math.sin(c.t * 3) };
      case 'write':
        return { ...base, r: add(clip, 0.02 + 0.04 * frac(u * 4), 0.05, 0.02), gr: 0.15, palms: 0.1, nod: 0.34 };
      case 'smile':
        return { ...base, r: easy(c).r, gr: 0.3, nod: 0.08 + 0.1 * Math.sin(u * PI * 2) };
      default:
        return { ...base, r: easy(c).r, gr: 0.3, nod: 0.1 };
    }
  },
};

// =============================================================================================
// 차 코너 (csTeaCorner, 2 × 1): a counter with a hot water dispenser at left, cups and tea at right, standing at it.

export const TE = {
  stand: 0.4,
  counter: 0.88,
  cupStack: [0.42, 0.97, 0.02] as V,
  under: [-0.34, 0.95, 0.02] as V,
  button: [-0.52, 1.14, -0.07] as V,
  tea: [0.1, 0.95, -0.02] as V,
  /** Where the dweller's cup waits while the bag goes in. */
  mat: [0.22, 0.95, 0.06] as V,
};
const atMouth = (c: Ctx): V => c.bd(-0.02, 0.86 * c.H - 0.03, 0.12);
const atChest = (c: Ctx): V => c.bd(-0.1, 0.68 * c.H, 0.2);
const TEA: Script = {
  seq: [['cup', 1.5], ['bag', 2.0], ['carry', 0.9], ['pour', 2.8], ['back', 0.9], ['blow', 1.6], ['sip', 2.4], ['ease', 3.0], ['sip2', 2.2], ['bin', 1.2]],
  at: (k) => (k === 'carry' || k === 'pour' ? st(TE.under[0] - 0.12, TE.stand) : k === 'ease' || k === 'sip2' || k === 'blow' || k === 'sip' ? st(0.12, TE.stand + 0.3, PI - 0.5) : st(0.16, TE.stand)),
  key(k, u, c) {
    const mouth = atMouth(c);
    const chest = atChest(c);
    const cup: V = k === 'cup' ? lerpV(TE.cupStack, TE.mat, sm(u, 0.15, 0.9)) : k === 'bag' ? TE.mat : k === 'carry' ? TE.under : k === 'pour' ? TE.under : k === 'back' ? chest : k === 'blow' ? add(mouth, 0, -0.03, 0.03) : k === 'sip' || k === 'sip2' ? add(mouth, 0, u > 0.2 && u < 0.8 ? 0 : -0.1, 0) : k === 'ease' ? chest : TE.cupStack;
    const n = { bag: c.p('bag', 0.3, 0.8), water: c.p('pour', 0.2, 0.9), pouring: k === 'pour' && u > 0.15 && u < 0.9 ? 1 : 0, steam: c.p('pour', 0.3, 0.6), gone: k === 'bin' ? sm(u, 0.3, 0.7) : 0 };
    const props = { cup, teaBag: k === 'bag' ? lerpV(add(TE.tea, 0, 0.04, 0), add(TE.mat, 0.02, 0.1, 0), sm(u, 0.1, 0.7)) : null };
    switch (k) {
      case 'cup':
        return { l: easy(c).l, gl: 0.3, tool: 'cup', nod: 0.22, lean: 0.06, n, props };
      case 'bag':
        // The cup steady on the counter in the right; the left brings a bag from the tin.
        return { l: props.teaBag ?? add(TE.tea, 0, 0.04, 0), gl: 0.75, tool: 'cup', palms: 0.2, nod: 0.3, lean: 0.08, n, props };
      case 'carry':
        return { l: easy(c).l, gl: 0.3, tool: 'cup', nod: 0.2, n, props };
      case 'pour':
        return { l: add(TE.button, 0, 0, 0.05), gl: 0.15, palms: 0.1, tool: 'cup', tap: u > 0.15 && u < 0.9, nod: 0.2, lean: 0.06, n, props };
      case 'bin':
        return { ...easy(c), nod: 0.14, n, props };
      case 'ease':
        // The shoulders down, the cup held in front of the chest; a slow look around.
        return { l: chest, gl: 0.4, tool: 'cup', nod: 0.04 + 0.03 * Math.sin(c.t * 0.9), lean: -0.03, n, props };
      default:
        return { l: easy(c).l, gl: 0.3, tool: 'cup', nod: -0.02, lean: -0.03, n, props };
    }
  },
};

// =============================================================================================
// 안마 의자 (csRestChair, 1 × 1): sat back with the legs on the rest, the remote in the right hand.

export const RC = {
  seat: [0, 0.54, 0.26] as V,
  remoteHome: [-0.34, 0.84, 0.42] as V,
};
const REST: Script = {
  seq: [['sit', 1.8], ['press', 1.4], ['back', 1.6], ['rest', 9.0], ['rub', 2.4], ['done', 1.4]],
  at: () => sat(RC.seat, 0, true),
  key(k, u, c) {
    const n = { recline: k === 'sit' ? 0 : k === 'press' ? 0 : k === 'back' ? sm(u, 0, 1) : k === 'done' ? 1 - sm(u, 0, 1) : 1, running: c.p('press', 0.5, 0.7) * (1 - c.p('done', 0, 0.3)), timer: c.p('rest') };
    const reclined = n.recline;
    const remote: V = k === 'sit' || k === 'done' ? RC.remoteHome : c.bd(-0.13, 0.16 + 0.04 * (1 - reclined), 0.22);
    const props = { remote };
    const lean = -0.42 * reclined + 0.01 * Math.sin(c.t * 1.2);
    const left: V = c.bd(0.24, 0.16, 0.14);
    switch (k) {
      case 'sit':
      case 'done':
        return { l: left, gl: 0.3, r: c.bd(-0.24, 0.16, 0.14), gr: 0.3, lean, nod: 0.1, n, props };
      case 'press':
        return { l: left, gl: 0.3, tool: 'remote', tap: u > 0.5 && u < 0.7, lean, nod: 0.2, n, props };
      case 'rub':
        // A hand up at the neck, working the place the headset sits.
        return { l: c.bd(0.1, 0.56, 0.0), gl: 0.3, tool: 'remote', lean, nod: 0.02 + 0.04 * Math.sin(c.t * 3), n, props };
      default:
        return { l: left, gl: 0.3, tool: 'remote', lean, nod: -0.02 + 0.02 * Math.sin(c.t * 1.2), n, props };
    }
  },
};

const SCRIPTS: Record<CsMotion, Script> = {
  csAnswer: ANSWER,
  csNote: NOTE,
  csShadow: SHADOW,
  csReview: REVIEW,
  csFeedback: FEEDBACK,
  csQueue: QUEUE,
  csSurge: SURGE,
  csVoc: VOC,
  csStaff: STAFF,
  csLookup: LOOKUP,
  csListenIn: LISTEN_IN,
  csRolePlay: ROLE,
  csHardCall: HARD,
  csCoach: COACH,
  csTea: TEA,
  csRest: REST,
};
