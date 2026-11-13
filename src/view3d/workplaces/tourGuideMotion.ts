import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 여행사, the made-up agency 구름나들 (2026-11-01). Each motion is a round of beats: where the dweller is, where the hands
 * go, what moves. The piece reads the same script by the same clock (tourGuide.ts), so the days fill in under the fingers, the
 * string runs from pin to pin and the stamp comes down on the form. Every place is invented.
 *
 * - 여행 일정 책상 (itineraryDesk): tgDraft a customer across the desk, a brochure circled, the trip built day by day on the screen and printed.
 *   tgCost a calculator, a screen of costs that add up, the price written in the ledger.
 * - 관광 지도 (travelMap): tgStudy a guidebook on the arm, a finger along the route, the talk tried aloud.
 *   tgFollow the next trip's route: a pin, a string run across the map, a second pin.
 * - 관광버스 (tourBus): tgBoarding the flag up by the door, planted, the mic, a talk to the group, heads counted.
 *   tgCare a tired traveller on a folding stool: a word, a bottle from the cool box, a hand on the shoulder. The tours themselves are off the lot; the coach leaves with them.
 * - 안내 책자 진열대 (tgBrochureRack): tgRestock a stack on the arm, the empty pockets filled one by one.
 * - 여권·사증 창구 (tgDocCounter): tgVisa passport against form, the list ticked, inked, stamped, handed back.
 * - 수하물·장비 탁자 (tgGearTable): tgTags a tag written and tied to a suitcase. tgRadio each tour receiver tried at the ear and racked.
 * - 단체 사진 벽 (tgPhotoWall): tgPinPhoto a new group photo looked at, pinned up, stood back from.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type TgMotion = 'tgDraft' | 'tgCost' | 'tgStudy' | 'tgFollow' | 'tgBoarding' | 'tgCare' | 'tgRestock' | 'tgVisa' | 'tgTags' | 'tgRadio' | 'tgPinPhoto';
export const TG_MOTIONS = new Set<string>(['tgDraft', 'tgCost', 'tgStudy', 'tgFollow', 'tgBoarding', 'tgCare', 'tgRestock', 'tgVisa', 'tgTags', 'tgRadio', 'tgPinPhoto']);
export type TgTool = 'pen' | 'book' | 'pin' | 'flag' | 'mic' | 'bottle' | 'stack' | 'stamp' | 'passport' | 'tag' | 'radio' | 'photo';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const tgPhase = (p: THREE.Vector3) => frac(p.x * 0.377 + p.z * 0.541);
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
  tool?: TgTool;
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
  at(k: string, round: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface TgNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: TgTool | null;
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
export function tgNow(m: TgMotion, t: number, ph: number, H = 1.6): TgNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.n) : A;
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
export function tgPose(m: TgMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = tgNow(m, t, tgPhase(par.getWorldPosition(new THREE.Vector3())), height);
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

/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;
/** How far a stamp's grip stands above its face. */
export const STAMP_UP = 0.085;

// =============================================================================================
// 여행 일정 책상 (itineraryDesk, 1 × 1): seated close at the front, the customer on a stool across it. A brochure or the ledger at the right, the calculator at the left.

export const IT = {
  seat: [0, 0.47, 0.62] as V,
  client: [0, 0.47, -0.92] as V,
  top: 0.74,
  keys: [-0.06, 0.77, 0.2] as V,
  calc: [-0.36, 0.76, 0.2] as V,
  paper: [0.3, 0.745, 0.2] as V,
  screen: [0, 1.08, -0.2] as V,
  print: [0.02, 0.745, 0.02] as V,
};
const penRestI: V = add(IT.paper, 0.13, 0.02, -0.15);
const leftEdgeI = add(IT.keys, -0.12, 0.03, 0.04);
const onPaper = add(IT.paper, -0.02, 0.03, 0.02);
const DRAFT: Script = {
  seq: [['ask', 2.6], ['open', 1.6], ['circle', 2.8], ['day1', 4.4], ['show', 2.8], ['day2', 4.4], ['print', 2.2]],
  at: () => sat(IT.seat),
  key(k, u, c) {
    const n = { days: 2 * c.p('day1', 0, 0.95) + 2 * c.p('day2', 0, 0.95), brochure: 1, opened: c.p('open', 0.2, 0.7), circle: c.p('circle', 0.1, 0.9), clTalks: k === 'ask' ? 1 : 0, clNods: k === 'show' || k === 'print' ? 1 : 0, client: 1, print: c.p('print', 0.2, 0.8), mode: 0 };
    const a = u * PI * 2.2;
    const pen: V = k === 'circle' ? add(IT.paper, 0.05 * Math.cos(a), PEN_UP + 0.002 * Math.sin(c.t * 12), 0.04 * Math.sin(a)) : penRestI;
    const props = { pen };
    switch (k) {
      case 'ask':
        return { l: leftEdgeI, gl: 0.3, r: talkSit(c, -0.14), gr: 0.15, palms: 0.5, lean: 0.06, nod: 0.02 + 0.05 * Math.sin(c.t * 2.2), n, props };
      case 'open':
        return { l: leftEdgeI, gl: 0.3, r: onPaper, gr: 0.1, palms: 0.05, lean: 0.14, nod: 0.28, n, props };
      case 'circle':
        return { l: leftEdgeI, gl: 0.3, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      case 'show':
        // Turned to the customer: a hand towards the screen, the plan so far.
        return { l: leftEdgeI, gl: 0.3, r: c.bd(-0.12, 0.62, 0.42), gr: 0.12, palms: 0.45, lean: 0.1, nod: 0.02 + 0.03 * Math.sin(c.t * 2.8), n, props };
      case 'print':
        return { l: leftEdgeI, gl: 0.3, r: add(lerpV(IT.paper, IT.print, sm(u, 0.2, 0.8)), 0, 0.03, 0), gr: 0.1, palms: 0.05, lean: 0.16, nod: 0.12, n, props };
      default:
        return { ...typing(IT.keys, c.t), nod: 0.1, lean: 0.08, n, props };
    }
  },
};
const COST: Script = {
  seq: [['open', 1.6], ['tap', 4.4], ['enter', 4.2], ['check', 2.6], ['write', 3.4], ['ok', 1.6]],
  at: () => sat(IT.seat),
  key(k, u, c) {
    const n = { ledger: 1, mode: 1, opened: c.p('open', 0.2, 0.8), rows: 2 * c.p('tap', 0, 0.95) + 2 * c.p('enter', 0, 0.95), press: k === 'tap' ? Math.abs(Math.sin(c.t * 9)) : 0, margin: c.p('check', 0.1, 0.8), lines: 3 * c.p('write', 0.05, 0.95), done: c.p('ok', 0.2, 0.6) };
    const pen: V = k === 'write' ? add(IT.paper, -0.05 + 0.1 * frac(u * 3), PEN_UP + 0.004 * Math.sin(c.t * 16), -0.05 + 0.04 * Math.floor(u * 3)) : penRestI;
    const props = { pen };
    switch (k) {
      case 'open':
        return { l: add(IT.calc, 0.02, 0.04, 0), gl: 0.15, r: onPaper, gr: 0.1, palms: 0.05, lean: 0.12, nod: 0.24, n, props };
      case 'tap':
        return { l: add(IT.calc, 0.012 * Math.sin(c.t * 7), 0.035 + 0.006 * Math.abs(Math.sin(c.t * 9)), 0.012 * Math.cos(c.t * 5)), gl: 0.2, r: onPaper, gr: 0.12, palms: 0.05, lean: 0.14, nod: 0.3, n, props };
      case 'enter':
        return { ...typing(IT.keys, c.t), nod: 0.1, lean: 0.08, n, props };
      case 'check':
        return { l: add(IT.calc, 0, 0.05, 0.01), gl: 0.2, r: c.bd(-0.04, 0.62 * (c.H / 1.6), 0.14), gr: 0.55, palms: 0.5, lean: 0.04, nod: 0.03, n, props };
      case 'write':
        return { l: add(IT.calc, 0.1, 0.03, 0.02), gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      default:
        return { l: add(IT.calc, 0.1, 0.03, 0.02), gl: 0.2, r: onPaper, gr: 0.1, palms: 0.05, lean: 0.02, nod: 0.1 * Math.sin(u * PI * 2), n, props };
    }
  },
};

// =============================================================================================
// 관광 지도 (travelMap, 2 × 1): a big wall map of an invented world, pins and strings on it.

export const TM = { face: -0.4, cy: 1.35, w: 1.7, h: 1.1, stand: 0.08, read: 0.34 };
/** The invented places, as fractions of the map (kept where a hand gets to). */
export const PLACES: ReadonlyArray<{ name: string; u: number; v: number }> = [
  { name: '나르벨 제도', u: 0.14, v: 0.3 },
  { name: '솔라시 항', u: 0.32, v: 0.48 },
  { name: '미르코 고원', u: 0.44, v: 0.26 },
  { name: '테와라 사막', u: 0.62, v: 0.38 },
  { name: '아셀린 호수', u: 0.56, v: 0.68 },
  { name: '루아노 섬', u: 0.76, v: 0.74 },
  { name: '페룬달 산맥', u: 0.72, v: 0.24 },
  { name: '하이몬 곶', u: 0.88, v: 0.46 },
];
const ROUTES: ReadonlyArray<readonly [number, number]> = [[0, 1], [2, 3], [4, 5], [6, 7]];
export const routeOf = (round: number) => ROUTES[wrap(round, ROUTES.length)];
export const mapPoint = (i: number, off = 0.015): V => {
  const P = PLACES[wrap(i, PLACES.length)];
  return [-TM.w / 2 + P.u * TM.w, TM.cy + (0.5 - P.v) * TM.h, TM.face + off];
};
const routeMidX = (round: number) => {
  const [a, b] = routeOf(round);
  return (mapPoint(a)[0] + mapPoint(b)[0]) / 2 - 0.1;
};
const holdBookT = (c: Ctx): V => c.bd(0.16, 1.03 * (c.H / 1.6), 0.26);
const STUDY: Script = {
  seq: [['look', 2.4], ['trace', 4.4], ['book', 3.2], ['say', 3.6], ['trace2', 3.8], ['nod', 1.8]],
  at: (k, round) => (k === 'look' || k === 'nod' || k === 'book' ? st(routeMidX(round), TM.read) : st(routeMidX(round), TM.stand)),
  key(k, u, c) {
    const [a, b] = routeOf(c.round);
    const A = mapPoint(a, 0.04);
    const B = mapPoint(b, 0.04);
    const n = { route: wrap(c.round, ROUTES.length), lit: k === 'trace' ? u : k === 'trace2' ? 1 - u : k === 'look' ? 0 : 1, notes: c.p('book', 0.1, 0.9), speaking: k === 'say' ? 1 : 0 };
    const props = { book: holdBookT(c) };
    switch (k) {
      case 'look':
        return { ...easy(c), r: c.bd(-0.16, 1.12 + 0.04 * Math.sin(c.t * 1.8), 0.28), gr: 0.15, palms: 0.1, nod: -0.08, lean: 0.03, n, props };
      case 'trace':
        return { tool: 'book', r: lerpV(A, B, u), gr: 0.15, palms: 0.1, nod: -0.06, lean: 0.06, n, props };
      case 'trace2':
        return { tool: 'book', r: lerpV(B, A, u), gr: 0.15, palms: 0.1, nod: -0.06, lean: 0.06, n, props };
      case 'book':
        return { tool: 'book', r: add(holdBookT(c), -0.12, 0.06, 0), gr: 0.1, palms: 0.1, nod: 0.3, n, props };
      case 'say':
        // Trying the talk aloud, the free hand going out to the map as if to a group behind them.
        return { tool: 'book', r: c.bd(-0.26, 1.16 + 0.05 * Math.sin(c.t * 3.6), 0.22), gr: 0.12, palms: 0.5, nod: 0.02 + 0.05 * Math.sin(c.t * 3.6), n, props };
      default:
        return { tool: 'book', r: easy(c).r, gr: 0.3, nod: 0.08 * Math.sin(u * PI * 2), n, props };
    }
  },
};
const FOLLOW: Script = {
  seq: [['read', 2.4], ['take', 1.2], ['pin', 1.8], ['stretch', 3.2], ['pin2', 1.8], ['check', 2.4], ['back', 1.6, 0.9]],
  at: (k, round) => (k === 'read' || k === 'take' || k === 'back' ? st(routeMidX(round), TM.read) : st(routeMidX(round), TM.stand)),
  key(k, u, c) {
    const [a, b] = routeOf(c.round);
    const A = mapPoint(a, 0.03);
    const B = mapPoint(b, 0.03);
    const hold = c.bd(-0.2, 1.08, 0.28);
    // From the pouch at the hip.
    const tray: V = c.bd(-0.26, 0.94, 0.08);
    const hand: V = k === 'take' ? lerpV(tray, hold, sm(u, 0.2, 1)) : k === 'pin' ? lerpV(hold, A, sm(u, 0.1, 0.7)) : k === 'stretch' ? lerpV(A, B, sm(u, 0.05, 0.95)) : k === 'pin2' ? B : hold;
    const n = { route: wrap(c.round, ROUTES.length), pinA: c.p('pin', 0.7, 0.8), pinB: c.p('pin2', 0.5, 0.6), running: k === 'stretch' || k === 'pin2' ? 1 : 0, strung: c.p('pin2', 0.6, 0.8), press: k === 'pin' || k === 'pin2' ? sm(u, 0.5, 0.7) : 0 };
    const props = { pin: k === 'take' || k === 'pin' || k === 'stretch' || k === 'pin2' ? hand : null, end: k === 'stretch' || k === 'pin2' ? hand : null };
    switch (k) {
      case 'read':
        return { ...easy(c), r: c.bd(-0.16, 1.1, 0.28), gr: 0.15, palms: 0.1, nod: -0.08, lean: 0.03, n, props };
      case 'take':
      case 'pin':
      case 'stretch':
      case 'pin2':
        return { l: easy(c).l, gl: 0.3, tool: 'pin', nod: -0.06, lean: 0.06, n, props };
      case 'check':
        return { l: easy(c).l, gl: 0.3, r: lerpV(A, B, 0.5 + 0.5 * Math.sin(c.t * 1.6)), gr: 0.15, palms: 0.1, nod: -0.06, n, props };
      default:
        return { ...easy(c), nod: 0.08 * Math.sin(u * PI * 2) - 0.04, n, props };
    }
  },
};

// =============================================================================================
// 관광버스 (tourBus, 2 × 1, the coach drawn over the footprint): along x, its nose at +x, the door on the side towards the street (+z).

export const BUS = {
  L: 5.8,
  W: 1.86,
  z: -0.46,
  floor: 0.42,
  roof: 2.5,
  wheelR: 0.33,
  fAxle: 1.75,
  rAxle: -1.55,
  doorX: 1.85,
  /** How far the door's leaves are from the body's side. */
  side: 0.47,
  /** Where the flag stands in its socket, by the grip. */
  socket: [0.92, 1.02, 0.56] as V,
  /** The mic on its clip, by the grip. */
  clip: [1.18, 1.2, 0.5] as V,
  guide: [1.18, 0.84] as readonly [number, number],
  stool: [0.08, 0.42, 1.0] as V,
  careAt: [0.6, 0.92] as readonly [number, number],
  /** The cool box's bottle by the grip. */
  cool: [0.55, 1.0, 0.56] as V,
};
const mouthOf = (c: Ctx): V => c.bd(-0.04, 0.84 * c.H, 0.14);
const BOARDING: Script = {
  seq: [['flag', 3], ['wave', 3.2], ['plant', 1.2], ['mic', 1.2], ['talk', 4.6], ['point', 2.8], ['count', 3.4], ['hang', 1.2], ['bow', 1.6]],
  at: () => st(BUS.guide[0], BUS.guide[1], -PI / 2),
  key(k, u, c) {
    const up = c.bd(-0.16, 1.28, 0.22);
    const flagAt: V = k === 'flag' ? lerpV(BUS.socket, up, sm(u, 0.1, 0.45)) : k === 'wave' ? add(up, 0, 0.05 * Math.sin(c.t * 3.4), 0.06 * Math.sin(c.t * 3.4)) : k === 'plant' ? lerpV(up, BUS.socket, sm(u, 0.1, 0.95)) : BUS.socket;
    const mouth = mouthOf(c);
    const micAt: V = k === 'mic' ? lerpV(BUS.clip, mouth, sm(u, 0.1, 0.95)) : k === 'hang' ? lerpV(mouth, BUS.clip, sm(u, 0.05, 0.9)) : k === 'talk' || k === 'point' || k === 'count' ? mouth : BUS.clip;
    const n = { door: 1, group: 1, wave: k === 'flag' ? sm(u, 0.3, 0.6) : k === 'wave' ? 1 : 0, speaking: k === 'talk' || k === 'point' || k === 'count' ? 1 : 0, grpLook: k === 'point' ? 1 : 0, grpCounted: k === 'count' ? 3 * u : k === 'hang' || k === 'bow' ? 3 : 0, grpBow: k === 'bow' ? 1 : 0, flagTilt: k === 'flag' ? sm(u, 0.2, 0.5) : k === 'wave' ? 1 : k === 'plant' ? 1 - sm(u, 0.2, 0.8) : 0 };
    const props = { flag: flagAt, mic: micAt };
    switch (k) {
      case 'flag':
        return { l: easy(c).l, gl: 0.3, tool: 'flag', nod: 0.02, lean: 0.02, n, props };
      case 'wave':
        return { l: c.bd(0.28, 1.0, 0.24), gl: 0.15, palms: 0.5, tool: 'flag', nod: -0.04 + 0.03 * Math.sin(c.t * 2.4), n, props };
      case 'plant':
        return { l: easy(c).l, gl: 0.3, tool: 'flag', nod: 0.1, lean: 0.06, n, props };
      case 'mic':
      case 'hang':
        return { l: easy(c).l, gl: 0.3, tool: 'mic', nod: 0.06, n, props };
      case 'talk':
        return { l: c.bd(0.26, 1.04 + 0.05 * Math.sin(c.t * 3.1), 0.28), gl: 0.15, palms: 0.5, tool: 'mic', nod: 0.02 + 0.05 * Math.sin(c.t * 3.1), n, props };
      case 'point':
        // Over the shoulder to the door: this way, watch the step.
        return { l: c.bd(0.1, 1.22, 0.36), gl: 0.5, palms: 0.2, tool: 'mic', nod: 0.02, n, props };
      case 'count': {
        // A finger along the heads.
        const s = 0.32 - 0.5 * u;
        return { l: c.bd(s, 1.2, 0.36), gl: 0.5, palms: 0.2, tool: 'mic', nod: 0.02, n, props };
      }
      default:
        return { ...easy(c), lean: 0.2 * Math.sin(u * PI), nod: 0.2 * Math.sin(u * PI), n, props };
    }
  },
};
const CARE: Script = {
  seq: [['notice', 2], ['ask', 3], ['bottle', 1.6], ['give', 2.6], ['pat', 3.2], ['fan', 3.2], ['ok', 2]],
  at: () => st(BUS.careAt[0], BUS.careAt[1], -PI / 2),
  key(k, u, c) {
    const hold = c.bd(-0.12, 1.06, 0.3);
    const toThem = c.bd(-0.08, 0.88, 0.44);
    const bottle: V = k === 'bottle' ? lerpV(BUS.cool, hold, sm(u, 0.2, 0.95)) : k === 'give' ? lerpV(hold, toThem, sm(u, 0.05, 0.7)) : BUS.cool;
    const n = { traveller: 1, door: 0, drinking: k === 'pat' || k === 'fan' ? 1 : 0, took: c.p('give', 0.75, 0.85), trTalks: k === 'ask' ? 1 : 0, better: c.p('fan', 0.4, 1), trNods: k === 'ok' ? 1 : 0 };
    const props = { bottle: k === 'bottle' || k === 'give' ? bottle : k === 'notice' || k === 'ask' ? BUS.cool : null };
    const shoulder: V = [BUS.stool[0] + 0.02, 0.92, BUS.stool[2] - 0.2];
    switch (k) {
      case 'notice':
        return { ...easy(c), lean: 0.1, nod: 0.26, n, props };
      case 'ask':
        return { l: c.bd(0.2, 0.92, 0.32), gl: 0.15, palms: 0.5, r: easy(c).r, lean: 0.24, nod: 0.3 + 0.05 * Math.sin(c.t * 2.4), n, props };
      case 'bottle':
        return { l: easy(c).l, gl: 0.3, tool: 'bottle', nod: 0.14, lean: 0.1, n, props };
      case 'give':
        return u < 0.8 ? { l: easy(c).l, gl: 0.3, tool: 'bottle', nod: 0.28, lean: 0.24, n, props } : { ...easy(c), nod: 0.28, lean: 0.2, n, props };
      case 'pat':
        return { l: add(shoulder, 0, 0.03 * Math.abs(Math.sin(c.t * 2.2)), 0), gl: 0.12, palms: 0.1, r: easy(c).r, lean: 0.26, nod: 0.3, n, props };
      case 'fan':
        // A hand fanning, the brochure of the day doing the work of the air.
        return { r: add(c.bd(-0.1, 1.04, 0.42), 0, 0.05 * Math.sin(c.t * 8), 0), gr: 0.5, palms: 0.5, l: easy(c).l, gl: 0.3, lean: 0.14, nod: 0.24, n, props };
      default:
        return { ...easy(c), lean: 0.06, nod: 0.1 * Math.sin(u * PI * 2) + 0.1, n, props };
    }
  },
};

// =============================================================================================
// 안내 책자 진열대 (tgBrochureRack, 2 × 1): a stand of sloped pockets; the empties are in the two rows a hand reaches easily.

export const BR = {
  stand: 0.3,
  face: -0.13,
  cols: [-0.72, -0.43, -0.14, 0.14, 0.43, 0.72] as readonly number[],
  rows: [0.5, 0.82, 1.14, 1.46] as readonly number[],
  crate: [0.56, 0.62, 0.3] as V,
};
/** The four pockets filled in a round, by [column, row]. */
export const BR_EMPTY: ReadonlyArray<readonly [number, number]> = [[1, 2], [2, 1], [3, 2], [4, 1]];
export const brSlot = (i: number, out = 0.04): V => {
  const [cx, r] = BR_EMPTY[wrap(i, BR_EMPTY.length)];
  return [BR.cols[cx], BR.rows[r] + 0.14, BR.face + out];
};
const STOCK_X = 0;
const RESTOCK: Script = {
  seq: [['look', 1.8], ['take', 1.2], ['s0', 1.5], ['s1', 1.5], ['s2', 1.5], ['s3', 1.5], ['tidy', 2.2], ['down', 1.4]],
  at: (k) => {
    const i = ['s0', 's1', 's2', 's3'].indexOf(k);
    return st(i < 0 ? STOCK_X : BR.cols[BR_EMPTY[i][0]] - 0.12, BR.stand);
  },
  key(k, u, c) {
    const hold = c.bd(0.16, 1.02 * (c.H / 1.6), 0.26);
    const stack: V = k === 'take' ? lerpV(add(hold, 0.0, -0.24, 0.1), hold, sm(u, 0.1, 0.9)) : k === 'down' ? lerpV(hold, add(hold, 0.0, -0.24, 0.1), sm(u, 0.1, 0.9)) : hold;
    const n = { f0: c.p('s0', 0.45, 0.8), f1: c.p('s1', 0.45, 0.8), f2: c.p('s2', 0.45, 0.8), f3: c.p('s3', 0.45, 0.8), left: 1 - (c.p('s0') + c.p('s1') + c.p('s2') + c.p('s3')) / 4, carry: k === 'look' ? 0 : 1 };
    const props = { stack };
    const fill = (i: number): Key => {
      const home = brSlot(i, 0.06);
      const from = add(hold, -0.14, 0.05, 0);
      return { tool: 'stack', r: lerpV(from, home, sm(u, 0.05, 0.6)), gr: 0.45, palms: 0.1, nod: -0.04, lean: 0.08, n, props };
    };
    switch (k) {
      case 'look':
        return { ...easy(c), r: c.bd(-0.14, 1.14 + 0.05 * Math.sin(c.t * 2), 0.3), gr: 0.15, palms: 0.1, nod: 0.02, lean: 0.03, n, props };
      case 'take':
      case 'down':
        return { tool: 'stack', r: easy(c).r, gr: 0.3, nod: 0.22, lean: 0.06, n, props };
      case 's0':
        return fill(0);
      case 's1':
        return fill(1);
      case 's2':
        return fill(2);
      case 's3':
        return fill(3);
      default:
        // The rows squared up with the side of the hand.
        return { tool: 'stack', r: add(brSlot(1, 0.06), 0.3 * Math.sin(u * PI), 0, 0), gr: 0.15, palms: 0.1, nod: 0.04, lean: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 여권·사증 창구 (tgDocCounter, 2 × 1): placed facing back into the room, the customer across it. Passport at the left, form in the middle, stamp and ink at the right.

export const DC = {
  stand: 0.52,
  x: 0.1,
  top: 0.92,
  form: [0.14, 0.925, 0.2] as V,
  pass: [-0.24, 0.935, 0.2] as V,
  ink: [0.44, 0.945, 0.17] as V,
  stampHome: [0.44, 0.925, 0.0] as V,
  penHome: [0.32, 0.94, 0.22] as V,
  /** Where the customer takes it, at the far edge. */
  away: [0.0, 0.925, -0.2] as V,
  client: [-0.5, -0.72] as readonly [number, number],
};
const stampAtHomeD = add(DC.stampHome, 0, STAMP_UP, 0);
const overForm = (lift: number): V => add(DC.form, 0.03, STAMP_UP + lift, -0.06);
const passUp = (c: Ctx): V => c.bd(0.12, 1.06 * (c.H / 1.6), 0.3);
const VISA: Script = {
  seq: [['take', 1.6], ['raise', 3.2], ['compare', 3.4], ['ask', 2.6], ['tick', 3.2], ['ink', 1.4], ['carry', 0.8], ['down', 1], ['lift', 0.8], ['park', 0.8], ['give', 1.8], ['bow', 1.6]],
  at: () => st(DC.x, DC.stand),
  key(k, u, c) {
    const n = { client: 1, onCounter: k === 'take' ? sm(u, 0.1, 0.6) : 1, gone: k === 'give' ? sm(u, 0.3, 0.9) : k === 'bow' ? 1 : 0, ticks: 4 * c.p('tick', 0.05, 0.95), sealed: c.p('down', 0.55, 0.7), clTalks: k === 'take' || k === 'ask' ? 1 : 0, clBow: k === 'bow' ? 1 : 0, clReach: k === 'give' ? 1 : 0, hi: k === 'compare' ? 1 : 0, press: k === 'down' ? sm(u, 0.3, 0.6) * (1 - sm(u, 0.75, 1)) : 0, passOpen: c.p('raise', 0.1, 0.5) };
    const up = passUp(c);
    const pass: V = k === 'raise' ? lerpV(DC.pass, up, sm(u, 0.05, 0.4)) : k === 'compare' ? lerpV(up, DC.pass, sm(u, 0, 0.2)) : DC.pass;
    const stamp: V = k === 'ink' ? lerpV(stampAtHomeD, add(DC.ink, 0, STAMP_UP + 0.012 * (1 - Math.abs(Math.sin(u * PI * 2))), 0), sm(u, 0.1, 0.55)) : k === 'carry' ? lerpV(add(DC.ink, 0, STAMP_UP + 0.04, 0), overForm(0.06), sm(u, 0, 1)) : k === 'down' ? overForm(0.06 * (1 - sm(u, 0.2, 0.6)) + 0.06 * sm(u, 0.75, 1)) : k === 'lift' ? overForm(0.06 + 0.04 * u) : k === 'park' ? lerpV(overForm(0.1), stampAtHomeD, sm(u, 0.05, 0.95)) : stampAtHomeD;
    const pen: V = k === 'tick' ? add(DC.form, -0.04 + 0.05 * Math.abs(Math.sin(u * PI * 4)), PEN_UP + 0.004 * Math.sin(c.t * 18), -0.06 + 0.11 * frac(u) ) : DC.penHome;
    const props = { stamp, pen, pass };
    const left = add(DC.form, -0.17, 0.03, 0.05);
    switch (k) {
      case 'take':
        return { l: left, gl: 0.1, r: add(DC.form, 0.03, 0.03, -0.1 * (1 - sm(u, 0.2, 0.7))), gr: 0.15, palms: 0.05, nod: 0.22, lean: 0.1, n, props };
      case 'raise':
        // The photo held up beside the face across the counter: the same person?
        return { tool: 'passport', r: easy(c).r, gr: 0.3, nod: 0.0 + 0.03 * Math.sin(c.t * 1.8), lean: 0.05, n, props };
      case 'compare':
        return { l: add(DC.pass, 0.02, 0.03, -0.04 + 0.08 * u), gl: 0.12, r: add(DC.form, 0.02, 0.03, -0.08 + 0.16 * u), gr: 0.12, palms: 0.05, nod: 0.34, lean: 0.14, n, props };
      case 'ask':
        return { l: left, gl: 0.1, r: c.bd(-0.2, 1.06 + 0.03 * Math.sin(c.t * 3), 0.3), gr: 0.12, palms: 0.5, nod: 0.04 + 0.04 * Math.sin(c.t * 2.5), lean: 0.05, n, props };
      case 'tick':
        return { l: left, gl: 0.1, palms: 0.05, tool: 'pen', nod: 0.36, lean: 0.14, n, props };
      case 'ink':
      case 'carry':
      case 'lift':
      case 'park':
        return { l: left, gl: 0.1, palms: 0.05, tool: 'stamp', nod: 0.28, lean: 0.12, n, props };
      case 'down':
        return { l: left, gl: 0.1, palms: 0.05, tool: 'stamp', nod: 0.34, lean: 0.14 + 0.05 * n.press, n, props };
      case 'give':
        return { l: left, gl: 0.3, r: add(lerpV(DC.form, DC.away, 0.5 * sm(u, 0.1, 0.8)), 0, 0.03, 0.02), gr: 0.1, palms: 0.05, nod: 0.12, lean: 0.14, n, props };
      default:
        return { ...easy(c), lean: 0.22 * Math.sin(u * PI), nod: 0.2 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 수하물·장비 탁자 (tgGearTable, 2 × 1): tags at the left, a suitcase standing at the right, the receivers on their charging rack in the middle-back.

export const GT = {
  stand: 0.46,
  top: 0.9,
  tags: [-0.28, 0.91, 0.12] as V,
  writing: [-0.02, 0.905, 0.14] as V,
  handle: [0.58, 1.18, 0.12] as V,
  /** Where the suitcase's stood. */
  case: [0.58, 0.9, 0.08] as V,
  rack: [-0.34, 0.92, -0.02] as V,
  sheet: [0.14, 0.905, 0.12] as V,
};
/** Each receiver's slot on the rack. */
export const gtSlot = (i: number): V => [GT.rack[0] + wrap(i, 6) * 0.1 - 0.0, GT.rack[1] + 0.09, GT.rack[2]];
const penRestT: V = add(GT.writing, 0.2, 0.02, -0.14);
const TAGS: Script = {
  seq: [['pick', 1.2], ['write', 3.4], ['walk', 0.8, 0.8], ['loop', 2.2], ['tie', 2.6], ['check', 1.8], ['back', 0.8, 0.8]],
  at: (k) => (k === 'loop' || k === 'tie' || k === 'check' || k === 'walk' ? st(0.46, GT.stand) : st(-0.06, GT.stand)),
  key(k, u, c) {
    const hand = c.bd(-0.12, 1.04, 0.28);
    const tag: V = k === 'pick' ? lerpV(GT.tags, GT.writing, sm(u, 0.1, 0.9)) : k === 'write' ? GT.writing : k === 'walk' ? hand : k === 'loop' ? lerpV(hand, add(GT.handle, -0.02, -0.03, 0.04), sm(u, 0.1, 0.8)) : add(GT.handle, -0.02, -0.03, 0.04);
    const pen: V = k === 'write' ? add(GT.writing, -0.03 + 0.06 * frac(u * 3), PEN_UP + 0.004 * Math.sin(c.t * 16), -0.012 + 0.012 * Math.floor(u * 3)) : penRestT;
    const n = { tagGone: k === 'pick' ? 0 : 1, lines: 3 * c.p('write', 0.05, 0.95), tied: c.p('tie', 0.5, 0.8), inTag: k === 'pick' || k === 'write' || k === 'walk' || k === 'loop' ? 1 : 0, colour: wrap(c.round, 4), tying: k === 'tie' ? 1 : 0 };
    const props = { tag, pen };
    switch (k) {
      case 'pick':
        return { l: add(tag, -0.05, 0.03, 0.02), gl: 0.6, r: easy(c).r, nod: 0.3, lean: 0.12, palms: 0.05, n, props };
      case 'write':
        return { l: add(GT.writing, -0.11, 0.03, 0.01), gl: 0.15, palms: 0.05, tool: 'pen', nod: 0.34, lean: 0.14, n, props };
      case 'walk':
      case 'loop':
        return { l: easy(c).l, gl: 0.3, tool: 'tag', nod: 0.24, lean: 0.08, n, props };
      case 'tie':
        // Both hands at the handle, the thread looped and drawn tight.
        return { l: add(GT.handle, -0.09, 0.0, 0.05), gl: 0.7, r: add(GT.handle, 0.0 + 0.03 * Math.sin(c.t * 5), -0.02, 0.06), gr: 0.75, palms: 0.1, nod: 0.26, lean: 0.12, n, props };
      case 'check':
        return { l: easy(c).l, gl: 0.3, r: add(GT.handle, -0.02, -0.08, 0.05), gr: 0.25, palms: 0.1, nod: 0.26, lean: 0.08, n, props };
      default:
        return { ...easy(c), nod: 0.1, n, props };
    }
  },
};
const radioEar = (c: Ctx): V => c.bd(-0.15, 0.9 * c.H, 0.02);
const RADIO: Script = {
  seq: [['take', 1.2], ['ear', 2.8], ['press', 1.6], ['ear2', 2.2], ['rack', 1.2], ['tick', 2.8]],
  at: (k, round) => (k === 'tick' ? st(0.02, GT.stand) : st(gtSlot(round)[0] - 0.1, GT.stand)),
  key(k, u, c) {
    const slot = gtSlot(c.round);
    const ear = radioEar(c);
    const radio: V = k === 'take' ? lerpV(slot, ear, sm(u, 0.15, 0.98)) : k === 'rack' ? lerpV(ear, slot, sm(u, 0.05, 0.9)) : k === 'tick' ? slot : ear;
    const pen: V = k === 'tick' ? add(GT.sheet, -0.03 + 0.05 * Math.abs(Math.sin(u * PI * 3)), PEN_UP + 0.004 * Math.sin(c.t * 16), -0.04 + 0.01 * wrap(c.round, 6)) : penRestT;
    const n = { slot: wrap(c.round, 6), out: k === 'tick' ? 0 : 1, sound: k === 'ear2' ? 1 : 0, ok: c.p('ear2', 0.1, 0.3), ticks: wrap(c.round, 6) + c.p('tick', 0.3, 0.8), press: k === 'press' ? 1 : 0 };
    const props = { radio, pen };
    switch (k) {
      case 'take':
      case 'rack':
        return { l: c.bd(0.2, 0.96, 0.3), gl: 0.2, palms: 0.05, tool: 'radio', nod: 0.2, lean: 0.1, n, props };
      case 'ear':
        return { l: c.bd(0.2, 0.96, 0.3), gl: 0.2, palms: 0.05, tool: 'radio', nod: 0.14 + 0.03 * Math.sin(c.t * 1.8), n, props };
      case 'press':
        // The thumb on its test button, the base's lamp answering; listening for the tone.
        return { l: c.bd(0.2, 0.96, 0.3), gl: 0.2, palms: 0.05, tap: u > 0.2 && u < 0.6, tool: 'radio', nod: 0.16, n, props };
      case 'ear2':
        return { l: c.bd(0.2, 0.96, 0.3), gl: 0.2, palms: 0.05, tool: 'radio', nod: 0.05 + 0.08 * Math.sin(c.t * 2.2), n, props };
      default:
        return { l: add(GT.sheet, -0.14, 0.03, 0.02), gl: 0.15, palms: 0.05, tool: 'pen', nod: 0.34, lean: 0.14, n, props };
    }
  },
};

// =============================================================================================
// 단체 사진 벽 (tgPhotoWall, 2 × 1): a cork board of past groups, a ledge with the new prints at its right.

export const PW = {
  face: -0.38,
  stand: 0.08,
  back: 0.44,
  ledge: [0.66, 0.98, -0.22] as V,
};
/** Where the new photo goes, a different place each round, by the hand's reach. */
export const pwSlot = (i: number): V => {
  const k = wrap(i, 4);
  return [k % 2 ? 0.28 : -0.28, k < 2 ? 1.42 : 1.12, PW.face + 0.016];
};
const PIN_PHOTO: Script = {
  seq: [['look', 2.6], ['pick', 1.4], ['hold', 2.4], ['pin', 1.8], ['press', 0.9], ['step', 1.6, 0.9], ['smile', 1.8]],
  at: (k, round) => (k === 'look' ? st(0.34, PW.back) : k === 'pick' || k === 'hold' ? st(0.5, 0.14) : k === 'step' || k === 'smile' ? st(pwSlot(round)[0] - 0.06, PW.back + 0.08) : st(pwSlot(round)[0] - 0.12, PW.stand)),
  key(k, u, c) {
    const slot = add(pwSlot(c.round), 0, 0, 0.012);
    const hold = c.bd(-0.12, 1.14, 0.3);
    const photo: V = k === 'pick' ? lerpV(add(PW.ledge, 0, 0.03, 0), hold, sm(u, 0.2, 0.95)) : k === 'hold' ? hold : k === 'pin' ? lerpV(hold, slot, sm(u, 0.1, 0.8)) : k === 'press' ? slot : PW.ledge;
    const n = { slot: wrap(c.round, 4), placed: c.p('press', 0, 0.2), inHand: k === 'pick' || k === 'hold' || k === 'pin' ? 1 : 0, press: k === 'press' ? 1 : 0, smile: k === 'smile' ? 1 : 0 };
    const props = { photo: n.inHand > 0.5 ? photo : null };
    switch (k) {
      case 'look':
        return { ...easy(c), r: c.bd(-0.16, 1.26 + 0.05 * Math.sin(c.t * 1.7), 0.3), gr: 0.15, palms: 0.1, nod: -0.08, lean: 0.03, n, props };
      case 'pick':
      case 'pin':
        return { l: easy(c).l, gl: 0.3, tool: 'photo', nod: 0.02, lean: 0.06, n, props };
      case 'hold':
        return { l: easy(c).l, gl: 0.3, tool: 'photo', nod: 0.22 + 0.03 * Math.sin(c.t * 1.4), n, props };
      case 'press':
        return { l: easy(c).l, gl: 0.3, r: add(slot, 0, 0.05, 0.03), gr: 0.1, palms: 0.1, tap: u > 0.2 && u < 0.6, nod: -0.06, n, props };
      default:
        return { ...easy(c), nod: k === 'smile' ? 0.1 * Math.sin(u * PI * 2) - 0.04 : -0.06, n, props };
    }
  },
};

const SCRIPTS: Record<TgMotion, Script> = {
  tgDraft: DRAFT,
  tgCost: COST,
  tgStudy: STUDY,
  tgFollow: FOLLOW,
  tgBoarding: BOARDING,
  tgCare: CARE,
  tgRestock: RESTOCK,
  tgVisa: VISA,
  tgTags: TAGS,
  tgRadio: RADIO,
  tgPinPhoto: PIN_PHOTO,
};
