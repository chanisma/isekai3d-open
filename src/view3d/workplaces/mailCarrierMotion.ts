import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 우체국 (2026-11-01, the workplace pipeline, at the user's request). Each motion is a round of beats: where
 * the dweller is, where the hands go, and what moves. The piece reads the same script by the same clock (mailCarrier.ts), so
 * the letter in the hand is the one that shows in its pigeonhole, and the parcel on the scale is the one whose weight the
 * screen settles on. Each new round is the next letter, the next customer. All names and addresses are made up.
 *
 * - 우편 분류대 (mailSorter): mpSort: a handful off the tray, the address read, stepped along to its route's pigeonhole and
 *   pushed in. mpRoute: the route book on the ledge followed with a finger, a column's head pointed at, a note.
 * - 우체국 창구 (postCounter): sat behind the glass. mpCounter: the next number called (딩동), the customer's parcel slid
 *   through and put on the scale, the screen typed, the label stuck on, the slip stamped (쾅), the receipt handed back and
 *   the parcel set in the bin. mpBank: a passbook put in the printer, read through with the customer.
 * - 우편 배달 오토바이 (mailScooter): mpLoadBike: the box's lid lifted, bundles in, a parcel strapped on the rack. The rounds
 *   themselves are off the lot: it rides away (the piece).
 * - 골목 우편함 (mpStreetBoxes): mpWalk: the walk-out round: the bag off its hook, along the wall posting into each box, a
 *   dog at the gate of the third, on down the lane to the far post and back.
 * - 우체통 (mpMailbox): mpEmpty: unlocked, the door swung down, letters scooped into the bag, locked, the card stamped.
 * - 소포 롤러 (mpRollerLine): mpRoll: a parcel comes down the rollers to the stop, its label scanned, the stop dropped and it's
 *   pushed on to the cage at the far end.
 * - 운반 카고 (mpCageTrolley): mpCage: a parcel off the stack into the cage, a shelf at a time, the tag written.
 * - 묶음대 (mpBundleTable): mpBundle: a stack squared on the table, a rubber band stretched round it, the 등기 slip signed, put
 *   in the route's tray.
 * - 사서함 (mpPoBoxes): mpBoxes: the master key, a little door opened, the letter in, shut.
 * - 기재대 (mpWritingDesk): mpStock: forms and envelopes taken from the box and tapped into their holders, a pen's chain seen to.
 * - 번호표 발권기 (mpTicketMachine): mpTicket: the side door opened, the paper roll changed, a test slip printed and torn off.
 * - 배달 구역 지도 (mpRouteMap): mpMap: a new block found on the map, its pin pushed in, the string led to it, the note written.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front).
 */
export type MpMotion = 'mpSort' | 'mpRoute' | 'mpCounter' | 'mpBank' | 'mpLoadBike' | 'mpWalk' | 'mpEmpty' | 'mpRoll' | 'mpCage' | 'mpBundle' | 'mpBoxes' | 'mpStock' | 'mpTicket' | 'mpMap';
export const MP_MOTIONS = new Set<string>(['mpSort', 'mpRoute', 'mpCounter', 'mpBank', 'mpLoadBike', 'mpWalk', 'mpEmpty', 'mpRoll', 'mpCage', 'mpBundle', 'mpBoxes', 'mpStock', 'mpTicket', 'mpMap']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const mpPhase = (p: THREE.Vector3) => frac(p.x * 0.293 + p.z * 0.641);
export const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
/** Round `n` of a list, whichever way time's going. */
export const wrap = (n: number, len: number) => ((Math.floor(n) % len) + len) % len;
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
  crouch?: number;
  tap?: boolean;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  /** Which round this is (counts up; below zero if time's before the start). */
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
export interface MpNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function mpNow(m: MpMotion, t: number, ph: number, H = 1.6): MpNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const last = b.i === s.seq.length - 1;
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, last ? b.n + 1 : b.n) : A;
  const e = b.e;
  const sitNow = e < 0.5 ? A.st.sit : B.st.sit;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: e < 0.5 ? A.st.y : B.st.y, z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: sitNow };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function mpPose(m: MpMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = mpNow(m, t, mpPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Hands down at the sides of a body stood. */
const rest = (c: Ctx): Pick<Key, 'l' | 'r'> => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1) });
/** Both hands on something's sides. */
const both = (p: V, half: number): Pick<Key, 'l' | 'r' | 'gl' | 'gr' | 'palms'> => ({ l: add(p, -half, 0, 0), r: add(p, half, 0, 0), gl: 0.65, gr: 0.65, palms: 0 });
/** Held to the front of the body. */
const heldAt = (c: Ctx, up = 0.66, ahead = 0.3): V => c.bd(0, up * c.H, ahead);

// =============================================================================================
// 우편 분류대 (mailSorter, 2 × 1): a frame of pigeonholes by route, six columns by five rows, its fronts at z = SC.face,
// a ledge in front with the tray of what's come in and the route book.

export const SC = {
  face: -0.04,
  ledgeY: 0.92,
  ledgeZ: 0.1,
  cols: [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75],
  rowY: [1.04, 1.2, 1.36, 1.52, 1.68],
  tray: [-0.62, 0.95, 0.05] as V,
  book: [0.56, 0.95, 0.04] as V,
  stand: 0.46,
};
/** Which pigeonhole each round's letter goes in: [column, row]. */
export const SC_DROPS: Array<[number, number]> = [[1, 2], [4, 1], [2, 3], [5, 0], [0, 1], [3, 2], [2, 0], [4, 3]];
export const holeAt = (c: number, r: number, inside = 0): V => [SC.cols[c], SC.rowY[r] + 0.06, SC.face - inside];
const SORT: Script = {
  seq: [['take', 0.9], ['read', 1.1], ['carry', 0.5], ['put', 0.9], ['tap', 0.4]],
  at(k, round) {
    const [c] = SC_DROPS[wrap(round, SC_DROPS.length)];
    if (k === 'take' || k === 'read') return st(-0.36, SC.stand);
    return st(SC.cols[c] * 0.75, SC.stand);
  },
  key(k, u, c) {
    const [cl, rw] = SC_DROPS[wrap(c.round, SC_DROPS.length)];
    const hole = holeAt(cl, rw);
    const handful = add(SC.tray, 0.02, 0.1, 0.1);
    const nn = { stuck: c.p('put', 0.7, 0.8) };
    switch (k) {
      case 'take': {
        const p = add(SC.tray, 0, 0.03 + 0.05 * sm(u, 0.5, 1), 0);
        return { l: handful, gl: 0.7, r: p, gr: 0.75, lean: 0.2, nod: 0.5, props: { letter: u > 0.5 ? p : null }, n: nn };
      }
      case 'read': {
        const p: V = c.bd(-0.06, 0.72 * c.H, 0.28);
        return { l: c.bd(0.14, 0.64 * c.H, 0.26), gl: 0.7, r: add(p, -0.04, -0.02, 0), gr: 0.75, nod: 0.42, props: { letter: p }, n: nn };
      }
      case 'carry': {
        const p: V = add(hole, 0, -0.04, 0.2);
        return { l: c.bd(0.14, 0.62 * c.H, 0.24), gl: 0.7, r: add(p, 0, -0.02, 0.02), gr: 0.75, nod: rw > 2 ? -0.1 : 0.2, props: { letter: p }, n: nn };
      }
      case 'put': {
        const p: V = lerpV(add(hole, 0, -0.03, 0.2), add(hole, 0, -0.03, -0.02), sm(u, 0.1, 0.7));
        return { l: c.bd(0.14, 0.62 * c.H, 0.24), gl: 0.7, r: add(p, 0, -0.02, 0.05), gr: 0.75, lean: 0.12, nod: rw > 2 ? -0.1 : 0.22, props: { letter: u < 0.75 ? p : null }, n: nn };
      }
      default:
        return { l: c.bd(0.14, 0.62 * c.H, 0.24), gl: 0.7, r: add(hole, 0, -0.06 + 0.01 * Math.sin(u * 14), 0.05), palms: 1, nod: 0.12, n: nn };
    }
  },
};
const ROUTE: Script = {
  seq: [['read', 2.6], ['point', 1.6], ['note', 2.2]],
  at: () => st(0.3, SC.stand),
  key(k, u, c) {
    switch (k) {
      case 'read':
        return { l: add(SC.book, -0.14, 0.03, 0), gl: 0.2, r: add(SC.book, 0.06, 0.03, 0.08 - 0.14 * frac(u * 2)), gr: 0.15, palms: 1, lean: 0.16, nod: 0.52 };
      case 'point': {
        const cl = wrap(c.round + 2, 6);
        return { l: add(SC.book, -0.14, 0.03, 0), gl: 0.2, r: [0.3 + (cl % 3 - 1) * 0.26, 1.72, SC.face + 0.12], gr: 0.2, palms: 0.8, nod: -0.16 };
      }
      default:
        return { l: add(SC.book, -0.14, 0.03, 0), gl: 0.2, r: add(SC.book, 0.08 + 0.04 * Math.sin(u * 19), 0.04, 0.02 * Math.sin(u * 41)), gr: 0.75, lean: 0.18, nod: 0.55, props: { pen: add(SC.book, 0.08 + 0.04 * Math.sin(u * 19), 0.05, 0.02 * Math.sin(u * 41)) } };
    }
  },
};

// =============================================================================================
// 우체국 창구 (postCounter, 2 × 1, placed with its front to the back of the counter): the clerk sat at +z behind a top
// that runs through under the glass (at z = PC.glassZ) to the customer at -z.

export const PC = {
  T: 0.82,
  glassZ: -0.14,
  seat: [0, 0.54, 0.62] as V,
  /** The customer's ledge, the middle of the gap, the scale's plate, the printer's mouth, the slip, the stamp and its pad, the bin behind. */
  ledge: [-0.08, 0.82, -0.36] as V,
  gap: [-0.08, 0.82, -0.06] as V,
  scale: [-0.34, 0.86, 0.1] as V,
  printer: [0.5, 0.88, 0.14] as V,
  slip: [0.08, 0.827, 0.14] as V,
  stamp: [0.26, 0.86, 0.17] as V,
  pad: [0.26, 0.835, 0.03] as V,
  bin: [-0.5, 0.62, 0.42] as V,
  bell: [-0.04, 0.84, 0.24] as V,
  keyboard: [0.3, 0.84, 0.2] as V,
  passbook: [-0.3, 0.84, 0.14] as V,
  brochure: [0.02, 0.83, 0.02] as V,
  customer: [-0.08, -0.82] as [number, number],
};
export const PARCEL: V = [0.28, 0.17, 0.2];
const SAT_PC = sat(PC.seat);
const COUNTER: Script = {
  seq: [['call', 1.1], ['take', 1.2], ['weigh', 1.7], ['label', 1.2], ['stamp', 1.1], ['give', 1.2], ['bin', 1.1]],
  at: () => SAT_PC,
  key(k, u, c) {
    const onLedge = add(PC.ledge, 0, PARCEL[1] / 2, 0);
    const onScale = add(PC.scale, 0, PARCEL[1] / 2, 0);
    const half = PARCEL[0] / 2 + 0.015;
    const n: Record<string, number> = { called: c.p('call', 0.1, 0.3), settle: c.p('weigh', 0.25, 0.6), labelled: c.p('label', 0.75, 0.9), stamped: c.p('stamp', 0.45, 0.55), receipt: c.p('give', 0.5, 0.75), gone: c.p('bin', 0.7, 0.8) };
    const lLight = add(PC.slip, -0.2, 0.02, 0);
    switch (k) {
      case 'call':
        return { l: add(PC.bell, 0, 0.03 - 0.02 * Math.max(0, Math.sin(u * 8)), 0), gl: 0.15, r: add(PC.keyboard, 0, 0.03, 0), gr: 0.2, palms: 1, nod: -0.02, lean: 0.06, props: { parcel: onLedge }, n: { ...n, custGive: 1 } };
      case 'take': {
        const p: V = u < 0.55 ? lerpV(onLedge, add(PC.gap, 0, PARCEL[1] / 2, 0), sm(u, 0, 0.55)) : lerpV(add(PC.gap, 0, PARCEL[1] / 2, 0), add(onScale, 0, 0.03, 0), sm(u, 0.55, 1));
        return { ...both(u < 0.3 ? add(PC.gap, 0, PARCEL[1] / 2, 0.02) : p, half), lean: 0.4 - 0.2 * sm(u, 0.55, 1), nod: 0.4, props: { parcel: p }, n: { ...n, custGive: u < 0.45 ? 1 : 0 } };
      }
      case 'weigh':
        return { l: add(onScale, -0.05, PARCEL[1] / 2 + 0.03, 0.02), gl: 0.1, r: add(PC.keyboard, 0.03 * Math.sin(u * 19), 0.03, 0.02 * Math.cos(u * 27)), gr: 0.15, palms: 1, tap: true, lean: 0.14, nod: 0.3, props: { parcel: onScale }, n };
      case 'label': {
        const out = add(PC.printer, -0.04, -0.01, 0.08);
        const on = add(onScale, 0.03, PARCEL[1] / 2 + 0.004, 0.02);
        const p: V = u < 0.45 ? out : lerpV(out, on, sm(u, 0.45, 0.85));
        return { l: add(onScale, -half, 0, 0), gl: 0.6, r: add(p, 0, 0.02, 0.02), gr: 0.75, lean: 0.14, nod: 0.42, props: { parcel: onScale, label: p }, n };
      }
      case 'stamp': {
        const down = sm(u, 0.25, 0.5) * (1 - sm(u, 0.6, 0.85));
        const p: V = u < 0.25 ? lerpV(PC.pad, add(PC.slip, 0, 0.2, 0), sm(u, 0, 0.25)) : lerpV(add(PC.slip, 0, 0.17, 0), add(PC.slip, 0, 0.035, 0), down);
        return { l: add(PC.slip, -0.09, 0.015, -0.02), gl: 0.15, r: add(p, 0, 0.05, 0.01), gr: 0.85, lean: 0.2, nod: 0.5, props: { parcel: onScale, stamp: p, slip: PC.slip }, n: { ...n, thud: u > 0.42 && u < 0.72 ? 1 : 0 } };
      }
      case 'give': {
        const p: V = lerpV(PC.slip, add(PC.gap, 0.1, 0.015, -0.08), sm(u, 0, 0.6));
        return { l: lLight, gl: 0.1, r: add(p, 0, 0.02, 0.05), gr: 0.4, lean: 0.34 * sm(u, 0, 0.5), nod: 0.2, props: { parcel: onScale, slip: u < 0.8 ? p : null }, n: { ...n, custTake: sm(u, 0.45, 0.7) } };
      }
      default: {
        const p: V = lerpV(onScale, PC.bin, sm(u, 0.1, 0.8));
        return { ...both(p, half), lean: 0.2, nod: 0.45, crouch: 0, props: { parcel: u < 0.8 ? p : null }, n: { ...n, custBye: 1 } };
      }
    }
  },
};
const BANK: Script = {
  seq: [['take', 1.1], ['print', 2.2], ['read', 2.6], ['give', 1.1]],
  at: () => SAT_PC,
  key(k, u, c) {
    const slide = add(PC.gap, 0.08, 0.015, 0);
    const n: Record<string, number> = { called: 1, printing: k === 'print' ? 1 : 0, custLook: k === 'read' ? 1 : 0, custTake: c.p('give', 0.5, 0.75) };
    switch (k) {
      case 'take': {
        const p: V = lerpV(add(PC.gap, 0.08, 0.015, 0.02), PC.passbook, sm(u, 0.2, 0.95));
        return { l: add(PC.slip, -0.2, 0.02, 0), gl: 0.15, r: add(p, 0, 0.02, 0.05), gr: 0.65, lean: 0.34 * (1 - sm(u, 0.5, 1)), nod: 0.3, props: { book: p }, n };
      }
      case 'print':
        return { l: add(PC.passbook, -0.06, 0.04, 0.04), gl: 0.3, r: add(PC.keyboard, 0.03 * Math.sin(u * 17), 0.03, 0.02 * Math.cos(u * 23)), gr: 0.15, palms: 1, tap: true, lean: 0.12, nod: 0.26, props: { book: add(PC.passbook, 0, 0.03 * sm(u, 0, 0.15), -0.05 * Math.sin(u * PI * 3)) }, n };
      case 'read': {
        const y = PC.brochure;
        return { l: add(y, -0.17, 0.02, 0.05), gl: 0.2, r: add(y, 0.02 * Math.sin(c.t * 2.5), 0.035, 0.03 * Math.cos(c.t * 1.7)), gr: 0.75, lean: 0.26, nod: 0.46, props: { book: add(y, 0.14, 0.012, 0), pen: add(y, 0.02 * Math.sin(c.t * 2.5), 0.05, 0.03 * Math.cos(c.t * 1.7)) }, n };
      }
      default: {
        const p: V = lerpV(add(PC.brochure, 0.14, 0.012, 0), add(slide, 0, 0, 0.04), sm(u, 0, 0.7));
        return { l: add(PC.slip, -0.2, 0.02, 0), gl: 0.15, r: add(p, 0, 0.02, 0.05), gr: 0.55, lean: 0.34 * sm(u, 0, 0.5), nod: 0.25, props: { book: u < 0.85 ? p : null }, n };
      }
    }
  },
};

// =============================================================================================
// 우편 배달 오토바이 (mailScooter, 2 × 1): it runs along x, nose to +x; the box on the rack at the back, the crate on the floor
// beside it (only when loading).

export const BK = {
  stand: [-0.42, 0.6] as [number, number],
  box: [-0.62, 1.0, 0] as V,
  mouth: [-0.62, 1.24, 0.02] as V,
  rack: [-0.22, 0.86, 0] as V,
  crate: [-0.05, 0.08, 0.78] as V,
  plate: [0.92, 0.5, 0] as V,
};
const LOADBIKE: Script = {
  seq: [['open', 0.9], ['pick', 0.9], ['in', 1.0], ['pick2', 0.9], ['in2', 1.0], ['close', 0.8], ['strap', 1.6], ['check', 1.2]],
  at(k) {
    return k === 'strap' ? st(-0.2, 0.62) : k === 'check' ? st(0.3, 0.62) : st(BK.stand[0], BK.stand[1]);
  },
  key(k, u, c) {
    const n: Record<string, number> = { lid: Math.min(c.p('open', 0.1, 0.8), 1 - c.p('close', 0.1, 0.8)), filled: c.p('in', 0.7, 0.8) + c.p('in2', 0.7, 0.8), strapped: c.p('strap', 0.7, 0.9) };
    const held = (p: V): Key => ({ ...both(p, 0.1), props: { bundle: p }, n });
    const inBox = add(BK.mouth, 0, -0.1, 0);
    const lift = add(BK.crate, -0.2, 0.3, 0);
    switch (k) {
      case 'open':
        return { l: c.bd(0.2, 0.55 * c.H, 0.1), r: add(BK.mouth, 0.02, 0.12 + 0.3 * sm(u, 0.1, 0.8), 0.14 - 0.12 * sm(u, 0.1, 0.8)), gr: 0.7, lean: 0.08, nod: 0.08, n };
      case 'pick':
      case 'pick2': {
        const p: V = lerpV(c.bd(0, 0.72 * c.H, 0.25), lift, sm(u, 0, 0.7));
        return { ...held(p), crouch: 0.55 * sm(u, 0, 0.7), lean: 0.34, nod: 0.5 };
      }
      case 'in':
      case 'in2': {
        const p: V = u < 0.5 ? lerpV(lift, add(BK.mouth, 0, 0.1, 0.1), sm(u, 0, 0.5)) : lerpV(add(BK.mouth, 0, 0.1, 0.1), inBox, sm(u, 0.5, 0.95));
        return { ...held(p), crouch: 0.55 * (1 - sm(u, 0, 0.4)), lean: 0.22, nod: 0.3 };
      }
      case 'close':
        return { l: c.bd(0.2, 0.55 * c.H, 0.1), r: add(BK.mouth, 0.02, 0.42 - 0.3 * sm(u, 0.1, 0.8), 0.02 + 0.12 * sm(u, 0.1, 0.8)), gr: 0.7, palms: 1.2, lean: 0.08, n };
      case 'strap': {
        const y = BK.rack[1] + 0.2;
        return { l: add(BK.rack, -0.14, 0.15, 0.2), gl: 0.7, r: add(BK.rack, 0.14 * Math.cos(u * PI), y - BK.rack[1] + 0.08 * Math.sin(u * PI), 0.24), gr: 0.8, lean: 0.25, nod: 0.5, n };
      }
      default:
        return { ...rest(c), r: add(BK.plate, -0.6, 0.45, 0.3), gr: 0.2, palms: 0.8, nod: 0.2, n };
    }
  },
};

// =============================================================================================
// 골목 우편함 (mpStreetBoxes, 2 × 1): a low wall along the back of its tiles with four house boxes on it, the bag on its
// hook at the left end; down the lane to the right (+x) a post with one more box.

export const SB = {
  boxes: [-0.72, -0.24, 0.24, 0.72],
  y: 1.02,
  z: 0.02,
  hook: [-1.04, 1.1, 0.06] as V,
  far: [3.2, 1.05, 0.02] as V,
  dog: [0.24, 0.0, 0.34] as V,
  stand: 0.62,
};
const postBeat = (c: Ctx, u: number, x: number, y: number, z: number, nod: number, n: Record<string, number>, p: Record<string, V>): Key => {
  const flap = sm(u, 0.1, 0.4) * (1 - sm(u, 0.8, 1));
  const q: V = lerpV([x, y + 0.02, z + 0.2], [x, y + 0.02, z + 0.02], sm(u, 0.25, 0.7));
  return { l: c.bd(0.22, 0.58 * c.H, 0.14), gl: 0.75, r: add(q, 0, -0.015, 0.04), gr: 0.75, lean: 0.12, nod, props: { ...p, letter: u < 0.72 ? q : null }, n: { ...n, flap } };
};
const WALK: Script = {
  seq: [
    ['bag', 1.1], ['b0', 1.0], ['b1', 1.0], ['b2', 1.1], ['dog', 1.2], ['b3', 1.0, 1.0],
    ['out', 0.1, 0.9], ['far', 1.1, 0.8], ['back', 0.1, 2.0], ['hang', 0.9],
  ],
  at(k) {
    const z = SB.stand;
    switch (k) {
      case 'bag':
      case 'hang':
        return st(SB.boxes[0] - 0.12, z);
      case 'b0':
      case 'b1':
      case 'b2':
      case 'b3':
        return st(SB.boxes[+k[1]], z);
      case 'dog':
        return st(SB.boxes[2] - 0.22, z + 0.14);
      case 'out':
      case 'back':
        return { x: 2.0, y: 0, z: 0.72, yaw: k === 'out' ? PI / 2 : -PI / 2 };
      default:
        return st(SB.far[0], 0.62);
    }
  },
  key(k, u, c) {
    const bag = c.bd(0.26, 0.5 * c.H, -0.02);
    const n: Record<string, number> = {};
    for (let i = 0; i < 4; i++) n[`in${i}`] = c.p(`b${i}`, 0.6, 0.7);
    n.far = c.p('far', 0.6, 0.7);
    switch (k) {
      case 'bag':
        return { l: add(SB.hook, 0, -0.04, 0.02), gl: 0.8, r: c.bd(-0.2, 0.55 * c.H, 0.1), lean: 0.1, nod: 0.05, props: { bag: u < 0.5 ? null : bag }, n };
      case 'b0':
      case 'b1':
      case 'b2':
      case 'b3':
        return postBeat(c, u, SB.boxes[+k[1]], SB.y, SB.z, 0.2, n, { bag });
      case 'dog':
        return { l: c.bd(0.22, 0.58 * c.H, 0.14), gl: 0.75, r: c.bd(-0.28, 1.02 * c.H, 0.22), palms: 1, gr: 0.05, lean: -0.05, nod: 0.2, props: { bag }, n: { ...n, bark: 1 } };
      case 'out':
      case 'back':
        return { l: c.bd(0.22, 0.56 * c.H, 0.1), gl: 0.75, r: c.bd(-0.2, 0.54 * c.H, 0.04), lean: 0.06, nod: 0.08, props: { bag }, n };
      case 'far':
        return postBeat(c, u, SB.far[0], SB.far[1], SB.far[2], 0.2, n, { bag });
      default:
        return { l: add(SB.hook, 0, -0.04, 0.02), gl: 0.8, r: c.bd(-0.2, 0.55 * c.H, 0.1), lean: 0.1, props: { bag: u > 0.5 ? null : bag }, n };
    }
  },
};

// =============================================================================================
// 우체통 (mpMailbox, 1 × 1): the door low at its front, hung at the bottom; the letters on its floor.

export const MB = {
  keyhole: [0.1, 0.72, 0.22] as V,
  door: { y0: 0.2, y1: 0.78, z: 0.21 },
  heap: [0, 0.3, 0.1] as V,
  card: [-0.04, 0.96, 0.23] as V,
  bag: [-0.24, 0.26, 0.56] as V,
};
const EMPTY: Script = {
  seq: [['key', 1.1], ['open', 0.8], ['scoop', 1.3], ['scoop2', 1.3], ['shut', 0.8], ['card', 1.4]],
  at: () => st(0.08, 0.62),
  key(k, u, c) {
    const n: Record<string, number> = { door: Math.min(c.p('open', 0.1, 0.9), 1 - c.p('shut', 0.1, 0.9)), scooped: (c.p('scoop', 0.6, 0.8) + c.p('scoop2', 0.6, 0.8)) / 2, signed: c.p('card', 0.5, 0.8) };
    const idle = c.bd(0.22, 0.56 * c.H, 0.1);
    switch (k) {
      case 'key':
        return { l: idle, r: add(MB.keyhole, 0.01 * Math.sin(u * 8), 0.005, 0.05), gr: 0.75, lean: 0.12, nod: 0.25, crouch: 0.2, n };
      case 'open': {
        const a = sm(u, 0.1, 0.9);
        return { l: idle, r: [0, MB.door.y1 - 0.3 * a, MB.door.z + 0.04 + 0.4 * a], gr: 0.7, lean: 0.14, nod: 0.3, crouch: 0.35 * a, n };
      }
      case 'scoop':
      case 'scoop2': {
        const p: V = lerpV(add(MB.heap, 0, 0.05, 0.08), MB.bag, sm(u, 0.35, 0.95));
        return { l: add(MB.bag, 0.0, 0.14, 0.02), gl: 0.7, r: add(p, 0, 0.02, 0.05), gr: 0.75, lean: 0.34, nod: 0.5, crouch: 0.75, props: { handful: u < 0.9 ? p : null }, n };
      }
      case 'shut': {
        const a = 1 - sm(u, 0.1, 0.9);
        return { l: idle, r: [0, MB.door.y1 - 0.3 * a, MB.door.z + 0.04 + 0.4 * a], gr: 0.2, palms: 1.2, lean: 0.14, nod: 0.3, crouch: 0.35 * a, n };
      }
      default:
        return { l: add(MB.card, -0.11, -0.03, 0.03), gl: 0.3, r: add(MB.card, 0.03 + 0.04 * Math.sin(u * 15), 0.01, 0.03), gr: 0.75, lean: 0.1, nod: 0.14, props: { pen: add(MB.card, 0.03 + 0.04 * Math.sin(u * 15), 0.02, 0.02) }, n };
    }
  },
};

// =============================================================================================
// 소포 롤러 (mpRollerLine, 3 × 1): rollers along x, falling gently to +x, the infeed at -x, a stop at the middle, a bin at +x.

export const RL = {
  y0: 0.84,
  y1: 0.72,
  x0: -1.4,
  x1: 1.15,
  stopX: 0.0,
  stand: [-0.02, 0.62] as [number, number],
  scanner: [0.46, 0.92, 0.28] as V,
};
export const rollerY = (x: number) => RL.y0 + ((x - RL.x0) / (RL.x1 - RL.x0)) * (RL.y1 - RL.y0);
export const ROLL_BOX: V = [0.38, 0.22, 0.34];
const ROLL: Script = {
  seq: [['come', 1.5], ['read', 1.2], ['scan', 1.3], ['push', 1.1], ['log', 1.0]],
  at: () => st(RL.stand[0], RL.stand[1]),
  key(k, u, c) {
    const at = (x: number): V => [x, rollerY(x) + ROLL_BOX[1] / 2 + 0.02, 0];
    const rest0 = at(RL.stopX - ROLL_BOX[0] / 2 - 0.02);
    const half = ROLL_BOX[0] / 2 + 0.02;
    const n: Record<string, number> = { stop: c.p('scan', 0.8, 1) > 0 ? 0 : 1, beep: k === 'scan' && u > 0.4 && u < 0.7 ? 1 : 0, spin: k === 'come' || k === 'push' ? 1 : 0 };
    switch (k) {
      case 'come': {
        const p = at(RL.x0 + (rest0[0] - RL.x0) * sm(u, 0, 1));
        return { ...rest(c), l: add(RL.scanner, -0.34, 0.05, 0.02), gl: 0.2, palms: 1, nod: 0.3, props: { box: p }, n };
      }
      case 'read':
        return { l: add(rest0, -half + 0.03, 0.04, 0.1), gl: 0.6, r: add(rest0, 0.05, ROLL_BOX[1] / 2 + 0.03, 0.08), gr: 0.15, palms: 1, lean: 0.24, nod: 0.56, props: { box: rest0 }, n };
      case 'scan': {
        const g: V = lerpV(RL.scanner, add(rest0, 0.04, 0.32, 0.12), sm(u, 0, 0.4));
        return { l: add(rest0, -half + 0.03, 0.04, 0.1), gl: 0.6, r: add(g, 0, -0.02, 0.03), gr: 0.85, lean: 0.2, nod: 0.5, props: { box: rest0, gun: g }, n };
      }
      case 'push': {
        const x = mixN(rest0[0], RL.x1 + 0.05, sm(u, 0.05, 0.95));
        const p = at(x);
        return { l: add(rest0, -half + 0.08 + 0.3 * sm(u, 0, 0.35), 0.03, 0.08), gl: 0.15, r: add(RL.scanner, 0, 0.03, 0), gr: 0.4, palms: 1.3, lean: 0.24, nod: 0.45, props: { box: x < RL.x1 ? p : null }, n };
      }
      default:
        return { l: c.bd(0.22, 0.58 * c.H, 0.14), r: add(RL.scanner, 0, 0.02, 0.02), gr: 0.2, palms: 1, nod: 0.25, tap: true, n };
    }
  },
};

// =============================================================================================
// 운반 카고 (mpCageTrolley, 1 × 1): a wire roll cage open at its front, three shelves; the stack to be loaded at the left.

export const CG = {
  shelves: [0.2, 0.68, 1.16],
  stack: [-0.6, 0.14, 0.52] as V,
  tag: [0.25, 1.32, 0.34] as V,
  stand: [-0.1, 0.58] as [number, number],
};
export const CAGE_BOX: V = [0.26, 0.2, 0.26];
export const cageSlot = (i: number): V => {
  const lv = Math.floor(wrap(i, 6) / 2);
  const side = wrap(i, 6) % 2 === 0 ? -0.15 : 0.16;
  return [side, CG.shelves[lv] + CAGE_BOX[1] / 2 + 0.01, -0.02];
};
const CAGE: Script = {
  seq: [['pick', 1.1], ['carry', 0.6], ['put', 1.0], ['tag', 1.3]],
  at: () => st(CG.stand[0], CG.stand[1]),
  key(k, u, c) {
    const slot = cageSlot(c.round);
    const half = CAGE_BOX[0] / 2 + 0.015;
    const n: Record<string, number> = { placed: c.p('put', 0.75, 0.85) };
    const chest = heldAt(c, 0.6, 0.28);
    switch (k) {
      case 'pick': {
        const p: V = lerpV(add(CG.stack, 0, 0.1, 0), chest, sm(u, 0.4, 1));
        return { ...both(p, half), crouch: 0.75 * (1 - sm(u, 0.35, 0.9)), lean: 0.34 * (1 - sm(u, 0.4, 1)), nod: 0.5, props: { box: p }, n };
      }
      case 'carry': {
        const p: V = lerpV(chest, add(slot, 0, 0.03, 0.42), sm(u, 0, 1));
        return { ...both(p, half), lean: 0.1, nod: 0.3, crouch: slot[1] < 0.4 ? 0.5 * u : 0, props: { box: p }, n };
      }
      case 'put': {
        const p: V = lerpV(add(slot, 0, 0.03, 0.42), slot, sm(u, 0.05, 0.75));
        return { ...both(p, half), lean: 0.22, nod: slot[1] > 1.1 ? 0 : 0.35, crouch: slot[1] < 0.4 ? 0.5 : 0, props: { box: u < 0.8 ? p : null }, n };
      }
      default:
        return { l: add(CG.tag, -0.08, -0.03, 0.04), gl: 0.3, r: add(CG.tag, 0.02 + 0.04 * Math.sin(u * 15), 0.0, 0.04), gr: 0.75, nod: -0.02, lean: 0.06, props: { pen: add(CG.tag, 0.02 + 0.04 * Math.sin(u * 15), 0.01, 0.03) }, n };
    }
  },
};

// =============================================================================================
// 묶음대 (mpBundleTable, 2 × 1): a low table; loose letters at the left, the band tin, the register book at the right, the route's
// tray at the far right.

export const BT = {
  T: 0.76,
  loose: [-0.42, 0.78, 0.14] as V,
  work: [-0.04, 0.78, 0.18] as V,
  tin: [0.1, 0.8, -0.14] as V,
  book: [0.3, 0.775, 0.2] as V,
  tray: [0.74, 0.82, 0.1] as V,
  stand: [0.0, 0.56] as [number, number],
};
const BUNDLE: Script = {
  seq: [['gather', 1.3], ['square', 1.3], ['band', 1.4], ['sign', 1.5], ['tray', 1.0]],
  at(k) {
    return k === 'tray' ? st(0.36, BT.stand[1]) : st(BT.stand[0], BT.stand[1]);
  },
  key(k, u, c) {
    const n: Record<string, number> = { stack: c.p('gather', 0.1, 1), banded: c.p('band', 0.7, 0.8), signed: c.p('sign', 0.4, 0.8), filed: c.p('tray', 0.75, 0.85) };
    const W = BT.work;
    switch (k) {
      case 'gather': {
        const p: V = lerpV(BT.loose, add(W, -0.06, 0.04, 0), frac(u * 2));
        return { l: add(p, 0, 0.03, 0.02), gl: 0.7, r: add(W, 0.15, 0.03, 0.02), gr: 0.15, palms: 1, lean: 0.24, nod: 0.56, props: { handful: p }, n };
      }
      case 'square': {
        const tap = 0.025 * Math.abs(Math.sin(u * 16));
        return { ...both(add(W, 0, 0.05 + tap, 0), 0.13), gl: 0.6, gr: 0.6, lean: 0.26, nod: 0.56, n: { ...n, tap } };
      }
      case 'band': {
        const stretch = 0.09 + 0.1 * Math.sin(u * PI);
        return { l: add(W, -stretch, 0.1, 0.02), gl: 0.72, r: add(W, stretch, 0.1, 0.02), gr: 0.72, lean: 0.26, nod: 0.56, n: { ...n, stretch: k === 'band' && u < 0.75 ? stretch : 0 } };
      }
      case 'sign':
        return { l: add(BT.book, -0.14, 0.02, -0.02), gl: 0.2, r: add(BT.book, 0.02 + 0.05 * Math.sin(u * 17), 0.03, 0.03 * Math.sin(u * 37)), gr: 0.75, lean: 0.26, nod: 0.56, props: { pen: add(BT.book, 0.02 + 0.05 * Math.sin(u * 17), 0.05, 0.03 * Math.sin(u * 37)) }, n };
      default: {
        const p: V = lerpV(add(W, 0, 0.05, 0), add(BT.tray, 0, 0.06, 0), sm(u, 0.1, 0.8));
        return { ...both(p, 0.11), lean: 0.2, nod: 0.45, props: { bundle: u < 0.82 ? p : null }, n };
      }
    }
  },
};

// =============================================================================================
// 사서함 (mpPoBoxes, 2 × 1): a wall of little brass doors, eight columns by seven rows, each hung on its left edge.

export const PO = {
  cols: 8,
  rows: 7,
  x0: -0.77,
  dx: 0.22,
  y0: 0.5,
  dy: 0.2,
  z: 0.02,
  w: 0.2,
  h: 0.18,
  table: [-1.14, 0.0, 0.2] as V,
};
export const PO_DOORS: Array<[number, number]> = [[1, 3], [5, 2], [3, 5], [6, 4], [2, 1], [7, 3]];
export const poAt = (c: number, r: number, dz = 0): V => [PO.x0 + c * PO.dx, PO.y0 + r * PO.dy, PO.z + dz];
const BOXES: Script = {
  seq: [['key', 1.0], ['open', 0.7], ['in', 1.0], ['shut', 0.7], ['tick', 0.9]],
  at(_k, round) {
    const [c] = PO_DOORS[wrap(round, PO_DOORS.length)];
    return st(poAt(c, 0)[0] * 0.65, 0.58);
  },
  key(k, u, c) {
    const [cl, rw] = PO_DOORS[wrap(c.round, PO_DOORS.length)];
    const P = poAt(cl, rw);
    const n: Record<string, number> = { door: Math.min(c.p('open', 0, 0.9), 1 - c.p('shut', 0.1, 0.9)) };
    const low = rw < 2;
    const nod = low ? 0.45 : rw > 4 ? -0.1 : 0.14;
    const crouch = low ? 0.45 : 0;
    const left = c.bd(0.15, 0.68 * c.H, 0.26);
    const pile = { pile: add(left, 0.02, 0.03, 0.02) };
    switch (k) {
      case 'key':
        return { l: left, gl: 0.7, r: add(P, 0.06, 0.0, 0.05 + 0.01 * Math.sin(u * 9)), gr: 0.8, lean: 0.08, nod, crouch, props: pile, n };
      case 'open': {
        const a = sm(u, 0, 0.9);
        const hand: V = add(P, PO.w / 2 - 0.2 * (1 - Math.cos(a * 1.9)) * 0.5, 0, 0.05 + 0.14 * Math.sin(a * 1.9));
        return { l: left, gl: 0.7, r: hand, gr: 0.6, nod, crouch, props: pile, n };
      }
      case 'in': {
        const p: V = lerpV(add(left, 0.04, 0.04, -0.04), add(P, 0, -0.02, -0.06), sm(u, 0.05, 0.8));
        return { l: left, gl: 0.7, r: add(p, 0.02, -0.01, 0.05), gr: 0.75, lean: 0.14, nod, crouch, props: { ...pile, letter: u < 0.85 ? p : null }, n };
      }
      case 'shut': {
        const a = 1 - sm(u, 0.1, 0.9);
        return { l: left, gl: 0.7, r: add(P, 0.0 + 0.04 * (1 - a), 0, 0.05 + 0.12 * a), gr: 0.1, palms: 1.2, nod, crouch, props: pile, n };
      }
      default:
        return { l: left, gl: 0.7, r: add(left, 0.03 * Math.sin(u * 13) - 0.07, 0.05, 0.03), gr: 0.75, nod: 0.45, props: { ...pile, pen: add(left, 0.03 * Math.sin(u * 13) - 0.07, 0.06, 0.03) }, n };
    }
  },
};

// =============================================================================================
// 기재대 (mpWritingDesk, 2 × 1): a stand-up desk with a sloped top; holders for forms along the back, pens on chains, envelopes
// in a rack at the left end, a carton of them on the floor; a customer writes at the right end.

export const WD = {
  top: 0.92,
  holders: [[-0.5, 1.1, -0.2], [-0.1, 1.1, -0.2], [0.3, 1.1, -0.2]] as V[],
  rack: [-0.76, 1.0, 0.02] as V,
  carton: [-0.78, 0.2, 0.62] as V,
  pen: [-0.16, 0.97, 0.12] as V,
  customer: [0.56, 0.74] as [number, number],
  stand: [-0.34, 0.5] as [number, number],
};
const STOCK: Script = {
  seq: [['bend', 1.2], ['rise', 0.6], ['tap', 1.3], ['fill', 1.4], ['chain', 1.3]],
  at(k, round) {
    return k === 'tap' ? st(WD.holders[wrap(round, WD.holders.length)][0], WD.stand[1]) : st(WD.stand[0], WD.stand[1]);
  },
  key(k, u, c) {
    const H = WD.holders[wrap(c.round, WD.holders.length)];
    const pad = c.bd(0, 0.65 * c.H, 0.28);
    const n: Record<string, number> = { filled: c.p('fill', 0.7, 0.8), level: c.p('tap', 0.5, 1) };
    switch (k) {
      case 'bend': {
        const p: V = lerpV(pad, add(WD.carton, 0, 0.12, 0), 1 - Math.abs(2 * u - 1));
        return { ...both(p, 0.12), crouch: 0.7 * (1 - Math.abs(2 * u - 1)), lean: 0.3, nod: 0.5, props: { forms: p }, n };
      }
      case 'rise':
        return { ...both(pad, 0.12), nod: 0.25, props: { forms: pad }, n };
      case 'tap': {
        const p: V = add(H, 0, 0.1 + 0.03 * Math.abs(Math.sin(u * 13)), 0.02);
        return { ...both(p, 0.1), lean: 0.2, nod: 0.08, props: { forms: p }, n };
      }
      case 'fill': {
        const p: V = lerpV(add(WD.carton, 0, 0.3, -0.05), add(WD.rack, 0, 0.1, 0.02), sm(u, 0.1, 0.7));
        return { l: c.bd(0.3, 0.72 * c.H, 0.14), gl: 0.3, r: add(p, 0, -0.02, 0.05), gr: 0.72, lean: 0.2, nod: 0.2, props: { env: u < 0.8 ? p : null }, n };
      }
      default: {
        const pen: V = add(WD.pen, 0.04 * Math.sin(u * 6), 0.02, 0.02);
        return { l: add(WD.pen, -0.12, 0.03, 0.04), gl: 0.1, r: add(pen, 0, 0.02, 0.03), gr: 0.75, lean: 0.2, nod: 0.48, palms: 1, n };
      }
    }
  },
};

// =============================================================================================
// 번호표 발권기 (mpTicketMachine, 1 × 1): a pedestal, screen and buttons on top, the slip's mouth under them, a door low on its side.

export const TK = {
  screen: [0, 1.22, 0.14] as V,
  mouth: [0.02, 1.02, 0.17] as V,
  door: { y: 0.58, z: 0.16 },
  roll: [0.0, 0.58, 0.05] as V,
};
const TICKET: Script = {
  seq: [['open', 0.8], ['out', 1.0], ['in', 1.2], ['shut', 0.7], ['press', 1.0], ['tear', 0.9]],
  at: () => st(0.05, 0.62),
  key(k, u, c) {
    const n: Record<string, number> = { door: Math.min(c.p('open', 0, 1), 1 - c.p('shut', 0.1, 0.9)), test: c.p('press', 0.4, 0.8) * (1 - c.p('tear', 0.6, 0.9)), pressed: k === 'press' ? 1 : 0 };
    const pad = c.bd(0.2, 0.55 * c.H, 0.12);
    switch (k) {
      case 'open':
        return { l: pad, r: [0.1, TK.door.y, TK.door.z + 0.05 + 0.2 * sm(u, 0, 1)], gr: 0.7, lean: 0.2, nod: 0.5, crouch: 0.55, n };
      case 'out': {
        const p: V = lerpV(TK.roll, c.bd(0.14, 0.42 * c.H, 0.3), sm(u, 0.2, 1));
        return { l: add(p, -0.08, 0, 0), gl: 0.7, r: add(p, 0.08, 0, 0), gr: 0.7, lean: 0.3, nod: 0.5, crouch: 0.6, palms: 0, props: { rollOld: p }, n };
      }
      case 'in': {
        const p: V = lerpV(c.bd(-0.2, 0.42 * c.H, 0.3), TK.roll, sm(u, 0.2, 1));
        return { l: add(p, -0.08, 0, 0), gl: 0.7, r: add(p, 0.08, 0, 0), gr: 0.7, lean: 0.3, nod: 0.5, crouch: 0.6, palms: 0, props: { rollNew: p }, n };
      }
      case 'shut':
        return { l: pad, r: [0.1, TK.door.y, TK.door.z + 0.25 - 0.2 * sm(u, 0.1, 0.9)], gr: 0.1, palms: 1, lean: 0.2, nod: 0.5, crouch: 0.55 * (1 - sm(u, 0.5, 1) * 0.5), n };
      case 'press':
        return { l: pad, r: add(TK.screen, -0.04, -0.04 - 0.012 * Math.max(0, Math.sin(u * 10)), 0.04), gr: 0.1, palms: 1, nod: 0.16, tap: true, lean: 0.05, n };
      default:
        return { l: add(TK.mouth, 0.02, 0.06, 0.04), gl: 0.3, r: add(TK.mouth, 0.03, -0.06 * sm(u, 0.2, 0.7), 0.05), gr: 0.75, nod: 0.25, n };
    }
  },
};

// =============================================================================================
// 배달 구역 지도 (mpRouteMap, 2 × 1): a big map on the wall behind a ledge, coloured by route, pins and string, a pin box on the ledge.

export const RM = {
  z: -0.32,
  ledge: [0, 0.94, -0.18] as V,
  pinBox: [-0.68, 0.98, -0.16] as V,
  note: [0.68, 1.06, -0.3] as V,
};
export const RM_PINS: V[] = [[-0.42, 1.28, -0.3], [0.08, 1.62, -0.3], [0.44, 1.2, -0.3], [-0.14, 1.04, -0.3], [0.56, 1.58, -0.3]];
const MAP: Script = {
  seq: [['look', 1.6], ['take', 0.8], ['pin', 1.1], ['string', 1.4], ['note', 1.5]],
  at(k) {
    return k === 'take' ? st(-0.42, 0.2) : k === 'note' ? st(0.42, 0.2) : st(0.05, 0.2);
  },
  key(k, u, c) {
    const pin = RM_PINS[wrap(c.round, RM_PINS.length)];
    const prev = RM_PINS[wrap(c.round - 1, RM_PINS.length)];
    const n: Record<string, number> = { placed: c.p('pin', 0.55, 0.7), string: c.p('string', 0, 1) };
    const off = (p: V, z = 0.05): V => add(p, 0, -0.01, z);
    switch (k) {
      case 'look':
        return { l: c.bd(0.14, 0.72 * c.H, 0.08), gl: 0.5, r: add(pin, 0.3 * Math.cos(u * 3), -0.1 * Math.sin(u * 4), 0.1), gr: 0.15, palms: 1, nod: pin[1] > 1.4 ? -0.15 : 0.08, n };
      case 'take':
        return { l: c.bd(0.14, 0.72 * c.H, 0.08), r: add(RM.pinBox, 0, 0.03, 0.05), gr: 0.7, lean: 0.2, nod: 0.45, n };
      case 'pin': {
        const q = lerpV(add(pin, 0, -0.05, 0.14), pin, sm(u, 0.1, 0.6));
        return { l: add(pin, -0.14, -0.1, 0.04), gl: 0.1, palms: 1, r: off(q), gr: 0.85, lean: 0.12, nod: pin[1] > 1.4 ? -0.18 : 0.04, props: { pin: u < 0.6 ? q : null }, n };
      }
      case 'string': {
        const q = lerpV(prev, pin, u);
        return { l: off(prev), gl: 0.7, r: off(q), gr: 0.8, lean: 0.1, nod: q[1] > 1.4 ? -0.15 : 0.06, props: { end: q }, n };
      }
      default: {
        const q: V = add(RM.note, 0.05 * Math.sin(u * 17), 0.02 * Math.cos(u * 23), 0.02);
        return { l: add(RM.note, -0.14, -0.04, 0.03), gl: 0.3, r: add(q, 0, 0.01, 0.03), gr: 0.75, lean: 0.14, nod: 0.25, props: { pen: q }, n };
      }
    }
  },
};

const SCRIPTS: Record<MpMotion, Script> = { mpSort: SORT, mpRoute: ROUTE, mpCounter: COUNTER, mpBank: BANK, mpLoadBike: LOADBIKE, mpWalk: WALK, mpEmpty: EMPTY, mpRoll: ROLL, mpCage: CAGE, mpBundle: BUNDLE, mpBoxes: BOXES, mpStock: STOCK, mpTicket: TICKET, mpMap: MAP };
