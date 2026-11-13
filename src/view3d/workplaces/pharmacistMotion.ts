import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 약국 (2026-11-01, the workplace pipeline, at the user's request). Each motion is a round of beats:
 * where the dweller is, where the hands go, and what moves. The piece reads the same script by the same clock
 * (pharmacist.ts), so the tablets the spatula pushes are the ones that went from the bottle to the tray, and the
 * sachets that come out of the packer are the ones the hands tear off and hold to the light.
 *
 * - rxDispense (조제대): the slip read, a bottle down from the shelf, tablets poured on the tray, counted off by
 *   spatula in fives, tipped into a paper bag, the label pulled from the printer, the bag on the finished pile.
 *   rxUrgent is the same at a run under a red lamp. rxTrial: a chart read off the monitor with notes taken.
 *   rxReview: two clinics' slips side by side, a finger down each, the clash circled, the clinic rung.
 * - rxStock (약품 진열장): a crate at the feet, old stock brought forward, new behind. rxExpiry: boxes turned over
 *   and read, the one past its date in the basket. rxOrder: the tablet in hand, row by row, what's short tapped in.
 * - rxTakeRx (약국 계산대): a customer's slip taken, scanned, read off the screen, a question asked, in the tray for
 *   the dispensary. rxExplain: the bag brought back, a sachet held up, morning, noon and night pointed out, the card,
 *   the bag handed over, a bow. rxTrain: a new member of staff shown the screen, tries it, and is nodded at.
 * - rxFill (약장): a carton on the ledge, a drawer pulled, tablets tipped in, slid home, the next.
 * - rxPack (자동 포장기): a dose tray pulled out and filled, pushed in, started; the printed strip comes out into its
 *   basket, is torn off and held to the light.
 * - rxOintment (연고 조제대): base weighed on the balance, put on the slab, drops added, worked with the spatula until
 *   the colour is even, scraped into a jar, lid and label.
 * - rxFridge (의약품 냉장고): the thermometer read and logged, the door opened, a box checked and put back.
 * - rxLookup (처방 조회 단말): typed in, a warning comes up red, the clinic rung, the change keyed, green.
 * - rxFace (일반의약품 진열 벽): along the wall bringing the boxes to the front, a price tag clipped straight.
 * - rxBp (혈압 측정 의자): an older customer sat with their arm in the cuff, it pumps up and down, the reading written
 *   in their booklet.
 * - rxDelivery (의약품 입고 상자): tape cut, boxes lifted out and scanned against the slip, the carton stacked aside.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x. All drug names are made up.
 */
export type RxMotion = 'rxDispense' | 'rxUrgent' | 'rxTrial' | 'rxReview' | 'rxStock' | 'rxExpiry' | 'rxOrder' | 'rxTakeRx' | 'rxExplain' | 'rxTrain' | 'rxFill' | 'rxPack' | 'rxOintment' | 'rxFridge' | 'rxLookup' | 'rxFace' | 'rxBp' | 'rxDelivery';
export const RX_MOTIONS = new Set<string>(['rxDispense', 'rxUrgent', 'rxTrial', 'rxReview', 'rxStock', 'rxExpiry', 'rxOrder', 'rxTakeRx', 'rxExplain', 'rxTrain', 'rxFill', 'rxPack', 'rxOintment', 'rxFridge', 'rxLookup', 'rxFace', 'rxBp', 'rxDelivery']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const rxPhase = (p: THREE.Vector3) => frac(p.x * 0.371 + p.z * 0.547);
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
export interface RxNow {
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
export function rxNow(m: RxMotion, t: number, ph: number, H = 1.6): RxNow {
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
export function rxPose(m: RxMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = rxNow(m, t, rxPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
const beepAt = (u: number, a: number) => (u > a && u < a + 0.14 ? 1 : 0);
const rest = (c: Ctx): Pick<Key, 'l' | 'r'> => ({ l: c.bd(0.16, 0.58 * c.H, 0.14), r: c.bd(-0.16, 0.58 * c.H, 0.14) });

// =============================================================================================
// 조제대 (dispensingTable, 2 × 1): the top at 0.88, a shelf of stock bottles along its back.

export const DT = {
  stand: 0.62,
  top: 0.88,
  slip: [-0.68, 0.885, 0.2] as V,
  tray: [-0.12, 0.9, 0.16] as V,
  shelfBottle: [-0.34, 1.16, -0.32] as V,
  bottleDown: [-0.46, 0.88, 0.06] as V,
  bag: [0.3, 0.885, 0.2] as V,
  pile: [0.7, 0.885, 0.14] as V,
  printer: [0.66, 0.98, -0.12] as V,
  screen: [0.2, 1.14, -0.2] as V,
  keys: [0.14, 0.895, 0.03] as V,
  phone: [-0.78, 0.92, -0.08] as V,
  slipA: [-0.34, 0.885, 0.18] as V,
  slipB: [0.1, 0.885, 0.18] as V,
};
function dispenseScript(urgent: boolean): Script {
  const q = urgent ? 0.62 : 1;
  return {
    seq: [['read', 2.2 * q], ['take', 1.6 * q], ['pour', 2.0 * q], ['count', 3.4 * q], ['tip', 1.8 * q], ['label', 2.0 * q], ['pile', 1.7 * q], ['pause', urgent ? 0.3 : 0.9]],
    at: (k) => (k === 'read' ? st(-0.42, DT.stand) : k === 'label' || k === 'pile' ? st(0.42, DT.stand) : st(-0.1, DT.stand)),
    key(k, u, c): Key {
      const pills = c.p('pour', 0.2, 0.85) - c.p('tip', 0.25, 0.85);
      const n: Record<string, number> = { urgent: urgent ? 1 : 0, pills, bagFull: c.p('tip', 0.25, 0.85), piled: c.p('pile', 0.55, 0.95), labelled: c.p('label', 0.6, 0.85), tilt: 0, trayTilt: 0, printing: 0, counted: 0 };
      const slip: V | null = DT.slip;
      const bottle: V = c.p('count', 0, 0.2) > 0 ? DT.bottleDown : DT.shelfBottle;
      const props: Record<string, V | null> = { slip, bottle, bag: c.p('pile', 0.55, 0.95) >= 1 ? null : DT.bag };
      switch (k) {
        case 'read': {
          const e = sm(u, 0.05, 0.25) - sm(u, 0.82, 1);
          const hold = lerpV(DT.slip, c.bd(0.04, 0.68 * c.H, 0.3), e);
          return { l: add(hold, 0, 0, 0.02), r: c.bd(-0.16, 0.58 * c.H, 0.14), gl: 0.9, nod: 0.26, props: { ...props, slip: hold }, n };
        }
        case 'take': {
          const b = lerpV(DT.shelfBottle, add(DT.tray, -0.06, 0.2, -0.04), sm(u, 0.25, 0.95));
          return { r: add(b, 0, 0.04, 0.03), gr: 0.9, l: add(DT.tray, -0.16, 0.03, 0.04), nod: 0.24, props: { ...props, bottle: b }, n };
        }
        case 'pour': {
          const b = add(DT.tray, -0.06, 0.2, -0.04);
          return { r: add(b, 0, 0.04, 0.03), gr: 0.9, l: add(DT.tray, -0.16, 0.03, 0.04), nod: 0.42, lean: 0.1, props: { ...props, bottle: b }, n: { ...n, tilt: Math.sin(Math.min(1, u * 1.15) * PI) } };
        }
        case 'count': {
          // Fives pushed across with the spatula, the ones counted going to the chute side.
          const stroke = frac(u * 5);
          const sp = add(DT.tray, 0.09 - 0.17 * sm(stroke, 0.05, 0.8), 0.035, 0.015 + 0.04 * Math.sin(u * 19));
          return { r: add(sp, 0.08, 0.03, 0.05), gr: 0.85, l: add(DT.tray, -0.2, 0.03, 0.04), nod: 0.46, lean: 0.12, props: { ...props, spat: sp }, n: { ...n, counted: Math.floor(u * 5) + sm(stroke, 0.05, 0.8) } };
        }
        case 'tip': {
          const e = sm(u, 0.02, 0.3);
          const tray = lerpV(DT.tray, add(DT.bag, -0.13, 0.17, 0), e);
          const back = sm(u, 0.85, 1);
          const trayP = lerpV(tray, DT.tray, back);
          return { r: add(trayP, 0.14, 0.03, 0.03), l: add(trayP, -0.12, 0.03, 0.03), gr: 0.85, gl: 0.85, nod: 0.4, props: { ...props, tray: trayP }, n: { ...n, trayTilt: sm(u, 0.25, 0.42) * (1 - sm(u, 0.72, 0.85)) } };
        }
        case 'label': {
          // Out of the printer, peeled and pressed on the bag.
          const e = sm(u, 0.25, 0.65);
          const lab = lerpV(add(DT.printer, -0.02, 0.0, 0.1), add(DT.bag, 0, 0.1, 0.05), e);
          return { r: add(lab, 0.015, 0.02, 0.05), gr: 0.75, l: add(DT.bag, -0.09, 0.09, 0.05), gl: 0.7, nod: 0.32, props: { ...props, lab: u < 0.7 ? lab : null }, n: { ...n, printing: 1 - sm(u, 0.1, 0.25) } };
        }
        case 'pile': {
          const e = sm(u, 0.15, 0.85);
          const b = lerpV(DT.bag, DT.pile, e);
          return { r: add(b, 0.03, 0.15, 0.05), gr: 0.85, l: add(b, -0.05, 0.1, 0.06), nod: 0.26, props: { ...props, bag: u > 0.9 ? null : b }, n };
        }
        default:
          return { ...rest(c), nod: 0.1, props, n };
      }
    },
  };
}
const TRIAL: Script = {
  seq: [['look', 2.6], ['scroll', 3.0], ['note', 2.6], ['compare', 2.8], ['note2', 2.2]],
  at: () => st(0.14, DT.stand),
  key(k, u, c): Key {
    const sheet: V = [-0.28, 0.885, 0.2];
    const mouse: V = [0.42, 0.89, 0.14];
    const n = { chart: k === 'look' ? 0 : k === 'scroll' ? 1 : k === 'note' ? 1 : 2, mark: (k === 'scroll' ? u : k === 'look' ? 0 : 1) };
    const props = { sheet };
    if (k === 'note' || k === 'note2') {
      const pen = add(sheet, 0.09 * Math.sin(u * PI * 8) * 0.8, 0.02, 0.03 * (1 - u));
      return { l: add(sheet, -0.14, 0.02, 0.04), r: add(pen, 0.02, 0.03, 0.04), gr: 0.9, nod: 0.42, lean: 0.1, props: { ...props, pen }, n };
    }
    return { r: add(mouse, 0.01 * Math.sin(c.t * 2), 0.02, 0.01), gr: 0.5, l: c.bd(0.16, 0.58 * c.H, 0.16), nod: k === 'compare' ? 0.12 : 0.05, props, n };
  },
};
const REVIEW: Script = {
  seq: [['lay', 1.8], ['a', 2.4], ['b', 2.4], ['clash', 1.8], ['call', 3.4], ['tick', 1.6]],
  at: (k) => (k === 'call' ? st(-0.46, DT.stand) : st(-0.12, DT.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { sheets: 1, circled: c.p('clash', 0.35, 0.9), ticked: c.p('tick', 0.3, 0.8), phoneUp: 0 };
    const props: Record<string, V | null> = { slipA: DT.slipA, slipB: DT.slipB };
    const lhs = add(DT.slipA, -0.08, 0.02, 0.1);
    switch (k) {
      case 'lay': {
        const e = sm(u, 0.1, 0.9);
        return { l: add(lerpV(add(DT.slipA, 0, 0.3, 0.12), DT.slipA, e), 0, 0.02, 0.04), r: add(lerpV(add(DT.slipB, 0, 0.3, 0.12), DT.slipB, e), 0, 0.02, 0.04), gl: 0.8, gr: 0.8, nod: 0.3, props: { slipA: lerpV(add(DT.slipA, 0, 0.3, 0.12), DT.slipA, e), slipB: lerpV(add(DT.slipB, 0, 0.3, 0.12), DT.slipB, e) }, n };
      }
      case 'a':
        return { r: add(DT.slipA, 0.02, 0.025, 0.07 - 0.13 * u), l: add(DT.slipB, -0.08, 0.02, 0.08), gr: 0.5, nod: 0.46, lean: 0.12, props, n };
      case 'b':
        return { r: add(DT.slipB, 0.02, 0.025, 0.07 - 0.13 * u), l: lhs, gr: 0.5, nod: 0.46, lean: 0.12, props, n };
      case 'clash': {
        const a = u * PI * 4;
        const pen = add(DT.slipB, 0.015 + 0.03 * Math.cos(a), 0.02, -0.01 + 0.012 * Math.sin(a));
        return { r: add(pen, 0.02, 0.03, 0.04), gr: 0.9, l: lhs, nod: 0.5, lean: 0.14, props: { ...props, pen }, n };
      }
      case 'call': {
        // The clinic rung: the handset up, the slip looked at, nodding.
        const e = sm(u, 0.02, 0.18) - sm(u, 0.88, 1);
        const ph = lerpV(DT.phone, c.bd(0.14, 0.885 * c.H, 0.04), e);
        return { l: ph, gl: 0.95, r: add(DT.slipA, 0.02, 0.03, 0.08), nod: 0.2 + 0.1 * Math.sin(c.t * 2.4), props: { ...props, phone: ph }, n: { ...n, phoneUp: 1 } };
      }
      default: {
        const pen = add(DT.slipA, 0.03 * u, 0.02, 0.03);
        return { r: add(pen, 0.02, 0.03, 0.04), gr: 0.9, l: lhs, nod: 0.36, props: { ...props, pen }, n };
      }
    }
  },
};

// =============================================================================================
// 약품 진열장 (pharmacyShelf, 1 × 1): shelves of boxes on four decks.

export const PS = {
  stand: 0.64,
  decks: [0.38, 0.76, 1.14, 1.52],
  face: 0.14,
  crate: [-0.34, 0, 0.62] as V,
  basket: [0.36, 0, 0.62] as V,
  gaps: [[-0.2, 1.14], [0.2, 0.76], [-0.1, 0.38]] as Array<[number, number]>,
  read: [[-0.26, 1.14], [0.1, 0.76], [0.28, 1.52]] as Array<[number, number]>,
};
const STOCK: Script = {
  seq: [['set', 1.5], ['pull', 2.2], ['g0', 1.7], ['g1', 1.7], ['g2', 1.9], ['done', 1.4]],
  at: () => st(0, PS.stand),
  key(k, u): Key {
    const crateIn = add(PS.crate, 0, 0.26, 0);
    const n: Record<string, number> = {};
    const seen = (name: string) => (k === name ? sm(u, 0.7, 0.95) : ['g0', 'g1', 'g2'].indexOf(name) < ['g0', 'g1', 'g2'].indexOf(k) || k === 'done' ? 1 : 0);
    n.filled = seen('g0') + seen('g1') + seen('g2');
    if (k === 'set') {
      const crate = lerpV(add(PS.crate, 0.2, 0.7, -0.1), PS.crate, sm(u, 0.15, 0.85));
      return { r: add(crate, 0.23, 0.15, 0), l: add(crate, -0.23, 0.15, 0), gr: 0.9, gl: 0.9, crouch: 0.7 * sm(u, 0.3, 0.8), nod: 0.32, props: { crate }, n };
    }
    if (k === 'pull') return { r: [0.32 - 0.6 * frac(u * 2), 1.2, PS.face + 0.04], l: [-0.08 - 0.3 * frac(u * 2), 0.82, PS.face + 0.04], gr: 0.6, gl: 0.6, nod: 0.2, props: { crate: PS.crate }, n: { ...n, pulled: sm(u, 0, 0.9) } };
    if (k === 'done') {
      const crate = lerpV(PS.crate, add(PS.crate, 0.1, 0.65, -0.05), sm(u, 0.4, 1));
      return { r: add(crate, 0.23, 0.13, 0), l: add(crate, -0.23, 0.13, 0), gr: 0.9, gl: 0.9, crouch: 0.7 * (1 - sm(u, 0.4, 0.9)), nod: 0.3, props: { crate }, n: { ...n, pulled: 1 } };
    }
    const i = +k[1];
    const home: V = [PS.gaps[i][0], PS.gaps[i][1] + 0.09, PS.face];
    const low = PS.gaps[i][1] < 0.5;
    const box = u < 0.5 ? lerpV(crateIn, add(home, 0, 0.02, 0.2), sm(u, 0.05, 0.5)) : lerpV(add(home, 0, 0.02, 0.2), home, sm(u, 0.5, 0.9));
    return { r: add(box, 0.05, 0.02, 0.09), l: add(box, -0.05, 0.02, 0.09), gr: 0.85, gl: 0.85, crouch: u < 0.22 ? 0.72 : low ? 0.62 : 0, nod: u < 0.22 ? 0.42 : low ? 0.42 : 0.2, props: { box: u < 0.92 ? box : null, crate: PS.crate }, n: { ...n, pulled: 1 } };
  },
};
const EXPIRY: Script = {
  seq: [['c0', 2.4], ['c1', 2.8], ['toss', 1.5], ['c2', 2.4], ['note', 1.6]],
  at: () => st(0, PS.stand),
  key(k, u, c): Key {
    const n: Record<string, number> = { gone: c.p('toss', 0.5, 0.9), inBasket: c.p('toss', 0.75, 1), bad: 0, turned: 0 };
    const holdUp: V = [c.st.x + 0.04, 1.14, c.st.z - 0.28];
    const read = (i: number, bad: boolean): Key => {
      const home: V = [PS.read[i][0], PS.read[i][1] + 0.09, PS.face];
      const e = sm(u, 0.05, 0.3) - (bad ? 0 : sm(u, 0.84, 1));
      const hold = lerpV(home, holdUp, e);
      return { r: add(hold, 0.05, 0, 0.05), l: add(hold, -0.05, 0, 0.05), gr: 0.85, gl: 0.8, nod: 0.25, props: { box: hold, basket: PS.basket }, n: { ...n, bad: bad && u > 0.55 ? 1 : 0, turned: sm(u, 0.3, 0.45) * (bad ? 1 : 1 - sm(u, 0.74, 0.84)), which: i } };
    };
    if (k === 'c0') return read(0, false);
    if (k === 'c1') return read(1, true);
    if (k === 'c2') return read(2, false);
    if (k === 'toss') {
      const b = lerpV(holdUp, add(PS.basket, 0, 0.26, 0), sm(u, 0.1, 0.85));
      return { r: add(b, 0.05, 0.02, 0.06), gr: 0.85, crouch: 0.55 * Math.sin(u * PI), nod: 0.42, props: { box: u < 0.86 ? b : null, basket: PS.basket }, n: { ...n, bad: 1, which: 1 } };
    }
    const pad: V = [c.st.x + 0.02, 1.05, c.st.z - 0.3];
    return { l: add(pad, -0.08, 0, 0.02), gl: 0.9, r: add(pad, 0.04 + 0.04 * Math.sin(u * PI * 6), 0.02, 0.04), gr: 0.9, nod: 0.36, props: { pad, basket: PS.basket }, n: { ...n, which: 1 } };
  },
};
const ORDER: Script = {
  seq: [['low', 2.4], ['tap', 2.2], ['mid', 2.4], ['tap2', 2.2], ['send', 1.6]],
  at: () => st(0, PS.stand),
  key(k, u, c): Key {
    const pad: V = [c.st.x + 0.05, 1.08, c.st.z - 0.27];
    const n = { qty: c.p('tap', 0.4, 0.9) + c.p('tap2', 0.4, 0.9), sent: c.p('send', 0.5, 0.7) };
    const props = { pad };
    if (k === 'low') return { r: [-0.1 + 0.3 * u, 0.5, PS.face + 0.03], gr: 0.2, l: add(pad, -0.1, 0, 0.02), gl: 0.9, crouch: 0.65, nod: 0.3, props: { pad: add(pad, 0, -0.42, 0.06) }, n };
    if (k === 'mid') return { r: [0.2 - 0.34 * u, 0.98, PS.face + 0.04], gr: 0.2, l: add(pad, -0.1, 0, 0.02), gl: 0.9, nod: 0.14, props, n };
    return { l: add(pad, -0.1, 0, 0.02), gl: 0.9, r: add(pad, 0.04 * Math.sin(u * PI * 5), 0.03, 0.03), tap: true, nod: 0.38, props, n };
  },
};

// =============================================================================================
// 약국 계산대 (pharmacyCounter, 2 × 1): placed with its front to the staff; customers on its back (-z).

export const CO = {
  stand: 0.6,
  top: 1.0,
  screen: [-0.58, 1.3, 0.14] as V,
  keys: [-0.46, 1.02, 0.33] as V,
  scan: [0.08, 1.03, 0.22] as V,
  drop: [0.14, 1.01, -0.3] as V,
  basket: [0.66, 1.02, 0.28] as V,
  term: [-0.34, 1.05, -0.36] as V,
  bag: [0.2, 1.01, 0.1] as V,
  bagFar: [0.14, 1.01, -0.32] as V,
  cust: [0.14, -0.92] as [number, number],
  junior: [-1.02, 0.62] as [number, number],
};
const TAKE_RX: Script = {
  seq: [['wait', 0.9], ['come', 1.4], ['take', 1.8], ['scan', 1.8], ['read', 2.6], ['ask', 2.0], ['tray', 1.5], ['seat', 1.2]],
  at: (k) => (k === 'read' ? st(-0.36, CO.stand) : k === 'tray' ? st(0.34, CO.stand) : st(0.06, CO.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { cust: c.p('come', 0, 0.5) - c.p('seat', 0.2, 1), lines: k === 'read' ? u * 4 : c.p('read') * 4, scanning: k === 'scan' && u > 0.4 && u < 0.8 ? 1 : 0, cHand: k === 'come' ? sm(u, 0.4, 0.9) : k === 'take' ? 1 - sm(u, 0.6, 0.9) : 0, cNod: k === 'ask' ? Math.abs(Math.sin(u * PI * 3)) : 0, inBasket: c.p('tray', 0.65, 0.9), cBow: k === 'seat' ? sm(u, 0, 0.3) : 0 };
    const scanP = CO.scan;
    switch (k) {
      case 'wait':
        return { ...rest(c), nod: 0.06, n };
      case 'come':
        return { ...rest(c), nod: Math.sin(u * PI) * 0.32, lean: Math.sin(u * PI) * 0.14, props: { slip: u > 0.4 ? CO.drop : null }, n };
      case 'take': {
        const s = lerpV(CO.drop, add(scanP, 0, 0.0, -0.14), sm(u, 0.3, 0.9));
        return { r: add(s, 0.02, 0.025, 0.06), gr: 0.9, ...{ l: c.bd(0.16, 0.58 * c.H, 0.16) }, nod: 0.3, lean: 0.1, props: { slip: s }, n };
      }
      case 'scan': {
        const s = add(scanP, 0, 0.002, -0.14 + 0.14 * sm(u, 0.1, 0.5));
        return { r: add(s, 0.03, 0.03, 0.05), gr: 0.8, l: add(CO.scan, -0.17, 0.0, 0.04), nod: 0.34, props: { slip: s }, n };
      }
      case 'read':
        return { l: add(CO.keys, -0.08, 0.02, 0), r: add(CO.keys, 0.1 + 0.03 * Math.sin(c.t * 12), 0.02, 0), tap: true, nod: 0.05 + 0.04 * Math.sin(c.t * 1.6), props: { slip: scanP }, n };
      case 'ask':
        // A question over the counter: turned to the customer, an open hand.
        return { l: c.bd(0.2, 0.62 * c.H, 0.2), r: add(CO.drop, -0.1, 0.08, 0.22), palms: 0.8, nod: 0.02 + 0.08 * Math.sin(c.t * 3.2), props: { slip: scanP }, n };
      case 'tray': {
        const s = lerpV(scanP, add(CO.basket, 0, 0.06, 0), sm(u, 0.1, 0.85));
        return { r: add(s, 0.02, 0.03, 0.05), gr: 0.85, nod: 0.26, props: { slip: u < 0.9 ? s : null }, n };
      }
      default:
        return { ...rest(c), nod: 0.26 * Math.sin(u * PI), lean: 0.13 * Math.sin(u * PI), n };
    }
  },
};
const EXPLAIN: Script = {
  seq: [['call', 1.2], ['come', 1.4], ['open', 1.7], ['am', 1.7], ['noon', 1.5], ['pm', 1.7], ['warn', 2.0], ['card', 2.2], ['hand', 1.7], ['bye', 1.3]],
  at: (k) => (k === 'card' ? st(-0.24, CO.stand) : st(0.12, CO.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { cust: c.p('come', 0, 0.5) - c.p('bye', 0.3, 1), cNod: k === 'am' || k === 'pm' || k === 'warn' ? 0.5 + 0.5 * Math.sin(c.t * 4.2) : 0, cTap: k === 'card' ? sm(u, 0.2, 0.36) - sm(u, 0.74, 0.88) : 0, paid: c.p('card', 0.55, 0.65), took: c.p('hand', 0.65, 0.9), cBow: k === 'bye' ? sm(u, 0, 0.3) : 0, pt: 0, showing: 0 };
    const bag: V = CO.bag;
    const props: Record<string, V | null> = { bag };
    const sachet = (e: number): V => lerpV(add(bag, 0, 0.1, 0.02), c.bd(-0.06, 0.74 * c.H, 0.34), e);
    const show = (slot: number): Key => {
      // The sachet held up to them, a finger on the time printed on it.
      const s = sachet(1);
      const finger = add(s, (slot - 1) * 0.04, 0.012, 0.012);
      return { l: add(s, 0.07, -0.02, 0.02), gl: 0.9, r: add(finger, 0, 0.012, 0.03), gr: 0.25, nod: 0.08, props: { ...props, sachet: s }, n: { ...n, pt: slot + 1, showing: 1 } };
    };
    switch (k) {
      case 'call':
        return { ...rest(c), nod: 0.06, props, n };
      case 'come':
        return { r: add(bag, 0.05, 0.13, 0.05), gr: 0.75, l: c.bd(0.16, 0.58 * c.H, 0.16), nod: 0.22 * Math.sin(u * PI) + 0.1, props, n };
      case 'open': {
        const s = sachet(sm(u, 0.2, 0.95));
        return { l: add(s, 0.07, -0.02, 0.02), gl: 0.9, r: add(bag, 0.05, 0.13, 0.05), gr: 0.7, nod: 0.2, props: { ...props, sachet: s }, n: { ...n, showing: 1 } };
      }
      case 'am':
        return show(0);
      case 'noon':
        return show(1);
      case 'pm':
        return show(2);
      case 'warn': {
        // Don't take it with these: one finger up, the sachet still in the other hand.
        const s = sachet(1);
        return { l: add(s, 0.07, -0.02, 0.02), gl: 0.9, r: c.bd(-0.22, 0.82 * c.H, 0.24), gr: 0.4, nod: 0.05 + 0.08 * Math.sin(c.t * 3.5), props: { ...props, sachet: s }, n: { ...n, showing: 1 } };
      }
      case 'card':
        return { l: add(CO.keys, -0.08, 0.02, 0.0), r: add(CO.keys, 0.06, 0.02, 0.0), tap: u < 0.3, nod: 0.05, props, n };
      case 'hand': {
        const b = lerpV(bag, CO.bagFar, sm(u, 0.1, 0.65));
        return { r: add(b, 0.03, 0.14, 0.04), gr: 0.8, lean: 0.14, nod: 0.26, props: { bag: u < 0.8 ? b : null }, n };
      }
      default:
        return { ...rest(c), nod: 0.32 * Math.sin(u * PI), lean: 0.2 * Math.sin(u * PI), n };
    }
  },
};
const TRAIN: Script = {
  seq: [['show', 3.2], ['point', 2.6], ['watch', 3.2], ['fix', 2.0], ['good', 1.6]],
  at: () => st(-0.2, CO.stand, PI - 0.5),
  key(k, u, c): Key {
    const n = { lesson: 1, jTap: k === 'watch' ? 1 : 0, jNod: k === 'show' || k === 'point' || k === 'good' ? 1 : 0, wrong: k === 'fix' ? 1 : 0, good: k === 'good' ? 1 : 0, lines: k === 'good' ? 4 : k === 'watch' ? 2 + 2 * u : 2 };
    if (k === 'show') return { l: c.bd(0.16, 0.58 * c.H, 0.16), r: add(CO.keys, 0.02 + 0.03 * Math.sin(c.t * 11), 0.02, 0), tap: true, nod: 0.1, n };
    if (k === 'point' || k === 'fix') return { l: c.bd(0.16, 0.58 * c.H, 0.16), r: add(CO.screen, -0.02 + 0.08 * Math.sin(u * PI * 3), -0.05, 0.1), gr: 0.25, nod: 0.02, n };
    if (k === 'watch') return { ...rest(c), nod: 0.2, n };
    return { ...rest(c), nod: 0.26 * Math.sin(u * PI), lean: 0.1 * Math.sin(u * PI), n };
  },
};

// =============================================================================================
// 약장 (rxDrawerWall, 3 × 1): rows of small drawers, a ledge at 0.92 to work on.

export const DW = {
  stand: 0.52,
  ledge: 0.9,
  face: -0.14,
  carton: [0, 0.92, 0.0] as V,
  /** Column and row of the two drawers filled. */
  a: [2, 2] as [number, number],
  b: [5, 5] as [number, number],
  cols: 8,
  rows: 3,
};
export const drawerAt = (col: number, row: number): V => [-1.26 + col * 0.36, row < 3 ? 0.2 + row * 0.2 : 1.1 + (row - 3) * 0.2, DW.face];
const DRAW: Script = {
  seq: [['carton', 1.6], ['pull', 1.2], ['tip', 2.0], ['close', 1.0], ['pull2', 1.3], ['tip2', 2.0], ['close2', 1.0], ['tick', 1.5]],
  at: (k) => (k === 'pull' || k === 'tip' || k === 'close' ? st(drawerAt(DW.a[0], DW.a[1])[0] + 0.05, DW.stand) : k === 'carton' ? st(0, DW.stand) : k === 'tick' ? st(0, DW.stand) : st(drawerAt(DW.b[0], DW.b[1])[0] - 0.05, DW.stand)),
  key(k, u, c): Key {
    const A = drawerAt(DW.a[0], DW.a[1]);
    const B = drawerAt(DW.b[0], DW.b[1]);
    const n: Record<string, number> = {
      dA: k === 'pull' ? sm(u, 0.2, 0.9) : k === 'tip' ? 1 : k === 'close' ? 1 - sm(u, 0.1, 0.9) : 0,
      dB: k === 'pull2' ? sm(u, 0.2, 0.9) : k === 'tip2' ? 1 : k === 'close2' ? 1 - sm(u, 0.1, 0.9) : 0,
      fA: c.p('tip', 0.25, 0.8),
      fB: c.p('tip2', 0.25, 0.8),
      tilt: 0,
      ticked: c.p('tick', 0.3, 0.9),
    };
    const carton = (P: V): V => add(P, 0.0, 0.2, 0.28);
    const pull = (P: V, nk: string): V => add(P, 0.0, 0.03, 0.05 + 0.24 * (n[nk] ?? 0));
    const props: Record<string, V | null> = { carton: DW.carton };
    const low = (P: V) => P[1] < 0.6;
    const held = (P: V, nk: string, tip: boolean): Key => {
      const cp = carton(P);
      return { r: tip ? add(cp, 0.08, 0.05, 0.04) : pull(P, nk), l: tip ? add(cp, -0.08, 0.05, 0.04) : c.bd(0.16, 0.58 * c.H, 0.14), gr: 0.85, gl: 0.8, crouch: low(P) ? 0.72 : 0, nod: low(P) ? 0.42 : 0.26, props: tip ? { ...props, carton: cp } : props, n: { ...n, tilt: tip ? Math.sin(u * PI) : 0 } };
    };
    switch (k) {
      case 'carton': {
        const cp = lerpV(add(DW.carton, -0.4, -0.32, 0.5), DW.carton, sm(u, 0.15, 0.85));
        return { r: add(cp, 0.13, 0.08, 0.06), l: add(cp, -0.13, 0.08, 0.06), gr: 0.9, gl: 0.9, nod: 0.26, props: { carton: cp }, n };
      }
      case 'pull':
      case 'close':
        return held(A, 'dA', false);
      case 'tip':
        return held(A, 'dA', true);
      case 'pull2':
      case 'close2':
        return held(B, 'dB', false);
      case 'tip2':
        return held(B, 'dB', true);
      default: {
        const pad: V = [c.st.x, 0.92, c.st.z - 0.26];
        return { l: add(pad, -0.08, 0.02, 0.02), gl: 0.8, r: add(pad, 0.05 * Math.sin(u * PI * 6), 0.02, 0.04), gr: 0.9, nod: 0.4, props: { ...props, pad }, n };
      }
    }
  },
};

// =============================================================================================
// 자동 포장기 (rxPacker, 2 × 1): cassettes above, a dose tray that slides out at 0.86, the slot on the right.

export const PK = {
  stand: 0.72,
  tray: [-0.3, 0.86, 0.3] as V,
  trayOut: 0.2,
  touch: [-0.62, 1.2, 0.33] as V,
  slot: [0.56, 0.66, 0.38] as V,
  basket: [0.56, 0.24, 0.42] as V,
  jar: [-0.52, 0.9, 0.36] as V,
};
const PACK: Script = {
  seq: [['menu', 2.0], ['out', 1.2], ['fill', 3.6], ['in', 1.2], ['go', 1.2], ['run', 4.5], ['tear', 1.4], ['hold', 2.6], ['fold', 1.4]],
  at: (k) => (k === 'menu' || k === 'go' ? st(-0.54, PK.stand) : k === 'tear' || k === 'hold' || k === 'fold' ? st(0.44, PK.stand) : k === 'run' ? st(0.1, PK.stand + 0.08) : st(-0.24, PK.stand)),
  key(k, u, c): Key {
    const out = k === 'out' ? sm(u, 0.15, 0.85) : k === 'fill' ? 1 : k === 'in' ? 1 - sm(u, 0.15, 0.85) : 0;
    const n: Record<string, number> = { out, fill: k === 'fill' ? u : c.p('fill') * (1 - c.p('run', 0, 0.55)), strip: k === 'run' ? u : c.p('run') * (1 - c.p('fold', 0.5, 1)), running: k === 'run' ? 1 : 0, started: c.p('go', 0.5, 0.8) * (1 - c.p('tear', 0, 0.5)), inspect: k === 'hold' ? 1 : 0, screenStep: k === 'menu' ? u * 2 : 2 };
    const front = add(PK.tray, 0, 0.05, PK.trayOut * out);
    if (k === 'menu' || k === 'go') return { r: add(PK.touch, 0.02 + 0.05 * Math.sin(u * 9), 0.0, 0.03), tap: true, l: c.bd(0.16, 0.58 * c.H, 0.14), nod: 0.08, n };
    if (k === 'out' || k === 'in') return { r: add(front, 0.18, 0, 0.14), l: add(front, -0.18, 0, 0.14), gr: 0.8, gl: 0.8, nod: 0.36, n };
    if (k === 'fill') {
      // A jar in the left hand, tablets dropped by the right cell by cell along the rows.
      const row = Math.floor(u * 4);
      const col = frac(u * 4);
      const cell = add(PK.tray, -0.22 + 0.44 * col, 0.05, 0.12 + row * 0.05);
      const jar = add(PK.tray, -0.3, 0.14, 0.26);
      return { l: add(jar, 0, 0.0, 0.04), gl: 0.9, r: add(cell, 0.01, 0.04 + 0.03 * Math.abs(Math.sin(u * 60)), 0.02), gr: 0.65, nod: 0.5, lean: 0.14, props: { jar }, n };
    }
    if (k === 'run') return { ...rest(c), l: c.bd(0.14, 0.62 * c.H, 0.12), r: c.bd(-0.14, 0.62 * c.H, 0.12), nod: 0.24 + 0.04 * Math.sin(c.t * 1.8), n };
    const stripEnd = add(PK.basket, 0, 0.26, -0.02);
    if (k === 'tear') return { r: add(stripEnd, 0.0, 0.28, 0.08), l: add(stripEnd, -0.1, 0.26, 0.08), gr: 0.85, gl: 0.85, crouch: 0.42 * Math.sin(u * PI), nod: 0.42, n };
    const hold: V = c.bd(0, 0.72 * c.H, 0.3);
    if (k === 'hold') return { l: add(hold, 0.13, 0.02 + 0.015 * Math.sin(u * 8), 0), r: add(hold, -0.13, 0.02, 0), gl: 0.85, gr: 0.85, nod: -0.02, props: { held: hold }, n };
    const pile: V = [PK.basket[0] - 0.05, 0.88, 0.1];
    const f = lerpV(hold, pile, sm(u, 0.1, 0.8));
    return { l: add(f, 0.13, 0.02, 0), r: add(f, -0.13, 0.02, 0), gl: 0.85, gr: 0.85, nod: 0.3, props: { held: u < 0.82 ? f : null }, n };
  },
};

// =============================================================================================
// 연고 조제대 (rxCompoundBench, 2 × 1): top at 0.88, a slab in the middle, a balance on the right.

export const CB = {
  stand: 0.62,
  top: 0.88,
  slab: [-0.08, 0.91, 0.14] as V,
  balance: [0.6, 0.96, 0.08] as V,
  tub: [0.28, 0.88, -0.14] as V,
  dropper: [-0.52, 0.94, -0.06] as V,
  jar: [-0.5, 0.88, 0.2] as V,
};
const OINT: Script = {
  seq: [['weigh', 3.0], ['slab', 1.8], ['drops', 2.2], ['work', 4.6], ['fill', 2.6], ['lid', 1.8]],
  at: (k) => (k === 'weigh' ? st(0.44, CB.stand) : k === 'fill' || k === 'lid' ? st(-0.3, CB.stand) : st(-0.08, CB.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { grams: k === 'weigh' ? sm(u, 0.3, 0.85) * 30 : c.p('weigh') > 0 && c.p('slab', 0, 0.3) < 1 ? 30 : 0, mound: c.p('slab', 0.3, 0.8) - c.p('fill', 0.1, 0.8), mix: c.p('work', 0, 0.9), jar: c.p('fill', 0.2, 0.85), lid: c.p('lid', 0.1, 0.5), labelled: c.p('lid', 0.55, 0.85), drop: 0 };
    const props: Record<string, V | null> = {};
    switch (k) {
      case 'weigh': {
        const lift = sm(u, 0.15, 0.4) * (1 - sm(u, 0.4, 0.5));
        const sp = lerpV(add(CB.tub, 0, 0.14, 0), add(CB.balance, 0, 0.06, 0.02), sm(u, 0.2, 0.42));
        return { r: add(sp, 0.08, 0.03 + 0.04 * lift, 0.05), gr: 0.9, l: add(CB.balance, -0.15, 0.0, 0.08), nod: 0.42, props: { spat: sp }, n };
      }
      case 'slab': {
        const sp = lerpV(add(CB.balance, 0, 0.08, 0.02), add(CB.slab, 0.03, 0.06, 0), sm(u, 0.05, 0.6));
        return { r: add(sp, 0.08, 0.03, 0.05), gr: 0.9, nod: 0.38, props: { spat: sp }, n };
      }
      case 'drops': {
        const d = add(CB.slab, 0.02, 0.2, -0.01);
        return { l: add(d, -0.01, 0.1, 0.02), gl: 0.9, r: add(CB.slab, 0.26, 0.02, 0.06), nod: 0.5, lean: 0.12, props: { dropper: d }, n: { ...n, drop: frac(u * 3) } };
      }
      case 'work': {
        // Round and over with the spatula, the other hand on the slab.
        const a = u * PI * 8;
        const sp = add(CB.slab, 0.1 * Math.cos(a), 0.02, 0.05 * Math.sin(a));
        return { r: add(sp, 0.08, 0.05, 0.05), gr: 0.9, l: add(CB.slab, -0.24, 0.02, 0.08), nod: 0.5, lean: 0.16, props: { spat: sp }, n: { ...n, ang: a } };
      }
      case 'fill': {
        const e = sm(u, 0.1, 0.4);
        const sp = lerpV(add(CB.slab, 0, 0.03, 0), add(CB.jar, 0.02, 0.1, 0), e);
        const jar = add(CB.jar, 0.0, 0.0, 0.0);
        return { r: add(sp, 0.08, 0.04, 0.05), gr: 0.9, l: add(jar, -0.05, 0.07, 0.03), gl: 0.85, nod: 0.46, props: { spat: sp }, n };
      }
      default:
        return { l: add(CB.jar, -0.05, 0.05, 0.03), gl: 0.85, r: add(CB.jar, 0.03, 0.1, 0.02), gr: 0.75, nod: 0.42, props, n };
    }
  },
};

// =============================================================================================
// 의약품 냉장고 (rxMedFridge, 1 × 1): a glass door hung on its left, a log on a clip at the side.

export const FR = {
  stand: 0.6,
  swing: 0.95,
  read: [0.08, 1.56, 0.42] as V,
  handle: [0.38, 1.08, 0.46] as V,
  log: [-0.05, 1.0, 0.82] as V,
  box: [-0.06, 1.14, 0.24] as V,
};
const FRIDGE: Script = {
  seq: [['read', 2.2], ['open', 1.2], ['take', 1.6], ['check', 2.6], ['back', 1.5], ['shut', 1.0], ['write', 2.2]],
  at: (k) => (k === 'take' || k === 'check' || k === 'back' ? st(0.16, FR.stand + 0.02) : k === 'open' || k === 'shut' ? st(0.46, FR.stand + 0.1) : st(0, FR.stand)),
  key(k, u, c): Key {
    const door = k === 'open' ? sm(u, 0.2, 0.9) : k === 'take' || k === 'check' || k === 'back' ? 1 : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : 0;
    const handle = (d: number): V => {
      const a = d * FR.swing;
      return [-0.42 + 0.8 * Math.cos(a), 1.08, 0.42 + 0.8 * Math.sin(a) + 0.04];
    };
    const n: Record<string, number> = { door, logged: c.p('write', 0.2, 0.9) };
    const bx = (e: number): V => lerpV(FR.box, c.bd(0, 0.68 * c.H, 0.28), e);
    switch (k) {
      case 'read':
        return { l: c.bd(0.16, 0.58 * c.H, 0.14), r: add(FR.read, 0.02, -0.02, 0.05), gr: 0.25, nod: -0.04, n };
      case 'open':
      case 'shut':
        return { r: handle(door), gr: 0.9, l: c.bd(0.16, 0.58 * c.H, 0.14), nod: 0.14, n };
      case 'take': {
        const b = bx(sm(u, 0.2, 0.9));
        return { r: add(b, 0.05, 0.0, 0.07), l: add(b, -0.05, 0.0, 0.07), gr: 0.85, gl: 0.8, nod: 0.2, props: { box: b }, n };
      }
      case 'check': {
        const b = bx(1);
        return { r: add(b, 0.05, 0.0, 0.07), l: add(b, -0.05, 0.0, 0.07), gr: 0.85, gl: 0.8, nod: 0.28, props: { box: b }, n: { ...n, turned: sm(u, 0.3, 0.45) * (1 - sm(u, 0.75, 0.88)) } };
      }
      case 'back': {
        const b = bx(1 - sm(u, 0.1, 0.85));
        return { r: add(b, 0.05, 0.0, 0.07), l: add(b, -0.05, 0.0, 0.07), gr: 0.85, gl: 0.8, nod: 0.2, props: { box: u < 0.9 ? b : null }, n };
      }
      default: {
        const pad: V = [c.st.x, 1.04, c.st.z - 0.27];
        return { l: add(pad, -0.08, 0.0, 0.02), gl: 0.85, r: add(pad, 0.05 * Math.sin(u * PI * 6), 0.02, 0.04), gr: 0.9, nod: 0.38, props: { pad }, n };
      }
    }
  },
};

// =============================================================================================
// 처방 조회 단말 (rxCheckTerminal, 1 × 1): a stand-up desk, its screen, keys and a phone at the side.

export const TM = {
  stand: 0.56,
  keys: [0, 1.0, 0.2] as V,
  slip: [-0.28, 0.985, 0.2] as V,
  phone: [0.32, 1.03, 0.1] as V,
};
const LOOK: Script = {
  seq: [['type', 2.6], ['warn', 1.8], ['call', 3.6], ['fix', 2.2], ['ok', 1.6]],
  at: () => st(0.02, TM.stand),
  key(k, u, c): Key {
    const n: Record<string, number> = { typed: k === 'type' ? u : 1, warn: k === 'warn' || k === 'call' ? 1 : k === 'fix' ? 1 - sm(u, 0.7, 0.9) : 0, ok: k === 'ok' ? 1 : 0, phoneUp: k === 'call' ? 1 : 0 };
    const props: Record<string, V | null> = { slip: TM.slip };
    const typing: Key = { l: add(TM.keys, -0.08 + 0.02 * Math.sin(c.t * 13), 0.02, 0), r: add(TM.keys, 0.08 + 0.02 * Math.sin(c.t * 11), 0.02, 0), tap: true, nod: 0.26, props, n };
    if (k === 'type' || k === 'fix') return typing;
    if (k === 'warn') return { l: add(TM.keys, -0.08, 0.02, 0), r: add(TM.keys, 0.08, 0.02, 0), nod: 0.04, lean: 0.12 * Math.sin(u * PI), props, n };
    if (k === 'call') {
      const e = sm(u, 0.02, 0.15) - sm(u, 0.88, 1);
      const ph = lerpV(TM.phone, c.bd(-0.14, 0.885 * c.H, 0.04), e);
      return { r: ph, gr: 0.95, l: add(TM.slip, 0.03, 0.03, 0.05), gl: 0.5, nod: 0.18 + 0.1 * Math.sin(c.t * 2.4), props: { ...props, phone: ph }, n };
    }
    return { ...rest(c), nod: 0.2 * Math.sin(u * PI), props, n };
  },
};

// =============================================================================================
// 일반의약품 진열 벽 (rxOtcWall, 3 × 1): the boxes pulled forward along the shelves, a tag clipped straight.

export const OT = {
  stand: 0.62,
  decks: [0.34, 0.68, 1.02, 1.36, 1.7],
  face: 0.05,
};
const FACE: Script = {
  seq: [['a', 2.6], ['b', 2.8], ['c', 2.6], ['tag', 1.8], ['back', 1.0]],
  at: (k) => (k === 'a' ? st(-0.86, OT.stand) : k === 'b' ? st(0, OT.stand) : st(0.82, OT.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { a: c.p('a', 0.1, 0.9), b: c.p('b', 0.1, 0.9), c: c.p('c', 0.1, 0.9), tag: c.p('tag', 0.4, 0.8) };
    const sweep = (y: number, y2: number, crouch: number): Key => {
      const x = c.st.x + 0.34 - 0.68 * frac(u * 1.5);
      return { r: [x, y, OT.face + 0.14], l: [x - 0.14, y2, OT.face + 0.14], gr: 0.65, gl: 0.65, crouch, nod: y < 0.6 ? 0.44 : 0.16, palms: 0.2, n };
    };
    if (k === 'a') return sweep(1.12, 0.8, 0);
    if (k === 'b') return sweep(0.46, 0.46, 0.68);
    if (k === 'c') return sweep(1.46, 1.12, 0);
    if (k === 'tag') return { r: [c.st.x + 0.04 + 0.12 * sm(u, 0, 0.4), 1.03, OT.face + 0.14], l: [c.st.x - 0.14, 1.03, OT.face + 0.14], gr: 0.8, gl: 0.7, nod: 0.18, props: { tag: [c.st.x + 0.04 + 0.12 * sm(u, 0, 0.4), 1.0, OT.face + 0.122] }, n };
    return { ...rest(c), nod: 0.1, n };
  },
};

// =============================================================================================
// 혈압 측정 의자 (rxBpChair, 2 × 1): the chair on the left, the machine beside it on the right.

export const BP = {
  seat: 0.46,
  chair: [-0.42, -0.02] as [number, number],
  cuff: [0.1, 0.72, 0.0] as V,
  start: [0.3, 0.96, 0.2] as V,
  stand: 0.76,
  book: [0.32, 0.76, 0.32] as V,
};
const BLOOD: Script = {
  seq: [['come', 1.8], ['arm', 2.2], ['start', 1.2], ['pump', 3.0], ['fall', 3.0], ['read', 2.2], ['write', 2.2], ['off', 1.5]],
  at: (k) => (k === 'arm' || k === 'off' ? st(-0.06, BP.stand) : st(0.22, BP.stand)),
  key(k, u, c): Key {
    const pressure = k === 'pump' ? sm(u, 0.02, 0.98) : k === 'fall' ? 1 - sm(u, 0.02, 0.98) * 0.92 : c.p('fall') * 0.08;
    const n: Record<string, number> = { cust: c.p('come', 0, 0.8) - c.p('off', 0.55, 1), armIn: c.p('arm', 0.3, 0.85) - c.p('off', 0, 0.5), pressure, shown: c.p('fall', 0.92, 1), running: k === 'pump' || k === 'fall' ? 1 : 0, wrote: c.p('write', 0.2, 0.9), cNod: k === 'read' ? 0.5 + 0.5 * Math.sin(c.t * 4) : 0 };
    switch (k) {
      case 'come':
        return { ...rest(c), r: c.bd(-0.3, 0.62 * c.H, 0.28), palms: 0.8, nod: 0.08, n };
      case 'arm': {
        // A hand under their arm, guiding it into the cuff.
        const at = lerpV([BP.chair[0] + 0.22, 0.74, 0.1], BP.cuff, sm(u, 0.2, 0.85));
        return { r: add(at, 0.02, -0.03, 0.08), gr: 0.65, l: add(at, -0.04, 0.05, 0.07), gl: 0.6, crouch: 0.2, nod: 0.42, lean: 0.14, n };
      }
      case 'start':
        return { r: add(BP.start, 0, 0.02, 0.02), tap: true, l: c.bd(0.16, 0.58 * c.H, 0.14), nod: 0.2, n };
      case 'pump':
      case 'fall':
        return { ...rest(c), nod: 0.26, n };
      case 'read':
        return { r: add(BP.start, -0.02, 0.1, 0.04), gr: 0.25, l: c.bd(0.16, 0.6 * c.H, 0.16), nod: 0.2 + 0.06 * Math.sin(c.t * 3), n };
      case 'write': {
        const pad: V = [c.st.x, 1.02, c.st.z - 0.28];
        return { l: add(pad, -0.08, 0, 0.02), gl: 0.85, r: add(pad, 0.05 * Math.sin(u * PI * 6), 0.02, 0.04), gr: 0.9, nod: 0.38, props: { book: pad }, n };
      }
      default: {
        const at = lerpV(BP.cuff, [BP.chair[0] + 0.22, 0.74, 0.1], sm(u, 0, 0.5));
        return { r: add(at, 0.02, -0.03, 0.08), gr: 0.65, nod: 0.3, n };
      }
    }
  },
};

// =============================================================================================
// 의약품 입고 상자 (rxDelivery, 2 × 1): cartons on a low dolly, a cold box, the delivery slip.

export const DV = {
  stand: 0.6,
  top: 0.52,
  open: [-0.34, 0.54, 0.05] as V,
  side: [0.52, 0.44, 0.1] as V,
  slip: [0.0, 0.0, 0.0] as V,
};
const DELIVERY: Script = {
  seq: [['slip', 2.0], ['cut', 2.0], ['b0', 2.0], ['b1', 2.0], ['b2', 2.0], ['tick', 1.6], ['stack', 2.0]],
  at: (k) => (k === 'stack' ? st(0.1, DV.stand) : st(-0.28, DV.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { cut: k === 'cut' ? u : c.p('cut'), flaps: c.p('cut', 0.8, 1), out: (k === 'b0' ? sm(u, 0.6, 0.9) : c.p('b0')) + (k === 'b1' ? sm(u, 0.6, 0.9) : c.p('b1')) + (k === 'b2' ? sm(u, 0.6, 0.9) : c.p('b2')), ticked: c.p('tick', 0.3, 0.9), moved: c.p('stack', 0.3, 0.9), beep: 0 };
    const pad: V = [c.st.x + 0.02, 1.02, c.st.z - 0.28];
    const props: Record<string, V | null> = { pad: k === 'cut' || k === 'stack' ? null : pad };
    const openP = DV.open;
    if (k === 'slip') return { l: add(pad, -0.08, 0, 0.02), gl: 0.9, r: add(pad, 0.04 * Math.sin(u * 8), 0.02, 0.03), gr: 0.3, nod: 0.36, props, n };
    if (k === 'cut') return { r: add(openP, 0.24 - 0.48 * u, 0.2, 0.0), gr: 0.9, l: add(openP, -0.2, 0.2, 0.14), gl: 0.6, crouch: 0.7, nod: 0.46, props: { ...props, knife: add(openP, 0.24 - 0.48 * u, 0.2, 0.0) }, n };
    if (k === 'tick') return { l: add(pad, -0.08, 0, 0.02), gl: 0.9, r: add(pad, 0.05 * Math.sin(u * PI * 6), 0.02, 0.04), gr: 0.9, nod: 0.4, props, n };
    if (k === 'stack') {
      const cart = lerpV(openP, add(DV.side, 0, 0.3, 0), sm(u, 0.15, 0.85));
      return { r: add(cart, 0.22, 0.14, 0.05), l: add(cart, -0.22, 0.14, 0.05), gr: 0.9, gl: 0.9, crouch: 0.68 * (1 - Math.sin(u * PI) * 0.5), nod: 0.42, props: { ...props, carton: cart }, n };
    }
    // A box up out of the carton, scanned, put on the top of the cartons to the side.
    const i = +k[1];
    const from = add(openP, -0.1 + i * 0.1, 0.22, 0);
    const up: V = [c.st.x + 0.04, 1.08, c.st.z - 0.26];
    const to = add(DV.side, -0.12 + i * 0.12, 0.34, 0.02);
    const b = u < 0.5 ? lerpV(from, up, sm(u, 0.05, 0.4)) : lerpV(up, to, sm(u, 0.6, 0.95));
    const low = u < 0.2 || u > 0.8;
    return { r: add(b, 0.05, 0, 0.06), l: add(up, -0.14, 0.03, 0.06), gr: 0.85, gl: 0.9, crouch: low ? 0.6 : 0, nod: low ? 0.42 : 0.3, props: { ...props, pad: null, box: u < 0.96 ? b : null, gun: add(up, -0.14, 0.03, 0.06) }, n: { ...n, beep: beepAt(u, 0.42) } };
  },
};

const SCRIPTS: Record<RxMotion, Script> = {
  rxDispense: dispenseScript(false),
  rxUrgent: dispenseScript(true),
  rxTrial: TRIAL,
  rxReview: REVIEW,
  rxStock: STOCK,
  rxExpiry: EXPIRY,
  rxOrder: ORDER,
  rxTakeRx: TAKE_RX,
  rxExplain: EXPLAIN,
  rxTrain: TRAIN,
  rxFill: DRAW,
  rxPack: PACK,
  rxOintment: OINT,
  rxFridge: FRIDGE,
  rxLookup: LOOK,
  rxFace: FACE,
  rxBp: BLOOD,
  rxDelivery: DELIVERY,
};
