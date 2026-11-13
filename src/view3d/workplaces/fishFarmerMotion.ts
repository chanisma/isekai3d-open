import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 양식장 (2026-11-01, the workplace pipeline, at the user's request), at the made-up 물빛양식장. Each
 * motion is a round of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by
 * the same clock (fishFarmer.ts), so the fish rise under the feed and the level climbs in the hopper.
 *
 * - yaFeed (양식 수조): a scoop from the bucket thrown across the water a handful at a time, the fish coming up
 *   where it lands; the sheet ticked.
 * - yaWater (양식 수조): the hand meter's probe in the water, read; a sample tube, drops in it, held to the card.
 * - yaOxygen (양식 수조): the lamp going and the fish at the surface: the reading checked, the cylinder's valve
 *   opened, the air stone lowered in; the water boils, the number climbs, the fish go down again.
 * - yaWatch (양식 수조): the technician points one out; netted, lifted, its gills looked at while she nods.
 * - yaShell (전복 가두리): a shelter board lifted out dripping, looked over, one dead shell picked off, back in; kelp
 *   laid on the water, the board brushed.
 * - yaSensors (수질 센서 단말): oxygen, temperature and salinity paged through; the probe lifted, wiped, put back.
 * - yaTune (수질 센서 단말): the feeder's three slots set on the screen, a test run, saved.
 * - yaHarvest (출하 작업대): the carrier of fish onto the table, each laid in the box, weighed, the lid taped.
 * - yaBuyer (출하 작업대): a buyer at the table's end, a sample shown and the sums done on a tablet, a handshake.
 * - yaPens (가두리 해상 통로): out along the floating walkway, the net's edge hauled and looked at, a dead one dipped
 *   out, the pen fed, on to the far pen's mooring line, and back.
 * - yaFill (사료 창고): a sack from the pallet on the shoulder to the hopper, slit and poured, the auger run.
 * - yaPump (펌프실): the gauges, a hand on the casing, the valve wheel, the strainer pulled and rinsed, oil, the panel.
 * - yaFry (치어 부화 선반): a tray drawn out, a sample counted in a cup, the weak thinned, the drip set.
 * - yaGrade (선별대): one fish at a time down the sloping bars into the tub of its size; one measured; the tally.
 * - yaPack (포장·얼음 작업대): a box, ice, the bagged fish, more ice, the lid, tape, a label, on to the pallet.
 * - yaVisit (체험 수조): crouched at the low tub, the leaves skimmed, the shells set right, topped up, the sign wiped.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x.
 */
export type YaMotion = 'yaFeed' | 'yaWater' | 'yaOxygen' | 'yaWatch' | 'yaShell' | 'yaSensors' | 'yaTune' | 'yaHarvest' | 'yaBuyer' | 'yaPens' | 'yaFill' | 'yaPump' | 'yaFry' | 'yaGrade' | 'yaPack' | 'yaVisit';
export const YA_MOTIONS = new Set<string>(['yaFeed', 'yaWater', 'yaOxygen', 'yaWatch', 'yaShell', 'yaSensors', 'yaTune', 'yaHarvest', 'yaBuyer', 'yaPens', 'yaFill', 'yaPump', 'yaFry', 'yaGrade', 'yaPack', 'yaVisit']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const yaPhase = (p: THREE.Vector3) => frac(p.x * 0.391 + p.z * 0.673);
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
  floor?: number;
}
const st = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
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
export interface YaNow {
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
export function yaNow(m: YaMotion, t: number, ph: number, H = 1.6): YaNow {
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
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function yaPose(m: YaMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = yaNow(m, t, yaPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
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
/** A hand writing: small quick strokes across a line. */
const writing = (a: V, t: number, u: number, w = 0.12): V => [a[0] - w / 2 + w * ((u * 3) % 1) + 0.006 * Math.sin(t * 19), a[1] + 0.008 * Math.cos(t * 23), a[2]];
/** Hands hanging easily at the sides, a little forward. */
const easy = (c: Ctx): Partial<Key> => ({ l: c.bd(0.2, 0.56 * c.H, 0.1), r: c.bd(-0.2, 0.56 * c.H, 0.1) });

// =============================================================================================
// 양식 수조 (fishTank, 2 × 2): a round concrete tank on the piece's middle, walked round on its front half.

export const TK = {
  R: 0.94,
  r: 0.84,
  rim: 0.86,
  water: 0.72,
  floor: 0.06,
  /** How far from the middle a dweller stands. */
  Z: 1.2,
  bucket: [0.87, 0.62, 0.76] as V,
  sheet: [-0.33, 0.92, 0.9] as V,
  kit: [0.33, 0.92, 0.9] as V,
  cyl: [-0.95, 0, 0.46] as V,
  valve: [-0.95, 1.04, 0.46] as V,
  stoneHome: [-0.8, 0.82, 0.62] as V,
  stone: [-0.42, 0.5, 0.56] as V,
  netHome: [0.8, 0.9, 0.5] as V,
  /** The technician, showing a junior. */
  tech: [-1.34, 0.36] as [number, number],
};
const ring = (a: number): St => st(TK.Z * Math.sin(a), TK.Z * Math.cos(a), a + PI);
/** Where a hand net's held, its head given. */
export const netGrip = (head: V): V => add(head, 0.1, 0.42, 0.26);

const FEED_SEQ: Seq = [['scoop', 1.5, 0.5], ['t0', 1.5, 0.15], ['t1', 1.5, 0.15], ['t2', 1.5, 0.6], ['refill', 1.3, 0.6], ['t3', 1.5, 0.15], ['t4', 1.5, 0.7], ['mark', 2.4, 0.9]];
const LAND: Array<[number, number]> = [[0.26, 0.28], [-0.1, 0.42], [0.36, -0.1], [-0.36, 0.22], [-0.1, -0.1]];
const FEED: Script = {
  seq: FEED_SEQ,
  at(k) {
    if (k === 'mark') return ring(-0.28);
    if (k === 't3' || k === 't4') return ring(-0.1);
    return ring(0.48);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { rise: c.p('t0', 0.2, 0.7) * (1 - c.p('mark', 0.1, 0.9)), ticks: c.p('mark', 0.2, 0.9), toss: 0, tx: 0, tz: 0 };
    const held = c.bd(-0.18, 0.66 * c.H, 0.26);
    const m = /^t(\d)$/.exec(k);
    if (m) {
      // Back and across: the arm comes through and the feed leaves the scoop.
      const i = +m[1];
      const out = c.bd(-0.1, 0.8 * c.H, 0.5);
      const h = u < 0.28 ? lerpV(held, add(held, -0.04, 0.04, 0.02), u / 0.28) : lerpV(add(held, -0.04, 0.04, 0.02), out, sm(u, 0.28, 0.46));
      const back = u > 0.6 ? lerpV(out, held, sm(u, 0.6, 1)) : h;
      return { r: back, gr: 0.85, l: c.bd(0.22, 0.6 * c.H, 0.14), gl: 0.3, nod: 0.3, lean: 0.1 + 0.08 * sm(u, 0.28, 0.46), props: { scoop: back }, n: { ...n, toss: sm(u, 0.36, 0.95), tx: LAND[i][0], tz: LAND[i][1] } };
    }
    if (k === 'scoop' || k === 'refill') {
      // Down into the bucket and full.
      const dip = Math.sin(u * PI);
      const h = lerpV(held, add(TK.bucket, 0, 0.1, 0), dip);
      return { r: h, gr: 0.9, l: add(TK.bucket, -0.16, 0.14, 0.02), gl: 0.7, crouch: 0.15 * dip, nod: 0.46, lean: 0.14, props: { scoop: h }, n };
    }
    const pen = writing(add(TK.sheet, 0, 0, 0.03), c.t, u, 0.1);
    return { r: pen, gr: 0.8, l: add(TK.sheet, -0.1, -0.02, 0.03), gl: 0.6, nod: 0.46, lean: 0.12, props: { pen: add(pen, 0, 0.04, 0.01), scoop: TK.bucket }, n };
  },
};
const WATER_SEQ: Seq = [['take', 1.2, 0.5], ['probe', 3.6, 0.4], ['read', 2.2, 0.4], ['dip', 1.8, 0.4], ['drops', 2.6, 0.3], ['hold', 2.2, 0.8], ['note', 2.4, 0.9]];
const WATER: Script = {
  seq: WATER_SEQ,
  at: (k) => (k === 'note' ? ring(-0.28) : ring(0.14)),
  key(k, u, c): Key {
    const n = { read: c.p('probe', 0.25, 0.85), tint: c.p('drops', 0.3, 0.9), ticks: c.p('note', 0.2, 0.9) };
    const meter = c.bd(0.14, 0.66 * c.H, 0.26);
    const water = c.bd(-0.1, TK.water - 0.1, 0.56);
    switch (k) {
      case 'take': {
        const h = lerpV(TK.kit, meter, sm(u, 0.1, 0.9));
        return { l: h, gl: 0.85, r: add(h, -0.08, 0, 0), gr: 0.5, nod: 0.4, props: { meter: h }, n };
      }
      case 'probe': {
        // Cable paid out, the probe let down into the water and moved about a little.
        const down = sm(u, 0.05, 0.3);
        const h = lerpV(add(meter, -0.2, 0, 0.1), add(water, 0.015 * Math.sin(c.t * 3), 0.12, 0), down);
        return { l: meter, gl: 0.85, r: h, gr: 0.85, nod: 0.36, lean: 0.14, props: { meter, probe: h }, n };
      }
      case 'read':
        return { l: add(meter, 0, 0.04, 0.02), gl: 0.85, r: add(meter, -0.09, 0.02, 0.02), gr: 0.25, tap: true, nod: 0.3, props: { meter: add(meter, 0, 0.04, 0.02), probe: add(water, 0, 0.12, 0) }, n };
      case 'dip': {
        const h = lerpV(meter, water, Math.sin(u * PI));
        return { r: h, gr: 0.85, l: c.bd(0.22, TK.rim, 0.34), gl: 0.8, nod: 0.44, lean: 0.18, props: { tube: h }, n };
      }
      case 'drops': {
        const tube = c.bd(0.08, 0.84 * c.H, 0.3);
        return { l: tube, gl: 0.85, r: add(tube, -0.02, 0.1 + 0.01 * Math.sin(c.t * 8), 0), gr: 0.7, nod: 0.02, props: { tube, dropper: add(tube, -0.02, 0.09, 0) }, n };
      }
      case 'hold': {
        const tube = c.bd(0.06, 0.92 * c.H, 0.3);
        return { l: tube, gl: 0.85, r: add(tube, -0.14, -0.02, 0), gr: 0.5, nod: -0.06, props: { tube, card: add(tube, -0.14, -0.02, 0) }, n };
      }
      default: {
        const pen = writing(add(TK.sheet, 0, 0, 0.03), c.t, u, 0.1);
        return { r: pen, gr: 0.8, l: add(TK.sheet, -0.1, -0.02, 0.03), gl: 0.6, nod: 0.46, lean: 0.12, props: { pen: add(pen, 0, 0.04, 0.01) }, n };
      }
    }
  },
};
const OX_SEQ: Seq = [['rush', 0.8, 0.4], ['read', 1.6, 0.6], ['valve', 2.0, 0.5], ['hose', 1.4, 0.5], ['lower', 2.0, 0.4], ['watch', 6.0, 0.7], ['pat', 1.6, 0.9]];
const OXYGEN: Script = {
  seq: OX_SEQ,
  at(k) {
    if (k === 'valve' || k === 'hose') return st(-0.86, 0.96, PI + 0.1);
    if (k === 'lower' || k === 'watch') return ring(-0.5);
    return ring(0.05);
  },
  key(k, u, c): Key {
    const climb = c.p('watch', 0.05, 0.85);
    const n = { alarm: 1 - c.p('watch', 0.6, 0.75), gas: c.p('valve', 0.5, 0.8), low: 1 - climb, do: 2.8 + 5 * climb, boil: c.p('lower', 0.7, 1), in: c.p('lower', 0.5, 0.8) };
    switch (k) {
      case 'rush':
        return { l: c.bd(0.22, TK.rim + 0.02, 0.28), r: c.bd(-0.22, TK.rim + 0.02, 0.28), gl: 0.8, gr: 0.8, lean: 0.2, nod: 0.4, n };
      case 'read':
        return { l: c.bd(0.22, TK.rim + 0.02, 0.28), gl: 0.8, r: c.bd(-0.14, 0.74 * c.H, 0.4), gr: 0.2, palms: 0.5, nod: -0.04, n };
      case 'valve': {
        // The valve wheel, hand over hand.
        const a = c.t * 5;
        return { r: add(TK.valve, 0.05 * Math.cos(a), 0.06, 0.05 * Math.sin(a) + 0.02), gr: 0.9, l: add(TK.valve, 0.02, -0.22, 0.08), gl: 0.85, nod: 0.3, lean: 0.1, n };
      }
      case 'hose': {
        const h = lerpV(TK.stoneHome, c.bd(-0.1, 0.62 * c.H, 0.3), sm(u, 0.1, 0.9));
        return { r: h, gr: 0.9, nod: 0.3, lean: 0.1, props: { stone: h }, n };
      }
      case 'lower': {
        const h = lerpV(c.bd(-0.1, 0.62 * c.H, 0.3), add(TK.stone, 0, 0.38, 0), sm(u, 0.05, 0.8));
        const s = lerpV(c.bd(-0.1, 0.62 * c.H, 0.3), TK.stone, sm(u, 0.05, 0.85));
        return { r: h, gr: 0.9, l: c.bd(0.22, TK.rim + 0.02, 0.28), gl: 0.8, nod: 0.46, lean: 0.2, props: { stone: s }, n };
      }
      case 'watch':
        return { l: c.bd(0.22, TK.rim + 0.02, 0.28), r: c.bd(-0.22, TK.rim + 0.02, 0.28), gl: 0.8, gr: 0.8, lean: 0.14, nod: 0.34 + 0.06 * Math.sin(c.t), props: { stone: TK.stone }, n };
      default:
        return { ...easy(c), nod: 0.2 - 0.3 * Math.sin(u * PI), props: { stone: TK.stone }, n };
    }
  },
};
const WATCH_SEQ: Seq = [['look', 2.6, 0.5], ['point', 2.8, 0.5], ['net', 1.4, 0.4], ['chase', 2.2, 0.3], ['lift', 1.4, 0.3], ['gill', 3.6, 0.4], ['back', 1.6, 0.7], ['nod', 1.6, 0.8]];
const WATCH: Script = {
  seq: WATCH_SEQ,
  at: (k) => (k === 'net' || k === 'back' ? ring(0.42) : ring(-0.12)),
  key(k, u, c): Key {
    const n = { tPoint: 0, tNod: 0, caught: c.p('chase', 0.9, 0.95) - c.p('back', 0.6, 0.8), slow: 1 };
    const rim = { l: c.bd(0.22, TK.rim + 0.02, 0.28), gl: 0.8 };
    const water = add(c.bd(-0.1, TK.water - 0.08, 0.55), 0, 0, 0);
    const held = c.bd(0.02, 0.76 * c.H, 0.32);
    switch (k) {
      case 'look':
        return { ...rim, r: c.bd(-0.22, TK.rim + 0.02, 0.28), gr: 0.8, nod: 0.42, lean: 0.14, n: { ...n, tPoint: 0.4 * Math.sin(u * PI) } };
      case 'point':
        return { ...rim, r: c.bd(-0.14, 0.72 * c.H, 0.46), gr: 0.15, nod: 0.38, lean: 0.14, n: { ...n, tPoint: 1 } };
      case 'net': {
        const head = lerpV(TK.netHome, water, sm(u, 0.1, 0.95));
        return { ...rim, r: netGrip(head), gr: 0.9, nod: 0.36, props: { net: head }, n };
      }
      case 'chase': {
        const a = u * PI * 2;
        const head = add(water, 0.2 * Math.cos(a), 0.02, 0.1 * Math.sin(a));
        return { ...rim, r: netGrip(head), gr: 0.9, nod: 0.46, lean: 0.18, props: { net: head }, n };
      }
      case 'lift': {
        const head = lerpV(water, add(held, 0, -0.06, 0), sm(u, 0.05, 0.9));
        return { r: netGrip(head), gr: 0.9, l: add(head, 0, 0.08, 0.02), gl: 0.5, nod: 0.3, props: { net: head }, n };
      }
      case 'gill':
        return { r: netGrip(add(held, 0, -0.06, 0)), gr: 0.9, l: add(held, -0.06 + 0.03 * Math.sin(c.t * 2), 0.0, 0.02), gl: 0.8, nod: 0.3, props: { net: add(held, 0, -0.06, 0) }, n: { ...n, tNod: Math.abs(Math.sin(c.t * 1.6)), tPoint: 0.5 } };
      case 'back': {
        const head = lerpV(add(held, 0, -0.06, 0), TK.netHome, sm(u, 0.05, 0.95));
        return { r: netGrip(head), gr: 0.9, nod: 0.3, props: { net: head }, n };
      }
      default:
        return { ...easy(c), nod: 0.15 - 0.25 * Math.sin(u * PI * 2), n: { ...n, tNod: 1 } };
    }
  },
};

// =============================================================================================
// 전복 가두리 (shellLine, 2 × 1): a raised concrete trough of running water, black shelter boards standing in it.

export const SH = {
  stand: 0.6,
  rim: 0.76,
  water: 0.66,
  boards: [-0.62, -0.21, 0.21, 0.62] as const,
  boardZ: 0.06,
  boardY: 0.56,
  bin: [0.84, 0.3, 0.42] as V,
  kelp: [-0.82, 0.8, 0.34] as V,
  brush: [0.52, 0.8, 0.36] as V,
};
const SHELL_SEQ: Seq = [['lift', 1.6, 0.3], ['look', 2.6, 0.3], ['pick', 1.8, 0.3], ['bin', 1.2, 0.3], ['brush', 2.2, 0.3], ['back', 1.4, 0.6], ['kelp', 3.2, 0.8]];
const SHELL: Script = {
  seq: SHELL_SEQ,
  at: (k) => (k === 'kelp' ? st(-0.3, SH.stand) : k === 'bin' ? st(0.5, SH.stand) : st(0.22, SH.stand)),
  key(k, u, c): Key {
    const n = { dead: 1 - c.p('pick', 0.4, 0.5), kelp: c.p('kelp', 0.2, 0.95), drip: 0 };
    const home: V = [SH.boards[2], SH.boardY, SH.boardZ];
    const held = c.bd(0, 0.62 * c.H, 0.3);
    const both = (b: V): Partial<Key> => ({ l: add(b, -0.16, 0.22, 0.02), r: add(b, 0.16, 0.22, 0.02), gl: 0.9, gr: 0.9 });
    switch (k) {
      case 'lift': {
        const b = lerpV(home, add(held, 0, -0.16, 0), sm(u, 0.15, 0.95));
        return { ...both(b), nod: 0.42, lean: 0.14, props: { board: b }, n: { ...n, drip: 1 } };
      }
      case 'look':
        // Turned to the light, each side looked at.
        return { ...both(add(held, 0, -0.16, 0)), nod: 0.3, props: { board: add(held, 0, -0.16, 0) }, n: { ...n, turn: Math.sin(u * PI * 2), drip: 1 - u } };
      case 'pick': {
        const b = add(held, 0, -0.16, 0);
        const r = lerpV(c.bd(-0.2, 0.56 * c.H, 0.2), add(b, 0.08, 0.16, 0.05), sm(u, 0.05, 0.4));
        const twist = u > 0.4 ? 0.012 * Math.sin(c.t * 14) : 0;
        return { l: add(b, -0.16, 0.22, 0.02), gl: 0.9, r: add(r, twist, 0, 0), gr: 0.9, nod: 0.36, props: { board: b, dead2: u > 0.45 ? add(r, 0, -0.01, 0) : null }, n };
      }
      case 'bin': {
        const b = add(held, 0, -0.16, 0);
        const r = lerpV(add(b, 0.08, 0.16, 0.05), add(SH.bin, 0, 0.16, 0), sm(u, 0.05, 0.75));
        return { l: add(b, -0.16, 0.22, 0.02), gl: 0.9, r, gr: u > 0.8 ? 0.3 : 0.9, nod: 0.42, props: { board: b, dead2: u < 0.8 ? r : null }, n };
      }
      case 'brush': {
        const b = add(held, 0, -0.16, 0);
        const h = add(b, 0.11 * Math.sin(c.t * 8), 0.02 * Math.cos(c.t * 4), 0.05);
        return { l: add(b, -0.16, 0.22, 0.02), gl: 0.9, r: h, gr: 0.9, nod: 0.36, props: { board: b, brush: h }, n };
      }
      case 'back': {
        const b = lerpV(add(held, 0, -0.16, 0), home, sm(u, 0.05, 0.9));
        return { ...both(b), nod: 0.42, lean: 0.14, props: { board: b }, n };
      }
      default: {
        // Strips of kelp drawn off the bundle and laid along the water.
        const x = -0.56 + 0.6 * ((u * 3) % 1);
        const h: V = [x, SH.water + 0.1, 0.12];
        return { r: h, gr: 0.8, l: add(SH.kelp, 0.1, 0.04, 0), gl: 0.8, nod: 0.46, lean: 0.14, props: { strip: add(h, 0, -0.06, 0) }, n };
      }
    }
  },
};

// =============================================================================================
// 수질 센서 단말 (waterSensor, 1 × 1): a weatherproof terminal on its post, a flow cell with the probes at its foot.

export const WS = {
  stand: 0.68,
  screen: [0, 1.22, 0.1] as V,
  cell: [0.3, 0.72, 0.22] as V,
  rag: [-0.3, 0.74, 0.24] as V,
};
const SENS_SEQ: Seq = [['wake', 1.2, 0.4], ['p0', 2.6, 0.3], ['p1', 2.6, 0.3], ['p2', 2.6, 0.5], ['probe', 1.4, 0.4], ['wipe', 2.0, 0.4], ['put', 1.2, 0.5], ['ok', 1.4, 0.8]];
const tapAt = (c: Ctx, x: number, y: number): V => add(WS.screen, x + 0.004 * Math.sin(c.t * 9), y, 0.05);
const SENSORS: Script = {
  seq: SENS_SEQ,
  at: () => st(0, WS.stand),
  key(k, u, c): Key {
    const n: Record<string, number> = { on: 1, mode: 0, page: 0, probe: 0 };
    const m = /^p(\d)$/.exec(k);
    if (m) {
      n.page = +m[1];
      return { r: tapAt(c, -0.09 + 0.09 * +m[1], -0.11), gr: 0.2, tap: u < 0.2, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.14, lean: 0.03, n };
    }
    const held = c.bd(-0.06, 0.66 * c.H, 0.28);
    switch (k) {
      case 'wake':
        return { r: tapAt(c, 0, 0), gr: 0.2, tap: true, nod: 0.16, n };
      case 'probe': {
        const h = lerpV(WS.cell, held, sm(u, 0.1, 0.9));
        return { r: h, gr: 0.85, nod: 0.3, lean: 0.06, props: { probe: h }, n: { ...n, page: 2, probe: 1 } };
      }
      case 'wipe':
        return { r: held, gr: 0.85, l: add(held, 0.02 + 0.03 * Math.sin(c.t * 10), -0.03, 0.02), gl: 0.8, nod: 0.36, props: { probe: held, rag: add(held, 0.02 + 0.03 * Math.sin(c.t * 10), -0.04, 0.02) }, n: { ...n, page: 2, probe: 1 } };
      case 'put': {
        const h = lerpV(held, WS.cell, sm(u, 0.1, 0.9));
        return { r: h, gr: 0.85, nod: 0.3, lean: 0.06, props: { probe: h }, n: { ...n, page: 2, probe: 1 } };
      }
      default:
        return { r: tapAt(c, 0.09, -0.11), gr: 0.2, tap: true, nod: 0.12, n: { ...n, page: 3 } };
    }
  },
};
const TUNE_SEQ: Seq = [['open', 1.4, 0.3], ['a', 2.6, 0.3], ['b', 2.6, 0.3], ['c', 2.6, 0.4], ['try', 3.0, 0.4], ['save', 1.4, 0.8]];
const TUNE: Script = {
  seq: TUNE_SEQ,
  at: () => st(0, WS.stand),
  key(k, _u, c): Key {
    const n: Record<string, number> = { on: 1, mode: 1, va: 0.4 + 0.35 * c.p('a', 0.1, 0.9), vb: 0.7 - 0.3 * c.p('b', 0.1, 0.9), vc: 0.3 + 0.4 * c.p('c', 0.1, 0.9), active: k === 'a' ? 0 : k === 'b' ? 1 : k === 'c' ? 2 : -1, run: k === 'try' ? 1 : 0, saved: c.p('save', 0.4, 0.5) };
    const l = c.bd(0.2, 0.56 * c.H, 0.1);
    if (k === 'a' || k === 'b' || k === 'c') {
      const row = k === 'a' ? 0 : k === 'b' ? 1 : 2;
      const v = k === 'a' ? n.va : k === 'b' ? n.vb : n.vc;
      return { r: tapAt(c, -0.1 + 0.2 * v, 0.05 - row * 0.05), gr: 0.2, tap: true, l, nod: 0.14, lean: 0.03, n };
    }
    if (k === 'try') return { ...easy(c), nod: 0.04, n };
    return { r: tapAt(c, 0.08, -0.11), gr: 0.2, tap: true, l, nod: 0.14, n };
  },
};

// =============================================================================================
// 출하 작업대 (harvestNet, 2 × 1): a steel table, a carrier of fish on its left, the box on a scale on its right.

export const HV = {
  stand: 0.6,
  top: 0.8,
  carrier: [-0.46, 0.84, 0.08] as V,
  floor: [-0.72, 0.14, 0.32] as V,
  box: [0.42, 0.92, 0.08] as V,
  tape: [0.02, 0.84, 0.28] as V,
  /** The hand on the other side, and the buyer come to the table's end. */
  helper: [-0.66, -0.86] as [number, number],
  buyer: [1.5, 0.3] as [number, number],
  shake: [1.08, 1.04, 0.42] as V,
};
const HV_SEQ: Seq = [['haul', 1.8, 0.5], ['f0', 1.5, 0.15], ['f1', 1.5, 0.15], ['f2', 1.5, 0.15], ['f3', 1.5, 0.3], ['weigh', 2.2, 0.3], ['lid', 1.2, 0.3], ['tape', 1.8, 0.8]];
const HARVEST: Script = {
  seq: HV_SEQ,
  at(k) {
    if (k === 'haul') return st(-0.52, HV.stand);
    if (k[0] === 'f') return st(-0.04, HV.stand);
    return st(0.42, HV.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { helper: 1, boxN: 0, kilos: 0, lid: c.p('lid', 0.3, 0.9), taped: c.p('tape', 0.1, 0.9), left: 0, hNod: 0 };
    let done = 0;
    for (let i = 0; i < 4; i++) done += c.p(`f${i}`, 0.72, 0.8);
    n.boxN = done;
    n.left = 4 - done;
    const m = /^f(\d)$/.exec(k);
    if (m) {
      const held = c.bd(0, HV.top + 0.22, 0.34);
      const f = u < 0.4 ? lerpV(HV.carrier, held, sm(u, 0.1, 0.38)) : lerpV(held, add(HV.box, 0, 0.1, 0), sm(u, 0.42, 0.74));
      return { r: add(f, 0.1, 0.02, 0.02), gr: 0.85, l: add(f, -0.1, 0.02, 0.02), gl: 0.85, nod: 0.46, lean: 0.14, props: { fish: u < 0.76 ? f : null }, n };
    }
    switch (k) {
      case 'haul': {
        // The carrier up from the floor onto the table, the helper on the other handle.
        const p = lerpV(HV.floor, HV.carrier, sm(u, 0.2, 0.9));
        return { l: add(p, -0.22, 0.14, 0.02), r: add(p, 0.22, 0.14, 0.02), gl: 0.95, gr: 0.95, crouch: 0.7 * (1 - sm(u, 0.2, 0.8)), nod: 0.44, props: { carrier: p }, n };
      }
      case 'weigh':
        return { r: add(HV.box, 0.3, -0.06, 0.2), gr: 0.25, tap: true, l: add(HV.box, -0.2, 0.0, 0.14), gl: 0.5, nod: 0.42, n: { ...n, kilos: sm(u, 0.1, 0.5) } };
      case 'lid': {
        const lid = lerpV(add(HV.box, 0.28, 0.1, 0.2), add(HV.box, 0, 0.2, 0), sm(u, 0.1, 0.85));
        return { l: add(lid, -0.2, 0.02, 0.1), r: add(lid, 0.2, 0.02, 0.1), gl: 0.8, gr: 0.8, nod: 0.42, props: { lid }, n: { ...n, kilos: 1 } };
      }
      default: {
        // The tape drawn across, torn off.
        const x = -0.26 + 0.52 * sm(u, 0, 0.8);
        const h = add(HV.box, x, 0.24, 0.06);
        return { r: h, gr: 0.85, l: add(HV.box, -0.22, 0.22, 0.1), gl: 0.7, nod: 0.42, props: { tape: h, lid: add(HV.box, 0, 0.2, 0) }, n: { ...n, kilos: 1, hNod: sm(u, 0.7, 1) } };
      }
    }
  },
};
const BUYER_SEQ: Seq = [['greet', 1.6, 0.6], ['open', 1.8, 0.4], ['show', 3.2, 0.4], ['talk', 3.0, 0.4], ['tablet', 3.2, 0.5], ['shake', 2.0, 0.8]];
const BUYER: Script = {
  seq: BUYER_SEQ,
  at(k) {
    if (k === 'shake' || k === 'greet') return st(0.62, 0.62, PI / 2);
    return st(0.42, HV.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { buyer: 1, bNod: 0, deal: c.p('tablet', 0.7, 0.9), bHand: 0, sum: c.p('tablet', 0.05, 0.7) };
    const shown = add(HV.box, 0.02, 0.3, 0.16);
    switch (k) {
      case 'greet':
        return { ...easy(c), nod: 0.3 * Math.sin(u * PI), lean: 0.1 * Math.sin(u * PI), n: { ...n, bNod: Math.sin(u * PI) } };
      case 'open': {
        const lid = lerpV(add(HV.box, 0, 0.2, 0), add(HV.box, -0.42, 0.04, 0.12), sm(u, 0.1, 0.9));
        return { l: add(lid, -0.2, 0.02, 0.1), r: add(lid, 0.2, 0.02, 0.1), gl: 0.8, gr: 0.8, nod: 0.42, props: { lid }, n };
      }
      case 'show':
        // A fish held up on both palms and turned for them to see.
        return { l: add(shown, -0.12, 0, 0.02), r: add(shown, 0.12, 0, 0.02), gl: 0.5, gr: 0.5, palms: 0.8, nod: 0.26, props: { fish: shown, lid: add(HV.box, -0.42, 0.04, 0.12) }, n: { ...n, bNod: Math.abs(Math.sin(c.t * 1.6)) * 0.6 } };
      case 'talk':
        return { l: c.bd(0.2, 0.7 * c.H, 0.26), r: c.bd(-0.22 + 0.04 * Math.sin(c.t * 3), 0.72 * c.H, 0.3), gl: 0.15, gr: 0.15, palms: 0.7, nod: 0.05, props: { lid: add(HV.box, -0.42, 0.04, 0.12) }, n: { ...n, bNod: Math.abs(Math.sin(c.t * 1.2)) * 0.5 } };
      case 'tablet': {
        const tablet = c.bd(0.08, 0.66 * c.H, 0.28);
        return { l: tablet, gl: 0.85, r: add(tablet, -0.05 + 0.08 * Math.sin(c.t * 5), 0.03, 0.02), gr: 0.25, tap: true, nod: 0.38, props: { tablet, lid: add(HV.box, -0.42, 0.04, 0.12) }, n };
      }
      default: {
        const up = sm(u, 0.05, 0.3) * (1 - sm(u, 0.85, 1));
        const h = add(HV.shake, 0, 0.02 * Math.sin(c.t * 9) * up, 0);
        return { r: lerpV(c.bd(-0.2, 0.56 * c.H, 0.1), h, up), gr: 0.85, nod: 0.08, lean: 0.06, n: { ...n, bHand: up, bNod: up } };
      }
    }
  },
};

// =============================================================================================
// 가두리 해상 통로 (yaPens, 5 × 2): the gangway off the quay's edge and a floating walkway with two round pens behind.

const DECK = 0.15;
export const PN = {
  deck: DECK,
  gangX: 1.2,
  walkZ: -0.72,
  pens: [[0.2, -2.3], [-2.9, -2.3]] as Array<[number, number]>,
  penR: 1.1,
  rim: DECK + 0.42,
  bucket: [0.82, DECK, -0.5] as V,
  moor: [-2.9, DECK + 0.1, -1.08] as V,
  sea: 0.04,
};
const PENS_SEQ: Seq = [['gate', 1.0, 1.1], ['gang', 0.1, 1.0], ['deck', 0.2, 1.0], ['haul', 3.2, 0.5], ['look', 2.2, 0.4], ['dip', 2.8, 0.4], ['drop', 1.2, 0.5], ['feed', 3.6, 1.6], ['moor', 3.0, 1.8], ['home', 0.1, 1.2], ['off', 0.1, 1.0]];
const PENS: Script = {
  seq: PENS_SEQ,
  at(k) {
    const p0 = PN.pens[0][0];
    if (k === 'drop') return st(0.62, PN.walkZ, PI, DECK);
    switch (k) {
      case 'gate':
        return st(PN.gangX, 1.3);
      case 'gang':
      case 'off':
        return st(PN.gangX, 0.2, k === 'off' ? 0 : PI, DECK * 0.8);
      case 'deck':
      case 'home':
        return st(PN.gangX, PN.walkZ, k === 'home' ? 0 : PI / -2, DECK);
      case 'moor':
        return st(PN.pens[1][0], PN.walkZ, PI, DECK);
      default:
        return st(p0, PN.walkZ, PI, DECK);
    }
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { netUp: 0, mort: 1 - c.p('dip', 0.7, 0.8), toss: 0, tx: 0, tz: 0, rise: c.p('feed', 0.1, 0.5) * (1 - c.p('moor', 0, 0.4)), slack: 0, inBucket: c.p('drop', 0.5, 0.7) };
    const edge = c.bd(0, PN.rim, 0.34);
    switch (k) {
      case 'gate':
        return { ...easy(c), nod: 0.1, n };
      case 'haul': {
        // Hand over hand, the net's edge coming up out of the water.
        const f = (u * 3) % 1;
        const up = sm(u, 0, 0.9);
        return { l: add(edge, 0.16, 0.06 + 0.2 * f, 0), r: add(edge, -0.16, 0.26 - 0.2 * f, 0), gl: 0.95, gr: 0.95, crouch: 0.5, nod: 0.44, lean: 0.18, n: { ...n, netUp: up } };
      }
      case 'look':
        return { l: add(edge, 0.2, 0.16, 0), r: add(edge, -0.2, 0.16, 0), gl: 0.95, gr: 0.95, crouch: 0.5, nod: 0.5, lean: 0.2, n: { ...n, netUp: 1 } };
      case 'dip': {
        // The long dip net round to the one floating.
        const a = u * PI;
        const head: V = [PN.pens[0][0] - 0.34 * Math.cos(a), PN.sea + 0.04 + 0.5 * sm(u, 0.72, 1), -1.5];
        const grip = c.bd(-0.2, 0.62 * c.H, 0.34);
        return { r: grip, gr: 0.9, l: c.bd(0.08, 0.52 * c.H, 0.38), gl: 0.85, nod: 0.46, lean: 0.14, props: { dip: head, grip }, n: { ...n, netUp: 1 - sm(u, 0, 0.3), caught: sm(u, 0.7, 0.8) } };
      }
      case 'drop': {
        const head = lerpV([PN.pens[0][0], PN.sea + 0.54, -1.5], add(PN.bucket, 0, 0.32, 0), sm(u, 0.05, 0.7));
        const grip = c.bd(-0.2, 0.62 * c.H, 0.3);
        return { r: grip, gr: 0.9, l: c.bd(0.08, 0.52 * c.H, 0.34), gl: 0.85, nod: 0.46, props: { dip: head, grip }, n: { ...n, caught: 1 - sm(u, 0.7, 0.85) } };
      }
      case 'feed': {
        // The scoop out over the ring, three throws in a round.
        const b = (u * 3) % 1;
        const i = Math.floor(u * 3);
        const held = c.bd(-0.18, 0.68 * c.H, 0.26);
        const out = c.bd(-0.08, 0.86 * c.H, 0.52);
        const h = lerpV(held, out, sm(b, 0.15, 0.4) * (1 - sm(b, 0.65, 1)));
        return { r: h, gr: 0.85, l: c.bd(0.22, 0.6 * c.H, 0.14), gl: 0.3, nod: 0.26, lean: 0.1, props: { scoop: h }, n: { ...n, toss: sm(b, 0.3, 0.95), tx: PN.pens[0][0] + [-0.3, 0.3, 0][i], tz: PN.pens[0][1] + [0.3, 0.2, -0.3][i] } };
      }
      case 'moor': {
        // Crouched at the cleat: the far pen's line taken off, drawn tight and turned on again.
        const a = c.t * 3.4;
        return { r: add(PN.moor, 0.08 * Math.cos(a), 0.04, 0.07 * Math.sin(a)), gr: 0.85, l: add(PN.moor, -0.24, 0.05, 0.02), gl: 0.9, crouch: 0.85, nod: 0.5, lean: 0.16, n: { ...n, slack: Math.sin(u * PI) } };
      }
      default:
        return { nod: 0.14, n };
    }
  },
};

// =============================================================================================
// 사료 창고 (yaFeedStore, 2 × 2): a tall silo at the back, a low hopper at its foot, a pallet of sacks on the right.

export const FS = {
  stand: 1.24,
  sacks: [0.56, 0.62, 0.34] as V,
  hopper: [-0.34, 1.06, 0.44] as V,
  panel: [-0.9, 1.16, 0.3] as V,
};
const FILL_SEQ: Seq = [['sack', 1.6, 0.7], ['carry', 0.2, 0.7], ['cut', 1.4, 0.3], ['pour', 3.8, 0.4], ['fold', 1.3, 0.5], ['panel', 1.8, 0.3], ['run', 3.0, 0.9]];
const FILL: Script = {
  seq: FILL_SEQ,
  at(k) {
    if (k === 'sack') return st(0.56, FS.stand - 0.14);
    if (k === 'panel' || k === 'run') return st(-0.72, 0.84, PI - 0.3);
    return st(-0.3, FS.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { taken: c.p('sack', 0.3, 0.4), level: 0.25 + 0.6 * c.p('pour', 0.1, 0.9), auger: k === 'run' ? 1 : 0, lit: c.p('panel', 0.5, 0.7), tilt: 0, flow: 0, cutAt: c.p('cut', 0.5, 0.8) };
    const shoulder = c.bd(-0.16, 0.92 * c.H, -0.02);
    switch (k) {
      case 'sack': {
        const p = lerpV(FS.sacks, shoulder, sm(u, 0.3, 0.95));
        return { l: add(p, 0.16, -0.04, 0.08), r: add(p, -0.16, -0.04, 0.08), gl: 0.95, gr: 0.95, crouch: 0.75 * (1 - sm(u, 0.3, 0.9)), nod: 0.4, props: { sack: p }, n };
      }
      case 'carry':
        return { l: add(shoulder, 0.16, -0.04, 0.14), r: add(shoulder, -0.04, 0.06, 0.08), gl: 0.95, gr: 0.95, nod: 0.08, props: { sack: shoulder }, n };
      case 'cut': {
        const p = lerpV(shoulder, add(FS.hopper, 0, 0.22, 0.14), sm(u, 0, 0.5));
        const k2 = add(p, -0.14 + 0.28 * sm(u, 0.5, 0.95), 0.08, 0.1);
        return { l: add(p, 0.16, 0, 0.1), gl: 0.95, r: u > 0.45 ? k2 : add(p, -0.16, 0, 0.1), gr: 0.9, nod: 0.36, lean: 0.1, props: { sack: p, knife: u > 0.45 ? k2 : null }, n };
      }
      case 'pour': {
        // Up on its end and shaken out, the level rising.
        const shake = 0.012 * Math.sin(c.t * 16);
        const p = add(FS.hopper, shake, 0.3, 0.1);
        return { l: add(p, 0.18, 0.1, 0.08), r: add(p, -0.18, 0.1, 0.08), gl: 0.95, gr: 0.95, nod: 0.4, lean: 0.12, props: { sack: p }, n: { ...n, tilt: sm(u, 0, 0.1), flow: 1 - sm(u, 0.9, 1), empty: u } };
      }
      case 'fold': {
        const p = c.bd(0, 0.62 * c.H, 0.28);
        return { l: add(p, 0.08 * Math.cos(c.t * 5), 0, 0.02), r: add(p, -0.08 * Math.cos(c.t * 5), 0, 0.02), gl: 0.9, gr: 0.9, nod: 0.4, props: { sack: p }, n: { ...n, empty: 1, tilt: 0 } };
      }
      case 'panel':
        return { r: add(FS.panel, 0.04, -0.06, 0.05), gr: 0.2, tap: true, nod: 0.12, n };
      default:
        return { ...easy(c), nod: 0.0, n };
    }
  },
};

// =============================================================================================
// 펌프실 (yaPump, 3 × 2): a slab and a back wall with two pumps, pipes, a valve wheel, a strainer pot and a panel.

export const PM = {
  stand: 1.22,
  gauge: [-0.92, 1.42, -0.1] as V,
  casing: [-0.5, 0.6, 0.18] as V,
  wheel: [0.38, 1.12, 0.14] as V,
  strainer: [0.92, 0.42, 0.42] as V,
  oil: [-0.18, 0.72, 0.36] as V,
  can: [0.02, 0.14, 0.76] as V,
  panel: [1.18, 1.26, -0.34] as V,
};
const PUMP_SEQ: Seq = [['gauge', 2.4, 0.6], ['hand', 2.2, 0.6], ['oil', 2.6, 0.6], ['valve', 3.0, 0.6], ['pull', 1.4, 0.3], ['rinse', 2.6, 0.3], ['seat', 1.2, 0.6], ['panel', 2.2, 0.9]];
const PUMP: Script = {
  seq: PUMP_SEQ,
  at(k) {
    if (k === 'gauge' || k === 'hand') return st(-0.78, 0.5);
    if (k === 'oil') return st(-0.14, 0.85);
    if (k === 'valve') return st(0.34, PM.stand - 0.48);
    if (k === 'panel') return st(1.02, 0.2, PI - 0.2);
    return st(0.78, PM.stand - 0.14);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { flow: c.p('valve', 0.1, 0.9), clean: c.p('rinse', 0.2, 0.9), out: 0, water: 0, wheelA: c.p('valve', 0, 1) * 7, lit: c.p('panel', 0.3, 0.5) };
    const held = c.bd(-0.04, 0.66 * c.H, 0.3);
    switch (k) {
      case 'gauge':
        return { r: add(PM.gauge, 0.02, -0.03, 0.08), gr: 0.2, tap: u > 0.5, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: -0.1, n };
      case 'hand':
        return { r: add(PM.casing, 0.04 * Math.sin(c.t * 1.2), 0.12, 0.1), gr: 0.3, palms: 0.8, l: c.bd(0.2, 0.56 * c.H, 0.1), crouch: 0.42, nod: 0.3, lean: 0.14, n };
      case 'oil': {
        const can = lerpV(PM.can, add(PM.oil, 0.03, 0.12, 0.05), sm(u, 0, 0.3));
        return { r: add(can, 0, 0.12, 0), gr: 0.9, l: add(PM.oil, -0.1, 0.02, 0.05), gl: 0.5, crouch: 0.7 * Math.max(1 - u * 3, 0.5), nod: 0.42, lean: 0.14, props: { can }, n: { ...n, dripOil: u > 0.35 ? 1 : 0 } };
      }
      case 'valve': {
        const a = c.t * 2.6;
        return { r: add(PM.wheel, 0.1 * Math.cos(a), 0.1 * Math.sin(a), 0.03), l: add(PM.wheel, -0.1 * Math.cos(a), -0.1 * Math.sin(a), 0.03), gl: 0.9, gr: 0.9, nod: 0.14, lean: 0.06, n };
      }
      case 'pull': {
        const p = lerpV(PM.strainer, held, sm(u, 0.15, 0.95));
        return { r: add(p, 0.04, 0.14, 0.02), gr: 0.9, l: add(p, -0.05, 0.08, 0.04), gl: 0.5, crouch: 0.6 * (1 - sm(u, 0.2, 0.9)), nod: 0.42, props: { basket: p }, n: { ...n, out: 1 } };
      }
      case 'rinse':
        return { r: add(held, 0.04, 0.14, 0.02), gr: 0.9, l: add(held, -0.1 + 0.03 * Math.sin(c.t * 12), 0.06, 0.03), gl: 0.7, nod: 0.42, props: { basket: add(held, 0, 0.01 * Math.sin(c.t * 10), 0) }, n: { ...n, out: 1, water: 1 } };
      case 'seat': {
        const p = lerpV(held, PM.strainer, sm(u, 0.05, 0.85));
        return { r: add(p, 0.04, 0.14, 0.02), gr: 0.9, l: add(p, -0.05, 0.08, 0.04), gl: 0.5, crouch: 0.6 * sm(u, 0.1, 0.8), nod: 0.42, props: { basket: p }, n: { ...n, out: 1 } };
      }
      default:
        return { r: add(PM.panel, -0.06 + 0.04 * Math.sin(u * 9), -0.04, 0.05), gr: 0.2, tap: true, nod: 0.1, n };
    }
  },
};

// =============================================================================================
// 치어 부화 선반 (yaHatchery, 3 × 1): three tiers of shallow trays under grow lamps, a drip line along each.

export const FY = {
  stand: 0.66,
  tiers: [0.42, 0.86, 1.3] as const,
  tray: 0.54,
  drawZ: 0.32,
  drip: [1.12, 1.56, 0.1] as V,
  cup: [-0.96, 0.96, 0.3] as V,
};
const FRY_SEQ: Seq = [['eye', 2.0, 0.4], ['pull', 1.6, 0.3], ['count', 3.4, 0.3], ['thin', 2.6, 0.3], ['push', 1.4, 0.6], ['valve', 2.4, 0.8], ['note', 2.0, 0.9]];
const FRY: Script = {
  seq: FRY_SEQ,
  at(k) {
    if (k === 'valve') return st(0.84, FY.stand);
    return st(0.1, FY.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { draw: c.p('pull', 0.1, 0.9) - c.p('push', 0.1, 0.9), count: c.p('count', 0.05, 0.95), thin: c.p('thin', 0.1, 0.9), drip: 0.4 + 0.5 * c.p('valve', 0.2, 0.9) };
    const tray = FY.tiers[1];
    const out: V = [0.1, tray + 0.08, FY.drawZ];
    switch (k) {
      case 'eye':
        // Along the tiers with a torch of a finger, low to high.
        return { r: [-0.3 + 0.9 * u, tray - 0.1 + 0.4 * Math.sin(u * PI), 0.24], gr: 0.2, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.26 - 0.3 * u, n };
      case 'pull':
      case 'push':
        return { l: [-0.22, tray + 0.06, FY.drawZ * (k === 'pull' ? sm(u, 0.1, 0.9) : 1 - sm(u, 0.1, 0.9)) + 0.22], r: [0.42, tray + 0.06, FY.drawZ * (k === 'pull' ? sm(u, 0.1, 0.9) : 1 - sm(u, 0.1, 0.9)) + 0.22], gl: 0.9, gr: 0.9, nod: 0.36, n };
      case 'count': {
        // A cup of water drawn from the tray, held to the light, swirled.
        const h = lerpV(out, c.bd(-0.04, 0.82 * c.H, 0.28), sm(u, 0.1, 0.4));
        return { r: add(h, 0.02 * Math.sin(c.t * 7), 0, 0.02 * Math.cos(c.t * 7)), gr: 0.85, l: add(out, -0.16, 0, 0), gl: 0.6, nod: 0.08, props: { cup: h }, n };
      }
      case 'thin': {
        // The pipette over the tray, a weak one out at a time.
        const a = (u * 3) % 1;
        const h: V = [0.14 + 0.2 * Math.sin(u * 7), tray + 0.08 + 0.08 * Math.sin(a * PI), FY.drawZ];
        return { r: h, gr: 0.8, l: add(out, -0.2, 0, 0), gl: 0.6, nod: 0.44, lean: 0.12, props: { pipette: h }, n };
      }
      case 'valve':
        return { r: add(FY.drip, 0.01 * Math.sin(c.t * 8), -0.02, 0.05), gr: 0.85, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: -0.12, n };
      default: {
        const clip = c.bd(0.1, 0.66 * c.H, 0.28);
        const pen = writing(add(clip, 0.02, 0.02, 0.02), c.t, u, 0.1);
        return { l: add(clip, -0.02, -0.04, 0.02), gl: 0.8, r: pen, gr: 0.75, nod: 0.36, props: { clip, pen: add(pen, 0, 0.03, 0.01) }, n };
      }
    }
  },
};

// =============================================================================================
// 선별대 (yaGrade, 3 × 1): bars sloping away and spreading apart, three tubs under them, a bucket of mixed fish.

export const GR = {
  stand: 0.56,
  /** Where each tub is along the bars. */
  tubs: [-0.68, 0, 0.68] as const,
  tubY: 0.38,
  bucket: [-1.12, 0.86, 0.2] as V,
  rail: 0.94,
  tally: [1.14, 0.96, 0.24] as V,
  ruler: [-0.34, 0.92, 0.32] as V,
};
const GRADE_SEQ: Seq = [['f0', 1.7, 0.3], ['f1', 1.7, 0.3], ['f2', 1.7, 0.3], ['f3', 1.7, 0.3], ['f4', 1.7, 0.4], ['measure', 2.8, 0.4], ['tally', 2.2, 0.9]];
const GRADED = [0, 2, 1, 2, 0];
const GRADE: Script = {
  seq: GRADE_SEQ,
  at(k) {
    if (k === 'tally') return st(0.88, GR.stand);
    if (k === 'measure') return st(-0.2, GR.stand);
    return st(-0.84, GR.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { t0: 0, t1: 0, t2: 0, level: 0, kind: 0, ticks: c.p('tally', 0.1, 0.9) };
    GRADED.forEach((to, i) => (n[`t${to}`] += c.p(`f${i}`, 0.9, 0.96)));
    const m = /^f(\d)$/.exec(k);
    if (m) {
      // Off the bucket and onto the top of the bars, let go: it slides until the gap's wide enough.
      const i = +m[1];
      const to = GR.tubs[GRADED[i]];
      const top: V = [-0.86, GR.rail + 0.06, 0.2];
      const end: V = [to, GR.rail - 0.14, 0];
      const held = u < 0.3 ? lerpV(GR.bucket, top, sm(u, 0.05, 0.28)) : top;
      const f = u < 0.34 ? held : lerpV(top, end, sm(u, 0.34, 0.86));
      const hand = u < 0.34 ? held : lerpV(top, c.bd(-0.2, 0.7 * c.H, 0.2), sm(u, 0.34, 0.6));
      return { r: add(hand, 0.02, 0.05, 0.02), gr: u < 0.34 ? 0.85 : 0.3, l: add(GR.bucket, 0.02, 0.06, 0.1), gl: 0.6, nod: 0.4, lean: 0.1, props: { fish: u < 0.9 ? f : null }, n: { ...n, kind: GRADED[i] } };
    }
    if (k === 'measure') {
      // One laid on the ruler, nose to the stop.
      const f: V = add(GR.ruler, 0.02, 0.03, 0);
      return { r: add(f, 0.14 + 0.02 * Math.sin(c.t * 4), 0.04, 0.02), gr: 0.5, l: add(f, -0.12, 0.04, 0.03), gl: 0.7, nod: 0.5, lean: 0.14, props: { fish: f }, n: { ...n, kind: 1 } };
    }
    const pen = writing(add(GR.tally, 0, 0, 0.03), c.t, u, 0.1);
    return { r: pen, gr: 0.8, l: add(GR.tally, -0.12, -0.04, 0.03), gl: 0.5, nod: 0.42, lean: 0.08, props: { pen: add(pen, 0, 0.04, 0.01) }, n };
  },
};

// =============================================================================================
// 포장·얼음 작업대 (yaShip, 3 × 1): a bench with the box on it, an ice chest on the left, a pallet on the right.

export const SP = {
  stand: 0.56,
  empties: [-1.14, 0.3, 0.1] as V,
  box: [-0.02, 0.84, 0.06] as V,
  ice: [-0.76, 0.76, 0.06] as V,
  bags: [0.56, 0.86, 0.06] as V,
  pallet: [1.2, 0.2, 0.08] as V,
  layer: 0.2,
};
const PACK_SEQ: Seq = [['box', 1.4, 0.4], ['ice', 2.4, 0.3], ['fish', 2.0, 0.3], ['ice2', 1.6, 0.3], ['lid', 1.2, 0.3], ['tape', 1.8, 0.3], ['label', 1.2, 0.5], ['lift', 0.5, 0.8], ['stack', 1.4, 0.9]];
const PACK: Script = {
  seq: PACK_SEQ,
  at(k) {
    if (k === 'box') return st(-0.72, SP.stand);
    if (k === 'ice' || k === 'ice2') return st(-0.4, SP.stand);
    if (k === 'stack') return st(0.86, SP.stand);
    if (k === 'fish') return st(0.26, SP.stand);
    return st(0.02, SP.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { fill: 0.5 * c.p('ice', 0.1, 0.9) + 0.45 * c.p('ice2', 0.1, 0.9), bagged: c.p('fish', 0.5, 0.6), lid: c.p('lid', 0.5, 0.95), taped: c.p('tape', 0.1, 0.95), label: c.p('label', 0.5, 0.7), stacked: c.p('stack', 0.8, 0.95), pour: 0 };
    const both = (p: V): Partial<Key> => ({ l: add(p, -0.24, 0.1, 0.12), r: add(p, 0.24, 0.1, 0.12), gl: 0.9, gr: 0.9 });
    const top = (i: number): V => add(SP.pallet, 0, i * SP.layer, 0);
    switch (k) {
      case 'box': {
        const p = lerpV(SP.empties, SP.box, sm(u, 0.1, 0.9));
        return { ...both(p), crouch: 0.4 * (1 - sm(u, 0.1, 0.7)), nod: 0.4, props: { box: p }, n };
      }
      case 'ice':
      case 'ice2': {
        // The scoop from the chest across to the box, over and over.
        const b = (u * 2) % 1;
        const h = b < 0.5 ? lerpV(add(SP.ice, 0, 0.1, 0), add(SP.box, 0, 0.3, 0), sm(b, 0.05, 0.45)) : lerpV(add(SP.box, 0, 0.3, 0), add(SP.ice, 0, 0.1, 0), sm(b, 0.55, 0.95));
        return { r: h, gr: 0.9, l: add(SP.box, -0.24, 0.1, 0.12), gl: 0.5, nod: 0.42, lean: 0.1, props: { scoop: h, box: SP.box }, n: { ...n, pour: b > 0.36 && b < 0.6 ? 1 : 0 } };
      }
      case 'fish': {
        const p = lerpV(SP.bags, add(SP.box, 0, 0.16, 0), sm(u, 0.1, 0.75));
        return { l: add(p, -0.14, 0.04, 0.03), r: add(p, 0.14, 0.04, 0.03), gl: 0.8, gr: 0.8, nod: 0.44, lean: 0.1, props: { bag: u < 0.65 ? p : null, box: SP.box }, n };
      }
      case 'lid': {
        const lid = lerpV(add(SP.box, 0.42, 0.02, 0.14), add(SP.box, 0, 0.21, 0), sm(u, 0.1, 0.9));
        return { l: add(lid, -0.2, 0.02, 0.1), r: add(lid, 0.2, 0.02, 0.1), gl: 0.8, gr: 0.8, nod: 0.42, props: { lid, box: SP.box }, n };
      }
      case 'tape': {
        const h = add(SP.box, -0.26 + 0.52 * sm(u, 0, 0.85), 0.24, 0.06);
        return { r: h, gr: 0.85, l: add(SP.box, -0.22, 0.22, 0.1), gl: 0.7, nod: 0.42, props: { tape: h, box: SP.box, lid: add(SP.box, 0, 0.21, 0) }, n };
      }
      case 'label': {
        const h = add(SP.box, 0.08, 0.14, 0.2);
        return { r: add(h, 0.01 * Math.sin(c.t * 9), 0, 0.02), gr: 0.7, l: add(SP.box, -0.2, 0.2, 0.14), gl: 0.5, nod: 0.44, props: { box: SP.box, lid: add(SP.box, 0, 0.21, 0) }, n };
      }
      case 'lift': {
        const p = lerpV(SP.box, c.bd(0, 0.62 * c.H, 0.3), sm(u, 0.05, 0.9));
        return { ...both(p), nod: 0.3, props: { box: p, lid: add(p, 0, 0.21, 0) }, n };
      }
      default: {
        const p = lerpV(c.bd(0, 0.62 * c.H, 0.3), top(2), sm(u, 0.1, 0.8));
        return { ...both(p), nod: 0.36, crouch: 0.2 * sm(u, 0.4, 0.8), props: { box: p, lid: add(p, 0, 0.21, 0) }, n };
      }
    }
  },
};

// =============================================================================================
// 체험 수조 (yaVisit, 3 × 1): a low wooden tub of shells and starfish for the visitors' hands, its board and mat.

export const VT = {
  stand: 0.62,
  rim: 0.44,
  water: 0.36,
  skim: [-0.8, 0.46, 0.34] as V,
  hose: [1.3, 0.36, 0.36] as V,
  sign: [1.22, 0.92, -0.22] as V,
};
const VISIT_SEQ: Seq = [['skim', 3.0, 0.5], ['set', 2.6, 0.5], ['fill', 2.8, 0.9], ['sign', 2.4, 0.9]];
const VISIT: Script = {
  seq: VISIT_SEQ,
  at(k) {
    if (k === 'skim') return st(-0.4, VT.stand);
    if (k === 'set') return st(0.1, VT.stand);
    if (k === 'sign') return st(1.14, 0.36);
    return st(0.88, VT.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { leaves: 1 - c.p('skim', 0.1, 0.9), righted: c.p('set', 0.3, 0.8), fill: 0.7 + 0.3 * c.p('fill', 0.1, 0.9), water: 0 };
    switch (k) {
      case 'skim': {
        const a = u * PI * 3;
        const head: V = [-0.5 + 0.42 * Math.sin(a), VT.water + 0.02, 0.02 + 0.12 * Math.cos(a)];
        return { r: add(head, 0.06, 0.42, 0.24), gr: 0.9, l: add(head, 0.04, 0.3, 0.2), gl: 0.7, crouch: 0.3, nod: 0.46, lean: 0.12, props: { skim: head }, n };
      }
      case 'set': {
        const h: V = [0.1 + 0.2 * Math.sin(u * 7), VT.water - 0.04, 0.02];
        return { r: h, gr: 0.75, l: [-0.14, VT.rim + 0.02, 0.24], gl: 0.8, crouch: 0.68, nod: 0.5, lean: 0.14, n };
      }
      case 'fill': {
        const h = lerpV(VT.hose, [0.76, VT.rim + 0.2, 0.1], sm(u, 0.05, 0.3));
        return { r: h, gr: 0.9, l: c.bd(0.2, 0.56 * c.H, 0.1), crouch: 0.6 * (1 - sm(u, 0.05, 0.3)), nod: 0.4, props: { hose: h }, n: { ...n, water: u > 0.3 && u < 0.95 ? 1 : 0 } };
      }
      default: {
        const a = c.t * 5;
        const h = add(VT.sign, 0.12 * Math.cos(a), 0.1 * Math.sin(a * 0.5), 0.05);
        return { r: h, gr: 0.75, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.06, props: { rag: h }, n };
      }
    }
  },
};

const SCRIPTS: Record<YaMotion, Script> = {
  yaFeed: FEED, yaWater: WATER, yaOxygen: OXYGEN, yaWatch: WATCH, yaShell: SHELL, yaSensors: SENSORS, yaTune: TUNE, yaHarvest: HARVEST, yaBuyer: BUYER, yaPens: PENS, yaFill: FILL, yaPump: PUMP, yaFry: FRY, yaGrade: GRADE, yaPack: PACK, yaVisit: VISIT,
};
