import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 타투 스튜디오 (2026-11-01, the workplace pipeline, at the user's request). Each motion is a round of beats:
 * where the dweller is, where the hands go, and what moves. The piece reads the same script by the same clock
 * (tattooArtist.ts), so the needle on the skin is what lays the line down, and the stencil that comes out of the copier
 * is the design that was traced. Each new round is the next invented design. The client is always a grown-up and the
 * work is only ever on a forearm or a calf.
 *
 * - 시술 의자 (tattooChair): ttWork, a client of the game's sat in it, their right forearm in their lap: gloves on from
 *   the trolley, the skin cleaned, the stencil pressed on, the needle dipped, the line, dipped again, the shading, wiped,
 *   film over it. ttTalk: stood by them, the design held to the arm, a dot marked. ttPrep: the bed sprayed and wiped, paper
 *   drawn down it, the ink caps set out, a cartridge opened and fitted. ttSkin: a client drawn with the arm on the rest,
 *   looked over through the lens and pressed, the chart written. ttDemo: the live demonstration, a calf on the rest, a
 *   camera on it and people watching.
 * - 도안 벽 (flashWall): ttFlash: a new sheet roughed, inked, coloured and pinned up. ttCover: an old mark's photo under
 *   tracing paper, a design worked out to cover it. ttTeach: an apprentice at the board, the line shown and corrected.
 * - 스텐실 작업대 (ttStencilTable): ttTrace sat at the light box, ttCopy at the thermal copier and its scissors.
 * - 잉크·멸균 선반 (ttInkShelf): ttInk: a bottle down, shaken, its date read and written up. ttLoad: pouches sealed and
 *   loaded, the cycle run, the indicator strip read.
 * - 상담 테이블 (ttConsultTable): ttAlbum: the portfolio's pages turned for a client, a sketch on the tablet.
 * - 애프터케어 카운터 (ttAftercareCounter): ttCare: the card, the cream, film wrapped round a client's forearm, the bill.
 * - 연습대 (ttPracticeBench): ttPractice: a silicone forearm tattooed from the same steps.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). All names and
 * designs are made up.
 */
export type TtMotion = 'ttWork' | 'ttTalk' | 'ttPrep' | 'ttSkin' | 'ttDemo' | 'ttFlash' | 'ttCover' | 'ttTeach' | 'ttTrace' | 'ttCopy' | 'ttInk' | 'ttLoad' | 'ttAlbum' | 'ttCare' | 'ttPractice';
export const TT_MOTIONS = new Set<string>(['ttWork', 'ttTalk', 'ttPrep', 'ttSkin', 'ttDemo', 'ttFlash', 'ttCover', 'ttTeach', 'ttTrace', 'ttCopy', 'ttInk', 'ttLoad', 'ttAlbum', 'ttCare', 'ttPractice']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ttPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.571);
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
export interface TtNow {
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
export function ttNow(m: TtMotion, t: number, ph: number, H = 1.6): TtNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  // A dweller sits or gets up at the middle of the move, the height going with it.
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
export function ttPose(m: TtMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = ttNow(m, t, ttPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** The machine's needle at `p`, the hand on its grip above and behind (the machine leans back from the needle along -x). */
const gripOf = (p: V): V => add(p, -0.055, 0.075, 0);

// =============================================================================================
// 시술 의자 (tattooChair, 1 × 2): the client sat at the front of the bed, the back raised behind them, an arm rest and
// ink plate on the left as you face it, the stool beyond that, the trolley behind the stool.

export const TC = {
  seat: 0.54,
  seatZ: 0.38,
  /** The stool, for the arm in the lap and for the calf. */
  stool: [-0.62, 0.47, 0.4] as V,
  stoolCalf: [-0.62, 0.47, 0.72] as V,
  plate: [-0.4, 0.725, 0.68] as V,
  tray: [-0.64, 0.84, -0.46] as V,
  bottle: [-0.76, 0.85, -0.34] as V,
  paper: [0, 0.57, -0.14] as V,
  /** The rest's pad and a forearm drawn on it (the client's right, wrist out to +z). */
  restTop: 0.7,
  restHand: [-0.36, 0.74, 0.54] as V,
  restElbow: [-0.38, 0.76, 0.27] as V,
  /** Someone of the game's sat here has their hands in their lap (activity.ts `lap`): the right wrist, then on up the forearm. */
  lapWrist: [-0.115, 0.69, 0.61] as V,
  lapElbow: [-0.145, 0.838, 0.478] as V,
  /** The right calf up on the rest for a demonstration: ankle and knee. */
  calfAnkle: [-0.12, 0.4, 0.8] as V,
  calfKnee: [-0.1, 0.78, 0.66] as V,
};
const along = (a: V, b: V, u: number): V => lerpV(a, b, u);
const STOOL = sat(TC.stool, PI / 2);
const STOOL_CALF = sat(TC.stoolCalf, PI / 2);
const AT_TROLLEY = st(-0.64, -0.02, PI);
/** On the arm in the lap: `u` from the wrist up, with the needle's point on the side towards the artist. */
const onLap = (u: number): V => add(along(TC.lapWrist, TC.lapElbow, 0.2 + 0.6 * u), -0.042, 0.012, 0.016);
const onCalf = (u: number): V => add(along(TC.calfAnkle, TC.calfKnee, 0.22 + 0.56 * u), -0.058, 0.004, 0.004);
const onRest = (u: number): V => add(along(TC.restHand, TC.restElbow, 0.15 + 0.7 * u), -0.012, 0.042, 0);
/** One pass of the needle along a limb: back and forth a little each way, working on up. */
const needle = (on: (u: number) => V, u: number, wob = 0.012): V => add(on(u), wob * Math.sin(u * 37), 0.003 * Math.sin(u * 91), wob * Math.cos(u * 29));
function gun(p: V, left: V, n: Record<string, number>, props: Record<string, V | null | undefined> = {}): Key {
  return { r: gripOf(p), gr: 0.92, l: left, gl: 0.55, lean: 0.22, nod: 0.42, props: { machine: p, ...props }, n: { ...n, buzz: 1 } };
}
function dipKey(u: number, n: Record<string, number>, left: V, cap: number): Key {
  const inCap = add(TC.plate, -0.04 + cap * 0.035, 0.008, 0);
  const lift = Math.abs(Math.sin(u * PI));
  const p = add(inCap, -0.01, 0.05 * lift, 0);
  return { r: gripOf(p), gr: 0.92, l: left, gl: 0.5, lean: 0.14, nod: 0.3, props: { machine: p }, n };
}

const WORK: Script = {
  seq: [['glove', 1.8], ['clean', 2.2], ['press', 2.1], ['dip', 1.1], ['line', 4.8], ['dip2', 1.1], ['shade', 3.9], ['wipe', 1.8], ['film', 2.2], ['look', 1.5]],
  at: (k) => (k === 'glove' ? AT_TROLLEY : STOOL),
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, stencil: c.p('press', 0.25, 0.75), line: c.p('line', 0.02, 0.98), shade: c.p('shade', 0.02, 0.98), film: c.p('film', 0.15, 0.9), wet: k === 'clean' ? sm(u, 0.2, 0.5) : k === 'press' ? 1 - sm(u, 0, 0.3) : 0, sleeve: k === 'glove' ? 0 : 1 };
    const stretch = add(onLap(0.95), -0.018, 0.014, 0.02);
    switch (k) {
      case 'glove': {
        const a = add(TC.tray, 0.24, 0.03, 0.07);
        const snap = Math.sin(u * PI * 3);
        return { l: add(a, 0.03 * snap, 0.08 + 0.05 * snap, 0.14), r: add(a, -0.04 * snap, 0.06, 0.16), gl: 0.6, gr: 0.6, nod: 0.36, n };
      }
      case 'clean': {
        const up = sm(u, 0, 0.3);
        const bottle = lerpV(add(TC.plate, 0.05, 0.02, 0.0), add(onLap(0.5), -0.1, 0.14, 0.03), up);
        const towel = add(onLap(0.2 + 0.6 * frac(u * 2.5)), -0.008, 0.012, 0.016);
        return { r: add(bottle, -0.01, 0.03, 0), gr: 0.9, l: add(towel, -0.006, 0.02, 0.014), gl: 0.72, lean: 0.2, nod: 0.38, props: { bottle, towel: u > 0.34 ? towel : null }, n };
      }
      case 'press': {
        const held = lerpV(add(TC.plate, 0.04, 0.03, -0.08), onLap(0.5), sm(u, 0.05, 0.5));
        const off = 1 - sm(u, 0.72, 0.96);
        return { r: add(held, -0.016, 0.03 + 0.03 * sm(u, 0.72, 0.96), 0.02), gr: 0.8, l: add(stretch, 0, 0.01, 0), gl: 0.6, lean: 0.2, nod: 0.4, props: { sheet: off > 0.02 ? add(held, 0, 0.012, 0) : null }, n };
      }
      case 'dip':
        return dipKey(u, n, stretch, 0);
      case 'line':
        return gun(needle(onLap, u), stretch, n);
      case 'dip2':
        return dipKey(u, n, stretch, 2);
      case 'shade':
        return gun(needle(onLap, frac(u * 3), 0.022), stretch, n);
      case 'wipe': {
        const towel = add(onLap(0.2 + 0.6 * frac(u * 2)), -0.008, 0.012, 0.016);
        return { r: gripOf(add(TC.plate, -0.1, 0.02, -0.02)), gr: 0.86, l: add(towel, -0.006, 0.02, 0.014), gl: 0.72, lean: 0.18, nod: 0.36, props: { machine: add(TC.plate, -0.1, 0.02, -0.02), towel }, n };
      }
      case 'film': {
        const a = u * PI * 6;
        const round = add(onLap(0.2 + 0.6 * u), 0.02 * Math.cos(a), 0.02 * Math.sin(a), 0.02 * Math.sin(a));
        return { r: add(round, -0.014, 0.02, 0.02), gr: 0.75, l: add(stretch, 0, 0, 0), gl: 0.5, lean: 0.18, nod: 0.36, n };
      }
      default:
        return { l: c.bd(0.14, 0.22, 0.26), r: c.bd(-0.14, 0.22, 0.26), gl: 0.3, gr: 0.3, lean: -0.02, nod: 0.12 + 0.04 * Math.sin(c.t * 2), n };
    }
  },
};

const STAND_TALK = st(-0.58, 0.9, 2.1);
const TALK: Script = {
  seq: [['show', 2.8], ['turn', 1.8], ['hold', 2.6], ['mark', 2], ['ask', 2.6]],
  at: () => STAND_TALK,
  key(k, u, c) {
    const n: Record<string, number> = { sleeve: 0, on: 0.5, page: k === 'turn' ? u : c.p('turn'), marked: c.p('mark', 0.4, 0.8), held: k === 'hold' || k === 'mark' ? 1 : 0 };
    const book = c.bd(0.04, 0.6 * c.H, 0.28);
    const armAt = onLap(0.5);
    switch (k) {
      case 'show':
        return { l: add(book, 0.13, -0.02, 0.01), r: add(book, -0.13, -0.02, 0.01), gl: 0.8, gr: 0.8, nod: 0.26, lean: 0.08, props: { album: book }, n };
      case 'turn': {
        const a = u * PI;
        return { l: add(book, 0.13, -0.02, 0.01), gl: 0.8, r: add(book, -0.1 * Math.cos(a), 0.05 + 0.06 * Math.sin(a), 0.03), gr: 0.6, nod: 0.3, lean: 0.08, props: { album: book }, n };
      }
      case 'hold': {
        const s = lerpV(c.bd(0, 0.62 * c.H, 0.3), armAt, sm(u, 0.05, 0.5));
        return { l: add(s, 0.02, 0.022, 0.018), gl: 0.75, r: rest(c).r, lean: 0.2, nod: 0.42, props: { sheet: s }, n };
      }
      case 'mark': {
        const p = add(armAt, 0.015 * Math.sin(u * 9), 0.01, 0.01);
        return { l: add(armAt, 0.02, 0.022, 0.018), gl: 0.75, r: add(p, -0.01, 0.05, 0.03), gr: 0.92, lean: 0.22, nod: 0.46, props: { sheet: armAt, pen: p }, n };
      }
      default:
        return { l: c.bd(0.16, 0.58 * c.H, 0.24), r: c.bd(-0.18, 0.56 * c.H, 0.2), palms: 0.8, gl: 0.3, gr: 0.3, nod: 0.08 + 0.05 * Math.sin(c.t * 3), lean: 0.05, n };
    }
  },
};

const PREP: Script = {
  seq: [['spray', 1.8], ['wipe', 3], ['paper', 2.6], ['caps', 3], ['cart', 2.6], ['wrap', 2.2], ['lamp', 1.2]],
  at: (k) => (k === 'caps' ? st(-0.74, 0.62, PI / 2) : k === 'cart' || k === 'wrap' ? AT_TROLLEY : k === 'lamp' ? st(-0.74, 0.1, 1) : st(-0.62, 0.44, PI / 2)),
  key(k, u, c) {
    const n: Record<string, number> = { on: k === 'lamp' ? sm(u, 0.3, 0.6) : 0, clean: k === 'wipe' ? u : c.p('wipe'), paper: k === 'paper' ? sm(u, 0.1, 0.9) : c.p('paper'), caps: k === 'caps' ? u * 5 : c.p('caps') * 5, wrap: k === 'wrap' ? sm(u, 0.1, 0.9) : c.p('wrap'), cart: c.p('cart', 0.5, 0.8) };
    const T = TC.tray;
    switch (k) {
      case 'spray': {
        const b = lerpV(TC.bottle, c.bd(-0.12, 0.72 * c.H, 0.3), sm(u, 0.05, 0.4));
        return { r: add(b, 0, 0.02, 0), gr: 0.9, l: rest(c).l, nod: 0.3, props: { spray: b }, n: { ...n, mist: u > 0.45 ? 1 : 0 } };
      }
      case 'wipe': {
        const a = u * PI * 7;
        const p: V = u < 0.5 ? [-0.36 + 0.06 * Math.sin(a), TC.restTop + 0.02, 0.38 + 0.15 * Math.cos(a)] : [-0.1 + 0.2 * Math.sin(a), TC.seat + 0.05, 0.3 + 0.2 * Math.cos(a)];
        return { l: add(p, 0, 0.02, 0.02), gl: 0.7, r: rest(c).r, lean: 0.24, nod: 0.44, crouch: 0.1, props: { towel: p }, n };
      }
      case 'paper': {
        const y = mixN(-0.3, 0.46, sm(u, 0.1, 0.9));
        const p: V = [-0.16, TC.seat + 0.05, y];
        return { l: add(p, 0.02, 0.02, 0.02), r: add(p, 0.16, 0.01, 0.02), gl: 0.72, gr: 0.72, lean: 0.28, nod: 0.44, n };
      }
      case 'caps': {
        const i = Math.floor(u * 5);
        const v = frac(u * 5);
        const to = add(TC.plate, -0.07 + (i % 5) * 0.035, 0.012, 0);
        const from = add(c.bd(-0.1, 0.62 * c.H, 0.2), 0, 0, 0);
        const p = lerpV(from, to, sm(v, 0.15, 0.8));
        return { r: add(p, -0.006, 0.026, 0.01), gr: 0.82, l: add(c.bd(0.12, 0.62 * c.H, 0.24), 0, 0, 0), gl: 0.8, nod: 0.42, lean: 0.14, props: { capbox: c.bd(0.12, 0.62 * c.H, 0.24), cap: v < 0.8 ? p : null }, n };
      }
      case 'cart': {
        const m = add(T, 0.1, 0.03, 0.1);
        const v = sm(u, 0.15, 0.7);
        return { l: add(m, -0.01, 0.03, 0.03), gl: 0.86, r: add(m, 0.06 * (1 - v), 0.03 + 0.08 * (1 - v), 0.03), gr: 0.82, nod: 0.42, lean: 0.14, props: { pack: u < 0.6 ? add(m, 0.07 * (1 - v), 0.08 * (1 - v), 0) : null }, n };
      }
      case 'wrap': {
        const a = u * PI * 7;
        const m = add(T, 0.1, 0.06, 0.1);
        return { l: add(m, -0.01, 0.02, 0.03), gl: 0.86, r: add(m, 0.035 * Math.cos(a), 0.04 + 0.03 * Math.sin(a), 0.035 * Math.sin(a)), gr: 0.7, nod: 0.4, lean: 0.12, n };
      }
      default:
        return { r: [-0.6, 1.5, 0.08], gr: 0.8, l: rest(c).l, nod: -0.08, n };
    }
  },
};

const SKIN: Script = {
  seq: [['hello', 2], ['pull', 1.4], ['lens', 3.6], ['press', 2.6], ['chart', 2.6], ['nod', 1.6]],
  at: () => st(-0.68, 0.46, PI / 2 - 0.1),
  key(k, u, c) {
    const n: Record<string, number> = { on: c.p('pull', 0.2, 0.7), there: k === 'hello' ? sm(u, 0, 0.5) : 1, written: k === 'chart' ? u : c.p('chart'), redness: k === 'press' ? 1 - Math.abs(Math.sin(u * PI * 2)) : 0 };
    const hold = c.bd(0.12, 0.62 * c.H, 0.26);
    switch (k) {
      case 'hello':
        return { ...rest(c), nod: 0.14 + 0.05 * Math.sin(c.t * 3), palms: 0.5, n };
      case 'pull':
        return { r: [-0.52, 1.36, 0.28], gr: 0.86, l: rest(c).l, nod: -0.08, n };
      case 'lens': {
        const p = onRest(0.5 + 0.4 * Math.sin(u * PI * 2));
        const lens = add(p, -0.01, 0.1, 0);
        return { r: add(lens, -0.05, 0.03, 0.02), gr: 0.88, l: add(onRest(0.05), -0.01, 0.015, 0), gl: 0.5, lean: 0.34, nod: 0.5, props: { lens }, n };
      }
      case 'press': {
        const dip = 0.008 * Math.max(0, Math.sin(u * PI * 4));
        const p = add(onRest(0.3 + 0.5 * sm(u, 0, 1)), 0, 0.018 - dip, 0);
        return { r: p, gr: 0.4, l: add(onRest(0.05), -0.01, 0.015, 0), gl: 0.5, lean: 0.32, nod: 0.48, n };
      }
      case 'chart': {
        const w = add(hold, -0.05 + 0.1 * frac(u * 3), 0.02, 0.02 * Math.sin(u * 15));
        return { l: hold, gl: 0.82, r: add(w, -0.006, 0.03, 0.03), gr: 0.92, nod: 0.42, props: { chart: hold, pen: w }, n };
      }
      default:
        return { l: hold, gl: 0.82, r: rest(c).r, nod: 0.06 + 0.06 * Math.sin(c.t * 4), props: { chart: hold }, n };
    }
  },
};

const DEMO: Script = {
  seq: [['greet', 2.6], ['dip', 1.2], ['line', 5.6], ['dip2', 1.2], ['shade', 5], ['wipe', 1.8], ['show', 3]],
  at: (k) => (k === 'greet' || k === 'show' ? st(-0.66, 1.12, 0.9) : STOOL_CALF),
  key(k, u, c) {
    const n: Record<string, number> = { on: 1, there: k === 'greet' ? sm(u, 0, 0.5) : 1, stencil: 1, line: c.p('line', 0.02, 0.98), shade: c.p('shade', 0.02, 0.98), clap: k === 'show' ? 1 : 0, live: 1 };
    const stretch = add(onCalf(0.95), -0.014, 0.014, 0.024);
    switch (k) {
      case 'greet':
        return { r: c.bd(-0.2, 0.86 * c.H + 0.05 * Math.sin(c.t * 6), 0.22), gr: 0.1, l: rest(c).l, palms: 0.9, nod: 0.02, n };
      case 'dip':
      case 'dip2':
        return dipKey(u, n, stretch, k === 'dip' ? 0 : 3);
      case 'line':
        return gun(needle(onCalf, u), stretch, n);
      case 'shade':
        return gun(needle(onCalf, frac(u * 3), 0.022), stretch, n);
      case 'wipe': {
        const towel = add(onCalf(0.2 + 0.6 * frac(u * 2)), -0.01, 0.002, 0.012);
        return { r: gripOf(add(TC.plate, -0.1, 0.02, -0.02)), gr: 0.86, l: add(towel, -0.012, 0.012, 0.01), gl: 0.72, lean: 0.24, nod: 0.44, props: { machine: add(TC.plate, -0.1, 0.02, -0.02), towel }, n };
      }
      default:
        return { l: [TC.calfKnee[0] - 0.14, 0.72, TC.calfKnee[2] + 0.1], gl: 0.2, palms: 0.9, r: c.bd(-0.22, 0.82 * c.H, 0.2), gr: 0.2, nod: 0.04, n };
    }
  },
};

// =============================================================================================
// 도안 벽 (flashWall, 2 × 1): a panel of pinned sheets, a sloping drawing board at waist height before it.

export const FW = {
  stand: 0.56,
  board: [0, 1.0, -0.12] as V,
  tilt: 0.75,
  /** The bare place on the wall a finished sheet goes. */
  slot: [0.32, 1.72, -0.335] as V,
  caps: [0.68, 1.03, -0.1] as V,
};
/** A place on the sloping sheet: u across, v up it (each -1 to 1). */
const onBoard = (u: number, v: number): V => add(FW.board, u * 0.17, 0.018 + v * 0.17 * Math.sin(FW.tilt), -v * 0.17 * Math.cos(FW.tilt));
const scrawl = (u: number, n = 19): V => onBoard(0.8 * Math.sin(u * n), 0.8 - 1.6 * frac(u * 3));
const pencilHand = (p: V): V => add(p, 0.02, 0.05, 0.05);
const lookKey = (c: Ctx, n: Record<string, number>): Key => ({ l: c.bd(0.18, 0.56 * c.H, 0.06), r: c.bd(-0.2, 0.62 * c.H, 0.18), gl: 0.5, gr: 0.5, lean: -0.03, nod: 0.08 + 0.03 * Math.sin(c.t), n });
const AT_BOARD = st(0, FW.stand);
const FLASH: Script = {
  seq: [['look', 1.8], ['rough', 3.2], ['ink', 4], ['dip', 1], ['color', 3], ['back', 1.6], ['pin', 2]],
  at: (k) => (k === 'look' || k === 'back' ? st(-0.08, 0.92) : k === 'pin' ? st(0.32, 0.46) : AT_BOARD),
  key(k, u, c) {
    const n: Record<string, number> = { rough: k === 'rough' ? u : c.p('rough'), ink: k === 'ink' ? u : c.p('ink'), color: k === 'color' ? u : c.p('color'), hung: c.p('pin', 0.72, 0.95), taken: c.p('pin', 0.02, 0.2) };
    const holdL = onBoard(-1.05, -0.8);
    switch (k) {
      case 'look':
        return { ...lookKey(c, n) };
      case 'rough': {
        const p = scrawl(u);
        return { r: pencilHand(p), gr: 0.9, l: holdL, gl: 0.55, lean: 0.2, nod: 0.46, props: { pencil: p }, n };
      }
      case 'ink': {
        const p = scrawl(u, 13);
        return { r: pencilHand(p), gr: 0.92, l: holdL, gl: 0.55, lean: 0.22, nod: 0.5, props: { pen: p }, n };
      }
      case 'dip': {
        const lift = Math.sin(u * PI);
        const p = add(FW.caps, 0, 0.012 + 0.04 * lift, 0);
        return { r: pencilHand(p), gr: 0.92, l: holdL, gl: 0.55, lean: 0.14, nod: 0.42, props: { brush: p }, n };
      }
      case 'color': {
        const p = onBoard(0.6 * Math.sin(u * 23), 0.7 - 1.4 * frac(u * 2));
        return { r: pencilHand(p), gr: 0.88, l: holdL, gl: 0.55, lean: 0.2, nod: 0.46, props: { brush: p }, n };
      }
      case 'back':
        return lookKey(c, n);
      default: {
        const s = lerpV(c.bd(0, 0.72 * c.H, 0.3), FW.slot, sm(u, 0.05, 0.6));
        return u > 0.82 ? { ...rest(c), nod: -0.05, n } : { l: add(s, -0.14, 0.1, 0.03), r: add(s, 0.14, 0.1, 0.03), gl: 0.8, gr: 0.8, nod: -0.08, props: { flying: s }, n };
      }
    }
  },
};
const COVER: Script = {
  seq: [['photo', 2.4], ['vellum', 1.8], ['plan', 4], ['ink', 4.2], ['lift', 2], ['compare', 2]],
  at: (k) => (k === 'compare' ? st(-0.08, 0.86) : AT_BOARD),
  key(k, u, c) {
    const n: Record<string, number> = { cover: 1, photo: k === 'photo' ? sm(u, 0.1, 0.7) : 1, vellum: k === 'vellum' ? sm(u, 0.1, 0.9) : c.p('vellum'), rough: k === 'plan' ? u : c.p('plan'), ink: k === 'ink' ? u : c.p('ink'), color: c.p('lift', 0.2, 0.9) };
    const holdL = onBoard(-1.05, -0.8);
    switch (k) {
      case 'photo': {
        const p = lerpV(c.bd(0.1, 0.68 * c.H, 0.3), onBoard(0, 0), sm(u, 0.1, 0.7));
        return { l: add(p, 0.05, 0.02, 0.03), gl: 0.8, r: rest(c).r, lean: 0.16, nod: 0.42, n };
      }
      case 'vellum':
        return { l: onBoard(-0.9, 0.8 - 1.6 * u), r: onBoard(0.9, 0.8 - 1.6 * u), gl: 0.7, gr: 0.7, lean: 0.18, nod: 0.46, n };
      case 'plan': {
        const a = u * PI * 6;
        const p = onBoard(0.55 * Math.cos(a), 0.55 * Math.sin(a * 0.7));
        return { r: pencilHand(p), gr: 0.9, l: holdL, gl: 0.55, lean: 0.22, nod: 0.5, props: { pencil: p }, n };
      }
      case 'ink': {
        const p = scrawl(u, 15);
        return { r: pencilHand(p), gr: 0.92, l: holdL, gl: 0.55, lean: 0.22, nod: 0.5, props: { pen: p }, n };
      }
      case 'lift':
        return { l: onBoard(-0.8, 0.9), r: onBoard(0.8, 0.9 + 0.1 * Math.sin(u * PI)), gl: 0.7, gr: 0.7, lean: 0.16, nod: 0.4, n };
      default:
        return lookKey(c, n);
    }
  },
};
export const FW_PUPIL = { x: 0.02, z: FW.stand + 0.02 };
const TEACH: Script = {
  seq: [['show', 3.4], ['hand', 1.2], ['try', 3.6], ['stop', 2.8], ['again', 3], ['well', 1.8]],
  at: (k) => (k === 'show' ? st(-0.08, FW.stand) : st(-0.68, 0.62, 2.0)),
  key(k, u, c) {
    const n: Record<string, number> = { pupil: 1, ink: k === 'show' ? u * 0.4 : k === 'hand' ? 0.4 : k === 'try' ? 0.4 + 0.25 * u : k === 'stop' ? 0.65 : 0.65 + 0.35 * (k === 'again' ? u : 1), wrong: k === 'try' ? sm(u, 0.5, 0.8) : k === 'stop' ? 1 - sm(u, 0.75, 1) : 0, praised: k === 'well' ? 1 : 0, pupilDraws: k === 'try' || k === 'again' ? 1 : 0 };
    switch (k) {
      case 'show': {
        const p = scrawl(u, 11);
        return { r: pencilHand(p), gr: 0.92, l: onBoard(-1.05, -0.8), gl: 0.55, lean: 0.2, nod: 0.46, props: { pen: p }, n };
      }
      case 'hand':
        return { ...rest(c), nod: 0.1, n };
      case 'stop': {
        const p = onBoard(0.4 + 0.1 * Math.sin(c.t * 2), 0.1);
        return { r: add(p, 0, 0.05, 0.04), gr: 0.25, l: rest(c).l, lean: 0.22, nod: 0.42, n };
      }
      case 'well':
        return { r: c.bd(-0.22, 0.78 * c.H, 0.3), gr: 0.15, palms: 0.9, l: rest(c).l, nod: 0.06 + 0.07 * Math.sin(c.t * 4), n };
      default:
        return { l: c.bd(0.18, 0.56 * c.H, 0.03), r: c.bd(-0.18, 0.56 * c.H, 0.03), palms: 0.1, gl: 0.5, gr: 0.5, nod: 0.26 + 0.03 * Math.sin(c.t), n };
    }
  },
};
/** Where the apprentice's pencil is, while drawing. */
export function pupilPoint(t: number): V {
  return onBoard(0.7 * Math.sin(t * 2.3), 0.7 * Math.sin(t * 0.7));
}

// =============================================================================================
// 스텐실 작업대 (ttStencilTable, 3 × 1): a light box in the middle with a stool at it, the thermal copier on the right.

export const ST = {
  top: 0.76,
  seat: [-0.08, 0.47, 0.76] as V,
  box: [-0.08, 0.86, 0.06] as V,
  tilt: 0.28,
  pencil: [0.34, 0.782, 0.2] as V,
  copier: [1.0, 0.76, -0.06] as V,
  slot: [1.0, 0.875, 0.07] as V,
  outY: 0.815,
  outZ: 0.26,
  scissors: [0.62, 0.77, 0.3] as V,
  stack: [0.62, 0.765, 0.0] as V,
  /** A low wire rack: this table stands with its back to the room, so nothing on it goes much over a metre. */
  rack: [-1.12, 1.12, -0.3] as V,
};
const onBox = (u: number, v: number): V => add(ST.box, u * 0.22, 0.034 + v * 0.16 * Math.sin(ST.tilt), -v * 0.16 * Math.cos(ST.tilt));
const SAT_ST = sat(ST.seat);
const TRACE: Script = {
  seq: [['on', 1.3], ['lay', 1.8], ['tape', 1.6], ['trace', 5.4], ['peek', 1.9], ['done', 1.4]],
  at: () => SAT_ST,
  key(k, u, c) {
    const n: Record<string, number> = { lit: k === 'on' ? sm(u, 0.4, 0.7) : k === 'done' ? 1 - sm(u, 0.5, 0.9) : 1, lay: k === 'lay' ? sm(u, 0.1, 0.9) : c.p('lay'), tape: k === 'tape' ? u * 2 : c.p('tape') * 2, traced: k === 'trace' ? u : c.p('trace'), peek: k === 'peek' ? Math.sin(u * PI) : 0 };
    const pencilHome = ST.pencil;
    switch (k) {
      case 'on':
        return { r: add(ST.box, 0.27, -0.04, 0.17), gr: 0.25, l: c.bd(0.15, 0.3, 0.3), gl: 0.3, nod: 0.26, props: { pencil: pencilHome }, n };
      case 'lay': {
        const y = 0.9 - 1.8 * sm(u, 0.1, 0.9);
        return { l: onBox(-0.8, y), r: onBox(0.8, y), gl: 0.7, gr: 0.7, lean: 0.14, nod: 0.36, props: { pencil: pencilHome }, n };
      }
      case 'tape': {
        const i = u < 0.5 ? -1 : 1;
        const p = onBox(i * 0.86, 0.95);
        return i < 0 ? { l: add(p, 0, 0.02, 0.02), gl: 0.72, r: c.bd(-0.15, 0.3, 0.3), nod: 0.3, props: { pencil: pencilHome }, n } : { r: add(p, 0, 0.02, 0.02), gr: 0.72, l: c.bd(0.15, 0.3, 0.3), nod: 0.3, props: { pencil: pencilHome }, n };
      }
      case 'trace': {
        const p = onBox(0.62 * Math.sin(u * 17), 0.7 - 1.4 * frac(u * 3));
        return { r: add(p, 0.016, 0.044, 0.044), gr: 0.92, l: onBox(-1, -0.7), gl: 0.5, lean: 0.2, nod: 0.46, props: { pencil: p }, n };
      }
      case 'peek': {
        const v = n.peek ?? 0;
        return { l: onBox(-0.72, -0.9 + 0.3 * v), r: onBox(0.72, -0.9 + 0.3 * v), gl: 0.7, gr: 0.7, lean: 0.2, nod: 0.5, props: { pencil: pencilHome }, n };
      }
      default:
        return { r: add(ST.box, 0.27, -0.04, 0.17), gr: 0.25, l: c.bd(0.15, 0.3, 0.3), gl: 0.3, nod: 0.2, props: { pencil: pencilHome }, n };
    }
  },
};
const COPY: Script = {
  seq: [['fetch', 1.7], ['feed', 1.7], ['run', 3.2], ['take', 1.5], ['trim', 3], ['peel', 2], ['hang', 1.7]],
  at: (k) => (k === 'fetch' || k === 'trim' || k === 'peel' ? st(0.62, 0.62) : k === 'hang' ? st(-1.06, 0.48) : st(1.0, 0.62)),
  key(k, u, c) {
    const n: Record<string, number> = { run: k === 'run' ? u : c.p('run'), going: k === 'run' ? 1 : 0, cut: k === 'trim' ? u : c.p('trim'), peel: k === 'peel' ? sm(u, 0.1, 0.8) : c.p('peel'), hung: c.p('hang', 0.7, 0.95) };
    const scissorsHome = ST.scissors;
    const table: V = [0.42, ST.top + 0.008, 0.26];
    switch (k) {
      case 'fetch': {
        const p = lerpV(ST.stack, c.bd(0, 0.68 * c.H, 0.28), sm(u, 0.15, 0.85));
        return { l: add(p, 0.1, 0.02, 0.02), r: add(p, -0.1, 0.02, 0.02), gl: 0.75, gr: 0.75, nod: 0.36, lean: 0.1, props: { paper: p, scissors: scissorsHome }, n };
      }
      case 'feed': {
        const p = lerpV(c.bd(0, 0.62 * c.H, 0.28), add(ST.slot, 0, 0.012, 0.02), sm(u, 0.1, 0.8));
        return { l: add(p, 0.1, 0.02, 0.02), r: add(p, -0.1, 0.02, 0.02), gl: 0.75, gr: 0.75, lean: 0.14, nod: 0.4, props: { paper: u < 0.95 ? p : null, scissors: scissorsHome }, n };
      }
      case 'run':
        return { ...rest(c), nod: 0.3, lean: 0.06, props: { scissors: scissorsHome }, n };
      case 'take': {
        const p = lerpV([ST.slot[0], ST.outY, ST.outZ], c.bd(0, 0.66 * c.H, 0.26), sm(u, 0.15, 0.9));
        return { l: add(p, 0.1, 0.02, 0.02), r: add(p, -0.1, 0.02, 0.02), gl: 0.75, gr: 0.75, nod: 0.3, props: { sheet: p, scissors: scissorsHome }, n };
      }
      case 'trim': {
        const a = u * PI * 2;
        const sc = add(table, 0.15 * Math.cos(a), 0.012, 0.1 * Math.sin(a));
        return { l: add(table, -0.14, 0.02, -0.06), gl: 0.7, r: add(sc, 0.01, 0.05, 0.04), gr: 0.92, lean: 0.2, nod: 0.46, tap: true, props: { sheet: table, scissors: sc }, n };
      }
      case 'peel': {
        const e = n.peel ?? 0;
        return { l: add(table, -0.14, 0.02, -0.06), gl: 0.7, r: add(table, 0.14 - 0.26 * e, 0.03 + 0.1 * Math.sin(e * PI), 0.08), gr: 0.75, lean: 0.2, nod: 0.46, props: { sheet: table, scissors: scissorsHome }, n };
      }
      default: {
        const p = lerpV(c.bd(0, 0.66 * c.H, 0.28), ST.rack, sm(u, 0.1, 0.65));
        return u > 0.8 ? { ...rest(c), nod: 0, props: { scissors: scissorsHome }, n } : { r: add(p, 0.03, 0.08, 0.03), gr: 0.75, l: rest(c).l, nod: -0.02, props: { sheet: p, scissors: scissorsHome }, n };
      }
    }
  },
};

// =============================================================================================
// 잉크·멸균 선반 (ttInkShelf, 2 × 1): shelves of ink above a counter, the small autoclave on its right.

export const IS = {
  stand: 0.6,
  top: 0.92,
  bottleShelf: 1.28,
  pick: [-0.42, 1.34, -0.14] as V,
  log: [-0.2, 0.93, 0.08] as V,
  pouch: [0.02, 0.93, 0.06] as V,
  sealer: [-0.36, 0.93, 0.08] as V,
  door: [0.56, 1.1, 0.15] as V,
  chamber: [0.56, 1.1, 0.0] as V,
  strip: [0.28, 0.93, 0.14] as V,
};
const INK: Script = {
  seq: [['scan', 2], ['take', 1.5], ['shake', 2], ['read', 2.2], ['log', 2.6], ['put', 1.4]],
  at: (k) => (k === 'scan' ? st(-0.1, IS.stand + 0.12) : st(-0.34, IS.stand)),
  key(k, u, c) {
    const hold = c.bd(-0.08, 0.68 * c.H, 0.28);
    const n: Record<string, number> = { checked: c.p('log', 0.2, 0.9), written: k === 'log' ? u : c.p('log') };
    switch (k) {
      case 'scan': {
        const p: V = [-0.62 + 1.2 * frac(u * 1.5), IS.bottleShelf + 0.1, 0.0];
        return { r: add(p, 0, 0, 0.08), gr: 0.3, l: rest(c).l, nod: -0.02, n };
      }
      case 'take': {
        const b = lerpV(IS.pick, hold, sm(u, 0.2, 0.9));
        return { r: add(b, 0, 0.01, 0.03), gr: 0.9, l: rest(c).l, nod: 0.08, props: { bottle: b }, n };
      }
      case 'shake': {
        const b = add(hold, 0, 0.06 * Math.sin(c.t * 16), 0);
        return { r: add(b, 0, 0.01, 0.03), gr: 0.9, l: rest(c).l, nod: 0.24, props: { bottle: b }, n };
      }
      case 'read': {
        const b = add(hold, 0.05, 0.04, 0);
        return { r: add(b, 0, 0.01, 0.03), gr: 0.9, l: add(b, 0.05, -0.02, 0.02), gl: 0.6, nod: 0.3, lean: 0.06, props: { bottle: b }, n };
      }
      case 'log': {
        const w = add(IS.log, -0.05 + 0.1 * frac(u * 3), 0.012, 0.03 * Math.sin(u * 13));
        return { r: add(hold, 0, 0.01, 0.03), gr: 0.9, l: add(w, 0.01, 0.04, 0.05), gl: 0.9, lean: 0.14, nod: 0.46, props: { bottle: hold, pen: w }, n };
      }
      default: {
        const b = lerpV(hold, IS.pick, sm(u, 0.1, 0.8));
        return { r: add(b, 0, 0.01, 0.03), gr: 0.9, l: rest(c).l, nod: 0.08, props: { bottle: u < 0.85 ? b : null }, n };
      }
    }
  },
};
const LOAD: Script = {
  seq: [['bag', 2], ['seal', 2.2], ['open', 1.3], ['load', 1.9], ['shut', 1.2], ['cycle', 3.6], ['strip', 2.2]],
  at: (k) => (k === 'bag' || k === 'seal' ? st(-0.2, IS.stand) : st(0.44, IS.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { door: k === 'open' ? sm(u, 0.15, 0.8) : k === 'load' ? 1 : k === 'shut' ? 1 - sm(u, 0.15, 0.8) : 0, cyc: k === 'cycle' ? u : c.p('cycle'), running: k === 'cycle' ? 1 : 0, sealed: c.p('seal', 0.4, 0.8), inside: c.p('load', 0.6, 0.85), strip: k === 'strip' ? sm(u, 0.25, 0.8) : 0 };
    switch (k) {
      case 'bag': {
        const s = Math.sin(u * PI * 2);
        return { l: add(IS.pouch, -0.08, 0.03, 0.02), r: add(IS.pouch, 0.05 + 0.03 * s, 0.05, 0.02), gl: 0.75, gr: 0.75, lean: 0.16, nod: 0.46, props: { pouch: IS.pouch }, n };
      }
      case 'seal': {
        const down = sm(u, 0.2, 0.4) - sm(u, 0.72, 0.9);
        const p = add(IS.sealer, 0, 0, 0);
        return { r: add(p, 0.02, 0.1 - 0.04 * down, 0.02), gr: 0.86, l: add(p, 0.2, 0.03, 0.02), gl: 0.72, lean: 0.18, nod: 0.44, props: { pouch: add(p, 0.12, 0, 0) }, n: { ...n, press: down } };
      }
      case 'open':
        return { l: add(IS.door, -0.14, 0.02, 0.05 + 0.1 * (n.door ?? 0)), gl: 0.86, r: rest(c).r, nod: 0.22, n };
      case 'load': {
        const p = lerpV(c.bd(-0.02, 0.62 * c.H, 0.26), IS.chamber, sm(u, 0.1, 0.8));
        return { r: add(p, 0.02, 0.02, 0.03), gr: 0.85, l: add(IS.door, -0.26, 0, 0.16), gl: 0.8, lean: 0.14, nod: 0.26, props: { pouch: u < 0.82 ? p : null }, n };
      }
      case 'shut':
        return { l: add(IS.door, -0.14, 0.02, 0.05 + 0.1 * (n.door ?? 0)), gl: 0.86, r: rest(c).r, nod: 0.22, n };
      case 'cycle':
        return { r: add(IS.door, 0.11, 0.09, 0.03), gr: 0.25, tap: u < 0.15, l: rest(c).l, nod: 0.16 + 0.02 * Math.sin(c.t), n };
      default: {
        const p = c.bd(-0.02, 0.66 * c.H, 0.28);
        return { r: add(p, 0.02, 0.01, 0.03), gr: 0.86, l: add(p, -0.05, 0, 0.03), gl: 0.5, nod: 0.36, lean: 0.06, props: { stripAt: p }, n };
      }
    }
  },
};

// =============================================================================================
// 상담 테이블 (ttConsultTable, 2 × 2): round a low table, the artist on the front side, a client drawn across.

export const CT = {
  top: 0.72,
  seat: [0, 0.46, 0.68] as V,
  client: [0, 0.46, -0.68] as V,
  album: [0, 0.745, 0.04] as V,
  tablet: [0.44, 0.74, 0.14] as V,
};
const SAT_CT = sat(CT.seat);
const ALBUM: Script = {
  seq: [['open', 1.6], ['pages', 3.8], ['point', 2], ['tablet', 4.4], ['measure', 2.4], ['agree', 1.8]],
  at: () => SAT_CT,
  key(k, u, c) {
    const n: Record<string, number> = { open: k === 'open' ? sm(u, 0.1, 0.9) : 1, page: k === 'pages' ? u * 3 : c.p('pages') * 3, flip: k === 'pages' ? frac(u * 3) : 0, drawn: k === 'tablet' ? u : c.p('tablet'), measure: k === 'measure' ? 1 : 0, nodClient: k === 'agree' || k === 'point' ? 1 : 0, reach: k === 'measure' ? sm(u, 0, 0.3) : 0 };
    const A = CT.album;
    switch (k) {
      case 'open':
        return { l: add(A, 0.16, 0.02, 0.1), r: add(A, -0.14 + 0.14 * sm(u, 0, 1), 0.04 + 0.1 * Math.sin(u * PI), 0.08), gl: 0.5, gr: 0.75, lean: 0.14, nod: 0.36, n };
      case 'pages': {
        const f = n.flip ?? 0;
        return { l: add(A, 0.2, 0.02, 0.08), gl: 0.5, r: add(A, 0.16 - 0.32 * f, 0.02 + 0.12 * Math.sin(f * PI), 0.06), gr: 0.7, lean: 0.14, nod: 0.36, n };
      }
      case 'point': {
        const p = add(A, -0.12 + 0.06 * Math.sin(c.t * 2), 0.03, -0.04);
        return { r: add(p, 0, 0.03, 0.07), gr: 0.15, l: add(A, 0.2, 0.02, 0.08), gl: 0.5, lean: 0.2, nod: 0.3, n };
      }
      case 'tablet': {
        const p = add(CT.tablet, -0.08 + 0.16 * frac(u * 4), 0.016, 0.06 * Math.sin(u * 19));
        return { l: add(CT.tablet, 0.13, 0.03, 0.08), gl: 0.5, r: add(p, -0.02, 0.046, 0.05), gr: 0.92, lean: 0.14, nod: 0.44, props: { stylus: p }, n };
      }
      case 'measure': {
        const a = add(A, -0.06, 0.09, -0.46);
        const b = add(A, 0.1, 0.09, -0.3);
        return { l: add(lerpV(CT.tablet, a, n.reach ?? 0), 0, 0.02, 0.04), gl: 0.86, r: add(lerpV(A, b, n.reach ?? 0), 0, 0.02, 0.04), gr: 0.86, lean: 0.34, nod: 0.3, props: { tapeA: a, tapeB: b }, n };
      }
      default:
        return { l: c.bd(0.14, 0.3, 0.3), r: c.bd(-0.14, 0.3, 0.3), gl: 0.3, gr: 0.3, nod: 0.06 + 0.06 * Math.sin(c.t * 4), n };
    }
  },
};

// =============================================================================================
// 애프터케어 카운터 (ttAftercareCounter, 3 × 1): the artist on the front side, a client drawn across with their arm out.

export const AC = {
  top: 0.96,
  stand: 0.46,
  client: [-0.1, 0, -0.74] as V,
  hand: [-0.16, 1.03, -0.07] as V,
  elbow: [-0.3, 1.1, -0.36] as V,
  jar: [0.28, 0.975, 0.12] as V,
  roll: [-0.5, 0.975, 0.14] as V,
  card: [0.06, 0.965, 0.16] as V,
  reader: [0.76, 0.96, 0.06] as V,
};
const onWrap = (u: number): V => lerpV(AC.hand, AC.elbow, 0.2 + 0.65 * u);
const CARE: Script = {
  seq: [['card', 2.6], ['cream', 2.8], ['film', 3.8], ['tape', 1.5], ['explain', 3.2], ['pay', 2.4], ['bye', 1.5]],
  at: (k) => (k === 'pay' ? st(0.62, AC.stand) : st(-0.12, AC.stand)),
  key(k, u, c) {
    const n: Record<string, number> = { there: 1, wrapped: k === 'film' ? u : c.p('film'), taped: c.p('tape', 0.4, 0.9), creamed: c.p('cream', 0.3, 0.9), slid: k === 'card' ? sm(u, 0.2, 0.7) : 1, paid: c.p('pay', 0.6, 0.85), clientHand: k === 'pay' ? 1 : 0, nodClient: k === 'explain' || k === 'card' ? 1 : 0, waved: k === 'bye' ? 1 : 0 };
    switch (k) {
      case 'card': {
        const p = lerpV(AC.card, add(AC.card, -0.02, 0, -0.2), sm(u, 0.2, 0.7));
        return { r: add(p, 0, 0.03, 0.05), gr: 0.4, l: rest(c).l, lean: 0.14, nod: 0.26, props: { card: p }, n };
      }
      case 'cream': {
        const a = u * PI * 6;
        const p = add(onWrap(0.5), 0.028 * Math.sin(a), 0.04, 0.05 * Math.cos(a));
        return { r: add(p, 0, 0.018, 0.016), gr: 0.35, l: add(AC.jar, -0.12, 0.05, 0.03), gl: 0.72, lean: 0.22, nod: 0.44, props: { jarHeld: add(AC.jar, -0.12, 0.03, 0.01) }, n };
      }
      case 'film': {
        const a = u * PI * 8;
        const p = add(onWrap(u), 0.07 * Math.cos(a), 0.06 * Math.sin(a) + 0.02, 0);
        return { r: add(p, 0, 0.014, 0.018), gr: 0.86, l: add(onWrap(0), 0.01, 0.05, 0.03), gl: 0.5, lean: 0.24, nod: 0.46, props: { roll: p }, n };
      }
      case 'tape': {
        const p = add(onWrap(0.6), 0, 0.055, 0);
        return { r: add(p, 0, 0.022, 0.02), gr: 0.75, l: add(onWrap(0.1), 0.01, 0.05, 0.03), gl: 0.5, lean: 0.22, nod: 0.44, n };
      }
      case 'explain': {
        const p: V = [AC.card[0] - 0.02 + 0.04 * Math.sin(c.t * 2), AC.card[1] + 0.03, AC.card[2] - 0.2];
        return { r: add(p, 0, 0.03, 0.05), gr: 0.2, l: c.bd(0.2, 0.58 * c.H, 0.22), palms: 0.8, lean: 0.12, nod: 0.18 + 0.05 * Math.sin(c.t * 3), n };
      }
      case 'pay':
        return { r: add(AC.reader, 0.03 * Math.sin(c.t * 6), 0.06, 0.08), gr: 0.25, tap: u < 0.5, l: rest(c).l, nod: 0.3, lean: 0.08, n };
      default:
        return { r: c.bd(-0.22, 0.84 * c.H + 0.04 * Math.sin(c.t * 6), 0.2), gr: 0.1, palms: 0.9, l: rest(c).l, nod: 0.03, n };
    }
  },
};

// =============================================================================================
// 연습대 (ttPracticeBench, 2 × 1): a silicone forearm on its stand at the front of a bench; practice sheets beside.

export const PB = {
  top: 0.74,
  seat: [0, 0.47, 0.76] as V,
  /** The silicone forearm, along x, its top. */
  arm: [0, 0.895, 0.14] as V,
  armLen: 0.3,
  plate: [0.46, 0.76, 0.2] as V,
  machine: [0.44, 0.79, -0.04] as V,
  towel: [-0.5, 0.76, 0.18] as V,
};
const onSil = (u: number, wob = 0.012): V => add(PB.arm, -PB.armLen / 2 + 0.06 + (PB.armLen - 0.12) * u + wob * Math.sin(u * 37), 0.004, wob * Math.cos(u * 29));
const handOn = (p: V): V => add(p, 0.015, 0.075, 0.055);
const SAT_PB = sat(PB.seat);
const PRACTICE: Script = {
  seq: [['stretch', 1.5], ['dip', 1.1], ['line', 4.4], ['dip2', 1.1], ['shade', 3.4], ['wipe', 1.7], ['look', 1.5]],
  at: () => SAT_PB,
  key(k, u, c) {
    const n: Record<string, number> = { line: c.p('line', 0.02, 0.98), shade: c.p('shade', 0.02, 0.98), stencil: 1 };
    const hold = add(PB.arm, -PB.armLen / 2 - 0.05, -0.01, 0.05);
    switch (k) {
      case 'stretch':
        return { l: hold, gl: 0.65, r: handOn(add(PB.machine, 0, 0, 0)), gr: 0.86, lean: 0.14, nod: 0.36, props: { machine: PB.machine }, n };
      case 'dip':
      case 'dip2': {
        const p = add(PB.plate, k === 'dip' ? 0 : 0.035, 0.008 + 0.05 * Math.sin(u * PI), 0);
        return { r: handOn(p), gr: 0.92, l: hold, gl: 0.6, lean: 0.14, nod: 0.36, props: { machine: p }, n };
      }
      case 'line': {
        const p = onSil(u);
        return { r: handOn(p), gr: 0.92, l: hold, gl: 0.6, lean: 0.22, nod: 0.48, props: { machine: p }, n: { ...n, buzz: 1 } };
      }
      case 'shade': {
        const p = onSil(frac(u * 3), 0.024);
        return { r: handOn(p), gr: 0.92, l: hold, gl: 0.6, lean: 0.22, nod: 0.48, props: { machine: p }, n: { ...n, buzz: 1 } };
      }
      case 'wipe': {
        const p = add(PB.arm, -0.1 + 0.2 * Math.sin(u * 12), 0.012, 0.015);
        return { l: add(p, 0, 0.02, 0.02), gl: 0.72, r: handOn(PB.machine), gr: 0.86, lean: 0.18, nod: 0.44, props: { towel: p, machine: PB.machine }, n };
      }
      default:
        return { l: c.bd(0.14, 0.26, 0.3), r: c.bd(-0.14, 0.26, 0.3), gl: 0.3, gr: 0.3, lean: 0, nod: 0.26, props: { machine: PB.machine }, n };
    }
  },
};

const SCRIPTS: Record<TtMotion, Script> = { ttWork: WORK, ttTalk: TALK, ttPrep: PREP, ttSkin: SKIN, ttDemo: DEMO, ttFlash: FLASH, ttCover: COVER, ttTeach: TEACH, ttTrace: TRACE, ttCopy: COPY, ttInk: INK, ttLoad: LOAD, ttAlbum: ALBUM, ttCare: CARE, ttPractice: PRACTICE };
