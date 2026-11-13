import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A shift at the 편의점 (2026-11-01, the workplace pipeline, at the user's request), a branch of the made-up
 * 늘봄마트24. Each motion is a round of beats: where the dweller is, where the hands go, and what moves. The piece
 * reads the same script by the same clock (convenienceManager.ts), so the triangle kimbap the hand passes over
 * the scanner is the one on the counter, and the total on the screen goes up as it beeps.
 *
 * - cvTill (계산대): a customer puts three things down, each scanned and passed along, the card on the terminal,
 *   the bag filled, the receipt, a bow. cvRush is the same at a run with a queue back to the shelves.
 *   cvLearn: an older hand scans one, the dweller tries, gets it wrong, is put right, gets it right.
 * - cvRestock (진열대): a folding crate set down, the old stock pulled forward, new stock in behind, row by row.
 *   cvCheck: each packet turned over, the date read and the scanner fired; one is out of date and goes in the
 *   basket. cvTrain: a new member of staff is shown the front row, tries, is ticked off on a clipboard.
 * - cvDrinks (음료 냉장고): a crate at the feet, the glass door opened, bottles slid in from the top shelf down.
 * - cvParcel (택배 접수기): a customer's box on the scale, the weight read, keyed in, the label printed, peeled
 *   and stuck on, the box put up on the parcel rack.
 * - cvOrder / cvShifts / cvSales (발주 단말): quantities tapped in and sent; the week's rota filled in and pinned
 *   up; the sales chart read with notes taken.
 * - cvHot (온장 쇼케이스): the door opened, buns and hot bars laid in by tongs from a tray, the glass wiped.
 * - cvRamen (컵라면 진열대): cups off a crate and stacked, each row pushed to the front.
 * - cvWater (온수기): a water jug lifted from the floor and poured in at the top, the gauge climbing.
 * - cvLunch (도시락 냉장 쇼케이스): the scanner run along the row; red ones out into the 폐기 basket, fresh in.
 * - cvBar (창가 자리): what's left gathered on a tray, sprayed, wiped from end to end.
 * - cvAtm (무인 단말기): beside an older customer, pointing them through it screen by screen.
 * - cvCrate (납품 상자): the delivery slip checked crate by crate, a crate lifted off, scanned and stacked aside.
 * - cvBin (청소 코너): the full bag lifted out and tied, a new one in, the floor mopped.
 * - cvTerrace (파라솔 테이블): cups gathered, the table wiped, a chair pushed straight.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x.
 */
export type CvMotion = 'cvTill' | 'cvRush' | 'cvLearn' | 'cvRestock' | 'cvCheck' | 'cvTrain' | 'cvDrinks' | 'cvParcel' | 'cvOrder' | 'cvShifts' | 'cvSales' | 'cvHot' | 'cvRamen' | 'cvWater' | 'cvLunch' | 'cvBar' | 'cvAtm' | 'cvCrate' | 'cvBin' | 'cvTerrace';
export const CV_MOTIONS = new Set<string>(['cvTill', 'cvRush', 'cvLearn', 'cvRestock', 'cvCheck', 'cvTrain', 'cvDrinks', 'cvParcel', 'cvOrder', 'cvShifts', 'cvSales', 'cvHot', 'cvRamen', 'cvWater', 'cvLunch', 'cvBar', 'cvAtm', 'cvCrate', 'cvBin', 'cvTerrace']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const cvPhase = (p: THREE.Vector3) => frac(p.x * 0.417 + p.z * 0.613);
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
}
const st = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
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
export interface CvNow {
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
export function cvNow(m: CvMotion, t: number, ph: number, H = 1.6): CvNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: 0, z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e) };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function cvPose(m: CvMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = cvNow(m, t, cvPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, 0, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch ? k.crouch : undefined,
    },
  };
}
const count = (c: Ctx, name: string, n: number) => Math.round(c.p(name) * n);
const beepAt = (u: number, a: number) => (u > a && u < a + 0.14 ? 1 : 0);

// =============================================================================================
// 계산대 (storeCounter, 2 × 1): placed with its front to the staff side; customers on its back (-z).

export const CT = {
  stand: 0.58,
  top: 0.92,
  pos: [-0.62, 1.2, 0.06] as V,
  scan: [-0.12, 1.0, 0.1] as V,
  drop: [[-0.3, 0.94, -0.28], [-0.1, 0.94, -0.3], [0.08, 0.94, -0.26]] as V[],
  done: [[0.34, 0.94, -0.02], [0.5, 0.94, 0.08], [0.62, 0.94, -0.08]] as V[],
  bag: [0.52, 0.94, -0.14] as V,
  term: [-0.58, 1.0, -0.33] as V,
  printer: [0.1, 1.02, 0.28] as V,
  cust: [-0.1, -0.86] as [number, number],
  senior: [-1.02, 0.62] as [number, number],
};
const tillPos = (c: Ctx, j: number, k: string, u: number): V | null => {
  const inBag = c.p('bag', 0.15 + j * 0.2, 0.3 + j * 0.2);
  if (inBag >= 1 || c.p('greet', 0, 0.8) <= 0) return null;
  if (k === `s${j}`) {
    return u < 0.45 ? lerpV(CT.drop[j], CT.scan, sm(u, 0.05, 0.45)) : lerpV(CT.scan, CT.done[j], sm(u, 0.6, 1));
  }
  if (c.p(`s${j}`) >= 1) return inBag > 0 ? lerpV(CT.done[j], add(CT.bag, 0, 0.1, 0), inBag) : CT.done[j];
  return CT.drop[j];
};
function tillScript(rush: boolean): Script {
  const q = rush ? 0.62 : 1;
  const seq: Seq = [['wait', rush ? 0.3 : 1.0], ['greet', 1.4 * q], ['s0', 1.5 * q], ['s1', 1.4 * q], ['s2', 1.4 * q], ['pay', 2.2 * q], ['bag', 1.8 * q], ['slip', 1.0 * q], ['thanks', 1.5 * q], ['gone', rush ? 0.4 : 1.0]];
  return {
    seq,
    at: (k) => (k === 'bag' || k === 'thanks' ? st(0.3, CT.stand) : k === 'pay' || k === 'slip' ? st(-0.26, CT.stand) : st(-0.08, CT.stand)),
    key(k, u, c): Key {
      const props: Record<string, V | null> = { i0: tillPos(c, 0, k, u), i1: tillPos(c, 1, k, u), i2: tillPos(c, 2, k, u), bag: c.p('bag', 0.03, 0.1) > 0 && c.p('thanks', 0.5, 0.8) < 1 ? CT.bag : null };
      const n = { rush: rush ? 1 : 0, cust: c.p('greet', 0, 0.5) - c.p('gone', 0, 1), scanned: count(c, 's0', 1) + count(c, 's1', 1) + count(c, 's2', 1), paid: c.p('pay', 0.65, 0.8), cTap: 0, cBow: 0, took: c.p('thanks', 0.5, 0.8), queue: rush ? 3 - c.p('gone', 0, 1) : 0 };
      const scanKey = (j: number): Key => {
        const pos = props[`i${j}`] ?? CT.scan;
        return { r: add(pos, 0.02, 0.04, 0.05), gr: 0.85, l: add(CT.scan, -0.2, 0.0, 0.14), nod: 0.32, lean: 0.08, props, n: { ...n, beep: beepAt(u, 0.42) } };
      };
      switch (k) {
        case 'wait':
          return { nod: 0.08, l: c.bd(0.22, 0.56 * c.H, 0.08), r: c.bd(-0.22, 0.56 * c.H, 0.08), props, n };
        case 'greet':
          return { nod: Math.sin(u * PI) * 0.34, lean: Math.sin(u * PI) * 0.16, props, n };
        case 's0':
          return scanKey(0);
        case 's1':
          return scanKey(1);
        case 's2':
          return scanKey(2);
        case 'pay':
          // The total tapped, their card on the terminal.
          return { l: add(CT.pos, 0.06 + 0.1 * frac(u * 3), -0.03, 0.03), tap: u < 0.4, r: c.bd(-0.2, 0.6 * c.H, 0.14), nod: 0.25, props, n: { ...n, cTap: sm(u, 0.25, 0.42) - sm(u, 0.78, 0.92) } };
        case 'bag': {
          const h = add(CT.bag, 0.08 * Math.sin(u * PI * 4), 0.14, 0.08);
          return { r: h, l: add(CT.bag, -0.15, 0.2, 0.06), gr: 0.8, gl: 0.7, nod: 0.3, lean: 0.1, props, n };
        }
        case 'slip':
          return { r: add(CT.printer, 0.02, 0.08, 0.04 + 0.03 * sm(u, 0.3, 0.8)), gr: 0.7, nod: 0.25, props: { ...props, slip: add(CT.printer, 0, 0.07, 0.03) }, n };
        case 'thanks':
          return { nod: 0.34 * Math.sin(u * PI), lean: 0.2 * Math.sin(u * PI), props, n: { ...n, cBow: Math.sin(u * PI) } };
        default:
          return { nod: 0.05, props, n };
      }
    },
  };
}
const LEARN: Script = {
  seq: [['listen', 2.0, 0.7], ['watch', 3.0, 0.7], ['try', 2.2], ['wrong', 1.4], ['fix', 2.2], ['again', 2.2], ['ok', 1.6]],
  at: (k) => (k === 'listen' || k === 'watch' ? st(-0.15, CT.stand, PI + 0.5) : st(-0.12, CT.stand)),
  key(k, u, c): Key {
    const n = { lesson: 1, sTap: k === 'watch' ? 1 : 0, sPoint: k === 'fix' || k === 'try' ? 1 : 0, sNod: k === 'ok' ? 1 : 0, wrong: k === 'wrong' ? 1 : 0, good: k === 'ok' ? 1 : 0 };
    const item = (e: number): V => lerpV(CT.drop[1], CT.scan, e);
    switch (k) {
      case 'listen':
        return { nod: 0.1 + 0.08 * Math.sin(c.t * 2.2), l: c.bd(0.16, 0.58 * c.H, 0.14), r: c.bd(-0.16, 0.58 * c.H, 0.14), props: { i1: CT.drop[1] }, n };
      case 'watch':
        return { nod: 0.24, l: c.bd(0.16, 0.58 * c.H, 0.14), r: c.bd(-0.16, 0.58 * c.H, 0.14), props: { i1: u > 0.3 ? item(Math.sin((u - 0.3) * PI / 0.7)) : CT.drop[1] }, n };
      case 'try': {
        const e = sm(u, 0.1, 0.8);
        return { r: add(item(e), 0.02, 0.04, 0.05), gr: 0.85, nod: 0.32, lean: 0.08, props: { i1: item(e) }, n };
      }
      case 'wrong':
        // Barcode the wrong way round: no beep, a red light, a hand to the back of the neck.
        return { r: add(CT.scan, 0.02, 0.04, 0.05), gr: 0.85, l: c.bd(0.16, 0.86 * c.H, -0.06), nod: 0.1, props: { i1: CT.scan }, n };
      case 'fix': {
        const turn = Math.sin(u * PI * 2) * 0.05;
        return { r: add(CT.scan, 0.02 + turn, 0.12, 0.08), l: add(CT.scan, -0.1, 0.12, 0.08), gr: 0.85, gl: 0.7, nod: 0.3, props: { i1: add(CT.scan, turn, 0.08, 0.04) }, n };
      }
      case 'again':
        return { r: add(CT.scan, 0.02, 0.04, 0.05 + 0.05 * Math.sin(u * PI)), gr: 0.85, nod: 0.3, props: { i1: CT.scan }, n: { ...n, beep: beepAt(u, 0.5), good: u > 0.5 ? 1 : 0 } };
      default:
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.12 * Math.sin(u * PI), props: { i1: CT.done[1] }, n };
    }
  },
};

// =============================================================================================
// 상품 진열대 (snackShelf, 2 × 1): a gondola of four decks, the same on its far side.

export const SH = {
  stand: 0.64,
  decks: [0.28, 0.6, 0.92, 1.24],
  face: 0.3,
  crate: [-0.7, 0, 0.72] as V,
  basket: [0.72, 0, 0.72] as V,
  gaps: [[-0.42, 0.92], [0.0, 0.6], [0.44, 1.24], [-0.1, 0.28]] as Array<[number, number]>,
  trainee: [0.9, 0.86] as [number, number],
};
const gapAt = (i: number): V => [SH.gaps[i][0], SH.gaps[i][1] + 0.1, SH.face];
const RESTOCK: Script = {
  seq: [['set', 1.5], ['pull', 2.2], ['g0', 1.7], ['g1', 1.7], ['g2', 1.7], ['g3', 1.9], ['tag', 1.6], ['fold', 1.5]],
  at: (k) => (k === 'g0' ? st(-0.3, SH.stand) : k === 'g2' ? st(0.34, SH.stand) : k === 'fold' || k === 'set' ? st(-0.42, SH.stand) : st(0, SH.stand)),
  key(k, u, c): Key {
    const crateIn: V = add(SH.crate, 0, 0.22, 0);
    const n = { filled: count(c, 'g0', 1) + count(c, 'g1', 1) + count(c, 'g2', 1) + count(c, 'g3', 1), crate: 1 - c.p('fold', 0.4, 1), fold: c.p('fold', 0, 0.5) };
    const put = (i: number): Key => {
      const low = SH.gaps[i][1] < 0.5;
      const home = gapAt(i);
      const box = u < 0.5 ? lerpV(crateIn, add(home, 0, 0.02, 0.2), sm(u, 0.05, 0.5)) : lerpV(add(home, 0, 0.02, 0.2), home, sm(u, 0.5, 0.9));
      return { r: add(box, 0.05, 0.02, 0.1), l: add(box, -0.05, 0.02, 0.1), gr: 0.8, gl: 0.8, crouch: u < 0.25 ? 0.75 : low ? 0.6 : 0, nod: u < 0.25 ? 0.42 : low ? 0.4 : SH.gaps[i][1] > 1.1 ? -0.1 : 0.2, props: { box: u < 0.92 ? box : null }, n };
    };
    switch (k) {
      case 'set': {
        // Carried in at the hip, then set down.
        const crate = lerpV(add(SH.crate, 0.3, 0.75, -0.08), SH.crate, sm(u, 0.15, 0.85));
        return { r: add(crate, 0.23, 0.13, 0), l: add(crate, -0.23, 0.13, 0), gr: 0.9, gl: 0.9, crouch: 0.7 * sm(u, 0.3, 0.8), nod: 0.3, n: { ...n, crate: 1 }, props: { crate } };
      }
      case 'pull':
        // Old stock brought forward so the new goes behind.
        return { r: [0.3 - 0.6 * frac(u * 2), 1.0, SH.face + 0.02], l: [-0.1 - 0.5 * frac(u * 2), 0.68, SH.face + 0.02], nod: 0.22, gr: 0.6, gl: 0.6, n: { ...n, pulled: sm(u, 0, 0.9) }, props: { crate: SH.crate } };
      case 'g0':
      case 'g1':
      case 'g2':
      case 'g3': {
        const K = put(+k[1]);
        return { ...K, props: { ...K.props, crate: SH.crate } };
      }
      case 'tag':
        // The promotion tag clipped straight on the shelf edge.
        return { r: [0.1 + 0.3 * sm(u, 0, 0.4), 0.98, SH.face + 0.12], l: [-0.24, 0.98, SH.face + 0.12], gr: 0.7, nod: 0.2, n: { ...n, tag: sm(u, 0.4, 0.8) }, props: { crate: SH.crate } };
      default: {
        const crate = lerpV(SH.crate, add(SH.crate, 0.2, 0.7, -0.05), sm(u, 0.4, 1));
        return { r: add(crate, 0.2, 0.09, 0), l: add(crate, -0.2, 0.09, 0), gr: 0.9, gl: 0.9, crouch: 0.7 * (1 - sm(u, 0.4, 0.9)), nod: 0.3, props: { crate }, n: { ...n, tag: 1 } };
      }
    }
  },
};
const CHECK_SPOTS: V[] = [[-0.55, 1.04, SH.face], [-0.1, 1.04, SH.face], [0.42, 0.72, SH.face], [0.1, 0.4, SH.face]];
const CHECK: Script = {
  seq: [['c0', 2.2], ['c1', 2.2], ['c2', 2.6], ['toss', 1.6], ['c3', 2.2], ['note', 1.8]],
  at: (k) => (k === 'c0' ? st(-0.42, SH.stand) : k === 'c2' || k === 'toss' ? st(0.36, SH.stand) : st(0, SH.stand)),
  key(k, u, c): Key {
    const pda = (b: V): V => add(b, -0.14, 0.02, 0.2);
    const n = { flagged: c.p('c2', 0.55, 0.65) - c.p('toss', 0.7, 1), tossed: c.p('toss', 0.7, 1) };
    const read = (i: number, bad: boolean): Key => {
      // Off the shelf, turned over, the scanner fired at the date.
      const home = CHECK_SPOTS[i];
      const up: V = [c.st.x + 0.09, 1.12, c.st.z - 0.26];
      const e = sm(u, 0.05, 0.3) - sm(u, 0.82, 1);
      const hold = lerpV(home, up, e);
      return { r: add(hold, 0.03, -0.02, 0.05), l: pda(up), gr: 0.85, gl: 0.9, crouch: home[1] < 0.5 && e < 0.5 ? 0.6 : 0, nod: 0.26, props: { item: hold, pda: pda(up) }, n: { ...n, beep: beepAt(u, 0.52), bad: bad && u > 0.55 ? 1 : 0, turned: sm(u, 0.3, 0.45) * (1 - sm(u, 0.72, 0.82)) } };
    };
    switch (k) {
      case 'c0':
        return read(0, false);
      case 'c1':
        return read(1, false);
      case 'c2':
        return { ...read(2, true), props: { ...read(2, true).props, item: u > 0.82 ? [c.st.x + 0.09, 1.12, c.st.z - 0.26] : read(2, true).props!.item } };
      case 'toss': {
        const it = lerpV([c.st.x + 0.09, 1.12, c.st.z - 0.26], add(SH.basket, 0, 0.3, 0), sm(u, 0.1, 0.8));
        return { r: add(it, 0.03, -0.02, 0.05), gr: 0.85, crouch: 0.5 * sm(u, 0.3, 0.8), nod: 0.35, props: { item: u < 0.85 ? it : null, pda: pda([c.st.x, 1.12, c.st.z - 0.26]) }, l: pda([c.st.x, 1.12, c.st.z - 0.26]), gl: 0.9, n };
      }
      case 'c3':
        return read(3, false);
      default:
        return { l: c.bd(0.15, 0.68 * c.H, 0.25), r: c.bd(-0.1 + 0.03 * Math.sin(c.t * 7), 0.69 * c.H, 0.26), gl: 0.85, gr: 0.8, nod: 0.3, props: { pda: c.bd(0.15, 0.7 * c.H, 0.28) }, n };
    }
  },
};
const TRAIN: Script = {
  seq: [['face', 1.6, 0.7], ['show', 3.2, 0.7], ['point', 1.8], ['try', 3.2], ['fix', 2.0], ['nod', 1.3], ['tick', 2.2]],
  at: (k) => (k === 'face' || k === 'nod' || k === 'tick' ? st(-0.24, SH.stand + 0.12, PI / 2 + 0.25) : st(-0.24, SH.stand)),
  key(k, u, c): Key {
    const n = { lesson: 1, tTry: k === 'try' || k === 'fix' ? 1 : 0, tNod: k === 'face' || k === 'point' || k === 'nod' ? 1 : 0, straight: c.p('try', 0.2, 1) * 0.8 + c.p('fix', 0.2, 1) * 0.2 };
    const board = c.bd(0.18, 0.68 * c.H, 0.24);
    switch (k) {
      case 'face':
        return { nod: Math.sin(u * PI) * 0.2, l: board, gl: 0.85, props: { board }, n };
      case 'show': {
        // A packet pulled up to the front and squared with its neighbours.
        const x = -0.2 + 0.3 * frac(u * 2);
        return { r: [x, 1.0, SH.face + 0.02 + 0.07 * Math.abs(Math.sin(u * PI * 4))], l: [x - 0.18, 1.0, SH.face + 0.02], gr: 0.65, gl: 0.65, nod: 0.2, n };
      }
      case 'point':
        return { r: [0.2, 1.05, SH.face + 0.06], gr: 0.2, palms: 0.1, nod: 0.05, n };
      case 'try':
        return { nod: 0.14, l: board, gl: 0.85, r: c.bd(-0.18, 0.58 * c.H, 0.08), props: { board }, n };
      case 'fix':
        return { r: [0.4, 1.0, SH.face + 0.06], nod: 0.2, gr: 0.6, l: board, gl: 0.85, props: { board }, n };
      case 'nod':
        return { nod: 0.16 * Math.abs(Math.sin(u * PI * 2)), l: board, gl: 0.85, props: { board }, n };
      default:
        return { l: board, gl: 0.85, r: add(board, 0.02 + 0.04 * Math.sin(c.t * 8), 0.03, 0), gr: 0.85, nod: 0.26, props: { board, pen: add(board, 0.02 + 0.04 * Math.sin(c.t * 8), 0.05, 0.01) }, n: { ...n, tick: sm(u, 0.1, 0.9) * 3 } };
    }
  },
};

// =============================================================================================
// 음료 냉장고 (drinkCooler, 1 × 1): a glass door hinged on the left, three shelves of bottles.

export const DC = {
  stand: 0.72,
  hinge: [-0.45, 0.42] as [number, number],
  shelves: [1.48, 1.08, 0.68],
  face: 0.28,
  crate: [0.3, 0, 0.82] as V,
};
/** The handle, 0.78 along the door from its hinge, as the door swings to 1.2 radians. */
const doorHand = (e: number): V => [DC.hinge[0] + 0.78 * Math.cos(1.2 * e), 1.05, DC.hinge[1] + 0.06 + 0.78 * Math.sin(1.2 * e)];
const DRINKS: Script = {
  seq: [['crate', 1.5], ['open', 1.2], ['p0', 1.7], ['p1', 1.7], ['p2', 1.9], ['face', 1.5], ['close', 1.1], ['read', 1.2]],
  at: (k) => (k === 'crate' ? st(0.1, DC.stand) : st(0.14, DC.stand)),
  key(k, u, c): Key {
    const n = { door: c.p('open', 0.1, 0.9) - c.p('close', 0.1, 0.9), filled: count(c, 'p0', 1) + count(c, 'p1', 1) + count(c, 'p2', 1), pulled: c.p('face') };
    const inCrate = add(DC.crate, 0, 0.25, 0);
    const put = (i: number): Key => {
      const home: V = [0.02, DC.shelves[i] + 0.02, DC.face];
      const b = lerpV(inCrate, add(home, 0, 0, 0.26), sm(u, 0.05, 0.5));
      const h = u < 0.55 ? b : lerpV(add(home, 0, 0, 0.26), home, sm(u, 0.55, 0.9));
      return { r: add(h, 0.03, 0.08, 0.08), gr: 0.85, crouch: u < 0.25 ? 0.8 : i === 2 ? 0.45 : 0, nod: u < 0.25 ? 0.42 : i === 0 ? -0.14 : 0.22, l: c.bd(0.25, 0.6 * c.H, 0.14), props: { bottle: u < 0.93 ? h : null, crate: DC.crate }, n };
    };
    switch (k) {
      case 'crate': {
        const crate = lerpV(add(DC.crate, -0.2, 0.7, -0.08), DC.crate, sm(u, 0.1, 0.85));
        return { r: add(crate, 0.2, 0.13, 0), l: add(crate, -0.2, 0.13, 0), gr: 0.9, gl: 0.9, crouch: 0.7 * sm(u, 0.25, 0.85), nod: 0.3, props: { crate }, n };
      }
      case 'open':
        return { l: doorHand(sm(u, 0.1, 0.9)), gl: 0.9, nod: 0.05, props: { crate: DC.crate }, n };
      case 'p0':
        return put(0);
      case 'p1':
        return put(1);
      case 'p2':
        return put(2);
      case 'face':
        // The labels turned to the glass.
        return { r: [0.2 - 0.3 * frac(u * 2), 1.12, DC.face + 0.06], gr: 0.6, l: c.bd(0.25, 0.6 * c.H, 0.14), nod: 0.14, props: { crate: DC.crate }, n };
      case 'close':
        return { l: doorHand(1 - sm(u, 0.1, 0.9)), gl: 0.9, nod: 0.05, props: { crate: DC.crate }, n };
      default:
        // The thermometer read on the door.
        return { nod: -0.1, l: c.bd(0.2, 0.56 * c.H, 0.1), r: [0.3, 1.74, 0.46], gr: 0.2, palms: 0.1, props: { crate: DC.crate }, n };
    }
  },
};

// =============================================================================================
// 택배 접수기 (deliveryPOS, 1 × 1): a terminal on a cabinet with a platform scale and a label printer.

export const PC = {
  stand: 0.62,
  scale: [-0.22, 0.74, 0.14] as V,
  screen: [0.2, 1.22, 0.02] as V,
  printer: [0.3, 0.98, 0.2] as V,
  cust: [-0.82, 0.72] as [number, number],
  rack: [1.0, 1.02, 0.1] as V,
};
const PARCEL: Script = {
  seq: [['greet', 1.3], ['place', 1.6], ['read', 1.3], ['key', 2.4], ['print', 1.4], ['stick', 1.6], ['pay', 1.5], ['rack', 2.2, 0.7], ['back', 0.6]],
  at: (k) => (k === 'rack' ? st(0.55, PC.stand + 0.08, PI - 0.5) : st(0.08, PC.stand)),
  key(k, u, c): Key {
    const held: V = [PC.cust[0] + 0.34, 1.0, PC.cust[1]];
    const box = (e: number): V => lerpV(held, PC.scale, e);
    const placed = c.p('place', 0.1, 0.85);
    const boxAt = c.p('rack', 0.1, 0.8) > 0 ? lerpV(PC.scale, PC.rack, c.p('rack', 0.1, 0.8)) : box(placed);
    const n = { cust: c.p('greet', 0, 0.4) - c.p('rack', 0.2, 0.9), weight: c.p('place', 0.75, 1), keyed: c.p('key') * 3, label: c.p('stick', 0.5, 0.9), cBow: k === 'pay' ? Math.sin(u * PI) : 0, cTap: 0, stored: c.p('rack', 0.75, 0.95), holds: c.p('greet', 0, 0.3) * (1 - c.p('place', 0.6, 0.9)) };
    const props: Record<string, V | null> = { box: c.p('greet', 0, 0.3) > 0 && c.p('rack', 0.75, 0.95) < 1 ? boxAt : null };
    switch (k) {
      case 'greet':
        return { nod: Math.sin(u * PI) * 0.3, lean: Math.sin(u * PI) * 0.14, props, n };
      case 'place':
        return { l: add(PC.scale, -0.04, 0.2, 0.08), nod: 0.25, gl: 0.3, palms: 0.2, props, n };
      case 'read':
        return { nod: 0.3, l: add(PC.scale, 0.0, 0.26, 0.14), gl: 0.3, props, n };
      case 'key':
        return { r: add(PC.screen, -0.06 + 0.12 * frac(u * 5), -0.06 + 0.1 * frac(u * 3), 0.05), tap: true, nod: 0.12, props, n };
      case 'print': {
        const sl = add(PC.printer, 0, 0.05, 0.1 + 0.05 * sm(u, 0.3, 0.8));
        return { r: add(sl, 0, 0.02, 0.02), gr: 0.75, nod: 0.3, props: { ...props, slip: sl }, n };
      }
      case 'stick': {
        const s = lerpV(add(PC.printer, 0, 0.05, 0.15), add(PC.scale, 0.02, 0.27, 0.13), sm(u, 0.1, 0.6));
        return { r: add(s, 0.01, 0.02, 0.04), gr: 0.75, l: add(PC.scale, -0.14, 0.14, 0.12), gl: 0.5, nod: 0.3, lean: 0.08, props: { ...props, slip: u < 0.65 ? s : null }, n };
      }
      case 'pay':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.14 * Math.sin(u * PI), props, n };
      case 'rack': {
        const b = boxAt;
        return { r: add(b, 0.17, 0.02, 0.05), l: add(b, -0.17, 0.02, 0.05), gr: 0.9, gl: 0.9, nod: 0.12, props, n };
      }
      default:
        return { nod: 0.08, props, n };
    }
  },
};

// =============================================================================================
// 발주 단말 (orderTablet, 1 × 1): a standing desk with its terminal.

export const OT = {
  stand: 0.6,
  top: 1.0,
  screen: [0.0, 1.32, -0.12] as V,
  pad: [-0.22, 1.03, 0.12] as V,
  board: [0.62, 1.42, 0.3] as V,
};
const tapAt = (u: number, i: number): V => add(OT.screen, -0.14 + 0.28 * frac(u * (3 + i)), -0.08 + 0.16 * frac(u * 2 + i * 0.3), 0.07);
const ORDER: Script = {
  seq: [['sheet', 2.0], ['tap0', 2.4], ['look', 1.5], ['tap1', 2.4], ['send', 1.4], ['done', 1.0]],
  at: () => st(0, OT.stand),
  key(k, u, c): Key {
    const n = { lines: c.p('tap0') * 2 + c.p('tap1') * 2, sent: c.p('send', 0.5, 0.7) };
    switch (k) {
      case 'sheet':
        return { l: add(OT.pad, 0, 0.02, 0.02 + 0.03 * Math.sin(u * PI)), gl: 0.7, r: add(OT.pad, 0.15 + 0.1 * frac(u * 2), 0.01, 0.02), gr: 0.75, nod: 0.36, n };
      case 'tap0':
        return { r: tapAt(u, 0), tap: true, l: add(OT.pad, 0, 0.02, 0.02), nod: 0.14, n };
      case 'look':
        return { l: add(OT.pad, 0, 0.02, 0.04), gl: 0.7, nod: 0.38, r: c.bd(-0.2, 0.6 * c.H, 0.16), n };
      case 'tap1':
        return { r: tapAt(u, 1), tap: true, l: add(OT.pad, 0, 0.02, 0.02), nod: 0.14, n };
      case 'send':
        return { r: add(OT.screen, 0.12, -0.08 + 0.01 * Math.sin(u * 20), 0.07), tap: true, nod: 0.14, n };
      default:
        return { nod: 0.05, l: c.bd(0.22, 0.56 * c.H, 0.08), r: c.bd(-0.22, 0.56 * c.H, 0.08), n };
    }
  },
};
const SHIFTS: Script = {
  seq: [['look', 1.8], ['fill', 3.6], ['think', 1.8], ['fill2', 3.0], ['print', 1.5], ['pin', 2.4, 0.7], ['back', 0.8]],
  at: (k) => (k === 'pin' ? st(0.4, OT.stand + 0.05, PI - 0.55) : st(0, OT.stand)),
  key(k, u, c): Key {
    const n = { filled: c.p('fill') * 9 + c.p('fill2') * 9, pinned: c.p('pin', 0.55, 0.8) };
    const sheet = add(OT.board, -0.02, -0.03, 0.03);
    switch (k) {
      case 'look':
        return { nod: 0.1, r: tapAt(u * 0.2, 0), l: c.bd(0.16, 0.86 * c.H, 0.1), n };
      case 'fill':
        return { r: tapAt(u, 2), tap: true, nod: 0.14, n };
      case 'think':
        return { r: c.bd(-0.12, 0.92 * c.H, 0.15), l: c.bd(0.15, 0.62 * c.H, 0.14), nod: -0.04, n };
      case 'fill2':
        return { r: tapAt(u, 3), tap: true, nod: 0.14, n };
      case 'print':
        return { r: add(OT.pad, 0.15, 0.04, 0.03 + 0.06 * u), gr: 0.75, nod: 0.3, props: { paper: add(OT.pad, 0.15, 0.03, 0.03 + 0.06 * u) }, n };
      case 'pin': {
        const hand = lerpV(c.bd(-0.2, 0.7 * c.H, 0.25), sheet, sm(u, 0.1, 0.55));
        return { r: hand, gr: 0.75, l: add(sheet, -0.1, 0.03, 0), nod: -0.05, props: { paper: u < 0.6 ? add(hand, 0, 0, -0.01) : null }, n };
      }
      default:
        return { nod: 0.05, n };
    }
  },
};
const SALES: Script = {
  seq: [['open', 1.6], ['read', 2.8], ['note', 2.2], ['swipe', 1.6], ['read2', 2.4], ['note2', 2.0], ['nod', 1.0]],
  at: () => st(0, OT.stand),
  key(k, u, c): Key {
    const n = { chart: c.p('open', 0.2, 1), page: c.p('swipe', 0.2, 0.8) };
    const noting: Key = { l: add(OT.pad, -0.04, 0.02, 0.02), gl: 0.6, r: add(OT.pad, 0.03 + 0.09 * frac(u * 3), 0.03, 0.02 + 0.03 * Math.sin(c.t * 9)), gr: 0.85, nod: 0.38, props: { pen: add(OT.pad, 0.03 + 0.09 * frac(u * 3), 0.05, 0.03) }, n };
    switch (k) {
      case 'open':
        return { r: tapAt(u * 0.3, 0), tap: true, nod: 0.12, n };
      case 'read':
      case 'read2':
        return { r: add(OT.screen, -0.1 + 0.2 * u, 0.03, 0.08), gr: 0.1, palms: 0.1, nod: 0.08, l: c.bd(0.15, 0.6 * c.H, 0.15), n };
      case 'note':
      case 'note2':
        return noting;
      case 'swipe':
        return { r: add(OT.screen, 0.14 - 0.28 * sm(u, 0.2, 0.8), 0, 0.08), tap: true, nod: 0.1, n };
      default:
        return { nod: 0.2 * Math.sin(u * PI), n };
    }
  },
};

// =============================================================================================
// 온장 쇼케이스 (cvHotCase, 1 × 1): served from behind (+z), customers see through the glass.

export const HC = {
  stand: 0.64,
  deck: 1.0,
  deck2: 1.2,
  tray: [-0.34, 0.94, 0.5] as V,
  places: [[-0.2, 1.0, 0.0], [0.05, 1.0, 0.03], [0.24, 1.0, -0.03]] as V[],
};
const HOT: Script = {
  seq: [['tray', 1.5], ['open', 1.0], ['b0', 1.5], ['b1', 1.5], ['b2', 1.5], ['shut', 1.0], ['wipe', 2.2]],
  at: () => st(0.02, HC.stand),
  key(k, u, c): Key {
    const n = { door: c.p('open', 0.1, 0.9) - c.p('shut', 0.1, 0.9), filled: count(c, 'b0', 1) + count(c, 'b1', 1) + count(c, 'b2', 1), steam: c.p('open', 0.2, 0.8) - c.p('shut', 0, 0.6) };
    const place = (i: number): Key => {
      const from = add(HC.tray, 0.04, 0.06, 0);
      const to = add(HC.places[i], 0, 0.05, 0);
      const h: V = lerpV(from, to, sm(u, 0.15, 0.75));
      const carrying = u > 0.15 && u < 0.78;
      return { r: add(h, 0.03, 0.05, 0.14), gr: 0.85, l: add(HC.tray, -0.06, 0.04, 0.1), gl: 0.9, nod: 0.3, lean: 0.1, props: { tongs: add(h, 0.02, 0.03, 0.07), bun: carrying ? h : null, tray: HC.tray }, n };
    };
    switch (k) {
      case 'tray': {
        const tr = lerpV(add(HC.tray, 0.26, -0.5, 0.04), HC.tray, sm(u, 0.2, 0.9));
        return { r: add(tr, 0.2, 0.03, 0.06), l: add(tr, -0.16, 0.03, 0.06), gr: 0.85, gl: 0.85, crouch: 0.5 * (1 - sm(u, 0.2, 0.7)), nod: 0.32, props: { tray: tr }, n };
      }
      case 'open':
        return { r: [0.2, 1.3, 0.44], gr: 0.9, l: add(HC.tray, -0.06, 0.04, 0.1), gl: 0.9, nod: 0.18, props: { tray: HC.tray }, n };
      case 'b0':
        return place(0);
      case 'b1':
        return place(1);
      case 'b2':
        return place(2);
      case 'shut':
        return { r: [0.2, 1.3, 0.44 - 0.04 * u], gr: 0.9, nod: 0.14, l: add(HC.tray, -0.06, 0.04, 0.1), gl: 0.9, props: { tray: HC.tray }, n };
      default: {
        // The handles and the glass top wiped in circles.
        const w: V = [0.16 * Math.sin(c.t * 5), 1.48 + 0.02 * Math.cos(c.t * 5), 0.36];
        return { r: add(w, 0, 0.01, 0.02), gr: 0.8, nod: 0.08, props: { cloth: w }, n };
      }
    }
  },
};

// =============================================================================================
// 컵라면 진열대 (cvRamenShelf, 2 × 1), 온수기 코너 (cvHotWater, 1 × 1).

export const RM = {
  stand: 0.68,
  decks: [1.4, 1.02, 0.64, 0.26],
  crate: [0.74, 0, 0.72] as V,
  gaps: [[-0.45, 1.4], [0.15, 1.02], [-0.2, 0.64]] as Array<[number, number]>,
};
const RAMEN: Script = {
  seq: [['set', 1.2], ['g0', 1.7], ['g1', 1.7], ['g2', 1.9], ['push', 2.2], ['tag', 1.2]],
  at: (k) => (k === 'g0' ? st(-0.3, RM.stand) : k === 'set' ? st(0.35, RM.stand) : st(0, RM.stand)),
  key(k, u, c): Key {
    const n = { filled: count(c, 'g0', 1) + count(c, 'g1', 1) + count(c, 'g2', 1), pushed: c.p('push') };
    const inCrate = add(RM.crate, 0, 0.25, 0);
    const put = (i: number): Key => {
      const home: V = [RM.gaps[i][0], RM.gaps[i][1], 0.3];
      const h = u < 0.55 ? lerpV(inCrate, add(home, 0, 0.04, 0.18), sm(u, 0.05, 0.55)) : lerpV(add(home, 0, 0.04, 0.18), home, sm(u, 0.55, 0.92));
      return { r: add(h, 0.05, 0.1, 0.05), l: add(h, -0.05, 0.1, 0.05), gr: 0.8, gl: 0.8, crouch: u < 0.25 ? 0.75 : RM.gaps[i][1] < 0.8 ? 0.35 : 0, nod: u < 0.25 ? 0.42 : RM.gaps[i][1] > 1.3 ? -0.08 : 0.2, props: { cup: u < 0.94 ? h : null, crate: RM.crate }, n };
    };
    switch (k) {
      case 'set': {
        const crate = lerpV(add(RM.crate, -0.1, 0.7, -0.05), RM.crate, sm(u, 0.1, 0.85));
        return { r: add(crate, 0.2, 0.13, 0), l: add(crate, -0.2, 0.13, 0), gr: 0.9, gl: 0.9, crouch: 0.7 * sm(u, 0.25, 0.85), nod: 0.3, props: { crate }, n };
      }
      case 'g0':
        return put(0);
      case 'g1':
        return put(1);
      case 'g2':
        return put(2);
      case 'push':
        return { r: [0.42 - 0.84 * frac(u * 1.5), 1.1, 0.3], l: [0.3 - 0.8 * frac(u * 1.5), 1.08, 0.28], gr: 0.5, gl: 0.5, nod: 0.18, props: { crate: RM.crate }, n };
      default:
        return { r: [0.2, 0.66, 0.42], gr: 0.7, nod: 0.3, crouch: 0.3, props: { crate: RM.crate }, n: { ...n, tag: 1 } };
    }
  },
};
export const HW = {
  stand: 0.64,
  top: 0.92,
  lid: [-0.16, 1.5, -0.08] as V,
  gauge: [-0.16, 1.14, 0.12] as V,
  jug: [0.34, 0, 0.74] as V,
};
const WATER: Script = {
  seq: [['crouch', 1.2], ['lift', 1.5], ['lid', 1.0], ['pour', 3.4], ['down', 1.2], ['close', 1.0], ['wipe', 2.0]],
  at: () => st(0.08, HW.stand),
  key(k, u, c): Key {
    const n = { level: 0.22 + 0.78 * c.p('pour', 0.1, 0.95), lid: c.p('lid', 0.1, 0.9) - c.p('close', 0.1, 0.9), pouring: k === 'pour' && u > 0.08 && u < 0.95 ? 1 : 0 };
    const pourAt = add(HW.lid, 0.02, 0.18, 0.08);
    const jugProps = (j: V, tip = 0): Key => ({ r: add(j, 0.13, 0.28, 0.02), l: add(j, -0.1, 0.1, 0.1), gr: 0.9, gl: 0.9, props: { jug: j }, n: { ...n, tip } });
    switch (k) {
      case 'crouch':
        return { ...jugProps(HW.jug), crouch: 0.8 * sm(u, 0.1, 0.8), nod: 0.42 };
      case 'lift': {
        const j = lerpV(HW.jug, [0.14, 0.92, 0.38], sm(u, 0.1, 0.9));
        return { ...jugProps(j), crouch: 0.8 * (1 - sm(u, 0.1, 0.7)), nod: 0.22 };
      }
      case 'lid':
        return { ...jugProps([0.14, 0.92, 0.38]), l: add(HW.lid, 0, 0.04, 0.02), gl: 0.8, nod: -0.05 };
      case 'pour':
        return { ...jugProps(pourAt, sm(u, 0, 0.1) * (1 - sm(u, 0.9, 1))), nod: -0.06 + 0.02 * Math.sin(c.t * 2) };
      case 'down': {
        const j = lerpV(pourAt, HW.jug, sm(u, 0.1, 0.9));
        return { ...jugProps(j), crouch: 0.7 * sm(u, 0.35, 0.9), nod: 0.3 };
      }
      case 'close':
        return { r: add(HW.lid, 0.02, 0.05, 0.02), gr: 0.75, nod: -0.04, props: { jug: HW.jug }, n };
      default: {
        // The drip tray.
        const w: V = [-0.18 + 0.16 * Math.sin(c.t * 5), HW.top + 0.03, 0.2 + 0.04 * Math.cos(c.t * 5)];
        return { r: add(w, 0, 0.02, 0.02), gr: 0.8, nod: 0.35, props: { cloth: w, jug: HW.jug }, n };
      }
    }
  },
};

// =============================================================================================
// 도시락 냉장 쇼케이스 (cvLunchChiller, 2 × 1): open-fronted decks with a night blind and a price rail.

export const LC = {
  stand: 0.68,
  decks: [1.36, 1.02, 0.68],
  face: 0.28,
  row: [-0.66, -0.4, -0.14, 0.14, 0.4, 0.66],
  basket: [-0.68, 0, 0.74] as V,
  tray: [0.74, 0, 0.74] as V,
};
export const LC_BAD = [2, 4];
const lunchAt = (i: number): V => [LC.row[i], LC.decks[1] + 0.04, LC.face];
const LUNCH: Script = {
  seq: [['s0', 1.0], ['s1', 1.0], ['s2', 1.3], ['pull2', 1.5], ['s3', 1.0], ['s4', 1.3], ['pull4', 1.5], ['fresh2', 1.7], ['fresh4', 1.7], ['sheet', 1.7]],
  at: (k) => {
    if (k === 's0' || k === 's1' || k === 's2' || k === 'pull2') return st(-0.36, LC.stand);
    if (k === 'sheet') return st(0, LC.stand);
    return st(0.3, LC.stand);
  },
  key(k, u, c): Key {
    const n = { seen: count(c, 's0', 1) + count(c, 's1', 1) + count(c, 's2', 1) + count(c, 's3', 1) + count(c, 's4', 1), red2: c.p('s2', 0.5, 0.6), red4: c.p('s4', 0.5, 0.6), gone2: c.p('pull2', 0.15, 0.3) - c.p('fresh2', 0.8, 0.95), gone4: c.p('pull4', 0.15, 0.3) - c.p('fresh4', 0.8, 0.95), tossed: count(c, 'pull2', 1) + count(c, 'pull4', 1) };
    const pdaBeam = (i: number): Key => {
      const pda = add(lunchAt(i), 0, 0.08, 0.28);
      return { l: add(pda, -0.02, 0, 0.04), gl: 0.9, r: c.bd(-0.2, 0.58 * c.H, 0.14), nod: 0.14, props: { pda, tray: LC.tray }, n: { ...n, beam: i + 1, beep: beepAt(u, 0.45) } };
    };
    const pull = (i: number): Key => {
      const home = lunchAt(i);
      const h = lerpV(home, add(LC.basket, 0, 0.28, 0), sm(u, 0.15, 0.85));
      return { r: add(h, 0.04, 0.04, 0.09), gr: 0.85, crouch: 0.5 * sm(u, 0.4, 0.8), nod: 0.35, l: c.bd(0.18, 0.62 * c.H, 0.2), gl: 0.9, props: { box: u < 0.88 ? h : null, pda: c.bd(0.18, 0.64 * c.H, 0.24), tray: LC.tray }, n };
    };
    const fresh = (i: number): Key => {
      const home = lunchAt(i);
      const src = add(LC.tray, 0, 0.18, 0);
      const h = u < 0.6 ? lerpV(src, add(home, 0, 0, 0.14), sm(u, 0.1, 0.6)) : lerpV(add(home, 0, 0, 0.14), home, sm(u, 0.6, 0.92));
      return { r: add(h, 0.04, 0.04, 0.09), l: add(h, -0.05, 0.04, 0.09), gr: 0.85, gl: 0.85, crouch: u < 0.3 ? 0.75 : 0, nod: u < 0.3 ? 0.42 : 0.2, props: { box: u < 0.94 ? h : null, tray: LC.tray }, n };
    };
    switch (k) {
      case 's0':
        return pdaBeam(0);
      case 's1':
        return pdaBeam(1);
      case 's2':
        return pdaBeam(2);
      case 's3':
        return pdaBeam(3);
      case 's4':
        return pdaBeam(4);
      case 'pull2':
        return pull(2);
      case 'pull4':
        return pull(4);
      case 'fresh2':
        return fresh(2);
      case 'fresh4':
        return fresh(4);
      default: {
        // The disposal sheet on the clipboard hung at the side.
        const b: V = [-0.96, 1.2, 0.2];
        return { r: add(b, 0.06 + 0.08 * frac(u * 3), 0.04, 0.05), gr: 0.85, l: add(b, -0.05, -0.1, 0.05), nod: 0.28, props: { pen: add(b, 0.06 + 0.08 * frac(u * 3), 0.06, 0.06), tray: LC.tray }, n };
      }
    }
  },
};

// =============================================================================================
// 창가 자리 (cvWindowBar, 4 × 1): placed with its front to the room, the window at its back.

export const WB = {
  stand: 0.64,
  top: 0.92,
  tray: [0.1, 0.94, 0.3] as V,
  cups: [[-0.42, 0.94, 0.08], [0.36, 0.94, -0.02]] as V[],
};
const BAR: Script = {
  seq: [['tray', 1.1], ['c0', 1.6, 0.8], ['c1', 1.6, 0.8], ['spray', 1.7], ['wL', 2.2, 1.0], ['wR', 2.2], ['lift', 1.1]],
  at: (k) => (k === 'c0' || k === 'wL' ? st(-0.42, WB.stand) : k === 'c1' || k === 'wR' ? st(0.36, WB.stand) : st(0.08, WB.stand)),
  key(k, u, c): Key {
    const n = { took0: c.p('c0', 0.6, 0.9), took1: c.p('c1', 0.6, 0.9), wet: c.p('spray', 0.2, 0.8) - c.p('lift'), wiped: c.p('wL') * 0.5 + c.p('wR') * 0.5, puff: k === 'spray' ? Math.max(0, Math.sin(u * PI * 4)) : 0 };
    const props: Record<string, V | null> = { tray: k === 'lift' ? add(WB.tray, 0, 0.24 * sm(u, 0.1, 0.9), 0.1 * sm(u, 0.1, 0.9)) : WB.tray };
    const gather = (i: number): Key => {
      const h = lerpV(WB.cups[i], add(WB.tray, 0.05 * i, 0.02, -0.02), sm(u, 0.2, 0.9));
      return { r: add(h, 0.03, 0.09, 0.05), gr: 0.85, nod: 0.3, lean: 0.1, props: { ...props, [`cup${i}`]: h }, n };
    };
    const wipe = (a: number, b: number): Key => {
      const x = mixN(a, b, u) + 0.09 * Math.sin(c.t * 6);
      const w: V = [x, WB.top + 0.03, 0.05 + 0.1 * Math.sin(c.t * 3)];
      return { r: add(w, 0, 0.02, 0.05), gr: 0.8, nod: 0.3, lean: 0.14, props: { ...props, cloth: w }, n };
    };
    switch (k) {
      case 'tray':
        return { r: add(WB.tray, 0.2, 0.03, 0.08), l: add(WB.tray, -0.2, 0.03, 0.08), gr: 0.7, gl: 0.7, nod: 0.25, props, n };
      case 'c0':
        return gather(0);
      case 'c1':
        return gather(1);
      case 'spray': {
        const sp: V = [0.28, 1.16, 0.34];
        return { r: add(sp, 0, -0.02 - 0.015 * Math.max(0, Math.sin(u * PI * 4)), 0), gr: 0.9, nod: 0.25, props: { ...props, spray: sp }, n };
      }
      case 'wL':
        return wipe(-0.95, 0.1);
      case 'wR':
        return wipe(0.1, 0.92);
      default:
        return { r: add(props.tray as V, 0.2, 0.03, 0.08), l: add(props.tray as V, -0.2, 0.03, 0.08), gr: 0.9, gl: 0.9, nod: 0.2, props, n };
    }
  },
};

// =============================================================================================
// 무인 단말기 (cvAtm, 1 × 1): cash and bills, used by a customer the dweller stands beside.

export const AT = {
  screen: [0, 1.28, 0.28] as V,
  stand: [-0.68, 0.62] as [number, number],
  cust: [0.08, 0.72] as [number, number],
  buttons: [[-0.1, 1.2], [0.1, 1.2], [-0.1, 1.32], [0.1, 1.32]] as Array<[number, number]>,
  slot: [0.2, 1.02, 0.3] as V,
};
const ATM: Script = {
  seq: [['greet', 1.6, 0.7], ['p0', 2.2], ['wait', 1.0], ['p1', 2.2], ['pin', 2.2], ['p2', 2.0], ['cash', 2.2], ['bow', 1.5]],
  at: () => st(AT.stand[0], AT.stand[1], PI / 2 + 0.55),
  key(k, u, c): Key {
    const n = { cust: 1, page: c.p('p0', 0.8, 1) + c.p('p1', 0.8, 1) + c.p('pin', 0.7, 1) + c.p('p2', 0.8, 1), cNod: k === 'greet' || k === 'cash' ? 1 : 0, cBow: k === 'bow' ? Math.sin(u * PI) : 0, cPress: k === 'wait' || k === 'pin' ? 1 : 0, cash: c.p('cash', 0.1, 0.5), cTake: c.p('cash', 0.5, 0.9) };
    const point = (i: number): Key => {
      const b = AT.buttons[i];
      const tip: V = [b[0], b[1], AT.screen[2] + 0.06 + 0.012 * Math.sin(u * PI * 4)];
      return { r: tip, gr: 0.2, palms: 0.1, nod: 0.12, l: c.bd(0.18, 0.58 * c.H, 0.1), n };
    };
    switch (k) {
      case 'greet':
        return { nod: Math.sin(u * PI) * 0.26, lean: Math.sin(u * PI) * 0.12, n };
      case 'p0':
        return point(0);
      case 'p1':
        return point(1);
      case 'p2':
        return point(3);
      case 'pin':
        // Looking away while they key the number.
        return { nod: 0, r: c.bd(-0.2, 0.56 * c.H, 0.1), l: c.bd(0.2, 0.56 * c.H, 0.1), n };
      case 'cash':
        return { r: add(AT.slot, 0, 0.05, 0.1), gr: 0.2, palms: 0.1, nod: 0.25, l: c.bd(0.18, 0.58 * c.H, 0.1), n };
      case 'bow':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.16 * Math.sin(u * PI), n };
      default:
        return { nod: 0.12, r: c.bd(-0.2, 0.56 * c.H, 0.1), l: c.bd(0.2, 0.56 * c.H, 0.1), n };
    }
  },
};

// =============================================================================================
// 납품 상자 (cvCrateStack, 3 × 1): folding crates on a dolly, the slip on top, a bench for the scanner.

export const CR = {
  stand: 0.66,
  top: [-0.72, 1.26, 0.04] as V,
  bench: [0.08, 0.76, 0.08] as V,
  aside: [1.0, 0.44, 0.1] as V,
  slip: [-0.02, 0.96, 0.32] as V,
};
const CRATE: Script = {
  seq: [['slip', 2.0], ['count', 2.4, 0.7], ['lift', 1.7, 0.7], ['scan', 2.4], ['carry', 1.7, 0.7], ['again', 1.5, 0.7], ['sign', 2.0]],
  at: (k) => (k === 'count' || k === 'lift' || k === 'again' ? st(-0.68, CR.stand) : k === 'carry' ? st(0.72, CR.stand) : st(0.04, CR.stand)),
  key(k, u, c): Key {
    const crateAt = k === 'lift' ? lerpV(CR.top, CR.bench, sm(u, 0.1, 0.9)) : k === 'scan' ? CR.bench : k === 'carry' ? lerpV(CR.bench, CR.aside, sm(u, 0.05, 0.9)) : null;
    const n = { moved: c.p('carry', 0.85, 1), stack: 4 - count(c, 'lift', 1), ticks: c.p('count') * 2 + c.p('scan') * 2, signed: c.p('sign', 0.2, 0.9) };
    const props: Record<string, V | null> = { crate: crateAt };
    const grip = (a: V): Key => ({ r: add(a, 0.22, 0.2, 0), l: add(a, -0.22, 0.2, 0), gr: 0.9, gl: 0.9, props, n });
    switch (k) {
      case 'slip':
        return { l: add(CR.slip, -0.02, 0.03, 0.02), gl: 0.8, r: add(CR.slip, 0.06, 0.03, 0.01 + 0.03 * Math.sin(u * PI * 3)), gr: 0.75, nod: 0.3, n };
      case 'count':
        return { r: [-0.72 + 0.1 * Math.sin(u * PI * 2), 0.5 + 0.7 * frac(u * 2), 0.26], gr: 0.2, palms: 0.1, nod: 0.18, l: c.bd(0.15, 0.68 * c.H, 0.22), gl: 0.85, props: { board: c.bd(0.15, 0.7 * c.H, 0.24) }, n };
      case 'lift':
        return { ...grip(crateAt as V), nod: 0.14 };
      case 'scan':
        return { ...grip(CR.bench), r: add(CR.bench, 0.04, 0.42, 0.14), gr: 0.9, l: add(CR.bench, -0.16, 0.26, 0.1), nod: 0.36, props: { ...props, pda: add(CR.bench, 0.04, 0.42, 0.14) }, n: { ...n, beep: beepAt(u, 0.3) + beepAt(u, 0.68) } };
      case 'carry':
        return { ...grip(crateAt as V), crouch: 0.4 * sm(u, 0.5, 0.9), nod: 0.2 };
      case 'again':
        return { r: add(CR.top, 0.18, 0.05, 0.14), l: add(CR.top, -0.18, 0.05, 0.14), gr: 0.5, gl: 0.5, nod: 0.08, n };
      default:
        return { l: add(CR.slip, -0.04, 0.03, 0.02), gl: 0.8, r: add(CR.slip, 0.03 + 0.1 * u, 0.04, 0.01), gr: 0.85, nod: 0.34, props: { pen: add(CR.slip, 0.03 + 0.1 * u, 0.06, 0.02) }, n };
    }
  },
};

// =============================================================================================
// 청소 코너 (cvMopBin, 1 × 1): two lidded bins, a mop in its wringer.

export const MB = {
  stand: 0.68,
  binL: [-0.2, 0.72, 0.02] as V,
  bag: [-0.2, 0.42, 0.02] as V,
  bagOut: [-0.56, 0.16, 0.56] as V,
  mop: [0.26, 0.78, 0.12] as V,
  sweep: [[-0.1, 1.1], [0.14, 1.75], [-0.14, 2.45], [0.06, 1.5]] as Array<[number, number]>,
};
const BIN_SEQ: Seq = [['open', 1.1], ['lift', 1.7], ['tie', 1.8], ['set', 1.1], ['newBag', 1.7], ['shut', 0.8], ['grab', 1.1, 0.7], ['m0', 1.7, 0.8], ['m1', 1.7, 0.8], ['m2', 1.7, 0.8], ['m3', 1.5, 0.8], ['stow', 1.0]];
const BIN: Script = {
  seq: BIN_SEQ,
  at(k) {
    const m = /^m(\d)$/.exec(k);
    if (m) {
      const p = MB.sweep[+m[1]];
      return st(p[0] + 0.1, p[1] + 0.72, PI);
    }
    return k === 'grab' || k === 'stow' ? st(0.26, MB.stand) : st(-0.2, MB.stand);
  },
  key(k, u, c): Key {
    const n = { lid: c.p('open', 0.1, 0.9) - c.p('shut', 0.1, 0.9), bagOut: c.p('lift', 0.2, 0.9), tied: c.p('tie', 0.3, 0.9), newBag: c.p('newBag', 0.3, 0.9), mopping: c.p('grab', 0.5, 1) - c.p('stow', 0, 0.8), wet: 0 };
    const mopFrom = (head: V): Key => {
      const stick = lerpV(head, [c.st.x, 0.9, c.st.z - 0.08], 0.75);
      return { r: add(stick, 0.04, 0.0, 0), l: add(stick, -0.01, 0.2, 0.05), gr: 0.9, gl: 0.9, nod: 0.26, lean: 0.14, props: { mopHead: head }, n: { ...n, wet: 1 } };
    };
    switch (k) {
      case 'open':
        return { r: add(MB.binL, 0.08, 0.1, 0.18 - 0.1 * u), gr: 0.75, nod: 0.22, n };
      case 'lift': {
        const b = lerpV(MB.bag, MB.bagOut, sm(u, 0.2, 0.9));
        return { r: add(b, 0.06, 0.34, 0.03), l: add(b, -0.06, 0.34, 0.03), gr: 0.9, gl: 0.9, nod: 0.32, lean: 0.14, props: { bag: b }, n };
      }
      case 'tie': {
        const b = MB.bagOut;
        const s = 0.04 * Math.sin(c.t * 9);
        return { r: add(b, 0.05 + s, 0.34, 0.03), l: add(b, -0.05 - s, 0.34, 0.03), gr: 0.85, gl: 0.85, crouch: 0.65, nod: 0.38, props: { bag: b }, n };
      }
      case 'set':
        return { nod: 0.2, props: { bag: MB.bagOut }, n };
      case 'newBag':
        // Shaken open and rolled down over the rim.
        return { r: add(MB.binL, 0.16 + 0.04 * Math.sin(c.t * 9), 0.16, 0.06), l: add(MB.binL, -0.16 - 0.04 * Math.sin(c.t * 9), 0.16, 0.06), gr: 0.8, gl: 0.8, nod: 0.34, lean: 0.12, props: { bag: MB.bagOut }, n };
      case 'shut':
        return { r: add(MB.binL, 0.08, 0.1, 0.08 + 0.1 * u), gr: 0.75, nod: 0.2, props: { bag: MB.bagOut }, n };
      case 'grab':
        return { r: add(MB.mop, 0, 0.05, 0.03), l: add(MB.mop, 0, 0.28, 0.03), gr: 0.9, gl: 0.9, nod: 0.18, props: { bag: MB.bagOut }, n };
      case 'stow':
        return { r: add(MB.mop, 0, 0.05, 0.03), gr: 0.75, nod: 0.12, props: { bag: MB.bagOut }, n };
      default: {
        const m = /^m(\d)$/.exec(k);
        if (m) {
          const p = MB.sweep[+m[1]];
          const head: V = [p[0] + 0.26 * Math.sin(c.t * 2.6), 0.03, p[1] + 0.12 * Math.sin(c.t * 5.2)];
          const K = mopFrom(head);
          return { ...K, props: { ...K.props, bag: MB.bagOut } };
        }
        return { n };
      }
    }
  },
};

// =============================================================================================
// 파라솔 테이블 (cvParasolTable, 2 × 1).

export const PT = {
  stand: 0.66,
  top: 0.74,
  cups: [[-0.4, 0.74, 0.1], [0.05, 0.74, -0.16], [0.42, 0.74, 0.14]] as V[],
  bag: [0.76, 0.78, 0.48] as V,
  chair: [0.84, 0.0, 0.08] as V,
};
const TERRACE: Script = {
  seq: [['c0', 1.5, 0.7], ['c1', 1.5, 0.7], ['c2', 1.5, 0.7], ['tie', 1.3], ['wipe', 3.0], ['chair', 1.9, 0.8], ['look', 1.0]],
  at: (k) => (k === 'c0' ? st(-0.42, PT.stand) : k === 'c2' || k === 'tie' ? st(0.42, PT.stand) : k === 'chair' ? st(0.58, PT.stand + 0.1, PI - 0.5) : st(0, PT.stand)),
  key(k, u, c): Key {
    const n = { took0: c.p('c0', 0.65, 0.9), took1: c.p('c1', 0.65, 0.9), took2: c.p('c2', 0.65, 0.9), wiped: c.p('wipe'), straight: c.p('chair', 0.2, 0.85) };
    const gather = (i: number): Key => {
      const h = lerpV(PT.cups[i], add(PT.bag, 0, 0.1, 0), sm(u, 0.2, 0.9));
      return { r: add(h, 0.03, 0.09, 0.05), gr: 0.85, nod: 0.32, lean: 0.14, l: add(PT.bag, -0.04, 0.2, 0.03), gl: 0.9, props: { [`cup${i}`]: h, bag: PT.bag }, n };
    };
    switch (k) {
      case 'c0':
        return gather(0);
      case 'c1':
        return gather(1);
      case 'c2':
        return gather(2);
      case 'tie':
        return { r: add(PT.bag, 0.04 + 0.03 * Math.sin(c.t * 9), 0.24, 0.03), l: add(PT.bag, -0.04, 0.24, 0.03), gr: 0.85, gl: 0.85, nod: 0.3, props: { bag: PT.bag }, n };
      case 'wipe': {
        const w: V = [-0.5 + u + 0.14 * Math.sin(c.t * 6), PT.top + 0.03, 0.14 * Math.cos(c.t * 3)];
        return { r: add(w, 0, 0.02, 0.05), gr: 0.8, nod: 0.34, lean: 0.14, props: { cloth: w, bag: PT.bag }, n };
      }
      case 'chair':
        return { r: add(PT.chair, 0.12, 0.76, 0.02 + 0.15 * (1 - sm(u, 0.2, 0.85))), l: add(PT.chair, -0.12, 0.76, 0.02 + 0.15 * (1 - sm(u, 0.2, 0.85))), gr: 0.8, gl: 0.8, nod: 0.2, lean: 0.12, props: { bag: PT.bag }, n };
      default:
        return { nod: 0.05, r: add(PT.bag, 0, 0.26, 0.05), gr: 0.85, props: { bag: PT.bag }, n };
    }
  },
};

const SCRIPTS: Record<CvMotion, Script> = {
  cvTill: tillScript(false),
  cvRush: tillScript(true),
  cvLearn: LEARN,
  cvRestock: RESTOCK,
  cvCheck: CHECK,
  cvTrain: TRAIN,
  cvDrinks: DRINKS,
  cvParcel: PARCEL,
  cvOrder: ORDER,
  cvShifts: SHIFTS,
  cvSales: SALES,
  cvHot: HOT,
  cvRamen: RAMEN,
  cvWater: WATER,
  cvLunch: LUNCH,
  cvBar: BAR,
  cvAtm: ATM,
  cvCrate: CRATE,
  cvBin: BIN,
  cvTerrace: TERRACE,
};
