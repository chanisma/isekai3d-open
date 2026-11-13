import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 주민센터 of the made-up 은샘1동 (2026-11-01). Each motion is a round of beats: where the dweller is, where the hands go,
 * what moves. The piece reads the same script by the same clock (civilServant.ts), so the number on the board is the one called,
 * the sheet from the printer is the one stamped and the kiosk's screen goes on as the elder's finger does. Unhurried on purpose.
 *
 * - 민원 창구 (civilCounter): sat behind the glass, the resident on a stool across it. juCert the number called, the ID slid
 *   through, typed, printed, inked, stamped, handed back with a word. juPermit a folder read and ticked down its list, entered,
 *   sealed and filed. juRush the same stamp at speed with the queue falling. juMediate a cross resident heard out, calmed, the
 *   rule looked up and shown.
 * - 무인민원발급기 (juKiosk): juHelp beside an elder: the menu shown, the elder's own finger on the keys, the sheet handed over.
 * - 기재대 (juFormStand): juFormHelp reading glasses handed over, the magnifier held over the line, the place to sign marked, the
 *   elder writes. juFormStock forms off the box and into the pockets.
 * - 복지 상담 부스 (juWelfareBooth): juWelfare tea pushed over, listened to, notes, a leaflet explained, entered.
 * - 마을 소식판 (juNoticeBoard): juPostNotice an old sheet unpinned, the new one pinned at both corners, stood back from.
 * - 이동식 서고 (juRollStack): juFindRecord the wheel turned till an aisle opens, in, a binder drawn and read, back out.
 * - 재난 구호 물품함 (juReliefCage): juReliefCheck unlocked, shelves counted against the list, a date read, ticked.
 * - 회의 준비대 (juMeetingPrep): juMeetingSet agendas squared, name plates stood in a row, the recorder tried.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the dweller's
 * right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), its place in `props`.
 */
export type JuMotion = 'juCert' | 'juPermit' | 'juRush' | 'juMediate' | 'juHelp' | 'juFormHelp' | 'juFormStock' | 'juWelfare' | 'juPostNotice' | 'juFindRecord' | 'juReliefCheck' | 'juMeetingSet';
export const JU_MOTIONS = new Set<string>(['juCert', 'juPermit', 'juRush', 'juMediate', 'juHelp', 'juFormHelp', 'juFormStock', 'juWelfare', 'juPostNotice', 'juFindRecord', 'juReliefCheck', 'juMeetingSet']);
export type JuTool = 'stamp' | 'pen' | 'sheet' | 'card' | 'mag' | 'glasses' | 'stack' | 'pin' | 'binderPull' | 'binder' | 'board' | 'plate' | 'cup' | 'leaflet';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const juPhase = (p: THREE.Vector3) => frac(p.x * 0.331 + p.z * 0.587);
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
  tool?: JuTool;
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
export interface JuNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: JuTool | null;
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
export function juNow(m: JuMotion, t: number, ph: number, H = 1.6): JuNow {
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
export function juPose(m: JuMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = juNow(m, t, juPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** From a sheet's middle to the near right corner it's held by. */
export const SHEET_GRIP: V = [0.105, 0.006, 0.148];
const sheetBy = (centre: V): V => add(centre, SHEET_GRIP[0], SHEET_GRIP[1], SHEET_GRIP[2]);

// =============================================================================================
// 민원 창구 (civilCounter, 1 × 1): one desk slab through the glass; the officer sat at its front, the resident's stool behind.

const CT = 0.74;
export const CC = {
  top: CT,
  seat: [0, 0.47, 0.62] as V,
  client: [0, 0.47, -0.72] as V,
  glassZ: -0.1,
  keys: [-0.1, 0.77, 0.16] as V,
  screen: [-0.12, 1.07, -0.03] as V,
  bell: [-0.39, CT + 0.03, 0.2] as V,
  printer: [0.34, CT, 0.03] as V,
  tray: [0.34, CT + 0.13, 0.14] as V,
  paper: [0.1, CT, 0.22] as V,
  pad: [0.3, CT, 0.3] as V,
  stampHome: [0.4, CT, 0.3] as V,
  inTray: [-0.33, CT, 0.03] as V,
  outTray: [0.34, CT, 0.32] as V,
  cardSpot: [-0.3, CT + 0.006, 0.12] as V,
  slot: [0, CT + 0.008, -0.02] as V,
  over: [0, CT + 0.008, -0.3] as V,
};
const stampHomeC = add(CC.stampHome, 0, STAMP_UP, 0);
const overPaper = (lift: number): V => add(CC.paper, 0.04, STAMP_UP + lift, -0.06);
const leftRest = add(CC.keys, -0.14, 0.03, 0.05);
const clientN = { client: 1 };
const cardSlot: V = [-0.1, CT + 0.006, 0.08];
const cardOver: V = [-0.1, CT + 0.006, -0.3];
const CERT: Script = {
  seq: [['call', 1.3], ['card', 1.7], ['type', 3.4], ['print', 2.2], ['ink', 1.1], ['stamp', 1.3], ['pass', 1.4], ['take', 1.5], ['bow', 1.7]],
  at: () => sat(CC.seat),
  key(k, u, c) {
    const cardAt: V | null = k === 'call' ? lerpV(cardOver, cardSlot, sm(u, 0.5, 1)) : k === 'card' ? lerpV(cardSlot, CC.cardSpot, sm(u, 0.15, 0.85)) : k === 'pass' ? lerpV(CC.cardSpot, cardSlot, sm(u, 0.1, 0.95)) : k === 'take' ? lerpV(cardSlot, cardOver, sm(u, 0, 0.6)) : k === 'bow' ? null : CC.cardSpot;
    const trayG = sheetBy(CC.tray);
    const paperG = sheetBy(add(CC.paper, 0, 0.006, 0));
    const slotG = sheetBy(CC.slot);
    const overG = sheetBy(CC.over);
    const sheet: V | null =
      k === 'print' ? (u < 0.5 ? trayG : lerpV(trayG, paperG, sm(u, 0.55, 0.95))) : k === 'ink' || k === 'stamp' ? paperG : k === 'pass' ? lerpV(paperG, slotG, sm(u, 0.1, 0.95)) : k === 'take' ? lerpV(slotG, overG, sm(u, 0, 0.6)) : null;
    const stamp: V = k === 'ink' ? lerpV(stampHomeC, add(CC.pad, 0, STAMP_UP + 0.012 * (1 - Math.abs(Math.sin(u * PI * 2))), 0), sm(u, 0.1, 0.55)) : k === 'stamp' ? lerpV(overPaper(0.05), overPaper(0.002), Math.abs(Math.sin(u * PI))) : stampHomeC;
    const n = { ...clientN, call: k === 'call' ? 1 : 0, called: c.p('call', 0.2, 0.3), fill: 3 * c.p('type', 0, 0.95), print: c.p('print', 0, 0.5), sealed: c.p('stamp', 0.45, 0.55), reach: k === 'take' || k === 'call' ? 1 : 0, nods: k === 'bow' ? 1 : 0, thanks: k === 'bow' ? 1 : 0 };
    const props = { sheet, stamp, card: cardAt };
    switch (k) {
      case 'call':
        return { l: add(CC.bell, 0, 0.012 - 0.012 * Math.abs(Math.sin(u * PI * 2)), 0), gl: 0.2, r: add(CC.paper, 0.02, 0.04, 0.06), gr: 0.25, palms: 0.05, lean: 0.06, nod: -0.02, n, props };
      case 'card':
        return { l: leftRest, gl: 0.3, palms: 0.05, tool: 'card' as JuTool, r: add(CC.paper, 0.02, 0.04, 0.06), gr: 0.25, lean: 0.12, nod: 0.25, n, props };
      case 'type':
        return { ...typing(CC.keys, c.t), nod: 0.08, lean: 0.07, n, props };
      case 'print':
        return u < 0.5 ? { l: leftRest, gl: 0.25, r: add(trayG, 0, 0.03, 0), gr: 0.2, palms: 0.05, lean: 0.14, nod: 0.14, n, props } : { l: leftRest, gl: 0.25, tool: 'sheet' as JuTool, lean: 0.14, nod: 0.26, n, props };
      case 'ink':
      case 'stamp':
        return { l: add(CC.paper, -0.12, 0.03, 0.08), gl: 0.15, palms: 0.05, tool: 'stamp' as JuTool, lean: 0.16, nod: 0.3, n, props };
      case 'pass':
        return { l: add(cardAt ?? cardSlot, 0, 0.012, 0.03), gl: 0.25, palms: 0.05, tool: 'sheet' as JuTool, lean: 0.2, nod: 0.16, n, props };
      case 'take':
        return { l: talkSit(c, 0.2), gl: 0.15, r: talkSit(c, -0.18), gr: 0.15, palms: 0.5, lean: 0.08, nod: 0.05, n, props };
      default:
        // Sat back, a small bow with the words.
        return { l: leftRest, gl: 0.25, r: add(CC.keys, 0.12, 0.03, 0.05), gr: 0.25, palms: 0.05, lean: 0.04, nod: 0.08 + 0.1 * Math.sin(u * PI), n, props };
    }
  },
};
const PERMIT: Script = {
  seq: [['open', 1.6], ['read', 2.8], ['tick', 3.8], ['type', 3.2], ['ink', 1], ['seal', 1.2], ['file', 1.8]],
  at: () => sat(CC.seat),
  key(k, u, c) {
    const a = add(CC.paper, -0.03, 0, 0.02);
    const pen: V = k === 'tick' ? add(a, -0.06 + 0.1 * frac(u * 4), PEN_UP + 0.005 * Math.sin(c.t * 15), -0.1 + 0.05 * Math.floor(u * 4)) : add(CC.paper, 0.17, 0.02, 0.1);
    const stamp: V = k === 'ink' ? lerpV(stampHomeC, add(CC.pad, 0, STAMP_UP + 0.012 * (1 - Math.abs(Math.sin(u * PI * 2))), 0), sm(u, 0.1, 0.55)) : k === 'seal' ? lerpV(overPaper(0.05), overPaper(0.002), Math.abs(Math.sin(u * PI))) : stampHomeC;
    const n = { folder: k === 'file' ? 1 - sm(u, 0.5, 0.95) : c.p('open', 0.3, 0.8), ticks: 4 * c.p('tick', 0, 0.98), fill: 3 * c.p('type', 0, 0.95), sealed: c.p('seal', 0.45, 0.55), moved: k === 'file' ? sm(u, 0.1, 0.9) : 0, filed: c.p('file', 0.9, 1), mode: 1 };
    const props = { pen, stamp };
    switch (k) {
      case 'open':
        return { l: add(CC.inTray, 0.03, 0.05, 0.02), gl: 0.35, r: add(CC.paper, -0.02, 0.04, 0), gr: 0.2, palms: 0.05, lean: 0.14, nod: 0.28, n, props };
      case 'read':
        return { l: add(CC.paper, -0.14, 0.03, 0.06), gl: 0.15, r: add(CC.paper, 0.03 - 0.1 * frac(u * 2), 0.03, -0.1 + 0.18 * u), gr: 0.15, palms: 0.05, lean: 0.16, nod: 0.32, n, props };
      case 'tick':
        return { l: add(CC.paper, -0.14, 0.03, 0.06), gl: 0.15, palms: 0.05, tool: 'pen' as JuTool, lean: 0.16, nod: 0.33, n, props };
      case 'type':
        return { ...typing(CC.keys, c.t), nod: 0.08, lean: 0.07, n, props };
      case 'ink':
      case 'seal':
        return { l: add(CC.paper, -0.12, 0.03, 0.08), gl: 0.15, palms: 0.05, tool: 'stamp' as JuTool, lean: 0.16, nod: 0.3, n, props };
      default: {
        const p = lerpV(add(CC.paper, 0, 0.05, 0), add(CC.outTray, -0.02, 0.05, 0), sm(u, 0.1, 0.9));
        return { l: add(p, -0.12, 0, 0), gl: 0.4, r: add(p, 0.12, 0, 0), gr: 0.4, palms: 0.05, lean: 0.1, nod: 0.2, n, props };
      }
    }
  },
};
/** The queue the 소동 starts from: it falls round by round. */
export const queueOf = (round: number) => 31 - wrap(round, 28);
const RUSH: Script = {
  seq: [['call', 0.55, 0.3], ['type', 0.95, 0.3], ['ink', 0.5, 0.25], ['stamp', 0.6, 0.25], ['pass', 0.65, 0.3]],
  at: () => sat(CC.seat),
  key(k, u, c) {
    const paperG = sheetBy(add(CC.paper, 0, 0.006, 0));
    const slotG = sheetBy(CC.slot);
    const stamp: V = k === 'ink' ? lerpV(stampHomeC, add(CC.pad, 0, STAMP_UP + 0.01, 0), sm(u, 0.1, 0.7)) : k === 'stamp' ? lerpV(overPaper(0.04), overPaper(0.002), Math.abs(Math.sin(u * PI))) : stampHomeC;
    const sheet = k === 'pass' ? lerpV(paperG, slotG, sm(u, 0.05, 0.95)) : paperG;
    const n = { ...clientN, queue: queueOf(c.round), rush: 1, called: 1, fill: 3 * c.p('type', 0, 0.9), print: 1, sealed: c.p('stamp', 0.45, 0.55), reach: k === 'pass' ? 1 : 0 };
    const props = { sheet, stamp };
    switch (k) {
      case 'call':
        return { l: add(CC.bell, 0, 0.012 - 0.012 * Math.abs(Math.sin(u * PI * 2)), 0), gl: 0.2, r: add(CC.paper, 0.02, 0.05, 0.08), gr: 0.25, palms: 0.05, lean: 0.14, nod: 0.05, n, props };
      case 'type':
        return { ...typing(CC.keys, c.t * 1.5), nod: 0.1, lean: 0.14, n, props };
      case 'ink':
      case 'stamp':
        return { l: add(CC.paper, -0.12, 0.03, 0.08), gl: 0.15, palms: 0.05, tool: 'stamp' as JuTool, lean: 0.2, nod: 0.3, n, props };
      default:
        return { l: leftRest, gl: 0.25, palms: 0.05, tool: 'sheet' as JuTool, lean: 0.22, nod: 0.12, n, props };
    }
  },
};
const MEDIATE: Script = {
  seq: [['listen', 3.4], ['calm', 2.8], ['look', 3.2], ['show', 3.2], ['agree', 2.6]],
  at: () => sat(CC.seat),
  key(k, u, c) {
    const n = { ...clientN, called: 1, cross: k === 'listen' ? 1 : k === 'calm' ? 1 - sm(u, 0.2, 0.9) : 0, nods: k === 'show' || k === 'agree' ? 1 : 0, rule: c.p('look', 0.2, 0.7), mode: 2, ok: k === 'agree' ? 1 : 0, doc: k === 'show' || k === 'agree' ? 1 : 0 };
    const props = {};
    switch (k) {
      case 'listen':
        // Forward, hands together on the desk, and nodding.
        return { l: add(CC.paper, -0.08, 0.05, 0.1), gl: 0.45, r: add(CC.paper, -0.0, 0.05, 0.1), gr: 0.45, palms: 0.05, lean: 0.14, nod: 0.08 + 0.07 * Math.sin(c.t * 1.9), n, props };
      case 'calm':
        return { l: add(talkSit(c, 0.16), 0, 0.03, 0.05), gl: 0.1, r: add(talkSit(c, -0.16), 0, 0.03, 0.05), gr: 0.1, palms: 0, lean: 0.12, nod: 0.12 + 0.04 * Math.sin(c.t * 2.2), n, props };
      case 'look':
        return { ...typing(CC.keys, c.t), nod: 0.04, lean: 0.08, n, props };
      case 'show':
        // The paper's words followed with a finger, turned for them to read.
        return { l: leftRest, gl: 0.25, r: add(CC.paper, -0.06 + 0.12 * frac(u * 2), 0.03, -0.1 + 0.03 * Math.floor(u * 2)), gr: 0.12, palms: 0.05, lean: 0.18, nod: 0.24, n, props };
      default:
        return { l: leftRest, gl: 0.25, r: talkSit(c, -0.16), gr: 0.15, palms: 0.5, lean: 0.05, nod: 0.08 + 0.08 * Math.sin(u * PI * 2), n, props };
    }
  },
};

// =============================================================================================
// 무인민원발급기 (juKiosk, 1 × 1): against the wall, its screen raked back. The elder at its left, the dweller at its right, turned in.

export const KI = {
  screen: [0, 1.2, 0.03] as V,
  key: [-0.1, 1.2, 0.05] as V,
  tray: [0, 0.92, 0.12] as V,
  dweller: [0.36, 0.36] as const,
  elder: [-0.3, 0.56] as const,
  handOver: [0.02, 1, 0.4] as V,
};
const KIOSK_YAW = PI + 0.74;
export const SHEET_KI: V = sheetBy(KI.tray);
const HELP: Script = {
  seq: [['greet', 2.4], ['menu', 2.8], ['elder', 3.4], ['fee', 2.2], ['print', 2.2], ['take', 1.8], ['thanks', 2.2]],
  at: () => st(KI.dweller[0], KI.dweller[1], KIOSK_YAW),
  key(k, u, c) {
    const handG = sheetBy(KI.handOver);
    const sheet: V | null = k === 'print' ? add(SHEET_KI, 0, 0.02 * sm(u, 0.3, 1), 0.04 * sm(u, 0.3, 1)) : k === 'take' ? lerpV(add(SHEET_KI, 0, 0.02, 0.04), handG, sm(u, 0.1, 0.85)) : null;
    const n = { elder: 1, step: k === 'greet' ? 0 : k === 'menu' ? 1 : k === 'elder' ? 2 : k === 'fee' ? 3 : 4, press: k === 'elder' ? 1 : 0, out: c.p('print', 0.3, 1), talking: k === 'greet' ? 1 : 0, handing: k === 'take' ? 1 : 0, glad: k === 'thanks' ? 1 : 0 };
    const props = { sheet };
    const tapMenu: V = add(KI.screen, 0.06 + 0.1 * Math.sin(u * 5), 0.01 + 0.03 * Math.cos(u * 7), 0.045);
    switch (k) {
      case 'greet':
        // Turned to them, an open hand: 어르신, 제가 도와 드릴게요.
        return { ...easy(c), r: c.bd(-0.1, 1.04 + 0.03 * Math.sin(c.t * 3), 0.3), gr: 0.1, palms: 0.5, nod: 0.05 + 0.05 * Math.sin(c.t * 2.3), lean: 0.08, n, props };
      case 'menu':
      case 'fee':
        return { ...easy(c), r: tapMenu, gr: 0.2, palms: 0.1, tap: true, nod: 0.08, lean: 0.12, n, props };
      case 'elder':
        // Showing the way: a finger near, not pressing for them.
        return { ...easy(c), r: add(KI.screen, 0.14, -0.1, 0.09), gr: 0.2, palms: 0.2, nod: 0.12 + 0.05 * Math.sin(c.t * 1.7), lean: 0.1, n, props };
      case 'print':
        return { ...easy(c), r: add(SHEET_KI, 0, 0.05, 0.03), gr: 0.25, palms: 0.05, lean: 0.24, nod: 0.3, n, props };
      case 'take':
        return { ...easy(c), r: undefined, tool: 'sheet' as JuTool, lean: 0.12, nod: 0.14, n, props };
      default:
        return { ...easy(c), nod: 0.08 + 0.12 * Math.sin(u * PI), lean: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 기재대 (juFormStand, 2 × 1): a stand-up writing desk; pockets of forms along its back, a form lies at the elder's end.

const FT = 0.92;
export const FS = {
  top: FT,
  stand: 0.34,
  form: [0.3, FT + 0.004, 0.02] as V,
  magHome: [0.1, FT + 0.03, -0.08] as V,
  glassHome: [-0.08, FT + 0.018, -0.05] as V,
  penHome: [-0.3, FT + 0.012, -0.03] as V,
  box: [-0.72, FT, -0.04] as V,
  pockets: [-0.62, -0.22, 0.2, 0.62],
  pocketY: 1.14,
  pocketZ: -0.15,
  elder: [0.62, 0.46] as const,
};
const elderHead: V = [FS.elder[0] - 0.02, 1.47, FS.elder[1] + 0.09];
const FORM_HELP: Script = {
  seq: [['greet', 2.2], ['glasses', 2.6], ['mag', 3.8], ['mark', 3.2], ['write', 4.2], ['thanks', 2.2]],
  at: () => st(-0.02, FS.stand),
  key(k, u, c) {
    const onDesk: V = add(FS.form, -0.3, 0.03, 0.08);
    const glasses: V | null = k === 'glasses' ? (u < 0.85 ? lerpV(FS.glassHome, elderHead, sm(u, 0.1, 0.85)) : elderHead) : k === 'greet' ? FS.glassHome : null;
    const mag: V = k === 'mag' ? add(FS.form, -0.05 + 0.1 * Math.sin(u * PI * 2), 0.12, 0.04) : FS.magHome;
    const pen: V = k === 'mark' ? add(FS.form, 0.02 + 0.04 * Math.sin(u * 6), PEN_UP + 0.004 * Math.sin(c.t * 14), 0.05 - 0.02 * Math.floor(u * 3)) : FS.penHome;
    const n = { elder: 1, on: c.p('glasses', 0.85, 0.95), leanIn: k === 'mag' || k === 'write' ? 1 : 0, marked: c.p('mark', 0.2, 0.9), writing: k === 'write' ? 1 : 0, written: c.p('write', 0, 0.98), talking: k === 'greet' ? 1 : 0, glad: k === 'thanks' ? 1 : 0 };
    const props = { glasses, mag, pen };
    switch (k) {
      case 'greet':
        return { l: onDesk, gl: 0.15, r: c.bd(-0.22, 1.02 + 0.03 * Math.sin(c.t * 2.8), 0.24), gr: 0.1, palms: 0.5, lean: 0.04, nod: 0.08 * Math.sin(c.t * 2.2), n, props };
      case 'glasses':
        return u < 0.85 ? { l: onDesk, gl: 0.15, palms: 0.05, tool: 'glasses' as JuTool, lean: 0.1, nod: 0.05, n, props } : { l: onDesk, gl: 0.15, r: c.bd(-0.2, 1.05, 0.2), gr: 0.1, palms: 0.5, nod: 0.08, n, props };
      case 'mag':
        return { l: onDesk, gl: 0.15, palms: 0.05, tool: 'mag' as JuTool, lean: 0.2, nod: 0.3, n, props };
      case 'mark':
        return { l: onDesk, gl: 0.15, palms: 0.05, tool: 'pen' as JuTool, lean: 0.2, nod: 0.34, n, props };
      case 'write':
        // Waiting, leaning on the desk, not hurrying them.
        return { l: onDesk, gl: 0.15, r: add(FS.form, -0.14, 0.03, 0.12), gr: 0.2, palms: 0.05, lean: 0.1, nod: 0.2 + 0.03 * Math.sin(c.t * 1.2), n, props };
      default:
        return { ...easy(c), lean: 0.04, nod: 0.08 + 0.12 * Math.sin(u * PI), n, props };
    }
  },
};
export const STOCK_ROUNDS = 4;
const FORM_STOCK: Script = {
  seq: [['take', 1.8], ['walk', 0.6, 0.9], ['slot', 1.6], ['tap', 1]],
  at(k, round) {
    if (k === 'take') return st(-0.56, FS.stand);
    return st(FS.pockets[wrap(round, STOCK_ROUNDS)] * 0.85, FS.stand);
  },
  key(k, u, c) {
    const i = wrap(c.round, STOCK_ROUNDS);
    const pocket: V = [FS.pockets[i], FS.pocketY, FS.pocketZ];
    const hold: V = c.bd(0.14, 1.0, 0.24);
    const stack: V = k === 'take' ? lerpV(add(FS.box, 0.02, 0.06, 0), hold, sm(u, 0.35, 1)) : hold;
    const n = { pocket: i, filling: k === 'slot' ? sm(u, 0.2, 0.8) : k === 'tap' ? 1 : 0 };
    const props = { stack };
    switch (k) {
      case 'take':
        return { tool: 'stack' as JuTool, r: add(FS.box, 0.06, 0.08, 0.04), gr: 0.5, lean: 0.16, nod: 0.3, n, props };
      case 'walk':
        return { tool: 'stack' as JuTool, r: add(hold, -0.1, 0.04, 0), gr: 0.4, nod: 0.1, n, props };
      case 'slot':
        return { tool: 'stack' as JuTool, r: add(pocket, 0, 0.1 - 0.06 * sm(u, 0.2, 0.8), 0.03), gr: 0.65, palms: 0.05, lean: 0.14, nod: 0.08, n, props };
      default:
        return { tool: 'stack' as JuTool, r: add(pocket, 0.012 * Math.sin(u * 16), 0.09, 0.04), gr: 0.1, palms: 0.1, lean: 0.12, nod: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 복지 상담 부스 (juWelfareBooth, 2 × 2): low screens on three sides, a desk across; dweller at the front, the resident inside.

const WT = 0.72;
export const WB = {
  top: WT,
  seat: [0, 0.47, 1.12] as V,
  client: [0, 0.47, -0.02] as V,
  note: [0.16, WT + 0.004, 0.68] as V,
  penHome: [0.36, WT + 0.012, 0.72] as V,
  cupHome: [-0.02, WT + 0.05, 0.76] as V,
  cupThere: [-0.1, WT + 0.05, 0.54] as V,
  leaflet: [-0.06, WT + 0.006, 0.66] as V,
  leafThere: [0.02, WT + 0.006, 0.47] as V,
  keys: [-0.24, WT + 0.03, 0.66] as V,
};
const WELFARE: Script = {
  seq: [['tea', 2.4], ['listen', 3.8], ['note', 3.6], ['explain', 3.6], ['enter', 3], ['close', 2.2]],
  at: () => sat(WB.seat),
  key(k, u, c) {
    const pen: V = k === 'note' ? add(WB.note, -0.05 + 0.1 * frac(u * 3), PEN_UP + 0.004 * Math.sin(c.t * 15), -0.05 + 0.04 * Math.floor(u * 3)) : WB.penHome;
    const cup: V = k === 'tea' ? lerpV(WB.cupHome, WB.cupThere, sm(u, 0.15, 0.85)) : WB.cupThere;
    const leaflet: V = k === 'explain' ? lerpV(WB.leaflet, WB.leafThere, sm(u, 0, 0.35)) : k === 'enter' || k === 'close' ? WB.leafThere : WB.leaflet;
    const n = { client: 1, talks: k === 'listen' ? 1 : 0, nods: k === 'explain' || k === 'close' ? 1 : 0, lines: 3 * c.p('note', 0.05, 0.95), reach: k === 'explain' && u > 0.4 ? 1 : 0, fill: 3 * c.p('enter', 0, 0.95), glad: k === 'close' ? 1 : 0 };
    const props = { pen, cup, leaflet };
    const lRest = add(WB.note, -0.26, 0.03, 0.08);
    switch (k) {
      case 'tea':
        return { l: lRest, gl: 0.2, palms: 0.05, tool: 'cup' as JuTool, lean: 0.2, nod: 0.12, n, props };
      case 'listen':
        return { l: add(WB.note, -0.14, 0.05, 0.14), gl: 0.45, r: add(WB.note, -0.05, 0.05, 0.14), gr: 0.45, palms: 0.05, lean: 0.12, nod: 0.1 + 0.07 * Math.sin(c.t * 1.6), n, props };
      case 'note':
        return { l: lRest, gl: 0.2, palms: 0.05, tool: 'pen' as JuTool, lean: 0.16, nod: 0.32, n, props };
      case 'explain': {
        const f = add(leaflet, 0.05 * Math.sin(u * 9), 0.03, 0.08);
        return { l: lRest, gl: 0.2, r: f, gr: 0.12, palms: 0.05, lean: 0.22, nod: 0.22, n, props };
      }
      case 'enter':
        return { ...typing(WB.keys, c.t), nod: 0.08, lean: 0.08, n, props };
      default:
        return { l: talkSit(c, 0.18), gl: 0.15, r: talkSit(c, -0.18), gr: 0.15, palms: 0.5, lean: 0.08, nod: 0.08 + 0.08 * Math.sin(u * PI * 2), n, props };
    }
  },
};

// =============================================================================================
// 마을 소식판 (juNoticeBoard, 2 × 1): a cork board on the wall, six places for a sheet.

export const NB = { face: -0.4, stand: -0.03, read: 0.3, cols: [-0.54, 0, 0.54], rows: [1.5, 1.02] };
export const nbSlot = (i: number): V => {
  const j = wrap(i, 6);
  return [NB.cols[j % 3], NB.rows[j < 3 ? 0 : 1], NB.face + 0.024];
};
const POST: Script = {
  seq: [['read', 2], ['unpin', 1.8], ['aside', 1.1], ['hold', 1.2], ['pin1', 1.5], ['pin2', 1.5], ['back', 2, 0.9]],
  at: (k, round) => (k === 'read' || k === 'back' ? st(nbSlot(round)[0] * 0.85, NB.read) : st(nbSlot(round)[0] * 0.85, NB.stand)),
  key(k, u, c) {
    const S = nbSlot(c.round);
    const top = add(S, -0.1, 0.15, 0.02);
    const top2 = add(S, 0.1, 0.15, 0.02);
    const rest = c.bd(-0.2, 1.02, 0.25);
    const pin: V | null = k === 'unpin' ? lerpV(top2, rest, sm(u, 0.4, 1)) : k === 'hold' ? rest : k === 'pin1' ? lerpV(rest, add(top, 0, 0, 0.012 - 0.012 * sm(u, 0.5, 0.75)), sm(u, 0, 0.6)) : k === 'pin2' ? lerpV(add(top, 0, 0, 0.03), add(top2, 0, 0, 0.012 - 0.012 * sm(u, 0.5, 0.75)), sm(u, 0, 0.6)) : null;
    const n = { slot: wrap(c.round, 6), old: k === 'read' ? 1 : k === 'unpin' ? 1 - sm(u, 0.5, 0.75) : 0, new: k === 'hold' ? sm(u, 0.2, 0.7) : k === 'pin1' || k === 'pin2' || k === 'back' ? 1 : 0, pinA: c.p('pin1', 0.6, 0.7), pinB: c.p('pin2', 0.6, 0.7), pins: k === 'unpin' ? 1 : 0 };
    const props = { pin, oldSheet: k === 'aside' ? lerpV(add(S, 0, 0, 0.02), c.bd(0.3, 0.84, 0.05), sm(u, 0, 1)) : null };
    const hold = add(S, -0.02, 0.05, 0.03);
    switch (k) {
      case 'read':
        return { ...easy(c), r: c.bd(-0.16, 1.1, 0.26), gr: 0.15, palms: 0.1, nod: -0.04, lean: 0.03, n, props };
      case 'unpin':
        return { l: hold, gl: 0.2, palms: 0.05, tool: 'pin' as JuTool, lean: 0.08, nod: S[1] > 1.3 ? -0.14 : 0.08, n, props };
      case 'aside':
        return { l: c.bd(0.3, 0.86, 0.1), gl: 0.5, palms: 0.05, r: rest, gr: 0.4, n, props };
      case 'hold':
        return { l: hold, gl: 0.2, palms: 0.05, tool: 'pin' as JuTool, lean: 0.06, nod: S[1] > 1.3 ? -0.14 : 0.08, n, props };
      case 'pin1':
      case 'pin2':
        return { l: hold, gl: 0.2, palms: 0.05, tool: 'pin' as JuTool, lean: 0.08, nod: S[1] > 1.3 ? -0.14 : 0.08, n, props };
      default:
        return { ...easy(c), nod: -0.03 + 0.08 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 이동식 서고 (juRollStack, 2 × 2): four carriages on floor rails, each with a wheel at its end; an aisle opens where it's wanted.

export const RS = {
  count: 4,
  width: 0.33,
  gap: 0.58,
  left: -0.785,
  end: 0.84,
  wheelY: 1.15,
  shelfY: [0.3, 0.68, 1.06, 1.44, 1.82],
  stand: 1.02,
  inside: 0.42,
};
/** The aisle that opens, after carriage k. Goes back and forth so it opens a carriage at a time. */
const AISLES = [0, 1, 2, 1];
export const aisleOf = (round: number) => AISLES[wrap(round, AISLES.length)];
/** Where a carriage is when the gap stands at g (0..2). */
export const carriageX = (i: number, g: number) => RS.left + RS.width * i + RS.gap * THREE.MathUtils.clamp(i - g, 0, 1);
const aisleX = (k: number) => carriageX(k, k) + (RS.width + RS.gap) / 2;
const FIND: Script = {
  seq: [['look', 1.6], ['turn', 3.2], ['walkin', 0.4, 1.1], ['pull', 1.8], ['read', 3], ['note', 2], ['put', 1.6], ['out', 0.5, 1.1]],
  at(k, round) {
    const a = aisleOf(round);
    const x = aisleX(a);
    if (k === 'look' || k === 'turn' || k === 'out') return st(carriageX(a, a) + 0.29, RS.stand);
    if (k === 'walkin') return st(x, 0.72);
    if (k === 'pull' || k === 'put') return st(x, RS.inside, PI / 2 + PI);
    return st(x, RS.inside);
  },
  key(k, u, c) {
    const a = aisleOf(c.round);
    const prev = aisleOf(c.round - 1);
    const g = k === 'look' ? prev : k === 'turn' ? mixN(prev, a, sm(u, 0.1, 0.9)) : a;
    const x = aisleX(a);
    // On the left of the aisle: the carriage's shelf face, chest high, seen from the aisle.
    const shelf: V = [x - 0.27, RS.shelfY[2] + 0.14, 0.3];
    const wc: V = [carriageX(a, g), RS.wheelY, RS.end + 0.06];
    const hold: V = c.bd(0.1, 1.0, 0.26);
    const spin = c.t * 2.4;
    const n = { g, shelf: 2, gone: k === 'pull' ? sm(u, 0.4, 0.6) : k === 'put' ? 1 - sm(u, 0.4, 0.6) : k === 'read' || k === 'note' ? 1 : 0, spin: k === 'turn' ? 1 : 0, aisle: a };
    const binder: V | null = k === 'pull' || k === 'put' ? (k === 'pull' ? lerpV(shelf, add(shelf, 0.18, -0.02, 0), sm(u, 0.45, 0.95)) : lerpV(add(shelf, 0.18, -0.02, 0), shelf, sm(u, 0.05, 0.55))) : k === 'read' || k === 'note' ? hold : null;
    const props = { binder };
    switch (k) {
      case 'look':
        return { ...easy(c), r: c.bd(-0.14, 1.12, 0.3), gr: 0.15, palms: 0.1, nod: -0.05, n, props };
      case 'turn':
        return {
          l: add(wc, 0.1 * Math.cos(spin), 0.1 * Math.sin(spin), 0.02),
          r: add(wc, 0.1 * Math.cos(spin + PI), 0.1 * Math.sin(spin + PI), 0.02),
          gl: 0.75,
          gr: 0.75,
          palms: 0.2,
          lean: 0.12,
          nod: 0.12,
          n,
          props,
        };
      case 'walkin':
      case 'out':
        return { ...easy(c), nod: 0.05, n, props };
      case 'pull':
      case 'put':
        return u < 0.25 && k === 'pull' ? { ...easy(c), r: add(shelf, 0.02, 0, 0), gr: 0.4, lean: 0.06, nod: -0.02, n, props } : { ...easy(c), r: undefined, tool: 'binderPull' as JuTool, lean: 0.06, nod: -0.02, n, props };
      case 'read':
        return { tool: 'binder' as JuTool, r: add(hold, -0.02 + 0.08 * Math.sin(u * 3), 0.04, -0.03 + 0.03 * frac(u * 2)), gr: 0.1, palms: 0.1, nod: 0.36, n, props };
      default:
        return { tool: 'binder' as JuTool, r: add(hold, 0.12, 0.03, 0.02), gr: 0.45, palms: 0.1, nod: 0.3, n, props };
    }
  },
};

// =============================================================================================
// 재난 구호 물품함 (juReliefCage, 2 × 1): a wire cage to the ceiling's height, shelved; a door on its left half, a list on a fold-down flap.

export const RC = {
  face: 0.2,
  stand: 0.62,
  shelves: [0.32, 0.78, 1.24, 1.66],
  door: -0.5,
  doorW: 0.46,
  lock: [-0.04, 1.06, 0.22] as V,
  flap: [0.6, 0.98, 0.33] as V,
  points: [[-0.42, 1.3], [-0.12, 1.3], [-0.42, 1], [-0.12, 1], [-0.28, 1.36]] as ReadonlyArray<readonly [number, number]>,
  bottle: [-0.24, 1.24, 0.14] as V,
};
const RELIEF: Script = {
  seq: [['unlock', 1.8], ['open', 1.4, 0.8], ['count', 4.2], ['date', 2.8], ['walk', 0.4, 0.9], ['tick', 3.2], ['close', 1.8, 0.9]],
  at: (k) => (k === 'unlock' || k === 'close' || k === 'open' ? st(-0.1, RC.stand) : k === 'count' || k === 'date' ? st(-0.2, RC.stand) : st(0.42, RC.stand)),
  key(k, u, c) {
    const i = Math.min(RC.points.length - 1, Math.floor(u * RC.points.length));
    const pt = RC.points[Math.max(0, i)];
    const board: V = k === 'count' || k === 'date' ? c.bd(0.14, 1.0, 0.26) : RC.flap;
    const pen: V = k === 'tick' ? add(RC.flap, 0.03 * Math.sin(u * 7), PEN_UP + 0.004 * Math.sin(c.t * 15), -0.05 + 0.03 * Math.floor(u * 4)) : add(RC.flap, 0.14, 0.015, 0);
    const bottle: V = k === 'date' ? lerpV(RC.bottle, c.bd(-0.1, 1.2, 0.26), sm(u, 0.05, 0.3) * (1 - sm(u, 0.75, 1))) : RC.bottle;
    const n = { open: k === 'unlock' ? 0 : k === 'open' ? sm(u, 0, 1) : k === 'close' ? 1 - sm(u, 0.1, 0.8) : 1, ticks: 4 * c.p('tick', 0, 0.98), lockOff: k === 'unlock' ? sm(u, 0.5, 0.8) : k === 'close' ? 1 - sm(u, 0.7, 0.95) : 1, count: k === 'count' ? i : 0 };
    const props = { board, pen, bottle };
    switch (k) {
      case 'unlock':
      case 'close':
        return { ...easy(c), r: add(RC.lock, 0, 0, 0.03 + 0.005 * Math.sin(u * 12)), gr: 0.55, palms: 0.2, lean: 0.08, nod: 0.12, n, props };
      case 'open':
        return { ...easy(c), r: [RC.door + RC.doorW * Math.cos(sm(u, 0, 1) * 1.3), 1.06, RC.face + RC.doorW * Math.sin(sm(u, 0, 1) * 1.3)], gr: 0.6, palms: 0.2, lean: 0.04, nod: 0.02, n, props };
      case 'count':
        return { tool: 'board' as JuTool, r: [pt[0], pt[1], RC.face + 0.12], gr: 0.15, palms: 0.2, lean: 0.06, nod: pt[1] > 1.1 ? -0.03 : 0.14, n, props };
      case 'date':
        return { tool: 'board' as JuTool, r: add(bottle, 0, 0.09, 0.03), gr: 0.6, palms: 0.2, nod: 0.08, n, props };
      case 'walk':
        return { ...easy(c), n, props };
      default:
        return { l: add(RC.flap, -0.14, 0.03, 0.04), gl: 0.15, palms: 0.05, tool: 'pen' as JuTool, lean: 0.18, nod: 0.34, n, props };
    }
  },
};

// =============================================================================================
// 회의 준비대 (juMeetingPrep, 2 × 1): a low cabinet of a meeting's things; a row of name plates goes up along its front.

const MT = 0.84;
export const MP = {
  top: MT,
  stand: 0.42,
  stack: [-0.56, MT, -0.02] as V,
  plates: [-0.26, 0.02, 0.3, 0.58],
  plateZ: 0.14,
  box: [-0.12, MT, -0.04] as V,
  rec: [0.62, MT, -0.02] as V,
};
export const plateAt = (i: number): V => [MP.plates[wrap(i, MP.plates.length)], MT + 0.04, MP.plateZ];
const MEET: Script = {
  seq: [['square', 2.6], ['walk', 0.3, 0.8], ['p0', 1.1], ['p1', 1.1], ['p2', 1.1], ['p3', 1.1], ['rec', 2.2], ['nod', 1.6]],
  at: (k) => (k === 'square' ? st(-0.42, MP.stand) : k === 'rec' || k === 'nod' ? st(0.46, MP.stand) : k[0] === 'p' ? st(MP.plates[Number(k[1])] - 0.08, MP.stand) : st(-0.12, MP.stand)),
  key(k, u, c) {
    const pi = k[0] === 'p' ? Number(k[1]) : -1;
    // The rest of them carried on the left arm, one taken off for each place.
    const pile: V = c.bd(0.14, 0.98, 0.26);
    const up: V = c.bd(-0.12, 1.02, 0.28);
    const plate: V = pi >= 0 ? lerpV(up, plateAt(pi), sm(u, 0.15, 0.8)) : up;
    const lArm = { l: add(pile, 0, -0.03, 0.02), gl: 0.5 };
    const n = { placed: 4 * ((c.p('p0', 0.8, 0.85) + c.p('p1', 0.8, 0.85) + c.p('p2', 0.8, 0.85) + c.p('p3', 0.8, 0.85)) / 4), rec: k === 'rec' && u > 0.2 ? 1 : k === 'nod' ? 1 : 0, squared: c.p('square', 0.2, 0.9) };
    const props = { plate: pi >= 0 && u < 0.85 ? plate : null, pile: k === 'walk' || pi >= 0 ? pile : null };
    switch (k) {
      case 'square': {
        const b = 0.012 * Math.abs(Math.sin(u * PI * 3));
        return { l: add(MP.stack, -0.14, 0.06 + b, 0), r: add(MP.stack, 0.14, 0.06 + b, 0), gl: 0.5, gr: 0.5, palms: 0, lean: 0.14, nod: 0.3, n, props };
      }
      case 'walk':
        return { ...easy(c), ...lArm, nod: 0.1, n, props };
      case 'rec':
        return { ...easy(c), r: add(MP.rec, 0.02 * Math.sin(u * 4), 0.08, 0.03), gr: 0.2, palms: 0.05, tap: true, lean: 0.16, nod: 0.3, n, props };
      case 'nod':
        return { ...easy(c), lean: 0.03, nod: 0.05 + 0.1 * Math.sin(u * PI), n, props };
      default:
        return u < 0.85 ? { ...lArm, tool: 'plate' as JuTool, lean: 0.16, nod: 0.26, n, props } : { ...easy(c), ...lArm, lean: 0.1, nod: 0.2, n, props };
    }
  },
};

const SCRIPTS: Record<JuMotion, Script> = {
  juCert: CERT,
  juPermit: PERMIT,
  juRush: RUSH,
  juMediate: MEDIATE,
  juHelp: HELP,
  juFormHelp: FORM_HELP,
  juFormStock: FORM_STOCK,
  juWelfare: WELFARE,
  juPostNotice: POST,
  juFindRecord: FIND,
  juReliefCheck: RELIEF,
  juMeetingSet: MEET,
};
