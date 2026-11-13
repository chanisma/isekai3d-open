import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at a branch of the made-up 봄볕보험 (2026-11-01). Each motion is a round of beats: where the dweller is, where the hands go, what
 * moves. The piece reads the same script by the same clock (insuranceAgent.ts), so the row lit on the screen is the row the family is
 * nodding at, and the sum on the calculator is the payout on the slip. Warm and unhurried: someone's worry is being looked after.
 *
 * - 설계 책상 (agentDesk): sat. bhDesign a family's needs read, bars built up, summed and marked. bhCall a client rung by the desk
 *   phone, a note typed one-handed, ticked off the list. bhStudy a product book held open and underlined. bhReview a claim's folder
 *   read, ticked, typed and sealed. bhCoverage the coverage chart compared and a report note written.
 * - 상담 부스 (consultBooth): sat across from people. bhConsult a family through a policy on the shared screen, row by row, signed.
 *   bhListen a worry heard out, a note, the tissues pushed over. bhBig a company's head: cards in two hands, the staff plan, the
 *   contract stamped, up on the feet for a bow.
 * - 실적 현황판 (bhMorningBoard): stood. bhMorning the morning meeting led with a pointer, a colleague praised, a clap and a cheer.
 *   bhPostResult a star magnet stuck and a number written.
 * - 보상 창구 (bhClaimDesk): sat. bhClaimPhotos the bumper photos spread, one lifted, one under a magnifier, noted. bhClaimPay the
 *   payout summed on a calculator, sealed and explained with the slip.
 * - 약속 책상 (bhPlannerDesk): sat. bhBookVisit a call that ends in a line in the planner and a card in Thursday's pocket. bhPlanWeek
 *   the cards moved about the week.
 * - 안내장 꽂이 (bhBrochureRack): stood. bhBrochureStock a stack on the left hand, dealt into pockets. bhBrochureHand a leaflet
 *   picked for an elder and gone through with them.
 * - 계약 기록 벽 (bhRecordsWall): bhFindPolicy along the wall, a finger on the spines, a binder drawn, read on the ledge, put back.
 * - 방문 가방 (bhVisitBag): bhPackBag tablet, leaflets, a small gift and cards into the bag, shut, lifted, ready to go out.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's right
 * hand is on +x. `tool` names what's in the hand this beat (handTool.ts), its place in `props`.
 */
export type BhMotion =
  | 'bhDesign'
  | 'bhCall'
  | 'bhStudy'
  | 'bhReview'
  | 'bhCoverage'
  | 'bhConsult'
  | 'bhListen'
  | 'bhBig'
  | 'bhMorning'
  | 'bhPostResult'
  | 'bhClaimPhotos'
  | 'bhClaimPay'
  | 'bhBookVisit'
  | 'bhPlanWeek'
  | 'bhBrochureStock'
  | 'bhBrochureHand'
  | 'bhFindPolicy'
  | 'bhPackBag';
export const BH_MOTIONS = new Set<string>(['bhDesign', 'bhCall', 'bhStudy', 'bhReview', 'bhCoverage', 'bhConsult', 'bhListen', 'bhBig', 'bhMorning', 'bhPostResult', 'bhClaimPhotos', 'bhClaimPay', 'bhBookVisit', 'bhPlanWeek', 'bhBrochureStock', 'bhBrochureHand', 'bhFindPolicy', 'bhPackBag']);
export type BhTool = 'pen' | 'phone' | 'book' | 'stamp' | 'photo' | 'mag' | 'bizcard' | 'pointer' | 'magnet' | 'marker' | 'stack' | 'leaflet' | 'card' | 'binder' | 'tablet' | 'pack' | 'gift' | 'bag';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const bhPhase = (p: THREE.Vector3) => frac(p.x * 0.379 + p.z * 0.613);
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
  tool?: BhTool;
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
  at(k: string, round: number): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface BhNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: BhTool | null;
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
export function bhNow(m: BhMotion, t: number, ph: number, H = 1.6): BhNow {
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
export function bhPose(m: BhMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = bhNow(m, t, bhPhase(par.getWorldPosition(new THREE.Vector3())), height);
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

// ---------------------------------------------------------------------------------------------
// What the desks share.

const T = 0.74;
const SEAT: V = [0, 0.47, 0.62];
/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;
/** How far a stamp's grip stands above its face. */
export const STAMP_UP = 0.085;
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const typing = (p: V, t: number): Key => ({ r: add(p, 0.08 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.08, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
/** Talking from a chair: a hand out over the desk's edge, palm up, moving with the sentence. */
const talkSit = (c: Ctx, side = 0.2): V => c.bd(side, 0.42 + 0.03 * Math.sin(c.t * 3.1), 0.3);
/** A pen writing along lines on a sheet centred at `a`. */
const writing = (a: V, u: number, t: number, lines = 3): V => add(a, -0.06 + 0.11 * frac(u * lines), PEN_UP + 0.004 * Math.sin(t * 15), -0.05 + (0.1 * Math.floor(frac(u) * lines)) / lines);
/** A handset at the ear, on the side given. */
const earAt = (c: Ctx, side = 0.11): V => c.bd(side, 0.4 * c.H, 0.03);
const inked = (home: V, pad: V, u: number): V => lerpV(home, add(pad, 0, STAMP_UP + 0.012 * (1 - Math.abs(Math.sin(u * PI * 2))), 0), sm(u, 0.1, 0.55));
const stamped = (a: V, u: number): V => lerpV(add(a, 0, STAMP_UP + 0.05, 0), add(a, 0, STAMP_UP + 0.002, 0), Math.abs(Math.sin(u * PI)));

// =============================================================================================
// 설계 책상 (agentDesk, 1 × 1).

export const AD = {
  top: T,
  seat: SEAT,
  keys: [-0.14, 0.77, 0.2] as V,
  screen: [-0.06, 1.08, -0.14] as V,
  phone: [-0.38, T + 0.075, 0.1] as V,
  dial: [-0.38, T + 0.05, 0.16] as V,
  paper: [0.12, T + 0.004, 0.22] as V,
  calc: [0.37, T + 0.03, 0.22] as V,
  penHome: [0.44, T + 0.07, 0] as V,
  stampHome: [0.37, T + STAMP_UP, 0.1] as V,
  pad: [0.28, T, 0.02] as V,
  outTray: [0.34, T + 0.04, 0.32] as V,
};
const adLeft = add(AD.keys, -0.04, 0.03, 0.08);
const adPen = (p?: V): Record<string, V> => ({ pen: p ?? AD.penHome });
const DESIGN: Script = {
  seq: [['read', 3], ['type', 3.8], ['sum', 2.6], ['mark', 3], ['think', 2.2]],
  at: () => sat(SEAT),
  key(k, u, c) {
    const n = { desk: 1, paper: 1, mode: 0, fill: 4 * c.p('type', 0, 0.98), sum: c.p('sum', 0.1, 0.9), marked: c.p('mark', 0.2, 0.9) };
    switch (k) {
      case 'read':
        return { l: adLeft, gl: 0.25, r: add(AD.paper, 0.05 - 0.1 * frac(u * 2), 0.03, -0.09 + 0.17 * u), gr: 0.12, palms: 0.05, lean: 0.16, nod: 0.32, n, props: adPen() };
      case 'type':
        return { ...typing(AD.keys, c.t), nod: 0.04, lean: 0.07, n, props: adPen() };
      case 'sum':
        return { l: adLeft, gl: 0.25, r: add(AD.calc, -0.012 + 0.024 * wrap(c.t * 5, 2), 0.016 + 0.008 * Math.abs(Math.sin(c.t * 9)), 0.01), gr: 0.15, palms: 0.05, lean: 0.14, nod: 0.26, tap: true, n, props: adPen() };
      case 'mark':
        return { l: add(AD.paper, -0.1, 0.03, 0.09), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props: adPen(writing(AD.paper, u, c.t, 2)) };
      default:
        // Sat back, a hand at the chin, the plan looked over.
        return { l: adLeft, gl: 0.3, r: c.bd(-0.1, 0.56 * c.H * 0.72, 0.16), gr: 0.55, palms: 0.5, lean: 0.02, nod: 0.02, n, props: adPen() };
    }
  },
};
const CALL: Script = {
  seq: [['dial', 1.8], ['ring', 2], ['talk', 4.4], ['note', 3], ['hang', 1.3], ['tick', 2.2]],
  at: () => sat(SEAT),
  key(k, u, c) {
    const lift = k === 'ring' ? sm(u, 0, 0.35) : k === 'talk' || k === 'note' ? 1 : k === 'hang' ? 1 - sm(u, 0.25, 0.9) : 0;
    const phone: V = lerpV(AD.phone, earAt(c), lift);
    const n = { desk: 1, mode: 1, paper: 1, lift, talking: k === 'talk' || k === 'note' ? 1 : 0, ticks: c.p('tick', 0.3, 0.8), fill: 2 * c.p('note', 0, 0.95) };
    const props = { ...adPen(k === 'tick' ? writing(AD.paper, u * 0.5, c.t, 2) : undefined), phone };
    switch (k) {
      case 'dial':
        return { l: add(AD.dial, 0.03 * Math.sin(c.t * 6), 0.01 + 0.012 * Math.abs(Math.sin(c.t * 8)), 0), gl: 0.15, r: add(AD.paper, -0.02, 0.03, 0.03 + 0.04 * u), gr: 0.14, palms: 0.05, lean: 0.14, nod: 0.26, tap: true, n, props };
      case 'ring':
        return { tool: 'phone', r: add(AD.paper, -0.02, 0.03, 0.06), gr: 0.14, palms: 0.05, lean: 0.06, nod: 0.1, n, props };
      case 'talk':
        // Smiling down the line: the free hand talks too, even if no one can see it.
        return { tool: 'phone', r: add(talkSit(c, -0.14), 0, 0.03 * Math.sin(c.t * 2), -0.05), gr: 0.14, palms: 0.45, lean: 0.03, nod: 0.05 + 0.06 * Math.sin(c.t * 1.8), n, props };
      case 'note':
        return { tool: 'phone', r: add(AD.keys, 0.06 + 0.02 * Math.sin(c.t * 9), 0.03 + 0.008 * Math.sin(c.t * 12), 0), gr: 0.25, palms: 0.05, lean: 0.1, nod: 0.12, n, props };
      case 'hang':
        return { tool: 'phone', r: add(AD.keys, 0.06, 0.04, 0.04), gr: 0.25, palms: 0.05, lean: 0.1, nod: 0.22, n, props };
      default:
        return { l: adLeft, gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.14, nod: 0.32, n, props };
    }
  },
};
/** The book held open before the chest. */
const STUDY: Script = {
  seq: [['take', 1.5], ['read', 4.6], ['page', 1.2], ['down', 0.9], ['line', 3.2], ['try', 2.4]],
  at: () => sat(SEAT),
  key(k, u, c) {
    const held: V = c.bd(0, 0.37 + 0.006 * Math.sin(c.t * 1.2), 0.3);
    const lying: V = [AD.paper[0] - 0.06, T + 0.03, AD.paper[2]];
    const book: V | null = k === 'take' ? lerpV(lying, held, sm(u, 0.25, 0.95)) : k === 'read' || k === 'page' ? held : k === 'down' ? lerpV(held, lying, sm(u, 0.1, 0.95)) : lying;
    const n = { desk: 1, mode: 2, book: 1, open: k === 'take' ? sm(u, 0.5, 1) : 1, turn: k === 'page' ? u : 0, leaf: c.p('page', 0.5, 0.6), lines: c.p('line', 0, 1), fill: 3 * c.p('try', 0, 0.95) };
    const props = { book, ...adPen(k === 'line' ? add(lying, -0.05 + 0.15 * frac(u * 2), PEN_UP + 0.012, -0.04 + 0.05 * Math.floor(frac(u) * 2)) : undefined) };
    switch (k) {
      case 'take':
      case 'read':
      case 'page':
      case 'down':
        return { tool: 'book', lean: 0.06, nod: k === 'take' || k === 'down' ? 0.26 : 0.2 + 0.03 * Math.sin(c.t * 0.9), n, props };
      case 'line':
        return { l: add(lying, -0.18, 0.02, 0.06), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      default:
        return { ...typing(AD.keys, c.t), nod: 0.06, lean: 0.07, n, props };
    }
  },
};
const REVIEW: Script = {
  seq: [['open', 1.6], ['read', 3.2], ['tick', 3.2], ['type', 2.8], ['ink', 1], ['seal', 1.2], ['file', 1.6]],
  at: () => sat(SEAT),
  key(k, u, c) {
    const stamp: V = k === 'ink' ? inked(AD.stampHome, AD.pad, u) : k === 'seal' ? stamped(AD.paper, u) : AD.stampHome;
    const n = { desk: 1, mode: 3, folder: k === 'file' ? 1 - sm(u, 0.5, 0.95) : c.p('open', 0.3, 0.8), ticks: 4 * c.p('tick', 0, 0.98), fill: 3 * c.p('type', 0, 0.95), sealed: c.p('seal', 0.45, 0.55), moved: k === 'file' ? sm(u, 0.1, 0.9) : 0 };
    const props = { stamp, ...adPen(k === 'tick' ? writing(AD.paper, u, c.t, 4) : undefined) };
    switch (k) {
      case 'open':
        return { l: adLeft, gl: 0.3, r: add(AD.paper, 0.02, 0.05, 0.02), gr: 0.25, palms: 0.05, lean: 0.14, nod: 0.28, n, props };
      case 'read':
        return { l: add(AD.paper, -0.1, 0.03, 0.09), gl: 0.15, r: add(AD.paper, 0.06 - 0.1 * frac(u * 2), 0.03, -0.09 + 0.17 * u), gr: 0.14, palms: 0.05, lean: 0.16, nod: 0.32, n, props };
      case 'tick':
        return { l: add(AD.paper, -0.1, 0.03, 0.09), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.33, n, props };
      case 'type':
        return { ...typing(AD.keys, c.t), nod: 0.06, lean: 0.07, n, props };
      case 'ink':
      case 'seal':
        return { l: add(AD.paper, -0.1, 0.03, 0.09), gl: 0.15, palms: 0.05, tool: 'stamp', lean: 0.18, nod: 0.3, n, props };
      default: {
        const p = lerpV(add(AD.paper, 0, 0.05, 0), add(AD.outTray, 0, 0.02, 0), sm(u, 0.1, 0.9));
        return { l: add(p, -0.1, 0, 0), gl: 0.4, r: add(p, 0.1, 0, 0), gr: 0.4, palms: 0.05, lean: 0.1, nod: 0.2, n, props };
      }
    }
  },
};
const COVERAGE: Script = {
  seq: [['type', 3.4], ['compare', 3], ['write', 3.2], ['send', 2]],
  at: () => sat(SEAT),
  key(k, u, c) {
    const n = { desk: 1, mode: 4, paper: k === 'write' || k === 'send' ? 1 : 0, fill: 4 * c.p('type', 0, 0.95), gap: c.p('compare', 0.2, 0.9), sent: c.p('send', 0.4, 0.6) };
    const props = adPen(k === 'write' ? writing(AD.paper, u, c.t) : undefined);
    switch (k) {
      case 'type':
        return { ...typing(AD.keys, c.t), nod: 0.04, lean: 0.07, n, props };
      case 'compare':
        // Leaning in, a finger along the gap in the chart.
        return { l: adLeft, gl: 0.25, r: [-0.02 - 0.12 * u, 1.02, 0.14], gr: 0.14, palms: 0.5, lean: 0.2, nod: 0.02, n, props };
      case 'write':
        return { l: add(AD.paper, -0.1, 0.03, 0.09), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      default:
        return { ...typing(AD.keys, c.t * 0.5), nod: 0.04, lean: 0.04, n, props };
    }
  },
};

// =============================================================================================
// 상담 부스 (consultBooth, 2 × 1): a desk with the dweller at its front, the people across it (-z), a screen at its left end that both can see.

export const CB = {
  top: T,
  seat: [0.1, 0.47, 0.62] as V,
  people: [
    [-0.28, 0.46, -0.62],
    [0.3, 0.46, -0.62],
    [0.74, 0.38, -0.62],
  ] as ReadonlyArray<V>,
  keys: [-0.2, 0.77, 0.2] as V,
  screen: [-0.72, 1.14, -0.02] as V,
  screenRy: 1.16,
  doc: [0.14, T + 0.006, 0.18] as V,
  docOver: [0.14, T + 0.006, -0.1] as V,
  cup: [-0.1, T, -0.06] as V,
  tissue: [0.62, T, 0.1] as V,
  tissueOver: [0.44, T, -0.04] as V,
  penHome: [0.54, T + 0.07, 0.3] as V,
  stampHome: [0.44, T + STAMP_UP, 0.16] as V,
  pad: [0.44, T, 0.03] as V,
  cardHeld: [0.1, 1.02, 0.28] as V,
};
const cbPen = (p?: V): Record<string, V> => ({ pen: p ?? CB.penHome });
const pointAtScreen = (u: number, c: Ctx): V => [-0.33 - 0.04 * Math.sin(u * 7), 1.07 + 0.05 * Math.cos(u * 5), 0.25 + 0.01 * Math.sin(c.t)];
const cbRest: V = add(CB.keys, -0.02, 0.03, 0.06);
const CONSULT: Script = {
  seq: [['greet', 2.6], ['tea', 1.7], ['hear', 3], ['screen', 4.6], ['point', 3.4], ['doc', 2.8], ['sign', 3.4], ['thanks', 2.4]],
  at: () => sat(CB.seat),
  key(k, u, c) {
    const doc: V = k === 'doc' ? lerpV(CB.doc, CB.docOver, sm(u, 0.15, 0.85)) : k === 'sign' || k === 'thanks' ? CB.docOver : CB.doc;
    const n = {
      family: 1,
      plan: 1,
      page: k === 'screen' ? 1 + 3 * u : k === 'point' ? 4 : k === 'greet' || k === 'tea' || k === 'hear' ? 0 : 5,
      teaOut: c.p('tea', 0.2, 0.8),
      nods: k === 'screen' || k === 'point' ? 1 : 0,
      look: k === 'screen' || k === 'point' ? 1 : 0,
      signing: k === 'sign' ? 1 : 0,
      signed: c.p('sign', 0.7, 0.8),
      thanks: k === 'thanks' ? 1 : 0,
      hearing: k === 'hear' ? 1 : 0,
    };
    const props = { doc, ...cbPen(k === 'hear' ? writing(CB.doc, u, c.t) : undefined) };
    switch (k) {
      case 'greet':
        return { l: add(talkSit(c, 0.16), 0, 0.02, 0.04), gl: 0.14, r: add(talkSit(c, -0.16), 0, 0.02, 0.04), gr: 0.14, palms: 0.45, lean: 0.08, nod: 0.08 + 0.1 * Math.sin(u * PI), n, props };
      case 'tea':
        return { l: lerpV(add(CB.cup, 0, 0.07, 0.18), add(CB.cup, 0, 0.07, 0.02), sm(u, 0.1, 0.8)), gl: 0.35, r: cbRest, gr: 0.2, palms: 0.05, lean: 0.2, nod: 0.16, n, props };
      case 'hear':
        return { l: add(CB.doc, -0.12, 0.03, 0.08), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.1, nod: 0.12 + 0.06 * Math.sin(c.t * 1.8), n, props };
      case 'screen':
        return { ...typing(CB.keys, c.t * 0.4), l: pointAtScreen(u, c), gl: 0.15, palms: 0.5, lean: 0.12, nod: 0.02, n, props };
      case 'point':
        return { l: pointAtScreen(u * 2, c), gl: 0.15, r: talkSit(c, -0.16), gr: 0.14, palms: 0.45, lean: 0.14, nod: 0.03 + 0.03 * Math.sin(c.t * 2), n, props };
      case 'doc':
        return { l: add(doc, -0.1, 0.03, 0.08), gl: 0.25, r: add(doc, 0.1, 0.03, 0.08), gr: 0.25, palms: 0.05, lean: 0.24, nod: 0.26, n, props };
      case 'sign':
        // Their signature, the place shown by a finger stopping just short.
        return { l: cbRest, gl: 0.25, r: add(CB.docOver, 0.1, 0.03, 0.2), gr: 0.15, palms: 0.1, lean: 0.24, nod: 0.24, n, props };
      default:
        return { l: cbRest, gl: 0.25, r: add(CB.keys, 0.2, 0.03, 0.05), gr: 0.25, palms: 0.05, lean: 0.05, nod: 0.08 + 0.12 * Math.sin(u * PI), n, props };
    }
  },
};
const LISTEN: Script = {
  seq: [['hear', 4.2], ['note', 3], ['tissue', 2], ['nod', 3.2], ['ease', 2.8]],
  at: () => sat(CB.seat),
  key(k, u, c) {
    const tissue: V = k === 'tissue' ? lerpV(CB.tissue, CB.tissueOver, sm(u, 0.15, 0.8)) : k === 'hear' || k === 'note' ? CB.tissue : CB.tissueOver;
    const n = { family: 1, duo: 1, teaOut: 1, worry: k === 'hear' || k === 'note' ? 1 : 0, nods: k === 'nod' || k === 'ease' ? 1 : 0, ok: k === 'ease' ? 1 : 0, doc0: 1 };
    const props = { doc: CB.doc, tissue, ...cbPen(k === 'note' ? writing(CB.doc, u, c.t) : undefined) };
    switch (k) {
      case 'hear':
        // Pen down, both hands together on the desk, leaning to them.
        return { l: add(CB.doc, -0.1, 0.05, 0.1), gl: 0.45, r: add(CB.doc, -0.02, 0.05, 0.1), gr: 0.45, palms: 0.05, lean: 0.16, nod: 0.08 + 0.07 * Math.sin(c.t * 1.9), n, props };
      case 'note':
        return { l: add(CB.doc, -0.12, 0.03, 0.08), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.12, nod: 0.2, n, props };
      case 'tissue':
        return { l: cbRest, gl: 0.25, r: add(tissue, 0, 0.1, 0.1), gr: 0.25, palms: 0.05, lean: 0.24, nod: 0.08, n, props };
      case 'nod':
        return { l: add(talkSit(c, 0.14), 0, 0.03, 0.04), gl: 0.12, r: add(talkSit(c, -0.14), 0, 0.03, 0.04), gr: 0.12, palms: 0.35, lean: 0.14, nod: 0.1 + 0.08 * Math.sin(c.t * 1.7), n, props };
      default:
        return { l: cbRest, gl: 0.25, r: add(CB.keys, 0.2, 0.03, 0.05), gr: 0.25, palms: 0.05, lean: 0.06, nod: 0.05, n, props };
    }
  },
};
const BIG: Script = {
  seq: [['card', 2.4], ['staff', 4.4], ['terms', 3.2], ['slide', 1.8], ['ink', 1], ['seal', 1.3], ['stand', 1.2, 0.8], ['bow', 2.4, 0.8]],
  at: (k) => (k === 'stand' || k === 'bow' ? st(CB.seat[0], 0.64) : sat(CB.seat)),
  key(k, u, c) {
    const doc: V = k === 'slide' ? lerpV(CB.docOver, CB.doc, sm(u, 0.15, 0.85)) : k === 'ink' || k === 'seal' || k === 'stand' || k === 'bow' ? CB.doc : CB.docOver;
    const stamp: V = k === 'ink' ? inked(CB.stampHome, CB.pad, u) : k === 'seal' ? stamped(CB.doc, u) : CB.stampHome;
    const n = { boss: 1, plan: 2, page: k === 'card' ? 0 : k === 'staff' ? 1 + 3 * u : 4, teaOut: 1, look: k === 'staff' ? 1 : 0, cardGiven: c.p('card', 0.65, 0.8), sealed: c.p('seal', 0.45, 0.55), nods: k === 'terms' ? 1 : 0, up: k === 'stand' ? u : k === 'bow' ? 1 : 0, bow: k === 'bow' ? Math.sin(u * PI) : 0, deal: k === 'bow' ? 1 : 0 };
    const props = { doc, stamp, bizcard: k === 'card' ? (u < 0.65 ? lerpV(add(CB.cardHeld, 0, -0.05, 0.05), add(CB.cardHeld, 0, 0, -0.08), sm(u, 0.05, 0.5)) : add(CB.cardHeld, 0, 0, -0.08)) : null, ...cbPen() };
    switch (k) {
      case 'card':
        // Offered in both hands with a small bow.
        return u < 0.72 ? { tool: 'bizcard', lean: 0.16 + 0.08 * Math.sin(u * PI), nod: 0.2, n, props } : { l: cbRest, gl: 0.25, r: add(CB.keys, 0.2, 0.03, 0.05), gr: 0.25, lean: 0.08, nod: 0.1, n, props };
      case 'staff':
        return { ...typing(CB.keys, c.t * 0.4), l: pointAtScreen(u, c), gl: 0.15, palms: 0.5, lean: 0.12, nod: 0.02, n, props };
      case 'terms':
        return { l: add(CB.doc, -0.14, 0.04, 0.06), gl: 0.15, r: talkSit(c, -0.18), gr: 0.14, palms: 0.4, lean: 0.14, nod: 0.1 + 0.05 * Math.sin(c.t * 2), n, props };
      case 'slide':
        return { l: add(doc, -0.1, 0.03, 0.08), gl: 0.25, r: add(doc, 0.1, 0.03, 0.08), gr: 0.25, palms: 0.05, lean: 0.24, nod: 0.26, n, props };
      case 'ink':
      case 'seal':
        return { l: add(CB.doc, -0.12, 0.03, 0.08), gl: 0.15, palms: 0.05, tool: 'stamp', lean: 0.18, nod: 0.3, n, props };
      case 'stand':
        return { ...easy(c), lean: 0.03, nod: 0.05, n, props };
      default:
        // A proper bow from the waist, hands at the sides.
        return { ...easy(c), lean: 0.05 + 0.42 * Math.sin(u * PI), nod: 0.12 + 0.2 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 실적 현황판 (bhMorningBoard, 2 × 1): on the wall; the dweller to its left, turned in, the team stood at its right looking across.

export const MB = {
  plane: -0.3,
  speaker: [-0.72, 0.42] as const,
  people: [
    [0.22, 0.9, -1.75],
    [0.72, 1.02, -1.7],
    [1.15, 0.82, -1.6],
  ] as ReadonlyArray<readonly [number, number, number]>,
  /** The cup of star magnets and the marker in its clip, on the board. */
  tray: [0.05, 1.02, -0.2] as V,
  clip: [0.11, 1.02, -0.25] as V,
  pointerHome: [-0.56, 0.9, -0.2] as V,
};
/** A star's place on the board, by round. */
export const starAt = (round: number): V => [0.06 + 0.08 * wrap(round, 5), 1.16 + 0.16 * wrap(round, 2), MB.plane + 0.03];
const YAW_ROOM = PI * 2 + 1.0;
const YAW_BOARD = PI - 0.55;
const MORNING: Script = {
  seq: [['open', 3], ['point', 4.2], ['praise', 2.8], ['word', 3], ['cheer', 2.4]],
  at: (k) => st(MB.speaker[0], MB.speaker[1], k === 'point' ? YAW_BOARD : YAW_ROOM),
  key(k, u, c) {
    const n = { team: 1, row: k === 'point' ? wrap(u * 4, 4) : -1, claps: k === 'praise' ? 1 : 0, cheer: k === 'cheer' ? 1 : 0, nods: k === 'word' || k === 'open' ? 1 : 0, word: k === 'word' ? 1 : 0, speak: k === 'open' ? 1 : 0 };
    const props = { pointer: k === 'point' ? ([-0.4 + 0.03 * Math.sin(u * 8), 1.25 + 0.14 * (0.5 - frac(u * 4)), 0.22] as V) : MB.pointerHome };
    switch (k) {
      case 'open':
        return { l: c.bd(0.18, 0.66 * c.H + 0.03 * Math.sin(c.t * 2.4), 0.28), gl: 0.15, r: c.bd(-0.18, 0.66 * c.H + 0.03 * Math.sin(c.t * 2.9), 0.28), gr: 0.15, palms: 0.45, lean: 0.03, nod: 0.03 + 0.04 * Math.sin(c.t * 1.6), n, props };
      case 'point':
        return { ...easy(c), r: undefined, tool: 'pointer', lean: 0.03, nod: -0.04, n, props };
      case 'praise': {
        const clap = 0.03 + 0.05 * Math.abs(Math.sin(c.t * 7));
        return { l: c.bd(clap, 0.7 * c.H, 0.26), r: c.bd(-clap, 0.7 * c.H, 0.26), gl: 0.1, gr: 0.1, palms: 0.5, lean: 0.03, nod: 0.02, n, props };
      }
      case 'word':
        return { l: c.bd(0.04, 0.58 * c.H, 0.2), r: c.bd(-0.04, 0.58 * c.H, 0.2), gl: 0.45, gr: 0.45, palms: 0.05, lean: 0.03, nod: 0.08, n, props };
      default: {
        const up = sm(u, 0.1, 0.35) * (1 - 0.15 * Math.abs(Math.sin(c.t * 6)));
        return { ...easy(c), r: lerpV(c.bd(-0.2, 0.6 * c.H, 0.15), c.bd(-0.2, 1.08 * c.H, 0.08), up), gr: 0.9, palms: 0.5, lean: 0, nod: -0.05, n, props };
      }
    }
  },
};
const POST: Script = {
  seq: [['take', 1.5], ['stick', 2.4], ['pen', 1], ['write', 3.2], ['back', 2.4, 0.7]],
  at: (k) => (k === 'back' ? st(0.1, 0.62) : st(0.1, 0.14)),
  key(k, u, c) {
    const a = starAt(c.round);
    const n = { magnet: 1, stuck: c.p('stick', 0.75, 0.85), wrote: c.p('write', 0.1, 0.95), roundN: c.round };
    const scrawl: V = [0.4 + 0.1 * frac(u * 3), 1.52 + 0.006 * Math.sin(c.t * 14), MB.plane + 0.1];
    const magnet: V | null = k === 'take' ? lerpV(MB.tray, a, sm(u, 0.7, 1)) : k === 'stick' ? lerpV(add(a, 0, 0, 0.06), a, sm(u, 0.2, 0.8)) : null;
    const props = { magnet: k === 'take' || (k === 'stick' && u < 0.82) ? magnet : null, marker: k === 'write' ? scrawl : k === 'pen' ? lerpV(MB.clip, scrawl, sm(u, 0.15, 0.95)) : MB.clip };
    switch (k) {
      case 'take':
        return { ...easy(c), tool: 'magnet', lean: 0.06, nod: 0.05, n, props };
      case 'stick':
        return u < 0.82 ? { ...easy(c), tool: 'magnet', lean: 0.06, nod: -0.02, n, props } : { ...easy(c), lean: 0.03, nod: 0.02, n, props };
      case 'pen':
      case 'write':
        return { ...easy(c), tool: 'marker', lean: 0.05, nod: -0.05, n, props };
      default:
        return { l: c.bd(0.22, 0.55 * c.H, 0.06), gl: 0.3, r: c.bd(-0.08, 0.56 * c.H, 0.14), gr: 0.5, lean: -0.01, nod: -0.04 + 0.08 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 보상 창구 (bhClaimDesk, 2 × 1): photos on the desk, the claimant across, a calculator at the right hand.

export const CD = {
  top: T,
  seat: [0.08, 0.47, 0.62] as V,
  client: [0.14, 0.46, -0.62] as V,
  keys: [-0.2, 0.77, 0.2] as V,
  screen: [-0.42, 1.08, -0.1] as V,
  photos: [0.14, T + 0.004, 0.17] as V,
  calc: [0.58, T + 0.03, 0.24] as V,
  magHome: [0.46, T + 0.03, 0.1] as V,
  penHome: [0.6, T + 0.07, 0.12] as V,
  stampHome: [0.38, T + STAMP_UP, 0.32] as V,
  pad: [0.5, T, 0.34] as V,
  slip: [0.14, T + 0.004, 0.2] as V,
  slipOver: [0.14, T + 0.004, -0.14] as V,
};
export const photoLift: V = [0.16, 1.06, 0.3];
const cdPen = (p?: V): Record<string, V> => ({ pen: p ?? CD.penHome });
const CLAIM_PHOTOS: Script = {
  seq: [['hear', 2.6], ['spread', 2.2], ['lift', 3.4], ['mag', 3.6], ['note', 2.8], ['enter', 2.6]],
  at: () => sat(CD.seat),
  key(k, u, c) {
    const n = { client: 1, photos: k === 'hear' ? 0 : 1, spread: k === 'spread' ? sm(u, 0.1, 0.9) : k === 'hear' ? 0 : 1, lifted: k === 'lift' ? 1 : 0, zoom: k === 'mag' ? sm(u, 0, 0.4) : 0, fill: 3 * c.p('enter', 0, 0.95), mode: 0, nods: k === 'hear' ? 1 : 0 };
    const magAt: V = add(CD.photos, 0.03 + 0.03 * Math.sin(u * 5), 0.11, 0.135 + 0.02 * Math.cos(u * 4));
    const props = { photo: k === 'lift' ? lerpV(add(CD.photos, 0.12, 0.02, 0.05), photoLift, sm(u, 0, 0.2)) : null, mag: k === 'mag' ? magAt : CD.magHome, ...cdPen(k === 'note' ? writing(add(CD.photos, 0.1, 0, 0.06), u, c.t) : undefined) };
    switch (k) {
      case 'hear':
        return { l: add(CD.photos, -0.1, 0.05, 0.1), gl: 0.45, r: add(CD.photos, -0.02, 0.05, 0.1), gr: 0.45, palms: 0.05, lean: 0.14, nod: 0.08 + 0.06 * Math.sin(c.t * 1.9), n, props };
      case 'spread':
        return { l: add(CD.photos, -0.14 * n.spread, 0.03, 0.05), gl: 0.15, r: add(CD.photos, 0.14 * n.spread, 0.03, 0.05), gr: 0.15, palms: 0.05, lean: 0.16, nod: 0.3, n, props };
      case 'lift':
        return { l: add(CD.photos, -0.16, 0.03, 0.06), gl: 0.15, palms: 0.05, tool: 'photo', lean: 0.1, nod: 0.08, n, props };
      case 'mag':
        return { l: add(CD.photos, -0.16, 0.03, 0.06), gl: 0.15, palms: 0.05, tool: 'mag', lean: 0.2, nod: 0.36, n, props };
      case 'note':
        return { l: add(CD.photos, -0.16, 0.03, 0.06), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.3, n, props };
      default:
        return { ...typing(CD.keys, c.t), nod: 0.06, lean: 0.07, n, props };
    }
  },
};
const CLAIM_PAY: Script = {
  seq: [['open', 1.8], ['calc', 4.4], ['check', 3], ['ink', 1], ['seal', 1.3], ['explain', 3.4], ['thanks', 2.4]],
  at: () => sat(CD.seat),
  key(k, u, c) {
    const stamp: V = k === 'ink' ? inked(CD.stampHome, CD.pad, u) : k === 'seal' ? stamped(CD.slip, u) : CD.stampHome;
    const n = { client: 1, photos: 1, spread: 1, slip: c.p('open', 0.4, 0.7), sum: k === 'calc' ? 3.999 * u : c.p('open') >= 1 ? 4 : 0, mode: 1, fill: 3 * c.p('check', 0, 0.9), sealed: c.p('seal', 0.45, 0.55), over: k === 'explain' ? sm(u, 0, 0.3) : k === 'thanks' ? 1 : 0, nods: k === 'explain' ? 1 : 0, glad: k === 'thanks' ? 1 : 0 };
    const props = { stamp, slipAt: lerpV(CD.slip, CD.slipOver, n.over), ...cdPen() };
    switch (k) {
      case 'open':
        return { l: add(CD.slip, -0.12, 0.03, 0.08), gl: 0.25, r: add(CD.slip, 0.08, 0.03, 0.1), gr: 0.2, palms: 0.05, lean: 0.14, nod: 0.26, n, props };
      case 'calc':
        return { l: add(CD.slip, 0.04, 0.03, 0.05 + 0.08 * u), gl: 0.14, r: add(CD.calc, -0.012 + 0.024 * wrap(c.t * 5, 2), 0.016 + 0.008 * Math.abs(Math.sin(c.t * 9)), 0.01), gr: 0.15, palms: 0.05, lean: 0.14, nod: 0.3, tap: true, n, props };
      case 'check':
        return { ...typing(CD.keys, c.t), nod: 0.04, lean: 0.07, n, props };
      case 'ink':
      case 'seal':
        return { l: add(CD.slip, -0.12, 0.03, 0.08), gl: 0.15, palms: 0.05, tool: 'stamp', lean: 0.18, nod: 0.3, n, props };
      case 'explain':
        // The slip turned round and slid over, a finger on the bottom line.
        return { l: add(talkSit(c, 0.18), 0, 0.02, 0), gl: 0.14, r: add(lerpV(CD.slip, CD.slipOver, n.over), 0.05, 0.03, 0.1), gr: 0.14, palms: 0.1, lean: 0.24, nod: 0.14, n, props };
      default:
        return { l: add(CD.keys, -0.06, 0.03, 0.05), gl: 0.25, r: add(CD.keys, 0.14, 0.03, 0.05), gr: 0.25, palms: 0.05, lean: 0.05, nod: 0.08 + 0.1 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 약속 책상 (bhPlannerDesk, 2 × 1): a low rack of the week's pockets along the desk, the planner before the dweller, the phone at the left.

export const PD = {
  top: T,
  seat: [0.08, 0.47, 0.62] as V,
  phone: [-0.34, T + 0.075, 0.12] as V,
  dial: [-0.34, T + 0.05, 0.18] as V,
  planner: [0.12, T + 0.012, 0.27] as V,
  penHome: [0.46, T + 0.07, 0.16] as V,
  /** Monday's pocket; the rest step along x. */
  rack: [-0.1, 0.92, 0.06] as V,
  rackStep: 0.1,
  cardPad: [0.4, T + 0.012, 0.32] as V,
};
export const pocketAt = (i: number): V => [PD.rack[0] + PD.rackStep * wrap(i, 5), PD.rack[1], PD.rack[2]];
const pdPen = (p?: V): Record<string, V> => ({ pen: p ?? PD.penHome });
const BOOK_VISIT: Script = {
  seq: [['dial', 1.8], ['ring', 1.8], ['talk', 4.4], ['flip', 2.2], ['hang', 1.3], ['write', 3.2], ['card', 2.4]],
  at: () => sat(PD.seat),
  key(k, u, c) {
    const lift = k === 'ring' ? sm(u, 0, 0.35) : k === 'talk' || k === 'flip' ? 1 : k === 'hang' ? 1 - sm(u, 0.25, 0.9) : 0;
    const day = wrap(c.round + 3, 5);
    const n = { talking: k === 'talk' || k === 'flip' ? 1 : 0, lift, leaf: c.p('flip', 0.3, 0.7), wrote: c.p('write', 0, 0.95), carded: c.p('card', 0.7, 0.85), day, roundN: c.round };
    const card: V | null = k === 'card' ? lerpV(PD.cardPad, add(pocketAt(day), 0, 0.04, 0.02), sm(u, 0.1, 0.8)) : null;
    const props = { phone: lerpV(PD.phone, earAt(c), lift), card, ...pdPen(k === 'write' ? writing(PD.planner, u, c.t, 2) : undefined) };
    switch (k) {
      case 'dial':
        return { l: add(PD.dial, 0.03 * Math.sin(c.t * 6), 0.01 + 0.012 * Math.abs(Math.sin(c.t * 8)), 0), gl: 0.15, r: add(PD.planner, 0, 0.04, 0.05), gr: 0.14, palms: 0.05, lean: 0.14, nod: 0.24, tap: true, n, props };
      case 'ring':
        return { tool: 'phone', r: add(PD.planner, 0, 0.04, 0.05), gr: 0.14, palms: 0.05, lean: 0.06, nod: 0.08, n, props };
      case 'talk':
        return { tool: 'phone', r: add(talkSit(c, -0.14), 0, 0.03 * Math.sin(c.t * 2), -0.05), gr: 0.14, palms: 0.45, lean: 0.03, nod: 0.05 + 0.06 * Math.sin(c.t * 1.8), n, props };
      case 'flip':
        return { tool: 'phone', r: add(PD.planner, 0.08 - 0.14 * sm(u, 0.2, 0.8), 0.04 + 0.05 * Math.sin(u * PI), 0.03), gr: 0.3, palms: 0.05, lean: 0.12, nod: 0.26, n, props };
      case 'hang':
        return { tool: 'phone', r: add(PD.planner, 0, 0.04, 0.05), gr: 0.14, palms: 0.05, lean: 0.1, nod: 0.2, n, props };
      case 'write':
        return { l: add(PD.planner, -0.18, 0.02, 0.05), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      default:
        return { l: add(PD.planner, -0.18, 0.02, 0.05), gl: 0.15, palms: 0.05, tool: 'card', lean: 0.2, nod: 0.16, n, props };
    }
  },
};
const PLAN_WEEK: Script = {
  seq: [['look', 2.4], ['move', 2.6], ['write', 3], ['move2', 2.6], ['nod', 1.8]],
  at: () => sat(PD.seat),
  key(k, u, c) {
    const a = pocketAt(c.round);
    const b = pocketAt(c.round + 2);
    const a2 = pocketAt(c.round + 1);
    const b2 = pocketAt(c.round + 4);
    const n = { moved: c.p('move', 0.75, 0.85), moved2: c.p('move2', 0.75, 0.85), wrote: c.p('write', 0, 0.95), from: wrap(c.round, 5), to: wrap(c.round + 2, 5), from2: wrap(c.round + 1, 5), to2: wrap(c.round + 4, 5), roundN: c.round, week: 1 };
    const arc = (p: V, q: V, v: number): V => add(lerpV(p, q, v), 0, 0.05 + 0.05 * Math.sin(v * PI), 0.02);
    const props = { card: k === 'move' ? arc(a, b, sm(u, 0.15, 0.8)) : k === 'move2' ? arc(a2, b2, sm(u, 0.15, 0.8)) : null, ...pdPen(k === 'write' ? writing(PD.planner, u, c.t, 2) : undefined) };
    switch (k) {
      case 'look':
        return { l: add(PD.planner, -0.18, 0.02, 0.05), gl: 0.15, r: add(PD.planner, 0.06 - 0.12 * frac(u * 2), 0.03, -0.04 + 0.1 * u), gr: 0.14, palms: 0.05, lean: 0.14, nod: 0.3, n, props };
      case 'move':
      case 'move2':
        return { l: add(PD.planner, -0.18, 0.02, 0.05), gl: 0.15, palms: 0.05, tool: 'card', lean: 0.2, nod: 0.12, n, props };
      case 'write':
        return { l: add(PD.planner, -0.18, 0.02, 0.05), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      default:
        return { l: add(PD.planner, -0.18, 0.02, 0.05), gl: 0.25, r: add(PD.planner, 0.18, 0.02, 0.05), gr: 0.25, palms: 0.05, lean: 0.03, nod: 0.03 + 0.1 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 안내장 꽂이 (bhBrochureRack, 2 × 1): rows of pockets; a carton at the left end, and a visitor who comes up at the right.

export const BR = {
  columns: [-0.54, -0.18, 0.18, 0.54],
  rows: [0.84, 1.1, 1.36],
  z: 0.04,
  box: [-0.74, 0.86, 0.26] as V,
  guest: [1.06, 0.72] as const,
};
export const pocketOf = (round: number, i: number): V => [BR.columns[wrap(round + i, 4)], BR.rows[wrap(round + i * 2, 3)] + 0.09, BR.z + 0.06];
const stackHeld = (c: Ctx): V => c.bd(0.14, 0.61 * c.H, 0.3);
const STOCK: Script = {
  seq: [['box', 1.8], ['one', 2.2], ['two', 2.2], ['three', 2.2], ['square', 1.8], ['back', 1.6]],
  at(k, round) {
    if (k === 'box') return st(-0.52, 0.42);
    const i = k === 'one' ? 0 : k === 'two' ? 1 : 2;
    return st(pocketOf(round, i)[0] - 0.12, 0.42);
  },
  key(k, u, c) {
    const i = k === 'one' ? 0 : k === 'two' ? 1 : 2;
    const stack: V | null = k === 'box' ? lerpV(add(BR.box, 0, 0.03, 0), stackHeld(c), sm(u, 0.35, 0.95)) : k === 'square' || k === 'back' ? null : stackHeld(c);
    const n = { filled: k === 'one' ? sm(u, 0.7, 0.8) : k === 'two' ? 1 + sm(u, 0.7, 0.8) : k === 'three' ? 2 + sm(u, 0.7, 0.8) : k === 'square' || k === 'back' ? 3 : 0, stocking: 1, roundN: c.round, flap: k === 'box' ? 1 : 0 };
    const props = { stack };
    const pocket = pocketOf(c.round, i);
    switch (k) {
      case 'box':
        return { tool: 'stack', r: u < 0.5 ? add(BR.box, 0.06, 0.03, 0) : c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.4, palms: 0.05, lean: 0.14, nod: 0.2, n, props };
      case 'one':
      case 'two':
      case 'three':
        return { tool: 'stack', r: lerpV(add(stackHeld(c), -0.02, 0.04, 0), pocket, sm(u, 0.15, 0.7)), gr: 0.5, palms: 0.1, lean: 0.08, nod: 0.04, n, props };
      case 'square':
        // Tapped level with both hands along the top of the row.
        return { l: add(pocket, -0.1, 0.02 * Math.abs(Math.sin(u * 9)), 0), r: add(pocket, 0.1, 0.02 * Math.abs(Math.sin(u * 9)), 0), gl: 0.1, gr: 0.1, palms: 0.05, lean: 0.08, nod: 0.05, n, props };
      default:
        return { ...easy(c), lean: 0.01, nod: 0.02, n, props };
    }
  },
};
const GUEST_YAW = PI / 2 + 0.3;
const HANDOVER: V = [0.72, 1.0, 0.64];
const HAND: Script = {
  seq: [['greet', 2.4], ['pick', 2.2, 0.8], ['give', 2.2, 0.8], ['read', 3.4], ['thanks', 2.2]],
  at: (k) => (k === 'pick' ? st(0.34, 0.42) : st(0.28, 0.62, GUEST_YAW)),
  key(k, u, c) {
    const source: V = [BR.columns[2], BR.rows[1] + 0.09, BR.z + 0.08];
    const leaflet: V | null = k === 'pick' ? lerpV(source, add(source, 0.02, -0.04, 0.2), sm(u, 0.45, 0.95)) : k === 'give' ? lerpV(c.bd(-0.08, 0.66 * c.H, 0.3), HANDOVER, sm(u, 0.1, 0.8)) : null;
    const n = { guest: 1, talking: k === 'greet' || k === 'read' ? 1 : 0, handing: k === 'give' ? 1 : 0, reading: k === 'read' || k === 'thanks' ? 1 : 0, glad: k === 'thanks' ? 1 : 0 };
    const props = { leaflet };
    switch (k) {
      case 'greet':
        return { ...easy(c), r: c.bd(-0.12, 0.66 * c.H + 0.03 * Math.sin(c.t * 3), 0.3), gr: 0.1, palms: 0.5, nod: 0.05 + 0.08 * Math.sin(u * PI), lean: 0.1, n, props };
      case 'pick':
        return u < 0.4 ? { ...easy(c), r: source, gr: 0.3, palms: 0.05, lean: 0.08, nod: 0.05, n, props } : { ...easy(c), tool: 'leaflet', lean: 0.08, nod: 0.08, n, props };
      case 'give':
        return { ...easy(c), tool: 'leaflet', lean: 0.1, nod: 0.08, n, props };
      case 'read':
        // A finger near the line she's reading, the words said slowly.
        return { ...easy(c), r: [HANDOVER[0] - 0.08, HANDOVER[1] + 0.04 * Math.sin(u * 6), HANDOVER[2] - 0.02], gr: 0.15, palms: 0.2, lean: 0.14, nod: 0.14 + 0.05 * Math.sin(c.t * 1.8), n, props };
      default:
        return { ...easy(c), lean: 0.05 + 0.14 * Math.sin(u * PI), nod: 0.08 + 0.12 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 계약 기록 벽 (bhRecordsWall, 3 × 1): box files floor to head height, a pull-out ledge in the middle.

export const RW = {
  top: 2.1,
  columns: 11,
  span: 2.6,
  shelves: [0.32, 0.72, 1.12, 1.52],
  ledge: [0, 0.98, 0.14] as V,
  z: 0.05,
};
/** The file wanted this round: the two shelves within an easy reach, somewhere along the wall. */
export const fileOf = (round: number) => ({ col: wrap(round * 3 + 1, RW.columns), shelf: 2 + wrap(round, 2) });
export const fileAt = (col: number, shelf: number): V => [-RW.span / 2 + (RW.span / RW.columns) * (wrap(col, RW.columns) + 0.5), RW.shelves[wrap(shelf, 4)] + 0.16, RW.z + 0.1];
const ledgeG: V = [RW.ledge[0], RW.ledge[1] + 0.06, RW.ledge[2] + 0.1];
const FIND: Script = {
  seq: [['list', 2], ['along', 2.6, 1.1], ['pull', 1.5], ['carry', 1.2, 1.1], ['read', 4.2], ['note', 2.6], ['shut', 1, 1.1], ['put', 1.4, 0.9]],
  at(k, round) {
    const f = fileAt(fileOf(round).col, fileOf(round).shelf);
    if (k === 'along' || k === 'pull' || k === 'put') return st(f[0] - 0.14, 0.5);
    if (k === 'list') return st(0, 0.72);
    return st(0, 0.48);
  },
  key(k, u, c) {
    const F = fileOf(c.round);
    const f = fileAt(F.col, F.shelf);
    const held: V = c.bd(-0.14, 0.62 * c.H, 0.26);
    const binder: V | null = k === 'pull' ? lerpV(f, held, sm(u, 0.4, 1)) : k === 'carry' || k === 'shut' ? held : k === 'read' || k === 'note' ? null : k === 'put' ? lerpV(held, f, sm(u, 0.1, 0.8)) : null;
    const n = { out: k === 'pull' ? sm(u, 0.35, 0.5) : k === 'carry' || k === 'read' || k === 'note' || k === 'shut' ? 1 : k === 'put' ? 1 - sm(u, 0.7, 0.85) : 0, col: F.col, shelf: F.shelf, open: k === 'read' || k === 'note' ? 1 : 0, ledge: k === 'read' || k === 'note' ? 1 : 0 };
    const props = { binder, pen: k === 'note' ? writing(add(RW.ledge, 0.14, 0.04, 0.12), u, c.t, 2) : null };
    switch (k) {
      case 'list':
        return { l: c.bd(0.1, 0.62 * c.H, 0.26), gl: 0.5, r: c.bd(-0.02, 0.66 * c.H, 0.26), gr: 0.14, palms: 0.05, lean: 0.03, nod: 0.26, n, props };
      case 'along':
        // A finger along the spines, stopping at the right year.
        return { ...easy(c), r: add(f, -0.26 * (1 - sm(u, 0, 0.8)), 0, 0.01), gr: 0.14, palms: 0.2, lean: 0.06, nod: 0.05, n, props };
      case 'pull':
        return u < 0.4 ? { ...easy(c), r: add(f, 0, 0.02, 0.01), gr: 0.55, palms: 0.05, lean: 0.06, nod: 0.05, n, props } : { ...easy(c), r: undefined, tool: 'binder', lean: 0.04, nod: 0.14, n, props };
      case 'carry':
      case 'shut':
        return { ...easy(c), r: undefined, tool: 'binder', lean: 0.04, nod: 0.18, n, props };
      case 'read':
        return { l: add(ledgeG, -0.17, 0, 0.06), gl: 0.15, r: add(ledgeG, 0.02 + 0.1 * frac(u * 2), 0, -0.04 + 0.1 * u), gr: 0.14, palms: 0.05, lean: 0.2, nod: 0.34, n, props };
      case 'note':
        return { l: add(ledgeG, -0.17, 0, 0.06), gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.2, nod: 0.34, n, props };
      default:
        return { ...easy(c), r: undefined, tool: 'binder', lean: 0.06, nod: 0.05, n, props };
    }
  },
};

// =============================================================================================
// 방문 가방 (bhVisitBag, 2 × 1): a packing table at a comfortable height, a coat and an umbrella on the panel behind.

export const VB = {
  top: 0.88,
  stand: [0, 0.42] as const,
  bag: [-0.06, 0.88 + 0.31, 0.06] as V,
  tablet: [0.3, 0.88 + 0.012, 0.2] as V,
  pack: [0.5, 0.88 + 0.04, 0.18] as V,
  gift: [0.3, 0.88 + 0.06, -0.02] as V,
  cards: [0.1, 0.88 + 0.02, 0.24] as V,
  mouth: [-0.06, 0.88 + 0.34, 0.06] as V,
};
const carryAt = (c: Ctx): V => c.bd(-0.27, 0.79, 0.04);
const PACK: Script = {
  seq: [['open', 1.6], ['tablet', 2.4], ['pack', 2.4], ['gift', 2.4], ['cards', 1.6], ['shut', 1.5], ['lift', 1.5], ['ready', 2.6], ['down', 1.5]],
  at: () => st(VB.stand[0], VB.stand[1]),
  key(k, u, c) {
    const into = (home: V): V => lerpV(lerpV(home, add(home, 0, 0.1, 0), sm(u, 0.1, 0.35)), VB.mouth, sm(u, 0.35, 0.9));
    const carry = carryAt(c);
    const bag: V = k === 'lift' ? lerpV(VB.bag, carry, sm(u, 0.2, 0.95)) : k === 'ready' ? add(carry, 0, 0.004 * Math.sin(c.t * 1.8), 0) : k === 'down' ? lerpV(carry, VB.bag, sm(u, 0.05, 0.8)) : VB.bag;
    const n = {
      lid: k === 'open' ? sm(u, 0.2, 0.9) : k === 'shut' ? 1 - sm(u, 0.2, 0.9) : k === 'tablet' || k === 'pack' || k === 'gift' || k === 'cards' ? 1 : 0,
      tabletIn: c.p('tablet', 0.9, 1),
      packIn: c.p('pack', 0.9, 1),
      giftIn: c.p('gift', 0.9, 1),
      cardsIn: c.p('cards', 0.8, 1),
      turn: k === 'lift' ? sm(u, 0.25, 0.9) : k === 'ready' ? 1 : k === 'down' ? 1 - sm(u, 0.05, 0.8) : 0,
      done: k === 'ready' ? 1 : 0,
    };
    const props = { bag, tablet: k === 'tablet' ? into(VB.tablet) : null, pack: k === 'pack' ? into(VB.pack) : null, gift: k === 'gift' ? into(VB.gift) : null };
    const lid: Key = { l: add(VB.mouth, -0.12, 0, 0.02), gl: 0.5, palms: 0.05, lean: 0.1, nod: 0.26 };
    switch (k) {
      case 'open':
      case 'shut':
        return { ...lid, r: add(VB.mouth, 0.12, 0, 0.02), gr: 0.5, n, props };
      case 'tablet':
        return { ...lid, tool: 'tablet', n, props };
      case 'pack':
        return { ...lid, tool: 'pack', n, props };
      case 'gift':
        return { ...lid, tool: 'gift', n, props };
      case 'cards':
        return { ...lid, r: lerpV(add(VB.cards, 0, 0.03, 0), VB.mouth, sm(u, 0.2, 0.85)), gr: 0.6, n, props };
      case 'lift':
      case 'down':
        return { ...easy(c), tool: 'bag', lean: k === 'lift' ? 0.08 * (1 - u) : 0.08 * u, nod: 0.14, n, props };
      default:
        // Stood up straight with it, the other hand straightening a lapel.
        return { l: c.bd(0.1, 0.78 * c.H, 0.13 + 0.01 * Math.sin(c.t * 2)), gl: 0.5, tool: 'bag', palms: 0.05, lean: 0, nod: -0.02, n, props };
    }
  },
};

const SCRIPTS: Record<BhMotion, Script> = {
  bhDesign: DESIGN,
  bhCall: CALL,
  bhStudy: STUDY,
  bhReview: REVIEW,
  bhCoverage: COVERAGE,
  bhConsult: CONSULT,
  bhListen: LISTEN,
  bhBig: BIG,
  bhMorning: MORNING,
  bhPostResult: POST,
  bhClaimPhotos: CLAIM_PHOTOS,
  bhClaimPay: CLAIM_PAY,
  bhBookVisit: BOOK_VISIT,
  bhPlanWeek: PLAN_WEEK,
  bhBrochureStock: STOCK,
  bhBrochureHand: HAND,
  bhFindPolicy: FIND,
  bhPackBag: PACK,
};
