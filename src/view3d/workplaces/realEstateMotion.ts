import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 부동산 사무소 (2026-11-01, the workplace pipeline, at the user's request). Each motion is a round of
 * beats: where the dweller is, where the hands go, and what moves. The piece reads the same script by the same clock
 * (realEstate.ts), so the seal that comes down is the one that leaves the red mark, and the card pulled from the
 * board is the one that gets stamped 계약완료.
 *
 * - reDraft (중개사 책상): the notes read, the contract typed line by line, the page out of the printer, ticked.
 *   reSearch: conditions typed, listings scrolled, one rung about, a note stuck on the screen.
 *   reLearn: the study book, a finger down the columns of the register, lines highlighted, the page turned.
 *   reRights: two sheets side by side, 갑구 and 을구 followed, the mortgage circled in red.
 * - reBoard (매물 게시판): a let flat's card pulled, stamped 계약완료, the new card pinned in its place.
 *   reFeasible: a clipboard in hand, sums, and the bars of the sheet on the board drawn in.
 *   reMeeting: colleagues before the board, cards pointed at, turned to, one of them answers.
 * - reMap (동네 지도): a card read, along the map putting in pins, a string to the station.
 * - reKey (매물 열쇠함): the door open, a finger along the tags, the key off its hook, the log signed.
 * - reRegistry (등기부 조회 단말): the address typed, the copy printed and read, the mortgage flagged.
 * - reExplain (계약 상담 테이블): the contract across to the clients, a finger down the clauses, the page turned, one
 *   of them asks, answered with open hands. reSeal: the client signs, the seals to the ink, stamped each side, the
 *   copy handed over, up on the feet for the handshake.
 * - reModel (아파트 평면 모형): the roof lifted off, the rooms pointed at as each lights, the sun's lamp moved round.
 * - reTea (손님 차 코너): water on, cups filled, the tray carried to the guest's table and set down, a bow.
 * - reWindow (매물 안내 창): an old card out of its slot, the glass wiped, the new one in, a step back to look.
 * - reCar (회사 차): out with the folder, the back door held for the client, round to the front, the folder in.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x. All names and prices are made up.
 */
export type ReMotion = 'reDraft' | 'reSearch' | 'reLearn' | 'reRights' | 'reBoard' | 'reFeasible' | 'reMeeting' | 'reMap' | 'reKey' | 'reRegistry' | 'reExplain' | 'reSeal' | 'reModel' | 'reTea' | 'reWindow' | 'reCar';
export const RE_MOTIONS = new Set<string>(['reDraft', 'reSearch', 'reLearn', 'reRights', 'reBoard', 'reFeasible', 'reMeeting', 'reMap', 'reKey', 'reRegistry', 'reExplain', 'reSeal', 'reModel', 'reTea', 'reWindow', 'reCar']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const rePhase = (p: THREE.Vector3) => frac(p.x * 0.417 + p.z * 0.583);
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
const stand = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
const sat = (x: number, y: number, z: number, yaw = PI): St => ({ x, y, z, yaw, sit: true });
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
export interface ReNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
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
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function reNow(m: ReMotion, t: number, ph: number, H = 1.6): ReNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const here: St = e < 0.5 ? { ...A.st } : { ...B.st };
  here.x = mixN(A.st.x, B.st.x, e);
  here.y = mixN(A.st.y, B.st.y, e);
  here.z = mixN(A.st.z, B.st.z, e);
  here.yaw = angle(A.st.yaw, B.st.yaw, e);
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12 && !here.sit, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function rePose(m: ReMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = reNow(m, t, rePhase(par.getWorldPosition(new THREE.Vector3())), height);
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
const rest = (c: Ctx): Pick<Key, 'l' | 'r'> => ({ l: c.bd(0.17, 0.58 * c.H, 0.14), r: c.bd(-0.17, 0.58 * c.H, 0.14) });
const typing = (keys: V, u: number): Pick<Key, 'l' | 'r' | 'tap'> => ({ l: add(keys, -0.09, 0.02 + 0.008 * Math.sin(u * 60), 0), r: add(keys, 0.09, 0.02 + 0.008 * Math.sin(u * 53 + 1), 0), tap: true });

// =============================================================================================
// 중개사 책상 (realtorDesk, 1 × 1): the top at 0.74, its chair in front.

export const RD = {
  seatY: 0.47,
  seatZ: 0.56,
  top: 0.74,
  keys: [0.0, 0.76, 0.11] as V,
  mouse: [0.3, 0.77, 0.12] as V,
  paper: [-0.28, 0.75, 0.08] as V,
  sheetB: [0.22, 0.75, 0.08] as V,
  outfeed: [0.33, 0.8, -0.04] as V,
  stack: [-0.38, 0.77, -0.02] as V,
  phone: [-0.37, 0.81, -0.2] as V,
  screen: [0.0, 1.03, -0.28] as V,
};
const deskSt = () => sat(0, RD.seatY, RD.seatZ);
const pen = (at: V, c: Ctx, side = 0.03): Pick<Key, 'r' | 'gr'> & { pen: V } => ({ r: add(at, 0.02, 0.03, 0.04), gr: 0.9, pen: add(at, side * Math.sin(c.t * 7), 0.012, 0) });
const DRAFT: Script = {
  seq: [['read', 2.2], ['type', 4.2], ['print', 2.0], ['check', 3.2], ['file', 1.6]],
  at: deskSt,
  key(k, u, c): Key {
    const n = { lines: c.p('type'), page: c.p('print', 0.2, 0.3) - c.p('file', 0.85, 1), ticks: c.p('check') };
    const notes: V = [-0.32, 0.75, 0.06];
    if (k === 'type') return { ...typing(RD.keys, u), nod: 0.2, lean: 0.06, props: { notes }, n };
    if (k === 'print') {
      const p = lerpV(RD.outfeed, RD.paper, sm(u, 0.4, 0.92));
      return { r: add(p, 0.02, 0.03, 0.05), gr: 0.75, l: add(RD.keys, -0.15, 0.02, 0.02), nod: 0.25, lean: 0.14, props: { page: p, notes: null }, n };
    }
    if (k === 'check') {
      const at: V = add(RD.paper, 0.02, 0, 0.05 - 0.13 * frac(u * 3));
      const P = pen(at, c);
      return { r: P.r, gr: P.gr, l: add(RD.paper, -0.12, 0.02, 0.04), nod: 0.42, lean: 0.12, props: { page: RD.paper, pen: P.pen }, n };
    }
    if (k === 'file') {
      const p = lerpV(RD.paper, RD.stack, sm(u, 0.12, 0.85));
      return { l: add(p, 0.02, 0.03, 0.05), gl: 0.8, r: add(RD.keys, 0.1, 0.02, 0), nod: 0.25, props: { page: p }, n };
    }
    return { l: add(notes, 0.02, 0.02, 0.05 - 0.08 * u), r: add(RD.mouse, 0, 0.02, 0), gr: 0.4, nod: 0.38, lean: 0.08, props: { notes }, n };
  },
};
const SEARCH: Script = {
  seq: [['type', 2.6], ['scroll', 3.2], ['phone', 3.6], ['scroll2', 2.2], ['note', 2.4]],
  at: deskSt,
  key(k, u, c): Key {
    const n = { mode: k === 'type' ? 0 : 1, scroll: k === 'scroll' ? u : k === 'scroll2' ? 1 + u : k === 'type' ? 0 : 1, pick: c.p('phone', 0.05, 0.2), noted: c.p('note', 0.7, 0.9), phoneUp: k === 'phone' ? 1 : 0 };
    if (k === 'type') return { ...typing(RD.keys, u), nod: 0.15, n };
    if (k === 'phone') {
      const e = sm(u, 0.02, 0.2) - sm(u, 0.86, 1);
      const ph = lerpV(RD.phone, c.bd(0.14, 0.87 * c.H - 0.3, 0.05), e);
      return { l: ph, gl: 0.95, r: add(RD.mouse, 0, 0.02, 0), gr: 0.4, lean: 0.05 + 0.18 * (1 - e), nod: 0.08 + 0.08 * Math.sin(c.t * 2.2), props: { phone: ph }, n };
    }
    if (k === 'note') {
      const at = u < 0.6 ? lerpV(RD.paper, add(RD.paper, 0.02, 0, -0.04), u) : lerpV(add(RD.paper, 0.02, 0, -0.04), [0.19, 0.95, -0.25], sm(u, 0.6, 0.85));
      return { r: add(at, 0.03, 0.02, 0.05), gr: 0.8, l: add(RD.keys, -0.1, 0.02, 0.03), nod: u < 0.6 ? 0.35 : 0.05, lean: u < 0.6 ? 0.1 : 0.22, props: { sticky: u < 0.88 ? at : null }, n };
    }
    return { r: add(RD.mouse, 0.01 * Math.sin(c.t * 2), 0.02, 0.012 * Math.sin(c.t * 3)), gr: 0.4, l: add(RD.keys, -0.12, 0.02, 0.05), nod: 0.04, n };
  },
};
const LEARN: Script = {
  seq: [['read', 2.8], ['follow', 3.2], ['mark', 2.8], ['turn', 1.4], ['screen', 2.2]],
  at: deskSt,
  key(k, u, c): Key {
    const book: V = [-0.02, 0.76, 0.03];
    const n = { marked: c.p('mark'), turn: k === 'turn' ? u : 0, page: c.p('turn', 0.5, 0.55) };
    const props = { book };
    if (k === 'follow') return { r: add(book, 0.15, 0.02, 0.08 - 0.15 * u), gr: 0.5, l: add(book, -0.2, 0.02, 0.05), nod: 0.46, lean: 0.12, props, n };
    if (k === 'mark') {
      const hl = add(book, 0.06 + 0.17 * u, 0.012, -0.02);
      return { r: add(hl, 0.02, 0.03, 0.05), gr: 0.9, l: add(book, -0.2, 0.02, 0.05), nod: 0.46, lean: 0.12, props: { ...props, hl }, n };
    }
    if (k === 'turn') {
      const a = u * PI;
      return { r: add(book, 0.16 * Math.cos(a), 0.03 + 0.12 * Math.sin(a), 0.03), gr: 0.6, l: add(book, -0.2, 0.02, 0.05), nod: 0.38, props, n };
    }
    if (k === 'screen') return { r: add(RD.mouse, 0, 0.02, 0.01), gr: 0.4, l: add(book, -0.2, 0.02, 0.05), nod: 0.02, props, n };
    return { l: add(book, -0.2, 0.02, 0.05), r: add(book, 0.2, 0.02, 0.05), nod: 0.44, lean: 0.1, props, n };
  },
};
const RIGHTS: Script = {
  seq: [['lay', 1.6], ['gap', 3.0], ['eul', 3.0], ['circle', 1.8], ['note', 2.4]],
  at: deskSt,
  key(k, u, c): Key {
    const A: V = [-0.2, 0.752, 0.09];
    const B: V = [0.2, 0.752, 0.09];
    const n = { circled: c.p('circle', 0.3, 0.9), noted: c.p('note', 0.3, 0.8) };
    const props: Record<string, V | null> = { sheetA: A, sheetB: B };
    if (k === 'lay') {
      const e = sm(u, 0.1, 0.9);
      const a = lerpV(add(A, 0, 0.2, 0.08), A, e);
      const b = lerpV(add(B, 0, 0.2, 0.08), B, e);
      return { l: add(a, 0, 0.02, 0.04), r: add(b, 0, 0.02, 0.04), gl: 0.8, gr: 0.8, nod: 0.3, props: { sheetA: a, sheetB: b }, n };
    }
    if (k === 'gap') return { r: add(A, 0.1, 0.025, 0.07 - 0.14 * u), gr: 0.5, l: add(A, -0.1, 0.02, 0.09), nod: 0.48, lean: 0.13, props, n };
    if (k === 'eul') return { r: add(B, 0.0, 0.025, 0.07 - 0.14 * u), gr: 0.5, l: add(A, 0.06, 0.02, 0.09), nod: 0.48, lean: 0.13, props, n };
    const a = u * PI * 4;
    const at: V = k === 'circle' ? add(B, 0.03 * Math.cos(a), 0.012, -0.01 + 0.012 * Math.sin(a)) : add(B, -0.04 + 0.08 * u, 0.012, 0.06);
    return { r: add(at, 0.02, 0.03, 0.04), gr: 0.9, l: add(B, -0.12, 0.02, 0.08), nod: 0.48, lean: 0.14, props: { ...props, pen: at }, n };
  },
};

// =============================================================================================
// 매물 게시판 (listingBoard, 2 × 1): a cork board with a ledge, cards in rows.

export const LB = {
  z: -0.28,
  face: -0.285,
  stand: 0.2,
  cols: 4,
  rows: 3,
  x: (i: number) => -0.72 + i * 0.4,
  y: (j: number) => 1.72 - j * 0.34,
  ledge: 0.9,
  newStack: [0.74, 0.93, -0.2] as V,
  sold: [-0.32, 1.38, -0.285] as V,
  chart: [0.66, 1.38, -0.285] as V,
};
const BOARD: Script = {
  seq: [['look', 1.5], ['pull', 1.7], ['stamp', 1.9], ['bin', 1.1], ['fetch', 1.3], ['pin', 1.7], ['back', 1.3]],
  at: (k) => (k === 'fetch' ? stand(0.45, LB.stand) : k === 'back' ? stand(-0.2, 0.55) : stand(-0.25, LB.stand)),
  key(k, u, c): Key {
    const onLedge: V = [-0.46, LB.ledge + 0.03, -0.17];
    const n: Record<string, number> = { gone: c.p('pull', 0.35, 0.45), marked: c.p('stamp', 0.45, 0.55), fresh: c.p('pin', 0.72, 0.8) };
    if (k === 'pull') {
      const p = lerpV(LB.sold, c.bd(0, 1.15, 0.28), sm(u, 0.35, 0.95));
      return { r: add(p, 0.02, -0.01, 0.04), gr: 0.8, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.0, props: { card: u > 0.35 ? p : null }, n };
    }
    if (k === 'stamp') {
      const dn = u > 0.4 && u < 0.56 ? 0 : 0.1;
      const st: V = add(onLedge, 0, 0.012 + dn, 0);
      return { l: add(onLedge, -0.1, 0.01, 0.03), gl: 0.5, r: add(st, 0.02, 0.05, 0.05), gr: 0.95, nod: 0.46, lean: 0.14, props: { card: onLedge, stampIt: st }, n };
    }
    if (k === 'bin') {
      const p = lerpV(onLedge, add(onLedge, -0.34, 0, 0.02), sm(u, 0.1, 0.85));
      return { l: add(p, 0.01, 0.02, 0.03), gl: 0.8, r: c.bd(-0.17, 0.58 * c.H, 0.14), nod: 0.42, props: { card: u < 0.88 ? p : null, kept: u >= 0.88 ? add(onLedge, -0.34, 0, 0.02) : null }, n };
    }
    const kept = add(onLedge, -0.34, 0, 0.02);
    if (k === 'fetch') {
      const p = lerpV(LB.newStack, c.bd(0, 1.15, 0.25), sm(u, 0.3, 0.95));
      return { r: add(p, 0.02, 0, 0.04), gr: 0.8, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.3 * (1 - u), props: { fresh: p, kept }, n };
    }
    if (k === 'pin') {
      const p = lerpV(c.bd(0, 1.15, 0.25), LB.sold, sm(u, 0.05, 0.7));
      return { r: add(p, 0.03, 0.03, 0.04), gr: 0.75, l: add(p, -0.05, -0.02, 0.05), gl: 0.5, nod: 0.02, props: { fresh: u < 0.78 ? p : null, kept }, n };
    }
    if (k === 'look') return { ...rest(c), r: add(LB.sold, 0.03, -0.03, 0.09), nod: 0.0, gr: 0.3, n };
    return { ...rest(c), nod: -0.02, props: { kept }, n };
  },
};
const FEASIBLE: Script = {
  seq: [['read', 2.2], ['sum', 3.2], ['b0', 1.5], ['b1', 1.5], ['b2', 1.5], ['line', 1.6]],
  at: () => stand(0.42, LB.stand),
  key(k, u, c): Key {
    const clip = c.bd(0.14, 1.03, 0.26);
    const n: Record<string, number> = { bars: k.startsWith('b') ? +k[1] + u : k === 'line' ? 3 : 0, line: k === 'line' ? u : 0, sums: c.p('sum') };
    const props = { clip };
    if (k === 'read') return { l: add(clip, 0, -0.04, 0.03), gl: 0.9, r: add(LB.chart, -0.14, -0.14, 0.06), gr: 0.3, nod: 0.05, props, n };
    if (k === 'sum') {
      const at = add(clip, -0.03 + 0.06 * Math.sin(u * 22), 0.04 - 0.14 * u, 0.012);
      return { l: add(clip, 0, -0.04, 0.03), gl: 0.9, r: add(at, 0.03, 0.03, 0.05), gr: 0.9, nod: 0.4, props: { ...props, pen: at }, n };
    }
    const bi = k === 'line' ? 1 : +k[1];
    const at: V = k === 'line' ? add(LB.chart, -0.14 + 0.28 * u, -0.05 + 0.16 * u, 0.012) : add(LB.chart, -0.1 + bi * 0.1, -0.13 + 0.02 * (bi + 2) * (1 + 3 * u), 0.012);
    return { l: add(clip, 0, -0.04, 0.03), gl: 0.9, r: add(at, 0.02, -0.02, 0.05), gr: 0.9, nod: 0.02, props: { ...props, marker: at }, n };
  },
};
export const MEET = {
  a: [0.52, 1.2] as [number, number],
  b: [-1.02, 1.12] as [number, number],
};
const MEETING: Script = {
  seq: [['point', 2.8], ['turn', 2.6], ['point2', 2.4], ['ask', 2.6], ['answer', 2.4]],
  at: (k) => (k === 'point' || k === 'point2' ? stand(-0.42, 0.2, PI + 0.12) : stand(-0.3, 0.72, 0.2)),
  key(k, u, c): Key {
    const n: Record<string, number> = { asking: k === 'ask' ? 1 : 0, nodding: k === 'answer' ? 1 : 0 };
    if (k === 'point') return { r: [-0.2 + 0.28 * sm(u, 0.4, 0.6), 1.38, -0.2], gr: 0.2, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.02, n };
    if (k === 'point2') return { r: [0.2 + 0.2 * sm(u, 0.3, 0.7), 1.72 - 0.34 * sm(u, 0.3, 0.7), -0.2], gr: 0.2, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.02, n };
    if (k === 'ask') return { ...rest(c), nod: 0.1, n };
    const wave = Math.sin(c.t * 3) * 0.04;
    return { l: c.bd(0.25, 1.02 + wave, 0.26), r: c.bd(-0.25, 1.02 - wave, 0.26), palms: 1, nod: 0.08, n };
  },
};

// =============================================================================================
// 동네 지도 (reDistrictMap, 3 × 1): the map's face at z -0.3, a card ledge below.

export const MP = {
  face: -0.27,
  stand: 0.24,
  newPins: [[-0.95, 1.5], [-0.25, 1.22], [0.55, 1.62]] as Array<[number, number]>,
  station: [0.95, 1.3] as [number, number],
  ledge: [-0.4, 0.72, -0.2] as V,
  tin: [0.2, 0.72, -0.2] as V,
};
const MAP: Script = {
  seq: [['card', 2.2], ['p0', 2.0], ['p1', 2.0], ['p2', 2.0], ['string', 2.8], ['back', 1.4]],
  at: (k) => (k === 'card' ? stand(-0.3, MP.stand) : k === 'p0' ? stand(-0.95, MP.stand) : k === 'p1' ? stand(-0.25, MP.stand) : k === 'p2' ? stand(0.55, MP.stand) : k === 'string' ? stand(0.7, MP.stand) : stand(0, 0.62)),
  key(k, u, c): Key {
    const n: Record<string, number> = { pins: k.startsWith('p') ? +k[1] + sm(u, 0.55, 0.7) : k === 'card' ? 0 : 3, string: k === 'string' ? u : k === 'back' ? 1 : 0 };
    const card = c.bd(0.14, 1.04, 0.24);
    if (k === 'card') return { crouch: 0.42 * (1 - sm(u, 0.15, 0.55)), l: lerpV(MP.ledge, add(card, 0, -0.03, 0.03), sm(u, 0.1, 0.5)), gl: 0.85, r: c.bd(-0.17, 0.58 * c.H, 0.14), nod: 0.32, props: { card: lerpV(MP.ledge, card, sm(u, 0.1, 0.5)) }, n };
    if (k === 'back') return { ...rest(c), nod: -0.02, n };
    if (k === 'string') {
      const [ax, ay] = MP.newPins[2];
      const [bx, by] = MP.station;
      const at: V = [mixN(ax, bx, sm(u, 0.1, 0.9)), mixN(ay, by, sm(u, 0.1, 0.9)), MP.face + 0.05];
      return { r: add(at, 0.02, -0.02, 0.04), gr: 0.8, l: card, gl: 0.85, nod: 0.02, props: { card }, n };
    }
    const i = +k[1];
    const [x, y] = MP.newPins[i];
    const hand: V = [x, y, MP.face + 0.1 - 0.06 * sm(u, 0.4, 0.62)];
    return { r: add(hand, 0.02, -0.02, 0.03), gr: 0.85, l: add(card, 0, -0.03, 0.03), gl: 0.85, nod: y > 1.45 ? -0.05 : 0.08, props: { card, pin: u < 0.62 ? hand : null }, n };
  },
};

// =============================================================================================
// 매물 열쇠함 (reKeyCabinet, 1 × 1): a steel box on the wall, hooks on its back, a log on the shelf below.

export const KC = {
  face: -0.105,
  stand: 0.42,
  key: [0.12, 1.34, -0.095] as V,
  log: [0.0, 0.9, -0.16] as V,
  knob: [0.3, 1.32, 0.05] as V,
};
const KEYS: Script = {
  seq: [['open', 1.1], ['find', 2.0], ['take', 1.1], ['log', 2.6], ['shut', 1.0], ['pocket', 0.9]],
  at: () => stand(0, KC.stand),
  key(k, u, c): Key {
    const pocket = c.bd(-0.2, 0.78, 0.06);
    const n: Record<string, number> = { open: k === 'open' ? sm(u, 0.1, 0.9) : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : k === 'pocket' ? 0 : 1, gone: c.p('take', 0.4, 0.5) };
    if (k === 'open') return { r: add(KC.knob, 0.0 - 0.4 * sm(u, 0.2, 0.9), 0, 0.25 * sm(u, 0.2, 0.9)), gr: 0.8, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.02, n };
    if (k === 'find') {
      const row = u < 0.5 ? 1.5 : 1.34;
      return { r: [-0.25 + 0.72 * frac(u * 2) * (u < 0.5 ? 1 : 0.52), row, KC.face + 0.05], gr: 0.2, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.0, n };
    }
    if (k === 'take') {
      const e = sm(u, 0.4, 0.95);
      const p = lerpV(KC.key, c.bd(0.1, 1.05, 0.26), e);
      return { r: add(p, 0.01, 0.02, 0.03), gr: 0.9, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.04, props: { key: p }, n };
    }
    const held = c.bd(0.16, 1.0, 0.24);
    if (k === 'log') {
      const at = add(KC.log, -0.07 + 0.14 * frac(u * 3), 0.05, 0.01 + 0.03 * Math.floor(u * 3));
      return { l: held, gl: 0.9, r: add(at, 0.02, 0.03, 0.05), gr: 0.9, nod: 0.48, lean: 0.12, props: { key: held, pen: at }, n: { ...n, lines: u } };
    }
    if (k === 'shut') return { l: held, gl: 0.9, r: add(KC.knob, -0.4 + 0.4 * sm(u, 0.1, 0.9), 0, 0.25 - 0.25 * sm(u, 0.1, 0.9)), gr: 0.6, nod: 0.02, props: { key: held }, n: { ...n, lines: 1 } };
    const p = lerpV(held, pocket, sm(u, 0.1, 0.9));
    return { l: c.bd(0.17, 0.58 * c.H, 0.14), r: p, gr: 0.85, nod: 0.25, props: { key: u < 0.85 ? p : null }, n: { ...n, lines: 1 } };
  },
};

// =============================================================================================
// 등기부 조회 단말 (reRegistryTerminal, 1 × 1): a standing counter, a screen, a printer.

export const RG = {
  top: 0.94,
  stand: 0.62,
  keys: [-0.08, 0.965, 0.09] as V,
  outfeed: [0.3, 1.02, 0.04] as V,
  sheet: [-0.1, 0.955, 0.13] as V,
  screen: [-0.08, 1.24, -0.22] as V,
  stamp: [0.32, 0.975, 0.14] as V,
};
const REGISTRY: Script = {
  seq: [['type', 2.8], ['wait', 1.6], ['print', 1.7], ['read', 3.2], ['flag', 2.0], ['stamp', 1.7], ['file', 1.0]],
  at: () => stand(0, RG.stand),
  key(k, u, c): Key {
    const n: Record<string, number> = { stage: k === 'type' ? u : k === 'wait' ? 1 + u : 2, printing: k === 'print' ? 1 : 0, flagged: c.p('flag', 0.25, 0.75), checked: c.p('stamp', 0.4, 0.5) };
    if (k === 'type') return { ...typing(RG.keys, u), nod: 0.14, n };
    if (k === 'wait') return { ...rest(c), nod: 0.08, n };
    if (k === 'print') {
      const p = lerpV(RG.outfeed, RG.sheet, sm(u, 0.45, 0.95));
      return { r: add(p, 0.02, 0.03, 0.05), gr: 0.8, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.25, props: { sheet: u > 0.1 ? p : null }, n };
    }
    if (k === 'read') {
      const h = c.bd(0, 1.13, 0.3);
      return { l: add(h, 0.1, -0.02, 0.0), r: add(h, -0.1, -0.02, 0.0), gl: 0.85, gr: 0.85, nod: 0.26, props: { sheet: h }, n };
    }
    if (k === 'flag') {
      const a = u * PI * 4;
      const at: V = add(RG.sheet, 0.04 * Math.cos(a), 0.012, -0.01 + 0.014 * Math.sin(a));
      return { r: add(at, 0.02, 0.03, 0.04), gr: 0.9, l: add(RG.sheet, -0.12, 0.02, 0.06), nod: 0.48, lean: 0.14, props: { sheet: RG.sheet, pen: at }, n };
    }
    if (k === 'stamp') {
      const seal = u < 0.4 ? lerpV(RG.stamp, add(RG.sheet, 0.04, 0.1, 0.02), sm(u, 0, 0.3)) : u < 0.52 ? add(RG.sheet, 0.04, 0.02, 0.02) : lerpV(add(RG.sheet, 0.04, 0.1, 0.02), RG.stamp, sm(u, 0.56, 1));
      return { r: add(seal, 0.0, 0.08, 0.03), gr: 0.95, l: add(RG.sheet, -0.12, 0.02, 0.06), nod: 0.4, lean: 0.1, props: { sheet: RG.sheet, seal }, n };
    }
    const p = lerpV(RG.sheet, add(RG.sheet, -0.3, 0.015, -0.03), sm(u, 0.1, 0.9));
    return { l: add(p, 0.03, 0.03, 0.05), gl: 0.8, r: c.bd(-0.17, 0.58 * c.H, 0.14), nod: 0.3, props: { sheet: p }, n };
  },
};

// =============================================================================================
// 계약 상담 테이블 (reConsultTable, 3 × 2): the agent on the near side, the clients across.

export const CT = {
  seatY: 0.47,
  seatZ: 0.58,
  top: 0.74,
  clientZ: -0.62,
  mid: [0, 0.752, 0.12] as V,
  client: [-0.06, 0.752, -0.17] as V,
  pad: [0.34, 0.76, 0.14] as V,
  seal: [0.46, 0.76, 0.14] as V,
  cSeal: [-0.28, 0.76, -0.2] as V,
  pile: [-0.5, 0.76, 0.1] as V,
  shake: [0.28, 1.0, -0.12] as V,
};
const tableSt = () => sat(0, CT.seatY, CT.seatZ);
const EXPLAIN: Script = {
  seq: [['slide', 1.8], ['c1', 3.0], ['look', 1.6], ['turn', 1.3], ['c2', 3.0], ['ask', 2.4], ['answer', 2.6]],
  at: tableSt,
  key(k, u, c): Key {
    const n: Record<string, number> = { page: c.p('turn', 0.5, 0.55), turn: k === 'turn' ? u : 0, ask: k === 'ask' ? 1 : 0, marked: c.p('c2', 0.5, 0.9), listen: k === 'c1' || k === 'c2' ? 1 : 0, nod: k === 'answer' ? 1 : 0 };
    const sheet = CT.mid;
    if (k === 'slide') {
      const p = lerpV(add(CT.pile, 0, 0.0, 0), sheet, sm(u, 0.1, 0.9));
      return { l: add(p, 0.04, 0.02, 0.09), gl: 0.7, r: c.bd(-0.2, 0.84, 0.3), gr: 0.3, nod: 0.36, props: { sheet: p }, n };
    }
    if (k === 'c1' || k === 'c2') {
      return { r: add(sheet, -0.02 + 0.08 * Math.sin(u * 9), 0.025, -0.1 + 0.2 * u), gr: 0.5, l: add(sheet, -0.2, 0.02, 0.12), nod: 0.42, lean: 0.14, props: { sheet }, n };
    }
    if (k === 'look') return { r: add(sheet, 0.1, 0.025, 0.06), gr: 0.3, l: add(sheet, -0.2, 0.02, 0.12), nod: 0.02, props: { sheet }, n };
    if (k === 'turn') {
      const a = u * PI;
      return { r: add(sheet, 0.15 * Math.cos(a), 0.02 + 0.13 * Math.sin(a), 0.02), gr: 0.65, l: add(sheet, -0.2, 0.02, 0.12), nod: 0.36, props: { sheet }, n };
    }
    if (k === 'ask') return { r: add(sheet, 0.14, 0.02, 0.16), gr: 0.2, l: add(sheet, -0.2, 0.02, 0.14), nod: 0.04, props: { sheet }, n };
    const wave = Math.sin(c.t * 2.8) * 0.04;
    return { l: c.bd(0.22, 0.92 + wave, 0.34), r: c.bd(-0.22, 0.92 - wave, 0.34), palms: 1, nod: 0.02, props: { sheet }, n };
  },
};
const SEAL: Script = {
  seq: [['clientSign', 3.2], ['ink', 1.6], ['stamp', 1.8], ['clientStamp', 2.4], ['copy', 2.2], ['rise', 0.5, 0.9], ['shake', 2.6], ['sit', 0.4, 0.9]],
  at: (k) => (k === 'rise' || k === 'shake' ? stand(0.5, 0.38, PI - 0.3) : tableSt()),
  key(k, u, c): Key {
    const n: Record<string, number> = { signing: k === 'clientSign' ? 1 : 0, signed: c.p('clientSign', 0.1, 0.9), mine: c.p('stamp', 0.5, 0.56), theirs: c.p('clientStamp', 0.5, 0.56), cStamping: k === 'clientStamp' ? u : 0, copyGone: c.p('copy', 0.75, 0.85), up: k === 'shake' ? 1 : k === 'rise' ? u : 0, shake: k === 'shake' ? Math.sin(u * PI * 5) : 0, shaking: k === 'shake' ? 1 : 0 };
    const sheet = k === 'clientSign' ? CT.client : k === 'ink' ? lerpV(CT.client, CT.mid, sm(u, 0, 0.25)) : k === 'stamp' ? CT.mid : k === 'clientStamp' ? lerpV(CT.mid, CT.client, sm(u, 0, 0.2)) : CT.client;
    const props: Record<string, V | null> = { sheet };
    if (k === 'clientSign') return { r: add(CT.mid, 0.2, 0.02, 0.1), gr: 0.25, l: add(CT.mid, -0.2, 0.02, 0.1), nod: 0.2, props, n };
    if (k === 'ink') {
      const up = add(CT.pad, 0, 0.12, 0);
      const s = u < 0.3 ? lerpV(CT.seal, up, sm(u, 0, 0.3)) : u < 0.55 ? lerpV(up, add(CT.pad, 0, 0.015, 0), sm(u, 0.3, 0.5)) : lerpV(add(CT.pad, 0, 0.015, 0), add(CT.mid, 0.08, 0.14, 0.04), sm(u, 0.55, 1));
      return { r: add(s, 0, 0.08, 0.03), gr: 0.95, l: add(sheet, -0.18, 0.02, 0.14), nod: 0.38, lean: 0.08, props: { ...props, seal: s }, n };
    }
    if (k === 'stamp') {
      const up = add(sheet, 0.08, 0.14, 0.04);
      const dn = add(sheet, 0.08, 0.018, 0.04);
      const s = u < 0.5 ? lerpV(up, dn, sm(u, 0.2, 0.5)) : lerpV(dn, up, sm(u, 0.56, 0.8));
      const back = sm(u, 0.8, 1);
      const out = lerpV(s, CT.seal, back);
      return { r: add(out, 0, 0.08, 0.03), gr: 0.95, l: add(sheet, -0.18, 0.02, 0.14), nod: 0.42, lean: 0.12, props: { ...props, seal: out }, n };
    }
    if (k === 'clientStamp') return { r: add(CT.mid, 0.2, 0.02, 0.1), gr: 0.25, l: add(sheet, -0.08, 0.02, 0.12), gl: 0.5, nod: 0.2, props: { ...props, seal: CT.seal }, n };
    if (k === 'copy') {
      const p = lerpV(add(CT.mid, 0, 0.012, 0.03), add(CT.client, 0.24, 0.006, 0.0), sm(u, 0.2, 0.75));
      return { r: add(p, 0.08, 0.03, 0.08), gr: 0.75, l: add(CT.mid, -0.2, 0.02, 0.1), nod: 0.2, lean: 0.14, props: { ...props, copy: p, seal: CT.seal }, n };
    }
    if (k === 'shake' || k === 'rise') return { r: add(CT.shake, 0.02, 0.018 * n.shake, 0.02), gr: 0.75, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.14, lean: 0.14, props: { ...props, seal: CT.seal }, n };
    return { ...rest(c), nod: 0.15, props: { ...props, seal: CT.seal }, n };
  },
};

// =============================================================================================
// 아파트 평면 모형 (reFloorModel, 2 × 1): a flat cut open on a table, a roof to lift.

export const FM = {
  stand: 0.52,
  top: 0.8,
  hingeY: 0.952,
  hingeZ: -0.38,
  lidLen: 0.6,
  lidOpen: 1.05,
  rooms: [[-0.28, -0.2], [0.26, -0.22], [-0.3, 0.06], [0.24, 0.06]] as Array<[number, number]>,
  sunHigh: 1.24,
};
const MODEL: Script = {
  seq: [['lift', 2.0], ['r0', 1.8], ['r1', 1.8], ['r2', 1.8], ['r3', 1.8], ['sun', 3.4], ['roofOn', 1.8], ['talk', 1.6]],
  at: (k) => (k === 'lift' || k === 'roofOn' ? stand(-0.22, FM.stand) : k === 'talk' ? stand(0.12, FM.stand + 0.08, PI - 0.7) : stand(0.04, FM.stand)),
  key(k, u, c): Key {
    const open = k === 'lift' ? sm(u, 0.15, 0.85) : k === 'roofOn' ? 1 - sm(u, 0.15, 0.85) : k === 'talk' ? 0 : 1;
    const n: Record<string, number> = { room: k.startsWith('r') && k[1] !== 'o' ? +k[1] : -1, sun: k === 'sun' ? u : 0, sunOn: k === 'sun' ? 1 : 0, nod: k === 'talk' ? 1 : 0, lid: open };
    // The acrylic lid hinged along its back: both hands on the front edge as it comes up.
    const edge = (side: number): V => [side, FM.hingeY + FM.lidLen * Math.sin(open * FM.lidOpen), FM.hingeZ + FM.lidLen * Math.cos(open * FM.lidOpen)];
    if (k === 'lift' || k === 'roofOn') return { r: edge(0.3), gr: 0.8, l: edge(-0.3), gl: 0.8, nod: 0.2, lean: 0.14, n };
    if (k === 'talk') return { l: c.bd(0.24, 1.0 + 0.03 * Math.sin(c.t * 3), 0.28), r: c.bd(-0.24, 1.0 - 0.03 * Math.sin(c.t * 3), 0.28), palms: 1, nod: 0.05, n };
    if (k === 'sun') {
      const a = PI * (0.1 + 0.8 * u);
      const s: V = [-Math.cos(a) * 0.5, FM.sunHigh - 0.06 + 0.1 * Math.sin(a), 0.04];
      return { r: add(s, 0.01, -0.09, 0.08), gr: 0.9, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.26, props: { sun: s }, n };
    }
    const [x, z] = FM.rooms[+k[1]];
    const tip: V = [x, FM.top + 0.14, z];
    return { r: add(tip, 0.02, 0.06, 0.24), gr: 0.85, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.42, lean: 0.1, props: { stick: tip }, n };
  },
};

// =============================================================================================
// 손님 차 코너 (reTeaCorner, 3 × 1): the counter on its left two tiles, a low table and a guest on the right.

export const TC = {
  top: 0.88,
  stand: 0.6,
  kettle: [-0.78, 0.885, -0.08] as V,
  cups: [[-0.34, -0.02], [-0.16, -0.02]] as Array<[number, number]>,
  tray: [-0.25, 0.885, 0.02] as V,
  table: [0.86, 0.515, 0.24] as V,
  guest: [1.08, -0.2] as [number, number],
};
const TEA: Script = {
  seq: [['on', 2.0], ['boil', 1.5], ['pour', 2.8], ['tray', 1.2], ['carry', 0.7, 0.8], ['set', 1.5], ['bow', 1.5], ['back', 0.5, 0.8]],
  at: (k) => (k === 'carry' || k === 'set' || k === 'bow' ? stand(0.56, 0.68, 2.54) : k === 'pour' || k === 'tray' ? stand(-0.3, TC.stand) : k === 'back' ? stand(-0.3, TC.stand) : stand(-0.72, TC.stand)),
  key(k, u, c): Key {
    const home: V = c.bd(0, 1.0, 0.33);
    const n: Record<string, number> = { hot: k === 'boil' || k === 'on' ? (k === 'on' ? sm(u, 0.6, 0.9) : 1) : 0, fill: c.p('pour', 0.15, 0.9), served: c.p('set', 0.5, 0.6), tilt: 0, lidUp: k === 'on' ? 1 : 0, gratitude: k === 'bow' ? 1 : 0 };
    const props: Record<string, V | null> = { kettle: TC.kettle, tray: TC.tray };
    if (k === 'on') return { r: add(TC.kettle, 0.08, 0.14, 0.05), gr: 0.8, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.35, props, n };
    if (k === 'boil') return { ...rest(c), nod: 0.25, props, n };
    if (k === 'pour') {
      const ci = u < 0.5 ? 0 : 1;
      const [cx, cz] = TC.cups[ci];
      const p: V = [cx - 0.12, 1.08, cz + 0.02];
      return { l: add(p, 0.0, 0.04, 0.05), gl: 0.9, r: add(TC.tray, 0.24, 0.02, 0.06), gr: 0.2, nod: 0.42, lean: 0.08, props: { ...props, kettle: p }, n: { ...n, tilt: Math.sin(frac(u * 2) * PI), which: ci } };
    }
    if (k === 'tray') {
      const p = lerpV(TC.tray, home, sm(u, 0.15, 0.95));
      return { l: add(p, -0.17, 0.02, 0), r: add(p, 0.17, 0.02, 0), gl: 0.85, gr: 0.85, nod: 0.25, props: { kettle: TC.kettle, tray: p }, n };
    }
    if (k === 'carry') return { l: add(home, -0.17, 0.02, 0), r: add(home, 0.17, 0.02, 0), gl: 0.85, gr: 0.85, nod: 0.25, props: { kettle: TC.kettle, tray: home }, n };
    if (k === 'set') {
      const p = lerpV(home, TC.table, sm(u, 0.1, 0.6));
      return { l: add(p, -0.13, 0.02, 0.1), r: add(p, 0.15, 0.02, 0.04), gl: 0.85, gr: 0.85, nod: 0.5, lean: 0.2, crouch: 0.5 * sm(u, 0.1, 0.5), props: { kettle: TC.kettle, tray: p }, n };
    }
    if (k === 'bow') return { ...rest(c), nod: 0.2 + 0.32 * Math.sin(u * PI), lean: 0.3 * Math.sin(u * PI), props: { kettle: TC.kettle, tray: TC.table }, n };
    return { ...rest(c), nod: 0.1, props: { kettle: TC.kettle, tray: TC.table }, n };
  },
};

// =============================================================================================
// 매물 안내 창 (reListingWindow, 3 × 1): cards in slots, seen from their blank side indoors.

export const LW = {
  face: -0.22,
  stand: 0.24,
  slot: [-0.69, 0.85, -0.22] as V,
  stack: [0.9, 0.42, -0.2] as V,
};
const WINDOW: Script = {
  seq: [['pull', 1.7], ['wipe', 2.6], ['fetch', 1.5], ['slide', 1.8], ['back', 2.0]],
  at: (k) => (k === 'fetch' ? stand(0.62, LW.stand) : k === 'back' ? stand(-0.45, 0.72) : stand(-0.62, LW.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { gone: c.p('pull', 0.25, 0.4), fresh: c.p('slide', 0.7, 0.8), wipe: k === 'wipe' ? 1 : 0 };
    const hold = c.bd(0.12, 1.02, 0.24);
    if (k === 'pull') {
      const p = lerpV(LW.slot, hold, sm(u, 0.25, 0.9));
      return { r: add(p, 0.03, 0.02, 0.04), gr: 0.8, l: c.bd(0.17, 0.58 * c.H, 0.14), nod: 0.2, props: { old: p }, n };
    }
    if (k === 'wipe') {
      const a = u * PI * 6;
      const at: V = [-0.69 + 0.2 * Math.cos(a), 0.86 + 0.14 * Math.sin(a * 0.5), LW.face + 0.04];
      return { r: add(at, 0.02, -0.01, 0.03), gr: 0.75, l: hold, gl: 0.85, nod: 0.28, lean: 0.14, crouch: 0.22, props: { old: hold, cloth: at }, n };
    }
    if (k === 'fetch') {
      const p = lerpV(LW.stack, hold, sm(u, 0.35, 0.95));
      return { r: add(p, 0.03, 0.02, 0.04), gr: 0.8, l: c.bd(0.17, 0.58 * c.H, 0.14), crouch: 0.42 * (1 - sm(u, 0.35, 0.8)), nod: 0.42 - 0.2 * u, props: { fresh: p }, n };
    }
    if (k === 'slide') {
      const p = lerpV(add(LW.slot, 0, 0.14, 0.14), LW.slot, sm(u, 0.1, 0.78));
      return { r: add(p, 0.03, 0.03, 0.04), gr: 0.8, l: add(p, -0.08, 0.0, 0.05), gl: 0.5, nod: 0.22, props: { fresh: u < 0.8 ? p : null }, n };
    }
    return { ...rest(c), r: c.bd(-0.2, 0.92, 0.2), gr: 0.1, nod: 0.26, n };
  },
};

// =============================================================================================
// 회사 차 (realtorCar, 2 × 1): pointing +x, its doors on the +z side.

export const CR = {
  side: 0.47,
  rearHinge: 0.05,
  frontHinge: 0.62,
  rearHandle: [-0.45, 0.68, 0.5] as V,
  frontHandle: [0.14, 0.68, 0.5] as V,
  seat: [0.36, 0.66, 0.44] as V,
};
const CAR: Script = {
  seq: [['come', 1.4, 1.0], ['open', 1.4], ['client', 2.8], ['shut', 1.2, 0.9], ['openF', 1.2], ['folder', 1.8], ['shutF', 1.2], ['check', 2.2, 0.9]],
  at: (k) => (k === 'come' ? stand(-1.35, 1.05, PI / 2) : k === 'open' || k === 'client' || k === 'shut' ? stand(-0.68, 0.84, PI - 0.5) : k === 'check' ? stand(0.5, 1.08, PI - 0.3) : stand(0.02, 0.84, PI - 0.25)),
  key(k, u, c): Key {
    const folderH = c.bd(0.17, 0.98, 0.18);
    const n: Record<string, number> = {
      rear: k === 'open' ? sm(u, 0.25, 0.9) : k === 'client' ? 1 : k === 'shut' ? 1 - sm(u, 0.1, 0.8) : 0,
      front: k === 'openF' ? sm(u, 0.2, 0.9) : k === 'folder' ? 1 : k === 'shutF' ? 1 - sm(u, 0.1, 0.8) : 0,
      client: k === 'come' ? 0.15 + 0.6 * u : k === 'open' ? 0.75 : k === 'client' ? sm(u, 0, 0.7) : 0,
      seated: c.p('client', 0.75, 0.85),
      clientHere: k === 'come' || k === 'open' || (k === 'client' && u < 0.8) ? 1 : 0,
    };
    if (k === 'come') return { l: folderH, gl: 0.9, r: c.bd(-0.17, 0.58 * c.H, 0.14), nod: 0.04, props: { folder: folderH }, n };
    if (k === 'open' || k === 'shut') {
      const h = add(CR.rearHandle, 0.45 - 0.45 * Math.cos(n.rear * 1.05), 0, 0.45 * Math.sin(n.rear * 1.05));
      return { r: h, gr: 0.85, l: folderH, gl: 0.9, nod: 0.12, props: { folder: folderH }, n };
    }
    if (k === 'client') {
      const h = add(CR.rearHandle, 0.45 - 0.45 * Math.cos(1.05), 0, 0.45 * Math.sin(1.05));
      return { r: h, gr: 0.85, l: folderH, gl: 0.9, nod: 0.2, props: { folder: folderH }, n };
    }
    if (k === 'openF' || k === 'shutF') {
      const swing = n.front;
      const h = add(CR.frontHandle, 0.48 - 0.48 * Math.cos(swing * 1.05), 0, 0.48 * Math.sin(swing * 1.05));
      return { r: h, gr: 0.85, l: k === 'shutF' ? c.bd(0.17, 0.58 * c.H, 0.14) : folderH, gl: 0.9, nod: 0.1, props: { folder: k === 'shutF' ? null : folderH }, n };
    }
    if (k === 'folder') {
      const p = lerpV(folderH, CR.seat, sm(u, 0.15, 0.8));
      return { l: add(p, 0.02, 0.05, 0.05), gl: 0.9, r: add(CR.frontHandle, 0.48 - 0.48 * Math.cos(1.05), 0, 0.48 * Math.sin(1.05)), gr: 0.8, crouch: 0.32 * Math.sin(u * PI), lean: 0.2 * Math.sin(u * PI), nod: 0.35, props: { folder: u < 0.82 ? p : null }, n };
    }
    const ph = c.bd(0.14, 1.12, 0.2);
    return { l: ph, gl: 0.9, r: add(ph, -0.02 + 0.015 * Math.sin(c.t * 9), 0.01, 0.03), gr: 0.4, nod: 0.3, props: { mobile: ph }, n };
  },
};

const SCRIPTS: Record<ReMotion, Script> = {
  reDraft: DRAFT,
  reSearch: SEARCH,
  reLearn: LEARN,
  reRights: RIGHTS,
  reBoard: BOARD,
  reFeasible: FEASIBLE,
  reMeeting: MEETING,
  reMap: MAP,
  reKey: KEYS,
  reRegistry: REGISTRY,
  reExplain: EXPLAIN,
  reSeal: SEAL,
  reModel: MODEL,
  reTea: TEA,
  reWindow: WINDOW,
  reCar: CAR,
};
