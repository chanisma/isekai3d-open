import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 통번역 사무소, the made-up firm 건넴말 (2026-11-01). Each motion is a round of beats: where the dweller is, where the
 * hands go, what moves. The piece reads the same script by the same clock (interpreter.ts), so the target text fills under the
 * fingers, the pad fills with the speaker's words and the seal comes down on the paper. Foreign words are an invented script only.
 *
 * - 번역 책상 (translationDesk): ipTranslate source read, typed, stuck, the dictionary, typed, saved. ipProofread a print marked in red.
 * - 용어집 서가 (glossaryShelf): ipGlossary a dictionary pulled, read, laid on the ledge, a card written. ipShadow a script in hand, phones on, repeating.
 * - 동시통역 부스 (interpretBooth): ipPractice in by the glass door, a recording interpreted. ipUrgent the alarm: in fast, live, a colleague beside, water.
 *   ipBrief outside it, the speaker's script gone through with them.
 * - 용어 게시판 (ipTermBoard): ipPinTerm a card written at the ledge and pinned up.
 * - 회의 탁자 (ipMeetingTable): ipConsecutive a speaker heard, notes taken, the pen down, spoken, the page turned.
 * - 공증 카운터 (ipNotaryCounter): ipNotarise original and translation compared, ribboned, stamped, signed, handed over.
 * - 연습 코너 (ipPracticeCorner): ipRecord a recorder to the mouth, a script read, played back under headphones, a note.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x; in the booth and at the meeting table they face out, so their right is on -x.
 * `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type IpMotion = 'ipTranslate' | 'ipProofread' | 'ipGlossary' | 'ipShadow' | 'ipPractice' | 'ipUrgent' | 'ipBrief' | 'ipPinTerm' | 'ipConsecutive' | 'ipNotarise' | 'ipRecord';
export const IP_MOTIONS = new Set<string>(['ipTranslate', 'ipProofread', 'ipGlossary', 'ipShadow', 'ipPractice', 'ipUrgent', 'ipBrief', 'ipPinTerm', 'ipConsecutive', 'ipNotarise', 'ipRecord']);
export type IpTool = 'pen' | 'book' | 'script' | 'card' | 'stamp' | 'rec' | 'cup';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ipPhase = (p: THREE.Vector3) => frac(p.x * 0.377 + p.z * 0.541);
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
  tool?: IpTool;
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
export interface IpNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: IpTool | null;
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function ipNow(m: IpMotion, t: number, ph: number, H = 1.6): IpNow {
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
export function ipPose(m: IpMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = ipNow(m, t, ipPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Both hands on the keys: `rightX` is the dweller's right, whichever way they face. */
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
/** Talking from a chair: a hand out over the table's edge, palm up, moving with the sentence. */
const talkSit = (c: Ctx, side = 0.2): V => c.bd(side, 0.36 + 0.03 * Math.sin(c.t * 3.1), 0.28);

/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;
/** How far a stamp's grip stands above its face. */
export const STAMP_UP = 0.085;

// =============================================================================================
// 번역 책상 (translationDesk, 1 × 1): seated close, a monitor split into source and target, a held-up page at the left, the dictionary by the left hand, a print at the right.

export const TD = {
  seat: [0, 0.47, 0.62] as V,
  top: 0.74,
  keys: [-0.1, 0.77, 0.2] as V,
  mouse: [0.1, 0.77, 0.2] as V,
  sheet: [0.29, 0.745, 0.2] as V,
  dict: [-0.37, 0.745, 0.17] as V,
  screen: [0, 1.08, -0.22] as V,
};
const penRestT: V = add(TD.sheet, 0.11, 0.02, -0.12);
const leftKeysT = add(TD.keys, -0.05, 0.03, 0);
const onMouseT = (t: number): V => add(TD.mouse, 0.007 * Math.sin(t * 2.1), 0.03, 0.006 * Math.cos(t * 1.6));
const TRANSLATE: Script = {
  seq: [['read', 2.6], ['type', 5.2], ['stuck', 1.8], ['dict', 3.2], ['type2', 5.2], ['check', 2.4], ['save', 1.0]],
  at: () => sat(TD.seat),
  key(k, u, c) {
    const n = { form: 0.5 * c.p('type') + 0.5 * c.p('type2'), reading: k === 'read' ? 1 : 0, stuck: k === 'stuck' || k === 'dict' ? 1 : 0, dictOpen: c.p('dict', 0.1, 0.3) * (1 - c.p('type2', 0, 0.1)), page: c.p('dict', 0.3, 0.8), checked: c.p('check', 0.2, 0.9), saved: c.p('save', 0.2, 0.4) };
    const props = { pen: penRestT };
    switch (k) {
      case 'read':
        // The eyes on the page held up to the left, a finger keeping the place on the keys.
        return { l: leftKeysT, r: onMouseT(c.t), gl: 0.3, gr: 0.4, palms: 0.05, lean: 0.08, nod: 0.06 + 0.03 * Math.sin(c.t * 1.2), n, props };
      case 'type':
      case 'type2':
        return { ...typing(TD.keys, c.t), nod: 0.12, lean: 0.08, n, props };
      case 'stuck':
        // A word that won't go across: a hand at the chin.
        return { l: leftKeysT, gl: 0.3, r: c.bd(-0.04, 0.6 * (c.H / 1.6), 0.14), gr: 0.55, palms: 0.5, lean: 0.02, nod: 0.03, n, props };
      case 'dict':
        return { l: add(TD.dict, 0.04 - 0.08 * sm(u, 0.3, 0.8), 0.04, 0), gl: 0.1, r: onMouseT(c.t), gr: 0.4, palms: 0.05, lean: 0.16, nod: 0.36, n, props };
      case 'check':
        return { l: leftKeysT, gl: 0.3, r: onMouseT(c.t * 1.6), gr: 0.45, palms: 0.05, lean: 0.14, nod: 0.05, n, props };
      default:
        return { l: leftKeysT, gl: 0.3, r: onMouseT(c.t), gr: 0.4, palms: 0.05, tap: u > 0.2 && u < 0.45, nod: 0.1, lean: 0.03, n, props };
    }
  },
};
const PROOFREAD: Script = {
  seq: [['print', 1.6], ['compare', 3.2], ['mark', 3.8], ['look', 2.2], ['fix', 3.4], ['done', 2.2]],
  at: () => sat(TD.seat),
  key(k, u, c) {
    const n = { form: 1, sheet: 1, compare: 1, marks: 4 * c.p('mark'), fixes: 4 * c.p('fix', 0.1, 0.9), okMark: c.p('done', 0.4, 0.6), checked: c.p('compare') };
    const down = (x: number, y: number): V => add(TD.sheet, x, PEN_UP + y, 0);
    const pen: V = k === 'mark' ? add(down(-0.03 + 0.06 * frac(u * 4), 0.004 * Math.abs(Math.sin(c.t * 14))), 0, 0, -0.09 + 0.18 * u) : k === 'done' ? down(0.03, u > 0.4 && u < 0.6 ? 0 : 0.03) : penRestT;
    const props = { pen };
    switch (k) {
      case 'print':
        return { l: leftKeysT, gl: 0.3, r: add(TD.sheet, -0.02, 0.03, 0.02), gr: 0.1, palms: 0.05, lean: 0.12, nod: 0.24, n, props };
      case 'compare':
        return { l: leftKeysT, gl: 0.3, r: add(TD.sheet, -0.02, 0.03, -0.06 + 0.12 * u), gr: 0.15, palms: 0.05, lean: 0.14, nod: 0.26 - 0.2 * Math.abs(Math.sin(c.t * 0.9)), n, props };
      case 'mark':
      case 'done':
        return { l: leftKeysT, gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.17, nod: 0.34, n, props };
      case 'look':
        return { l: leftKeysT, gl: 0.3, r: onMouseT(c.t), gr: 0.4, palms: 0.05, lean: 0.1, nod: 0.04, n, props };
      default:
        return { ...typing(TD.keys, c.t), nod: 0.12, lean: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 용어집 서가 (glossaryShelf, 1 × 1): floor to head high dictionaries; a writing ledge at waist height sticking out, a small player on it.

export const GS = {
  stand: 0.36,
  ledge: 1.0,
  slot: [-0.12, 1.3, -0.1] as V,
  /** Where a book lies open on the ledge, and the card beside it. */
  rest: [-0.14, 1.03, 0.02] as V,
  card: [0.2, 1.003, 0.03] as V,
  player: [-0.3, 1.03, 0.0] as V,
};
const penRestG: V = add(GS.card, 0.13, 0.015, -0.03);
const holdBook = (c: Ctx): V => c.bd(0.1, 1.05 * (c.H / 1.6), 0.28);
const GLOSSARY: Script = {
  seq: [['scan', 1.8], ['pull', 1.4], ['read', 2.8], ['flip', 1.8], ['lay', 1.2], ['write', 3.4], ['take', 1.0], ['back', 1.4]],
  at: () => st(0.02, GS.stand),
  key(k, u, c) {
    const hold = holdBook(c);
    const book: V = k === 'scan' ? GS.slot : k === 'pull' ? lerpV(GS.slot, hold, sm(u, 0.15, 1)) : k === 'back' ? lerpV(hold, GS.slot, sm(u, 0.2, 1)) : k === 'lay' ? lerpV(hold, GS.rest, sm(u, 0.1, 0.9)) : k === 'write' ? GS.rest : k === 'take' ? lerpV(GS.rest, hold, sm(u, 0.1, 0.9)) : hold;
    const open = c.p('pull', 0.7, 1) * (1 - c.p('back', 0, 0.3));
    const n = { open, page: c.p('flip', 0.1, 0.8), hi: c.p('flip', 0.8, 1) * (1 - c.p('take', 0, 0.3)), lines: 3 * c.p('write', 0.1, 0.9), cardOn: c.p('lay', 0.5, 1), taken: k === 'scan' ? 0 : 1 };
    const pen: V = k === 'write' ? add(GS.card, -0.05 + 0.1 * frac(u * 3), PEN_UP + 0.004 * Math.sin(c.t * 16), -0.025 + 0.025 * Math.floor(u * 3)) : penRestG;
    const props = { book, pen };
    switch (k) {
      case 'scan':
        return { l: easy(c).l, gl: 0.3, r: c.bd(-0.14, 1.3 + 0.08 * Math.sin(c.t * 2), 0.3), gr: 0.2, palms: 0.2, nod: -0.05, lean: 0.06, n, props };
      case 'pull':
      case 'back':
      case 'take':
      case 'lay':
        return { tool: 'book', r: easy(c).r, gr: 0.3, nod: 0.22, lean: 0.05, n, props };
      case 'read':
        return { tool: 'book', r: add(hold, 0.12, 0.05, 0), gr: 0.1, palms: 0.1, nod: 0.3, n, props };
      case 'flip':
        return { tool: 'book', r: add(hold, 0.1 - 0.2 * sm(u, 0.1, 0.8), 0.07, 0), gr: 0.1, palms: 0.1, nod: 0.3, n, props };
      default:
        return { l: add(GS.rest, 0.02, 0.05, 0.01), gl: 0.1, palms: 0.05, tool: 'pen', lean: 0.12, nod: 0.36, n, props };
    }
  },
};
const holdScript = (c: Ctx): V => c.bd(0.14, 1.04 * (c.H / 1.6), 0.3);
const SHADOW: Script = {
  seq: [['wear', 1.6], ['press', 1.0], ['follow', 5.2], ['again', 1.2], ['follow2', 5.2], ['off', 1.4]],
  at: () => st(-0.12, GS.stand),
  key(k, u, c) {
    const n = { hs: k === 'wear' ? sm(u, 0.5, 0.75) : k === 'off' ? 1 - sm(u, 0.3, 0.6) : 1, playing: k === 'follow' || k === 'follow2' ? 1 : 0, pos: k === 'follow' ? u * 0.5 : k === 'follow2' ? 0.3 + u * 0.7 : k === 'again' ? 0.3 : 0, speaking: k === 'follow' || k === 'follow2' ? 1 : 0, script: 1 };
    const props = { script: holdScript(c) };
    const button = add(GS.player, 0.03, 0.05, 0.03);
    switch (k) {
      case 'wear':
        return { tool: 'script', r: c.bd(-0.14, 0.92 * c.H, 0.03), gr: 0.5, nod: 0.1, n, props };
      case 'press':
      case 'again':
        return { tool: 'script', r: button, gr: 0.15, palms: 0.05, tap: u > 0.3 && u < 0.6, nod: 0.26, lean: 0.1, n, props };
      case 'follow':
      case 'follow2':
        // The free hand beating the phrase, the head going with it: a beat behind the voice in the ears.
        return { tool: 'script', r: c.bd(-0.26, 1.04 + 0.05 * Math.sin(c.t * 4.2), 0.24), gr: 0.15, palms: 0.5, nod: 0.2 + 0.04 * Math.sin(c.t * 4.2), n, props };
      default:
        return { tool: 'script', r: c.bd(-0.14, 0.92 * c.H, 0.03), gr: 0.5, nod: 0.14, n, props };
    }
  },
};

// =============================================================================================
// 동시통역 부스 (interpretBooth, 2 × 1): a glass front looking out over the meeting room. A door at the front's right end (+x),
// the console along the glass; they sit facing out through it, their colleague to their right (-x). Facing out their left is +x.

export const BO = {
  seat: [0, 0.47, -0.18] as V,
  mate: [-0.62, 0.47, -0.18] as V,
  top: 0.74,
  console: [0.14, 0.77, 0.24] as V,
  pad: [-0.17, 0.745, 0.22] as V,
  cup: [-0.37, 0.8, 0.2] as V,
  glass: 0.47,
  hinge: 0.42,
  doorW: 0.54,
  out: [0.68, 0.85] as readonly [number, number],
  mid: [0.68, 0.08] as readonly [number, number],
  /** Beside the booth in front of it, for a word with the speaker. */
  brief: [0.1, 1.0] as readonly [number, number],
  speaker: [-0.62, 1.1] as readonly [number, number],
};
export const BOOTH_SWING = 1.4;
const boothHandle = (door: number): V => {
  const a = Math.min(door, 0.2) * BOOTH_SWING;
  return [BO.hinge + 0.46 * Math.cos(a), 1.02, BO.glass - 0.46 * Math.sin(a) + 0.04];
};
const consoleL = add(BO.console, 0, 0.03, 0);
const micKey = add(BO.console, -0.06, 0.03, -0.02);
const penRestB: V = add(BO.pad, -0.09, 0.02, -0.08);
const penOnB = (u: number, t: number): V => add(BO.pad, 0.04 - 0.08 * frac(u * 3), PEN_UP + 0.005 * Math.sin(t * 16), -0.03 + 0.03 * Math.floor(u * 3));
const boothAt = (k: string): St => (k === 'door' || k === 'leave' ? st(BO.out[0], BO.out[1]) : k === 'in' || k === 'up' ? st(BO.mid[0], BO.mid[1], PI / 2 + PI) : sat(BO.seat, 0));
const boothDoor = (k: string, u: number): number => (k === 'door' ? sm(u, 0.2, 0.9) : k === 'in' ? 1 - sm(u, 0.1, 0.9) : k === 'up' ? sm(u, 0.1, 0.9) : k === 'leave' ? 1 - sm(u, 0.2, 0.9) : 0);
const PRACTICE: Script = {
  seq: [['door', 1.2, 0.9], ['in', 0.8, 0.5], ['wear', 1.4], ['load', 1.6], ['listen', 3.6], ['on', 1.0], ['speak', 5.0], ['note', 2.8], ['speak2', 4.2], ['off', 1.0], ['up', 0.8, 0.5], ['leave', 1.0, 0.9]],
  at: boothAt,
  key(k, u, c) {
    const inside = k !== 'door' && k !== 'in' && k !== 'up' && k !== 'leave';
    const live = k === 'speak' || k === 'note' || k === 'speak2' ? 1 : 0;
    const n = { door: boothDoor(k, u), hs: !inside ? 0 : k === 'wear' ? sm(u, 0.5, 0.75) : k === 'off' ? 1 - sm(u, 0.4, 0.7) : 1, lit: live, source: k === 'listen' || live ? 1 : 0, voice: live, level: 0.5 + 0.5 * Math.abs(Math.sin(c.t * 5)), notes: 3 * c.p('note', 0.05, 0.95), said: 0.5 * c.p('speak') + 0.5 * c.p('speak2') };
    const props = { pen: k === 'note' ? penOnB(u, c.t) : penRestB, cup: BO.cup };
    switch (k) {
      case 'door':
        return { l: easy(c).l, gl: 0.3, r: boothHandle(n.door), gr: 0.7, palms: 0.4, nod: 0.08, n, props };
      case 'in':
      case 'up':
      case 'leave':
        return { ...easy(c), nod: 0.08, n, props };
      case 'wear':
        return { l: consoleL, gl: 0.25, r: c.bd(-0.14, 0.72 * (c.H / 1.6), 0.03), gr: 0.5, palms: 0.1, nod: 0.08, n, props };
      case 'load':
        return { l: add(BO.console, 0.08 * Math.sin(u * PI), 0.03, 0), gl: 0.2, r: add(BO.pad, 0, 0.04, 0.02), gr: 0.25, palms: 0.05, lean: 0.12, nod: 0.26, n, props };
      case 'listen':
        return { l: consoleL, gl: 0.3, r: add(BO.pad, 0.02, 0.04, 0.02), gr: 0.3, palms: 0.05, lean: 0.1, nod: 0.08 + 0.04 * Math.sin(c.t * 2), n, props };
      case 'on':
      case 'off':
        return { l: micKey, gl: 0.15, r: add(BO.pad, 0.02, 0.04, 0.02), gr: 0.3, palms: 0.05, tap: u > 0.2 && u < 0.5, lean: 0.12, nod: 0.2, n, props };
      case 'note':
        return { l: consoleL, gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.32, n, props };
      default:
        // Speaking low into the mic, the eyes through the glass on the speaker, the free hand shaping the sentence.
        return { l: consoleL, gl: 0.25, r: talkSit(c, -0.18), gr: 0.12, palms: 0.5, lean: 0.12, nod: 0.04 + 0.04 * Math.sin(c.t * 3.6), n, props };
    }
  },
};
const atMouthB = (c: Ctx): V => c.bd(-0.03, 0.58 * (c.H / 1.6), 0.12);
const URGENT: Script = {
  seq: [['door', 0.8, 0.6], ['in', 0.5, 0.4], ['wear', 0.9], ['note0', 1.8], ['on', 0.7], ['speak', 5.4], ['note', 2.8], ['sign', 1.8], ['speak2', 5.0], ['sip', 2.2], ['speak3', 3.4], ['off', 1.0], ['ok', 2.2], ['up', 0.8, 0.5], ['leave', 1.0, 0.9]],
  at: boothAt,
  key(k, u, c) {
    const inside = k !== 'door' && k !== 'in' && k !== 'up' && k !== 'leave';
    const live = k === 'speak' || k === 'note' || k === 'speak2' || k === 'speak3' || k === 'sign' ? 1 : 0;
    const n = { door: boothDoor(k, u), hs: !inside ? 0 : k === 'wear' ? sm(u, 0.4, 0.7) : k === 'ok' ? 0 : 1, lit: live, source: 1, voice: live, level: 0.5 + 0.5 * Math.abs(Math.sin(c.t * 6)), urgent: 1 - c.p('ok', 0, 0.4), mate: 1, mateNote: k === 'note0' ? 1 : 0, mateNods: k === 'sign' || k === 'ok' ? 1 : 0, mateWrites: k === 'speak' || k === 'speak2' ? 1 : 0, notes: 1 + 2 * c.p('note', 0.05, 0.95), said: (c.p('speak') + c.p('speak2') + c.p('speak3')) / 3, done: c.p('ok', 0.2, 0.5) };
    const mouth = atMouthB(c);
    const cupAt: V = k === 'sip' ? (u < 0.25 ? lerpV(BO.cup, mouth, sm(u, 0.02, 0.25)) : u > 0.75 ? lerpV(mouth, BO.cup, sm(u, 0.75, 0.98)) : mouth) : BO.cup;
    const props = { pen: k === 'note' ? penOnB(u, c.t) : penRestB, cup: cupAt };
    switch (k) {
      case 'door':
        return { l: easy(c).l, gl: 0.3, r: boothHandle(n.door), gr: 0.7, palms: 0.4, nod: 0.08, lean: 0.08, n, props };
      case 'in':
      case 'up':
      case 'leave':
        return { ...easy(c), nod: 0.08, n, props };
      case 'wear':
        return { l: consoleL, gl: 0.25, r: c.bd(-0.14, 0.72 * (c.H / 1.6), 0.03), gr: 0.5, nod: 0.08, n, props };
      case 'note0':
        // The colleague's note slid over: where the speaker has got to.
        return { l: consoleL, gl: 0.3, r: add(BO.pad, 0.02, 0.04, 0.02), gr: 0.15, palms: 0.05, lean: 0.14, nod: 0.3, n, props };
      case 'on':
      case 'off':
        return { l: micKey, gl: 0.15, r: add(BO.pad, 0.02, 0.04, 0.02), gr: 0.3, palms: 0.05, tap: u > 0.2 && u < 0.55, lean: 0.14, nod: 0.16, n, props };
      case 'note':
        return { l: consoleL, gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.3, n, props };
      case 'sign':
        // A raised hand to the colleague: a number, please, written big.
        return { l: consoleL, gl: 0.25, r: c.bd(-0.24, 0.52, 0.18), gr: 0.1, palms: 0.8, lean: 0.08, nod: 0.06, n, props };
      case 'sip':
        return { l: consoleL, gl: 0.25, tool: 'cup', lean: -0.02, nod: u > 0.25 && u < 0.75 ? -0.06 : 0.08, n, props };
      case 'ok':
        // It's over: back in the chair, a breath, a nod across.
        return { l: consoleL, gl: 0.3, r: c.bd(-0.1, 0.2, 0.26), gr: 0.25, palms: 0.5, lean: -0.05 + 0.03 * Math.sin(c.t * 1.4), nod: 0.04 + 0.08 * Math.sin(u * PI * 2), n, props };
      default:
        return { l: consoleL, gl: 0.25, r: talkSit(c, -0.18), gr: 0.12, palms: 0.5, lean: 0.14, nod: 0.05 + 0.05 * Math.sin(c.t * 4), n, props };
    }
  },
};
const BRIEF: Script = {
  seq: [['greet', 1.8], ['take', 1.4], ['read', 3.2], ['ask', 3.0], ['listen', 3.2], ['mark', 2.6], ['thanks', 1.8]],
  at: () => st(BO.brief[0], BO.brief[1], -PI / 2),
  key(k, u, c) {
    const hold = holdScript(c);
    const n = { speaker: 1, script: k === 'greet' ? 0 : 1, spTalks: k === 'listen' ? 1 : 0, spNods: k === 'ask' || k === 'thanks' ? 1 : 0, spBow: k === 'greet' || k === 'thanks' ? 1 : 0, hi: c.p('mark', 0.1, 0.8) };
    const props = { script: k === 'greet' ? null : hold };
    const r = (x: number) => add(hold, x, 0.05, 0.02);
    switch (k) {
      case 'greet':
      case 'thanks':
        return { l: easy(c).l, r: easy(c).r, gl: 0.3, gr: 0.3, lean: 0.14 * Math.sin(u * PI), nod: 0.2 * Math.sin(u * PI), ...(k === 'thanks' ? { tool: 'script' as const, l: undefined } : {}), n, props };
      case 'take':
        return { tool: 'script', r: easy(c).r, gr: 0.3, nod: 0.24, n, props };
      case 'read':
        return { tool: 'script', r: r(0.02 * Math.sin(c.t * 1.3)), gr: 0.12, palms: 0.1, nod: 0.3, n, props };
      case 'ask':
        return { tool: 'script', r: c.bd(-0.14, 1.12 + 0.03 * Math.sin(c.t * 3), 0.3), gr: 0.12, palms: 0.5, nod: 0.02 + 0.03 * Math.sin(c.t * 3), n, props };
      case 'listen':
        return { tool: 'script', r: easy(c).r, gr: 0.3, nod: 0.06 + 0.07 * Math.sin(c.t * 2.2), n, props };
      default:
        return { tool: 'script', r: r(0.04 * Math.sin(u * PI)), gr: 0.15, palms: 0.1, nod: 0.3, n, props };
    }
  },
};

// =============================================================================================
// 용어 게시판 (ipTermBoard, 2 × 1): a cork board of cards, source against target; a ledge with blank cards at its right.

export const TB = {
  face: -0.33,
  stand: 0.44,
  touch: 0.06,
  ledge: [0.52, 0.98, -0.2] as V,
};
/** Where the next card goes: a free place, a different one each round. */
export const termSlot = (i: number): V => {
  const k = wrap(i, 4);
  return [k % 2 ? 0.21 : -0.21, k < 2 ? 1.4 : 1.14, TB.face + 0.02];
};
const PIN: Script = {
  seq: [['read', 2.6], ['write', 3.2], ['carry', 0.8, 0.9], ['pin', 1.6], ['press', 0.9], ['step', 1.6, 0.9], ['nod', 1.4]],
  at: (k) => (k === 'read' || k === 'write' ? st(0.34, TB.stand) : k === 'step' || k === 'nod' ? st(-0.1, TB.stand + 0.1) : st(-0.1, TB.touch)),
  key(k, u, c) {
    const slot = add(termSlot(c.round), 0, 0, 0.012);
    const hold = c.bd(-0.2, 1.08, 0.3);
    const card: V = k === 'write' ? add(TB.ledge, -0.02, 0.012, 0.03) : k === 'carry' ? hold : k === 'pin' ? lerpV(hold, slot, sm(u, 0.1, 0.8)) : k === 'press' ? slot : TB.ledge;
    const n = { slot: wrap(c.round, 4), lines: 3 * c.p('write', 0.05, 0.9), blank: k === 'read' ? 1 : 0, placed: c.p('press', 0, 0.2), hiNew: c.p('press'), inHand: k === 'write' || k === 'carry' || k === 'pin' ? 1 : 0 };
    const pen: V = k === 'write' ? add(TB.ledge, -0.05 + 0.08 * frac(u * 3), PEN_UP + 0.004 * Math.sin(c.t * 16), 0.015 + 0.02 * Math.floor(u * 3)) : add(TB.ledge, 0.24, 0.015, 0);
    const props = { card: n.inHand > 0.5 ? card : null, pen };
    switch (k) {
      case 'read':
        return { ...easy(c), r: c.bd(-0.16, 1.28 + 0.05 * Math.sin(c.t * 1.8), 0.3), gr: 0.15, palms: 0.1, nod: -0.1, lean: 0.03, n, props };
      case 'write':
        return { l: add(TB.ledge, -0.2, 0.04, 0.03), gl: 0.1, palms: 0.05, tool: 'pen', nod: 0.34, lean: 0.1, n, props };
      case 'carry':
      case 'pin':
        return { l: easy(c).l, gl: 0.3, tool: 'card', nod: -0.1, n, props };
      case 'press':
        // Pressed home with the flat of the thumb.
        return { l: easy(c).l, gl: 0.3, r: add(slot, 0, 0, 0.04), gr: 0.1, palms: 0.1, tap: u > 0.2 && u < 0.6, nod: -0.1, n, props };
      default:
        return { ...easy(c), nod: k === 'nod' ? 0.1 * Math.sin(u * PI * 2) - 0.04 : -0.06, n, props };
    }
  },
};

// =============================================================================================
// 회의 탁자 (ipMeetingTable, 3 × 2): the interpreter sits at the far side facing the room, a speaker on their right, a guest across.

export const MT = {
  seat: [0.1, 0.47, -0.72] as V,
  speaker: [-0.82, 0.47, -0.72] as V,
  guest: [0.92, 0.47, 0.86] as V,
  top: 0.74,
  pad: [0.02, 0.745, -0.3] as V,
};
const penRestM: V = add(MT.pad, -0.13, 0.02, -0.02);
const penOnM = (u: number, t: number): V => add(MT.pad, 0.05 - 0.1 * frac(u * 4), PEN_UP + 0.005 * Math.sin(t * 15), -0.05 + 0.03 * Math.floor(u * 4));
const padEdge = add(MT.pad, 0.15, 0.03, 0.01);
const CONSECUTIVE: Script = {
  seq: [['ready', 1.4], ['hear', 5.0], ['raise', 1.0], ['speak', 4.2], ['flip', 1.0], ['hear2', 4.2], ['speak2', 3.8], ['rest', 1.6]],
  at: () => sat(MT.seat, 0),
  key(k, u, c) {
    const n = { aTalks: k === 'hear' ? 1 : 0, bTalks: k === 'hear2' ? 1 : 0, bNods: k === 'speak' ? 1 : 0, aNods: k === 'speak2' ? 1 : 0, marks: 5 * (k === 'hear' ? u : k === 'hear2' ? u : k === 'ready' ? 0 : 1), leaf: k === 'flip' ? u : 0, page: c.p('flip', 0.6, 0.8), reading: k === 'speak' || k === 'speak2' ? 1 : 0 };
    const pen: V = k === 'hear' || k === 'hear2' ? penOnM(u, c.t) : k === 'ready' || k === 'rest' ? penRestM : add(MT.pad, -0.1, PEN_UP + 0.02, 0.02);
    const props = { pen };
    switch (k) {
      case 'ready':
      case 'rest':
        return { l: padEdge, gl: 0.2, r: add(MT.pad, -0.15, 0.03, 0.0), gr: 0.3, palms: 0.05, lean: 0.08, nod: 0.12, n, props };
      case 'hear':
      case 'hear2':
        // The pen goes all the time; the head half up, to the one speaking.
        return { l: padEdge, gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.15, nod: 0.26 + 0.04 * Math.sin(c.t * 1.3), n, props };
      case 'flip':
        return { l: add(padEdge, -0.12 * sm(u, 0.1, 0.8), 0.04 * Math.sin(u * PI), 0), gl: 0.1, palms: 0.05, tool: 'pen', lean: 0.15, nod: 0.3, n, props };
      case 'raise':
        return { l: padEdge, gl: 0.2, tool: 'pen', lean: 0.08, nod: 0.08, n, props };
      default:
        // The notes glanced at, then the room: speaking, a hand shaping the sentence.
        return { l: talkSit(c, 0.22), gl: 0.12, palms: 0.5, tool: 'pen', lean: 0.08, nod: 0.05 + 0.1 * Math.abs(Math.sin(c.t * 0.8)), n, props };
    }
  },
};

// =============================================================================================
// 공증 카운터 (ipNotaryCounter, 2 × 1): placed facing back into the room, so the client is across it. Stamp and ink at the right, the original at the left.

export const NC = {
  stand: 0.52,
  x: 0.1,
  top: 0.92,
  doc: [0.14, 0.925, 0.2] as V,
  orig: [-0.26, 0.925, 0.2] as V,
  ink: [0.42, 0.945, 0.17] as V,
  stampHome: [0.42, 0.925, 0.0] as V,
  penHome: [0.32, 0.94, 0.2] as V,
  /** Where the client takes it, at the far edge. */
  away: [0.0, 0.925, -0.2] as V,
  client: [-0.55, -0.72] as readonly [number, number],
};
const stampAtHome = add(NC.stampHome, 0, STAMP_UP, 0);
const overDoc = (lift: number): V => add(NC.doc, 0.03, STAMP_UP + lift, 0.03);
const NOTARISE: Script = {
  seq: [['take', 1.6], ['compare', 3.6], ['ribbon', 2.2], ['ink', 1.4], ['carry', 0.8], ['down', 1.0], ['lift', 0.8], ['park', 0.8], ['sign', 2.6], ['give', 1.8], ['bow', 1.6]],
  at: () => st(NC.x, NC.stand),
  key(k, u, c) {
    const n = { client: 1, onCounter: k === 'take' ? sm(u, 0.1, 0.6) : 1, gone: k === 'give' ? sm(u, 0.3, 0.9) : k === 'bow' ? 1 : 0, ribbon: c.p('ribbon', 0.2, 0.8), sealed: c.p('down', 0.55, 0.7), signed: c.p('sign', 0.1, 0.9), clTalks: k === 'take' ? 1 : 0, clBow: k === 'bow' ? 1 : 0, clReach: k === 'give' ? 1 : 0, hiOrig: k === 'compare' ? 1 : 0, press: k === 'down' ? sm(u, 0.3, 0.6) * (1 - sm(u, 0.75, 1)) : 0 };
    const stamp: V = k === 'ink' ? lerpV(stampAtHome, add(NC.ink, 0, STAMP_UP + 0.012 * (1 - Math.abs(Math.sin(u * PI * 2))), 0), sm(u, 0.1, 0.55)) : k === 'carry' ? lerpV(add(NC.ink, 0, STAMP_UP + 0.04, 0), overDoc(0.06), sm(u, 0, 1)) : k === 'down' ? overDoc(0.06 * (1 - sm(u, 0.2, 0.6)) + 0.06 * sm(u, 0.75, 1)) : k === 'lift' ? overDoc(0.06 + 0.04 * u) : k === 'park' ? lerpV(overDoc(0.1), stampAtHome, sm(u, 0.05, 0.95)) : stampAtHome;
    const pen: V = k === 'sign' ? add(NC.doc, -0.02 + 0.07 * frac(u * 2), PEN_UP + 0.004 * Math.sin(c.t * 18), 0.08) : NC.penHome;
    const props = { stamp, pen };
    const left = add(NC.doc, -0.15, 0.03, 0.03);
    switch (k) {
      case 'take':
        return { l: left, gl: 0.1, r: add(NC.doc, 0.03, 0.03, -0.1 * (1 - sm(u, 0.2, 0.7))), gr: 0.15, palms: 0.05, nod: 0.22, lean: 0.1, n, props };
      case 'compare':
        // A finger on each, down the page: original against translation.
        return { l: add(NC.orig, 0.02, 0.03, -0.08 + 0.16 * u), gl: 0.12, r: add(NC.doc, 0.02, 0.03, -0.08 + 0.16 * u), gr: 0.12, palms: 0.05, nod: 0.34, lean: 0.14, n, props };
      case 'ribbon':
        return { l: add(NC.doc, -0.1, 0.03, -0.09), gl: 0.5, r: add(NC.doc, -0.02 + 0.05 * Math.sin(c.t * 3), 0.04, -0.11), gr: 0.7, palms: 0.05, nod: 0.34, lean: 0.14, n, props };
      case 'ink':
      case 'carry':
      case 'lift':
      case 'park':
        return { l: left, gl: 0.1, palms: 0.05, tool: 'stamp', nod: 0.28, lean: 0.12, n, props };
      case 'down':
        return { l: left, gl: 0.1, palms: 0.05, tool: 'stamp', nod: 0.34, lean: 0.14 + 0.05 * n.press, n, props };
      case 'sign':
        return { l: left, gl: 0.1, palms: 0.05, tool: 'pen', nod: 0.36, lean: 0.14, n, props };
      case 'give':
        return { l: left, gl: 0.3, r: add(lerpV(NC.doc, NC.away, 0.5 * sm(u, 0.1, 0.8)), 0, 0.03, 0.02), gr: 0.1, palms: 0.05, nod: 0.12, lean: 0.14, n, props };
      default:
        return { ...easy(c), lean: 0.22 * Math.sin(u * PI), nod: 0.2 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 연습 코너 (ipPracticeCorner, 2 × 1): a small desk with a sound panel behind it, a script on a stand, a recorder, phones, a small screen.

export const PC = {
  seat: [-0.22, 0.47, 0.62] as V,
  top: 0.74,
  rec: [0.02, 0.79, 0.22] as V,
  note: [0.14, 0.745, 0.2] as V,
  script: [-0.28, 0.745, 0.2] as V,
};
const penRestP: V = add(PC.note, 0.12, 0.02, -0.1);
const RECORD: Script = {
  seq: [['pick', 1.4], ['start', 0.9], ['read', 5.4], ['stop', 0.9], ['down', 1.0], ['wear', 1.2], ['play', 5.0], ['note', 3.2], ['off', 1.2]],
  at: () => sat(PC.seat),
  key(k, u, c) {
    const atMouth: V = c.bd(-0.08, 0.6 * (c.H / 1.6), 0.13);
    const rec: V = k === 'pick' ? lerpV(PC.rec, atMouth, sm(u, 0.1, 0.95)) : k === 'down' ? lerpV(atMouth, PC.rec, sm(u, 0.05, 0.95)) : k === 'start' || k === 'read' || k === 'stop' ? atMouth : PC.rec;
    const n = { recording: k === 'read' ? 1 : 0, playing: k === 'play' ? 1 : 0, took: c.p('read'), pos: k === 'play' ? u : k === 'note' || k === 'off' ? 1 : 0, level: k === 'read' || k === 'play' ? 0.4 + 0.6 * Math.abs(Math.sin(c.t * 5)) : 0, hs: k === 'wear' ? sm(u, 0.4, 0.7) : k === 'play' || k === 'note' ? 1 : k === 'off' ? 1 - sm(u, 0.3, 0.6) : 0, lines: 3 * c.p('note', 0.05, 0.95), follow: k === 'read' ? u : 0 };
    const pen: V = k === 'note' ? add(PC.note, -0.04 + 0.08 * frac(u * 3), PEN_UP + 0.005 * Math.sin(c.t * 16), -0.03 + 0.03 * Math.floor(u * 3)) : penRestP;
    const props = { rec, pen };
    const leftOnScript = add(PC.script, 0.03, 0.03, 0.09 - 0.14 * n.follow);
    switch (k) {
      case 'pick':
      case 'down':
        return { l: leftOnScript, gl: 0.15, palms: 0.05, tool: 'rec', nod: 0.2, lean: 0.08, n, props };
      case 'start':
      case 'stop':
        return { l: leftOnScript, gl: 0.15, palms: 0.05, tool: 'rec', tap: u > 0.2 && u < 0.6, nod: 0.2, lean: 0.05, n, props };
      case 'read':
        return { l: leftOnScript, gl: 0.15, palms: 0.05, tool: 'rec', nod: 0.24 + 0.03 * Math.sin(c.t * 3.8), lean: 0.08, n, props };
      case 'wear':
      case 'off':
        return { l: leftOnScript, gl: 0.15, palms: 0.05, r: c.bd(-0.14, 0.72 * (c.H / 1.6), 0.03), gr: 0.5, nod: 0.1, n, props };
      case 'play':
        // Hearing it back: an eye shut at a mistake, a small shake of the head.
        return { l: leftOnScript, gl: 0.15, r: c.bd(-0.1, 0.3, 0.3), gr: 0.25, palms: 0.05, lean: 0.06, nod: 0.14 + 0.06 * Math.sin(c.t * 1.7), n, props };
      default:
        return { l: leftOnScript, gl: 0.15, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.34, n, props };
    }
  },
};

const SCRIPTS: Record<IpMotion, Script> = {
  ipTranslate: TRANSLATE,
  ipProofread: PROOFREAD,
  ipGlossary: GLOSSARY,
  ipShadow: SHADOW,
  ipPractice: PRACTICE,
  ipUrgent: URGENT,
  ipBrief: BRIEF,
  ipPinTerm: PIN,
  ipConsecutive: CONSECUTIVE,
  ipNotarise: NOTARISE,
  ipRecord: RECORD,
};
