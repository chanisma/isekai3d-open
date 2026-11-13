import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';

/*
 * Five jobs' quiet work that used to borrow another use's motion (2026-11-02, at the user's request; src/game/workExtra.ts). Each is a
 * round of beats on one clock, started as the dweller arrives, so the work begins at its beginning. `xeNow` says all of it for a moment and
 * workExtraKits.ts draws it; the props there are shown only during the use, since these pieces stand on other lots too.
 *
 * - xeOil (carLift, 엔진오일 교환): raised at the post's button; the drain pan rolled under; plug loosened with the wrench, out by the fingers, the oil
 *   running thin and amber into the pan; the filter off and into the pan, the new one's gasket oiled with a fingertip, on by hand; the plug back
 *   and tightened; lowered; bonnet up, cap off, funnel in, oil poured from a jug, funnel out, cap on; the dipstick drawn, wiped, dipped, read; noted.
 * - xeMachine (espressoMachine, 머신 청소): portafilter out and knocked; blind filter and cleaner in, locked, the pump run on and off five times;
 *   out, the group run clear and brushed; the steam wand purged and wiped; the drip tray drawn out, emptied and put back.
 * - xeBeans (cafeCounter, 원두·우유 발주): the tablet taken, a stock crate's bean bags and milk cartons counted on it, the order sent to a made-up supplier.
 * - xePest (gardenBed, 병충해 방제): leaves turned over under a loupe, a few bugs picked into a jar, gloves on, a hand pressure sprayer pumped,
 *   the undersides sprayed, noted.
 * - xeSpray (cropField, 병해충 방제): the wind read off a ribbon, mask and gloves on, the backpack sprayer up and strapped; down the row with the wind at
 *   the back, spraying to the side and working the lever; a stop to look at the leaves; on to the end; back, the pack off.
 *
 * Every place is in the piece's frame (x across, y up, z out of its front). Facing the piece (yaw π) the dweller's right hand is on +x.
 */
export type XeMotion = 'xeOil' | 'xeMachine' | 'xeBeans' | 'xePest' | 'xeSpray';
export const XE_MOTIONS = new Set<string>(['xeOil', 'xeMachine', 'xeBeans', 'xePest', 'xeSpray']);

export type P = readonly [number, number, number];
const PI = Math.PI;
const frac = (x: number) => ((x % 1) + 1) % 1;
const ss = (x: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(x, a, b);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const mixP = (a: P, b: P, e: number): P => [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)];
const add = (a: P, x: number, y: number, z: number): P => [a[0] + x, a[1] + y, a[2] + z];
const wave = (t: number, hz: number) => Math.sin(t * hz * PI * 2);

export interface SpotAt {
  x: number;
  z: number;
  yaw: number;
}
/** A point in a spot's own frame (`side` to the dweller's left, `up` from the floor, `ahead`), in the piece's. */
export function sp(s: SpotAt, side: number, up: number, ahead: number): P {
  const c = Math.cos(s.yaw);
  const n = Math.sin(s.yaw);
  return [s.x + side * c + ahead * n, up, s.z - side * n + ahead * c];
}
const turnBy = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const mixAt = (a: SpotAt, b: SpotAt, e: number): SpotAt => ({ x: mix(a.x, b.x, e), z: mix(a.z, b.z, e), yaw: turnBy(a.yaw, b.yaw, e) });

export interface Key {
  l: P;
  r: P;
  lean: number;
  nod: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
}
const key = (l: P, r: P, lean: number, nod: number, more: Partial<Key> = {}): Key => ({ l, r, lean, nod, palms: 0.6, gl: 0.3, gr: 0.3, crouch: 0, ...more });
const mixKey = (a: Key, b: Key, e: number): Key => ({
  l: mixP(a.l, b.l, e), r: mixP(a.r, b.r, e), lean: mix(a.lean, b.lean, e), nod: mix(a.nod, b.nod, e), palms: mix(a.palms, b.palms, e),
  gl: mix(a.gl, b.gl, e), gr: mix(a.gr, b.gr, e), crouch: mix(a.crouch, b.crouch, e),
});
/** How the dweller's shoulders stand for a key (see avatar.ts), for checking reach. */
export function shoulderOf(at: SpotAt, sx: number, k: Pick<Key, 'lean' | 'crouch'>): P {
  return sp(at, sx * 0.18, 1.3 - 0.45 * (1 - Math.cos(k.lean)) - 0.37 * k.crouch, 0.45 * Math.sin(k.lean));
}
/** The hands hanging easy at the sides. */
const easyL = (a: SpotAt) => sp(a, 0.2, 0.92, 0.1);
const easyR = (a: SpotAt) => sp(a, -0.2, 0.92, 0.1);

type Step = { key: string; hold: number; move: number };
const st = (key: string, hold: number, move = 0.4): Step => ({ key, hold, move });
interface Frame {
  at: SpotAt;
  key: Key;
  /** What's in the hands. */
  tool?: string | null;
  /** Numbers the piece draws (how far, how many), and where things are. */
  n?: Record<string, number>;
  p?: Record<string, P | null | undefined>;
}
type Script = { steps: Step[]; frame(k: string, p: number, t: number, H: number): Frame };

export interface XeNow {
  beat: string;
  at: SpotAt;
  key: Key;
  tool: string | null;
  n: Record<string, number>;
  p: Record<string, P | null>;
  walking: boolean;
  H: number;
}
const roundOf = (s: Script) => s.steps.reduce((n, k) => n + k.hold + k.move, 0);
function nowOf(s: Script, t: number, H: number): XeNow {
  const T = roundOf(s);
  let u = frac(t / T) * T;
  let from = s.steps[0];
  let to = s.steps[0];
  let e = 0;
  let p = 0;
  for (let i = 0; i < s.steps.length; i++) {
    const k = s.steps[i];
    from = k;
    to = k;
    if (u < k.hold) {
      p = u / k.hold;
      e = 0;
      break;
    }
    u -= k.hold;
    p = 1;
    to = s.steps[(i + 1) % s.steps.length];
    if (u < k.move || i === s.steps.length - 1) {
      e = ss(Math.min(1, u / (k.move || 1)));
      break;
    }
    u -= k.move;
  }
  const A = s.frame(from.key, p, t, H);
  const B = e > 0 ? s.frame(to.key, 0, t, H) : A;
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.n ?? {}), ...Object.keys(B.n ?? {})])) n[k] = mix(A.n?.[k] ?? 0, B.n?.[k] ?? 0, e);
  const props: Record<string, P | null> = {};
  for (const k of new Set([...Object.keys(A.p ?? {}), ...Object.keys(B.p ?? {})])) {
    const a = A.p?.[k] ?? null;
    const b = B.p?.[k] ?? null;
    props[k] = a && b ? mixP(a, b, e) : e < 0.5 ? a : b;
  }
  return {
    beat: from.key,
    at: mixAt(A.at, B.at, e),
    key: e > 0 ? mixKey(A.key, B.key, e) : A.key,
    tool: (e < 0.5 ? A.tool : B.tool) ?? null,
    n,
    p: props,
    walking: e > 0 && e < 1 && Math.hypot(A.at.x - B.at.x, A.at.z - B.at.z) > 0.12,
    H,
  };
}

// =============================================================================================
// 엔진오일 교환 (carLift, 2 × 3). The car's nose is +z, its left +x; overhead the lift has it at OIL.high.

export const OIL = {
  high: 1.62,
  plug: [0.18, 1.72, 1.0] as P,
  filter: [-0.08, 1.66, 0.98] as P,
  /** The drain stand's foot, parked beside the car and rolled in; its dish, its rim handle and its tray above that foot. */
  panHome: [1.0, 0, 1.08] as P,
  panIn: [0.05, 0, 1.1] as P,
  dishY: 1.05,
  handle: [0, 1.07, -0.2] as P,
  tray: [-0.34, 0.98, -0.2] as P,
  button: [0.87, 1.2, -0.19] as P,
  cart: [0.55, 0, 1.88] as P,
  cartTop: 0.84,
  jug: [0.44, 1.0, 1.84] as P,
  funnelRest: [0.66, 0.92, 1.84] as P,
  clipRest: [0.55, 0.86, 1.98] as P,
  cap: [0.16, 0.735, 0.86] as P,
  capAside: [0.3, 0.74, 1.04] as P,
  funnel: [0.16, 0.8, 0.86] as P,
  stick: [0.1, 0.76, 0.96] as P,
  stickLen: 0.34,
  wrench: 0.17,
  /** How long the old filter stays in the hand; where the old filter ends up (in the dish). */
  oldIn: [0.1, 1.09, 1.12] as P,
};
export const OIL_AT = {
  post: { x: 0.9, z: 0.24, yaw: PI } as SpotAt,
  roll: { x: 0.82, z: 0.7, yaw: 0 } as SpotAt,
  under: { x: 0.12, z: 0.74, yaw: 0 } as SpotAt,
  corner: { x: 0.95, z: 1.56, yaw: PI } as SpotAt,
  nose: { x: 0.1, z: 1.56, yaw: PI } as SpotAt,
  cart: { x: 0.55, z: 1.5, yaw: 0 } as SpotAt,
};
const panGrip = (foot: P) => add(foot, OIL.handle[0], OIL.handle[1], OIL.handle[2]);
const trayOf = (foot: P) => add(foot, OIL.tray[0], OIL.tray[1], OIL.tray[2]);
const TRAY = trayOf(OIL.panIn);
export const TRAY_WRENCH: P = add(TRAY, 0.06, 0.03, -0.03);
export const TRAY_PLUG: P = add(TRAY, -0.07, 0.025, -0.05);
export const TRAY_FILTER: P = add(TRAY, -0.04, 0.03, 0.06);
/** The wrench's grip, on the plug at `a` (0 back along the dweller, growing to their right), from the plug. */
const onPlug = (a: number): P => [OIL.plug[0] - OIL.wrench * Math.sin(a), OIL.plug[1] - 0.03, OIL.plug[2] - OIL.wrench * Math.cos(a)];
/** The clipboard's sheet, as FS does it: a point on it (its own x, y) from the grip; the board tips back 0.55 rad. */
const onSheet = (x: number, y: number, off: number): P => [x, 0.853 * y + 0.523 * off, -0.523 * y + 0.853 * off];
/** A point on a board held at a spot, in the piece's frame: the board faces back to whoever holds it. */
function onBoard(at: SpotAt, q: P): P {
  const a = at.yaw - PI;
  return [q[0] * Math.cos(a) + q[2] * Math.sin(a), q[1], -q[0] * Math.sin(a) + q[2] * Math.cos(a)];
}
export const PEN_REST: P = [0.09, 0.14, 0.03];

const OIL_SCRIPT: Script = {
  steps: [
    st('raise', 3.0, 0.9), st('roll', 2.4), st('loosen', 3.0, 0.3), st('pull', 2.2, 0.3), st('drain', 3.6, 0.3), st('filterOff', 2.8, 0.3), st('gasket', 2.2, 0.3), st('filterOn', 2.4, 0.3),
    st('plugIn', 1.5, 0.2), st('tighten', 2.2, 0.3), st('unroll', 2.0, 0.9), st('lower', 3.5, 0.9), st('corner', 0.1, 0.8), st('bonnet', 2.2, 0.3), st('capOff', 1.3, 0.5),
    st('getFunnel', 1.1, 0.5), st('setFunnel', 1.1, 0.5), st('getJug', 1.1, 0.5), st('pour', 4.6, 0.5), st('putJug', 0.9, 0.5), st('funnelOut', 1.2, 0.2), st('capOn', 1.1, 0.2),
    st('dipOut', 1.4, 0.2), st('wipe', 1.3, 0.2), st('dipIn', 1.2, 0.2), st('dipRead', 1.8, 0.5), st('stow', 1.0, 0.3), st('note', 2.4, 0.5), st('shut', 1.4, 0.8),
  ],
  frame(k, p, t) {
    const A = OIL_AT;
    const LEFT_ON_PAN: P = [0.3, 1.69, 1.0];
    const under = (l: P, r: P, nod = -0.55, more: Partial<Key> = {}): Key => key(l, r, 0.06, nod, { palms: 0.2, gl: 0.2, ...more });
    // What's the same through a stretch of beats.
    const i = OIL_ORDER.indexOf(k);
    const past = (name: string) => i >= OIL_ORDER.indexOf(name);
    const f: Frame = { at: A.under, key: under(easyL(A.under), easyR(A.under)), tool: null };
    const n: Record<string, number> = {
      lift: past('raise') && !past('lower') ? 1 : 0,
      bonnet: past('bonnet') && !past('shut') ? 1 : 0,
      pan: past('roll') && !past('unroll') ? 1 : 0,
      plugOut: past('pull') && !past('plugIn') ? 1 : 0,
      oil: 0,
      level: past('filterOn') ? 0.9 : 0,
      filter: past('filterOff') && !past('filterOn') ? 0 : 1,
      newFilter: past('filterOn') ? 1 : 0,
      oldInDish: past('gasket') ? 1 : 0,
      capOff: past('capOff') && !past('capOn') ? 1 : 0,
      funnel: 0,
      pour: 0,
      tip: 0,
      jugLevel: past('pour') ? 0.15 : 1,
      stickOut: 0,
      stickWiped: 0,
      turn: 0,
      noted: past('note') ? 1 : 0,
    };
    const p2: Record<string, P | null | undefined> = {};
    f.n = n;
    f.p = p2;
    if (!past('roll')) p2.pan = OIL.panHome;
    else if (past('lower')) p2.pan = OIL.panHome;
    else p2.pan = OIL.panIn;
    if (past('funnelOut') && !past('stow')) p2.funnel = [0.0, 0.76, 1.12];
    else if (past('setFunnel') && !past('funnelOut')) p2.funnel = OIL.funnel;
    switch (k) {
      case 'raise':
        f.at = A.post;
        n.lift = ss(p, 0, 0.05);
        f.key = key(easyL(A.post), add(OIL.button, 0, 0, 0.02 + 0.015 * (1 - pulse(p))), 0.12, -0.05, { gr: 0.2 });
        break;
      case 'roll': {
        const e = ss(p, 0.05, 0.95);
        const foot = mixP(OIL.panHome, OIL.panIn, e);
        f.at = mixAt(A.roll, A.under, e);
        n.pan = e;
        p2.pan = foot;
        f.key = key(panGrip(foot), easyR(f.at), 0.08, 0.2, { gl: 0.8 });
        break;
      }
      case 'loosen': {
        const take = ss(p, 0, 0.18);
        const a = 0.4 + 0.5 * Math.abs(Math.sin((p - 0.18) * 4 * PI));
        f.tool = 'wrench';
        n.turn = a;
        f.key = under(LEFT_ON_PAN, p < 0.18 ? mixP(TRAY_WRENCH, onPlug(0.4), take) : onPlug(a), -0.55, { gr: 0.9 });
        p2.wrenchHead = p < 0.18 ? null : OIL.plug;
        break;
      }
      case 'pull': {
        // The last turns by the fingers, the plug drawn out, and the oil comes.
        const drawn = ss(p, 0.55, 0.8);
        const hand = add(OIL.plug, -0.03 - 0.1 * drawn + 0.006 * wave(t, 2.4) * (1 - drawn), -0.035 - 0.12 * drawn, -0.05 - 0.06 * drawn);
        f.tool = 'plug';
        n.oil = ss(p, 0.6, 0.8);
        n.level = 0.1 * ss(p, 0.7, 1);
        p2.plugAt = mixP(OIL.plug, add(hand, 0, 0.012, 0), ss(p, 0.3, 0.55));
        f.key = under(LEFT_ON_PAN, hand, -0.55 + 0.15 * drawn, { gr: 0.85, palms: 0.3 });
        break;
      }
      case 'drain': {
        // The plug laid on the tray; a thin stream into the dish, watched.
        const hand = add(OIL.plug, -0.13, -0.155, -0.11);
        n.oil = 1 - 0.55 * ss(p, 0.6, 1);
        n.level = mix(0.1, 0.72, p);
        p2.plugAt = p < 0.4 ? mixP(add(hand, 0, 0.012, 0), add(TRAY_PLUG, 0, 0.01, 0), ss(p, 0, 0.35)) : TRAY_PLUG;
        f.tool = p < 0.38 ? 'plug' : null;
        f.key = under(mixP(LEFT_ON_PAN, easyL(A.under), ss(p, 0, 0.3)), p < 0.38 ? mixP(hand, TRAY_PLUG, ss(p, 0, 0.35)) : easyR(A.under), mix(-0.3, 0.32, ss(p, 0.1, 0.45)), { gr: p < 0.38 ? 0.85 : 0.3 });
        break;
      }
      case 'filterOff': {
        // Spun down by the hand round it, drawn off, let go into the dish.
        const grip = add(OIL.filter, 0, -0.01, -0.01);
        const off = ss(p, 0.55, 0.92);
        const hand = mixP(grip, add(OIL.oldIn, 0, 0.1, -0.02), off);
        n.oil = 0.45 * (1 - ss(p, 0.55, 1));
        n.level = mix(0.72, 0.82, p);
        n.filter = 0;
        n.turn = p < 0.55 ? p * 22 : 12;
        f.tool = 'oldFilter';
        p2.filterAt = hand;
        f.key = under(easyL(A.under), hand, mix(-0.45, -0.1, off), { gr: 0.8 });
        break;
      }
      case 'gasket': {
        // The new one off the tray, upside down in the right, a fingertip of clean oil round its rubber.
        const hold = sp(A.under, -0.1, 1.28, 0.28);
        const lift = ss(p, 0, 0.3);
        const round = add(hold, 0.03 * Math.cos(t * 7), 0.075, 0.03 * Math.sin(t * 7));
        n.level = 0.85;
        f.tool = 'newFilter';
        n.upside = 1;
        p2.filterAt = mixP(TRAY_FILTER, hold, lift);
        f.key = key(mixP(easyL(A.under), round, ss(p, 0.25, 0.42)), mixP(TRAY_FILTER, hold, lift), 0.1, 0.42, { gr: 0.8, gl: 0.5, palms: 0.4 });
        break;
      }
      case 'filterOn': {
        const up = ss(p, 0, 0.35);
        const hold = sp(A.under, -0.1, 1.28, 0.28);
        const hand = mixP(hold, add(OIL.filter, 0, -0.01, -0.01), up);
        n.filter = 0;
        n.newFilter = p > 0.95 ? 1 : 0;
        n.upside = 1 - up;
        n.turn = (p - 0.35) * 20;
        f.tool = p > 0.95 ? null : 'newFilter';
        p2.filterAt = hand;
        f.key = under(easyL(A.under), hand, mix(0.2, -0.5, up), { gr: 0.85 });
        break;
      }
      case 'plugIn': {
        const take = ss(p, 0, 0.45);
        const hand = mixP(TRAY_PLUG, add(OIL.plug, -0.03 + 0.006 * wave(t, 2.4), -0.035, -0.05), take);
        f.tool = p < 0.9 ? 'plug' : null;
        p2.plugAt = mixP(TRAY_PLUG, OIL.plug, take);
        f.key = under(LEFT_ON_PAN, hand, mix(0.1, -0.55, take), { gr: 0.85 });
        break;
      }
      case 'tighten': {
        const a = 0.4 + 0.5 * Math.abs(Math.sin(p * 3 * PI));
        f.tool = 'wrench';
        n.turn = a;
        p2.wrenchHead = OIL.plug;
        f.key = under(LEFT_ON_PAN, onPlug(a), -0.55, { gr: 0.92 });
        break;
      }
      case 'unroll': {
        const e = ss(p, 0.05, 0.95);
        const foot = mixP(OIL.panIn, OIL.panHome, e);
        f.at = mixAt(A.under, A.roll, e);
        n.pan = 1 - e;
        p2.pan = foot;
        f.key = key(panGrip(foot), easyR(f.at), 0.08, 0.2, { gl: 0.8 });
        break;
      }
      case 'lower':
        f.at = A.post;
        n.lift = 1 - ss(p, 0, 0.05);
        f.key = key(easyL(A.post), add(OIL.button, -0.06, 0, 0.02), 0.12, 0.05, { gr: 0.2 });
        break;
      case 'corner':
        f.at = A.corner;
        f.key = key(easyL(A.corner), easyR(A.corner), 0.03, 0.1);
        break;
      case 'bonnet': {
        // The catch, then the bonnet up with both hands as far as the arms go; its struts take it on.
        const up = ss(p, 0.15, 0.85);
        const lip = (x: number): P => {
          const th = 0.75 * up;
          return [x, 0.76 + 0.88 * Math.sin(th) - 0.03, 0.56 + 0.88 * Math.cos(th) + 0.03];
        };
        f.at = A.nose;
        n.bonnet = up;
        f.key = key(lip(-0.08), lip(0.28), mix(0.45, 0.2, up), mix(0.5, 0.05, up), { palms: 0.25, gl: 0.6, gr: 0.6 });
        break;
      }
      case 'capOff': {
        f.at = A.nose;
        f.tool = 'cap';
        n.capOff = ss(p, 0.3, 0.6);
        const hand = mixP(add(OIL.cap, 0.006 * wave(t, 3), 0.03, 0.025), add(OIL.capAside, 0, 0.03, 0.02), ss(p, 0.55, 0.95));
        p2.capAt = add(hand, 0, -0.03, -0.015);
        f.key = key(sp(A.nose, 0.16, 1.02, 0.34), hand, 0.92, 0.58, { gr: 0.75 });
        break;
      }
      case 'getFunnel':
        f.at = A.cart;
        f.tool = 'funnel';
        p2.funnel = mixP(OIL.funnelRest, sp(A.cart, 0.2, 1.06, 0.2), ss(p, 0.3, 0.9));
        f.key = key(add(p2.funnel, -0.04, 0.03, 0.02), easyR(A.cart), 0.3, 0.42, { gl: 0.8 });
        break;
      case 'setFunnel':
        f.at = A.nose;
        f.tool = p < 0.8 ? 'funnel' : null;
        p2.funnel = mixP(sp(A.nose, -0.02, 1.0, 0.4), OIL.funnel, ss(p, 0.1, 0.75));
        f.key = key(add(p2.funnel, -0.04, 0.03, 0.02), easyR(A.nose), 0.9, 0.56, { gl: 0.8 });
        break;
      case 'getJug':
        f.at = A.cart;
        f.tool = 'jug';
        p2.jug = mixP(OIL.jug, sp(A.cart, -0.14, 1.1, 0.22), ss(p, 0.3, 0.9));
        f.key = key(easyL(A.cart), p2.jug, 0.28, 0.42, { gr: 0.9 });
        break;
      case 'pour': {
        // Up over the funnel, tipped slowly; the other hand steadies the funnel; the level sinks.
        const hand: P = [0.31, 1.06 + 0.012 * wave(t, 0.5), 0.88];
        const tip = 1.35 * ss(p, 0.08, 0.2) * (1 - ss(p, 0.9, 1));
        f.at = A.nose;
        f.tool = 'jug';
        n.tip = tip;
        n.pour = ss(p, 0.16, 0.22) * (1 - ss(p, 0.86, 0.92));
        n.jugLevel = mix(1, 0.15, ss(p, 0.15, 0.9));
        p2.jug = hand;
        f.key = key(add(OIL.funnel, -0.06, 0.05, 0.03), hand, 0.92, 0.55, { gr: 0.95, gl: 0.55 });
        break;
      }
      case 'putJug':
        f.at = A.cart;
        f.tool = p < 0.8 ? 'jug' : null;
        p2.jug = mixP(sp(A.cart, -0.14, 1.1, 0.22), OIL.jug, ss(p, 0.05, 0.75));
        f.key = key(easyL(A.cart), p2.jug, 0.28, 0.4, { gr: 0.9 });
        break;
      case 'funnelOut':
        f.at = A.nose;
        f.tool = p < 0.85 ? 'funnel' : null;
        p2.funnel = mixP(OIL.funnel, [0.0, 0.76, 1.12], ss(p, 0.15, 0.8));
        f.key = key(add(p2.funnel, -0.04, 0.03, 0.02), easyR(A.nose), 0.9, 0.56, { gl: 0.8 });
        break;
      case 'capOn': {
        f.at = A.nose;
        f.tool = 'cap';
        n.capOff = 1 - ss(p, 0.5, 0.85);
        const hand = mixP(add(OIL.capAside, 0, 0.03, 0.02), add(OIL.cap, 0.006 * wave(t, 3), 0.03, 0.025), ss(p, 0.05, 0.6));
        p2.capAt = add(hand, 0, -0.03, -0.015);
        f.key = key(sp(A.nose, 0.16, 1.02, 0.34), hand, 0.92, 0.58, { gr: 0.75 });
        break;
      }
      case 'dipOut': {
        const out = ss(p, 0.2, 0.95);
        const hand = add(OIL.stick, 0, 0.01 + 0.3 * out, 0.02 + 0.08 * out);
        f.at = A.nose;
        f.tool = 'stick';
        n.stickOut = out;
        p2.stickTop = hand;
        f.key = key(sp(A.nose, 0.16, 1.02, 0.34), hand, 0.85, 0.5, { gl: 0.3, gr: 0.75 });
        break;
      }
      case 'wipe': {
        // Clean with the rag in the left, drawn down it.
        const top = add(OIL.stick, 0.04, 0.34, 0.14);
        f.at = A.nose;
        f.tool = 'stick';
        n.stickOut = 1;
        n.stickWiped = ss(p, 0.2, 0.9);
        p2.stickTop = top;
        p2.rag = add(top, -0.01, -0.06 - 0.22 * ss(p, 0.1, 0.9), 0);
        f.key = key(p2.rag, top, 0.62, 0.46, { gl: 0.7, gr: 0.75 });
        break;
      }
      case 'dipIn': {
        const out = 1 - ss(p, 0.1, 0.55) + ss(p, 0.65, 0.98);
        const hand = add(OIL.stick, 0, 0.01 + 0.3 * out, 0.02 + 0.08 * out);
        f.at = A.nose;
        f.tool = 'stick';
        n.stickOut = out;
        n.stickWiped = 1;
        p2.stickTop = hand;
        f.key = key(sp(A.nose, 0.16, 1.02, 0.34), hand, 0.85, 0.5, { gr: 0.75 });
        break;
      }
      case 'dipRead': {
        // Held level and read between the marks; back in at the end.
        const hold = sp(A.nose, -0.1, 1.16, 0.3);
        const back = ss(p, 0.68, 1);
        const hand = mixP(hold, add(OIL.stick, 0, 0.01, 0.02), back);
        f.at = A.nose;
        f.tool = 'stick';
        n.stickOut = 1 - back;
        n.stickLevel = 1 - back;
        n.stickWiped = 1;
        p2.stickTop = hand;
        f.key = key(sp(A.nose, 0.16, 1.02, 0.34), hand, mix(0.2, 0.85, back), mix(0.3, 0.5, back), { gr: 0.75 });
        break;
      }
      case 'stow':
        f.at = A.nose;
        f.tool = p < 0.85 ? 'funnel' : null;
        p2.funnel = mixP([0.0, 0.76, 1.12], sp(A.nose, 0.16, 1.05, 0.2), ss(p, 0.1, 0.85));
        f.key = key(add(p2.funnel, -0.04, 0.03, 0.02), easyR(A.nose), mix(0.8, 0.2, ss(p, 0.1, 0.85)), 0.4, { gl: 0.8 });
        break;
      case 'note': {
        const hold = sp(A.cart, 0.1, 1.1, 0.22);
        const tip = add(hold, ...onBoard(A.cart, onSheet(-0.04 + 0.09 * frac(p * 2), 0.04 - 0.05 * Math.floor(p * 2), 0.07)));
        f.at = A.cart;
        f.tool = 'clip';
        p2.clip = hold;
        f.key = key(hold, tip, 0.1, 0.44, { gl: 0.65, gr: 0.7 });
        break;
      }
      case 'shut': {
        const down = 1 - ss(p, 0.2, 0.75);
        const th = 0.75 * down;
        const lip: P = [0.1, 0.76 + 0.88 * Math.sin(th) + 0.03, 0.56 + 0.88 * Math.cos(th) + 0.04];
        f.at = A.nose;
        n.bonnet = down;
        f.key = key(add(lip, -0.15, 0, 0), add(lip, 0.15, 0, 0), mix(0.45, 0.2, down), 0.3, { palms: 1.1, gl: 0.1, gr: 0.1 });
        break;
      }
    }
    return f;
  },
};
const pulse = (p: number) => Math.exp(-((p - 0.12) ** 2) / 0.004);
const OIL_ORDER = OIL_SCRIPT.steps.map((s) => s.key);

// =============================================================================================
// 머신 청소 (espressoMachine, 1 × 1). The left group's the one worked on.

export const MC = {
  group: [-0.04, 1.14, 0] as P,
  button: [-0.04, 1.27, 0.0] as P,
  wandTip: [0.47, 1.0, 0.08] as P,
  wandTop: [0.452, 1.13, 0.03] as P,
  knob: [0.4, 1.25, -0.002] as P,
  knock: [-0.37, 1.0, 0.12] as P,
  /** The cleaning things' tray on the counter (where the pitcher goes), and where the tub, the blind filter, the brush and the cloth lie. */
  kit: [0.3, 0.9, 0.16] as P,
  blind: [0.12, 0.94, 0.12] as P,
  brush: [0.38, 0.94, 0.12] as P,
  cloth: [0.44, 0.93, 0.2] as P,
  tub: [0.2, 0.98, 0.2] as P,
  /** Where the portafilter's held to be worked on, its basket. */
  bench: [-0.1, 1.02, 0.24] as P,
  /** The drip tray at home, and drawn out; the bucket on its stool. */
  tray: [0.11, 0.9425, 0.025] as P,
  trayOut: [0.11, 1.0, 0.26] as P,
  bucket: [-0.3, 0.55, 0.6] as P,
  lockTwist: 0.35,
  handle: 0.128,
  droop: 0.03,
};
export const MC_AT = {
  group: { x: -0.04, z: 0.45, yaw: PI } as SpotAt,
  wand: { x: 0.28, z: 0.45, yaw: PI } as SpotAt,
  side: { x: 0.08, z: 0.6, yaw: -PI / 2 } as SpotAt,
};
/** The right hand on the handle for a basket at `b`, twisted `a` (0 straight towards the barista, more to their right). */
const onHandle = (b: P, a: number): P => [b[0] + MC.handle * Math.sin(a), b[1] - MC.droop, b[2] + MC.handle * Math.cos(a)];
const PF_LOCKED: P = [MC.group[0], MC.group[1] - 0.03, MC.group[2]];
const PF_BELOW: P = [MC.group[0], MC.group[1] - 0.09, MC.group[2] + 0.03];

const MACHINE: Script = {
  steps: [
    st('unlock', 1.8), st('knock', 1.6), st('blind', 2.0), st('dose', 2.0), st('lockIn', 1.8), st('flush', 7.0), st('unlock2', 1.6), st('rinse', 2.4), st('brush', 3.6), st('wand', 0.2, 0.7),
    st('purge', 2.2), st('wipeWand', 2.6), st('purge2', 1.2), st('back', 0.2, 0.6), st('trayOut', 2.2), st('tip', 2.2), st('trayIn', 2.0), st('done', 1.6, 0.7),
  ],
  frame(k, p, t) {
    const A = MC_AT.group;
    const o = MACHINE_ORDER.indexOf(k);
    const past = (s: string) => o >= MACHINE_ORDER.indexOf(s);
    const n: Record<string, number> = { blind: past('blind') && !past('rinse') ? 1 : 0, powder: past('dose') && !past('flush') ? 1 : 0, twist: 0, flush: 0, rinse: 0, steam: 0, level: past('tip') ? 0 : 1, tip: 0, clean: past('brush') ? 1 : 0 };
    const q: Record<string, P | null | undefined> = { pf: PF_LOCKED, tray: MC.tray };
    const f: Frame = { at: A, key: key(easyL(A), easyR(A), 0.1, 0.3), tool: null, n, p: q };
    const hold = (b: P, a: number, more: Partial<Key> = {}, l: P = easyL(A)) => {
      q.pf = b;
      n.twist = a;
      f.tool = 'pf';
      f.key = key(l, onHandle(b, a), 0.22, 0.44, { gr: 0.92, ...more });
    };
    const steady: P = [-0.23, 1.17, -0.02];
    switch (k) {
      case 'unlock': {
        // Turned to the barista's right and let down out of the head, then drawn back.
        const a = mix(MC.lockTwist, 0.9, ss(p, 0.05, 0.35));
        const down = ss(p, 0.35, 0.65);
        hold(mixP(PF_LOCKED, PF_BELOW, down), mix(a, 0.3, ss(p, 0.6, 1)), {}, steady);
        break;
      }
      case 'knock': {
        const b = mixP(PF_BELOW, add(MC.knock, 0.02, 0.06 + 0.03 * Math.abs(wave(t, 2.5)) * ss(p, 0.3, 0.5), 0), ss(p, 0, 0.45));
        hold(b, 0.1);
        f.at = { x: -0.2, z: 0.45, yaw: PI };
        break;
      }
      case 'blind': {
        // The left takes the blind filter from the tray to the basket the right holds out.
        const b = MC.bench;
        hold(b, 0.1, {}, mixP(MC.blind, add(b, 0, 0.03, 0), ss(p, 0.2, 0.85)));
        f.key.gl = 0.8;
        q.blindAt = p < 0.85 ? mixP(MC.blind, add(b, 0, 0.01, 0), ss(p, 0.2, 0.85)) : null;
        n.blind = p < 0.85 ? 0 : 1;
        break;
      }
      case 'dose': {
        // A spoon of cleaner from the tub into the blind filter.
        const b = MC.bench;
        hold(b, 0.1, {}, mixP(MC.tub, add(b, 0, 0.08, 0), Math.sin(ss(p, 0.05, 0.95) * PI / 2)));
        f.key.gl = 0.75;
        n.powder = ss(p, 0.55, 0.8);
        q.spoon = f.key.l;
        break;
      }
      case 'lockIn': {
        const up = ss(p, 0.1, 0.55);
        hold(mixP(MC.bench, PF_LOCKED, up), mix(0.9, MC.lockTwist, ss(p, 0.55, 0.95)), {}, steady);
        n.powder = 1;
        break;
      }
      case 'flush': {
        // On and off, five times: the pump's note in the gauge, a cloudy spit into the tray each time it's stopped. The right on the button, the left on the machine.
        const u = Math.min(p * 5, 4.999);
        const on = frac(u) < 0.62;
        n.flush = on ? 1 : 0;
        n.spit = !on ? 1 : 0;
        n.cycles = Math.floor(u);
        q.pf = PF_LOCKED;
        n.twist = MC.lockTwist;
        const b = add(MC.button, 0.04, 0, 0.02 + (on ? 0 : 0.012));
        f.key = key(steady, b, 0.14, 0.2, { palms: 0.3, gr: 0.25 });
        break;
      }
      case 'unlock2': {
        const a = mix(MC.lockTwist, 0.9, ss(p, 0.05, 0.35));
        const down = ss(p, 0.35, 0.65);
        hold(mixP(PF_LOCKED, MC.bench, down), mix(a, 0.1, ss(p, 0.6, 1)), {}, steady);
        q.blindAt = null;
        break;
      }
      case 'rinse':
        // Set down on the tamping mat; the head run clear with nothing on it, a stream into the tray.
        q.pf = [-0.2, 0.96, 0.155];
        n.twist = 0.1;
        n.rinse = ss(p, 0.15, 0.3) * (1 - ss(p, 0.85, 1));
        f.key = key(steady, add(MC.button, 0.04, 0, 0.02), 0.14, 0.26, { palms: 0.3, gr: 0.25 });
        break;
      case 'brush': {
        // The brush up round the gasket.
        const a = t * 9;
        const head = add(MC.group, 0.03 * Math.cos(a), -0.05, 0.03 * Math.sin(a));
        q.pf = [-0.2, 0.96, 0.155];
        n.twist = 0.1;
        q.brushHead = head;
        f.tool = 'brush';
        n.rinse = 0;
        const hand = add(MC.group, 0.09, -0.19, 0.14);
        f.key = key(steady, mixP(MC.brush, hand, ss(p, 0, 0.2)), 0.2, 0.28, { gr: 0.9 });
        q.brushHand = f.key.r;
        break;
      }
      case 'wand':
        q.pf = [-0.2, 0.96, 0.155];
        f.at = MC_AT.wand;
        f.key = key(easyL(MC_AT.wand), easyR(MC_AT.wand), 0.1, 0.25);
        break;
      case 'purge':
      case 'purge2': {
        // A short blast with the knob, into the air over the tray: milk out of the wand's holes.
        const at = MC_AT.wand;
        q.pf = [-0.2, 0.96, 0.155];
        f.at = at;
        n.steam = ss(p, 0.15, 0.3) * (1 - ss(p, 0.8, 0.95));
        f.key = key(k === 'purge2' ? add(MC.wandTop, 0.02, -0.04, 0.03) : easyL(at), add(MC.knob, 0.015 * wave(t, 1.5), 0, 0.05), 0.15, 0.2, { gr: 0.8, gl: k === 'purge2' ? 0.8 : 0.3 });
        q.cloth = k === 'purge2' ? f.key.l : null;
        f.tool = k === 'purge2' ? 'cloth' : null;
        break;
      }
      case 'wipeWand': {
        // The damp cloth from the tray, round the wand and drawn down it.
        const at = MC_AT.wand;
        const take = ss(p, 0, 0.25);
        const run = 0.5 + 0.5 * Math.sin(t * 6);
        const on = mixP(MC.wandTop, MC.wandTip, run);
        const hand = mixP(MC.cloth, add(on, 0.0, 0.0, 0.02), take);
        q.pf = [-0.2, 0.96, 0.155];
        f.at = at;
        f.tool = 'cloth';
        q.cloth = hand;
        f.key = key(hand, easyR(at), 0.2, 0.4, { gl: 0.85 });
        break;
      }
      case 'back':
        q.pf = [-0.2, 0.96, 0.155];
        f.key = key(easyL(A), easyR(A), 0.1, 0.25);
        break;
      case 'trayOut': {
        q.pf = [-0.2, 0.96, 0.155];
        const tr = mixP(MC.tray, MC.trayOut, ss(p, 0.15, 0.85));
        q.tray = tr;
        f.key = key(add(tr, -0.26, 0.015, 0.05), add(tr, 0.26, 0.015, 0.05), 0.24, 0.42, { palms: 0.9, gl: 0.75, gr: 0.75 });
        break;
      }
      case 'tip': {
        // Stepped back to the bucket and tipped into it.
        const at = MC_AT.side;
        const tr: P = sp(at, 0, 1.02, 0.3);
        const e = ss(p, 0.05, 0.3);
        n.trayYaw = e;
        const out = ss(p, 0.3, 0.42) * (1 - ss(p, 0.85, 1));
        q.pf = [-0.2, 0.96, 0.155];
        q.tray = mixP(MC.trayOut, tr, e);
        f.at = mixAt(A, at, e);
        n.tip = out;
        n.level = 1 - ss(p, 0.42, 0.8);
        n.pourOut = ss(p, 0.38, 0.45) * (1 - ss(p, 0.75, 0.85));
        const t0 = q.tray;
        f.key = key(mixP(add(t0, -0.26, 0.015, 0.05), sp(at, 0.27, t0[1] + 0.03 * out, 0.26), e), mixP(add(t0, 0.26, 0.015, 0.05), sp(at, -0.27, t0[1] + 0.03 * out, 0.26), e), 0.14, 0.42, { palms: 0.9, gl: 0.75, gr: 0.75 });
        break;
      }
      case 'trayIn': {
        q.pf = [-0.2, 0.96, 0.155];
        const e = ss(p, 0.05, 0.9);
        const tr = mixP(sp(MC_AT.side, 0, 1.02, 0.3), MC.tray, e);
        q.tray = tr;
        n.trayYaw = 1 - ss(p, 0.05, 0.4);
        f.at = mixAt(MC_AT.side, A, ss(p, 0, 0.4));
        f.key = key(mixP(sp(MC_AT.side, 0.27, 1.02, 0.26), add(MC.tray, -0.26, 0.015, 0.05), e), mixP(sp(MC_AT.side, -0.27, 1.02, 0.26), add(MC.tray, 0.26, 0.015, 0.05), e), 0.2, 0.42, { palms: 0.9, gl: 0.75, gr: 0.75 });
        break;
      }
      case 'done':
        // The portafilter back in the head, the blind filter gone, ready for the next day.
        hold(mixP([-0.2, 0.96, 0.155], PF_LOCKED, ss(p, 0.05, 0.9)), mix(0.1, MC.lockTwist, ss(p, 0.3, 0.95)), {}, steady);
        break;
    }
    return f;
  },
};
const MACHINE_ORDER = MACHINE.steps.map((s) => s.key);

// =============================================================================================
// 원두·우유 발주 (cafeCounter, 2 × 1): the tablet on the counter's front, the stock crate on a trolley at the dweller's right.

export const OB = {
  top: 1.02,
  tablet: [0.2, 1.04, 0.05] as P,
  trolley: [0.71, 0, 0.62] as P,
  crateTop: 0.72,
  /** The bags and the cartons in the crate. */
  bags: [[0.62, 0.84, 0.55], [0.71, 0.84, 0.55], [0.8, 0.84, 0.55]] as ReadonlyArray<P>,
  cartons: [[0.6, 0.84, 0.69], [0.67, 0.84, 0.69], [0.74, 0.84, 0.69], [0.81, 0.84, 0.69]] as ReadonlyArray<P>,
};
export const OB_AT = {
  counter: { x: 0.2, z: 0.5, yaw: PI } as SpotAt,
  crate: { x: 0.34, z: 0.62, yaw: PI / 2 } as SpotAt,
};
/** The tablet in the left hand, for a spot. */
const tabletHold = (at: SpotAt): P => sp(at, 0.14, 1.12, 0.22);

const BEANS: Script = {
  steps: [st('take', 1.8, 0.8), st('bags', 4.2), st('lift', 2.0), st('cartons', 4.8), st('date', 2.0), st('type', 3.2, 0.8), st('review', 2.4), st('send', 1.6), st('put', 1.8, 0.7)],
  frame(k, p, t) {
    const C = OB_AT.crate;
    const hold = tabletHold(C);
    const tap = add(hold, ...onBoard(C, [-0.03 + 0.05 * wave(t, 0.7), 0.03, 0.05 + 0.014 * Math.max(0, wave(t, 2.6))]));
    const o = BEANS_ORDER.indexOf(k);
    const past = (s: string) => o >= BEANS_ORDER.indexOf(s);
    const n: Record<string, number> = { lines: past('cartons') ? 1 : 0, sent: past('put') ? 1 : 0, lift: 0, screen: past('review') ? 3 : past('type') ? 2 : past('cartons') ? 1 : 0, counted: 0 };
    const f: Frame = { at: C, key: key(hold, tap, 0.1, 0.4, { gl: 0.7, gr: 0.4 }), tool: 'tablet', n, p: { tablet: hold } };
    switch (k) {
      case 'take': {
        const A = OB_AT.counter;
        const h = mixP(OB.tablet, tabletHold(A), ss(p, 0.25, 0.9));
        f.at = A;
        f.p!.tablet = h;
        f.key = key(h, easyR(A), mix(0.3, 0.1, ss(p, 0.25, 0.9)), 0.4, { gl: 0.7 });
        break;
      }
      case 'bags': {
        const u = p * 3;
        const i = Math.min(2, Math.floor(u));
        n.counted = i + 1;
        const b = OB.bags[i];
        f.key = key(hold, add(b, -0.02, 0.1 - 0.02 * Math.abs(wave(t, 1.6)), 0.0), 0.3, 0.5, { gl: 0.7, gr: 0.3 });
        break;
      }
      case 'lift': {
        // One lifted by its top to feel how much is left.
        const b = OB.bags[0];
        const up = Math.sin(ss(p, 0.1, 0.9) * PI) * 0.14;
        n.lift = up;
        f.key = key(hold, add(b, -0.01, 0.09 + up, 0), 0.3, 0.46, { gl: 0.7, gr: 0.85 });
        break;
      }
      case 'cartons': {
        const u = p * 4;
        const i = Math.min(3, Math.floor(u));
        n.counted = 4 + i;
        f.key = key(hold, add(OB.cartons[i], -0.02, 0.1 - 0.02 * Math.abs(wave(t, 1.6)), -0.01), 0.3, 0.5, { gl: 0.7, gr: 0.3 });
        break;
      }
      case 'date':
        // The date on the front carton read.
        f.key = key(hold, add(OB.cartons[0], -0.02, 0.04, -0.05), 0.42, 0.56, { gl: 0.7, gr: 0.5 });
        break;
      case 'type':
        f.key = key(hold, tap, 0.08, 0.42, { gl: 0.7, gr: 0.35 });
        break;
      case 'review': {
        const A = OB_AT.counter;
        const h = tabletHold(A);
        f.at = A;
        f.p!.tablet = h;
        f.key = key(h, add(h, ...onBoard(A, [0.02, 0.03 + 0.05 * wave(t, 0.4), 0.06])), 0.08, 0.44, { gl: 0.7, gr: 0.35 });
        break;
      }
      case 'send': {
        const A = OB_AT.counter;
        const h = tabletHold(A);
        f.at = A;
        f.p!.tablet = h;
        n.sent = ss(p, 0.4, 0.55);
        n.screen = p > 0.5 ? 4 : 3;
        f.key = key(h, add(h, ...onBoard(A, [0.03, -0.05, 0.05 + 0.02 * (1 - ss(p, 0.3, 0.45))])), 0.08, 0.44, { gl: 0.7, gr: 0.3 });
        break;
      }
      case 'put': {
        const A = OB_AT.counter;
        const h = mixP(tabletHold(A), OB.tablet, ss(p, 0.05, 0.8));
        f.at = A;
        f.p!.tablet = h;
        n.screen = 4;
        n.sent = 1;
        f.key = key(h, easyR(A), mix(0.1, 0.3, ss(p, 0.05, 0.8)), 0.4, { gl: 0.7 });
        f.tool = p > 0.85 ? null : 'tablet';
        break;
      }
    }
    return f;
  },
};
const BEANS_ORDER = BEANS.steps.map((s) => s.key);

// =============================================================================================
// 병충해 방제 (gardenBed, 2 × 1): a branch of big leaves on the right-hand shrub, the kit's tote on the front edging.

export const PS = {
  top: 0.27,
  leaves: [[0.34, 0.54, 0.2], [0.46, 0.6, 0.24], [0.58, 0.52, 0.24]] as ReadonlyArray<P>,
  tote: [0.16, 0.27, 0.46] as P,
  jar: [0.1, 0.53, 0.46] as P,
  loupe: [0.22, 0.53, 0.42] as P,
  note: [0.14, 0.51, 0.5] as P,
  gloves: [0.24, 0.53, 0.5] as P,
  sprayer: [0.72, 0.265, 0.46] as P,
  /** The sprayer: its handle above the foot, its pump knob at rest. */
  sprayerUp: 0.31,
};
export const PS_AT = { bush: { x: 0.44, z: 0.6, yaw: PI } as SpotAt, kit: { x: 0.26, z: 0.62, yaw: PI } as SpotAt, spray: { x: 0.54, z: 0.6, yaw: PI } as SpotAt };
const low = { crouch: 0.9, lean: 0.62 };
const handleOf = add(PS.sprayer, 0, PS.sprayerUp, 0);

const PEST: Script = {
  steps: [
    st('look', 1.2), st('loupe', 1.4), st('leaf0', 2.8), st('leaf1', 2.4), st('pick0', 1.5, 0.2), st('pick1', 1.5, 0.2), st('pick2', 1.5, 0.2), st('jarUp', 1.2, 0.5), st('gloves', 2.4, 0.5),
    st('pump', 2.8), st('lift', 1.2), st('spray', 5.0), st('set', 1.2, 0.5), st('note', 2.6, 0.5), st('rise', 1.0, 0.6),
  ],
  frame(k, p, t) {
    const B = PS_AT.bush;
    const K = PS_AT.kit;
    const o = PEST_ORDER.indexOf(k);
    const past = (s: string) => o >= PEST_ORDER.indexOf(s);
    const n: Record<string, number> = { flip0: 0, flip1: 0, bugs: past('pick2') ? 3 : past('pick1') ? 2 : past('pick0') ? 1 : 0, gloves: past('gloves') ? 1 : 0, mist: 0, pump: 0, noted: past('note') ? 1 : 0 };
    const q: Record<string, P | null | undefined> = {};
    const restL = sp(B, 0.14, 0.72, 0.26);
    const restR = sp(B, -0.14, 0.72, 0.26);
    const f: Frame = { at: B, key: key(restL, restR, low.lean, 0.5, { crouch: low.crouch }), tool: null, n, p: q };
    const stoop = (l: P, r: P, more: Partial<Key> = {}): Key => key(l, r, low.lean, 0.5, { crouch: low.crouch, ...more });
    switch (k) {
      case 'look':
        f.key = key(easyL(B), easyR(B), 0.14, 0.34);
        break;
      case 'loupe': {
        f.at = mixAt(K, B, ss(p, 0.55, 1));
        const hand = mixP(PS.loupe, sp(f.at, -0.1, 0.78, 0.4), ss(p, 0.1, 0.9));
        f.tool = 'loupe';
        q.loupe = hand;
        f.key = stoop(restL, hand, { gr: 0.85 });
        break;
      }
      case 'leaf0':
      case 'leaf1': {
        // Held by its edge in the left and turned over; the loupe brought over its underside; a bug seen.
        const i = k === 'leaf0' ? 0 : 1;
        const flip = ss(p, 0.1, 0.35) * (1 - ss(p, 0.85, 1));
        n[`flip${i}`] = flip;
        const leaf = PS.leaves[i];
        const over = add(leaf, 0.0, 0.1 + 0.008 * wave(t, 0.8), 0.06);
        f.tool = 'loupe';
        q.loupe = over;
        f.key = stoop(add(leaf, -0.04, -0.015, 0.03), over, { gl: 0.65, gr: 0.85, nod: 0.56 });
        break;
      }
      case 'pick0':
      case 'pick1':
      case 'pick2': {
        // Loupe down; finger and thumb take a bug off the underside, and it goes in the jar.
        const i = k === 'pick0' ? 0 : k === 'pick1' ? 1 : 2;
        const leaf = PS.leaves[i === 2 ? 2 : i];
        const on = add(leaf, -0.015, -0.02, 0.03);
        const inJar = add(PS.jar, 0, 0.05, 0);
        f.at = mixAt(B, K, ss(p, 0.3, 0.8));
        const hand = mixP(on, inJar, ss(p, 0.3, 0.85));
        n[`flip${i}`] = 1 - ss(p, 0.2, 0.45);
        f.tool = p < 0.85 ? 'bug' : null;
        q.bug = hand;
        q.loupe = PS.loupe;
        f.key = stoop(mixP(add(PS.leaves[i], -0.05, -0.02, 0.04), sp(K, 0.14, 0.72, 0.26), ss(p, 0.2, 0.5)), hand, { gr: 0.75, gl: 0.55, lean: 0.64 });
        break;
      }
      case 'jarUp':
        // The jar's lid put on, a look at what's in it.
        f.at = K;
        f.key = stoop(add(PS.jar, -0.04, 0.03, 0.05), add(PS.jar, 0.04, 0.06, 0.05), { gl: 0.7, gr: 0.5, palms: 0.8 });
        q.lid = PS.jar;
        n.lid = ss(p, 0.1, 0.5);
        break;
      case 'gloves': {
        // Rubber gloves on, one hand working into the other's cuff, before the sprayer's touched.
        const c = sp(K, 0, 0.84, 0.22);
        f.at = K;
        n.gloves = ss(p, 0.1, 0.9);
        const r = p < 0.5;
        f.key = key(r ? add(c, 0.06, 0.02, 0) : add(c, 0.04, 0.05 * Math.sin(p * PI * 4), 0), r ? add(c, -0.06, 0.05 * Math.sin(p * PI * 4), 0) : add(c, -0.06, 0.02, 0), 0.3, 0.46, { crouch: 0.5, palms: 0.9, gl: 0.5, gr: 0.5 });
        q.glovePair = c;
        break;
      }
      case 'pump': {
        // Foot on the edging, the left round the tank, the right working the pump.
        const up = 0.05 * (0.5 + 0.5 * wave(t, 1.5));
        const knob = add(handleOf, -0.0, 0.08 + up, 0.02);
        f.at = PS_AT.spray;
        n.pump = up;
        f.key = stoop(add(PS.sprayer, -0.07, 0.2, 0.02), knob, { gl: 0.8, gr: 0.9, palms: 0.5 });
        break;
      }
      case 'lift': {
        const h = mixP(handleOf, sp(PS_AT.spray, -0.12, 0.92, 0.3), ss(p, 0.1, 0.9));
        f.at = PS_AT.spray;
        f.tool = 'sprayer';
        q.sprayer = h;
        f.key = stoop(restL, h, { gr: 0.95, lean: 0.45, crouch: 0.7 });
        break;
      }
      case 'spray': {
        // From under the leaves, the wand working along; the left turning a leaf up to the mist.
        const u = (Math.sin(t * 1.6) + 1) / 2;
        const aimAt = mixP(PS.leaves[0], PS.leaves[2], u);
        f.at = PS_AT.spray;
        f.tool = 'sprayer';
        q.sprayer = sp(PS_AT.spray, -0.12, 0.84, 0.32);
        q.aim = add(aimAt, 0, 0.0, -0.04);
        n.mist = ss(p, 0.05, 0.15) * (1 - ss(p, 0.92, 1));
        f.key = stoop(add(PS.leaves[1], -0.04, -0.02, 0.05), q.sprayer, { gr: 0.97, gl: 0.55, crouch: 0.7, lean: 0.5 });
        break;
      }
      case 'set': {
        const h = mixP(sp(PS_AT.spray, -0.12, 0.84, 0.32), handleOf, ss(p, 0.05, 0.85));
        f.at = PS_AT.spray;
        f.tool = p < 0.9 ? 'sprayer' : null;
        q.sprayer = h;
        f.key = stoop(restL, h, { gr: 0.95, lean: 0.5 });
        break;
      }
      case 'note': {
        // A line in the notebook on the tote: which leaves, what was on them, what was sprayed.
        const tip = add(PS.note, -0.05 + 0.1 * frac(p * 2), 0.01, -0.03 + 0.04 * Math.floor(p * 2));
        f.at = K;
        f.tool = 'pen';
        q.penTip = tip;
        n.writing = ss(p, 0.1, 0.9);
        f.key = stoop(add(PS.note, -0.15, 0.02, 0.0), add(tip, 0.02, 0.08, 0.04), { gl: 0.2, palms: 0.1, nod: 0.56, lean: 0.56 });
        break;
      }
      case 'rise':
        f.at = K;
        f.key = key(easyL(K), easyR(K), 0.14, 0.3);
        break;
    }
    return f;
  },
};
const PEST_ORDER = PEST.steps.map((s) => s.key);

// =============================================================================================
// 병해충 방제 (cropField, 3 × 1): the furrow along the front row, the sprayer and the wind's ribbon at its +x end.

export const SPR = {
  stand: [1.46, 0, 0.72] as P,
  standTop: 0.54,
  ribbon: [1.46, 0, 0.42] as P,
  mask: [1.34, 1.0, 0.5] as P,
  gloves: [1.38, 0.98, 0.5] as P,
  pack: [1.46, 0.86, 0.68] as P,
  rowZ: 0.64,
  rowStart: 1.0,
  rowStop: -0.2,
  rowEnd: -1.1,
};
const yawW = -PI / 2;
export const SPR_AT = {
  stand: { x: 1.05, z: 0.68, yaw: PI / 2 } as SpotAt,
  start: { x: SPR.rowStart, z: SPR.rowZ, yaw: yawW } as SpotAt,
  stop: { x: SPR.rowStop, z: SPR.rowZ, yaw: yawW } as SpotAt,
  look: { x: SPR.rowStop, z: 0.62, yaw: PI } as SpotAt,
  end: { x: SPR.rowEnd, z: SPR.rowZ, yaw: yawW } as SpotAt,
  turned: { x: SPR.rowEnd, z: SPR.rowZ, yaw: PI / 2 } as SpotAt,
};
/** The tank on the back, for a spot and a body (it goes with the lean as the shoulders do). */
export function packOnBack(at: SpotAt, k: Pick<Key, 'lean' | 'crouch'>, H: number): P {
  const s = H / 1.6;
  const up = (1.1 - 0.45 * (1 - Math.cos(k.lean)) - 0.37 * k.crouch) * s;
  return sp(at, 0, up, -0.17 * s + 0.4 * Math.sin(k.lean) * s);
}
/** Where a hand takes the tank's top handle (its `side` to the dweller's left of the handle's middle). */
export const PACK_GRIP = { up: 0.25, side: 0.05 };
const packGrip = (at: SpotAt, pos: P, side: number): P => {
  const q = sp({ x: 0, z: 0, yaw: at.yaw }, side * PACK_GRIP.side, PACK_GRIP.up, 0);
  return [pos[0] + q[0], pos[1] + q[1], pos[2] + q[2]];
};
/** The mask, on the face. */
export const maskOnFace = (at: SpotAt, H: number): P => sp(at, 0, 1.43 * (H / 1.6), 0.095 * (H / 1.6));

const SPRAY_SCRIPT: Script = {
  steps: [
    st('wind', 1.6), st('mask', 2.4), st('gloves', 2.0), st('pack', 2.6), st('straps', 1.6), st('lance', 1.0, 0.7), st('rowA', 0.5, 4.0), st('check', 4.0, 0.3), st('rowB', 0.4, 3.2),
    st('endRow', 0.6, 0.6), st('home', 0.3, 4.2), st('off', 2.4, 0.7),
  ],
  frame(k, p, t, H) {
    const S = SPR_AT;
    const n: Record<string, number> = { mask: 0, gloves: 0, pack: 0, lance: 0, spray: 0, wind: 1, flip: 0, pump: 0 };
    const q: Record<string, P | null | undefined> = {};
    const f: Frame = { at: S.stand, key: key(easyL(S.stand), easyR(S.stand), 0.08, 0.2), tool: null, n, p: q };
    const worn = (at: SpotAt, k0: Pick<Key, 'lean' | 'crouch'>) => {
      n.mask = 1;
      n.gloves = 1;
      q.mask = maskOnFace(at, H);
      n.pack = 1;
      q.pack = packOnBack(at, k0, H);
    };
    const lever = (at: SpotAt) => sp(at, 0.24, 0.86 + 0.05 * wave(t, 1.1), -0.05);
    const lanceHand = (at: SpotAt) => sp(at, -0.22, 0.98, 0.14);
    const nozzleAim = (at: SpotAt) => {
      const a = sp(at, -0.5, 0.56 + 0.05 * wave(t, 0.8), 0.28 + 0.1 * wave(t, 0.45));
      return a;
    };
    const walk = (at: SpotAt) => {
      f.at = at;
      f.tool = 'lance';
      n.spray = 1;
      n.lance = 1;
      n.pump = wave(t, 1.1);
      q.lance = lanceHand(at);
      q.aim = nozzleAim(at);
      f.key = key(lever(at), q.lance, 0.1, 0.32, { gl: 0.85, gr: 0.95, palms: 0.2 });
      worn(at, f.key);
    };
    switch (k) {
      case 'wind':
        // The ribbon read: blowing from behind the way the row is walked.
        f.key = key(easyL(S.stand), sp(S.stand, -0.12, 1.14, 0.42), 0.04, -0.02, { gr: 0.15 });
        break;
      case 'mask': {
        const face = maskOnFace(S.stand, H);
        const hand = mixP(SPR.mask, add(face, 0.0, -0.02, 0), ss(p, 0.15, 0.7));
        f.tool = p < 0.75 ? 'mask' : null;
        n.mask = p < 0.75 ? 0.5 : 1;
        q.mask = hand;
        f.key = key(p > 0.6 ? add(face, 0.0, 0.05, -0.03) : easyL(S.stand), p < 0.75 ? hand : easyR(S.stand), 0.08, 0.05, { gr: 0.7, gl: 0.4 });
        break;
      }
      case 'gloves': {
        const c = sp(S.stand, 0, 0.98, 0.26);
        n.mask = 1;
        q.mask = maskOnFace(S.stand, H);
        n.gloves = ss(p, 0.1, 0.9);
        f.key = key(add(c, 0.06, 0.03 * Math.sin(p * 4 * PI), 0), add(c, -0.06, -0.03 * Math.sin(p * 4 * PI), 0), 0.12, 0.34, { palms: 0.9, gl: 0.5, gr: 0.5 });
        break;
      }
      case 'pack': {
        const k0 = { lean: 0.08, crouch: 0 };
        const back = packOnBack(S.stand, k0, H);
        const lifted = sp(S.stand, 0, 1.12, 0.3);
        const e1 = ss(p, 0.05, 0.5);
        const e2 = ss(p, 0.5, 0.95);
        const at = e2 > 0 ? mixP(lifted, back, e2) : mixP(SPR.pack, lifted, e1);
        n.mask = 1;
        n.gloves = 1;
        n.pack = 0.5;
        q.mask = maskOnFace(S.stand, H);
        q.pack = at;
        // Lifted by its top handle, then shrugged on, the hands going to the straps.
        const held = p < 0.5;
        f.tool = held ? 'pack' : null;
        const strap = (sx: number) => sp(S.stand, sx * 0.12, 1.14, 0.13);
        f.key = held ? key(packGrip(S.stand, at, 1), packGrip(S.stand, at, -1), 0.08, 0.2, { gl: 0.85, gr: 0.85 }) : key(strap(1), strap(-1), 0.08, 0.3, { gl: 0.85, gr: 0.85 });
        break;
      }
      case 'straps': {
        const k0 = { lean: 0.06, crouch: 0 };
        worn(S.stand, k0);
        const c = (sx: number) => sp(S.stand, sx * 0.12, 1.14 - 0.04 * Math.abs(wave(t, 1)), 0.13);
        f.key = key(c(1), c(-1), 0.06, 0.35, { gl: 0.85, gr: 0.85 });
        break;
      }
      case 'lance': {
        // Turned to the row; the lance off its clip at the hip.
        const at = mixAt(S.stand, S.start, ss(p, 0, 0.6));
        f.at = at;
        f.tool = 'lance';
        n.lance = 1;
        q.lance = lanceHand(at);
        q.aim = sp(at, -0.3, 0.7, 0.5);
        f.key = key(lever(at), q.lance, 0.06, 0.2, { gl: 0.7, gr: 0.9 });
        worn(at, f.key);
        break;
      }
      case 'rowA':
        walk(S.start);
        break;
      case 'check': {
        // Lance away from the plants, trigger off; a leaf turned up and looked at.
        const at = S.look;
        f.at = at;
        f.tool = 'lance';
        n.lance = 1;
        q.lance = sp(at, -0.26, 0.95, 0.05);
        q.aim = sp(at, -0.3, 0.62, 0.45);
        const leaf: P = [SPR.rowStop - 0.08, 0.42, 0.27];
        n.flip = ss(p, 0.2, 0.5) * (1 - ss(p, 0.8, 1));
        f.key = key(lever(at), q.lance, 0.1, 0.5, { gl: 0.3, gr: 0.9 });
        f.key.l = add(leaf, 0, 0.04, 0.05);
        f.key.lean = 0.65;
        f.key.crouch = 1;
        f.key.nod = 0.6;
        f.key.gl = 0.55;
        worn(at, f.key);
        q.leaf = leaf;
        break;
      }
      case 'rowB':
        walk(S.stop);
        break;
      case 'endRow':
        walk(S.end);
        n.spray = 0;
        break;
      case 'home': {
        const at = S.turned;
        f.at = at;
        f.tool = 'lance';
        n.lance = 1;
        q.lance = sp(at, -0.26, 0.96, 0.04);
        q.aim = sp(at, -0.3, 0.6, 0.3);
        f.key = key(easyL(at), q.lance, 0.06, 0.1, { gr: 0.85 });
        worn(at, f.key);
        break;
      }
      case 'off': {
        const k0 = { lean: 0.08, crouch: 0 };
        const back = packOnBack(S.stand, k0, H);
        const e = ss(p, 0.1, 0.9);
        n.mask = 1;
        n.gloves = 1;
        n.pack = 0.5;
        q.mask = maskOnFace(S.stand, H);
        q.pack = mixP(back, SPR.pack, e);
        const held = p > 0.5;
        f.tool = held ? 'pack' : null;
        const strap = (sx: number) => sp(S.stand, sx * 0.12, 1.14, 0.13);
        f.key = held ? key(packGrip(S.stand, q.pack, 1), packGrip(S.stand, q.pack, -1), 0.08, 0.2, { gl: 0.85, gr: 0.85 }) : key(strap(1), strap(-1), 0.08, 0.3, { gl: 0.85, gr: 0.85 });
        break;
      }
    }
    return f;
  },
};

// =============================================================================================

const SCRIPTS: Record<XeMotion, Script> = { xeOil: OIL_SCRIPT, xeMachine: MACHINE, xeBeans: BEANS, xePest: PEST, xeSpray: SPRAY_SCRIPT };
export const xeRound = (m: XeMotion) => roundOf(SCRIPTS[m]);
export function xeNow(m: XeMotion, elapsed: number, H = 1.6): XeNow {
  return nowOf(SCRIPTS[m], elapsed, H);
}
/** Seconds into a round where each beat starts (for the lead's shots). */
export function xeBeatTimes(m: XeMotion): Array<[string, number]> {
  let u = 0;
  return SCRIPTS[m].steps.map((k) => {
    const at: [string, number] = [k.key, u];
    u += k.hold + k.move;
    return at;
  });
}

/** The clock, started as the dweller arrives at this piece. */
const clocks = new Map<string, { start: number; last: number }>();
const clockKey = (m: XeMotion, o: THREE.Vector3) => `${m}:${o.x.toFixed(3)}:${o.z.toFixed(3)}`;
export function xeClock(m: XeMotion, t: number, origin: THREE.Vector3): number {
  const k = clockKey(m, origin);
  let c = clocks.get(k);
  if (!c || t - c.last > 15 || t < c.last - 1e-6) {
    c = { start: t, last: t };
    clocks.set(k, c);
    if (clocks.size > 64) for (const [q, x] of clocks) if (t - x.last > 30) clocks.delete(q);
  }
  c.last = t;
  return t - c.start;
}
export function xeStop(m: XeMotion, origin: THREE.Vector3) {
  clocks.delete(clockKey(m, origin));
}

/** A dweller at a spot of a piece: the whole body from the script. */
export function xePose(m: XeMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = xeNow(m, xeClock(m, t, par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: P) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const k = N.key;
  const at = W([N.at.x, 0, N.at.z]);
  const dir = new THREE.Vector3(Math.sin(N.at.yaw), 0, Math.cos(N.at.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return { pose, doing: { reach: { l: W(k.l), r: W(k.r), lean: k.lean, nod: k.nod, palms: k.palms, grip: { l: k.gl, r: k.gr } }, crouch: k.crouch || undefined } };
}
