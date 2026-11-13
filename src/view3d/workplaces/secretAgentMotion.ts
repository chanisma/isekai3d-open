import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 정보 분석센터 (2026-11-01, the workplace pipeline, at the user's request). All of it is a light, made-up
 * game: an invented city, 해담시, and cases with code names that are mostly about stolen fish-bun recipes. Each motion is a
 * round of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by the same clock
 * (secretAgent.ts), so the page that's highlighted is the one on the desk and the case on the wall is the case in the folder.
 *
 * - 분석 단말기 (intelDesk): icAnalyze, a folder from the tray, read and searched, the map on the left screen, a line
 *   highlighted, a rating given. icWrite, a report typed, the chair rolled to the printer, stamped, filed. icLiaison, the
 *   phone and a video call with a made-up partner, written up and sent. icCase, a photo held to the screen, matched, then
 *   stood up and handed to the team leader, who reads and nods.
 * - 상황실 대형 화면 (situationWall): icMonitor, along the console panel by panel, a radio check, the log. icCrisis, the alarm,
 *   the red phone, the laser on the node, the block typed with a colleague while the bar climbs, the wall goes green.
 *   icTeamBrief, stood at the side of the wall, turned to the room, a slide on the wall and the pointer, a hand goes up.
 * - 사이버 보안 단말기 (cyberTerminal): icTrace, hop by hop along the graph until the trail stops, blocked. icPatch, the list
 *   gone through, up to the rack for a module, back, rebooted, the lamps from red to green.
 * - 단서 보드 (icEvidenceBoard): icPin, a photo pinned and a thread pulled to it. icReview, argued over with a colleague,
 *   a wrong thread taken off.
 * - 신호 청취석 (icSignalDesk): icDecode, headset on, tuned until the peak is centred, a hand to the ear, dots on the pad, the code
 *   book, the words come up.
 * - 보안 문서 금고 (icDocSafe): icSafe, the dial, the handle, the door, a folder in and the next out, shut, signed.
 * - 작전 회의 테이블 (icBriefTable): icConvene, folders down, projector on, the token pushed across the table map with a
 *   long stick, a question, a nod round the table.
 * - 출입 관리대 (icBadgeDesk): icBadge, a visitor's card read, their badge printed and put round, the phone in its box, the
 *   reader tapped and the lamp green.
 * - 현장 장비 사물함 (icGearLocker): icKit, the locker opened, a radio tested, binoculars looked through, ticked off.
 * - 체력 단련 매트 (icDefenseMat): icSpar, a guard, jab and cross on the padded dummy (it rocks), a block, a breath, the towel.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front).
 */
export type IcMotion = 'icAnalyze' | 'icWrite' | 'icLiaison' | 'icCase' | 'icMonitor' | 'icCrisis' | 'icTeamBrief' | 'icTrace' | 'icPatch' | 'icPin' | 'icReview' | 'icDecode' | 'icSafe' | 'icConvene' | 'icBadge' | 'icKit' | 'icSpar';
export const IC_MOTIONS = new Set<string>(['icAnalyze', 'icWrite', 'icLiaison', 'icCase', 'icMonitor', 'icCrisis', 'icTeamBrief', 'icTrace', 'icPatch', 'icPin', 'icReview', 'icDecode', 'icSafe', 'icConvene', 'icBadge', 'icKit', 'icSpar']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const icPhase = (p: THREE.Vector3) => frac(p.x * 0.283 + p.z * 0.613);
export const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
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
export interface IcNow {
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
export function icNow(m: IcMotion, t: number, ph: number, H = 1.6): IcNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
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
export function icPose(m: IcMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = icNow(m, t, icPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Where a hand goes for an ear (sx +1 their left), sat or stood. */
const ear = (c: Ctx, sx: number): V => (c.st.sit ? c.bd(sx * 0.12, 0.72 * (c.H / 1.6), 0.03) : c.bd(sx * 0.12, 0.93 * c.H, 0.03));
/** The chin, for a think. */
const chin = (c: Ctx): V => (c.st.sit ? c.bd(0.02, 0.63 * (c.H / 1.6), 0.15) : c.bd(0.02, 0.86 * c.H, 0.15));
/** The middle of the head, where a headset's cups go. */
const crown = (c: Ctx): V => (c.st.sit ? c.bd(0, 0.72 * (c.H / 1.6), 0) : c.bd(0, 0.93 * c.H, 0));
const typing = (c: Ctx, keys: V, n: Record<string, number>, props?: Key['props'], nod = 0.2): Key => ({
  l: add(keys, -0.075, 0.03 + 0.007 * Math.sin(c.t * 17), 0.005),
  r: add(keys, 0.075, 0.03 + 0.007 * Math.sin(c.t * 19 + 1), 0.005),
  gl: 0.15,
  gr: 0.15,
  tap: true,
  lean: 0.1,
  nod,
  props,
  n,
});

// =============================================================================================
// 분석 단말기 (intelDesk, 1 × 1 but drawn wide): three monitors, the keyboard, the folder place on the left, the mouse on
// the right, the tray and printer further right, the phone on the left.

export const ID = {
  top: 0.74,
  seat: [0, 0.47, 0.76] as V,
  seatPrint: [0.42, 0.47, 0.72] as V,
  keys: [0, 0.76, 0.27] as V,
  mouse: [0.28, 0.755, 0.28] as V,
  /** The folder's place; the tray it comes from. */
  file: [-0.27, 0.755, 0.24] as V,
  tray: [0.44, 0.81, 0.08] as V,
  /** The phone, its handset. */
  phone: [-0.54, 0.79, 0.16] as V,
  /** The printer's paper comes out here; the stamp waits by it. */
  print: [0.71, 0.82, 0.12] as V,
  stamp: [0.38, 0.77, -0.08] as V,
  pen: [-0.05, 0.76, 0.05] as V,
  /** The pad the phone's written on. */
  pad: [0.25, 0.757, 0.2] as V,
  /** The team leader comes to here for a report. */
  boss: [1.06, 0.84] as const,
};
const SAT_ID = sat(ID.seat);
const SAT_PRINT = sat(ID.seatPrint, PI - 0.25);
const handMouse = (c: Ctx, amp = 0.012): V => add(ID.mouse, amp * Math.sin(c.t * 2.6), 0.035, amp * Math.cos(c.t * 3.1));
const openFile: V = add(ID.file, 0, 0.01, 0);

const ANALYZE: Script = {
  seq: [['fetch', 1.8], ['open', 1.2], ['read', 3.4], ['search', 3], ['compare', 3.2], ['mark', 2.6], ['think', 2], ['rate', 2.2]],
  at: () => SAT_ID,
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, open: k === 'open' ? u : c.p('open'), query: k === 'search' ? u : c.p('search'), results: k === 'compare' ? sm(u, 0, 0.5) : c.p('compare'), pin: k === 'compare' ? sm(u, 0.4, 0.8) : c.p('compare'), mark: k === 'mark' ? sm(u, 0.1, 0.9) : c.p('mark'), rate: c.p('rate', 0.45, 0.6) };
    switch (k) {
      case 'fetch': {
        const f = lerpV(ID.tray, openFile, sm(u, 0.3, 0.95));
        return { r: add(f, 0.03, 0.04, 0.05), gr: 0.75, l: add(ID.keys, -0.1, 0.03, 0.03), nod: 0.2, lean: 0.26, props: { file: f }, n };
      }
      case 'open':
        return { l: add(openFile, -0.06, 0.03, 0.04), gl: 0.6, r: add(openFile, 0.08 - 0.15 * u, 0.04 + 0.05 * Math.sin(u * PI), 0.04), gr: 0.55, nod: 0.34, lean: 0.14, props: { file: openFile }, n };
      case 'read': {
        const f = add(openFile, 0.0, 0.03, -0.08 + 0.16 * frac(u * 1.5));
        return { l: f, gl: 0.3, palms: 0.2, r: handMouse(c, 0.004), gr: 0.5, nod: 0.36, lean: 0.14, props: { file: openFile }, n };
      }
      case 'search':
        return typing(c, ID.keys, n, { file: openFile }, 0.14);
      case 'compare':
        return { r: handMouse(c), gr: 0.5, l: add(openFile, -0.03, 0.03, 0.02), gl: 0.3, nod: 0.08 + 0.05 * Math.sin(c.t * 1.2), lean: 0.08, props: { file: openFile }, n };
      case 'mark': {
        const p = add(openFile, -0.07 + 0.14 * frac(u * 1.0), 0.012, -0.03);
        return { r: add(p, 0.02, 0.06, 0.04), gr: 0.92, l: add(openFile, -0.1, 0.03, 0.03), gl: 0.5, nod: 0.38, lean: 0.17, props: { file: openFile, marker: p }, n };
      }
      case 'think':
        return { l: chin(c), gl: 0.5, r: handMouse(c, 0.003), gr: 0.5, nod: 0.05, lean: 0.03, props: { file: openFile }, n };
      default:
        return u < 0.5
          ? { r: add(ID.keys, 0.12, 0.05 - 0.03 * sm(u, 0.25, 0.45), 0.0), gr: 0.2, l: add(ID.keys, -0.08, 0.03, 0), tap: true, nod: 0.16, lean: 0.08, props: { file: openFile }, n }
          : { l: c.bd(0.12, 0.28, 0.24), r: c.bd(-0.12, 0.28, 0.24), gl: 0.3, gr: 0.3, nod: 0.1, lean: -0.02, props: { file: openFile }, n };
    }
  },
};

const WRITE: Script = {
  seq: [['title', 2], ['type', 4], ['check', 2], ['type2', 3.2], ['roll', 0.9], ['print', 2.4], ['stamp', 2.2], ['file', 1.8]],
  at: (k) => (k === 'print' || k === 'stamp' || k === 'file' || k === 'roll' ? SAT_PRINT : SAT_ID),
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, doc: k === 'title' ? 0.08 * u : k === 'type' ? 0.08 + 0.52 * u : k === 'check' ? 0.6 : k === 'type2' ? 0.6 + 0.4 * u : 1, printing: k === 'print' ? u : 0, stamped: c.p('stamp', 0.45, 0.55) };
    const sheetOnDesk: V = add(ID.seatPrint, 0, 0.3, -0.42);
    switch (k) {
      case 'title':
      case 'type':
      case 'type2':
        return typing(c, ID.keys, n);
      case 'check':
        return { l: add(ID.file, 0, 0.03, -0.04 + 0.1 * u), gl: 0.3, r: handMouse(c), gr: 0.5, nod: 0.3, lean: 0.12, props: { file: openFile }, n };
      case 'roll':
        return { l: c.bd(0.14, 0.26, 0.28), r: c.bd(-0.14, 0.26, 0.28), nod: 0.14, n };
      case 'print': {
        const s = add(ID.print, 0, -0.01, 0.1 + 0.1 * sm(u, 0.1, 0.8));
        const take = lerpV(s, sheetOnDesk, sm(u, 0.75, 1));
        return { r: add(take, 0.01, 0.03, 0.04), gr: u > 0.6 ? 0.8 : 0.3, l: c.bd(0.14, 0.26, 0.3), nod: 0.26, lean: 0.14, props: { sheet: u > 0.1 ? take : null }, n };
      }
      case 'stamp': {
        const down = Math.max(0, Math.sin(sm(u, 0.2, 0.7) * PI));
        const p: V = lerpV(ID.stamp, add(sheetOnDesk, 0.04, 0.02, 0), sm(u, 0, 0.3));
        const q = add(p, 0, 0.1 * (1 - down), 0);
        return { r: add(q, 0, 0.08, 0.01), gr: 0.92, l: add(sheetOnDesk, -0.13, 0.02, 0.05), gl: 0.45, nod: 0.38, lean: 0.17, props: { sheet: sheetOnDesk, stamp: q }, n };
      }
      default: {
        const s = lerpV(sheetOnDesk, add(ID.tray, 0, 0.04, 0), sm(u, 0.1, 0.85));
        return { r: add(s, 0.02, 0.03, 0.04), gr: 0.75, l: c.bd(0.14, 0.26, 0.3), nod: 0.28, lean: 0.12, props: { sheet: u < 0.92 ? s : null }, n };
      }
    }
  },
};

const LIAISON: Script = {
  seq: [['dial', 1.8], ['call', 4.2], ['note', 3.6], ['bye', 1.4], ['writeup', 3.6], ['send', 1.6]],
  at: () => SAT_ID,
  key(k, u, c) {
    const onCall = k === 'call' || k === 'note' ? 1 : 0;
    const n: Record<string, number> = { on: 1, call: onCall, notes: k === 'note' ? u : c.p('note'), doc: k === 'writeup' ? u : c.p('writeup'), sent: c.p('send', 0.3, 0.5), talk: onCall };
    const handset = ear(c, 1);
    switch (k) {
      case 'dial': {
        const p = add(ID.phone, 0.03 * Math.sin(u * 14), 0.05 - 0.02 * Math.abs(Math.sin(u * 22)), 0.05);
        return { l: p, gl: 0.2, r: handMouse(c, 0.003), gr: 0.4, nod: 0.3, lean: 0.14, tap: true, n };
      }
      case 'call':
        return { l: add(handset, 0.01, -0.02, 0), gl: 0.86, r: handMouse(c, 0.006), gr: 0.4, nod: 0.05 + 0.05 * Math.sin(c.t * 2.4), lean: 0.03, props: { handset }, n };
      case 'note': {
        const p = add(ID.pad, -0.05 + 0.1 * frac(u * 3), 0.012, 0.03 * Math.sin(u * 13));
        return { l: add(handset, 0.01, -0.02, 0), gl: 0.86, r: add(p, 0.01, 0.06, 0.03), gr: 0.92, nod: 0.3, lean: 0.12, props: { handset, pen: p }, n };
      }
      case 'bye': {
        const h = lerpV(handset, add(ID.phone, -0.02, 0.03, 0), sm(u, 0.2, 0.9));
        return { l: add(h, 0.01, 0.0, 0.01), gl: 0.86, r: c.bd(-0.14, 0.26, 0.28), nod: 0.2, props: { handset: h }, n };
      }
      case 'writeup':
        return typing(c, ID.keys, n);
      default:
        return { r: add(ID.keys, 0.13, 0.05 - 0.03 * Math.abs(Math.sin(u * PI)), 0), gr: 0.2, l: add(ID.keys, -0.08, 0.03, 0), tap: true, nod: 0.14, lean: 0.08, n };
    }
  },
};

const CASE: Script = {
  seq: [['photo', 3], ['match', 2.6], ['type', 3], ['up', 1.2, 0.9], ['report', 3.4], ['nod', 2, 0.9]],
  at: (k) => (k === 'up' || k === 'report' || k === 'nod' ? st(0.46, 0.86, PI / 2 - 0.1) : SAT_ID),
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, match: k === 'match' ? u : c.p('match'), doc: k === 'type' ? u : c.p('type'), boss: k === 'up' ? sm(u, 0.2, 1) : k === 'report' || k === 'nod' ? 1 : 0, bossRead: k === 'report' ? sm(u, 0.45, 0.65) : k === 'nod' ? 1 - sm(u, 0.8, 1) : 0, bossNod: k === 'nod' ? 1 : 0 };
    switch (k) {
      case 'photo': {
        const p = lerpV(add(ID.file, 0, 0.02, 0), [-0.08, 1.04, 0.2], sm(u, 0.1, 0.5));
        return { l: add(p, 0.0, -0.07, 0.01), gl: 0.86, r: handMouse(c, 0.004), gr: 0.4, nod: 0.05, lean: 0.14, props: { photo: p }, n };
      }
      case 'match': {
        const p: V = [-0.08, 1.04, 0.2];
        return { l: add(p, 0, -0.07, 0.01), gl: 0.86, r: handMouse(c), gr: 0.5, nod: 0.02, lean: 0.14, props: { photo: p }, n };
      }
      case 'type':
        return typing(c, ID.keys, n);
      case 'up': {
        const f = c.bd(-0.02, 0.62 * c.H, 0.26);
        return { l: add(f, 0.1, -0.01, 0), r: add(f, -0.1, -0.01, 0), gl: 0.7, gr: 0.7, nod: 0.2, props: { report: f }, n };
      }
      case 'report': {
        const f = lerpV(c.bd(-0.02, 0.62 * c.H, 0.26), [ID.boss[0] - 0.26, 1.03, ID.boss[1]], sm(u, 0.1, 0.45));
        return { r: add(f, -0.06, 0, 0.0), gr: 0.72, l: rest(c).l, nod: 0.12, palms: 0.5, props: { report: f }, n };
      }
      default: {
        const f: V = [ID.boss[0] - 0.26, 1.03, ID.boss[1]];
        return { ...rest(c), nod: 0.05 + 0.03 * Math.sin(c.t * 3), palms: 0.6, props: { report: f }, n };
      }
    }
  },
};

// =============================================================================================
// 상황실 대형 화면 (situationWall, 2 × 1, the screens on the wall run wider): the wall, the console along its foot.

export const SW = {
  /** The screens' face. */
  z: -0.38,
  mainY: 1.62,
  consoleTop: 0.82,
  keysL: [-0.72, 0.85, 0.11] as V,
  keysC: [0, 0.85, 0.11] as V,
  keysR: [0.72, 0.85, 0.11] as V,
  /** The red phone, the big button, the radio. */
  phone: [-0.28, 0.87, 0.06] as V,
  button: [0.3, 0.86, 0.1] as V,
  radio: [0.95, 0.89, 0.05] as V,
  log: [0.42, 0.84, 0.1] as V,
};
const onWall = (x: number, y: number): V => [x, y, SW.z + 0.012];
const pointing = (c: Ctx, target: V, side = -1): { hand: V; dot: V } => {
  const hand = c.bd(side * 0.2, 0.74 * c.H, 0.3);
  return { hand, dot: target };
};

const MONITOR: Script = {
  seq: [['left', 3], ['walk', 0.2, 1], ['centre', 3.4], ['walk2', 0.2, 1], ['right', 2.4], ['radio', 3], ['log', 2.4]],
  at: (k) => (k === 'left' ? st(-0.72, 0.5) : k === 'centre' || k === 'walk' ? st(0, 0.5) : st(0.72, 0.5)),
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, panel: k === 'left' ? 1 : k === 'centre' ? 2 : k === 'right' ? 3 : 0, zoom: k === 'centre' ? sm(u, 0.2, 0.5) * (1 - sm(u, 0.85, 1)) : 0, sweep: frac(c.t * 0.14), logged: k === 'log' ? u : c.p('log') };
    switch (k) {
      case 'left':
        return typing(c, SW.keysL, n, undefined, 0.04);
      case 'centre':
        return { r: add(SW.keysC, 0.08, 0.03 + 0.012 * Math.sin(c.t * 4), 0), gr: 0.2, l: add(SW.keysC, -0.16, 0.03, 0), gl: 0.2, palms: 0.2, nod: -0.04, lean: 0.12, n };
      case 'right':
        return typing(c, SW.keysR, n, undefined, 0.02);
      case 'radio': {
        const r = lerpV(SW.radio, c.bd(0.1, 0.87 * c.H, 0.18), sm(u, 0.05, 0.3));
        return { l: add(r, 0.0, -0.05, 0.0), gl: 0.86, r: add(SW.keysR, 0.1, 0.03, 0), gr: 0.2, nod: -0.02 + 0.03 * Math.sin(c.t * 2), lean: 0.1, props: { radio: r }, n };
      }
      case 'log': {
        const p = add(SW.log, -0.05 + 0.1 * frac(u * 3), 0.016, 0.02 * Math.sin(u * 13));
        return { r: add(p, 0.01, 0.06, 0.03), gr: 0.92, l: add(SW.log, -0.13, 0.02, 0.03), gl: 0.4, nod: 0.38, lean: 0.2, props: { pen: p }, n };
      }
      default:
        return { ...rest(c), nod: -0.02, n };
    }
  },
};

const CRISIS: Script = {
  seq: [['alarm', 2], ['phone', 2.8], ['point', 2.6], ['block', 5.2], ['button', 1.4], ['clear', 2.8]],
  at: (k) => (k === 'phone' ? st(-0.26, 0.5) : k === 'point' || k === 'clear' ? st(0.1, 0.72, PI) : k === 'button' ? st(0.3, 0.5) : k === 'alarm' ? st(0, 0.72) : st(0, 0.5)),
  key(k, u, c) {
    const block = k === 'block' ? u : c.p('block');
    const n: Record<string, number> = { on: 1, alarm: k === 'clear' ? 0 : 1, block, clear: k === 'clear' ? sm(u, 0, 0.2) : 0, helper: 1, helperType: k === 'block' ? 1 : 0, pressed: k === 'button' ? Math.sin(u * PI) : 0, cheer: k === 'clear' ? 1 : 0 };
    switch (k) {
      case 'alarm':
        return { l: c.bd(0.22, 0.56 * c.H, 0.14), r: c.bd(-0.22, 0.56 * c.H, 0.14), nod: -0.12, lean: 0.04, n };
      case 'phone': {
        const h = lerpV(SW.phone, ear(c, -1), sm(u, 0.05, 0.25));
        const back = sm(u, 0.85, 1);
        const held = lerpV(h, SW.phone, back);
        return { r: add(held, -0.01, -0.02, 0), gr: 0.86, l: add(SW.keysC, -0.14, 0.03, 0), gl: 0.2, nod: -0.02, lean: 0.08, props: { handset: held }, n };
      }
      case 'point': {
        const target = onWall(-0.32 + 0.05 * Math.sin(c.t * 5), 1.82 + 0.04 * Math.cos(c.t * 4));
        const hand = c.bd(-0.2, 0.76 * c.H, 0.3);
        return { r: hand, gr: 0.9, l: rest(c).l, nod: -0.16, lean: 0.03, props: { pointer: hand, dot: target }, n };
      }
      case 'block':
        return typing(c, SW.keysC, n, undefined, 0.02);
      case 'button': {
        const down = Math.abs(Math.sin(u * PI));
        return { r: add(SW.button, 0, 0.075 - 0.05 * down, 0), gr: 0.1, l: rest(c).l, nod: 0.3, lean: 0.16, n };
      }
      default: {
        const up = c.bd(-0.26, 0.92 * c.H + 0.03 * Math.sin(c.t * 7), 0.12);
        return { r: up, gr: 0.9, l: c.bd(0.2, 0.56 * c.H, 0.14), nod: -0.1, lean: -0.03, n };
      }
    }
  },
};

const TEAM_BRIEF: Script = {
  seq: [['open', 3], ['turn', 3.4, 0.7], ['detail', 3.2], ['question', 3.2, 0.7], ['answer', 2.4], ['assign', 3]],
  at: (k) => (k === 'turn' || k === 'detail' ? st(1.28, 0.34, -2.65) : st(1.28, 0.42, -0.25)),
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, slide: k === 'open' ? 0 : k === 'turn' ? 1 : k === 'detail' ? 2 : 3, audience: 1, hand: k === 'question' ? 1 : 0, nods: k === 'assign' || k === 'answer' ? 1 : 0, note: k === 'detail' ? 1 : 0 };
    switch (k) {
      case 'open':
        return { l: c.bd(0.22, 0.64 * c.H + 0.03 * Math.sin(c.t * 2.2), 0.18), r: c.bd(-0.22, 0.62 * c.H - 0.03 * Math.sin(c.t * 2.2), 0.2), palms: 0.85, gl: 0.2, gr: 0.2, nod: 0.03, lean: 0.03, n };
      case 'turn': {
        const p = pointing(c, onWall(-0.5 + 0.6 * frac(u * 1.4), 1.7 + 0.2 * Math.sin(u * 7)), -1);
        return { r: p.hand, gr: 0.9, l: rest(c).l, nod: -0.1, lean: 0.02, props: { pointer: p.hand, dot: p.dot }, n };
      }
      case 'detail': {
        const p = pointing(c, onWall(0.32 + 0.05 * Math.sin(c.t * 3.1), 1.45 + 0.05 * Math.cos(c.t * 2.2)), -1);
        return { r: p.hand, gr: 0.9, l: rest(c).l, nod: -0.06, lean: 0.02, props: { pointer: p.hand, dot: p.dot }, n };
      }
      case 'question':
        return { l: c.bd(0.14, 0.62 * c.H, 0.12), gl: 0.5, r: c.bd(-0.2, 0.52 * c.H, 0.1), nod: 0.14 + 0.04 * Math.sin(c.t * 2.3), lean: 0.05, n };
      case 'answer':
        return { l: c.bd(0.24, 0.68 * c.H + 0.04 * Math.sin(c.t * 3), 0.2), r: c.bd(-0.24, 0.66 * c.H - 0.04 * Math.sin(c.t * 3), 0.2), palms: 0.85, gl: 0.2, gr: 0.2, nod: 0.06, lean: 0.04, n };
      default:
        return { r: c.bd(-0.18 + 0.3 * frac(u * 2), 0.8 * c.H, 0.36), gr: 0.25, palms: 0.5, l: rest(c).l, nod: 0.03, lean: 0.05, n };
    }
  },
};

// =============================================================================================
// 사이버 보안 단말기 (cyberTerminal, 1 × 1): two screens, the keyboard, a rack behind and above it.

export const CT = {
  seat: [0, 0.47, 0.76] as V,
  keys: [0, 0.76, 0.27] as V,
  mouse: [0.28, 0.755, 0.28] as V,
  token: [-0.32, 0.77, 0.18] as V,
  /** The rack's module bay. */
  bay: [-0.36, 1.34, -0.24] as V,
  home: [-0.33, 0.78, 0.06] as V,
};
const SAT_CT = sat(CT.seat);

const TRACE: Script = {
  seq: [['token', 1.8], ['scan', 3], ['hop', 5], ['pin', 2.2], ['block', 2.6], ['done', 2]],
  at: () => SAT_CT,
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, token: k === 'token' ? sm(u, 0.4, 0.8) : 1, scan: k === 'scan' ? u : c.p('scan'), hop: k === 'hop' ? u : c.p('hop'), pin: k === 'pin' ? u : c.p('pin'), block: k === 'block' ? u : c.p('block'), done: k === 'done' ? 1 : 0 };
    switch (k) {
      case 'token': {
        const p = lerpV(add(CT.token, 0.1, 0.02, 0.05), CT.token, sm(u, 0.2, 0.8));
        return { l: add(p, 0.02, 0.03, 0.03), gl: 0.86, r: add(CT.mouse, 0, 0.035, 0), gr: 0.5, nod: 0.34, lean: 0.17, props: { stick: u < 0.82 ? p : null }, n };
      }
      case 'scan':
      case 'block':
        return typing(c, CT.keys, n, undefined, 0.1);
      case 'hop':
        return { r: add(CT.mouse, 0.01 * Math.sin(c.t * 3), 0.035, 0.01 * Math.cos(c.t * 2.4)), gr: 0.5, l: add(CT.keys, -0.08, 0.03, 0), gl: 0.15, nod: -0.02, lean: 0.14, n };
      case 'pin':
        return { l: chin(c), gl: 0.5, r: add(CT.mouse, 0, 0.035, 0), gr: 0.5, nod: -0.04, lean: 0.06, n };
      default:
        return { l: c.bd(0.14, 0.28, 0.28), r: c.bd(-0.14, 0.28, 0.28), nod: 0.04, lean: -0.05, n };
    }
  },
};

const PATCH_AT = st(-0.66, 0.18, 2.52);
const PATCH: Script = {
  seq: [['list', 3.2], ['up', 0.5, 0.9], ['pull', 2.2], ['swap', 2.4], ['push', 1.8], ['down', 0.4, 0.9], ['boot', 2.8], ['tick', 2]],
  at: (k) => (k === 'up' || k === 'pull' || k === 'swap' || k === 'push' ? PATCH_AT : SAT_CT),
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, list: k === 'list' ? u : c.p('list'), out: k === 'pull' ? sm(u, 0.2, 0.8) : k === 'swap' ? 1 : k === 'push' ? 1 - sm(u, 0.1, 0.8) : 0, boot: k === 'boot' ? u : c.p('boot'), fixed: c.p('push', 0.7, 0.9), tick: k === 'tick' ? u : 0 };
    const out = add(CT.bay, 0, 0, 0.13);
    switch (k) {
      case 'list':
      case 'boot':
      case 'tick':
        return typing(c, CT.keys, n, undefined, 0.08);
      case 'up':
      case 'down':
        return { ...rest(c), nod: 0.1, n };
      case 'pull': {
        const p = lerpV(CT.bay, out, sm(u, 0.2, 0.8));
        return { r: add(p, 0.03, 0, 0.09), gr: 0.86, l: add(CT.bay, -0.14, 0.05, 0.05), gl: 0.3, nod: -0.08, lean: 0.14, props: { module: p }, n };
      }
      case 'swap': {
        const a = Math.sin(u * PI);
        const p = add(out, 0.06 * a, -0.16 * a, 0.07 * a);
        const q = add(out, 0, -0.16 * (1 - a), 0.07 * (1 - a));
        return { r: add(p, 0.03, 0, 0.08), gr: 0.86, l: add(q, -0.03, 0, 0.08), gl: 0.86, nod: 0.08, lean: 0.14, props: { module: p }, n };
      }
      default: {
        const p = lerpV(out, CT.bay, sm(u, 0.1, 0.8));
        return { r: add(p, 0.03, 0, 0.09), gr: 0.8, l: add(CT.bay, -0.14, 0.05, 0.05), gl: 0.3, nod: -0.08, lean: 0.14, props: { module: p }, n };
      }
    }
  },
};

// =============================================================================================
// 단서 보드 (icEvidenceBoard, 2 × 1): a cork wall, a ledge at its foot with the pins, yarn and tape.

export const EB = {
  z: -0.36,
  /** The next photo's place and the pin the thread starts from. */
  slot: [0.46, 1.62, -0.345] as V,
  from: [-0.46, 1.28, -0.345] as V,
  /** The wrong thread's two ends. */
  wrongA: [-0.14, 1.78, -0.345] as V,
  wrongB: [0.62, 1.12, -0.345] as V,
  ledge: [0.72, 0.82, -0.22] as V,
  spool: [-0.72, 0.84, -0.2] as V,
  stand: [0.1, 0.12] as const,
  folder: [0.3, 1.04, -0.02] as V,
};

const PIN: Script = {
  seq: [['read', 2.4], ['pick', 1.6], ['place', 2.2], ['spool', 1.6], ['pull', 3], ['tie', 1.6], ['back', 2.2, 0.9], ['note', 2.2, 0.9]],
  at: (k) => (k === 'read' || k === 'back' ? st(0.1, 0.34) : k === 'spool' ? st(-0.42, 0.12) : k === 'pull' ? st(0, 0.12) : k === 'note' ? st(-0.2, 0.12) : st(0.3, 0.12)),
  key(k, u, c) {
    const n: Record<string, number> = { placed: c.p('place', 0.6, 0.8), thread: k === 'pull' ? sm(u, 0.05, 0.95) : c.p('pull'), note: c.p('note', 0.4, 0.7) };
    const photoHome = c.bd(-0.06, 0.62 * c.H, 0.24);
    switch (k) {
      case 'read':
        return { l: add(photoHome, 0.07, -0.03, 0), r: add(photoHome, -0.07, -0.03, 0), gl: 0.72, gr: 0.72, nod: 0.3, lean: 0.03, props: { photo: photoHome }, n };
      case 'pick': {
        const p = lerpV(photoHome, add(EB.slot, 0, -0.1, 0.1), sm(u, 0, 0.85));
        return { r: add(p, 0.02, -0.06, 0.05), gr: 0.82, l: rest(c).l, nod: -0.05, lean: 0.03, props: { photo: p }, n };
      }
      case 'place': {
        const p = lerpV(add(EB.slot, 0, -0.1, 0.1), add(EB.slot, 0, 0, 0.012), sm(u, 0, 0.5));
        const pinHand = add(EB.slot, 0, 0.12, 0.05 + 0.03 * (1 - sm(u, 0.5, 0.7)));
        return { r: add(p, 0.02, -0.08, 0.05), gr: 0.82, l: pinHand, gl: 0.9, nod: -0.12, lean: 0.05, props: u < 0.75 ? { photo: p } : {}, n };
      }
      case 'spool': {
        const s = lerpV(EB.spool, c.bd(0.14, 0.58 * c.H, 0.22), sm(u, 0.1, 0.8));
        return { l: add(s, 0, 0.02, 0.02), gl: 0.86, r: add(EB.from, 0, 0, 0.04), gr: 0.8, nod: -0.02, lean: 0.04, props: { spool: s }, n };
      }
      case 'pull': {
        const e = sm(u, 0.05, 0.95);
        const end = lerpV(EB.from, EB.slot, e);
        return { r: add(end, 0, -0.03, 0.05), gr: 0.86, l: c.bd(0.16, 0.58 * c.H, 0.22), gl: 0.86, nod: -0.08 - 0.08 * e, lean: 0.04, props: { spool: c.bd(0.16, 0.58 * c.H, 0.22), end }, n };
      }
      case 'tie': {
        const a = u * PI * 6;
        return { r: add(EB.slot, 0.02 * Math.cos(a), 0.01 + 0.02 * Math.sin(a), 0.05), gr: 0.75, l: add(EB.slot, -0.08, -0.01, 0.05), gl: 0.72, nod: -0.14, lean: 0.05, n };
      }
      case 'back':
        return { l: chin(c), gl: 0.5, r: c.bd(-0.1, 0.62 * c.H, 0.16), gr: 0.6, nod: -0.12 + 0.03 * Math.sin(c.t * 1.2), lean: -0.03, n };
      default: {
        const p: V = [-0.26, 1.6, -0.33];
        return { r: add(p, 0.01, -0.02, 0.05 + 0.05 * (1 - sm(u, 0.3, 0.5))), gr: 0.75, l: rest(c).l, nod: -0.1, lean: 0.03, props: u < 0.45 ? { sticky: add(p, 0, 0, 0.04) } : {}, n };
      }
    }
  },
};

const REVIEW: Script = {
  seq: [['show', 3.2], ['argue', 3.4], ['listen', 3], ['take', 2.6], ['roll', 1.6], ['agree', 2.4]],
  at: (k) => (k === 'listen' || k === 'agree' ? st(-0.3, 0.3, PI - 0.5) : st(-0.1, 0.14)),
  key(k, u, c) {
    const n: Record<string, number> = { mate: 1, off: k === 'take' ? sm(u, 0.2, 0.9) : k === 'roll' || k === 'agree' ? 1 : 0, matePoint: k === 'listen' ? 1 : 0, mateNod: k === 'agree' ? 1 : 0 };
    switch (k) {
      case 'show':
        return { r: add(EB.wrongA, 0.15 * frac(u * 1.5), -0.1 * frac(u * 1.5), 0.08), gr: 0.25, palms: 0.5, l: rest(c).l, nod: -0.12, lean: 0.04, n };
      case 'argue':
        return { l: c.bd(0.24, 0.66 * c.H + 0.04 * Math.sin(c.t * 3.4), 0.2), r: c.bd(-0.24, 0.66 * c.H - 0.04 * Math.sin(c.t * 3.4), 0.2), palms: 0.85, gl: 0.2, gr: 0.2, nod: 0.03, n };
      case 'listen':
        return { l: chin(c), gl: 0.5, r: c.bd(-0.1, 0.62 * c.H, 0.16), gr: 0.6, nod: 0.03 + 0.04 * Math.sin(c.t * 2), n };
      case 'take': {
        const p = lerpV(EB.wrongB, EB.wrongA, sm(u, 0.2, 0.9));
        return { r: add(p, 0, -0.03, 0.05), gr: 0.82, l: add(EB.wrongA, -0.05, -0.02, 0.05), gl: 0.72, nod: -0.1, lean: 0.05, n };
      }
      case 'roll': {
        const a = u * PI * 6;
        const h = c.bd(-0.02, 0.62 * c.H, 0.24);
        return { r: add(h, -0.04 * Math.cos(a), 0.03 * Math.sin(a), 0), gr: 0.75, l: add(h, 0.05, 0, 0), gl: 0.75, nod: 0.3, n };
      }
      default:
        return { r: c.bd(-0.22, 0.62 * c.H + 0.04 * Math.sin(c.t * 4), 0.22), gr: 0.2, palms: 0.8, l: rest(c).l, nod: 0.05, n };
    }
  },
};

// =============================================================================================
// 신호 청취석 (icSignalDesk, 1 × 1): receivers along the back, the big tuning dial, the pad and the code book.

export const SD = {
  seat: [0, 0.47, 0.76] as V,
  dial: [0.26, 0.82, 0.22] as V,
  hook: [-0.46, 1.0, 0.12] as V,
  pad: [-0.1, 0.757, 0.26] as V,
  book: [-0.42, 0.77, 0.26] as V,
  keys: [0.04, 0.76, 0.26] as V,
};
const DECODE: Script = {
  seq: [['headset', 2.4], ['tune', 4], ['listen', 2.8], ['dots', 3.6], ['book', 3], ['type', 3], ['off', 1.8]],
  at: () => sat(SD.seat),
  key(k, u, c) {
    const onHead = k !== 'headset' && k !== 'off' ? 1 : k === 'headset' ? sm(u, 0.25, 0.8) : 1 - sm(u, 0.15, 0.75);
    const n: Record<string, number> = { on: 1, tune: k === 'tune' ? u : c.p('tune'), rec: k === 'listen' || k === 'dots' ? 1 : 0, dots: k === 'dots' ? u : c.p('dots'), words: k === 'type' ? u : c.p('type'), head: onHead };
    const h = lerpV(SD.hook, crown(c), onHead);
    const props = { headset: h };
    const dial = add(SD.dial, 0.02 * Math.cos(c.t * 2), 0.05, 0.02 * Math.sin(c.t * 2));
    switch (k) {
      case 'headset':
      case 'off':
        return { l: add(h, 0.09, -0.08, 0.02), gl: 0.86, r: k === 'off' ? c.bd(-0.14, 0.28, 0.28) : add(SD.dial, 0, 0.05, 0.02), gr: 0.4, nod: 0.1, lean: 0.04 + 0.18 * (1 - onHead), props, n };
      case 'tune':
        return { r: dial, gr: 0.86, l: add(ear(c, 1), 0.01, -0.03, 0), gl: 0.55, nod: 0.08, lean: 0.12, props, n };
      case 'listen':
        return { l: add(ear(c, 1), 0.01, -0.03, 0), gl: 0.55, r: add(SD.dial, 0, 0.05, 0.02), gr: 0.7, nod: 0.18 + 0.05 * Math.sin(c.t * 5), lean: 0.1, props, n };
      case 'dots': {
        const p = add(SD.pad, -0.06 + 0.12 * frac(u * 3), 0.01, -0.03 + 0.05 * Math.floor(u * 3) * 0.5);
        return { r: add(p, 0.01, 0.06 + 0.006 * Math.sin(c.t * 26), 0.03), gr: 0.92, l: add(ear(c, 1), 0.01, -0.03, 0), gl: 0.55, nod: 0.32, lean: 0.14, props: { ...props, pen: p }, n };
      }
      case 'book': {
        const p = add(SD.book, -0.03 + 0.06 * Math.sin(u * 4), 0.03, -0.05 + 0.1 * frac(u * 2));
        return { l: p, gl: 0.3, palms: 0.2, r: add(SD.pad, 0.08, 0.06, 0.03), gr: 0.85, nod: 0.36, lean: 0.16, props, n };
      }
      default:
        return typing(c, SD.keys, n, props, 0.14);
    }
  },
};

// =============================================================================================
// 보안 문서 금고 (icDocSafe, 1 × 1): a dial and a handle on a heavy door hung on its left.

export const DS = {
  dial: [0.06, 0.88, 0.035] as V,
  handle: [0.06, 0.68, 0.05] as V,
  /** Inside, the folder's place. */
  inside: [0, 0.82, -0.14] as V,
  log: [0.42, 1.06, -0.06] as V,
};
const SAFE_AT = st(0, 0.5);
const SAFE: Script = {
  seq: [['dial', 3.8], ['handle', 1.2], ['open', 1.4], ['put', 2.4], ['take', 2.2], ['shut', 1.6], ['spin', 1.2], ['sign', 2.4]],
  at: (k) => (k === 'sign' ? st(0.2, 0.42, PI - 0.3) : SAFE_AT),
  key(k, u, c) {
    const open = k === 'open' ? sm(u, 0.1, 0.9) : k === 'put' || k === 'take' ? 1 : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : 0;
    const n: Record<string, number> = { open, dial: k === 'dial' ? u : k === 'spin' ? 1 + u * 3 : 1, handle: k === 'handle' ? sm(u, 0.3, 0.8) : k === 'open' || k === 'put' || k === 'take' ? 1 : k === 'shut' ? 1 - sm(u, 0.7, 1) : 0, signed: k === 'sign' ? u : 0, unlocked: k === 'handle' || k === 'open' || k === 'put' || k === 'take' || k === 'shut' ? 1 : 0, filed: c.p('put', 0.6, 0.8) };
    const low = 0.22;
    switch (k) {
      case 'dial': {
        const a = Math.sin(u * PI * 3) * 0.3;
        const p = add(DS.dial, 0.022 * Math.cos(a * 4), 0.018 * Math.sin(a * 4), 0.05);
        return { r: p, gr: 0.86, l: c.bd(0.16, 0.5 * c.H, 0.16), nod: 0.3, lean: 0.14, crouch: low, n };
      }
      case 'handle':
        return { r: add(DS.handle, 0.0, 0.0, 0.04), gr: 0.9, l: add(DS.dial, -0.1, 0.1, 0.05), gl: 0.3, nod: 0.3, lean: 0.14, crouch: low, n };
      case 'open':
        return { r: add(DS.handle, -0.28 * sm(u, 0, 1), 0, 0.1 + 0.22 * sm(u, 0, 1)), gr: 0.9, l: c.bd(0.16, 0.5 * c.H, 0.16), nod: 0.26, lean: 0.08, crouch: low * 0.6, n };
      case 'put': {
        const p = lerpV(c.bd(0, 0.58 * c.H, 0.24), DS.inside, sm(u, 0.1, 0.75));
        return { r: add(p, 0.03, 0, 0.09), gr: 0.82, l: add(p, -0.08, 0, 0.09), gl: 0.72, nod: 0.3, lean: 0.24, crouch: low, props: u < 0.8 ? { file: p } : {}, n };
      }
      case 'take': {
        const p = lerpV(add(DS.inside, 0.0, -0.3, 0), c.bd(0, 0.58 * c.H, 0.24), sm(u, 0.25, 0.9));
        return { r: add(p, 0.03, 0, 0.09), gr: 0.82, l: add(p, -0.08, 0, 0.09), gl: 0.72, nod: 0.34, lean: 0.24, crouch: low, props: { file2: p }, n };
      }
      case 'shut':
        return { r: add(DS.handle, -0.28 * (1 - sm(u, 0, 1)), 0, 0.1 + 0.22 * (1 - sm(u, 0, 1))), gr: 0.9, l: c.bd(0.16, 0.58 * c.H, 0.24), gl: 0.8, nod: 0.26, lean: 0.08, crouch: low * 0.6, props: { file2: c.bd(0.16, 0.58 * c.H, 0.24) }, n };
      case 'spin':
        return { r: add(DS.dial, 0.022 * Math.cos(u * 18), 0.018 * Math.sin(u * 18), 0.05), gr: 0.86, l: c.bd(0.16, 0.58 * c.H, 0.24), gl: 0.8, nod: 0.26, lean: 0.14, crouch: low, props: { file2: c.bd(0.16, 0.58 * c.H, 0.24) }, n };
      default: {
        const p = add(DS.log, -0.04 + 0.08 * frac(u * 2.5), -0.05 + 0.03 * Math.sin(u * 13), 0.01);
        return { r: add(p, 0.01, 0.05, 0.05), gr: 0.92, l: c.bd(0.18, 0.58 * c.H, 0.2), gl: 0.8, nod: 0.26, lean: 0.14, props: { file2: c.bd(0.18, 0.58 * c.H, 0.2), pen: p }, n };
      }
    }
  },
};

// =============================================================================================
// 작전 회의 테이블 (icBriefTable, 3 × 1): the map on the table, tokens on it; the chairs round it are the room's own, at
// x -1 and 0 on both sides (the layout's), the end at x 1 left for whoever's leading.

export const BT = {
  top: 0.74,
  stand: [1.02, 0.64] as const,
  /** The stack of folders, the projector's switch. */
  stack: [1.14, 0.78, 0.18] as V,
  projector: [0.74, 0.84, -0.16] as V,
  token: [0.5, 0.77, 0.08] as V,
  tokenTo: [-0.82, 0.77, -0.1] as V,
  /** Who's drawn sat: [x, z, ry]. */
  seats: [[-1, -1, 0], [0, -1, 0], [-1, 1, Math.PI], [0, 1, Math.PI]] as ReadonlyArray<readonly [number, number, number]>,
};
const CONVENE: Script = {
  seq: [['stack', 2.2], ['switch', 1.4], ['talk', 3.2], ['stick', 1.4], ['push', 4.4], ['question', 3], ['round', 2.6]],
  at: (k) => (k === 'push' || k === 'stick' ? st(0.72, 0.62, PI - 0.5) : st(BT.stand[0], BT.stand[1], PI - 0.4)),
  key(k, u, c) {
    const n: Record<string, number> = { lit: c.p('switch', 0.4, 0.6), folders: k === 'stack' ? u : 1, moved: k === 'push' ? sm(u, 0.1, 0.9) : k === 'question' || k === 'round' ? 1 : 0, hand: k === 'question' ? 1 : 0, nods: k === 'round' ? 1 : 0 };
    switch (k) {
      case 'stack': {
        const p = add(BT.stack, 0, 0.02, 0);
        return { l: add(p, -0.08, 0.02, 0.03), r: add(p, 0.08, 0.02, 0.03), gl: 0.7, gr: 0.7, nod: 0.36, lean: 0.18, n };
      }
      case 'switch':
        return { r: add(BT.projector, 0.06, 0.08 - 0.03 * Math.abs(Math.sin(u * PI)), 0.08), gr: 0.2, l: rest(c).l, nod: 0.3, lean: 0.24, n };
      case 'talk':
        return { l: c.bd(0.24, 0.64 * c.H + 0.04 * Math.sin(c.t * 2.8), 0.2), r: c.bd(-0.24, 0.62 * c.H - 0.04 * Math.sin(c.t * 2.8), 0.2), palms: 0.85, gl: 0.2, gr: 0.2, nod: 0.08, lean: 0.03, n };
      case 'stick':
        return { r: c.bd(-0.18, 0.62 * c.H, 0.3), gr: 0.9, l: c.bd(0.1, 0.6 * c.H, 0.26), gl: 0.86, nod: 0.26, lean: 0.1, props: { stickEnd: BT.token }, n };
      case 'push': {
        const p = lerpV(BT.token, BT.tokenTo, sm(u, 0.1, 0.9));
        return { r: c.bd(-0.18, 0.62 * c.H, 0.3), gr: 0.9, l: c.bd(0.1, 0.6 * c.H, 0.26 + 0.02 * Math.sin(u * 8)), gl: 0.86, nod: 0.34, lean: 0.16, props: { stickEnd: p }, n };
      }
      case 'question':
        return { l: chin(c), gl: 0.5, r: c.bd(-0.1, 0.62 * c.H, 0.16), gr: 0.6, nod: 0.08 + 0.04 * Math.sin(c.t * 2.3), n };
      default:
        return { r: c.bd(-0.2 + 0.4 * frac(u * 2), 0.76 * c.H, 0.34), gr: 0.25, palms: 0.5, l: rest(c).l, nod: 0.05, lean: 0.04, n };
    }
  },
};

// =============================================================================================
// 출입 관리대 (icBadgeDesk, 2 × 1): on the left the door panel with its reader, on the right the counter and the printer.

export const BD = {
  counterTop: 0.92,
  log: [0.26, 0.94, -0.1] as V,
  printer: [0.74, 1.02, -0.2] as V,
  printerOut: [0.56, 0.95, -0.06] as V,
  box: [0.04, 0.97, -0.14] as V,
  reader: [-0.58, 1.22, -0.4] as V,
  /** Where the visitor waits, and where they tap. */
  wait: [-0.42, 0.72] as const,
  tap: [-0.58, -0.04] as const,
};
const BADGE: Script = {
  seq: [['hello', 2.2], ['card', 2.4], ['print', 2.6], ['lanyard', 2.6], ['phone', 2.4], ['tap', 3.2], ['log', 2.2]],
  at: () => st(0.36, 0.42),
  key(k, u, c) {
    const walk = k === 'tap' ? sm(u, 0, 0.35) : 0;
    const n: Record<string, number> = { there: k === 'hello' ? sm(u, 0, 0.5) : k === 'log' ? 1 - sm(u, 0, 0.5) : 1, printing: k === 'print' ? u : 0, wears: c.p('lanyard', 0.75, 0.9), phone: c.p('phone', 0.3, 0.7), toTap: k === 'log' ? 1 : walk, tap: k === 'tap' ? sm(u, 0.4, 0.55) * (1 - sm(u, 0.85, 1)) : 0, green: k === 'tap' ? sm(u, 0.5, 0.55) : k === 'log' ? 1 : 0, logged: k === 'log' ? u : c.p('log'), gives: k === 'card' ? 1 : 0, faceDweller: k === 'hello' || k === 'card' || k === 'print' || k === 'lanyard' || k === 'phone' ? 1 : 0 };
    switch (k) {
      case 'hello':
        return { r: c.bd(-0.22, 0.62 * c.H, 0.26), gr: 0.25, palms: 0.8, l: rest(c).l, nod: 0.05, n };
      case 'card': {
        const p = lerpV([-0.1, 1.02, 0.42], add(BD.log, -0.12, 0.04, 0.02), sm(u, 0.15, 0.7));
        return { l: add(p, 0.0, 0.0, 0.03), gl: 0.8, r: add(BD.log, 0.03, 0.05, 0.05), gr: 0.4, nod: 0.3, lean: 0.14, props: { card: p }, n };
      }
      case 'print': {
        const s = add(BD.printerOut, 0, 0, 0.06 * sm(u, 0.1, 0.7));
        return { r: add(s, 0.02, 0.05, 0.05), gr: u > 0.65 ? 0.82 : 0.3, l: rest(c).l, nod: 0.3, lean: 0.14, props: { badge: u > 0.08 ? s : null }, n };
      }
      case 'lanyard': {
        const p = lerpV(add(BD.printerOut, 0, 0.04, 0.06), [-0.32, 1.1, 0.6], sm(u, 0.05, 0.7));
        return { r: add(p, 0.03, 0, 0.0), gr: 0.82, l: add(p, -0.08, 0.02, 0.0), gl: 0.5, nod: 0.05, lean: 0.03, props: u < 0.8 ? { badge: p } : {}, n };
      }
      case 'phone': {
        const b = add(BD.box, 0, 0.02, 0.05);
        return { r: add(b, 0.03, 0.05, 0.05), gr: 0.4, l: rest(c).l, nod: 0.28, lean: 0.14, n };
      }
      case 'tap':
        return { r: c.bd(-0.22, 0.56 * c.H, 0.14), l: rest(c).l, nod: -0.02, n };
      default: {
        const p = add(BD.log, -0.05 + 0.1 * frac(u * 3), 0.012, 0.02 * Math.sin(u * 13));
        return { r: add(p, 0.01, 0.06, 0.03), gr: 0.92, l: add(BD.log, -0.13, 0.03, 0.03), gl: 0.4, nod: 0.34, lean: 0.16, props: { pen: p }, n };
      }
    }
  },
};

// =============================================================================================
// 현장 장비 사물함 (icGearLocker, 2 × 1): a locker at the left whose door opens, a peg board at the right.

export const GL = {
  door: [-0.92, -0.02] as const,
  radio: [0.28, 1.28, -0.36] as V,
  bino: [0.66, 1.28, -0.36] as V,
  list: [0.16, 1.62, -0.39] as V,
  shelf: [0.5, 0.88, -0.2] as V,
};
const KIT: Script = {
  seq: [['open', 1.6], ['list', 2.2, 0.8], ['radio', 1.6, 0.8], ['test', 2.8], ['down', 1.1], ['bino', 1.5], ['look', 2.8], ['hang', 1.5], ['tick', 2.2, 0.8], ['shut', 1.5]],
  at: (k) => (k === 'open' || k === 'shut' ? st(-0.3, 0.5) : k === 'list' || k === 'tick' ? st(0.04, 0.18) : k === 'bino' || k === 'look' || k === 'hang' ? st(0.56, 0.18) : st(0.26, 0.18)),
  key(k, u, c) {
    const n: Record<string, number> = { open: k === 'open' ? sm(u, 0.2, 0.9) : k === 'shut' ? 1 - sm(u, 0.1, 0.8) : 1, led: k === 'test' ? 1 : 0, ticks: k === 'tick' ? u : c.p('tick'), noRadio: k === 'radio' || k === 'test' ? 1 : 0, noBino: k === 'bino' || k === 'look' ? 1 : 0 };
    const doorHandle: V = [-0.92 + 0.72 * Math.cos((PI / 2 + 0.05) * n.open), 1.05, -0.02 + 0.72 * Math.sin((PI / 2 + 0.05) * n.open)];
    switch (k) {
      case 'open':
      case 'shut':
        return { l: add(doorHandle, 0.02, 0, 0.03), gl: 0.88, r: rest(c).r, nod: 0.1, lean: 0.05, n };
      case 'list':
        return { r: add(GL.list, 0.05 * Math.sin(u * 6), -0.06 + 0.12 * frac(u), 0.05), gr: 0.25, palms: 0.3, l: rest(c).l, nod: -0.04, lean: 0.06, n };
      case 'radio': {
        const p = lerpV(GL.radio, c.bd(0.08, 0.82 * c.H, 0.2), sm(u, 0.1, 0.9));
        return { l: add(p, 0, -0.05, 0), gl: 0.88, r: rest(c).r, nod: -0.02, lean: 0.05, props: { radio: p }, n };
      }
      case 'test': {
        const p = c.bd(0.08, 0.82 * c.H, 0.2);
        return { l: add(p, 0, -0.05, 0), gl: 0.88, r: add(p, -0.03, -0.02 - 0.008 * Math.abs(Math.sin(c.t * 7)), 0.03), gr: 0.4, nod: 0.08, props: { radio: p }, n };
      }
      case 'down': {
        const p = lerpV(c.bd(0.08, 0.82 * c.H, 0.2), GL.radio, sm(u, 0.1, 0.9));
        return { l: add(p, 0, -0.05, 0), gl: 0.88, r: rest(c).r, nod: -0.02, lean: 0.05, props: { radio: p }, n };
      }
      case 'bino': {
        const p = lerpV(GL.bino, c.bd(0, 0.93 * c.H, 0.14), sm(u, 0.1, 0.95));
        return { l: add(p, 0.06, -0.02, 0.02), r: add(p, -0.06, -0.02, 0.02), gl: 0.88, gr: 0.88, nod: 0, props: { bino: p }, n };
      }
      case 'look': {
        const p = c.bd(0, 0.93 * c.H, 0.14);
        return { l: add(p, 0.06, -0.02, 0.02), r: add(p, -0.06, -0.02, 0.02), gl: 0.88, gr: 0.88, nod: -0.02, props: { bino: p }, n };
      }
      case 'hang': {
        const p = lerpV(c.bd(0, 0.93 * c.H, 0.14), GL.bino, sm(u, 0.1, 0.9));
        return { l: add(p, 0.06, -0.02, 0.02), r: add(p, -0.06, -0.02, 0.02), gl: 0.88, gr: 0.88, nod: 0.02, props: { bino: p }, n };
      }
      default: {
        const p = add(GL.list, -0.04 + 0.08 * frac(u * 2.5), 0.05 - 0.14 * u, 0.008);
        return { r: add(p, 0.01, 0.0, 0.05), gr: 0.92, l: rest(c).l, nod: -0.02, lean: 0.06, props: { pen: p }, n };
      }
    }
  },
};

// =============================================================================================
// 체력 단련 매트 (icDefenseMat, 2 × 2): a padded dummy to the back left; the dweller faces it across the mat, seen side on.

export const DM = {
  dummy: [-0.48, -0.36] as const,
  chest: [-0.48, 1.12, -0.36] as V,
  head: [-0.48, 1.38, -0.36] as V,
  stand: [0.02, -0.02] as const,
  towel: [0.78, 0.33, -0.74] as V,
  yaw: Math.atan2(-0.5, -0.34),
};
const FIGHT = st(DM.stand[0], DM.stand[1], DM.yaw);
const SPAR: Script = {
  seq: [['guard', 1.6], ['jab', 2.4], ['cross', 2.6], ['block', 2.2], ['combo', 3.2], ['breath', 2], ['towel', 2.4, 0.9]],
  at: (k) => (k === 'towel' ? st(0.56, -0.28, 2.69) : FIGHT),
  key(k, u, c) {
    const n: Record<string, number> = { hit: 0 };
    const guardL = c.bd(0.1, 0.8 * c.H, 0.2);
    const guardR = c.bd(-0.1, 0.78 * c.H, 0.17);
    const toward = (target: V, hand: V, e: number) => lerpV(hand, target, e);
    const pulse = (rate: number) => Math.max(0, Math.sin(u * PI * 2 * rate));
    switch (k) {
      case 'guard':
        return { l: guardL, r: guardR, gl: 0.95, gr: 0.95, nod: 0.08, lean: 0.08, crouch: 0.05 + 0.02 * Math.sin(c.t * 4), n };
      case 'jab': {
        const e = pulse(2);
        n.hit = e > 0.85 ? 1 : 0;
        return { l: toward(add(DM.chest, 0, 0.08, 0.1), guardL, e), r: guardR, gl: 0.95, gr: 0.95, nod: 0.04, lean: 0.12 + 0.06 * e, crouch: 0.05, n };
      }
      case 'cross': {
        const e = pulse(1.5);
        n.hit = e > 0.85 ? 2 : 0;
        return { r: toward(add(DM.chest, 0.02, 0.04, 0.08), guardR, e), l: guardL, gl: 0.95, gr: 0.95, nod: 0.04, lean: 0.14 + 0.1 * e, crouch: 0.05, n };
      }
      case 'block': {
        const e = Math.abs(Math.sin(u * PI * 2));
        return { l: add(guardL, 0.02 * e, 0.1 * e, 0.02), r: add(guardR, 0, 0.1 * e, 0), gl: 0.95, gr: 0.95, nod: 0.2 * e, lean: 0.02, crouch: 0.05 + 0.12 * e, n };
      }
      case 'combo': {
        const i = Math.floor(u * 6);
        const v = Math.sin(frac(u * 6) * PI);
        n.hit = v > 0.9 ? 1 + (i % 2) : 0;
        return { l: i % 2 ? guardL : toward(add(DM.chest, -0.02, 0.06, 0.1), guardL, v), r: i % 2 ? toward(add(DM.chest, 0.02, 0.02, 0.1), guardR, v) : guardR, gl: 0.95, gr: 0.95, nod: 0.04, lean: 0.16 + 0.06 * v, crouch: 0.07, n };
      }
      case 'breath': {
        const b = 0.03 * Math.sin(c.t * 2.2);
        return { l: c.bd(0.2, 0.58 * c.H + b, 0.08), r: c.bd(-0.2, 0.58 * c.H + b, 0.08), palms: 0.2, nod: 0.24, lean: 0.22, n };
      }
      default: {
        const p = lerpV(DM.towel, c.bd(0, 0.9 * c.H, 0.12), sm(u, 0.1, 0.45));
        const w = u > 0.45 ? 0.05 * Math.sin(u * 22) : 0;
        return { r: add(p, -0.06 + w, 0, 0), l: add(p, 0.06 + w, 0, 0), gl: 0.8, gr: 0.8, nod: 0.08, crouch: u < 0.25 ? 0.4 * (1 - u / 0.25) : 0, props: { towel: add(p, w, -0.02, 0.02) }, n };
      }
    }
  },
};

const SCRIPTS: Record<IcMotion, Script> = { icAnalyze: ANALYZE, icWrite: WRITE, icLiaison: LIAISON, icCase: CASE, icMonitor: MONITOR, icCrisis: CRISIS, icTeamBrief: TEAM_BRIEF, icTrace: TRACE, icPatch: PATCH, icPin: PIN, icReview: REVIEW, icDecode: DECODE, icSafe: SAFE, icConvene: CONVENE, icBadge: BADGE, icKit: KIT, icSpar: SPAR };
