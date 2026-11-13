import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A crew member's shift at the 패스트푸드점 (2026-11-01, the workplace pipeline, at the user's request), a
 * branch of the made-up 통통버거. Each motion is a round of beats, as at the 댄스 스튜디오: where the dweller is,
 * where the hands go, and what moves. The piece reads the same script by the same clock (fastFood.ts), so
 * the patty the spatula turns is the patty on the plate and the number on the board changes as it's pressed.
 *
 * - ffFry (튀김기): fries out of the freezer drawer into the basket, down in the oil, the timer set, a shake
 *   halfway, the beeper, lifted to drain, tipped in the salting pan, salted, scooped into a carton.
 * - ffGrill (그릴): the ticket read, patties off the cold drawer, pressed, flipped, cheese, buns, built,
 *   sauced, wrapped, and slid up to the warm rack; the plate scraped. ffRush is the same at a run, the
 *   printer spitting tickets and the rush lamp going, a forearm across the brow.
 * - ffTill (주문 카운터): a customer comes up, the order tapped in, the card on the terminal, the receipt torn
 *   off, a tray laid and filled from the warm shelf, slid across. ffTrain: the same till shown to a new crew
 *   member, who tries, and is ticked off on a clipboard.
 * - ffSort (분리수거대): a tray carried over from the dining room, the ice tipped down the funnel, the cup,
 *   paper and rubbish each through its own flap, the tray wiped and stacked.
 * - ffKiosk (키오스크): beside a customer who can't get on with it, pointing them through it screen by screen.
 * - ffCall (픽업 카운터): the bag folded and stapled, the order bumped so its number lights, called, the
 *   receipt checked, handed over.
 * - ffPour (음료 디스펜서): a cup, ice, held to the lever, foam settling, topped up, the lid pressed on, into
 *   the carrier.
 * - ffDrive (드라이브스루 창): headset on, the order keyed in, a car draws up, the window slid open, a card
 *   taken from the driver's hand and tapped, a bag and a drink passed out.
 * - ffRider (라이더 선반): the tablet rings, accepted, bag sealed and stickered, on its numbered shelf; the
 *   rider comes, shows the number on a phone, takes it.
 * - ffWipe (식탁): rubbish gathered on the tray, the tray lifted off, sprayed, wiped in circles.
 * - ffMop (청소 도구함): the wet floor sign set out, the mop wrung, walked back and forth over the floor.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x.
 */
export type FfMotion = 'ffFry' | 'ffGrill' | 'ffRush' | 'ffTill' | 'ffTrain' | 'ffSort' | 'ffKiosk' | 'ffCall' | 'ffPour' | 'ffDrive' | 'ffRider' | 'ffWipe' | 'ffMop';
export const FF_MOTIONS = new Set<string>(['ffFry', 'ffGrill', 'ffRush', 'ffTill', 'ffTrain', 'ffSort', 'ffKiosk', 'ffCall', 'ffPour', 'ffDrive', 'ffRider', 'ffWipe', 'ffMop']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const ffPhase = (p: THREE.Vector3) => frac(p.x * 0.371 + p.z * 0.583);
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
export interface FfNow {
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
export function ffNow(m: FfMotion, t: number, ph: number, H = 1.6): FfNow {
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
export function ffPose(m: FfMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = ffNow(m, t, ffPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
const scrub = (a: V, t: number, w = 0.07, d = 0.05): V => [a[0] + w * Math.sin(t * 7), a[1], a[2] + d * Math.cos(t * 7)];
const count = (c: Ctx, name: string, n: number) => Math.round(c.p(name) * n);

// =============================================================================================
// 튀김기 (fryer, 1 × 1): two wells, a salting pan under a lamp to the right, a freezer drawer below.

export const FR = {
  stand: 0.62,
  wells: [-0.27, 0.03] as const,
  oil: 0.865,
  z: 0.06,
  hook: [-0.27, 1.14, -0.16] as V,
  pan: [0.33, 0.92, 0.14] as V,
  panel: [-0.27, 0.8, 0.4] as V,
  drawer: [0.03, 0.46, 0.42] as V,
  shelf: [0.33, 1.24, -0.02] as V,
  salt: [0.34, 0.97, -0.1] as V,
};
/** From a basket to the hand on its handle. */
const HANDLE: V = [0, 0.06, 0.17];
const FRY_SEQ: Seq = [['read', 1.4], ['drawer', 2.0, 0.7], ['pour', 2.2, 0.7], ['lower', 1.2], ['set', 0.9], ['fry', 4.2], ['shake', 2.0], ['back', 3.4], ['beep', 1.0], ['lift', 1.2], ['drip', 1.6], ['tip', 1.5], ['salt', 2.0], ['scoop', 2.8], ['shelf', 1.2]];
const FRY: Script = {
  seq: FRY_SEQ,
  at: () => st(-0.1, FR.stand),
  key(k, u, c): Key {
    const inOil: V = [FR.wells[0], FR.oil - 0.02, FR.z];
    const above: V = [FR.wells[0], 1.04, FR.z];
    const held: V = [-0.06, 1.0, 0.28];
    const n = { oil: c.p('lower', 0.3, 0.9) - c.p('lift', 0, 0.6), cook: c.p('fry') * 0.55 + c.p('back') * 0.45, fill: c.p('pour', 0.2, 0.9) - c.p('tip', 0.3, 0.8), pan: c.p('tip', 0.3, 0.8) - c.p('scoop', 0.2, 0.9) * 0.7, cartons: 1 + count(c, 'shelf', 1), timer: c.p('fry') * 0.5 + c.p('shake') * 0.08 + c.p('back') * 0.42 };
    const hand = (b: V): V => add(b, HANDLE[0], HANDLE[1], HANDLE[2]);
    switch (k) {
      case 'read':
        return { nod: 0.2, l: c.bd(0.2, 0.55 * c.H, 0.12), n };
      case 'drawer': {
        // Crouched to the freezer drawer, and the bag of fries up out of it.
        const out = sm(u, 0.05, 0.3);
        const bag = lerpV([FR.drawer[0], 0.4, 0.34], [0.12, 0.98, 0.3], sm(u, 0.5, 1));
        return { r: u < 0.45 ? add(FR.drawer, 0, 0, 0.14 * out) : add(bag, 0.06, -0.04, 0), crouch: u < 0.7 ? 0.8 : 0, nod: 0.4, gr: 0.8, props: { bag: u > 0.42 ? bag : null }, n: { ...n, drawer: u < 0.8 ? out : 1 - sm(u, 0.8, 1) } };
      }
      case 'pour': {
        // The basket off its hook in the left, the bag tipped over it in the right.
        const b = lerpV(FR.hook, held, sm(u, 0, 0.2));
        const bag: V = [b[0] + 0.14, b[1] + 0.22, b[2] + 0.02];
        return { l: hand(b), r: add(bag, 0.06, -0.02, 0.02), gl: 0.85, gr: 0.8, nod: 0.3, props: { basket: b, bag: u > 0.9 ? null : bag }, n: { ...n, tipBag: sm(u, 0.2, 0.4) - sm(u, 0.85, 0.95) } };
      }
      case 'lower': {
        const b = lerpV(lerpV(held, above, sm(u, 0, 0.5)), inOil, sm(u, 0.5, 1));
        return { l: hand(b), gl: 0.85, nod: 0.35, lean: 0.1, props: { basket: b }, n };
      }
      case 'set':
        // The timer's button.
        return { l: add(FR.panel, 0, 0, 0.02 * Math.sin(u * PI)), tap: true, nod: 0.35, props: { basket: inOil }, n };
      case 'fry':
        return { nod: 0.3 + 0.04 * Math.sin(c.t * 2), r: c.bd(-0.2, 0.56 * c.H, 0.12), l: c.bd(0.2, 0.56 * c.H, 0.12), props: { basket: inOil }, n };
      case 'shake': {
        const up = Math.sin(u * PI);
        const b = add(lerpV(inOil, above, up), 0.012 * Math.sin(c.t * 30), 0.018 * Math.sin(c.t * 24) * up, 0);
        return { l: hand(b), gl: 0.85, nod: 0.35, lean: 0.1, props: { basket: b }, n };
      }
      case 'back':
        return { nod: 0.25, r: c.bd(-0.22, 0.55 * c.H, 0.08), props: { basket: inOil }, n };
      case 'beep':
        return { l: add(FR.panel, 0, 0, 0.01), tap: true, nod: 0.35, props: { basket: inOil }, n: { ...n, beep: 1 } };
      case 'lift': {
        const b = lerpV(inOil, above, sm(u, 0, 0.9));
        return { l: hand(b), gl: 0.85, nod: 0.3, props: { basket: b }, n };
      }
      case 'drip': {
        const b = add(above, 0.01 * Math.sin(c.t * 26), 0.014 * Math.abs(Math.sin(c.t * 13)), 0);
        return { l: hand(b), gl: 0.85, nod: 0.3, props: { basket: b }, n: { ...n, drip: 1 } };
      }
      case 'tip': {
        // Across to the pan, turned over, and back on its hook.
        const over: V = [FR.pan[0] - 0.13, 1.06, FR.pan[2] - 0.02];
        const b = u < 0.7 ? lerpV(above, over, sm(u, 0, 0.3)) : lerpV(over, FR.hook, sm(u, 0.7, 1));
        return { l: hand(b), gl: 0.85, nod: 0.3, props: { basket: b }, n: { ...n, tipB: sm(u, 0.25, 0.42) - sm(u, 0.62, 0.74) } };
      }
      case 'salt': {
        // The shaker off the back of the pan, shaken high over it.
        const s = lerpV(FR.salt, add(FR.pan, 0, 0.26 + 0.03 * Math.abs(Math.sin(c.t * 14)), 0), sm(u, 0, 0.2) * (1 - sm(u, 0.85, 1)));
        return { r: add(s, 0.02, 0.05, 0), gr: 0.9, nod: 0.3, props: { shaker: s }, n: { ...n, salting: sm(u, 0.2, 0.3) - sm(u, 0.8, 0.86) } };
      }
      case 'scoop': {
        // The carton in the left, the fry scoop in the right, two digs.
        const carton: V = [FR.pan[0] - 0.14, 1.0, FR.pan[2] + 0.1];
        const dig = Math.abs(Math.sin(u * PI * 2));
        const sc: V = [FR.pan[0] + 0.02 - 0.1 * dig, 0.95 + 0.08 * dig, FR.pan[2]];
        return { l: add(carton, -0.05, -0.03, 0.02), r: add(sc, 0.05, 0.02, 0.02), gl: 0.85, gr: 0.85, nod: 0.3, props: { carton, scoop: sc }, n: { ...n, cartonFull: sm(u, 0.2, 0.8) } };
      }
      case 'shelf': {
        const carton = lerpV([FR.pan[0] - 0.14, 1.0, FR.pan[2] + 0.1], FR.shelf, sm(u, 0.05, 0.8));
        return { l: add(carton, -0.05, -0.03, 0.03), gl: 0.85, nod: 0.05, props: { carton }, n: { ...n, cartonFull: 1 } };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 그릴 (grillTop, 1 × 1): a flat plate, a cold drawer below, tickets on a rail and a warm rack up the back.

export const GR = {
  stand: 0.62,
  plate: 0.885,
  slots: [[-0.26, 0.17], [0, 0.17], [0.26, 0.17]] as Array<[number, number]>,
  buns: [[-0.26, -0.1], [0, -0.1], [0.26, -0.1]] as Array<[number, number]>,
  drawer: [0, 0.5, 0.42] as V,
  hook: [0.42, 1.14, -0.2] as V,
  bottle: [-0.42, 0.97, -0.14] as V,
  rack: 1.24,
  rail: 1.56,
  bell: [-0.38, 1.04, 0.36] as V,
};
const slot = (i: number, up = 0.03): V => [GR.slots[i][0], GR.plate + up, GR.slots[i][1]];
const bun = (i: number, up = 0.03): V => [GR.buns[i][0], GR.plate + up, GR.buns[i][1]];
function grillKey(rush: boolean) {
  return (k: string, u: number, c: Ctx): Key => {
    const n = {
      rush: rush ? 1 : 0,
      tickets: rush ? 6 : 2,
      p: count(c, 'lay', 3) - (c.p('stack', 0.9, 1)) * 3,
      flip: c.p('flip') * 3,
      cheese: c.p('cheese') * 3 - c.p('stack', 0.9, 1) * 3,
      buns: c.p('buns') * 3 - c.p('slide', 0, 0.5) * 3,
      built: c.p('stack') * 3 - c.p('wrap') * 3,
      wrapped: c.p('wrap') * 3 - c.p('slide', 0, 0.8) * 3,
      rack: rush ? 2 + count(c, 'slide', 3) : 1 + count(c, 'slide', 3),
      smoke: c.p('lay', 0, 0.3) - c.p('stack', 0.5, 1),
      cook: c.p('sizzle') * 0.3 + c.p('press') * 0.3 + c.p('flip') * 0.4,
      drawer: 0,
      paper: rush ? 1 : 0,
    };
    const spat = (h: V): V => add(h, 0.02, -0.03, -0.1);
    const near = (i: number) => add(slot(i, 0.04), 0.02, 0.06, 0.12);
    switch (k) {
      case 'ticket':
        // The ticket off the rail, read at arm's length.
        return { l: [-0.2, GR.rail - 0.08 - 0.32 * sm(u, 0.1, 0.5), -0.05 + 0.3 * sm(u, 0.1, 0.5)], gl: 0.7, nod: 0.05, props: { slip: [-0.2, GR.rail - 0.1 - 0.32 * sm(u, 0.1, 0.5), -0.05 + 0.3 * sm(u, 0.1, 0.5)] }, n };
      case 'printer':
        // The printer spitting: a strip torn off, clipped on the rail.
        return { l: [-0.34 + 0.2 * sm(u, 0.3, 1), GR.rail - 0.18 + 0.08 * sm(u, 0.3, 1), -0.05], gl: 0.75, nod: 0, n: { ...n, tickets: 3 + Math.floor(u * 4) } };
      case 'bell':
        return { r: add(GR.bell, 0.02, 0.09 - 0.05 * Math.abs(Math.sin(c.t * 12)), 0), nod: 0.2, n: { ...n, ding: 1 } };
      case 'brow':
        // A forearm across the forehead.
        return { r: c.bd(-0.02 + 0.06 * Math.sin(c.t * 6), 0.93 * c.H, 0.12), nod: -0.12, gr: 0.2, lean: 0, n };
      case 'drawer': {
        const out = sm(u, 0.05, 0.3) * (1 - sm(u, 0.8, 1));
        const pk: V = lerpV([0, 0.4, 0.36], [-0.34, 0.98, 0.3], sm(u, 0.52, 1));
        return { r: u < 0.5 ? add(GR.drawer, 0, 0, 0.14 * out) : add(pk, 0.1, -0.02, 0.02), crouch: u < 0.75 ? 0.8 : 0, nod: 0.4, gr: 0.8, props: { patties: u > 0.48 ? pk : null }, n: { ...n, drawer: out } };
      }
      case 'lay': {
        // Off the sheet in the left, one by one along the plate.
        const pk: V = [-0.38, 0.97, 0.32];
        const i = Math.min(2, Math.floor(u * 3));
        const f = frac(u * 3);
        const h = lerpV(add(pk, 0.04, 0.04, 0), near(i), Math.sin(f * PI));
        return { l: add(pk, -0.03, -0.03, 0.03), r: h, gl: 0.85, gr: 0.75, nod: 0.4, lean: 0.08, props: { patties: pk, spat: spat(h) }, n: { ...n, p: Math.floor(u * 3.2) } };
      }
      case 'press': {
        // The spatula pressed flat on each.
        const i = Math.min(2, Math.floor(u * 3));
        const h = add(near(i), 0, 0.02 - 0.05 * Math.abs(Math.sin(u * PI * 3)), 0);
        return { r: h, l: add(h, -0.06, 0.12, -0.02), gr: 0.9, gl: 0.8, nod: 0.45, lean: 0.14, props: { spat: spat(h) }, n: { ...n, smoke: 1.2 } };
      }
      case 'sizzle':
        return { r: add(near(1), 0, 0.14, 0.1), nod: 0.35, gr: 0.85, props: { spat: spat(add(near(1), 0, 0.14, 0.1)) }, n: { ...n, smoke: 1 } };
      case 'flip': {
        const i = Math.min(2, Math.floor(u * 3));
        const f = frac(u * 3);
        const h = add(near(i), 0, 0.1 * Math.sin(f * PI), 0);
        return { r: h, gr: 0.9, nod: 0.42, lean: 0.1, props: { spat: spat(h) }, n: { ...n, smoke: 1 } };
      }
      case 'cheese': {
        const i = Math.min(2, Math.floor(u * 3));
        const h = add(slot(i, 0.1), 0.03, 0.06 + 0.04 * Math.cos(frac(u * 3) * PI * 2), 0.09);
        return { l: h, gl: 0.45, r: add(near(2), 0.12, 0.12, 0.08), gr: 0.85, nod: 0.4, props: { spat: spat(add(near(2), 0.12, 0.12, 0.08)) }, n };
      }
      case 'buns': {
        const i = Math.min(2, Math.floor(u * 3));
        const h = add(bun(i, 0.08), 0.03, 0.04 + 0.04 * Math.cos(frac(u * 3) * PI * 2), 0.12);
        return { l: h, gl: 0.55, nod: 0.38, lean: 0.14, n };
      }
      case 'stack': {
        // Each patty up on the spatula, over to its bun.
        const i = Math.min(2, Math.floor(u * 3));
        const f = frac(u * 3);
        const h = lerpV(near(i), add(bun(i, 0.12), 0.02, 0.06, 0.12), Math.sin(f * PI * 0.5));
        const carry: V = lerpV(slot(i, 0.05), bun(i, 0.08), Math.sin(f * PI * 0.5));
        return { r: h, gr: 0.9, nod: 0.4, lean: 0.14, props: { spat: spat(h), carried: f < 0.92 ? carry : null }, n: { ...n, carrying: i } };
      }
      case 'sauce': {
        // The bottle squeezed in a zigzag over the three.
        const b = lerpV(GR.bottle, add(bun(Math.min(2, Math.floor(u * 3))), 0.05 * Math.sin(c.t * 16), 0.16, 0), sm(u, 0, 0.14) * (1 - sm(u, 0.88, 1)));
        return { l: add(b, -0.01, 0.06, 0.03), gl: 0.95, nod: 0.4, lean: 0.12, props: { bottle: b }, n: { ...n, squeeze: sm(u, 0.14, 0.2) - sm(u, 0.84, 0.88) } };
      }
      case 'wrap': {
        // Bun on, up on a sheet of paper, folded with both hands.
        const i = Math.min(2, Math.floor(u * 3));
        const a = bun(i, 0.08);
        const f = Math.abs(Math.sin(frac(u * 3) * PI * 2));
        return { l: add(a, -0.08 + 0.05 * f, 0.03 + 0.03 * f, 0.09), r: add(a, 0.08 - 0.05 * f, 0.03 + 0.03 * f, 0.09), gl: 0.6, gr: 0.6, nod: 0.42, lean: 0.16, n };
      }
      case 'slide': {
        const i = Math.min(2, Math.floor(u * 3));
        const h = lerpV(bun(i, 0.07), [GR.buns[i][0], GR.rack + 0.05, -0.12], Math.sin(frac(u * 3) * PI * 0.5));
        return { r: add(h, 0.02, 0, 0.09), gr: 0.75, nod: 0.05, lean: 0.14, props: { carriedW: h }, n };
      }
      case 'scrape': {
        // The scraper down the plate, the grease into the trough.
        const h: V = [-0.28 + 0.56 * frac(u * 2), GR.plate + 0.05, 0.05 + 0.2 * Math.abs(Math.sin(u * PI * 8))];
        return { r: add(h, 0, 0.06, 0.07), l: add(h, -0.07, 0.1, 0.1), gr: 0.9, gl: 0.75, nod: 0.42, lean: 0.12, props: { scraper: add(h, 0, 0.01, -0.03) }, n };
      }
      default:
        return { n };
    }
  };
}
const GRILL_SEQ: Seq = [['ticket', 1.6], ['drawer', 2.2, 0.6], ['lay', 2.4], ['press', 1.6], ['sizzle', 2.2], ['flip', 2.1], ['cheese', 1.6], ['buns', 1.6], ['stack', 2.2], ['sauce', 1.7], ['wrap', 2.8], ['slide', 1.5], ['scrape', 2.4]];
const GRILL: Script = { seq: GRILL_SEQ, at: () => st(0, GR.stand), key: grillKey(false) };
const RUSH_SEQ: Seq = [['printer', 1.1, 0.3], ['lay', 1.2, 0.25], ['press', 0.8, 0.2], ['flip', 1.2, 0.25], ['bell', 0.5, 0.25], ['cheese', 0.8, 0.25], ['buns', 0.8, 0.25], ['stack', 1.2, 0.25], ['sauce', 0.9, 0.25], ['brow', 0.9, 0.3], ['wrap', 1.4, 0.25], ['slide', 0.9, 0.3]];
const RUSH: Script = { seq: RUSH_SEQ, at: (k) => st(k === 'slide' || k === 'bell' ? -0.08 : 0.04, GR.stand - 0.03), key: grillKey(true) };

// =============================================================================================
// 주문 카운터 (burgerCounter, 2 × 1): the crew on its front (+z), the customer on the far side.

export const BC = {
  stand: 0.58,
  top: 0.95,
  pos: [-0.5, 1.2, 0.08] as V,
  stack: [-0.1, 1.02, 0.28] as V,
  tray: [0.3, 0.97, 0.03] as V,
  far: [0.3, 0.97, -0.2] as V,
  printer: [-0.12, 1.02, -0.02] as V,
  terminal: [-0.42, 1.03, -0.3] as V,
  warm: [0.74, 1.06, 0.1] as V,
  cust: [0.1, -0.82] as [number, number],
  trainee: [-1.0, 0.66] as [number, number],
};
const TILL_SEQ: Seq = [['wait', 1.0], ['greet', 1.8], ['order', 3.4], ['pay', 2.6], ['tear', 1.3], ['tray', 1.5, 0.6], ['burger', 1.3], ['fries', 1.2], ['drink', 1.2], ['slide', 1.3, 0.6], ['thanks', 1.8], ['gone', 1.0]];
const TILL: Script = {
  seq: TILL_SEQ,
  at(k) {
    if (k === 'burger' || k === 'fries' || k === 'drink') return st(0.42, BC.stand);
    if (k === 'tray' || k === 'slide') return st(0.18, BC.stand);
    return st(-0.3, BC.stand);
  },
  key(k, u, c): Key {
    const onTray = { burger: c.p('burger', 0.4, 0.9), fries: c.p('fries', 0.4, 0.9), drink: c.p('drink', 0.4, 0.9) };
    const trayAt = lerpV(BC.tray, BC.far, c.p('slide', 0.1, 0.9));
    const n = { cust: c.p('greet', 0, 0.5) - c.p('gone', 0, 1), page: c.p('order') * 3, paid: c.p('pay', 0.6, 0.75), receipt: c.p('pay', 0.75, 1), trayOn: c.p('tray', 0.4, 0.9), ...onTray, took: c.p('thanks', 0.3, 0.8), cTap: 0, cBow: 0 };
    const props = { tray: c.p('tray', 0.4, 0.9) > 0 && c.p('thanks', 0.3, 0.8) < 1 ? trayAt : null };
    const fromWarm = (dx: number, dst: V, name: string, at: V): Key => {
      // From the warm shelf to the tray, by hand.
      const h = lerpV(add(BC.warm, dx, 0.02, 0.06), dst, sm(u, 0.42, 0.92));
      return { r: h, gr: 0.8, nod: 0.3, lean: 0.1, l: at, props: { ...props, [name]: u > 0.3 && u < 0.9 ? add(h, 0, -0.03, -0.04) : null }, n };
    };
    switch (k) {
      case 'wait':
        return { nod: 0.1, l: c.bd(0.22, 0.56 * c.H, 0.08), r: c.bd(-0.22, 0.56 * c.H, 0.08), n };
      case 'greet':
        return { nod: u < 0.5 ? 0.35 : 0.1, lean: u < 0.5 ? 0.14 : 0.03, n };
      case 'order': {
        // Tapped into the till a line at a time, a look up at the customer between.
        const up = Math.sin(u * PI * 4) > 0.7;
        return { r: add(BC.pos, 0.06 + 0.12 * frac(u * 5), -0.03 + 0.08 * frac(u * 3), 0.03), tap: !up, nod: up ? -0.02 : 0.25, n };
      }
      case 'pay':
        // Their card on the terminal, the dweller's hand on the printer waiting.
        return { r: add(BC.printer, 0.02, 0.06, 0.1), nod: 0.2, n: { ...n, cTap: Math.sin(u * PI) } };
      case 'tear':
        return { r: add(BC.printer, 0.02, 0.1, 0.05 + 0.04 * sm(u, 0.3, 0.8)), gr: 0.7, nod: 0.2, props: { slip: add(BC.printer, 0.02, 0.09, 0.04) }, n };
      case 'tray': {
        const t0 = lerpV(BC.stack, BC.tray, sm(u, 0.1, 0.9));
        return { l: add(t0, -0.2, 0.02, 0.1), r: add(t0, 0.2, 0.02, 0.1), gl: 0.75, gr: 0.75, nod: 0.3, props: { tray: u > 0.1 ? t0 : null }, n };
      }
      case 'burger':
        return fromWarm(-0.08, add(trayAt, 0, 0.06, 0.08), 'burgerH', add(trayAt, 0.18, 0.04, 0.1));
      case 'fries':
        return fromWarm(0.0, add(trayAt, 0.14, 0.08, 0.04), 'friesH', add(trayAt, 0.18, 0.04, 0.1));
      case 'drink':
        return fromWarm(0.1, add(trayAt, -0.14, 0.1, 0.0), 'drinkH', add(trayAt, 0.18, 0.04, 0.1));
      case 'slide': {
        const hh = lerpV(BC.tray, BC.far, sm(u, 0.1, 0.9));
        return { l: add(hh, -0.2, 0.02, 0.1), r: add(hh, 0.2, 0.02, 0.1), gl: 0.5, gr: 0.5, nod: 0.25, lean: 0.14, props, n };
      }
      case 'thanks':
        return { nod: 0.32 * Math.sin(u * PI), lean: 0.2 * Math.sin(u * PI), props, n: { ...n, cBow: Math.sin(u * PI) } };
      case 'gone':
        return { nod: 0.05, n };
      default:
        return { n };
    }
  },
};
// 신입 크루 교육하기: the till shown, the new crew member tries, stumbles, is put right, ticked off.
const TRAIN_SEQ: Seq = [['face', 1.8, 0.8], ['show', 3.2, 0.7], ['point', 2.0], ['try', 3.4], ['wrong', 1.2], ['fix', 2.4], ['again', 2.6], ['nod', 1.2], ['tick', 2.6]];
const TRAIN: Script = {
  seq: TRAIN_SEQ,
  at(k) {
    if (k === 'show' || k === 'point') return st(-0.25, BC.stand);
    if (k === 'face') return st(-0.35, BC.stand + 0.14, -PI / 2);
    return st(-0.08, BC.stand + 0.12, PI + 0.5);
  },
  key(k, u, c): Key {
    const board = (side = 0.14): V => c.bd(side, 0.62 * c.H, 0.26);
    const n = { train: 1, page: c.p('show') + c.p('try') + c.p('again'), tick: count(c, 'tick', 3), tTap: 0, tNod: 0, wrong: 0 };
    switch (k) {
      case 'face': {
        const b = board();
        return { l: add(b, 0.04, -0.03, 0), gl: 0.8, nod: 0.08, props: { board: b }, n };
      }
      case 'show':
        return { r: add(BC.pos, 0.08 + 0.1 * frac(u * 5), -0.04 + 0.06 * frac(u * 3), 0.03), tap: true, nod: 0.25, l: c.bd(0.2, 0.55 * c.H, 0.14), n: { ...n, tNod: 1 } };
      case 'point':
        return { r: add(BC.terminal, 0.05, 0.2, 0.12), nod: 0.18, gr: 0.15, n: { ...n, tNod: 1 } };
      case 'try': {
        const b = board();
        return { l: add(b, 0.04, -0.03, 0), gl: 0.8, nod: 0.28, props: { board: b }, n: { ...n, tTap: 1 } };
      }
      case 'wrong': {
        const b = board();
        return { l: add(b, 0.04, -0.03, 0), gl: 0.8, nod: 0.15, props: { board: b }, n: { ...n, wrong: 1, tTap: 0 } };
      }
      case 'fix': {
        // A finger on the right button for them.
        const b = board();
        return { l: add(b, 0.04, -0.03, 0), gl: 0.8, r: add(BC.pos, 0.14, 0.04 * Math.sin(c.t * 5), 0.03), tap: true, lean: 0.14, nod: 0.2, props: { board: b }, n: { ...n, tNod: 1 } };
      }
      case 'again': {
        const b = board();
        return { l: add(b, 0.04, -0.03, 0), gl: 0.8, nod: 0.22, props: { board: b }, n: { ...n, tTap: 1 } };
      }
      case 'nod': {
        const b = board();
        return { l: add(b, 0.04, -0.03, 0), gl: 0.8, nod: 0.25 * Math.abs(Math.sin(c.t * 5)), props: { board: b }, n };
      }
      case 'tick': {
        const b = board();
        return { l: add(b, 0.04, -0.03, 0), r: add(b, -0.02 + 0.06 * frac(u * 3), 0.03, 0.02 + 0.04 * Math.sin(u * PI * 3)), gl: 0.8, gr: 0.75, nod: 0.42, props: { board: b, pen: add(b, -0.02 + 0.06 * frac(u * 3), 0.07, 0.02) }, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 분리수거대 (trashStation, 1 × 1).

export const TS = {
  stand: 0.64,
  top: 1.0,
  funnel: [-0.32, 0.98, 0.2] as V,
  flaps: [[-0.27, 0.72], [0, 0.72], [0.27, 0.72]] as Array<[number, number]>,
  flapZ: 0.42,
  stack: [0.24, 1.0, -0.1] as V,
};
const SORT_SEQ: Seq = [['carry', 0.4, 1.4], ['down', 1.0], ['lid', 1.4], ['ice', 2.0], ['cup', 1.4], ['paper', 1.6], ['rubbish', 1.5], ['wipe', 2.2], ['stack', 1.3], ['fetch', 0.5, 1.2]];
const SORT: Script = {
  seq: SORT_SEQ,
  at(k) {
    return k === 'carry' || k === 'fetch' ? st(-1.0, 0.78, PI / 2) : st(0, TS.stand);
  },
  key(k, u, c): Key {
    const onTop: V = [-0.02, TS.top + 0.02, 0.12];
    const n = { cupOn: 1 - c.p('ice', 0, 0.1), wrapOn: 1 - c.p('paper', 0.4, 0.5), wasteOn: 1 - c.p('rubbish', 0.4, 0.5), stacked: 3 + count(c, 'stack', 1), flap0: 0, flap1: 0, flap2: 0, pour: 0 };
    const flap = (i: number, w: number) => add([TS.flaps[i][0], TS.flaps[i][1], TS.flapZ] as V, 0, 0.04, 0.03 + 0.04 * w);
    switch (k) {
      case 'carry':
      case 'fetch': {
        const tr = c.bd(0, 0.6 * c.H, 0.26);
        return { l: add(tr, 0, 0, -0.14), r: add(tr, 0, 0, 0.14), gl: 0.75, gr: 0.75, nod: 0.1, props: { tray: tr }, n: { ...n, cupOn: 1, wrapOn: 1, wasteOn: 1 } };
      }
      case 'down':
        return { l: add(onTop, -0.2, 0.02, 0.1), r: add(onTop, 0.2, 0.02, 0.1), gl: 0.7, gr: 0.7, nod: 0.3, props: { tray: onTop }, n };
      case 'lid':
        // The lid off the cup.
        return { l: add(onTop, 0.08, 0.14, 0.05), r: add(onTop, 0.08, 0.2, 0.05 + 0.03 * Math.sin(u * PI)), gl: 0.85, gr: 0.5, nod: 0.35, props: { tray: onTop }, n };
      case 'ice': {
        // The cup up and over the funnel, the ice rattling down.
        const cp = lerpV(add(onTop, 0.08, 0.08, 0.04), add(TS.funnel, 0.03, 0.2, 0), sm(u, 0, 0.3));
        return { l: add(cp, 0.04, 0, 0.02), gl: 0.9, nod: 0.35, props: { tray: onTop, cupH: cp }, n: { ...n, pour: sm(u, 0.3, 0.42) - sm(u, 0.85, 0.95), tipCup: sm(u, 0.25, 0.4) } };
      }
      case 'cup': {
        const h = lerpV(add(TS.funnel, 0.03, 0.2, 0), flap(1, 1), sm(u, 0, 0.55));
        return { r: h, l: add(onTop, -0.2, 0.02, 0.08), gl: 0.5, gr: 0.85, nod: 0.45, crouch: 0.15, lean: 0.14, props: { tray: onTop, cupH: u < 0.6 ? h : null }, n: { ...n, flap1: Math.sin(sm(u, 0.4, 0.95) * PI) } };
      }
      case 'paper': {
        const h = lerpV(add(onTop, -0.06, 0.06, 0.06), flap(0, 1), sm(u, 0.1, 0.6));
        return { l: h, gl: 0.85, r: add(onTop, 0.2, 0.02, 0.08), gr: 0.5, nod: 0.45, crouch: 0.15, lean: 0.14, props: { tray: onTop, wrapH: u > 0.1 && u < 0.65 ? h : null }, n: { ...n, flap0: Math.sin(sm(u, 0.45, 0.98) * PI) } };
      }
      case 'rubbish': {
        const h = lerpV(add(onTop, 0.08, 0.06, -0.04), flap(2, 1), sm(u, 0.1, 0.6));
        return { r: h, gr: 0.85, l: add(onTop, -0.2, 0.02, 0.08), gl: 0.5, nod: 0.45, crouch: 0.15, lean: 0.14, props: { tray: onTop, wasteH: u > 0.1 && u < 0.65 ? h : null }, n: { ...n, flap2: Math.sin(sm(u, 0.45, 0.98) * PI) } };
      }
      case 'wipe': {
        const h = scrub(add(onTop, 0, 0.05, 0.02), c.t, 0.12, 0.07);
        return { r: h, l: add(onTop, -0.22, 0.02, 0.1), gl: 0.55, gr: 0.8, nod: 0.4, props: { tray: onTop, cloth: add(h, 0, -0.03, -0.02) }, n };
      }
      case 'stack': {
        const tr = lerpV(onTop, TS.stack, sm(u, 0.1, 0.9));
        return { l: add(tr, -0.18, 0.02, 0.09), r: add(tr, 0.18, 0.02, 0.09), gl: 0.7, gr: 0.7, nod: 0.25, props: { tray: u < 0.92 ? tr : null }, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 키오스크 (ffKiosk, 1 × 1): the customer in front of the screen, the dweller beside them on its right.

export const KS = {
  screen: [0, 1.28, 0.1] as V,
  slot: [0.2, 0.93, 0.12] as V,
  print: [-0.14, 0.86, 0.14] as V,
  cust: [-0.2, 0.62] as [number, number],
  dweller: [0.42, 0.64] as [number, number],
};
const KIOSK_SEQ: Seq = [['come', 1.8, 0.8], ['ask', 1.8], ['dine', 1.8], ['menu', 2.4], ['custTap', 2.2], ['set', 2.0], ['cart', 1.8], ['card', 2.6], ['print', 2.0], ['give', 1.5], ['bow', 1.6], ['away', 0.9]];
const KIOSK: Script = {
  seq: KIOSK_SEQ,
  at: (k) => (k === 'come' || k === 'away' ? st(0.72, 1.12, PI + 0.6) : st(KS.dweller[0], KS.dweller[1], PI - 0.3)),
  key(k, u, c): Key {
    const n = { cust: c.p('come', 0.1, 0.8) - c.p('away', 0, 1), page: c.p('ask', 0.5, 1) + c.p('dine', 0.5, 1) + c.p('menu', 0.7, 1) + c.p('custTap', 0.7, 1) + c.p('set', 0.7, 1) + c.p('cart', 0.7, 1) + c.p('card', 0.8, 1), cTap: 0, cLook: 1, cCard: 0, cBow: 0, slip: c.p('print', 0.2, 0.9), took: c.p('give', 0.7, 1) };
    const on = (x: number, y: number): V => add(KS.screen, x, y, 0.05);
    switch (k) {
      case 'come':
      case 'away':
        return { nod: 0.05, n };
      case 'ask':
        return { nod: 0.22, lean: 0.12, l: c.bd(0.18, 0.58 * c.H, 0.14), gl: 0.3, n: { ...n, cLook: -1 } };
      case 'dine':
        return { r: on(-0.04, -0.06 + 0.01 * Math.sin(c.t * 5)), tap: true, nod: 0.05, lean: 0.12, n };
      case 'menu':
        return { r: on(0.03 - 0.1 * Math.sin(u * PI), 0.1 + 0.04 * Math.sin(u * 8)), gr: 0.1, nod: 0.02, lean: 0.14, n };
      case 'custTap':
        // Their turn: a hand held back, a nod.
        return { l: c.bd(0.16, 0.6 * c.H, 0.15), nod: 0.2 * Math.abs(Math.sin(c.t * 3)), n: { ...n, cTap: 1 } };
      case 'set':
        return { r: on(0.06, -0.02 + 0.01 * Math.sin(c.t * 6)), tap: true, lean: 0.12, nod: 0.03, n };
      case 'cart':
        return { r: on(0.08, -0.18), tap: u > 0.4 && u < 0.7, gr: 0.1, lean: 0.14, nod: 0.05, n };
      case 'card':
        return { l: add(KS.slot, -0.1, 0.1, 0.22), gl: 0.15, nod: 0.25, lean: 0.14, n: { ...n, cCard: Math.sin(u * PI) } };
      case 'print':
        return { nod: 0.22, r: add(KS.print, 0.14, 0.04, 0.12), lean: 0.15, crouch: 0.15, props: { slip: add(KS.print, 0, -0.03 * (1 - u), 0.06) }, n };
      case 'give': {
        const h = lerpV(add(KS.print, 0.12, 0.05, 0.1), [KS.cust[0] + 0.22, 1.03, KS.cust[1] + 0.05], sm(u, 0.05, 0.75));
        return { r: h, gr: 0.75, nod: 0.12, props: { slip: add(h, -0.03, 0.02, 0) }, n };
      }
      case 'bow':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.18 * Math.sin(u * PI), n: { ...n, cBow: Math.sin(u * PI) } };
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 픽업 카운터 (ffPickupCounter, 2 × 1): the crew on its front, the customer beyond, the number board up top.

export const PK = {
  stand: 0.6,
  top: 0.95,
  bump: [-0.62, 1.1, 0.14] as V,
  bags: [[0.12, 0.08], [0.42, 0.04], [0.72, 0.08]] as Array<[number, number]>,
  bag: [-0.14, 0.96, 0.12] as V,
  out: [-0.2, 1.0, -0.14] as V,
  cust: [-0.2, -0.82] as [number, number],
};
const CALL_SEQ: Seq = [['fold', 2.0], ['fill', 1.8], ['staple', 1.3], ['bump', 1.6, 0.7], ['call', 2.2], ['come', 1.2], ['check', 2.2], ['hand', 1.6], ['thanks', 1.6], ['gone', 0.9]];
const CALL: Script = {
  seq: CALL_SEQ,
  at: (k) => (k === 'bump' ? st(-0.48, PK.stand) : k === 'fold' || k === 'fill' || k === 'staple' ? st(0.02, PK.stand) : st(-0.2, PK.stand)),
  key(k, u, c): Key {
    const n = { cust: c.p('come', 0, 0.9) - c.p('gone'), bumped: c.p('bump', 0.4, 0.6), fold: c.p('fold', 0, 0.8), filled: c.p('fill', 0.2, 0.9), shut: c.p('staple', 0.2, 0.6), took: c.p('thanks', 0, 0.3), cBow: 0, cReceipt: 0, cReach: 0, called: 0 };
    const bagP = (at: V) => ({ bagH: at });
    switch (k) {
      case 'fold':
        return { l: add(PK.bag, -0.1, 0.05 + 0.06 * Math.sin(u * PI * 2), 0.07), r: add(PK.bag, 0.1, 0.05 + 0.06 * Math.sin(u * PI * 2), 0.07), gl: 0.6, gr: 0.6, nod: 0.38, props: bagP(PK.bag), n };
      case 'fill': {
        // A burger, then fries, off the warm row and into the bag.
        const i = u < 0.5 ? 0 : 1;
        const from: V = [PK.bags[i][0], 1.0, PK.bags[i][1]];
        const f = frac(u * 2);
        return { r: lerpV(from, add(PK.bag, 0, 0.12, 0.03), Math.sin(f * PI * 0.5)), l: add(PK.bag, -0.1, 0.1, 0.05), gr: 0.75, gl: 0.6, nod: 0.36, props: bagP(PK.bag), n };
      }
      case 'staple': {
        // The top folded over, the receipt stapled on.
        const beat = Math.abs(Math.sin(u * PI * 3));
        return { r: add(PK.bag, 0.02, 0.26 - 0.03 * beat, 0.05), l: add(PK.bag, -0.06, 0.25, 0.05), gr: 0.95, gl: 0.65, nod: 0.3, props: { ...bagP(PK.bag), stapler: add(PK.bag, 0.02, 0.26 - 0.03 * beat, 0.03) }, n };
      }
      case 'bump':
        // Pressed on the bump screen: the number goes across to 완료.
        return { l: add(PK.bump, 0.05 + 0.06 * u, -0.02 + 0.03 * Math.sin(u * 8), 0.04), tap: u < 0.55, nod: 0.25, props: bagP(PK.bag), n };
      case 'call':
        // A hand cupped at the mouth, facing the dining room.
        return { l: c.bd(0.1, 0.88 * c.H, 0.14), gl: 0.2, nod: -0.18 + 0.05 * Math.sin(c.t * 6), lean: -0.02, props: { bagH: lerpV(PK.bag, add(PK.bag, -0.06, 0, -0.16), sm(u, 0, 0.3)) }, n: { ...n, called: 1 } };
      case 'come':
        return { nod: 0.05, props: bagP(add(PK.bag, -0.06, 0, -0.16)), n };
      case 'check': {
        // The receipt the customer holds up, compared with the sticker.
        return { r: add(PK.bag, -0.08, 0.2, -0.08), gr: 0.4, nod: 0.3 - 0.3 * Math.abs(Math.sin(u * PI * 2)), lean: 0.12, props: bagP(add(PK.bag, -0.06, 0, -0.16)), n: { ...n, cReceipt: Math.sin(u * PI) } };
      }
      case 'hand': {
        const b = lerpV(add(PK.bag, -0.06, 0, -0.16), PK.out, sm(u, 0.1, 0.9));
        return { l: add(b, -0.05, 0.28, 0.02), r: add(b, 0.05, 0.28, 0.02), gl: 0.85, gr: 0.85, lean: 0.2, nod: 0.2, props: { bagH: b }, n: { ...n, cReach: sm(u, 0.6, 1) } };
      }
      case 'thanks':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.18 * Math.sin(u * PI), n: { ...n, cBow: Math.sin(u * PI) } };
      case 'gone':
        return { n };
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 음료 디스펜서 (ffDrinkTower, 2 × 1): cups left, ice in the middle, the levers right.

export const DT = {
  stand: 0.64,
  deck: 0.92,
  cups: [-0.72, 1.32, 0.2] as V,
  ice: [-0.28, 1.14, 0.14] as V,
  nozzles: [0.04, 0.2, 0.36, 0.52, 0.68] as const,
  fillY: 0.98,
  z: 0.18,
  lids: [-0.5, 1.0, 0.26] as V,
  carrier: [0.86, 0.96, 0.24] as V,
};
const POUR_SEQ: Seq = [['cup', 1.3, 0.6], ['ice', 1.8, 0.6], ['lever', 2.4], ['foam', 1.6], ['top', 1.5], ['lid', 1.6, 0.6], ['straw', 1.1], ['set', 1.3, 0.6], ['cup2', 1.3, 0.6], ['ice2', 1.4, 0.6], ['lever2', 2.4], ['lid2', 1.4, 0.6], ['set2', 1.3, 0.6], ['wipe', 2.2]];
const POUR: Script = {
  seq: POUR_SEQ,
  at(k) {
    if (k === 'cup' || k === 'cup2' || k === 'lid' || k === 'lid2' || k === 'ice' || k === 'ice2' || k === 'straw') return st(-0.42, DT.stand);
    if (k === 'set' || k === 'set2') return st(0.56, DT.stand);
    return st(0.26, DT.stand);
  },
  key(k, u, c): Key {
    const n = { done: count(c, 'set', 1) + count(c, 'set2', 1), ice: 0, stream: 0, level: 0, foam: 0, lidded: 0, which: 1, drip: c.p('wipe') };
    const under: V = [DT.nozzles[1], DT.fillY, DT.z];
    const nearIce: V = add(DT.ice, 0, -0.14, 0.08);
    const hold = (cp: V, extra: Key): Key => ({ l: add(cp, -0.05, 0, 0.04), gl: 0.9, nod: 0.25, props: { cup: cp, ...extra.props }, ...extra, n: { ...n, ...extra.n } });
    switch (k) {
      case 'cup':
      case 'cup2': {
        // Drawn down out of the sleeve.
        const cp = lerpV(DT.cups, add(DT.cups, 0.05, -0.28, 0.06), sm(u, 0.2, 0.9));
        return hold(cp, { n: { which: k === 'cup' ? 1 : 2 } });
      }
      case 'ice':
      case 'ice2':
        return hold(nearIce, { n: { ice: u, which: k === 'ice' ? 1 : 2, iceOn: Math.sin(u * PI) } });
      case 'lever':
      case 'lever2':
        return hold(under, { r: [DT.nozzles[1], DT.fillY + 0.28, DT.z + 0.1], gr: 0.2, lean: 0.08, n: { ice: 1, stream: sm(u, 0.05, 0.1) - sm(u, 0.93, 1), level: u * 0.82, foam: u, which: k === 'lever' ? 1 : 2 } });
      case 'foam':
        return hold(under, { nod: 0.3, n: { ice: 1, level: 0.82, foam: 1 - u * 0.8 } });
      case 'top':
        return hold(under, { r: [DT.nozzles[1], DT.fillY + 0.28, DT.z + 0.1], gr: 0.2, n: { ice: 1, stream: Math.sin(u * PI), level: 0.82 + u * 0.13, foam: 0.3 } });
      case 'lid':
      case 'lid2': {
        const cp: V = add(DT.lids, 0.15, 0, -0.02);
        return hold(cp, { r: add(cp, -0.02, 0.14 - 0.05 * sm(u, 0.4, 0.7), 0.03), gr: 0.5, nod: 0.35, n: { ice: 1, level: 0.95, lidded: sm(u, 0.5, 0.7), which: k === 'lid' ? 1 : 2 } });
      }
      case 'straw': {
        const cp: V = add(DT.lids, 0.15, 0, -0.02);
        return hold(cp, { r: add(cp, 0, 0.2, 0.02), gr: 0.7, nod: 0.3, n: { ice: 1, level: 0.95, lidded: 1, straw: 1 } });
      }
      case 'set':
      case 'set2': {
        const slot0 = add(DT.carrier, k === 'set' ? -0.04 : 0.05, 0.02, 0);
        const cp = lerpV(add(DT.carrier, -0.25, 0.08, 0.04), slot0, sm(u, 0.05, 0.8));
        return hold(cp, { n: { ice: 1, level: 0.95, lidded: 1 } });
      }
      case 'wipe': {
        const h = scrub([DT.nozzles[2], DT.deck + 0.04, DT.z + 0.04], c.t, 0.24, 0.03);
        return { r: h, gr: 0.75, nod: 0.38, lean: 0.12, props: { cloth: add(h, 0, -0.02, -0.02) }, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 드라이브스루 창 (ffDriveWindow, 2 × 1): the window in its back, the till and the bags at its right.

export const DV = {
  stand: 0.46,
  sill: 0.98,
  winX: -0.28,
  pos: [0.74, 1.18, 0.1] as V,
  term: [0.42, 1.02, 0.08] as V,
  hanger: [0.74, 1.5, -0.02] as V,
  bag: [0.62, 1.0, 0.14] as V,
  out: [-0.28, 1.02, -0.06] as V,
};
const DRIVE_SEQ: Seq = [['set', 1.6, 0.7], ['talk', 3.6], ['key', 2.0, 0.8], ['draw', 1.6], ['open', 1.3], ['greet', 1.3], ['card', 1.6], ['tap', 1.5], ['give', 1.2, 0.7], ['bag', 1.2, 0.7], ['pass', 1.6], ['drink', 1.6], ['close', 1.3], ['off', 1.5]];
const DRIVE: Script = {
  seq: DRIVE_SEQ,
  at: (k) => (k === 'set' || k === 'talk' || k === 'key' || k === 'bag' ? st(0.5, DV.stand) : st(DV.winX + 0.1, DV.stand)),
  key(k, u, c): Key {
    const n = { headset: c.p('set', 0.5, 0.8), car: c.p('draw', 0, 0.9) - c.p('off', 0.2, 1), open: c.p('open', 0.1, 0.9) - c.p('close', 0.1, 0.9), arm: 0, armCard: 0, armBag: 0, page: c.p('talk') + c.p('key', 0, 0.9) + c.p('tap', 0.5, 0.7), speak: 0, hasBag: c.p('pass', 0.8, 1) };
    const atHead = (side = 0.1): V => c.bd(side, 0.92 * c.H, 0.04);
    const window0 = (x: number, y = DV.sill + 0.3): V => [DV.winX + x, y, -0.1];
    switch (k) {
      case 'set': {
        // The headset off its hook, over the head.
        const h = lerpV(DV.hanger, atHead(-0.12), sm(u, 0.2, 0.75));
        return { r: h, gr: 0.75, nod: -0.05, props: { hs: u < 0.8 ? add(h, 0, 0.02, -0.03) : null }, n };
      }
      case 'talk':
        // A finger on the earpiece, the order listened to and read back.
        return { l: atHead(0.14), gl: 0.2, r: add(DV.pos, -0.1 + 0.1 * frac(u * 3), -0.05, 0.03), tap: true, nod: 0.08, n: { ...n, speak: 0.5 + 0.5 * Math.sin(c.t * 8) } };
      case 'key':
        return { r: add(DV.pos, 0.05 + 0.12 * frac(u * 5), -0.03 + 0.05 * frac(u * 3), 0.03), tap: true, nod: 0.25, n };
      case 'draw':
        return { nod: 0.05, n };
      case 'open':
        return { l: window0(-0.3, DV.sill + 0.28), gl: 0.8, nod: 0.02, lean: 0.14, n };
      case 'greet':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.14, l: c.bd(0.2, 0.56 * c.H, 0.15), n };
      case 'card': {
        // The driver's hand comes out, the card taken.
        const e = sm(u, 0, 0.6);
        const out = DV.out;
        return { l: add(out, 0.02, 0.05, 0.12 * e + 0.08), gl: 0.5, lean: 0.2, nod: 0.05, n: { ...n, arm: e, armCard: u < 0.8 ? 1 : 0 }, props: u > 0.75 ? { cardH: add(out, 0.02, 0.05, 0.14) } : {} };
      }
      case 'tap': {
        const h = lerpV([DV.out[0], 1.1, -0.02], add(DV.term, 0, 0.04, 0.08), Math.sin(sm(u, 0, 0.5) * PI * 0.5));
        return { r: h, gr: 0.6, nod: 0.25, props: { cardH: add(h, 0, 0, -0.02) }, n };
      }
      case 'give': {
        const h = lerpV(add(DV.term, 0, 0.04, 0.08), add(DV.out, 0, 0.02, 0.14), sm(u, 0.05, 0.85));
        return { r: h, gr: 0.6, lean: 0.2, nod: 0.05, props: { cardH: u < 0.85 ? h : null }, n: { ...n, arm: 1, armCard: u > 0.85 ? 1 : 0 } };
      }
      case 'bag':
        return { r: add(DV.bag, 0, 0.27, 0.02), gr: 0.85, lean: 0.1, nod: 0.25, props: { bagH: DV.bag }, n: { ...n, arm: 0.2 } };
      case 'pass': {
        const b = lerpV(DV.bag, add(DV.out, 0, -0.04, 0.04), sm(u, 0.05, 0.85));
        return { r: add(b, 0, 0.27, 0.02), gr: 0.85, lean: 0.22, nod: 0.05, props: { bagH: u < 0.9 ? b : null }, n: { ...n, arm: sm(u, 0.45, 0.8), armBag: u > 0.9 ? 1 : 0 } };
      }
      case 'drink': {
        const d = add(DV.out, 0.08, 0.0, 0.08);
        return { r: add(d, 0, 0.03, 0.05), gr: 0.85, lean: 0.2, nod: 0.05, props: { cupH: u < 0.8 ? d : null }, n: { ...n, arm: 1 - sm(u, 0.7, 1) } };
      }
      case 'close':
        return { l: window0(-0.3, DV.sill + 0.28), gl: 0.8, nod: 0.05, lean: 0.14, n };
      case 'off':
        return { nod: 0.2 * Math.abs(Math.sin(c.t * 4)), r: c.bd(-0.1, 0.72 * c.H, 0.3), gr: 0.15, n };
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 라이더 선반 (ffRiderShelf, 2 × 1): tablets on top, numbered cubbies, a rider who comes in on +x.

export const RS = {
  stand: 0.66,
  tablet: [-0.56, 1.3, 0.1] as V,
  bench: [-0.2, 0.92, 0.26] as V,
  stickers: [0.0, 0.94, 0.3] as V,
  cubby: [0.3, 1.16, 0.08] as V,
  rider: [1.3, 0.9] as [number, number],
  meet: [0.86, 1.0, 0.62] as V,
};
const RIDER_SEQ: Seq = [['ping', 1.3], ['accept', 1.7, 0.7], ['bag', 2.2], ['seal', 1.6], ['sticker', 1.5], ['shelve', 1.5, 0.6], ['wait', 1.2], ['come', 1.3], ['phone', 2.2, 0.7], ['fetch', 1.3, 0.7], ['give', 1.4], ['salute', 1.3], ['gone', 0.8]];
const RIDER: Script = {
  seq: RIDER_SEQ,
  at(k) {
    if (k === 'bag' || k === 'seal' || k === 'sticker') return st(-0.16, RS.stand);
    if (k === 'ping' || k === 'accept') return st(-0.42, RS.stand);
    if (k === 'give' || k === 'salute' || k === 'gone') return st(0.42, RS.stand + 0.02, PI / 2 + 0.2);
    return st(0.26, RS.stand);
  },
  key(k, u, c): Key {
    const n = { ring: 0, tablet: c.p('accept', 0.4, 0.6), rider: c.p('come', 0, 0.9) - c.p('gone'), shelved: c.p('shelve', 0.7, 0.9) - c.p('fetch', 0.4, 0.6), sealed: c.p('seal', 0.5, 0.8), sticker: c.p('sticker', 0.5, 0.9), rPhone: 0, took: c.p('give', 0.8, 1) - c.p('gone', 0.6, 1), rWave: 0 };
    const b = RS.bench;
    switch (k) {
      case 'ping':
        return { nod: 0.15, n: { ...n, ring: 1 } };
      case 'accept':
        return { l: add(RS.tablet, 0.06 + 0.1 * u, -0.05 + 0.05 * Math.sin(u * 6), 0.04), tap: true, nod: 0.05, n };
      case 'bag': {
        const h = lerpV(add(b, 0.12, 0.05, 0), add(b, 0.05, 0.18, 0.01), Math.abs(Math.sin(u * PI * 2)));
        return { r: h, l: add(b, -0.08, 0.12, 0.03), gr: 0.75, gl: 0.6, nod: 0.38, props: { bagH: b }, n };
      }
      case 'seal': {
        const t2 = Math.abs(Math.sin(u * PI * 2));
        return { l: add(b, -0.08 * t2, 0.26, 0.04), r: add(b, 0.08 * t2, 0.26, 0.04), gl: 0.55, gr: 0.55, nod: 0.36, props: { bagH: b }, n };
      }
      case 'sticker': {
        const h = lerpV(add(RS.stickers, 0, 0.03, 0.03), add(b, -0.01, 0.15, 0.1), sm(u, 0.15, 0.7));
        return { r: h, gr: 0.3, l: add(b, -0.09, 0.2, 0.03), gl: 0.55, nod: 0.36, props: { bagH: b }, n };
      }
      case 'shelve': {
        const p = lerpV(b, RS.cubby, sm(u, 0.05, 0.85));
        return { l: add(p, -0.05, 0.27, 0.02), r: add(p, 0.05, 0.27, 0.02), gl: 0.85, gr: 0.85, nod: 0.05, props: { bagH: u < 0.92 ? p : null }, n };
      }
      case 'wait':
        return { nod: 0.05, l: c.bd(0.2, 0.56 * c.H, 0.08), r: c.bd(-0.2, 0.56 * c.H, 0.08), n };
      case 'come':
        return { nod: 0.05, n };
      case 'phone':
        // Their phone held up, the number read off.
        return { nod: -0.02 + 0.08 * Math.sin(c.t * 3), r: c.bd(-0.1, 0.72 * c.H, 0.28), gr: 0.1, n: { ...n, rPhone: Math.sin(u * PI) } };
      case 'fetch': {
        const p = RS.cubby;
        return { r: add(p, 0, 0.27, 0.05), gr: 0.85, nod: 0.05, lean: 0.12, props: { bagH: u > 0.45 ? add(p, 0, 0, 0.12 * sm(u, 0.45, 1)) : null }, n };
      }
      case 'give': {
        const p = lerpV(add(RS.cubby, 0, 0, 0.12), add(RS.meet, 0, -0.1, 0), sm(u, 0.02, 0.8));
        return { r: add(p, 0, 0.27, 0.02), gr: 0.85, nod: 0.05, props: { bagH: u < 0.85 ? p : null }, n };
      }
      case 'salute':
        return { nod: 0.28 * Math.sin(u * PI), lean: 0.14 * Math.sin(u * PI), n: { ...n, rWave: Math.sin(u * PI) } };
      case 'gone':
        return { n };
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 식탁 (ffTrayTable, 2 × 1): wiped from its front.

export const TT = {
  stand: 0.68,
  top: 0.74,
  tray: [-0.28, 0.76, 0.12] as V,
  spray: [0.68, 0.76, 0.3] as V,
};
const WIPE_SEQ: Seq = [['gather', 2.4], ['lift', 1.2, 0.7], ['down', 0.9, 0.7], ['spray', 1.5, 0.5], ['wipeL', 2.2, 0.6], ['wipeR', 2.2, 0.6], ['crumb', 1.4], ['straight', 1.4], ['set', 1.1]];
const WIPE: Script = {
  seq: WIPE_SEQ,
  at(k) {
    if (k === 'wipeR' || k === 'crumb' || k === 'spray') return st(0.36, TT.stand);
    if (k === 'lift') return st(-0.28, TT.stand);
    if (k === 'down') return st(-1.05, TT.stand + 0.12, PI / 2);
    return st(-0.3, TT.stand);
  },
  key(k, u, c): Key {
    const on = c.p('lift', 0.2, 0.3) < 1;
    const n = { gathered: c.p('gather'), wet: c.p('spray', 0.1, 0.9) - c.p('wipeR', 0.4, 1), wiped: c.p('wipeL') * 0.5 + c.p('wipeR') * 0.5, reset: c.p('set', 0.1, 0.9), onTable: on ? 1 : 0, chairs: c.p('straight', 0, 0.9) };
    const trayAt = on ? TT.tray : null;
    switch (k) {
      case 'gather': {
        // Everything brought onto the tray, crumpled.
        const h: V = [-0.56 + 0.34 * Math.abs(Math.sin(u * PI * 2)), TT.top + 0.06, 0.12 + 0.1 * Math.sin(u * 7)];
        return { l: h, gl: 0.75, r: add(TT.tray, 0.08, 0.06, 0.08), gr: 0.55, lean: 0.2, nod: 0.42, crouch: 0.15, props: { tray: trayAt }, n };
      }
      case 'lift': {
        const t = lerpV(TT.tray, c.bd(0, 0.58 * c.H, 0.28), sm(u, 0.15, 0.8));
        return { l: add(t, -0.17, 0, 0), r: add(t, 0.17, 0, 0), gl: 0.75, gr: 0.75, lean: 0.18 * (1 - u), nod: 0.2, props: { tray: t }, n: { ...n, onTable: 1 } };
      }
      case 'down': {
        const t = c.bd(0, 0.58 * c.H, 0.28);
        return { l: add(t, 0, 0, -0.14), r: add(t, 0, 0, 0.14), gl: 0.75, gr: 0.75, nod: 0.1, props: { tray: u < 0.6 ? t : null }, n };
      }
      case 'spray': {
        const b = lerpV(TT.spray, [0.2, 0.98, 0.3], sm(u, 0, 0.2));
        return { r: add(b, 0.02, 0, 0.04), gr: 0.9, nod: 0.32, props: { bottle: b }, n: { ...n, puff: sm(u, 0.2, 0.3) - sm(u, 0.8, 0.9) } };
      }
      case 'wipeL': {
        const h = scrub([-0.3, TT.top + 0.04, 0.2], c.t, 0.28, 0.12);
        return { l: h, gl: 0.7, r: c.bd(-0.16, 0.6 * c.H, 0.16), gr: 0.8, nod: 0.45, lean: 0.24, crouch: 0.25, props: { cloth: add(h, 0, -0.02, 0) }, n };
      }
      case 'wipeR': {
        const h = scrub([0.36, TT.top + 0.04, 0.2], c.t, 0.28, 0.12);
        return { r: h, gr: 0.7, nod: 0.45, lean: 0.24, crouch: 0.25, props: { cloth: add(h, 0, -0.02, 0) }, n };
      }
      case 'crumb': {
        // Swept along to the edge and caught in the other hand.
        const h: V = [0.72 - 0.6 * u, TT.top + 0.04, 0.3];
        return { r: h, gr: 0.5, l: [0.02, TT.top - 0.02, 0.4], gl: 0.15, nod: 0.42, lean: 0.2, crouch: 0.2, props: { cloth: add(h, 0, -0.02, 0) }, n };
      }
      case 'straight':
        // A chair pushed in across the table.
        return { nod: 0.25, lean: 0.2, r: [-0.1, TT.top + 0.06, -0.02 + 0.02 * Math.sin(u * PI)], gr: 0.3, n };
      case 'set':
        // The clean mat and the number stand put back.
        return { r: [-0.28, TT.top + 0.05, 0.08], gr: 0.55, nod: 0.35, lean: 0.14, n };
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 청소 도구함 (ffMopBucket, 1 × 1): the sign set out, the mop wrung and walked across the floor.

export const MB = {
  sign: [0.32, 0, 0.2] as V,
  signOut: [-0.65, 0, 1.2] as V,
  bucket: [-0.08, 0.32, 0.08] as V,
  lever: [0.22, 0.7, 0.14] as V,
  /** Where the mop is drawn along: side to side, working away from the bucket. */
  sweep: [[-0.6, 0.85], [0.2, 0.92], [-0.8, 1.2], [0.15, 1.3], [-0.9, 1.55], [0.1, 1.62]] as Array<[number, number]>,
};
const MOP_SEQ: Seq = [['sign', 1.6, 0.9], ['set', 1.2, 0.9], ['grab', 1.0], ['dunk', 1.4], ['wring', 2.0], ['m0', 1.7, 0.6], ['m1', 1.7, 0.6], ['m2', 1.7, 0.6], ['m3', 1.7, 0.6], ['m4', 1.7, 0.6], ['m5', 1.7, 0.9], ['rinse', 1.4], ['fetch', 1.2, 0.9], ['stow', 1.2]];
const MOP: Script = {
  seq: MOP_SEQ,
  at(k) {
    if (k === 'set' || k === 'fetch') return st(-0.42, 0.98, PI + 0.5);
    if (k === 'sign' || k === 'stow') return st(0.2, 0.68);
    const m = /^m(\d)$/.exec(k);
    if (m) {
      const p = MB.sweep[+m[1]];
      return st(p[0] + 0.34, p[1] + 0.1, -PI / 2);
    }
    return st(-0.06, 0.66);
  },
  key(k, u, c): Key {
    const n = { wet: c.p('m0') * 0.2 + c.p('m1') * 0.2 + c.p('m2') * 0.2 + c.p('m3') * 0.2 + c.p('m4') * 0.1 + c.p('m5') * 0.1, signOut: c.p('set', 0.2, 0.8) - c.p('fetch', 0.2, 0.8), wring: 0, inBucket: 1, moved: 0 };
    const mopFrom = (head: V, up: number): Key => ({ r: add(head, 0.08, up, 0.02), l: add(head, 0.1, up + 0.25, 0.02), gl: 0.9, gr: 0.9, nod: 0.3, lean: 0.14, props: { mop: head, mopTop: add(head, 0.12, up + 0.45, 0.02) }, n: { ...n, inBucket: 0 } });
    switch (k) {
      case 'sign': {
        const h = lerpV(add(MB.sign, 0, 0.6, 0.02), c.bd(-0.2, 0.5 * c.H, 0.16), sm(u, 0.4, 1));
        return { r: h, gr: 0.75, crouch: u < 0.45 ? 0.5 : 0, nod: 0.3, props: { signH: u > 0.35 ? add(h, 0, -0.5, 0) : null }, n };
      }
      case 'set': {
        const pl = MB.signOut;
        const h = c.bd(-0.2, 0.4 * c.H, 0.3);
        return { r: lerpV(h, add(pl, 0, 0.6, 0), sm(u, 0.1, 0.8)), gr: 0.7, crouch: 0.4, nod: 0.3, props: { signH: u < 0.75 ? add(lerpV(h, add(pl, 0, 0.6, 0), sm(u, 0.1, 0.8)), 0, -0.6, 0) : null }, n };
      }
      case 'grab':
        return { r: add(MB.bucket, 0.02, 0.78, 0), l: add(MB.bucket, 0.02, 1.0, 0), gl: 0.9, gr: 0.9, nod: 0.2, n };
      case 'dunk': {
        const d = -0.06 * Math.abs(Math.sin(u * PI * 3));
        return { r: add(MB.bucket, 0.02, 0.78 + d, 0), l: add(MB.bucket, 0.02, 1.0 + d, 0), gl: 0.9, gr: 0.9, nod: 0.3, n: { ...n, moved: d } };
      }
      case 'wring': {
        // Down on the wringer's lever, twice.
        const d = Math.abs(Math.sin(u * PI * 2));
        return { r: add(MB.lever, 0, -0.14 * d, 0.02), l: add(MB.bucket, 0.02, 1.0, 0), gl: 0.9, gr: 0.95, nod: 0.35, lean: 0.14, crouch: 0.15, n: { ...n, wring: d } };
      }
      case 'rinse':
        return { r: add(MB.bucket, 0.02, 0.78, 0), l: add(MB.bucket, 0.02, 1.0, 0), gl: 0.9, gr: 0.9, nod: 0.3, n };
      case 'fetch': {
        const pl = MB.signOut;
        return { r: add(pl, 0, 0.6, 0), gr: 0.7, crouch: 0.4, nod: 0.3, n };
      }
      case 'stow':
        return { nod: 0.05, r: add(MB.sign, 0, 0.6, 0.02), gr: 0.5, crouch: 0.5, n };
      default: {
        // The mop swung in a figure of eight, the dweller walking along it backwards.
        const m = /^m(\d)$/.exec(k);
        if (m) {
          const p = MB.sweep[+m[1]];
          const head: V = [p[0] + 0.24 * Math.sin(c.t * 2.6), 0.03, p[1] + 0.13 * Math.sin(c.t * 5.2)];
          return mopFrom(head, 0.72);
        }
        return { n };
      }
    }
  },
};

const SCRIPTS: Record<FfMotion, Script> = {
  ffFry: FRY, ffGrill: GRILL, ffRush: RUSH, ffTill: TILL, ffTrain: TRAIN, ffSort: SORT, ffKiosk: KIOSK, ffCall: CALL, ffPour: POUR, ffDrive: DRIVE, ffRider: RIDER, ffWipe: WIPE, ffMop: MOP,
};
